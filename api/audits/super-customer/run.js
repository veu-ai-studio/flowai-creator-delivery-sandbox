// POST /api/audits/super-customer/run
// Body: {
//   url: string (required),
//   product_id?: string,
//   org_id?: string,
//   depth?: 'quick'|'standard'|'full',         // default 'standard'
//   max_page_count?: number,                    // bounded by HARD_PAGE_CAP=200
//   soft_cost_usd?: number,                     // default 5
//   hard_cost_usd?: number,                     // default 25
//   objective?: string,
//   sync?: boolean                              // force inline (default false)
// }
//
// Returns 202 with { run_id, status, polling_url, eta_sec }. The polling
// endpoint is GET /api/audits/super-customer/status/:run_id which uses the
// same pull-resume pattern as /api/orchestrator/run.
//
// GET /api/audits/super-customer/run?run_id=<id>
//   colocated status endpoint — preferred for warm-instance affinity.

import { setCorsHeaders } from '../../_lib/claude.js';
import { resolveOrgId } from '../../_lib/tenant.js';
import { createRun, getRun, updateRun } from '../../_lib/configRegistry.js';
import { runSuperCustomerAudit } from '../../_lib/superCustomerAgent.js';
import { logger } from '../../_lib/logger.js';
import { withRequestLog } from '../../_lib/requestLog.js';

const DEFAULT_ORG = 'veu-ai-studio';

// Eta: ~6s per page baseline (capture + analysis), bounded by depth.
function estimateEta({ depth = 'standard', max_page_count }) {
  const cap = max_page_count || (depth === 'quick' ? 8 : depth === 'full' ? 100 : 30);
  return Math.min(cap * 6, 1800);
}

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // GET path: status polling (colocated for warm-instance affinity)
  if (req.method === 'GET') {
    const runId = req.query?.run_id || req.query?.runId;
    if (!runId) return res.status(400).json({ error: 'GET requires ?run_id=<id>' });
    const run = getRun(runId);
    if (!run) return res.status(404).json({ error: 'Not found', run_id: runId });
    const orgId = resolveOrgId(req) || DEFAULT_ORG;
    if (run.org_id && run.org_id !== orgId) return res.status(404).json({ error: 'Not found', run_id: runId });

    // Pull-resume: drive the work synchronously inside the GET if status='queued'
    if (run.status === 'queued' && run.metadata?._dispatch) {
      updateRun(runId, { status: 'running', metadata: { ...run.metadata, _resumed_at: Date.now() } });
      const { dispatch } = run.metadata._dispatch;
      try {
        const auditRun = await runSuperCustomerAudit({
          ...dispatch,
          runId,
          onProgress: ({ step, percent, partial }) => {
            updateRun(runId, {
              progress: { step, percent, etaSec: null },
              partial_output: partial,
            });
          },
        });
        updateRun(runId, {
          status: 'completed',
          output: auditRun,
          cost_usd: auditRun.cost_usd,
          quality_score: auditRun.health_score,
        });
      } catch (e) {
        updateRun(runId, { status: 'failed', error: e.message || String(e) });
        logger.error('audits.super-customer.failed', { runId, error: e.message });
      }
    }

    const final = getRun(runId);
    return res.status(200).json({
      run_id: final.id,
      mode: 'super-customer',
      org_id: final.org_id,
      product_id: final.product_id,
      status: final.status,
      progress: final.progress || null,
      partial_output: final.partial_output || null,
      output: final.status === 'completed' ? final.output : null,
      error: final.error || null,
      cost_usd: final.cost_usd || 0,
      health_score: final.quality_score,
      started_at: final.started_at,
      completed_at: final.completed_at,
      duration_ms: final.duration_ms,
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST or GET ?run_id=<id>' });

  const {
    url, product_id: productId, depth = 'standard',
    max_page_count, soft_cost_usd, hard_cost_usd,
    objective, sync = false,
  } = req.body || {};

  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Body must include "url" string' });
  }

  const orgId = resolveOrgId(req) || req.body?.org_id || DEFAULT_ORG;
  const eta = estimateEta({ depth, max_page_count });

  const dispatch = {
    url: url.trim(),
    orgId,
    productId,
    depth,
    maxPageCount: max_page_count,
    softCostUSD: soft_cost_usd,
    hardCostUSD: hard_cost_usd,
    objective,
  };

  if (sync) {
    // Caller forced sync — block. Will time out on full-depth audits.
    const run = createRun({
      mode: 'super-customer',
      orgId, productId,
      status: 'running',
      input: { url: url.trim(), depth, max_page_count },
      progress: { step: 'started', percent: 5, etaSec: eta },
    });
    try {
      const auditRun = await runSuperCustomerAudit({ ...dispatch, runId: run.id });
      updateRun(run.id, {
        status: 'completed', output: auditRun,
        cost_usd: auditRun.cost_usd, quality_score: auditRun.health_score,
      });
      return res.status(200).json({ ok: true, run_id: run.id, ...auditRun });
    } catch (e) {
      updateRun(run.id, { status: 'failed', error: e.message });
      return res.status(500).json({ ok: false, run_id: run.id, error: e.message });
    }
  }

  // Async dispatch — pre-create run, return run_id, pull-resume on GET.
  const run = createRun({
    mode: 'super-customer',
    orgId, productId,
    status: 'queued',
    input: { url: url.trim(), depth, max_page_count, objective },
    progress: { step: 'queued', percent: 0, etaSec: eta },
    metadata: { _dispatch: { dispatch } },
  });

  return res.status(202).json({
    ok: true,
    run_id: run.id,
    status: 'queued',
    mode: 'super-customer',
    org_id: orgId,
    product_id: productId || null,
    polling_url: `/api/audits/super-customer/run?run_id=${run.id}`,
    eta_sec: eta,
    backend: 'inline-pull-resume',
  });
}

export default withRequestLog(handler, { endpoint: '/api/audits/super-customer/run' });

// Vercel: bump to 90s. The pull-resume GET drives an audit synchronously
// inside one request — needs the room.
export const config = { maxDuration: 90 };
