import { describe, it, expect } from 'vitest';
import { mintId } from '../src/lib/shared/idGen.js';
import { fixedClock } from '../src/lib/shared/clock.js';

describe('shared/idGen — mintId format', () => {
  it('returns a string of shape <prefix>_<base36ms>_<base36rand>', () => {
    const id = mintId('foo');
    expect(id).toMatch(/^foo_[0-9a-z]+_[0-9a-z]+$/);
  });

  it('accepts a prefix containing underscores', () => {
    const id = mintId('foo_bar');
    expect(id.startsWith('foo_bar_')).toBe(true);
    // Last two underscores split the timestamp/random; prefix retains its underscore.
    const parts = id.split('_');
    expect(parts.length).toBe(4);
  });

  it('uses an injected clock', () => {
    // 36 in base36 == "10"
    const id = mintId('p', { clock: fixedClock(36) });
    expect(id.split('_')[1]).toBe('10');
  });

  it('uses an injected random for determinism', () => {
    const fc = fixedClock(0);
    const id1 = mintId('p', { clock: fc, random: () => 0.5 });
    const id2 = mintId('p', { clock: fc, random: () => 0.5 });
    expect(id1).toBe(id2);
  });

  it('default suffix length is 8 characters', () => {
    const id = mintId('p', { clock: fixedClock(0) });
    const parts = id.split('_');
    expect(parts[2].length).toBe(8);
  });

  it('respects an opts.suffixLen override', () => {
    const id = mintId('p', { clock: fixedClock(0), suffixLen: 12 });
    expect(id.split('_')[2].length).toBe(12);
  });

  it('hits the random() loop when a single call cannot fill suffixLen', () => {
    // random() returning a tiny value yields a short base36 fragment, forcing the loop.
    const id = mintId('p', {
      clock: fixedClock(0),
      random: () => Number.EPSILON,
      suffixLen: 12,
    });
    expect(id.split('_')[2].length).toBe(12);
  });

  it('floors fractional clock readings', () => {
    const id = mintId('p', { clock: { now: () => 36.9 } });
    expect(id.split('_')[1]).toBe('10'); // floor(36.9) -> 36 -> '10'
  });
});

describe('shared/idGen — mintId validation', () => {
  it('rejects empty prefix', () => {
    expect(() => mintId('')).toThrow(/non-empty string/);
  });

  it('rejects non-string prefix', () => {
    expect(() => mintId(123)).toThrow(/non-empty string/);
    expect(() => mintId(null)).toThrow(/non-empty string/);
    expect(() => mintId(undefined)).toThrow(/non-empty string/);
  });

  it('rejects clock without .now()', () => {
    expect(() => mintId('p', { clock: {} })).toThrow(/clock must expose/);
  });

  it('rejects non-function random', () => {
    expect(() => mintId('p', { random: 0.5 })).toThrow(/random must be a function/);
  });

  it('rejects suffixLen below minimum', () => {
    expect(() => mintId('p', { suffixLen: 3 })).toThrow(/suffixLen must be an integer/);
  });

  it('rejects non-integer suffixLen', () => {
    expect(() => mintId('p', { suffixLen: 5.5 })).toThrow(/suffixLen must be an integer/);
  });

  it('rejects clock.now() returning non-finite', () => {
    expect(() => mintId('p', { clock: { now: () => NaN } })).toThrow(/finite number/);
  });

  it('rejects random returning out-of-range value', () => {
    expect(() => mintId('p', { clock: fixedClock(0), random: () => 1.5 })).toThrow(/in \[0, 1\)/);
    expect(() => mintId('p', { clock: fixedClock(0), random: () => -0.1 })).toThrow(/in \[0, 1\)/);
    expect(() => mintId('p', { clock: fixedClock(0), random: () => 'x' })).toThrow(/in \[0, 1\)/);
  });
});

describe('shared/idGen — uniqueness', () => {
  it('produces distinct IDs across many calls (no clock fix)', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(mintId('x'));
    expect(seen.size).toBe(200);
  });

  it('produces distinct IDs even with the same clock when random varies', () => {
    const fc = fixedClock(1);
    const ids = new Set();
    for (let i = 0; i < 100; i++) ids.add(mintId('x', { clock: fc }));
    expect(ids.size).toBe(100);
  });
});
