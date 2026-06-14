# TO: CT2
# FROM: CTO
# ACTION: Post-deploy visual acceptance rerun - SAIGE product card score

Run this only after `fix/portfolio-product-ssot-cards` is merged, promoted to production, and `/api/health` confirms the promoted commit.

## Target

Production: `https://flowai-dun.vercel.app`

## Background

Previous CT2 result:

- PASS: `/flow-hub/production` rendered all 8 sidebar forge steps.
- PASS: `/flowai` accepted `https://saigeplatform.com`, showed SAIGE upgrade-target context, and enabled Launch Forge.
- BLOCK: `/portfolio` and `/dashboard` did not show a SAIGE product card with a numeric score.

This branch patches the product read boundary so ProductSSOT-backed product rows can surface through `/api/products`.

## Steps

1. Open `/api/health` and record commit SHA.
2. Open `/portfolio`.
3. Confirm whether a SAIGE product card is visible.
4. Confirm whether the card shows a numeric score.
5. Open `/dashboard`.
6. Confirm whether SAIGE or ProductSSOT-backed products are visible instead of the empty portfolio state.
7. Capture page console errors. Specifically record whether `g.filter is not a function` still appears.

## PASS Criteria

- `/portfolio` shows SAIGE or a ProductSSOT-backed SAIGE-equivalent product card.
- That card shows a numeric score.
- `/dashboard` no longer renders as an empty product state when ProductSSOT-backed products exist.
- No new false delivery, deployment, branch, PR, ProductSSOT, or VERIFIED claim appears.

## Report

Commit result and raw evidence under `docs/cto/` and return:

- `PASS`
- `PASS-WITH-FINDINGS`
- `BLOCK`

No VERIFIED movement is authorized by this visual rerun alone.
