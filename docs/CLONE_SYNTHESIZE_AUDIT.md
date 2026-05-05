# FlowAI Configuration Modes — Current State Audit

Audit of the five existing Base44-side configuration modes prior to migration to Vercel `/api/configuration/*`.

Source files inspected:
- `src/pages/Configuration.jsx` (Card-based session config — entry point for the four modes)
- `src/pages/LandingPage.jsx` (Landing UI with Card A/B/C → URL/Describe/Paste)
- `src/pages/ProductRegistry.jsx` (My Products — table view)
- `src/pages/PortfolioDashboard.jsx` (VEU portfolio overview, calls `/api/products`)
- `src/pages/RunsHistory.jsx` (run history — reads `base44.entities.AutoSession`)
- `src/lib/operationsEngine.js` (existing prompt builder + crawler wrapper)

---

## Mode 1 — My Products

**What it does today:**
- Lists registered products. Renders rows: name, slug, org, status, last run, demo score.
- Source of truth: `fetch('/api/products')` (current Vercel endpoint) merged with `base44.entities.ClearanceRecord.list()` and `base44.entities.ProductRegistry.list()` for clearance + score enrichment.
- Falls back to a hardcoded `VEU_SEED` array (5 products) when the API returns nothing.
- "New Product" modal POSTs to `/api/products` with `{ name, slug, live_url, description, org, status }`.
- "Archive" PATCHes `/api/products/:slug` with `{ status: 'archived' }`.

**External calls:**
- `/api/products` (Vercel)
- Base44 SDK: `entities.ClearanceRecord.list`, `entities.ProductRegistry.list`

**Persistence today:** Mixed — Vercel side has the in-memory ring buffer (resets on cold start), Base44 has the row-level entities for clearance + last-run metadata.

**Gaps:**
- The current `/api/products` returns `{ items, total, limit, offset, stats }`, but the Base44 UI does `Array.isArray(apiProducts) && apiProducts.length > 0` — so it silently falls back to seed data. Already-stored products are never seen by the UI.
- Slug is not currently honored as a unique identifier in `/api/products` (uses a random `p_xxx` UUID).
- `live_url`, `slug`, `org` are not first-class columns; they live inside generic fields.
- No multi-tenant scoping: products list is global.

---

## Mode 2 — Describe & Build

**What it does today:**
- User types or speaks a free-form product description into the Configuration → Card 2 textarea (or the Landing → Card B textarea).
- Description is saved to `sessionStorage.flowai_session_config`.
- On launch, the description is passed as input to the Auto Runner / Guided / Manual flow.
- Auto Runner sends each step's description-based prompt to `/api/run-step` (which we built yesterday).

**External calls:**
- `/api/describe-product` exists (built earlier this run) but the UI does NOT call it directly today — it calls the heavier `/api/run-step` per step.
- An older `/api/describe-product` produces enrichment + suggestions for a description.

**Persistence today:** sessionStorage (per-tab) → eventually Auto Runner persists results.

**Gaps:**
- No structured product spec is produced — only free-form Claude output per step.
- No persistence under a `product_id` until Auto Runner runs.
- Cost per describe call is recorded server-side but not tied to a product.

---

## Mode 3 — Clone & Improve

**What it does today:**
- User pastes a URL into Configuration → Card 2 (clone option) or Landing → Card A.
- "Test Fetch" button (Landing only) calls `/api/research-url` which:
  1. Crawls via `/api/_lib/crawler.js` (Browserless when JS-heavy, simple-fetch otherwise).
  2. Sends the rendered HTML + meta to Claude with a research-brief prompt.
  3. Returns a structured analysis.
- On launch, the URL is fed into Auto Runner's 8-step flow. Each step calls `/api/run-step` with the page block.

**External calls:**
- `/api/research-url`, `/api/run-step` (Vercel)
- Browserless via the crawler chain (active when `BROWSERLESS_API_KEY` is set — already on)
- Replit Playwright proxy (legacy fallback)

**Persistence today:** sessionStorage + Auto Runner localStorage. No long-term snapshot of the captured page.

**Gaps:**
- "Clone" implies producing a buildable spec/architecture from the source. Today only an analysis is produced.
- No screenshot capture, no asset inventory, no DOM tree extraction.
- No improvement-plan output schema — improvement suggestions are scattered across step results.
- No way to re-run a clone on a schedule (Self-Renewal cycles need this).

---

## Mode 4 — Synthesize & Build

**What it does today:**
- User pastes 2–5 URLs in Configuration → Card 2 (synthesize option).
- The first input is named "Input A", subsequent ones "Input B", "Input C", etc.
- On launch, Auto Runner executes per-input pages in parallel for the first 7 steps; step 8 (monitor) runs a single synthesis prompt across all inputs (`buildFinalReportPrompt('combine', inputs, allResults)`).

**External calls:**
- Same as Clone — `/api/run-step` per input.

**Persistence today:** sessionStorage + Auto Runner localStorage.

**Gaps:**
- Inputs are URL-only today; no support for mixing URL + text + uploaded files in a single synthesis call.
- No weighting between inputs (each gets equal influence).
- Voyage AI embeddings are scaffolded but not used — synthesis can't currently dedupe near-identical content across inputs or weight by semantic relevance.
- The synthesized "spec" is free-form text; no machine-readable schema.

---

## Mode 5 — Objective & Settings

**What it does today:**
- Configuration page → Card 3 selects from a dropdown of preset objectives (`audit_demo`, `investor_review`, `full_governance`, `compare`, `combine`, `benchmark`, `launch_readiness`, `custom`).
- Card 4 sets analysis depth, confidence threshold, max reruns, output format, benchmark on/off.
- Stored in `sessionStorage.flowai_session_config.autoParams`.
- Each step's prompt builder (in `src/lib/operationsEngine.js`) injects an "OBJECTIVE LENS" string based on the selected objective.

**External calls:** none directly — settings are passed inline into prompts.

**Persistence today:** sessionStorage only (per-tab). Not associated with a `product_id`.

**Gaps:**
- Objectives are session-scoped, not product-scoped. Can't say "SAIGE always uses investor_review by default".
- No notion of constraints (e.g., "must include compliance lens") or preferences (e.g., "prefer self-serve GTM").
- `compare` and `benchmark` require multiple inputs but the UI doesn't enforce this.

---

## Cross-cutting limitations

- **No multi-tenant scoping today.** Every product, run, cost event is global. The Vercel side has the `org_id` plumbing in `/api/_lib/db.js` + `tenant.js` but the UI doesn't pass it.
- **In-memory persistence on Vercel.** Resets on cold start. Browser localStorage covers individual sessions.
- **No semantic search yet.** Voyage AI is scaffolded but no run-step output is ever embedded.
- **Cost is tracked but not attributed to products.** Today's cost events have `sessionId` but no `productId`.
- **Clearance + governance live in two places.** `/api/clearance/run` (Vercel) and `base44.entities.ClearanceRecord` (Base44). No single source of truth.

---

## Migration plan (this track)

For each mode build a `/api/configuration/<mode>` endpoint:

| Mode | New endpoint | Inputs | Outputs |
|---|---|---|---|
| My Products | `/api/configuration/products` | `{ name, slug, live_url, description, org_id, status, tags }` | Array of products + per-product cost/score enrichment |
| Describe & Build | `/api/configuration/describe` | `{ description, org_id, product_id?, objective_id? }` | Structured spec `{ name, pitch, audience, features[], value_prop, ... }` |
| Clone & Improve | `/api/configuration/clone` | `{ url, org_id, product_id?, options? }` | `{ snapshot, architecture, improvement_plan, screenshots? }` |
| Synthesize & Build | `/api/configuration/synthesize` | `{ inputs:[{type,value,weight}], objective, org_id, product_id? }` | `{ unified_spec, attribution_map, improvement_plan }` |
| Objective & Settings | `/api/configuration/objectives` | `{ product_id, type, value, weight }` | List of objectives bound to a product |

All endpoints:
- Multi-tenant from row 1 (`org_id` required, served via `requireAuth`).
- Persist through `db.js` (memory today, Supabase tomorrow).
- Emit `cost_events`, `audit_log`, `clearance_check` rows on every run.
- Falls back gracefully when `BROWSERLESS_API_KEY` / `VOYAGE_API_KEY` / `INNGEST_*` are missing.
- Registered as orchestrator agents → invokable via `/api/orchestrator/run`.
