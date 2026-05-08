import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent1LifecycleEngine, ESCALATION_THRESHOLDS, HOT_KEYS } from '../src/lib/agents/agents/Agent1LifecycleEngine.ts';
import {
  createMemoryHotStore,
  createMemoryColdStore,
} from '../src/lib/agents/orchestrator/OrchestratorHub.ts';
import { MessageBus } from '../src/lib/agents/MessageBus.ts';

function makeDeps(overrides = {}) {
  let t = 1_700_000_000_000;
  const clock = { now: () => t };
  const hot = createMemoryHotStore({ clock: clock.now });
  const cold = createMemoryColdStore();
  const auditWrites = [];
  const auditLog = { write: vi.fn(async (entry) => { auditWrites.push(entry); }) };
  const messageBus = new MessageBus({ clock: clock.now });
  const logger = {
    info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  };
  const deps = {
    logger,
    messageBus,
    auditLog,
    clock,
    productScope: 'flowai',
    environment: 'prod',
    hot,
    cold,
    ...overrides,
  };
  return { deps, hot, cold, messageBus, auditLog, auditWrites, logger, advance: (ms) => { t += ms; } };
}

// ─── Charter ────────────────────────────────────────────────────────────────
describe('Agent1LifecycleEngine — charter', () => {
  it('static charterId === 1', () => {
    expect(Agent1LifecycleEngine.charterId).toBe(1);
  });

  it('static charter() returns id=1, name=Lifecycle Engine, recommend_only', () => {
    const c = Agent1LifecycleEngine.charter();
    expect(c.id).toBe(1);
    expect(c.name).toBe('Lifecycle Engine');
    expect(c.flowAiOnly).toBe(false);
    expect(c.authority).toEqual(['recommend_only']);
  });

  it('charter consumes/produces match registry topics', () => {
    const c = Agent1LifecycleEngine.charter();
    expect(c.consumes).toContain('2.build.completed.v1');
    expect(c.consumes).toContain('8.audit.completed.v1');
    expect(c.consumes).toContain('system.clearance.decision.v1');
    expect(c.produces).toEqual(['1.product.lifecycle_event.v1', '1.product.gate_request.v1']);
  });
});

// ─── Construction ───────────────────────────────────────────────────────────
describe('Agent1LifecycleEngine — construction', () => {
  it('throws when hot store is missing', () => {
    const { deps } = makeDeps();
    expect(() => new Agent1LifecycleEngine({ ...deps, hot: undefined })).toThrow(/hot store/);
  });

  it('throws when cold store is missing', () => {
    const { deps } = makeDeps();
    expect(() => new Agent1LifecycleEngine({ ...deps, cold: undefined })).toThrow(/cold store/);
  });

  it('throws when messageBus is missing', () => {
    const { deps } = makeDeps();
    expect(() => new Agent1LifecycleEngine({ ...deps, messageBus: undefined })).toThrow();
  });

  it('throws when BaseAgent required dep is missing (productScope)', () => {
    const { deps } = makeDeps();
    expect(() => new Agent1LifecycleEngine({ ...deps, productScope: undefined })).toThrow(/productScope/);
  });

  it('constructs successfully with full deps', () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    expect(a.charter.id).toBe(1);
  });
});

// ─── validateStepStart ──────────────────────────────────────────────────────
describe('validateStepStart', () => {
  it('returns ok=true for canonical 8-step names', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    for (const s of ['research', 'design', 'build', 'qa_audit', 'deploy', 'govern', 'gtm', 'monitor']) {
      const r = await a.validateStepStart(s, 'run_1');
      expect(r.ok).toBe(true);
      expect(r.policy).toBe('step-allowlist');
    }
  });

  it('returns ok=false for unknown step', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const r = await a.validateStepStart('not-a-step', 'run_1');
    expect(r.ok).toBe(false);
    expect(r.policy).toBe('step-allowlist');
    expect(r.reason).toMatch(/canonical 8-step/);
  });

  it('returns ok=false for empty stepName / runId', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    expect((await a.validateStepStart('', 'r')).ok).toBe(false);
    expect((await a.validateStepStart('research', '')).ok).toBe(false);
  });
});

// ─── detectConflicts ───────────────────────────────────────────────────────
describe('detectConflicts', () => {
  it('returns [] when no active sessions on the run', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    expect(await a.detectConflicts('run_1')).toEqual([]);
  });

  it('returns conflict when 2+ agents are active on the same step in the same run', async () => {
    const { deps, hot } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    await hot.set(HOT_KEYS.activeSessions(), {
      entries: [
        { runId: 'run_1', stepName: 'research', agentId: 6, at: 1 },
        { runId: 'run_1', stepName: 'research', agentId: 11, at: 2 },
        { runId: 'run_1', stepName: 'design', agentId: 7, at: 3 },
        { runId: 'run_2', stepName: 'research', agentId: 6, at: 4 },
      ],
    }, 3600);
    const conflicts = await a.detectConflicts('run_1');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      runId: 'run_1',
      stepName: 'research',
      agentIds: [6, 11],
    });
  });

  it('does not flag a single agent as a conflict', async () => {
    const { deps, hot } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    await hot.set(HOT_KEYS.activeSessions(), {
      entries: [{ runId: 'run_1', stepName: 'research', agentId: 6, at: 1 }],
    }, 3600);
    expect(await a.detectConflicts('run_1')).toEqual([]);
  });
});

// ─── escalateIfNeeded ──────────────────────────────────────────────────────
describe('escalateIfNeeded', () => {
  it('escalates conflict to agent-12-portfolio-risk', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const r = await a.escalateIfNeeded({
      kind: 'conflict',
      runId: 'r',
      conflicts: [{ runId: 'r', stepName: 'research', agentIds: [6, 11], reason: 'x' }],
    });
    expect(r.escalated).toBe(true);
    expect(r.target).toBe('agent-12-portfolio-risk');
  });

  it('escalates failure-threshold to human-gate', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const r = await a.escalateIfNeeded({
      kind: 'failure-threshold',
      runId: 'r',
      failuresInRun: ESCALATION_THRESHOLDS.failuresPerRun,
    });
    expect(r.escalated).toBe(true);
    expect(r.target).toBe('human-gate');
  });

  it('escalates manual to W0', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const r = await a.escalateIfNeeded({ kind: 'manual', runId: 'r' });
    expect(r.escalated).toBe(true);
    expect(r.target).toBe('w0');
  });

  it('does not escalate below threshold', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const r = await a.escalateIfNeeded({ kind: 'failure-threshold', runId: 'r', failuresInRun: 1 });
    expect(r.escalated).toBe(false);
    expect(r.target).toBeNull();
  });
});

// ─── recordLineage ─────────────────────────────────────────────────────────
describe('recordLineage', () => {
  it('appends to ColdStore with agentId=1 and authority=recommend_only', async () => {
    const { deps, cold } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    await a.recordLineage({
      runId: 'run_1',
      stepKey: 'research',
      phase: 'route.decision',
      meta: { foo: 1 },
    });
    expect(cold.entries).toHaveLength(1);
    expect(cold.entries[0]).toMatchObject({
      runId: 'run_1',
      stepKey: 'research',
      phase: 'route.decision',
      agentId: 1,
      authority: 'recommend_only',
    });
    expect(cold.entries[0].meta).toEqual({ foo: 1 });
  });

  it('uses clock.now() when at is omitted', async () => {
    const { deps, cold } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    await a.recordLineage({ runId: 'r', stepKey: 's', phase: 'step.start' });
    expect(cold.entries[0].at).toBe(1_700_000_000_000);
  });

  it('throws when required fields are missing', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    await expect(a.recordLineage({ runId: '', stepKey: 's', phase: 'step.start' })).rejects.toThrow();
    await expect(a.recordLineage({ runId: 'r', stepKey: '', phase: 'step.start' })).rejects.toThrow();
    await expect(a.recordLineage({ runId: 'r', stepKey: 's', phase: '' })).rejects.toThrow();
  });
});

// ─── plan() / act() — recommend-only contract ──────────────────────────────
describe('plan() — step.start happy path', () => {
  it('emits 1.product.lifecycle_event.v1 with event=step.recommended_start', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const plan = await a.plan({ input: { kind: 'step.start', stepName: 'research', runId: 'run_1' }, runId: 'run_1' });
    expect(plan.proposed.veto).toBeUndefined();
    expect(plan.sideEffects).toEqual([]);
    expect(plan.proposed.emit).toHaveLength(1);
    expect(plan.proposed.emit[0].topic).toBe('1.product.lifecycle_event.v1');
    expect(plan.proposed.emit[0].payload.event).toBe('step.recommended_start');
  });

  it('vetoes step.start for an unknown stepName via 1.product.gate_request.v1', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const plan = await a.plan({ input: { kind: 'step.start', stepName: 'invalid', runId: 'run_1' }, runId: 'run_1' });
    expect(plan.proposed.veto).toBeDefined();
    expect(plan.proposed.veto.reason).toMatch(/canonical 8-step/);
    expect(plan.proposed.emit[0].topic).toBe('1.product.gate_request.v1');
    expect(plan.proposed.emit[0].payload.decision).toBe('veto');
  });

  it('plan.sideEffects is always empty (recommend_only invariant)', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    for (const input of [
      { kind: 'step.start', stepName: 'research', runId: 'r' },
      { kind: 'step.complete', stepName: 'research', runId: 'r', outcome: 'ok' },
      { kind: 'step.failed', stepName: 'research', runId: 'r', error: 'x' },
      { kind: 'health.check' },
    ]) {
      const plan = await a.plan({ input, runId: 'r' });
      expect(plan.sideEffects).toEqual([]);
    }
  });

  it('plan.authorityNeeded === ["recommend_only"]', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const plan = await a.plan({ input: { kind: 'health.check' }, runId: 'r' });
    expect(plan.authorityNeeded).toEqual(['recommend_only']);
  });
});

describe('plan() — failure escalation', () => {
  it('escalates after 2 failures in the same run', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const plan1 = await a.plan({ input: { kind: 'step.failed', stepName: 'research', runId: 'r', error: 'a' }, runId: 'r' });
    // Run act() so the failure count actually persists.
    await a.act({ input: { kind: 'step.failed', stepName: 'research', runId: 'r', error: 'a' }, runId: 'r' }, plan1);
    const plan2 = await a.plan({ input: { kind: 'step.failed', stepName: 'research', runId: 'r', error: 'b' }, runId: 'r' });
    await a.act({ input: { kind: 'step.failed', stepName: 'research', runId: 'r', error: 'b' }, runId: 'r' }, plan2);
    expect(plan2.escalations.some((e) => e.escalated && e.target === 'human-gate')).toBe(true);
  });
});

describe('plan() — input validation', () => {
  it('throws on missing kind', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    await expect(a.plan({ input: {}, runId: 'r' })).rejects.toThrow(/kind/);
  });
});

describe('act() — emits to MessageBus + persists state', () => {
  it('publishes proposed events to the bus', async () => {
    const { deps, messageBus } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const seen = [];
    messageBus.subscribe('1.product.lifecycle_event.v1', (p) => seen.push(p));
    const ctx = { input: { kind: 'step.start', stepName: 'research', runId: 'r' }, runId: 'r' };
    const plan = await a.plan(ctx);
    const out = await a.act(ctx, plan);
    expect(seen).toHaveLength(1);
    expect(seen[0].event).toBe('step.recommended_start');
    expect(out.outcome).toBe('recommended');
    expect(out.sideEffects).toEqual([]);
  });

  it('sets active-session state in HotStore on step.start', async () => {
    const { deps, hot } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const ctx = { input: { kind: 'step.start', stepName: 'research', runId: 'r', agentId: 6 }, runId: 'r' };
    await a.act(ctx, await a.plan(ctx));
    const idx = await hot.get(HOT_KEYS.activeSessions());
    expect(idx.entries).toHaveLength(1);
    expect(idx.entries[0]).toMatchObject({ runId: 'r', stepName: 'research', agentId: 6 });
    const sess = await hot.get(HOT_KEYS.session('r'));
    expect(sess.runId).toBe('r');
  });

  it('removes active-session entry on step.complete', async () => {
    const { deps, hot } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const startCtx = { input: { kind: 'step.start', stepName: 'research', runId: 'r', agentId: 6 }, runId: 'r' };
    await a.act(startCtx, await a.plan(startCtx));
    const completeCtx = { input: { kind: 'step.complete', stepName: 'research', runId: 'r', agentId: 6, outcome: 'ok' }, runId: 'r' };
    await a.act(completeCtx, await a.plan(completeCtx));
    const idx = await hot.get(HOT_KEYS.activeSessions());
    expect(idx.entries).toEqual([]);
  });

  it('appends a lineage row to ColdStore on every act()', async () => {
    const { deps, cold } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const ctx = { input: { kind: 'health.check' }, runId: 'r' };
    await a.act(ctx, await a.plan(ctx));
    const lineageRows = cold.entries.filter((e) => e.agentId === 1);
    expect(lineageRows.length).toBeGreaterThanOrEqual(1);
  });

  it('refuses a tampered plan with non-empty sideEffects (recommend_only enforcement)', async () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const plan = await a.plan({ input: { kind: 'health.check' }, runId: 'r' });
    const tampered = { ...plan, sideEffects: ['mutate-something'] };
    await expect(a.act({ input: { kind: 'health.check' }, runId: 'r' }, tampered)).rejects.toThrow(/recommend_only forbids sideEffects/);
  });
});

// ─── BaseAgent.run() integration: full plan→guard→act lifecycle ────────────
describe('BaseAgent.run integration', () => {
  it('returns ok=true and outcome=recommended for a valid step.start', async () => {
    const { deps, messageBus } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const seen = [];
    messageBus.subscribe('1.product.lifecycle_event.v1', (p) => seen.push(p));
    const r = await a.run({ kind: 'step.start', stepName: 'research', runId: 'r1' });
    expect(r.ok).toBe(true);
    expect(r.result.outcome).toBe('recommended');
    expect(seen).toHaveLength(1);
  });

  it('charter is locked: a malformed authority in plan would trip BaseAgent.guard', async () => {
    // We can't override plan() externally without subclassing — instead verify
    // BaseAgent.guard's enforcement: a recommend_only charter cannot publish a
    // plan that requests a higher authority. The tampered-plan test above is
    // the act()-side analog; this test confirms the guard layer.
    const { deps } = makeDeps();
    class ElevatedPlanAgent extends Agent1LifecycleEngine {
      async plan(ctx) {
        const base = await super.plan(ctx);
        return { ...base, authorityNeeded: ['auto_write_internal'] };
      }
    }
    const a = new ElevatedPlanAgent(deps);
    const r = await a.run({ kind: 'health.check' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/authority/i);
  });
});

// ─── MessageBus subscription ───────────────────────────────────────────────
describe('attachBusSubscriptions', () => {
  it('subscribes to all charter.consumes topics', () => {
    const { deps, messageBus } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    const n = a.attachBusSubscriptions();
    expect(n).toBe(3); // 3 consumes topics in registry
    expect(messageBus.hasTopic('2.build.completed.v1')).toBe(true);
    expect(messageBus.hasTopic('8.audit.completed.v1')).toBe(true);
    expect(messageBus.hasTopic('system.clearance.decision.v1')).toBe(true);
  });

  it('is idempotent — second call returns 0', () => {
    const { deps } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    expect(a.attachBusSubscriptions()).toBe(3);
    expect(a.attachBusSubscriptions()).toBe(0);
  });

  it('records lineage when a subscribed topic fires', async () => {
    const { deps, cold, messageBus } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    a.attachBusSubscriptions();
    messageBus.publish('2.build.completed.v1', { runId: 'r', artifact: 'sha:abc' });
    // Subscription handlers are async; flush microtasks.
    await Promise.resolve(); await Promise.resolve();
    const subEntries = cold.entries.filter((e) => e.stepKey === 'subscription');
    expect(subEntries.length).toBeGreaterThanOrEqual(1);
    expect(subEntries[0].meta.observedTopic).toBe('2.build.completed.v1');
  });

  it('detachBusSubscriptions stops further lineage from subscribed topics', async () => {
    const { deps, cold, messageBus } = makeDeps();
    const a = new Agent1LifecycleEngine(deps);
    a.attachBusSubscriptions();
    a.detachBusSubscriptions();
    messageBus.publish('2.build.completed.v1', { runId: 'r' });
    await Promise.resolve(); await Promise.resolve();
    expect(cold.entries.filter((e) => e.stepKey === 'subscription')).toEqual([]);
  });
});
