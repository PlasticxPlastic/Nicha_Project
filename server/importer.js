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

function dateOrNull(value) {
  if (!value) return null;
  const text = String(value).trim();
  const jiraDate = text.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (jiraDate) {
    const [, day, monthText, yearText, hourText, minuteText, meridiem] = jiraDate;
    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(monthText.toLowerCase());
    const year = Number(yearText.length === 2 ? `20${yearText}` : yearText);
    let hour = Number(hourText) % 12;
    if (meridiem.toUpperCase() === 'PM') hour += 12;
    const parsedJiraDate = new Date(year, month, Number(day), hour, Number(minuteText));
    return Number.isNaN(parsedJiraDate.getTime()) ? null : parsedJiraDate;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoOrNull(value) {
  return dateOrNull(value)?.toISOString() ?? null;
}

function hoursBetween(startValue, endValue) {
  const start = dateOrNull(startValue);
  const end = dateOrNull(endValue);
  if (!start || !end || end < start) return null;
  return Number(((end.getTime() - start.getTime()) / 36e5).toFixed(1));
}

function isVenioIssue(issue) {
  return String(issue.project_name ?? '').trim().toLowerCase() === 'venio'
    || String(issue.issue_key ?? '').trim().toUpperCase().startsWith('VENIO-');
}

function toIssue(row) {
  return {
    summary: emptyToNull(row.Summary),
    issue_key: emptyToNull(row['Issue key']),
    issue_type: emptyToNull(row['Issue Type']),
    status: emptyToNull(row.Status),
    issue_resolution: emptyToNull(row.Resolution),
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

function toRawJiraIssue(row, importedAt = new Date().toISOString()) {
  const created = emptyToNull(row.Created);
  const updated = emptyToNull(row.Updated);
  const resolved = emptyToNull(row.Resolved);
  return {
    summary: emptyToNull(row.Summary),
    issue_key: emptyToNull(row['Issue key']),
    issue_type: emptyToNull(row['Issue Type']),
    status: emptyToNull(row.Status),
    issue_resolution: emptyToNull(row.Resolution),
    project_name: emptyToNull(row['Project name']),
    project_type: emptyToNull(row['Project type']),
    priority: emptyToNull(row.Priority),
    description: emptyToNull(row.Description),
    customer_code: emptyToNull(row['Custom field (Customer Code)']),
    status_category: emptyToNull(row['Status Category']) ?? 'Other',
    report_date: isoOrNull(created),
    last_updated_date: isoOrNull(updated),
    resolved_date: isoOrNull(resolved),
    time_to_solve_hours: resolved ? hoursBetween(created, resolved) : null,
    pending_age_hours: resolved ? null : hoursBetween(created, importedAt)
  };
}

function dateRange(issues) {
  const dates = issues.map((issue) => issue.report_date).filter(Boolean).sort();
  return {
    min: dates[0] ?? null,
    max: dates[dates.length - 1] ?? null
  };
}

function importIssues(filename, records, rowToIssue, totalRows) {
  const now = new Date().toISOString();
  const rules = getRules();
  const validIssues = [];
  let skippedRows = 0;

  for (const row of records) {
    const issue = rowToIssue(row, now);
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
    `).run(filename, now, totalRows, validIssues.length, skippedRows, duplicateCount, range.min, range.max);

    const findExisting = db.prepare('SELECT id, venio_category_manual FROM issues WHERE issue_key = ?');
    const insertIssue = db.prepare(`
      INSERT INTO issues (
        issue_key, summary, issue_type, status, issue_resolution, status_category, project_name, project_type, priority,
        description, customer_code, report_date, last_updated_date, resolved_date, time_to_solve_hours,
        pending_age_hours, venio_category_auto, venio_category_manual, venio_category_final,
        category_confidence, category_rule, import_batch_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateIssue = db.prepare(`
      UPDATE issues SET
        summary = ?, issue_type = ?, status = ?, issue_resolution = ?, status_category = ?, project_name = ?, project_type = ?,
        priority = ?, description = ?, customer_code = ?, report_date = ?, last_updated_date = ?,
        resolved_date = ?, time_to_solve_hours = ?, pending_age_hours = ?, venio_category_auto = ?,
        venio_category_manual = ?, venio_category_final = ?, category_confidence = ?, category_rule = ?,
        import_batch_id = ?, updated_at = ?
      WHERE issue_key = ?
    `);

    for (const issue of validIssues) {
      const detected = isVenioIssue(issue)
        ? detectCategory(issue, rules)
        : { category: null, confidence: null, rule: null };
      const existing = findExisting.get(issue.issue_key);
      const manualCategory = isVenioIssue(issue) ? existing?.venio_category_manual || null : null;
      const finalCategory = isVenioIssue(issue) ? manualCategory || detected.category : null;

      if (existing) {
        updateIssue.run(
          issue.summary,
          issue.issue_type,
          issue.status,
          issue.issue_resolution,
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
          manualCategory,
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
          issue.issue_resolution,
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
    totalRows,
    validRows: validIssues.length,
    skippedRows,
    duplicateCount,
    importedAt: now,
    minReportDate: range.min,
    maxReportDate: range.max
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

  return importIssues(filename, records, toIssue, records.length);
}

export function importJiraCsvContent(filename, content) {
  const { headers, records } = parseCsv(content);
  const required = [
    'Summary',
    'Issue key',
    'Issue Type',
    'Status',
    'Project name',
    'Project type',
    'Priority',
    'Description',
    'Custom field (Customer Code)',
    'Status Category',
    'Created',
    'Updated',
    'Resolved'
  ];
  const missingColumns = required.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    return {
      ok: false,
      missingColumns,
      totalRows: records.length
    };
  }

  return importIssues(filename, records, toRawJiraIssue, records.length);
}
