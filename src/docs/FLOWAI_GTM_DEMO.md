# FlowAI GTM Demo Architecture

**Last updated:** 2026-05-05  
**Author:** FlowAI Build System  
**Status:** Tier 1–4 UI complete, backend endpoints pending Claude Code migration

---

## Overview

FlowAI's commercial form is **VEUaaS** — multi-tenant AI portfolio governance for any organization running multiple AI products.

Target buyers:
- AI product portfolio leaders
- CTOs at AI-native companies
- Heads of AI governance
- Ops leaders at agencies running multiple AI products for clients

The demo stack has **four tiers** calibrated to buyer journey stage.

---

## Tier 1 — Top of Funnel: Marketing Site
**Route:** `/veaas`  
**File:** `pages/VEUaaSMarketing.jsx`  
**Target:** Cold traffic, first impression  
**Backend needed:** None (fully static/mocked)  
**Mock data:** `data/demo/products.json`, `data/demo/costs.json`

### What it shows:
- Hero: "Govern your AI portfolio. From one to one thousand products."
- Three interactive embedded moments (no signup required):
  1. Live clearance check simulation (6-step animated visualization)
  2. Cost across products (interactive chart with sample data)
  3. Orchestrator plan output (pick mode → pick product → see plan)
- Three-column value props: Studios / Agencies / Enterprise AI teams
- Social proof placeholder (logo grid + testimonial cards)
- Pricing tease (no numbers, scales message)
- Footer: "Book a Demo" + "Try the Sandbox" CTAs

---

## Tier 2 — Mid Funnel: Video Demo + Self-Serve Sandbox
**Route:** `/demo`  
**File:** `pages/DemoSandbox.jsx`  
**Target:** Warm leads, self-qualified  
**Backend needed:** Optional — Resend for "Save my session" email  
**Mock data:** `data/demo/*.json` (all three files)

### What it shows:
- Video demo placeholder (16:9 frame, 4-minute walkthrough)
- Self-serve sandbox: fully mocked FlowAI loaded with demo data
  - 5 products, 10+ runs, 30-day cost data, clearance history
  - All interactions work, no real backend calls
- "Save my session" → email capture → Resend follow-up (POST /api/leads)
- Persistent sandbox banner

---

## Tier 3 — Live Demo: Public Sandbox with Real Backend
**Route:** `/live-demo`  
**File:** `pages/LiveDemo.jsx`  
**Target:** High-intent evaluators  
**Backend needed:**
  - `GET /api/admin/seed-demo` — seeds demo org daily (Code to build)
  - Demo org_id: `"demo-org-public"`
  - Run cap: 1 run per email per day (enforced by backend)

### What it shows:
- Real product, real backend, sandboxed to demo org
- Visitor can register their own URL for a clone-and-improve run
- Results visible to all visitors (transparent showcase)
- Daily seeded demo data from /api/admin/seed-demo
- Prominent "public data" warning banner

---

## Tier 4 — Bottom of Funnel: Sales-Led Guided Demo
**Route:** `/enterprise-demo`  
**File:** `pages/EnterpriseDemo.jsx`  
**Target:** Bottom-of-funnel, sales-qualified  
**Backend needed:**
  - `POST /api/leads` — lead capture + Resend notification
  - Lead fields: name, email, company, ai_product_count, use_case

### What it shows:
1. Lead capture form (gated entry)
2. 7-step product tour with overlay annotations:
   - Step 1: Portfolio Dashboard
   - Step 2: Product Registry
   - Step 3: Workspace Run
   - Step 4: Clearance Check
   - Step 5: Cost Analysis
   - Step 6: Governance Audit
   - Step 7: Orchestrator
3. Calendly placeholder at end ("Book a 30-minute white-glove demo")
4. Walkthrough state persisted in localStorage by email

---

## Mock Data Files

| File | Contents |
|------|----------|
| `src/data/demo/products.json` | 5 mock products with scores, clearance status, tags |
| `src/data/demo/runs.json` | 10 mock pipeline runs with verdicts and timing |
| `src/data/demo/costs.json` | 30-day cost data by product and daily breakdown |

---

## Backend Endpoints Needed (Claude Code)

| Endpoint | Method | Used By | Description |
|----------|--------|---------|-------------|
| `/api/leads` | POST | Tier 2, Tier 4 | Capture lead email, trigger Resend |
| `/api/admin/seed-demo` | GET | Tier 3 | Seed daily demo data for demo org |
| `/api/products` | GET/POST | Tier 3 | Product CRUD for demo org |

---

## Component Conventions

- All demo pages are **outside** `AppLayout` — they render their own nav/footer
- Demo banner component: `components/demo/SandboxBanner.jsx`
- All mock data imported as JSON — never fetched from API in Tier 1/2
- Tiers 3 and 4 attempt real API calls, fall back to mock on failure
- `org_id: "demo-org-public"` on all Tier 3 API calls
- Footer on every tier: "Built by VEU AI Studio · © 2026"

---

## Architecture Integration — Permanent Standards

> **Updated 2026-05-05** — This document is now a section of the broader FlowAI architecture.
> The canonical architecture references are:
> - `docs/FLOWAI_ARCHITECTURE.md` — system-wide architecture, Base44-permanent standard, demo tier design system inheritance
> - `docs/FLOWAI_MIGRATION_PLAN.md` — hosting decisions, domain routing, seed data strategy, lead flow
> - `docs/FLOWAI_API_CONTRACT.md` — full spec for all endpoints including GTM-specific routes

### Base44 Standard (applies to all four tiers)

Base44 is the **permanent UI builder** for all four demo tiers. All page iterations, component changes, and design updates are made in Base44 and flow to Vercel via the GitHub auto-mirror. This is not a temporary arrangement — it is the permanent workflow.

### Hosting — Single Vercel Project

All four tiers live in the **same Vercel project** as the main FlowAI product. Each tier is a route within the React app, aliased to a separate domain via Vercel domain configuration. There is no separate marketing Vercel project.

| Tier | Base44 Route | Vercel Domain Alias |
|------|-------------|---------------------|
| 1 | `/veaas` | `veaas.com` |
| 2 | `/demo` | `demo.veaas.com` |
| 3 | `/live-demo` | `live.veaas.com` |
| 4 | `/enterprise-demo` | `enterprise.veaas.com` |

### Seed Data Isolation

- Tiers 1 & 2: Static JSON imports — no backend, no isolation needed
- Tier 3: `org_id: "demo-org-public"` — daily seeded via `GET /api/admin/seed-demo` (cron 06:00 UTC)
- Tier 4: `org_id: "demo-org-enterprise-{email_hash}"` — seeded per lead submission

Demo org data can never bleed into production — enforced by Supabase RLS at the database level.

### Lead Flow

```
Tier 4 form submit  →  POST /api/leads  →  Supabase leads table
                                        →  Resend (notify demo@veuaistudio.com)
                                        →  (Phase 6) CRM webhook
``