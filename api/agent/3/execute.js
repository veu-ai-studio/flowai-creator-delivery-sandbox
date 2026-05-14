// api/agent/3/execute.js
//
// Sync endpoint for Agent #3 Self-Renewal Executor (Path X MVP per
// CEO disposition Q4 = (c) combined). POST-only.
//
// Body schema:
//   {
//     productScope: string,   // e.g. 'flowai' | 'saige' | 'reltwin' ...
//     issue:        object,   // W2.Issue per api/_lib/issueDetector.js
//     mode:         'recommend_only' | 'fork_and_fix',
//     runId?:       string,
//     sourceHints?: object,
//   }
//
// Behavior:
//   - 405 on non-POST
//   - 400 on body validation error
//   - 401 when auth context cannot be established
//   - 403 when caller's productScope claim differs from body productScope (RLS gate
//     per Rev-2.1 §13). Same body+claim matching pattern used by all multi-tenant
//     endpoints.
//   - 200 with executor envelope on synchronous completion
//   - 202 with { jobId, async: true } when:
//       (a) execution exceeds 25s (returns control to client; Inngest job
//           continues in background and emits agent.deploy progress events), OR
//       (b) Inngest is enabled AND body explicitly requested async via
//           ?async=1 query param.
//   - 500 on internal failure (executor threw)
//
// RLS (Rev-2.1 §13): caller's authenticated productScope MUST match the body's
// productScope. The MVP auth model accepts either:
//   - x-flowai-internal: true + Authorization: Bearer ${FLOWAI_INTERNAL_SECRET}
//     for AutoRunner self-calls (trust internal callers)
//   - x-product-scope header matching body productScope for end-user calls
// JWT/Supabase decoding is a Production Hardening track item — out of MVP scope.

import { Agent3SelfRenewalExecutor } from '../../../src/lib/agents/agents/Agent3SelfRenewalExecutor.js';

const SYNC_TIMEOUT_MS = 25_000;
const ALLOWED_MODES = new Set(['recommend_only', 'fork_and_fix']);

export default async function handler(req, res) {
  // Method gate.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'invalid_json', detail: String(e?.message ?? e) });
  }

  // Body validation.
  const productScope = typeof body.productScope === 'string' ? body.productScope : null;
  const issue = body.issue && typeof body.issue === 'object' ? body.issue : null;
  const mode = typeof body.mode === 'string' ? body.mode : 'recommend_only';
  const runId = typeof body.runId === 'string' ? body.runId : null;
  const sourceHints = body.sourceHints && typeof body.sourceHints === 'object' ? body.sourceHints : null;

  if (!productScope) {
    return res.status(400).json({ ok: false, error: 'missing_field', field: 'productScope' });
  }
  if (!issue) {
    return res.status(400).json({ ok: false, error: 'missing_field', field: 'issue' });
  }
  if (!ALLOWED_MODES.has(mode)) {
    return res.status(400).json({ ok: false, error: 'invalid_mode', allowed: [...ALLOWED_MODES] });
  }
  if (typeof issue.severity !== 'string' || !['critical', 'high', 'medium'].includes(issue.severity)) {
    return res.status(400).json({
      ok: false, error: 'invalid_issue_severity',
      allowed: ['critical', 'high', 'medium'],
    });
  }

  // RLS / auth gate.
  const auth = resolveAuthContext(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }
  if (!auth.internal && auth.productScope !== productScope) {
    return res.status(403).json({
      ok: false,
      error: 'productScope_mismatch',
      detail: 'caller authenticated productScope differs from body productScope',
    });
  }

  // Async hand-off requested explicitly?
  const wantAsync = req.query?.async === '1' || req.query?.async === 1;
  if (wantAsync) {
    const enqueued = await tryEnqueueInngest({ productScope, issue, mode, runId, sourceHints });
    if (enqueued.ok) {
      return res.status(202).json({
        ok: true, async: true, jobId: enqueued.jobId, hint: 'poll status via /api/agent/3/status?jobId=<id>',
      });
    }
    // Fall through to sync if Inngest disabled — the caller still wanted async
    // but we can't queue, so we serve sync with a marker.
  }

  // Construct executor with stub deps for the MVP path. Production wiring
  // replaces these stubs with real HotStore / ColdStore / MessageBus
  // instances bound to Supabase + Redis.
  let executor;
  try {
    executor = buildExecutor({ productScope });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'executor_construct_failed', detail: String(e?.message ?? e) });
  }

  // Race execution against the sync timeout. If we exceed 25s, enqueue
  // Inngest to continue in background and return 202.
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ __timeout: true }), SYNC_TIMEOUT_MS);
  });

  let result;
  try {
    result = await Promise.race([
      executor.executeRemediation(issue, mode, { productScope, runId, sourceHints }),
      timeout,
    ]);
  } catch (e) {
    clearTimeout(timer);
    return res.status(500).json({ ok: false, error: 'executor_threw', detail: String(e?.message ?? e) });
  }
  clearTimeout(timer);

  if (result?.__timeout) {
    // Hand off to Inngest if available; otherwise tell the client to retry async.
    const enqueued = await tryEnqueueInngest({ productScope, issue, mode, runId, sourceHints });
    if (enqueued.ok) {
      return res.status(202).json({
        ok: true, async: true, timedOutSync: true, jobId: enqueued.jobId,
        hint: 'sync exceeded 25s — job continues via Inngest. Poll /api/agent/3/status?jobId=<id>',
      });
    }
    return res.status(202).json({
      ok: true, async: true, timedOutSync: true, queued: false,
      hint: 'sync exceeded 25s and Inngest is not configured — retry with ?async=1 when Inngest is wired',
    });
  }

  return res.status(200).json({ ok: true, async: false, result });
}

// ── Internals ────────────────────────────────────────────────────────────────

function resolveAuthContext(req) {
  const internalMarker = req.headers?.['x-flowai-internal'];
  const authzHeader = req.headers?.authorization ?? '';
  if (internalMarker === 'true' || internalMarker === '1') {
    const expected = process.env.FLOWAI_INTERNAL_SECRET ?? '';
    const presented = authzHeader.replace(/^Bearer\s+/i, '');
    if (expected && presented === expected) {
      return { ok: true, internal: true, productScope: '*' };
    }
    return { ok: false, status: 401, error: 'internal_auth_failed' };
  }
  const scopeHeader = req.headers?.['x-product-scope'];
  if (typeof scopeHeader === 'string' && scopeHeader.length > 0) {
    return { ok: true, internal: false, productScope: scopeHeader };
  }
  return { ok: false, status: 401, error: 'no_auth_context' };
}

function buildExecutor({ productScope }) {
  // Minimal in-memory deps for MVP. Production replaces these with real
  // adapters bound to Supabase + Redis + Orchestra.
  const clock = { now: () => Date.now() };
  const _hotMap = new Map();
  const hot = {
    get: async (k) => _hotMap.get(k),
    set: async (k, v) => { _hotMap.set(k, v); return v; },
    delete: async (k) => { _hotMap.delete(k); },
  };
  const cold = {
    append: async () => {},
    list: async () => [],
  };
  const messageBus = {
    publish: async () => {},
    subscribe: () => () => {},
  };
  const auditLog = {
    write: async () => {},
  };
  const logger = {
    info: (...args) => console.log('[agent3-executor]', ...args),
    warn: (...args) => console.warn('[agent3-executor]', ...args),
    error: (...args) => console.error('[agent3-executor]', ...args),
  };

  return new Agent3SelfRenewalExecutor({
    logger,
    messageBus,
    auditLog,
    clock,
    productScope,
    environment: process.env.NODE_ENV === 'production' ? 'prd' : 'staging',
    hot,
    cold,
    // remediationEngine + verificationAdapters wired lazily so the recommend_only
    // path works without those imports being resolved. fork_and_fix that hits the
    // wire-up gap returns ok:false outcome:'remediation_unavailable' rather than
    // crashing.
  });
}

async function tryEnqueueInngest({ productScope, issue, mode, runId, sourceHints }) {
  try {
    const { sendEvent, isInngestEnabled } = await import('../../_lib/inngest.js');
    if (!isInngestEnabled()) {
      return { ok: false, reason: 'inngest_disabled' };
    }
    const jobId = `agent3_${productScope}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await sendEvent('flowai/agent3.renewal.requested', {
      jobId, productScope, issue, mode, runId, sourceHints,
    });
    if (!result?.ok) {
      return { ok: false, reason: result?.reason ?? 'send_failed' };
    }
    return { ok: true, jobId };
  } catch (e) {
    return { ok: false, reason: String(e?.message ?? e) };
  }
}

// Exported for tests — the handler closure isn't easily testable otherwise.
export const __test = Object.freeze({
  resolveAuthContext,
  buildExecutor,
  SYNC_TIMEOUT_MS,
  ALLOWED_MODES,
});
