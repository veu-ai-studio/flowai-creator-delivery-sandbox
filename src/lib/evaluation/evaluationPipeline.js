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
 * Acquire (or accept) a Playwright Page. If caller passed opts.page,
 * we use it. Otherwise we spin up our own chromium instance just for
 * axe + runtimeDiagnostics. Returns { page, cleanup } — cleanup is a
 * no-op when the page was caller-provided.
 *
 * Graceful: returns { page: null, cleanup: noop, error } if Playwright
 * isn't available or launch fails. axe + runtime evaluators then return
 * empty findings.
 */
async function ensurePlaywrightPage({ url, providedPage, opts }) {
  if (providedPage) {
    return { page: providedPage, browser: null, cleanup: async () => {}, owned: false };
  }
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
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (e) {
    return { page: null, browser: null, cleanup: async () => {}, owned: false, error: `playwright_launch_failed:${(e?.message ?? String(e)).slice(0, 160)}` };
  }
  let context, page;
  try {
    context = await browser.newContext(opts?.contextOptions ?? {});
    page = await context.newPage();
  } catch (e) {
    try { await browser.close(); } catch { /* ignore */ }
    return { page: null, browser: null, cleanup: async () => {}, owned: false, error: `playwright_page_failed:${e?.message}` };
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
 * Returns { axe: {ok, findings, error?}, runtime: {ok, findings, error?} }.
 */
async function runPlaywrightEvaluators({ page, url, opts }) {
  const out = { axe: { ok: false, findings: [], error: 'not_run' },
                runtime: { ok: false, findings: [], error: 'not_run' } };
  if (!page) {
    out.axe.error = 'no_page';
    out.runtime.error = 'no_page';
    return out;
  }

  // Lazy-import (so the pipeline file itself stays cheap to import even
  // when the orchestrator skips Playwright).
  const { attachRuntimeDiagnostics } = await import('./runtimeDiagnostics.js');
  const { runAxeEvaluator } = await import('./axeEvaluator.js');

  const rtProbe = attachRuntimeDiagnostics(page);
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
    out.runtime = rt;
    out.axe = { ok: false, findings: [], error: `nav_failed:${(e?.message ?? String(e)).slice(0, 160)}` };
    return out;
  }

  // Axe runs first while the page is settled.
  out.axe = await runAxeEvaluator({ page, url, opts: opts?.axe });

  // Then we close runtime capture (after axe done so any axe-injected
  // console messages also land in the capture).
  out.runtime = await rtProbe.stop({ url });
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
 * @param {Array<string>} [args.options.evaluators] — subset of ['phase-b','lighthouse','axe','runtime']
 * @param {Array} [args.options.phaseBFindings]    — pass-through findings from existing Phase B probe
 * @param {object} [args.options.deps]             — overrides for tests
 * @returns {Promise<{ok, findings, stats, perEvaluator, errors}>}
 */
export async function runEvaluationPipeline({ url, page, options = {} } = {}) {
  if (typeof url !== 'string' || !url.trim()) {
    return { ok: false, findings: [], stats: null, perEvaluator: {}, errors: { _: 'url_required' } };
  }
  const onStep = options.onStep;
  const enabled = new Set(Array.isArray(options.evaluators) && options.evaluators.length > 0
    ? options.evaluators
    : ['phase-b', 'lighthouse', 'axe', 'runtime']);

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

  const needPlaywright = enabled.has('axe') || enabled.has('runtime');
  let pwSlot;
  if (needPlaywright) {
    tasks.push((async () => {
      pwSlot = await ensurePlaywrightPage({ url, providedPage: page, opts: options });
      if (pwSlot.error) {
        errors['playwright'] = pwSlot.error;
        if (enabled.has('axe')) {
          findingsByEvaluator['axe-core'] = [];
          perEvaluator['axe-core'] = 0;
          safeEmit(onStep, { type: 'step', log: { kind: 'evaluator_complete', evaluator: 'axe-core', findingsCount: 0, ok: false, error: pwSlot.error } });
        }
        if (enabled.has('runtime')) {
          findingsByEvaluator['runtime-diagnostics'] = [];
          perEvaluator['runtime-diagnostics'] = 0;
          safeEmit(onStep, { type: 'step', log: { kind: 'evaluator_complete', evaluator: 'runtime-diagnostics', findingsCount: 0, ok: false, error: pwSlot.error } });
        }
        return;
      }
      const pwResult = await runPlaywrightEvaluators({ page: pwSlot.page, url, opts: options });
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
      if (pwSlot.owned) {
        try { await pwSlot.cleanup(); } catch { /* ignore */ }
      }
    })());
  }

  await Promise.allSettled(tasks);

  const { findings, stats } = normalizeFindings(findingsByEvaluator);

  return {
    ok: Object.values(errors).length === 0,
    findings,
    stats: { ...stats, perEvaluatorRaw: perEvaluator, evaluatorMetrics },
    perEvaluator,
    errors,
  };
}

export const __internals = Object.freeze({
  normalizeExistingPhaseBShape,
});
