import { requireAuthHard } from '../_lib/auth.js';
import { createOperationalRun, updateOperationalRun } from '../_lib/operationalRuns.js';
import { getSupabase } from '../_lib/supabase.js';
import { dispatch } from '../../src/lib/orchestra/index.js';
import { createToolIntelligenceService } from '../../src/lib/tools/ToolIntelligenceService.js';
import { IndependentStageError, runIndependentStage } from '../../src/lib/forge/independentStageRunner.js';
import { discoverPublicResearchSources } from '../../src/lib/forge/researchRecoveryAdapters.js';

export function safeStageFailureDetails(error) {
  const attempts = Array.isArray(error?.details?.attemptHistory)
    ? error.details.attemptHistory
      .filter(attempt => attempt && typeof attempt === 'object')
      .map(attempt => ({
        tool: typeof attempt.tool === 'string' ? attempt.tool : null,
        memberId: typeof attempt.memberId === 'string' ? attempt.memberId : null,
        state: typeof attempt.state === 'string' ? attempt.state : null,
        reason: typeof attempt.reason === 'string' ? attempt.reason.slice(0, 300) : null,
      }))
    : [];
  return attempts.length > 0
    ? { exhaustionKind: error?.details?.exhaustionKind ?? null, attempts }
    : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });
  const auth = await requireAuthHard(req, res);
  if (!auth) return;
  const body = req.body || {};
  if (body.environment !== 'staging' || body.productionPromotionAuthorized === true) {
    return res.status(409).json({ ok: false, error: 'NONPRODUCTION_BOUNDARY_REQUIRED' });
  }
  const actorId = auth.userId || `authorized-${auth.authMode}`;
  const idempotency = String(req.headers?.['idempotency-key'] || '');
  let accepted;
  try {
    accepted = await createOperationalRun({
      orgId: auth.orgId, userId: actorId, idempotency,
      input: { mode: 'independent_stage', requestedStage: body.stage, product: body.productId, provenance: { actorId, tenantId: auth.orgId } },
    });
    if (accepted.replayed) return res.status(409).json({ ok: false, error: 'RUN_ALREADY_ACCEPTED', runId: accepted.run.id });
    await updateOperationalRun(accepted.run.id, { orgId: auth.orgId, userId: actorId }, { status: 'running', progressLabel: `Running standalone ${body.stage}` });
    const client = getSupabase();
    const result = await runIndependentStage({
      ...body, runId: accepted.run.id, tenantId: auth.orgId, actorId,
      environment: 'staging', productionPromotionAuthorized: false,
    }, {
      dispatch,
      toolService: client ? createToolIntelligenceService({ client }) : undefined,
      publicResearchDiscovery: discoverPublicResearchSources,
    });
    const completed = await updateOperationalRun(accepted.run.id, { orgId: auth.orgId, userId: actorId }, {
      status: 'completed', completedAt: new Date().toISOString(), progressLabel: `Standalone ${body.stage} completed`,
      requestedStage: body.stage, invocationMode: 'independent_stage', clearanceAllowed: false,
      productionPromotionAuthorized: false, stepResults: { [body.stage]: { status: 'complete', artifacts: [result.artifact], provenance: result.artifact.provenance } },
    });
    return res.status(200).json({ ok: true, runId: completed.id, requestedStage: body.stage, artifact: result.artifact, clearanceAllowed: false, productionPromotionAuthorized: false });
  } catch (error) {
    const details = safeStageFailureDetails(error);
    if (accepted?.run) await updateOperationalRun(accepted.run.id, { orgId: auth.orgId, userId: actorId }, { status: 'failed', completedAt: new Date().toISOString(), progressLabel: 'Standalone stage failed', error: { code: error.code || 'INDEPENDENT_STAGE_FAILED', message: error.message, details, clearanceAllowed: false } }).catch(() => null);
    const status = error instanceof IndependentStageError ? 400 : 500;
    return res.status(status).json({ ok: false, error: error.code || 'INDEPENDENT_STAGE_FAILED', message: error.message, details, clearanceAllowed: false, productionPromotionAuthorized: false });
  }
}
