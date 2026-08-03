import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/_lib/auth.js', () => ({
  requireOperatorAuth: vi.fn(),
}));
vi.mock('../../src/lib/agents/auth/browserlessAdapter.js', () => ({
  connectBrowserless: vi.fn(),
}));

import handler from '../../api/agent/21/execute.js';
import { requireOperatorAuth } from '../../api/_lib/auth.js';
import { connectBrowserless } from '../../src/lib/agents/auth/browserlessAdapter.js';

function makeRes() {
  let statusCode = 200;
  let body = null;
  return {
    setHeader: vi.fn(),
    status: vi.fn(function status(code) { statusCode = code; return this; }),
    json: vi.fn(function json(data) { body = data; return this; }),
    get statusCode() { return statusCode; },
    get body() { return body; },
  };
}

describe('Agent 21 credentialed crawl perimeter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects anonymous requests before parsing input or connecting Browserless', async () => {
    requireOperatorAuth.mockImplementationOnce(async (_req, res) => {
      res.status(401).json({ error: 'Authentication required' });
      return null;
    });
    const res = makeRes();
    await handler({
      method: 'POST',
      headers: { 'x-product-scope': 'attacker-controlled' },
      body: '{not valid json',
    }, res);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
    expect(connectBrowserless).not.toHaveBeenCalled();
  });

  it('does not treat a caller-supplied product-scope header as authentication', async () => {
    requireOperatorAuth.mockResolvedValueOnce(null);
    const res = makeRes();
    await handler({ method: 'POST', headers: { 'x-product-scope': 'flowai' }, body: {} }, res);
    expect(requireOperatorAuth).toHaveBeenCalledOnce();
    expect(connectBrowserless).not.toHaveBeenCalled();
  });
});
