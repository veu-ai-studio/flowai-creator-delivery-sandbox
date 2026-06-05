import { describe, it, expect, vi } from 'vitest';

import { getAgent, AGENT_REGISTRY } from '../../src/lib/agents/_registry.ts';
import { TOPICS } from '../../src/lib/agents/MessageSchema.js';
import { MessageBus } from '../../src/lib/agents/MessageBus.ts';
import {
  OrchestratorHub,
  createMemoryHotStore,
  createMemoryColdStore,
} from '../../src/lib/agents/orchestrator/OrchestratorHub.ts';

import { Agent6Research } from '../../src/lib/agents/agents/Agent6Research.js';
import { Agent7Design } from '../../src/lib/agents/agents/Agent7Design.js';
import { Agent8QualityAudit } from '../../src/lib/agents/agents/Agent8QualityAudit.js';
import { Agent9GoToMarket } from '../../src/lib/agents/agents/Agent9GoToMarket.js';
import { Agent10Monitor } from '../../src/lib/agents/agents/Agent10Monitor.js';

const AGENTS = Object.freeze([
  {
    id: 6,
    stepKey: 'research',
    Class: Agent6Research,
    input: { kind: 'research.request', runId: 'run-6', productId: 'tenant-a', url: 'https://example.com', sources: ['crawl'] },
    badInput: { kind: 'research.request', runId: 'run-6-bad' },
  },
  {
    id: 7,
    stepKey: 'design',
    Class: Agent7Design,
    input: { kind: 'design.request', runId: 'run-7', productId: 'tenant-a', researchBrief: 'brief', targetClass: 'web', requirements: ['responsive'] },
    badInput: { kind: 'design.request', runId: 'run-7-bad', targetClass: 'web' },
  },
  {
    id: 8,
    stepKey: 'qa_audit',
    Class: Agent8QualityAudit,
    input: { kind: 'audit.request', runId: 'run-8', productId: 'flowai', artifactRef: 'artifact-1', evidenceTier: 'B', score: 91 },
    badInput: { kind: 'audit.request', runId: 'run-8-bad', criticalFindings: ['missing evidence'] },
  },
  {
    id: 9,
    stepKey: 'gtm',
    Class: Agent9GoToMarket,
    input: { kind: 'gtm.request', runId: 'run-9', productId: 'tenant-a', auditPassed: true, channel: 'demo', asset: { headline: 'Draft' } },
    badInput: { kind: 'gtm.request', runId: 'run-9-bad', channel: 'demo', unverifiedClaims: ['verified in production'] },
  },
  {
    id: 10,
    stepKey: 'monitor',
    Class: Agent10Monitor,
    input: { kind: 'monitor.request', runId: 'run-10', productId: 'tenant-a', surface: '/health', metric: 'latency', value: 120, unit: 'ms' },
    badInput: { kind: 'monitor.request', runId: 'run-10-bad', driftSignals: ['route removed'] },
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
    auditLog,
    auditWrites,
    logger,
    advance: (ms) => { t += ms; },
  };
}

function captureTopics(messageBus, topics) {
  const seen = [];
  for (const topic of topics) {
    messageBus.subscribe(topic, (payload, meta) => seen.push({ topic: meta.topic, payload }));
  }
  return seen;
}

describe('P11-A step-owner agents - imports and registry conformance', () => {
  it('imports all five concrete classes', () => {
    for (const entry of AGENTS) {
      expect(typeof entry.Class).toBe('function');
      expect(entry.Class.charterId).toBe(entry.id);
    }
  });

  it('keeps the canonical roster at 26 ids', () => {
    expect(AGENT_REGISTRY).toHaveLength(26);
    expect(new Set(AGENT_REGISTRY.map((a) => a.id)).size).toBe(26);
    for (let id = 1; id <= 26; id++) expect(getAgent(id)?.id).toBe(id);
  });

  it('all #6-#10 consumes/produces topics exist in MessageSchema', () => {
    for (const entry of AGENTS) {
      const charter = entry.Class.charter();
      const registry = getAgent(entry.id);
      expect(charter.consumes).toEqual(registry.consumes);
      expect(charter.produces).toEqual(registry.produces);
      for (const topic of [...charter.consumes, ...charter.produces]) {
        expect(TOPICS[topic], `topic ${topic}`).toBeTruthy();
      }
    }
  });

  it('derives recommend_only authority from registry charters', () => {
    for (const entry of AGENTS) {
      expect(entry.Class.charter().authority).toEqual(getAgent(entry.id).authority);
      expect(entry.Class.charter().authority).toEqual(['recommend_only']);
    }
  });
});

describe('P11-A step-owner agents - product-scope partition', () => {
  it('Agent #8 is FlowAI-only and rejects non-flowai scope', () => {
    const { deps } = makeDeps({ productScope: 'tenant-a' });
    expect(() => new Agent8QualityAudit(deps)).toThrow(/FlowAI-only/);
  });

  it('embedded agents #6, #7, #9, and #10 accept valid non-flowai scopes', () => {
    for (const entry of AGENTS.filter((a) => a.id !== 8)) {
      const { deps } = makeDeps({ productScope: 'tenant-a', environment: 'demo' });
      expect(() => new entry.Class(deps)).not.toThrow();
    }
  });
});

describe('P11-A step-owner agents - plan and act contracts', () => {
  for (const entry of AGENTS) {
    it(`Agent #${entry.id} returns a step-specific recommend-only plan`, async () => {
      const { deps } = makeDeps();
      const agent = new entry.Class(deps);
      const plan = await agent.plan({ input: entry.input, runId: entry.input.runId });

      expect(plan.authorityNeeded).toEqual(['recommend_only']);
      expect(plan.sideEffects).toEqual([]);
      expect(plan.signals).toHaveLength(3);
      expect(plan.confidence).toBeGreaterThan(0);
      expect(plan.proposed.emit).toHaveLength(1);
      expect(agent.charter.produces).toContain(plan.proposed.emit[0].topic);
      expect(new Set(plan.signals.map((s) => s.rule)).size).toBe(3);
    });

    it(`Agent #${entry.id} blocks or warns on malformed step input without external calls`, async () => {
      const { deps } = makeDeps();
      const agent = new entry.Class(deps);
      const plan = await agent.plan({ input: entry.badInput, runId: entry.badInput.runId });

      expect(plan.sideEffects).toEqual([]);
      expect(plan.confidence).toBeLessThan(0.95);
      expect(plan.signals.some((s) => s.status !== 'pass')).toBe(true);
    });

    it(`Agent #${entry.id} publishes only canonical produced topics when a bus is injected`, async () => {
      const { deps, messageBus } = makeDeps();
      const agent = new entry.Class(deps);
      const seen = captureTopics(messageBus, agent.charter.produces);
      const plan = await agent.plan({ input: entry.input, runId: entry.input.runId });
      const result = await agent.act({ input: entry.input, runId: entry.input.runId }, plan);

      expect(result.sideEffects).toEqual([]);
      expect(result.published).toEqual([plan.proposed.emit[0].topic]);
      expect(seen).toHaveLength(1);
      expect(agent.charter.produces).toContain(seen[0].topic);
    });

    it(`Agent #${entry.id} returns a publish envelope when the bus has no publish function`, async () => {
      const { deps } = makeDeps({ messageBus: {} });
      const agent = new entry.Class(deps);
      const plan = await agent.plan({ input: entry.input, runId: entry.input.runId });
      const result = await agent.act({ input: entry.input, runId: entry.input.runId }, plan);

      expect(result.published).toEqual([]);
      expect(result.publishEnvelopes).toHaveLength(1);
      expect(result.publishEnvelopes[0]).toMatchObject({
        topic: plan.proposed.emit[0].topic,
        from: { agentId: entry.id },
      });
    });
  }

  it('Agent #9 always emits draft-only GTM assets', async () => {
    const { deps } = makeDeps();
    const agent = new Agent9GoToMarket(deps);
    const plan = await agent.plan({ input: AGENTS.find((a) => a.id === 9).input });
    expect(plan.proposed.emit[0].payload.draft).toBe(true);
    expect(plan.proposed.emit[0].payload.readyForPublish).toBe(false);
  });

  it('Agent #10 metric payload satisfies MessageSchema validator fields', async () => {
    const { deps } = makeDeps();
    const agent = new Agent10Monitor(deps);
    const plan = await agent.plan({ input: AGENTS.find((a) => a.id === 10).input });
    expect(plan.proposed.emit[0]).toMatchObject({
      topic: '10.metric.v1',
      payload: { surface: '/health', metric: 'latency', value: 120, unit: 'ms' },
    });
  });
});

describe('P11-A step-owner agents - OrchestratorHub.invokeStepOwner', () => {
  it('invokes research, design, qa_audit, gtm, and monitor step owners', async () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: createMemoryHotStore({ clock: deps.clock.now }),
      cold: createMemoryColdStore(),
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });

    for (const entry of AGENTS) {
      hub.registerStepOwnerAgent(entry.stepKey, new entry.Class(deps));
      const rec = await hub.invokeStepOwner(entry.stepKey, {
        runId: entry.input.runId,
        productId: entry.input.productId,
        stepInputs: entry.input,
      });
      expect(rec.agent_id).toBe(entry.id);
      expect(typeof rec.recommendation).toBe('string');
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.confidence).toBeLessThanOrEqual(1);
      expect(rec.metadata.stepKey).toBe(entry.stepKey);
      expect(rec.metadata.emit.every((topic) => getAgent(entry.id).produces.includes(topic))).toBe(true);
    }
  });

  it('returns a low-confidence envelope for malformed step-owner output instead of throwing', async () => {
    const { deps } = makeDeps();
    const hub = new OrchestratorHub({
      hot: createMemoryHotStore({ clock: deps.clock.now }),
      cold: createMemoryColdStore(),
      clock: () => deps.clock.now(),
      sleep: async () => {},
    });
    hub.registerStepOwnerAgent('research', new Agent6Research(deps));
    const rec = await hub.invokeStepOwner('research', { runId: 'run-empty', stepInputs: {} });
    expect(rec.agent_id).toBe(6);
    expect(rec.confidence).toBeLessThan(0.95);
    expect(rec.metadata.ok).toBe(false);
  });
});
