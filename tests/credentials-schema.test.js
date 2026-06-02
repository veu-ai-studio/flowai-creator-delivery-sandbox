// Tests for /src/lib/credentials/CredentialAdapter.ts (W1 schema layer).
// Companion to tests/credentialadapter-edge.test.js and
// tests/credentialadapter-integration.test.js (which test the W5 runtime
// adapter at /src/lib/shared/CredentialAdapter.js).
//
// Source: /src/lib/credentials/CredentialAdapter.ts

import { describe, it, expect } from 'vitest';
import {
  CREDENTIAL_CATALOG,
  REGISTRY_KEY_ALIASES,
  RuntimeCredentialAdapter,
  _resetDefaultCredentialAdapter,
  assertNoHardcodedSecrets,
  bindAgentCredentials,
  getDefaultCredentialAdapter,
  listAllRequiredCredentials,
  listRequiredCredentialsForAgent,
  normalizeCredentialKey,
  setDefaultCredentialAdapter,
  validateCredentialSchema,
} from '../src/lib/credentials/CredentialAdapter.ts';
import { AGENT_REGISTRY } from '../src/lib/agents/_registry.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Module-load + exports
// ─────────────────────────────────────────────────────────────────────────────

describe('credentials/CredentialAdapter — exports', () => {
  it('exports the catalog as a non-empty frozen object', () => {
    expect(typeof CREDENTIAL_CATALOG).toBe('object');
    expect(Object.isFrozen(CREDENTIAL_CATALOG)).toBe(true);
    expect(Object.keys(CREDENTIAL_CATALOG).length).toBeGreaterThan(0);
  });

  it('exports the registry-key-alias map as a frozen object', () => {
    expect(typeof REGISTRY_KEY_ALIASES).toBe('object');
    expect(Object.isFrozen(REGISTRY_KEY_ALIASES)).toBe(true);
  });

  it('exports the binding + listing helpers', () => {
    expect(typeof bindAgentCredentials).toBe('function');
    expect(typeof listRequiredCredentialsForAgent).toBe('function');
    expect(typeof listAllRequiredCredentials).toBe('function');
    expect(typeof normalizeCredentialKey).toBe('function');
    expect(typeof validateCredentialSchema).toBe('function');
    expect(typeof assertNoHardcodedSecrets).toBe('function');
  });

  it('re-exports the W5 RuntimeCredentialAdapter and singleton helpers', () => {
    expect(typeof RuntimeCredentialAdapter).toBe('function');
    expect(typeof getDefaultCredentialAdapter).toBe('function');
    expect(typeof setDefaultCredentialAdapter).toBe('function');
    expect(typeof _resetDefaultCredentialAdapter).toBe('function');
  });

  it('module-load schema validation passes (no throw on import)', () => {
    // If the module imported, the validator already ran. Re-call to be sure
    // it's idempotent and still passes.
    expect(() => validateCredentialSchema()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CREDENTIAL_CATALOG shape integrity
// ─────────────────────────────────────────────────────────────────────────────

describe('CREDENTIAL_CATALOG shape', () => {
  it('every map key matches its descriptor.key', () => {
    for (const [k, d] of Object.entries(CREDENTIAL_CATALOG)) {
      expect(d.key).toBe(k);
    }
  });

  it('every descriptor has the required fields', () => {
    for (const d of Object.values(CREDENTIAL_CATALOG)) {
      expect(typeof d.key).toBe('string');
      expect(d.key.length).toBeGreaterThan(0);
      expect(typeof d.purpose).toBe('string');
      expect(d.purpose.length).toBeGreaterThan(0);
      expect(Array.isArray(d.requiredForAgents)).toBe(true);
      expect(['doppler', 'env_fallback']).toContain(d.source);
    }
  });

  it('every descriptor.requiredForAgents id is in 1..26', () => {
    for (const d of Object.values(CREDENTIAL_CATALOG)) {
      for (const id of d.requiredForAgents) {
        expect(Number.isInteger(id)).toBe(true);
        expect(id).toBeGreaterThanOrEqual(1);
        expect(id).toBeLessThanOrEqual(26);
      }
    }
  });

  it('every descriptor + requiredForAgents array is frozen', () => {
    for (const d of Object.values(CREDENTIAL_CATALOG)) {
      expect(Object.isFrozen(d)).toBe(true);
      expect(Object.isFrozen(d.requiredForAgents)).toBe(true);
    }
  });

  it('catalog covers ANTHROPIC_API_KEY, BROWSERLESS_API_KEY, CLOUDFLARE_API_TOKEN', () => {
    expect(CREDENTIAL_CATALOG.ANTHROPIC_API_KEY).toBeTruthy();
    expect(CREDENTIAL_CATALOG.BROWSERLESS_API_KEY).toBeTruthy();
    expect(CREDENTIAL_CATALOG.CLOUDFLARE_API_TOKEN).toBeTruthy();
  });

  it('catalog covers OPENAI_API_KEY and VERCEL_TOKEN even though no agent declares them', () => {
    // Listed for inventory completeness; required_for_agents may be empty.
    expect(CREDENTIAL_CATALOG.OPENAI_API_KEY).toBeTruthy();
    expect(CREDENTIAL_CATALOG.VERCEL_TOKEN).toBeTruthy();
  });

  it('does not embed any literal secret value as a catalog key', () => {
    // Catalog keys must look like env-var names (UPPER_SNAKE_CASE), never values.
    for (const k of Object.keys(CREDENTIAL_CATALOG)) {
      expect(/^[A-Z][A-Z0-9_]+$/.test(k)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY_KEY_ALIASES + normalizeCredentialKey
// ─────────────────────────────────────────────────────────────────────────────

describe('REGISTRY_KEY_ALIASES + normalizeCredentialKey', () => {
  it('maps BROWSERLESS_TOKEN -> BROWSERLESS_API_KEY', () => {
    expect(REGISTRY_KEY_ALIASES.BROWSERLESS_TOKEN).toBe('BROWSERLESS_API_KEY');
    expect(normalizeCredentialKey('BROWSERLESS_TOKEN')).toBe('BROWSERLESS_API_KEY');
  });

  it('passes through unaliased keys unchanged', () => {
    expect(normalizeCredentialKey('ANTHROPIC_API_KEY')).toBe('ANTHROPIC_API_KEY');
    expect(normalizeCredentialKey('CLOUDFLARE_API_TOKEN')).toBe('CLOUDFLARE_API_TOKEN');
    expect(normalizeCredentialKey('SOMETHING_ELSE')).toBe('SOMETHING_ELSE');
  });

  it('every alias target exists in CREDENTIAL_CATALOG', () => {
    for (const target of Object.values(REGISTRY_KEY_ALIASES)) {
      expect(Object.prototype.hasOwnProperty.call(CREDENTIAL_CATALOG, target)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listRequiredCredentialsForAgent
// ─────────────────────────────────────────────────────────────────────────────

describe('listRequiredCredentialsForAgent', () => {
  it('returns frozen array', () => {
    const list = listRequiredCredentialsForAgent(6);
    expect(Object.isFrozen(list)).toBe(true);
  });

  it('returns the canonical names (not raw registry aliases) for agent #6', () => {
    // Agent #6 (Research) declares BROWSERLESS_TOKEN in the registry —
    // alias-normalized to BROWSERLESS_API_KEY.
    const list = listRequiredCredentialsForAgent(6);
    expect(list).toContain('BROWSERLESS_API_KEY');
    expect(list).toContain('ANTHROPIC_API_KEY');
    expect(list).not.toContain('BROWSERLESS_TOKEN');
  });

  it('returns an empty list for agents that declare no credentials', () => {
    // Agents 1, 2, 3, 4, 5, 10, 12, 16, 20 declare no credentials in the
    // current registry. Spot-check a couple.
    expect(listRequiredCredentialsForAgent(1)).toEqual([]);
    expect(listRequiredCredentialsForAgent(10)).toEqual([]);
    expect(listRequiredCredentialsForAgent(20)).toEqual([]);
  });

  it('returns ANTHROPIC_API_KEY for the LLM-using step-owners (7, 8, 9)', () => {
    expect(listRequiredCredentialsForAgent(7)).toEqual(['ANTHROPIC_API_KEY']);
    expect(listRequiredCredentialsForAgent(8)).toEqual(['ANTHROPIC_API_KEY']);
    expect(listRequiredCredentialsForAgent(9)).toEqual(['ANTHROPIC_API_KEY']);
  });

  it('returns CLOUDFLARE_API_TOKEN for agent #13 Self-Protection', () => {
    expect(listRequiredCredentialsForAgent(13)).toEqual(['CLOUDFLARE_API_TOKEN']);
  });

  it('throws on unknown agent id', () => {
    expect(() => listRequiredCredentialsForAgent(0)).toThrow(/unknown agent id 0/);
    expect(() => listRequiredCredentialsForAgent(26)).not.toThrow();
    expect(() => listRequiredCredentialsForAgent(27)).toThrow(/unknown agent id 27/);
    expect(() => listRequiredCredentialsForAgent(-1)).toThrow(/unknown agent id -1/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listAllRequiredCredentials
// ─────────────────────────────────────────────────────────────────────────────

describe('listAllRequiredCredentials', () => {
  it('returns sorted, deduped union across all 26 agents', () => {
    const all = listAllRequiredCredentials();
    expect(Object.isFrozen(all)).toBe(true);
    expect(all).toEqual([...all].sort());
    const set = new Set(all);
    expect(set.size).toBe(all.length); // deduplicated
  });

  it('includes only canonical (alias-normalized) keys', () => {
    const all = listAllRequiredCredentials();
    expect(all).not.toContain('BROWSERLESS_TOKEN');
    expect(all).toContain('BROWSERLESS_API_KEY');
  });

  it('includes ANTHROPIC_API_KEY (declared by 10 agents)', () => {
    expect(listAllRequiredCredentials()).toContain('ANTHROPIC_API_KEY');
  });

  it('includes CLOUDFLARE_API_TOKEN (declared by agent #13)', () => {
    expect(listAllRequiredCredentials()).toContain('CLOUDFLARE_API_TOKEN');
  });

  it('every returned key resolves in CREDENTIAL_CATALOG', () => {
    for (const k of listAllRequiredCredentials()) {
      expect(Object.prototype.hasOwnProperty.call(CREDENTIAL_CATALOG, k)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// bindAgentCredentials
// ─────────────────────────────────────────────────────────────────────────────

function makeAdapterStub(secrets = {}, expectedKeys = []) {
  // Minimal stub that mimics the W5 RuntimeCredentialAdapter surface
  // bindAgentCredentials touches: get(key) and declareExpected(keys).
  const declared = new Set(expectedKeys);
  return {
    declared,
    declareExpected(keys) {
      for (const k of keys) declared.add(k);
    },
    async get(key) {
      const at = 1700000000000;
      const path = { project: 'flowai', config: 'prod', secret: key };
      if (Object.prototype.hasOwnProperty.call(secrets, key)) {
        return Object.freeze({
          status: 'present',
          value: secrets[key],
          source: 'doppler',
          fetchedAt: at,
          path,
        });
      }
      if (declared.has(key)) {
        return Object.freeze({
          status: 'expected',
          value: null,
          source: 'placeholder',
          fetchedAt: at,
          path,
        });
      }
      return Object.freeze({
        status: 'missing',
        value: null,
        source: 'placeholder',
        fetchedAt: at,
        path,
      });
    },
  };
}

describe('bindAgentCredentials — input validation', () => {
  it('rejects non-integer / out-of-range agent ids', async () => {
    const adapter = makeAdapterStub();
    await expect(bindAgentCredentials(0, adapter)).rejects.toThrow(/integer 1\.\.26/);
    await expect(bindAgentCredentials(27, adapter)).rejects.toThrow(/integer 1\.\.26/);
    await expect(bindAgentCredentials(1.5, adapter)).rejects.toThrow(/integer 1\.\.26/);
    await expect(bindAgentCredentials(26, adapter)).resolves.toBeDefined();
  });

  it('rejects adapters without a get() method', async () => {
    await expect(bindAgentCredentials(6, null)).rejects.toThrow(/adapter must implement get/);
    await expect(bindAgentCredentials(6, {})).rejects.toThrow(/adapter must implement get/);
  });
});

describe('bindAgentCredentials — empty-credential agents', () => {
  it('agent #1 (Lifecycle Engine) has no required credentials', async () => {
    const adapter = makeAdapterStub();
    const binding = await bindAgentCredentials(1, adapter);
    expect(binding.agentId).toBe(1);
    expect(binding.required).toEqual([]);
    expect(binding.present).toEqual([]);
    expect(binding.expected).toEqual([]);
    expect(binding.missing).toEqual([]);
    expect(binding.records).toEqual({});
  });
});

describe('bindAgentCredentials — present path', () => {
  it('agent #6 with both credentials present in vault', async () => {
    const adapter = makeAdapterStub({
      ANTHROPIC_API_KEY: 'ant-secret',
      BROWSERLESS_API_KEY: 'br-secret',
    });
    const binding = await bindAgentCredentials(6, adapter);
    expect(binding.agentId).toBe(6);
    expect(new Set(binding.required)).toEqual(new Set(['ANTHROPIC_API_KEY', 'BROWSERLESS_API_KEY']));
    expect(new Set(binding.present)).toEqual(new Set(['ANTHROPIC_API_KEY', 'BROWSERLESS_API_KEY']));
    expect(binding.expected).toEqual([]);
    expect(binding.missing).toEqual([]);
    expect(binding.records.ANTHROPIC_API_KEY.value).toBe('ant-secret');
    expect(binding.records.BROWSERLESS_API_KEY.value).toBe('br-secret');
  });
});

describe('bindAgentCredentials — expected path (declared but unset)', () => {
  it('agent #6 with neither credential present — both report expected', async () => {
    const adapter = makeAdapterStub({});
    const binding = await bindAgentCredentials(6, adapter);
    expect(binding.present).toEqual([]);
    // bindAgentCredentials calls declareExpected, so they should be 'expected', not 'missing'
    expect(new Set(binding.expected)).toEqual(new Set(['ANTHROPIC_API_KEY', 'BROWSERLESS_API_KEY']));
    expect(binding.missing).toEqual([]);
    expect(binding.records.ANTHROPIC_API_KEY.value).toBeNull();
    expect(binding.records.ANTHROPIC_API_KEY.status).toBe('expected');
  });
});

describe('bindAgentCredentials — mixed path', () => {
  it('agent #6 with one credential present, other missing — produces expected for the unset one', async () => {
    const adapter = makeAdapterStub({ ANTHROPIC_API_KEY: 'ant-secret' });
    const binding = await bindAgentCredentials(6, adapter);
    expect(binding.present).toEqual(['ANTHROPIC_API_KEY']);
    expect(binding.expected).toEqual(['BROWSERLESS_API_KEY']);
    expect(binding.missing).toEqual([]);
  });
});

describe('bindAgentCredentials — alias normalization', () => {
  it('always asks the adapter for canonical keys (not legacy aliases)', async () => {
    const calls = [];
    const adapter = {
      declareExpected() {},
      async get(key) {
        calls.push(key);
        return {
          status: 'missing',
          value: null,
          source: 'placeholder',
          fetchedAt: 0,
          path: { project: 'flowai', config: 'prod', secret: key },
        };
      },
    };
    await bindAgentCredentials(6, adapter);
    // Agent #6 declares BROWSERLESS_TOKEN in the registry, but the adapter
    // should be asked for BROWSERLESS_API_KEY (the canonical name).
    expect(calls).toContain('BROWSERLESS_API_KEY');
    expect(calls).not.toContain('BROWSERLESS_TOKEN');
  });
});

describe('bindAgentCredentials — adapter without declareExpected', () => {
  it('still binds correctly (declareExpected is optional)', async () => {
    const adapter = {
      async get() {
        return {
          status: 'missing',
          value: null,
          source: 'placeholder',
          fetchedAt: 0,
          path: { project: 'flowai', config: 'prod', secret: 'X' },
        };
      },
    };
    const binding = await bindAgentCredentials(7, adapter);
    expect(binding.required).toEqual(['ANTHROPIC_API_KEY']);
    // No declareExpected → keys land in 'missing', not 'expected'
    expect(binding.missing).toEqual(['ANTHROPIC_API_KEY']);
    expect(binding.expected).toEqual([]);
  });
});

describe('bindAgentCredentials — frozen result shape', () => {
  it('returns a deeply-frozen binding', async () => {
    const adapter = makeAdapterStub();
    const binding = await bindAgentCredentials(6, adapter);
    expect(Object.isFrozen(binding)).toBe(true);
    expect(Object.isFrozen(binding.records)).toBe(true);
    expect(Object.isFrozen(binding.required)).toBe(true);
    expect(Object.isFrozen(binding.present)).toBe(true);
    expect(Object.isFrozen(binding.expected)).toBe(true);
    expect(Object.isFrozen(binding.missing)).toBe(true);
    for (const r of Object.values(binding.records)) {
      expect(Object.isFrozen(r)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateCredentialSchema (already runs on import, but re-check explicitly)
// ─────────────────────────────────────────────────────────────────────────────

describe('validateCredentialSchema', () => {
  it('passes against the current registry + catalog', () => {
    expect(() => validateCredentialSchema()).not.toThrow();
  });

  it('the catalog inverse-index agrees with the registry forward-index', () => {
    // For every (catalog entry, agent id in requiredForAgents), the agent
    // should declare that credential (alias-normalized).
    for (const d of Object.values(CREDENTIAL_CATALOG)) {
      for (const agentId of d.requiredForAgents) {
        const agent = AGENT_REGISTRY.find((a) => a.id === agentId);
        expect(agent).toBeTruthy();
        const declared = agent.requiredCredentials.map(normalizeCredentialKey);
        expect(declared).toContain(d.key);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// assertNoHardcodedSecrets
// ─────────────────────────────────────────────────────────────────────────────

describe('assertNoHardcodedSecrets', () => {
  it('passes through non-strings unchanged', () => {
    expect(assertNoHardcodedSecrets(null)).toBeNull();
    expect(assertNoHardcodedSecrets(undefined)).toBeUndefined();
    expect(assertNoHardcodedSecrets(123)).toBe(123);
    const obj = {};
    expect(assertNoHardcodedSecrets(obj)).toBe(obj);
  });

  it('returns the value unchanged on success', () => {
    expect(assertNoHardcodedSecrets('ANTHROPIC_API_KEY')).toBe('ANTHROPIC_API_KEY');
    expect(assertNoHardcodedSecrets('safe-string-value')).toBe('safe-string-value');
    expect(assertNoHardcodedSecrets('')).toBe('');
  });

  it('rejects the known committed plaintext literal', () => {
    expect(() => assertNoHardcodedSecrets('flowai-webhook-secret')).toThrow(/known-committed plaintext/);
  });

  it('rejects strings that contain the known committed literal as a substring', () => {
    expect(() => assertNoHardcodedSecrets('hello flowai-webhook-secret world')).toThrow(/known-committed plaintext/);
  });

  it('rejects Stripe-style sk_live_ tokens', () => {
    expect(() => assertNoHardcodedSecrets('sk_live_abcdefghij1234567890')).toThrow(
      /known vendor secret pattern/,
    );
  });

  it('rejects Stripe-style sk_test_ tokens', () => {
    expect(() => assertNoHardcodedSecrets('sk_test_abcdefghij1234567890')).toThrow(
      /known vendor secret pattern/,
    );
  });

  it('rejects AWS-style AKIA* access keys', () => {
    expect(() => assertNoHardcodedSecrets('AKIAIOSFODNN7EXAMPLE')).toThrow(
      /known vendor secret pattern/,
    );
  });

  it('rejects GitHub-style ghp_ personal access tokens', () => {
    expect(() => assertNoHardcodedSecrets('ghp_abcdefghijklmnopqrstuvwxyz0123456789')).toThrow(
      /known vendor secret pattern/,
    );
  });

  it('attaches the supplied context to the error', () => {
    expect(() => assertNoHardcodedSecrets('flowai-webhook-secret', 'WebhookPanel.WEBHOOK_SECRET')).toThrow(
      /WebhookPanel\.WEBHOOK_SECRET/,
    );
  });

  it('does NOT reject short identifier-shaped strings (catalog keys)', () => {
    // Catalog keys themselves are env-var names, not secret values.
    expect(() => assertNoHardcodedSecrets('ANTHROPIC_API_KEY')).not.toThrow();
    expect(() => assertNoHardcodedSecrets('VERCEL_TOKEN')).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Re-exported W5 surface — sanity smoke (full coverage lives in the W5 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('W5 re-exports — smoke', () => {
  it('RuntimeCredentialAdapter constructs with valid project + environment', () => {
    const a = new RuntimeCredentialAdapter({ project: 'flowai', environment: 'prod' });
    expect(a.project).toBe('flowai');
    expect(a.environment).toBe('prod');
  });

  it('singleton helpers cooperate across the re-export', () => {
    _resetDefaultCredentialAdapter();
    expect(() => getDefaultCredentialAdapter()).toThrow(/No default CredentialAdapter set/);
    const a = new RuntimeCredentialAdapter({ project: 'flowai', environment: 'staging' });
    setDefaultCredentialAdapter(a);
    expect(getDefaultCredentialAdapter()).toBe(a);
    _resetDefaultCredentialAdapter();
  });

  it('RuntimeCredentialAdapter end-to-end works for bindAgentCredentials', async () => {
    // Use the real W5 adapter with envFallback to exercise the full path.
    const a = new RuntimeCredentialAdapter({
      project: 'flowai',
      environment: 'prod',
      envFallback: { ANTHROPIC_API_KEY: 'env-ant', BROWSERLESS_API_KEY: 'env-br' },
    });
    const binding = await bindAgentCredentials(6, a);
    expect(new Set(binding.present)).toEqual(new Set(['ANTHROPIC_API_KEY', 'BROWSERLESS_API_KEY']));
    expect(binding.records.ANTHROPIC_API_KEY.value).toBe('env-ant');
    expect(binding.records.ANTHROPIC_API_KEY.source).toBe('env_fallback');
  });
});
