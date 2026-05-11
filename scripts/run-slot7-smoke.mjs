// Slot 7 (GitHub Models / phi-4-mini-instruct) smoke test — W5c.
//
// Confirms that microsoft/phi-4-mini-instruct is the correct catalog id
// after Phi-3.5-mini was removed from the GitHub Models catalog (404).
//
// Calls scripts/lib/peer-review.mjs::callGithubModelsAdapter via the
// PROVIDER_HANDLERS dispatch (panel-mode entry, single reviewer).
//
// Output:
//   slot=7 provider=github_models model=microsoft/phi-4-mini-instruct
//   status=<LIVE|FAILED> latency_ms=<n> http=<status> content_len=<n>
//
// Exit 0 if LIVE, 1 otherwise. No credentials logged.

import { peerReview } from './lib/peer-review.mjs';

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
  "agreement_pct": <0-100 integer>,
  "verdict": "ACCEPT_AS_IS"
}
`.trim();

async function main() {
  const t0 = Date.now();
  let result;
  let error;
  try {
    result = await peerReview({
      artifact: SMOKE_ARTIFACT,
      criteria: SMOKE_CRITERIA,
      panel: [
        // Pair Slot 7 with an OpenRouter reviewer so panel mode (which
        // requires >=2 entries) is satisfied. We only care about Slot 7
        // for this smoke; the synthesizer ignores everything else.
        { provider: 'openrouter',   model: 'openai/gpt-4o' },
        { provider: 'github_models', model: 'microsoft/phi-4-mini-instruct' },
      ],
      perReviewerTimeoutMs: 60_000,
    });
  } catch (e) {
    error = e?.message ?? String(e);
  }
  const total_ms = Date.now() - t0;

  if (!result) {
    process.stdout.write(
      `slot=7 provider=github_models model=microsoft/phi-4-mini-instruct ` +
      `status=FAILED latency_ms=${total_ms} http=n/a content_len=0\n` +
      `error: ${error}\n`,
    );
    process.exit(1);
  }

  const slot7 = result.reviewers.find((r) => r.provider === 'github_models');
  const ok = slot7 && !slot7.degraded;
  const contentLen = (slot7?.raw_output ?? '').length;
  const status = ok ? 'LIVE' : 'FAILED';
  const http = slot7?.error?.match(/^github_models (\d{3})/)?.[1] ?? (ok ? 200 : 'n/a');
  const preview = (slot7?.raw_output ?? slot7?.error ?? '').slice(0, 200).replace(/\s+/g, ' ');

  process.stdout.write(
    `slot=7 provider=github_models model=${slot7?.model ?? 'github_models:microsoft/phi-4-mini-instruct'} ` +
    `status=${status} latency_ms=${slot7?.latency_ms ?? total_ms} http=${http} ` +
    `content_len=${contentLen}\n`,
  );
  process.stdout.write(`content/error preview: ${preview}\n`);

  process.exit(ok ? 0 : 1);
}

main();
