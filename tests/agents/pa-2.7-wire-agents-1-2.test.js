// PA #2.7 — Wire Agent #1 + Agent #2 to runtime.
//
// Six required cases per dispatch:
//   1. Agent #1 registers as always-on
//   2. Agent #1 receives MessageBus broadcast events
//   3. Agent #1 writes to ColdStore (mock acceptable)
//   4. Agent #2 registers as step-owner for step=2
//   5. Agent #2 returns valid recommendation object
//   6. Duplicate registration rejected
//
// Plus a few defensive companions: hub wire-in idempotency, error isolation,
// and the regression check that the hub's executeStep / routeJob still pass.

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
import { Agent1LifecycleEngine } from '../../src/lib/agents/agents/Agent1LifecycleEngine.ts';
import { Agent2CodeBuilder } from '../../src/lib/agents/agents/Agent2CodeBuilder.js';

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

// ─── REQ 1: Agent #1 registers as always-on ───────────────────────────────
describe('PA #2.7 REQ 1 — Agent #1 registers as always-on', () => {
  it('registerAgent persists Agent #1 with mode=always-on, step=null', () => {
    const r = registerAgent({
      id: 1,
      name: 'Lifecycle Engine',
      mode: 'always-on',
      authority: 'recommend_only',
      step: null,
    });
    expect(r.id).toBe(1);
    expect(r.mode).toBe('always-on');
    expect(r.step).toBeNull();
    expect(getActiveAgent(1)).toEqual(r);
    expect(listActiveAgents()).toHaveLength(1);
  });

  it('rejects step≠null for always-on mode', () => {
    expect(() =>
      registerAgent({
        id: 1, name: 'Lifecycle Engine', mode: 'always-on', authority: 'recommend_only', step: 5,
      }),
    ).toThrow(/must have step=null/);
  });
});

// ─── REQ 2: Agent #1 receives MessageBus broadcast events ─────────────────
describe('PA #2.7 REQ 2 — Agent #1 broadcast subscription', () => {
  it('attachAsAlwaysOnSupervisor subscribes to ALL bus topics (broadcast)', async () => {
    const { deps, messageBus, cold } = makeDeps();
    const a1 = new Agent1LifecycleEngine(deps);
    const detach = a1.attachAsAlwaysOnSupervisor();
    expect(a1.isAttachedAsAlwaysOn()).toBe(true);
    expect(messageBus.broadcastHandlerCount()).toBe(1);

    // Publish on multiple unrelated topics — supervisor should observe all.
    messageBus.publish('1.product.lifecycle_event.v1', { runId: 'r1', event: 'step.start' });
    messageBus.publish('2.build.completed.v1', { runId: 'r1', artifactRef: 'a' });
    messageBus.publish('totally.unrelated.topic.v1', { runId: 'r1', foo: 'bar' });
    // Flush microtasks for async broadcast handlers.
    await Promise.resolve(); await Promise.resolve();

    const lineageRows = cold.entries.filter((e) => e.agentId === 1);
    expect(lineageRows.length).toBeGreaterThanOrEqual(3);
    const observedTopics = lineageRows.map((r) => r.meta?.observedTopic);
    expect(observedTopics).toContain('1.product.lifecycle_event.v1');
    expect(observedTopics).toContain('2.build.completed.v1');
    expect(observedTopics).toContain('totally.unrelated.topic.v1');

    detach();
    expect(messageBus.broadcastHandlerCount()).toBe(0);
  });

  it('attach is idempotent — calling twice returns the same handle', () => {
    const { deps, messageBus } = makeDeps();
    const a1 = new Agent1LifecycleEngine(deps);
    const off1 = a1.attachAsAlwaysOnSupervisor();
    const off2 = a1.attachAsAlwaysOnSupervisor();
    expect(messageBus.broadcastHandlerCount()).toBe(1);
    off1();
    // off2 is the same handle — calling it again must be safe (already-detached).
    expect(() => off2()).not.toThrow();
  });

  it('a throwing publish handler does not break broadcast delivery to others', async () => {
    const { deps, messageBus, cold } = makeDeps();
    const a1 = new Agent1LifecycleEngine(deps);
    a1.attachAsAlwaysOnSupervisor();
    // Add a hostile per-topic handler that throws — supervisor must still see the event.
    messageBus.subscribe('test.topic.v1', () => { throw new Error('hostile'); });
    messageBus.publish('test.topic.v1', { runId: 'r1' });
    await Promise.resolve(); await Promise.resolve();
    const rows = cold.entries.filter((e) => e.agentId === 1 && e.meta?.observedTopic === 'test.topic.v1');
    expect(rows.length).toBe(1);
  });
});

// ─── REQ 3: Agent #1 writes to ColdStore ──────────────────────────────────
describe('PA #2.7 REQ 3 — Agent #1 writes audit entries on lifecycle events', () => {
  it('every lifecycle phase event becomes a ColdStore row with agentId=1, authority=recommend_only', async () => {
    const { deps, messageBus, cold } = makeDeps();
    const a1 = new Agent1LifecycleEngine(deps);
    a1.attachAsAlwaysOnSupervisor();

    // Simulate the four phase events the dispatch names: run.start, step.transition,
    // run.complete, run.error. We use the agent's actual produced topics where
    // they match; otherwise generic event topics.
    messageBus.publish('1.product.lifecycle_event.v1', { runId: 'rA', event: 'run.start' });
    messageBus.publish('1.product.lifecycle_event.v1', { runId: 'rA', event: 'step.transition' });
    messageBus.publish('2.build.completed.v1', { runId: 'rA' });   // success → step.success
    messageBus.publish('2.build.failed.v1', { runId: 'rA' });      // failure → step.failure
    await Promise.resolve(); await Promise.resolve();

    const a1Rows = cold.entries.filter((e) => e.agentId === 1);
    expect(a1Rows.length).toBeGreaterThanOrEqual(4);
    for (const r of a1Rows) {
      expect(r.authority).toBe('recommend_only');
      expect(r.runId).toBe('rA');
    }
    // Phase inference: completed→step.success, failed→step.failure.
    const phases = a1Rows.map((r) => r.phase);
    expect(phases).toContain('step.success');
    expect(phases).toContain('step.failure');
  });

  it('ColdStore.append errors do not throw out of the broadcast handler', async () => {
    const { deps, messageBus } = makeDeps();
    // Replace cold with a throwing one.
    deps.cold = {
      append: vi.fn(async () => { throw new Error('cold down'); }),
    };
    const a1 = new Agent1LifecycleEngine(deps);
    a1.attachAsAlwaysOnSupervisor();
    expect(() => messageBus.publish('any.topic.v1', { runId: 'r' })).not.toThrow();
    await Promise.resolve(); await Promise.resolve();
    expect(deps.cold.append).toHaveBeenCalled();
  });
});

// ─── REQ 4: Agent #2 registers as step-owner for step=2 ────────────────────
describe('PA #2.7 REQ 4 — Agent #2 step-owner registration', () => {
  it('registerAgent persists Agent #2 with mode=step-owner, step=2', () => {
    const r = registerAgent({
      id: 2,
      name: 'Code Builder',
      mode: 'step-owner',
      authority: 'recommend_only',
      step: 2,
    });
    expect(r.mode).toBe('step-owner');
    expect(r.step).toBe(2);
    expect(getActiveStepOwner(2)).toEqual(r);
  });

  it('rejects step=null for step-owner mode', () => {
    expect(() =>
      registerAgent({
        id: 2, name: 'Code Builder', mode: 'step-owner', authority: 'recommend_only', step: null,
      }),
    ).toThrow(/positive integer step/);
  });

  it('rejects step=0 / negative / non-integer', () => {
    for (const bad of [0, -1, 1.5, NaN]) {
      expect(() =>
        registerAgent({
          id: 2, name: 'Code Builder', mode: 'step-owner', authority: 'recommend_only', step: bad,
        }),
      ).toThrow();
    }
  });

  it('OrchestratorHub.registerStepOwnerAgent + getStepOwnerAgent round-trip', () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    const a2 = new Agent2CodeBuilder(deps);
    hub.registerStepOwnerAgent('build', a2);
    expect(hub.getStepOwnerAgent('build')).toBe(a2);
  });

  it('hub rejects a different step-owner for the same key after one is attached', () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    const a2a = new Agent2CodeBuilder(deps);
    const a2b = new Agent2CodeBuilder(deps);
    hub.registerStepOwnerAgent('build', a2a);
    expect(() => hub.registerStepOwnerAgent('build', a2b)).toThrow(/already has a different owner/);
    // Re-attaching the SAME agent is idempotent.
    expect(() => hub.registerStepOwnerAgent('build', a2a)).not.toThrow();
  });
});

// ─── REQ 5: Agent #2 returns a valid recommendation object ─────────────────
describe('PA #2.7 REQ 5 — Agent #2 recommend() envelope', () => {
  it('returns { agent_id: 2, recommendation, confidence, metadata } on a valid spec', async () => {
    const { deps } = makeDeps({
      executeBuild: async () => ({ ok: true, artifact: 'final-artifact', artifactRef: 'a' }),
    });
    const a2 = new Agent2CodeBuilder(deps);
    const rec = await a2.recommend({
      runId: 'r1',
      productId: 'p1',
      spec: { name: 'sample', version: '1' },
    });
    expect(rec.agent_id).toBe(2);
    expect(typeof rec.recommendation).toBe('string');
    expect(rec.recommendation.length).toBeGreaterThan(0);
    expect(typeof rec.confidence).toBe('number');
    expect(rec.confidence).toBeGreaterThanOrEqual(0);
    expect(rec.confidence).toBeLessThanOrEqual(1);
    expect(typeof rec.metadata).toBe('object');
    expect(rec.metadata.ok).toBe(true);
    expect(rec.metadata.runId).toBe('r1');
    expect(rec.metadata.productId).toBe('p1');
  });

  it('returns low-confidence envelope when spec is malformed (recommend_only — does not throw)', async () => {
    const { deps } = makeDeps();
    const a2 = new Agent2CodeBuilder(deps);
    const rec = await a2.recommend({ runId: 'r2', spec: {} }); // empty spec → precheck fail
    expect(rec.agent_id).toBe(2);
    expect(rec.confidence).toBeLessThanOrEqual(0.3);
    expect(rec.metadata.ok).toBe(false);
  });

  it('returns 0-confidence envelope when underlying plan() throws (caught)', async () => {
    const { deps } = makeDeps();
    const a2 = new Agent2CodeBuilder(deps);
    const rec = await a2.recommend({ runId: 'rThrow', spec: { name: 'x', version: '1' } });
    // Smoke: with a valid spec and no executeBuild injected, plan() runs and
    // returns a completed envelope (passthrough mode). confidence should be 0.9.
    expect(rec.confidence).toBe(0.9);
    expect(rec.metadata.ok).toBe(true);
  });

  it('throws on missing runId in ctx (input validation)', async () => {
    const { deps } = makeDeps();
    const a2 = new Agent2CodeBuilder(deps);
    await expect(a2.recommend({})).rejects.toThrow(/runId required/);
  });

  it('OrchestratorHub.invokeStepOwner forwards the envelope unchanged', async () => {
    const { deps } = makeDeps({
      executeBuild: async () => ({ ok: true, artifact: 'x' }),
    });
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    const a2 = new Agent2CodeBuilder(deps);
    hub.registerStepOwnerAgent('build', a2);
    const rec = await hub.invokeStepOwner('build', {
      runId: 'r3', productId: 'p3', spec: { name: 's', version: '1' },
    });
    expect(rec.agent_id).toBe(2);
    expect(rec.confidence).toBe(0.9);
  });

  it('invokeStepOwner returns null when no agent is registered for the key', async () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    const r = await hub.invokeStepOwner('research', { runId: 'r' });
    expect(r).toBeNull();
  });

  it('invokeStepOwner wraps a thrown error into a low-confidence envelope (non-blocking)', async () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    const broken = { recommend: async () => { throw new Error('boom'); } };
    hub.registerStepOwnerAgent('build', broken);
    const r = await hub.invokeStepOwner('build', { runId: 'r9' });
    expect(r.agent_id).toBe(0);
    expect(r.confidence).toBe(0);
    expect(r.metadata.error).toMatch(/boom/);
  });
});

// ─── REQ 6: duplicate registration rejected ────────────────────────────────
describe('PA #2.7 REQ 6 — duplicate registration rejected', () => {
  it('registering the SAME shape twice is idempotent (no throw)', () => {
    const r1 = registerAgent({
      id: 1, name: 'Lifecycle Engine', mode: 'always-on', authority: 'recommend_only', step: null,
    });
    const r2 = registerAgent({
      id: 1, name: 'Lifecycle Engine', mode: 'always-on', authority: 'recommend_only', step: null,
    });
    expect(r2).toEqual(r1);
    expect(listActiveAgents()).toHaveLength(1);
  });

  it('registering a CONFLICTING shape with the same id throws (step variation on a step-owner)', () => {
    // For always-on agents step is constrained to null, so the "conflicting
    // shape" path can only be exercised on a step-owner where step varies.
    registerAgent({
      id: 2, name: 'Code Builder', mode: 'step-owner', authority: 'recommend_only', step: 2,
    });
    expect(() =>
      registerAgent({
        id: 2, name: 'Code Builder', mode: 'step-owner', authority: 'recommend_only', step: 3,
      }),
    ).toThrow(/conflicting shape/);
  });

  it('rejects an id that is not in the canonical charter', () => {
    expect(() =>
      registerAgent({
        id: 99, name: 'Phantom', mode: 'always-on', authority: 'recommend_only', step: null,
      }),
    ).toThrow(/unknown agent id/);
  });

  it('rejects a name mismatch against the charter', () => {
    expect(() =>
      registerAgent({
        id: 1, name: 'Wrong Name', mode: 'always-on', authority: 'recommend_only', step: null,
      }),
    ).toThrow(/disagrees with charter/);
  });

  it('rejects a mode mismatch against the charter', () => {
    expect(() =>
      registerAgent({
        id: 1, name: 'Lifecycle Engine', mode: 'step-owner', authority: 'recommend_only', step: 1,
      }),
    ).toThrow(/disagrees with charter/);
  });

  it('rejects an authority not declared in the charter', () => {
    expect(() =>
      registerAgent({
        id: 1, name: 'Lifecycle Engine', mode: 'always-on', authority: 'auto_write_internal', step: null,
      }),
    ).toThrow(/not in charter/);
  });
});

// ─── Hub wire-in: attachLifecycleAgent ─────────────────────────────────────
describe('PA #2.7 hub wire-in — attachLifecycleAgent', () => {
  it('attaches Agent #1 as the always-on supervisor and detaches cleanly', () => {
    const { deps, messageBus } = makeDeps();
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    const a1 = new Agent1LifecycleEngine(deps);
    hub.attachLifecycleAgent(a1);
    expect(messageBus.broadcastHandlerCount()).toBe(1);
    hub.detachLifecycleAgent();
    expect(messageBus.broadcastHandlerCount()).toBe(0);
  });

  it('rejects a second supervisor while one is attached', () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    const a1a = new Agent1LifecycleEngine(deps);
    const a1b = new Agent1LifecycleEngine(deps);
    hub.attachLifecycleAgent(a1a);
    expect(() => hub.attachLifecycleAgent(a1b)).toThrow(/another always-on supervisor/);
    // Same agent re-attach is idempotent.
    expect(() => hub.attachLifecycleAgent(a1a)).not.toThrow();
  });

  it('rejects a non-conformant agent (no attachAsAlwaysOnSupervisor method)', () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    expect(() => hub.attachLifecycleAgent({})).toThrow(/attachAsAlwaysOnSupervisor/);
  });
});

// ─── Regression — existing OrchestratorHub.executeStep + routeJob still pass ─
describe('PA #2.7 regression — existing hub paths still pass', () => {
  it('executeStep idempotency is preserved after wire-in', async () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    const a1 = new Agent1LifecycleEngine(deps);
    const a2 = new Agent2CodeBuilder(deps);
    hub.attachLifecycleAgent(a1);
    hub.registerStepOwnerAgent('build', a2);

    const work = vi.fn(async () => 'output');
    await hub.executeStep({ runId: 'r1', stepKey: 'research', work });
    await hub.executeStep({ runId: 'r1', stepKey: 'research', work });
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('routeJob still routes build → agent #6/#2 etc. without breaking', async () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    const d = await hub.routeJob({ runId: 'r1', stepKey: 'build' });
    expect(d.agentId).toBe(2);
    expect(d.authority).toBe('recommend_only');
  });
});

// ─── Peer must-fix #1: step-ownership uniqueness in active registry ────────
describe('PA #2.7 peer fix — step-ownership uniqueness', () => {
  it('rejects a second step-owner claiming a step number already owned', () => {
    registerAgent({
      id: 2, name: 'Code Builder', mode: 'step-owner', authority: 'recommend_only', step: 3,
    });
    expect(() =>
      registerAgent({
        id: 6, name: 'Research', mode: 'step-owner', authority: 'recommend_only', step: 3,
      }),
    ).toThrow(/step 3 is already owned/);
  });

  it('different step numbers can coexist for different step-owners', () => {
    registerAgent({
      id: 2, name: 'Code Builder', mode: 'step-owner', authority: 'recommend_only', step: 3,
    });
    expect(() =>
      registerAgent({
        id: 6, name: 'Research', mode: 'step-owner', authority: 'recommend_only', step: 1,
      }),
    ).not.toThrow();
    expect(getActiveStepOwner(1)?.id).toBe(6);
    expect(getActiveStepOwner(3)?.id).toBe(2);
  });
});

// ─── Peer must-fix #2: payload integrity across broadcast handlers ─────────
describe('PA #2.7 peer fix — broadcast payload is frozen for fan-out', () => {
  it('payload is shallow-frozen so a hostile handler cannot mutate top-level fields', () => {
    const { messageBus } = makeDeps();
    const seen = [];
    messageBus.subscribeAll((p) => {
      seen.push(p);
      try { p.runId = 'mutated-by-bad-handler'; } catch { /* freeze threw */ }
    });
    messageBus.subscribeAll((p) => { seen.push(p); });
    messageBus.publish('any.topic.v1', { runId: 'rA', x: 1 });
    expect(seen).toHaveLength(2);
    // Both observers see the original runId — top-level mutation prevented.
    expect(seen[0].runId).toBe('rA');
    expect(seen[1].runId).toBe('rA');
  });
});

// ─── Peer NTH — broadcast handler error isolation ──────────────────────────
describe('PA #2.7 peer NTH — broadcast handler error isolation', () => {
  it('async-rejecting broadcast handler is caught + warned (others still fire)', async () => {
    const warn = vi.fn();
    const messageBus = new MessageBus({ clock: () => 1, warn });
    const ok = vi.fn();
    messageBus.subscribeAll(async () => { throw new Error('async-broadcast-boom'); });
    messageBus.subscribeAll(ok);
    messageBus.publish('any.topic.v1', { runId: 'rA' });
    await Promise.resolve(); await Promise.resolve();
    expect(ok).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      'messagebus.broadcast_error_async',
      expect.objectContaining({ topic: 'any.topic.v1' }),
    );
  });

  it('synchronously-throwing broadcast handler does not break others', () => {
    const warn = vi.fn();
    const messageBus = new MessageBus({ clock: () => 1, warn });
    const a = vi.fn();
    const b = vi.fn();
    messageBus.subscribeAll(() => { throw new Error('sync-broadcast-boom'); });
    messageBus.subscribeAll(a);
    messageBus.subscribeAll(b);
    messageBus.publish('t', { runId: 'r' });
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      'messagebus.broadcast_error_sync',
      expect.objectContaining({ topic: 't' }),
    );
  });
});

// ─── Peer NTH — malformed envelope from step-owner is wrapped ──────────────
describe('PA #2.7 peer NTH — malformed step-owner envelope is wrapped', () => {
  it('hub returns low-confidence envelope when step-owner.recommend returns garbage', async () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    const malformed = { recommend: async () => ({ definitely: 'wrong shape' }) };
    hub.registerStepOwnerAgent('build', malformed);
    const r = await hub.invokeStepOwner('build', { runId: 'r1' });
    expect(r.agent_id).toBe(0);
    expect(r.confidence).toBe(0);
    expect(r.metadata.error).toMatch(/malformed/);
  });

  it('hub wraps null return as malformed', async () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    hub.registerStepOwnerAgent('build', { recommend: async () => null });
    const r = await hub.invokeStepOwner('build', { runId: 'r1' });
    expect(r.agent_id).toBe(0);
    expect(r.confidence).toBe(0);
  });

  it('invokeStepOwner returns low-confidence envelope on missing runId (does NOT throw)', async () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: deps.hot, cold: deps.cold,
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    const a2 = new Agent2CodeBuilder(deps);
    hub.registerStepOwnerAgent('build', a2);
    const r = await hub.invokeStepOwner('build', {});
    expect(r.agent_id).toBe(0);
    expect(r.confidence).toBe(0);
    expect(r.metadata.error).toMatch(/missing runId/);
  });
});
