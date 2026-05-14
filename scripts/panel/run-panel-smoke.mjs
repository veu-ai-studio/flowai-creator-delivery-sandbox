// scripts/panel/run-panel-smoke.mjs
//
// W6 Panel smoke test — exercises the full 10-slot Panel with backup-
// adapter retry logic per scripts/panel/run-panel-consultation.mjs.
//
// Gate per W5a dispatch step 5: at least 8 of 10 slots LIVE-OK
// (after backup adapters applied) before proceeding to consultation
// runs. Exit 0 if gate met; exit 1 if below.
//
// Bundle is a 3-line artifact + simple summarize-in-one-sentence
// criteria. Each reviewer is called once. CANONICAL_REFERENCE.md is
// NOT attached for the smoke test specifically — the smoke is testing
// adapter liveness, not consultation correctness. (W6 brief's
// "attach full SSOT" rule applies to consultations that produce
// canonical-decision-relevant outputs.)

import { runPanelConsultationWithBackups, PANEL } from './run-panel-consultation.mjs';

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
  process.stdout.write(
    `Panel smoke test (W6) — running ${PANEL.length} reviewers in parallel with backup adapters\n`,
  );

  let result;
  try {
    result = await runPanelConsultationWithBackups({
      artifact: SMOKE_ARTIFACT,
      criteria: SMOKE_CRITERIA,
      panel: PANEL,
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
    const ok = !r.degraded;
    if (ok) liveOk += 1;
    const tag = r.slot_backup_applied ? '[BACKUP]' : '        ';
    const err = r.error ? r.error : 'none';
    const modelStr = (r.model || '').split(':').slice(1).join(':') || (r.model || '');
    process.stdout.write(
      `  slot=${String(slot).padStart(2, ' ')} ${tag}  ` +
      `provider=${r.provider.padEnd(13, ' ')}  ` +
      `model=${modelStr.padEnd(38, ' ')}  ` +
      `ok=${ok}  latency=${r.latency_ms}ms  error=${err}\n`,
    );
  });

  process.stdout.write(
    `\nSynthesis: aggregate_verdict=${result.synthesis?.aggregate_verdict ?? 'n/a'} ` +
    `models_used=${result.synthesis?.models_used ?? 'n/a'}/${result.reviewers.length}\n`,
  );
  process.stdout.write(
    `LIVE-OK slots: ${liveOk}/${PANEL.length} (gate >= ${REQUIRED_LIVE_OK})\n` +
    `Backups applied: ${result.w6_metadata.backups_applied}\n`,
  );

  process.exit(liveOk >= REQUIRED_LIVE_OK ? 0 : 1);
}

main().catch((e) => {
  process.stderr.write(`[panel-smoke] CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
