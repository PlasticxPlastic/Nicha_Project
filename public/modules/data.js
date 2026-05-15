// data.js — filteredIssues, metrics, and all computation helpers

import state from './state.js';
import { norm, number, dateValue, formatDurationSeconds, percent, topEntry } from './utils.js';

// Memoization cache — invalidated by render() in app.js
export let _filteredCache = null;
export function invalidateFilterCache() {
  _filteredCache = null;
}

// ---- Domain helpers ----

export function settingNumber(key) {
  return Number(state.settings[key] ?? 0);
}

export function isResolved(issue) {
  const status = `${issue.status} ${issue.status_category}`.toLowerCase();
  return Boolean(issue.resolved_date) || status.includes('done') || status.includes('resolved') || status.includes('closed');
}

export function isHighPriority(issue) {
  return ['high', 'highest', 'critical'].includes(norm(issue.priority).toLowerCase());
}

export function isVenioIssue(issue) {
  return norm(issue.project_name).toLowerCase() === 'venio' || norm(issue.issue_key).toUpperCase().startsWith('VENIO-');
}

export function venioIssues(items) {
  return items.filter(isVenioIssue);
}

export function categoryForIssue(issue, fallback = '-') {
  if (!isVenioIssue(issue)) return fallback;
  return norm(issue.venio_category_final) || 'Uncategorized';
}

export function categoryConfidenceForIssue(issue) {
  return isVenioIssue(issue) ? norm(issue.category_confidence) || '-' : '-';
}

export function categoryRuleForIssue(issue) {
  return isVenioIssue(issue) ? norm(issue.category_rule) || '-' : '-';
}

export function countByVenioCategory(items) {
  const counts = new Map();
  for (const issue of venioIssues(items)) {
    const key = categoryForIssue(issue, 'Uncategorized');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function pendingLevel(issue) {
  if (isResolved(issue)) return '';
  const pending = number(issue.pending_age_hours);
  if (pending > settingNumber('pending_critical_hours')) return 'critical';
  if (pending > settingNumber('pending_warning_hours')) return 'warning';
  return '';
}

export function priorityRank(priority) {
  const value = norm(priority).toLowerCase();
  if (value === 'critical' || value === 'highest') return 4;
  if (value === 'high') return 3;
  if (value === 'medium') return 2;
  if (value === 'low') return 1;
  return 0;
}

export function unique(field) {
  if (field === 'venio_category_final') {
    return countByVenioCategory(state.issues).map(([category]) => category);
  }
  return [...new Set(state.issues.map((issue) => norm(issue[field])).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function inRange(value, from, to) {
  if (!from && !to) return true;
  const date = dateValue(value);
  if (!date) return false;
  if (from && date < new Date(`${from}T00:00:00`)) return false;
  if (to && date > new Date(`${to}T23:59:59`)) return false;
  return true;
}

export function numRange(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return !min && !max;
  if (min !== '' && parsed < Number(min)) return false;
  if (max !== '' && parsed > Number(max)) return false;
  return true;
}

// ---- Sorting ----

export function compareText(a, b) {
  return norm(a).localeCompare(norm(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function compareDates(a, b) {
  return (dateValue(a)?.getTime() ?? 0) - (dateValue(b)?.getTime() ?? 0);
}

export function compareNumbers(a, b) {
  return number(a) - number(b);
}

export function compareIssues(a, b, sort, direction = 'asc') {
  const sorters = {
    issue_key: () => compareText(a.issue_key, b.issue_key),
    summary: () => compareText(a.summary, b.summary),
    customer: () => compareText(a.customer_code, b.customer_code),
    type: () => compareText(a.issue_type, b.issue_type),
    priority: () => priorityRank(a.priority) - priorityRank(b.priority),
    status: () => compareText(a.status, b.status),
    status_category: () => compareText(a.status_category, b.status_category),
    category: () => compareText(categoryForIssue(a, ''), categoryForIssue(b, '')),
    newest: () => compareDates(a.report_date, b.report_date),
    oldest: () => compareDates(a.report_date, b.report_date),
    updated: () => compareDates(a.last_updated_date, b.last_updated_date),
    resolved: () => compareDates(a.resolved_date, b.resolved_date),
    solve: () => compareNumbers(a.time_to_solve_hours, b.time_to_solve_hours),
    pending: () => compareNumbers(a.pending_age_hours, b.pending_age_hours)
  };
  const baseDirection = sort === 'oldest' ? 'asc' : direction;
  const effectiveDirection = sort === 'newest' ? 'desc' : baseDirection;
  const comparison = (sorters[sort] ?? sorters.newest)();
  if (comparison !== 0) return effectiveDirection === 'desc' ? -comparison : comparison;
  return compareText(a.issue_key, b.issue_key);
}

// ---- Main filter function ----

export function filteredIssues() {
  if (_filteredCache !== null) return _filteredCache;
  const f = state.filters;
  const search = norm(f.search).toLowerCase();
  let result = state.issues.filter((issue) => {
    const fields = [
      'project_name',
      'project_type',
      'issue_type',
      'status',
      'status_category',
      'priority',
      'customer_code'
    ];
    for (const field of fields) {
      if (f[field].length && !f[field].includes(norm(issue[field]))) return false;
    }
    if (f.venio_category_final.length && !f.venio_category_final.includes(categoryForIssue(issue, ''))) return false;
    if (search) {
      const haystack = [
        issue.issue_key,
        issue.summary,
        issue.description,
        issue.customer_code,
        categoryForIssue(issue, '')
      ].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (f.solved === 'solved' && !isResolved(issue)) return false;
    if (f.solved === 'unsolved' && isResolved(issue)) return false;
    if (f.overdue === 'overdue' && !pendingLevel(issue)) return false;
    if (f.overdue === 'not-overdue' && pendingLevel(issue)) return false;
    if (!inRange(issue.report_date, f.report_from, f.report_to)) return false;
    if (!inRange(issue.last_updated_date, f.updated_from, f.updated_to)) return false;
    if (!inRange(issue.resolved_date, f.resolved_from, f.resolved_to)) return false;
    if (!numRange(issue.pending_age_hours, f.pending_min, f.pending_max)) return false;
    if (!numRange(issue.time_to_solve_hours, f.solve_min, f.solve_max)) return false;
    return true;
  });

  result = [...result].sort((a, b) => compareIssues(a, b, f.sort, f.sort_dir));
  _filteredCache = result;
  return result;
}

// ---- Aggregation / metrics ----

export function countBy(items, field) {
  const counts = new Map();
  for (const item of items) {
    const key = norm(item[field]) || 'Unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function avg(items, field) {
  const values = items.map((item) => Number(item[field])).filter(Number.isFinite);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function metrics(items) {
  const open = items.filter((issue) => !isResolved(issue));
  const resolved = items.filter(isResolved);
  const pendingWarning = open.filter((issue) => number(issue.pending_age_hours) > settingNumber('pending_warning_hours'));
  const pendingCritical = open.filter((issue) => number(issue.pending_age_hours) > settingNumber('pending_critical_hours'));
  const topVenioCategory = countByVenioCategory(items)[0]?.[0] ?? '-';
  return {
    total: items.length,
    open: open.length,
    resolved: resolved.length,
    high: items.filter(isHighPriority).length,
    pendingWarning: pendingWarning.length,
    pendingCritical: pendingCritical.length,
    avgSolve: avg(items, 'time_to_solve_hours'),
    avgPending: avg(open, 'pending_age_hours'),
    oldestPending: open.sort((a, b) => number(b.pending_age_hours) - number(a.pending_age_hours))[0],
    customer: countBy(items, 'customer_code')[0]?.[0] ?? '-',
    issueType: countBy(items, 'issue_type')[0]?.[0] ?? '-',
    category: topVenioCategory
  };
}

export function cleanCountBy(items, field, fallback = 'Unknown') {
  const counts = new Map();
  for (const item of items) {
    const raw = norm(item[field]);
    const key = raw && raw !== '-' ? raw : fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function knownAccountCount(items) {
  const counts = new Map();
  for (const item of items) {
    const key = norm(item.customer_code);
    if (!key || key === '-') continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function riskProfile(items) {
  const m = metrics(items);
  const scopedVenioIssues = venioIssues(items);
  const openRate = percent(m.open, m.total);
  const criticalRate = percent(m.pendingCritical, Math.max(1, m.open));
  const highPending = items.filter((issue) => isHighPriority(issue) && !isResolved(issue)).length;
  const uncategorized = scopedVenioIssues.filter((issue) => categoryForIssue(issue) === 'Uncategorized').length;
  const topCategory = topEntry(countByVenioCategory(items));
  const topCustomer = topEntry(knownAccountCount(items));
  const level = m.pendingCritical > 0 || highPending > 10
    ? 'Critical attention'
    : openRate >= 45 || m.pendingWarning > 0
      ? 'Watch closely'
      : 'Stable';

  return {
    m,
    openRate,
    criticalRate,
    highPending,
    uncategorized,
    topCategory,
    topCustomer,
    venioCount: scopedVenioIssues.length,
    level
  };
}

export function feedbackSummary(items) {
  const m = metrics(items);
  const scopedVenioIssues = venioIssues(items);
  const categoriesTop = countByVenioCategory(items).slice(0, 3).map(([key]) => key);
  const customersTop = countBy(items, 'customer_code').slice(0, 3).map(([key]) => key);
  const typesTop = countBy(items, 'issue_type').slice(0, 3).map(([key]) => key);
  const slowAreas = averageBy(scopedVenioIssues, 'venio_category_final', 'time_to_solve_hours').slice(0, 2).map(([key]) => key);
  const categorySentence = scopedVenioIssues.length
    ? `The most common Venio categories are ${categoriesTop.join(', ') || '-'}.`
    : 'No Venio project issues are in the current filtered scope, so Venio category analysis is not shown.';

  return `This filtered period contains ${m.total} issues. ${m.open} issues are still pending, including ${m.pendingWarning} over ${state.settings.pending_warning_hours} hours and ${m.pendingCritical} over ${state.settings.pending_critical_hours} hours. ${categorySentence} The most affected customers are ${customersTop.join(', ') || '-'}. Common issue types are ${typesTop.join(', ') || '-'}. The product team should prioritize ${categoriesTop.slice(0, 2).join(' and ') || 'the highest-volume Venio areas'}, while CS should review high-priority pending issues first. Slowest resolved Venio areas: ${slowAreas.join(', ') || '-'}.`;
}

export function averageBy(items, groupField, valueField) {
  const groups = new Map();
  for (const item of items) {
    const value = Number(item[valueField]);
    if (!Number.isFinite(value)) continue;
    const key = norm(item[groupField]) || 'Unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(value);
  }
  return [...groups.entries()]
    .map(([key, values]) => [key, values.reduce((sum, value) => sum + value, 0) / values.length])
    .sort((a, b) => b[1] - a[1]);
}

export function monthKey(value) {
  const date = dateValue(value);
  if (!date) return 'Unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function quarterKey(value) {
  const date = dateValue(value);
  if (!date) return 'Unknown';
  return `${date.getFullYear()} Q${Math.floor(date.getMonth() / 3) + 1}`;
}

export function periodLabel(key) {
  if (!key || key === 'Unknown') return 'Unknown';
  const month = key.match(/^(\d{4})-(\d{2})$/);
  if (month) {
    const date = new Date(Number(month[1]), Number(month[2]) - 1, 1);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
  return key;
}

export function countByPeriod(items, grain = 'month', field = 'report_date') {
  const counts = new Map();
  for (const item of items) {
    const key = grain === 'quarter' ? quarterKey(item[field]) : monthKey(item[field]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function periodOptions(items, grain = 'month') {
  return countByPeriod(items, grain).map(([key]) => key).filter((key) => key !== 'Unknown');
}

export function openIssues(items) {
  return items.filter((issue) => !isResolved(issue));
}

export function resolutionBucket(issue) {
  const resolution = norm(issue.issue_resolution).toLowerCase();
  const status = norm(issue.status).toLowerCase();
  const category = norm(issue.status_category).toLowerCase();
  if (resolution.includes('not a bug') || status.includes('not a bug') || status.includes('reject')) return 'Not a Bug';
  if (resolution.includes('done') || resolution.includes('fixed') || resolution.includes('resolved')) return 'Done';
  if (isResolved(issue) || status === 'done' || category === 'done') return 'Done';
  return 'Unresolved/Pending';
}

export function resolutionEntries(items) {
  const order = ['Done', 'Not a Bug', 'Unresolved/Pending'];
  const counts = new Map(order.map((label) => [label, 0]));
  for (const issue of items) {
    const bucket = resolutionBucket(issue);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return order.map((label) => [label, counts.get(label) ?? 0]);
}

export function issueTypeOptions(items) {
  return countBy(items, 'issue_type').map(([type]) => type).filter((type) => type !== '-');
}

export function countByDate(items, field) {
  const counts = new Map();
  for (const item of items) {
    const date = dateValue(item[field]);
    if (!date) continue;
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function activeFilterChips() {
  const chips = [];
  const f = state.filters;
  const labelsByField = {
    project_name: 'Project',
    project_type: 'Project type',
    issue_type: 'Issue type',
    status: 'Status',
    status_category: 'Status category',
    priority: 'Priority',
    customer_code: 'Customer',
    venio_category_final: 'Venio category'
  };

  for (const [field, label] of Object.entries(labelsByField)) {
    if (f[field].length) chips.push(`${label}: ${f[field].join(', ')}`);
  }
  if (f.search) chips.push(`Search: ${f.search}`);
  if (f.solved) chips.push(f.solved === 'solved' ? 'Solved only' : 'Unresolved only');
  if (f.overdue) chips.push(f.overdue === 'overdue' ? 'Overdue only' : 'Not overdue');
  if (f.report_from || f.report_to) chips.push(`Report date: ${f.report_from || '...'} to ${f.report_to || '...'}`);
  if (f.pending_min || f.pending_max) chips.push(`Pending: ${f.pending_min || '0'}-${f.pending_max || 'max'}h`);
  if (f.solve_min || f.solve_max) chips.push(`Solve: ${f.solve_min || '0'}-${f.solve_max || 'max'}h`);

  return chips;
}

// ---- Project tracking helpers ----

export function projectStageGroup(project) {
  const stage = norm(project.stage) || 'Kick-off';
  return stage === 'Warranty' ? 'GoLive' : stage;
}

export function projectDurationDays(project) {
  const start = dateValue(project.kickoff_date);
  if (!start) return 0;
  const end = dateValue(project.golive_date) ?? new Date();
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000));
}

export function projectMetrics(projects) {
  const grouped = projects.map(projectStageGroup);
  const pipeline = projects.filter((project) => projectStageGroup(project) !== 'On Hold');
  return {
    total: projects.length,
    users: projects.reduce((sum, project) => sum + number(project.user_count), 0),
    inProgress: projects.filter((project) => !['GoLive', 'On Hold'].includes(projectStageGroup(project))).length,
    pipeline: pipeline.length,
    onHold: grouped.filter((stage) => stage === 'On Hold').length,
    goLive: grouped.filter((stage) => stage === 'GoLive').length
  };
}

export function countProjectsByStage(projects) {
  const counts = new Map(['Kick-off', 'Onboarding', 'Training', 'GoLive', 'On Hold'].map((stage) => [stage, 0]));
  for (const project of projects) {
    const stage = counts.has(projectStageGroup(project)) ? projectStageGroup(project) : 'Kick-off';
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  return [...counts.entries()];
}

export function countProjectsByPackage(projects) {
  const counts = new Map();
  for (const project of projects) {
    const key = norm(project.package_type) || 'Unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function projectMissingFields(project) {
  const fields = ['customer_name', 'project_name', 'package_type', 'user_count', 'stage'];
  const missing = fields.filter((field) => {
    const value = project[field];
    return value === null || value === undefined || value === '';
  });
  const currentStageIndex = ['Kick-off', 'Onboarding', 'Training', 'GoLive'].indexOf(projectStageGroup(project));
  if (currentStageIndex >= 0) {
    ['kickoff_date', 'onboarding_date', 'training_date', 'golive_date'].forEach((field, index) => {
      if (index <= currentStageIndex && !project[field]) missing.push(field);
    });
  }
  return [...new Set(missing)];
}

export function projectDateFields(project) {
  return [
    ['Kick-off', 'kickoff_date'],
    ['Onboarding', 'onboarding_date'],
    ['Training', 'training_date'],
    ['GoLive', 'golive_date']
  ].map(([stage, field]) => ({ stage, field, date: project[field] ?? '' }));
}

export function projectProgressValue(project) {
  const index = ['Kick-off', 'Onboarding', 'Training', 'GoLive'].indexOf(projectStageGroup(project));
  if (index < 0) return 0;
  return ((index + 1) / 4) * 100;
}

export function filteredProjectTrackingProjects(projects) {
  const filters = state.projectTracking.filters ?? { search: '', package_type: '', stage: '', review: '' };
  const search = norm(filters.search).toLowerCase();
  return projects.filter((project) => {
    if (search) {
      const haystack = [
        project.customer_name,
        project.project_name,
        project.package_type,
        project.package_detail,
        project.notes
      ].map(norm).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filters.package_type && norm(project.package_type) !== filters.package_type) return false;
    if (filters.stage && projectStageGroup(project) !== filters.stage) return false;
    if (filters.review === 'needs-review' && !projectMissingFields(project).length) return false;
    if (filters.review === 'complete' && projectMissingFields(project).length) return false;
    return true;
  });
}

export function productFocusHighlights(items) {
  const pending = openIssues(items);
  const venioPending = openIssues(venioIssues(items));
  const topPendingTypes = countBy(pending, 'issue_type').slice(0, 3);
  const topVenioCategories = countByVenioCategory(venioPending).slice(0, 3);
  const highPending = pending.filter(isHighPriority);
  const slowResolved = items
    .filter((issue) => issue.time_to_solve_hours)
    .sort((a, b) => number(b.time_to_solve_hours) - number(a.time_to_solve_hours))
    .slice(0, 3);
  return [
    {
      title: 'Backlog concentration',
      value: topPendingTypes.map(([type, count]) => `${type} (${count})`).join(', ') || 'No open backlog',
      hint: 'Product should first review the open issue types CS sees most often.'
    },
    {
      title: 'Venio product focus',
      value: topVenioCategories.map(([category, count]) => `${category} (${count})`).join(', ') || 'No Venio category concentration',
      hint: 'Use this as the product-area feedback queue from service issues.'
    },
    {
      title: 'Escalation risk',
      value: `${highPending.length} high-priority open issue${highPending.length === 1 ? '' : 's'}`,
      hint: 'High or Highest priority items should be reviewed before broad enhancement work.'
    },
    {
      title: 'Resolution drag',
      value: slowResolved.map((issue) => `${issue.issue_key} ${number(issue.time_to_solve_hours).toFixed(1)}h`).join(', ') || 'No resolved timing data',
      hint: 'Slow resolved examples help identify process friction or unclear ownership.'
    }
  ];
}

// ---- Crisp helpers ----

export function crispWeightedAverage(operators, field, options = {}) {
  let weightedTotal = 0;
  let weight = 0;
  for (const operator of operators) {
    const conversations = number(operator.conversations);
    const value = Number(operator[field]);
    if (!conversations || !Number.isFinite(value)) continue;
    if (options.excludeZero && value <= 0) continue;
    weightedTotal += value * conversations;
    weight += conversations;
  }
  return weight ? weightedTotal / weight : null;
}

export function crispMetrics(operators) {
  const totalConversations = operators.reduce((sum, operator) => sum + number(operator.conversations), 0);
  const ratedConversations = operators
    .filter((operator) => number(operator.rating) > 0)
    .reduce((sum, operator) => sum + number(operator.conversations), 0);
  const activeOperators = operators.filter((operator) => number(operator.conversations) > 0);
  const avgRating = crispWeightedAverage(operators, 'rating', { excludeZero: true });
  const avgResponseSeconds = crispWeightedAverage(operators, 'firstResponseMedianSeconds');
  const avgResolutionSeconds = crispWeightedAverage(operators, 'resolutionMedianSeconds');
  const topVolume = [...activeOperators].sort((a, b) => number(b.conversations) - number(a.conversations))[0] ?? null;
  const fastestResponse = [...activeOperators]
    .filter((operator) => Number.isFinite(Number(operator.firstResponseAverageSeconds)))
    .sort((a, b) => number(a.firstResponseAverageSeconds) - number(b.firstResponseAverageSeconds))[0] ?? null;
  const slowestResolution = [...activeOperators]
    .filter((operator) => Number.isFinite(Number(operator.resolutionAverageSeconds)))
    .sort((a, b) => number(b.resolutionAverageSeconds) - number(a.resolutionAverageSeconds))[0] ?? null;
  return {
    totalConversations,
    ratedConversations,
    avgRating,
    avgResponseSeconds,
    avgResolutionSeconds,
    topVolume,
    fastestResponse,
    slowestResolution
  };
}

export function crispRatingLabel(value) {
  const rating = Number(value);
  return rating > 0 ? rating.toFixed(2) : 'No rating';
}

export function crispMonthOptions() {
  return [...(state.crisp.months ?? [])].sort((a, b) => b.month.localeCompare(a.month));
}

export function crispMonthSeries(months) {
  return [...months].sort((a, b) => a.month.localeCompare(b.month));
}

export function selectedCrispMonthEntry() {
  const months = crispMonthOptions();
  if (!months.length) return null;
  const selected = state.crisp.selectedMonth && months.find((month) => month.month === state.crisp.selectedMonth);
  return selected || months[0];
}

export function crispMetricValue(month, metric) {
  if (!month) return null;
  const values = {
    conversations: month.total_conversations,
    rating: month.avg_rating,
    response: month.avg_response_seconds,
    resolution: month.avg_resolution_seconds,
    operators: month.valid_rows
  };
  const value = values[metric];
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

export function crispFormatMetric(metric, value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  if (metric === 'rating') return Number(value).toFixed(2);
  if (metric === 'response' || metric === 'resolution') return formatDurationSeconds(value);
  return String(Math.round(Number(value)));
}

export function crispDelta(current, previous, metric, lowerIsBetter = false) {
  if (current === null || previous === null || previous === undefined) {
    return { text: '-', tone: 'muted', detail: 'No previous month' };
  }
  const change = current - previous;
  const abs = Math.abs(change);
  const improved = lowerIsBetter ? change < 0 : change > 0;
  const worsened = lowerIsBetter ? change > 0 : change < 0;
  const prefix = change > 0 ? '+' : change < 0 ? '-' : '';
  return {
    text: `${prefix}${crispFormatMetric(metric, abs)}`,
    tone: improved ? 'ok' : worsened ? 'danger' : 'muted',
    detail: change === 0 ? 'No change vs previous month' : `${improved ? 'Improved' : 'Worse'} vs previous month`
  };
}

export function crispPreviousMonth(months, selectedMonth) {
  const series = crispMonthSeries(months);
  const index = series.findIndex((month) => month.month === selectedMonth);
  return index > 0 ? series[index - 1] : null;
}

export function crispScale(value, min, max, invert = false) {
  if (!Number.isFinite(Number(value))) return 0;
  if (max <= min) return 50;
  const ratio = (Number(value) - min) / (max - min);
  return (invert ? 1 - ratio : ratio) * 100;
}

export function crispMetricRange(months, metric, includeZero = false) {
  const values = months.map((month) => crispMetricValue(month, metric)).filter((value) => value !== null);
  if (!values.length) return { min: 0, max: 1 };
  if (includeZero) values.push(0);
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}
