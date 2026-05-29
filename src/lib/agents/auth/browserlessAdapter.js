/**
 * Browserless production adapter for the Phase 3 Executor's `browser` dep.
 *
 * The Executor (Agent21AggressiveCrawlConductorExecutor) takes an injected
 * `browser` dep with the shape:
 *
 *   {
 *     newContext({ storageState }) → Promise<BrowserContext>
 *   }
 *
 * where BrowserContext exposes:
 *
 *   {
 *     newPage() → Promise<Page>,
 *     storageState() → Promise<object>,    // NO `path` arg, EVER (Invariant 2)
 *     close() → Promise<void>,
 *   }
 *
 * Playwright's `chromium.connectOverCDP(wssEndpoint)` returns a `Browser`
 * object whose `.newContext()` method matches the shape above, so this
 * adapter is mostly a thin lazy-loader + WSS URL builder.
 *
 * Honest scope:
 *   - This module does NOT install Playwright. The `playwright` package
 *     is already in package.json (verified at CHUNK 2 start).
 *   - Playwright is imported LAZILY inside connectBrowserless() so this
 *     module is requirable in environments without Playwright runtime
 *     (e.g. Vercel serverless function cold start, unit tests that mock
 *     the browser dep entirely).
 *   - If BROWSERLESS_API_KEY is not set, connectBrowserless() throws with
 *     a clear message. This is the production path; there is NO local-
 *     Chromium fallback (consistent with the v3 spec's intent that auth-
 *     traversal runs through Browserless, not a co-located Chromium that
 *     would need its own filesystem cleanup invariants).
 *   - The adapter returns the Playwright Browser object DIRECTLY, not a
 *     wrapped surface. Tests inject their own mock; production gets the
 *     real Playwright API surface (newContext, contexts, close, etc.).
 *   - There is NO local Chromium download / launch path. Browserless WSS
 *     is the only production target.
 */

'use strict';

/**
 * Build the Browserless WSS endpoint URL from an API key.
 *
 * Browserless BaaS V2 endpoint (docs verified 2026-05-22):
 *   wss://production-sfo.browserless.io?token=<KEY>
 *
 * The root path is the documented CDP default and is equivalent to
 * /chromium. Callers can still opt into /chromium, /chrome, or stealth
 * paths through BROWSERLESS_WSS_URL.
 *
 * Env-var precedence (highest first):
 *   1. BROWSERLESS_WSS_URL  — full URL with optional path, no token
 *      (this is the canonical knob; matches the per-account WS URL
 *      Browserless shows on the dashboard for V2 BaaS).
 *   2. BROWSERLESS_WSS_BASE — legacy alias; kept for back-compat
 *      with any existing env files that already set it.
 *   3. default: wss://production-sfo.browserless.io
 *
 * The token is appended as a `?token=` query parameter. Header-form
 * (Authorization: Bearer …) is NOT used because Playwright's
 * connectOverCDP doesn't expose a header configuration knob in the
 * project's pinned 1.59.1.
 *
 * @param {string} apiKey
 * @returns {string}
 */
export function buildBrowserlessWssUrl(apiKey) {
  const token = normalizeBrowserlessApiKey(apiKey);
  const base = process.env.BROWSERLESS_WSS_URL
    || process.env.BROWSERLESS_WSS_BASE
    || 'wss://production-sfo.browserless.io';
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}token=${encodeURIComponent(token)}`;
}

export function normalizeBrowserlessApiKey(apiKey) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('buildBrowserlessWssUrl: apiKey required (non-empty string)');
  }
  let token = apiKey.trim().replace(/^['"]|['"]$/g, '').trim();
  if (/^(wss?|https?):\/\//i.test(token)) {
    try {
      const parsed = new URL(token);
      token = parsed.searchParams.get('token') || token;
    } catch {
      // Let the token= cleanup below handle any copy/paste residue it can.
    }
  }
  token = token.replace(/^token=/i, '').trim();
  if (!token) {
    throw new Error('buildBrowserlessWssUrl: apiKey required (non-empty string)');
  }
  return token;
}

export function redactBrowserlessWssUrl(wssUrl) {
  return String(wssUrl).replace(/([?&]token=)[^&\s]+/i, '$1***BROWSERLESS_TOKEN***');
}

/**
 * Connect to a Browserless-hosted Chromium instance. Returns a Playwright
 * Browser shape that the Executor can pass through to its `browser` dep.
 *
 * @param {object} [opts]
 * @param {string} [opts.apiKey]    — defaults to process.env.BROWSERLESS_API_KEY
 * @param {number} [opts.timeoutMs] — connect timeout; defaults to 30s
 *
 * @returns {Promise<object>} Playwright Browser
 */
export async function connectBrowserless(opts = {}) {
  const rawApiKey = typeof opts.apiKey === 'string' && opts.apiKey
    ? opts.apiKey
    : process.env.BROWSERLESS_API_KEY;
  if (!rawApiKey) {
    throw new Error(
      'connectBrowserless: BROWSERLESS_API_KEY not set. ' +
      'The Phase 3 authenticated-crawl path requires Browserless — there is no ' +
      'local-Chromium fallback. Set BROWSERLESS_API_KEY in Doppler/Vercel env ' +
      'or pass opts.apiKey explicitly.',
    );
  }

  // Lazy import — keeps the module requirable when Playwright is not
  // installed (it IS installed per package.json, but we don't want a
  // hard import-time dependency that would break tests that fully mock
  // the browser dep).
  let chromium;
  try {
    const playwright = await import('playwright');
    chromium = playwright.chromium;
  } catch (importErr) {
    throw new Error(
      `connectBrowserless: playwright import failed — ${importErr?.message ?? String(importErr)}. ` +
      'Verify the playwright dependency is installed (package.json declares ^1.59.1).',
    );
  }

  const apiKey = normalizeBrowserlessApiKey(rawApiKey);
  const wssUrl = buildBrowserlessWssUrl(apiKey);
  const redactedWssUrl = redactBrowserlessWssUrl(wssUrl);
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 30_000;

  let browser;
  try {
    // connectOverCDP is the canonical Playwright entry for connecting to a
    // remote Chromium via CDP. Browserless's WSS endpoint speaks CDP.
    browser = await chromium.connectOverCDP(wssUrl, { timeout: timeoutMs });
  } catch (connectErr) {
    // Honest failure surface — the WSS URL is NOT included in the error
    // message because it contains the API key in the query string. The
    // message names the failure mode without leaking the token.
    const safeMessage = String(connectErr?.message ?? connectErr)
      .split(apiKey).join('***BROWSERLESS_TOKEN***')
      .split(encodeURIComponent(apiKey)).join('***BROWSERLESS_TOKEN***');
    throw new Error(
      `connectBrowserless: chromium.connectOverCDP failed — ${safeMessage}. ` +
      `Browserless endpoint: ${redactedWssUrl}. ` +
      'Verify BROWSERLESS_API_KEY is valid and the Browserless service is reachable. ' +
      'NOTE: The token is NEVER included in error output.',
    );
  }
  return browser;
}

/**
 * Convenience: connect, run a callback against the Browser, and
 * unconditionally close in `finally`. Lets endpoint handlers wrap the
 * connection lifetime without remembering to call browser.close().
 *
 * @param {(browser: object) => Promise<T>} fn
 * @param {object} [opts] — same shape as connectBrowserless
 * @template T
 * @returns {Promise<T>}
 */
export async function withBrowserless(fn, opts = {}) {
  if (typeof fn !== 'function') {
    throw new Error('withBrowserless: fn must be a function');
  }
  const browser = await connectBrowserless(opts);
  try {
    return await fn(browser);
  } finally {
    try {
      await browser.close();
    } catch {
      // close-on-cleanup failure is non-fatal; the Browserless service
      // will reclaim the session via its own idle-timeout.
    }
  }
}
