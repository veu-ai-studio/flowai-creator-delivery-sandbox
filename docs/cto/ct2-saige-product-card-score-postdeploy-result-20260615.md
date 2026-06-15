# CT2 SAIGE Product-Card Score Post-Deploy Browser Acceptance

Date: 2026-06-15

Lane: CT2 post-deploy browser acceptance

Production URL: `https://flowai-dun.vercel.app`

Production deployment observed: `https://flowai-c8un0m1m4-veu-ai-studio.vercel.app`

Production commit tested: `829ea53d9933c09a003897d9b94a7e417ea46cd0`

Target product: SAIGE / `https://saigeplatform.com`

Verdict: BLOCK

## Summary

Production identity passed, but the product-card score acceptance remains blocked. The live `/api/products` endpoint returns HTTP 500 with:

```json
{"error":"column product_registry.original_repo does not exist"}
```

Because `/api/products` fails, SAIGE/ProductSSOT-backed product rows do not render on `/portfolio`, `/dashboard`, or `/products`, and no API-backed numeric score is visible on the product cards.

## Acceptance Results

1. SAIGE card appears on `/portfolio`, `/dashboard`, and `/products`.

Result: FAIL.

- `/portfolio`: SAIGE not visible; page shows `Couldn't load products` and `HTTP 500`.
- `/dashboard`: SAIGE not visible; page shows `No products registered yet`.
- `/products`: SAIGE not visible; page shows `No products found`.

2. Numeric score is visible and sourced from ProductSSOT/API-backed score evidence, not a hardcoded seed fallback.

Result: FAIL.

- `/api/products` returned HTTP 500, so no ProductSSOT/API-backed product row or score was available.
- No product-card numeric score appeared on `/portfolio`, `/dashboard`, or `/products`.

3. No user-facing regression from previous visual checks.

Result: PASS-WITH-FINDINGS.

- `/flow-hub/production` rendered and the sidebar showed all 8 forge steps: Research Forge, Design Forge, Build Forge, Quality Audit, Deploy Forge, Self-Renewal Forge, GTM Forge, Monitor Forge.
- `/flowai` accepted `https://saigeplatform.com`, showed SAIGE upgrade-target context, and `Launch Forge` was enabled.
- Finding: `/dashboard` still produced `g.filter is not a function` during browser capture.

4. Do not claim VERIFIED movement.

Result: PASS.

- CT2 did not move VERIFIED state and observed no user-facing VERIFIED movement claim.

## Production Identity

`/api/version`:

```json
{
  "commitFull": "829ea53d9933c09a003897d9b94a7e417ea46cd0",
  "branch": "main",
  "deployUrl": "flowai-c8un0m1m4-veu-ai-studio.vercel.app"
}
```

`/api/health`:

```json
{
  "ok": true,
  "status": "ready",
  "commitFull": "829ea53d9933c09a003897d9b94a7e417ea46cd0",
  "branch": "main",
  "clerkReady": true,
  "githubAppReady": true,
  "inngestReady": true
}
```

## Browser Observations

Screenshots and raw browser evidence are stored under:

`docs/cto/ct2-saige-product-card-score-postdeploy-evidence-20260615/`

Captured pages:

- `/portfolio`
- `/dashboard`
- `/products`
- `/flow-hub/production`
- `/flowai`

Key response errors:

- `/api/products?sort=-updated_at&limit=100` returned HTTP 500 on `/portfolio`.
- `/api/products?sort=-updated_at&limit=20` returned HTTP 500 on `/dashboard`.
- `/api/products` returned HTTP 500 on `/products`.

Console/error finding:

- `g.filter is not a function` still appeared on `/dashboard`.

## CTO Report

BLOCK. The promoted build is live and healthy at commit `829ea53d9933c09a003897d9b94a7e417ea46cd0`, but ProductSSOT-backed SAIGE product-card score visibility is still blocked by the live `/api/products` schema error. No VERIFIED movement was claimed.

