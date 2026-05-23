// tests/agents/renewal/gtmReadinessScorer.test.js
//
// §7.6 GTM Readiness scorer tests. Validates the canonical formula
//
//   score = 100 − 10·crit − 5·high − 2·med − 0.5·low ; clamped [0,100]
//
// and the crawl-output → severity-tagged-issues derivation.

import { describe, it, expect } from 'vitest';
import {
  computeGtmReadiness,
  computeCeo95Criteria,
  countSeverities,
  deriveIssuesFromCrawl,
  scoreCrawlOutput,
  __internals,
} from '../../../src/lib/agents/renewal/gtmReadinessScorer.js';

describe('countSeverities', () => {
  it('returns all-zero envelope for empty/missing input', () => {
    expect(countSeverities([])).toEqual({ critical: 0, high: 0, medium: 0, low: 0 });
    expect(countSeverities(null)).toEqual({ critical: 0, high: 0, medium: 0, low: 0 });
    expect(countSeverities(undefined)).toEqual({ critical: 0, high: 0, medium: 0, low: 0 });
  });

  it('counts each recognised severity', () => {
    const c = countSeverities([
      { severity: 'critical' }, { severity: 'critical' },
      { severity: 'high' }, { severity: 'medium' }, { severity: 'medium' },
      { severity: 'low' }, { severity: 'low' }, { severity: 'low' },
    ]);
    expect(c).toEqual({ critical: 2, high: 1, medium: 2, low: 3 });
  });

  it('ignores unrecognised / missing / non-object entries (never coerces silently)', () => {
    const c = countSeverities([
      { severity: 'CRITICAL' }, // case-sensitive — ignored
      { severity: 'showstopper' }, // unrecognised — ignored
      { severity: 'info' },        // unrecognised
      { severity: undefined },
      { },                          // no severity field
      null, 42, 'bad', undefined,
      { severity: 'critical' },     // the one valid entry
    ]);
    expect(c).toEqual({ critical: 1, high: 0, medium: 0, low: 0 });
  });
});

describe('computeGtmReadiness — canonical §7.6 formula', () => {
  it('100 with zero issues (showcase-ready)', () => {
    const v = computeGtmReadiness({ issues: [] });
    expect(v.score).toBe(100);
    expect(v.penalty).toBe(0);
    expect(v.band).toBe('showcase-ready');
    expect(v.label).toBe('Showcase-ready');
  });

  it('one critical → 90 (still showcase-ready)', () => {
    const v = computeGtmReadiness({ issues: [{ severity: 'critical' }] });
    expect(v.score).toBe(90);
    expect(v.penalty).toBe(10);
    expect(v.band).toBe('showcase-ready');
  });

  it('one high → 95', () => {
    const v = computeGtmReadiness({ issues: [{ severity: 'high' }] });
    expect(v.score).toBe(95);
    expect(v.band).toBe('showcase-ready');
  });

  it('one medium → 98; one low → 99.5', () => {
    expect(computeGtmReadiness({ issues: [{ severity: 'medium' }] }).score).toBe(98);
    expect(computeGtmReadiness({ issues: [{ severity: 'low' }] }).score).toBe(99.5);
  });

  it('mixed counts compute exactly per formula', () => {
    // 100 − 10·2 − 5·3 − 2·4 − 0.5·6 = 100 − 20 − 15 − 8 − 3 = 54
    const issues = [
      ...Array(2).fill({ severity: 'critical' }),
      ...Array(3).fill({ severity: 'high' }),
      ...Array(4).fill({ severity: 'medium' }),
      ...Array(6).fill({ severity: 'low' }),
    ];
    const v = computeGtmReadiness({ issues });
    expect(v.score).toBe(54);
    expect(v.penalty).toBe(46);
    expect(v.counts).toEqual({ critical: 2, high: 3, medium: 4, low: 6 });
    expect(v.band).toBe('not-demo-ready');
    expect(v.label).toBe('Not demo-ready');
  });

  it('clamps to 0 when penalty exceeds 100 (never negative)', () => {
    const issues = Array(20).fill({ severity: 'critical' }); // 200 penalty
    const v = computeGtmReadiness({ issues });
    expect(v.score).toBe(0);
    expect(v.penalty).toBe(200);
    expect(v.band).toBe('not-demo-ready');
  });

  it('clamps to 100 (would never exceed without negative weights, but defensive)', () => {
    // No issues → 100; verify clamp logic with the internals helper
    expect(__internals.clamp(150, 0, 100)).toBe(100);
    expect(__internals.clamp(-5,  0, 100)).toBe(0);
  });

  it('echoes the canonical formula text for auditability', () => {
    const v = computeGtmReadiness({ issues: [] });
    expect(v.formula).toBe('score = 100 − 10·critical − 5·high − 2·medium − 0.5·low; clamped [0,100]');
  });

  it('band boundaries: 89 → demo-ready; 90 → showcase-ready', () => {
    // 89 = 100 - 11; with 1 critical (-10) + 1 medium (-2) = -12 → 88 → demo-ready
    // For exact 90: 2 high (−10) → 90 → showcase-ready
    expect(computeGtmReadiness({ issues: [{ severity: 'critical' }, { severity: 'medium' }] }).score).toBe(88);
    expect(computeGtmReadiness({ issues: [{ severity: 'critical' }, { severity: 'medium' }] }).band).toBe('demo-ready');
    expect(computeGtmReadiness({ issues: [{ severity: 'high' }, { severity: 'high' }] }).score).toBe(90);
    expect(computeGtmReadiness({ issues: [{ severity: 'high' }, { severity: 'high' }] }).band).toBe('showcase-ready');
  });

  it('band boundary: 74 → internal-only; 75 → demo-ready', () => {
    // 75 = 100 - 25; 5 high → 75 exactly
    const v75 = computeGtmReadiness({ issues: Array(5).fill({ severity: 'high' }) });
    expect(v75.score).toBe(75);
    expect(v75.band).toBe('demo-ready');
    // 74 = 100 - 26; 5 high + 1 low (-0.5)... = 74.5 still demo-ready.
    // 4 high + 3 medium = 100 - 20 - 6 = 74 → internal-only
    const v74 = computeGtmReadiness({ issues: [
      ...Array(4).fill({ severity: 'high' }),
      ...Array(3).fill({ severity: 'medium' }),
    ] });
    expect(v74.score).toBe(74);
    expect(v74.band).toBe('internal-only');
  });

  it('band boundary: 59 → not-demo-ready; 60 → internal-only', () => {
    // 60 = 100 - 40; 8 high → 60 exactly
    const v60 = computeGtmReadiness({ issues: Array(8).fill({ severity: 'high' }) });
    expect(v60.score).toBe(60);
    expect(v60.band).toBe('internal-only');
    // 59 = 100 - 41; 4 critical (-40) + 1 low (-0.5) = 59.5 → still internal-only
    // 4 crit + 1 medium = 100 - 40 - 2 = 58 → not-demo-ready
    const v58 = computeGtmReadiness({ issues: [
      ...Array(4).fill({ severity: 'critical' }),
      { severity: 'medium' },
    ] });
    expect(v58.score).toBe(58);
    expect(v58.band).toBe('not-demo-ready');
  });

  it('treats missing args bag as empty (no exception)', () => {
    expect(computeGtmReadiness().score).toBe(100);
    expect(computeGtmReadiness({}).score).toBe(100);
  });
});

describe('deriveIssuesFromCrawl — Phase-1-honest §6 detector subset', () => {
  it('empty crawl → no issues', () => {
    expect(deriveIssuesFromCrawl({ pages: [], errors: [], brokenLinks: [] })).toEqual([]);
    expect(deriveIssuesFromCrawl(null)).toEqual([]);
    expect(deriveIssuesFromCrawl({})).toEqual([]);
  });

  it('maps crawl-level errors → critical engine-error (bundled)', () => {
    const out = deriveIssuesFromCrawl({
      pages: [],
      errors: ['crawl: timeout', 'crawl: dns_failed', 'browserless: 502'],
      brokenLinks: [],
    });
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('critical');
    expect(out[0].category).toBe('engine-error');
    expect(out[0].evidence).toMatch(/3 crawl-level error/);
  });

  it('maps per-page console errors → medium (one per page, bundled)', () => {
    const out = deriveIssuesFromCrawl({
      pages: [],
      errors: [
        'console (https://a.example/): TypeError: x',
        'console (https://a.example/): ReferenceError: y',
        'console (https://b.example/): Error: z',
      ],
      brokenLinks: [],
    });
    const mediums = out.filter((i) => i.severity === 'medium');
    expect(mediums).toHaveLength(2);
    expect(mediums.map((m) => m.location).sort()).toEqual([
      'https://a.example/', 'https://b.example/',
    ]);
    expect(mediums[0].category).toBe('console-error');
  });

  it('maps per-page network errors → high (one per page, bundled)', () => {
    const out = deriveIssuesFromCrawl({
      pages: [],
      errors: [
        'network (https://a.example/): https://cdn/x.js [404]',
        'network (https://a.example/): https://api/y [500]',
      ],
      brokenLinks: [],
    });
    const highs = out.filter((i) => i.severity === 'high');
    expect(highs).toHaveLength(1);
    expect(highs[0].location).toBe('https://a.example/');
    expect(highs[0].category).toBe('network-failure');
  });

  it('maps brokenLinks → high network-failure (one per link)', () => {
    const out = deriveIssuesFromCrawl({
      pages: [],
      errors: [],
      brokenLinks: ['https://a/', 'https://b/'],
    });
    const highs = out.filter((i) => i.severity === 'high');
    expect(highs).toHaveLength(2);
    expect(highs.every((h) => h.category === 'network-failure')).toBe(true);
  });

  it('maps HTTP statusCodes correctly', () => {
    const out = deriveIssuesFromCrawl({
      pages: [
        { url: 'https://a/', statusCode: 500, headings: ['h2: x'], text: 'hi' },
        { url: 'https://b/', statusCode: 404, headings: ['h2: x'], text: 'hi' },
        { url: 'https://c/', statusCode: 401, headings: ['h2: x'], text: 'hi' },
        { url: 'https://d/', statusCode: 200, headings: ['h2: x'], text: 'hi' },
      ],
      errors: [],
      brokenLinks: [],
    });
    const critical = out.filter((i) => i.severity === 'critical');
    expect(critical.length).toBe(1);
    expect(critical[0].location).toBe('https://a/');
    expect(critical[0].category).toBe('engine-error');
    // 404 + 401 → high
    const highs = out.filter((i) => i.severity === 'high');
    expect(highs.length).toBeGreaterThanOrEqual(2);
    expect(highs.some((h) => h.location === 'https://b/' && h.category === 'network-failure')).toBe(true);
    expect(highs.some((h) => h.location === 'https://c/' && h.category === 'auth-gate-leak')).toBe(true);
  });

  it('maps slow-route (loadTimeMs > threshold) → medium', () => {
    const out = deriveIssuesFromCrawl({
      pages: [
        { url: 'https://slow/',  statusCode: 200, loadTimeMs: 5000, headings: ['h1: x'], text: 'hi' },
        { url: 'https://fast/',  statusCode: 200, loadTimeMs: 200,  headings: ['h1: x'], text: 'hi' },
      ],
      errors: [], brokenLinks: [],
    });
    const slows = out.filter((i) => i.category === 'slow-route');
    expect(slows).toHaveLength(1);
    expect(slows[0].location).toBe('https://slow/');
    expect(slows[0].severity).toBe('medium');
  });

  it('maps missing h1 → low accessibility-headings (page with headings but no h1)', () => {
    const out = deriveIssuesFromCrawl({
      pages: [{
        url: 'https://no-h1/',
        statusCode: 200,
        headings: [{ tag: 'h2', text: 'x' }, { tag: 'h3', text: 'y' }],
        text: 'has content',
      }],
      errors: [], brokenLinks: [],
    });
    const lows = out.filter((i) => i.severity === 'low');
    expect(lows).toHaveLength(1);
    expect(lows[0].category).toBe('accessibility-headings');
    expect(lows[0].evidence).toMatch(/no h1/);
  });

  it('maps no headings at all → low accessibility-headings', () => {
    const out = deriveIssuesFromCrawl({
      pages: [{ url: 'https://x/', statusCode: 200, headings: [], text: 'body content' }],
      errors: [], brokenLinks: [],
    });
    const lows = out.filter((i) => i.severity === 'low');
    expect(lows).toHaveLength(1);
    expect(lows[0].evidence).toMatch(/no heading/);
  });

  it('skips accessibility-headings on pages with no text (status issue already covers failure)', () => {
    const out = deriveIssuesFromCrawl({
      pages: [{ url: 'https://x/', statusCode: 500, headings: [], text: '' }],
      errors: [], brokenLinks: [],
    });
    const lows = out.filter((i) => i.severity === 'low');
    expect(lows).toHaveLength(0);
    // Only the critical engine-error from 500
    expect(out).toEqual([
      expect.objectContaining({ severity: 'critical', category: 'engine-error' }),
    ]);
  });
});

describe('scoreCrawlOutput — end-to-end convenience', () => {
  it('combines derive + compute and surfaces the issues array', () => {
    const out = scoreCrawlOutput({
      pages: [{ url: 'https://x/', statusCode: 200, headings: [{ tag: 'h1', text: 't' }], text: 'hi' }],
      errors: [],
      brokenLinks: [],
    });
    expect(out.score).toBe(100);
    expect(out.issues).toEqual([]);
    expect(out.band).toBe('showcase-ready');
  });

  it('canonical mid-band example: a few real-world failures bring score below 95', () => {
    const out = scoreCrawlOutput({
      pages: [
        { url: 'https://a/', statusCode: 500, headings: [], text: '' },          // critical (engine-error)
        { url: 'https://b/', statusCode: 404, headings: [], text: '' },          // high (network-failure)
        { url: 'https://c/', statusCode: 200, loadTimeMs: 4500, headings: [{ tag: 'h1', text: 't' }], text: 'hi' }, // medium (slow-route)
      ],
      errors: ['console (https://c/): warn x'],   // medium
      brokenLinks: ['https://broken/'],            // high
    });
    // 100 − 10 (1 crit) − 5·2 (2 high) − 2·2 (2 medium) = 100 − 10 − 10 − 4 = 76 → demo-ready
    expect(out.score).toBe(76);
    expect(out.band).toBe('demo-ready');
    expect(out.counts).toEqual({ critical: 1, high: 2, medium: 2, low: 0 });
  });
});

describe('CEO-defined 95/100 criteria provenance', () => {
  it('separates measured, inferred, and human-required criteria without fake precision', () => {
    const criteria = computeCeo95Criteria({
      crawlOutput: {
        pages: [
          {
            url: 'https://product.example/pricing',
            statusCode: 200,
            loadTimeMs: 1200,
            headings: [{ tag: 'h1', text: 'Pricing' }],
            text: 'Pricing plans. Book a demo. Get started. Subscribe with Stripe checkout.',
            interactives: [{ role: 'button', text: 'Book a demo' }],
          },
        ],
        errors: [],
        brokenLinks: [],
      },
      issues: [],
    });

    expect(criteria.version).toBe('ceo-95-criteria.v1');
    expect(criteria.verifiedScore).toBeGreaterThan(0);
    expect(criteria.potentialScore).toBeGreaterThan(criteria.verifiedScore);
    expect(criteria.blockedScore).toBeGreaterThan(0);
    expect(criteria.summary.measurableNow.total).toBeGreaterThan(0);
    expect(criteria.summary.inferredWithConfidence.total).toBeGreaterThan(0);
    expect(criteria.summary.notYetMeasurable.total).toBeGreaterThan(0);
    expect(criteria.layers.l3.criteria.find((c) => c.id === 'pricing_accuracy')).toMatchObject({
      bucket: 'requires_human',
      pointsAwarded: 0,
    });
  });

  it('deducts measured criteria when matching findings are present', () => {
    const clean = computeCeo95Criteria({
      crawlOutput: {
        pages: [{ url: 'https://product.example/', statusCode: 200, headings: [{ tag: 'h1', text: 'Home' }], text: 'Get started' }],
        errors: [],
        brokenLinks: [],
      },
      issues: [],
    });
    const withConsoleError = computeCeo95Criteria({
      crawlOutput: {
        pages: [{ url: 'https://product.example/', statusCode: 200, headings: [{ tag: 'h1', text: 'Home' }], text: 'Get started' }],
        errors: [],
        brokenLinks: [],
      },
      issues: [{ severity: 'medium', category: 'console-error', location: 'https://product.example/', evidence: 'TypeError' }],
    });

    expect(withConsoleError.layers.l1.verifiedPoints).toBeLessThan(clean.layers.l1.verifiedPoints);
    expect(withConsoleError.layers.l1.criteria.find((c) => c.id === 'zero_runtime_console_errors')).toMatchObject({
      bucket: 'measured',
      passed: false,
      pointsAwarded: 0,
    });
  });

  it('attaches CEO-95 score provenance to crawl scoring output', () => {
    const out = scoreCrawlOutput({
      pages: [{ url: 'https://x/pricing', statusCode: 200, headings: [{ tag: 'h1', text: 'Pricing' }], text: 'Pricing. Contact us. Get started.' }],
      errors: [],
      brokenLinks: [],
    });

    expect(out.ceo95Criteria).toMatchObject({
      version: 'ceo-95-criteria.v1',
      verifiedScore: out.verifiedScore,
      potentialScore: out.potentialScore,
      blockedScore: out.blockedScore,
    });
  });
});
