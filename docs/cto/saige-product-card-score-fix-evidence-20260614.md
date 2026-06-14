# SAIGE Product Card Score Fix Evidence

Date: 2026-06-14 UTC
Owner: CTO
Branch: `fix/portfolio-product-ssot-cards`
Scope: Runtime read-boundary/UI fix for the CT2 SAIGE visual acceptance blocker.

## Problem

CT2 confirmed two of three visual checks after the SAIGE background forge acceptance run, but blocked on product-card score visibility:

- `/flow-hub/production` showed all 8 sidebar forge steps.
- `/flowai` accepted `https://saigeplatform.com`, showed SAIGE upgrade-target context, and enabled Launch Forge.
- `/portfolio` and `/dashboard` did not show a SAIGE product card with a numeric score.

Production diagnostics showed `/api/products` returned an empty `products` table and errored when called with text org id `veu-ai-studio`, while the forge evidence is persisted through `product_registry` and `product_ssot`.

## Patch Summary

This branch keeps the fix product-agnostic:

1. `/api/products` still prefers the canonical `products` table when rows exist.
2. If `products` is empty, or the org id is a text registry id rather than a UUID, it falls back to `product_registry` plus `product_ssot`.
3. The fallback synthesizes product-card fields from registry metadata and ProductSSOT identity/build/governance blocks.
4. Numeric scores are surfaced only from score-bearing ProductSSOT governance records. If no score exists, the score remains null.
5. `/dashboard` now reads product cards through the same `/api/products` boundary instead of the Base44 ProductRegistry mirror.
6. `/products` correctly consumes `/api/products` response shape `{ items: [...] }` and normalizes scores from either registry mirror or ProductSSOT-backed API rows.

No canonical docs, ProductSSOT rows, matrixArtifact evidence status, scoring logic, governance writes, forge pipeline behavior, branch creation, or deployment logic changed.

## Files Changed

- `api/_lib/db.js`
- `api/products.js`
- `src/pages/MainDashboard.jsx`
- `src/pages/ProductRegistry.jsx`
- `tests/api-products-ssot-fallback.test.js`
- `tests/api-products-handler.test.js`
- `tests/ui/portfolioUpgradeReadiness.test.js`

## Verification

Focused checks:

- `node --check api/_lib/db.js` PASS
- `node --check api/products.js` PASS
- `npx vitest run tests/api-products-ssot-fallback.test.js tests/api-products-handler.test.js tests/products-registry.test.js tests/ui/portfolioUpgradeReadiness.test.js` PASS, 4 files / 51 tests

Full preflight:

- `npm run preflight` PASS
- Lint PASS
- Build preflight PASS
- Vitest PASS: 237 files / 3741 tests passed / 3 skipped
- Lane discipline PASS
- SSOT traceability PASS
- Matrix generation PASS

The preflight-generated `matrixArtifact.json` timestamp-only diff was restored before commit because this branch does not move VERIFIED evidence.

## Review Focus

- Confirm the fallback does not fabricate product rows or scores.
- Confirm text org ids no longer trigger a UUID filter against `products.org_id`.
- Confirm `/api/products` public read fallback is acceptable for the current internal proof mode and should be reassessed before broad external tenant exposure.
- Confirm this is a visual/data-path fix only and does not claim CT2 acceptance until deployed and browser-confirmed.

## CT2 Acceptance After Merge/Deploy

After production promotion, CT2 should rerun only the previously blocked visual checks:

1. Open `https://flowai-dun.vercel.app/portfolio`.
2. Confirm a SAIGE product card is visible.
3. Confirm the card shows a numeric score.
4. Open `https://flowai-dun.vercel.app/dashboard`.
5. Confirm SAIGE or ProductSSOT-backed products are visible and not an empty portfolio state.
6. Record whether any page errors remain, especially `g.filter is not a function`.

No VERIFIED movement is authorized by this branch alone.
