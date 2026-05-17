// tests/agents/renewal/deltaPolicy.test.js
//
// Test surface for src/lib/agents/renewal/deltaPolicy.js (Self-Renewal
// §6.4). Covers each decision branch, the >= boundary case for
// isSubstantial (spec C1 fix at commit cd07328), and the HARD INVARIANT
// that auditEntry is ALWAYS present.

import { describe, it, expect } from 'vitest';
import { evaluateDelta, __internals } from '../../../src/lib/agents/renewal/deltaPolicy.js';

const RUN_ID = 'run_abc123';
const PRODUCT_ID = 'mypreglife';

function policy({
  negative = 'ALWAYS_OPEN',
  minimum = 0,
  substantial = 5,
} = {}) {
  return {
    selfRenewalNegativeDeltaPolicy: negative,
    selfRenewalMinimumDelta: minimum,
    selfRenewalSubstantialThreshold: substantial,
  };
}

function scoreOf(total, extras = {}) {
  return { total, ...extras };
}

// ── Branch 1: open_pr (positive delta above threshold) ───────────────────────

describe('evaluateDelta — open_pr (positive delta)', () => {
  it('positive delta above minimum → open_pr', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(60),
      policy: policy({ minimum: 0, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.action).toBe('open_pr');
    expect(r.delta).toBe(10);
    expect(r.preScore).toBe(50);
    expect(r.postScore).toBe(60);
    expect(r.isSubstantial).toBe(true);
    expect(r.prBanner).toBe('✅ Substantial improvement (+10)');
  });

  it('positive delta below substantial → open_pr with minor banner', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(53),
      policy: policy({ minimum: 0, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.action).toBe('open_pr');
    expect(r.delta).toBe(3);
    expect(r.isSubstantial).toBe(false);
    expect(r.prBanner).toBe('⚠️ Minor improvement (+3)');
  });

  it('negative delta with ALWAYS_OPEN policy → open_pr (if above minimumDelta)', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(48),
      policy: policy({ negative: 'ALWAYS_OPEN', minimum: -10, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.action).toBe('open_pr');
    expect(r.delta).toBe(-2);
    expect(r.isSubstantial).toBe(false);
    expect(r.prBanner).toBe('⚠️ Minor improvement (+-2)');
  });
});

// ── Branch 2: silent_close discarded_negative_delta ──────────────────────────

describe('evaluateDelta — silent_close discarded_negative_delta', () => {
  it('negative delta + DISCARD_ON_NEGATIVE → silent_close discarded_negative_delta', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(45),
      policy: policy({ negative: 'DISCARD_ON_NEGATIVE', minimum: 0, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.action).toBe('silent_close');
    expect(r.reason).toBe('discarded_negative_delta');
    expect(r.delta).toBe(-5);
    expect(r.preScore).toBe(50);
    expect(r.postScore).toBe(45);
    expect(r.isSubstantial).toBe(false);
    expect(r.prBanner).toBeUndefined();
  });

  it('DISCARD_ON_NEGATIVE fires BEFORE the minimumDelta check', () => {
    // Even though minimum = -10 would allow delta = -5 to pass the
    // minimum check, DISCARD_ON_NEGATIVE intercepts first. (The
    // cross-field constraint in migration 0014 prevents this combo
    // from being writeable, but the function still handles it safely.)
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(45),
      policy: policy({ negative: 'DISCARD_ON_NEGATIVE', minimum: -10, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.action).toBe('silent_close');
    expect(r.reason).toBe('discarded_negative_delta');
  });
});

// ── Branch 3: silent_close below_threshold ───────────────────────────────────

describe('evaluateDelta — silent_close below_threshold', () => {
  it('positive delta below minimum → silent_close below_threshold', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(52),
      policy: policy({ minimum: 3, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.action).toBe('silent_close');
    expect(r.reason).toBe('below_threshold');
    expect(r.delta).toBe(2);
  });

  it('zero delta with minimumDelta > 0 → silent_close below_threshold', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(50),
      policy: policy({ minimum: 1, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.action).toBe('silent_close');
    expect(r.reason).toBe('below_threshold');
    expect(r.delta).toBe(0);
  });

  it('zero delta with minimumDelta = 0 → open_pr (boundary: delta >= 0)', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(50),
      policy: policy({ minimum: 0, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.action).toBe('open_pr');
    expect(r.delta).toBe(0);
  });

  it('negative delta below minimum with ALWAYS_OPEN → silent_close below_threshold', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(45),
      policy: policy({ negative: 'ALWAYS_OPEN', minimum: 0, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.action).toBe('silent_close');
    expect(r.reason).toBe('below_threshold');
    expect(r.delta).toBe(-5);
  });
});

// ── isSubstantial boundary (spec C1 fix at cd07328: >= not >) ────────────────

describe('evaluateDelta — isSubstantial boundary (>=)', () => {
  it('delta exactly equal to substantialThreshold → isSubstantial = true', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(55),
      policy: policy({ minimum: 0, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.delta).toBe(5);
    expect(r.isSubstantial).toBe(true);
    expect(r.prBanner).toBe('✅ Substantial improvement (+5)');
  });

  it('delta one below substantialThreshold → isSubstantial = false', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(54),
      policy: policy({ minimum: 0, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.delta).toBe(4);
    expect(r.isSubstantial).toBe(false);
  });

  it('delta one above substantialThreshold → isSubstantial = true', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(56),
      policy: policy({ minimum: 0, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.delta).toBe(6);
    expect(r.isSubstantial).toBe(true);
  });

  it('isSubstantial is computed even on silent_close paths', () => {
    // Silent-close branches still report isSubstantial so the audit
    // surface is uniform.
    const r = evaluateDelta({
      preScore: scoreOf(50),
      postScore: scoreOf(58),
      policy: policy({ minimum: 10, substantial: 5 }),
      runId: RUN_ID,
      productId: PRODUCT_ID,
    });
    expect(r.action).toBe('silent_close');
    expect(r.reason).toBe('below_threshold');
    expect(r.delta).toBe(8);
    expect(r.isSubstantial).toBe(true); // 8 >= 5
  });
});

// ── HARD INVARIANT: auditEntry ALWAYS present ────────────────────────────────

describe('evaluateDelta — auditEntry HARD invariant', () => {
  const cases = [
    {
      label: 'open_pr substantial',
      args: {
        preScore: scoreOf(50), postScore: scoreOf(60),
        policy: policy({ minimum: 0, substantial: 5 }),
        runId: RUN_ID, productId: PRODUCT_ID,
      },
      expectedKind: 'self_renewal.delta_evaluated.v1',
    },
    {
      label: 'open_pr minor',
      args: {
        preScore: scoreOf(50), postScore: scoreOf(52),
        policy: policy({ minimum: 0, substantial: 5 }),
        runId: RUN_ID, productId: PRODUCT_ID,
      },
      expectedKind: 'self_renewal.delta_evaluated.v1',
    },
    {
      label: 'silent_close discarded_negative_delta',
      args: {
        preScore: scoreOf(50), postScore: scoreOf(45),
        policy: policy({ negative: 'DISCARD_ON_NEGATIVE', minimum: 0, substantial: 5 }),
        runId: RUN_ID, productId: PRODUCT_ID,
      },
      expectedKind: 'self_renewal.discarded_negative_delta.v1',
    },
    {
      label: 'silent_close below_threshold',
      args: {
        preScore: scoreOf(50), postScore: scoreOf(52),
        policy: policy({ minimum: 3, substantial: 5 }),
        runId: RUN_ID, productId: PRODUCT_ID,
      },
      expectedKind: 'self_renewal.below_threshold.v1',
    },
  ];

  it.each(cases)('$label — auditEntry present with correct kind', ({ args, expectedKind }) => {
    const r = evaluateDelta(args);
    expect(r.auditEntry).toBeDefined();
    expect(r.auditEntry.kind).toBe(expectedKind);
    expect(r.auditEntry.runId).toBe(RUN_ID);
    expect(r.auditEntry.productId).toBe(PRODUCT_ID);
    expect(r.auditEntry.preScore).toEqual(args.preScore);
    expect(r.auditEntry.postScore).toEqual(args.postScore);
    expect(r.auditEntry.delta).toBe(args.postScore.total - args.preScore.total);
    expect(r.auditEntry.policy).toEqual(args.policy);
  });

  it.each(cases)('$label — auditEntry.at is a valid ISO-8601 timestamp', ({ args }) => {
    const r = evaluateDelta(args);
    expect(typeof r.auditEntry.at).toBe('string');
    expect(r.auditEntry.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Number.isFinite(Date.parse(r.auditEntry.at))).toBe(true);
  });

  it('auditEntry is frozen (defense against caller mutation)', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50), postScore: scoreOf(60),
      policy: policy({ minimum: 0, substantial: 5 }),
      runId: RUN_ID, productId: PRODUCT_ID,
    });
    expect(Object.isFrozen(r.auditEntry)).toBe(true);
  });

  it('return value is frozen', () => {
    const r = evaluateDelta({
      preScore: scoreOf(50), postScore: scoreOf(60),
      policy: policy({ minimum: 0, substantial: 5 }),
      runId: RUN_ID, productId: PRODUCT_ID,
    });
    expect(Object.isFrozen(r)).toBe(true);
  });
});

// ── Score-object passthrough (preserve L1-L5 breakdown) ──────────────────────

describe('evaluateDelta — score breakdown preserved in audit', () => {
  it('preserves Five-Layer breakdown fields in auditEntry.preScore / postScore', () => {
    const pre = scoreOf(50, { l1: 10, l2: 9, l3: 11, l4: 10, l5: 10 });
    const post = scoreOf(60, { l1: 12, l2: 12, l3: 12, l4: 12, l5: 12 });
    const r = evaluateDelta({
      preScore: pre, postScore: post,
      policy: policy({ minimum: 0, substantial: 5 }),
      runId: RUN_ID, productId: PRODUCT_ID,
    });
    expect(r.auditEntry.preScore).toEqual(pre);
    expect(r.auditEntry.postScore).toEqual(post);
  });
});

// ── Input validation ─────────────────────────────────────────────────────────

describe('evaluateDelta — input validation', () => {
  it('throws on missing args', () => {
    expect(() => evaluateDelta()).toThrow(/args object required/);
    expect(() => evaluateDelta(null)).toThrow(/args object required/);
  });

  it('throws when preScore.total is not numeric', () => {
    expect(() => evaluateDelta({
      preScore: { total: 'fifty' },
      postScore: scoreOf(60),
      policy: policy(),
      runId: RUN_ID, productId: PRODUCT_ID,
    })).toThrow(/preScore\.total must be a number/);
  });

  it('throws when postScore.total is not numeric', () => {
    expect(() => evaluateDelta({
      preScore: scoreOf(50),
      postScore: null,
      policy: policy(),
      runId: RUN_ID, productId: PRODUCT_ID,
    })).toThrow(/postScore\.total must be a number/);
  });

  it('throws on invalid selfRenewalNegativeDeltaPolicy', () => {
    expect(() => evaluateDelta({
      preScore: scoreOf(50), postScore: scoreOf(60),
      policy: {
        selfRenewalNegativeDeltaPolicy: 'INVALID',
        selfRenewalMinimumDelta: 0,
        selfRenewalSubstantialThreshold: 5,
      },
      runId: RUN_ID, productId: PRODUCT_ID,
    })).toThrow(/selfRenewalNegativeDeltaPolicy must be/);
  });

  it('throws on non-numeric selfRenewalMinimumDelta', () => {
    expect(() => evaluateDelta({
      preScore: scoreOf(50), postScore: scoreOf(60),
      policy: { ...policy(), selfRenewalMinimumDelta: 'zero' },
      runId: RUN_ID, productId: PRODUCT_ID,
    })).toThrow(/selfRenewalMinimumDelta must be a number/);
  });

  it('throws on non-numeric selfRenewalSubstantialThreshold', () => {
    expect(() => evaluateDelta({
      preScore: scoreOf(50), postScore: scoreOf(60),
      policy: { ...policy(), selfRenewalSubstantialThreshold: undefined },
      runId: RUN_ID, productId: PRODUCT_ID,
    })).toThrow(/selfRenewalSubstantialThreshold must be a number/);
  });

  it('throws on missing runId', () => {
    expect(() => evaluateDelta({
      preScore: scoreOf(50), postScore: scoreOf(60),
      policy: policy(),
      productId: PRODUCT_ID,
    })).toThrow(/runId must be a non-empty string/);
  });

  it('throws on missing productId', () => {
    expect(() => evaluateDelta({
      preScore: scoreOf(50), postScore: scoreOf(60),
      policy: policy(),
      runId: RUN_ID,
    })).toThrow(/productId must be a non-empty string/);
  });
});

// ── Audit-kind constants ─────────────────────────────────────────────────────

describe('audit kind constants — versioned and stable', () => {
  it('exports correct topic strings', () => {
    expect(__internals.AUDIT_KIND_OPEN_PR).toBe('self_renewal.delta_evaluated.v1');
    expect(__internals.AUDIT_KIND_DISCARD_NEGATIVE).toBe('self_renewal.discarded_negative_delta.v1');
    expect(__internals.AUDIT_KIND_BELOW_THRESHOLD).toBe('self_renewal.below_threshold.v1');
  });

  it('valid negative-delta policies are the two enum members', () => {
    expect(__internals.VALID_NEGATIVE_DELTA_POLICIES.has('ALWAYS_OPEN')).toBe(true);
    expect(__internals.VALID_NEGATIVE_DELTA_POLICIES.has('DISCARD_ON_NEGATIVE')).toBe(true);
    expect(__internals.VALID_NEGATIVE_DELTA_POLICIES.size).toBe(2);
  });
});

// ── No external I/O ──────────────────────────────────────────────────────────

describe('evaluateDelta — pure function invariants', () => {
  it('produces no console output', () => {
    const logs = [];
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;
    console.log = (...a) => logs.push(['log', ...a]);
    console.warn = (...a) => logs.push(['warn', ...a]);
    console.error = (...a) => logs.push(['error', ...a]);
    try {
      evaluateDelta({
        preScore: scoreOf(50), postScore: scoreOf(60),
        policy: policy(),
        runId: RUN_ID, productId: PRODUCT_ID,
      });
    } finally {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
    }
    expect(logs).toEqual([]);
  });

  it('does not mutate input args', () => {
    const pre = scoreOf(50);
    const post = scoreOf(60);
    const p = policy();
    const preCopy = JSON.parse(JSON.stringify(pre));
    const postCopy = JSON.parse(JSON.stringify(post));
    const pCopy = JSON.parse(JSON.stringify(p));
    evaluateDelta({ preScore: pre, postScore: post, policy: p, runId: RUN_ID, productId: PRODUCT_ID });
    expect(pre).toEqual(preCopy);
    expect(post).toEqual(postCopy);
    expect(p).toEqual(pCopy);
  });
});
