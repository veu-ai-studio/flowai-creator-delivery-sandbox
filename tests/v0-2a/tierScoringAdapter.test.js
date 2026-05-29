import { describe, expect, it } from 'vitest';

import {
  checkEvidenceCoverage,
  scoreSurface,
} from '../../src/lib/audits/tierScoringAdapter.js';

describe('v0.2A tier scoring adapter', () => {
  it('Tier-A with provider returns verified result', async () => {
    const result = await scoreSurface(
      { id: 'risk-create', tier: 'A' },
      { testPersistence: async () => ({ verified: true, reason: 'reload persisted' }) },
    );

    expect(result).toMatchObject({ verified: true, tier: 'A', evidenceProvided: true });
  });

  it('Tier-A without provider returns honest stub', async () => {
    const result = await scoreSurface({ id: 'risk-create', tier: 'A' });

    expect(result.verified).toBe(false);
    expect(result.reason).toBe('Tier-A persistence test requires product-specific runtime hook');
    expect(result.evidenceProvided).toBe(false);
  });

  it('Tier-B with provider returns verified result', async () => {
    const result = await scoreSurface(
      { id: 'nav-flow', tier: 'B' },
      { testBehavioral: async () => ({ verified: true, reason: 'behavior passed' }) },
    );

    expect(result).toMatchObject({ verified: true, tier: 'B', evidenceProvided: true });
  });

  it('Tier-B without provider returns honest stub', async () => {
    const result = await scoreSurface({ id: 'nav-flow', tier: 'B' });

    expect(result.verified).toBe(false);
    expect(result.reason).toBe('Tier-B behavioral test requires product-specific runtime hook');
    expect(result.evidenceProvided).toBe(false);
  });

  it('Tier-C always returns verified false', async () => {
    const result = await scoreSurface(
      { id: 'ephemeral-note', tier: 'C' },
      { testBehavioral: async () => ({ verified: true }) },
    );

    expect(result).toMatchObject({
      verified: false,
      tier: 'C',
      reason: 'Tier-C ephemeral — never counts as evidence',
    });
  });

  it('Tier-C never contributes to VERIFIED percentage coverage', () => {
    const coverage = checkEvidenceCoverage([
      { tier: 'A', verified: true, evidenceProvided: true },
      { tier: 'C', verified: false, evidenceProvided: false },
    ]);

    expect(coverage.evidenceCoverage).toBe(1);
    expect(coverage.flag).toBe('SUFFICIENT_EVIDENCE');
  });

  it('returns INSUFFICIENT_EVIDENCE when coverage is below threshold', () => {
    const coverage = checkEvidenceCoverage([
      { tier: 'A', verified: false, evidenceProvided: false },
      { tier: 'B', verified: true, evidenceProvided: true },
      { tier: 'C', verified: false, evidenceProvided: false },
    ]);

    expect(coverage.flag).toBe('SUFFICIENT_EVIDENCE');

    const insufficient = checkEvidenceCoverage([
      { tier: 'A', verified: false, evidenceProvided: false },
      { tier: 'B', verified: false, evidenceProvided: false },
      { tier: 'C', verified: false, evidenceProvided: false },
    ]);
    expect(insufficient).toMatchObject({ flag: 'INSUFFICIENT_EVIDENCE', evidenceCoverage: 0 });
  });

  it('never returns verified true without provider confirmation', async () => {
    const a = await scoreSurface({ id: 'a', tier: 'A' });
    const b = await scoreSurface({ id: 'b', tier: 'B' });
    const c = await scoreSurface({ id: 'c', tier: 'C' });

    expect([a.verified, b.verified, c.verified]).toEqual([false, false, false]);
  });
});
