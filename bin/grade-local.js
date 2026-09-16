#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { grade } = require('../lib/local-grader');

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') {
      console.log('사용법: node bin/grade-local.js --repo <폴더> [--course basic|scenarios] [--username 사용자] [--github owner/repo] [--branch main] [--offline] [--json 보고서.json]\nGitHub 검증은 gh auth login이 필요합니다. 종료 코드: 0=전부 통과, 1=오답, 2=확인 불가/실행 오류.');
      return;
    }
    if (arg === '--offline') { options.offline = true; continue; }
    if (!['--repo', '--course', '--username', '--github', '--branch', '--json'].includes(arg) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`알 수 없거나 값이 없는 옵션: ${arg}`);
    options[arg.slice(2)] = args[++i];
  }
  // Refuse to overwrite any existing file, including files in the submitted repository.
  const output = options.json ? path.resolve(options.json) : null;
  if (output && fs.existsSync(output)) throw new Error('보고서 파일이 이미 있습니다. 새 파일명을 지정하세요.');
  const report = await grade(options);
  console.log(`${report.course} · ${report.mode} · ${report.score}/${report.maxScore}점`);
  for (const r of report.results) console.log(`[${r.state}] ${r.name}: ${r.earned}/${r.points} — ${r.detail}`);
  console.log(`통과 ${report.summary.pass}, 실패 ${report.summary.fail}, 확인 불가 ${report.summary.unknown}`);
  if (output) { fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' }); console.log(`보고서: ${output}`); }
  process.exitCode = report.summary.unknown ? 2 : report.summary.fail ? 1 : 0;
}
main().catch(error => { console.error(`검증 실패: ${error.message}`); process.exitCode = 2; });
