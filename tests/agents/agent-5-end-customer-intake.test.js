// Agent #5 — End-Customer Intake — charter + recommend + plan/act + registry
// + bus subscription.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerAgent,
  getActiveAgent,
  listActiveAgents,
  _resetActiveRegistry,
} from '../../src/lib/agents/_registry.ts';
import {
  createMemoryHotStore,
  createMemoryColdStore,
} from '../../src/lib/agents/orchestrator/OrchestratorHub.ts';
import { MessageBus } from '../../src/lib/agents/MessageBus.ts';
import {
  Agent5EndCustomerIntake,
  analyzeIntake,
  __test,
} from '../../src/lib/agents/agents/Agent5EndCustomerIntake.js';

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
    hot, cold, messageBus, auditLog, logger,
    advance: (ms) => { t += ms; },
  };
}

beforeEach(() => {
  _resetActiveRegistry();
});

// ─── Charter ────────────────────────────────────────────────────────────────
describe('Agent #5 — charter', () => {
  it('static charterId === 5', () => {
    expect(Agent5EndCustomerIntake.charterId).toBe(5);
  });

  it('charter() returns id=5, name="End-Customer Intake", FlowAI-only, recommend_only', () => {
    const c = Agent5EndCustomerIntake.charter();
    expect(c.id).toBe(5);
    expect(c.name).toBe('End-Customer Intake');
    expect(c.flowAiOnly).toBe(true);
    expect(c.authority).toEqual(['recommend_only']);
  });

  it('charter.consumes contains exactly 4.provider.suspended.v1', () => {
    expect(Agent5EndCustomerIntake.charter().consumes).toEqual(['4.provider.suspended.v1']);
  });

  it('charter.produces contains exactly 5.endcustomer.intake.completed.v1', () => {
    expect(Agent5EndCustomerIntake.charter().produces).toEqual(['5.endcustomer.intake.completed.v1']);
  });

  it('escalationPolicy explicitly mentions suspended/unprovisioned rejection', () => {
    const c = Agent5EndCustomerIntake.charter();
    expect(c.escalationPolicy).toMatch(/suspended|unprovisioned/);
  });
});

// ─── Construction ──────────────────────────────────────────────────────────
describe('Agent #5 — construction', () => {
  it('throws when hot store is missing', () => {
    const { deps } = makeDeps();
    expect(() => new Agent5EndCustomerIntake({ ...deps, hot: undefined }))
      .toThrow(/hot store/);
  });

  it('throws when cold store is missing', () => {
    const { deps } = makeDeps();
    expect(() => new Agent5EndCustomerIntake({ ...deps, cold: undefined }))
      .toThrow(/cold store/);
  });

  it('throws when messageBus is missing', () => {
    const { deps } = makeDeps();
    expect(() => new Agent5EndCustomerIntake({ ...deps, messageBus: undefined }))
      .toThrow(/messageBus/);
  });

  it('throws when productScope is not flowai (FlowAI-only invariant)', () => {
    const { deps } = makeDeps();
    expect(() => new Agent5EndCustomerIntake({ ...deps, productScope: 'saige' }))
      .toThrow();
  });

  it('throws when BaseAgent required dep is missing (productScope)', () => {
    const { deps } = makeDeps();
    expect(() => new Agent5EndCustomerIntake({ ...deps, productScope: undefined }))
      .toThrow(/productScope/);
  });

  it('constructs successfully with full deps', () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    expect(a.charter.id).toBe(5);
  });
});

// ─── recommend() — envelope shape ──────────────────────────────────────────
describe('Agent #5 — recommend() envelope shape', () => {
  it('returns the dispatch-mandated envelope shape on a clean provision', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'cust1',
      organizationName: 'Acme Corp',
      customerSurfaces: ['app.cust1.example.com'],
    });
    expect(rec.agent_id).toBe(5);
    expect(rec.agent_name).toBe('End-Customer Intake');
    expect(rec.mode).toBe('cross-step');
    expect(rec.authority).toBe('recommend_only');
    expect(typeof rec.recommendation).toBe('string');
    expect(typeof rec.confidence).toBe('number');
    expect(rec.confidence).toBeGreaterThanOrEqual(0);
    expect(rec.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(rec.blockers)).toBe(true);
    expect(Array.isArray(rec.blocker_details)).toBe(true);
  });

  it('blocker_details entries carry kind/severity/reason', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({});
    expect(rec.blocker_details.length).toBeGreaterThan(0);
    for (const d of rec.blocker_details) {
      expect(typeof d.kind).toBe('string');
      expect(['low', 'medium', 'high']).toContain(d.severity);
      expect(typeof d.reason).toBe('string');
    }
  });

  it('metadata.providerId / customerId / organizationName populated', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'cust1',
      organizationName: 'Acme',
      customerSurfaces: ['x.com'],
    });
    expect(rec.metadata.providerId).toBe('acme');
    expect(rec.metadata.customerId).toBe('cust1');
    expect(rec.metadata.organizationName).toBe('Acme');
    expect(rec.metadata.customerSurfaceCount).toBe(1);
  });

  it('happy path → recommendation=provision, confidence=0.9', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'cust1',
      organizationName: 'Acme',
      customerSurfaces: ['app.cust1.example.com'],
    });
    expect(rec.recommendation).toBe('provision');
    expect(rec.confidence).toBe(0.9);
    expect(rec.blockers).toEqual([]);
  });
});

// ─── recommend() — provider id validation ──────────────────────────────────
describe('Agent #5 — providerId validation', () => {
  it('missing providerId → refuse, confidence 0.9, high-severity blocker', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({ customerId: 'c', organizationName: 'O', customerSurfaces: ['x.com'] });
    expect(rec.recommendation).toBe('refuse');
    expect(rec.confidence).toBe(0.9);
    expect(rec.blockers).toContain('providerId.missing');
  });

  it('providerId with underscore is rejected', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'bad_id',
      customerId: 'cust1',
      organizationName: 'O',
      customerSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('refuse');
    expect(rec.blockers).toContain('providerId.invalid');
  });

  it('providerId with special chars is rejected', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme!corp',
      customerId: 'cust1',
      organizationName: 'O',
      customerSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('refuse');
    expect(rec.blockers).toContain('providerId.invalid');
  });

  it('providerId with hyphens accepted (slug-safe)', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme-corp-uk',
      customerId: 'cust-1',
      organizationName: 'Acme',
      customerSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('provision');
  });
});

// ─── recommend() — customer id validation ──────────────────────────────────
describe('Agent #5 — customerId validation', () => {
  it('missing customerId → refuse', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      organizationName: 'O',
      customerSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('refuse');
    expect(rec.blockers).toContain('customerId.missing');
  });

  it('customerId with underscore is rejected (slug rule)', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'bad_id',
      organizationName: 'O',
      customerSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('refuse');
    expect(rec.blockers).toContain('customerId.invalid');
  });

  it('customerId with hyphens accepted', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'cust-1',
      organizationName: 'O',
      customerSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('provision');
  });
});

// ─── recommend() — organization / surfaces ────────────────────────────────
describe('Agent #5 — organizationName + customerSurfaces', () => {
  it('missing organizationName → hold (medium)', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'cust1',
      customerSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('hold');
    expect(rec.confidence).toBe(0.6);
    expect(rec.blockers).toContain('organizationName.missing');
  });

  it('whitespace-only organizationName → hold', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'cust1',
      organizationName: '   ',
      customerSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('hold');
    expect(rec.blockers).toContain('organizationName.missing');
  });

  it('empty customerSurfaces → hold (low severity only)', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'cust1',
      organizationName: 'Acme',
    });
    expect(rec.recommendation).toBe('hold');
    expect(rec.confidence).toBe(0.4);
    expect(rec.blockers).toContain('customerSurfaces.empty');
  });
});

// ─── recommend() — provider scope checks (suspended / unprovisioned) ──────
describe('Agent #5 — provider scope checks', () => {
  it('explicit providerStatus.suspended=true → refuse', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'cust1',
      organizationName: 'Acme',
      customerSurfaces: ['x.com'],
      providerStatus: { suspended: true },
    });
    expect(rec.recommendation).toBe('refuse');
    expect(rec.blockers).toContain('provider.suspended.explicit');
    expect(rec.metadata.suspendedObserved).toBe(true);
  });

  it('explicit providerStatus.provisioned=false → refuse', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'cust1',
      organizationName: 'Acme',
      customerSurfaces: ['x.com'],
      providerStatus: { provisioned: false },
    });
    expect(rec.recommendation).toBe('refuse');
    expect(rec.blockers).toContain('provider.unprovisioned');
  });

  it('absent providerStatus + clean bus cache → provision (silence is OK)', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'cust1',
      organizationName: 'Acme',
      customerSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('provision');
  });

  it('bus-observed suspension → refuse (no explicit status needed)', async () => {
    const { deps, hot } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    // Seed the suspended cache directly via the internal API.
    await a._addSuspended('acme');
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'cust1',
      organizationName: 'Acme',
      customerSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('refuse');
    expect(rec.blockers).toContain('provider.suspended.observed');
    expect(rec.metadata.suspendedObserved).toBe(true);
    // Sanity: the cache really did contain the entry.
    const cached = await hot.get('intake:suspended-providers');
    expect(cached.providers).toContain('acme');
  });

  it('bus-observed suspension is NOT duplicated when explicit suspended=true is also set', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    await a._addSuspended('acme');
    const rec = await a.recommend({
      providerId: 'acme',
      customerId: 'cust1',
      organizationName: 'Acme',
      customerSurfaces: ['x.com'],
      providerStatus: { suspended: true },
    });
    expect(rec.recommendation).toBe('refuse');
    // Explicit blocker is present; observed kind should NOT be emitted on top.
    expect(rec.blockers).toContain('provider.suspended.explicit');
    expect(rec.blockers).not.toContain('provider.suspended.observed');
  });

  it('bus subscription handler caches suspended providerId from the payload', async () => {
    const { deps, messageBus, hot } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const n = a.attachBusSubscriptions();
    expect(n).toBe(1);
    messageBus.publish('4.provider.suspended.v1', { providerId: 'badco' });
    await Promise.resolve(); await Promise.resolve();
    const cached = await hot.get('intake:suspended-providers');
    expect(cached.providers).toContain('badco');
  });

  it('attachBusSubscriptions is idempotent (second call returns 0)', () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    expect(a.attachBusSubscriptions()).toBe(1);
    expect(a.attachBusSubscriptions()).toBe(0);
  });

  it('detachBusSubscriptions disconnects the bus handler', async () => {
    const { deps, messageBus, hot } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    a.attachBusSubscriptions();
    a.detachBusSubscriptions();
    messageBus.publish('4.provider.suspended.v1', { providerId: 'detached' });
    await Promise.resolve(); await Promise.resolve();
    const cached = await hot.get('intake:suspended-providers');
    expect(cached?.providers ?? []).not.toContain('detached');
  });

  it('subscription handler ignores payloads with non-string providerId', async () => {
    const { deps, messageBus, hot } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    a.attachBusSubscriptions();
    messageBus.publish('4.provider.suspended.v1', { providerId: 12345 });
    await Promise.resolve(); await Promise.resolve();
    const cached = await hot.get('intake:suspended-providers');
    // Either no cache yet, or providers is an empty list.
    expect(cached?.providers ?? []).not.toContain(12345);
  });
});

// ─── Non-blocking invariant ────────────────────────────────────────────────
describe('Agent #5 — non-blocking invariant (never throws)', () => {
  it('null ctx → low-confidence hold-or-refuse without throwing', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend(null);
    expect(rec.agent_id).toBe(5);
    expect(typeof rec.confidence).toBe('number');
  });

  it('undefined ctx → low-confidence response without throwing', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend();
    expect(rec.agent_id).toBe(5);
  });

  it('empty ctx → refuse (missing providerId + customerId)', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({});
    expect(rec.recommendation).toBe('refuse');
    expect(rec.blockers).toContain('providerId.missing');
    expect(rec.blockers).toContain('customerId.missing');
  });

  it('hostile getter on providerId is suppressed', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const hostile = Object.defineProperty({}, 'providerId', {
      get() { throw new Error('hostile'); },
    });
    const rec = await a.recommend(hostile);
    expect(rec.agent_id).toBe(5);
    expect(rec.metadata.ok).toBeDefined();
  });

  it('snake_case ctx keys accepted (provider_id, customer_id, organization_name, customer_surfaces)', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      provider_id: 'acme',
      customer_id: 'cust1',
      organization_name: 'Acme',
      customer_surfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('provision');
  });

  it('snake_case provider_status accepted', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const rec = await a.recommend({
      provider_id: 'acme',
      customer_id: 'cust1',
      organization_name: 'Acme',
      customer_surfaces: ['x.com'],
      provider_status: { suspended: true },
    });
    expect(rec.recommendation).toBe('refuse');
    expect(rec.blockers).toContain('provider.suspended.explicit');
  });
});

// ─── plan() / act() — BaseAgent compatibility ──────────────────────────────
describe('Agent #5 — plan()', () => {
  it('throws on missing input.kind', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    await expect(a.plan({ input: {} })).rejects.toThrow(/input.kind/);
  });

  it('throws on wrong input.kind', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    await expect(a.plan({ input: { kind: 'nope' } })).rejects.toThrow(/input.kind/);
  });

  it('throws on missing providerId', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    await expect(a.plan({ input: { kind: 'endcustomer.intake.request', customerId: 'c' } })).rejects.toThrow(/providerId/);
  });

  it('throws on missing customerId', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    await expect(a.plan({ input: { kind: 'endcustomer.intake.request', providerId: 'p' } })).rejects.toThrow(/customerId/);
  });

  it('returns sideEffects=[] (recommend_only invariant)', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const plan = await a.plan({
      input: { kind: 'endcustomer.intake.request', providerId: 'acme', customerId: 'cust1', organizationName: 'Acme', customerSurfaces: ['x.com'] },
    });
    expect(plan.sideEffects).toEqual([]);
  });

  it('authorityNeeded === ["recommend_only"]', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const plan = await a.plan({
      input: { kind: 'endcustomer.intake.request', providerId: 'acme', customerId: 'cust1', organizationName: 'Acme' },
    });
    expect(plan.authorityNeeded).toEqual(['recommend_only']);
  });

  it('emits exactly one 5.endcustomer.intake.completed.v1 candidate', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const plan = await a.plan({
      input: { kind: 'endcustomer.intake.request', providerId: 'acme', customerId: 'cust1', organizationName: 'Acme', customerSurfaces: ['x.com'] },
    });
    expect(plan.proposed.emit).toHaveLength(1);
    expect(plan.proposed.emit[0].topic).toBe('5.endcustomer.intake.completed.v1');
    expect(plan.proposed.emit[0].payload.providerId).toBe('acme');
    expect(plan.proposed.emit[0].payload.customerId).toBe('cust1');
  });
});

describe('Agent #5 — act()', () => {
  it('refuses a tampered plan with non-empty sideEffects', async () => {
    const { deps } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const plan = await a.plan({
      input: { kind: 'endcustomer.intake.request', providerId: 'acme', customerId: 'cust1', organizationName: 'Acme' },
    });
    const tampered = { ...plan, sideEffects: ['rogue'] };
    await expect(a.act({ input: { kind: 'endcustomer.intake.request', providerId: 'acme', customerId: 'cust1' } }, tampered))
      .rejects.toThrow(/recommend_only forbids sideEffects/);
  });

  it('publishes the proposed event to MessageBus', async () => {
    const { deps, messageBus } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const seen = [];
    messageBus.subscribe('5.endcustomer.intake.completed.v1', (p) => seen.push(p));
    const ctx = { input: { kind: 'endcustomer.intake.request', providerId: 'acme', customerId: 'cust1', organizationName: 'Acme', customerSurfaces: ['x.com'] } };
    const plan = await a.plan(ctx);
    const out = await a.act(ctx, plan);
    expect(seen).toHaveLength(1);
    expect(seen[0].providerId).toBe('acme');
    expect(seen[0].customerId).toBe('cust1');
    expect(out.sideEffects).toEqual([]);
  });

  it('persists intake state to HotStore and appends lineage to ColdStore', async () => {
    const { deps, hot, cold } = makeDeps();
    const a = new Agent5EndCustomerIntake(deps);
    const ctx = { input: { kind: 'endcustomer.intake.request', providerId: 'acme', customerId: 'cust1', organizationName: 'Acme' } };
    const plan = await a.plan(ctx);
    await a.act(ctx, plan);
    const state = await hot.get('intake:acme:cust1');
    expect(state).toBeTruthy();
    expect(state.providerId).toBe('acme');
    expect(state.customerId).toBe('cust1');
    const lineage = cold.entries.filter((e) => e.agentId === 5);
    expect(lineage.length).toBeGreaterThanOrEqual(1);
    expect(lineage[0].authority).toBe('recommend_only');
  });
});

// ─── Registry (active runtime) ─────────────────────────────────────────────
describe('Agent #5 — runtime registration', () => {
  it('registerAgent persists Agent #5 with mode=cross-step, step=null', () => {
    const r = registerAgent({
      id: 5,
      name: 'End-Customer Intake',
      mode: 'cross-step',
      authority: 'recommend_only',
      step: null,
    });
    expect(r.id).toBe(5);
    expect(r.mode).toBe('cross-step');
    expect(r.step).toBeNull();
    expect(getActiveAgent(5)).toEqual(r);
    expect(listActiveAgents()).toHaveLength(1);
  });

  it('rejects step != null for cross-step mode', () => {
    expect(() =>
      registerAgent({
        id: 5, name: 'End-Customer Intake', mode: 'cross-step', authority: 'recommend_only', step: 5,
      }),
    ).toThrow();
  });

  it('idempotent re-register: same shape returns the same record', () => {
    const a = registerAgent({
      id: 5, name: 'End-Customer Intake', mode: 'cross-step', authority: 'recommend_only', step: null,
    });
    const b = registerAgent({
      id: 5, name: 'End-Customer Intake', mode: 'cross-step', authority: 'recommend_only', step: null,
    });
    expect(a).toEqual(b);
  });
});

// ─── Pure analysis ─────────────────────────────────────────────────────────
describe('Agent #5 — analyzeIntake (pure)', () => {
  it('exports the pure function and __test scaffold', () => {
    expect(typeof analyzeIntake).toBe('function');
    expect(typeof __test.analyzeIntake).toBe('function');
    expect(__test.ID_SLUG_RE).toBeInstanceOf(RegExp);
  });

  it('never throws on null input', () => {
    expect(() => analyzeIntake(null, new Set())).not.toThrow();
    expect(() => analyzeIntake(undefined, new Set())).not.toThrow();
  });

  it('confidence is always within [0,1]', () => {
    const cases = [
      null, undefined, {},
      { providerId: 'x' },
      { providerId: 'bad_id', customerId: 'cust1' },
      { providerId: 'acme', customerId: 'cust1', organizationName: 'Acme', customerSurfaces: ['x.com'] },
      { providerId: 'acme', customerId: 'cust1', organizationName: 'Acme', customerSurfaces: ['x.com'], providerStatus: { suspended: true } },
    ];
    for (const c of cases) {
      const a = analyzeIntake(c, new Set());
      expect(a.confidence).toBeGreaterThanOrEqual(0);
      expect(a.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('tolerates non-Set suspendedSet (e.g. undefined / array)', () => {
    expect(() => analyzeIntake({}, undefined)).not.toThrow();
    expect(() => analyzeIntake({}, [])).not.toThrow();
  });
});
