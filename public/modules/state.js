// state.js — all constants and the shared state object

export const STORAGE_KEY = 'customer_service_team_hub_demo_v1';
export const AUTH_TOKEN_KEY = `${STORAGE_KEY}_auth_token`;
export const AUTH_USER_KEY = `${STORAGE_KEY}_auth_user`;
export const AUTH_USERS_KEY = `${STORAGE_KEY}_auth_users`;

export const categories = [
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

export const projectStages = ['Kick-off', 'Onboarding', 'Training', 'GoLive', 'Warranty', 'On Hold'];

export const projectSalesStageMappings = [
  { pattern: /\bplanning\b/, stage: 'Kick-off' },
  { pattern: /\bimplementation\b|\bimplement\b/, stage: 'Onboarding' },
  { pattern: /\btraining\b/, stage: 'Training' },
  { pattern: /\bin\s*progress\b|\binprogress\b/, stage: 'GoLive' },
  { pattern: /\bwarranty\b/, stage: 'GoLive' },
  { pattern: /\bhold\s*projects?\b|\bon\s*hold\b/, stage: 'On Hold' }
];

export const defaultProjectTrackingFilters = {
  search: '',
  package_type: '',
  stage: '',
  review: ''
};

export const labels = {
  home: 'Home',
  'project-dashboard': 'Project Dashboard',
  'crisp-performance': 'Crisp Chat',
  upload: 'Upload',
  'jira-upload': 'Jira Import',
  dashboard: 'Executive Briefing',
  board: 'Issue Board',
  table: 'Issue Table',
  settings: 'Settings'
};

export const brandAssets = {
  venio: './assets/venio-icon.svg'
};

export const requiredColumns = [
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

export const jiraRequiredColumns = [
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

export const crispColumnLabels = {
  operator: 'Operator',
  conversations: 'Conversation Total',
  rating: 'Rating',
  firstResponseAverage: 'First Response time (Average)',
  firstResponseAverageSeconds: 'First Response average raw seconds',
  resolutionAverage: 'Resolution Time (Average)',
  resolutionAverageSeconds: 'Resolution average raw seconds'
};

export const crispRequiredColumns = Object.keys(crispColumnLabels);

export const crispColumnAliases = {
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

export const defaultRules = [
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

function storedAuthUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null');
  } catch {
    return null;
  }
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
    modal: '',
    draft: {
      username: '',
      password: ''
    }
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
    importReview: null,
    filters: {
      search: '',
      package_type: '',
      stage: '',
      review: ''
    }
  },
  crisp: {
    operators: [],
    batches: [],
    months: [],
    activeView: 'performance',
    selectedMonth: ''
  }
};

export default state;
