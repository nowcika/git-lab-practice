#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
// Configure the browser path before importing Playwright.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '0';
const { PLATFORM, parseIssue, parseDeletion, isDeletion, digest, GitHubClient, resultEntry } = require('../lib/leaderboard-service');
const { gradePublic } = require('../lib/leaderboard-grader');
async function main() {
  let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token && !process.env.GITHUB_ACTIONS) token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const client = new GitHubClient(token);
  const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
  if (process.env.GITHUB_ACTIONS && process.env.GITHUB_REPOSITORY !== PLATFORM) throw new Error('순위표 원본 저장소에서 실행해야 합니다.');
  let submission, publishable = false;
  if (process.env.GITHUB_EVENT_NAME === 'issues') {
    if (event.sender?.id !== event.issue?.user?.id) throw new Error('작성자 본인이 제출 내용을 수정하거나 다시 여세요.');
    submission = (isDeletion(event.issue) ? parseDeletion : parseIssue)(event.issue);
    const latest = await client.request(`/repos/${PLATFORM}/issues/${submission.issueNumber}`);
    if (digest(latest.body) !== submission.bodyHash) throw new Error('더 새로운 제출 내용이 있습니다. 최신 실행 결과를 확인하세요.');
    publishable = true;
  } else if (event.inputs?.issue_number) {
    const number = Number(event.inputs.issue_number);
    if (!Number.isSafeInteger(number) || number <= 0) throw new Error('이슈 번호를 확인하세요.');
    const issue = await client.request(`/repos/${PLATFORM}/issues/${number}`);
    submission = (isDeletion(issue) ? parseDeletion : parseIssue)(issue);
    publishable = true;
  } else {
    // Operator smoke check: never produces a public leaderboard entry.
    const example = await client.request('/repos/nowcika/git-lab-example');
    submission = { login: example.owner.login, userId: example.owner.id, course: 'basic', repository: example.full_name, issueNumber: 1 };
  }
  if (publishable && !submission.repository) {
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync('test-results/leaderboard-verified.json', JSON.stringify({ publishable: true, deletion: submission }));
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'publishable=true\n');
    console.log(`본인 기록 삭제 요청 확인: ${submission.login} · ${submission.course}`);
    return;
  }
  const result = await gradePublic(submission, token, { client });
  const entry = resultEntry(submission, result.checks, process.env.GITHUB_RUN_ID || 1);
  const report = { publishable, entry, bodyHash: submission.bodyHash || null, ...result };
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/leaderboard-verified.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(`서버 검증 완료: ${entry.login} · ${entry.course} · ${entry.score}/${entry.maxScore} (${publishable ? '순위 등록 대상' : '운영 점검: 등록하지 않음'})`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `publishable=${publishable}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 공개 순위표 검증\n\n${entry.login}: **${entry.score}/${entry.maxScore}점**, ${entry.passed}/${entry.total}개 통과.\n\n${publishable ? '최고 점수 반영 작업을 진행합니다.' : '운영 점검이므로 순위에 등록하지 않습니다.'}\n`);
}
main().catch(error => { console.error(`순위표 검사 중단: ${error.message}`); process.exitCode = 1; });
