import { describe, it, expect, vi } from 'vitest';

import { getAgent } from '../../src/lib/agents/_registry.ts';
import { TOPICS } from '../../src/lib/agents/MessageSchema.js';
import { MessageBus } from '../../src/lib/agents/MessageBus.ts';
import { Agent11StrategicIntelligence } from '../../src/lib/agents/agents/Agent11StrategicIntelligence.js';

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
    auditLog,
    auditWrites,
    logger,
    advance: (ms) => { t += ms; },
  };
}

const baseInput = () => ({
  kind: 'strategic.intelligence.request',
  runId: 'run-11',
  reportType: 'weekly',
  healthSignals: [],
  benchmarkReports: [{ peer: 'peer-a', delta: 'watch' }],
  regulations: [{ jurisdiction: 'global', summary: 'watch item' }],
  platformSignals: [{ source: 'industry-tracker', signal: 'new agent platform' }],
});

function capture(messageBus, topics) {
  const seen = [];
  for (const topic of topics) {
    messageBus.subscribe(topic, (payload, meta) => seen.push({ topic: meta.topic, payload }));
  }
  return seen;
}

describe('Agent #11 Strategic Intelligence - charter and partition', () => {
  it('is importable and sources its charter from the registry', () => {
    expect(Agent11StrategicIntelligence.charterId).toBe(11);
    const charter = Agent11StrategicIntelligence.charter();
    const registry = getAgent(11);
    expect(charter).toMatchObject({
      id: 11,
      name: 'Strategic Intelligence',
      flowAiOnly: true,
      authority: registry.authority,
      consumes: registry.consumes,
      produces: registry.produces,
    });
  });

  it('all consumed and produced topics exist in MessageSchema', () => {
    const charter = Agent11StrategicIntelligence.charter();
    for (const topic of [...charter.consumes, ...charter.produces]) {
      expect(TOPICS[topic], topic).toBeTruthy();
    }
  });

  it('rejects non-flowai productScope because Agent #11 is FlowAI-only', () => {
    const { deps } = makeDeps({ productScope: 'tenant-a', environment: 'demo' });
    expect(() => new Agent11StrategicIntelligence(deps)).toThrow(/FlowAI-only/);
  });
});

describe('Agent #11 Strategic Intelligence - recommend-only behavior', () => {
  it('produces a weekly brief with three strategic decision rules', async () => {
    const { deps } = makeDeps();
    const agent = new Agent11StrategicIntelligence(deps);
    const plan = await agent.plan({ input: baseInput(), runId: 'run-11' });

    expect(plan.authorityNeeded).toEqual(['recommend_only']);
    expect(plan.sideEffects).toEqual([]);
    expect(plan.signals).toHaveLength(3);
    expect(new Set(plan.signals.map((s) => s.rule))).toEqual(new Set([
      'material_event_scan',
      'trajectory_context',
      'platform_discovery_context',
    ]));
    expect(plan.proposed.emit[0].topic).toBe('11.brief.weekly.v1');
  });

  it('routes critical health signals to material alerts', async () => {
    const { deps } = makeDeps();
    const agent = new Agent11StrategicIntelligence(deps);
    const input = {
      ...baseInput(),
      healthSignals: [{ surface: 'market', severity: 'critical', evidence: 'competitor launch' }],
    };
    const plan = await agent.plan({ input, runId: input.runId });
    expect(plan.outcome).toBe('material_alert');
    expect(plan.proposed.emit[0].topic).toBe('11.alert.material.v1');
    expect(plan.proposed.emit[0].payload.material).toBe(true);
    expect(plan.proposed.emit[0].payload.urgentRules).toContain('material_event_scan');
  });

  it('routes trajectory report requests to the trajectory topic', async () => {
    const { deps } = makeDeps();
    const agent = new Agent11StrategicIntelligence(deps);
    const input = {
      ...baseInput(),
      reportType: 'trajectory',
      trajectoryNarrative: 'Momentum improving across benchmark deltas.',
    };
    const plan = await agent.plan({ input, runId: input.runId });
    expect(plan.proposed.emit[0].topic).toBe('11.trajectory.report.v1');
    expect(plan.proposed.emit[0].payload.trajectoryNarrative).toMatch(/Momentum/);
  });

  it('publishes only charter-produced topics through an injected MessageBus', async () => {
    const { deps, messageBus } = makeDeps();
    const agent = new Agent11StrategicIntelligence(deps);
    const seen = capture(messageBus, agent.charter.produces);
    const input = baseInput();
    const plan = await agent.plan({ input, runId: input.runId });
    const result = await agent.act({ input, runId: input.runId }, plan);

    expect(result.sideEffects).toEqual([]);
    expect(result.published).toEqual(['11.brief.weekly.v1']);
    expect(seen).toHaveLength(1);
    expect(agent.charter.produces).toContain(seen[0].topic);
  });

  it('returns a publish envelope when no publish-capable bus is injected', async () => {
    const { deps } = makeDeps({ messageBus: {} });
    const agent = new Agent11StrategicIntelligence(deps);
    const input = baseInput();
    const plan = await agent.plan({ input, runId: input.runId });
    const result = await agent.act({ input, runId: input.runId }, plan);

    expect(result.published).toEqual([]);
    expect(result.publishEnvelopes).toHaveLength(1);
    expect(result.publishEnvelopes[0]).toMatchObject({
      topic: '11.brief.weekly.v1',
      from: { agentId: 11, productScope: 'flowai' },
    });
  });

  it('recommend(ctx) returns the advisory recommendation envelope', async () => {
    const { deps } = makeDeps();
    const agent = new Agent11StrategicIntelligence(deps);
    const rec = await agent.recommend({
      runId: 'run-rec-11',
      benchmarkReports: [{ peer: 'peer-a' }],
      platformSignals: [{ source: 'tracker' }],
    });
    expect(rec.agent_id).toBe(11);
    expect(rec.recommendation).toMatch(/Strategic Intelligence/);
    expect(rec.confidence).toBeGreaterThan(0);
    expect(rec.metadata.ok).toBe(true);
    expect(rec.metadata.emit).toEqual(['11.brief.weekly.v1']);
  });

  it('run() stays recommend-only and writes BaseAgent audit phases', async () => {
    const { deps, auditWrites } = makeDeps();
    const agent = new Agent11StrategicIntelligence(deps);
    const result = await agent.run(baseInput());
    expect(result.ok).toBe(true);
    expect(result.result.sideEffects).toEqual([]);
    expect(auditWrites.map((e) => e.phase)).toContain('guard.ok');
    expect(auditWrites.map((e) => e.phase)).toContain('act.ok');
  });
});
