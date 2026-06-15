# CTO Review - SAIGE Product Card Score Visibility

Date: 2026-06-14 UTC
Reviewer: CTO
Branch: `fix/portfolio-product-ssot-cards`
Head: `981dee96273dc1f7dda075b9f1174f95d5c3aab8`
Base: `origin/main` at review time
Verdict: `PASS-WITH-FINDINGS`

## Scope Reviewed

Runtime and evidence changes in:

- `api/_lib/db.js`
- `api/products.js`
- `src/pages/MainDashboard.jsx`
- `src/pages/ProductRegistry.jsx`
- `tests/api-products-ssot-fallback.test.js`
- `tests/api-products-handler.test.js`
- `tests/ui/portfolioUpgradeReadiness.test.js`
- `docs/cto/*saige-product-card-score*`
- `docs/cto/session-brief.md`

## Result

The branch is directionally correct and consistent with the SSOT evidence boundary.

It does not fabricate deployed URLs, branch creation, ProductSSOT writes, governance writes, scores, or VERIFIED movement. It narrows the fix to the read boundary that caused the CT2 visual acceptance block: production had ProductSSOT/registry evidence, while `/portfolio` and `/dashboard` were still reading an empty or stale product-card source.

## Evidence Integrity

- `api/_lib/db.js` uses `product_registry` + `product_ssot` only as a fallback when `products` rows are absent or when the org id is a non-UUID registry id.
- `latestScoreFromProductSsot` extracts numeric score evidence from score-bearing governance records only.
- The live forge governance write shape includes top-level `finalScore`, so the extractor covers the current ProductSSOT shape written by the orchestrator.
- `ProductRegistry.jsx` and `MainDashboard.jsx` display ProductSSOT-backed scores through the existing `normalizeScore` 0-10 UI boundary.
- The branch does not edit `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`, `src/lib/orchestratorFramework/matrixArtifact.json`, orchestrator scoring, governance write code, branch creation, or deploy code.

## Nonblocking Findings

1. Public read fallback should be reassessed before broad external tenant exposure.

   `/api/products` is currently public in internal proof mode because `AUTH_REQUIRED=false`. This branch does not newly expose secrets, and `product_registry` already supports operator-facing product metadata, but the fallback increases the amount of registry-backed metadata returned by the public product-card endpoint. Before external user launch, this endpoint should be explicitly auth/tenant-gated or given a public-safe projection.

2. Fallback only runs when the `products` table returns no rows.

   This preserves the current `products` table as the preferred source of truth and is correct for the observed production blocker, where `/api/products` returned an empty list. If production later contains partial `products` rows while registry/ProductSSOT contains additional products, those registry rows will not be merged in this patch. That is acceptable for this CT2 blocker but should be tracked if the portfolio needs a combined migration window.

## Commands Run By CTO

- `git fetch origin`
- `git status --short --branch`
- `git diff --name-status origin/main..HEAD`
- `git diff --name-only origin/main..HEAD | Select-String -Pattern "CANONICAL_REFERENCE|BUILD_PROTOCOL|IMPLEMENTATION_PLAN|matrixArtifact|orchestrator|run-construction|score|governance|deploy"`
- `rg -n "governance_record|finalScore|currentScore|gtmScore|scoreStatus|append.*ProductSSOT|product_ssot" src/lib/agents/renewal/orchestrator.js src/api/run-construction.js tests -g "*.js"`
- `rg -n "function latestScoreFromProductSsot|function mapProductRegistryRowToProduct|async function listProductRegistryPortfolio|export async function listProducts|stats: data.stats|dashboardProductFromRegistry|apiProductRows|productScore" api/_lib/db.js api/products.js src/pages/MainDashboard.jsx src/pages/ProductRegistry.jsx`

Earlier branch verification already recorded in `docs/cto/saige-product-card-score-fix-evidence-20260614.md`:

- `node --check api/_lib/db.js` PASS
- `node --check api/products.js` PASS
- Focused Vitest PASS: 4 files / 51 tests
- Full `npm run preflight` PASS: 237 files / 3741 tests passed / 3 skipped

## Gate Status

This CTO review does not replace CD or CR.

Required before merge:

- CD review result from `docs/cto/cd-review-saige-product-card-score-prompt-20260614.md`
- CR review result from `docs/cto/cr-review-saige-product-card-score-prompt-20260614.md`
- W04 adjudication only if either reviewer returns findings that need executive disposition

Required after merge/promotion:

- CT2 post-deploy visual acceptance from `docs/cto/ct2-saige-product-card-score-postdeploy-dispatch-20260614.md`

No VERIFIED movement is authorized by this branch or this review.
