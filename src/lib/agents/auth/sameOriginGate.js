/**
 * Same-origin gate — Invariant 4 (v3 spec).
 *
 * The Playwright authenticated context navigates ONLY to URLs whose origin
 * equals the start-URL origin. v3 mandates the simpler "refuse cross-origin"
 * implementation per supermajority-ratified G-Q1 (cross-origin REFUSE,
 * 8/9 in v1, carried through v2/v3/v4).
 *
 * Plus spec §7.3: strict same-origin by default — different subdomains within
 * the same eTLD+1 (e.g. app.example.com vs www.example.com) are treated as
 * DIFFERENT origins. Operator can opt in to same-eTLD+1 crawl via an admin-
 * role-gated flag (planned Phase 3 admin-role wire-in).
 *
 * Pure functions: take URL strings, return Boolean + reason. The Executor
 * applies these at the BFS frontier and at every navigation call.
 */

'use strict';

/**
 * Parse a URL safely. Returns null on parse failure (the Executor treats
 * unparseable URLs as out-of-scope per §7.3).
 *
 * @param {string} url
 * @returns {URL | null}
 */
export function parseUrlSafe(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/**
 * Strict same-origin check. Two URLs are same-origin iff their protocol,
 * hostname, and port match exactly. Default subdomain handling: STRICT.
 *
 * @param {string} candidateUrl
 * @param {string} startUrl
 * @returns {{ sameOrigin: boolean, reason: string | null }}
 */
export function isSameOriginStrict(candidateUrl, startUrl) {
  const a = parseUrlSafe(candidateUrl);
  const b = parseUrlSafe(startUrl);
  if (!a) return { sameOrigin: false, reason: 'candidate_url_unparseable' };
  if (!b) return { sameOrigin: false, reason: 'start_url_unparseable' };
  if (a.protocol !== b.protocol) {
    return { sameOrigin: false, reason: `protocol_mismatch:${b.protocol}→${a.protocol}` };
  }
  // hostname is case-insensitive per RFC 3986 — normalise.
  if (a.hostname.toLowerCase() !== b.hostname.toLowerCase()) {
    return { sameOrigin: false, reason: `host_mismatch:${b.hostname}→${a.hostname}` };
  }
  // URL.port returns "" for default ports; that's correct equality semantics.
  if (a.port !== b.port) {
    return { sameOrigin: false, reason: `port_mismatch:${b.port || 'default'}→${a.port || 'default'}` };
  }
  return { sameOrigin: true, reason: null };
}

/**
 * Compute eTLD+1 — the registrable domain. Uses a heuristic for common cases
 * (two-label public suffix like `.co.uk` is NOT handled — true public-suffix
 * support requires the `psl` package which is NOT a dependency here). Phase
 * 3 admin-role opt-in for cross-subdomain crawl falls back to the strict
 * gate when this heuristic cannot confidently determine the eTLD+1.
 *
 * @param {string} hostname
 * @returns {string | null}
 */
export function eTldPlus1Heuristic(hostname) {
  if (typeof hostname !== 'string' || !hostname) return null;
  // Trim trailing dot (FQDN form).
  const h = hostname.replace(/\.$/, '').toLowerCase();
  const parts = h.split('.');
  if (parts.length < 2) return h;
  // IP-address detection — return as-is.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return h;
  // Two-label registries (.co.uk, .com.au, .co.jp, etc.) — conservative
  // shortlist. When matched, eTLD+1 is the last 3 labels.
  const TWO_LABEL_TLDS = new Set([
    'co.uk', 'co.jp', 'com.au', 'co.nz', 'com.br', 'co.in', 'co.kr', 'com.cn',
    'co.za', 'com.mx', 'com.tr', 'com.tw', 'com.sg', 'com.hk',
  ]);
  const lastTwo = parts.slice(-2).join('.');
  if (TWO_LABEL_TLDS.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

/**
 * Permissive same-eTLD+1 check. Used only when the admin-role opt-in flag
 * is present per spec §7.3. Falls back to strict mode when the eTLD+1
 * heuristic returns null.
 *
 * @param {string} candidateUrl
 * @param {string} startUrl
 * @returns {{ sameRegistrableDomain: boolean, reason: string | null }}
 */
export function isSameRegistrableDomain(candidateUrl, startUrl) {
  const a = parseUrlSafe(candidateUrl);
  const b = parseUrlSafe(startUrl);
  if (!a || !b) return { sameRegistrableDomain: false, reason: 'unparseable_url' };
  if (a.protocol !== b.protocol) {
    return { sameRegistrableDomain: false, reason: `protocol_mismatch:${b.protocol}→${a.protocol}` };
  }
  const eA = eTldPlus1Heuristic(a.hostname);
  const eB = eTldPlus1Heuristic(b.hostname);
  if (!eA || !eB) return { sameRegistrableDomain: false, reason: 'etldp1_undetermined' };
  if (eA !== eB) {
    return { sameRegistrableDomain: false, reason: `etldp1_mismatch:${eB}→${eA}` };
  }
  return { sameRegistrableDomain: true, reason: null };
}

/**
 * The authoritative scope-gate. Strict same-origin by default; permissive
 * same-eTLD+1 mode requires explicit admin-role opt-in (the caller passes
 * `mode: 'same-registrable-domain'` only when the admin flag is set).
 *
 * @param {string} candidateUrl
 * @param {string} startUrl
 * @param {object} [opts]
 * @param {'strict-same-origin' | 'same-registrable-domain'} [opts.mode='strict-same-origin']
 * @returns {{ inScope: boolean, reason: string | null, mode: string }}
 */
export function isInScopeForAuthenticatedNav(candidateUrl, startUrl, opts = {}) {
  const mode = opts.mode === 'same-registrable-domain' ? 'same-registrable-domain' : 'strict-same-origin';
  if (mode === 'same-registrable-domain') {
    const { sameRegistrableDomain, reason } = isSameRegistrableDomain(candidateUrl, startUrl);
    return { inScope: sameRegistrableDomain, reason, mode };
  }
  const { sameOrigin, reason } = isSameOriginStrict(candidateUrl, startUrl);
  return { inScope: sameOrigin, reason, mode };
}
