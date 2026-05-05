// Replit / proxy crawler agent — calls the Replit-hosted Playwright service
// already used by the existing operationsEngine. Useful when Browserless is
// down or unavailable for a specific URL pattern.

import { successEnvelope, envelope, ErrorCodes } from '../contracts.js';

const PROXY = 'https://attached-assets-victor2081new.replit.app';

export const replitAgent = {
  description: 'Replit-hosted Playwright proxy (legacy crawler)',
  isEnabled() { return process.env.REPLIT_PROXY_DISABLED !== 'true'; },
  retry: { attempts: 1, backoffMs: 0 },
  async run({ op = 'fetch', url, max_pages, capture_screenshots, find_issues, actions }) {
    try {
      const path = op === 'crawl' ? '/crawl' : op === 'test' ? '/test' : '/fetch';
      const r = await fetch(`${PROXY}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, max_pages, capture_screenshots, find_issues, actions }),
      });
      if (!r.ok) {
        return envelope({ agent: 'replit', code: ErrorCodes.UPSTREAM_ERROR, message: `Replit proxy ${r.status}`, retriable: true });
      }
      const data = await r.json();
      return successEnvelope({ agent: 'replit', output: data });
    } catch (e) {
      return envelope({ agent: 'replit', code: ErrorCodes.UPSTREAM_ERROR, message: e.message, retriable: true });
    }
  },
  async health() {
    if (process.env.REPLIT_PROXY_DISABLED === 'true') return { ok: false, reason: 'disabled by env' };
    try {
      const r = await fetch(`${PROXY}/`, { method: 'GET' });
      return { ok: r.ok, status: r.status };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
};
