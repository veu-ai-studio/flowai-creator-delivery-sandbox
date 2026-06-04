import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/_lib/auth.js', () => ({
  requireAuthHard: vi.fn(),
}));

vi.mock('../api/_lib/supabase.js', () => ({
  getSupabase: vi.fn(),
}));

vi.mock('../src/lib/forge/productSsotArtifactWriter.js', () => ({
  persistForgeStepArtifact: vi.fn(),
}));

import handler from '../api/forge-artifact.js';
import { requireAuthHard } from '../api/_lib/auth.js';
import { getSupabase } from '../api/_lib/supabase.js';
import { persistForgeStepArtifact } from '../src/lib/forge/productSsotArtifactWriter.js';

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

describe('POST /api/forge-artifact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabase.mockReturnValue({ from: vi.fn() });
    persistForgeStepArtifact.mockResolvedValue({
      ok: true,
      persisted: true,
      state: 'persisted',
      version: 2,
      versionId: 'version-2',
      snapshotHash: 'abc',
      prevHash: 'prev',
    });
  });

  it('rejects unauthenticated requests before validating or writing', async () => {
    requireAuthHard.mockImplementationOnce(async (_req, res) => {
      res.status(401).json({ error: 'Authentication required', authMode: 'anonymous' });
      return null;
    });

    const req = { method: 'POST', headers: {}, body: {} };
    const res = makeRes();
    await handler(req, res);

    expect(res._get().statusCode).toBe(401);
    expect(persistForgeStepArtifact).not.toHaveBeenCalled();
  });

  it('persists an authenticated forge artifact through the ProductSSOT writer', async () => {
    requireAuthHard.mockResolvedValueOnce({
      authenticated: true,
      authMode: 'clerk',
      userId: 'operator-1',
    });

    const req = {
      method: 'POST',
      headers: {},
      body: {
        productId: 'product-a',
        environment: 'prd',
        runId: 'run-1',
        stepKey: 'research',
        artifact: { summary: 'done' },
      },
    };
    const res = makeRes();
    await handler(req, res);

    expect(persistForgeStepArtifact).toHaveBeenCalledWith(expect.objectContaining({
      productId: 'product-a',
      environment: 'prd',
      runId: 'run-1',
      stepKey: 'research',
      artifact: { summary: 'done' },
      mode: 'GUIDED',
      runtime: 'offline',
      evidenceTier: 'B',
      proofLabel: 'UNIT',
      writtenBy: 'operator-1',
    }));
    expect(res._get()).toMatchObject({
      statusCode: 200,
      body: {
        ok: true,
        persisted: true,
        state: 'persisted',
        version: 2,
      },
    });
  });

  it('returns failed persistence state without pretending completion', async () => {
    requireAuthHard.mockResolvedValueOnce({
      authenticated: true,
      authMode: 'clerk',
      userId: 'operator-1',
    });
    persistForgeStepArtifact.mockResolvedValueOnce({
      ok: false,
      persisted: false,
      state: 'failed',
      reason: 'version_insert_failed:forced',
    });

    const req = {
      method: 'POST',
      headers: {},
      body: { productId: 'product-a', stepKey: 'research', artifact: {} },
    };
    const res = makeRes();
    await handler(req, res);

    expect(res._get()).toMatchObject({
      statusCode: 200,
      body: {
        ok: false,
        persisted: false,
        state: 'failed',
        reason: 'version_insert_failed:forced',
      },
    });
  });

  it('handles OPTIONS and non-POST methods', async () => {
    const optionsRes = makeRes();
    await handler({ method: 'OPTIONS', headers: {}, body: {} }, optionsRes);
    expect(optionsRes._get().statusCode).toBe(204);

    const getRes = makeRes();
    await handler({ method: 'GET', headers: {}, body: {} }, getRes);
    expect(getRes._get().statusCode).toBe(405);
  });
});
