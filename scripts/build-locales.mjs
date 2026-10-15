import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databasePath = path.join(root, 'content', 'locales.sqlite');
const htmlPath = path.join(root, 'web', 'index.html');
const locale = process.argv.find((arg) => arg.startsWith('--locale='))?.slice('--locale='.length) ?? 'ko';
const html = readFileSync(htmlPath, 'utf8');
const appStart = html.indexOf("<script>\n'use strict';");
if (appStart < 0) throw new Error('Could not find the application script in the HTML file.');

const appEnd = html.indexOf('</script>', appStart);
const appSource = html.slice(appStart, appEnd);
const requiredKeys = [...new Set([...appSource.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]))];

const db = new DatabaseSync(databasePath);
const metadata = db.prepare('SELECT locale, display_name, direction FROM locale_metadata WHERE locale = ?').get(locale);
if (!metadata) throw new Error(`Locale '${locale}' is not registered in ${path.relative(root, databasePath)}.`);

const rows = db.prepare('SELECT resource_key, value FROM locale_resource WHERE locale = ? ORDER BY resource_key').all(locale);
db.close();
const resources = Object.fromEntries(rows.map(({ resource_key, value }) => [resource_key, value]));
const missing = requiredKeys.filter((key) => typeof resources[key] !== 'string');
if (missing.length) throw new Error(`Missing ${locale} resources: ${missing.join(', ')}`);

const safeJson = JSON.stringify({ locale, direction: metadata.direction, resources })
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');
const openTag = '<script id="localeResourcesJSON" type="application/json">';
const closeTag = '</script>';
const payload = `${openTag}${safeJson}${closeTag}\n`;
const existingStart = html.indexOf(openTag);
let output;
if (existingStart >= 0) {
  const existingEnd = html.indexOf(closeTag, existingStart) + closeTag.length;
  output = html.slice(0, existingStart) + payload + html.slice(existingEnd).replace(/^\r?\n/, '');
} else {
  output = html.slice(0, appStart) + payload + html.slice(appStart);
}

if (output !== html) writeFileSync(htmlPath, output, 'utf8');
process.stdout.write(`Embedded ${rows.length} ${locale} resources (${requiredKeys.length} referenced keys) into ${path.basename(htmlPath)}.\n`);
