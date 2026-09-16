# 변경 이력

## 2026-09-16 — 코드 검토 지적사항 일괄 수정 + 명령어 활용 사례 추가

검토 리포트(`CODE-REVIEW-ISSUES.txt`)의 항목 번호를 그대로 사용합니다.
실행 결과는 `TEST-REPORT.txt`에 있습니다.

### 1. 학습자가 실제로 막히던 문제 (치명)

| 번호 | 내용 | 수정 |
| --- | --- | --- |
| A-1 | macOS 기본 출력 `git version 2.39.5 (Apple Git-154)`가 채점에서 항상 실패 | `app.js`의 정규식에 괄호 주석을 허용: `/^git version \d+\.\d+(?:\.\d+)?[\w.+-]*(?:\s+\(.+\))?$/i` |
| A-2 | 미인증 GitHub API 한도(IP당 60회/시간)를 매번 초과 | ① 채점 전 `/rate_limit`로 남은 한도 확인 후 부족하면 시작하지 않고 초기화 시각 안내 ② 같은 경로 요청을 캐시해 중복 호출 제거 ③ 병렬(`Promise.all`) → 순차 실행으로 바꿔 한도 초과 시 즉시 중단 ④ 결과 확인 영역에 **선택 입력 토큰 칸** 추가(sessionStorage에만 보관, GitHub 외 전송 없음) ⑤ 채점 후 사용한 호출 수 표시 |
| A-3 | 공식 정답 저장소 URL을 넣으면 누구나 290점 | 기본 동작에서 제거. `?allowAnswerRepo=1`을 붙인 경우(UI 자동 테스트 전용)에만 예외. 일반 사용자에게는 "공식 정답 저장소는 채점 대상이 아닙니다"로 0점 처리 |
| A-4 | 화면에 적힌 정답 문구만 복사해도 통과 | 내용 검사에 이력 근거를 추가: `upstream`은 **merge 커밋(부모 2개)** 필수, `diff`/`show`/`blame`은 지정된 **제출 커밋 메시지** 필수 |

### 2. 보안·배포·회귀 방지 (중요)

| 번호 | 내용 | 수정 |
| --- | --- | --- |
| B-1 | Playwright 설정이 GitHub 토큰을 브라우저의 **모든** 요청에 주입(웹폰트 도메인 포함) | 프로젝트를 `api`/`chromium`으로 분리. 토큰 헤더는 브라우저를 쓰지 않는 `api` 프로젝트에만 적용하고, UI 테스트는 `page.route`로 `api.github.com`에만 헤더를 붙임 |
| B-2 | 로컬 검증기(`bin/`, `lib/` 등)가 커밋되지 않아 새 clone에서 동작 불가 | 커밋·푸시 완료 (5ab127a) |
| B-3 | 문서의 브라우저 설치 경로와 npm 스크립트가 불일치 | `DESKTOP-HANDOFF.md`를 `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium`으로 수정하고 PowerShell 예시 추가. 모든 playwright 스크립트가 같은 환경변수를 사용하도록 통일 |
| B-4 | 모든 테스트가 배포 사이트만 검사해 로컬 수정본의 회귀를 못 잡음 | 의존성 없는 정적 서버 `bin/static-server.js` 추가 → Playwright `webServer`로 기동. UI 테스트는 `baseURL`(로컬 소스)을 검사하고, 배포 확인은 `api` 프로젝트(`scenario-api.spec.js`)가 담당 |
| B-5 | `app.js` 상단에서 요소 하나만 없어도 전체 스크립트가 중단 → `scenarios.js`까지 연쇄 실패 | 요소 존재 확인 후 접근, `localStorage`/`sessionStorage` 접근을 모두 try/catch로 감쌈 |
| B-6 | 예외 발생 시 채점 버튼이 영구 비활성 | `grade()`/`gradeScenarios()`를 `try/finally`로 감싸 항상 복구 |
| B-7 | 웹 채점과 로컬 검증기의 기준 불일치 | 커밋 2개 검사에 **트리 SHA 비교**를 도입해 빈 커밋을 웹에서도 차단, URL 파서가 자격 증명 포함 주소를 거부하도록 통일, git 버전 정규식 완화 |

### 3. UX·정확성·유지보수 (보통)

- **C-1** 채점 완료 시 "채점을 마쳤습니다. (GitHub API N회 사용)" 표시
- **C-2** 네트워크 오류를 한국어 안내로 교체 (`Failed to fetch` 노출 제거)
- **C-3** `.../tree/main` 같은 뒤 경로가 붙은 URL도 자동으로 정규화해 수용
- **C-4** 이슈·PR이 100개를 넘어 찾지 못한 경우 `fail`이 아니라 `unknown`으로 표시
- **C-5** 1MB 초과 README를 "파일 없음"으로 오판하지 않고 `unknown`으로 구분
- **C-6** `bin/grade-local.js`에서 `--repo` 필수화 (현재 폴더를 조용히 채점하던 문제)
- **C-7** 오프라인 보류 항목을 `offlineSkipped`로 구분하고 종료 코드에서 제외 → `--offline`도 전부 통과하면 0
- **C-8** 신뢰 불가 저장소의 사유를 항목별로 표시 (비공개/소유자 불일치/origin 불일치/Fork 아님)
- **C-9** `--branch`를 지정하면 GitHub 기본 브랜치보다 우선하도록 변경
- **C-10** 8~10px이던 본문 글자를 11.5~12px로 상향, `prefers-reduced-motion` 대응, 복사 버튼에 `aria-label` 추가
- **C-11** 웹폰트를 `@import`에서 `<link rel="preconnect">` + `<link rel="stylesheet">`로 이동
- **C-12** `package.json` 정리: 이름 `git-lab-practice`, `main`을 `lib/local-grader.js`로, `engines: node >=20` 명시, 스크립트 통일(`serve` 추가)
- **C-13** "8개 평가 항목"에 "설치 2 + 과제 6" 설명 추가
- **D-1** 코드 블록을 `innerHTML`이 아닌 `textContent`로 넣어 `<브랜치>` 같은 표기가 사라질 위험을 제거, 활용 사례의 `<A>..<B>` 등은 이스케이프 처리

### 4. 새 기능 — 명령어 활용 사례

각 실전 시나리오 18개와 초급 가이드 6개에 **"명령어 활용 사례"** 접이식 블록을 추가했습니다.
같은 명령을 옵션에 따라 어떻게 다르게 쓰는지, 언제 어떤 형태를 선택하는지 설명합니다.

- 데이터 위치: `scenarios.js`의 각 정의에 있는 `usage: [[명령 이름, [[코드, 설명], …]], …]`
- 초급 가이드: `guides.js`의 `guideUsage` 객체 (키는 가이드 id)
- 렌더링: `usageHtml()` / `guideUsageHtml()` — 모든 코드·설명은 HTML 이스케이프됩니다
- 예: `git merge --no-ff / --ff-only / --squash / --abort`, `git reset --soft / --mixed / --hard`,
  `git diff A..B` vs `A...B`, `git am` vs `git apply`, `git tag` vs `git tag -a` 등

### 5. 검증 방법

```bash
npm run test:local     # 로컬 검증기 단위 테스트 19개
npm run test:ui        # 로컬 소스를 브라우저로 검사 (정적 서버 자동 기동)
npm run test:scenario  # 실제 GitHub 데이터와 배포 사이트 검사
npm test               # 위 전부
npm run serve          # http://127.0.0.1:4173 에서 직접 확인
```

전체 19개 Playwright 테스트와 19개 단위 테스트가 통과합니다.
특히 `테스트 모드에서 공식 정답 저장소가 290점을 받는다`가 통과하므로,
채점 기준을 강화한 뒤에도 공식 정답은 만점을 유지합니다.

### 6. 남은 과제 (의도적으로 하지 않은 것)

- `diff`/`show`/`blame`은 여전히 "보고서 내용 + 제출 커밋" 검사입니다. 원본 브랜치와의
  독립적인 대조는 GitHub 공개 API만으로는 비용이 크며, 현재는 로컬 검증기
  (`lib/local-grader.js`)가 더 엄격한 근거를 제공합니다.
- 토큰 없이 채점할 때의 한도(60회/시간)는 GitHub의 정책이므로 제거할 수 없습니다.
  한도 확인·캐시·순차 실행·토큰 입력으로 실패를 예측 가능하게 만드는 데 집중했습니다.
