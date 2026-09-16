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
  const details = document.getElementById('leaderboardDetails');
  function showDetails(entry) {
    details.replaceChildren(); details.hidden = false;
    const title = document.createElement('h3'); title.id = 'leaderboardDetailsTitle';
    title.textContent = `${entry.login} · ${Core.COURSES[entry.course].title} 채점 상세 (${entry.score} / ${entry.maxScore}점)`;
    details.append(title);
    const note = document.createElement('p');
    if (!entry.assessment) {
      note.textContent = '이전 기록에는 항목별 결과가 없습니다. 제출 이슈를 다시 열거나 수정해 재채점하면 동일한 저장소·점수·통과 수의 기록에 상세 결과가 추가됩니다.';
      details.append(note, link('기존 검증 기록 ↗', `https://github.com/${platform}/actions/runs/${entry.runId}`));
    } else {
      const assessment = entry.assessment;
      note.textContent = `상세 검사 시각: ${new Date(assessment.checkedAt).toLocaleString('ko-KR')} · 저장소의 검사 당시 결과입니다. 현재 순위의 최고 점수에 해당하며, 이후 낮은 점수의 제출 결과는 포함하지 않습니다.`;
      details.append(note);
      const list = document.createElement('ul'); list.className = 'leaderboard-checks';
      for (const check of assessment.checks) {
        const item = document.createElement('li'); item.className = `leaderboard-check ${check.state}`;
        const heading = document.createElement('strong');
        heading.textContent = `${check.state === 'pass' ? '통과' : '미통과'} · ${check.name} · ${check.state === 'pass' ? check.points : 0} / ${check.points}점`;
        const explanation = document.createElement('p'); explanation.textContent = check.detail;
        item.append(heading, explanation); list.append(item);
      }
      details.append(list, link('상세 결과 검증 기록 ↗', `https://github.com/${platform}/actions/runs/${assessment.runId}`));
    }
    const close = document.createElement('button'); close.type = 'button'; close.className = 'secondary-button'; close.textContent = '상세 닫기';
    close.addEventListener('click', () => { details.hidden = true; section.querySelector('[data-details-user="' + entry.userId + '"]')?.focus(); });
    details.append(close); details.focus(); details.scrollIntoView({ block: 'nearest' });
  }
  function link(text, url) {
    const a = document.createElement('a'); a.textContent = text; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }
  function render() {
    details.hidden = true;
    const all = board ? Core.rank(board, course) : [];
    const filtered = all.filter(entry => entry.login.toLowerCase().includes(search.value.trim().toLowerCase()));
    page = Math.min(page, Math.max(0, Math.ceil(filtered.length / size) - 1));
    rows.replaceChildren();
    for (const entry of filtered.slice(page * size, (page + 1) * size)) {
      const row = document.createElement('tr');
      const values = [String(entry.rank), link(entry.login, `https://github.com/${entry.login}`), `${entry.score} / ${entry.maxScore}`, `${entry.passed} / ${entry.total}`, link(entry.repository.split('/')[1], `https://github.com/${entry.repository}`), new Date(entry.checkedAt).toLocaleString('ko-KR'), link('검증 기록 ↗', `https://github.com/${platform}/actions/runs/${entry.runId}`)];
      for (const value of values) { const td = document.createElement('td'); if (typeof value === 'string') td.textContent = value; else td.append(value); row.append(td); }
      const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary-button leaderboard-detail-button';
      button.textContent = '채점 상세'; button.dataset.detailsUser = entry.userId;
      button.setAttribute('aria-label', `${entry.login} 채점 상세`); button.setAttribute('aria-controls', 'leaderboardDetails');
      button.addEventListener('click', () => showDetails(entry)); row.lastChild.append(document.createElement('br'), button);
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
    const deleteUrl = new URL(`https://github.com/${platform}/issues/new`);
    deleteUrl.searchParams.set('template', 'leaderboard-delete.yml');
    deleteUrl.searchParams.set('title', `[Leaderboard] ${courseSelect.value} 내 기록 삭제`);
    deleteUrl.searchParams.set('action', 'delete'); deleteUrl.searchParams.set('course', courseSelect.value);
    const deleteLink = document.getElementById('leaderboardDelete'); deleteLink.href = deleteUrl.href;
    deleteLink.textContent = `GitHub에서 내 ${Core.COURSES[courseSelect.value].title} 기록 삭제 요청 ↗`;
    return Boolean(name);
  }
  submit.addEventListener('click', event => {
    const consent = document.getElementById('leaderboardConsent');
    consent.setCustomValidity(consent.checked ? '' : '공개 등록에 동의한 경우에만 제출할 수 있습니다.');
    if (!consent.checked) { event.preventDefault(); consent.reportValidity(); return; }
    if (!updateSubmission()) { event.preventDefault(); repositoryInput.reportValidity(); } });
  document.getElementById('leaderboardConsent').addEventListener('change', event => event.target.setCustomValidity(''));
  repositoryInput.addEventListener('input', () => { document.getElementById('leaderboardConsent').checked = false; updateSubmission(); });
  courseSelect.addEventListener('change', () => { document.getElementById('leaderboardConsent').checked = false; updateSubmission(); });
  section.querySelectorAll('[data-board-course]').forEach(button => button.addEventListener('click', () => { document.getElementById('leaderboardConsent').checked = false; course = button.dataset.boardCourse; courseSelect.value = course; page = 0; updateSubmission(); render(); }));
  document.querySelectorAll('[data-submit-course]').forEach(button => button.addEventListener('click', () => {
    document.getElementById('leaderboardConsent').checked = false;
    course = button.dataset.submitCourse; courseSelect.value = course;
    repositoryInput.value = document.getElementById(course === 'basic' ? 'repoUrl' : 'scenarioRepoUrl').value;
    page = 0; updateSubmission(); render();
  }));
  search.addEventListener('input', () => { page = 0; render(); });
  previous.addEventListener('click', () => { page--; render(); }); next.addEventListener('click', () => { page++; render(); });
  refresh.addEventListener('click', load);
  updateSubmission(); render(); load();
})();
