'use strict';
const { defineConfig } = require('@playwright/test');
const { execFileSync } = require('node:child_process');

// gh 로그인 토큰을 자동으로 찾아 GitHub API 조회 한도를 늘립니다.
let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
try { if (!token) token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* gh 미설치 */ }
// UI 테스트는 이 값을 읽어 api.github.com 요청에만 헤더를 붙입니다(page.route).
if (token) process.env.GH_TOKEN = token;

// 주의: extraHTTPHeaders는 브라우저 컨텍스트의 모든 요청(웹폰트 등 제3자 도메인 포함)에
// 적용됩니다. 따라서 토큰 헤더는 브라우저를 쓰지 않는 api 프로젝트에만 붙입니다.
const apiHeaders = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
if (token) apiHeaders.Authorization = `Bearer ${token}`;

const port = Number(process.env.LAB_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 60000,
  expect: { timeout: 15000 },
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/playwright-results.json' }]],
  // UI 테스트는 배포본이 아니라 작업 중인 로컬 파일을 검사합니다.
  webServer: {
    command: `node bin/static-server.js ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30000,
  },
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    // 실제 GitHub 데이터와 배포 사이트를 검사합니다(브라우저 없이 API만 사용).
    { name: 'api', testMatch: '**/scenario-api.spec.js', use: { extraHTTPHeaders: apiHeaders } },
    // 로컬 소스를 브라우저로 검사합니다.
    { name: 'chromium', testMatch: ['**/basic-ui.spec.js', '**/scenario-ui.spec.js'], use: { browserName: 'chromium', baseURL } },
  ],
});
