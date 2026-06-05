import { setCorsHeaders } from './_lib/claude.js';
import { requireAuthHard } from './_lib/auth.js';
import { requireSameSiteForStateChange } from './_lib/csrf.js';
import {
  approvePendingAction,
  createPendingApproval,
  defaultApprovalStore,
  dispatchToolAction,
  normalizeDispatchCandidates,
  redactSecrets,
  resolveDispatchEligibility,
} from '../src/lib/tools/toolDispatchContract.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const auth = await requireAuthHard(req, res);
  if (!auth) return;
  if (!requireSameSiteForStateChange(req, res)) return;

  const body = req.body || {};
  const intent = body.intent ?? 'resolve';
  const operatorId = auth.userId ?? auth.authMode ?? 'authorized-operator';

  try {
    if (intent === 'rankings') {
      const candidates = normalizeDispatchCandidates(body.candidates ?? [], { env: process.env });
      return res.status(200).json({
        ok: true,
        intent,
        candidates: redactSecrets(candidates),
      });
    }

    if (intent === 'approve') {
      const approved = await approvePendingAction({
        store: defaultApprovalStore,
        approvalId: body.approvalId,
        operatorId,
      });
      if (!approved) return res.status(404).json({ ok: false, error: 'approval record not found' });
      return res.status(200).json({ ok: true, approval: redactSecrets(approved) });
    }

    if (intent === 'pending_approval') {
      const approval = await createPendingApproval({
        store: defaultApprovalStore,
        operatorId,
        mode: body.mode,
        selectedTool: body.selectedTool,
        action: body.action,
        productId: body.productId,
        runId: body.runId,
        sessionId: body.sessionId,
        env: process.env,
      });
      return res.status(200).json({ ok: true, approval: redactSecrets(approval) });
    }

    if (intent === 'dispatch') {
      const result = await dispatchToolAction({
        mode: body.mode,
        action: body.action,
        payload: body.payload ?? {},
        selectedTool: body.selectedTool,
        memberId: body.memberId,
        candidates: body.candidates ?? [],
        approvalId: body.approvalId,
        operatorEnabledAuto: body.operatorEnabledAuto === true,
        approvalStore: defaultApprovalStore,
        timeoutMs: Math.min(Number(body.timeoutMs) || 30_000, 30_000),
        env: process.env,
      });
      return res.status(200).json(redactSecrets(result));
    }

    const eligibility = await resolveDispatchEligibility({
      mode: body.mode,
      action: body.action,
      selectedTool: body.selectedTool,
      memberId: body.memberId,
      candidates: body.candidates ?? [],
      approvalId: body.approvalId,
      operatorEnabledAuto: body.operatorEnabledAuto === true,
      approvalStore: defaultApprovalStore,
      env: process.env,
    });
    return res.status(200).json({
      ok: true,
      intent: 'resolve',
      eligibility: redactSecrets(eligibility),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'tool dispatch contract failed',
      details: redactSecrets(error?.message ?? String(error)),
    });
  }
}
