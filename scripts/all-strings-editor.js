// 등록 문구 편집과 분리된 전체 원본 치환 UI. 코드 자체의 변경은 재실행 시 적용한다.
(()=>{
  'use strict';
  const key=STORAGE_KEY+'-all-strings-enabled',draftKey=STORAGE_KEY+'-all-strings-draft';
  const settings=document.getElementById('advancedSettings'),button=document.getElementById('advancedSettingsButton');
  const section=document.createElement('section');section.innerHTML='<hr class="divider"><label><input type="checkbox" id="allStringsEnabled" disabled> 전체 문자열 치환</label><p class="tiny">앱이 소유한 텍스트 파일과 DB 문자열 전체를 변경합니다. 코드·URL·ID도 포함되어 동작에 영향을 줄 수 있습니다.</p><p class="tiny">복구: 서버 종료 후 run.cmd recover<br>실행 파일도 손상됐다면 PowerShell에서 .\\.ctfl-recovery\\recover.ps1 실행</p><div id="allStringsConnection" class="tiny">서버 확인 중</div><button class="btn ghost" id="allStringsHistory" type="button">전체 치환 이력·복원</button><div id="allStringsHistoryList"></div>';settings.append(section);
  const toggle=document.getElementById('allStringsEnabled'),legacy=document.getElementById('globalTextEnabled'),status=document.getElementById('notesSelectionStatus'),connection=document.getElementById('allStringsConnection');
  const retry=document.createElement('button');retry.type='button';retry.className='btn ghost';retry.textContent='전체 치환 저장 재시도';retry.hidden=true;document.querySelector('.notes-tools').append(retry);
  const recover=document.createElement('button');recover.type='button';recover.className='btn ghost';recover.textContent='미저장 전체 치환 복구';recover.hidden=true;document.querySelector('.notes-tools').append(recover);
  const inlineStyle=document.createElement('style');inlineStyle.textContent='.notes-tools button[hidden]{display:none!important}';document.head.append(inlineStyle);
  let session=null,editor=null,saving=null,timer=null,composing=false,starting=false,initializing=false,revision=0,savedRevision=0;
  const bases=new Map(),attributes=new Map(),shell=document.querySelector('.shell');let paintQueued=false;
  function enabled(value,persist=true){window.studyAllStringsEnabled=value;toggle.checked=value;button.classList.toggle('all-strings-active',value);button.textContent=value?'고급설정 · 전체 치환 ON':'고급설정';if(persist)try{localStorage.setItem(key,String(value))}catch{}}
  async function request(action,data){const r=await fetch('/api/all-strings/'+action,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,cache:'no-store'});const result=await r.json();if(!r.ok)throw Error(result.error||'전체 치환 실패');return result}
  function draft(){if(!session||!editor)return;try{localStorage.setItem(draftKey,JSON.stringify({id:session.id,term:session.term,noteBefore:session.noteBefore,replacement:editor.getValue()}))}catch{status.textContent='초안을 저장할 공간이 없습니다. 편집창을 유지하세요.'}}
  function pending(){return !!session&&revision!==savedRevision}
  function paint(){
    if(!session||!editor||initializing)return;
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
  }
  notesEditor.on('change',()=>{
    if(!session||!editor||initializing)return;
    revision++;paint();draft();status.textContent='전체 문구 즉시 반영 · 저장 대기 중';retry.hidden=true;
    clearTimeout(timer);timer=setTimeout(queue,400);
  });
  notesEditor.getInputField().addEventListener('compositionstart',()=>{if(session){composing=true;clearTimeout(timer)}});
  notesEditor.getInputField().addEventListener('compositionend',()=>{if(session){composing=false;clearTimeout(timer);timer=setTimeout(queue,400)}});
  notesEditor.setOption('extraKeys',{...notesEditor.getOption('extraKeys'),Esc:()=>{if(session)void close();else notesEditor.execCommand('singleSelection')}});
  new MutationObserver(()=>{if(!session||paintQueued)return;paintQueued=true;requestAnimationFrame(()=>{paintQueued=false;paint()})}).observe(document.querySelector('.shell'),{subtree:true,childList:true,characterData:true});
  async function flush(){
    clearTimeout(timer);if(!session||composing)return;
    if(saving){await saving;if(pending())return flush();return}
    if(!pending())return;
    const current=session,value=editor.getValue(),sentRevision=revision;draft();status.textContent='저장 중';
    saving=(async()=>{
      try{await request('apply',{id:current.id,replacement:value});savedRevision=sentRevision;status.textContent='전체 문구 저장됨 · 코드 변경은 서버 재시작 후 적용';retry.hidden=true;if(!pending())localStorage.removeItem(draftKey)}
      catch(error){status.textContent='전체 문구 저장 실패 · '+error.message;retry.hidden=false;draft();throw error}
    })();
    try{await saving}finally{saving=null}
    if(pending())return flush();
  }
  function queue(){void flush().catch(()=>{})}
  async function close(){
    try{await flush();if(pending())return false;const prior=session;if(session)await request('end',{id:session.id});session=null;window.studyGlobalNotesEditing=true;
      const response=await fetch('/api/notes',{cache:'no-store'}),note=await response.json();
      if(response.ok){notesEditor.setValue(note.text);notesEditor.save();notesRevision=note.revision;notesSavedText=note.text;notesConflict=note.conflict;cacheNotes();notesStatus.textContent='DB 저장됨'}
      else{notesEditor.setValue(prior?.noteBefore??notesEditor.getValue());notesEditor.setSelections(prior?.noteSelections||[]);notesEditor.scrollTo(prior?.noteScroll?.left||0,prior?.noteScroll?.top||0)}
      window.studyGlobalNotesEditing=false;editor=null;bases.clear();attributes.clear();status.textContent='전체 문구 편집 종료 · 메모 복원됨';
      return true;
    }catch(error){status.textContent='편집을 유지합니다 · '+error.message;return false}
  }
  async function start(cm,restore){
    if(session||starting)return;
    let term=restore?.term||cm?.getSelection()||window.getSelection()?.toString()||'';
    const active=document.activeElement;if(!term&&(active instanceof HTMLInputElement||active instanceof HTMLTextAreaElement))term=active.value.slice(active.selectionStart,active.selectionEnd);
    if(!term&&cm){selectNextNoteOccurrence(cm);term=cm.getSelection()}if(!term)return;
    starting=true;
    try{
      const noteBefore=restore?.noteBefore??notesEditor.getValue(),noteSelections=restore?.noteSelections??notesEditor.listSelections(),noteScroll=restore?.noteScroll??notesEditor.getScrollInfo();
      if(!restore){await saveNotesFile();if(notesSaving||notesConflict)throw Error('메모 저장을 먼저 완료하세요.');}clearTimeout(notesSaveTimer);
      const result=await request(restore?'resume':'begin',restore?{id:restore.id}:{term});session={...result,displayTerm:restore?result.replacement:term,noteBefore,noteSelections,noteScroll};revision=0;savedRevision=0;bases.clear();attributes.clear();
      editor=notesEditor;window.studyGlobalNotesEditing=true;initializing=true;editor.setValue(restore?restore.replacement:term);editor.setOption('readOnly',false);editor.execCommand('selectAll');initializing=false;
      status.textContent='전체 '+result.occurrences+'곳 · '+result.locations.length+'개 위치 · 메모 편집기에서 바로 입력 · Esc 종료';recover.hidden=true;retry.hidden=true;editor.focus();
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
  retry.addEventListener('click',queue);
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
  void(async()=>{try{await request('history');toggle.disabled=false;connection.textContent='서버 연결됨 · 파일·DB 전체 치환 가능';if(remembered){if(legacy.checked){legacy.checked=false;legacy.dispatchEvent(new Event('change'))}enabled(true)}if(localStorage.getItem(draftKey)){recover.hidden=false;status.textContent='미저장 전체 치환 초안이 있습니다.'}}catch{connection.textContent='run.cmd 실행 후 새로고침하세요.'}})();
})();
