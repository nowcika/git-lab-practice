'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

class Unavailable extends Error {}
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1' }, ...options,
  });
  if (result.error) throw new Unavailable(`${command} 실행 불가 (${result.error.code})`);
  return result;
}

function parseGitHub(value) {
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w-]+)\/([\w.-]+?)\/?$/.exec(value);
  return match ? `${match[1]}/${match[2].replace(/\.git$/, '')}` : null;
}

class Repository {
  constructor(directory) {
    this.directory = path.resolve(directory);
    if (this.git(['rev-parse', '--is-inside-work-tree'], true) !== 'true') {
      throw new Error('작업 트리가 있는 Git 저장소 경로를 지정하세요.');
    }
    this.root = this.git(['rev-parse', '--show-toplevel']);
    this.shallow = this.git(['rev-parse', '--is-shallow-repository']) === 'true';
  }
  git(args, optional = false) {
    const result = run('git', ['-C', this.directory, ...args]);
    if (result.status !== 0) {
      if (optional) return null;
      throw new Unavailable(`Git 조회 실패: ${args[0]}`);
    }
    return result.stdout.trimEnd();
  }
  sha(ref) { return this.git(['rev-parse', '--verify', `${ref}^{commit}`], true); }
  branch(name) { return this.sha(`refs/heads/${name}`); }
  file(sha, filename) {
    // Check tree existence first: a corrupt/missing object must not count as an absent file.
    const tree = this.git(['ls-tree', '--name-only', sha, '--', filename]);
    return tree ? this.git(['show', `${sha}:${filename}`]) : null;
  }
  objectType(sha) { return this.git(['cat-file', '-t', sha], true); }
  blob(sha) { return this.git(['cat-file', 'blob', sha], true); }
  commitField(sha, format) { return this.git(['log', '-1', `--format=${format}`, sha], true); }
  history(sha) {
    if (this.shallow) throw new Unavailable('shallow clone: 전체 이력이 없어 판정할 수 없습니다.');
    return this.git(['log', '--format=%H%x00%P%x00%B%x00%x1e', sha, '--'])
      .split('\x1e').map(row => row.trim()).filter(Boolean).map(row => {
        const [id, parents, message] = row.split('\0');
        return { sha: id, parents: parents ? parents.split(' ') : [], message: message.trim() };
      });
  }
  revertEvidence(sha) {
    const history = this.history(sha);
    for (const commit of history) {
      const original = /This reverts commit ([a-f0-9]{40,64})\./.exec(commit.message)?.[1];
      if (!original || commit.parents.length !== 1) continue;
      const target = history.find(c => c.sha === original);
      if (!target || target.parents.length !== 1) continue;
      if (this.git(['merge-base', '--is-ancestor', original, commit.parents[0]], true) === null) continue;
      const patchId = patch => {
        const result = run('git', ['patch-id', '--stable'], { input: patch });
        if (result.status !== 0) throw new Unavailable('patch-id 조회 실패');
        return result.stdout.split(/\s/)[0];
      };
      const before = this.git(['diff', '--no-ext-diff', '--no-textconv', target.parents[0], original, '--']);
      const undone = this.git(['diff', '--no-ext-diff', '--no-textconv', commit.sha, commit.parents[0], '--']);
      if (before && patchId(before) === patchId(undone)) return { original, revert: commit.sha };
    }
    return null;
  }
}

class GitHub {
  async get(endpoint) {
    const result = run('gh', ['api', '--hostname', 'github.com', '-H', 'Accept: application/vnd.github+json', endpoint]);
    if (result.status !== 0) {
      if (/HTTP 404/.test(result.stderr)) return null;
      const status = /HTTP (\d+)/.exec(result.stderr)?.[1];
      throw new Unavailable(`GitHub 조회 불가${status ? ` (HTTP ${status})` : ': gh auth login으로 인증 및 네트워크를 확인하세요.'}`);
    }
    try { return JSON.parse(result.stdout); }
    catch { throw new Unavailable('GitHub 응답을 해석할 수 없습니다.'); }
  }
  async find(endpoint, predicate) {
    for (let page = 1; page <= 10; page++) {
      const values = await this.get(`${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      if (values === null) return null;
      if (!Array.isArray(values)) throw new Unavailable('GitHub 목록 응답 형식 오류');
      const found = values.find(predicate);
      if (found) return found;
      if (values.length < 100) return null;
    }
    throw new Unavailable('조회 범위 1,000개를 초과해 판정을 보류합니다.');
  }
}

const includes = (text, ...words) => typeof text === 'string' && words.every(word => text.includes(word));

// 보고서에 적힌 SHA가 이 저장소에 실제로 존재하는 커밋이고,
// 함께 적은 제목과 작성자가 그 커밋의 값과 일치하는지 확인합니다.
// 화면의 예시를 그대로 베끼면 통과할 수 없습니다.
function evidenceCommit(repo, text) {
  const tokens = String(text || '').toLowerCase().match(/\b[0-9a-f]{7,40}\b/g) || [];
  if (!tokens.length) return { status: 'missing-sha' };
  let reachable = false;
  for (const token of tokens) {
    if (repo.objectType(token) !== 'commit') continue;
    reachable = true;
    const subject = repo.commitField(token, '%s');
    const author = repo.commitField(token, '%an');
    if (subject && author && text.includes(subject) && text.includes(author)) return { status: 'ok', sha: token, subject, author };
  }
  // 원본 커밋이 아직 로컬에 없으면 오답이 아니라 판정 보류입니다(git fetch upstream 필요).
  return { status: reachable ? 'mismatch' : 'unreachable' };
}
function requireEvidence(repo, text, label) {
  const evidence = evidenceCommit(repo, text);
  if (evidence.status === 'ok') return evidence;
  if (evidence.status === 'unreachable') {
    throw new Unavailable(`${label}에 적힌 커밋을 로컬 저장소에서 찾을 수 없습니다. git fetch upstream을 실행한 뒤 다시 검사하세요.`);
  }
  return evidence;
}

// 제출한 patch가 git diff가 만든 실제 출력인지 확인합니다.
// index 줄의 결과 blob 해시가 저장소에 존재해야 하고,
// 그 blob의 내용이 patch 안에 실제로 담겨 있어야 합니다.
function verifiedPatch(repo, patch) {
  if (typeof patch !== 'string' || !patch.includes('@@')) return { status: 'malformed' };
  const files = [...patch.matchAll(/^diff --git a\/(\S+) b\/(\S+)$/gm)].map(m => m[2]);
  const blobs = [...patch.matchAll(/^index [0-9a-f]{7,40}\.\.([0-9a-f]{7,40})/gm)].map(m => m[1])
    .filter(sha => !/^0+$/.test(sha));
  if (!files.length || !blobs.length || files.length !== blobs.length) return { status: 'malformed' };
  for (const sha of blobs) {
    if (repo.objectType(sha) !== 'blob') return { status: 'unreachable', sha };
    const content = repo.blob(sha);
    if (content === null) return { status: 'unreachable', sha };
    for (const line of content.split('\n')) {
      const value = line.trim();
      if (value && !patch.includes(value)) return { status: 'mismatch', sha, line: value };
    }
  }
  return { status: 'ok', files, blobs };
}
const scenarioSpecs = [
  ['upstream', 'upstream 변경', 15, 'upstream-sync', (c, e) => {
    if (!includes(c.file('instructor-update.md'), 'UPSTREAM-SYNC-COMPLETE')) { e.reason = 'instructor-update.md에서 표시 문구를 찾지 못했습니다.'; return false; }
    // 파일만 만든 제출과 실제 병합을 구분합니다(웹 채점기와 같은 기준).
    if (!c.history().some(h => h.parents.length >= 2)) { e.reason = '파일은 있지만 merge 커밋이 없습니다. upstream 브랜치를 실제로 merge하세요.'; return false; }
    return true;
  }],
  ['conflict', '충돌 해결', 20, 'conflict', c => includes(c.file('team-plan.md'), '프론트엔드: UI 배포 준비', '백엔드: API 배포 준비', '공동 확인: 통합 테스트 완료') && c.history().some(h => h.parents.length >= 2)],
  ['external', '외부 자료 반영', 15, 'external-remote', c => includes(c.file('shared-config.json'), 'REMOTE-LIBRARY-V1') && c.messages(/import shared config/i)],
  ['revert', '변경을 역으로 적용한 revert', 15, 'revert', c => c.file('secrets.env') === null && includes(c.file('app.conf'), 'production=true') && Boolean(c.repo.revertEvidence(c.sha))],
  ['rebase', 'rebase 결과와 선형 이력', 15, 'rebase', c => Boolean(c.file('notes/base-update.txt')) && Boolean(c.file('notes/topic.txt')) && c.linear() && c.messages(/notification topic note/) && c.messages(/common deployment rule/)],
  ['reset', '안정 커밋 복원', 15, 'reset', c => includes(c.file('stable-config.txt'), 'STABLE-CONFIG-V1') && c.file('unwanted-experiment.txt') === null && /stable configuration/.test(c.history()[0].message)],
  ['reflog', '복구 결과', 15, 'reflog', c => includes(c.file('recovered-note.txt'), 'REFLOG-RECOVERED-COMMIT') && c.messages(/add recoverable note/)],
  ['amend', 'amend 결과', 15, 'amend', c => includes(c.file('release-note.md'), '# Release Note', 'Version: draft') && c.history()[0].message === 'docs: add release note' && !c.messages(/releas note/)],
  ['cherry', '선택한 긴급 수정', 15, 'cherry-pick', c => includes(c.file('urgent-fix.txt'), 'CHERRY-PICK-HOTFIX-2026') && c.messages(/urgent standalone hotfix/) && c.linear()],
  ['diff', 'diff 보고서', 15, 'diff', (c, e) => {
    const patch = c.file('reports/change.patch');
    if (!includes(patch, 'diff --git', 'SERVICE_MODE=production', 'TIMEOUT=60', 'DIFF-TARGET-2026', 'config/deploy.conf')) {
      e.reason = 'reports/change.patch에 두 파일의 전체 diff가 없습니다.'; return false;
    }
    const verified = verifiedPatch(c.repo, patch);
    if (verified.status === 'unreachable') {
      throw new Unavailable('patch가 가리키는 blob을 로컬 저장소에서 찾을 수 없습니다. git fetch upstream을 실행한 뒤 다시 검사하세요.');
    }
    if (verified.status !== 'ok') {
      e.reason = verified.status === 'malformed'
        ? 'patch에 diff --git·index·@@ 줄이 제대로 없습니다. git diff 출력을 그대로 저장하세요.'
        : `patch의 내용이 실제 blob(${verified.sha.slice(0, 7)})과 다릅니다: "${verified.line.slice(0, 24)}"`;
      return false;
    }
    e.patch = verified; return true;
  }],
  ['show', 'show 보고서', 15, 'show', (c, e) => {
    const report = c.file('reports/show-report.md');
    if (report === null) { e.reason = 'reports/show-report.md가 없습니다.'; return false; }
    const evidence = requireEvidence(c.repo, report, 'show 보고서');
    if (evidence.status !== 'ok') {
      e.reason = evidence.status === 'missing-sha'
        ? '보고서에 커밋 SHA가 없습니다. git show 첫 줄의 SHA를 7자리 이상 적으세요.'
        : '보고서의 커밋 메시지·작성자가 그 SHA의 실제 값과 다릅니다.';
      return false;
    }
    e.inspected = evidence;
    const files = (c.repo.git(['show', '--name-only', '--format=', evidence.sha], true) || '').split('\n').filter(Boolean);
    if (!files.length || !files.some(name => report.includes(name.split('/').pop()))) {
      e.reason = `보고서에 ${evidence.sha.slice(0, 7)} 커밋이 바꾼 파일 이름이 없습니다.`; return false;
    }
    const added = (c.repo.git(['show', '--format=', '--unified=0', evidence.sha], true) || '')
      .split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++') && line.slice(1).trim());
    if (added.length && !added.some(line => report.includes(line.slice(1).trim()))) {
      e.reason = '보고서에 그 커밋이 추가한 증거 문구가 없습니다.'; return false;
    }
    return true;
  }],
  ['patch', 'patch 적용 결과', 15, 'patch', c => includes(c.file('patch-feature.txt'), 'FORMAT-PATCH-TRANSFER-2026') && c.history().some(h => h.message === 'feat: add transferable patch feature') && c.linear()],
  ['blame', 'blame 보고서', 15, 'blame', (c, e) => {
    const answer = c.file('reports/blame-answer.md');
    if (answer === null) { e.reason = 'reports/blame-answer.md가 없습니다.'; return false; }
    const evidence = requireEvidence(c.repo, answer, 'blame 답안');
    if (evidence.status !== 'ok') {
      e.reason = evidence.status === 'missing-sha'
        ? '답안에 커밋 SHA가 없습니다. blame이 알려 준 SHA를 7자리 이상 적으세요.'
        : '답안의 커밋 메시지·작성자가 그 SHA의 실제 값과 다릅니다.';
      return false;
    }
    e.blamed = evidence;
    // 그 커밋이 실제로 대상 줄을 추가했는지 확인합니다.
    const added = (c.repo.git(['show', '--format=', '--unified=0', evidence.sha], true) || '')
      .split('\n').filter(line => /^\+.*BLAME-OWNER-/.test(line));
    if (!added.length) { e.reason = `${evidence.sha.slice(0, 7)}은 승인 코드 줄을 바꾼 커밋이 아닙니다. blame으로 해당 줄의 커밋을 다시 찾으세요.`; return false; }
    const marker = (added[0].match(/BLAME-OWNER-[\w-]+/) || [''])[0];
    if (marker && !answer.includes(marker)) { e.reason = '답안에 대상 승인 코드가 없습니다.'; return false; }
    return true;
  }],
  ['workflow', '브랜치 분리와 커밋 수정', 20, 'branch-b', c => {
    const a = c.repo.branch('solution/branch-a');
    return Boolean(a) && includes(c.repo.file(a, 'frontend-task.txt'), 'BRANCH-A-ORIGINAL') && c.repo.file(a, 'backend-task.txt') === null && includes(c.file('frontend-task.txt'), 'MOVED-AND-AMENDED-2026') && includes(c.file('backend-task.txt'), 'BRANCH-B-BACKEND') && c.history()[0].message === 'feat: move and refine shared task' && c.linear();
  }],
  ['release', 'Actions Release', 25, 'actions-release', (c, e) => {
    if (!includes(c.file('.github/workflows/release.yml'), 'contents: write', 'gh release create', 'release-v')) {
      e.reason = 'workflow에 permissions의 contents: write, gh release create 단계, release-v 태그 트리거가 모두 필요합니다.'; return false;
    }
    // 태그가 workflow를 포함한 커밋을 가리켜야 Actions가 실행됩니다.
    const tag = c.repo.sha('refs/tags/release-v1.0.0');
    if (!tag) { e.reason = '로컬에 release-v1.0.0 태그가 없습니다. workflow를 push한 뒤 태그를 만드세요.'; return false; }
    if (c.repo.file(tag, '.github/workflows/release.yml') === null) {
      e.reason = 'release-v1.0.0 태그가 workflow 파일이 없는 커밋을 가리킵니다. 태그를 지우고 다시 만드세요.'; return false;
    }
    e.tag = { sha: tag }; return true;
  }],
  // 브랜치 배포와 Actions 배포 중 어느 방식이든 인정합니다. 실제 판정은 사이트 응답으로 합니다.
  ['pages', 'Pages 실제 배포', 25, 'pages', (c, e) => {
    if (!includes(c.file('docs/index.html'), 'PAGES-LIVE-2026')) {
      e.reason = 'docs/index.html에 PAGES-LIVE-2026 문구가 없습니다.'; return false;
    }
    const workflow = c.file('.github/workflows/pages.yml');
    e.deployment = workflow && workflow.includes('actions/deploy-pages') ? 'actions' : 'branch';
    return true;
  }],
];

async function grade(options, services = {}) {
  const repo = new Repository(options.repo || '.');
  const github = services.github || new GitHub();
  const online = !options.offline;
  const origin = repo.git(['remote', 'get-url', 'origin'], true);
  const target = options.github || parseGitHub(origin || '');
  if (target && !/^[\w-]+\/[\w.-]+$/.test(target)) throw new Error('--github는 owner/repo 형식이어야 합니다.');
  if (!['basic', 'scenarios'].includes(options.course || 'basic')) throw new Error('--course는 basic 또는 scenarios입니다.');
  const course = options.course || 'basic';
  const results = [];
  const diagnostics = [];
  let metadata, account, accessError;
  if (online) {
    try {
      if (!target) throw new Unavailable('GitHub origin이 없으므로 --github owner/repo를 지정하세요.');
      account = await github.get('/user');
      if (!account?.login) throw new Unavailable('GitHub 로그인 계정을 확인할 수 없습니다.');
      metadata = await github.get(`/repos/${target}`);
    } catch (error) { accessError = error.message; }
  }
  const username = options.username || account?.login || target?.split('/')[0];
  const identityMismatch = account && username && account.login.toLowerCase() !== username.toLowerCase();
  const wrongOwner = metadata && metadata.owner?.login?.toLowerCase() !== username?.toLowerCase();
  const wrongOrigin = Boolean(origin && parseGitHub(origin)?.toLowerCase() !== target?.toLowerCase());
  const validFork = metadata?.full_name?.toLowerCase() === 'nowcika/git-scenario-solution' || (metadata?.fork && metadata.parent?.full_name?.toLowerCase() === 'nowcika/git-scenario-lab');
  const inspectedRefs = new Map();
  function requireOnline() {
    if (!online) throw new Unavailable('오프라인 모드: GitHub 확인 필요');
    if (accessError) throw new Unavailable(accessError);
  }
  function untrustedReason() {
    if (!metadata) return 'GitHub에서 저장소 정보를 가져오지 못했습니다.';
    if (metadata.private) return '비공개 저장소입니다. 공개로 전환하세요.';
    if (identityMismatch) return `인증 계정(${account.login})과 지정한 사용자(${username})가 다릅니다.`;
    if (wrongOwner) return `저장소 소유자(${metadata.owner?.login})가 지정한 사용자와 다릅니다.`;
    if (wrongOrigin) return `origin(${parseGitHub(origin || '') || '없음'})과 채점 대상(${target})이 다릅니다.`;
    if (course === 'scenarios' && !validFork) return '원본 nowcika/git-scenario-lab의 Fork가 아닙니다.';
    return null;
  }
  function trustedRepository(evidence) {
    requireOnline();
    const reason = untrustedReason();
    if (reason && evidence && !evidence.reason) evidence.reason = reason;
    return !reason;
  }
  async function check(id, name, points, action) {
    const evidence = {};
    let state, detail;
    try {
      const outcome = await action(evidence);
      state = outcome ? 'pass' : 'fail';
      detail = outcome ? '조건 충족' : evidence.reason || '조건 미충족: 파일·이력·소유자·push 상태의 근거를 확인하세요.';
    } catch (error) {
      if (!(error instanceof Unavailable)) throw error;
      state = 'unknown'; detail = error.message;
    }
    // 오프라인 모드에서 원래 확인할 수 없는 항목은 따로 표시해 종료 코드에서 제외합니다.
    const offlineSkipped = state === 'unknown' && !online && /오프라인 모드/.test(detail);
    results.push({ id, name, points, earned: state === 'pass' ? points : 0, state, detail, offlineSkipped, evidence });
  }
  async function sync(branch, evidence, tag = false) {
    const local = tag ? repo.sha(`refs/tags/${branch}`) : repo.branch(branch);
    inspectedRefs.set(`${tag ? 'refs/tags/' : 'refs/heads/'}${branch}`, local);
    evidence[branch] = { localSha: local };
    if (!local) { evidence.reason = `로컬 ${tag ? '태그' : '브랜치'} 없음: ${branch}`; return false; }
    if (!online) { evidence[branch].push = 'unchecked'; return true; }
    if (!trustedRepository(evidence)) return false;
    let remote;
    if (tag) {
      let object = (await github.get(`/repos/${target}/git/ref/tags/${encodeURIComponent(branch)}`))?.object;
      for (let i = 0; object?.type === 'tag' && i < 10; i++) {
        object = (await github.get(`/repos/${target}/git/tags/${object.sha}`))?.object;
      }
      remote = object?.type === 'commit' ? object.sha : null;
    } else {
      remote = (await github.get(`/repos/${target}/branches/${encodeURIComponent(branch)}`))?.commit?.sha;
    }
    evidence[branch].remoteSha = remote || null;
    evidence[branch].push = local === remote ? 'matched' : 'mismatch';
    if (local !== remote) evidence.reason = `GitHub와 로컬 커밋 불일치: ${branch}`;
    return local === remote;
  }
  // 사용자가 --branch를 명시하면 그 값을 우선합니다(지정하지 않으면 GitHub 기본 브랜치).
  const defaultBranch = options.branch || metadata?.default_branch || 'main';
  const head = repo.sha('HEAD');
  diagnostics.push({ id: 'workingTree', clean: !repo.git(['status', '--porcelain']), note: '채점은 커밋된 파일만 사용합니다.' });
  diagnostics.push({ id: 'history', shallow: repo.shallow, head });
  diagnostics.push({ id: 'remotes', entries: (repo.git(['remote']) || '').split('\n').filter(Boolean).map(name => ({ name, github: parseGitHub(repo.git(['remote', 'get-url', name]) || '') })) });
  diagnostics.push({ id: 'identity', requested: username || null, authenticated: account?.login || null, target: target || null, originMatches: !wrongOrigin, ownerMatches: metadata ? !wrongOwner : null, error: accessError || null });
  // Reflog is supplementary evidence, not proof that a particular command was used.
  diagnostics.push({ id: 'reflog', entries: (repo.git(['reflog', '--all', '--format=%H'], true) || '').split('\n').filter(Boolean).length });

  if (course === 'basic') {
    await check('git', 'Git 설치', 10, e => { e.version = repo.git(['--version']); return /^git version /.test(e.version); });
    await check('account', 'GitHub 인증 계정', 10, e => { requireOnline(); e.login = account?.login; e.expected = username; return !identityMismatch; });
    await check('repository', '본인 소유 공개 저장소', 15, e => { e.repository = target; e.originMatches = !wrongOrigin; return trustedRepository(e); });
    await check('readme', 'README 지정 문구와 push', 15, async e => {
      if (!username) throw new Unavailable('--username을 지정하세요.');
      if (!await sync(defaultBranch, e)) return false;
      e.marker = `git-lab-${username}`;
      return includes(repo.file(repo.branch(defaultBranch), 'README.md')?.toLowerCase(), e.marker.toLowerCase());
    });
    await check('commits', '기본 브랜치 커밋 2개와 push', 15, async e => {
      if (!await sync(defaultBranch, e)) return false;
      e.count = repo.history(repo.branch(defaultBranch)).length;
      e.distinctTrees = new Set(repo.git(['log', '--format=%T', repo.branch(defaultBranch), '--']).split('\n')).size;
      return e.count >= 2 && e.distinctTrees >= 2;
    });
    await check('branch', 'practice/feature 브랜치와 push', 15, e => sync('practice/feature', e));
    await check('issue', '학습 계획 이슈', 10, async e => {
      if (!trustedRepository(e)) return false;
      const issue = await github.find(`/repos/${target}/issues?state=all`, i => !i.pull_request && i.title.includes('학습 계획'));
      e.number = issue?.number;
      if (!issue) e.reason = '제목에 ‘학습 계획’이 들어간 이슈를 찾지 못했습니다.';
      return Boolean(issue);
    });
    await check('pr', '해당 저장소의 feature PR', 10, async e => {
      if (!trustedRepository(e)) return false;
      const pr = await github.find(`/repos/${target}/pulls?state=all`, p => p.head?.ref === 'practice/feature' && p.base?.ref === defaultBranch && p.head?.repo?.full_name?.toLowerCase() === target.toLowerCase() && p.base?.repo?.full_name?.toLowerCase() === target.toLowerCase());
      e.number = pr?.number;
      if (!pr) e.reason = `practice/feature → ${defaultBranch} 방향의 PR을 ${target}에서 찾지 못했습니다.`;
      return Boolean(pr);
    });
  } else {
    await check('fork', '원본 Fork와 본인 계정', 15, e => {
      if (!trustedRepository(e)) return false;
      e.parent = metadata.parent?.full_name;
      e.officialReference = metadata.full_name?.toLowerCase() === 'nowcika/git-scenario-solution';
      return e.officialReference || (metadata.fork && e.parent?.toLowerCase() === 'nowcika/git-scenario-lab');
    });
    for (const [id, name, points, suffix, validate] of scenarioSpecs) {
      await check(id, name, points, async e => {
        const branch = `solution/${suffix}`;
        if (!await sync(branch, e)) return false;
        if (id === 'workflow' && !await sync('solution/branch-a', e)) return false;
        const sha = repo.branch(branch);
        let history;
        const context = {
          repo, sha, file: filename => {
            const content = repo.file(sha, filename);
            (e.files ||= {})[filename] = { present: content !== null };
            return content;
          },
          history: () => history ||= repo.history(sha),
          messages: pattern => context.history().some(h => pattern.test(h.message)),
          linear: () => context.history().every(h => h.parents.length <= 1),
        };
        if (!validate(context, e)) return false;
        if (id === 'revert') e.revert = repo.revertEvidence(sha);
        if (id === 'release') {
          requireOnline();
          const release = await github.get(`/repos/${target}/releases/tags/release-v1.0.0`);
          e.release = release?.html_url;
          return Boolean(release && !release.draft && release.assets?.some(a => a.name === 'scenario-artifact.txt' && a.state === 'uploaded'));
        }
        if (id === 'pages') {
          requireOnline();
          const url = `https://${target.split('/')[0].toLowerCase()}.github.io/${target.split('/')[1]}/`;
          const response = await (services.fetch || fetch)(url, { signal: AbortSignal.timeout(15000) }).catch(() => { throw new Unavailable('Pages 네트워크 조회 불가'); });
          e.url = url; e.httpStatus = response.status;
          if (response.status >= 500 || response.status === 429) throw new Unavailable(`Pages 일시 오류 (${response.status})`);
          return response.ok && includes(await response.text(), 'PAGES-LIVE-2026');
        }
        return true;
      });
    }
    await check('tag', '완료 태그와 push', 5, e => sync('solution-v1.0.0', e, true));
  }
  const after = repo.sha('HEAD');
  if (after !== head) throw new Unavailable('검사 중 HEAD가 변경됐습니다. 작업을 멈추고 다시 검사하세요.');
  for (const [ref, sha] of inspectedRefs) {
    if (repo.sha(ref) !== sha) throw new Unavailable('검사 중 제출 브랜치 또는 태그가 변경됐습니다. 다시 검사하세요.');
  }
  const summary = Object.fromEntries(['pass', 'fail', 'unknown'].map(state => [state, results.filter(r => r.state === state).length]));
  summary.offlineSkipped = results.filter(r => r.offlineSkipped).length;
  // 오프라인 때문에 보류된 항목을 뺀, 실제로 문제가 된 '확인 불가' 수입니다.
  summary.blocked = summary.unknown - summary.offlineSkipped;
  return {
    schemaVersion: 1, checkedAt: new Date().toISOString(), course, mode: online ? 'github-and-local' : 'local-only',
    repository: repo.root, github: target || null, username: username || null, head,
    score: results.reduce((sum, r) => sum + r.earned, 0), maxScore: course === 'basic' ? 100 : 290,
    complete: summary.unknown === 0, summary, diagnostics, results,
    limitations: ['최종 파일과 이력을 검사하며 명령 실행 자체를 증명하지 않습니다.', 'diff 보고서는 patch의 index blob 해시와 내용을 저장소 객체와 대조하고, show·blame 보고서는 적어 낸 커밋 SHA가 실제 커밋인지와 메시지·작성자 일치를 확인합니다. 원본 커밋이 로컬에 없으면(git fetch upstream 전) 오답이 아니라 판정 보류입니다.', '오프라인 점수는 로컬 결과이며 push·계정·배포를 인증하지 않습니다.', '자체 실행 JSON 보고서는 변조 방지 또는 시험 감독 수단이 아닙니다.'],
  };
}

module.exports = { grade, Repository, GitHub, Unavailable, parseGitHub };
