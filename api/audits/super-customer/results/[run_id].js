// GET /api/audits/super-customer/results/:run_id
//
// Returns the FULL results bundle for a completed audit run:
//   - run metadata
//   - all surfaces with their analysis
//   - all classified issues
//   - executive summary text
//   - action plan JSON
//
// 404 when run not found in the same warm function instance pool. When
// Supabase is wired tomorrow this becomes durable across instances.
//
// Use ?format=summary to get just the metadata + counts (much smaller
// payload), or ?format=md to get the action-plan markdown only.

import { setCorsHeaders } from '../../../_lib/claude.js';
import { getRun } from '../../../_lib/configRegistry.js';
import { resolveOrgId } from '../../../_lib/tenant.js';
import { withRequestLog } from '../../../_lib/requestLog.js';

const DEFAULT_ORG = 'veu-ai-studio';

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const runId = req.query?.run_id;
  if (!runId) return res.status(400).json({ error: 'Missing run_id in path' });

  const run = getRun(runId);
  if (!run) return res.status(404).json({ error: 'Not found', run_id: runId });

  const orgId = resolveOrgId(req) || DEFAULT_ORG;
  if (run.org_id && run.org_id !== orgId) return res.status(404).json({ error: 'Not found', run_id: runId });
  if (run.status !== 'completed') {
    return res.status(409).json({ error: `Run is ${run.status}, not completed`, run_id: runId, status: run.status, progress: run.progress });
  }

  const audit = run.output;
  if (!audit) return res.status(500).json({ error: 'Run completed but output missing', run_id: runId });

  const format = req.query?.format || 'full';

  if (format === 'summary') {
    return res.status(200).json({
      run_id: audit.id,
      target_url: audit.target_url,
      org_id: audit.org_id,
      product_id: audit.product_id,
      depth: audit.depth,
      started_at: audit.started_at,
      completed_at: audit.completed_at,
      surfaces_count: (audit.surfaces || []).length,
      issues_count: audit.counts,
      health_score: audit.health_score,
      cost_usd: audit.cost_usd,
      notes: audit.notes,
    });
  }

  if (format === 'md') {
    return res.status(200)
      .setHeader('content-type', 'text/markdown; charset=utf-8')
      .send(audit.summary_text || 'No summary available');
  }

  if (format === 'issues') {
    return res.status(200).json({
      run_id: audit.id,
      counts: audit.counts,
      issues: audit.issues || [],
    });
  }

  // Default: full bundle
  return res.status(200).json({
    run_id: audit.id,
    target_url: audit.target_url,
    org_id: audit.org_id,
    product_id: audit.product_id,
    depth: audit.depth,
    started_at: audit.started_at,
    completed_at: audit.completed_at,
    duration_ms: audit.completed_at ? new Date(audit.completed_at) - new Date(audit.started_at) : null,
    surfaces: audit.surfaces || [],
    issues: audit.issues || [],
    counts: audit.counts,
    health_score: audit.health_score,
    cost_usd: audit.cost_usd,
    cost_caps: audit.cost_caps,
    notes: audit.notes,
    summary_text: audit.summary_text,
    action_plan_json: audit.action_plan_json,
  });
}

export default withRequestLog(handler, { endpoint: '/api/audits/super-customer/results' });
