import { describe, it, expect, vi } from 'vitest';

import { getAgent } from '../../src/lib/agents/_registry.ts';
import { TOPICS } from '../../src/lib/agents/MessageSchema.js';
import { MessageBus } from '../../src/lib/agents/MessageBus.ts';
import { Agent12PortfolioRisk } from '../../src/lib/agents/agents/Agent12PortfolioRisk.js';

function makeDeps(overrides = {}) {
  let t = 1_700_000_000_000;
  const clock = { now: () => t };
  const messageBus = new MessageBus({ clock: clock.now });
  const auditWrites = [];
  const auditLog = { write: vi.fn(async (e) => { auditWrites.push(e); }) };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    deps: {
      logger,
      messageBus,
      auditLog,
      clock,
      productScope: 'flowai',
      environment: 'prod',
      ...overrides,
    },
    messageBus,
    auditWrites,
  };
}

const baseInput = () => ({
  kind: 'portfolio.risk.request',
  runId: 'run-12',
  anomalies: [],
  threats: [],
  patterns: [],
  affectedSurfaces: ['portfolio-dashboard'],
});

function capture(messageBus, topics) {
  const seen = [];
  for (const topic of topics) {
    messageBus.subscribe(topic, (payload, meta) => seen.push({ topic: meta.topic, payload }));
  }
  return seen;
}

describe('Agent #12 Portfolio Risk - charter and partition', () => {
  it('is importable and sources its charter from the registry', () => {
    expect(Agent12PortfolioRisk.charterId).toBe(12);
    const charter = Agent12PortfolioRisk.charter();
    const registry = getAgent(12);
    expect(charter).toMatchObject({
      id: 12,
      name: 'Portfolio Risk & Fire Detection',
      flowAiOnly: true,
      authority: registry.authority,
      consumes: registry.consumes,
      produces: registry.produces,
    });
  });

  it('all consumed and produced topics exist in MessageSchema', () => {
    const charter = Agent12PortfolioRisk.charter();
    for (const topic of [...charter.consumes, ...charter.produces]) {
      expect(TOPICS[topic], topic).toBeTruthy();
    }
  });

  it('rejects non-flowai productScope because Agent #12 is FlowAI-only', () => {
    const { deps } = makeDeps({ productScope: 'tenant-a', environment: 'demo' });
    expect(() => new Agent12PortfolioRisk(deps)).toThrow(/FlowAI-only/);
  });
});

describe('Agent #12 Portfolio Risk - fire routing', () => {
  it('emits daily health when no portfolio fire is active', async () => {
    const { deps } = makeDeps();
    const agent = new Agent12PortfolioRisk(deps);
    const plan = await agent.plan({ input: baseInput(), runId: 'run-12' });
    expect(plan.authorityNeeded).toEqual(['recommend_only']);
    expect(plan.sideEffects).toEqual([]);
    expect(plan.signals).toHaveLength(3);
    expect(plan.proposed.emit[0].topic).toBe('12.health.daily.v1');
  });

  it('routes critical anomalies to P0 with MessageSchema-required fields', async () => {
    const { deps } = makeDeps();
    const agent = new Agent12PortfolioRisk(deps);
    const input = {
      ...baseInput(),
      anomalies: [{ surface: 'checkout', severity: 'critical', evidence: 'down' }],
      detectedAt: '2026-06-05T05:10:00Z',
    };
    const plan = await agent.plan({ input, runId: input.runId });
    expect(plan.proposed.emit[0]).toMatchObject({
      topic: '12.fire.p0.v1',
      payload: {
        title: 'P0 portfolio fire detected',
        affectedSurfaces: expect.arrayContaining(['checkout']),
        detectedAt: '2026-06-05T05:10:00Z',
      },
    });
    expect(plan.proposed.emit[0].payload.evidence).toContain('p0_fire_detection');
  });

  it('routes self-protection threats to P1', async () => {
    const { deps } = makeDeps();
    const agent = new Agent12PortfolioRisk(deps);
    const input = {
      ...baseInput(),
      threats: [{ surface: 'pricing', signatureId: 'clone-risk' }],
    };
    const plan = await agent.plan({ input, runId: input.runId });
    expect(plan.proposed.emit[0].topic).toBe('12.fire.p1.v1');
    expect(plan.proposed.emit[0].payload.affectedSurfaces).toContain('pricing');
    expect(plan.proposed.emit[0].payload.evidence).toContain('threat_correlation');
  });

  it('routes repeated patterns to P2 slow-burn envelope', async () => {
    const { deps } = makeDeps();
    const agent = new Agent12PortfolioRisk(deps);
    const input = {
      ...baseInput(),
      patterns: ['latency regression'],
      window: '7d',
    };
    const plan = await agent.plan({ input, runId: input.runId });
    expect(plan.proposed.emit[0]).toMatchObject({
      topic: '12.fire.p2.v1',
      payload: { pattern: 'slow_burn_pattern', window: '7d' },
    });
  });

  it('can emit portfolio.fire.v1 rollups without creating new topics', async () => {
    const { deps } = makeDeps();
    const agent = new Agent12PortfolioRisk(deps);
    const input = {
      ...baseInput(),
      rollup: true,
      threats: [{ surface: 'docs', signatureId: 'clone-risk' }],
    };
    const plan = await agent.plan({ input, runId: input.runId });
    expect(plan.proposed.emit[0].topic).toBe('portfolio.fire.v1');
    expect(agent.charter.produces).toContain('portfolio.fire.v1');
  });
});

describe('Agent #12 Portfolio Risk - publish and recommendation contract', () => {
  it('publishes only charter-produced topics through an injected MessageBus', async () => {
    const { deps, messageBus } = makeDeps();
    const agent = new Agent12PortfolioRisk(deps);
    const seen = capture(messageBus, agent.charter.produces);
    const input = {
      ...baseInput(),
      threats: [{ surface: 'pricing', signatureId: 'clone-risk' }],
    };
    const plan = await agent.plan({ input, runId: input.runId });
    const result = await agent.act({ input, runId: input.runId }, plan);
    expect(result.sideEffects).toEqual([]);
    expect(result.published).toEqual(['12.fire.p1.v1']);
    expect(seen).toHaveLength(1);
    expect(agent.charter.produces).toContain(seen[0].topic);
  });

  it('returns a publish envelope when no publish-capable bus is injected', async () => {
    const { deps } = makeDeps({ messageBus: {} });
    const agent = new Agent12PortfolioRisk(deps);
    const input = baseInput();
    const plan = await agent.plan({ input, runId: input.runId });
    const result = await agent.act({ input, runId: input.runId }, plan);
    expect(result.published).toEqual([]);
    expect(result.publishEnvelopes[0]).toMatchObject({
      topic: '12.health.daily.v1',
      from: { agentId: 12, productScope: 'flowai' },
    });
  });

  it('recommend(ctx) returns a valid advisory envelope', async () => {
    const { deps } = makeDeps();
    const agent = new Agent12PortfolioRisk(deps);
    const rec = await agent.recommend({
      runId: 'run-rec-12',
      healthSignals: [],
    });
    expect(rec.agent_id).toBe(12);
    expect(rec.recommendation).toMatch(/Portfolio Risk/);
    expect(rec.confidence).toBeGreaterThan(0);
    expect(rec.metadata.ok).toBe(true);
    expect(rec.metadata.emit).toEqual(['12.health.daily.v1']);
  });

  it('run() stays recommend-only and records BaseAgent audit phases', async () => {
    const { deps, auditWrites } = makeDeps();
    const agent = new Agent12PortfolioRisk(deps);
    const result = await agent.run(baseInput());
    expect(result.ok).toBe(true);
    expect(result.result.sideEffects).toEqual([]);
    expect(auditWrites.map((e) => e.phase)).toContain('guard.ok');
    expect(auditWrites.map((e) => e.phase)).toContain('act.ok');
  });
});
