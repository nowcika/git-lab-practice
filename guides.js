const setupRoot = document.getElementById('setupManual');
if (setupRoot) setupRoot.innerHTML = `
<div class="manual-heading"><span class="eyebrow">SCREEN GUIDE</span><h3>설치·가입 화면 매뉴얼</h3><p>화면 속 번호를 확인하면서 순서대로 진행하세요. 비밀번호, 인증 코드, 복구 코드는 누구에게도 공유하지 마세요.</p></div>
<article class="manual" id="manual-git"><div class="manual-title"><div><span class="manual-num">A</span><h3>Git 설치하기</h3></div><a href="https://git-scm.com/install/" target="_blank" rel="noopener noreferrer">공식 설치 페이지 열기 ↗</a></div>
<div class="manual-shot"><img src="assets/git-install.png" alt="Git 공식 운영체제 선택 화면"><i class="pin install-p1">1</i><i class="pin install-p2">2</i><i class="pin install-p3">3</i></div>
<div class="manual-callouts"><span><b>1</b><strong>Windows</strong>회사·교육장 PC 대부분은 이 메뉴를 선택합니다.</span><span><b>2</b><strong>macOS</strong>MacBook 또는 iMac 사용자는 이 메뉴를 선택합니다.</span><span><b>3</b><strong>Linux</strong>Ubuntu·Fedora 등 배포판별 명령을 확인합니다.</span></div>
<div class="os-guides">
<details open><summary>Windows 설치 <small>처음 설치할 때 권장</small></summary><div><ol><li>공식 Windows 페이지에서 PC에 맞는 설치 파일을 받습니다. 대부분의 Intel·AMD PC는 <strong>x64 Setup</strong>, ARM 기반 PC만 <strong>ARM64 Setup</strong>입니다.</li><li>다운로드한 설치 파일을 실행합니다. Windows의 변경 허용 질문이 나오면 게시자가 Git for Windows인지 확인하고 허용합니다.</li><li>수업용 기본 설치에서는 구성 요소, 기본 편집기, PATH, HTTPS, 줄바꿈 등의 옵션을 이해하지 못한다면 설치 프로그램의 기본값을 유지해도 됩니다.</li><li>설치 완료 후 기존 터미널을 닫고 <strong>Git Bash</strong> 또는 PowerShell을 새로 엽니다.</li><li><code>git --version</code>을 실행합니다. 이어서 아래 사용자 정보를 본인 값으로 설정합니다.</li></ol><div class="manual-shot inline-shot"><img src="assets/git-windows.png" alt="Git for Windows 공식 다운로드 화면"><i class="pin win-p1">1</i><i class="pin win-p2">2</i></div><div class="inline-caption"><span><b>1</b> 일반적인 Windows PC는 최신 x64 설치 파일</span><span><b>2</b> 명령 설치를 선호하면 화면의 winget 명령</span></div><pre><code>git --version
git config --global user.name "홍길동"
git config --global user.email "GitHub에 등록한 이메일"
git config --global --list</code></pre><div class="manual-check"><strong>완료 확인</strong><code>git version 2.x.x</code>가 나오고 마지막 명령에서 이름과 이메일을 찾을 수 있어야 합니다.</div><div class="manual-error"><strong>문제 해결</strong><span>‘git을 찾을 수 없음’ → 터미널을 완전히 다시 열기 → 그래도 안 되면 Git 재설치 시 PATH 옵션 확인</span><span>설치 파일 실행 차단 → 공식 git-scm.com에서 받은 파일인지 확인하고 조직 PC라면 관리자에게 설치 요청</span><span>잘못된 이름·이메일 → 같은 config 명령을 올바른 값으로 다시 실행</span></div></div></details>
<details><summary>macOS 설치 <small>Command Line Tools 또는 Homebrew</small></summary><div><ol><li><strong>가장 간단한 방법:</strong> Terminal 앱에서 <code>xcode-select --install</code>을 실행하고 설치 창을 완료합니다.</li><li>Homebrew를 이미 사용한다면 <code>brew install git</code>으로 설치할 수도 있습니다.</li><li>Terminal을 새로 열어 <code>git --version</code>으로 확인한 뒤 사용자 이름과 이메일을 Windows 안내와 같은 명령으로 설정합니다.</li></ol><pre><code>xcode-select --install
# Homebrew 사용자는 다음 방법도 가능
brew install git
git --version</code></pre><div class="manual-error"><strong>문제 해결</strong><span><code>xcode-select: error</code> → macOS 업데이트 상태와 인터넷 연결을 확인한 뒤 다시 실행</span><span>Homebrew 명령 없음 → Homebrew가 없는 상태이므로 Command Line Tools 방식을 사용</span></div></div></details>
<details><summary>Linux 설치 <small>Ubuntu·Debian·Fedora</small></summary><div><ol><li>터미널을 열고 배포판에 맞는 패키지 관리 명령을 실행합니다.</li><li>관리자 암호 입력 중에는 화면에 글자가 표시되지 않을 수 있지만 정상입니다.</li><li>설치 후 버전과 사용자 정보를 확인합니다.</li></ol><pre><code># Ubuntu / Debian
sudo apt update
sudo apt install git

# Fedora
sudo dnf install git

git --version</code></pre><div class="manual-error"><strong>문제 해결</strong><span>권한 오류 → sudo 권한이 있는 계정인지 관리자에게 확인</span><span>패키지를 찾지 못함 → 저장소 목록 업데이트와 배포판 이름 확인</span></div></div></details></div></article>
<article class="manual" id="manual-github"><div class="manual-title"><div><span class="manual-num">B</span><h3>GitHub 개인 계정 만들기</h3></div><a href="https://github.com/signup" target="_blank" rel="noopener noreferrer">가입 화면 열기 ↗</a></div>
<div class="manual-shot signup-shot"><img src="assets/github-signup.png" alt="GitHub 가입 화면"><i class="pin signup-p1">1</i><i class="pin signup-p2">2</i><i class="pin signup-p3">3</i></div>
<div class="manual-callouts"><span><b>1</b><strong>가입 방법</strong>이메일로 가입하거나 Google·Apple 계정을 선택합니다.</span><span><b>2</b><strong>입력·계속</strong>안내에 따라 이메일, 암호, 사용자 이름을 정합니다.</span><span><b>3</b><strong>이미 계정이 있다면</strong>새로 만들지 말고 Sign in으로 로그인합니다.</span></div>
<div class="account-steps"><section><span>01</span><div><h4>가입 방식 선택</h4><p>이메일로 가입하거나 지원되는 Google·Apple 로그인을 선택합니다. 교육용 계정 정책이 있다면 강사의 안내를 우선합니다.</p></div></section><section><span>02</span><div><h4>이메일과 강한 암호 입력</h4><p>본인이 메일을 받을 수 있는 주소를 사용합니다. 다른 사이트와 겹치지 않는 긴 암호를 사용하고 화면에 암호를 공유하지 않습니다.</p></div></section><section><span>03</span><div><h4>사용자 이름 정하기</h4><p>사용자 이름은 프로필 주소 <code>github.com/사용자이름</code>과 커밋·저장소에 공개됩니다. 표시 이름과 다르며 이 실습의 채점 입력값으로 사용됩니다.</p></div></section><section><span>04</span><div><h4>사람 확인과 이메일 인증</h4><p>화면의 CAPTCHA를 완료하고 GitHub가 보낸 인증 메일의 링크 또는 코드를 사용합니다. 이메일 인증 전에는 저장소 생성 같은 기본 기능이 제한될 수 있습니다.</p></div></section><section><span>05</span><div><h4>프로필과 사용자 이름 확인</h4><p>오른쪽 위 프로필 사진 → <strong>Your profile</strong>을 열고 주소창의 사용자 이름을 확인합니다. 위 입력칸에는 이메일이나 표시 이름을 넣지 않습니다.</p></div></section><section><span>06</span><div><h4>2단계 인증 설정</h4><p>프로필 사진 → <strong>Settings → Password and authentication</strong>에서 2FA를 설정합니다. 인증 앱(TOTP)을 권장하며 복구 코드는 계정과 다른 안전한 장소에 보관합니다.</p></div></section></div>
<div class="account-trouble"><h4>가입이 안될 때 확인</h4><ul><li><strong>인증 메일이 없음:</strong> 스팸함과 입력한 주소를 확인하고 잠시 후 재전송합니다. 회사·학교 메일 필터가 차단할 수 있습니다.</li><li><strong>사용자 이름 사용 불가:</strong> 이미 사용 중이거나 규칙에 맞지 않습니다. 짧은 단어를 추가해 고유하게 만드세요.</li><li><strong>이메일이 이미 사용됨:</strong> 기존 계정으로 로그인하거나 암호 찾기를 이용합니다.</li><li><strong>채점에서 프로필을 찾지 못함:</strong> 프로필 URL의 사용자 이름을 입력하고 URL을 직접 열어 봅니다.</li><li><strong>2FA 기기 분실:</strong> 저장한 복구 코드를 사용합니다. 복구 코드는 강사나 동료에게 보내지 않습니다.</li></ul></div>
<div class="manual-links"><a href="https://docs.github.com/en/account-and-profile/how-tos/account-management/creating-an-account-on-github" target="_blank" rel="noopener noreferrer">GitHub 공식 가입 안내 ↗</a><a href="https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication" target="_blank" rel="noopener noreferrer">2단계 인증 공식 안내 ↗</a></div></article>
<p class="capture-note">화면 캡처는 2026년 9월의 공식 웹페이지 기준입니다. 서비스 업데이트로 배치나 문구가 달라질 수 있으므로 연결된 공식 페이지를 함께 확인하세요.</p>`;

const guides = [
  { id:'repo', no:'01', title:'공개 저장소 만들고 연결하기', sub:'저장소 URL·권한·push 오류 확인', steps:[
    'GitHub의 <a href="https://github.com/new" target="_blank" rel="noopener noreferrer">New repository</a>에서 소유자를 본인 계정으로 선택하고 <strong>Public</strong>으로 만듭니다. 이 실습에서는 README 자동 생성을 끄세요.',
    'PC에 새 폴더를 만들고 터미널에서 해당 폴더로 이동한 뒤 아래 명령을 실행합니다. 첫 커밋을 만든 후 push할 수 있습니다.',
    'GitHub 저장소 첫 화면의 URL을 위 입력칸에 넣습니다. <code>/tree/main</code> 같은 뒤쪽 경로는 제외합니다.'
  ], cmd:'git init -b main\ngit remote add origin https://github.com/사용자이름/저장소이름.git\ngit remote -v\n# 첫 커밋을 만든 뒤\ngit push -u origin main', success:'본인 계정 소유의 공개 저장소와 기본 브랜치가 GitHub에서 열립니다.', trouble:[
    '<code>src refspec main does not match any</code>: 첫 커밋이 없는지 <code>git log -1</code>로 확인하세요.',
    '<code>remote origin already exists</code>: <code>git remote -v</code>로 주소를 확인하고, 틀렸으면 <code>git remote set-url origin URL</code>로 고칩니다.',
    '<code>non-fast-forward</code>: GitHub에서 README를 자동 생성했다면 원격에 이미 커밋이 있습니다. 기존 저장소를 clone해 작업하거나 원격 변경을 먼저 가져오세요.',
    '404 또는 0점: URL 오타, Private 설정, 다른 계정 소유 여부를 확인하세요.',
    'Fork한 저장소는 인정하지 않습니다. <strong>New repository</strong>로 직접 만든 저장소를 사용하세요.'
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
    'GitHub 화면에서 연필 아이콘으로 편집한 커밋은 committer가 <code>GitHub</code>로 기록되어 인정되지 않습니다. 터미널에서 <code>git commit</code> 후 <code>git push</code>하세요.',
    '<code>git commit --allow-empty</code>로 개수만 늘린 커밋도 인정되지 않습니다. 실제 파일 변경이 필요합니다.',
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
    '브랜치만 만들고 커밋하지 않으면 기본 브랜치와 내용이 같아 통과하지 않습니다. 파일을 수정해 커밋한 뒤 푸시하세요.',
    'PR 병합 후 브랜치를 삭제했다면 다시 실패할 수 있으므로 평가 전까지 유지하세요.'
  ]},
  { id:'issue', no:'05', title:'학습 계획 이슈 만들기', sub:'이슈 제목·저장소·기능 활성화 확인', steps:[
    '채점할 저장소의 <strong>Issues → New issue</strong>를 엽니다.',
    '제목에 <code>학습 계획</code>을 그대로 포함하고, 본문에는 앞으로 연습할 기능을 적습니다.',
    '제출 후 이슈 번호와 제목을 확인합니다. 열린 이슈와 닫힌 이슈 모두 인정합니다.'
  ], success:'해당 저장소에 제목에 ‘학습 계획’이 들어간 이슈가 있습니다.', trouble:[
    'Issues 탭이 없으면 <strong>Settings → General → Features</strong>에서 Issues가 켜져 있는지 확인하세요.',
    '다른 저장소에 만들었거나 PR 제목에만 문구를 적으면 통과하지 않습니다.',
    '다른 계정이 만든 이슈는 인정하지 않습니다. 본인 계정으로 로그인해 만드세요.',
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
    '다른 계정이 만든 PR이나 다른 Fork에서 보낸 PR은 인정하지 않습니다.',
    'PR이 100개 넘는 저장소에서는 최근 100개만 확인합니다.'
  ]}
];

const guideUsage = {
  repo: [
    ['git init', [
      ['git init', '현재 폴더를 Git 저장소로 만듭니다. .git 폴더가 생깁니다.'],
      ['git init -b main', '기본 브랜치 이름을 main으로 정하면서 초기화합니다.'],
      ['git init <폴더>', '새 폴더를 만들면서 초기화합니다.'],
      ['git init --bare', '작업 폴더 없이 공유용 저장소만 만듭니다. 서버에서 사용합니다.'],
      ['git status', '초기화 후 가장 먼저 상태를 확인합니다.']
    ]],
    ['git remote / git push', [
      ['git remote add origin <주소>', '원격 저장소를 origin이라는 이름으로 연결합니다.'],
      ['git remote set-url origin <주소>', '주소를 잘못 넣었을 때 교체합니다.'],
      ['git push -u origin main', '처음 push. -u는 이후 git push만으로 되도록 추적을 설정합니다.'],
      ['git push', '추적이 설정된 뒤에는 이 한 줄이면 됩니다.'],
      ['git push origin HEAD', '현재 브랜치를 같은 이름으로 올립니다. 이름 오타를 막아 줍니다.'],
      ['git push --dry-run', '무엇이 올라갈지 미리 확인만 합니다.']
    ]]
  ],
  readme: [
    ['git add', [
      ['git add README.md', '파일 하나만 다음 커밋에 담습니다. 가장 안전한 형태입니다.'],
      ['git add .', '현재 폴더 아래 변경을 모두 담습니다. 의도치 않은 파일이 없는지 status로 확인하세요.'],
      ['git add -p', '한 파일 안에서도 원하는 조각만 골라 담습니다.'],
      ['git add -u', '이미 추적 중인 파일의 변경만 담습니다(새 파일 제외).'],
      ['git restore --staged <파일>', '잘못 담은 파일을 스테이지에서 내립니다.']
    ]],
    ['확인용 명령', [
      ['git status -s', '짧은 형식으로 상태를 봅니다. M=수정, A=추가, ??=미추적.'],
      ['git diff --staged', '다음 커밋에 들어갈 내용을 미리 확인합니다.'],
      ['git show HEAD:README.md', '마지막 커밋에 담긴 README 내용을 확인합니다.'],
      ['git ls-files', '저장소가 추적 중인 파일 목록을 봅니다.']
    ]]
  ],
  commits: [
    ['git commit', [
      ['git commit -m "메시지"', '한 줄 메시지로 커밋합니다.'],
      ['git commit', '에디터를 열어 제목과 본문을 나눠 적습니다. 이유를 남길 때 권장합니다.'],
      ['git commit -am "메시지"', '추적 중인 파일을 add와 동시에 커밋합니다(새 파일은 제외).'],
      ['git commit --amend --no-edit', '방금 커밋에 빠뜨린 파일을 추가합니다.'],
      ['git commit --allow-empty -m "trigger"', '변경 없이 커밋합니다. CI 재실행용이며 채점에서는 인정되지 않습니다.']
    ]],
    ['git log', [
      ['git log --oneline -5', '최근 5개를 한 줄씩 봅니다.'],
      ['git log --graph --oneline --all', '브랜치 갈라짐을 그림으로 봅니다.'],
      ['git log -p <파일>', '그 파일의 변경 내용까지 함께 봅니다.'],
      ['git log --author="이름"', '작성자로 걸러 봅니다.'],
      ['git log --since="1 week ago"', '기간으로 걸러 봅니다.'],
      ['git log --stat', '커밋마다 바뀐 파일과 줄 수를 요약합니다.']
    ]]
  ],
  branch: [
    ['브랜치 만들기와 이동', [
      ['git switch -c practice/feature', '새 브랜치를 만들고 바로 이동합니다.'],
      ['git switch main', '기존 브랜치로 이동합니다.'],
      ['git switch -', '직전 브랜치로 되돌아갑니다.'],
      ['git checkout -b <이름>', '예전 방식. switch -c와 같은 동작입니다.'],
      ['git branch --show-current', '현재 브랜치 이름만 출력합니다. 스크립트에서 유용합니다.']
    ]],
    ['원격 브랜치 다루기', [
      ['git push -u origin practice/feature', '로컬 브랜치를 원격에 만들고 추적을 설정합니다.'],
      ['git branch -a', '로컬과 원격 브랜치를 모두 봅니다.'],
      ['git branch -vv', '추적 중인 원격과 앞선/뒤처진 커밋 수를 봅니다.'],
      ['git push origin --delete <이름>', '원격 브랜치를 삭제합니다.'],
      ['git switch -c <이름> origin/<이름>', '원격에만 있는 브랜치를 내 PC로 가져옵니다.']
    ]]
  ],
  issue: [
    ['터미널에서 이슈 다루기 (gh)', [
      ['gh issue create --title "학습 계획"', '브라우저 없이 이슈를 만듭니다.'],
      ['gh issue list', '열린 이슈 목록을 봅니다. --state all 로 닫힌 것까지 봅니다.'],
      ['gh issue view 1', '이슈 내용을 터미널에서 확인합니다.'],
      ['gh issue close 1 / reopen 1', '닫기와 다시 열기.'],
      ['gh issue comment 1 --body "진행 중"', '댓글을 남깁니다.']
    ]],
    ['커밋과 이슈 연결', [
      ['커밋 메시지에 #1', '해당 이슈에 커밋이 자동으로 연결됩니다.'],
      ['"Closes #1"', 'PR이 병합될 때 이슈가 자동으로 닫힙니다.'],
      ['라벨과 마일스톤', '이슈를 분류해 진행 상황을 관리합니다.'],
      ['템플릿(.github/ISSUE_TEMPLATE)', '이슈 작성 양식을 미리 정해 둘 수 있습니다.']
    ]]
  ],
  pr: [
    ['터미널에서 PR 다루기 (gh)', [
      ['gh pr create --base main --head practice/feature', '브라우저 없이 PR을 만듭니다.'],
      ['gh pr create --fill', '커밋 메시지로 제목과 본문을 자동으로 채웁니다.'],
      ['gh pr list / gh pr view --web', '목록 확인과 브라우저로 열기.'],
      ['gh pr checkout 2', '남의 PR 브랜치를 내 PC로 받아 확인합니다.'],
      ['gh pr merge 2 --squash', '병합 방식을 골라 병합합니다.']
    ]],
    ['PR 전에 확인할 것', [
      ['git diff main...practice/feature', 'PR 화면과 같은 기준으로 변경을 미리 봅니다.'],
      ['git log main..practice/feature', 'PR에 들어갈 커밋 목록을 확인합니다.'],
      ['git fetch origin && git rebase origin/main', '최신 main 위로 정리해 충돌을 줄입니다.'],
      ['git push --force-with-lease', 'rebase 후 안전하게 다시 올립니다.']
    ]]
  ]
};

function guideUsageHtml(id) {
  const usage = guideUsage[id];
  if (!usage) return '';
  const escape = (value) => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
  const groups = usage.map(([name, cases]) => `<div class="usage-group"><h5>${escape(name)}</h5><dl>${
    cases.map(([code, note]) => `<dt><code>${escape(code)}</code></dt><dd>${escape(note)}</dd>`).join('')
  }</dl></div>`).join('');
  return `<details class="usage"><summary>명령어 활용 사례 — 상황에 따라 이렇게 바꿔 씁니다</summary><div class="usage-body">${groups}</div></details>`;
}

const guideRoot = document.getElementById('guides');
if (guideRoot) {
  guideRoot.innerHTML = `<section class="example-section"><div class="example-title"><div><span class="eyebrow">COMPLETED EXAMPLE</span><h3>완성된 예제로 먼저 확인하세요</h3><p>실제 공개 저장소에 모든 과제를 수행했습니다. 화면의 번호와 아래 설명을 함께 확인하세요.</p></div><a class="example-link" href="https://github.com/nowcika/git-lab-example" target="_blank" rel="noopener noreferrer">예제 저장소 열기 ↗</a></div>
  <div class="example-shot"><img src="assets/example-repository.png" alt="Git Lab 완성 예제 GitHub 저장소 화면"><i class="pin p1">1</i><i class="pin p2">2</i><i class="pin p3">3</i><i class="pin p4">4</i></div>
  <div class="callout-list"><span><b>1</b> 저장소 이름과 Public 표시</span><span><b>2</b> 브랜치 선택 메뉴</span><span><b>3</b> 커밋 이력 링크</span><span><b>4</b> README의 목표와 지정 문구</span></div>
  <div class="example-subgrid"><a href="https://github.com/nowcika/git-lab-example/issues/1" target="_blank" rel="noopener noreferrer"><img src="assets/example-issue.png" alt="학습 계획 예제 이슈 화면"><strong>예제 이슈 #1 확인 ↗</strong><small>제목의 ‘학습 계획’ 문구를 확인하세요.</small></a><a href="https://github.com/nowcika/git-lab-example/pull/2" target="_blank" rel="noopener noreferrer"><img src="assets/example-pr.png" alt="practice feature 예제 Pull Request 화면"><strong>예제 Pull Request #2 확인 ↗</strong><small>base: main ← compare: practice/feature 방향을 확인하세요.</small></a></div>
  <p class="capture-note">캡처는 2026년 9월 기준 실제 GitHub 공개 화면입니다. GitHub 화면 개편에 따라 버튼 위치는 달라질 수 있으므로, 위 예제 저장소 링크에서 최신 상태를 함께 확인하세요.</p></section><div class="guide-heading"><h3>과제별 실행 가이드</h3><p>과정을 따라 하고, 막히면 ‘안될 때 확인’을 살펴보세요.</p></div><div class="guide-list">${guides.map(g => `
    <details class="guide" id="guide-${g.id}"><summary><span>${g.no}</span><strong>${g.title}</strong><small>${g.sub}</small></summary>
    <div class="guide-body"><div><h4>따라 하기</h4><ol>${g.steps.map(x=>`<li>${x}</li>`).join('')}</ol>${g.cmd ? `<pre><code>${g.cmd}</code><button class="copy-block" type="button">전체 복사</button></pre>` : ''}<p class="guide-success">✓ 성공 기준: ${g.success}</p>${guideUsageHtml(g.id)}</div>
    <div class="trouble"><h4>안될 때 확인</h4><ul>${g.trouble.map(x=>`<li>${x}</li>`).join('')}</ul></div></div></details>`).join('')}</div>`;
  guideRoot.querySelectorAll('.copy-block').forEach(button => button.addEventListener('click', async () => {
    const value = button.previousElementSibling.textContent;
    try { await navigator.clipboard.writeText(value); button.textContent='복사됨'; } catch { button.textContent='복사 실패'; }
    setTimeout(() => button.textContent='전체 복사', 1500);
  }));
}
