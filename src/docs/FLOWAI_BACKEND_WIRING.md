# FlowAI — Backend Wiring Status

**Last updated:** 2026-05-06  
**Purpose:** Documents which UI components call which backend endpoints, and tracks gaps between UI expectations and live backend availability.

---

## 1. Demo Tier Wiring

### Tier 2 — DemoSandbox (`/demo`)

| UI Action | Endpoint called | Endpoint live? | Fallback behavior |
|-----------|----------------|---------------|-------------------|
| "Save my session" email submit | `POST /api/leads` | ⚠️ Not live | try/catch silently — UI shows "Session saved!" regardless |

**Gap:** `POST /api/leads` is not yet live. Lead submissions from Tier 2 are currently no-ops. Once the backend sprint delivers this endpoint, no UI changes are needed — the fetch call is already wired correctly.

**File:** `pages/DemoSandbox.jsx` → `saveSession()` function

```jsx
// Current wiring (correct, already in place):
await fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: email.trim(), source: 'sandbox', tier: 2 }),
});
```

---

### Tier 3 — LiveDemo (`/live-demo`)

| UI Action | Endpoint called | Endpoint live? | Fallback behavior |
|-----------|----------------|---------------|-------------------|
| "Start Clone & Improve Run" | `POST /api/configuration/clone` | ⚠️ Not live | catch block → `setSubmitted(true)` — shows success even on failure |
| Public Results Showcase | Static `data/demo/products.json` | ✅ Always | No backend call — pure import |

**Gap 1:** `POST /api/configuration/clone` is not live. Run submissions show success regardless of API response (demo context — intentional for demo tier).

**Gap 2:** The current fallback (`catch → setSubmitted(true)`) silently succeeds on error. This is acceptable for a demo environment. For production Tier 3, the catch should distinguish between `429 Too Many Requests` (show cap message) and genuine errors.

**File:** `pages/LiveDemo.jsx` → `submitRun()` function

```jsx
// Current wiring (correct endpoint, intentional silent fallback for demo):
const res = await fetch('/api/configuration/clone', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'clone',
    org_id: 'demo-org-public',
    objective: 'audit_demo',
    settings: { depth: 'standard', threshold: 80, max_reruns: 1, format: 'summary', benchmark: false },
    payload: { url: url.trim(), options: { capture_screenshots: false, depth: 'shallow' } },
    requester_email: email.trim(),
  }),
});
```

**TODO (Phase 4):** Update catch block to handle 429 specifically:
```jsx
// After backend is live, replace catch {} with:
catch (e) {
  if (e.status === 429) setError('Daily run limit reached. Try again tomorrow.');
  else setSubmitted(true); // still show success on other errors in demo context
}
```

---

### Tier 4 — EnterpriseDemo (`/enterprise-demo`)

| UI Action | Endpoint called | Endpoint live? | Fallback behavior |
|-----------|----------------|---------------|-------------------|
| Lead form submit | `POST /api/leads` | ⚠️ Not live | catch {} silently — `setSubmitted(true)` advances to tour |
| Tour state persistence | `localStorage` only | ✅ Always | Client-side, no backend needed |

**Gap:** `POST /api/leads` is not live. Lead data is not persisted. Once the backend sprint delivers this endpoint, no UI changes are needed.

**File:** `pages/EnterpriseDemo.jsx` → `submitLead()` function

```jsx
// Current wiring (correct, already in place):
await fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...form, source: 'enterprise_demo', tier: 4 }),
});
```

---

## 2. Main Product Wiring

### Configuration Page (`/configuration`)

| UI Action | Backend call | Status |
|-----------|-------------|--------|
| Load products | `base44.entities.CreatedProduct.list()` | ✅ Live (Base44 entity) |
| Save new product | `base44.entities.CreatedProduct.create()` | ✅ Live (Base44 entity) |
| Launch auto/guided/manual | `sessionStorage` write only (no API) | ✅ |

**Note:** Configuration page does NOT call any `/api/*` endpoints. It writes session config to `sessionStorage` and navigates to the runner. The runner (`AutoRunner`, `GuidedStep`, `ManualStep`) then calls Base44 backend functions via the SDK.

**Backend mode indicator:** The Configuration page does not currently show a "Backend: Live / Mock" indicator. This is acceptable because the page uses Base44 entities directly (always live) — there is no mock fallback mode. The indicator is only relevant for pages that call `/api/*` endpoints.

---

### AutoRunner / GuidedStep / ManualStep

| Step | Backend call | Status |
|------|-------------|--------|
| Research (URL) | `base44.integrations.Core.InvokeLLM` + fetch proxy | ✅ Live |
| All 8 steps | `base44.integrations.Core.InvokeLLM` | ✅ Live |
| Session persistence | `base44.entities.AutoSession` / `GuidedSession` / `ManualSession` | ✅ Live |

---

## 3. Wiring Gaps Summary

| Gap | Tier/Page | Endpoint | Priority | Action needed |
|-----|-----------|----------|----------|---------------|
| Lead submissions not persisted | Tier 2, Tier 4 | `POST /api/leads` | P0 (GTM) | Backend sprint: create endpoint |
| Run submissions are no-ops | Tier 3 | `POST /api/configuration/clone` | P0 (GTM) | Backend sprint: create endpoint |
| Public showcase is static | Tier 3 | `GET /api/products?org_id=demo-org-public` | P1 (GTM) | Backend sprint: create endpoint + daily seed |
| Health badge always shows error | All (top bar) | `GET /api/health` | P2 | Backend sprint: create endpoint |
| No run cap enforcement | Tier 3 | `POST /api/configuration/clone` | P1 | Backend sprint: implement cap in endpoint |

---

## 4. `lib/configurationClient.js` — Status

**File does not exist** as of 2026-05-05. Configuration page reads session config directly from `sessionStorage` via inline logic in `pages/Configuration.jsx` (functions `getSessionConfig()` and `saveSessionConfig()`).

There is no mock fallback flag (`VITE_USE_API_BACKEND`) in the codebase. The Configuration page does not call any `/api/*` endpoints — it uses Base44 SDK entities directly.

**When to create `lib/configurationClient.js`:** When the backend sprint delivers `POST /api/configuration/clone`, `POST /api/configuration/describe`, and `POST /api/configuration/synthesize`, extract the fetch calls into this client file. At that point, add an `isDemoMode` guard based on `import.meta.env.VITE_USE_API_BACKEND` (default `true`).

**No code changes needed today** — this item is pre-condition for the backend sprint, not the UI sprint.

---

## 5. Agent Infrastructure — W2 Deliverables (2026-05-06)

Three foundational W2 files are now committed to `/src/lib/`:

| File | Owner | Purpose |
|------|-------|---------|
| `lib/agents/BaseAgent.js` | W2 | Single contract all 20 Super Agents implement. Includes canonical AGENT_IDS roster, AUTHORITY boundaries, PRODUCT_SCOPES, and runtime `guard()` enforcement. |
| `lib/agents/MessageSchema.js` | W2 | Agent-to-agent message envelope contract. 40 topic constants, per-topic payload validators, `validateEnvelope()`, `makeEnvelope()`. |
| `lib/governance/ScoreEvaluator.js` | W2 | Governance + Readiness rubrics (weights validated to sum to 100). `ScoreEvaluator` class, `clearanceDecision()`, `toDefectRegister()`. Clearance threshold: 95. No grandfathering. |

**Defect register:** `docs/w2/v3-defect-register.md` — 17 agent-side defects + 5 cross-workstream flags. D-016 (authority enforcement) and D-015 (canonical roster) are closed by the BaseAgent delivery above.

---

## 6. Next Actions for Backend Sprint

The following endpoints need to be built (Claude Code) before the wiring gaps can be closed:

1. **`POST /api/leads`** (P0)
   - Insert to Supabase `leads` table
   - Send Resend notification to `demo@veuaistudio.com`
   - Handle duplicate emails (upsert on email)
   - No auth required

2. **`POST /api/configuration/clone`** (P0)
   - Accept payload per `FLOWAI_API_CONTRACT.md` spec
   - When `org_id = "demo-org-public"`: enforce 1-run-per-email-per-day cap via `demo_run_log`
   - Return `{ session_id, status: "queued" }`

3. **`GET /api/products`** (P1)
   - Return products filtered by `org_id` query param
   - For `demo-org-public`: return seeded VEU AI Studio product set
   - No auth required for demo org

4. **`GET /api/admin/seed-demo`** (P1)
   - Admin token required
   - Refresh `demo-org-public` data from `src/data/demo/*.json` baseline
   - Generate 3 synthetic "today's runs" via LLM

5. **`GET /api/health`** (P2)
   - Return `{ status: "ok", timestamp }` 
   - No auth required