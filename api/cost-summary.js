// GET  /api/cost-summary?sessionId=&endpoint=&since=
// POST /api/cost-summary  body: same filters; also accepts { entries: [...] }
//                         where entries are client-side records (e.g. from
//                         localStorage) merged into the aggregate.

import { setCorsHeaders } from './_lib/claude.js';
import { listCostEvents, costSummary } from './_lib/db.js';
import { estimateCost } from './_lib/cost.js';
import { requireAuthHard } from './_lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const ctx = await requireAuthHard(req, res);
  if (!ctx) return;

  const params = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const { sessionId, endpoint, since, limit, entries: clientEntries = [] } = params;
  const sinceMs = since ? Number(since) : undefined;
  const orgId = ctx.orgId;

  try {
    const serverEntries = await listCostEvents({
      orgId, sessionId, endpoint, since: sinceMs, limit: Math.min(parseInt(limit, 10) || 200, 500),
    });

    const normalisedClient = (Array.isArray(clientEntries) ? clientEntries : []).map((e) => ({
      ts: e.ts || Date.now(),
      endpoint: e.endpoint || '/unknown',
      sessionId: e.sessionId || null,
      model: e.model || 'claude-sonnet-4-6',
      inputTokens: e.inputTokens || e.usage?.input_tokens || 0,
      outputTokens: e.outputTokens || e.usage?.output_tokens || 0,
      estUSD: e.estUSD ?? estimateCost({ model: e.model, usage: e.usage }),
      stop_reason: e.stop_reason || null,
      outputChars: e.outputChars || 0,
    }));

    const summary = await costSummary({
      orgId, sessionId, endpoint, since: sinceMs, entries: normalisedClient,
    });

    return res.status(200).json({
      summary,
      entries: [...serverEntries, ...normalisedClient].slice(-200),
      serverCount: serverEntries.length,
      clientCount: normalisedClient.length,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
