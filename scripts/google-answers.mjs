import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const answersPath = path.join(repoRoot, 'content', 'google-ai-answers.json');
const htmlPath = path.join(repoRoot, 'web', 'index.html');

function loadData() {
  const html = readFileSync(htmlPath, 'utf8');
  const match = html.match(/<script id="appData" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('학습 문항을 찾지 못했습니다.');
  const { daily, mock } = JSON.parse(match[1]);
  const questions = new Map([...daily, ...mock].map(question => [question.id, question.question]));
  for (const question of daily) {
    if (question.general) questions.set(question.general.id, question.general.query);
  }
  const answers = JSON.parse(readFileSync(answersPath, 'utf8'));
  return { html, questions, answers };
}

function answerState(id, questions, answers) {
  if (!questions.has(id)) throw Object.assign(new Error('문항을 찾지 못했습니다.'), { status: 404 });
  const record = Object.hasOwn(answers, id) ? answers[id] : null;
  const revision = createHash('sha256').update(JSON.stringify(record)).digest('hex');
  const current = record?.question === questions.get(id);
  return { id, answer: current ? record.answer : '', updatedAt: current ? record.updatedAt : null, source: current ? record.source || 'manual' : null, sourceUrl: current ? record.sourceUrl || '' : '', references: current ? record.references || [] : [], revision };
}

function embed(html, questions, answers) {
  const states = Object.fromEntries([...questions.keys()].map(id => [id, answerState(id, questions, answers)]));
  const json = JSON.stringify(states).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const payload = `<script id="googleAnswersJSON" type="application/json">${json}</script>`;
  const existing = /<script id="googleAnswersJSON" type="application\/json">[\s\S]*?<\/script>/;
  return existing.test(html) ? html.replace(existing, () => payload) : html.replace('<script id="notesEditorLibrary">', () => `${payload}\n<script id="notesEditorLibrary">`);
}

export function getGoogleAnswer(id) {
  const { questions, answers } = loadData();
  return answerState(id, questions, answers);
}

export function getAllGoogleAnswers() {
  const { questions, answers } = loadData();
  return Object.fromEntries([...questions.keys()].map(id => [id, answerState(id, questions, answers)]));
}

export function getGoogleQuestions() {
  return [...loadData().questions].map(([id, question]) => ({ id, question }));
}

export function saveGoogleAnswer(id, answer, revision, metadata = {}) {
  if (typeof answer !== 'string' || answer.length > 50_000 || typeof revision !== 'string') {
    throw Object.assign(new Error('답변은 5만 자 이하의 텍스트로 입력해 주세요.'), { status: 400 });
  }
  const { html, questions, answers } = loadData();
  if (answerState(id, questions, answers).revision !== revision) {
    throw Object.assign(new Error('다른 창에서 답변이 바뀌었습니다. 입력한 내용을 복사해 두고 새로고침해 주세요.'), { status: 409 });
  }
  if (answer.trim()) answers[id] = { question: questions.get(id), answer: answer.trim(), updatedAt: new Date().toISOString(), source: metadata.source === 'google-browser' ? 'google-browser' : 'manual', sourceUrl: metadata.sourceUrl || '', references: metadata.references || [] };
  else delete answers[id];
  const output = embed(html, questions, answers);
  writeFileSync(`${answersPath}.tmp`, `${JSON.stringify(answers, null, 2)}\n`, 'utf8');
  renameSync(`${answersPath}.tmp`, answersPath);
  writeFileSync(`${htmlPath}.tmp`, output, 'utf8');
  renameSync(`${htmlPath}.tmp`, htmlPath);
  return answerState(id, questions, answers);
}

export function buildGoogleAnswers() {
  const { html, questions, answers } = loadData();
  const output = embed(html, questions, answers);
  if (output !== html) writeFileSync(htmlPath, output, 'utf8');
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
    process.stdout.write('Google AI 답변을 HTML에 반영했습니다.\n');
  }
}
