// src/lib/evaluation/evaluationPipeline.js — PHASE B1 STEP 1
//
// Public entry point for the multi-evaluator evidence system. Runs four
// evaluators in parallel against a URL, collects their findings, hands
// the combined set to the normalizer, and returns the de-duplicated,
// clustered, prioritized result.
//
// Evaluators (parallel):
//   1. Phase B Playwright probe (existing — adversarialSurface.js)
//      Used when caller supplies opts.phaseBFindings or
//      opts.probeAdversarialSurface; pass-through, no re-render.
//   2. Lighthouse                (lighthouseEvaluator.js — own browser)
//   3. axe-core                  (axeEvaluator.js — needs Playwright page)
//   4. Runtime diagnostics       (runtimeDiagnostics.js — needs Playwright page)
//   5. Deep browser analysis     (deepBrowserAnalysis.js — needs Playwright page)
//
// The orchestrator (renewal/orchestrator.js) calls ONLY this function
// at the S4 step. All evaluator logic, browser management, error
// handling lives here.
//
// SSE wiring: pass opts.onStep — invoked with { type:'step',
// log:{ kind:'evaluator_complete', evaluator, findingsCount } } after
// each evaluator settles.
//
// Public:
//   runEvaluationPipeline({ url, page?, options? }) →
//     { ok, findings, stats, perEvaluator, errors }
//
// Graceful degradation: every evaluator is independently try/catch'd.
// One evaluator failing does NOT halt the pipeline. The 'errors' map
// records reasons.

import { normalizeFindings } from './findingNormalizer.js';
import { evaluatorsForTier, TIER } from './evaluationBudget.js';

/** Emit a step event via the provided callback (best-effort, never throws). */
function safeEmit(onStep, payload) {
  if (typeof onStep !== 'function') return;
  try { onStep(payload); } catch { /* swallow */ }
}

/**
 * Map findings from the existing Phase B probe to the normalizer-friendly
 * shape. Phase B emits { category, severity, location?, url?, detail }
 * already — we just need to tag source + dimension.
 */
function normalizeExistingPhaseBShape(phaseBFindings) {
  if (!Array.isArray(phaseBFindings)) return [];
  return phaseBFindings.map((f) => ({
    ...f,
    source: 'phase-b-playwright',
    evaluatorVersion: 'phase-b-1',
    confidence: typeof f.confidence === 'number' ? f.confidence : 0.85,
    evidenceType: f.evidenceType ?? f.category ?? 'phase-b',
    // Phase B's existing categories map onto CA-18 dimensions:
    //   dead-card / broken-modal / broken-form / engine-error → functional_completeness
    //   network-failure                                        → functional_completeness
    //   slow-route                                             → performance
    dimension: f.dimension
      ?? (f.category === 'slow-route' ? 'performance' : 'functional_completeness'),
  }));
}

/**
 * Strip BROWSERLESS_API_KEY from any string. Used on error messages
 * before emission so the websocket URL (which contains ?token=…) never
 * leaks through SSE / logs / governance.
 */
function redactBrowserlessToken(message) {
  const key = typeof process !== 'undefined' ? process.env?.BROWSERLESS_API_KEY : '';
  if (!key) return message;
  const s = typeof message === 'string' ? message : String(message ?? '');
  return s.split(key).join('***BROWSERLESS_TOKEN***');
}

/**
 * Acquire (or accept) a Playwright Page. If caller passed opts.page,
 * we use it. Otherwise we spin up our own chromium instance just for
 * axe + runtimeDiagnostics. Returns { page, cleanup } — cleanup is a
 * no-op when the page was caller-provided.
 *
 * PRODUCTION RULES (Vercel serverless):
 *   - When process.env.VERCEL is set, NEVER attempt chromium.launch()
 *     — there is no Chromium binary in the serverless bundle.
 *   - Always connect to Browserless via connectOverCDP when
 *     BROWSERLESS_API_KEY is set.
 *   - If both VERCEL is set AND no Browserless key: return a degraded
 *     {page:null,error} envelope. axe + runtime evaluators then return
 *     empty findings (graceful degrade, no crash).
 *
 * DEVELOPMENT (no VERCEL env):
 *   - Try Browserless first if key is set; fall through to local
 *     chromium.launch() if it isn't.
 *
 * TOKEN SAFETY:
 *   - The websocket URL (containing the token) is NEVER emitted.
 *   - Every error message is run through redactBrowserlessToken()
 *     before being surfaced.
 *
 * LIFECYCLE:
 *   - cleanup() unconditionally closes context + browser in finally.
 */
async function ensurePlaywrightPage({ url, providedPage, opts }) {
  if (providedPage) {
    return { page: providedPage, browser: null, cleanup: async () => {}, owned: false };
  }
  const isVercel = typeof process !== 'undefined' && !!process.env?.VERCEL;
  const browserlessKey = typeof process !== 'undefined' ? process.env?.BROWSERLESS_API_KEY : null;
  const connectTimeoutMs = Number.isFinite(opts?.connectTimeoutMs) ? opts.connectTimeoutMs : 15_000;
  const navTimeoutMs = Number.isFinite(opts?.gotoTimeoutMs) ? opts.gotoTimeoutMs : 30_000;

  let browser;

  // PRODUCTION: must use Browserless. No local launch attempted.
  if (browserlessKey) {
    try {
      const mod = await import('../agents/auth/browserlessAdapter.js');
      browser = await mod.connectBrowserless({
        apiKey: browserlessKey,
        timeoutMs: connectTimeoutMs,
      });
    } catch (e) {
      const msg = redactBrowserlessToken(`browserless_connect_failed:${(e?.message ?? String(e)).slice(0, 160)}`);
      // In production we never fall through to chromium.launch().
      if (isVercel) {
        return { page: null, browser: null, cleanup: async () => {}, owned: false, error: msg };
      }
      // Dev: fall through to local launch.
    }
  } else if (isVercel) {
    // Production with no Browserless key configured → graceful degrade.
    return {
      page: null, browser: null, cleanup: async () => {}, owned: false,
      error: 'browserless_unavailable_in_production:BROWSERLESS_API_KEY_not_set',
    };
  }

  // Local-launch path (DEV only, or when Browserless not configured AND
  // we are not running under Vercel).
  if (!browser) {
    let chromium;
    try {
      const playwrightDep = opts?.deps?.playwright;
      if (playwrightDep) {
        chromium = playwrightDep.chromium ?? playwrightDep;
      } else {
        const pw = await import('playwright');
        chromium = pw.chromium;
      }
    } catch (e) {
      return { page: null, browser: null, cleanup: async () => {}, owned: false, error: `playwright_import_failed:${e?.message}` };
    }
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
        timeout: connectTimeoutMs,
      });
    } catch (e) {
      return { page: null, browser: null, cleanup: async () => {}, owned: false, error: redactBrowserlessToken(`playwright_launch_failed:${(e?.message ?? String(e)).slice(0, 160)}`) };
    }
  }

  let context, page;
  try {
    context = await browser.newContext(opts?.contextOptions ?? {});
    page = await context.newPage();
    page.setDefaultNavigationTimeout?.(navTimeoutMs);
    page.setDefaultTimeout?.(navTimeoutMs);
  } catch (e) {
    try { await browser.close(); } catch { /* ignore */ }
    return { page: null, browser: null, cleanup: async () => {}, owned: false, error: redactBrowserlessToken(`playwright_page_failed:${e?.message}`) };
  }
  return {
    page,
    browser,
    cleanup: async () => {
      try { await context.close(); } catch { /* ignore */ }
      try { await browser.close(); } catch { /* ignore */ }
    },
    owned: true,
  };
}

/**
 * Run axe + runtimeDiagnostics serially on the SAME page (they share
 * state — runtime diagnostics needs listeners attached BEFORE the
 * page navigates; axe runs AFTER navigation settles).
 *
 * Returns { axe, runtime, deep }.
 */
async function runPlaywrightEvaluators({ page, url, opts }) {
  const enableDeep = opts?.enableDeepBrowserAnalysis === true;
  const out = { axe: { ok: false, findings: [], error: 'not_run' },
                runtime: { ok: false, findings: [], error: 'not_run' },
                deep: { ok: false, findings: [], error: 'not_run' } };
  if (!page) {
    out.axe.error = 'no_page';
    out.runtime.error = 'no_page';
    out.deep.error = 'no_page';
    return out;
  }

  // Lazy-import (so the pipeline file itself stays cheap to import even
  // when the orchestrator skips Playwright).
  const { attachRuntimeDiagnostics } = await import('./runtimeDiagnostics.js');
  const { runAxeEvaluator } = await import('./axeEvaluator.js');
  const { createDeepBrowserAnalysisProbe } = enableDeep
    ? await import('./deepBrowserAnalysis.js')
    : { createDeepBrowserAnalysisProbe: null };

  const rtProbe = attachRuntimeDiagnostics(page);
  const deepProbe = enableDeep ? createDeepBrowserAnalysisProbe(page, { url }) : null;
  // Navigate (or skip if caller already navigated).
  try {
    if (opts?.skipNavigate !== true) {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: opts?.gotoTimeoutMs ?? 30_000,
      });
    }
    // Small settle delay to capture async errors fired right after load.
    await new Promise((r) => setTimeout(r, opts?.postNavWaitMs ?? 1500));
  } catch (e) {
    // Capture whatever we got before bailing.
    const rt = await rtProbe.stop({ url });
    const deep = deepProbe
      ? await deepProbe.stop({ url, ...(opts?.deepBrowserAnalysis ?? {}) })
      : out.deep;
    out.runtime = rt;
    out.deep = deep;
    out.axe = { ok: false, findings: [], error: `nav_failed:${(e?.message ?? String(e)).slice(0, 160)}` };
    return out;
  }

  // Axe runs first while the page is settled.
  out.axe = await runAxeEvaluator({ page, url, opts: opts?.axe });

  // Then we close runtime capture (after axe done so any axe-injected
  // console messages also land in the capture).
  out.runtime = await rtProbe.stop({ url });
  if (deepProbe) out.deep = await deepProbe.stop({ url, ...(opts?.deepBrowserAnalysis ?? {}) });
  return out;
}

/**
 * Run Lighthouse — strictly parallel-safe (it owns its own Chrome).
 */
async function runLighthouseSafely({ url, opts }) {
  try {
    const { runLighthouseEvaluator } = await import('./lighthouseEvaluator.js');
    return await runLighthouseEvaluator(url, opts?.lighthouse ?? {});
  } catch (e) {
    return { ok: false, findings: [], error: (e?.message ?? String(e)).slice(0, 200) };
  }
}

/**
 * Main entry point.
 *
 * @param {object} args
 * @param {string} args.url                       — target URL
 * @param {object} [args.page]                    — optional Playwright Page; pipeline spins up its own if absent
 * @param {object} [args.options]
 * @param {function} [args.options.onStep]        — SSE step emitter (envelope detailed at top of file)
 * @param {Array<string>} [args.options.evaluators] — subset of ['phase-b','lighthouse','axe','runtime','deep-browser-analysis']
 * @param {Array} [args.options.phaseBFindings]    — pass-through findings from existing Phase B probe
 * @param {object} [args.options.deps]             — overrides for tests
 * @returns {Promise<{ok, findings, stats, perEvaluator, errors}>}
 */
export async function runEvaluationPipeline({ url, page, options = {} } = {}) {
  if (typeof url !== 'string' || !url.trim()) {
    return { ok: false, findings: [], stats: null, perEvaluator: {}, errors: { _: 'url_required' } };
  }
  const onStep = options.onStep;
  // PART B — Evaluation budget tiering. An explicit options.evaluators wins.
  // Otherwise an options.evaluationTier (TIER_1/2/3 from evaluationBudget.js)
  // selects the evaluator allowlist. Default = full stack (back-compat).
  const tier = typeof options.evaluationTier === 'string' ? options.evaluationTier : null;
  const evaluatorList = Array.isArray(options.evaluators) && options.evaluators.length > 0
    ? options.evaluators
    : (tier ? evaluatorsForTier(tier) : ['phase-b', 'lighthouse', 'axe', 'runtime', 'deep-browser-analysis']);
  const enabled = new Set(evaluatorList);

  const errors = {};
  const perEvaluator = {};
  const evaluatorMetrics = {};
  const findingsByEvaluator = {};

  // 1. Phase B — pass-through (the existing probe runs upstream in the
  //    orchestrator's STEP 4 today; we re-use its findings here).
  if (enabled.has('phase-b')) {
    const incoming = normalizeExistingPhaseBShape(options.phaseBFindings ?? []);
    findingsByEvaluator['phase-b-playwright'] = incoming;
    perEvaluator['phase-b-playwright'] = incoming.length;
    safeEmit(onStep, {
      type: 'step',
      log: {
        kind: 'evaluator_complete',
        evaluator: 'phase-b-playwright',
        findingsCount: incoming.length,
      },
    });
  }

  // 2-4. Parallel: lighthouse (own Chrome), axe + runtime (shared Playwright page).
  const tasks = [];

  if (enabled.has('lighthouse')) {
    tasks.push(
      runLighthouseSafely({ url, opts: options }).then((res) => {
        findingsByEvaluator['lighthouse'] = res.ok ? res.findings : [];
        perEvaluator['lighthouse'] = res.findings.length;
        evaluatorMetrics['lighthouse'] = { scores: res.scores ?? {} };
        if (!res.ok && res.error) errors['lighthouse'] = res.error;
        safeEmit(onStep, {
          type: 'step',
          log: {
            kind: 'evaluator_complete',
            evaluator: 'lighthouse',
            findingsCount: res.findings.length,
            ok: !!res.ok,
            error: res.ok ? null : res.error,
          },
        });
      }),
    );
  }

  const needPlaywright = enabled.has('axe') || enabled.has('runtime') || enabled.has('deep-browser-analysis');
  let pwSlot;
  if (needPlaywright) {
    tasks.push((async () => {
      pwSlot = await ensurePlaywrightPage({ url, providedPage: page, opts: options });
      if (pwSlot.error) {
        const safeError = redactBrowserlessToken(pwSlot.error);
        errors['playwright'] = safeError;
        if (enabled.has('axe')) {
          findingsByEvaluator['axe-core'] = [];
          perEvaluator['axe-core'] = 0;
          safeEmit(onStep, { type: 'step', log: { kind: 'evaluator_complete', evaluator: 'axe-core', findingsCount: 0, ok: false, error: safeError } });
        }
        if (enabled.has('runtime')) {
          findingsByEvaluator['runtime-diagnostics'] = [];
          perEvaluator['runtime-diagnostics'] = 0;
          safeEmit(onStep, { type: 'step', log: { kind: 'evaluator_complete', evaluator: 'runtime-diagnostics', findingsCount: 0, ok: false, error: safeError } });
        }
        if (enabled.has('deep-browser-analysis')) {
          findingsByEvaluator['deep-browser-analysis'] = [];
          perEvaluator['deep-browser-analysis'] = 0;
          evaluatorMetrics['deep-browser-analysis'] = {
            ok: false,
            error: safeError,
            summary: {
              status: 'unavailable',
              reason: safeError,
              consoleCount: 0,
              networkCount: 0,
              scriptCount: 0,
              stylesheetCount: 0,
            },
            frameworkDetection: {
              framework: 'unknown',
              confidence: 'LOW',
              evidence: ['Playwright page unavailable; deep browser analysis could not run.'],
            },
            assetInventory: {},
            consoleFindings: [],
            networkFindings: [],
            accessibilityFindings: null,
          };
          safeEmit(onStep, { type: 'step', log: { kind: 'evaluator_complete', evaluator: 'deep-browser-analysis', findingsCount: 0, ok: false, error: safeError } });
        }
        return;
      }
      // DISPATCH (Browserless) — unconditional cleanup in finally so a
      // throw during axe/runtime never leaves a remote Browserless
      // session open (the service would idle-reap it, but burning
      // those minutes is wasteful).
      let pwResult;
      try {
        pwResult = await runPlaywrightEvaluators({
          page: pwSlot.page,
          url,
          opts: { ...options, enableDeepBrowserAnalysis: enabled.has('deep-browser-analysis') },
        });
      } finally {
        if (pwSlot?.owned) {
          try { await pwSlot.cleanup(); } catch { /* ignore */ }
        }
      }
      if (enabled.has('axe')) {
        findingsByEvaluator['axe-core'] = pwResult.axe.findings ?? [];
        perEvaluator['axe-core'] = (pwResult.axe.findings ?? []).length;
        evaluatorMetrics['axe-core'] = { violations: perEvaluator['axe-core'] };
        if (!pwResult.axe.ok && pwResult.axe.error) errors['axe-core'] = pwResult.axe.error;
        safeEmit(onStep, {
          type: 'step',
          log: {
            kind: 'evaluator_complete',
            evaluator: 'axe-core',
            findingsCount: perEvaluator['axe-core'],
            ok: !!pwResult.axe.ok,
            error: pwResult.axe.ok ? null : pwResult.axe.error,
          },
        });
      }
      if (enabled.has('runtime')) {
        findingsByEvaluator['runtime-diagnostics'] = pwResult.runtime.findings ?? [];
        perEvaluator['runtime-diagnostics'] = (pwResult.runtime.findings ?? []).length;
        evaluatorMetrics['runtime-diagnostics'] = {
          findings: perEvaluator['runtime-diagnostics'],
          raw: pwResult.runtime.raw ?? null,
        };
        if (!pwResult.runtime.ok && pwResult.runtime.error) errors['runtime-diagnostics'] = pwResult.runtime.error;
        safeEmit(onStep, {
          type: 'step',
          log: {
            kind: 'evaluator_complete',
            evaluator: 'runtime-diagnostics',
            findingsCount: perEvaluator['runtime-diagnostics'],
            ok: !!pwResult.runtime.ok,
            error: pwResult.runtime.ok ? null : pwResult.runtime.error,
          },
        });
      }
      if (enabled.has('deep-browser-analysis')) {
        findingsByEvaluator['deep-browser-analysis'] = pwResult.deep.findings ?? [];
        perEvaluator['deep-browser-analysis'] = (pwResult.deep.findings ?? []).length;
        evaluatorMetrics['deep-browser-analysis'] = {
          ok: !!pwResult.deep.ok,
          summary: pwResult.deep.summary ?? {},
          frameworkDetection: pwResult.deep.frameworkDetection ?? null,
          assetInventory: pwResult.deep.assetInventory ?? {},
          consoleFindings: pwResult.deep.consoleFindings ?? [],
          networkFindings: pwResult.deep.networkFindings ?? [],
          accessibilityFindings: pwResult.deep.accessibilityFindings ?? null,
        };
        if (!pwResult.deep.ok && pwResult.deep.error) errors['deep-browser-analysis'] = pwResult.deep.error;
        safeEmit(onStep, {
          type: 'step',
          log: {
            kind: 'evaluator_complete',
            evaluator: 'deep-browser-analysis',
            findingsCount: perEvaluator['deep-browser-analysis'],
            ok: !!pwResult.deep.ok,
            error: pwResult.deep.ok ? null : pwResult.deep.error,
          },
        });
      }
      // Cleanup moved into finally above so a throw during evaluator
      // execution still releases the Browserless session.
    })());
  }

  await Promise.allSettled(tasks);

  const { findings, stats } = normalizeFindings(findingsByEvaluator);
  const { generateDomFixProposals } = await import('../remediation/domFixProposalGenerator.js');
  const deepBrowserAnalysis = evaluatorMetrics['deep-browser-analysis'] ?? null;
  const fixProposals = generateDomFixProposals({ findings, deepBrowserAnalysis });

  return {
    ok: Object.values(errors).length === 0,
    findings,
    stats: {
      ...stats,
      perEvaluatorRaw: perEvaluator,
      evaluatorMetrics,
      // PART B — tier tag for callers aggregating tier1Count / tier2Count /
      // tier3Count across a multi-page evaluation pass.
      evaluationTier: tier,
      evaluators: Array.from(enabled),
    },
    deepBrowserAnalysis,
    fixProposals,
    perEvaluator,
    errors,
  };
}

export const __internals = Object.freeze({
  normalizeExistingPhaseBShape,
  TIER,
});
