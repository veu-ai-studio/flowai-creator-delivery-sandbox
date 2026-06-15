# CB2 Review Result - SAIGE Product Card Score Visibility

Date: 2026-06-15 UTC
Reviewer: CB2
Branch: `fix/portfolio-product-ssot-cards`
Head reviewed: `cb03a203dddc2a5f033a1c3222cd7896f72452ef`
Base: current `origin/main` after `git fetch origin`
Verdict: `PASS-WITH-FINDINGS`

## Scope

CB2 audited the branch under CTO supervision against `docs/cto/cb2-review-saige-product-card-score-dispatch-20260614.md`.

Required focus was:

- product-card score honesty;
- no hardcoded product fixtures;
- raw API row normalization;
- no `matrixArtifact`, `VERIFIED`, canonical-doc, ProductSSOT-write, governance/scoring, forge, or deploy movement;
- tenant/public-read risk.

Execution note: the required focused tests and preflight were run in `C:\Users\victo\Documents\Codex\flowai-cto-docs-20260612`. A separate clean worktree at the same branch head was then used only to write this result file because the original checkout had concurrent main-branch coordination edits in `docs/cto/session-brief.md` and an untracked `docs/cto/active-review-gates-20260614.md`.

## Verdict

`PASS-WITH-FINDINGS`

The branch is acceptable for the current internal proof merge gate if CD/CR also clear it. The implementation does not fabricate product rows or scores, removes the hardcoded `/products` fixture fallback, normalizes raw API rows before UI use, and leaves canonical/matrix/governance/deploy surfaces untouched.

The remaining finding is the known tenant/public-read expansion while `AUTH_REQUIRED=false`. I do not treat it as a merge blocker for the current internal proof mode, but it must block any broad external tenant exposure unless `/api/products` is auth/tenant-gated or reduced to an explicitly public-safe projection.

## Audit Answers

1. `/api/products` still prefers canonical `products` rows when they exist. Evidence: `api/_lib/db.js:224` enters the canonical `products` query for no-org or UUID org filters, `api/_lib/db.js:225` queries `products`, `api/_lib/db.js:239` returns those rows when present, and `api/_lib/db.js:243` falls back only after no canonical rows are returned. For non-UUID text registry ids such as `veu-ai-studio`, the branch intentionally skips the UUID-column filter and goes to registry fallback.

2. The fallback uses `product_registry` plus `product_ssot`, not hardcoded product fixtures. Evidence: `api/_lib/db.js:158` defines the fallback, `api/_lib/db.js:160` reads `product_registry`, `api/_lib/db.js:185` reads `product_ssot`, and mapped fallback rows are marked `source: 'product_registry'` at `api/_lib/db.js:154` and `api/_lib/db.js:214`. `ProductRegistry.jsx` no longer contains `VEU_SEED` or `https://saigeplatform.com`; `tests/ui/portfolioUpgradeReadiness.test.js:36` asserts that removal.

3. Numeric scores are sourced from ProductSSOT governance records only. Evidence: `api/_lib/db.js:87` defines `latestScoreFromProductSsot`, `api/_lib/db.js:92-103` enumerates score-bearing governance fields, `api/_lib/db.js:114` returns null when no score exists, and `api/_lib/db.js:142` maps only that extracted score to `last_audit_score`. Tests cover newest score-bearing record selection at `tests/api-products-ssot-fallback.test.js:22` and no-score non-fabrication at `tests/api-products-ssot-fallback.test.js:71`.

4. The UI normalizes raw API rows before relying on slug/org/URL fields. Evidence: `src/pages/ProductRegistry.jsx:24` defines `productFromApiRow`, `src/pages/ProductRegistry.jsx:31` derives a slug, `src/pages/ProductRegistry.jsx:140-141` maps API rows through the normalizer, and `src/pages/ProductRegistry.jsx:148` normalizes add-product responses too. Dashboard rows are adapted through `dashboardProductFromRegistry` at `src/pages/MainDashboard.jsx:32`, with score normalization at `src/pages/MainDashboard.jsx:34` and slug derivation at `src/pages/MainDashboard.jsx:37`.

5. No unauthorized canonical, ProductSSOT write, `matrixArtifact`, `VERIFIED`, scoring/governance, forge, or deployment movement was found. Evidence: `git diff --name-only origin/main..HEAD -- docs/CANONICAL_REFERENCE.md docs/BUILD_PROTOCOL.md docs/IMPLEMENTATION_PLAN.md src/lib/orchestratorFramework/matrixArtifact.json src/lib/agents/renewal/orchestrator.js api/run-construction.js api/deploy.js src/api/deploy.js src/api/run-construction.js` returned no files. Preflight regenerated a timestamp-only `matrixArtifact.json` diff in the original checkout; I restored that generated diff before producing this result.

6. No blocking production regression risk was found for `/portfolio`, `/dashboard`, `/products`, or `/api/products`. The API fallback is narrow and product-card oriented. The UI score display continues to use `normalizeScore` from `src/lib/products/registry.js:177`, and slugs use `deriveSlug` from `src/lib/products/registry.js:193`. One accepted limitation remains: if the canonical `products` table later has partial rows while registry/ProductSSOT has additional rows, this branch preserves canonical preference and does not merge both sources.

7. Tenant/public-read concern is acceptable only for current internal proof mode. Evidence: `api/products.js:36` uses `requireAuth`, `api/_lib/auth.js:51` documents `AUTH_REQUIRED=false` as accepting anonymous calls, and `api/_lib/auth.js:171-173` returns context without enforcing auth when auth is not required. In fallback mode, `api/_lib/db.js:162` applies the registry org filter only when `orgId` is present, so no-org reads can return registry-backed rows. Existing branch docs already track this at `docs/cto/saige-product-card-score-audit-followup-20260614.md:44-48`.

## Checks Run

- `git fetch origin`: PASS.
- `git diff --name-status origin/main..origin/fix/portfolio-product-ssot-cards`: PASS, reviewed expected runtime/test/docs files only.
- `git diff origin/main..origin/fix/portfolio-product-ssot-cards -- api/_lib/db.js api/products.js src/pages/MainDashboard.jsx src/pages/ProductRegistry.jsx`: PASS, reviewed.
- `npx vitest run tests/api-products-ssot-fallback.test.js tests/api-products-handler.test.js tests/ui/portfolioUpgradeReadiness.test.js tests/ui/productRegistryRunAction.test.js`: PASS, 4 files passed, 23 tests passed.
- `npm run preflight`: PASS. Lint PASS, build preflight PASS, full Vitest PASS with 237 files passed and 3740 tests passed / 3 skipped / 3743 total, lane discipline PASS, SSOT traceability PASS, matrix generation PASS.

Preflight warnings observed but not branch-blocking: existing ESLint flat-config warnings about legacy `/* eslint-env */` comments in several scripts/API files, and existing SSOT/matrix default-tier warnings. They did not fail the command.

## Finding

### Nonblocking: `/api/products` fallback increases public/no-org read surface in internal proof mode

Severity: nonblocking for internal proof; blocking before broad external tenant exposure.

Evidence:

- `api/products.js:36` calls `requireAuth`, not `requireAuthHard`.
- `api/_lib/auth.js:51` documents that `AUTH_REQUIRED=false` accepts anonymous calls.
- `api/_lib/auth.js:171-173` returns context without auth enforcement when auth is not required.
- `api/_lib/db.js:162` applies `product_registry.org_id` filtering only when an `orgId` exists.

Impact: with `AUTH_REQUIRED=false` and no org context, the fallback can return registry-backed product-card rows. This is consistent with the current internal proof environment and already documented by CTO, but it must be closed before external tenant use.

Minimum follow-up before external exposure: make `/api/products` require authenticated tenant context, or return a deliberate public-safe projection that cannot leak cross-tenant/operator registry metadata.

## Gate Conclusion

CB2 returns `PASS-WITH-FINDINGS`.

No `VERIFIED` movement is authorized or performed by this audit.
