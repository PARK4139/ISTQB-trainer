import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,cpSync,renameSync,existsSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createAllStrings,recoverInterrupted} from './all-strings.mjs';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixture=mkdtempSync(path.join(tmpdir(),'ctfl-all-strings-'));
for(const dir of ['web','scripts','content','notes'])mkdirSync(path.join(fixture,dir));
const term='프로젝트';
writeFileSync(path.join(fixture,'web/index.html'),`<div id="${term}" title="${term}">${term} 관리</div><script>const ${term}='https://example.com/${term}';</script><style>.${term}{color:pink}</style>`);
writeFileSync(path.join(fixture,'scripts/source.js'),`const ${term} = '${term}';`);
writeFileSync(path.join(fixture,'content/raw.json'),JSON.stringify({[term]:term,url:'https://example.com/'+term}));
writeFileSync(path.join(fixture,'notes/study-notes.md'),term+' '+term);
writeFileSync(path.join(fixture,'run.cmd'),'@echo '+term);
const database=path.join(fixture,'content/locales.sqlite');
let db=new DatabaseSync(database);db.exec('CREATE TABLE strings (id TEXT PRIMARY KEY, value TEXT, source_url TEXT); CREATE TABLE study_note(id TEXT PRIMARY KEY,text TEXT,revision TEXT,exported_revision TEXT); CREATE TABLE study_export(filename TEXT PRIMARY KEY,hash TEXT,pending_hash TEXT)');
db.prepare('INSERT INTO strings VALUES (?,?,?)').run(term,term,'https://example.com/'+term);
db.prepare('INSERT INTO study_note VALUES (?,?,?,?)').run('main',term+' '+term,'before','before');
db.prepare('INSERT INTO study_export VALUES (?,?,NULL)').run('web/index.html','before');db.close();
const original=readFileSync(path.join(fixture,'web/index.html'),'utf8');
let engine=createAllStrings(fixture),session=engine.begin(term);
assert(session.occurrences>15);assert(session.locations.some(l=>l.location.includes('source_url')));
engine.apply(session.id,'Pro');engine.apply(session.id,term+'_Project');
assert.equal(readFileSync(path.join(fixture,'web/index.html'),'utf8'),original.split(term).join(term+'_Project'));
db=new DatabaseSync(database);assert.equal(db.prepare('SELECT id FROM strings').get().id,term+'_Project');assert.equal(db.prepare('SELECT source_url FROM strings').get().source_url,'https://example.com/'+term+'_Project');db.close();
engine.end(session.id);engine=createAllStrings(fixture);engine.resume(session.id);engine.apply(session.id,'Project');engine.end(session.id);
assert(!readFileSync(path.join(fixture,'web/index.html'),'utf8').includes(term));
assert(readFileSync(path.join(fixture,'scripts/source.js'),'utf8').includes('const Project'));
engine.restore(session.id);assert.equal(readFileSync(path.join(fixture,'web/index.html'),'utf8'),original);
db=new DatabaseSync(database);assert.equal(db.prepare('SELECT id FROM strings').get().id,term);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');db.close();
// 후속 DB 변경은 복원으로 덮어쓰지 않는다.
session=engine.begin(term);engine.apply(session.id,'Project');engine.end(session.id);
db=new DatabaseSync(database);db.prepare('INSERT INTO strings VALUES (?,?,?)').run('later','later note','later URL');db.close();assert.throws(()=>engine.restore(session.id),/후속 DB/);
db=new DatabaseSync(database);db.prepare('DELETE FROM strings WHERE id=?').run('later');db.close();engine.restore(session.id);
// ID 치환이 UNIQUE 제약과 충돌하면 DB와 파일 모두 원래 값이다.
db=new DatabaseSync(database);db.prepare('INSERT INTO strings VALUES (?,?,?)').run('Project','unchanged','https://example.com');db.close();session=engine.begin(term);assert.throws(()=>engine.apply(session.id,'Project'),/UNIQUE/);engine.end(session.id);assert.equal(readFileSync(path.join(fixture,'web/index.html'),'utf8'),original);db=new DatabaseSync(database);assert(db.prepare('SELECT id FROM strings WHERE id=?').get(term));db.prepare('DELETE FROM strings WHERE id=?').run('Project');db.close();
// 외부 변경을 덮어쓰지 않는다.
session=engine.begin(term);writeFileSync(path.join(fixture,'scripts/source.js'),'external '+term);assert.throws(()=>engine.apply(session.id,'Project'),/외부/);engine.end(session.id);
assert.equal(readFileSync(path.join(fixture,'web/index.html'),'utf8'),original);
// 첫 파일 출력 후 실제 파일 시스템 오류를 일으켜 전체 원복을 확인한다.
let writes=0;engine=createAllStrings(fixture,{writeOutput:(file,bytes)=>{writes++;if(writes===2)writeFileSync(path.join(fixture,'missing-directory','output'),bytes);writeFileSync(file,bytes)}});
session=engine.begin(term);
assert.throws(()=>engine.apply(session.id,'Project'));engine.end(session.id);assert.equal(readFileSync(path.join(fixture,'web/index.html'),'utf8'),original);
// 종료 중단 상태인 저널과 변경 파일을 남긴 뒤 다음 시작에서 원복한다.
session=engine.begin(term);engine.end(session.id);const manifestFile=path.join(fixture,'.ctfl-recovery',session.id,'manifest.json');let manifest=JSON.parse(readFileSync(manifestFile,'utf8'));manifest.phase='writing';const pendingHTML=original.split(term).join('Project');manifest.files.find(row=>row.file==='web/index.html').pendingHash=createHash('sha256').update(pendingHTML).digest('hex');writeFileSync(manifestFile,JSON.stringify(manifest));writeFileSync(path.join(fixture,'web/index.html'),'external after interruption');assert.throws(()=>recoverInterrupted(fixture),/외부/);writeFileSync(path.join(fixture,'web/index.html'),pendingHTML);recoverInterrupted(fixture);assert.equal(readFileSync(path.join(fixture,'web/index.html'),'utf8'),original);
// 독립 복구 스크립트는 앱 모듈을 읽지 않는다.
session=engine.begin(term);engine.apply(session.id,"Project'; BROKEN");engine.end(session.id);
const unchanged=engine.begin('BROKEN');engine.end(unchanged.id);
const restore=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(fixture,'.ctfl-recovery/recover.ps1')],{encoding:'utf8'});
assert.equal(restore.status,0,restore.stdout+restore.stderr);assert.equal(readFileSync(path.join(fixture,'web/index.html'),'utf8'),original);
assert.equal(createAllStrings(fixture).history().find(row=>row.id===session.id).phase,'restored');recoverInterrupted(fixture);
assert(existsSync(path.join(fixture,'.ctfl-recovery/recover.ps1')));
console.log(JSON.stringify({verdict:'PASS',fixture,occurrences:session.occurrences,checks:['HTML/JS/CSS/attributes/URL/IDs/JSON/notes/run.cmd/database text','fixed targets and self-containing replacement','resume after service recreation','DB and file restore','later DB conflict preserved','ID UNIQUE conflict rolls back all','external file conflict','actual file write failure rollback','interrupted journal recovery and later file conflict','independent PowerShell recovery with damaged source'],browserGestures:false}));
