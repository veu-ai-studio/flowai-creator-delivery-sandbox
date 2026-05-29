// src/lib/agents/auth/authenticatedTraversal.js
//
// DISPATCH 28 P0-1 — wire auth-traversal into the live Conductor flow.
//
// Pure composition over the ENTRY 007 auth-traversal infrastructure:
//   1. Run an unauthenticated first-pass crawl (Agent #21 conductCrawl).
//   2. Inspect the report for auth-gated pages.
//   3. If credentials are provided AND auth-gated pages exist AND a
//      credentialedCrawlFn is wired in, invoke it per auth-gated URL.
//      The credentialed pass uses the Phase 3 Executor's
//      `conductCredentialedCrawl` (which enforces Invariants 2–5 +
//      same-origin gate + MFA fail-loud + scrubArtifacts) — we do NOT
//      re-implement the auth flow here.
//   4. Merge the post-login pages into the unauth report.
//   5. Apply credential-scrub discipline to everything that leaves
//      this function.
//
// Honest scope:
//   - Phase 3 chunk 2 of the Executor crawls ONE page post-login per
//     auth-gated URL. The multi-page-authenticated BFS extension is a
//     follow-up. This composer surfaces what the Executor returns; it
//     does not promise more.
//   - MFA challenge on any auth-gated origin is FAIL-LOUD per Invariant
//     3 — the composer returns the unauth report with an explicit
//     `authPass: { ok:false, reason:'mfa_challenge', ... }` flag and an
//     attached warning. The caller decides whether MFA blocks the run
//     (clearance Step 5) or only the auth pass (Self-Renewal scoring).
//   - Same-origin enforcement happens INSIDE the Executor; this composer
//     simply forwards the start URL of each auth-gated page.

'use strict';

import { scrubDomDump, scrubTextForCredentials } from './scrubArtifacts.js';

/**
 * Validate operator-submitted credentials at the composer boundary.
 * Mirrors the Executor's validateCredentialsAtBoundary contract but
 * pure + locally scoped (the Executor's validator is module-private).
 */
function validateCredentials(credentials) {
  if (credentials === null || credentials === undefined) return { ok: true, credentials: null };
  if (typeof credentials !== 'object') return { ok: false, reason: 'credentials_not_object' };
  const { email, password } = credentials;
  const hasEmail = typeof email === 'string' && email.length > 0;
  const hasPass = typeof password === 'string' && password.length > 0;
  if (!hasEmail && !hasPass) return { ok: true, credentials: null };
  if (hasEmail !== hasPass) return { ok: false, reason: 'credentials_incomplete' };
  return { ok: true, credentials: Object.freeze({ email, password }) };
}

function scrubReport(report, credentials) {
  if (!report || typeof report !== 'object' || !credentials) return report;
  const out = { ...report };
  if (Array.isArray(report.pages)) {
    out.pages = report.pages.map((p) => scrubDomDump(p, credentials));
  }
  if (Array.isArray(report.warnings)) {
    out.warnings = report.warnings.map((w) =>
      typeof w === 'string' ? scrubTextForCredentials(w, credentials) : w,
    );
  }
  if (Array.isArray(report.errors)) {
    out.errors = report.errors.map((e) =>
      typeof e === 'string'
        ? scrubTextForCredentials(e, credentials)
        : (e && typeof e === 'object'
            ? { ...e, reason: typeof e.reason === 'string' ? scrubTextForCredentials(e.reason, credentials) : e.reason }
            : e),
    );
  }
  return out;
}

/**
 * Run an unauth-first, auth-fallback crawl composition.
 *
 * @param {object} args
 * @param {(url: string, opts?: object) => Promise<object>} args.unauthCrawl
 *        — typically Agent21.conductCrawl bound to a conductor instance.
 * @param {(url: string, opts: {runId: string, credentials: {email,password}}) => Promise<object>}
 *        [args.credentialedCrawlFn]
 *        — typically Executor.conductCredentialedCrawl bound to an
 *          Executor instance. When absent, the composer behaves
 *          identically to the unauth-only pass + flags
 *          `authPass: { ok:false, reason:'no_executor_wired' }` when
 *          credentials would otherwise have been used.
 * @param {string}  args.url
 * @param {{email: string, password: string}|null} [args.credentials]
 * @param {object}  [args.opts]                  — passed through to unauthCrawl
 * @param {string}  [args.runId]                 — passed through to credentialedCrawlFn
 *
 * @returns {Promise<object>} merged CrawlReport-shaped envelope with the
 *   additional fields:
 *     authPass: { ok: boolean, reason?: string, runId?: string,
 *                 pagesAdded: number, pagesAttempted: number } | null
 */
export async function conductWithAuthFlow({
  unauthCrawl,
  credentialedCrawlFn = null,
  url,
  credentials = null,
  opts = {},
  runId,
}) {
  if (typeof unauthCrawl !== 'function') {
    return { ok: false, errors: [{ phase: 'composer', reason: 'unauthCrawl_required' }], pages: [], authPass: null };
  }

  // 1. unauthenticated first pass.
  const unauthReport = await unauthCrawl(url, opts);
  const baseReport = (unauthReport && typeof unauthReport === 'object')
    ? { ...unauthReport }
    : { ok: false, pages: [], errors: [{ phase: 'composer', reason: 'unauth_returned_non_object' }] };
  if (!Array.isArray(baseReport.pages)) baseReport.pages = [];
  if (!Array.isArray(baseReport.warnings)) baseReport.warnings = [];
  if (!Array.isArray(baseReport.errors)) baseReport.errors = [];

  // 2. validate credentials.
  const cred = validateCredentials(credentials);
  if (!cred.ok) {
    baseReport.authPass = { ok: false, reason: `credentials_invalid:${cred.reason}`, pagesAdded: 0, pagesAttempted: 0 };
    return baseReport;
  }
  if (cred.credentials === null) {
    // Unauthenticated-only path is legitimate per §6 — no auth pass attempted.
    baseReport.authPass = null;
    return baseReport;
  }

  // 3. find auth-gated pages (page.authGated === true is set by
  //    the unauth conductor per §6 pass-1 heuristic).
  const authGatedPages = baseReport.pages.filter((p) => p && p.authGated === true);
  if (authGatedPages.length === 0) {
    // No auth-gated surfaces → nothing for the credentialed pass to add.
    // Per §6 this is a legitimate outcome (the public landing page may
    // have everything we need to score).
    baseReport.authPass = { ok: true, reason: 'no_auth_gated_pages', pagesAdded: 0, pagesAttempted: 0, runId: runId ?? null };
    return baseReport;
  }

  // 4. no credentialedCrawlFn wired — surface the gap explicitly.
  if (typeof credentialedCrawlFn !== 'function') {
    baseReport.authPass = {
      ok: false, reason: 'no_executor_wired',
      pagesAdded: 0, pagesAttempted: 0,
    };
    baseReport.warnings.push('authenticated_traversal_skipped: no credentialedCrawlFn wired');
    return scrubReport(baseReport, cred.credentials);
  }

  // 5. attempt credentialed crawl on each auth-gated URL.
  const finalRunId = typeof runId === 'string' && runId ? runId : `auth-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
  const addedPages = [];
  let mfaChallengeSeen = false;
  let mfaReason = null;
  let attempts = 0;

  for (const authPage of authGatedPages) {
    const target = authPage.url ?? authPage.normalisedUrl;
    if (typeof target !== 'string' || !target) continue;
    attempts += 1;
    let credReport;
    try {
      credReport = await credentialedCrawlFn(target, { runId: finalRunId, credentials: cred.credentials });
    } catch (e) {
      baseReport.warnings.push(scrubTextForCredentials(
        `authenticated_pass_threw: ${e?.message ?? String(e)}`,
        cred.credentials,
      ));
      continue;
    }
    if (!credReport || typeof credReport !== 'object') {
      baseReport.warnings.push('authenticated_pass_returned_non_object');
      continue;
    }
    // MFA challenge → FAIL-LOUD per Invariant 3. Abort the auth pass.
    if (credReport.authFailed && /mfa/i.test(String(credReport.authFailureReason ?? ''))) {
      mfaChallengeSeen = true;
      mfaReason = credReport.authFailureReason;
      break;
    }
    // login_form_not_found / other auth failures → record warning, continue.
    if (credReport.authFailed) {
      baseReport.warnings.push(scrubTextForCredentials(
        `authenticated_pass_failed: ${credReport.authFailureReason ?? 'unknown'}`,
        cred.credentials,
      ));
      continue;
    }
    if (credReport.ok && Array.isArray(credReport.pages)) {
      for (const p of credReport.pages) addedPages.push(p);
    }
  }

  if (mfaChallengeSeen) {
    const merged = {
      ...baseReport,
      pages: [...baseReport.pages, ...addedPages],
      pagesCrawled: (baseReport.pagesCrawled ?? baseReport.pages.length) + addedPages.length,
      authPass: {
        ok: false, reason: `mfa_challenge:${mfaReason}`,
        pagesAdded: addedPages.length, pagesAttempted: attempts, runId: finalRunId,
      },
    };
    merged.warnings = [
      ...baseReport.warnings,
      scrubTextForCredentials(`mfa_challenge_detected: ${mfaReason}; auth pass aborted (Invariant 3 fail-loud)`, cred.credentials),
    ];
    return scrubReport(merged, cred.credentials);
  }

  // 6. merge + scrub.
  const merged = {
    ...baseReport,
    pages: [...baseReport.pages, ...addedPages],
    pagesCrawled: (baseReport.pagesCrawled ?? baseReport.pages.length) + addedPages.length,
    authGatedCount: 0, // credentials consumed; downstream sees fully-traversed report
    authPass: {
      ok: addedPages.length > 0 || attempts === 0
        ? true
        : false, // attempted but produced nothing
      reason: addedPages.length > 0 ? 'completed' : 'no_authenticated_pages_obtained',
      pagesAdded: addedPages.length,
      pagesAttempted: attempts,
      runId: finalRunId,
    },
  };
  return scrubReport(merged, cred.credentials);
}

export const __internals = Object.freeze({
  validateCredentials,
  scrubReport,
});
