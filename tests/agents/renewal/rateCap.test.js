// tests/agents/renewal/rateCap.test.js
//
// Test surface for src/lib/agents/renewal/rateCap.js (Self-Renewal
// Module 9 — daily rate cap + runaway detector).
//
// All tests inject a MOCK Supabase client. The mock records every
// .from()/.select()/.eq()/.maybeSingle()/.update() call so assertions
// can verify the right table, the right product_id filter, and the
// right write payload landed.

import { describe, it, expect, vi } from 'vitest';
import {
  checkRateCap,
  checkRunawayDetector,
  __internals,
} from '../../../src/lib/agents/renewal/rateCap.js';

const PRODUCT_ID = 'mypreglife';

// Fixed clock so window-arithmetic tests are deterministic.
const NOW = new Date('2026-05-17T12:00:00.000Z');
const HOURS_AGO = (h) => new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();

// ── Mock Supabase client ─────────────────────────────────────────────────────
//
// The renewal module uses two read shapes and one write shape:
//
//   reads:   supabase.from(table).select(col).eq('product_id', id).maybeSingle()
//             → returns { data, error }
//   writes:  supabase.from(table).update(payload).eq('product_id', id)
//             → returns { data, error }
//
// We model each `from(table)` as a builder that resolves to whatever the
// scenario dictates. Each call is recorded in `client.calls` so tests can
// assert the orchestration was correct.

function makeMockSupabase({ productSsot = null, productRegistry = null,
                            ssotErr = null, registryErr = null,
                            updateRegistryErr = null, updateSsotErr = null } = {}) {
  const calls = [];

  function builder(table, op, payload) {
    // Capture the eq() filter when applied; final resolution happens on
    // maybeSingle() (reads) or directly on eq() (writes), so we return
    // a chain that can satisfy either shape.
    const state = { table, op, payload, filter: null };
    const chain = {
      eq(col, val) {
        state.filter = { col, val };
        if (op === 'update') {
          calls.push({ table, op, payload, filter: state.filter });
          if (table === 'product_registry') return { error: updateRegistryErr };
          if (table === 'product_ssot') return { error: updateSsotErr };
          return { error: null };
        }
        return chain;  // for reads, continue to maybeSingle()
      },
      maybeSingle() {
        calls.push({ table, op, payload, filter: state.filter });
        if (table === 'product_ssot') {
          if (ssotErr) return { data: null, error: ssotErr };
          return { data: productSsot, error: null };
        }
        if (table === 'product_registry') {
          if (registryErr) return { data: null, error: registryErr };
          return { data: productRegistry, error: null };
        }
        return { data: null, error: null };
      },
    };
    return chain;
  }

  const client = {
    calls,
    from(table) {
      return {
        select(col) {
          return builder(table, 'select', col);
        },
        update(payload) {
          return builder(table, 'update', payload);
        },
      };
    },
  };
  return client;
}

// ── checkRateCap — under limit ───────────────────────────────────────────────

describe('checkRateCap — under limit', () => {
  it('returns { allowed: true, runsInWindow: 0, cap } when no events exist', async () => {
    const supabase = makeMockSupabase({ productSsot: { governance_record: [] } });
    const result = await checkRateCap({ productId: PRODUCT_ID, maxPerDay: 3, supabase, now: NOW });
    expect(result).toEqual({ allowed: true, runsInWindow: 0, cap: 3 });
  });

  it('returns allowed when product_ssot row does not exist (null)', async () => {
    const supabase = makeMockSupabase({ productSsot: null });
    const result = await checkRateCap({ productId: PRODUCT_ID, maxPerDay: 1, supabase, now: NOW });
    expect(result.allowed).toBe(true);
    expect(result.runsInWindow).toBe(0);
  });

  it('counts only self_renewal.* events within the 24h window', async () => {
    const supabase = makeMockSupabase({
      productSsot: {
        governance_record: [
          { kind: 'self_renewal.run_started.v1', at: HOURS_AGO(2) },   // in
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(23) },  // in
          { kind: 'self_renewal.run_started.v1', at: HOURS_AGO(48) },  // out (>24h)
          { kind: 'gtm.review.v1',               at: HOURS_AGO(1) },   // out (wrong prefix)
          { kind: 'self_renewal.run_started.v1', at: 'malformed-ts' }, // out (bad ts)
        ],
      },
    });
    const result = await checkRateCap({ productId: PRODUCT_ID, maxPerDay: 5, supabase, now: NOW });
    expect(result.allowed).toBe(true);
    expect(result.runsInWindow).toBe(2);
  });

  it('queries the right table + filter', async () => {
    const supabase = makeMockSupabase({ productSsot: { governance_record: [] } });
    await checkRateCap({ productId: PRODUCT_ID, maxPerDay: 1, supabase, now: NOW });
    expect(supabase.calls).toEqual([
      { table: 'product_ssot', op: 'select', payload: 'governance_record',
        filter: { col: 'product_id', val: PRODUCT_ID } },
    ]);
  });
});

// ── checkRateCap — at / over limit ───────────────────────────────────────────

describe('checkRateCap — at and over limit', () => {
  it('throws SELF_RENEWAL_RATE_LIMIT when count === cap (at limit)', async () => {
    const supabase = makeMockSupabase({
      productSsot: {
        governance_record: [
          { kind: 'self_renewal.run_started.v1', at: HOURS_AGO(3) },
          { kind: 'self_renewal.run_started.v1', at: HOURS_AGO(10) },
        ],
      },
    });
    try {
      await checkRateCap({ productId: PRODUCT_ID, maxPerDay: 2, supabase, now: NOW });
      expect.unreachable('should have thrown SELF_RENEWAL_RATE_LIMIT');
    } catch (e) {
      expect(e.code).toBe('SELF_RENEWAL_RATE_LIMIT');
      expect(e.cap).toBe(2);
      expect(e.runsInWindow).toBe(2);
      expect(e.productId).toBe(PRODUCT_ID);
      expect(e.windowStart).toBeInstanceOf(Date);
      expect(e.nextEligibleAt).toBeInstanceOf(Date);
    }
  });

  it('throws SELF_RENEWAL_RATE_LIMIT when count > cap (over limit)', async () => {
    const supabase = makeMockSupabase({
      productSsot: {
        governance_record: [
          { kind: 'self_renewal.run_started.v1', at: HOURS_AGO(1) },
          { kind: 'self_renewal.run_started.v1', at: HOURS_AGO(8) },
          { kind: 'self_renewal.run_started.v1', at: HOURS_AGO(15) },
          { kind: 'self_renewal.run_started.v1', at: HOURS_AGO(20) },
        ],
      },
    });
    try {
      await checkRateCap({ productId: PRODUCT_ID, maxPerDay: 1, supabase, now: NOW });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('SELF_RENEWAL_RATE_LIMIT');
      expect(e.cap).toBe(1);
      expect(e.runsInWindow).toBe(4);
    }
  });

  it('nextEligibleAt = oldest in-window run + 24h', async () => {
    const supabase = makeMockSupabase({
      productSsot: {
        governance_record: [
          { kind: 'self_renewal.run_started.v1', at: HOURS_AGO(2) },
          { kind: 'self_renewal.run_started.v1', at: HOURS_AGO(20) },  // oldest in window
        ],
      },
    });
    try {
      await checkRateCap({ productId: PRODUCT_ID, maxPerDay: 1, supabase, now: NOW });
      expect.unreachable('should have thrown');
    } catch (e) {
      const oldestAt = new Date(HOURS_AGO(20));
      const expected = new Date(oldestAt.getTime() + 24 * 60 * 60 * 1000);
      expect(e.nextEligibleAt.getTime()).toBe(expected.getTime());
    }
  });

  it('windowStart = now - 24h', async () => {
    const supabase = makeMockSupabase({
      productSsot: {
        governance_record: [{ kind: 'self_renewal.run_started.v1', at: HOURS_AGO(1) }],
      },
    });
    try {
      await checkRateCap({ productId: PRODUCT_ID, maxPerDay: 1, supabase, now: NOW });
      expect.unreachable('should have thrown');
    } catch (e) {
      const expected = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
      expect(e.windowStart.getTime()).toBe(expected.getTime());
    }
  });
});

// ── checkRateCap — bad input + query failure ────────────────────────────────

describe('checkRateCap — input validation + query failure', () => {
  it('throws on missing productId', async () => {
    const supabase = makeMockSupabase();
    await expect(checkRateCap({ maxPerDay: 1, supabase })).rejects.toThrow(/productId must be/);
  });

  it('throws on non-positive maxPerDay', async () => {
    const supabase = makeMockSupabase();
    await expect(checkRateCap({ productId: PRODUCT_ID, maxPerDay: 0, supabase }))
      .rejects.toThrow(/maxPerDay must be a positive integer/);
    await expect(checkRateCap({ productId: PRODUCT_ID, maxPerDay: 1.5, supabase }))
      .rejects.toThrow(/maxPerDay must be a positive integer/);
  });

  it('throws on missing supabase client', async () => {
    await expect(checkRateCap({ productId: PRODUCT_ID, maxPerDay: 1 }))
      .rejects.toThrow(/supabase client missing/);
  });

  it('wraps Supabase query errors as RATE_CAP_QUERY_FAILED', async () => {
    const supabase = makeMockSupabase({ ssotErr: { message: 'connection reset' } });
    try {
      await checkRateCap({ productId: PRODUCT_ID, maxPerDay: 1, supabase, now: NOW });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('RATE_CAP_QUERY_FAILED');
      expect(e.message).toMatch(/connection reset/);
    }
  });
});

// ── checkRunawayDetector — operator-disabled ────────────────────────────────

describe('checkRunawayDetector — operator-set disabled', () => {
  it('throws SELF_RENEWAL_DISABLED when product_registry.self_renewal_disabled === true', async () => {
    const supabase = makeMockSupabase({
      productRegistry: { self_renewal_disabled: true },
    });
    try {
      await checkRunawayDetector({ productId: PRODUCT_ID, runawayThreshold: 3, supabase, now: NOW });
      expect.unreachable('should have thrown SELF_RENEWAL_DISABLED');
    } catch (e) {
      expect(e.code).toBe('SELF_RENEWAL_DISABLED');
      expect(e.productId).toBe(PRODUCT_ID);
    }
  });

  it('does NOT query product_ssot when disabled flag is true (short-circuit)', async () => {
    const supabase = makeMockSupabase({
      productRegistry: { self_renewal_disabled: true },
    });
    try {
      await checkRunawayDetector({ productId: PRODUCT_ID, runawayThreshold: 3, supabase, now: NOW });
    } catch { /* expected */ }
    const ssotCalls = supabase.calls.filter((c) => c.table === 'product_ssot');
    expect(ssotCalls.length).toBe(0);
  });
});

// ── checkRunawayDetector — N consecutive failures → disable + throw ─────────

describe('checkRunawayDetector — N consecutive gate failures', () => {
  it('disables + throws SELF_RENEWAL_RUNAWAY_DISABLED on exactly N failures', async () => {
    const supabase = makeMockSupabase({
      productRegistry: { self_renewal_disabled: false },
      productSsot: {
        governance_record: [
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(1) },
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(5) },
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(8) },
        ],
      },
    });
    try {
      await checkRunawayDetector({ productId: PRODUCT_ID, runawayThreshold: 3, supabase, now: NOW });
      expect.unreachable('should have thrown SELF_RENEWAL_RUNAWAY_DISABLED');
    } catch (e) {
      expect(e.code).toBe('SELF_RENEWAL_RUNAWAY_DISABLED');
      expect(e.productId).toBe(PRODUCT_ID);
      expect(e.consecutiveFailures).toBe(3);
      expect(e.disabledAt).toBe(NOW.toISOString());
    }

    // Verify the write side-effects:
    //   1. SELECT product_registry
    //   2. SELECT product_ssot
    //   3. UPDATE product_registry SET self_renewal_disabled = true
    //   4. UPDATE product_ssot SET governance_record = [...records, runaway_event]
    const writes = supabase.calls.filter((c) => c.op === 'update');
    expect(writes.length).toBe(2);

    const disableWrite = writes.find((c) => c.table === 'product_registry');
    expect(disableWrite.payload).toEqual({ self_renewal_disabled: true });
    expect(disableWrite.filter.val).toBe(PRODUCT_ID);

    const appendWrite = writes.find((c) => c.table === 'product_ssot');
    expect(Array.isArray(appendWrite.payload.governance_record)).toBe(true);
    expect(appendWrite.payload.governance_record.length).toBe(4);  // 3 existing + 1 new
    const newEvent = appendWrite.payload.governance_record[3];
    expect(newEvent.kind).toBe('self_renewal.runaway_disabled.v1');
    expect(newEvent.productId).toBe(PRODUCT_ID);
    expect(newEvent.consecutiveFailures).toBe(3);
    expect(newEvent.at).toBe(NOW.toISOString());
  });

  it('detects runaway even when extra older successful runs exist (uses only latest N)', async () => {
    const supabase = makeMockSupabase({
      productRegistry: { self_renewal_disabled: false },
      productSsot: {
        governance_record: [
          { kind: 'self_renewal.run_started.v1', at: HOURS_AGO(50) },     // old success, ignored
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(1) },     // latest 3 ↓
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(5) },
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(8) },
        ],
      },
    });
    await expect(
      checkRunawayDetector({ productId: PRODUCT_ID, runawayThreshold: 3, supabase, now: NOW }),
    ).rejects.toMatchObject({ code: 'SELF_RENEWAL_RUNAWAY_DISABLED' });
  });
});

// ── checkRunawayDetector — N-1 failures → safe ─────────────────────────────

describe('checkRunawayDetector — N-1 consecutive failures', () => {
  it('returns { safe: true } when only N-1 gate failures exist', async () => {
    const supabase = makeMockSupabase({
      productRegistry: { self_renewal_disabled: false },
      productSsot: {
        governance_record: [
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(1) },
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(5) },
          // only 2 events — N=3 not met
        ],
      },
    });
    const result = await checkRunawayDetector({
      productId: PRODUCT_ID, runawayThreshold: 3, supabase, now: NOW,
    });
    expect(result).toEqual({ safe: true });

    // No writes should have occurred.
    const writes = supabase.calls.filter((c) => c.op === 'update');
    expect(writes.length).toBe(0);
  });

  it('returns safe with empty governance_record', async () => {
    const supabase = makeMockSupabase({
      productRegistry: { self_renewal_disabled: false },
      productSsot: { governance_record: [] },
    });
    const result = await checkRunawayDetector({
      productId: PRODUCT_ID, runawayThreshold: 3, supabase, now: NOW,
    });
    expect(result).toEqual({ safe: true });
  });

  it('returns safe when product_ssot row is null', async () => {
    const supabase = makeMockSupabase({
      productRegistry: { self_renewal_disabled: false },
      productSsot: null,
    });
    const result = await checkRunawayDetector({
      productId: PRODUCT_ID, runawayThreshold: 3, supabase, now: NOW,
    });
    expect(result).toEqual({ safe: true });
  });
});

// ── checkRunawayDetector — failures not consecutive ─────────────────────────

describe('checkRunawayDetector — non-consecutive failures', () => {
  it('returns safe when a success appears between failures (chain broken)', async () => {
    const supabase = makeMockSupabase({
      productRegistry: { self_renewal_disabled: false },
      productSsot: {
        governance_record: [
          // Sorted by `at`: NEWEST → OLDEST
          { kind: 'self_renewal.gate_failed.v1',  at: HOURS_AGO(1) },   // newest
          { kind: 'self_renewal.run_started.v1',  at: HOURS_AGO(3) },   // success — breaks chain
          { kind: 'self_renewal.gate_failed.v1',  at: HOURS_AGO(7) },
        ],
      },
    });
    const result = await checkRunawayDetector({
      productId: PRODUCT_ID, runawayThreshold: 3, supabase, now: NOW,
    });
    expect(result).toEqual({ safe: true });

    // No disable write should have occurred.
    const disable = supabase.calls.filter(
      (c) => c.op === 'update' && c.table === 'product_registry',
    );
    expect(disable.length).toBe(0);
  });

  it('returns safe when the MOST RECENT event is a success (latest N includes the success)', async () => {
    const supabase = makeMockSupabase({
      productRegistry: { self_renewal_disabled: false },
      productSsot: {
        governance_record: [
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(20) },
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(15) },
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(10) },
          { kind: 'self_renewal.run_started.v1', at: HOURS_AGO(1) }, // most recent — safe
        ],
      },
    });
    const result = await checkRunawayDetector({
      productId: PRODUCT_ID, runawayThreshold: 3, supabase, now: NOW,
    });
    expect(result).toEqual({ safe: true });
  });
});

// ── checkRunawayDetector — input + query failure ────────────────────────────

describe('checkRunawayDetector — input validation + query failure', () => {
  it('throws on missing productId', async () => {
    const supabase = makeMockSupabase();
    await expect(checkRunawayDetector({ runawayThreshold: 3, supabase }))
      .rejects.toThrow(/productId must be/);
  });

  it('throws on non-positive runawayThreshold', async () => {
    const supabase = makeMockSupabase();
    await expect(checkRunawayDetector({ productId: PRODUCT_ID, runawayThreshold: 0, supabase }))
      .rejects.toThrow(/runawayThreshold must be a positive integer/);
  });

  it('throws on missing supabase client', async () => {
    await expect(checkRunawayDetector({ productId: PRODUCT_ID, runawayThreshold: 3 }))
      .rejects.toThrow(/supabase client missing/);
  });

  it('wraps registry read error as RATE_CAP_QUERY_FAILED', async () => {
    const supabase = makeMockSupabase({ registryErr: { message: 'role missing' } });
    try {
      await checkRunawayDetector({ productId: PRODUCT_ID, runawayThreshold: 3, supabase, now: NOW });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('RATE_CAP_QUERY_FAILED');
      expect(e.message).toMatch(/role missing/);
    }
  });

  it('wraps disable-write failure as RATE_CAP_QUERY_FAILED with runawayDetected flag', async () => {
    const supabase = makeMockSupabase({
      productRegistry: { self_renewal_disabled: false },
      productSsot: {
        governance_record: [
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(1) },
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(5) },
          { kind: 'self_renewal.gate_failed.v1', at: HOURS_AGO(8) },
        ],
      },
      updateRegistryErr: { message: 'write blocked' },
    });
    try {
      await checkRunawayDetector({ productId: PRODUCT_ID, runawayThreshold: 3, supabase, now: NOW });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.code).toBe('RATE_CAP_QUERY_FAILED');
      expect(e.runawayDetected).toBe(true);
      expect(e.consecutiveFailures).toBe(3);
    }
  });
});

// ── Internal helpers ────────────────────────────────────────────────────────

describe('rateCap internals', () => {
  it('parseAt returns null for non-string / malformed / empty inputs', () => {
    expect(__internals.parseAt(null)).toBeNull();
    expect(__internals.parseAt('')).toBeNull();
    expect(__internals.parseAt('not-a-date')).toBeNull();
    expect(__internals.parseAt(123)).toBeNull();
  });

  it('parseAt returns a Date for valid ISO 8601 strings', () => {
    expect(__internals.parseAt('2026-05-17T12:00:00Z')).toBeInstanceOf(Date);
  });

  it('computeNextEligibleAt picks oldest entry + 24h', () => {
    const result = __internals.computeNextEligibleAt([
      { at: HOURS_AGO(1) },
      { at: HOURS_AGO(20) },  // oldest
      { at: HOURS_AGO(10) },
    ]);
    const oldest = new Date(HOURS_AGO(20));
    expect(result.getTime()).toBe(oldest.getTime() + 24 * 60 * 60 * 1000);
  });

  it('computeNextEligibleAt returns null on empty input', () => {
    expect(__internals.computeNextEligibleAt([])).toBeNull();
  });

  it('exposes the documented kind constants', () => {
    expect(__internals.SELF_RENEWAL_KIND_PREFIX).toBe('self_renewal.');
    expect(__internals.GATE_FAILED_KIND).toBe('self_renewal.gate_failed.v1');
    expect(__internals.RUNAWAY_DISABLED_KIND).toBe('self_renewal.runaway_disabled.v1');
    expect(__internals.ONE_DAY_MS).toBe(24 * 60 * 60 * 1000);
  });
});
