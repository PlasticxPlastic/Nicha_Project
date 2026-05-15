import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_RULES } from './category.js';
import { DEFAULT_ETAXGO_RULES } from './etaxgoCategory.js';

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
      issue_resolution TEXT,
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

    CREATE TABLE IF NOT EXISTS etaxgo_keyword_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      keyword TEXT NOT NULL,
      language TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS project_tracking_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      valid_rows INTEGER NOT NULL,
      skipped_rows INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_tracking_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_key TEXT NOT NULL UNIQUE,
      customer_name TEXT,
      project_name TEXT,
      package_type TEXT,
      user_count INTEGER,
      source_status TEXT,
      stage TEXT,
      kickoff_date TEXT,
      onboarding_date TEXT,
      training_date TEXT,
      golive_date TEXT,
      notes TEXT,
      timeline_info TEXT,
      edited_fields TEXT NOT NULL DEFAULT '[]',
      import_batch_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (import_batch_id) REFERENCES project_tracking_batches(id)
    );

  `);

  const issueColumns = db.prepare('PRAGMA table_info(issues)').all().map((column) => column.name);
  if (!issueColumns.includes('issue_resolution')) {
    db.exec('ALTER TABLE issues ADD COLUMN issue_resolution TEXT');
  }

  const defaults = {
    pending_warning_hours: '36',
    pending_critical_hours: '72',
    solve_warning_hours: '36',
    solve_critical_hours: '72',
    dark_mode: 'false',
    over_days_threshold: '45'
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) insertSetting.run(key, value);

  db.prepare(`
    UPDATE issues
    SET
      venio_category_auto = NULL,
      venio_category_manual = NULL,
      venio_category_final = NULL,
      category_confidence = NULL,
      category_rule = NULL
    WHERE LOWER(TRIM(COALESCE(project_name, ''))) <> 'venio'
      AND UPPER(TRIM(COALESCE(issue_key, ''))) NOT LIKE 'VENIO-%'
      AND LOWER(TRIM(COALESCE(project_name, ''))) <> 'etaxgo'
  `).run();

  const ruleCount = db.prepare('SELECT COUNT(*) AS count FROM category_keyword_rules').get().count;
  if (!ruleCount) {
    const insertRule = db.prepare(`
      INSERT INTO category_keyword_rules (category, keyword, language, weight, active)
      VALUES (?, ?, ?, ?, 1)
    `);
    for (const rule of DEFAULT_RULES) insertRule.run(...rule);
  }

  const etaxgoRuleCount = db.prepare('SELECT COUNT(*) AS count FROM etaxgo_keyword_rules').get().count;
  if (!etaxgoRuleCount) {
    const insertEtaxgoRule = db.prepare(`
      INSERT INTO etaxgo_keyword_rules (category, keyword, language, weight, active)
      VALUES (?, ?, ?, ?, 1)
    `);
    for (const rule of DEFAULT_ETAXGO_RULES) insertEtaxgoRule.run(...rule);
  }

  db.prepare(`
    UPDATE etaxgo_keyword_rules
    SET category = CASE
      WHEN category = 'Failed Status' THEN 'Failed'
      WHEN category = 'Email/Notification' THEN 'Email'
      ELSE category
    END
    WHERE category IN ('Failed Status', 'Email/Notification')
  `).run();

  db.prepare(`
    UPDATE issues
    SET
      venio_category_auto = CASE
        WHEN venio_category_auto = 'Failed Status' THEN 'Failed'
        WHEN venio_category_auto = 'Email/Notification' THEN 'Email'
        ELSE venio_category_auto
      END,
      venio_category_manual = CASE
        WHEN venio_category_manual = 'Failed Status' THEN 'Failed'
        WHEN venio_category_manual = 'Email/Notification' THEN 'Email'
        ELSE venio_category_manual
      END,
      venio_category_final = CASE
        WHEN venio_category_final = 'Failed Status' THEN 'Failed'
        WHEN venio_category_final = 'Email/Notification' THEN 'Email'
        ELSE venio_category_final
      END
    WHERE LOWER(TRIM(COALESCE(project_name, ''))) = 'etaxgo'
      OR UPPER(TRIM(COALESCE(issue_key, ''))) LIKE 'ETAXGO-%'
  `).run();
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

export function getEtaxGoRules() {
  return db.prepare(`
    SELECT id, category, keyword, language, weight, active
    FROM etaxgo_keyword_rules
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

function projectStageFromSourceStatus(sourceStatus) {
  const text = String(sourceStatus ?? '').replace(/^\s*\d+\.\s*/, '').trim().toLowerCase();
  if (!text || text === 'manual') return null;
  if (/\bplanning\b/.test(text)) return 'Kick-off';
  if (/\bimplementation\b|\bimplement\b/.test(text)) return 'Onboarding';
  if (/\btraining\b/.test(text)) return 'Training';
  if (/\bin\s*progress\b|\binprogress\b/.test(text)) return 'GoLive';
  if (/\bwarranty\b/.test(text)) return 'GoLive';
  if (/\bhold\s*projects?\b|\bon\s*hold\b/.test(text)) return 'On Hold';
  return null;
}

export function getProjectTrackingProjects() {
  return db.prepare(`
    SELECT *
    FROM project_tracking_projects
    WHERE source_status IS NULL
      OR source_status = 'Manual'
      OR LOWER(source_status) LIKE '%planning%'
      OR LOWER(source_status) LIKE '%implement%'
      OR LOWER(source_status) LIKE '%training%'
      OR LOWER(source_status) LIKE '%in progress%'
      OR LOWER(source_status) LIKE '%inprogress%'
      OR LOWER(source_status) LIKE '%warranty%'
      OR LOWER(source_status) LIKE '%hold project%'
      OR LOWER(source_status) LIKE '%hold projects%'
      OR LOWER(source_status) LIKE '%on hold%'
    ORDER BY
      CASE stage
        WHEN 'Kick-off' THEN 1
        WHEN 'Onboarding' THEN 2
        WHEN 'Training' THEN 3
        WHEN 'GoLive' THEN 4
        WHEN 'Warranty' THEN 5
        WHEN 'On Hold' THEN 6
        ELSE 7
      END,
      COALESCE(kickoff_date, created_at) DESC,
      customer_name
  `).all().map((project) => ({
    ...project,
    stage: projectStageFromSourceStatus(project.source_status) ?? project.stage
  }));
}

export function getProjectTrackingBatches() {
  return db.prepare('SELECT * FROM project_tracking_batches ORDER BY imported_at DESC').all();
}

export function deleteIssueBatch(batchId) {
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM issues WHERE import_batch_id = ?').run(batchId);
    db.prepare('DELETE FROM import_batches WHERE id = ?').run(batchId);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function deleteCrispBatch(_batchId) {
  // Crisp data is stored client-side only; no server-side Crisp tables exist.
}

export function clearAllIssues() {
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM issue_notes');
    db.exec('DELETE FROM issues');
    db.exec('DELETE FROM import_batches');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
