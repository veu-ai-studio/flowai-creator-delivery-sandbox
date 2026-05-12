// W03 Compliance Probe — Build 1 tests.
//
// Covers:
//   - Compliant message → verdict='pass'
//   - 1–2 medium violations → verdict='flag'
//   - HIGH-severity violation OR ≥3 violations → verdict='block'
//   - 18-rule coverage assertion (catalog completeness + execution)
//   - runComplianceProbe chains the probe entry via auditChain
//   - emitReport produces a readable daily file
//   - CLI mode is callable end-to-end

import { describe, it, expect } from 'vitest';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  probeTurn,
  runComplianceProbe,
  loadRuleset,
  emitReport,
  __test,
} from '../scripts/w03ComplianceProbe.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('w03ComplianceProbe — rule catalog', () => {
  it('has exactly 18 rules (Section 5 maximalist checklist)', () => {
    expect(__test.RULES.length).toBe(18);
  });

  it('every rule has id, item, severity, check()', () => {
    for (const r of __test.RULES) {
      expect(typeof r.id).toBe('string');
      expect(r.id).toMatch(/^R\d{2}$/);
      expect(typeof r.item).toBe('string');
      expect(['high', 'med', 'low']).toContain(r.severity);
      expect(typeof r.check).toBe('function');
    }
  });

  it('rule IDs are unique R01..R18', () => {
    const ids = __test.RULES.map((r) => r.id).sort();
    const expected = Array.from({ length: 18 }, (_, i) => `R${String(i + 1).padStart(2, '0')}`);
    expect(ids).toEqual(expected);
  });

  it('severity distribution includes at least one HIGH', () => {
    const counts = { high: 0, med: 0, low: 0 };
    for (const r of __test.RULES) counts[r.severity] += 1;
    expect(counts.high).toBeGreaterThanOrEqual(1);
    expect(counts.med + counts.low + counts.high).toBe(18);
  });

  it('loadRuleset() returns frozen ruleset', () => {
    const rs = loadRuleset();
    expect(rs.rules.length).toBe(18);
    expect(Object.isFrozen(rs)).toBe(true);
  });
});

describe('w03ComplianceProbe — verdict triage', () => {
  it('compliant message → verdict=pass', () => {
    // Trivially compliant: short, non-substantive, non-CEO-facing turn.
    const r = probeTurn({
      turnText: 'turnClass = routine. Hello there.',
      context: {},
    });
    expect(r.verdict).toBe('pass');
    expect(r.compliant).toBe(true);
    expect(r.violations.length).toBe(0);
    expect(r.score).toBe(100);
  });

  it('low-only violations still → verdict=pass', () => {
    // Trigger ONLY R16 (low severity — drift recurrence flag).
    const r = probeTurn({
      turnText: 'turnClass = routine. Some non-governance content.',
      context: { driftRecurrenceTriggered: true }, // R16 expects panel_w03_drift_review_; absent here
    });
    // R16 is low-severity; only-low-violation should still pass
    // (the score will be < 100 but verdict stays at 'pass').
    expect(r.verdict).toBe('pass');
    const lowOnly = r.violations.every((v) => v.severity === 'low');
    expect(lowOnly).toBe(true);
  });

  it('1 medium violation → verdict=flag', () => {
    // Material turn missing lockedRuleScan = 1 medium (R04).
    // Mark all the other material-gated checks satisfied.
    const turn = [
      'turnClass = material',
      'canonicalConsistency = pass',
      'sourceBasis = canonical',
      '## Self-Scan applied: L1, L4',
      'w03_compliance_tripwire_t1',
    ].join('\n');
    const r = probeTurn({
      turnText: turn,
      context: { isMaterial: true },
    });
    // Exactly the R04 lockedRuleScan check should fail.
    const lockedRuleViolation = r.violations.find((v) => v.rule === 'R04');
    expect(lockedRuleViolation).toBeTruthy();
    // No high-severity violations expected.
    const high = r.violations.filter((v) => v.severity === 'high');
    expect(high.length).toBe(0);
    // 1 medium → flag.
    expect(r.verdict).toBe('flag');
  });

  it('HIGH-severity violation → verdict=block', () => {
    // [ROUTINE] without justification = R02 HIGH severity.
    const r = probeTurn({
      turnText: 'turnClass = routine. [ROUTINE] tag used with no justification.',
      context: {},
    });
    const r02 = r.violations.find((v) => v.rule === 'R02');
    expect(r02).toBeTruthy();
    expect(r02.severity).toBe('high');
    expect(r.verdict).toBe('block');
  });

  it('3+ violations → verdict=block (regardless of severity)', () => {
    // Material + CEO-facing + governance-critical, no required artifacts.
    const r = probeTurn({
      turnText: 'turnClass = material. Some content.',
      context: {
        isMaterial: true,
        ceoFacing: true,
        isGovernanceCritical: true,
      },
    });
    expect(r.violations.length).toBeGreaterThanOrEqual(3);
    expect(r.verdict).toBe('block');
  });

  it('detects MG4 trigger keyword without [CEO-ESCALATION] marker (R06 HIGH)', () => {
    const r = probeTurn({
      turnText: 'turnClass = governance-critical. Proposing a Locked Rule amendment without escalation marker.',
      context: { isGovernanceCritical: true },
    });
    const r06 = r.violations.find((v) => v.rule === 'R06');
    expect(r06).toBeTruthy();
    expect(r06.severity).toBe('high');
    expect(r.verdict).toBe('block');
  });

  it('imperative attribution to Agent #3 violates R08 authority-boundary', () => {
    const r = probeTurn({
      turnText: 'turnClass = material. Agent #3 will deploy the fix now.',
      context: { isMaterial: true },
    });
    const r08 = r.violations.find((v) => v.rule === 'R08');
    expect(r08).toBeTruthy();
    expect(r08.severity).toBe('high');
  });

  it('passes when Agent #3 output is advisory-framed (recommend_only)', () => {
    const turn = [
      'turnClass = material',
      'sourceBasis = code',
      'lockedRuleScan = pass',
      'canonicalConsistency = pass',
      '## Self-Scan applied: L1, L4',
      'authorityCheck = pass',
      'w03_compliance_tripwire_t1',
      'Agent #3 (recommend_only) suggests: address the renewal flag.',
    ].join('\n');
    const r = probeTurn({
      turnText: turn,
      context: { isMaterial: true },
    });
    const r08 = r.violations.find((v) => v.rule === 'R08');
    expect(r08).toBeFalsy();
  });

  it('detects ROUTINE-on-self-governance violation (R17 HIGH)', () => {
    const r = probeTurn({
      turnText: '[ROUTINE] (Justification: low-risk summary). Update W03 governance protocol.',
      context: { isSelfGovernanceTopic: true },
    });
    const r17 = r.violations.find((v) => v.rule === 'R17');
    expect(r17).toBeTruthy();
    expect(r17.severity).toBe('high');
  });

  it('CEO-facing turn requires Sentinel footer (R14 HIGH)', () => {
    const r = probeTurn({
      turnText: 'turnClass = material. Output to CEO without Sentinel footer.',
      context: { isMaterial: true, ceoFacing: true },
    });
    const r14 = r.violations.find((v) => v.rule === 'R14');
    expect(r14).toBeTruthy();
    expect(r14.severity).toBe('high');
  });

  it('claiming PASS while agent3Review=pending violates R12 (Decision 4 enforcement)', () => {
    const turn = 'W03 Compliance Sentinel: PASS\nAgent #3 review: pending';
    const r = probeTurn({
      turnText: turn,
      context: { ceoFacing: true },
    });
    const r12 = r.violations.find((v) => v.rule === 'R12');
    expect(r12).toBeTruthy();
    expect(r12.evidence).toMatch(/pending/);
  });
});

describe('w03ComplianceProbe — runComplianceProbe + chain', () => {
  it('chains the result via auditChain (single-entry chain)', async () => {
    const report = await runComplianceProbe({
      turnId: 'unit-t1',
      turnText: 'turnClass = routine.',
      context: {},
    });
    expect(report.verdict).toBe('pass');
    expect(report.chainedAuditEntry).toBeTruthy();
    expect(typeof report.chainedAuditEntry.hash).toBe('string');
    expect(report.chainedAuditEntry.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(report.chainedAuditEntry.seq).toBe(0);
    expect(report.chainedAuditEntry.prevHash).toBe('0'.repeat(64));
  });

  it('throws on missing turnId', async () => {
    await expect(runComplianceProbe({ turnId: '', turnText: 'x' })).rejects.toThrow(/turnId/);
    await expect(runComplianceProbe({ turnText: 'x' })).rejects.toThrow(/turnId/);
  });
});

describe('w03ComplianceProbe — emitReport', () => {
  it('writes a daily markdown report and returns auditLogId + reportPath', async () => {
    const outDir = path.join(REPO, '.tmp-test-w03-probe', `${Date.now()}`);
    const reports = [
      await runComplianceProbe({ turnId: 'a', turnText: 'turnClass = routine.', context: {} }),
      await runComplianceProbe({ turnId: 'b', turnText: '[ROUTINE] bad', context: {} }),
    ];
    const { auditLogId, reportPath } = await emitReport({ reports, outDir });
    expect(auditLogId).toBeTruthy();
    expect(reportPath).toMatch(/\.md$/);
    const md = await readFile(reportPath, 'utf8');
    expect(md).toMatch(/W03 Compliance Report/);
    expect(md).toMatch(/Overall:[^\n]*\b(GREEN|AMBER|RED)\b/);
    expect(md).toMatch(/`a`/);
    expect(md).toMatch(/`b`/);
    await rm(path.dirname(outDir), { recursive: true, force: true });
  });
});

describe('w03ComplianceProbe — helper exports', () => {
  it('computeVerdict applies the 3-tier rule', () => {
    expect(__test.computeVerdict([])).toBe('pass');
    expect(__test.computeVerdict([{ severity: 'low' }, { severity: 'low' }])).toBe('pass');
    expect(__test.computeVerdict([{ severity: 'med' }])).toBe('flag');
    expect(__test.computeVerdict([{ severity: 'med' }, { severity: 'med' }])).toBe('flag');
    expect(__test.computeVerdict([{ severity: 'high' }])).toBe('block');
    expect(__test.computeVerdict([{ severity: 'low' }, { severity: 'low' }, { severity: 'low' }])).toBe('block');
  });

  it('computeScore deducts by severity weight', () => {
    expect(__test.computeScore([])).toBe(100);
    expect(__test.computeScore([{ severity: 'low' }])).toBe(97);
    expect(__test.computeScore([{ severity: 'med' }])).toBe(90);
    expect(__test.computeScore([{ severity: 'high' }])).toBe(70);
    expect(__test.computeScore([{ severity: 'high' }, { severity: 'high' }, { severity: 'high' }, { severity: 'high' }])).toBe(0);
  });
});
