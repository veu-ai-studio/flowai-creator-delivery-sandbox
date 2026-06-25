# Build Failover Watchable Production Rerun Implementation

Date: 2026-06-25
Branch: `feature/build-failover-production-proof`

## Purpose

Make the preview-proven Build failover proof watchable from Flow Hub before production adjudication.

Production watch URL after merge and promotion:

https://flowai-dun.vercel.app/flow-hub/production?buildFailoverProof=1

Victor action after production identity is confirmed:

1. Open the watch URL in a fresh browser.
2. Click `Run Proof`.
3. Watch the live attempt sequence:
   - Codex selected
   - Codex timeout
   - Claude Code selected
   - Claude Code recovered
4. Open the deployed output link shown at the end.

## Implementation

- Added `POST /api/forge/build-failover-proof` as a fixed-purpose SSE stream.
- The endpoint keeps credentials server-side and enters the real `runBuild` path.
- The endpoint forces the selected Codex `code-patch` dispatch to hang once.
- `runBuild` now accepts `onToolAttempt` and forwards it into `runRankedToolWithFailover`.
- Flow Hub renders `BuildFailoverProofPanel` only when `?buildFailoverProof=1` is present.
- Fixed stale generated deploy title from `FlowAI M2 Deploy Chain Proof` to `FlowAI Deploy Chain Proof`.

## Claim Boundary

This does not move the production claim by itself.

The maximum implementation claim before production rerun is:

`BUILD FAILOVER — WATCHABLE PRODUCTION RERUN READY`

The production claim requires:

- merge to `main`
- promotion to `flowai-dun`
- `/api/version` reporting the merge commit
- Victor-visible live run from the watch URL
- CT2/non-builder adjudication from live SSE and origin artifacts

## Verification

- `node --check api/forge/build-failover-proof.js` PASS
- `node --check api/forge-build-failover-proof.js` PASS
- `node --check src/lib/forge/buildRunner.js` PASS
- `node --check api/_lib/deployChainWorker.js` PASS
- `npx vitest run tests/forge/rankedToolFailover.test.js tests/forge/buildStep.test.js tests/deployChainWorker.test.js tests/forgeBuildApi.test.js` PASS, 48/48
- `npm run lint:evidence` PASS
- `npm run build:preflight` PASS
