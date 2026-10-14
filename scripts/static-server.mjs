import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const port = Number(process.argv[3] ?? 8000);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad Request');
    return;
  }

  const target = path.resolve(root, `.${pathname}`);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    if (!statSync(target).isFile()) {
      response.writeHead(404).end('Not Found');
      return;
    }
  } catch {
    response.writeHead(404).end('Not Found');
    return;
  }

  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(target).toLowerCase()] ?? 'application/octet-stream' });
  createReadStream(target).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`서버 실행 중: http://localhost:${port}/istqb_ctfl_7day_learning.html`);
  console.log('종료하려면 Ctrl+C를 누르세요.');
});
