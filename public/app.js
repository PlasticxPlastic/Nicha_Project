const app = document.querySelector('#app');
const STORAGE_KEY = 'customer_service_team_hub_demo_v1';
const AUTH_TOKEN_KEY = `${STORAGE_KEY}_auth_token`;
const AUTH_USER_KEY = `${STORAGE_KEY}_auth_user`;
const AUTH_USERS_KEY = `${STORAGE_KEY}_auth_users`;

function storedAuthUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function loadClientUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveClientUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function clientTokenForUser(user) {
  return btoa(`${user.id}:${user.username}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

const state = {
  view: 'home',
  issues: [],
  batches: [],
  projectTrackingProjects: [],
  projectTrackingBatches: [],
  settings: {},
  rules: [],
  selectedIssueId: null,
  selectedProjectId: null,
  auth: {
    token: localStorage.getItem(AUTH_TOKEN_KEY) || '',
    user: storedAuthUser(),
    modal: ''
  },
  openFilter: '',
  openDatePicker: '',
  datePickerMonth: '',
  lastShellHtml: '',
  activePreset: '',
  toast: '',
  filters: {
    search: '',
    project_name: [],
    project_type: [],
    issue_type: [],
    status: [],
    status_category: [],
    priority: [],
    customer_code: [],
    venio_category_final: [],
    solved: '',
    overdue: '',
    report_from: '',
    report_to: '',
    updated_from: '',
    updated_to: '',
    resolved_from: '',
    resolved_to: '',
    pending_min: '',
    pending_max: '',
    solve_min: '',
    solve_max: '',
    sort: 'newest',
    sort_dir: 'desc'
  },
  comparison: {
    from: '',
    to: ''
  },
  dashboard: {
    issue_type: '',
    distribution_grain: 'month',
    distribution_period: '',
    resolution_months: []
  },
  projectTracking: {
    viewMode: 'monthly',
    activeView: 'board',
    importReview: null
  }
};

const categories = [
  'Activity Plan',
  'Customer',
  'Team',
  'Expense',
  'Case',
  'Deal',
  'Quotation',
  'Sales Order',
  'Contract',
  'Campaign',
  'Product',
  'Sales Page',
  'Chat',
  'Report',
  'Setting',
  'Contact',
  'Uncategorized'
];

const projectStages = ['Kick-off', 'Onboarding', 'Training', 'GoLive', 'Warranty', 'On Hold'];

const labels = {
  home: 'Home',
  'project-dashboard': 'Project Dashboard',
  'crisp-performance': 'Crisp Chat',
  'etaxgo-issue': 'eTaxgo Issue',
  upload: 'Upload',
  'jira-upload': 'Jira Import',
  dashboard: 'Executive Briefing',
  board: 'Issue Board',
  table: 'Issue Table',
  settings: 'Settings'
};

const brandAssets = {
  venio: './assets/venio-full.png',
  etaxgo: 'https://www.etaxgo.com/wp-content/uploads/2025/03/eTaxGo-Logo-2025.png'
};

const requiredColumns = [
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
  'Report Date',
  'Last Updated Date',
  'Resolved Date (Proxy)',
  'Time to Solve (hrs)',
  'Pending Age (hrs)'
];

const jiraRequiredColumns = [
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

const defaultRules = [
  ['Quotation', 'quotation', 'EN', 10],
  ['Quotation', 'quote', 'EN', 8],
  ['Quotation', 'เสนอราคา', 'TH', 10],
  ['Expense', 'expense', 'EN', 10],
  ['Expense', 'ค่าใช้จ่าย', 'TH', 10],
  ['Expense', 'เบิก', 'TH', 8],
  ['Report', 'report', 'EN', 10],
  ['Report', 'รายงาน', 'TH', 10],
  ['Report', 'export', 'EN', 8],
  ['Customer', 'customer', 'EN', 10],
  ['Customer', 'ลูกค้า', 'TH', 10],
  ['Contract', 'contract', 'EN', 10],
  ['Contract', 'สัญญา', 'TH', 10],
  ['Chat', 'chat', 'EN', 10],
  ['Chat', 'แชท', 'TH', 10],
  ['Chat', 'message', 'EN', 7],
  ['Setting', 'setting', 'EN', 10],
  ['Setting', 'ตั้งค่า', 'TH', 10],
  ['Contact', 'contact', 'EN', 10],
  ['Contact', 'ผู้ติดต่อ', 'TH', 10],
  ['Sales Order', 'sales order', 'EN', 10],
  ['Sales Order', 'SO', 'EN', 9],
  ['Sales Order', 'ใบสั่งขาย', 'TH', 10],
  ['Campaign', 'campaign', 'EN', 10],
  ['Campaign', 'แคมเปญ', 'TH', 10],
  ['Deal', 'deal', 'EN', 10],
  ['Deal', 'opportunity', 'EN', 8],
  ['Case', 'case', 'EN', 10],
  ['Case', 'ticket', 'EN', 8],
  ['Product', 'product', 'EN', 10],
  ['Product', 'สินค้า', 'TH', 10],
  ['Activity Plan', 'activity plan', 'EN', 10],
  ['Activity Plan', 'แผนกิจกรรม', 'TH', 10],
  ['Team', 'team', 'EN', 10],
  ['Team', 'ทีม', 'TH', 10],
  ['Sales Page', 'sales page', 'EN', 10]
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function closestFromEvent(event, selector) {
  const target = event.target?.nodeType === Node.ELEMENT_NODE
    ? event.target
    : event.target?.parentElement;
  return target?.closest?.(selector) ?? null;
}

function targetElementFromEvent(event) {
  return event.target?.nodeType === Node.ELEMENT_NODE
    ? event.target
    : event.target?.parentElement ?? null;
}

function norm(value) {
  return String(value ?? '').trim();
}

function slug(value) {
  return norm(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = dateValue(value);
  if (!date) return '-';
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function displayDate(value) {
  const date = dateValue(value);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function monthLabel(date) {
  return date.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });
}

function settingNumber(key) {
  return Number(state.settings[key] ?? 0);
}

function isResolved(issue) {
  const status = `${issue.status} ${issue.status_category}`.toLowerCase();
  return Boolean(issue.resolved_date) || status.includes('done') || status.includes('resolved') || status.includes('closed');
}

function isHighPriority(issue) {
  return ['high', 'highest', 'critical'].includes(norm(issue.priority).toLowerCase());
}

function isVenioIssue(issue) {
  return norm(issue.project_name).toLowerCase() === 'venio' || norm(issue.issue_key).toUpperCase().startsWith('VENIO-');
}

function venioIssues(items) {
  return items.filter(isVenioIssue);
}

function categoryForIssue(issue, fallback = '-') {
  if (!isVenioIssue(issue)) return fallback;
  return norm(issue.venio_category_final) || 'Uncategorized';
}

function categoryConfidenceForIssue(issue) {
  return isVenioIssue(issue) ? norm(issue.category_confidence) || '-' : '-';
}

function categoryRuleForIssue(issue) {
  return isVenioIssue(issue) ? norm(issue.category_rule) || '-' : '-';
}

function countByVenioCategory(items) {
  const counts = new Map();
  for (const issue of venioIssues(items)) {
    const key = categoryForIssue(issue, 'Uncategorized');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function pendingLevel(issue) {
  if (isResolved(issue)) return '';
  const pending = number(issue.pending_age_hours);
  if (pending > settingNumber('pending_critical_hours')) return 'critical';
  if (pending > settingNumber('pending_warning_hours')) return 'warning';
  return '';
}

function priorityRank(priority) {
  const value = norm(priority).toLowerCase();
  if (value === 'critical' || value === 'highest') return 4;
  if (value === 'high') return 3;
  if (value === 'medium') return 2;
  if (value === 'low') return 1;
  return 0;
}

function unique(field) {
  if (field === 'venio_category_final') {
    return countByVenioCategory(state.issues).map(([category]) => category);
  }
  return [...new Set(state.issues.map((issue) => norm(issue[field])).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function inRange(value, from, to) {
  if (!from && !to) return true;
  const date = dateValue(value);
  if (!date) return false;
  if (from && date < new Date(`${from}T00:00:00`)) return false;
  if (to && date > new Date(`${to}T23:59:59`)) return false;
  return true;
}

function numRange(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return !min && !max;
  if (min !== '' && parsed < Number(min)) return false;
  if (max !== '' && parsed > Number(max)) return false;
  return true;
}

function filteredIssues() {
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
  return result;
}

function compareText(a, b) {
  return norm(a).localeCompare(norm(b), undefined, { numeric: true, sensitivity: 'base' });
}

function compareDates(a, b) {
  return (dateValue(a)?.getTime() ?? 0) - (dateValue(b)?.getTime() ?? 0);
}

function compareNumbers(a, b) {
  return number(a) - number(b);
}

function compareIssues(a, b, sort, direction = 'asc') {
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

function countBy(items, field) {
  const counts = new Map();
  for (const item of items) {
    const key = norm(item[field]) || 'Unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function avg(items, field) {
  const values = items.map((item) => Number(item[field])).filter(Number.isFinite);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function metrics(items) {
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

function percent(value, total) {
  if (!total) return 0;
  return (value / total) * 100;
}

function formatPercent(value) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function topEntry(entries) {
  return entries[0] ?? ['-', 0];
}

function cleanCountBy(items, field, fallback = 'Unknown') {
  const counts = new Map();
  for (const item of items) {
    const raw = norm(item[field]);
    const key = raw && raw !== '-' ? raw : fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function knownAccountCount(items) {
  const counts = new Map();
  for (const item of items) {
    const key = norm(item.customer_code);
    if (!key || key === '-') continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function riskProfile(items) {
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

function feedbackSummary(items) {
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

function averageBy(items, groupField, valueField) {
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

function monthKey(value) {
  const date = dateValue(value);
  if (!date) return 'Unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function quarterKey(value) {
  const date = dateValue(value);
  if (!date) return 'Unknown';
  return `${date.getFullYear()} Q${Math.floor(date.getMonth() / 3) + 1}`;
}

function periodLabel(key) {
  if (!key || key === 'Unknown') return 'Unknown';
  const month = key.match(/^(\d{4})-(\d{2})$/);
  if (month) {
    const date = new Date(Number(month[1]), Number(month[2]) - 1, 1);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
  return key;
}

function countByPeriod(items, grain = 'month', field = 'report_date') {
  const counts = new Map();
  for (const item of items) {
    const key = grain === 'quarter' ? quarterKey(item[field]) : monthKey(item[field]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function periodOptions(items, grain = 'month') {
  return countByPeriod(items, grain).map(([key]) => key).filter((key) => key !== 'Unknown');
}

function openIssues(items) {
  return items.filter((issue) => !isResolved(issue));
}

function resolutionBucket(issue) {
  const resolution = norm(issue.issue_resolution).toLowerCase();
  const status = norm(issue.status).toLowerCase();
  const category = norm(issue.status_category).toLowerCase();
  if (resolution.includes('not a bug') || status.includes('not a bug') || status.includes('reject')) return 'Not a Bug';
  if (resolution.includes('done') || resolution.includes('fixed') || resolution.includes('resolved')) return 'Done';
  if (isResolved(issue) || status === 'done' || category === 'done') return 'Done';
  return 'Unresolved/Pending';
}

function resolutionEntries(items) {
  const order = ['Done', 'Not a Bug', 'Unresolved/Pending'];
  const counts = new Map(order.map((label) => [label, 0]));
  for (const issue of items) {
    const bucket = resolutionBucket(issue);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return order.map((label) => [label, counts.get(label) ?? 0]);
}

function issueTypeOptions(items) {
  return countBy(items, 'issue_type').map(([type]) => type).filter((type) => type !== '-');
}

function icon(name) {
  const icons = {
    home: '&#8962;',
    'project-dashboard': '&#9638;',
    'crisp-performance': '&#9729;',
    'etaxgo-issue': 'E',
    upload: '&#8593;',
    'jira-upload': '&#8679;',
    dashboard: '&#9638;',
    board: '&#9636;',
    table: '&#9776;',
    calendar: '&#9716;',
    settings: '&#9881;',
    search: '&#8981;',
    export: '&#8681;',
    close: '&times;',
    total: '&#9638;',
    open: '&#9679;',
    resolved: '&#10003;',
    priority: '&#9888;',
    time: '&#9716;',
    customer: '&#9787;',
    category: '&#9673;'
  };
  return icons[name] ?? '&bull;';
}

function moduleIcon(name) {
  const icons = {
    project: '&#9638;',
    crisp: '&#9711;',
    venio: 'V',
    etaxgo: 'E'
  };
  return icons[name] ?? '&bull;';
}

function brandLogo(name, fallback, className = '') {
  const src = brandAssets[name];
  return `
    <span class="brand-logo ${className}">
      <img src="${src}" alt="${escapeHtml(fallback)} logo" loading="lazy">
      <span>${escapeHtml(fallback)}</span>
    </span>
  `;
}

function statusPill(value) {
  const className = slug(value).split('-')[0];
  return `<span class="pill ${className}">${escapeHtml(value || 'Unknown')}</span>`;
}

function priorityPill(value) {
  return `<span class="inline"><span class="dot ${slug(value)}"></span>${escapeHtml(value || '-')}</span>`;
}

function card(label, value, hint) {
  const labelText = norm(label).toLowerCase();
  const iconKey = labelText.includes('open') || labelText.includes('pending')
    ? 'open'
    : labelText.includes('resolved')
      ? 'resolved'
      : labelText.includes('priority') || labelText.includes('critical')
        ? 'priority'
        : labelText.includes('time') || labelText.includes('age') || labelText.includes('oldest')
          ? 'time'
          : labelText.includes('customer')
            ? 'customer'
            : labelText.includes('category')
              ? 'category'
              : 'total';
  return `
    <div class="card">
      <div class="card-label"><span>${escapeHtml(label)}</span><span class="card-icon" aria-hidden="true">${icon(iconKey)}</span></div>
      <div class="metric">${escapeHtml(value)}</div>
      <div class="subtle">${escapeHtml(hint ?? '')}</div>
    </div>
  `;
}

function executiveKpi(label, value, hint, tone = '') {
  return `
    <div class="executive-kpi ${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(hint)}</small>
    </div>
  `;
}

function insightLine(label, value, hint, tone = '') {
  return `
    <div class="insight-line ${tone}">
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
      <p>${escapeHtml(hint)}</p>
    </div>
  `;
}

function chart(title, data, options = {}) {
  const max = Math.max(1, ...data.map(([, value]) => value));
  const decimals = options.decimals ?? 0;
  const unit = options.unit ?? '';
  const rows = data.slice(0, options.limit ?? 8).map(([label, value]) => `
    <div class="bar-row">
      <div class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (value / max) * 100)}%"></div></div>
      <strong>${Number(value).toFixed(decimals)}${unit}</strong>
    </div>
  `).join('');
  return `<div class="panel chart-panel ${options.className ?? ''}"><div class="panel-title"><h2>${title}</h2><span>${escapeHtml(options.caption ?? `${data.length} groups`)}</span></div><div class="bar-list">${rows || '<div class="subtle">No data</div>'}</div></div>`;
}

function dashboardSelect(key, label, value, options) {
  const selected = options.find((option) => option.value === value) ?? options[0];
  return `
    <label class="dashboard-control custom-dashboard-control">
      <span>${escapeHtml(label)}</span>
      <details class="custom-select">
        <summary>${escapeHtml(selected?.label ?? 'Select')}</summary>
        <div class="custom-select-menu">
          ${options.map((option) => `
            <button
              type="button"
              class="custom-select-option ${option.value === value ? 'active' : ''}"
              data-dashboard-select="${escapeHtml(key)}"
              data-value="${escapeHtml(option.value)}"
            >${escapeHtml(option.label)}</button>
          `).join('')}
        </div>
      </details>
    </label>
  `;
}

function periodSelectOptions(keys) {
  return keys.map((key) => ({ value: key, label: periodLabel(key) }));
}

function activeFilterChips() {
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

function filterPanel() {
  const advancedFields = [
    'report_from',
    'report_to',
    'updated_from',
    'updated_to',
    'resolved_from',
    'resolved_to',
    'pending_min',
    'pending_max',
    'solve_min',
    'solve_max'
  ];
  const advancedOpen = advancedFields.includes(state.openFilter);
  const multi = (field, label) => `
    <details class="filter-menu" ${state.openFilter === field ? 'open' : ''}>
      <summary>
        <span>${label}</span>
        ${state.filters[field].length ? `<strong>${state.filters[field].length}</strong>` : ''}
      </summary>
      <div class="filter-menu-list">
        ${unique(field).map((value) => `
          <label>
            <input type="checkbox" data-filter-check="${field}" value="${escapeHtml(value)}" ${state.filters[field].includes(value) ? 'checked' : ''}>
            <span>${escapeHtml(value)}</span>
          </label>
        `).join('') || '<div class="subtle">No values</div>'}
      </div>
    </details>
  `;
  const chips = activeFilterChips();
  return `
    <div class="filter-panel">
      <div class="filter-head">
        <div>
          <strong>Report View Controls</strong>
          <div class="subtle">Current report scope</div>
        </div>
        <button class="button ghost" data-action="reset-filters">Reset filters</button>
      </div>
      <div class="toolbar primary-toolbar">
        <input class="search" data-filter="search" value="${escapeHtml(state.filters.search)}" placeholder="${icon('search')} Search issue key, customer, subject...">
        <select data-filter-one="solved">
          <option value="">Solved / Unsolved</option>
          <option value="solved" ${state.filters.solved === 'solved' ? 'selected' : ''}>Solved</option>
          <option value="unsolved" ${state.filters.solved === 'unsolved' ? 'selected' : ''}>Unsolved</option>
        </select>
        <select data-filter-one="overdue">
          <option value="">Overdue / Not overdue</option>
          <option value="overdue" ${state.filters.overdue === 'overdue' ? 'selected' : ''}>Overdue</option>
          <option value="not-overdue" ${state.filters.overdue === 'not-overdue' ? 'selected' : ''}>Not overdue</option>
        </select>
        <select data-filter-one="sort">
          <option value="newest" ${state.filters.sort === 'newest' ? 'selected' : ''}>Newest report date</option>
          <option value="oldest" ${state.filters.sort === 'oldest' ? 'selected' : ''}>Oldest report date</option>
          <option value="pending" ${state.filters.sort === 'pending' ? 'selected' : ''}>Longest pending age</option>
          <option value="priority" ${state.filters.sort === 'priority' ? 'selected' : ''}>Highest priority</option>
          <option value="solve" ${state.filters.sort === 'solve' ? 'selected' : ''}>Longest time to solve</option>
          <option value="updated" ${state.filters.sort === 'updated' ? 'selected' : ''}>Latest updated</option>
          <option value="customer" ${state.filters.sort === 'customer' ? 'selected' : ''}>Customer Code</option>
          <option value="type" ${state.filters.sort === 'type' ? 'selected' : ''}>Issue Type</option>
          <option value="category" ${state.filters.sort === 'category' ? 'selected' : ''}>Venio category</option>
        </select>
        <button class="button preset-toggle ${state.activePreset === 'high' ? 'active' : ''}" data-preset="high">High Priority Pending</button>
        <button class="button preset-toggle ${state.activePreset === '36' ? 'active' : ''}" data-preset="36">Over 36 Hours Pending</button>
        <button class="button preset-toggle ${state.activePreset === '24' ? 'active' : ''}" data-preset="24">Over 24 Hours Pending</button>
      </div>
      ${chips.length ? `<div class="chip-row">${chips.slice(0, 8).map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}${chips.length > 8 ? `<span class="chip">+${chips.length - 8} more</span>` : ''}</div>` : '<div class="chip-row"><span class="chip muted-chip">No active filters</span></div>'}
      <div class="filter-grid">
        ${multi('project_name', 'Project')}
        ${multi('project_type', 'Project Type')}
        ${multi('priority', 'Priority')}
        ${multi('status_category', 'Status Category')}
        ${multi('venio_category_final', 'Venio Category')}
        ${multi('customer_code', 'Customer')}
        ${multi('issue_type', 'Issue Type')}
        ${multi('status', 'Status')}
        <details class="filter-menu wide-filter" ${advancedOpen ? 'open' : ''}>
          <summary><span>More filters</span><strong>Dates</strong></summary>
          <div class="filter-date-popover">
            <div class="filter-section">
              <div class="filter-section-title">Date ranges</div>
              <div class="filter-section-grid three">
                ${dateRangeControl('Report date', 'report_from', 'report_to')}
                ${dateRangeControl('Last updated', 'updated_from', 'updated_to')}
                ${dateRangeControl('Resolved date', 'resolved_from', 'resolved_to')}
              </div>
            </div>
            <div class="filter-section">
              <div class="filter-section-title">Hour ranges</div>
              <div class="filter-section-grid two">
                ${numberRangeControl('Pending age', 'pending_min', 'pending_max')}
                ${numberRangeControl('Time to solve', 'solve_min', 'solve_max')}
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  `;
}

function dateRangeControl(label, fromKey, toKey) {
  return `
    <div class="date-range-control">
      <span>${label}</span>
      ${datePickerControl('From', fromKey)}
      ${datePickerControl('To', toKey)}
    </div>
  `;
}

function datePickerControl(label, key) {
  const value = state.filters[key];
  return `
    <div class="date-input-wrap">
      <small>${label}</small>
      <button class="date-trigger ${value ? 'has-value' : ''}" type="button" data-date-open="${key}">
        <span>${value ? escapeHtml(displayDate(value)) : 'Select date'}</span>
        <span class="date-trigger-icon" aria-hidden="true"></span>
      </button>
      ${state.openDatePicker === key ? calendarPopover(key) : ''}
    </div>
  `;
}

function calendarPopover(key) {
  const selectedDate = dateValue(state.filters[key]);
  const fallback = selectedDate ?? new Date();
  const monthDate = state.datePickerMonth
    ? new Date(`${state.datePickerMonth}-01T00:00:00`)
    : new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  const today = isoDate(new Date());
  const selected = state.filters[key];
  const days = [];

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const value = isoDate(day);
    days.push({
      value,
      label: day.getDate(),
      outside: day.getMonth() !== monthDate.getMonth(),
      today: value === today,
      selected: value === selected
    });
  }

  return `
    <div class="calendar-popover">
      <div class="calendar-head">
        <button type="button" data-date-nav="${key}" data-direction="-1">‹</button>
        <strong>${monthLabel(monthDate)}</strong>
        <button type="button" data-date-nav="${key}" data-direction="1">›</button>
      </div>
      <div class="calendar-weekdays">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => `<span>${day}</span>`).join('')}
      </div>
      <div class="calendar-grid">
        ${days.map((day) => `
          <button
            type="button"
            class="${day.outside ? 'outside' : ''} ${day.today ? 'today' : ''} ${day.selected ? 'selected' : ''}"
            data-date-select="${key}"
            data-value="${day.value}"
          >${day.label}</button>
        `).join('')}
      </div>
      <div class="calendar-actions">
        <button type="button" data-date-clear="${key}">Clear</button>
        <button type="button" data-date-today="${key}">Today</button>
      </div>
    </div>
  `;
}

function numberRangeControl(label, minKey, maxKey) {
  return `
    <div class="date-range-control">
      <span>${label}</span>
      <label class="date-input-wrap">
        <small>Min</small>
        <input type="number" data-filter="${minKey}" value="${escapeHtml(state.filters[minKey])}">
      </label>
      <label class="date-input-wrap">
        <small>Max</small>
        <input type="number" data-filter="${maxKey}" value="${escapeHtml(state.filters[maxKey])}">
      </label>
    </div>
  `;
}

function renderShell(content) {
  const moduleNav = [
    { key: 'home', label: labels.home },
    { key: 'project-dashboard', label: labels['project-dashboard'] },
    { key: 'crisp-performance', label: labels['crisp-performance'] },
    { key: 'dashboard', label: 'Venio Issue' },
    { key: 'etaxgo-issue', label: labels['etaxgo-issue'] }
  ];
  const venioNav = ['upload', 'jira-upload', 'board', 'table', 'settings'];
  const venioWorkspaceViews = ['dashboard', ...venioNav];
  const isVenioWorkspace = venioWorkspaceViews.includes(state.view);
  const authControls = `
    <div class="auth-chip">
      <span>${escapeHtml(state.auth.user.username)}</span>
      <button class="button ghost" data-action="sign-out">Sign out</button>
    </div>
  `;
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand sidebar-brand">${brandLogo('venio', 'Venio', 'brand-logo-sidebar')}<span>Insight</span></div>
        <nav class="nav">
          ${moduleNav.map((item) => `
            <button class="${state.view === item.key ? 'active' : ''}" data-view="${item.key}">
              <span class="nav-ico">${icon(item.key)}</span><span>${item.label}</span>
            </button>
          `).join('')}
          ${isVenioWorkspace ? `
            <div class="nav-section">Venio Issue</div>
            ${venioNav.map((key) => `
              <button class="${state.view === key ? 'active' : ''}" data-view="${key}">
                <span class="nav-ico">${icon(key)}</span><span>${labels[key]}</span>
              </button>
            `).join('')}
          ` : ''}
        </nav>
      </aside>
      <main class="main">
        <div class="topbar">
          <div class="crumb">Workspace / <strong>${labels[state.view]}</strong></div>
          ${isVenioWorkspace ? `
            <div class="topbar-center">
              <input class="search topbar-search" data-filter="search" value="${escapeHtml(state.filters.search)}" placeholder="${icon('search')} Search issues...">
            </div>
          ` : '<div class="topbar-center"></div>'}
          ${isVenioWorkspace ? `
            <div class="actions topbar-actions">
              <button class="button primary" data-action="print-report">${icon('export')} PDF</button>
              <button class="button" data-action="export-excel">${icon('export')} Excel</button>
              ${authControls}
            </div>
          ` : authControls}
        </div>
        ${content}
      </main>
      ${modal()}
      ${projectEditModal()}
      ${projectImportModal()}
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}
    </div>
  `;
}

function renderAuthGate() {
  const mode = state.auth.modal === 'register' ? 'register' : 'signin';
  const isRegister = mode === 'register';
  return `
    <main class="auth-gate">
      <section class="auth-gate-panel">
        <div class="brand hub-brand">
          ${brandLogo('venio', 'Venio', 'brand-logo-header')}
          <span>Insight Hub</span>
        </div>
        <div>
          <div class="landing-kicker">Private Workspace</div>
          <h1>${isRegister ? 'Create your hub' : 'Sign in to your hub'}</h1>
          <p>Each user gets an independent Customer Service hub and dashboard data.</p>
        </div>
        <div class="auth-body">
          <label>
            <span>Username</span>
            <input data-auth-field="username" autocomplete="username" placeholder="your name">
          </label>
          <label>
            <span>Password</span>
            <input data-auth-field="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" placeholder="simple password">
          </label>
          <button class="button primary" data-action="auth-submit" data-mode="${mode}">
            ${isRegister ? 'Create Account' : 'Sign In'}
          </button>
          <button class="button ghost" data-action="open-auth" data-mode="${isRegister ? 'signin' : 'register'}">
            ${isRegister ? 'I already have an account' : 'Create a new account'}
          </button>
        </div>
        <p class="subtle">Simple login for team dashboards. Your workspace loads after sign in.</p>
      </section>
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}
    </main>
  `;
}

function pageHeader(title, hint) {
  const items = filteredIssues();
  const m = metrics(items);
  return `
    <div class="page-title">
      <div>
        <h1>${title}</h1>
        <div class="subtle">${hint}</div>
      </div>
      <div class="page-meta">
        <span><strong>${items.length}</strong> of ${state.issues.length} issues</span>
        <span><strong>${m.open}</strong> pending</span>
        <span><strong>${m.pendingCritical}</strong> critical</span>
      </div>
    </div>
  `;
}

function projectPageHeader(title, hint) {
  const m = projectMetrics(state.projectTrackingProjects);
  return `
    <div class="page-title">
      <div>
        <h1>${title}</h1>
        <div class="subtle">${hint}</div>
      </div>
      <div class="page-meta">
        <span><strong>${m.total}</strong> projects</span>
        <span><strong>${m.users}</strong> users</span>
        <span><strong>${m.inProgress}</strong> in progress</span>
      </div>
    </div>
  `;
}

function renderLanding() {
  const m = metrics(state.issues);
  const issueCount = state.issues.length;
  const scopedVenioIssues = venioIssues(state.issues);
  const venioIssueCount = scopedVenioIssues.length;
  const venioOpen = metrics(scopedVenioIssues).open;
  const companyCounts = countBy(state.issues, 'project_name');
  const companySlides = companyCounts.length ? companyCounts : [['No project data', 0]];
  const datasetLabel = issueCount
    ? `${issueCount} total issues loaded`
    : 'No issues loaded yet';
  const modules = [
    {
      key: 'project-dashboard',
      icon: 'project',
      title: 'Project Dashboard',
      status: 'Live',
      meta: `${state.projectTrackingProjects.length} implementation projects`,
      action: 'Open workspace',
      variant: 'live',
      available: true
    },
    {
      key: 'crisp-performance',
      icon: 'crisp',
      title: 'Crisp Chat Performance',
      status: 'Not yet',
      meta: 'Support response analytics',
      action: 'Coming soon',
      variant: 'coming-soon',
      available: false
    },
    {
      key: 'dashboard',
      icon: 'venio',
      brand: 'venio',
      title: 'Venio Issue',
      status: 'Live',
      meta: `${venioIssueCount} Venio issues / ${venioOpen} pending`,
      description: 'Issue reporting aligned to Venio CRM case, customer, and analytics workflows.',
      action: 'Open workspace',
      variant: 'live',
      available: true
    },
    {
      key: 'etaxgo-issue',
      icon: 'etaxgo',
      brand: 'etaxgo',
      title: 'eTaxgo Issue',
      status: 'Not configured',
      meta: 'Issue insight workspace',
      description: 'Workspace shell is present, but no eTaxgo issue setup is active yet.',
      action: 'Prepare workspace',
      variant: 'warning',
      available: true
    }
  ];

  return `
    <main class="landing-shell">
      <header class="landing-top">
        <div class="brand hub-brand">
          ${brandLogo('venio', 'Venio', 'brand-logo-header')}
          <span>Insight Hub</span>
        </div>
        <button class="landing-primary-action" data-view="dashboard" aria-label="Open Venio Issue workspace">Open Venio Issue</button>
      </header>
      <section class="landing-hero">
        <div class="landing-copy">
          <div class="landing-kicker">Operations Intelligence</div>
          <h1>Choose a workspace</h1>
          <p>One local hub for issue reporting, service quality, and project visibility.</p>
          <div class="landing-context-pills" aria-label="Venio CRM context">
            <span>Connecting your customers</span>
            <span>CRM</span>
            <span>Case</span>
            <span>Analytics</span>
          </div>
        </div>
        <div class="landing-visual-stack">
          <aside class="landing-dataset-panel" aria-label="Imported issue dataset summary by company">
            <div class="dataset-head">
              <span>Imported dataset</span>
              <strong>All companies</strong>
            </div>
            <div class="dataset-count">${issueCount}</div>
            <p>${escapeHtml(datasetLabel)}</p>
            <small>${venioIssueCount} of these are Venio issues. The rest remain visible by company/project.</small>
            <div class="company-carousel" aria-label="Issue count by company or project">
              <div class="company-carousel-track">
                ${[...companySlides, ...companySlides].map(([company, count]) => `
                  <span>
                    <strong>${escapeHtml(company || 'Unknown')}</strong>
                    <small>${count} issue${count === 1 ? '' : 's'}</small>
                  </span>
                `).join('')}
              </div>
            </div>
            <div class="dataset-meta">
              <span class="status-dot live"></span>
              <span>Live workspace: Venio Issue</span>
            </div>
          </aside>
        </div>
      </section>
      <section class="workspace-section" aria-labelledby="workspace-title">
        <div class="workspace-section-head">
          <div>
            <h2 id="workspace-title">Workspaces</h2>
            <p>Open the live Venio issue workspace or review upcoming modules.</p>
          </div>
        </div>
        <div class="module-grid">
          ${modules.map(workspaceCard).join('')}
        </div>
      </section>
    </main>
  `;
}

function workspaceCard(module) {
  const disabledText = !module.available ? 'true' : 'false';
  const cardLabel = `${module.title}. Status: ${module.status}. ${module.action}.`;
  return `
    <button
      class="module-card ${module.variant}"
      data-view="${module.key}"
      data-availability="${module.available ? 'available' : 'coming-soon'}"
      aria-label="${escapeHtml(cardLabel)}"
      aria-disabled="${disabledText}">
      <span class="module-status ${module.variant}">${escapeHtml(module.status)}</span>
      <span class="module-identity">
        ${module.brand ? brandLogo(module.brand, module.title, 'module-logo') : `<span class="module-icon">${moduleIcon(module.icon)}</span>`}
      </span>
      <span class="module-content">
        <strong>${escapeHtml(module.title)}</strong>
        <small>${escapeHtml(module.meta)}</small>
        ${module.description ? `<em>${escapeHtml(module.description)}</em>` : ''}
      </span>
      <span class="module-action ${module.variant}">${escapeHtml(module.action)}</span>
    </button>
  `;
}

function projectStageGroup(project) {
  const stage = norm(project.stage) || 'Kick-off';
  return stage === 'Warranty' ? 'GoLive' : stage;
}

function projectDurationDays(project) {
  const start = dateValue(project.kickoff_date);
  if (!start) return 0;
  const end = dateValue(project.golive_date) ?? new Date();
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000));
}

function projectMetrics(projects) {
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

function countProjectsByStage(projects) {
  const counts = new Map(['Kick-off', 'Onboarding', 'Training', 'GoLive', 'On Hold'].map((stage) => [stage, 0]));
  for (const project of projects) {
    const stage = counts.has(projectStageGroup(project)) ? projectStageGroup(project) : 'Kick-off';
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  return [...counts.entries()];
}

function countProjectsByPackage(projects) {
  const counts = new Map();
  for (const project of projects) {
    const key = norm(project.package_type) || 'Unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function projectModeLabel() {
  return state.projectTracking.viewMode === 'twice-weekly'
    ? 'Twice-a-week operational review'
    : 'Monthly management view';
}

function projectModeWindowText() {
  const today = new Date();
  if (state.projectTracking.viewMode === 'twice-weekly') {
    const end = new Date(today);
    end.setDate(end.getDate() + 3);
    return `${displayDate(today)} to ${displayDate(end)}`;
  }
  return today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function projectStageProgress(project) {
  const grouped = projectStageGroup(project);
  const activeIndex = ['Kick-off', 'Onboarding', 'Training', 'GoLive'].indexOf(grouped);
  if (grouped === 'On Hold') return '<div class="project-progress on-hold"><span>On Hold</span></div>';
  return `
    <div class="project-progress" aria-label="Project implementation stage progress">
      ${['Kick-off', 'Onboarding', 'Training', 'GoLive'].map((stage, index) => `
        <span class="${index <= activeIndex ? 'done' : ''} ${stage === grouped ? 'current' : ''}" title="${escapeHtml(stage)}"></span>
      `).join('')}
    </div>
  `;
}

function projectPieChart(projects) {
  const data = countProjectsByStage(projects);
  const total = Math.max(1, projects.length);
  const colors = ['#4ea4f8', '#615cf6', '#22b873', '#14a38b', '#e64679'];
  let cursor = 0;
  const gradient = data.map(([, value], index) => {
    const start = cursor;
    cursor += (value / total) * 360;
    return `${colors[index]} ${start}deg ${cursor}deg`;
  }).join(', ');

  return `
    <div class="panel project-pie-panel">
      <div class="panel-title">
        <h2>Project Stage Distribution</h2>
        <span>${escapeHtml(projectModeLabel())}</span>
      </div>
      <div class="project-pie-layout">
        <div class="project-pie" style="background: conic-gradient(${gradient || '#e4ebf4 0deg 360deg'});">
          <span>${projects.length}</span>
        </div>
        <div class="project-pie-legend">
          ${data.map(([stage, value], index) => `
            <div>
              <i style="background:${colors[index]}"></i>
              <span>${escapeHtml(stage)}</span>
              <strong>${value}</strong>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function projectMissingFields(project) {
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

function projectDateFields(project) {
  return [
    ['Kick-off', 'kickoff_date'],
    ['Onboarding', 'onboarding_date'],
    ['Training', 'training_date'],
    ['GoLive', 'golive_date']
  ].map(([stage, field]) => ({ stage, field, date: project[field] ?? '' }));
}

function projectStageBadge(project, fieldName = 'stage') {
  const stage = norm(project[fieldName]) || 'Kick-off';
  return `
    <label class="stage-select-wrap stage-${slug(projectStageGroup({ stage }))}">
      <span>${escapeHtml(stage)}</span>
      <select data-project-id="${project.id}" data-project-field="${fieldName}" aria-label="Project stage">
        ${projectStages.map((item) => `<option value="${escapeHtml(item)}" ${stage === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}
      </select>
    </label>
  `;
}

function projectInlineInput(project, field, options = {}) {
  const type = options.type ?? 'text';
  const value = project[field] ?? '';
  return `<input class="project-inline-input ${options.className ?? ''}" type="${type}" value="${escapeHtml(value)}" data-project-id="${project.id}" data-project-field="${field}" aria-label="${escapeHtml(options.label ?? field)}">`;
}

function projectPackagePill(project) {
  const value = norm(project.package_type) || 'Unknown';
  return `
    <label class="project-package-pill package-${slug(value)}">
      <span>${escapeHtml(value)}</span>
      <select data-project-id="${project.id}" data-project-field="package_type" aria-label="Project package">
        ${['Lite', 'Pro', 'Pro+'].map((pack) => `<option value="${escapeHtml(pack)}" ${project.package_type === pack ? 'selected' : ''}>${escapeHtml(pack)}</option>`).join('')}
      </select>
    </label>
  `;
}

function projectDateControl(project, stage, field) {
  const grouped = projectStageGroup(project);
  const currentIndex = ['Kick-off', 'Onboarding', 'Training', 'GoLive'].indexOf(grouped);
  const stageIndex = ['Kick-off', 'Onboarding', 'Training', 'GoLive'].indexOf(stage);
  const value = project[field] ?? '';
  const stateClass = value
    ? stageIndex < currentIndex ? 'done' : stageIndex === currentIndex ? 'current' : 'planned'
    : stageIndex <= currentIndex ? 'missing' : 'waiting';
  const label = value ? displayDate(value) : stateClass === 'missing' ? 'Needs date' : 'waiting';
  return `
    <label class="project-date-cell ${stateClass}">
      <span>${escapeHtml(label)}</span>
      <input type="date" value="${escapeHtml(value)}" data-project-id="${project.id}" data-project-field="${field}" aria-label="${escapeHtml(stage)} date">
    </label>
  `;
}

function projectAttentionRows(projects) {
  const missingCurrentDates = projects.filter((project) => projectMissingFields(project).some((field) => field.endsWith('_date'))).length;
  const onHold = projects.filter((project) => projectStageGroup(project) === 'On Hold').length;
  const longRunning = projects
    .filter((project) => !['GoLive', 'On Hold'].includes(projectStageGroup(project)))
    .sort((a, b) => projectDurationDays(b) - projectDurationDays(a))
    .slice(0, 3);
  return `
    <div class="panel project-attention-panel">
      <div class="panel-title">
        <h2>Timeline Attention</h2>
        <span>Data quality and delivery focus</span>
      </div>
      <div class="project-attention-grid">
        <div class="insight-line ${missingCurrentDates ? 'watch' : 'ok'}">
          <div><span>Missing milestone data</span><strong>${missingCurrentDates}</strong></div>
          <p>Rows with blank dates for a stage already reached.</p>
        </div>
        <div class="insight-line ${onHold ? 'danger' : 'ok'}">
          <div><span>On hold</span><strong>${onHold}</strong></div>
          <p>Excluded from active implementation throughput.</p>
        </div>
        <div class="project-longrun-list">
          ${longRunning.map((project) => `
            <div>
              <strong>${escapeHtml(project.customer_name || project.project_name || '-')}</strong>
              <span>${projectDurationDays(project)} days / ${escapeHtml(projectStageGroup(project))}</span>
            </div>
          `).join('') || '<p class="subtle">No long-running active projects.</p>'}
        </div>
      </div>
    </div>
  `;
}

function projectBoardColumns(projects) {
  const columns = ['Kick-off', 'Onboarding', 'Training', 'GoLive', 'On Hold'];
  return columns.map((stage) => ({
    stage,
    projects: projects.filter((project) => projectStageGroup(project) === stage)
  }));
}

function projectProgressValue(project) {
  const index = ['Kick-off', 'Onboarding', 'Training', 'GoLive'].indexOf(projectStageGroup(project));
  if (index < 0) return 0;
  return ((index + 1) / 4) * 100;
}

function projectCardDate(project, label, field) {
  const value = project[field] ?? '';
  return `
    <div class="project-card-date ${value ? 'has-date' : 'empty'}">
      <span>${escapeHtml(label)}</span>
      <strong>${value ? escapeHtml(displayDate(value)) : '-'}</strong>
    </div>
  `;
}

function projectPackageDisplay(project) {
  const value = norm(project.package_type) || 'Unknown';
  return `<span class="project-package-pill package-${slug(value)}"><span>${escapeHtml(value)}</span></span>`;
}

function projectStageDisplay(project) {
  const stage = projectStageGroup(project);
  return `<span class="stage-select-wrap stage-${slug(stage)}"><span>${escapeHtml(stage)}</span></span>`;
}

function projectBoardCard(project) {
  const missing = projectMissingFields(project);
  const progress = projectProgressValue(project);
  const totalDays = projectDurationDays(project);
  return `
    <article class="project-board-card stage-${slug(projectStageGroup(project))}" data-open-project="${project.id}" role="button" tabindex="0" aria-label="Edit ${escapeHtml(project.customer_name || project.project_name || 'project')}">
      <div class="project-board-card-head">
        ${projectPackageDisplay(project)}
      </div>
      <div class="project-card-name">
        <strong class="project-card-customer">${escapeHtml(project.customer_name || '-')}</strong>
        <span class="project-card-project">${escapeHtml(project.project_name || '-')}</span>
      </div>
      <div class="project-card-meta">
        <div class="project-card-meta-item">
          <span>Users</span>
          <strong class="project-card-user-count">${number(project.user_count)}</strong>
        </div>
        ${projectStageDisplay(project)}
      </div>
      <div class="project-card-progress">
        <div>
          <span>Total Days</span>
          <strong>${totalDays}d</strong>
        </div>
        <i style="width:${projectStageGroup(project) === 'On Hold' ? 100 : progress}%"></i>
      </div>
      <div class="project-card-dates">
        ${projectCardDate(project, 'Kick-off', 'kickoff_date')}
        ${projectCardDate(project, 'Onboarding', 'onboarding_date')}
        ${projectCardDate(project, 'Training', 'training_date')}
        ${projectCardDate(project, 'GoLive', 'golive_date')}
      </div>
      ${missing.length ? `<div class="project-card-alert">${missing.length} fields need review</div>` : ''}
    </article>
  `;
}

function projectViewTabs() {
  const tabs = [
    ['board', 'Board', 'board'],
    ['timeline', 'Timeline', 'time'],
    ['calendar', 'Calendar', 'calendar']
  ];
  return `
    <div class="project-board-tabs" aria-label="Project views">
      ${tabs.map(([key, label, iconKey]) => `
        <button class="${state.projectTracking.activeView === key ? 'active' : ''}" type="button" data-project-view="${key}">
          ${icon(iconKey)} ${escapeHtml(label)}
        </button>
      `).join('')}
    </div>
  `;
}

function projectKanbanBoard(projects) {
  const columns = projectBoardColumns(projects);
  return `
    <section class="project-board-shell">
      ${projectViewTabs()}
      <div class="project-board">
        ${columns.map(({ stage, projects: columnProjects }) => `
          <section class="project-board-column stage-${slug(stage)}">
            <div class="project-board-column-head">
              <div>
                <span></span>
                <strong>${escapeHtml(stage)}</strong>
                <small>${columnProjects.length}</small>
              </div>
              <button class="icon-button" type="button" aria-label="${escapeHtml(stage)} options">&#8942;</button>
            </div>
            <div class="project-board-list">
              ${columnProjects.map(projectBoardCard).join('') || `
                <div class="project-empty-column">
                  <strong>No projects</strong>
                  <span>Import or move cards into this status.</span>
                </div>
              `}
            </div>
          </section>
        `).join('')}
      </div>
    </section>
  `;
}

function projectTimelineView(projects) {
  const rows = [...projects].sort((a, b) => compareDates(a.kickoff_date, b.kickoff_date) || compareText(a.customer_name, b.customer_name));
  return `
    <section class="project-board-shell">
      ${projectViewTabs()}
      <div class="panel project-timeline-panel">
        ${rows.map((project) => `
          <article class="project-timeline-card stage-${slug(projectStageGroup(project))}">
            <div class="project-timeline-card-head">
              <div>
                <strong>${escapeHtml(project.customer_name || project.project_name || '-')}</strong>
                <span>${escapeHtml(project.project_name || '-')}</span>
              </div>
              ${projectStageBadge(project)}
            </div>
            <div class="project-timeline-line">
              ${projectDateFields(project).map(({ stage, field }) => {
                const filled = Boolean(project[field]);
                return `
                  <label class="${filled ? 'filled' : ''}">
                    <i></i>
                    <span>${escapeHtml(stage)}</span>
                    <strong>${project[field] ? escapeHtml(displayDate(project[field])) : '-'}</strong>
                    <input type="date" value="${escapeHtml(project[field] ?? '')}" data-project-id="${project.id}" data-project-field="${field}" aria-label="${escapeHtml(stage)} date">
                  </label>
                `;
              }).join('')}
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function projectCalendarEvents(projects) {
  const events = [];
  for (const project of projects) {
    for (const { stage, field } of projectDateFields(project)) {
      if (!project[field]) continue;
      events.push({ project, stage, date: project[field], month: monthKey(project[field]) });
    }
  }
  return events.sort((a, b) => compareDates(a.date, b.date) || compareText(a.project.customer_name, b.project.customer_name));
}

function projectCalendarView(projects) {
  const events = projectCalendarEvents(projects);
  const months = [...new Set(events.map((event) => event.month))];
  return `
    <section class="project-board-shell">
      ${projectViewTabs()}
      <div class="project-calendar-grid">
        ${months.map((month) => `
          <section class="panel project-calendar-month">
            <div class="panel-title">
              <h2>${escapeHtml(periodLabel(month))}</h2>
              <span>${events.filter((event) => event.month === month).length} milestones</span>
            </div>
            <div class="project-calendar-list">
              ${events.filter((event) => event.month === month).map((event) => `
                <article class="project-calendar-event stage-${slug(projectStageGroup(event.project))}">
                  <time>${escapeHtml(displayDate(event.date))}</time>
                  <div>
                    <strong>${escapeHtml(event.stage)}</strong>
                    <span>${escapeHtml(event.project.customer_name || event.project.project_name || '-')}</span>
                  </div>
                  ${projectStageBadge(event.project)}
                </article>
              `).join('')}
            </div>
          </section>
        `).join('') || `
          <section class="panel project-empty-board">
            <h2>No dated milestones</h2>
            <p class="subtle">Add milestone dates from Board or Timeline view.</p>
          </section>
        `}
      </div>
    </section>
  `;
}

function projectActiveView(projects) {
  const renderers = {
    board: projectKanbanBoard,
    timeline: projectTimelineView,
    calendar: projectCalendarView
  };
  if (!renderers[state.projectTracking.activeView]) state.projectTracking.activeView = 'board';
  return renderers[state.projectTracking.activeView](projects);
}

function projectInput(project, field, type = 'text') {
  const value = project[field] ?? '';
  return `<input class="project-cell-input" type="${type}" value="${escapeHtml(value)}" data-project-id="${project.id}" data-project-field="${field}">`;
}

function projectPackageSelect(project) {
  return `
    <select class="project-cell-input project-package-select" data-project-id="${project.id}" data-project-field="package_type">
      ${['Lite', 'Pro', 'Pro+'].map((pack) => `<option value="${escapeHtml(pack)}" ${project.package_type === pack ? 'selected' : ''}>${escapeHtml(pack)}</option>`).join('')}
    </select>
  `;
}

function projectStageSelect(project) {
  return `
    <select class="project-cell-input" data-project-id="${project.id}" data-project-field="stage">
      ${projectStages.map((stage) => `<option value="${escapeHtml(stage)}" ${project.stage === stage ? 'selected' : ''}>${escapeHtml(stage)}</option>`).join('')}
    </select>
  `;
}

function projectTextarea(project, field) {
  return `<textarea class="project-cell-input project-note-input" rows="2" data-project-id="${project.id}" data-project-field="${field}">${escapeHtml(project[field] ?? '')}</textarea>`;
}

function projectTimeline(project) {
  const grouped = projectStageGroup(project);
  const activeIndex = ['Kick-off', 'Onboarding', 'Training', 'GoLive'].indexOf(grouped);
  const milestones = [
    ['Kick-off', 'kickoff_date'],
    ['Onboarding', 'onboarding_date'],
    ['Training', 'training_date'],
    ['GoLive', 'golive_date']
  ];

  if (grouped === 'On Hold') {
    return `
      <div class="project-timeline-row on-hold">
        <div class="project-hold-banner">On Hold outside active pipeline</div>
        <div class="project-timeline">
          ${milestones.map(([stage, field]) => projectTimelineStep(project, stage, field, false, false)).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="project-timeline-row">
      <div class="project-timeline">
        ${milestones.map(([stage, field], index) => projectTimelineStep(project, stage, field, index <= activeIndex, index === activeIndex)).join('')}
      </div>
    </div>
  `;
}

function projectTimelineStep(project, stage, field, complete, current) {
  const date = project[field] ?? '';
  return `
    <div class="timeline-step ${complete ? 'complete' : ''} ${current ? 'current' : ''}">
      <div class="timeline-dot"></div>
      <div class="timeline-step-body">
        <strong>${escapeHtml(stage)}</strong>
        <input type="date" value="${escapeHtml(date)}" data-project-id="${project.id}" data-project-field="${field}" aria-label="${escapeHtml(stage)} date">
      </div>
    </div>
  `;
}

function renderProjectDashboard() {
  const projects = state.projectTrackingProjects;
  const m = projectMetrics(projects);
  const latest = state.projectTrackingBatches[0];

  return renderShell(`
    ${projectPageHeader('Project Tracking Dashboard', 'Implementation pipeline, timeline health, and executive project status.')}
    <section class="panel project-import-panel">
      <div>
        <div class="section-label">Excel Import</div>
        <h2>Implementation Project Data</h2>
        <p class="subtle">Upload the deal summary Excel file. Sales values, payment fields, and priority colors are ignored.</p>
      </div>
      <div class="project-import-actions">
        <input type="file" accept=".xlsx" data-action="project-xlsx-file">
        <button class="button primary" data-action="upload-project-xlsx">${icon('upload')} Import Excel</button>
        <button class="button" data-action="add-project">Add Project</button>
      </div>
      <div class="project-import-meta">
        ${latest ? `Latest: <strong>${escapeHtml(middleEllipsis(latest.filename, 34))}</strong> / ${latest.valid_rows} projects / ${displayDate(latest.imported_at)}` : 'No project workbook imported yet.'}
      </div>
    </section>

    <section class="project-dashboard-toolbar">
      <div>
        <div class="section-label">${escapeHtml(projectModeLabel())}</div>
        <strong>${escapeHtml(projectModeWindowText())}</strong>
      </div>
      <div class="segmented-control" aria-label="Project dashboard display mode">
        <button class="${state.projectTracking.viewMode === 'monthly' ? 'active' : ''}" data-project-mode="monthly">Monthly</button>
        <button class="${state.projectTracking.viewMode === 'twice-weekly' ? 'active' : ''}" data-project-mode="twice-weekly">Twice-weekly</button>
      </div>
    </section>

    <section class="cards project-kpis">
      ${card('Total Projects', m.total, 'Active implementation records')}
      ${card('Total Users', m.users, 'Imported user count total')}
      ${card('Pipeline Projects', m.pipeline, 'Excludes On Hold')}
      ${card('In Progress', m.inProgress, 'Kick-off, onboarding, training')}
      ${card('On Hold', m.onHold, 'Counted outside active pipeline')}
      ${card('Total GoLive', m.goLive, 'GoLive and warranty grouped')}
    </section>

    <section class="dashboard-main-grid project-chart-grid">
      ${projectPieChart(projects)}
      ${chart('Package Distribution', countProjectsByPackage(projects), { caption: 'Projects by package', limit: 10 })}
    </section>
    ${projectAttentionRows(projects)}

    ${projects.length ? projectActiveView(projects) : `
      <section class="panel project-empty-board">
        <h2>No project data yet</h2>
        <p class="subtle">Import the Excel workbook to populate the board.</p>
      </section>
    `}
  `);
}

function renderPlaceholder(title, status) {
  const isEtaxgo = title.toLowerCase().startsWith('etaxgo');
  return renderShell(`
    ${pageHeader(title, status)}
    <section class="placeholder-panel ${isEtaxgo ? 'etaxgo-placeholder' : ''}">
      ${isEtaxgo ? brandLogo('etaxgo', 'eTaxGo', 'placeholder-logo') : '<div class="module-icon large">&#9638;</div>'}
      <h2>${escapeHtml(title)}</h2>
      <p class="subtle">${escapeHtml(status)}</p>
      <div class="toolbar">
        <button class="button primary" data-view="home">Back to Hub</button>
        <button class="button" data-view="dashboard">Open Venio Issue</button>
      </div>
    </section>
  `);
}

function renderDashboard() {
  const items = filteredIssues();
  const m = metrics(items);
  return renderShell(`
    ${pageHeader('Issue Insight Dashboard', 'Customer Service issue visibility and product feedback focus.')}
    ${filterPanel()}
    <section class="cards">
      ${card('Total Issues', m.total, 'All filtered issues')}
      ${card('Open Issues / งานค้าง', m.open, 'Requires CS follow-up')}
      ${card('Resolved Issues', m.resolved, 'Done or resolved')}
      ${card('High Priority', m.high, 'High, Highest, Critical')}
      ${card(`Pending > ${state.settings.pending_warning_hours}h`, m.pendingWarning, 'Warning threshold')}
      ${card(`Critical > ${state.settings.pending_critical_hours}h`, m.pendingCritical, 'Critical threshold')}
      ${card('Average Time to Solve', `${m.avgSolve.toFixed(1)}h`, 'Resolved workload speed')}
      ${card('Average Pending Age', `${m.avgPending.toFixed(1)}h`, 'Current unresolved age')}
      ${card('Oldest Pending', m.oldestPending ? `${number(m.oldestPending.pending_age_hours).toFixed(1)}h` : '-', m.oldestPending?.issue_key ?? '')}
      ${card('Most Affected Customer', m.customer, 'ลูกค้าที่กระทบสูงสุด')}
      ${card('Most Common Issue Type', m.issueType, 'Repeated issue pattern')}
      ${card('Most Common Category', m.category, 'Venio product focus')}
    </section>
    <section class="grid-2">
      <div class="panel">
        <h2>Feedback Summary / สรุปสำหรับทีม Product</h2>
        <p class="report-summary">${escapeHtml(feedbackSummary(items))}</p>
      </div>
      ${renderComparison(items)}
    </section>
    <section class="grid-3" style="margin-top:12px">
      ${chart('Issues by Status Category', countBy(items, 'status_category'))}
      ${chart('Issues by Priority', countBy(items, 'priority'))}
      ${chart('Issues by Issue Type', countBy(items, 'issue_type'))}
      ${chart('Issues by Venio Category', countByVenioCategory(items), { caption: 'Venio project only' })}
      ${chart('Issues by Customer Code', countBy(items, 'customer_code'))}
      ${chart('Issues by Project Name', countBy(items, 'project_name'))}
      ${chart('Reported Issues Over Time', countByDate(items, 'report_date'))}
      ${chart('Resolved Issues Over Time', countByDate(items, 'resolved_date'))}
      ${chart('Avg Time to Solve by Category', averageBy(venioIssues(items), 'venio_category_final', 'time_to_solve_hours'), { decimals: 1, caption: 'Venio project only' })}
      ${chart('Avg Pending Age by Category', averageBy(venioIssues(items).filter((issue) => !isResolved(issue)), 'venio_category_final', 'pending_age_hours'), { decimals: 1, caption: 'Venio project only' })}
      ${chart('Slowest Resolved Issues', items.filter((issue) => issue.time_to_solve_hours).sort((a, b) => number(b.time_to_solve_hours) - number(a.time_to_solve_hours)).slice(0, 8).map((issue) => [issue.issue_key, number(issue.time_to_solve_hours)]), { decimals: 1 })}
      ${chart('Longest Pending Issues', items.filter((issue) => !isResolved(issue)).sort((a, b) => number(b.pending_age_hours) - number(a.pending_age_hours)).slice(0, 8).map((issue) => [issue.issue_key, number(issue.pending_age_hours)]), { decimals: 1 })}
    </section>
  `);
}

function trendDirection(current, previous) {
  if (!previous && current) return { label: 'New volume', tone: 'watch', value: '+100%' };
  if (!previous && !current) return { label: 'No movement', tone: 'ok', value: '0%' };
  const change = ((current - previous) / previous) * 100;
  const tone = change > 0 ? 'danger' : change < 0 ? 'ok' : '';
  return {
    label: change > 0 ? 'Increased vs prior month' : change < 0 ? 'Decreased vs prior month' : 'Flat vs prior month',
    tone,
    value: `${change > 0 ? '+' : ''}${change.toFixed(Math.abs(change) >= 10 ? 0 : 1)}%`
  };
}

function trendSvg(data) {
  if (!data.length) return '';
  const width = 520;
  const height = 120;
  const pad = 12;
  const max = Math.max(1, ...data.map(([, value]) => value));
  const step = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0;
  const points = data.map(([, value], index) => {
    const x = data.length > 1 ? pad + index * step : width / 2;
    const y = height - pad - (value / max) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `
    <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly issue volume trend">
      <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${data.map(([, value], index) => {
        const [x, y] = points.split(' ')[index].split(',');
        return `<circle cx="${x}" cy="${y}" r="5"><title>${value} issues</title></circle>`;
      }).join('')}
    </svg>
  `;
}

function renderMonthlyVolumePanel(items) {
  const typeOptions = issueTypeOptions(items);
  const selectedType = state.dashboard.issue_type;
  const scoped = selectedType ? items.filter((issue) => issue.issue_type === selectedType) : items;
  const monthly = countByPeriod(scoped, 'month').filter(([key]) => key !== 'Unknown');
  const max = Math.max(1, ...monthly.map(([, value]) => value));
  const current = monthly.at(-1)?.[1] ?? 0;
  const previous = monthly.at(-2)?.[1] ?? 0;
  const trend = trendDirection(current, previous);

  return `
    <section class="panel monthly-volume-panel">
      <div class="panel-title dashboard-panel-title">
        <div>
          <h2>Issue Volume by Month</h2>
          <span>Compare monthly intake and filter by issue type</span>
        </div>
        ${dashboardSelect('issue_type', 'Issue Type', selectedType, [
          { value: '', label: 'All issue types' },
          ...typeOptions.map((type) => ({ value: type, label: type }))
        ])}
      </div>
      <div class="monthly-volume-layout">
        <div class="monthly-bars" aria-label="Monthly issue volume bars">
          ${monthly.map(([key, value]) => `
            <div class="monthly-bar-item">
              <div class="monthly-bar-track">
                <div class="monthly-bar-fill" style="height:${Math.max(6, (value / max) * 100)}%"></div>
              </div>
              <strong>${value}</strong>
              <span>${periodLabel(key)}</span>
            </div>
          `).join('') || '<div class="subtle">Import Jira data to see monthly trend.</div>'}
        </div>
        <div class="trend-card ${trend.tone}">
          <span>Latest Movement</span>
          <strong>${escapeHtml(trend.value)}</strong>
          <small>${escapeHtml(trend.label)}</small>
          ${trendSvg(monthly)}
        </div>
      </div>
    </section>
  `;
}

function donutSegments(entries) {
  const colors = ['#0275e0', '#ffc505', '#6bb8ff', '#fb7185', '#8b5cf6', '#22c55e', '#f97316', '#14b8a6', '#64748b', '#dc2626'];
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (!total) return { total, background: 'conic-gradient(var(--ink-soft) 0 100%)', legend: [] };
  let cursor = 0;
  const segments = entries.map(([label, value], index) => {
    const start = cursor;
    const end = cursor + (value / total) * 100;
    cursor = end;
    const color = colors[index % colors.length];
    return { label, value, color, segment: `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%` };
  });
  return { total, background: `conic-gradient(${segments.map((item) => item.segment).join(', ')})`, legend: segments };
}

function renderIssueTypeDistribution(items) {
  const grain = state.dashboard.distribution_grain === 'quarter' ? 'quarter' : 'month';
  const options = periodOptions(items, grain);
  const selected = options.includes(state.dashboard.distribution_period)
    ? state.dashboard.distribution_period
    : options.at(-1) ?? '';
  const scoped = selected ? items.filter((issue) => (grain === 'quarter' ? quarterKey(issue.report_date) : monthKey(issue.report_date)) === selected) : items;
  const entries = countBy(scoped, 'issue_type').slice(0, 10);
  const donut = donutSegments(entries);

  return `
    <section class="panel distribution-panel">
      <div class="panel-title dashboard-panel-title">
        <div>
          <h2>Issue Type Distribution</h2>
          <span>Donut view by ${grain}</span>
        </div>
        <div class="dashboard-controls">
          ${dashboardSelect('distribution_grain', 'Group', grain, [
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: 'Quarter' }
          ])}
          ${dashboardSelect('distribution_period', 'Period', selected, periodSelectOptions(options))}
        </div>
      </div>
      <div class="distribution-layout">
        <div class="donut-chart" style="--donut:${donut.background}">
          <div><strong>${donut.total}</strong><span>issues</span></div>
        </div>
        <div class="donut-legend">
          ${donut.legend.map((item) => `
            <div>
              <span style="--legend:${item.color}"></span>
              <strong>${escapeHtml(item.label)}</strong>
              <small>${item.value} / ${formatPercent(percent(item.value, donut.total))}</small>
            </div>
          `).join('') || '<div class="subtle">No issue type data yet.</div>'}
        </div>
      </div>
    </section>
  `;
}

function renderResolutionRateChart(items) {
  const monthOptions = periodOptions(items, 'month');
  const selectedMonths = (state.dashboard.resolution_months ?? []).filter((month) => monthOptions.includes(month));
  const scoped = selectedMonths.length
    ? items.filter((issue) => selectedMonths.includes(monthKey(issue.report_date)))
    : items;
  const entries = resolutionEntries(scoped);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const closed = (entries.find(([label]) => label === 'Done')?.[1] ?? 0)
    + (entries.find(([label]) => label === 'Not a Bug')?.[1] ?? 0);
  const colors = {
    Done: 'var(--green)',
    'Not a Bug': 'var(--yellow)',
    'Unresolved/Pending': 'var(--red)'
  };
  const scopeLabel = selectedMonths.length
    ? selectedMonths.map(periodLabel).join(', ')
    : 'All months';

  return `
    <div class="panel resolution-rate-panel">
      <div class="panel-title dashboard-panel-title">
        <div>
          <h2>Resolution Rate Chart</h2>
          <span>${escapeHtml(scopeLabel)} / ${formatPercent(percent(closed, total))} closed or not a bug</span>
        </div>
      </div>
      <div class="resolution-months" aria-label="Filter resolution chart by month">
        ${monthOptions.map((month) => `
          <label class="month-toggle">
            <input type="checkbox" data-dashboard-month value="${escapeHtml(month)}" ${selectedMonths.includes(month) ? 'checked' : ''}>
            <span>${escapeHtml(periodLabel(month))}</span>
          </label>
        `).join('') || '<span class="subtle">Import Jira data to filter by month.</span>'}
      </div>
      <div class="resolution-stack" aria-label="Resolution status distribution">
        ${entries.map(([label, value]) => `
          <div
            class="resolution-segment ${slug(label)}"
            style="width:${total ? Math.max(2, percent(value, total)) : 0}%; --resolution-color:${colors[label]}"
            title="${escapeHtml(label)}: ${value} issues"
          ></div>
        `).join('')}
      </div>
      <div class="resolution-cards">
        ${entries.map(([label, value]) => {
          const cardLabel = label === 'Unresolved/Pending' ? 'Unresolved' : label;
          return `
          <div class="resolution-card ${slug(label)}">
            <span title="${escapeHtml(label)}">${escapeHtml(cardLabel)}</span>
            <strong>${value}</strong>
            <small>${formatPercent(percent(value, total))} of selected issues</small>
          </div>
        `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderPeriodDetail(items, grain = 'month') {
  const rows = countByPeriod(items, grain).filter(([key]) => key !== 'Unknown').map(([key, total]) => {
    const periodItems = items.filter((issue) => (grain === 'quarter' ? quarterKey(issue.report_date) : monthKey(issue.report_date)) === key);
    const opened = openIssues(periodItems).length;
    const high = periodItems.filter(isHighPriority).length;
    const topType = countBy(periodItems, 'issue_type')[0]?.[0] ?? '-';
    const topProject = countBy(periodItems, 'project_name')[0]?.[0] ?? '-';
    return { key, total, opened, high, topType, topProject };
  });

  return `
    <section class="panel period-detail-panel">
      <div class="panel-title">
        <h2>${grain === 'quarter' ? 'Quarter Detail' : 'Monthly Detail'}</h2>
        <span>${rows.length} periods</span>
      </div>
      <div class="table-wrap compact-table">
        <table>
          <thead><tr><th>Period</th><th>Total</th><th>Open</th><th>High Priority</th><th>Top Issue Type</th><th>Top Project</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td><strong>${escapeHtml(periodLabel(row.key))}</strong></td>
                <td>${row.total}</td>
                <td>${row.opened}</td>
                <td>${row.high}</td>
                <td>${escapeHtml(row.topType)}</td>
                <td>${escapeHtml(row.topProject)}</td>
              </tr>
            `).join('') || '<tr><td colspan="6">No data yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function productFocusHighlights(items) {
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

function renderProductFocusSummary(items) {
  const highlights = productFocusHighlights(items);
  return `
    <section class="panel product-focus-panel">
      <div class="panel-title">
        <div>
          <h2>CS Feedback for Product Focus</h2>
          <span>Where product should look first based on support signal</span>
        </div>
      </div>
      <div class="focus-grid">
        ${highlights.map((item) => `
          <div class="focus-card">
            <span>${escapeHtml(item.title)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <p>${escapeHtml(item.hint)}</p>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderExecutiveDashboard() {
  const items = filteredIssues();
  const profile = riskProfile(items);
  const { m } = profile;
  const resolutionRate = formatPercent(percent(m.resolved, m.total));
  const openRate = formatPercent(profile.openRate);
  const latest = state.batches[0];
  const dateRange = latest
    ? `${displayDate(latest.min_report_date) || '-'} to ${displayDate(latest.max_report_date) || '-'}`
    : 'No imported period';

  return renderShell(`
    ${pageHeader('Issue Intelligence Dashboard', 'Monthly and quarterly service issue signal for product focus.')}
    ${filterPanel()}
    <section class="executive-kpis">
      ${executiveKpi('Total Issues', m.total, 'Current filtered dataset')}
      ${executiveKpi('Open Backlog', m.open, `${openRate} of all issues`, m.open ? 'watch' : 'ok')}
      ${executiveKpi('Critical Aging', m.pendingCritical, `Over ${state.settings.pending_critical_hours}h`, m.pendingCritical ? 'danger' : 'ok')}
      ${executiveKpi('High Priority Pending', profile.highPending, 'High, Highest, Critical still open', profile.highPending ? 'danger' : 'ok')}
      ${executiveKpi('Avg Pending Age', `${m.avgPending.toFixed(1)}h`, 'Open issues only', m.avgPending > settingNumber('pending_warning_hours') ? 'watch' : '')}
      ${executiveKpi('Top Customer Impact', profile.topCustomer[0], `${profile.topCustomer[1]} issue${profile.topCustomer[1] === 1 ? '' : 's'}`)}
    </section>
    <section class="dashboard-main-grid">
      ${renderMonthlyVolumePanel(items)}
      ${renderIssueTypeDistribution(items)}
    </section>
    ${renderProductFocusSummary(items)}
    <section class="period-detail-grid">
      ${renderPeriodDetail(items, 'month')}
      ${renderPeriodDetail(items, 'quarter')}
    </section>
    <section class="deep-dive">
      <div class="section-label">Operational Detail</div>
      <div class="dashboard-grid">
        ${chart('Backlog Flow', countBy(items, 'status_category'), { caption: 'Where work sits now' })}
        ${chart('Issue Types Overall', countBy(items, 'issue_type'), { caption: 'All filtered data' })}
        ${chart('Priority Mix', countBy(items, 'priority'), { caption: `${m.high} high-priority total` })}
        ${renderResolutionRateChart(items)}
        ${renderTopPending(items)}
        ${chart('Customer Impact', knownAccountCount(items), { caption: 'Largest affected accounts', limit: 7 })}
      </div>
    </section>
    <section class="panel deep-dive-summary">
      <div class="section-label">Leadership Readout</div>
      <p class="report-summary">${escapeHtml(feedbackSummary(items))}</p>
      <div class="executive-meta">
        <span>Imported period: <strong>${escapeHtml(dateRange)}</strong></span>
        <span>Filtered scope: <strong>${m.total}</strong> issues</span>
        <span>Resolution rate: <strong>${resolutionRate}</strong></span>
      </div>
    </section>
  `);
}

function renderTopPending(items) {
  const rows = items
    .filter((issue) => !isResolved(issue))
    .sort((a, b) => number(b.pending_age_hours) - number(a.pending_age_hours))
    .slice(0, 6);

  return `
    <div class="panel watchlist-panel">
      <div class="panel-title">
        <h2>Aging Watchlist</h2>
        <span>Top open issues by age</span>
      </div>
      <div class="watchlist">
        ${rows.map((issue) => `
          <button class="watch-row" data-open-issue="${issue.id}">
            <span class="watch-key">${escapeHtml(issue.issue_key)}</span>
            <span class="watch-summary">${escapeHtml(issue.summary || '-')}</span>
            <span class="watch-meta">${escapeHtml(issue.priority || '-')} / ${escapeHtml(isVenioIssue(issue) ? categoryForIssue(issue) : issue.project_name || 'Non-Venio')}</span>
            <strong class="${pendingLevel(issue) || ''}">${number(issue.pending_age_hours).toFixed(1)}h</strong>
          </button>
        `).join('') || '<div class="subtle">No pending issues.</div>'}
      </div>
    </div>
  `;
}

function renderCategoryPriorities(items) {
  const scopedVenioIssues = venioIssues(items);
  const rows = countByVenioCategory(items).slice(0, 5).map(([category, total]) => {
    const categoryIssues = scopedVenioIssues.filter((issue) => categoryForIssue(issue) === category);
    const open = categoryIssues.filter((issue) => !isResolved(issue)).length;
    const critical = categoryIssues.filter((issue) => pendingLevel(issue) === 'critical').length;
    const avgPending = avg(categoryIssues.filter((issue) => !isResolved(issue)), 'pending_age_hours');
    return { category, total, open, critical, avgPending };
  });

  return `
    <div class="panel priority-panel">
      <div class="panel-title">
        <h2>Product Improvement Priorities</h2>
        <span>Venio project only</span>
      </div>
      <div class="priority-list">
        ${rows.map((row) => `
          <div class="priority-row">
            <div>
              <strong>${escapeHtml(row.category)}</strong>
              <span>${row.total} total / ${row.open} open</span>
            </div>
            <div class="priority-score ${row.critical ? 'danger' : row.open ? 'watch' : 'ok'}">
              ${row.critical ? `${row.critical} critical` : `${row.avgPending.toFixed(1)}h avg`}
            </div>
          </div>
        `).join('') || '<div class="subtle">No category data.</div>'}
      </div>
    </div>
  `;
}

function countByDate(items, field) {
  const counts = new Map();
  for (const item of items) {
    const date = dateValue(item[field]);
    if (!date) continue;
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function renderComparison(items) {
  const from = state.comparison.from;
  const to = state.comparison.to;
  let body = '<div class="subtle">Select a target period to compare against the previous equal-length period.</div>';
  if (from && to) {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59`);
    const span = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - span);
    const inPeriod = (issue, a, b) => {
      const date = dateValue(issue.report_date);
      return date && date >= a && date <= b;
    };
    const current = items.filter((issue) => inPeriod(issue, start, end));
    const previous = items.filter((issue) => inPeriod(issue, previousStart, previousEnd));
    const cm = metrics(current);
    const pm = metrics(previous);
    body = `
      <div class="grid-2">
        <div class="field"><span>Current Period</span><p>${from} to ${to}<br>Total: ${cm.total}<br>Pending: ${cm.open}<br>Resolved: ${cm.resolved}<br>High pending: ${current.filter((issue) => isHighPriority(issue) && !isResolved(issue)).length}<br>Avg solve: ${cm.avgSolve.toFixed(1)}h<br>Avg pending: ${cm.avgPending.toFixed(1)}h</p></div>
        <div class="field"><span>Previous Equal Period</span><p>${previousStart.toISOString().slice(0, 10)} to ${previousEnd.toISOString().slice(0, 10)}<br>Total: ${pm.total}<br>Pending: ${pm.open}<br>Resolved: ${pm.resolved}<br>High pending: ${previous.filter((issue) => isHighPriority(issue) && !isResolved(issue)).length}<br>Avg solve: ${pm.avgSolve.toFixed(1)}h<br>Avg pending: ${pm.avgPending.toFixed(1)}h</p></div>
      </div>
    `;
  }
  return `
    <div class="panel">
      <h2>2-Week vs 2-Week Comparison</h2>
      <div class="toolbar" style="margin:10px 0">
        <input type="date" data-comparison="from" value="${escapeHtml(from)}">
        <input type="date" data-comparison="to" value="${escapeHtml(to)}">
      </div>
      ${body}
    </div>
  `;
}

function renderBoard() {
  const items = filteredIssues();
  const columns = ['To Do', 'In Progress', 'Done', 'Other'];
  const groups = new Map(columns.map((column) => [column, []]));
  for (const issue of items) {
    const key = columns.includes(issue.status_category) ? issue.status_category : 'Other';
    groups.get(key).push(issue);
  }
  return renderShell(`
    ${pageHeader('Issue Board', 'Operational board grouped by current status category.')}
    ${filterPanel()}
    <section class="board">
      ${columns.map((column) => `
        <div class="column">
          <div class="column-head"><h2>${column}</h2><span class="pill">${groups.get(column).length}</span></div>
          ${groups.get(column).map(issueCard).join('') || '<div class="subtle">No issues</div>'}
        </div>
      `).join('')}
    </section>
  `);
}

function issueCard(issue) {
  const level = pendingLevel(issue);
  const high = isHighPriority(issue) ? 'high-priority' : '';
  const pending = number(issue.pending_age_hours);
  const categoryBadge = isVenioIssue(issue)
    ? `<span class="mini-badge">${escapeHtml(categoryForIssue(issue))}</span>`
    : '';
  return `
    <button class="issue-card ${level} ${high}" data-open-issue="${issue.id}">
      <span class="issue-card-labels">
        <span class="label-strip priority-${slug(issue.priority)}"></span>
        ${isVenioIssue(issue) ? '<span class="label-strip category-label"></span>' : ''}
      </span>
      <strong>${escapeHtml(issue.summary)}</strong>
      <span class="issue-key">${escapeHtml(issue.issue_key)}</span>
      <span class="subtle">${escapeHtml(issue.issue_type)} for ${escapeHtml(issue.customer_code || '-')}</span>
      <span class="issue-card-footer">
        ${statusPill(issue.status)}
        ${categoryBadge}
        <span class="mini-badge ${level}">${pending.toFixed(1)}h</span>
      </span>
    </button>
  `;
}

function middleEllipsis(value, limit = 28) {
  const text = norm(value);
  if (text.length <= limit) return text;
  const keep = Math.floor((limit - 3) / 2);
  return `${text.slice(0, keep)}...${text.slice(-keep)}`;
}

function renderTable() {
  const items = filteredIssues();
  return renderShell(`
    ${pageHeader('Issue Table', 'Detailed issue view with active filters applied to reports.')}
    ${filterPanel()}
    ${issueTable(items)}
  `);
}

function issueTable(items) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${sortableTh('Issue Key', 'issue_key')}
            ${sortableTh('Summary', 'summary')}
            ${sortableTh('Customer', 'customer')}
            ${sortableTh('Issue Type', 'type')}
            ${sortableTh('Priority', 'priority')}
            ${sortableTh('Status', 'status')}
            ${sortableTh('Status Category', 'status_category')}
            ${sortableTh('Venio Category', 'category')}
            ${sortableTh('Report Date', 'newest')}
            ${sortableTh('Updated', 'updated')}
            ${sortableTh('Resolved', 'resolved')}
            ${sortableTh('Time to Solve', 'solve')}
            ${sortableTh('Pending Age', 'pending')}
          </tr>
        </thead>
        <tbody>
          ${items.map((issue) => `
            <tr data-open-issue="${issue.id}">
              <td><strong>${escapeHtml(issue.issue_key)}</strong></td>
              <td class="subject">${escapeHtml(issue.summary)}</td>
              <td>${escapeHtml(issue.customer_code || '-')}</td>
              <td>${escapeHtml(issue.issue_type || '-')}</td>
              <td>${priorityPill(issue.priority)}</td>
              <td>${statusPill(issue.status)}</td>
              <td>${escapeHtml(issue.status_category || '-')}</td>
              <td>${escapeHtml(categoryForIssue(issue))}</td>
              <td>${formatDate(issue.report_date)}</td>
              <td>${formatDate(issue.last_updated_date)}</td>
              <td>${formatDate(issue.resolved_date)}</td>
              <td>${issue.time_to_solve_hours ?? '-'}</td>
              <td>${issue.pending_age_hours ?? '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function sortableTh(label, sortKey) {
  const active = state.filters.sort === sortKey || (sortKey === 'newest' && state.filters.sort === 'oldest');
  const direction = state.filters.sort === 'oldest' ? 'asc' : state.filters.sort_dir;
  const arrow = active ? (direction === 'asc' ? '&#8593;' : '&#8595;') : '&#8597;';
  return `
    <th>
      <button class="table-sort ${active ? 'active' : ''}" type="button" data-table-sort="${sortKey}">
        <span>${escapeHtml(label)}</span>
        <span class="sort-arrow">${arrow}</span>
      </button>
    </th>
  `;
}

function renderUpload() {
  const latest = state.batches[0];
  return renderShell(`
    ${pageHeader('Normalized CSV Upload', 'Import prepared dashboard CSV files with calculated report dates and aging fields.')}
    <section class="grid-2">
      <div class="panel">
        <div class="upload-box">
          <div>
            <h2>Select Prepared Dashboard CSV</h2>
            <p class="subtle">Use this page when your file already has Report Date, Last Updated Date, Resolved Date, Time to Solve, and Pending Age columns.</p>
            <p><input type="file" accept=".csv,text/csv" data-action="csv-file" multiple></p>
            <button class="button primary" data-action="upload-csv">Upload CSV Files</button>
          </div>
        </div>
      </div>
      <div class="panel">
        <h2>Example File Shape</h2>
        ${importExample('Prepared dashboard CSV', [
          ['Use this for', 'tickets_export_with_dates or manually prepared issue CSV'],
          ['Date columns', 'Report Date, Last Updated Date, Resolved Date (Proxy)'],
          ['Aging columns', 'Time to Solve (hrs), Pending Age (hrs)'],
          ['Best when', 'Data is already cleaned for this dashboard']
        ])}
      </div>
    </section>
    <section class="panel" style="margin-top:12px">
      <h2>Latest Import</h2>
        ${latest ? `
          <div class="detail-grid" style="margin-top:10px">
            <div class="field"><span>Filename</span><p>${escapeHtml(latest.filename)}</p></div>
            <div class="field"><span>Imported</span><p>${formatDate(latest.imported_at)}</p></div>
            <div class="field"><span>Total Rows</span><p>${latest.total_rows}</p></div>
            <div class="field"><span>Valid Rows</span><p>${latest.valid_rows}</p></div>
            <div class="field"><span>Skipped Rows</span><p>${latest.skipped_rows}</p></div>
            <div class="field"><span>Duplicate Keys</span><p>${latest.duplicate_count}</p></div>
            <div class="field"><span>Min Report Date</span><p>${formatDate(latest.min_report_date)}</p></div>
            <div class="field"><span>Max Report Date</span><p>${formatDate(latest.max_report_date)}</p></div>
          </div>
        ` : '<p class="subtle">No imports yet.</p>'}
    </section>
    <section class="panel" style="margin-top:12px">
      <h2>Upload History</h2>
      ${historyTable()}
    </section>
  `);
}

function renderJiraUpload() {
  const latest = state.batches[0];
  return renderShell(`
    ${pageHeader('Raw Jira Import', 'Import Jira issue exports directly from Venio or eTaxGo and calculate dashboard fields automatically.')}
    <section class="grid-2">
      <div class="panel">
        <div class="upload-box">
          <div>
            <h2>Select Raw Jira CSV</h2>
            <p class="subtle">Use this page for files like Jira_Venio_April.csv, Jira_Venio_May.csv, Jira_eTax_April.csv, and Jira_eTax_May.csv.</p>
            <p><input type="file" accept=".csv,text/csv" data-action="jira-file" multiple></p>
            <button class="button primary" data-action="upload-jira-csv">Import Jira CSV Files</button>
          </div>
        </div>
      </div>
      <div class="panel">
        <h2>Example File Shape</h2>
        ${importExample('Raw Jira export CSV', [
          ['Use this for', 'Jira exports downloaded directly from Jira'],
          ['Date columns', 'Created, Updated, Resolved'],
          ['Resolution field', 'Resolution is used for Done vs Not a Bug charting'],
          ['Calculated by app', 'Report Date, Last Updated Date, Resolved Date, Time to Solve, Pending Age'],
          ['Repeated headers', 'Attachment, Labels, Watchers, Comment are safely ignored unless needed']
        ])}
      </div>
    </section>
    <section class="grid-2" style="margin-top:12px">
      <div class="panel">
        <h2>Required Jira Columns</h2>
        <div class="chip-row import-chip-row">
          ${jiraRequiredColumns.map((column) => `<span class="chip">${escapeHtml(column)}</span>`).join('')}
        </div>
      </div>
      <div class="panel">
        <h2>Latest Import</h2>
        ${latest ? `
          <div class="detail-grid" style="margin-top:10px">
            <div class="field"><span>Filename</span><p>${escapeHtml(latest.filename)}</p></div>
            <div class="field"><span>Imported</span><p>${formatDate(latest.imported_at)}</p></div>
            <div class="field"><span>Total Rows</span><p>${latest.total_rows}</p></div>
            <div class="field"><span>Valid Rows</span><p>${latest.valid_rows}</p></div>
          </div>
        ` : '<p class="subtle">No imports yet.</p>'}
      </div>
    </section>
    <section class="panel" style="margin-top:12px">
      <h2>Upload History</h2>
      ${historyTable()}
    </section>
  `);
}

function importExample(title, rows) {
  return `
    <div class="detail-list import-example-list">
      <div class="detail-item full"><span>File type</span><strong>${escapeHtml(title)}</strong></div>
      ${rows.map(([label, value]) => `<div class="detail-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}
    </div>
  `;
}

function historyTable() {
  return `
    <div class="table-wrap" style="margin-top:10px">
      <table>
        <thead><tr><th>Imported</th><th>Filename</th><th>Total</th><th>Valid</th><th>Skipped</th><th>Duplicates</th><th>Report Range</th></tr></thead>
        <tbody>
          ${state.batches.map((batch) => `
            <tr>
              <td>${formatDate(batch.imported_at)}</td>
              <td>${escapeHtml(batch.filename)}</td>
              <td>${batch.total_rows}</td>
              <td>${batch.valid_rows}</td>
              <td>${batch.skipped_rows}</td>
              <td>${batch.duplicate_count}</td>
              <td>${formatDate(batch.min_report_date)} - ${formatDate(batch.max_report_date)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderSettings() {
  return renderShell(`
    ${pageHeader('Settings', 'Configure thresholds, dark mode, and category keyword rules.')}
    <section class="settings-grid">
      <div class="panel">
        <h2>Threshold Rules</h2>
        <div class="stack" style="margin-top:12px">
          ${settingInput('pending_warning_hours', 'Pending Warning Hours')}
          ${settingInput('pending_critical_hours', 'Pending Critical Hours')}
          ${settingInput('solve_warning_hours', 'Time to Solve Warning Hours')}
          ${settingInput('solve_critical_hours', 'Time to Solve Critical Hours')}
          <label class="inline"><input type="checkbox" data-setting="dark_mode" ${state.settings.dark_mode === 'true' ? 'checked' : ''}> Dark mode</label>
          <button class="button primary" data-action="save-settings">Save Settings</button>
        </div>
      </div>
      <div class="panel">
        <h2>Category Keyword Rules</h2>
        <div class="toolbar" style="margin:10px 0">
          <select data-new-rule="category">${categories.filter((category) => category !== 'Uncategorized').map((category) => `<option>${category}</option>`).join('')}</select>
          <input data-new-rule="keyword" placeholder="Keyword">
          <select data-new-rule="language"><option>EN</option><option>TH</option><option>Any</option></select>
          <input data-new-rule="weight" type="number" value="8" min="1" max="20">
          <button class="button" data-action="add-rule">Add Rule</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Active</th><th>Category</th><th>Keyword</th><th>Language</th><th>Weight</th><th>Save</th></tr></thead>
            <tbody>
              ${state.rules.map((rule) => `
                <tr>
                  <td><input type="checkbox" data-rule="${rule.id}" data-rule-field="active" ${rule.active ? 'checked' : ''}></td>
                  <td><input value="${escapeHtml(rule.category)}" data-rule="${rule.id}" data-rule-field="category"></td>
                  <td><input value="${escapeHtml(rule.keyword)}" data-rule="${rule.id}" data-rule-field="keyword"></td>
                  <td><input value="${escapeHtml(rule.language)}" data-rule="${rule.id}" data-rule-field="language"></td>
                  <td><input type="number" value="${escapeHtml(rule.weight)}" data-rule="${rule.id}" data-rule-field="weight"></td>
                  <td><button class="button" data-save-rule="${rule.id}">Save</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `);
}

function settingInput(key, label) {
  return `<label><span class="subtle">${label}</span><br><input type="number" data-setting="${key}" value="${escapeHtml(state.settings[key])}"></label>`;
}

function projectFieldLabel(field) {
  return {
    customer_name: 'Customer',
    project_name: 'Project',
    package_type: 'Package',
    user_count: 'Users',
    stage: 'Stage',
    kickoff_date: 'Kick-off',
    onboarding_date: 'Onboarding',
    training_date: 'Training',
    golive_date: 'GoLive'
  }[field] ?? field;
}

function projectDraftInput(project, index, field, type = 'text') {
  return `<input class="project-review-input" type="${type}" value="${escapeHtml(project[field] ?? '')}" data-project-draft-index="${index}" data-project-draft-field="${field}" aria-label="${escapeHtml(projectFieldLabel(field))}">`;
}

function projectDraftPackage(project, index) {
  return `
    <select class="project-review-input" data-project-draft-index="${index}" data-project-draft-field="package_type" aria-label="Package">
      <option value="">Select</option>
      ${['Lite', 'Pro', 'Pro+'].map((pack) => `<option value="${escapeHtml(pack)}" ${project.package_type === pack ? 'selected' : ''}>${escapeHtml(pack)}</option>`).join('')}
    </select>
  `;
}

function projectDraftStage(project, index) {
  return `
    <select class="project-review-input" data-project-draft-index="${index}" data-project-draft-field="stage" aria-label="Stage">
      ${projectStages.map((stage) => `<option value="${escapeHtml(stage)}" ${project.stage === stage ? 'selected' : ''}>${escapeHtml(stage)}</option>`).join('')}
    </select>
  `;
}

function projectImportModal() {
  const review = state.projectTracking.importReview;
  if (!review) return '';
  const projects = review.projects ?? [];
  const missingCount = projects.reduce((sum, project) => sum + (project.missing_fields?.length ?? projectMissingFields(project).length), 0);
  return `
    <div class="modal-backdrop project-review-backdrop" data-project-review-backdrop>
      <article class="modal project-review-modal">
        <div class="modal-head">
          <div>
            <div class="section-label">Import Review</div>
            <h2>${escapeHtml(review.filename || 'Project workbook')}</h2>
            <div class="modal-meta">
              <span>${review.validRows ?? projects.length} matched projects</span>
              <span>${review.skippedRows ?? 0} skipped rows</span>
              <span>${missingCount} blank dashboard fields</span>
            </div>
          </div>
          <button class="icon-button modal-close" type="button" aria-label="Close import review" data-action="close-project-import-review">${icon('close')}</button>
        </div>
        <div class="project-review-summary">
          <div class="insight-line ${missingCount ? 'watch' : 'ok'}">
            <div><span>Before dashboard import</span><strong>${missingCount ? 'Review blanks' : 'Ready'}</strong></div>
            <p>Only rows matching the Venio implementation pipeline are shown. Fill the missing fields you need for presentation, then import.</p>
          </div>
        </div>
        <div class="table-wrap project-review-wrap">
          <table class="project-review-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer / Project</th>
                <th>Package</th>
                <th>Users</th>
                <th>Stage</th>
                <th>Kick-off</th>
                <th>Onboarding</th>
                <th>Training</th>
                <th>GoLive</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              ${projects.map((project, index) => {
                const missing = project.missing_fields?.length ? project.missing_fields : projectMissingFields(project);
                return `
                  <tr>
                    <td class="project-row-index">${index + 1}</td>
                    <td>
                      ${projectDraftInput(project, index, 'customer_name')}
                      ${projectDraftInput(project, index, 'project_name')}
                    </td>
                    <td>${projectDraftPackage(project, index)}</td>
                    <td>${projectDraftInput(project, index, 'user_count', 'number')}</td>
                    <td>${projectDraftStage(project, index)}</td>
                    <td>${projectDraftInput(project, index, 'kickoff_date', 'date')}</td>
                    <td>${projectDraftInput(project, index, 'onboarding_date', 'date')}</td>
                    <td>${projectDraftInput(project, index, 'training_date', 'date')}</td>
                    <td>${projectDraftInput(project, index, 'golive_date', 'date')}</td>
                    <td>${missing.length ? `<span class="project-review-chip">${missing.map(projectFieldLabel).join(', ')}</span>` : '<span class="project-ready-chip">Ready</span>'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="modal-actions">
          <button class="button" data-action="close-project-import-review">Cancel</button>
          <button class="button primary" data-action="confirm-project-import">${icon('upload')} Import ${projects.length} Projects</button>
        </div>
      </article>
    </div>
  `;
}

function projectEditModal() {
  const project = state.projectTrackingProjects.find((item) => item.id === state.selectedProjectId);
  if (!project) return '';
  const missing = projectMissingFields(project);
  const totalDays = projectDurationDays(project);
  const readonlyFields = [
    ['Source status', project.source_status || '-'],
    ['Source key', project.source_key || '-'],
    ['Updated', formatDate(project.updated_at)]
  ];
  return `
    <div class="modal-backdrop project-edit-backdrop" data-project-modal-backdrop>
      <article class="modal project-edit-modal">
        <div class="modal-head">
          <div>
            <div class="section-label">Project Edit</div>
            <h2>${escapeHtml(project.customer_name || project.project_name || 'Implementation project')}</h2>
            <div class="modal-meta">
              <span>${escapeHtml(projectStageGroup(project))}</span>
              <span>${totalDays}d total</span>
              <span>${missing.length ? `${missing.length} fields need review` : 'Ready'}</span>
            </div>
          </div>
          <button class="icon-button modal-close" type="button" aria-label="Close project editor" data-action="close-project-modal">${icon('close')}</button>
        </div>
        <div class="modal-body project-edit-body">
          <section class="modal-section">
            <h2>Project Details</h2>
            <div class="project-edit-grid">
              <label><span>Customer</span>${projectInput(project, 'customer_name')}</label>
              <label><span>Project</span>${projectInput(project, 'project_name')}</label>
              <label><span>Package</span>${projectPackageSelect(project)}</label>
              <label><span>Users</span>${projectInput(project, 'user_count', 'number')}</label>
              <label><span>Stage</span>${projectStageSelect(project)}</label>
            </div>
          </section>
          <section class="modal-section">
            <h2>Milestones</h2>
            <div class="project-edit-grid four">
              <label><span>Kick-off</span>${projectInput(project, 'kickoff_date', 'date')}</label>
              <label><span>Onboarding</span>${projectInput(project, 'onboarding_date', 'date')}</label>
              <label><span>Training</span>${projectInput(project, 'training_date', 'date')}</label>
              <label><span>GoLive</span>${projectInput(project, 'golive_date', 'date')}</label>
            </div>
          </section>
          <section class="modal-section">
            <h2>Notes</h2>
            <div class="project-edit-grid two">
              <label><span>Latest Notes</span>${projectTextarea(project, 'notes')}</label>
              <label><span>Timeline Info</span>${projectTextarea(project, 'timeline_info')}</label>
            </div>
          </section>
          <section class="modal-section">
            <h2>Import Metadata</h2>
            <div class="detail-list">
              ${readonlyFields.map(([label, value]) => `<div class="detail-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}
            </div>
          </section>
        </div>
        <div class="modal-actions">
          <button class="button" data-action="close-project-modal">Done</button>
          <button class="button project-delete-modal" data-delete-project="${project.id}">${icon('close')} Delete Project</button>
        </div>
      </article>
    </div>
  `;
}

function authModal() {
  if (!state.auth.modal) return '';
  const isRegister = state.auth.modal === 'register';
  return `
    <div class="modal-backdrop auth-backdrop" data-auth-backdrop>
      <article class="modal auth-modal">
        <div class="modal-head">
          <div>
            <div class="section-label">Account</div>
            <h2>${isRegister ? 'Register' : 'Sign in'}</h2>
            <div class="modal-meta">
              <span>Simple workspace login</span>
              <span>One dataset per user</span>
            </div>
          </div>
          <button class="icon-button modal-close" type="button" aria-label="Close account popup" data-action="close-auth">${icon('close')}</button>
        </div>
        <div class="modal-body auth-body">
          <label>
            <span>Username</span>
            <input data-auth-field="username" autocomplete="username" placeholder="your name">
          </label>
          <label>
            <span>Password</span>
            <input data-auth-field="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" placeholder="simple password">
          </label>
          <button class="button primary" data-action="auth-submit" data-mode="${state.auth.modal}">
            ${isRegister ? 'Create Account' : 'Sign In'}
          </button>
          <button class="button ghost" data-action="open-auth" data-mode="${isRegister ? 'signin' : 'register'}">
            ${isRegister ? 'I already have an account' : 'Create a new account'}
          </button>
          <p class="subtle">This is intentionally simple. Use a normal shared password only for low-risk dashboard data.</p>
        </div>
      </article>
    </div>
  `;
}

function modal() {
  const issue = state.issues.find((item) => item.id === state.selectedIssueId);
  if (!issue) return '';
  const fields = [
    ['Issue key', issue.issue_key],
    ['Issue Type', issue.issue_type],
    ['Status Category', issue.status_category],
    ['Project', issue.project_name],
    ['Project Type', issue.project_type],
    ['Customer', issue.customer_code || '-'],
    ['Report Date', formatDate(issue.report_date)],
    ['Last Updated', formatDate(issue.last_updated_date)],
    ['Resolved', formatDate(issue.resolved_date)],
    ['Time to Solve', issue.time_to_solve_hours ?? '-'],
    ['Pending Age', issue.pending_age_hours ?? '-']
  ];
  if (isVenioIssue(issue)) {
    fields.push(
      ['Auto Category', issue.venio_category_auto],
      ['Confidence', categoryConfidenceForIssue(issue)],
      ['Matching Rule', categoryRuleForIssue(issue)]
    );
  }
  const description = norm(issue.description);
  return `
    <div class="modal-backdrop" data-modal-backdrop>
      <article class="modal">
        <div class="modal-head">
          <div>
            <div class="issue-card-labels">
              <span class="label-strip priority-${slug(issue.priority)}"></span>
              ${isVenioIssue(issue) ? '<span class="label-strip category-label"></span>' : ''}
            </div>
            <h2>${escapeHtml(issue.summary)}</h2>
            <div class="modal-meta">
              <span>${escapeHtml(issue.issue_key)}</span>
              ${statusPill(issue.status)}
              ${priorityPill(issue.priority)}
            </div>
          </div>
          <button class="icon-button modal-close" type="button" aria-label="Close issue detail" data-action="close-modal"><span data-action="close-modal">${icon('close')}</span></button>
        </div>
        <div class="modal-body modal-layout">
          <div class="modal-main">
            <section class="modal-section">
              <h2>Details</h2>
              <div class="detail-list">
                ${fields.map(([label, value]) => `<div class="detail-item"><span>${label}</span><strong>${escapeHtml(value ?? '-')}</strong></div>`).join('')}
              </div>
            </section>
            <section class="modal-section">
              <div class="panel-title">
                <h2>Description</h2>
              </div>
              <p class="full-description-text">${escapeHtml(description) || '-'}</p>
            </section>
          </div>
          <aside class="modal-side">
            ${isVenioIssue(issue) ? `
              <div class="modal-side-card">
                <h2>Venio Category</h2>
                <div class="current-category">${escapeHtml(categoryForIssue(issue, 'Uncategorized'))}</div>
                <select data-manual-category="${issue.id}">
                  ${categories.map((category) => `<option ${category === categoryForIssue(issue, 'Uncategorized') ? 'selected' : ''}>${category}</option>`).join('')}
                </select>
                <button class="button primary" data-action="save-category" data-id="${issue.id}">Save Category</button>
              </div>
            ` : `
              <div class="modal-side-card">
                <h2>Venio Category</h2>
                <div class="current-category muted-category">Not applicable</div>
                <p class="subtle">Category rules apply only to project_name Venio or VENIO-* issues.</p>
              </div>
            `}
            <div class="modal-side-card">
              <h2>Internal Notes</h2>
              <textarea data-note="${issue.id}" placeholder="Add internal note"></textarea>
              <button class="button" data-action="add-note" data-id="${issue.id}">Add Note</button>
              <div class="note-list">
                ${(issue.notes ?? []).map((note) => `<div class="note-item"><span>${formatDate(note.created_at)}</span><p>${escapeHtml(note.note)}</p></div>`).join('') || '<div class="subtle">No notes yet.</div>'}
              </div>
            </div>
          </aside>
        </div>
      </article>
    </div>
  `;
}

function render() {
  document.body.classList.toggle('dark', state.settings.dark_mode === 'true');
  document.body.classList.toggle('theme-etaxgo', state.view === 'etaxgo-issue');
  if (!state.auth.user) {
    document.title = 'Sign in | Customer Service Team Hub';
    document.body.classList.remove('theme-etaxgo');
    app.innerHTML = renderAuthGate();
    return;
  }
  const titles = {
    home: 'Customer Service Team Hub',
    'project-dashboard': 'Project Dashboard | Customer Service Team Hub',
    'crisp-performance': 'Crisp Chat Performance | Customer Service Team Hub',
    'etaxgo-issue': 'eTaxGo Issue | Customer Service Team Hub',
    upload: 'Venio Issue Upload | Customer Service Team Hub',
    'jira-upload': 'Raw Jira Import | Customer Service Team Hub',
    dashboard: 'Venio Issue Dashboard | Customer Service Team Hub',
    board: 'Venio Issue Board | Customer Service Team Hub',
    table: 'Venio Issue Table | Customer Service Team Hub',
    settings: 'Venio Issue Settings | Customer Service Team Hub'
  };
  document.title = titles[state.view] ?? 'Customer Service Team Hub';
  const favicon = document.querySelector('#favicon');
  if (favicon) favicon.href = state.view === 'etaxgo-issue' ? brandAssets.etaxgo : brandAssets.venio;
  const views = {
    home: renderLanding,
    'project-dashboard': renderProjectDashboard,
    'crisp-performance': () => renderPlaceholder('Crisp Chat Performance', 'Not yet available.'),
    'etaxgo-issue': () => renderPlaceholder('eTaxgo Issue', 'Not configured yet.'),
    upload: renderUpload,
    'jira-upload': renderJiraUpload,
    dashboard: renderExecutiveDashboard,
    board: renderBoard,
    table: renderTable,
    settings: renderSettings
  };
  state.lastShellHtml = (views[state.view] ?? renderLanding)();
  app.innerHTML = state.lastShellHtml;
}

function renderOverlayOnly() {
  if (!state.auth.user) {
    render();
    return;
  }
  const modalHtml = `${modal()}${projectEditModal()}${projectImportModal()}`;
  const toastHtml = state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : '';
  const existingModal = app.querySelectorAll('.modal-backdrop');
  const existingToast = app.querySelector('.toast');
  existingModal.forEach((item) => item.remove());
  existingToast?.remove();
  app.insertAdjacentHTML('beforeend', `${modalHtml}${toastHtml}`);
}

function parseCsvText(text) {
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

  const headers = (rows[0] ?? []).map((header) => header.replace(/^\uFEFF/, '').trim());
  const records = rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  return { headers, records };
}

function maxId(items) {
  return Math.max(0, ...(items ?? []).map((item) => Number(item.id) || 0));
}

async function loadDemoSeed() {
  try {
    const response = await fetch('/demo-data.json', { cache: 'no-store' });
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

function currentStorageKey() {
  return state.auth.user?.username
    ? `${STORAGE_KEY}:user:${state.auth.user.username}`
    : STORAGE_KEY;
}

async function saveRemoteStore(store) {
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

function createDefaultStore(seed = {}) {
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
    nextProjectBatchId: maxId(projectTrackingBatches) + 1
  };
}

function loadClientStore(seed = {}) {
  try {
    const stored = JSON.parse(localStorage.getItem(currentStorageKey()) || 'null');
    return stored ? { ...createDefaultStore(seed), ...stored } : createDefaultStore(seed);
  } catch {
    return createDefaultStore(seed);
  }
}

function saveClientStore(store) {
  localStorage.setItem(currentStorageKey(), JSON.stringify(store));
  void saveRemoteStore(store);
}

function clientBootstrap(store = loadClientStore()) {
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
  saveClientStore(store);
  return {
    issues: store.issues ?? [],
    batches: store.batches ?? [],
    projectTrackingProjects: store.projectTrackingProjects ?? [],
    projectTrackingBatches: store.projectTrackingBatches ?? [],
    settings: store.settings ?? {},
    rules: store.rules ?? []
  };
}

function detectClientCategory(issue, rules) {
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
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
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

function normalizedIssueFromRow(row) {
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

function jiraIssueFromRow(row, importedAt = new Date().toISOString()) {
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

function importClientCsv(filename, content, format = 'normalized') {
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

async function clientApi(path, options = {}) {
  const store = loadClientStore(await loadDemoSeed());
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
    const projects = body.projects.map((project) => ({
      ...project,
      id: store.nextProjectId++,
      updated_at: now,
      created_at: now
    }));
    store.projectTrackingProjects = [...projects, ...(store.projectTrackingProjects ?? [])];
    store.projectTrackingBatches = [
      {
        id: Date.now(),
        filename: body.filename ?? 'project-tracking.xlsx',
        imported_at: now,
        total_rows: Number(body.totalRows ?? projects.length),
        valid_rows: projects.length,
        skipped_rows: Number(body.skippedRows ?? 0)
      },
      ...(store.projectTrackingBatches ?? [])
    ];
    saveClientStore(store);
    return {
      ok: true,
      validRows: projects.length,
      skippedRows: Number(body.skippedRows ?? 0),
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

async function api(path, options = {}) {
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

async function loadUserWorkspace() {
  let store = null;
  try {
    const response = await fetch('/api/user-store', {
      headers: { Authorization: `Bearer ${state.auth.token}` }
    });
    if (response.ok) {
      const payload = await response.json();
      store = payload.data;
    }
  } catch {
    store = null;
  }
  if (!store) store = createDefaultStore();
  localStorage.setItem(currentStorageKey(), JSON.stringify(store));
  if (state.auth.token) void saveRemoteStore(store);
  return clientBootstrap(store);
}

async function initialBootstrap() {
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

function applyBootstrap(payload) {
  state.issues = payload.issues ?? [];
  state.batches = payload.batches ?? [];
  state.projectTrackingProjects = payload.projectTrackingProjects ?? [];
  state.projectTrackingBatches = payload.projectTrackingBatches ?? [];
  state.settings = payload.settings ?? {};
  state.rules = payload.rules ?? [];
}

function resetFilters() {
  Object.assign(state.filters, {
    search: '',
    project_name: [],
    project_type: [],
    issue_type: [],
    status: [],
    status_category: [],
    priority: [],
    customer_code: [],
    venio_category_final: [],
    solved: '',
    overdue: '',
    report_from: '',
    report_to: '',
    updated_from: '',
    updated_to: '',
    resolved_from: '',
    resolved_to: '',
    pending_min: '',
    pending_max: '',
    solve_min: '',
    solve_max: '',
    sort: 'newest',
    sort_dir: 'desc'
  });
  state.activePreset = '';
}

function defaultSortDirection(sortKey) {
  return ['newest', 'updated', 'resolved', 'solve', 'pending', 'priority'].includes(sortKey) ? 'desc' : 'asc';
}

function applyTableSort(sortKey) {
  if (sortKey === 'newest' && state.filters.sort === 'newest') {
    state.filters.sort = 'oldest';
    state.filters.sort_dir = 'asc';
    return;
  }
  if (sortKey === 'newest' && state.filters.sort === 'oldest') {
    state.filters.sort = 'newest';
    state.filters.sort_dir = 'desc';
    return;
  }
  if (state.filters.sort === sortKey) {
    state.filters.sort_dir = state.filters.sort_dir === 'asc' ? 'desc' : 'asc';
    return;
  }
  state.filters.sort = sortKey;
  state.filters.sort_dir = defaultSortDirection(sortKey);
}

function applyPreset(name) {
  if (state.activePreset === name) {
    resetFilters();
    return;
  }
  resetFilters();
  state.activePreset = name;
  if (name === 'high') {
    state.filters.priority = unique('priority').filter((value) => ['high', 'highest', 'critical'].includes(value.toLowerCase()));
    state.filters.solved = 'unsolved';
  }
  if (name === '36') {
    state.filters.solved = 'unsolved';
    state.filters.pending_min = '36';
  }
  if (name === '24') {
    state.filters.solved = 'unsolved';
    state.filters.pending_min = '24';
  }
}

function exportExcel() {
  const items = filteredIssues();
  const sheets = [
    ['Summary', summaryRows(items)],
    ['All Issues', issueRows(items)],
    ['Pending Issues', issueRows(items.filter((issue) => !isResolved(issue)))],
    ['High Priority Pending', issueRows(items.filter((issue) => isHighPriority(issue) && !isResolved(issue)))],
    ['Over 36 Hours Pending', issueRows(items.filter((issue) => !isResolved(issue) && number(issue.pending_age_hours) > 36))],
    ['Venio Category Breakdown', breakdownRows(countByVenioCategory(items))],
    ['Customer Breakdown', breakdownRows(countBy(items, 'customer_code'))],
    ['Issue Type Breakdown', breakdownRows(countBy(items, 'issue_type'))],
    ['Slowest Resolved Issues', issueRows(items.filter((issue) => issue.time_to_solve_hours).sort((a, b) => number(b.time_to_solve_hours) - number(a.time_to_solve_hours)).slice(0, 50))],
    ['Comparison', comparisonRows(items)]
  ];
  const html = `
    <html><head><meta charset="UTF-8"></head><body>
      ${sheets.map(([name, rows]) => `<h2>${escapeHtml(name)}</h2>${rowsToTable(rows)}`).join('<br>')}
    </body></html>
  `;
  downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `venio-issue-report-${new Date().toISOString().slice(0, 10)}.xls`);
}

function summaryRows(items) {
  const m = metrics(items);
  return [
    ['Metric', 'Value'],
    ['Total issues', m.total],
    ['Pending issues', m.open],
    ['Resolved issues', m.resolved],
    ['High-priority issues', m.high],
    [`Pending over ${state.settings.pending_warning_hours}h`, m.pendingWarning],
    [`Critical pending over ${state.settings.pending_critical_hours}h`, m.pendingCritical],
    ['Average time to solve', m.avgSolve.toFixed(1)],
    ['Average pending age', m.avgPending.toFixed(1)],
    ['Most affected customer', m.customer],
    ['Most common issue type', m.issueType],
    ['Most common Venio category', m.category],
    ['Feedback summary', feedbackSummary(items)]
  ];
}

function issueRows(items) {
  return [
    ['Issue key', 'Summary', 'Issue Type', 'Status', 'Resolution', 'Project name', 'Project type', 'Priority', 'Description', 'Customer Code', 'Status Category', 'Report Date', 'Last Updated Date', 'Resolved Date', 'Time to Solve', 'Pending Age', 'Venio Category', 'Confidence', 'Threshold'],
    ...items.map((issue) => [
      issue.issue_key,
      issue.summary,
      issue.issue_type,
      issue.status,
      issue.issue_resolution,
      issue.project_name,
      issue.project_type,
      issue.priority,
      issue.description,
      issue.customer_code,
      issue.status_category,
      issue.report_date,
      issue.last_updated_date,
      issue.resolved_date,
      issue.time_to_solve_hours,
      issue.pending_age_hours,
      categoryForIssue(issue),
      categoryConfidenceForIssue(issue),
      pendingLevel(issue) || 'normal'
    ])
  ];
}

function breakdownRows(entries) {
  return [['Name', 'Count'], ...entries];
}

function comparisonRows(items) {
  return [['Comparison Summary'], [feedbackSummary(items)]];
}

function rowsToTable(rows) {
  return `<table border="1">${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell ?? '')}</td>`).join('')}</tr>`).join('')}</table>`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function printReport() {
  const items = filteredIssues();
  const report = window.open('', '_blank');
  report.document.write(`
    <!doctype html><html><head><title>Venio PDF Report</title><link rel="stylesheet" href="/styles.css"></head>
    <body>
      <main class="main">
        <h1>Venio Customer Service Issue Insight Report</h1>
        <p class="subtle">Generated ${new Date().toLocaleString()} · ${items.length} filtered issues</p>
        <section class="panel"><h2>Executive Summary</h2><p>${escapeHtml(feedbackSummary(items))}</p></section>
        <section class="cards" style="margin-top:12px">${summaryRows(items).slice(1, 7).map(([name, value]) => card(name, value, '')).join('')}</section>
        <section class="grid-2">
          ${chart('Key Issue Insights', countByVenioCategory(items), { caption: 'Venio project only' })}
          ${chart('Most Affected Customers', countBy(items, 'customer_code'))}
          ${chart('Most Common Bug/Issue Types', countBy(items, 'issue_type'))}
          ${chart('High-Priority Issues Not Handled Fast Enough', items.filter((issue) => isHighPriority(issue) && !isResolved(issue)).map((issue) => [issue.issue_key, number(issue.pending_age_hours)]), { decimals: 1 })}
          ${chart('Slowest Resolved Issues', items.filter((issue) => issue.time_to_solve_hours).sort((a, b) => number(b.time_to_solve_hours) - number(a.time_to_solve_hours)).slice(0, 10).map((issue) => [issue.issue_key, number(issue.time_to_solve_hours)]), { decimals: 1 })}
          ${chart('Pending Too Long', items.filter((issue) => !isResolved(issue)).sort((a, b) => number(b.pending_age_hours) - number(a.pending_age_hours)).slice(0, 10).map((issue) => [issue.issue_key, number(issue.pending_age_hours)]), { decimals: 1 })}
        </section>
        <section class="panel" style="margin-top:12px"><h2>Detailed Issue Appendix</h2>${issueTable(items)}</section>
      </main>
    </body></html>
  `);
  report.document.close();
  setTimeout(() => report.print(), 500);
}

app.addEventListener('click', async (event) => {
  const clickedElement = targetElementFromEvent(event);
  const actionElement = closestFromEvent(event, '[data-action]');
  const action = actionElement?.dataset.action;
  if (action) {
    if (action === 'close-modal') {
      state.selectedIssueId = null;
      renderOverlayOnly();
      return;
    }
    if (action === 'close-project-import-review') {
      state.projectTracking.importReview = null;
      renderOverlayOnly();
      return;
    }
    if (action === 'open-auth') {
      state.auth.modal = actionElement.dataset.mode || 'signin';
      renderOverlayOnly();
      return;
    }
    if (action === 'close-auth') {
      state.auth.modal = '';
      renderOverlayOnly();
      return;
    }
    if (action === 'auth-submit') {
      authSubmit(actionElement.dataset.mode || 'signin');
      return;
    }
    if (action === 'sign-out') {
      signOut();
      return;
    }
    if (action === 'close-project-modal') {
      state.selectedProjectId = null;
      renderOverlayOnly();
      return;
    }
    if (action === 'confirm-project-import') {
      confirmProjectImport();
      return;
    }
    if (action === 'reset-filters') {
      resetFilters();
      state.openFilter = '';
      state.openDatePicker = '';
      render();
      return;
    }
    if (action === 'print-report') {
      printReport();
      return;
    }
    if (action === 'export-excel') {
      exportExcel();
      return;
    }
    if (action === 'upload-csv') {
      uploadCsv('normalized');
      return;
    }
    if (action === 'upload-jira-csv') {
      uploadCsv('jira');
      return;
    }
    if (action === 'upload-project-xlsx') {
      uploadProjectWorkbook();
      return;
    }
    if (action === 'add-project') {
      addProject();
      return;
    }
    if (action === 'save-settings') {
      saveSettings();
      return;
    }
    if (action === 'add-rule') {
      saveRule();
      return;
    }
    if (action === 'save-category') {
      saveCategory(actionElement.dataset.id);
      return;
    }
    if (action === 'add-note') {
      addNote(actionElement.dataset.id);
      return;
    }
  }

  const dateOpen = closestFromEvent(event, '[data-date-open]')?.dataset.dateOpen;
  if (dateOpen) {
    const currentDate = dateValue(state.filters[dateOpen]) ?? new Date();
    state.openFilter = dateOpen;
    state.openDatePicker = state.openDatePicker === dateOpen ? '' : dateOpen;
    state.datePickerMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    render();
    return;
  }

  const dateNav = closestFromEvent(event, '[data-date-nav]');
  if (dateNav) {
    const month = state.datePickerMonth
      ? new Date(`${state.datePickerMonth}-01T00:00:00`)
      : new Date();
    month.setMonth(month.getMonth() + Number(dateNav.dataset.direction));
    state.openDatePicker = dateNav.dataset.dateNav;
    state.openFilter = dateNav.dataset.dateNav;
    state.datePickerMonth = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    render();
    return;
  }

  const dateSelect = closestFromEvent(event, '[data-date-select]');
  if (dateSelect) {
    const key = dateSelect.dataset.dateSelect;
    state.filters[key] = dateSelect.dataset.value;
    state.openFilter = key;
    state.openDatePicker = '';
    state.activePreset = '';
    render();
    return;
  }

  const dateClear = closestFromEvent(event, '[data-date-clear]')?.dataset.dateClear;
  if (dateClear) {
    state.filters[dateClear] = '';
    state.openFilter = dateClear;
    state.openDatePicker = '';
    state.activePreset = '';
    render();
    return;
  }

  const dateToday = closestFromEvent(event, '[data-date-today]')?.dataset.dateToday;
  if (dateToday) {
    state.filters[dateToday] = isoDate(new Date());
    state.openFilter = dateToday;
    state.openDatePicker = '';
    state.activePreset = '';
    render();
    return;
  }

  const tableSort = closestFromEvent(event, '[data-table-sort]')?.dataset.tableSort;
  if (tableSort) {
    applyTableSort(tableSort);
    state.openFilter = '';
    state.openDatePicker = '';
    render();
    return;
  }

  if (clickedElement?.matches('[data-project-review-backdrop]')) {
    state.projectTracking.importReview = null;
    renderOverlayOnly();
    return;
  }

  if (clickedElement?.matches('[data-project-modal-backdrop]')) {
    state.selectedProjectId = null;
    renderOverlayOnly();
    return;
  }

  if (clickedElement?.matches('[data-auth-backdrop]')) {
    state.auth.modal = '';
    renderOverlayOnly();
    return;
  }

  if (clickedElement?.matches('[data-modal-backdrop]')) {
    state.selectedIssueId = null;
    renderOverlayOnly();
    return;
  }

  const view = closestFromEvent(event, '[data-view]')?.dataset.view;
  if (view) {
    state.view = view;
    state.selectedProjectId = null;
    state.openFilter = '';
    state.openDatePicker = '';
    render();
    return;
  }

  const issueId = closestFromEvent(event, '[data-open-issue]')?.dataset.openIssue;
  if (issueId) {
    state.selectedIssueId = Number(issueId);
    renderOverlayOnly();
    return;
  }

  const preset = closestFromEvent(event, '[data-preset]')?.dataset.preset;
  if (preset) {
    applyPreset(preset);
    state.openFilter = '';
    state.openDatePicker = '';
    render();
  }

  const dashboardSelectOption = closestFromEvent(event, '[data-dashboard-select]');
  if (dashboardSelectOption) {
    const key = dashboardSelectOption.dataset.dashboardSelect;
    state.dashboard[key] = dashboardSelectOption.dataset.value ?? '';
    if (key === 'distribution_grain') state.dashboard.distribution_period = '';
    render();
    return;
  }

  const projectMode = closestFromEvent(event, '[data-project-mode]')?.dataset.projectMode;
  if (projectMode) {
    state.projectTracking.viewMode = projectMode;
    render();
    return;
  }

  const projectView = closestFromEvent(event, '[data-project-view]')?.dataset.projectView;
  if (projectView) {
    state.projectTracking.activeView = projectView;
    render();
    return;
  }

  const deleteProjectId = closestFromEvent(event, '[data-delete-project]')?.dataset.deleteProject;
  if (deleteProjectId) {
    deleteProject(Number(deleteProjectId));
    return;
  }

  const projectId = closestFromEvent(event, '[data-open-project]')?.dataset.openProject;
  if (projectId) {
    state.selectedProjectId = Number(projectId);
    renderOverlayOnly();
    return;
  }

  const ruleId = closestFromEvent(event, '[data-save-rule]')?.dataset.saveRule;
  if (ruleId) saveRule(Number(ruleId));
});

app.addEventListener('keydown', (event) => {
  if (!['Enter', ' '].includes(event.key)) return;
  const projectId = closestFromEvent(event, '[data-open-project]')?.dataset.openProject;
  if (!projectId) return;
  event.preventDefault();
  state.selectedProjectId = Number(projectId);
  renderOverlayOnly();
});

app.addEventListener('input', (event) => {
  const target = event.target;
  if (target.matches('[data-project-draft-field]')) {
    updateProjectImportDraft(target);
    return;
  }
  if (target.matches('[data-filter]')) {
    const key = target.dataset.filter;
    state.openFilter = key;
    if (target.multiple) {
      state.filters[key] = [...target.selectedOptions].map((option) => option.value);
    } else {
      state.filters[key] = target.value;
    }
    state.activePreset = '';
    render();
  }
});

app.addEventListener('change', (event) => {
  const target = event.target;
  if (target.matches('[data-project-draft-field]')) {
    updateProjectImportDraft(target);
    renderOverlayOnly();
    return;
  }
  if (target.matches('[data-filter-check]')) {
    const field = target.dataset.filterCheck;
    state.openFilter = field;
    state.filters[field] = [...app.querySelectorAll(`[data-filter-check="${field}"]:checked`)].map((input) => input.value);
    state.activePreset = '';
    render();
  }
  if (target.matches('[data-filter-one]')) {
    state.openFilter = '';
    state.filters[target.dataset.filterOne] = target.value;
    if (target.dataset.filterOne === 'sort') {
      state.filters.sort_dir = defaultSortDirection(target.value);
    }
    state.activePreset = '';
    render();
  }
  if (target.matches('[data-comparison]')) {
    state.comparison[target.dataset.comparison] = target.value;
    render();
  }
  if (target.matches('[data-dashboard]')) {
    const key = target.dataset.dashboard;
    state.dashboard[key] = target.multiple
      ? [...target.selectedOptions].map((option) => option.value)
      : target.value;
    if (key === 'distribution_grain') state.dashboard.distribution_period = '';
    render();
  }
  if (target.matches('[data-dashboard-month]')) {
    state.dashboard.resolution_months = [...app.querySelectorAll('[data-dashboard-month]:checked')]
      .map((input) => input.value);
    render();
  }
  if (target.matches('[data-project-field]')) {
    saveProjectField(target);
  }
});

async function uploadCsv(format = 'normalized') {
  const input = app.querySelector(format === 'jira' ? '[data-action="jira-file"]' : '[data-action="csv-file"]');
  const files = [...(input?.files ?? [])];
  if (!files.length) return toast('Select one or more CSV files first.');
  const endpoint = format === 'jira' ? '/api/import-jira' : '/api/import';
  let latestPayload = null;
  const results = [];
  try {
    for (const file of files) {
      const content = await file.text();
      const payload = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, content })
      });
      latestPayload = payload;
      results.push({ file: file.name, validRows: payload.validRows ?? 0, skippedRows: payload.skippedRows ?? 0 });
    }
    if (latestPayload) applyBootstrap(latestPayload);
    state.view = 'dashboard';
    const importedRows = results.reduce((sum, result) => sum + result.validRows, 0);
    const skippedRows = results.reduce((sum, result) => sum + result.skippedRows, 0);
    toast(`Imported ${files.length} file${files.length === 1 ? '' : 's'} / ${importedRows} rows. Skipped ${skippedRows}.`);
    render();
  } catch (error) {
    toast(`Import failed after ${results.length} file${results.length === 1 ? '' : 's'}: ${error.message}`);
    render();
  }
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

async function uploadProjectWorkbook() {
  const input = app.querySelector('[data-action="project-xlsx-file"]');
  const file = input?.files?.[0];
  if (!file) return toast('Select an Excel workbook first.');
  try {
    const content = await fileToBase64(file);
    const payload = await api('/api/project-tracking/preview', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, content })
    });
    if (!(payload.projects ?? []).length) {
      toast(`No matching Venio implementation projects found. Skipped ${payload.skippedRows ?? 0} rows.`);
      render();
      return;
    }
    state.projectTracking.importReview = payload;
    toast(`${payload.validRows ?? 0} matching projects found. Review missing fields before import.`);
    render();
  } catch (error) {
    toast(`Project import failed: ${error.message}`);
    render();
  }
}

function refreshProjectDraftReview(project) {
  project.missing_fields = projectMissingFields(project);
  project.needs_review = project.missing_fields.length > 0;
}

function updateProjectImportDraft(target) {
  const review = state.projectTracking.importReview;
  if (!review) return;
  const index = Number(target.dataset.projectDraftIndex);
  const field = target.dataset.projectDraftField;
  const project = review.projects?.[index];
  if (!project || !field) return;
  project[field] = target.value;
  refreshProjectDraftReview(project);
}

async function confirmProjectImport() {
  const review = state.projectTracking.importReview;
  if (!review) return;
  app.querySelectorAll('[data-project-draft-field]').forEach(updateProjectImportDraft);
  try {
    const payload = await api('/api/project-tracking/import', {
      method: 'POST',
      body: JSON.stringify({
        filename: review.filename,
        totalRows: review.totalRows,
        skippedRows: review.skippedRows,
        projects: review.projects
      })
    });
    state.projectTracking.importReview = null;
    applyBootstrap(payload);
    state.view = 'project-dashboard';
    toast(`Imported ${payload.validRows ?? 0} project rows. Skipped ${payload.skippedRows ?? 0}.`);
    render();
  } catch (error) {
    toast(`Project import failed: ${error.message}`);
    renderOverlayOnly();
  }
}

async function addProject() {
  try {
    const payload = await api('/api/project-tracking/projects', {
      method: 'POST',
      body: JSON.stringify({})
    });
    applyBootstrap(payload);
    state.view = 'project-dashboard';
    state.projectTracking.activeView = 'board';
    state.selectedProjectId = Number(payload.createdProjectId ?? state.projectTrackingProjects[0]?.id ?? 0) || null;
    toast('Project added. Fill in the dashboard fields.');
    render();
  } catch (error) {
    toast(`Add project failed: ${error.message}`);
    render();
  }
}

async function deleteProject(id) {
  const project = state.projectTrackingProjects.find((item) => item.id === id);
  if (!project) return;
  if (!window.confirm(`Delete ${project.customer_name || project.project_name || 'this project'}?`)) return;
  try {
    if (state.selectedProjectId === id) state.selectedProjectId = null;
    applyBootstrap(await api(`/api/project-tracking/projects/${id}`, {
      method: 'DELETE'
    }));
    toast('Project deleted.');
    render();
  } catch (error) {
    toast(`Delete project failed: ${error.message}`);
    render();
  }
}

async function saveProjectField(input) {
  const id = Number(input.dataset.projectId);
  const field = input.dataset.projectField;
  const value = input.value;
  const project = state.projectTrackingProjects.find((item) => item.id === id);
  if (!project || project[field] === value) return;

  project[field] = value;
  project.updated_at = new Date().toISOString();
  render();
  try {
    applyBootstrap(await api(`/api/project-tracking/projects/${id}`, {
      method: 'POST',
      body: JSON.stringify({ field, value })
    }));
    toast('Project updated.');
    render();
  } catch (error) {
    toast(`Project update failed: ${error.message}`);
    render();
  }
}

async function authSubmit(mode = 'signin') {
  const username = app.querySelector('[data-auth-field="username"]')?.value;
  const password = app.querySelector('[data-auth-field="password"]')?.value;
  try {
    const payload = await api(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    state.auth.token = payload.token;
    state.auth.user = payload.user;
    state.auth.modal = '';
    localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload.user));
    applyBootstrap(await loadUserWorkspace());
    toast(`${mode === 'register' ? 'Registered' : 'Signed in'} as ${payload.user.username}.`);
    render();
  } catch (error) {
    toast(error.message || 'Sign in failed.');
    renderOverlayOnly();
  }
}

function signOut(shouldRender = true) {
  state.auth.token = '';
  state.auth.user = null;
  state.auth.modal = '';
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  if (shouldRender) {
    toast('Signed out.');
    initialBootstrap().then((payload) => {
      applyBootstrap(payload);
      render();
    });
  }
}

async function saveSettings() {
  const settings = {};
  app.querySelectorAll('[data-setting]').forEach((input) => {
    settings[input.dataset.setting] = input.type === 'checkbox' ? String(input.checked) : input.value;
  });
  applyBootstrap(await api('/api/settings', { method: 'POST', body: JSON.stringify(settings) }));
  toast('Settings saved.');
  render();
}

async function saveRule(id = null) {
  let payload;
  if (id) {
    const fields = {};
    app.querySelectorAll(`[data-rule="${id}"]`).forEach((input) => {
      fields[input.dataset.ruleField] = input.type === 'checkbox' ? input.checked : input.value;
    });
    payload = { id, ...fields };
  } else {
    payload = {};
    app.querySelectorAll('[data-new-rule]').forEach((input) => {
      payload[input.dataset.newRule] = input.value;
    });
    payload.active = true;
  }
  applyBootstrap(await api('/api/rules', { method: 'POST', body: JSON.stringify(payload) }));
  toast('Rule saved.');
  render();
}

async function saveCategory(id) {
  const issue = state.issues.find((item) => item.id === Number(id));
  if (!issue || !isVenioIssue(issue)) {
    toast('Venio category applies only to Venio issues.');
    return;
  }
  const category = app.querySelector(`[data-manual-category="${id}"]`)?.value;
  applyBootstrap(await api(`/api/issues/${id}/category`, { method: 'POST', body: JSON.stringify({ category }) }));
  state.selectedIssueId = Number(id);
  toast('Category correction saved.');
  render();
}

async function addNote(id) {
  const note = app.querySelector(`[data-note="${id}"]`)?.value;
  applyBootstrap(await api(`/api/issues/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) }));
  state.selectedIssueId = Number(id);
  toast('Note added.');
  render();
}

function toast(message) {
  state.toast = message;
  setTimeout(() => {
    state.toast = '';
    render();
  }, 3000);
}

applyBootstrap(await initialBootstrap());
render();
