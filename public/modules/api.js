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

export function normalizedIssueFromRow(row) {
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

export function jiraIssueFromRow(row, importedAt = new Date().toISOString()) {
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

// ---- CSV Import ----

export function importClientCsv(filename, content, format = 'normalized') {
  const store = loadClientStore();
  const { headers, records } = parseCsvText(content);
  const required = format === 'jira' ? jiraRequiredColumns : requiredColumns;
  const missingColumns = required.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    const error = new Error(`Missing columns: ${missingColumns.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const validIssues = [];
  let skippedRows = 0;

  for (const row of records) {
    const issue = format === 'jira' ? jiraIssueFromRow(row, now) : normalizedIssueFromRow(row);
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
    throw new Error('Excel import requires the local Node server. Run npm run dev and try again.');
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
    && path !== '/api/project-tracking/preview'
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
