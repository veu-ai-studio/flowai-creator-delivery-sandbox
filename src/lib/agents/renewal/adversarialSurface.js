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
      ? opts.probeInteractives : null;
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
  makeFinding,
});
