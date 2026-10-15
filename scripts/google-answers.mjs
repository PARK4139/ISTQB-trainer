import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStudyStore } from './study-store.mjs';

let studyStore;
const invokedAsCli=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
function repository() { return (studyStore ??= createStudyStore(undefined,{deferExports:!invokedAsCli})).content(); }
function databaseAnswers() {
  const content=repository(), values=content.documents().googleAnswersJSON;
  const rows=new Map(content.catalogue().filter(row=>row.kind==='googleAnswersJSON').map(row=>[JSON.parse(row.path)[0],row]));
  return Object.fromEntries(Object.entries(values).map(([id,state])=>{
    const row=rows.get(id);
    return [id,{...state,revision:String(row?.version??0),userModified:!!row&&row.original!==row.value,source:state.source||(state.answer?'manual':null)}];
  }));
}

export function getGoogleAnswer(id) {
  const state=databaseAnswers()[id];
  if(!state)throw Object.assign(new Error('문항을 찾지 못했습니다.'),{status:404});
  return state;
}

export function getAllGoogleAnswers() {
  return databaseAnswers();
}

export function getGoogleQuestions() {
  const {daily,mock}=repository().documents().appData;
  const questions=new Map([...daily,...mock].map(q=>[q.id,q.question]));
  for(const q of daily)if(q.general)questions.set(q.general.id,q.general.query);
  return [...questions].map(([id,question])=>({id,question}));
}

export function saveGoogleAnswer(id, answer, revision, metadata = {}) {
  if (typeof answer !== 'string' || answer.length > 50_000 || typeof revision !== 'string') {
    throw Object.assign(new Error('답변은 5만 자 이하의 텍스트로 입력해 주세요.'), { status: 400 });
  }
  const previous=getGoogleAnswer(id);
  if (previous.revision !== revision) {
    throw Object.assign(new Error('다른 창에서 답변이 바뀌었습니다. 입력한 내용을 복사해 두고 새로고침해 주세요.'), { status: 409 });
  }
  repository().batch([{id:'google:'+id,value:answer.trim(),version:Number(revision)}]);
  if(metadata.source==='google-browser')repository().captureGoogle(id,answer.trim(),metadata);
  return getGoogleAnswer(id);
}

export function buildGoogleAnswers() {
  // DB 원본을 다시 파일에서 가져오거나 수집 원문을 덮어쓰지 않는다.
  databaseAnswers();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'pending') {
    const answers = getAllGoogleAnswers();
    const all = process.argv.includes('--all');
    const general = process.argv.includes('--general');
    const pending = getGoogleQuestions().filter(question => (all || question.id.startsWith(general ? 'G' : 'D')) && !answers[question.id]?.answer);
    process.stdout.write(JSON.stringify(pending, null, 2) + '\n');
  } else {
    buildGoogleAnswers();
    repository().retryExport();
    process.stdout.write('Google AI 답변을 HTML에 반영했습니다.\n');
  }
}
