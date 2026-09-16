'use strict';
const path = require('node:path');
const { chromium } = require('playwright');
const { createStaticServer } = require('../bin/static-server');
const { GitHubClient, verifyOwner } = require('./leaderboard-service');

async function snapshot(client, repository) {
  const refs = {};
  for (let page = 1; page <= 10; page++) {
    const rows = await client.request(`/repos/${repository}/branches?per_page=100&page=${page}`);
    if (!Array.isArray(rows)) throw new Error('브랜치 목록을 확인하지 못했습니다.');
    for (const row of rows) refs[row.name] = row.commit.sha;
    if (rows.length < 100) return Object.fromEntries(Object.entries(refs).sort(([a], [b]) => a.localeCompare(b)));
  }
  throw new Error('브랜치 수가 검사 한도를 초과했습니다.');
}
// Only this repository's trusted webpage is executed. Submitted repositories are
// read through GitHub's API; their code, dependencies, hooks and workflows are never run.
async function gradePublic(submission, token, { client = new GitHubClient(token) } = {}) {
  const metadata = await verifyOwner(client, submission);
  const before = await snapshot(client, submission.repository);
  const server = createStaticServer(path.resolve(__dirname, '..'));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const pagesOrigin = `https://${submission.login.toLowerCase()}.github.io`;
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === origin) return route.continue();
      if (url.origin === 'https://api.github.com' && request.method() === 'GET') {
        try {
          const response = await route.fetch({ headers: { ...request.headers(), Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, maxRedirects: 0, timeout: 30000 });
          return route.fulfill({ response });
        } catch { return route.abort('failed'); }
      }
      // Pages redirects cannot carry authentication or access a different host.
      if (url.origin === pagesOrigin && request.method() === 'GET') {
        try { return route.fulfill({ response: await route.fetch({ headers: { Accept: 'text/html' }, maxRedirects: 0, timeout: 15000 }) }); }
        catch { return route.abort('failed'); }
      }
      return route.abort('blockedbyclient');
    });
    await page.goto(origin);
    let checks;
    if (submission.course === 'basic') {
      await page.locator('#username').fill(submission.login);
      await page.locator('#repoUrl').fill(`https://github.com/${submission.repository}`);
      // The server cannot attest to installation on a participant's PC.
      await page.locator('#gitVersion').fill('');
      await page.locator('#gradeButton').click();
      await page.waitForFunction(() => !document.getElementById('gradeButton').disabled, { }, { timeout: 180000 });
      // 첫 항목(Git 설치 출력)은 서버가 증명할 수 없어 제외합니다. 남은 7개가 90점입니다.
      checks = await page.evaluate(() => window.lastBasicReport?.results.slice(1) || null);
    } else {
      await page.locator('#scenarioRepoUrl').fill(`https://github.com/${submission.repository}`);
      await page.locator('#scenarioGradeButton').click();
      await page.waitForFunction(() => !document.getElementById('scenarioGradeButton').disabled, { }, { timeout: 180000 });
      checks = await page.evaluate(() => window.lastScenarioReport?.results || null);
    }
    if (!checks) throw new Error('채점이 완료되지 않았습니다. API 한도나 일시 오류를 확인하고 재시도하세요.');
    const after = await snapshot(client, submission.repository);
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('검사 중 브랜치가 변경됐습니다. push를 마친 뒤 다시 제출하세요.');
    const latest = await verifyOwner(client, submission);
    if (latest.id !== metadata.id || latest.default_branch !== metadata.default_branch) throw new Error('검사 중 저장소 설정이 변경됐습니다.');
    return { checks, snapshots: before, repositoryId: metadata.id };
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
  }
}
module.exports = { gradePublic, snapshot };
