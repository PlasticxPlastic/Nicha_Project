export const ETAXGO_CATEGORIES = [
  'PDF/Report',
  'Doc Missing',
  'Display/UI',
  'Failed',
  'Email',
  'API',
  'Certificate',
  'Batch',
  'Coin',
  'Other'
];

export const DEFAULT_ETAXGO_RULES = [
  ['PDF/Report',          'pdf',            'EN', 10],
  ['PDF/Report',          'report',         'EN', 9],
  ['PDF/Report',          'รายงาน',          'TH', 10],
  ['PDF/Report',          'print',          'EN', 8],
  ['PDF/Report',          'พิมพ์',           'TH', 8],
  ['PDF/Report',          'excel',          'EN', 8],
  ['PDF/Report',          'export',         'EN', 7],
  ['PDF/Report',          'template',       'EN', 7],
  ['PDF/Report',          'แบบฟอร์ม',        'TH', 8],
  ['Doc Missing',         'document',       'EN', 10],
  ['Doc Missing',         'เอกสาร',          'TH', 10],
  ['Doc Missing',         'missing',        'EN', 9],
  ['Doc Missing',         'หายไป',           'TH', 9],
  ['Doc Missing',         'ไม่พบ',           'TH', 9],
  ['Doc Missing',         'attachment',     'EN', 8],
  ['Doc Missing',         'แนบ',            'TH', 8],
  ['Doc Missing',         'ไฟล์',           'TH', 7],
  ['Doc Missing',         'ไม่มี',           'TH', 6],
  ['Display/UI',          'display',        'EN', 10],
  ['Display/UI',          'ui',             'EN', 10],
  ['Display/UI',          'หน้าจอ',          'TH', 9],
  ['Display/UI',          'button',         'EN', 8],
  ['Display/UI',          'ปุ่ม',            'TH', 8],
  ['Display/UI',          'layout',         'EN', 8],
  ['Display/UI',          'ไม่แสดง',         'TH', 9],
  ['Display/UI',          'แสดงผล',          'TH', 8],
  ['Display/UI',          'หน้า',           'TH', 6],
  ['Display/UI',          'screen',         'EN', 7],
  ['Failed Status',       'failed',         'EN', 10],
  ['Failed Status',       'fail',           'EN', 9],
  ['Failed Status',       'error',          'EN', 8],
  ['Failed Status',       'ผิดพลาด',         'TH', 10],
  ['Failed Status',       'status',         'EN', 7],
  ['Failed Status',       'สถานะ',           'TH', 8],
  ['Failed Status',       'ไม่ผ่าน',         'TH', 9],
  ['Failed Status',       'reject',         'EN', 8],
  ['Failed Status',       'ปฏิเสธ',          'TH', 8],
  ['Email/Notification',  'email',          'EN', 10],
  ['Email/Notification',  'อีเมล',           'TH', 10],
  ['Email/Notification',  'notification',   'EN', 10],
  ['Email/Notification',  'แจ้งเตือน',       'TH', 10],
  ['Email/Notification',  'noti',           'EN', 8],
  ['Email/Notification',  'notify',         'EN', 8],
  ['Email/Notification',  'smtp',           'EN', 9],
  ['Email/Notification',  'inbox',          'EN', 7],
  ['Email/Notification',  'mail',           'EN', 7],
  ['API',                 'api',            'EN', 10],
  ['API',                 'endpoint',       'EN', 10],
  ['API',                 'integration',    'EN', 9],
  ['API',                 'webhook',        'EN', 10],
  ['API',                 'json',           'EN', 8],
  ['API',                 'xml',            'EN', 8],
  ['API',                 'connect',        'EN', 7],
  ['API',                 'เชื่อมต่อ',        'TH', 8],
  ['Certificate',         'certificate',    'EN', 10],
  ['Certificate',         'ใบรับรอง',        'TH', 10],
  ['Certificate',         'cert',           'EN', 9],
  ['Certificate',         'ssl',            'EN', 9],
  ['Certificate',         'e-cert',         'EN', 10],
  ['Certificate',         'ออกใบ',           'TH', 8],
  ['Certificate',         'digital',        'EN', 7],
  ['Batch',               'batch',          'EN', 10],
  ['Batch',               'job',            'EN', 8],
  ['Batch',               'schedule',       'EN', 8],
  ['Batch',               'รันงาน',          'TH', 10],
  ['Batch',               'ประมวลผล',        'TH', 9],
  ['Batch',               'queue',          'EN', 8],
  ['Batch',               'cron',           'EN', 9],
  ['Coin',                'coin',           'EN', 10],
  ['Coin',                'เหรียญ',          'TH', 10],
  ['Coin',                'token',          'EN', 9],
  ['Coin',                'credit',         'EN', 8],
  ['Coin',                'balance',        'EN', 8],
  ['Coin',                'ยอด',            'TH', 7],
  ['Coin',                'เครดิต',          'TH', 9]
];

function normalizeEtaxGoCategoryName(value) {
  const text = String(value ?? '').trim();
  if (!text) return 'Other';
  const lowered = text.toLowerCase();
  if (lowered === 'failed status') return 'Failed';
  if (lowered === 'email/notification') return 'Email';
  return text;
}

export function detectEtaxGoCategory(issue, rules) {
  const text = `${issue.summary ?? ''} ${issue.description ?? ''}`.toLowerCase();
  const matches = new Map();

  for (const rule of rules.filter((r) => r.active)) {
    const keyword = String(rule.keyword ?? '').toLowerCase();
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
