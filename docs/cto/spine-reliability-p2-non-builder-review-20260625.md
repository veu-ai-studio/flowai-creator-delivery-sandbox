# Spine Reliability P2 Non-Builder Review - 2026-06-25

## Reviewer

Independent non-builder reviewer: `Averroes` (`019efd67-7b8c-7081-8200-f40c71504c2f`)

Recorded by CTO from the non-builder review output. CTO authored the P1 implementation and does not self-certify the merge.

## Reviewed Scope

Branch:

`origin/feature/spine-reliability-failover`

Implementation under review:

`d26ad6e` - `forge | close remaining spine failover gaps`

Dispatch under review:

`9ca5a44` - `docs/cto | dispatch spine reliability p2 review`

## Part A - Live Proof From Origin

Verdict:

`A PASS`

Reviewer finding:

Raw SSE from origin shows the live sequence, not only the CTO conclusion. Evidence shows selected unavailable candidates, Browserless selected then timed out, Playwright selected next then timed out, ranked candidates exhausted, then fail-fast with `RESEARCH_EVIDENCE_UNAVAILABLE`.

Raw evidence snippets inspected:

- `docs/cto/spine-reliability-live-victorudo-20260625T054658Z.sse:67`: Browserless `state:"selected"`.
- `docs/cto/spine-reliability-live-victorudo-20260625T054658Z.sse:69`: Browserless `state:"timeout"`, `tool dispatch timed out after 5000ms`.
- `docs/cto/spine-reliability-live-victorudo-20260625T054658Z.sse:71`: Playwright selected after Browserless.
- `docs/cto/spine-reliability-live-victorudo-20260625T054658Z.sse:77`: `state:"final_failed"`, all ranked candidates exhausted.
- `docs/cto/spine-reliability-live-victorudo-20260625T054658Z.sse:91`: final `ok:false`, `failedStep:"STEP_3"`, `code:"RESEARCH_EVIDENCE_UNAVAILABLE"`.

## Part B - P1 Gap Fixes

Verdict:

`B PASS`

Reviewer finding:

P1 gaps appear closed in origin after `d26ad6e`.

Files/functions inspected:

- `src/lib/forge/auditRunner.js:226`: `runDimensionScores` now uses `runRankedToolWithFailover`.
- `src/lib/forge/designRunner.js:195`: `runLiveDesign` now uses `runRankedToolWithFailover`.
- `src/lib/forge/stepOwnerRecommendations.js:61`: step-owner invocation is bounded by `invokeWithTimeout`.
- `src/lib/forge/rankedToolFailover.js:101`: shared primitive iterates normalized candidates, records selected/unavailable/timeout/failed/succeeded, then throws exhausted fail-fast.
- `src/lib/forge/buildRunner.js:146`: `assertSelectedBuildMemberReady` still exists, but the reviewer found no runtime call that pre-empts the live build failover loop.
- `src/lib/forge/buildRunner.js:292`: live build path goes through `runLiveBuildTasks` -> `runRankedToolWithFailover`.

## Part C - Owed Security Review

Verdict:

`C BLOCK: OVER-BROAD`

Reviewer finding:

`FLOWAI_INTERNAL_SECRET` is appropriate for internal service bearer auth on agent/cron paths, but origin also accepts it as an operator secret via `x-flowai-operator-secret`.

What it authorizes:

- `api/_lib/auth.js:236`: `hasValidOperatorSecret` accepts `FLOWAI_OPERATOR_SECRET` or `FLOWAI_INTERNAL_SECRET`.
- `api/_lib/auth.js:252`: `requireOperatorAuth` grants authenticated `authMode:"operator-secret"` without Clerk/operator role.
- This covers `/api/forge/build`, migration-mode enable/disable, and runtime-dispatch proof.
- `src/api/run-construction.js:202`: also accepts it for `spineReliabilityProof`.

Scope judgment:

`OVER-BROAD`

Reason:

A general internal service secret becomes a cross-route operator-auth bypass, including build/mutation proof and operational toggles. Keep it for internal bearer-only service paths, but use a narrower proof/operator secret for operator routes.

## P2 Decision

`P2 BLOCK`

P3 merge remains blocked until Part C is narrowed or rolled back and then re-reviewed.

## CTO Closure Action

The CTO closure patch removes `FLOWAI_INTERNAL_SECRET` from operator-secret acceptance and leaves it available only on explicit internal bearer/cron/agent paths.

