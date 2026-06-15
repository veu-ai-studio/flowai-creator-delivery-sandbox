# CB Dispatch - Product Card Score Source Block Patch

FROM: CTO
TO: CB
DATE: 2026-06-15 UTC
STATUS: CLEAR TO PATCH EXISTING BRANCH
Branch: `fix/portfolio-product-ssot-cards`
Current branch head at dispatch: `c78727b114ae2f00abcc67006b5fd1f467c7bf9f`
Do not create a new runtime branch.
VERIFIED movement: no
Canonical docs: no edits

## Background

CD returned `BLOCK` for `fix/portfolio-product-ssot-cards`.

CR returned `PASS-WITH-FINDINGS`.

Result files:

- `docs/cto/cd-review-saige-product-card-score-result-20260615.md`
- `docs/cto/cr-review-saige-product-card-score-result-20260615.md`

## Blocking Issue

`/products` can still display a score from the Base44 `ProductRegistry` mirror instead of score-bearing ProductSSOT governance records.

CD evidence:

- `src/pages/ProductRegistry.jsx` still loads Base44 `ProductRegistry` rows into `registryMap`.
- `productScore` prioritizes `registryRow?.last_score` before ProductSSOT-backed API score fields.
- The table passes that Base44 mirror row into score calculation.

## Patch Requirements

Patch only the existing product-card branch.

1. In `src/pages/ProductRegistry.jsx`, make score display use only ProductSSOT-backed API score fields.
2. Stop passing `registryRow` into score calculation.
3. Preserve non-score registry metadata if still needed for product identity/navigation, but do not let Base44 mirror score fields drive displayed evidence.
4. Add or adjust a focused test proving `registryRow.last_score` cannot override ProductSSOT-backed API score fields.
5. Do not change scoring formulas, governance writes, deployment code, canonical docs, matrixArtifact status, WIRED, or VERIFIED.

## Verification Required

Run focused product-card tests at minimum:

```powershell
npx vitest run tests/ui/portfolioUpgradeReadiness.test.js tests/ui/productRegistryRunAction.test.js tests/api-products-ssot-fallback.test.js tests/api-products-handler.test.js
```

Then run full preflight:

```powershell
npm run preflight
```

Restore timestamp-only `src/lib/orchestratorFramework/matrixArtifact.json` churn if generated.

## Return

Commit and push `fix/portfolio-product-ssot-cards`.

Return:

- patched branch head;
- files changed;
- focused test result;
- full preflight result;
- confirmation that no canonical docs, matrixArtifact status, WIRED, or VERIFIED movement occurred.
