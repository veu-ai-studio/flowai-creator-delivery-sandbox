import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/_lib/auth.js', () => ({
  requireAuthHard: vi.fn(),
}));

import handler from '../api/tool-dispatch.js';
import { requireAuthHard } from '../api/_lib/auth.js';

function makeRes() {
  const headers = {};
  let statusCode = 200;
  let body = null;
  return {
    setHeader: vi.fn((k, v) => { headers[k] = v; }),
    status: vi.fn(function (code) { statusCode = code; return this; }),
    json: vi.fn(function (data) { body = data; return this; }),
    end: vi.fn(function () { return this; }),
    _get: () => ({ headers, statusCode, body }),
  };
}

describe('POST /api/tool-dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BROWSERLESS_API_KEY = 'browser-secret';
    process.env.ANTHROPIC_API_KEY = 'anthropic-secret';
  });

  it('rejects unauthenticated requests before dispatch validation', async () => {
    requireAuthHard.mockImplementationOnce(async (_req, res) => {
      res.status(401).json({ error: 'Authentication required', authMode: 'anonymous' });
      return null;
    });

    const res = makeRes();
    await handler({ method: 'POST', headers: {}, body: {} }, res);

    expect(res._get().statusCode).toBe(401);
    expect(res._get().body.error).toBe('Authentication required');
  });

  it('rejects cross-site cookie-style state-changing requests', async () => {
    requireAuthHard.mockResolvedValueOnce({
      authenticated: true,
      authMode: 'clerk',
      userId: 'operator-1',
    });

    const res = makeRes();
    await handler({
      method: 'POST',
      headers: {
        host: 'flowai.example',
        origin: 'https://evil.example',
      },
      body: { intent: 'resolve', action: 'crawl', selectedTool: { platform_name: 'Browserless' } },
    }, res);

    expect(res._get().statusCode).toBe(403);
    expect(res._get().body.error).toBe('CSRF protection failed');
  });

  it('returns redacted eligibility for same-site requests', async () => {
    requireAuthHard.mockResolvedValueOnce({
      authenticated: true,
      authMode: 'clerk',
      userId: 'operator-1',
    });

    const res = makeRes();
    await handler({
      method: 'POST',
      headers: {
        host: 'flowai.example',
        origin: 'https://flowai.example',
      },
      body: {
        intent: 'resolve',
        mode: 'AUTO',
        operatorEnabledAuto: true,
        action: 'crawl',
        selectedTool: { platform_name: 'Browserless' },
      },
    }, res);

    const text = JSON.stringify(res._get().body);
    expect(res._get().statusCode).toBe(200);
    expect(res._get().body.eligibility.state).toBe('callable');
    expect(text).not.toContain('browser-secret');
    expect(text).not.toContain('anthropic-secret');
  });

  it('creates and approves GUIDED server-side approval state', async () => {
    requireAuthHard.mockResolvedValue({
      authenticated: true,
      authMode: 'clerk',
      userId: 'operator-1',
    });
    const headers = { host: 'flowai.example', origin: 'https://flowai.example' };

    const pendingRes = makeRes();
    await handler({
      method: 'POST',
      headers,
      body: {
        intent: 'pending_approval',
        mode: 'GUIDED',
        action: 'crawl',
        selectedTool: { platform_name: 'Browserless' },
        runId: 'run-1',
      },
    }, pendingRes);

    const approvalId = pendingRes._get().body.approval.id;
    expect(pendingRes._get().body.approval.status).toBe('pending');

    const approveRes = makeRes();
    await handler({
      method: 'POST',
      headers,
      body: { intent: 'approve', approvalId },
    }, approveRes);

    expect(approveRes._get().body.approval.status).toBe('approved');
    expect(JSON.stringify(approveRes._get().body)).not.toContain('browser-secret');
  });
});
