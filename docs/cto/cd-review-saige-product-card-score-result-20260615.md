# CD Review Result - SAIGE Product Card Score Visibility

FROM: CD via review-router
TO: CTO, W04
DATE: 2026-06-15 UTC
Branch: `fix/portfolio-product-ssot-cards`
Reviewed branch head: `c78727b114ae2f00abcc67006b5fd1f467c7bf9f`
Runtime review head before docs-only sync: `cb03a203dddc2a5f033a1c3222cd7896f72452ef`
VERDICT: BLOCK
VERIFIED movement: no
Canonical docs: no edits

## Blocking Finding

`/products` can still display a score from the Base44 `ProductRegistry` mirror instead of score-bearing ProductSSOT governance records.

Evidence reported by CD:

- `src/pages/ProductRegistry.jsx` still loads Base44 `ProductRegistry` rows into `registryMap`.
- `productScore` prioritizes `registryRow?.last_score` before ProductSSOT-backed API score fields.
- The table passes that Base44 mirror row into score calculation.

## Why This Blocks

The review requirement says scores must come from score-bearing ProductSSOT governance records only.

The backend fallback is directionally correct, but `/products` can still override ProductSSOT-backed API score evidence with `registryRow.last_score`.

## Required Patch

1. In `src/pages/ProductRegistry.jsx`, make `productScore` use only ProductSSOT-backed API score fields, such as `product?.last_score` or `product?.last_audit_score`.
2. Stop passing `registryRow` into score calculation.
3. Add or adjust a test proving `registryRow.last_score` cannot override ProductSSOT-backed API score fields.

## Gate Impact

`fix/portfolio-product-ssot-cards` is not merge-cleared.

The branch remains blocked until this issue is patched and CD/CR re-review or W04 explicitly waives the remaining review gate.
