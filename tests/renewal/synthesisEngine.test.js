import { describe, it, expect } from 'vitest';
import { __internals } from '../../api/_lib/synthesisEngine.js';

describe('synthesisEngine — feature inventory', () => {
  it('builds per-URL inventory with cta + trust + legal scores', () => {
    const adapted = {
      ok: true,
      evidence: { pages: [{ ok: true, title: 'Welcome', metaDescription: 'product', headings: [{ tag: 'h1', text: 'Sign up' }], bodyText: 'Sign up free today. Trusted by teams. Privacy policy.' }] },
      normalized: { productConcept: 'Test product', targetUsers: 'Test users', coreClaims: ['c1', 'c2'], detectedFeatures: ['f1'] },
    };
    const inv = __internals.buildFeatureInventory(adapted, 'https://a.test');
    expect(inv.ok).toBe(true);
    expect(inv.scores.ctaCount).toBeGreaterThan(0);
    expect(inv.scores.trustSignalsPresent).toBe(true);
    expect(inv.scores.legalPresent).toBe(true);
    expect(inv.scores.featureBreadth).toBe(1);
  });
  it('handles unreachable URLs', () => {
    const inv = __internals.buildFeatureInventory({ ok: false, reason: 'timeout' }, 'https://x.test');
    expect(inv.ok).toBe(false);
    expect(inv.summary).toMatch(/unreachable/);
  });
});

describe('synthesisEngine — rankDimensions', () => {
  it('picks the strongest source per dimension', () => {
    const A = { url: 'A', scores: { ctaCount: 3, valuePropStrength: 1, trustSignalsPresent: false, legalPresent: false, featureBreadth: 1, headingHierarchy: 1 } };
    const B = { url: 'B', scores: { ctaCount: 1, valuePropStrength: 5, trustSignalsPresent: true, legalPresent: false, featureBreadth: 2, headingHierarchy: 3 } };
    const C = { url: 'C', scores: { ctaCount: 0, valuePropStrength: 2, trustSignalsPresent: false, legalPresent: true, featureBreadth: 4, headingHierarchy: 2 } };
    const winners = __internals.rankDimensions([A, B, C]);
    expect(winners.cta).toBe('A');
    expect(winners.valueProp).toBe('B');
    expect(winners.trustSignals).toBe('B');
    expect(winners.legal).toBe('C');
    expect(winners.features).toBe('C');
    expect(winners.headingHierarchy).toBe('B');
  });
});

describe('synthesisEngine — composeSynthesisSpec', () => {
  it('pulls productConcept from the valueProp winner and merges claims/features', () => {
    const reachable = [
      { url: 'A', scores: {}, normalized: { productConcept: 'A concept', targetUsers: 'A users', coreClaims: ['cA1', 'cA2'], detectedFeatures: ['fA'] } },
      { url: 'B', scores: {}, normalized: { productConcept: 'B concept', targetUsers: 'B users', coreClaims: ['cB1'], detectedFeatures: ['fB1', 'fB2', 'fB3'] } },
    ];
    const winners = { valueProp: 'B', features: 'B' };
    const spec = __internals.composeSynthesisSpec(reachable, winners);
    expect(spec.productConcept).toBe('B concept');
    expect(spec.detectedFeatures.length).toBeGreaterThanOrEqual(3);
    expect(spec.coreClaims.length).toBeGreaterThanOrEqual(2);
  });
});

describe('synthesisEngine — MIN/MAX constants', () => {
  it('enforces 2–5 URLs', () => {
    expect(__internals.MIN_URLS).toBe(2);
    expect(__internals.MAX_URLS).toBe(5);
  });
});
