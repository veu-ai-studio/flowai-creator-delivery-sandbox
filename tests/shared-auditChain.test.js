/**
 * TDD scaffold for src/lib/shared/auditChain.js (X-005, D-014).
 * Spec: specs/w5-design/03-prevhash-helper-spec.md
 *
 * These tests are EXPECTED TO FAIL until the helper is implemented.
 * Each test dynamically imports the module so vitest reports the missing
 * symbol cleanly per-test.
 */
import { describe, it, expect } from 'vitest';

const MODULE = '../src/lib/shared/auditChain.js';

async function load() {
  return await import(MODULE);
}

describe('auditChain — surface', () => {
  it('exports appendChained', async () => {
    const m = await load();
    expect(typeof m.appendChained).toBe('function');
  });

  it('exports verifyChain', async () => {
    const m = await load();
    expect(typeof m.verifyChain).toBe('function');
  });

  it('exports newChain', async () => {
    const m = await load();
    expect(typeof m.newChain).toBe('function');
  });

  it('exports GENESIS_PREV_HASH as 64-char hex of zeros', async () => {
    const m = await load();
    expect(m.GENESIS_PREV_HASH).toBe('0'.repeat(64));
  });
});

describe('auditChain — appendChained behavior', () => {
  it('first append seeds with GENESIS_PREV_HASH', async () => {
    const { appendChained, GENESIS_PREV_HASH } = await load();
    const out = await appendChained({ phase: 'run.start' });
    expect(out.prevHash).toBe(GENESIS_PREV_HASH);
    expect(out.seq).toBe(0);
    expect(out.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects entry that already contains hash/prevHash/seq', async () => {
    const { appendChained } = await load();
    await expect(appendChained({ phase: 'x', hash: 'abc' })).rejects.toThrow(/already chained/);
    await expect(appendChained({ phase: 'x', prevHash: 'abc' })).rejects.toThrow(/already chained/);
    await expect(appendChained({ phase: 'x', seq: 1 })).rejects.toThrow(/already chained/);
  });

  it('returned entry is frozen', async () => {
    const { appendChained } = await load();
    const out = await appendChained({ phase: 'run.start' });
    expect(Object.isFrozen(out)).toBe(true);
  });

  it('different payloads produce different hashes', async () => {
    const { appendChained } = await load();
    const a = await appendChained({ phase: 'run.start' });
    const b = await appendChained({ phase: 'run.error' });
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('auditChain — newChain cursor', () => {
  it('cursor starts at seq=0 and genesis prevHash', async () => {
    const { newChain, GENESIS_PREV_HASH } = await load();
    const c = newChain();
    expect(c.seq).toBe(0);
    expect(c.prevHash).toBe(GENESIS_PREV_HASH);
  });

  it('appendChained on cursor advances seq and prevHash', async () => {
    const { newChain } = await load();
    const c = newChain();
    const e1 = await c.appendChained({ phase: 'a' });
    const e2 = await c.appendChained({ phase: 'b' });
    expect(e1.seq).toBe(0);
    expect(e2.seq).toBe(1);
    expect(e2.prevHash).toBe(e1.hash);
  });

  it('cursor can resume from a saved prevHash and seq', async () => {
    const { newChain } = await load();
    const c = newChain({ prevHash: 'a'.repeat(64), seq: 42 });
    const e = await c.appendChained({ phase: 'resumed' });
    expect(e.seq).toBe(42);
    expect(e.prevHash).toBe('a'.repeat(64));
  });
});

describe('auditChain — verifyChain', () => {
  it('returns ok=true for empty chain', async () => {
    const { verifyChain } = await load();
    const r = await verifyChain([]);
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('empty');
  });

  it('returns ok=true for a freshly built chain', async () => {
    const { newChain, verifyChain } = await load();
    const c = newChain();
    const entries = [];
    for (const phase of ['run.start', 'plan.ok', 'guard.ok', 'act.ok']) {
      entries.push(await c.appendChained({ phase }));
    }
    const r = await verifyChain(entries);
    expect(r.ok).toBe(true);
  });

  it('detects hash_mismatch when an entry is mutated', async () => {
    const { newChain, verifyChain } = await load();
    const c = newChain();
    const e1 = await c.appendChained({ phase: 'run.start' });
    const e2 = await c.appendChained({ phase: 'plan.ok' });
    const tampered = { ...e1, phase: 'run.error' }; // mutate after seal
    const r = await verifyChain([tampered, e2]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('hash_mismatch');
    expect(r.brokenAtSeq).toBe(0);
  });

  it('detects seq_skip when an entry is dropped', async () => {
    const { newChain, verifyChain } = await load();
    const c = newChain();
    const e1 = await c.appendChained({ phase: 'a' });
    await c.appendChained({ phase: 'b' });
    const e3 = await c.appendChained({ phase: 'c' });
    const r = await verifyChain([e1, e3]);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/seq_skip|hash_mismatch/);
  });

  it('detects genesis_mismatch when first prevHash is wrong', async () => {
    const { verifyChain } = await load();
    const fake = Object.freeze({
      seq: 0, prevHash: 'f'.repeat(64), hash: 'a'.repeat(64), phase: 'a',
    });
    const r = await verifyChain([fake]);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/genesis_mismatch|hash_mismatch/);
  });
});
