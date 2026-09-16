const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { grade, GitHub, Unavailable, parseGitHub } = require('../lib/local-grader');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-grader-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), text); };
  const commit = message => { git('add', '.'); git('-c', 'commit.gpgsign=false', 'commit', '-m', message); return git('rev-parse', 'HEAD'); };
  git('init', '-b', 'main'); git('config', 'user.name', 'Test Student'); git('config', 'user.email', 'student@example.invalid');
  git('remote', 'add', 'origin', 'https://github.com/student/lab.git');
  write('README.md', '# git-lab-student\n'); commit('docs: learning goal');
  write('notes.txt', 'second change'); commit('docs: second change'); git('branch', 'practice/feature');
  const metadata = { full_name: 'student/lab', owner: { login: 'student' }, private: false, default_branch: 'main', fork: true, parent: { full_name: 'nowcika/git-scenario-lab' } };
  const github = new GitHub();
  github.get = async endpoint => {
    if (endpoint === '/user') return { login: 'student' };
    if (endpoint === '/repos/student/lab') return metadata;
    if (endpoint.includes('/branches/')) {
      try { return { commit: { sha: git('rev-parse', `refs/heads/${decodeURIComponent(endpoint.split('/branches/')[1])}`) } }; } catch { return null; }
    }
    if (endpoint.includes('/issues?')) return [{ number: 1, title: '학습 계획' }];
    if (endpoint.includes('/pulls?')) return [{ number: 2, head: { ref: 'practice/feature', repo: { full_name: 'student/lab' } }, base: { ref: 'main', repo: { full_name: 'student/lab' } } }];
    return null;
  };
  return { dir, git, write, commit, github, metadata, options: { repo: dir, username: 'student' } };
}
const item = (r, id) => r.results.find(x => x.id === id);
test('초급 정상 100점 및 작업 트리/HEAD/index 보존', async t => {
  const f = fixture(t); f.write('uncommitted.txt', 'leave alone');
  const before = [f.git('status', '--porcelain'), f.git('rev-parse', 'HEAD'), f.git('write-tree')];
  const r = await grade(f.options, { github: f.github });
  assert.equal(r.score, 100); assert.deepEqual(r.summary, { pass: 8, fail: 0, unknown: 0, offlineSkipped: 0, blocked: 0 });
  assert.equal(r.diagnostics[0].clean, false);
  assert.deepEqual([f.git('status', '--porcelain'), f.git('rev-parse', 'HEAD'), f.git('write-tree')], before);
  assert.equal(item(r, 'readme').evidence.main.push, 'matched');
});
test('README만 틀리면 85점, 미커밋 정답은 불인정', async t => {
  const f = fixture(t); f.write('README.md', 'wrong'); f.commit('wrong answer'); f.write('README.md', 'git-lab-student');
  const r = await grade(f.options, { github: f.github }); assert.equal(r.score, 85); assert.equal(item(r, 'readme').state, 'fail');
});
test('push SHA가 다르면 브랜치 점수 차감', async t => {
  const f = fixture(t); const get = f.github.get;
  f.github.get = endpoint => endpoint.includes('/branches/practice') ? { commit: { sha: '0'.repeat(40) } } : get(endpoint);
  const r = await grade(f.options, { github: f.github }); assert.equal(r.score, 85); assert.equal(item(r, 'branch').state, 'fail');
});
test('계정/origin/소유자/공개 설정 불일치는 실패', async t => {
  for (const mode of ['account', 'origin', 'owner', 'private']) {
    const f = fixture(t); const get = f.github.get;
    if (mode === 'account') f.github.get = endpoint => endpoint === '/user' ? { login: 'other' } : get(endpoint);
    if (mode === 'origin') f.options.github = 'other/lab';
    if (mode === 'owner') f.metadata.owner.login = 'other';
    if (mode === 'private') f.metadata.private = true;
    const r = await grade(f.options, { github: f.github }); assert.equal(item(r, 'repository').state, 'fail', mode); assert.equal(item(r, 'readme').state, 'fail', mode);
  }
});
test('API 오류는 확인 불가', async t => {
  const f = fixture(t); f.github.get = async () => { throw new Unavailable('HTTP 403'); };
  const r = await grade(f.options, { github: f.github }); assert.deepEqual(r.summary, { pass: 1, fail: 0, unknown: 7, offlineSkipped: 0, blocked: 7 }); assert.equal(r.complete, false);
});
test('오프라인은 네트워크 없이 55점과 4개 확인 불가', async t => {
  const f = fixture(t); f.github.get = () => { throw new Error('network should not run'); };
  const r = await grade({ ...f.options, offline: true }, { github: f.github }); assert.equal(r.score, 55); assert.equal(r.summary.unknown, 4);
  // 오프라인 때문에 보류된 항목은 종료 코드 계산에서 제외됩니다.
  assert.equal(r.summary.offlineSkipped, 4); assert.equal(r.summary.blocked, 0);
});

test('신뢰할 수 없는 저장소는 항목별 사유를 남긴다', async t => {
  const f = fixture(t); f.metadata.private = true;
  const r = await grade(f.options, { github: f.github });
  assert.match(item(r, 'repository').detail, /비공개 저장소/);
  assert.match(item(r, 'issue').detail, /비공개 저장소/);
});

test('--branch를 지정하면 GitHub 기본 브랜치보다 우선한다', async t => {
  const f = fixture(t); f.git('branch', '-m', 'main', 'develop'); f.metadata.default_branch = 'main';
  const r = await grade({ ...f.options, branch: 'develop' }, { github: f.github });
  assert.equal(item(r, 'commits').state, 'pass');
  assert.equal(item(r, 'readme').evidence.develop.push, 'matched');
});
test('다른 Fork PR과 이슈로 위장한 PR은 불인정', async t => {
  const f = fixture(t); const get = f.github.get;
  f.github.get = endpoint => endpoint.includes('/pulls?') ? [{ head: { ref: 'practice/feature', repo: { full_name: 'other/lab' } }, base: { ref: 'main', repo: { full_name: 'student/lab' } } }] : endpoint.includes('/issues?') ? [{ title: '학습 계획', pull_request: {} }] : get(endpoint);
  const r = await grade(f.options, { github: f.github }); assert.equal(r.score, 80);
});
test('목록 페이지 순회 및 1,000개 초과 보류', async () => {
  const gh = new GitHub(); let calls = 0;
  gh.get = async () => ++calls === 1 ? Array(100).fill({ title: 'other' }) : [{ title: 'target' }];
  assert.equal((await gh.find('/issues', x => x.title === 'target')).title, 'target'); assert.equal(calls, 2);
  gh.get = async () => Array(100).fill({ title: 'other' }); await assert.rejects(gh.find('/issues', x => false), Unavailable);
});
test('shallow clone 이력은 확인 불가', async t => {
  const f = fixture(t); fs.writeFileSync(path.join(f.dir, '.git', 'shallow'), `${f.git('rev-parse', 'HEAD')}\n`);
  const r = await grade({ ...f.options, offline: true }); assert.equal(item(r, 'commits').state, 'unknown');
});
test('실제 revert 통과, 메시지만 흉내 낸 역 patch 불일치 실패', async t => {
  const f = fixture(t); f.write('app.conf', 'production=true'); f.commit('production');
  f.write('secrets.env', 'dummy fixture only'); const original = f.commit('bad change');
  f.git('-c', 'commit.gpgsign=false', 'revert', '--no-edit', original); f.git('branch', 'solution/revert');
  let r = await grade({ ...f.options, course: 'scenarios', offline: true });
  assert.equal(item(r, 'revert').state, 'pass'); assert.equal(item(r, 'revert').evidence.revert.original, original);
  f.git('checkout', '-B', 'fake', original); fs.unlinkSync(path.join(f.dir, 'secrets.env')); f.write('unrelated.txt', 'extra edit');
  f.commit(`Revert bad change\n\nThis reverts commit ${original}.`); f.git('branch', '-f', 'solution/revert');
  r = await grade({ ...f.options, course: 'scenarios', offline: true }); assert.equal(item(r, 'revert').state, 'fail');
});
test('conflict 문구 복사만 실패, merge 이력 포함 통과', async t => {
  const f = fixture(t); f.write('team-plan.md', '프론트엔드: UI 배포 준비\n백엔드: API 배포 준비\n공동 확인: 통합 테스트 완료'); f.commit('copy answer'); f.git('branch', 'solution/conflict');
  let r = await grade({ ...f.options, course: 'scenarios', offline: true }); assert.equal(item(r, 'conflict').state, 'fail');
  f.git('checkout', '-b', 'side'); f.write('side.txt', 'side'); f.commit('side'); f.git('checkout', 'solution/conflict');
  f.git('-c', 'commit.gpgsign=false', 'merge', '--no-ff', 'side', '-m', 'merge team');
  r = await grade({ ...f.options, course: 'scenarios', offline: true }); assert.equal(item(r, 'conflict').state, 'pass');
});
test('주석 태그는 실제 커밋 SHA로 비교하고 전체 배점은 290점', async t => {
  const f = fixture(t); f.git('-c', 'tag.gpgsign=false', 'tag', '-a', 'solution-v1.0.0', '-m', 'done');
  const get = f.github.get; const sha = f.git('rev-parse', 'HEAD');
  f.github.get = endpoint => endpoint.includes('/git/ref/tags/') ? { object: { type: 'tag', sha: 'tag-object' } } : endpoint.endsWith('/git/tags/tag-object') ? { object: { type: 'commit', sha } } : get(endpoint);
  const r = await grade({ ...f.options, course: 'scenarios' }, { github: f.github }); assert.equal(item(r, 'tag').state, 'pass'); assert.equal(r.results.reduce((s, x) => s + x.points, 0), 290);
});
test('원본 Fork가 아니면 로컬 정답이 있어도 온라인 시나리오 실패', async t => {
  const f = fixture(t); f.metadata.fork = false; f.write('instructor-update.md', 'UPSTREAM-SYNC-COMPLETE'); f.commit('copy'); f.git('branch', 'solution/upstream-sync');
  const r = await grade({ ...f.options, course: 'scenarios' }, { github: f.github }); assert.equal(item(r, 'fork').state, 'fail'); assert.equal(item(r, 'upstream').state, 'fail');
});
test('diff patch는 저장소의 실제 blob 해시와 내용에 일치해야 한다', async t => {
  const f = fixture(t);
  f.write('config/service.conf', 'SERVICE_MODE=development\nTIMEOUT=30\n'); f.commit('base state');
  const baseSha = f.git('rev-parse', 'HEAD');
  f.write('config/service.conf', 'SERVICE_MODE=production\nTIMEOUT=60\n');
  f.write('config/deploy.conf', 'REGION=seoul\nDIFF-TARGET-2026\n'); f.commit('target state');
  const patch = execFileSync('git', ['-C', f.dir, 'diff', baseSha, 'HEAD'], { encoding: 'utf8' });
  f.write('reports/change.patch', patch); f.commit('docs: submit diff analysis'); f.git('branch', 'solution/diff');
  let r = await grade({ ...f.options, course: 'scenarios', offline: true });
  assert.equal(item(r, 'diff').state, 'pass');
  // blob은 있지만 patch에서 그 내용을 빼면 오답입니다.
  f.write('reports/change.patch', patch.replace('+REGION=seoul\n', ''));
  f.commit('docs: submit diff analysis'); f.git('branch', '-f', 'solution/diff');
  r = await grade({ ...f.options, course: 'scenarios', offline: true });
  assert.equal(item(r, 'diff').state, 'fail');
  assert.match(item(r, 'diff').detail, /실제 blob/);
  // 존재하지 않는 index 해시는 판정 보류이며 점수도 주지 않습니다.
  f.write('reports/change.patch', patch.replace(/index [0-9a-f]+\.\.[0-9a-f]+/g, 'index 1111111..2222222'));
  f.commit('docs: submit diff analysis'); f.git('branch', '-f', 'solution/diff');
  r = await grade({ ...f.options, course: 'scenarios', offline: true });
  assert.equal(item(r, 'diff').state, 'unknown');
  assert.equal(item(r, 'diff').earned, 0);
  assert.match(item(r, 'diff').detail, /git fetch upstream/);
});

test('show 보고서는 실제 커밋 SHA·작성자·파일·증거를 요구한다', async t => {
  const f = fixture(t);
  f.write('forensic.txt', 'SHOW-EVIDENCE-TEST-1\n'); f.git('add', '.');
  f.git('-c', 'commit.gpgsign=false', '-c', 'user.name=Git Lab Instructor', '-c', 'user.email=lab@example.invalid',
    'commit', '-m', 'fix: restore missing deployment configuration');
  const sha = f.git('rev-parse', 'HEAD');
  const good = `커밋 SHA: ${sha}\n작성자: Git Lab Instructor\n커밋 메시지: fix: restore missing deployment configuration\n증거 문구: SHOW-EVIDENCE-TEST-1\n변경 파일: forensic.txt\n`;
  f.write('reports/show-report.md', good); f.commit('docs: report inspected commit'); f.git('branch', 'solution/show');
  let r = await grade({ ...f.options, course: 'scenarios', offline: true });
  assert.equal(item(r, 'show').state, 'pass');
  assert.equal(item(r, 'show').evidence.inspected.sha.length >= 7, true);
  // 화면 예시만 베껴 SHA가 없으면 실패합니다.
  f.write('reports/show-report.md', good.replace(`커밋 SHA: ${sha}\n`, ''));
  f.commit('docs: report inspected commit'); f.git('branch', '-f', 'solution/show');
  r = await grade({ ...f.options, course: 'scenarios', offline: true });
  assert.equal(item(r, 'show').state, 'fail');
});

test('blame 답안은 그 줄을 실제로 바꾼 커밋이어야 한다', async t => {
  const f = fixture(t);
  f.write('audit-checklist.md', '# 배포 점검표\n- 환경 변수 확인\n'); f.commit('docs: start audit checklist');
  f.write('audit-checklist.md', '# 배포 점검표\n- 환경 변수 확인\n- 릴리스 승인 코드: BLAME-OWNER-TEST\n'); f.git('add', '.');
  f.git('-c', 'commit.gpgsign=false', '-c', 'user.name=Release Manager', '-c', 'user.email=rm@example.invalid',
    'commit', '-m', 'docs: add release approval check');
  const target = f.git('rev-parse', 'HEAD');
  f.write('audit-checklist.md', '# 배포 점검표\n- 환경 변수 확인\n- 릴리스 승인 코드: BLAME-OWNER-TEST\n- 모니터링 대시보드 확인\n');
  f.commit('docs: add monitoring check');
  const latest = f.git('rev-parse', 'HEAD');
  f.write('reports/blame-answer.md', `대상: BLAME-OWNER-TEST\n커밋 SHA: ${target}\n작성자: Release Manager\n커밋 메시지: docs: add release approval check\n`);
  f.commit('docs: submit blame investigation'); f.git('branch', 'solution/blame');
  let r = await grade({ ...f.options, course: 'scenarios', offline: true });
  assert.equal(item(r, 'blame').state, 'pass');
  // 그 줄을 바꾸지 않은 최신 커밋을 적으면 실패합니다.
  f.write('reports/blame-answer.md', `대상: BLAME-OWNER-TEST\n커밋 SHA: ${latest}\n작성자: Test Student\n커밋 메시지: docs: add monitoring check\n`);
  f.commit('docs: submit blame investigation'); f.git('branch', '-f', 'solution/blame');
  r = await grade({ ...f.options, course: 'scenarios', offline: true });
  assert.equal(item(r, 'blame').state, 'fail');
  assert.match(item(r, 'blame').detail, /바꾼 커밋이 아닙니다/);
});

test('release 태그는 workflow를 포함한 커밋을 가리켜야 한다', async t => {
  const f = fixture(t);
  const earlier = f.git('rev-parse', 'HEAD');
  f.write('.github/workflows/release.yml', 'permissions:\n  contents: write\non:\n  push:\n    tags:\n      - release-v*\njobs:\n  release:\n    steps:\n      - run: gh release create "$GITHUB_REF_NAME"\n');
  f.commit('ci: automate GitHub release'); f.git('branch', 'solution/actions-release');
  // 태그가 없으면 실패합니다.
  let r = await grade({ ...f.options, course: 'scenarios', offline: true });
  assert.equal(item(r, 'release').state, 'fail');
  assert.match(item(r, 'release').detail, /태그가 없습니다/);
  // workflow 이전 커밋에 태그를 달면 실패합니다.
  f.git('-c', 'tag.gpgsign=false', 'tag', '-a', 'release-v1.0.0', '-m', 'wrong target', earlier);
  r = await grade({ ...f.options, course: 'scenarios', offline: true });
  assert.equal(item(r, 'release').state, 'fail');
  assert.match(item(r, 'release').detail, /workflow 파일이 없는 커밋/);
  // 올바른 커밋에 태그를 달면 로컬 조건을 통과하고 온라인 확인 단계로 넘어갑니다.
  f.git('tag', '-d', 'release-v1.0.0');
  f.git('-c', 'tag.gpgsign=false', 'tag', '-a', 'release-v1.0.0', '-m', 'ok', 'solution/actions-release');
  r = await grade({ ...f.options, course: 'scenarios', offline: true });
  assert.equal(item(r, 'release').state, 'unknown');
});

test('Pages는 브랜치 배포와 Actions 배포를 모두 인정한다', async t => {
  const f = fixture(t);
  f.write('docs/index.html', '<h1>PAGES-LIVE-2026</h1>'); f.commit('feat: publish homepage'); f.git('branch', 'solution/pages');
  const live = { status: 200, ok: true, text: async () => 'PAGES-LIVE-2026' };
  let r = await grade({ ...f.options, course: 'scenarios' }, { github: f.github, fetch: async () => live });
  assert.equal(item(r, 'pages').state, 'pass');
  assert.equal(item(r, 'pages').evidence.deployment, 'branch');
  // Actions 배포 workflow를 추가해도 동일하게 통과합니다.
  f.write('.github/workflows/pages.yml', 'jobs:\n  deploy:\n    steps:\n      - uses: actions/deploy-pages@v4\n');
  f.commit('ci: deploy pages with actions'); f.git('branch', '-f', 'solution/pages');
  r = await grade({ ...f.options, course: 'scenarios' }, { github: f.github, fetch: async () => live });
  assert.equal(item(r, 'pages').state, 'pass');
  assert.equal(item(r, 'pages').evidence.deployment, 'actions');
});

test('CLI JSON, 종료 코드, 기존 파일 덮어쓰기 방지', t => {
  const f = fixture(t); const output = path.join(f.dir, 'result.json'); const cli = path.resolve(__dirname, '../bin/grade-local.js');
  const args = [cli, '--repo', f.dir, '--username', 'student', '--offline', '--json', output];
  // 오프라인 보류 항목만 남으면 종료 코드는 0입니다(실패 항목이 없기 때문).
  const first = spawnSync(process.execPath, args, { encoding: 'utf8' }); assert.equal(first.status, 0); assert.equal(JSON.parse(fs.readFileSync(output)).score, 55);
  const before = fs.readFileSync(output, 'utf8'); const second = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(second.status, 2); assert.match(second.stderr, /이미 있습니다/); assert.equal(fs.readFileSync(output, 'utf8'), before);
  assert.equal(spawnSync(process.execPath, [cli, '--help']).status, 0); assert.equal(spawnSync(process.execPath, [cli, '--unknown']).status, 2);
  // --repo를 빼면 현재 폴더를 조용히 채점하지 않고 오류로 멈춥니다.
  const noRepo = spawnSync(process.execPath, [cli, '--offline'], { encoding: 'utf8' });
  assert.equal(noRepo.status, 2); assert.match(noRepo.stderr, /--repo/);
});
test('GitHub remote 형식 검사', () => {
  for (const value of ['https://github.com/student/lab.git', 'git@github.com:student/lab.git', 'ssh://git@github.com/student/lab.git']) assert.equal(parseGitHub(value), 'student/lab');
  for (const value of ['https://github.com.evil/student/lab', 'https://token@github.com/student/lab', 'https://github.com/student/lab/tree/main']) assert.equal(parseGitHub(value), null);
});

test('빈 커밋으로 수만 늘린 제출은 커밋 점수를 얻지 못한다', async t => {
  const f = fixture(t);
  f.git('checkout', '--orphan', 'empty-history'); f.git('rm', '-rf', '.');
  f.write('README.md', 'git-lab-student'); f.commit('first');
  f.git('-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'empty');
  f.git('branch', '-f', 'main');
  const r = await grade(f.options, { github: f.github });
  assert.equal(item(r, 'commits').state, 'fail'); assert.equal(item(r, 'commits').evidence.distinctTrees, 1);
});
test('Pages의 서버 오류는 확인 불가, 정상 응답의 틀린 내용은 실패', async t => {
  const f = fixture(t); f.write('docs/index.html', 'PAGES-LIVE-2026'); f.commit('pages'); f.git('branch', 'solution/pages');
  let r = await grade({ ...f.options, course: 'scenarios' }, { github: f.github, fetch: async () => ({ status: 503, ok: false }) });
  assert.equal(item(r, 'pages').state, 'unknown');
  r = await grade({ ...f.options, course: 'scenarios' }, { github: f.github, fetch: async () => ({ status: 200, ok: true, text: async () => 'wrong website' }) });
  assert.equal(item(r, 'pages').state, 'fail');
});
