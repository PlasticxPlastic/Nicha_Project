// api.js — all storage, fetch, and CSV import functions

import state from './state.js';
import {
  STORAGE_KEY, AUTH_TOKEN_KEY, AUTH_USER_KEY, AUTH_USERS_KEY,
  defaultRules, requiredColumns, jiraRequiredColumns,
  crispRequiredColumns, crispColumnLabels, crispColumnAliases
} from './state.js';
import { norm, number, slug, formatDurationSeconds, dateValue, isoDate, numberOrNull, emptyToNull, isoOrNull, hoursBetween, projectNameKey, currentMonthKey } from './utils.js';
import { isVenioIssue, crispMetrics, projectMissingFields } from './data.js';

// ---- Auth helpers ----

export function storedAuthUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function loadClientUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveClientUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

export function clientTokenForUser(user) {
  return btoa(`${user.id}:${user.username}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

// ---- Storage helpers ----

export function currentStorageKey() {
  return state.auth.user?.username
    ? `${STORAGE_KEY}:user:${state.auth.user.username}`
    : STORAGE_KEY;
}

export function maxId(items) {
  return Math.max(0, ...(items ?? []).map((item) => Number(item.id) || 0));
}

export function createDefaultStore(seed = {}) {
  const issues = seed.issues ?? [];
  const batches = seed.batches ?? [];
  const projectTrackingProjects = seed.projectTrackingProjects ?? [];
  const projectTrackingBatches = seed.projectTrackingBatches ?? [];
  const rules = seed.rules ?? defaultRules.map((rule, index) => ({
    id: index + 1,
    category: rule[0],
    keyword: rule[1],
    language: rule[2],
    weight: rule[3],
    active: true
  }));
  return {
    issues,
    batches,
    projectTrackingProjects,
    projectTrackingBatches,
    crispOperators: seed.crispOperators ?? [],
    crispBatches: seed.crispBatches ?? [],
    crispMonths: seed.crispMonths ?? [],
    settings: {
      pending_warning_hours: '36',
      pending_critical_hours: '72',
      solve_warning_hours: '36',
      solve_critical_hours: '72',
      dark_mode: 'false',
      ...(seed.settings ?? {})
    },
    rules,
    nextIssueId: maxId(issues) + 1,
    nextBatchId: maxId(batches) + 1,
    nextNoteId: 1,
    nextRuleId: maxId(rules) + 1,
    nextProjectId: maxId(projectTrackingProjects) + 1,
    nextProjectBatchId: maxId(projectTrackingBatches) + 1,
    nextCrispBatchId: maxId(seed.crispBatches ?? []) + 1
  };
}

export function loadClientStore(seed = {}) {
  try {
    const stored = JSON.parse(localStorage.getItem(currentStorageKey()) || 'null');
    return stored ? { ...createDefaultStore(seed), ...stored } : createDefaultStore(seed);
  } catch {
    return createDefaultStore(seed);
  }
}

export function readStoredClientStore() {
  try {
    return JSON.parse(localStorage.getItem(currentStorageKey()) || 'null');
  } catch {
    return null;
  }
}

export function hasWorkspaceContent(store) {
  return Boolean(
    store
    && (
      (store.issues ?? []).length
      || (store.batches ?? []).length
      || (store.projectTrackingProjects ?? []).length
      || (store.projectTrackingBatches ?? []).length
      || (store.crispMonths ?? []).length
      || (store.crispOperators ?? []).length
      || (store.crispBatches ?? []).length
    )
  );
}

export async function saveRemoteStore(store) {
  if (!state.auth.token) return;
  try {
    await fetch('/api/user-store', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.auth.token}`
      },
      body: JSON.stringify({ data: store })
    });
  } catch {
    // Browser storage remains the local draft if the network is unavailable.
  }
}

export function saveClientStore(store) {
  localStorage.setItem(currentStorageKey(), JSON.stringify(store));
  void saveRemoteStore(store);
}

// ---- Crisp normalization ----

export function normalizeCrispMonthEntry(entry) {
  if (!entry?.month) return null;
  const operators = Array.isArray(entry.operators)
    ? entry.operators.map((operator) => {
      const firstResponseMedianSeconds = Number(operator.firstResponseMedianSeconds) || 0;
      const resolutionMedianSeconds = Number(operator.resolutionMedianSeconds) || 0;
      const firstResponseAverageSeconds = Number(operator.firstResponseAverageSeconds) || 0;
      const resolutionAverageSeconds = Number(operator.resolutionAverageSeconds) || 0;
      return {
        ...operator,
        firstResponseMedianText: formatDurationSeconds(firstResponseMedianSeconds),
        resolutionMedianText: formatDurationSeconds(resolutionMedianSeconds),
        firstResponseAverageText: formatDurationSeconds(firstResponseAverageSeconds),
        resolutionAverageText: formatDurationSeconds(resolutionAverageSeconds)
      };
    })
    : [];
  const m = crispMetrics(operators);
  return {
    month: entry.month,
    filename: entry.filename ?? '',
    imported_at: entry.imported_at ?? new Date().toISOString(),
    total_rows: Number(entry.total_rows ?? operators.length),
    valid_rows: Number(entry.valid_rows ?? operators.length),
    skipped_rows: Number(entry.skipped_rows ?? 0),
    operators,
    total_conversations: m.totalConversations,
    avg_rating: m.avgRating,
    avg_response_seconds: m.avgResponseSeconds,
    avg_resolution_seconds: m.avgResolutionSeconds
  };
}

export function migrateCrispMonths(store) {
  const months = (store.crispMonths ?? []).map(normalizeCrispMonthEntry).filter(Boolean);
  if (!months.length && (store.crispOperators ?? []).length) {
    const latestBatch = (store.crispBatches ?? [])[0];
    const importedAt = latestBatch?.imported_at ?? new Date().toISOString();
    const month = latestBatch?.month ?? String(importedAt).slice(0, 7);
    months.push(normalizeCrispMonthEntry({
      month,
      filename: latestBatch?.filename ?? 'Legacy Crisp import',
      imported_at: importedAt,
      total_rows: latestBatch?.total_rows ?? store.crispOperators.length,
      valid_rows: latestBatch?.valid_rows ?? store.crispOperators.length,
      skipped_rows: latestBatch?.skipped_rows ?? 0,
      operators: store.crispOperators
    }));
  }
  store.crispMonths = months.sort((a, b) => b.month.localeCompare(a.month));
  const activeMonth = store.crispMonths[0];
  store.crispOperators = activeMonth?.operators ?? [];
  return store.crispMonths;
}

// ---- Project normalization ----

export function normalizeProjectSalesStageStatus(value) {
  const text = norm(value).replace(/^\s*\d+\.\s*/, '').toLowerCase();
  if (!text) return '';
  const mappings = [
    { pattern: /\bplanning\b/, stage: 'Kick-off' },
    { pattern: /\bimplementation\b|\bimplement\b/, stage: 'Onboarding' },
    { pattern: /\btraining\b/, stage: 'Training' },
    { pattern: /\bin\s*progress\b|\binprogress\b/, stage: 'GoLive' },
    { pattern: /\bwarranty\b/, stage: 'GoLive' },
    { pattern: /\bhold\s*projects?\b|\bon\s*hold\b/, stage: 'On Hold' }
  ];
  return mappings.find(({ pattern }) => pattern.test(text))?.stage ?? '';
}

export function normalizeProjectImportRecord(project) {
  const sourceStatus = norm(project?.source_status);
  if (!sourceStatus || sourceStatus === 'Manual') return project;
  const stage = normalizeProjectSalesStageStatus(sourceStatus);
  return stage ? { ...project, stage } : null;
}

export function normalizeProjectImportReview(review) {
  if (!review) return null;
  const originalProjects = review.projects ?? [];
  const projects = originalProjects
    .map(normalizeProjectImportRecord)
    .filter(Boolean)
    .map((project) => {
      const missing_fields = projectMissingFields(project);
      return { ...project, missing_fields, needs_review: missing_fields.length > 0 };
    });
  return {
    ...review,
    projects,
    validRows: projects.length,
    skippedRows: Number(review.skippedRows ?? 0) + originalProjects.length - projects.length,
    needsReview: projects.filter((project) => project.needs_review).length
  };
}

// ---- Category detection ----

export function detectClientCategory(issue, rules) {
  if (!isVenioIssue(issue)) {
    return { category: null, confidence: null, rule: null };
  }
  const text = `${issue.summary ?? ''} ${issue.description ?? ''}`.toLowerCase();
  const matches = new Map();

  for (const rule of rules.filter((item) => item.active)) {
    const keyword = String(rule.keyword ?? '').toLowerCase();
    if (!keyword) continue;
    if (text.includes(keyword)) {
      matches.set(rule.category, (matches.get(rule.category) ?? 0) + Number(rule.weight ?? 1));
    }
  }

  if (!matches.size) {
    return { category: 'Uncategorized', confidence: 'Uncategorized', rule: 'No matching rule' };
  }

  const sorted = [...matches.entries()].sort((a, b) => b[1] - a[1]);
  const [category, score] = sorted[0];
  const secondScore = sorted[1]?.[1] ?? 0;
  const confidence = score >= 10 && score >= secondScore + 5 ? 'High' : score >= 8 ? 'Medium' : 'Low';
  return { category, confidence, rule: `${category} keyword score ${score}` };
}

// ---- Bootstrap / hydration ----

export function clientBootstrap(store = loadClientStore()) {
  store.issues = (store.issues ?? []).map((issue) => isVenioIssue(issue)
    ? issue
    : {
      ...issue,
      venio_category_auto: null,
      venio_category_manual: null,
      venio_category_final: null,
      category_confidence: null,
      category_rule: null
    });
  store.projectTrackingProjects = (store.projectTrackingProjects ?? [])
    .map(normalizeProjectImportRecord)
    .filter(Boolean);
  migrateCrispMonths(store);
  saveClientStore(store);
  return {
    issues: store.issues ?? [],
    batches: store.batches ?? [],
    projectTrackingProjects: store.projectTrackingProjects ?? [],
    projectTrackingBatches: store.projectTrackingBatches ?? [],
    crispOperators: store.crispOperators ?? [],
    crispBatches: store.crispBatches ?? [],
    crispMonths: store.crispMonths ?? [],
    settings: store.settings ?? {},
    rules: store.rules ?? []
  };
}

// ---- CSV parsing ----

export function parseCsvText(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value !== '')) rows.push(row);
  }

  const headers = (rows[0] ?? []).map((header) => header.replace(/^﻿/, '').trim());
  const records = rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  return { headers, records };
}

// ---- Issue normalization ----

export function rowValue(row, ...headers) {
  for (const header of headers) {
    const value = emptyToNull(row[header]);
    if (value !== null) return value;
  }
  return null;
}

export function normalizeIssueType(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (normalized === 'production issue' || normalized === 'production issues') return 'Production Issue';
  if (normalized === 'request' || normalized === 'requests') return 'Request';
  if (normalized === 'beauty' || normalized === 'beauties') return 'Beauty';
  return text;
}

export function statusToCategory(status) {
  const value = String(status ?? '').trim().toLowerCase();
  if (/^done$|^resolved$|^closed$|^complete/.test(value)) return 'Done';
  if (/progress|review|testing/.test(value)) return 'In Progress';
  return 'To Do';
}

export function isSupportedJiraRow(row) {
  const issueType = normalizeIssueType(rowValue(row, 'Issue Type'));
  const projectName = String(rowValue(row, 'Project name') ?? '').trim().toLowerCase();
  const issueKey = String(rowValue(row, 'Issue key') ?? '').trim().toUpperCase();
  const isVenio = projectName === 'venio' || issueKey.startsWith('VENIO-');
  const isEtaxGo = projectName === 'etaxgo' || issueKey.startsWith('ETAXGO-');
  const isVenioValidType = isVenio && (issueType === 'Production Issue' || issueType === 'Beauty');
  const isEtaxGoValidType = isEtaxGo && (issueType === 'Production Issue' || issueType === 'Request' || issueType === 'Beauty');
  return isVenioValidType || isEtaxGoValidType;
}

export function normalizedIssueFromRow(row, importedAt = new Date().toISOString()) {
  return jiraIssueFromRow(row, importedAt);
}

export function jiraIssueFromRow(row, importedAt = new Date().toISOString()) {
  const reportDate = rowValue(row, 'Report Date');
  const lastUpdatedDate = rowValue(row, 'Last Updated Date', 'Last Updated');
  const resolvedDate = rowValue(row, 'Resolved Date (Proxy)', 'Resolved Date');
  const created = rowValue(row, 'Created');
  const updated = rowValue(row, 'Updated');
  const resolved = rowValue(row, 'Resolved');
  const reportDateSource = reportDate ?? created;
  const resolvedDateSource = resolvedDate ?? resolved;
  const status = rowValue(row, 'Status');
  return {
    summary: rowValue(row, 'Summary'),
    issue_key: rowValue(row, 'Issue key'),
    issue_type: normalizeIssueType(rowValue(row, 'Issue Type')),
    status,
    issue_resolution: rowValue(row, 'Resolution') ?? (resolvedDateSource ? 'Done' : null),
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

// ---- CSV Import ----

export function importClientCsv(filename, content, format = 'normalized') {
  const store = loadClientStore();
  const { headers, records } = parseCsvText(content);
  const isJiraDirect = format !== 'jira' && headers.includes('Created') && !headers.includes('Report Date');
  const required = isJiraDirect
    ? ['Summary', 'Issue key', 'Issue Type', 'Status', 'Created']
    : format === 'jira'
      ? jiraRequiredColumns
      : requiredColumns;
  const missingColumns = required.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    const error = new Error(`Missing columns: ${missingColumns.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const sourceRecords = format === 'jira' ? records.filter(isSupportedJiraRow) : records;
  const validIssues = [];
  let skippedRows = 0;

  for (const row of sourceRecords) {
    const issue = format === 'jira' || isJiraDirect
      ? jiraIssueFromRow(row, now)
      : normalizedIssueFromRow(row, now);
    if (!issue.issue_key) {
      skippedRows += 1;
    } else {
      validIssues.push(issue);
    }
  }

  const duplicateCount = validIssues.length - new Set(validIssues.map((issue) => issue.issue_key)).size;
  const reportDates = validIssues.map((issue) => issue.report_date).filter(Boolean).sort();
  const batch = {
    id: store.nextBatchId++,
    filename,
    imported_at: now,
    total_rows: records.length,
    valid_rows: validIssues.length,
    skipped_rows: skippedRows,
    duplicate_count: duplicateCount,
    min_report_date: reportDates[0] ?? null,
    max_report_date: reportDates[reportDates.length - 1] ?? null
  };
  const existingByKey = new Map(store.issues.map((issue) => [issue.issue_key, issue]));

  for (const incoming of validIssues) {
    const existing = existingByKey.get(incoming.issue_key);
    const detected = detectClientCategory(incoming, store.rules);
    const manual = isVenioIssue(incoming) ? existing?.venio_category_manual ?? null : null;
    const nextIssue = {
      ...(existing ?? { id: store.nextIssueId++, notes: [], created_at: now }),
      ...incoming,
      venio_category_auto: detected.category,
      venio_category_manual: manual,
      venio_category_final: isVenioIssue(incoming) ? manual || detected.category : null,
      category_confidence: detected.confidence,
      category_rule: detected.rule,
      import_batch_id: batch.id,
      updated_at: now
    };
    existingByKey.set(incoming.issue_key, nextIssue);
  }

  store.issues = [...existingByKey.values()].sort((a, b) => (dateValue(b.report_date)?.getTime() ?? 0) - (dateValue(a.report_date)?.getTime() ?? 0));
  store.batches = [batch, ...store.batches];
  saveClientStore(store);

  return {
    ok: true,
    batchId: batch.id,
    totalRows: records.length,
    validRows: validIssues.length,
    skippedRows,
    duplicateCount,
    importedAt: now,
    ...clientBootstrap(store)
  };
}

// ---- Crisp CSV parsing ----

export function crispSeconds(rawValue, displayValue) {
  const raw = Number(String(rawValue ?? '').replace(/,/g, '').trim());
  if (Number.isFinite(raw)) return raw;
  const text = norm(displayValue).toLowerCase();
  if (!text) return 0;
  let total = 0;
  const hour = text.match(/(\d+(?:\.\d+)?)\s*(?:h|ช)/);
  const minute = text.match(/(\d+(?:\.\d+)?)\s*(?:m|น)/);
  const second = text.match(/(\d+(?:\.\d+)?)\s*(?:s|ว)/);
  if (hour) total += Number(hour[1]) * 3600;
  if (minute) total += Number(minute[1]) * 60;
  if (second) total += Number(second[1]);
  return Number.isFinite(total) ? total : 0;
}

export function crispInteger(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

export function crispHeaderKey(value) {
  return norm(value).replace(/^﻿/, '').toLowerCase().replace(/\s+/g, '');
}

export function crispRowValue(row, field) {
  const aliases = crispColumnAliases[field] ?? [field];
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, alias)) return row[alias];
  }
  const entries = Object.entries(row);
  const aliasKeys = aliases.map(crispHeaderKey);
  return entries.find(([header]) => aliasKeys.includes(crispHeaderKey(header)))?.[1];
}

export function hasCrispColumn(headers, field) {
  const headerKeys = headers.map(crispHeaderKey);
  return (crispColumnAliases[field] ?? [field]).some((alias) => headerKeys.includes(crispHeaderKey(alias)));
}

export function crispOperatorFromRow(row) {
  const operator = emptyToNull(crispRowValue(row, 'operator'));
  if (!operator) return null;
  const conversations = crispInteger(crispRowValue(row, 'conversations'));
  const firstResponseMedianSeconds = crispSeconds(crispRowValue(row, 'firstResponseMedianSeconds'), crispRowValue(row, 'firstResponseMedian'));
  const resolutionMedianSeconds = crispSeconds(crispRowValue(row, 'resolutionMedianSeconds'), crispRowValue(row, 'resolutionMedian'));
  const firstResponseAverageSeconds = crispSeconds(crispRowValue(row, 'firstResponseAverageSeconds'), crispRowValue(row, 'firstResponseAverage'));
  const resolutionAverageSeconds = crispSeconds(crispRowValue(row, 'resolutionAverageSeconds'), crispRowValue(row, 'resolutionAverage'));
  return {
    id: emptyToNull(crispRowValue(row, 'operatorId')) ?? slug(operator),
    operator,
    avatar: emptyToNull(crispRowValue(row, 'avatar')),
    conversations,
    rating: numberOrNull(crispRowValue(row, 'rating')) ?? 0,
    firstResponseMedianText: formatDurationSeconds(firstResponseMedianSeconds),
    firstResponseMedianSeconds,
    resolutionMedianText: formatDurationSeconds(resolutionMedianSeconds),
    resolutionMedianSeconds,
    firstResponseAverageText: formatDurationSeconds(firstResponseAverageSeconds),
    firstResponseAverageSeconds,
    resolutionAverageText: formatDurationSeconds(resolutionAverageSeconds),
    resolutionAverageSeconds
  };
}

export function importClientCrispCsv(filename, content, month = currentMonthKey()) {
  const importMonth = norm(month);
  if (!/^\d{4}-\d{2}$/.test(importMonth)) throw new Error('Choose a valid import month.');
  const store = loadClientStore();
  const { headers, records } = parseCsvText(content);
  const missingColumns = crispRequiredColumns
    .filter((column) => !hasCrispColumn(headers, column))
    .map((column) => crispColumnLabels[column] ?? column);
  if (missingColumns.length) {
    const error = new Error(`Missing columns: ${missingColumns.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const operators = [];
  let skippedRows = 0;
  for (const record of records) {
    const operator = crispOperatorFromRow(record);
    if (!operator) {
      skippedRows += 1;
      continue;
    }
    operators.push(operator);
  }

  const now = new Date().toISOString();
  const m = crispMetrics(operators);
  const batch = {
    id: store.nextCrispBatchId++,
    month: importMonth,
    filename,
    imported_at: now,
    total_rows: records.length,
    valid_rows: operators.length,
    skipped_rows: skippedRows,
    total_conversations: m.totalConversations,
    avg_rating: m.avgRating,
    avg_response_seconds: m.avgResponseSeconds,
    avg_resolution_seconds: m.avgResolutionSeconds
  };

  const monthEntry = normalizeCrispMonthEntry({
    month: importMonth,
    filename,
    imported_at: now,
    total_rows: records.length,
    valid_rows: operators.length,
    skipped_rows: skippedRows,
    operators
  });
  store.crispMonths = [
    monthEntry,
    ...(store.crispMonths ?? []).filter((entry) => entry.month !== importMonth)
  ].filter(Boolean).sort((a, b) => b.month.localeCompare(a.month));
  store.crispOperators = operators;
  store.crispBatches = [batch, ...(store.crispBatches ?? [])];
  saveClientStore(store);

  return {
    ok: true,
    batchId: batch.id,
    totalRows: records.length,
    validRows: operators.length,
    skippedRows,
    importedAt: now,
    ...clientBootstrap(store)
  };
}

// ---- Client-side XLSX parser (browser-native, no Node.js deps) ----

function _xlsxU32LE(view, offset) { return view.getUint32(offset, true); }
function _xlsxU16LE(view, offset) { return view.getUint16(offset, true); }

async function _xlsxInflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(bytes);
  writer.close();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) { out.set(chunk, pos); pos += chunk.length; }
  return out;
}

async function _xlsxUnzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dec = new TextDecoder('utf-8');
  let endOffset = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (_xlsxU32LE(view, i) === 0x06054b50) { endOffset = i; break; }
  }
  if (endOffset < 0) throw new Error('Invalid XLSX file.');
  const entryCount = _xlsxU16LE(view, endOffset + 10);
  const dirOffset = _xlsxU32LE(view, endOffset + 16);
  const entries = new Map();
  let offset = dirOffset;
  for (let i = 0; i < entryCount; i++) {
    if (_xlsxU32LE(view, offset) !== 0x02014b50) throw new Error('Invalid XLSX directory.');
    const method = _xlsxU16LE(view, offset + 10);
    const compressedSize = _xlsxU32LE(view, offset + 20);
    const fileNameLength = _xlsxU16LE(view, offset + 28);
    const extraLength = _xlsxU16LE(view, offset + 30);
    const commentLength = _xlsxU16LE(view, offset + 32);
    const localOffset = _xlsxU32LE(view, offset + 42);
    const fileName = dec.decode(bytes.subarray(offset + 46, offset + 46 + fileNameLength));
    if (_xlsxU32LE(view, localOffset) !== 0x04034b50) throw new Error('Invalid XLSX file entry.');
    const localNameLength = _xlsxU16LE(view, localOffset + 26);
    const localExtraLength = _xlsxU16LE(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? await _xlsxInflateRaw(compressed) : null;
    if (data) entries.set(fileName.replace(/\\/g, '/'), dec.decode(data));
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function _xlsxXmlDecode(value = '') {
  return String(value).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function _xlsxParseSharedStrings(xml = '') {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    _xlsxXmlDecode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((item) => item[1]).join(''))
  );
}

function _xlsxWorkbookSheetPath(entries) {
  const workbook = entries.get('xl/workbook.xml');
  const rels = entries.get('xl/_rels/workbook.xml.rels');
  if (!workbook || !rels) return 'xl/worksheets/sheet1.xml';
  const firstSheet = workbook.match(/<sheet\b[^>]*>/)?.[0];
  const relId = firstSheet ? (firstSheet.match(/r:id="([^"]*)"/) || [])[1] : '';
  const relMatch = relId
    ? [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((item) => item[0]).find((item) => (item.match(/Id="([^"]*)"/) || [])[1] === relId)
    : null;
  const target = relMatch ? (relMatch.match(/Target="([^"]*)"/) || [])[1] : 'worksheets/sheet1.xml';
  return (target ?? 'worksheets/sheet1.xml').startsWith('/') ? target.replace(/^\//, '') : `xl/${(target ?? 'worksheets/sheet1.xml').replace(/^\.\.\//, '')}`;
}

function _xlsxCellValue(cellAttrs, body, sharedStrings) {
  const type = (cellAttrs.match(/t="([^"]*)"/) || [])[1] ?? '';
  const value = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
  if (type === 's') return sharedStrings[Number(value)] ?? '';
  if (type === 'inlineStr') return _xlsxXmlDecode([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((item) => item[1]).join(''));
  return _xlsxXmlDecode(value);
}

async function _parseXlsxRowsClient(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const entries = await _xlsxUnzip(bytes);
  const sharedStrings = _xlsxParseSharedStrings(entries.get('xl/sharedStrings.xml') ?? '');
  const sheet = entries.get(_xlsxWorkbookSheetPath(entries)) ?? entries.get('xl/worksheets/sheet1.xml');
  if (!sheet) throw new Error('Could not find the first worksheet.');
  const rows = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = (cellMatch[1].match(/r="([^"]*)"/) || [])[1] ?? 'A';
      const letters = ref.match(/[A-Z]+/)?.[0] ?? 'A';
      const colIndex = letters.split('').reduce((t, l) => t * 26 + l.charCodeAt(0) - 64, 0) - 1;
      row[colIndex] = _xlsxCellValue(cellMatch[1], cellMatch[2], sharedStrings);
    }
    rows[Number(rowMatch[1]) - 1] = row;
  }
  return rows;
}

const _PT_STAGES = ['Kick-off', 'Onboarding', 'Training', 'GoLive', 'Warranty', 'On Hold'];
const _PT_PIPELINE_STAGES = ['Kick-off', 'Onboarding', 'Training', 'GoLive'];
const _PT_REQUIRED_REVIEW_FIELDS = ['customer_name', 'project_name', 'package_type', 'user_count', 'stage'];
const _PT_SALES_STAGE_MAPPINGS = [
  { pattern: /\bplanning\b/, stage: 'Kick-off' },
  { pattern: /\bimplementation\b|\bimplement\b/, stage: 'Onboarding' },
  { pattern: /\btraining\b/, stage: 'Training' },
  { pattern: /\bin\s*progress\b|\binprogress\b/, stage: 'GoLive' },
  { pattern: /\bwarranty\b/, stage: 'GoLive' },
  { pattern: /\bhold\s*projects?\b|\bon\s*hold\b/, stage: 'On Hold' }
];

function _ptClean(value) { const text = String(value ?? '').trim(); return text && text !== '-' ? text : null; }
function _ptProjectNameKey(value) { return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' '); }
function _ptHeaderValue(row, aliases) {
  for (const alias of aliases) { const v = row[alias]; if (v !== undefined && v !== null && String(v).trim() !== '') return v; }
  return null;
}
function _ptExcelSerialToDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial <= 0) return null;
  return new Date(Date.UTC(1899, 11, 30) + serial * 86400000).toISOString().slice(0, 10);
}
function _ptNormalizeYear(yearText, fallbackYear) {
  if (!yearText) return fallbackYear;
  const y = Number(yearText);
  return Number.isFinite(y) ? (y < 100 ? 2000 + y : y) : fallbackYear;
}
function _ptNormalizeDate(value, fallbackYear = new Date().getFullYear()) {
  const text = _ptClean(value);
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return _ptExcelSerialToDate(text);
  const m = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (m) {
    const year = _ptNormalizeYear(m[3], fallbackYear);
    return `${year}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}
function _ptExtractDate(text, keywords, fallbackYear) {
  const source = String(text ?? '');
  for (const kw of keywords) {
    const idx = source.toLowerCase().indexOf(kw.toLowerCase());
    if (idx < 0) continue;
    const found = source.slice(idx).match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
    if (found) return _ptNormalizeDate(found[1], fallbackYear);
  }
  return null;
}
function _ptNormalizeSalesStageStatus(value) {
  const text = String(value ?? '').replace(/^\s*\d+\.\s*/, '').trim().toLowerCase();
  return text ? (_PT_SALES_STAGE_MAPPINGS.find(({ pattern }) => pattern.test(text))?.stage ?? null) : null;
}
function _ptNormalizeStage(value, context = {}) {
  const text = String(value ?? '').replace(/^\s*\d+\.\s*/, '').trim().toLowerCase();
  const salesStage = _ptNormalizeSalesStageStatus(value);
  if (salesStage) return salesStage;
  if (context.goLiveDate) return 'GoLive';
  if (!text) return null;
  if (text.includes('hold')) return 'On Hold';
  if (text.includes('warranty')) return 'GoLive';
  if (text.includes('ชนะ')) return context.goLiveDate ? 'GoLive' : null;
  if (text.includes('training') || text.includes('เทรน')) return 'Training';
  const notes = String(context.notes ?? '').toLowerCase();
  if (text.includes('progress')) return notes.includes('training') || notes.includes('เทรน') ? 'Training' : 'GoLive';
  if (text.includes('golive') || text.includes('go live')) return 'GoLive';
  if (text.includes('implement')) return 'Onboarding';
  if (text.includes('onboard')) return 'Onboarding';
  if (text.includes('planning') || text.includes('kick')) return 'Kick-off';
  return _PT_STAGES.find((s) => s.toLowerCase() === text) ?? null;
}
function _ptIsVenioProject(record) {
  return [
    _ptHeaderValue(record, ['Project Product', 'Product']),
    _ptHeaderValue(record, ['ความสนใจ', 'Interest']),
    _ptHeaderValue(record, ['Project Name', 'ดีล', 'Deal', 'Project'])
  ].join(' ').toLowerCase().includes('venio');
}
function _ptReviewFieldsForProject(project) {
  const missing = _PT_REQUIRED_REVIEW_FIELDS.filter((f) => { const v = project[f]; return v === null || v === undefined || v === ''; });
  const stageIdx = _PT_PIPELINE_STAGES.indexOf(project.stage);
  if (stageIdx >= 0) {
    for (const [i, f] of ['kickoff_date', 'onboarding_date', 'training_date', 'golive_date'].entries()) {
      if (i <= stageIdx && !project[f]) missing.push(f);
    }
  }
  return [...new Set(missing)];
}
function _ptNormalizePackage(value, projectName = '') {
  const src = `${value ?? ''} ${projectName ?? ''}`.toLowerCase();
  if (src.includes('pro+')) return 'Pro+';
  if (/\bpro\s*plus\b/.test(src)) return 'Pro+';
  if (/\blite\b/.test(src)) return 'Lite';
  if (/\bpro\b/.test(src)) return 'Pro';
  return null;
}
function _ptToInteger(value) {
  const n = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}
function _ptRowsToRecords(rows) {
  const headerIndex = rows.findIndex((row) => {
    const joined = (row ?? []).join('|').toLowerCase();
    return joined.includes('customer name') || joined.includes('project package') || joined.includes('golive date') || joined.includes('ลูกค้า');
  });
  if (headerIndex < 0) throw new Error('Could not find project headers in the workbook.');
  const headers = (rows[headerIndex] ?? []).map((h) => String(h ?? '').trim());
  return rows.slice(headerIndex + 1).map((values) => Object.fromEntries(headers.map((h, i) => [h, values?.[i] ?? ''])));
}
function _ptRecordToProject(record) {
  if (!_ptIsVenioProject(record)) return null;
  const customerName = _ptClean(_ptHeaderValue(record, ['Customer Name', 'ลูกค้า', 'Customer']));
  const projectName = _ptClean(_ptHeaderValue(record, ['Project Name', 'ดีล', 'Deal', 'Project']));
  if (!_ptProjectNameKey(projectName || customerName)) return null;
  const rawPackageType = _ptClean(_ptHeaderValue(record, ['Package', 'Project Package', 'Project Package ', 'แพ็กเกจ']));
  const sourceStatus = _ptClean(_ptHeaderValue(record, ['Implementation Stage', 'Project Stage', 'ขั้นตอนการขาย', 'Status']));
  const healthStatus = _ptClean(_ptHeaderValue(record, ['Project Status']));
  const fallbackStatus = _ptClean(_ptHeaderValue(record, ['ขั้นตอนการขาย', 'Implementation Stage', 'Project Stage', 'Status']));
  const latestSummary = _ptClean(_ptHeaderValue(record, ['Latest Update', 'Notes', 'Notes / Latest Update', 'อัปเดตล่าสุด']));
  const timelineEvent = _ptClean(_ptHeaderValue(record, ['Timeline', 'ไทม์ไลน์']));
  const latestTimestamp = _ptClean(_ptHeaderValue(record, ['Latest Update At', 'ไทม์ไลน์ล่าสุด']));
  const timeline = [latestSummary, timelineEvent].filter(Boolean).join('\n');
  const kickoffDate = _ptNormalizeDate(_ptHeaderValue(record, ['Kick-off Date', 'Kickoff Date', 'วันที่เปิดดีล', 'วันที่สร้าง']));
  const fallbackYear = Number(kickoffDate?.slice(0, 4)) || new Date().getFullYear();
  const goLiveDate = _ptNormalizeDate(_ptHeaderValue(record, ['GoLive Date', 'Golive Date', 'Go Live Date', 'วันที่มีผล']), fallbackYear)
    ?? _ptExtractDate(timeline, ['golive', 'go live'], fallbackYear);
  const rawStage = fallbackStatus || sourceStatus;
  const mappedStage = _ptNormalizeStage(rawStage, { goLiveDate, notes: timeline });
  if (!mappedStage || !_ptNormalizeSalesStageStatus(rawStage)) return null;
  const project = {
    source_key: `project:${_ptProjectNameKey(projectName || customerName)}`,
    customer_name: customerName,
    project_name: projectName || customerName,
    package_type: _ptNormalizePackage(rawPackageType, projectName),
    user_count: _ptToInteger(_ptHeaderValue(record, ['User Count', 'Users', 'จำนวน', 'จำนวนผู้ใช้'])),
    source_status: [rawStage, healthStatus].filter(Boolean).join(' / '),
    stage: mappedStage,
    kickoff_date: kickoffDate,
    onboarding_date: _ptNormalizeDate(_ptHeaderValue(record, ['Onboarding Date', 'On-boarding Date']), fallbackYear)
      ?? _ptExtractDate(timeline, ['onboarding', 'on-boarding'], fallbackYear),
    training_date: _ptNormalizeDate(_ptHeaderValue(record, ['Training Date']), fallbackYear)
      ?? _ptExtractDate(timeline, ['training', 'เทรนนิ่ง'], fallbackYear),
    golive_date: goLiveDate,
    notes: latestSummary || timelineEvent || latestTimestamp,
    timeline_info: [latestTimestamp, timeline].filter(Boolean).join('\n')
  };
  const missing_fields = _ptReviewFieldsForProject(project);
  return { ...project, missing_fields, needs_review: missing_fields.length > 0 };
}

export async function previewProjectXlsxClient(filename, base64Content) {
  const rows = await _parseXlsxRowsClient(base64Content);
  const records = _ptRowsToRecords(rows);
  const projects = records.map(_ptRecordToProject).filter((p) => p && (p.customer_name || p.project_name));
  return {
    ok: true,
    filename,
    totalRows: records.length,
    validRows: projects.length,
    skippedRows: records.length - projects.length,
    needsReview: projects.filter((p) => p.needs_review).length,
    projects
  };
}

// ---- Remote/local API facade ----

let demoSeedPromise = null;

export async function loadDemoSeed() {
  if (demoSeedPromise) return demoSeedPromise;
  demoSeedPromise = (async () => {
    try {
      const response = await fetch('/demo-data.json', { cache: 'no-store' });
      if (!response.ok) return {};
      return await response.json();
    } catch {
      return {};
    }
  })();
  return demoSeedPromise;
}

export async function clientApi(path, options = {}) {
  const method = options.method ?? 'GET';
  const body = options.body ? JSON.parse(options.body) : {};

  if (method === 'GET' && path === '/api/auth/me') {
    if (!state.auth.user || !state.auth.token) throw new Error('Not signed in.');
    return { user: state.auth.user, token: state.auth.token };
  }

  if (method === 'POST' && path === '/api/auth/register') {
    const users = loadClientUsers();
    const username = norm(body.username).toLowerCase();
    const password = String(body.password ?? '');
    if (username.length < 2) throw new Error('Username must be at least 2 characters.');
    if (password.length < 3) throw new Error('Password must be at least 3 characters.');
    if (users[username]) throw new Error('Username already exists.');
    const user = { id: `local-${Date.now()}`, username };
    users[username] = { ...user, password };
    saveClientUsers(users);
    return { user, token: clientTokenForUser(user) };
  }

  if (method === 'POST' && path === '/api/auth/login') {
    const users = loadClientUsers();
    const username = norm(body.username).toLowerCase();
    const found = users[username];
    if (!found || found.password !== String(body.password ?? '')) throw new Error('Invalid username or password.');
    const user = { id: found.id, username: found.username };
    return { user, token: clientTokenForUser(user) };
  }

  if (method === 'GET' && path === '/api/user-store') {
    if (!state.auth.user) throw new Error('Sign in required.');
    return { data: loadClientStore(await loadDemoSeed()) };
  }

  if (method === 'PUT' && path === '/api/user-store') {
    if (!state.auth.user) throw new Error('Sign in required.');
    localStorage.setItem(currentStorageKey(), JSON.stringify(body.data ?? {}));
    return { ok: true };
  }

  const store = loadClientStore(state.auth.user ? {} : await loadDemoSeed());

  if (method === 'GET' && path === '/api/bootstrap') return clientBootstrap(store);
  if (method === 'POST' && path === '/api/import') return importClientCsv(body.filename ?? 'upload.csv', body.content ?? '');
  if (method === 'POST' && path === '/api/import-jira') return importClientCsv(body.filename ?? 'jira-export.csv', body.content ?? '', 'jira');
  if (method === 'POST' && path === '/api/settings') {
    store.settings = { ...store.settings, ...Object.fromEntries(Object.entries(body).map(([key, value]) => [key, String(value)])) };
    return clientBootstrap(store);
  }
  if (method === 'POST' && path === '/api/rules') {
    if (body.id) {
      store.rules = store.rules.map((rule) => rule.id === Number(body.id) ? { ...rule, ...body, id: Number(body.id), weight: Number(body.weight), active: Boolean(body.active) } : rule);
    } else {
      store.rules.push({ ...body, id: store.nextRuleId++, weight: Number(body.weight), active: Boolean(body.active) });
    }
    return clientBootstrap(store);
  }

  const projectMatch = path.match(/^\/api\/project-tracking\/projects\/(\d+)$/);
  if (method === 'POST' && projectMatch) {
    const projectId = Number(projectMatch[1]);
    store.projectTrackingProjects = (store.projectTrackingProjects ?? []).map((project) => project.id === projectId
      ? { ...project, [body.field]: body.value, updated_at: new Date().toISOString() }
      : project);
    saveClientStore(store);
    return clientBootstrap(store);
  }

  if (method === 'POST' && path === '/api/project-tracking/preview') {
    return previewProjectXlsxClient(body.filename ?? 'upload.xlsx', body.content ?? '');
  }

  if (method === 'POST' && path === '/api/project-tracking/import') {
    if (!Array.isArray(body.projects)) {
      throw new Error('Excel import requires the local Node server. Run npm run dev and try again.');
    }
    const now = new Date().toISOString();
    const incomingProjects = body.projects;
    const validProjects = [];
    let skippedRows = Number(body.skippedRows ?? 0);
    for (const project of incomingProjects) {
      const mappedStage = normalizeProjectSalesStageStatus(project.source_status);
      if (!projectNameKey(project.project_name)) {
        skippedRows += 1;
        continue;
      }
      if (!mappedStage) {
        skippedRows += 1;
        continue;
      }
      validProjects.push({ ...project, stage: mappedStage });
    }

    const seenImportKeys = new Set();
    const duplicateCount = validProjects.filter((project) => {
      const key = projectNameKey(project.project_name);
      if (seenImportKeys.has(key)) return true;
      seenImportKeys.add(key);
      return false;
    }).length;
    const existingByKey = new Map((store.projectTrackingProjects ?? [])
      .map((project) => [projectNameKey(project.project_name), project])
      .filter(([key]) => key));

    for (const incoming of validProjects) {
      const key = projectNameKey(incoming.project_name);
      if (!key) continue;
      const existing = existingByKey.get(key);
      const id = existing?.id ?? store.nextProjectId++;
      const nextProject = { ...(existing ?? {}), ...incoming };
      for (const field of ['customer_name', 'project_name', 'package_type', 'user_count', 'source_status', 'kickoff_date', 'onboarding_date', 'training_date', 'golive_date', 'notes', 'timeline_info']) {
        if ((incoming[field] === null || incoming[field] === undefined || incoming[field] === '') && existing?.[field]) {
          nextProject[field] = existing[field];
        }
      }
      existingByKey.set(key, {
        ...nextProject,
        id,
        source_key: existing?.source_key ?? incoming.source_key ?? `project:${key}`,
        created_at: existing?.created_at ?? now,
        updated_at: now
      });
    }

    store.projectTrackingProjects = [...existingByKey.values()];
    store.projectTrackingBatches = [
      {
        id: Date.now(),
        filename: body.filename ?? 'project-tracking.xlsx',
        imported_at: now,
        total_rows: Number(body.totalRows ?? incomingProjects.length),
        valid_rows: validProjects.length,
        skipped_rows: skippedRows,
        duplicate_count: duplicateCount
      },
      ...(store.projectTrackingBatches ?? [])
    ];
    saveClientStore(store);
    return {
      ok: true,
      validRows: validProjects.length,
      skippedRows,
      duplicateCount,
      importedAt: now,
      ...clientBootstrap(store)
    };
  }

  if (method === 'POST' && path === '/api/project-tracking/projects') {
    const now = new Date().toISOString();
    const createdProjectId = store.nextProjectId++;
    store.projectTrackingProjects = [
      {
        id: createdProjectId,
        source_key: `manual-${Date.now()}`,
        customer_name: null,
        project_name: null,
        package_type: 'Pro',
        user_count: 0,
        source_status: 'Manual',
        stage: 'Kick-off',
        kickoff_date: isoDate(new Date()),
        onboarding_date: null,
        training_date: null,
        golive_date: null,
        notes: null,
        timeline_info: null,
        created_at: now,
        updated_at: now
      },
      ...(store.projectTrackingProjects ?? [])
    ];
    saveClientStore(store);
    return { ...clientBootstrap(store), createdProjectId };
  }

  if (method === 'DELETE' && projectMatch) {
    const projectId = Number(projectMatch[1]);
    store.projectTrackingProjects = (store.projectTrackingProjects ?? []).filter((project) => project.id !== projectId);
    saveClientStore(store);
    return clientBootstrap(store);
  }

  const categoryMatch = path.match(/^\/api\/issues\/(\d+)\/category$/);
  if (method === 'POST' && categoryMatch) {
    const issueId = Number(categoryMatch[1]);
    store.issues = store.issues.map((issue) => issue.id === issueId
      ? isVenioIssue(issue)
        ? { ...issue, venio_category_manual: body.category || null, venio_category_final: body.category || 'Uncategorized', updated_at: new Date().toISOString() }
        : issue
      : issue);
    return clientBootstrap(store);
  }

  const noteMatch = path.match(/^\/api\/issues\/(\d+)\/notes$/);
  if (method === 'POST' && noteMatch) {
    const issueId = Number(noteMatch[1]);
    const noteText = String(body.note ?? '').trim();
    if (noteText) {
      store.issues = store.issues.map((issue) => issue.id === issueId
        ? { ...issue, notes: [{ id: store.nextNoteId++, issue_id: issueId, note: noteText, created_at: new Date().toISOString() }, ...(issue.notes ?? [])] }
        : issue);
    }
    return clientBootstrap(store);
  }

  throw new Error('No local demo handler for this request');
}

export async function api(path, options = {}) {
  if (
    state.auth.token
    && !path.startsWith('/api/auth')
    && path !== '/api/user-store'
    && path !== '/api/bootstrap'
  ) {
    return clientApi(path, options);
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(state.auth.token ? { Authorization: `Bearer ${state.auth.token}` } : {}),
      ...(options.headers ?? {})
    };
    const response = await fetch(path, {
      ...options,
      headers
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) throw new Error('API unavailable');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'API unavailable');
    return payload;
  } catch (error) {
    if (path.startsWith('/api/auth') || path === '/api/user-store') {
      const message = String(error.message || '');
      if (
        message.includes('Not found')
        || message.includes('API unavailable')
        || message.includes('Vercel KV is not configured')
      ) {
        return clientApi(path, options);
      }
      throw error;
    }
    return clientApi(path, options);
  }
}

export async function loadUserWorkspace() {
  const localStore = readStoredClientStore();
  let remoteStore = null;
  try {
    const response = await fetch('/api/user-store', {
      headers: { Authorization: `Bearer ${state.auth.token}` }
    });
    if (response.ok) {
      const payload = await response.json();
      remoteStore = payload.data;
    }
  } catch {
    remoteStore = null;
  }

  const store = hasWorkspaceContent(remoteStore)
    ? remoteStore
    : localStore || remoteStore || createDefaultStore();

  localStorage.setItem(currentStorageKey(), JSON.stringify(store));
  if (state.auth.token) void saveRemoteStore(store);
  return clientBootstrap(store);
}

export async function initialBootstrap() {
  if (state.auth.token) {
    try {
      const payload = await api('/api/auth/me');
      state.auth.user = payload.user;
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload.user));
      return loadUserWorkspace();
    } catch {
      signOut(false);
    }
  }
  return clientBootstrap(createDefaultStore());
}

export function signOut(shouldRender = true, renderFn = null) {
  state.auth.token = '';
  state.auth.user = null;
  state.auth.modal = '';
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  if (shouldRender && renderFn) {
    initialBootstrap().then((payload) => {
      applyBootstrap(payload);
      renderFn();
    });
  }
}

export function applyBootstrap(payload) {
  state.issues = payload.issues ?? [];
  state.batches = payload.batches ?? [];
  state.projectTrackingProjects = payload.projectTrackingProjects ?? [];
  state.projectTrackingBatches = payload.projectTrackingBatches ?? [];
  state.crisp.operators = payload.crispOperators ?? [];
  state.crisp.batches = payload.crispBatches ?? [];
  state.crisp.months = payload.crispMonths ?? [];
  if (!state.crisp.selectedMonth && state.crisp.months.length) {
    state.crisp.selectedMonth = state.crisp.months[0].month;
  }
  state.settings = payload.settings ?? {};
  state.rules = payload.rules ?? [];
}
