import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { Agent2CodeBuilder, __test } from '../../src/lib/agents/agents/Agent2CodeBuilder.js';
import {
  createMemoryHotStore,
  createMemoryColdStore,
} from '../../src/lib/agents/orchestrator/OrchestratorHub.ts';
import { MessageBus } from '../../src/lib/agents/MessageBus.ts';

const validSpec = () => ({
  name: 'sample-target',
  version: '1-0-0',
  targets: ['main'],
  params: { mode: 'release' },
});

function makeDeps(overrides = {}) {
  let t = 1_700_000_000_000;
  const clock = { now: () => t };
  const hot = createMemoryHotStore({ clock: clock.now });
  const cold = createMemoryColdStore();
  const auditWrites = [];
  const auditLog = { write: vi.fn(async (e) => { auditWrites.push(e); }) };
  const messageBus = new MessageBus({ clock: clock.now });
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    deps: {
      logger, messageBus, auditLog, clock,
      productScope: 'flowai',
      environment: 'prod',
      hot, cold,
      ...overrides,
    },
    hot, cold, messageBus, auditLog, auditWrites, logger,
    advance: (ms) => { t += ms; },
  };
}

function makeAgent(overrides = {}) {
  const ctx = makeDeps(overrides);
  const agent = new Agent2CodeBuilder(ctx.deps);
  return { ...ctx, agent };
}

// Helper: capture all messages on every produces topic.
function captureAll(messageBus) {
  const log = [];
  messageBus.subscribe('2.build.completed.v1', (p, m) => log.push({ topic: m.topic, p }));
  messageBus.subscribe('2.build.failed.v1', (p, m) => log.push({ topic: m.topic, p }));
  return log;
}

// ─── Charter ────────────────────────────────────────────────────────────────
describe('Agent2CodeBuilder — charter', () => {
  it('static charterId === 2', () => {
    expect(Agent2CodeBuilder.charterId).toBe(2);
  });

  it('charter() id=2, name=Code Builder, recommend_only, embedded', () => {
    const c = Agent2CodeBuilder.charter();
    expect(c.id).toBe(2);
    expect(c.name).toBe('Code Builder');
    expect(c.flowAiOnly).toBe(false);
    expect(c.authority).toEqual(['recommend_only']);
  });

  it('consumes/produces match registry', () => {
    const c = Agent2CodeBuilder.charter();
    expect(c.consumes).toEqual(['7.design.spec.v1', '3.renewal.candidate.v1']);
    expect(c.produces).toEqual(['2.build.completed.v1', '2.build.failed.v1']);
  });
});

// ─── Construction ──────────────────────────────────────────────────────────
describe('Agent2CodeBuilder — construction', () => {
  it('throws when hot store is missing', () => {
    const { deps } = makeDeps();
    expect(() => new Agent2CodeBuilder({ ...deps, hot: undefined })).toThrow(/hot store/);
  });

  it('throws when cold store is missing', () => {
    const { deps } = makeDeps();
    expect(() => new Agent2CodeBuilder({ ...deps, cold: undefined })).toThrow(/cold store/);
  });

  it('throws when messageBus is missing', () => {
    const { deps } = makeDeps();
    expect(() => new Agent2CodeBuilder({ ...deps, messageBus: undefined })).toThrow();
  });

  it('rejects non-positive maxSpecSizeBytes', () => {
    const { deps } = makeDeps();
    expect(() => new Agent2CodeBuilder({ ...deps, maxSpecSizeBytes: 0 })).toThrow();
    expect(() => new Agent2CodeBuilder({ ...deps, maxSpecSizeBytes: -1 })).toThrow();
    expect(() => new Agent2CodeBuilder({ ...deps, maxSpecSizeBytes: NaN })).toThrow();
  });

  it('exposes config surface (buildTargets, hashAlgorithm, maxSpecSizeBytes)', () => {
    const { agent } = makeAgent({
      buildTargets: [{ name: 'main', kind: 'bundle' }],
      maxSpecSizeBytes: 5_000_000,
    });
    expect(agent.config.buildTargets).toEqual([{ name: 'main', kind: 'bundle' }]);
    expect(agent.config.hashAlgorithm).toBe('sha256');
    expect(agent.config.maxSpecSizeBytes).toBe(5_000_000);
  });
});

// ─── FAILURE MODE 1: build script returns non-zero exit code ───────────────
describe('failure: build returns non-zero exit code', () => {
  it("emits 2.build.failed.v1 with phase='execute', retryable=true (default)", async () => {
    const { agent, messageBus } = makeAgent({
      executeBuild: async () => ({ ok: false, exitCode: 17, stderr: 'oom' }),
    });
    const log = captureAll(messageBus);
    const ctx = { input: { kind: 'build.request', runId: 'run_1', spec: validSpec(), sourceSpecRef: 'spec_1' }, runId: 'run_1' };
    const r = await agent.run(ctx.input);
    expect(r.ok).toBe(true);
    expect(r.result.outcome).toBe('failed');
    expect(log).toHaveLength(1);
    expect(log[0].topic).toBe('2.build.failed.v1');
    expect(log[0].p).toMatchObject({
      phase: 'execute',
      exitCode: 17,
      stderr: 'oom',
      retryable: true,
      sourceSpecRef: 'spec_1',
      runId: 'run_1',
    });
  });

  it('honors retryable=false when build callback explicitly returns it', async () => {
    const { agent, messageBus } = makeAgent({
      executeBuild: async () => ({ ok: false, exitCode: 2, stderr: 'permanent', retryable: false }),
    });
    const log = captureAll(messageBus);
    await agent.run({ kind: 'build.request', runId: 'r2', spec: validSpec() });
    expect(log[0].p.retryable).toBe(false);
  });
});

// ─── FAILURE MODE 2: source spec missing required field ───────────────────
describe('failure: missing required spec field', () => {
  it("emits 2.build.failed.v1 with phase='precheck' when 'name' is missing", async () => {
    const { agent, messageBus } = makeAgent();
    const log = captureAll(messageBus);
    const spec = validSpec();
    delete spec.name;
    const r = await agent.run({ kind: 'build.request', runId: 'r3', spec, sourceSpecRef: 'spec_3' });
    expect(r.ok).toBe(true);
    expect(r.result.outcome).toBe('failed');
    expect(log).toHaveLength(1);
    expect(log[0].topic).toBe('2.build.failed.v1');
    expect(log[0].p.phase).toBe('precheck');
    expect(log[0].p.stderr).toMatch(/missing required field "name"/);
    expect(log[0].p.retryable).toBe(false);
  });

  it("emits failed with phase='precheck' when 'version' is missing", async () => {
    const { agent, messageBus } = makeAgent();
    const log = captureAll(messageBus);
    const spec = validSpec();
    delete spec.version;
    await agent.run({ kind: 'build.request', runId: 'r3b', spec });
    expect(log[0].p.phase).toBe('precheck');
    expect(log[0].p.stderr).toMatch(/version/);
  });
});

// ─── FAILURE MODE 3: SHA-256 mismatch on re-hash ──────────────────────────
describe('failure: SHA-256 re-hash mismatch (integrity)', () => {
  it("emits 2.build.failed.v1 with phase='integrity' when artifact mutates between hash passes", async () => {
    // Build a mutating artifact: a Proxy whose JSON output flips on each access.
    let pass = 0;
    const mutating = new Proxy(
      {},
      {
        ownKeys() { return ['n']; },
        getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; },
        get() {
          pass++;
          return pass; // 1 then 2 then 3 ... different on each hash pass
        },
      },
    );
    const { agent, messageBus } = makeAgent({
      executeBuild: async () => ({ ok: true, artifact: mutating, artifactRef: 'mutating' }),
    });
    const log = captureAll(messageBus);
    await agent.run({ kind: 'build.request', runId: 'r4', spec: validSpec(), sourceSpecRef: 'spec_4' });
    expect(log).toHaveLength(1);
    expect(log[0].topic).toBe('2.build.failed.v1');
    expect(log[0].p.phase).toBe('integrity');
    expect(log[0].p.stderr).toMatch(/re-hash mismatch/);
    expect(log[0].p.retryable).toBe(true); // integrity drift may be transient
  });
});

// ─── BOUNDARY 1: empty spec object ─────────────────────────────────────────
describe('boundary: empty spec object', () => {
  it('rejects an empty spec before any build phase', async () => {
    const executeBuild = vi.fn(async () => ({ ok: true, artifact: 'x' }));
    const { agent, messageBus } = makeAgent({ executeBuild });
    const log = captureAll(messageBus);
    await agent.run({ kind: 'build.request', runId: 'r5', spec: {} });
    expect(executeBuild).not.toHaveBeenCalled();
    expect(log[0].topic).toBe('2.build.failed.v1');
    expect(log[0].p.phase).toBe('precheck');
    expect(log[0].p.stderr).toMatch(/spec is empty/);
  });

  it('rejects spec=null / array / non-object', async () => {
    const { agent, messageBus } = makeAgent();
    const log = captureAll(messageBus);
    await agent.run({ kind: 'build.request', runId: 'r5b', spec: null });
    await agent.run({ kind: 'build.request', runId: 'r5c', spec: [] });
    expect(log).toHaveLength(2);
    for (const e of log) {
      expect(e.topic).toBe('2.build.failed.v1');
      expect(e.p.phase).toBe('precheck');
    }
  });
});

// ─── BOUNDARY 2: spec exceeding maxSpecSizeBytes ──────────────────────────
describe('boundary: oversize spec (>10 MiB default)', () => {
  it('rejects a spec whose JSON serialization exceeds maxSpecSizeBytes', async () => {
    const big = 'A'.repeat(11 * 1024 * 1024); // 11 MiB string
    const spec = { name: 'big', version: '1', payload: big };
    const { agent, messageBus } = makeAgent();
    const log = captureAll(messageBus);
    await agent.run({ kind: 'build.request', runId: 'r6', spec });
    expect(log).toHaveLength(1);
    expect(log[0].topic).toBe('2.build.failed.v1');
    expect(log[0].p.phase).toBe('precheck');
    expect(log[0].p.stderr).toMatch(/exceeds maxSpecSizeBytes/);
  });

  it('honors a custom maxSpecSizeBytes override (smaller cap)', async () => {
    const spec = { name: 'medium', version: '1', payload: 'Z'.repeat(2_000) };
    const { agent, messageBus } = makeAgent({ maxSpecSizeBytes: 1_000 });
    const log = captureAll(messageBus);
    await agent.run({ kind: 'build.request', runId: 'r6b', spec });
    expect(log[0].p.phase).toBe('precheck');
    expect(log[0].p.stderr).toMatch(/exceeds maxSpecSizeBytes/);
  });
});

// ─── HOSTILE INPUT: shell metacharacters in identifier fields ─────────────
describe('hostile: shell metacharacters in identifier fields', () => {
  it('rejects spec.name containing semicolons / shell injection', async () => {
    const executeBuild = vi.fn(async () => ({ ok: true, artifact: 'x' }));
    const { agent, messageBus } = makeAgent({ executeBuild });
    const log = captureAll(messageBus);
    const hostile = { name: 'foo;rm -rf /', version: '1' };
    await agent.run({ kind: 'build.request', runId: 'r7', spec: hostile });
    expect(executeBuild).not.toHaveBeenCalled();          // never executed
    expect(log[0].topic).toBe('2.build.failed.v1');
    expect(log[0].p.phase).toBe('precheck');
    expect(log[0].p.stderr).toMatch(/identifier field "name"/);
  });

  it('rejects backticks, $(), pipes, ampersands, and newlines in identifiers', async () => {
    const { agent, messageBus } = makeAgent();
    const log = captureAll(messageBus);
    const hostiles = [
      'name`whoami`',
      'name$(id)',
      'name|cat',
      'name&&ls',
      'name\nrm',
      'name with spaces',
      "name'quote",
    ];
    for (let i = 0; i < hostiles.length; i++) {
      await agent.run({
        kind: 'build.request',
        runId: `r7-${i}`,
        spec: { name: hostiles[i], version: '1' },
      });
    }
    expect(log).toHaveLength(hostiles.length);
    for (const e of log) {
      expect(e.topic).toBe('2.build.failed.v1');
      expect(e.p.phase).toBe('precheck');
    }
  });
});

// ─── Authority guard ──────────────────────────────────────────────────────
describe('authority: recommend_only is enforced', () => {
  it('plan.sideEffects is always [] regardless of input', async () => {
    const { agent } = makeAgent({
      executeBuild: async () => ({ ok: true, artifact: 'ok' }),
    });
    for (const input of [
      { kind: 'build.request', runId: 'a1', spec: validSpec() },
      { kind: 'build.request', runId: 'a2', spec: {} },                // precheck fails
      { kind: 'build.request', runId: 'a3', spec: validSpec() },       // happy
    ]) {
      const plan = await agent.plan({ input, runId: input.runId });
      expect(plan.sideEffects).toEqual([]);
      expect(plan.authorityNeeded).toEqual(['recommend_only']);
    }
  });

  it('act() refuses a tampered plan with non-empty sideEffects', async () => {
    const { agent } = makeAgent();
    const ctx = { input: { kind: 'build.request', runId: 'a4', spec: validSpec() }, runId: 'a4' };
    const plan = await agent.plan(ctx);
    const tampered = { ...plan, sideEffects: ['mutate-something'] };
    await expect(agent.act(ctx, tampered)).rejects.toThrow(/recommend_only forbids sideEffects/);
  });

  it('BaseAgent.guard rejects an elevated authorityNeeded via plan override', async () => {
    class Elevated extends Agent2CodeBuilder {
      async plan(ctx) {
        const base = await super.plan(ctx);
        return { ...base, authorityNeeded: ['auto_write_internal'] };
      }
    }
    const { deps } = makeDeps();
    const a = new Elevated(deps);
    const r = await a.run({ kind: 'build.request', runId: 'a5', spec: validSpec() });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/authority/i);
  });
});

// ─── MessageBus topic compliance ───────────────────────────────────────────
describe('messagebus: topic compliance', () => {
  it('only ever publishes to charter.produces topics', async () => {
    const { agent, messageBus } = makeAgent({
      executeBuild: async () => ({ ok: true, artifact: 'ok', artifactRef: 'art_1' }),
    });
    const seen = [];
    // Subscribe to wildcard-ish enumerated set: every topic we publish must
    // be in charter.produces. We listen on both produces topics PLUS one
    // off-charter topic to assert we never publish there.
    messageBus.subscribe('2.build.completed.v1', (_p, m) => seen.push(m.topic));
    messageBus.subscribe('2.build.failed.v1', (_p, m) => seen.push(m.topic));
    messageBus.subscribe('99.illegal.v1', (_p, m) => seen.push(m.topic));

    await agent.run({ kind: 'build.request', runId: 'm1', spec: validSpec() });
    await agent.run({ kind: 'build.request', runId: 'm2', spec: { /* empty */ } });
    await agent.run({
      kind: 'build.request',
      runId: 'm3',
      spec: { name: 'has;injection', version: '1' },
    });

    const allowed = new Set(['2.build.completed.v1', '2.build.failed.v1']);
    expect(seen.length).toBeGreaterThan(0);
    for (const t of seen) expect(allowed.has(t)).toBe(true);
  });

  it("happy-path emits 2.build.completed.v1 with { artifactRef, hash, sourceSpecRef, runId }", async () => {
    const { agent, messageBus } = makeAgent({
      executeBuild: async () => ({ ok: true, artifact: 'fixed-bytes', artifactRef: 'art_xyz' }),
    });
    const log = captureAll(messageBus);
    await agent.run({ kind: 'build.request', runId: 'm4', spec: validSpec(), sourceSpecRef: 'spec_m4' });
    expect(log).toHaveLength(1);
    expect(log[0].topic).toBe('2.build.completed.v1');
    const expectedHash = createHash('sha256').update('fixed-bytes', 'utf8').digest('hex');
    expect(log[0].p).toEqual({
      runId: 'm4',
      artifactRef: 'art_xyz',
      hash: expectedHash,
      sourceSpecRef: 'spec_m4',
      at: expect.any(Number),
    });
  });

  it('attachBusSubscriptions wires both charter.consumes topics; idempotent', () => {
    const { agent, messageBus } = makeAgent();
    const n1 = agent.attachBusSubscriptions();
    expect(n1).toBe(2); // 7.design.spec.v1 + 3.renewal.candidate.v1
    expect(messageBus.hasTopic('7.design.spec.v1')).toBe(true);
    expect(messageBus.hasTopic('3.renewal.candidate.v1')).toBe(true);
    const n2 = agent.attachBusSubscriptions();
    expect(n2).toBe(0);
  });

  it('subscribed topics record route.decision lineage on every publish', async () => {
    const { agent, cold, messageBus } = makeAgent();
    agent.attachBusSubscriptions();
    messageBus.publish('7.design.spec.v1', { runId: 'm5' });
    messageBus.publish('3.renewal.candidate.v1', { runId: 'm5' });
    await Promise.resolve(); await Promise.resolve();
    const subRows = cold.entries.filter(
      (e) => e.agentId === 2 && e.phase === 'route.decision',
    );
    expect(subRows.length).toBeGreaterThanOrEqual(2);
    expect(subRows.some((r) => r.meta.observedTopic === '7.design.spec.v1')).toBe(true);
    expect(subRows.some((r) => r.meta.observedTopic === '3.renewal.candidate.v1')).toBe(true);
  });
});

// ─── State persistence ────────────────────────────────────────────────────
describe('state: HotStore + ColdStore writes', () => {
  it('persists run state to HotStore on success', async () => {
    const { agent, hot } = makeAgent({
      executeBuild: async () => ({ ok: true, artifact: 'art', artifactRef: 'aref' }),
    });
    await agent.run({ kind: 'build.request', runId: 's1', spec: validSpec() });
    const state = await hot.get('build:run:s1');
    expect(state).toMatchObject({
      runId: 's1',
      outcome: 'completed',
      hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('persists run state to HotStore on failure too', async () => {
    const { agent, hot } = makeAgent();
    await agent.run({ kind: 'build.request', runId: 's2', spec: {} }); // precheck fail
    const state = await hot.get('build:run:s2');
    expect(state).toMatchObject({ runId: 's2', outcome: 'failed', hash: null });
  });

  it('writes a lineage row to ColdStore with agentId=2 and authority=recommend_only', async () => {
    const { agent, cold } = makeAgent({
      executeBuild: async () => ({ ok: true, artifact: 'x' }),
    });
    await agent.run({ kind: 'build.request', runId: 's3', spec: validSpec(), sourceSpecRef: 'spec_s3' });
    const rows = cold.entries.filter((e) => e.agentId === 2 && e.runId === 's3');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      agentId: 2,
      authority: 'recommend_only',
      stepKey: 'build',
      phase: 'step.success',
    });
    expect(rows[0].meta.outcome).toBe('completed');
  });
});

// ─── Hash determinism (internals) ─────────────────────────────────────────
describe('internals: sha256OfArtifact', () => {
  it('produces the same digest for object literals with different key order', () => {
    const a = __test.sha256OfArtifact({ b: 1, a: 2 });
    const b = __test.sha256OfArtifact({ a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it('produces 64-char lowercase hex', () => {
    const h = __test.sha256OfArtifact('abc');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    // Reference value: known SHA-256 of "abc".
    expect(h).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('rejects null / undefined / functions', () => {
    expect(() => __test.sha256OfArtifact(null)).toThrow();
    expect(() => __test.sha256OfArtifact(undefined)).toThrow();
    expect(() => __test.sha256OfArtifact(() => 0)).toThrow();
  });

  it('canonicalJson rejects cyclic references', () => {
    const a = {};
    a.self = a;
    expect(() => __test.canonicalJson(a)).toThrow(/cyclic/);
  });
});

// ─── Plugins ──────────────────────────────────────────────────────────────
describe('plugins: beforeBuild + afterBuild', () => {
  it('beforeBuild rejection halts before execute', async () => {
    const executeBuild = vi.fn(async () => ({ ok: true, artifact: 'x' }));
    const beforeBuild = vi.fn(async () => ({ ok: false, reason: 'plugin-rejected', phase: 'precheck' }));
    const { agent, messageBus } = makeAgent({ beforeBuild, executeBuild });
    const log = captureAll(messageBus);
    await agent.run({ kind: 'build.request', runId: 'p1', spec: validSpec() });
    expect(beforeBuild).toHaveBeenCalledOnce();
    expect(executeBuild).not.toHaveBeenCalled();
    expect(log[0].topic).toBe('2.build.failed.v1');
    expect(log[0].p.stderr).toMatch(/plugin-rejected/);
  });

  it('afterBuild is invoked with (artifact, hash) on success', async () => {
    const afterBuild = vi.fn();
    const { agent } = makeAgent({
      executeBuild: async () => ({ ok: true, artifact: 'good' }),
      afterBuild,
    });
    await agent.run({ kind: 'build.request', runId: 'p2', spec: validSpec() });
    expect(afterBuild).toHaveBeenCalledOnce();
    const [art, hash] = afterBuild.mock.calls[0];
    expect(art).toBe('good');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('afterBuild errors do not unwind the success — completed event still fires', async () => {
    const afterBuild = vi.fn(async () => { throw new Error('boom'); });
    const { agent, cold, messageBus } = makeAgent({
      executeBuild: async () => ({ ok: true, artifact: 'good', artifactRef: 'aref' }),
      afterBuild,
    });
    const log = captureAll(messageBus);
    await agent.run({ kind: 'build.request', runId: 'p3', spec: validSpec() });
    expect(log[0].topic).toBe('2.build.completed.v1');
    const lineage = cold.entries.find((e) => e.runId === 'p3' && e.agentId === 2);
    expect(lineage.meta.afterBuildError).toMatch(/boom/);
  });
});
