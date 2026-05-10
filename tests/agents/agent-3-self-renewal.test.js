// Agent #3 — Self-Renewal — registration + recommend + hub routing.
//
// Six required cases per dispatch:
//   1. Agent #3 registers as step-owner for step=6
//   2. Agent #3 returns valid recommendation envelope
//   3. renewal_flags is an array
//   4. Low-confidence envelope on null/missing input
//   5. Step 6 uniqueness enforced (duplicate registration rejected)
//   6. invokeStepOwner('govern', ctx) routes to Agent #3
//
// Plus defensive companions: heuristic correctness, severity → confidence
// mapping, charter integrity, MessageBus subscription, and a verification
// that Agent #3 stays out of the browser bundle path (no node:crypto).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  registerAgent,
  getActiveAgent,
  getActiveStepOwner,
  listActiveAgents,
  _resetActiveRegistry,
} from '../../src/lib/agents/_registry.ts';
import {
  OrchestratorHub,
  createMemoryHotStore,
  createMemoryColdStore,
} from '../../src/lib/agents/orchestrator/OrchestratorHub.ts';
import { MessageBus } from '../../src/lib/agents/MessageBus.ts';
import { Agent3SelfRenewal, analyzeRun, __test } from '../../src/lib/agents/agents/Agent3SelfRenewal.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

function makeDeps(extras = {}) {
  let t = 1_700_000_000_000;
  const clock = { now: () => t };
  const hot = createMemoryHotStore({ clock: clock.now });
  const cold = createMemoryColdStore();
  const messageBus = new MessageBus({ clock: clock.now });
  const auditLog = { write: vi.fn(async () => {}) };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    deps: {
      logger, messageBus, auditLog, clock,
      productScope: 'flowai',
      environment: 'prod',
      hot, cold,
      ...extras,
    },
    hot, cold, messageBus, auditLog,
    advance: (ms) => { t += ms; },
  };
}

beforeEach(() => {
  _resetActiveRegistry();
});

// ─── REQ 1: registers as step-owner for step=6 ──────────────────────────────
describe('Agent #3 REQ 1 — registers as step-owner for step=6', () => {
  it('registerAgent persists Agent #3 with mode=step-owner, step=6', () => {
    const r = registerAgent({
      id: 3,
      name: 'Self-Renewal',
      mode: 'step-owner',
      authority: 'recommend_only',
      step: 6,
    });
    expect(r.id).toBe(3);
    expect(r.mode).toBe('step-owner');
    expect(r.step).toBe(6);
    expect(getActiveAgent(3)).toEqual(r);
    expect(getActiveStepOwner(6)).toEqual(r);
    expect(listActiveAgents()).toHaveLength(1);
  });

  it('rejects step=null for step-owner mode', () => {
    expect(() =>
      registerAgent({
        id: 3, name: 'Self-Renewal', mode: 'step-owner', authority: 'recommend_only', step: null,
      }),
    ).toThrow(/positive integer step/);
  });

  it('charter() pulls from registry and matches AGENT_REGISTRY[2]', () => {
    const c = Agent3SelfRenewal.charter();
    expect(c.id).toBe(3);
    expect(c.name).toBe('Self-Renewal');
    expect(c.flowAiOnly).toBe(false);
    expect(c.authority).toEqual(['recommend_only']);
    expect(c.consumes).toContain('8.audit.completed.v1');
    expect(c.consumes).toContain('10.anomaly.v1');
    expect(c.consumes).toContain('17.evolution.proposal.v1');
    expect(c.produces).toContain('3.renewal.candidate.v1');
    expect(c.produces).toContain('3.renewal.applied.v1');
  });
});

// ─── REQ 2: returns valid recommendation envelope ───────────────────────────
describe('Agent #3 REQ 2 — returns valid recommendation envelope', () => {
  it('recommend() returns the dispatch-mandated envelope shape on healthy run', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const rec = await a3.recommend({
      runId: 'r1',
      productId: 'p1',
      run_summary: { audit_issues_count: 0, build_failure_count: 0 },
      step_results: [],
    });
    // Dispatch-mandated fields:
    expect(rec.agent_id).toBe(3);
    expect(rec.agent_name).toBe('Self-Renewal');
    expect(rec.mode).toBe('step-owner');
    expect(rec.step).toBe(6);
    expect(rec.authority).toBe('recommend_only');
    expect(typeof rec.recommendation).toBe('string');
    expect(typeof rec.confidence).toBe('number');
    expect(rec.confidence).toBeGreaterThanOrEqual(0);
    expect(rec.confidence).toBeLessThanOrEqual(1);
    expect(rec.metadata).toBeTypeOf('object');
    expect(rec.metadata.runId).toBe('r1');
    expect(rec.metadata.productId).toBe('p1');
  });

  it('recommend() returns the same envelope shape on failing run', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const rec = await a3.recommend({
      runId: 'r2',
      productId: 'p2',
      run_summary: { audit_issues_count: 7, build_failure_count: 2, anomaly_severity: 'high' },
      step_results: [{ step: 'build', status: 'failed' }],
    });
    expect(rec.agent_id).toBe(3);
    expect(rec.agent_name).toBe('Self-Renewal');
    expect(rec.step).toBe(6);
    expect(rec.confidence).toBeGreaterThan(0.5); // multiple high-severity flags
    expect(rec.recommendation).toMatch(/renewal recommended/i);
  });

  it('envelope is frozen — caller cannot mutate it', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const rec = await a3.recommend({ runId: 'r3', run_summary: { audit_issues_count: 1 } });
    expect(Object.isFrozen(rec)).toBe(true);
    expect(Object.isFrozen(rec.metadata)).toBe(true);
    expect(Object.isFrozen(rec.renewal_flags)).toBe(true);
  });
});

// ─── REQ 3: renewal_flags is an array ───────────────────────────────────────
describe('Agent #3 REQ 3 — renewal_flags is an array', () => {
  it('renewal_flags is always an array, even when no flags raised', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const rec = await a3.recommend({ runId: 'r1', run_summary: {} });
    expect(Array.isArray(rec.renewal_flags)).toBe(true);
    expect(rec.renewal_flags).toHaveLength(0);
  });

  it('renewal_flags contains string area names when flags raised', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const rec = await a3.recommend({
      runId: 'r1',
      run_summary: { audit_issues_count: 6 },
    });
    expect(Array.isArray(rec.renewal_flags)).toBe(true);
    expect(rec.renewal_flags.length).toBeGreaterThanOrEqual(1);
    for (const f of rec.renewal_flags) {
      expect(typeof f).toBe('string');
    }
    expect(rec.renewal_flags).toContain('config.quality');
  });

  it('multiple heuristics fire → multiple distinct renewal_flags', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const rec = await a3.recommend({
      runId: 'r1',
      run_summary: {
        audit_issues_count: 8,
        build_failure_count: 3,
        anomaly_severity: 'high',
        config_age_days: 120,
      },
    });
    const flags = rec.renewal_flags;
    expect(flags).toContain('pipeline.build');
    expect(flags).toContain('config.quality');
    expect(flags).toContain('monitor.anomaly');
    expect(flags).toContain('config.staleness');
    // Areas are unique within the recommendation.
    expect(new Set(flags).size).toBe(flags.length);
  });
});

// ─── REQ 4: low-confidence envelope on null/missing input ───────────────────
describe('Agent #3 REQ 4 — low-confidence envelope on null/missing input', () => {
  it('null ctx → low-confidence envelope, does NOT throw', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const rec = await a3.recommend(null);
    expect(rec.agent_id).toBe(3);
    expect(rec.confidence).toBe(0);
    expect(rec.renewal_flags).toEqual([]);
    expect(rec.metadata.runId).toBeNull();
  });

  it('undefined ctx → low-confidence envelope, does NOT throw', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const rec = await a3.recommend();
    expect(rec.agent_id).toBe(3);
    expect(rec.confidence).toBe(0);
    expect(rec.renewal_flags).toEqual([]);
  });

  it('empty ctx → low-confidence envelope, does NOT throw', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const rec = await a3.recommend({});
    expect(rec.confidence).toBe(0);
    expect(rec.renewal_flags).toEqual([]);
  });

  it('ctx with runId but no run_summary or step_results → confidence=0', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const rec = await a3.recommend({ runId: 'r1', productId: 'p1' });
    expect(rec.confidence).toBe(0);
    expect(rec.renewal_flags).toEqual([]);
    expect(rec.metadata.runId).toBe('r1');
  });

  it('snake_case ctx keys (run_id) are accepted equivalently to camelCase', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const rec = await a3.recommend({ run_id: 'r-snake', product_id: 'p-snake' });
    expect(rec.metadata.runId).toBe('r-snake');
    expect(rec.metadata.productId).toBe('p-snake');
  });

  it('hostile getter on ctx.run_summary → low-confidence envelope, does NOT throw (peer must-fix #1)', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const ctx = { runId: 'r-hostile' };
    Object.defineProperty(ctx, 'run_summary', {
      get() { throw new Error('hostile run_summary getter'); },
      enumerable: true,
    });
    const rec = await a3.recommend(ctx);
    expect(rec.agent_id).toBe(3);
    expect(rec.confidence).toBe(0);
    expect(rec.metadata.ok).toBe(false);
    expect(typeof rec.metadata.error).toBe('string');
    expect(rec.renewal_flags).toEqual([]);
  });

  it('hostile getter on ctx.stepInputs → low-confidence envelope, does NOT throw', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const ctx = { runId: 'r-hostile-2' };
    Object.defineProperty(ctx, 'stepInputs', {
      get() { throw new Error('hostile stepInputs getter'); },
      enumerable: true,
    });
    const rec = await a3.recommend(ctx);
    expect(rec.agent_id).toBe(3);
    expect(rec.confidence).toBe(0);
    expect(rec.metadata.ok).toBe(false);
    expect(rec.renewal_flags).toEqual([]);
  });

  it('hostile getter on ctx.runId → low-confidence envelope, does NOT throw', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const ctx = {};
    Object.defineProperty(ctx, 'runId', {
      get() { throw new Error('hostile runId getter'); },
      enumerable: true,
    });
    const rec = await a3.recommend(ctx);
    expect(rec.agent_id).toBe(3);
    expect(rec.confidence).toBe(0);
    expect(rec.metadata.ok).toBe(false);
  });

  it('a misbehaving heuristic does not throw — analyzeRun catches and skips', () => {
    // Pass a hostile run_summary that would crash a naive heuristic via a
    // booby-trapped getter. analyzeRun should still return a sane result.
    const summary = {};
    Object.defineProperty(summary, 'audit_issues_count', {
      get() { throw new Error('hostile getter'); },
      enumerable: true,
    });
    const result = analyzeRun(summary, null);
    expect(Array.isArray(result.flags)).toBe(true);
    expect(typeof result.confidence).toBe('number');
  });
});

// ─── REQ 5: Step 6 uniqueness enforced ──────────────────────────────────────
describe('Agent #3 REQ 5 — step 6 uniqueness enforced', () => {
  it('a second registerAgent at step=6 with a DIFFERENT id is rejected', () => {
    registerAgent({
      id: 3, name: 'Self-Renewal', mode: 'step-owner', authority: 'recommend_only', step: 6,
    });
    // Try to register agent #2 (whose charter is also step-owner) at step=6.
    // This violates the uniqueness rule — at most one active step-owner per
    // step number — and must throw.
    expect(() =>
      registerAgent({
        id: 2, name: 'Code Builder', mode: 'step-owner', authority: 'recommend_only', step: 6,
      }),
    ).toThrow(/step 6 is already owned/);
  });

  it('idempotent — the SAME shape registered twice is a noop', () => {
    const r1 = registerAgent({
      id: 3, name: 'Self-Renewal', mode: 'step-owner', authority: 'recommend_only', step: 6,
    });
    const r2 = registerAgent({
      id: 3, name: 'Self-Renewal', mode: 'step-owner', authority: 'recommend_only', step: 6,
    });
    expect(r1).toBe(r2);
    expect(listActiveAgents()).toHaveLength(1);
  });

  it('registering Agent #3 at a different step than its charter declares is allowed by the active registry but does not collide with #2 at step=2', () => {
    // The static charter doesn't pin the step number — step is part of the
    // *active* record. We register #2 at step=2 and #3 at step=6 and confirm
    // both coexist.
    registerAgent({ id: 2, name: 'Code Builder', mode: 'step-owner', authority: 'recommend_only', step: 2 });
    registerAgent({ id: 3, name: 'Self-Renewal', mode: 'step-owner', authority: 'recommend_only', step: 6 });
    expect(listActiveAgents()).toHaveLength(2);
    expect(getActiveStepOwner(2).id).toBe(2);
    expect(getActiveStepOwner(6).id).toBe(3);
  });
});

// ─── REQ 6: invokeStepOwner('govern', ctx) routes to Agent #3 ────────────────
describe("Agent #3 REQ 6 — invokeStepOwner('govern', ctx) routes to Agent #3", () => {
  it('hub.registerStepOwnerAgent + invokeStepOwner round-trip returns Agent #3 envelope', async () => {
    const { deps, hot, cold } = makeDeps();
    const hub = new OrchestratorHub({ hot, cold });
    const a3 = new Agent3SelfRenewal(deps);
    hub.registerStepOwnerAgent('govern', a3);
    const rec = await hub.invokeStepOwner('govern', {
      runId: 'r-gov-1',
      productId: 'p-gov-1',
      stepInputs: { run_summary: { audit_issues_count: 6 } },
    });
    expect(rec).not.toBeNull();
    expect(rec.agent_id).toBe(3);
    expect(rec.agent_name).toBe('Self-Renewal');
    expect(rec.step).toBe(6);
    expect(rec.renewal_flags).toContain('config.quality');
  });

  it('routeJob(govern) returns agent #3 from STEP_OWNERS map', async () => {
    const { hot, cold } = makeDeps();
    const hub = new OrchestratorHub({ hot, cold });
    const decision = await hub.routeJob({ runId: 'r1', stepKey: 'govern' });
    expect(decision.agentId).toBe(3);
    expect(decision.authority).toBe('recommend_only');
    expect(decision.reason).toMatch(/Self-Renewal/);
  });

  it('invokeStepOwner returns null when no agent is registered for govern', async () => {
    const { hot, cold } = makeDeps();
    const hub = new OrchestratorHub({ hot, cold });
    const r = await hub.invokeStepOwner('govern', { runId: 'r1' });
    expect(r).toBeNull();
  });

  it('a thrown error inside Agent #3 is wrapped into a low-confidence envelope (non-blocking)', async () => {
    const { deps, hot, cold } = makeDeps();
    const hub = new OrchestratorHub({ hot, cold });
    const broken = {
      recommend: async () => { throw new Error('intentional renewal crash'); },
    };
    hub.registerStepOwnerAgent('govern', broken);
    const r = await hub.invokeStepOwner('govern', { runId: 'r-broken' });
    expect(r).not.toBeNull();
    expect(r.confidence).toBe(0);
    expect(r.metadata.ok).toBe(false);
    expect(r.metadata.error).toMatch(/intentional renewal crash/);
  });

  it('hub.registerStepOwnerAgent for govern rejects a different owner attached after first', () => {
    const { deps, hot, cold } = makeDeps();
    const hub = new OrchestratorHub({ hot, cold });
    const a3a = new Agent3SelfRenewal(deps);
    const a3b = new Agent3SelfRenewal(deps);
    hub.registerStepOwnerAgent('govern', a3a);
    expect(() => hub.registerStepOwnerAgent('govern', a3b)).toThrow(/already has a different owner/);
    // Re-registering the SAME instance is a noop.
    expect(() => hub.registerStepOwnerAgent('govern', a3a)).not.toThrow();
  });
});

// ─── Severity → confidence mapping ──────────────────────────────────────────
describe('Agent #3 — severity → confidence mapping', () => {
  it('high-severity flag → confidence 0.9', () => {
    const r = analyzeRun({ anomaly_severity: 'high' }, null);
    expect(r.confidence).toBe(0.9);
  });

  it('only medium-severity flags → confidence 0.6', () => {
    const r = analyzeRun({ audit_issues_count: 1 }, null);
    expect(r.confidence).toBe(0.6);
  });

  it('only low-severity flags → confidence 0.4', () => {
    const r = analyzeRun({ evolution_proposal: { id: 'ev-1' } }, null);
    expect(r.confidence).toBe(0.4);
  });

  it('signal observed but no flags raised → confidence 0.2 (advisory)', () => {
    const r = analyzeRun({ audit_issues_count: 0, build_failure_count: 0 }, null);
    expect(r.flags).toEqual([]);
    expect(r.confidence).toBe(0.2);
  });

  it('no signal at all → confidence 0', () => {
    expect(analyzeRun(null, null).confidence).toBe(0);
    expect(analyzeRun({}, []).confidence).toBe(0);
  });
});

// ─── BaseAgent contract — plan/act do not violate recommend_only ────────────
describe('Agent #3 — recommend_only invariant', () => {
  it('plan() returns sideEffects=[] always', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    const plan = await a3.plan({
      input: { kind: 'renewal.request', runId: 'r1', run_summary: { audit_issues_count: 3 } },
    });
    expect(plan.sideEffects).toEqual([]);
    expect(plan.authorityNeeded).toEqual(['recommend_only']);
  });

  it('a non-renewal.request input.kind throws from plan()', async () => {
    const { deps } = makeDeps();
    const a3 = new Agent3SelfRenewal(deps);
    await expect(a3.plan({ input: { kind: 'something_else', runId: 'r1' } })).rejects.toThrow(/renewal.request/);
  });
});

// ─── Static-source guard: Agent #3 does NOT import node:crypto ──────────────
describe('Agent #3 — browser-bundle safe', () => {
  it("Agent3SelfRenewal.js does NOT import 'node:crypto' (browser-bundle safe)", async () => {
    const src = await readFile(
      path.join(REPO, 'src', 'lib', 'agents', 'agents', 'Agent3SelfRenewal.js'),
      'utf8',
    );
    expect(src).not.toMatch(/from\s+['"]node:crypto['"]/);
    expect(src).not.toMatch(/require\s*\(\s*['"]node:crypto['"]\s*\)/);
    // And no other node:* imports either — recommend_only renewal analysis
    // should be pure JS that runs in any environment.
    expect(src).not.toMatch(/from\s+['"]node:fs['"]/);
    expect(src).not.toMatch(/from\s+['"]node:path['"]/);
  });

  it('exposed __test surface contains the helpers the suite uses', () => {
    expect(typeof __test.analyzeRun).toBe('function');
    expect(typeof __test.mergeSignals).toBe('function');
    expect(Array.isArray(__test.HEURISTICS)).toBe(true);
    expect(__test.HEURISTICS.length).toBeGreaterThanOrEqual(5);
  });
});
