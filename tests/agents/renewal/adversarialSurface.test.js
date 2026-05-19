// tests/agents/renewal/adversarialSurface.test.js
//
// D39 T1 — adversarialSurface skeleton tests (browser executor +
// orchestration envelope). Probes themselves (T2-T5) are stubbed in
// via opts so the skeleton can be exercised without a real browser.

import { describe, it, expect, vi } from 'vitest';
import {
  probeAdversarialSurface,
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
    evaluate: vi.fn(async () => null),
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
