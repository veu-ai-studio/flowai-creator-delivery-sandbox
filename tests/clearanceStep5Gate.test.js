// tests/clearanceStep5Gate.test.js
//
// §11 Clearance Step 5 four-prerequisite gate (P1-3, DISPATCH 28).

import { describe, it, expect } from 'vitest';
import {
  checkClearanceStep5,
  checkClearanceStep5FromSsot,
  hasTerminalDecision,
  blockedByToHumanReasons,
} from '../src/lib/governance/clearanceStep5Gate.js';

describe('hasTerminalDecision', () => {
  it('recognises canonical terminal decisions per §6', () => {
    expect(hasTerminalDecision({ terminalDecision: 'resolved' })).toBe(true);
    expect(hasTerminalDecision({ terminalDecision: 'human-gated' })).toBe(true);
    expect(hasTerminalDecision({ terminalDecision: 'human_gated' })).toBe(true);
    expect(hasTerminalDecision({ terminalDecision: 'documented' })).toBe(true);
    expect(hasTerminalDecision({ terminalDecision: 'documented-limitation' })).toBe(true);
  });

  it('falls back to .decision / .status / .resolution', () => {
    expect(hasTerminalDecision({ decision: 'RESOLVED' })).toBe(true);
    expect(hasTerminalDecision({ status: 'Documented' })).toBe(true);
    expect(hasTerminalDecision({ resolution: 'human-gated' })).toBe(true);
  });

  it('rejects non-terminal / unknown states', () => {
    expect(hasTerminalDecision({ terminalDecision: 'pending' })).toBe(false);
    expect(hasTerminalDecision({ terminalDecision: '' })).toBe(false);
    expect(hasTerminalDecision({})).toBe(false);
    expect(hasTerminalDecision(null)).toBe(false);
    expect(hasTerminalDecision(undefined)).toBe(false);
  });
});

describe('checkClearanceStep5 — happy path', () => {
  it('all four prerequisites satisfied → allowed', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { score: 97, counts: { critical: 0, high: 0, medium: 1, low: 2 } },
      findings: [
        { severity: 'high', terminalDecision: 'resolved' },
        { severity: 'critical', terminalDecision: 'documented' },
        { severity: 'medium' },                                  // not evaluated
      ],
      limitationsPublished: true,
    });
    expect(v.allowed).toBe(true);
    expect(v.blockedBy).toEqual([]);
    expect(v.details.a_report_exists).toBe(true);
    expect(v.details.b_score_pass).toBe(true);
    expect(v.details.b_zero_critical).toBe(true);
    expect(v.details.c_terminal_decisions).toBe(true);
    expect(v.details.d_limitations_published).toBe(true);
  });
});

describe('checkClearanceStep5 — (a) GTM Readiness Report exists', () => {
  it('blocks when report is null', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: null, findings: [], limitationsPublished: true,
    });
    expect(v.allowed).toBe(false);
    expect(v.blockedBy).toContain('a_no_gtm_readiness_report');
    expect(v.details.a_report_exists).toBe(false);
  });

  it('blocks when report has no numeric score', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { counts: { critical: 0 } },           // no score
      limitationsPublished: true,
    });
    expect(v.allowed).toBe(false);
    expect(v.blockedBy).toContain('a_no_gtm_readiness_report');
  });
});

describe('checkClearanceStep5 — (b) score ≥ minScore AND zero critical', () => {
  it('blocks when score < minScore (default 95)', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { score: 80, counts: { critical: 0, high: 0, medium: 0, low: 0 } },
      limitationsPublished: true,
    });
    expect(v.allowed).toBe(false);
    expect(v.blockedBy.some((c) => c.startsWith('b_score_below_min:'))).toBe(true);
    expect(v.details.b_score_pass).toBe(false);
  });

  it('blocks when ≥1 critical finding is open even at score 95+', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { score: 95, counts: { critical: 1, high: 0, medium: 0, low: 0 } },
      limitationsPublished: true,
    });
    expect(v.allowed).toBe(false);
    expect(v.blockedBy).toContain('b_critical_open:1');
    expect(v.details.b_zero_critical).toBe(false);
  });

  it('accepts a custom minScore via options', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { score: 80, counts: { critical: 0 } },
      limitationsPublished: true,
      options: { minScore: 75 },
    });
    // Score 80 ≥ 75 passes (b); other criteria need findings/limitations.
    expect(v.details.b_score_pass).toBe(true);
    expect(v.details.b_zero_critical).toBe(true);
    expect(v.allowed).toBe(true);
  });

  it('CA-13 directive: minScore defaults to 95', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { score: 94, counts: { critical: 0 } },
      limitationsPublished: true,
    });
    expect(v.details.minScore).toBe(95);
    expect(v.details.b_score_pass).toBe(false);
    expect(v.blockedBy.some((c) => c === 'b_score_below_min:94<95')).toBe(true);
  });
});

describe('checkClearanceStep5 — (c) terminal decisions on findings ≥ high', () => {
  it('blocks when a high finding has no terminal decision', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { score: 98, counts: { critical: 0 } },
      findings: [
        { severity: 'high' },                                     // no decision
        { severity: 'critical', terminalDecision: 'resolved' },
      ],
      limitationsPublished: true,
    });
    expect(v.allowed).toBe(false);
    expect(v.blockedBy).toContain('c_unresolved_findings:1');
  });

  it('blocks when a critical finding has no terminal decision', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { score: 98, counts: { critical: 0 } },
      findings: [{ severity: 'critical' }],
      limitationsPublished: true,
    });
    expect(v.allowed).toBe(false);
    expect(v.blockedBy).toContain('c_unresolved_findings:1');
  });

  it('ignores findings < high (medium/low don\'t gate Step 5 per §7.6)', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { score: 98, counts: { critical: 0 } },
      findings: [
        { severity: 'medium' },                                   // no decision needed
        { severity: 'low' },                                      // no decision needed
      ],
      limitationsPublished: true,
    });
    expect(v.allowed).toBe(true);
    expect(v.details.c_terminal_decisions).toBe(true);
  });

  it('empty findings list → (c) passes', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { score: 100, counts: { critical: 0 } },
      findings: [], limitationsPublished: true,
    });
    expect(v.details.c_terminal_decisions).toBe(true);
  });
});

describe('checkClearanceStep5 — (d) LIMITATIONS published', () => {
  it('blocks when limitations not published', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { score: 100, counts: { critical: 0 } },
      findings: [], limitationsPublished: false,
    });
    expect(v.allowed).toBe(false);
    expect(v.blockedBy).toContain('d_limitations_not_published');
  });

  it('accepts limitationsPublished: true', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { score: 100, counts: { critical: 0 } },
      findings: [], limitationsPublished: true,
    });
    expect(v.details.d_limitations_published).toBe(true);
    expect(v.allowed).toBe(true);
  });
});

describe('checkClearanceStep5 — composite failure modes', () => {
  it('all four blockers reported when nothing satisfied', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: null, findings: [{ severity: 'critical' }], limitationsPublished: false,
    });
    expect(v.allowed).toBe(false);
    expect(v.blockedBy).toContain('a_no_gtm_readiness_report');
    expect(v.blockedBy).toContain('b_no_score_to_evaluate');
    expect(v.blockedBy).toContain('c_unresolved_findings:1');
    expect(v.blockedBy).toContain('d_limitations_not_published');
  });

  it('does not throw on missing args bag', () => {
    expect(() => checkClearanceStep5()).not.toThrow();
    const v = checkClearanceStep5();
    expect(v.allowed).toBe(false);
    expect(v.blockedBy.length).toBeGreaterThanOrEqual(3);          // (a), (b), (d) — (c) passes with empty findings
  });
});

describe('checkClearanceStep5FromSsot — adapter to product_ssot row', () => {
  it('extracts the most-recent gtm_readiness_score entry from governance_record', () => {
    const ssotRow = {
      governance_record: [
        { kind: 'human_gate', at: 'T1', payload: { decision: 'approve' } },
        { kind: 'gtm_readiness_score', at: 'T2', score: 70, counts: { critical: 2 } },
        { kind: 'gtm_readiness_score', at: 'T3', score: 97, counts: { critical: 0, high: 0, medium: 1, low: 2 } },
        { kind: 'limitations_published', at: 'T4' },
      ],
      delta_log: [],
    };
    const v = checkClearanceStep5FromSsot(ssotRow);
    expect(v.allowed).toBe(true);
    expect(v.details.score).toBe(97);
    expect(v.details.criticalCount).toBe(0);
    expect(v.details.d_limitations_published).toBe(true);
  });

  it('accepts score in payload (alternate shape)', () => {
    const ssotRow = {
      governance_record: [
        { kind: 'gtm_readiness_score', at: 'T1', payload: { score: 96, counts: { critical: 0 } } },
        { kind: 'limitations_published' },
      ],
      delta_log: [],
    };
    const v = checkClearanceStep5FromSsot(ssotRow);
    expect(v.allowed).toBe(true);
    expect(v.details.score).toBe(96);
  });

  it('extracts findings from delta_log.issue + delta_log.findings[]', () => {
    const ssotRow = {
      governance_record: [
        { kind: 'gtm_readiness_score', score: 100, counts: { critical: 0 } },
        { kind: 'limitations_published' },
      ],
      delta_log: [
        { entryId: 'd1', issue: { severity: 'high' } },               // no decision — should block
        { entryId: 'd2', findings: [
          { severity: 'critical', terminalDecision: 'resolved' },
          { severity: 'medium' },
        ]},
      ],
    };
    const v = checkClearanceStep5FromSsot(ssotRow);
    expect(v.allowed).toBe(false);
    expect(v.blockedBy).toContain('c_unresolved_findings:1');
  });

  it('honours top-level limitations_published column when present', () => {
    const ssotRow = {
      governance_record: [{ kind: 'gtm_readiness_score', score: 100, counts: { critical: 0 } }],
      delta_log: [],
      limitations_published: true,
    };
    const v = checkClearanceStep5FromSsot(ssotRow);
    expect(v.allowed).toBe(true);
  });

  it('null/undefined row → returns blocked envelope without throwing', () => {
    expect(checkClearanceStep5FromSsot(null).allowed).toBe(false);
    expect(checkClearanceStep5FromSsot(undefined).allowed).toBe(false);
    expect(checkClearanceStep5FromSsot({}).allowed).toBe(false);
  });

  it('passes options through (minScore override)', () => {
    const ssotRow = {
      governance_record: [
        { kind: 'gtm_readiness_score', score: 80, counts: { critical: 0 } },
        { kind: 'limitations_published' },
      ],
      delta_log: [],
    };
    const v75 = checkClearanceStep5FromSsot(ssotRow, { minScore: 75 });
    const v95 = checkClearanceStep5FromSsot(ssotRow, { minScore: 95 });
    expect(v75.allowed).toBe(true);
    expect(v95.allowed).toBe(false);
  });
});

describe('blockedByToHumanReasons', () => {
  it('translates each blocker code to a human reason', () => {
    const v = checkClearanceStep5({
      gtmReadinessReport: { score: 50, counts: { critical: 2 } },
      findings: [{ severity: 'critical' }, { severity: 'high' }],
      limitationsPublished: false,
    });
    const reasons = blockedByToHumanReasons(v);
    expect(reasons.length).toBe(v.blockedBy.length);
    expect(reasons.some((r) => /score is 50/.test(r))).toBe(true);
    expect(reasons.some((r) => /critical finding/.test(r))).toBe(true);
    expect(reasons.some((r) => /high\/critical finding/.test(r))).toBe(true);
    expect(reasons.some((r) => /LIMITATIONS/.test(r))).toBe(true);
  });

  it('returns empty array on non-verdict input', () => {
    expect(blockedByToHumanReasons(null)).toEqual([]);
    expect(blockedByToHumanReasons({})).toEqual([]);
  });
});
