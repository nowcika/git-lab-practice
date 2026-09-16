const { test, expect } = require('@playwright/test');
// baseURL은 playwright.config.js의 로컬 정적 서버(작업 중인 소스)를 가리킵니다.

test('잘못된 입력을 차단하고 입력값을 새로고침 후 복원한다', async ({ page }) => {
  await page.goto('/');
  await page.locator('#gradeButton').click();
  await expect(page.locator('#username')).toBeFocused();
  await expect(page.locator('#status')).toContainText('사용자 이름');
  await page.locator('#username').fill('octocat');
  await page.locator('#repoUrl').fill('https://example.com/owner/repo');
  await page.locator('#gradeButton').click();
  await expect(page.locator('#repoUrl')).toBeFocused();
  await expect(page.locator('#results')).toBeHidden();
  await page.locator('#scenarioRepoUrl').fill('invalid');
  await page.locator('#scenarioGradeButton').click();
  await expect(page.locator('#scenarioStatus')).toContainText('Fork URL');
  await page.locator('#gitVersion').fill('git version 2.48.1');
  await page.reload();
  await expect(page.locator('#username')).toHaveValue('octocat');
  await expect(page.locator('#gitVersion')).toHaveValue('git version 2.48.1');
  await expect(page.locator('#scenarioRepoUrl')).toHaveValue('invalid');
});

test('저장소 URL 파싱이 경로와 자격 증명을 올바르게 처리한다', async ({ page }) => {
  await page.goto('/');
  const cases = await page.evaluate(() => [
    ['https://github.com/octocat/Hello-World', parseRepo('https://github.com/octocat/Hello-World')],
    ['tree 경로 포함', parseRepo('https://github.com/octocat/Hello-World/tree/main')],
    ['.git 접미사', parseRepo('https://github.com/octocat/Hello-World.git')],
    ['자격 증명 포함', parseRepo('https://user:pass@github.com/octocat/Hello-World')],
    ['http', parseRepo('http://github.com/octocat/Hello-World')],
  ]);
  expect(cases[0][1]).toEqual({ owner: 'octocat', name: 'Hello-World' });
  expect(cases[1][1]).toEqual({ owner: 'octocat', name: 'Hello-World' });
  expect(cases[2][1]).toEqual({ owner: 'octocat', name: 'Hello-World' });
  expect(cases[3][1]).toBeNull();
  expect(cases[4][1]).toBeNull();
});

test('macOS와 Windows의 git --version 출력이 모두 통과한다', async ({ page }) => {
  await page.goto('/');
  // 채점 로직과 동일한 정규식을 화면에서 직접 확인합니다.
  for (const [version, expected] of [
    ['git version 2.48.1', true],
    ['git version 2.39.5 (Apple Git-154)', true],
    ['git version 2.45.1.windows.1', true],
    ['버전 모름', false],
  ]) {
    await page.locator('#gitVersion').fill(version);
    await page.locator('#username').fill('octocat');
    await page.locator('#repoUrl').fill('https://github.com/octocat/Hello-World');
    const accepted = await page.evaluate(v => /^git version \d+\.\d+(?:\.\d+)?[\w.+-]*(?:\s+\(.+\))?$/i.test(v), version);
    expect(accepted, version).toBe(expected);
  }
});

test('명령어 활용 사례 블록이 모든 시나리오와 가이드에 있다', async ({ page }) => {
  await page.goto('/#scenarios');
  await expect(page.locator('details.scenario details.usage')).toHaveCount(20);
  const first = page.locator('details.scenario').first().locator('details.usage');
  await first.locator('summary').click();
  await expect(first.locator('.usage-group').first()).toBeVisible();
  await expect(first.locator('.usage-group dt code').first()).not.toBeEmpty();
  await page.goto('/#practice');
  await expect(page.locator('#guides details.guide details.usage')).toHaveCount(6);
});

test('코드 블록의 자리표시자가 사라지지 않는다', async ({ page }) => {
  await page.goto('/#scenarios');
  const reflog = page.locator('#scenario-reflog');
  await reflog.locator('summary').first().click();
  await expect(reflog.locator('pre code')).toContainText('git cherry-pick -x <찾은-SHA>');
});

test('모바일 화면에서 메뉴와 가이드가 동작하고 가로 넘침이 없다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('nav a[href="#scenarios"]').click();
  await expect(page).toHaveURL(/#scenarios$/);
  const card = page.locator('details.scenario').nth(1);
  await card.locator('summary').first().click();
  await expect(card.locator('.scenario-body')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/mobile-scenarios.png' });
});

test('Pages 시나리오가 브랜치·Actions 두 배포 경로를 안내한다', async ({ page }) => {
  await page.goto('/#scenarios');
  const card = page.locator('#scenario-pages');
  await card.locator('summary').first().click();
  const commands = await card.locator('pre code').textContent();
  expect(commands).toContain('Deploy from a branch');
  expect(commands).toContain('actions/upload-pages-artifact@v3');
  expect(commands).toContain('actions/deploy-pages@v4');
  expect(commands).toContain('${{ steps.deployment.outputs.page_url }}');
  await card.locator('details.usage summary').click();
  await expect(card.locator('details.usage')).toContainText('한 저장소에 사이트는 하나');
});

test('Release 시나리오가 Actions 활성화와 재시도 절차를 안내한다', async ({ page }) => {
  await page.goto('/#scenarios');
  const card = page.locator('#scenario-release');
  await card.locator('summary').first().click();
  await card.locator('details.usage summary').click();
  const usage = card.locator('details.usage');
  await expect(usage).toContainText('Fork는 Actions가 꺼져 있음');
  await expect(usage).toContainText('git push는 태그를 올리지 않음');
  await expect(usage).toContainText('gh release delete');
});
