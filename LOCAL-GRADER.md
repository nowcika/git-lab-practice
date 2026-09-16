# 로컬 + GitHub 검증기

Node.js 20 이상과 Git이 필요합니다. 온라인 모드는 GitHub CLI(`gh`)를 설치하고 `gh auth login`으로 인증하세요. 검증기는 현재 로그인 계정을 조회하고 제출 저장소 소유자와 대조합니다. 토큰은 출력하거나 JSON에 저장하지 않습니다.

이 프로젝트 폴더에서 다음 명령을 실행하세요. `--repo`에는 **학습자가 실제로 작업한 저장소 폴더**를 넣습니다. `--repo`는 필수이며, 생략하면 현재 폴더를 채점하지 않고 오류로 멈춥니다. `node bin/grade-local.js --help`에 상황별 사용 예가 정리돼 있습니다.

```bash
# 초급 과정: 8개 항목, 100점
npm run grade:local -- --repo /path/to/student-repo --course basic --json /tmp/basic-result.json

# 실전 과정: 18개 항목, 290점
npm run grade:local -- --repo /path/to/student-fork --course scenarios --json /tmp/scenario-result.json

# 네트워크 없이 로컬 결과만 검사
npm run grade:local -- --repo /path/to/student-repo --username myname --offline

# 검증기 회귀 테스트, 전체 테스트
npm run test:local
npm test
```

Windows에서도 실행할 수 있습니다. `/path/to/...`와 `/tmp/...`를 실제 Windows 경로로 바꾸고, 공백이 있으면 경로를 큰따옴표로 감싸세요.

`--username`을 생략하면 온라인에서는 인증 계정을 사용합니다. `--github owner/repo`로 대상 저장소를 지정할 수 있지만 origin이 존재하면 같은 저장소여야 합니다. HTTPS 및 SSH GitHub origin을 지원합니다. 기본 브랜치는 `--branch`로 지정한 값이 가장 우선하고, 지정하지 않으면 온라인에서는 GitHub의 기본 브랜치, 오프라인에서는 `main`을 사용합니다.

## 판정과 근거

- `pass`: 필수 조건 충족. 온라인에서는 로컬 브랜치와 GitHub 브랜치의 최신 커밋 SHA도 일치해야 합니다.
- `fail`: 파일, 커밋 이력, 소유자, 원본 Fork, PR 또는 push 상태가 조건과 다릅니다.
- `unknown`: 인증, 네트워크, API 한도 또는 shallow clone 때문에 확인할 수 없습니다. 오프라인 계정·이슈·PR·Release·Pages도 해당합니다.

점수는 `pass` 항목만 합산합니다. `unknown`이 있으면 `complete: false`이므로 확정 점수로 취급하면 안 됩니다. 종료 코드는 전체 통과 `0`, 실패 `1`, 확인 불가 또는 실행 오류 `2`입니다. 단, `--offline`에서 원래 확인할 수 없는 항목(계정·저장소·이슈·PR 등)은 `offlineSkipped`로 표시되며 종료 코드 계산에서 제외됩니다. 따라서 오프라인에서도 로컬 항목이 전부 통과하면 `0`입니다. `summary.blocked`가 실제로 문제가 된 `확인 불가` 수입니다.

`fail`인 항목에는 사유가 함께 표시됩니다. 비공개 저장소, 인증 계정 불일치, 저장소 소유자 불일치, origin 불일치, Fork 아님은 각각 다른 문구로 구분됩니다. JSON에는 검사 시각, 모드, HEAD, 항목별 배점, 로컬/원격 SHA, 파일 존재 여부와 저장소 상태가 들어갑니다. 기존 보고서는 덮어쓰지 않으므로 재실행할 때 새 파일명을 지정하세요.

파일 검사는 작업 폴더의 미커밋 파일이 아닌 해당 브랜치의 **커밋된 파일**을 사용합니다. 로컬 `refs/heads/solution/*`가 필요하며 `origin/solution/*`만 있는 상태는 제출 브랜치로 인정하지 않습니다. 따라서 다른 PC에서 새로 clone한 경우 필요한 해결 브랜치를 로컬에 만들어야 합니다. 검증기가 자동 checkout/fetch/push/reset을 실행하지는 않습니다. 보고서 경로는 제출 저장소 밖을 권장합니다.

`revert`는 메시지만 검사하지 않고 원본 커밋이 조상으로 남아 있는지, 실제 역방향 patch가 일치하는지 검사합니다. 초급 PR은 브랜치 이름뿐 아니라 head/base 저장소도 대조해 타인 Fork의 동명 브랜치가 통과하지 않게 합니다. 이슈·PR은 페이지를 순회하며, 조회 상한 1,000개에 도달하면 실패로 단정하지 않습니다. 주석 태그는 태그 객체를 따라가 실제 커밋 SHA를 비교합니다.

## 범위와 한계

이 검증기는 현재 웹페이지 채점 기준을 기반으로 하되 소유자·push·revert 검사를 강화했습니다. 공식 정답 `nowcika/git-scenario-solution`은 이 검증기에서만 원본 Fork 조건의 예외이며, 온라인 검증은 해당 소유 계정 인증이 필요합니다. 웹 채점기는 2026-09-16부터 정답 저장소를 채점하지 않습니다(자동 테스트용 `?allowAnswerRepo=1` 제외).

remote는 이름과 GitHub 저장소를 기록하고 reflog는 항목 수를 보조 근거로 남깁니다. 최종 이력만으로 `reset`, `rebase`, `amend`, `cherry-pick` 명령을 실제로 입력했는지는 증명하지 못합니다.

`diff`·`show`·`blame`은 문구 대조를 넘어 Git 객체와 대조합니다. `diff`는 patch의 `index` 결과 blob 해시가 저장소에 실제로 존재하고 그 blob 내용이 patch에 담겨 있는지 확인하므로, 손으로 지어낸 patch는 통과하지 못합니다. `show`·`blame`은 보고서에 적은 커밋 SHA가 실제 커밋이어야 하고 함께 적은 제목·작성자가 그 커밋의 값과 일치해야 하며, `blame`은 그 커밋이 실제로 대상 줄을 추가했는지까지 확인합니다. 이 검사들은 원본 커밋이 로컬에 있어야 하므로 `git fetch upstream`을 먼저 실행하세요. 객체를 찾지 못하면 오답이 아니라 `unknown`으로 보류하고 안내 문구를 표시합니다. Release는 workflow 내용과 실제 공개 Release/asset을 확인하며, 특정 Actions 실행으로 생성됐다는 출처까지 증명하지 않습니다.

일반 clone은 원래 PC의 reflog를 가져오지 않습니다. shallow clone은 이력 관련 판정을 보류합니다. 자체 실행 JSON은 변조 방지 제출물이 아니므로 시험용 강제 채점에는 별도의 신뢰된 채점 환경이 필요합니다.

## 실제 검증 결과 (2026-09-16)

- 임시 Git 저장소 테스트: 정상 100점, README 오답 85점, push 불일치, 다른 계정/소유자/PR, API 실패, 오프라인, shallow clone, 실제/가짜 revert, merge 여부, 주석 태그, 페이지네이션 및 CLI 보고서 검사.
- 공식 정답 저장소를 임시 폴더에 clone하고 17개 solution 로컬 브랜치를 준비해 실제 인증 계정과 GitHub SHA 대조: **290/290점, 18개 통과**.
- 2026-09-16 검토 수정 후 단위 테스트 19개 재통과(오프라인 종료 코드, 항목별 실패 사유, `--branch` 우선순위, `--repo` 필수화 포함).
- 테스트는 GitHub 저장소를 생성·수정하거나 push하지 않습니다. 테스트용 로컬 저장소만 생성·수정합니다.
