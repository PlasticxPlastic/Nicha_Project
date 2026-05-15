import { db, getRules, getEtaxGoRules } from './db.js';
import { detectCategory } from './category.js';
import { detectEtaxGoCategory } from './etaxgoCategory.js';
import { parseCsv, validateColumns } from './csv.js';

function emptyToNull(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

function numberOrNull(value) {
  const text = String(value ?? '').replace(/,/g, '').trim();
  if (text === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowValue(row, ...headers) {
  for (const header of headers) {
    const value = emptyToNull(row[header]);
    if (value !== null) return value;
  }
  return null;
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
  const numericDate = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (numericDate) {
    const [, dayText, monthText, yearText, hourText = '0', minuteText = '0', secondText = '0'] = numericDate;
    const year = Number(yearText.length === 2 ? `20${yearText}` : yearText);
    const parsedNumericDate = new Date(
      year,
      Number(monthText) - 1,
      Number(dayText),
      Number(hourText),
      Number(minuteText),
      Number(secondText)
    );
    return Number.isNaN(parsedNumericDate.getTime()) ? null : parsedNumericDate;
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

function statusToCategory(status) {
  const s = String(status ?? '').trim().toLowerCase();
  if (/^done$|^resolved$|^closed$|^complete/.test(s)) return 'Done';
  if (/progress|review|testing/.test(s)) return 'In Progress';
  return 'To Do';
}

function normalizeIssueType(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (normalized === 'production issue' || normalized === 'production issues') return 'Production Issue';
  if (normalized === 'request' || normalized === 'requests') return 'Request';
  if (normalized === 'beauty' || normalized === 'beauties') return 'Beauty';
  return text;
}

function isVenioIssue(issue) {
  return String(issue.project_name ?? '').trim().toLowerCase() === 'venio'
    || String(issue.issue_key ?? '').trim().toUpperCase().startsWith('VENIO-');
}

function isEtaxGoIssue(issue) {
  return String(issue.project_name ?? '').trim().toLowerCase() === 'etaxgo'
    || String(issue.issue_key ?? '').trim().toUpperCase().startsWith('ETAXGO-');
}

function toMappedIssue(row, importedAt = new Date().toISOString()) {
  const reportDate = rowValue(row, 'Report Date');
  const lastUpdatedDate = rowValue(row, 'Last Updated Date', 'Last Updated');
  const resolvedDate = rowValue(row, 'Resolved Date (Proxy)', 'Resolved Date');
  const created = rowValue(row, 'Created');
  const updated = rowValue(row, 'Updated');
  const resolved = rowValue(row, 'Resolved');
  const reportDateSource = reportDate ?? created;
  const resolvedDateSource = resolvedDate ?? resolved;
  const status = rowValue(row, 'Status');
  const issueResolution = rowValue(row, 'Resolution') ?? (resolvedDateSource ? 'Done' : null);
  return {
    summary: rowValue(row, 'Summary'),
    issue_key: rowValue(row, 'Issue key'),
    issue_type: normalizeIssueType(rowValue(row, 'Issue Type')),
    status,
    issue_resolution: issueResolution,
    project_name: rowValue(row, 'Project name'),
    project_type: rowValue(row, 'Project type'),
    priority: rowValue(row, 'Priority'),
    description: rowValue(row, 'Description'),
    customer_code: rowValue(row, 'Custom field (Customer Code)', 'Customer Code'),
    status_category: rowValue(row, 'Status Category') ?? statusToCategory(status),
    report_date: reportDate ?? isoOrNull(created),
    last_updated_date: lastUpdatedDate ?? isoOrNull(updated),
    resolved_date: resolvedDate ?? isoOrNull(resolved),
    time_to_solve_hours: numberOrNull(row['Time to Solve (hrs)']) ?? numberOrNull(row['Time to Solve']) ?? (
      resolvedDateSource ? hoursBetween(reportDateSource, resolvedDateSource) : null
    ),
    pending_age_hours: numberOrNull(row['Pending Age (hrs)']) ?? numberOrNull(row['Pending Age']) ?? (
      resolvedDateSource ? null : hoursBetween(reportDateSource, importedAt)
    )
  };
}

function toIssue(row, importedAt = new Date().toISOString()) {
  return toMappedIssue(row, importedAt);
}

function toRawJiraIssue(row, importedAt = new Date().toISOString()) {
  return toMappedIssue(row, importedAt);
}

function toJiraDirectIssue(row, importedAt = new Date().toISOString()) {
  return toMappedIssue(row, importedAt);
}

function dateRange(issues) {
  const dates = issues.map((issue) => issue.report_date).filter(Boolean).sort();
  return {
    min: dates[0] ?? null,
    max: dates[dates.length - 1] ?? null
  };
}

function importIssues(filename, records, rowToIssue, totalRows, overrideMonth = null) {
  const now = new Date().toISOString();
  const rules = getRules();
  const etaxgoRules = getEtaxGoRules();
  const validIssues = [];
  let skippedRows = 0;

  for (const row of records) {
    const issue = rowToIssue(row, now);
    if (!issue.issue_key) {
      skippedRows += 1;
      continue;
    }
    if (overrideMonth) issue.report_date = `${overrideMonth}-01`;
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
      let detected;
      if (isVenioIssue(issue)) {
        detected = detectCategory(issue, rules);
      } else if (isEtaxGoIssue(issue)) {
        detected = detectEtaxGoCategory(issue, etaxgoRules);
      } else {
        detected = { category: null, confidence: null, rule: null };
      }
      const existing = findExisting.get(issue.issue_key);
      const manualCategory = (isVenioIssue(issue) || isEtaxGoIssue(issue)) ? existing?.venio_category_manual || null : null;
      const finalCategory = (isVenioIssue(issue) || isEtaxGoIssue(issue)) ? manualCategory || detected.category : null;

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

export function importCsvContent(filename, content, overrideMonth = null) {
  const { headers, records } = parseCsv(content);

  // Auto-detect: if CSV has 'Created' but not 'Report Date' → Jira direct export format
  const isJiraDirect = headers.includes('Created') && !headers.includes('Report Date');
  if (isJiraDirect) {
    const required = ['Summary', 'Issue key', 'Issue Type', 'Status', 'Created'];
    const missing = required.filter((col) => !headers.includes(col));
    if (missing.length) {
      return { ok: false, missingColumns: missing, totalRows: records.length };
    }
    return importIssues(filename, records, toJiraDirectIssue, records.length, overrideMonth);
  }

  // Original prepared-CSV format
  const missingColumns = validateColumns(headers);
  if (missingColumns.length) {
    return { ok: false, missingColumns, totalRows: records.length };
  }
  return importIssues(filename, records, toIssue, records.length, overrideMonth);
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
      error: `This file does not match the Jira CSV format required by this workspace. Missing columns: ${missingColumns.join(', ')}`,
      missingColumns,
      totalRows: records.length
    };
  }

  const totalRows = records.length;
  const filteredRecords = records.filter((row) => {
    const issueType = normalizeIssueType(rowValue(row, 'Issue Type'));
    const projectName = String(rowValue(row, 'Project name') ?? '').trim().toLowerCase();
    const issueKey = String(rowValue(row, 'Issue key') ?? '').trim().toUpperCase();
    const isVenio = projectName === 'venio' || issueKey.startsWith('VENIO-');
    const isEtaxGo = projectName === 'etaxgo' || issueKey.startsWith('ETAXGO-');
    const isVenioValidType = isVenio && (issueType === 'Production Issue' || issueType === 'Beauty');
    const isEtaxGoValidType = isEtaxGo && (issueType === 'Production Issue' || issueType === 'Request' || issueType === 'Beauty');
    return isVenioValidType || isEtaxGoValidType;
  });

  return importIssues(filename, filteredRecords, toRawJiraIssue, totalRows);
}
