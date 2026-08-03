// GET /api/orchestrator/health
// Pings every registered agent's health() and returns aggregate status.
// Useful for tomorrow's credential-activation pass: a single endpoint that
// confirms each provider is reachable and configured.

import { setCorsHeaders } from '../_lib/claude.js';
import { agents } from '../_lib/orchestrator.js';
import { selectedBackend } from '../_lib/db.js';
import { requireAuthHard } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const ctx = await requireAuthHard(req, res);
  if (!ctx) return;

  const t0 = Date.now();
  const detail = await agents.health();
  const summary = {
    ok: true,
    enabledCount: 0,
    disabledCount: 0,
    failingCount: 0,
  };
  for (const [, info] of Object.entries(detail)) {
    if (info.enabled) summary.enabledCount += 1;
    else summary.disabledCount += 1;
    if (info.health && info.health.ok === false) {
      summary.failingCount += 1;
      summary.ok = false;
    }
  }

  return res.status(200).json({
    ts: new Date().toISOString(),
    durationMs: Date.now() - t0,
    backend: { db: selectedBackend() },
    summary,
    agents: detail,
  });
}
