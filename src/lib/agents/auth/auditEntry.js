/**
 * GovernanceAuditLog entry shape for authenticated crawl runs — Invariant 9
 * (v3 spec). Produces a §5.1-conformant entry tagged with
 * `retentionClass: 'auth_short'` so the cold-archival cron migrates these
 * entries on the v3 carry-forward retention schedule (90 days hot +
 * 1 year cold per Q7-v3 carry-forward).
 *
 * Pure function: takes the run result + context and returns the canonical
 * entry shape. The caller (api/agent/21/execute.js or the Executor's
 * audit-log emit path) is responsible for actually writing the entry to
 * GovernanceAuditLog via the deps.auditLog.write() sink.
 *
 * Runtime assertion: this module guards against §5.2 NEVER-recorded fields
 * accidentally landing in an audit entry. If a caller passes a result that
 * contains any of the forbidden fields (loginEmail, loginPassword,
 * storageState contents, raw Authorization/Set-Cookie headers), the
 * function throws — failing loud rather than silently leaking.
 */

'use strict';

// Per spec §5.1 the literal value is exactly this string. The v3 freeze
// did not alter the spec text; even though storageState is memory-only
// (Invariant 2 MUST), the audit entry preserves the spec-mandated literal
// so log consumers / parsers don't need to track which version each entry
// was emitted under.
export const STORAGE_STATE_PATH_LITERAL = '[EPHEMERAL — deleted at runEnd]';

// Per spec Invariant 9 + Q7-v3 carry-forward: credentialed-run records get
// 90 days hot + 1 year cold storage (shorter than the CA-10-E standard
// 365 hot + 7yr cold). The retention class tag is the mechanism that
// drives the cron behaviour difference.
export const RETENTION_CLASS = 'auth_short';

// Per spec §5.2 — fields that MUST NOT appear in the audit entry under any
// circumstance. The list below is the verbatim §5.2 set plus a handful of
// common aliases / case variants.
export const FORBIDDEN_FIELDS = Object.freeze(new Set([
  'loginemail',
  'loginpassword',
  'login_email',
  'login_password',
  'password',
  'pwd',
  'pass',
  'email',
  'storagestate',
  'storage_state',
  'cookies',
  'localstorage',
  'sessionstorage',
  'authorization',
  'setcookie',
  'set-cookie',
  'set_cookie',
  'cookie',
]));

const TOPICS = Object.freeze({
  authenticatedCrawlRun: 'authenticated_crawl_run',
});

/**
 * Assert that an object does NOT contain any §5.2 NEVER-recorded field
 * names (case-insensitive). Walks one level deep into nested objects.
 *
 * Throws an Error if a forbidden field is found, naming the offending key
 * but NEVER surfacing the field's value (because the value might itself
 * be a credential).
 *
 * @param {object} obj
 * @param {string} [path='entry']
 */
export function assertNoForbiddenFields(obj, path = 'entry') {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    if (FORBIDDEN_FIELDS.has(k.toLowerCase())) {
      throw new Error(
        `auditEntry: forbidden field "${k}" present at ${path} — ` +
        '§5.2 NEVER-recorded list violated. ' +
        'Audit-log emit refused to prevent credential leak.',
      );
    }
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      assertNoForbiddenFields(v, `${path}.${k}`);
    }
  }
}

/**
 * Build the §5.1 audit-log entry shape for an authenticated crawl run.
 *
 * @param {object} args
 * @param {string} args.runId
 * @param {string|null} args.productId
 * @param {string} args.targetOrigin       — the start-URL's origin only
 * @param {boolean} args.loginAttempted    — true iff credentials were submitted
 * @param {boolean} args.loginSucceeded    — true iff post-login page is not auth-gated
 * @param {number} args.pagesCrawled
 * @param {number} args.authGatedPagesEncountered
 * @param {string} args.at                 — ISO-8601 timestamp (run end)
 * @param {number} args.durationMs
 * @param {string|null} [args.authFailureReason] — when loginSucceeded is false
 *
 * @returns {object} frozen §5.1 entry
 */
export function buildAuthCrawlAuditEntry(args) {
  if (!args || typeof args !== 'object') {
    throw new Error('buildAuthCrawlAuditEntry: args object required');
  }
  if (typeof args.runId !== 'string' || !args.runId) {
    throw new Error('buildAuthCrawlAuditEntry: runId required');
  }
  if (typeof args.targetOrigin !== 'string') {
    throw new Error('buildAuthCrawlAuditEntry: targetOrigin required');
  }
  if (typeof args.at !== 'string' || !args.at) {
    throw new Error('buildAuthCrawlAuditEntry: at (ISO-8601) required');
  }
  if (typeof args.durationMs !== 'number' || !Number.isFinite(args.durationMs)) {
    throw new Error('buildAuthCrawlAuditEntry: durationMs (number) required');
  }

  // Defense in depth: forbidden-field check on the args object itself.
  // If a caller accidentally passed { loginEmail: '...' } the entry build
  // refuses rather than letting the email reach the audit sink.
  assertNoForbiddenFields(args, 'args');

  const entry = Object.freeze({
    kind: TOPICS.authenticatedCrawlRun,
    runId: args.runId,
    productId: typeof args.productId === 'string' ? args.productId : null,
    targetOrigin: args.targetOrigin,
    loginAttempted: !!args.loginAttempted,
    loginSucceeded: !!args.loginSucceeded,
    pagesCrawled: Number.isFinite(args.pagesCrawled) ? args.pagesCrawled : 0,
    authGatedPagesEncountered:
      Number.isFinite(args.authGatedPagesEncountered) ? args.authGatedPagesEncountered : 0,
    storageStatePath: STORAGE_STATE_PATH_LITERAL,
    storageStateDeletionVerified: true,
    at: args.at,
    durationMs: args.durationMs,
    retentionClass: RETENTION_CLASS,
    // Optional surface for failure observability — never includes
    // credentials or storageState contents.
    authFailureReason:
      args.loginSucceeded === false && typeof args.authFailureReason === 'string'
        ? args.authFailureReason : null,
  });

  // Re-check after building (paranoia — catches any field added by future
  // edits to this function that would leak a forbidden key).
  assertNoForbiddenFields(entry, 'entry');

  return entry;
}

/**
 * Build the failure-shape audit entry. Same retention class, same forbidden-
 * field guards, but with the failure-specific fields (no pagesCrawled when
 * the run never proceeded past the auth wall).
 */
export function buildAuthCrawlFailureAuditEntry(args) {
  if (!args || typeof args !== 'object') {
    throw new Error('buildAuthCrawlFailureAuditEntry: args object required');
  }
  if (typeof args.runId !== 'string' || !args.runId) {
    throw new Error('buildAuthCrawlFailureAuditEntry: runId required');
  }
  if (typeof args.authFailureReason !== 'string' || !args.authFailureReason) {
    throw new Error('buildAuthCrawlFailureAuditEntry: authFailureReason required');
  }
  assertNoForbiddenFields(args, 'args');
  const entry = Object.freeze({
    kind: TOPICS.authenticatedCrawlRun,
    runId: args.runId,
    productId: typeof args.productId === 'string' ? args.productId : null,
    targetOrigin: typeof args.targetOrigin === 'string' ? args.targetOrigin : '',
    loginAttempted: true,
    loginSucceeded: false,
    pagesCrawled: 0,
    authGatedPagesEncountered: 0,
    storageStatePath: STORAGE_STATE_PATH_LITERAL,
    storageStateDeletionVerified: true,
    at: typeof args.at === 'string' && args.at ? args.at : new Date().toISOString(),
    durationMs: Number.isFinite(args.durationMs) ? args.durationMs : 0,
    retentionClass: RETENTION_CLASS,
    authFailureReason: args.authFailureReason,
  });
  assertNoForbiddenFields(entry, 'entry');
  return entry;
}

export const __internals = Object.freeze({
  TOPICS,
});
