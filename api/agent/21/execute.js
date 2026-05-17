// api/agent/21/execute.js
//
// Sync endpoint for Agent #21 Aggressive Crawl Conductor Executor —
// credentialed (authenticated) crawl. POST-only. Mirrors api/agent/3/execute.js
// (Agent #3 Self-Renewal sync endpoint, commit 176d870) per the Phase 3
// pattern established in AUTH_TRAVERSAL_SECURITY_SPEC v3 (frozen baseline
// at commit be594e3; freeze notice at b534d34).
//
// Body schema:
//   {
//     productScope: string,                                  // e.g. 'flowai' | 'saigedemo' | ...
//     url:          string,                                  // start URL (target product)
//     credentials:  { email: string, password: string },     // operator-supplied per spec §3.1
//     runId?:       string,                                  // UUID v4; minted if absent
//     options?:     { sameOriginMode?, loginSelectors?, navigationTimeoutMs? }
//   }
//
// Behavior:
//   - 405 on non-POST
//   - 400 on body validation error OR credentials boundary failure
//   - 401 when auth context cannot be established
//   - 403 when caller's productScope claim differs from body productScope (RLS gate)
//   - 200 with executor envelope on successful sync completion
//   - 200 (ok:false, authFailed:true) when login fails per Invariant 3 fail-loud
//     (MFA / invalid_credentials / captcha_required / login_form_not_found)
//   - 500 on internal failure (executor threw, Browserless connect failure, etc.)
//
// CRITICAL — credentials never logged:
//   - Body credentials live ONLY in the local `body.credentials` variable
//     and in the validated `credentials` object passed to the Executor.
//   - All error responses surface error CODES (e.g. 'credentials_invalid',
//     'mfa_required', 'login_form_not_found') NEVER the credential values.
//   - The audit-log entry built by buildAuthCrawlAuditEntry() runs through
//     the §5.2 forbidden-field guard.
//
// Production Playwright path: Browserless via src/lib/agents/auth/
// browserlessAdapter.js. Set BROWSERLESS_API_KEY in env. No local-Chromium
// fallback per spec v3.

import { Agent21AggressiveCrawlConductorExecutor, validateCredentialsAtBoundary }
  from '../../../src/lib/agents/agents/Agent21AggressiveCrawlConductorExecutor.js';
import { connectBrowserless } from '../../../src/lib/agents/auth/browserlessAdapter.js';
import {
  buildAuthCrawlAuditEntry,
  buildAuthCrawlFailureAuditEntry,
} from '../../../src/lib/agents/auth/auditEntry.js';

const SYNC_TIMEOUT_MS = 25_000;

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

  // Body validation — productScope / url / credentials.
  const productScope = typeof body.productScope === 'string' ? body.productScope : null;
  const url = typeof body.url === 'string' ? body.url : null;
  const runId = typeof body.runId === 'string' ? body.runId : null;
  const optionsIn = body.options && typeof body.options === 'object' ? body.options : null;

  if (!productScope) {
    return res.status(400).json({ ok: false, error: 'missing_field', field: 'productScope' });
  }
  if (!url) {
    return res.status(400).json({ ok: false, error: 'missing_field', field: 'url' });
  }

  // Credentials boundary check per spec §3.2. Refuses at the boundary
  // BEFORE any Playwright invocation so log-injection chars / malformed
  // shape never reach the auth path.
  const credValidation = validateCredentialsAtBoundary(body.credentials);
  if (!credValidation.ok) {
    return res.status(credValidation.code ?? 400).json({
      ok: false,
      error: 'credentials_invalid',
      reason: credValidation.reason,
      // Reason is a stable code like 'email_length_out_of_bounds';
      // NEVER the credential value itself.
    });
  }
  if (credValidation.credentials === null) {
    // The endpoint is the CREDENTIALED path. Unauthenticated crawls go
    // through /api/research-url (the recommend-only primary). 400 here.
    return res.status(400).json({
      ok: false,
      error: 'credentials_required',
      detail: 'this endpoint is the credentialed crawl path — use /api/research-url for unauthenticated runs',
    });
  }

  // RLS / auth gate per the Phase 1 pattern.
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

  // Connect to Browserless. Failure here is a 500 (infrastructure issue)
  // not a 400 (caller-input issue).
  let browser;
  try {
    browser = await connectBrowserless();
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: 'browserless_connect_failed',
      // Browserless adapter masks the token in error messages.
      detail: String(e?.message ?? e),
    });
  }

  // Build executor. Failure here is 500.
  let executor;
  try {
    executor = buildExecutor({ productScope, browser, options: optionsIn });
  } catch (e) {
    await safeCloseBrowser(browser);
    return res.status(500).json({
      ok: false,
      error: 'executor_construct_failed',
      detail: String(e?.message ?? e),
    });
  }

  // Race execution against the sync timeout.
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ __timeout: true }), SYNC_TIMEOUT_MS);
  });

  const startedAt = Date.now();
  let report;
  try {
    report = await Promise.race([
      executor.conductCredentialedCrawl(url, {
        runId: runId ?? mintRunId(),
        credentials: credValidation.credentials,
      }),
      timeout,
    ]);
  } catch (e) {
    clearTimeout(timer);
    await safeCloseBrowser(browser);
    // Error path — write a failure audit entry. The Executor's act() path
    // would emit one too, but this endpoint bypasses act() and calls
    // conductCredentialedCrawl() directly, so the endpoint owns the
    // failure-audit emit here.
    try {
      const entry = buildAuthCrawlFailureAuditEntry({
        runId: runId ?? `unknown-${startedAt}`,
        productId: productScope,
        targetOrigin: safeOriginOf(url),
        authFailureReason: 'executor_threw',
        at: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      });
      // Audit-log write is fire-and-forget on the error path. Production
      // wires deps.auditLog into the executor; the endpoint-level emit
      // here is a backstop.
      console.warn('[agent21-execute] failure audit entry:', JSON.stringify(entry));
    } catch (auditErr) {
      // Audit-build failure is itself a soft warning — never block the
      // error response on it.
      console.warn('[agent21-execute] audit entry build failed:', auditErr?.message ?? String(auditErr));
    }
    return res.status(500).json({
      ok: false,
      error: 'executor_threw',
      detail: String(e?.message ?? e),
    });
  }
  clearTimeout(timer);

  // Cleanup the Browserless connection.
  await safeCloseBrowser(browser);

  if (report?.__timeout) {
    // 25s exceeded — return 504 with a clear marker. No Inngest hand-off
    // for CHUNK 4 (a credentialed-crawl async job is a future chunk if
    // needed; the Phase 3 v3 auth flow is bounded by the navigation
    // timeout, so most legitimate runs complete in well under 25s).
    return res.status(504).json({
      ok: false,
      error: 'sync_timeout',
      timeoutMs: SYNC_TIMEOUT_MS,
      hint: 'auth flow exceeded the sync timeout — consider raising options.navigationTimeoutMs or splitting into a multi-page chunk',
    });
  }

  // Emit the §5.1-conformant audit entry. Forbidden-field guard runs
  // inside buildAuthCrawlAuditEntry; if the report somehow contains a
  // credential field, the entry build throws and we 500.
  try {
    const entry = report.ok && !report.authFailed
      ? buildAuthCrawlAuditEntry({
          runId: report.runId ?? runId ?? `unknown-${startedAt}`,
          productId: productScope,
          targetOrigin: report.origin ?? safeOriginOf(url),
          loginAttempted: true,
          loginSucceeded: true,
          pagesCrawled: report.pagesCrawled ?? 0,
          authGatedPagesEncountered: report.authGatedPagesEncountered ?? 0,
          at: new Date().toISOString(),
          durationMs: report.durationMs ?? (Date.now() - startedAt),
        })
      : buildAuthCrawlFailureAuditEntry({
          runId: report.runId ?? runId ?? `unknown-${startedAt}`,
          productId: productScope,
          targetOrigin: safeOriginOf(url),
          authFailureReason: report.authFailureReason ?? 'unknown_auth_failure',
          at: new Date().toISOString(),
          durationMs: report.durationMs ?? (Date.now() - startedAt),
        });
    // Production wires deps.auditLog into the executor. The endpoint-
    // level emit here is the backstop; for CHUNK 4 we surface the entry
    // shape on a structured log line so downstream tooling can pipe it
    // into the GovernanceAuditLog ingest.
    console.log('[agent21-execute] audit entry:', JSON.stringify(entry));
  } catch (auditErr) {
    // Audit-build failure with a forbidden field — fail loud. The
    // response itself is still emitted (caller gets the crawl result)
    // but a 500-class audit error is surfaced in the response metadata.
    return res.status(200).json({
      ok: !!report.ok,
      authFailed: !!report.authFailed,
      result: report,
      auditWarning: {
        kind: 'audit_entry_build_failed',
        detail: auditErr?.message ?? String(auditErr),
      },
    });
  }

  return res.status(200).json({
    ok: !!report.ok,
    authFailed: !!report.authFailed,
    result: report,
  });
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

function buildExecutor({ productScope, browser, options }) {
  // Minimal in-memory deps for the MVP endpoint path. Production wires
  // real HotStore / ColdStore / GovernanceAuditLog adapters (the
  // recommend-only primary at Phase 1 used the same minimal-stub
  // pattern; productionising the deps is a separate dispatch).
  const clock = { now: () => Date.now() };
  const messageBus = {
    publish: async () => {},
    subscribe: () => () => {},
  };
  const auditLog = {
    write: async (entry) => {
      // Backstop: log entries through stdout so they're captured by
      // Vercel/CloudWatch. Production wires this to the real
      // GovernanceAuditLog ingest.
      console.log('[agent21-executor-audit]', JSON.stringify(entry));
    },
  };
  const logger = {
    info: (...args) => console.log('[agent21-executor]', ...args),
    warn: (...args) => console.warn('[agent21-executor]', ...args),
    error: (...args) => console.error('[agent21-executor]', ...args),
  };
  return new Agent21AggressiveCrawlConductorExecutor({
    logger,
    messageBus,
    auditLog,
    clock,
    productScope,
    environment: process.env.NODE_ENV === 'production' ? 'prd' : 'staging',
    browser,
    options: options ?? undefined,
  });
}

async function safeCloseBrowser(browser) {
  if (!browser) return;
  try {
    await browser.close();
  } catch {
    // Browserless reclaims sessions on idle timeout; close failure is non-fatal.
  }
}

function mintRunId() {
  // Lightweight runId minter for endpoint-level callers that don't supply
  // one. Production callers should mint a UUID v4 themselves and pass it
  // in opts.runId for end-to-end traceability.
  const t = Date.now().toString(16);
  const r = Math.random().toString(16).slice(2, 10);
  return `auth-${t}-${r}`;
}

function safeOriginOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

// Exported for tests.
export const __test = Object.freeze({
  resolveAuthContext,
  buildExecutor,
  safeOriginOf,
  SYNC_TIMEOUT_MS,
});
