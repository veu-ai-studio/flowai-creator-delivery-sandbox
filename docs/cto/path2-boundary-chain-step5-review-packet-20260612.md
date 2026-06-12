# Step 5 Review Packet - Path 2 Boundary Chain Repair

Date: 2026-06-12
From: CTO
To: CD, CR
Review target: `fix/path2-platform-boundary-chain`
Target commit: `4290b39312e69087be8cd3a09bb3a68efef4802a`
Base: `origin/main` at `21109fee0ae30d381923d4422da3f107d41cd8a1`
Review verdict requested: PASS / PASS-WITH-FINDINGS / BLOCK

## Required Reading

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/cb-path2-platform-boundary-chain-dispatch-20260612.md`
5. `docs/cto/platform-boundary-chain-analysis.md`
6. `docs/cto/path2-saige-v2-production-proof-20260612.md`
7. This packet

## Runtime Branch Summary

CB built and pushed the Path 2 boundary-chain repair:

- Branch: `fix/path2-platform-boundary-chain`
- Commit: `4290b39312e69087be8cd3a09bb3a68efef4802a`
- PR URL: `https://github.com/victor2081new-cloud/flowai/pull/new/fix/path2-platform-boundary-chain`

Files changed:

- `src/lib/agents/renewal/orchestrator.js`
- `src/lib/sourceMapping/registeredRepoSourceMapper.js`
- `src/lib/sourceMapping/sourceMappedFixGenerator.js`
- `tests/agents/renewal/orchestrator.test.js`
- `tests/sourceMapping/registeredRepoSourceMapper.test.js`

Diff size:

- 5 files changed
- 336 insertions
- 30 deletions

## Problem Being Fixed

Path 2 live proof targeted the migrated app-layer URL:

- URL: `https://saige-v2.vercel.app`
- Run ID: `cto-path2-saige-v2-20260612-0450`

The run still ended with:

- Exit reason: `PLATFORM_BOUNDARY_BLOCKED`
- Branch: none
- Delivery URL: none
- Final score: `54.5`

The conclusion was that simply enabling `FLOWAI_ENABLE_LLM_FIXES=true` and targeting `saige-v2` is insufficient. FlowAI must separate true observed evidence from fallback/run context all the way through source mapping, prioritization, LLM prompt construction, fix eligibility, and branch creation.

## CB Reported Fix

CB reports the repair does the following:

- Keeps fallback/run URL context separate from observed finding URL evidence.
- Stops treating `url` as observed evidence unless explicitly marked.
- Threads active target URL into source mapping.
- Prevents Claude-returned missing `filePath` from defaulting to `README.md`.
- Allows observed `saige-v2` app-layer findings to map to safe repo files.
- Preserves Base44/platform/auth guards unchanged.

CB reports the exact gate fixed as U4/U5 source mapping and the Step 6/7 handoff.

## CB Reported Verification

CB reports:

- `node --check` on edited runtime files: PASS
- Focused Vitest:
  - `tests/sourceMapping/registeredRepoSourceMapper.test.js`
  - `tests/sourceMapping/sourceMappedFixGenerator.test.js`
  - `tests/agents/renewal/orchestrator.test.js`
  - Result: 151 passed
- `npm run preflight`: PASS
  - Full Vitest: 231 files passed, 3667 passed, 3 skipped
- Preflight regenerated `matrixArtifact.json`; CB restored it and did not commit matrix/doc/VERIFIED artifact changes.

## Claimed Behavioral Proof

CB claims:

- Mocked safe app-layer `saige-v2` finding now reaches `_createRenewalBranch`.
- Forbidden `src/api/base44Client.js` still blocks with no branch/deploy claim even with `FLOWAI_ENABLE_LLM_FIXES=true`.
- Live Path 2 proof still needs rerun after review/merge/deploy.

## Review Focus

Reviewers should confirm:

1. Fallback/run URL context is never promoted to observed evidence.
2. `url` is only observed evidence when explicitly marked as such.
3. Active-target host filtering does not break legitimate observed `location`, `pageUrl`, `failingUrl`, or `observedUrl` evidence.
4. Removing the default `README.md` fallback for missing `filePath` does not create unsafe no-fix behavior or hidden regressions.
5. Safe app-layer `saige-v2` findings can reach branch creation in mocked tests.
6. Base44/platform/auth boundary refusal remains intact.
7. Final no-branch/no-deploy payload honesty remains intact.
8. No canonical docs, SSOT matrix artifacts, matrixArtifact, VERIFIED state, env, or production deployment changed.
9. Tests cover the exact prior failure class strongly enough for merge pending live proof.

## Merge Gate

Do not merge unless:

- CD and CR both PASS or PASS-WITH-FINDINGS with no blocker.
- Any reviewer finding is documented.
- CTO confirms live proof is still required after merge/deploy before any VERIFIED movement.

## Required Output

Each reviewer should write:

- PASS / PASS-WITH-FINDINGS / BLOCK
- Findings with file/line references where applicable
- Tests reviewed or run
- Residual risk
- Whether merge is acceptable before live Path 2 proof rerun

No VERIFIED movement is authorized by this review.
