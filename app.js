'use strict';
const $ = (id) => document.getElementById(id);
const fields = ['gitVersion', 'username', 'repoUrl'];
const guideIds = ['install', 'account', 'repo', 'readme', 'commits', 'branch', 'issue', 'pr'];
const labels = [
  ['Git 설치 출력', 10], ['GitHub 계정', 10], ['직접 만든 공개 저장소', 15],
  ['README와 지정 문구', 15], ['로컬에서 push한 커밋 2개', 15],
  ['practice/feature 브랜치와 변경', 15], ['내가 만든 학습 계획 이슈', 10],
  ['내가 만든 practice/feature PR', 10]
];

// GitHub 웹 편집기·API로 만든 커밋은 committer가 항상 GitHub <noreply@github.com>입니다.
// 터미널에서 git으로 push한 커밋과 구분하는 데 사용합니다.
const madeOnWeb = (commit) => commit?.commit?.committer?.email === 'noreply@github.com'
  && commit?.commit?.committer?.name === 'GitHub';
let lastReport = null;

// 선택 입력한 토큰은 탭을 닫으면 사라지는 sessionStorage에만 둡니다(localStorage 금지).
const TOKEN_KEY = 'gitlab:apiToken';
const tokenStore = {
  read() { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } },
  write(value) { try { value ? sessionStorage.setItem(TOKEN_KEY, value) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* 저장 불가 환경 */ } }
};

function restoreField(id) {
  const element = $(id);
  if (!element) return null;
  try { element.value = localStorage.getItem(`gitlab:${id}`) || ''; } catch { /* 사생활 보호 모드 */ }
  element.addEventListener('input', () => {
    try { localStorage.setItem(`gitlab:${id}`, element.value); } catch { /* 저장 불가 환경 */ }
  });
  return element;
}
for (const id of fields) restoreField(id);

const tokenInput = $('apiToken');
if (tokenInput) {
  tokenInput.value = tokenStore.read();
  tokenInput.addEventListener('input', () => tokenStore.write(tokenInput.value.trim()));
}

document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(button.dataset.copy); button.textContent = '복사됨'; }
  catch { button.textContent = '복사 실패'; }
  setTimeout(() => { button.textContent = '복사'; }, 1800);
}));

function parseRepo(value) {
  try {
    const url = new URL(String(value).trim());
    if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase()) || url.protocol !== 'https:') return null;
    // 자격 증명이 들어간 주소는 받지 않습니다(로컬 검증기의 parseGitHub와 동일 기준).
    if (url.username || url.password) return null;
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (parts.length < 2) return null;
    // .../tree/main 처럼 뒤에 경로가 붙어도 앞의 소유자/저장소만 사용합니다.
    const [owner, rawName] = parts;
    const name = rawName.replace(/\.git$/i, '');
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(owner)) return null;
    if (!/^[\w.-]+$/.test(name) || name === '.' || name === '..') return null;
    return { owner, name };
  } catch { return null; }
}

class RateLimitError extends Error {}

const apiCache = new Map();
let apiCalls = 0;
function resetApiUsage() { apiCache.clear(); apiCalls = 0; }

function describeReset(response) {
  const reset = Number(response.headers.get('x-ratelimit-reset'));
  if (!Number.isFinite(reset) || reset <= 0) return '';
  const minutes = Math.max(1, Math.ceil((reset * 1000 - Date.now()) / 60000));
  return ` 약 ${minutes}분 뒤(${new Date(reset * 1000).toLocaleTimeString('ko-KR')})에 한도가 초기화됩니다.`;
}

async function api(path) {
  if (apiCache.has(path)) return apiCache.get(path);
  const token = tokenStore.read();
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  apiCalls += 1;
  try {
    response = await fetch(`https://api.github.com${path}`, { headers });
  } catch {
    throw new Error('GitHub에 연결하지 못했습니다. 인터넷 연결이나 사내 방화벽 설정을 확인하세요.');
  }
  if (!response.ok) {
    if (response.status === 404) { apiCache.set(path, { missing: true }); return { missing: true }; }
    if (response.status === 401) throw new Error('입력한 토큰이 유효하지 않습니다. 토큰을 지우거나 다시 발급하세요.');
    if (response.status === 403 || response.status === 429) {
      throw new RateLimitError(`GitHub API 요청 한도에 도달했습니다.${describeReset(response)} 토큰을 입력하면 한도가 시간당 5,000회로 늘어납니다.`);
    }
    throw new Error(`GitHub API 오류 (${response.status})`);
  }
  const data = await response.json();
  apiCache.set(path, data);
  return data;
}

// 채점을 시작하기 전에 남은 한도를 확인합니다. 이 조회는 한도를 소모하지 않습니다.
async function checkQuota(required) {
  try {
    const token = tokenStore.read();
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch('https://api.github.com/rate_limit', { headers });
    if (!response.ok) return null;
    const core = (await response.json())?.resources?.core;
    if (!core) return null;
    const minutes = Math.max(1, Math.ceil((core.reset * 1000 - Date.now()) / 60000));
    return { remaining: core.remaining, limit: core.limit, minutes, enough: core.remaining >= required };
  } catch { return null; }
}

const passed = (detail) => ({ state: 'pass', detail });
const failed = (detail) => ({ state: 'fail', detail });
const unknown = (detail) => ({ state: 'unknown', detail });
async function assess(task) {
  try { return await task(); }
  catch (error) {
    if (error instanceof RateLimitError) throw error;
    return unknown(error.message || '네트워크 연결을 확인한 뒤 다시 채점하세요.');
  }
}

function decodeContent(data) {
  // 1MB를 넘는 파일은 content가 비어 오므로 "파일 없음"과 구분해야 합니다.
  if (!data || data.missing) return { state: 'missing' };
  if (Array.isArray(data)) return { state: 'directory' };
  if (!data.content || data.encoding !== 'base64') return { state: 'too-large' };
  const bytes = Uint8Array.from(atob(data.content.replace(/\s/g, '')), c => c.charCodeAt(0));
  return { state: 'ok', text: new TextDecoder().decode(bytes) };
}

async function grade() {
  const button = $('gradeButton');
  const username = $('username').value.trim();
  const version = $('gitVersion').value.trim();
  const parsed = parseRepo($('repoUrl').value);
  const status = $('status');
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
    status.textContent = 'GitHub 사용자 이름을 정확히 입력하세요.';
    $('username').focus(); return;
  }
  if (!parsed) {
    status.textContent = '공개 저장소 URL을 https://github.com/사용자/저장소 형식으로 입력하세요.';
    $('repoUrl').focus(); return;
  }
  button.disabled = true;
  resetApiUsage();
  status.textContent = 'GitHub 공개 결과를 확인하는 중입니다…';
  $('results').hidden = true;
  try {
    const quota = await checkQuota(8);
    if (quota && !quota.enough) {
      status.textContent = `GitHub API 남은 한도가 ${quota.remaining}회뿐입니다(채점 1회에 약 8회 필요). 약 ${quota.minutes}분 뒤에 다시 시도하거나 아래 토큰 칸을 채우세요.`;
      return;
    }
    const base = `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}`;
    const checks = Array(8);
    let defaultBranch = 'main';
    // macOS 기본 git은 "git version 2.39.5 (Apple Git-154)"처럼 괄호 설명을 덧붙입니다.
    checks[0] = /^git version \d+\.\d+(?:\.\d+)?[\w.+-]*(?:\s+\(.+\))?$/i.test(version)
      ? passed(`제출한 버전 출력: ${version}`)
      : failed('터미널에서 git --version을 실행하고 출력 결과를 그대로 붙여넣으세요.');
    checks[1] = await assess(async () => {
      const data = await api(`/users/${encodeURIComponent(username)}`);
      return data.missing ? failed('해당 사용자 이름의 공개 프로필을 찾지 못했습니다.') : passed(`공개 프로필 확인: @${data.login}`);
    });
    const repoCheck = await assess(async () => {
      const data = await api(base);
      if (data.missing) return failed('저장소를 찾지 못했습니다. 공개 설정과 URL을 확인하세요.');
      if (data.private) return failed('공개 저장소로 설정하세요.');
      if (data.owner?.login?.toLowerCase() !== username.toLowerCase()) return failed('입력한 사용자 계정이 소유한 저장소를 입력하세요.');
      if (data.fork) return failed('Fork한 저장소는 인정하지 않습니다. 직접 새로 만든 저장소를 사용하세요.');
      defaultBranch = data.default_branch || 'main';
      return passed(`공개 저장소 확인: ${data.full_name}`);
    });
    checks[2] = repoCheck;
    if (repoCheck.state === 'pass') {
      const tasks = [
        async () => {
          const file = decodeContent(await api(`${base}/contents/README.md`));
          if (file.state === 'directory') return failed('README.md가 폴더로 되어 있습니다. 파일로 만드세요.');
          if (file.state === 'too-large') return unknown('README.md가 너무 커서(1MB 초과) 내용을 확인할 수 없습니다.');
          if (file.state === 'missing') return failed('기본 브랜치의 루트에 README.md를 추가하세요.');
          const marker = `git-lab-${username}`.toLowerCase();
          return file.text.toLowerCase().includes(marker)
            ? passed(`README.md에서 ${marker} 문구 확인`)
            : failed(`README.md에 ${marker} 문구를 추가하세요.`);
        },
        async () => {
          const data = await api(`${base}/commits?per_page=20`);
          if (data.missing || !Array.isArray(data)) return failed('기본 브랜치의 커밋을 확인할 수 없습니다.');
          if (data.length < 2) return failed('기본 브랜치에 서로 다른 변경을 두 번 커밋하고 푸시하세요.');
          // 빈 커밋으로 개수만 늘린 제출을 막기 위해 커밋이 가리키는 트리가 서로 다른지 확인합니다.
          const trees = new Set(data.map(c => c.commit?.tree?.sha).filter(Boolean));
          if (trees.size < 2) return failed('커밋은 2개지만 파일 내용이 바뀌지 않았습니다. 실제 변경을 담아 다시 커밋하세요.');
          // 이 과정의 목적은 로컬 Git 사용입니다. 웹 편집기로만 만든 커밋은 인정하지 않습니다.
          const local = data.filter(c => !madeOnWeb(c));
          if (local.length < 2) {
            return failed(`GitHub 웹 편집기로 만든 커밋만 있습니다(로컬 커밋 ${local.length}개). 터미널에서 git commit 후 git push로 두 번 올리세요.`);
          }
          return passed(`로컬에서 push한 커밋 ${local.length}개 확인 (서로 다른 내용)`);
        },
        async () => {
          // compare는 브랜치 존재 여부와 "앞선 커밋 수"를 한 번에 알려 줍니다.
          const data = await api(`${base}/compare/${encodeURIComponent(defaultBranch)}...${encodeURIComponent('practice/feature')}`);
          if (data.missing) return failed('practice/feature 브랜치를 GitHub에 푸시하세요.');
          if (!(data.ahead_by > 0)) return failed('practice/feature가 기본 브랜치와 같습니다. 브랜치에서 파일을 수정해 커밋하고 푸시하세요.');
          const local = (data.commits || []).filter(c => !madeOnWeb(c));
          if (!local.length) return failed('practice/feature의 커밋이 웹 편집기로 만들어졌습니다. 터미널에서 커밋해 푸시하세요.');
          return passed(`practice/feature가 기본 브랜치보다 ${data.ahead_by}커밋 앞섬`);
        },
        async () => {
          const data = await api(`${base}/issues?state=all&per_page=100`);
          if (data.missing || !Array.isArray(data)) return failed('이슈를 확인할 수 없습니다.');
          const item = data.find(issue => !issue.pull_request && issue.title.includes('학습 계획')
            && issue.user?.login?.toLowerCase() === username.toLowerCase());
          if (item) return passed(`이슈 #${item.number}: ${item.title}`);
          if (data.some(issue => !issue.pull_request && issue.title.includes('학습 계획'))) {
            return failed('제목은 맞지만 다른 계정이 만든 이슈입니다. 본인 계정으로 이슈를 만드세요.');
          }
          return data.length >= 100
            ? unknown('최근 이슈 100개에서 찾지 못했습니다. 실습용 새 저장소를 사용하세요.')
            : failed('제목에 ‘학습 계획’이 들어간 이슈를 만드세요.');
        },
        async () => {
          const data = await api(`${base}/pulls?state=all&per_page=100`);
          if (data.missing || !Array.isArray(data)) return failed('PR을 확인할 수 없습니다.');
          const item = data.find(pr => pr.head?.ref === 'practice/feature' && pr.base?.ref === defaultBranch
            && pr.head?.repo?.full_name?.toLowerCase() === `${parsed.owner}/${parsed.name}`.toLowerCase()
            && pr.user?.login?.toLowerCase() === username.toLowerCase());
          if (item) return passed(`PR #${item.number}: ${item.title}`);
          if (data.some(pr => pr.head?.ref === 'practice/feature' && pr.base?.ref === defaultBranch)) {
            return failed('방향은 맞지만 다른 계정이 만들었거나 다른 저장소의 브랜치에서 온 PR입니다.');
          }
          return data.length >= 100
            ? unknown('최근 PR 100개에서 찾지 못했습니다. 실습용 새 저장소를 사용하세요.')
            : failed('practice/feature에서 기본 브랜치로 PR을 만드세요.');
        }
      ];
      // 한도를 아끼기 위해 순서대로 실행하고, 한도 초과가 나오면 즉시 멈춥니다.
      for (let index = 0; index < tasks.length; index++) checks[index + 3] = await assess(tasks[index]);
    } else {
      for (let index = 3; index < 8; index++) checks[index] = unknown('저장소 확인 후 평가할 수 있습니다.');
    }
    const score = checks.reduce((sum, result, index) => sum + (result.state === 'pass' ? labels[index][1] : 0), 0);
    const checkedAt = new Date().toLocaleString('ko-KR');
    lastReport = { checkedAt, username, repository: `https://github.com/${parsed.owner}/${parsed.name}`, score,
      results: checks.map((result, index) => ({ name: labels[index][0], points: labels[index][1], ...result })) };
    render(lastReport);
    status.textContent = checks.some(result => result.state === 'unknown')
      ? '일부 항목은 확인할 수 없었습니다. 표시된 사유를 확인하고 다시 채점하세요.'
      : `채점을 마쳤습니다. (GitHub API ${apiCalls}회 사용)`;
  } catch (error) {
    status.textContent = error.message || '채점 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.';
  } finally {
    button.disabled = false;
  }
}

function render(report) {
  $('scoreValue').innerHTML = `${report.score}<span>/ 100</span>`;
  $('scoreMessage').textContent = report.score === 100 ? '모든 실습 목표를 달성했습니다.' : '아래 항목을 확인하고 다시 도전해 보세요.';
  $('scoreRing').style.background = `conic-gradient(var(--purple) ${report.score}%, #35435b ${report.score}%)`;
  $('scoreRingText').textContent = `${report.score}%`;
  $('resultList').replaceChildren(...report.results.map((result, index) => {
    const row = document.createElement('div'); row.className = 'result-item';
    const mark = document.createElement('span'); mark.className = `result-mark ${result.state}`;
    mark.textContent = result.state === 'pass' ? '✓' : result.state === 'fail' ? '×' : '?';
    const body = document.createElement('div'); const name = document.createElement('strong');
    const detail = document.createElement('p'); name.textContent = result.name; detail.textContent = result.detail;
    body.append(name, detail);
    if (result.state !== 'pass') {
      const link = document.createElement('a'); link.className = 'result-guide';
      link.href = guideIds[index] === 'install' ? '#manual-git' : guideIds[index] === 'account' ? '#manual-github' : `#guide-${guideIds[index]}`;
      link.textContent = '해결 가이드 보기 ↑';
      link.addEventListener('click', (event) => {
        if (guideIds[index] === 'install' || guideIds[index] === 'account') return;
        const guide = document.getElementById(`guide-${guideIds[index]}`);
        if (!guide) return;
        event.preventDefault();
        guide.open = true; guide.scrollIntoView({ behavior: 'smooth', block: 'start' });
        guide.classList.remove('flash'); requestAnimationFrame(() => guide.classList.add('flash'));
      });
      body.append(link);
    }
    const points = document.createElement('b'); points.textContent = `${result.state === 'pass' ? result.points : 0} / ${result.points}점`;
    row.append(mark, body, points); return row;
  }));
  $('checkedAt').textContent = `채점 시각: ${report.checkedAt}`;
  $('results').hidden = false;
}

$('gradeButton')?.addEventListener('click', grade);
$('downloadButton')?.addEventListener('click', () => {
  if (!lastReport) return;
  const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
  link.download = `git-lab-${lastReport.username}-result.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
