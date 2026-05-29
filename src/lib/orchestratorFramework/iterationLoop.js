import { MATRIX_LOCK_TTL_MS } from '../config.js';
import { selectStores } from '../agents/orchestrator/selectStores.ts';
import { buildRenewalOutput, GTM_FLAGS } from './renewalOutput.js';
import { createOrchestratorLogger } from './logger.js';

export const LOOP_FLAGS = Object.freeze({
  MAX_ITERATIONS: 'MAX_ITERATIONS_REACHED',
  PLATEAU: 'SCORE_PLATEAU_DETECTED',
});

export const NODE_BACKGROUND_JOB_ONLY = Object.freeze({
  executionContext: 'node-background-job',
  serverlessMayTriggerOrPoll: true,
  serverlessMayHostLoop: false,
});

function ttlSeconds() {
  return Math.max(1, Math.ceil(MATRIX_LOCK_TTL_MS / 1000));
}

function iterationKey(productId) {
  return `flowai:iter:${productId}`;
}

function lockKey(productId) {
  return `flowai:lock:${productId}`;
}

function isTerminal(result) {
  return result?.gtmFlag === GTM_FLAGS.ELIGIBLE ||
    result?.flag === LOOP_FLAGS.MAX_ITERATIONS ||
    result?.flag === LOOP_FLAGS.PLATEAU ||
    result?.error === true;
}

function scoreValue(result) {
  return Number.isFinite(Number(result?.scoreAfter)) ? Number(result.scoreAfter) : 0;
}

export function excludePendingRatificationEntries(matrixState = {}) {
  const filterEntry = entry => entry?.ratificationState !== 'PENDING-RATIFICATION';
  return Object.freeze({
    ...matrixState,
    layer1: Object.freeze((matrixState.layer1 ?? []).filter(filterEntry)),
    layer2: Object.freeze((matrixState.layer2 ?? []).filter(filterEntry)),
  });
}

async function resolveHotStore(config) {
  if (config.hotStore) return config.hotStore;
  return selectStores(config.storeSelection ?? {}).hot;
}

async function acquireLock(hotStore, productId, runId) {
  const key = lockKey(productId);
  const existing = await hotStore.get(key);
  if (existing !== null && existing !== undefined) {
    return Object.freeze({
      error: true,
      reason: 'iteration already running for productId',
      productId,
      lockKey: key,
    });
  }

  await hotStore.set(key, {
    productId,
    runId,
    acquiredAt: new Date().toISOString(),
  }, ttlSeconds());
  return Object.freeze({ acquired: true, lockKey: key });
}

async function renewLock(hotStore, productId, runId, iterationCount) {
  await hotStore.set(lockKey(productId), {
    productId,
    runId,
    iterationCount,
    renewedAt: new Date().toISOString(),
  }, ttlSeconds());
}

async function releaseLock(hotStore, productId) {
  await hotStore.delete(lockKey(productId));
}

function shouldGate(structure) {
  return structure === 'supervised' || structure === 'controlled';
}

function plateauDetected(scores) {
  if (scores.length < 4) return false;
  const lastFour = scores.slice(-4);
  return lastFour.every(score => score === lastFour[0]);
}

function buildMaxIterationsResult(output) {
  return Object.freeze({
    ...output,
    flag: LOOP_FLAGS.MAX_ITERATIONS,
    finalScore: output.scoreAfter,
    escalateTo: 'Victor',
  });
}

function buildPlateauResult(output) {
  return Object.freeze({
    ...output,
    flag: LOOP_FLAGS.PLATEAU,
    plateauScore: output.scoreAfter,
    iterationsAtPlateau: 3,
  });
}

export async function runIteration(renewalInput = {}, config = {}) {
  const logger = config.logger ?? createOrchestratorLogger('iterationLoop');
  const productId = String(renewalInput.productId ?? config.productId ?? '');
  const runId = String(renewalInput.runId ?? config.runId ?? '');
  if (!productId || !runId) {
    return Object.freeze({ error: true, reason: 'productId and runId are required' });
  }

  const hotStore = await resolveHotStore(config);
  const lock = await acquireLock(hotStore, productId, runId);
  if (lock.error) return lock;

  const maxIterations = Math.max(1, Math.trunc(Number(config.maxIterations ?? 10)));
  const approvalGate = typeof config.approvalGate === 'function' ? config.approvalGate : null;
  const scan = typeof config.scan === 'function' ? config.scan : async input => input.matrixState ?? {};
  const score = typeof config.score === 'function'
    ? config.score
    : async ({ input }) => ({
        scoreAfter: scoreValue(input),
        surfacesTested: input.surfacesTested ?? 0,
        surfacesVerified: input.surfacesVerified ?? 0,
        surfacesFailed: input.surfacesFailed ?? 0,
        evidenceCoverage: input.evidenceCoverage ?? 0,
        correctiveDispatches: input.correctiveDispatches ?? [],
      });
  const rebuild = typeof config.rebuild === 'function' ? config.rebuild : async output => output;

  const scores = [scoreValue(renewalInput)];
  let currentInput = renewalInput;
  let latestOutput = null;

  try {
    for (let iterationOffset = 0; iterationOffset < maxIterations; iterationOffset += 1) {
      const iterationCount = Math.max(0, Math.trunc(Number(currentInput.iterationCount ?? iterationOffset)));
      await renewLock(hotStore, productId, runId, iterationCount);

      if (approvalGate && shouldGate(config.controlScheme?.structure)) {
        await approvalGate({ productId, runId, iterationCount, boundary: 'iteration' });
      }

      const scannedMatrix = excludePendingRatificationEntries(await scan({
        input: currentInput,
        config,
        iterationCount,
      }));
      const scoreResult = await score({
        input: currentInput,
        matrixState: scannedMatrix,
        config,
        iterationCount,
      });

      latestOutput = buildRenewalOutput({
        ...currentInput,
        ...scoreResult,
        productId,
        runId,
        iterationCount,
        scoreBefore: scoreValue(currentInput),
        matrixArtifactVersion: scoreResult.matrixArtifactVersion ??
          scannedMatrix.matrixArtifactVersion ??
          currentInput.matrixArtifactVersion,
        flowaiSelfScore: scoreResult.flowaiSelfScore ?? currentInput.flowaiSelfScore,
      }, { logger });

      await hotStore.set(iterationKey(productId), latestOutput, ttlSeconds());
      logger.info('iteration.state_persisted', {
        productId,
        runId,
        iterationCount,
        key: iterationKey(productId),
      });

      if (latestOutput.gtmFlag === GTM_FLAGS.ELIGIBLE) {
        await releaseLock(hotStore, productId);
        return latestOutput;
      }

      if (iterationCount + 1 >= maxIterations) {
        const maxResult = buildMaxIterationsResult(latestOutput);
        await hotStore.set(iterationKey(productId), maxResult, ttlSeconds());
        await releaseLock(hotStore, productId);
        return maxResult;
      }

      scores.push(latestOutput.scoreAfter);
      if (plateauDetected(scores)) {
        const plateauResult = buildPlateauResult(latestOutput);
        await hotStore.set(iterationKey(productId), plateauResult, ttlSeconds());
        await releaseLock(hotStore, productId);
        return plateauResult;
      }

      const rebuilt = await rebuild(latestOutput, {
        productId,
        runId,
        iterationCount,
        matrixState: scannedMatrix,
      });
      currentInput = {
        ...latestOutput,
        ...(rebuilt && typeof rebuilt === 'object' ? rebuilt : {}),
        iterationCount: iterationCount + 1,
      };
    }

    const maxResult = buildMaxIterationsResult(latestOutput ?? buildRenewalOutput({
      ...renewalInput,
      productId,
      runId,
      iterationCount: 0,
    }, { logger }));
    await hotStore.set(iterationKey(productId), maxResult, ttlSeconds());
    await releaseLock(hotStore, productId);
    return maxResult;
  } catch (error) {
    const errorResult = Object.freeze({
      error: true,
      reason: error?.message ?? String(error),
      productId,
      runId,
    });
    await hotStore.set(iterationKey(productId), errorResult, ttlSeconds());
    await releaseLock(hotStore, productId);
    logger.error('iteration.error', errorResult);
    return errorResult;
  } finally {
    if (!isTerminal(latestOutput)) {
      const active = await hotStore.get(lockKey(productId));
      if (active !== null && active !== undefined) await releaseLock(hotStore, productId);
    }
  }
}

export const __test = Object.freeze({
  acquireLock,
  excludePendingRatificationEntries,
  iterationKey,
  lockKey,
  plateauDetected,
  releaseLock,
  ttlSeconds,
});
