import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,copyFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixture=mkdtempSync(path.join(tmpdir(),'ctfl-all-http-'));
for(const dir of ['scripts','web','content','notes'])cpSync(path.join(root,dir),path.join(fixture,dir),{recursive:true});
copyFileSync(path.join(root,'run.cmd'),path.join(fixture,'run.cmd'));
const db=new DatabaseSync(path.join(fixture,'content/locales.sqlite'));
if(db.prepare("SELECT 1 FROM sqlite_master WHERE name='study_export'").get())db.prepare('UPDATE study_export SET hash=?,pending_hash=NULL WHERE filename=?').run(createHash('sha256').update(readFileSync(path.join(fixture,'web/index.html'))).digest('hex'),'web/index.html');db.close();
let child,base;
async function start(){
  child=spawn(process.execPath,['scripts/static-server.mjs','web','0'],{cwd:fixture,stdio:['ignore','pipe','pipe']});
  let output='';child.stderr.on('data',b=>{output+=b});
  base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timeout: '+output)),15000);child.on('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code+': '+output))});child.stdout.on('data',b=>{output+=b;const m=output.match(/http:\/\/localhost:\d+/);if(m){clearTimeout(timer);resolve(m[0])}})});
}
async function stop(){if(!child||child.exitCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));child.kill();await done}
const post=(route,data,headers={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
try{
  await start();assert.equal((await fetch(base+'/api/all-strings/history')).status,200);
  assert.equal((await post('/api/all-strings/begin',{term:'프로젝트'},{Origin:'http://other.invalid'})).status,403);
  assert.equal((await fetch(base+'/api/all-strings/begin',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
  assert.equal((await fetch(base+'/api/all-strings/begin',{method:'POST',headers:{'Content-Type':'text/plain'},body:'x'})).status,415);
  assert.equal((await post('/api/all-strings/apply',{id:'invalid',replacement:'x'})).status,409);
  const note=await(await fetch(base+'/api/notes')).json();
  const normal=await fetch(base+'/api/notes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'프로젝트 메모',revision:note.revision})});assert.equal(normal.status,200);
  const begun=await post('/api/all-strings/begin',{term:'프로젝트'});assert.equal(begun.status,200);const session=await begun.json();
  assert(session.locations.some(r=>r.location.startsWith('scripts/')));assert(session.locations.some(r=>r.location.startsWith('DB/')));
  assert.equal((await post('/api/texts/export',{})).status,409);
  let response=await post('/api/all-strings/apply',{id:session.id,replacement:'Project'});assert.equal(response.status,200,await response.text());
  response=await post('/api/all-strings/apply',{id:session.id,replacement:'Project_scope'});assert.equal(response.status,200,await response.text());
  assert.equal((await post('/api/all-strings/end',{id:session.id})).status,200);
  let current=await(await fetch(base+'/api/notes')).json();assert.equal(current.text,'Project_scope 메모');assert.equal(current.conflict,false);
  await stop();
  for(const script of ['build-global-editor.mjs','build-locales.mjs']){const run=spawnSync(process.execPath,['scripts/'+script],{cwd:fixture,encoding:'utf8'});assert.equal(run.status,0,run.stderr)}
  await start();assert((await(await fetch(base+'/')).text()).includes('Project_scope 위험'));current=await(await fetch(base+'/api/notes')).json();assert.equal(current.text,'Project_scope 메모');assert.equal(current.conflict,false);
  response=await post('/api/all-strings/restore',{id:session.id});assert.equal(response.status,200,await response.text());assert.equal((await(await fetch(base+'/api/notes')).json()).text,'프로젝트 메모');
  console.log(JSON.stringify({verdict:'PASS',fixture,occurrences:session.occurrences,checks:['actual HTTP server','origin/JSON/content-type guards','exclusive write session','fixed repeated replacement','notes metadata coherence','server restart and both builders','HTTP history restore']}));
}finally{await stop()}
