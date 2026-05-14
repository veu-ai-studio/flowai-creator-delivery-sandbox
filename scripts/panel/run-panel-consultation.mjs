// scripts/panel/run-panel-consultation.mjs
//
// W6 Panel workstream — canonical Panel consultation runner library.
//
// Every Panel consultation under W6 routes through this module's
// runPanelConsultationWithBackups() function. Provides:
//   - 10-slot LIVE Panel composition (commit 9143f82)
//   - Slot 5 + Slot 7 backup-adapter retry logic (both slots previously
//     DEGRADED in prior consultations — see Panel re-review at e2f094d
//     and SSOT finalization at d476555)
//   - Library function exported for use by per-consultation wrappers
//     (e.g., scripts/panel/run-w6-structural-validation.mjs)
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

// ─────────────────────────────────────────────────────────────────
// Canonical 10-slot Panel composition (per W6 brief: 10 slots,
// quorum 7, supermajority 8).
// ─────────────────────────────────────────────────────────────────

export const PANEL = Object.freeze([
  { provider: 'openrouter',   model: 'openai/gpt-5' },                       // Slot 1
  { provider: 'openrouter',   model: 'openai/gpt-4o' },                      // Slot 2
  { provider: 'openrouter',   model: 'google/gemini-2.5-pro' },              // Slot 3
  { provider: 'openrouter',   model: 'anthropic/claude-opus-4' },            // Slot 4
  { provider: 'vercel_v0',    model: 'v0-1.5-md' },                          // Slot 5 (primary; backup below)
  { provider: 'openrouter',   model: 'mistralai/mistral-large-2411' },       // Slot 6
  { provider: 'openrouter',   model: 'deepseek/deepseek-r1' },               // Slot 7 (primary; backup below)
  { provider: 'openrouter',   model: 'meta-llama/llama-3.3-70b-instruct' },  // Slot 8
  { provider: 'openrouter',   model: 'qwen/qwen-2.5-72b-instruct' },         // Slot 9
  { provider: 'openrouter',   model: 'openai/gpt-4o' },                      // Slot 10
]);

// Backup adapters per W5a dispatch step 4. Slot 5 + Slot 7 have been
// DEGRADED in multiple prior consultations; backups are openrouter-
// only to maximize availability uniformity.
export const BACKUP_ADAPTERS = Object.freeze({
  5: { provider: 'openrouter', model: 'google/gemini-2.5-pro' },
  7: { provider: 'openrouter', model: 'anthropic/claude-opus-4' },
});

// Default per-reviewer timeout. The W5a dispatch named 15s as the
// trigger threshold for backup retry. peerReview() applies a single
// timeout across all slots, so 15s would degrade many non-Slot-5/7
// slots that legitimately need 30-60s. Compromise: 60s primary timeout
// matches realistic openrouter latencies; backup-adapter retries are
// triggered by any degraded outcome (timeout, error, or null output),
// not strictly by 15s.
export const DEFAULT_PER_REVIEWER_TIMEOUT_MS = 60_000;
export const BACKUP_RETRY_TIMEOUT_MS = 90_000;  // backups get longer budget

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
    log = (m) => process.stdout.write(`${m}\n`),
  } = opts;

  if (typeof artifact !== 'string' || artifact.length === 0) {
    throw new TypeError('runPanelConsultationWithBackups: artifact required (non-empty string)');
  }
  if (typeof criteria !== 'string' || criteria.length === 0) {
    throw new TypeError('runPanelConsultationWithBackups: criteria required (non-empty string)');
  }

  log(`[panel-consultation] primary run starting · panel=${panel.length} slots · timeout=${perReviewerTimeoutMs}ms`);
  const primary = await peerReview({ artifact, criteria, panel, perReviewerTimeoutMs });
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
  };

  return primary;
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
// run the CLI; when imported, expose the library surface only.
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1].replace(/\\/g, '/').endsWith('/scripts/panel/run-panel-consultation.mjs')) {
  cliMain().catch((e) => {
    process.stderr.write(`[panel-consultation] CRASH: ${e?.stack ?? e}\n`);
    process.exit(2);
  });
}
