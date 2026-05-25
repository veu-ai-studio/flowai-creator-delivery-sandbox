import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/operator-readiness.js';
import {
  OPERATOR_READINESS_CREDENTIALS,
  getOperatorCredentialReadiness,
} from '../src/lib/operatorCredentialReadiness.js';

function makeRes() {
  const headers = {};
  let statusCode = 200;
  let body = null;
  return {
    statusCode,
    writableEnded: false,
    headersSent: false,
    setHeader: vi.fn((k, v) => { headers[k] = v; }),
    status: vi.fn(function (code) {
      statusCode = code;
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (data) {
      body = data;
      this.writableEnded = true;
      return this;
    }),
    end: vi.fn(function () {
      this.writableEnded = true;
      return this;
    }),
    _get: () => ({ headers, statusCode, body }),
  };
}

describe('GET /api/operator-readiness', () => {
  let savedEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    for (const name of OPERATOR_READINESS_CREDENTIALS) delete process.env[name];
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('returns redacted PRESENT/MISSING status for each operator credential', async () => {
    process.env.GITHUB_OPERATOR_TOKEN = 'ghp_secret_value';
    process.env.VERCEL_ORG_ID = 'team_secret_value';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-secret';

    const req = { method: 'GET', headers: { origin: 'https://flowai.example' } };
    const res = makeRes();

    await handler(req, res);

    const out = res._get();
    expect(out.statusCode).toBe(200);
    expect(out.body).toMatchObject({
      ok: false,
      credentials: {
        GITHUB_OPERATOR_TOKEN: 'PRESENT',
        VERCEL_OPERATOR_TOKEN: 'MISSING',
        VERCEL_ORG_ID: 'PRESENT',
        VERCEL_PROJECT_ID_SAIGE: 'MISSING',
        ANTHROPIC_API_KEY: 'PRESENT',
        BROWSERLESS_API_KEY: 'MISSING',
        SUPABASE_URL: 'MISSING',
      },
      summary: { total: 7, present: 3, missing: 4 },
    });

    const serialized = JSON.stringify(out.body);
    expect(serialized).not.toContain('ghp_secret_value');
    expect(serialized).not.toContain('team_secret_value');
    expect(serialized).not.toContain('sk-ant-secret');
    expect(out.headers['Access-Control-Allow-Origin']).toBe('https://flowai.example');
    expect(out.headers['Cache-Control']).toBe('no-store');
  });

  it('reports ok:true only when all tracked credentials are present', () => {
    const env = Object.fromEntries(OPERATOR_READINESS_CREDENTIALS.map((name) => [name, `${name}_value`]));
    const readiness = getOperatorCredentialReadiness(env);

    expect(readiness.ok).toBe(true);
    expect(new Set(Object.values(readiness.credentials))).toEqual(new Set(['PRESENT']));
    expect(JSON.stringify(readiness)).not.toContain('GITHUB_OPERATOR_TOKEN_value');
  });

  it('handles OPTIONS and rejects non-GET methods', async () => {
    const optionsRes = makeRes();
    await handler({ method: 'OPTIONS', headers: {} }, optionsRes);
    expect(optionsRes._get().statusCode).toBe(204);
    expect(optionsRes.writableEnded).toBe(true);

    const postRes = makeRes();
    await handler({ method: 'POST', headers: {} }, postRes);
    expect(postRes._get().statusCode).toBe(405);
    expect(postRes._get().body).toMatchObject({ ok: false, error: 'Use GET' });
  });
});
