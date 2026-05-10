import { db, getRules } from './db.js';
import { detectCategory } from './category.js';
import { parseCsv, validateColumns } from './csv.js';

function emptyToNull(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

function numberOrNull(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function toIssue(row) {
  return {
    summary: emptyToNull(row.Summary),
    issue_key: emptyToNull(row['Issue key']),
    issue_type: emptyToNull(row['Issue Type']),
    status: emptyToNull(row.Status),
    project_name: emptyToNull(row['Project name']),
    project_type: emptyToNull(row['Project type']),
    priority: emptyToNull(row.Priority),
    description: emptyToNull(row.Description),
    customer_code: emptyToNull(row['Custom field (Customer Code)']),
    status_category: emptyToNull(row['Status Category']) ?? 'Other',
    report_date: emptyToNull(row['Report Date']),
    last_updated_date: emptyToNull(row['Last Updated Date']),
    resolved_date: emptyToNull(row['Resolved Date (Proxy)']),
    time_to_solve_hours: numberOrNull(row['Time to Solve (hrs)']),
    pending_age_hours: numberOrNull(row['Pending Age (hrs)'])
  };
}

function dateRange(issues) {
  const dates = issues.map((issue) => issue.report_date).filter(Boolean).sort();
  return {
    min: dates[0] ?? null,
    max: dates[dates.length - 1] ?? null
  };
}

export function importCsvContent(filename, content) {
  const { headers, records } = parseCsv(content);
  const missingColumns = validateColumns(headers);
  if (missingColumns.length) {
    return {
      ok: false,
      missingColumns,
      totalRows: records.length
    };
  }

  const now = new Date().toISOString();
  const rules = getRules();
  const validIssues = [];
  let skippedRows = 0;

  for (const row of records) {
    const issue = toIssue(row);
    if (!issue.issue_key) {
      skippedRows += 1;
      continue;
    }
    validIssues.push(issue);
  }

  const duplicateCount = validIssues.length - new Set(validIssues.map((issue) => issue.issue_key)).size;
  const range = dateRange(validIssues);

  let batchId;
  try {
    db.exec('BEGIN');
    const batch = db.prepare(`
      INSERT INTO import_batches
        (filename, imported_at, total_rows, valid_rows, skipped_rows, duplicate_count, min_report_date, max_report_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(filename, now, records.length, validIssues.length, skippedRows, duplicateCount, range.min, range.max);

    const findExisting = db.prepare('SELECT id, venio_category_manual FROM issues WHERE issue_key = ?');
    const insertIssue = db.prepare(`
      INSERT INTO issues (
        issue_key, summary, issue_type, status, status_category, project_name, project_type, priority,
        description, customer_code, report_date, last_updated_date, resolved_date, time_to_solve_hours,
        pending_age_hours, venio_category_auto, venio_category_manual, venio_category_final,
        category_confidence, category_rule, import_batch_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateIssue = db.prepare(`
      UPDATE issues SET
        summary = ?, issue_type = ?, status = ?, status_category = ?, project_name = ?, project_type = ?,
        priority = ?, description = ?, customer_code = ?, report_date = ?, last_updated_date = ?,
        resolved_date = ?, time_to_solve_hours = ?, pending_age_hours = ?, venio_category_auto = ?,
        venio_category_final = ?, category_confidence = ?, category_rule = ?, import_batch_id = ?, updated_at = ?
      WHERE issue_key = ?
    `);

    for (const issue of validIssues) {
      const detected = detectCategory(issue, rules);
      const existing = findExisting.get(issue.issue_key);
      const finalCategory = existing?.venio_category_manual || detected.category;

      if (existing) {
        updateIssue.run(
          issue.summary,
          issue.issue_type,
          issue.status,
          issue.status_category,
          issue.project_name,
          issue.project_type,
          issue.priority,
          issue.description,
          issue.customer_code,
          issue.report_date,
          issue.last_updated_date,
          issue.resolved_date,
          issue.time_to_solve_hours,
          issue.pending_age_hours,
          detected.category,
          finalCategory,
          detected.confidence,
          detected.rule,
          batch.lastInsertRowid,
          now,
          issue.issue_key
        );
      } else {
        insertIssue.run(
          issue.issue_key,
          issue.summary,
          issue.issue_type,
          issue.status,
          issue.status_category,
          issue.project_name,
          issue.project_type,
          issue.priority,
          issue.description,
          issue.customer_code,
          issue.report_date,
          issue.last_updated_date,
          issue.resolved_date,
          issue.time_to_solve_hours,
          issue.pending_age_hours,
          detected.category,
          null,
          finalCategory,
          detected.confidence,
          detected.rule,
          batch.lastInsertRowid,
          now,
          now
        );
      }
    }
    batchId = batch.lastInsertRowid;
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return {
    ok: true,
    batchId,
    totalRows: records.length,
    validRows: validIssues.length,
    skippedRows,
    duplicateCount,
    importedAt: now,
    minReportDate: range.min,
    maxReportDate: range.max
  };
}
