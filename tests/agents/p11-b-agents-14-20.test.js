import { describe, it, expect, vi } from 'vitest';

import { getAgent } from '../../src/lib/agents/_registry.ts';
import { TOPICS } from '../../src/lib/agents/MessageSchema.js';
import { MessageBus } from '../../src/lib/agents/MessageBus.ts';
import { Agent14PublicPolicy } from '../../src/lib/agents/agents/Agent14PublicPolicy.js';
import { Agent15BenchmarkingCompetition } from '../../src/lib/agents/agents/Agent15BenchmarkingCompetition.js';
import { Agent16ProductivityHR } from '../../src/lib/agents/agents/Agent16ProductivityHR.js';
import { Agent17ProductEvolution } from '../../src/lib/agents/agents/Agent17ProductEvolution.js';
import { Agent18BusinessPlanningPerformance } from '../../src/lib/agents/agents/Agent18BusinessPlanningPerformance.js';
import { Agent19TechnologicalEvolution } from '../../src/lib/agents/agents/Agent19TechnologicalEvolution.js';
import { Agent20EnvironmentalImpacts } from '../../src/lib/agents/agents/Agent20EnvironmentalImpacts.js';

const CASES = Object.freeze([
  {
    id: 14,
    Class: Agent14PublicPolicy,
    flowAiOnly: true,
    input: { kind: 'public.policy.request', runId: 'run-14', eventType: 'new', jurisdiction: 'EU', citation: 'EU-AI-Act', summary: 'New compliance event', effectiveDate: '2026-08-01' },
    expectedTopic: '14.regulation.new.v1',
  },
  {
    id: 15,
    Class: Agent15BenchmarkingCompetition,
    flowAiOnly: false,
    input: { kind: 'benchmarking.request', runId: 'run-15', peerSet: ['peer-a'], designSpec: { targetClass: 'web' }, dimensions: ['ux', 'cost', 'accessibility'] },
    expectedTopic: '15.benchmark.report.v1',
  },
  {
    id: 16,
    Class: Agent16ProductivityHR,
    flowAiOnly: true,
    input: { kind: 'productivity.hr.request', runId: 'run-16', teamScope: 'support-team', metrics: [{ name: 'cycle_time', value: 2, unit: 'days' }] },
    expectedTopic: '16.productivity.report.v1',
  },
  {
    id: 17,
    Class: Agent17ProductEvolution,
    flowAiOnly: false,
    input: { kind: 'product.evolution.request', runId: 'run-17', audit: { score: 88 }, benchmarkDeltas: [{ feature: 'search' }], proposal: 'Improve search handoff' },
    expectedTopic: '17.evolution.proposal.v1',
  },
  {
    id: 18,
    Class: Agent18BusinessPlanningPerformance,
    flowAiOnly: true,
    input: { kind: 'business.performance.request', runId: 'run-18', health: { status: 'watch' }, baseline: 100, current: 122, deviationPct: 22 },
    expectedTopic: '18.plan.update.v1',
  },
  {
    id: 19,
    Class: Agent19TechnologicalEvolution,
    flowAiOnly: false,
    input: { kind: 'technological.evolution.request', runId: 'run-19', technology: 'agent runtime', impactScope: 'tooling', signals: [{ source: 'release-note' }] },
    expectedTopic: '19.tech.signal.v1',
  },
  {
    id: 20,
    Class: Agent20EnvironmentalImpacts,
    flowAiOnly: false,
    input: { kind: 'environmental.impact.request', runId: 'run-20', assessmentScope: 'deployment', metrics: [{ name: 'energy', value: 95, threshold: 90 }] },
    expectedTopic: '20.impact.assessment.v1',
  },
]);

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

function capture(messageBus, topics) {
  const seen = [];
  for (const topic of topics) {
    messageBus.subscribe(topic, (payload, meta) => seen.push({ topic: meta.topic, payload }));
  }
  return seen;
}

describe('P11-B Agents #14-#20 - charter and partition', () => {
  for (const entry of CASES) {
    it(`Agent #${entry.id} imports and matches registry charter`, () => {
      expect(entry.Class.charterId).toBe(entry.id);
      const charter = entry.Class.charter();
      const registry = getAgent(entry.id);
      expect(charter).toMatchObject({
        id: entry.id,
        name: registry.name,
        flowAiOnly: entry.flowAiOnly,
        authority: registry.authority,
        consumes: registry.consumes,
        produces: registry.produces,
      });
      for (const topic of [...charter.consumes, ...charter.produces]) {
        expect(TOPICS[topic], topic).toBeTruthy();
      }
    });
  }

  it('FlowAI-only agents #14, #16, and #18 reject tenant scopes', () => {
    for (const entry of CASES.filter((c) => c.flowAiOnly)) {
      const { deps } = makeDeps({ productScope: 'tenant-a', environment: 'demo' });
      expect(() => new entry.Class(deps), `Agent ${entry.id}`).toThrow(/FlowAI-only/);
    }
  });

  it('embedded agents #15, #17, #19, and #20 accept tenant scopes', () => {
    for (const entry of CASES.filter((c) => !c.flowAiOnly)) {
      const { deps } = makeDeps({ productScope: 'tenant-a', environment: 'demo' });
      expect(() => new entry.Class(deps), `Agent ${entry.id}`).not.toThrow();
    }
  });
});

describe('P11-B Agents #14-#20 - recommend-only plans and publishing', () => {
  for (const entry of CASES) {
    it(`Agent #${entry.id} emits canonical ${entry.expectedTopic}`, async () => {
      const { deps } = makeDeps();
      const agent = new entry.Class(deps);
      const plan = await agent.plan({ input: entry.input, runId: entry.input.runId });
      expect(plan.authorityNeeded).toEqual(['recommend_only']);
      expect(plan.sideEffects).toEqual([]);
      expect(plan.signals).toHaveLength(3);
      expect(plan.proposed.emit[0].topic).toBe(entry.expectedTopic);
      expect(agent.charter.produces).toContain(entry.expectedTopic);
    });

    it(`Agent #${entry.id} publishes only charter-produced topics`, async () => {
      const { deps, messageBus } = makeDeps();
      const agent = new entry.Class(deps);
      const seen = capture(messageBus, agent.charter.produces);
      const plan = await agent.plan({ input: entry.input, runId: entry.input.runId });
      const result = await agent.act({ input: entry.input, runId: entry.input.runId }, plan);
      expect(result.sideEffects).toEqual([]);
      expect(result.published).toEqual([entry.expectedTopic]);
      expect(seen).toHaveLength(1);
      expect(agent.charter.produces).toContain(seen[0].topic);
    });

    it(`Agent #${entry.id} returns a no-bus publish envelope`, async () => {
      const { deps } = makeDeps({ messageBus: {} });
      const agent = new entry.Class(deps);
      const plan = await agent.plan({ input: entry.input, runId: entry.input.runId });
      const result = await agent.act({ input: entry.input, runId: entry.input.runId }, plan);
      expect(result.published).toEqual([]);
      expect(result.publishEnvelopes[0]).toMatchObject({
        topic: entry.expectedTopic,
        from: { agentId: entry.id },
      });
    });
  }
});

describe('P11-B Agents #14-#20 - agent-specific guardrails', () => {
  it('Agent #14 regulation.new payload includes validator-required fields', async () => {
    const { deps } = makeDeps();
    const agent = new Agent14PublicPolicy(deps);
    const plan = await agent.plan({ input: CASES[0].input });
    expect(plan.proposed.emit[0].payload).toMatchObject({
      jurisdiction: 'EU',
      citation: 'EU-AI-Act',
      summary: 'New compliance event',
      effectiveDate: '2026-08-01',
    });
  });

  it('Agent #16 blocks named individual productivity reporting', async () => {
    const { deps } = makeDeps();
    const agent = new Agent16ProductivityHR(deps);
    const input = { ...CASES.find((c) => c.id === 16).input, namedIndividuals: ['Alex'] };
    const plan = await agent.plan({ input });
    expect(plan.proposed.emit[0].payload.anonymized).toBe(true);
    expect(plan.proposed.emit[0].payload.privacyBlocked).toBe(true);
  });

  it('Agent #17 never proposes direct application', async () => {
    const { deps } = makeDeps();
    const agent = new Agent17ProductEvolution(deps);
    const input = { ...CASES.find((c) => c.id === 17).input, applyNow: true };
    const plan = await agent.plan({ input });
    expect(plan.proposed.emit[0].payload.advisoryOnly).toBe(true);
    expect(plan.proposed.emit[0].payload.blocked).toBe(true);
  });

  it('Agent #18 flags deviations above 15 percent', async () => {
    const { deps } = makeDeps();
    const agent = new Agent18BusinessPlanningPerformance(deps);
    const plan = await agent.plan({ input: CASES.find((c) => c.id === 18).input });
    expect(plan.proposed.emit[0].payload.alertW0).toBe(true);
  });

  it('Agent #19 is signal-only even when applyNow is requested', async () => {
    const { deps } = makeDeps();
    const agent = new Agent19TechnologicalEvolution(deps);
    const input = { ...CASES.find((c) => c.id === 19).input, applyNow: true };
    const plan = await agent.plan({ input });
    expect(plan.proposed.emit[0].payload.signalOnly).toBe(true);
    expect(plan.proposed.emit[0].payload.blocked).toBe(true);
  });

  it('Agent #20 escalates policy threshold risk to Agent #14', async () => {
    const { deps } = makeDeps();
    const agent = new Agent20EnvironmentalImpacts(deps);
    const plan = await agent.plan({ input: CASES.find((c) => c.id === 20).input });
    expect(plan.proposed.emit[0].payload.thresholdApproached).toBe(true);
    expect(plan.proposed.emit[0].payload.escalateToPublicPolicy).toBe(true);
  });
});
