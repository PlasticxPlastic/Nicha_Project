import { statSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const baseUrl = process.env.PERF_URL ?? 'http://localhost:4173';
const budgets = {
  htmlMs: Number(process.env.PERF_HTML_MS ?? 1500),
  bootstrapMs: Number(process.env.PERF_BOOTSTRAP_MS ?? 2000),
  appKb: Number(process.env.PERF_APP_KB ?? 240),
  cssKb: Number(process.env.PERF_CSS_KB ?? 160)
};

async function timedFetch(path) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();
  return {
    path,
    ok: response.ok,
    status: response.status,
    ms: performance.now() - started,
    bytes: Buffer.byteLength(text)
  };
}

function kb(bytes) {
  return bytes / 1024;
}

function assertBudget(label, actual, budget, unit) {
  const passed = actual <= budget;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}: ${actual.toFixed(1)}${unit} / budget ${budget}${unit}`);
  if (!passed) process.exitCode = 1;
}

try {
  const [html, bootstrap] = await Promise.all([
    timedFetch('/'),
    timedFetch('/api/bootstrap')
  ]);

  if (!html.ok) throw new Error(`GET / returned ${html.status}`);
  if (!bootstrap.ok) throw new Error(`GET /api/bootstrap returned ${bootstrap.status}`);

  const appSizeKb = kb(statSync('public/app.js').size);
  const cssSizeKb = kb(statSync('public/styles.css').size);

  assertBudget('HTML response', html.ms, budgets.htmlMs, 'ms');
  assertBudget('Bootstrap response', bootstrap.ms, budgets.bootstrapMs, 'ms');
  assertBudget('public/app.js size', appSizeKb, budgets.appKb, 'KB');
  assertBudget('public/styles.css size', cssSizeKb, budgets.cssKb, 'KB');

  if (!process.exitCode) console.log('Performance smoke check passed.');
} catch (error) {
  console.error(`Performance smoke check failed: ${error.message}`);
  console.error(`Start the local server first: npm run dev`);
  process.exit(1);
}
