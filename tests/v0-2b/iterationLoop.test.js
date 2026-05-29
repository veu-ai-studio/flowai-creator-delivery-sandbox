import { describe, expect, it, vi } from 'vitest';

import { createMemoryHotStore } from '../../src/lib/agents/orchestrator/OrchestratorHub.ts';
import {
  buildRenewalOutput,
  ITERATION_ZERO_LABEL,
} from '../../src/lib/orchestratorFramework/renewalOutput.js';
import {
  LOOP_FLAGS,
  NODE_BACKGROUND_JOB_ONLY,
  __test,
  excludePendingRatificationEntries,
  runIteration,
} from '../../src/lib/orchestratorFramework/iterationLoop.js';

function quietLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function baseInput(overrides = {}) {
  return {
    productId: 'saige',
    runId: 'run-1',
    iterationCount: 0,
    scoreAfter: 0,
    matrixArtifactVersion: 'matrix-1',
    flowaiSelfScore: { verified: false, tier: 'B', verified_pct: null },
    ...overrides,
  };
}

function completeOutput(overrides = {}) {
  return buildRenewalOutput({
    ...baseInput(),
    scoreBefore: 0,
    scoreAfter: 25,
    surfacesTested: 4,
    surfacesVerified: 1,
    surfacesFailed: 3,
    evidenceCoverage: 0.25,
    correctiveDispatches: ['wire mocked surface'],
    ...overrides,
  }, { logger: quietLogger() });
}

describe('v0.2B renewal output', () => {
  it('renewalOutput schema complete with required fields', () => {
    const output = completeOutput();
    expect(output).toEqual(expect.objectContaining({
      productId: expect.any(String),
      runId: expect.any(String),
      iterationCount: expect.any(Number),
      iterationZeroFlag: expect.any(Boolean),
      iterationLabel: expect.any(String),
      scoreBefore: expect.any(Number),
      scoreAfter: expect.any(Number),
      surfacesTested: expect.any(Number),
      surfacesVerified: expect.any(Number),
      surfacesFailed: expect.any(Number),
      evidenceCoverage: expect.any(Number),
      matrixArtifactVersion: expect.any(String),
      correctiveDispatches: expect.any(Array),
      timestamp: expect.any(String),
      gtmFlag: expect.stringMatching(/^GTM-/),
      flowaiSelfScore: expect.objectContaining({ verified: expect.any(Boolean), tier: expect.any(String) }),
    }));
  });

  it('iterationZeroFlag true on first pass', () => {
    expect(completeOutput({ iterationCount: 0 }).iterationZeroFlag).toBe(true);
  });

  it('iteration zero labeled correctly in data object', () => {
    expect(completeOutput({ iterationCount: 0 }).iterationLabel).toBe(ITERATION_ZERO_LABEL);
  });
});

describe('v0.2B iteration loop', () => {
  it('declares Node background job execution context', () => {
    expect(NODE_BACKGROUND_JOB_ONLY).toMatchObject({
      executionContext: 'node-background-job',
      serverlessMayTriggerOrPoll: true,
      serverlessMayHostLoop: false,
    });
  });

  it('GTM-BLOCKED at < 95%', async () => {
    const hotStore = createMemoryHotStore();
    const result = await runIteration(baseInput(), {
      hotStore,
      logger: quietLogger(),
      maxIterations: 1,
      score: async () => ({ scoreAfter: 40, evidenceCoverage: 1 }),
    });

    expect(result.gtmFlag).toBe('GTM-BLOCKED');
    expect(result.flag).toBe(LOOP_FLAGS.MAX_ITERATIONS);
  });

  it('GTM-ELIGIBLE at >= 95%', async () => {
    const hotStore = createMemoryHotStore();
    const result = await runIteration(baseInput(), {
      hotStore,
      logger: quietLogger(),
      score: async () => ({ scoreAfter: 95, evidenceCoverage: 1 }),
    });

    expect(result.gtmFlag).toBe('GTM-ELIGIBLE');
    expect(result.flag).toBeUndefined();
  });

  it('MAX_ITERATIONS_REACHED fires at limit', async () => {
    const result = await runIteration(baseInput(), {
      hotStore: createMemoryHotStore(),
      logger: quietLogger(),
      maxIterations: 2,
      score: async () => ({ scoreAfter: 50, evidenceCoverage: 1 }),
      rebuild: async output => ({ scoreAfter: output.scoreAfter }),
    });

    expect(result).toMatchObject({
      flag: LOOP_FLAGS.MAX_ITERATIONS,
      finalScore: 50,
      escalateTo: 'Victor',
    });
  });

  it('SCORE_PLATEAU_DETECTED fires after 3 flat iterations', async () => {
    const result = await runIteration(baseInput({ scoreAfter: 40 }), {
      hotStore: createMemoryHotStore(),
      logger: quietLogger(),
      maxIterations: 10,
      score: async () => ({ scoreAfter: 40, evidenceCoverage: 1 }),
      rebuild: async output => ({ scoreAfter: output.scoreAfter }),
    });

    expect(result).toMatchObject({
      flag: LOOP_FLAGS.PLATEAU,
      plateauScore: 40,
      iterationsAtPlateau: 3,
    });
  });

  it('approval gate fires in supervised/controlled modes', async () => {
    const supervisedGate = vi.fn();
    await runIteration(baseInput({ runId: 'supervised' }), {
      hotStore: createMemoryHotStore(),
      logger: quietLogger(),
      approvalGate: supervisedGate,
      controlScheme: { structure: 'supervised' },
      score: async () => ({ scoreAfter: 96, evidenceCoverage: 1 }),
    });

    const controlledGate = vi.fn();
    await runIteration(baseInput({ runId: 'controlled' }), {
      hotStore: createMemoryHotStore(),
      logger: quietLogger(),
      approvalGate: controlledGate,
      controlScheme: { structure: 'controlled' },
      score: async () => ({ scoreAfter: 96, evidenceCoverage: 1 }),
    });

    expect(supervisedGate).toHaveBeenCalledTimes(1);
    expect(controlledGate).toHaveBeenCalledTimes(1);
  });

  it('PENDING-RATIFICATION entries excluded from scoring', async () => {
    const seen = [];
    const matrixState = {
      matrixArtifactVersion: 'matrix-1',
      layer1: [
        { surfaceId: 'canonical', ratificationState: 'CANONICAL' },
        { surfaceId: 'pending', ratificationState: 'PENDING-RATIFICATION' },
      ],
      layer2: [
        { surfaceId: 'deferred', ratificationState: 'PROPOSED-DEFERRED' },
      ],
    };

    const result = excludePendingRatificationEntries(matrixState);
    expect(result.layer1.map(entry => entry.surfaceId)).toEqual(['canonical']);

    await runIteration(baseInput(), {
      hotStore: createMemoryHotStore(),
      logger: quietLogger(),
      scan: async () => matrixState,
      score: async ({ matrixState: scoredMatrix }) => {
        seen.push(...scoredMatrix.layer1.map(entry => entry.surfaceId));
        return { scoreAfter: 96, evidenceCoverage: 1 };
      },
    });

    expect(seen).toEqual(['canonical']);
  });

  it('concurrent iteration rejected via hot-store lock', async () => {
    const hotStore = createMemoryHotStore();
    await hotStore.set(__test.lockKey('saige'), { productId: 'saige' }, 60);

    const result = await runIteration(baseInput(), {
      hotStore,
      logger: quietLogger(),
    });

    expect(result).toMatchObject({
      error: true,
      reason: 'iteration already running for productId',
    });
  });

  it('lock released on terminal state', async () => {
    const hotStore = createMemoryHotStore();
    await runIteration(baseInput(), {
      hotStore,
      logger: quietLogger(),
      score: async () => ({ scoreAfter: 96, evidenceCoverage: 1 }),
    });

    expect(await hotStore.get(__test.lockKey('saige'))).toBeNull();
  });

  it('loop state persists via hot store between invocations', async () => {
    const hotStore = createMemoryHotStore();
    const result = await runIteration(baseInput(), {
      hotStore,
      logger: quietLogger(),
      score: async () => ({ scoreAfter: 96, evidenceCoverage: 1 }),
    });

    const persisted = await hotStore.get(__test.iterationKey('saige'));
    expect(persisted).toMatchObject({
      productId: 'saige',
      runId: 'run-1',
      scoreAfter: result.scoreAfter,
      gtmFlag: 'GTM-ELIGIBLE',
    });
  });
});
