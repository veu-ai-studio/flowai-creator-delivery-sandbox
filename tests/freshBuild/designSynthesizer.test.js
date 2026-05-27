import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { synthesizeDesign, validateDesignSpec } from '../../src/lib/freshBuild/designSynthesizer.js';
import { isFreshBuildEnabled } from '../../src/lib/freshBuild/constants.js';
import { UNKNOWN } from '../../src/lib/freshBuild/types/featureInventory.js';

const repoFile = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

function mockCrawlReport(overrides = {}) {
  return {
    ok: true,
    rootUrl: 'https://example.com',
    origin: 'https://example.com',
    pagesActuallyCrawled: 1,
    pagesDiscovered: 1,
    maxPages: 2,
    maxDepth: 1,
    reasonStopped: 'frontier_drained',
    pages: [
      {
        url: 'https://example.com',
        depth: 0,
        status: 'fetched',
        httpStatus: 200,
        title: 'Example Product',
        html: `
          <html>
            <head>
              <style>
                :root { --brand: #1d4ed8; --accent: #f97316; }
                body { font-family: Inter, Arial, sans-serif; color: #111827; background: #f8fafc; }
                h1 { font-size: 48px; font-weight: 800; line-height: 1.1; }
                .shell { display: grid; max-width: 1120px; padding: 24px; }
                .button { background: #1d4ed8; border: 1px solid #1e40af; border-radius: 8px; }
                .button:hover { background: #2563eb; }
                @media (max-width: 768px) { .shell { display: block; } }
              </style>
            </head>
            <body class="bg-slate-50 text-slate-900">
              <nav class="flex gap-4"><a href="/pricing">Pricing</a></nav>
              <main class="shell grid grid-cols-2">
                <section class="hero rounded-xl">
                  <h1>Build better workflows</h1>
                  <button class="button hover:bg-blue-600">Start now</button>
                </section>
                <form><input name="email" required><span class="error">Email required</span></form>
                <div class="toast">Saved</div>
                <svg data-lucide="zap"></svg>
              </main>
            </body>
          </html>
        `,
        contentLength: 1500,
        findings: [],
      },
    ],
    findings: [],
    startedAt: '2026-05-26T00:00:00.000Z',
    finishedAt: '2026-05-26T00:00:01.000Z',
    durationMs: 1000,
    ...overrides,
  };
}

function mockFeatureInventory() {
  return {
    url: 'https://example.com',
    pages: [{
      url: 'https://example.com',
      title: 'Example Product',
      purpose: 'home',
      primaryContent: 'Build better workflows',
      navigation: [],
      hierarchy: { parent: UNKNOWN, children: [], confidence: 0 },
      access: 'PUBLIC',
      confidence: 0.8,
    }],
    components: [
      {
        id: 'nav-1',
        type: 'nav',
        content: 'Pricing',
        purpose: 'navigation',
        pages: ['https://example.com'],
        interactive: true,
        confidence: 0.8,
      },
      {
        id: 'button-1',
        type: 'button',
        content: 'Start now',
        purpose: 'call to action',
        pages: ['https://example.com'],
        interactive: true,
        confidence: 0.8,
      },
    ],
    userFlows: [],
    content: {
      textByPage: {},
      imageReferences: [],
      ctas: [],
      toneAndStyle: { summary: UNKNOWN, confidence: 0 },
      confidence: 0.6,
    },
    businessRules: {
      accessControl: { summary: UNKNOWN, confidence: 0 },
      pricing: { summary: UNKNOWN, confidence: 0 },
      validationRules: [],
      apiEndpoints: [],
      dataEntities: [],
      confidence: 0,
    },
    metadata: {
      url: 'https://example.com',
      totalPagesDiscovered: 1,
      totalComponentsIdentified: 2,
      totalUserFlowsMapped: 0,
      crawlTimestamp: '2026-05-26T00:00:00.000Z',
      version: '0.1.0',
      confidence: 0.7,
    },
  };
}

describe('freshBuild Design Synthesizer', () => {
  it('keeps Fresh Build disabled by default', () => {
    expect(isFreshBuildEnabled({})).toBe(false);
  });

  it('extracts DesignSpec values with mocked crawler and Browserless dependencies', async () => {
    const crawlSiteImpl = vi.fn(async () => mockCrawlReport());
    const close = vi.fn(async () => {});
    const browserlessConnector = vi.fn(async () => ({ close }));

    const spec = await synthesizeDesign('https://example.com', {
      now: '2026-05-26T00:00:00.000Z',
      crawlSiteImpl,
      connectBrowserless: true,
      browserlessConnector,
      featureInventory: mockFeatureInventory(),
      maxPages: 2,
      maxDepth: 1,
    });

    expect(crawlSiteImpl).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
      maxPages: 2,
      maxDepth: 1,
    }));
    expect(browserlessConnector).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(validateDesignSpec(spec)).toEqual({ ok: true, errors: [] });
    expect(spec.visualSystem.primaryColors).toEqual(expect.arrayContaining([
      expect.objectContaining({ hex: '#1d4ed8' }),
    ]));
    expect(spec.visualSystem.backgroundColors).toEqual(expect.arrayContaining([
      expect.objectContaining({ hex: '#f8fafc', usageContext: 'background' }),
    ]));
    expect(spec.typography.fontFamilies).toEqual(expect.arrayContaining([
      expect.objectContaining({ family: expect.stringContaining('Inter') }),
    ]));
    expect(spec.typography.fontSizes).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: '48px' }),
    ]));
    expect(spec.layout).toMatchObject({
      pattern: 'dashboard_or_sidebar',
      maxContentWidth: { value: '1120px', confidence: 0.75 },
      responsiveBehavior: 'media queries observed',
    });
    expect(spec.components).toEqual(expect.arrayContaining([
      expect.objectContaining({
        componentId: 'button-1',
        type: 'button',
        interactiveStates: expect.objectContaining({ hover: 'hover state observed' }),
      }),
    ]));
    expect(spec.uxPatterns).toMatchObject({
      errorStates: ['error or validation state observed'],
      feedbackPatterns: ['toast/modal/alert feedback observed'],
      formValidationStyle: 'inline validation signals observed',
    });
    expect(spec.technologySignals.cssFramework).toMatchObject({ name: 'Tailwind CSS signal' });
    expect(spec.technologySignals.iconLibrary).toMatchObject({ name: 'Icon library signal' });
    expect(spec.metadata.browserless).toMatchObject({ status: 'connected' });
  });

  it('derives a FeatureInventory from the same mocked crawl when one is not supplied', async () => {
    const spec = await synthesizeDesign('https://example.com', {
      crawlSiteImpl: async () => mockCrawlReport(),
    });

    expect(validateDesignSpec(spec).ok).toBe(true);
    expect(spec.components.length).toBeGreaterThan(0);
    expect(spec.metadata.crawl).toMatchObject({
      ok: true,
      pagesActuallyCrawled: 1,
      reasonStopped: 'frontier_drained',
    });
  });

  it('extracts color and font values from rendered DOM carried by the crawler', async () => {
    const spec = await synthesizeDesign('https://example.com', {
      crawlSiteImpl: async () => mockCrawlReport({
        pages: [{
          url: 'https://example.com',
          depth: 0,
          status: 'fetched',
          method: 'browserless',
          httpStatus: 200,
          title: 'Rendered App',
          html: `
            <html>
              <head>
                <style>
                  body { font-family: Inter, Arial, sans-serif; background: #f8fafc; color: #111827; }
                  .cta { background: #2563eb; font-size: 18px; font-weight: 700; }
                </style>
              </head>
              <body><main><section class="hero"><h1>Rendered app</h1><button class="cta">Start</button></section></main></body>
            </html>
          `,
          bodyText: 'Rendered app Start',
          contentLength: 800,
          findings: [],
        }],
      }),
    });

    expect(spec.visualSystem.primaryColors).toEqual(expect.arrayContaining([
      expect.objectContaining({ hex: '#f8fafc' }),
      expect.objectContaining({ hex: '#111827' }),
      expect.objectContaining({ hex: '#2563eb' }),
    ]));
    expect(spec.typography.fontFamilies).toEqual(expect.arrayContaining([
      expect.objectContaining({ family: expect.stringContaining('Inter') }),
    ]));
    expect(spec.typography.fontSizes).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: '18px' }),
    ]));
  });

  it('marks undetectable values UNKNOWN instead of inventing them', async () => {
    const spec = await synthesizeDesign('https://example.com', {
      crawlSiteImpl: async () => mockCrawlReport({
        pages: [{
          url: 'https://example.com',
          depth: 0,
          status: 'fetched',
          httpStatus: 200,
          title: null,
          html: '<main><p>No style data</p></main>',
          contentLength: 32,
          findings: [],
        }],
      }),
      featureInventory: mockFeatureInventory(),
    });

    expect(spec.visualSystem.primaryColors[0]).toMatchObject({ hex: UNKNOWN, usageContext: UNKNOWN });
    expect(spec.layout.maxContentWidth.value).toBe(UNKNOWN);
    expect(spec.technologySignals.componentLibrary.name).toBe(UNKNOWN);
  });

  it('fails validation when required DesignSpec fields are missing', async () => {
    const spec = await synthesizeDesign('https://example.com', {
      crawlSiteImpl: async () => mockCrawlReport(),
      featureInventory: mockFeatureInventory(),
    });
    delete spec.typography;

    expect(validateDesignSpec(spec)).toEqual({
      ok: false,
      errors: ['Missing required field: typography'],
    });
  });

  it('does not import platform SDKs or product-specific logic', () => {
    const files = [
      'src/lib/freshBuild/designSynthesizer.js',
    ].map(repoFile).join('\n');

    expect(files).not.toMatch(/@base44\/sdk|base44Client|saige|reltwin|reachsms|pressai|mypreglife/i);
    expect(files).not.toMatch(/new WebSocket|chromium\.launch/i);
    expect(files).toMatch(/multiPageCrawler|crawlSite/);
    expect(files).toMatch(/browserlessAdapter|connectBrowserless/);
  });
});
