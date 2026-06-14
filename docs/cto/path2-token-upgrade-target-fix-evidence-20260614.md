# Path 2 Token + Upgrade Target Fix Evidence - 2026-06-14

Branch: `fix/path2-production-token-upgrade-target`
Base: `origin/main` at `7bc95bb`

## Scope

This runtime patch addresses the RelTwin Path 2 proof failure without moving VERIFIED/WIRED evidence and without changing canonical SSOT docs.

Changes:
- GitHub credential acquisition now falls back to `GITHUB_OPERATOR_TOKEN` when GitHub App installation-token minting fails and an operator token is present.
- Step 6 and Step 8 credential logs record redacted credential source/fallback metadata only.
- Step 6 redacts a tree `sha` if a downstream/mock response echoes the active token.
- Upgrade target resolution now emits explicit write-safety metadata.
- Step 9 blocks branch/file writes with `UPGRADE_REPO_REQUIRED` or `UPGRADE_TARGET_UNSAFE` before branch creation when an explicit fork/read-only product resolves to an unsafe target.
- Resolver reuses its existing `__upgradeTargets` envelope on re-entry so legacy single-repo tests are not falsely converted into explicit fork-target failures.

## Why

RelTwin Path 2 proof evidence showed:
- `GITHUB_OPERATOR_TOKEN` was present.
- GitHub App signing failed with `signAppJwt: RS256 signing failed`.
- The resolved RelTwin upgrade repo was identical to its read-only original repo.

The honest behavior is:
- Do not stop at GitHub App signing if an operator token can be tried.
- Do not write to a read-only original repo when the upgrade target is missing or unsafe.

## Verification

PASS:
- `node --check src\lib\agents\renewal\orchestrator.js`
- `node --check src\lib\products\upgradeTargetResolver.js`
- `npx vitest run tests\products-upgrade-target-resolver.test.js tests\agents\renewal\orchestrator.test.js`
  - 2 files passed
  - 139 tests passed
- `node scripts\checkLaneDiscipline.js`
  - `lane_discipline_passed`
  - checked files: 644
  - checked commits: 382
- `node scripts\check-ssot-traceability.mjs`
  - result: PASS
  - warnings remain existing traceability warnings, not introduced by this patch.

PARTIAL / BLOCKED:
- `npm run preflight` reached lint, build, and full Vitest, then failed one smoke test:
  - `tests/smoke/api-health.test.js > POST /api/test-claude > returns Claude response`
  - expected `200`, received `500`
  - full Vitest tally before stop: 235 files passed, 1 failed; 3732 tests passed, 1 failed, 3 skipped.
  - This appears external/Claude smoke environment related and outside touched paths. It is not waived here; CD/CR should decide whether it is blocking for this runtime branch.

## No Movement

No changes were made to:
- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `matrixArtifact`
- VERIFIED/WIRED statuses

