/**
 * Phase 3 evidence-artefact scrubbing — Invariants 1, 6, 7 (v3 spec).
 *
 * Composes with the existing src/lib/renewal/inputArtifact.js
 * scrubCredentials() (which handles InputArtifact-shaped objects) and adds
 * scrubbers for the new evidence-artefact shapes the Phase 3 Executor
 * produces:
 *
 *   1. DOM dumps         — post-login page snapshots (HTML, body text,
 *                          headings, form values)
 *   2. Network logs      — HTTP request/response captures (headers + body)
 *   3. ProductSSOT delta — delta_log_entry.issue.evidence strings (per
 *                          spec §6.3) when the credentialed run produces
 *                          deltas
 *
 * Phase 3 v3 Option B: NO screenshot scrubbing. Screenshots are not
 * captured in Phase 3 (deferred to Phase 4). This module deliberately
 * has no PNG / OCR / image-library surface.
 *
 * All functions are PURE: they take the artefact + credentials snapshot and
 * return a deep-cloned, scrubbed copy. The original input is never mutated.
 * Credentials are passed by value (not by reference into the audit trail)
 * — the caller (the Executor's act() path) is responsible for never
 * surfacing the credentials object beyond this module's input boundary.
 */

'use strict';

import { scrubCredentials } from '../../renewal/inputArtifact.js';

// Literal redaction markers used across all scrub paths. Stable strings so
// downstream consumers (test greps, audit-log parsers) can recognise the
// post-scrub form unambiguously.
export const REDACTED_EMAIL_MARKER = '[REDACTED-EMAIL]';
export const REDACTED_PASSWORD_MARKER = '[REDACTED]';
export const REDACTED_HEADER_MARKER = '[REDACTED]';
export const EPHEMERAL_PATH_MARKER = '[EPHEMERAL — deleted after processing]';

// Common credential-leak patterns per Invariant 6.
//
// 1. Welcome / hello banners that reveal an email address.
//    Conservative: only matches when the email is preceded by a banner verb.
const WELCOME_EMAIL_RE =
  /\b(welcome|hello|hi|signed\s*in\s*as|logged\s*in\s*as|account)[,:!]?\s+[^\s<>"'@]+@[^\s<>"'@]+\.[a-z]{2,}/giu;

// 2. password-field value attributes in HTML dumps. Per spec §6.1:
//    "<input type=password ...> value attribute → value=\"[REDACTED]\""
//    Conservative regex: matches the value attribute on any element whose
//    type attribute is "password". Single or double-quoted values.
const PASSWORD_INPUT_VALUE_RE =
  /(<input\b[^>]*\btype\s*=\s*["']password["'][^>]*\bvalue\s*=\s*)(["'])([^"']*?)\2/gi;

// 3. Authorization header values in serialised network logs (when the log
//    sink is a flat string rather than a structured object). The structured
//    object path is handled by scrubNetworkLog; this regex is the
//    belt-and-braces text catch.
const AUTH_HEADER_LINE_RE = /^(\s*authorization\s*:\s*)(.+)$/gim;
const SET_COOKIE_LINE_RE = /^(\s*set-cookie\s*:\s*)(.+)$/gim;
const COOKIE_LINE_RE = /^(\s*cookie\s*:\s*)(.+)$/gim;

// Generic Welcome-banner replacement: keep the verb, drop the email.
function _replaceWelcomeBanner(_match, verb) {
  return `${verb} ${REDACTED_EMAIL_MARKER}`;
}

// Escape a string for use as a regex pattern source.
function _escapeForRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scrub arbitrary text for credential leaks. The most general scrubber —
 * called by every other scrubber in this module on string-valued fields.
 *
 * Operations (applied in order):
 *   1. Literal email substring (case-insensitive, word-bounded where
 *      possible) → REDACTED_EMAIL_MARKER. Operator's exact submitted email.
 *   2. Literal password substring (case-sensitive, no word boundary —
 *      passwords contain arbitrary characters) → REDACTED_PASSWORD_MARKER.
 *   3. Welcome-banner email-address pattern → "<verb> [REDACTED-EMAIL]".
 *   4. <input type="password" value="..."> attr → value="[REDACTED]".
 *   5. Authorization: <value> log lines → Authorization: [REDACTED].
 *   6. Set-Cookie: <value> response-log lines → Set-Cookie: [REDACTED].
 *   7. Cookie: <value> request-log lines → Cookie: [REDACTED].
 *
 * @param {string} text
 * @param {{ email?: string, password?: string }} [credentials]
 * @returns {string}
 */
export function scrubTextForCredentials(text, credentials) {
  if (typeof text !== 'string' || !text) return text;
  let out = text;

  // 1. Literal email match — case-insensitive, no word boundary so subdomain
  //    variations (alice@example.com inside "alice@example.com.fake-domain")
  //    are caught. The literal-match is a false-positive-acceptable pass:
  //    if the email substring appears anywhere, redact it.
  const email = credentials && typeof credentials.email === 'string' ? credentials.email.trim() : '';
  if (email && email.length >= 4) {
    out = out.replace(new RegExp(_escapeForRegex(email), 'gi'), REDACTED_EMAIL_MARKER);
  }

  // 2. Literal password match — case-SENSITIVE (passwords are case-
  //    significant). False-positives on short passwords are acceptable per
  //    spec §6a.4 "false-positives accepted" stance. We require length ≥ 4
  //    to avoid redacting any short password like "abc" obliterating large
  //    chunks of unrelated text.
  const password = credentials && typeof credentials.password === 'string' ? credentials.password : '';
  if (password && password.length >= 4) {
    out = out.split(password).join(REDACTED_PASSWORD_MARKER);
  }

  // 3-7: pattern-based redactions (operator-credential-independent).
  out = out.replace(WELCOME_EMAIL_RE, _replaceWelcomeBanner);
  out = out.replace(PASSWORD_INPUT_VALUE_RE, (_m, prefix, q) => `${prefix}${q}${REDACTED_PASSWORD_MARKER}${q}`);
  out = out.replace(AUTH_HEADER_LINE_RE, (_m, prefix) => `${prefix}${REDACTED_HEADER_MARKER}`);
  out = out.replace(SET_COOKIE_LINE_RE, (_m, prefix) => `${prefix}${REDACTED_HEADER_MARKER}`);
  out = out.replace(COOKIE_LINE_RE, (_m, prefix) => `${prefix}${REDACTED_HEADER_MARKER}`);

  return out;
}

/**
 * Scrub a DOM dump snapshot. Operates on the shape the Executor's
 * _readPagePostLogin() produces — { url, title, metaDescription, bodyText,
 * headings, surfaces, ... }.
 *
 * Every string-valued field is run through scrubTextForCredentials. The
 * `url` field is preserved verbatim (URLs are public network addresses
 * and are NOT credentials per the spec; if a URL embeds credentials via
 * `https://user:pass@host` syntax that's a separate concern handled by
 * URL-shape scrubbing at the network-log layer).
 *
 * @param {object} domSnapshot
 * @param {{ email?: string, password?: string }} [credentials]
 * @returns {object} deep-cloned, scrubbed copy
 */
export function scrubDomDump(domSnapshot, credentials) {
  if (!domSnapshot || typeof domSnapshot !== 'object') return domSnapshot;
  const scrubbed = {
    ...domSnapshot,
    title: scrubTextForCredentials(domSnapshot.title ?? '', credentials),
    metaDescription: scrubTextForCredentials(domSnapshot.metaDescription ?? '', credentials),
    bodyText: scrubTextForCredentials(domSnapshot.bodyText ?? '', credentials),
    headings: Array.isArray(domSnapshot.headings)
      ? domSnapshot.headings.map((h) => scrubTextForCredentials(h, credentials))
      : domSnapshot.headings,
  };
  // surfaces.links is an array of href strings — URLs are not credentials
  // but we still pass them through text scrub in case a query param contains
  // the literal email/password (false-positive-acceptable).
  if (scrubbed.surfaces && typeof scrubbed.surfaces === 'object') {
    scrubbed.surfaces = {
      ...scrubbed.surfaces,
      links: Array.isArray(scrubbed.surfaces.links)
        ? scrubbed.surfaces.links.map((l) =>
            typeof l === 'string' ? scrubTextForCredentials(l, credentials) : l)
        : scrubbed.surfaces.links,
    };
  }
  return scrubbed;
}

// HTTP header names normalised for case-insensitive comparison.
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-access-token',
  'x-session-id',
]);

function _scrubHeaders(headers) {
  if (!headers) return headers;
  // Headers can be a plain object, a Map, or an array of [name, value] pairs
  // (the three Node HTTP shapes). Normalise all three to a plain object copy.
  if (Array.isArray(headers)) {
    return headers.map(([k, v]) => [
      k,
      typeof k === 'string' && SENSITIVE_HEADERS.has(k.toLowerCase())
        ? REDACTED_HEADER_MARKER : v,
    ]);
  }
  if (headers instanceof Map) {
    const out = new Map();
    for (const [k, v] of headers.entries()) {
      out.set(
        k,
        typeof k === 'string' && SENSITIVE_HEADERS.has(k.toLowerCase())
          ? REDACTED_HEADER_MARKER : v,
      );
    }
    return out;
  }
  if (typeof headers === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(headers)) {
      out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? REDACTED_HEADER_MARKER : v;
    }
    return out;
  }
  return headers;
}

/**
 * Scrub a network log entry. Operates on the shape Playwright + browserless
 * surface for an HTTP request/response capture:
 *   { method, url, requestHeaders, requestBody, responseHeaders, responseBody,
 *     statusCode, ... }.
 *
 * Operations:
 *   - Sensitive headers (Authorization, Cookie, Set-Cookie, etc.) → REDACTED
 *   - URL: scrubbed for embedded `https://user:pass@host` credential syntax
 *     AND for credential substrings in query parameters
 *   - requestBody / responseBody: passed through scrubTextForCredentials
 *
 * @param {object} entry
 * @param {{ email?: string, password?: string }} [credentials]
 * @returns {object} deep-cloned, scrubbed copy
 */
export function scrubNetworkLog(entry, credentials) {
  if (!entry || typeof entry !== 'object') return entry;
  const scrubbed = { ...entry };

  scrubbed.requestHeaders = _scrubHeaders(entry.requestHeaders);
  scrubbed.responseHeaders = _scrubHeaders(entry.responseHeaders);

  // URL: strip basic-auth-shape (user:pass@host) credentials.
  if (typeof entry.url === 'string') {
    let url = entry.url;
    url = url.replace(
      /^(https?:\/\/)([^\/@]+)(@)/i,
      (_m, scheme) => `${scheme}${REDACTED_PASSWORD_MARKER}@`,
    );
    url = scrubTextForCredentials(url, credentials);
    scrubbed.url = url;
  }

  if (typeof entry.requestBody === 'string') {
    scrubbed.requestBody = scrubTextForCredentials(entry.requestBody, credentials);
  } else if (entry.requestBody && typeof entry.requestBody === 'object') {
    scrubbed.requestBody = _scrubObjectShallow(entry.requestBody, credentials);
  }
  if (typeof entry.responseBody === 'string') {
    scrubbed.responseBody = scrubTextForCredentials(entry.responseBody, credentials);
  } else if (entry.responseBody && typeof entry.responseBody === 'object') {
    scrubbed.responseBody = _scrubObjectShallow(entry.responseBody, credentials);
  }

  return scrubbed;
}

// Shallow object scrub — string values get text-scrubbed; nested objects/
// arrays are passed through recursively (one level deep).
function _scrubObjectShallow(obj, credentials) {
  if (Array.isArray(obj)) {
    return obj.map((v) => {
      if (typeof v === 'string') return scrubTextForCredentials(v, credentials);
      if (v && typeof v === 'object') return _scrubObjectShallow(v, credentials);
      return v;
    });
  }
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    // Special-case credential field names — keys like 'password' / 'email'
    // / 'loginEmail' / 'loginPassword' / 'token' / 'api_key' map directly
    // to credential leaks regardless of the value's contents.
    const lowK = k.toLowerCase();
    if (lowK === 'password' || lowK === 'loginpassword' || lowK === 'pass' || lowK === 'pwd') {
      out[k] = typeof v === 'string' ? REDACTED_PASSWORD_MARKER : v;
      continue;
    }
    if (lowK === 'loginemail' || lowK === 'email_address') {
      out[k] = typeof v === 'string' ? REDACTED_EMAIL_MARKER : v;
      continue;
    }
    if (lowK === 'token' || lowK === 'api_key' || lowK === 'apikey' ||
        lowK === 'session_id' || lowK === 'access_token' || lowK === 'refresh_token') {
      out[k] = typeof v === 'string' ? REDACTED_HEADER_MARKER : v;
      continue;
    }
    if (typeof v === 'string') {
      out[k] = scrubTextForCredentials(v, credentials);
    } else if (v && typeof v === 'object') {
      out[k] = _scrubObjectShallow(v, credentials);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Scrub a ProductSSOT delta_log_entry per spec §6.3. Walks every string-
 * valued field in the delta (including nested issue.evidence arrays) and
 * applies scrubTextForCredentials. Composes with the existing CA-10-E.2
 * PII-scrub already applied to ProductSSOT writes (does not replace it).
 *
 * @param {object} delta
 * @param {{ email?: string, password?: string }} [credentials]
 * @returns {object} deep-cloned, scrubbed copy
 */
export function scrubProductSsotDeltaEntry(delta, credentials) {
  if (!delta || typeof delta !== 'object') return delta;
  return _scrubObjectShallow(delta, credentials);
}

/**
 * Compose with the existing InputArtifact scrubCredentials. The artifact's
 * own loginEmail/loginPassword fields are scrubbed by the renewal-side
 * function; this thin wrapper also accepts an optional credentials snapshot
 * for callers that want a unified scrub surface.
 *
 * @param {object} artifact
 * @param {{ email?: string, password?: string }} [credentials]
 * @returns {object} scrubbed artifact
 */
export function scrubInputArtifactWithCredentials(artifact, credentials) {
  const scrubbed = scrubCredentials(artifact);
  // If credentials are passed explicitly, also pass description.* free-text
  // fields through scrubTextForCredentials in case the operator wrote their
  // password or email into a free-form field.
  if (credentials && scrubbed?.raw?.description) {
    const desc = { ...scrubbed.raw.description };
    for (const field of ['productDescription', 'targetUsers', 'notes', 'additionalContext']) {
      if (typeof desc[field] === 'string') {
        desc[field] = scrubTextForCredentials(desc[field], credentials);
      }
    }
    scrubbed.raw = { ...scrubbed.raw, description: desc };
  }
  return scrubbed;
}

export const __internals = Object.freeze({
  WELCOME_EMAIL_RE,
  PASSWORD_INPUT_VALUE_RE,
  AUTH_HEADER_LINE_RE,
  SET_COOKIE_LINE_RE,
  COOKIE_LINE_RE,
  SENSITIVE_HEADERS,
});
