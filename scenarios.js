'use strict';
const scenarioRoot = document.getElementById('scenarioApp');
// 공식 정답 저장소로는 점수를 낼 수 없습니다. UI 자동 테스트만 ?allowAnswerRepo=1로 예외를 켭니다.
const answerRepoAllowed = new URLSearchParams(location.search).get('allowAnswerRepo') === '1';
const OFFICIAL_ANSWER = 'nowcika/git-scenario-solution';
// diff·show·blame은 정답 문구를 코드에 박아 두지 않고, 채점 시점에 원본 저장소에서 직접 계산합니다.
const UPSTREAM_REPO = 'nowcika/git-scenario-lab';
const UPSTREAM_BASE = `/repos/${UPSTREAM_REPO}`;
const scenarioDefinitions = [
  { id:'fork', no:'00', title:'Fork하고 clone하기', points:15, level:'필수 준비', goal:'원본 저장소를 자신의 GitHub 계정으로 Fork하고 로컬에 clone합니다.', commands:`# 1. 아래 ‘원본 저장소 Fork’ 버튼을 먼저 누릅니다.
# 2. 내 Fork의 주소로 clone합니다.
git clone https://github.com/내사용자이름/git-scenario-lab.git
cd git-scenario-lab
git remote -v

# 원본 저장소를 upstream이라는 이름으로 연결합니다.
git remote add upstream https://github.com/nowcika/git-scenario-lab.git
git fetch upstream
git remote -v`, checks:['GitHub 저장소 화면에 “forked from nowcika/git-scenario-lab”이 표시되는가?', '`origin`은 내 Fork, `upstream`은 교육용 원본 주소인가?', '브라우저 다운로드 ZIP이 아니라 `git clone`을 사용했는가?'], verify:'Fork 관계와 소유 계정을 GitHub API로 검사합니다. clone 여부와 로컬 remote 이름은 공개되지 않아 이후 결과로 간접 확인합니다.',
    usage:[
      ['git clone', [
        ['git clone <주소>', '기본. 전체 이력을 포함해 현재 폴더 아래에 저장소 폴더를 만듭니다.'],
        ['git clone <주소> my-folder', '폴더 이름을 직접 정할 때. 같은 저장소를 두 벌 받아 비교할 때 편합니다.'],
        ['git clone --depth 1 <주소>', '최신 커밋 1개만 받는 shallow clone. 용량은 작지만 이력 조회·채점이 제한됩니다.'],
        ['git clone -b <브랜치> <주소>', '특정 브랜치를 바로 체크아웃하며 받습니다.'],
        ['git clone --filter=blob:none <주소>', '파일 내용은 필요할 때 받아오는 부분 clone. 대형 저장소에서 유용합니다.']
      ]],
      ['git remote', [
        ['git remote -v', '등록된 원격 주소를 fetch/push용으로 나눠 확인합니다. 가장 먼저 쓰는 점검 명령입니다.'],
        ['git remote add <이름> <주소>', '원격을 추가합니다. 관례상 내 저장소는 origin, 원본은 upstream입니다.'],
        ['git remote set-url origin <주소>', '주소를 잘못 넣었을 때 교체합니다. remove 후 add보다 안전합니다.'],
        ['git remote rename upstream original', '이름만 바꿉니다. 이력이나 추적 브랜치는 그대로 유지됩니다.'],
        ['git remote show origin', '원격 브랜치와 추적 상태까지 자세히 봅니다(네트워크 조회 발생).'],
        ['git remote prune origin', '원격에서 삭제된 브랜치의 로컬 추적 정보를 정리합니다.']
      ]]
    ] },
  { id:'upstream', no:'01', title:'upstream 변경 가져오기', points:15, level:'Remote · Merge', goal:'원본의 업데이트 브랜치를 fetch한 뒤 해결 브랜치에 병합합니다.', commands:`git fetch upstream
git switch -c solution/upstream-sync main
git merge upstream/scenario/upstream-update
git push -u origin solution/upstream-sync`, checks:['`git fetch upstream`에서 저장소 주소 오류가 없는가?', '`instructor-update.md`에 `UPSTREAM-SYNC-COMPLETE`가 있는가?', '`solution/upstream-sync`를 origin에 push했는가?'], verify:'해결 브랜치의 instructor-update.md, 고유 표시 문구, 그리고 실제 merge 커밋(부모 2개)을 함께 검사합니다.',
    usage:[
      ['git fetch', [
        ['git fetch upstream', '원격 변경을 받아오되 내 브랜치는 건드리지 않습니다. 가장 안전한 동기화 첫 단계입니다.'],
        ['git fetch --all --prune', '모든 원격을 갱신하고 삭제된 원격 브랜치 정보를 정리합니다.'],
        ['git fetch upstream main:main', '체크아웃하지 않은 채 로컬 main을 원격 main으로 바로 갱신합니다.'],
        ['git fetch --tags', '태그까지 받아옵니다. 릴리스 확인 전에 자주 씁니다.'],
        ['git fetch --dry-run', '무엇을 받아올지 미리 확인만 합니다.']
      ]],
      ['git merge', [
        ['git merge <브랜치>', '기본. 빨리 감기(fast-forward)가 가능하면 merge 커밋 없이 이동합니다.'],
        ['git merge --no-ff <브랜치>', '항상 merge 커밋을 만들어 "언제 합쳤는지"를 이력에 남깁니다.'],
        ['git merge --ff-only <브랜치>', '빨리 감기가 불가능하면 실패시킵니다. 이력을 선형으로 유지하는 팀에서 사용합니다.'],
        ['git merge --squash <브랜치>', '변경만 가져와 한 커밋으로 합칩니다. 커밋이 자동 생성되지 않으므로 직접 commit 해야 합니다.'],
        ['git merge --abort', '충돌 중 병합을 통째로 취소하고 병합 전 상태로 되돌립니다.'],
        ['git merge --no-commit <브랜치>', '병합 결과를 스테이지까지만 만들고 커밋 전에 검토합니다.']
      ]],
      ['git switch', [
        ['git switch <브랜치>', '기존 브랜치로 이동합니다(checkout의 안전한 대체 명령).'],
        ['git switch -c <새브랜치>', '현재 위치에서 새 브랜치를 만들고 이동합니다.'],
        ['git switch -c <새브랜치> <기준>', '기준을 명시해 새 브랜치를 만듭니다. 예: upstream/scenario/x'],
        ['git switch -', '바로 직전 브랜치로 되돌아갑니다.'],
        ['git switch --detach <커밋>', '브랜치 없이 특정 커밋 상태를 살펴봅니다(detached HEAD).']
      ]]
    ] },
  { id:'conflict', no:'02', title:'pull·merge conflict 해결하기', points:20, level:'Conflict', goal:'서로 같은 줄을 바꾼 두 브랜치를 병합하고 양쪽 작업이 모두 남도록 충돌을 해결합니다.', commands:`git fetch upstream
git switch -c solution/conflict upstream/scenario/conflict-left
git merge --no-ff upstream/scenario/conflict-right

# 충돌 발생 후 team-plan.md를 열어 <<<<<<<, =======, >>>>>>> 제거
# 아래 세 줄이 모두 남도록 직접 정리합니다.
# - 프론트엔드: UI 배포 준비
# - 백엔드: API 배포 준비
# - 공동 확인: 통합 테스트 완료

git add team-plan.md
git commit
git push -u origin solution/conflict`, checks:['`git status`가 “both added” 또는 “unmerged paths”를 보여 주는가?', '충돌 표시 3종을 모두 제거했는가?', '프론트엔드·백엔드·통합 테스트 문구를 모두 작성했는가?', 'merge를 중단하거나 한쪽 파일만 선택하지 않고 merge commit을 완성했는가?'], verify:'파일의 세 가지 필수 문구와 부모가 2개 이상인 merge commit을 검사합니다.',
    usage:[
      ['충돌 상태 확인', [
        ['git status', '어떤 파일이 unmerged인지 가장 먼저 확인합니다.'],
        ['git diff', '충돌 중에는 양쪽 차이를 한 번에 보여 줍니다.'],
        ['git diff --name-only --diff-filter=U', '충돌한 파일 이름만 뽑습니다. 파일이 많을 때 유용합니다.'],
        ['git log --merge -p <파일>', '충돌에 관련된 양쪽 커밋만 골라 봅니다.']
      ]],
      ['충돌 해결 선택', [
        ['git checkout --ours <파일>', '내 브랜치(현재 브랜치) 버전을 그대로 선택합니다.'],
        ['git checkout --theirs <파일>', '가져오는 브랜치 버전을 그대로 선택합니다.'],
        ['git restore --merge <파일>', '잘못 편집했을 때 충돌 표시가 있는 원래 상태로 되돌립니다.'],
        ['git mergetool', '설정된 3-way 병합 도구를 띄웁니다.'],
        ['git add <파일>', '해결 완료 표시. add 해야 unmerged 상태가 풀립니다.']
      ]],
      ['중단과 재시도', [
        ['git merge --abort', '병합 전 상태로 완전히 되돌립니다.'],
        ['git reset --merge', '충돌 중 스테이지와 작업 트리를 함께 되돌립니다.'],
        ['git rerere (설정)', '같은 충돌을 반복 해결할 때 이전 해결책을 재사용합니다.'],
        ['git commit', '메시지를 비우면 Git이 만든 기본 merge 메시지를 사용합니다.']
      ]]
    ] },
  { id:'external', no:'03', title:'다른 저장소를 remote로 연결하기', points:15, level:'Multiple Remotes', goal:'외부 자료 저장소를 별도 remote로 연결하고 파일을 현재 저장소에 반영합니다.', commands:`git switch main
git switch -c solution/external-remote
git remote add external https://github.com/nowcika/git-scenario-library.git
git fetch external
git show external/main:shared-config.json > shared-config.json
git add shared-config.json
git commit -m "feat: import shared config from external remote"
git push -u origin solution/external-remote`, checks:['`git remote -v`에 origin, upstream, external 세 주소가 구분되는가?', '`git fetch external` 후 `external/main`이 보이는가?', 'shared-config.json의 marker가 `REMOTE-LIBRARY-V1`인가?'], verify:'외부 저장소에만 제공된 shared-config.json의 고유 내용과 커밋 메시지를 검사합니다.',
    usage:[
      ['다른 저장소에서 파일 가져오기', [
        ['git show <원격>/<브랜치>:<파일> > <파일>', '한 파일만 현재 폴더로 꺼냅니다. 이력은 가져오지 않습니다.'],
        ['git checkout <원격>/<브랜치> -- <경로>', '여러 파일·폴더를 한 번에 가져와 스테이지에 올립니다.'],
        ['git restore --source=<원격>/<브랜치> <경로>', '위와 같은 동작의 최신 명령입니다.'],
        ['git cherry-pick <커밋>', '파일이 아니라 커밋 단위로 가져옵니다(이력과 메시지 유지).'],
        ['git subtree add --prefix=vendor <주소> main', '다른 저장소 전체를 하위 폴더로 합칩니다.'],
        ['git submodule add <주소> vendor', '다른 저장소를 링크로 연결합니다. 받는 쪽도 별도 init이 필요합니다.']
      ]],
      ['여러 원격 다루기', [
        ['git remote add <이름> <주소>', 'origin 외에 upstream, external 등 목적별로 이름을 붙입니다.'],
        ['git fetch <이름>', '해당 원격만 갱신합니다. 한도와 시간을 아낄 수 있습니다.'],
        ['git branch -r', '원격 추적 브랜치 목록을 봅니다(external/main 확인).'],
        ['git push <이름> <브랜치>', '원격을 지정해 push합니다. 실수 방지를 위해 이름을 명시하세요.'],
        ['git remote remove <이름>', '더 필요 없는 원격을 제거합니다. 이력에는 영향이 없습니다.']
      ]]
    ] },
  { id:'revert', no:'04', title:'잘못 올라간 커밋 되돌리기', points:15, level:'History · Revert', goal:'과거 기록을 삭제하지 않고 새 revert 커밋으로 실수한 변경을 취소합니다.', commands:`git fetch upstream
git switch -c solution/revert upstream/scenario/revert
git log --oneline -3
git revert HEAD
git push -u origin solution/revert`, checks:['`secrets.env`가 작업 폴더에서 제거됐는가?', '`app.conf`는 그대로 남아 있는가?', '`git log`에 원래 커밋과 Revert 커밋이 모두 보이는가?', '`reset --hard`나 force push로 기록을 지우지 않았는가?'], verify:'secrets.env 부재, app.conf 존재, Revert 커밋 메시지를 검사합니다.',
    usage:[
      ['git revert', [
        ['git revert <커밋>', '해당 커밋의 변경을 거꾸로 적용하는 새 커밋을 만듭니다. 이력은 지우지 않습니다.'],
        ['git revert HEAD~2..HEAD', '연속된 여러 커밋을 한꺼번에 되돌립니다(최신부터 역순으로 적용).'],
        ['git revert -n <커밋>', '커밋하지 않고 변경만 적용해, 여러 revert를 한 커밋으로 묶습니다.'],
        ['git revert -m 1 <머지커밋>', 'merge 커밋을 되돌립니다. -m 1은 "main 쪽을 기준으로"라는 뜻입니다.'],
        ['git revert --abort', '충돌이 생겼을 때 revert 작업을 취소합니다.'],
        ['git revert --continue', '충돌을 해결한 뒤 이어서 진행합니다.']
      ]],
      ['revert vs reset 선택', [
        ['이미 push 했다면 → revert', '다른 사람이 받은 커밋을 지우면 모두의 이력이 어긋납니다.'],
        ['내 PC에만 있다면 → reset', '아직 공유 전이라면 깔끔하게 커밋을 없앨 수 있습니다.'],
        ['파일 하나만 되돌리려면', 'git checkout <커밋>~1 -- <파일> 후 커밋합니다.'],
        ['유출 파일을 이력에서 지우려면', 'revert로는 부족합니다. git filter-repo 사용과 비밀키 재발급이 필요합니다.']
      ]]
    ] },
  { id:'rebase', no:'05', title:'작업 브랜치를 최신 기준에 rebase하기', points:15, level:'History · Rebase', goal:'토픽 커밋을 새로운 기준 브랜치 위로 재배치해 선형 이력을 만듭니다.', commands:`git fetch upstream
git switch -c solution/rebase upstream/scenario/rebase-topic
git rebase upstream/scenario/rebase-base
git log --oneline --graph -5
git push -u origin solution/rebase`, checks:['base-update.txt와 topic.txt가 모두 존재하는가?', '두 커밋이 한 줄의 선형 이력으로 보이는가?', 'merge commit 없이 토픽 커밋이 기준 변경 뒤에 위치하는가?'], verify:'두 결과 파일, 관련 커밋 메시지, merge commit이 없는 선형 이력을 검사합니다.',
    usage:[
      ['git rebase', [
        ['git rebase <기준>', '현재 브랜치의 커밋을 기준 브랜치 끝으로 옮겨 붙입니다.'],
        ['git rebase -i HEAD~3', '대화형. 커밋을 합치고(squash), 순서를 바꾸고, 메시지를 고칩니다.'],
        ['git rebase --onto <새기준> <옛기준> <브랜치>', '잘못된 기준에서 뻗은 브랜치를 정확히 옮깁니다.'],
        ['git rebase --continue / --skip / --abort', '충돌 처리 3종 세트. abort는 시작 전 상태로 되돌립니다.'],
        ['git rebase --autosquash', 'fixup!/squash! 커밋을 자동으로 제자리에 합칩니다.'],
        ['git pull --rebase', 'merge 커밋 없이 원격 변경 위로 내 커밋을 재배치합니다.']
      ]],
      ['rebase 주의', [
        ['공유된 브랜치는 rebase 금지', 'SHA가 전부 바뀌어 동료의 이력과 충돌합니다.'],
        ['force push가 필요할 때', 'git push --force-with-lease 를 쓰면 남의 새 커밋을 덮어쓰지 않습니다.'],
        ['되돌리고 싶을 때', 'git reflog 에서 rebase 전 SHA를 찾아 git reset --hard <SHA>'],
        ['merge와의 차이', 'merge는 합친 사실을 남기고, rebase는 한 줄로 정리합니다.']
      ]]
    ] },
  { id:'reset', no:'06', title:'git reset으로 최근 커밋 제거하기', points:15, level:'History · Reset', goal:'아직 공유하면 안 되는 최근 실험 커밋을 브랜치에서 제거하고 안정 상태로 되돌립니다.', commands:`git fetch upstream
git switch -c solution/reset upstream/scenario/reset
git log --oneline -3
# 최근 실험 커밋과 작업 파일을 함께 제거합니다.
git reset --hard HEAD~1
git status
git log --oneline -3
git push -u origin solution/reset`, checks:['reset 전 두 커밋의 순서를 log에서 확인했는가?', '`--hard`는 커밋과 작업 파일을 함께 버린다는 점을 이해했는가?', 'stable-config.txt는 남고 unwanted-experiment.txt는 사라졌는가?', '이미 공유한 협업 브랜치에서는 reset과 force push를 함부로 사용하지 않아야 한다.'], verify:'안정 설정 파일 존재, 실험 파일 부재, 해결 브랜치 끝 커밋을 검사합니다.',
    usage:[
      ['git reset 세 가지 모드', [
        ['git reset --soft HEAD~1', '커밋만 취소. 변경은 스테이지에 그대로 남습니다. 커밋을 다시 묶을 때 사용합니다.'],
        ['git reset --mixed HEAD~1', '기본값. 커밋과 스테이지를 취소하고 파일 변경은 남깁니다.'],
        ['git reset --hard HEAD~1', '커밋·스테이지·파일 변경을 모두 버립니다. 되돌리려면 reflog가 필요합니다.'],
        ['git reset <파일>', '스테이지에서만 내립니다(= git restore --staged <파일>).'],
        ['git reset --hard origin/main', '로컬을 원격 상태로 강제로 맞춥니다. 로컬 변경은 사라집니다.']
      ]],
      ['비슷하지만 다른 명령', [
        ['git restore <파일>', '작업 폴더의 변경만 취소합니다(커밋·스테이지 영향 없음).'],
        ['git restore --staged <파일>', '스테이지만 취소합니다.'],
        ['git clean -nd', '추적되지 않는 파일을 "미리보기"합니다. -n을 빼면 실제 삭제됩니다.'],
        ['git stash', '지금 변경을 잠시 치워 둡니다. reset 대신 안전하게 작업을 보류할 때 씁니다.'],
        ['git stash pop', '치워 둔 변경을 다시 꺼냅니다.']
      ]]
    ] },
  { id:'reflog', no:'07', title:'git reflog로 잃어버린 커밋 복구하기', points:15, level:'Recovery · Reflog', goal:'직접 만든 커밋을 reset으로 잃어버린 뒤 reflog에서 SHA를 찾아 복구합니다.', commands:`git fetch upstream
git switch -c solution/reflog upstream/scenario/reflog-base
echo "REFLOG-RECOVERED-COMMIT" > recovered-note.txt
git add recovered-note.txt
git commit -m "docs: add recoverable note"

# 방금 커밋을 일부러 잃어버립니다.
git reset --hard HEAD~1
git reflog
# reflog에서 'docs: add recoverable note'의 SHA를 복사합니다.
git cherry-pick <찾은-SHA>
git push -u origin solution/reflog`, checks:['reset 직후 recovered-note.txt가 사라졌는가?', '`git reflog`에 잃어버린 커밋 메시지가 보이는가?', '해당 SHA를 cherry-pick한 뒤 파일이 복구됐는가?', 'reflog는 로컬 저장소 기록이므로 다른 PC나 GitHub에서 대신 볼 수 없다는 점을 이해했는가?'], verify:'복구된 고유 문구와 복구 커밋 메시지를 검사합니다.',
    usage:[
      ['git reflog', [
        ['git reflog', 'HEAD가 지나온 모든 위치를 시간순으로 봅니다. 잃어버린 커밋을 찾는 첫 명령입니다.'],
        ['git reflog show <브랜치>', '특정 브랜치가 움직인 기록만 봅니다.'],
        ['git reflog --date=iso', '언제 이동했는지 날짜와 함께 봅니다.'],
        ['git reflog expire --expire=now --all', '기록을 즉시 정리합니다(복구 불가, 평소에는 쓰지 마세요).'],
        ['HEAD@{5} / HEAD@{2.hours.ago}', 'reflog 위치는 이런 표기로 바로 참조할 수 있습니다.']
      ]],
      ['복구 방법 고르기', [
        ['git cherry-pick <SHA>', '잃어버린 커밋 하나를 현재 브랜치에 다시 올립니다.'],
        ['git reset --hard <SHA>', '브랜치 전체를 그 시점으로 되돌립니다.'],
        ['git branch rescue <SHA>', '잃어버린 커밋에 이름을 붙여 안전하게 보관합니다.'],
        ['git fsck --lost-found', 'reflog에도 없는 고아 커밋을 찾습니다. 최후의 수단입니다.'],
        ['git stash list / git stash apply', 'stash로 치워 둔 변경도 같은 방식으로 복구합니다.']
      ]]
    ] },
  { id:'amend', no:'08', title:'git commit --amend로 마지막 커밋 수정하기', points:15, level:'History · Amend', goal:'마지막 커밋의 파일 오타와 커밋 메시지를 새 커밋을 추가하지 않고 바로잡습니다.', commands:`git fetch upstream
git switch -c solution/amend upstream/scenario/amend
# release-note.md를 아래처럼 수정합니다.
# # Release Note
# Version: draft

git add release-note.md
git commit --amend -m "docs: add release note"
git log --oneline -2
git push -u origin solution/amend`, checks:['수정 대상이 가장 최근 커밋인가?', '파일에서 `Releas`, `draff` 오타를 모두 고쳤는가?', '새 커밋을 하나 더 만든 것이 아니라 amend로 기존 커밋을 교체했는가?', '이미 다른 사람이 받은 커밋을 amend하면 SHA가 바뀐다는 점을 이해했는가?'], verify:'수정된 파일 내용, 정확한 최신 메시지, 기존 오타 메시지 부재를 검사합니다.',
    usage:[
      ['git commit --amend', [
        ['git commit --amend', '에디터를 열어 메시지를 고칩니다. 스테이지에 올린 변경도 함께 합쳐집니다.'],
        ['git commit --amend -m "새 메시지"', '에디터 없이 메시지만 교체합니다.'],
        ['git commit --amend --no-edit', '메시지는 그대로 두고 빠뜨린 파일만 추가합니다. 가장 자주 쓰는 형태입니다.'],
        ['git commit --amend --author="이름 <메일>"', '작성자 정보를 바로잡습니다.'],
        ['git commit --amend --date=now', '커밋 날짜를 현재로 바꿉니다.']
      ]],
      ['더 오래된 커밋을 고칠 때', [
        ['git rebase -i HEAD~3 → reword', '메시지만 고칩니다.'],
        ['git rebase -i HEAD~3 → edit', '해당 커밋에서 멈춰 파일을 고친 뒤 --continue 합니다.'],
        ['git commit --fixup <SHA> + rebase -i --autosquash', '수정 커밋을 만들어 두고 나중에 자동으로 합칩니다.'],
        ['push 이후라면', 'git push --force-with-lease 가 필요하며, 공유 브랜치에서는 팀과 합의하세요.']
      ]]
    ] },
  { id:'cherry', no:'09', title:'git cherry-pick으로 필요한 커밋만 가져오기', points:15, level:'History · Cherry-pick', goal:'다른 브랜치 전체를 병합하지 않고 긴급 수정 커밋 하나만 선택해 적용합니다.', commands:`git fetch upstream
git switch -c solution/cherry-pick main
# 소스 브랜치의 커밋 SHA를 확인합니다.
git log --oneline upstream/scenario/cherry-source -1
# 표시된 SHA를 사용합니다.
git cherry-pick <긴급수정-SHA>
git push -u origin solution/cherry-pick`, checks:['소스 브랜치의 최신 SHA를 정확히 복사했는가?', 'merge 대신 cherry-pick을 실행했는가?', 'urgent-fix.txt에 `CHERRY-PICK-HOTFIX-2026`이 있는가?', '커밋 메시지가 긴급 수정 메시지로 유지됐는가?'], verify:'긴급 수정 파일과 cherry-pick된 커밋 메시지, merge commit 부재를 검사합니다.',
    usage:[
      ['git cherry-pick', [
        ['git cherry-pick <SHA>', '커밋 하나를 현재 브랜치에 복제합니다. 내용은 같고 SHA는 새로 생깁니다.'],
        ['git cherry-pick <A>^..<B>', '연속된 커밋 구간을 순서대로 적용합니다.'],
        ['git cherry-pick -n <SHA>', '커밋하지 않고 변경만 올려 여러 개를 한 커밋으로 묶습니다.'],
        ['git cherry-pick -x <SHA>', '"cherry picked from ..." 줄을 메시지에 남겨 출처를 기록합니다.'],
        ['git cherry-pick -m 1 <머지커밋>', 'merge 커밋을 가져올 때 기준 부모를 지정합니다.'],
        ['git cherry-pick --continue / --abort / --quit', '충돌 처리 3종 세트입니다.']
      ]],
      ['적용 대상 찾기', [
        ['git log --oneline <브랜치> -5', '가져올 커밋의 SHA를 확인합니다.'],
        ['git log --oneline main..<브랜치>', '기준 브랜치에 없는 커밋만 골라 봅니다.'],
        ['git cherry -v main <브랜치>', '아직 반영되지 않은 커밋에 + 표시를 해 줍니다.'],
        ['git show <SHA>', '가져오기 전에 변경 내용을 확인합니다.']
      ]]
    ] },
  { id:'diff', no:'10', title:'git diff로 두 상태 비교하기', points:15, level:'Inspect · Diff', goal:'두 원격 브랜치의 파일·줄 변경을 비교하고 실제 patch 형식의 분석 결과를 제출합니다.', commands:`git fetch upstream
git switch -c solution/diff main
mkdir -p reports
git diff upstream/scenario/diff-base..upstream/scenario/diff-target > reports/change.patch

git diff --stat upstream/scenario/diff-base..upstream/scenario/diff-target
git diff --name-status upstream/scenario/diff-base..upstream/scenario/diff-target
cat reports/change.patch
git add reports/change.patch
git commit -m "docs: submit diff analysis"
git push -u origin solution/diff`, checks:['비교 순서가 base → target인가? 순서를 바꾸면 +와 -가 반대로 보입니다.', 'patch에 service.conf 변경과 deploy.conf 추가가 모두 보이는가?', '`git diff`가 만든 출력을 그대로 저장했는가? 손으로 적은 요약은 통과하지 않습니다.', 'patch에 `diff --git`, `index`, `@@` 줄이 모두 들어 있는가?', '`--stat`, `--name-status`, 일반 diff의 출력 차이를 확인했는가?'], verify:'채점 시점에 원본 두 브랜치를 GitHub compare API로 비교해, 제출한 patch의 파일 목록·index blob 해시·hunk 헤더·추가/삭제 줄이 실제 diff와 일치하는지 대조합니다.',
    usage:[
      ['비교 대상 고르기', [
        ['git diff', '아직 스테이지에 올리지 않은 변경만 봅니다.'],
        ['git diff --staged', '스테이지에 올린 변경, 즉 다음 커밋에 들어갈 내용을 봅니다.'],
        ['git diff HEAD', '작업 폴더 전체를 마지막 커밋과 비교합니다.'],
        ['git diff <A>..<B>', '두 커밋/브랜치의 최종 상태를 비교합니다.'],
        ['git diff <A>...<B>', '공통 조상 이후 B에서만 생긴 변경을 봅니다. PR 화면과 같은 기준입니다.'],
        ['git diff <브랜치> -- <경로>', '특정 파일·폴더로 범위를 좁힙니다.']
      ]],
      ['출력 형태 바꾸기', [
        ['--stat', '파일별 변경 줄 수 요약만 봅니다.'],
        ['--name-status', '파일 이름과 A(추가)/M(수정)/D(삭제)만 봅니다.'],
        ['--word-diff', '줄 단위가 아니라 단어 단위로 표시합니다. 문서 비교에 좋습니다.'],
        ['--ignore-all-space', '공백 차이를 무시합니다. 들여쓰기만 바뀐 경우에 유용합니다.'],
        ['> change.patch', '결과를 파일로 저장합니다. git apply로 다시 적용할 수 있습니다.'],
        ['git apply --check change.patch', '적용 가능한지 미리 확인만 합니다.']
      ]]
    ] },
  { id:'show', no:'11', title:'git show로 특정 커밋 조사하기', points:15, level:'Inspect · Show', goal:'브랜치의 최신 커밋 하나를 조사해 작성자·메시지·변경 내용을 보고서로 남깁니다.', commands:`git fetch upstream
git switch -c solution/show main
git log --oneline upstream/scenario/show-source -1
git show --stat upstream/scenario/show-source
git show upstream/scenario/show-source

# 위 출력에서 아래 다섯 가지를 직접 읽어 채웁니다.
#   commit 줄의 SHA / Author 이름 / 제목 줄 / 바뀐 파일 이름 / 추가된 줄의 문구
mkdir -p reports
cat > reports/show-report.md <<'REPORT'
# git show 조사 결과
커밋 SHA: <commit 줄의 40자리 SHA>
작성자: <Author 줄의 이름>
커밋 메시지: <제목 줄 전체>
증거 문구: <추가된 줄에 적힌 문구>
변경 파일: <바뀐 파일 이름>
REPORT

git add reports/show-report.md
git commit -m "docs: report inspected commit"
git push -u origin solution/show`, checks:['`git show`가 commit 정보와 patch를 함께 출력하는지 확인했는가?', '`git show --stat`은 요약만 보여 주는 차이를 확인했는가?', '보고서의 SHA·작성자·메시지·파일 이름·증거 문구가 실제 출력과 모두 일치하는가?', 'SHA는 7자리 이상 적어야 합니다. 앞 7자리만 적어도 됩니다.'], verify:'채점 시점에 원본 저장소의 scenario/show-source 커밋을 직접 조회해, 보고서의 SHA·작성자·커밋 메시지·변경 파일·증거 문구를 모두 대조합니다. 정답 문구는 채점기에 저장돼 있지 않습니다.',
    usage:[
      ['git show', [
        ['git show <SHA>', '커밋 정보와 변경 내용(patch)을 함께 봅니다.'],
        ['git show --stat <SHA>', '어떤 파일이 몇 줄 바뀌었는지 요약만 봅니다.'],
        ['git show <SHA>:<파일>', '그 시점의 파일 전체 내용을 봅니다. 과거 버전 복원에 사용합니다.'],
        ['git show --name-only <SHA>', '바뀐 파일 이름만 봅니다.'],
        ['git show <태그>', '주석 태그의 메시지와 가리키는 커밋을 봅니다.'],
        ['git show HEAD~2', '두 단계 전 커밋을 봅니다. 브랜치 이름이나 HEAD@{n}도 됩니다.']
      ]],
      ['조사에 함께 쓰는 명령', [
        ['git log -1 --format=%an,%ae,%ad', '작성자와 날짜만 뽑아냅니다.'],
        ['git log --graph --oneline --all', '브랜치 구조를 그림처럼 봅니다.'],
        ['git log -S"문자열"', '그 문자열이 추가·삭제된 커밋을 찾습니다.'],
        ['git log --grep="메시지"', '커밋 메시지로 검색합니다.'],
        ['git describe <SHA>', '가장 가까운 태그를 기준으로 커밋을 사람이 읽기 쉽게 표현합니다.']
      ]]
    ] },
  { id:'patch', no:'12', title:'format-patch와 git am으로 변경 전달하기', points:15, level:'Patch · Email Flow', goal:'소스 커밋을 patch 파일로 내보낸 뒤 다른 브랜치에 커밋 정보와 함께 적용합니다.', commands:`git fetch upstream
# 소스 브랜치 최신 커밋을 이메일 patch 파일로 만듭니다.
git format-patch -1 upstream/scenario/patch-source --stdout > transfer.patch
less transfer.patch

git switch -c solution/patch main
git am transfer.patch
rm transfer.patch
git log --oneline -2
git push -u origin solution/patch`, checks:['patch 안에 From, Date, Subject와 파일 diff가 있는가?', '`git apply`와 달리 `git am`은 커밋 정보까지 생성한다는 점을 확인했는가?', '충돌 시 `git am --continue` 또는 `git am --abort`를 사용할 수 있는가?'], verify:'전달된 기능 파일, 원래 Subject의 커밋, merge 없는 이력을 검사합니다.',
    usage:[
      ['git format-patch', [
        ['git format-patch -1 <SHA>', '커밋 1개를 0001-*.patch 파일로 만듭니다.'],
        ['git format-patch main..feature', '기준 대비 새 커밋 전부를 번호가 붙은 여러 파일로 만듭니다.'],
        ['git format-patch -3 --stdout > all.patch', '최근 3개를 한 파일로 합칩니다.'],
        ['git format-patch --cover-letter', '전체 설명을 담는 표지 메일을 함께 만듭니다.'],
        ['git format-patch -o outbox main..feature', '결과 파일을 지정 폴더에 모읍니다.']
      ]],
      ['적용하기: am vs apply', [
        ['git am <파일>', '작성자·날짜·메시지를 그대로 살려 커밋까지 만듭니다.'],
        ['git apply <파일>', '변경만 적용합니다. 커밋은 직접 해야 합니다.'],
        ['git apply --check <파일>', '적용 가능한지 확인만 합니다(파일은 그대로).'],
        ['git apply --3way <파일>', '충돌 시 3-way 병합으로 해결을 시도합니다.'],
        ['git am --continue / --skip / --abort', '충돌 처리 3종 세트입니다.'],
        ['git am --show-current-patch', '멈춘 지점의 patch 내용을 확인합니다.']
      ]]
    ] },
  { id:'blame', no:'13', title:'git blame으로 특정 줄의 변경자 찾기', points:15, level:'Inspect · Blame', goal:'여러 사람이 편집한 파일에서 문제의 줄을 마지막으로 변경한 작성자와 커밋을 추적합니다.', commands:`git fetch upstream
git switch -c solution/blame main
git blame upstream/scenario/blame -- audit-checklist.md
git blame -L 4,4 upstream/scenario/blame -- audit-checklist.md
git log -p upstream/scenario/blame -- audit-checklist.md

# blame 출력의 SHA를 골라 그 커밋을 다시 확인합니다.
git show <blame이 알려 준 SHA>

mkdir -p reports
cat > reports/blame-answer.md <<'ANSWER'
# blame 조사 답안
대상: <4번째 줄에 적힌 승인 코드>
커밋 SHA: <blame이 알려 준 SHA>
작성자: <그 커밋의 작성자 이름>
커밋 메시지: <그 커밋의 제목 줄>
ANSWER

git add reports/blame-answer.md
git commit -m "docs: submit blame investigation"
git push -u origin solution/blame`, checks:['파일 전체 blame과 `-L 4,4`의 범위 제한을 모두 실행했는가?', 'blame 결과의 작성자와 커밋 SHA를 구분했는가?', '그 SHA를 `git show`로 다시 확인했는가?', '가장 최근 커밋이 아니라 해당 줄을 바꾼 커밋을 골랐는가?', 'blame은 비난이 아니라 변경 이유를 찾는 조사 도구로 사용해야 합니다.'], verify:'채점 시점에 원본 저장소에서 그 줄을 추가한 커밋을 직접 찾아, 답안의 SHA·작성자·커밋 메시지·대상 문구를 대조합니다. 파일의 최신 커밋을 적으면 통과하지 않습니다.',
    usage:[
      ['git blame', [
        ['git blame <파일>', '줄마다 마지막으로 바꾼 커밋과 작성자를 표시합니다.'],
        ['git blame -L 10,20 <파일>', '10~20번째 줄로 범위를 좁힙니다. 큰 파일에서 필수입니다.'],
        ['git blame -w <파일>', '공백 변경은 무시해 진짜 변경자를 찾습니다.'],
        ['git blame -C -M <파일>', '파일 이동·복사를 추적해 원래 작성자를 찾아냅니다.'],
        ['git blame <커밋> -- <파일>', '특정 시점 기준으로 조사합니다.'],
        ['git blame --since=3.months <파일>', '최근 변경만 대상으로 봅니다.']
      ]],
      ['blame 다음 단계', [
        ['git show <SHA>', 'blame이 알려 준 커밋의 전체 변경과 이유를 확인합니다.'],
        ['git log -L 10,20:<파일>', '해당 줄 범위의 변경 이력을 시간순으로 따라갑니다.'],
        ['git log --follow <파일>', '파일 이름이 바뀐 이력까지 이어서 봅니다.'],
        ['git bisect start', '언제부터 문제가 생겼는지 이진 탐색으로 찾습니다.']
      ]]
    ] },
  { id:'workflow', no:'14', title:'브랜치를 오가며 커밋 이동·수정하기', points:20, level:'Branch · Commit Workflow', goal:'두 브랜치에서 독립 작업하고 한 커밋을 다른 브랜치로 옮긴 뒤 amend로 다듬습니다.', commands:`git fetch upstream
# 첫 번째 브랜치 작업
git switch -c solution/branch-a upstream/scenario/branch-workflow
echo "BRANCH-A-ORIGINAL" > frontend-task.txt
git add frontend-task.txt
git commit -m "wip: add frontend task"
git push -u origin solution/branch-a

# 두 번째 브랜치 작업
git switch -c solution/branch-b upstream/scenario/branch-workflow
echo "BRANCH-B-BACKEND" > backend-task.txt
git add backend-task.txt
git commit -m "feat: add backend task"

# branch-a의 커밋을 branch-b로 옮긴 뒤 내용과 메시지를 수정
git cherry-pick solution/branch-a
echo "MOVED-AND-AMENDED-2026" > frontend-task.txt
git add frontend-task.txt
git commit --amend -m "feat: move and refine shared task"
git push -u origin solution/branch-b

# 빠르게 직전 브랜치로 이동
git switch -
git status`, checks:['브랜치 이동 전 변경을 커밋해 작업 폴더가 깨끗한가?', 'branch-a에는 frontend 파일만 있고 backend 파일은 없는가?', 'branch-b에는 backend 파일과 수정된 frontend 파일이 모두 있는가?', 'branch-b 최신 메시지가 amend한 메시지인가?', '`git switch -`가 바로 이전 브랜치로 이동하는 것을 확인했는가?'], verify:'두 원격 브랜치의 파일 격리, 이동·수정된 내용, 최신 커밋 메시지와 선형 이력을 검사합니다.',
    usage:[
      ['브랜치 관리', [
        ['git branch', '로컬 브랜치 목록. -a는 원격까지, -r은 원격만 봅니다.'],
        ['git branch -vv', '각 브랜치가 어떤 원격을 추적하고 몇 커밋 앞서는지 봅니다.'],
        ['git branch -m <새이름>', '현재 브랜치 이름을 바꿉니다.'],
        ['git branch -d <이름> / -D <이름>', '병합된 브랜치 삭제 / 강제 삭제.'],
        ['git branch --merged main', 'main에 이미 합쳐진 브랜치만 골라 정리 대상을 찾습니다.']
      ]],
      ['이동 중 작업 보관', [
        ['git stash push -m "작업중"', '커밋하기 애매한 변경을 이름표와 함께 보관합니다.'],
        ['git stash list / git stash pop', '목록 확인과 되돌리기.'],
        ['git stash -u', '추적되지 않는 새 파일까지 함께 보관합니다.'],
        ['git switch -', '직전 브랜치로 즉시 돌아갑니다.'],
        ['git worktree add ../feature feature', '브랜치를 옮기지 않고 별도 폴더에서 동시에 작업합니다.']
      ]],
      ['커밋 옮기기', [
        ['git cherry-pick <브랜치>', '그 브랜치의 최신 커밋 1개를 가져옵니다.'],
        ['git rebase --onto <새기준> <옛기준> <브랜치>', '커밋 묶음을 통째로 옮깁니다.'],
        ['git commit --amend', '방금 옮긴 커밋의 내용과 메시지를 바로 다듬습니다.'],
        ['git reset --hard <SHA>', '원래 브랜치에서 옮긴 커밋을 걷어냅니다(공유 전에만).']
      ]]
    ] },
  { id:'release', no:'15', title:'GitHub Actions로 Release 자동 생성하기', points:25, level:'CI/CD · Release', goal:'release tag를 push하면 Actions가 실행되어 실제 Release와 asset을 자동으로 생성하게 합니다.', commands:`git fetch upstream
git switch -c solution/actions-release upstream/scenario/actions-release
mkdir -p .github/workflows
cat > .github/workflows/release.yml <<'YAML'
name: Create Release
on:
  push:
    tags:
      - 'release-v*'
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Publish GitHub Release
        env:
          GH_TOKEN: \${{ github.token }}
        run: |
          gh release create "$GITHUB_REF_NAME" \\
            dist/scenario-artifact.txt \\
            --title "Scenario $GITHUB_REF_NAME" \\
            --notes-file release-notes.md
YAML

git add .github/workflows/release.yml
git commit -m "ci: automate GitHub release"
git push -u origin solution/actions-release

# Fork의 Actions 탭에서 필요하면 'I understand..., enable'을 누릅니다.
git tag -a release-v1.0.0 -m "trigger automated release"
git push origin release-v1.0.0
# GitHub Actions 실행 완료 후 Releases 화면을 확인합니다.`, checks:['Fork의 Actions 사용이 활성화돼 있는가?', 'workflow에 `contents: write` 최소 권한과 GH_TOKEN 환경 변수가 있는가?', 'tag가 workflow 파일을 포함한 solution/actions-release 커밋을 가리키는가?', 'Actions 로그에서 초록색 완료 표시가 보이는가?', 'Release에 scenario-artifact.txt가 첨부됐는가?', '<a href="https://docs.github.com/en/actions" target="_blank" rel="noopener noreferrer">GitHub Actions 공식 문서 ↗</a>'], verify:'workflow 파일, release-v1.0.0의 실제 공개 Release, asset 이름과 상태를 검사합니다.',
    usage:[
      ['태그를 밀어 워크플로 실행', [
        ['git tag -a <태그> -m "설명"', '메시지가 있는 주석 태그. 릴리스에는 이 형식을 권장합니다.'],
        ['git push origin <태그>', '태그 하나만 원격에 올립니다. 이때 tag 트리거가 동작합니다.'],
        ['git push --tags', '로컬 태그를 모두 올립니다. 실수로 실험 태그까지 올라갈 수 있어 주의합니다.'],
        ['git push --delete origin <태그>', '원격 태그를 지웁니다. 잘못 만든 릴리스를 되돌릴 때 씁니다.'],
        ['git tag -d <태그>', '로컬 태그만 지웁니다.']
      ]],
      ['워크플로 점검', [
        ['gh run list --limit 5', '최근 실행 결과를 터미널에서 확인합니다. 목록이 비어 있으면 아직 한 번도 실행되지 않은 것입니다.'],
        ['gh run watch', '실행 중인 워크플로를 실시간으로 지켜봅니다.'],
        ['gh run view --log-failed', '실패한 단계의 로그만 봅니다. YAML 들여쓰기 오류가 여기서 보입니다.'],
        ['gh workflow list', '저장소가 인식한 workflow 목록입니다. 없으면 파일 위치나 확장자를 확인하세요.'],
        ['gh release view <태그>', '만들어진 Release와 첨부 파일을 확인합니다.']
      ]],
      ['자주 막히는 지점', [
        ['Fork는 Actions가 꺼져 있음', '저장소 Actions 탭에서 "I understand my workflows, go ahead and enable them"을 눌러야 실행됩니다. 누르지 않으면 태그를 밀어도 아무 일도 일어나지 않습니다.'],
        ['순서가 중요', 'workflow를 먼저 push한 뒤 태그를 만듭니다. 태그가 workflow 없는 커밋을 가리키면 실행되지 않습니다.'],
        ['git push는 태그를 올리지 않음', 'git push origin release-v1.0.0 을 따로 실행해야 합니다.'],
        ['경로 확인', '.github/workflows/ 아래에 있어야 하고 확장자는 .yml 또는 .yaml 입니다.'],
        ['YAML 문법', '탭 문자는 쓸 수 없습니다. 들여쓰기는 공백만 사용하세요.']
      ]],
      ['실패 후 다시 시도하기', [
        ['gh release delete release-v1.0.0 --yes', '이미 만들어진 Release를 지웁니다. 남아 있으면 gh release create가 실패합니다.'],
        ['git push --delete origin release-v1.0.0', '원격 태그를 지웁니다.'],
        ['git tag -d release-v1.0.0', '로컬 태그를 지웁니다.'],
        ['git tag -a release-v1.0.0 -m "retry" && git push origin release-v1.0.0', '고친 뒤 다시 태그를 밀면 workflow가 새로 실행됩니다.'],
        ['gh run rerun <run-id>', '코드 변경 없이 같은 실행을 다시 돌립니다.']
      ]]
    ] },
  { id:'pages', no:'16', title:'GitHub Pages로 홈페이지 서비스하기', points:25, level:'Deploy · Pages', goal:'Fork의 solution/pages 브랜치에 정적 홈페이지를 만들고 /docs 폴더를 공개 서비스합니다.', commands:`git fetch upstream
git switch -c solution/pages upstream/scenario/pages
# docs/index.html을 편집해 제목·설명을 꾸미고 아래 문구를 넣습니다.
# PAGES-LIVE-2026

git add docs/index.html docs/.nojekyll
git commit -m "feat: publish scenario homepage"
git push -u origin solution/pages

# 아래 두 경로 중 하나를 고르면 됩니다. 채점은 실제 사이트 응답으로 판정하므로
# 어느 쪽을 써도 통과합니다. 한 저장소에 Pages 사이트는 하나뿐이라 동시에는 못 씁니다.

# ── 경로 A. 브랜치에서 바로 배포 (가장 간단, 공식 정답이 쓰는 방식) ──
# Settings → Pages → Build and deployment
#   Source: Deploy from a branch
#   Branch: solution/pages   Folder: /docs   → Save

# ── 경로 B. GitHub Actions로 배포 (GitHub 공식 권장 방식) ──
mkdir -p .github/workflows
cat > .github/workflows/pages.yml <<'YAML'
name: Deploy Pages
on:
  push:
    branches: ['solution/pages']
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs
      - id: deployment
        uses: actions/deploy-pages@v4
YAML

git add .github/workflows/pages.yml
git commit -m "ci: deploy pages with actions"
git push
# Settings → Pages → Source를 'GitHub Actions'로 바꾸면 workflow가 배포합니다.

# 배포 완료 후 표시되는 Visit site를 엽니다.`, checks:['Fork가 Public이고 이메일 인증이 완료됐는가?', 'docs 폴더 최상위에 index.html이 있는가?', '경로 A라면 Pages source가 solution/pages와 /docs로 설정됐는가?', '경로 B라면 Settings → Pages의 Source가 GitHub Actions이고 pages.yml이 push됐는가?', 'Actions 탭에서 배포 workflow가 완료됐는가?', 'Visit site에서 PAGES-LIVE-2026 문구가 보이는가?', '경로 A와 B는 동시에 쓸 수 없습니다. 하나를 고르세요.', '<a href="https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site" target="_blank" rel="noopener noreferrer">GitHub Pages 공식 설정 안내 ↗</a>'], verify:'docs/index.html의 표시 문구와 실제 Pages 주소의 응답 내용을 검사합니다. 브랜치 배포와 Actions 배포 중 어느 방식이든 인정하며, 토큰을 입력하면 실제 배포 방식도 함께 표시합니다.',
    usage:[
      ['배포 소스 고르기', [
        ['Branch + /(root)', '브랜치 최상위를 그대로 서비스합니다. 가장 단순합니다.'],
        ['Branch + /docs', '소스와 홈페이지를 한 브랜치에서 폴더로 나눕니다. 이 과제의 경로 A입니다.'],
        ['gh-pages 브랜치', '빌드 결과만 담는 전용 브랜치를 쓰는 전통적 방식입니다.'],
        ['GitHub Actions', '빌드 과정을 워크플로로 정의합니다. 이 과제의 경로 B이며 GitHub 공식 권장 방식입니다.'],
        ['한 저장소에 사이트는 하나', '경로 A와 B는 같은 Pages 사이트를 두고 경쟁합니다. Source를 바꾸면 이전 방식은 중단됩니다.']
      ]],
      ['Actions 배포(경로 B) 구성 요소', [
        ['permissions: pages: write, id-token: write', '배포에 필요한 최소 권한입니다. 빠지면 권한 오류로 실패합니다.'],
        ['actions/configure-pages@v5', 'Pages 설정을 읽어 빌드 환경을 준비합니다.'],
        ['actions/upload-pages-artifact@v3 (path: docs)', '배포할 폴더를 artifact로 올립니다. path가 곧 사이트 루트입니다.'],
        ['actions/deploy-pages@v4', 'artifact를 실제 사이트로 배포합니다.'],
        ['environment: github-pages', '배포 환경을 지정해야 deploy-pages가 동작합니다.'],
        ['workflow_dispatch', 'Actions 탭에서 손으로도 실행할 수 있게 해 둡니다. 재배포에 편리합니다.']
      ]],
      ['자주 막히는 지점', [
        ['docs/.nojekyll', '밑줄(_)로 시작하는 폴더·파일이 무시되지 않도록 빈 파일을 둡니다.'],
        ['경로는 상대 경로로', '/style.css 대신 style.css 로 써야 프로젝트 페이지에서 깨지지 않습니다.'],
        ['반영이 늦을 때', '배포는 수십 초~수 분 걸립니다. Actions 탭의 pages build를 확인하세요.'],
        ['gh api repos/:owner/:repo/pages', '현재 설정된 소스 브랜치와 폴더를 터미널에서 확인합니다.'],
        ['404가 뜰 때', 'Public 여부, 폴더 최상위 index.html, 대소문자를 차례로 확인합니다.']
      ]]
    ] },
  { id:'tag', no:'17', title:'완료 지점에 tag 만들기', points:5, level:'Tag', goal:'모든 해결이 끝난 커밋에 주석 태그를 만들고 원격으로 push합니다.', commands:`# 원하는 solution 브랜치에서 실행합니다.
git tag -a solution-v1.0.0 -m "complete scenario lab"
git push origin solution-v1.0.0
git show solution-v1.0.0`, checks:['태그 이름이 정확히 `solution-v1.0.0`인가?', '`git push origin solution-v1.0.0`을 실행했는가?', 'GitHub 저장소의 Tags 화면에서 보이는가?'], verify:'Fork 저장소의 원격 tag ref 존재 여부를 검사합니다.',
    usage:[
      ['태그 만들기', [
        ['git tag', '태그 목록을 봅니다. -l "v1.*" 로 패턴 검색도 됩니다.'],
        ['git tag <이름>', '가벼운 태그. 이름표만 붙이며 작성자·메시지가 없습니다.'],
        ['git tag -a <이름> -m "설명"', '주석 태그. 작성자·날짜·메시지가 남아 릴리스에 적합합니다.'],
        ['git tag -a <이름> <SHA>', '과거 커밋에 나중에 태그를 붙입니다.'],
        ['git tag -f <이름> <SHA>', '태그 위치를 옮깁니다. 이미 공유했다면 혼란을 주므로 피하세요.']
      ]],
      ['태그 사용', [
        ['git show <태그>', '태그 메시지와 가리키는 커밋을 확인합니다.'],
        ['git switch --detach <태그>', '그 시점 상태를 그대로 열어 봅니다.'],
        ['git describe --tags', '현재 커밋을 "가장 가까운 태그+거리"로 표현합니다.'],
        ['git push origin <태그> / --tags', '하나만 올리기 / 전부 올리기.'],
        ['git fetch --tags', '다른 사람이 만든 태그를 받아옵니다.']
      ]]
    ] }
];

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));

function scenarioAnswerUrl(id) {
  const refs={fork:'main',upstream:'solution/upstream-sync',conflict:'solution/conflict',external:'solution/external-remote',revert:'solution/revert',rebase:'solution/rebase',reset:'solution/reset',reflog:'solution/reflog',amend:'solution/amend',cherry:'solution/cherry-pick',diff:'solution/diff',show:'solution/show',patch:'solution/patch',blame:'solution/blame',workflow:'solution/branch-b',release:'solution/actions-release',pages:'solution/pages',tag:'solution/pages'};
  if(id==='release') return `https://github.com/${OFFICIAL_ANSWER}/releases/tag/release-v1.0.0`;
  if(id==='pages') return 'https://nowcika.github.io/git-scenario-solution/';
  if(id==='tag') return `https://github.com/${OFFICIAL_ANSWER}/releases/tag/solution-v1.0.0`;
  return `https://github.com/${OFFICIAL_ANSWER}/tree/${refs[id]}`;
}

function usageHtml(usage) {
  if (!Array.isArray(usage) || !usage.length) return '';
  const groups = usage.map(([name, cases]) => `<div class="usage-group"><h5>${escapeHtml(name)}</h5><dl>${
    cases.map(([code, note]) => `<dt><code>${escapeHtml(code)}</code></dt><dd>${escapeHtml(note)}</dd>`).join('')
  }</dl></div>`).join('');
  return `<details class="usage"><summary>명령어 활용 사례 — 옵션을 바꾸면 무엇이 달라지나요?</summary><div class="usage-body">${groups}</div></details>`;
}

if (scenarioRoot) {
  scenarioRoot.innerHTML = `<div class="scenario-start"><div><span class="scenario-kicker">START HERE</span><h3>하나의 Fork에서 17가지 문제를 해결합니다</h3><p>각 시나리오는 독립된 <code>solution/*</code> 브랜치를 사용하므로 순서대로 진행하거나 필요한 항목만 연습할 수 있습니다. 각 카드의 <strong>명령어 활용 사례</strong>에서 옵션별 차이를 함께 확인하세요.</p></div><div class="scenario-start-actions"><a href="https://github.com/nowcika/git-scenario-lab/fork" target="_blank" rel="noopener noreferrer">① 원본 저장소 Fork ↗</a><a href="https://github.com/nowcika/git-scenario-lab" target="_blank" rel="noopener noreferrer">원본 구조 보기 ↗</a><a href="https://github.com/nowcika/git-scenario-library" target="_blank" rel="noopener noreferrer">외부 저장소 보기 ↗</a><a href="https://github.com/${OFFICIAL_ANSWER}" target="_blank" rel="noopener noreferrer">전체 정답 저장소 ↗</a></div></div>
  <div class="scenario-flow"><span><b>1</b> Fork</span><i>→</i><span><b>2</b> Clone</span><i>→</i><span><b>3</b> Remote 연결</span><i>→</i><span><b>4</b> 문제 해결</span><i>→</i><span><b>5</b> Push·채점</span></div>
  <div class="scenario-list">${scenarioDefinitions.map((s, index) => `<details class="scenario" id="scenario-${s.id}" ${s.id==='fork'?'open':''}><summary><span class="scenario-no">${s.no}</span><div><small>${escapeHtml(s.level)}</small><strong>${escapeHtml(s.title)}</strong><p>${escapeHtml(s.goal)}</p></div><b>${s.points}점</b></summary><div class="scenario-body"><div><h4>실행 순서</h4><pre><code data-commands="${index}"></code><button class="scenario-copy" type="button" aria-label="${escapeHtml(s.title)} 명령 복사">명령 복사</button></pre><p class="scenario-verify"><strong>자동 채점 기준</strong>${escapeHtml(s.verify)}</p>${usageHtml(s.usage)}</div><div><h4>막혔을 때 확인</h4><ul>${s.checks.map(c=>`<li>${c}</li>`).join('')}</ul><div class="scenario-resource-links"><a class="scenario-doc" href="https://git-scm.com/docs" target="_blank" rel="noopener noreferrer">Git 공식 명령 문서 ↗</a><a class="scenario-answer" href="${scenarioAnswerUrl(s.id)}" target="_blank" rel="noopener noreferrer">정답 결과 보기 ↗</a></div></div></div></details>`).join('')}</div>
  <div class="scenario-grade"><div class="scenario-grade-head"><div><span class="eyebrow">SCENARIO GRADER</span><h3>내 Fork 결과 채점</h3><p>Fork가 Public이어야 인증 없이 확인할 수 있습니다. 채점 1회에 GitHub API를 약 50회 사용합니다.</p></div><button id="scenarioGradeButton" class="grade-button">시나리오 채점하기 <span>→</span></button></div><label for="scenarioRepoUrl">내 Fork 저장소 URL</label><input id="scenarioRepoUrl" type="url" placeholder="https://github.com/내사용자이름/git-scenario-lab" autocomplete="url"><div id="scenarioStatus" role="status" aria-live="polite"></div><div id="scenarioResults" hidden><div class="scenario-score"><strong id="scenarioScore">0</strong><span>/ 290점</span><p id="scenarioScoreMessage"></p></div><div id="scenarioResultList" class="result-list"></div></div></div>`;
  // 명령 블록은 innerHTML이 아니라 textContent로 넣어 <브랜치> 같은 표기가 사라지지 않게 합니다.
  scenarioRoot.querySelectorAll('code[data-commands]').forEach(code => {
    code.textContent = scenarioDefinitions[Number(code.dataset.commands)].commands;
  });
  const scenarioInput = document.getElementById('scenarioRepoUrl');
  try { scenarioInput.value = localStorage.getItem('gitlab:scenarioRepoUrl') || ''; } catch { /* 저장 불가 환경 */ }
  scenarioInput.addEventListener('input', () => {
    try { localStorage.setItem('gitlab:scenarioRepoUrl', scenarioInput.value); } catch { /* 저장 불가 환경 */ }
  });
  scenarioRoot.querySelectorAll('.scenario-copy').forEach(button => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.previousElementSibling.textContent); button.textContent='복사됨'; }
    catch { button.textContent='복사 실패'; }
    setTimeout(()=>button.textContent='명령 복사',1500);
  }));
  document.getElementById('scenarioGradeButton').addEventListener('click', gradeScenarios);
}

async function scenarioContent(base, path, ref) {
  const file = decodeContent(await api(`${base}/contents/${path}?ref=${encodeURIComponent(ref)}`));
  if (file.state === 'too-large') throw new Error(`${path} 파일이 너무 커서 확인할 수 없습니다.`);
  return file.state === 'ok' ? file.text : null;
}
const scenarioCommits = (base, ref, perPage = 30) => api(`${base}/commits?sha=${encodeURIComponent(ref)}&per_page=${perPage}`);
const commitList = (value) => Array.isArray(value) ? value : [];
const hasMessage = (commits, pattern) => commitList(commits).some(c => pattern.test(c.commit?.message || ''));
const isLinear = (commits) => commitList(commits).length > 0 && !commitList(commits).some(c => (c.parents || []).length > 1);
const tipMessage = (commits) => commitList(commits)[0]?.commit?.message || '';
const subjectOf = (commit) => (commit?.commit?.message || '').split('\n')[0].trim();
// 보고서에 적힌 7자리 이상 16진수 토큰 중 실제 SHA의 앞부분과 일치하는 것이 있는지 봅니다.
function mentionsSha(text, sha) {
  const target = String(sha).toLowerCase();
  return (String(text).toLowerCase().match(/\b[0-9a-f]{7,40}\b/g) || []).some(token => target.startsWith(token));
}
// compare API의 patch에서 실제로 대조할 줄(추가·삭제·hunk 헤더)만 추립니다.
function comparableLines(patch) {
  return String(patch || '').split('\n').map(line => {
    if (line.startsWith('@@')) { const end = line.indexOf(' @@'); return end === -1 ? line : line.slice(0, end + 3); }
    return line;
  }).filter(line => /^[-+@]/.test(line) && line.trim() !== '+' && line.trim() !== '-');
}
// Pages API는 인증이 필요합니다. 토큰이 없으면 배포 방식 표시를 생략합니다.
async function pagesBuildType(base) {
  if (!tokenStore.read()) return null;
  const info = await api(`${base}/pages`);
  if (info.missing) return null;
  if (info.build_type === 'workflow') return 'GitHub Actions';
  const source = info.source;
  return source?.branch ? `브랜치 ${source.branch} ${source.path || '/'}` : '브랜치 배포';
}
// audit-checklist.md에서 대상 줄을 추가한 커밋을 원본 저장소에서 직접 찾습니다.
async function blameOrigin() {
  const list = await api(`${UPSTREAM_BASE}/commits?sha=${encodeURIComponent('scenario/blame')}&path=audit-checklist.md&per_page=10`);
  if (!Array.isArray(list)) return null;
  for (const entry of list.slice(0, 5)) {
    const detail = await api(`${UPSTREAM_BASE}/commits/${entry.sha}`);
    if (detail.missing) continue;
    const added = (detail.files || []).flatMap(file => String(file.patch || '').split('\n')).find(line => /^\+.*BLAME-OWNER-/.test(line));
    if (added) return { sha: detail.sha, author: detail.commit?.author?.name || '', subject: subjectOf(detail), marker: (added.match(/BLAME-OWNER-[\w-]+/) || [''])[0] };
  }
  return null;
}

async function gradeScenarios() {
  const input = document.getElementById('scenarioRepoUrl');
  const parsed = parseRepo(input.value); const status = document.getElementById('scenarioStatus');
  const button = document.getElementById('scenarioGradeButton');
  if (!parsed) { status.textContent='Fork URL을 https://github.com/사용자/git-scenario-lab 형식으로 입력하세요.'; input.focus(); return; }
  button.disabled=true; resetApiUsage();
  status.textContent='Fork와 해결 브랜치를 확인하는 중입니다…'; document.getElementById('scenarioResults').hidden=true;
  try {
    const quota = await checkQuota(48);
    if (quota && !quota.enough) {
      status.textContent = `GitHub API 남은 한도가 ${quota.remaining}회뿐입니다(시나리오 채점 1회에 약 50회 필요). 약 ${quota.minutes}분 뒤에 다시 시도하거나 결과 확인 영역의 토큰 칸을 채우세요.`;
      return;
    }
    const base=`/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}`;
    const checks=[];
    checks[0]=await assess(async()=>{
      const repo=await api(base);
      if(repo.missing) return failed('공개 저장소를 찾지 못했습니다.');
      if(repo.private) return failed('Fork를 Public으로 설정하세요.');
      if(repo.owner?.login?.toLowerCase()!==parsed.owner.toLowerCase()) return failed('저장소 소유자를 확인할 수 없습니다.');
      if(repo.full_name?.toLowerCase()===OFFICIAL_ANSWER){
        return answerRepoAllowed
          ? passed(`공식 정답 저장소 확인(테스트 모드): ${repo.full_name}`)
          : failed('공식 정답 저장소는 채점 대상이 아닙니다. 직접 만든 Fork 주소를 입력하세요.');
      }
      if(!repo.fork || repo.parent?.full_name?.toLowerCase()!=='nowcika/git-scenario-lab')
        return failed('원본 저장소의 Fork가 아닙니다. Fork 버튼으로 만든 저장소 URL을 입력하세요.');
      return passed(`Fork 확인: ${repo.full_name} ← ${repo.parent.full_name}`);
    });
    const runnable=checks[0].state==='pass';
    const tasks=[
      async()=>{ const content=await scenarioContent(base,'instructor-update.md','solution/upstream-sync'); const commits=await scenarioCommits(base,'solution/upstream-sync');
        if(!content?.includes('UPSTREAM-SYNC-COMPLETE')) return failed('solution/upstream-sync의 instructor-update.md에서 표시 문구를 찾지 못했습니다.');
        return commitList(commits).some(c=>(c.parents||[]).length>=2)?passed('원본 업데이트 반영과 merge 커밋 확인'):failed('파일은 있지만 merge 커밋이 없습니다. upstream 브랜치를 실제로 merge하세요.'); },
      async()=>{ const content=await scenarioContent(base,'team-plan.md','solution/conflict'); const commits=await scenarioCommits(base,'solution/conflict'); const words=['프론트엔드: UI 배포 준비','백엔드: API 배포 준비','공동 확인: 통합 테스트 완료']; const merged=commitList(commits).some(c=>(c.parents||[]).length>=2); return content&&words.every(w=>content.includes(w))&&merged?passed('양쪽 변경과 merge commit 확인'):failed('team-plan.md의 필수 3개 문구와 merge commit을 모두 확인하세요.'); },
      async()=>{ const content=await scenarioContent(base,'shared-config.json','solution/external-remote'); const commits=await scenarioCommits(base,'solution/external-remote',20); return content?.includes('REMOTE-LIBRARY-V1')&&hasMessage(commits,/import shared config/i)?passed('외부 remote 자료와 반영 커밋 확인'):failed('외부 저장소의 shared-config.json과 지정 커밋 메시지를 확인하세요.'); },
      async()=>{ const secret=await api(`${base}/contents/secrets.env?ref=${encodeURIComponent('solution/revert')}`); const config=await scenarioContent(base,'app.conf','solution/revert'); const commits=await scenarioCommits(base,'solution/revert',20); return secret.missing&&config?.includes('production=true')&&hasMessage(commits,/^Revert /i)?passed('잘못된 파일 제거와 Revert 이력 확인'):failed('secrets.env는 없어야 하고 app.conf와 Revert 커밋은 남아야 합니다.'); },
      async()=>{ const baseFile=await scenarioContent(base,'notes/base-update.txt','solution/rebase'); const topicFile=await scenarioContent(base,'notes/topic.txt','solution/rebase'); const commits=await scenarioCommits(base,'solution/rebase',20); return baseFile&&topicFile&&isLinear(commits)&&hasMessage(commits,/notification topic note/)&&hasMessage(commits,/common deployment rule/)?passed('기준·토픽 변경과 선형 이력 확인'):failed('두 결과 파일과 두 커밋이 merge 없이 선형 이력에 있어야 합니다.'); },
      async()=>{ const stable=await scenarioContent(base,'stable-config.txt','solution/reset'); const unwanted=await api(`${base}/contents/unwanted-experiment.txt?ref=${encodeURIComponent('solution/reset')}`); const commits=await scenarioCommits(base,'solution/reset',10); return stable?.includes('STABLE-CONFIG-V1')&&unwanted.missing&&/stable configuration/.test(tipMessage(commits))?passed('hard reset 후 안정 커밋 상태 확인'):failed('stable-config.txt만 남고 해결 브랜치 끝이 안정 커밋이어야 합니다.'); },
      async()=>{ const recovered=await scenarioContent(base,'recovered-note.txt','solution/reflog'); const commits=await scenarioCommits(base,'solution/reflog',10); return recovered?.includes('REFLOG-RECOVERED-COMMIT')&&hasMessage(commits,/add recoverable note/)?passed('reflog로 복구한 파일과 커밋 확인'):failed('recovered-note.txt의 고유 문구와 복구 커밋을 확인하세요.'); },
      async()=>{ const note=await scenarioContent(base,'release-note.md','solution/amend'); const commits=await scenarioCommits(base,'solution/amend',10); const messages=commitList(commits).map(c=>c.commit?.message||''); return note?.includes('# Release Note')&&note?.includes('Version: draft')&&messages[0]==='docs: add release note'&&!messages.some(m=>/releas note/.test(m))?passed('amend된 파일과 최신 커밋 메시지 확인'):failed('파일의 두 오타와 최신 메시지를 amend로 바로잡으세요.'); },
      async()=>{ const fix=await scenarioContent(base,'urgent-fix.txt','solution/cherry-pick'); const commits=await scenarioCommits(base,'solution/cherry-pick',10); return fix?.includes('CHERRY-PICK-HOTFIX-2026')&&hasMessage(commits,/urgent standalone hotfix/)&&isLinear(commits)?passed('선택한 긴급 수정 커밋 확인'):failed('긴급 수정 커밋만 cherry-pick하고 해결 브랜치를 push하세요.'); },
      async()=>{
        const patch=await scenarioContent(base,'reports/change.patch','solution/diff');
        if(!patch) return failed('solution/diff 브랜치에 reports/change.patch를 제출하세요.');
        const commits=await scenarioCommits(base,'solution/diff',10);
        if(!/submit diff analysis/.test(tipMessage(commits))) return failed('patch는 있지만 "docs: submit diff analysis" 커밋으로 제출되지 않았습니다.');
        const compare=await api(`${UPSTREAM_BASE}/compare/${encodeURIComponent('scenario/diff-base')}...${encodeURIComponent('scenario/diff-target')}`);
        if(compare.missing||!Array.isArray(compare.files)) return unknown('원본 저장소의 비교 결과를 가져오지 못했습니다. 잠시 후 다시 시도하세요.');
        const problems=[];
        for(const file of compare.files){
          if(!patch.includes(`diff --git a/${file.filename} b/${file.filename}`)){ problems.push(`${file.filename}의 diff --git 헤더가 없습니다`); continue; }
          if(!patch.includes(String(file.sha).slice(0,7))){ problems.push(`${file.filename}의 index blob 해시가 실제와 다릅니다`); continue; }
          const missing=comparableLines(file.patch).find(line=>!patch.includes(line));
          if(missing) problems.push(`${file.filename}에서 "${missing.slice(0,26)}" 줄을 찾지 못했습니다`);
        }
        const headers=(patch.match(/^diff --git /gm)||[]).length;
        if(headers!==compare.files.length) problems.push(`변경 파일 수가 다릅니다(제출 ${headers}개 / 실제 ${compare.files.length}개)`);
        return problems.length?failed(`제출한 patch가 원본의 실제 diff와 다릅니다: ${problems.slice(0,2).join(' / ')}`)
          :passed(`원본 두 브랜치의 실제 diff와 일치 (파일 ${compare.files.length}개, blob 해시까지 확인)`); },
      async()=>{
        const report=await scenarioContent(base,'reports/show-report.md','solution/show');
        if(!report) return failed('solution/show 브랜치에 reports/show-report.md를 제출하세요.');
        const commits=await scenarioCommits(base,'solution/show',10);
        if(!/report inspected commit/.test(tipMessage(commits))) return failed('보고서는 있지만 "docs: report inspected commit" 커밋으로 제출되지 않았습니다.');
        const source=await api(`${UPSTREAM_BASE}/commits/${encodeURIComponent('scenario/show-source')}`);
        if(source.missing||!source.sha) return unknown('원본 저장소의 조사 대상 커밋을 가져오지 못했습니다. 잠시 후 다시 시도하세요.');
        const file=(source.files||[])[0];
        const evidence=String(file?.patch||'').split('\n').find(line=>line.startsWith('+')&&line.slice(1).trim())?.slice(1).trim()||'';
        const missing=[];
        if(!mentionsSha(report,source.sha)) missing.push('커밋 SHA(7자리 이상)');
        if(!report.includes(subjectOf(source))) missing.push('커밋 메시지');
        const author=source.commit?.author?.name||'';
        if(author&&!report.includes(author)) missing.push('작성자');
        if(file&&!report.includes(file.filename)) missing.push('변경 파일 이름');
        if(evidence&&!report.includes(evidence)) missing.push('증거 문구');
        return missing.length?failed(`show-report.md에서 확인하지 못한 항목: ${missing.join(', ')}. git show 출력을 그대로 옮겨 적으세요.`)
          :passed(`원본 커밋 ${source.sha.slice(0,7)}의 SHA·작성자·메시지·파일·증거까지 일치`); },
      async()=>{ const file=await scenarioContent(base,'patch-feature.txt','solution/patch'); const commits=await scenarioCommits(base,'solution/patch',10); return file?.includes('FORMAT-PATCH-TRANSFER-2026')&&commitList(commits).some(c=>c.commit?.message==='feat: add transferable patch feature')&&isLinear(commits)?passed('format-patch로 전달된 커밋 확인'):failed('format-patch를 git am으로 solution/patch에 적용하세요.'); },
      async()=>{
        const answer=await scenarioContent(base,'reports/blame-answer.md','solution/blame');
        if(!answer) return failed('solution/blame 브랜치에 reports/blame-answer.md를 제출하세요.');
        const commits=await scenarioCommits(base,'solution/blame',10);
        if(!/submit blame investigation/.test(tipMessage(commits))) return failed('답안은 있지만 "docs: submit blame investigation" 커밋으로 제출되지 않았습니다.');
        const origin=await blameOrigin();
        if(!origin) return unknown('원본 저장소에서 해당 줄의 변경 이력을 확인하지 못했습니다. 잠시 후 다시 시도하세요.');
        const missing=[];
        if(!mentionsSha(answer,origin.sha)) missing.push('커밋 SHA(7자리 이상)');
        if(origin.author&&!answer.includes(origin.author)) missing.push('작성자');
        if(origin.subject&&!answer.includes(origin.subject)) missing.push('커밋 메시지');
        if(origin.marker&&!answer.includes(origin.marker)) missing.push('대상 문구');
        return missing.length?failed(`blame-answer.md에서 확인하지 못한 항목: ${missing.join(', ')}. 해당 줄을 바꾼 커밋을 blame으로 다시 찾으세요.`)
          :passed(`그 줄을 바꾼 커밋 ${origin.sha.slice(0,7)}(${origin.author})과 일치`); },
      async()=>{ const aFront=await scenarioContent(base,'frontend-task.txt','solution/branch-a'); const aBack=await scenarioContent(base,'backend-task.txt','solution/branch-a'); const bFront=await scenarioContent(base,'frontend-task.txt','solution/branch-b'); const bBack=await scenarioContent(base,'backend-task.txt','solution/branch-b'); const commits=await scenarioCommits(base,'solution/branch-b',10); return aFront?.includes('BRANCH-A-ORIGINAL')&&!aBack&&bFront?.includes('MOVED-AND-AMENDED-2026')&&bBack?.includes('BRANCH-B-BACKEND')&&tipMessage(commits)==='feat: move and refine shared task'&&isLinear(commits)?passed('두 브랜치 작업과 커밋 이동·amend 확인'):failed('branch-a/branch-b 파일 격리와 branch-b 최신 amend 결과를 확인하세요.'); },
      async()=>{
        // 어느 단계에서 막혔는지 알려 주기 위해 순서대로 확인합니다.
        const workflow=await scenarioContent(base,'.github/workflows/release.yml','solution/actions-release');
        if(!workflow) return failed('solution/actions-release 브랜치의 .github/workflows/release.yml을 찾지 못했습니다. 경로와 확장자(.yml)를 확인하세요.');
        const missingParts=[];
        if(!workflow.includes('contents: write')) missingParts.push('permissions의 contents: write');
        if(!workflow.includes('gh release create')) missingParts.push('gh release create 단계');
        if(!workflow.includes('release-v')) missingParts.push("tags: ['release-v*'] 트리거");
        if(missingParts.length) return failed(`workflow에 없는 설정: ${missingParts.join(', ')}`);
        const tagged=await api(`${base}/contents/.github/workflows/release.yml?ref=${encodeURIComponent('release-v1.0.0')}`);
        if(tagged.missing){
          const ref=await api(`${base}/git/ref/tags/${encodeURIComponent('release-v1.0.0')}`);
          return ref.missing
            ?failed('release-v1.0.0 태그가 원격에 없습니다. git push origin release-v1.0.0 을 따로 실행하세요(git push만으로는 태그가 올라가지 않습니다).')
            :failed('태그가 workflow 파일이 없는 커밋을 가리킵니다. workflow를 push한 뒤 태그를 다시 만드세요.');
        }
        const release=await api(`${base}/releases/tags/${encodeURIComponent('release-v1.0.0')}`);
        if(release.missing){
          const runs=await api(`${base}/actions/runs?per_page=20`);
          const mine=(Array.isArray(runs?.workflow_runs)?runs.workflow_runs:[]).filter(run=>run.name!=='pages build and deployment');
          if(!mine.length) return failed('태그는 올라갔지만 workflow가 한 번도 실행되지 않았습니다. Fork의 Actions 탭에서 “I understand my workflows, go ahead and enable them”을 눌러 활성화하세요.');
          const running=mine.find(run=>run.status!=='completed');
          if(running) return unknown(`workflow가 아직 실행 중입니다(${running.status}). 완료된 뒤 다시 채점하세요.`);
          const broken=mine.find(run=>run.conclusion&&run.conclusion!=='success');
          if(broken) return failed(`workflow 실행이 ${broken.conclusion} 상태로 끝났습니다. 로그: ${broken.html_url}`);
          return failed('workflow는 성공했지만 release-v1.0.0 Release를 찾지 못했습니다. gh release create에 넘긴 태그 이름을 확인하세요.');
        }
        if(release.draft) return failed('Release가 draft 상태입니다. 공개 Release로 전환하세요.');
        const asset=(Array.isArray(release.assets)?release.assets:[]).find(a=>a.name==='scenario-artifact.txt'&&a.state==='uploaded');
        if(!asset) return failed(`Release는 있지만 scenario-artifact.txt asset이 없습니다(현재 첨부: ${(release.assets||[]).map(a=>a.name).join(', ')||'없음'}). gh release create에 dist/scenario-artifact.txt를 넘겼는지 확인하세요.`);
        return passed(`Actions Release와 asset 확인: ${release.html_url}`); },
      async()=>{
        const page=await scenarioContent(base,'docs/index.html','solution/pages');
        if(!page?.includes('PAGES-LIVE-2026')) return failed('solution/pages의 docs/index.html에 PAGES-LIVE-2026 문구를 넣으세요.');
        const url=`https://${parsed.owner.toLowerCase()}.github.io/${parsed.name}/`;
        let live='';
        try { const response=await fetch(url); if(!response.ok) return failed(`Pages 주소가 아직 열리지 않았습니다(HTTP ${response.status}). 경로 A는 Settings → Pages의 Branch가 solution/pages·폴더가 /docs인지, 경로 B는 Source가 GitHub Actions이고 배포 workflow가 성공했는지 확인하세요.`); live=await response.text(); }
        catch { return unknown('Pages 주소에 연결하지 못했습니다. 배포 완료 후 다시 시도하세요.'); }
        if(!live.includes('PAGES-LIVE-2026')) return failed('Pages는 열렸지만 표시 문구가 없습니다. 경로 A는 배포 브랜치와 폴더를, 경로 B는 upload-pages-artifact의 path를 확인하세요.');
        // 브랜치 배포와 Actions 배포 모두 인정하며, 방식은 참고로만 표시합니다.
        const how=await pagesBuildType(base);
        return passed(`Pages 실제 서비스 확인: ${url}${how?` · 배포 방식: ${how}`:''}`); },
      async()=>{ const ref=await api(`${base}/git/ref/tags/${encodeURIComponent('solution-v1.0.0')}`); return ref.missing?failed('원격에서 solution-v1.0.0 태그를 찾지 못했습니다.'):passed('원격 태그 solution-v1.0.0 확인'); }
    ];
    if(runnable){ for(let i=0;i<tasks.length;i++) checks[i+1]=await assess(tasks[i]); }
    else for(let i=1;i<scenarioDefinitions.length;i++) checks[i]=unknown('올바른 Fork 확인 후 평가할 수 있습니다.');
    const score=checks.reduce((sum,r,i)=>sum+(r.state==='pass'?scenarioDefinitions[i].points:0),0);
    renderScenarioResults(checks,score);
    status.textContent=checks.some(r=>r.state==='unknown')
      ? '일부 항목을 확인할 수 없습니다. 잠시 후 다시 시도하세요.'
      : `채점을 마쳤습니다. (GitHub API ${apiCalls}회 사용)`;
  } catch (error) {
    status.textContent = error.message || '채점 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.';
  } finally {
    button.disabled=false;
  }
}

function renderScenarioResults(checks,score){
  document.getElementById('scenarioScore').textContent=score;
  document.getElementById('scenarioScoreMessage').textContent=score===290?'모든 실전 시나리오를 해결했습니다.':'실패 항목의 가이드를 열어 결과를 다시 확인하세요.';
  const list=document.getElementById('scenarioResultList');
  list.replaceChildren(...checks.map((result,index)=>{ const row=document.createElement('div'); row.className='result-item'; const mark=document.createElement('span'); mark.className=`result-mark ${result.state}`; mark.textContent=result.state==='pass'?'✓':result.state==='fail'?'×':'?'; const body=document.createElement('div'); const strong=document.createElement('strong'); strong.textContent=scenarioDefinitions[index].title; const p=document.createElement('p'); p.textContent=result.detail; body.append(strong,p); if(result.state!=='pass'){const a=document.createElement('a');a.className='result-guide';a.href=`#scenario-${scenarioDefinitions[index].id}`;a.textContent='시나리오 가이드 보기 ↑';a.addEventListener('click',()=>{const card=document.getElementById(`scenario-${scenarioDefinitions[index].id}`); if(card) card.open=true;});body.append(a);} const points=document.createElement('b');points.textContent=`${result.state==='pass'?scenarioDefinitions[index].points:0} / ${scenarioDefinitions[index].points}점`;row.append(mark,body,points);return row;}));
  document.getElementById('scenarioResults').hidden=false;
}
