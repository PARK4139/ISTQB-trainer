import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';

const digest = text => createHash('sha256').update(text).digest('hex');
const fail = (message, status = 409) => Object.assign(new Error(message), { status });
const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const plain = value => value && !/^(?:https?:|data:|file:|[./\\])/.test(value) && !/[<>]|\$\{/.test(value);
const excluded = new Set(['id', 'lessonId', 'query', 'source', 'sourceUrl', 'updatedAt', 'revision', 'letter', 'select', 'lo', 'k', 'locale', 'direction', 'capturedText', 'references', 'url', 'version', 'answer', 'format']);
const exportJobs=new Map();

export function createContentRepository(db, root, readNotes, exportNotes, deferExports=false) {
  const htmlPath = path.join(root, 'web', 'index.html');
  db.exec(`
    CREATE TABLE IF NOT EXISTS study_document (id TEXT PRIMARY KEY, original_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS study_text (
      id TEXT PRIMARY KEY, document_id TEXT NOT NULL, field_path TEXT NOT NULL,
      original TEXT NOT NULL, value TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS study_change (
      id TEXT PRIMARY KEY, created_at TEXT NOT NULL, changes_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS study_export (
      filename TEXT PRIMARY KEY, hash TEXT NOT NULL, pending_hash TEXT
    );
    CREATE TABLE IF NOT EXISTS study_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS study_google_capture (id TEXT PRIMARY KEY, question_id TEXT NOT NULL, metadata_json TEXT NOT NULL);
  `);
  const scriptJSON = (html, id) => {
    const m = html.match(new RegExp('<script id="' + id + '" type="application/json">([\\s\\S]*?)</script>'));
    if (!m) throw fail('콘텐츠 원본을 찾지 못했습니다: ' + id, 500);
    return JSON.parse(m[1]);
  };
  function addDocument(id, value) {
    if (db.prepare('SELECT 1 FROM study_document WHERE id = ?').get(id)) return;
    db.prepare('INSERT INTO study_document VALUES (?, ?)').run(id, JSON.stringify(value));
    function visit(node, keys = []) {
      if (typeof node === 'string') {
        const key = keys.at(-1), parent = keys.at(-2);
        if (!node || /^(?:https?:|data:|file:|[./\\])/.test(node) || excluded.has(String(key)) || excluded.has(String(parent))) return;
        if (id === 'appData' && parent === 'lessons' && key === 0) return;
        // 강의 배열의 첫 필드는 실라버스 식별자다.
        if (id === 'appData' && keys.includes('lessons') && key === 0) return;
        if (id === 'googleAnswersJSON' && key !== 'answer') return;
        const location = JSON.stringify(keys);
        db.prepare('INSERT INTO study_text (id,document_id,field_path,original,value) VALUES (?,?,?,?,?)')
          .run(id + ':' + keys.map(String).join('/'), id, location, node, node);
      } else if (Array.isArray(node)) node.forEach((item, i) => visit(item, [...keys, i]));
      else if (node && typeof node === 'object') for (const [key, value] of Object.entries(node)) visit(value, [...keys, key]);
    }
    // answer는 공식 정답 배열에서 제외하지만 Google 답변 본문에서는 편집한다.
    if (id === 'googleAnswersJSON') {
      for (const [key, record] of Object.entries(value)) {
        if (typeof record.answer !== 'string') continue;
        db.prepare('INSERT INTO study_text (id,document_id,field_path,original,value) VALUES (?,?,?,?,?)')
          .run('google:' + key, id, JSON.stringify([key, 'answer']), record.answer, record.answer);
      }
    } else visit(value);
  }
  if (!db.prepare('SELECT 1 FROM study_meta WHERE key = ?').get('catalogue-initialized')) {
    const html = readFileSync(htmlPath, 'utf8');
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const id of ['appData', 'officialDataJSON', 'localeResourcesJSON', 'googleAnswersJSON']) addDocument(id, scriptJSON(html, id));
      const ui = new Set();
      const decode = value => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      function consider(value) {
        value = decode(value.trim());
        if (value.length > 1 && plain(value) && !/[;={}\\\r\n]|=>|document\.|function\b/.test(value) && (/[가-힣]/.test(value) || /^[A-Z][A-Z 0-9·/–-]{5,}$/.test(value))) ui.add(value);
      }
      const source = html.replace(/<script[^>]*type="application\/json">[\s\S]*?<\/script>/g, '').replace(/<script id="notesEditorLibrary">[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '');
      for (const m of source.matchAll(/>([^<>]+)</g)) consider(m[1]);
      for (const m of source.matchAll(/(['"])((?:\\.|(?!\1)[^\\\r\n])*?)\1/g)) {
        const text = m[2];
        if (!text.includes('\\') && !text.includes('<')) consider(text);
        if(text.includes('<'))for(const part of text.split(/<[^>]*>/))consider(part);
      }
      for (const value of [...ui].sort()) {
        db.prepare('INSERT OR IGNORE INTO study_text (id,document_id,field_path,original,value) VALUES (?,?,?,?,?)')
          .run('interface:' + digest(value).slice(0,24), 'interface', '[]', value, value);
      }
      db.prepare('INSERT INTO study_meta VALUES (?, ?)').run('catalogue-initialized', '1');
      db.prepare('INSERT OR IGNORE INTO study_document VALUES (?, ?)').run('google-source', readFileSync(path.join(root,'content','google-ai-answers.json'),'utf8'));
      db.prepare('INSERT OR IGNORE INTO study_document VALUES (?, ?)').run('provenance',JSON.stringify({source:'web/index.html#officialDataJSON',sourceHash:digest(JSON.stringify(scriptJSON(html,'officialDataJSON'))),sourceUrls:[...new Set(html.match(/https:\/\/(?:www\.)?istqb\.org\/[^\s"'<>`]+/g)||[])],sampleVersion:null,versionNote:'The imported embedded sample data did not specify sample versions. No version is inferred.'}));
      db.prepare('INSERT OR IGNORE INTO study_export VALUES (?, ?, NULL)').run('web/index.html', digest(html));
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function rows() {
    const list = db.prepare('SELECT id,document_id AS kind,field_path AS path,original,value,version FROM study_text ORDER BY id').all();
    const captures=new Map(db.prepare('SELECT question_id,metadata_json FROM study_google_capture ORDER BY rowid').all().map(row=>[row.question_id,JSON.parse(row.metadata_json)]));
    for(const row of list)if(row.kind==='googleAnswersJSON'&&captures.has(JSON.parse(row.path)[0]))row.original=captures.get(JSON.parse(row.path)[0]).answer;
    const note = readNotes();
    list.push({ id: 'notes:main', kind: 'notes', original: '', value: note.text, version: note.revision });
    return list;
  }
  function documents() {
    const docs = Object.fromEntries(db.prepare('SELECT * FROM study_document ORDER BY id').all().map(row => [row.id, JSON.parse(row.original_json)]));
    for (const row of db.prepare('SELECT * FROM study_text WHERE document_id != ? ORDER BY id').all('interface')) {
      const keys = JSON.parse(row.field_path); let target = docs[row.document_id];
      for (const key of keys.slice(0,-1)) target = target[key];
      target[keys.at(-1)] = row.value;
      if(row.document_id==='googleAnswersJSON'){
        target.userModified=row.original!==row.value;target.revision=String(row.version);
      }
    }
    const captures=db.prepare('SELECT question_id,metadata_json FROM study_google_capture ORDER BY rowid').all();
    for(const capture of captures){const metadata=JSON.parse(capture.metadata_json),state=docs.googleAnswersJSON[capture.question_id];if(state){Object.assign(state,{source:'google-browser',sourceUrl:metadata.sourceUrl,updatedAt:metadata.updatedAt,references:metadata.references||[],userModified:state.answer!==metadata.answer})}}
    docs.googleCaptures=captures.map(row=>({questionId:row.question_id,...JSON.parse(row.metadata_json)}));
    // 번역 CLI와의 호환성을 위해 locale_resource도 같은 트랜잭션에서 갱신한다.
    return docs;
  }
  function atomicExport(filename, text) {
    const full = path.join(root, filename), hash = digest(text);
    const previous = db.prepare('SELECT * FROM study_export WHERE filename = ?').get(filename);
    let current;
    try { current = digest(readFileSync(full)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous && current && ![previous.hash, previous.pending_hash, hash].includes(current)) throw fail('내보내기 파일이 외부에서 변경되었습니다: ' + filename);
    db.prepare('INSERT INTO study_export VALUES (?, ?, ?) ON CONFLICT(filename) DO UPDATE SET pending_hash = excluded.pending_hash')
      .run(filename, current || '', hash);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full + '.tmp', text, 'utf8');
    renameSync(full + '.tmp', full);
    db.prepare('UPDATE study_export SET hash = ?, pending_hash = NULL WHERE filename = ?').run(hash, filename);
  }
  function exportContent() {
    let docs,catalogue,generation;
    db.exec('BEGIN');
    try{
      generation=db.prepare('SELECT value FROM study_meta WHERE key = ?').get('content-pending')?.value||'0';
      docs=documents();catalogue=rows().filter(row=>row.kind!=='notes');db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error}
    atomicExport('content/study-content.json', JSON.stringify({ documents: docs, records: catalogue }, null, 2) + '\n');
    let html = readFileSync(htmlPath, 'utf8');
    for (const [id, value] of Object.entries(docs)) html = html.replace(new RegExp('(<script id="'+id+'" type="application/json">)[\\s\\S]*?(</script>)'), (_, begin, end) => begin + safeJSON(value) + end);
    const overrides = catalogue.filter(row => row.value !== row.original).map(({id,kind,path,original,value}) => ({id,kind,path,original,value}));
    const payload = '<script id="textOverridesJSON" type="application/json">' + safeJSON(overrides) + '</script>';
    if (html.includes('<script id="textOverridesJSON"')) html = html.replace(/<script id="textOverridesJSON"[^>]*>[\s\S]*?<\/script>/, () => payload);
    else html = html.replace('<script id="notesEditorLibrary">', () => payload + '\n<script id="notesEditorLibrary">');
    atomicExport('web/index.html', html);
    db.prepare('UPDATE study_meta SET value = ? WHERE key = ? AND value = ?').run('0','content-pending',generation);
    db.prepare('DELETE FROM study_meta WHERE key = ?').run('export-error');
  }
  function queueExport(){
    if(exportJobs.has(root))return;
    const worker=new Worker(new URL('./export-worker.mjs',import.meta.url),{workerData:{root}});
    exportJobs.set(root,worker);
    worker.on('error',error=>{try{db.prepare('INSERT INTO study_meta VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('export-error',error.message)}catch{}});
    worker.on('exit',()=>{
      exportJobs.delete(root);
      try{if(!db.prepare('SELECT 1 FROM study_meta WHERE key = ?').get('export-error')&&db.prepare('SELECT value FROM study_meta WHERE key = ?').get('content-pending')?.value!=='0')queueExport()}catch{}
    });
  }
  function batch(changes) {
    if (!Array.isArray(changes) || !changes.length || changes.length > 20000) throw fail('변경 대상을 확인하세요.',400);
    const ids = new Set(), history = [], now = new Date().toISOString(), id = randomUUID();
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const change of changes) {
        if (!change || typeof change.id !== 'string' || typeof change.value !== 'string' || ids.has(change.id) || Buffer.byteLength(change.value) > 2_000_000) throw fail('잘못된 변경 요청입니다.',400);
        ids.add(change.id);
        let old;
        if (change.id === 'notes:main') {
          old = readNotes(); if (old.conflict) throw fail('Markdown 외부 변경 충돌입니다.');
          if (old.revision !== change.version) throw fail('메모 버전이 변경되었습니다.');
          db.prepare('UPDATE study_note SET text = ?, revision = ?, updated_at = ? WHERE id = ?').run(change.value,digest(change.value),now,'main');
          history.push({id:change.id,before:old.text,after:change.value,afterVersion:digest(change.value)});
        } else {
          old = db.prepare('SELECT * FROM study_text WHERE id = ?').get(change.id);
          if (!old || old.version !== change.version) throw fail('문구 버전이 변경되었습니다: ' + change.id);
          const tokens=value=>(value.match(/https?:\/\/\S+/g)||[]).sort().join('\n');
          if(tokens(old.value)!==tokens(change.value))throw fail('문구 안의 출처 URL은 변경할 수 없습니다.',400);
          if(old.document_id==='localeResourcesJSON'&&(old.value.match(/\{[a-zA-Z0-9_]+\}/g)||[]).sort().join()!==(change.value.match(/\{[a-zA-Z0-9_]+\}/g)||[]).sort().join())throw fail('UI 치환자 이름은 변경할 수 없습니다.',400);
          db.prepare('UPDATE study_text SET value = ?, version = version + 1 WHERE id = ?').run(change.value,change.id);
          if (old.document_id === 'localeResourcesJSON') {
            const keys = JSON.parse(old.field_path);
            if (keys[0] === 'resources') db.prepare('UPDATE locale_resource SET value = ? WHERE locale = ? AND resource_key = ?').run(change.value, 'ko', keys[1]);
          }
          history.push({id:change.id,before:old.value,after:change.value,afterVersion:old.version+1});
        }
      }
      db.prepare('INSERT INTO study_change VALUES (?, ?, ?)').run(id,now,JSON.stringify(history));
      if (changes.some(change => change.id !== 'notes:main')) db.prepare('INSERT INTO study_meta VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('content-pending',id);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      console.info(JSON.stringify({event:'study_batch',batchId:id,outcome:'rolled_back',status:error.status??500}));
      throw error;
    }
    const errors = [];
    try { exportNotes(); } catch (error) { errors.push(error.message); }
    const hasContent=changes.some(change=>change.id!=='notes:main');
    if(hasContent&&deferExports)queueExport();
    else if(hasContent)try { exportContent(); } catch (error) { errors.push(error.message); }
    console.info(JSON.stringify({event:'study_batch',batchId:id,targets:changes.length,outcome:'committed',exportPending:hasContent&&deferExports||errors.length>0}));
    return { batchId:id, records:rows().filter(row=>ids.has(row.id)), exportErrors:errors,exportPending:hasContent&&deferExports };
  }
  if(deferExports&&(db.prepare('SELECT value FROM study_meta WHERE key = ?').get('content-pending')?.value||'0')!=='0')queueExport();
  return {
    catalogue: rows, documents,
    batch,
    exportContent,
    captureGoogle(id,answer,metadata){
      if(!db.prepare('SELECT 1 FROM study_text WHERE id = ?').get('google:'+id))throw fail('문항을 찾지 못했습니다.',404);
      const capture={...metadata,answer,source:'google-browser',updatedAt:new Date().toISOString()};
      db.prepare('INSERT INTO study_google_capture VALUES (?, ?, ?)').run(randomUUID(),id,JSON.stringify(capture));
      db.prepare('INSERT INTO study_meta VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('content-pending',randomUUID());
      if(deferExports)queueExport();else exportContent();
    },
    exportState(){return {pending:(db.prepare('SELECT value FROM study_meta WHERE key = ?').get('content-pending')?.value||'0')!=='0',error:db.prepare('SELECT value FROM study_meta WHERE key = ?').get('export-error')?.value||null};},
    history() { return db.prepare('SELECT id,created_at AS createdAt,changes_json FROM study_change ORDER BY rowid DESC LIMIT 100').all().map(row=>({...row,changes:JSON.parse(row.changes_json),changes_json:undefined})); },
    restore(id, versions) {
      const row = db.prepare('SELECT changes_json FROM study_change WHERE id = ?').get(id);
      if (!row) throw fail('변경 이력이 없습니다.',404);
      const current = new Map(rows().map(record=>[record.id,record]));
      return batch(JSON.parse(row.changes_json).map(change=>{
        if(current.get(change.id)?.value!==change.after||(change.afterVersion!==undefined&&current.get(change.id)?.version!==change.afterVersion))throw fail('이후 변경이 있어 이 묶음을 복원할 수 없습니다.');
        return {id:change.id,value:change.before,version:versions?.[change.id]};
      }));
    },
    retryExport() { exportNotes(); exportContent(); return { saved:true }; }
  };
}
