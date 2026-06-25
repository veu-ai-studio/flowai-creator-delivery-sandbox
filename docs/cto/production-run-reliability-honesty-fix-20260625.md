# Production Run Reliability + Honesty Fix — 2026-06-25

## Scope

Branch: `feature/spine-reliability-failover`

Base before this patch: `6624f61`

Production defect source: unforced production orchestration run on `victorudo.com`.

No capability claim moves from this packet. This is a code/test readiness packet for CT2 live verification.

## Defects Addressed

1. Real run path did not use ranked failover for `structured_crawl` or `pre_score_monitor_text`.
   The prior failover work protected proof seams, while normal `runOrchestration` still timed out, marked degraded, and continued.

2. Degraded/empty evidence could produce headline `gtmScore = 100` and trigger `honest_gate` refusal as `ALREADY_AT_TARGET`.
   The detailed CEO-95 `verifiedScore` remained lower, so the headline score was an unsafe false pass.

## Code Changes

- `src/lib/agents/renewal/gtmReadinessScorer.js`
  - Added coverage-aware low-confidence scoring.
  - Keeps raw subtractive score as `rawScore`.
  - Uses CEO-95 `verifiedScore` as primary `score` when coverage is degraded.
  - Returns `band: "low-confidence"`, `confidence: "LOW"`, `coverageDegraded: true`, and `reason: "SCORE_ON_DEGRADED_EVIDENCE"`.

- `src/lib/agents/renewal/orchestrator.js`
  - Wrapped production STEP 3 structured crawl in `runRankedToolWithFailover`.
  - Refuses to score if no candidate returns usable crawl evidence.
  - Wrapped pre-score monitor text in `runRankedToolWithFailover`.
  - Refuses to score crawl-only degraded monitor evidence.
  - Changed `honest_gate` current-run refusal to use `verifiedScore`, not surface/raw GTM score.
  - Emits `honest_gate_continue` with reason `COVERAGE_DEGRADED_CANNOT_CONFIRM_TARGET` when coverage is low-confidence.

## Tests Added / Updated

- `tests/agents/renewal/gtmReadinessScorer.test.js`
  - Degraded crawl-only coverage no longer returns showcase-ready false 100.

- `tests/agents/renewal/orchestrator.test.js`
  - Degraded raw 100 with `verifiedScore` below target does not trigger `ALREADY_AT_TARGET`.
  - Production STEP 3 crawl path times out first candidate and succeeds via fallback.
  - Production STEP 3 fails fast when all candidates return unusable evidence.
  - Monitor fetch failure and monitor timeout now fail fast before Step 6 instead of degrading into crawl-only scoring.

## Verification

- `node --check src/lib/agents/renewal/orchestrator.js` — PASS
- `node --check src/lib/agents/renewal/gtmReadinessScorer.js` — PASS
- `npx vitest run tests/agents/renewal/gtmReadinessScorer.test.js tests/agents/renewal/orchestrator.test.js` — PASS, 169/169
- `npm run build:preflight` — PASS
- `npm run lint:evidence` — PASS

## Remaining Live Acceptance

CT2 must rerun the same `victorudo.com` production job after deployment.

Pass condition:

- `structured_crawl` and `pre_score_monitor_text` either dispatch ranked fallback candidates and continue with usable evidence, or fail fast visibly with attempt history.
- No run may continue to scoring with degraded empty research evidence.
- Headline readiness must show low confidence / cannot confirm target when coverage is degraded.
- `honest_gate` must not emit `ALREADY_AT_TARGET` unless CEO-95 `verifiedScore >= 95` on non-degraded coverage.

