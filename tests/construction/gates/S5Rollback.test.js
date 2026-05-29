// tests/construction/gates/S5Rollback.test.js
//
// CA-17 §3.5 conformance — S5 rollback substrate (NON-OVERRIDABLE).
// Covers snapshot + CAS + dry-run + retention bounds + auto-rollback
// pending-operator-confirm envelope.

import { describe, it, expect, vi } from 'vitest';
import {
  captureSnapshot,
  casCheck,
  dryRunRollback,
  prepareAutoRollback,
  runS5RollbackPreCommit,
  ROLLBACK_KIND,
  ROLLBACK_PENDING_KIND,
  ROLLBACK_DRY_RUN_FAILED_KIND,
  RETENTION_BOUNDS,
} from '../../../src/lib/construction/gates/S5Rollback.js';

describe('S5 — captureSnapshot', () => {
  it('hashes each file content with stub readFile', async () => {
    const readFile = vi.fn(async (p) => {
      if (p === 'api/wire/a.js') return 'aaa';
      if (p === 'api/wire/b.js') return 'bbb';
      return null;
    });
    const { snapshot } = await captureSnapshot({
      filePaths: ['api/wire/a.js', 'api/wire/b.js', 'api/wire/c-does-not-exist.js'],
      readFile,
    });
    expect(snapshot.files['api/wire/a.js'].existed).toBe(true);
    expect(snapshot.files['api/wire/a.js'].contentHash).toMatch(/^[a-f0-9]{16}$/);
    expect(snapshot.files['api/wire/c-does-not-exist.js'].existed).toBe(false);
    expect(snapshot.retention_days).toBe(RETENTION_BOUNDS.default);
  });

  it('S5-CT-7: retention 30 default; explicit 90 honored; out-of-bounds REJECTED', async () => {
    const readFile = async () => 'x';
    const a = await captureSnapshot({ filePaths: ['a.js'], readFile, retentionDays: 90 });
    expect(a.snapshot.retention_days).toBe(90);
    await expect(captureSnapshot({ filePaths: ['a.js'], readFile, retentionDays: 200 }))
      .rejects.toThrowError(/out of bounds/);
    await expect(captureSnapshot({ filePaths: ['a.js'], readFile, retentionDays: 7 }))
      .rejects.toThrowError(/out of bounds/);
  });
});

describe('S5 — casCheck drift detection', () => {
  it('returns ok when on-disk content matches snapshot', async () => {
    const readFile = async () => 'aaa';
    const { snapshot } = await captureSnapshot({ filePaths: ['a.js'], readFile });
    const result = await casCheck({ snapshot, readFile });
    expect(result.ok).toBe(true);
    expect(result.drifted).toEqual([]);
  });

  it('detects drift when file content changes after snapshot', async () => {
    let content = 'aaa';
    const readFile = async () => content;
    const { snapshot } = await captureSnapshot({ filePaths: ['a.js'], readFile });
    content = 'aaa-modified';
    const result = await casCheck({ snapshot, readFile });
    expect(result.ok).toBe(false);
    expect(result.drifted).toHaveLength(1);
    expect(result.drifted[0].path).toBe('a.js');
  });
});

describe('S5 — dryRunRollback', () => {
  it('skips cleanly when no executeRollback supplied', async () => {
    const r = await dryRunRollback({});
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(true);
  });

  it('passes when executeRollback returns ok', async () => {
    const r = await dryRunRollback({ executeRollback: async () => ({ ok: true }) });
    expect(r.ok).toBe(true);
    expect(r.executed).toBe(true);
  });

  it('S5-CT-8: real-execution failure surfaces construction_rollback_dry_run_failed.v1', async () => {
    await expect(dryRunRollback({
      executeRollback: async () => ({ ok: false, reason: 'missing_column', failure_mode: 'execution_failure' }),
    })).rejects.toMatchObject({
      code: ROLLBACK_DRY_RUN_FAILED_KIND,
      failure_mode: 'execution_failure',
    });
  });
});

describe('S5 — prepareAutoRollback envelope', () => {
  it('S5-CT-6: emits construction_auto_rollback_pending_operator_confirm.v1 with requires_operator_confirm true', () => {
    const envelope = prepareAutoRollback({
      snapshot: { files: { 'a.js': {} }, retention_days: 30 },
      phaseBFailure: { reason: 'new_high_severity_findings:2' },
      baselineHash: 'abcd1234',
    });
    expect(envelope.kind).toBe(ROLLBACK_PENDING_KIND);
    expect(envelope.requires_operator_confirm).toBe(true);
    expect(envelope.snapshot_summary.file_count).toBe(1);
    expect(envelope.phase_a_baseline_hash).toBe('abcd1234');
  });
});

describe('S5 — runS5RollbackPreCommit end-to-end', () => {
  it('persists envelope + skipped dry-run when no closure supplied', async () => {
    const writes = [];
    const append = vi.fn(async ({ entry }) => { writes.push(entry); });
    const result = await runS5RollbackPreCommit({
      productId: 'reltwin',
      filePaths: ['api/wire/x.js'],
      // No real fs read — stub it.
      // We pass a fake readFile via no-arg path so the default will
      // attempt fs.readFile and return null for the missing file. The
      // snapshot still captures the {existed:false} entry.
      appendGovernanceEntry: append,
    });
    expect(result.ok).toBe(true);
    expect(writes).toHaveLength(1);
    expect(writes[0].kind).toBe(ROLLBACK_KIND);
    expect(writes[0].dry_run.ok).toBe(true);
  });
});
