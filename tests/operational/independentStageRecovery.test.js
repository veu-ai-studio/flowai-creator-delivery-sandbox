import { beforeEach, describe, expect, it } from 'vitest';
import { createOperationalRun, getOperationalRun, listOperationalRuns, resetOperationalRunsForTests, updateOperationalRun } from '../../api/_lib/operationalRuns.js';

describe('independent-stage durable recovery', () => {
  beforeEach(() => { process.env.NODE_ENV = 'test'; resetOperationalRunsForTests(); });
  it('restores requested stage, actor provenance, history, and controls after remount/refresh/relogin while isolating tenants', async () => {
    const owner = { orgId: 'tenant-a', userId: 'founder-1' };
    const { run } = await createOperationalRun({ orgId: owner.orgId, userId: owner.userId, idempotency: 'independent-design-recovery', input: { mode: 'independent_stage', requestedStage: 'design', provenance: { actorId: owner.userId, tenantId: owner.orgId } } });
    await updateOperationalRun(run.id, owner, { status: 'running', stepResults: { design: { status: 'running', artifacts: [] } } });
    await updateOperationalRun(run.id, owner, { status: 'completed', requestedStage: 'design', clearanceAllowed: false, productionPromotionAuthorized: false, stepResults: { design: { status: 'complete', artifacts: [{ id: 'a', fingerprint: 'b'.repeat(64), provenance: { actorId: owner.userId, tenantId: owner.orgId } }] } } });
    const refreshed = await getOperationalRun(run.id, owner);
    const relogged = await listOperationalRuns(owner);
    expect(refreshed).toMatchObject({ mode: 'independent_stage', requestedStage: 'design', provenance: { actorId: 'founder-1', tenantId: 'tenant-a' }, clearanceAllowed: false, productionPromotionAuthorized: false });
    expect(refreshed.stepResults.design.history).toHaveLength(2);
    expect(relogged.map(row => row.id)).toContain(run.id);
    expect(await getOperationalRun(run.id, { orgId: 'tenant-b', userId: owner.userId })).toBeNull();
  });
});
