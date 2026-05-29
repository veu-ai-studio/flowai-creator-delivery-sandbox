import { describe, expect, it } from 'vitest';
import { crawlSite, __internals } from '../../src/lib/crawl/multiPageCrawler.js';

const renderedHtml = `
  <html>
    <head>
      <title>Rendered Product</title>
      <style>
        body { font-family: Inter, Arial, sans-serif; color: #111827; background: #f8fafc; }
        .hero { background: #2563eb; }
      </style>
    </head>
    <body>
      <div id="root">
        <nav><a href="/pricing">Pricing</a></nav>
        <main>
          <section class="hero"><h1>Rendered React shell</h1><button>Start</button></section>
        </main>
      </div>
    </body>
  </html>
`;

describe('multiPageCrawler rendered content handoff', () => {
  it('stores bounded rendered html and bodyText on page records', async () => {
    const report = await crawlSite('https://example.com', {
      maxPages: 1,
      maxDepth: 0,
      respectRobotsTxt: false,
      maxStoredHtmlBytes: 160,
      maxStoredBodyTextBytes: 32,
      crawlImpl: async () => ({
        ok: true,
        method: 'browserless',
        status: 200,
        title: 'Rendered Product',
        html: renderedHtml,
        bodyText: 'Rendered React shell with buttons and navigation',
      }),
    });

    expect(report.pages).toHaveLength(1);
    expect(report.pages[0]).toMatchObject({
      method: 'browserless',
      title: 'Rendered Product',
      contentTruncated: {
        html: true,
        bodyText: true,
        maxStoredHtmlBytes: 160,
        maxStoredBodyTextBytes: 32,
      },
    });
    expect(report.pages[0].html).toContain('<html>');
    expect(Buffer.byteLength(report.pages[0].html, 'utf8')).toBeLessThanOrEqual(160);
    expect(report.pages[0].bodyText).toBe('Rendered React shell with button');
  });

  it('does not split multi-byte characters when bounding stored content', () => {
    const bounded = __internals.boundedText('alpha 😀 beta', 10);

    expect(Buffer.byteLength(bounded, 'utf8')).toBeLessThanOrEqual(10);
    expect(() => Buffer.from(bounded, 'utf8').toString('utf8')).not.toThrow();
  });
});
