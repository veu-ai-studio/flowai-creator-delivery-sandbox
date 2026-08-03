import { describe, expect, it, vi } from 'vitest';
import { cancelLegacyAutoSession } from '../../src/lib/legacyAutoSession.js';

describe('legacy AutoSession durable cancellation', () => {
  it('awaits and returns the confirmed cancellation update', async () => {
    const update = vi.fn(async (_id, patch) => ({ id: 'legacy-1', ...patch }));
    const get = vi.fn(async () => ({
      id: 'legacy-1',
      overall_status: 'failed',
      deliverables: { disposition: 'cancelled_legacy_session', cancellation_reason: 'operator_abort' },
    }));
    const base44Client = { entities: { AutoSession: { update, get } } };
    const result = await cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'operator_abort',
    });
    expect(update).toHaveBeenCalledWith('legacy-1', expect.objectContaining({
      overall_status: 'failed',
      deliverables: expect.objectContaining({ cancellation_reason: 'operator_abort' }),
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
      deliverables: { disposition: 'cancelled_legacy_session' },
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
    expect(result.deliverables.disposition).toBe('cancelled_legacy_session');
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
            deliverables: { disposition: 'cancelled_legacy_session' },
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
            deliverables: { disposition: 'cancelled_legacy_session' },
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
});
