const app = document.querySelector('#app');
const STORAGE_KEY = 'customer_service_team_hub_demo_v1';

let _filteredCache = null;
let _searchDebounce = null;
let _pendingUploadFiles = [];
let _meetingEditPhotos = [null, null];
let _meetingNextId = 1;
const CRISP_AI_KEY = `${STORAGE_KEY}_crisp_ai`;
const MEETING_KEY = `${STORAGE_KEY}_meeting`;
const MANUAL_KEY = `${STORAGE_KEY}_manual`;

function loadCrispAiData() {
  try { return JSON.parse(localStorage.getItem(CRISP_AI_KEY) || '{}'); } catch { return {}; }
}
function saveCrispAiData() {
  localStorage.setItem(CRISP_AI_KEY, JSON.stringify(state.crisp.aiData));
}
function loadMeetingData() {
  try { return JSON.parse(localStorage.getItem(MEETING_KEY) || '{}'); } catch { return {}; }
}
function saveMeetingData() {
  localStorage.setItem(MEETING_KEY, JSON.stringify({ summaryData: state.meeting.summaryData, moments: state.meeting.moments }));
}
function loadManualData() {
  try { return JSON.parse(localStorage.getItem(MANUAL_KEY) || '{}'); } catch { return {}; }
}
function saveManualData() {
  localStorage.setItem(MANUAL_KEY, JSON.stringify({ entries: state.manual.entries }));
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
    importReview: null,
    importModal: false,
    timelineSort: { field: 'kickoff_date', dir: 'asc' },
    filters: {
      search: '',
      package_type: '',
      stage: '',
      review: ''
    }
  },
  venioView: 'dashboard',
  venioIssue: {
    selectedMonth: '',
    categorySort: 'desc'
  },
  etaxgoView: 'dashboard',
  etaxgoIssue: {
    selectedMonth: '',
    categorySort: 'desc'
  },
  etaxgoRules: [],
  over45EditingId: null,
  uploadModal: '',
  uploadLoading: false,
  uploadResult: null,
  uploadSelectedFiles: [],
  crisp: {
    operators: [],
    batches: [],
    months: [],
    activeView: 'performance',
    selectedMonth: '',
    aiData: loadCrispAiData()
  },
  meeting: {
    selectedMonth: '',
    summaryData: {},
    moments: [],
    editingMomentId: null,
    addMomentOpen: false,
    summaryModalOpen: false
  },
  manual: {
    selectedYear: '',
    selectedMonthFilter: '',
    entries: [],
    editMode: false,
    addModalOpen: false,
    editingEntryId: null
  }
};
const _meetingInit = loadMeetingData();
state.meeting.summaryData = _meetingInit.summaryData ?? {};
state.meeting.moments = _meetingInit.moments ?? [];
const _manualInit = loadManualData();
state.manual.entries = _manualInit.entries ?? [];

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
const projectSalesStageMappings = [
  { pattern: /\bplanning\b/, stage: 'Kick-off' },
  { pattern: /\bimplementation\b|\bimplement\b/, stage: 'Onboarding' },
  { pattern: /\btraining\b/, stage: 'Training' },
  { pattern: /\bin\s*progress\b|\binprogress\b/, stage: 'GoLive' },
  { pattern: /\bwarranty\b/, stage: 'GoLive' },
  { pattern: /\bhold\s*projects?\b|\bon\s*hold\b/, stage: 'On Hold' }
];

const defaultProjectTrackingFilters = {
  search: '',
  package_type: '',
  stage: '',
  review: ''
};

const labels = {
  home: 'Home',
  'project-dashboard': 'Project Dashboard',
  'crisp-performance': 'Crisp Chat',
  dashboard: 'Executive Briefing',
  board: 'Issue Board',
  settings: 'Settings',
  'meeting': 'Venio Meeting',
  'manual': 'Venio Manual',
  'etaxgo-issue': 'eTaxGo Issue'
};

const brandAssets = {
  venio: './assets/venio-icon.svg'
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

const crispColumnLabels = {
  operator: 'Operator',
  conversations: 'Conversation Total',
  rating: 'Rating',
  firstResponseAverage: 'First Response time (Average)',
  firstResponseAverageSeconds: 'First Response average raw seconds',
  resolutionAverage: 'Resolution Time (Average)',
  resolutionAverageSeconds: 'Resolution average raw seconds'
};

const crispRequiredColumns = Object.keys(crispColumnLabels);

const crispColumnAliases = {
  operatorId: ['Operator Id', 'รหัสผู้ดำเนินการ'],
  operator: ['Operator', 'ผู้ดำเนินการ'],
  avatar: ['Operator Avatar', 'ผู้ดำเนินการAvatar', 'ผู้ดำเนินการ Avatar'],
  conversations: ['Conversation Total', 'การสนทนา รวม'],
  rating: ['ANALYTICS.FIELDS.OPTIONS.RATING'],
  firstResponseMedian: ['First Response time (Median)', 'เวลาตอบสนองครั้งแรก (มัธยฐาน)'],
  firstResponseMedianSeconds: ['First Response time (Median) Raw Value (Second)', 'เวลาตอบสนองครั้งแรก (มัธยฐาน) มูลค่าดิบ (วินาที)'],
  resolutionMedian: ['Resolution Time (Median)', 'เวลาแก้ไข (มัธยฐาน)'],
  resolutionMedianSeconds: ['Resolution Time (Median) Raw Value (Second)', 'เวลาแก้ไข (มัธยฐาน) มูลค่าดิบ (วินาที)'],
  firstResponseAverage: ['First Response time (Average)', 'เวลาตอบสนองครั้งแรก (เฉลี่ย)'],
  firstResponseAverageSeconds: ['First Response time (Average) Raw Value (Second)', 'เวลาตอบสนองครั้งแรก (เฉลี่ย) มูลค่าดิบ (วินาที)'],
  resolutionAverage: ['Resolution Time (Average)', 'เวลาแก้ไข (เฉลี่ย)'],
  resolutionAverageSeconds: ['Resolution Time (Average) Raw Value (Second)', 'เวลาแก้ไข (เฉลี่ย) มูลค่าดิบ (วินาที)']
};

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

function projectNameKey(value) {
  return norm(value).toLowerCase().replace(/\s+/g, ' ');
}

function normalizeProjectSalesStageStatus(value) {
  const text = norm(value).replace(/^\s*\d+\.\s*/, '').toLowerCase();
  if (!text) return '';
  return projectSalesStageMappings.find(({ pattern }) => pattern.test(text))?.stage ?? '';
}

function normalizeProjectImportRecord(project) {
  const sourceStatus = norm(project?.source_status);
  if (!sourceStatus || sourceStatus === 'Manual') return project;
  const stage = normalizeProjectSalesStageStatus(sourceStatus);
  return stage ? { ...project, stage } : null;
}

function normalizeProjectImportReview(review) {
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

function slug(value) {
  return norm(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value) {
  return dateOrNull(value);
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

const ETAXGO_CATEGORIES = [
  'PDF/Report', 'Doc Missing', 'Display/UI', 'Failed',
  'Email', 'API', 'Certificate', 'Batch', 'Coin', 'Other'
];

function normalizeEtaxGoCategoryName(value, fallback = 'Other') {
  const text = norm(value);
  if (!text) return fallback;
  const lowered = text.toLowerCase();
  if (lowered === 'failed status') return 'Failed';
  if (lowered === 'email/notification') return 'Email';
  return text;
}

function detectEtaxGoCategoryClient(issue, rules = state.etaxgoRules ?? []) {
  if (!isEtaxGoIssue(issue)) {
    return { category: null, confidence: null, rule: null };
  }
  const text = `${issue.summary ?? ''} ${issue.description ?? ''}`.toLowerCase();
  const matches = new Map();

  for (const rule of rules.filter((item) => item.active)) {
    const keyword = String(rule.keyword ?? '').toLowerCase().trim();
    if (!keyword) continue;
    if (text.includes(keyword)) {
      const category = normalizeEtaxGoCategoryName(rule.category);
      matches.set(category, (matches.get(category) ?? 0) + Number(rule.weight ?? 1));
    }
  }

  if (!matches.size) {
    return { category: 'Other', confidence: 'Low', rule: 'No matching rule' };
  }

  const sorted = [...matches.entries()].sort((a, b) => b[1] - a[1]);
  const [category, score] = sorted[0];
  const secondScore = sorted[1]?.[1] ?? 0;
  let confidence = 'Low';
  if (score >= 10 && score >= secondScore + 5) confidence = 'High';
  else if (score >= 8) confidence = 'Medium';
  return { category, confidence, rule: `${category} keyword score ${score}` };
}

function isEtaxGoIssue(issue) {
  return norm(issue.project_name).toLowerCase() === 'etaxgo' || norm(issue.issue_key).toUpperCase().startsWith('ETAXGO-');
}

function etaxGoIssues(items) {
  return items.filter(isEtaxGoIssue);
}

function categoryForEtaxGoIssue(issue, fallback = '-') {
  if (!isEtaxGoIssue(issue)) return fallback;
  const finalCategory = normalizeEtaxGoCategoryName(issue.venio_category_final, '');
  if (finalCategory) return finalCategory;
  return detectEtaxGoCategoryClient(issue).category || 'Other';
}

function countByEtaxGoCategory(items) {
  const counts = new Map();
  for (const issue of etaxGoIssues(items)) {
    const key = categoryForEtaxGoIssue(issue, 'Uncategorized');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function currentEtaxGoMonth() {
  return state.etaxgoIssue.selectedMonth || currentMonthKey();
}

function productionIssues(items) {
  return items.filter((issue) => norm(issue.issue_type) === 'Production Issue');
}

function boardColumns() {
  return ['To Do', 'In Progress', 'Done', 'Reject'];
}

function boardColumnForIssue(issue) {
  const statusCategory = norm(issue.status_category);
  if (boardColumns().includes(statusCategory)) return statusCategory;
  const rejectSignals = `${issue.status_category ?? ''} ${issue.status ?? ''} ${issue.issue_resolution ?? ''}`.toLowerCase();
  if (/reject|rejected|decline|declined|cancel|cancelled|duplicate|not a bug/.test(rejectSignals)) return 'Reject';
  return 'Reject';
}

function overDaysThreshold() {
  return settingNumber('over_days_threshold') || 45;
}

function projectDaysFromKickoff(project) {
  if (!project.kickoff_date) return null;
  const kickoff = new Date(project.kickoff_date);
  if (isNaN(kickoff.getTime())) return null;
  return Math.floor((Date.now() - kickoff.getTime()) / (1000 * 60 * 60 * 24));
}

function over45DaysProjects(projects) {
  const threshold = overDaysThreshold();
  return projects.filter((p) => {
    const days = projectDaysFromKickoff(p);
    if (days === null || days <= threshold) return false;
    return p.stage !== 'GoLive' && p.stage !== 'Warranty';
  });
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

function formatDurationSeconds(value) {
  const total = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function currentMonthKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
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
    category: '&#9673;',
    'meeting': '&#128197;',
    'manual': '&#128214;'
  };
  return icons[name] ?? '&bull;';
}

function moduleIcon(name) {
  const icons = {
    project: '&#9638;',
    crisp: '&#9711;',
    venio: 'V'
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
  return `
    <div class="card">
      <div class="card-label"><span>${escapeHtml(label)}</span></div>
      <div class="metric">${escapeHtml(value)}</div>
      ${hint ? `<div class="subtle">${escapeHtml(hint)}</div>` : ''}
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
  const rows = data.slice(0, options.limit ?? 8).map(([label, value]) => {
    const displayValue = `${Number(value).toFixed(decimals)}${unit}`;
    const tooltip = `${label}: ${displayValue}`;
    return `
    <div class="bar-row chart-hoverable" tabindex="0" aria-label="${escapeHtml(tooltip)}" data-chart-tooltip="${escapeHtml(tooltip)}">
      <div class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (value / max) * 100)}%"></div></div>
      <strong>${escapeHtml(displayValue)}</strong>
    </div>
  `;
  }).join('');
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
    { key: 'etaxgo-issue', label: labels['etaxgo-issue'] },
    { key: 'meeting', label: labels['meeting'] },
    { key: 'manual', label: labels['manual'] }
  ];
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-team-header">
          <div class="sidebar-team-avatar">&#128101;</div>
          <div class="sidebar-team-info">
            <div class="sidebar-team-label">Solution Consultant</div>
            <div class="sidebar-team-name">Team ATLAS</div>
          </div>
        </div>
        <nav class="nav">
          ${moduleNav.map((item) => `
            <button class="${state.view === item.key ? 'active' : ''}" data-view="${item.key}">
              <span class="nav-ico">${icon(item.key)}</span><span>${item.label}</span>
            </button>
          `).join('')}
        </nav>
        <div class="sidebar-footer">
          <div class="sidebar-footer-icon">&#129302;</div>
          <div class="sidebar-footer-dots">
            <span></span><span></span><span></span>
          </div>
          <div class="sidebar-footer-text">CS Team Hub<br>v1.0</div>
        </div>
      </aside>
      <main class="main">
        ${content}
      </main>
      ${modal()}
      ${projectEditModal()}
      ${projectImportModal()}
      ${projectAddImportModal()}
      ${genericUploadModal()}
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}
    </div>
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
        <button class="button" type="button" data-action="open-project-import-modal">${icon('upload')} Import</button>
      </div>
    </div>
  `;
}

function renderLanding() {
  const scopedVenioIssues = venioIssues(state.issues);
  const venioIssueCount = scopedVenioIssues.length;
  const venioOpen = metrics(scopedVenioIssues).open;
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
      status: 'Live',
      meta: `${state.crisp.operators.length} operators loaded`,
      action: 'Open workspace',
      variant: 'live',
      available: true
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
      key: 'meeting',
      icon: 'meeting',
      title: 'Venio Meeting',
      status: 'Live',
      meta: `Monthly meeting summary & on-site capture moments`,
      action: 'Open workspace',
      variant: 'live',
      available: true
    },
    {
      key: 'manual',
      icon: 'manual',
      title: 'Venio Manual',
      status: 'Live',
      meta: `Articles, improvements & videos by month`,
      action: 'Open workspace',
      variant: 'live',
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
        <div class="landing-auth-actions">
          <button class="landing-primary-action" data-view="dashboard" aria-label="Open Venio Issue workspace">Open Venio Issue</button>
        </div>
      </header>
      <section class="landing-hero">
        <div class="landing-copy">
          <div class="landing-kicker">Operations Intelligence</div>
          <h1>Choose a workspace</h1>
          <p>Select a workspace to get started.</p>
          <div class="landing-context-pills" aria-label="Venio CRM context">
            <span>Connecting your customers</span>
            <span>CRM</span>
            <span>Case</span>
            <span>Analytics</span>
          </div>
        </div>
      </section>
      <section class="workspace-section" aria-labelledby="workspace-title">
        <div class="workspace-section-head">
          <div>
            <h2 id="workspace-title">Workspaces</h2>
            <p>Open a live workspace.</p>
          </div>
        </div>
        <div class="module-grid">
          ${modules.map(workspaceCard).join('')}
        </div>
      </section>
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ''}
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

function packageDistributionStats(projects) {
  const stats = new Map();
  for (const project of projects) {
    const key = norm(project.package_type) || 'Unknown';
    const current = stats.get(key) ?? { label: key, projects: 0, users: 0 };
    current.projects += 1;
    current.users += number(project.user_count);
    stats.set(key, current);
  }
  return [...stats.values()].sort((a, b) => {
    if (b.projects !== a.projects) return b.projects - a.projects;
    if (b.users !== a.users) return b.users - a.users;
    return compareText(a.label, b.label);
  });
}

function packageDistributionChart(projects) {
  const rows = packageDistributionStats(projects);
  const maxProjects = Math.max(1, ...rows.map((row) => row.projects));
  const maxUsers = Math.max(1, ...rows.map((row) => row.users));
  return `
    <div class="panel chart-panel package-distribution-panel">
      <div class="panel-title">
        <h2>Package Distribution</h2>
        <span>Projects and total users by package</span>
      </div>
      <div class="package-distribution-list">
        ${rows.slice(0, 10).map((row) => `
          <div class="package-distribution-row chart-hoverable" tabindex="0" aria-label="${escapeHtml(`${row.label}: ${row.projects} projects, ${row.users} users`)}" data-chart-tooltip="${escapeHtml(`${row.label}: ${row.projects} projects, ${row.users} users`)}">
            <div class="package-distribution-label" title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</div>
            <div class="package-distribution-metrics">
              <div class="package-distribution-metric">
                <span class="package-distribution-key">Projects</span>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (row.projects / maxProjects) * 100)}%"></div></div>
                <strong>${row.projects}</strong>
              </div>
              <div class="package-distribution-metric users">
                <span class="package-distribution-key">Users</span>
                <div class="bar-track users"><div class="bar-fill bar-fill-users" style="width:${Math.max(row.users > 0 ? 3 : 0, (row.users / maxUsers) * 100)}%"></div></div>
                <strong>${row.users}</strong>
              </div>
            </div>
          </div>
        `).join('') || '<div class="subtle">No package data</div>'}
      </div>
    </div>
  `;
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

function projectPiePoint(angle, radius) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: 50 + Math.cos(radians) * radius,
    y: 50 + Math.sin(radians) * radius
  };
}

function projectPieSlicePolygon(startAngle, endAngle, outerRadius = 49.5, innerRadius = 26.7) {
  const sweep = Math.max(0, endAngle - startAngle);
  if (!sweep) return '';
  const steps = Math.max(6, Math.ceil(sweep / 12));
  const outer = [];
  const inner = [];
  for (let index = 0; index <= steps; index += 1) {
    const angle = startAngle + (sweep * index) / steps;
    const outerPoint = projectPiePoint(angle, outerRadius);
    const innerPoint = projectPiePoint(angle, innerRadius);
    outer.push(`${outerPoint.x.toFixed(2)}% ${outerPoint.y.toFixed(2)}%`);
    inner.unshift(`${innerPoint.x.toFixed(2)}% ${innerPoint.y.toFixed(2)}%`);
  }
  return [...outer, ...inner].join(', ');
}

function projectPieChart(projects) {
  const data = countProjectsByStage(projects);
  const totalProjects = projects.length;
  const total = Math.max(1, totalProjects);
  const colors = ['#4ea4f8', '#615cf6', '#22b873', '#14a38b', '#e64679'];
  let cursor = 0;
  const slices = data
    .map(([stage, value], index) => {
      if (value <= 0) return null;
      const start = cursor;
      cursor += (value / total) * 360;
      return {
        stage,
        value,
        color: colors[index],
        tooltip: `${stage}: ${value} project${value === 1 ? '' : 's'}`,
        clipPath: projectPieSlicePolygon(start, cursor)
      };
    })
    .filter(Boolean);

  return `
    <div class="panel project-pie-panel">
      <div class="panel-title">
        <h2>Project Stage Distribution</h2>
        <span>${totalProjects} projects</span>
      </div>
      <div class="project-pie-layout">
        <div class="project-pie" aria-label="Project stage distribution pie chart">
          <div class="project-pie-surface">
            ${slices.map((slice) => `
              <button
                class="project-pie-segment"
                type="button"
                style="--slice-color:${slice.color}; clip-path: polygon(${slice.clipPath});"
                aria-label="${escapeHtml(slice.tooltip)}"
                data-chart-tooltip="${escapeHtml(slice.tooltip)}"
                title="${escapeHtml(slice.tooltip)}"
              ></button>
            `).join('')}
          </div>
          <span>${totalProjects}</span>
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

function projectJourneyTooltip(project, stage) {
  const match = projectDateFields(project).find((item) => item.stage === stage);
  return match?.date ? `${stage}: ${displayDate(match.date)}` : `Waiting ${stage}`;
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

function projectElapsedDays(project) {
  const kickoff = dateValue(project.kickoff_date);
  if (!kickoff) return null;
  return Math.floor((Date.now() - kickoff.getTime()) / 86400000);
}

function projectCardStageMini(project) {
  const stages = [
    'kickoff_date',
    'onboarding_date',
    'training_date',
    'golive_date'
  ];
  const grouped = projectStageGroup(project);
  const activeIndex = ['Kick-off', 'Onboarding', 'Training', 'GoLive'].indexOf(grouped);
  return `
    <div class="project-card-stage-strip">
      ${stages.map((field, index) => {
        const date = project[field];
        const stateClass = grouped === 'On Hold' ? 'paused'
          : index < activeIndex ? 'done'
          : index === activeIndex ? 'current'
          : 'waiting';
        return `
          <div class="project-card-stage-step ${stateClass}">
            <div class="stage-step-dot"></div>
            <span class="stage-step-date">${date ? escapeHtml(displayDate(date).replace(/ \d{4}$/, '')) : '—'}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function projectBoardCard(project) {
  const missing = projectMissingFields(project);
  const elapsed = projectElapsedDays(project);
  return `
    <article class="project-board-card stage-${slug(projectStageGroup(project))}" data-open-project="${project.id}" role="button" tabindex="0" aria-label="Edit ${escapeHtml(project.customer_name || project.project_name || 'project')}">
      <div class="project-board-card-head">
        ${projectPackageDisplay(project)}
        ${elapsed !== null ? `<span class="project-card-elapsed">${elapsed}d</span>` : ''}
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
      ${projectCardStageMini(project)}
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

function uniqueProjectValues(projects, mapper) {
  return [...new Set(projects.map(mapper).map(norm).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function filteredProjectTrackingProjects(projects) {
  const filters = state.projectTracking.filters ?? defaultProjectTrackingFilters;
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

function projectBoardFilters(projects, filteredProjects) {
  const filters = state.projectTracking.filters ?? defaultProjectTrackingFilters;
  const packageOptions = uniqueProjectValues(projects, (project) => project.package_type);
  const activeCount = [
    filters.search,
    filters.package_type,
    filters.stage,
    filters.review
  ].filter(Boolean).length;
  return `
    <div class="project-board-filterbar">
      <label class="project-filter-search">
        <span>Search</span>
        <input type="search" data-project-filter="search" value="${escapeHtml(filters.search)}" placeholder="Customer, project, package...">
      </label>
      <label>
        <span>Package</span>
        <select data-project-filter-one="package_type">
          <option value="">All packages</option>
          ${packageOptions.map((pack) => `<option value="${escapeHtml(pack)}" ${filters.package_type === pack ? 'selected' : ''}>${escapeHtml(pack)}</option>`).join('')}
        </select>
      </label>
      <label>
        <span>Stage</span>
        <select data-project-filter-one="stage">
          <option value="">All stages</option>
          ${['Kick-off', 'Onboarding', 'Training', 'GoLive', 'On Hold'].map((stage) => `<option value="${escapeHtml(stage)}" ${filters.stage === stage ? 'selected' : ''}>${escapeHtml(stage)}</option>`).join('')}
        </select>
      </label>
      <label>
        <span>Review</span>
        <select data-project-filter-one="review">
          <option value="">All records</option>
          <option value="needs-review" ${filters.review === 'needs-review' ? 'selected' : ''}>Needs review</option>
          <option value="complete" ${filters.review === 'complete' ? 'selected' : ''}>Complete records</option>
        </select>
      </label>
      <div class="project-filter-summary">
        <strong>${filteredProjects.length}</strong>
        <span>of ${projects.length} projects</span>
      </div>
      <button class="button ghost" type="button" data-action="reset-project-filters" ${activeCount ? '' : 'disabled'}>Reset</button>
    </div>
  `;
}

function projectKanbanBoard(projects, allProjects = projects) {
  const columns = projectBoardColumns(projects);
  return `
    <section class="project-board-shell">
      ${projectViewTabs()}
      ${projectBoardFilters(allProjects, projects)}
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

function projectTimelineSortedRows(projects) {
  const { field, dir } = state.projectTracking.timelineSort;
  return [...projects].sort((a, b) => {
    let cmp = 0;
    if (field === 'package_type') cmp = compareText(a.package_type, b.package_type);
    else if (field === 'user_count') cmp = number(a.user_count) - number(b.user_count);
    else if (field === 'stage') cmp = compareText(projectStageGroup(a), projectStageGroup(b));
    else if (field === 'elapsed') cmp = (projectElapsedDays(a) ?? -1) - (projectElapsedDays(b) ?? -1);
    else cmp = compareDates(a.kickoff_date, b.kickoff_date);
    if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
    return compareText(a.customer_name, b.customer_name);
  });
}

function timelineSortHeader(label, field) {
  const { field: activeField, dir } = state.projectTracking.timelineSort;
  const isActive = activeField === field;
  const icon = isActive ? (dir === 'asc' ? '↑' : '↓') : '↕';
  return `<th class="sortable ${isActive ? `sort-${dir}` : ''}" data-timeline-sort="${field}">${escapeHtml(label)} <span class="sort-icon">${icon}</span></th>`;
}

function projectTimelineView(projects, allProjects = projects) {
  const rows = projectTimelineSortedRows(projects);
  const processStages = ['Kick-off', 'Onboarding', 'Training', 'GoLive'];
  return `
    <section class="project-board-shell">
      ${projectViewTabs()}
      ${projectBoardFilters(allProjects, projects)}
      <section class="panel project-process-panel">
        <div class="panel-title">
          <div>
            <h2>Project Timeline</h2>
            <span>Onboarding journey by customer</span>
          </div>
          <span>${rows.length} records</span>
        </div>
        <div class="table-wrap project-process-wrap">
          <table class="project-process-table">
            <colgroup>
              <col class="col-customer">
              <col class="col-package">
              <col class="col-users">
              <col class="col-journey">
              <col class="col-total">
            </colgroup>
            <thead>
              <tr>
                <th>Customer Name</th>
                ${timelineSortHeader('Package', 'package_type')}
                ${timelineSortHeader('Users', 'user_count')}
                <th>Journey</th>
                ${timelineSortHeader('Total Days', 'elapsed')}
              </tr>
            </thead>
            <tbody>
              ${rows.map((project) => {
                const grouped = projectStageGroup(project);
                const activeIndex = processStages.indexOf(grouped);
                const elapsed = projectElapsedDays(project);
                return `
                  <tr class="stage-${slug(grouped)}" data-open-project="${project.id}" tabindex="0" aria-label="Edit ${escapeHtml(project.customer_name || project.project_name || 'project')}">
                    <td>
                      <strong>${escapeHtml(project.customer_name || project.project_name || '-')}</strong>
                      <small>${escapeHtml(project.project_name || '-')}</small>
                    </td>
                    <td>${projectPackageDisplay(project)}</td>
                    <td><strong>${number(project.user_count)}</strong></td>
                    <td>
                      <div class="project-process-steps">
                        ${processStages.map((stage, index) => {
                          const cls = grouped === 'On Hold' ? 'paused' : index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'waiting';
                          const tooltip = projectJourneyTooltip(project, stage);
                          return `<span class="${cls}" title="${escapeHtml(tooltip)}" aria-label="${escapeHtml(tooltip)}">${escapeHtml(stage)}</span>`;
                        }).join('')}
                      </div>
                    </td>
                    <td><strong>${elapsed !== null ? `${elapsed} days` : '-'}</strong></td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="5">No project data yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
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

function projectCalendarView(projects, allProjects = projects) {
  const events = projectCalendarEvents(projects);
  const months = [...new Set(events.map((event) => event.month))];
  return `
    <section class="project-board-shell">
      ${projectViewTabs()}
      ${projectBoardFilters(allProjects, projects)}
      <div class="project-calendar-grid">
        ${months.map((month) => `
          <section class="panel project-calendar-month">
            <div class="panel-title">
              <h2>${escapeHtml(periodLabel(month))}</h2>
              <span>${events.filter((event) => event.month === month).length} processes</span>
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
            <h2>No dated processes</h2>
            <p class="subtle">Add process dates from Board or Timeline view.</p>
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
  const filteredProjects = filteredProjectTrackingProjects(projects);
  if (!filteredProjects.length) {
    return `
      <section class="project-board-shell">
        ${projectViewTabs()}
        ${projectBoardFilters(projects, filteredProjects)}
        <section class="panel project-empty-board">
          <h2>${projects.length ? 'No projects match these filters' : 'No project data yet'}</h2>
          <p class="subtle">${projects.length ? 'Adjust package, stage, review status, or search terms.' : 'Click the Import button above to upload the Excel workbook.'}</p>
        </section>
      </section>
    `;
  }
  return renderers[state.projectTracking.activeView](filteredProjects, projects);
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
  const processes = [
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
          ${processes.map(([stage, field]) => projectTimelineStep(project, stage, field, false, false)).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="project-timeline-row">
      <div class="project-timeline">
        ${processes.map(([stage, field], index) => projectTimelineStep(project, stage, field, index <= activeIndex, index === activeIndex)).join('')}
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

function projectHeroBanner() {
  const now = new Date();
  const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const mascotSrc = '/assets/robot-mascot.png';
  return `
    <div class="project-hero-banner">
      <div class="project-hero-text">
        <div class="project-hero-title">Venio Project</div>
        <div class="project-hero-date">${escapeHtml(monthYear)}</div>
      </div>
      <div class="project-hero-mascot">
        <img src="${mascotSrc}" alt="Team mascot" onerror="this.replaceWith(document.createTextNode('🤖'))">
      </div>
    </div>
  `;
}

function renderOver45DaysModule(projects) {
  const threshold = overDaysThreshold();
  const overProjects = over45DaysProjects(projects);
  if (!overProjects.length) return '';
  return `
    <section class="over45-section">
      <div class="over45-header">
        <h2>Over ${threshold} Days Project <span class="over45-warn-icon">&#9888;</span></h2>
      </div>
      <div class="over45-cards">
        ${overProjects.map((project) => {
          const days = projectDaysFromKickoff(project);
          const isEditing = state.over45EditingId === project.id;
          const insight = norm(project.notes);
          const packageInfo = [project.package_type, project.user_count ? `${project.user_count} Users` : ''].filter(Boolean).join(' ');
          return `
            <div class="over45-card">
              <div class="over45-card-head">
                <span class="over45-card-name">${escapeHtml(project.customer_name || project.project_name || '-')}</span>
                <span class="over45-days-badge">${days} Days</span>
              </div>
              <div class="over45-card-package">${escapeHtml(packageInfo || '-')}</div>
              <div class="over45-insight-block">
                <div class="over45-insight-label">Insight</div>
                ${isEditing ? `
                  <textarea class="over45-insight-textarea" data-over45-edit="${project.id}" rows="3">${escapeHtml(insight)}</textarea>
                  <div class="over45-insight-actions">
                    <button class="button primary" style="font-size:12px;padding:5px 12px" data-action="save-over45-insight" data-id="${project.id}">Save</button>
                    <button class="button ghost" style="font-size:12px;padding:5px 12px" data-action="cancel-over45-insight">Cancel</button>
                  </div>
                ` : `
                  <div class="over45-insight-text ${insight ? '' : 'over45-insight-empty'}">${insight ? escapeHtml(insight) : 'กรุณาระบุ'}</div>
                  <button class="over45-edit-btn" type="button" data-action="edit-over45-insight" data-id="${project.id}" title="Edit insight"><span class="pencil-icon">&#9999;</span></button>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderProjectDashboard() {
  const projects = state.projectTrackingProjects;
  const m = projectMetrics(projects);

  return renderShell(`
    ${projectHeroBanner()}
    ${projectPageHeader('Project Tracking Dashboard', 'Implementation pipeline, timeline health, and executive project status.')}
    <section class="cards project-kpis">
      ${card('Total Projects', m.total)}
      ${card('Total Users', m.users)}
      ${card('In Progress', m.inProgress)}
      ${card('On Hold', m.onHold)}
      ${card('GoLive', m.goLive)}
    </section>

    <section class="dashboard-main-grid project-chart-grid">
      ${projectPieChart(projects)}
      ${packageDistributionChart(projects)}
    </section>

    ${projectActiveView(projects)}
    ${renderOver45DaysModule(projects)}
  `);
}

function crispWeightedAverage(operators, field, options = {}) {
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

function crispMetrics(operators) {
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

function crispRatingLabel(value) {
  const rating = Number(value);
  return rating > 0 ? rating.toFixed(2) : 'No rating';
}

function crispOperatorTable(operators) {
  const rows = [...operators].sort((a, b) => number(b.conversations) - number(a.conversations));
  return `
    <section class="panel crisp-table-panel">
      <div class="panel-title">
        <h2>Operator Performance</h2>
        <span>${rows.length} operators</span>
      </div>
      <div class="table-wrap crisp-table-wrap">
        <table class="crisp-table">
          <thead>
            <tr>
              <th>Operator</th>
              <th>Total Case</th>
              <th>Rating</th>
              <th>Avg. Response</th>
              <th>Avg. Resolution</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((operator) => `
                <tr>
                  <td>
                    <div class="crisp-operator-cell">
                      ${operator.avatar ? `<img src="${escapeHtml(operator.avatar)}" alt="">` : '<span></span>'}
                      <strong title="${escapeHtml(operator.operator)}">${escapeHtml(operator.operator)}</strong>
                    </div>
                  </td>
                  <td>${number(operator.conversations)}</td>
                  <td>${escapeHtml(crispRatingLabel(operator.rating))}</td>
                  <td>${escapeHtml(operator.firstResponseMedianText || '-')}</td>
                  <td>${escapeHtml(operator.resolutionMedianText || '-')}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="subtle">No Crisp data imported yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function crispMonthOptions() {
  return [...(state.crisp.months ?? [])].sort((a, b) => b.month.localeCompare(a.month));
}

function crispMonthSeries(months) {
  return [...months].sort((a, b) => a.month.localeCompare(b.month));
}

function selectedCrispMonthEntry() {
  const months = crispMonthOptions();
  if (!months.length) return null;
  const selected = state.crisp.selectedMonth && months.find((month) => month.month === state.crisp.selectedMonth);
  return selected || months[0];
}

function crispViewTabs() {
  const tabs = [
    ['performance', 'Performance'],
    ['import', 'Import']
  ];
  return `
    <div class="project-board-tabs crisp-tabs" aria-label="Crisp Chat views">
      ${tabs.map(([key, label]) => `
        <button class="${state.crisp.activeView === key ? 'active' : ''}" type="button" data-crisp-view="${key}">
          ${escapeHtml(label)}
        </button>
      `).join('')}
    </div>
  `;
}

function crispMonthPicker(months, selectedMonth) {
  return `
    <label class="dashboard-control crisp-month-picker">
      <span>Month</span>
      <select data-crisp-selected-month>
        ${months.map((month) => `<option value="${escapeHtml(month.month)}" ${selectedMonth === month.month ? 'selected' : ''}>${escapeHtml(periodLabel(month.month))}</option>`).join('')}
      </select>
    </label>
  `;
}

function crispMetricValue(month, metric) {
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

function crispFormatMetric(metric, value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  if (metric === 'rating') return Number(value).toFixed(2);
  if (metric === 'response' || metric === 'resolution') return formatDurationSeconds(value);
  return String(Math.round(Number(value)));
}

function crispDelta(current, previous, metric, lowerIsBetter = false) {
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

function crispPreviousMonth(months, selectedMonth) {
  const series = crispMonthSeries(months);
  const index = series.findIndex((month) => month.month === selectedMonth);
  return index > 0 ? series[index - 1] : null;
}

function crispMovementCard(label, metric, currentMonth, previousMonth, lowerIsBetter = false) {
  const current = crispMetricValue(currentMonth, metric);
  const previous = crispMetricValue(previousMonth, metric);
  const delta = crispDelta(current, previous, metric, lowerIsBetter);
  return `
    <article class="crisp-trend-card ${delta.tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(crispFormatMetric(metric, current))}</strong>
      <small>${escapeHtml(delta.text)} ${previousMonth ? `from ${periodLabel(previousMonth.month)}` : 'from previous month'}</small>
    </article>
  `;
}

function crispAiForMonth(monthKey) {
  return state.crisp.aiData[monthKey] ?? { firstResponseAvg: '', humanFirstResponseAvg: '', aiChatbotTotal: '', inboxTotal: '', topics: [] };
}

function hhmmssToSeconds(value) {
  const s = String(value ?? '').trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s) || null;
  const m = s.match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const total = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  return total > 0 ? total : null;
}

function secondsToHhmmss(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (!s) return '00:00:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function crispAiResponseSeconds(monthKey) {
  if (!monthKey) return null;
  const ai = crispAiForMonth(monthKey);
  const first = hhmmssToSeconds(ai.firstResponseAvg);
  const human = hhmmssToSeconds(ai.humanFirstResponseAvg);
  if (first === null || human === null || first <= 0 || human <= 0 || human >= first) return null;
  return first - human;
}

function readAndSaveCrispAiForm(monthKey) {
  const aiFields = {};
  app.querySelectorAll(`[data-crisp-ai-field][data-ai-month="${monthKey}"]`).forEach((input) => {
    aiFields[input.dataset.crispAiField] = input.value;
  });
  const topicNameInputs = [...app.querySelectorAll(`[data-crisp-topic-name][data-ai-month="${monthKey}"]`)];
  const topics = topicNameInputs.map((nameInput, i) => {
    const countInput = app.querySelector(`[data-crisp-topic-count="${i}"][data-ai-month="${monthKey}"]`);
    return { name: nameInput.value, count: Number(countInput?.value) || 0 };
  });
  const existing = crispAiForMonth(monthKey);
  state.crisp.aiData[monthKey] = { ...existing, ...aiFields, topics };
}

function crispPieChart(segments) {
  const total = segments.reduce((sum, s) => sum + Number(s.value), 0);
  if (!total) return '<div class="crisp-pie-empty"></div>';
  let angle = 0;
  const stops = segments.map((s) => {
    const start = angle;
    angle += (Number(s.value) / total) * 360;
    return `${s.color} ${start.toFixed(1)}deg ${angle.toFixed(1)}deg`;
  }).join(', ');
  return `<div class="crisp-pie-donut" style="background: conic-gradient(${stops})"></div>`;
}

function crispAiFormPanel(monthKey) {
  const ai = crispAiForMonth(monthKey);
  const topics = ai.topics ?? [];
  const aiSec = crispAiResponseSeconds(monthKey);
  const months = crispMonthOptions();
  const monthSelector = months.length > 1
    ? `<select class="crisp-ai-month-select" data-crisp-selected-month>
        ${months.map((m) => `<option value="${escapeHtml(m.month)}" ${m.month === monthKey ? 'selected' : ''}>${escapeHtml(periodLabel(m.month))}</option>`).join('')}
      </select>`
    : `<span class="crisp-ai-month-label">${escapeHtml(periodLabel(monthKey))}</span>`;
  return `
    <div class="crisp-ai-form-card">
      <div class="crisp-ai-form-header">
        <div class="crisp-ai-form-title">
          <div class="crisp-ai-form-icon-wrap">🤖</div>
          <div>
            <h3>AI Performance Data</h3>
            <div class="crisp-ai-month-row">
              <span class="subtle">Month:</span>
              ${monthSelector}
            </div>
          </div>
        </div>
        <button class="button primary" data-action="save-crisp-ai" data-month="${escapeHtml(monthKey)}">${icon('upload')} Save</button>
      </div>
      <div class="crisp-ai-form-body">
        <div class="crisp-ai-form-section">
          <div class="crisp-ai-section-label-row">
            <span class="crisp-ai-section-label">⏱ Response Time</span>
            <span class="crisp-ai-section-hint">format: HH:MM:SS</span>
          </div>
          <div class="crisp-ai-metric-grid">
            <div class="crisp-ai-metric-card">
              <div class="crisp-ai-metric-name">First Response Avg</div>
              <div class="crisp-ai-metric-sub">AI + Human combined</div>
              <input class="crisp-ai-time-input" type="text"
                data-crisp-ai-field="firstResponseAvg"
                data-ai-month="${escapeHtml(monthKey)}"
                value="${escapeHtml(String(ai.firstResponseAvg || ''))}"
                placeholder="00:00:00">
            </div>
            <div class="crisp-ai-metric-card">
              <div class="crisp-ai-metric-name">Human First Response Avg</div>
              <div class="crisp-ai-metric-sub">Human agent only</div>
              <input class="crisp-ai-time-input" type="text"
                data-crisp-ai-field="humanFirstResponseAvg"
                data-ai-month="${escapeHtml(monthKey)}"
                value="${escapeHtml(String(ai.humanFirstResponseAvg || ''))}"
                placeholder="00:00:00">
            </div>
          </div>
          ${aiSec !== null ? `
            <div class="crisp-ai-derived-badge">
              <span class="crisp-ai-derived-icon">🤖</span>
              <span class="crisp-ai-derived-label">Avg. AI Response (calculated)</span>
              <strong class="crisp-ai-derived-value">${escapeHtml(formatDurationSeconds(aiSec))}</strong>
            </div>
          ` : `
            <div class="crisp-ai-derived-empty">
              Fill both response time fields above to calculate Avg. AI Response.
            </div>
          `}
        </div>
        <div class="crisp-ai-form-section">
          <div class="crisp-ai-section-label-row">
            <span class="crisp-ai-section-label">💬 Chat Volume</span>
          </div>
          <div class="crisp-ai-metric-grid">
            <div class="crisp-ai-metric-card">
              <div class="crisp-ai-metric-name">Entry to Venio AI Chatbot</div>
              <div class="crisp-ai-metric-sub">Conversations handled by AI</div>
              <input class="crisp-ai-count-input" type="number" min="0"
                data-crisp-ai-field="aiChatbotTotal"
                data-ai-month="${escapeHtml(monthKey)}"
                value="${escapeHtml(String(ai.aiChatbotTotal || ''))}"
                placeholder="0">
            </div>
            <div class="crisp-ai-metric-card">
              <div class="crisp-ai-metric-name">Entry Routed to Inbox</div>
              <div class="crisp-ai-metric-sub">Conversations routed to human</div>
              <input class="crisp-ai-count-input" type="number" min="0"
                data-crisp-ai-field="inboxTotal"
                data-ai-month="${escapeHtml(monthKey)}"
                value="${escapeHtml(String(ai.inboxTotal || ''))}"
                placeholder="0">
            </div>
          </div>
        </div>
        <div class="crisp-ai-form-section">
          <div class="crisp-ai-section-label-row">
            <span class="crisp-ai-section-label">📊 Topic Volume</span>
            <button class="button crisp-ai-add-btn" type="button" data-action="add-crisp-topic" data-month="${escapeHtml(monthKey)}">+ Add Topic</button>
          </div>
          ${topics.length ? `
            <div class="crisp-ai-topic-list">
              ${topics.map((t, i) => `
                <div class="crisp-ai-topic-row">
                  <input class="crisp-ai-topic-name" type="text" placeholder="Topic name"
                    data-crisp-topic-name="${i}" data-ai-month="${escapeHtml(monthKey)}"
                    value="${escapeHtml(t.name || '')}">
                  <input class="crisp-ai-topic-count" type="number" min="0" placeholder="Count"
                    data-crisp-topic-count="${i}" data-ai-month="${escapeHtml(monthKey)}"
                    value="${escapeHtml(String(t.count || ''))}">
                  <button class="icon-button crisp-ai-topic-del" type="button"
                    data-action="remove-crisp-topic" data-month="${escapeHtml(monthKey)}"
                    data-index="${i}" aria-label="Remove">${icon('close')}</button>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="crisp-ai-topic-empty">
              <span>📋</span>
              <p>No topics yet — click <strong>+ Add Topic</strong> to track conversation categories.</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

const CRISP_PIE_PASTEL = [
  '#a8d4f0', '#c4b0e8', '#f5a8c0', '#a8dfc0', '#f5d8a0',
  '#b8e8f5', '#f0c4a8', '#c4e0a8', '#e8b8d8', '#a8c8e8'
];

function crispPieLegendItems(segments, total) {
  return segments.map((s) => {
    const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
    return `
      <div class="crisp-legend-item">
        <span class="crisp-legend-dot" style="background:${s.color}"></span>
        <span class="crisp-legend-label">${escapeHtml(s.label)}</span>
        <span class="crisp-legend-pct">${pct}%</span>
        <strong class="crisp-legend-val">${s.value.toLocaleString()}</strong>
      </div>`;
  }).join('');
}

function crispAiChartsPanel(monthKey) {
  if (!monthKey) return '';
  const ai = crispAiForMonth(monthKey);
  const topics = ai.topics ?? [];
  const distSegments = [
    { label: 'AI Chatbot', value: Number(ai.aiChatbotTotal) || 0, color: '#a8d4f0' },
    { label: 'Routed to Inbox', value: Number(ai.inboxTotal) || 0, color: '#c4b0e8' }
  ];
  const topicSegments = topics
    .map((t, i) => ({ label: t.name || `Topic ${i + 1}`, value: Number(t.count) || 0, color: CRISP_PIE_PASTEL[i % CRISP_PIE_PASTEL.length] }))
    .filter((s) => s.value > 0);
  const hasDistData = distSegments.some((s) => s.value > 0);
  const distTotal = distSegments.reduce((sum, s) => sum + s.value, 0);
  const topicTotal = topicSegments.reduce((sum, s) => sum + s.value, 0);
  return `
    <div class="crisp-ai-charts">
      <section class="panel crisp-ai-chart-panel">
        <div class="panel-title">
          <h2>Chat Distribution</h2>
          <span>${escapeHtml(periodLabel(monthKey))}</span>
        </div>
        <div class="crisp-pie-wrap">
          ${crispPieChart(distSegments)}
          <div class="crisp-pie-legend">
            ${hasDistData
              ? crispPieLegendItems(distSegments, distTotal)
              : '<p class="crisp-pie-no-data">Enter chat volume in the Import tab.</p>'}
          </div>
        </div>
      </section>
      <section class="panel crisp-ai-chart-panel">
        <div class="panel-title">
          <h2>Topic Volume</h2>
          <span>${topicSegments.length} topics</span>
        </div>
        <div class="crisp-pie-wrap">
          ${crispPieChart(topicSegments)}
          <div class="crisp-pie-legend">
            ${topicSegments.length
              ? crispPieLegendItems(topicSegments, topicTotal)
              : '<p class="crisp-pie-no-data">Add topics in the Import tab.</p>'}
          </div>
        </div>
      </section>
      ${crispAiHumanConversationChart(monthKey)}
    </div>
  `;
}

function crispAiHumanConversationChart(selectedMonth) {
  const ai = crispAiForMonth(selectedMonth);
  const humanConversationValue = selectedMonth === '2026-05' ? 419 : (Number(ai.inboxTotal) || 0);
  const rows = [
    { label: 'AI', value: Number(ai.aiChatbotTotal) || 0, tone: 'ai' },
    { label: 'Human', value: humanConversationValue, tone: 'human' }
  ];
  const maxValue = Math.max(1, ...rows.map((row) => row.value));
  const hasData = rows.some((row) => row.value > 0);
  return `
    <section class="panel crisp-ai-chart-panel crisp-ai-bar-panel">
      <div class="panel-title">
        <div>
          <h2>Conversations</h2>
          <span>${escapeHtml(periodLabel(selectedMonth))} &middot; AI vs Human</span>
        </div>
        <div class="crisp-panel-actions">
          <button class="button crisp-inline-add-btn" type="button" data-action="open-crisp-ai-manual" data-month="${escapeHtml(selectedMonth || state.crisp.selectedMonth || '')}">+ Manual</button>
        </div>
      </div>
      ${hasData ? `
        <div class="crisp-horizontal-bars" aria-label="Selected month AI versus Human conversation chart">
          ${rows.map((row) => `
            <div class="crisp-horizontal-bar-row">
              <div class="crisp-horizontal-bar-head">
                <span class="crisp-horizontal-bar-label ${row.tone}">${escapeHtml(row.label)}</span>
                <strong class="crisp-horizontal-bar-value">${row.value}</strong>
              </div>
              <div class="crisp-horizontal-bar-track">
                <div class="crisp-horizontal-bar-fill ${row.tone}" style="width:${Math.max(row.value > 0 ? 8 : 0, (row.value / maxValue) * 100)}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="crisp-bar-legend">
          <span class="ai">AI</span>
          <span class="human">Human</span>
        </div>
      ` : `
        <div class="crisp-combo-empty">
          <strong>No manual AI/Human case data yet</strong>
          <span>Use + Manual to enter AI Chatbot and Human case counts for ${escapeHtml(periodLabel(selectedMonth))}.</span>
        </div>
      `}
    </section>
  `;
}

function crispMonthlyMovement(months, currentMonth) {
  const previousMonth = crispPreviousMonth(months, currentMonth?.month);
  return `
    <section class="crisp-trend-grid" aria-label="Month over month Crisp trends">
      ${crispMovementCard('Total Case', 'conversations', currentMonth, previousMonth)}
      ${crispMovementCard('Avg. Rating', 'rating', currentMonth, previousMonth)}
      ${crispMovementCard('Avg. Response', 'response', currentMonth, previousMonth, true)}
      ${crispMovementCard('Avg. Resolution', 'resolution', currentMonth, previousMonth, true)}
    </section>
  `;
}

function crispScale(value, min, max, invert = false) {
  if (!Number.isFinite(Number(value))) return 0;
  if (max <= min) return 50;
  const ratio = (Number(value) - min) / (max - min);
  return (invert ? 1 - ratio : ratio) * 100;
}

function crispMetricRange(months, metric, includeZero = false) {
  const values = months.map((month) => crispMetricValue(month, metric)).filter((value) => value !== null);
  if (!values.length) return { min: 0, max: 1 };
  if (includeZero) values.push(0);
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function crispConversationInsight(series) {
  if (!series.length) return '';
  const values = series.map((month) => crispMetricValue(month, 'conversations') ?? 0);
  const latest = series[series.length - 1];
  const previous = series[series.length - 2];
  const latestValue = crispMetricValue(latest, 'conversations') ?? 0;
  const previousValue = previous ? crispMetricValue(previous, 'conversations') ?? 0 : null;
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = values.length ? total / values.length : 0;
  const peak = [...series].sort((a, b) => (crispMetricValue(b, 'conversations') ?? 0) - (crispMetricValue(a, 'conversations') ?? 0))[0];
  const change = previousValue === null ? null : latestValue - previousValue;
  const changeText = change === null
    ? 'No previous month'
    : `${change >= 0 ? '+' : ''}${Math.round(change)} vs ${periodLabel(previous.month)}`;
  const changeTone = change === null ? 'muted' : change >= 0 ? 'up' : 'down';
  return `
    <div class="crisp-combo-context" aria-label="Monthly trend context">
      <article>
        <span>Latest month</span>
        <strong>${escapeHtml(periodLabel(latest.month))}</strong>
        <small>${escapeHtml(crispFormatMetric('conversations', latestValue))} conversations</small>
      </article>
      <article>
        <span>Month change</span>
        <strong class="${changeTone}">${escapeHtml(changeText)}</strong>
        <small>${previous ? `Compared with ${escapeHtml(periodLabel(previous.month))}` : 'Needs another month'}</small>
      </article>
      <article>
        <span>Peak month</span>
        <strong>${escapeHtml(periodLabel(peak?.month))}</strong>
        <small>${escapeHtml(crispFormatMetric('conversations', crispMetricValue(peak, 'conversations')))} conversations</small>
      </article>
      <article>
        <span>Monthly average</span>
        <strong>${escapeHtml(crispFormatMetric('conversations', average))}</strong>
        <small>${escapeHtml(crispFormatMetric('conversations', total))} total in this view</small>
      </article>
    </div>
  `;
}

function crispTrendOverview(months, selectedMonth) {
  const series = crispMonthSeries(months).slice(-12);
  if (!series.length) {
    return `
      <section class="panel crisp-combo-trend-panel">
        <div class="panel-title">
          <div>
            <h2>Monthly Trend Overview</h2>
            <span>Import at least one monthly Crisp CSV to see conversation volume over time.</span>
          </div>
        </div>
        <div class="crisp-combo-empty">
          <strong>No monthly Crisp trend yet</strong>
          <span>Use the Import tab to add monthly operator exports. The chart will focus only on conversation volume.</span>
        </div>
      </section>
    `;
  }
  const range = crispMetricRange(series, 'conversations', true);
  const maxConversations = Math.max(1, range.max);
  const width = Math.max(760, series.length * 118);
  const height = 340;
  const pad = { top: 34, right: 36, bottom: 64, left: 84 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const bandW = plotW / Math.max(series.length, 1);
  const xFor = (index) => pad.left + (bandW * index) + (bandW / 2);
  const yForValue = (value) => pad.top + (1 - Math.max(0, Math.min(1, Number(value) / maxConversations))) * plotH;
  const linePoints = series
    .map((month, index) => `${xFor(index).toFixed(1)},${yForValue(crispMetricValue(month, 'conversations') ?? 0).toFixed(1)}`)
    .join(' ');
  const areaPoints = `${xFor(0).toFixed(1)},${(pad.top + plotH).toFixed(1)} ${linePoints} ${xFor(series.length - 1).toFixed(1)},${(pad.top + plotH).toFixed(1)}`;
  const barWidth = Math.max(38, Math.min(66, bandW * 0.44));
  return `
    <section class="panel crisp-combo-trend-panel">
      <div class="panel-title">
        <div>
          <h2>Conversation Trend</h2>
          <span>Last ${series.length} imported month${series.length === 1 ? '' : 's'} / monthly Crisp conversation volume only</span>
        </div>
      </div>
      ${crispConversationInsight(series)}
      <div class="crisp-combo-chart" aria-label="Monthly Crisp conversation trend" style="--trend-width:${width}px">
        <svg class="crisp-combo-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly conversation trend">
          <defs>
            <linearGradient id="conversationBarGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#8cc7f5"></stop>
              <stop offset="56%" stop-color="#8b8ee8"></stop>
              <stop offset="100%" stop-color="#6fd0ad"></stop>
            </linearGradient>
            <linearGradient id="conversationAreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#8cc7f5" stop-opacity="0.16"></stop>
              <stop offset="100%" stop-color="#6fd0ad" stop-opacity="0"></stop>
            </linearGradient>
          </defs>
          <g class="grid">
            ${[0, 25, 50, 75, 100].map((tick) => {
              const y = pad.top + (1 - tick / 100) * plotH;
              const label = Math.round(maxConversations * tick / 100);
              return `
                <line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${(width - pad.right).toFixed(1)}" y2="${y.toFixed(1)}"></line>
                <text class="axis-value" x="${pad.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end">${label}</text>
              `;
            }).join('')}
          </g>
          <polygon class="conversation-area" points="${areaPoints}"></polygon>
          <g class="bars">
            ${series.map((month, index) => {
              const conversations = crispMetricValue(month, 'conversations') ?? 0;
              const x = xFor(index) - barWidth / 2;
              const barH = Math.max(8, (conversations / maxConversations) * plotH);
              const y = pad.top + plotH - barH;
              return `
                <rect class="${month.month === selectedMonth ? 'active' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="6" tabindex="0" aria-label="${escapeHtml(`${periodLabel(month.month)}: ${crispFormatMetric('conversations', conversations)} conversations`)}">
                  <title>${escapeHtml(periodLabel(month.month))}: ${crispFormatMetric('conversations', conversations)} conversations</title>
                </rect>
                <text class="bar-value" x="${xFor(index).toFixed(1)}" y="${(y - 10).toFixed(1)}" text-anchor="middle">${escapeHtml(crispFormatMetric('conversations', conversations))}</text>
              `;
            }).join('')}
          </g>
          <polyline class="trend-line conversations" points="${linePoints}"></polyline>
          <g class="points">
            ${series.map((month, index) => {
              const x = xFor(index);
              const conversations = crispMetricValue(month, 'conversations') ?? 0;
              return `
                <circle class="conversations" cx="${x.toFixed(1)}" cy="${yForValue(conversations).toFixed(1)}" r="6" tabindex="0" aria-label="${escapeHtml(`${periodLabel(month.month)}: ${crispFormatMetric('conversations', conversations)} conversations`)}"><title>${escapeHtml(periodLabel(month.month))}: ${escapeHtml(crispFormatMetric('conversations', conversations))} conversations</title></circle>
              `;
            }).join('')}
          </g>
          <g class="labels">
            ${series.map((month, index) => `
              <text x="${xFor(index).toFixed(1)}" y="${height - 22}" text-anchor="middle">${escapeHtml(periodLabel(month.month))}</text>
            `).join('')}
          </g>
        </svg>
        <p class="crisp-combo-note">Each bar is the total Crisp conversations imported for that month. The line connects month-to-month volume so spikes and drops are easy to see.</p>
        <div class="crisp-combo-summary">
          ${series.map((month) => {
            const conversations = crispMetricValue(month, 'conversations') ?? 0;
          return `
            <article class="${month.month === selectedMonth ? 'active' : ''}">
              <strong>${escapeHtml(periodLabel(month.month))}</strong>
              <span>${escapeHtml(crispFormatMetric('conversations', conversations))} conversations</span>
            </article>
          `;
        }).join('') || '<p class="subtle">Import monthly Crisp data to see trends.</p>'}
        </div>
      </div>
    </section>
  `;
}

function crispMonthlyComparison(months) {
  const series = crispMonthSeries(months);
  return `
    <section class="panel crisp-history-panel">
      <div class="panel-title">
        <h2>Monthly Comparison</h2>
        <span>${months.length} months</span>
      </div>
      <div class="table-wrap compact-table">
        <table>
          <thead><tr><th>Month</th><th>Operators</th><th>Conversations</th><th>Conv. Δ</th><th>Avg Rating</th><th>Rating Δ</th><th>Avg Response</th><th>Response Δ</th><th>Avg Resolution</th><th>Resolution Δ</th></tr></thead>
          <tbody>
            ${series.map((month, index) => {
              const previous = series[index - 1];
              const convDelta = crispDelta(crispMetricValue(month, 'conversations'), crispMetricValue(previous, 'conversations'), 'conversations');
              const ratingDelta = crispDelta(crispMetricValue(month, 'rating'), crispMetricValue(previous, 'rating'), 'rating');
              const responseDelta = crispDelta(crispMetricValue(month, 'response'), crispMetricValue(previous, 'response'), 'response', true);
              const resolutionDelta = crispDelta(crispMetricValue(month, 'resolution'), crispMetricValue(previous, 'resolution'), 'resolution', true);
              return `
              <tr>
                <td><strong>${escapeHtml(periodLabel(month.month))}</strong></td>
                <td>${month.valid_rows}</td>
                <td>${month.total_conversations}</td>
                <td><span class="crisp-delta ${convDelta.tone}">${escapeHtml(convDelta.text)}</span></td>
                <td>${month.avg_rating === null ? '-' : Number(month.avg_rating).toFixed(2)}</td>
                <td><span class="crisp-delta ${ratingDelta.tone}">${escapeHtml(ratingDelta.text)}</span></td>
                <td>${month.avg_response_seconds === null ? '-' : formatDurationSeconds(month.avg_response_seconds)}</td>
                <td><span class="crisp-delta ${responseDelta.tone}">${escapeHtml(responseDelta.text)}</span></td>
                <td>${month.avg_resolution_seconds === null ? '-' : formatDurationSeconds(month.avg_resolution_seconds)}</td>
                <td><span class="crisp-delta ${resolutionDelta.tone}">${escapeHtml(resolutionDelta.text)}</span></td>
              </tr>
            `;
            }).join('') || '<tr><td colspan="10" class="subtle">No monthly Crisp imports yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderCrispImportView(latest, activeMonth) {
  const latestMonth = latest?.month ?? latest?.imported_at?.slice(0, 7) ?? '';
  return `
    <section class="panel crisp-import-panel">
      <div class="crisp-import-copy">
        <div class="section-label">CSV Import</div>
        <h2>Operator Analytics Export</h2>
        <p class="subtle">Choose the month this export belongs to. Importing the same month again replaces that month with the updated file.</p>
      </div>
      <div class="project-import-actions crisp-import-actions">
        <button class="button primary" data-action="open-upload-modal" data-type="crisp">${icon('upload')} Import Crisp CSV</button>
      </div>
      <div class="project-import-meta">
        ${latest ? `Latest: <strong>${escapeHtml(middleEllipsis(latest.filename, 36))}</strong> / ${escapeHtml(periodLabel(latestMonth))} / ${latest.valid_rows} operators / ${displayDate(latest.imported_at)}` : 'No Crisp CSV imported yet.'}
      </div>
    </section>

    <section class="panel crisp-history-panel">
      <div class="panel-title">
        <h2>Import History</h2>
        <span>${state.crisp.batches.length} imports</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Month</th><th>Imported</th><th>Filename</th><th>Operators</th><th>Skipped</th><th>Conversations</th><th>Avg Rating</th><th>Avg Response</th><th>Avg Resolution</th><th></th></tr></thead>
          <tbody>
            ${state.crisp.batches.map((batch) => `
              <tr>
                <td><strong>${escapeHtml(periodLabel(batch.month ?? batch.imported_at?.slice(0, 7) ?? ''))}</strong></td>
                <td>${formatDate(batch.imported_at)}</td>
                <td>${escapeHtml(batch.filename)}</td>
                <td>${batch.valid_rows}</td>
                <td>${batch.skipped_rows}</td>
                <td>${batch.total_conversations}</td>
                <td>${batch.avg_rating === null ? '-' : Number(batch.avg_rating).toFixed(2)}</td>
                <td>${batch.avg_response_seconds === null ? '-' : formatDurationSeconds(batch.avg_response_seconds)}</td>
                <td>${batch.avg_resolution_seconds === null ? '-' : formatDurationSeconds(batch.avg_resolution_seconds)}</td>
                <td><button class="icon-button delete-batch-btn" data-action="delete-crisp-batch" data-batch-id="${batch.id}" title="Delete this month">${icon('close')}</button></td>
              </tr>
            `).join('') || '<tr><td colspan="10" class="subtle">No imports yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    ${activeMonth ? crispAiFormPanel(activeMonth.month) : ''}
  `;
}

function renderCrispPerformance() {
  if (!['performance', 'import'].includes(state.crisp.activeView)) state.crisp.activeView = 'performance';
  const months = crispMonthOptions();
  const activeMonth = selectedCrispMonthEntry();
  if (activeMonth && state.crisp.selectedMonth !== activeMonth.month) state.crisp.selectedMonth = activeMonth.month;
  const operators = activeMonth?.operators ?? [];
  const latest = state.crisp.batches?.[0];
  const metrics = crispMetrics(operators);
  const monthLabel = activeMonth ? periodLabel(activeMonth.month) : 'No month selected';

  return renderShell(`
    <div class="project-hero-banner">
      <div class="project-hero-text">
        <div class="project-hero-title">Crisp Chat</div>
        <div class="project-hero-date">${escapeHtml(monthLabel)}</div>
      </div>
      <div class="project-hero-mascot">
        <img src="/assets/robot-mascot.png" alt="Team mascot" onerror="this.replaceWith(document.createTextNode('&#129302;'))">
      </div>
    </div>

    ${crispViewTabs()}

    ${state.crisp.activeView === 'import' ? renderCrispImportView(latest, activeMonth) : `
      <section class="project-dashboard-toolbar crisp-month-toolbar">
        <div>
          <div class="section-label">Selected monthly snapshot</div>
          <strong>${escapeHtml(monthLabel)}</strong>
        </div>
        ${months.length ? crispMonthPicker(months, activeMonth?.month ?? '') : '<span class="subtle">Import monthly Crisp data to begin comparison.</span>'}
      </section>

      ${activeMonth ? crispMonthlyMovement(months, activeMonth) : ''}
      ${crispAiChartsPanel(activeMonth?.month ?? '')}
      ${crispOperatorTable(operators)}
    `}
  `);
}

function meetingSummaryForMonth(monthKey) {
  return state.meeting.summaryData[monthKey] ?? {
    totalAttempts: '',
    retraining: { lite: '', pro: '', proPlus: '' },
    demo: { total: '', response: '', avgRating: '' },
    expert: { total: '', response: '', avgRating: '' }
  };
}

function meetingMomentsForMonth(monthKey) {
  return (state.meeting.moments ?? []).filter((m) => m.month === monthKey);
}

function currentMeetingMonth() {
  return state.meeting.selectedMonth || currentMonthKey();
}

async function compressMeetingImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const MAX = 900;
      let { width: w, height: h } = img;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function updateMeetingPhotoSlot(slotIndex) {
  const slot = app.querySelector(`[data-photo-slot="${slotIndex}"]`);
  if (!slot) return;
  const photo = _meetingEditPhotos[slotIndex];
  if (photo) {
    slot.classList.add('has-photo');
    slot.innerHTML = `<img src="${photo}" alt="photo ${slotIndex + 1}"><button class="meeting-photo-clear" type="button" data-action="clear-meeting-photo" data-slot="${slotIndex}">&times;</button><input type="file" accept="image/*" class="meeting-photo-input" data-photo-file="${slotIndex}" style="display:none">`;
  } else {
    slot.classList.remove('has-photo');
    slot.innerHTML = `<div class="meeting-photo-slot-empty"><span>&#8679;</span><small>Photo ${slotIndex + 1}</small></div><input type="file" accept="image/*" class="meeting-photo-input" data-photo-file="${slotIndex}" style="display:none">`;
  }
}

function readAndSaveMeetingSummary(monthKey) {
  const v = (sel) => app.querySelector(sel)?.value ?? '';
  state.meeting.summaryData[monthKey] = {
    totalAttempts: v('[data-meeting-field="totalAttempts"]'),
    retraining: {
      lite: v('[data-meeting-retraining="lite"]'),
      pro: v('[data-meeting-retraining="pro"]'),
      proPlus: v('[data-meeting-retraining="proPlus"]')
    },
    demo: { total: v('[data-meeting-demo="total"]'), response: v('[data-meeting-demo="response"]'), avgRating: v('[data-meeting-demo="avgRating"]') },
    expert: { total: v('[data-meeting-expert="total"]'), response: v('[data-meeting-expert="response"]'), avgRating: v('[data-meeting-expert="avgRating"]') }
  };
}

function meetingSummaryModal() {
  if (!state.meeting.summaryModalOpen) return '';
  const monthKey = currentMeetingMonth();
  const s = meetingSummaryForMonth(monthKey);
  const rt = s.retraining ?? {};
  const dm = s.demo ?? {};
  const ex = s.expert ?? {};
  const field = (label, inputHtml) => `
    <div class="meeting-modal-field">
      <label class="meeting-modal-label">${escapeHtml(label)}</label>
      ${inputHtml}
    </div>`;
  const numInput = (val, attr, placeholder = '0') =>
    `<input type="number" min="0" class="meeting-text-input" ${attr} value="${escapeHtml(String(val ?? ''))}" placeholder="${placeholder}">`;
  const textInput = (val, attr, placeholder = '') =>
    `<input type="text" class="meeting-text-input" ${attr} value="${escapeHtml(String(val ?? ''))}" placeholder="${placeholder}">`;
  return `
    <div class="modal-backdrop meeting-summary-modal-backdrop" data-meeting-summary-modal-backdrop>
      <article class="import-modal meeting-summary-modal">
        <div class="import-modal-header">
          <h2>Monthly Summary — ${escapeHtml(periodLabel(monthKey))}</h2>
          <button class="icon-button" type="button" data-action="close-meeting-summary-modal" aria-label="Close">&times;</button>
        </div>
        <div class="meeting-modal-body">
          <div class="meeting-summary-modal-section">
            <div class="meeting-summary-modal-section-title">Total Attempts</div>
            ${field('Number of Attempts', numInput(s.totalAttempts, 'data-meeting-field="totalAttempts"'))}
          </div>
          <div class="meeting-summary-modal-section">
            <div class="meeting-summary-modal-section-title">Online : Re-Training</div>
            <div class="meeting-modal-row">
              ${field('Lite', numInput(rt.lite, 'data-meeting-retraining="lite"'))}
              ${field('Pro', numInput(rt.pro, 'data-meeting-retraining="pro"'))}
              ${field('Pro+', numInput(rt.proPlus, 'data-meeting-retraining="proPlus"'))}
            </div>
          </div>
          <div class="meeting-summary-modal-section">
            <div class="meeting-summary-modal-section-title">Demo</div>
            <div class="meeting-modal-row">
              ${field('Total Sessions', numInput(dm.total, 'data-meeting-demo="total"'))}
              ${field('Response Count', numInput(dm.response, 'data-meeting-demo="response"'))}
              ${field('Avg. Rating', textInput(dm.avgRating, 'data-meeting-demo="avgRating"', 'e.g. 4.5'))}
            </div>
          </div>
          <div class="meeting-summary-modal-section">
            <div class="meeting-summary-modal-section-title">Expert</div>
            <div class="meeting-modal-row">
              ${field('Total Sessions', numInput(ex.total, 'data-meeting-expert="total"'))}
              ${field('Response Count', numInput(ex.response, 'data-meeting-expert="response"'))}
              ${field('Avg. Rating', textInput(ex.avgRating, 'data-meeting-expert="avgRating"', 'e.g. 4.5'))}
            </div>
          </div>
        </div>
        <div class="import-modal-actions">
          <button class="button ghost" type="button" data-action="close-meeting-summary-modal">Cancel</button>
          <button class="button primary" type="button" data-action="save-meeting-summary" data-month="${escapeHtml(monthKey)}">&#8593; Save</button>
        </div>
      </article>
    </div>
  `;
}

function meetingMomentModal() {
  const isEdit = state.meeting.editingMomentId !== null;
  if (!isEdit && !state.meeting.addMomentOpen) return '';
  const moment = isEdit ? (state.meeting.moments ?? []).find((m) => m.id === state.meeting.editingMomentId) : null;
  return `
    <div class="modal-backdrop meeting-modal-backdrop" data-meeting-modal-backdrop>
      <article class="import-modal meeting-modal">
        <div class="import-modal-header">
          <h2>${isEdit ? 'Edit Moment' : 'Add On-site Moment'}</h2>
          <button class="icon-button" type="button" data-action="close-meeting-modal" aria-label="Close">&times;</button>
        </div>
        <div class="meeting-modal-body">
          <div class="meeting-modal-field">
            <label class="meeting-modal-label">Company Name</label>
            <input type="text" class="meeting-text-input" data-meeting-modal-field="companyName" value="${escapeHtml(moment?.companyName || '')}" placeholder="บริษัท XXX จำกัด">
          </div>
          <div class="meeting-modal-row">
            <div class="meeting-modal-field">
              <label class="meeting-modal-label">Activity Type</label>
              <input type="text" class="meeting-text-input" data-meeting-modal-field="activityType" value="${escapeHtml(moment?.activityType || '')}" placeholder="e.g. On-site Training">
            </div>
            <div class="meeting-modal-field">
              <label class="meeting-modal-label">Activity Name</label>
              <input type="text" class="meeting-text-input" data-meeting-modal-field="activityName" value="${escapeHtml(moment?.activityName || '')}" placeholder="e.g. Pro+ / IMP / 28 Users">
            </div>
          </div>
          <div class="meeting-modal-field" style="max-width:220px">
            <label class="meeting-modal-label">Date</label>
            <input type="date" class="meeting-text-input" data-meeting-modal-field="date" value="${escapeHtml(moment?.date || '')}">
          </div>
          <div class="meeting-modal-field">
            <label class="meeting-modal-label">Photos <span class="subtle">(max 2) — click slot, or Ctrl+V to paste</span></label>
            <div class="meeting-photo-slots">
              ${[0, 1].map((i) => {
                const photo = _meetingEditPhotos[i];
                return `<div class="meeting-photo-slot${photo ? ' has-photo' : ''}" data-photo-slot="${i}">${photo ? `<img src="${photo}" alt="photo ${i + 1}"><button class="meeting-photo-clear" type="button" data-action="clear-meeting-photo" data-slot="${i}">&times;</button>` : `<div class="meeting-photo-slot-empty"><span>&#8679;</span><small>Photo ${i + 1}</small></div>`}<input type="file" accept="image/*" class="meeting-photo-input" data-photo-file="${i}" style="display:none"></div>`;
              }).join('')}
            </div>
          </div>
        </div>
        <div class="import-modal-actions">
          ${isEdit ? `<button class="button ghost meeting-delete-btn" type="button" data-action="delete-meeting-moment" data-moment-id="${moment.id}">Delete</button>` : ''}
          <button class="button ghost" type="button" data-action="close-meeting-modal">Cancel</button>
          <button class="button primary" type="button" data-action="save-meeting-moment" data-month="${escapeHtml(currentMeetingMonth())}">Save</button>
        </div>
      </article>
    </div>
  `;
}

function meetingMetricCard(title, bodyHtml) {
  return `<div class="meeting-card"><div class="meeting-card-title">${escapeHtml(title)}</div><div class="meeting-card-body">${bodyHtml}</div></div>`;
}

function meetingMomentCard(m) {
  const photos = m.photos ?? [];
  return `
    <div class="meeting-moment-card">
      <div class="meeting-moment-card-header">
        <strong class="meeting-moment-company">${escapeHtml(m.companyName || 'Company')}</strong>
        <button class="icon-button" type="button" data-action="edit-meeting-moment" data-moment-id="${m.id}" title="Edit"><span class="pencil-icon">&#9999;</span></button>
      </div>
      <div class="meeting-moment-activity">${escapeHtml([m.activityType, m.activityName].filter(Boolean).join(' : '))}</div>
      <div class="meeting-moment-photos">
        ${photos.map((p) => `<div class="meeting-moment-photo"><img src="${p}" alt=""></div>`).join('')}
        ${Array(Math.max(0, 2 - photos.length)).fill('<div class="meeting-moment-photo empty"></div>').join('')}
      </div>
      <div class="meeting-moment-date">${escapeHtml(m.date ? displayDate(m.date) : '')}</div>
    </div>
  `;
}

function renderMeeting() {
  const monthKey = currentMeetingMonth();
  const summary = meetingSummaryForMonth(monthKey);
  const totalAttemptsDisplay = 4;
  const onsiteTrainingDisplay = 2;
  const retraining = summary.retraining ?? {};
  const retrainingTotal = (Number(retraining.lite) || 0) + (Number(retraining.pro) || 0) + (Number(retraining.proPlus) || 0);
  const demo = summary.demo ?? {};
  const expert = summary.expert ?? {};
  const moments = meetingMomentsForMonth(monthKey);

  return renderShell(`
    <div class="project-hero-banner">
      <div class="project-hero-text">
        <div class="project-hero-title">Venio Meeting</div>
        <div class="project-hero-date">${escapeHtml(periodLabel(monthKey))}</div>
      </div>
      <div class="project-hero-mascot">
        <img src="/assets/robot-mascot.png" alt="Team mascot" onerror="this.replaceWith(document.createTextNode('🤖'))">
      </div>
    </div>

    <div class="meeting-summary-toolbar">
      <label class="meeting-month-picker-wrap">
        <span>Month</span>
        <input type="month" class="meeting-month-input" value="${escapeHtml(monthKey)}" data-meeting-month>
      </label>
      <button class="button primary" type="button" data-action="open-meeting-summary-modal"><span class="pencil-icon">&#9999;</span> Add Summary</button>
    </div>

    <div class="meeting-summary-grid">
      ${meetingMetricCard('Total Attempts', `
        <div class="meeting-total-attempts-num">${totalAttemptsDisplay}</div>
      `)}
      ${meetingMetricCard('Onsite training', `
        <div class="meeting-total-attempts-num">${onsiteTrainingDisplay}</div>
      `)}
      ${meetingMetricCard('Online : Re-Training', `
        <div class="meeting-retraining-top">
          <div><span class="meeting-retraining-total-label">Total</span><div class="meeting-big-num retraining">${retrainingTotal}</div></div>
        </div>
        <div class="meeting-retraining-breakdown">
          ${[['lite','Lite'],['pro','Pro'],['proPlus','Pro+']].map(([k,lbl]) => `<div class="meeting-retraining-row"><span>${escapeHtml(lbl)} :</span><strong>${Number(retraining[k]) || 0}</strong></div>`).join('')}
        </div>
      `)}
      ${meetingMetricCard('Demo', `
        <div class="meeting-big-num">${Number(demo.total) || 0}</div>
        <div class="meeting-card-footer">
          <div class="meeting-footer-row"><span>Response :</span><strong>${Number(demo.response) || 0}</strong></div>
          <div class="meeting-footer-row"><span>Avg.Rating :</span><strong>${escapeHtml(String(demo.avgRating || '-'))}</strong></div>
        </div>
      `)}
      ${meetingMetricCard('Expert', `
        <div class="meeting-big-num">${Number(expert.total) || 0}</div>
        <div class="meeting-card-footer">
          <div class="meeting-footer-row"><span>Response :</span><strong>${Number(expert.response) || 0}</strong></div>
          <div class="meeting-footer-row"><span>Avg.Rating :</span><strong>${escapeHtml(String(expert.avgRating || '-'))}</strong></div>
        </div>
      `)}
    </div>

    <section class="panel meeting-moments-section">
      <div class="meeting-moments-header">
        <div class="meeting-moments-title">
          <span class="meeting-moments-icon">&#128247;</span>
          <h2>On-site Capture Moment</h2>
        </div>
        <button class="meeting-add-btn" type="button" data-action="add-meeting-moment" data-month="${escapeHtml(monthKey)}">+</button>
      </div>
      <div class="meeting-moments-grid">
        ${moments.length ? moments.map((m) => meetingMomentCard(m)).join('') : '<div class="meeting-moments-empty subtle">No moments yet for this month. Click + to add.</div>'}
      </div>
    </section>

    ${meetingSummaryModal()}
    ${meetingMomentModal()}
  `);
}

function currentManualYear() {
  return state.manual.selectedYear || String(new Date().getFullYear());
}

function currentManualMonth() {
  const year = currentManualYear();
  const mf = state.manual.selectedMonthFilter;
  return mf ? `${year}-${mf}` : currentMonthKey();
}

function manualEntriesForYear(year, monthFilter) {
  const prefix = monthFilter ? `${year}-${monthFilter}` : year;
  const raw = (state.manual.entries ?? []).filter((e) => {
    const d = e.date || '';
    return d.startsWith(prefix);
  });
  return raw.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

function manualEntriesForMonth(monthKey) {
  return (state.manual.entries ?? []).filter((e) => e.month === monthKey);
}

function manualMetrics(entries) {
  return {
    total: entries.length,
    newArticle: entries.filter((e) => e.type === 'New Article').length,
    improvement: entries.filter((e) => e.type === 'Improvement').length,
    video: entries.filter((e) => e.type === 'Video').length
  };
}

function manualModal() {
  const isEdit = state.manual.editingEntryId !== null;
  if (!isEdit && !state.manual.addModalOpen) return '';
  const entry = isEdit ? (state.manual.entries ?? []).find((e) => e.id === state.manual.editingEntryId) : null;
  const typeOptions = ['New Article', 'Improvement', 'Video'];
  return `
    <div class="modal-backdrop manual-modal-backdrop" data-manual-modal-backdrop>
      <article class="manual-modal">
        <div class="manual-modal-header">
          <h2>New Venio Manual</h2>
        </div>
        <div class="manual-modal-body">
          <div class="manual-modal-section-label">+ ADD</div>
          <input type="text" class="manual-text-input" data-manual-field="topic" value="${escapeHtml(entry?.topic || '')}" placeholder="Topic*" required>
          <div class="manual-url-wrap">
            <span class="manual-url-icon">&#128279;</span>
            <input type="url" class="manual-text-input manual-url-input" data-manual-field="url" value="${escapeHtml(entry?.url || '')}" placeholder="URL Link">
          </div>
          <div class="manual-modal-bottom-row">
            <select class="manual-select" data-manual-field="type">
              <option value="" ${!entry?.type ? 'selected' : ''} disabled>Type &#9660;</option>
              ${typeOptions.map((t) => `<option value="${escapeHtml(t)}" ${entry?.type === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
            </select>
            <input type="date" class="manual-select" data-manual-field="date" value="${escapeHtml(entry?.date || '')}">
            <button class="button ghost manual-cancel-btn" type="button" data-action="close-manual-modal">ยกเลิก</button>
            <button class="button primary manual-save-btn" type="button" data-action="save-manual-entry" data-month="${escapeHtml(currentManualMonth())}">เสร็จสิ้น</button>
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderManual() {
  const year = currentManualYear();
  const monthFilter = state.manual.selectedMonthFilter;
  const entries = manualEntriesForYear(year, monthFilter);
  const m = manualMetrics(entries);

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const bannerSubtitle = monthFilter ? `${MONTH_FULL[parseInt(monthFilter, 10) - 1]} ${year}` : year;

  const metricCard = (label, value) => `
    <div class="manual-metric-card">
      <div class="manual-metric-label">${escapeHtml(label)}</div>
      <div class="manual-metric-value">${value}</div>
    </div>`;

  const typeColor = { 'New Article': 'manual-type-article', 'Improvement': 'manual-type-improve', 'Video': 'manual-type-video' };

  return renderShell(`
    <div class="project-hero-banner">
      <div class="project-hero-text">
        <div class="project-hero-title">Venio Manual</div>
        <div class="project-hero-date">${escapeHtml(bannerSubtitle)}</div>
      </div>
      <div class="project-hero-mascot">
        <img src="/assets/robot-mascot.png" alt="mascot" onerror="this.replaceWith(document.createTextNode('&#129302;'))">
      </div>
    </div>

    <div class="manual-toolbar">
      <label class="meeting-month-picker-wrap">
        <span>Year</span>
        <input type="number" class="meeting-month-input manual-year-input" min="2020" max="2035" value="${escapeHtml(year)}" data-manual-year>
      </label>
      <label class="meeting-month-picker-wrap">
        <span>Month</span>
        <select class="meeting-month-input" data-manual-month-filter>
          <option value="">All months</option>
          ${MONTH_NAMES.map((name, i) => {
            const mm = String(i + 1).padStart(2, '0');
            return `<option value="${mm}" ${monthFilter === mm ? 'selected' : ''}>${name}</option>`;
          }).join('')}
        </select>
      </label>
      <button class="button primary" type="button" data-action="add-manual-entry">+ Add</button>
    </div>

    <div class="manual-metrics-grid">
      ${metricCard('Total', m.total)}
      ${metricCard('New Article', m.newArticle)}
      ${metricCard('Improvement', m.improvement)}
      ${metricCard('Video', m.video)}
    </div>

    <section class="panel manual-table-section">
      <table class="manual-table">
        <thead>
          <tr>
            <th class="manual-th-topic">Topic</th>
            <th class="manual-th-type">Type</th>
            <th class="manual-th-date">Date</th>
            ${state.manual.editMode ? '<th class="manual-th-actions"></th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${entries.length ? entries.map((e) => `
            <tr class="manual-row">
              <td>${e.url ? `<a href="${escapeHtml(e.url)}" target="_blank" rel="noopener" class="manual-topic-link">${escapeHtml(e.topic)}</a>` : escapeHtml(e.topic)}</td>
              <td><span class="manual-type-pill ${typeColor[e.type] ?? ''}">${escapeHtml(e.type)}</span></td>
              <td class="manual-date-cell">${escapeHtml(e.date ? displayDate(e.date) : '')}</td>
              ${state.manual.editMode ? `<td class="manual-actions-cell"><button class="icon-button" data-action="edit-manual-entry" data-entry-id="${e.id}" title="Edit"><span class="pencil-icon">&#9999;</span></button><button class="icon-button manual-delete-btn" data-action="delete-manual-entry" data-entry-id="${e.id}" title="Delete">&times;</button></td>` : ''}
            </tr>`
          ).join('') : `<tr><td colspan="${state.manual.editMode ? 4 : 3}" class="manual-empty">No entries for this period.</td></tr>`}
        </tbody>
      </table>
    </section>

    <div class="manual-fab-row">
      <button class="manual-fab" type="button" data-action="add-manual-entry" title="Add entry">+</button>
      <button class="manual-fab manual-fab-edit ${state.manual.editMode ? 'active' : ''}" type="button" data-action="toggle-manual-edit" title="Edit mode"><span class="pencil-icon">&#9999;</span></button>
    </div>

    ${manualModal()}
  `);
}

function renderPlaceholder(title, status) {
  return renderShell(`
    ${pageHeader(title, status)}
    <section class="placeholder-panel">
      <div class="module-icon large">&#9638;</div>
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
      ${data.map(([key, value], index) => {
        const [x, y] = points.split(' ')[index].split(',');
        return `<circle cx="${x}" cy="${y}" r="5" tabindex="0" aria-label="${escapeHtml(`${periodLabel(key)}: ${value} issues`)}"><title>${escapeHtml(periodLabel(key))}: ${value} issues</title></circle>`;
      }).join('')}
    </svg>
  `;
}

function projectAddImportModal() {
  if (!state.projectTracking.importModal) return '';
  const latest = state.projectTrackingBatches[0];
  const packageEmoji = { Lite: '⭐', Pro: '🌟', 'Pro+': '💫' };
  return `
    <div class="modal-backdrop import-modal-backdrop" data-project-import-backdrop>
      <article class="import-modal">
        <div class="import-modal-header">
          <h2>Import Data</h2>
          <button class="icon-button" type="button" data-action="close-project-import-modal" aria-label="Close">${icon('close')}</button>
        </div>
        <div class="import-modal-body">
          <div class="import-modal-left">
            <div class="import-modal-section-label">+ ADD</div>
            <div class="import-add-form" data-project-add-form>
              <input class="import-field-input" type="text" data-add-field="customer_name" placeholder="Customer Name*">
              <div class="import-field-row">
                <div class="import-select-wrap">
                  <select class="import-field-select" data-add-field="package_type">
                    ${['Lite', 'Pro', 'Pro+'].map((p) => `<option value="${p}">${packageEmoji[p] ?? ''} ${p}</option>`).join('')}
                  </select>
                </div>
                <input class="import-field-input" type="number" min="0" data-add-field="user_count" placeholder="User">
              </div>
              <div class="import-date-list">
                <div class="import-date-row">
                  <span class="import-date-label">Kick-Off</span>
                  <div class="import-date-input-wrap">
                    <input class="import-field-date" type="date" data-add-field="kickoff_date">
                  </div>
                </div>
                <div class="import-date-row">
                  <span class="import-date-label">Onboarding</span>
                  <div class="import-date-input-wrap">
                    <input class="import-field-date" type="date" data-add-field="onboarding_date">
                  </div>
                </div>
                <div class="import-date-row">
                  <span class="import-date-label">Training</span>
                  <div class="import-date-input-wrap">
                    <input class="import-field-date" type="date" data-add-field="training_date">
                  </div>
                </div>
                <div class="import-date-row">
                  <span class="import-date-label">Golive</span>
                  <div class="import-date-input-wrap">
                    <input class="import-field-date" type="date" data-add-field="golive_date">
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="import-modal-divider"></div>
          <div class="import-modal-right">
            <div class="import-modal-section-label">Import File .CSV</div>
            <label class="import-drop-zone" for="project-xlsx-input">
              <div class="import-drop-icon">${icon('upload')}</div>
              <span>Drop file / Select file</span>
              <input id="project-xlsx-input" type="file" accept=".xlsx" data-action="project-xlsx-file" style="display:none">
            </label>
            <p class="import-drop-note subtle">
              ${latest ? `Latest: <strong>${escapeHtml(middleEllipsis(latest.filename, 28))}</strong> · ${latest.valid_rows} projects` : 'No project workbook imported yet.'}
            </p>
            <button class="button primary import-xlsx-btn" type="button" data-action="upload-project-xlsx">${icon('upload')} Import Excel</button>
            ${state.projectTrackingBatches.length ? `
              <div class="import-batch-history">
                <div class="import-modal-section-label" style="margin-top:16px;margin-bottom:8px">Import History</div>
                ${state.projectTrackingBatches.map((b) => `
                  <div class="import-batch-row">
                    <div class="import-batch-info">
                      <strong>${escapeHtml(middleEllipsis(b.filename, 24))}</strong>
                      <span>${b.valid_rows} projects · ${displayDate(b.imported_at)}</span>
                    </div>
                    <button class="icon-button delete-batch-btn" data-action="delete-project-batch" data-batch-id="${b.id}" title="Delete this import">${icon('close')}</button>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
        <div class="import-modal-actions">
          <button class="button ghost" type="button" data-action="close-project-import-modal">ยกเลิก</button>
          <button class="button primary" type="button" data-action="submit-add-project">เสร็จสิ้น</button>
        </div>
      </article>
    </div>
  `;
}

function genericUploadModal() {
  if (!state.uploadModal) return '';
  const issueImportHistory = state.batches.length ? `
    <div class="import-batch-history">
      <div class="import-batch-history-title">Imported Files</div>
      ${state.batches.map((batch) => `
        <div class="import-batch-row">
          <span class="import-batch-name" title="${escapeHtml(batch.filename)}">${escapeHtml(middleEllipsis(batch.filename, 28))}</span>
          <span class="import-batch-meta">${batch.valid_rows} rows · ${displayDate(batch.imported_at)}</span>
          <button class="icon-button import-batch-delete" type="button" data-action="delete-batch" data-batch-id="${batch.id}" title="Delete this import" aria-label="Delete import ${escapeHtml(batch.filename)}">&#128465;</button>
        </div>
      `).join('')}
    </div>
  ` : '';
  const config = {
    venio: {
      title: 'Import Venio CSV',
      note: 'Prepared dashboard CSV with Report Date, Last Updated Date, Resolved Date, Time to Solve, and Pending Age columns.',
      accept: '.csv,text/csv',
      action: 'csv-file',
      submit: 'upload-csv',
      btnLabel: 'Upload CSV',
      extra: `
        <label class="import-month-label"><span>Month</span><input type="month" data-venio-import-month value="${escapeHtml(currentVenioMonth())}"></label>
        ${issueImportHistory}
      `
    },
    etaxgo: {
      title: 'Import eTaxGo CSV',
      note: 'Prepared dashboard CSV with Report Date, Last Updated Date, Resolved Date, Time to Solve, and Pending Age columns for eTaxGo issues.',
      accept: '.csv,text/csv',
      action: 'csv-file',
      submit: 'upload-etaxgo-csv',
      btnLabel: 'Upload CSV',
      extra: `
        <label class="import-month-label"><span>Month</span><input type="month" data-etaxgo-import-month value="${escapeHtml(currentEtaxGoMonth())}"></label>
        ${issueImportHistory}
      `
    },
    jira: {
      title: 'Import Jira CSV',
      note: 'Raw Jira export CSV. Only Venio project issues of type Production Issue or Beauty are imported. Each issue is grouped by its created date.',
      accept: '.csv,text/csv',
      action: 'jira-file',
      submit: 'upload-jira-csv',
      btnLabel: 'Import Jira CSV',
      extra: state.batches.length ? `
        <div class="import-batch-history">
          <div class="import-batch-history-title">Previous Imports</div>
          ${state.batches.map((batch) => `
            <div class="import-batch-row">
              <span class="import-batch-name" title="${escapeHtml(batch.filename)}">${escapeHtml(middleEllipsis(batch.filename, 28))}</span>
              <span class="import-batch-meta">${batch.valid_rows} rows · ${displayDate(batch.imported_at)}</span>
              <button class="icon-button import-batch-delete" type="button" data-action="delete-batch" data-batch-id="${batch.id}" title="Delete this import" aria-label="Delete import ${escapeHtml(batch.filename)}">&#128465;</button>
            </div>
          `).join('')}
        </div>
      ` : ''
    },
    crisp: {
      title: 'Import Crisp CSV',
      note: 'Monthly Crisp operator analytics export. Importing the same month again replaces that month.',
      accept: '.csv,text/csv',
      action: 'crisp-csv-file',
      submit: 'upload-crisp-csv',
      btnLabel: 'Import Crisp CSV',
      extra: `<label class="import-month-label"><span>Month</span><input type="month" data-crisp-import-month value="${escapeHtml(state.crisp.selectedMonth || currentMonthKey())}"></label>`
    },
    'etaxgo-jira': {
      title: 'Import Jira CSV (eTaxGo)',
      note: 'Raw Jira export CSV. Only eTaxGo project issues of type Production Issue, Request, or Beauty are imported. Each issue is grouped by its created date.',
      accept: '.csv,text/csv',
      action: 'etaxgo-jira-file',
      submit: 'upload-etaxgo-jira-csv',
      btnLabel: 'Import Jira CSV',
      extra: state.batches.length ? `
        <div class="import-batch-history">
          <div class="import-batch-history-title">Previous Imports</div>
          ${state.batches.map((batch) => `
            <div class="import-batch-row">
              <span class="import-batch-name" title="${escapeHtml(batch.filename)}">${escapeHtml(middleEllipsis(batch.filename, 28))}</span>
              <span class="import-batch-meta">${batch.valid_rows} rows · ${displayDate(batch.imported_at)}</span>
              <button class="icon-button import-batch-delete" type="button" data-action="delete-batch" data-batch-id="${batch.id}" title="Delete this import" aria-label="Delete import ${escapeHtml(batch.filename)}">&#128465;</button>
            </div>
          `).join('')}
        </div>
      ` : ''
    }
  };
  const c = config[state.uploadModal];
  if (!c) return '';
  return `
    <div class="modal-backdrop import-modal-backdrop" data-upload-modal-backdrop>
      <article class="import-modal import-modal-single">
        <div class="import-modal-header">
          <h2>${escapeHtml(c.title)}</h2>
          <button class="icon-button" type="button" data-action="close-upload-modal" aria-label="Close">${icon('close')}</button>
        </div>
        <div class="import-modal-body import-modal-body-single">
          <div class="import-modal-right" style="flex:1">
            <label class="import-drop-zone${state.uploadSelectedFiles.length ? ' has-file' : ''}" for="generic-upload-input-${state.uploadModal}">
              <div class="import-drop-icon" style="${state.uploadSelectedFiles.length ? 'color:#1a7a40' : ''}">
                ${state.uploadSelectedFiles.length ? '&#10003;' : icon('upload')}
              </div>
              <span>${state.uploadSelectedFiles.length ? escapeHtml(state.uploadSelectedFiles.join(', ')) : 'Drop file / Select file'}</span>
              <input id="generic-upload-input-${state.uploadModal}" type="file" accept="${c.accept}" data-action="${c.action}" style="display:none" multiple>
            </label>
            <p class="import-drop-note subtle">${escapeHtml(c.note)}</p>
            ${c.extra ?? ''}
          </div>
        </div>
        ${state.uploadResult ? `<div class="import-result import-result-${state.uploadResult.type}">${escapeHtml(state.uploadResult.message)}</div>` : ''}
        <div class="import-modal-actions">
          <button class="button ghost" type="button" data-action="close-upload-modal">ยกเลิก</button>
          <button class="button primary" type="button" data-action="${c.submit}" ${state.uploadLoading ? 'disabled' : ''}>${state.uploadLoading ? `&#8987; Importing…` : `${icon('upload')} ${escapeHtml(c.btnLabel)}`}</button>
        </div>
      </article>
    </div>
  `;
}

function projectImportPanel(latest) {
  return `
    <section class="panel project-import-panel">
      <div>
        <div class="section-label">Excel Import</div>
        <h2>Implementation Project Data</h2>
        <p class="subtle">Upload the deal summary Excel file. Matching projects update from the newest import instead of duplicating.</p>
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
            <div class="monthly-bar-item chart-hoverable" tabindex="0" aria-label="${escapeHtml(`${periodLabel(key)}: ${value} issues`)}" data-chart-tooltip="${escapeHtml(`${periodLabel(key)}: ${value} issues`)}">
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
      </div>
      <div class="distribution-filter-bar" aria-label="Issue type distribution filters">
        ${dashboardSelect('distribution_grain', 'Group by', grain, [
          { value: 'month', label: 'Month' },
          { value: 'quarter', label: 'Quarter' }
        ])}
        ${dashboardSelect('distribution_period', 'Period', selected, periodSelectOptions(options))}
      </div>
      <div class="distribution-layout">
        <div class="donut-chart" style="--donut:${donut.background}" title="${donut.total} issues in selected distribution">
          <div><strong>${donut.total}</strong><span>issues</span></div>
        </div>
        <div class="donut-legend">
          ${donut.legend.map((item) => `
            <div class="chart-hoverable" tabindex="0" aria-label="${escapeHtml(`${item.label}: ${item.value} issues, ${formatPercent(percent(item.value, donut.total))}`)}" data-chart-tooltip="${escapeHtml(`${item.label}: ${item.value} issues, ${formatPercent(percent(item.value, donut.total))}`)}">
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
            tabindex="0"
            aria-label="${escapeHtml(`${label}: ${value} issues, ${formatPercent(percent(value, total))}`)}"
          ></div>
        `).join('')}
      </div>
      <div class="resolution-cards">
        ${entries.map(([label, value]) => {
          const cardLabel = label === 'Unresolved/Pending' ? 'Unresolved' : label;
          return `
          <div class="resolution-card ${slug(label)} chart-hoverable" tabindex="0" aria-label="${escapeHtml(`${label}: ${value} issues, ${formatPercent(percent(value, total))}`)}" data-chart-tooltip="${escapeHtml(`${label}: ${value} issues, ${formatPercent(percent(value, total))}`)}">
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

function venioViewTabs() {
  const tabs = [
    ['dashboard', 'Executive Briefing', 'dashboard'],
    ['board', 'Issue Board', 'board'],
    ['settings', 'Settings', 'settings']
  ];
  return `
    <div class="project-board-tabs" aria-label="Venio Issue views">
      ${tabs.map(([key, label, iconKey]) => `
        <button class="${state.venioView === key ? 'active' : ''}" type="button" data-venio-view="${key}">
          ${icon(iconKey)} ${escapeHtml(label)}
        </button>
      `).join('')}
      <div style="flex:1"></div>
      <button class="button primary" type="button" data-action="open-upload-modal" data-type="venio">
        ${icon('upload')} Import CSV
      </button>
    </div>
  `;
}

function renderVenioWorkspace() {
  const headers = {
    dashboard: ['Issue Intelligence Dashboard', 'Monthly and quarterly service issue signal for product focus.'],
    board: ['Issue Board', 'Operational board grouped by current status category.'],
    settings: ['Settings', 'Configure thresholds, dark mode, and category keyword rules.']
  };
  const [title, hint] = headers[state.venioView] ?? headers.dashboard;
  let content;
  if (state.venioView === 'board') content = boardContent();
  else if (state.venioView === 'settings') content = settingsContent();
  else content = executiveDashboardContent();
  const showFilter = state.venioView === 'board';
  return renderShell(`
    <div class="project-hero-banner">
      <div class="project-hero-text">
        <div class="project-hero-title">Venio Issue</div>
        <div class="project-hero-date">${escapeHtml(periodLabel(currentVenioMonth()))}</div>
      </div>
      <div class="project-hero-mascot">
        <img src="/assets/robot-mascot.png" alt="Team mascot" onerror="this.replaceWith(document.createTextNode('&#129302;'))">
      </div>
    </div>
    ${showFilter ? filterPanel() : ''}
    ${venioViewTabs()}
    ${content}
  `);
}

function currentVenioMonth() {
  return state.venioIssue.selectedMonth || currentMonthKey();
}

// ── eTaxGo Workspace ──────────────────────────────────────────────────────────

function etaxGoMonthPicker() {
  const allIssues = etaxGoIssues(state.issues);
  const issueKeys = [...new Set(allIssues.map((i) => monthKey(i.report_date)).filter((k) => k !== 'Unknown'))].sort();
  const selected = currentEtaxGoMonth();
  const keys = issueKeys.length ? issueKeys : [selected];
  return `
    <label class="venio-month-label">
      <span>Month</span>
      <select class="venio-month-select" data-etaxgo-issue-month>
        ${keys.map((k) => `<option value="${escapeHtml(k)}" ${selected === k ? 'selected' : ''}>${escapeHtml(periodLabel(k))}</option>`).join('')}
      </select>
    </label>
  `;
}

function etaxGoViewTabs() {
  const tabs = [
    ['dashboard', 'Executive Briefing', 'dashboard'],
    ['board', 'Issue Board', 'board'],
    ['settings', 'Settings', 'settings']
  ];
  return `
    <div class="project-board-tabs" aria-label="eTaxGo Issue views">
      ${tabs.map(([key, label, iconKey]) => `
        <button class="${state.etaxgoView === key ? 'active' : ''}" type="button" data-etaxgo-view="${key}">
          ${icon(iconKey)} ${escapeHtml(label)}
        </button>
      `).join('')}
      <div style="flex:1"></div>
      <button class="button primary" type="button" data-action="open-upload-modal" data-type="etaxgo">
        ${icon('upload')} Import CSV
      </button>
      <button class="button ghost" type="button" data-action="open-upload-modal" data-type="etaxgo-jira">
        ${icon('upload')} Import Jira CSV
      </button>
    </div>
  `;
}

function executiveEtaxGoDashboardContentLegacy() {
  const allEtaxGo = etaxGoIssues(state.issues);
  const selMonth = currentEtaxGoMonth();
  const [selYear, selMon] = selMonth.split('-').map(Number);

  const prevMonth = selMon === 1
    ? `${selYear - 1}-12`
    : `${selYear}-${String(selMon - 1).padStart(2, '0')}`;

  const monthItems = allEtaxGo.filter((i) => monthKey(i.report_date) === selMonth);
  const prevItems = allEtaxGo.filter((i) => monthKey(i.report_date) === prevMonth);

  // KPI: Total Issues
  const totalCount = monthItems.length;
  const prevTotalCount = prevItems.length;
  const totalDiff = totalCount - prevTotalCount;
  const totalPct = prevTotalCount > 0 ? Math.round((totalDiff / prevTotalCount) * 100) : null;
  const totalTrend = totalDiff > 0 ? 'danger' : totalDiff < 0 ? 'ok' : '';
  const totalTrendText = totalPct !== null ? `${totalDiff >= 0 ? '+' : ''}${totalPct}% vs last month` : 'No prior month';

  // KPI: by issue type
  const piCount = monthItems.filter((i) => i.issue_type === 'Production Issue').length;
  const requestCount = monthItems.filter((i) => i.issue_type === 'Request').length;
  const beautyCount = monthItems.filter((i) => i.issue_type === 'Beauty').length;

  // KPI: Stale Issues (all-time open, no update 30+ days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const staleIssues = allEtaxGo.filter((i) => {
    if (isResolved(i)) return false;
    const updated = i.last_updated_date ? new Date(i.last_updated_date) : null;
    return !updated || updated < thirtyDaysAgo;
  });

  // Issue Type Distribution donut
  const typeEntries = [
    ['Production Issue', piCount, '#0275e0'],
    ['Request', requestCount, '#10b981'],
    ['Beauty', beautyCount, '#fb7185']
  ].filter(([, v]) => v > 0);
  const typeTotal = typeEntries.reduce((s, [, v]) => s + v, 0);
  const typePieBg = typeTotal
    ? (() => {
        let cursor = 0;
        const segs = typeEntries.map(([, v, c]) => {
          const start = cursor;
          const end = cursor + (v / typeTotal) * 100;
          cursor = end;
          return `${c} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
        });
        return `conic-gradient(${segs.join(', ')})`;
      })()
    : 'conic-gradient(var(--line) 0 100%)';

  // Issue Category bar — current month only, sortable
  const catSort = state.etaxgoIssue.categorySort ?? 'desc';
  const monthCatCounts = countByEtaxGoCategory(monthItems);
  const sortedCats = catSort === 'asc'
    ? [...monthCatCounts].sort((a, b) => a[1] - b[1])
    : monthCatCounts;
  const catMax = Math.max(1, ...sortedCats.map(([, v]) => v));

  // Resolution Rate donut
  const resolvedCount = monthItems.filter((i) => isResolved(i)).length;
  const unresolvedCount = monthItems.length - resolvedCount;
  const resRate = monthItems.length ? Math.round((resolvedCount / monthItems.length) * 100) : 0;
  const resPieBg = monthItems.length
    ? `conic-gradient(#10b981 0% ${resRate}%, var(--line) ${resRate}% 100%)`
    : 'conic-gradient(var(--line) 0 100%)';

  // Aging Watchlist: top 5 open eTaxGo issues by pending age (all-time)
  const agingList = allEtaxGo
    .filter((i) => !isResolved(i))
    .sort((a, b) => number(b.pending_age_hours) - number(a.pending_age_hours))
    .slice(0, 5);

  return `
    <div class="venio-dashboard-toolbar">
      ${etaxGoMonthPicker()}
    </div>

    <div class="venio-kpi-row">
      <div class="venio-kpi-card ${totalTrend}">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Total Issues</span>
          <span class="venio-kpi-icon">&#128196;</span>
        </div>
        <strong class="venio-kpi-value">${totalCount}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--${totalTrend || 'muted'}">${escapeHtml(totalTrendText)}</span>
      </div>
      <div class="venio-kpi-card">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Production Issues</span>
          <span class="venio-kpi-icon">&#128683;</span>
        </div>
        <strong class="venio-kpi-value">${piCount}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--muted">${escapeHtml(periodLabel(selMonth))}</span>
      </div>
      <div class="venio-kpi-card">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Request</span>
          <span class="venio-kpi-icon">&#128203;</span>
        </div>
        <strong class="venio-kpi-value">${requestCount}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--muted">${escapeHtml(periodLabel(selMonth))}</span>
      </div>
      <div class="venio-kpi-card">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Beauty</span>
          <span class="venio-kpi-icon">&#10024;</span>
        </div>
        <strong class="venio-kpi-value">${beautyCount}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--muted">${escapeHtml(periodLabel(selMonth))}</span>
      </div>
      <div class="venio-kpi-card ${staleIssues.length ? 'danger' : 'ok'}">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Stale Issues</span>
          <span class="venio-kpi-icon">&#9200;</span>
        </div>
        <strong class="venio-kpi-value">${staleIssues.length}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--${staleIssues.length ? 'danger' : 'ok'}">Open · no update 30+ days</span>
      </div>
    </div>

    <div class="venio-mid-grid">
      <section class="panel">
        <div class="panel-title">
          <div>
            <h2>Issue Type Distribution</h2>
            <span>${escapeHtml(periodLabel(selMonth))}</span>
          </div>
        </div>
        ${typeTotal ? `
        <div class="venio-pie-layout">
          <div class="venio-pie" style="background:${typePieBg}" title="${typeTotal} issues"></div>
          <div class="venio-pie-legend">
            ${typeEntries.map(([label, value, color]) => `
              <div class="venio-pie-legend-row">
                <span class="venio-legend-dot" style="background:${color}"></span>
                <span class="venio-pie-label">${escapeHtml(label)}</span>
                <span>
                  <strong class="venio-pie-count">${value}</strong>
                  <span class="venio-pie-pct">${formatPercent(percent(value, typeTotal))}</span>
                </span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : `<div class="venio-empty-state">&#128202; No issue data for <strong>${escapeHtml(periodLabel(selMonth))}</strong>.<br><span>Switch to a month with imported data.</span></div>`}
      </section>

      <section class="panel chart-panel">
        <div class="panel-title">
          <div>
            <h2>Issue Category</h2>
            <span>${escapeHtml(periodLabel(selMonth))} · ${monthItems.length} issues</span>
          </div>
          <div class="venio-sort-btns">
            <button class="venio-sort-btn ${catSort === 'desc' ? 'active' : ''}" type="button" data-etaxgo-category-sort="desc" title="Sort descending">&#8595; Desc</button>
            <button class="venio-sort-btn ${catSort === 'asc' ? 'active' : ''}" type="button" data-etaxgo-category-sort="asc" title="Sort ascending">&#8593; Asc</button>
          </div>
        </div>
        <div class="bar-list">
          ${sortedCats.length ? sortedCats.map(([label, value]) => `
            <div class="bar-row">
              <div class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (value / catMax) * 100)}%"></div></div>
              <strong>${value}</strong>
            </div>
          `).join('') : `<div class="venio-empty-state">&#128202; No issues in ${escapeHtml(periodLabel(selMonth))}.</div>`}
        </div>
      </section>
    </div>

    <div class="venio-mid-grid" style="margin-top:0">
      <section class="panel">
        <div class="panel-title">
          <div>
            <h2>Resolution Rate</h2>
            <span>${escapeHtml(periodLabel(selMonth))}</span>
          </div>
        </div>
        ${monthItems.length ? `
        <div class="venio-pie-layout">
          <div class="venio-pie" style="background:${resPieBg}" title="${resolvedCount} of ${monthItems.length} resolved (${resRate}%)"></div>
          <div class="venio-pie-legend">
            <div class="venio-pie-legend-row">
              <span class="venio-legend-dot" style="background:#10b981"></span>
              <span class="venio-pie-label">Resolved</span>
              <span>
                <strong class="venio-pie-count">${resolvedCount}</strong>
                <span class="venio-pie-pct">${formatPercent(percent(resolvedCount, monthItems.length))}</span>
              </span>
            </div>
            <div class="venio-pie-legend-row">
              <span class="venio-legend-dot" style="background:var(--line)"></span>
              <span class="venio-pie-label">Open</span>
              <span>
                <strong class="venio-pie-count">${unresolvedCount}</strong>
                <span class="venio-pie-pct">${formatPercent(percent(unresolvedCount, monthItems.length))}</span>
              </span>
            </div>
          </div>
        </div>
        ` : `<div class="venio-empty-state">&#128202; No issue data for ${escapeHtml(periodLabel(selMonth))}.</div>`}
      </section>

      <section class="panel watchlist-panel">
        <div class="panel-title">
          <h2>Aging Watchlist</h2>
          <span>Top 5 open issues by age</span>
        </div>
        <div class="watchlist">
          ${agingList.map((issue) => `
            <button class="watch-row" data-open-issue="${issue.id}">
              <span class="watch-key">${escapeHtml(issue.issue_key)}</span>
              <span class="watch-summary">${escapeHtml(issue.customer_code || '-')}</span>
              <span class="watch-meta">${escapeHtml(issue.summary || '-')}</span>
              <strong class="${pendingLevel(issue) || ''}">${issue.pending_age_hours ? Number(issue.pending_age_hours / 24).toFixed(1) + 'd' : '-'}</strong>
            </button>
          `).join('') || '<div class="subtle" style="padding:1rem">No open issues.</div>'}
        </div>
      </section>
    </div>
  `;
}

function etaxGoBoardContent() {
  const allEtaxGo = etaxGoIssues(state.issues);
  const columns = boardColumns();
  const groups = new Map(columns.map((column) => [column, []]));
  for (const issue of allEtaxGo) {
    const key = boardColumnForIssue(issue);
    groups.get(key).push(issue);
  }
  return `
    <section class="board">
      ${columns.map((column) => `
        <div class="column">
          <div class="column-head"><h2>${column}</h2><span class="pill">${groups.get(column).length}</span></div>
          ${groups.get(column).map((issue) => {
            const level = pendingLevel(issue);
            const high = isHighPriority(issue) ? 'high-priority' : '';
            const pending = number(issue.pending_age_hours);
            const categoryBadge = `<span class="mini-badge">${escapeHtml(categoryForEtaxGoIssue(issue))}</span>`;
            return `
              <button class="issue-card ${level} ${high}" data-open-issue="${issue.id}">
                <span class="issue-card-labels">
                  <span class="label-strip priority-${slug(issue.priority)}"></span>
                  <span class="label-strip category-label"></span>
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
          }).join('') || '<div class="subtle">No issues</div>'}
        </div>
      `).join('')}
    </section>
  `;
}

function executiveEtaxGoDashboardContent() {
  const allEtaxGo = etaxGoIssues(state.issues);
  const allPi = productionIssues(allEtaxGo);
  const selMonth = currentEtaxGoMonth();
  const [selYear, selMon] = selMonth.split('-').map(Number);

  const prevMonth = selMon === 1
    ? `${selYear - 1}-12`
    : `${selYear}-${String(selMon - 1).padStart(2, '0')}`;

  const monthItems = allEtaxGo.filter((issue) => monthKey(issue.report_date) === selMonth);
  const prevItems = allEtaxGo.filter((issue) => monthKey(issue.report_date) === prevMonth);

  const totalCount = monthItems.length;
  const prevTotalCount = prevItems.length;
  const totalDiff = totalCount - prevTotalCount;
  const totalPct = prevTotalCount > 0 ? Math.round((totalDiff / prevTotalCount) * 100) : null;
  const totalTrend = totalDiff > 0 ? 'danger' : totalDiff < 0 ? 'ok' : '';
  const totalTrendText = totalPct !== null ? `${totalDiff >= 0 ? '+' : ''}${totalPct}% vs last month` : 'No prior month';

  const piCount = monthItems.filter((issue) => issue.issue_type === 'Production Issue').length;
  const requestCount = monthItems.filter((issue) => issue.issue_type === 'Request').length;
  const beautyCount = monthItems.filter((issue) => issue.issue_type === 'Beauty').length;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const staleIssues = allEtaxGo.filter((issue) => {
    if (isResolved(issue)) return false;
    const updated = issue.last_updated_date ? new Date(issue.last_updated_date) : null;
    return !updated || updated < thirtyDaysAgo;
  });

  const typeEntries = [
    ['Production Issue', piCount, '#0275e0'],
    ['Request', requestCount, '#10b981'],
    ['Beauty', beautyCount, '#fb7185']
  ].filter(([, value]) => value > 0);
  const typeTotal = typeEntries.reduce((sum, [, value]) => sum + value, 0);
  const typePieBg = typeTotal
    ? (() => {
        let cursor = 0;
        const segments = typeEntries.map(([, value, color]) => {
          const start = cursor;
          const end = cursor + (value / typeTotal) * 100;
          cursor = end;
          return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
        });
        return `conic-gradient(${segments.join(', ')})`;
      })()
    : 'conic-gradient(var(--line) 0 100%)';

  const catSort = state.etaxgoIssue.categorySort ?? 'desc';
  const monthCatCounts = countByEtaxGoCategory(monthItems);
  const sortedCats = catSort === 'asc'
    ? [...monthCatCounts].sort((a, b) => a[1] - b[1])
    : monthCatCounts;
  const catMax = Math.max(1, ...sortedCats.map(([, value]) => value));

  const resolvedCount = monthItems.filter((issue) => isResolved(issue)).length;
  const unresolvedCount = monthItems.length - resolvedCount;
  const resRate = monthItems.length ? Math.round((resolvedCount / monthItems.length) * 100) : 0;
  const resPieBg = monthItems.length
    ? `conic-gradient(#10b981 0% ${resRate}%, var(--line) ${resRate}% 100%)`
    : 'conic-gradient(var(--line) 0 100%)';

  const agingList = allPi
    .filter((issue) => !isResolved(issue) && number(issue.pending_age_hours) / 24 > 30)
    .sort((a, b) => number(b.pending_age_hours) - number(a.pending_age_hours))
    .map((issue) => ({
      ...issue,
      pending_age_days: number(issue.pending_age_hours) / 24
    }));

  return `
    <div class="venio-dashboard-toolbar">
      ${etaxGoMonthPicker()}
    </div>

    <div class="venio-kpi-row">
      <div class="venio-kpi-card ${totalTrend}">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Total Issues</span>
          <span class="venio-kpi-icon">&#128196;</span>
        </div>
        <strong class="venio-kpi-value">${totalCount}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--${totalTrend || 'muted'}">${escapeHtml(totalTrendText)}</span>
      </div>
      <div class="venio-kpi-card">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Production Issues</span>
          <span class="venio-kpi-icon">&#128683;</span>
        </div>
        <strong class="venio-kpi-value">${piCount}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--muted">${escapeHtml(periodLabel(selMonth))}</span>
      </div>
      <div class="venio-kpi-card">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Request</span>
          <span class="venio-kpi-icon">&#128203;</span>
        </div>
        <strong class="venio-kpi-value">${requestCount}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--muted">${escapeHtml(periodLabel(selMonth))}</span>
      </div>
      <div class="venio-kpi-card">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Beauty</span>
          <span class="venio-kpi-icon">&#10024;</span>
        </div>
        <strong class="venio-kpi-value">${beautyCount}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--muted">${escapeHtml(periodLabel(selMonth))}</span>
      </div>
      <div class="venio-kpi-card ${staleIssues.length ? 'danger' : 'ok'}">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Stale Issues</span>
          <span class="venio-kpi-icon">&#9200;</span>
        </div>
        <strong class="venio-kpi-value">${staleIssues.length}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--${staleIssues.length ? 'danger' : 'ok'}">Open &middot; no update 30+ days</span>
      </div>
    </div>

    <div class="etaxgo-top-grid">
      <section class="panel">
        <div class="panel-title">
          <div>
            <h2>Issue Type Distribution</h2>
            <span>${escapeHtml(periodLabel(selMonth))}</span>
          </div>
        </div>
        ${typeTotal ? `
        <div class="venio-pie-layout">
          <div class="venio-pie" style="background:${typePieBg}" title="${typeTotal} issues"></div>
          <div class="venio-pie-legend">
            ${typeEntries.map(([label, value, color]) => `
              <div class="venio-pie-legend-row">
                <span class="venio-legend-dot" style="background:${color}"></span>
                <span class="venio-pie-label">${escapeHtml(label)}</span>
                <span>
                  <strong class="venio-pie-count">${value}</strong>
                  <span class="venio-pie-pct">${formatPercent(percent(value, typeTotal))}</span>
                </span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : `<div class="venio-empty-state">&#128202; No issue data for <strong>${escapeHtml(periodLabel(selMonth))}</strong>.<br><span>Switch to a month with imported data.</span></div>`}
      </section>

      <section class="panel chart-panel">
        <div class="panel-title">
          <div>
            <h2>Issue Category</h2>
            <span>${escapeHtml(periodLabel(selMonth))} &middot; ${monthItems.length} issues</span>
          </div>
          <div class="venio-sort-btns">
            <button class="venio-sort-btn ${catSort === 'desc' ? 'active' : ''}" type="button" data-etaxgo-category-sort="desc" title="Sort descending">&#8595; Desc</button>
            <button class="venio-sort-btn ${catSort === 'asc' ? 'active' : ''}" type="button" data-etaxgo-category-sort="asc" title="Sort ascending">&#8593; Asc</button>
          </div>
        </div>
        <div class="bar-list">
          ${sortedCats.length ? sortedCats.map(([label, value]) => `
            <div class="bar-row">
              <div class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (value / catMax) * 100)}%"></div></div>
              <strong>${value}</strong>
            </div>
          `).join('') : `<div class="venio-empty-state">&#128202; No issues in ${escapeHtml(periodLabel(selMonth))}.</div>`}
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">
          <div>
            <h2>Resolution Rate</h2>
            <span>${escapeHtml(periodLabel(selMonth))}</span>
          </div>
        </div>
        ${monthItems.length ? `
        <div class="venio-pie-layout">
          <div class="venio-pie" style="background:${resPieBg}" title="${resolvedCount} of ${monthItems.length} resolved (${resRate}%)"></div>
          <div class="venio-pie-legend">
            <div class="venio-pie-legend-row">
              <span class="venio-legend-dot" style="background:#10b981"></span>
              <span class="venio-pie-label">Resolved</span>
              <span>
                <strong class="venio-pie-count">${resolvedCount}</strong>
                <span class="venio-pie-pct">${formatPercent(percent(resolvedCount, monthItems.length))}</span>
              </span>
            </div>
            <div class="venio-pie-legend-row">
              <span class="venio-legend-dot" style="background:var(--line)"></span>
              <span class="venio-pie-label">Open</span>
              <span>
                <strong class="venio-pie-count">${unresolvedCount}</strong>
                <span class="venio-pie-pct">${formatPercent(percent(unresolvedCount, monthItems.length))}</span>
              </span>
            </div>
          </div>
        </div>
        ` : `<div class="venio-empty-state">&#128202; No issue data for ${escapeHtml(periodLabel(selMonth))}.</div>`}
      </section>
    </div>

    <div class="etaxgo-bottom-grid">
      <section class="panel watchlist-panel">
        <div class="panel-title">
          <h2>Aging Watchlist</h2>
          <span>Open PI older than 30 days</span>
        </div>
        <div class="watchlist-table-head">
          <span>Issue key</span>
          <span>Summary</span>
          <span>eTaxGo Category</span>
          <span>Pending Age (days)</span>
        </div>
        <div class="watchlist watchlist-scroll">
          ${agingList.map((issue) => `
            <button class="watch-row" data-open-issue="${issue.id}">
              <span class="watch-key">${escapeHtml(issue.issue_key)}</span>
              <span class="watch-summary" title="${escapeHtml(issue.summary || '-')}">${escapeHtml(issue.summary || '-')}</span>
              <span class="watch-meta">${escapeHtml(categoryForEtaxGoIssue(issue))}</span>
              <strong class="${pendingLevel(issue) || ''}">${issue.pending_age_days ? issue.pending_age_days.toFixed(1) + 'd' : '-'}</strong>
            </button>
          `).join('') || '<div class="subtle" style="padding:1rem">No open PI older than 30 days.</div>'}
        </div>
      </section>
    </div>
  `;
}

function etaxGoSettingsContent() {
  return `
    <section class="settings-grid">
      <div class="panel">
        <h2>eTaxGo Category Keyword Rules</h2>
        <div class="toolbar" style="margin:10px 0">
          <select data-etaxgo-new-rule="category">${ETAXGO_CATEGORIES.map((category) => `<option>${escapeHtml(category)}</option>`).join('')}</select>
          <input data-etaxgo-new-rule="keyword" placeholder="Keyword">
          <select data-etaxgo-new-rule="language"><option>EN</option><option>TH</option><option>Any</option></select>
          <input data-etaxgo-new-rule="weight" type="number" value="8" min="1" max="20">
          <button class="button" data-action="add-etaxgo-rule">Add Rule</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Active</th><th>Category</th><th>Keyword</th><th>Language</th><th>Weight</th><th>Save</th></tr></thead>
            <tbody>
              ${state.etaxgoRules.map((rule) => `
                <tr>
                  <td><input type="checkbox" data-etaxgo-rule="${rule.id}" data-etaxgo-rule-field="active" ${rule.active ? 'checked' : ''}></td>
                  <td><input value="${escapeHtml(rule.category)}" data-etaxgo-rule="${rule.id}" data-etaxgo-rule-field="category"></td>
                  <td><input value="${escapeHtml(rule.keyword)}" data-etaxgo-rule="${rule.id}" data-etaxgo-rule-field="keyword"></td>
                  <td><input value="${escapeHtml(rule.language)}" data-etaxgo-rule="${rule.id}" data-etaxgo-rule-field="language"></td>
                  <td><input type="number" value="${escapeHtml(rule.weight)}" data-etaxgo-rule="${rule.id}" data-etaxgo-rule-field="weight"></td>
                  <td><button class="button" data-save-etaxgo-rule="${rule.id}">Save</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderEtaxGoWorkspace() {
  const headers = {
    dashboard: ['eTaxGo Issue Dashboard', 'Monthly service issue signal for eTaxGo product focus.'],
    board: ['eTaxGo Issue Board', 'Operational board grouped by current status category.'],
    settings: ['eTaxGo Settings', 'Configure eTaxGo category keyword rules.']
  };
  const [title, hint] = headers[state.etaxgoView] ?? headers.dashboard;
  let content;
  if (state.etaxgoView === 'board') content = etaxGoBoardContent();
  else if (state.etaxgoView === 'settings') content = etaxGoSettingsContent();
  else content = executiveEtaxGoDashboardContent();
  return renderShell(`
    <div class="project-hero-banner">
      <div class="project-hero-text">
        <div class="project-hero-title">eTaxGo Issue</div>
        <div class="project-hero-date">${escapeHtml(periodLabel(currentEtaxGoMonth()))}</div>
      </div>
    </div>
    ${etaxGoViewTabs()}
    ${content}
  `);
}

function venioMonthPicker() {
  const allIssues = venioIssues(state.issues);
  const issueKeys = [...new Set(allIssues.map((i) => monthKey(i.report_date)).filter((k) => k !== 'Unknown'))].sort();
  const selected = currentVenioMonth();
  // Always use a select; if no issues imported, show current month as the only option
  const keys = issueKeys.length ? issueKeys : [selected];
  return `
    <label class="venio-month-label">
      <span>Month</span>
      <select class="venio-month-select" data-venio-issue-month>
        ${keys.map((k) => `<option value="${escapeHtml(k)}" ${selected === k ? 'selected' : ''}>${escapeHtml(periodLabel(k))}</option>`).join('')}
      </select>
    </label>
  `;
}

function venioLineChart(series, trendLabels) {
  const W = 560, H = 160;
  const padL = 36, padR = 16, padT = 16, padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const n = trendLabels.length;
  if (!n) return '<div class="venio-empty-state">&#128202; No trend data yet. Import more months to see trends.</div>';
  if (n === 1) {
    const val = series[0]?.values[0] ?? 0;
    return `<div class="venio-empty-state">&#128202; Only one month of data (${escapeHtml(trendLabels[0])}: ${val}). Import more months to see trends.</div>`;
  }

  const allVals = series.flatMap((s) => s.values);
  const maxVal = Math.max(1, ...allVals);

  const xPos = (i) => padL + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yPos = (v) => padT + chartH - (v / maxVal) * chartH;

  const gridStops = [0, 0.5, 1];
  const gridLines = gridStops.map((t) => {
    const y = padT + chartH - t * chartH;
    const val = Math.round(t * maxVal);
    return `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--line)" stroke-width="1" stroke-dasharray="${t === 0 ? 'none' : '4 3'}"/>
      <text x="${padL - 5}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${val}</text>
    `;
  }).join('');

  const seriesSvg = series.map((s) => {
    if (!s.values.length) return '';
    const pts = s.values.map((v, i) => `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');
    const dots = s.values.map((v, i) => `
      <circle cx="${xPos(i).toFixed(1)}" cy="${yPos(v).toFixed(1)}" r="4" fill="${s.color}" stroke="var(--panel)" stroke-width="2">
        <title>${escapeHtml(trendLabels[i])}: ${v}</title>
      </circle>
    `).join('');
    return `
      <polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
    `;
  }).join('');

  const xAxisLabels = trendLabels.map((label, i) => `
    <text x="${xPos(i).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="10" fill="var(--muted)">${escapeHtml(label)}</text>
  `).join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="display:block;overflow:visible">
      ${gridLines}
      ${seriesSvg}
      ${xAxisLabels}
    </svg>
  `;
}

function executiveDashboardContentLegacy() {
  const allVenio = venioIssues(state.issues);
  const allPi = productionIssues(allVenio);
  const selMonth = currentVenioMonth();
  const [selYear, selMon] = selMonth.split('-').map(Number);

  const prevMonth = selMon === 1
    ? `${selYear - 1}-12`
    : `${selYear}-${String(selMon - 1).padStart(2, '0')}`;

  const monthItems = allVenio.filter((i) => monthKey(i.report_date) === selMonth);
  const prevItems = allVenio.filter((i) => monthKey(i.report_date) === prevMonth);
  const monthPi = productionIssues(monthItems);
  const prevPi = productionIssues(prevItems);

  // KPIs
  const newCount = monthPi.length;
  const prevCount = prevPi.length;
  const newDiff = newCount - prevCount;
  const newPct = prevCount > 0 ? Math.round((newDiff / prevCount) * 100) : null;
  const newTrend = newDiff > 0 ? 'danger' : newDiff < 0 ? 'ok' : '';
  const newTrendText = newPct !== null ? `${newDiff >= 0 ? '+' : ''}${newPct}% vs last month` : 'No prior month';

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const stalePI = allPi.filter((i) => {
    if (isResolved(i)) return false;
    const updated = i.last_updated_date ? new Date(i.last_updated_date) : null;
    return !updated || updated < thirtyDaysAgo;
  });

  const crispEntry = state.crisp.months.find((entry) => entry.month === selMonth);
  const sumChat = crispEntry ? (crispEntry.total_conversations ?? 0) : null;

  // Trends: last 6 months
  const allMonthKeys = [...new Set(allVenio.map((i) => monthKey(i.report_date)).filter((k) => k !== 'Unknown'))].sort();
  const trendMonths = allMonthKeys.slice(-6);
  const trendLabels = trendMonths.map((k) => periodLabel(k).replace(/\s+\d{4}$/, ''));
  const piValues = trendMonths.map((k) => allPi.filter((i) => monthKey(i.report_date) === k).length);
  const chatValues = trendMonths.map((k) => {
    const cm = state.crisp.months.find((entry) => entry.month === k);
    return cm ? (cm.total_conversations ?? 0) : 0;
  });
  const hasCrispTrend = chatValues.some((v) => v > 0);
  const trendSeries = [
    { label: 'Production Issue', color: '#0275e0', values: piValues },
    ...(hasCrispTrend ? [{ label: 'Crisp Chat', color: '#f59e0b', values: chatValues }] : [])
  ];

  // Pie chart: Production Issue vs Beauty for selected month
  const piCount = monthPi.length;
  const beautyCount = monthItems.filter((i) => i.issue_type === 'Beauty').length;
  const pieEntries = [
    ['Production Issue', piCount, '#0275e0'],
    ['Beauty', beautyCount, '#fb7185']
  ].filter(([, v]) => v > 0);
  const pieTotal = pieEntries.reduce((s, [, v]) => s + v, 0);
  const pieBg = pieTotal
    ? (() => {
        let cursor = 0;
        const segs = pieEntries.map(([, v, c]) => {
          const start = cursor;
          const end = cursor + (v / pieTotal) * 100;
          cursor = end;
          return `${c} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
        });
        return `conic-gradient(${segs.join(', ')})`;
      })()
    : 'conic-gradient(var(--line) 0 100%)';

  // Issue Category bar — current month only, sortable
  const catSort = state.venioIssue.categorySort ?? 'desc';
  const monthCatCounts = countByVenioCategory(monthItems);
  const sortedCats = catSort === 'asc'
    ? [...monthCatCounts].sort((a, b) => a[1] - b[1])
    : monthCatCounts;
  const catMax = Math.max(1, ...sortedCats.map(([, v]) => v));

  // Monthly Category Trend: top 5 categories (all-time ranking) × last 6 months
  const catColors = ['#0275e0', '#f59e0b', '#6bb8ff', '#fb7185', '#8b5cf6'];
  const categorizedPi = allPi.filter((issue) => categoryForIssue(issue) !== 'Uncategorized');
  const top5cats = countByVenioCategory(categorizedPi).slice(0, 5).map(([cat]) => cat);
  const catTrendSeries = top5cats.map((category, index) => ({
    label: category,
    color: catColors[index % catColors.length],
    values: trendMonths.map((month) => categorizedPi.filter((issue) => monthKey(issue.report_date) === month && categoryForIssue(issue) === category).length)
  }));

  // Aging Watchlist: top 5 open issues by pending age
  const agingList = allPi
    .filter((issue) => !isResolved(issue) && number(issue.pending_age_hours) / 24 > 30)
    .sort((a, b) => number(b.pending_age_hours) - number(a.pending_age_hours))
    .map((issue) => ({
      ...issue,
      pending_age_days: number(issue.pending_age_hours) / 24
    }));

  return `
    <div class="venio-dashboard-toolbar">
      ${venioMonthPicker()}
    </div>

    <div class="venio-kpi-row">
      <div class="venio-kpi-card ${newTrend}">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">New Issues</span>
          <span class="venio-kpi-icon">&#128196;</span>
        </div>
        <strong class="venio-kpi-value">${newCount}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--${newTrend || 'muted'}">${escapeHtml(newTrendText)} · PI only</span>
      </div>
      <div class="venio-kpi-card ${stalePI.length ? 'danger' : 'ok'}">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Stale PI</span>
          <span class="venio-kpi-icon">&#9200;</span>
        </div>
        <strong class="venio-kpi-value">${stalePI.length}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--${stalePI.length ? 'danger' : 'ok'}">Open PI · no update 30+ days</span>
      </div>
      ${sumChat !== null ? `
      <div class="venio-kpi-card">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Crisp Chat</span>
          <span class="venio-kpi-icon">&#128172;</span>
        </div>
        <strong class="venio-kpi-value">${sumChat}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--muted">${escapeHtml(periodLabel(selMonth))} · conversations</span>
      </div>` : ''}
    </div>

    <div class="venio-top-grid">
      <section class="panel venio-trend-panel">
        <div class="venio-trend-header">
          <div class="venio-trend-header-left">
            <h2>Monthly Trends</h2>
            <p class="venio-trend-sub">Production Issues${hasCrispTrend ? ' &amp; Crisp conversations' : ''} over time</p>
          </div>
          <div class="venio-legend">
            <span><span class="venio-legend-dot" style="background:#0275e0"></span>Production Issue</span>
            ${hasCrispTrend ? '<span><span class="venio-legend-dot" style="background:#f59e0b"></span>Crisp Chat</span>' : ''}
          </div>
        </div>
        <div class="venio-linechart-wrap">
          ${venioLineChart(trendSeries, trendLabels)}
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">
          <div>
            <h2>Issue Type</h2>
            <span>${escapeHtml(periodLabel(selMonth))}</span>
          </div>
        </div>
        ${pieTotal ? `
        <div class="venio-pie-layout">
          <div class="venio-pie" style="background:${pieBg}" title="${pieTotal} issues"></div>
          <div class="venio-pie-legend">
            ${pieEntries.map(([label, value, color]) => `
              <div class="venio-pie-legend-row">
                <span class="venio-legend-dot" style="background:${color}"></span>
                <span class="venio-pie-label">${escapeHtml(label)}</span>
                <span>
                  <strong class="venio-pie-count">${value}</strong>
                  <span class="venio-pie-pct">${formatPercent(percent(value, pieTotal))}</span>
                </span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : `<div class="venio-empty-state">&#128202; No issue data for <strong>${escapeHtml(periodLabel(selMonth))}</strong>.<br><span>Switch to a month with imported data.</span></div>`}
      </section>
    </div>

    <div class="venio-mid-grid">
      <section class="panel chart-panel">
        <div class="panel-title">
          <div>
            <h2>Issue Category</h2>
            <span>${escapeHtml(periodLabel(selMonth))} · ${monthItems.length} issues</span>
          </div>
          <div class="venio-sort-btns">
            <button class="venio-sort-btn ${catSort === 'desc' ? 'active' : ''}" type="button" data-venio-category-sort="desc" title="Sort descending">&#8595; Desc</button>
            <button class="venio-sort-btn ${catSort === 'asc' ? 'active' : ''}" type="button" data-venio-category-sort="asc" title="Sort ascending">&#8593; Asc</button>
          </div>
        </div>
        <div class="bar-list">
          ${sortedCats.length ? sortedCats.map(([label, value]) => `
            <div class="bar-row">
              <div class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (value / catMax) * 100)}%"></div></div>
              <strong>${value}</strong>
            </div>
          `).join('') : `<div class="venio-empty-state">&#128202; No issues in ${escapeHtml(periodLabel(selMonth))}.</div>`}
        </div>
      </section>
    </div>

    <div class="venio-bottom-grid">
      <section class="panel">
        <div class="panel-title">
          <h2>Monthly Category Trend</h2>
          ${trendMonths.length ? `<span>Top 5 · last ${trendMonths.length} months</span>` : '<span>No data yet</span>'}
        </div>
        ${top5cats.length && trendMonths.length ? `
        <div class="venio-cat-trend">
          <table class="venio-cat-trend-table">
            <thead>
              <tr>
                <th>Category</th>
                ${trendMonths.map((k) => `<th>${escapeHtml(periodLabel(k).replace(/\s+\d{4}$/, ''))}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${top5cats.map((cat, idx) => `
                <tr>
                  <td><span class="venio-cat-dot" style="background:${catColors[idx]}"></span>${escapeHtml(cat)}</td>
                  ${trendMonths.map((k) => {
                    const cnt = allVenio.filter((i) => monthKey(i.report_date) === k && categoryForIssue(i) === cat).length;
                    return `<td>${cnt || '<span class="subtle">—</span>'}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : '<div class="subtle" style="padding:1.5rem 0">No trend data yet.</div>'}
      </section>

      <section class="panel watchlist-panel">
        <div class="panel-title">
          <h2>Aging Watchlist</h2>
          <span>Top 5 open issues by age</span>
        </div>
        <div class="watchlist">
          ${agingList.map((issue) => `
            <button class="watch-row" data-open-issue="${issue.id}">
              <span class="watch-key">${escapeHtml(issue.issue_key)}</span>
              <span class="watch-summary">${escapeHtml(issue.customer_code || '-')}</span>
              <span class="watch-meta">${escapeHtml(issue.summary || '-')}</span>
              <strong class="${pendingLevel(issue) || ''}">${issue.pending_age_hours ? Number(issue.pending_age_hours / 24).toFixed(1) + 'd' : '-'}</strong>
            </button>
          `).join('') || '<div class="subtle" style="padding:1rem">No open issues.</div>'}
        </div>
      </section>
    </div>
  `;
}

function executiveDashboardContent() {
  const allVenio = venioIssues(state.issues);
  const allPi = productionIssues(allVenio);
  const selMonth = currentVenioMonth();
  const [selYear, selMon] = selMonth.split('-').map(Number);

  const prevMonth = selMon === 1
    ? `${selYear - 1}-12`
    : `${selYear}-${String(selMon - 1).padStart(2, '0')}`;

  const monthItems = allVenio.filter((issue) => monthKey(issue.report_date) === selMonth);
  const prevItems = allVenio.filter((issue) => monthKey(issue.report_date) === prevMonth);
  const monthPi = productionIssues(monthItems);
  const prevPi = productionIssues(prevItems);

  const newCount = monthPi.length;
  const prevCount = prevPi.length;
  const newDiff = newCount - prevCount;
  const newPct = prevCount > 0 ? Math.round((newDiff / prevCount) * 100) : null;
  const newTrend = newDiff > 0 ? 'danger' : newDiff < 0 ? 'ok' : '';
  const newTrendText = newPct !== null ? `${newDiff >= 0 ? '+' : ''}${newPct}% vs last month` : 'No prior month';

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const stalePI = allPi.filter((issue) => {
    if (isResolved(issue)) return false;
    const updated = issue.last_updated_date ? new Date(issue.last_updated_date) : null;
    return !updated || updated < thirtyDaysAgo;
  });

  const crispEntry = state.crisp.months.find((entry) => entry.month === selMonth);
  const sumChat = crispEntry ? (crispEntry.total_conversations ?? 0) : null;

  const allMonthKeys = [...new Set(allVenio.map((issue) => monthKey(issue.report_date)).filter((key) => key !== 'Unknown'))].sort();
  const trendMonths = allMonthKeys.slice(-6);
  const trendLabels = trendMonths.map((key) => periodLabel(key).replace(/\s+\d{4}$/, ''));
  const piValues = trendMonths.map((key) => allPi.filter((issue) => monthKey(issue.report_date) === key).length);
  const chatValues = trendMonths.map((key) => {
    const month = state.crisp.months.find((entry) => entry.month === key);
    return month ? (month.total_conversations ?? 0) : 0;
  });
  const hasCrispTrend = chatValues.some((value) => value > 0);
  const trendSeries = [
    { label: 'Production Issue', color: '#0275e0', values: piValues },
    ...(hasCrispTrend ? [{ label: 'Crisp Chat', color: '#f59e0b', values: chatValues }] : [])
  ];

  const piCount = monthPi.length;
  const beautyCount = monthItems.filter((issue) => issue.issue_type === 'Beauty').length;
  const pieEntries = [
    ['Production Issue', piCount, '#0275e0'],
    ['Beauty', beautyCount, '#fb7185']
  ].filter(([, value]) => value > 0);
  const pieTotal = pieEntries.reduce((sum, [, value]) => sum + value, 0);
  const pieBg = pieTotal
    ? (() => {
        let cursor = 0;
        const segments = pieEntries.map(([, value, color]) => {
          const start = cursor;
          const end = cursor + (value / pieTotal) * 100;
          cursor = end;
          return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
        });
        return `conic-gradient(${segments.join(', ')})`;
      })()
    : 'conic-gradient(var(--line) 0 100%)';

  const catSort = state.venioIssue.categorySort ?? 'desc';
  const monthCatCounts = countByVenioCategory(monthItems);
  const sortedCats = catSort === 'asc'
    ? [...monthCatCounts].sort((a, b) => a[1] - b[1])
    : monthCatCounts;
  const catMax = Math.max(1, ...sortedCats.map(([, value]) => value));

  const catColors = ['#0275e0', '#f59e0b', '#6bb8ff', '#fb7185', '#8b5cf6'];
  const categorizedPi = allPi.filter((issue) => categoryForIssue(issue) !== 'Uncategorized');
  const top5cats = countByVenioCategory(categorizedPi).slice(0, 5).map(([category]) => category);
  const catTrendSeries = top5cats.map((category, index) => ({
    label: category,
    color: catColors[index % catColors.length],
    values: trendMonths.map((month) => categorizedPi.filter((issue) => monthKey(issue.report_date) === month && categoryForIssue(issue) === category).length)
  }));

  const agingList = allPi
    .filter((issue) => !isResolved(issue) && number(issue.pending_age_hours) / 24 > 30)
    .sort((a, b) => number(b.pending_age_hours) - number(a.pending_age_hours))
    .map((issue) => ({
      ...issue,
      pending_age_days: number(issue.pending_age_hours) / 24
    }));

  return `
    <div class="venio-dashboard-toolbar">
      ${venioMonthPicker()}
    </div>

    <div class="venio-kpi-row">
      <div class="venio-kpi-card ${newTrend}">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">New Issues</span>
          <span class="venio-kpi-icon">&#128196;</span>
        </div>
        <strong class="venio-kpi-value">${newCount}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--${newTrend || 'muted'}">${escapeHtml(newTrendText)} &middot; PI only</span>
      </div>
      <div class="venio-kpi-card ${stalePI.length ? 'danger' : 'ok'}">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Stale PI</span>
          <span class="venio-kpi-icon">&#9200;</span>
        </div>
        <strong class="venio-kpi-value">${stalePI.length}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--${stalePI.length ? 'danger' : 'ok'}">Open PI &middot; no update 30+ days</span>
      </div>
      ${sumChat !== null ? `
      <div class="venio-kpi-card">
        <div class="venio-kpi-header">
          <span class="venio-kpi-label">Crisp Chat</span>
          <span class="venio-kpi-icon">&#128172;</span>
        </div>
        <strong class="venio-kpi-value">${sumChat}</strong>
        <span class="venio-kpi-sub venio-kpi-sub--muted">${escapeHtml(periodLabel(selMonth))} &middot; conversations</span>
      </div>` : ''}
    </div>

    <div class="venio-top-grid">
      <section class="panel venio-trend-panel">
        <div class="venio-trend-header">
          <div class="venio-trend-header-left">
            <h2>Monthly Trends</h2>
            <p class="venio-trend-sub">Production Issues${hasCrispTrend ? ' &amp; Crisp conversations' : ''} over time</p>
          </div>
          <div class="venio-legend">
            <span><span class="venio-legend-dot" style="background:#0275e0"></span>Production Issue</span>
            ${hasCrispTrend ? '<span><span class="venio-legend-dot" style="background:#f59e0b"></span>Crisp Chat</span>' : ''}
          </div>
        </div>
        <div class="venio-linechart-wrap">
          ${venioLineChart(trendSeries, trendLabels)}
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">
          <div>
            <h2>Issue Type</h2>
            <span>${escapeHtml(periodLabel(selMonth))}</span>
          </div>
        </div>
        ${pieTotal ? `
        <div class="venio-pie-layout">
          <div class="venio-pie" style="background:${pieBg}" title="${pieTotal} issues"></div>
          <div class="venio-pie-legend">
            ${pieEntries.map(([label, value, color]) => `
              <div class="venio-pie-legend-row">
                <span class="venio-legend-dot" style="background:${color}"></span>
                <span class="venio-pie-label">${escapeHtml(label)}</span>
                <span>
                  <strong class="venio-pie-count">${value}</strong>
                  <span class="venio-pie-pct">${formatPercent(percent(value, pieTotal))}</span>
                </span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : `<div class="venio-empty-state">&#128202; No issue data for <strong>${escapeHtml(periodLabel(selMonth))}</strong>.<br><span>Switch to a month with imported data.</span></div>`}
      </section>
    </div>

    <div class="venio-mid-grid">
      <section class="panel chart-panel">
        <div class="panel-title">
          <div>
            <h2>Issue Category</h2>
            <span>${escapeHtml(periodLabel(selMonth))} &middot; ${monthItems.length} issues</span>
          </div>
          <div class="venio-sort-btns">
            <button class="venio-sort-btn ${catSort === 'desc' ? 'active' : ''}" type="button" data-venio-category-sort="desc" title="Sort descending">&#8595; Desc</button>
            <button class="venio-sort-btn ${catSort === 'asc' ? 'active' : ''}" type="button" data-venio-category-sort="asc" title="Sort ascending">&#8593; Asc</button>
          </div>
        </div>
        <div class="bar-list">
          ${sortedCats.length ? sortedCats.map(([label, value]) => `
            <div class="bar-row">
              <div class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (value / catMax) * 100)}%"></div></div>
              <strong>${value}</strong>
            </div>
          `).join('') : `<div class="venio-empty-state">&#128202; No issues in ${escapeHtml(periodLabel(selMonth))}.</div>`}
        </div>
      </section>
    </div>

    <div class="venio-bottom-grid">
      <section class="panel">
        <div class="panel-title">
          <h2>Monthly Category Trend</h2>
          ${trendMonths.length ? `<span>Top 5 PI categories &middot; last ${trendMonths.length} months</span>` : '<span>No data yet</span>'}
        </div>
        ${catTrendSeries.length && trendMonths.length ? `
        <div class="venio-cat-trend">
          <div class="venio-legend venio-legend-wrap">
            ${catTrendSeries.map((series) => `
              <span><span class="venio-legend-dot" style="background:${series.color}"></span>${escapeHtml(series.label)}</span>
            `).join('')}
          </div>
          <div class="venio-linechart-wrap">
            ${venioLineChart(catTrendSeries, trendLabels)}
          </div>
        </div>
        ` : '<div class="subtle" style="padding:1.5rem 0">No trend data yet.</div>'}
      </section>

      <section class="panel watchlist-panel">
        <div class="panel-title">
          <h2>Aging Watchlist</h2>
          <span>Open PI older than 30 days</span>
        </div>
        <div class="watchlist-table-head">
          <span>Issue key</span>
          <span>Summary</span>
          <span>Venio Category</span>
          <span>Pending Age (days)</span>
        </div>
        <div class="watchlist watchlist-scroll">
          ${agingList.map((issue) => `
            <button class="watch-row" data-open-issue="${issue.id}">
              <span class="watch-key">${escapeHtml(issue.issue_key)}</span>
              <span class="watch-summary" title="${escapeHtml(issue.summary || '-')}">${escapeHtml(issue.summary || '-')}</span>
              <span class="watch-meta">${escapeHtml(categoryForIssue(issue))}</span>
              <strong class="${pendingLevel(issue) || ''}">${issue.pending_age_days ? issue.pending_age_days.toFixed(1) + 'd' : '-'}</strong>
            </button>
          `).join('') || '<div class="subtle" style="padding:1rem">No open PI older than 30 days.</div>'}
        </div>
      </section>
    </div>
  `;
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

function boardContent() {
  const items = filteredIssues();
  const columns = boardColumns();
  const groups = new Map(columns.map((column) => [column, []]));
  for (const issue of items) {
    const key = boardColumnForIssue(issue);
    groups.get(key).push(issue);
  }
  return `
    <section class="board">
      ${columns.map((column) => `
        <div class="column">
          <div class="column-head"><h2>${column}</h2><span class="pill">${groups.get(column).length}</span></div>
          ${groups.get(column).map(issueCard).join('') || '<div class="subtle">No issues</div>'}
        </div>
      `).join('')}
    </section>
  `;
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
            <button class="button primary" data-action="open-upload-modal" data-type="venio">${icon('upload')} Import CSV Files</button>
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
    ${pageHeader('Raw Jira Import', 'Import Jira issue exports directly from Venio and calculate dashboard fields automatically.')}
    <section class="grid-2">
      <div class="panel">
        <div class="upload-box">
          <div>
            <h2>Select Raw Jira CSV</h2>
            <p class="subtle">Use this page for files like Jira_Venio_April.csv and Jira_Venio_May.csv.</p>
            <button class="button primary" data-action="open-upload-modal" data-type="jira">${icon('upload')} Import Jira CSV Files</button>
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
        <thead><tr><th>Imported</th><th>Filename</th><th>Total</th><th>Valid</th><th>Skipped</th><th>Duplicates</th><th>Report Range</th><th></th></tr></thead>
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
              <td><button class="icon-button delete-batch-btn" data-action="delete-issue-batch" data-batch-id="${batch.id}" title="Delete this import">${icon('close')}</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function settingsContent() {
  return `
    <section class="settings-grid">
      <div class="panel">
        <h2>Threshold Rules</h2>
        <div class="stack" style="margin-top:12px">
          ${settingInput('pending_warning_hours', 'Pending Warning Hours')}
          ${settingInput('pending_critical_hours', 'Pending Critical Hours')}
          ${settingInput('solve_warning_hours', 'Time to Solve Warning Hours')}
          ${settingInput('solve_critical_hours', 'Time to Solve Critical Hours')}
          ${settingInput('over_days_threshold', 'Over Days Project Threshold (days)')}
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
      <div class="panel" style="grid-column:1/-1">
        <h2>Data Management</h2>
        <p class="subtle" style="margin:8px 0 12px">Remove all imported issues and import history from this workspace. This cannot be undone.</p>
        <button class="button danger" data-action="clear-all-issues">Clear All Issue Data</button>
      </div>
    </section>
  `;
}

function renderSettings() {
  return renderVenioWorkspace();
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

function projectReviewValue(project, index, field, type = 'text') {
  const value = project[field] ?? '';
  const missing = project.missing_fields?.length ? project.missing_fields : projectMissingFields(project);
  if (missing.includes(field)) {
    if (field === 'package_type') return projectDraftPackage(project, index);
    if (field === 'stage') return projectDraftStage(project, index);
    return projectDraftInput(project, index, field, type);
  }
  return `<span class="project-review-value" title="${escapeHtml(value || '-')}">${escapeHtml(value || '-')}</span>`;
}

function projectReviewStatus(missing) {
  if (!missing.length) return '<span class="project-ready-chip">Ready</span>';
  return `
    <div class="project-review-tags">
      ${missing.map((field) => `<span class="project-review-chip">${escapeHtml(projectFieldLabel(field))}</span>`).join('')}
    </div>
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
                      ${projectReviewValue(project, index, 'customer_name')}
                      ${projectReviewValue(project, index, 'project_name')}
                    </td>
                    <td>${projectReviewValue(project, index, 'package_type')}</td>
                    <td>${projectReviewValue(project, index, 'user_count', 'number')}</td>
                    <td>${projectReviewValue(project, index, 'stage')}</td>
                    <td>${projectReviewValue(project, index, 'kickoff_date', 'date')}</td>
                    <td>${projectReviewValue(project, index, 'onboarding_date', 'date')}</td>
                    <td>${projectReviewValue(project, index, 'training_date', 'date')}</td>
                    <td>${projectReviewValue(project, index, 'golive_date', 'date')}</td>
                    <td>${projectReviewStatus(missing)}</td>
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
            <h2>Processes</h2>
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

const VALID_VIEWS = new Set(['home', 'project-dashboard', 'crisp-performance', 'dashboard', 'meeting', 'manual']);

function getViewFromHash() {
  const hash = window.location.hash.slice(1);
  return VALID_VIEWS.has(hash) ? hash : 'home';
}

function pushViewHash(view) {
  const target = `#${view}`;
  if (window.location.hash !== target) {
    history.pushState(null, '', target);
  }
}

function renderPreservingScroll() {
  const main = document.querySelector('.main');
  const savedTop = main ? main.scrollTop : 0;
  render();
  if (savedTop > 0) {
    requestAnimationFrame(() => {
      const newMain = document.querySelector('.main');
      if (newMain) newMain.scrollTop = savedTop;
    });
  }
}

function render() {
  _filteredCache = null;
  const titles = {
    home: 'Customer Service Team Hub',
    'project-dashboard': 'Project Dashboard | Customer Service Team Hub',
    'crisp-performance': 'Crisp Chat Performance | Customer Service Team Hub',
    dashboard: 'Venio Issue | Customer Service Team Hub',
    'etaxgo-issue': 'eTaxGo Issue | Customer Service Team Hub',
    'meeting': 'Venio Meeting | Customer Service Team Hub',
    'manual': 'Venio Manual | Customer Service Team Hub'
  };
  document.title = titles[state.view] ?? 'Customer Service Team Hub';
  const favicon = document.querySelector('#favicon');
  if (favicon) favicon.href = brandAssets.venio;
  pushViewHash(state.view);
  const views = {
    home: renderLanding,
    'project-dashboard': renderProjectDashboard,
    'crisp-performance': renderCrispPerformance,
    dashboard: renderVenioWorkspace,
    'etaxgo-issue': renderEtaxGoWorkspace,
    'meeting': renderMeeting,
    'manual': renderManual
  };

  const focusedFilter = document.activeElement?.dataset?.filter;
  const focusCursor = document.activeElement?.selectionStart;

  state.lastShellHtml = (views[state.view] ?? renderLanding)();
  app.innerHTML = state.lastShellHtml;

  if (focusedFilter) {
    const el = app.querySelector(`[data-filter="${focusedFilter}"]`);
    if (el) {
      el.focus();
      if (focusCursor != null && typeof el.setSelectionRange === 'function') {
        try { el.setSelectionRange(focusCursor, focusCursor); } catch (_) {}
      }
    }
  }
}

function renderOverlayOnly() {
  const modalHtml = `${modal()}${projectEditModal()}${projectImportModal()}${projectAddImportModal()}${genericUploadModal()}`;
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

let demoSeedPromise = null;

async function loadDemoSeed() {
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

function currentStorageKey() {
  return STORAGE_KEY;
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
    etaxgoRules: seed.etaxgoRules ?? [],
    nextIssueId: maxId(issues) + 1,
    nextBatchId: maxId(batches) + 1,
    nextNoteId: 1,
    nextRuleId: maxId(rules) + 1,
    nextProjectId: maxId(projectTrackingProjects) + 1,
    nextProjectBatchId: maxId(projectTrackingBatches) + 1,
    nextCrispBatchId: maxId(seed.crispBatches ?? []) + 1
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

function readStoredClientStore() {
  try {
    return JSON.parse(localStorage.getItem(currentStorageKey()) || 'null');
  } catch {
    return null;
  }
}

function hasWorkspaceContent(store) {
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

function saveClientStore(store) {
  localStorage.setItem(currentStorageKey(), JSON.stringify(store));
}

function normalizeCrispMonthEntry(entry) {
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
  const metrics = crispMetrics(operators);
  return {
    month: entry.month,
    filename: entry.filename ?? '',
    imported_at: entry.imported_at ?? new Date().toISOString(),
    total_rows: Number(entry.total_rows ?? operators.length),
    valid_rows: Number(entry.valid_rows ?? operators.length),
    skipped_rows: Number(entry.skipped_rows ?? 0),
    operators,
    total_conversations: metrics.totalConversations,
    avg_rating: metrics.avgRating,
    avg_response_seconds: metrics.avgResponseSeconds,
    avg_resolution_seconds: metrics.avgResolutionSeconds
  };
}

function migrateCrispMonths(store) {
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

function clientBootstrap(store = loadClientStore()) {
  store.issues = (store.issues ?? []).map((issue) => (isVenioIssue(issue) || isEtaxGoIssue(issue))
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
    rules: store.rules ?? [],
    etaxgoRules: store.etaxgoRules ?? []
  };
}

function detectClientCategory(issue, rules, etaxgoRules = []) {
  if (isEtaxGoIssue(issue)) {
    return detectEtaxGoCategoryClient(issue, etaxgoRules);
  }
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
  const text = String(value ?? '').replace(/,/g, '').trim();
  if (text === '') return null;
  const parsed = Number(text);
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

function rowValue(row, ...headers) {
  for (const header of headers) {
    const value = emptyToNull(row[header]);
    if (value !== null) return value;
  }
  return null;
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

function statusToCategory(status) {
  const value = String(status ?? '').trim().toLowerCase();
  if (/^done$|^resolved$|^closed$|^complete/.test(value)) return 'Done';
  if (/progress|review|testing/.test(value)) return 'In Progress';
  return 'To Do';
}

function isSupportedJiraRow(row) {
  const issueType = normalizeIssueType(rowValue(row, 'Issue Type'));
  const projectName = String(rowValue(row, 'Project name') ?? '').trim().toLowerCase();
  const issueKey = String(rowValue(row, 'Issue key') ?? '').trim().toUpperCase();
  const isVenio = projectName === 'venio' || issueKey.startsWith('VENIO-');
  const isEtaxGo = projectName === 'etaxgo' || issueKey.startsWith('ETAXGO-');
  const isVenioValidType = isVenio && (issueType === 'Production Issue' || issueType === 'Beauty');
  const isEtaxGoValidType = isEtaxGo && (issueType === 'Production Issue' || issueType === 'Request' || issueType === 'Beauty');
  return isVenioValidType || isEtaxGoValidType;
}

function normalizedIssueFromRow(row, importedAt = new Date().toISOString()) {
  return jiraIssueFromRow(row, importedAt);
}

function jiraIssueFromRow(row, importedAt = new Date().toISOString()) {
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

function importClientCsv(filename, content, format = 'normalized') {
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
    const error = new Error(`This file does not match the Jira CSV format required by this workspace. Missing columns: ${missingColumns.join(', ')}`);
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
    const detected = detectClientCategory(incoming, store.rules, store.etaxgoRules ?? []);
    const manual = (isVenioIssue(incoming) || isEtaxGoIssue(incoming)) ? existing?.venio_category_manual ?? null : null;
    const nextIssue = {
      ...(existing ?? { id: store.nextIssueId++, notes: [], created_at: now }),
      ...incoming,
      venio_category_auto: detected.category,
      venio_category_manual: manual,
      venio_category_final: (isVenioIssue(incoming) || isEtaxGoIssue(incoming)) ? manual || detected.category : null,
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

function crispSeconds(rawValue, displayValue) {
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

function crispInteger(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function crispHeaderKey(value) {
  return norm(value).replace(/^\uFEFF/, '').toLowerCase().replace(/\s+/g, '');
}

function crispRowValue(row, field) {
  const aliases = crispColumnAliases[field] ?? [field];
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, alias)) return row[alias];
  }
  const entries = Object.entries(row);
  const aliasKeys = aliases.map(crispHeaderKey);
  return entries.find(([header]) => aliasKeys.includes(crispHeaderKey(header)))?.[1];
}

function hasCrispColumn(headers, field) {
  const headerKeys = headers.map(crispHeaderKey);
  return (crispColumnAliases[field] ?? [field]).some((alias) => headerKeys.includes(crispHeaderKey(alias)));
}

function crispOperatorFromRow(row) {
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

function importClientCrispCsv(filename, content, month = currentMonthKey()) {
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
  const metrics = crispMetrics(operators);
  const batch = {
    id: store.nextCrispBatchId++,
    month: importMonth,
    filename,
    imported_at: now,
    total_rows: records.length,
    valid_rows: operators.length,
    skipped_rows: skippedRows,
    total_conversations: metrics.totalConversations,
    avg_rating: metrics.avgRating,
    avg_response_seconds: metrics.avgResponseSeconds,
    avg_resolution_seconds: metrics.avgResolutionSeconds
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

async function clientApi(path, options = {}) {
  const method = options.method ?? 'GET';
  const body = options.body ? JSON.parse(options.body) : {};

  const store = loadClientStore(await loadDemoSeed());

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
        customer_name: body?.customer_name || null,
        project_name: body?.customer_name || null,
        package_type: body?.package_type || 'Pro',
        user_count: Number(body?.user_count) || 0,
        source_status: 'Manual',
        stage: 'Kick-off',
        kickoff_date: body?.kickoff_date || isoDate(new Date()),
        onboarding_date: body?.onboarding_date || null,
        training_date: body?.training_date || null,
        golive_date: body?.golive_date || null,
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

  const issueBatchDeleteMatch = path.match(/^\/api\/batches\/(\d+)$/);
  if (method === 'DELETE' && issueBatchDeleteMatch) {
    const batchId = Number(issueBatchDeleteMatch[1]);
    store.issues = (store.issues ?? []).filter((i) => i.import_batch_id !== batchId);
    store.batches = (store.batches ?? []).filter((b) => b.id !== batchId);
    saveClientStore(store);
    return clientBootstrap(store);
  }

  const crispBatchDeleteMatch = path.match(/^\/api\/crisp\/batches\/(\d+)$/);
  if (method === 'DELETE' && crispBatchDeleteMatch) {
    const batchId = Number(crispBatchDeleteMatch[1]);
    const deletedBatch = (store.crispBatches ?? []).find((b) => b.id === batchId);
    store.crispBatches = (store.crispBatches ?? []).filter((b) => b.id !== batchId);
    if (deletedBatch?.month) {
      store.crispMonths = (store.crispMonths ?? []).filter((m) => m.month !== deletedBatch.month);
    }
    saveClientStore(store);
    return clientBootstrap(store);
  }

  const projectBatchDeleteMatch = path.match(/^\/api\/project-tracking\/batches\/(\d+)$/);
  if (method === 'DELETE' && projectBatchDeleteMatch) {
    const batchId = Number(projectBatchDeleteMatch[1]);
    store.projectTrackingProjects = (store.projectTrackingProjects ?? []).filter(
      (p) => p.import_batch_id !== batchId || p.source_status === 'Manual'
    );
    store.projectTrackingBatches = (store.projectTrackingBatches ?? []).filter((b) => b.id !== batchId);
    saveClientStore(store);
    return clientBootstrap(store);
  }

  throw new Error('No local demo handler for this request');
}

async function api(path, options = {}) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    };
    const response = await fetch(path, { ...options, headers });
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) throw new Error('API unavailable');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'API unavailable');
    return payload;
  } catch {
    return clientApi(path, options);
  }
}

function migrateLocalStorage() {
  if (localStorage.getItem(STORAGE_KEY)) return;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${STORAGE_KEY}:user:`)) {
      const data = localStorage.getItem(key);
      if (data) { localStorage.setItem(STORAGE_KEY, data); return; }
    }
  }
}

function hasPayloadContent(payload) {
  return Boolean(payload && (
    (payload.issues ?? []).length ||
    (payload.batches ?? []).length ||
    (payload.projectTrackingProjects ?? []).length ||
    (payload.projectTrackingBatches ?? []).length
  ));
}

function hasIssueContent(payload) {
  return Boolean(payload && (
    (payload.issues ?? []).length ||
    (payload.batches ?? []).length
  ));
}

function hasProjectContent(payload) {
  return Boolean(payload && (
    (payload.projectTrackingProjects ?? []).length ||
    (payload.projectTrackingBatches ?? []).length
  ));
}

function hasCrispContent(payload) {
  return Boolean(payload && (
    (payload.crispOperators ?? []).length ||
    (payload.crispBatches ?? []).length ||
    (payload.crispMonths ?? []).length
  ));
}

function mergedBootstrapStore(payload = {}, fallbackStore = null, options = {}) {
  const localStore = fallbackStore ?? readStoredClientStore() ?? {};
  const issueSource = options.keepLocalIssuesWhenServerEmpty && !hasIssueContent(payload) && hasIssueContent(localStore)
    ? localStore
    : payload;
  const projectSource = options.keepLocalProjectsWhenServerEmpty && !hasProjectContent(payload) && hasProjectContent(localStore)
    ? localStore
    : payload;
  const crispSource = hasCrispContent(payload) ? payload : localStore;

  return createDefaultStore({
    issues: issueSource.issues ?? [],
    batches: issueSource.batches ?? [],
    projectTrackingProjects: projectSource.projectTrackingProjects ?? [],
    projectTrackingBatches: projectSource.projectTrackingBatches ?? [],
    crispOperators: crispSource.crispOperators ?? [],
    crispBatches: crispSource.crispBatches ?? [],
    crispMonths: crispSource.crispMonths ?? [],
    settings: {
      ...(localStore.settings ?? {}),
      ...(payload.settings ?? {})
    },
    rules: Array.isArray(payload.rules) && payload.rules.length
      ? payload.rules
      : localStore.rules,
    etaxgoRules: Array.isArray(payload.etaxgoRules) && payload.etaxgoRules.length
      ? payload.etaxgoRules
      : (localStore.etaxgoRules ?? [])
  });
}

async function initialBootstrap() {
  migrateLocalStorage();
  const localStore = readStoredClientStore();

  // Try server — only trust it if it actually has data
  try {
    const serverPayload = await fetch('/api/bootstrap', {
      headers: { 'Content-Type': 'application/json' }
    }).then((r) => r.json());
    if (hasPayloadContent(serverPayload)) {
      return clientBootstrap(mergedBootstrapStore(serverPayload, localStore, {
        keepLocalIssuesWhenServerEmpty: true,
        keepLocalProjectsWhenServerEmpty: true
      }));
    }
  } catch { /* server unavailable */ }

  // Server empty or unreachable — fall back to localStorage
  if (hasWorkspaceContent(localStore)) return clientBootstrap(localStore);

  // Nothing anywhere — load demo seed
  return clientBootstrap(createDefaultStore(await loadDemoSeed()));
}

function applyBootstrap(payload) {
  const normalized = clientBootstrap(mergedBootstrapStore(payload));
  state.issues = normalized.issues ?? [];
  state.batches = normalized.batches ?? [];
  state.projectTrackingProjects = normalized.projectTrackingProjects ?? [];
  state.projectTrackingBatches = normalized.projectTrackingBatches ?? [];
  state.crisp.operators = normalized.crispOperators ?? [];
  state.crisp.batches = normalized.crispBatches ?? [];
  state.crisp.months = normalized.crispMonths ?? [];
  if (!state.crisp.selectedMonth && state.crisp.months.length) {
    state.crisp.selectedMonth = state.crisp.months[0].month;
  }
  state.settings = normalized.settings ?? {};
  state.rules = normalized.rules ?? [];
  state.etaxgoRules = normalized.etaxgoRules ?? [];
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
    if (action === 'reset-project-filters') {
      state.projectTracking.filters = { ...defaultProjectTrackingFilters };
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
    if (action === 'upload-etaxgo-csv') {
      uploadCsv('etaxgo');
      return;
    }
    if (action === 'upload-jira-csv') {
      uploadCsv('jira');
      return;
    }
    if (action === 'upload-etaxgo-jira-csv') {
      uploadCsv('etaxgo-jira');
      return;
    }
    if (action === 'upload-project-xlsx') {
      uploadProjectWorkbook();
      return;
    }
    if (action === 'upload-crisp-csv') {
      uploadCrispCsv();
      return;
    }
    if (action === 'save-crisp-ai') {
      const monthKey = actionElement.dataset.month;
      if (monthKey) { readAndSaveCrispAiForm(monthKey); saveCrispAiData(); render(); toast('AI performance data saved.'); }
      return;
    }
    if (action === 'open-crisp-ai-manual') {
      const monthKey = actionElement.dataset.month;
      state.crisp.activeView = 'import';
      if (monthKey) state.crisp.selectedMonth = monthKey;
      renderPreservingScroll();
      return;
    }
    if (action === 'add-crisp-topic') {
      const monthKey = actionElement.dataset.month;
      if (monthKey) {
        readAndSaveCrispAiForm(monthKey);
        const entry = crispAiForMonth(monthKey);
        state.crisp.aiData[monthKey] = { ...entry, topics: [...(entry.topics ?? []), { name: '', count: 0 }] };
        saveCrispAiData(); render();
      }
      return;
    }
    if (action === 'remove-crisp-topic') {
      const monthKey = actionElement.dataset.month;
      const idx = Number(actionElement.dataset.index);
      if (monthKey) {
        readAndSaveCrispAiForm(monthKey);
        const entry = crispAiForMonth(monthKey);
        const topics = (entry.topics ?? []).filter((_, i) => i !== idx);
        state.crisp.aiData[monthKey] = { ...entry, topics };
        saveCrispAiData(); render();
      }
      return;
    }
    if (action === 'open-project-import-modal') {
      state.projectTracking.importModal = true;
      render();
      return;
    }
    if (action === 'close-project-import-modal') {
      state.projectTracking.importModal = false;
      render();
      return;
    }
    if (action === 'submit-add-project') {
      addProject();
      return;
    }
    if (action === 'open-upload-modal') {
      state.uploadModal = actionElement.dataset.type || '';
      render();
      return;
    }
    if (action === 'close-upload-modal') {
      state.uploadModal = '';
      state.uploadLoading = false;
      state.uploadResult = null;
      state.uploadSelectedFiles = [];
      render();
      return;
    }
    if (action === 'delete-batch' || action === 'delete-issue-batch') {
      const batchId = Number(actionElement.dataset.batchId);
      const batch = state.batches.find((entry) => entry.id === batchId);
      const label = batch?.filename ? `"${batch.filename}"` : 'this import batch';
      if (!batchId || !window.confirm(`Delete ${label}? All issues from this import will be removed.`)) return;
      try {
        applyBootstrap(await api(`/api/batches/${batchId}`, { method: 'DELETE' }));
        toast(batch?.filename ? `Deleted ${batch.filename}.` : 'Import deleted.');
        render();
      } catch (e) { toast(`Delete failed: ${e.message}`); }
      return;
    }
    if (action === 'delete-crisp-batch') {
      const batchId = Number(actionElement.dataset.batchId);
      if (!batchId || !window.confirm('Delete this Crisp import? All operator data for this month will be removed.')) return;
      try {
        applyBootstrap(await api(`/api/crisp/batches/${batchId}`, { method: 'DELETE' }));
        toast('Crisp import deleted.');
        render();
      } catch (e) { toast(`Delete failed: ${e.message}`); }
      return;
    }
    if (action === 'delete-project-batch') {
      const batchId = Number(actionElement.dataset.batchId);
      if (!batchId || !window.confirm('Delete this project import? Projects exclusively from this batch will be removed.')) return;
      try {
        applyBootstrap(await api(`/api/project-tracking/batches/${batchId}`, { method: 'DELETE' }));
        toast('Project import deleted.');
        render();
      } catch (e) { toast(`Delete failed: ${e.message}`); }
      return;
    }
    if (action === 'add-project') {
      addProject();
      return;
    }
    if (action === 'clear-all-issues') {
      if (!window.confirm('This will permanently delete all imported issues, batches, and notes. This cannot be undone. Continue?')) return;
      try {
        applyBootstrap(await api('/api/clear-all-issues', { method: 'DELETE' }));
        toast('All issue data cleared.');
        render();
      } catch (e) { toast(`Clear failed: ${e.message}`); }
      return;
    }
    if (action === 'save-settings') {
      saveSettings();
      return;
    }
    if (action === 'edit-over45-insight') {
      state.over45EditingId = Number(actionElement.dataset.id);
      render();
      app.querySelector(`[data-over45-edit="${state.over45EditingId}"]`)?.focus();
      return;
    }
    if (action === 'cancel-over45-insight') {
      state.over45EditingId = null;
      render();
      return;
    }
    if (action === 'save-over45-insight') {
      const id = Number(actionElement.dataset.id);
      const textarea = app.querySelector(`[data-over45-edit="${id}"]`);
      const value = textarea?.value ?? '';
      const project = state.projectTrackingProjects.find((p) => p.id === id);
      if (project) {
        project.notes = value;
        state.over45EditingId = null;
        render();
        try {
          applyBootstrap(await api(`/api/project-tracking/projects/${id}`, {
            method: 'POST',
            body: JSON.stringify({ field: 'notes', value })
          }));
          toast('Insight saved.');
          render();
        } catch (e) { toast(`Save failed: ${e.message}`); render(); }
      }
      return;
    }
    if (action === 'add-rule') {
      saveRule();
      return;
    }
    if (action === 'add-etaxgo-rule') {
      saveEtaxgoRule();
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
    if (action === 'open-meeting-summary-modal') {
      state.meeting.summaryModalOpen = true;
      render();
      return;
    }
    if (action === 'close-meeting-summary-modal') {
      state.meeting.summaryModalOpen = false;
      render();
      return;
    }
    if (action === 'save-meeting-summary') {
      const monthKey = actionElement.dataset.month;
      if (monthKey) {
        readAndSaveMeetingSummary(monthKey);
        saveMeetingData();
        state.meeting.summaryModalOpen = false;
        render();
        toast('Meeting summary saved.');
      }
      return;
    }
    if (action === 'add-meeting-moment') {
      state.meeting.addMomentOpen = true;
      state.meeting.editingMomentId = null;
      _meetingEditPhotos = [null, null];
      render();
      return;
    }
    if (action === 'edit-meeting-moment') {
      const id = Number(actionElement.dataset.momentId);
      const moment = (state.meeting.moments ?? []).find((m) => m.id === id);
      if (!moment) return;
      state.meeting.editingMomentId = id;
      state.meeting.addMomentOpen = false;
      _meetingEditPhotos = [moment.photos?.[0] ?? null, moment.photos?.[1] ?? null];
      render();
      return;
    }
    if (action === 'close-meeting-modal') {
      state.meeting.addMomentOpen = false;
      state.meeting.editingMomentId = null;
      _meetingEditPhotos = [null, null];
      render();
      return;
    }
    if (action === 'save-meeting-moment') {
      const monthKey = actionElement.dataset.month || currentMeetingMonth();
      const fields = {
        companyName: app.querySelector('[data-meeting-modal-field="companyName"]')?.value ?? '',
        activityType: app.querySelector('[data-meeting-modal-field="activityType"]')?.value ?? '',
        activityName: app.querySelector('[data-meeting-modal-field="activityName"]')?.value ?? '',
        date: app.querySelector('[data-meeting-modal-field="date"]')?.value ?? '',
      };
      const photos = _meetingEditPhotos.filter(Boolean);
      const isEdit = state.meeting.editingMomentId !== null;
      if (isEdit) {
        state.meeting.moments = (state.meeting.moments ?? []).map((m) =>
          m.id === state.meeting.editingMomentId ? { ...m, ...fields, photos, month: monthKey } : m
        );
      } else {
        const newId = Math.max(0, ...(state.meeting.moments ?? []).map((m) => m.id ?? 0)) + 1;
        state.meeting.moments = [...(state.meeting.moments ?? []), { id: newId, month: monthKey, ...fields, photos }];
      }
      state.meeting.addMomentOpen = false;
      state.meeting.editingMomentId = null;
      _meetingEditPhotos = [null, null];
      saveMeetingData();
      render();
      toast(isEdit ? 'Moment updated.' : 'Moment added.');
      return;
    }
    if (action === 'delete-meeting-moment') {
      const id = Number(actionElement.dataset.momentId);
      if (!window.confirm('Delete this moment?')) return;
      state.meeting.moments = (state.meeting.moments ?? []).filter((m) => m.id !== id);
      state.meeting.editingMomentId = null;
      state.meeting.addMomentOpen = false;
      _meetingEditPhotos = [null, null];
      saveMeetingData();
      render();
      toast('Moment deleted.');
      return;
    }
    if (action === 'add-manual-entry') {
      state.manual.addModalOpen = true;
      state.manual.editingEntryId = null;
      render();
      return;
    }
    if (action === 'close-manual-modal') {
      state.manual.addModalOpen = false;
      state.manual.editingEntryId = null;
      render();
      return;
    }
    if (action === 'save-manual-entry') {
      const monthKey = actionElement.dataset.month || currentManualMonth();
      const topic = app.querySelector('[data-manual-field="topic"]')?.value?.trim() ?? '';
      if (!topic) { toast('Topic is required.'); return; }
      const entry = {
        url: app.querySelector('[data-manual-field="url"]')?.value?.trim() ?? '',
        type: app.querySelector('[data-manual-field="type"]')?.value ?? '',
        date: app.querySelector('[data-manual-field="date"]')?.value ?? ''
      };
      const isEdit = state.manual.editingEntryId !== null;
      if (isEdit) {
        state.manual.entries = (state.manual.entries ?? []).map((e) =>
          e.id === state.manual.editingEntryId ? { ...e, topic, ...entry, month: monthKey } : e
        );
      } else {
        const newId = Math.max(0, ...(state.manual.entries ?? []).map((e) => e.id ?? 0)) + 1;
        state.manual.entries = [...(state.manual.entries ?? []), { id: newId, month: monthKey, topic, ...entry }];
      }
      state.manual.addModalOpen = false;
      state.manual.editingEntryId = null;
      saveManualData();
      render();
      toast(isEdit ? 'Entry updated.' : 'Entry added.');
      return;
    }
    if (action === 'edit-manual-entry') {
      const id = Number(actionElement.dataset.entryId);
      state.manual.editingEntryId = id;
      state.manual.addModalOpen = false;
      render();
      return;
    }
    if (action === 'delete-manual-entry') {
      const id = Number(actionElement.dataset.entryId);
      if (!window.confirm('Delete this entry?')) return;
      state.manual.entries = (state.manual.entries ?? []).filter((e) => e.id !== id);
      saveManualData();
      render();
      toast('Entry deleted.');
      return;
    }
    if (action === 'toggle-manual-edit') {
      state.manual.editMode = !state.manual.editMode;
      render();
      return;
    }
    if (action === 'clear-meeting-photo') {
      const slotIndex = Number(actionElement.dataset.slot);
      _meetingEditPhotos[slotIndex] = null;
      updateMeetingPhotoSlot(slotIndex);
      return;
    }
  }

  if (event.target.closest('[data-photo-slot]') && !event.target.matches('[data-action]') && !event.target.matches('img')) {
    const slot = event.target.closest('[data-photo-slot]');
    const fileInput = slot.querySelector('[data-photo-file]');
    fileInput?.click();
    return;
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

  if (clickedElement?.matches('[data-modal-backdrop]')) {
    state.selectedIssueId = null;
    renderOverlayOnly();
    return;
  }

  if (clickedElement?.matches('[data-meeting-summary-modal-backdrop]')) {
    state.meeting.summaryModalOpen = false;
    renderOverlayOnly();
    return;
  }
  if (clickedElement?.matches('[data-meeting-modal-backdrop]')) {
    state.meeting.addMomentOpen = false;
    state.meeting.editingMomentId = null;
    _meetingEditPhotos = [null, null];
    renderOverlayOnly();
    return;
  }

  if (clickedElement?.matches('[data-manual-modal-backdrop]')) {
    state.manual.addModalOpen = false;
    state.manual.editingEntryId = null;
    renderOverlayOnly();
    return;
  }

  if (clickedElement?.matches('[data-project-import-backdrop]')) {
    state.projectTracking.importModal = false;
    renderOverlayOnly();
    return;
  }

  if (clickedElement?.matches('[data-upload-modal-backdrop]')) {
    state.uploadModal = '';
    state.uploadLoading = false;
    state.uploadResult = null;
    state.uploadSelectedFiles = [];
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

  const venioView = closestFromEvent(event, '[data-venio-view]')?.dataset.venioView;
  if (venioView) {
    state.venioView = venioView;
    renderPreservingScroll();
    return;
  }

  const venioCatSort = closestFromEvent(event, '[data-venio-category-sort]')?.dataset.venioCategorySort;
  if (venioCatSort) {
    state.venioIssue.categorySort = venioCatSort;
    renderPreservingScroll();
    return;
  }

  const etaxgoView = closestFromEvent(event, '[data-etaxgo-view]')?.dataset.etaxgoView;
  if (etaxgoView) {
    state.etaxgoView = etaxgoView;
    renderPreservingScroll();
    return;
  }

  const etaxgoCatSort = closestFromEvent(event, '[data-etaxgo-category-sort]')?.dataset.etaxgoCategorySort;
  if (etaxgoCatSort) {
    state.etaxgoIssue.categorySort = etaxgoCatSort;
    renderPreservingScroll();
    return;
  }

  const saveEtaxgoRuleId = closestFromEvent(event, '[data-save-etaxgo-rule]')?.dataset.saveEtaxgoRule;
  if (saveEtaxgoRuleId) { saveEtaxgoRule(Number(saveEtaxgoRuleId)); return; }

  const projectView = closestFromEvent(event, '[data-project-view]')?.dataset.projectView;
  if (projectView) {
    state.projectTracking.activeView = projectView;
    renderPreservingScroll();
    return;
  }

  const timelineSortField = closestFromEvent(event, '[data-timeline-sort]')?.dataset.timelineSort;
  if (timelineSortField) {
    const current = state.projectTracking.timelineSort;
    state.projectTracking.timelineSort = {
      field: timelineSortField,
      dir: current.field === timelineSortField && current.dir === 'asc' ? 'desc' : 'asc'
    };
    renderPreservingScroll();
    return;
  }

  const crispView = closestFromEvent(event, '[data-crisp-view]')?.dataset.crispView;
  if (crispView) {
    state.crisp.activeView = crispView;
    renderPreservingScroll();
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
  if (target.matches('[data-project-filter]')) {
    state.projectTracking.filters = {
      ...defaultProjectTrackingFilters,
      ...(state.projectTracking.filters ?? {}),
      [target.dataset.projectFilter]: target.value
    };
    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(renderPreservingScroll, 160);
    return;
  }
  if (target.matches('[data-crisp-import-month]')) {
    state.crisp.selectedMonth = target.value;
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
    if (key === 'search') {
      clearTimeout(_searchDebounce);
      _searchDebounce = setTimeout(renderPreservingScroll, 160);
    } else {
      renderPreservingScroll();
    }
  }
});

app.addEventListener('change', (event) => {
  const target = event.target;
  if (target.matches('[data-meeting-month]')) {
    state.meeting.selectedMonth = target.value;
    render();
    return;
  }
  if (target.matches('[data-manual-year]')) {
    state.manual.selectedYear = target.value ? String(parseInt(target.value, 10)) : String(new Date().getFullYear());
    render();
    return;
  }
  if (target.matches('[data-manual-month-filter]')) {
    state.manual.selectedMonthFilter = target.value;
    render();
    return;
  }
  if (target.matches('[data-venio-issue-month]')) {
    state.venioIssue.selectedMonth = target.value;
    render();
    return;
  }
  if (target.matches('[data-etaxgo-issue-month]')) {
    state.etaxgoIssue.selectedMonth = target.value;
    render();
    return;
  }
  if (target.matches('[data-photo-file]')) {
    const slotIndex = Number(target.dataset.photoFile);
    const file = target.files?.[0];
    if (!file) return;
    compressMeetingImage(file).then((compressed) => {
      if (compressed) { _meetingEditPhotos[slotIndex] = compressed; updateMeetingPhotoSlot(slotIndex); }
    });
    return;
  }
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
    renderPreservingScroll();
  }
  if (target.matches('[data-filter-one]')) {
    state.openFilter = '';
    state.filters[target.dataset.filterOne] = target.value;
    if (target.dataset.filterOne === 'sort') {
      state.filters.sort_dir = defaultSortDirection(target.value);
    }
    state.activePreset = '';
    renderPreservingScroll();
    return;
  }
  if (target.matches('[data-project-filter-one]')) {
    state.projectTracking.filters = {
      ...defaultProjectTrackingFilters,
      ...(state.projectTracking.filters ?? {}),
      [target.dataset.projectFilterOne]: target.value
    };
    renderPreservingScroll();
    return;
  }
  if (target.matches('[data-crisp-selected-month]')) {
    state.crisp.selectedMonth = target.value;
    render();
    return;
  }
  if (target.matches('[data-crisp-import-month]')) {
    state.crisp.selectedMonth = target.value;
    return;
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
  if (target.matches('input[type="file"][data-action]')) {
    const files = [...(target.files ?? [])];
    _pendingUploadFiles = files;
    const label = target.closest('.import-drop-zone');
    if (!label) return;
    const span = label.querySelector('span');
    const iconEl = label.querySelector('.import-drop-icon');
    if (files.length === 0) {
      label.classList.remove('has-file');
      if (span) span.textContent = 'Drop file / Select file';
      if (iconEl) { iconEl.style.color = ''; iconEl.textContent = '↑'; }
    } else {
      label.classList.add('has-file');
      if (span) span.textContent = files.map((f) => f.name).join(', ');
      if (iconEl) { iconEl.style.color = '#1a7a40'; iconEl.textContent = '✓'; }
    }
  }
});

async function uploadCsv(format = 'normalized') {
  const actionMap = { jira: 'jira-file', 'etaxgo-jira': 'etaxgo-jira-file', normalized: 'csv-file', etaxgo: 'csv-file' };
  const files = _pendingUploadFiles.length ? _pendingUploadFiles : [...(app.querySelector(`[data-action="${actionMap[format] ?? 'csv-file'}"]`)?.files ?? [])];
  if (!files.length) return toast('Select one or more CSV files first.');
  const endpoint = (format === 'jira' || format === 'etaxgo-jira') ? '/api/import-jira' : '/api/import';
  state.uploadLoading = true;
  state.uploadResult = null;
  render();
  let latestPayload = null;
  const results = [];
  try {
    const overrideMonth = format === 'normalized'
      ? (app.querySelector('[data-venio-import-month]')?.value || null)
      : format === 'etaxgo'
        ? (app.querySelector('[data-etaxgo-import-month]')?.value || null)
        : null;
    for (const file of files) {
      const content = await file.text();
      const body = { filename: file.name, content };
      if (overrideMonth) body.overrideMonth = overrideMonth;
      const payload = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      latestPayload = payload;
      results.push({ file: file.name, validRows: payload.validRows ?? 0, skippedRows: payload.skippedRows ?? 0 });
    }
    if (latestPayload) applyBootstrap(latestPayload);
    const importedRows = results.reduce((sum, result) => sum + result.validRows, 0);
    const skippedRows = results.reduce((sum, result) => sum + result.skippedRows, 0);
    state.uploadLoading = false;
    state.uploadResult = {
      type: 'success',
      message: `✓ Imported ${importedRows} rows from ${files.length} file${files.length === 1 ? '' : 's'}. Skipped ${skippedRows}.`
    };
    render();
    setTimeout(() => {
      state.uploadModal = '';
      state.uploadResult = null;
      state.uploadLoading = false;
      state.uploadSelectedFiles = [];
      if (format === 'etaxgo' || format === 'etaxgo-jira') {
        state.view = 'etaxgo-issue';
        state.etaxgoView = 'dashboard';
      } else {
        state.view = 'dashboard';
        state.venioView = 'dashboard';
      }
      render();
    }, 2000);
  } catch (error) {
    state.uploadLoading = false;
    state.uploadResult = { type: 'error', message: `Import failed: ${error.message}` };
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
    const review = normalizeProjectImportReview(payload);
    if (!(review.projects ?? []).length) {
      toast(`No matching Venio implementation projects found. Skipped ${review.skippedRows ?? 0} rows.`);
      render();
      return;
    }
    state.projectTracking.importModal = false;
    state.projectTracking.importReview = review;
    toast(`${review.validRows ?? 0} matching projects found. Review missing fields before import.`);
    render();
  } catch (error) {
    toast(`Project import failed: ${error.message}`);
    render();
  }
}

async function uploadCrispCsv() {
  const input = app.querySelector('[data-action="crisp-csv-file"]');
  const month = app.querySelector('[data-crisp-import-month]')?.value || state.crisp.selectedMonth || currentMonthKey();
  const file = input?.files?.[0];
  if (!file) return toast('Select a Crisp operator CSV first.');
  state.uploadLoading = true;
  state.uploadResult = null;
  render();
  try {
    const content = await file.text();
    const payload = importClientCrispCsv(file.name, content, month);
    applyBootstrap(payload);
    state.crisp.activeView = 'performance';
    state.crisp.selectedMonth = month;
    state.uploadLoading = false;
    state.uploadResult = {
      type: 'success',
      message: `✓ Imported ${payload.validRows ?? 0} Crisp operators for ${periodLabel(month)}. Skipped ${payload.skippedRows ?? 0}.`
    };
    render();
    setTimeout(() => {
      state.uploadModal = '';
      state.uploadResult = null;
      state.uploadLoading = false;
      state.uploadSelectedFiles = [];
      state.view = 'crisp-performance';
      render();
    }, 2000);
  } catch (error) {
    state.uploadLoading = false;
    state.uploadResult = { type: 'error', message: `Crisp import failed: ${error.message}` };
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
  const review = normalizeProjectImportReview(state.projectTracking.importReview);
  if (!review) return;
  state.projectTracking.importReview = review;
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
  const form = app.querySelector('[data-project-add-form]');
  const body = {
    customer_name: form?.querySelector('[data-add-field="customer_name"]')?.value.trim() || null,
    package_type: form?.querySelector('[data-add-field="package_type"]')?.value || 'Pro',
    user_count: Number(form?.querySelector('[data-add-field="user_count"]')?.value) || 0,
    kickoff_date: form?.querySelector('[data-add-field="kickoff_date"]')?.value || null,
    onboarding_date: form?.querySelector('[data-add-field="onboarding_date"]')?.value || null,
    training_date: form?.querySelector('[data-add-field="training_date"]')?.value || null,
    golive_date: form?.querySelector('[data-add-field="golive_date"]')?.value || null
  };
  try {
    const payload = await api('/api/project-tracking/projects', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    applyBootstrap(payload);
    state.projectTracking.importModal = false;
    state.view = 'project-dashboard';
    state.projectTracking.activeView = 'board';
    state.selectedProjectId = Number(payload.createdProjectId ?? state.projectTrackingProjects[0]?.id ?? 0) || null;
    toast('Project added.');
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

async function saveEtaxgoRule(id = null) {
  let payload;
  if (id) {
    const fields = {};
    app.querySelectorAll(`[data-etaxgo-rule="${id}"]`).forEach((input) => {
      fields[input.dataset.etaxgoRuleField] = input.type === 'checkbox' ? input.checked : input.value;
    });
    payload = { id, ...fields };
  } else {
    payload = {};
    app.querySelectorAll('[data-etaxgo-new-rule]').forEach((input) => {
      payload[input.dataset.etaxgoNewRule] = input.value;
    });
    payload.active = true;
  }
  applyBootstrap(await api('/api/etaxgo-rules', { method: 'POST', body: JSON.stringify(payload) }));
  toast('eTaxGo rule saved.');
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

window.addEventListener('popstate', () => {
  const view = getViewFromHash();
  state.view = view;
  state.openFilter = '';
  state.openDatePicker = '';
  render();
});

document.addEventListener('paste', async (event) => {
  if (!app.querySelector('.meeting-modal')) return;
  const items = [...(event.clipboardData?.items ?? [])];
  const imageItem = items.find((item) => item.type.startsWith('image/'));
  if (!imageItem) return;
  event.preventDefault();
  const emptySlot = _meetingEditPhotos.indexOf(null);
  if (emptySlot === -1) return;
  const file = imageItem.getAsFile();
  if (!file) return;
  const compressed = await compressMeetingImage(file);
  if (compressed) { _meetingEditPhotos[emptySlot] = compressed; updateMeetingPhotoSlot(emptySlot); }
});

applyBootstrap(await initialBootstrap());
if (window.location.hash) {
  state.view = getViewFromHash();
}
render();
