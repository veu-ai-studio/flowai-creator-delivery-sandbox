# FlowAI API Schemas

TypeScript-style contracts for the `/api/configuration/*` and `/api/orchestrator/*` endpoints. Base44's UI side (and any future client like SAIGE / PressAI / RelTwin / ReachSMS / MyBirthSafe) reads this doc when wiring API calls.

All requests/responses are JSON over HTTPS. Multi-tenant: every endpoint accepts `org_id` via `x-flowai-org-id` header, request body, or query string. When `AUTH_REQUIRED=true` (tomorrow), Clerk session resolves it.

---

## Common types

```ts
type ISODate = string;        // e.g. "2026-05-04T20:14:00.123Z"
type Mode = 'clone' | 'synthesize' | 'describe';
type RunStatus = 'queued' | 'running' | 'completed' | 'failed';
type Decision = 'CLEARED' | 'CONDITIONAL' | 'NOT CLEARED' | 'UNKNOWN';

interface Progress {
  step: string;            // human-readable phase name, e.g. "capture", "synthesis"
  percent: number;          // 0..100, -1 means failed
  etaSec: number | null;    // estimated seconds remaining
}

interface CostUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}
```

---

## Async + poll pattern (orchestrator)

> **Why async + poll:** clone and synthesize runs make 2+ Claude calls plus a Browserless capture. End-to-end this can take 30-90 seconds. Vercel serverless idle timeouts (and many client fetch implementations) drop the connection well before that. Async dispatch returns the `run_id` in <1s; the client polls `/status/:run_id` for progress and the final result.

### POST `/api/orchestrator/run`

Dispatches a run. Returns within 1 second.

**Request:**

```ts
interface OrchestratorRunRequest {
  agent: Mode | string;     // 'clone' | 'synthesize' | 'describe' (or any registered agent)
  payload: any;             // mode-specific (see below)
  product_id?: string;      // optional product binding
  org_id?: string;
  sync?: boolean;           // default false. true blocks (sync mode for short jobs only)
}
```

**Response (202 Accepted):**

```ts
interface OrchestratorRunResponse {
  ok: true;
  run_id: string;            // poll /status/:run_id with this
  status: 'queued' | 'running';
  agent: string;
  org_id: string;
  product_id: string | null;
  polling_url: string;       // e.g. "/api/orchestrator/status/clone_xxx"
  eta_sec: number;
  backend: 'inngest' | 'inline-background';
}
```

**Errors (400):** `{ error: string }` for unknown agent or missing required field.

### GET `/api/orchestrator/run?run_id=<id>` (canonical) or `/api/orchestrator/status/:run_id` (alias)

> **Why colocated:** Vercel function instances do NOT share in-memory state across different function files. Putting status under the same `run.js` file means polls hit the same function instance pool as the POST dispatch — within warm-instance affinity (typical for FlowAI's traffic) the run is consistently visible. The `/status/:run_id` path remains as an alias that internally forwards to the colocated GET. When Supabase is wired the registry becomes durable across instances and the dual-path no longer matters.

```ts
interface OrchestratorStatusResponse {
  run_id: string;
  agent: Mode;
  org_id: string;
  product_id: string | null;
  status: RunStatus;
  progress: Progress | null;
  partial_output: any | null;       // populated during execution; agent-specific shape
  output: any | null;               // populated when status === 'completed'
  error: string | null;
  cost_usd: number;
  quality_score: number | null;     // 0..100
  started_at: ISODate;
  completed_at: ISODate | null;
  duration_ms: number | null;
  has_snapshot: boolean;
}
```

**Recommended polling cadence:** 2s for the first 30s, then 5s after that. Stop polling on `status: completed | failed`.

**Limitation today:** The run registry is in-process memory on Vercel. The same warm function instance is likely to serve both `/run` and `/status/:run_id` (low traffic), but a cold-started status request may return 404 for a recent run. This goes away when Supabase is wired (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).

---

## Mode 1 — My Products

### GET `/api/configuration/products?status=&q=&limit=&offset=&format=`

```ts
interface Product {
  id: string;                   // "prod_xxx"
  org_id: string;
  name: string;
  slug: string;                 // unique within org
  live_url: string;
  description: string;
  org: string;                  // display org name (e.g. "VEU AI Studio")
  type: string;                 // "web" | "mobile" | "demo" | ...
  status: 'active' | 'beta' | 'audited' | 'archived' | 'draft';
  tags: string[];
  last_audit_at: ISODate | null;
  last_audit_score: number | null;   // 0..100
  last_run_id: string | null;
  cost_to_date_usd: number;
  metadata: Record<string, unknown>;
  created_at: ISODate;
  updated_at: number;           // ms epoch
}

// Default response
interface ProductsListResponse {
  total: number;
  limit: number;
  offset: number;
  items: Product[];
  stats: { total, active, audited, archived, beta, totalCostUSD: number };
  orgId: string;
}

// With ?format=array
type ProductsArrayResponse = Product[];
```

### POST `/api/configuration/products`

Body: `{ name: string, slug?: string, live_url?: string, description?: string, org?: string, type?: string, status?: string, tags?: string[] }`. Slug auto-generated from name when omitted.

Response: `{ ok: true, item: Product, stats: ... }` (201).

### POST `/api/configuration/products?bulk=1`

Body: `{ items: NewProduct[] }`. Each item upserted (slug as key).

### GET `/api/configuration/products/:idOrSlug`

Response: `{ item: Product, recentRuns: Run[] }` (last 10 runs for the product).

### PUT/PATCH `/api/configuration/products/:idOrSlug`

Body: any partial fields. Supports slug rename.

### DELETE `/api/configuration/products/:idOrSlug`

Soft archives by default. Pass `?hard=1` to permanently delete.

### POST `/api/configuration/products/:idOrSlug?action=audit`

Body: `{ score?: number, costUSD?: number }`. Records an audit timestamp + score; bumps cost-to-date.

---

## Mode 2 — Describe & Build

### POST `/api/configuration/describe`

Direct (sync) call. Returns the spec inline. ~15-25s.

```ts
interface DescribeRequest {
  description: string;          // required, free-form
  productName?: string;
  audience?: string;
  features?: string;
  objective?: string;
  product_id?: string;
  org_id?: string;
  save?: boolean;               // default true
}

interface DescribeResponse {
  ok: true;
  run_id: string;
  mode: 'describe';
  org_id: string;
  product_id: string | null;
  brief: string;                // human-readable plain-text brief
  spec: ProductSpec | null;     // machine-readable JSON spec (parsed from fenced block)
  quality_score: number | null;
  model: string;
  usage: CostUsage;
  cost_usd: number;
  saved: boolean;
}

interface ProductSpec {
  name: string;
  pitch: string;
  audience: { primary: string; secondary: string | null };
  features: string[];
  value_proposition: string;
  competitors: { name: string; gap: string }[];
  demo_readiness: number;       // 0..10
  next_steps: string[];
  open_questions: string[];
  quality_score: number;        // 0..100
}
```

For long-running variants, dispatch via `/api/orchestrator/run` with `agent: 'describe'`.

---

## Mode 3 — Clone & Improve

### POST `/api/configuration/clone`

Long-running (~30-90s with Browserless). Use sync only when the client can hold the connection. For UI flows, use `/api/orchestrator/run` with `agent: 'clone'`.

```ts
interface CloneRequest {
  url: string;                  // required
  product_id?: string;
  org_id?: string;
  options?: {
    captureScreenshot?: boolean;       // default false
    architectureAnalysis?: boolean;    // default true
    improvementPlan?: boolean;         // default true
    async?: boolean;                   // default false
  };
}

interface CloneResponse {
  ok: true;
  run_id: string;
  mode: 'clone';
  org_id: string;
  product_id: string | null;
  url: string;
  snapshot: {
    url: string;
    title: string;
    metaDescription: string;
    headings: { tag: string; text: string }[];
    bodyTextSnippet: string;            // first 1500 chars
    jsRendered: boolean;
    method: 'browserless' | 'playwright-endpoint' | 'simple-fetch';
    warnings: string[];
    capturedAt: ISODate;
  };
  architecture: {
    text: string;
    json: ArchitectureSpec | null;
    model: string;
  } | null;
  improvement_plan: {
    text: string;
    json: ImprovementPlan | null;
    model: string;
  } | null;
  quality_score: number | null;
  cost_usd: number;
  durationMs: number;
}

interface ArchitectureSpec {
  identity: { headline: string; pitch: string };
  primary_objective: string;
  ia: string[];
  ctas: string[];
  forms: { label: string; fields: string[] }[];
  trust_signals: string[];
  tech_signals: string[];
  a11y_signals: string[];
  quality_score: number;
}

interface ImprovementPlan {
  summary: string;
  improvements: {
    priority: 'P0' | 'P1' | 'P2';
    theme: string;
    title: string;
    rationale: string;
    change: string;
  }[];
  quick_wins: string[];
  structural: string[];
  quality_score: number;
}
```

---

## Mode 4 — Synthesize & Build

### POST `/api/configuration/synthesize`

```ts
interface SynthesizeRequest {
  inputs: {
    type: 'url' | 'text' | 'file';
    value: string;                    // URL, text content, or file-extracted text
    weight?: number;                  // default 1; 0 excludes from synthesis
    label?: string;                   // optional override; auto-named "Input A", "Input B" otherwise
  }[];                                // 2 or more required
  objective?: string;
  product_id?: string;
  org_id?: string;
  options?: { useEmbeddings?: boolean };  // default true; no-op when Voyage unavailable
}

interface SynthesizeResponse {
  ok: true;
  run_id: string;
  mode: 'synthesize';
  unified_spec: { text: string; json: UnifiedSpec | null };
  improvement_plan: { text: string; json: ImprovementPlan | null };
  attribution_map: AttributionMap | null;
  quality_score: number | null;
  embeddings: {
    embedded: number;
    possibleDuplicates: { a: string; b: string; similarity: number }[];
  } | null;
  input_summary: { idx: number; label: string; type: string; weight: number; ok: boolean }[];
  failed_captures: { label: string; url: string; reason: string }[];
  cost_usd: number;
  durationMs: number;
}

interface UnifiedSpec {
  name: string;
  pitch: string;
  audience: { primary: string; evidence_label: string };
  features: { name: string; sources: string[] }[];
  value_proposition: { text: string; source_label: string };
  attribution: AttributionMap;
  quality_score: number;
}

interface AttributionMap {
  identity: string;
  features: string[];
  value_prop: string;
  audience: string;
}
```

---

## Mode 5 — Objective & Settings

### GET `/api/configuration/objectives?product_id=<id>`

```ts
interface Objective {
  id: string;
  org_id: string;
  product_id: string;
  type: 'goal' | 'constraint' | 'preference';
  value: string;
  weight: number;
  metadata: Record<string, unknown>;
  created_at: ISODate;
  updated_at: number;
}

interface ObjectivesListResponse {
  objectives: Objective[];
  orgId: string;
  productId: string | null;
}
```

### POST/PATCH `/api/configuration/objectives`

Body: `{ product_id, type, value, weight?, metadata?, id? }`. If `id` provided and exists, updates; else creates.

### DELETE `/api/configuration/objectives?id=<id>`

---

## Configuration runs index

### GET `/api/configuration/runs?product_id=&mode=&status=&limit=`

Returns `{ runs: Run[], total: number }`. Each `Run` matches the status response shape (no snapshot field).

### GET `/api/configuration/runs?id=<run_id>`

Returns `{ run, snapshot? }`. Equivalent to `/api/orchestrator/status/:run_id` but doesn't create the polling URL hint.

---

## Telemetry side-effects

Every run (clone/synthesize/describe) emits the following persistence events:

| Event | Endpoint | Purpose |
|---|---|---|
| `cost_event` | via `db.appendCostEvent` | Per-Claude-call: model, tokens, USD estimate, run_id, org_id, product_id |
| `audit_log` | via `db.appendAuditEntry` | `configuration.<mode>.started/completed/failed` with duration + cost |
| `clearance_check` | via `db.appendClearanceCheck` | `CLEARED` (≥70), `CONDITIONAL` (30-69), `NOT CLEARED` (<30) keyed off `quality_score` |
| `product` audit roll-up | via `recordProductAudit` | Bumps `last_audit_at`, `last_audit_score`, `cost_to_date_usd` on the product record |

Today these write to in-memory ring buffers. When Supabase is on, the same writes go to `cost_events`, `audit_log`, `clearance_checks`, `products` tables (schema in `supabase/migrations/0001_initial.sql`).

---

## Error envelope (orchestrator-routed runs)

```ts
interface AgentError {
  ok: false;
  agent: string;
  code: 'AGENT_DISABLED' | 'INVALID_INPUT' | 'UPSTREAM_ERROR' | 'TIMEOUT' | 'RATE_LIMITED' | 'UNKNOWN';
  message: string;
  retriable: boolean;
  details: any;
}
```

---

## Health checks

### GET `/api/orchestrator/health`

Aggregate health across every registered agent (claude, browserless, supabase, inngest, clerk, resend, voyage, axiom, base44, replit, vercel, playwright, **clone, synthesize, describe**).

Returns `{ summary, agents: { [name]: { registered, enabled, description, retry, health } } }`.

### GET `/api/me`

Returns current request's `{ authenticated, authMode, userId, orgId, productId, config: { authRequired, clerkConfigured } }`.
