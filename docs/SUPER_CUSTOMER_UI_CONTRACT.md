# Super Customer Agent — UI Wiring Contract

This document defines exactly what FlowAI's UI (Base44) renders and which `/api/audits/super-customer/*` endpoints back each section. Wire to these contracts; backend is stable.

All endpoints multi-tenant: pass `org_id` via `x-flowai-org-id` header (or rely on Clerk session once `AUTH_REQUIRED=true`).

---

## 1. Product Registry — "Run Audit" button

**Where:** every row of `/products` (Product Registry table).

**Action:** clicking "Run Audit" dispatches a Super Customer audit on the product's `live_url`.

```ts
// POST /api/audits/super-customer/run
interface RunRequest {
  url: string;                              // required — the product's live_url
  product_id?: string;                       // the product slug or uuid
  org_id?: string;                           // optional; resolved from header otherwise
  depth?: 'quick' | 'standard' | 'full';     // default 'standard'
  max_page_count?: number;                   // bounded to 200 hard cap
  soft_cost_usd?: number;                    // default 5
  hard_cost_usd?: number;                    // default 25
  objective?: string;                        // optional audit lens
  sync?: boolean;                            // default false
}

interface RunResponse {
  ok: true;
  run_id: string;
  status: 'queued' | 'running';
  mode: 'super-customer';
  org_id: string;
  product_id: string | null;
  polling_url: string;                       // GET this with run_id query param
  eta_sec: number;
  backend: 'inline-pull-resume' | 'inngest';
}
```

**UI behaviour:**
- Show a confirmation modal before dispatching: "This audit will cost approximately $X (depth=standard, ~30 pages). Proceed?"
- Cost estimate: `~$0.20 per page × max_page_count`. Display before dispatch.
- After 202 response, immediately navigate to `/audits/run/<run_id>` (the Live Progress view, see §2).

---

## 2. Live Progress view (`/audits/run/:run_id`)

**Where:** dedicated route that polls until the audit completes.

```ts
// GET /api/audits/super-customer/run?run_id=<id>
// (or alias: GET /api/audits/super-customer/status/:run_id)
interface StatusResponse {
  run_id: string;
  mode: 'super-customer';
  org_id: string;
  product_id: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: {
    step: string;                            // e.g. 'capturing_surface_3'
    percent: number;                         // 0..100
    etaSec: number | null;
  } | null;
  partial_output: {                          // updated mid-run as surfaces complete
    surfaces?: number;                       // count so far
    issues?: { P0: number; P1: number; P2: number; P3: number; total: number };
    cost?: number;                           // running total
  } | null;
  output: AuditRun | null;                   // populated on status='completed'
  error: string | null;
  cost_usd: number;
  health_score: number | null;
  started_at: string;                        // ISO
  completed_at: string | null;
  duration_ms: number | null;
}
```

**Polling cadence:** 2s for the first 30s, then 5s. Stop polling on `status: completed | failed`.

**UI behaviour:**
- Show a real-time progress bar driven by `progress.percent`.
- Show running counts (surfaces audited, P0/P1/P2/P3 totals, cost) from `partial_output`.
- Render each completed surface as a "✓ Captured: <url> — N issues" line as `partial_output.surfaces` increments.
- On `status: completed`, navigate to `/audits/results/<run_id>` (the Results Dashboard, §3).
- On `status: failed`, surface `error` + offer "Retry" button (re-POST with same body).

> **Limitation today:** Cross-instance memory loss can briefly return 404 for a recent run. The polling endpoint forwards through the same function file as the dispatcher to maximize warm-instance affinity. When Supabase activates, runs become durable — this fully resolves.

---

## 3. Results Dashboard (`/audits/results/:run_id`)

**Where:** dedicated route showing the completed audit.

```ts
// GET /api/audits/super-customer/results/:run_id
// Optional ?format= for slimmer payloads:
//   format=summary   → metadata + counts only
//   format=issues    → counts + issues array
//   format=md        → executive-summary markdown text
//   (default)        → full bundle below
interface AuditResults {
  run_id: string;
  target_url: string;
  org_id: string;
  product_id: string | null;
  depth: 'quick' | 'standard' | 'full';
  started_at: string;
  completed_at: string;
  duration_ms: number;
  surfaces: AuditSurface[];                  // see below
  issues: AuditIssue[];                      // see below
  counts: { P0: number; P1: number; P2: number; P3: number; total: number };
  health_score: number;                      // 0..100
  cost_usd: number;
  cost_caps: { soft: number; hard: number };
  notes: string[];
  summary_text: string;                      // executive summary markdown
  action_plan_json: ActionPlan | null;
}

interface AuditSurface {
  id: string;                                // 'surf_1', 'surf_2', ...
  url: string;
  depth: number;
  status: number;                            // HTTP status
  title: string;
  timing: { navigationMs: number; loadMs: number | null; domContentLoadedMs: number | null };
  consoleErrors: { text: string; location?: any }[];
  networkErrors: { url: string; error: string }[];
  surfaceCounts: { links: number; buttons: number; forms: number; images: number };
  accessibility: { headingHierarchyOk: boolean | null; totalImages: number; imagesMissingAlt: number };
  screenshot: { sizeKB: number; capturedAt: string; relPath: string } | null;
  analysis: {
    surface_summary: string;
    primary_action: string;
    issues: AuditIssue[];                    // surface-level issues; rolled up into top-level run.issues
    health_score: number;                    // per-surface
  } | null;
  analysisError: string | null;
  captureMs: number;
}

interface AuditIssue {
  id: string;                                // 'issue_1', ...
  run_id: string;
  surface_id: string;                        // links back to AuditSurface.id
  surface_url: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  category: 'functional' | 'performance' | 'accessibility' | 'security' | 'data' | 'content' | 'design' | 'trust' | 'conversion' | 'compliance';
  title: string;
  description: string;
  reproduction_steps: string[];
  proposed_solution: string;
  estimated_effort: 'trivial' | 'small' | 'medium' | 'large';
  status?: 'open' | 'in_progress' | 'fixed' | 'wontfix' | 'duplicate'; // default 'open'
}

interface ActionPlan {
  overall_health_score: number;
  top_issues: { severity: string; category: string; title: string; solution: string; surface_url: string }[];
  themes: string[];
  effort_days: number;
  next_week_priorities: { day_estimate: number; deliverable: string }[];
}
```

**UI sections (top to bottom):**

### 3.1 Header card
- Big "Health Score: NN / 100" with severity color (≥70 green, 30-69 amber, <30 red)
- Target URL · started/completed timestamps · duration · cost
- Buttons: "Generate Claude Code Backlog" · "Download PDF" · "Re-run"

### 3.2 Severity breakdown
- 4 stat cards: P0 / P1 / P2 / P3 counts with severity color
- Click a card to filter the issue list below

### 3.3 Issue list (filterable, sortable)
- Filters: severity (P0/P1/P2/P3) · category · status (open/in_progress/fixed/wontfix)
- Sort: severity DESC · effort ASC · surface URL
- Each row expands to show description + reproduction_steps + proposed_solution + screenshot drill-down link
- Per-issue actions: "Mark fixed" · "Assign to..." · "Link external ticket" · "Copy as Claude Code task"

### 3.4 Surface map visualization
- A graph: nodes = surfaces, sized by `analysis.health_score`, colored by max issue severity
- Click a node → drill into surface detail page (§4)

### 3.5 Themes + action plan
- `action_plan_json.themes` rendered as bullet list
- `next_week_priorities` rendered as a 3-row checklist with day estimates
- "Add all to Linear / Jira" button (per integration availability)

---

## 4. Surface drill-down (`/audits/surface/:surface_id`)

Renders a single `AuditSurface` from the `results.surfaces` array (no separate endpoint — UI receives the array and routes by index).

**Sections:**
- Screenshot (when available)
- HTTP status, timing, console errors, network errors
- Surface inventory: links / buttons / forms / images
- Per-surface analysis text + issues for THIS surface only

---

## 5. "Generate Claude Code Backlog" button

Maps each issue to a paste-ready Claude Code instruction string. Server-side endpoint:

```ts
// GET /api/audits/super-customer/results/:run_id?format=issues
// Returns { run_id, counts, issues }
```

UI takes the issue array, formats each one client-side as the Claude Code task block (matching the format in `docs/audits/pressai-2026-05-05/CLAUDE_CODE_BACKLOG.md`), and concatenates into a single text blob the user can copy.

**Template per issue:**
```
## ${issue.severity}-${zeroPad(issue.id, 3)} — ${issue.title}

**Severity:** ${issue.severity} (${issue.category})
**Surface:** \`${issue.surface_url}\`
**Estimated effort:** ${issue.estimated_effort}

### Task

> ${issue.description}
>
> ${issue.proposed_solution}

### Acceptance criteria

- (operator fills in based on the proposed solution)
```

---

## 6. Audit history (`/audits/history?product_id=<id>`)

```ts
// GET /api/audits/super-customer/runs?org_id=&product_id=&status=&limit=
interface RunsListResponse {
  runs: {
    run_id: string;
    org_id: string;
    product_id: string | null;
    target_url: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    started_at: string;
    completed_at: string | null;
    duration_ms: number | null;
    surfaces_count: number;
    counts: { P0; P1; P2; P3; total } | null;
    health_score: number | null;
    cost_usd: number;
    error: string | null;
  }[];
  total: number;
  org_id: string;
  product_id: string | null;
}
```

**UI:** table with columns: started_at · target_url · health_score (color-coded) · P0 count · P1 count · cost · status. Click a row → results page (§3).

---

## 7. Comparison view (`/audits/compare?a=<run_id>&b=<run_id>`)

Diff two completed runs side-by-side. The UI fetches both via §3's endpoint and computes the diff client-side.

**Comparison logic:**
- Match issues across runs by `(category, normalised(title), surface_url)` triple
- Categorise each issue as: **resolved** (in A, not in B) · **new** (in B, not in A) · **persisted** (in both) · **regressed** (status was 'fixed' in A, present again in B — only meaningful when run B started after run A's resolution timestamp)
- Show health score delta: `B - A`
- Cost delta: `B - A`

**UI layout:** three columns
- Left: "Resolved (n)" — green checkmark list
- Middle: "Persisted (n)" — amber list, ordered by severity
- Right: "New (n)" — red list

Show per-theme changes: how many P0s, P1s, etc. moved between buckets.

---

## 8. PDF export

```ts
// GET /api/audits/super-customer/results/:run_id/pdf
// Returns text/html (print-friendly, fully self-contained CSS)
```

**UI behaviour:**
- "Download PDF" button on the Results Dashboard opens this URL in a new tab.
- Browser's "Save as PDF" produces the polished branded artifact.
- v1.5: server-side will return real `application/pdf` once a renderer is wired (Browserless `/pdf` is the cheapest path).

---

## 9. Auto-refresh / streaming considerations

- During a running audit, the Live Progress view (§2) is the only place that polls. All other views are static reads.
- On the Results Dashboard, surfacing fresh state on visit is enough — no polling needed.

## 10. Error handling cheatsheet

| Status | Meaning | UI action |
|---|---|---|
| 202 | Run dispatched | Navigate to Live Progress |
| 200 + status='completed' | Done | Navigate to Results |
| 200 + status='failed' | Failed | Show error toast + retry button |
| 200 + status='running' | In progress | Continue polling |
| 404 | Run not found (cross-instance memory loss) | Wait 2-3s and retry once; if still 404, show "Run lost — please re-dispatch" |
| 409 (results) | Run not completed yet | Redirect to Live Progress |
| 503 | Provider failed (Browserless quota / Anthropic rate limit) | Show specific reason + retry-later message |

## 11. Cost UI guidance

- Pre-dispatch: show estimated cost. Default depths:
  - quick: ~$0.50 (5-10 pages)
  - standard: ~$3 (20-30 pages)
  - full: ~$10-15 (75-100 pages)
- Mid-run: surface running cost from `partial_output.cost`.
- Post-run: show actual cost. If `notes` contains a "Hard cost cap reached" entry, surface a banner explaining the audit was truncated at the cap.
- Org-level dashboard widget: monthly audit spend per product.

## 12. Field-level validation rules (UI side)

- `url` must match `^https?://`. Strip whitespace.
- `max_page_count` integer, 1-200.
- `depth` enum.
- `objective` free text, max 500 chars.
- `soft_cost_usd` < `hard_cost_usd`. Both > 0. `hard_cost_usd` capped at 25 server-side.
