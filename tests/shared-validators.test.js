/**
 * TDD scaffold for src/lib/shared/validators.js.
 * Spec: specs/w5-design/09-validation-utilities.md
 *
 * Expected to fail until implemented.
 */
import { describe, it, expect } from 'vitest';

const MODULE = '../src/lib/shared/validators.js';
const load = () => import(MODULE);

describe('validators — surface', () => {
  it.each([
    'assertNonEmptyString',
    'assertNonEmptyArray',
    'assertObject',
    'requireFields',
    'assertSlugSafe',
    'assertSubkeySafe',
    'assertFiniteNumber',
    'assertNumberInRange',
    'assertIntegerInRange',
    'assertEnumMember',
  ])('exports %s', async (name) => {
    const m = await load();
    expect(typeof m[name]).toBe('function');
  });

  it('exports SLUG_RE and SUBKEY_RE', async () => {
    const m = await load();
    expect(m.SLUG_RE).toBeInstanceOf(RegExp);
    expect(m.SUBKEY_RE).toBeInstanceOf(RegExp);
  });
});

describe('validators — assertNonEmptyString', () => {
  it('returns the value on success', async () => {
    const { assertNonEmptyString } = await load();
    expect(assertNonEmptyString('hello', 'f')).toBe('hello');
  });

  it('rejects empty', async () => {
    const { assertNonEmptyString } = await load();
    expect(() => assertNonEmptyString('', 'f')).toThrow();
  });

  it('rejects non-string', async () => {
    const { assertNonEmptyString } = await load();
    expect(() => assertNonEmptyString(123, 'f')).toThrow();
    expect(() => assertNonEmptyString(null, 'f')).toThrow();
    expect(() => assertNonEmptyString(undefined, 'f')).toThrow();
  });

  it('allows whitespace', async () => {
    const { assertNonEmptyString } = await load();
    expect(assertNonEmptyString(' ', 'f')).toBe(' ');
  });
});

describe('validators — assertNonEmptyArray', () => {
  it('returns the array on success', async () => {
    const { assertNonEmptyArray } = await load();
    const a = [1, 2];
    expect(assertNonEmptyArray(a, 'f')).toBe(a);
  });

  it('rejects empty', async () => {
    const { assertNonEmptyArray } = await load();
    expect(() => assertNonEmptyArray([], 'f')).toThrow();
  });

  it('rejects non-array', async () => {
    const { assertNonEmptyArray } = await load();
    expect(() => assertNonEmptyArray('not-array', 'f')).toThrow();
    expect(() => assertNonEmptyArray({ length: 1 }, 'f')).toThrow();
  });
});

describe('validators — assertObject', () => {
  it('returns object on success', async () => {
    const { assertObject } = await load();
    const o = { a: 1 };
    expect(assertObject(o, 'f')).toBe(o);
  });

  it('rejects null', async () => {
    const { assertObject } = await load();
    expect(() => assertObject(null, 'f')).toThrow();
  });

  it('rejects array', async () => {
    const { assertObject } = await load();
    expect(() => assertObject([], 'f')).toThrow();
  });

  it('rejects primitive', async () => {
    const { assertObject } = await load();
    expect(() => assertObject(1, 'f')).toThrow();
    expect(() => assertObject('x', 'f')).toThrow();
  });
});

describe('validators — requireFields', () => {
  it('passes when all fields present', async () => {
    const { requireFields } = await load();
    expect(() => requireFields({ a: 1, b: 2 }, ['a', 'b'])).not.toThrow();
  });

  it('throws on missing field', async () => {
    const { requireFields } = await load();
    expect(() => requireFields({ a: 1 }, ['a', 'b'])).toThrow(/b/);
  });

  it('throws when value is null (matches existing behavior)', async () => {
    const { requireFields } = await load();
    expect(() => requireFields({ a: null }, ['a'])).toThrow();
  });
});

describe('validators — slug-safety', () => {
  it('SLUG_RE rejects underscores', async () => {
    const { SLUG_RE } = await load();
    expect(SLUG_RE.test('foo-bar')).toBe(true);
    expect(SLUG_RE.test('foo_bar')).toBe(false);
  });

  it('SUBKEY_RE allows underscores', async () => {
    const { SUBKEY_RE } = await load();
    expect(SUBKEY_RE.test('API_KEY')).toBe(true);
  });

  it('assertSlugSafe rejects empty', async () => {
    const { assertSlugSafe } = await load();
    expect(() => assertSlugSafe('', 'id')).toThrow();
  });

  it('assertSlugSafe rejects unicode', async () => {
    const { assertSlugSafe } = await load();
    expect(() => assertSlugSafe('café', 'id')).toThrow();
  });
});

describe('validators — number ranges', () => {
  it('assertFiniteNumber rejects NaN/Infinity', async () => {
    const { assertFiniteNumber } = await load();
    expect(() => assertFiniteNumber(NaN, 'f')).toThrow();
    expect(() => assertFiniteNumber(Infinity, 'f')).toThrow();
  });

  it('assertFiniteNumber rejects string', async () => {
    const { assertFiniteNumber } = await load();
    expect(() => assertFiniteNumber('1', 'f')).toThrow();
  });

  it('assertNumberInRange is inclusive on both ends', async () => {
    const { assertNumberInRange } = await load();
    expect(() => assertNumberInRange(0, 0, 100, 'f')).not.toThrow();
    expect(() => assertNumberInRange(100, 0, 100, 'f')).not.toThrow();
    expect(() => assertNumberInRange(101, 0, 100, 'f')).toThrow();
  });

  it('assertIntegerInRange rejects floats', async () => {
    const { assertIntegerInRange } = await load();
    expect(() => assertIntegerInRange(1.5, 1, 10, 'f')).toThrow();
  });
});

describe('validators — assertEnumMember', () => {
  it('allows member', async () => {
    const { assertEnumMember } = await load();
    expect(assertEnumMember('a', ['a', 'b', 'c'], 'f')).toBe('a');
  });

  it('rejects non-member with details', async () => {
    const { assertEnumMember } = await load();
    expect(() => assertEnumMember('z', ['a', 'b'], 'f')).toThrow();
  });
});
