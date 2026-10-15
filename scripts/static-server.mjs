import { createReadStream, statSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'web'));
const port = Number(process.argv[3] ?? 8000);
const notesPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'notes', 'study-notes.md');
function readNotes() {
  let text = '';
  try { text = readFileSync(notesPath, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return { text, revision: createHash('sha256').update(text).digest('hex') };
}
function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad Request');
    return;
  }

  if (pathname === '/api/notes') {
    const origin = request.headers.origin;
    if (origin && origin !== `http://${request.headers.host}`) {
      sendJson(response, 403, { error: '다른 사이트에서는 메모에 접근할 수 없습니다.' });
      return;
    }
    try {
      if (request.method === 'GET') {
        sendJson(response, 200, readNotes());
      } else if (request.method === 'PUT') {
        if (request.headers['content-type'] !== 'application/json') {
          sendJson(response, 415, { error: 'JSON 형식이 필요합니다.' });
          return;
        }
        const chunks = [];
        let size = 0;
        for await (const chunk of request) {
          size += chunk.length;
          if (size > 2_000_000) {
            sendJson(response, 413, { error: '메모는 2MB 이하로 저장해 주세요.' });
            return;
          }
          chunks.push(chunk);
        }
        let data;
        try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { sendJson(response, 400, { error: '잘못된 JSON입니다.' }); return; }
        if (typeof data.text !== 'string' || typeof data.revision !== 'string') {
          sendJson(response, 400, { error: '메모와 버전이 필요합니다.' });
          return;
        }
        if (data.revision !== readNotes().revision) {
          sendJson(response, 409, { error: '다른 창이나 파일에서 메모가 변경되었습니다. 새로고침 후 확인하세요.' });
          return;
        }
        mkdirSync(path.dirname(notesPath), { recursive: true });
        const temporaryPath = `${notesPath}.tmp`;
        writeFileSync(temporaryPath, data.text, 'utf8');
        renameSync(temporaryPath, notesPath);
        sendJson(response, 200, readNotes());
      } else {
        sendJson(response, 405, { error: '지원하지 않는 요청입니다.' });
      }
    } catch (error) {
      console.error('메모 저장 오류:', error);
      sendJson(response, 500, { error: '메모 파일을 읽거나 저장할 수 없습니다.' });
    }
    return;
  }

  const target = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
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
  console.log(`서버 실행 중: http://localhost:${port}/`);
  console.log('종료하려면 Ctrl+C를 누르세요.');
});
