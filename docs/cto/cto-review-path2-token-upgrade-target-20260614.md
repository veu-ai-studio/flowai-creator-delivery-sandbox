# CTO Review - Path 2 Token + Upgrade Target Fix - 2026-06-14

Branch: `fix/path2-production-token-upgrade-target`
Reviewed head: `c62f0e0`
Base: `origin/main` at `b118ad7`
Reviewer: CTO
Formal merge status: pending CD/CR PASS or W04 waiver

## Verdict

CTO technical review: PASS-WITH-GATE.

The branch is technically stronger than the previous production state and now has full `npm run preflight` PASS. I found no blocking code issue in the local review.

The formal merge gate remains pending because the required CD/CR external CLI review could not be run from this session: the app privacy guard rejected both Claude Code and Codex CLI reviewer invocations because they would transmit private branch code/review material to external model services. I did not bypass that guard.

## Verification Performed

Commands run locally on this branch:

- `node --check src\lib\agents\renewal\orchestrator.js` - PASS
- `node --check src\lib\products\upgradeTargetResolver.js` - PASS
- `npx vitest run tests\products-upgrade-target-resolver.test.js tests\agents\renewal\orchestrator.test.js` - PASS, 2 files / 139 tests
- `npm run preflight` - PASS
  - lint PASS
  - build:preflight PASS
  - full Vitest PASS: 236 files / 3733 tests, 3 skipped
  - lane discipline PASS: checked files 654, checked commits 389
  - SSOT traceability PASS with existing warnings
  - matrix artifact generation PASS; timestamp-only generated churn was discarded

## Code Review Findings

No blocking findings.

Checked:

- GitHub App signing failure can fall back to `GITHUB_OPERATOR_TOKEN` through `acquireRepoWriteCredential`.
- Fallback telemetry is explicit: `credentialSource`, `fallbackFrom`, `fallbackReason`, `operatorRepoProbeOk`, and `operatorRepoProbeReason`.
- Step 6 and Step 8 logs include `tokenRedacted:true` and do not include the raw token.
- Step 6 guards against a downstream/mock echo of the active token in `treeResult.sha` by nulling the logged sha when it equals the active token.
- Unsafe read-only same-repo upgrade targets are blocked in Step 9 before `_createRenewalBranch`.
- `UPGRADE_REPO_REQUIRED` and `UPGRADE_TARGET_UNSAFE` are surfaced as honest failure codes.
- Existing legacy single-repo behavior is preserved unless the product is explicitly fork/read-only or has an explicit upgrade repo.
- No canonical docs, ProductSSOT, matrixArtifact, VERIFIED, or WIRED movement is included.

## Non-Blocking Notes

- The fallback intentionally tries `GITHUB_OPERATOR_TOKEN` even when the repo probe is degraded or false. That is acceptable for the immediate GitHub App PEM failure, because unsafe RelTwin-shaped writes are stopped before branch creation by the new Step 9 write-safety guard.
- This branch does not itself create a safe RelTwin upgrade repository. After merge and production promotion, the expected honest RelTwin result is either branch creation against a safe upgrade repo or a clear `UPGRADE_TARGET_UNSAFE` / `UPGRADE_REPO_REQUIRED` stop before branch creation.

## Required Next Decision

Do not merge solely on this CTO review if the CD/CR gate remains mandatory.

Acceptable next paths:

1. CD and CR review the branch from origin and return PASS/PASS-WITH-FINDINGS.
2. W04 issues a documented waiver of CD/CR for this branch based on CTO local review plus full green preflight.
3. Victor explicitly approves transmitting private branch code to the external Claude/Codex reviewer CLIs after being informed of the privacy risk.

After clearance: merge, promote production, confirm `/api/health`, rerun constrained RelTwin Production proof, and report whether the forge reaches branch creation or stops honestly at upgrade-target safety.
