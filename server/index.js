import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, deleteIssueBatch, deleteCrispBatch, getBatches, getIssues, getProjectTrackingBatches, getProjectTrackingProjects, getRules, getSettings, migrate } from './db.js';
import { importCsvContent, importJiraCsvContent } from './importer.js';
import { createProjectTrackingProject, deleteProjectTrackingBatch, deleteProjectTrackingProject, importProjectTrackingProjects, importProjectTrackingXlsx, previewProjectTrackingXlsx, updateProjectTrackingProject } from './projectTracking.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const port = Number(process.env.PORT ?? 4173);
const samplePath = process.env.SAMPLE_CSV ?? 'C:\\Users\\usEr\\Downloads\\tickets_export_with_dates - Tickets.csv';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function bootstrapPayload() {
  return {
    issues: getIssues(),
    batches: getBatches(),
    projectTrackingProjects: getProjectTrackingProjects(),
    projectTrackingBatches: getProjectTrackingBatches(),
    settings: getSettings(),
    rules: getRules()
  };
}

function isVenioIssue(issue) {
  return String(issue?.project_name ?? '').trim().toLowerCase() === 'venio'
    || String(issue?.issue_key ?? '').trim().toUpperCase().startsWith('VENIO-');
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const filePath = join(publicDir, cleanPath || 'index.html');
  const safePath = filePath.startsWith(publicDir) ? filePath : join(publicDir, 'index.html');
  const finalPath = existsSync(safePath) ? safePath : join(publicDir, 'index.html');
  response.writeHead(200, { 'Content-Type': mime[extname(finalPath)] ?? 'application/octet-stream' });
  response.end(readFileSync(finalPath));
}

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'GET' && url.pathname === '/api/bootstrap') {
    json(response, 200, bootstrapPayload());
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/import') {
    const body = JSON.parse(await readBody(request));
    const result = importCsvContent(body.filename ?? 'upload.csv', body.content ?? '');
    json(response, result.ok ? 200 : 400, { ...result, ...bootstrapPayload() });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/import-jira') {
    const body = JSON.parse(await readBody(request));
    const result = importJiraCsvContent(body.filename ?? 'jira-export.csv', body.content ?? '');
    json(response, result.ok ? 200 : 400, { ...result, ...bootstrapPayload() });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/project-tracking/import') {
    const body = JSON.parse(await readBody(request));
    const result = Array.isArray(body.projects)
      ? importProjectTrackingProjects(body.filename ?? 'project-tracking.xlsx', body.projects, Number(body.totalRows ?? body.projects.length), Number(body.skippedRows ?? 0))
      : importProjectTrackingXlsx(body.filename ?? 'project-tracking.xlsx', body.content ?? '');
    json(response, result.ok ? 200 : 400, { ...result, ...bootstrapPayload() });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/project-tracking/preview') {
    const body = JSON.parse(await readBody(request));
    const result = previewProjectTrackingXlsx(body.filename ?? 'project-tracking.xlsx', body.content ?? '');
    json(response, result.ok ? 200 : 400, result);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/project-tracking/projects') {
    let body = {};
    try { body = JSON.parse(await readBody(request)); } catch (_) {}
    const createdProjectId = createProjectTrackingProject(body);
    json(response, 200, { ...bootstrapPayload(), createdProjectId });
    return;
  }

  const projectMatch = url.pathname.match(/^\/api\/project-tracking\/projects\/(\d+)$/);
  if (request.method === 'POST' && projectMatch) {
    const body = JSON.parse(await readBody(request));
    updateProjectTrackingProject(Number(projectMatch[1]), body.field, body.value);
    json(response, 200, bootstrapPayload());
    return;
  }

  if (request.method === 'DELETE' && projectMatch) {
    deleteProjectTrackingProject(Number(projectMatch[1]));
    json(response, 200, bootstrapPayload());
    return;
  }

  const issueBatchMatch = url.pathname.match(/^\/api\/batches\/(\d+)$/);
  if (request.method === 'DELETE' && issueBatchMatch) {
    const batchId = Number(issueBatchMatch[1]);
    deleteIssueBatch(batchId);
    json(response, 200, bootstrapPayload());
    return;
  }

  const crispBatchMatch = url.pathname.match(/^\/api\/crisp\/batches\/(\d+)$/);
  if (request.method === 'DELETE' && crispBatchMatch) {
    const batchId = Number(crispBatchMatch[1]);
    deleteCrispBatch(batchId);
    json(response, 200, bootstrapPayload());
    return;
  }

  const projectBatchRouteMatch = url.pathname.match(/^\/api\/project-tracking\/batches\/(\d+)$/);
  if (request.method === 'DELETE' && projectBatchRouteMatch) {
    const batchId = Number(projectBatchRouteMatch[1]);
    deleteProjectTrackingBatch(batchId);
    json(response, 200, bootstrapPayload());
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/settings') {
    const settings = JSON.parse(await readBody(request));
    const statement = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const [key, value] of Object.entries(settings)) statement.run(key, String(value));
    json(response, 200, bootstrapPayload());
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/rules') {
    const body = JSON.parse(await readBody(request));
    if (body.id) {
      db.prepare(`
        UPDATE category_keyword_rules
        SET category = ?, keyword = ?, language = ?, weight = ?, active = ?
        WHERE id = ?
      `).run(body.category, body.keyword, body.language, Number(body.weight), body.active ? 1 : 0, body.id);
    } else {
      db.prepare(`
        INSERT INTO category_keyword_rules (category, keyword, language, weight, active)
        VALUES (?, ?, ?, ?, ?)
      `).run(body.category, body.keyword, body.language, Number(body.weight), body.active ? 1 : 0);
    }
    json(response, 200, bootstrapPayload());
    return;
  }

  const categoryMatch = url.pathname.match(/^\/api\/issues\/(\d+)\/category$/);
  if (request.method === 'POST' && categoryMatch) {
    const body = JSON.parse(await readBody(request));
    const issueId = Number(categoryMatch[1]);
    const issue = db.prepare('SELECT issue_key, project_name FROM issues WHERE id = ?').get(issueId);
    if (!isVenioIssue(issue)) {
      json(response, 400, { error: 'Venio category applies only to Venio issues.' });
      return;
    }
    db.prepare(`
      UPDATE issues
      SET venio_category_manual = ?, venio_category_final = ?, updated_at = ?
      WHERE id = ?
    `).run(body.category || null, body.category || 'Uncategorized', new Date().toISOString(), issueId);
    json(response, 200, bootstrapPayload());
    return;
  }

  const noteMatch = url.pathname.match(/^\/api\/issues\/(\d+)\/notes$/);
  if (request.method === 'POST' && noteMatch) {
    const body = JSON.parse(await readBody(request));
    if (String(body.note ?? '').trim()) {
      db.prepare('INSERT INTO issue_notes (issue_id, note, created_at) VALUES (?, ?, ?)')
        .run(Number(noteMatch[1]), String(body.note).trim(), new Date().toISOString());
    }
    json(response, 200, bootstrapPayload());
    return;
  }

  json(response, 404, { error: 'Not found' });
}

migrate();

if (process.env.AUTO_IMPORT_SAMPLE === 'true' && !getBatches().length && existsSync(samplePath)) {
  const content = readFileSync(samplePath, 'utf8');
  importCsvContent('tickets_export_with_dates - Tickets.csv', content);
}

createServer((request, response) => {
  if (request.url.startsWith('/api/')) {
    handleApi(request, response).catch((error) => {
      console.error(error);
      json(response, 500, { error: error.message });
    });
  } else {
    serveStatic(request, response);
  }
}).listen(port, () => {
  console.log(`Venio dashboard running at http://localhost:${port}`);
});
