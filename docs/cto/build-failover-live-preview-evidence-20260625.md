# Build Failover Live Preview Evidence - 2026-06-25

## Verdict

BUILD FAILOVER is live-proven on the feature-branch preview runtime.

Production claim does not move yet. To claim `BUILD FAILOVER - IN PRODUCTION`, this branch still needs non-builder review, merge/promotion to `flowai-dun`, deploy identity confirmation, and the same proof rerun on production.

## Code Under Test

- FlowAI branch: `feature/build-failover-production-proof`
- FlowAI commit: `78b155866c0338764648c468fc4f2200dedf50e6`
- Runtime URL: https://flowai-kuz5wecuk-veu-ai-studio.vercel.app
- Runtime identity: `/api/version` reported commit `78b155866c03`, branch `feature/build-failover-production-proof`, source `env:FLOWAI_EXPECTED_HEAD`
- Raw request: `docs/cto/build-failover-production-proof-request-20260625T173025Z.json`
- Raw response: `docs/cto/build-failover-production-proof-response-20260625T173025Z.json`
- Gate 0 record: `docs/cto/reliability-program-gate0-20260625.md`

## Proof Run

- proofRunId: `flowai-build-failover-20260625T173025Z-78b1558`
- buildRequestId: `request-flowai-build-failover-20260625T173025Z-78b1558`
- Endpoint: `POST /api/forge/build`
- Delivery mode: `DEPLOY_CHAIN_SANDBOX`
- Dedicated generated-app project: `flowai-build-failover-proof`
- SSO protection on generated-app project: disabled before successful rerun so CT2/Victor can open the URL without Vercel login

## Attempt History

The deployed endpoint entered the real Build path and recorded:

1. `Codex` selected, rank 1, member `codex`, credentials present.
2. `Codex` timed out after `5000ms` due to proof-only forced hang control.
3. `Claude Code` selected, rank 2, member `claude-code`, credentials present.
4. `Claude Code` succeeded and returned real `patchedContent`.

Evidence fields:

- `buildToolStatus`: `LIVE_BUILD_TOOL_FAILOVER_DISPATCHED_AND_MUTATED`
- `liveDispatches`: `2`
- `timeoutAttempts`: `1`
- selected recovered member: `claude-code`
- model used by recovered member: `claude-sonnet-4-6`
- usage: input `594`, output `133`

## Deployment Evidence

- Deploy sandbox repository: `veu-ai-studio/flowai-deploy-execution-sandbox`
- Sandbox commit: `3b297ec3fe7dab3f4b8265db79ed39e7bbc6e242`
- Sandbox commit URL: https://github.com/veu-ai-studio/flowai-deploy-execution-sandbox/commit/3b297ec3fe7dab3f4b8265db79ed39e7bbc6e242
- Deployment ID: `dpl_B53jgL1BKQtxktopspx6ouRWKewF`
- Deployment target: `production`
- Public generated app URL: https://flowai-build-failover-proof-db429iao3-veu-ai-studio.vercel.app

## Browser Evidence

Deploy-chain browser verification returned:

- `status`: `RUNTIME_URL_RENDER_CHECK_PASS`
- `httpStatus`: `200`
- `renderedDomTextContainsExpectedText`: `true`

Expected rendered text:

`FlowAI Build Failover recovered by Claude Code proofRunId: flowai-build-failover-20260625T173025Z-78b1558`

Independent curl read also confirmed the public URL renders:

`FlowAI Build Failover recovered by Claude Code`

and:

`flowai-build-failover-20260625T173025Z-78b1558`

## Code Changes in This Branch

- `api/forge/build.js`: added guarded proof-only `buildProofControls.forceHangOnce` support for deployed Build failover testing; bounds `toolDispatchTimeoutMs`; exposes test helpers.
- `api/_lib/deployChainWorker.js`: added dedicated approved proof project `flowai-build-failover-proof`.
- `tests/forgeBuildApi.test.js`: proves forced hang applies once to the named member and timeout override is bounded.
- `tests/deployChainWorker.test.js`: updates approved project allowlist expectation.
- `docs/cto/reliability-program-gate0-20260625.md`: records step classification, credential list, and matrix-collapse check.

## Verification

Local checks before live proof:

- `node --check api/forge/build.js` PASS
- `node --check api/_lib/deployChainWorker.js` PASS
- `npx vitest run tests/forge/rankedToolFailover.test.js tests/forge/buildStep.test.js tests/deployChainWorker.test.js tests/forgeBuildApi.test.js` PASS, 47/47
- `npm run lint:evidence` PASS
- `npm run build:preflight` PASS

## Claim Recommendation

Move only after non-builder review:

`BUILD FAILOVER - LIVE PREVIEW PROVEN (Codex forced hang -> 5000ms timeout -> Claude Code recovery -> sandbox commit -> public generated app URL).`

Do not move yet:

- `BUILD FAILOVER - IN PRODUCTION`
- `CREATOR_VERIFIED`
- `UPGRADER_VERIFIED`
- `UNIVERSAL_ENGINE_VERIFIED`
- full 8-step reliability
- persistence
- behavioral product improvement

## Remaining Work

1. Non-builder review from origin.
2. Merge/promote to production only after review.
3. Confirm `flowai-dun.vercel.app/api/version` reports the merge commit.
4. Rerun the same forced Build failover proof on production.
5. If production rerun matches this preview evidence, claim can move to:

`BUILD FAILOVER - IN PRODUCTION (Codex -> Claude Code, forced hang -> recover, honesty held).`

