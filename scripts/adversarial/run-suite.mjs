// Orchestrator — invoked by `npm run test:adversarial`.
//
// Sequence:
//   1. Reset findings sink
//   2. Pre-cleanup _test tenant (best-effort; skipped without service-role)
//   3. Run vitest adversarial-api suite
//   4. Run playwright UI suite (only if @playwright/test browsers installed)
//   5. Post-cleanup _test tenant
//   6. Generate 3 reports
//
// Emits everything to /tmp/w4-first-run.log AND stdout.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..', '..');
const FINDINGS_DIR = path.join(REPO, 'tests', 'adversarial', '.findings');
const META_FILE   = path.join(FINDINGS_DIR, 'run-meta.json');
const LOG_FILE    = process.env.W4_LOG_FILE || '/tmp/w4-first-run.log';

function log(line) {
  const stamp = `[${new Date().toISOString()}] ${line}`;
  process.stdout.write(stamp + '\n');
  try { writeFileSync(LOG_FILE, stamp + '\n', { flag: 'a' }); } catch {}
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    log(`+ ${cmd} ${args.join(' ')}`);
    const child = spawn(cmd, args, { cwd: REPO, env: process.env, shell: true, ...opts });
    let stdout = '', stderr = '';
    child.stdout?.on('data', (d) => { const s = d.toString(); stdout += s; process.stdout.write(s); try { writeFileSync(LOG_FILE, s, { flag: 'a' }); } catch {} });
    child.stderr?.on('data', (d) => { const s = d.toString(); stderr += s; process.stderr.write(s); try { writeFileSync(LOG_FILE, s, { flag: 'a' }); } catch {} });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', (e) => resolve({ code: 1, stdout, stderr: stderr + '\n' + e.message }));
  });
}

async function main() {
  ensureDir(FINDINGS_DIR);
  try { writeFileSync(LOG_FILE, ''); } catch {}
  writeFileSync(path.join(FINDINGS_DIR, 'findings.ndjson'), '');
  writeFileSync(path.join(FINDINGS_DIR, 'counters.json'), '{}');

  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  // Best-effort pre-cleanup. Skip silently if env not configured.
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    log('PRE-CLEANUP _test tenant...');
    await run('node', ['scripts/cleanup-test-tenant.mjs']);
  } else {
    log('PRE-CLEANUP SKIPPED — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  }

  // Vitest adversarial-api suite (always attempted).
  log('VITEST adversarial-api suite...');
  const vitestRes = await run('npx', ['vitest', 'run', '--config', 'tests/adversarial-api/vitest.config.mjs', '--reporter=default']);
  log(`vitest exited ${vitestRes.code}`);

  // Playwright UI suite — only if browsers installed.
  const browsersInstalled = existsSync(path.join(REPO, 'node_modules', 'playwright-core'));
  let pwCode = 0;
  if (browsersInstalled && !process.env.SKIP_PLAYWRIGHT) {
    log('PLAYWRIGHT adversarial UI suite...');
    const project = process.env.W4_PLAYWRIGHT_PROJECT || 'desktop';
    const workers = process.env.W4_PLAYWRIGHT_WORKERS || '4';
    const pwRes = await run('npx', ['playwright', 'test', '--config', 'playwright.config.js', `--project=${project}`, `--workers=${workers}`, '--reporter=list']);
    pwCode = pwRes.code;
    log(`playwright exited ${pwRes.code}`);
  } else {
    log('PLAYWRIGHT SKIPPED — browsers not installed (run `npx playwright install chromium`) or SKIP_PLAYWRIGHT=1');
  }

  // Post-cleanup.
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    log('POST-CLEANUP _test tenant...');
    await run('node', ['scripts/cleanup-test-tenant.mjs']);
  } else {
    log('POST-CLEANUP SKIPPED — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  }

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - t0;

  const meta = {
    runId: process.env.FLOWAI_RUN_ID || crypto.randomUUID(),
    environment: process.env.FLOWAI_DEV_SUT_URL || 'http://localhost:5173',
    suiteCommit: process.env.FLOWAI_SUITE_COMMIT || null,
    startedAt, completedAt, durationMs,
    vitestExitCode: vitestRes.code,
    playwrightExitCode: pwCode,
    browsersInstalled,
  };
  writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
  log(`meta written: ${META_FILE}`);

  // Generate 3 reports.
  log('GENERATING reports...');
  await run('node', ['scripts/adversarial/generate-md-report.mjs']);
  await run('node', ['scripts/adversarial/generate-csv-report.mjs']);
  await run('node', ['scripts/adversarial/generate-json-report.mjs']);

  log(`DONE in ${durationMs} ms`);
}

main().catch((e) => {
  process.stderr.write(`run-suite: CRASH ${e?.stack ?? e}\n`);
  process.exit(2);
});
