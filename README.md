# Git 실습실

Git과 GitHub 교육을 위한 정적 웹페이지입니다. 설치·가입 안내, 여섯 가지 실습 과제, 공개 GitHub 저장소 자동 채점, JSON 결과 다운로드를 제공합니다.

`index.html`을 브라우저에서 열거나 정적 웹 서버로 제공하면 됩니다. 예를 들어 `python -m http.server 8000`을 실행한 뒤 `http://localhost:8000`에 접속할 수 있습니다. 빌드나 서버 자격 증명은 필요하지 않습니다.


## Fork 기반 실전 시나리오

별도 원본 저장소 [`nowcika/git-scenario-lab`](https://github.com/nowcika/git-scenario-lab)를 Fork해 해결하는 실전 과정도 제공합니다. upstream 동기화, conflict, 외부 remote, revert, rebase, reset, reflog 복구, amend, cherry-pick, diff, show, format-patch/git am, blame, 브랜치 이동과 커밋 수정, tag를 다룹니다. 각 과제는 `solution/*` 브랜치 또는 tag의 파일 내용과 Git 이력을 GitHub API로 자동 채점합니다.

외부 remote 과제는 [`nowcika/git-scenario-library`](https://github.com/nowcika/git-scenario-library)를 사용합니다. 로컬 reflog나 remote 이름처럼 GitHub에 공개되지 않는 정보는 고유 결과 파일과 커밋 이력으로 간접 검증합니다.

채점은 입력한 GitHub 사용자 이름과 개인 계정 소유의 공개 저장소를 GitHub REST API로 조회합니다. README의 `git-lab-사용자이름` 문구, 기본 브랜치의 커밋 2개, `practice/feature` 브랜치, `학습 계획` 이슈, 해당 브랜치에서 기본 브랜치로 만든 PR을 확인합니다. `git --version` 출력은 형식만 검사하므로 로컬 설치 자체를 증명하지는 않습니다. 공개 API로 이메일 인증이나 계정 소유권도 확인할 수 없습니다. API 한도 또는 네트워크 오류는 `확인 불가`로 표시됩니다.

입력값은 브라우저 `localStorage`에 보관됩니다. 채점 정보는 사이트 서버로 전송되지 않고 GitHub API에 직접 요청됩니다.

## Playwright 전체 검증

`npm install` 후 `npm run test:scenario`를 실행하면 배포 사이트, 원본 문제 브랜치, 공식 정답 저장소의 해결 파일과 Git 이력, Actions Release asset, 실제 Pages 응답을 검사합니다. Android Termux처럼 Playwright가 기본 브라우저 경로를 지원하지 않는 환경에서도 API 검증은 `PLAYWRIGHT_BROWSERS_PATH=0`으로 실행됩니다. 브라우저 UI 테스트에는 Playwright가 지원하는 데스크톱 Linux·macOS·Windows와 Chromium 설치가 필요합니다.
