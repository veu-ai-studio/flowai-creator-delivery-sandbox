import { describe, it, expect, beforeEach } from 'vitest';
import {
  CredentialAdapter,
  getDefaultCredentialAdapter,
  setDefaultCredentialAdapter,
  _resetDefaultCredentialAdapter,
} from '../src/lib/shared/CredentialAdapter.js';
import { BaseAgent, AUTHORITY } from '../src/lib/agents/BaseAgent.js';

class StubDoppler {
  constructor(secrets) { this.secrets = secrets; this.calls = []; }
  async fetchSecret({ project, config, name }) {
    this.calls.push({ project, config, name });
    if (Object.prototype.hasOwnProperty.call(this.secrets, name)) return this.secrets[name];
    return undefined;
  }
}

class CredsAgent extends BaseAgent {
  static charter() {
    return {
      id: 11,
      name: 'CredsAgent',
      flowAiOnly: true,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: ['SOME_API_KEY'],
      marketplaceTools: [],
      consumes: [],
      produces: [],
      escalationPolicy: 'test',
    };
  }
  async plan() { return { summary: 'noop' }; }
  async act() { return { outcome: 'ok' }; }
  async fetchKey(key) { return this.deps.credentials.get(key); }
  async fetchProvider(pid, sub) { return this.deps.credentials.getProviderSecret(pid, sub); }
  async fetchCustomer(p, c, sub) { return this.deps.credentials.getCustomerSecret(p, c, sub); }
  async fetchStripe(pid) { return this.deps.credentials.getStripeConnect(pid); }
}

function buildDeps({ credentials }) {
  return {
    logger: { info() {}, warn() {}, error() {} },
    messageBus: { publish: async () => {}, subscribe: async () => {} },
    auditLog: { write: async () => {} },
    clock: { now: () => 1700000000000 },
    productScope: 'flowai',
    environment: 'prod',
    credentials,
  };
}

describe('CredentialAdapter — DI into agent deps', () => {
  it('adapter passed in deps is reachable from agent methods', async () => {
    const adapter = new CredentialAdapter({
      project: 'flowai',
      environment: 'prod',
      dopplerClient: new StubDoppler({ SOME_API_KEY: 'shhh' }),
    });
    const agent = new CredsAgent(buildDeps({ credentials: adapter }));
    const result = await agent.fetchKey('SOME_API_KEY');
    expect(result.status).toBe('present');
    expect(result.value).toBe('shhh');
    expect(result.source).toBe('doppler');
  });

  it('returns "expected" when key declared but not in vault or env fallback', async () => {
    const adapter = new CredentialAdapter({
      project: 'flowai',
      environment: 'prod',
      expectedKeys: ['SOME_API_KEY'],
    });
    const agent = new CredsAgent(buildDeps({ credentials: adapter }));
    const result = await agent.fetchKey('SOME_API_KEY');
    expect(result.status).toBe('expected');
    expect(result.value).toBe(null);
    expect(result.source).toBe('placeholder');
  });

  it('returns "missing" when key not declared and not in any source', async () => {
    const adapter = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    const agent = new CredsAgent(buildDeps({ credentials: adapter }));
    const result = await agent.fetchKey('UNKNOWN');
    expect(result.status).toBe('missing');
  });

  it('uses envFallback when doppler returns nothing', async () => {
    const adapter = new CredentialAdapter({
      project: 'flowai',
      environment: 'prod',
      envFallback: { FALLBACK_KEY: 'env-value' },
    });
    const agent = new CredsAgent(buildDeps({ credentials: adapter }));
    const result = await agent.fetchKey('FALLBACK_KEY');
    expect(result.status).toBe('present');
    expect(result.value).toBe('env-value');
    expect(result.source).toBe('env_fallback');
  });

  it('doppler errors fall through to env fallback / placeholder', async () => {
    const erroringDoppler = {
      fetchSecret: async () => { throw new Error('doppler boom'); },
    };
    const adapter = new CredentialAdapter({
      project: 'flowai',
      environment: 'prod',
      dopplerClient: erroringDoppler,
      envFallback: { FALLBACK_KEY: 'env-value' },
    });
    const agent = new CredsAgent(buildDeps({ credentials: adapter }));
    const result = await agent.fetchKey('FALLBACK_KEY');
    expect(result.status).toBe('present');
    expect(result.source).toBe('env_fallback');
  });
});

describe('CredentialAdapter provider-scoped paths', () => {
  it('builds correct provider secret path', async () => {
    const doppler = new StubDoppler({ PROVIDERS_acme_API_KEY: 'p-secret' });
    const adapter = new CredentialAdapter({
      project: 'flowai', environment: 'prod', dopplerClient: doppler,
    });
    const agent = new CredsAgent(buildDeps({ credentials: adapter }));
    const r = await agent.fetchProvider('acme', 'API_KEY');
    expect(r.status).toBe('present');
    expect(r.value).toBe('p-secret');
    expect(doppler.calls.at(-1)).toEqual({
      project: 'flowai', config: 'prod', name: 'PROVIDERS_acme_API_KEY',
    });
  });

  it('rejects providerId with underscore', async () => {
    const adapter = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    const agent = new CredsAgent(buildDeps({ credentials: adapter }));
    await expect(agent.fetchProvider('bad_id', 'API_KEY'))
      .rejects.toThrow(/not slug-safe/);
  });

  it('rejects empty providerId', async () => {
    const adapter = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    const agent = new CredsAgent(buildDeps({ credentials: adapter }));
    await expect(agent.fetchProvider('', 'API_KEY'))
      .rejects.toThrow(/non-empty string/);
  });
});

describe('CredentialAdapter customer-scoped paths', () => {
  it('builds correct customer secret path', async () => {
    const doppler = new StubDoppler({ CUSTOMERS_acme_cust1_TOKEN: 'c-secret' });
    const adapter = new CredentialAdapter({
      project: 'flowai', environment: 'prod', dopplerClient: doppler,
    });
    const agent = new CredsAgent(buildDeps({ credentials: adapter }));
    const r = await agent.fetchCustomer('acme', 'cust1', 'TOKEN');
    expect(r.status).toBe('present');
    expect(doppler.calls.at(-1).name).toBe('CUSTOMERS_acme_cust1_TOKEN');
  });

  it('rejects customerId with underscore', async () => {
    const adapter = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    const agent = new CredsAgent(buildDeps({ credentials: adapter }));
    await expect(agent.fetchCustomer('acme', 'bad_id', 'TOKEN'))
      .rejects.toThrow(/customerId.*not slug-safe/);
  });
});

describe('CredentialAdapter Stripe Connect', () => {
  it('builds correct Stripe Connect path', async () => {
    const doppler = new StubDoppler({ STRIPE_CONNECT_acme: 'acct_xxx' });
    const adapter = new CredentialAdapter({
      project: 'flowai', environment: 'prod', dopplerClient: doppler,
    });
    const agent = new CredsAgent(buildDeps({ credentials: adapter }));
    const r = await agent.fetchStripe('acme');
    expect(r.value).toBe('acct_xxx');
    expect(doppler.calls.at(-1).name).toBe('STRIPE_CONNECT_acme');
  });
});

describe('CredentialAdapter probe', () => {
  it('returns plain status string for present/expected/missing', async () => {
    const doppler = new StubDoppler({ HAS: 'value' });
    const adapter = new CredentialAdapter({
      project: 'flowai', environment: 'prod',
      dopplerClient: doppler,
      expectedKeys: ['EXPECT'],
    });
    expect(await adapter.probe('HAS')).toBe('present');
    expect(await adapter.probe('EXPECT')).toBe('expected');
    expect(await adapter.probe('GONE')).toBe('missing');
  });
});

describe('CredentialAdapter getAll', () => {
  it('returns map of statuses for an array of keys', async () => {
    const doppler = new StubDoppler({ A: 'a-val' });
    const adapter = new CredentialAdapter({
      project: 'flowai', environment: 'prod',
      dopplerClient: doppler,
      expectedKeys: ['B'],
    });
    const out = await adapter.getAll(['A', 'B', 'C']);
    expect(out.A.status).toBe('present');
    expect(out.B.status).toBe('expected');
    expect(out.C.status).toBe('missing');
  });

  it('rejects non-array input', async () => {
    const adapter = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    await expect(adapter.getAll('A')).rejects.toThrow(/keys must be array/);
  });
});

describe('CredentialAdapter declareExpected', () => {
  it('promotes a previously-missing key to "expected"', async () => {
    const adapter = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    expect(await adapter.probe('LATE_KEY')).toBe('missing');
    adapter.declareExpected(['LATE_KEY']);
    expect(await adapter.probe('LATE_KEY')).toBe('expected');
  });
});

describe('CredentialAdapter default singleton', () => {
  beforeEach(() => { _resetDefaultCredentialAdapter(); });

  it('throws if accessed before set', () => {
    expect(() => getDefaultCredentialAdapter()).toThrow(/No default CredentialAdapter set/);
  });

  it('rejects setting a non-instance', () => {
    expect(() => setDefaultCredentialAdapter({})).toThrow(/must be a CredentialAdapter instance/);
  });

  it('round-trips a real instance', () => {
    const a = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    setDefaultCredentialAdapter(a);
    expect(getDefaultCredentialAdapter()).toBe(a);
  });
});

describe('CredentialAdapter project/environment validation', () => {
  it('rejects unknown project', () => {
    expect(() => new CredentialAdapter({ project: 'bogus', environment: 'prod' }))
      .toThrow(/unknown project/);
  });

  it('rejects flowai with demo env', () => {
    expect(() => new CredentialAdapter({ project: 'flowai', environment: 'demo' }))
      .toThrow(/invalid for project "flowai"/);
  });

  it('accepts saige with sales-demo', () => {
    const a = new CredentialAdapter({ project: 'saige', environment: 'sales-demo' });
    expect(a.project).toBe('saige');
  });
});
