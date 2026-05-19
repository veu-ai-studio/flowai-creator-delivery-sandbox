// scripts/run-orchestration.mjs — the GENERIC FlowAI runner.
//
// One script for ANY product. Replaces the per-dispatch
// run-orchestration-full-d31...d39 family.
//
// Usage:
//   doppler run --project flowai --config prd -- \
//     npx tsx scripts/run-orchestration.mjs --product <productId>
//
//   doppler run --project flowai --config prd -- \
//     npx tsx scripts/run-orchestration.mjs --url <url>
//
// Flags:
//   --product <id>        — productId to look up in product_registry (PATH A)
//   --url <url>           — explicit URL (PATH B / unregistered)
//   --gtm-target <n>      — default 95
//   --max-iters <n>       — default 5
//   --timeout-ms <n>      — default 1800000 (30 min)
//   --no-supabase         — skip Supabase connection (test mode)
//
// Onboarding a NEW product requires ONLY:
//   1. A product_registry row (product_id, github_repo_url, environment,
//      product_url, optional self_renewal_branch / vercel_project_id).
//   2. Re-run this script with --product <new-id>.
//
// Zero per-product code, zero per-product migrations, zero per-product
// scripts. The product_ssot row is auto-created by the engine on first
// run (ensureProductSsotRow / D40).

import { runOrchestration } from '../src/lib/agents/renewal/orchestrator.js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--product') { out.product = argv[++i]; continue; }
    if (a === '--url') { out.url = argv[++i]; continue; }
    if (a === '--gtm-target') { out.gtmTarget = Number(argv[++i]); continue; }
    if (a === '--max-iters') { out.maxIterations = Number(argv[++i]); continue; }
    if (a === '--timeout-ms') { out.timeoutMs = Number(argv[++i]); continue; }
    if (a === '--no-supabase') { out.noSupabase = true; continue; }
    if (a === '--mode') { out.mode = argv[++i]; continue; }
    // D41 T4 — authenticated traversal: storage-state JSON path.
    // The file is Playwright's storageState shape ({cookies, origins}).
    // Phase B will probe logged-in surfaces using these credentials.
    if (a === '--storage-state') { out.storageStatePath = argv[++i]; continue; }
    if (a === '--help' || a === '-h') { out.help = true; continue; }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || (!args.product && !args.url)) {
  console.log('Usage: run-orchestration.mjs --product <id> | --url <url> [opts]');
  console.log('  --gtm-target <n>   (default 95)');
  console.log('  --max-iters <n>    (default 5)');
  console.log('  --timeout-ms <n>   (default 1800000)');
  console.log('  --no-supabase      (test mode)');
  console.log('  --mode <auto|guided|manual> (default auto)');
  console.log('  --storage-state <path>     Playwright storageState JSON for authenticated Phase B (D41 T4)');
  process.exit(args.help ? 0 : 2);
}

const GTM_TARGET = Number.isFinite(args.gtmTarget) ? args.gtmTarget : 95;
const MAX_ITERATIONS = Number.isFinite(args.maxIterations) ? args.maxIterations : 5;
const TIMEOUT_MS = Number.isFinite(args.timeoutMs) ? args.timeoutMs : 1800000;
const MODE = args.mode ?? 'auto';

const supabase = (!args.noSupabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// PATH A: resolve registry row by productId so the orchestrator
// receives a real product object (the engine uses product.product_url
// + product.self_renewal_branch + product.vercel_project_id when
// present, with environment-variable fallbacks). PATH B: pass URL
// only — orchestrator routes through discoverProduct → synthesized.
let discoverProductOverride = null;
let resolvedRow = null;
if (args.product && supabase) {
  const { data, error } = await supabase
    .from('product_registry')
    .select('*')
    .eq('product_id', args.product)
    .maybeSingle();
  if (error) { console.error('FATAL: product_registry read failed:', error.message); process.exit(1); }
  if (!data) {
    console.error(`FATAL: no product_registry row for product_id="${args.product}". To onboard, INSERT a row with product_id + product_url + github_repo_url, then re-run.`);
    process.exit(1);
  }
  resolvedRow = data;
  discoverProductOverride = async () => data;
}

const startedAtMs = Date.now();
const startedAtIso = new Date(startedAtMs).toISOString();

console.log('═══════════════════════════════════════════════════════════════');
console.log('FlowAI Self-Renewal — GENERIC RUNNER (D40)');
console.log('═══════════════════════════════════════════════════════════════');
if (args.product) console.log(`Mode: PATH A  | product: ${args.product}`);
else console.log(`Mode: PATH B  | url: ${args.url}`);
if (resolvedRow) {
  console.log(`Registry row resolved:`);
  console.log(`  product_id:           ${resolvedRow.product_id}`);
  console.log(`  product_url:          ${resolvedRow.product_url ?? '(not set — engine will fall back to map/url arg)'}`);
  console.log(`  github_repo_url:      ${resolvedRow.github_repo_url ?? '(none)'}`);
  console.log(`  self_renewal_branch:  ${resolvedRow.self_renewal_branch ?? 'main'}`);
  console.log(`  vercel_project_id:    ${resolvedRow.vercel_project_id ?? '(env-var fallback)'}`);
  console.log(`  self_renewal_enabled: ${resolvedRow.self_renewal_enabled}`);
}
console.log(`Supabase:    ${supabase ? 'CONNECTED' : 'NULL (test mode)'}`);
console.log(`GTM target:  ${GTM_TARGET}/100  | Max iters: ${MAX_ITERATIONS}  | Timeout: ${(TIMEOUT_MS / 1000).toFixed(0)}s`);
console.log(`Started:     ${startedAtIso}`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// Engine invocation. Zero per-product branching. The orchestrator
// resolves everything it needs from the registry row (D40) +
// per-iter Phase B probe (D39).
// D41 T4 — load Playwright storageState JSON if a path was supplied
// (--storage-state ./auth.json). Never log secret values; the file is
// passed as opaque object to runOrchestration.
let storageStateForRun;
if (args.storageStatePath) {
  try {
    storageStateForRun = JSON.parse(readFileSync(args.storageStatePath, 'utf-8'));
    console.log(`storageState: loaded from ${args.storageStatePath} (Phase B will probe authenticated)`);
  } catch (e) {
    console.error(`FATAL: storage-state load failed: ${e?.message ?? e}`);
    process.exit(1);
  }
}

const orchestrationPromise = runOrchestration({
  url: args.url ?? null,
  mode: MODE,
  runId: randomUUID(),
  supabase,
  environment: 'prd',
  gtmTarget: GTM_TARGET,
  maxIterations: MAX_ITERATIONS,
  storageState: storageStateForRun,
  deps: discoverProductOverride ? { discoverProduct: discoverProductOverride } : {},
  onStep: (log) => {
    const score = log.scores?.current;
    const scoreStr = (score !== undefined && score !== null) ? ` SCORE: ${score}/100` : '';
    console.log(`[I${log.iteration}][S${log.step}] ${log.stepName} — ${log.status}${scoreStr}`);
    if (log.result && (log.status === 'complete' || log.status === 'degraded')) {
      console.log(`  RESULT: ${JSON.stringify(log.result).slice(0, 320)}`);
    }
    if (log.status === 'failed' || log.status === 'degraded') {
      const reason = log.result?.reason || log.result?.detail || log.result?.error || '';
      if (reason && typeof reason === 'string') console.log(`  ISSUE: ${reason}`);
    }
    if (log.step === 7 && Array.isArray(log.result?.rejected) && log.result.rejected.length > 0) {
      console.log(`  REJECTIONS (${log.result.rejected.length}):`);
      for (const r of log.result.rejected) {
        console.log(`    [${r.code || 'UNKNOWN'}] ${r.filePath} — ${r.reason}`);
      }
    }
  },
  onIteration: (iter) => {
    console.log('');
    console.log(`=== ITER ${iter.number} DONE — §7.6: ${iter.preScore}→${iter.postScore} (Δ${iter.delta >= 0 ? '+' : ''}${iter.delta}) | GTM:${iter.gtmReady ? 'YES' : 'NO'}${iter.regressed ? ' | REGRESSED' : ''}`);
    if (iter.regressed && iter.regressionDetail) {
      console.log(`    REGRESSION: ${JSON.stringify(iter.regressionDetail)}`);
    }
    console.log('');
  },
}).catch((e) => ({ ok: false, exception: e?.message ?? String(e) }));

const timeoutPromise = new Promise((_, reject) => setTimeout(() => {
  reject(new Error(`script_timeout_after_${(TIMEOUT_MS / 1000).toFixed(0)}s`));
}, TIMEOUT_MS));

let result;
try { result = await Promise.race([orchestrationPromise, timeoutPromise]); }
catch (e) { result = { ok: false, exception: e?.message ?? String(e), exitReason: 'TIMEOUT' }; }

const completedAtMs = Date.now();
const durationS = Math.round((completedAtMs - startedAtMs) / 1000);

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('RUN COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`gtmReady:      ${result.gtmReady ?? false}`);
console.log(`score:         ${result.originalScore ?? 0} → ${result.finalScore ?? 0} (band: ${result.gtmBand ?? 'n/a'})`);
console.log(`iterations:    ${result.iterationsCompleted ?? 0}`);
console.log(`preview URL:   ${result.previewUrl ?? 'null'}`);
console.log(`PR URL:        ${result.prUrl ?? 'null'}`);
console.log(`exit reason:   ${result.exitReason ?? 'UNKNOWN'}`);
if (result.failedStep) console.log(`failed step:   ${result.failedStep}`);
if (result.error) console.log(`error:         ${result.error}`);
if (result.exception) console.log(`exception:     ${result.exception}`);
if (result.runIncomplete) console.log(`runIncomplete: ${result.runIncomplete.reason}`);
console.log(`duration:      ${Math.floor(durationS / 60)}m ${durationS % 60}s`);
console.log('═══════════════════════════════════════════════════════════════');

process.exit(result.ok ? 0 : 1);
