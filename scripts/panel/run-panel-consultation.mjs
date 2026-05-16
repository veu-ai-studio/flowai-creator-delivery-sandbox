// scripts/panel/run-panel-consultation.mjs
//
// W6 Panel workstream — canonical Panel consultation runner library.
//
// Every Panel consultation under W6 routes through this module's
// runPanelConsultationWithBackups() function. Provides:
//   - 10-slot LIVE Panel composition (REBALANCED 2026-05-14 — see
//     ./slot-config.mjs and docs/panel-consultations/PANEL_COMPOSITION_
//     REBALANCE_2026-05-14.md). Composition imported from slot-config.mjs;
//     single source of truth.
//   - Per-slot backup-adapter retry logic. Every primary slot has a
//     provider-different backup declared in slot-config.mjs. On primary
//     degradation (timeout, error, null output), the backup fires and
//     the slot returns ONE envelope marked slot_backup_applied=true.
//     No double-counting.
//   - Library function exported for use by per-consultation wrappers
//     (e.g., scripts/panel/run-w6-structural-validation.mjs).
//
// Authority: W6 Operating Brief (docs/W6_OPERATING_BRIEF.md). Per
// brief standing rules: every consultation must attach full
// CANONICAL_REFERENCE.md as context; sessions without SSOT attached
// are invalid.
//
// NOT a CLI by default. Per-consultation wrappers build the artifact +
// criteria + question structure and call runPanelConsultationWithBackups().
// A small CLI mode is wired for ad-hoc invocation with --artifact-file +
// --criteria-file flags.

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { peerReview } from '../lib/peer-review.mjs';
import { SLOT_CONFIG, PANEL as SLOT_CONFIG_PANEL } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

// ─────────────────────────────────────────────────────────────────
// Canonical 10-slot Panel composition (rebalanced 2026-05-14).
// Sourced from slot-config.mjs SLOT_CONFIG. PANEL is the bare
// {provider, model} list peer-review.mjs panel mode expects.
// ─────────────────────────────────────────────────────────────────

export const PANEL = SLOT_CONFIG_PANEL;

// Backup adapters derived from SLOT_CONFIG[i].backup. Every primary
// slot has a provider-different backup. Keys are 1-based slot numbers
// (matches the pre-rebalance API for the runPanelConsultationWithBackups
// caller contract — backupAdapters[slotKey] still resolves a {provider,
// model} for the slot). Slots without a declared backup (none today,
// but defensive against future config changes) are absent from the map.
export const BACKUP_ADAPTERS = Object.freeze(
  SLOT_CONFIG.reduce((acc, slot, idx) => {
    if (slot.backup) {
      acc[idx + 1] = Object.freeze({ provider: slot.backup.provider, model: slot.backup.model });
    }
    return acc;
  }, {}),
);

// Default per-reviewer timeout. The W5a dispatch named 15s as the
// trigger threshold for backup retry. peerReview() applies a single
// timeout across all slots, so 15s would degrade many non-Slot-5/7
// slots that legitimately need 30-60s. Compromise: 60s primary timeout
// matches realistic openrouter latencies; backup-adapter retries are
// triggered by any degraded outcome (timeout, error, or null output),
// not strictly by 15s.
export const DEFAULT_PER_REVIEWER_TIMEOUT_MS = 60_000;
export const BACKUP_RETRY_TIMEOUT_MS = 90_000;  // backups get longer budget

// Cascade-stagger default — see peer-review.mjs runPanel staggerMs note.
// 200 ms × 10 slots = 2 s total spread, invisible next to the 60s+ per-
// reviewer budget. Prevents a transient OpenRouter / provider-side blip
// from cascading across all 10 simultaneously-fired primaries. Added
// 2026-05-15 (W5b Panel Infra Repair).
export const DEFAULT_STAGGER_MS = 200;

// Safe single-batch bundle ceiling. CA-11 adversarial (146,754 chars,
// ~36K tokens at 4 chars/tok) put Slot 5 (cohere/command-r-plus, 128K
// nominal context) and Slot 6 SILENT — sub-quorum on a large but
// supposed-to-fit bundle. The 20-agent review bundle will be 4-10× that
// size. Above this threshold, the runner REFUSES to silently truncate
// and either (a) throws a clear error, or (b) iterates batches if the
// caller passed `batches`. Threshold rationale: 120 KB ≈ 30 KB of
// criteria + system prompt headroom on the tightest-context primary in
// the current roster (perplexity sonar ~127K nominal), well above the
// CA-11 borderline-fail bundle size. Added 2026-05-15.
export const MAX_SAFE_BUNDLE_CHARS = 120_000;

const QUORUM_BAR = 7;
const SUPERMAJORITY_BAR = 8;

// ─────────────────────────────────────────────────────────────────
// CANONICAL_REFERENCE.md attachment (per W6 brief standing rule)
// ─────────────────────────────────────────────────────────────────

const CANONICAL_REFERENCE_PATH = path.join(repoRoot, 'docs', 'CANONICAL_REFERENCE.md');

export async function loadCanonicalReference() {
  if (!existsSync(CANONICAL_REFERENCE_PATH)) {
    throw new Error(
      `W6 standing rule violation: docs/CANONICAL_REFERENCE.md not found at ${CANONICAL_REFERENCE_PATH}. ` +
      'Every Panel consultation must attach full SSOT — session is invalid without it.',
    );
  }
  return await readFile(CANONICAL_REFERENCE_PATH, 'utf8');
}

export function buildArtifactWithCanonical(canonicalText, consultationBody) {
  return [
    '═══════════════ FLOWAI CANONICAL REFERENCE (verbatim) ═══════════════',
    '',
    canonicalText.trim(),
    '',
    '═══════════════ END CANONICAL REFERENCE ═══════════════',
    '',
    '═══════════════ CONSULTATION CONTEXT ═══════════════',
    '',
    consultationBody.trim(),
    '',
    '═══════════════ END CONSULTATION CONTEXT ═══════════════',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────
// Backup-adapter retry logic
// ─────────────────────────────────────────────────────────────────

/**
 * Run a Panel consultation with Slot 5 + Slot 7 backup-adapter retries.
 *
 * Flow:
 *   1. Call peerReview() with the primary panel and the configured
 *      per-reviewer timeout.
 *   2. For each slot in BACKUP_ADAPTERS, check if the primary returned
 *      degraded=true (timeout, error, or null output).
 *   3. If degraded, call peerReview() with a single-slot panel using
 *      the backup adapter for that slot, with a longer timeout.
 *   4. If the backup succeeds, splice it into the result reviewers[]
 *      at the original slot index, tagging the swap so downstream
 *      consumers can see which slots were rescued.
 *   5. If the backup also fails, leave the primary degraded result
 *      in place.
 *
 * @param {object} opts
 * @param {string} opts.artifact — full artifact text including
 *   CANONICAL_REFERENCE.md (use buildArtifactWithCanonical() to assemble).
 * @param {string} opts.criteria — reviewer instruction / criteria text.
 * @param {object[]} [opts.panel] — panel composition; defaults to PANEL.
 * @param {number} [opts.perReviewerTimeoutMs] — defaults to
 *   DEFAULT_PER_REVIEWER_TIMEOUT_MS.
 * @param {object} [opts.backupAdapters] — slot-keyed map of backup
 *   adapters; defaults to BACKUP_ADAPTERS.
 * @param {number} [opts.backupRetryTimeoutMs] — backup retry timeout;
 *   defaults to BACKUP_RETRY_TIMEOUT_MS.
 * @param {(msg: string) => void} [opts.log] — log sink; defaults to
 *   process.stdout.write with a newline.
 * @returns {Promise<object>} — same shape as peerReview()'s result,
 *   with one added flag per spliced reviewer: `slot_backup_applied: true`
 *   and `primary_slot_model: <original model>`.
 */
export async function runPanelConsultationWithBackups(opts) {
  const {
    artifact,
    criteria,
    panel = PANEL,
    perReviewerTimeoutMs = DEFAULT_PER_REVIEWER_TIMEOUT_MS,
    backupAdapters = BACKUP_ADAPTERS,
    backupRetryTimeoutMs = BACKUP_RETRY_TIMEOUT_MS,
    staggerMs = DEFAULT_STAGGER_MS,
    maxBundleChars = MAX_SAFE_BUNDLE_CHARS,
    log = (m) => process.stdout.write(`${m}\n`),
  } = opts;

  if (typeof artifact !== 'string' || artifact.length === 0) {
    throw new TypeError('runPanelConsultationWithBackups: artifact required (non-empty string)');
  }
  if (typeof criteria !== 'string' || criteria.length === 0) {
    throw new TypeError('runPanelConsultationWithBackups: criteria required (non-empty string)');
  }

  // Bundle-size pre-check (Step 1D, 2026-05-15 W5b). Silent truncation is
  // forbidden; oversize bundles must be split into batches by the caller
  // via runPanelConsultationWithBackupsBatched() or by reducing the bundle.
  if (artifact.length > maxBundleChars) {
    throw new Error(
      `runPanelConsultationWithBackups: artifact length ${artifact.length} chars exceeds ` +
      `maxBundleChars=${maxBundleChars}. Silent truncation is forbidden — too many slots silently ` +
      `drop on context overflow (e.g. CA-11 adversarial 146 KB bundle → Slots 5+6 SILENT). ` +
      `Use runPanelConsultationWithBackupsBatched({ batches: [{ artifact, label }, ...] }) to ` +
      `split into multiple in-budget batches, or shrink the bundle.`,
    );
  }

  log(`[panel-consultation] primary run starting · panel=${panel.length} slots · timeout=${perReviewerTimeoutMs}ms · stagger=${staggerMs}ms · bundle=${artifact.length} chars`);
  const primary = await peerReview({ artifact, criteria, panel, perReviewerTimeoutMs, staggerMs });
  log(`[panel-consultation] primary run complete · live-ok=${primary.reviewers.filter((r) => !r.degraded).length}/${panel.length}`);

  // Backup pass — only for slots in backupAdapters that came back degraded.
  for (const slotKey of Object.keys(backupAdapters)) {
    const slotNum = Number(slotKey);
    const idx = slotNum - 1;
    if (idx < 0 || idx >= primary.reviewers.length) continue;
    const r = primary.reviewers[idx];
    if (!r || !r.degraded) continue;

    const backup = backupAdapters[slotKey];
    log(
      `[panel-consultation] slot ${slotNum} DEGRADED (model=${r.model ?? '?'}, error=${r.error ?? 'unknown'}) ` +
      `— retrying with backup ${backup.provider}:${backup.model} (timeout=${backupRetryTimeoutMs}ms)`,
    );
    try {
      // peerReview() panel mode requires >= 2 reviewers. Pad with a
      // duplicate of the backup adapter, then take whichever entry
      // comes back non-degraded first. Wastes one API call per retry
      // but avoids needing single-AI mode's different return shape.
      const retry = await peerReview({
        artifact, criteria,
        panel: [backup, backup],
        perReviewerTimeoutMs: backupRetryTimeoutMs,
        staggerMs: 0,  // single-slot retry, no cascade exposure → no stagger
      });
      const retryR = retry.reviewers.find((x) => x && !x.degraded) ?? retry.reviewers[0];
      if (retryR && !retryR.degraded) {
        log(`[panel-consultation] slot ${slotNum} backup SUCCEEDED via ${backup.provider}:${backup.model}`);
        primary.reviewers[idx] = {
          ...retryR,
          slot_backup_applied: true,
          primary_slot_provider: r.provider,
          primary_slot_model: r.model,
          primary_slot_error: r.error ?? null,
        };
      } else {
        log(`[panel-consultation] slot ${slotNum} backup ALSO FAILED — keeping primary degraded result`);
      }
    } catch (e) {
      log(`[panel-consultation] slot ${slotNum} backup THREW: ${e?.message ?? e} — keeping primary degraded result`);
    }
  }

  // Re-summarize after backup pass.
  const finalLiveOk = primary.reviewers.filter((r) => !r.degraded).length;
  const backupApplied = primary.reviewers.filter((r) => r.slot_backup_applied).length;
  log(`[panel-consultation] final · live-ok=${finalLiveOk}/${panel.length} · backups-applied=${backupApplied}`);

  primary.w6_metadata = {
    quorum_bar: QUORUM_BAR,
    supermajority_bar: SUPERMAJORITY_BAR,
    quorum_met: finalLiveOk >= QUORUM_BAR,
    supermajority_achievable: finalLiveOk >= SUPERMAJORITY_BAR,
    final_live_ok: finalLiveOk,
    backups_applied: backupApplied,
    primary_timeout_ms: perReviewerTimeoutMs,
    backup_retry_timeout_ms: backupRetryTimeoutMs,
    stagger_ms: staggerMs,
    bundle_chars: artifact.length,
  };

  return primary;
}

// ─────────────────────────────────────────────────────────────────
// Batched runner (Step 1D, 2026-05-15 W5b). Auto-iterates over a
// caller-supplied list of in-budget batches so an oversize bundle
// (e.g. the 20-agent blueprint review, ~500 KB) can be consulted
// without silent truncation. Each batch must independently satisfy
// the maxBundleChars ceiling (the inner runPanelConsultationWithBackups
// re-checks each batch).
//
// Batches contract:
//   batches: [
//     { artifact: '<canonical+batch-body>', label: 'agents 1-5' },
//     { artifact: '<canonical+batch-body>', label: 'agents 6-10' },
//     ...
//   ]
// The caller is responsible for (a) re-attaching CANONICAL_REFERENCE.md
// to each batch (use buildArtifactWithCanonical()), and (b) keeping the
// criteria + question list consistent across batches so verdicts can be
// aggregated downstream.
//
// Returns:
//   { batches: [{ label, result }], totalReviewers, totalSlots,
//     quorum_met_per_batch: [bool, ...] }
// ─────────────────────────────────────────────────────────────────

export async function runPanelConsultationWithBackupsBatched(opts) {
  const {
    batches,
    criteria,
    panel = PANEL,
    perReviewerTimeoutMs = DEFAULT_PER_REVIEWER_TIMEOUT_MS,
    backupAdapters = BACKUP_ADAPTERS,
    backupRetryTimeoutMs = BACKUP_RETRY_TIMEOUT_MS,
    staggerMs = DEFAULT_STAGGER_MS,
    maxBundleChars = MAX_SAFE_BUNDLE_CHARS,
    log = (m) => process.stdout.write(`${m}\n`),
  } = opts;

  if (!Array.isArray(batches) || batches.length === 0) {
    throw new TypeError('runPanelConsultationWithBackupsBatched: batches must be a non-empty array');
  }
  for (const [i, b] of batches.entries()) {
    if (!b || typeof b.artifact !== 'string' || b.artifact.length === 0) {
      throw new TypeError(`runPanelConsultationWithBackupsBatched: batches[${i}].artifact required (non-empty string)`);
    }
    if (typeof b.label !== 'string' || b.label.length === 0) {
      throw new TypeError(`runPanelConsultationWithBackupsBatched: batches[${i}].label required (non-empty string)`);
    }
  }

  log(`[panel-consultation/batched] ${batches.length} batches · maxBundleChars=${maxBundleChars}`);
  const results = [];
  for (const [i, b] of batches.entries()) {
    log(`[panel-consultation/batched] batch ${i + 1}/${batches.length} "${b.label}" — ${b.artifact.length} chars`);
    const result = await runPanelConsultationWithBackups({
      artifact: b.artifact, criteria, panel,
      perReviewerTimeoutMs, backupAdapters, backupRetryTimeoutMs,
      staggerMs, maxBundleChars, log,
    });
    results.push({ label: b.label, result });
  }

  const totalReviewers = results.reduce((acc, b) => acc + b.result.reviewers.length, 0);
  const totalSlots = panel.length;
  const quorum_met_per_batch = results.map((b) => Boolean(b.result.w6_metadata?.quorum_met));

  log(
    `[panel-consultation/batched] complete · batches=${batches.length} ` +
    `· total reviewers=${totalReviewers} · quorum-met-batches=${quorum_met_per_batch.filter(Boolean).length}/${batches.length}`,
  );

  return { batches: results, totalReviewers, totalSlots, quorum_met_per_batch };
}

// ─────────────────────────────────────────────────────────────────
// Optional CLI mode for ad-hoc consultations
//   node scripts/panel/run-panel-consultation.mjs <artifact-file> <criteria-file>
// ─────────────────────────────────────────────────────────────────

async function cliMain() {
  const [, , artifactFile, criteriaFile] = process.argv;
  if (!artifactFile || !criteriaFile) {
    process.stderr.write(
      'usage: node scripts/panel/run-panel-consultation.mjs <artifact-file> <criteria-file>\n' +
      '  artifact-file: path to consultation context body (CANONICAL_REFERENCE.md prepended automatically)\n' +
      '  criteria-file: path to reviewer instruction / criteria text\n',
    );
    process.exit(2);
  }
  const consultationBody = await readFile(path.resolve(artifactFile), 'utf8');
  const criteria = await readFile(path.resolve(criteriaFile), 'utf8');
  const canonical = await loadCanonicalReference();
  const artifact = buildArtifactWithCanonical(canonical, consultationBody);
  const result = await runPanelConsultationWithBackups({ artifact, criteria });
  process.stdout.write('\n═══════ PANEL CONSULTATION RESULT ═══════\n');
  process.stdout.write(`Reviewers: ${result.reviewers.length}\n`);
  process.stdout.write(`Live OK:   ${result.w6_metadata.final_live_ok}\n`);
  process.stdout.write(`Backups:   ${result.w6_metadata.backups_applied}\n`);
  for (const [i, r] of result.reviewers.entries()) {
    const slot = i + 1;
    const tag = r.slot_backup_applied ? ' [BACKUP]' : '';
    process.stdout.write(
      `  slot ${String(slot).padStart(2, ' ')}${tag.padEnd(9, ' ')} ` +
      `provider=${r.provider.padEnd(13, ' ')} model=${(r.model || '').padEnd(38, ' ')} ` +
      `degraded=${r.degraded} error=${r.error ?? 'none'}\n`,
    );
  }
}

// Detect direct invocation vs library import. When invoked as a script,
// run the CLI; when imported, expose the library surface only. process.argv[1]
// is undefined under `node -e` / `node --input-type=module -e` (used by smoke
// tests + sandboxed imports) — guard accordingly so the module is import-safe
// from any context.
const argv1 = (process.argv[1] || '').replace(/\\/g, '/');
if (argv1 && (
      import.meta.url === `file://${argv1}` ||
      argv1.endsWith('/scripts/panel/run-panel-consultation.mjs')
    )) {
  cliMain().catch((e) => {
    process.stderr.write(`[panel-consultation] CRASH: ${e?.stack ?? e}\n`);
    process.exit(2);
  });
}
