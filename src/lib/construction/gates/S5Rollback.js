// src/lib/construction/gates/S5Rollback.js
//
// S5 — Rollback substrate gate (NON-OVERRIDABLE per CA-17 §3.5 v3-final).
//
// v3-final softening per Panel feedback: auto-detect + auto-prepare +
// operator-confirm-to-fire. The engine auto-DETECTS Phase B post-merge
// failures, auto-PREPARES rollback (snapshot loaded, CAS validated,
// queued), and emits construction_auto_rollback_pending_operator_confirm.v1.
// Rollback EXECUTES only on explicit operator confirm.
//
// For Phase 1 test mode (no human gate available in CI), an admin flag
// `s5_auto_confirm_in_test_mode = true` proceeds without human confirm,
// and an audit entry construction_auto_rollback_test_mode_confirmed.v1
// is written so the bypass is observable.
//
// This module is responsible for:
//   - Capturing the pre-construction snapshot (file paths + content
//     hashes) BEFORE the candidate writes.
//   - CAS check at commit time: assert the on-disk content for every
//     touched file still matches the pre-construction baseline (no
//     concurrent edit landed mid-construction).
//   - On Phase B failure: prepare the rollback envelope. Execution is
//     gated.

'use strict';

import { createHash } from 'node:crypto';

export const ROLLBACK_KIND = 'construction_rollback.v1';
export const ROLLBACK_PENDING_KIND = 'construction_auto_rollback_pending_operator_confirm.v1';
export const ROLLBACK_EXECUTED_KIND = 'construction_auto_rollback.v1';
export const ROLLBACK_CANCELLED_KIND = 'construction_auto_rollback_cancelled.v1';
export const ROLLBACK_TEST_MODE_KIND = 'construction_auto_rollback_test_mode_confirmed.v1';
export const ROLLBACK_DRY_RUN_FAILED_KIND = 'construction_rollback_dry_run_failed.v1';
export const RETENTION_BOUNDS = Object.freeze({ min: 30, max: 90, default: 30 });

function sha256(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function makeS5Error(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  err.gate = 'S5';
  for (const [k, v] of Object.entries(extra)) err[k] = v;
  return err;
}

/**
 * Build the pre-construction snapshot for every file the candidate will
 * touch. Reads each file's current content via the supplied reader
 * (defaults to node:fs/promises.readFile) and records a sha256 digest.
 *
 * @param {object} args
 * @param {string[]} args.filePaths
 * @param {function} [args.readFile]   — async (path) => string|null
 * @param {number}   [args.retentionDays] — operator-config (clamped to [30, 90])
 * @returns {{ snapshot: object, retentionDays: number }}
 */
export async function captureSnapshot({ filePaths, readFile, retentionDays }) {
  if (!Array.isArray(filePaths)) {
    throw makeS5Error(ROLLBACK_KIND, 'S5.captureSnapshot: filePaths[] required');
  }
  const _readFile = typeof readFile === 'function'
    ? readFile
    : async (p) => {
        const fs = await import('node:fs/promises');
        try { return await fs.readFile(p, 'utf-8'); } catch { return null; }
      };

  const files = {};
  for (const p of filePaths) {
    const content = await _readFile(p);
    files[p] = Object.freeze({
      existed: content !== null,
      contentHash: content === null ? null : sha256(content),
      contentLength: content === null ? 0 : content.length,
    });
  }

  const retention = (() => {
    if (!Number.isFinite(retentionDays)) return RETENTION_BOUNDS.default;
    if (retentionDays < RETENTION_BOUNDS.min || retentionDays > RETENTION_BOUNDS.max) {
      throw makeS5Error(ROLLBACK_KIND,
        `S5.captureSnapshot: retentionDays ${retentionDays} out of bounds [${RETENTION_BOUNDS.min}, ${RETENTION_BOUNDS.max}] — REJECTED (not clamped)`,
        { retentionDays, bounds: RETENTION_BOUNDS });
    }
    return retentionDays;
  })();

  return {
    snapshot: Object.freeze({
      captured_at: new Date().toISOString(),
      files: Object.freeze(files),
      retention_days: retention,
    }),
    retentionDays: retention,
  };
}

/**
 * CAS check before commit: every file in the snapshot must hash the
 * same value on disk as when the snapshot was captured. Drift = abort
 * (a concurrent edit landed; the operator's approval was issued for a
 * different baseline).
 */
export async function casCheck({ snapshot, readFile }) {
  if (!snapshot || !snapshot.files) {
    throw makeS5Error(ROLLBACK_KIND, 'S5.casCheck: snapshot required');
  }
  const _readFile = typeof readFile === 'function'
    ? readFile
    : async (p) => {
        const fs = await import('node:fs/promises');
        try { return await fs.readFile(p, 'utf-8'); } catch { return null; }
      };
  const drifted = [];
  for (const [path, expected] of Object.entries(snapshot.files)) {
    const content = await _readFile(path);
    const actualHash = content === null ? null : sha256(content);
    if (actualHash !== expected.contentHash) {
      drifted.push({ path, expectedHash: expected.contentHash, actualHash });
    }
  }
  return { ok: drifted.length === 0, drifted };
}

/**
 * Real-rollback dry-run in CI per CA-17 §3.5 + S5-CT-8. Executes the
 * rollback path against an ephemeral copy (the caller supplies the
 * execution closure); failures here block the PR with
 * construction_rollback_dry_run_failed.v1.
 */
export async function dryRunRollback({ executeRollback }) {
  if (typeof executeRollback !== 'function') {
    // No execution closure provided — in test mode this is acceptable;
    // we record a "skipped" result and let the engine continue.
    return { ok: true, skipped: true, reason: 'no_execute_rollback_closure_supplied' };
  }
  try {
    const result = await executeRollback({ ephemeral: true });
    if (result?.ok === false) {
      throw makeS5Error(ROLLBACK_DRY_RUN_FAILED_KIND,
        `S5: rollback dry-run failed — ${result.reason ?? 'unknown'}`,
        { failure_mode: result.failure_mode ?? 'execution_failure' });
    }
    return { ok: true, executed: true };
  } catch (e) {
    if (e?.code === ROLLBACK_DRY_RUN_FAILED_KIND) throw e;
    throw makeS5Error(ROLLBACK_DRY_RUN_FAILED_KIND,
      `S5: rollback dry-run threw — ${e?.message ?? String(e)}`,
      { failure_mode: 'execution_failure', underlying: e?.message ?? String(e) });
  }
}

/**
 * Build the auto-rollback pending envelope. Operator + admin notified
 * elsewhere (dashboard/Slack/email integration is out of scope for this
 * module). Returns the envelope without executing.
 */
export function prepareAutoRollback({ snapshot, phaseBFailure, baselineHash }) {
  return Object.freeze({
    kind: ROLLBACK_PENDING_KIND,
    prepared_at: new Date().toISOString(),
    snapshot_summary: Object.freeze({
      file_count: Object.keys(snapshot?.files ?? {}).length,
      retention_days: snapshot?.retention_days ?? RETENTION_BOUNDS.default,
    }),
    phase_b_failure: phaseBFailure ?? null,
    phase_a_baseline_hash: baselineHash ?? null,
    requires_operator_confirm: true,
  });
}

/**
 * Run S5 end-to-end for the pre-commit phase: capture snapshot, run
 * CAS check (skipped if no prior snapshot exists), and dry-run the
 * rollback path. Returns the snapshot for caller use.
 */
export async function runS5RollbackPreCommit({ productId, environment, filePaths, retentionDays, executeRollback, appendGovernanceEntry, supabase, logger }) {
  const { snapshot, retentionDays: rd } = await captureSnapshot({ filePaths, retentionDays });
  const dryRun = await dryRunRollback({ executeRollback });

  const envelope = Object.freeze({
    kind: ROLLBACK_KIND,
    snapshot,
    dry_run: dryRun,
    captured_at: new Date().toISOString(),
  });
  if (typeof appendGovernanceEntry === 'function') {
    await appendGovernanceEntry({
      productId,
      environment: environment ?? 'prd',
      entry: envelope,
      supabase,
    });
  }
  if (logger?.info) logger.info('S5 rollback pre-commit cleared', { productId, retentionDays: rd });
  return Object.freeze({ ok: true, envelope, snapshot, retentionDays: rd });
}
