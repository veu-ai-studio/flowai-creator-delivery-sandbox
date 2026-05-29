import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { scoreSurface } from '../../src/lib/audits/tierScoringAdapter.js';
import {
  __test,
  orchestrateScore,
} from '../../src/lib/orchestratorFramework/ScoringOrchestrator.js';
import {
  createUserInitiationToken,
  validateRunStart,
} from '../../src/lib/orchestratorFramework/controlScheme.js';
import {
  MATRIX_ENTRY_STATES,
  validateEntryState,
} from '../../src/lib/orchestratorFramework/matrixAuthority.js';

const matrixState = {
  matrixArtifactVersion: 'matrix-v1',
  layer1: [
    { surfaceId: 'tier-a', name: 'Tier A', tier: 'A', status: 'PARTIAL', ratificationState: 'CANONICAL' },
    { surfaceId: 'tier-b', name: 'Tier B', tier: 'B', status: 'PARTIAL', ratificationState: 'CANONICAL' },
    { surfaceId: 'tier-c', name: 'Tier C', tier: 'C', status: 'PARTIAL', ratificationState: 'CANONICAL' },
    { surfaceId: 'pending', name: 'Pending', tier: 'A', status: 'PARTIAL', ratificationState: 'PENDING-RATIFICATION' },
  ],
  layer2: [],
};

const provider = {
  testPersistence: async () => ({ verified: true, reason: 'persistence passed' }),
  testBehavioral: async () => ({ verified: true, reason: 'behavior passed' }),
};

describe('v0.2C scoring orchestration', () => {
  it('uses correct denominator: Tier-A + Tier-B only', () => {
    const surfaces = __test.denominatorSurfaces(matrixState, 'saige');
    expect(surfaces.map(surface => surface.id)).toEqual(['tier-a', 'tier-b']);
  });

  it('excludes Tier-C from denominator', async () => {
    const tierC = await scoreSurface({ id: 'tier-c', tier: 'C' }, provider);
    expect(tierC.verified).toBe(false);
    expect(__test.denominatorSurfaces(matrixState, 'saige').some(surface => surface.tier === 'C')).toBe(false);
  });

  it('emits INSUFFICIENT_EVIDENCE before percentage when coverage < 0.5', async () => {
    const result = await orchestrateScore(matrixState, 'saige', {});
    expect(result.flag).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.verified_pct).toBeUndefined();
  });

  it('includes evidenceCoverage explicitly in output', async () => {
    const result = await orchestrateScore(matrixState, 'saige', { default: provider });
    expect(result.evidenceCoverage).toBe(1);
  });

  it('includes matrixArtifactVersion in output', async () => {
    const result = await orchestrateScore(matrixState, 'saige', { default: provider });
    expect(result.matrixArtifactVersion).toBe('matrix-v1');
  });

  it('includes meta-disclosure in every scorer output', async () => {
    const result = await orchestrateScore(matrixState, 'saige', { default: provider });
    expect(result.flowaiSelfScore).toEqual(expect.objectContaining({
      verified: expect.any(Boolean),
      tier: expect.any(String),
    }));
  });

  it('uses honest stub when FlowAI self-score unavailable', async () => {
    const result = await orchestrateScore(matrixState, 'saige', { default: provider });
    expect(result.flowaiSelfScore).toMatchObject({
      verified: false,
      verified_pct: null,
      reason: 'FlowAI self-score not yet instrumented',
    });
  });

  it('adds credibility warning when self-score < 20%', async () => {
    const result = await orchestrateScore(matrixState, 'saige', { default: provider }, {
      flowaiSelfScore: { verified: true, tier: 'B', verified_pct: 10 },
    });
    expect(result.credibilityWarning).toContain('below 20%');
  });

  it('Autonomous rejects without initiation token', () => {
    const result = validateRunStart({
      controlScheme: { structure: 'autonomous', mode: 'auto', depth: 'normal' },
    });
    expect(result).toMatchObject({
      error: true,
      reason: 'Autonomous mode requires user initiation token; run rejected',
    });
  });

  it('Autonomous accepts explicit initiation token', () => {
    const result = validateRunStart({
      controlScheme: { structure: 'autonomous', mode: 'auto', depth: 'normal' },
      userInitiationToken: createUserInitiationToken({ createdAt: '2026-05-29T00:00:00.000Z' }),
    });
    expect(result.ok).toBe(true);
  });

  it('PENDING-RATIFICATION state is enforced and excluded from scoring', () => {
    expect(validateEntryState({ ratificationState: 'PENDING-RATIFICATION' })).toBe(MATRIX_ENTRY_STATES.PENDING_RATIFICATION);
    expect(__test.denominatorSurfaces(matrixState, 'saige').map(surface => surface.id)).not.toContain('pending');
  });

  it('matrixAuthority remains read-only', () => {
    const source = readFileSync('src/lib/orchestratorFramework/matrixAuthority.js', 'utf8');
    expect(source).not.toMatch(/\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|rmSync|unlinkSync|renameSync)\b/);
  });
});
