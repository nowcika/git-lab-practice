#!/usr/bin/env node
'use strict';
// Windows의 cmd.exe와 PowerShell은 "VAR=값 명령" 문법을 지원하지 않습니다.
// 환경 변수를 여기서 설정해 bash·PowerShell·cmd 어디서나 같은 npm 명령으로 실행되게 합니다.
const { spawn } = require('node:child_process');
const path = require('node:path');

const cli = path.resolve(__dirname, '../node_modules/@playwright/test/cli.js');
const env = { ...process.env };
// 이미 지정했다면 존중하고, 없으면 node_modules 안의 브라우저를 사용합니다.
if (env.PLAYWRIGHT_BROWSERS_PATH === undefined) env.PLAYWRIGHT_BROWSERS_PATH = '0';

// 첫 인자가 하위 명령이 아니면 기본값으로 test를 붙입니다(예: --project=api).
const known = new Set(['test', 'show-report', 'install', 'install-deps', 'codegen', 'open', 'merge-reports', 'clear-cache']);
const args = process.argv.slice(2);
if (!args.length || !known.has(args[0])) args.unshift('test');

const child = spawn(process.execPath, [cli, ...args], { stdio: 'inherit', env });
child.on('error', error => { console.error(`테스트 실행 실패: ${error.message}`); process.exit(1); });
child.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 1));
