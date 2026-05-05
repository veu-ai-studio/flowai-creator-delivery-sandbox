# FlowAI — Deployment Status

**Last updated:** 2026-05-05  
**Environment:** Base44 managed (pre-Vercel migration)

---

## Current Deployment Architecture

FlowAI is currently running entirely within the Base44 platform. There is no active Vercel deployment yet — migration is planned for Phase 2 (see `FLOWAI_MIGRATION_PLAN.md`).

| Layer | Provider | Status |
|-------|----------|--------|
| UI hosting | Base44 | ✅ Live |
| Backend functions | Base44 (Deno Deploy) | ✅ Live |
| Database | Base44 entities | ✅ Live |
| Vercel project | Not yet created | ⏳ Phase 2 |
| GitHub mirror | Not yet activated | ⏳ Phase 2 |
| Custom domains | Not yet configured | ⏳ Phase 5 |

---

## Active Routes (Base44)

All routes render correctly as of 2026-05-05:

| Route | Page | Status |
|-------|------|--------|
| `/` | LandingPage (workspace entry) | ✅ |
| `/dashboard` | MainDashboard | ✅ |
| `/configuration` | Configuration | ✅ |
| `/portfolio` | PortfolioDashboard | ✅ |
| `/products` | ProductRegistry | ✅ |
| `/runs` | RunsHistory | ✅ |
| `/auto-runner` | AutoRunner | ✅ |
| `/guided/:step` | GuidedStep | ✅ |
| `/manual/:step` | ManualStep | ✅ |
| `/clearance` | Clearance | ✅ |
| `/governance` | Governance | ✅ |
| `/cost-usage` | CostUsage | ✅ |
| `/settings` | OrgSettings | ✅ |
| `/veuaas` | VEUaaSMarketing (Tier 1) | ✅ (route fixed 2026-05-05: was `/veaas`) |
| `/demo` | DemoSandbox (Tier 2) | ✅ |
| `/live-demo` | LiveDemo (Tier 3) | ✅ |
| `/enterprise-demo` | EnterpriseDemo (Tier 4) | ✅ |

---

## Backend Function Status

All Base44 backend functions deployed and callable:

| Function | Status | Notes |
|----------|--------|-------|
| `orchestrate` | ✅ Deployed | Core orchestration |
| `autonomousEngine` | ✅ Deployed | Full 8-step auto pipeline |
| `crawlPage` / `claudeCrawl` | ✅ Deployed | Playwright + Claude crawl |
| `analyzeQA` / `automatedQA` | ✅ Deployed | QA scoring |
| `generateProduct` | ✅ Deployed | Product generation |
| `systemHealth` | ✅ Deployed | Polled by FlowAIHealthBadge |
| `usageStats` | ✅ Deployed | Cost tracking |
| `selfHealingEngine` | ✅ Deployed | Fix and redeploy |
| All others | ✅ Deployed | See full list in developer_comments |

---

## API Endpoints — External (Vercel /api)

These endpoints are called by the UI but served by an external API server (not Base44):

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/leads` | ⚠️ Not yet live | Tier 2 + Tier 4 lead capture — UI calls fire + catch silently |
| `GET /api/admin/seed-demo` | ⚠️ Not yet live | Tier 3 seeding — UI shows static demo data as fallback |
| `POST /api/configuration/clone` | ⚠️ Not yet live | Tier 3 run submission — UI catches error and shows submitted state |
| `GET /api/products` | ⚠️ Not yet live | Portfolio + registry — UI falls back to VEU seed data |
| `GET /api/health` | ⚠️ Returns 404 | FlowAIHealthBadge shows "error" state — not blocking |

**Current fallback behavior:** All external API calls are wrapped in try/catch. Failures surface gracefully to the user. Demo tiers continue to work with static mock data (`src/data/demo/*.json`) when the live API is unavailable.

---

## Known Issues — 2026-05-05

| Issue | Severity | Status |
|-------|----------|--------|
| `/api/health` returns 404 — FlowAIHealthBadge shows "Service Error" | Low | Expected — pre-migration. No action needed. |
| `/api/leads` not live — lead form submissions do not persist | Medium | Expected — Phase 4 backend sprint pending |
| `/api/configuration/clone` not live — Tier 3 run submissions are no-ops | Medium | Expected — Phase 4 backend sprint pending |
| `/veaas` route — corrected to `/veuaas` 2026-05-05 | Fixed | ✅ Resolved |

---

## Vercel Deployment — Pre-Flight Checklist

When the GitHub mirror is activated and Vercel project is created, verify:

- [ ] All 4 demo tier routes resolve: `/veuaas`, `/demo`, `/live-demo`, `/enterprise-demo`
- [ ] `AppLayout` routes all resolve behind auth
- [ ] `GET /api/health` returns `{ status: "ok" }`
- [ ] `POST /api/leads` returns `{ ok: true }`
- [ ] `POST /api/configuration/clone` returns `{ session_id, status: "queued" }`
- [ ] `GET /api/admin/seed-demo` returns seeded data count (admin token required)
- [ ] FlowAIHealthBadge shows "All Systems Operational"
- [ ] DemoFooter links point to correct `/veuaas` route
- [ ] No console errors on any of the 4 demo tier pages
- [ ] No console errors on dashboard, configuration, auto-runner, clearance

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-05-05 | Fixed Tier 1 route `/veaas` → `/veuaas` in App.jsx, DemoSandbox, EnterpriseDemo, DemoFooter, all docs | FlowAI Build System |
| 2026-05-05 | Created FLOWAI_ARCHITECTURE.md, FLOWAI_MIGRATION_PLAN.md, FLOWAI_API_CONTRACT.md | FlowAI Build System |
| 2026-05-05 | GTM demo stack (Tiers 1–4) UI complete — all 4 routes live in Base44 | FlowAI Build System |