import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContentRepository } from './content-repository.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = text => createHash('sha256').update(text).digest('hex');
const problem = (message, status = 409) => Object.assign(new Error(message), { status });
function readOptional(filename) {
  try { return readFileSync(filename, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return ''; throw error; }
}

export function createStudyStore(root = defaultRoot, {deferExports=false} = {}) {
  mkdirSync(path.join(root, 'content'), { recursive: true });
  const notesPath = path.join(root, 'notes', 'study-notes.md');
  const db = new DatabaseSync(path.join(root, 'content', 'locales.sqlite'));
  db.exec(`
    PRAGMA busy_timeout = 3000;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS study_note (
      id TEXT PRIMARY KEY, text TEXT NOT NULL, revision TEXT NOT NULL,
      exported_revision TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS study_note_import (
      id TEXT PRIMARY KEY, original_text TEXT NOT NULL, original_hash TEXT NOT NULL,
      imported_at TEXT NOT NULL
    );
  `);
  if (!db.prepare('SELECT 1 FROM study_note WHERE id = ?').get('main')) {
    const text = readOptional(notesPath), revision = hash(text), now = new Date().toISOString();
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('INSERT OR IGNORE INTO study_note_import VALUES (?, ?, ?, ?)').run('main', text, revision, now);
      db.prepare('INSERT OR IGNORE INTO study_note VALUES (?, ?, ?, ?, ?)').run('main', text, revision, revision, now);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); db.close(); throw error; }
  }
  function noteState() {
    const row = db.prepare('SELECT * FROM study_note WHERE id = ?').get('main');
    const fileRevision = hash(readOptional(notesPath));
    return { text: row.text, revision: row.revision, exportPending: row.exported_revision !== row.revision,
      conflict: fileRevision !== row.exported_revision };
  }
  function exportNotes() {
    const row = db.prepare('SELECT * FROM study_note WHERE id = ?').get('main');
    if (hash(readOptional(notesPath)) !== row.exported_revision) throw problem('Markdown 메모가 외부에서 변경되었습니다. DB와 파일을 확인하세요.');
    if (row.exported_revision === row.revision) return;
    mkdirSync(path.dirname(notesPath), { recursive: true });
    writeFileSync(notesPath + '.tmp', row.text, 'utf8');
    renameSync(notesPath + '.tmp', notesPath);
    db.prepare('UPDATE study_note SET exported_revision = ? WHERE id = ?').run(row.revision, 'main');
  }
  // 파일 교체 후 프로세스가 종료된 경우에도 이미 출력된 최신 버전을 인식한다.
  const current = db.prepare('SELECT * FROM study_note WHERE id = ?').get('main');
  if (current.exported_revision !== current.revision && hash(readOptional(notesPath)) === current.revision) {
    db.prepare('UPDATE study_note SET exported_revision = ? WHERE id = ?').run(current.revision, 'main');
  }
  try { exportNotes(); } catch { /* 원본·DB를 보존하고 API 상태로 충돌을 전달한다. */ }
  let content;
  return {
    content() { return content ??= createContentRepository(db, root, noteState, exportNotes, deferExports); },
    readNotes: noteState,
    saveNotes(text, revision) {
      if (typeof text !== 'string' || typeof revision !== 'string') throw problem('메모와 버전이 필요합니다.', 400);
      if (Buffer.byteLength(text, 'utf8') > 2_000_000) throw problem('메모는 2MB 이하로 저장해 주세요.', 413);
      db.exec('BEGIN IMMEDIATE');
      try {
        const previous = noteState();
        if (previous.conflict) throw problem('Markdown 메모가 외부에서 변경되었습니다. DB와 파일을 확인하세요.');
        if (previous.revision !== revision) throw problem('다른 창에서 메모가 변경되었습니다. 새로고침 후 확인하세요.');
        db.prepare('UPDATE study_note SET text = ?, revision = ?, updated_at = ? WHERE id = ?')
          .run(text, hash(text), new Date().toISOString(), 'main');
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      let exportError;
      try { exportNotes(); } catch (error) { exportError = error.message; }
      return { ...noteState(), ...(exportError ? { exportError } : {}) };
    },
    close() { db.close(); }
  };
}
