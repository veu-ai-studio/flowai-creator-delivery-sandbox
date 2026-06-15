# TO: CB2
# FROM: CTO
# ACTION: Branch audit - `/api/products` optional registry columns hotfix

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

Production commit `829ea53d9933c09a003897d9b94a7e417ea46cd0` is promoted and healthy, but CT2 blocked product-card visual acceptance because `/api/products` returns HTTP 500:

```json
{"error":"column product_registry.original_repo does not exist"}
```

This branch makes `api/_lib/db.js` retry the ProductSSOT-backed `product_registry` fallback with base registry columns when optional delivery-target columns are absent in production schema.

## Audit Scope

Confirm:

1. Patch is limited to `/api/products` registry fallback compatibility.
2. Missing optional `product_registry` delivery columns no longer make the full product list fail.
3. ProductSSOT score mapping is preserved and no score is fabricated from Base44 registry rows.
4. No scoring formula, governance write, deployment claim, canonical doc, package, or VERIFIED movement changed.
5. Tests cover the production failure mode.

## Required Commands

Run at minimum:

```text
npx vitest run tests/api-products-ssot-fallback.test.js tests/api-products-handler.test.js tests/ui/portfolioUpgradeReadiness.test.js tests/ui/productRegistryRunAction.test.js
npm run preflight
```

## Report

Return `PASS`, `PASS-WITH-FINDINGS`, or `BLOCK` with exact evidence.

No VERIFIED movement is authorized.
