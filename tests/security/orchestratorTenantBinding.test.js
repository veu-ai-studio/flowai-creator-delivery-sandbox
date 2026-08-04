import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthHard: vi.fn(),
  agentRun: vi.fn(),
  createRun: vi.fn(),
  getRun: vi.fn(),
  updateRun: vi.fn(),
}));

vi.mock('../../api/_lib/auth.js', () => ({ requireAuthHard: mocks.requireAuthHard }));
vi.mock('../../api/_lib/orchestrator.js', () => ({
  agents: {
    get: vi.fn(() => ({ name: 'clone' })),
    run: mocks.agentRun,
  },
  isConfigurationMode: vi.fn(() => true),
}));
vi.mock('../../api/_lib/configRegistry.js', () => ({
  createRun: mocks.createRun,
  getRun: mocks.getRun,
  getSnapshot: vi.fn(() => null),
  updateRun: mocks.updateRun,
}));
vi.mock('../../api/_lib/inngest.js', () => ({
  isInngestEnabled: vi.fn(() => false),
  sendEvent: vi.fn(),
}));

import handler from '../../api/orchestrator/run.js';

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

describe('orchestrator verified tenant binding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthHard.mockResolvedValue({
      authenticated: true,
      authMode: 'clerk',
      orgId: 'org_verified',
      userId: 'user_verified',
    });
    mocks.createRun.mockReturnValue({ id: 'run_verified', status: 'queued' });
    mocks.agentRun.mockResolvedValue({ ok: true });
  });

  it('overwrites forged header, body, payload, and nested context org identifiers', async () => {
    const req = {
      method: 'POST',
      headers: { 'x-flowai-org-id': 'org_header_forged' },
      query: { org_id: 'org_query_forged' },
      body: {
        agent: 'clone',
        org_id: 'org_body_forged',
        sync: true,
        payload: {
          url: 'https://example.com',
          org_id: 'org_payload_forged',
          ctx: { orgId: 'org_ctx_forged' },
        },
      },
    };
    const res = makeRes();
    await handler(req, res);

    expect(mocks.createRun).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'org_verified' }));
    expect(mocks.agentRun).toHaveBeenCalledWith('clone', expect.objectContaining({ org_id: 'org_verified' }));
    expect(res.statusCode).toBe(200);
  });

  it('returns not found when a verified tenant polls another tenant run', async () => {
    mocks.getRun.mockReturnValue({
      id: 'run_other',
      org_id: 'org_other',
      status: 'completed',
      metadata: {},
    });
    const res = makeRes();
    await handler({
      method: 'GET',
      headers: { 'x-flowai-org-id': 'org_other' },
      query: { run_id: 'run_other' },
    }, res);

    expect(res.statusCode).toBe(404);
    expect(mocks.agentRun).not.toHaveBeenCalled();
  });
});
