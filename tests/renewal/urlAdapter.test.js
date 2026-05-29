import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeParseClaudeJson } from '../../api/_lib/inputAdapters/url.js';

// Mock the crawler + Claude modules so the adapter can be exercised without
// real Browserless / Anthropic calls. Post ACE Phase 1 promotion
// (CANONICAL §6, ENTRY 006), the BFS spider lives in api/_lib/crawler.js
// as `aggressiveCrawl` and url.js's adaptUrl wraps it. The standalone BFS
// spider unit tests are covered by tests/api-lib-crawler-ace.test.js;
// this file now exercises adaptUrl's Claude-normalisation behaviour with
// a stubbed CrawlReport.
vi.mock('../../api/_lib/crawler.js', () => ({
  crawl: vi.fn(),
  aggressiveCrawl: vi.fn(),
}));
vi.mock('../../api/_lib/claude.js', () => ({
  callClaude: vi.fn(),
  setCorsHeaders: vi.fn(),
}));

import { aggressiveCrawl } from '../../api/_lib/crawler.js';
import { callClaude } from '../../api/_lib/claude.js';
import { adaptUrl } from '../../api/_lib/inputAdapters/url.js';

// CrawlReport stub matching the ACE Phase 1 PageRecord shape.
const okCrawlReport = (url, pageOverrides = {}) => ({
  ok: true,
  startUrl: url,
  origin: new URL(url).origin,
  depth: 0,
  pageCap: 1,
  pagesCrawled: 1,
  pages: [{
    url,
    normalisedUrl: url.toLowerCase(),
    depth: 0,
    parent: null,
    title: `Title of ${url}`,
    metaDescription: 'meta desc for the page',
    bodyText: 'Some body content for analysis. Sign up free today.',
    headings: [{ tag: 'h1', text: 'Main heading' }],
    surfaces: { links: [], buttons: [], forms: [], images: [] },
    accessibility: { headingHierarchyOk: true },
    timing: {},
    consoleErrors: [],
    networkErrors: [],
    method: 'browserless-function',
    jsRendered: true,
    ok: true,
    ...pageOverrides,
  }],
  errors: [],
  warnings: [],
  startedAt: '2026-05-15T00:00:00.000Z',
  finishedAt: '2026-05-15T00:00:01.000Z',
  durationMs: 1000,
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('safeParseClaudeJson', () => {
  it('parses plain JSON', () => {
    expect(safeParseClaudeJson('{"a":1}')).toEqual({ a: 1 });
  });
  it('strips ```json fences', () => {
    expect(safeParseClaudeJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('strips plain ``` fences', () => {
    expect(safeParseClaudeJson('```\n{"a":2}\n```')).toEqual({ a: 2 });
  });
  it('returns null on garbage', () => {
    expect(safeParseClaudeJson('not json at all')).toBeNull();
    expect(safeParseClaudeJson(null)).toBeNull();
    expect(safeParseClaudeJson('')).toBeNull();
  });
  it('recovers a {...} block from surrounding prose', () => {
    expect(safeParseClaudeJson('here is your data {"x":5} thanks')).toEqual({ x: 5 });
  });
});

// BFS spider unit tests are now in tests/api-lib-crawler-ace.test.js
// (ACE Phase 1 promotion moved the implementation from url.js to
// crawler.js per CANONICAL §6 + ENTRY 006). This file covers adaptUrl's
// Claude-normalisation behaviour with a stubbed CrawlReport.

describe('adaptUrl', () => {
  it('returns ok:false + empty normalized when URL is empty', async () => {
    const r = await adaptUrl('   ');
    expect(r.ok).toBe(false);
    expect(r.normalized.productConcept).toBe('');
  });

  it('normalizes via Claude when crawl succeeds', async () => {
    aggressiveCrawl.mockResolvedValueOnce(okCrawlReport('https://x.test'));
    callClaude.mockResolvedValueOnce({
      text: '{"productConcept":"Concept X","targetUsers":"Users Y","coreClaims":["c1"],"detectedFeatures":["f1"]}',
    });
    const r = await adaptUrl('https://x.test', { depth: 0, maxPages: 1 });
    expect(r.ok).toBe(true);
    expect(r.normalized.productConcept).toBe('Concept X');
    expect(r.normalized.targetUsers).toBe('Users Y');
    expect(r.normalized.coreClaims).toEqual(['c1']);
    expect(r.normalized.observedSurfaces).toBe('crawl');
  });

  it('falls back to heuristic when Claude throws', async () => {
    aggressiveCrawl.mockResolvedValueOnce(okCrawlReport('https://x.test'));
    callClaude.mockRejectedValueOnce(new Error('no api key'));
    const r = await adaptUrl('https://x.test', { depth: 0, maxPages: 1 });
    expect(r.ok).toBe(true);
    expect(r.normalized.observedSurfaces).toBe('crawl');
    // Heuristic uses meta description as concept.
    expect(r.normalized.productConcept).toMatch(/meta desc/);
  });

  it('returns ok:false on unreachable root with empty evidence', async () => {
    aggressiveCrawl.mockResolvedValueOnce({
      ok: false,
      startUrl: 'https://x.test',
      origin: '',
      depth: 0,
      pageCap: 0,
      pagesCrawled: 0,
      pages: [],
      errors: [{ phase: 'input', url: 'https://x.test', reason: 'timeout' }],
      warnings: [],
      startedAt: '2026-05-15T00:00:00.000Z',
      finishedAt: '2026-05-15T00:00:00.000Z',
      durationMs: 0,
    });
    const r = await adaptUrl('https://x.test');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/timeout/);
    expect(r.normalized.observedSurfaces).toBe('crawl');
  });

  it('returns ok:false when CrawlReport has zero rendered pages', async () => {
    // ACE Phase 1 can return ok:true with pagesCrawled=0 (e.g. all
    // render attempts fail but the BFS completed). adaptUrl treats this
    // as adapter failure since no evidence was produced.
    aggressiveCrawl.mockResolvedValueOnce({
      ok: true,
      startUrl: 'https://x.test',
      origin: 'https://x.test',
      depth: 0,
      pageCap: 1,
      pagesCrawled: 0,
      pages: [],
      errors: [{ phase: 'render', url: 'https://x.test', reason: '500_upstream' }],
      warnings: [],
      startedAt: '2026-05-15T00:00:00.000Z',
      finishedAt: '2026-05-15T00:00:00.000Z',
      durationMs: 0,
    });
    const r = await adaptUrl('https://x.test');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/500_upstream|render/);
  });
});
