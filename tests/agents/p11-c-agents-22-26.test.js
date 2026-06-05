import { describe, it, expect, vi } from 'vitest';

import { getAgent } from '../../src/lib/agents/_registry.ts';
import { TOPICS } from '../../src/lib/agents/MessageSchema.js';
import { MessageBus } from '../../src/lib/agents/MessageBus.ts';
import { Agent22OpsRunnerBeta } from '../../src/lib/agents/agents/Agent22OpsRunnerBeta.js';
import { Agent23OpsRunnerGamma } from '../../src/lib/agents/agents/Agent23OpsRunnerGamma.js';
import { Agent24OpsRunnerDelta } from '../../src/lib/agents/agents/Agent24OpsRunnerDelta.js';
import { Agent25OpsRunnerEpsilon } from '../../src/lib/agents/agents/Agent25OpsRunnerEpsilon.js';
import { Agent26OrchestraResearch } from '../../src/lib/agents/agents/Agent26OrchestraResearch.js';

const RESERVED = Object.freeze([
  { id: 22, Class: Agent22OpsRunnerBeta, name: 'Ops Runner Beta' },
  { id: 23, Class: Agent23OpsRunnerGamma, name: 'Ops Runner Gamma' },
  { id: 24, Class: Agent24OpsRunnerDelta, name: 'Ops Runner Delta' },
  { id: 25, Class: Agent25OpsRunnerEpsilon, name: 'Ops Runner Epsilon' },
]);

function makeDeps(overrides = {}) {
  let t = 1_900_000_000_000;
  const clock = { now: () => t };
  const messageBus = new MessageBus({ clock: clock.now });
  const auditWrites = [];
  const auditLog = { write: vi.fn(async (e) => { auditWrites.push(e); }) };
  return {
    deps: {
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      messageBus,
      auditLog,
      clock,
      productScope: 'flowai',
      environment: 'prod',
      ...overrides,
    },
    messageBus,
    auditWrites,
    advance: (ms) => { t += ms; },
  };
}

function capture(messageBus, topics) {
  const seen = [];
  for (const topic of topics) {
    messageBus.subscribe(topic, (payload, meta) => seen.push({ topic: meta.topic, payload }));
  }
  return seen;
}

describe('P11-C Agents #22-#25 reserved Ops Runners', () => {
  for (const entry of RESERVED) {
    it(`Agent #${entry.id} imports and matches the reserved registry charter`, () => {
      expect(entry.Class.charterId).toBe(entry.id);
      const charter = entry.Class.charter();
      const registry = getAgent(entry.id);
      expect(charter).toMatchObject({
        id: entry.id,
        name: entry.name,
        flowAiOnly: false,
        authority: registry.authority,
        consumes: [],
        produces: [],
      });
      expect(registry.mode).toBe('step-owner');
      expect(registry.escalationPolicy).toMatch(/Reserved Step-Owner charter/);
    });

    it(`Agent #${entry.id} returns a dormant no-op plan with no bus output`, async () => {
      const { deps } = makeDeps();
      const agent = new entry.Class(deps);
      const plan = await agent.plan({ input: { kind: 'reserved.ops.runner.request', runId: `run-${entry.id}` } });
      const result = await agent.act({ input: {}, runId: `run-${entry.id}` }, plan);

      expect(plan).toMatchObject({
        authorityNeeded: ['recommend_only'],
        sideEffects: [],
        outcome: 'reserved_dormant',
        proposed: { emit: [] },
      });
      expect(result).toMatchObject({
        outcome: 'reserved_dormant',
        sideEffects: [],
        published: [],
        publishEnvelopes: [],
      });
    });

    it(`Agent #${entry.id} blocks side-effect attempts and escalates to Agent #1`, async () => {
      const { deps } = makeDeps();
      const agent = new entry.Class(deps);
      const plan = await agent.plan({
        input: {
          kind: 'reserved.ops.runner.request',
          runId: `run-${entry.id}`,
          sideEffects: [{ kind: 'write' }],
        },
      });
      expect(plan).toMatchObject({
        outcome: 'reserved_blocked',
        sideEffects: [],
        blocked: true,
        escalationTarget: 1,
      });
      const rec = await agent.recommend({ runId: `run-${entry.id}`, applyNow: true });
      expect(rec.metadata).toMatchObject({
        ok: false,
        reserved: true,
        sideEffects: [],
        emit: [],
        escalationTarget: 1,
      });
    });
  }
});

describe('P11-C Agent #26 Orchestra Research', () => {
  it('imports and matches the registry charter including dual+gate authority', () => {
    expect(Agent26OrchestraResearch.charterId).toBe(26);
    const charter = Agent26OrchestraResearch.charter();
    const registry = getAgent(26);
    expect(charter).toMatchObject({
      id: 26,
      name: 'Orchestra Research Agent',
      flowAiOnly: false,
      authority: registry.authority,
      requiredCredentials: ['ANTHROPIC_API_KEY', 'BROWSERLESS_API_KEY'],
      consumes: registry.consumes,
      produces: registry.produces,
    });
    expect(charter.authority).toEqual(['recommend_only', 'auto_write_internal', 'requires_human_gate']);
  });

  it('all Agent #26 consumed and produced topics exist in MessageSchema', () => {
    const charter = Agent26OrchestraResearch.charter();
    for (const topic of [...charter.consumes, ...charter.produces]) {
      expect(TOPICS[topic], topic).toBeTruthy();
    }
  });

  it('emits a candidate observation without side effects', async () => {
    const { deps, messageBus } = makeDeps();
    const agent = new Agent26OrchestraResearch(deps);
    const seen = capture(messageBus, agent.charter.produces);
    const plan = await agent.plan({
      input: {
        kind: 'orchestra.research.request',
        runId: 'run-26',
        action: 'candidate',
        candidate: {
          candidate_id: 'tool-alpha',
          candidate_name: 'Tool Alpha',
          source: 'unit_fixture',
          evidence_url: 'https://example.com/evidence',
          performance_score_estimate: 80,
          price_tier_estimate: 20,
          capabilities: ['crawl', 'score'],
          invocations: 5,
        },
      },
    });
    const result = await agent.act({ input: {}, runId: 'run-26' }, plan);

    expect(plan.authorityNeeded).toEqual(['recommend_only']);
    expect(plan.sideEffects).toEqual([]);
    expect(plan.proposed.emit[0].topic).toBe('26.orchestra.candidate.v1');
    expect(plan.proposed.emit[0].payload).toMatchObject({
      candidate_id: 'tool-alpha',
      candidate_name: 'Tool Alpha',
      evidence_url: 'https://example.com/evidence',
      advisoryOnly: true,
    });
    expect(result.sideEffects).toEqual([]);
    expect(result.published).toEqual(['26.orchestra.candidate.v1']);
    expect(seen).toHaveLength(1);
  });

  it('routes security/legal/regulatory candidates to Panel gate instead of auto-admission', async () => {
    const { deps } = makeDeps();
    const agent = new Agent26OrchestraResearch(deps);
    const plan = await agent.plan({
      input: {
        kind: 'orchestra.research.request',
        runId: 'run-26-panel',
        action: 'admitted',
        candidate: {
          candidate_id: 'tool-risk',
          candidate_name: 'Risk Tool',
          evidence_url: 'https://example.com/evidence',
          performance_score: 95,
          price_tier: 10,
          invocationCount: 10,
          capabilities: ['crawl', 'deploy', 'monitor', 'score'],
          risk: 'security',
        },
      },
    });
    expect(plan.outcome).toBe('panel_gate');
    expect(plan.proposed.emit[0].topic).toBe('26.orchestra.candidate_panel_gate.v1');
    expect(plan.proposed.emit[0].payload).toMatchObject({
      reason: 'security_legal_or_regulatory_carveout',
      advisoryOnly: true,
    });
  });

  it('admits only when the four-condition gate clears, still as an advisory envelope', async () => {
    const { deps } = makeDeps();
    const agent = new Agent26OrchestraResearch(deps);
    const plan = await agent.plan({
      input: {
        kind: 'orchestra.research.request',
        runId: 'run-26-admit',
        action: 'admitted',
        candidate: {
          candidate_id: 'tool-ready',
          candidate_name: 'Ready Tool',
          evidence_url: 'https://example.com/evidence',
          performance_score: 94,
          price_tier: 5,
          invocationCount: 12,
          capabilities: ['crawl', 'design', 'score', 'monitor'],
          risk: 'normal',
        },
      },
    });
    expect(plan.outcome).toBe('admitted');
    expect(plan.proposed.emit[0].topic).toBe('26.orchestra.admitted.v1');
    expect(plan.proposed.emit[0].payload.advisoryOnly).toBe(true);
    expect(plan.gate.thresholdMet).toBe(true);
  });

  it('rejects requested admission when evidence or invocation floor is missing', async () => {
    const { deps } = makeDeps();
    const agent = new Agent26OrchestraResearch(deps);
    const plan = await agent.plan({
      input: {
        kind: 'orchestra.research.request',
        runId: 'run-26-reject',
        action: 'admitted',
        candidate: {
          candidate_id: 'tool-thin',
          candidate_name: 'Thin Tool',
          performance_score: 90,
          price_tier: 5,
          invocationCount: 1,
          capabilities: ['crawl'],
        },
      },
    });
    expect(plan.outcome).toBe('rejected');
    expect(plan.proposed.emit[0].topic).toBe('26.orchestra.candidate_rejected.v1');
    expect(plan.gate.thresholdMet).toBe(false);
    expect(plan.proposed.emit[0].payload.advisoryOnly).toBe(true);
  });
});
