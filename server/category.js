export const VENIO_CATEGORIES = [
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
  'Contact'
];

export const DEFAULT_RULES = [
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

export function detectCategory(issue, rules) {
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
    return {
      category: 'Uncategorized',
      confidence: 'Uncategorized',
      rule: 'No matching rule'
    };
  }

  const sorted = [...matches.entries()].sort((a, b) => b[1] - a[1]);
  const [category, score] = sorted[0];
  const secondScore = sorted[1]?.[1] ?? 0;
  let confidence = 'Low';

  if (score >= 10 && score >= secondScore + 5) confidence = 'High';
  else if (score >= 8) confidence = 'Medium';

  return {
    category,
    confidence,
    rule: `${category} keyword score ${score}`
  };
}
