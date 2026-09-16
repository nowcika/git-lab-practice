const scenarioRoot = document.getElementById('scenarioApp');
const scenarioDefinitions = [
  { id:'fork', no:'00', title:'Fork하고 clone하기', points:15, level:'필수 준비', goal:'원본 저장소를 자신의 GitHub 계정으로 Fork하고 로컬에 clone합니다.', commands:`# 1. 아래 ‘원본 저장소 Fork’ 버튼을 먼저 누릅니다.
# 2. 내 Fork의 주소로 clone합니다.
git clone https://github.com/내사용자이름/git-scenario-lab.git
cd git-scenario-lab
git remote -v

# 원본 저장소를 upstream이라는 이름으로 연결합니다.
git remote add upstream https://github.com/nowcika/git-scenario-lab.git
git fetch upstream
git remote -v`, checks:['GitHub 저장소 화면에 “forked from nowcika/git-scenario-lab”이 표시되는가?', '`origin`은 내 Fork, `upstream`은 교육용 원본 주소인가?', '브라우저 다운로드 ZIP이 아니라 `git clone`을 사용했는가?'], verify:'Fork 관계와 소유 계정을 GitHub API로 검사합니다. clone 여부와 로컬 remote 이름은 공개되지 않아 이후 결과로 간접 확인합니다.' },
  { id:'upstream', no:'01', title:'upstream 변경 가져오기', points:15, level:'Remote · Merge', goal:'원본의 업데이트 브랜치를 fetch한 뒤 해결 브랜치에 병합합니다.', commands:`git fetch upstream
git switch -c solution/upstream-sync main
git merge upstream/scenario/upstream-update
git push -u origin solution/upstream-sync`, checks:['`git fetch upstream`에서 저장소 주소 오류가 없는가?', '`instructor-update.md`에 `UPSTREAM-SYNC-COMPLETE`가 있는가?', '`solution/upstream-sync`를 origin에 push했는가?'], verify:'해결 브랜치의 instructor-update.md와 고유 표시 문구를 검사합니다.' },
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
git push -u origin solution/conflict`, checks:['`git status`가 “both added” 또는 “unmerged paths”를 보여 주는가?', '충돌 표시 3종을 모두 제거했는가?', '프론트엔드·백엔드·통합 테스트 문구를 모두 작성했는가?', 'merge를 중단하거나 한쪽 파일만 선택하지 않고 merge commit을 완성했는가?'], verify:'파일의 세 가지 필수 문구와 부모가 2개 이상인 merge commit을 검사합니다.' },
  { id:'external', no:'03', title:'다른 저장소를 remote로 연결하기', points:15, level:'Multiple Remotes', goal:'외부 자료 저장소를 별도 remote로 연결하고 파일을 현재 저장소에 반영합니다.', commands:`git switch main
git switch -c solution/external-remote
git remote add external https://github.com/nowcika/git-scenario-library.git
git fetch external
git show external/main:shared-config.json > shared-config.json
git add shared-config.json
git commit -m "feat: import shared config from external remote"
git push -u origin solution/external-remote`, checks:['`git remote -v`에 origin, upstream, external 세 주소가 구분되는가?', '`git fetch external` 후 `external/main`이 보이는가?', 'shared-config.json의 marker가 `REMOTE-LIBRARY-V1`인가?'], verify:'외부 저장소에만 제공된 shared-config.json의 고유 내용과 커밋 메시지를 검사합니다.' },
  { id:'revert', no:'04', title:'잘못 올라간 커밋 되돌리기', points:15, level:'History · Revert', goal:'과거 기록을 삭제하지 않고 새 revert 커밋으로 실수한 변경을 취소합니다.', commands:`git fetch upstream
git switch -c solution/revert upstream/scenario/revert
git log --oneline -3
git revert HEAD
git push -u origin solution/revert`, checks:['`secrets.env`가 작업 폴더에서 제거됐는가?', '`app.conf`는 그대로 남아 있는가?', '`git log`에 원래 커밋과 Revert 커밋이 모두 보이는가?', '`reset --hard`나 force push로 기록을 지우지 않았는가?'], verify:'secrets.env 부재, app.conf 존재, Revert 커밋 메시지를 검사합니다.' },
  { id:'rebase', no:'05', title:'작업 브랜치를 최신 기준에 rebase하기', points:15, level:'History · Rebase', goal:'토픽 커밋을 새로운 기준 브랜치 위로 재배치해 선형 이력을 만듭니다.', commands:`git fetch upstream
git switch -c solution/rebase upstream/scenario/rebase-topic
git rebase upstream/scenario/rebase-base
git log --oneline --graph -5
git push -u origin solution/rebase`, checks:['base-update.txt와 topic.txt가 모두 존재하는가?', '두 커밋이 한 줄의 선형 이력으로 보이는가?', 'merge commit 없이 토픽 커밋이 기준 변경 뒤에 위치하는가?'], verify:'두 결과 파일, 관련 커밋 메시지, merge commit이 없는 선형 이력을 검사합니다.' },
  { id:'reset', no:'06', title:'git reset으로 최근 커밋 제거하기', points:15, level:'History · Reset', goal:'아직 공유하면 안 되는 최근 실험 커밋을 브랜치에서 제거하고 안정 상태로 되돌립니다.', commands:`git fetch upstream
git switch -c solution/reset upstream/scenario/reset
git log --oneline -3
# 최근 실험 커밋과 작업 파일을 함께 제거합니다.
git reset --hard HEAD~1
git status
git log --oneline -3
git push -u origin solution/reset`, checks:['reset 전 두 커밋의 순서를 log에서 확인했는가?', '`--hard`는 커밋과 작업 파일을 함께 버린다는 점을 이해했는가?', 'stable-config.txt는 남고 unwanted-experiment.txt는 사라졌는가?', '이미 공유한 협업 브랜치에서는 reset과 force push를 함부로 사용하지 않아야 한다.'], verify:'안정 설정 파일 존재, 실험 파일 부재, 해결 브랜치 끝 커밋을 검사합니다.' },
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
git push -u origin solution/reflog`, checks:['reset 직후 recovered-note.txt가 사라졌는가?', '`git reflog`에 잃어버린 커밋 메시지가 보이는가?', '해당 SHA를 cherry-pick한 뒤 파일이 복구됐는가?', 'reflog는 로컬 저장소 기록이므로 다른 PC나 GitHub에서 대신 볼 수 없다는 점을 이해했는가?'], verify:'복구된 고유 문구와 복구 커밋 메시지를 검사합니다.' },
  { id:'amend', no:'08', title:'git commit --amend로 마지막 커밋 수정하기', points:15, level:'History · Amend', goal:'마지막 커밋의 파일 오타와 커밋 메시지를 새 커밋을 추가하지 않고 바로잡습니다.', commands:`git fetch upstream
git switch -c solution/amend upstream/scenario/amend
# release-note.md를 아래처럼 수정합니다.
# # Release Note
# Version: draft

git add release-note.md
git commit --amend -m "docs: add release note"
git log --oneline -2
git push -u origin solution/amend`, checks:['수정 대상이 가장 최근 커밋인가?', '파일에서 `Releas`, `draff` 오타를 모두 고쳤는가?', '새 커밋을 하나 더 만든 것이 아니라 amend로 기존 커밋을 교체했는가?', '이미 다른 사람이 받은 커밋을 amend하면 SHA가 바뀐다는 점을 이해했는가?'], verify:'수정된 파일 내용, 정확한 최신 메시지, 기존 오타 메시지 부재를 검사합니다.' },
  { id:'cherry', no:'09', title:'git cherry-pick으로 필요한 커밋만 가져오기', points:15, level:'History · Cherry-pick', goal:'다른 브랜치 전체를 병합하지 않고 긴급 수정 커밋 하나만 선택해 적용합니다.', commands:`git fetch upstream
git switch -c solution/cherry-pick main
# 소스 브랜치의 커밋 SHA를 확인합니다.
git log --oneline upstream/scenario/cherry-source -1
# 표시된 SHA를 사용합니다.
git cherry-pick <긴급수정-SHA>
git push -u origin solution/cherry-pick`, checks:['소스 브랜치의 최신 SHA를 정확히 복사했는가?', 'merge 대신 cherry-pick을 실행했는가?', 'urgent-fix.txt에 `CHERRY-PICK-HOTFIX-2026`이 있는가?', '커밋 메시지가 긴급 수정 메시지로 유지됐는가?'], verify:'긴급 수정 파일과 cherry-pick된 커밋 메시지, merge commit 부재를 검사합니다.' },
  { id:'diff', no:'10', title:'git diff로 두 상태 비교하기', points:15, level:'Inspect · Diff', goal:'두 원격 브랜치의 파일·줄 변경을 비교하고 실제 patch 형식의 분석 결과를 제출합니다.', commands:`git fetch upstream
git switch -c solution/diff main
mkdir -p reports
git diff upstream/scenario/diff-base..upstream/scenario/diff-target > reports/change.patch

git diff --stat upstream/scenario/diff-base..upstream/scenario/diff-target
git diff --name-status upstream/scenario/diff-base..upstream/scenario/diff-target
cat reports/change.patch
git add reports/change.patch
git commit -m "docs: submit diff analysis"
git push -u origin solution/diff`, checks:['비교 순서가 base → target인가? 순서를 바꾸면 +와 -가 반대로 보입니다.', 'patch에 service.conf 변경과 deploy.conf 추가가 모두 보이는가?', '`--stat`, `--name-status`, 일반 diff의 출력 차이를 확인했는가?'], verify:'제출한 patch에 diff 헤더, production·timeout 변경, 새 파일의 고유 문구를 검사합니다.' },
  { id:'show', no:'11', title:'git show로 특정 커밋 조사하기', points:15, level:'Inspect · Show', goal:'브랜치의 최신 커밋 하나를 조사해 작성자·메시지·변경 내용을 보고서로 남깁니다.', commands:`git fetch upstream
git switch -c solution/show main
git log --oneline upstream/scenario/show-source -1
git show --stat upstream/scenario/show-source
git show upstream/scenario/show-source

mkdir -p reports
cat > reports/show-report.md <<'REPORT'
# git show 조사 결과
커밋 메시지: fix: restore missing deployment configuration
증거 문구: SHOW-EVIDENCE-4821
변경 파일: forensic.txt
REPORT

git add reports/show-report.md
git commit -m "docs: report inspected commit"
git push -u origin solution/show`, checks:['`git show`가 commit 정보와 patch를 함께 출력하는지 확인했는가?', '`git show --stat`은 요약만 보여 주는 차이를 확인했는가?', '보고서의 메시지, 증거 문구, 파일 이름이 실제 출력과 일치하는가?'], verify:'show 조사 보고서의 커밋 메시지·고유 증거·파일 이름을 검사합니다.' },
  { id:'patch', no:'12', title:'format-patch와 git am으로 변경 전달하기', points:15, level:'Patch · Email Flow', goal:'소스 커밋을 patch 파일로 내보낸 뒤 다른 브랜치에 커밋 정보와 함께 적용합니다.', commands:`git fetch upstream
# 소스 브랜치 최신 커밋을 이메일 patch 파일로 만듭니다.
git format-patch -1 upstream/scenario/patch-source --stdout > transfer.patch
less transfer.patch

git switch -c solution/patch main
git am transfer.patch
rm transfer.patch
git log --oneline -2
git push -u origin solution/patch`, checks:['patch 안에 From, Date, Subject와 파일 diff가 있는가?', '`git apply`와 달리 `git am`은 커밋 정보까지 생성한다는 점을 확인했는가?', '충돌 시 `git am --continue` 또는 `git am --abort`를 사용할 수 있는가?'], verify:'전달된 기능 파일, 원래 Subject의 커밋, merge 없는 이력을 검사합니다.' },
  { id:'blame', no:'13', title:'git blame으로 특정 줄의 변경자 찾기', points:15, level:'Inspect · Blame', goal:'여러 사람이 편집한 파일에서 문제의 줄을 마지막으로 변경한 작성자와 커밋을 추적합니다.', commands:`git fetch upstream
git switch -c solution/blame main
git blame upstream/scenario/blame -- audit-checklist.md
git blame -L 4,4 upstream/scenario/blame -- audit-checklist.md
git log -p upstream/scenario/blame -- audit-checklist.md

mkdir -p reports
cat > reports/blame-answer.md <<'ANSWER'
# blame 조사 답안
대상: BLAME-OWNER-7392
작성자: Release Manager
커밋 메시지: docs: add release approval check
ANSWER

git add reports/blame-answer.md
git commit -m "docs: submit blame investigation"
git push -u origin solution/blame`, checks:['파일 전체 blame과 `-L 4,4`의 범위 제한을 모두 실행했는가?', 'blame 결과의 작성자와 커밋 SHA를 구분했는가?', '그 SHA를 `git show`로 다시 확인했는가?', 'blame은 비난이 아니라 변경 이유를 찾는 조사 도구로 사용해야 합니다.'], verify:'답안 파일에서 대상 문구, 작성자, 원래 커밋 메시지를 검사합니다.' },
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
git status`, checks:['브랜치 이동 전 변경을 커밋해 작업 폴더가 깨끗한가?', 'branch-a에는 frontend 파일만 있고 backend 파일은 없는가?', 'branch-b에는 backend 파일과 수정된 frontend 파일이 모두 있는가?', 'branch-b 최신 메시지가 amend한 메시지인가?', '`git switch -`가 바로 이전 브랜치로 이동하는 것을 확인했는가?'], verify:'두 원격 브랜치의 파일 격리, 이동·수정된 내용, 최신 커밋 메시지와 선형 이력을 검사합니다.' },
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
# GitHub Actions 실행 완료 후 Releases 화면을 확인합니다.`, checks:['Fork의 Actions 사용이 활성화돼 있는가?', 'workflow에 `contents: write` 최소 권한과 GH_TOKEN 환경 변수가 있는가?', 'tag가 workflow 파일을 포함한 solution/actions-release 커밋을 가리키는가?', 'Actions 로그에서 초록색 완료 표시가 보이는가?', 'Release에 scenario-artifact.txt가 첨부됐는가?', '<a href="https://docs.github.com/en/actions" target="_blank" rel="noopener noreferrer">GitHub Actions 공식 문서 ↗</a>'], verify:'workflow 파일, release-v1.0.0의 실제 공개 Release, asset 이름과 상태를 검사합니다.' },
  { id:'pages', no:'16', title:'GitHub Pages로 홈페이지 서비스하기', points:25, level:'Deploy · Pages', goal:'Fork의 solution/pages 브랜치에 정적 홈페이지를 만들고 /docs 폴더를 공개 서비스합니다.', commands:`git fetch upstream
git switch -c solution/pages upstream/scenario/pages
# docs/index.html을 편집해 제목·설명을 꾸미고 아래 문구를 넣습니다.
# PAGES-LIVE-2026

git add docs/index.html docs/.nojekyll
git commit -m "feat: publish scenario homepage"
git push -u origin solution/pages

# GitHub 저장소 화면에서 설정합니다.
# Settings → Pages → Build and deployment
# Source: Deploy from a branch
# Branch: solution/pages
# Folder: /docs
# Save
# 배포 완료 후 표시되는 Visit site를 엽니다.`, checks:['Fork가 Public이고 이메일 인증이 완료됐는가?', 'docs 폴더 최상위에 index.html이 있는가?', 'Pages source가 solution/pages와 /docs로 정확히 설정됐는가?', 'Actions의 pages build and deployment가 완료됐는가?', 'Visit site에서 PAGES-LIVE-2026 문구가 보이는가?', '<a href="https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site" target="_blank" rel="noopener noreferrer">GitHub Pages 공식 설정 안내 ↗</a>'], verify:'홈페이지 파일의 표시 문구와 Pages API의 source branch·/docs 경로·built 상태를 검사합니다.' },
  { id:'tag', no:'17', title:'완료 지점에 tag 만들기', points:5, level:'Tag', goal:'모든 해결이 끝난 커밋에 주석 태그를 만들고 원격으로 push합니다.', commands:`# 원하는 solution 브랜치에서 실행합니다.
git tag -a solution-v1.0.0 -m "complete scenario lab"
git push origin solution-v1.0.0
git show solution-v1.0.0`, checks:['태그 이름이 정확히 `solution-v1.0.0`인가?', '`git push origin solution-v1.0.0`을 실행했는가?', 'GitHub 저장소의 Tags 화면에서 보이는가?'], verify:'Fork 저장소의 원격 tag ref 존재 여부를 검사합니다.' }
];

function scenarioAnswerUrl(id) {
  const refs={fork:'main',upstream:'solution/upstream-sync',conflict:'solution/conflict',external:'solution/external-remote',revert:'solution/revert',rebase:'solution/rebase',reset:'solution/reset',reflog:'solution/reflog',amend:'solution/amend',cherry:'solution/cherry-pick',diff:'solution/diff',show:'solution/show',patch:'solution/patch',blame:'solution/blame',workflow:'solution/branch-b',release:'solution/actions-release',pages:'solution/pages',tag:'solution/pages'};
  if(id==='release') return 'https://github.com/nowcika/git-scenario-solution/releases/tag/release-v1.0.0';
  if(id==='pages') return 'https://nowcika.github.io/git-scenario-solution/';
  if(id==='tag') return 'https://github.com/nowcika/git-scenario-solution/releases/tag/solution-v1.0.0';
  return `https://github.com/nowcika/git-scenario-solution/tree/${refs[id]}`;
}

if (scenarioRoot) {
  scenarioRoot.innerHTML = `<div class="scenario-start"><div><span class="scenario-kicker">START HERE</span><h3>하나의 Fork에서 17가지 문제를 해결합니다</h3><p>각 시나리오는 독립된 <code>solution/*</code> 브랜치를 사용하므로 순서대로 진행하거나 필요한 항목만 연습할 수 있습니다.</p></div><div class="scenario-start-actions"><a href="https://github.com/nowcika/git-scenario-lab/fork" target="_blank" rel="noopener noreferrer">① 원본 저장소 Fork ↗</a><a href="https://github.com/nowcika/git-scenario-lab" target="_blank" rel="noopener noreferrer">원본 구조 보기 ↗</a><a href="https://github.com/nowcika/git-scenario-library" target="_blank" rel="noopener noreferrer">외부 저장소 보기 ↗</a><a href="https://github.com/nowcika/git-scenario-solution" target="_blank" rel="noopener noreferrer">전체 정답 저장소 ↗</a></div></div>
  <div class="scenario-flow"><span><b>1</b> Fork</span><i>→</i><span><b>2</b> Clone</span><i>→</i><span><b>3</b> Remote 연결</span><i>→</i><span><b>4</b> 문제 해결</span><i>→</i><span><b>5</b> Push·채점</span></div>
  <div class="scenario-list">${scenarioDefinitions.map(s => `<details class="scenario" id="scenario-${s.id}" ${s.id==='fork'?'open':''}><summary><span class="scenario-no">${s.no}</span><div><small>${s.level}</small><strong>${s.title}</strong><p>${s.goal}</p></div><b>${s.points}점</b></summary><div class="scenario-body"><div><h4>실행 순서</h4><pre><code>${s.commands}</code><button class="scenario-copy" type="button">명령 복사</button></pre><p class="scenario-verify"><strong>자동 채점 기준</strong>${s.verify}</p></div><div><h4>막혔을 때 확인</h4><ul>${s.checks.map(c=>`<li>${c}</li>`).join('')}</ul><div class="scenario-resource-links"><a class="scenario-doc" href="https://git-scm.com/docs" target="_blank" rel="noopener noreferrer">Git 공식 명령 문서 ↗</a><a class="scenario-answer" href="${scenarioAnswerUrl(s.id)}" target="_blank" rel="noopener noreferrer">정답 결과 보기 ↗</a></div></div></div></details>`).join('')}</div>
  <div class="scenario-grade"><div class="scenario-grade-head"><div><span class="eyebrow">SCENARIO GRADER</span><h3>내 Fork 결과 채점</h3><p>Fork가 Public이어야 인증 없이 확인할 수 있습니다.</p></div><button id="scenarioGradeButton" class="grade-button">시나리오 채점하기 <span>→</span></button></div><label for="scenarioRepoUrl">내 Fork 저장소 URL</label><input id="scenarioRepoUrl" type="url" placeholder="https://github.com/내사용자이름/git-scenario-lab" autocomplete="url"><div id="scenarioStatus" role="status" aria-live="polite"></div><div id="scenarioResults" hidden><div class="scenario-score"><strong id="scenarioScore">0</strong><span>/ 290점</span><p id="scenarioScoreMessage"></p></div><div id="scenarioResultList" class="result-list"></div></div></div>`;
  const scenarioInput = document.getElementById('scenarioRepoUrl');
  scenarioInput.value = localStorage.getItem('gitlab:scenarioRepoUrl') || '';
  scenarioInput.addEventListener('input', () => localStorage.setItem('gitlab:scenarioRepoUrl', scenarioInput.value));
  scenarioRoot.querySelectorAll('.scenario-copy').forEach(button => button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.previousElementSibling.textContent); button.textContent='복사됨'; }
    catch { button.textContent='복사 실패'; }
    setTimeout(()=>button.textContent='명령 복사',1500);
  }));
  document.getElementById('scenarioGradeButton').addEventListener('click', gradeScenarios);
}

async function scenarioContent(base, path, ref) {
  const data = await api(`${base}/contents/${path}?ref=${encodeURIComponent(ref)}`);
  if (data.missing || !data.content) return null;
  const bytes = Uint8Array.from(atob(data.content.replace(/\s/g,'')), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function gradeScenarios() {
  const input = document.getElementById('scenarioRepoUrl');
  const parsed = parseRepo(input.value); const status = document.getElementById('scenarioStatus');
  const button = document.getElementById('scenarioGradeButton');
  if (!parsed) { status.textContent='Fork URL을 https://github.com/사용자/git-scenario-lab 형식으로 입력하세요.'; input.focus(); return; }
  button.disabled=true; status.textContent='Fork와 해결 브랜치를 확인하는 중입니다…'; document.getElementById('scenarioResults').hidden=true;
  const base=`/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}`;
  const checks=[];
  checks[0]=await assess(async()=>{ const repo=await api(base); if(repo.missing) return failed('공개 저장소를 찾지 못했습니다.'); if(repo.owner?.login?.toLowerCase()!==parsed.owner.toLowerCase()) return failed('저장소 소유자를 확인할 수 없습니다.'); const officialAnswer=repo.full_name?.toLowerCase()==='nowcika/git-scenario-solution'; if(!officialAnswer&&(!repo.fork || repo.parent?.full_name?.toLowerCase()!=='nowcika/git-scenario-lab')) return failed('원본 저장소의 Fork가 아닙니다. Fork 버튼으로 만든 저장소 URL을 입력하세요.'); return passed(officialAnswer?`공식 정답 저장소 확인: ${repo.full_name}`:`Fork 확인: ${repo.full_name} ← ${repo.parent.full_name}`); });
  const runnable=checks[0].state==='pass';
  const tasks=[
    async()=>{ const content=await scenarioContent(base,'instructor-update.md','solution/upstream-sync'); return content?.includes('UPSTREAM-SYNC-COMPLETE')?passed('solution/upstream-sync에 원본 업데이트 반영'):failed('해결 브랜치나 instructor-update.md의 표시 문구를 찾지 못했습니다.'); },
    async()=>{ const content=await scenarioContent(base,'team-plan.md','solution/conflict'); const commits=await api(`${base}/commits?sha=${encodeURIComponent('solution/conflict')}&per_page=30`); const words=['프론트엔드: UI 배포 준비','백엔드: API 배포 준비','공동 확인: 통합 테스트 완료']; const merged=Array.isArray(commits)&&commits.some(c=>(c.parents||[]).length>=2); return content&&words.every(w=>content.includes(w))&&merged?passed('양쪽 변경과 merge commit 확인'):failed('team-plan.md의 필수 3개 문구와 merge commit을 모두 확인하세요.'); },
    async()=>{ const content=await scenarioContent(base,'shared-config.json','solution/external-remote'); const commits=await api(`${base}/commits?sha=${encodeURIComponent('solution/external-remote')}&per_page=20`); const msg=Array.isArray(commits)&&commits.some(c=>/import shared config/i.test(c.commit?.message||'')); return content?.includes('REMOTE-LIBRARY-V1')&&msg?passed('외부 remote 자료와 반영 커밋 확인'):failed('외부 저장소의 shared-config.json과 지정 커밋 메시지를 확인하세요.'); },
    async()=>{ const secret=await api(`${base}/contents/secrets.env?ref=${encodeURIComponent('solution/revert')}`); const config=await scenarioContent(base,'app.conf','solution/revert'); const commits=await api(`${base}/commits?sha=${encodeURIComponent('solution/revert')}&per_page=20`); const reverted=Array.isArray(commits)&&commits.some(c=>/^Revert /i.test(c.commit?.message||'')); return secret.missing&&config?.includes('production=true')&&reverted?passed('잘못된 파일 제거와 Revert 이력 확인'):failed('secrets.env는 없어야 하고 app.conf와 Revert 커밋은 남아야 합니다.'); },
    async()=>{ const baseFile=await scenarioContent(base,'notes/base-update.txt','solution/rebase'); const topicFile=await scenarioContent(base,'notes/topic.txt','solution/rebase'); const commits=await api(`${base}/commits?sha=${encodeURIComponent('solution/rebase')}&per_page=20`); const linear=Array.isArray(commits)&&!commits.some(c=>(c.parents||[]).length>1); const messages=Array.isArray(commits)&&commits.map(c=>c.commit?.message||'').join('\n'); return baseFile&&topicFile&&linear&&/notification topic note/.test(messages)&&/common deployment rule/.test(messages)?passed('기준·토픽 변경과 선형 이력 확인'):failed('두 결과 파일과 두 커밋이 merge 없이 선형 이력에 있어야 합니다.'); },
    async()=>{ const stable=await scenarioContent(base,'stable-config.txt','solution/reset'); const unwanted=await api(`${base}/contents/unwanted-experiment.txt?ref=${encodeURIComponent('solution/reset')}`); const commits=await api(`${base}/commits?sha=${encodeURIComponent('solution/reset')}&per_page=1`); const tip=Array.isArray(commits)&&commits[0]?.commit?.message||''; return stable?.includes('STABLE-CONFIG-V1')&&unwanted.missing&&/stable configuration/.test(tip)?passed('hard reset 후 안정 커밋 상태 확인'):failed('stable-config.txt만 남고 해결 브랜치 끝이 안정 커밋이어야 합니다.'); },
    async()=>{ const recovered=await scenarioContent(base,'recovered-note.txt','solution/reflog'); const commits=await api(`${base}/commits?sha=${encodeURIComponent('solution/reflog')}&per_page=10`); const message=Array.isArray(commits)&&commits.some(c=>/add recoverable note/.test(c.commit?.message||'')); return recovered?.includes('REFLOG-RECOVERED-COMMIT')&&message?passed('reflog로 복구한 파일과 커밋 확인'):failed('recovered-note.txt의 고유 문구와 복구 커밋을 확인하세요.'); },
    async()=>{ const note=await scenarioContent(base,'release-note.md','solution/amend'); const commits=await api(`${base}/commits?sha=${encodeURIComponent('solution/amend')}&per_page=10`); const messages=Array.isArray(commits)?commits.map(c=>c.commit?.message||''):[]; return note?.includes('# Release Note')&&note?.includes('Version: draft')&&messages[0]==='docs: add release note'&&!messages.some(m=>/releas note/.test(m))?passed('amend된 파일과 최신 커밋 메시지 확인'):failed('파일의 두 오타와 최신 메시지를 amend로 바로잡으세요.'); },
    async()=>{ const fix=await scenarioContent(base,'urgent-fix.txt','solution/cherry-pick'); const commits=await api(`${base}/commits?sha=${encodeURIComponent('solution/cherry-pick')}&per_page=10`); const picked=Array.isArray(commits)&&commits.some(c=>/urgent standalone hotfix/.test(c.commit?.message||'')); const linear=Array.isArray(commits)&&!commits.some(c=>(c.parents||[]).length>1); return fix?.includes('CHERRY-PICK-HOTFIX-2026')&&picked&&linear?passed('선택한 긴급 수정 커밋 확인'):failed('긴급 수정 커밋만 cherry-pick하고 해결 브랜치를 push하세요.'); },
    async()=>{ const patch=await scenarioContent(base,'reports/change.patch','solution/diff'); const required=['diff --git','SERVICE_MODE=production','TIMEOUT=60','DIFF-TARGET-2026','config/deploy.conf']; return patch&&required.every(x=>patch.includes(x))?passed('두 브랜치의 실제 diff patch 확인'):failed('reports/change.patch에 두 파일의 전체 diff를 저장하세요.'); },
    async()=>{ const report=await scenarioContent(base,'reports/show-report.md','solution/show'); const required=['fix: restore missing deployment configuration','SHOW-EVIDENCE-4821','forensic.txt']; return report&&required.every(x=>report.includes(x))?passed('git show 조사 보고서 확인'):failed('show-report.md에 메시지, 증거 문구, 파일 이름을 기록하세요.'); },
    async()=>{ const file=await scenarioContent(base,'patch-feature.txt','solution/patch'); const commits=await api(`${base}/commits?sha=${encodeURIComponent('solution/patch')}&per_page=10`); const subject=Array.isArray(commits)&&commits.some(c=>c.commit?.message==='feat: add transferable patch feature'); const linear=Array.isArray(commits)&&!commits.some(c=>(c.parents||[]).length>1); return file?.includes('FORMAT-PATCH-TRANSFER-2026')&&subject&&linear?passed('format-patch로 전달된 커밋 확인'):failed('format-patch를 git am으로 solution/patch에 적용하세요.'); },
    async()=>{ const answer=await scenarioContent(base,'reports/blame-answer.md','solution/blame'); const required=['BLAME-OWNER-7392','Release Manager','docs: add release approval check']; return answer&&required.every(x=>answer.includes(x))?passed('blame 조사 답안 확인'):failed('blame-answer.md에 대상, 작성자, 커밋 메시지를 기록하세요.'); },
    async()=>{ const aFront=await scenarioContent(base,'frontend-task.txt','solution/branch-a'); const aBack=await scenarioContent(base,'backend-task.txt','solution/branch-a'); const bFront=await scenarioContent(base,'frontend-task.txt','solution/branch-b'); const bBack=await scenarioContent(base,'backend-task.txt','solution/branch-b'); const commits=await api(`${base}/commits?sha=${encodeURIComponent('solution/branch-b')}&per_page=10`); const tip=Array.isArray(commits)&&commits[0]?.commit?.message; const linear=Array.isArray(commits)&&!commits.some(c=>(c.parents||[]).length>1); return aFront?.includes('BRANCH-A-ORIGINAL')&&!aBack&&bFront?.includes('MOVED-AND-AMENDED-2026')&&bBack?.includes('BRANCH-B-BACKEND')&&tip==='feat: move and refine shared task'&&linear?passed('두 브랜치 작업과 커밋 이동·amend 확인'):failed('branch-a/branch-b 파일 격리와 branch-b 최신 amend 결과를 확인하세요.'); },
    async()=>{ const workflow=await scenarioContent(base,'.github/workflows/release.yml','solution/actions-release'); const release=await api(`${base}/releases/tags/${encodeURIComponent('release-v1.0.0')}`); const asset=!release.missing&&Array.isArray(release.assets)&&release.assets.find(a=>a.name==='scenario-artifact.txt'&&a.state==='uploaded'); const valid=workflow&&workflow.includes('contents: write')&&workflow.includes('gh release create')&&workflow.includes('release-v'); return valid&&!release.missing&&!release.draft&&asset?passed(`Actions Release와 asset 확인: ${release.html_url}`):failed('workflow, release-v1.0.0 공개 Release, scenario-artifact.txt asset을 모두 확인하세요.'); },
    async()=>{ const page=await scenarioContent(base,'docs/index.html','solution/pages'); const url=`https://${parsed.owner.toLowerCase()}.github.io/${parsed.name}/`; const response=await fetch(url); const live=response.ok?await response.text():''; return page?.includes('PAGES-LIVE-2026')&&live.includes('PAGES-LIVE-2026')?passed(`Pages 실제 서비스 확인: ${url}`):failed('solution/pages의 문구, Pages source(/docs), 실제 Visit site 응답을 확인하세요.'); },
    async()=>{ const ref=await api(`${base}/git/ref/tags/${encodeURIComponent('solution-v1.0.0')}`); return ref.missing?failed('원격에서 solution-v1.0.0 태그를 찾지 못했습니다.'):passed('원격 태그 solution-v1.0.0 확인'); }
  ];
  if(runnable){ const rest=await Promise.all(tasks.map(assess)); rest.forEach((r,i)=>checks[i+1]=r); }
  else for(let i=1;i<scenarioDefinitions.length;i++) checks[i]=unknown('올바른 Fork 확인 후 평가할 수 있습니다.');
  const score=checks.reduce((sum,r,i)=>sum+(r.state==='pass'?scenarioDefinitions[i].points:0),0);
  renderScenarioResults(checks,score); status.textContent=checks.some(r=>r.state==='unknown')?'일부 항목을 확인할 수 없습니다. 잠시 후 다시 시도하세요.':''; button.disabled=false;
}

function renderScenarioResults(checks,score){
  document.getElementById('scenarioScore').textContent=score;
  document.getElementById('scenarioScoreMessage').textContent=score===290?'모든 실전 시나리오를 해결했습니다.':'실패 항목의 가이드를 열어 결과를 다시 확인하세요.';
  const list=document.getElementById('scenarioResultList');
  list.replaceChildren(...checks.map((result,index)=>{ const row=document.createElement('div'); row.className='result-item'; const mark=document.createElement('span'); mark.className=`result-mark ${result.state}`; mark.textContent=result.state==='pass'?'✓':result.state==='fail'?'×':'?'; const body=document.createElement('div'); const strong=document.createElement('strong'); strong.textContent=scenarioDefinitions[index].title; const p=document.createElement('p'); p.textContent=result.detail; body.append(strong,p); if(result.state!=='pass'){const a=document.createElement('a');a.className='result-guide';a.href=`#scenario-${scenarioDefinitions[index].id}`;a.textContent='시나리오 가이드 보기 ↑';a.onclick=()=>{document.getElementById(`scenario-${scenarioDefinitions[index].id}`).open=true;};body.append(a);} const points=document.createElement('b');points.textContent=`${result.state==='pass'?scenarioDefinitions[index].points:0} / ${scenarioDefinitions[index].points}점`;row.append(mark,body,points);return row;}));
  document.getElementById('scenarioResults').hidden=false;
}
