// POST /api/run-step
// Dispatcher for the 8 Auto Runner / Guided / Manual steps.
// Today: runs inline (matches previous behaviour exactly).
// Tomorrow: when INNGEST_BACKEND !== 'inline' and both keys are set, the
// request returns immediately with a job id and the work happens in Inngest.
// The UI can either await the inline result (current shape) or poll for the
// Inngest job — both paths return the same JSON envelope.

import { setCorsHeaders } from './_lib/claude.js';
import { STEP_KEYS, STEP_LABELS } from './_lib/stepPrompts.js';
import { runStepInline } from './_lib/jobs/runStep.js';
import { isInngestEnabled, sendEvent } from './_lib/inngest.js';
import { resolveOrgId, resolveProductId } from './_lib/tenant.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const {
    step, input = {}, objective, priorResults, pageContent,
    force, sessionId, mode = 'auto', async: asyncRequested = false,
  } = req.body || {};

  if (!STEP_KEYS.includes(step)) {
    return res.status(400).json({ error: `Unknown step "${step}". Use one of: ${STEP_KEYS.join(', ')}.` });
  }
  if (!input || typeof input.value !== 'string' || !input.value.trim()) {
    return res.status(400).json({ error: 'Body must include input { type, value }.' });
  }

  const orgId = resolveOrgId(req);
  const productId = req.body?.productId || resolveProductId(req);

  // Async path: when Inngest is enabled AND caller opts in, fire-and-forget.
  if (asyncRequested && isInngestEnabled()) {
    const evt = await sendEvent('flowai/run-step.requested', {
      step, input, objective, priorResults, pageContent, force, sessionId, orgId, productId, mode,
    });
    return res.status(202).json({
      ok: true, async: true, ids: evt.ids,
      step, stepLabel: STEP_LABELS[step], mode,
      message: 'Job dispatched to Inngest. Poll cost-summary or audit-log for completion.',
    });
  }

  // Default: inline (today's behaviour).
  try {
    const result = await runStepInline({
      step, input, objective, priorResults, pageContent, force,
      sessionId, orgId, productId, mode,
    });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, step, error: 'Step execution failed', details: e.message || String(e) });
  }
}
