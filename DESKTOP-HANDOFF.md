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
npx playwright install chromium
```

Linux 시스템 라이브러리가 부족하면 `npx playwright install --with-deps chromium`을 사용합니다.

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

```bash
npm run test:scenario     # 실제 GitHub 결과 API 검증
npm run test:ui           # Chromium UI 검증
npm run test:ui:headed    # 브라우저를 보면서 UI 검증
npm run report            # HTML 결과 보고서
```

UI 테스트는 정답 URL 입력, 채점 버튼 클릭, 290점과 18개 통과, 각 상세 가이드와 정답 링크, 설치·가입 및 초급 가이드를 확인합니다. 최종 채점 화면은 `test-results/scenario-290-score.png`에 저장합니다.

## 현재 상태

- Playwright API 테스트 9개 통과
- 모든 문제·정답 브랜치 생성 완료
- Actions Release 성공 및 asset 확인
- 정답 Pages HTTP 200과 고유 문구 확인
- Chromium UI 테스트는 이 인계서를 따라 데스크톱에서 실행 필요

## 실패 시 확인

- `403 API rate limit`: `GH_TOKEN` 설정
- Chromium 없음: `npx playwright install chromium`
- Linux 라이브러리 오류: `npx playwright install --with-deps chromium`
- 290점 미만: 실패 결과와 연결된 정답 브랜치 비교
- Pages/Release 실패: GitHub Actions가 끝날 때까지 기다린 뒤 다시 실행

`test-results/`, `playwright-report/`, `node_modules/`는 Git에 포함하지 않습니다.
