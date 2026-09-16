const { test, expect } = require('@playwright/test');
const site = 'https://nowcika.github.io/git-lab-practice/';

test('잘못된 입력을 차단하고 입력값을 새로고침 후 복원한다', async ({ page }) => {
  await page.goto(site);
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

test('모바일 화면에서 메뉴와 가이드가 동작하고 가로 넘침이 없다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(site);
  await page.locator('nav a[href="#scenarios"]').click();
  await expect(page).toHaveURL(/#scenarios$/);
  const card = page.locator('details.scenario').nth(1);
  await card.locator('summary').click();
  await expect(card.locator('.scenario-body')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/mobile-scenarios.png' });
});
