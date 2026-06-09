import { describe, expect, it } from 'vitest';
import handler from '../api/admin/seed.js';

function makeRes() {
  let statusCode = 200;
  let body = null;
  return {
    setHeader() {},
    status(code) { statusCode = code; return this; },
    json(data) { body = data; return this; },
    end() { return this; },
    _get: () => ({ statusCode, body }),
  };
}

describe('/api/admin/seed', () => {
  it('returns a clean 503 when the admin seed key is not configured', async () => {
    const prior = process.env.ADMIN_SEED_KEY;
    delete process.env.ADMIN_SEED_KEY;
    const res = makeRes();
    await handler({ method: 'POST', headers: {}, body: {} }, res);
    expect(res._get().statusCode).toBe(503);
    expect(res._get().body).toMatchObject({
      ok: false,
      error: 'admin_seed_unavailable',
      message: 'ADMIN_SEED_KEY not configured on the server',
    });
    if (prior === undefined) delete process.env.ADMIN_SEED_KEY;
    else process.env.ADMIN_SEED_KEY = prior;
  });
});
