# Product Card Score Source Block Patch Result

FROM: CTO
TO: W04, CD, CR, CB2
DATE: 2026-06-15 UTC
Branch: `fix/portfolio-product-ssot-cards`
Previous head: `c78727b114ae2f00abcc67006b5fd1f467c7bf9f`
Patched head: `33e491de42257024907e0e9b3271e1b2c7ab1100`
Patch commit: `33e491d` (`fix/products | keep scores ProductSSOT sourced`)
VERIFIED movement: no
Canonical docs: no edits
matrixArtifact status movement: no

## Blocker Patched

CD blocked because `/products` could still prefer `ProductRegistry.last_score` from the Base44 mirror over ProductSSOT-backed API scores.

The patch changes `src/pages/ProductRegistry.jsx` so the displayed score is derived only from API product fields:

- `product?.last_score`
- `product?.last_audit_score`

`registryRow` remains available for readiness metadata, but it no longer participates in score display.

## Files Changed

- `src/pages/ProductRegistry.jsx`
- `tests/ui/portfolioUpgradeReadiness.test.js`

## Verification

Focused product-card tests:

```text
npx vitest run tests/ui/portfolioUpgradeReadiness.test.js tests/ui/productRegistryRunAction.test.js tests/api-products-ssot-fallback.test.js tests/api-products-handler.test.js
PASS: 4 files / 23 tests
```

Full branch preflight:

```text
npm run preflight
PASS: lint, build:preflight, 237 test files / 3741 tests passed / 3 skipped, lane discipline, SSOT traceability, matrix generation
```

Timestamp-only `src/lib/orchestratorFramework/matrixArtifact.json` churn was restored before commit.

## Gate Impact

The CD blocker is patched, but the branch is not merge-cleared yet.

Required next step: CD and CR re-review `origin/fix/portfolio-product-ssot-cards` at `33e491de42257024907e0e9b3271e1b2c7ab1100`, focused on the score-source blocker and regression test.
