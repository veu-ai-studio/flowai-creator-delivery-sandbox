import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('/api/inngest serve handler', () => {
  it('uses a res-writing handler instead of returning a Lambda response object', async () => {
    process.env.INNGEST_EVENT_KEY = 'test-event-key';
    process.env.INNGEST_SIGNING_KEY = 'signkey-test-signing-key';
    process.env.INNGEST_BACKEND = 'inngest';

    const { getServeHandler } = await import('../../api/_lib/inngest.js');
    const handler = await getServeHandler();

    const req = {
      method: 'GET',
      url: '/api/inngest',
      originalUrl: '/api/inngest',
      protocol: 'https',
      headers: {
        host: 'flowai-dun.vercel.app',
        accept: 'application/json',
      },
      query: {},
      body: undefined,
    };

    const res = {
      headers: {},
      _statusCode: null,
      body: undefined,
      ended: false,
      setHeader(name, value) {
        this.headers[name] = value;
      },
      status(code) {
        this._statusCode = code;
        return this;
      },
      send(body) {
        this.body = body;
        this.ended = true;
        return 'res-send-result';
      },
      write(chunk) {
        this.body = `${this.body ?? ''}${chunk}`;
      },
      end() {
        this.ended = true;
      },
      destroy(error) {
        throw error;
      },
    };

    const result = await handler(req, res);

    expect(res.ended).toBe(true);
    expect(res._statusCode).toBeTypeOf('number');
    expect(result).toBe('res-send-result');
    expect(result).not.toHaveProperty('statusCode');
    expect(result).not.toHaveProperty('body');
  });
});

describe('Inngest registration sync', () => {
  it('uses the Inngest REST sync API when INNGEST_API_KEY is configured', async () => {
    process.env.INNGEST_EVENT_KEY = 'test-event-key';
    process.env.INNGEST_SIGNING_KEY = 'signkey-test-signing-key';
    process.env.INNGEST_API_KEY = 'test-api-key';
    process.env.INNGEST_BACKEND = 'inngest';
    process.env.VERCEL_URL = 'flowai-test.vercel.app';

    const { syncInngestRegistration, __internals } = await import('../../api/_lib/inngest.js');
    __internals.resetSyncForTests();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 'sync-1', status: 'created' }),
    }));

    const result = await syncInngestRegistration({ fetchImpl, force: true });

    expect(result).toMatchObject({
      ok: true,
      status: 201,
      deploymentUrl: 'https://flowai-test.vercel.app',
      serveUrl: 'https://flowai-test.vercel.app/api/inngest',
      method: 'inngest_api',
      body: { id: 'sync-1', status: 'created' },
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.inngest.com/v2/apps/flowai/syncs', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Accept: 'application/json',
        Authorization: 'Bearer test-api-key',
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ url: 'https://flowai-test.vercel.app/api/inngest' }),
    }));
  });

  it('falls back to PUTing the deployed /api/inngest endpoint without an API key', async () => {
    process.env.INNGEST_EVENT_KEY = 'test-event-key';
    process.env.INNGEST_SIGNING_KEY = 'signkey-test-signing-key';
    delete process.env.INNGEST_API_KEY;
    process.env.INNGEST_BACKEND = 'inngest';
    process.env.VERCEL_URL = 'flowai-test.vercel.app';
    process.env.FLOWAI_INTERNAL_SECRET = 'cron-secret';

    const { syncInngestRegistration, __internals } = await import('../../api/_lib/inngest.js');
    __internals.resetSyncForTests();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ message: 'Successfully registered', modified: true }),
    }));

    const result = await syncInngestRegistration({ fetchImpl, force: true });

    expect(result).toMatchObject({
      ok: true,
      status: 200,
      deploymentUrl: 'https://flowai-test.vercel.app',
      serveUrl: 'https://flowai-test.vercel.app/api/inngest',
      method: 'serve_endpoint_put',
      body: { message: 'Successfully registered', modified: true },
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://flowai-test.vercel.app/api/inngest', expect.objectContaining({
      method: 'PUT',
      headers: { Accept: 'application/json' },
    }));
  });

  it('returns disabled when Inngest credentials are not configured', async () => {
    delete process.env.INNGEST_EVENT_KEY;
    delete process.env.INNGEST_SIGNING_KEY;
    delete process.env.INNGEST_API_KEY;
    process.env.INNGEST_BACKEND = 'inngest';

    const { syncInngestRegistration, __internals } = await import('../../api/_lib/inngest.js');
    __internals.resetSyncForTests();
    const fetchImpl = vi.fn();

    const result = await syncInngestRegistration({ fetchImpl, force: true });

    expect(result).toMatchObject({
      ok: false,
      enabled: false,
      reason: 'inngest disabled',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('/api/cron/inngest-sync', () => {
  it('runs the registration sync and returns its status', async () => {
    process.env.INNGEST_EVENT_KEY = 'test-event-key';
    process.env.INNGEST_SIGNING_KEY = 'signkey-test-signing-key';
    delete process.env.INNGEST_API_KEY;
    process.env.INNGEST_BACKEND = 'inngest';
    process.env.VERCEL_URL = 'flowai-test.vercel.app';
    process.env.FLOWAI_INTERNAL_SECRET = 'cron-secret';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ message: 'Successfully registered', modified: false }),
    });
    const { __internals } = await import('../../api/_lib/inngest.js');
    __internals.resetSyncForTests();
    const { default: handler } = await import('../../api/cron/inngest-sync.js');

    const res = {
      statusCode: null,
      body: null,
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await handler({
      method: 'GET',
      headers: {
        'x-vercel-cron': '1',
        authorization: 'Bearer cron-secret',
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      inngestReady: true,
      status: 200,
      method: 'serve_endpoint_put',
      modified: false,
      atRisk: false,
    });
    expect(fetchSpy).toHaveBeenCalledWith('https://flowai-test.vercel.app/api/inngest', expect.objectContaining({
      method: 'PUT',
    }));
    fetchSpy.mockRestore();
  });

  it('reports cron sync failures as at-risk without returning a false acceptance status', async () => {
    process.env.INNGEST_EVENT_KEY = 'test-event-key';
    process.env.INNGEST_SIGNING_KEY = 'signkey-test-signing-key';
    delete process.env.INNGEST_API_KEY;
    process.env.INNGEST_BACKEND = 'inngest';
    process.env.VERCEL_URL = 'flowai-test.vercel.app';
    process.env.FLOWAI_INTERNAL_SECRET = 'cron-secret';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: 'sync failed' }),
    });
    const { __internals } = await import('../../api/_lib/inngest.js');
    __internals.resetSyncForTests();
    const { default: handler } = await import('../../api/cron/inngest-sync.js');

    const res = {
      statusCode: null,
      body: null,
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await handler({
      method: 'GET',
      headers: {
        'x-vercel-cron': '1',
        authorization: 'Bearer cron-secret',
      },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      ok: false,
      inngestReady: true,
      status: 500,
      method: 'serve_endpoint_put',
      reason: 'inngest sync returned HTTP 500 via serve_endpoint_put',
      atRisk: true,
    });
    expect(fetchSpy).toHaveBeenCalledWith('https://flowai-test.vercel.app/api/inngest', expect.objectContaining({
      method: 'PUT',
    }));
    fetchSpy.mockRestore();
  });

  it('rejects unauthenticated calls without running registration sync', async () => {
    process.env.INNGEST_EVENT_KEY = 'test-event-key';
    process.env.INNGEST_SIGNING_KEY = 'signkey-test-signing-key';
    delete process.env.INNGEST_API_KEY;
    process.env.INNGEST_BACKEND = 'inngest';
    process.env.VERCEL_URL = 'flowai-test.vercel.app';
    process.env.FLOWAI_INTERNAL_SECRET = 'cron-secret';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ message: 'should not run' }),
    });
    const { __internals } = await import('../../api/_lib/inngest.js');
    __internals.resetSyncForTests();
    const { default: handler } = await import('../../api/cron/inngest-sync.js');

    const res = {
      statusCode: null,
      body: null,
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await handler({ method: 'GET', headers: {} }, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({
      ok: false,
      error: 'unauthorized',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
