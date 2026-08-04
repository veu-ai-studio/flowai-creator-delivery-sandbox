import { beforeEach, describe, expect, it, vi } from 'vitest';

const logs = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../api/_lib/logger.js', () => ({ logger: logs }));

import { withRequestLog } from '../../api/_lib/requestLog.js';

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

describe('request log tenant attribution', () => {
  beforeEach(() => vi.clearAllMocks());

  it('logs no caller-supplied tenant before auth and verified tenant after auth', async () => {
    const wrapped = withRequestLog(async (req, res) => {
      Object.defineProperty(req, 'flowaiAuthContext', {
        value: Object.freeze({
          authenticated: true,
          authMode: 'clerk',
          orgId: 'org_verified',
          productId: 'prod_verified',
          userId: 'user_verified',
        }),
        writable: false,
        configurable: false,
      });
      return res.status(200).json({ run_id: 'run_verified', cost_usd: 1.25 });
    }, { endpoint: '/api/test' });

    await wrapped({
      method: 'POST',
      headers: { 'x-flowai-org-id': 'org_header_forged' },
      body: { org_id: 'org_body_forged' },
    }, makeRes());

    expect(logs.debug).toHaveBeenCalledWith('request.received', expect.objectContaining({
      orgId: null,
      productId: null,
    }));
    expect(logs.info).toHaveBeenCalledWith('request.completed', expect.objectContaining({
      orgId: 'org_verified',
      productId: 'prod_verified',
      userId: 'user_verified',
      authMode: 'clerk',
      runId: 'run_verified',
      costUSD: 1.25,
    }));
    expect(JSON.stringify(logs.info.mock.calls)).not.toContain('org_header_forged');
    expect(JSON.stringify(logs.info.mock.calls)).not.toContain('org_body_forged');
  });

  it('logs anonymous failures with null tenant attribution', async () => {
    const wrapped = withRequestLog(async (_req, res) => (
      res.status(401).json({ error: 'Authentication required' })
    ), { endpoint: '/api/test' });

    await wrapped({
      method: 'GET',
      headers: { 'x-flowai-org-id': 'org_header_forged' },
    }, makeRes());

    expect(logs.warn).toHaveBeenCalledWith('request.completed', expect.objectContaining({
      status: 401,
      orgId: null,
      productId: null,
      userId: null,
      authMode: 'anonymous',
    }));
  });
});
