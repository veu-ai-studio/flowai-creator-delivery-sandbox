// POST /api/orchestrator/run
// Body: {
//   agent: 'clone'|'synthesize'|'describe'   // configuration mode agent
//          | <any registered agent name>,    // future: claude, voyage, etc.
//   payload: { ... },                        // mode-specific input
//   product_id?: string,
//   org_id?: string,
//   sync?: boolean                           // force inline (default false)
// }
//
// Returns IMMEDIATELY (target <1s) with:
//   { run_id, status: 'queued'|'running', polling_url, agent, eta_sec }
//
// Background dispatch:
//   - Inngest enabled  → fires flowai/orchestrator.run.requested event
//   - Inline           → unawaited Promise inside the handler. Vercel keeps
//                        the Node function alive up to maxDuration (60s here)
//                        so the work completes even after the response is
//                        sent. Tomorrow Inngest takes over for jobs that
//                        exceed maxDuration.
//
// Configuration agents (clone/synthesize/describe) attach to the pre-created
// run via _run_id — they update progress / partial_output throughout.

import { setCorsHeaders } from '../_lib/claude.js';
import { agents } from '../_lib/orchestrator.js';
import { resolveOrgId } from '../_lib/tenant.js';
import { createRun } from '../_lib/configRegistry.js';
import { isInngestEnabled, sendEvent } from '../_lib/inngest.js';
import { logger } from '../_lib/logger.js';

const DEFAULT_ORG = 'veu-ai-studio';

const CONFIGURATION_AGENTS = new Set(['clone', 'synthesize', 'describe']);

// Eta hint per agent (in seconds). Crude heuristic; refined via observation.
function estimateEta(agent, payload) {
  if (agent === 'describe') return 25;
  if (agent === 'clone') return 60;
  if (agent === 'synthesize') {
    const n = (payload?.inputs || []).length;
    return Math.max(60, n * 25);
  }
  return 30;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { agent, payload = {}, product_id: productId, sync = false } = req.body || {};
  if (!agent || typeof agent !== 'string') {
    return res.status(400).json({ error: 'Body must include "agent" (string).' });
  }
  if (!agents.get(agent)) {
    return res.status(400).json({ error: `Unknown agent "${agent}".` });
  }

  const orgId = resolveOrgId(req) || payload.org_id || DEFAULT_ORG;
  const isConfigurationMode = CONFIGURATION_AGENTS.has(agent);

  // ─── Path A: configuration mode (long-running) ──────────────────────
  if (isConfigurationMode) {
    // Pre-create the run record so we can return the run_id immediately.
    const run = createRun({
      mode: agent,
      orgId,
      productId: productId || payload.product_id || null,
      status: 'queued',
      input: summariseInput(agent, payload),
      progress: { step: 'queued', percent: 0, etaSec: estimateEta(agent, payload) },
    });

    const fullPayload = {
      ...payload,
      org_id: orgId,
      product_id: productId || payload.product_id || null,
      _run_id: run.id,
    };

    // ── Inngest dispatch ───────────────────────────────────────────────
    if (isInngestEnabled() && !sync) {
      sendEvent('flowai/orchestrator.run.requested', { agent, payload: fullPayload, runId: run.id, orgId })
        .catch((e) => logger.error('orchestrator.dispatch.inngest_failed', { runId: run.id, error: e.message }));
      return res.status(202).json({
        ok: true,
        run_id: run.id,
        status: 'queued',
        agent,
        org_id: orgId,
        product_id: fullPayload.product_id,
        polling_url: `/api/orchestrator/status/${run.id}`,
        eta_sec: estimateEta(agent, payload),
        backend: 'inngest',
      });
    }

    // ── Inline (background) dispatch ───────────────────────────────────
    // Fire the agent without awaiting — the function instance keeps the
    // promise alive up to maxDuration. The client polls /status to see it
    // complete.
    if (sync) {
      // Caller forced sync — block until done. Will time out on long runs.
      const result = await agents.run(agent, fullPayload);
      return res.status(result.ok ? 200 : 500).json({ ok: result.ok, run_id: run.id, ...result });
    }

    // Send response first, then dispatch.
    res.status(202).json({
      ok: true,
      run_id: run.id,
      status: 'queued',
      agent,
      org_id: orgId,
      product_id: fullPayload.product_id,
      polling_url: `/api/orchestrator/status/${run.id}`,
      eta_sec: estimateEta(agent, payload),
      backend: 'inline-background',
    });

    // Background — don't await. Errors update the run record.
    agents.run(agent, fullPayload)
      .catch((e) => logger.error('orchestrator.background.failed', { runId: run.id, agent, error: e.message }));
    return;
  }

  // ─── Path B: short-lived agent (claude/voyage/clerk/etc) — sync OK ──
  // Most non-configuration agents finish in well under serverless limits.
  // We still allow a sync invocation here.
  const result = await agents.run(agent, { ...payload, ctx: { orgId, productId, ...(payload.ctx || {}) } });
  return res.status(result.ok ? 200 : 502).json({ ok: !!result.ok, agent, ...result });
}

function summariseInput(agent, payload) {
  if (agent === 'clone') return { url: payload?.url };
  if (agent === 'synthesize') return { inputCount: (payload?.inputs || []).length, objective: payload?.objective };
  if (agent === 'describe') return { descriptionLength: (payload?.description || '').length };
  return {};
}

// Vercel: give the function up to 60s for inline-background dispatch to keep
// the unawaited promise alive long enough to finish a clone/synthesize run.
export const config = {
  maxDuration: 60,
};
