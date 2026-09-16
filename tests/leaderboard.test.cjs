const { test } = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../leaderboard-core');
const { parseIssue, resultEntry, publish, digest, GitHubClient } = require('../lib/leaderboard-service');
function entry(overrides = {}) {
  return { rulesVersion: Core.RULES_VERSION, userId: 1, login: 'student', course: 'basic', repository: 'student/lab', score: 90, maxScore: 90, passed: 7, total: 7, checkedAt: '2026-09-16T01:00:00Z', issueNumber: 1, runId: 123, ...overrides };
}
function issue(overrides = {}) {
  return { number: 1, state: 'open', title: '[Leaderboard] basic', user: { id: 1, login: 'student', type: 'User' }, body: '### Course\n\nbasic\n\n### Repository\n\nhttps://github.com/student/lab\n', ...overrides };
}
const boardWith = entries => ({ ...Core.emptyBoard(), entries });
test('동점 공동 순위는 1,1,3이며 과정별로 분리한다', () => {
  const board = boardWith([entry(), entry({ userId: 2, login: 'other', repository: 'other/lab' }), entry({ userId: 3, login: 'third', repository: 'third/lab', score: 80, passed: 6 }), entry({ userId: 1, course: 'scenarios', score: 325, maxScore: 325, passed: 20, total: 20 })]);
  assert.deepEqual(Core.rank(board, 'basic').map(e => e.rank), [1, 1, 3]);
  assert.equal(Core.rank(board, 'scenarios').length, 1);
});
test('사용자별 최고 점수를 유지하고 동점이면 최초 달성 시각을 보존한다', () => {
  let board = Core.upsert(Core.emptyBoard(), entry({ score: 60, passed: 5 }));
  const same = Core.upsert(board, entry({ score: 50, passed: 4 })); assert.equal(same, board);
  board = Core.upsert(board, entry()); assert.equal(board.entries.length, 1); assert.equal(board.entries[0].score, 90);
  assert.equal(Core.upsert(board, entry({ checkedAt: '2026-09-17T01:00:00Z' })), board);
  assert.equal(Core.upsert(board, entry({ checkedAt: '2026-09-15T01:00:00Z' })).entries[0].checkedAt, '2026-09-15T01:00:00Z');
});
test('점수 범위·사용자·URL·버전·중복을 검증한다', () => {
  for (const change of [{ score: 999 }, { repository: 'other/lab' }, { login: '<script>' }, { rulesVersion: 'old' }, { runId: 0 }]) assert.equal(Core.validEntry(entry(change)), false);
  assert.throws(() => Core.validateBoard(boardWith([entry(), entry()])), /중복/);
  assert.equal(Core.repositoryName('https://token@github.com/student/lab'), null);
  assert.equal(Core.repositoryName('https://github.com/student/lab?allowAnswerRepo=1'), null);
});
test('제출 이슈 작성자와 저장소 소유자를 연결하고 클라이언트 점수는 사용하지 않는다', () => {
  const result = parseIssue(issue({ body: `${issue().body}\n### Score\n\n99999\n` }));
  assert.equal(result.userId, 1); assert.equal(result.repository, 'student/lab'); assert.equal(result.score, undefined);
  assert.throws(() => parseIssue(issue({ body: issue().body.replace('student/lab', 'other/lab') })), /본인 계정/);
  assert.throws(() => parseIssue(issue({ state: 'closed' })), /열린/);
  assert.throws(() => parseIssue(issue({ body: `${issue().body}\n### Course\n\nscenarios\n` })), /중복/);
  assert.throws(() => parseIssue(issue({ user: { id: 2, login: 'nowcika', type: 'User' }, body: issue().body.replace('student/lab', 'nowcika/git-scenario-solution') })), /공식/);
});
test('초급은 서버 검증 가능한 90점만 합산하고 확인 불가를 게시하지 않는다', () => {
  const submission = parseIssue(issue());
  const checks = [10, 15, 15, 15, 15, 10, 10].map(points => ({ points, state: 'pass' }));
  const result = resultEntry(submission, checks, 123);
  assert.equal(result.score, 90); assert.equal(result.total, 7);
  checks[2].state = 'unknown'; assert.throws(() => resultEntry(submission, checks, 123), /확인 불가/);
  checks[2].state = 'fail'; assert.equal(resultEntry(submission, checks, 123).score, 75);
  checks[2].points = 999; assert.throws(() => resultEntry(submission, checks, 123), /배점/);
});
test('동시 제출의 저장 충돌을 재시도해 다른 사용자 기록도 보존한다', async () => {
  let board = Core.emptyBoard(), writes = 0;
  const client = { request: async (url, method, body) => {
    if (url.includes('/git/ref/')) return { object: { sha: 'main' } };
    if (url.endsWith('/issues/1')) return issue();
    if (url === '/repos/student/lab') return { private: false, owner: { id: 1, login: 'student' } };
    if (method === 'PUT') {
      if (++writes === 1) { board = boardWith([entry({ userId: 2, login: 'other', repository: 'other/lab' })]); const error = new Error('conflict'); error.status = 409; throw error; }
      board = JSON.parse(Buffer.from(body.content, 'base64').toString()); return {};
    }
    if (url.includes('/contents/')) return { sha: `sha-${writes}`, encoding: 'base64', content: Buffer.from(JSON.stringify(board)).toString('base64') };
    throw new Error(`Unexpected ${url}`);
  } };
  assert.equal((await publish(client, { entry: entry(), bodyHash: digest(issue().body) }, { wait: async () => {} })).changed, true);
  assert.equal(writes, 2); assert.equal(board.entries.length, 2);
  assert.deepEqual(Core.rank(board, 'basic').map(e => e.rank), [1, 1]);
});
test('검사 후 제출 내용이 바뀌면 점수를 저장하지 않는다', async () => {
  let wrote = false;
  const client = { request: async (url, method) => {
    if (method === 'PUT') wrote = true;
    if (url.includes('/issues/')) return issue({ body: issue().body.replace('student/lab', 'student/changed') });
    return { object: { sha: 'main' } };
  } };
  await assert.rejects(publish(client, { entry: entry(), bodyHash: digest(issue().body) }), /변경/);
  assert.equal(wrote, false);
});
test('GitHub 서버 요청은 고정 호스트만 쓰고 리다이렉트로 토큰을 전달하지 않는다', async () => {
  let captured;
  const client = new GitHubClient('fake-token', async (url, options) => { captured = { url, options }; return { ok: true, json: async () => ({}) }; });
  await client.request('/user');
  assert.equal(captured.url, 'https://api.github.com/user'); assert.equal(captured.options.redirect, 'error');
  await assert.rejects(client.request('//other.example/path'), /잘못된/);
});
