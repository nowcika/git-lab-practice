const $ = (id) => document.getElementById(id);
const fields = ['gitVersion', 'username', 'repoUrl'];
const guideIds = ['install', 'account', 'repo', 'readme', 'commits', 'branch', 'issue', 'pr'];
const labels = [
  ['Git 설치 출력', 10], ['GitHub 계정', 10], ['공개 저장소', 15],
  ['README와 지정 문구', 15], ['기본 브랜치 커밋 2개', 15],
  ['practice/feature 브랜치', 15], ['학습 계획 이슈', 10],
  ['practice/feature PR', 10]
];
let lastReport = null;

for (const id of fields) {
  $(id).value = localStorage.getItem(`gitlab:${id}`) || '';
  $(id).addEventListener('input', () => localStorage.setItem(`gitlab:${id}`, $(id).value));
}
document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(button.dataset.copy); button.textContent = '복사됨'; }
  catch { button.textContent = '복사 실패'; }
  setTimeout(() => { button.textContent = '복사'; }, 1800);
}));

function parseRepo(value) {
  try {
    const url = new URL(value.trim());
    if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase()) || url.protocol !== 'https:') return null;
    const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (parts.length !== 2) return null;
    const [owner, name] = parts;
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(owner) || !/^[\w.-]+$/i.test(name)) return null;
    return { owner, name: name.replace(/\.git$/i, '') };
  } catch { return null; }
}

async function api(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  });
  if (!response.ok) {
    if (response.status === 404) return { missing: true };
    if (response.status === 403 || response.status === 429) throw new Error('GitHub API 요청 한도에 도달했습니다. 잠시 후 다시 시도하세요.');
    throw new Error(`GitHub API 오류 (${response.status})`);
  }
  return response.json();
}

const passed = (detail) => ({ state: 'pass', detail });
const failed = (detail) => ({ state: 'fail', detail });
const unknown = (detail) => ({ state: 'unknown', detail });
async function assess(task) {
  try { return await task(); }
  catch (error) { return unknown(error.message || '네트워크 연결을 확인한 뒤 다시 채점하세요.'); }
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
  status.textContent = 'GitHub 공개 결과를 확인하는 중입니다…';
  $('results').hidden = true;
  const base = `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}`;
  const checks = Array(8);
  let defaultBranch = "main";
  checks[0] = /^git version \d+\.\d+(?:\.\d+)?(?:[\w.+-]*)$/i.test(version)
    ? passed(`제출한 버전 출력: ${version}`)
    : failed('터미널에서 git --version을 실행하고 출력 결과를 입력하세요.');
  const user = await assess(async () => {
    const data = await api(`/users/${encodeURIComponent(username)}`);
    return data.missing ? failed('해당 사용자 이름의 공개 프로필을 찾지 못했습니다.') : passed(`공개 프로필 확인: @${data.login}`);
  });
  checks[1] = user;
  const repoCheck = await assess(async () => {
    const data = await api(base);
    if (data.missing) return failed('저장소를 찾지 못했습니다. 공개 설정과 URL을 확인하세요.');
    if (data.private) return failed('공개 저장소로 설정하세요.');
    if (data.owner?.login?.toLowerCase() !== username.toLowerCase()) return failed('입력한 사용자 계정이 소유한 저장소를 입력하세요.');
    defaultBranch = data.default_branch || "main";
    return passed(`공개 저장소 확인: ${data.full_name}`);
  });
  checks[2] = repoCheck;
  if (repoCheck.state === 'pass') {
    const tasks = [
      async () => {
        const data = await api(`${base}/contents/README.md`);
        if (data.missing || Array.isArray(data) || !data.content) return failed('기본 브랜치의 루트에 README.md를 추가하세요.');
        const bytes = Uint8Array.from(atob(data.content.replace(/\s/g, '')), c => c.charCodeAt(0));
        const content = new TextDecoder().decode(bytes);
        const marker = `git-lab-${username}`.toLowerCase();
        return content.toLowerCase().includes(marker)
          ? passed(`README.md에서 ${marker} 문구 확인`)
          : failed(`README.md에 ${marker} 문구를 추가하세요.`);
      },
      async () => {
        const data = await api(`${base}/commits?per_page=2`);
        if (data.missing || !Array.isArray(data)) return failed('기본 브랜치의 커밋을 확인할 수 없습니다.');
        return data.length >= 2 ? passed('기본 브랜치에서 커밋 2개 이상 확인') : failed('기본 브랜치에 서로 다른 변경을 두 번 커밋하고 푸시하세요.');
      },
      async () => {
        const data = await api(`${base}/branches/${encodeURIComponent('practice/feature')}`);
        return data.missing ? failed('practice/feature 브랜치를 GitHub에 푸시하세요.') : passed('practice/feature 브랜치 확인');
      },
      async () => {
        const data = await api(`${base}/issues?state=all&per_page=100`);
        if (data.missing || !Array.isArray(data)) return failed('이슈를 확인할 수 없습니다.');
        const item = data.find(issue => !issue.pull_request && issue.title.includes('학습 계획'));
        return item ? passed(`이슈 #${item.number}: ${item.title}`) : failed('제목에 ‘학습 계획’이 들어간 이슈를 만드세요.');
      },
      async () => {
        const data = await api(`${base}/pulls?state=all&per_page=100`);
        if (data.missing || !Array.isArray(data)) return failed('PR을 확인할 수 없습니다.');
        const item = data.find(pr => pr.head?.ref === 'practice/feature' && pr.base?.ref === defaultBranch);
        return item ? passed(`PR #${item.number}: ${item.title}`) : failed('practice/feature에서 기본 브랜치로 PR을 만드세요.');
      }
    ];
    const rest = await Promise.all(tasks.map(assess));
    rest.forEach((result, index) => { checks[index + 3] = result; });
  } else {
    for (let index = 3; index < 8; index++) checks[index] = unknown('저장소 확인 후 평가할 수 있습니다.');
  }
  const score = checks.reduce((sum, result, index) => sum + (result.state === 'pass' ? labels[index][1] : 0), 0);
  const checkedAt = new Date().toLocaleString('ko-KR');
  lastReport = { checkedAt, username, repository: `https://github.com/${parsed.owner}/${parsed.name}`, score,
    results: checks.map((result, index) => ({ name: labels[index][0], points: labels[index][1], ...result })) };
  render(lastReport);
  status.textContent = checks.some(result => result.state === 'unknown') ? '일부 항목은 확인할 수 없었습니다. 표시된 사유를 확인하고 다시 채점하세요.' : '';
  button.disabled = false;
}

function render(report) {
  $('scoreValue').innerHTML = `${report.score}<span>/ 100</span>`;
  $('scoreMessage').textContent = report.score === 100 ? '모든 실습 목표를 달성했습니다.' : '아래 항목을 확인하고 다시 도전해 보세요.';
  $('scoreRing').style.background = `conic-gradient(var(--purple) ${report.score}%, #35435b ${report.score}%)`;
  $('scoreRingText').textContent = `${report.score}%`;
  $('resultList').replaceChildren(...report.results.map(result => {
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
        event.preventDefault(); const guide = document.getElementById(`guide-${guideIds[index]}`);
        guide.open = true; guide.scrollIntoView({ behavior:'smooth', block:'start' });
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

$('gradeButton').addEventListener('click', grade);
$('downloadButton').addEventListener('click', () => {
  if (!lastReport) return;
  const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
  link.download = `git-lab-${lastReport.username}-result.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
