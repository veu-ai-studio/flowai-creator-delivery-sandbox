import { describe, expect, it, vi } from 'vitest';
import { cancelLegacyAutoSession, quiesceLegacyAutoSessionExecution } from '../../src/lib/legacyAutoSession.js';
import fs from 'node:fs';

describe('legacy AutoSession durable cancellation', () => {
  it('quiesces the writable session before an asynchronous cancellation can resolve', async () => {
    let resolveCancellation;
    const cancellationPending = new Promise(resolve => { resolveCancellation = resolve; });
    const sessionDbIdRef = { current: 'legacy-1' };
    const isPausedRef = { current: false };
    const timerRef = { current: 42 };
    const clearTimer = vi.fn();
    const update = vi.fn();

    const sessionId = quiesceLegacyAutoSessionExecution({
      sessionDbIdRef, isPausedRef, timerRef, clearTimer,
    });
    const cancellation = cancellationPending.then(() => sessionId);

    if (sessionDbIdRef.current) await update(sessionDbIdRef.current, { overall_status: 'running' });
    expect(sessionId).toBe('legacy-1');
    expect(isPausedRef.current).toBe(true);
    expect(sessionDbIdRef.current).toBeNull();
    expect(clearTimer).toHaveBeenCalledWith(42);
    expect(update).not.toHaveBeenCalled();

    resolveCancellation();
    await expect(cancellation).resolves.toBe('legacy-1');
  });

  it('wires Abort with the active session evidence for preservation', () => {
    const source = fs.readFileSync(new URL('../../src/pages/AutoRunner.jsx', import.meta.url), 'utf8');
    expect(source).toMatch(/reason:\s*'operator_abort',[\s\S]*?existingSession:\s*\{[\s\S]*?id:\s*sessionId,[\s\S]*?step_results:\s*serializeResultsForPersist\(stepResults, STEPS\)/);
    expect(source).toMatch(/quiesceLegacyAutoSessionExecution\([\s\S]*?await persistenceQueueRef\.current[\s\S]*?cancelLegacyAutoSession/);
    expect(source).not.toMatch(/base44\.entities\.AutoSession\.update\(sessionDbIdRef\.current/);
  });

  it('awaits and returns the confirmed cancellation update', async () => {
    const update = vi.fn(async (_id, patch) => ({ id: 'legacy-1', ...patch }));
    const get = vi.fn(async () => ({
      id: 'legacy-1',
      overall_status: 'failed',
      step_results: { cancellation: { disposition: 'cancelled_legacy_session', reason: 'operator_abort' } },
    }));
    const base44Client = { entities: { AutoSession: { update, get } } };
    const result = await cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'operator_abort',
    });
    expect(update).toHaveBeenCalledWith('legacy-1', expect.objectContaining({
      overall_status: 'failed',
      step_results: expect.objectContaining({
        cancellation: expect.objectContaining({ reason: 'operator_abort' }),
      }),
    }));
    expect(get).toHaveBeenCalledWith('legacy-1');
    expect(result.overall_status).toBe('failed');
  });

  it('propagates rejection so the UI can retain the retryable session prompt', async () => {
    const failure = new Error('write rejected');
    const base44Client = {
      entities: { AutoSession: { update: vi.fn(async () => { throw failure; }), get: vi.fn() } },
    };
    await expect(cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'discarded_stale_legacy_session',
    })).rejects.toBe(failure);
  });

  it('fails closed when the store does not confirm cancelled state', async () => {
    const base44Client = {
      entities: {
        AutoSession: {
          update: vi.fn(async () => undefined),
          get: vi.fn(async () => ({ id: 'legacy-1', overall_status: 'running' })),
        },
      },
    };
    await expect(cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'operator_abort',
    })).rejects.toThrow('legacy_session_cancel_unconfirmed');
  });

  it('fails closed when cancellation metadata is missing on readback', async () => {
    const base44Client = {
      entities: {
        AutoSession: {
          update: vi.fn(async () => undefined),
          get: vi.fn(async () => ({ id: 'legacy-1', overall_status: 'failed', deliverables: {} })),
        },
      },
    };
    await expect(cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'operator_abort',
    })).rejects.toThrow('legacy_session_disposition_unconfirmed');
  });

  it('confirms through filter when the deployed entity API does not expose get', async () => {
    const filter = vi.fn(async () => [{
      id: 'legacy-1',
      overall_status: 'failed',
      step_results: { cancellation: { disposition: 'cancelled_legacy_session' } },
    }]);
    const base44Client = {
      entities: { AutoSession: { update: vi.fn(async () => undefined), filter } },
    };
    const result = await cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'operator_abort',
    });
    expect(filter).toHaveBeenCalledWith({ id: 'legacy-1' }, '-updated_date', 1);
    expect(result.step_results.cancellation.disposition).toBe('cancelled_legacy_session');
  });

  it('falls back to filter when get rejects in production', async () => {
    const base44Client = {
      entities: {
        AutoSession: {
          update: vi.fn(async () => undefined),
          get: vi.fn(async () => { throw new Error('method unavailable'); }),
          filter: vi.fn(async () => [{
            id: 'legacy-1',
            overall_status: 'failed',
            step_results: { cancellation: { disposition: 'cancelled_legacy_session' } },
          }]),
        },
      },
    };
    await expect(cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'operator_abort',
    })).resolves.toMatchObject({ id: 'legacy-1', overall_status: 'failed' });
  });

  it('uses a fresher filter result when get returns a stale row', async () => {
    const base44Client = {
      entities: {
        AutoSession: {
          update: vi.fn(async () => undefined),
          get: vi.fn(async () => ({ id: 'legacy-1', overall_status: 'running' })),
          filter: vi.fn(async () => [{
            id: 'legacy-1',
            overall_status: 'failed',
            step_results: { cancellation: { disposition: 'cancelled_legacy_session' } },
          }]),
        },
      },
    };
    await expect(cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'operator_abort',
    })).resolves.toMatchObject({ id: 'legacy-1', overall_status: 'failed' });
  });

  it('preserves existing step evidence when writing the cancellation marker', async () => {
    const update = vi.fn(async () => undefined);
    const base44Client = {
      entities: {
        AutoSession: {
          update,
          get: vi.fn(async () => ({
            id: 'legacy-1',
            overall_status: 'failed',
            step_results: {
              research: { verdict: 'complete' },
              cancellation: { disposition: 'cancelled_legacy_session' },
            },
          })),
        },
      },
    };
    await cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'operator_abort',
      existingSession: { id: 'legacy-1', step_results: { research: { verdict: 'complete' } } },
    });
    expect(update).toHaveBeenCalledWith('legacy-1', expect.objectContaining({
      step_results: expect.objectContaining({ research: { verdict: 'complete' } }),
    }));
  });

  it('rejects a terminal readback for the wrong row when get is the only read path', async () => {
    const base44Client = {
      entities: {
        AutoSession: {
          update: vi.fn(async () => undefined),
          get: vi.fn(async () => ({
            id: 'legacy-2',
            overall_status: 'failed',
            step_results: { cancellation: { disposition: 'cancelled_legacy_session' } },
          })),
        },
      },
    };
    await expect(cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'operator_abort',
    })).rejects.toThrow('legacy_session_identity_unconfirmed');
  });

  it('rejects filter results that do not match the requested row', async () => {
    const base44Client = {
      entities: {
        AutoSession: {
          update: vi.fn(async () => undefined),
          filter: vi.fn(async () => [{
            id: 'legacy-2',
            overall_status: 'failed',
            step_results: { cancellation: { disposition: 'cancelled_legacy_session' } },
          }]),
        },
      },
    };
    await expect(cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'operator_abort',
    })).rejects.toThrow('legacy_session_identity_unconfirmed');
  });
});
