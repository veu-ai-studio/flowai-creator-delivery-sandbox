# Spine Reliability Live Proof - victorudo.com

## Status

Outcome: LIVE FAIL-FAST VERIFIED AT CTO CAPTURE LEVEL; non-builder adjudication still required before any claim movement.

The deployed production-route proof did not hang and did not continue into empty degraded scoring. It stopped visibly with `RESEARCH_EVIDENCE_UNAVAILABLE` after ranked Research candidates were exhausted.

## Deployment Identity Gate

- Branch under proof: `feature/spine-reliability-failover`
- Code commit under proof: `1b81c9ceda37e6cafd6597998ac4502aece8bc4f`
- Deployed target: `https://flowai-blcyxvmgt-veu-ai-studio.vercel.app`
- `/api/version` commit: `1b81c9ceda37`
- `/api/version` branch: `feature/spine-reliability-failover`
- Build identity source: `generated:git-or-env`
- Version checked: `2026-06-25T05:46:42.263Z`

Invalid/stale deployment notes:

- `https://flowai-3jmiy9szn-veu-ai-studio.vercel.app` reported correct commit but lacked matching proof operator secret.
- `https://flowai-a3pv3r7sh-veu-ai-studio.vercel.app` and `https://flowai-4hw5cwgo2-veu-ai-studio.vercel.app` had proof env but failed the commit identity gate (`commit:null`).
- Valid proof target is only `https://flowai-blcyxvmgt-veu-ai-studio.vercel.app`.

## Live Run

- Input URL: `https://victorudo.com`
- Route: `POST /api/run-construction`
- Flow Hub path: `production`
- Structural layer: `autonomous`
- Operational mode: `auto`
- Analysis depth: `quick`
- Forced proof: `spineReliabilityProof=true`
- Forced Research hang: `forceResearchToolHang=true`
- Timeout bound: `5000ms`
- Run ID: `spine-live-victorudo-20260625T054658Z`
- Raw SSE evidence: `docs/cto/spine-reliability-live-victorudo-20260625T054658Z.sse`

## Observed Attempt History

The live run exposed ranked Research attempts on the deployed route:

1. `Perplexity AI` selected, then unavailable: `Tool is not an admitted Orchestra member for P13-A`; `PERPLEXITY_API_KEY=MISSING`.
2. `Tavily` selected, then unavailable: not an admitted Orchestra member.
3. `Exa` selected, then unavailable: not an admitted Orchestra member.
4. `SerpAPI` selected, then unavailable: not an admitted Orchestra member.
5. `You.com` selected, then unavailable: not an admitted Orchestra member.
6. `Browserless` selected as callable, then timeout observed in the live stream: `tool dispatch timed out after 5000ms`.
7. `Playwright` selected after Browserless, then timeout observed in the live stream: `tool dispatch timed out after 5000ms`.
8. Final Research state: `final_failed`, reason `All ranked candidates exhausted without a successful dispatch.`

The final Step 3 event recorded:

- Step: `Deep Crawl`
- Tool: `Ranked Research crawl dispatch -> crawlOutputAdapter`
- Status: `failed`
- Code: `RESEARCH_EVIDENCE_UNAVAILABLE`
- Why: `research evidence unavailable; refusing to score degraded empty crawl evidence`

## Final Result

The terminal SSE event was:

- `ok=false`
- `exitReason=STEP_FAILED`
- `failedStep=STEP_3`
- `code=RESEARCH_EVIDENCE_UNAVAILABLE`
- `finalScore=0`
- `gtmReady=false`
- `coverageConfidence=null`
- `rawScore=0`
- `effectiveTrustScore=0`
- `iterationsCompleted=0`

## Acceptance Check

Passes at CTO capture level:

- Deployed route was identity-gated before proof.
- The live route accepted the forced proof request.
- Attempt history was visible in the SSE stream.
- A callable Research candidate timed out within the configured `5000ms` bound.
- The run attempted the next ranked callable candidate.
- The run did not hang indefinitely.
- The run did not continue into scoring with empty degraded Research evidence.
- The run did not report `100`.
- The run did not report `showcase-ready`.
- The run did not fire `ALREADY_AT_TARGET`.
- The run failed fast with `RESEARCH_EVIDENCE_UNAVAILABLE`.

Open for non-builder adjudication:

- CT2 or another non-builder must independently read the origin evidence and confirm the raw SSE chain before W04 moves any claim.
- This proof covers the Research step on the deployed `/api/run-construction` route only.
- It does not prove Build failover, Creator, Upgrader, Universal Engine, or VERIFIED movement.

## Recommended Claim Boundary

If independently confirmed, the maximum earned claim is:

`ORCHESTRATOR SPINE RELIABILITY DEMONSTRATED (Research step, deployed production route, forced timeout/fail-fast behavior)`

No other claim should move.
