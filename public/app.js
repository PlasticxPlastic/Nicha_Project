const app = document.querySelector('#app');
const STORAGE_KEY = 'customer_service_team_hub_demo_v1';

const state = {
  view: 'home',
  issues: [],
  batches: [],
  settings: {},
  rules: [],
  selectedIssueId: null,
  openFilter: '',
  openDatePicker: '',
  datePickerMonth: '',
  showModalDescription: false,
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
    sort: 'newest'
  },
  comparison: {
    from: '',
    to: ''
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

const labels = {
  home: 'Home',
  'project-dashboard': 'Project Dashboard',
  'crisp-performance': 'Crisp Chat',
  'etaxgo-issue': 'eTaxgo Issue',
  upload: 'Upload / นำเข้า',
  dashboard: 'Dashboard / ภาพรวม',
  board: 'Board / กระดาน',
  table: 'Issue Table / ตาราง',
  settings: 'Settings / ตั้งค่า'
};

const brandAssets = {
  venio: 'https://www.veniocrm.com/wp-content/uploads/2021/08/Venio-Full.png',
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
      'customer_code',
      'venio_category_final'
    ];
    for (const field of fields) {
      if (f[field].length && !f[field].includes(norm(issue[field]))) return false;
    }
    if (search) {
      const haystack = [
        issue.issue_key,
        issue.summary,
        issue.description,
        issue.customer_code,
        issue.venio_category_final
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

  const sorters = {
    newest: (a, b) => (dateValue(b.report_date)?.getTime() ?? 0) - (dateValue(a.report_date)?.getTime() ?? 0),
    oldest: (a, b) => (dateValue(a.report_date)?.getTime() ?? 0) - (dateValue(b.report_date)?.getTime() ?? 0),
    pending: (a, b) => number(b.pending_age_hours) - number(a.pending_age_hours),
    priority: (a, b) => priorityRank(b.priority) - priorityRank(a.priority),
    solve: (a, b) => number(b.time_to_solve_hours) - number(a.time_to_solve_hours),
    updated: (a, b) => (dateValue(b.last_updated_date)?.getTime() ?? 0) - (dateValue(a.last_updated_date)?.getTime() ?? 0),
    customer: (a, b) => norm(a.customer_code).localeCompare(norm(b.customer_code)),
    type: (a, b) => norm(a.issue_type).localeCompare(norm(b.issue_type)),
    category: (a, b) => norm(a.venio_category_final).localeCompare(norm(b.venio_category_final))
  };
  result = [...result].sort(sorters[f.sort] ?? sorters.newest);
  return result;
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
    category: countBy(items, 'venio_category_final')[0]?.[0] ?? '-'
  };
}

function feedbackSummary(items) {
  const m = metrics(items);
  const categoriesTop = countBy(items, 'venio_category_final').slice(0, 3).map(([key]) => key);
  const customersTop = countBy(items, 'customer_code').slice(0, 3).map(([key]) => key);
  const typesTop = countBy(items, 'issue_type').slice(0, 3).map(([key]) => key);
  const slowAreas = averageBy(items, 'venio_category_final', 'time_to_solve_hours').slice(0, 2).map(([key]) => key);

  return `This filtered period contains ${m.total} issues. ${m.open} issues are still pending, including ${m.pendingWarning} over ${state.settings.pending_warning_hours} hours and ${m.pendingCritical} over ${state.settings.pending_critical_hours} hours. The most common Venio categories are ${categoriesTop.join(', ') || '-'}. The most affected customers are ${customersTop.join(', ') || '-'}. Common issue types are ${typesTop.join(', ') || '-'}. The product team should prioritize ${categoriesTop.slice(0, 2).join(' and ') || 'the highest-volume areas'}, while CS should review high-priority pending issues first. Slowest resolved areas: ${slowAreas.join(', ') || '-'}.`;
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

function icon(name) {
  const icons = {
    upload: '&#8593;',
    dashboard: '&#9638;',
    board: '&#9636;',
    table: '&#9776;',
    settings: '&#9881;',
    search: '&#8981;',
    export: '&#8681;',
    close: '&times;'
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
  return `
    <div class="card">
      <div class="card-label"><span>${label}</span><span class="card-glyph"></span></div>
      <div class="metric">${escapeHtml(value)}</div>
      <div class="subtle">${escapeHtml(hint ?? '')}</div>
    </div>
  `;
}

function chart(title, data, options = {}) {
  const max = Math.max(1, ...data.map(([, value]) => value));
  const rows = data.slice(0, options.limit ?? 8).map(([label, value]) => `
    <div class="bar-row">
      <div class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (value / max) * 100)}%"></div></div>
      <strong>${Number(value).toFixed(options.decimals ?? 0)}</strong>
    </div>
  `).join('');
  return `<div class="panel chart-panel"><div class="panel-title"><h2>${title}</h2><span>${data.length} groups</span></div><div class="bar-list">${rows || '<div class="subtle">No data</div>'}</div></div>`;
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
    venio_category_final: 'Category'
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
    'project_name',
    'project_type',
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
              <div class="filter-section-title">Project scope</div>
              <div class="filter-section-grid two">
                ${multi('project_name', 'Project')}
                ${multi('project_type', 'Project Type')}
              </div>
            </div>
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
  const latest = state.batches[0];
  const moduleNav = ['home', 'project-dashboard', 'crisp-performance', 'etaxgo-issue'];
  const venioNav = ['upload', 'dashboard', 'board', 'table', 'settings'];
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand sidebar-brand">${brandLogo('venio', 'Venio', 'brand-logo-sidebar')}<span>Insight</span></div>
        <nav class="nav">
          ${moduleNav.map((key) => `
            <button class="${state.view === key ? 'active' : ''}" data-view="${key}">
              <span class="nav-ico">${icon(key)}</span><span>${labels[key]}</span>
            </button>
          `).join('')}
          <div class="nav-section">Venio Issue</div>
          ${venioNav.map((key) => `
            <button class="${state.view === key ? 'active' : ''}" data-view="${key}">
              <span class="nav-ico">${icon(key)}</span><span>${labels[key]}</span>
            </button>
          `).join('')}
        </nav>
        <div class="sidebar-card">
          <div class="sidebar-kicker">Latest Dataset</div>
          <strong title="${latest ? escapeHtml(latest.filename) : 'No CSV imported'}">${latest ? escapeHtml(middleEllipsis(latest.filename, 28)) : 'No CSV imported'}</strong>
          <p>${latest ? `${latest.valid_rows} valid rows · ${formatDate(latest.imported_at)}` : 'Waiting for CSV data'}</p>
        </div>
      </aside>
      <main class="main">
        <div class="topbar">
          <div class="crumb">Dashboard / <strong>${labels[state.view]}</strong></div>
          <div class="actions">
            <button class="button primary" data-action="print-report">${icon('export')} PDF Report</button>
            <button class="button" data-action="export-excel">${icon('export')} Excel</button>
          </div>
        </div>
        ${content}
      </main>
      ${modal()}
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

function renderLanding() {
  const m = metrics(state.issues);
  const modules = [
    {
      key: 'project-dashboard',
      icon: 'project',
      title: 'Project Dashboard',
      status: 'Not yet',
      meta: 'Portfolio reporting',
      action: 'Coming soon'
    },
    {
      key: 'crisp-performance',
      icon: 'crisp',
      title: 'Crisp Chat Performance',
      status: 'Not yet',
      meta: 'Support response analytics',
      action: 'Coming soon'
    },
    {
      key: 'dashboard',
      icon: 'venio',
      brand: 'venio',
      title: 'Venio Issue',
      status: 'Live',
      meta: `${state.issues.length} issues · ${m.open} pending`,
      action: 'Open workspace'
    },
    {
      key: 'etaxgo-issue',
      icon: 'etaxgo',
      brand: 'etaxgo',
      title: 'eTaxgo Issue',
      status: 'Not configured',
      meta: 'Issue insight workspace',
      action: 'Prepare workspace'
    }
  ];

  return `
    <main class="landing-shell">
      <header class="landing-top">
        <div class="brand hub-brand">${brandLogo('venio', 'Venio', 'brand-logo-header')}<span>Insight Hub</span></div>
        <button class="button" data-view="dashboard">Open Venio Issue</button>
      </header>
      <section class="landing-hero">
        <div>
          <div class="landing-kicker">Operations Intelligence</div>
          <h1>Choose a workspace</h1>
          <p>One local hub for issue reporting, service quality, and project visibility.</p>
        </div>
        <div class="landing-stat">
          <span>Active dataset</span>
          <strong>${state.issues.length}</strong>
          <small>Venio issues loaded</small>
        </div>
      </section>
      <section class="module-grid">
        ${modules.map((module) => `
          <button class="module-card ${module.status === 'Live' ? 'live' : ''} ${module.brand === 'etaxgo' ? 'etaxgo-card' : ''}" data-view="${module.key}">
            <span class="module-status">${escapeHtml(module.status)}</span>
            ${module.brand ? brandLogo(module.brand, module.title, 'module-logo') : `<span class="module-icon">${moduleIcon(module.icon)}</span>`}
            <strong>${escapeHtml(module.title)}</strong>
            <small>${escapeHtml(module.meta)}</small>
            <span class="module-action">${escapeHtml(module.action)}</span>
          </button>
        `).join('')}
      </section>
    </main>
  `;
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
      ${chart('Issues by Venio Category', countBy(items, 'venio_category_final'))}
      ${chart('Issues by Customer Code', countBy(items, 'customer_code'))}
      ${chart('Issues by Project Name', countBy(items, 'project_name'))}
      ${chart('Reported Issues Over Time', countByDate(items, 'report_date'))}
      ${chart('Resolved Issues Over Time', countByDate(items, 'resolved_date'))}
      ${chart('Avg Time to Solve by Category', averageBy(items, 'venio_category_final', 'time_to_solve_hours'), { decimals: 1 })}
      ${chart('Avg Pending Age by Category', averageBy(items.filter((issue) => !isResolved(issue)), 'venio_category_final', 'pending_age_hours'), { decimals: 1 })}
      ${chart('Slowest Resolved Issues', items.filter((issue) => issue.time_to_solve_hours).sort((a, b) => number(b.time_to_solve_hours) - number(a.time_to_solve_hours)).slice(0, 8).map((issue) => [issue.issue_key, number(issue.time_to_solve_hours)]), { decimals: 1 })}
      ${chart('Longest Pending Issues', items.filter((issue) => !isResolved(issue)).sort((a, b) => number(b.pending_age_hours) - number(a.pending_age_hours)).slice(0, 8).map((issue) => [issue.issue_key, number(issue.pending_age_hours)]), { decimals: 1 })}
    </section>
  `);
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
    ${pageHeader('Kanban Board', 'View-only operational board grouped by Status Category.')}
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
  return `
    <button class="issue-card ${level} ${high}" data-open-issue="${issue.id}">
      <span class="issue-card-labels">
        <span class="label-strip priority-${slug(issue.priority)}"></span>
        <span class="label-strip category-label"></span>
      </span>
      <strong>${escapeHtml(issue.summary)}</strong>
      <span class="issue-key">${escapeHtml(issue.issue_key)}</span>
      <span class="subtle">${escapeHtml(issue.issue_type)} · ${escapeHtml(issue.customer_code || '-')}</span>
      <span class="issue-card-footer">
        ${statusPill(issue.status)}
        <span class="mini-badge">${escapeHtml(issue.venio_category_final || 'Uncategorized')}</span>
        <span class="mini-badge ${level}">${pending.toFixed(1)}h</span>
      </span>
    </button>
  `;
}

function shortText(value, limit = 900) {
  const text = norm(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
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
            <th>Issue Key</th>
            <th>Summary</th>
            <th>Customer</th>
            <th>Issue Type</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Status Category</th>
            <th>Venio Category</th>
            <th>Report Date</th>
            <th>Updated</th>
            <th>Resolved</th>
            <th>Time to Solve</th>
            <th>Pending Age</th>
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
              <td>${escapeHtml(issue.venio_category_final || '-')}</td>
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

function renderUpload() {
  const latest = state.batches[0];
  return renderShell(`
    ${pageHeader('CSV Upload', 'Import Venio issue CSV files and keep local upload history.')}
    <section class="grid-2">
      <div class="panel">
        <div class="upload-box">
          <div>
            <h2>Select Venio CSV</h2>
            <p class="subtle">Required columns are validated before saving to SQLite.</p>
            <p><input type="file" accept=".csv,text/csv" data-action="csv-file"></p>
            <button class="button primary" data-action="upload-csv">Upload CSV</button>
          </div>
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
            <div class="field"><span>Skipped Rows</span><p>${latest.skipped_rows}</p></div>
            <div class="field"><span>Duplicate Keys</span><p>${latest.duplicate_count}</p></div>
            <div class="field"><span>Min Report Date</span><p>${formatDate(latest.min_report_date)}</p></div>
            <div class="field"><span>Max Report Date</span><p>${formatDate(latest.max_report_date)}</p></div>
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
    ['Pending Age', issue.pending_age_hours ?? '-'],
    ['Auto Category', issue.venio_category_auto],
    ['Confidence', issue.category_confidence],
    ['Matching Rule', issue.category_rule]
  ];
  const description = norm(issue.description);
  return `
    <div class="modal-backdrop" data-modal-backdrop>
      <article class="modal">
        <div class="modal-head">
          <div>
            <div class="issue-card-labels">
              <span class="label-strip priority-${slug(issue.priority)}"></span>
              <span class="label-strip category-label"></span>
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
                ${description.length > 420 ? `<button class="button ghost compact" data-action="toggle-description">${state.showModalDescription ? 'Collapse' : 'Show full'}</button>` : ''}
              </div>
              <p class="description-preview">${escapeHtml(shortText(description, 420)) || '-'}</p>
            </section>
          </div>
          <aside class="modal-side">
            <div class="modal-side-card">
              <h2>Category</h2>
              <div class="current-category">${escapeHtml(issue.venio_category_final || 'Uncategorized')}</div>
              <select data-manual-category="${issue.id}">
                ${categories.map((category) => `<option ${category === issue.venio_category_final ? 'selected' : ''}>${category}</option>`).join('')}
              </select>
              <button class="button primary" data-action="save-category" data-id="${issue.id}">Save Category</button>
            </div>
            <div class="modal-side-card">
              <h2>Internal Notes</h2>
              <textarea data-note="${issue.id}" placeholder="Add internal note"></textarea>
              <button class="button" data-action="add-note" data-id="${issue.id}">Add Note</button>
              <div class="note-list">
                ${(issue.notes ?? []).map((note) => `<div class="note-item"><span>${formatDate(note.created_at)}</span><p>${escapeHtml(note.note)}</p></div>`).join('') || '<div class="subtle">No notes yet.</div>'}
              </div>
            </div>
          </aside>
          ${state.showModalDescription ? `
            <section class="modal-section modal-full-description">
              <div class="panel-title">
                <h2>Full Description</h2>
                <button class="button ghost compact" data-action="toggle-description">Collapse</button>
              </div>
              <p class="full-description-text">${escapeHtml(description) || '-'}</p>
            </section>
          ` : ''}
        </div>
      </article>
    </div>
  `;
}

function render() {
  document.body.classList.toggle('dark', state.settings.dark_mode === 'true');
  document.body.classList.toggle('theme-etaxgo', state.view === 'etaxgo-issue');
  const titles = {
    home: 'Customer Service Team Hub',
    'project-dashboard': 'Project Dashboard | Customer Service Team Hub',
    'crisp-performance': 'Crisp Chat Performance | Customer Service Team Hub',
    'etaxgo-issue': 'eTaxGo Issue | Customer Service Team Hub',
    upload: 'Venio Issue Upload | Customer Service Team Hub',
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
    'project-dashboard': () => renderPlaceholder('Project Dashboard', 'Not yet available.'),
    'crisp-performance': () => renderPlaceholder('Crisp Chat Performance', 'Not yet available.'),
    'etaxgo-issue': () => renderPlaceholder('eTaxgo Issue', 'Not configured yet.'),
    upload: renderUpload,
    dashboard: renderDashboard,
    board: renderBoard,
    table: renderTable,
    settings: renderSettings
  };
  state.lastShellHtml = (views[state.view] ?? renderLanding)();
  app.innerHTML = state.lastShellHtml;
}

function renderOverlayOnly() {
  const modalHtml = modal();
  const toastHtml = state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : '';
  const existingModal = app.querySelector('.modal-backdrop');
  const existingToast = app.querySelector('.toast');
  existingModal?.remove();
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

function createDefaultStore() {
  return {
    issues: [],
    batches: [],
    settings: {
      pending_warning_hours: '36',
      pending_critical_hours: '72',
      solve_warning_hours: '36',
      solve_critical_hours: '72',
      dark_mode: 'false'
    },
    rules: defaultRules.map((rule, index) => ({
      id: index + 1,
      category: rule[0],
      keyword: rule[1],
      language: rule[2],
      weight: rule[3],
      active: true
    })),
    nextIssueId: 1,
    nextBatchId: 1,
    nextNoteId: 1,
    nextRuleId: defaultRules.length + 1
  };
}

function loadClientStore() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return stored ? { ...createDefaultStore(), ...stored } : createDefaultStore();
  } catch {
    return createDefaultStore();
  }
}

function saveClientStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function clientBootstrap(store = loadClientStore()) {
  saveClientStore(store);
  return {
    issues: store.issues ?? [],
    batches: store.batches ?? [],
    settings: store.settings ?? {},
    rules: store.rules ?? []
  };
}

function detectClientCategory(issue, rules) {
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

function importClientCsv(filename, content) {
  const store = loadClientStore();
  const { headers, records } = parseCsvText(content);
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    const error = new Error(`Missing columns: ${missingColumns.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const validIssues = [];
  let skippedRows = 0;

  for (const row of records) {
    const issue = {
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
    const manual = existing?.venio_category_manual ?? null;
    const nextIssue = {
      ...(existing ?? { id: store.nextIssueId++, notes: [], created_at: now }),
      ...incoming,
      venio_category_auto: detected.category,
      venio_category_manual: manual,
      venio_category_final: manual || detected.category,
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
  const store = loadClientStore();
  const method = options.method ?? 'GET';
  const body = options.body ? JSON.parse(options.body) : {};

  if (method === 'GET' && path === '/api/bootstrap') return clientBootstrap(store);
  if (method === 'POST' && path === '/api/import') return importClientCsv(body.filename ?? 'upload.csv', body.content ?? '');
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

  const categoryMatch = path.match(/^\/api\/issues\/(\d+)\/category$/);
  if (method === 'POST' && categoryMatch) {
    const issueId = Number(categoryMatch[1]);
    store.issues = store.issues.map((issue) => issue.id === issueId
      ? { ...issue, venio_category_manual: body.category || null, venio_category_final: body.category || 'Uncategorized', updated_at: new Date().toISOString() }
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
  try {
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.includes('application/json')) throw new Error('API unavailable');
    const payload = await response.json();
    return payload;
  } catch {
    return clientApi(path, options);
  }
}

function applyBootstrap(payload) {
  state.issues = payload.issues ?? [];
  state.batches = payload.batches ?? [];
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
    sort: 'newest'
  });
  state.activePreset = '';
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
    ['Venio Category Breakdown', breakdownRows(countBy(items, 'venio_category_final'))],
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
    ['Issue key', 'Summary', 'Issue Type', 'Status', 'Project name', 'Project type', 'Priority', 'Description', 'Customer Code', 'Status Category', 'Report Date', 'Last Updated Date', 'Resolved Date', 'Time to Solve', 'Pending Age', 'Venio Category', 'Confidence', 'Threshold'],
    ...items.map((issue) => [
      issue.issue_key,
      issue.summary,
      issue.issue_type,
      issue.status,
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
      issue.venio_category_final,
      issue.category_confidence,
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
          ${chart('Key Issue Insights', countBy(items, 'venio_category_final'))}
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
      state.showModalDescription = false;
      renderOverlayOnly();
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
      uploadCsv();
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
    if (action === 'toggle-description') {
      state.showModalDescription = !state.showModalDescription;
      renderOverlayOnly();
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

  if (clickedElement?.matches('[data-modal-backdrop]')) {
    state.selectedIssueId = null;
    state.showModalDescription = false;
    renderOverlayOnly();
    return;
  }

  const view = closestFromEvent(event, '[data-view]')?.dataset.view;
  if (view) {
    state.view = view;
    state.openFilter = '';
    state.openDatePicker = '';
    render();
    return;
  }

  const issueId = closestFromEvent(event, '[data-open-issue]')?.dataset.openIssue;
  if (issueId) {
    state.selectedIssueId = Number(issueId);
    state.showModalDescription = false;
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

  const ruleId = closestFromEvent(event, '[data-save-rule]')?.dataset.saveRule;
  if (ruleId) saveRule(Number(ruleId));
});

app.addEventListener('input', (event) => {
  const target = event.target;
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
    state.activePreset = '';
    render();
  }
  if (target.matches('[data-comparison]')) {
    state.comparison[target.dataset.comparison] = target.value;
    render();
  }
});

async function uploadCsv() {
  const input = app.querySelector('[data-action="csv-file"]');
  const file = input?.files?.[0];
  if (!file) return toast('Select a CSV file first.');
  const content = await file.text();
  try {
    const payload = await api('/api/import', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, content })
    });
    applyBootstrap(payload);
    state.view = 'dashboard';
    toast(`Imported ${payload.validRows} rows. Skipped ${payload.skippedRows}.`);
    render();
  } catch (error) {
    toast(`Import failed: ${error.message}`);
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

async function saveCategory(id) {
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

applyBootstrap(await api('/api/bootstrap'));
render();
