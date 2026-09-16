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
const scenarioSpecs = [
  ['upstream', 'upstream 변경', 15, 'upstream-sync', c => includes(c.file('instructor-update.md'), 'UPSTREAM-SYNC-COMPLETE')],
  ['conflict', '충돌 해결', 20, 'conflict', c => includes(c.file('team-plan.md'), '프론트엔드: UI 배포 준비', '백엔드: API 배포 준비', '공동 확인: 통합 테스트 완료') && c.history().some(h => h.parents.length >= 2)],
  ['external', '외부 자료 반영', 15, 'external-remote', c => includes(c.file('shared-config.json'), 'REMOTE-LIBRARY-V1') && c.messages(/import shared config/i)],
  ['revert', '변경을 역으로 적용한 revert', 15, 'revert', c => c.file('secrets.env') === null && includes(c.file('app.conf'), 'production=true') && Boolean(c.repo.revertEvidence(c.sha))],
  ['rebase', 'rebase 결과와 선형 이력', 15, 'rebase', c => Boolean(c.file('notes/base-update.txt')) && Boolean(c.file('notes/topic.txt')) && c.linear() && c.messages(/notification topic note/) && c.messages(/common deployment rule/)],
  ['reset', '안정 커밋 복원', 15, 'reset', c => includes(c.file('stable-config.txt'), 'STABLE-CONFIG-V1') && c.file('unwanted-experiment.txt') === null && /stable configuration/.test(c.history()[0].message)],
  ['reflog', '복구 결과', 15, 'reflog', c => includes(c.file('recovered-note.txt'), 'REFLOG-RECOVERED-COMMIT') && c.messages(/add recoverable note/)],
  ['amend', 'amend 결과', 15, 'amend', c => includes(c.file('release-note.md'), '# Release Note', 'Version: draft') && c.history()[0].message === 'docs: add release note' && !c.messages(/releas note/)],
  ['cherry', '선택한 긴급 수정', 15, 'cherry-pick', c => includes(c.file('urgent-fix.txt'), 'CHERRY-PICK-HOTFIX-2026') && c.messages(/urgent standalone hotfix/) && c.linear()],
  ['diff', 'diff 보고서', 15, 'diff', c => includes(c.file('reports/change.patch'), 'diff --git', 'SERVICE_MODE=production', 'TIMEOUT=60', 'DIFF-TARGET-2026', 'config/deploy.conf')],
  ['show', 'show 보고서', 15, 'show', c => includes(c.file('reports/show-report.md'), 'fix: restore missing deployment configuration', 'SHOW-EVIDENCE-4821', 'forensic.txt')],
  ['patch', 'patch 적용 결과', 15, 'patch', c => includes(c.file('patch-feature.txt'), 'FORMAT-PATCH-TRANSFER-2026') && c.history().some(h => h.message === 'feat: add transferable patch feature') && c.linear()],
  ['blame', 'blame 보고서', 15, 'blame', c => includes(c.file('reports/blame-answer.md'), 'BLAME-OWNER-7392', 'Release Manager', 'docs: add release approval check')],
  ['workflow', '브랜치 분리와 커밋 수정', 20, 'branch-b', c => {
    const a = c.repo.branch('solution/branch-a');
    return Boolean(a) && includes(c.repo.file(a, 'frontend-task.txt'), 'BRANCH-A-ORIGINAL') && c.repo.file(a, 'backend-task.txt') === null && includes(c.file('frontend-task.txt'), 'MOVED-AND-AMENDED-2026') && includes(c.file('backend-task.txt'), 'BRANCH-B-BACKEND') && c.history()[0].message === 'feat: move and refine shared task' && c.linear();
  }],
  ['release', 'Actions Release', 25, 'actions-release', c => includes(c.file('.github/workflows/release.yml'), 'contents: write', 'gh release create', 'release-v')],
  ['pages', 'Pages 실제 배포', 25, 'pages', c => includes(c.file('docs/index.html'), 'PAGES-LIVE-2026')],
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
  function trustedRepository() {
    requireOnline();
    return Boolean(metadata && !metadata.private && !identityMismatch && !wrongOwner && !wrongOrigin && (course !== 'scenarios' || validFork));
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
    results.push({ id, name, points, earned: state === 'pass' ? points : 0, state, detail, evidence });
  }
  async function sync(branch, evidence, tag = false) {
    const local = tag ? repo.sha(`refs/tags/${branch}`) : repo.branch(branch);
    inspectedRefs.set(`${tag ? 'refs/tags/' : 'refs/heads/'}${branch}`, local);
    evidence[branch] = { localSha: local };
    if (!local) { evidence.reason = `로컬 ${tag ? '태그' : '브랜치'} 없음: ${branch}`; return false; }
    if (!online) { evidence[branch].push = 'unchecked'; return true; }
    if (!trustedRepository()) return false;
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
  const defaultBranch = metadata?.default_branch || options.branch || 'main';
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
    await check('repository', '본인 소유 공개 저장소', 15, e => { e.repository = target; e.originMatches = !wrongOrigin; return trustedRepository(); });
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
      if (!trustedRepository()) return false;
      const issue = await github.find(`/repos/${target}/issues?state=all`, i => !i.pull_request && i.title.includes('학습 계획'));
      e.number = issue?.number; return Boolean(issue);
    });
    await check('pr', '해당 저장소의 feature PR', 10, async e => {
      if (!trustedRepository()) return false;
      const pr = await github.find(`/repos/${target}/pulls?state=all`, p => p.head?.ref === 'practice/feature' && p.base?.ref === defaultBranch && p.head?.repo?.full_name?.toLowerCase() === target.toLowerCase() && p.base?.repo?.full_name?.toLowerCase() === target.toLowerCase());
      e.number = pr?.number; return Boolean(pr);
    });
  } else {
    await check('fork', '원본 Fork와 본인 계정', 15, e => {
      if (!trustedRepository()) return false;
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
        if (!validate(context)) return false;
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
  return {
    schemaVersion: 1, checkedAt: new Date().toISOString(), course, mode: online ? 'github-and-local' : 'local-only',
    repository: repo.root, github: target || null, username: username || null, head,
    score: results.reduce((sum, r) => sum + r.earned, 0), maxScore: course === 'basic' ? 100 : 290,
    complete: summary.unknown === 0, summary, diagnostics, results,
    limitations: ['최종 파일과 이력을 검사하며 명령 실행 자체를 증명하지 않습니다.', 'diff/show/blame 보고서는 필수 내용 검사이며 독립적인 원본 대조는 아닙니다.', '오프라인 점수는 로컬 결과이며 push·계정·배포를 인증하지 않습니다.', '자체 실행 JSON 보고서는 변조 방지 또는 시험 감독 수단이 아닙니다.'],
  };
}

module.exports = { grade, Repository, GitHub, Unavailable, parseGitHub };
