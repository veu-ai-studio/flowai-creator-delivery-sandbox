# FlowAI — Architecture Document

**Product:** FlowAI / VEUaaS  
**Organization:** VEU AI Studio  
**Last updated:** 2026-05-05  
**Status:** Living document — updated with every sprint  

---

## 0. Permanent Standards

### Base44 is the permanent UI builder

> Base44 is the UI layer for FlowAI, both before AND after migration to Vercel.
> This is a permanent architectural decision, not a temporary arrangement.
>
> **What "migration to Vercel" means:** The backend compute, database, and API hosting moves from Base44's managed infrastructure to Vercel serverless functions + Supabase. The UI authoring and component development workflow stays in Base44.
>
> **What "migration to Vercel" does NOT mean:** Switching away from Base44 as the UI builder. Base44 remains the environment where all pages, components, design tokens, and layout changes are created and iterated.

### Four demo tiers are first-class product routes

The GTM demo tiers (Tier 1–4) are integral parts of the FlowAI product, not separate projects or bolt-ons. They:
- Share the product's design system (Tailwind tokens, `index.css`, `tailwind.config.js`)
- Share the component library (shadcn/ui, custom components)
- Share the backend `/api` namespace
- Share the Vercel project and deployment pipeline
- Share the GitHub repository
- Are built and iterated in Base44 like every other page

### Base44 ↔ GitHub auto-mirror is the permanent sync mechanism

Every UI change — whether to the main product, to any demo tier, or to any future feature — flows through this permanent pipeline:

```
Base44  →  GitHub (auto-mirror)  →  Vercel (auto-deploy)  →  Live domains
```

This is not a one-time migration step. It is the ongoing CI/CD pipeline for the entire product.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BASE44 (UI Layer)                        │
│  Pages · Components · Design Tokens · Entities · Dev Workflow   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Auto-mirror (bidirectional)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              GitHub: veu-ai-studio/flowai                        │
│  src/pages · src/components · src/data · src/docs · /api        │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Git integration
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Vercel Project: flowai-prod                  │
│                                                                  │
│  Domain Aliases:                                                 │
│  flowai.veuaistudio.com  →  Main product (AppLayout)            │
│  veaas.com               →  Tier 1: VEUaaSMarketing             │
│  demo.veaas.com          →  Tier 2: DemoSandbox                 │
│  live.veaas.com          →  Tier 3: LiveDemo                    │
│  enterprise.veaas.com    →  Tier 4: EnterpriseDemo              │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ├── /api/*  (Vercel Serverless Functions — Node.js / Deno)
       │
       └──── Supabase (Postgres + RLS)
                 ├── prod schema (org_id: "prod-*")
                 ├── demo-public schema (org_id: "demo-org-public")
                 └── demo-enterprise schema (org_id: "demo-org-enterprise-*")
```

---

## 2. Frontend Architecture

### 2.1 Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| UI Builder | Base44 | Permanent — all iterations happen here |
| Framework | React 18 + Vite | Standard Base44 stack |
| Styling | Tailwind CSS + shadcn/ui | Design tokens in `index.css` |
| Routing | React Router v6 | All routes defined in `App.jsx` |
| State | React Query (server), useState/useContext (local) | |
| Animations | Framer Motion | Consistent across all pages |
| Icons | Lucide React | Only imported icons that exist in library |

### 2.2 Route Architecture

Routes fall into two categories:

**Authenticated routes (inside `AppLayout`):**
```
/dashboard           MainDashboard
/configuration       Configuration
/portfolio           PortfolioDashboard
/products            ProductRegistry
/runs                RunsHistory
/auto-runner         AutoRunner
/guided/:step        GuidedStep
/manual/:step        ManualStep
/clearance           Clearance
/governance          Governance
/cost-usage          CostUsage
/settings            OrgSettings
... (all other product pages)
```

**Public routes (outside `AppLayout` — own nav/footer):**
```
/                    LandingPage (main workspace entry)
/landing             MarketingPage
/veaas               VEUaaSMarketing       ← Tier 1
/demo                DemoSandbox           ← Tier 2
/live-demo           LiveDemo              ← Tier 3
/enterprise-demo     EnterpriseDemo        ← Tier 4
```

### 2.3 Design System

Design tokens are defined once and cascade everywhere — including all four demo tiers.

```
index.css        → CSS custom properties (--primary, --background, etc.)
tailwind.config.js → Maps CSS vars to Tailwind classes
components/ui/*  → shadcn/ui components (consume Tailwind classes)
pages/*, components/* → Use Tailwind classes only (no inline styles)
```

**Dark mode:** FlowAI uses a permanent dark theme. CSS variables are defined identically in `:root` and `.dark`. No theme toggle is exposed to users.

### 2.4 Component Conventions

- One component per file — no exceptions
- Components in `components/` are reused across pages and demo tiers
- Demo-specific components live in `components/demo/`
- Mock data lives in `src/data/demo/*.json` — imported directly (no fetch) in Tiers 1–2
- No component imports data from `/api` directly — all API calls go through page-level hooks or utility functions

---

## 3. Backend Architecture

### 3.1 Current State (Base44 Phase)

During the Base44 build phase, backend logic runs as Deno Deploy functions managed by Base44:
- All functions in `functions/` directory
- Called from frontend via `base44.functions.invoke('functionName', payload)`
- Secrets managed in Base44 dashboard

### 3.2 Target State (Vercel Phase)

After migration, backend runs as Vercel serverless functions:
- All functions in `/api/` directory (Node.js)
- Called from frontend via `fetch('/api/route', { method: 'POST', body: ... })`
- Secrets managed in Vercel environment variables
- Same secrets as Base44 phase — same names, same values

### 3.3 Migration Strategy

The frontend and backend migrate **independently and incrementally**:

1. Vercel function is written and deployed
2. Frontend is updated to call `/api/route` instead of `base44.functions.invoke`
3. Base44 function is kept as fallback for 1 sprint, then removed
4. Repeat per function

No big-bang migration. No service disruption. One function at a time.

### 3.4 Database (Supabase)

```
Tables (core):
  products          org_id, name, slug, live_url, status, last_score
  runs              org_id, product_id, type, status, verdict, steps, score
  sessions          org_id, product_id, mode, step_results, overall_status
  clearance_records org_id, product_name, step1-6_status, overall_status
  leads             email, company, use_case, tier, source, tour_step_completed
  
Tables (demo):
  demo_run_log      email, url, org_id, queued_at, result_session_id

RLS Rules (critical):
  - All tables: WHERE org_id = auth.jwt()->'org_id'
  - demo-org-public: readable by unauthenticated requests (read-only)
  - demo-org-enterprise-*: readable only by matching lead email
  - prod-*: never readable by demo org_id — enforced at RLS level
```

---

## 4. Four-Tier GTM Demo Architecture

### 4.1 Overview

| Tier | Route | Domain | Buyer Stage | Backend | Auth |
|------|-------|--------|-------------|---------|------|
| 1 | `/veaas` | `veaas.com` | Cold traffic | None | None |
| 2 | `/demo` | `demo.veaas.com` | Warm/self-qualified | Optional | None |
| 3 | `/live-demo` | `live.veaas.com` | High-intent | Real (demo org) | Email only |
| 4 | `/enterprise-demo` | `enterprise.veaas.com` | Sales-qualified | Real (lead scoped) | Lead form |

### 4.2 Data Flow per Tier

```
Tier 1 (veaas.com)
  → Imports src/data/demo/*.json at build time
  → Zero backend calls
  → Interactive demos: ClearanceSimulator (animated), CostChart (recharts), OrchestratorDemo (LLM mock)

Tier 2 (demo.veaas.com)
  → Imports src/data/demo/*.json at build time
  → One optional backend call: POST /api/leads (email capture)
  → All tab interactions (portfolio/runs/clearance/cost) use static mock data

Tier 3 (live.veaas.com)
  → POST /api/configuration/clone (real crawl, demo org)
  → GET /api/products (demo org showcase)
  → Run cap: 1 per email per day (demo_run_log table)
  → Data seeded daily: GET /api/admin/seed-demo (06:00 UTC cron)

Tier 4 (enterprise.veaas.com)
  → POST /api/leads (lead capture + Resend notification)
  → Tour state: localStorage by email
  → (Phase 6) GET /api/admin/seed-demo/enterprise on lead submit
  → (Phase 6) CRM webhook on lead submit
```

### 4.3 Shared Components Between Demo Tiers

```
components/demo/
  SandboxBanner.jsx       ← Warning banner (Tier 2, 3, 4)
  DemoFooter.jsx          ← Shared footer with cross-tier links
  ClearanceSimulator.jsx  ← 6-step animated clearance check (Tier 1, 2, 3)
  CostChart.jsx           ← Recharts cost visualization (Tier 1, 2)
  OrchestratorDemo.jsx    ← Mode + product picker → plan output (Tier 1, 2)
```

### 4.4 Design System Inheritance

All four demo tiers inherit the same design tokens as the main product:
- Same `bg-background`, `text-foreground`, `border-border` classes
- Same `bg-primary`, `text-primary` for accent colors
- Same `rounded-xl border border-border bg-card` card pattern
- Same font: `font-inter`
- Same dark mode (permanent, no toggle)

This is enforced by the fact that all tiers live in the same Vite project, import the same `index.css`, and use the same `tailwind.config.js`.

---

## 5. Observability & Monitoring

| Signal | Tool | Scope |
|--------|------|-------|
| Structured logs | Axiom (`flowai-prod` dataset) | All tiers + main product |
| Page analytics | Vercel Analytics | Per domain |
| API latency | Vercel Function logs | All `/api/*` |
| Demo funnel | `leads` + `demo_run_log` tables | Tiers 2, 3, 4 |
| Health check | `GET /api/health` | All — polled by FlowAIHealthBadge every 30s |
| Error tracking | ErrorBoundary → ErrorLog entity | Main product (authenticated) |

---

## 6. Security

- **Content protection:** `lib/contentProtection.js` — right-click protection, devtools detection (main product only, not demo tiers)
- **IP footer:** `components/shared/IPFooter.jsx` — legal notice on all authenticated pages
- **Demo isolation:** RLS-enforced org_id scoping — demo data can never bleed into prod schema
- **Run cap:** `demo_run_log` table prevents abuse on Tier 3
- **Lead data:** Never exposed in client-side code — stored server-side only

---

## 7. Sprint Queue & Build Sequence

### Completed
- [x] Core product pages (Dashboard, Configuration, AutoRunner, GuidedStep, ManualStep)
- [x] Portfolio system (PortfolioDashboard, ProductRegistry, RunsHistory)
- [x] Clearance protocol (Clearance, ClearanceWizard, ClearanceProgressTimeline)
- [x] Governance center
- [x] Cost & usage tracking
- [x] Org settings
- [x] GTM demo stack — Tier 1–4 UI (all four pages + shared components + mock data)
- [x] Architecture documentation (this document + MIGRATION_PLAN + API_CONTRACT + GTM_DEMO)

### Next (Backend Migration — Claude Code)
- [ ] `POST /api/leads` — Resend integration, Supabase insert
- [ ] `GET /api/admin/seed-demo` — daily seeder with synthetic run generation
- [ ] `POST /api/configuration/clone` — real crawl + run cap enforcement
- [ ] `GET /api/health` — migrated from `systemHealth`
- [ ] `GET /api/cost-summary` — migrated from `usageStats`
- [ ] `GET /api/products` / `POST /api/products` — product CRUD

### Future
- [ ] Base44 ↔ GitHub auto-mirror activation
- [ ] Vercel project creation + domain aliases
- [ ] Auth (Clerk multi-tenant)
- [ ] CRM webhook from lead form
- [ ] Calendly integration in Tier 4
- [ ] White-label variant (custom domain + logo per org)