import { beforeEach, describe, expect, it } from 'vitest';
import { __test, buildActionableStageFailurePatch, createOperationalRun, getOperationalRun, getPendingStopCommand, listOperationalRuns, resetOperationalRunsForTests, updateOperationalRun } from '../api/_lib/operationalRuns.js';

const owner = { orgId: 'org_a', userId: 'user_a' };
beforeEach(() => { process.env.NODE_ENV = 'test'; delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; resetOperationalRunsForTests(); });

describe('operational run ledger', () => {
  it('creates an immediately visible stable id and deduplicates owner replay', async () => {
    const first = await createOperationalRun({ ...owner, idempotency: 'request-12345678', input: { mode: 'guided' } });
    const replay = await createOperationalRun({ ...owner, idempotency: 'request-12345678', input: { mode: 'guided' } });
    expect(replay.replayed).toBe(true);
    expect(replay.run.id).toBe(first.run.id);
    expect(await listOperationalRuns(owner)).toEqual([first.run]);
  });

  it('scopes replay and reads to tenant plus owning user', async () => {
    const a = await createOperationalRun({ ...owner, idempotency: 'shared-request1' });
    const b = await createOperationalRun({ orgId: owner.orgId, userId: 'user_b', idempotency: 'shared-request1' });
    expect(b.run.id).not.toBe(a.run.id);
    expect(await getOperationalRun(a.run.id, { ...owner, userId: 'user_b' })).toBeNull();
  });

  it('prevents implicit resume and terminal resurrection', async () => {
    const { run } = await createOperationalRun({ ...owner, idempotency: 'state-request1' });
    await updateOperationalRun(run.id, owner, { status: 'running' });
    await updateOperationalRun(run.id, owner, { status: 'paused' });
    expect((await updateOperationalRun(run.id, owner, { status: 'running' })).transitionRejected).toBe(true);
    await updateOperationalRun(run.id, owner, { status: 'running', transitionReason: 'authorized_resume' });
    await updateOperationalRun(run.id, owner, { status: 'completed' });
    const late = await updateOperationalRun(run.id, owner, { status: 'failed' });
    expect(late.status).toBe('completed');
    expect(late.transitionRejected).toBe(true);
  });

  it('persists useful step progress through cancellation', async () => {
    const { run } = await createOperationalRun({ ...owner, idempotency: 'progress-request1' });
    await updateOperationalRun(run.id, owner, { status: 'running' });
    await updateOperationalRun(run.id, owner, {
      stepResults: { research: { summary: 'Product Discovery', status: 'complete' } },
      stepCount: 1,
      progressLabel: 'Product Discovery',
    });
    await updateOperationalRun(run.id, owner, {
      status: 'cancelling',
      stopCommand: { id: 'stop-progress', acknowledged: false, dispatchState: 'pending', reservedAt: new Date().toISOString() },
    });
    const cancelled = await updateOperationalRun(run.id, owner, {
      status: 'cancelled',
      expectedControlCommandId: 'stop-progress',
      stopAcknowledgedAt: new Date().toISOString(),
    });
    expect(cancelled.stepCount).toBe(1);
    expect(cancelled.stepResults.research.summary).toBe('Product Discovery');
  });

  it('fails closed in production without durable storage', async () => {
    process.env.NODE_ENV = 'production'; resetOperationalRunsForTests();
    await expect(createOperationalRun({ ...owner, idempotency: 'durable-request' })).rejects.toMatchObject({ code: 'RUN_STORE_NOT_LIVE' });
  });

  it('reconciles an unacknowledged stale stop reservation without inferring cancellation', async () => {
    const { run } = await createOperationalRun({ ...owner, idempotency: 'stale-control-request' });
    await updateOperationalRun(run.id, owner, { status: 'running' });
    const reservedAt = new Date(Date.now() - __test.CONTROL_RESERVATION_TIMEOUT_MS - 1).toISOString();
    await updateOperationalRun(run.id, owner, {
      status: 'cancelling', expectedStatus: 'running',
      stopCommand: { id: 'stop-stale', acknowledged: false, dispatchState: 'pending', reservedAt },
    });

    const reconciled = await getOperationalRun(run.id, owner);
    expect(reconciled.status).toBe('control_failed');
    expect(reconciled.stopCommand.dispatchState).toBe('expired');
    expect(reconciled.error).toMatchObject({
      code: 'CONTROL_FAILED',
      cancellationConfirmed: false,
      executionMayStillBeActive: true,
      retrySafe: true,
    });
    expect(reconciled.error.requiredOperatorAction).toContain('Verify worker activity');
    expect(await getPendingStopCommand(run.id, owner)).toBeNull();
  });

  it('does not redispatch or expire a stop acknowledged by a terminating worker', async () => {
    const { run } = await createOperationalRun({ ...owner, idempotency: 'worker-terminating-request' });
    await updateOperationalRun(run.id, owner, { status: 'running' });
    const reservedAt = new Date(Date.now() - __test.CONTROL_RESERVATION_TIMEOUT_MS - 1).toISOString();
    await updateOperationalRun(run.id, owner, {
      status: 'cancelling',
      expectedStatus: 'running',
      stopCommand: {
        id: 'stop-worker-terminating',
        acknowledged: true,
        dispatchState: 'worker_terminating',
        reservedAt,
      },
    });

    const terminating = await getOperationalRun(run.id, owner);
    expect(terminating.status).toBe('cancelling');
    expect(terminating.stopCommand.dispatchState).toBe('worker_terminating');
    expect(await getPendingStopCommand(run.id, owner)).toBeNull();
  });

  it('merges every stage artifact durably and retains same-stage history', async () => {
    const { run } = await createOperationalRun({ ...owner, idempotency: 'stage-artifacts-merge' });
    await updateOperationalRun(run.id, owner, { status: 'running' });
    await updateOperationalRun(run.id, owner, {
      stepResults: { research: { summary: 'Public crawl', status: 'complete', artifactId: 'research-1' } },
      stepCount: 1,
    });
    await updateOperationalRun(run.id, owner, {
      stepResults: { research: { summary: 'Research scoring', status: 'complete', artifactId: 'research-2' } },
      stepCount: 1,
    });
    const persisted = await updateOperationalRun(run.id, owner, {
      stepResults: {
        research: { summary: 'Research scoring', status: 'complete', artifactId: 'research-2' },
        deploy: { summary: 'Preview deployed', status: 'complete', previewUrl: 'https://preview.example.com' },
      },
      stepCount: 2,
    });

    expect(Object.keys(persisted.stepResults)).toEqual(['research', 'deploy']);
    expect(persisted.stepResults.research.artifactId).toBe('research-2');
    expect(persisted.stepResults.research.history.map((entry) => entry.artifactId)).toEqual(['research-1', 'research-2']);
    expect(persisted.stepResults.deploy.previewUrl).toBe('https://preview.example.com');
  });

  it('durably terminates an unrecoverable Step 2 exception without fabricating later stages', async () => {
    const { run } = await createOperationalRun({ ...owner, idempotency: 'step-two-failure1' });
    await updateOperationalRun(run.id, owner, {
      status: 'running',
      stepResults: { research: { summary: 'Rate Cap + Runaway Check', status: 'failed', tool: 'rateCap.js' } },
      stepCount: 2,
    });

    const failed = await updateOperationalRun(run.id, owner, buildActionableStageFailurePatch({
      stage: 'STEP_2',
      tool: 'rateCap.js',
      code: 'RATE_LIMIT_STORE_UNAVAILABLE',
      error: 'Rate-cap ledger query failed.',
      executionMayStillBeActive: false,
    }));

    expect(failed.status).toBe('control_failed');
    expect(failed.stepResults).toEqual({
      research: { summary: 'Rate Cap + Runaway Check', status: 'failed', tool: 'rateCap.js' },
    });
    expect(failed.error).toMatchObject({
      code: 'RATE_LIMIT_STORE_UNAVAILABLE',
      stage: 'STEP_2',
      tool: 'rateCap.js',
      detail: 'Rate-cap ledger query failed.',
      executionMayStillBeActive: false,
      retrySafe: true,
      clearanceAllowed: false,
    });
    expect(failed.error.requiredOperatorAction).toContain('Correct rateCap.js');
    expect(Object.keys(failed.stepResults)).toEqual(['research']);
  });

  it('defines Redis CAS for the outbox reservation in the same run-row write', () => {
    expect(__test.UPDATE_LUA).toContain("redis.call('SET', KEYS[1], ARGV[5]");
    expect(__test.UPDATE_LUA).toContain("row.status ~= ARGV[3]");
    expect(__test.UPDATE_LUA).toContain("row.version or 0");
  });
});
