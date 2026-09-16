const { test, expect } = require('@playwright/test');
// 토큰은 api.github.com 요청에만 붙입니다(설정에서 브라우저 전역 헤더를 쓰지 않습니다).
test.beforeEach(async ({ page }) => {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) await page.route('https://api.github.com/**', route => route.continue({ headers: { ...route.request().headers(), Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } }));
});

test('공식 정답 저장소는 기본적으로 채점되지 않는다', async ({ page }) => {
  await page.goto('/#scenarios');
  await page.locator('#scenarioRepoUrl').fill('https://github.com/nowcika/git-scenario-solution');
  await page.locator('#scenarioGradeButton').click();
  await expect(page.locator('#scenarioResults')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#scenarioScore')).toHaveText('0');
  await expect(page.locator('#scenarioResultList .result-item').first()).toContainText('공식 정답 저장소는 채점 대상이 아닙니다');
});

test('테스트 모드에서 공식 정답 저장소가 325점을 받는다', async ({ page }) => {
  await page.goto('/?allowAnswerRepo=1#scenarios');
  await expect(page.locator('#scenarioApp')).toBeVisible();
  await page.locator('#scenarioRepoUrl').fill('https://github.com/nowcika/git-scenario-solution');
  await page.locator('#scenarioGradeButton').click();
  await expect(page.locator('#scenarioResults')).toBeVisible({ timeout: 120000 });
  await expect(page.locator('#scenarioScore')).toHaveText('325', { timeout: 120000 });
  await expect(page.locator('#scenarioResultList .result-item')).toHaveCount(20);
  await expect(page.locator('#scenarioResultList .result-mark.pass')).toHaveCount(20);
  await expect(page.locator('#scenarioStatus')).toContainText('채점을 마쳤습니다');
  await page.locator('#scenarioResults').screenshot({ path: 'test-results/scenario-290-score.png' });
});

test('모든 시나리오의 가이드와 정답 링크', async ({ page }) => {
  await page.goto('/#scenarios');
  const cards = page.locator('details.scenario');
  await expect(cards).toHaveCount(20);
  for (let i = 0; i < await cards.count(); i++) {
    const c = cards.nth(i);
    if ((await c.getAttribute('open')) === null) await c.locator('summary').first().click();
    await expect(c.locator('.scenario-body')).toBeVisible();
    await expect(c.locator('.scenario-answer')).toHaveAttribute('href', /git-scenario-solution|github\.io/);
  }
});

test('설치 가입 및 초급 가이드', async ({ page }) => {
  await page.goto('/#setup');
  await expect(page.locator('#manual-git')).toBeVisible();
  await expect(page.locator('#manual-github')).toBeVisible();
  await page.goto('/#practice');
  await expect(page.locator('#guides details.guide')).toHaveCount(6);
});
