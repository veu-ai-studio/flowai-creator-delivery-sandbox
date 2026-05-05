// Base44 agent — passthrough/proxy. Today: shell only. The Base44 SDK is
// browser-side; this server agent is here so the UI can route SDK calls
// through the orchestrator (for cost tracking, rate limiting, audit log).
//
// When BASE44_API_BASE_URL + BASE44_API_TOKEN are set, run() will call the
// configured Base44 API. Until then it returns AGENT_DISABLED.

import { successEnvelope, envelope, ErrorCodes } from '../contracts.js';

export const base44Agent = {
  description: 'Base44 platform proxy (entities + integrations)',
  isEnabled() { return Boolean(process.env.BASE44_API_BASE_URL && process.env.BASE44_API_TOKEN); },
  retry: { attempts: 2, backoffMs: 500 },
  async run({ method = 'GET', path, body, headers }) {
    if (!this.isEnabled()) {
      return envelope({ agent: 'base44', code: ErrorCodes.AGENT_DISABLED, message: 'BASE44_API_BASE_URL / BASE44_API_TOKEN not set' });
    }
    try {
      const url = `${process.env.BASE44_API_BASE_URL.replace(/\/$/, '')}${path}`;
      const r = await fetch(url, {
        method,
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${process.env.BASE44_API_TOKEN}`,
          ...(headers || {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!r.ok) {
        return envelope({ agent: 'base44', code: ErrorCodes.UPSTREAM_ERROR, message: `Base44 ${r.status}`, retriable: r.status >= 500, details: { data } });
      }
      return successEnvelope({ agent: 'base44', output: { data, status: r.status } });
    } catch (e) {
      return envelope({ agent: 'base44', code: ErrorCodes.UPSTREAM_ERROR, message: e.message, retriable: true });
    }
  },
  async health() {
    return { ok: this.isEnabled(), configured: this.isEnabled() };
  },
};
