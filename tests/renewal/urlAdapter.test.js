import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeParseClaudeJson } from '../../api/_lib/inputAdapters/url.js';

// Mock the crawler + Claude modules so the adapter can be exercised without
// real Browserless / Anthropic calls.
vi.mock('../../api/_lib/crawler.js', () => ({
  crawl: vi.fn(),
}));
vi.mock('../../api/_lib/claude.js', () => ({
  callClaude: vi.fn(),
  setCorsHeaders: vi.fn(),
}));

import { crawl } from '../../api/_lib/crawler.js';
import { callClaude } from '../../api/_lib/claude.js';
import { adaptUrl, aggressiveCrawl } from '../../api/_lib/inputAdapters/url.js';

const okPage = (url, links = []) => ({
  ok: true,
  url,
  method: 'browserless',
  jsRendered: true,
  title: `Title of ${url}`,
  metaDescription: 'meta desc for the page',
  headings: [{ tag: 'h1', text: 'Main heading' }],
  bodyText: 'Some body content for analysis. Sign up free today.',
  links,
  warnings: [],
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

describe('aggressiveCrawl', () => {
  it('returns ok:false when the root crawl fails', async () => {
    crawl.mockResolvedValueOnce({ ok: false, reason: 'unreachable' });
    const r = await aggressiveCrawl('https://x.test');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('unreachable');
    expect(r.pages).toEqual([]);
  });

  it('crawls the root and one level of same-origin internal links (depth=1)', async () => {
    crawl
      .mockResolvedValueOnce(okPage('https://x.test', [{ href: 'https://x.test/about' }, { href: 'https://x.test/pricing' }, { href: 'https://other.test/ignore' }]))
      .mockResolvedValueOnce(okPage('https://x.test/about'))
      .mockResolvedValueOnce(okPage('https://x.test/pricing'));
    const r = await aggressiveCrawl('https://x.test', { depth: 1, maxPages: 5 });
    expect(r.ok).toBe(true);
    expect(r.pagesCrawled).toBe(3);
    const urls = r.pages.map((p) => p.url);
    expect(urls).toContain('https://x.test');
    expect(urls).toContain('https://x.test/about');
    expect(urls).toContain('https://x.test/pricing');
    expect(urls.some((u) => u.includes('other.test'))).toBe(false);
  });

  it('caps at maxPages', async () => {
    crawl
      .mockResolvedValueOnce(okPage('https://x.test', [
        { href: 'https://x.test/a' }, { href: 'https://x.test/b' }, { href: 'https://x.test/c' },
      ]))
      .mockResolvedValueOnce(okPage('https://x.test/a'))
      .mockResolvedValueOnce(okPage('https://x.test/b'));
    const r = await aggressiveCrawl('https://x.test', { depth: 1, maxPages: 3 });
    expect(r.pages.length).toBe(3);
  });

  it('records broken-link pages with ok:false but does not abort the run', async () => {
    crawl
      .mockResolvedValueOnce(okPage('https://x.test', [{ href: 'https://x.test/broken' }, { href: 'https://x.test/ok' }]))
      .mockResolvedValueOnce({ ok: false, reason: 'HTTP 404' })
      .mockResolvedValueOnce(okPage('https://x.test/ok'));
    const r = await aggressiveCrawl('https://x.test', { depth: 1, maxPages: 5 });
    expect(r.ok).toBe(true);
    const brokenEntries = r.pages.filter((p) => !p.ok);
    expect(brokenEntries.length).toBe(1);
    expect(brokenEntries[0].url).toBe('https://x.test/broken');
  });
});

describe('adaptUrl', () => {
  it('returns ok:false + empty normalized when URL is empty', async () => {
    const r = await adaptUrl('   ');
    expect(r.ok).toBe(false);
    expect(r.normalized.productConcept).toBe('');
  });

  it('normalizes via Claude when crawl succeeds', async () => {
    crawl.mockResolvedValueOnce(okPage('https://x.test'));
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
    crawl.mockResolvedValueOnce(okPage('https://x.test'));
    callClaude.mockRejectedValueOnce(new Error('no api key'));
    const r = await adaptUrl('https://x.test', { depth: 0, maxPages: 1 });
    expect(r.ok).toBe(true);
    expect(r.normalized.observedSurfaces).toBe('crawl');
    // Heuristic uses meta description as concept.
    expect(r.normalized.productConcept).toMatch(/meta desc/);
  });

  it('returns ok:false on unreachable root with empty evidence', async () => {
    crawl.mockResolvedValueOnce({ ok: false, reason: 'timeout' });
    const r = await adaptUrl('https://x.test');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('timeout');
    expect(r.normalized.observedSurfaces).toBe('crawl');
  });
});
