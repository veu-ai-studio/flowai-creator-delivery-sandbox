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
  probeAgents,
  detectWiredVsMock,
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
    // Required summary fields per the contract (D39 T5 added
    // networkSummary as an OPTIONAL extension, so we assert on each
    // required field individually rather than full equality).
    expect(r.summary).toMatchObject({
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
      expect(step4.tool).toMatch(/Phase B/);
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

// ── D39 T4 — probeAgents ─────────────────────────────────────────────

describe('classifyResponse — T4 stub/working/no-response classifier', () => {
  it('flags canned stub responses as STUB', () => {
    expect(__internals.classifyResponse("I'm sorry, I can't help with that yet.")).toBe('STUB');
    expect(__internals.classifyResponse('Coming soon — this feature is not yet implemented.')).toBe('STUB');
    expect(__internals.classifyResponse('this feature is not yet available')).toBe('STUB');
  });

  it('flags error-prefix responses as STUB', () => {
    expect(__internals.classifyResponse('error: something went wrong. Please try again later — sorry!')).toBe('STUB');
    expect(__internals.classifyResponse('Sorry, this response failed. Please retry.')).toBe('STUB');
  });

  it('flags too-short responses as NO-RESPONSE', () => {
    expect(__internals.classifyResponse('ok')).toBe('NO-RESPONSE');
    expect(__internals.classifyResponse('')).toBe('NO-RESPONSE');
    expect(__internals.classifyResponse('Yes.')).toBe('NO-RESPONSE');
  });

  it('accepts substantive responses as WORKS', () => {
    expect(__internals.classifyResponse(
      'This product is a pregnancy and maternal-health AI companion that helps users track milestones and access care guidance.',
    )).toBe('WORKS');
  });
});

describe('probeAgents — T4 agent functional probe', () => {
  // Mock page surface — evaluate dispatches on the function source.
  function makeAgentPage({ agentInput = null, sendOk = true, sendReason = null, response = null } = {}) {
    let bodyLen = 1000;
    return {
      goto: vi.fn(async () => {}),
      on: vi.fn(), off: vi.fn(),
      url: () => 'https://x/',
      locator: vi.fn(),
      waitForTimeout: vi.fn(async () => {}),
      evaluate: vi.fn(async (fn, args) => {
        const src = fn.toString();
        if (src.includes('contenteditable') && src.includes('placeholder')) {
          return agentInput;
        }
        if (src.includes('dispatchEvent') && src.includes('KeyboardEvent')) {
          if (!sendOk) return { ok: false, reason: sendReason ?? 'unknown' };
          return { ok: true, bodyBefore: bodyLen };
        }
        if (src.includes('bodyDiffLen')) {
          // Response detection — return body growth if `response` is set.
          if (response) {
            return { bodyLength: bodyLen + response.length, bodyDiffLen: response.length };
          }
          return { bodyLength: bodyLen, bodyDiffLen: 0 };
        }
        if (src.includes('role="article"') || src.includes('class*="message"')) {
          return response ?? '';
        }
        return null;
      }),
    };
  }

  it('emits no finding when no agent input is detected (legitimate absence)', async () => {
    const page = makeAgentPage({ agentInput: null });
    const r = await probeAgents({ page, url: 'https://x/', sliceBudget: 5_000, responseWaitMs: 500 });
    expect(r.agentsTested).toBe(0);
    expect(r.findings).toEqual([]);
  });

  it('flags an agent that takes prompt but never responds (NO-RESPONSE)', async () => {
    const page = makeAgentPage({
      agentInput: { selector: 'textarea#chat', placeholder: 'Ask me anything', ariaLabel: '', tag: 'textarea' },
      sendOk: true, response: null,
    });
    const r = await probeAgents({ page, url: 'https://x/', sliceBudget: 5_000, responseWaitMs: 600 });
    expect(r.agentsTested).toBe(1);
    expect(r.agentsNonFunctional).toBe(1);
    expect(r.findings[0]).toMatchObject({ severity: 'high', category: 'ai-agent-no-response' });
    expect(r.findings[0].evidence).toMatch(/did not respond.*probe prompt/);
  });

  it('flags an agent that responds with a stub/canned message', async () => {
    const page = makeAgentPage({
      agentInput: { selector: 'textarea#chat', placeholder: 'Ask anything', ariaLabel: '', tag: 'textarea' },
      sendOk: true,
      response: "I'm sorry, I can't help with that yet. This is a demo placeholder.",
    });
    const r = await probeAgents({ page, url: 'https://x/', sliceBudget: 5_000, responseWaitMs: 1_000 });
    expect(r.agentsNonFunctional).toBe(1);
    expect(r.findings[0]).toMatchObject({ severity: 'high', category: 'ai-agent-no-response' });
    expect(r.findings[0].evidence).toMatch(/canned\/stub response/);
  });

  it('flags an agent where the prompt send itself failed (UNREACHABLE)', async () => {
    const page = makeAgentPage({
      agentInput: { selector: 'textarea#chat', placeholder: 'Ask', ariaLabel: '', tag: 'textarea' },
      sendOk: false, sendReason: 'submit threw',
    });
    const r = await probeAgents({ page, url: 'https://x/', sliceBudget: 5_000, responseWaitMs: 500 });
    expect(r.findings[0]).toMatchObject({ severity: 'high', category: 'ai-agent-unreachable' });
    expect(r.findings[0].evidence).toMatch(/agent prompt failed to send/);
  });

  it('accepts an agent with a substantive, non-stub response (WORKS — no finding)', async () => {
    const page = makeAgentPage({
      agentInput: { selector: 'textarea#chat', placeholder: 'Ask', ariaLabel: '', tag: 'textarea' },
      sendOk: true,
      response: 'This product is a pregnancy companion app that helps expecting parents track milestones, get personalized guidance, and access community support.',
    });
    const r = await probeAgents({ page, url: 'https://x/', sliceBudget: 5_000, responseWaitMs: 1_000 });
    expect(r.agentsTested).toBe(1);
    expect(r.agentsNonFunctional).toBe(0);
    expect(r.findings).toEqual([]);
  });

  it('handles findAgentInput throwing — surfaces engine-error', async () => {
    const page = makeAgentPage();
    page.evaluate = vi.fn(async () => { throw new Error('eval blocked'); });
    const r = await probeAgents({ page, url: 'https://x/', sliceBudget: 5_000, responseWaitMs: 500 });
    expect(r.findings[0]).toMatchObject({ severity: 'medium', category: 'engine-error' });
  });

  it('probeAgents is wired as default in probeAdversarialSurface (T4)', async () => {
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
    expect(r.summary).toHaveProperty('agentsNonFunctional');
    expect(r.summary.agentsNonFunctional).toBe(0);
  });
});

// ── D39 T5 — detectWiredVsMock ────────────────────────────────────────

describe('isMeaningfulRequest — wired-vs-mock classifier (D39 T5)', () => {
  it('accepts POST/PUT/PATCH/DELETE same-origin as meaningful', () => {
    expect(__internals.isMeaningfulRequest(
      { url: 'https://x/api/save', method: 'POST', status: 200 },
      'https://x',
    )).toBe(true);
    expect(__internals.isMeaningfulRequest(
      { url: 'https://x/api/save', method: 'PUT', status: 204 },
      'https://x',
    )).toBe(true);
    expect(__internals.isMeaningfulRequest(
      { url: 'https://x/api/save', method: 'PATCH', status: 200 },
      'https://x',
    )).toBe(true);
    expect(__internals.isMeaningfulRequest(
      { url: 'https://x/api/save', method: 'DELETE', status: 200 },
      'https://x',
    )).toBe(true);
  });

  it('accepts GET with JSON content-type as meaningful', () => {
    expect(__internals.isMeaningfulRequest(
      { url: 'https://x/api/data', method: 'GET', status: 200, contentType: 'application/json; charset=utf-8' },
      'https://x',
    )).toBe(true);
  });

  it('rejects static-asset GETs (.js, .css, .png, .svg, ...)', () => {
    expect(__internals.isMeaningfulRequest(
      { url: 'https://x/static/bundle.js', method: 'GET', status: 200 }, 'https://x',
    )).toBe(false);
    expect(__internals.isMeaningfulRequest(
      { url: 'https://x/styles.css', method: 'GET', status: 200 }, 'https://x',
    )).toBe(false);
    expect(__internals.isMeaningfulRequest(
      { url: 'https://x/logo.svg', method: 'GET', status: 200 }, 'https://x',
    )).toBe(false);
    expect(__internals.isMeaningfulRequest(
      { url: 'https://x/photo.jpg?v=2', method: 'GET', status: 200 }, 'https://x',
    )).toBe(false);
  });

  it('rejects cross-origin requests', () => {
    expect(__internals.isMeaningfulRequest(
      { url: 'https://other.test/api/save', method: 'POST', status: 200 },
      'https://x',
    )).toBe(false);
  });

  it('rejects 4xx/5xx response GETs (failed requests are not meaningful)', () => {
    expect(__internals.isMeaningfulRequest(
      { url: 'https://x/api/data', method: 'GET', status: 404, contentType: 'application/json' },
      'https://x',
    )).toBe(false);
    expect(__internals.isMeaningfulRequest(
      { url: 'https://x/api/data', method: 'GET', status: 500, contentType: 'application/json' },
      'https://x',
    )).toBe(false);
  });

  it('accepts GETs with substantive (>200 byte) body even without JSON content-type', () => {
    expect(__internals.isMeaningfulRequest(
      { url: 'https://x/api/page', method: 'GET', status: 200, contentType: 'text/html', responseSize: 5000 },
      'https://x',
    )).toBe(true);
  });

  it('rejects null/non-object entries safely', () => {
    expect(__internals.isMeaningfulRequest(null, 'https://x')).toBe(false);
    expect(__internals.isMeaningfulRequest('a string', 'https://x')).toBe(false);
    expect(__internals.isMeaningfulRequest({ url: 'not-a-url', method: 'POST' }, 'https://x')).toBe(false);
  });
});

describe('detectWiredVsMock — T5 page-level classifier', () => {
  function makePage() {
    return {
      url: () => 'https://x/',
      on: vi.fn(), off: vi.fn(),
      evaluate: vi.fn(async () => []),
      waitForTimeout: vi.fn(async () => {}),
    };
  }

  it('flags MOCK-ONLY when interactives present + ZERO meaningful traffic', async () => {
    const r = await detectWiredVsMock({
      page: makePage(), url: 'https://x/',
      networkLog: [
        { url: 'https://x/bundle.js', method: 'GET', status: 200 },
        { url: 'https://x/styles.css', method: 'GET', status: 200 },
      ],
      interactivesTested: 5, formsTested: 1, agentsTested: 1,
      sliceBudget: 5000,
    });
    expect(r.mockOnlyFlagged).toBe(1);
    expect(r.findings[0]).toMatchObject({ severity: 'high', category: 'engine-error' });
    expect(r.findings[0].evidence).toMatch(/mock-only signal/);
    expect(r.findings[0].evidence).toMatch(/5 interactives/);
    expect(r.findings[0].evidence).toMatch(/ZERO meaningful/);
  });

  it('does NOT flag MOCK-ONLY when meaningful traffic IS present', async () => {
    const r = await detectWiredVsMock({
      page: makePage(), url: 'https://x/',
      networkLog: [
        { url: 'https://x/bundle.js', method: 'GET', status: 200 },
        { url: 'https://x/api/save', method: 'POST', status: 200 },        // meaningful
      ],
      interactivesTested: 5, formsTested: 1, agentsTested: 0,
      sliceBudget: 5000,
    });
    expect(r.mockOnlyFlagged).toBe(0);
    expect(r.findings).toEqual([]);
    expect(r.networkSummary.meaningfulSameOrigin).toBe(1);
  });

  it('does NOT flag MOCK-ONLY when <3 interactives total (signal too weak)', async () => {
    const r = await detectWiredVsMock({
      page: makePage(), url: 'https://x/',
      networkLog: [],
      interactivesTested: 1, formsTested: 0, agentsTested: 0,
      sliceBudget: 5000,
    });
    expect(r.mockOnlyFlagged).toBe(0);
    expect(r.findings).toEqual([]);
  });

  it('returns a network summary with method counts + distinct URLs', async () => {
    const r = await detectWiredVsMock({
      page: makePage(), url: 'https://x/',
      networkLog: [
        { url: 'https://x/a.js', method: 'GET', status: 200 },
        { url: 'https://x/b.js', method: 'GET', status: 200 },
        { url: 'https://x/api/x', method: 'POST', status: 200 },
        { url: 'https://x/api/x', method: 'POST', status: 200 },
      ],
      interactivesTested: 0, formsTested: 0, agentsTested: 0,
      sliceBudget: 5000,
    });
    expect(r.networkSummary.totalRequests).toBe(4);
    expect(r.networkSummary.meaningfulSameOrigin).toBe(2);
    expect(r.networkSummary.distinctUrls).toBe(1);          // only 1 distinct meaningful URL
    expect(r.networkSummary.methodCounts).toEqual({ GET: 2, POST: 2 });
  });

  it('handles malformed url in the page argument gracefully', async () => {
    const r = await detectWiredVsMock({
      page: makePage(), url: 'not-a-url',
      networkLog: [{ url: 'https://x/api/y', method: 'POST', status: 200 }],
      interactivesTested: 5, formsTested: 1, agentsTested: 0,
      sliceBudget: 5000,
    });
    // pageOrigin can't be parsed → no meaningful match → flagged.
    expect(r.mockOnlyFlagged).toBe(1);
  });

  it('returns empty envelope when page or networkLog missing', async () => {
    expect((await detectWiredVsMock({ page: null, url: 'https://x/' })).findings).toEqual([]);
    expect((await detectWiredVsMock({ page: makePage(), url: 'https://x/' })).findings).toEqual([]);
  });

  it('detectWiredVsMock is wired as default in probeAdversarialSurface (T5)', async () => {
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
    expect(r.summary).toHaveProperty('mockOnlyFlagged');
    // With empty pages, no interactives are tested → no mock-only flag.
    expect(r.summary.mockOnlyFlagged).toBe(0);
  });
});

// ── D41 T1 — multi-page traversal (probeAllPages) ─────────────────────

import { probeAllPages } from '../../../src/lib/agents/renewal/adversarialSurface.js';

describe('probeAllPages — D41 T1 multi-page traversal', () => {
  it('returns ok:false when urls is empty/missing', async () => {
    const r1 = await probeAllPages({});
    expect(r1.ok).toBe(false);
    expect(r1.reason).toBe('urls_required');
    expect(r1.pagesProbed).toBe(0);
    const r2 = await probeAllPages({ urls: [] });
    expect(r2.ok).toBe(false);
    const r3 = await probeAllPages({ urls: [''] });
    expect(r3.ok).toBe(false);
  });

  it('reuses ONE browser across multiple pages (no relaunch per page)', async () => {
    const { browser } = makeMockBrowser();
    const urls = ['https://a/', 'https://b/', 'https://c/'];
    const r = await probeAllPages({
      urls,
      opts: {
        browser,
        // Stub all probes so we don't need real DOM signals.
        probeInteractives: async () => ({ findings: [], interactivesTested: 0, deadOrErroring: 0 }),
        probeModals: async () => ({ findings: [], modalsFailing: 0 }),
        probeForms: async () => ({ findings: [], formsFailing: 0 }),
        probeAgents: async () => ({ findings: [], agentsNonFunctional: 0, agentsTested: 0 }),
        probeWorkspaces: async () => ({ findings: [], workspacesProbed: 0, workspacesNonFunctional: 0 }),
        detectWiredVsMock: async () => ({ findings: [], mockOnlyFlagged: 0, networkSummary: null }),
      },
    });
    expect(r.ok).toBe(true);
    expect(r.pagesProbed).toBe(3);
    expect(r.urlsAttempted).toBe(3);
    expect(r.perPage).toHaveLength(3);
    // newContext is called once per page; but browser.close is NOT
    // called by probeAllPages because the test injected a browser
    // (caller-owned).
    expect(browser.newContext).toHaveBeenCalledTimes(3);
    expect(browser.close).not.toHaveBeenCalled();
  });

  it('unions findings across all probed pages into aggregate envelope', async () => {
    const { browser } = makeMockBrowser();
    let callCount = 0;
    const r = await probeAllPages({
      urls: ['https://a/', 'https://b/', 'https://c/'],
      opts: {
        browser,
        probeInteractives: async ({ url }) => {
          callCount += 1;
          return {
            findings: [{ severity: 'medium', category: 'dead-or-erroring-element', location: url, evidence: 'x' }],
            interactivesTested: 5,
            deadOrErroring: 1,
          };
        },
        probeModals: async () => ({ findings: [], modalsFailing: 0 }),
        probeForms: async () => ({ findings: [], formsFailing: 0 }),
        probeAgents: async () => ({ findings: [], agentsNonFunctional: 0, agentsTested: 0 }),
        probeWorkspaces: async () => ({ findings: [], workspacesProbed: 0, workspacesNonFunctional: 0 }),
        detectWiredVsMock: async () => ({ findings: [], mockOnlyFlagged: 0, networkSummary: null }),
      },
    });
    expect(r.ok).toBe(true);
    expect(callCount).toBe(3);
    // Aggregate findings = 3 pages × 1 finding/page = 3
    expect(r.findings).toHaveLength(3);
    // Aggregate summary = sum across pages
    expect(r.summary.interactivesTested).toBe(15);
    expect(r.summary.deadOrErroring).toBe(3);
    // perPage envelopes preserve per-URL detail
    expect(r.perPage.map((p) => p.url)).toEqual(['https://a/', 'https://b/', 'https://c/']);
    expect(r.perPage[0].findings).toHaveLength(1);
  });

  it('continues across pages when one page fails (probe_failed)', async () => {
    const { browser } = makeMockBrowser();
    // First page: page.goto throws via custom override.
    let i = 0;
    browser.newContext = vi.fn(async () => ({
      newPage: vi.fn(async () => {
        const isFirst = i === 0;
        i += 1;
        return {
          goto: vi.fn(async () => { if (isFirst) throw new Error('nav_failed_test'); }),
          on: vi.fn(),
          off: vi.fn(),
          evaluate: vi.fn(async () => []),
          url: () => 'https://x/',
          locator: vi.fn(),
          waitForTimeout: vi.fn(async () => {}),
          close: vi.fn(async () => {}),
        };
      }),
      close: vi.fn(async () => {}),
    }));
    const r = await probeAllPages({
      urls: ['https://a/', 'https://b/'],
      opts: {
        browser,
        probeInteractives: async () => ({ findings: [], interactivesTested: 0, deadOrErroring: 0 }),
        probeModals: async () => ({ findings: [], modalsFailing: 0 }),
        probeForms: async () => ({ findings: [], formsFailing: 0 }),
        probeAgents: async () => ({ findings: [], agentsNonFunctional: 0, agentsTested: 0 }),
        probeWorkspaces: async () => ({ findings: [], workspacesProbed: 0, workspacesNonFunctional: 0 }),
        detectWiredVsMock: async () => ({ findings: [], mockOnlyFlagged: 0 }),
      },
    });
    expect(r.ok).toBe(true);
    expect(r.pagesProbed).toBe(2);
    // First page envelope reports ok:false; second is ok:true.
    expect(r.perPage[0].ok).toBe(false);
    expect(r.perPage[1].ok).toBe(true);
  });

  // ── D41 T2 — exhaustive element exercise ─────────────────────────

  it('default maxInteractives is lifted to exhaustive ceiling (≥125 for reltwin)', async () => {
    // 200 fake elements → all should be enumerated when caller does
    // not pass maxInteractives (default ceiling now 9999, not 25).
    const fakeEls = Array.from({ length: 200 }, (_, i) => ({
      index: i, tag: 'button', href: null, text: `btn-${i}`,
      ariaLabel: null, role: null, selector: `button:nth-of-type(${i + 1})`,
    }));
    const mockPage = {
      goto: vi.fn(async () => ({ ok: () => true })),
      on: vi.fn(), off: vi.fn(),
      evaluate: vi.fn(async (fn, args) => {
        // First call: enumerateClickables → return fake list.
        // Subsequent calls: body-hash → return stable string.
        if (args && args.sel) return fakeEls.slice(0, args.max);
        return 'h';
      }),
      url: () => 'https://x/',
      locator: vi.fn(() => ({ first: () => ({ click: vi.fn(async () => {}) }) })),
      waitForTimeout: vi.fn(async () => {}),
      close: vi.fn(async () => {}),
    };
    const browser = {
      newContext: vi.fn(async () => ({
        newPage: vi.fn(async () => mockPage),
        close: vi.fn(async () => {}),
      })),
      close: vi.fn(async () => {}),
    };
    const r = await probeAdversarialSurface({
      url: 'https://x/', opts: {
        browser,
        // High sliceBudget so the loop doesn't time-out mid-way.
        probeBudgetMs: 10_000_000,
      },
    });
    expect(r.ok).toBe(true);
    // 200 elements exercised — well above the prior cap of 25.
    expect(r.summary.interactivesTested).toBe(200);
  });

  it('per-element classifications are surfaced on the per-page envelope', async () => {
    const mockPage = {
      goto: vi.fn(async () => ({ ok: () => true })),
      on: vi.fn(), off: vi.fn(),
      evaluate: vi.fn(async (fn, args) => {
        if (args && args.sel) {
          return [
            { index: 0, tag: 'button', href: null, text: 'works', ariaLabel: null, role: null, selector: 'button:nth-of-type(1)' },
            { index: 1, tag: 'button', href: null, text: 'dead',  ariaLabel: null, role: null, selector: 'button:nth-of-type(2)' },
          ];
        }
        return mockPage.__hash ?? 'h0';
      }),
      url: () => 'https://x/',
      locator: vi.fn((sel) => ({
        first: () => ({
          click: vi.fn(async () => {
            // First button changes the body; second is a no-op.
            if (sel.includes('1')) mockPage.__hash = 'h1';
          }),
        }),
      })),
      waitForTimeout: vi.fn(async () => {}),
      close: vi.fn(async () => {}),
    };
    const browser = {
      newContext: vi.fn(async () => ({
        newPage: vi.fn(async () => mockPage),
        close: vi.fn(async () => {}),
      })),
      close: vi.fn(async () => {}),
    };
    const r = await probeAdversarialSurface({
      url: 'https://x/', opts: { browser, probeBudgetMs: 60_000 },
    });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.classifications)).toBe(true);
    expect(r.classifications).toHaveLength(2);
    const works = r.classifications.find((c) => c.text === 'works');
    const dead  = r.classifications.find((c) => c.text === 'dead');
    expect(works.classification).toBe('WORKS');
    expect(dead.classification).toBe('DEAD-NO-OP');
    // Each classification carries page + selector for the audit table.
    expect(works.location).toBe('https://x/');
    expect(works.selector).toBe('button:nth-of-type(1)');
  });

  // ── D41 T3 — workspace/engine/agent coverage ─────────────────────

  it('probeWorkspaces flags an empty-shell workspace (urlTokenHit + empty main)', async () => {
    const { probeWorkspaces } = await import('../../../src/lib/agents/renewal/adversarialSurface.js');
    const mockPage = {
      evaluate: vi.fn(async (fn, args) => {
        // Simulate enumerateWorkspaces returning a single empty-shell
        // workspace surface.
        return [{
          urlTokenHit: true, layoutPresent: true,
          sideSel: 'aside', mainSel: 'main',
          mainTextLen: 12, interactiveDescendants: 0,
          pathname: '/workspace/x',
        }];
      }),
    };
    const r = await probeWorkspaces({ page: mockPage, url: 'https://app/workspace/x' });
    expect(r.workspacesProbed).toBe(1);
    expect(r.workspacesNonFunctional).toBe(1);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].severity).toBe('high');
    expect(r.findings[0].evidence).toMatch(/empty-shell|no functional content/);
  });

  it('probeWorkspaces accepts a functional workspace (long main text)', async () => {
    const { probeWorkspaces } = await import('../../../src/lib/agents/renewal/adversarialSurface.js');
    const mockPage = {
      evaluate: vi.fn(async () => [{
        urlTokenHit: true, layoutPresent: true,
        sideSel: 'aside', mainSel: 'main',
        mainTextLen: 5_000, interactiveDescendants: 12,
        pathname: '/dashboard',
      }]),
    };
    const r = await probeWorkspaces({ page: mockPage, url: 'https://app/dashboard' });
    expect(r.workspacesProbed).toBe(1);
    expect(r.workspacesNonFunctional).toBe(0);
    expect(r.findings).toHaveLength(0);
  });

  it('probeWorkspaces accepts a functional workspace (≥3 interactives even with short text)', async () => {
    const { probeWorkspaces } = await import('../../../src/lib/agents/renewal/adversarialSurface.js');
    const mockPage = {
      evaluate: vi.fn(async () => [{
        urlTokenHit: true, layoutPresent: true,
        sideSel: 'aside', mainSel: 'main',
        mainTextLen: 50, interactiveDescendants: 5,
        pathname: '/engine',
      }]),
    };
    const r = await probeWorkspaces({ page: mockPage, url: 'https://app/engine' });
    expect(r.workspacesNonFunctional).toBe(0);
    expect(r.findings).toHaveLength(0);
  });

  it('probeWorkspaces returns empty when no workspace surface is detected', async () => {
    const { probeWorkspaces } = await import('../../../src/lib/agents/renewal/adversarialSurface.js');
    const mockPage = { evaluate: vi.fn(async () => []) };
    const r = await probeWorkspaces({ page: mockPage, url: 'https://app/marketing/about' });
    expect(r.workspacesProbed).toBe(0);
    expect(r.findings).toHaveLength(0);
  });

  it('probeWorkspaces is wired as a default in probeOnePage (multi-page envelope)', async () => {
    const { browser } = makeMockBrowser();
    let workspaceProbeCalled = 0;
    const r = await probeAllPages({
      urls: ['https://x/'],
      opts: {
        browser,
        probeInteractives: async () => ({ findings: [], interactivesTested: 0, deadOrErroring: 0 }),
        probeModals: async () => ({ findings: [], modalsFailing: 0 }),
        probeForms: async () => ({ findings: [], formsFailing: 0 }),
        probeAgents: async () => ({ findings: [], agentsNonFunctional: 0 }),
        probeWorkspaces: async () => {
          workspaceProbeCalled += 1;
          return {
            findings: [{ severity: 'high', category: 'broken-modal', location: 'https://x/', evidence: 'shell' }],
            workspacesProbed: 1, workspacesNonFunctional: 1,
          };
        },
        detectWiredVsMock: async () => ({ findings: [], mockOnlyFlagged: 0 }),
      },
    });
    expect(workspaceProbeCalled).toBe(1);
    expect(r.summary.workspacesProbed).toBe(1);
    expect(r.summary.workspacesNonFunctional).toBe(1);
    // The workspace finding flowed into the aggregate findings array
    // so the canonical scorer sees it.
    expect(r.findings.some((f) => f.category === 'broken-modal' && /shell/.test(f.evidence))).toBe(true);
  });

  it('probeAllPages aggregates per-page classifications', async () => {
    const { browser } = makeMockBrowser();
    const r = await probeAllPages({
      urls: ['https://a/', 'https://b/'],
      opts: {
        browser,
        probeInteractives: async ({ url }) => ({
          findings: [], interactivesTested: 1, deadOrErroring: 0,
          classifications: [{ classification: 'WORKS', location: url, selector: 'button', tag: 'button', text: 'go' }],
        }),
        probeModals: async () => ({ findings: [], modalsFailing: 0 }),
        probeForms: async () => ({ findings: [], formsFailing: 0 }),
        probeAgents: async () => ({ findings: [], agentsNonFunctional: 0 }),
        probeWorkspaces: async () => ({ findings: [], workspacesProbed: 0, workspacesNonFunctional: 0 }),
        detectWiredVsMock: async () => ({ findings: [], mockOnlyFlagged: 0 }),
      },
    });
    expect(r.classifications).toHaveLength(2);
    expect(r.classifications.map((c) => c.location).sort()).toEqual(['https://a/', 'https://b/']);
  });

  // ── D41 T4 — authenticated traversal ─────────────────────────────

  it('probeAllPages threads storageState into every page newContext call', async () => {
    const { browser } = makeMockBrowser();
    const seenStorageStates = [];
    browser.newContext = vi.fn(async (opts) => {
      seenStorageStates.push(opts?.storageState);
      return {
        newPage: vi.fn(async () => ({
          goto: vi.fn(async () => {}),
          on: vi.fn(), off: vi.fn(),
          evaluate: vi.fn(async () => []),
          url: () => 'https://app/',
          locator: vi.fn(),
          waitForTimeout: vi.fn(async () => {}),
          close: vi.fn(async () => {}),
        })),
        close: vi.fn(async () => {}),
      };
    });
    const STORAGE = { cookies: [{ name: 'session', value: 'opaque' }], origins: [] };
    const r = await probeAllPages({
      urls: ['https://app/a', 'https://app/b'],
      opts: {
        browser,
        storageState: STORAGE,
        probeInteractives: async () => ({ findings: [], interactivesTested: 0, deadOrErroring: 0 }),
        probeModals: async () => ({ findings: [], modalsFailing: 0 }),
        probeForms: async () => ({ findings: [], formsFailing: 0 }),
        probeAgents: async () => ({ findings: [], agentsNonFunctional: 0 }),
        probeWorkspaces: async () => ({ findings: [], workspacesProbed: 0, workspacesNonFunctional: 0 }),
        detectWiredVsMock: async () => ({ findings: [], mockOnlyFlagged: 0 }),
      },
    });
    expect(r.ok).toBe(true);
    expect(seenStorageStates).toHaveLength(2);
    expect(seenStorageStates[0]).toBe(STORAGE);
    expect(seenStorageStates[1]).toBe(STORAGE);
  });

  it('runOrchestration mints storageState via deps.authPreparer when credentials are supplied', async () => {
    const { runOrchestration } = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const MINTED = { cookies: [{ name: 's', value: 'x' }], origins: [] };
    const authPreparer = vi.fn(async ({ credentials, url }) => MINTED);
    let seenStorageState = null;
    const probeAdversarialSurface = vi.fn(async ({ url, opts }) => {
      seenStorageState = opts?.storageState ?? null;
      return { ok: true, url, findings: [], summary: { interactivesTested: 0, deadOrErroring: 0, modalsFailing: 0, formsFailing: 0, agentsNonFunctional: 0, mockOnlyFlagged: 0 }, probedAt: 'now', durationMs: 1 };
    });

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
        authPreparer,
      };
      const r = await runOrchestration({
        url: null, mode: 'auto', runId: 'd41-t4-1', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps,
        credentials: { email: 'u@x', password: 'p' },
      });
      expect(authPreparer).toHaveBeenCalledOnce();
      expect(seenStorageState).toBe(MINTED);
      expect(r.gtmReady).toBe(true);
    } finally {
      delete process.env.VERCEL_PROJECT_ID_MYPREGLIFE;
      delete process.env.VERCEL_ORG_ID;
      delete process.env.VERCEL_TOKEN;
    }
  });

  it('runOrchestration falls back unauthenticated when authPreparer throws (does NOT halt pipeline)', async () => {
    const { runOrchestration } = await import('../../../src/lib/agents/renewal/orchestrator.js');
    let seenStorageState = 'INITIAL';
    const probeAdversarialSurface = vi.fn(async ({ url, opts }) => {
      seenStorageState = opts?.storageState ?? null;
      return { ok: true, url, findings: [], summary: { interactivesTested: 0, deadOrErroring: 0, modalsFailing: 0, formsFailing: 0, agentsNonFunctional: 0, mockOnlyFlagged: 0 }, probedAt: 'now', durationMs: 1 };
    });

    const PRODUCT = Object.freeze({
      product_id: 'mypreglife', org_id: 'veu-ai-studio',
      github_repo_url: 'https://github.com/veu-ai-studio/my-preg-life',
      self_renewal_enabled: true,
    });
    process.env.VERCEL_PROJECT_ID_MYPREGLIFE = 'prj_fake';
    process.env.VERCEL_ORG_ID = 'team_fake';
    process.env.VERCEL_TOKEN = 'vercel_fake';
    try {
      const r = await runOrchestration({
        url: null, mode: 'auto', runId: 'd41-t4-2', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1,
        credentials: { email: 'u@x', password: 'p' },
        deps: {
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
          authPreparer: async () => { throw new Error('login_failed_test'); },
        },
      });
      // Pipeline did NOT halt; Phase B ran unauthenticated (no minted state).
      expect(r.gtmReady).toBe(true);
      expect(seenStorageState).toBeFalsy();
      expect(probeAdversarialSurface).toHaveBeenCalled();
    } finally {
      delete process.env.VERCEL_PROJECT_ID_MYPREGLIFE;
      delete process.env.VERCEL_ORG_ID;
      delete process.env.VERCEL_TOKEN;
    }
  });

  // ── D41 T5 — whole-product §7.6 aggregation ─────────────────────

  it('scoreCrawlOutput unions Phase B findings from ALL pages (not per-page)', async () => {
    const { scoreCrawlOutput } = await import('../../../src/lib/agents/renewal/gtmReadinessScorer.js');
    const crawlOutput = {
      pagesCrawled: 3, depth: 1,
      pages: [
        { url: 'https://a/p1', title: 't', headings: [{ tag: 'h1' }], text: 'hi', links: [], forms: [], statusCode: 200, loadTimeMs: 100 },
        { url: 'https://a/p2', title: 't', headings: [{ tag: 'h1' }], text: 'hi', links: [], forms: [], statusCode: 200, loadTimeMs: 100 },
        { url: 'https://a/p3', title: 't', headings: [{ tag: 'h1' }], text: 'hi', links: [], forms: [], statusCode: 200, loadTimeMs: 100 },
      ],
      brokenLinks: [], forms: [], interactiveElements: [], errors: [], totalTextLength: 9,
    };
    const surfaceOnly = scoreCrawlOutput(crawlOutput, null);
    // Phase B findings spread across the three crawled pages.
    const multiPagePhaseB = [
      { severity: 'high', category: 'broken-modal', location: 'https://a/p1', evidence: 'dead button' },
      { severity: 'high', category: 'broken-modal', location: 'https://a/p2', evidence: 'no agent response' },
      { severity: 'medium', category: 'dead-card', location: 'https://a/p3', evidence: 'empty workspace shell' },
    ];
    const comprehensive = scoreCrawlOutput(crawlOutput, multiPagePhaseB);
    // Whole-product score should drop relative to surface-only because
    // Phase B contributed cross-page findings.
    expect(comprehensive.score).toBeLessThan(surfaceOnly.score);
    expect(comprehensive.phaseBCount).toBe(3);
    expect(comprehensive.phaseACount).toBe(surfaceOnly.phaseACount);
    // Penalty math: 2 high + 1 medium = 2×5 + 1×2 = 12 points.
    expect(surfaceOnly.score - comprehensive.score).toBe(12);
  });

  it('runOrchestration logs surface-only vs comprehensive-Phase-B §7.6 in STEP 5', async () => {
    const { runOrchestration } = await import('../../../src/lib/agents/renewal/orchestrator.js');
    let scorerCallCount = 0;
    const scoreCrawlOutput = vi.fn((crawl, extra) => {
      scorerCallCount += 1;
      const baseFindings = Array.isArray(extra) ? extra : [];
      const score = 100 - (baseFindings.length * 5);
      return {
        score,
        counts: { critical: 0, high: baseFindings.length, medium: 0, low: 0 },
        band: 'showcase-ready', label: 'showcase-ready',
        penalty: 100 - score, formula: 'test',
        issues: baseFindings, phaseACount: 0, phaseBCount: baseFindings.length,
      };
    });
    const probeAllPages = vi.fn(async ({ urls }) => ({
      ok: true,
      pagesProbed: urls.length,
      urlsAttempted: urls.length,
      perPage: urls.map((u) => ({ ok: true, url: u, findings: [], summary: {} })),
      findings: [
        { severity: 'high', category: 'broken-modal', location: urls[0], evidence: 'x' },
        { severity: 'high', category: 'broken-modal', location: urls[1] ?? urls[0], evidence: 'y' },
      ],
      summary: { interactivesTested: 10, deadOrErroring: 0, modalsFailing: 0, formsFailing: 0, agentsNonFunctional: 0, mockOnlyFlagged: 0, workspacesProbed: 2, workspacesNonFunctional: 0 },
      probedAt: 'now', durationMs: 1,
    }));

    const PRODUCT = Object.freeze({
      product_id: 'mypreglife', org_id: 'veu-ai-studio',
      github_repo_url: 'https://github.com/veu-ai-studio/my-preg-life',
      self_renewal_enabled: true,
    });
    process.env.VERCEL_PROJECT_ID_MYPREGLIFE = 'prj_fake';
    process.env.VERCEL_ORG_ID = 'team_fake';
    process.env.VERCEL_TOKEN = 'vercel_fake';
    try {
      const r = await runOrchestration({
        url: null, mode: 'auto', runId: 'd41-t5-1', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1,
        deps: {
          discoverProduct: vi.fn(async () => PRODUCT),
          checkRateCap: vi.fn(async () => ({ allowed: true })),
          checkRunawayDetector: vi.fn(async () => ({ tripped: false })),
          conductStructuredCrawl: vi.fn(async ({ url }) => ({
            pagesCrawled: 2, depth: 1,
            pages: [{ url: 'https://x/p1', title: 't', headings: [{ tag: 'h1' }], text: 'hi', links: [], forms: [], statusCode: 200, loadTimeMs: 100 },
                    { url: 'https://x/p2', title: 't', headings: [{ tag: 'h1' }], text: 'hi', links: [], forms: [], statusCode: 200, loadTimeMs: 100 }],
            brokenLinks: [], forms: [], interactiveElements: [], errors: [], totalTextLength: 4,
          })),
          produceMonitorText: vi.fn(async ({ url }) => ({ monitorText: '[L1] 5/10 [L2] 5/10 [L3] 5/10 [L4] 5/10 [L5] 5/10', rawContent: '', url, fetchedAt: 'now', wordCount: 0, pageTitle: '', model: 'c', usage: {} })),
          computeScore: vi.fn(async () => ({ total: 50, l1: 10, l2: 10, l3: 10, l4: 10, l5: 10, label: 'fair' })),
          scoreCrawlOutput,
          getInstallationToken: vi.fn(async () => ({ token: 'ghs', expiresAt: '' })),
          appendGovernanceEntry: vi.fn(async () => ({ written: true })),
          probeAllPages,
        },
      });
      const step4 = r.orchestrationLog.find((l) => l.step === 4);
      const step5 = r.orchestrationLog.find((l) => l.step === 5);
      // Multi-page Phase B ran on both crawled URLs.
      expect(step4.result.urlsAttempted).toBe(2);
      expect(step4.result.pagesProbed).toBe(2);
      // STEP 5 surfaces the surface-only and comprehensive scores
      // alongside each other so the operator can see the Phase B
      // contribution to the whole-product §7.6 score.
      expect(step5.result).toHaveProperty('surfaceOnlyGtmScore');
      expect(step5.result).toHaveProperty('gtmScore');
      expect(step5.result).toHaveProperty('phaseBContribution');
      expect(step5.result.surfaceOnlyGtmScore).toBeGreaterThan(step5.result.gtmScore);
      expect(step5.result.phaseBContribution).toBe(10);          // 2 high findings × 5 points
      expect(step5.result.phaseBPagesProbed).toBe(2);
    } finally {
      delete process.env.VERCEL_PROJECT_ID_MYPREGLIFE;
      delete process.env.VERCEL_ORG_ID;
      delete process.env.VERCEL_TOKEN;
    }
  });

  it('respects overall budget — stops probing when wall budget burned', async () => {
    const { browser } = makeMockBrowser();
    const r = await probeAllPages({
      urls: ['https://a/', 'https://b/', 'https://c/'],
      opts: {
        browser,
        overallBudgetMs: 1,                     // expire immediately after first page
        probeInteractives: async () => {
          await new Promise((res) => setTimeout(res, 20));
          return { findings: [], interactivesTested: 0, deadOrErroring: 0 };
        },
        probeModals: async () => ({ findings: [], modalsFailing: 0 }),
        probeForms: async () => ({ findings: [], formsFailing: 0 }),
        probeAgents: async () => ({ findings: [], agentsNonFunctional: 0, agentsTested: 0 }),
        probeWorkspaces: async () => ({ findings: [], workspacesProbed: 0, workspacesNonFunctional: 0 }),
        detectWiredVsMock: async () => ({ findings: [], mockOnlyFlagged: 0 }),
      },
    });
    expect(r.ok).toBe(true);
    // 1 page probed before overall budget exit; remaining pages skipped.
    expect(r.pagesProbed).toBeLessThan(3);
    expect(r.urlsAttempted).toBe(3);
  });
});

// ── D42 T1 — Phase-B re-probe after fix ─────────────────────────────

function fullHappyDeps({ scoreSequence } = {}) {
  let scoreIdx = 0;
  return {
    discoverProduct: vi.fn(async () => ({
      product_id: 'mypreglife', org_id: 'veu-ai-studio',
      github_repo_url: 'https://github.com/veu-ai-studio/my-preg-life',
      self_renewal_enabled: true,
    })),
    checkRateCap: vi.fn(async () => ({ allowed: true, runsInWindow: 0, cap: 1 })),
    checkRunawayDetector: vi.fn(async () => ({ tripped: false })),
    produceMonitorText: vi.fn(async ({ url }) => ({ monitorText: '[L1] 5/10 [L2] 5/10 [L3] 5/10 [L4] 5/10 [L5] 5/10', rawContent: '', url, fetchedAt: 'now', wordCount: 0, pageTitle: '', model: 'c', usage: {} })),
    computeScore: vi.fn(async () => ({ total: 50, l1: 10, l2: 10, l3: 10, l4: 10, l5: 10, label: 'fair' })),
    generateFix: vi.fn(async () => ({ fixedContent: 'fixed', model: 'c', promptTokens: 1, completionTokens: 1 })),
    getInstallationToken: vi.fn(async () => ({ token: 'ghs', expiresAt: '2099-01-01' })),
    fetchFileContent: vi.fn(async () => 'orig'),
    createRenewalBranch: vi.fn(async ({ branchName }) => ({ branchName, commitSha: 'abc', branchUrl: 'https://github.com/x/y/tree/' + branchName })),
    commitFileToBranch: vi.fn(async ({ branchName, filePath }) => ({ branchName, commitSha: 'def', filePath })),
    deployBranchPreview: vi.fn(async ({ branchName }) => ({ deploymentId: 'dpl', previewUrl: `https://demo-${branchName}.vercel.app`, inspectorUrl: '' })),
    evaluateDelta: vi.fn(({ preScore, postScore, runId, productId }) => ({
      action: 'open_pr', delta: postScore.total - preScore.total,
      preScore: preScore.total, postScore: postScore.total,
      isSubstantial: postScore.total - preScore.total >= 5, prBanner: '✅',
      auditEntry: { kind: 'self_renewal.delta_evaluated.v1', runId, productId, delta: postScore.total - preScore.total, at: 'now' },
    })),
    createRenewalPr: vi.fn(async () => ({ prNumber: 42, prUrl: 'api', prHtmlUrl: 'https://github.com/x/y/pull/42', existing: false })),
    readProductPolicy: vi.fn(async () => ({
      selfRenewalNegativeDeltaPolicy: 'ALWAYS_OPEN', selfRenewalMinimumDelta: 0,
      selfRenewalSubstantialThreshold: 5, selfRenewalMaxPerDay: 1, selfRenewalRunawayThreshold: 3,
    })),
    appendGovernanceEntry: vi.fn(async () => ({ written: true })),
  };
}

describe('orchestrator STEP 11 — Phase B re-probe after fix (D42 T1)', () => {
  it('re-probes the post-fix preview URLs and uses fresh findings for postGtm', async () => {
    const { runOrchestration } = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const probeCalls = [];
    const probeAllPages = vi.fn(async ({ urls }) => {
      const callIdx = probeCalls.length;
      probeCalls.push({ urls, callIdx });
      // Pre-fix probe (callIdx 0): 3 high findings.
      // Post-fix re-probe (callIdx 1): only 1 high finding (fix worked).
      const findings = callIdx === 0
        ? [
            { severity: 'high', category: 'broken-modal', location: urls[0], evidence: 'pre-1' },
            { severity: 'high', category: 'broken-modal', location: urls[0], evidence: 'pre-2' },
            { severity: 'high', category: 'broken-modal', location: urls[1] ?? urls[0], evidence: 'pre-3' },
          ]
        : [
            { severity: 'high', category: 'broken-modal', location: urls[0], evidence: 'post-1' },
          ];
      return {
        ok: true,
        pagesProbed: urls.length, urlsAttempted: urls.length,
        perPage: urls.map((u) => ({ ok: true, url: u, findings: [], summary: {} })),
        findings,
        summary: { interactivesTested: callIdx === 0 ? 6 : 8, deadOrErroring: findings.length,
                   modalsFailing: 0, formsFailing: 0, agentsNonFunctional: 0, mockOnlyFlagged: 0,
                   workspacesProbed: 0, workspacesNonFunctional: 0 },
        probedAt: 'now', durationMs: 1,
      };
    });
    const conductStructuredCrawl = vi.fn(async ({ url }) => ({
      pagesCrawled: 2, depth: 1,
      pages: [
        { url: 'https://x/p1', title: 't', headings: [{ tag: 'h1' }], text: 'hi', links: [], forms: [], statusCode: 200, loadTimeMs: 100 },
        { url: 'https://x/p2', title: 't', headings: [{ tag: 'h1' }], text: 'hi', links: [], forms: [], statusCode: 200, loadTimeMs: 100 },
      ],
      brokenLinks: [], forms: [], interactiveElements: [], errors: [], totalTextLength: 4,
    }));
    const scoreCrawlOutput = vi.fn((crawl, extra) => {
      const baseCount = Array.isArray(extra) ? extra.length : 0;
      const score = 100 - (baseCount * 5);
      return {
        score, counts: { critical: 0, high: baseCount, medium: 0, low: 0 },
        band: 'showcase-ready', label: 'showcase-ready',
        penalty: 100 - score, formula: 'test',
        issues: extra ?? [], phaseACount: 0, phaseBCount: baseCount,
      };
    });

    process.env.VERCEL_PROJECT_ID_MYPREGLIFE = 'prj_fake';
    process.env.VERCEL_ORG_ID = 'team_fake';
    process.env.VERCEL_TOKEN = 'vercel_fake';
    try {
      const deps = { ...fullHappyDeps(), conductStructuredCrawl, scoreCrawlOutput, probeAllPages };
      const r = await runOrchestration({
        url: null, mode: 'auto', runId: 'd42-t1-1', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps,
      });
      // Both crawls produced 2 URLs each → probeAllPages was invoked
      // twice: once pre-fix (STEP 4), once post-fix (STEP 11 re-probe).
      expect(probeAllPages).toHaveBeenCalledTimes(2);
      expect(probeCalls[0].urls).toHaveLength(2);
      expect(probeCalls[1].urls).toHaveLength(2);

      const step11 = r.orchestrationLog.find((l) => l.step === 11);
      expect(step11).toBeDefined();
      expect(step11.result.postFixPhaseBPagesProbed).toBe(2);
      expect(step11.result.postFixPhaseBUrlsAttempted).toBe(2);
      expect(step11.result.postFixPhaseBFindingsCount).toBe(1);
      // postGtm uses POST-fix findings (1 high) not pre-fix (3 high).
      // 100 − 1·5 = 95 (vs 100 − 3·5 = 85 if we'd used pre-fix).
      expect(step11.result.gtmScore).toBe(95);
    } finally {
      delete process.env.VERCEL_PROJECT_ID_MYPREGLIFE;
      delete process.env.VERCEL_ORG_ID;
      delete process.env.VERCEL_TOKEN;
    }
  });

  it('falls back to pre-fix phaseBFindings when re-probe fails', async () => {
    const { runOrchestration } = await import('../../../src/lib/agents/renewal/orchestrator.js');
    let callCount = 0;
    const probeAllPages = vi.fn(async ({ urls }) => {
      callCount += 1;
      if (callCount === 2) throw new Error('reprobe_failed_test');
      return {
        ok: true, pagesProbed: 1, urlsAttempted: 1, perPage: [],
        findings: [
          { severity: 'high', category: 'broken-modal', location: urls[0], evidence: 'persistent' },
          { severity: 'high', category: 'broken-modal', location: urls[0], evidence: 'persistent-2' },
        ],
        summary: { interactivesTested: 1, deadOrErroring: 2, modalsFailing: 0, formsFailing: 0, agentsNonFunctional: 0, mockOnlyFlagged: 0, workspacesProbed: 0, workspacesNonFunctional: 0 },
        probedAt: 'now', durationMs: 1,
      };
    });
    const conductStructuredCrawl = vi.fn(async ({ url }) => ({
      pagesCrawled: 1, depth: 1,
      pages: [{ url: 'https://x/p1', title: 't', headings: [{ tag: 'h1' }], text: 'hi', links: [], forms: [], statusCode: 200, loadTimeMs: 100 }],
      brokenLinks: [], forms: [], interactiveElements: [], errors: [], totalTextLength: 2,
    }));
    const scoreCrawlOutput = vi.fn((crawl, extra) => {
      const baseCount = Array.isArray(extra) ? extra.length : 0;
      return { score: 100 - (baseCount * 5), counts: { critical: 0, high: baseCount, medium: 0, low: 0 }, band: 'showcase-ready', label: 'x', penalty: baseCount * 5, formula: 't', issues: extra ?? [], phaseACount: 0, phaseBCount: baseCount };
    });

    process.env.VERCEL_PROJECT_ID_MYPREGLIFE = 'prj_fake';
    process.env.VERCEL_ORG_ID = 'team_fake';
    process.env.VERCEL_TOKEN = 'vercel_fake';
    try {
      const deps = { ...fullHappyDeps(), conductStructuredCrawl, scoreCrawlOutput, probeAllPages };
      const r = await runOrchestration({
        url: null, mode: 'auto', runId: 'd42-t1-2', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps,
      });
      const step11 = r.orchestrationLog.find((l) => l.step === 11);
      // Re-probe threw; pre-fix findings (2 high) used as fallback.
      // postFixPhaseBPagesProbed stays at 0 (re-probe didn't succeed).
      expect(step11.result.postFixPhaseBPagesProbed).toBe(0);
      // postGtm still computed from pre-fix findings.
      expect(step11.result.gtmScore).toBe(90);                  // 100 − 2·5
    } finally {
      delete process.env.VERCEL_PROJECT_ID_MYPREGLIFE;
      delete process.env.VERCEL_ORG_ID;
      delete process.env.VERCEL_TOKEN;
    }
  });

  it('does NOT re-probe when deploy is degraded (preview URL absent)', async () => {
    const { runOrchestration } = await import('../../../src/lib/agents/renewal/orchestrator.js');
    const probeAllPages = vi.fn(async ({ urls }) => ({
      ok: true, pagesProbed: 1, urlsAttempted: 1, perPage: [],
      findings: [{ severity: 'high', category: 'broken-modal', location: urls[0], evidence: 'x' }],
      summary: { interactivesTested: 1, deadOrErroring: 1, modalsFailing: 0, formsFailing: 0, agentsNonFunctional: 0, mockOnlyFlagged: 0, workspacesProbed: 0, workspacesNonFunctional: 0 },
      probedAt: 'now', durationMs: 1,
    }));
    const conductStructuredCrawl = vi.fn(async ({ url }) => ({
      pagesCrawled: 1, depth: 1,
      pages: [{ url: 'https://x/p1', title: 't', headings: [{ tag: 'h1' }], text: 'hi', links: [], forms: [], statusCode: 200, loadTimeMs: 100 }],
      brokenLinks: [], forms: [], interactiveElements: [], errors: [], totalTextLength: 2,
    }));

    process.env.VERCEL_PROJECT_ID_MYPREGLIFE = 'prj_fake';
    process.env.VERCEL_ORG_ID = 'team_fake';
    process.env.VERCEL_TOKEN = 'vercel_fake';
    try {
      const deps = {
        ...fullHappyDeps(),
        conductStructuredCrawl,
        scoreCrawlOutput: vi.fn(() => ({ score: 90, counts: { critical: 0, high: 1, medium: 0, low: 0 }, band: 'x', label: 'x', penalty: 5, formula: 't', issues: [], phaseACount: 0, phaseBCount: 1 })),
        probeAllPages,
        // Force deploy-degraded by making the preview deploy throw.
        deployBranchPreview: vi.fn(async () => { throw new Error('deploy_failed_test'); }),
      };
      await runOrchestration({
        url: null, mode: 'auto', runId: 'd42-t1-3', supabase: null,
        environment: 'prd', gtmTarget: 95, maxIterations: 1, deps,
      });
      // probeAllPages called once (STEP 4 pre-fix) but NOT a second
      // time (STEP 11 re-probe skipped due to deploy-degraded).
      expect(probeAllPages).toHaveBeenCalledTimes(1);
    } finally {
      delete process.env.VERCEL_PROJECT_ID_MYPREGLIFE;
      delete process.env.VERCEL_ORG_ID;
      delete process.env.VERCEL_TOKEN;
    }
  });
});
