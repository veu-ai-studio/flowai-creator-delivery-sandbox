import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { isFreshBuildEnabled } from '../../src/lib/freshBuild/constants.js';
import { extractFeatures } from '../../src/lib/freshBuild/featureExtractor.js';
import {
  AUTH_REQUIRED,
  REQUIRED_FEATURE_INVENTORY_FIELDS,
  UNKNOWN,
  validateFeatureInventory,
} from '../../src/lib/freshBuild/types/featureInventory.js';

const repoFile = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

function mockCrawlReport(overrides = {}) {
  return {
    ok: true,
    rootUrl: 'https://example.com',
    origin: 'https://example.com',
    pagesActuallyCrawled: 2,
    pagesDiscovered: 2,
    maxPages: 3,
    maxDepth: 1,
    reasonStopped: 'frontier_drained',
    pages: [
      {
        url: 'https://example.com',
        depth: 0,
        status: 'fetched',
        method: 'mock',
        httpStatus: 200,
        title: 'Example Product',
        html: `
          <html>
            <body>
              <nav><a href="/pricing">Pricing</a><a href="/login">Sign in</a></nav>
              <section class="hero"><h1>Build better workflows</h1><a href="/signup">Start now</a></section>
              <form action="/api/leads">
                <input name="email" type="email" required>
                <button>Submit</button>
              </form>
              <img src="/hero.png" alt="Product dashboard">
              <script>fetch('/api/leads')</script>
              <footer>Copyright</footer>
            </body>
          </html>
        `,
        contentLength: 600,
        findings: [],
      },
      {
        url: 'https://example.com/account',
        depth: 1,
        status: 'fetch_error',
        method: 'mock',
        httpStatus: 401,
        title: null,
        contentLength: 0,
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

describe('freshBuild Feature Extractor', () => {
  it('defaults the Fresh Build feature flag to false', () => {
    expect(isFreshBuildEnabled({})).toBe(false);
    expect(isFreshBuildEnabled({ FLOWAI_ENABLE_FRESH_BUILD: 'false' })).toBe(false);
    expect(isFreshBuildEnabled({ FLOWAI_ENABLE_FRESH_BUILD: 'true' })).toBe(true);
  });

  it('returns a valid scaffold inventory when crawl is explicitly skipped', async () => {
    const inventory = await extractFeatures('https://example.com', {
      now: '2026-05-26T00:00:00.000Z',
      skipCrawl: true,
    });

    expect(inventory.url).toBe('https://example.com');
    expect(validateFeatureInventory(inventory)).toEqual({ ok: true, errors: [] });
    expect(inventory.metadata).toMatchObject({
      url: 'https://example.com',
      totalPagesDiscovered: 0,
      totalComponentsIdentified: 0,
      totalUserFlowsMapped: 0,
      crawlTimestamp: '2026-05-26T00:00:00.000Z',
      confidence: 0,
    });
  });

  it('uses mocked crawler and Browserless dependencies for deterministic live extraction', async () => {
    const crawlSiteImpl = vi.fn(async () => mockCrawlReport());
    const close = vi.fn(async () => {});
    const browserlessConnector = vi.fn(async () => ({ close }));

    const inventory = await extractFeatures('https://example.com', {
      now: '2026-05-26T00:00:00.000Z',
      crawlSiteImpl,
      connectBrowserless: true,
      browserlessConnector,
      maxPages: 3,
      maxDepth: 1,
    });

    expect(crawlSiteImpl).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
      maxPages: 3,
      maxDepth: 1,
    }));
    expect(browserlessConnector).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(validateFeatureInventory(inventory)).toEqual({ ok: true, errors: [] });
    expect(inventory.metadata.browserless).toMatchObject({ status: 'connected' });
    expect(inventory.metadata.totalPagesDiscovered).toBe(2);
    expect(inventory.components.map((component) => component.type)).toEqual(
      expect.arrayContaining(['nav', 'hero', 'form', 'button', 'footer']),
    );
    expect(inventory.userFlows.map((flow) => flow.name)).toEqual(
      expect.arrayContaining(['sign up', 'login', 'submit']),
    );
    expect(inventory.content.imageReferences[0]).toMatchObject({
      src: 'https://example.com/hero.png',
      purpose: 'Product dashboard',
    });
    expect(inventory.content.ctas).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Start now', target: 'https://example.com/signup' }),
    ]));
    expect(inventory.businessRules.validationRules).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'email', rule: 'required' }),
    ]));
    expect(inventory.businessRules.apiEndpoints).toEqual(expect.arrayContaining([
      expect.objectContaining({ endpoint: 'https://example.com/api/leads' }),
    ]));
  });

  it('detects components from rendered React-style crawler page records', async () => {
    const inventory = await extractFeatures('https://example.com', {
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
              <body>
                <div id="root">
                  <nav><a href="/dashboard">Dashboard</a></nav>
                  <main>
                    <section class="hero"><h1>Rendered React product</h1></section>
                    <button>Start build</button>
                  </main>
                </div>
              </body>
            </html>
          `,
          bodyText: 'Rendered React product Start build',
          contentLength: 420,
          findings: [],
        }],
      }),
    });

    expect(inventory.components.map((component) => component.type)).toEqual(
      expect.arrayContaining(['nav', 'hero', 'button']),
    );
    expect(inventory.metadata.totalComponentsIdentified).toBeGreaterThanOrEqual(3);
  });

  it('marks auth-gated pages AUTH_REQUIRED instead of fabricating content', async () => {
    const inventory = await extractFeatures('https://example.com', {
      crawlSiteImpl: async () => mockCrawlReport(),
    });
    const authPage = inventory.pages.find((page) => page.url === 'https://example.com/account');

    expect(authPage).toMatchObject({
      purpose: AUTH_REQUIRED,
      primaryContent: AUTH_REQUIRED,
      access: AUTH_REQUIRED,
    });
    expect(inventory.content.textByPage['https://example.com/account']).toMatchObject({
      text: AUTH_REQUIRED,
    });
  });

  it('keeps UNKNOWN placeholders for undetectable values', async () => {
    const inventory = await extractFeatures('https://example.com', {
      crawlSiteImpl: async () => mockCrawlReport({
        pages: [
          {
            url: 'https://example.com',
            depth: 0,
            status: 'fetched',
            httpStatus: 200,
            title: null,
            html: '',
            contentLength: 0,
            findings: [],
          },
        ],
      }),
    });

    expect(inventory.pages[0]).toMatchObject({
      title: UNKNOWN,
      purpose: 'home',
      primaryContent: UNKNOWN,
    });
    expect(inventory.content.toneAndStyle.summary).toBe(UNKNOWN);
    expect(inventory.businessRules.pricing.summary).toBe(UNKNOWN);
  });

  it('includes every required top-level field', async () => {
    const inventory = await extractFeatures('https://example.com', { skipCrawl: true });
    for (const field of REQUIRED_FEATURE_INVENTORY_FIELDS) {
      expect(inventory).toHaveProperty(field);
    }
  });

  it('fails validation when required fields are missing', async () => {
    const inventory = await extractFeatures('https://example.com', { skipCrawl: true });
    delete inventory.components;

    const validation = validateFeatureInventory(inventory);
    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain('Missing required field: components');
  });

  it('rejects confidence scores outside 0-1', async () => {
    const inventory = await extractFeatures('https://example.com', { skipCrawl: true });
    inventory.metadata.confidence = 1.1;

    const validation = validateFeatureInventory(inventory);
    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain('Invalid confidence score: 1.1');
  });

  it('does not import platform SDKs or product-specific logic', () => {
    const files = [
      'src/lib/freshBuild/constants.js',
      'src/lib/freshBuild/featureExtractor.js',
      'src/lib/freshBuild/types/featureInventory.js',
    ].map(repoFile).join('\n');

    expect(files).not.toMatch(/@base44\/sdk|base44Client|saige|reltwin|reachsms|pressai|mypreglife/i);
    expect(files).not.toMatch(/new WebSocket|chromium\.launch/i);
    expect(files).toMatch(/multiPageCrawler|crawlSite/);
    expect(files).toMatch(/browserlessAdapter|connectBrowserless/);
  });
});
