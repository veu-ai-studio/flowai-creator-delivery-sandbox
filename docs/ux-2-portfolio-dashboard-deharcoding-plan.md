# UX-2 — Portfolio Dashboard De-Hardcoding Plan

**Date:** 2026-05-09
**Author (Phase A):** Claude (W5 Code, Anthropic)
**Status:** AUDIT + PLAN ONLY. No UI / schema / data modified.
**Implementation gate:** CEO approval after merging the independent peer-review findings appended below.

---

## Current State

### The architectural violation

`src/pages/PortfolioDashboard.jsx:14-20` defines a top-level constant `VEU_PRODUCTS` that hardcodes 5 specific products into the Portfolio Dashboard. It is then merged into the rendered list at `:125-128`:

```js
// PortfolioDashboard.jsx:14-20
const VEU_PRODUCTS = [
  { name: 'SAIGE',       slug: 'saige',       live_url: 'https://saigeplatform.com',     description: '...', org: 'VEU AI Studio', status: 'active' },
  { name: 'PressAI',     slug: 'pressai',     live_url: 'https://ourpublishingai.com',   description: '...', org: 'VEU AI Studio', status: 'active' },
  { name: 'ReachSMS',    slug: 'reachsms',    live_url: 'https://ourcommunitiesai.com',  description: '...', org: 'VEU AI Studio', status: 'active' },
  { name: 'RelTwin',     slug: 'reltwin',     live_url: 'https://reltwin.com',           description: '...', org: 'VEU AI Studio', status: 'active' },
  { name: 'MyBirthSafe', slug: 'mybirthsafe', live_url: 'https://preglife.com',          description: '...', org: 'VEU AI Studio', status: 'active' },
];

// :125-128
const allProducts = [...VEU_PRODUCTS, ...extraProducts].map(p => ({
  ...p,
  ...(apiMap[p.slug] || {}),
}));
```

VEU's 5 products are **always** rendered, regardless of whether `/api/products` returns rows, regardless of whether the Base44 `ProductRegistry` entity is populated, regardless of which org or tenant is signed in. Adding products via the modal appends to a *separate* in-memory `extraProducts` state slot rather than replacing the constant. This violates the locked principle:

> *FlowAI is standalone, product-agnostic OS infrastructure. Any product (current 5 VEU products are example consumers, not hardcoded integrations) wires into FlowAI.*

### Hardcoded-product reach beyond Portfolio Dashboard

The same 5-product hardcoding pattern is replicated in **at least 13 other surfaces** (out of dispatch scope, but flagged to W02 because the systemic violation is wider than the dispatch implies):

| File:line | Form | In scope of THIS dispatch? |
| --- | --- | --- |
| `src/pages/PortfolioDashboard.jsx:14-20` | Inline `VEU_PRODUCTS` const | **YES** — primary scope |
| `src/lib/veuProducts.js` | Exported `VEU_PRODUCTS` const + per-product `synthetic_prompt` payloads | NO (consumed by `DemoGenerator`, `GTMAssets`) |
| `src/pages/Architecture.jsx:11-15` | Inline 5-product const | NO |
| `src/pages/BrandSystem.jsx:7` | `const PRODUCTS = ['SAIGE', ...]` | NO |
| `src/pages/CapabilityInstallSelfProtection.jsx:20-24` | Inline 5-product const | NO |
| `src/pages/CapabilityInstallSelfRenewal.jsx:21-49` | Inline 5-product const | NO |
| `src/pages/Clearance.jsx:16-22` | Inline `VEU_PRODUCTS` const | NO |
| `src/pages/CostUsage.jsx:8` | `const VEU_PRODUCTS = ['SAIGE', ...]` | NO |
| `src/pages/DataExport.jsx:9-53` | Inline 5-product const | NO |
| `src/pages/DemoGenerator.jsx:4` | `import { VEU_PRODUCTS }` | NO |
| `src/pages/DomainManager.jsx:11-15` | Inline 5-product const | NO |
| `src/pages/Environments.jsx:12-16` | Inline 5-product const | NO |
| `src/pages/GTMAssets.jsx:4` | `import { VEU_PRODUCTS }` | NO |

**Recommendation:** ship the Portfolio Dashboard fix as a vertical slice that proves the pattern, then a follow-up dispatch for the other 13 surfaces (UX-3 onward). Trying to fix all 14 in one PR fans out the blast radius.

### Sister surfaces — what they already do right

| Surface | File | Behavior | Verdict |
| --- | --- | --- | --- |
| Dashboard "My Products Health" | `src/pages/MainDashboard.jsx:55,128-168` | Reads `base44.entities.ProductRegistry.list('-last_run_at', 20)`. Empty state (`portfolio.length === 0`) shows "No products registered yet" + "Create Your First Product" CTA. **No hardcoded fallback.** | ✅ Correct |
| ProductRegistryPanel (used by `/portfolio-engine`) | `src/components/portfolio/ProductRegistryPanel.jsx:40,48,61` | Filters by `owner_email` (multi-tenant via Base44 user). Reads, creates, deletes via `base44.entities.ProductRegistry`. Empty state: "No products yet — add a URL above." | ✅ Correct |

So the canonical pattern *already exists* in the codebase. Portfolio Dashboard is the only outlier among the three primary surfaces.

### Add Product flow — current behavior

`src/pages/PortfolioDashboard.jsx:44-99` (`AddProductModal`) and `:164-167` (`handleProductAdded`):

1. Calls `POST /api/products` with the form body. The Vercel handler (`api/products.js`) writes to the Supabase `products` table (with `org_id` from `requireAuth`) — this is the correct, multi-tenant path.
2. **Also** calls `base44.entities.ProductRegistry.create({ label, url, product_name })` as a "fallback" — writing the same record to a *second* store.
3. On success, `handleProductAdded` appends to local `extraProducts` state, then triggers a re-`load()`.

**Problems with the current flow:**
- Dual writes to two different stores (`/api/products` Supabase + Base44 `ProductRegistry` entity) with no consistency contract. They will drift.
- The form's default `org` is hardcoded `'VEU AI Studio'` (line 45, 82) — a new tenant filling out the modal silently inherits VEU's org name.
- `AddProductModal`'s collected fields (`name`, `slug`, `live_url`, `description`, `org`) don't match the Supabase `products` schema (which has `name`, `url`, `description`, `type`, `status`, `tags`) — `slug` and `org` are dropped on the server side; `type`, `status`, `tags` are never set from the UI.

### Existing schema + adapter — what's already there

The Vercel-side `products` table **already exists** and is correct:

```sql
-- supabase/migrations/0001_initial.sql:56-71
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  url text default '',
  description text default '',
  type text default 'web',
  status text default 'draft',     -- draft | active | audited | archived
  tags text[] default '{}',
  last_audit_at timestamptz,
  last_audit_score numeric,
  cost_to_date_usd numeric not null default 0,
  embedding vector(1024),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_org on products(org_id);
create index if not exists idx_products_status on products(org_id, status);
create index if not exists idx_products_updated on products(org_id, updated_at desc);
create index if not exists idx_products_url on products(url);
```

Adapter is `api/_lib/db.js` (`listProducts`, `getProduct`, `createProduct`, `updateProduct`) — picks Supabase when configured, falls back to in-memory. `org_id` scoping enforced at every read/write.

**`/api/products` HTTP layer** is wired (`api/products.js`) — `requireAuth` resolves `orgId` from request context.

**RLS:** enabled on `products` (line 262 of 0001) but policies are explicitly TODO ("activate when Clerk JWT verification lands"). Service-role key bypasses RLS so the API works today.

### Multi-tenant model gap

Memory #6 specifies a 2-level hierarchy: **providers** are authenticated users; **end-customers** are sub-orgs under providers.

The current schema is **flat**:
- `organizations` (id, clerk_org_id, name, slug, plan, metadata)
- `organization_members` (org_id, user_id, role) — many-to-many of users in orgs
- `products.org_id` references `organizations(id)`

There is **no `parent_org_id` / sub-org concept** in the current schema. Every product is owned directly by a single flat `org`. To support the provider → end-customer hierarchy, we'd need either:

- Self-referential `organizations.parent_org_id uuid references organizations(id)`, or
- A separate `customer_orgs` table parented by `org_id`

**This dispatch deliberately does NOT introduce that change.** The hierarchy work is a separate, larger ticket (a real schema migration with RLS implications). The plan below stays scoped to "stop hardcoding 5 products" using the existing flat schema. The hierarchy gap is called out as a known follow-up.

---

## Target State

A new tenant signing into FlowAI sees:

1. **Portfolio Dashboard** — empty state ("No products registered. Register your first product to start tracking portfolio health.") with a single primary CTA: "Register First Product".
2. **Existing tenants** see the products they have actually registered, scoped to their `org_id`. Zero hardcoded fallbacks.
3. **VEU AI Studio's 5 products** appear via the SAME path any other tenant uses — registered through the modal, written to `products` (Supabase), keyed to VEU's `org_id`. Not seeded in a migration.
4. **Add Product flow** writes to **one** store (`/api/products` → Supabase). The Base44 `ProductRegistry` entity dual-write is removed.
5. **Empty state, header subtitle, modal defaults** carry no VEU-specific strings. The `orgName` already comes from `/api/me` (line 154-157); the hardcoded "VEU AI Studio — AI portfolio control center" subtitle (line 182) is replaced by `{orgName} — AI portfolio control center` (or just `Portfolio control center` until org-name customization is wired).

---

## Schema Implications

### Is a new migration needed?

**No.** The `products` table from `0001_initial.sql` is sufficient for this dispatch:
- `org_id` scoping is in place
- Indexes for `(org_id)`, `(org_id, status)`, `(org_id, updated_at desc)` already exist
- All required columns (`name`, `url`, `description`, `type`, `status`, `tags`, `last_audit_at`, `last_audit_score`) are present

### What's missing from the schema vs. what the UI displays

The Portfolio Dashboard renders fields the current schema doesn't carry directly:

| UI field | Source today | Source after fix |
| --- | --- | --- |
| `name` | hardcoded | `products.name` |
| `slug` | hardcoded | **derive client-side** from name (kebab-case) OR add a `slug` column in a follow-up migration if URL-friendly slug routing is needed. NOT blocking this dispatch. |
| `live_url` | hardcoded | `products.url` (rename UI variable) |
| `description` | hardcoded | `products.description` |
| `last_score` (0–10) | enriched from `ProductRegistry.last_score` (Base44 entity, 0–10 scale) | `products.last_audit_score` (numeric) — **rescale** at the read boundary to 0–10. **Or** introduce a `score_normalized` view. |
| `last_run_at` | enriched from `ProductRegistry.last_run_at` | `products.last_audit_at` |
| `org` (display string) | hardcoded `'VEU AI Studio'` | join `organizations.name` on `org_id`, or send via `/api/me` |
| Clearance status | `base44.entities.ClearanceRecord` keyed by `product_name` | **stays on Base44 for now** — clearance migration to Supabase is a separate follow-up |

### RLS implications (provider-scoped reads)

RLS is currently enabled-without-policies. The API server uses the service-role key and bypasses RLS, so multi-tenancy is enforced *in code* via `org_id` filters. This dispatch does NOT introduce policies. When Clerk JWT-based RLS lands (a later ticket), policies on `products` will look like:

```sql
create policy products_org_read on products
  for select using (org_id = (auth.jwt() ->> 'org_id')::uuid);
create policy products_org_write on products
  for all using (org_id = (auth.jwt() ->> 'org_id')::uuid)
            with check (org_id = (auth.jwt() ->> 'org_id')::uuid);
```

Today's API-side `org_id` filtering remains correct because it's already what the policy will enforce.

### Slug column — defer or include?

The dispatch's hardcoded shape includes `slug`. The current schema doesn't. Two options:
- **Defer** — derive slug client-side or compute via SQL function. No migration. Scope shrinks.
- **Include** — add `alter table products add column slug text generated always as (lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) stored;` in a tiny migration. Explicit, indexable, but expands scope by one migration file.

**Recommendation:** **defer.** Compute slug client-side from `name`. This avoids a migration for a non-blocking concern.

---

## Adapter Implications

### Reuse, don't add new

The existing `api/_lib/db.js` adapter is sufficient. No new `/src/lib/products/*` adapter needed for the Vercel-side path — the HTTP layer at `/api/products` IS the adapter contract.

The Base44 `ProductRegistry` entity *is* a separate adapter today and the codebase has at least three consumers (`MainDashboard`, `ProductRegistryPanel`, `PortfolioDashboard`). Two paths:
- **A. Drop ProductRegistry as a primary path.** `/api/products` becomes the single canonical product list. `MainDashboard` and `ProductRegistryPanel` migrate to read `/api/products` instead. Cleanest end-state.
- **B. Keep ProductRegistry as a Base44-side mirror, but drop the dual-write.** Single-write to `/api/products`; `ProductRegistry` becomes a Base44-side cache populated by a sync hook later.

**Recommendation:** **A**, but staged — *this* dispatch only touches PortfolioDashboard. PortfolioDashboard switches to `/api/products` only. `MainDashboard` + `ProductRegistryPanel` migration is a follow-up (UX-2.b). Nothing breaks because the Base44 entity continues to exist and can still be written to during the transition.

### Optional: tiny client-side helper

To stay DRY across the eventual migration, introduce a thin helper:

```
/src/lib/products/registry.js  (ESM, ~40 lines)

  export async function listProducts({ status, q, sort, limit, offset, fetcher = fetch } = {}) {
    const qs = new URLSearchParams({ ...(status && { status }), ... });
    const r = await fetcher(`/api/products?${qs}`);
    if (!r.ok) throw new Error(`listProducts: ${r.status}`);
    return r.json();
  }

  export async function createProduct(input, { fetcher = fetch } = {}) {
    const r = await fetcher('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!r.ok) throw new Error(`createProduct: ${r.status}`);
    const { item } = await r.json();
    return item;
  }
```

Lets PortfolioDashboard, future MainDashboard refactor, and ProductRegistryPanel migration all import from one place. Path is `/src/lib/products/registry.js` (canonical per dispatch's ESM-only constraint).

---

## UI Changes

### `src/pages/PortfolioDashboard.jsx` — the actual de-hardcoding

| Before | After |
| --- | --- |
| Lines 14-20: `VEU_PRODUCTS` const | **DELETE** |
| Line 109: `const [extraProducts, setExtraProducts] = useState([])` | **DELETE** — products list comes entirely from server |
| Lines 113-118: parallel fetches including hardcoded `VEU_PRODUCTS` | Replace with `listProducts()` from `/src/lib/products/registry.js` + the existing `ClearanceRecord` + `AutoSession` reads |
| Lines 125-128: `[...VEU_PRODUCTS, ...extraProducts]` | Use server response directly |
| Lines 138-142: enrichment from `ProductRegistry` for `last_score`/`last_run_at` | Source from `products.last_audit_score` / `products.last_audit_at` (already on the row) |
| Line 45: `org: 'VEU AI Studio'` modal default | Set to `''` and let server resolve `org_id` from the auth context |
| Line 165: `setExtraProducts(prev => [...prev, ...])` | Replace with `await load()` (single-source-of-truth refresh) |
| Lines 59-63: dual-write to `base44.entities.ProductRegistry.create` | **DELETE** the dual-write |
| Line 182: hardcoded subtitle "VEU AI Studio — AI portfolio control center" | Replace with `{orgName} — Portfolio control center` (orgName already populated from `/api/me`) |
| Lines 210-218: empty-state component | **Already correct** — already exists for `products.length === 0`; this fix actually *makes that empty state reachable*, since today VEU_PRODUCTS guarantees `length >= 5` |

Estimated diff: **~60 lines deleted, ~40 lines changed, ~20 lines added.** Net: leaner.

### Cross-surface consistency

This dispatch only touches PortfolioDashboard. The other 13 surfaces (Architecture, BrandSystem, CapabilityInstall*, Clearance, CostUsage, DataExport, DemoGenerator, DomainManager, Environments, GTMAssets, plus `src/lib/veuProducts.js`) keep their hardcoded constants for now. **A separate UX-3 dispatch** should address them, ideally batched by consumer (Clearance + CostUsage + DataExport are similar shapes; CapabilityInstall* are similar; etc.).

`MainDashboard.jsx` and `ProductRegistryPanel.jsx` already correctly read from `ProductRegistry`. They don't need to change in *this* dispatch. They'll migrate to `/api/products` in a follow-up (UX-2.b) when we drop the Base44 entity from the primary path.

---

## Migration Plan

### SQL migrations

**None required.** The existing `products` table covers what this dispatch needs.

If CEO wants the optional `slug` column, the migration file would be:

```sql
-- supabase/migrations/0005_products_slug.sql
alter table products add column if not exists slug text;
update products set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) where slug is null;
create unique index if not exists idx_products_slug_per_org on products(org_id, slug);
```

But **the recommendation is to defer** — compute slug client-side. Skip 0005 entirely.

### Seeding strategy

**Do NOT seed VEU's 5 products in any migration.** They register through the proper Add Product flow as the first legitimate use of the platform. This is the cleanest demonstration that FlowAI is product-agnostic.

Practical onboarding for VEU after this ships:
1. CEO logs in (resolves to VEU's `org_id`).
2. Lands on Portfolio Dashboard → empty state.
3. Clicks "Register First Product" → modal opens.
4. Fills in SAIGE (name=SAIGE, url=https://saigeplatform.com, description=…), submit.
5. Repeat for PressAI, ReachSMS, RelTwin, MyBirthSafe.

Five 30-second registrations replace the hardcoded const. CEO has the audit-trail benefit: each registration is a real `products` row with `created_at`, attributable to the operator.

### Gap period during deploy

When this ships:
- Existing tenants see whatever they've registered (zero hardcoded backfill, so VEU sees an empty list until they register).
- The first 30 seconds of VEU's experience after deploy: empty Portfolio Dashboard, no panic — the empty state explicitly says "Register your first product to start tracking portfolio health."

**To zero out the gap:** ship the 5 VEU registrations as a *one-shot dispatch* — log in as VEU, register the 5 products via the flow, in production. Five HTTP POSTs against `/api/products` after the code deploys. No migration.

---

## Test Coverage

| Test | File | Type |
| --- | --- | --- |
| `listProducts` helper happy-path / empty / 5xx | `tests/products-registry.test.js` | unit (mocked fetch) |
| `createProduct` helper happy-path / 4xx / network error | same | unit |
| Portfolio Dashboard renders empty state when `/api/products` returns `{items: []}` | `tests/portfolio-dashboard.test.jsx` (NEW dir for JSX tests, with `@testing-library/react` if not yet installed) | component |
| Portfolio Dashboard renders product cards when items present | same | component |
| `AddProductModal` POSTs to `/api/products` only (no Base44 dual-write) | same | component |
| `AddProductModal` does not default `org` to a hardcoded value | same | component |
| `/api/products` GET respects `org_id` from auth (regression check) | `tests/api-products-handler.test.js` (NEW; in-process like `tests/api-health-handler.test.js`) | handler |

**Existing tests that must still pass with no changes:** `tests/baseagent.test.js`, `tests/credentialadapter-edge.test.js`, `tests/researchViaApi.test.js`, `tests/invokeLlmViaApi.test.js`, all the Agent #1 / Agent #2 / orchestrator / message-bus / store-adapter suites — total **~679 currently passing**.

If `@testing-library/react` is not yet present, ship the helper unit tests + the in-process handler test in this dispatch and defer the JSX component tests to UX-2.b alongside the MainDashboard migration.

---

## Estimated Scope

| Category | Count | Files |
| --- | --- | --- |
| Files modified | 1 | `src/pages/PortfolioDashboard.jsx` |
| Files added | 1–2 | `src/lib/products/registry.js`; optionally a small `productMappers.js` if score-rescaling lives separately |
| Migrations | 0 | (1 if CEO opts in to the `slug` column — recommend NO) |
| New test files | 1–3 | `tests/products-registry.test.js`, `tests/api-products-handler.test.js`, optionally `tests/portfolio-dashboard.test.jsx` |
| Dispatch follow-ups already enumerated | 2 | UX-2.b (MainDashboard + ProductRegistryPanel migrate to `/api/products`); UX-3 (de-hardcode the other 13 surfaces) |

**Implementation time (AI minutes):** **20–35 minutes** for this dispatch alone. Breakdown:
- 5–8 min: write `src/lib/products/registry.js` + unit tests
- 8–12 min: refactor `PortfolioDashboard.jsx` (delete const, swap loaders, adjust modal)
- 4–6 min: write `tests/api-products-handler.test.js` for the auth/`org_id` regression
- 3–5 min: full vitest run, build verify
- 0 min: no commit until W02 approval per dispatch policy

---

## Risk Assessment

### What breaks if we ship as planned

| Risk | Likelihood | Severity | Mitigation |
| --- | --- | --- | --- |
| VEU's existing dashboard is empty until they register the 5 products | **Certain** | LOW | Ship the post-deploy 5-product registration as a pinned next-step. Empty state messaging already explains the path. |
| Some out-of-scope surface (Clearance, CostUsage, DemoGenerator) still references VEU_PRODUCTS as a const and gets out of sync with what's in `products` table | Medium | MEDIUM | This dispatch deliberately doesn't touch them; UX-3 follow-up addresses them. The surfaces still work — they just keep showing the legacy 5-product list until UX-3. |
| `MainDashboard` reads `ProductRegistry` (Base44) while `PortfolioDashboard` reads `/api/products` (Supabase) — two views diverge | High | MEDIUM | Acceptable for a brief transition period since `MainDashboard` already correctly empty-states. UX-2.b closes this. |
| `/api/products` returns `org_id`-scoped to "veu-ai-studio" (Vercel team) but team-vs-tenant mapping is not yet defined — could route a partner's products into VEU's view or vice versa | Low (only one team today) | HIGH if multi-team launches before the mapping is fixed | Test #6 (`org_id` regression) catches this. Block multi-team launch until the mapping is explicit. |
| Adding the `slug` column later (if needed) becomes a mini-migration | Low | LOW | Deferring slug is reversible; a 4-line migration adds it cleanly. |
| The dual-write removal silently drops data that was only in `ProductRegistry` (Base44) and not in `/api/products` (Supabase) | Medium | MEDIUM | Audit `ProductRegistry` rows for orphans before deploy. If any tenant has data only in Base44, write a one-shot copy script before flipping. |

### What breaks if we DON'T ship

| Risk | Severity |
| --- | --- |
| Architectural-principle violation persists. CEO has flagged it; not fixing erodes the credibility of the principle. | HIGH |
| Every new tenant signing in sees VEU's 5 products as if they were their own — actively misleading. | HIGH |
| The 13 sister surfaces remain frozen behind the same anti-pattern; no path to fix them without doing this first. | MEDIUM |
| The empty-state UX (already coded but unreachable) is dead code. | LOW |

### Backward compatibility

- **API contract:** `/api/products` GET/POST stays unchanged. No consumer breaking change.
- **Base44 `ProductRegistry`:** entity is not deleted in this dispatch. `MainDashboard` and `ProductRegistryPanel` continue to read it; the only thing this dispatch removes is the *dual-write* on the Add Product flow inside PortfolioDashboard.
- **AutoSession / ClearanceRecord:** untouched. They are keyed by `product_name` — the product's display name in the new flow is the same string the user enters in the modal.
- **Existing rows in `products` table:** untouched. If VEU has registered any products there already, they show up immediately on Portfolio Dashboard after deploy.

---

## Phase B (Implementation) — gating

This dispatch ends at PLAN. Implementation is a separate dispatch, scoped to:

1. CEO selects **GO / GO_WITH_CHANGES / NO_GO** based on this plan + the peer-review section appended below.
2. If GO: a new dispatch authorizes the file changes, the test additions, and a single combined commit on `flowai-v0.1`.
3. UX-2.b (MainDashboard + ProductRegistryPanel migration) and UX-3 (de-hardcode the other 13 surfaces) are queued behind UX-2 success.

The peer-review section follows.

---

## Peer Review Findings (Independent AI)

**Reviewer:** `openai/gpt-5` via OpenRouter (no fallback used; primary model returned cleanly)
**Latency:** 666 ms inference / 41 s round-trip (incl. queue + cold-start)
**Agreement with Claude's plan:** **84%**
**Approve to implement:** **YES_WITH_CHANGES**
**Scope calibration:** **right** (not over-engineered, not under-engineered)

> Raw structured output is at `docs/ux-2-portfolio-dashboard-deharcoding-plan.peer-review.json`.

### Root-cause completeness — peer's verdict

> *"Partially. The plan identifies the systemic hardcoding pattern and replaces it in PortfolioDashboard, but it doesn't fully explain the original motivation (e.g., demo scaffolding, API immaturity) nor introduce guardrails to prevent recurrence (lint/CI checks, shared data-access module mandate, ADR)."*

**Implication for Phase B:** add an **Architecture Decision Record** (`/docs/adr/0001-no-hardcoded-products.md`) and a lint/AST check that fails CI on any new top-level `VEU_PRODUCTS`-shaped const in `src/`. Both are inexpensive; both prevent the fix from rotting back.

### Schema concerns peer raised that the plan does NOT yet address

| # | Concern | Recommended response |
| --- | --- | --- |
| S1 | No provider→customer hierarchy (flat `organizations`); will need `parent_org_id` or `customer_orgs` soon. | Already flagged as a known follow-up — document as "Hierarchy Migration" (UX-4) and pin to the agent-onboarding milestone. |
| S2 | RLS policies not enforced; relying on service-role + code-level filters risks cross-tenant leaks. | Real concern. **Phase B must include** an in-process test that simulates two `org_id`s and verifies cross-tenant reads are rejected at the handler level — equivalent of an RLS smoke test until policies land. |
| S3 | No uniqueness constraints per org — `(org_id, url)` or `(org_id, name)` allow duplicate products. | Add to migration `0005_products_uniqueness.sql`. **Recommend ship in Phase B.** Cheap, prevents real bug. |
| S4 | Deferring `slug` may become a breaking routing change later. | Acceptable risk per the plan. Lock the contract: when slug lands, derive deterministically from name and grandfather existing rows. Document the migration plan in the ADR (see root-cause section). |
| S5 | Clearance keyed by `product_name` not `product_id`; cross-tenant collisions possible. | **Confirmed risk.** Two tenants with a product named "Hub" would collide. Flag for UX-2.b: when MainDashboard migrates, also rekey ClearanceRecord lookups on `product_id`. Until then, low-risk because there's only one tenant (VEU). |
| S6 | Divergent data domains (Supabase `products` vs Base44 `ClearanceRecord` / `ProductRegistry`) lack stable keying / join strategy. | Same as S5 — UX-2.b should establish the join contract (`products.id` ↔ Base44 entity custom field) before MainDashboard migrates. |
| S7 | Undefined `last_audit_score` scale (numeric vs 0-10) could drift. | Lock the contract at the read boundary: `score_normalized = clamp(round(last_audit_score / 10), 0, 10)`. Document in `/src/lib/products/registry.js` JSDoc. |
| S8 | `updated_at` relies on `DEFAULT now()` only; no auto-update trigger. | Add to the same `0005` migration: `updated_at` trigger. |

### Consistency gaps peer raised

> *"No repo-wide guardrail to block reintroduction of inline product constants (e.g., lint/AST check)."*
> *"Helper is optional and only used by one surface initially, not enforcing uniform access."*

**Implication for Phase B:** add an ESLint rule (or simple `grep`-based pre-commit / CI check) that flags any new `const VEU_PRODUCTS` or imports of `src/lib/veuProducts.js`. Existing usages can be allowlisted until UX-3 retires them.

### Seeding / onboarding gaps peer raised

| # | Concern | Recommended response |
| --- | --- | --- |
| O1 | Manual CEO registration → potentially long empty-portfolio gap if the step is delayed. | Bake the 5-product registration into the deploy runbook: same dispatch ships the code AND the 5 POSTs. Empty state is bounded to seconds, not days. |
| O2 | No automated backfill from Base44 ProductRegistry to Supabase. | Add a `scripts/backfill-products-from-base44.mjs` one-shot to the Phase B dispatch. Reads `ProductRegistry` rows for the active tenant, dedupes against `/api/products`, POSTs missing rows. Idempotent. |
| O3 | Name-based linkage for Clearance records is fragile during transition. | Same response as S5/S6: lock the join contract in UX-2.b. Until then, accept name-based fragility for the 5 VEU products. |
| O4 | No explicit runbook/owner for the one-shot VEU registration. | The Phase B dispatch IS the runbook. CEO is owner. Logged in commit body. |
| O5 | No pre-deploy verification of `org_id` mapping. | Add a smoke step to Phase B: `vercel curl /api/me` and confirm `org_id` is set and non-empty before flipping the code path. |

### Risk blindspots peer raised

| # | Blindspot | Plan-side mitigation |
| --- | --- | --- |
| R1 | ClearanceRecord and other Base44 entities keyed by `product_name` may leak / mix data across tenants. | UX-2.b will rekey on `product_id`. Until then, single-tenant deployment is safe. |
| R2 | Helper-vs-handler shape mismatch (`{items: []}` vs `{data: []}`) at runtime. | Add a contract test: `tests/api-products-handler.test.js` asserts the response shape; `tests/products-registry.test.js` consumes the same shape. Single source of truth in JSDoc. |
| R3 | Lack of pagination on `listProducts` could degrade at scale. | Default `limit: 100` in the helper, with explicit `loadMore` API. Currently `/api/products` defaults to `limit: 1000` — fine for now, but document the cliff. |
| R4 | Client-side slug derivation can drift over time. | Acknowledged. ADR locks the derivation function (lowercase + `[^a-zA-Z0-9]+ → -`). Same code path everywhere. When slug column lands, generate using the same rule. |
| R5 | No duplicate prevention on create. | Covered by S3 (unique index in `0005`). |
| R6 | Network / 500 errors may render as empty state, masking outages. | **Real concern.** Phase B must distinguish between "load succeeded, 0 items" and "load failed". Helper returns a discriminated union: `{ok: true, items}` vs `{ok: false, error}`. Empty-state UI only shown on `ok: true && items.length === 0`. Error state shown on `ok: false`. |
| R7 | RLS disabled means handler-bug → cross-tenant exposure. | Same as S2 — Phase B includes an `org_id`-isolation handler test. |
| R8 | `updated_at` not auto-updating on edits confuses recency sorting. | Covered by S8 (trigger in `0005`). |

### Top 3 concerns from peer reviewer (verbatim)

1. **Cross-surface inconsistency persists.** 13 hardcoded surfaces + Base44 vs Supabase split, causing divergent truths and user confusion until follow-ups land.
2. **Multi-tenancy robustness gaps.** No provider → customer hierarchy, no RLS enforcement, name-keyed Clearance — risks future breaking changes and possible data leakage.
3. **Seeding / onboarding relies on manual steps** without a concrete runbook or automated backfill — risks a prolonged empty state for VEU and perceived data loss.

### Reconciled implementation scope (Claude + peer)

The peer is correct that the plan as-written is *minimum viable*. To approve **YES** rather than **YES_WITH_CHANGES**, Phase B should also ship:

| Add to Phase B | Rationale |
| --- | --- |
| `docs/adr/0001-no-hardcoded-products.md` | Locks the architectural decision so it doesn't rot back. (root-cause guardrail) |
| ESLint rule or CI grep against new `VEU_PRODUCTS` consts | Prevents recurrence. |
| `tests/api-products-handler-tenant-isolation.test.js` | Simulates two `org_id`s; rejects cross-tenant read. (RLS proxy until policies land — S2 / R7) |
| `supabase/migrations/0005_products_uniqueness_and_updated_at.sql` | `(org_id, url)` unique index + `updated_at` trigger. (S3 + S8) |
| `scripts/backfill-products-from-base44.mjs` (one-shot) | Removes the "perceived data loss" risk for the existing tenant. (O2) |
| Helper returns discriminated union `{ok, items?, error?}` | Distinguishes empty-state from outage. (R6) |
| Phase B dispatch also runs the 5 VEU registrations as part of deploy | Bounded empty-state to seconds. (O1) |
| `vercel curl /api/me` smoke before flipping code path | Confirms `org_id` mapping pre-deploy. (O5) |

**Revised time estimate with peer's additions:** **40–60 minutes** (was 20–35). Still single-dispatch sized.

---

## Final disposition

| Reviewer | Approval | Conditions |
| --- | --- | --- |
| Claude (Phase A author) | YES | None |
| `openai/gpt-5` (peer) | YES_WITH_CHANGES | 8 additions enumerated above |
| **Claude after merge** | **YES_WITH_CHANGES** | Adopt all 8 peer additions for Phase B. |

**Recommendation to W02:** approve Phase B implementation **with the 8 peer additions**. The combined plan stays within a single dispatch's scope and meaningfully closes blindspots that would otherwise become production incidents.
