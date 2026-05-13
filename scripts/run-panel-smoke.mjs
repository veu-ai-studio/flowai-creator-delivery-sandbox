// Panel smoke test — exercises the full 10-slot multi-provider panel.
//
// Slot map (Phase 1.0 W5b verification, 2026-05-11; revised 2026-05-13):
//   Slots 1–4 : OpenRouter (gpt-5, gpt-4o, gemini-2.5-pro, claude-opus-4)
//   Slot  5   : Vercel v0      (LIVE — B1 / W5c, 2026-05-11; POST /v1/chats)
//   Slots 6–7 : OpenRouter     (mistral-large-2411, deepseek-r1)
//                              [swapped from github_models on 2026-05-13]
//   Slot  8   : Headless       (Base44 chat — LIVE after the CEO runs
//                              scripts/setup-base44-session.mjs;
//                              otherwise reports 'storage_state_missing')
//   Slot  9   : Headless       (Replit agent — DEFERRED; driver file
//                              not yet created)
//   Slot  10  : OpenRouter web-grounded gpt-4o
//
// Slot 6/7 swap rationale (2026-05-13, per W03 dispatch):
//   Slot 6/7 were previously bound to github_models (openai/gpt-4.1 +
//   openai/gpt-4o-mini). The github_models free-tier 8K token cap
//   blocked SSOT-bundled dispatches. Replacement models routed through
//   OpenRouter accept bundles well over 8K (mistral-large 128K context,
//   deepseek-r1 64K context) and remain reasoning-tier non-overlapping
//   with the other slots per SSOT EP2 multi-AI triangulation rule.
//   CEO acknowledged. GitHub Models credentials are intentionally left
//   in place in Doppler in case we want to revisit later.
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
  // Slot 6 — OpenRouter / mistral-large-2411 (swapped 2026-05-13, W5b)
  // Was: github_models / openai/gpt-4.1 (blocked by 8K token cap)
  { provider: 'openrouter',   model: 'mistralai/mistral-large-2411' },
  // Slot 7 — OpenRouter / deepseek-r1 (swapped 2026-05-13, W5b)
  // Was: github_models / openai/gpt-4o-mini (blocked by 8K token cap)
  { provider: 'openrouter',   model: 'deepseek/deepseek-r1' },
  // Slot 8 — Headless / base44_chat (wired 2026-05-13 via Playwright
  // storageState; routes through scripts/lib/headless-reviewer.mjs →
  // scripts/lib/headless/base44-chat.mjs). LIVE once the CEO has run
  // scripts/setup-base44-session.mjs; otherwise reports
  // 'storage_state_missing' and stays DEFERRED for that panel run.
  { provider: 'headless',     model: 'base44_chat' },
  // Slot 9 — Headless / replit_agent (DEFERRED — driver file not yet
  // created; shell returns 'not_configured').
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
