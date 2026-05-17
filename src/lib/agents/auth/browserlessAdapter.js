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
 * Build the Browserless WSS endpoint URL from an API key. The Browserless
 * cloud service exposes `wss://chrome.browserless.io?token=<KEY>`. Self-
 * hosted deployments can override the base via BROWSERLESS_WSS_BASE.
 *
 * @param {string} apiKey
 * @returns {string}
 */
export function buildBrowserlessWssUrl(apiKey) {
  if (typeof apiKey !== 'string' || !apiKey) {
    throw new Error('buildBrowserlessWssUrl: apiKey required (non-empty string)');
  }
  const base = process.env.BROWSERLESS_WSS_BASE || 'wss://chrome.browserless.io';
  // The endpoint accepts the token via either the `token` query param
  // (cloud convention) or the `Authorization: Bearer <key>` header. We use
  // the query-param form because Playwright's connectOverCDP doesn't
  // expose a header configuration knob in older Playwright versions, and
  // the project's pinned 1.59.1 may or may not support it. Query-param
  // form is universally supported.
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}token=${encodeURIComponent(apiKey)}`;
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
  const apiKey = typeof opts.apiKey === 'string' && opts.apiKey
    ? opts.apiKey
    : process.env.BROWSERLESS_API_KEY;
  if (!apiKey) {
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

  const wssUrl = buildBrowserlessWssUrl(apiKey);
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
    throw new Error(
      `connectBrowserless: chromium.connectOverCDP failed — ${connectErr?.message ?? String(connectErr)}. ` +
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
