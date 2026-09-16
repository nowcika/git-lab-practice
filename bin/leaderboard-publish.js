#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { PLATFORM, GitHubClient, publish, deleteRecord } = require('../lib/leaderboard-service');
async function main() {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== PLATFORM) throw new Error('게시 작업은 원본 저장소의 GitHub Actions에서만 실행됩니다.');
  const report = JSON.parse(fs.readFileSync('test-results/leaderboard-verified.json', 'utf8'));
  if (!report.publishable) throw new Error('공개 등록용 검사 결과가 아닙니다.');
  const outcome = await (report.deletion ? deleteRecord : publish)(new GitHubClient(process.env.GH_TOKEN), report);
  if (report.deletion) { console.log(outcome.changed ? '본인 순위 기록을 삭제했습니다.' : '삭제할 본인 기록이 없습니다.'); return; }
  console.log(outcome.changed ? '최고 점수를 공개 순위표에 반영했습니다.' : '기존 최고 점수를 유지했습니다.');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n[공개 순위표](https://nowcika.github.io/git-lab-practice/#leaderboard) — ${outcome.changed ? '갱신 완료' : '기존 최고 점수 유지'}\n`);
}
main().catch(error => { console.error(`순위표 게시 중단: ${error.message}`); process.exitCode = 1; });
