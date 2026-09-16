'use strict';
const crypto = require('node:crypto');
const Core = require('../leaderboard-core');
const PLATFORM = 'nowcika/git-lab-practice';
const BRANCH = 'leaderboard-data';
const FILE = 'data/leaderboard.json';
const digest = body => crypto.createHash('sha256').update(body || '').digest('hex');
function parseIssue(issue) {
  if (!issue || issue.pull_request || issue.state !== 'open' || !issue.title?.startsWith('[Leaderboard]')) throw new Error('열린 순위표 제출 이슈가 아닙니다.');
  if (!Number.isSafeInteger(issue.number) || !Number.isSafeInteger(issue.user?.id) || !Core.validLogin(issue.user?.login)
    || issue.user.type !== 'User') throw new Error('GitHub 제출 계정을 확인할 수 없습니다.');
  const body = String(issue.body || '');
  const fields = {};
  for (const match of body.matchAll(/^### (Course|Repository)\r?\n+([^\r\n]+)(?:\r?\n|$)/gm)) {
    if (fields[match[1]]) throw new Error('중복된 제출 항목입니다.');
    fields[match[1]] = match[2].trim();
  }
  const course = fields.Course;
  const repository = Core.repositoryName(fields.Repository);
  if (!Core.COURSES[course] || !repository) throw new Error('Course와 Repository를 제출 양식에 맞게 입력하세요.');
  if (repository.split('/')[0].toLowerCase() !== issue.user.login.toLowerCase()) throw new Error('로그인한 본인 계정의 저장소만 제출할 수 있습니다.');
  if (['nowcika/git-scenario-solution', 'nowcika/git-lab-example'].includes(repository.toLowerCase())) throw new Error('공식 예제·정답 저장소는 순위에 등록하지 않습니다.');
  return { userId: issue.user.id, login: issue.user.login, course, repository, issueNumber: issue.number, bodyHash: digest(body) };
}
class GitHubClient {
  constructor(token, fetcher = fetch) { if (!token) throw new Error('GitHub Actions 인증 토큰이 필요합니다.'); this.token = token; this.fetcher = fetcher; }
  async request(endpoint, method = 'GET', body) {
    if (!endpoint.startsWith('/') || endpoint.startsWith('//')) throw new Error('잘못된 GitHub API 경로');
    const response = await this.fetcher(`https://api.github.com${endpoint}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${this.token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) { const error = new Error(`GitHub 조회/저장 실패 (HTTP ${response.status})`); error.status = response.status; throw error; }
    return response.json();
  }
}
async function verifyOwner(client, submission) {
  const repo = await client.request(`/repos/${submission.repository}`);
  if (repo.private || repo.owner?.id !== submission.userId || repo.owner?.login?.toLowerCase() !== submission.login.toLowerCase()) throw new Error('본인 소유의 공개 저장소인지 확인하세요.');
  if (submission.course === 'basic' && repo.fork) throw new Error('초급 과정은 직접 만든 저장소를 제출하세요.');
  if (submission.course === 'scenarios' && (!repo.fork || repo.parent?.full_name?.toLowerCase() !== 'nowcika/git-scenario-lab')) throw new Error('실전 과정은 원본 git-scenario-lab의 Fork가 필요합니다.');
  return repo;
}
function resultEntry(submission, checks, runId, checkedAt = new Date().toISOString()) {
  const course = Core.COURSES[submission.course];
  if (!course || checks.length !== course.total || checks.some(c => !['pass', 'fail'].includes(c.state))) throw new Error('확인 불가 항목이 있어 순위에 등록하지 않습니다. 기존 최고 점수는 유지됩니다.');
  if (checks.some(c => !Number.isInteger(c.points) || c.points <= 0) || checks.reduce((s, c) => s + c.points, 0) !== course.maxScore) throw new Error('채점 기준 배점이 달라 순위 등록을 중단합니다.');
  const entry = {
    rulesVersion: Core.RULES_VERSION, userId: submission.userId, login: submission.login, course: submission.course,
    repository: submission.repository, score: checks.reduce((s, c) => s + (c.state === 'pass' ? c.points : 0), 0), maxScore: course.maxScore,
    passed: checks.filter(c => c.state === 'pass').length, total: course.total, checkedAt,
    issueNumber: submission.issueNumber, runId: Number(runId),
  };
  if (!Core.validEntry(entry)) throw new Error('순위 결과가 유효하지 않습니다.');
  return entry;
}
async function publish(client, report, { wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  if (!Core.validEntry(report.entry) || !/^[a-f0-9]{64}$/.test(report.bodyHash)) throw new Error('검증 결과 형식 오류');
  // Branch initialization can race; another publisher creating it first is harmless.
  try { await client.request(`/repos/${PLATFORM}/git/ref/heads/${BRANCH}`); }
  catch (error) {
    if (error.status !== 404) throw error;
    const main = await client.request(`/repos/${PLATFORM}/git/ref/heads/main`);
    try { await client.request(`/repos/${PLATFORM}/git/refs`, 'POST', { ref: `refs/heads/${BRANCH}`, sha: main.object.sha }); }
    catch (created) { if (created.status !== 422) throw created; }
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const issue = await client.request(`/repos/${PLATFORM}/issues/${report.entry.issueNumber}`);
    const current = parseIssue(issue);
    if (current.bodyHash !== report.bodyHash || current.userId !== report.entry.userId || current.repository !== report.entry.repository || current.course !== report.entry.course) throw new Error('검사 중 제출 내용이 변경됐습니다. 변경된 제출의 검사 결과를 기다리세요.');
    await verifyOwner(client, current);
    let file, board = Core.emptyBoard();
    try { file = await client.request(`/repos/${PLATFORM}/contents/${FILE}?ref=${BRANCH}`); }
    catch (error) { if (error.status !== 404) throw error; }
    if (file) {
      if (file.encoding !== 'base64' || !file.content) throw new Error('순위 파일을 읽지 못했습니다.');
      board = Core.validateBoard(JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')));
    }
    const next = Core.upsert(board, report.entry);
    if (next === board) return { changed: false };
    const content = Buffer.from(`${JSON.stringify(next, null, 2)}\n`).toString('base64');
    try {
      await client.request(`/repos/${PLATFORM}/contents/${FILE}`, 'PUT', { branch: BRANCH, message: `Update ${report.entry.course} leaderboard`, content, ...(file ? { sha: file.sha } : {}) });
      return { changed: true };
    } catch (error) {
      if (![409, 422].includes(error.status) || attempt === 4) throw error;
      await wait(250 * (attempt + 1));
    }
  }
}
module.exports = { PLATFORM, BRANCH, FILE, digest, parseIssue, GitHubClient, verifyOwner, resultEntry, publish };
