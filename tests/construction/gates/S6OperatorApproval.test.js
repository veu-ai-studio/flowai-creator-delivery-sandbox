// tests/construction/gates/S6OperatorApproval.test.js
//
// CA-17 §3.6 conformance — S6 admin approval (NON-OVERRIDABLE).
// Covers S6-CT-1..S6-CT-8 incl. v3-final narrow in-flight invalidation.

import { describe, it, expect, vi } from 'vitest';
import {
  validateRationale,
  checkInFlightInvalidation,
  runS6OperatorApproval,
  APPROVAL_KIND,
  APPROVAL_RATIONALE_FAILURE_KIND,
  APPROVAL_INVALIDATED_KIND,
  APPROVAL_INSUFFICIENT_ROLE_KIND,
  APPROVAL_STALE_KIND,
  FRESH_WINDOW_MS,
  MATERIAL_CHANGE_KINDS,
} from '../../../src/lib/construction/gates/S6OperatorApproval.js';

describe('S6 — rationale quality', () => {
  it('rejects rationale shorter than 60 chars', () => {
    expect(validateRationale('lgtm').ok).toBe(false);
    expect(validateRationale('looks good to me, ship it').ok).toBe(false);
  });

  it('rejects pure stop-word rationale even when long enough', () => {
    expect(validateRationale('approved').ok).toBe(false);
  });

  it('accepts substantive rationale >=60 chars', () => {
    const r = validateRationale('Phase 1 wire_up construction proof-of-concept test mode auto-approval — audit trail preserved for downstream review.');
    expect(r.ok).toBe(true);
  });

  it('rejects rationale that is majority stop-words even with length', () => {
    const r = validateRationale('lgtm ok yes sure okay approved please thanks good go go go go go padding');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('majority_stop_words');
  });
});

describe('S6 — narrow in-flight invalidation (v3-final closed 6-kind list)', () => {
  it('canonical material-change kind list matches CA-17 §3.6', () => {
    expect(MATERIAL_CHANGE_KINDS).toContain('construction_pre_baseline.v1');
    expect(MATERIAL_CHANGE_KINDS).toContain('architecture_snapshot.v1');
    expect(MATERIAL_CHANGE_KINDS).toContain('gtm_bar_admin_override.v1');
    expect(MATERIAL_CHANGE_KINDS).toContain('gtm_bar_admin_override_used.v1');
    expect(MATERIAL_CHANGE_KINDS).toContain('construction_class.v1');
    expect(MATERIAL_CHANGE_KINDS).toContain('purpose_drift_annotation.v1:critical');
  });

  it('S6-CT-8 part A: score_history entry does NOT invalidate', () => {
    const approval = { granted_at: '2026-05-19T10:00:00Z' };
    const recent = [{ kind: 'score_history.v1', captured_at: '2026-05-19T10:05:00Z' }];
    expect(checkInFlightInvalidation({ approval, recentEntries: recent })).toBe(null);
  });

  it('S6-CT-8 part B: architecture_snapshot.v1 INVALIDATES', () => {
    const approval = { granted_at: '2026-05-19T10:00:00Z' };
    const recent = [{ kind: 'architecture_snapshot.v1', captured_at: '2026-05-19T10:05:00Z' }];
    const r = checkInFlightInvalidation({ approval, recentEntries: recent });
    expect(r).not.toBe(null);
    expect(r.invalidating_kind).toBe('architecture_snapshot.v1');
  });

  it('purpose_drift_annotation.v1 with severity:critical invalidates; non-critical does not', () => {
    const approval = { granted_at: '2026-05-19T10:00:00Z' };
    const critical = [{ kind: 'purpose_drift_annotation.v1', severity: 'critical', captured_at: '2026-05-19T10:05:00Z' }];
    const noncrit = [{ kind: 'purpose_drift_annotation.v1', severity: 'low', captured_at: '2026-05-19T10:05:00Z' }];
    expect(checkInFlightInvalidation({ approval, recentEntries: critical })?.invalidating_kind).toBe('purpose_drift_annotation.v1:critical');
    expect(checkInFlightInvalidation({ approval, recentEntries: noncrit })).toBe(null);
  });

  it('entries before approval grant time do NOT invalidate', () => {
    const approval = { granted_at: '2026-05-19T10:00:00Z' };
    const earlier = [{ kind: 'architecture_snapshot.v1', captured_at: '2026-05-19T09:55:00Z' }];
    expect(checkInFlightInvalidation({ approval, recentEntries: earlier })).toBe(null);
  });
});

describe('S6 — runS6OperatorApproval end-to-end', () => {
  const RATIONALE = 'Phase 1 wire_up construction proof-of-concept test mode auto-approval — audit trail preserved for downstream review.';
  const now = () => new Date('2026-05-19T10:00:00Z').getTime();

  it('happy path: admin role + fresh + substantive rationale clears with envelope persisted', async () => {
    const writes = [];
    const append = vi.fn(async ({ entry }) => { writes.push(entry); });
    const result = await runS6OperatorApproval({
      productId: 'reltwin',
      constructionClass: 'wire_up',
      approval: {
        operator: 'admin-1',
        role: 'admin',
        rationale: RATIONALE,
        granted_at: '2026-05-19T09:55:00Z', // 5 min ago
      },
      baselineHash: 'abcd1234',
      appendGovernanceEntry: append,
      now,
    });
    expect(result.ok).toBe(true);
    expect(writes).toHaveLength(1);
    expect(writes[0].kind).toBe(APPROVAL_KIND);
    expect(writes[0].rationale_length).toBe(RATIONALE.length);
  });

  it('rejects when role !== admin', async () => {
    await expect(runS6OperatorApproval({
      productId: 'reltwin',
      constructionClass: 'wire_up',
      approval: { operator: 'op-1', role: 'operator', rationale: RATIONALE, granted_at: '2026-05-19T09:55:00Z' },
      baselineHash: 'x',
      appendGovernanceEntry: vi.fn(),
      now,
    })).rejects.toMatchObject({ code: APPROVAL_INSUFFICIENT_ROLE_KIND });
  });

  it('rejects when approval older than 15-min freshness window', async () => {
    await expect(runS6OperatorApproval({
      productId: 'reltwin',
      constructionClass: 'wire_up',
      approval: { operator: 'a', role: 'admin', rationale: RATIONALE, granted_at: '2026-05-19T09:30:00Z' }, // 30 min ago
      baselineHash: 'x',
      appendGovernanceEntry: vi.fn(),
      now,
    })).rejects.toMatchObject({ code: APPROVAL_STALE_KIND });
  });

  it('rejects bad rationale with construction_rationale_quality_failure.v1', async () => {
    await expect(runS6OperatorApproval({
      productId: 'reltwin',
      constructionClass: 'wire_up',
      approval: { operator: 'a', role: 'admin', rationale: 'lgtm', granted_at: '2026-05-19T09:55:00Z' },
      baselineHash: 'x',
      appendGovernanceEntry: vi.fn(),
      now,
    })).rejects.toMatchObject({ code: APPROVAL_RATIONALE_FAILURE_KIND });
  });

  it('emits construction_approval_invalidated_by_context_change.v1 when materially-changing kind lands mid-flight', async () => {
    const writes = [];
    const append = vi.fn(async ({ entry }) => { writes.push(entry); });
    await expect(runS6OperatorApproval({
      productId: 'reltwin',
      constructionClass: 'wire_up',
      approval: { operator: 'a', role: 'admin', rationale: RATIONALE, granted_at: '2026-05-19T09:55:00Z' },
      baselineHash: 'x',
      recentEntries: [{ kind: 'architecture_snapshot.v1', captured_at: '2026-05-19T09:57:00Z' }],
      appendGovernanceEntry: append,
      now,
    })).rejects.toMatchObject({ code: APPROVAL_INVALIDATED_KIND });
    expect(writes[0].kind).toBe(APPROVAL_INVALIDATED_KIND);
  });

  it('test-mode auto-approve synthesizes admin approval with audit flag', async () => {
    const writes = [];
    const append = vi.fn(async ({ entry }) => { writes.push(entry); });
    const result = await runS6OperatorApproval({
      productId: 'reltwin',
      constructionClass: 'wire_up',
      approval: null,
      baselineHash: 'abcd1234',
      testModeAutoApprove: true,
      appendGovernanceEntry: append,
      now,
    });
    expect(result.ok).toBe(true);
    expect(result.autoApproved).toBe(true);
    expect(writes[0].test_mode_auto_approved).toBe(true);
  });
});
