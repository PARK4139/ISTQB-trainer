// 등록 문구 편집과 분리된 전체 원본 치환 UI. 코드 자체의 변경은 재실행 시 적용한다.
(()=>{
  'use strict';
  const key=STORAGE_KEY+'-all-strings-enabled',draftKey=STORAGE_KEY+'-all-strings-draft';
  const settings=document.getElementById('advancedSettings'),button=document.getElementById('advancedSettingsButton');
  const section=document.createElement('section');section.innerHTML='<hr class="divider"><label><input type="checkbox" id="allStringsEnabled" disabled> 전체 문자열 치환</label><p class="tiny">앱이 소유한 텍스트 파일과 DB 문자열 전체를 변경합니다. 코드·URL·ID도 포함되어 동작에 영향을 줄 수 있습니다.</p><p class="tiny">복구: 서버 종료 후 run.cmd recover<br>실행 파일도 손상됐다면 PowerShell에서 .\\.ctfl-recovery\\recover.ps1 실행</p><div id="allStringsConnection" class="tiny">서버 확인 중</div><button class="btn ghost" id="allStringsHistory" type="button">전체 치환 이력·복원</button><div id="allStringsHistoryList"></div>';settings.append(section);
  const panel=document.createElement('section');panel.id='allStringsPanel';panel.hidden=true;panel.className='card card-pad';panel.style.cssText='position:fixed;z-index:70;bottom:16px;left:16px;right:16px;max-height:65vh;overflow:auto;box-shadow:var(--shadow);border:2px solid var(--hover-pink,#f08fbe)';
  panel.innerHTML='<div class="flexrow"><strong id="allStringsCount">전체 문자열 치환</strong><button id="allStringsClose" type="button" class="btn">편집 종료 · Esc</button></div><textarea id="allStringsInput" aria-label="전체 문자열 치환 입력"></textarea><div id="allStringsStatus" role="status"></div><button id="allStringsRetry" class="btn" type="button" hidden>저장 재시도</button><button id="allStringsRecover" class="btn" type="button" hidden>미저장 초안 복구</button><details><summary>변경 대상 위치</summary><ul id="allStringsLocations"></ul></details>';document.body.append(panel);
  const style=document.createElement('style');style.textContent='#allStringsPanel .CodeMirror{height:85px;border:1px solid var(--border);background:var(--panel2);color:var(--text)}#allStringsPanel [hidden]{display:none!important}#allStringsLocations{font-size:12px;max-height:120px;overflow:auto}#allStringsStatus{padding:8px 0}';document.head.append(style);
  const toggle=document.getElementById('allStringsEnabled'),legacy=document.getElementById('globalTextEnabled'),status=document.getElementById('allStringsStatus'),connection=document.getElementById('allStringsConnection'),retry=document.getElementById('allStringsRetry'),recover=document.getElementById('allStringsRecover');
  let session=null,editor=null,saving=null,timer=null,composing=false,starting=false,revision=0,savedRevision=0;
  const bases=new Map(),attributes=new Map(),shell=document.querySelector('.shell');let paintQueued=false;
  function enabled(value,persist=true){window.studyAllStringsEnabled=value;toggle.checked=value;button.classList.toggle('all-strings-active',value);button.textContent=value?'고급설정 · 전체 치환 ON':'고급설정';if(persist)try{localStorage.setItem(key,String(value))}catch{}}
  async function request(action,data){const r=await fetch('/api/all-strings/'+action,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,cache:'no-store'});const result=await r.json();if(!r.ok)throw Error(result.error||'전체 치환 실패');return result}
  function draft(){if(!session||!editor)return;try{localStorage.setItem(draftKey,JSON.stringify({id:session.id,term:session.term,noteBefore:session.noteBefore,replacement:editor.getValue()}))}catch{status.textContent='초안을 저장할 공간이 없습니다. 편집창을 유지하세요.'}}
  function pending(){return !!session&&revision!==savedRevision}
  function paint(){
    if(!session||!editor)return;
    const term=session.displayTerm||session.term,value=editor.getValue();
    const walker=document.createTreeWalker(shell,NodeFilter.SHOW_TEXT);
    for(let node;node=walker.nextNode();){
      if(node.parentElement.closest('.CodeMirror,script,style,#advancedSettingsButton'))continue;
      const old=bases.get(node),base=old&&old.after===node.nodeValue?old.before:node.nodeValue;
      const after=base.split(term).join(value);bases.set(node,{before:base,after});if(node.nodeValue!==after)node.nodeValue=after;
    }
    for(const element of [shell,...shell.querySelectorAll('*')]){
      if(element.closest('.CodeMirror'))continue;
      const previous=attributes.get(element)||new Map();
      for(const attr of [...element.attributes]){const old=previous.get(attr.name),before=old&&old.after===attr.value?old.before:attr.value,after=before.split(term).join(value);previous.set(attr.name,{before,after});if(after!==attr.value)element.setAttribute(attr.name,after)}
      attributes.set(element,previous);
    }
    if(session.noteBefore!==undefined){const text=session.noteBefore.split(session.term).join(value);if(text!==notesEditor.getValue()){const scroll=notesEditor.getScrollInfo();window.studyGlobalNotesEditing=true;notesEditor.setValue(text);notesEditor.scrollTo(scroll.left,scroll.top);cacheNotes()}}
  }
  new MutationObserver(()=>{if(!session||paintQueued)return;paintQueued=true;requestAnimationFrame(()=>{paintQueued=false;paint()})}).observe(document.querySelector('.shell'),{subtree:true,childList:true,characterData:true});
  async function flush(){
    clearTimeout(timer);if(!session||composing)return;
    if(saving){await saving;if(pending())return flush();return}
    if(!pending())return;
    const current=session,value=editor.getValue(),sentRevision=revision;draft();status.textContent='저장 중';
    saving=(async()=>{
      try{await request('apply',{id:current.id,replacement:value});savedRevision=sentRevision;status.textContent='저장됨 · 코드 변경은 서버 재시작 후 적용';retry.hidden=true;if(!pending())localStorage.removeItem(draftKey)}
      catch(error){status.textContent='저장 실패 · '+error.message;retry.hidden=false;draft();throw error}
    })();
    try{await saving}finally{saving=null}
    if(pending())return flush();
  }
  function queue(){void flush().catch(()=>{})}
  async function close(){
    try{await flush();if(pending())return false;if(session)await request('end',{id:session.id});session=null;panel.hidden=true;window.studyGlobalNotesEditing=false;notesEditor.setOption('readOnly',false);bases.clear();attributes.clear();
      // 버전과 저장 상태를 다시 받아 일반 메모 저장이 이전 버전을 보내지 않게 한다.
      const response=await fetch('/api/notes',{cache:'no-store'});const note=await response.json();if(response.ok){notesRevision=note.revision;notesSavedText=note.text;notesConflict=note.conflict;notesStatus.textContent='DB 저장됨'}return true;
    }catch(error){status.textContent='편집을 유지합니다 · '+error.message;return false}
  }
  async function start(cm,restore){
    if(session||starting)return;
    let term=restore?.term||cm?.getSelection()||window.getSelection()?.toString()||'';
    const active=document.activeElement;if(!term&&(active instanceof HTMLInputElement||active instanceof HTMLTextAreaElement))term=active.value.slice(active.selectionStart,active.selectionEnd);
    if(!term&&cm){selectNextNoteOccurrence(cm);term=cm.getSelection()}if(!term)return;
    starting=true;panel.hidden=false;
    try{
      if(!restore){await saveNotesFile();if(notesSaving||notesConflict)throw Error('메모 저장을 먼저 완료하세요.');}clearTimeout(notesSaveTimer);
      const result=await request(restore?'resume':'begin',restore?{id:restore.id}:{term});session={...result,displayTerm:restore?result.replacement:term,noteBefore:restore?.noteBefore??notesEditor.getValue()};revision=0;savedRevision=0;bases.clear();attributes.clear();
      document.getElementById('allStringsCount').textContent='전체 '+result.occurrences+'곳 · '+result.locations.length+'개 위치';
      const list=document.getElementById('allStringsLocations');list.replaceChildren();for(const row of result.locations){const li=document.createElement('li');li.textContent=row.location+' · '+row.count+'곳';list.append(li)}
      if(editor)editor.toTextArea();document.getElementById('allStringsInput').value=term;
      editor=CodeMirror.fromTextArea(document.getElementById('allStringsInput'),{lineWrapping:true,inputStyle:'textarea',screenReaderLabel:'전체 문자열 치환 입력',extraKeys:{Esc:()=>void close(),'Ctrl-Z':'undo','Ctrl-Y':'redo','Cmd-Z':'undo','Shift-Cmd-Z':'redo'}});
      editor.on('change',()=>{revision++;paint();draft();status.textContent='입력 즉시 반영 · 저장 대기 중';clearTimeout(timer);timer=setTimeout(queue,400)});
      editor.on('keydown',wrapNoteSelections);editor.getInputField().addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer)});editor.getInputField().addEventListener('compositionend',()=>{composing=false;clearTimeout(timer);timer=setTimeout(queue,400)});
      window.studyGlobalNotesEditing=true;notesEditor.setOption('readOnly',true);status.textContent='입력하면 즉시 전체 원본에 반영됩니다.';recover.hidden=true;editor.focus();editor.execCommand('selectAll');if(restore)editor.setValue(restore.replacement);
    }catch(error){status.textContent=error.message}finally{starting=false}
  }
  window.startAllStrings=start;
  document.addEventListener('keydown',event=>{if(window.studyAllStringsEnabled&&(event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='l'&&!event.target.closest('.CodeMirror')){event.preventDefault();void start()}});
  toggle.addEventListener('change',async()=>{
    const next=toggle.checked;if(!next&&!(await close())){toggle.checked=true;return}
    if(next&&legacy.checked){legacy.checked=false;legacy.dispatchEvent(new Event('change'));await new Promise(resolve=>setTimeout(resolve,0));if(legacy.checked||window.studyGlobalNotesEditing){toggle.checked=false;return}}
    enabled(next);
  });
  legacy.addEventListener('change',async()=>{if(legacy.checked&&window.studyAllStringsEnabled){if(!(await close())){legacy.checked=false;legacy.dispatchEvent(new Event('change'));return}enabled(false)}});
  document.getElementById('allStringsClose').addEventListener('click',()=>void close());retry.addEventListener('click',queue);
  recover.addEventListener('click',()=>{try{enabled(true);void start(null,JSON.parse(localStorage.getItem(draftKey)))}catch(error){status.textContent=error.message}});
  document.getElementById('allStringsHistory').addEventListener('click',async()=>{
    const list=document.getElementById('allStringsHistoryList');list.replaceChildren();
    try{const result=await request('history');for(const row of result.history){const item=document.createElement('div');item.className='global-history-item';item.textContent=new Date(row.createdAt).toLocaleString('ko-KR')+' · '+row.term+' → '+row.replacement+' · '+row.phase+' ';
      if(row.phase==='committed'){const restore=document.createElement('button');restore.type='button';restore.textContent='이 변경 복원';restore.addEventListener('click',async()=>{try{if(session)throw Error('편집을 먼저 종료하세요.');await request('restore',{id:row.id});restore.textContent='복원됨 · 새로고침하세요';restore.disabled=true}catch(error){restore.textContent=error.message}});item.append(restore)}list.append(item)}if(!result.history.length)list.textContent='변경 이력이 없습니다.';
    }catch(error){list.textContent=error.message}
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&pending()){draft();queue()}});
  window.addEventListener('pagehide',()=>{if(pending())draft()});window.addEventListener('beforeunload',event=>{if(pending()){draft();event.preventDefault();event.returnValue=''}else if(session){navigator.sendBeacon('/api/all-strings/end',new Blob([JSON.stringify({id:session.id})],{type:'application/json'}))}});
  let remembered=false;try{remembered=localStorage.getItem(key)==='true'}catch{}
  enabled(false,false);
  void(async()=>{try{await request('history');toggle.disabled=false;connection.textContent='서버 연결됨 · 파일·DB 전체 치환 가능';if(remembered){if(legacy.checked){legacy.checked=false;legacy.dispatchEvent(new Event('change'))}enabled(true)}if(localStorage.getItem(draftKey)){panel.hidden=false;recover.hidden=false;status.textContent='미저장 전체 치환 초안이 있습니다.'}}catch{connection.textContent='run.cmd 실행 후 새로고침하세요.'}})();
})();
