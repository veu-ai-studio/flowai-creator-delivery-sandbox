import { afterEach, describe, expect, it } from 'vitest';

import handler from '../../api/run-construction-status.js';
import {
  initializeForgeRunStatus,
  readForgeRunStatus,
  resetForgeRunStatusForTests,
} from '../../api/_lib/forgeRunStatusBus.js';

function makeRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    ended: false,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

describe('/api/run-construction-status', () => {
  afterEach(() => {
    resetForgeRunStatusForTests();
  });

  it('allows Vercel automation-bypass headers on OPTIONS preflight', async () => {
    const res = makeRes();
    await handler({
      method: 'OPTIONS',
      headers: { origin: 'https://flowai-dun.vercel.app' },
      query: {},
    }, res);

    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://flowai-dun.vercel.app');
    expect(res.headers['Access-Control-Allow-Methods']).toBe('GET, OPTIONS');
    expect(res.headers['Access-Control-Allow-Headers']).toContain('x-vercel-protection-bypass');
    expect(res.headers['Access-Control-Allow-Headers']).toContain('x-vercel-set-bypass-cookie');
    expect(res.headers['Cache-Control']).toBe('no-store, max-age=0');
  });

  it('returns a no-store status record for a queued forge run', async () => {
    await initializeForgeRunStatus({
      runId: 'status-run-1',
      url: 'https://example.com',
      mode: 'BACKGROUND',
    });
    const { record } = await readForgeRunStatus('status-run-1');
    expect(record.status).toBe('queued');

    const res = makeRes();
    await handler({
      method: 'GET',
      headers: {},
      query: { runId: 'status-run-1' },
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(res.headers['Cache-Control']).toBe('no-store, max-age=0');
    expect(res.body).toMatchObject({
      ok: true,
      run: {
        runId: 'status-run-1',
        status: 'queued',
        url: 'https://example.com',
        mode: 'BACKGROUND',
      },
    });
  });
});
