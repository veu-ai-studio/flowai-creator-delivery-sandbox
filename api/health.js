// GET /api/health — comprehensive readiness probe.
//
// Polled every 30s by FlowAIHealthBadge in the top bar. Wired through
// src/lib/observability/health.js per Production Hardening Phase 1.4.
//
// Returns:
//   {
//     ok, status, service, version, env, region, commit, timestamp,
//     checks: {
//       build:         { status, commit, branch, env, ... },
//       supabase:      { status, httpStatus?, reason? },
//       vercelKv:      { status, httpStatus?, reason? },
//       orchestra:     { members: [...], summary: { live, degraded, ... } },
//       observability: { status, pino, sentry, axiomBridge },
//     }
//   }
//
// HTTP semantics:
//   - 200 OK for PASS  → badge resolves "All Systems Operational"
//   - 200 OK for DEGRADED → badge shows yellow (still reachable; body
//     carries the per-check detail so the dashboard can render reasons)
//   - 503 only when the handler itself fails — never returned for a
//     downstream DEGRADED state, because the badge depends on a 200 to
//     parse the body.
//
// Sensitive secrets are NEVER echoed. Only boolean presence flags +
// short status reasons.

import { runHealthChecks } from '../src/lib/observability/health.js';
import { captureException, flush as flushObservability } from '../src/lib/observability/logger.js';

const APP_VERSION = '1.0.0';

export default async function handler(req, res) {
  // CORS — match the rest of /api/* (echo Origin, allow GET + OPTIONS).
  const origin = req.headers?.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Use GET' });
  }

  try {
    const report = await runHealthChecks();
    const ok = report.status === 'PASS' || report.status === 'DEGRADED';
    const body = {
      ok,
      status: report.status === 'PASS' ? 'ready' : report.status.toLowerCase(),
      service: 'flowai',
      version: APP_VERSION,
      env: report.checks.build.env,
      region: report.checks.build.region,
      commit: report.checks.build.commit,
      timestamp: report.timestamp,
      durationMs: report.durationMs,
      checks: report.checks,
    };
    // Flush observability sinks asynchronously so a slow Sentry transmit
    // doesn't add to the badge response time. Best-effort fire-and-forget.
    flushObservability(500).catch(() => {});
    return res.status(200).json(body);
  } catch (e) {
    // Handler-internal failure (probe set crashed). Surface the error to
    // Sentry/pino and return 503. The badge will go red.
    captureException(e, { endpoint: '/api/health' });
    return res.status(503).json({
      ok: false,
      status: 'error',
      service: 'flowai',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      error: e?.message ?? 'health probe failed',
    });
  }
}
