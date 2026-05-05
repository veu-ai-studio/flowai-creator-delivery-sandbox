// Crawler agent (Browserless / Playwright endpoint / simple-fetch chain).

import { crawl } from '../../crawler.js';
import { successEnvelope, envelope, ErrorCodes, validateCrawlerInput } from '../contracts.js';

export const browserlessAgent = {
  description: 'Browserless.io rendered HTML + extraction (with simple-fetch fallback)',
  isEnabled() { return true; }, // always enabled — falls back to simple-fetch
  validate: validateCrawlerInput,
  retry: { attempts: 2, backoffMs: 1000 },
  async run({ url, force }) {
    const page = await crawl(url, { force });
    if (page.ok) return successEnvelope({ agent: 'browserless', output: page });
    return envelope({ agent: 'browserless', code: ErrorCodes.UPSTREAM_ERROR, message: page.reason, retriable: true, details: { attempts: page.attempts } });
  },
  async health() {
    const browserless = Boolean(process.env.BROWSERLESS_API_KEY);
    const playwright = Boolean(process.env.PLAYWRIGHT_ENDPOINT);
    return {
      ok: true,
      browserlessConfigured: browserless,
      playwrightEndpointConfigured: playwright,
      activeMethod: browserless ? 'browserless' : playwright ? 'playwright-endpoint' : 'simple-fetch',
    };
  },
};
