import { describe, it, expect, vi } from 'vitest';
import {
  OrchestratorHub,
  createMemoryHotStore,
  createMemoryColdStore,
} from '../src/lib/agents/orchestrator/OrchestratorHub.ts';

function makeHub(opts = {}) {
  const hot = createMemoryHotStore({ clock: opts.clock });
  const cold = createMemoryColdStore();
  const sleepCalls = [];
  const sleep = vi.fn(async (ms) => {
    sleepCalls.push(ms);
  });
  const hub = new OrchestratorHub({
    hot,
    cold,
    clock: opts.clock,
    sleep,
    maxAttempts: opts.maxAttempts ?? 3,
    baseBackoffMs: opts.baseBackoffMs ?? 100,
    hotTtlSec: opts.hotTtlSec ?? 3600,
  });
  return { hub, hot, cold, sleep, sleepCalls };
}

describe('OrchestratorHub — construction', () => {
  it('throws when hot or cold are missing', () => {
    expect(() => new OrchestratorHub({})).toThrow();
    expect(() => new OrchestratorHub({ hot: createMemoryHotStore() })).toThrow();
  });

  it('rejects maxAttempts < 1', () => {
    expect(
      () =>
        new OrchestratorHub({
          hot: createMemoryHotStore(),
          cold: createMemoryColdStore(),
          maxAttempts: 0,
        }),
    ).toThrow();
  });

  it('rejects negative baseBackoffMs', () => {
    expect(
      () =>
        new OrchestratorHub({
          hot: createMemoryHotStore(),
          cold: createMemoryColdStore(),
          baseBackoffMs: -1,
        }),
    ).toThrow();
  });
});

describe('OrchestratorHub — idempotencyKey + computeBackoff', () => {
  it('idempotencyKey is stable for same inputs', () => {
    const { hub } = makeHub();
    expect(hub.idempotencyKey('run_1', 'research')).toBe(hub.idempotencyKey('run_1', 'research'));
  });

  it('idempotencyKey varies by run and step', () => {
    const { hub } = makeHub();
    expect(hub.idempotencyKey('run_1', 'research')).not.toBe(
      hub.idempotencyKey('run_2', 'research'),
    );
    expect(hub.idempotencyKey('run_1', 'research')).not.toBe(
      hub.idempotencyKey('run_1', 'design'),
    );
  });

  it('computeBackoff is exponential: 1×, 2×, 4×, 8×', () => {
    const { hub } = makeHub({ baseBackoffMs: 100 });
    expect(hub.computeBackoff(1)).toBe(100);
    expect(hub.computeBackoff(2)).toBe(200);
    expect(hub.computeBackoff(3)).toBe(400);
    expect(hub.computeBackoff(4)).toBe(800);
  });

  it('computeBackoff returns 0 for attempt < 1', () => {
    const { hub } = makeHub();
    expect(hub.computeBackoff(0)).toBe(0);
    expect(hub.computeBackoff(-3)).toBe(0);
  });
});

describe('OrchestratorHub — executeStep success path', () => {
  it('runs work, returns its result, writes a checkpoint', async () => {
    const { hub, hot, cold } = makeHub();
    const result = await hub.executeStep({
      runId: 'run_1',
      stepKey: 'research',
      work: async () => ({ output: 'brief' }),
    });
    expect(result).toEqual({ output: 'brief' });
    // Hot store has the checkpoint
    const cached = await hot.get(hub.idempotencyKey('run_1', 'research'));
    expect(cached.result).toEqual({ output: 'brief' });
    // Audit trail recorded start + attempt.start + success
    const phases = cold.entries.map((e) => e.phase);
    expect(phases).toContain('step.start');
    expect(phases).toContain('step.attempt.start');
    expect(phases).toContain('step.success');
  });

  it('getCheckpoint returns the cached result', async () => {
    const { hub } = makeHub();
    await hub.executeStep({
      runId: 'run_1',
      stepKey: 'research',
      work: async () => 'first-result',
    });
    expect(await hub.getCheckpoint('run_1', 'research')).toBe('first-result');
  });

  it('getCheckpoint returns null when not yet executed', async () => {
    const { hub } = makeHub();
    expect(await hub.getCheckpoint('run_1', 'never-ran')).toBeNull();
  });
});

describe('OrchestratorHub — idempotency', () => {
  it('second executeStep with same runId+stepKey returns cached result and DOES NOT run work again', async () => {
    const { hub, cold } = makeHub();
    const work = vi.fn(async () => 'first-output');
    await hub.executeStep({ runId: 'run_1', stepKey: 'research', work });
    expect(work).toHaveBeenCalledTimes(1);

    const second = await hub.executeStep({ runId: 'run_1', stepKey: 'research', work });
    expect(second).toBe('first-output');
    expect(work).toHaveBeenCalledTimes(1);

    const phases = cold.entries.map((e) => e.phase);
    expect(phases).toContain('step.idempotent_hit');
  });

  it('different runs with same stepKey both execute independently', async () => {
    const { hub } = makeHub();
    const work = vi.fn(async () => 'output');
    await hub.executeStep({ runId: 'run_1', stepKey: 'research', work });
    await hub.executeStep({ runId: 'run_2', stepKey: 'research', work });
    expect(work).toHaveBeenCalledTimes(2);
  });

  it('clearCheckpoint forces re-execution of the same step', async () => {
    const { hub } = makeHub();
    const work = vi.fn(async () => 'output');
    await hub.executeStep({ runId: 'run_1', stepKey: 'research', work });
    await hub.clearCheckpoint('run_1', 'research');
    await hub.executeStep({ runId: 'run_1', stepKey: 'research', work });
    expect(work).toHaveBeenCalledTimes(2);
  });
});

describe('OrchestratorHub — retry with exponential backoff', () => {
  it('retries on failure and succeeds on attempt 3', async () => {
    const { hub, sleepCalls, cold } = makeHub({ baseBackoffMs: 100, maxAttempts: 3 });
    let n = 0;
    const work = vi.fn(async () => {
      n++;
      if (n < 3) throw new Error(`fail-${n}`);
      return 'recovered';
    });
    const r = await hub.executeStep({ runId: 'run_1', stepKey: 'design', work });
    expect(r).toBe('recovered');
    expect(work).toHaveBeenCalledTimes(3);
    // Backoff after attempt 1 (100ms) and attempt 2 (200ms). No backoff after success.
    expect(sleepCalls).toEqual([100, 200]);
    const phases = cold.entries.map((e) => e.phase);
    expect(phases.filter((p) => p === 'step.attempt.failure')).toHaveLength(2);
    expect(phases).toContain('step.success');
  });

  it('throws the last error after exhausting maxAttempts and audits step.failure', async () => {
    const { hub, cold, sleepCalls } = makeHub({ baseBackoffMs: 50, maxAttempts: 3 });
    const work = vi.fn(async () => {
      throw new Error('always-fails');
    });
    await expect(
      hub.executeStep({ runId: 'run_1', stepKey: 'build', work }),
    ).rejects.toThrow('always-fails');
    expect(work).toHaveBeenCalledTimes(3);
    // Backoff between attempts only — no backoff after final failure.
    expect(sleepCalls).toEqual([50, 100]);
    const phases = cold.entries.map((e) => e.phase);
    expect(phases).toContain('step.failure');
    expect(phases.filter((p) => p === 'step.attempt.failure')).toHaveLength(3);
  });

  it('does not retry after success on first attempt', async () => {
    const { hub, sleepCalls } = makeHub();
    const work = vi.fn(async () => 'fast');
    await hub.executeStep({ runId: 'run_1', stepKey: 'research', work });
    expect(work).toHaveBeenCalledTimes(1);
    expect(sleepCalls).toEqual([]);
  });

  it('failed step does NOT write a checkpoint (so a later run can retry)', async () => {
    const { hub, hot } = makeHub({ maxAttempts: 1 });
    await expect(
      hub.executeStep({
        runId: 'run_1',
        stepKey: 'gtm',
        work: async () => {
          throw new Error('boom');
        },
      }),
    ).rejects.toThrow();
    expect(await hot.get(hub.idempotencyKey('run_1', 'gtm'))).toBeNull();
  });
});

describe('OrchestratorHub — routeJob', () => {
  it('routes research to agent #6 with recommend_only', async () => {
    const { hub, cold } = makeHub();
    const d = await hub.routeJob({ runId: 'run_1', stepKey: 'research' });
    expect(d.agentId).toBe(6);
    expect(d.authority).toBe('recommend_only');
    const phases = cold.entries.map((e) => e.phase);
    expect(phases).toContain('route.decision');
  });

  it('routes deploy to no agent (orchestrator-only)', async () => {
    const { hub } = makeHub();
    const d = await hub.routeJob({ runId: 'run_1', stepKey: 'deploy' });
    expect(d.agentId).toBeNull();
    expect(d.reason).toMatch(/orchestrator-only/);
  });

  it('rejects unknown step', async () => {
    const { hub } = makeHub();
    const d = await hub.routeJob({ runId: 'run_1', stepKey: 'never-step' });
    expect(d.agentId).toBeNull();
    expect(d.reason).toMatch(/unknown step/);
  });

  it('throws on missing runId or stepKey', async () => {
    const { hub } = makeHub();
    await expect(hub.routeJob({ runId: '', stepKey: 'research' })).rejects.toThrow();
    await expect(hub.routeJob({ runId: 'r', stepKey: '' })).rejects.toThrow();
  });
});

describe('OrchestratorHub — argument validation', () => {
  it('executeStep throws on bad runId / stepKey / work', async () => {
    const { hub } = makeHub();
    await expect(hub.executeStep({ runId: '', stepKey: 'x', work: async () => 0 })).rejects.toThrow();
    await expect(hub.executeStep({ runId: 'r', stepKey: '', work: async () => 0 })).rejects.toThrow();
    await expect(hub.executeStep({ runId: 'r', stepKey: 'x', work: 'not-a-fn' })).rejects.toThrow();
  });
});

describe('OrchestratorHub — inventory', () => {
  it('reports 20 agents and 7 step-owners', () => {
    const { hub } = makeHub();
    const i = hub.inventory();
    expect(i.agents).toBe(20);
    expect(i.stepOwners).toBe(7);
    expect(i.orchestratorOnly).toBe(1); // deploy
  });
});
