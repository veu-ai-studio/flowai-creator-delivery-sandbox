# TO: CD
# FROM: CTO
# ACTION: Step 5 Review - SAIGE Product Card Score Visibility

Branch: `fix/portfolio-product-ssot-cards`
Base: current `origin/main`

## Context

CT2 blocked SAIGE visual acceptance because `/portfolio` and `/dashboard` did not show a SAIGE product card with a numeric score, even though the background forge run completed and persisted ProductSSOT evidence.

The diagnosis is a data/read-boundary mismatch:

- production `/api/products` read the empty `products` table;
- the forge persisted operational evidence through `product_registry` and `product_ssot`;
- text org id `veu-ai-studio` could be applied to a UUID column and error;
- `/dashboard` still used the Base44 ProductRegistry mirror for product cards.

## Review Scope

Review only this branch's runtime/test/docs changes:

- `api/_lib/db.js`
- `api/products.js`
- `src/pages/MainDashboard.jsx`
- `src/pages/ProductRegistry.jsx`
- `tests/api-products-ssot-fallback.test.js`
- `tests/api-products-handler.test.js`
- `tests/ui/portfolioUpgradeReadiness.test.js`
- `docs/cto/saige-product-card-score-fix-evidence-20260614.md`

## Questions

1. Does the `/api/products` fallback correctly prefer `products` rows first and only use `product_registry` + `product_ssot` when needed?
2. Does it avoid treating text org ids as UUIDs?
3. Does it avoid fabricated scores by using only score-bearing ProductSSOT governance records?
4. Are `/portfolio`, `/dashboard`, and `/products` now aligned on the same product read boundary and score normalization?
5. Are there any security or tenant-boundary concerns that should block this branch before merge?

## Verification Already Run

- `node --check api/_lib/db.js` PASS
- `node --check api/products.js` PASS
- `npx vitest run tests/api-products-ssot-fallback.test.js tests/api-products-handler.test.js tests/products-registry.test.js tests/ui/portfolioUpgradeReadiness.test.js` PASS, 4 files / 51 tests
- `npm run preflight` PASS, 237 files / 3741 tests passed / 3 skipped

## Required Result

Return one of:

- `PASS`
- `PASS-WITH-FINDINGS`
- `BLOCK`

If blocked, include exact file/line evidence and the smallest required patch.

No VERIFIED movement is authorized by this review.
