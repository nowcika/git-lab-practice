#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { grade } = require('../lib/local-grader');

const HELP = `사용법: node bin/grade-local.js --repo <폴더> [옵션]

필수
  --repo <폴더>          학습자가 실제로 작업한 Git 저장소 폴더

선택
  --course basic|scenarios   채점 과정 (기본값 basic, 100점 / scenarios 290점)
  --username <사용자>        GitHub 사용자 이름 (생략하면 gh 인증 계정)
  --github owner/repo        채점 대상 저장소 (생략하면 origin에서 추론)
  --branch <이름>            기본 브랜치 지정 (생략하면 GitHub 기본 브랜치, 오프라인은 main)
  --offline                  네트워크 없이 로컬 파일과 이력만 검사
  --json <파일>              JSON 보고서 저장 (기존 파일은 덮어쓰지 않음)
  --help                     이 도움말

사용 예
  # 초급 과정을 GitHub 결과까지 함께 검사
  node bin/grade-local.js --repo ~/work/my-lab --course basic

  # 실전 시나리오를 검사하고 보고서를 남기기
  node bin/grade-local.js --repo ~/work/git-scenario-lab --course scenarios --json ~/result.json

  # 네트워크가 없는 교육장에서 로컬 결과만 확인
  node bin/grade-local.js --repo ~/work/my-lab --username octocat --offline

  # 기본 브랜치가 master인 저장소
  node bin/grade-local.js --repo ~/work/old-repo --branch master

GitHub 검증은 gh CLI 설치와 gh auth login이 필요합니다.
종료 코드: 0=전부 통과, 1=오답 있음, 2=확인 불가 또는 실행 오류.
--offline에서 원래 확인할 수 없는 항목(계정·저장소·이슈·PR 등)은 종료 코드에 반영하지 않습니다.`;

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  const valued = ['--repo', '--course', '--username', '--github', '--branch', '--json'];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') { console.log(HELP); return; }
    if (arg === '--offline') { options.offline = true; continue; }
    if (!valued.includes(arg)) throw new Error(`알 수 없는 옵션: ${arg}\n--help로 사용법을 확인하세요.`);
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${arg} 옵션에 값이 필요합니다.`);
    options[arg.slice(2)] = options[arg.slice(2)] === undefined ? args[++i] : (() => { throw new Error(`${arg} 옵션이 중복됐습니다.`); })();
  }
  // 실수로 현재 폴더를 채점하지 않도록 --repo를 반드시 받습니다.
  if (!options.repo) throw new Error('--repo <폴더>로 채점할 저장소를 지정하세요. 자세한 사용법은 --help를 확인하세요.');
  // Refuse to overwrite any existing file, including files in the submitted repository.
  const output = options.json ? path.resolve(options.json) : null;
  if (output && fs.existsSync(output)) throw new Error('보고서 파일이 이미 있습니다. 새 파일명을 지정하세요.');
  const report = await grade(options);
  console.log(`${report.course} · ${report.mode} · ${report.score}/${report.maxScore}점`);
  for (const r of report.results) console.log(`[${r.state}] ${r.name}: ${r.earned}/${r.points} — ${r.detail}`);
  console.log(`통과 ${report.summary.pass}, 실패 ${report.summary.fail}, 확인 불가 ${report.summary.unknown}${report.summary.offlineSkipped ? ` (그중 오프라인 보류 ${report.summary.offlineSkipped})` : ''}`);
  if (output) { fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' }); console.log(`보고서: ${output}`); }
  process.exitCode = report.summary.blocked ? 2 : report.summary.fail ? 1 : 0;
}
main().catch(error => { console.error(`검증 실패: ${error.message}`); process.exitCode = 2; });
