# 공개 순위표 운영

추가 서비스 계정·데이터베이스 없이 GitHub Issues(로그인/제출), GitHub Actions(서버 재채점), 별도 Git 브랜치(순위 데이터)를 사용합니다. 사이트에서는 개인 토큰 없이 순위를 읽습니다.

## 참가자 흐름

1. 웹페이지의 채점 결과에서 **공개 순위에 등록하기**를 누르거나 공개 순위표에서 과정·본인 저장소를 입력합니다.
2. **GitHub에서 제출**을 눌러 로그인하고, 공개 제출 양식을 확인한 뒤 직접 제출합니다.
3. `Public leaderboard` Actions가 저장소를 재채점합니다. 몇 분 후 순위표를 새로고침합니다. GitHub raw CDN 캐시 때문에 추가 지연이 있을 수 있습니다.

사용자 이름, 저장소, 점수, 검사 시각, 제출 이슈와 Actions 실행 기록은 공개됩니다. 같은 저장소를 수정한 뒤 다시 제출할 수 있습니다. 이슈를 닫았다 다시 열거나 본문을 수정해도 재검사합니다. 댓글은 재검사 신호가 아닙니다. 실패 사유는 **제출 처리 상태 보기**의 Actions 로그에서 확인합니다. 봇이 이슈 댓글이나 알림용 메시지를 작성하지 않습니다.

## 점수·순위 규칙

- 초급: **90점**, 7개 항목. 사용자 PC의 설치 출력 10점은 공개 서버에서 증명할 수 없으므로 제외합니다. 기존 개인 연습 채점은 계속 100점입니다.
- 실전: **325점**, 20개 항목.
- 사용자 식별은 변경 가능한 표시 이름 대신 GitHub 사용자 ID를 사용합니다. 과정마다 최고 점수 하나를 저장합니다.
- 동점은 공동 순위 `1, 1, 3`이며, 표시는 최고 점수의 최초 달성 시각 순입니다.
- 낮은 점수나 확인 불가 결과로 기존 최고 점수를 덮어쓰지 않습니다.
- 공식 예제/정답 저장소, 다른 사람 소유 저장소, 비공개 저장소는 등록하지 않습니다.
- 채점 당시 공개 결과를 기록하는 방식입니다. 이후 저장소 변경을 자동 감시하지는 않습니다.

## 신뢰 범위

제출 이슈의 작성자 ID와 공개 저장소 소유자 ID를 비교합니다. URL과 과정만 사용하고 제출자가 적은 점수, 브라우저 값, 로컬 JSON은 사용하지 않습니다. 신뢰된 이 프로젝트의 웹 채점기를 서버 Chromium에서 실행합니다. 참가자 저장소의 코드·의존성·Git hook·workflow를 실행하지 않습니다.

검사 전후 브랜치 SHA와 소유자 설정을 비교해 검사 도중 변경된 결과를 게시하지 않습니다. 이는 최종 공개 결과의 검사이며 실제 PC에서 특정 명령을 실행했다는 증명이나 부정행위 방지 시험 시스템은 아닙니다. Actions 배포 출처나 커밋 메타데이터도 사람이 조작할 수 있으므로 엄격한 시험 감독에는 별도 설계가 필요합니다.

검사 job에는 읽기 권한만 주고, 결과 게시 job에만 contents 쓰기 권한을 줍니다. 토큰은 `api.github.com`에만 전달하고 외부 리다이렉트에는 넘기지 않습니다. Pages 검증은 해당 계정의 `github.io` 응답을 사용하며 사용자 도메인으로의 리다이렉트는 따라가지 않습니다.

## 저장과 동시 제출

`leaderboard-data` 브랜치의 `data/leaderboard.json`이 공개 데이터입니다. 첫 유효 제출 때 자동 생성됩니다. `main`에는 빈 초기 데이터만 둡니다. 순위 갱신 때문에 사이트 소스나 main을 수정하지 않습니다.

게시 직전에 이슈 본문 해시·소유자를 다시 확인합니다. GitHub Contents API의 파일 SHA를 사용해 동시 변경을 감지하고, 충돌하면 최신 데이터를 다시 읽어 최대 5회 병합 재시도합니다. 같은 이슈의 실행은 직렬 처리하고 서로 다른 제출은 저장 충돌을 처리하므로 다른 참가자의 점수를 덮어쓰지 않습니다.

채점 규칙을 변경해 기존 점수와 비교가 불가능해지면 `leaderboard-core.js`의 RULES_VERSION을 올리고 데이터 이관/초기화를 함께 계획하세요. 잘못된 형식이나 버전이 다른 데이터는 임의로 지우지 않고 실패 처리합니다. 참가자의 삭제 요청은 저장소 관리자가 별도 브랜치의 해당 사용자 기록을 제거해 처리합니다(공개 Git 기록과 이슈는 별도입니다).

## 설치와 운영 점검

원본 저장소는 Issues와 Actions가 활성화돼 있어야 합니다. `.github/workflows/leaderboard.yml`을 기본 브랜치에 반영하면 시작됩니다. 새 OAuth 앱, 개인 PAT 등록, 외부 데이터베이스는 필요하지 않습니다. 조직 정책이 작업의 contents 쓰기를 제한하면 게시 job 로그에 권한 오류가 표시됩니다.

```bash
npm ci
node bin/run-tests.js install chromium
npm run test:local
npm run test:leaderboard
npm run leaderboard:smoke
```

마지막 명령은 이 PC의 `gh auth login` 또는 `GH_TOKEN`을 사용해 실제 공개 예제를 서버 방식으로 재채점합니다. **점검 점수는 게시하지 않습니다.** 결과는 `test-results/leaderboard-verified.json`에 기록합니다.

GitHub Actions 화면에서 `Public leaderboard → Run workflow`를 실행할 때 이슈 번호를 비우면 동일한 게시 없는 점검을 합니다. 이슈 번호를 지정하면 이미 사용자가 공개 제출한 이슈를 다시 검사해 최고 점수를 반영합니다. 로컬 셸에서 `leaderboard-publish.js`를 실행하는 것은 차단합니다.

첫 등록 전에 실제 참가자를 사칭한 테스트 이슈나 가짜 점수를 만들지 않습니다. 단위 테스트는 저장 API 충돌·보존을 모의 검증하고, Playwright는 가상 순위로 공동 순위·검색·페이지 이동·모바일·제출 연결을 확인합니다. 공개 저장소이므로 악의적인 대량 제출은 이슈 잠금/사용자 차단과 Actions 실행 제한으로 운영자가 대응해야 합니다.

참고: [GitHub Issues 이벤트](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#issues), [Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents), [GITHUB_TOKEN 권한](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token).
