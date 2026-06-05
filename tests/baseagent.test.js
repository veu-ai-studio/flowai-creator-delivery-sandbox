import { describe, it, expect } from 'vitest';
import {
  BaseAgent,
  AUTHORITY,
  isValidEnvironmentForScope,
} from '../src/lib/agents/BaseAgent.js';
import { CredentialAdapter } from '../src/lib/shared/CredentialAdapter.js';

class TestAgent extends BaseAgent {
  static charter() {
    return {
      id: 11,
      name: 'Test',
      flowAiOnly: true,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [],
      marketplaceTools: [],
      consumes: [],
      produces: [],
      escalationPolicy: 'test',
    };
  }
}

const stubDeps = {
  logger: console,
  messageBus: { publish: async () => {} },
  auditLog: { write: async () => {} },
  clock: { now: () => Date.now() },
  productScope: 'flowai',
};

describe('BaseAgent environment validation', () => {
  it('throws when environment is missing', () => {
    expect(() => new TestAgent(stubDeps)).toThrow(/environment/);
  });

  it('constructs successfully with valid environment', () => {
    const agent = new TestAgent({ ...stubDeps, environment: 'prod' });
    expect(agent.charter.id).toBe(11);
  });

  it('rejects invalid environment for flowai scope', () => {
    expect(() => new TestAgent({ ...stubDeps, environment: 'demo' }))
      .toThrow(/not valid for productScope="flowai"/);
  });

  it('isValidEnvironmentForScope: flowai accepts prod', () => {
    expect(isValidEnvironmentForScope('flowai', 'prod')).toBe(true);
  });

  it('isValidEnvironmentForScope: flowai rejects demo', () => {
    expect(isValidEnvironmentForScope('flowai', 'demo')).toBe(false);
  });

  it('isValidEnvironmentForScope: saige accepts sales-demo', () => {
    expect(isValidEnvironmentForScope('saige', 'sales-demo')).toBe(true);
  });

  it('isValidEnvironmentForScope: arbitrary runtime scope accepts product environments', () => {
    expect(isValidEnvironmentForScope('tenant-alpha-42', 'sales-demo')).toBe(true);
  });

  it('rejects malformed productScope values at construction', () => {
    expect(() => new TestAgent({ ...stubDeps, productScope: 'Bad Scope!', environment: 'prod' }))
      .toThrow(/productScope invalid/);
  });
});

describe('CredentialAdapter', () => {
  it('constructs successfully in browser-safe context', () => {
    const adapter = new CredentialAdapter({
      project: 'flowai',
      environment: 'prod',
      expectedKeys: ['SOME_API_KEY'],
    });
    expect(adapter.project).toBe('flowai');
  });

  it('probe returns "expected" for declared expected key', async () => {
    const adapter = new CredentialAdapter({
      project: 'flowai',
      environment: 'prod',
      expectedKeys: ['SOME_API_KEY'],
    });
    const status = await adapter.probe('SOME_API_KEY');
    expect(status).toBe('expected');
  });

  it('probe returns "missing" for unknown key', async () => {
    const adapter = new CredentialAdapter({
      project: 'flowai',
      environment: 'prod',
    });
    const status = await adapter.probe('UNKNOWN_KEY');
    expect(status).toBe('missing');
  });

  it('rejects underscore in providerId', () => {
    const adapter = new CredentialAdapter({ project: 'flowai', environment: 'prod' });
    return expect(adapter.getProviderSecret('bad_id', 'API_KEY'))
      .rejects.toThrow(/not slug-safe/);
  });

  it('rejects flowai with demo environment', () => {
    expect(() => new CredentialAdapter({ project: 'flowai', environment: 'demo' }))
      .toThrow(/invalid for project "flowai"/);
  });
});
