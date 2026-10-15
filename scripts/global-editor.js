// 단일 HTML에 내장하는 웹 전체 문구 편집기 원본.
(()=>{
  'use strict';
  const settingKey=STORAGE_KEY+'-global-text-enabled',draftKey=STORAGE_KEY+'-global-text-draft';
  let enabled=false,records=[],session=null,editor=null,saving=false,timer,loading=false,composing=false;
  const sourceText=new WeakMap(),sourceAttrs=new WeakMap();
  let replacements=[],painting=false,initialHydration=true;
  const settings=document.createElement('details');settings.className='global-settings';
  settings.innerHTML='<summary>고급설정</summary><label><input type="checkbox" id="globalTextEnabled"> 웹 전체 문구 편집</label><p class="tiny">ON: 문구 선택 후 Ctrl+Shift+L · 숨겨진 탭과 메모 포함</p><div id="globalTextConnection" class="tiny">저장 서버 확인 중</div><button type="button" class="btn ghost" id="globalTextHistory">문구 변경 이력</button><div id="globalHistoryList"></div>';
  document.querySelector('.notes-panel').append(settings);
  const panel=document.createElement('section');panel.id='globalTextPanel';panel.hidden=true;
  panel.setAttribute('aria-label','웹 전체 문구 편집');
  panel.innerHTML='<div class="flexrow"><strong id="globalTargetCount"></strong><button type="button" class="btn ghost" id="globalTextClose">편집 종료 · Esc</button></div><p class="tiny">입력 즉시 전체 대상에 반영 · Ctrl+Z 실행 취소 · Ctrl+Y 다시 실행</p><textarea id="globalTextInput" aria-label="전체 문구 동시 편집"></textarea><div id="globalTextStatus" role="status"></div><div class="buttons"><button type="button" class="btn" id="globalTextRetry" hidden>저장 재시도</button><button type="button" class="btn" id="globalTextExport" hidden>내보내기 재시도</button><button type="button" class="btn" id="globalTextRecover" hidden>미저장 편집 복구</button><button type="button" class="btn" id="globalTextDiscard" hidden>미저장 편집 보관 후 종료</button></div><details><summary>변경 대상 위치</summary><ul id="globalTargetList"></ul></details>';
  document.body.append(panel);
  const style=document.createElement('style');style.textContent='.global-settings{border-top:1px solid var(--border);padding-top:12px}.global-settings summary{cursor:pointer}.global-settings input{accent-color:var(--accent)}#globalTextPanel{position:fixed;z-index:50;bottom:16px;left:clamp(12px,10vw,220px);right:clamp(12px,10vw,220px);max-height:65vh;overflow:auto;padding:18px;background:var(--panel);border:2px solid var(--accent);border-radius:12px;box-shadow:0 12px 45px #0008}#globalTextPanel[hidden]{display:none}#globalTextPanel .CodeMirror{height:85px;border:1px solid var(--border);background:var(--panel2);color:var(--text)}#globalTargetList{font-size:12px;max-height:120px;overflow:auto}#globalTextStatus{padding:8px 0;color:var(--accent2)}.global-history-item{font-size:12px;padding:8px 0;border-top:1px solid var(--border)}.source-override-note{font-size:12px;color:var(--accent2)}';document.head.append(style);
  style.textContent+='#globalTextPanel [hidden]{display:none!important}';
  const toggle=document.getElementById('globalTextEnabled'),status=document.getElementById('globalTextStatus');
  const retry=document.getElementById('globalTextRetry'),exportButton=document.getElementById('globalTextExport');
  const recover=document.getElementById('globalTextRecover'),discard=document.getElementById('globalTextDiscard');
  try{enabled=localStorage.getItem(settingKey)==='true'}catch{}
  toggle.checked=enabled;toggle.disabled=true;
  function setStatus(message){status.textContent=message;document.getElementById('globalTextConnection').textContent=message}
  async function request(url,data){
    let response;
    try{response=await fetch(url,{...(data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{}),cache:'no-store'})}
    catch{throw Error('서버에 연결할 수 없습니다. 초안은 보존됩니다.')}
    let result;try{result=await response.json()}catch{throw Error('저장 서버 응답을 확인할 수 없습니다.')}
    if(!response.ok)throw Object.assign(Error(result.error||'저장 실패'),{status:response.status});
    return result;
  }
  function replaceText(text){
    if(!replacements.length)return text;
    // 한 번만 치환해 새 문구가 다른 규칙에 다시 걸리지 않게 한다.
    let result='',index=0;
    while(index<text.length){
      let match=null,at=text.length;
      for(const item of replacements){const found=text.indexOf(item.original,index);if(found>=0&&(found<at||(found===at&&item.original.length>(match?.original.length||0)))){match=item;at=found}}
      if(!match){result+=text.slice(index);break}
      result+=text.slice(index,at)+match.value;index=at+match.original.length;
    }
    return result;
  }
  function excludedNode(node){return node.parentElement?.closest('script,style,textarea,input,.CodeMirror,#globalTargetList,#globalTargetCount,#globalTextStatus,.source-override-note')}
  function paint(){
    if(painting)return;painting=true;
    try{
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      for(let node;node=walker.nextNode();){
        if(excludedNode(node))continue;
        const previous=sourceText.get(node),base=previous&&node.nodeValue===previous.painted?previous.base:node.nodeValue;
        const value=replaceText(base);sourceText.set(node,{base,painted:value});if(value!==node.nodeValue)node.nodeValue=value;
      }
      for(const element of document.querySelectorAll('[title],[placeholder],[aria-label]')){
        if(element.closest('.CodeMirror'))continue;
        const previous=sourceAttrs.get(element)||{};
        for(const name of ['title','placeholder','aria-label'])if(element.hasAttribute(name)){
          const value=element.getAttribute(name),old=previous[name],base=old&&value===old.painted?old.base:value,painted=replaceText(base);
          previous[name]={base,painted};if(value!==painted)element.setAttribute(name,painted);
        }
        sourceAttrs.set(element,previous);
      }
    const modified=records.filter(row=>['officialDataJSON','googleAnswersJSON'].includes(row.kind)&&row.value!==row.original).length;
      let note=document.querySelector('.source-override-note');
      if(modified&&!note){note=document.createElement('p');note.className='source-override-note';document.querySelector('.topline').after(note)}
      const label=modified?'공식 자료·Google 답변에 사용자 수정본 '+modified+'개 적용 중 · 원문과 출처는 DB에 보존됩니다.':'';
      if(note&&note.textContent!==label)note.textContent=label;
    }finally{painting=false}
  }
  let paintQueued=false;
  new MutationObserver(()=>{if(paintQueued)return;paintQueued=true;requestAnimationFrame(()=>{paintQueued=false;paint()})}).observe(document.querySelector('.shell'),{subtree:true,childList:true,characterData:true});
  function applyRecords(next,updateNotes=false){
    const old=new Map(records.map(row=>[row.id,row]));
    for(const row of next){old.set(row.id,row);if(row.kind!=='notes'&&row.kind!=='interface'){
      const docs={appData:DATA,officialDataJSON:OFFICIAL_DATA,localeResourcesJSON:LOCALE_BUNDLE,googleAnswersJSON:googleAnswers};
      let object=docs[row.kind];const keys=JSON.parse(row.path||(row.kind==='googleAnswersJSON'?JSON.stringify([row.id.slice(7),'answer']):JSON.stringify(row.id.slice(row.id.indexOf(':')+1).split('/').map(key=>/^\d+$/.test(key)?Number(key):key))));
      for(const key of keys.slice(0,-1))object=object?.[key];if(object){object[keys.at(-1)]=row.kind==='googleAnswersJSON'?row.value:row.original;if(row.kind==='googleAnswersJSON'){object.userModified=row.original!==row.value;object.revision=String(row.version)}}
    }}
    records=[...old.values()];
    replacements=records.filter(row=>row.kind!=='notes'&&row.original&&row.original!==row.value).sort((a,b)=>b.original.length-a.original.length);
    for(const row of [...replacements])if(row.kind==='appData'){
      const before=row.original.split(/\||(?:와|과) /),after=row.value.split(/\||(?:와|과) /);
      if(before.length===after.length&&before.length>1)for(let i=0;i<before.length;i++)if(before[i]&&before[i]!==after[i])replacements.push({original:before[i],value:after[i]});
    }
    // 치환자 값이 펼쳐진 UI 문구에도 같은 변경을 표시한다.
    for(const row of [...replacements])if(/\{[a-zA-Z0-9_]+\}/.test(row.original)){
      let start=0,end=0;while(row.original[start]===row.value[start]&&start<Math.min(row.original.length,row.value.length))start++;
      while(end<Math.min(row.original.length,row.value.length)-start&&row.original.at(-end-1)===row.value.at(-end-1))end++;
      const original=row.original.slice(start,end? -end:undefined),value=row.value.slice(start,end?-end:undefined);
      if(original)replacements.push({original,value});
    }
    const note=next.find(row=>row.id==='notes:main');
    if(note&&(updateNotes||session?.targets.some(row=>row.id==='notes:main'))&&note.value!==notesEditor.getValue()){
      const scroll=notesEditor.getScrollInfo(),selected=notesEditor.listSelections().map(range=>({anchor:notesEditor.indexFromPos(range.anchor),head:notesEditor.indexFromPos(range.head)}));
      const target=session?.targets.find(row=>row.id==='notes:main'),before=session?.displayReplacement??session?.term,after=editor?.getValue();
      function mapIndex(index){
        if(updateNotes||!target)return Math.min(index,note.value.length);
        let delta=0;
        for(let i=0;i<target.ranges.length;i++){
          const from=target.ranges[i][0]+i*(before.length-session.term.length),to=from+before.length;
          if(index<from)break;
          if(index<=to)return from+delta+Math.min(index-from,after.length);
          delta+=after.length-before.length;
        }
        return index+delta;
      }
      window.studyGlobalNotesEditing=true;
      notesEditor.operation(()=>{
        notesEditor.replaceRange(note.value,CodeMirror.Pos(0,0),CodeMirror.Pos(notesEditor.lastLine(),notesEditor.getLine(notesEditor.lastLine()).length),'global');
        notesEditor.setSelections(selected.map(range=>({anchor:notesEditor.posFromIndex(mapIndex(range.anchor)),head:notesEditor.posFromIndex(mapIndex(range.head))})));
      });
      notesEditor.scrollTo(scroll.left,scroll.top);cacheNotes();window.studyGlobalNotesEditing=!!session?.targets.some(row=>row.id==='notes:main');
    }
    if(note&&updateNotes==='saved'){notesRevision=note.version;notesSavedText=note.value;notesConflict=false;notesStatus.textContent='DB 저장됨'}
    if(initialHydration){initialHydration=false;render()}
    paint();
  }
  window.studyTextSourceValue=(id,fallback)=>{
    const row=records.find(row=>row.id===id);
    return row&&row.original&&row.value===fallback?row.original:fallback;
  };
  function draft(){
    if(!session)return;
    try{localStorage.setItem(draftKey,JSON.stringify({term:session.term,targets:session.targets,replacement:editor.getValue()}))}catch{setStatus('복구 초안을 브라우저에 저장하지 못했습니다. 편집창을 닫지 마세요.')}
  }
  function openSession(term,targets,replacement=term){
    session={term,targets,values:new Map(),saved:new Map(targets.map(row=>[row.id,row.value])),revision:0};
    panel.hidden=false;recover.hidden=true;discard.hidden=true;retry.hidden=true;
    document.getElementById('globalTargetCount').textContent='전체 '+targets.reduce((n,row)=>n+row.ranges.length,0)+'곳 · '+targets.length+'개 문구 동시 편집';
    const list=document.getElementById('globalTargetList');list.replaceChildren();
    for(const target of targets){const li=document.createElement('li');li.textContent=target.id+' · '+target.ranges.length+'곳';list.append(li)}
    if(editor)editor.toTextArea();
    document.getElementById('globalTextInput').value=replacement;
    editor=CodeMirror.fromTextArea(document.getElementById('globalTextInput'),{lineWrapping:true,inputStyle:'textarea',screenReaderLabel:'전체 문구 동시 편집',historyEventDelay:700,extraKeys:{'Esc':endSession,'Ctrl-Z':'undo','Ctrl-Y':'redo','Shift-Ctrl-Z':'redo','Shift-Cmd-Z':'redo','Cmd-Z':'undo'}});
    editor.on('change',()=>{
      const value=editor.getValue();session.revision++;
      const changes=session.targets.map(row=>{
        let text='',cursor=0;for(const [from,to] of row.ranges){text+=row.value.slice(cursor,from)+value;cursor=to}text+=row.value.slice(cursor);
        session.values.set(row.id,text);return {...row,value:text};
      });
      applyRecords(changes);session.displayReplacement=value;draft();setStatus('저장 대기 중');retry.hidden=true;
      clearTimeout(timer);timer=setTimeout(()=>void flush(),400);
    });
    editor.on('keydown',wrapNoteSelections);
    editor.getInputField().addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer)});
    editor.getInputField().addEventListener('compositionend',()=>{composing=false;clearTimeout(timer);timer=setTimeout(()=>void flush(),400)});
    window.studyGlobalNotesEditing=targets.some(row=>row.id==='notes:main');
    if(window.studyGlobalNotesEditing)notesEditor.setOption('readOnly',true);
    editor.focus();editor.execCommand('selectAll');setStatus('입력하면 즉시 변경됩니다.');
    if(replacement!==term){CodeMirror.signal(editor,'change',editor,{origin:'restore'})}
  }
  async function flush(){
    if(!session||saving||composing)return;
    const current=session,revision=current.revision;
    const changes=current.targets.filter(row=>current.values.has(row.id)&&current.values.get(row.id)!==current.saved.get(row.id)).map(row=>({id:row.id,value:current.values.get(row.id),version:row.version}));
    if(!changes.length){try{localStorage.removeItem(draftKey)}catch{}return}
    saving=true;setStatus('저장 중');draft();
    try{
      const result=await request('/api/texts/batch',{changes});
      for(const saved of result.records){const target=current.targets.find(row=>row.id===saved.id);if(target)target.version=saved.version;current.saved.set(saved.id,saved.value);const row=records.find(row=>row.id===saved.id);if(row)row.version=saved.version;
        if(saved.id==='notes:main'){notesRevision=saved.version;notesSavedText=saved.value}}
      exportButton.hidden=!result.exportErrors?.length;
      setStatus(result.exportErrors?.length?'DB 저장됨 · 내보내기 실패: '+result.exportErrors.join(' / '):result.exportPending?'DB 저장됨 · 내보내기 중':'저장됨');
      if(result.exportPending)void watchExport();
      retry.hidden=true;
      if(current.revision===revision){try{localStorage.removeItem(draftKey)}catch{}}
      else draft();
    }catch(error){setStatus((error.status===409?'충돌 · ':'저장 실패 · ')+error.message);retry.hidden=false;discard.hidden=false;draft();return}
    finally{saving=false}
    if(session===current&&current.revision!==revision)void flush();
  }
  let exportPoll=null;
  async function watchExport(){
    clearTimeout(exportPoll);
    try{
      const state=await request('/api/texts/export-state');
      if(state.error){exportButton.hidden=false;if(!hasPending())setStatus('DB 저장됨 · 내보내기 실패: '+state.error);return}
      if(state.pending){exportPoll=setTimeout(()=>void watchExport(),500);return}
      exportButton.hidden=true;if(!hasPending())setStatus('저장됨 · 내보내기 완료');
    }catch{exportPoll=setTimeout(()=>void watchExport(),2000)}
  }
  function hasPending(){return session&&session.targets.some(row=>session.values.has(row.id)&&session.values.get(row.id)!==session.saved.get(row.id))}
  async function endSession(){
    clearTimeout(timer);await flush();
    if(saving||hasPending()){setStatus('저장되지 않은 변경이 있습니다. 재시도하거나 보관 후 종료하세요.');return}
    session=null;panel.hidden=true;window.studyGlobalNotesEditing=false;notesEditor.setOption('readOnly',false);
  }
  async function loadCatalogue(){
    const result=await request('/api/texts');records=[];applyRecords(result.records);return result.records;
  }
  async function startGlobal(cm){
    if(!enabled){selectAllNoteOccurrences(cm||notesEditor);return}
    if(session||loading)return;
    let term=cm?.getSelection()||window.getSelection()?.toString()||'';
    const active=document.activeElement;
    if(!term&&(active instanceof HTMLInputElement||active instanceof HTMLTextAreaElement))term=active.value.slice(active.selectionStart,active.selectionEnd);
    if(!term&&cm){selectNextNoteOccurrence(cm);term=cm.getSelection()}
    if(!term)return;
    loading=true;
    try{
      await saveNotesFile();if(notesSaving||notesConflict)throw Error('메모 저장을 먼저 완료하세요.');
      const all=await loadCatalogue();const targets=[];
      for(const row of all){const ranges=[],pattern=row.kind==='localeResourcesJSON'?/https?:\/\/\S+|\{[a-zA-Z0-9_]+\}/g:/https?:\/\/\S+/g,protectedRanges=[...row.value.matchAll(pattern)].map(m=>[m.index,m.index+m[0].length]);for(let at=row.value.indexOf(term);at>=0;at=row.value.indexOf(term,at+term.length))if(!protectedRanges.some(([a,b])=>at<b&&at+term.length>a))ranges.push([at,at+term.length]);if(ranges.length)targets.push({...row,ranges})}
      if(!targets.length)throw Error('편집 가능한 원본 문구에서 일치 항목이 없습니다.');
      openSession(term,targets);
    }catch(error){panel.hidden=false;setStatus(error.message)}finally{loading=false}
  }
  notesEditor.setOption('extraKeys',{...notesEditor.getOption('extraKeys'),'Shift-Ctrl-L':cm=>void startGlobal(cm),'Shift-Cmd-L':cm=>void startGlobal(cm)});
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='l'&&enabled&&!event.target.closest('.CodeMirror')){event.preventDefault();void startGlobal()}
  });
  toggle.addEventListener('change',async()=>{
    if(!toggle.checked&&hasPending()){await endSession();if(hasPending()){toggle.checked=true;return}}
    enabled=toggle.checked;if(!enabled)await endSession();try{localStorage.setItem(settingKey,String(enabled))}catch{}
  });
  document.getElementById('globalTextClose').addEventListener('click',()=>void endSession());
  retry.addEventListener('click',()=>void flush());
  exportButton.addEventListener('click',async()=>{try{await request('/api/texts/export',{});exportButton.hidden=true;setStatus('DB 저장·내보내기 완료')}catch(error){setStatus(error.message)}});
  discard.addEventListener('click',()=>{
    draft();const current=session;
    if(current)applyRecords(current.targets.map(row=>({...row,value:current.saved.get(row.id)})),true);
    session=null;window.studyGlobalNotesEditing=false;notesEditor.setOption('readOnly',false);recover.hidden=false;discard.hidden=true;
    setStatus('미저장 초안을 보관했습니다. 저장된 내용으로 화면을 복원했습니다.');
  });
  recover.addEventListener('click',async()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(draftKey));const all=await loadCatalogue(),map=new Map(all.map(row=>[row.id,row]));
      if(saved.targets.some(row=>map.get(row.id)?.version!==row.version))throw Error('복구 초안과 서버 버전이 다릅니다. 초안을 보존했습니다.');
      openSession(saved.term,saved.targets,saved.replacement);
    }catch(error){setStatus(error.message)}
  });
  document.getElementById('globalTextHistory').addEventListener('click',async()=>{
    const list=document.getElementById('globalHistoryList');list.replaceChildren();
    try{
      const result=await request('/api/texts/history');
      for(const batch of result.history){const item=document.createElement('div');item.className='global-history-item';item.textContent=new Date(batch.createdAt).toLocaleString('ko-KR')+' · '+batch.changes.length+'개 문구 ';
        const button=document.createElement('button');button.type='button';button.textContent='이 변경 복원';button.addEventListener('click',async()=>{
          try{if(session)throw Error('현재 편집을 먼저 종료하세요.');const all=await loadCatalogue();const versions=Object.fromEntries(all.map(row=>[row.id,row.version]));const restored=await request('/api/texts/restore',{batchId:batch.id,versions});applyRecords(restored.records,'saved');button.textContent='복원됨';button.disabled=true;if(restored.exportPending){setStatus('DB 저장됨 · 내보내기 중');void watchExport()}else if(restored.exportErrors?.length){panel.hidden=false;exportButton.hidden=false;setStatus('DB 저장됨 · 내보내기 실패')}}catch(error){button.textContent=error.message}
        });item.append(button);list.append(item)}
      if(!result.history.length)list.textContent='변경 이력이 없습니다.';
    }catch(error){list.textContent=error.message}
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&hasPending()){draft();void flush()}});
  window.addEventListener('pagehide',()=>{if(hasPending())draft()});
  window.addEventListener('beforeunload',event=>{if(hasPending()){draft();event.preventDefault();event.returnValue=''}});
  // 오프라인 HTML에서도 내장한 수정본을 표시한다. 저장은 서버 확인 후에만 활성화한다.
  try{const embedded=JSON.parse(document.getElementById('textOverridesJSON')?.textContent||'[]');applyRecords(embedded)}catch{}
  void(async()=>{
    try{await loadCatalogue();toggle.disabled=false;document.getElementById('globalTextConnection').textContent='DB 연결됨';
      if(localStorage.getItem(draftKey)){panel.hidden=false;recover.hidden=false;setStatus('미저장 편집이 있습니다. 복구할 수 있습니다.')}
    }catch{enabled=false;toggle.checked=false;document.getElementById('globalTextConnection').textContent='저장 기능은 run.cmd 실행이 필요합니다.'}
  })();
})();
