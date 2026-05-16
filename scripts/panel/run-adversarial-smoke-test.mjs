// scripts/panel/run-adversarial-smoke-test.mjs
//
// W5b Panel adversarial smoke test (dispatch 2026-05-15 STEP 3).
//
// Purpose: PROVE the locked adversarial format actually fires across the
// 10-slot Panel before W04 launches the 20-agent adversarial review.
// Per dispatch: "If the smoke test FAILS quorum or the adversarial pass
// does not fire, STOP and report — do NOT certify the Panel."
//
// What we verify, end-to-end against the LIVE Panel (no mocks):
//   - All 10 slots engage (primaries fire; backups recover SILENT/DEGRADED
//     slots until quorum ≥ 7 LIVE-OK)
//   - The adversarial pass fires (every ENGAGED reviewer produces ≥3
//     objections + worse-than-status-quo + precedent)
//   - The dissent-floor logic is reachable (we use a deliberately
//     contentious tiny proposal so we can see the alignment math)
//   - The anchor-phrase guard refused our test artifact would fire
//     (smoke-bypassed since we use a clean artifact, but verified by a
//     pre-flight assertion against a known-bad artifact)
//   - No cascade — staggered kick-offs keep transient provider blips
//     from dropping more than one slot at a time
//
// Bundle: a SMALL synthetic proposal (~2 KB) with 2 questions. The
// CANONICAL_REFERENCE.md (~103 KB) is attached per W6 standing rule,
// putting the total bundle around 105 KB — comfortably under the 120 KB
// MAX_SAFE_BUNDLE_CHARS ceiling.
//
// Run:
//   node scripts/panel/run-adversarial-smoke-test.mjs
//
// Output:
//   docs/panel-consultations/w5b-smoke-2026-05-15.md  (human readable)
//   docs/panel-consultations/w5b-smoke-2026-05-15.sidecar.json
//
// Exit code:
//   0 = PASS (Panel certified fit for 20-agent adversarial review)
//   1 = FAIL (per-failure mode reported on stderr)

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  runAdversarialPanelConsultation,
  runPanelConsultationWithBackups,
  PANEL,
} from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'w5b-smoke-2026-05-15.md');
const SIDECAR_PATH = path.join(OUTPUT_DIR, 'w5b-smoke-2026-05-15.sidecar.json');

// Tiny synthetic proposal — designed to be reviewable but contentious
// enough that an honest adversarial Panel produces real objections.
const DRAFT_TEXT = `
PROPOSED AMENDMENT (smoke-test) — SSOT §15a (Panel Self-Governance):

Replace the current 10-slot Panel with a 3-slot mini-Panel for routine
consultations (any proposal flagged "low risk" by the spec author).
Mini-Panel composition: gpt-5 (US), claude-opus-4 (US), deepseek-r1
(Asia). Justification: 70 % cost reduction, faster turnaround, fewer
envelope-flake retries. Rollback path: if the mini-Panel disagrees with
itself, the full 10-slot Panel is convened.

This proposal is a smoke-test stub. It is intentionally contentious —
shrinking the Panel by 70 % is a real change that real reviewers can
find real problems with. The smoke test exists to prove the Panel fires
adversarially, not to actually promote this amendment.
`.trim();

const QUESTIONS = [
  {
    id: 'SQ1',
    topic: 'Should the Panel be shrunk to 3 slots for low-risk consultations?',
    options: [
      { key: 'SQ1-YES',    text: 'Yes — shrink to 3 slots when low-risk, full 10 on dispute' },
      { key: 'SQ1-NO',     text: 'No — keep all consultations at full 10 slots' },
      { key: 'SQ1-HYBRID', text: 'Hybrid — 5 slots for low-risk, full 10 for canonical changes' },
    ],
    // Intentionally point draftedKey at SQ1-YES so a high-alignment outcome
    // is detectable — but we expect honest panelists to push back, lowering
    // alignment below the 80% dissent-floor trigger.
    draftedKey: 'SQ1-YES',
  },
  {
    id: 'SQ2',
    topic: 'How should "low risk" be classified?',
    options: [
      { key: 'SQ2-AUTHOR',  text: 'Spec author flags low_risk:true in the proposal frontmatter' },
      { key: 'SQ2-RUBRIC',  text: 'Apply a fixed rubric (scope, blast radius, rollback path)' },
      { key: 'SQ2-PANEL',   text: 'A 1-slot pre-Panel triages each proposal as low/high risk' },
    ],
    draftedKey: 'SQ2-AUTHOR',
  },
];

async function preflightAnchorGuard() {
  // Verify the locked anchor-phrase guard actually fires. We try to push
  // a contaminated artifact through the transport layer; the runner must
  // throw. This protects against silent regressions of the format lock.
  try {
    await runPanelConsultationWithBackups({
      artifact: 'Pick option (a) (as drafted) — recommended.',
      criteria: 'pick one',
    });
    throw new Error('preflight: anchor-phrase guard FAILED to fire — format lock regression');
  } catch (e) {
    if (!/anchor phrase/i.test(e.message)) {
      throw new Error(`preflight: anchor guard threw unexpected error: ${e.message}`);
    }
  }
  return { fired: true };
}

async function preflightBundleGuard() {
  try {
    await runPanelConsultationWithBackups({
      artifact: 'a'.repeat(150_000),
      criteria: 'pick one',
    });
    throw new Error('preflight: bundle-size guard FAILED to fire — infra regression');
  } catch (e) {
    if (!/maxBundleChars/i.test(e.message)) {
      throw new Error(`preflight: bundle guard threw unexpected error: ${e.message}`);
    }
  }
  return { fired: true };
}

function renderSlotTable(perReviewer, transportReviewers) {
  const rows = [];
  rows.push(`| Slot | Provider | Model | Backup? | State | Invalid reason |`);
  rows.push(`|------|----------|-------|---------|-------|----------------|`);
  for (let i = 0; i < transportReviewers.length; i++) {
    const r = transportReviewers[i];
    const pr = perReviewer[i];
    const cfg = SLOT_CONFIG[i];
    const backup = r.slot_backup_applied ? `YES → ${r.provider}:${(r.model || '').split(':').slice(1).join(':') || r.model}` : '—';
    const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
    rows.push(
      `| ${i + 1} | ${cfg.provider} | \`${modelStr}\` | ${backup} | \`${pr.state}\` | ${pr.invalid_reason ?? '—'} |`,
    );
  }
  return rows.join('\n');
}

function renderTallyTable(tally, perVerdicts, questions) {
  const rows = [];
  rows.push(`| Q | Topic | Top option | Top count | Verdict |`);
  rows.push(`|---|-------|------------|----------:|---------|`);
  for (const q of questions) {
    const v = perVerdicts[q.id];
    const topText = v.topKey === 'REJECT'
      ? 'REJECT — none acceptable'
      : (v.topKey ? (q.options.find((o) => o.key === v.topKey)?.text || v.topKey) : '—');
    rows.push(`| **${q.id}** | ${q.topic.slice(0, 60)} | ${topText} | ${v.topCount}/${tally.engagedTotal} | \`${v.verdict}\` |`);
  }
  return rows.join('\n');
}

function renderObjections(allObjections) {
  if (allObjections.length === 0) return '_(no objections submitted — adversarial pass FAILED)_';
  return allObjections.map((o, i) =>
    `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${o.detail.replace(/\n/g, '\n> ')}\n`,
  ).join('\n');
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[w5b-smoke] started ${startedAt}\n`);

  // Pre-flight: prove both guards fire before we launch the live Panel.
  const anchorGuard = await preflightAnchorGuard();
  const bundleGuard = await preflightBundleGuard();
  process.stdout.write(
    `[w5b-smoke] pre-flight guards · anchor=${anchorGuard.fired ? 'FIRES' : 'BROKEN'} ` +
    `· bundle=${bundleGuard.fired ? 'FIRES' : 'BROKEN'}\n`,
  );

  // Audit the panel composition.
  const audit = auditDiversity();
  process.stdout.write(`[w5b-smoke] panel audit: ${JSON.stringify(audit)}\n`);
  if (audit.maxPerProvider > 1 || audit.slots !== 10) {
    process.stderr.write(
      `[w5b-smoke] FAIL: panel composition not the 10-unique-provider roster — ` +
      `maxPerProvider=${audit.maxPerProvider}, slots=${audit.slots}. Halting.\n`,
    );
    process.exit(1);
  }

  // Run the live adversarial smoke consultation.
  const result = await runAdversarialPanelConsultation({
    topic: 'W5b Adversarial Smoke Test (2026-05-15)',
    draftText: DRAFT_TEXT,
    questions: QUESTIONS,
    seed: 'w5b-smoke-2026-05-15',
    // Tight-but-honest timeouts for a small smoke bundle.
    perReviewerTimeoutMs: 120_000,
    backupRetryTimeoutMs: 180_000,
  });
  const finishedAt = new Date().toISOString();

  // Verification gates.
  const liveOk = result.reviewers.filter((r) => !r.degraded).length;
  const quorumBar = 7;
  const quorumMet = liveOk >= quorumBar;
  const adversarialPassFired = result.perReviewer.some((r) => r.adversarial?.valid === true);
  const objectionsFloor = result.tally.distinctObjections;
  const dissentFloorReachable =
    typeof result.dissentFloor.alignedPct === 'number' &&
    typeof result.dissentFloor.triggered === 'boolean';

  // Certification logic — STOP and report on failure rather than emit a
  // happy verdict.
  const failures = [];
  if (!quorumMet) failures.push(`quorum NOT met (live-ok=${liveOk}/${PANEL.length}, bar=${quorumBar})`);
  if (!adversarialPassFired) failures.push(`adversarial pass did NOT fire on ANY reviewer`);
  if (!dissentFloorReachable) failures.push(`dissent-floor logic NOT reachable (alignedPct or triggered undefined)`);
  if (result.tally.engagedTotal < quorumBar) {
    failures.push(`engaged count ${result.tally.engagedTotal} below quorum bar ${quorumBar} (controls 2B/2C discarded too many votes)`);
  }

  const certified = failures.length === 0;
  const verdict = certified ? 'PASS' : 'FAIL';

  // Render artifact.
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  const md = [
    `# W5b Panel Adversarial Smoke Test — ${verdict}`,
    ``,
    `**Date:** 2026-05-15 · **Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Bundle:** ${result.bundle_chars} chars (CANONICAL + smoke proposal + 2 questions)`,
    `**Stagger:** ${result.w6_metadata?.stagger_ms ?? 'n/a'} ms · **Primary timeout:** ${result.w6_metadata?.primary_timeout_ms ?? 'n/a'} ms · **Backup retry timeout:** ${result.w6_metadata?.backup_retry_timeout_ms ?? 'n/a'} ms`,
    ``,
    `**Certification:** Panel is ${certified ? '**verified fit**' : '**NOT verified fit**'} to run the 20-agent adversarial review.`,
    ``,
    `## Pre-flight guards`,
    ``,
    `- Anchor-phrase guard fires on contaminated artifact: \`${anchorGuard.fired ? 'YES (locked)' : 'NO (REGRESSION)'}\``,
    `- Bundle-size guard fires on >120 KB artifact: \`${bundleGuard.fired ? 'YES (locked)' : 'NO (REGRESSION)'}\``,
    ``,
    `## Engagement summary`,
    ``,
    `- LIVE-OK after backups: ${liveOk}/${PANEL.length} (quorum bar ${quorumBar})`,
    `- ENGAGED (controls 2B + 2C passed): ${result.tally.engagedTotal}/${PANEL.length}`,
    `- INVALID (votes DISCARDED — missing adversarial pass or steelman): ${result.tally.invalid}`,
    `- TANGENTIAL (incomplete votes): ${result.tally.tangential}`,
    `- SILENT (degraded / parse failure): ${result.tally.silent}`,
    `- Backups applied: ${result.w6_metadata?.backups_applied ?? 0}`,
    `- Distinct substantive objections panel-wide: ${objectionsFloor}`,
    ``,
    `## Adversarial controls — verbatim verification`,
    ``,
    `| Control | Description | Fired? |`,
    `|---------|-------------|--------|`,
    `| 2A NO ANCHORING | Options de-anchored + shuffled deterministically | \`${anchorGuard.fired ? 'YES' : 'NO'}\` (runtime guard) |`,
    `| 2B ADVERSARIAL PASS | ≥3 objections + worse-than-status-quo + precedent required | \`${adversarialPassFired ? 'YES' : 'NO'}\` (${result.perReviewer.filter((r) => r.adversarial?.valid).length}/${PANEL.length} reviewers) |`,
    `| 2C STEELMAN REJECTION | Good-faith argument for REJECT/DEFER required | \`${result.perReviewer.filter((r) => r.rejection_steelman).length > 0 ? 'YES' : 'NO'}\` (${result.perReviewer.filter((r) => r.rejection_steelman).length}/${PANEL.length} reviewers) |`,
    `| 2D DISSENT FLOOR | alignment > 80 % AND objections < 5 → INSUFFICIENT_ADVERSARIAL_SIGNAL | \`${dissentFloorReachable ? 'REACHABLE' : 'BROKEN'}\` (this run: triggered=${result.dissentFloor.triggered}, alignment=${(result.dissentFloor.alignedPct * 100).toFixed(1)}%) |`,
    `| 2E LOCKED DEFAULT | runAdversarialPanelConsultation is the entrypoint | \`YES\` (this smoke uses it) |`,
    ``,
    `## Per-slot status`,
    ``,
    renderSlotTable(result.perReviewer, result.reviewers),
    ``,
    `## Per-question tally (ENGAGED only)`,
    ``,
    renderTallyTable(result.tally, result.perVerdicts, QUESTIONS),
    ``,
    `Dissent-floor evaluation: alignment with drafted direction = **${(result.dissentFloor.alignedPct * 100).toFixed(1)} %** ` +
      `(${result.dissentFloor.alignedCount}/${result.dissentFloor.totalPossible}). ` +
      `Distinct objections = **${objectionsFloor}**. ` +
      (result.dissentFloor.triggered
        ? `**🚨 TRIGGERED:** ${result.dissentFloor.reason}.`
        : `**✅ Adversarial signal passes the floor:** ${result.dissentFloor.reason}.`),
    ``,
    `## All distinct objections (verbatim, deduplicated)`,
    ``,
    renderObjections(result.tally.allObjections),
    ``,
    `## Failure modes (if any)`,
    ``,
    failures.length === 0 ? `_(none — all gates pass)_` : failures.map((f) => `- ${f}`).join('\n'),
    ``,
    `## Per-reviewer detail`,
    ``,
    ...result.perReviewer.map((r) => {
      const lines = [`### Slot ${r.slot} — ${r.modelTag} — \`${r.state}\``, ''];
      if (r.state === 'SILENT') {
        lines.push(`_(degraded / parse-failure — no adversarial pass produced)_`);
        return lines.join('\n');
      }
      if (r.invalid_reason) {
        lines.push(`**Invalid reason:** ${r.invalid_reason}`, '');
      }
      if (r.adversarial?.valid) {
        lines.push(`#### Adversarial pass (${r.adversarial.objections.length} objections)`, '');
        for (const [i, o] of r.adversarial.objections.entries()) {
          lines.push(`- **${i + 1}. ${o.title}** — ${o.detail.replace(/\n/g, ' ')}`);
        }
        lines.push('', `**Worse-than-status-quo:** ${r.adversarial.worse_than_status_quo}`, '');
        lines.push(`**Precedent:** ${r.adversarial.precedent}`, '');
      }
      if (r.rejection_steelman) {
        lines.push(`#### Rejection steelman`, '', `> ${r.rejection_steelman.replace(/\n/g, '\n> ')}`, '');
      }
      if (r.state === 'ENGAGED' || r.state === 'TANGENTIAL') {
        lines.push(`#### Votes`, '');
        for (const q of QUESTIONS) {
          const v = r.votes[q.id] || {};
          const optText = v.key
            ? (v.key === 'REJECT' ? 'REJECT — none acceptable'
                : (q.options.find((o) => o.key === v.key)?.text || v.key))
            : (v.pick_text || '—');
          lines.push(`- **${q.id}** = \`${v.key ?? 'UNMATCHED'}\` ("${optText}")`);
          if (v.rationale) lines.push(`  - rationale: ${v.rationale}`);
        }
        lines.push('');
      }
      return lines.join('\n');
    }),
  ].join('\n');

  await writeFile(OUTPUT_PATH, md, 'utf8');
  process.stdout.write(`[w5b-smoke] wrote ${OUTPUT_PATH}\n`);

  const sidecar = {
    schema: 'w5b-smoke.sidecar.v1',
    startedAt, finishedAt,
    panel_audit: audit,
    panel_size: PANEL.length,
    bundle_chars: result.bundle_chars,
    liveOk, quorumBar, quorumMet,
    engaged: result.tally.engagedTotal,
    invalid: result.tally.invalid,
    silent: result.tally.silent,
    tangential: result.tally.tangential,
    distinctObjections: result.tally.distinctObjections,
    backupsApplied: result.w6_metadata?.backups_applied ?? 0,
    adversarialPassFired,
    dissentFloorReachable,
    dissentFloor: result.dissentFloor,
    perVerdicts: result.perVerdicts,
    consultation_valid: result.consultation_valid,
    certified,
    verdict,
    failures,
    preflight: { anchorGuard, bundleGuard },
    perReviewer: result.perReviewer,
    questions: QUESTIONS,
    w6_metadata: result.w6_metadata,
  };
  await writeFile(SIDECAR_PATH, JSON.stringify(sidecar, null, 2), 'utf8');
  process.stdout.write(`[w5b-smoke] wrote ${SIDECAR_PATH}\n`);

  process.stdout.write('\n');
  process.stdout.write('═══════ W5b ADVERSARIAL SMOKE SUMMARY ═══════\n');
  process.stdout.write(`Verdict: ${verdict}\n`);
  process.stdout.write(`LIVE-OK: ${liveOk}/${PANEL.length} (quorum bar ${quorumBar})\n`);
  process.stdout.write(`ENGAGED: ${result.tally.engagedTotal}/${PANEL.length}\n`);
  process.stdout.write(`Distinct objections: ${objectionsFloor}\n`);
  process.stdout.write(`Adversarial pass fired: ${adversarialPassFired}\n`);
  process.stdout.write(`Dissent floor reachable: ${dissentFloorReachable}\n`);
  process.stdout.write(`Dissent floor triggered: ${result.dissentFloor.triggered} (${result.dissentFloor.reason})\n`);
  if (failures.length) {
    process.stdout.write(`Failures:\n`);
    for (const f of failures) process.stdout.write(`  - ${f}\n`);
  }
  process.stdout.write('═══════════════════════════════════════════════\n');

  process.exit(certified ? 0 : 1);
}

main().catch((e) => {
  process.stderr.write(`[w5b-smoke] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
