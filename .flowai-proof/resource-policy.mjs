import os from 'node:os';

export const FLOWAI_PROOF_RESOURCE_POLICY = Object.freeze({
  startPct: 10,
  continuePct: 8,
  checkpointPct: 6,
});

export const freeRamPct = () => 100 * os.freemem() / os.totalmem();

export function proofResourceDecision({
  freePct,
  phase = 'continue',
  unsafePaging = false,
  unsafeProcessSpawn = false,
} = {}) {
  if (unsafePaging || unsafeProcessSpawn || !Number.isFinite(freePct)) return 'stop';
  if (freePct < FLOWAI_PROOF_RESOURCE_POLICY.checkpointPct) return 'stop';
  if (freePct < FLOWAI_PROOF_RESOURCE_POLICY.continuePct) return 'checkpoint';
  if (phase === 'start' && freePct < FLOWAI_PROOF_RESOURCE_POLICY.startPct) return 'defer';
  return 'continue';
}

export function guardProofResources(phase = 'continue') {
  const decision = proofResourceDecision({
    freePct: freeRamPct(),
    phase,
    unsafePaging: process.env.FLOWAI_UNSAFE_PAGING_SYMPTOM === '1',
    unsafeProcessSpawn: process.env.FLOWAI_UNSAFE_PROCESS_SPAWN_SYMPTOM === '1',
  });
  if (decision === 'stop') throw Object.assign(new Error('RAM_SAFETY_STOP'), { code: 'RAM_SAFETY_STOP' });
  if (decision === 'checkpoint') throw Object.assign(new Error('RAM_CHECKPOINT_REQUIRED'), { code: 'RAM_CHECKPOINT_REQUIRED' });
  if (decision === 'defer') throw Object.assign(new Error('RAM_START_DEFERRED'), { code: 'RAM_START_DEFERRED' });
  return decision;
}
