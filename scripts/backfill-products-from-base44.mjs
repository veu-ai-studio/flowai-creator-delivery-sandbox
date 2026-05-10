// scripts/backfill-products-from-base44.mjs
//
// One-shot, idempotent backfill from the Base44 ProductRegistry entity
// into the Supabase-backed `products` table (via /api/products).
//
// Why: PortfolioDashboard switched to /api/products as the single source
// of truth (UX-2 Phase B). The Base44 ProductRegistry entity continues to
// exist for now and may have rows that aren't yet in `products`. This
// script walks the Base44 entity, dedupes against the canonical store,
// and POSTs missing rows.
//
// Idempotent: safe to re-run. Uses (org_id, url) as the dedup key,
// matching the unique index in supabase/migrations/0005_*.sql.
//
// Usage:
//   FLOWAI_BASE_URL=https://flowai-dun.vercel.app \
//   FLOWAI_ORG_ID=<uuid> \
//   BASE44_APP_ID=<id> \
//   BASE44_TOKEN=<token> \
//   node scripts/backfill-products-from-base44.mjs --dry-run
//   node scripts/backfill-products-from-base44.mjs           # apply
//
// Output: a JSON line per row decision (planned, skipped-duplicate,
// posted, failed). Stdout is operator-readable; stderr is non-zero on
// any unrecoverable error.
//
// ESM only.
//
// Deliberate constraints:
//   - Reads ONLY: never deletes from Base44.
//   - Writes ONLY: never updates existing /api/products rows.
//   - No throttling beyond a sequential loop. Backfill is a one-shot,
//     not a continuous sync.

import process from 'node:process';

const argv = new Set(process.argv.slice(2));
const DRY_RUN = argv.has('--dry-run');
const VERBOSE = argv.has('--verbose');

const BASE = (process.env.FLOWAI_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ORG = process.env.FLOWAI_ORG_ID;
const BASE44_APP = process.env.BASE44_APP_ID;
const BASE44_TOK = process.env.BASE44_TOKEN;

function log(line) { process.stdout.write(JSON.stringify(line) + '\n'); }
function die(msg, code = 1) { process.stderr.write(`backfill: ${msg}\n`); process.exit(code); }

if (!ORG) die('FLOWAI_ORG_ID required');
if (!BASE44_APP || !BASE44_TOK) die('BASE44_APP_ID and BASE44_TOKEN required');

const HEADERS_FLOWAI = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'x-flowai-org-id': ORG,
};

// ── Step 1: list existing /api/products for this org (dedup baseline) ──
async function listFlowAi() {
  const url = `${BASE}/api/products?limit=10000`;
  const res = await fetch(url, { headers: HEADERS_FLOWAI });
  if (!res.ok) die(`flowai list failed: HTTP ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.items)) die('flowai list: malformed response (no items[])');
  return body.items;
}

// ── Step 2: list Base44 ProductRegistry rows ──────────────────────────
// Base44 SDK's HTTP API:  GET https://app.base44.com/api/apps/<appId>/entities/ProductRegistry
async function listBase44() {
  const url = `https://app.base44.com/api/apps/${encodeURIComponent(BASE44_APP)}/entities/ProductRegistry?limit=1000`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${BASE44_TOK}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    die(`base44 list failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const body = await res.json();
  // Base44 returns either an array or { data: [...] } depending on SDK version.
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.items)) return body.items;
  die('base44 list: unexpected shape');
}

function normalizeUrl(u) {
  if (typeof u !== 'string') return '';
  const trimmed = u.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  // Case-insensitive on scheme + host (lowercased), case-preserving on
  // path/query — per impl-diff peer review (2026-05-09 must-fix #3): re-runs
  // must not create duplicates due to URL casing. Falls back to lowercasing
  // the whole string if URL parsing fails (e.g., relative or malformed).
  try {
    const parsed = new URL(trimmed);
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return trimmed.toLowerCase();
  }
}

// ── Step 3: post a row to /api/products ───────────────────────────────
async function createFlowAi(row) {
  const body = {
    name: row.label || row.product_name || row.url,
    url: normalizeUrl(row.url || ''),
    description: row.description || '',
    type: 'web',
    status: 'active',
    tags: [],
  };
  if (DRY_RUN) return { dry_run: true, body };
  const res = await fetch(`${BASE}/api/products`, {
    method: 'POST',
    headers: HEADERS_FLOWAI,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* leave null */ }
  if (!res.ok) {
    return { ok: false, status: res.status, error: parsed?.error || text.slice(0, 200) };
  }
  return { ok: true, item: parsed?.item };
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  log({ phase: 'start', org: ORG, base: BASE, dry_run: DRY_RUN });

  const [flowai, base44] = await Promise.all([listFlowAi(), listBase44()]);

  const haveByUrl = new Map();
  const haveByName = new Set();
  for (const p of flowai) {
    if (p.url) haveByUrl.set(normalizeUrl(p.url), p);
    if (p.name) haveByName.add(p.name.toLowerCase());
  }

  const summary = { total_base44: base44.length, total_flowai: flowai.length, planned: 0, skipped: 0, posted: 0, failed: 0 };

  for (const r of base44) {
    const url = normalizeUrl(r.url || '');
    const name = (r.label || r.product_name || r.url || '').trim();
    if (!name) {
      summary.skipped++;
      log({ phase: 'skip', reason: 'no name', row: r.id || null });
      continue;
    }
    if (url && haveByUrl.has(url)) {
      summary.skipped++;
      if (VERBOSE) log({ phase: 'skip', reason: 'duplicate url', name, url });
      continue;
    }
    if (haveByName.has(name.toLowerCase())) {
      summary.skipped++;
      if (VERBOSE) log({ phase: 'skip', reason: 'duplicate name', name });
      continue;
    }
    summary.planned++;
    const out = await createFlowAi(r);
    if (out.dry_run) {
      log({ phase: 'plan', name, url, body: out.body });
    } else if (out.ok) {
      summary.posted++;
      haveByUrl.set(url, out.item || { url });
      haveByName.add(name.toLowerCase());
      log({ phase: 'posted', name, url, id: out.item?.id || null });
    } else {
      summary.failed++;
      log({ phase: 'failed', name, url, status: out.status, error: out.error });
    }
  }

  const ms = Date.now() - t0;
  log({ phase: 'end', summary, elapsed_ms: ms });
  if (summary.failed > 0) process.exit(2);
}

main().catch((e) => die(e?.message || String(e)));
