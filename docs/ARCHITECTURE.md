# FlowAI / VEUaaS — Architecture

## 1. The picture

```mermaid
flowchart TB
    %% Client tier
    User([User<br/>browser])
    Base44[Base44 UI<br/>React + Vite SPA<br/>src/pages, src/components]
    User -->|HTTPS| Base44

    %% Vercel edge
    subgraph Vercel[Vercel deployment - flowai-dun.vercel.app]
        SPA[SPA fallback<br/>vercel.json rewrites]
        APIs[/api/* serverless functions]
        Base44 -.->|fetch| SPA
        Base44 -->|JSON| APIs
    end

    %% API surface
    subgraph APITier[API surface]
        Diag[/api/diagnostic<br/>provider probes/]
        Ver[/api/version<br/>commit + flags/]
        Me[/api/me<br/>auth context/]
        Conf[/api/configuration/*<br/>products / describe / clone /<br/>synthesize / objectives / runs/]
        Orch[/api/orchestrator/*<br/>run / status / health/]
        Other[/api/* legacy endpoints<br/>test-claude / llm-step /<br/>research-url / audit-product /<br/>fetch-url / clearance / etc/]
    end

    APIs --> Diag
    APIs --> Ver
    APIs --> Me
    APIs --> Conf
    APIs --> Orch
    APIs --> Other

    %% Orchestration
    subgraph Lib[/api/_lib internal layer]
        Orchestrator[orchestrator.js<br/>agent registry]
        DB[db.js<br/>backend abstraction]
        Auth[auth.js<br/>Clerk + tenant.js]
        Crawl[crawler.js<br/>Browserless chain]
        Logger[logger.js<br/>Axiom + console fallback]
        Cost[cost.js<br/>token + USD tracking]
        Email[email.js<br/>Resend templates]
        Embed[embeddings.js<br/>Voyage]
        InngestLib[inngest.js<br/>queue + functions]
    end

    Conf --> DB
    Conf --> Crawl
    Conf --> Cost
    Conf --> Logger
    Orch --> Orchestrator
    Orchestrator --> Auth
    Orchestrator --> Crawl
    Orchestrator --> Logger
    Orchestrator --> Cost

    %% Persistence
    subgraph Persist[Persistence]
        Memory[(In-memory ring<br/>configRegistry +<br/>cost.js + auditlog.js +<br/>products.js)]
        Supabase[(Supabase Postgres<br/>+ pgvector + RLS)]
    end
    DB -.->|DB_BACKEND=memory| Memory
    DB -.->|DB_BACKEND=supabase| Supabase

    %% External providers
    subgraph Providers[External providers]
        Anthropic[Anthropic API<br/>Sonnet 4.6 / Opus 4.7]
        Browserless[Browserless<br/>chrome.browserless.io]
        Inngest[Inngest cloud]
        Clerk[Clerk auth]
        Resend[Resend email]
        Voyage[Voyage AI<br/>voyage-3-lite]
        Axiom[Axiom logs]
    end

    Crawl --> Browserless
    Cost --> Anthropic
    Orchestrator --> Anthropic
    InngestLib --> Inngest
    Auth --> Clerk
    Email --> Resend
    Embed --> Voyage
    Logger --> Axiom
```

---

## 2. Multi-tenant data model

Every domain row carries `org_id` from row 1. Every cross-cutting telemetry row also carries `product_id` and `run_id` so rollups don't need joins.

```
organizations               (tenant root)
  └─ users                  (Clerk-mirrored)
      └─ organization_members (join table, role)
  └─ products               (one per org, slug unique within org)
      ├─ embedding vector(1024)        # for similarity search
      ├─ last_audit_at / last_audit_score / cost_to_date_usd
      └─ workspaces                    # saved configs reusable across runs
          └─ workspace_runs            # auto/guided/manual sessions
              └─ run_steps             # per-step results
                  └─ embedding vector(1024)

  └─ cost_events            # every Claude call: org_id + product_id + run_id
  └─ clearance_checks       # every clearance result + decision + score
  └─ audit_log              # governance trail: actor + action_type + severity
  └─ user_sessions          # Clerk session attribution
```

**Indexes** (defined in `supabase/migrations/0001_initial.sql`):
- `(org_id)` on every domain table — primary scoping filter
- `(org_id, status)` on products — fast portfolio dashboard reads
- `(org_id, created_at desc)` on workspace_runs / cost_events / audit_log — recent-activity queries
- `pg_trgm` GIN index on `products.name` — substring search
- `ivfflat` cosine index on every `embedding` column — vector similarity

**RLS:** enabled on every table, no policies yet. The API server uses the `service_role` key which bypasses RLS by design. When Clerk auth lands on the UI side, RLS policies referencing `auth.jwt() ->> 'org_id'` will activate to lock browser-direct access.

**Today's reality:** until `SUPABASE_URL` is set, the same shape lives in module-memory ring buffers in `/api/_lib/{products,cost,auditlog,configRegistry}.js`. Same `org_id` scoping logic; same row shape; same indexable fields. The `db.js` abstraction switches transparently when the env var lands.

---

## 3. FlowAI internal vs VEUaaS commercial

```
┌──────────────────────────────────────────────────────────────────┐
│                     FlowAI (today)                               │
│  ─────────────────────────────────────────────────────────────   │
│  Internal ops platform for VEU AI Studio.                        │
│  Single org (org_id='veu-ai-studio') — five flagship products.   │
│  Operators are VEU staff.                                        │
│  Auth: anonymous + x-flowai-org-id header (passthrough).         │
│  Goal: govern + audit + clear our own portfolio.                 │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │  same codebase, same /api/* surface
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     VEUaaS (future commercial)                   │
│  ─────────────────────────────────────────────────────────────   │
│  Multi-tenant SaaS sold to other portfolio operators.            │
│  Many orgs (Clerk-managed), many products per org.               │
│  Operators are external customers.                               │
│  Auth: Clerk session required (AUTH_REQUIRED=true).              │
│  Goal: $5B portfolio governance business in 6 years.             │
│  Boundary lifts: rate limits per tenant, billing per tenant,     │
│                  RLS policies enforce per-org isolation.         │
└──────────────────────────────────────────────────────────────────┘
```

**The boundary is a feature flag, not a fork.** Today every endpoint already accepts `org_id` and scopes by it. Today the seed registry sets `org_id='veu-ai-studio'` for every product. Tomorrow we activate Clerk + flip `AUTH_REQUIRED=true` and the same code starts handling multiple orgs.

What changes at the boundary lift:
- `/api/me` returns the Clerk session's org instead of the header.
- RLS policies activate (require migration 0002 — adding policies).
- Stripe-billed plans gate features (added when monetisation lands).
- Public marketing pages for VEUaaS get added on the UI side.

What does NOT change:
- The orchestrator agent registry — same agents serve internal and commercial calls.
- The configuration mode endpoints — clone/synthesize/describe/objectives are product-agnostic by design.
- The cost / audit / clearance telemetry — all already org-scoped.

---

## 4. Where each integration plugs in

| Provider | Role | Plug-in point | Activated by |
|---|---|---|---|
| Anthropic | Text generation (every Claude call) | `_lib/claude.js` → orchestrator `claude` agent | `ANTHROPIC_API_KEY` ✅ live |
| Browserless | Headless browser capture (HTML + screenshots) | `_lib/crawler.js` → orchestrator `browserless` agent | `BROWSERLESS_API_KEY` ✅ live |
| Supabase | Persistence (Postgres + pgvector) | `_lib/supabase.js` ← `_lib/db.js` abstraction | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| Inngest | Background jobs (cron + event-driven) | `_lib/inngest.js` ← `/api/inngest` serve handler | `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` |
| Clerk | Auth + org resolution | `_lib/auth.js` ← `_lib/tenant.js` | `CLERK_SECRET_KEY` + (later) `AUTH_REQUIRED=true` |
| Resend | Transactional email | `_lib/email.js` → `welcomeEmail/runCompleteEmail/clearanceFailedEmail` templates | `RESEND_API_KEY` + `EMAIL_FROM` |
| Voyage AI | Embeddings (1024-dim) | `_lib/embeddings.js` ← used in `synthesize` for input dedup; populates `embedding` columns | `VOYAGE_API_KEY` |
| Axiom | Structured logging | `_lib/logger.js` ← every endpoint via console fallback today | `AXIOM_TOKEN` + `AXIOM_DATASET` |
| Stripe | Billing (PressAI tiers, future per-tenant VEUaaS plans) | NOT YET WIRED — flagged in `RUNBOOK.md` Step 7 | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` |

Adding a new provider is a single file in `/api/_lib/orchestrator/agents/<name>.js` + one line in `_lib/orchestrator.js` to register. The contracts in `_lib/orchestrator/contracts.js` enforce the shape (input validator, output envelope, retry policy, health probe).

---

## 5. Async + poll pattern (orchestrator)

The configuration modes (clone, synthesize, describe) are long-running (30-110s). Vercel serverless idle limits + most client fetch defaults can't hold connections that long. Solution: async + poll.

```
Client                         Vercel /api/orchestrator/run
─────                          ────────────────────────────
POST { agent, payload }
  ────────────────────────────▶
                              createRun(status='queued')      ◀── creates run record
                              metadata._dispatch = {agent,    ◀── stashes payload
                                                    payload}      for pull-resume
  ◀──────────────────────────  202 { run_id, status, polling_url, eta_sec }
                                                              ◀── returns in <1s


GET ?run_id=<id>
  ────────────────────────────▶
                              getRun(id) → status='queued'
                              ┌─ if Inngest enabled, work     ◀── happy path tomorrow
                              │  is already running there
                              │  → return current state
                              │
                              └─ else PULL-RESUME:             ◀── Vercel mitigation today
                                  updateRun(status='running')
                                  await agents.run(            ◀── blocks for full duration
                                    agent, payload)
                                  updateRun(status='completed',
                                            output=...)
  ◀──────────────────────────  200 { status, progress, output, cost_usd }
```

**Why pull-resume:** Vercel kills Node serverless functions after `res.end()`. The unawaited Promise that originally tried to do the work in background gets cut. Mitigation: the polling GET endpoint detects `status='queued'`, atomically transitions to `'running'`, and runs the work synchronously inside that GET request (within `maxDuration: 90s`). First poll thus blocks for the full work duration; subsequent polls return the completed state immediately.

**When Inngest activates,** the POST dispatch fires `flowai/orchestrator.run.requested` → Inngest's worker pool runs the work → Pull-resume becomes a no-op fast-path because the work is already in progress when the first poll arrives. Same client contract; reliability rises.

**Progress reporting:** every step inside the agent calls `setProgress(ctx, { step, percent, partial, etaSec })` which patches the run record's `progress` field. Polls surface this for UI-side progress bars.

---

## 6. Telemetry side-effects per run

Every successful agent run (clone / synthesize / describe / clearance / self-renewal / Auto Runner step) emits the following persistence events through the `configRunner` lifecycle (or equivalent inline lifecycle in step handlers):

```
runStart()          ─→ audit_log: configuration.<mode>.started
                       progress: { step:'started', percent:5 }

runClaude()  (×N)    ─→ cost_events: per Claude call
                       (token usage + USD estimate + cache breakdown)

setProgress()       ─→ runs.progress patch

runComplete()       ─→ audit_log: configuration.<mode>.completed
                       clearance_checks: decision based on quality_score
                         CLEARED (≥70) | CONDITIONAL (30-69) | NOT CLEARED (<30)
                       products: bumps last_audit_at, last_audit_score,
                         cost_to_date_usd
                       progress: { step:'done', percent:100 }

runFail()           ─→ audit_log: configuration.<mode>.failed
                       severity:'warning'
```

This means `/api/governance/dashboard` and `/api/cost-summary` reflect every run automatically — no manual reporting wiring per endpoint.

---

## 7. Source code layout

```
/api/
  test-claude.js              ← v1 simple Claude proxy (unchanged)
  llm-step.js                 ← Auto Runner per-step Claude call
  fetch-url.js                ← Crawler-only (no Claude)
  research-url.js             ← Crawler + Claude research brief
  describe-product.js         ← v1 description enrichment (preceded /configuration/describe)
  audit-product.js            ← Crawler + 4-dim audit
  run-step.js                 ← Auto Runner step dispatcher (sync + async paths)
  propose-step.js             ← Guided mode proposal
  cost-summary.js             ← Cost rollup endpoint
  audit-log.js                ← Audit log read/write endpoint
  products.js                 ← v1 products endpoint (legacy; configuration/products supersedes)
  products/[id].js            ← v1 single-product
  me.js                       ← Auth context
  inngest.js                  ← Inngest serve handler (lazy)
  diagnostic.js               ← Multi-provider health probe
  version.js                  ← Commit + feature flags
  configuration/
    products.js               ← Products list/create/bulk
    products/[idOrSlug].js    ← Single product CRUD
    describe.js               ← Description → spec
    clone.js                  ← URL → snapshot + architecture + plan
    synthesize.js             ← Multi-input → unified spec
    objectives.js             ← Per-product goals/constraints/preferences
    runs.js                   ← Runs index
  orchestrator/
    run.js                    ← POST dispatch + GET status (colocated)
    health.js                 ← Aggregate agent health
    status/[run_id].js        ← Path alias forwarding to /run?run_id=<id>
  governance/dashboard.js     ← KPI rollup
  clearance/run.js            ← Clearance protocol
  self-renewal/check.js       ← Self-renewal cycle
  email/test.js               ← Gated email tester
  admin/seed.js               ← Gated VEU seeder
  _lib/
    claude.js                 ← Anthropic client + CORS + HTML extractor
    crawler.js                ← Browserless chain + screenshot capture
    tenant.js                 ← org_id resolution from header/body/query
    auth.js                   ← Clerk session verification
    db.js                     ← Backend abstraction (memory|supabase)
    supabase.js               ← Lazy Supabase client
    cost.js                   ← Token + USD ring buffer
    auditlog.js               ← In-memory audit log (fallback)
    configRegistry.js         ← In-memory products + objectives + runs + snapshots
    configRunner.js           ← runStart/runClaude/setProgress/runComplete/runFail
    products.js               ← Legacy in-memory products (kept for back-compat)
    stepPrompts.js            ← Auto Runner per-step prompt builders
    inngest.js                ← Lazy Inngest client + functions
    email.js                  ← Lazy Resend client + branded templates
    embeddings.js             ← Lazy Voyage AI client + cosine helpers
    logger.js                 ← Lazy Axiom client + console fallback
    orchestrator.js           ← ensureAgentsRegistered + entry
    orchestrator/
      contracts.js            ← Validators + envelopes + ErrorCodes
      registry.js             ← Map-backed registry + retry/backoff/health
      agents/
        claude.js             ← Anthropic agent
        crawler.js            ← Browserless agent
        supabase.js           ← Supabase generic CRUD agent
        inngest.js            ← Inngest dispatch agent
        clerk.js              ← Clerk session agent
        resend.js             ← Resend email agent
        voyage.js             ← Voyage embeddings agent
        axiom.js              ← Axiom logger agent
        base44.js             ← Base44 proxy agent (future server-side)
        replit.js             ← Legacy Replit Playwright proxy
        vercel.js             ← Vercel runtime metadata
        playwright.js         ← Self-hosted Playwright endpoint
        configuration.js      ← clone/synthesize/describe agents (call execute() pure fns)
    jobs/
      runStep.js              ← Auto Runner step body (used by inline + Inngest)
      scheduledClearance.js   ← Cron-driven clearance body
      costRollup.js           ← Daily cost rollup body
      orchestratorRun.js      ← Inngest event handler for /orchestrator/run

/supabase/
  migrations/0001_initial.sql ← Multi-tenant schema (11 tables, RLS scaffolded)

/docs/
  ARCHITECTURE.md             ← (this file)
  API_SCHEMAS.md              ← Endpoint contracts as TypeScript types
  RUNBOOK.md                  ← Morning checklist + troubleshooting tree
  ENV_VARS.md                 ← Every env var grouped by integration
  CLONE_SYNTHESIZE_AUDIT.md   ← Pre-migration discovery audit
  VEU_PORTFOLIO_HEALTH_*.md   ← Captured baselines

/tests/
  smoke/
    api-health.test.js        ← Production endpoint smoke tests
    orchestrator.test.js      ← Agent registry + dispatch tests

/src/                         ← UI side (Base44 territory — not edited by backend)
```

---

## 8. Pull-quotes for designers and PMs

> **"Multi-tenant from row 1."**
> Every domain table has `org_id` not-null. The seed has org_id='veu-ai-studio' baked in. We're not retrofitting — we're flipping a flag.

> **"Adding a provider is one file."**
> Drop `_lib/orchestrator/agents/<name>.js` implementing `{ isEnabled, validate, run, retry, health }`. Register in `_lib/orchestrator.js`. Done. Cost tracking, retry policy, contract enforcement, health probe — all reused.

> **"Async + poll today scales to Inngest tomorrow."**
> Same client contract. Same response shapes. The mitigation (pull-resume) becomes a no-op fast-path when Inngest activates. Zero UI-side change.

> **"FlowAI internal and VEUaaS commercial are the same codebase."**
> The `AUTH_REQUIRED` env var is the boundary. Until then we operate as a single-org tool against our own portfolio; after, we serve external orgs on the same /api surface.
