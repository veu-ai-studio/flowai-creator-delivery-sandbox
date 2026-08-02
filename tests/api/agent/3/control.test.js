import { beforeEach, describe, expect, it } from 'vitest';
import handler from '../../../../api/agent/3/control.js';
import { createOperationalRun, getOperationalRun, resetOperationalRunsForTests, updateOperationalRun } from '../../../../api/_lib/operationalRuns.js';
import { readAndClearCommand, resetForTests } from '../../../../api/_lib/runControlBus.js';

const owner = { orgId: 'org_test', userId: 'user_test' };
const authHeaders = { 'x-flowai-service-key': 'service-test', 'x-flowai-org-id': owner.orgId, 'x-flowai-user-id': owner.userId };
function res() { return { statusCode: 200, body: null, headers: {}, setHeader(k,v){this.headers[k]=v;}, status(c){this.statusCode=c;return this;}, json(v){this.body=v;return this;} }; }
async function active(idem) {
  const { run } = await createOperationalRun({ ...owner, idempotency: idem, input: { mode: 'auto' } });
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

  it('reserves a unique stop id before dispatch and exposes cancelling', async () => {
    const run = await active('stop-owned-request');
    const response = res();
    await handler({ method: 'POST', headers: authHeaders, body: { runId: run.id, command: 'stop' } }, response);
    expect(response.statusCode).toBe(200);
    const command = await readAndClearCommand(run.id);
    const ledger = await getOperationalRun(run.id, owner);
    expect(ledger.status).toBe('cancelling');
    expect(command.id).toBe(ledger.stopCommand.id);
    expect(ledger.stopCommand.acknowledged).toBe(false);
  });

  it('does not resurrect terminal runs', async () => {
    const run = await active('terminal-request');
    await updateOperationalRun(run.id, owner, { status: 'completed' });
    const response = res();
    await handler({ method: 'POST', headers: authHeaders, body: { runId: run.id, command: 'stop' } }, response);
    expect(response.statusCode).toBe(409);
  });
});
