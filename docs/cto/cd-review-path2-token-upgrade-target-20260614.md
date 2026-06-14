# CD Review Prompt - Path 2 Token + Upgrade Target Fix

Reviewer: CD
Supervisor: CTO
Branch: `fix/path2-production-token-upgrade-target`
Base: `origin/main` at `7bc95bb`

## Review Scope

Review the runtime patch for architecture and implementation correctness:
- `src/lib/agents/renewal/orchestrator.js`
- `src/lib/products/upgradeTargetResolver.js`
- `tests/agents/renewal/orchestrator.test.js`
- `tests/products-upgrade-target-resolver.test.js`

## Required Checks

Confirm:
- GitHub App signing failure can fall back to `GITHUB_OPERATOR_TOKEN` without leaking the token into logs.
- The fallback does not bypass repair integrity, parse, platform-boundary, branch, deploy, PR, governance, or approval gates.
- Explicit fork/read-only products cannot write to the original repo when `upgradeRepo === originalRepo`.
- The failure code is honest: `UPGRADE_REPO_REQUIRED` or `UPGRADE_TARGET_UNSAFE`, not a generic misleading branch failure.
- Legacy single-repo product behavior is not accidentally broken by the new safety metadata.
- No scoring, governance, canonical-doc, matrixArtifact, VERIFIED, or WIRED movement is included.

## Evidence To Review

Read:
- `docs/cto/path2-token-upgrade-target-fix-evidence-20260614.md`

Verification currently includes focused PASS and static PASS, with full preflight stopped by an unrelated Claude smoke 500. State whether that smoke failure is blocking or non-blocking for this branch.

Return: `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`.

