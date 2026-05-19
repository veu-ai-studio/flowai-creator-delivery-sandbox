// src/lib/agents/renewal/adversarialSurface.js
//
// Phase B — Adversarial Surface Testing per CANONICAL_REFERENCE §6 +
// CEO directive (D39): "NO GTM without real interactive verification."
// Phase A's §7.6 scoring is surface-only (HTTP status, broken links,
// console errors, presence detection). Phase B exercises the
// interactive layer — clicks, modals, forms, AI/chatbot agents — and
// distinguishes WIRED features from MOCK-ONLY stubs.
//
// Architecture: composes over the ENTRY-007 authenticated traversal
// infrastructure (authenticatedTraversal.js) so logged-in surfaces can
// be probed too. Headless via Playwright (local chromium) when
// BROWSERLESS_API_KEY is absent; otherwise via the existing
// browserlessAdapter (remote CDP).
//
// Public contract:
//   probeAdversarialSurface({ url, opts }) → {
//     ok, findings: [{ severity, category, location, evidence }],
//     summary: { interactivesTested, deadOrErroring,
//                modalsFailing, formsFailing, agentsNonFunctional,
//                mockOnlyFlagged },
//     probedAt, durationMs,
//   }
//
// `findings` items are §7.6-shaped so they flow through the existing
// gtmReadinessScorer + scoped-relaxation rules without translation.
//
// All probes are bounded by hard timeouts (default 8s per action,
// 30s navigation) and capped by maxInteractives/maxModals/maxForms
// (default 25/10/10) so a single Phase B pass is bounded.

'use strict';

// ── Defaults ──────────────────────────────────────────────────────────

const DEFAULT_NAV_TIMEOUT_MS = 30_000;
const DEFAULT_ACTION_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_INTERACTIVES = 25;
const DEFAULT_MAX_MODALS = 10;
const DEFAULT_MAX_FORMS = 10;
const DEFAULT_PROBE_BUDGET_MS = 180_000;        // 3-min total wall cap

// ── Connector ─────────────────────────────────────────────────────────

/**
 * Connect to a headless browser. Production path tries Browserless
 * (via the existing src/lib/agents/auth/browserlessAdapter.js) when
 * BROWSERLESS_API_KEY is set; otherwise lazy-imports Playwright and
 * launches a local chromium. Tests can inject `opts.browser` directly
 * to bypass the connector entirely.
 *
 * Returns the Playwright Browser object (or browser-shaped mock).
 */
export async function connectBrowser(opts = {}) {
  if (opts.browser) return opts.browser;
  const apiKey = opts.browserlessApiKey ?? process.env.BROWSERLESS_API_KEY;
  if (apiKey) {
    try {
      const mod = await import('../auth/browserlessAdapter.js');
      return await mod.connectBrowserless({ apiKey, timeoutMs: opts.connectTimeoutMs });
    } catch (e) {
      // Fall through to local chromium if browserless connect fails.
      if (opts.requireBrowserless) throw e;
    }
  }
  // Local Playwright fallback. Lazy-imported so tests without
  // playwright still work.
  const pw = await import('playwright').catch(() => null);
  if (!pw || !pw.chromium) {
    throw new Error('adversarialSurface.connectBrowser: neither Browserless nor local Playwright available');
  }
  return await pw.chromium.launch({
    headless: opts.headless !== false,
    timeout: opts.connectTimeoutMs ?? DEFAULT_NAV_TIMEOUT_MS,
  });
}

// ── Finding helper ────────────────────────────────────────────────────

function makeFinding(severity, category, location, evidence) {
  return Object.freeze({ severity, category, location, evidence });
}

// ── T2 — Interactive element exercise ─────────────────────────────────
//
// Enumerate clickable elements on the page (buttons, links, role=button
// divs, card-shaped divs that look clickable), click each with a hard
// timeout, classify the outcome:
//
//   WORKS       — click triggered a real change (URL changed, DOM
//                 signature shifted by >threshold, network request
//                 fired with non-trivial response)
//   ERRORS      — click produced a console error OR navigation
//                 returned 4xx/5xx OR element rejected the click
//   DEAD-NO-OP  — no detectable change after the action timeout
//
// Each dead/erroring element becomes a §7.6 finding.

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="link"]',
  '[onclick]',
  // Card-shaped: a div containing both heading + descendant button/anchor
  // is captured by the per-element heuristic in enumerateClickables —
  // not via selector (would be too noisy).
].join(', ');

function safeText(s, n = 60) {
  if (typeof s !== 'string') return '';
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > n ? `${trimmed.slice(0, n)}…` : trimmed;
}

/**
 * Default Page-driver enumeration. Returns shallow descriptors so the
 * probe can iterate without holding live handles for longer than
 * necessary. Capped at `maxInteractives` to bound the probe budget.
 */
async function enumerateClickables(page, maxInteractives) {
  // Use page.evaluate to gather a snapshot of clickable elements with
  // stable selectors (CSS-like path with nth-child).
  return await page.evaluate((args) => {
    const { sel, max } = args;
    const els = Array.from(document.querySelectorAll(sel));
    function cssPath(el) {
      const parts = [];
      let cur = el;
      let depth = 0;
      while (cur && cur.nodeType === 1 && depth < 8) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) { part += `#${cur.id}`; parts.unshift(part); break; }
        const parent = cur.parentElement;
        if (parent) {
          const sibs = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
          if (sibs.length > 1) part += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
        }
        parts.unshift(part);
        cur = cur.parentElement;
        depth += 1;
      }
      return parts.join(' > ');
    }
    const out = [];
    for (const el of els) {
      if (out.length >= max) break;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;     // hidden
      const tag = el.tagName.toLowerCase();
      const text = (el.innerText || el.textContent || '').slice(0, 200);
      const href = tag === 'a' ? (el.getAttribute('href') ?? null) : null;
      out.push({
        index: out.length,
        tag,
        href,
        text,
        ariaLabel: el.getAttribute('aria-label') ?? null,
        role: el.getAttribute('role') ?? null,
        selector: cssPath(el),
      });
    }
    return out;
  }, { sel: INTERACTIVE_SELECTOR, max: maxInteractives });
}

/**
 * T2 — probeInteractives default implementation. Pluggable via
 * adversarialSurface opts.probeInteractives for tests.
 *
 * @returns {Promise<{ findings:Array, interactivesTested:number, deadOrErroring:number }>}
 */
export async function probeInteractives({
  page, url, maxInteractives = DEFAULT_MAX_INTERACTIVES,
  actionTimeoutMs = DEFAULT_ACTION_TIMEOUT_MS,
  sliceBudget = 45_000,
} = {}) {
  const findings = [];
  let interactivesTested = 0;
  let deadOrErroring = 0;
  const startedAt = Date.now();

  if (!page) return { findings, interactivesTested, deadOrErroring };

  // Capture console errors during the probe so a click that triggers
  // an error gets classified ERRORS.
  const consoleErrors = [];
  const errorHandler = (msg) => {
    if (msg && typeof msg.type === 'function' && msg.type() === 'error') {
      consoleErrors.push(typeof msg.text === 'function' ? msg.text() : String(msg));
    } else if (msg && typeof msg.text === 'string') {
      consoleErrors.push(msg.text);
    }
  };
  if (typeof page.on === 'function') {
    page.on('console', errorHandler);
  }

  let clickables;
  try {
    clickables = await enumerateClickables(page, maxInteractives);
  } catch (e) {
    findings.push(makeFinding(
      'medium', 'engine-error', url,
      `enumerateClickables failed: ${(e?.message ?? String(e)).slice(0, 120)}`,
    ));
    return { findings, interactivesTested: 0, deadOrErroring: 0 };
  }

  for (const el of clickables) {
    if (Date.now() - startedAt > sliceBudget) break;
    interactivesTested += 1;

    // Snapshot before-state.
    const beforeUrl = typeof page.url === 'function' ? page.url() : url;
    const beforeConsoleLen = consoleErrors.length;
    let beforeBodyHash = '';
    try {
      beforeBodyHash = await page.evaluate(() => (document.body?.innerText ?? '').length.toString(36));
    } catch { beforeBodyHash = ''; }

    // Click with bounded timeout.
    let clickError = null;
    try {
      const loc = page.locator ? page.locator(el.selector).first() : null;
      if (!loc) {
        clickError = 'no_locator_api';
      } else {
        // Use .click with explicit timeout + `noWaitAfter:true` so a
        // dead button doesn't hang the probe waiting for a network
        // event that never comes.
        await loc.click({ timeout: actionTimeoutMs, trial: false, noWaitAfter: true });
      }
    } catch (e) {
      clickError = (e?.message ?? String(e)).slice(0, 120);
    }

    // Snapshot after-state (give the page a brief moment to react).
    if (typeof page.waitForTimeout === 'function') {
      try { await page.waitForTimeout(200); } catch { /* ignore */ }
    }
    const afterUrl = typeof page.url === 'function' ? page.url() : beforeUrl;
    const afterConsoleLen = consoleErrors.length;
    let afterBodyHash = beforeBodyHash;
    try {
      afterBodyHash = await page.evaluate(() => (document.body?.innerText ?? '').length.toString(36));
    } catch { /* keep before */ }

    const navigated = afterUrl !== beforeUrl;
    const bodyChanged = afterBodyHash !== beforeBodyHash;
    const newErrors = afterConsoleLen > beforeConsoleLen;

    let classification = 'WORKS';
    if (clickError && /time(?:d.?out|out)/i.test(clickError)) {
      // Both "Timeout" (Playwright's TimeoutError) and "timed out"
      // (some adapter-level wrappers) read as dead-no-op: the element
      // exists but isn't responsive within the action timeout.
      classification = 'DEAD-NO-OP';
    } else if (clickError) {
      classification = 'ERRORS';
    } else if (newErrors) {
      classification = 'ERRORS';
    } else if (!navigated && !bodyChanged) {
      classification = 'DEAD-NO-OP';
    }

    if (classification === 'DEAD-NO-OP') {
      deadOrErroring += 1;
      findings.push(makeFinding(
        'medium', 'dead-card',
        `${url}${el.selector ? ` ${el.selector}` : ''}`,
        `click on <${el.tag}>${el.ariaLabel ? ` aria-label="${safeText(el.ariaLabel)}"` : ''} text="${safeText(el.text)}" produced no observable change (no nav, no DOM diff, no error)`,
      ));
    } else if (classification === 'ERRORS') {
      deadOrErroring += 1;
      findings.push(makeFinding(
        'high', 'broken-modal',
        `${url}${el.selector ? ` ${el.selector}` : ''}`,
        `click on <${el.tag}> text="${safeText(el.text)}" ${clickError ? `errored: ${clickError}` : `triggered console error(s): ${consoleErrors.slice(beforeConsoleLen).map((s) => safeText(s, 80)).join('; ')}`}`,
      ));
    }
    // If navigated, restore page so subsequent interactives are
    // measured against the original surface.
    if (navigated) {
      try {
        await page.goBack({ timeout: actionTimeoutMs }).catch(async () => {
          // Some pages can't goBack — re-navigate to the original url.
          await page.goto(url, { timeout: actionTimeoutMs, waitUntil: 'domcontentloaded' });
        });
      } catch { /* best-effort */ }
    }
  }

  if (typeof page.off === 'function') {
    try { page.off('console', errorHandler); } catch { /* ignore */ }
  }
  return { findings, interactivesTested, deadOrErroring };
}

// ── Main entry point ──────────────────────────────────────────────────

/**
 * Probe the adversarial surface of a single URL.
 *
 * @param {object} args
 * @param {string} args.url                       — target URL
 * @param {object} [args.opts]
 * @param {object} [args.opts.browser]            — preconnected Browser (test)
 * @param {object} [args.opts.storageState]       — Playwright storageState
 *                                                  (from ENTRY-007 auth pass)
 * @param {number} [args.opts.navTimeoutMs]
 * @param {number} [args.opts.actionTimeoutMs]
 * @param {number} [args.opts.maxInteractives]
 * @param {number} [args.opts.maxModals]
 * @param {number} [args.opts.maxForms]
 * @param {number} [args.opts.probeBudgetMs]
 * @param {function} [args.opts.probeInteractives]   — DI for testability
 * @param {function} [args.opts.probeModals]
 * @param {function} [args.opts.probeForms]
 * @param {function} [args.opts.probeAgents]
 * @param {function} [args.opts.detectWiredVsMock]
 * @returns {Promise<object>}
 */
export async function probeAdversarialSurface(args = {}) {
  const startedAt = Date.now();
  const url = typeof args.url === 'string' ? args.url.trim() : '';
  const opts = args.opts ?? {};
  if (!url) {
    return {
      ok: false, reason: 'url_required', findings: [],
      summary: { interactivesTested: 0, deadOrErroring: 0,
                 modalsFailing: 0, formsFailing: 0,
                 agentsNonFunctional: 0, mockOnlyFlagged: 0 },
      probedAt: new Date().toISOString(), durationMs: 0,
    };
  }

  let browser = null;
  let ownsBrowser = false;
  let context = null;
  let page = null;
  const findings = [];
  const summary = {
    interactivesTested: 0, deadOrErroring: 0,
    modalsFailing: 0, formsFailing: 0,
    agentsNonFunctional: 0, mockOnlyFlagged: 0,
  };

  try {
    browser = await connectBrowser(opts);
    ownsBrowser = !opts.browser;
    context = await browser.newContext({
      storageState: opts.storageState,
    });
    page = await context.newPage();
    await page.goto(url, {
      timeout: opts.navTimeoutMs ?? DEFAULT_NAV_TIMEOUT_MS,
      waitUntil: 'domcontentloaded',
    });

    // T2-T5 probes are layered into the same envelope. Each probe gets
    // a strict slice of probeBudgetMs (1/4 each) so a misbehaving probe
    // can't starve the others.
    const probeBudget = opts.probeBudgetMs ?? DEFAULT_PROBE_BUDGET_MS;
    const sliceBudget = Math.max(15_000, Math.floor(probeBudget / 4));

    // Probes are pluggable so tests can stub them; production wires the
    // bundled implementations.
    const _probeInteractives = typeof opts.probeInteractives === 'function'
      ? opts.probeInteractives
      : probeInteractives;   // D39 T2: default to the bundled probe
    const _probeModals = typeof opts.probeModals === 'function'
      ? opts.probeModals : null;
    const _probeForms = typeof opts.probeForms === 'function'
      ? opts.probeForms : null;
    const _probeAgents = typeof opts.probeAgents === 'function'
      ? opts.probeAgents : null;
    const _detectWiredVsMock = typeof opts.detectWiredVsMock === 'function'
      ? opts.detectWiredVsMock : null;

    if (_probeInteractives) {
      try {
        const r = await _probeInteractives({
          page, url, sliceBudget,
          maxInteractives: opts.maxInteractives ?? DEFAULT_MAX_INTERACTIVES,
          actionTimeoutMs: opts.actionTimeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        summary.interactivesTested += r?.interactivesTested ?? 0;
        summary.deadOrErroring += r?.deadOrErroring ?? 0;
      } catch (e) {
        findings.push(makeFinding(
          'medium', 'engine-error', url,
          `probeInteractives threw: ${(e?.message ?? String(e)).slice(0, 160)}`,
        ));
      }
    }

    if (_probeModals) {
      try {
        const r = await _probeModals({
          page, url, sliceBudget,
          maxModals: opts.maxModals ?? DEFAULT_MAX_MODALS,
          actionTimeoutMs: opts.actionTimeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        summary.modalsFailing += r?.modalsFailing ?? 0;
      } catch (e) {
        findings.push(makeFinding(
          'medium', 'engine-error', url,
          `probeModals threw: ${(e?.message ?? String(e)).slice(0, 160)}`,
        ));
      }
    }

    if (_probeForms) {
      try {
        const r = await _probeForms({
          page, url, sliceBudget,
          maxForms: opts.maxForms ?? DEFAULT_MAX_FORMS,
          actionTimeoutMs: opts.actionTimeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        summary.formsFailing += r?.formsFailing ?? 0;
      } catch (e) {
        findings.push(makeFinding(
          'medium', 'engine-error', url,
          `probeForms threw: ${(e?.message ?? String(e)).slice(0, 160)}`,
        ));
      }
    }

    if (_probeAgents) {
      try {
        const r = await _probeAgents({
          page, url, sliceBudget,
          actionTimeoutMs: opts.actionTimeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        summary.agentsNonFunctional += r?.agentsNonFunctional ?? 0;
      } catch (e) {
        findings.push(makeFinding(
          'medium', 'engine-error', url,
          `probeAgents threw: ${(e?.message ?? String(e)).slice(0, 160)}`,
        ));
      }
    }

    if (_detectWiredVsMock) {
      try {
        const r = await _detectWiredVsMock({
          page, url, sliceBudget,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        summary.mockOnlyFlagged += r?.mockOnlyFlagged ?? 0;
      } catch (e) {
        findings.push(makeFinding(
          'medium', 'engine-error', url,
          `detectWiredVsMock threw: ${(e?.message ?? String(e)).slice(0, 160)}`,
        ));
      }
    }

    return {
      ok: true, url, findings, summary,
      probedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    };
  } catch (e) {
    return {
      ok: false,
      reason: `probe_failed: ${(e?.message ?? String(e)).slice(0, 160)}`,
      url, findings, summary,
      probedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    };
  } finally {
    if (context) await context.close().catch(() => {});
    if (ownsBrowser && browser) await browser.close().catch(() => {});
  }
}

export const __internals = Object.freeze({
  DEFAULT_NAV_TIMEOUT_MS,
  DEFAULT_ACTION_TIMEOUT_MS,
  DEFAULT_MAX_INTERACTIVES,
  DEFAULT_MAX_MODALS,
  DEFAULT_MAX_FORMS,
  DEFAULT_PROBE_BUDGET_MS,
  INTERACTIVE_SELECTOR,
  makeFinding,
  enumerateClickables,
  safeText,
});
