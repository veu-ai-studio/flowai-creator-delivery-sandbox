// Structured logger backed by Axiom (https://axiom.co) with a console
// fallback when AXIOM_TOKEN / AXIOM_DATASET are missing.
//
// Env:
//   AXIOM_TOKEN          — Axiom API token
//   AXIOM_DATASET        — dataset name (e.g. 'flowai-prod')
//   AXIOM_DRY_RUN        — 'true' to skip transmit + only console.log
//   LOG_LEVEL            — 'debug' | 'info' | 'warn' | 'error' (default 'info')
//
// All logs include the multi-tenant fields:
//   { ts, level, msg, orgId, productId, runId, stepNumber, durationMs, costUSD,
//     endpoint, ...extra }
//
// Usage:
//   import { logger } from './logger.js';
//   logger.info('step.completed', { orgId, productId, runId, stepNumber: 4, durationMs: 1820, costUSD: 0.012 });
//   logger.error('claude.failed', { orgId, runId, error: e.message });

// Axiom SDK is lazy-loaded so importing this module never crashes at cold
// start, even if the package fails to resolve (graceful console fallback).

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

let cached = null;
let loadAttempted = false;

async function getAxiom() {
  if (cached !== null) return cached;
  if (loadAttempted) return cached; // already tried
  loadAttempted = true;
  if (!process.env.AXIOM_TOKEN || !process.env.AXIOM_DATASET) {
    cached = false;
    return false;
  }
  try {
    const mod = await import('@axiomhq/js');
    const Axiom = mod.Axiom || mod.default;
    cached = new Axiom({ token: process.env.AXIOM_TOKEN });
  } catch (e) {
    console.warn('[logger] Axiom init failed:', e.message);
    cached = false;
  }
  return cached;
}

function activeLevel() {
  return LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] || LEVELS.info;
}

function shouldLog(level) {
  return (LEVELS[level] || LEVELS.info) >= activeLevel();
}

function buildEntry(level, msg, fields = {}) {
  return {
    _time: new Date().toISOString(),
    level,
    msg,
    service: 'flowai-api',
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    deployment: process.env.VERCEL_URL || null,
    // Multi-tenant fields — pulled out for searchability.
    orgId: fields.orgId ?? null,
    productId: fields.productId ?? null,
    runId: fields.runId ?? fields.sessionId ?? null,
    stepNumber: fields.stepNumber ?? null,
    durationMs: fields.durationMs ?? null,
    costUSD: fields.costUSD ?? null,
    endpoint: fields.endpoint ?? null,
    ...fields,
  };
}

function emit(level, msg, fields = {}) {
  if (!shouldLog(level)) return;
  const entry = buildEntry(level, msg, fields);

  // Always console.log so Vercel function logs still see it.
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleFn(`[${level}] ${msg}`, JSON.stringify({ orgId: entry.orgId, runId: entry.runId, durationMs: entry.durationMs, costUSD: entry.costUSD, ...(fields.error ? { error: fields.error } : {}) }));

  if (process.env.AXIOM_DRY_RUN === 'true') return;
  // Fire-and-forget Axiom ingest. Never throws into the request path.
  getAxiom().then((ax) => {
    if (!ax) return;
    try { ax.ingest(process.env.AXIOM_DATASET, [entry]); }
    catch (_) { /* swallow */ }
  }).catch(() => {});
}

export const logger = {
  debug: (msg, fields) => emit('debug', msg, fields),
  info:  (msg, fields) => emit('info',  msg, fields),
  warn:  (msg, fields) => emit('warn',  msg, fields),
  error: (msg, fields) => emit('error', msg, fields),
};

// Used in graceful shutdown / before serverless function returns to ensure
// queued events flush. Safe to await even if Axiom isn't configured.
export async function flushLogs() {
  const ax = await getAxiom();
  if (!ax) return;
  try { await ax.flush(); } catch {}
}

// Exposed so callers can branch on whether logging is wired (e.g. the
// orchestrator health endpoint).
export function isAxiomConfigured() {
  return Boolean(process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET);
}
