import { describe, expect, it } from 'vitest';

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
