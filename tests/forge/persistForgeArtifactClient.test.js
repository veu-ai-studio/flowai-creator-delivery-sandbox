import { describe, expect, it, vi } from 'vitest';

import {
  normalizePersistenceResult,
  persistForgeStepArtifactClient,
  persistenceDisplayText,
} from '../../src/lib/forge/persistForgeArtifactClient.js';

describe('persistForgeStepArtifactClient', () => {
  it('posts forge artifacts with ambient credentials and Tier B offline proof labels', async () => {
    const fetchImpl = vi.fn(async () => ({
      status: 200,
      json: async () => ({
        ok: true,
        persisted: true,
        state: 'persisted',
        version: 2,
      }),
    }));

    const result = await persistForgeStepArtifactClient({
      productId: 'product-a',
      runId: 'run-1',
      stepKey: 'research',
      artifact: { complete: true },
      fetchImpl,
    });

    expect(result).toMatchObject({ ok: true, persisted: true, state: 'persisted', version: 2 });
    expect(fetchImpl).toHaveBeenCalledWith('/api/forge-artifact', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }));
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({
      productId: 'product-a',
      runId: 'run-1',
      stepKey: 'research',
      mode: 'GUIDED',
      runtime: 'offline',
      evidenceTier: 'B',
      proofLabel: 'UNIT',
    });
  });

  it('marks unauthenticated endpoint calls as skipped_auth_required', async () => {
    const fetchImpl = vi.fn(async () => ({
      status: 401,
      json: async () => ({ error: 'Authentication required' }),
    }));

    await expect(persistForgeStepArtifactClient({
      productId: 'product-a',
      stepKey: 'research',
      artifact: {},
      fetchImpl,
    })).resolves.toMatchObject({
      ok: false,
      persisted: false,
      state: 'skipped_auth_required',
    });
  });

  it('normalizes failed writes to persisted: failed display state', () => {
    const normalized = normalizePersistenceResult({
      ok: false,
      persisted: false,
      state: 'failed',
      reason: 'version_insert_failed:forced',
    });

    expect(normalized).toMatchObject({
      ok: false,
      persisted: false,
      state: 'failed',
      reason: 'version_insert_failed:forced',
    });
    expect(persistenceDisplayText(normalized)).toBe('persisted: failed');
  });

  it('does not call the endpoint when no productId exists', async () => {
    const fetchImpl = vi.fn();
    const result = await persistForgeStepArtifactClient({
      productId: null,
      stepKey: 'research',
      artifact: {},
      fetchImpl,
    });

    expect(result).toMatchObject({ state: 'skipped_no_product' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
