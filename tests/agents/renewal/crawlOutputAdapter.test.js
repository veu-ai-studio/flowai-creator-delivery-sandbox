// tests/agents/renewal/crawlOutputAdapter.test.js

import { describe, it, expect, vi } from 'vitest';
import {
  conductStructuredCrawl,
  __internals,
} from '../../../src/lib/agents/renewal/crawlOutputAdapter.js';

const URL_OK = 'https://example.com';

function makeReport(overrides = {}) {
  return {
    ok: true, startUrl: URL_OK, origin: URL_OK,
    depth: 3, pageCap: 50, pagesCrawled: 2,
    pages: [
      {
        url: 'https://example.com/', normalisedUrl: 'https://example.com/',
        depth: 0, parent: null, title: 'Home',
        metaDescription: 'meta', bodyText: 'Welcome to the home page about our product.',
        headings: ['Welcome', 'Pricing'],
        surfaces: { links: ['/about', '/pricing'], buttons: ['Sign Up'], forms: [], images: [] },
        accessibility: {}, timing: { totalMs: 412 },
        consoleErrors: [], networkErrors: [],
        method: 'browserless', jsRendered: true, ok: true, warnings: [],
      },
      {
        url: 'https://example.com/about', normalisedUrl: 'https://example.com/about',
        depth: 1, parent: 'https://example.com/',
        title: 'About', metaDescription: '',
        bodyText: 'Talk to support via our live chat or message us anytime.',
        headings: ['About'],
        surfaces: {
          links: [], buttons: ['Submit'],
          forms: [{ fields: [{ name: 'email' }, { name: 'message' }], buttons: [{ label: 'Send' }] }],
          images: [],
        },
        accessibility: {}, timing: { totalMs: 220 },
        consoleErrors: [{ text: 'TypeError: x is undefined' }],
        networkErrors: [{ url: 'https://example.com/dead.png', status: 404 }],
        method: 'browserless', jsRendered: true, ok: true, warnings: [],
      },
    ],
    errors: [], warnings: [], durationMs: 1234, authGatedCount: 0, fallbackUsed: false,
    ...overrides,
  };
}

describe('conductStructuredCrawl — args validation', () => {
  it('returns shaped empty envelope when args missing', async () => {
    const r = await conductStructuredCrawl();
    expect(r.pagesCrawled).toBe(0);
    expect(r.pages).toEqual([]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('returns shaped empty envelope when url missing', async () => {
    const r = await conductStructuredCrawl({ url: '' });
    expect(r.pagesCrawled).toBe(0);
    expect(r.errors).toContain('conductStructuredCrawl: url required');
  });
});

describe('conductStructuredCrawl — happy path', () => {
  it('transforms a multi-page report into the canonical structured shape', async () => {
    const fn = vi.fn(async () => makeReport());
    const r = await conductStructuredCrawl({
      url: URL_OK, maxPages: 50, depth: 5, productId: 'demo', runId: 'r1',
      conductCrawlFn: fn,
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(r.pagesCrawled).toBe(2);
    expect(r.depth).toBe(3);
    expect(r.pages.length).toBe(2);
    expect(r.totalTextLength).toBeGreaterThan(0);
    expect(r.errors.length).toBeGreaterThan(0); // console + network errors surfaced
  });

  it('maps each page to canonical {url, title, headings, text, links, forms, hasModal, hasChatbot, hasAIAgent, statusCode, loadTimeMs}', async () => {
    const fn = vi.fn(async () => makeReport());
    const r = await conductStructuredCrawl({ url: URL_OK, conductCrawlFn: fn });
    const home = r.pages.find((p) => p.url.endsWith('/'));
    expect(home).toBeDefined();
    expect(home.title).toBe('Home');
    expect(home.headings).toEqual(['Welcome', 'Pricing']);
    expect(home.text).toMatch(/Welcome to the home page/);
    expect(home.links).toBe(2);
    expect(home.forms).toBe(0);
    expect(home.hasModal).toBe(false);
    expect(home.hasChatbot).toBe(false);
    expect(home.hasAIAgent).toBe(false);
    expect(home.statusCode).toBe(200);
    expect(home.loadTimeMs).toBe(412);
  });

  it('detects chatbot signal from body text', async () => {
    const fn = vi.fn(async () => makeReport());
    const r = await conductStructuredCrawl({ url: URL_OK, conductCrawlFn: fn });
    const about = r.pages.find((p) => p.url.endsWith('/about'));
    expect(about.hasChatbot).toBe(true);  // 'live chat' / 'message us' in bodyText
  });

  it('extracts forms with field names and button labels', async () => {
    const fn = vi.fn(async () => makeReport());
    const r = await conductStructuredCrawl({ url: URL_OK, conductCrawlFn: fn });
    expect(r.forms.length).toBe(1);
    expect(r.forms[0].pageUrl).toBe('https://example.com/about');
    expect(r.forms[0].fields).toEqual(['email', 'message']);
    expect(r.forms[0].buttons).toEqual(['Send']);
  });

  it('aggregates interactive elements across pages (buttons + detected surfaces)', async () => {
    const fn = vi.fn(async () => makeReport());
    const r = await conductStructuredCrawl({ url: URL_OK, conductCrawlFn: fn });
    expect(r.interactiveElements).toContain('Sign Up');
    expect(r.interactiveElements).toContain('Submit');
    expect(r.interactiveElements).toContain('ChatBot'); // about page triggers the chatbot marker
  });

  it('extracts broken-link list from networkErrors + !page.ok', async () => {
    const fn = vi.fn(async () => makeReport({
      pages: [...makeReport().pages, {
        url: 'https://example.com/broken', ok: false, bodyText: '',
        surfaces: { links: [], buttons: [], forms: [], images: [] },
        headings: [], consoleErrors: [], networkErrors: [],
      }],
      pagesCrawled: 3,
    }));
    const r = await conductStructuredCrawl({ url: URL_OK, conductCrawlFn: fn });
    expect(r.brokenLinks).toContain('https://example.com/broken');
    expect(r.brokenLinks).toContain('https://example.com/dead.png');
  });

  it('aggregates totalTextLength across all pages', async () => {
    const fn = vi.fn(async () => makeReport());
    const r = await conductStructuredCrawl({ url: URL_OK, conductCrawlFn: fn });
    const expected = 'Welcome to the home page about our product.'.length
      + 'Talk to support via our live chat or message us anytime.'.length;
    expect(r.totalTextLength).toBe(expected);
  });
});

describe('conductStructuredCrawl — graceful degradation', () => {
  it('returns shaped envelope when crawl fn throws', async () => {
    const fn = vi.fn(async () => { throw new Error('crawl crashed'); });
    const r = await conductStructuredCrawl({ url: URL_OK, conductCrawlFn: fn });
    expect(r.pagesCrawled).toBe(0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]).toMatch(/crawl crashed/);
  });

  it('returns shaped envelope when report.ok=false', async () => {
    const fn = vi.fn(async () => ({
      ok: false, pages: [], errors: [{ phase: 'fetch', url: URL_OK, reason: 'timeout' }],
      pagesCrawled: 0, depth: 0,
    }));
    const r = await conductStructuredCrawl({ url: URL_OK, conductCrawlFn: fn });
    expect(r.pagesCrawled).toBe(0);
    expect(r.errors.some((e) => /timeout/.test(e))).toBe(true);
  });

  it('returns shaped envelope when report is non-object', async () => {
    const fn = vi.fn(async () => null);
    const r = await conductStructuredCrawl({ url: URL_OK, conductCrawlFn: fn });
    expect(r.pagesCrawled).toBe(0);
    expect(r.errors).toContain('crawl returned non-object');
  });
});

describe('crawlOutputAdapter — heuristic detectors', () => {
  it('detectChatbot fires on intercom script src', () => {
    const page = { bodyText: '', surfaces: { links: ['https://widget.intercom.io/widget/x'] } };
    expect(__internals.detectChatbot(page)).toBe(true);
  });
  it('detectModal fires on the word "modal" in body', () => {
    expect(__internals.detectModal({ bodyText: 'open the modal to continue' })).toBe(true);
    expect(__internals.detectModal({ bodyText: 'plain text' })).toBe(false);
  });
  it('detectAIAgent fires on "powered by Anthropic" / "AI assistant" phrasing', () => {
    expect(__internals.detectAIAgent({ bodyText: 'Our AI assistant is ready' })).toBe(true);
    expect(__internals.detectAIAgent({ bodyText: 'Powered by Anthropic' })).toBe(true);
    expect(__internals.detectAIAgent({ bodyText: 'plain text' })).toBe(false);
  });
  it('extractStatusCode infers 200 on ok=true, 0 on ok=false with no signal', () => {
    expect(__internals.extractStatusCode({ ok: true })).toBe(200);
    expect(__internals.extractStatusCode({ ok: false })).toBe(0);
    expect(__internals.extractStatusCode({ statusCode: 503 })).toBe(503);
    expect(__internals.extractStatusCode({ ok: false, warnings: ['status 404 received'] })).toBe(404);
  });
  it('extractLoadTimeMs reads timing.totalMs / timing.loadMs', () => {
    expect(__internals.extractLoadTimeMs({ timing: { totalMs: 123 } })).toBe(123);
    expect(__internals.extractLoadTimeMs({ timing: { loadMs: 50 } })).toBe(50);
    expect(__internals.extractLoadTimeMs({})).toBe(0);
  });
});
