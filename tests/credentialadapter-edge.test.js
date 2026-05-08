import { describe, it, expect, beforeEach } from 'vitest';
import {
  CredentialAdapter,
  getDefaultCredentialAdapter,
  setDefaultCredentialAdapter,
  _resetDefaultCredentialAdapter,
} from '../src/lib/shared/CredentialAdapter.js';

const baseOpts = { project: 'flowai', environment: 'prod' };

describe('CredentialAdapter — empty subkey', () => {
  it('rejects empty string subkey on getProviderSecret', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.getProviderSecret('myprov', '')).rejects.toThrow(/subkey must be non-empty/);
  });

  it('rejects empty string subkey on getCustomerSecret', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.getCustomerSecret('myprov', 'cust1', '')).rejects.toThrow(/subkey must be non-empty/);
  });

  it('rejects undefined subkey', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.getProviderSecret('myprov', undefined)).rejects.toThrow(/non-empty string/);
  });

  it('rejects null subkey', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.getProviderSecret('myprov', null)).rejects.toThrow(/non-empty string/);
  });

  it('rejects empty string on get(key)', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.get('')).rejects.toThrow(/non-empty string/);
  });

  it('rejects non-string key on get', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.get(123)).rejects.toThrow(/non-empty string/);
  });
});

describe('CredentialAdapter — very long IDs', () => {
  it('accepts a very long slug-safe providerId', async () => {
    const a = new CredentialAdapter(baseOpts);
    const longId = 'a'.repeat(2048);
    const result = await a.getProviderSecret(longId, 'API_KEY');
    expect(result.status).toBe('missing');
    expect(result.path.secret).toBe(`PROVIDERS_${longId}_API_KEY`);
  });

  it('accepts a very long subkey', async () => {
    const a = new CredentialAdapter(baseOpts);
    const longSub = 'A_B_C_'.repeat(500); // 3000 chars, all subkey-safe
    const result = await a.getProviderSecret('p1', longSub);
    expect(result.status).toBe('missing');
    expect(result.path.secret).toContain(longSub);
  });

  it('accepts long expectedKeys list', async () => {
    const expected = Array.from({ length: 1000 }, (_, i) => `KEY_${i}`);
    const a = new CredentialAdapter({ ...baseOpts, expectedKeys: expected });
    const status = await a.probe('KEY_500');
    expect(status).toBe('expected');
  });
});

describe('CredentialAdapter — Unicode in IDs', () => {
  it('rejects providerId containing latin extended characters', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.getProviderSecret('café', 'API_KEY')).rejects.toThrow(/not slug-safe/);
  });

  it('rejects providerId containing emoji', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.getProviderSecret('foo🚀', 'API_KEY')).rejects.toThrow(/not slug-safe/);
  });

  it('rejects providerId containing CJK characters', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.getProviderSecret('企业', 'API_KEY')).rejects.toThrow(/not slug-safe/);
  });

  it('rejects customerId with combining diacritic', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.getCustomerSecret('p1', 'café', 'API_KEY')).rejects.toThrow(/not slug-safe/);
  });

  it('rejects subkey containing non-ASCII even though underscores are allowed', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.getProviderSecret('p1', 'API_KÉY')).rejects.toThrow(/must contain only/);
  });

  it('rejects providerId with U+200B zero-width space', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.getProviderSecret('foo​bar', 'API_KEY')).rejects.toThrow(/not slug-safe/);
  });
});

describe('CredentialAdapter — multiple project switches via setDefaultCredentialAdapter', () => {
  beforeEach(() => {
    _resetDefaultCredentialAdapter();
  });

  it('throws when default not set', () => {
    expect(() => getDefaultCredentialAdapter()).toThrow(/No default CredentialAdapter set/);
  });

  it('returns the most recently set adapter', () => {
    const a1 = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    const a2 = new CredentialAdapter({ project: 'saige', environment: 'staging' });
    setDefaultCredentialAdapter(a1);
    expect(getDefaultCredentialAdapter()).toBe(a1);
    setDefaultCredentialAdapter(a2);
    expect(getDefaultCredentialAdapter()).toBe(a2);
    expect(getDefaultCredentialAdapter().project).toBe('saige');
    expect(getDefaultCredentialAdapter().environment).toBe('staging');
  });

  it('rejects a non-CredentialAdapter as default', () => {
    expect(() => setDefaultCredentialAdapter({})).toThrow(/must be a CredentialAdapter instance/);
    expect(() => setDefaultCredentialAdapter(null)).toThrow(/must be a CredentialAdapter instance/);
    expect(() => setDefaultCredentialAdapter('saige')).toThrow(/must be a CredentialAdapter instance/);
  });

  it('handles many switches without leaking previous state', () => {
    for (let i = 0; i < 50; i++) {
      const project = i % 2 === 0 ? 'flowai' : 'reltwin';
      const env = i % 3 === 0 ? 'prod' : 'staging';
      const a = new CredentialAdapter({ project, environment: env });
      setDefaultCredentialAdapter(a);
      expect(getDefaultCredentialAdapter()).toBe(a);
      expect(getDefaultCredentialAdapter().project).toBe(project);
    }
  });

  it('_resetDefaultCredentialAdapter clears prior default', () => {
    const a = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    setDefaultCredentialAdapter(a);
    _resetDefaultCredentialAdapter();
    expect(() => getDefaultCredentialAdapter()).toThrow(/No default CredentialAdapter set/);
  });
});

describe('CredentialAdapter — getAll with empty / unusual inputs', () => {
  it('getAll([]) returns empty object', async () => {
    const a = new CredentialAdapter(baseOpts);
    const result = await a.getAll([]);
    expect(result).toEqual({});
  });

  it('getAll throws when keys is not array', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.getAll('not-an-array')).rejects.toThrow(/keys must be array/);
    await expect(a.getAll(undefined)).rejects.toThrow(/keys must be array/);
    await expect(a.getAll(null)).rejects.toThrow(/keys must be array/);
  });

  it('getAll preserves the order/keys of the input', async () => {
    const a = new CredentialAdapter({ ...baseOpts, expectedKeys: ['K1', 'K3'] });
    const out = await a.getAll(['K1', 'K2', 'K3']);
    expect(Object.keys(out)).toEqual(['K1', 'K2', 'K3']);
    expect(out.K1.status).toBe('expected');
    expect(out.K2.status).toBe('missing');
    expect(out.K3.status).toBe('expected');
  });

  it('getAll surfaces validation error on first invalid key', async () => {
    const a = new CredentialAdapter(baseOpts);
    await expect(a.getAll(['', 'K2'])).rejects.toThrow(/non-empty string/);
  });
});

describe('CredentialAdapter — declareExpected edge cases', () => {
  it('declareExpected([]) is a no-op', async () => {
    const a = new CredentialAdapter(baseOpts);
    a.declareExpected([]);
    const status = await a.probe('NEVER_DECLARED');
    expect(status).toBe('missing');
  });

  it('declareExpected(undefined) is a no-op', async () => {
    const a = new CredentialAdapter(baseOpts);
    a.declareExpected(undefined);
    const status = await a.probe('NEVER_DECLARED');
    expect(status).toBe('missing');
  });

  it('declareExpected accumulates across calls', async () => {
    const a = new CredentialAdapter(baseOpts);
    a.declareExpected(['ALPHA']);
    a.declareExpected(['BETA', 'GAMMA']);
    expect(await a.probe('ALPHA')).toBe('expected');
    expect(await a.probe('BETA')).toBe('expected');
    expect(await a.probe('GAMMA')).toBe('expected');
    expect(await a.probe('DELTA')).toBe('missing');
  });

  it('declareExpected ignores duplicates silently', async () => {
    const a = new CredentialAdapter(baseOpts);
    a.declareExpected(['SAME', 'SAME', 'SAME']);
    expect(await a.probe('SAME')).toBe('expected');
    // Internal Set dedupes; expectedKeys.size should be 1
    expect(a.expectedKeys.size).toBe(1);
  });
});

describe('CredentialAdapter — envFallback path', () => {
  it('returns env_fallback source when key found in injected fallback', async () => {
    const a = new CredentialAdapter({ ...baseOpts, envFallback: { MY_KEY: 'fallback-value' } });
    const result = await a.get('MY_KEY');
    expect(result.status).toBe('present');
    expect(result.source).toBe('env_fallback');
    expect(result.value).toBe('fallback-value');
  });

  it('falls through to expected when fallback value is empty string', async () => {
    const a = new CredentialAdapter({
      ...baseOpts,
      envFallback: { MY_KEY: '' },
      expectedKeys: ['MY_KEY'],
    });
    const result = await a.get('MY_KEY');
    expect(result.status).toBe('expected');
    expect(result.source).toBe('placeholder');
  });

  it('default envFallback is empty object (browser-safe)', async () => {
    const a = new CredentialAdapter(baseOpts);
    expect(a.envFallback).toEqual({});
  });
});
