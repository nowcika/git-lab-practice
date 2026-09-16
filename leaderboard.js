'use strict';
(() => {
  const Core = window.LeaderboardCore;
  const section = document.getElementById('leaderboard');
  if (!Core || !section) return;
  const platform = 'nowcika/git-lab-practice';
  const rawUrl = `https://raw.githubusercontent.com/${platform}/leaderboard-data/data/leaderboard.json`;
  const status = document.getElementById('leaderboardStatus');
  const rows = document.getElementById('leaderboardRows');
  const courseSelect = document.getElementById('leaderboardCourse');
  const repositoryInput = document.getElementById('leaderboardRepo');
  const submit = document.getElementById('leaderboardSubmit');
  const search = document.getElementById('leaderboardSearch');
  const refresh = document.getElementById('leaderboardRefresh');
  const previous = document.getElementById('leaderboardPrevious');
  const next = document.getElementById('leaderboardNext');
  let board = null, course = 'basic', page = 0;
  const size = 20;
  function link(text, url) {
    const a = document.createElement('a'); a.textContent = text; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }
  function render() {
    const all = board ? Core.rank(board, course) : [];
    const filtered = all.filter(entry => entry.login.toLowerCase().includes(search.value.trim().toLowerCase()));
    page = Math.min(page, Math.max(0, Math.ceil(filtered.length / size) - 1));
    rows.replaceChildren();
    for (const entry of filtered.slice(page * size, (page + 1) * size)) {
      const row = document.createElement('tr');
      const values = [String(entry.rank), link(entry.login, `https://github.com/${entry.login}`), `${entry.score} / ${entry.maxScore}`, `${entry.passed} / ${entry.total}`, link(entry.repository.split('/')[1], `https://github.com/${entry.repository}`), new Date(entry.checkedAt).toLocaleString('ko-KR'), link('검증 기록 ↗', `https://github.com/${platform}/actions/runs/${entry.runId}`)];
      for (const value of values) { const td = document.createElement('td'); if (typeof value === 'string') td.textContent = value; else td.append(value); row.append(td); }
      rows.append(row);
    }
    if (!filtered.length) {
      const row = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 7; td.className = 'leaderboard-empty';
      td.textContent = board ? (search.value.trim() ? '찾는 사용자가 없습니다.' : '아직 등록된 점수가 없습니다. 첫 번째 기록을 남겨 보세요.') : '순위 데이터를 불러오는 중입니다.';
      row.append(td); rows.append(row);
    }
    document.getElementById('leaderboardParticipants').textContent = `${all.length}명 참여`;
    document.getElementById('leaderboardBest').textContent = all.length ? `최고 ${all[0].score}점` : '첫 기록을 기다립니다';
    document.getElementById('leaderboardPage').textContent = `${page + 1} / ${Math.max(1, Math.ceil(filtered.length / size))}`;
    document.getElementById('leaderboardCaption').textContent = `${Core.COURSES[course].title} 공개 순위 · ${Core.COURSES[course].maxScore}점 만점`;
    previous.disabled = page === 0; next.disabled = (page + 1) * size >= filtered.length;
    section.querySelectorAll('[data-board-course]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.boardCourse === course)));
  }
  async function load() {
    refresh.disabled = true; status.textContent = '공개 순위를 불러오는 중입니다…';
    try {
      let response = await fetch(`${rawUrl}?v=${Date.now()}`, { credentials: 'omit', signal: AbortSignal.timeout(15000) });
      if (response.status === 404) response = await fetch('data/leaderboard.json', { credentials: 'omit' });
      if (!response.ok) throw new Error('load failed');
      board = Core.validateBoard(await response.json());
      status.textContent = board.updatedAt ? `마지막 반영: ${new Date(board.updatedAt).toLocaleString('ko-KR')}` : '새 제출은 서버 검증을 마친 뒤 표시됩니다.';
      render();
    } catch {
      status.textContent = board ? '새 데이터를 불러오지 못했습니다. 마지막으로 확인한 순위입니다.' : '순위를 불러오지 못했습니다. 새로고침으로 다시 시도하세요.';
      if (!board) { render(); rows.firstChild.firstChild.textContent = '순위 조회에 실패했습니다.'; }
    } finally { refresh.disabled = false; }
  }
  function updateSubmission() {
    const name = Core.repositoryName(repositoryInput.value.trim());
    repositoryInput.setCustomValidity(name ? '' : 'https://github.com/내계정/내저장소 형식으로 입력하세요.');
    const url = new URL(`https://github.com/${platform}/issues/new`);
    url.searchParams.set('template', 'leaderboard.yml');
    url.searchParams.set('title', `[Leaderboard] ${courseSelect.value}`);
    url.searchParams.set('course', courseSelect.value);
    if (name) url.searchParams.set('repository', `https://github.com/${name}`);
    submit.href = url.href;
    return Boolean(name);
  }
  submit.addEventListener('click', event => { if (!updateSubmission()) { event.preventDefault(); repositoryInput.reportValidity(); } });
  repositoryInput.addEventListener('input', updateSubmission);
  courseSelect.addEventListener('change', updateSubmission);
  section.querySelectorAll('[data-board-course]').forEach(button => button.addEventListener('click', () => { course = button.dataset.boardCourse; courseSelect.value = course; page = 0; updateSubmission(); render(); }));
  document.querySelectorAll('[data-submit-course]').forEach(button => button.addEventListener('click', () => {
    course = button.dataset.submitCourse; courseSelect.value = course;
    repositoryInput.value = document.getElementById(course === 'basic' ? 'repoUrl' : 'scenarioRepoUrl').value;
    page = 0; updateSubmission(); render();
  }));
  search.addEventListener('input', () => { page = 0; render(); });
  previous.addEventListener('click', () => { page--; render(); }); next.addEventListener('click', () => { page++; render(); });
  refresh.addEventListener('click', load);
  updateSubmission(); render(); load();
})();
