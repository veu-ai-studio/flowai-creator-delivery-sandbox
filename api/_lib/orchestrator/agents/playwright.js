// Playwright endpoint agent — for self-hosted headless browser services.
// Distinct from `replit` (which is a fixed proxy) and from `browserless`
// (commercial). Used by tests / power users with their own Playwright fleet.

import { successEnvelope, envelope, ErrorCodes } from '../contracts.js';

export const playwrightAgent = {
  description: 'Self-hosted Playwright endpoint (PLAYWRIGHT_ENDPOINT)',
  isEnabled() { return Boolean(process.env.PLAYWRIGHT_ENDPOINT); },
  retry: { attempts: 1, backoffMs: 0 },
  async run({ url, waitUntil = 'networkidle' }) {
    if (!this.isEnabled()) return envelope({ agent: 'playwright', code: ErrorCodes.AGENT_DISABLED, message: 'PLAYWRIGHT_ENDPOINT not set' });
    try {
      const r = await fetch(`${process.env.PLAYWRIGHT_ENDPOINT.replace(/\/$/, '')}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, waitUntil }),
      });
      if (!r.ok) return envelope({ agent: 'playwright', code: ErrorCodes.UPSTREAM_ERROR, message: `Endpoint ${r.status}`, retriable: true });
      const data = await r.json().catch(() => null);
      return successEnvelope({ agent: 'playwright', output: data || {} });
    } catch (e) {
      return envelope({ agent: 'playwright', code: ErrorCodes.UPSTREAM_ERROR, message: e.message, retriable: true });
    }
  },
  async health() {
    return { ok: this.isEnabled(), configured: this.isEnabled() };
  },
};
