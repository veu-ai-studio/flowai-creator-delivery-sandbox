# CB Dispatch - Path 2 Production Token And Upgrade Target Chain

FROM: CTO
TO: CB
DATE: 2026-06-14 UTC
PRIORITY: P0 after Path 3 public URL milestone
SUGGESTED BRANCH: `fix/path2-production-token-upgrade-target`
VERIFIED movement: no
canonical docs: do not edit
matrixArtifact: do not edit

## Required Reading

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/current-directive.md`
5. `docs/cto/session-brief.md`
6. `docs/cto/path2-production-rerun-result-20260614.md`
7. Evidence:
   - `docs/cto/path2-saige-v2-production-rerun-20260614/`
   - `docs/cto/path2-reltwin-production-proof-20260614/`

## Problem

Path 2 Production still lacks a CT2-confirmed deployed URL.

Latest constrained reruns show two different outcomes:

- SAIGE v2 scored `98` and ended honestly with `HONEST_GATE_REFUSAL_ALREADY_PASSING`; no mutation should be forced.
- RelTwin scored `71.5`, but failed before branch creation with `GITHUB_AUTH_FAILED`.

The RelTwin run also revealed an upgrade-target safety problem: the target envelope resolved `originalRepo` and `upgradeRepo` to the same repo, while reporting `writesOriginalRepo:true` and `originalReadOnly:true`.

## Required Diagnosis Before Patch

Map the full chain from Product Discovery to Branch Creation for non-SAIGE registered products:

1. Where GitHub token acquisition selects GitHub App signing vs `GITHUB_OPERATOR_TOKEN`.
2. Why Fresh Build can write using operator-token paths while Production Path 2 RelTwin fails on `signAppJwt`.
3. Whether Production mode has an operator-token fallback after GitHub App signing failure.
4. Whether fallback is allowed under BUILD_PROTOCOL without weakening auditability.
5. How `upgradeTargetResolver` and `upgradeTargetProvisioner` handle non-SAIGE products whose original and upgrade repo are identical.
6. Whether branch creation is currently allowed when `writesOriginalRepo:true` and `originalReadOnly:true`.
7. Which Vercel project ID or project name Production mode uses for RelTwin, PressAI, ReachSMS, and MyPregLife.
8. Whether missing product-specific Vercel config should block before branch creation or be provisioned safely.

## Required Behavior

Implement the smallest safe patch that enables Path 2 to proceed honestly:

- If GitHub App signing fails but `GITHUB_OPERATOR_TOKEN` is present and authorized, use the operator token as an explicit fallback with evidence metadata such as `credentialSource:"GITHUB_OPERATOR_TOKEN"`.
- Never print, persist, or return token values.
- Do not write to a protected original repo when original and upgrade repo are the same and the target is marked read-only.
- If an upgrade repo is required but missing, return a clear blocked state such as `UPGRADE_REPO_REQUIRED` or `UPGRADE_TARGET_UNSAFE`, not a misleading `STEP_FAILED`.
- If a safe upgrade repo exists or is provisioned, proceed to branch creation using that repo.
- Preserve all source-map, platform-boundary, repair-integrity, parse, diff-preserve, auth, secret, package, branch, deploy, governance, and SSOT gates.

## Tests Required

At minimum:

1. GitHub App signing failure with valid operator token falls back to operator token and records the credential source without exposing secrets.
2. GitHub App signing failure without operator token remains a hard auth failure.
3. Same original/upgrade repo with `originalReadOnly:true` blocks before branch creation with an explicit safe code.
4. A safe upgrade repo path reaches branch creation in a mocked Production Path 2 flow.
5. Existing SAIGE Path 2 source-map/platform-boundary tests still pass.
6. Fresh Build token/deploy tests remain green.

Run focused tests for touched modules plus `npm run build:preflight`. If full `npm run preflight` is still blocked by live `/api/test-claude`, document that boundary exactly and include all passing focused suites.

## Proof Required After Patch

After CD/CR review and merge, rerun one constrained Production Path 2 proof:

```powershell
node scripts/cto/saige-sse-proof.mjs --run-live --base-url https://flowai-dun.vercel.app --product-scope reltwin --url https://reltwin.com --max-iterations 1 --gtm-target 95 --mode auto --run-id <new-run-id> --timeout-ms 900000 --fail-on-incomplete
```

If RelTwin remains blocked because it needs an explicit upgrade repo or Vercel project config, report the exact missing config and the safest machine-actionable provisioning path. Do not ask Victor to do dashboard work unless it cannot be safely automated.

## Stop Conditions

Stop and report if the only possible path would:

- write to an original read-only product repo,
- disable a platform/auth/security boundary,
- hide a credential or preview-access failure,
- fabricate a branch or deployed URL,
- move VERIFIED without W04/CEO authorization.
