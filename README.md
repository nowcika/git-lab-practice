# Git 실습실

Git과 GitHub 교육을 위한 정적 웹페이지입니다. 설치·가입 안내, 여섯 가지 실습 과제, 공개 GitHub 저장소 자동 채점, JSON 결과 다운로드를 제공합니다.

**Windows에서 실습한다면** 모든 명령을 **Git Bash**에서 실행하세요. PowerShell과 명령 프롬프트는 `mkdir -p`와 heredoc(`cat > 파일 <<'EOF'`)을 지원하지 않고, `>`로 만든 파일이 Windows PowerShell 5.1에서 UTF-16으로 저장돼 채점에 실패합니다. 실습 파일은 **UTF-8(BOM 없음)**으로 저장해야 합니다. 각 시나리오의 활용 사례에 PowerShell 대체 명령이 함께 들어 있습니다.

`index.html`을 브라우저에서 열거나 정적 웹 서버로 제공하면 됩니다. 저장소에 포함된 서버를 쓰려면 `npm run serve` 후 `http://127.0.0.1:4173`에 접속하세요. 빌드나 서버 자격 증명은 필요하지 않습니다.

각 실전 시나리오와 초급 가이드에는 **명령어 활용 사례** 블록이 있습니다. 같은 명령을 옵션에 따라 어떻게 다르게 쓰는지(`git merge --no-ff`/`--squash`, `git reset --soft`/`--hard`, `git diff A..B`/`A...B` 등) 상황별로 정리했습니다.


## Fork 기반 실전 시나리오

별도 원본 저장소 [`nowcika/git-scenario-lab`](https://github.com/nowcika/git-scenario-lab)를 Fork해 해결하는 실전 과정도 제공합니다. upstream 동기화, merge conflict, 외부 remote, revert, rebase, push 거부 후 pull --rebase, rebase 도중 충돌 해결, reset, reflog 복구, amend, cherry-pick, diff, show, format-patch/git am, blame, 브랜치 이동과 커밋 수정, Actions Release, Pages 배포, tag를 다룹니다. 각 과제는 `solution/*` 브랜치 또는 tag의 파일 내용과 Git 이력을 GitHub API로 자동 채점합니다.

GitHub Actions로 Release를 자동 생성하고, GitHub Pages로 홈페이지를 배포하는 과제도 포함합니다. Pages는 **브랜치에서 바로 배포**하거나 **Actions workflow로 배포**하는 두 가지 경로 중 하나를 골라 진행할 수 있으며 어느 쪽이든 동일하게 채점합니다.

외부 remote 과제는 [`nowcika/git-scenario-library`](https://github.com/nowcika/git-scenario-library)를 사용합니다. 로컬 reflog나 remote 이름처럼 GitHub에 공개되지 않는 정보는 고유 결과 파일과 커밋 이력으로 간접 검증합니다.

채점은 입력한 GitHub 사용자 이름과 개인 계정 소유의 공개 저장소를 GitHub REST API로 조회합니다. 이 과정의 목표는 터미널에서 Git을 직접 쓰는 것이므로, **GitHub 웹 편집기로만 만든 커밋은 인정하지 않습니다**(웹으로 만든 커밋은 committer가 `GitHub <noreply@github.com>`로 기록되어 구분됩니다). Fork한 저장소, 기본 브랜치와 내용이 같은 `practice/feature`, 다른 계정이 만든 이슈·PR도 통과하지 않습니다. 공개 API는 IP당 시간당 60회로 제한되므로, 여러 명이 같은 네트워크에서 채점하면 한도를 넘길 수 있습니다. 결과 확인 영역의 **GitHub 토큰(선택 사항)** 칸에 읽기 전용 토큰을 넣으면 한도가 시간당 5,000회가 됩니다. 토큰은 이 탭을 닫으면 지워지며 GitHub 외의 서버로 전송되지 않습니다. README의 `git-lab-사용자이름` 문구, 기본 브랜치의 커밋 2개, `practice/feature` 브랜치, `학습 계획` 이슈, 해당 브랜치에서 기본 브랜치로 만든 PR을 확인합니다. `git --version` 출력은 형식만 검사하므로 로컬 설치 자체를 증명하지는 않습니다. 공개 API로 이메일 인증이나 계정 소유권도 확인할 수 없습니다. API 한도 또는 네트워크 오류는 `확인 불가`로 표시됩니다.

입력값은 브라우저 `localStorage`에 보관됩니다. 채점 정보는 사이트 서버로 전송되지 않고 GitHub API에 직접 요청됩니다.

## Playwright 전체 검증

테스트는 두 종류로 나뉩니다.

- `npm run test:scenario` (`api` 프로젝트): 브라우저 없이 실제 GitHub 데이터와 **배포된 사이트**를 검사합니다. 원본 문제 브랜치, 공식 정답 저장소의 해결 파일과 Git 이력, Actions Release asset, 실제 Pages 응답을 확인합니다. Android Termux처럼 브라우저를 설치할 수 없는 환경에서도 동작합니다.
- `npm run test:ui` (`chromium` 프로젝트): `bin/static-server.js`가 자동으로 기동되어 **작업 중인 로컬 소스**를 브라우저로 검사합니다. 푸시하기 전에 회귀를 잡을 수 있습니다. Chromium 설치가 필요합니다.

`npm test`는 로컬 검증기 단위 테스트까지 포함해 전부 실행합니다.

공식 정답은 [`nowcika/git-scenario-solution`](https://github.com/nowcika/git-scenario-solution)에서 확인할 수 있습니다. 각 시나리오 카드의 **정답 결과 보기**는 해당 해결 브랜치, 자동 생성 Release 또는 실제 Pages 사이트로 직접 연결됩니다.

데스크톱에서 Chromium UI 검증을 이어서 실행하려면 [DESKTOP-HANDOFF.md](DESKTOP-HANDOFF.md)를 따르세요. 정답 URL 입력부터 325점 확인과 결과 화면 캡처까지 자동화돼 있습니다.

## 사용자 PC의 로컬 저장소 검증

로컬 Git 파일·커밋 이력과 로그인한 GitHub 계정, 원격 브랜치 SHA를 함께 검사할 수 있습니다. 초급 100점과 실전 325점 과정을 지원합니다.

```bash
npm run grade:local -- --repo /path/to/student-repo --course basic
npm run grade:local -- --repo /path/to/student-fork --course scenarios --json /tmp/scenario-result.json
npm run test:local
```

설치 조건, 오프라인 검사, JSON 결과와 판정 한계는 [LOCAL-GRADER.md](LOCAL-GRADER.md)를 참고하세요.
