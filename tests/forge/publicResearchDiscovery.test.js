import { describe, expect, it, vi } from 'vitest';

import { discoverPublicResearchSources } from '../../src/lib/forge/researchRecoveryAdapters.js';

const longText = (label) => `${label} FlowAI orchestration evidence `.repeat(12);
const response = (body, { status = 200, contentType = 'text/html' } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : null },
  text: async () => body,
});

describe('credential-free public Research discovery', () => {
  it('decodes credential-free DuckDuckGo result redirects without inventing URLs', async () => {
    const html = `<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fdocs.example.org%2Fagents&amp;rut=opaque">Agent docs</a>`;
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes('duckduckgo.com')) return response(html);
      return response(longText('FlowAI orchestration'));
    });
    const result = await discoverPublicResearchSources({
      url: 'https://flowai.example', topic: 'FlowAI orchestration', fetchImpl, minimumSources: 1,
    });
    expect(result.pages[0]).toMatchObject({ url: 'https://docs.example.org/agents', title: 'Agent docs' });
  });

  it('ranks and retains three relevant independently attributed domains', async () => {
    const feed = `<?xml version="1.0"?><rss><channel>
      <item><title>FlowAI docs</title><link>https://docs-source.example/flowai</link><description>FlowAI orchestration documentation</description></item>
      <item><title>FlowAI review</title><link>https://review-source.example/flowai</link><description>FlowAI product review</description></item>
      <item><title>FlowAI comparison</title><link>https://compare-source.example/flowai</link><description>FlowAI orchestration comparison</description></item>
    </channel></rss>`;
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes('duckduckgo.com')) return response(feed, { contentType: 'application/rss+xml' });
      return response(`<html><body>${longText(new URL(url).hostname)}</body></html>`);
    });

    const result = await discoverPublicResearchSources({
      url: 'https://flowai.example',
      topic: 'FlowAI orchestration',
      fetchImpl,
    });

    expect(result).toMatchObject({ ok: true, sourceCount: 3, exhaustionKind: null });
    expect(new Set(result.pages.map((page) => new URL(page.url).hostname)).size).toBe(3);
    expect(result.pages.every((page) => page.sourceType === 'credential_free_public_discovery')).toBe(true);
    expect(result.attempts.filter((attempt) => attempt.state === 'accepted')).toHaveLength(3);
  });

  it('rejects duplicate domains, duplicate content, irrelevant and short sources without fabrication', async () => {
    const duplicate = longText('same');
    const feed = `<?xml version="1.0"?><rss><channel>
      <item><title>FlowAI A</title><link>https://one.example/a</link><description>FlowAI</description></item>
      <item><title>FlowAI B</title><link>https://one.example/b</link><description>FlowAI</description></item>
      <item><title>FlowAI C</title><link>https://two.example/c</link><description>FlowAI</description></item>
      <item><title>FlowAI D</title><link>https://three.example/d</link><description>FlowAI</description></item>
      <item><title>Unrelated</title><link>https://four.example/e</link><description>unrelated</description></item>
    </channel></rss>`;
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes('duckduckgo.com')) return response(feed, { contentType: 'application/rss+xml' });
      if (String(url).includes('one.example/a') || String(url).includes('two.example')) return response(duplicate);
      if (String(url).includes('three.example')) return response('too short');
      return response('unrelated material with no matching product terminology '.repeat(12));
    });

    const result = await discoverPublicResearchSources({
      url: 'https://flowai.example',
      topic: 'FlowAI orchestration',
      fetchImpl,
    });

    expect(result).toMatchObject({ ok: false, sourceCount: 1, exhaustionKind: 'internet_source_exhausted' });
    expect(result.attempts).toEqual(expect.arrayContaining([
      expect.objectContaining({ reason: 'duplicate_domain' }),
      expect.objectContaining({ reason: 'duplicate_content' }),
      expect.objectContaining({ reason: 'insufficient_public_text' }),
      expect.objectContaining({ reason: 'topic_irrelevant' }),
    ]));
  });
});
