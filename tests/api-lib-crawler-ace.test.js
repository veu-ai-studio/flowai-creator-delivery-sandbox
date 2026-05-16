// tests/api-lib-crawler-ace.test.js
//
// Smoke test for the Aggressive Crawl Engine Phase 1 upgrade
// (api/_lib/crawler.js → aggressiveCrawl). Mocks the Browserless
// /function endpoint (the canonical per-page render path); never
// makes live network calls. Asserts:
//   - JS-rendered body content is non-null for the start URL
//   - BFS follows same-origin internal links
//   - CrawlReport JSON shape conforms to spec §A
//   - Doppler-overridable hard caps (CRAWL_DEPTH_HARD_CAP +
//     CRAWL_MAX_PAGES_HARD_CAP) clamp the configured depth/maxPages
//   - Product-agnostic: no hardcoded URLs / product names in the
//     engine itself — verified by passing a neutral test URL at
//     runtime.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_FETCH = globalThis.fetch;

function mockBrowserlessFn(pageMap) {
  // pageMap: { '<full-url>': { title, bodyText, links: [{text, href, isInternal}], ... } }
  return vi.fn(async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url ?? '';
    if (!url.includes('browserless.io/function')) {
      throw new Error(`unexpected fetch target: ${url}`);
    }
    const payload = JSON.parse(init.body || '{}');
    const targetUrl = payload?.context?.url;
    const page = pageMap[targetUrl];
    if (!page) {
      return new Response(JSON.stringify({ ok: false, reason: 'unknown target in test fixture' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        ok: true,
        status: 200,
        url: targetUrl,
        finalUrl: targetUrl,
        timing: { navigationMs: 120, loadMs: 800, domContentLoadedMs: 400 },
        consoleErrors: [],
        networkErrors: [],
        surfaces: {
          links: page.links ?? [],
          buttons: page.buttons ?? [],
          forms: page.forms ?? [],
          images: page.images ?? [],
          headings: page.headings ?? [],
        },
        accessibility: { headingHierarchyOk: true, totalImages: 0, imagesMissingAlt: 0 },
        title: page.title ?? '',
        metaDescription: page.metaDescription ?? '',
        bodyText: page.bodyText ?? '',
        htmlLength: (page.bodyText ?? '').length + 200,
        screenshot: null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  });
}

describe('Aggressive Crawl Engine Phase 1 (api/_lib/crawler.js)', () => {
  let savedEnv;
  beforeEach(() => {
    savedEnv = { ...process.env };
    process.env.BROWSERLESS_API_KEY = 'test-key-not-real';
  });
  afterEach(() => {
    process.env = savedEnv;
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('renders the start URL via Browserless /function and returns non-null body', async () => {
    globalThis.fetch = mockBrowserlessFn({
      'https://neutral.example/': {
        title: 'Neutral Test SPA',
        metaDescription: 'A neutral SPA fixture used only for tests',
        bodyText: 'This is the JS-rendered body. It would be empty under a static fetch.',
        headings: [{ tag: 'h1', text: 'Welcome' }],
        links: [],
      },
    });
    const { aggressiveCrawl } = await import('../api/_lib/crawler.js');
    const report = await aggressiveCrawl('https://neutral.example/', { depth: 0, maxPages: 1 });
    expect(report.ok).toBe(true);
    expect(report.pagesCrawled).toBe(1);
    expect(report.pages[0].bodyText.length).toBeGreaterThan(0);
    expect(report.pages[0].method).toBe('browserless-function');
    expect(report.pages[0].jsRendered).toBe(true);
    expect(report.pages[0].title).toBe('Neutral Test SPA');
  });

  it('CrawlReport JSON shape conforms to spec §A (startUrl, origin, depth, pageCap, pages[], errors[], warnings[], timing fields)', async () => {
    globalThis.fetch = mockBrowserlessFn({
      'https://neutral.example/': { title: 't', bodyText: 'b' },
    });
    const { aggressiveCrawl } = await import('../api/_lib/crawler.js');
    const report = await aggressiveCrawl('https://neutral.example/', { depth: 0, maxPages: 1 });
    // Top-level shape
    expect(report).toMatchObject({
      ok: expect.any(Boolean),
      startUrl: 'https://neutral.example/',
      origin: 'https://neutral.example',
      depth: expect.any(Number),
      pageCap: expect.any(Number),
      pagesCrawled: expect.any(Number),
      pages: expect.any(Array),
      errors: expect.any(Array),
      warnings: expect.any(Array),
      startedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      finishedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      durationMs: expect.any(Number),
    });
    // PageRecord shape
    expect(report.pages[0]).toMatchObject({
      url: expect.any(String),
      normalisedUrl: expect.any(String),
      depth: expect.any(Number),
      title: expect.any(String),
      bodyText: expect.any(String),
      headings: expect.any(Array),
      surfaces: expect.objectContaining({
        links: expect.any(Array),
        buttons: expect.any(Array),
        forms: expect.any(Array),
        images: expect.any(Array),
      }),
      method: expect.any(String),
      jsRendered: expect.any(Boolean),
      ok: expect.any(Boolean),
    });
  });

  it('BFS follows same-origin internal links up to configured depth', async () => {
    globalThis.fetch = mockBrowserlessFn({
      'https://neutral.example/': {
        title: 'home',
        bodyText: 'root',
        links: [
          { text: 'About', href: 'https://neutral.example/about', isInternal: true },
          { text: 'External', href: 'https://other.example/', isInternal: false },
        ],
      },
      'https://neutral.example/about': {
        title: 'about',
        bodyText: 'about page',
        links: [{ text: 'Team', href: 'https://neutral.example/about/team', isInternal: true }],
      },
      'https://neutral.example/about/team': {
        title: 'team',
        bodyText: 'team page',
        links: [],
      },
    });
    const { aggressiveCrawl } = await import('../api/_lib/crawler.js');
    const report = await aggressiveCrawl('https://neutral.example/', { depth: 2, maxPages: 10 });
    expect(report.ok).toBe(true);
    expect(report.pagesCrawled).toBe(3);
    const urls = report.pages.map((p) => p.url);
    expect(urls).toContain('https://neutral.example/');
    expect(urls).toContain('https://neutral.example/about');
    expect(urls).toContain('https://neutral.example/about/team');
    // External link NOT followed
    expect(urls.every((u) => !u.startsWith('https://other.example'))).toBe(true);
  });

  it('depth cap clamps to ACE_DEFAULTS.depthHardCap by default', async () => {
    globalThis.fetch = mockBrowserlessFn({
      'https://neutral.example/': { title: 't', bodyText: 'b', links: [] },
    });
    const { aggressiveCrawl, ACE_DEFAULTS } = await import('../api/_lib/crawler.js');
    // Request depth above the hard cap — should clamp.
    const report = await aggressiveCrawl('https://neutral.example/', { depth: 999, maxPages: 1 });
    expect(report.depth).toBeLessThanOrEqual(ACE_DEFAULTS.depthHardCap);
  });

  it('maxPages cap clamps to ACE_DEFAULTS.maxPagesHardCap by default', async () => {
    globalThis.fetch = mockBrowserlessFn({
      'https://neutral.example/': { title: 't', bodyText: 'b', links: [] },
    });
    const { aggressiveCrawl, ACE_DEFAULTS } = await import('../api/_lib/crawler.js');
    const report = await aggressiveCrawl('https://neutral.example/', { depth: 0, maxPages: 99999 });
    expect(report.pageCap).toBeLessThanOrEqual(ACE_DEFAULTS.maxPagesHardCap);
  });

  it('CRAWL_DEPTH_HARD_CAP env override lifts the depth ceiling', async () => {
    globalThis.fetch = mockBrowserlessFn({
      'https://neutral.example/': { title: 't', bodyText: 'b', links: [] },
    });
    process.env.CRAWL_DEPTH_HARD_CAP = '20';
    const { aggressiveCrawl } = await import('../api/_lib/crawler.js');
    const report = await aggressiveCrawl('https://neutral.example/', { depth: 18, maxPages: 1 });
    expect(report.depth).toBe(18);
  });

  it('returns ok:false on empty/missing startUrl', async () => {
    globalThis.fetch = mockBrowserlessFn({});
    const { aggressiveCrawl } = await import('../api/_lib/crawler.js');
    const report = await aggressiveCrawl('');
    expect(report.ok).toBe(false);
    expect(report.errors[0]).toMatchObject({ phase: 'input', reason: 'startUrl_required' });
  });

  it('returns ok:false on invalid URL', async () => {
    globalThis.fetch = mockBrowserlessFn({});
    const { aggressiveCrawl } = await import('../api/_lib/crawler.js');
    const report = await aggressiveCrawl('not a url at all');
    expect(report.ok).toBe(false);
    expect(report.errors[0]).toMatchObject({ phase: 'input', reason: 'invalid_url' });
  });

  it('surfaces warning when BROWSERLESS_API_KEY is not set (degrades to simple-fetch path)', async () => {
    delete process.env.BROWSERLESS_API_KEY;
    // Mock the simple-fetch path's fetch — it doesn't hit Browserless.
    globalThis.fetch = vi.fn(async () =>
      new Response('<html><head><title>fallback</title></head><body><h1>x</h1>hello</body></html>', {
        status: 200, headers: { 'Content-Type': 'text/html' },
      }),
    );
    const { aggressiveCrawl } = await import('../api/_lib/crawler.js');
    const report = await aggressiveCrawl('https://neutral.example/', { depth: 0, maxPages: 1 });
    expect(report.warnings.some((w) => /BROWSERLESS_API_KEY not set/i.test(w))).toBe(true);
  });

  it('honours the default depth=8 / maxPages=200 from CANONICAL_REFERENCE §6 when caller omits opts', async () => {
    globalThis.fetch = mockBrowserlessFn({
      'https://neutral.example/': { title: 't', bodyText: 'b', links: [] },
    });
    const { aggressiveCrawl, ACE_DEFAULTS } = await import('../api/_lib/crawler.js');
    expect(ACE_DEFAULTS.depth).toBe(8);
    expect(ACE_DEFAULTS.maxPages).toBe(200);
    expect(ACE_DEFAULTS.depthHardCap).toBe(12);
    expect(ACE_DEFAULTS.maxPagesHardCap).toBe(2000);
    const report = await aggressiveCrawl('https://neutral.example/');
    expect(report.depth).toBe(8);
    expect(report.pageCap).toBe(200);
  });
});
