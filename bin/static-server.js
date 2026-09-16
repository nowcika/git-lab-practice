#!/usr/bin/env node
'use strict';
// 테스트와 로컬 확인용 정적 파일 서버입니다. 외부 의존성 없이 동작하며
// Playwright의 webServer로도 사용합니다. 예: node bin/static-server.js 4173
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.argv[2] || process.env.PORT || 4173);
const root = path.resolve(process.argv[3] || '.');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((request, response) => {
  const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const target = path.join(root, requested.endsWith('/') ? `${requested}index.html` : requested);
  // 루트 밖의 경로 요청은 거부합니다.
  if (!target.startsWith(root)) { response.writeHead(403).end('Forbidden'); return; }
  fs.readFile(target, (error, data) => {
    if (error) { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(data);
  });
});
server.listen(port, '127.0.0.1', () => console.log(`정적 서버 실행: http://127.0.0.1:${port} (root: ${root})`));
