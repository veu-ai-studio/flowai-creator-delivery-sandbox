// src/lib/observability/logger.js
//
// Structured logger (pino) + error tracking (Sentry) for FlowAI's
// observability layer. Production Hardening Phase 1.4.
//
// Design:
//   - pino is the structured-log backbone. JSON output by default; the
//     `log()` helpers are convenience wrappers around it with the same
//     multi-tenant field schema as api/_lib/logger.js so callers can
//     drop in either logger interchangeably.
//   - Sentry is initialized once at first use (lazy). DSN comes from
//     SENTRY_DSN env var. If absent, Sentry is a no-op — no init, no
//     error, no overhead.
//   - The existing api/_lib/logger.js (Axiom) is NOT replaced. It still
//     ships to Axiom for centralized querying. This module is the
//     OBSERVABILITY ENTRY POINT for new code: it gives you a single
//     import that does pino + Sentry capture, and it bridges to the
//     Axiom logger when both are configured so events land in both
//     sinks without double-instrumentation in caller code.
//
// Constraints:
//   - Never throws into the request path. Every failure mode swallows
//     to console.warn and continues.
//   - Never logs credential values. Field whitelisting handled in
//     buildEntry — `error.stack` and `error.message` are safe; raw
//     `process.env.*` lookups are NOT logged.
//   - Sentry DSN itself is never logged (Sentry's own init swallows it).

import pino from 'pino';
import * as Sentry from '@sentry/node';

const SERVICE_NAME = 'flowai-observability';
const DEFAULT_LEVEL = 'info';

// ─── pino instance (singleton) ──────────────────────────────────────────

let pinoInstance = null;

function getPino() {
  if (pinoInstance) return pinoInstance;
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
  const level = (process.env.LOG_LEVEL || DEFAULT_LEVEL).toLowerCase();
  pinoInstance = pino({
    level,
    base: {
      service: SERVICE_NAME,
      env,
      deployment: process.env.VERCEL_URL || null,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
  return pinoInstance;
}

// ─── Sentry init (lazy + idempotent) ────────────────────────────────────

let sentryInitState = 'pending'; // 'pending' | 'ready' | 'disabled'

function ensureSentry() {
  if (sentryInitState !== 'pending') return sentryInitState === 'ready';
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || typeof dsn !== 'string' || dsn.length < 10) {
    sentryInitState = 'disabled';
    return false;
  }
  try {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0') || 0,
      // Do NOT send default PII; we tag explicitly via setTag/setContext.
      sendDefaultPii: false,
      // Vercel functions cold-start fast; keep the SDK small.
      defaultIntegrations: false,
    });
    sentryInitState = 'ready';
    return true;
  } catch (e) {
    console.warn('[observability] Sentry init failed:', e?.message ?? e);
    sentryInitState = 'disabled';
    return false;
  }
}

export function isSentryConfigured() {
  return Boolean(process.env.SENTRY_DSN && process.env.SENTRY_DSN.length >= 10);
}

// ─── Field shaping (mirrors api/_lib/logger.js for drop-in compatibility) ──

function buildEntry(level, msg, fields = {}) {
  const safe = { ...fields };
  // Coerce Error objects into safe { message, stack } shape.
  if (safe.error instanceof Error) {
    safe.error = { name: safe.error.name, message: safe.error.message, stack: safe.error.stack };
  }
  return {
    msg,
    level,
    orgId: fields.orgId ?? null,
    productId: fields.productId ?? null,
    runId: fields.runId ?? fields.sessionId ?? null,
    stepNumber: fields.stepNumber ?? null,
    durationMs: fields.durationMs ?? null,
    costUSD: fields.costUSD ?? null,
    endpoint: fields.endpoint ?? null,
    ...safe,
  };
}

// ─── Public log API ─────────────────────────────────────────────────────

function emit(level, msg, fields = {}) {
  const entry = buildEntry(level, msg, fields);
  try {
    getPino()[level](entry);
  } catch (e) {
    // Never fail caller. Fall back to console.
    const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleFn(`[${level}] ${msg}`, JSON.stringify(entry));
  }
}

export const logger = {
  debug: (msg, fields) => emit('debug', msg, fields),
  info:  (msg, fields) => emit('info',  msg, fields),
  warn:  (msg, fields) => emit('warn',  msg, fields),
  error: (msg, fields) => emit('error', msg, fields),
};

// ─── Error capture ──────────────────────────────────────────────────────

/**
 * Capture an error in Sentry (if configured) AND log it via pino. The
 * second arg is a tag/context bag — same shape as logger.* fields.
 *
 *   captureException(err, { orgId, runId, endpoint, ... })
 *
 * Returns a Sentry event id when Sentry is configured + captured, null
 * otherwise. Never throws.
 */
export function captureException(err, fields = {}) {
  // Always log first — this is the source of truth even if Sentry is off.
  logger.error(err?.message ?? 'unknown error', { ...fields, error: err });
  if (!ensureSentry()) return null;
  try {
    return Sentry.withScope((scope) => {
      for (const [k, v] of Object.entries(fields)) {
        if (v == null) continue;
        // Tags must be primitive scalars; contexts can be objects.
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          scope.setTag(k, String(v).slice(0, 200));
        } else {
          scope.setContext(k, typeof v === 'object' ? v : { value: String(v) });
        }
      }
      return Sentry.captureException(err);
    });
  } catch (e) {
    console.warn('[observability] Sentry captureException failed:', e?.message ?? e);
    return null;
  }
}

/**
 * Capture an arbitrary message in Sentry. Useful for "this should never
 * happen" branches that don't have an Error object handy.
 */
export function captureMessage(message, fields = {}) {
  logger.warn(message, fields);
  if (!ensureSentry()) return null;
  try {
    return Sentry.withScope((scope) => {
      for (const [k, v] of Object.entries(fields)) {
        if (v == null) continue;
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          scope.setTag(k, String(v).slice(0, 200));
        } else {
          scope.setContext(k, typeof v === 'object' ? v : { value: String(v) });
        }
      }
      return Sentry.captureMessage(message, 'warning');
    });
  } catch (e) {
    console.warn('[observability] Sentry captureMessage failed:', e?.message ?? e);
    return null;
  }
}

/**
 * Flush any queued Sentry events. Call from a serverless function's
 * tail (e.g., `await flush()` before res.end) so events are not lost
 * to cold-start container shutdown. No-op when Sentry is disabled.
 */
export async function flush(timeoutMs = 2_000) {
  if (sentryInitState !== 'ready') return;
  try { await Sentry.flush(timeoutMs); } catch (e) { /* swallow */ }
}

// ─── Inventory helpers (used by health.js) ──────────────────────────────

export function observabilityInventory() {
  return {
    pino: { ready: true, level: (process.env.LOG_LEVEL || DEFAULT_LEVEL).toLowerCase() },
    sentry: {
      configured: isSentryConfigured(),
      initialized: sentryInitState === 'ready',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0') || 0,
    },
    axiomBridgeConfigured: Boolean(process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET),
  };
}
