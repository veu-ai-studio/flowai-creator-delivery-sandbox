import { describe, it, expect } from 'vitest';
import { systemClock, fixedClock, isClock } from '../src/lib/shared/clock.js';

describe('shared/clock — systemClock', () => {
  it('exports a frozen object with .now()', () => {
    expect(typeof systemClock).toBe('object');
    expect(typeof systemClock.now).toBe('function');
    expect(Object.isFrozen(systemClock)).toBe(true);
  });

  it('.now() returns a finite Unix-ms number close to Date.now()', () => {
    const before = Date.now();
    const t = systemClock.now();
    const after = Date.now();
    expect(Number.isFinite(t)).toBe(true);
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });

  it('two consecutive calls yield non-decreasing values', () => {
    const a = systemClock.now();
    const b = systemClock.now();
    expect(b).toBeGreaterThanOrEqual(a);
  });
});

describe('shared/clock — fixedClock', () => {
  it('returns a clock whose .now() yields the seed timestamp', () => {
    const c = fixedClock(1_700_000_000_000);
    expect(c.now()).toBe(1_700_000_000_000);
    expect(c.now()).toBe(1_700_000_000_000);
  });

  it('.advance(delta) shifts the clock forward', () => {
    const c = fixedClock(1_000_000);
    c.advance(500);
    expect(c.now()).toBe(1_000_500);
    c.advance(0);
    expect(c.now()).toBe(1_000_500);
  });

  it('.advance accepts negative deltas', () => {
    const c = fixedClock(2_000);
    c.advance(-1_000);
    expect(c.now()).toBe(1_000);
  });

  it('.advance returns the new now()', () => {
    const c = fixedClock(0);
    expect(c.advance(42)).toBe(42);
  });

  it('rejects non-finite seed timestamps', () => {
    expect(() => fixedClock(NaN)).toThrow(/finite number/);
    expect(() => fixedClock(Infinity)).toThrow(/finite number/);
    expect(() => fixedClock('100')).toThrow(/finite number/);
    expect(() => fixedClock()).toThrow(/finite number/);
  });

  it('rejects non-finite delta on advance', () => {
    const c = fixedClock(0);
    expect(() => c.advance(NaN)).toThrow(/finite number/);
    expect(() => c.advance('5')).toThrow(/finite number/);
  });

  it('two fixedClocks are independent', () => {
    const a = fixedClock(100);
    const b = fixedClock(100);
    a.advance(50);
    expect(a.now()).toBe(150);
    expect(b.now()).toBe(100);
  });
});

describe('shared/clock — isClock', () => {
  it('returns true for systemClock', () => {
    expect(isClock(systemClock)).toBe(true);
  });

  it('returns true for fixedClock instances', () => {
    expect(isClock(fixedClock(0))).toBe(true);
  });

  it('returns true for any object with a .now() function (duck typing)', () => {
    expect(isClock({ now: () => 0 })).toBe(true);
  });

  it('returns false for null / undefined / primitives', () => {
    expect(isClock(null)).toBe(false);
    expect(isClock(undefined)).toBe(false);
    expect(isClock(0)).toBe(false);
    expect(isClock('clock')).toBe(false);
  });

  it('returns false for objects without .now', () => {
    expect(isClock({})).toBe(false);
    expect(isClock({ time: () => 0 })).toBe(false);
  });
});
