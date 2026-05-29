# FlowAI — Architecture Document

**Last updated:** 2026-05-05
**Status:** Living document — updated with every sprint

---

## 0. Permanent Standards

UI authoring tooling and CI/CD pipeline details are documented in internal
team docs.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          UI Layer                                │
│  Pages · Components · Design Tokens · Entities · Dev Workflow   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Auto-mirror (bidirectional)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub repository                         │
│  src/pages · src/components · src/data · src/docs · /api        │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Git integration
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel project                           │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ├── /api/*  (Vercel Serverless Functions — Node.js / Deno)
       │
       └──── Supabase (Postgres + RLS)
                 ├── prod schema
                 ├── demo-public schema
                 └── demo-enterprise schema
```

---

## 2. Frontend Architecture

### 2.1 Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React 18 + Vite | |
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
```

### 2.3 Design System

Design tokens are defined once and cascade everywhere.

```
index.css        → CSS custom properties (--primary, --background, etc.)
tailwind.config.js → Maps CSS vars to Tailwind classes
components/ui/*  → shadcn/ui components (consume Tailwind classes)
pages/*, components/* → Use Tailwind classes only (no inline styles)
```

**Dark mode:** FlowAI uses a permanent dark theme. CSS variables are defined identically in `:root` and `.dark`. No theme toggle is exposed to users.

### 2.4 Component Conventions

- One component per file — no exceptions
- Components in `components/` are reused across pages
- Mock data lives in `src/data/demo/*.json` — imported directly (no fetch) where used
- No component imports data from `/api` directly — all API calls go through page-level hooks or utility functions

---

## 3. Backend Architecture

### 3.1 Current State

Backend logic runs as serverless functions:
- All functions in `/api/` directory (Node.js)
- Called from frontend via `fetch('/api/route', { method: 'POST', body: ... })`
- Secrets managed via the platform's environment variable system

### 3.2 Migration Strategy

Frontend and backend migrate **independently and incrementally**:

1. New function is written and deployed
2. Frontend is updated to call `/api/route`
3. Legacy function is kept as fallback for 1 sprint, then removed
4. Repeat per function

No big-bang migration. No service disruption. One function at a time.

### 3.3 Database (Supabase)

```
Tables (core):
  products          org_id, name, slug, live_url, status, last_score
  runs              org_id, product_id, type, status, verdict, steps, score
  sessions          org_id, product_id, mode, step_results, overall_status
  clearance_records org_id, product_name, step1-6_status, overall_status
  leads             email, company, use_case, source, tour_step_completed

Tables (demo):
  demo_run_log      email, url, org_id, queued_at, result_session_id

RLS Rules (critical):
  - All tables: WHERE org_id = auth.jwt()->'org_id'
  - demo-org-public: readable by unauthenticated requests (read-only)
  - demo-org-enterprise-*: readable only by matching lead email
  - prod-*: never readable by demo org_id — enforced at RLS level
```

---

## 4. Observability & Monitoring

| Signal | Tool | Scope |
|--------|------|-------|
| Structured logs | Axiom (`flowai-prod` dataset) | All surfaces |
| Page analytics | Vercel Analytics | Per domain |
| API latency | Vercel Function logs | All `/api/*` |
| Lead tracking | `leads` + `demo_run_log` tables | |
| Health check | `GET /api/health` | All — polled by FlowAIHealthBadge every 30s |
| Error tracking | ErrorBoundary → ErrorLog entity | Authenticated surfaces |

---

## 5. Security

- **Content protection:** `lib/contentProtection.js` — right-click protection, devtools detection (authenticated surfaces only)
- **IP footer:** `components/shared/IPFooter.jsx` — legal notice on all authenticated pages
- **Org isolation:** RLS-enforced org_id scoping — data cannot bleed between schemas
- **Run cap:** `demo_run_log` table prevents abuse on public demo paths
- **Lead data:** Never exposed in client-side code — stored server-side only
