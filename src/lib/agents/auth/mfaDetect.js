/**
 * MFA challenge detection — Invariant 3 (v3 spec).
 *
 * If the post-login response heuristically matches an MFA challenge, the
 * Conductor MUST stop the auth attempt immediately and return ok:false with
 * authFailureReason: 'mfa_required'. NO continue-unauth path. NO MFA bypass.
 *
 * Per docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md v3 Invariant 3 line 85:
 *
 *   "if the post-login response heuristically matches an MFA challenge —
 *    page contains any of `[data-mfa]`, text matching
 *    `/\b(two[\s-]?factor|2fa|verification code|authenticator|sms code|
 *    email code|one[\s-]?time password|otp)\b/i`, OR an additional input
 *    element requesting a 6-digit numeric code — the Conductor MUST
 *    IMMEDIATELY stop the auth attempt."
 *
 * Pure function: takes a pre-extracted page snapshot (HTML + selectors)
 * and returns a Boolean + reason. The caller (the Executor) is responsible
 * for invoking Playwright APIs to populate the snapshot.
 */

'use strict';

// Spec line 85 verbatim. Word-bound, case-insensitive.
export const MFA_TEXT_RE =
  /\b(two[\s-]?factor|2fa|verification\s*code|authenticator|sms\s*code|email\s*code|one[\s-]?time\s*password|otp)\b/i;

// "additional input element requesting a 6-digit numeric code" — the input's
// maxlength/pattern/inputmode/autocomplete attributes are the strongest
// signals. We expose these as separate predicates so the Executor can compose
// them from the page DOM however it likes (Playwright `page.evaluate` is the
// canonical approach).
export const SIX_DIGIT_PATTERN_RE = /^\s*\d{6}\s*$/;

/**
 * Detect an MFA challenge from a page snapshot.
 *
 * @param {object} snapshot
 * @param {string} [snapshot.html]            — page innerHTML or innerText, used for text-regex match
 * @param {boolean} [snapshot.hasDataMfaAttr] — `[data-mfa]` selector match anywhere on page
 * @param {Array<object>} [snapshot.extraInputs] — additional input elements introduced post-login
 *   each: { type?, maxlength?, pattern?, inputmode?, autocomplete?, placeholder? }
 *
 * @returns {{ isMfaChallenge: boolean, reason: string | null, signal: string | null }}
 *   - isMfaChallenge: true iff ANY of (data-mfa attr / text regex / 6-digit input) matched
 *   - reason: 'mfa_required' when isMfaChallenge is true; null otherwise
 *   - signal: human-readable signal name for audit logging (no PII)
 */
export function detectMfaChallenge(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return { isMfaChallenge: false, reason: null, signal: null };
  }
  if (snapshot.hasDataMfaAttr === true) {
    return { isMfaChallenge: true, reason: 'mfa_required', signal: 'data_mfa_attribute' };
  }
  const html = typeof snapshot.html === 'string' ? snapshot.html : '';
  if (html && MFA_TEXT_RE.test(html)) {
    return { isMfaChallenge: true, reason: 'mfa_required', signal: 'text_regex' };
  }
  const extras = Array.isArray(snapshot.extraInputs) ? snapshot.extraInputs : [];
  for (const input of extras) {
    if (!input || typeof input !== 'object') continue;
    // A 6-digit numeric input is the canonical OTP shape. Strong signals:
    //   - autocomplete="one-time-code"
    //   - inputmode="numeric" AND maxlength="6"
    //   - pattern="\d{6}" or pattern="[0-9]{6}"
    const ac = typeof input.autocomplete === 'string' ? input.autocomplete.toLowerCase() : '';
    if (ac === 'one-time-code') {
      return { isMfaChallenge: true, reason: 'mfa_required', signal: 'autocomplete_one_time_code' };
    }
    const im = typeof input.inputmode === 'string' ? input.inputmode.toLowerCase() : '';
    const ml = Number(input.maxlength);
    if (im === 'numeric' && ml === 6) {
      return { isMfaChallenge: true, reason: 'mfa_required', signal: 'numeric_maxlength_6' };
    }
    const pattern = typeof input.pattern === 'string' ? input.pattern : '';
    if (/^\\?d\{6\}$|^\[0-9\]\{6\}$/.test(pattern)) {
      return { isMfaChallenge: true, reason: 'mfa_required', signal: 'pattern_6_digit' };
    }
  }
  return { isMfaChallenge: false, reason: null, signal: null };
}

/**
 * Convenience: build the canonical fail-loud envelope for the CrawlReport.
 * Per spec §8.1: `{ ok:false, authFailed:true, authFailureReason, startUrl, attemptedAt }`.
 * No pagesCrawled — the run did NOT proceed past the auth wall.
 */
export function buildMfaFailureEnvelope({ startUrl, attemptedAt, signal }) {
  return Object.freeze({
    ok: false,
    authFailed: true,
    authFailureReason: 'mfa_required',
    startUrl: typeof startUrl === 'string' ? startUrl : '',
    attemptedAt: typeof attemptedAt === 'string' ? attemptedAt : new Date().toISOString(),
    // signal is operational metadata — safe to surface, contains no PII.
    detectionSignal: signal ?? null,
  });
}
