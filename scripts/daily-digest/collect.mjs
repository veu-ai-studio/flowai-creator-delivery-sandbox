// scripts/daily-digest/collect.mjs
//
// Read-only collector for the daily digest. NEVER writes to canonical
// docs, SSOT, parking lot, or any source artifact. Returns a single
// state object the renderer consumes.
//
// All data sources tolerate missing inputs gracefully — a missing
// panel-consultations dir is reported as "None in window," not an
// error. Network probes use AbortController with short timeouts.

import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { inspectLock } from '../lib/wx-stage-lock.mjs';

const execFileP = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PARKING_LOT_PATH    = path.join(REPO_ROOT, 'docs', 'SSOT_PARKING_LOT.md');
const CANONICAL_HISTORY   = path.join(REPO_ROOT, 'docs', 'CANONICAL_HISTORY.md');
const PANEL_DIR           = path.join(REPO_ROOT, 'docs', 'panel-consultations');
const DIGEST_MARKER_PATH  = path.join(REPO_ROOT, '.w03-cache', 'last-digest-marker.txt');
const SSOT_PATH           = path.join(REPO_ROOT, 'docs', 'FLOWAI_SSOT.md');

const DEPLOYED_URL = 'https://truthful-flow-logic-lab.vercel.app';
const VERSION_PATH = '/api/version';
const PROBE_TIMEOUT_MS = 10_000;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────
// Marker (delta tracking)
// ─────────────────────────────────────────────────────────────────────────

async function readMarker() {
  if (!existsSync(DIGEST_MARKER_PATH)) {
    return { isFirstRun: true, previousCommit: null, previousTimestamp: null };
  }
  try {
    const raw = (await readFile(DIGEST_MARKER_PATH, 'utf8')).trim();
    const lines = raw.split(/\r?\n/);
    const commit = lines.find((l) => l.startsWith('commit='))?.slice('commit='.length).trim() ?? null;
    const ts = lines.find((l) => l.startsWith('timestamp='))?.slice('timestamp='.length).trim() ?? null;
    return { isFirstRun: false, previousCommit: commit, previousTimestamp: ts };
  } catch {
    return { isFirstRun: true, previousCommit: null, previousTimestamp: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Parking lot
// ─────────────────────────────────────────────────────────────────────────

async function collectParkingLot() {
  if (!existsSync(PARKING_LOT_PATH)) {
    return { entries: [], rawAvailable: false };
  }
  const raw = await readFile(PARKING_LOT_PATH, 'utf8');
  // Split at "### ENTRY ###" headings. The first chunk is preamble.
  const chunks = raw.split(/^### ENTRY /m);
  const entries = [];
  for (let i = 1; i < chunks.length; i += 1) {
    const block = '### ENTRY ' + chunks[i];
    const idMatch = block.match(/^### ENTRY (\d+)\s+—\s+([^\n]+)/m);
    if (!idMatch) continue;
    const id = idMatch[1];
    const dateLine = idMatch[2].trim();
    const sourceMatch = block.match(/^- \*\*Source\*\*:\s*([\s\S]*?)(?=\n- \*\*|$)/m);
    const descMatch = block.match(/^- \*\*Description\*\*:\s*([\s\S]*?)(?=\n- \*\*|$)/m);
    const dispMatch = block.match(/^- \*\*Disposition\*\*:\s*([\s\S]*?)(?=\n- \*\*|\n---|\n\*File created|$)/m);
    entries.push({
      id,
      date: dateLine,
      source: sourceMatch ? sourceMatch[1].trim().replace(/\s+/g, ' ').slice(0, 240) : '',
      description: descMatch ? descMatch[1].trim().replace(/\s+/g, ' ').slice(0, 360) : '',
      disposition: dispMatch ? dispMatch[1].trim().replace(/\s+/g, ' ').slice(0, 200) : 'unknown',
    });
  }
  return { entries, rawAvailable: true };
}

// ─────────────────────────────────────────────────────────────────────────
// SSOT promotion log (CANONICAL_HISTORY § 8)
// ─────────────────────────────────────────────────────────────────────────

async function collectSSOTPromotions({ previousTimestamp }) {
  if (!existsSync(CANONICAL_HISTORY)) {
    return { promotions: [], latestVersion: null, rawAvailable: false };
  }
  const raw = await readFile(CANONICAL_HISTORY, 'utf8');
  // Locate SECTION 8 SSOT PROMOTION LOG, then parse entries.
  const idx = raw.indexOf('SECTION 8 — SSOT PROMOTION LOG');
  if (idx === -1) {
    return { promotions: [], latestVersion: null, rawAvailable: true };
  }
  const section = raw.slice(idx);
  const entryRe = /ENTRY\s+(\d+)\s+—\s+(\d{4}-\d{2}-\d{2})\s+—\s+([^\n]+)/g;
  const promotions = [];
  let m;
  while ((m = entryRe.exec(section)) !== null) {
    promotions.push({ id: m[1], date: m[2], title: m[3].trim() });
  }
  promotions.sort((a, b) => (a.date < b.date ? 1 : -1));
  const latestVersion = promotions[0]
    ? `${promotions[0].date} — ENTRY ${promotions[0].id}: ${promotions[0].title}`
    : null;
  // Filter promotions that landed after the marker timestamp.
  let promotionsSinceMarker = promotions;
  if (previousTimestamp) {
    const cutoff = previousTimestamp.slice(0, 10); // YYYY-MM-DD
    promotionsSinceMarker = promotions.filter((p) => p.date > cutoff);
  }
  return { promotions: promotionsSinceMarker, latestVersion, rawAvailable: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Recent Panel consultations
// ─────────────────────────────────────────────────────────────────────────

async function collectRecentPanelVerdicts() {
  if (!existsSync(PANEL_DIR)) return { items: [], rawAvailable: false };
  const files = await readdir(PANEL_DIR);
  const mdFiles = files.filter((f) => f.endsWith('.md'));
  const now = Date.now();
  const items = [];
  for (const f of mdFiles) {
    const p = path.join(PANEL_DIR, f);
    const st = await stat(p).catch(() => null);
    if (!st) continue;
    if (now - st.mtimeMs > SEVEN_DAYS_MS) continue;
    const raw = await readFile(p, 'utf8').catch(() => '');
    items.push({
      file: f,
      path: p,
      mtime: st.mtime.toISOString(),
      verdict: extractVerdict(raw),
      supermajority: extractSupermajority(raw),
      softSignals: extractSoftSignals(raw),
      needsCEODisposition: /(MG2|CEO disposition|needs CEO direction|CEO must)/i.test(raw),
    });
  }
  items.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  return { items, rawAvailable: true };
}

function extractVerdict(raw) {
  // Try to pull a top-line verdict from common patterns we use in W5b consults.
  const m1 = raw.match(/aggregate[_ ]verdict[^\n]*[:=]\s*([A-Z_]+)/i);
  if (m1) return m1[1].toUpperCase();
  const m2 = raw.match(/^\*\*Status:\*\*\s*([^\n]+)/m);
  if (m2) return m2[1].trim().slice(0, 60);
  // Look for the highest-letter answer mentioned with "supermajority"
  const m3 = raw.match(/supermajority[^\n]*→\s*\(([abc])\)/i);
  if (m3) return `supermajority (${m3[1]})`;
  return 'see doc';
}

function extractSupermajority(raw) {
  const m = raw.match(/(\d+) of (\d+) ENGAGED/);
  if (!m) return null;
  const got = parseInt(m[1], 10);
  const total = parseInt(m[2], 10);
  return { got, total, hit: total > 0 && got / total >= 0.7 };
}

function extractSoftSignals(raw) {
  // Pull explicit soft-signal flags surfaced in the synthesis sections.
  const flags = [];
  const lines = raw.split(/\r?\n/);
  for (const ln of lines) {
    if (/⚠.*Low engagement|soft.?signal|engagement floor/i.test(ln) && ln.length < 200) {
      flags.push(ln.trim().slice(0, 160));
    }
  }
  return flags.slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────
// Deployed FlowAI health (api/version + bypass)
// ─────────────────────────────────────────────────────────────────────────

async function getBypassSecret() {
  // Prefer process.env (set by `doppler run --`) so this stays clean in CI.
  if (typeof process.env.VERCEL_AUTOMATION_BYPASS_SECRET === 'string'
      && process.env.VERCEL_AUTOMATION_BYPASS_SECRET.length > 10) {
    return process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  // Fall back to a one-shot doppler probe — names only, secret kept in memory.
  try {
    const { stdout } = await execFileP('doppler', [
      'secrets', 'get', 'VERCEL_AUTOMATION_BYPASS_SECRET',
      '--project', 'flowai', '--config', 'prd', '--plain',
    ], { timeout: 8_000 });
    const v = stdout.trim();
    return v.length >= 10 ? v : null;
  } catch {
    return null;
  }
}

async function collectDeployedHealth() {
  const url = `${DEPLOYED_URL}${VERSION_PATH}`;
  const bypass = await getBypassSecret();
  const headers = { 'accept': 'application/json' };
  if (bypass) headers['x-vercel-protection-bypass'] = bypass;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: ac.signal });
    const text = await res.text();
    if (!res.ok) {
      return { liveUrl: DEPLOYED_URL, status: 'DEGRADED', reasons: [`HTTP ${res.status}`], commit: null, featureFlagSummary: null, raw: text.slice(0, 200) };
    }
    let body = null;
    try { body = JSON.parse(text); } catch { /* leave null */ }
    const commit = body?.deployment?.commit ?? body?.runtime?.commit ?? null;
    const featureFlags = body?.featureFlags ?? body?.runtime?.featureFlags ?? null;
    // Render flags as boolean-name string only — names, not values.
    let featureFlagSummary = null;
    if (featureFlags && typeof featureFlags === 'object') {
      const onFlags = [];
      const offFlags = [];
      for (const [k, v] of Object.entries(featureFlags)) {
        if (v === true) onFlags.push(k);
        else if (v === false) offFlags.push(k);
      }
      featureFlagSummary = `${onFlags.length} on, ${offFlags.length} off (on: ${onFlags.slice(0, 6).join(', ') || 'none'})`;
    }
    return {
      liveUrl: DEPLOYED_URL,
      status: 'PASS',
      reasons: [],
      commit: commit ? String(commit).slice(0, 8) : null,
      featureFlagSummary,
      raw: null,
    };
  } catch (e) {
    return { liveUrl: DEPLOYED_URL, status: 'DEGRADED', reasons: [`probe failed: ${e?.message ?? e}`], commit: null, featureFlagSummary: null, raw: null };
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Lock state (in-flight worker)
// ─────────────────────────────────────────────────────────────────────────

async function collectInFlightLock() {
  const lock = await inspectLock();
  if (!lock) return null;
  const ageS = Math.round(lock.ageMs / 1000);
  return {
    owner: lock.owner,
    ts: lock.ts,
    ageSeconds: ageS,
    stale: lock.stale,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Recent commits (since marker, or last 24h on first run)
// ─────────────────────────────────────────────────────────────────────────

async function collectRecentCommits({ isFirstRun, previousCommit, previousTimestamp }) {
  // Range: marker..HEAD if we have one; otherwise --since=24h.
  let args;
  if (!isFirstRun && previousCommit) {
    args = ['log', `${previousCommit}..HEAD`, '--pretty=format:%h|||%s|||%an|||%cr'];
  } else if (previousTimestamp) {
    args = ['log', `--since=${previousTimestamp}`, '--pretty=format:%h|||%s|||%an|||%cr'];
  } else {
    args = ['log', '--since=24 hours ago', '--pretty=format:%h|||%s|||%an|||%cr'];
  }
  try {
    const { stdout } = await execFileP('git', args, { cwd: REPO_ROOT, timeout: 8_000, maxBuffer: 4 * 1024 * 1024 });
    if (!stdout.trim()) return [];
    return stdout.trim().split(/\r?\n/).map((ln) => {
      const [hash, subject, author, relativeTime] = ln.split('|||');
      return { hash, subject: subject || '', author: author || '', relativeTime: relativeTime || '' };
    });
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────
// HEAD commit + repo state
// ─────────────────────────────────────────────────────────────────────────

async function getHeadCommit() {
  try {
    const { stdout } = await execFileP('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, timeout: 5_000 });
    return stdout.trim();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Outstanding CEO decisions
// ─────────────────────────────────────────────────────────────────────────

function buildOutstandingDecisions(parkingLot, panelVerdicts) {
  const items = [];
  // 1. Parking-lot entries with NEW disposition.
  for (const e of parkingLot.entries) {
    if (/^NEW/i.test(e.disposition)) {
      items.push({
        kind: 'parking-lot',
        ref: `ENTRY ${e.id}`,
        oneLiner: e.description.slice(0, 160) + (e.description.length > 160 ? '…' : ''),
      });
    }
  }
  // 2. Recent panel verdicts flagged needsCEODisposition.
  for (const v of panelVerdicts.items) {
    if (v.needsCEODisposition) {
      items.push({
        kind: 'panel',
        ref: v.file.replace(/\.md$/, ''),
        oneLiner: `verdict ${v.verdict}${v.supermajority?.hit ? ' (supermajority)' : ''} — needs CEO disposition`,
      });
    }
  }
  return items.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────────────
// Top-level collect()
// ─────────────────────────────────────────────────────────────────────────

export async function collect() {
  const now = new Date();
  const marker = await readMarker();
  const [parkingLot, ssotPromotions, panelVerdicts, deployedHealth, inFlightLock, recentCommits, headCommit] =
    await Promise.all([
      collectParkingLot(),
      collectSSOTPromotions(marker),
      collectRecentPanelVerdicts(),
      collectDeployedHealth(),
      collectInFlightLock(),
      collectRecentCommits(marker),
      getHeadCommit(),
    ]);
  const outstandingDecisions = buildOutstandingDecisions(parkingLot, panelVerdicts);
  return {
    date: now.toISOString().slice(0, 10),
    ts: now.toISOString(),
    marker,
    parkingLot,
    ssotPromotions,
    panelVerdicts,
    deployedHealth,
    inFlightLock,
    recentCommits,
    headCommit,
    outstandingDecisions,
  };
}
