// W3 — Per-evaluator red/green fixture tests.
//
// Verifies that each of the 10 doable-now evaluators:
//   - returns null + no_evidence on empty ctx (no false-greens),
//   - scores 100 on a green fixture (clean evidence),
//   - scores < 100 on a red fixture (broken evidence).
//
// Verifies that the 3 deferred evaluators:
//   - return null + status='deferred' + reason='deferred-pending-*'.

import { describe, it, expect } from 'vitest';
import authority from '../src/lib/audits/criteria/governance/authority.js';
import auditCompleteness from '../src/lib/audits/criteria/governance/audit_completeness.js';
import charterContract from '../src/lib/audits/criteria/governance/charter_contract.js';
import messageSchema from '../src/lib/audits/criteria/governance/message_schema.js';
import escalation from '../src/lib/audits/criteria/governance/escalation.js';
import secretsHygiene from '../src/lib/audits/criteria/governance/secrets_hygiene.js';
import ipProtection from '../src/lib/audits/criteria/governance/ip_protection.js';
import functional from '../src/lib/audits/criteria/readiness/functional.js';
import failureHandling from '../src/lib/audits/criteria/readiness/failure_handling.js';
import dependencies from '../src/lib/audits/criteria/readiness/dependencies.js';
import documentation from '../src/lib/audits/criteria/readiness/documentation.js';
import performance from '../src/lib/audits/criteria/readiness/performance.js';
import observability from '../src/lib/audits/criteria/readiness/observability.js';

const target = { type: 'agent', id: 11 };
const NOW = 1715000000000;

function emptyCtx() {
  return {
    auditLog: { query: async () => [] },
    messageBus: { query: async () => [], listTopics: async () => [], getTopicHealth: async () => ({ exists: false }) },
    registry: { getActiveAgents: async () => [], getCharter: async () => null, getSchemaFor: async () => null, validatePayload: () => true },
    auditChain: { verifyRange: async () => ({ ok: true, breaks: [] }) },
    errorLog: { query: async () => [] },
    baseAgentRuns: { query: async () => [] },
    clock: { now: () => NOW },
    windowMs: 86400000,
    env: { mode: 'prod' },
  };
}

describe('gov.audit_completeness — falsifiable', () => {
  it('empty ctx → null + NO_RUN_EVIDENCE', async () => {
    const r = await auditCompleteness(target, emptyCtx());
    expect(r.score).toBeNull();
    expect(r.status).toBe('no_evidence');
    expect(r.reason).toBe('NO_RUN_EVIDENCE');
  });

  it('green fixture → score 100', async () => {
    const ctx = emptyCtx();
    const runs = [{ run_id: 'r1' }, { run_id: 'r2' }, { run_id: 'r3' }];
    ctx.baseAgentRuns.query = async () => runs;
    ctx.auditLog.query = async () => [
      { run_id: 'r1', event_type: 'RUN_START' },
      { run_id: 'r1', event_type: 'RUN_COMPLETE' },
      { run_id: 'r2', event_type: 'RUN_START' },
      { run_id: 'r2', event_type: 'RUN_COMPLETE' },
      { run_id: 'r3', event_type: 'RUN_START' },
      { run_id: 'r3', event_type: 'RUN_COMPLETE' },
    ];
    ctx.messageBus.query = async () => runs.map(r => ({ run_id: r.run_id, topic: 't.a' }));
    const r = await auditCompleteness(target, ctx);
    expect(r.score).toBe(100);
    expect(r.status).toBe('measured');
  });

  it('red fixture (chain break + missing terminal) → score < 50', async () => {
    const ctx = emptyCtx();
    const runs = [{ run_id: 'r1' }, { run_id: 'r2' }, { run_id: 'r3' }];
    ctx.baseAgentRuns.query = async () => runs;
    ctx.auditLog.query = async () => [
      { run_id: 'r1', event_type: 'RUN_START' },
      { run_id: 'r1', event_type: 'RUN_COMPLETE' },
      { run_id: 'r2', event_type: 'RUN_START' }, // no terminal
      // r3 entirely missing from audit log
    ];
    ctx.messageBus.query = async () => [{ run_id: 'r1', topic: 't.a' }];
    ctx.auditChain.verifyRange = async () => ({ ok: false, breaks: [{ row: 7 }] });
    const r = await auditCompleteness(target, ctx);
    expect(r.score).toBeLessThan(50);
    const codes = r.findings.map(f => f.code);
    expect(codes).toContain('MISSING_TERMINAL_EVENT');
    expect(codes).toContain('AUDIT_CHAIN_INVALID');
  });
});

describe('gov.authority — falsifiable', () => {
  it('empty ctx → null + NO_AUTHORITY_EVIDENCE', async () => {
    const r = await authority(target, emptyCtx());
    expect(r.score).toBeNull();
    expect(r.reason).toBe('NO_AUTHORITY_EVIDENCE');
  });

  it('green fixture → score 100', async () => {
    const ctx = emptyCtx();
    ctx.registry.getCharter = async () => ({
      authority_tier: 'AUTO_WRITE_INTERNAL',
      produces_topics: ['t.allowed'],
    });
    ctx.auditLog.query = async () => [
      { event_type: 'authority.action', payload: { authority_required: 'RECOMMEND_ONLY' }, actor_tier: 'AUTO_WRITE_INTERNAL' },
    ];
    ctx.messageBus.query = async () => [{ topic: 't.allowed' }];
    const r = await authority(target, ctx);
    expect(r.score).toBe(100);
  });

  it('red fixture (tier escalation) → score ≤ 60', async () => {
    const ctx = emptyCtx();
    ctx.registry.getCharter = async () => ({
      authority_tier: 'RECOMMEND_ONLY',          // T1
      produces_topics: ['t.allowed'],
    });
    ctx.auditLog.query = async () => [
      { event_type: 'authority.action', payload: { authority_required: 'AUTO_WRITE_INTERNAL' }, actor_tier: 'RECOMMEND_ONLY' },
    ];
    ctx.messageBus.query = async () => [];
    const r = await authority(target, ctx);
    expect(r.score).toBeLessThanOrEqual(60);
    expect(r.findings.map(f => f.code)).toContain('TIER_ESCALATION');
  });
});

describe('gov.charter_contract — falsifiable', () => {
  it('empty ctx → null + NO_ACTIVE_AGENT_CHARTERS', async () => {
    const r = await charterContract(target, emptyCtx());
    expect(r.score).toBeNull();
    expect(r.reason).toBe('NO_ACTIVE_AGENT_CHARTERS');
  });

  it('green fixture → score 100', async () => {
    const ctx = emptyCtx();
    ctx.registry.getActiveAgents = async () => [{
      agent_id: 'a1', owner: 'team', purpose: 'do x', authority_tier: 'AUTO_WRITE_INTERNAL', mode: 'auto',
      consumes_topics: ['t.in'], produces_topics: ['t.out'], escalation_policy: 'page',
      contract_hash: 'abc', charter_version: 'v1',
    }];
    ctx.auditLog.query = async () => [{ payload: { contract_hash: 'abc' } }];
    ctx.messageBus.listTopics = async () => ['t.in', 't.out'];
    ctx.messageBus.query = async () => [{ topic: 't.out' }];
    const r = await charterContract(target, ctx);
    expect(r.score).toBe(100);
  });

  it('red fixture (missing field + hash mismatch) → score < 100', async () => {
    const ctx = emptyCtx();
    ctx.registry.getActiveAgents = async () => [{
      agent_id: 'a1', owner: 'team', purpose: 'do x', authority_tier: 'AUTO_WRITE_INTERNAL', mode: 'auto',
      consumes_topics: ['t.in'], produces_topics: ['t.out'],
      // escalation_policy missing
      contract_hash: 'abc', charter_version: 'v1',
    }];
    ctx.auditLog.query = async () => [{ payload: { contract_hash: 'xyz' } }];  // mismatch
    ctx.messageBus.listTopics = async () => ['t.in', 't.out'];
    ctx.messageBus.query = async () => [];
    const r = await charterContract(target, ctx);
    expect(r.score).toBeLessThan(100);
    const codes = r.findings.map(f => f.code);
    expect(codes).toContain('MISSING_REQUIRED_FIELD');
  });
});

describe('gov.message_schema — falsifiable', () => {
  it('empty ctx → null + NO_MESSAGE_EVIDENCE', async () => {
    const r = await messageSchema(target, emptyCtx());
    expect(r.score).toBeNull();
    expect(r.reason).toBe('NO_MESSAGE_EVIDENCE');
  });

  it('green fixture → score 100', async () => {
    const ctx = emptyCtx();
    ctx.registry.getCharter = async () => ({ produces_topics: ['t.ok'] });
    ctx.registry.getSchemaFor = async () => ({ type: 'object' });
    ctx.registry.validatePayload = () => true;
    ctx.messageBus.query = async () => [{
      message_id: 'm1', run_id: 'r1', topic: 't.ok', producer_agent_id: 11,
      schema_version: 'v1', published_at: NOW, payload: {},
    }];
    const r = await messageSchema(target, ctx);
    expect(r.score).toBe(100);
  });

  it('red fixture (3 invalid messages) → score < 100', async () => {
    const ctx = emptyCtx();
    ctx.registry.getCharter = async () => ({ produces_topics: ['t.ok'] });
    ctx.registry.getSchemaFor = async () => ({ type: 'object' });
    ctx.registry.validatePayload = () => false;
    ctx.messageBus.query = async () => [
      { message_id: 'm1', run_id: null,  topic: 't.ok',         producer_agent_id: 11, schema_version: 'v1', published_at: NOW, payload: {} }, // missing run_id
      { message_id: 'm2', run_id: 'r2',  topic: 't.undeclared', producer_agent_id: 11, schema_version: 'v1', published_at: NOW, payload: {} }, // undeclared
      { message_id: 'm3', run_id: 'r3',  topic: 't.ok',         producer_agent_id: 11, schema_version: 'v1', published_at: NOW, payload: {} }, // schema invalid
    ];
    const r = await messageSchema(target, ctx);
    expect(r.score).toBeLessThan(100);
  });
});

describe('gov.escalation — falsifiable', () => {
  it('empty ctx → null + NO_ESCALATION_TRIGGER_EVIDENCE', async () => {
    const r = await escalation(target, emptyCtx());
    expect(r.score).toBeNull();
    expect(r.reason).toBe('NO_ESCALATION_TRIGGER_EVIDENCE');
  });

  it('green fixture → score 100', async () => {
    const ctx = emptyCtx();
    ctx.auditLog.query = async () => [
      { id: 't1', severity: 'high', ts: NOW, event_type: 'error' },
      { event_type: 'governance.escalated', ts: NOW + 60_000, payload: { source_event_id: 't1', escalation_target: 'on-call' } },
    ];
    const r = await escalation(target, ctx);
    expect(r.score).toBe(100);
  });

  it('red fixture (trigger without escalation) → score < 100', async () => {
    const ctx = emptyCtx();
    ctx.auditLog.query = async () => [
      { id: 't1', severity: 'high', ts: NOW, event_type: 'error', code: 'AUTHORITY_DENIED' },
    ];
    const r = await escalation(target, ctx);
    expect(r.score).toBeLessThan(100);
    expect(r.findings.map(f => f.code)).toContain('ESCALATION_MISSING_OR_LATE');
  });
});

describe('gov.secrets_hygiene — falsifiable', () => {
  it('empty ctx → null + NO_SECRET_SCAN_EVIDENCE', async () => {
    const r = await secretsHygiene(target, emptyCtx());
    expect(r.score).toBeNull();
    expect(r.reason).toBe('NO_SECRET_SCAN_EVIDENCE');
  });

  it('green fixture → score 100', async () => {
    const ctx = emptyCtx();
    ctx.messageBus.query = async () => [{ payload: { value: 'hello world, nothing secret here' } }];
    const r = await secretsHygiene(target, ctx);
    expect(r.score).toBe(100);
  });

  it('red fixture (canary leak) → score 0', async () => {
    const ctx = emptyCtx();
    ctx.messageBus.query = async () => [{ payload: { apikey: 'sk-flowai-canary-do-not-use-1234567890' } }];
    const r = await secretsHygiene(target, ctx);
    expect(r.score).toBe(0);
    expect(r.findings.map(f => f.code)).toContain('SECRET_LEAK_DETECTED');
  });
});

describe('rdy.functional — falsifiable', () => {
  it('empty ctx → null + NO_FUNCTIONAL_SCENARIOS', async () => {
    const r = await functional(target, emptyCtx());
    expect(r.score).toBeNull();
    expect(r.reason).toBe('NO_FUNCTIONAL_SCENARIOS');
  });

  it('green fixture (dev mode, 3 RUN_COMPLETE) → score 100', async () => {
    const ctx = emptyCtx();
    ctx.env = { mode: 'dev' };
    ctx.registry.getCharter = async () => ({ produces_topics: [] });
    ctx.auditLog.query = async () => [
      { event_type: 'RUN_COMPLETE', run_id: 'r1' },
      { event_type: 'RUN_COMPLETE', run_id: 'r2' },
      { event_type: 'RUN_COMPLETE', run_id: 'r3' },
    ];
    const r = await functional(target, ctx);
    expect(r.score).toBe(100);
  });

  it('red fixture (dev mode, 2 complete + 1 failed) → score ≈ 67', async () => {
    const ctx = emptyCtx();
    ctx.env = { mode: 'dev' };
    ctx.registry.getCharter = async () => ({ produces_topics: [] });
    ctx.auditLog.query = async () => [
      { event_type: 'RUN_COMPLETE', run_id: 'r1' },
      { event_type: 'RUN_COMPLETE', run_id: 'r2' },
      { event_type: 'RUN_FAILED',   run_id: 'r3' },
    ];
    const r = await functional(target, ctx);
    expect(r.score).toBeCloseTo(66.67, 1);
    expect(r.findings.map(f => f.code)).toContain('RUN_FAILED');
  });

  it('prod mode with < 20 runs → null + INSUFFICIENT_RUNS', async () => {
    const ctx = emptyCtx();
    ctx.env = { mode: 'prod' };
    ctx.registry.getCharter = async () => ({ produces_topics: [] });
    ctx.auditLog.query = async () => [{ event_type: 'RUN_COMPLETE', run_id: 'r1' }];
    const r = await functional(target, ctx);
    expect(r.score).toBeNull();
    expect(r.reason).toBe('INSUFFICIENT_RUNS');
  });
});

describe('rdy.failure_handling — falsifiable', () => {
  it('empty ctx → null + NO_FAILURE_INJECTION_EVIDENCE', async () => {
    const r = await failureHandling(target, emptyCtx());
    expect(r.score).toBeNull();
    expect(r.reason).toBe('NO_FAILURE_INJECTION_EVIDENCE');
  });

  it('green fixture → score 100', async () => {
    const ctx = emptyCtx();
    ctx.errorLog.query = async () => [{
      code: 'ValidationError', severity: 'high', retryable: false,
      run_id: 'r1', correlationId: 'c1', ts: NOW,
    }];
    ctx.auditLog.query = async () => [{
      event_type: 'RECOVERY', correlationId: 'c1', ts: NOW + 30_000,
    }];
    ctx.messageBus.query = async () => [];
    const r = await failureHandling(target, ctx);
    expect(r.score).toBe(100);
  });

  it('red fixture (unstructured + no recovery) → score < 100', async () => {
    const ctx = emptyCtx();
    ctx.errorLog.query = async () => [
      { code: 'ValidationError', severity: 'high', retryable: false, run_id: 'r1', correlationId: 'c1', ts: NOW }, // no recovery
      { message: 'raw stack trace' }, // unstructured
    ];
    ctx.auditLog.query = async () => [];
    ctx.messageBus.query = async () => [];
    const r = await failureHandling(target, ctx);
    expect(r.score).toBeLessThan(100);
    const codes = r.findings.map(f => f.code);
    expect(codes).toContain('UNSTRUCTURED_ERROR');
    expect(codes).toContain('MISSING_FAILURE_ROUTE');
  });
});

describe('rdy.dependencies — falsifiable', () => {
  it('no charter → null + NO_CHARTER', async () => {
    const r = await dependencies(target, emptyCtx());
    expect(r.score).toBeNull();
    expect(r.reason).toBe('NO_CHARTER');
  });

  it('green fixture (empty declared deps, no consumes) → score 100', async () => {
    const ctx = emptyCtx();
    ctx.registry.getCharter = async () => ({ dependencies: [], consumes_topics: [] });
    const r = await dependencies(target, ctx);
    expect(r.score).toBe(100);
  });

  it('red fixture (unresolved consume + undeclared call) → score < 100', async () => {
    const ctx = emptyCtx();
    ctx.registry.getCharter = async () => ({
      dependencies: [],
      consumes_topics: ['t.does.not.exist'],
    });
    ctx.messageBus.listTopics = async () => ['other.topic'];
    ctx.auditLog.query = async () => [
      { event_type: 'dependency.call', payload: { target: 'undeclared.dep' } },
    ];
    const r = await dependencies(target, ctx);
    expect(r.score).toBeLessThan(100);
    const codes = r.findings.map(f => f.code);
    expect(codes).toContain('UNRESOLVED_TOPIC_DEPENDENCY');
    expect(codes).toContain('UNDECLARED_DEPENDENCY_CALL');
  });
});

describe('rdy.documentation — falsifiable', () => {
  it('empty ctx → null + NO_DOCUMENTATION_SUBJECTS', async () => {
    const r = await documentation(target, emptyCtx());
    expect(r.score).toBeNull();
    expect(r.reason).toBe('NO_DOCUMENTATION_SUBJECTS');
  });

  it('green fixture (all 11 fields filled) → score 100', async () => {
    const ctx = emptyCtx();
    const allFields = {
      owner: 'team-of-engineers', purpose: 'do important work',
      readme_url: 'https://example.com/readme.md',
      runbook_url: 'https://example.com/runbook.md',
      inputs: 'json payload', outputs: 'json response',
      configuration: 'env var driven', examples: 'see /docs/examples.md',
      known_limits: 'rate limit 100rpm',
      changelog: 'v1.0 initial release',
      support_contact: 'support@example.com',
    };
    ctx.registry.getActiveAgents = async () => [{ agent_id: 'a1', ...allFields }];
    ctx.registry.getCharter = async (id) => ({ agent_id: id, ...allFields });
    const r = await documentation(target, ctx);
    expect(r.score).toBe(100);
  });

  it('red fixture (readme_url=TODO, missing runbook_url, no known_limits) → score < 100', async () => {
    const ctx = emptyCtx();
    ctx.registry.getActiveAgents = async () => [{
      agent_id: 'a1',
      owner: 'team',
      purpose: 'do important work',
      readme_url: 'TODO',
      // runbook_url missing
      inputs: 'json payload',
      outputs: 'json response',
      configuration: 'env var driven',
      examples: 'see /docs/examples.md',
      // known_limits missing
      changelog: 'v1.0 initial release',
      support_contact: 'support@example.com',
    }];
    ctx.registry.getCharter = async () => null;
    const r = await documentation(target, ctx);
    expect(r.score).toBeLessThan(100);
    expect(r.findings.map(f => f.code)).toContain('DOC_FIELD_MISSING');
  });
});

describe('Deferred evaluators — return shape', () => {
  for (const [name, evalFn, blocker, reason] of [
    ['gov.ip_protection', ipProtection, 'IP-T1b / IP-T2',     'deferred-pending-IP-T1b-IP-T2'],
    ['rdy.performance',   performance,  'Agent #10 Monitor',  'deferred-pending-agent-10-monitor'],
    ['rdy.observability', observability,'Agent #10 Monitor',  'deferred-pending-agent-10-monitor'],
  ]) {
    it(`${name} returns null + deferred + correct reason`, async () => {
      const r = await evalFn(target, emptyCtx());
      expect(r.score).toBeNull();
      expect(r.status).toBe('deferred');
      expect(r.reason).toBe(reason);
      expect(r.blockedBy).toBe(blocker);
      expect(r.falseGreenGuard).toBe(true);
    });
  }
});
