import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databasePath = path.join(root, 'content', 'locales.sqlite');
const migrationsPath = path.join(root, 'content', 'migrations');
const [command, ...args] = process.argv.slice(2);

function openDatabase() {
  return new DatabaseSync(databasePath);
}

function initialize() {
  const db = openDatabase();
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS schema_migration (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
  const applied = db.prepare('SELECT 1 FROM schema_migration WHERE version = ?');
  const record = db.prepare('INSERT INTO schema_migration(version) VALUES (?)');
  const migrations = readdirSync(migrationsPath).filter((name) => name.endsWith('.sql')).sort();
  for (const version of migrations) {
    if (applied.get(version)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(readFileSync(path.join(migrationsPath, version), 'utf8'));
      record.run(version);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  db.close();
  process.stdout.write(`Localization database ready: ${path.relative(root, databasePath)}\n`);
}

if (command === 'init') {
  initialize();
} else if (command === 'list') {
  const db = openDatabase();
  const rows = db.prepare('SELECT locale, resource_key, value, context FROM locale_resource ORDER BY locale, resource_key').all();
  for (const row of rows) process.stdout.write(`${row.locale}\t${row.resource_key}\t${row.value}\t${row.context}\n`);
  db.close();
} else if (command === 'set') {
  const [locale, resourceKey, ...valueParts] = args;
  if (!locale || !resourceKey || !valueParts.length) {
    throw new Error('Usage: node scripts/locales.mjs set <locale> <key> <value>');
  }
  const db = openDatabase();
  const result = db.prepare(`
    INSERT INTO locale_resource(locale, resource_key, value)
    VALUES (?, ?, ?)
    ON CONFLICT(locale, resource_key) DO UPDATE SET
      value = excluded.value,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).run(locale, resourceKey, valueParts.join(' '));
  process.stdout.write(`Saved ${locale}:${resourceKey} (${result.changes} row changed).\n`);
  db.close();
} else if (command === 'add-locale') {
  const [locale, ...nameParts] = args;
  if (!locale || !nameParts.length) {
    throw new Error('Usage: node scripts/locales.mjs add-locale <locale> <display name>');
  }
  const db = openDatabase();
  db.prepare('INSERT INTO locale_metadata(locale, display_name) VALUES (?, ?) ON CONFLICT(locale) DO NOTHING').run(locale, nameParts.join(' '));
  db.close();
  process.stdout.write(`Registered locale ${locale}. Add its resource rows before building.\n`);
} else if (command === 'sql') {
  const sql = args.join(' ').trim();
  if (!sql) throw new Error('Usage: node scripts/locales.mjs sql "SELECT ..."');
  const db = openDatabase();
  const statement = db.prepare(sql);
  if (/^(SELECT|PRAGMA|EXPLAIN)\b/i.test(sql)) {
    process.stdout.write(`${JSON.stringify(statement.all(), null, 2)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(statement.run(), null, 2)}\n`);
  }
  db.close();
} else {
  process.stderr.write('Commands: init, list, set, add-locale, sql\n');
  process.exitCode = 2;
}
