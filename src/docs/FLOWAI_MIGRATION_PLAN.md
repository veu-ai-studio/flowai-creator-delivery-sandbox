# FlowAI — Migration Plan

**Product:** FlowAI / VEUaaS  
**Organization:** VEU AI Studio  
**Last updated:** 2026-05-05  
**Status:** Active — Base44 build phase in progress  

---

## 0. Permanent Standard — Read First

> **Base44 is the permanent UI builder for FlowAI, both before and after migration to Vercel.**
>
> Migration is NOT a handoff away from Base44. It is a shift in WHERE Base44's output is hosted and integrated.
> Every future feature, redesign, iteration, and demo tier will continue to be built inside Base44 indefinitely.
> Base44 ↔ GitHub auto-mirror is the permanent sync mechanism.

This standard applies to:
- The main FlowAI product (all authenticated pages)
- All four GTM demo tiers (Tier 1–4)
- All future feature additions
- All white-label variants

---

## 1. Migration Overview

| Phase | What | Status |
|-------|------|--------|
| Phase 1 | Base44 build — full UI, entities, backend functions | ✅ In progress |
| Phase 2 | Base44 ↔ GitHub auto-mirror activated | ⏳ Pending |
| Phase 3 | Vercel project created, connected to GitHub mirror repo | ⏳ Pending |
| Phase 4 | Vercel `/api` routes replace Base44 backend functions (Claude Code) | ⏳ Pending |
| Phase 5 | Custom domain routing (main product + GTM tiers) | ⏳ Pending |
| Phase 6 | Production hardening — auth, multi-tenancy, observability | ⏳ Pending |
| Phase 7 | GTM demo stack live on public URLs | ⏳ Pending |

---

## 2. Base44 ↔ GitHub Sync — Permanent Workflow

```
Base44 UI Builder
      │
      │  Auto-mirror (bidirectional)
      ▼
GitHub Repo: veu-ai-studio/flowai
      │
      │  Vercel Git integration
      ▼
Vercel Project: flowai-prod
      │
      ├── flowai.veuaistudio.com  (main product)
      ├── veaas.com               (Tier 1 — marketing)
      ├── demo.veaas.com          (Tier 2 — sandbox)
      ├── live.veaas.com          (Tier 3 — live demo)
      └── enterprise.veaas.com   (Tier 4 — sales demo)
```

**Workflow for every UI change (permanent):**
1. Build or edit in Base44
2. Base44 auto-mirrors to GitHub on save
3. Vercel detects push → deploys in ~30s
4. Change is live on all affected domains

This workflow applies equally to the main product and all four demo tiers.

---

## 3. Four-Tier GTM Demo Architecture

The GTM demo stack is a first-class part of the product — not a bolt-on.  
It shares the product's design system, component library, backend endpoints, and observability layer.

### 3.1 Tier Map

| Tier | Name | Route (Base44) | Public Domain | Buyer Stage |
|------|------|----------------|---------------|-------------|
| 1 | Marketing Site | `/veaas` | `veaas.com` | Cold traffic |
| 2 | Self-Serve Sandbox | `/demo` | `demo.veaas.com` | Warm / self-qualified |
| 3 | Live Public Demo | `/live-demo` | `live.veaas.com` | High-intent evaluators |
| 4 | Enterprise Guided Demo | `/enterprise-demo` | `enterprise.veaas.com` | Sales-qualified |

### 3.2 Hosting Decision

All four tiers are routes within the **same Vercel project** as the main FlowAI product.  
They share the same build artifact, the same Vercel environment, and the same `/api` backend.  
Traffic is routed by domain via Vercel domain aliases on the single project.

> **Rationale:** Shared hosting means shared design tokens, shared backend functions, shared observability, and a single deploy pipeline. Separate projects would fragment the codebase and create drift.

There is NO separate marketing project. Tier 1 lives in the main Vercel project.

### 3.3 Seeded Data — Generation, Refresh, Isolation

| Tier | Data Source | Refresh | Isolation |
|------|-------------|---------|-----------|
| 1 | `src/data/demo/*.json` (static) | Manual (with new sprints) | No backend — pure client import |
| 2 | `src/data/demo/*.json` (static) | Manual | No backend — pure client import |
| 3 | `demo-org-public` in Supabase | Daily via `GET /api/admin/seed-demo` (cron) | `org_id = "demo-org-public"` scopes all DB reads/writes |
| 4 | `demo-org-enterprise` in Supabase | On lead form submit + daily cron | `org_id = "demo-org-enterprise"` + lead email scoping |

**Isolation rule:** No demo org_id can ever read or write data belonging to `org_id = "prod-*"`. This is enforced at the Supabase RLS policy level, not at the API level.

**Static mock data files:**
- `src/data/demo/products.json` — 5 VEU AI Studio products with scores, tags, clearance status
- `src/data/demo/runs.json` — 10 pipeline runs with verdicts and timing
- `src/data/demo/costs.json` — 30-day cost data, daily breakdown, per-product totals

### 3.4 Backend Endpoint Routing — Demo vs Production

All endpoints are in the same `/api` namespace. Demo traffic is identified by `org_id` in the request body, never by subdomain or route prefix.

| Endpoint | Demo | Production | Notes |
|----------|------|------------|-------|
| `POST /api/configuration/clone` | ✅ `org_id: "demo-org-public"` | ✅ `org_id: "prod-{id}"` | Run cap enforced for demo org |
| `POST /api/leads` | ✅ (all tiers) | N/A | Routes to Resend + CRM |
| `GET /api/admin/seed-demo` | ✅ admin only | N/A | Cron + manual trigger |
| `GET /api/products` | ✅ demo org | ✅ prod org | RLS scoped |
| `POST /api/products` | ✅ demo org | ✅ prod org | RLS scoped |
| `GET /api/health` | ✅ | ✅ | Unauthenticated, returns system status |
| `GET /api/cost-summary` | ✅ demo org | ✅ prod org | RLS scoped |

**Run cap for Tier 3:** Enforced in `POST /api/configuration/clone` — max 1 run per `requester_email` per calendar day when `org_id = "demo-org-public"`. Stored in `demo_run_log` table.

### 3.5 Lead Flow — Tier 4 → CRM

```
EnterpriseDemo form submit
      │
      ▼
POST /api/leads
      │
      ├── Insert to `leads` table (Supabase)
      │     fields: name, email, company, ai_product_count, use_case, source, tier, created_at
      │
      ├── Resend: notify demo@veuaistudio.com
      │     subject: "New enterprise demo lead: {company} — {name}"
      │
      └── (Phase 6) Webhook to CRM (HubSpot / Pipedrive / Notion DB)
            payload: full lead fields + tour_step_completed
```

**Tour progress persistence:** Stored in `localStorage` keyed by email (`flowai_tour_{email}`). Not synced to backend in Phase 1. Will sync to `leads.tour_step` in Phase 6.

---

## 4. Domain Routing

| Domain | Vercel Alias Target | Auth Required | Demo Tier |
|--------|---------------------|---------------|-----------|
| `flowai.veuaistudio.com` | `/` (AppLayout routes) | Yes | N/A — production |
| `veaas.com` | `/veaas` | No | Tier 1 |
| `demo.veaas.com` | `/demo` | No | Tier 2 |
| `live.veaas.com` | `/live-demo` | No | Tier 3 |
| `enterprise.veaas.com` | `/enterprise-demo` | No | Tier 4 |

Vercel domain aliases map each domain to a specific route prefix using `vercel.json` rewrites. All domains share the same Vercel project and the same Next.js/Vite build output.

---

## 5. Backend Migration — Base44 → Vercel `/api`

Existing Base44 backend functions to be migrated as Vercel serverless functions (Claude Code sprint):

| Base44 Function | Vercel Route | Priority |
|-----------------|--------------|----------|
| `orchestrate` | `POST /api/orchestrate` | P0 |
| `autonomousEngine` | `POST /api/run` | P0 |
| `crawlPage` / `claudeCrawl` | `POST /api/research-url` | P0 |
| `analyzeQA` / `automatedQA` | `POST /api/analyze-qa` | P1 |
| `generateProduct` | `POST /api/generate-product` | P1 |
| `deployApp` | `POST /api/deploy` | P1 |
| `intelligentMonitor` | `POST /api/monitor` | P1 |
| `usageStats` | `GET /api/cost-summary` | P2 |
| `systemHealth` | `GET /api/health` | P2 |
| `selfHealingEngine` | `POST /api/fix` | P2 |
| — (new) | `POST /api/leads` | P0 (GTM) |
| — (new) | `GET /api/admin/seed-demo` | P1 (GTM) |

**Migration rule:** Base44 frontend continues calling Base44 functions via SDK during Phase 1–3. In Phase 4, frontend is updated to call `/api/*` routes. The Base44 SDK call and the Vercel fetch call are swapped one function at a time with no UI changes.

---

## 6. Observability

All four demo tiers and the main product share:
- Axiom dataset: `flowai-prod` (all environments, scoped by `env` field)
- Vercel Analytics (page views, Web Vitals per domain)
- Demo-specific: `demo_run_log` table tracks runs per email for cap enforcement and funnel analytics

---

## 7. Commit Convention

All architecture documentation changes use this commit message format:

```
Architecture: {one-line summary}
```

Example: `Architecture: integrate four-tier GTM demo and Base44-permanent UI standard into migration plan`

All UI sprint commits:
```
Sprint {name}: {one-line summary}
```

All backend migrations:
```
API: migrate {functionName} to /api/{route}
``