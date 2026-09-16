const { test, expect } = require('@playwright/test');
const Core = require('../leaderboard-core');
const raw = 'https://raw.githubusercontent.com/nowcika/git-lab-practice/leaderboard-data/data/leaderboard.json*';
const entry = (userId, login, score, extra = {}) => ({ rulesVersion: Core.RULES_VERSION, userId, login, course: 'basic', repository: `${login}/lab`, score, maxScore: 90, passed: score === 90 ? 7 : 6, total: 7, checkedAt: '2026-09-16T01:00:00Z', issueNumber: userId, runId: 123, ...extra });
const data = () => ({ ...Core.emptyBoard(), updatedAt: '2026-09-16T01:00:00Z', entries: [entry(1, 'alice', 90), entry(2, 'bob', 90), entry(3, 'carol', 75), entry(1, 'alice', 325, { course: 'scenarios', maxScore: 325, passed: 20, total: 20 })] });

test('공동 순위와 과정 전환, 검색 시 원래 순위를 표시한다', async ({ page }) => {
  await page.route(raw, route => route.fulfill({ json: data() }));
  await page.goto('/#leaderboard');
  const rows = page.locator('#leaderboardRows tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.locator('td:first-child')).toHaveText(['1', '1', '3']);
  await page.locator('#leaderboardSearch').fill('CAROL');
  await expect(rows).toHaveCount(1); await expect(rows.locator('td:first-child')).toHaveText('3');
  await page.locator('#leaderboardSearch').clear();
  await page.locator('[data-board-course="scenarios"]').click();
  await expect(rows).toHaveCount(1); await expect(rows).toContainText('325 / 325');
});
test('첫 제출 전 빈 상태와 네트워크 실패를 구분한다', async ({ page }) => {
  await page.route(raw, route => route.fulfill({ status: 404 }));
  await page.goto('/#leaderboard');
  await expect(page.locator('#leaderboardRows')).toContainText('아직 등록된 점수가 없습니다');
  await page.unroute(raw);
  await page.route(raw, route => route.abort());
  await page.locator('#leaderboardRefresh').click();
  await expect(page.locator('#leaderboardStatus')).toContainText('마지막으로 확인한 순위');
  await page.reload();
  await expect(page.locator('#leaderboardRows')).toContainText('조회에 실패');
});
test('등록 링크에 점수·토큰 없이 과정과 저장소만 전달한다', async ({ page }) => {
  await page.route(raw, route => route.fulfill({ json: Core.emptyBoard() }));
  await page.goto('/#leaderboard');
  await page.locator('#leaderboardRepo').fill('https://github.com/alice/lab');
  await page.locator('#leaderboardCourse').selectOption('scenarios');
  const url = new URL(await page.locator('#leaderboardSubmit').getAttribute('href'));
  expect(url.origin).toBe('https://github.com'); expect(url.searchParams.get('repository')).toBe('https://github.com/alice/lab');
  expect(url.searchParams.get('course')).toBe('scenarios'); expect(url.searchParams.has('score')).toBeFalsy(); expect(url.searchParams.has('token')).toBeFalsy();
  await page.locator('#leaderboardRepo').fill('https://github.com/other/lab?score=325');
  expect(await page.locator('#leaderboardRepo').evaluate(input => input.checkValidity())).toBeFalsy();
});
test('모바일에서 표만 가로 스크롤하며 순위 페이지를 이동한다', async ({ page }) => {
  const board = { ...Core.emptyBoard(), entries: Array.from({ length: 25 }, (_, i) => entry(i + 1, `student${i}`, 90)) };
  await page.route(raw, route => route.fulfill({ json: board }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#leaderboard');
  await expect(page.locator('#leaderboardRows tr')).toHaveCount(20);
  await page.locator('#leaderboardNext').click();
  await expect(page.locator('#leaderboardRows tr')).toHaveCount(5);
  await expect(page.locator('#leaderboardPage')).toHaveText('2 / 2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.locator('#leaderboard').screenshot({ path: 'test-results/leaderboard-mobile.png' });
});
test('채점 결과에서 제출로 이동하면 과정과 저장소를 이어받는다', async ({ page }) => {
  await page.route(raw, route => route.fulfill({ json: Core.emptyBoard() }));
  await page.goto('/');
  await page.locator('#scenarioRepoUrl').fill('https://github.com/alice/lab');
  await page.evaluate(() => { document.getElementById('scenarioResults').hidden = false; });
  await page.locator('[data-submit-course="scenarios"]').click();
  await expect(page).toHaveURL(/#leaderboard$/);
  await expect(page.locator('#leaderboardRepo')).toHaveValue('https://github.com/alice/lab');
  await expect(page.locator('#leaderboardCourse')).toHaveValue('scenarios');
});
