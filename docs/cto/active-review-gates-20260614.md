# Active Review Gates - 2026-06-14

Owner: CTO
Status: Active coordination record.
Canonical authority remains `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, and `docs/IMPLEMENTATION_PLAN.md`.

## Operating Rule

No more than two runtime branches may be in review at the same time.

Current active review count: `2`.

Do not dispatch another runtime build branch until one of the branches below is merged, blocked, withdrawn, or explicitly waived by W04/CEO.

## Gate 1 - SAIGE Product Card Score Visibility

- Branch: `fix/portfolio-product-ssot-cards`
- Current review head: `cb03a203dddc2a5f033a1c3222cd7896f72452ef`
- Purpose: resolve the remaining SAIGE visual acceptance blocker by making ProductSSOT-backed product cards visible on `/portfolio`, `/dashboard`, and `/products` without fabricated rows or scores.
- Required before merge: CD verdict, CR verdict, CB2 verdict, or explicit W04 waiver.
- Current status: pending review results.
- Preflight evidence: PASS on branch head after sync with `origin/main`; lint/build passed, `237` test files / `3741` tests passed / `3` skipped, lane discipline PASS, SSOT traceability PASS, matrix generation PASS.
- Review packets on branch:
  - `docs/cto/cd-review-saige-product-card-score-prompt-20260614.md`
  - `docs/cto/cr-review-saige-product-card-score-prompt-20260614.md`
  - `docs/cto/cb2-review-saige-product-card-score-dispatch-20260614.md`
  - `docs/cto/ct2-saige-product-card-score-postdeploy-dispatch-20260614.md`
- Merge path after clearance: merge to `main`, promote production, confirm `/api/health` commit identity, dispatch CT2 post-deploy visual acceptance.

## Gate 2 - Universal Delivery Workspace

- Branch: `feature/universal-delivery-workspace`
- Current review head: `c19a8c4e89bb6cdf99d675e8c61d40997a55d7b3`
- Review base recorded in packets: `f9c570601febae842d02e12faea0e5fce4dcf6be`
- Purpose: add the smallest honest Universal Delivery Workspace substrate for non-preconfigured user delivery, including Type 2 description-only entry foundations and delivery-state evidence boundaries.
- Required before merge: CD verdict, CR verdict, CB2 verdict, or explicit W04 waiver.
- Current status: pending review results.
- CTO fallback evidence: full preflight PASS recorded in `docs/cto/universal-delivery-review-gate-status-20260614.md`; this does not replace formal CD/CR/CB2 unless W04 explicitly accepts it.
- Review packets on branch/main:
  - `docs/cto/cd-review-universal-delivery-workspace-prompt-20260614.md`
  - `docs/cto/cr-review-universal-delivery-workspace-prompt-20260614.md`
  - `docs/cto/cb2-review-universal-delivery-workspace-dispatch-20260614.md`
  - `docs/cto/ct2-universal-delivery-workspace-proof-draft-20260614.md`
- Merge path after clearance: merge to `main`, promote production, confirm `/api/health` commit identity, dispatch CT2 Type 2 description-only Fresh Build proof.

## Explicit Non-Actions

- Do not start Path 4 execution until the active run target honestly supports multi-URL synthesis to a deployed URL.
- Do not promote additional VERIFIED rows without W04/CEO authorization of exact row mapping and evidence fields.
- Do not claim either branch complete until CT2 confirms the user-facing behavior after production promotion.
- Do not merge either runtime branch on CTO fallback evidence alone unless W04 explicitly waives the missing review result.
