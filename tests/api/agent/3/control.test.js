import { beforeEach, describe, expect, it } from 'vitest';
import handler from '../../../../api/agent/3/control.js';
import { createOperationalRun, getOperationalRun, getPendingStopCommand, resetOperationalRunsForTests, setOperationalRunStoreForTests, updateOperationalRun } from '../../../../api/_lib/operationalRuns.js';
import { readAndClearCommand, resetForTests } from '../../../../api/_lib/runControlBus.js';

const owner = { orgId: 'org_test', userId: 'user_test' };
const authHeaders = { 'x-flowai-service-key': 'service-test', 'x-flowai-org-id': owner.orgId, 'x-flowai-user-id': owner.userId };
function res() { return { statusCode: 200, body: null, headers: {}, setHeader(k,v){this.headers[k]=v;}, status(c){this.statusCode=c;return this;}, json(v){this.body=v;return this;} }; }
async function active(idem, input = {}) {
  const { run } = await createOperationalRun({ ...owner, idempotency: idem, input: { mode: 'auto', ...input } });
  return updateOperationalRun(run.id, owner, { status: 'running' });
}

beforeEach(() => {
  process.env.NODE_ENV = 'test'; process.env.FLOWAI_SERVICE_KEY = 'service-test';
  delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  resetOperationalRunsForTests(); resetForTests();
});

describe('tenant-owned run control', () => {
  it('authenticates before validation', async () => {
    const response = res();
    await handler({ method: 'POST', headers: {}, body: {} }, response);
    expect(response.statusCode).toBe(401);
  });

  it('rejects caller-asserted product scope', async () => {
    const response = res();
    await handler({ method: 'POST', headers: { 'x-product-scope': 'flowai' }, body: { runId: 'x', command: 'stop' } }, response);
    expect(response.statusCode).toBe(401);
  });

  it('rejects cross-owner run control', async () => {
    const run = await active('cross-owner-request');
    const response = res();
    await handler({ method: 'POST', headers: { ...authHeaders, 'x-flowai-user-id': 'other' }, body: { runId: run.id, command: 'pause' } }, response);
    expect(response.statusCode).toBe(404);
  });

  for (const command of ['pause', 'resume', 'switchMode']) {
    it(`durably addresses an owned ${command} command`, async () => {
      const run = await active(`command-${command}-request`);
      const response = res();
      await handler({ method: 'POST', headers: authHeaders, body: { runId: run.id, command, mode: command === 'switchMode' ? 'guided' : undefined } }, response);
      expect(response.statusCode).toBe(200);
      expect((await readAndClearCommand(run.id)).command).toBe(command);
    });
  }

  for (const command of ['pause', 'resume', 'switchMode']) {
    it(`rejects Fresh Build ${command} without changing durable running state`, async () => {
      const run = await active(`fresh-build-${command}-request`, { flowHubPath: 'fresh_build' });
      const response = res();
      await handler({ method: 'POST', headers: authHeaders, body: { runId: run.id, command, mode: command === 'switchMode' ? 'guided' : undefined } }, response);
      expect(response.statusCode).toBe(409);
      expect(response.body).toEqual({ ok: false, error: 'FRESH_BUILD_STOP_ONLY', allowed: ['stop'] });
      expect((await getOperationalRun(run.id, owner)).status).toBe('running');
      expect(await readAndClearCommand(run.id)).toBeNull();
    });
  }

  it('keeps durable Stop available for Fresh Build', async () => {
    const run = await active('fresh-build-stop-request', { flowHubPath: 'fresh_build' });
    const response = res();
    await handler({ method: 'POST', headers: authHeaders, body: { runId: run.id, command: 'stop' } }, response);
    expect(response.statusCode).toBe(200);
    const ledger = await getOperationalRun(run.id, owner);
    expect(ledger.status).toBe('cancelling');
    expect((await getPendingStopCommand(run.id, owner)).id).toBe(ledger.stopCommand.id);
  });

  it('atomically reserves stop in the durable ledger outbox and survives bus restart', async () => {
    const run = await active('stop-owned-request');
    const response = res();
    await handler({ method: 'POST', headers: authHeaders, body: { runId: run.id, command: 'stop' } }, response);
    expect(response.statusCode).toBe(200);
    expect(await readAndClearCommand(run.id)).toBeNull();
    resetForTests();
    const command = await getPendingStopCommand(run.id, owner);
    const ledger = await getOperationalRun(run.id, owner);
    expect(ledger.status).toBe('cancelling');
    expect(command.id).toBe(ledger.stopCommand.id);
    expect(ledger.stopCommand.acknowledged).toBe(false);
    expect(ledger.stopCommand.dispatchState).toBe('pending');
    expect(response.body.transport).toBe('ledger');
  });

  it('replays duplicate authorized stop with the original command id through acknowledgement', async () => {
    const run = await active('duplicate-stop-request');
    const first = res();
    const retry = res();
    await handler({ method: 'POST', headers: authHeaders, body: { runId: run.id, command: 'stop' } }, first);
    await handler({ method: 'POST', headers: authHeaders, body: { runId: run.id, command: 'stop' } }, retry);

    expect(retry.statusCode).toBe(200);
    expect(retry.body.replayed).toBe(true);
    expect(retry.body.envelopeId).toBe(first.body.envelopeId);
    const command = await getPendingStopCommand(run.id, owner);
    expect(command.id).toBe(first.body.envelopeId);
    const ledger = await getOperationalRun(run.id, owner);
    const acknowledged = await updateOperationalRun(run.id, owner, {
      status: 'cancelled', expectedControlCommandId: command.id,
      stopAcknowledgedAt: new Date().toISOString(),
      stopCommand: { ...ledger.stopCommand, acknowledged: true, dispatchState: 'acknowledged' },
    });
    expect(acknowledged.status).toBe('cancelled');
    expect(acknowledged.stopCommand.id).toBe(first.body.envelopeId);
  });

  it('coalesces concurrent authorized stops to one stable command id', async () => {
    const run = await active('concurrent-stop-request');
    const responses = [res(), res(), res(), res()];
    await Promise.all(responses.map(response => handler({ method: 'POST', headers: authHeaders, body: { runId: run.id, command: 'stop' } }, response)));
    expect(responses.every(response => response.statusCode === 200)).toBe(true);
    expect(new Set(responses.map(response => response.body.envelopeId))).toHaveLength(1);
    expect(responses.filter(response => response.body.replayed === false)).toHaveLength(1);
    const command = await getPendingStopCommand(run.id, owner);
    expect(command.id).toBe(responses[0].body.envelopeId);
  });

  it('does not resurrect terminal runs', async () => {
    const run = await active('terminal-request');
    await updateOperationalRun(run.id, owner, { status: 'completed' });
    const response = res();
    await handler({ method: 'POST', headers: authHeaders, body: { runId: run.id, command: 'stop' } }, response);
    expect(response.statusCode).toBe(409);
  });

  it('leaves the run active when the Redis CAS reservation fails', async () => {
    const run = await active('redis-reservation-failure');
    setOperationalRunStoreForTests({
      get: async () => run,
      eval: async () => { throw new Error('simulated redis write failure'); },
    });
    const response = res();
    await handler({ method: 'POST', headers: authHeaders, body: { runId: run.id, command: 'stop' } }, response);
    expect(response.statusCode).toBe(500);
    expect((await getOperationalRun(run.id, owner)).status).toBe('running');
  });
});
