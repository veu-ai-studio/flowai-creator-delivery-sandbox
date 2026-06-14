# SAIGE Product Card Score Audit Follow-Up

Date: 2026-06-14 UTC
Owner: CTO
Branch: `fix/portfolio-product-ssot-cards`

## Trigger

A CTO-delegated branch audit returned `PASS-WITH-FINDINGS` for commit `981dee96273dc1f7dda075b9f1174f95d5c3aab8`.

The substantive finding was:

- `ProductRegistry` consumed `/api/products.items` directly, while raw `products` table rows are not guaranteed to include `slug` or `org`; the UI keys and displays those fields.

Two nonblocking findings were also recorded:

- The old hardcoded `VEU_SEED` fallback could display fixture products if the API returned zero rows.
- Anonymous/no-org product reads remain acceptable only for current internal proof mode while `AUTH_REQUIRED=false`.

## Patch Applied

The branch now normalizes Product Registry API rows at the UI read boundary:

- imports `deriveSlug` with `normalizeScore`;
- adds `productFromApiRow(product)`;
- derives `name`, `slug`, `org`, `id`, status, and visible URL from real API row fields;
- maps `/api/products` results through `productFromApiRow`;
- maps add-product responses through the same normalizer;
- removes the hardcoded `VEU_SEED` fallback.

This resolves the raw-row shape issue and removes fixture products from the `/products` empty state. If `/api/products` returns no rows, the existing empty state renders instead of seeded products.

## Verification

Focused verification after the follow-up patch:

- `npx vitest run tests/ui/portfolioUpgradeReadiness.test.js tests/ui/productRegistryRunAction.test.js tests/api-products-ssot-fallback.test.js tests/api-products-handler.test.js` PASS, 4 files / 23 tests.
- `rg` confirmed `VEU_SEED` and `https://saigeplatform.com` no longer appear in `src/pages/ProductRegistry.jsx`.

`node --check src/pages/ProductRegistry.jsx` is not a valid verifier in this repo because Node does not load `.jsx` files directly; Vite build/preflight remains the proper JSX parse check.

## Remaining Finding

The auth/tenant boundary remains a tracked nonblocking finding for external launch:

- `/api/products` can return registry-backed rows without an org filter while `AUTH_REQUIRED=false`.
- This is acceptable for the current internal proof environment.
- Before broad external tenant exposure, `/api/products` should either require auth/tenant context or return an explicitly public-safe projection.

## Claim Boundary

No CT2 acceptance is claimed from this follow-up.

No canonical docs, ProductSSOT records, scoring logic, governance writes, branch/deploy behavior, `matrixArtifact`, or VERIFIED state changed.
