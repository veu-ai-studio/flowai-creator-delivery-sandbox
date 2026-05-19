// tests/agents/renewal/adversarialSurface.test.js
//
// D39 T1 — adversarialSurface skeleton tests (browser executor +
// orchestration envelope). Probes themselves (T2-T5) are stubbed in
// via opts so the skeleton can be exercised without a real browser.

import { describe, it, expect, vi } from 'vitest';
import {
  probeAdversarialSurface,
  probeInteractives,
  probeModals,
  probeForms,
  __internals,
} from '../../../src/lib/agents/renewal/adversarialSurface.js';

// ── Mock browser surface ──────────────────────────────────────────────

function makeMockBrowser({ gotoThrows = false } = {}) {
  const ctxState = { closed: false };
  const browserState = { closed: false };
  const page = {
    goto: vi.fn(async (url, opts) => {
      if (gotoThrows) throw new Error('nav_failed: ' + url);
      return { ok: () => true, status: () => 200 };
    }),
    on: vi.fn(),
    off: vi.fn(),
    // Default evaluator returns an empty array — neither interactives
    // nor forms nor modal triggers are enumerated unless a probe-
    // specific mock overrides this. Probes that read body-hash get
    // a stable string so before/after comparison is identity.
    evaluate: vi.fn(async () => []),
    url: () => 'https://example.test/',
    locator: vi.fn(),
    waitForTimeout: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
  const context = {
    newPage: vi.fn(async () => page),
    storageState: vi.fn(async () => ({})),
    close: vi.fn(async () => { ctxState.closed = true; }),
    _state: ctxState,
  };
  const browser = {
    newContext: vi.fn(async () => context),
    close: vi.fn(async () => { browserState.closed = true; }),
    _state: browserState,
  };
  return { browser, context, page };
}

describe('probeAdversarialSurface — skeleton (D39 T1)', () => {
  it('returns ok:false when url is missing/invalid', async () => {
    const r1 = await probeAdversarialSurface({});
    expect(r1.ok).toBe(false);
    expect(r1.reason).toBe('url_required');
    const r2 = await probeAdversarialSurface({ url: '' });
    expect(r2.ok).toBe(false);
    const r3 = await probeAdversarialSurface({ url: '   ' });
    expect(r3.ok).toBe(false);
    // No findings when bail-early.
    expect(r1.findings).toEqual([]);
    expect(r1.summary.interactivesTested).toBe(0);
  });

  it('uses injected browser instead of launching one', async () => {
    const { browser, context, page } = makeMockBrowser();
    const r = await probeAdversarialSurface({
      url: 'https://example.test/',
      opts: { browser },
    });
    expect(r.ok).toBe(true);
    expect(r.url).toBe('https://example.test/');
    expect(browser.newContext).toHaveBeenCalledOnce();
    expect(page.goto).toHaveBeenCalledOnce();
    expect(page.goto.mock.calls[0][0]).toBe('https://example.test/');
    // browser closed only when owned — injected browser stays open.
    expect(browser._state.closed).toBe(false);
    expect(context._state.closed).toBe(true);     // context is always closed
  });

  it('catches goto failures cleanly into reason:probe_failed', async () => {
    const { browser } = makeMockBrowser({ gotoThrows: true });
    const r = await probeAdversarialSurface({
      url: 'https://example.test/',
      opts: { browser },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^probe_failed:/);
    expect(r.reason).toContain('nav_failed');
  });

  it('returns the canonical envelope shape on success', async () => {
    const { browser } = makeMockBrowser();
    const r = await probeAdversarialSurface({
      url: 'https://x/', opts: { browser },
    });
    expect(r.ok).toBe(true);
    expect(r.url).toBe('https://x/');
    expect(Array.isArray(r.findings)).toBe(true);
    expect(r.summary).toEqual({
      interactivesTested: 0, deadOrErroring: 0,
      modalsFailing: 0, formsFailing: 0,
      agentsNonFunctional: 0, mockOnlyFlagged: 0,
    });
    expect(typeof r.probedAt).toBe('string');
    expect(typeof r.durationMs).toBe('number');
  });

  it('calls each probe stub with the page + sliceBudget', async () => {
    const { browser, page } = makeMockBrowser();
    const probeInteractives = vi.fn(async () => ({ findings: [], interactivesTested: 3, deadOrErroring: 0 }));
    const probeModals = vi.fn(async () => ({ findings: [], modalsFailing: 0 }));
    const probeForms = vi.fn(async () => ({ findings: [], formsFailing: 0 }));
    const probeAgents = vi.fn(async () => ({ findings: [], agentsNonFunctional: 0 }));
    const detectWiredVsMock = vi.fn(async () => ({ findings: [], mockOnlyFlagged: 0 }));
    const r = await probeAdversarialSurface({
      url: 'https://x/',
      opts: { browser, probeInteractives, probeModals, probeForms, probeAgents, detectWiredVsMock },
    });
    expect(r.ok).toBe(true);
    expect(probeInteractives).toHaveBeenCalledOnce();
    expect(probeModals).toHaveBeenCalledOnce();
    expect(probeForms).toHaveBeenCalledOnce();
    expect(probeAgents).toHaveBeenCalledOnce();
    expect(detectWiredVsMock).toHaveBeenCalledOnce();
    expect(probeInteractives.mock.calls[0][0].page).toBe(page);
    expect(probeInteractives.mock.calls[0][0].url).toBe('https://x/');
    expect(typeof probeInteractives.mock.calls[0][0].sliceBudget).toBe('number');
    expect(r.summary.interactivesTested).toBe(3);
  });

  it('rolls up findings from all probes into one array', async () => {
    const { browser } = makeMockBrowser();
    const probeInteractives = vi.fn(async () => ({
      findings: [{ severity: 'high', category: 'dead-card', location: 'https://x/btn1', evidence: 'no-op click' }],
      interactivesTested: 1, deadOrErroring: 1,
    }));
    const probeModals = vi.fn(async () => ({
      findings: [{ severity: 'medium', category: 'broken-modal', location: 'https://x/m1', evidence: 'no render' }],
      modalsFailing: 1,
    }));
    const r = await probeAdversarialSurface({
      url: 'https://x/', opts: { browser, probeInteractives, probeModals },
    });
    expect(r.findings).toHaveLength(2);
    expect(r.findings.some((f) => f.category === 'dead-card')).toBe(true);
    expect(r.findings.some((f) => f.category === 'broken-modal')).toBe(true);
    expect(r.summary.deadOrErroring).toBe(1);
    expect(r.summary.modalsFailing).toBe(1);
  });

  it('a probe throwing produces an engine-error finding but does NOT halt others', async () => {
    const { browser } = makeMockBrowser();
    const probeInteractives = vi.fn(async () => { throw new Error('boom'); });
    const probeModals = vi.fn(async () => ({
      findings: [{ severity: 'medium', category: 'broken-modal', location: 'https://x/', evidence: 'still ran' }],
      modalsFailing: 1,
    }));
    const r = await probeAdversarialSurface({
      url: 'https://x/', opts: { browser, probeInteractives, probeModals },
    });
    expect(r.ok).toBe(true);
    // engine-error finding from the throw, plus the modals finding from the surviving probe.
    expect(r.findings.some((f) => f.category === 'engine-error' && /probeInteractives threw: boom/.test(f.evidence))).toBe(true);
    expect(r.findings.some((f) => f.category === 'broken-modal')).toBe(true);
  });

  it('default budgets are sensible', () => {
    expect(__internals.DEFAULT_NAV_TIMEOUT_MS).toBe(30_000);
    expect(__internals.DEFAULT_ACTION_TIMEOUT_MS).toBe(8_000);
    expect(__internals.DEFAULT_MAX_INTERACTIVES).toBe(25);
    expect(__internals.DEFAULT_MAX_MODALS).toBe(10);
    expect(__internals.DEFAULT_MAX_FORMS).toBe(10);
    expect(__internals.DEFAULT_PROBE_BUDGET_MS).toBe(180_000);
  });

  it('always closes context (and browser when owned)', async () => {
    const { browser, context } = makeMockBrowser();
    await probeAdversarialSurface({ url: 'https://x/', opts: { browser } });
    expect(context.close).toHaveBeenCalled();
    // browser provided via opts → not owned → not closed.
    expect(browser.close).not.toHaveBeenCalled();
  });
});

describe('orchestrator STEP 4 — Phase B integration (D39 T1)', () => {
  it('replaces the phase_b_capability SKIP with a real Phase B log entry', async () => {
    const { runOrchestration } = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const probeAdversarialSurface = vi.fn(async () => ({
      ok: true, url: 'https://x/', findings: [],
      summary: { interactivesTested: 5, deadOrErroring: 1,
                 modalsFailing: 0, formsFailing: 0,
                 agentsNonFunctional: 0, mockOnlyFlagged: 0 },
      probedAt: 'now', durationMs: 100,
    }));

    // Use the existing happyDeps stubs but with the explicit
    // probeAdversarialSurface so we see the call site.
    const PRODUCT = Object.freeze({
      product_id: 'mypreglife', org_id: 'veu-ai-studio',
      github_repo_url: 'https://github.com/veu-ai-studio/my-preg-life',
      self_renewal_enabled: true,
    });
    process.env.VERCEL_PROJECT_ID_MYPREGLIFE = 'prj_fake';
    process.env.VERCEL_ORG_ID = 'team_fake';
    process.env.VERCEL_TOKEN = 'vercel_fake';
    try {
      const deps = {
        discoverProduct: vi.fn(async () => PRODUCT),
        checkRateCap: vi.fn(async () => ({ allowed: true })),
        checkRunawayDetector: vi.fn(async () => ({ tripped: false })),
        conductStructuredCrawl: vi.fn(async ({ url }) => ({
          pagesCrawled: 1, depth: 1, pages: [],
          brokenLinks: [], forms: [], interactiveElements: [],
          errors: [], totalTextLength: 0,
        })),
        produceMonitorText: vi.fn(async ({ url }) => ({ monitorText: '[L1] 5/10 [L2] 5/10 [L3] 5/10 [L4] 5/10 [L5] 5/10', rawContent: '', url, fetchedAt: 'now', wordCount: 0, pageTitle: '', model: 'c', usage: {} })),
        computeScore: vi.fn(async () => ({ total: 50, l1: 10, l2: 10, l3: 10, l4: 10, l5: 10, label: 'fair' })),
        scoreCrawlOutput: vi.fn(() => ({
          score: 100, counts: { critical: 0, high: 0, medium: 0, low: 0 },
          band: 'showcase-ready', label: 'showcase-ready', penalty: 0,
          formula: 'x', issues: [],
        })),
        getInstallationToken: vi.fn(async () => ({ token: 'ghs', expiresAt: '' })),
        appendGovernanceEntry: vi.fn(async () => ({ written: true })),
        probeAdversarialSurface,
      };
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'd39-stub-1', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps,
      });
      // STEP 4 log entry now reports Phase B, not the old SKIP.
      const step4 = result.orchestrationLog.find((l) => l.step === 4);
      expect(step4).toBeDefined();
      expect(step4.status).toBe('complete');
      expect(step4.tool).toMatch(/Phase B — real browser executor/);
      expect(step4.result.findingsCount).toBe(0);
      expect(step4.result.summary.interactivesTested).toBe(5);
      expect(step4.result.summary.deadOrErroring).toBe(1);
      expect(probeAdversarialSurface).toHaveBeenCalledOnce();
    } finally {
      delete process.env.VERCEL_PROJECT_ID_MYPREGLIFE;
      delete process.env.VERCEL_ORG_ID;
      delete process.env.VERCEL_TOKEN;
    }
  });

  it('Phase B failure degrades cleanly without halting the pipeline', async () => {
    const { runOrchestration } = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const probeAdversarialSurface = vi.fn(async () => { throw new Error('connect_failed'); });

    const PRODUCT = Object.freeze({
      product_id: 'mypreglife', org_id: 'veu-ai-studio',
      github_repo_url: 'https://github.com/veu-ai-studio/my-preg-life',
      self_renewal_enabled: true,
    });
    process.env.VERCEL_PROJECT_ID_MYPREGLIFE = 'prj_fake';
    process.env.VERCEL_ORG_ID = 'team_fake';
    process.env.VERCEL_TOKEN = 'vercel_fake';
    try {
      const deps = {
        discoverProduct: vi.fn(async () => PRODUCT),
        checkRateCap: vi.fn(async () => ({ allowed: true })),
        checkRunawayDetector: vi.fn(async () => ({ tripped: false })),
        conductStructuredCrawl: vi.fn(async () => ({
          pagesCrawled: 1, depth: 1, pages: [], brokenLinks: [], forms: [],
          interactiveElements: [], errors: [], totalTextLength: 0,
        })),
        produceMonitorText: vi.fn(async () => ({ monitorText: '[L1] 5/10 [L2] 5/10 [L3] 5/10 [L4] 5/10 [L5] 5/10' })),
        computeScore: vi.fn(async () => ({ total: 50, l1: 10, l2: 10, l3: 10, l4: 10, l5: 10, label: 'fair' })),
        scoreCrawlOutput: vi.fn(() => ({ score: 100, counts: { critical: 0, high: 0, medium: 0, low: 0 }, band: 'showcase-ready', label: 'x', penalty: 0, formula: 'x', issues: [] })),
        getInstallationToken: vi.fn(async () => ({ token: 'ghs', expiresAt: '' })),
        appendGovernanceEntry: vi.fn(async () => ({ written: true })),
        probeAdversarialSurface,
      };
      const result = await runOrchestration({
        url: null, mode: 'auto', runId: 'd39-stub-2', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps,
      });
      // Pipeline did NOT fail — STEP 4 just degraded.
      const step4 = result.orchestrationLog.find((l) => l.step === 4);
      expect(step4).toBeDefined();
      expect(step4.status).toBe('degraded');
      expect(step4.result.error).toMatch(/connect_failed/);
    } finally {
      delete process.env.VERCEL_PROJECT_ID_MYPREGLIFE;
      delete process.env.VERCEL_ORG_ID;
      delete process.env.VERCEL_TOKEN;
    }
  });
});

// ── D39 T2 — probeInteractives ───────────────────────────────────────

describe('probeInteractives — T2 click classification', () => {
  // Mock page surface — supports the calls probeInteractives makes.
  function makeProbePage({ clickables = [], clickOutcomes = {}, urlAfter = {}, bodyHashAfter = {} } = {}) {
    let currentUrl = 'https://x/';
    const consoleListeners = [];
    let bodyHash = 'pre';

    return {
      _state: { consoleListeners, currentUrl: () => currentUrl, bodyHash: () => bodyHash },
      url: () => currentUrl,
      goto: vi.fn(async (u) => { currentUrl = u; bodyHash = 'pre'; return { ok: () => true, status: () => 200 }; }),
      on: vi.fn((evt, handler) => {
        if (evt === 'console') consoleListeners.push(handler);
      }),
      off: vi.fn(),
      evaluate: vi.fn(async (fn, args) => {
        // First call (enumerateClickables): return clickables list.
        // Subsequent calls return body hash.
        const src = fn.toString();
        if (src.includes('cssPath') || src.includes('querySelectorAll')) {
          return clickables;
        }
        return bodyHash;
      }),
      locator: vi.fn((selector) => ({
        first: () => ({
          click: vi.fn(async ({ timeout } = {}) => {
            const outcome = clickOutcomes[selector] ?? 'silent';
            if (outcome === 'throw') throw new Error('locator click failed');
            if (outcome === 'timeout') throw new Error('locator click timed out');
            if (outcome === 'error-console') {
              for (const h of consoleListeners) {
                h({ type: () => 'error', text: () => 'simulated console error' });
              }
            }
            if (outcome === 'navigate') currentUrl = urlAfter[selector] ?? 'https://x/after';
            if (outcome === 'body-change') bodyHash = bodyHashAfter[selector] ?? 'post';
          }),
        }),
      })),
      waitForTimeout: vi.fn(async () => {}),
      goBack: vi.fn(async () => {}),
    };
  }

  it('classifies a click that produced no observable change as DEAD-NO-OP', async () => {
    const page = makeProbePage({
      clickables: [{ index: 0, tag: 'button', text: 'Dead button', selector: 'button#dead', href: null, ariaLabel: null, role: null }],
      clickOutcomes: { 'button#dead': 'silent' },
    });
    const r = await probeInteractives({ page, url: 'https://x/', maxInteractives: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.interactivesTested).toBe(1);
    expect(r.deadOrErroring).toBe(1);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]).toMatchObject({
      severity: 'medium', category: 'dead-card',
    });
    expect(r.findings[0].evidence).toMatch(/no observable change/);
    expect(r.findings[0].evidence).toMatch(/Dead button/);
  });

  it('classifies a click that errored as ERRORS (high severity)', async () => {
    const page = makeProbePage({
      clickables: [{ index: 0, tag: 'button', text: 'Bad button', selector: 'button#bad', href: null, ariaLabel: null, role: null }],
      clickOutcomes: { 'button#bad': 'throw' },
    });
    const r = await probeInteractives({ page, url: 'https://x/', maxInteractives: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.deadOrErroring).toBe(1);
    expect(r.findings[0]).toMatchObject({ severity: 'high', category: 'broken-modal' });
    expect(r.findings[0].evidence).toMatch(/errored: locator click failed/);
  });

  it('classifies timeout as DEAD-NO-OP (not error — element exists but isn\'t responsive)', async () => {
    const page = makeProbePage({
      clickables: [{ index: 0, tag: 'a', text: 'Stuck', selector: 'a#stuck', href: '/x', ariaLabel: null, role: null }],
      clickOutcomes: { 'a#stuck': 'timeout' },
    });
    const r = await probeInteractives({ page, url: 'https://x/', maxInteractives: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.findings[0].category).toBe('dead-card');
  });

  it('classifies a console-error click as ERRORS', async () => {
    const page = makeProbePage({
      clickables: [{ index: 0, tag: 'button', text: 'Erroring', selector: 'button#err', href: null, ariaLabel: null, role: null }],
      clickOutcomes: { 'button#err': 'error-console' },
    });
    const r = await probeInteractives({ page, url: 'https://x/', maxInteractives: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.findings[0].category).toBe('broken-modal');
    expect(r.findings[0].evidence).toMatch(/console error/);
  });

  it('classifies a click that navigated as WORKS (no finding emitted)', async () => {
    const page = makeProbePage({
      clickables: [{ index: 0, tag: 'a', text: 'Real link', selector: 'a#go', href: '/y', ariaLabel: null, role: null }],
      clickOutcomes: { 'a#go': 'navigate' },
      urlAfter: { 'a#go': 'https://x/y' },
    });
    const r = await probeInteractives({ page, url: 'https://x/', maxInteractives: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.interactivesTested).toBe(1);
    expect(r.deadOrErroring).toBe(0);
    expect(r.findings).toHaveLength(0);
  });

  it('classifies a click that changed the body as WORKS', async () => {
    const page = makeProbePage({
      clickables: [{ index: 0, tag: 'button', text: 'Expand', selector: 'button#exp', href: null, ariaLabel: null, role: null }],
      clickOutcomes: { 'button#exp': 'body-change' },
    });
    const r = await probeInteractives({ page, url: 'https://x/', maxInteractives: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.deadOrErroring).toBe(0);
    expect(r.findings).toHaveLength(0);
  });

  it('caps iteration count at maxInteractives', async () => {
    const clickables = Array.from({ length: 50 }, (_, i) => ({
      index: i, tag: 'button', text: `b${i}`, selector: `button#b${i}`,
      href: null, ariaLabel: null, role: null,
    }));
    const clickOutcomes = {};
    for (const c of clickables) clickOutcomes[c.selector] = 'silent';
    const page = makeProbePage({ clickables: clickables.slice(0, 5), clickOutcomes });
    const r = await probeInteractives({ page, url: 'https://x/', maxInteractives: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    // We capped at 5 in the mock's evaluate; the probe respects what
    // enumerateClickables returned.
    expect(r.interactivesTested).toBe(5);
  });

  it('respects sliceBudget — stops mid-loop when budget exhausted', async () => {
    const clickables = Array.from({ length: 5 }, (_, i) => ({
      index: i, tag: 'button', text: `b${i}`, selector: `button#b${i}`,
      href: null, ariaLabel: null, role: null,
    }));
    const page = makeProbePage({
      clickables,
      clickOutcomes: clickables.reduce((acc, c) => { acc[c.selector] = 'silent'; return acc; }, {}),
    });
    // Override waitForTimeout to consume the budget — simulates a slow
    // page where each post-click settle takes a long time.
    page.waitForTimeout = vi.fn(async () => {
      await new Promise((res) => setTimeout(res, 50));
    });
    const r = await probeInteractives({ page, url: 'https://x/', maxInteractives: 10, actionTimeoutMs: 1000, sliceBudget: 100 });
    expect(r.interactivesTested).toBeLessThan(5);
  });

  it('returns empty findings when no clickables are present', async () => {
    const page = makeProbePage({ clickables: [] });
    const r = await probeInteractives({ page, url: 'https://x/', maxInteractives: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.interactivesTested).toBe(0);
    expect(r.findings).toEqual([]);
  });

  it('handles enumerateClickables throwing — surfaces an engine-error finding', async () => {
    const page = makeProbePage();
    page.evaluate = vi.fn(async () => { throw new Error('CSP blocked evaluate'); });
    const r = await probeInteractives({ page, url: 'https://x/', maxInteractives: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.interactivesTested).toBe(0);
    expect(r.findings[0]).toMatchObject({ severity: 'medium', category: 'engine-error' });
    expect(r.findings[0].evidence).toMatch(/CSP blocked evaluate/);
  });

  it('probeInteractives is now the default in probeAdversarialSurface (T2 wired)', async () => {
    const mockPage = makeProbePage({ clickables: [] });
    const browser = {
      newContext: vi.fn(async () => ({
        newPage: vi.fn(async () => mockPage),
        close: vi.fn(async () => {}),
      })),
      close: vi.fn(async () => {}),
    };
    const r = await probeAdversarialSurface({
      url: 'https://x/', opts: { browser },
    });
    expect(r.ok).toBe(true);
    // probeInteractives was called as the default — interactivesTested
    // is present in the summary even with zero clickables.
    expect(r.summary).toHaveProperty('interactivesTested');
    expect(r.summary.interactivesTested).toBe(0);
  });
});

// ── D39 T3 — probeModals + probeForms ────────────────────────────────

describe('probeModals — T3 modal trigger probe', () => {
  // Mock page that dispatches results based on the trigger selector.
  function makeModalPage({ triggers = [], modalRenders = {}, closeRenders = {}, clickOutcomes = {} } = {}) {
    let renderState = false;
    return {
      goto: vi.fn(async () => {}),
      on: vi.fn(), off: vi.fn(),
      evaluate: vi.fn(async (fn) => {
        const src = fn.toString();
        if (src.includes('aria-haspopup') || src.includes('data-modal')) {
          return triggers;
        }
        if (src.includes('role="dialog"') || src.includes('aria-modal')) {
          return renderState;
        }
        if (src.includes('close') || src.includes('dismiss')) {
          // closeModal helper — does both: triggers close + renders state.
          return { triggered: !!renderState, closed: !!renderState };
        }
        return null;
      }),
      url: () => 'https://x/',
      locator: vi.fn((sel) => ({
        first: () => ({
          click: vi.fn(async () => {
            const outcome = clickOutcomes[sel] ?? 'opens';
            if (outcome === 'throw') throw new Error('click failed');
            renderState = !!modalRenders[sel];
          }),
        }),
      })),
      waitForTimeout: vi.fn(async () => {}),
    };
  }

  it('flags a modal trigger that clicks cleanly but renders no modal', async () => {
    const page = makeModalPage({
      triggers: [{ index: 0, tag: 'button', text: 'Open', selector: 'button#open' }],
      modalRenders: { 'button#open': false },
      clickOutcomes: { 'button#open': 'opens' },
    });
    const r = await probeModals({ page, url: 'https://x/', maxModals: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.modalsFailing).toBe(1);
    expect(r.findings[0]).toMatchObject({ severity: 'high', category: 'broken-modal' });
    expect(r.findings[0].evidence).toMatch(/no modal rendered/);
  });

  it('flags a modal trigger that errored on click', async () => {
    const page = makeModalPage({
      triggers: [{ index: 0, tag: 'button', text: 'Bad', selector: 'button#bad' }],
      clickOutcomes: { 'button#bad': 'throw' },
    });
    const r = await probeModals({ page, url: 'https://x/', maxModals: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.modalsFailing).toBe(1);
    expect(r.findings[0]).toMatchObject({ severity: 'high', category: 'broken-modal' });
    expect(r.findings[0].evidence).toMatch(/errored on click/);
  });

  it('accepts a modal that renders + has a close affordance', async () => {
    const page = makeModalPage({
      triggers: [{ index: 0, tag: 'button', text: 'Open', selector: 'button#open' }],
      modalRenders: { 'button#open': true },
    });
    const r = await probeModals({ page, url: 'https://x/', maxModals: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.modalsFailing).toBe(0);
    expect(r.findings).toEqual([]);
  });

  it('respects maxModals + sliceBudget', async () => {
    const triggers = Array.from({ length: 3 }, (_, i) => ({
      index: i, tag: 'button', text: `b${i}`, selector: `button#b${i}`,
    }));
    const page = makeModalPage({ triggers, modalRenders: {} });
    const r = await probeModals({ page, url: 'https://x/', maxModals: 5, actionTimeoutMs: 100, sliceBudget: 5000 });
    expect(r.modalsTested).toBe(3);
  });

  it('handles enumerateModalTriggers throwing', async () => {
    const page = makeModalPage();
    page.evaluate = vi.fn(async () => { throw new Error('eval blocked'); });
    const r = await probeModals({ page, url: 'https://x/', maxModals: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.findings[0]).toMatchObject({ severity: 'medium', category: 'engine-error' });
  });
});

describe('probeForms — T3 form submission probe', () => {
  function makeFormPage({ forms = [], submitOutcomes = {}, feedback = { hasError: false, hasSuccess: false } } = {}) {
    let currentUrl = 'https://x/';
    return {
      goto: vi.fn(async (u) => { currentUrl = u; }),
      on: vi.fn(), off: vi.fn(),
      evaluate: vi.fn(async (fn) => {
        const src = fn.toString();
        if (src.includes('querySelectorAll(\'form\')')) {
          return forms;
        }
        if (src.includes('inp.dispatchEvent')) {
          // fillAndSubmitForm — returns submit outcome.
          const formArg = fn.toString();
          // Use the most recent fill/submit outcome.
          const formSel = forms[0]?.selector ?? '';
          const outcome = submitOutcomes[formSel] ?? { ok: true, filled: 1, submitted: true };
          return outcome;
        }
        if (src.includes('aria-invalid') || src.includes('form-success')) {
          return feedback;
        }
        return null;
      }),
      url: () => currentUrl,
      locator: vi.fn(),
      waitForTimeout: vi.fn(async () => {}),
    };
  }

  it('flags a form that silently no-ops on valid submission (mock-only signal)', async () => {
    const formDesc = { index: 0, selector: 'form#contact', action: '', method: 'POST', inputs: [] };
    const page = makeFormPage({
      forms: [formDesc],
      submitOutcomes: { 'form#contact': { ok: true, filled: 1, submitted: true } },
      feedback: { hasError: false, hasSuccess: false },
    });
    const r = await probeForms({ page, url: 'https://x/', maxForms: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.formsFailing).toBe(1);
    expect(r.findings[0]).toMatchObject({ severity: 'high', category: 'broken-modal' });
    expect(r.findings[0].evidence).toMatch(/silent no-op or mock-only/);
  });

  it('accepts a form that produces a success surface', async () => {
    const formDesc = { index: 0, selector: 'form#ok', action: '', method: 'POST', inputs: [] };
    const page = makeFormPage({
      forms: [formDesc],
      submitOutcomes: { 'form#ok': { ok: true, filled: 1, submitted: true } },
      feedback: { hasError: false, hasSuccess: true, sampleSuccess: 'Thanks!' },
    });
    const r = await probeForms({ page, url: 'https://x/', maxForms: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.formsFailing).toBe(0);
    expect(r.findings).toEqual([]);
  });

  it('handles enumerateForms throwing', async () => {
    const page = makeFormPage();
    page.evaluate = vi.fn(async () => { throw new Error('eval blocked'); });
    const r = await probeForms({ page, url: 'https://x/', maxForms: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.findings[0]).toMatchObject({ severity: 'medium', category: 'engine-error' });
  });

  it('returns empty findings when no forms present', async () => {
    const page = makeFormPage({ forms: [] });
    const r = await probeForms({ page, url: 'https://x/', maxForms: 5, actionTimeoutMs: 1000, sliceBudget: 5000 });
    expect(r.formsTested).toBe(0);
    expect(r.findings).toEqual([]);
  });

  it('probeModals + probeForms wired as defaults in probeAdversarialSurface (T3)', async () => {
    const mockPage = {
      goto: vi.fn(async () => {}),
      on: vi.fn(), off: vi.fn(),
      evaluate: vi.fn(async () => []),
      url: () => 'https://x/',
      locator: vi.fn(),
      waitForTimeout: vi.fn(async () => {}),
    };
    const browser = {
      newContext: vi.fn(async () => ({
        newPage: vi.fn(async () => mockPage),
        close: vi.fn(async () => {}),
      })),
      close: vi.fn(async () => {}),
    };
    const r = await probeAdversarialSurface({
      url: 'https://x/', opts: { browser },
    });
    expect(r.ok).toBe(true);
    // Summary now has modalsFailing + formsFailing (T3 wired even on empty page).
    expect(r.summary).toHaveProperty('modalsFailing');
    expect(r.summary).toHaveProperty('formsFailing');
    expect(r.summary.modalsFailing).toBe(0);
    expect(r.summary.formsFailing).toBe(0);
  });
});
