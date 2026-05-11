// Panel smoke test — exercises the full 10-slot multi-provider panel.
//
// Slot map (Phase 1.0 W5b verification, 2026-05-11):
//   Slots 1–4 : OpenRouter (gpt-5, gpt-4o, gemini-2.5-pro, claude-opus-4)
//   Slot  5   : Vercel v0      (LIVE — B1 / W5c, 2026-05-11; POST /v1/chats)
//   Slots 6–7 : GitHub Models  (high-tier + low-tier rate-limit buckets)
//   Slots 8–9 : Headless       (DEFERRED — surfaces 'not_configured')
//   Slot  10  : OpenRouter web-grounded gpt-4o
//
// Each provider is called once with a 3-line artifact + the criteria
// "Summarize this paragraph in one sentence." Adapters whose required
// credential is missing skip silently (degraded=true, error includes
// 'not_configured').
//
// Report shape (printed to stdout, one row per reviewer):
//   slot=<n> provider=<name> model=<id> ok=<bool> latency=<ms> error=<err|none>
//
// Exit code:
//   0  — at least 5 LIVE reviewers succeeded (dispatch acceptance gate)
//   1  — fewer than 5 LIVE reviewers succeeded
//
// Usage:
//   node scripts/run-panel-smoke.mjs

import { peerReview } from './lib/peer-review.mjs';

// Dispatch-specified 3-line artifact.
const SMOKE_ARTIFACT = [
  'FlowAI ships a 25-agent orchestration roster across 8 Auto-Runner steps.',
  'Three operating modes (Auto, Guided, Manual) gate every step transition.',
  'Phase 1.0 locks in panel infrastructure and the expanded agent roster.',
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

// Full 10-slot panel per Phase 1.0 slot map.
const PANEL = [
  // Slot 1 — OpenRouter / gpt-5
  { provider: 'openrouter',   model: 'openai/gpt-5' },
  // Slot 2 — OpenRouter / gpt-4o
  { provider: 'openrouter',   model: 'openai/gpt-4o' },
  // Slot 3 — OpenRouter / gemini-2.5-pro
  { provider: 'openrouter',   model: 'google/gemini-2.5-pro' },
  // Slot 4 — OpenRouter / claude-opus-4
  { provider: 'openrouter',   model: 'anthropic/claude-opus-4' },
  // Slot 5 — Vercel v0 (LIVE per B1 / W5c)
  { provider: 'vercel_v0',    model: 'v0-1.5-md' },
  // Slot 6 — GitHub Models, high-tier
  { provider: 'github_models', model: 'openai/gpt-4.1' },
  // Slot 7 — GitHub Models, low-tier (different rate-limit bucket)
  { provider: 'github_models', model: 'openai/gpt-4o-mini' },
  // Slot 8 — Headless / base44 (DEFERRED)
  { provider: 'headless',     model: 'base44_chat' },
  // Slot 9 — Headless / replit (DEFERRED)
  { provider: 'headless',     model: 'replit_agent' },
  // Slot 10 — OpenRouter web-grounded gpt-4o (same adapter, different model id)
  { provider: 'openrouter',   model: 'openai/gpt-4o' },
];

const REQUIRED_LIVE = 5;

async function main() {
  process.stdout.write('Panel smoke test — running ' + PANEL.length + ' reviewers in parallel\n');
  let result;
  try {
    result = await peerReview({
      artifact: SMOKE_ARTIFACT,
      criteria: SMOKE_CRITERIA,
      panel: PANEL,
      perReviewerTimeoutMs: 90_000,
    });
  } catch (e) {
    process.stderr.write(`panel-smoke FAILED to run: ${e?.message ?? e}\n`);
    process.exit(1);
  }

  process.stdout.write('\nResults:\n');
  let liveCount = 0;
  result.reviewers.forEach((r, idx) => {
    const slot = idx + 1;
    const ok = !r.degraded;
    if (ok) liveCount += 1;
    const err = r.error ? r.error : 'none';
    process.stdout.write(
      `  slot=${String(slot).padStart(2, ' ')}  provider=${r.provider.padEnd(13, ' ')}  ` +
      `model=${r.model.split(':').slice(1).join(':')}  ` +
      `ok=${ok}  latency=${r.latency_ms}ms  error=${err}\n`,
    );
  });

  process.stdout.write(
    `\nSynthesis: aggregate_verdict=${result.synthesis.aggregate_verdict} ` +
    `models_used=${result.synthesis.models_used}/${result.reviewers.length}\n`,
  );
  process.stdout.write(
    `LIVE slots: ${liveCount}/${PANEL.length} (need >= ${REQUIRED_LIVE})\n`,
  );

  process.exit(liveCount >= REQUIRED_LIVE ? 0 : 1);
}

main();
