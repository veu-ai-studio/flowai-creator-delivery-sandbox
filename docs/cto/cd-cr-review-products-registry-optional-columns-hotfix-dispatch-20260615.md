# TO: CD and CR
# FROM: CTO
# ACTION: Focused Step 5 review - `/api/products` optional registry columns hotfix

Branch: `fix/products-registry-optional-columns`
Head: `6ba711d`
Base: `ca4510f`

Read first:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/products-registry-optional-columns-hotfix-evidence-20260615.md`
- `docs/cto/ct2-saige-product-card-score-postdeploy-result-20260615.md`

## Context

CT2 blocked the promoted product-card score fix because live production `/api/products` returned:

```json
{"error":"column product_registry.original_repo does not exist"}
```

The repo migration defines that column, but production schema can lag optional delivery-target migrations. The user-facing endpoint must degrade gracefully instead of failing all product-card views.

## Review Scope

Review only:

- `api/_lib/db.js`
- `tests/api-products-ssot-fallback.test.js`
- `docs/cto/products-registry-optional-columns-hotfix-evidence-20260615.md`

Confirm:

1. The patch retries only on PostgreSQL `42703` missing-column errors scoped to `product_registry`.
2. The retry uses base registry columns and still joins ProductSSOT for score evidence.
3. The patch does not fabricate product rows or scores.
4. The patch does not change scoring, governance, canonical docs, deployment, package config, or matrixArtifact status.
5. The regression test simulates the exact CT2 production error and proves the fallback.

## Verification Already Run By CTO

Focused tests:

```text
npx vitest run tests/api-products-ssot-fallback.test.js tests/api-products-handler.test.js tests/ui/portfolioUpgradeReadiness.test.js tests/ui/productRegistryRunAction.test.js
```

Result: `4` files / `25` tests PASS.

Full preflight:

```text
npm run preflight
```

Result: PASS, `237` files / `3743` tests PASS / `3` skipped.

## Report

Return `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK`.

No VERIFIED movement is authorized.
