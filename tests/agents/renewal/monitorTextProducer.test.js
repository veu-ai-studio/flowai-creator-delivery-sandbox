// tests/agents/renewal/monitorTextProducer.test.js
//
// Test surface for src/lib/agents/renewal/monitorTextProducer.js. All
// network calls are mocked. Verified-live test outcome (DISPATCH 22 FIX 2)
// is documented in the report; this suite covers the unit + error paths.

import { describe, it, expect, vi } from 'vitest';
import {
  produceMonitorText,
  fetchUrlContent,
  extractVisibleText,
  extractPageTitle,
  buildMonitorPrompt,
  __internals,
} from '../../../src/lib/agents/renewal/monitorTextProducer.js';
import { computeScore } from '../../../src/lib/agents/renewal/preScoreAdapter.js';

const API_KEY = 'sk-ant-TEST_KEY_xxxxxxxxxxxx';
const URL_OK = 'https://example.com';

const SAMPLE_HTML = `
<!DOCTYPE html>
<html><head><title>Demo Product</title></head><body>
  <h1>Welcome to Demo</h1>
  <p>This is the product description with multiple words to make the word count tests pass without trouble.</p>
  <p>Pricing details are here for evaluation.</p>
  <script>console.log("should be stripped")</script>
  <style>body{color:red}</style>
</body></html>
`;

const SAMPLE_MONITOR_RESPONSE = `
EXECUTIVE SUMMARY
Demo product looks healthy.

FIVE-LAYER SCORES:
[L1] Functionality Score: 7/10
[L2] Operational Score: 6/10
[L3] Financial Score: 5/10
[L4] Business Score: 8/10
[L5] GTM Score: 7/10

CRITICAL ISSUES
None.
`;

function mockFetchOk(html, options = {}) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: (h) => h.toLowerCase() === 'content-type' ? 'text/html' : null },
    text: async () => html,
    json: async () => ({}),
    ...options,
  }));
}

function mockAnthropicOk(text = SAMPLE_MONITOR_RESPONSE) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify({ content: [{ type: 'text', text }], model: 'claude-sonnet-4-6', usage: { input_tokens: 100, output_tokens: 50 } }),
    json: async () => ({ content: [{ type: 'text', text }], model: 'claude-sonnet-4-6', usage: { input_tokens: 100, output_tokens: 50 } }),
  }));
}

function sequencedFetch(fetchResponses, anthropicResponses) {
  let i = 0, j = 0;
  return vi.fn(async (url) => {
    if (typeof url === 'string' && url.includes('anthropic.com')) {
      const r = anthropicResponses[j++];
      return r;
    }
    const r = fetchResponses[i++];
    return r;
  });
}

// ── extractVisibleText unit tests ────────────────────────────────────────────

describe('extractVisibleText', () => {
  it('strips <script> blocks', () => {
    expect(extractVisibleText('<p>hi</p><script>alert(1)</script>')).not.toContain('alert');
  });
  it('strips <style> blocks', () => {
    expect(extractVisibleText('<p>hi</p><style>p{}</style>')).not.toContain('p{}');
  });
  it('strips HTML comments', () => {
    expect(extractVisibleText('<p>hi</p><!--secret-->')).not.toContain('secret');
  });
  it('decodes common entities', () => {
    expect(extractVisibleText('<p>a &amp; b</p>')).toContain('a & b');
    expect(extractVisibleText('<p>&quot;quoted&quot;</p>')).toContain('"quoted"');
  });
  it('preserves newlines on block boundaries', () => {
    const out = extractVisibleText('<p>line1</p><p>line2</p>');
    expect(out).toMatch(/line1\n\s*line2/);
  });
  it('collapses run of whitespace', () => {
    const out = extractVisibleText('<p>   too    many    spaces   </p>');
    expect(out).not.toMatch(/  /);
  });
  it('returns empty string on non-string input', () => {
    expect(extractVisibleText(null)).toBe('');
    expect(extractVisibleText(undefined)).toBe('');
  });
});

describe('extractPageTitle', () => {
  it('extracts <title>', () => {
    expect(extractPageTitle('<title>Hello</title>')).toBe('Hello');
  });
  it('trims whitespace', () => {
    expect(extractPageTitle('<title>  Hello  </title>')).toBe('Hello');
  });
  it('returns empty when absent', () => {
    expect(extractPageTitle('<html></html>')).toBe('');
  });
  it('caps at 200 chars', () => {
    const long = 'A'.repeat(300);
    expect(extractPageTitle(`<title>${long}</title>`).length).toBe(200);
  });
});

// ── fetchUrlContent ──────────────────────────────────────────────────────────

describe('fetchUrlContent', () => {
  it('returns { html, status, contentType } on 200', async () => {
    const r = await fetchUrlContent(URL_OK, { fetch: mockFetchOk(SAMPLE_HTML) });
    expect(r.html).toBe(SAMPLE_HTML);
    expect(r.status).toBe(200);
    expect(r.contentType).toBe('text/html');
  });

  it('throws MONITOR_FETCH_FAILED on non-2xx', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false, status: 500, statusText: 'Server Error',
      headers: { get: () => 'text/plain' }, text: async () => '', json: async () => ({}),
    }));
    try {
      await fetchUrlContent(URL_OK, { fetch: fetchMock });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('MONITOR_FETCH_FAILED');
      expect(e.status).toBe(500);
    }
  });

  it('throws MONITOR_FETCH_FAILED on network error', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('ECONNREFUSED'); });
    try {
      await fetchUrlContent(URL_OK, { fetch: fetchMock });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('MONITOR_FETCH_FAILED');
      expect(e.message).toMatch(/network error.*ECONNREFUSED/);
    }
  });
});

// ── buildMonitorPrompt ───────────────────────────────────────────────────────

describe('buildMonitorPrompt', () => {
  it('includes the URL, title, page content + the L1-L5 scoring block', () => {
    const prompt = buildMonitorPrompt({
      url: 'https://example.com', pageTitle: 'Demo',
      pageText: 'Page body text here',
    });
    expect(prompt).toContain('URL: https://example.com');
    expect(prompt).toContain('TITLE: Demo');
    expect(prompt).toContain('Page body text here');
    expect(prompt).toContain('[L1] Functionality Score: X/10');
    expect(prompt).toContain('[L2] Operational Score: X/10');
    expect(prompt).toContain('[L3] Financial Score: X/10');
    expect(prompt).toContain('[L4] Business Score: X/10');
    expect(prompt).toContain('[L5] GTM Score: X/10');
  });

  it('caps page text at MAX_PAGE_TEXT_CHARS', () => {
    // Use a marker char that doesn't appear in the prompt template itself.
    const marker = 'é'; // é — non-ASCII so won't collide with template chars
    const long = marker.repeat(__internals.MAX_PAGE_TEXT_CHARS + 5000);
    const prompt = buildMonitorPrompt({ url: 'x', pageTitle: 'y', pageText: long });
    const markerCount = (prompt.match(new RegExp(marker, 'g')) || []).length;
    expect(markerCount).toBeLessThanOrEqual(__internals.MAX_PAGE_TEXT_CHARS);
    // And the prompt must NOT contain the FULL long input.
    expect(markerCount).toBeLessThan(long.length);
  });

  it('uses "(no title)" placeholder when title is empty', () => {
    expect(buildMonitorPrompt({ url: 'x', pageTitle: '', pageText: 'text' }))
      .toContain('TITLE: (no title)');
  });
});

// ── produceMonitorText happy path ────────────────────────────────────────────

describe('produceMonitorText — happy path', () => {
  it('returns the canonical envelope shape', async () => {
    const fetchMock = sequencedFetch(
      [{ ok: true, status: 200, statusText: 'OK', headers: { get: () => 'text/html' }, text: async () => SAMPLE_HTML }],
      [{ ok: true, status: 200, headers: { get: () => 'application/json' },
        json: async () => ({ content: [{ type: 'text', text: SAMPLE_MONITOR_RESPONSE }], model: 'claude-sonnet-4-6', usage: { input_tokens: 100, output_tokens: 50 } }),
        text: async () => '{}' }],
    );
    const r = await produceMonitorText({
      url: URL_OK, productId: 'demo', runId: 'r1',
      opts: { fetch: fetchMock, apiKey: API_KEY },
    });
    expect(r.monitorText).toContain('[L1] Functionality Score: 7/10');
    expect(r.url).toBe(URL_OK);
    expect(r.pageTitle).toBe('Demo Product');
    expect(r.wordCount).toBeGreaterThan(5);
    expect(r.model).toBe('claude-sonnet-4-6');
    expect(r.usage).toBeDefined();
    expect(r.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('output passes through computeScore without `error`', async () => {
    const fetchMock = sequencedFetch(
      [{ ok: true, status: 200, statusText: 'OK', headers: { get: () => 'text/html' }, text: async () => SAMPLE_HTML }],
      [{ ok: true, status: 200, headers: { get: () => 'application/json' },
        json: async () => ({ content: [{ type: 'text', text: SAMPLE_MONITOR_RESPONSE }], model: 'claude-sonnet-4-6', usage: {} }),
        text: async () => '{}' }],
    );
    const monitor = await produceMonitorText({
      url: URL_OK, productId: 'demo', runId: 'r1',
      opts: { fetch: fetchMock, apiKey: API_KEY },
    });
    const score = await computeScore({
      productId: 'demo', url: URL_OK, runId: 'r1', monitorText: monitor.monitorText,
    });
    expect(score.error).toBeUndefined();
    expect(score.total).toBeGreaterThan(0);
    // Per preScoreAdapter scaling: each L scaled 0..10 → 0..20. Sum should be 2*(7+6+5+8+7) = 66.
    expect(score.total).toBe(2 * (7 + 6 + 5 + 8 + 7));
  });
});

// ── Error paths ──────────────────────────────────────────────────────────────

describe('produceMonitorText — error paths', () => {
  it('throws MONITOR_FETCH_FAILED when URL fetch fails', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false, status: 404, statusText: 'Not Found',
      headers: { get: () => null }, text: async () => '', json: async () => ({}),
    }));
    try {
      await produceMonitorText({
        url: URL_OK, productId: 'demo', runId: 'r1',
        opts: { fetch: fetchMock, apiKey: API_KEY },
      });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('MONITOR_FETCH_FAILED');
    }
  });

  it('throws MONITOR_FETCH_FAILED when extracted text is < 5 words (SPA shell)', async () => {
    const fetchMock = sequencedFetch(
      [{ ok: true, status: 200, statusText: 'OK', headers: { get: () => 'text/html' },
        text: async () => '<!DOCTYPE html><html><body><div id="root"></div></body></html>' }],
      [], // anthropic should NOT be called
    );
    try {
      await produceMonitorText({
        url: URL_OK, productId: 'demo', runId: 'r1',
        opts: { fetch: fetchMock, apiKey: API_KEY },
      });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('MONITOR_FETCH_FAILED');
      expect(e.message).toMatch(/JS-rendered SPA without SSR/);
      expect(e.wordCount).toBeLessThan(5);
    }
  });

  it('throws MONITOR_SCORE_FAILED when Anthropic returns non-2xx', async () => {
    const fetchMock = sequencedFetch(
      [{ ok: true, status: 200, statusText: 'OK', headers: { get: () => 'text/html' }, text: async () => SAMPLE_HTML }],
      [{ ok: false, status: 401, statusText: 'Unauthorized', text: async () => 'invalid x-api-key', json: async () => ({}) }],
    );
    try {
      await produceMonitorText({
        url: URL_OK, productId: 'demo', runId: 'r1',
        opts: { fetch: fetchMock, apiKey: API_KEY },
      });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('MONITOR_SCORE_FAILED');
      expect(e.status).toBe(401);
    }
  });

  it('throws when ANTHROPIC_API_KEY is missing', async () => {
    const fetchMock = mockFetchOk(SAMPLE_HTML);
    try {
      await produceMonitorText({
        url: URL_OK, productId: 'demo', runId: 'r1',
        opts: { fetch: fetchMock }, // no apiKey
      });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('MONITOR_SCORE_FAILED');
      expect(e.message).toMatch(/ANTHROPIC_API_KEY is required/);
    }
  });

  it('throws when args is missing required fields', async () => {
    await expect(produceMonitorText()).rejects.toThrow(/args object required/);
    await expect(produceMonitorText({ productId: 'demo', runId: 'r1' })).rejects.toThrow(/url must be a non-empty string/);
    await expect(produceMonitorText({ url: URL_OK, runId: 'r1' })).rejects.toThrow(/productId must be a non-empty string/);
    await expect(produceMonitorText({ url: URL_OK, productId: 'demo' })).rejects.toThrow(/runId must be a non-empty string/);
  });
});

// ── API-key never logged ─────────────────────────────────────────────────────

describe('produceMonitorText — API key never appears in output', () => {
  it('error messages do NOT contain the API key', async () => {
    const fetchMock = sequencedFetch(
      [{ ok: true, status: 200, statusText: 'OK', headers: { get: () => 'text/html' }, text: async () => SAMPLE_HTML }],
      [{ ok: false, status: 401, statusText: 'Unauthorized', text: async () => 'invalid x-api-key', json: async () => ({}) }],
    );
    try {
      await produceMonitorText({
        url: URL_OK, productId: 'demo', runId: 'r1',
        opts: { fetch: fetchMock, apiKey: API_KEY },
      });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.message).not.toContain(API_KEY);
    }
  });

  it('makeError strips apiKey from extra metadata', () => {
    const err = __internals.makeError('TEST', 'msg', {
      status: 401, apiKey: 'leaked', api_key: 'leaked', authorization: 'leaked', 'x-api-key': 'leaked', safe: 'ok',
    });
    expect(err.status).toBe(401);
    expect(err.safe).toBe('ok');
    expect(err.apiKey).toBeUndefined();
    expect(err.api_key).toBeUndefined();
    expect(err.authorization).toBeUndefined();
    expect(err['x-api-key']).toBeUndefined();
  });
});
