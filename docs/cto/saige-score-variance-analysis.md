# SAIGE Score Variance Analysis

Date: 2026-06-11
Base repo: `C:\Users\victo\Downloads\truthful-flow-logic-lab`
Evidence folder: `C:\Users\victo\Documents\Codex\flowai-verification\evidence`

## Executive Answer

The observed `71` versus `78` is not random scoring drift. In the latest boundary run, `78` is the early surface-only GTM score (`preGtmSurfaceOnly.score`) and `71` is the terminal canonical run score after deeper evidence and boundary handling.

No final payload inspected here sets `scoreEvidenceDegraded`, `preScoreDegraded`, or `postScoreDegraded`. The honest evidence limitation is coverage: both complete SAIGE runs scored only `5/10` dimensions, with `coverageConfidence=0.5` and `meetsMinimumCoverage=false`.

Evidence quality can affect score and trust presentation. The `PLATFORM_BOUNDARY_BLOCKED` gate itself is not a numeric threshold; it is triggered by source mapping/prioritization resolving a finding to a forbidden platform file.

## Evidence Table

| Artifact | Terminal score | Surface-only score | Exit reason | Branch | Boundary |
| --- | ---: | ---: | --- | --- | --- |
| `cto-saige-sse-proof-20260611185806.sse` | 73 | 80 | `MAX_ITERATIONS` | yes | none |
| `cto-saige-sse-proof-20260612003407.sse` | 71 | 78 | `PLATFORM_BOUNDARY_BLOCKED` | no | `src/api/base44Client.js`, `base44_client_internal`, stage `prioritization` |
| `cto-saige-llm-proof-20260610215015.sse` | 71 | 78 | `PLATFORM_BOUNDARY_BLOCKED` | no | `src/api/base44Client.js`, `base44_client_internal`, stage `prioritization` |

Summary JSON milestone comparison:

| Summary | Verdict | Final score | Branch creation | Preview deployment | Post-fix scoring | Governance write | ProductSSOT persistence |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| `cto-saige-primary-retry-proof-20260611-0909.summary.json` | `INCOMPLETE_STREAM` | null | false | false | false | false | false |
| `cto-saige-sse-proof-20260611185806.corrected.summary.json` | `END_TO_END_COMPLETE` | 73 | true | true | true | true | true |
| `cto-saige-sse-proof-20260612003407.summary.json` | `TERMINAL_FINAL_INCOMPLETE_MILESTONES` | 71 | false | true | true | true | true |

## What The 78 Means

In `cto-saige-sse-proof-20260612003407.sse`:

- `preGtmSurfaceOnly.score=78`
- `preGtm.score=71`
- `originalScore=71`
- `rawScore=71`
- `finalScore=71`
- `effectiveTrustScore=35.5`
- `coverageConfidence=0.5`
- `scoredDimensions=5`
- `totalDimensions=10`
- `meetsMinimumCoverage=false`

So `78` is a partial early surface read. It should not be presented as the final forge score. The canonical score for that run is `71`.

## Is Degraded Evidence Causing Inconsistency?

Partly, but not in the sense of a failed scoring service.

The final payloads do not show `scoreEvidenceDegraded`, `preScoreDegraded`, or `postScoreDegraded` flags. The variance is mostly explained by pipeline stage:

- Surface-only scoring is higher because it relies on the early crawl/GTM view.
- Terminal scoring is lower because deeper evidence, source mapping, runtime findings, coverage limits, and fixability boundaries are included.
- Both complete runs are below the minimum GTM coverage threshold: `5/10` scored dimensions versus the minimum `7`.

The gate failure itself is deterministic:

- Latest first boundary: `src/api/base44Client.js`
- Reason: `base44_client_internal`
- Stage: `prioritization`
- Exit reason: `PLATFORM_BOUNDARY_BLOCKED`

## CTO Interpretation

The scoring display/proof artifacts should distinguish:

- Early surface-only GTM score.
- Canonical terminal score.
- Effective trust score after coverage.
- Coverage status and minimum-coverage failure.
- Mutation boundary exit reason.

The next CB dispatch should not treat `71` versus `78` as a scoring bug unless a UI or artifact labels the surface-only value as the final score. The actionable engineering issue is that the fix pipeline can map a public SAIGE problem to `src/api/base44Client.js`, which is rightly blocked. The next build must route safe app-layer fixes around that boundary or record a clean governance/manual platform refusal.
