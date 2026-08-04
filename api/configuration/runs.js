// GET  /api/configuration/runs?product_id=&mode=&status=&limit=
// GET  /api/configuration/runs?id=<run_id>      → single run + snapshot if any
//
// Lists configuration runs (clone / synthesize / describe) for the current
// org. Each run record includes input summary, output snippet, cost, quality
// score, duration, and status.

import { setCorsHeaders } from '../_lib/claude.js';
import { requireAuthHard } from '../_lib/auth.js';
import { listRuns, getRun, getSnapshot } from '../_lib/configRegistry.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const authCtx = await requireAuthHard(req, res);
  if (!authCtx) return;
  const orgId = authCtx.orgId;
  const { id, product_id: productId, mode, status, limit } = req.query || {};

  if (id) {
    const run = getRun(id);
    if (!run) return res.status(404).json({ error: 'Not found' });
    if (run.org_id && run.org_id !== orgId) return res.status(404).json({ error: 'Not found' });
    const snapshot = getSnapshot(id);
    return res.status(200).json({ run, snapshot });
  }

  const runs = listRuns({
    orgId,
    productId: productId || undefined,
    mode: mode || undefined,
    status: status || undefined,
    limit: limit ? parseInt(limit, 10) : 100,
  });
  return res.status(200).json({ runs, total: runs.length });
}
