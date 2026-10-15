import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGoogleAnswer, getAllGoogleAnswers, saveGoogleAnswer, buildGoogleAnswers } from './google-answers.mjs';
import { createStudyStore } from './study-store.mjs';

const root = path.resolve(process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'web'));
const port = Number(process.argv[3] ?? 8000);
buildGoogleAnswers();
const studyStore = createStudyStore(undefined,{deferExports:true});
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

  if (pathname.startsWith('/api/texts')) {
    const origin = request.headers.origin;
    if (origin && origin !== `http://${request.headers.host}`) { sendJson(response,403,{error:'다른 사이트에서는 변경할 수 없습니다.'}); return; }
    try {
      const content = studyStore.content();
      if (request.method === 'GET' && pathname === '/api/texts') sendJson(response,200,{records:content.catalogue()});
      else if (request.method === 'GET' && pathname === '/api/texts/history') sendJson(response,200,{history:content.history()});
      else if (request.method === 'GET' && pathname === '/api/texts/export-state') sendJson(response,200,content.exportState());
      else if (request.method === 'POST' && ['/api/texts/batch','/api/texts/restore','/api/texts/export'].includes(pathname)) {
        if (request.headers['content-type'] !== 'application/json') { sendJson(response,415,{error:'JSON 형식이 필요합니다.'}); return; }
        let size=0; const chunks=[];
        for await (const chunk of request) { size+=chunk.length; if(size>10_000_000){sendJson(response,413,{error:'변경 요청이 너무 큽니다.'});return} chunks.push(chunk); }
        let data; try { data=JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { sendJson(response,400,{error:'잘못된 JSON입니다.'});return; }
        sendJson(response,200,pathname.endsWith('/batch')?content.batch(data.changes):pathname.endsWith('/restore')?content.restore(data.batchId,data.versions):content.retryExport());
      } else sendJson(response,405,{error:'지원하지 않는 요청입니다.'});
    } catch(error) { sendJson(response,error.status??500,{error:error.status?error.message:'문구 DB 처리에 실패했습니다.'}); }
    return;
  }

  if (pathname === '/api/google-answers' || pathname.startsWith('/api/google-answers/')) {
    const origin = request.headers.origin;
    if (origin && origin !== `http://${request.headers.host}`) {
      sendJson(response, 403, { error: '다른 사이트에서는 답변을 변경할 수 없습니다.' });
      return;
    }
    const id = pathname.slice('/api/google-answers/'.length);
    try {
      if (request.method === 'GET') sendJson(response, 200, pathname === '/api/google-answers' ? getAllGoogleAnswers() : getGoogleAnswer(id));
      else if (request.method === 'PUT') {
        if (request.headers['content-type'] !== 'application/json') {
          sendJson(response, 415, { error: 'JSON 형식이 필요합니다.' });
          return;
        }
        const chunks = [];
        let size = 0;
        for await (const chunk of request) {
          size += chunk.length;
          if (size > 250_000) {
            sendJson(response, 413, { error: '답변이 너무 깁니다. 5만 자 이하로 입력해 주세요.' });
            return;
          }
          chunks.push(chunk);
        }
        let data;
        try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
        catch { sendJson(response, 400, { error: '잘못된 JSON입니다.' }); return; }
        sendJson(response, 200, saveGoogleAnswer(id, data?.answer, data?.revision));
      } else sendJson(response, 405, { error: '지원하지 않는 요청입니다.' });
    } catch (error) {
      sendJson(response, error.status ?? 500, { error: error.status ? error.message : '답변 파일을 읽거나 저장할 수 없습니다.' });
    }
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
        sendJson(response, 200, studyStore.readNotes());
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
        sendJson(response, 200, studyStore.saveNotes(data.text, data.revision));
      } else {
        sendJson(response, 405, { error: '지원하지 않는 요청입니다.' });
      }
    } catch (error) {
      console.error('메모 저장 오류:', error);
      sendJson(response, error.status ?? 500, { error: error.status ? error.message : '메모 DB를 읽거나 저장할 수 없습니다.' });
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
