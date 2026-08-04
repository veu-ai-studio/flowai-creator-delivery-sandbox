import { afterEach, describe, expect, it } from 'vitest';
import { requireAuthHard } from '../../api/_lib/auth.js';

const originalServiceKey = process.env.FLOWAI_SERVICE_KEY;

afterEach(() => {
  if (originalServiceKey === undefined) delete process.env.FLOWAI_SERVICE_KEY;
  else process.env.FLOWAI_SERVICE_KEY = originalServiceKey;
});

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('hard-auth service principal contract', () => {
  it('accepts a valid service key only with explicit org and user identity', async () => {
    process.env.FLOWAI_SERVICE_KEY = 'service-contract-secret';
    const res = makeRes();
    const req = { headers: {
      'x-flowai-service-key': 'service-contract-secret',
      'x-flowai-org-id': 'org_service',
      'x-flowai-user-id': 'service:inngest',
    } };
    const ctx = await requireAuthHard(req, res);

    expect(ctx).toMatchObject({
      authenticated: true,
      authMode: 'service',
      orgId: 'org_service',
      userId: 'service:inngest',
    });
    expect(req.flowaiAuthContext).toMatchObject({ orgId: 'org_service', userId: 'service:inngest' });
    expect(Object.getOwnPropertyDescriptor(req, 'flowaiAuthContext')).toMatchObject({
      configurable: false,
      writable: false,
      enumerable: false,
    });
    expect(res.statusCode).toBe(200);
  });

  it('rejects a service key that omits the service principal user id', async () => {
    process.env.FLOWAI_SERVICE_KEY = 'service-contract-secret';
    const res = makeRes();
    const ctx = await requireAuthHard({ headers: {
      'x-flowai-service-key': 'service-contract-secret',
      'x-flowai-org-id': 'org_service',
    } }, res);

    expect(ctx).toBeNull();
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Active tenant membership required');
  });
});
