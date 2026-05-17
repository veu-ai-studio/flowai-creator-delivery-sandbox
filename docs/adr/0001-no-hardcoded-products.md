# ADR 0001 — No Hardcoded Product Lists in FlowAI

**Status:** Accepted
**Date:** 2026-05-09
**Context dispatch:** UX-2 Phase B (W02 → W5 Code, GO_WITH_CHANGES)
**Supersedes:** none
**Superseded by:** none

---

## Context

FlowAI is locked as **standalone, product-agnostic OS infrastructure**. Any product wires into FlowAI through registration; FlowAI does not ship with a built-in product list. The current 5 VEU products (SAIGE, PressAI, ReachSMS, RelTwin, MyPregLife) are example consumers, not hardcoded integrations.

Despite this, the codebase shipped 14 surfaces (PortfolioDashboard, Architecture, BrandSystem, Clearance, CostUsage, DataExport, DemoGenerator, DomainManager, Environments, GTMAssets, CapabilityInstall*, plus `src/lib/veuProducts.js`) with inline `VEU_PRODUCTS` arrays containing the 5 specific products. The Portfolio Dashboard merged the inline array into its rendered list unconditionally — a brand-new tenant signing in would see VEU's 5 products as if they were their own.

This ADR ratifies the architectural decision and the guardrails to keep the system from drifting back.

## Decision

1. **No top-level `VEU_PRODUCTS`-shaped constant array of product records may exist in `src/`.** Per-product display copy that lives in marketing pages is fine; **product entity records** (`{ id, name, url, slug, ... }`) must be loaded at runtime from `/api/products` (canonical) or `base44.entities.ProductRegistry` (legacy, scheduled for retirement in UX-2.b).

2. **`/api/products` is the single source of truth for product entity records.** It is org-scoped (multi-tenant), authenticated via Clerk JWT (today via `x-flowai-org-id` header fallback), and backed by Supabase `products`. Any new surface that lists products MUST read from this endpoint via `src/lib/products/registry.js`.

3. **`src/lib/products/registry.js` is the canonical client-side helper.** It returns a discriminated union (`{ok: true, items}` / `{ok: false, error}`) so consumers distinguish "load succeeded with zero items" from "load failed". Empty-state UI must only render on `ok: true && items.length === 0`. Network outage / 5xx must render an error state, not an empty state.

4. **Score normalization at the read boundary** is locked to `registry.normalizeScore(raw)` (raw `last_audit_score` → 0–10). No alternative implementations.

5. **Slug derivation is locked** to `registry.deriveSlug(name)` (`lower(name).replace(/[^a-z0-9]+/g, '-').strip(/^-+|-+$/)`). When a `slug` column lands in the schema, the generated value MUST match this client-side derivation byte-for-byte.

6. **Add Product flow writes to ONE store.** `/api/products` is the canonical write path; the Base44 `ProductRegistry.create` dual-write was removed in UX-2 Phase B. Future write paths through other surfaces follow the same rule: one canonical write per row.

7. **No org name in headers/subtitles is hardcoded.** Tenant identity comes from `/api/me` (`org_name`). UI tolerates an empty value gracefully — never displays a fallback like "VEU AI Studio" for a non-VEU tenant.

8. **VEU's 5 products are not seeded in any migration.** They register through the same Add Product flow any other tenant uses. This is the cleanest demonstration that FlowAI is product-agnostic — and the audit-trail benefit is that each VEU product's `created_at` is attributable to the operator who registered it.

## Out of scope (intentionally not decided here)

- The 13 sister surfaces beyond PortfolioDashboard still hold legacy `VEU_PRODUCTS` constants. UX-3 retires them.
- `MainDashboard.jsx` and `ProductRegistryPanel.jsx` still read Base44 `ProductRegistry`. UX-2.b migrates them to `/api/products`.
- The 2-level provider→customer hierarchy (memory #6) is deferred to UX-4. The current `organizations` table is flat; a future migration will introduce `parent_org_id` or a `customer_orgs` table.
- RLS policies on `products` are deferred to the Clerk JWT integration. Today the API layer enforces `org_id` filtering in code; this is sufficient given the service-role-key bypass pattern.

## Consequences

### Positive

- Any tenant signing into FlowAI sees only their registered products.
- The empty-state UX (existing-but-unreachable pre-UX-2) becomes the canonical first-time experience.
- Score normalization, slug derivation, and the helper response shape are locked in one place — future surfaces cannot drift.
- The architectural-principle violation that prompted this dispatch is closed at the dashboard surface and prevented from recurring via the lint guardrail.

### Negative

- Existing VEU operators see an empty Portfolio Dashboard until the 5 products are registered. The deploy runbook for Phase B includes the 5 registrations as part of the dispatch so the empty state is bounded to seconds.
- Surface inconsistency persists during the UX-3 / UX-2.b transition window. The 13 untouched surfaces will keep showing the legacy 5-product list until they migrate. Acceptable for a few weeks; not indefinitely.

### Neutral

- A migration adds (`org_id`, `url`) and (`org_id`, `lower(name)`) unique indexes plus an `updated_at` trigger to `products`. This prevents duplicate product cards and fixes recency-sort drift.

## Guardrail (lint rule)

A custom ESLint rule at `eslint.config.js` (or whichever lint config the repo uses) flags any `const VEU_PRODUCTS = [...]` declaration in `src/`. CI fails if the rule fires on a new commit. Existing legacy usages in the 13 sister surfaces are allowlisted by file path until UX-3 retires them.

In addition, importing `src/lib/veuProducts.js` is allowlisted only in `src/pages/DemoGenerator.jsx` and `src/pages/GTMAssets.jsx` until UX-3.

## Compliance check

- [x] PortfolioDashboard: VEU_PRODUCTS const removed
- [x] PortfolioDashboard: dual-write to Base44 ProductRegistry removed
- [x] PortfolioDashboard: hardcoded `'VEU AI Studio'` org default removed from modal
- [x] PortfolioDashboard: hardcoded subtitle text replaced with org-derived value
- [x] `/api/products` shape contract test (`tests/api-products-handler.test.js`)
- [x] `/api/products` tenant-isolation test (`tests/api-products-handler-tenant-isolation.test.js`)
- [x] Migration 0005: uniqueness indexes + updated_at trigger
- [x] Backfill script for Base44 → /api/products
- [x] Lint guardrail
- [ ] UX-2.b: MainDashboard + ProductRegistryPanel migration (DEFERRED)
- [ ] UX-3: 13 sister surfaces de-hardcoded (DEFERRED)
- [ ] UX-4: provider→customer hierarchy migration (DEFERRED)
- [ ] RLS policies on `products` once Clerk JWT integration lands (DEFERRED)

## References

- Plan: `docs/ux-2-portfolio-dashboard-deharcoding-plan.md`
- Peer review: `docs/ux-2-portfolio-dashboard-deharcoding-plan.peer-review.json`
- Helper: `src/lib/products/registry.js`
- Migration: `supabase/migrations/0005_products_uniqueness_and_updated_at.sql`
- Backfill: `scripts/backfill-products-from-base44.mjs`
