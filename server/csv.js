export const REQUIRED_COLUMNS = [
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

export function parseCsv(text) {
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

  if (!rows.length) return { headers: [], records: [] };

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, '').trim());
  const records = rows.slice(1).map((values) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    return record;
  });

  return { headers, records };
}

export function validateColumns(headers) {
  return REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
}
