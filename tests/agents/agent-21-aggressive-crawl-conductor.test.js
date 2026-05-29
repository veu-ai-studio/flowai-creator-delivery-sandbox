// tests/agents/agent-21-aggressive-crawl-conductor.test.js
//
// Phase 1 Master Phased Build (SSOT §6, Panel ruling 30e5edb) coverage:
//   - Charter integrity vs canonical SSOT §15.1 row 21
//   - Constructor dep validation
//   - plan() recommend-only envelope (no side effects, no authority needed)
//   - act() routes through aggressiveCrawl and emits 21.crawl.completed.v1
//   - conductCrawl() happy path with multi-page report
//   - conductCrawl() fallback to single-page crawl() when aggressiveCrawl
//     returns 0 pages
//   - Auth-gated heuristic marks pages WITHOUT attempting login
//   - normaliseToResearchShape() back-compat for api/research-url.js
//   - CROSS_STEP_OWNERS exposes 'crawl' → 21 (Hub wire-in)
//
// All tests mock aggressiveCrawl + crawl from api/_lib/crawler.js — no
// live network. Mirrors the test rigor of Agent #3 Executor tests.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the crawler module BEFORE importing the Conductor so the mocked
// aggressiveCrawl + crawl are picked up.
vi.mock('../../api/_lib/crawler.js', () => ({
  aggressiveCrawl: vi.fn(),
  crawl: vi.fn(),
}));

import { aggressiveCrawl, crawl } from '../../api/_lib/crawler.js';
import {
  Agent21AggressiveCrawlConductor,
  __internals as AG21_INTERNALS,
} from '../../src/lib/agents/agents/Agent21AggressiveCrawlConductor.js';
import { CROSS_STEP_OWNERS } from '../../src/lib/agents/orchestrator/OrchestratorHub.ts';
import { getAgent } from '../../src/lib/agents/_registry.ts';

function makeBus() {
  const published = [];
  return {
    publish: vi.fn(async (env) => { published.push(env); }),
    subscribe: vi.fn(() => () => {}),
    _peek: () => published,
  };
}

function makeDeps(extras = {}) {
  let t = 1_800_000_000_000;
  return {
    deps: {
      clock: { now: () => t },
      messageBus: makeBus(),
      auditLog: { write: vi.fn(async () => {}) },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      productScope: 'flowai',
      environment: 'prod',
      ...extras,
    },
    advance: (ms) => { t += ms; },
  };
}

function makeCrawlReport(pages = []) {
  return {
    ok: true,
    startUrl: 'https://neutral.example/',
    origin: 'https://neutral.example',
    depth: 8,
    pageCap: 200,
    pagesCrawled: pages.filter((p) => p.ok !== false).length,
    pages,
    errors: [],
    warnings: [],
    startedAt: '2026-05-16T00:00:00.000Z',
    finishedAt: '2026-05-16T00:00:01.000Z',
    durationMs: 1000,
  };
}

function makePage(url, overrides = {}) {
  return {
    url,
    normalisedUrl: url.toLowerCase(),
    depth: 0,
    parent: null,
    title: `Title of ${url}`,
    metaDescription: 'meta description',
    bodyText: 'Plenty of body content for analysis. Sign up free today.',
    headings: [{ tag: 'h1', text: 'Welcome' }],
    surfaces: { links: [], buttons: [], forms: [], images: [] },
    accessibility: { headingHierarchyOk: true },
    timing: {},
    consoleErrors: [],
    networkErrors: [],
    method: 'browserless-function',
    jsRendered: true,
    ok: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ────────────────────────────────────────────────────────────────────────
// Charter integrity vs canonical SSOT §15.1 row 21
// ────────────────────────────────────────────────────────────────────────

describe('Agent #21 charter (Phase 1)', () => {
  it('registry entry mirrors the canonical Aggressive Crawl Conductor charter', () => {
    const r = getAgent(21);
    expect(r).toBeDefined();
    expect(r?.name).toBe('Ops Runner Alpha — Aggressive Crawl Conductor');
    expect(r?.mode).toBe('step-owner');
    expect(r?.authority).toEqual(['recommend_only', 'auto_write_internal', 'requires_human_gate']);
    expect(r?.requiredCredentials).toEqual(['BROWSERLESS_API_KEY', 'ANTHROPIC_API_KEY']);
    expect(r?.consumes).toContain('1.crawl.request.v1');
    expect(r?.consumes).toContain('10.ssot.updated.v1');
    expect(r?.produces).toContain('21.crawl.completed.v1');
    expect(r?.produces).toContain('21.issues.detected.v1');
    expect(r?.produces).toContain('21.gtm.readiness.v1');
  });

  it('static charter() sources from registry and declares embedded + dual+gate authority', () => {
    const c = Agent21AggressiveCrawlConductor.charter();
    expect(c.id).toBe(21);
    expect(c.flowAiOnly).toBe(false);
    expect(c.authority).toEqual(['recommend_only', 'auto_write_internal', 'requires_human_gate']);
    expect(c.marketplaceTools).toEqual(['playwright', 'browserless', 'anthropic-api']);
    expect(c.requiredCredentials).toEqual(['BROWSERLESS_API_KEY', 'ANTHROPIC_API_KEY']);
  });

  it('constructor validates required messageBus dep', () => {
    // BaseAgent's parent constructor catches missing messageBus first with
    // its own canonical message; the Conductor's defensive check is a
    // belt-and-suspenders second layer. Either error surface is acceptable
    // — the contract is "missing messageBus throws."
    expect(() => new Agent21AggressiveCrawlConductor({
      clock: { now: () => 0 },
      logger: {},
      auditLog: { write: async () => {} },
      productScope: 'flowai',
      environment: 'prod',
    })).toThrow(/messageBus/);
  });

  it('OrchestratorHub CROSS_STEP_OWNERS maps crawl → 21', () => {
    expect(CROSS_STEP_OWNERS.crawl).toBe(21);
  });
});

// ────────────────────────────────────────────────────────────────────────
// plan() recommend-only contract (Phase 1)
// ────────────────────────────────────────────────────────────────────────

describe('plan() Phase 1', () => {
  it('returns recommend-only plan with no side effects and no authority needed', async () => {
    const { deps } = makeDeps();
    const ag = new Agent21AggressiveCrawlConductor(deps);
    const plan = await ag.plan({ input: { kind: 'crawl.request', url: 'https://neutral.example/' } });
    expect(plan.authorityNeeded).toEqual([]);
    expect(plan.sideEffects).toEqual([]);
    expect(plan.outcome).toBe('crawl_planned');
    expect(plan.url).toBe('https://neutral.example/');
  });

  it('rejects wrong input.kind', async () => {
    const { deps } = makeDeps();
    const ag = new Agent21AggressiveCrawlConductor(deps);
    await expect(ag.plan({ input: { kind: 'foo', url: 'https://x.test' } })).rejects.toThrow(/crawl.request/);
  });

  it('rejects empty url', async () => {
    const { deps } = makeDeps();
    const ag = new Agent21AggressiveCrawlConductor(deps);
    await expect(ag.plan({ input: { kind: 'crawl.request', url: '' } })).rejects.toThrow(/url required/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// act() — routes through aggressiveCrawl, emits crawl.completed
// ────────────────────────────────────────────────────────────────────────

describe('act() Phase 1', () => {
  it('routes through aggressiveCrawl and emits 21.crawl.completed.v1', async () => {
    aggressiveCrawl.mockResolvedValueOnce(makeCrawlReport([makePage('https://neutral.example/')]));
    const { deps } = makeDeps();
    const ag = new Agent21AggressiveCrawlConductor(deps);
    const plan = await ag.plan({ input: { kind: 'crawl.request', url: 'https://neutral.example/' } });
    const result = await ag.act({ input: { kind: 'crawl.request', url: 'https://neutral.example/' } }, plan);
    expect(aggressiveCrawl).toHaveBeenCalledOnce();
    expect(result.outcome).toBe('crawl_completed');
    expect(result.sideEffects).toEqual([]);
    expect(result.report.pagesCrawled).toBe(1);
    const published = deps.messageBus._peek();
    expect(published.length).toBe(1);
    expect(published[0].topic).toBe('21.crawl.completed.v1');
    expect(published[0].payload.pagesCrawled).toBe(1);
  });

  it('act() rejects plans declaring side effects (Phase 1 recommend-only invariant)', async () => {
    const { deps } = makeDeps();
    const ag = new Agent21AggressiveCrawlConductor(deps);
    const fakePlan = Object.freeze({ url: 'https://x.test', sideEffects: [{ kind: 'write' }] });
    await expect(ag.act({ input: {} }, fakePlan)).rejects.toThrow(/recommend_only forbids sideEffects/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// conductCrawl() — multi-page + auth-gated marking + fallback
// ────────────────────────────────────────────────────────────────────────

describe('conductCrawl()', () => {
  it('returns multi-page CrawlReport when aggressiveCrawl succeeds', async () => {
    aggressiveCrawl.mockResolvedValueOnce(makeCrawlReport([
      makePage('https://neutral.example/'),
      makePage('https://neutral.example/about', { depth: 1 }),
      makePage('https://neutral.example/pricing', { depth: 1 }),
    ]));
    const { deps } = makeDeps();
    const ag = new Agent21AggressiveCrawlConductor(deps);
    const report = await ag.conductCrawl('https://neutral.example/', { depth: 8, maxPages: 200 });
    expect(report.ok).toBe(true);
    expect(report.pagesCrawled).toBe(3);
    expect(report.fallbackUsed).toBe(false);
    expect(report.authGatedCount).toBe(0);
  });

  it('marks auth-gated pages without attempting login (Phase 1 honest scope)', async () => {
    aggressiveCrawl.mockResolvedValueOnce(makeCrawlReport([
      makePage('https://neutral.example/'),
      makePage('https://neutral.example/dashboard', {
        depth: 1,
        title: 'Sign In',
        bodyText: 'Please log in to continue.',
      }),
    ]));
    const { deps } = makeDeps();
    const ag = new Agent21AggressiveCrawlConductor(deps);
    const report = await ag.conductCrawl('https://neutral.example/', { depth: 8 });
    expect(report.authGatedCount).toBe(1);
    const gatedPage = report.pages.find((p) => p.url === 'https://neutral.example/dashboard');
    expect(gatedPage.authGated).toBe(true);
    // Login was NOT attempted — Phase 1 honest scope.
    expect(crawl).not.toHaveBeenCalled();
  });

  it('falls back to single-page crawl() when aggressiveCrawl returns 0 pages', async () => {
    aggressiveCrawl.mockResolvedValueOnce({
      ok: true,
      startUrl: 'https://neutral.example/',
      origin: 'https://neutral.example',
      depth: 8,
      pageCap: 200,
      pagesCrawled: 0,
      pages: [],
      errors: [],
      warnings: ['BROWSERLESS_API_KEY not set'],
      startedAt: '2026-05-16T00:00:00.000Z',
      finishedAt: '2026-05-16T00:00:00.000Z',
      durationMs: 0,
    });
    crawl.mockResolvedValueOnce({
      ok: true,
      url: 'https://neutral.example/',
      method: 'simple-fetch',
      jsRendered: false,
      title: 'Fallback',
      metaDescription: '',
      bodyText: 'Fallback body',
      headings: [],
      links: [],
      warnings: [],
    });
    const { deps } = makeDeps();
    const ag = new Agent21AggressiveCrawlConductor(deps);
    const report = await ag.conductCrawl('https://neutral.example/');
    expect(report.fallbackUsed).toBe(true);
    expect(report.pagesCrawled).toBe(1);
    expect(report.pages[0].method).toBe('simple-fetch');
    expect(report.warnings.some((w) => /degraded to single-page/.test(w))).toBe(true);
  });

  it('returns ok:false on empty url', async () => {
    const { deps } = makeDeps();
    const ag = new Agent21AggressiveCrawlConductor(deps);
    const report = await ag.conductCrawl('');
    expect(report.ok).toBe(false);
    expect(report.errors[0]).toMatchObject({ phase: 'input', reason: 'url_required' });
    expect(aggressiveCrawl).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────
// normaliseToResearchShape — back-compat for api/research-url.js
// ────────────────────────────────────────────────────────────────────────

describe('normaliseToResearchShape()', () => {
  it('extracts root page as primary + lists discovered pages as sidecar', () => {
    const report = makeCrawlReport([
      makePage('https://neutral.example/', { depth: 0 }),
      makePage('https://neutral.example/about', { depth: 1 }),
      makePage('https://neutral.example/pricing', { depth: 1 }),
    ]);
    report.authGatedCount = 0;
    report.fallbackUsed = false;
    const out = Agent21AggressiveCrawlConductor.normaliseToResearchShape(report);
    expect(out.ok).toBe(true);
    expect(out.primary.url).toBe('https://neutral.example/');
    expect(out.discoveredPages).toHaveLength(2);
    expect(out.discoveredPages.map((p) => p.url)).toEqual([
      'https://neutral.example/about',
      'https://neutral.example/pricing',
    ]);
    expect(out.authGatedCount).toBe(0);
    expect(out.pagesCrawled).toBe(3);
  });

  it('preserves authGated flag on discovered pages', () => {
    const report = makeCrawlReport([
      makePage('https://neutral.example/', { depth: 0 }),
      makePage('https://neutral.example/secret', { depth: 1, authGated: true }),
    ]);
    report.authGatedCount = 1;
    const out = Agent21AggressiveCrawlConductor.normaliseToResearchShape(report);
    expect(out.discoveredPages[0].authGated).toBe(true);
  });

  it('returns ok:false when report has no pages', () => {
    const report = { ok: true, pages: [], warnings: ['nothing'], errors: [] };
    const out = Agent21AggressiveCrawlConductor.normaliseToResearchShape(report);
    expect(out.ok).toBe(false);
    expect(out.primary).toBeNull();
    expect(out.warnings).toEqual(['nothing']);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Auth-gated heuristic (internal)
// ────────────────────────────────────────────────────────────────────────

describe('isAuthGated heuristic (internal)', () => {
  it('flags short body + sign-in keyword', () => {
    expect(AG21_INTERNALS.isAuthGated({ title: 'Sign In', bodyText: 'Please log in.' })).toBe(true);
  });
  it('does not flag normal long-content pages even if word "login" appears', () => {
    const longBody = 'Welcome to the marketing site. '.repeat(50) + 'Find our login portal here.';
    expect(AG21_INTERNALS.isAuthGated({ title: 'Marketing Home', bodyText: longBody })).toBe(false);
  });
  it('does not flag empty objects', () => {
    expect(AG21_INTERNALS.isAuthGated({})).toBe(false);
    expect(AG21_INTERNALS.isAuthGated(null)).toBe(false);
  });
});
