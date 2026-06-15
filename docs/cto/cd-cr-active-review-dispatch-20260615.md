# CD/CR Active Review Dispatch - 2026-06-15

FROM: CTO
TO: CD and CR
DATE: 2026-06-15 UTC
STATUS: ACTIVE

## Operating Rule

Review the latest remote branch heads after `git fetch origin`.

Do not rely on older embedded `Review HEAD` values inside the original branch prompts when docs-only sync commits were added after runtime review. Runtime scope is called out below.

Do not merge, promote production, or move VERIFIED. Return `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`.

## Gate 1 - SAIGE Product Card Score Visibility

- Branch: `fix/portfolio-product-ssot-cards`
- Latest known branch head after CD-block patch: `33e491de42257024907e0e9b3271e1b2c7ab1100`
- Runtime review head before docs-only sync: `cb03a203dddc2a5f033a1c3222cd7896f72452ef`
- CB2 verdict: `PASS-WITH-FINDINGS`
- CB2 result: `docs/cto/cb2-review-saige-product-card-score-result-20260614.md`
- CD/CR re-review dispatch after CD block: `docs/cto/cd-cr-product-card-score-source-rereview-dispatch-20260615.md`
- Existing prompts on the branch:
  - `docs/cto/cd-review-saige-product-card-score-prompt-20260614.md`
  - `docs/cto/cr-review-saige-product-card-score-prompt-20260614.md`

Review focus:

1. Product cards must come from ProductSSOT-backed data, not hardcoded seed fixtures.
2. Scores must come from score-bearing ProductSSOT governance records only.
3. `/api/products` must not error on text org ids.
4. `/portfolio`, `/dashboard`, and `/products` must use a consistent product read boundary.
5. Public/no-org read surface while `AUTH_REQUIRED=false` is already recorded as a CB2 nonblocking finding; block only if it creates unacceptable exposure for the current internal proof deployment or violates the branch scope.
6. No CT2 completion, deployment, or VERIFIED movement is claimed by this branch.

Expected result files:

- CD: `docs/cto/cd-review-saige-product-card-score-result-20260615.md`
- CR: `docs/cto/cr-review-saige-product-card-score-result-20260615.md`

## Gate 2 - Universal Delivery Workspace

- Branch: `feature/universal-delivery-workspace`
- Latest known branch head after CTO final-directive status refresh: `80a7d52aa994591476c5f2245f4d8adec347ed42`
- Runtime review head before docs-only sync: `c19a8c4e89bb6cdf99d675e8c61d40997a55d7b3`
- Review base recorded in original packets: `f9c570601febae842d02e12faea0e5fce4dcf6be`
- CB2 re-review 2 verdict: `PASS`
- CB2 re-review 2 result: `docs/cto/cb2-review-universal-delivery-workspace-rereview2-result-20260615.md`
- Existing prompts on the branch:
  - `docs/cto/cd-review-universal-delivery-workspace-prompt-20260614.md`
  - `docs/cto/cr-review-universal-delivery-workspace-prompt-20260614.md`

Important scope note:

- Runtime/test/package diff after `3d98acf63d29eb38a1095bf17e4b7d737ea1be97` is empty.
- Latest sync after `3d98acf63d29eb38a1095bf17e4b7d737ea1be97` is CTO docs only.
- The runtime implementation under review remains the Universal Delivery Workspace branch, not the docs-only sync.

Review focus:

1. Real DeliveryWorkspace substrate, not log-only metadata.
2. GitHub repo creation limited to FlowAI-owned owner/org; no user-controlled unsafe owner/project/visibility.
3. Initial codebase commit into an empty repo is supported.
4. GitHub App permission failures and operator-token fallback are explicit, auditable, and secret-safe.
5. Tokens are not persisted, printed, returned, committed, or written to ProductSSOT.
6. Vercel project creation/resolution/deployment waits for honest READY/public proof before returning a URL.
7. Protected original repo write guards remain intact.
8. Type 2 description-only support is labeled honestly without fake crawl/baseline evidence.
9. No product-specific hard-coding for VEU, Victor, SAIGE, RelTwin, or proof targets.
10. No canonical docs, matrixArtifact evidence status, or VERIFIED movement.

Expected result files:

- CD: `docs/cto/cd-review-universal-delivery-workspace-result-20260615.md`
- CR: `docs/cto/cr-review-universal-delivery-workspace-result-20260615.md`

## Required Final Merge Guard

Before CTO merges either runtime branch, CTO must run:

```powershell
git fetch origin
git diff --name-status origin/main..origin/<branch> --diff-filter=D -- docs/cto
```

The delete-risk check must return no current-main `docs/cto` evidence deletions, or the branch must be docs-synced again before merge.

This final merge guard is required because review-result documents can advance `origin/main` or the reviewed branch while reviews are in flight.
