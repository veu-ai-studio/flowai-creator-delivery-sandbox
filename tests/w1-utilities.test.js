// W1 utilities — focused unit tests exercising boundary conditions on
// CredentialAdapter pure functions. Companion to credentialadapter-integration.test.js
// (which covers DI happy paths). This file targets:
//   - slug-safety regex boundaries
//   - per-project environment allowlists
//   - frozen-result invariants
//   - getAll / declareExpected idempotency
//   - probe() return-shape consistency
//   - constructor argument validation

import { describe, it, expect } from 'vitest';
import {
  CredentialAdapter,
  setDefaultCredentialAdapter,
  getDefaultCredentialAdapter,
  _resetDefaultCredentialAdapter,
} from '../src/lib/shared/CredentialAdapter.js';

describe('CredentialAdapter — exports', () => {
  it('exports the class', () => {
    expect(typeof CredentialAdapter).toBe('function');
  });
  it('exports the singleton getter / setter / reset', () => {
    expect(typeof getDefaultCredentialAdapter).toBe('function');
    expect(typeof setDefaultCredentialAdapter).toBe('function');
    expect(typeof _resetDefaultCredentialAdapter).toBe('function');
  });
});

describe('CredentialAdapter — constructor argument validation', () => {
  it('throws when project is missing', () => {
    expect(() => new CredentialAdapter({ environment: 'prod' }))
      .toThrow(/project required/);
  });
  it('throws when environment is missing', () => {
    expect(() => new CredentialAdapter({ project: 'flowai' }))
      .toThrow(/environment required/);
  });
  it('throws when project is unknown', () => {
    expect(() => new CredentialAdapter({ project: 'not-a-real-product', environment: 'prod' }))
      .toThrow(/unknown project/);
  });
});

describe('CredentialAdapter — per-project environment allowlist', () => {
  // Spec (per CredentialAdapter.js:32-33 + BaseAgent.js:84-85):
  //   flowai:  ['prd', 'prod', 'staging']           — 'prd' canonical, 'prod' alias
  //   product: ['prd', 'prod', 'staging', 'demo', 'live-demo', 'sales-demo']
  // The Doppler workspace config name is `prd`; `prod` is retained as a
  // backwards-compat alias. See docs/operations/credential-adapter-naming.md.
  const productScopes = ['saige', 'reltwin', 'reachsms', 'pressai', 'mypreglife'];
  const productEnvs = ['prd', 'prod', 'staging', 'demo', 'live-demo', 'sales-demo'];
  const productOnlyEnvs = ['demo', 'live-demo', 'sales-demo'];
  const flowaiEnvs = ['prd', 'prod', 'staging'];

  for (const env of flowaiEnvs) {
    it(`flowai accepts ${env}`, () => {
      const a = new CredentialAdapter({ project: 'flowai', environment: env });
      expect(a.project).toBe('flowai');
      expect(a.environment).toBe(env);
    });
  }

  for (const env of productOnlyEnvs) {
    it(`flowai rejects ${env}`, () => {
      expect(() => new CredentialAdapter({ project: 'flowai', environment: env }))
        .toThrow(/invalid for project "flowai"/);
    });
  }

  for (const project of productScopes) {
    for (const env of productEnvs) {
      it(`${project} accepts ${env}`, () => {
        const a = new CredentialAdapter({ project, environment: env });
        expect(a.project).toBe(project);
        expect(a.environment).toBe(env);
      });
    }
  }

  it('rejects an unknown environment for a product', () => {
    expect(() => new CredentialAdapter({ project: 'saige', environment: 'production' }))
      .toThrow(/invalid for project "saige"/);
  });
});

describe('CredentialAdapter — slug-safety regex boundaries', () => {
  const adapter = new CredentialAdapter({ project: 'flowai', environment: 'prod' });

  it('accepts alphanumeric providerId', async () => {
    // The fact that no doppler client is set means status will be 'missing',
    // but the assertion we care about is that it does NOT throw on the slug.
    const r = await adapter.getProviderSecret('acme123', 'API_KEY');
    expect(r.status).toBe('missing');
    expect(r.path.secret).toBe('PROVIDERS_acme123_API_KEY');
  });

  it('accepts hyphenated providerId', async () => {
    const r = await adapter.getProviderSecret('acme-co', 'API_KEY');
    expect(r.path.secret).toBe('PROVIDERS_acme-co_API_KEY');
  });

  it('rejects underscore in providerId', async () => {
    await expect(adapter.getProviderSecret('acme_co', 'API_KEY'))
      .rejects.toThrow(/not slug-safe/);
  });

  it('rejects dot in providerId', async () => {
    await expect(adapter.getProviderSecret('acme.co', 'API_KEY'))
      .rejects.toThrow(/not slug-safe/);
  });

  it('rejects whitespace in providerId', async () => {
    await expect(adapter.getProviderSecret('acme co', 'API_KEY'))
      .rejects.toThrow(/not slug-safe/);
  });

  it('rejects empty string providerId', async () => {
    await expect(adapter.getProviderSecret('', 'API_KEY'))
      .rejects.toThrow(/non-empty string/);
  });

  it('accepts subkey with underscores (API_KEY, WEBHOOK_SECRET)', async () => {
    const r1 = await adapter.getProviderSecret('acme', 'API_KEY');
    const r2 = await adapter.getProviderSecret('acme', 'WEBHOOK_SECRET');
    expect(r1.path.secret).toBe('PROVIDERS_acme_API_KEY');
    expect(r2.path.secret).toBe('PROVIDERS_acme_WEBHOOK_SECRET');
  });

  it('rejects subkey with disallowed punctuation', async () => {
    await expect(adapter.getProviderSecret('acme', 'API.KEY'))
      .rejects.toThrow(/must contain only alphanumeric, underscore, or hyphen/);
  });

  it('rejects empty subkey', async () => {
    await expect(adapter.getProviderSecret('acme', ''))
      .rejects.toThrow(/non-empty string/);
  });

  it('customer path enforces slug-safety on both providerId and customerId', async () => {
    await expect(adapter.getCustomerSecret('acme', 'cust_1', 'TOKEN'))
      .rejects.toThrow(/customerId.*not slug-safe/);
    await expect(adapter.getCustomerSecret('bad_id', 'cust1', 'TOKEN'))
      .rejects.toThrow(/providerId.*not slug-safe/);
  });

  it('Stripe Connect path enforces slug-safety on providerId', async () => {
    await expect(adapter.getStripeConnect('bad_id'))
      .rejects.toThrow(/not slug-safe/);
    const r = await adapter.getStripeConnect('acme');
    expect(r.path.secret).toBe('STRIPE_CONNECT_acme');
  });
});

describe('CredentialAdapter — frozen-result invariants', () => {
  const adapter = new CredentialAdapter({
    project: 'flowai',
    environment: 'prod',
    expectedKeys: ['EXPECTED_KEY'],
    envFallback: { FALLBACK_KEY: 'value-here' },
  });

  it('returns frozen object for missing status', async () => {
    const r = await adapter.get('TOTALLY_UNKNOWN');
    expect(Object.isFrozen(r)).toBe(true);
    expect(r.status).toBe('missing');
    expect(r.value).toBe(null);
  });

  it('returns frozen object for expected status', async () => {
    const r = await adapter.get('EXPECTED_KEY');
    expect(Object.isFrozen(r)).toBe(true);
    expect(r.status).toBe('expected');
    expect(r.value).toBe(null);
    expect(r.source).toBe('placeholder');
  });

  it('returns frozen object for env_fallback present', async () => {
    const r = await adapter.get('FALLBACK_KEY');
    expect(Object.isFrozen(r)).toBe(true);
    expect(r.status).toBe('present');
    expect(r.value).toBe('value-here');
    expect(r.source).toBe('env_fallback');
  });
});

describe('CredentialAdapter — get() input validation', () => {
  const adapter = new CredentialAdapter({ project: 'flowai', environment: 'prod' });

  it('rejects empty string key', async () => {
    await expect(adapter.get('')).rejects.toThrow(/non-empty string/);
  });

  it('rejects non-string key', async () => {
    await expect(adapter.get(null)).rejects.toThrow(/non-empty string/);
    await expect(adapter.get(123)).rejects.toThrow(/non-empty string/);
    await expect(adapter.get({})).rejects.toThrow(/non-empty string/);
  });
});

describe('CredentialAdapter — getAll() behaviour', () => {
  const adapter = new CredentialAdapter({
    project: 'flowai',
    environment: 'prod',
    expectedKeys: ['B'],
    envFallback: { A: 'a-val' },
  });

  it('returns map of statuses', async () => {
    const out = await adapter.getAll(['A', 'B', 'C']);
    expect(Object.keys(out).sort()).toEqual(['A', 'B', 'C']);
    expect(out.A.status).toBe('present');
    expect(out.B.status).toBe('expected');
    expect(out.C.status).toBe('missing');
  });

  it('returns empty object for empty array', async () => {
    const out = await adapter.getAll([]);
    expect(out).toEqual({});
  });

  it('rejects non-array input', async () => {
    await expect(adapter.getAll('A')).rejects.toThrow(/keys must be array/);
    await expect(adapter.getAll(null)).rejects.toThrow(/keys must be array/);
    await expect(adapter.getAll({ A: 1 })).rejects.toThrow(/keys must be array/);
  });
});

describe('CredentialAdapter — declareExpected() idempotency', () => {
  it('declaring the same key twice is a no-op', async () => {
    const adapter = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    expect(await adapter.probe('K')).toBe('missing');
    adapter.declareExpected(['K']);
    adapter.declareExpected(['K']);
    expect(await adapter.probe('K')).toBe('expected');
  });

  it('handles undefined and empty list gracefully', () => {
    const adapter = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    expect(() => adapter.declareExpected()).not.toThrow();
    expect(() => adapter.declareExpected([])).not.toThrow();
  });

  it('initial expectedKeys from constructor work', async () => {
    const adapter = new CredentialAdapter({
      project: 'flowai', environment: 'prod', expectedKeys: ['INITIAL_KEY'],
    });
    expect(await adapter.probe('INITIAL_KEY')).toBe('expected');
  });
});

describe('CredentialAdapter — probe() return-shape consistency', () => {
  it('always returns a plain string, not an object', async () => {
    const adapter = new CredentialAdapter({
      project: 'flowai',
      environment: 'prod',
      expectedKeys: ['EXPECT'],
      envFallback: { HAS: 'value' },
    });
    expect(typeof await adapter.probe('HAS')).toBe('string');
    expect(typeof await adapter.probe('EXPECT')).toBe('string');
    expect(typeof await adapter.probe('GONE')).toBe('string');
    expect(['present', 'expected', 'missing']).toContain(await adapter.probe('HAS'));
    expect(['present', 'expected', 'missing']).toContain(await adapter.probe('EXPECT'));
    expect(['present', 'expected', 'missing']).toContain(await adapter.probe('GONE'));
  });
});

describe('CredentialAdapter — singleton lifecycle (isolated)', () => {
  // Each test resets the singleton so they don't bleed into other test files.
  it('throws when fetched before set', () => {
    _resetDefaultCredentialAdapter();
    expect(() => getDefaultCredentialAdapter()).toThrow(/No default CredentialAdapter set/);
  });

  it('rejects non-instance via setDefault', () => {
    _resetDefaultCredentialAdapter();
    expect(() => setDefaultCredentialAdapter({})).toThrow(/must be a CredentialAdapter instance/);
    expect(() => setDefaultCredentialAdapter(null)).toThrow(/must be a CredentialAdapter instance/);
    expect(() => setDefaultCredentialAdapter('hello')).toThrow(/must be a CredentialAdapter instance/);
  });

  it('round-trips a real instance', () => {
    _resetDefaultCredentialAdapter();
    const a = new CredentialAdapter({ project: 'flowai', environment: 'staging' });
    setDefaultCredentialAdapter(a);
    expect(getDefaultCredentialAdapter()).toBe(a);
  });

  it('reset clears the singleton', () => {
    const a = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    setDefaultCredentialAdapter(a);
    _resetDefaultCredentialAdapter();
    expect(() => getDefaultCredentialAdapter()).toThrow(/No default CredentialAdapter set/);
  });
});

describe('CredentialAdapter — clock injection', () => {
  it('uses injected clock for fetchedAt', async () => {
    const adapter = new CredentialAdapter({
      project: 'flowai',
      environment: 'prod',
      envFallback: { K: 'v' },
      clock: { now: () => 42 },
    });
    const r = await adapter.get('K');
    expect(r.fetchedAt).toBe(42);
  });
});

describe('CredentialAdapter — envFallback ignored when value is non-string or empty', () => {
  it('non-string envFallback value falls through to missing', async () => {
    const adapter = new CredentialAdapter({
      project: 'flowai', environment: 'prod',
      envFallback: { K: 123 }, // non-string
    });
    const r = await adapter.get('K');
    expect(r.status).toBe('missing');
  });

  it('empty-string envFallback value falls through to missing', async () => {
    const adapter = new CredentialAdapter({
      project: 'flowai', environment: 'prod',
      envFallback: { K: '' },
    });
    const r = await adapter.get('K');
    expect(r.status).toBe('missing');
  });
});
