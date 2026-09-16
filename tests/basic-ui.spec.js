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

test('Windows 사용자를 위한 안내와 대체 명령이 표시된다', async ({ page }) => {
  await page.goto('/#scenarios');
  await expect(page.locator('.scenario-note')).toContainText('Git Bash');
  await expect(page.locator('.scenario-note')).toContainText('UTF-8');
  // heredoc·mkdir -p·리다이렉션을 쓰는 시나리오에는 PowerShell 대체 명령이 붙는다.
  for (const id of ['show', 'blame', 'release', 'pages', 'diff', 'patch']) {
    const usage = page.locator(`#scenario-${id} details.usage`);
    await expect(usage, id).toContainText('Windows에서 실행할 때');
  }
  const card = page.locator('#scenario-show');
  await card.locator('summary').first().click();
  const show = card.locator('details.usage');
  await show.locator('summary').click();
  await expect(show).toContainText('Set-Content -Encoding utf8NoBOM');
  await expect(show).toContainText('New-Item -ItemType Directory -Force');
  // 셸 전용 구문이 없는 시나리오에는 붙지 않는다.
  await expect(page.locator('#scenario-tag details.usage')).not.toContainText('Windows에서 실행할 때');
});

test('Windows 설치 안내에 터미널과 인코딩 주의사항이 있다', async ({ page }) => {
  await page.goto('/#setup');
  const windows = page.locator('#manual-git .os-guides details').first();
  await expect(windows).toContainText('Git Bash');
  await expect(windows).toContainText('UTF-8(BOM 없음)');
  await expect(windows).toContainText('core.autocrlf');
});

test('초급 채점은 병합된 PR의 현재 브랜치 SHA와 실제 커밋을 확인한다', async ({ page }) => {
  const featureSha = 'a'.repeat(40);
  let submitted = featureSha;
  const commit = { sha: featureSha, commit: { tree: { sha: 'tree-a' }, committer: { name: 'Student', email: 'student@example.invalid' } } };
  await page.route('https://api.github.com/**', async route => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const pr = { number: 2, title: 'Feature', merged_at: '2026-09-16T00:00:00Z', user: { login: 'student' }, head: { ref: 'practice/feature', sha: submitted, repo: { full_name: 'student/lab' } }, base: { ref: 'main', repo: { full_name: 'student/lab' } } };
    let data;
    if (p === '/rate_limit') data = { resources: { core: { remaining: 5000, reset: 2000000000 } } };
    else if (p === '/users/student') data = { login: 'student' };
    else if (p === '/repos/student/lab') data = { full_name: 'student/lab', owner: { login: 'student' }, default_branch: 'main', fork: false };
    else if (p.includes('/contents/')) data = { encoding: 'base64', content: Buffer.from('git-lab-student').toString('base64') };
    else if (p.includes('/compare/')) data = { ahead_by: 0, head_commit: { sha: featureSha }, commits: [] };
    else if (p.endsWith('/pulls/2/commits')) data = [commit];
    else if (p.endsWith('/commits')) data = [commit, { ...commit, commit: { ...commit.commit, tree: { sha: 'tree-b' } } }];
    else if (p.endsWith('/issues')) data = [{ number: 1, title: '학습 계획', user: { login: 'student' } }];
    else if (p.endsWith('/pulls')) data = [pr];
    else throw new Error(`Unexpected request: ${p}`);
    await route.fulfill({ json: data });
  });
  await page.goto('/');
  await page.locator('#gitVersion').fill('git version 2.48.1');
  await page.locator('#username').fill('student');
  await page.locator('#repoUrl').fill('https://github.com/student/lab');
  await page.locator('#gradeButton').click();
  await expect(page.locator('#resultList .result-mark.pass')).toHaveCount(8);
  await expect(page.locator('#scoreRingText')).toHaveText('100%');
  // 서버와 같은 입력으로 실제 채점 경로를 거쳐 공개 결과 계약을 검증합니다.
  await page.locator('#gitVersion').fill('');
  await page.locator('#gradeButton').click();
  await expect(page.locator('#gradeButton')).toBeEnabled();
  const basic = await page.evaluate(() => window.lastBasicReport);
  expect(basic.score).toBe(90);
  expect(basic.results).toHaveLength(8);
  expect(basic.results[0]).toMatchObject({ points: 10, state: 'fail' });
  const publicChecks = basic.results.slice(1);
  expect(publicChecks).toHaveLength(7);
  expect(publicChecks.map(check => check.points)).toEqual([10, 15, 15, 15, 15, 10, 10]);
  expect(publicChecks.reduce((sum, check) => sum + check.points, 0)).toBe(90);
  for (const check of publicChecks) {
    expect(check.state).toBe('pass');
    expect(typeof check.name).toBe('string');
    expect(check.name.trim().length).toBeGreaterThan(0);
    expect(typeof check.detail).toBe('string');
    expect(check.detail.trim().length).toBeGreaterThan(0);
  }
  await page.locator('#gitVersion').fill('git version 2.48.1');
  submitted = 'b'.repeat(40);
  await page.locator('#gradeButton').click();
  await expect(page.locator('#resultList .result-mark.fail')).toHaveCount(1);
  await expect(page.locator('#scoreRingText')).toHaveText('85%');
});

test('공개 순위표 서버 검증이 읽는 실전 채점 결과 계약이 유지된다', async ({ page }) => {
  // 초급 계약은 위의 실제 채점 테스트에서 검증합니다.
  await page.goto('/');
  const scenario = await page.evaluate(() => {
    renderScenarioResults(scenarioDefinitions.map(() => ({ state: 'fail', detail: '미통과' })), 0);
    const results = window.lastScenarioReport?.results || [];
    return {
      count: results.length,
      totalPoints: results.reduce((sum, r) => sum + r.points, 0),
      sample: results[0] && { name: results[0].name, points: results[0].points, state: results[0].state, hasDetail: typeof results[0].detail === 'string' },
    };
  });
  expect(scenario.count).toBe(20);
  expect(scenario.totalPoints).toBe(325);
  expect(scenario.sample).toMatchObject({ state: 'fail', hasDetail: true });
  expect(scenario.sample.points).toBeGreaterThan(0);
  expect(scenario.sample.name.length).toBeGreaterThan(0);
});
