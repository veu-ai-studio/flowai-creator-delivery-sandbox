# CR Review Prompt - Fresh Build Public Delivery Target

FROM: CTO
TO: CR
ACTION: STEP 5 REVIEW - adversarial evidence/security/governance review
DATE: 2026-06-14 UTC

Read first:

- `docs/BUILD_PROTOCOL.md`
- `docs/CANONICAL_REFERENCE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/fresh-build-public-delivery-target-evidence-20260614.md`
- `docs/cto/ct2-live-proof-sweep-acceleration-result-20260614.md`

## Branch Under Review

- Branch: `fix/fresh-build-public-delivery-target`
- Runtime code commit: `c2991ed1235dc84d9b891fda1adc089bf9e6f524`
- Review HEAD: latest pushed tip of `origin/fix/fresh-build-public-delivery-target`
- Base: `origin/main` at or after `d9fc93e72edd`

Runtime files changed:

- `src/lib/agents/renewal/vercelBranchDeploy.js`
- `src/lib/freshBuild/freshBuildDeploymentAdapter.js`

Tests changed:

- `tests/agents/renewal/vercelBranchDeploy.test.js`
- `tests/freshBuild/freshBuildDeploymentAdapter.test.js`

## Adversarial Review Focus

Please check:

1. The patch does not fabricate public URL evidence.
2. It does not relabel a raw protected deployment URL as observed public evidence.
3. It does not use the Vercel bypass header for public-delivery proof.
4. It does not leak Vercel tokens, bypass secrets, GitHub tokens, Clerk secrets, raw tickets, cookies, bearer tokens, passwords, or raw user IDs.
5. It does not allow production-target deployment unless explicit public-delivery env is enabled.
6. It does not create an operator-app production replacement risk through default env fallback.
7. It preserves preview behavior and existing protected-preview bypass behavior outside public-delivery mode.
8. It does not touch matrixArtifact, ProductSSOT, canonical docs, or VERIFIED state.
9. The CT2 Fresh Build public URL `BLOCK` remains honestly represented as a blocker until a post-merge proof returns generated content in an anonymous browser.

## CTO Verification

- Focused deploy/adapter tests: PASS, 2 files / 51 tests.
- Fresh Build suite + Vercel deploy helper: PASS, 6 files / 90 tests.
- `npm run build:preflight`: PASS.
- `npm run lint`: PASS with existing flat-config warnings only.
- `git diff --check`: PASS.

## Required Output

Return `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`.

CR may BLOCK only on concrete evidence/security/governance/proof failure.
