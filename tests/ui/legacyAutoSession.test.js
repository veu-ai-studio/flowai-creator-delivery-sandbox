import { describe, expect, it, vi } from 'vitest';
import { cancelLegacyAutoSession } from '../../src/lib/legacyAutoSession.js';

describe('legacy AutoSession durable cancellation', () => {
  it('awaits and returns the confirmed cancellation update', async () => {
    const update = vi.fn(async (_id, patch) => ({ id: 'legacy-1', ...patch }));
    const base44Client = { entities: { AutoSession: { update } } };
    const result = await cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'operator_abort',
    });
    expect(update).toHaveBeenCalledWith('legacy-1', expect.objectContaining({
      overall_status: 'cancelled',
      cancellation_reason: 'operator_abort',
    }));
    expect(result.overall_status).toBe('cancelled');
  });

  it('propagates rejection so the UI can retain the retryable session prompt', async () => {
    const failure = new Error('write rejected');
    const base44Client = {
      entities: { AutoSession: { update: vi.fn(async () => { throw failure; }) } },
    };
    await expect(cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'discarded_stale_legacy_session',
    })).rejects.toBe(failure);
  });

  it('fails closed when the store does not confirm cancelled state', async () => {
    const base44Client = {
      entities: { AutoSession: { update: vi.fn(async () => ({ id: 'legacy-1', overall_status: 'running' })) } },
    };
    await expect(cancelLegacyAutoSession({
      base44Client,
      sessionId: 'legacy-1',
      reason: 'operator_abort',
    })).rejects.toThrow('legacy_session_cancel_unconfirmed');
  });
});
