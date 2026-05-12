import { inflateRawSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';

const EDITABLE_FIELDS = new Set([
  'customer_name',
  'project_name',
  'package_type',
  'user_count',
  'stage',
  'kickoff_date',
  'onboarding_date',
  'training_date',
  'golive_date',
  'notes',
  'timeline_info'
]);

const STAGES = ['Kick-off', 'Onboarding', 'Training', 'GoLive', 'Warranty', 'On Hold'];
const PIPELINE_STAGES = ['Kick-off', 'Onboarding', 'Training', 'GoLive'];
const REQUIRED_REVIEW_FIELDS = ['customer_name', 'project_name', 'package_type', 'user_count', 'stage'];
const ACTIVE_STATUS_PATTERNS = [
  'planning',
  'implement',
  'implementation',
  'onboarding',
  'on-boarding',
  'training',
  'in progress',
  'golive',
  'go live',
  'warranty',
  'ชนะ',
  'hold project',
  'on hold',
  'hold'
];

function xmlDecode(value = '') {
  return String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function attr(text, name) {
  return text.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';
}

function columnIndex(ref) {
  const letters = ref.match(/[A-Z]+/)?.[0] ?? 'A';
  return letters.split('').reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function unzipXlsx(buffer) {
  const endSignature = 0x06054b50;
  let endOffset = -1;
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === endSignature) {
      endOffset = index;
      break;
    }
  }
  if (endOffset < 0) throw new Error('Invalid XLSX file.');

  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const directoryOffset = buffer.readUInt32LE(endOffset + 16);
  const entries = new Map();
  let offset = directoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid XLSX directory.');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8');

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('Invalid XLSX file entry.');
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
    if (data) entries.set(fileName.replace(/\\/g, '/'), data.toString('utf8'));

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function parseSharedStrings(xml = '') {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => {
    const richText = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((item) => item[1]).join('');
    return xmlDecode(richText);
  });
}

function workbookSheetPath(entries) {
  const workbook = entries.get('xl/workbook.xml');
  const rels = entries.get('xl/_rels/workbook.xml.rels');
  if (!workbook || !rels) return 'xl/worksheets/sheet1.xml';

  const firstSheet = workbook.match(/<sheet\b[^>]*>/)?.[0];
  const relId = firstSheet ? attr(firstSheet, 'r:id') : '';
  const relMatch = relId
    ? [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((item) => item[0]).find((item) => attr(item, 'Id') === relId)
    : '';
  const target = relMatch ? attr(relMatch, 'Target') : 'worksheets/sheet1.xml';
  return target.startsWith('/') ? target.replace(/^\//, '') : `xl/${target.replace(/^\.\.\//, '')}`;
}

function cellValue(cellAttrs, body, sharedStrings) {
  const type = attr(cellAttrs, 't');
  const value = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
  if (type === 's') return sharedStrings[Number(value)] ?? '';
  if (type === 'inlineStr') {
    return xmlDecode([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((item) => item[1]).join(''));
  }
  return xmlDecode(value);
}

export function parseXlsxRows(buffer) {
  const entries = unzipXlsx(buffer);
  const sharedStrings = parseSharedStrings(entries.get('xl/sharedStrings.xml') ?? '');
  const sheet = entries.get(workbookSheetPath(entries)) ?? entries.get('xl/worksheets/sheet1.xml');
  if (!sheet) throw new Error('Could not find the first worksheet.');

  const rows = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = attr(cellMatch[1], 'r');
      row[columnIndex(ref)] = cellValue(cellMatch[1], cellMatch[2], sharedStrings);
    }
    rows[Number(rowMatch[1]) - 1] = row;
  }
  return rows;
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text && text !== '-' ? text : null;
}

function projectNameKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function headerValue(row, aliases) {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function excelSerialToDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + serial * 86400000);
  return date.toISOString().slice(0, 10);
}

function normalizeYear(yearText, fallbackYear) {
  if (!yearText) return fallbackYear;
  const year = Number(yearText);
  if (!Number.isFinite(year)) return fallbackYear;
  return year < 100 ? 2000 + year : year;
}

function normalizeDate(value, fallbackYear = new Date().getFullYear()) {
  const text = clean(value);
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return excelSerialToDate(text);

  const thaiDate = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (thaiDate) {
    const [, day, month, yearText] = thaiDate;
    const year = normalizeYear(yearText, fallbackYear);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function extractDate(text, keywords, fallbackYear) {
  const source = String(text ?? '');
  for (const keyword of keywords) {
    const index = source.toLowerCase().indexOf(keyword.toLowerCase());
    if (index < 0) continue;
    const found = source.slice(index).match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
    if (found) return normalizeDate(found[1], fallbackYear);
  }
  return null;
}

function normalizeStage(value, context = {}) {
  const text = String(value ?? '').replace(/^\s*\d+\.\s*/, '').trim().toLowerCase();
  const notes = String(context.notes ?? '').toLowerCase();
  if (context.goLiveDate) return 'GoLive';
  if (!text) return null;
  if (text.includes('hold')) return 'On Hold';
  if (text.includes('warranty')) return 'GoLive';
  if (text.includes('ชนะ')) return context.goLiveDate ? 'GoLive' : null;
  if (text.includes('training') || text.includes('เทรน')) return 'Training';
  if (text.includes('progress')) return notes.includes('training') || notes.includes('เทรน') ? 'Training' : 'GoLive';
  if (text.includes('golive') || text.includes('go live')) return 'GoLive';
  if (text.includes('implement')) return 'Onboarding';
  if (text.includes('onboard')) return 'Onboarding';
  if (text.includes('planning') || text.includes('kick')) return 'Kick-off';
  return STAGES.find((stage) => stage.toLowerCase() === text) ?? null;
}

function isActivePipelineStatus(value) {
  const text = String(value ?? '').replace(/^\s*\d+\.\s*/, '').trim().toLowerCase();
  if (!text) return false;
  return ACTIVE_STATUS_PATTERNS.some((pattern) => text.includes(pattern))
    || STAGES.some((stage) => stage.toLowerCase() === text);
}

function isVenioProject(record) {
  const source = [
    headerValue(record, ['Project Product', 'Product']),
    headerValue(record, ['ความสนใจ', 'Interest']),
    headerValue(record, ['Project Name', 'ดีล', 'Deal', 'Project'])
  ].join(' ').toLowerCase();
  return source.includes('venio');
}

function reviewFieldsForProject(project) {
  const missing = REQUIRED_REVIEW_FIELDS.filter((field) => {
    const value = project[field];
    return value === null || value === undefined || value === '';
  });
  const currentStageIndex = PIPELINE_STAGES.indexOf(project.stage);
  if (currentStageIndex >= 0) {
    for (const [index, field] of ['kickoff_date', 'onboarding_date', 'training_date', 'golive_date'].entries()) {
      if (index <= currentStageIndex && !project[field]) missing.push(field);
    }
  }
  return [...new Set(missing)];
}

function withReviewMetadata(project) {
  const missing_fields = reviewFieldsForProject(project);
  return {
    ...project,
    missing_fields,
    needs_review: missing_fields.length > 0
  };
}

function normalizePackage(value, projectName = '') {
  const source = `${value ?? ''} ${projectName ?? ''}`.toLowerCase();
  if (source.includes('pro+')) return 'Pro+';
  if (/\bpro\s*plus\b/.test(source)) return 'Pro+';
  if (/\blite\b/.test(source)) return 'Lite';
  if (/\bpro\b/.test(source)) return 'Pro';
  return null;
}

function toInteger(value) {
  const number = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : null;
}

function rowsToRecords(rows) {
  const headerIndex = rows.findIndex((row) => {
    const joined = (row ?? []).join('|').toLowerCase();
    return joined.includes('customer name')
      || joined.includes('project package')
      || joined.includes('golive date')
      || joined.includes('ลูกค้า');
  });
  if (headerIndex < 0) throw new Error('Could not find project headers in the workbook.');

  const headers = (rows[headerIndex] ?? []).map((header) => String(header ?? '').trim());
  return rows.slice(headerIndex + 1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values?.[index] ?? ''])));
}

function recordToProject(record) {
  if (!isVenioProject(record)) return null;
  const customerName = clean(headerValue(record, ['Customer Name', 'ลูกค้า', 'Customer']));
  const projectName = clean(headerValue(record, ['Project Name', 'ดีล', 'Deal', 'Project']));
  const normalizedProjectName = projectNameKey(projectName || customerName);
  if (!normalizedProjectName) return null;
  const sourceKey = `project:${normalizedProjectName}`;
  const rawPackageType = clean(headerValue(record, ['Package', 'Project Package', 'Project Package ', 'แพ็กเกจ']));
  const userCount = toInteger(headerValue(record, ['User Count', 'Users', 'จำนวน', 'จำนวนผู้ใช้']));
  const sourceStatus = clean(headerValue(record, ['Implementation Stage', 'Project Stage', 'ขั้นตอนการขาย', 'Status']));
  const healthStatus = clean(headerValue(record, ['Project Status']));
  const fallbackStatus = clean(headerValue(record, ['ขั้นตอนการขาย', 'Implementation Stage', 'Project Stage', 'Status']));
  const latestSummary = clean(headerValue(record, ['Latest Update', 'Notes', 'Notes / Latest Update', 'อัปเดตล่าสุด']));
  const timelineEvent = clean(headerValue(record, ['Timeline', 'ไทม์ไลน์']));
  const latestTimestamp = clean(headerValue(record, ['Latest Update At', 'ไทม์ไลน์ล่าสุด']));
  const timeline = [latestSummary, timelineEvent].filter(Boolean).join('\n');
  const kickoffDate = normalizeDate(headerValue(record, ['Kick-off Date', 'Kickoff Date', 'วันที่เปิดดีล', 'วันที่สร้าง']));
  const fallbackYear = Number(kickoffDate?.slice(0, 4)) || new Date().getFullYear();
  const goLiveDate = normalizeDate(headerValue(record, ['GoLive Date', 'Golive Date', 'Go Live Date', 'วันที่มีผล']), fallbackYear)
    ?? extractDate(timeline, ['golive', 'go live'], fallbackYear);
  const rawStage = fallbackStatus || sourceStatus;
  const mappedStage = normalizeStage(rawStage, { goLiveDate, notes: timeline });
  if (!mappedStage || !isActivePipelineStatus(rawStage)) return null;

  return withReviewMetadata({
    source_key: sourceKey,
    customer_name: customerName,
    project_name: projectName || customerName,
    package_type: normalizePackage(rawPackageType, projectName),
    user_count: userCount,
    source_status: [rawStage, healthStatus].filter(Boolean).join(' / '),
    stage: mappedStage,
    kickoff_date: kickoffDate,
    onboarding_date: normalizeDate(headerValue(record, ['Onboarding Date', 'On-boarding Date']), fallbackYear)
      ?? extractDate(timeline, ['onboarding', 'on-boarding'], fallbackYear),
    training_date: normalizeDate(headerValue(record, ['Training Date']), fallbackYear)
      ?? extractDate(timeline, ['training', 'เทรนนิ่ง'], fallbackYear),
    golive_date: goLiveDate,
    notes: latestSummary || timelineEvent || latestTimestamp,
    timeline_info: [latestTimestamp, timeline].filter(Boolean).join('\n')
  });
}

function sanitizeProjectDraft(project) {
  const normalizedProjectName = projectNameKey(project.project_name || project.customer_name);
  if (!normalizedProjectName) return null;
  const sourceKey = `project:${normalizedProjectName}`;
  const stage = STAGES.includes(project.stage) ? project.stage : normalizeStage(project.stage) ?? 'Kick-off';
  const fallbackYear = Number(clean(project.kickoff_date)?.slice(0, 4)) || new Date().getFullYear();
  return {
    source_key: sourceKey,
    customer_name: clean(project.customer_name),
    project_name: clean(project.project_name) ?? clean(project.customer_name),
    package_type: normalizePackage(project.package_type, project.project_name) ?? clean(project.package_type),
    user_count: toInteger(project.user_count),
    source_status: clean(project.source_status) ?? 'Imported review',
    stage,
    kickoff_date: normalizeDate(project.kickoff_date, fallbackYear),
    onboarding_date: normalizeDate(project.onboarding_date, fallbackYear),
    training_date: normalizeDate(project.training_date, fallbackYear),
    golive_date: normalizeDate(project.golive_date, fallbackYear),
    notes: clean(project.notes),
    timeline_info: clean(project.timeline_info)
  };
}

function projectPreviewFromXlsx(base64Content) {
  const rows = parseXlsxRows(Buffer.from(base64Content, 'base64'));
  const records = rowsToRecords(rows);
  const projects = records.map(recordToProject).filter((project) => project && (project.customer_name || project.project_name));
  return {
    records,
    projects,
    skippedRows: records.length - projects.length
  };
}

export function previewProjectTrackingXlsx(filename, base64Content) {
  const { records, projects, skippedRows } = projectPreviewFromXlsx(base64Content);
  return {
    ok: true,
    filename,
    totalRows: records.length,
    validRows: projects.length,
    skippedRows,
    needsReview: projects.filter((project) => project.needs_review).length,
    projects
  };
}

function mergeProject(existing, incoming, batchId, now) {
  const editedFields = new Set(JSON.parse(existing?.edited_fields || '[]'));
  const merged = { ...incoming };
  for (const field of EDITABLE_FIELDS) {
    if (editedFields.has(field)) merged[field] = existing[field];
  }
  return {
    ...merged,
    edited_fields: JSON.stringify([...editedFields]),
    import_batch_id: batchId,
    created_at: existing?.created_at ?? now,
    updated_at: now
  };
}

export function importProjectTrackingProjects(filename, incomingProjects, totalRows = incomingProjects.length, skippedRows = 0) {
  const now = new Date().toISOString();
  const projects = incomingProjects
    .map(sanitizeProjectDraft)
    .filter(Boolean)
    .map(withReviewMetadata);

  let batchId;
  db.exec('BEGIN');
  try {
    const batch = db.prepare(`
      INSERT INTO project_tracking_batches (filename, imported_at, total_rows, valid_rows, skipped_rows)
      VALUES (?, ?, ?, ?, ?)
    `).run(filename, now, totalRows, projects.length, skippedRows);
    batchId = Number(batch.lastInsertRowid);

    const find = db.prepare('SELECT * FROM project_tracking_projects WHERE source_key = ?');
    const insert = db.prepare(`
      INSERT INTO project_tracking_projects (
        source_key, customer_name, project_name, package_type, user_count, source_status, stage,
        kickoff_date, onboarding_date, training_date, golive_date, notes, timeline_info,
        edited_fields, import_batch_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const update = db.prepare(`
      UPDATE project_tracking_projects
      SET customer_name = ?, project_name = ?, package_type = ?, user_count = ?, source_status = ?,
        stage = ?, kickoff_date = ?, onboarding_date = ?, training_date = ?, golive_date = ?,
        notes = ?, timeline_info = ?, edited_fields = ?, import_batch_id = ?, updated_at = ?
      WHERE source_key = ?
    `);

    for (const incoming of projects) {
      const existing = find.get(incoming.source_key);
      const project = mergeProject(existing, incoming, batchId, now);
      if (existing) {
        update.run(
          project.customer_name,
          project.project_name,
          project.package_type,
          project.user_count,
          project.source_status,
          project.stage,
          project.kickoff_date,
          project.onboarding_date,
          project.training_date,
          project.golive_date,
          project.notes,
          project.timeline_info,
          project.edited_fields,
          batchId,
          now,
          project.source_key
        );
      } else {
        insert.run(
          project.source_key,
          project.customer_name,
          project.project_name,
          project.package_type,
          project.user_count,
          project.source_status,
          project.stage,
          project.kickoff_date,
          project.onboarding_date,
          project.training_date,
          project.golive_date,
          project.notes,
          project.timeline_info,
          project.edited_fields,
          batchId,
          now,
          now
        );
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return {
    ok: true,
    batchId,
    totalRows,
    validRows: projects.length,
    skippedRows,
    needsReview: projects.filter((project) => project.needs_review).length,
    importedAt: now
  };
}

export function importProjectTrackingXlsx(filename, base64Content) {
  const { records, projects, skippedRows } = projectPreviewFromXlsx(base64Content);
  return importProjectTrackingProjects(filename, projects, records.length, skippedRows);
}

export function updateProjectTrackingProject(id, field, value) {
  if (!EDITABLE_FIELDS.has(field)) throw new Error('This project field is not editable.');
  const existing = db.prepare('SELECT * FROM project_tracking_projects WHERE id = ?').get(Number(id));
  if (!existing) throw new Error('Project not found.');

  const editedFields = new Set(JSON.parse(existing.edited_fields || '[]'));
  editedFields.add(field);
  const nextValue = field === 'user_count' ? toInteger(value) : clean(value);
  db.prepare(`
    UPDATE project_tracking_projects
    SET ${field} = ?, edited_fields = ?, updated_at = ?
    WHERE id = ?
  `).run(nextValue, JSON.stringify([...editedFields]), new Date().toISOString(), Number(id));
}

export function createProjectTrackingProject() {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO project_tracking_projects (
      source_key, customer_name, project_name, package_type, user_count, source_status, stage,
      kickoff_date, onboarding_date, training_date, golive_date, notes, timeline_info,
      edited_fields, import_batch_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `manual-${randomUUID()}`,
    null,
    null,
    'Pro',
    0,
    'Manual',
    'Kick-off',
    new Date().toISOString().slice(0, 10),
    null,
    null,
    null,
    null,
    null,
    JSON.stringify([...EDITABLE_FIELDS]),
    null,
    now,
    now
  );
  return Number(result.lastInsertRowid);
}

export function deleteProjectTrackingProject(id) {
  db.prepare('DELETE FROM project_tracking_projects WHERE id = ?').run(Number(id));
}
