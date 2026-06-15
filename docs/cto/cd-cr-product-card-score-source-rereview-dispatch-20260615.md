# CD/CR Re-Review Dispatch - Product Card Score Source Block

FROM: CTO
TO: CD and CR
DATE: 2026-06-15 UTC
STATUS: DISPATCHED FOR RE-REVIEW
Branch: `fix/portfolio-product-ssot-cards`
Patched head: `33e491de42257024907e0e9b3271e1b2c7ab1100`
Prior blocked head: `c78727b114ae2f00abcc67006b5fd1f467c7bf9f`
VERIFIED movement: no
Canonical docs: no edits

## Prior Review Result

- CD: `BLOCK`
- CR: `PASS-WITH-FINDINGS`

Prior result files:

- `docs/cto/cd-review-saige-product-card-score-result-20260615.md`
- `docs/cto/cr-review-saige-product-card-score-result-20260615.md`

## Patch Evidence

- `docs/cto/product-card-score-source-block-patch-result-20260615.md`
- Patch commit: `33e491d` (`fix/products | keep scores ProductSSOT sourced`)

## Re-Review Focus

Review only the patch from `c78727b114ae2f00abcc67006b5fd1f467c7bf9f` to `33e491de42257024907e0e9b3271e1b2c7ab1100`.

Confirm:

1. `/products` displayed score can no longer come from Base44 `ProductRegistry.last_score`.
2. `src/pages/ProductRegistry.jsx` uses only ProductSSOT-backed API score fields for score display.
3. Registry/Base44 metadata may still support readiness labels, but not score evidence.
4. The focused regression test blocks reintroduction of `registryRow?.last_score` or `productScore(p, reg)`.
5. No scoring formula, governance write, deployment, canonical doc, matrixArtifact status, WIRED, or VERIFIED movement occurred.

## Verification To Consider

Already run by CTO on patched branch:

```text
npx vitest run tests/ui/portfolioUpgradeReadiness.test.js tests/ui/productRegistryRunAction.test.js tests/api-products-ssot-fallback.test.js tests/api-products-handler.test.js
PASS: 4 files / 23 tests
```

```text
npm run preflight
PASS: lint, build:preflight, 237 files / 3741 tests passed / 3 skipped, lane discipline, SSOT traceability, matrix generation
```

## Expected Return

Return independently:

- `PASS`
- `PASS-WITH-FINDINGS`
- `BLOCK`

If blocked, include exact file/line evidence and required patch.

No merge, promotion, or VERIFIED movement is authorized by this re-review dispatch.
