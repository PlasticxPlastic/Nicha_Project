import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_RULES } from './category.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataDir = join(root, 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, 'venio.sqlite'));

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      valid_rows INTEGER NOT NULL,
      skipped_rows INTEGER NOT NULL,
      duplicate_count INTEGER NOT NULL,
      min_report_date TEXT,
      max_report_date TEXT
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_key TEXT NOT NULL UNIQUE,
      summary TEXT,
      issue_type TEXT,
      status TEXT,
      status_category TEXT,
      project_name TEXT,
      project_type TEXT,
      priority TEXT,
      description TEXT,
      customer_code TEXT,
      report_date TEXT,
      last_updated_date TEXT,
      resolved_date TEXT,
      time_to_solve_hours REAL,
      pending_age_hours REAL,
      venio_category_auto TEXT,
      venio_category_manual TEXT,
      venio_category_final TEXT,
      category_confidence TEXT,
      category_rule TEXT,
      import_batch_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (import_batch_id) REFERENCES import_batches(id)
    );

    CREATE TABLE IF NOT EXISTS issue_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (issue_id) REFERENCES issues(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS category_keyword_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      keyword TEXT NOT NULL,
      language TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);

  const defaults = {
    pending_warning_hours: '36',
    pending_critical_hours: '72',
    solve_warning_hours: '36',
    solve_critical_hours: '72',
    dark_mode: 'false'
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) insertSetting.run(key, value);

  const ruleCount = db.prepare('SELECT COUNT(*) AS count FROM category_keyword_rules').get().count;
  if (!ruleCount) {
    const insertRule = db.prepare(`
      INSERT INTO category_keyword_rules (category, keyword, language, weight, active)
      VALUES (?, ?, ?, ?, 1)
    `);
    for (const rule of DEFAULT_RULES) insertRule.run(...rule);
  }
}

export function getSettings() {
  return Object.fromEntries(
    db.prepare('SELECT key, value FROM settings ORDER BY key').all().map((row) => [row.key, row.value])
  );
}

export function getRules() {
  return db.prepare(`
    SELECT id, category, keyword, language, weight, active
    FROM category_keyword_rules
    ORDER BY category, weight DESC, keyword
  `).all().map((row) => ({ ...row, active: Boolean(row.active) }));
}

export function getIssues() {
  const issues = db.prepare(`
    SELECT *
    FROM issues
    ORDER BY COALESCE(report_date, created_at) DESC, id DESC
  `).all();

  const notes = db.prepare('SELECT * FROM issue_notes ORDER BY created_at DESC').all();
  const byIssue = new Map();
  for (const note of notes) {
    if (!byIssue.has(note.issue_id)) byIssue.set(note.issue_id, []);
    byIssue.get(note.issue_id).push(note);
  }

  return issues.map((issue) => ({
    ...issue,
    notes: byIssue.get(issue.id) ?? []
  }));
}

export function getBatches() {
  return db.prepare('SELECT * FROM import_batches ORDER BY imported_at DESC').all();
}
