#!/usr/bin/env node
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
};
function createStaticServer(directory) {
  const root = fs.realpathSync(directory);
  const inside = target => {
    const relative = path.relative(root, target);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  };
  return http.createServer(async (request, response) => {
    let requested;
    try { requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400).end('Bad request'); return; }
    if (requested.includes('\0')) { response.writeHead(400).end('Bad request'); return; }
    const target = path.resolve(root, `.${requested.endsWith('/') ? `${requested}index.html` : requested}`);
    if (!inside(target)) { response.writeHead(403).end('Forbidden'); return; }
    try {
      const real = await fs.promises.realpath(target);
      if (!inside(real)) { response.writeHead(403).end('Forbidden'); return; }
      const data = await fs.promises.readFile(real);
      response.writeHead(200, { 'Content-Type': types[path.extname(real).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(data);
    } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found'); }
  });
}
if (require.main === module) {
  const port = Number(process.argv[2] || process.env.PORT || 4173);
  const root = path.resolve(process.argv[3] || '.');
  createStaticServer(root).listen(port, '127.0.0.1', () => console.log(`정적 서버 실행: http://127.0.0.1:${port} (root: ${root})`));
}
module.exports = { createStaticServer };
