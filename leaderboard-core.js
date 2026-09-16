/* Shared ranking rules: browser, trusted publisher, and tests. */
(function (root) {
  'use strict';
  const RULES_VERSION = '2026-09-public-v1';
  const COURSES = { basic: { title: '초급', maxScore: 90, total: 7 }, scenarios: { title: '실전', maxScore: 325, total: 20 } };
  const validLogin = value => typeof value === 'string' && /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value);
  function repositoryName(value) {
    try {
      const url = new URL(value);
      if (url.origin !== 'https://github.com' || url.username || url.password || url.search || url.hash) return null;
      const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      if (parts.length !== 2 || !validLogin(parts[0])) return null;
      const name = parts[1].replace(/\.git$/, '');
      if (!/^[\w.-]+$/.test(name) || ['.', '..'].includes(name)) return null;
      return `${parts[0]}/${name}`;
    } catch { return null; }
  }
  function emptyBoard() { return { schemaVersion: 1, rulesVersion: RULES_VERSION, updatedAt: null, entries: [] }; }
  function validAssessment(a, e, course) {
    return Boolean(a && typeof a.checkedAt === 'string' && Number.isFinite(Date.parse(a.checkedAt))
      && Number.isSafeInteger(a.runId) && a.runId > 0 && Array.isArray(a.checks) && a.checks.length === course.total
      && a.checks.every(c => c && typeof c.name === 'string' && c.name.trim().length > 0 && c.name.length <= 300
        && typeof c.detail === 'string' && c.detail.length <= 10000 && ['pass', 'fail'].includes(c.state)
        && Number.isInteger(c.points) && c.points > 0)
      && a.checks.reduce((sum, c) => sum + c.points, 0) === e.maxScore
      && a.checks.reduce((sum, c) => sum + (c.state === 'pass' ? c.points : 0), 0) === e.score
      && a.checks.filter(c => c.state === 'pass').length === e.passed);
  }
  function validEntry(e) {
    const course = COURSES[e?.course];
    const repo = repositoryName(`https://github.com/${e?.repository}`);
    return Boolean(course && validLogin(e.login) && Number.isSafeInteger(e.userId) && e.userId > 0
      && repo && repo.split('/')[0].toLowerCase() === e.login.toLowerCase()
      && Number.isInteger(e.score) && e.score >= 0 && e.score <= course.maxScore && e.maxScore === course.maxScore
      && Number.isInteger(e.passed) && e.passed >= 0 && e.passed <= course.total && e.total === course.total
      && typeof e.checkedAt === 'string' && Number.isFinite(Date.parse(e.checkedAt))
      && Number.isSafeInteger(e.issueNumber) && e.issueNumber > 0
      && Number.isSafeInteger(e.runId) && e.runId > 0 && e.rulesVersion === RULES_VERSION
      && (e.assessment === undefined || validAssessment(e.assessment, e, course)));
  }
  function validateBoard(board) {
    if (!board || board.schemaVersion !== 1 || board.rulesVersion !== RULES_VERSION || !Array.isArray(board.entries)
      || !board.entries.every(validEntry)) throw new Error('순위 데이터 형식이나 채점 기준 버전이 다릅니다.');
    const keys = board.entries.map(e => `${e.course}:${e.userId}`);
    if (new Set(keys).size !== keys.length) throw new Error('중복된 순위 데이터입니다.');
    return board;
  }
  function upsert(board, candidate) {
    validateBoard(board);
    if (!validEntry(candidate)) throw new Error('검증된 순위 결과 형식이 아닙니다.');
    const entries = board.entries.map(e => ({ ...e }));
    const index = entries.findIndex(e => e.course === candidate.course && e.userId === candidate.userId);
    if (index >= 0 && (entries[index].score > candidate.score || (entries[index].score === candidate.score
      && Date.parse(entries[index].checkedAt) <= Date.parse(candidate.checkedAt)))) {
      const previous = entries[index];
      // Enrich legacy records without changing their original achievement or rank.
      if (!previous.assessment && candidate.assessment && previous.score === candidate.score
        && previous.passed === candidate.passed && previous.repository === candidate.repository) {
        entries[index] = { ...previous, assessment: candidate.assessment };
        return { ...board, updatedAt: new Date().toISOString(), entries };
      }
      return board;
    }
    if (index >= 0) entries[index] = candidate; else entries.push(candidate);
    return { ...board, updatedAt: new Date().toISOString(), entries };
  }
  function rank(board, course) {
    validateBoard(board);
    if (!COURSES[course]) throw new Error('지원하지 않는 과정입니다.');
    const rows = board.entries.filter(e => e.course === course).slice().sort((a, b) => b.score - a.score
      || Date.parse(a.checkedAt) - Date.parse(b.checkedAt) || a.login.localeCompare(b.login));
    let previousScore, position;
    return rows.map((e, index) => {
      if (e.score !== previousScore) position = index + 1;
      previousScore = e.score; return { ...e, rank: position };
    });
  }
  const api = { RULES_VERSION, COURSES, validLogin, repositoryName, emptyBoard, validateBoard, validEntry, upsert, rank };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LeaderboardCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
