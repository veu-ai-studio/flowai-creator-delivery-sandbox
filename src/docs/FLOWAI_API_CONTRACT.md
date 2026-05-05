# FlowAI — API Contract

**Product:** FlowAI / VEUaaS  
**Organization:** VEU AI Studio  
**Last updated:** 2026-05-05  
**Status:** Authoritative spec — all Vercel `/api` endpoints documented here  

---

## 0. Conventions

- All endpoints are under the same `/api` namespace regardless of demo vs production traffic
- Demo vs production is distinguished by `org_id` in the request body, not by route or subdomain
- All authenticated endpoints require a valid session token in `Authorization: Bearer {token}`
- Demo endpoints (`org_id: "demo-org-public"` or `"demo-org-enterprise"`) are unauthenticated or lightly gated (email only)
- All responses are `application/json`
- Errors always return `{ error: string, code?: string }`

---

## 1. Core Operation Endpoints

### `POST /api/orchestrate`
**Auth:** Required  
**Used by:** Main product (AutoRunner, GuidedStep, ManualStep)  
**Base44 equivalent:** `orchestrate`

**Request:**
```json
{
  "session_id": "string",
  "org_id": "string",
  "step": "research | design | build | qa_audit | deploy | govern | gtm | monitor",
  "mode": "auto | guided | manual",
  "input": {
    "type": "url | description | paste",
    "value": "string",
    "file_urls": ["string"]
  },
  "objective": "string",
  "settings": {
    "depth": "quick | standard | deep",
    "threshold": 80,
    "max_reruns": 2,
    "format": "summary | full | executive_brief",
    "benchmark": false
  }
}
```

**Response:**
```json
{
  "step": "string",
  "summary": "string",
  "score": 0,
  "findings": ["string"],
  "recommendations": ["string"],
  "confidence": 0,
  "crawler_quality": "none | basic | full",
  "raw_output": "string"
}
```

---

### `POST /api/run`
**Auth:** Required  
**Used by:** AutoRunner (full 8-step pipeline)  
**Base44 equivalent:** `autonomousEngine`

**Request:**
```json
{
  "session_id": "string",
  "org_id": "string",
  "product_id": "string | null",
  "mode": "auto",
  "input": { "type": "string", "value": "string" },
  "objective": "string",
  "settings": { "depth": "string", "threshold": 80, "max_reruns": 2, "format": "string", "benchmark": false }
}
```

**Response:** Stream of step results (SSE or polling via `GET /api/run/{session_id}/status`)

---

### `POST /api/research-url`
**Auth:** Required (demo: unauthenticated)  
**Used by:** LandingPage (Test Fetch), Tier 3, all step pages  
**Base44 equivalent:** `crawlPage`, `claudeCrawl`

**Request:**
```json
{
  "url": "string",
  "depth": "shallow | standard | deep",
  "capture_screenshots": false,
  "org_id": "string | null"
}
```

**Response:**
```json
{
  "title": "string",
  "meta_description": "string",
  "headings": ["string"],
  "body_text": "string",
  "links": ["string"],
  "page_count": 0,
  "crawler_quality": "none | basic | full"
}
```

---

### `POST /api/analyze-qa`
**Auth:** Required  
**Base44 equivalent:** `analyzeQA`, `automatedQA`

**Request:**
```json
{
  "url": "string",
  "org_id": "string",
  "crawl_data": {},
  "objective": "string"
}
```

**Response:**
```json
{
  "scores": { "overall": 0, "ui_ux": 0, "api": 0, "logic": 0, "business_value": 0 },
  "issues": {},
  "recommendations": []
}
```

---

### `GET /api/health`
**Auth:** None  
**Used by:** FlowAIHealthBadge (all tiers), uptime monitors  
**Base44 equivalent:** `systemHealth`

**Response:**
```json
{
  "status": "ok | degraded | error",
  "latency_ms": 0,
  "services": {
    "database": "ok | error",
    "llm": "ok | error",
    "crawler": "ok | error"
  },
  "version": "string",
  "timestamp": "ISO8601"
}
```

---

### `GET /api/cost-summary`
**Auth:** Required  
**Used by:** CostUsage page  
**Base44 equivalent:** `usageStats`

**Query params:** `org_id`, `from` (ISO date), `to` (ISO date)

**Response:**
```json
{
  "this_month_cost": 0.00,
  "avg_cost_per_session": 0.00,
  "active_sessions": 0,
  "sessions": [
    {
      "session_id": "string",
      "date": "ISO8601",
      "product": "string",
      "provider": "string",
      "steps_run": 0,
      "tokens_used": 0,
      "cost": 0.00
    }
  ]
}
```

---

## 2. Product & Portfolio Endpoints

### `GET /api/products`
**Auth:** Required (demo: unauthenticated, scoped to demo org)  
**Used by:** PortfolioDashboard, ProductRegistry, Tier 3 showcase

**Query params:** `org_id`

**Response:** `{ products: Product[] }`

---

### `POST /api/products`
**Auth:** Required  
**Used by:** ProductRegistry AddProductModal, Tier 3 (run registration)

**Request:**
```json
{
  "name": "string",
  "slug": "string",
  "live_url": "string",
  "description": "string",
  "org": "string",
  "org_id": "string",
  "status": "active | beta | archived"
}
```

**Response:** Created product object

---

### `PATCH /api/products/{slug}`
**Auth:** Required  
**Used by:** ProductRegistry archive action

**Request:** `{ "status": "archived" }`  
**Response:** Updated product object

---

## 3. Configuration Endpoints

### `POST /api/configuration/clone`
**Auth:** Optional (required for prod; email-only for demo)  
**Used by:** Tier 3 (LiveDemo URL registration), LandingPage (Clone & Improve mode)  
**Base44 equivalent:** Triggers `orchestrate` with `mode: "clone"`

**Request:**
```json
{
  "mode": "clone | describe | synthesize",
  "org_id": "string",
  "product_id": "string | null",
  "objective": "string",
  "settings": {
    "depth": "standard",
    "threshold": 80,
    "max_reruns": 1,
    "format": "summary",
    "benchmark": false
  },
  "payload": {
    "url": "string",
    "options": {
      "capture_screenshots": false,
      "depth": "shallow"
    }
  },
  "requester_email": "string"
}
```

**Response:**
```json
{
  "session_id": "string",
  "status": "queued",
  "estimated_duration_min": 10,
  "public": true
}
```

**Demo run cap (when `org_id = "demo-org-public"`):**
- Max 1 run per `requester_email` per calendar day
- Returns `429 Too Many Requests` with `{ error: "Daily run limit reached", reset_at: "ISO8601" }` if exceeded
- Logged to `demo_run_log` table: `{ email, url, queued_at, org_id }`

---

## 4. GTM Demo Endpoints

### `POST /api/leads`
**Auth:** None  
**Used by:** Tier 2 (DemoSandbox "Save my session"), Tier 4 (EnterpriseDemo lead form)

**Request:**
```json
{
  "name": "string",
  "email": "string",
  "company": "string",
  "ai_product_count": "string",
  "use_case": "string",
  "source": "sandbox | enterprise_demo",
  "tier": 2,
  "tour_step_completed": 0
}
```

**Response:** `{ "ok": true, "lead_id": "string" }`

**Side effects:**
1. Insert to `leads` table (Supabase)
2. `Resend`: notify `demo@veuaistudio.com` — subject: `"New FlowAI lead: {company} — {name} (Tier {tier})"`
3. (Phase 6) Webhook to CRM

**Duplicate handling:** If email already exists, update `last_seen_at` and `tier` if higher. Do not create duplicate.

---

### `GET /api/admin/seed-demo`
**Auth:** Admin token required (Bearer header)  
**Used by:** Daily Vercel cron job, manual admin trigger  
**Purpose:** Refreshes demo org data so `/live-demo` always has current, realistic-looking data

**What it does:**
1. Deletes all records in Supabase where `org_id = "demo-org-public"` (products, runs, sessions, cost records)
2. Re-inserts from `src/data/demo/*.json` as the baseline
3. Generates 3 new synthetic "today's runs" via a lightweight LLM call
4. Returns summary of what was seeded

**Response:**
```json
{
  "seeded_at": "ISO8601",
  "products_count": 5,
  "runs_count": 10,
  "new_runs_generated": 3,
  "org_id": "demo-org-public"
}
```

**Cron schedule:** Daily at 06:00 UTC (`0 6 * * *` in `vercel.json`)

---

### `GET /api/admin/seed-demo/enterprise`
**Auth:** Admin token required  
**Used by:** On each new Tier 4 lead submission (triggered by `POST /api/leads`)  
**Purpose:** Creates an isolated enterprise demo environment scoped to the lead's email

**What it does:**
1. Upserts `org_id = "demo-org-enterprise-{lead_email_hash}"` data
2. Seeds with full 5-product portfolio + 10 runs
3. Returns `demo_org_id` for the session

---

## 5. Deployment & Infrastructure Endpoints

### `POST /api/deploy`
**Auth:** Required (admin only)  
**Base44 equivalent:** `deployApp`

### `POST /api/fix`
**Auth:** Required  
**Base44 equivalent:** `selfHealingEngine`

### `GET /api/run/{session_id}/status`
**Auth:** Required  
**Used by:** AutoRunner polling loop

**Response:**
```json
{
  "session_id": "string",
  "status": "queued | running | completed | failed",
  "current_step": "string",
  "progress": 0,
  "step_results": {},
  "verdict": "CLEARED | CONDITIONAL | NOT CLEARED | null"
}
```

---

## 6. Data Models (abbreviated)

### `Lead`
```typescript
{
  id: string
  name: string
  email: string
  company: string
  ai_product_count: string
  use_case: string
  source: 'sandbox' | 'enterprise_demo'
  tier: 2 | 4
  tour_step_completed: number
  created_at: string
  last_seen_at: string
}
```

### `DemoRunLog`
```typescript
{
  id: string
  email: string
  url: string
  org_id: 'demo-org-public'
  queued_at: string
  result_session_id: string | null
}
```

---

## 7. Endpoint Status Tracker

| Endpoint | Exists in Base44 | Vercel Route | Status |
|----------|-----------------|--------------|--------|
| `POST /api/orchestrate` | `orchestrate` | ⏳ Pending | Migration |
| `POST /api/run` | `autonomousEngine` | ⏳ Pending | Migration |
| `POST /api/research-url` | `crawlPage` / `claudeCrawl` | ⏳ Pending | Migration |
| `POST /api/analyze-qa` | `analyzeQA` | ⏳ Pending | Migration |
| `POST /api/generate-product` | `generateProduct` | ⏳ Pending | Migration |
| `POST /api/deploy` | `deployApp` | ⏳ Pending | Migration |
| `POST /api/fix` | `selfHealingEngine` | ⏳ Pending | Migration |
| `GET /api/health` | `systemHealth` | ⏳ Pending | Migration |
| `GET /api/cost-summary` | `usageStats` | ⏳ Pending | Migration |
| `GET /api/products` | — | ⏳ Pending | New |
| `POST /api/products` | — | ⏳ Pending | New |
| `PATCH /api/products/{slug}` | — | ⏳ Pending | New |
| `POST /api/configuration/clone` | — | ⏳ Pending | New |
| `POST /api/leads` | — | ⏳ Pending | New (GTM) |
| `GET /api/admin/seed-demo` | — | ⏳ Pending | New (GTM) |
| `GET /api/admin/seed-demo/enterprise` | — | ⏳ Pending | New (GTM) |
| `GET /api/run/{id}/status` | `jobStatus` | ⏳ Pending | Migration |