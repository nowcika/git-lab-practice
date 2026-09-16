const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStaticServer } = require('../bin/static-server');
const { githubGet } = require('./github-request.cjs');

test('GitHub API 인증은 Pages와 다른 호스트에 전달되지 않는다', async () => {
  const request = { get: async (url, options) => ({ url, options }) };
  const result = await githubGet(request, 'https://api.github.com/user');
  assert.equal(result.options.maxRedirects, 0);
  assert.equal(result.options.headers.Accept, 'application/vnd.github+json');
  await assert.rejects(githubGet(request, 'https://nowcika.github.io/'), /GitHub API URL/);
  await assert.rejects(githubGet(request, 'https://api.github.com.example.org/'), /GitHub API URL/);
  const config = fs.readFileSync(path.resolve(__dirname, '../playwright.config.js'), 'utf8');
  assert.doesNotMatch(config, /extraHTTPHeaders\s*:/);
});

test('정적 서버가 잘못된 URL에서도 살아 있고 경로 탈출을 차단한다', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab-server-'));
  const root = path.join(dir, 'site'); const sibling = path.join(dir, 'site-other');
  fs.mkdirSync(root); fs.mkdirSync(sibling);
  fs.writeFileSync(path.join(root, 'index.html'), 'healthy');
  fs.writeFileSync(path.join(sibling, 'outside.txt'), 'outside');
  const server = createStaticServer(root);
  t.after(async () => { await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }); fs.rmSync(dir, { recursive: true, force: true }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/%E0%A4%A`)).status, 400);
  assert.equal((await fetch(`${base}/%00`)).status, 400);
  assert.equal((await fetch(`${base}/..%2Fsite-other/outside.txt`)).status, 403);
  assert.equal(await (await fetch(`${base}/`)).text(), 'healthy');
  try { fs.symlinkSync(path.join(sibling, 'outside.txt'), path.join(root, 'link.txt')); }
  catch (error) { if (error.code === 'EPERM') return; throw error; }
  assert.equal((await fetch(`${base}/link.txt`)).status, 403);
});
