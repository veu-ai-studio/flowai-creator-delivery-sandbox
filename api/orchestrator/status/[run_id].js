// GET /api/orchestrator/status/:run_id
//
// Polled by clients after POST /api/orchestrator/run. Returns:
//   {
//     run_id, agent (mode), status: 'queued'|'running'|'completed'|'failed',
//     progress: { step, percent, etaSec },
//     partial_output: <agent-specific snapshot during execution>,
//     output: <full result when completed>,
//     cost_usd, quality_score, error?,
//     started_at, completed_at, duration_ms
//   }

import { setCorsHeaders } from '../../_lib/claude.js';
import { getRun, getSnapshot } from '../../_lib/configRegistry.js';
import { resolveOrgId } from '../../_lib/tenant.js';

const DEFAULT_ORG = 'veu-ai-studio';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const runId = req.query?.run_id;
  if (!runId) return res.status(400).json({ error: 'Missing run_id in path' });

  const run = getRun(runId);
  if (!run) return res.status(404).json({ error: 'Not found', run_id: runId });

  const orgId = resolveOrgId(req) || DEFAULT_ORG;
  if (run.org_id && run.org_id !== orgId) {
    return res.status(404).json({ error: 'Not found', run_id: runId });
  }

  const snapshot = run.mode === 'clone' ? getSnapshot(runId) : null;

  return res.status(200).json({
    run_id: run.id,
    agent: run.mode,
    org_id: run.org_id,
    product_id: run.product_id,
    status: run.status,
    progress: run.progress || null,
    partial_output: run.partial_output || null,
    output: run.status === 'completed' ? run.output : null,
    error: run.error || null,
    cost_usd: run.cost_usd || 0,
    quality_score: run.quality_score,
    started_at: run.started_at,
    completed_at: run.completed_at,
    duration_ms: run.duration_ms,
    has_snapshot: Boolean(snapshot),
  });
}
