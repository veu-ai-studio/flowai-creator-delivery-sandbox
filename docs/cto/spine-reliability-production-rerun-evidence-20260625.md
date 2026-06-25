# Spine Reliability Production Rerun Evidence - 2026-06-25

## Status

P4 production rerun captured at CTO level. Non-builder adjudication is still required before claim movement.

Production URL:

[flowai-dun.vercel.app](https://flowai-dun.vercel.app/)

Production identity evidence:

`docs/cto/spine-reliability-production-version-20260625.json`

Confirmed `/api/version`:

- commit: `73864fe973d2`
- commitFull: `73864fe973d22ba3e328e529deba97b88f87d0d4`
- branch: `main`
- deployUrl: `flowai-kmheohs1u-veu-ai-studio.vercel.app`
- buildIdentitySource: `generated:git-or-env`

## Pre-Run Gate Notes

P2 passed before production rerun:

- Part A: live preview proof raw SSE PASS.
- Part B: P1 gap fixes PASS.
- Part C: security review initially BLOCKED, then re-reviewed APPROPRIATE after `FLOWAI_INTERNAL_SECRET` was removed from operator-secret acceptance.

Operational identity fix:

- `scripts/write-build-info.mjs` now prefers explicit `FLOWAI_EXPECTED_HEAD` over stale Vercel git metadata during controlled CLI deployments.
- Production was force-deployed with explicit build identity and dedicated `FLOWAI_OPERATOR_SECRET`.

## Run 1 - victorudo.com

Input:

[victorudo.com](https://victorudo.com/)

Run ID:

`spine-prod-victorudo-20260625T070838Z`

Raw SSE:

`docs/cto/spine-prod-victorudo-20260625T070838Z.sse`

Observed result:

- Route: production `POST /api/run-construction`
- Forced Research hang enabled.
- Browserless reached callable candidate and timed out after `5000ms`.
- Playwright was attempted after Browserless.
- Run did not hang.
- Run did not continue into a degraded 100/showcase-ready state.
- Run did not fire `ALREADY_AT_TARGET`.
- Final outcome: `ok:false`, `failedStep:"STEP_3"`, `code:"RESEARCH_EVIDENCE_UNAVAILABLE"`, `finalScore:0`, `gtmReady:false`.

Important nuance:

The visible attempt events include the forced timeout/failover sequence. The final Deep Crawl failure artifact records exhausted candidates with unavailable/failed details. Non-builder review should inspect the raw SSE sequence rather than relying only on the final artifact.

## Run 2 - ourcommunitiesai.com

Input:

[ourcommunitiesai.com](https://ourcommunitiesai.com/)

Run ID:

`spine-prod-ourcommunitiesai-20260625T070920Z`

Raw SSE:

`docs/cto/spine-prod-ourcommunitiesai-20260625T070920Z.sse`

Observed result:

- Route: production `POST /api/run-construction`
- Forced Research hang enabled.
- Browserless reached callable candidate and timed out after `5000ms`.
- Playwright was attempted after Browserless.
- A visible production failover envelope selected Playwright as fallback after Browserless timeout.
- The run did not hang.
- The run did not continue into a degraded 100/showcase-ready state.
- The run did not fire `ALREADY_AT_TARGET`.
- Final outcome: `ok:false`, `failedStep:"STEP_3"`, `code:"RESEARCH_EVIDENCE_UNAVAILABLE"`, `finalScore:0`, `gtmReady:false`.

Important nuance:

This was the previously hung class of case. It now terminates visibly. The fallback crawl could not produce usable evidence because `ourcommunitiesai.com` resolution/crawl failed (`getaddrinfo ENOTFOUND` / `net::ERR_NAME_NOT_RESOLVED` appears in the raw SSE). That is a fail-fast outcome, not a successful recovery-to-good-evidence outcome.

## Acceptance Check At CTO Capture Level

Passed:

- Production identity gate confirmed before rerun.
- Both runs used production `flowai-dun.vercel.app` on `main`.
- Both runs surfaced attempt history in raw SSE.
- Forced hung callable Research candidate timed out within the `5000ms` bound.
- Failover/fallback was attempted after the timeout.
- Neither run hung indefinitely.
- Neither run reported degraded `100`.
- Neither run reported `showcase-ready`.
- Neither run fired `ALREADY_AT_TARGET` on degraded evidence.
- Both runs failed fast visibly when Research evidence was unavailable.

Not proven:

- Recovery-to-good-evidence for `victorudo.com`.
- Build failover in a live production run.
- Creator, Upgrader, Universal Engine, or VERIFIED movement.
- Full end-to-end deployed product generation from this proof.

## Recommended Claim Boundary

If non-builder adjudication confirms the raw evidence:

`ORCHESTRATOR SPINE RELIABILITY - IN PRODUCTION (Research path, forced timeout -> failover/fallback -> fail-fast honesty held)`

Scope limit:

This proves the failover-then-fail-fast-honestly branch for Research in the narrow web-app slice. It does not prove failover-then-recover-to-good-evidence, Build failover, Creator, Upgrader, or Universal Engine.

