import { workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { createStudyStore } from './study-store.mjs';
const store=createStudyStore(workerData.root);
try{store.content().exportContent()}
catch(error){
  const db=new DatabaseSync(path.join(workerData.root,'content','locales.sqlite'));
  db.prepare('INSERT INTO study_meta VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('export-error',error.message);db.close();
}finally{store.close()}
