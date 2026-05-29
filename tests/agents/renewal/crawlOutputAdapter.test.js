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

describe('crawlOutputAdapter — heuristic detectors (core)', () => {
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

// ─────────────────────────────────────────────────────────────────────
// DISPATCH 8 — Expanded chatbot / AI-agent / modal vendor coverage
// ─────────────────────────────────────────────────────────────────────

describe('crawlOutputAdapter — expanded chatbot vendor coverage', () => {
  // Each row tests one chatbot vendor pattern. Mix of script-src cases
  // (vendor name in URL) and body-phrase cases (vendor-agnostic).
  it.each([
    // Core (regression — must keep firing)
    { name: 'intercom (script)',  page: { bodyText: '', surfaces: { links: ['https://widget.intercom.io/widget/x'] } } },
    { name: 'zendesk (script)',   page: { bodyText: '', surfaces: { links: ['https://static.zendesk.com/embeddable/'] } } },
    { name: 'drift (script)',     page: { bodyText: '', surfaces: { links: ['https://js.driftt.com/include/drift.js'] } } },
    { name: 'tawk.to (script)',   page: { bodyText: '', surfaces: { links: ['https://embed.tawk.to/abc/123'] } } },
    { name: 'crisp.chat (script)', page: { bodyText: '', surfaces: { links: ['https://client.crisp.chat/l.js'] } } },
    { name: 'olark (script)',     page: { bodyText: '', surfaces: { links: ['https://static.olark.com/jsclient/loader.js'] } } },
    { name: 'tidio (script)',     page: { bodyText: '', surfaces: { links: ['https://code.tidio.co/abc.js'] } } },
    { name: 'core: live chat phrase', page: { bodyText: 'Need help? Try our live chat now.' } },
    // Expanded (DISPATCH 8)
    { name: 'freshchat (script)', page: { bodyText: '', surfaces: { links: ['https://wchat.freshchat.com/widget.js'] } } },
    { name: 'helpscout-beacon (script)', page: { bodyText: '', surfaces: { links: ['https://beacon-v2.helpscout.net/'] } } },
    { name: 'liveperson (script)', page: { bodyText: '', surfaces: { links: ['https://liveperson.com/widget.js'] } } },
    { name: 'kustomer (script)',  page: { bodyText: '', surfaces: { links: ['https://cdn.kustomerapp.com/chat-web/chat.js'] } } },
    { name: 'smartsupp (script)', page: { bodyText: '', surfaces: { links: ['https://www.smartsupp.com/widget/loader.js'] } } },
    { name: 'jivochat (script)',  page: { bodyText: '', surfaces: { links: ['https://code.jivosite.com/widget.js'] } } },
    { name: 'botpress (script)',  page: { bodyText: '', surfaces: { links: ['https://cdn.botpress.cloud/webchat/v0/inject.js'] } } },
    { name: 'ada.cx (script)',    page: { bodyText: '', surfaces: { links: ['https://static.ada.support/embed.js'] } } },
    { name: 'verloop (script)',   page: { bodyText: '', surfaces: { links: ['https://www.verloop.io/widget/'] } } },
    { name: 'yellow.ai (script)', page: { bodyText: '', surfaces: { links: ['https://cloud.yellowmessenger.com/widget.js'] } } },
    { name: 'dialogflow (script)', page: { bodyText: '', surfaces: { links: ['https://www.gstatic.com/dialogflow-console/fast/messenger/'] } } },
    { name: 'manychat (script)',  page: { bodyText: '', surfaces: { links: ['https://cdn.manychat.com/widget.js'] } } },
    { name: 'ext: virtual assistant phrase', page: { bodyText: 'Our virtual assistant can help you 24/7' } },
    { name: 'ext: automated chat phrase', page: { bodyText: 'This is our automated chat experience' } },
    { name: 'ext: chat with an expert phrase', page: { bodyText: 'Click here to chat with an expert anytime' } },
    { name: 'ext: how can we help phrase', page: { bodyText: 'How can we help? Click below.' } },
  ])('detectChatbot fires on $name', ({ page }) => {
    expect(__internals.detectChatbot(page)).toBe(true);
  });

  it('detectChatbot stays false on plain marketing text (false-positive guard)', () => {
    // Mixed text that should NOT trip any pattern. Includes words that
    // are close to chatbot vendors but in plain prose context.
    const plain = 'Welcome to our product page. We help small businesses grow with affordable pricing. Read our documentation for details.';
    expect(__internals.detectChatbot({ bodyText: plain, surfaces: { links: ['https://docs.example.com/intro'] } })).toBe(false);
  });
});

describe('crawlOutputAdapter — expanded AI-agent coverage', () => {
  it.each([
    // Core (regression)
    { name: 'core: AI assistant', body: 'Our AI assistant is ready to help' },
    { name: 'core: Powered by Anthropic', body: 'Powered by Anthropic' },
    { name: 'core: ask anything', body: 'Ask anything and our AI will respond' },
    // Expanded (DISPATCH 8)
    { name: 'ext: AI-powered support', body: 'AI-powered support for every customer' },
    { name: 'ext: AI-powered answers', body: 'Get AI-powered answers instantly' },
    { name: 'ext: AI-powered chat', body: 'Use our AI-powered chat to get started' },
    { name: 'ext: talk to an AI', body: 'Talk to an AI now for product help' },
    { name: 'ext: talk to a bot', body: 'You can talk to a bot anytime' },
    { name: 'ext: chat with Claude', body: 'Chat with Claude on this surface' },
    { name: 'ext: chat with Copilot', body: 'Chat with Copilot for code help' },
    { name: 'ext: ChatGPT mention', body: 'Powered by ChatGPT under the hood' },
    { name: 'ext: claude.ai link', body: 'Visit claude.ai to learn more' },
    { name: 'ext: perplexity', body: 'Try perplexity for instant research' },
    { name: 'ext: voiceflow', body: 'Built with Voiceflow' },
    { name: 'ext: conversational AI', body: 'Conversational AI experience for every visitor' },
    { name: 'ext: generative AI assistant', body: 'Our generative AI assistant is online' },
  ])('detectAIAgent fires on $name', ({ body }) => {
    expect(__internals.detectAIAgent({ bodyText: body })).toBe(true);
  });

  it('detectAIAgent stays false on plain marketing text (false-positive guard)', () => {
    const plain = 'Welcome to our SaaS platform. Sign up for a free trial. We help you scale your business.';
    expect(__internals.detectAIAgent({ bodyText: plain })).toBe(false);
  });

  it('detectAIAgent stays false on AI-adjacent terms that are not AI-agent surfaces', () => {
    // "AI" appears but in non-agent contexts (e.g., a name like "Sai" or
    // "AI startup" used descriptively, not as a surface to talk to).
    const cases = [
      'A leading AI startup raised $50M',
      'Browsers like Chrome and Safari',
      'Powered by sustainable energy',
    ];
    for (const body of cases) {
      expect(__internals.detectAIAgent({ bodyText: body }), `body=${body}`).toBe(false);
    }
  });
});

describe('crawlOutputAdapter — expanded modal coverage', () => {
  it.each([
    { name: 'core: word modal', body: 'open the modal to continue' },
    { name: 'core: word lightbox', body: 'open in lightbox' },
    { name: 'ext: role="dialog" attribute', body: '<div role="dialog">...</div>' },
    { name: 'ext: aria-modal attribute', body: '<div aria-modal="true">' },
    { name: 'ext: data-modal attribute', body: '<button data-modal="signup-form">' },
    { name: 'ext: class with "modal" substring', body: '<div class="signup-modal-container">' },
    { name: 'ext: open in modal phrase', body: 'Click to open in modal' },
  ])('detectModal fires on $name', ({ body }) => {
    expect(__internals.detectModal({ bodyText: body })).toBe(true);
  });

  it('detectModal stays false on plain content (false-positive guard)', () => {
    // Avoid the modal/dialog/popup/overlay/lightbox CORE keywords AND
    // the role=dialog / aria-modal / data-modal EXT attributes.
    expect(__internals.detectModal({ bodyText: 'plain marketing text describing our product features' })).toBe(false);
  });
});

describe('crawlOutputAdapter — detector regression guard', () => {
  // Verify the aggregate CHATBOT_BODY_RE / etc. constants still expose
  // a usable interface for any legacy consumer that imports them
  // directly via __internals.
  it('aggregate constants test as OR-of-core-plus-ext', () => {
    expect(__internals.CHATBOT_BODY_RE.test('live chat with us')).toBe(true);
    expect(__internals.CHATBOT_BODY_RE.test('virtual assistant ready')).toBe(true);
    expect(__internals.CHATBOT_SCRIPT_RE.test('https://widget.intercom.io/x')).toBe(true);
    expect(__internals.CHATBOT_SCRIPT_RE.test('https://www.smartsupp.com/widget.js')).toBe(true);
    expect(__internals.AI_AGENT_BODY_RE.test('AI assistant')).toBe(true);
    expect(__internals.AI_AGENT_BODY_RE.test('AI-powered support')).toBe(true);
    expect(__internals.MODAL_BODY_RE.test('modal')).toBe(true);
    expect(__internals.MODAL_BODY_RE.test('aria-modal="true"')).toBe(true);
  });

  it('CORE patterns are unchanged (regression guard)', () => {
    // Spot-check that the CORE constants haven't been silently widened.
    // Pattern presence/absence is the invariant; exact regex source is
    // not asserted to allow non-semantic edits.
    expect(__internals.CHATBOT_BODY_RE_CORE.test('live chat with us')).toBe(true);
    expect(__internals.CHATBOT_BODY_RE_CORE.test('virtual assistant')).toBe(false);  // moved to EXT
    expect(__internals.AI_AGENT_BODY_RE_CORE.test('AI assistant')).toBe(true);
    expect(__internals.AI_AGENT_BODY_RE_CORE.test('AI-powered support')).toBe(false); // moved to EXT
    expect(__internals.MODAL_BODY_RE_CORE.test('modal')).toBe(true);
    // NB: `aria-modal` is a hyphenated token containing the whole word
    // "modal" — `\bmodal\b` (CORE) matches because `-` is a non-word
    // character, so the CORE pattern catches this case too. The EXT
    // pattern's value is matching attribute-shape strings that don't
    // contain the bare word "modal" elsewhere (e.g. data-modal=,
    // role="dialog", "open in modal" phrases).
    expect(__internals.MODAL_BODY_RE_CORE.test('aria-modal="true"')).toBe(true);
    expect(__internals.MODAL_BODY_RE_CORE.test('role="dialog"')).toBe(true);          // dialog is CORE
    expect(__internals.MODAL_BODY_RE_CORE.test('data-overlay="signup"')).toBe(true);  // overlay is CORE
  });
});
