// Agent #4 — Provider Onboarding — charter + recommend + plan/act + registry.
//
// Mirrors the Agent #3 test pattern (mode=step-owner) but for the cross-step
// shape: no `step` field in the envelope, registerAgent must persist with
// step=null, and the orchestrator's invokeStepOwner path does not apply.

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
  Agent4ProviderOnboarding,
  analyzeOnboarding,
  __test,
} from '../../src/lib/agents/agents/Agent4ProviderOnboarding.js';

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

function stubAdapter(map = {}) {
  return {
    probe: async (key) => map[key] ?? 'missing',
  };
}

beforeEach(() => {
  _resetActiveRegistry();
});

// ─── Charter ────────────────────────────────────────────────────────────────
describe('Agent #4 — charter', () => {
  it('static charterId === 4', () => {
    expect(Agent4ProviderOnboarding.charterId).toBe(4);
  });

  it('charter() returns id=4, name="Provider Onboarding", FlowAI-only, recommend_only', () => {
    const c = Agent4ProviderOnboarding.charter();
    expect(c.id).toBe(4);
    expect(c.name).toBe('Provider Onboarding');
    expect(c.flowAiOnly).toBe(true);
    expect(c.authority).toEqual(['recommend_only']);
  });

  it('charter.consumes is empty (registry-driven, no bus subscriptions today)', () => {
    expect(Agent4ProviderOnboarding.charter().consumes).toEqual([]);
  });

  it('charter.produces matches registry (4.provider.onboarded.v1, 4.provider.suspended.v1)', () => {
    const c = Agent4ProviderOnboarding.charter();
    expect(c.produces).toContain('4.provider.onboarded.v1');
    expect(c.produces).toContain('4.provider.suspended.v1');
  });

  it('escalationPolicy mentions CredentialAdapter probe gating per D-007', () => {
    const c = Agent4ProviderOnboarding.charter();
    expect(c.escalationPolicy).toMatch(/CredentialAdapter/);
  });
});

// ─── Construction ──────────────────────────────────────────────────────────
describe('Agent #4 — construction', () => {
  it('throws when hot store is missing', () => {
    const { deps } = makeDeps();
    expect(() => new Agent4ProviderOnboarding({ ...deps, hot: undefined }))
      .toThrow(/hot store/);
  });

  it('throws when cold store is missing', () => {
    const { deps } = makeDeps();
    expect(() => new Agent4ProviderOnboarding({ ...deps, cold: undefined }))
      .toThrow(/cold store/);
  });

  it('throws when messageBus is missing', () => {
    const { deps } = makeDeps();
    expect(() => new Agent4ProviderOnboarding({ ...deps, messageBus: undefined }))
      .toThrow(/messageBus/);
  });

  it('throws when productScope is not flowai (FlowAI-only invariant)', () => {
    const { deps } = makeDeps();
    // BaseAgent enforces this via the flowAiOnly charter flag at constructor time.
    expect(() => new Agent4ProviderOnboarding({ ...deps, productScope: 'saige' }))
      .toThrow();
  });

  it('throws when BaseAgent required dep is missing (productScope)', () => {
    const { deps } = makeDeps();
    expect(() => new Agent4ProviderOnboarding({ ...deps, productScope: undefined }))
      .toThrow(/productScope/);
  });

  it('constructs successfully without credentialAdapter (it is optional)', () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    expect(a.credentialAdapter).toBeNull();
    expect(a.charter.id).toBe(4);
  });

  it('constructs successfully with credentialAdapter injected', () => {
    const { deps } = makeDeps({ credentialAdapter: stubAdapter() });
    const a = new Agent4ProviderOnboarding(deps);
    expect(a.credentialAdapter).not.toBeNull();
  });
});

// ─── recommend() — envelope shape + happy path ─────────────────────────────
describe('Agent #4 — recommend() envelope shape', () => {
  it('returns the dispatch-mandated envelope shape on a clean activation', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      organizationName: 'Acme Corp',
      productSurfaces: ['acme.example.com'],
    });
    expect(rec.agent_id).toBe(4);
    expect(rec.agent_name).toBe('Provider Onboarding');
    expect(rec.mode).toBe('cross-step');
    expect(rec.authority).toBe('recommend_only');
    expect(typeof rec.recommendation).toBe('string');
    expect(typeof rec.confidence).toBe('number');
    expect(rec.confidence).toBeGreaterThanOrEqual(0);
    expect(rec.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(rec.blockers)).toBe(true);
    expect(Array.isArray(rec.blocker_details)).toBe(true);
  });

  it('blocker_details entries always carry kind/severity/reason fields', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({ providerId: '' });
    expect(rec.blocker_details.length).toBeGreaterThan(0);
    for (const d of rec.blocker_details) {
      expect(typeof d.kind).toBe('string');
      expect(['low', 'medium', 'high']).toContain(d.severity);
      expect(typeof d.reason).toBe('string');
    }
  });

  it('metadata.providerId / metadata.organizationName / metadata.credentialStatus are populated', async () => {
    const { deps } = makeDeps({ credentialAdapter: stubAdapter({ API_KEY: 'present' }) });
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      organizationName: 'Acme Corp',
      credentialKeys: ['API_KEY'],
      productSurfaces: ['acme.example.com'],
    });
    expect(rec.metadata.providerId).toBe('acme');
    expect(rec.metadata.organizationName).toBe('Acme Corp');
    expect(rec.metadata.credentialStatus.API_KEY).toBe('present');
    expect(rec.metadata.productSurfaceCount).toBe(1);
  });

  it('happy path with all green → recommendation=activate, confidence=0.9', async () => {
    const { deps } = makeDeps({ credentialAdapter: stubAdapter({ API_KEY: 'present', WEBHOOK_SECRET: 'present' }) });
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      organizationName: 'Acme Corp',
      credentialKeys: ['API_KEY', 'WEBHOOK_SECRET'],
      productSurfaces: ['acme.example.com'],
    });
    expect(rec.recommendation).toBe('activate');
    expect(rec.confidence).toBe(0.9);
    expect(rec.blockers).toEqual([]);
  });
});

// ─── recommend() — provider id validation ──────────────────────────────────
describe('Agent #4 — providerId validation', () => {
  it('missing providerId → refuse, confidence 0.9, high-severity blocker', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({ organizationName: 'Acme', productSurfaces: ['x.com'] });
    expect(rec.recommendation).toBe('refuse');
    expect(rec.confidence).toBe(0.9);
    expect(rec.blockers).toContain('providerId.missing');
  });

  it('providerId with underscore is rejected (would create ambiguous Doppler path)', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'bad_id',
      organizationName: 'Acme',
      productSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('refuse');
    expect(rec.blockers).toContain('providerId.invalid');
  });

  it('providerId with special chars is rejected', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme!corp',
      organizationName: 'Acme',
      productSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('refuse');
    expect(rec.blockers).toContain('providerId.invalid');
  });

  it('providerId with hyphens is accepted (slug-safe)', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme-corp-uk',
      organizationName: 'Acme',
      productSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('activate');
  });
});

// ─── recommend() — organization name validation ────────────────────────────
describe('Agent #4 — organizationName validation', () => {
  it('missing organizationName → hold, medium-severity blocker', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({ providerId: 'acme', productSurfaces: ['x.com'] });
    expect(rec.recommendation).toBe('hold');
    expect(rec.confidence).toBe(0.6);
    expect(rec.blockers).toContain('organizationName.missing');
  });

  it('whitespace-only organizationName → hold', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      organizationName: '   ',
      productSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('hold');
    expect(rec.blockers).toContain('organizationName.missing');
  });
});

// ─── recommend() — credential probing paths ────────────────────────────────
describe('Agent #4 — credential probing', () => {
  it('declared credentialKeys with no adapter → hold (medium severity)', async () => {
    const { deps } = makeDeps(); // no credentialAdapter
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      organizationName: 'Acme',
      credentialKeys: ['API_KEY'],
      productSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('hold');
    expect(rec.confidence).toBe(0.6);
    expect(rec.blockers).toContain('credentialAdapter.unavailable');
    expect(rec.metadata.credentialStatus.API_KEY).toBe('unknown');
  });

  it('all credentials present → activate', async () => {
    const { deps } = makeDeps({ credentialAdapter: stubAdapter({ API_KEY: 'present', SECRET: 'present' }) });
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      organizationName: 'Acme',
      credentialKeys: ['API_KEY', 'SECRET'],
      productSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('activate');
    expect(rec.confidence).toBe(0.9);
  });

  it('all credentials only expected → hold, confidence 0.4 (W1 wiring pending)', async () => {
    const { deps } = makeDeps({ credentialAdapter: stubAdapter({ API_KEY: 'expected', SECRET: 'expected' }) });
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      organizationName: 'Acme',
      credentialKeys: ['API_KEY', 'SECRET'],
      productSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('hold');
    expect(rec.confidence).toBe(0.4);
    expect(rec.blockers).toContain('credentials.expected_only');
  });

  it('some credentials missing → hold, confidence 0.6', async () => {
    const { deps } = makeDeps({ credentialAdapter: stubAdapter({ API_KEY: 'present', SECRET: 'missing' }) });
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      organizationName: 'Acme',
      credentialKeys: ['API_KEY', 'SECRET'],
      productSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('hold');
    expect(rec.confidence).toBe(0.6);
    expect(rec.blockers).toContain('credentials.missing');
  });

  it('mixed present + expected → hold (partially_expected)', async () => {
    const { deps } = makeDeps({ credentialAdapter: stubAdapter({ API_KEY: 'present', SECRET: 'expected' }) });
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      organizationName: 'Acme',
      credentialKeys: ['API_KEY', 'SECRET'],
      productSurfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('hold');
    expect(rec.blockers).toContain('credentials.partially_expected');
  });

  it('adapter.probe throwing degrades to status=unknown without throwing out', async () => {
    const { deps } = makeDeps({
      credentialAdapter: {
        probe: async () => { throw new Error('vault down'); },
      },
    });
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      organizationName: 'Acme',
      credentialKeys: ['API_KEY'],
      productSurfaces: ['x.com'],
    });
    expect(rec.metadata.credentialStatus.API_KEY).toBe('unknown');
    expect(rec.blockers).toContain('credentialAdapter.probeError');
    expect(rec.recommendation).toBe('hold');
  });
});

// ─── recommend() — product surfaces ────────────────────────────────────────
describe('Agent #4 — productSurfaces shape', () => {
  it('empty productSurfaces → hold (low severity)', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({ providerId: 'acme', organizationName: 'Acme' });
    expect(rec.recommendation).toBe('hold');
    expect(rec.blockers).toContain('productSurfaces.empty');
  });

  it('non-array productSurfaces falls back to "empty" without throwing', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      providerId: 'acme',
      organizationName: 'Acme',
      productSurfaces: 'not-an-array',
    });
    expect(rec.blockers).toContain('productSurfaces.empty');
  });
});

// ─── recommend() — non-blocking invariant ──────────────────────────────────
describe('Agent #4 — non-blocking invariant (never throws)', () => {
  it('null ctx → low-confidence hold without throwing', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend(null);
    expect(rec.recommendation).toBeDefined();
    expect(typeof rec.confidence).toBe('number');
    expect(rec.agent_id).toBe(4);
  });

  it('undefined ctx → low-confidence hold without throwing', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend();
    expect(rec.recommendation).toBeDefined();
    expect(rec.agent_id).toBe(4);
  });

  it('empty ctx → refuse (missing providerId is the only signal)', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({});
    expect(rec.recommendation).toBe('refuse');
    expect(rec.blockers).toContain('providerId.missing');
  });

  it('hostile getter on providerId returns hold rather than propagating throw', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const hostile = Object.defineProperty({}, 'providerId', {
      get() { throw new Error('hostile getter'); },
    });
    const rec = await a.recommend(hostile);
    expect(rec.agent_id).toBe(4);
    expect(['hold', 'refuse']).toContain(rec.recommendation);
    expect(rec.metadata.ok).toBeDefined();
  });

  it('snake_case ctx keys are accepted (provider_id, organization_name)', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const rec = await a.recommend({
      provider_id: 'acme',
      organization_name: 'Acme',
      product_surfaces: ['x.com'],
    });
    expect(rec.recommendation).toBe('activate');
  });
});

// ─── plan() / act() — BaseAgent compatibility ──────────────────────────────
describe('Agent #4 — plan()', () => {
  it('throws on missing input.kind', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    await expect(a.plan({ input: {} })).rejects.toThrow(/input.kind/);
  });

  it('throws on wrong input.kind', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    await expect(a.plan({ input: { kind: 'nonsense' } })).rejects.toThrow(/input.kind/);
  });

  it('throws on missing providerId', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    await expect(a.plan({ input: { kind: 'provider.onboard.request' } })).rejects.toThrow(/providerId/);
  });

  it('returns sideEffects=[] (recommend_only invariant)', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const plan = await a.plan({
      input: { kind: 'provider.onboard.request', providerId: 'acme', organizationName: 'Acme', productSurfaces: ['x.com'] },
    });
    expect(plan.sideEffects).toEqual([]);
  });

  it('authorityNeeded === ["recommend_only"]', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const plan = await a.plan({
      input: { kind: 'provider.onboard.request', providerId: 'acme', organizationName: 'Acme' },
    });
    expect(plan.authorityNeeded).toEqual(['recommend_only']);
  });

  it('emits exactly one 4.provider.onboarded.v1 candidate envelope', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const plan = await a.plan({
      input: { kind: 'provider.onboard.request', providerId: 'acme', organizationName: 'Acme', productSurfaces: ['x.com'] },
    });
    expect(plan.proposed.emit).toHaveLength(1);
    expect(plan.proposed.emit[0].topic).toBe('4.provider.onboarded.v1');
    expect(plan.proposed.emit[0].payload.providerId).toBe('acme');
  });
});

describe('Agent #4 — act()', () => {
  it('refuses a tampered plan with non-empty sideEffects', async () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const plan = await a.plan({
      input: { kind: 'provider.onboard.request', providerId: 'acme', organizationName: 'Acme' },
    });
    const tampered = { ...plan, sideEffects: ['rogue-write'] };
    await expect(a.act({ input: { kind: 'provider.onboard.request', providerId: 'acme' } }, tampered))
      .rejects.toThrow(/recommend_only forbids sideEffects/);
  });

  it('publishes the proposed event to MessageBus', async () => {
    const { deps, messageBus } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const seen = [];
    messageBus.subscribe('4.provider.onboarded.v1', (p) => seen.push(p));
    const ctx = { input: { kind: 'provider.onboard.request', providerId: 'acme', organizationName: 'Acme', productSurfaces: ['x.com'] } };
    const plan = await a.plan(ctx);
    const out = await a.act(ctx, plan);
    expect(seen).toHaveLength(1);
    expect(seen[0].providerId).toBe('acme');
    expect(out.sideEffects).toEqual([]);
  });

  it('persists onboarding state to HotStore and appends lineage to ColdStore', async () => {
    const { deps, hot, cold } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    const ctx = { input: { kind: 'provider.onboard.request', providerId: 'acme', organizationName: 'Acme' } };
    const plan = await a.plan(ctx);
    await a.act(ctx, plan);
    const state = await hot.get('onboarding:provider:acme');
    expect(state).toBeTruthy();
    expect(state.providerId).toBe('acme');
    const lineage = cold.entries.filter((e) => e.agentId === 4);
    expect(lineage.length).toBeGreaterThanOrEqual(1);
    expect(lineage[0].authority).toBe('recommend_only');
  });
});

// ─── Bus subscriptions ─────────────────────────────────────────────────────
describe('Agent #4 — attachBusSubscriptions (cross-step parity)', () => {
  it('attachBusSubscriptions returns 0 because consumes is empty', () => {
    const { deps } = makeDeps();
    const a = new Agent4ProviderOnboarding(deps);
    expect(a.attachBusSubscriptions()).toBe(0);
  });
});

// ─── Registry (active runtime) ─────────────────────────────────────────────
describe('Agent #4 — runtime registration', () => {
  it('registerAgent persists Agent #4 with mode=cross-step, step=null', () => {
    const r = registerAgent({
      id: 4,
      name: 'Provider Onboarding',
      mode: 'cross-step',
      authority: 'recommend_only',
      step: null,
    });
    expect(r.id).toBe(4);
    expect(r.mode).toBe('cross-step');
    expect(r.step).toBeNull();
    expect(getActiveAgent(4)).toEqual(r);
    expect(listActiveAgents()).toHaveLength(1);
  });

  it('rejects step != null for cross-step mode', () => {
    expect(() =>
      registerAgent({
        id: 4, name: 'Provider Onboarding', mode: 'cross-step', authority: 'recommend_only', step: 4,
      }),
    ).toThrow();
  });

  it('idempotent re-register: same shape returns the same record', () => {
    const a = registerAgent({
      id: 4, name: 'Provider Onboarding', mode: 'cross-step', authority: 'recommend_only', step: null,
    });
    const b = registerAgent({
      id: 4, name: 'Provider Onboarding', mode: 'cross-step', authority: 'recommend_only', step: null,
    });
    expect(a).toEqual(b);
  });
});

// ─── Pure analysis (unit-testable in isolation) ────────────────────────────
describe('Agent #4 — analyzeOnboarding (pure)', () => {
  it('exports the pure function for isolation testing', () => {
    expect(typeof analyzeOnboarding).toBe('function');
    expect(typeof __test.analyzeOnboarding).toBe('function');
    expect(__test.PROVIDER_ID_SLUG_RE).toBeInstanceOf(RegExp);
  });

  it('analyzeOnboarding never throws on null input', async () => {
    await expect(analyzeOnboarding(null, null)).resolves.toBeDefined();
    await expect(analyzeOnboarding(undefined, null)).resolves.toBeDefined();
  });

  it('confidence is always within [0, 1]', async () => {
    const cases = [
      null, undefined, {}, { providerId: 'x' }, { providerId: 'bad_id' },
      { providerId: 'acme', organizationName: 'Acme', productSurfaces: ['x.com'] },
    ];
    for (const c of cases) {
      const a = await analyzeOnboarding(c, null);
      expect(a.confidence).toBeGreaterThanOrEqual(0);
      expect(a.confidence).toBeLessThanOrEqual(1);
    }
  });
});
