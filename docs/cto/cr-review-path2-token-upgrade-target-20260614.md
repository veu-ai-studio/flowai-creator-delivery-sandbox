# CR Review Prompt - Path 2 Token + Upgrade Target Fix

Reviewer: CR
Supervisor: CTO
Branch: `fix/path2-production-token-upgrade-target`
Base: `origin/main` at `b118ad7`

## Review Scope

Review for correctness, safety, evidence honesty, and regression risk:
- `src/lib/agents/renewal/orchestrator.js`
- `src/lib/products/upgradeTargetResolver.js`
- `tests/agents/renewal/orchestrator.test.js`
- `tests/products-upgrade-target-resolver.test.js`

## Findings To Confirm Or Block

Confirm:
- Fallback from failed GitHub App signing to operator token is logged as fallback context, not fabricated GitHub App success.
- No token value can appear in Step 6 or Step 8 logs, including the tree `sha` field.
- Unsafe RelTwin-shaped target resolution stops before `createRenewalBranch`.
- The patch does not relabel fallback context as observed deployment/branch evidence.
- No ProductSSOT, matrixArtifact, VERIFIED, WIRED, or canonical SSOT changes are made.
- Test additions cover the exact CR risk: same-repo read-only write block and operator-token redaction.

## Evidence To Review

Read:
- `docs/cto/path2-token-upgrade-target-fix-evidence-20260614.md`

Verification now includes focused PASS and full `npm run preflight` PASS. Confirm whether this is sufficient for merge clearance or report any blocking finding.

Return: `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`.
