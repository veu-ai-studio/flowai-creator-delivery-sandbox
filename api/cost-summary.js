// GET  /api/cost-summary?sessionId=...&endpoint=...&since=...
// POST /api/cost-summary  — body: same filters; also accepts { entries: [...] }
//                           where entries are client-side records (e.g. from
//                           localStorage) to be aggregated together with the
//                           server-side ring buffer.
//
// Returns:
//   {
//     summary: { calls, inputTokens, outputTokens, estUSD, perEndpoint, perModel },
//     entries: [...]    // limited
//   }

import { setCorsHeaders } from './_lib/claude.js';
import { readLog, summarise, estimateCost } from './_lib/cost.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const params = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const { sessionId, endpoint, since, limit, entries: clientEntries = [] } = params;
  const sinceMs = since ? Number(since) : undefined;

  // Server-side ring (best-effort — doesn't survive cold starts).
  const serverEntries = readLog({
    sessionId: sessionId || undefined,
    endpoint: endpoint || undefined,
    since: sinceMs,
    limit: Math.min(parseInt(limit, 10) || 200, 500),
  });

  // Merge in caller-provided entries (from localStorage) so the summary
  // reflects everything regardless of cold-start resets.
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

  const all = [...serverEntries, ...normalisedClient];
  const filtered = all.filter((e) =>
    (!sessionId || e.sessionId === sessionId) &&
    (!endpoint || e.endpoint === endpoint) &&
    (!sinceMs || e.ts >= sinceMs),
  );

  return res.status(200).json({
    summary: summarise(filtered),
    entries: filtered.slice(-200),
    serverCount: serverEntries.length,
    clientCount: normalisedClient.length,
  });
}
