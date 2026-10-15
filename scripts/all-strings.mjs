// 앱 실행 원본 전체의 리터럴 치환. 복구 사본은 편집 범위 밖에 둔다.
import { readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, existsSync, copyFileSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const hash = value => createHash('sha256').update(value).digest('hex');
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const fault = (message, status=409) => Object.assign(new Error(message), {status});
const replace = (text, term, value) => text.split(term).join(value);
const count = (text, term) => text.split(term).length - 1;
const vault = root => path.join(root, '.ctfl-recovery');
const dbPath = root => path.join(root, 'content', 'locales.sqlite');
const readManifest = (root, id) => {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw fault('잘못된 변경 ID입니다.',400);
  return JSON.parse(readFileSync(path.join(vault(root),id,'manifest.json'),'utf8').replace(/^\uFEFF/,''));
};
function writeManifest(root, item) {
  const dest=path.join(vault(root),item.id,'manifest.json');
  writeFileSync(dest+'.tmp',JSON.stringify(item,null,2));renameSync(dest+'.tmp',dest);
}
function databaseState(db) {
  const result=[];
  for (const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()) {
    result.push([name, db.prepare('SELECT rowid AS __ctfl_rowid__, * FROM '+quote(name)+' ORDER BY rowid').all()]);
  }
  return result;
}
const databaseHash = db => hash(JSON.stringify(databaseState(db),(_,v)=>typeof v==='bigint'?String(v):v));
function writeAtomic(file, bytes) {
  const temp=file+'.ctfl-tmp';writeFileSync(temp,bytes);renameSync(temp,file);
}
function files(root) {
  const result=[];
  function visit(relative) {
    const full=path.join(root,relative),stat=lstatSync(full);
    if(stat.isSymbolicLink())throw fault('심볼릭 링크는 앱 소유 경로로 확인할 수 없습니다: '+relative);
    if(stat.isDirectory()){for(const name of readdirSync(full))visit(path.join(relative,name));return}
    if(!stat.isFile()||relative.endsWith('.ctfl-tmp')||/\.sqlite(?:-wal|-shm|-journal)?$/.test(relative))return;
    const bytes=readFileSync(full);
    if(bytes.includes(0))return;
    let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes)}catch{return}
    result.push({file:relative.replaceAll('\\','/'),text,hash:hash(bytes)});
  }
  for(const dir of ['web','scripts','content','notes'])if(existsSync(path.join(root,dir)))visit(dir);
  if(existsSync(path.join(root,'run.cmd')))visit('run.cmd');
  return result;
}
function installRecovery(root) {
  mkdirSync(vault(root),{recursive:true});
  // 독립 스크립트는 치환 엔진 자체가 손상돼도 Node나 앱 모듈을 읽지 않는다.
  writeFileSync(path.join(vault(root),'recover.ps1'),`param([string]$Id = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (!$Id) { $Id = (Get-ChildItem -LiteralPath $PSScriptRoot -Directory | Where-Object { $candidateFile = Join-Path $_.FullName 'manifest.json'; if (Test-Path -LiteralPath $candidateFile) { (Get-Content -LiteralPath $candidateFile -Raw -Encoding UTF8 | ConvertFrom-Json).phase -in @('committed','writing') } } | Sort-Object LastWriteTime -Descending | Select-Object -First 1).Name }
if ($Id -notmatch '^[a-f0-9-]{36}$') { throw 'No recovery batch found.' }
$batchPath = Join-Path $PSScriptRoot $Id
$manifest = Get-Content -LiteralPath (Join-Path $batchPath 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest.phase -eq 'restored') { throw 'Already restored.' }
if ($manifest.phase -eq 'ready') { throw 'No saved replacement in this session.' }
foreach ($entry in $manifest.files) {
  $targetPath = [IO.Path]::GetFullPath((Join-Path $projectRoot $entry.file))
  if (!$targetPath.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Invalid recovery path.' }
  if ($manifest.phase -eq 'committed' -and (Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash.ToLower() -ne $entry.afterHash) { throw ('Later file change: ' + $entry.file) }
}
$databasePath = Join-Path $projectRoot 'content/locales.sqlite'
if ($manifest.phase -eq 'committed' -and (Get-FileHash -LiteralPath $databasePath -Algorithm SHA256).Hash.ToLower() -ne $manifest.databaseFileHash) { throw 'Later database change. Preserve current files before recovery.' }
$databaseLock = [IO.File]::Open($databasePath, 'Open', 'ReadWrite', 'None')
$databaseLock.Dispose()
$manifest.phase = 'writing'
$manifest | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath (Join-Path $batchPath 'manifest.json') -Encoding UTF8
foreach ($entry in $manifest.files) { Copy-Item -LiteralPath (Join-Path $batchPath ('files/' + $entry.file)) -Destination (Join-Path $projectRoot $entry.file) -Force }
Copy-Item -LiteralPath (Join-Path $batchPath 'before.sqlite') -Destination $databasePath -Force
$manifest.phase = 'restored'
$manifest | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath (Join-Path $batchPath 'manifest.json') -Encoding UTF8
Write-Host 'Recovery complete. Restart run.cmd.'
`, 'utf8');
}
function restoreFiles(root, manifest) {
  for(const entry of manifest.files)writeAtomic(path.join(root,entry.file),readFileSync(path.join(vault(root),manifest.id,'files',entry.file)));
}
export function recoverInterrupted(root) {
  if(!existsSync(vault(root)))return;
  for(const id of readdirSync(vault(root))){if(!/^[a-f0-9-]{36}$/.test(id))continue;
    const manifest=readManifest(root,id);
    if(manifest.phase!=='writing')continue;
    for(const entry of manifest.files){const current=hash(readFileSync(path.join(root,entry.file)));if(![entry.beforeHash,entry.afterHash,entry.pendingHash].includes(current))throw fault('중단 후 외부 파일 변경을 보존했습니다. 복구 사본을 확인하세요: '+entry.file)}
    const current=new DatabaseSync(dbPath(root)),original=new DatabaseSync(path.join(vault(root),id,'before.sqlite'));
    try{if(![databaseHash(original),manifest.databaseHash,manifest.pendingDatabaseHash].includes(databaseHash(current)))throw fault('중단 후 외부 DB 변경을 보존했습니다. 복구 사본을 확인하세요.')}finally{current.close();original.close()}
    restoreFiles(root,manifest);copyFileSync(path.join(vault(root),id,'before.sqlite'),dbPath(root));
    manifest.phase='restored';writeManifest(root,manifest);
  }
}
export function createAllStrings(root,{writeOutput=writeAtomic}={}) {
  let session=null;
  function openDB(){const db=new DatabaseSync(dbPath(root));db.exec('PRAGMA busy_timeout=3000');return db}
  function history(){
    if(!existsSync(vault(root)))return [];
    return readdirSync(vault(root)).filter(id=>/^[a-f0-9-]{36}$/.test(id)).map(id=>readManifest(root,id)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(({id,term,replacement,createdAt,phase,occurrences})=>({id,term,replacement,createdAt,phase,occurrences}));
  }
  function begin(term) {
    if(session)throw fault('기존 전체 치환 편집을 먼저 종료하세요.');
    if(typeof term!=='string'||!term||term.length>10000)throw fault('선택할 문자열을 확인하세요.',400);
    const db=openDB();
    try{
      if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='study_meta'").get()&&db.prepare("SELECT value FROM study_meta WHERE key='content-pending'").get()?.value && db.prepare("SELECT value FROM study_meta WHERE key='content-pending'").get().value!=='0')throw fault('문구 내보내기가 끝난 뒤 다시 시도하세요.');
      const snapshot=databaseState(db),fileList=files(root).filter(row=>row.text.includes(term));
      const cells=[];
      for(const [table,rows] of snapshot)for(const row of rows)for(const [column,value] of Object.entries(row))if(column!=='__ctfl_rowid__'&&typeof value==='string'&&value.includes(term))cells.push({table,column,rowid:row.__ctfl_rowid__,before:value,expected:value,count:count(value,term)});
      const occurrences=fileList.reduce((n,r)=>n+count(r.text,term),0)+cells.reduce((n,c)=>n+c.count,0);
      if(!occurrences)throw fault('앱 원본에 일치하는 문자열이 없습니다.',404);
      installRecovery(root);
      const id=randomUUID(),dir=path.join(vault(root),id);mkdirSync(dir,{recursive:true});
      db.exec('VACUUM INTO '+"'"+path.join(dir,'before.sqlite').replaceAll("'","''")+"'");
      const manifest={id,term,replacement:term,createdAt:new Date().toISOString(),phase:'ready',occurrences,files:fileList.map(row=>({file:row.file,beforeHash:row.hash,afterHash:row.hash})),databaseHash:databaseHash(db),databaseFileHash:hash(readFileSync(dbPath(root)))};
      for(const row of fileList){const dest=path.join(dir,'files',row.file);mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,row.text,'utf8')}
      writeManifest(root,manifest);session={manifest,files:fileList,cells};
      return {id,term,occurrences,locations:[...fileList.map(row=>({location:row.file,count:count(row.text,term)})),...cells.map(c=>({location:'DB/'+c.table+'/'+c.column+'/'+c.rowid,count:c.count}))]};
    }finally{db.close()}
  }
  function apply(id,replacement) {
    if(!session||session.manifest.id!==id)throw fault('전체 치환 세션을 다시 시작하세요.');
    if(typeof replacement!=='string'||replacement.length>100000)throw fault('입력 문자열이 너무 큽니다.',400);
    const {manifest,cells}=session,db=openDB();
    let started=false,committed=false;
    try{
      db.exec('BEGIN IMMEDIATE');started=true;
      if(databaseHash(db)!==manifest.databaseHash)throw fault('DB가 다른 창에서 변경되었습니다. 초안을 보존했습니다.');
      for(const row of manifest.files)if(hash(readFileSync(path.join(root,row.file)))!==row.afterHash)throw fault('파일이 외부에서 변경되었습니다: '+row.file);
      // 고정한 최초 원본에만 치환한다. 사용자가 입력한 문자열은 재검색하지 않는다.
      for(const cell of cells)db.prepare('UPDATE '+quote(cell.table)+' SET '+quote(cell.column)+'=? WHERE rowid=?').run(replace(cell.before,manifest.term,replacement),cell.rowid);
      if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='study_text'").get())for(const rid of new Set(cells.filter(c=>c.table==='study_text').map(c=>c.rowid)))db.prepare('UPDATE study_text SET version=version+1 WHERE rowid=?').run(rid);
      const fk=db.prepare('PRAGMA foreign_key_check').all();if(fk.length)throw fault('치환 결과가 DB 참조 규칙과 충돌합니다.');
      for(const entry of manifest.files){const row=session.files.find(row=>row.file===entry.file);entry.pendingHash=hash(replace(row.text,manifest.term,replacement))}
      manifest.phase='writing';writeManifest(root,manifest);
      for(const row of session.files)writeOutput(path.join(root,row.file),Buffer.from(replace(row.text,manifest.term,replacement),'utf8'));
      // 파생 상태를 다시 계산해 정상적인 메모 저장·내보내기가 치환 결과를 덮어쓰지 않게 한다.
      if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='study_note'").get()){
        for(const row of db.prepare('SELECT rowid AS rid,text FROM study_note').all())db.prepare('UPDATE study_note SET revision=?,exported_revision=? WHERE rowid=?').run(hash(row.text),hash(row.text),row.rid);
      }
      if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='study_export'").get())for(const row of db.prepare('SELECT rowid AS rid,filename FROM study_export').all()){
        const target=path.resolve(root,row.filename);if(target.startsWith(root+path.sep)&&existsSync(target))db.prepare('UPDATE study_export SET hash=?,pending_hash=NULL WHERE rowid=?').run(hash(readFileSync(target)),row.rid);
      }
      if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw fault('DB 무결성 검사가 실패했습니다.');
      const nextHash=databaseHash(db);manifest.pendingDatabaseHash=nextHash;writeManifest(root,manifest);db.exec('COMMIT');committed=true;started=false;
      manifest.replacement=replacement;manifest.databaseHash=nextHash;manifest.databaseFileHash=hash(readFileSync(dbPath(root)));manifest.phase='committed';
      for(const row of manifest.files)row.afterHash=hash(readFileSync(path.join(root,row.file)));
      writeManifest(root,manifest);
      return {id,saved:true,occurrences:manifest.occurrences,restartRequired:true};
    }catch(error){
      if(started)db.exec('ROLLBACK');
      if(manifest.phase==='writing'){
        // 직전 성공 값으로 돌아간다. 강제 종료는 before.sqlite에서 세션 전체를 복구한다.
        for(const row of session.files)writeAtomic(path.join(root,row.file),Buffer.from(replace(row.text,manifest.term,manifest.replacement),'utf8'));
        if(!committed){manifest.phase=manifest.replacement===manifest.term?'ready':'committed';writeManifest(root,manifest)}
      }
      throw error;
    }finally{db.close()}
  }
  function end(id){if(session&&session.manifest.id===id)session=null;return {ended:true}}
  function resume(id){
    if(session){if(session.manifest.id!==id)throw fault('다른 전체 치환 편집이 진행 중입니다.');return describe(session)}
    const manifest=readManifest(root,id);if(!['ready','committed'].includes(manifest.phase))throw fault('복구할 수 없는 세션입니다. 원본 복구 이력을 확인하세요.');
    const current=openDB(),original=new DatabaseSync(path.join(vault(root),id,'before.sqlite'));
    try{
      if(databaseHash(current)!==manifest.databaseHash)throw fault('초안 저장 이후 DB가 변경되었습니다.');
      for(const row of manifest.files)if(hash(readFileSync(path.join(root,row.file)))!==row.afterHash)throw fault('초안 저장 이후 파일이 변경되었습니다: '+row.file);
      const cells=[];for(const [table,rows] of databaseState(original))for(const row of rows)for(const [column,value] of Object.entries(row))if(column!=='__ctfl_rowid__'&&typeof value==='string'&&value.includes(manifest.term))cells.push({table,column,rowid:row.__ctfl_rowid__,before:value,count:count(value,manifest.term)});
      session={manifest,cells,files:manifest.files.map(row=>({file:row.file,text:readFileSync(path.join(vault(root),id,'files',row.file),'utf8')}))};return describe(session);
    }finally{original.close();current.close()}
  }
  function describe(item){const {manifest,files,cells}=item;return {id:manifest.id,term:manifest.term,replacement:manifest.replacement,occurrences:manifest.occurrences,locations:[...files.map(row=>({location:row.file,count:count(row.text,manifest.term)})),...cells.map(c=>({location:'DB/'+c.table+'/'+c.column+'/'+c.rowid,count:c.count}))]}}
  function restore(id) {
    if(session)throw fault('편집을 먼저 종료하세요.');
    const manifest=readManifest(root,id),db=openDB();
    try{
      if(manifest.phase!=='committed')throw fault('복원 가능한 완료된 변경이 아닙니다.');
      if(databaseHash(db)!==manifest.databaseHash)throw fault('후속 DB 변경이 있어 복원을 중단했습니다.');
      for(const row of manifest.files)if(hash(readFileSync(path.join(root,row.file)))!==row.afterHash)throw fault('후속 파일 변경이 있습니다: '+row.file);
      const currentFiles=manifest.files.map(row=>({file:row.file,bytes:readFileSync(path.join(root,row.file))}));
      // 기존 연결을 유지하기 위해 백업의 같은 테이블을 트랜잭션으로 복원한다.
      db.exec("ATTACH DATABASE '"+path.join(vault(root),id,'before.sqlite').replaceAll("'","''")+"' AS recovery");
      db.exec('BEGIN IMMEDIATE');
      try{
        for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()){
          const columns=db.prepare('PRAGMA table_info('+quote(name)+')').all().map(c=>quote(c.name)).join(',');
          db.exec('DELETE FROM '+quote(name)+'; INSERT INTO '+quote(name)+'(rowid,'+columns+') SELECT rowid,'+columns+' FROM recovery.'+quote(name));
        }
        manifest.phase='writing';writeManifest(root,manifest);restoreFiles(root,manifest);db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');for(const row of currentFiles)writeAtomic(path.join(root,row.file),row.bytes);manifest.phase='committed';writeManifest(root,manifest);throw error}
      manifest.phase='restored';writeManifest(root,manifest);return {restored:true,reloadRequired:true};
    }finally{db.close()}
  }
  return {begin,apply,end,resume,history,restore,get active(){return !!session}};
}
