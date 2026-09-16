const guides = [
  { id:'repo', no:'01', title:'공개 저장소 만들고 연결하기', sub:'저장소 URL·권한·push 오류 확인', steps:[
    'GitHub의 <a href="https://github.com/new" target="_blank" rel="noopener noreferrer">New repository</a>에서 소유자를 본인 계정으로 선택하고 <strong>Public</strong>으로 만듭니다. 이 실습에서는 README 자동 생성을 끄세요.',
    'PC에 새 폴더를 만들고 터미널에서 해당 폴더로 이동한 뒤 아래 명령을 실행합니다. 첫 커밋을 만든 후 push할 수 있습니다.',
    'GitHub 저장소 첫 화면의 URL을 위 입력칸에 넣습니다. <code>/tree/main</code> 같은 뒤쪽 경로는 제외합니다.'
  ], cmd:'git init -b main\ngit remote add origin https://github.com/사용자이름/저장소이름.git\ngit remote -v\n# 첫 커밋을 만든 뒤\ngit push -u origin main', success:'본인 계정 소유의 공개 저장소와 기본 브랜치가 GitHub에서 열립니다.', trouble:[
    '<code>src refspec main does not match any</code>: 첫 커밋이 없는지 <code>git log -1</code>로 확인하세요.',
    '<code>remote origin already exists</code>: <code>git remote -v</code>로 주소를 확인하고, 틀렸으면 <code>git remote set-url origin URL</code>로 고칩니다.',
    '<code>non-fast-forward</code>: GitHub에서 README를 자동 생성했다면 원격에 이미 커밋이 있습니다. 기존 저장소를 clone해 작업하거나 원격 변경을 먼저 가져오세요.',
    '404 또는 0점: URL 오타, Private 설정, 다른 계정 소유 여부를 확인하세요.'
  ]},
  { id:'readme', no:'02', title:'README에 학습 목표 기록하기', sub:'파일 위치·지정 문구·기본 브랜치 확인', steps:[
    '프로젝트 최상위에 이름이 정확히 <code>README.md</code>인 파일을 만듭니다.',
    '학습 목표를 적고 별도 줄에 <code>git-lab-사용자이름</code>을 넣습니다. 사용자이름은 위에 입력한 GitHub 이름으로 바꿉니다.',
    '저장 후 <code>git add README.md</code>, commit, push를 차례로 실행합니다.'
  ], cmd:'# README.md 내용 예시\n# 나의 Git 학습 목표\n브랜치를 만들어 변경 사항을 안전하게 제안한다.\ngit-lab-사용자이름\n\ngit add README.md\ngit commit -m "docs: add learning goal"\ngit push', success:'기본 브랜치의 루트 README.md에서 지정 문구가 보입니다.', trouble:[
    '<code>readme.txt</code>나 하위 폴더의 README는 대상이 아닙니다. 파일 이름과 위치를 확인하세요.',
    '문구의 ‘사용자이름’을 실제 GitHub 사용자 이름으로 바꾸었는지 확인하세요. 대소문자는 상관없습니다.',
    '<code>git status</code>에 변경이 남아 있거나 로컬에만 커밋했다면 GitHub에 보이지 않습니다. push 결과를 확인하세요.',
    '다른 브랜치에서만 수정했다면 기본 브랜치에 반영되기 전까지 통과하지 않습니다.'
  ]},
  { id:'commits', no:'03', title:'기본 브랜치에 커밋 두 개 만들기', sub:'커밋 수·작업 브랜치·push 상태 확인', steps:[
    '<code>git branch --show-current</code>로 기본 브랜치에서 작업 중인지 확인합니다.',
    '첫 커밋은 README 작성, 두 번째는 새 파일 생성이나 README 내용 추가처럼 다른 변경으로 만듭니다.',
    '<code>git log --oneline -2</code>에서 두 커밋을 확인하고 push합니다.'
  ], cmd:'git status\ngit add README.md\ngit commit -m "docs: add learning goal"\n# 파일을 한 번 더 수정한 뒤\ngit add .\ngit commit -m "docs: update learning log"\ngit log --oneline -2\ngit push', success:'GitHub의 기본 브랜치에서 커밋이 두 개 이상 보입니다.', trouble:[
    '<code>nothing to commit</code>: 이전 커밋 이후 실제 파일 변경이 없습니다. 파일을 수정하고 <code>git status</code>를 확인하세요.',
    '<code>Author identity unknown</code>: <code>git config --global user.name "이름"</code>과 <code>git config --global user.email "이메일"</code>을 설정하세요.',
    '로컬 로그에만 두 개가 보이면 <code>git push</code>와 GitHub의 기본 브랜치 커밋 목록을 확인하세요.',
    '새 브랜치의 커밋은 이 항목에 포함되지 않습니다.'
  ]},
  { id:'branch', no:'04', title:'practice/feature 브랜치 만들기', sub:'로컬 브랜치와 원격 브랜치 구별', steps:[
    '기본 브랜치의 두 커밋을 push한 뒤 <code>git switch -c practice/feature</code>를 실행합니다.',
    '<code>git branch --show-current</code>로 이름이 정확한지 확인합니다.',
    '파일을 수정해 커밋하고 <code>git push -u origin practice/feature</code>로 올립니다. 이 변경이 PR 과제의 재료가 됩니다.'
  ], cmd:'git switch -c practice/feature\n# 파일 수정 후\ngit add .\ngit commit -m "feat: add practice note"\ngit push -u origin practice/feature', success:'GitHub의 Branches 목록에 practice/feature가 표시됩니다.', trouble:[
    '<code>git branch</code>에만 있고 GitHub에는 없으면 아직 push하지 않은 상태입니다.',
    '<code>branch already exists</code>: <code>git switch practice/feature</code>로 이동하세요.',
    '<code>feature</code>처럼 이름이 다르면 채점하지 않습니다. 정확한 이름을 사용하세요.',
    'PR 병합 후 브랜치를 삭제했다면 다시 실패할 수 있으므로 평가 전까지 유지하세요.'
  ]},
  { id:'issue', no:'05', title:'학습 계획 이슈 만들기', sub:'이슈 제목·저장소·기능 활성화 확인', steps:[
    '채점할 저장소의 <strong>Issues → New issue</strong>를 엽니다.',
    '제목에 <code>학습 계획</code>을 그대로 포함하고, 본문에는 앞으로 연습할 기능을 적습니다.',
    '제출 후 이슈 번호와 제목을 확인합니다. 열린 이슈와 닫힌 이슈 모두 인정합니다.'
  ], success:'해당 저장소에 제목에 ‘학습 계획’이 들어간 이슈가 있습니다.', trouble:[
    'Issues 탭이 없으면 <strong>Settings → General → Features</strong>에서 Issues가 켜져 있는지 확인하세요.',
    '다른 저장소에 만들었거나 PR 제목에만 문구를 적으면 통과하지 않습니다.',
    '본문에만 문구가 있으면 실패합니다. 이슈 제목을 확인하세요.',
    '이슈가 100개 넘는 저장소에서는 최근 100개만 조회하므로 실습용 새 저장소를 권장합니다.'
  ]},
  { id:'pr', no:'06', title:'Pull Request 열기', sub:'비교할 변경·base/head·브랜치 확인', steps:[
    '<code>practice/feature</code>에서 기본 브랜치에 없는 변경을 커밋하고 push합니다.',
    'GitHub의 <strong>Pull requests → New pull request</strong>에서 <strong>base</strong>는 기본 브랜치, <strong>compare</strong>는 <code>practice/feature</code>로 선택합니다.',
    '변경 파일을 확인하고 제목과 설명을 작성한 뒤 <strong>Create pull request</strong>를 누릅니다. 열린 PR과 병합된 PR 모두 인정합니다.'
  ], success:'practice/feature에서 기본 브랜치로 향하는 PR이 저장소에 있습니다.', trouble:[
    '<code>There isn’t anything to compare</code>: 두 브랜치에 차이가 없습니다. 새 브랜치에서 파일을 수정해 commit과 push를 하세요.',
    'base와 compare를 반대로 선택하면 채점하지 않습니다. PR 화면에서 방향을 확인하세요.',
    '다른 저장소에 만들었거나 브랜치를 GitHub에 push하지 않았으면 찾을 수 없습니다.',
    'PR이 100개 넘는 저장소에서는 최근 100개만 확인합니다.'
  ]}
];

const guideRoot = document.getElementById('guides');
if (guideRoot) {
  guideRoot.innerHTML = `<div class="guide-heading"><h3>과제별 실행 가이드</h3><p>과정을 따라 하고, 막히면 ‘안될 때 확인’을 살펴보세요.</p></div><div class="guide-list">${guides.map(g => `
    <details class="guide" id="guide-${g.id}"><summary><span>${g.no}</span><strong>${g.title}</strong><small>${g.sub}</small></summary>
    <div class="guide-body"><div><h4>따라 하기</h4><ol>${g.steps.map(x=>`<li>${x}</li>`).join('')}</ol>${g.cmd ? `<pre><code>${g.cmd}</code><button class="copy-block" type="button">전체 복사</button></pre>` : ''}<p class="guide-success">✓ 성공 기준: ${g.success}</p></div>
    <div class="trouble"><h4>안될 때 확인</h4><ul>${g.trouble.map(x=>`<li>${x}</li>`).join('')}</ul></div></div></details>`).join('')}</div>`;
  guideRoot.querySelectorAll('.copy-block').forEach(button => button.addEventListener('click', async () => {
    const value = button.previousElementSibling.textContent;
    try { await navigator.clipboard.writeText(value); button.textContent='복사됨'; } catch { button.textContent='복사 실패'; }
    setTimeout(() => button.textContent='전체 복사', 1500);
  }));
}
