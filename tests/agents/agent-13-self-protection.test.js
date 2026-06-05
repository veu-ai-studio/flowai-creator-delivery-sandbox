import { describe, it, expect, vi } from 'vitest';

import { getAgent } from '../../src/lib/agents/_registry.ts';
import { TOPICS } from '../../src/lib/agents/MessageSchema.js';
import { MessageBus } from '../../src/lib/agents/MessageBus.ts';
import { Agent13SelfProtection } from '../../src/lib/agents/agents/Agent13SelfProtection.js';

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
  kind: 'self.protection.request',
  runId: 'run-13',
  surface: 'marketing-site',
  evidence: ['baseline scan'],
});

function capture(messageBus, topics) {
  const seen = [];
  for (const topic of topics) {
    messageBus.subscribe(topic, (payload, meta) => seen.push({ topic: meta.topic, payload }));
  }
  return seen;
}

describe('Agent #13 Self-Protection - charter and partition', () => {
  it('is importable and sources its charter from the registry', () => {
    expect(Agent13SelfProtection.charterId).toBe(13);
    const charter = Agent13SelfProtection.charter();
    const registry = getAgent(13);
    expect(charter).toMatchObject({
      id: 13,
      name: 'Self-Protection',
      flowAiOnly: false,
      authority: registry.authority,
      consumes: registry.consumes,
      produces: registry.produces,
    });
  });

  it('all consumed and produced topics exist in MessageSchema', () => {
    const charter = Agent13SelfProtection.charter();
    for (const topic of [...charter.consumes, ...charter.produces]) {
      expect(TOPICS[topic], topic).toBeTruthy();
    }
  });

  it('accepts valid tenant productScope because Agent #13 is embedded', () => {
    const { deps } = makeDeps({ productScope: 'tenant-a', environment: 'demo' });
    expect(() => new Agent13SelfProtection(deps)).not.toThrow();
  });
});

describe('Agent #13 Self-Protection - IP protection routing', () => {
  it('emits threat detection with MessageSchema-required fields by default', async () => {
    const { deps } = makeDeps();
    const agent = new Agent13SelfProtection(deps);
    const input = {
      ...baseInput(),
      suspectedCloneUrl: 'https://clone.example',
    };
    const plan = await agent.plan({ input, runId: input.runId });
    expect(plan.authorityNeeded).toEqual(['recommend_only']);
    expect(plan.sideEffects).toEqual([]);
    expect(plan.signals).toHaveLength(3);
    expect(plan.proposed.emit[0]).toMatchObject({
      topic: '13.threat.detected.v1',
      payload: {
        signatureId: 'clone-signal',
        surface: 'marketing-site',
      },
    });
    expect(plan.proposed.emit[0].payload.evidence).toContain('baseline scan');
  });

  it('routes signature update requests to 13.signature.update.v1', async () => {
    const { deps } = makeDeps();
    const agent = new Agent13SelfProtection(deps);
    const input = {
      ...baseInput(),
      action: 'signature_update',
      signatureId: 'scraper-burst',
      pattern: 'rate>100/min',
      severity: 'high',
    };
    const plan = await agent.plan({ input, runId: input.runId });
    expect(plan.proposed.emit[0]).toMatchObject({
      topic: '13.signature.update.v1',
      payload: {
        signatureId: 'scraper-burst',
        pattern: 'rate>100/min',
        severity: 'high',
      },
    });
  });

  it('routes DMCA-ready evidence to a draft DMCA envelope', async () => {
    const { deps } = makeDeps();
    const agent = new Agent13SelfProtection(deps);
    const input = {
      ...baseInput(),
      dmcaReady: true,
      suspectedCloneUrl: 'https://clone.example',
      infringementEvidence: ['copied page', 'copied watermark'],
    };
    const plan = await agent.plan({ input, runId: input.runId });
    expect(plan.proposed.emit[0]).toMatchObject({
      topic: '13.dmca.filed.v1',
      payload: {
        draft: true,
        targetUrl: 'https://clone.example',
      },
    });
    expect(plan.proposed.emit[0].payload.evidence).toEqual(['copied page', 'copied watermark']);
  });
});

describe('Agent #13 Self-Protection - publish and recommendation contract', () => {
  it('publishes only charter-produced topics through an injected MessageBus', async () => {
    const { deps, messageBus } = makeDeps();
    const agent = new Agent13SelfProtection(deps);
    const seen = capture(messageBus, agent.charter.produces);
    const input = {
      ...baseInput(),
      signatureId: 'scraper-burst',
      pattern: 'rate>100/min',
    };
    const plan = await agent.plan({ input, runId: input.runId });
    const result = await agent.act({ input, runId: input.runId }, plan);
    expect(result.sideEffects).toEqual([]);
    expect(result.published).toEqual(['13.signature.update.v1']);
    expect(seen).toHaveLength(1);
    expect(agent.charter.produces).toContain(seen[0].topic);
  });

  it('returns a publish envelope when no publish-capable bus is injected', async () => {
    const { deps } = makeDeps({ messageBus: {} });
    const agent = new Agent13SelfProtection(deps);
    const input = baseInput();
    const plan = await agent.plan({ input, runId: input.runId });
    const result = await agent.act({ input, runId: input.runId }, plan);
    expect(result.published).toEqual([]);
    expect(result.publishEnvelopes[0]).toMatchObject({
      topic: '13.threat.detected.v1',
      from: { agentId: 13, productScope: 'flowai' },
    });
  });

  it('recommend(ctx) returns a valid advisory envelope', async () => {
    const { deps } = makeDeps();
    const agent = new Agent13SelfProtection(deps);
    const rec = await agent.recommend({
      runId: 'run-rec-13',
      platformSignals: [],
    });
    expect(rec.agent_id).toBe(13);
    expect(rec.recommendation).toMatch(/Self-Protection/);
    expect(rec.confidence).toBeGreaterThan(0);
    expect(rec.metadata.ok).toBe(true);
    expect(rec.metadata.emit).toEqual(['13.threat.detected.v1']);
  });

  it('run() stays recommend-only and records BaseAgent audit phases', async () => {
    const { deps, auditWrites } = makeDeps();
    const agent = new Agent13SelfProtection(deps);
    const result = await agent.run(baseInput());
    expect(result.ok).toBe(true);
    expect(result.result.sideEffects).toEqual([]);
    expect(auditWrites.map((e) => e.phase)).toContain('guard.ok');
    expect(auditWrites.map((e) => e.phase)).toContain('act.ok');
  });
});
