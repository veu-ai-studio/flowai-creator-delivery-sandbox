# Products Registry Optional Columns Hotfix Evidence - 2026-06-15

Owner: CTO
Branch: `fix/products-registry-optional-columns`
Base: `ca4510f`
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`

## Trigger

CT2 postdeploy browser acceptance for the SAIGE product-card score fix returned `BLOCK` on production commit `829ea53d9933c09a003897d9b94a7e417ea46cd0`.

Production `/api/products` returned HTTP 500:

```json
{"error":"column product_registry.original_repo does not exist"}
```

Because `/api/products` failed, ProductSSOT-backed product rows and numeric scores could not render on `/portfolio`, `/dashboard`, or `/products`.

## Diagnosis

The product-card fix added a Supabase `product_registry` fallback that selects delivery-target columns such as `original_repo`, `upgrade_repo`, `deployment_url`, and `upgrade_repo_status`.

Those columns exist in repo migrations `0028_product_registry_fork_upgrade_targets.sql` and `0030_product_registry_saige_upgrade_url.sql`, but the production database can be behind those optional delivery-target migrations. Selecting a missing optional column causes PostgreSQL `42703`, which made the entire product list fail.

The complete blocker chain is:

1. `/portfolio`, `/dashboard`, and `/products` call `/api/products`.
2. `/api/products` calls `listProducts()`.
3. Supabase mode falls back to `product_registry` when the `products` table has no rows for the current context.
4. The registry query selected optional delivery columns unconditionally.
5. Production schema lacked `product_registry.original_repo`.
6. Supabase returned `42703`.
7. `/api/products` returned HTTP 500.
8. Product cards could not render ProductSSOT rows or numeric scores.

## Patch

Changed `api/_lib/db.js` so `product_registry` listing:

- Attempts the full select first.
- Detects PostgreSQL `42703` missing-column errors scoped to `product_registry`.
- Retries with a base-column select that only requires longstanding registry columns.
- Preserves ProductSSOT score joining and product-card field mapping.
- Marks `stats.deliveryColumnsAvailable:false` when the optional delivery columns were unavailable.

This is a compatibility fix, not a scoring, governance, deployment, canonical, or VERIFIED movement change.

## Verification

Focused tests:

```text
npx vitest run tests/api-products-ssot-fallback.test.js tests/api-products-handler.test.js tests/ui/portfolioUpgradeReadiness.test.js tests/ui/productRegistryRunAction.test.js
```

Result:

```text
4 files passed
25 tests passed
```

Full preflight:

```text
npm run preflight
```

Result:

```text
PASS
237 files passed
3743 tests passed
3 tests skipped
lane discipline PASS
SSOT traceability PASS
matrix generation PASS
```

Review:

- CD: `PASS-WITH-FINDINGS`
- CR: `PASS-WITH-FINDINGS`
- Result: `docs/cto/cd-cr-review-products-registry-optional-columns-hotfix-result-20260615.md`

## Next Gate

After push:

1. Review as focused hotfix.
2. Merge to `main` if cleared.
3. Promote production.
4. Rerun CT2 postdeploy visual acceptance.

No VERIFIED movement is authorized by this hotfix alone.
