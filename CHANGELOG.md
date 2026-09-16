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

- (2026-09-16 4차에서 해결) `reflog` 시나리오도 `cherry-pick -x` 출처 기록으로 강화했습니다.
- 토큰 없이 채점할 때의 한도(60회/시간)는 GitHub의 정책이므로 제거할 수 없습니다.
  한도 확인·캐시·순차 실행·토큰 입력으로 실패를 예측 가능하게 만드는 데 집중했습니다.


## 2026-09-16 (2차) — diff·show·blame 검증 강화

정답 문구를 채점기에 저장해 두고 대조하던 방식을 버리고, **채점 시점에 원본
저장소에서 정답 근거를 직접 계산**해 대조합니다. 화면의 명령 블록에서도 정답을
없애고 자리표시자로 바꿨습니다.

### 채점 기준 변경

| 항목 | 이전 | 이후 |
| --- | --- | --- |
| diff | patch에 지정 문자열 5개가 있는지 | GitHub compare API로 원본 `scenario/diff-base...scenario/diff-target`을 조회해, **파일 목록·`index` 결과 blob 해시·`@@` hunk 헤더·모든 +/- 줄**이 제출 patch와 일치하는지 대조. 파일 수가 다르면 실패 |
| show | 보고서에 메시지·증거·파일명이 있는지 | 원본 `scenario/show-source` 커밋을 조회해 **SHA(7자리 이상)·작성자·제목·변경 파일·추가된 증거 줄**을 모두 대조 |
| blame | 보고서에 대상·작성자·메시지가 있는지 | 원본에서 **그 줄을 추가한 커밋을 직접 찾아** SHA·작성자·제목·대상 문구를 대조. 파일의 최신 커밋을 적으면 실패 |
| upstream(로컬) | 파일 문구만 확인 | 웹과 동일하게 **merge 커밋(부모 2개)** 요구 (기준 불일치 해소) |

### 화면 안내 변경 (scenarios.js)

`show`·`blame`의 보고서 템플릿에서 정답을 지우고 자리표시자로 바꿨으며,
`커밋 SHA` 항목을 추가했습니다. 이제 명령 블록을 그대로 복사해도 통과할 수 없습니다.

### 로컬 검증기 (lib/local-grader.js)

로컬에서는 Git 객체를 직접 확인합니다.

- `diff`: `index` 결과 blob이 저장소에 존재하고, 그 blob의 내용이 patch에 담겨 있어야 합니다.
- `show`·`blame`: 보고서에 적은 SHA가 실제 커밋이어야 하고 제목·작성자가 일치해야 하며,
  `blame`은 그 커밋이 대상 줄을 추가했는지까지 확인합니다.
- 원본 커밋·blob이 로컬에 없으면(`git fetch upstream` 전) **오답이 아니라 판정 보류**로
  구분하고 `git fetch upstream`을 안내합니다.

### 정답 저장소 갱신

`nowcika/git-scenario-solution`의 `solution/show`, `solution/blame` 브랜치에
`커밋 SHA`와 `작성자` 항목을 추가했습니다. 강화된 기준으로도 290점 만점이 유지됩니다.

### 효과 측정

Git 명령을 전혀 쓰지 않고 화면의 정답 문구만 파일로 만든 위조 저장소 점수:

```
강화 전 : 75/290  (upstream 15, reflog 15, diff 15, show 15, blame 15)
1차 강화 : 30/290  (upstream·diff·show·blame 차단)
2차 강화 : 15/290  (reflog만 남음 — 로컬 기록이라 공개 대조 불가)
```

### API 호출 수

시나리오 채점 1회 약 39회 → 약 44회. 화면 안내와 사전 한도 확인값을 45로 조정했습니다.

### 검증

- 로컬 검증기 단위 테스트 22개 통과 (diff·show·blame 위조 차단 테스트 3개 추가)
- Playwright 19개 통과, 공식 정답 저장소 290점 유지
- 공식 정답 저장소를 clone해 `git fetch upstream` 후 오프라인 채점: diff·show·blame·upstream 모두 pass


## 2026-09-16 (3차) — Actions Release 진단 강화, Pages 배포 경로 2종 지원

### 15. Actions Release — 실패 지점을 정확히 알려 줍니다

이전에는 실패 시 "workflow, release-v1.0.0 공개 Release, scenario-artifact.txt asset을
모두 확인하세요" 한 줄만 나와 어디서 막혔는지 알 수 없었습니다. 이제 순서대로 확인하고
막힌 단계만 보고합니다.

1. workflow 파일이 `solution/actions-release`에 있는가 → 없으면 경로·확장자 안내
2. `contents: write`, `gh release create`, `release-v` 트리거가 있는가 → 빠진 항목만 나열
3. `release-v1.0.0` 태그가 원격에 있는가 → 없으면 "git push origin release-v1.0.0을 따로 실행"
4. 그 태그가 workflow를 포함한 커밋을 가리키는가 → 아니면 "태그를 다시 만드세요"
5. Release가 없으면 `/actions/runs`를 조회해 원인을 구분
   - 실행 기록이 아예 없음 → **Fork의 Actions 활성화 버튼**을 누르라고 안내
   - 실행 중 → `unknown`(판정 보류)
   - 실패로 끝남 → conclusion과 **실행 로그 URL**을 그대로 표시
   - 성공했는데 Release 없음 → 태그 이름 확인 안내
6. draft 상태 / asset 누락 → 각각 구분하고, 실제 첨부된 파일 이름을 보여 줌

로컬 검증기도 태그가 workflow를 포함한 커밋을 가리키는지 오프라인에서 확인합니다.

활용 사례에 **자주 막히는 지점**(Fork의 Actions 비활성, 순서 의존, `git push`는 태그를
올리지 않음, 파일 경로, YAML 탭 금지)과 **실패 후 다시 시도하기**(`gh release delete`,
원격/로컬 태그 삭제, 재태그, `gh run rerun`) 블록을 추가했습니다.

### 16. Pages — 브랜치 배포와 Actions 배포 모두 인정

한 저장소에 Pages 사이트는 하나뿐이고 배포 방식도 하나만 고를 수 있으므로,
별도 시나리오를 만들지 않고 16번 안에서 **경로 A / 경로 B 중 택1**로 구성했습니다.

- **경로 A**: Settings → Pages → Deploy from a branch (`solution/pages`, `/docs`) — 기존 방식
- **경로 B**: `.github/workflows/pages.yml` + Source를 GitHub Actions로 전환
  (`actions/configure-pages@v5` → `actions/upload-pages-artifact@v3` → `actions/deploy-pages@v4`)

채점은 어느 쪽이든 동일하게 **docs/index.html의 문구 + 실제 사이트 응답**으로 판정합니다.
토큰을 입력한 경우에만 `/repos/{owner}/{repo}/pages`를 조회해 실제 배포 방식을 결과에
덧붙입니다(공개 API로는 이 엔드포인트를 조회할 수 없어 선택 사항입니다).
실패 안내도 경로별로 나눠 표시합니다.

활용 사례에 Actions 배포의 구성 요소(필요 권한, 각 액션의 역할, `environment: github-pages`,
`workflow_dispatch`)와 "한 저장소에 사이트는 하나" 주의사항을 추가했습니다.

정답 저장소는 경로 A를 그대로 사용하므로 변경하지 않았습니다.

### API 호출 수

시나리오 채점 1회 약 44회 → 정상 통과 시 약 46회, 실패 진단이 붙으면 최대 50회.
화면 안내는 "약 50회", 사전 한도 확인값은 48로 조정했습니다.

### 검증

- 로컬 검증기 단위 테스트 24개 통과 (release 태그 검사, Pages 두 경로 테스트 추가)
- Playwright 21개 통과 (Pages 두 경로 안내, Release 문제 해결 안내 테스트 추가)
- 공식 정답 저장소 290점 유지


## 2026-09-16 (4차) — reflog 복구 검증 강화

reflog는 로컬 기록이라 공개 대조가 불가능하다고 봤지만, `git cherry-pick -x`가 남기는
출처 줄을 이용하면 **공개 API로도 "되살린 커밋"임을 확인**할 수 있습니다.

### 안내 변경

`git cherry-pick <찾은-SHA>` → `git cherry-pick -x <찾은-SHA>`로 바꿨습니다.
`-x`는 커밋 메시지에 `(cherry picked from commit <원본 SHA>)` 줄을 남깁니다.

### 웹 채점 (공개 API)

- `recovered-note.txt`의 고유 문구
- `docs: add recoverable note` 커밋 존재
- 그 커밋 메시지의 **출처 줄**과, 출처 SHA가 커밋 자신과 다른지

한 번 커밋만 한 제출에는 출처 줄이 없으므로 통과하지 못합니다.

### 로컬 검증 (Git 객체 직접 대조)

- 출처 SHA가 **실제 커밋 객체**로 존재하는가
- 그 커밋이 브랜치의 **조상이 아닌가** — 조상이면 잃어버린 적이 없다는 뜻입니다
- 원본과 복구본의 **patch-id가 같은가** — 같은 변경을 되살렸는지 확인
- 진단에 reflog의 `reset`·`cherry-pick` 흔적 여부를 기록

잃어버린 커밋은 push되지 않아 다른 PC에서 clone하면 없습니다. 이 경우 오답이 아니라
**판정 보류**로 구분하고 "실제로 작업한 PC에서 검사하세요"를 안내합니다.

### 정답 저장소 갱신

`solution/reflog` 브랜치를 실제 절차(커밋 → `reset --hard` → `reflog` → `cherry-pick -x`)로
다시 만들어 force push했습니다. 이제 정답 커밋에도 출처 줄이 들어 있습니다.

### 효과 측정

화면 문구만 베낀 위조 저장소 점수:

```
강화 전 : 75/290
1차     : 30/290
2차     : 15/290  (reflog만 남음)
4차     :  0/290  ← 복사·붙여넣기로 얻을 수 있는 점수가 없습니다
```

### 검증

- 로컬 검증기 단위 테스트 25개 통과 (정상 절차·출처 없음·조상 지정·객체 없음 4가지 경로)
- Playwright 21개 통과, 공식 정답 저장소 290점 유지
