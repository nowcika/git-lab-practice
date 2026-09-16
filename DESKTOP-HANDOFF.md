# 데스크톱 Playwright 검증 인계서

Android 작업 환경에서 만든 Git 실습 사이트를 Windows, macOS 또는 Linux에서 이어서 검증하는 방법입니다.

## 관련 주소

- 교육 사이트: https://nowcika.github.io/git-lab-practice/
- 사이트 소스: https://github.com/nowcika/git-lab-practice
- Fork용 문제: https://github.com/nowcika/git-scenario-lab
- 외부 remote: https://github.com/nowcika/git-scenario-library
- 전체 정답: https://github.com/nowcika/git-scenario-solution
- 정답 Pages: https://nowcika.github.io/git-scenario-solution/
- 정답 Release: https://github.com/nowcika/git-scenario-solution/releases/tag/release-v1.0.0

## 설치

Git, Node.js 20 이상, npm과 Chromium을 설치할 수 있는 데스크톱이 필요합니다.

```bash
git clone https://github.com/nowcika/git-lab-practice.git
cd git-lab-practice
npm install
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
```

Windows PowerShell:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "0"
npx playwright install chromium
```

설치 이후의 `npm run test:*` 명령에는 환경 변수를 따로 지정하지 않아도 됩니다.

`PLAYWRIGHT_BROWSERS_PATH=0`은 브라우저를 `node_modules` 안에 설치하라는 뜻입니다. npm 스크립트가 같은 값을 사용하므로 **반드시 이 환경변수와 함께 설치해야** 합니다. 환경변수 없이 설치하면 브라우저는 `~/.cache/ms-playwright`에 들어가고 `npm test`가 찾지 못합니다.

Linux 시스템 라이브러리가 부족하면 `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install --with-deps chromium`을 사용합니다.

## GitHub API 인증

전체 테스트는 공개 API를 여러 번 조회합니다. `gh auth login`으로 로그인하면 API 테스트가 `gh auth token`을 자동 사용합니다. UI 테스트는 다음처럼 환경 변수를 전달합니다. 토큰은 파일에 저장하거나 커밋하지 않습니다.

macOS/Linux:

```bash
export GH_TOKEN="$(gh auth token)"
```

Windows PowerShell:

```powershell
$env:GH_TOKEN = gh auth token
```

## 실행

npm 스크립트는 Windows(cmd·PowerShell)와 macOS·Linux에서 모두 같은 명령으로 동작합니다.
환경 변수는 `bin/run-tests.js`가 대신 설정하므로 셸 문법 차이를 신경 쓰지 않아도 됩니다.

```bash
npm run test:local        # 로컬 검증기 단위 테스트 (브라우저·네트워크 불필요)
npm run test:scenario     # 실제 GitHub 결과와 배포 사이트 검증 (브라우저 불필요)
npm run test:ui           # 로컬 소스를 Chromium으로 검증 (정적 서버 자동 기동)
npm run test:ui:headed    # 브라우저를 보면서 UI 검증
npm run test:leaderboard  # 공개 순위표 화면 검증 (가상 데이터)
npm test                  # 전부 실행
npm run report            # HTML 결과 보고서
npm run serve             # http://127.0.0.1:4173 에서 직접 확인
```

UI 테스트는 배포본이 아니라 **작업 중인 로컬 파일**을 검사합니다. 입력 검증, URL 파싱, git 버전 형식, 명령어 활용 사례 블록, 코드 자리표시자 보존, 모바일 레이아웃, 공식 정답 저장소 차단, 그리고 `?allowAnswerRepo=1` 테스트 모드에서의 325점과 20개 통과를 확인합니다. 최종 채점 화면은 `test-results/scenario-290-score.png`에 저장합니다.

## 현재 상태

- Playwright 테스트 33개 전부 통과 (api 9개 + chromium 24개)
- 단위 테스트 44개 전부 통과 (로컬 검증기 + 순위표 + 회귀)
- 모든 문제·정답 브랜치 생성 완료
- Actions Release 성공 및 asset 확인
- 정답 Pages HTTP 200과 고유 문구 확인
- 공개 순위표 운영은 `LEADERBOARD.md`, 변경 내역은 `CHANGELOG.md` 참고

## 공개 순위표 운영 점검

순위표는 GitHub Issues·Actions·`leaderboard-data` 브랜치만으로 동작합니다. 별도 서버나
데이터베이스가 없습니다. 데스크톱에서 점검할 때는 아래를 사용합니다.

```bash
npm run test:leaderboard   # 가상 데이터로 순위표 화면만 검증
npm run leaderboard:smoke  # 공개 예제를 서버 방식으로 재채점 (게시하지 않음)
```

`leaderboard:smoke`는 `gh auth login` 또는 `GH_TOKEN`을 사용하며 결과를
`test-results/leaderboard-verified.json`에 남깁니다. **점검 결과는 순위표에 게시되지
않습니다.** 실제 등록 흐름을 점검하려면 GitHub Actions의 `Public leaderboard →
Run workflow`에서 이슈 번호를 비운 채 실행하세요. 테스트용 제출 이슈를 만들어 순위에
올리지 말고, 처리가 끝난 이슈는 닫아 두세요. 자세한 내용은 `LEADERBOARD.md`에 있습니다.

## 실패 시 확인

- `403 API rate limit`: `GH_TOKEN` 설정 (웹 화면에서는 결과 확인 영역의 토큰 칸 사용)
- 브라우저를 찾지 못함: `PLAYWRIGHT_BROWSERS_PATH=0`과 함께 설치했는지 확인
- Chromium 없음: `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium`
- Linux 라이브러리 오류: `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install --with-deps chromium`
- 325점 미만: 실패 결과와 연결된 정답 브랜치 비교 (UI 290점 테스트는 `?allowAnswerRepo=1` 주소를 사용합니다)
- Pages/Release 실패: GitHub Actions가 끝날 때까지 기다린 뒤 다시 실행
- 순위표에 반영이 늦음: Actions 완료 후에도 GitHub raw CDN 캐시 때문에 지연될 수 있습니다. 순위표의 새로고침 버튼은 API로 최신 데이터를 직접 조회합니다

`test-results/`, `playwright-report/`, `node_modules/`는 Git에 포함하지 않습니다.
