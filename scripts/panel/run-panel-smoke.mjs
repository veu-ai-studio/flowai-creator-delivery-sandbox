// scripts/panel/run-panel-smoke.mjs
//
// W6 Panel smoke test — exercises the full 10-slot Panel with backup-
// adapter retry logic per scripts/panel/run-panel-consultation.mjs.
//
// Composition (rebalanced 2026-05-14): see ./slot-config.mjs SLOT_CONFIG.
// Provider diversity audit, per-slot region + role, and primary→backup
// pairing are surfaced in the smoke output for fast visual review.
//
// Gate: ≥8 of 10 slots LIVE-OK after backup adapters applied. Exit 0
// when met; exit 1 otherwise.
//
// CANONICAL_REFERENCE.md is intentionally NOT attached for the smoke
// (the smoke tests adapter liveness, not consultation correctness;
// W6 brief's "attach SSOT" rule applies to canonical-decision
// consultations only).

import { runPanelConsultationWithBackups } from './run-panel-consultation.mjs';
import { SLOT_CONFIG, auditDiversity } from './slot-config.mjs';

const SMOKE_ARTIFACT = [
  'FlowAI ships a 25-agent orchestration roster across 8 Auto-Runner steps.',
  'Three operating modes (Auto, Guided, Manual) gate every step transition.',
  'W6 is the dedicated Panel workstream as of 2026-05-14.',
].join('\n');

const SMOKE_CRITERIA = `
Summarize the artifact in EXACTLY ONE sentence. Return ONLY a JSON object
with this shape (no prose, no markdown fences):
{
  "summary": "<one sentence>",
  "agreement_pct": <0-100 integer reflecting your confidence in the summary>,
  "verdict": "ACCEPT_AS_IS"
}
`.trim();

const REQUIRED_LIVE_OK = 8;

async function main() {
  const audit = auditDiversity();
  process.stdout.write(
    `Panel smoke (W6, rebalanced 2026-05-14) — ${SLOT_CONFIG.length} reviewers in parallel\n` +
    `Provider audit: ${Object.entries(audit.providerCounts).map(([k, v]) => `${k}=${v}`).join(' ')} ` +
    `(max=${audit.maxPerProvider})\n`,
  );

  let result;
  try {
    result = await runPanelConsultationWithBackups({
      artifact: SMOKE_ARTIFACT,
      criteria: SMOKE_CRITERIA,
      // panel is implicit (run-panel-consultation imports PANEL from
      // slot-config.mjs as default); we pass explicitly here for
      // clarity in the smoke log.
      panel: SLOT_CONFIG.map((s) => ({ provider: s.provider, model: s.model })),
      perReviewerTimeoutMs: 60_000,
    });
  } catch (e) {
    process.stderr.write(`[panel-smoke] FAILED to run: ${e?.message ?? e}\n`);
    process.exit(1);
  }

  process.stdout.write('\nResults:\n');
  let liveOk = 0;
  result.reviewers.forEach((r, idx) => {
    const slot = idx + 1;
    const slotCfg = SLOT_CONFIG[idx];
    const ok = !r.degraded;
    if (ok) liveOk += 1;
    const tag = r.slot_backup_applied ? '[BACKUP]' : '        ';
    const err = r.error ? r.error : 'none';
    const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
    process.stdout.write(
      `  slot=${String(slot).padStart(2, ' ')} ${tag}  ` +
      `region=${(slotCfg.region || '').padEnd(15, ' ')}  ` +
      `model=${modelStr.padEnd(46, ' ')}  ` +
      `ok=${ok}  latency=${r.latency_ms}ms  error=${err}\n`,
    );
  });

  process.stdout.write(
    `\nSynthesis: aggregate_verdict=${result.synthesis?.aggregate_verdict ?? 'n/a'} ` +
    `models_used=${result.synthesis?.models_used ?? 'n/a'}/${result.reviewers.length}\n`,
  );
  process.stdout.write(
    `LIVE-OK slots: ${liveOk}/${SLOT_CONFIG.length} (gate >= ${REQUIRED_LIVE_OK})\n` +
    `Backups applied: ${result.w6_metadata.backups_applied}\n`,
  );

  process.exit(liveOk >= REQUIRED_LIVE_OK ? 0 : 1);
}

main().catch((e) => {
  process.stderr.write(`[panel-smoke] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
