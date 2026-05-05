# FlowAI / VEUaaS — Environment Variables

Every external integration is gated by an env var. When the var is missing, the
integration shell either no-ops or falls back to a memory/console path so the
deployment stays green.

## Status legend

- **Set today** — required for the live `flowai-dun.vercel.app` deploy to work
- **Tomorrow** — set when activating that integration; no-op without it
- **Optional** — only needed for specific opt-in features

---

## Already set in production

| Var | Used by | What it does | What breaks if missing |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | `/api/_lib/claude.js`, every Claude endpoint | Calls to Sonnet 4.6 / Opus 4.7 | Every Claude endpoint returns 500 with "ANTHROPIC_API_KEY is not configured" |
| `BROWSERLESS_API_KEY` | `/api/_lib/crawler.js` | Renders JS-heavy SPAs (saigedemo.com etc.) | Crawler degrades to simple HTTP fetch + warns the page may be JS-rendered |
| `VITE_BASE44_APP_BASE_URL` | UI bundle (Base44 SDK) | Base44 SDK initialisation | Base44 calls 500 silently; localStorage fallbacks already in place |

---

## 1. Supabase — persistence

Replaces in-memory ring buffers with multi-tenant Postgres + pgvector.

| Var | Required for activation | Purpose | Get it from |
|---|---|---|---|
| `SUPABASE_URL` | yes | Project URL (`https://<id>.supabase.co`) | Supabase dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Server-only** secret. Bypasses RLS. Never expose to browser. | Same screen as above |
| `DB_BACKEND` | optional | `supabase` to force, `memory` to force in-memory; auto-detect when unset | Defaults to auto |

**Activation:**
1. Apply migration: `supabase db push` against `supabase/migrations/0001_initial.sql`.
2. Set both env vars in Vercel (Production + Preview).
3. Redeploy. `selectedBackend()` flips to `supabase` automatically.

**What breaks if missing:** nothing. `db.js` falls back to in-process memory and the existing `/api/products`, `/api/audit-log`, `/api/cost-summary`, `/api/governance/dashboard`, `/api/clearance/run` endpoints keep working.

---

## 2. Inngest — background jobs

Runs the Auto Runner step executor + scheduled clearance + daily cost rollup off the request path.

| Var | Required for activation | Purpose | Get it from |
|---|---|---|---|
| `INNGEST_EVENT_KEY` | yes | Authenticates `inngest.send()` calls | Inngest Cloud → Apps → flowai → Event Keys |
| `INNGEST_SIGNING_KEY` | yes | Verifies signed requests from Inngest's control plane → `/api/inngest` | Same place as event key |
| `INNGEST_BACKEND` | optional | Set to `inline` to force inline execution even when keys present | Defaults to auto |

**Activation:**
1. Create an Inngest app, point it at `https://flowai-dun.vercel.app/api/inngest`.
2. Set both keys in Vercel.
3. UI → set `async: true` in the `/api/run-step` body to dispatch async (today: still defaults to inline).

**What breaks if missing:** nothing. `isInngestEnabled()` returns false, every endpoint runs inline.

---

## 3. Clerk — multi-tenant auth

Verifies user sessions, resolves `org_id` for every request.

| Var | Required for activation | Purpose | Get it from |
|---|---|---|---|
| `CLERK_SECRET_KEY` | yes | Server-side SDK secret | Clerk dashboard → API Keys |
| `AUTH_REQUIRED` | optional | `true` to enforce 401 on missing auth | Defaults to `false` (anonymous allowed) |
| `FLOWAI_SERVICE_KEY` | optional | Shared secret for service-to-service (cron, Inngest) | Generate a random 32+ char string yourself |

**Activation:**
1. Set `CLERK_SECRET_KEY` (and `VITE_CLERK_PUBLISHABLE_KEY` on the UI side, owned by Base44).
2. Test `/api/me` with a Bearer token → confirm `authenticated:true, orgId:...`.
3. Flip `AUTH_REQUIRED=true` once UI is wired.

**What breaks if missing:** nothing. `getRequestContext()` falls through to anonymous + `x-flowai-org-id` header.

---

## 4. Resend — transactional email

Welcome / run-complete / clearance-failed emails.

| Var | Required for activation | Purpose | Get it from |
|---|---|---|---|
| `RESEND_API_KEY` | yes | Resend API key | Resend dashboard → API Keys |
| `EMAIL_FROM` | yes | Default From (e.g. `FlowAI <hello@veu.ai>`) | Your verified domain in Resend |
| `EMAIL_REPLY_TO` | optional | Default Reply-To | — |
| `EMAIL_DRY_RUN` | optional | `true` to skip sending and just return the envelope | — |
| `EMAIL_TEST_ENABLED` | optional | `true` to enable `/api/email/test` endpoint | Off by default; flip when validating templates |

**Activation:**
1. Verify the sending domain in Resend.
2. Set `RESEND_API_KEY` + `EMAIL_FROM`.
3. Flip `EMAIL_TEST_ENABLED=true`, curl `/api/email/test` with each template.

**What breaks if missing:** nothing. `sendEmail()` returns `{ ok:false, reason:'resend not configured' }` and the request path continues.

---

## 5. Voyage AI — embeddings

Powers semantic search across products, run steps, and clearance decisions.

| Var | Required for activation | Purpose | Get it from |
|---|---|---|---|
| `VOYAGE_API_KEY` | yes | Voyage AI API key | https://www.voyageai.com → API Keys |
| `VOYAGE_MODEL` | optional | Override default model (`voyage-3-lite`, 1024d) | Match the `vector(N)` migration column |

**Activation:**
1. Set `VOYAGE_API_KEY`.
2. Build a backfill job that walks `products` + `run_steps` + `clearance_checks` and populates the `embedding` columns. (TODO: not in this scaffolding pass — surfaces as a follow-up Inngest job.)

**What breaks if missing:** nothing. `embedText()` returns `null`, `similaritySearch()` falls back to substring scoring.

---

## 6. Axiom — logging + observability

Structured logs with multi-tenant fields for governance audit trail.

| Var | Required for activation | Purpose | Get it from |
|---|---|---|---|
| `AXIOM_TOKEN` | yes | Axiom API token | Axiom dashboard → Settings → API Tokens |
| `AXIOM_DATASET` | yes | Dataset name (`flowai-prod`, `flowai-preview`) | Axiom → Datasets |
| `LOG_LEVEL` | optional | `debug` / `info` / `warn` / `error` | Defaults to `info` |
| `AXIOM_DRY_RUN` | optional | `true` to skip transmit, console-only | — |

**Activation:**
1. Create dataset(s) in Axiom — separate per environment is recommended.
2. Set `AXIOM_TOKEN` + `AXIOM_DATASET` in Vercel.
3. Filter on `orgId`, `runId`, `endpoint`, `level` in Axiom UI.

**What breaks if missing:** nothing. Logs still go to Vercel function logs via `console.log`.

---

## 7. Crawler / Browser — extra options

| Var | Required for activation | Purpose |
|---|---|---|
| `BROWSERLESS_API_KEY` | already set | Primary headless browser |
| `PLAYWRIGHT_ENDPOINT` | optional | Self-hosted Playwright fallback (`POST /render` returning `{ html }`) |
| `REPLIT_PROXY_DISABLED` | optional | Set `true` to disable the legacy Replit proxy agent |

---

## 8. Base44 (UI integration boundary)

Owned by the UI side; documented here for completeness.

| Var | Used by | Purpose |
|---|---|---|
| `VITE_BASE44_APP_BASE_URL` | UI bundle | Base44 SDK base URL |
| `VITE_BASE44_APP_ID` | UI bundle | Base44 app id |
| `VITE_BASE44_FUNCTIONS_VERSION` | UI bundle | Base44 functions version |
| `BASE44_API_BASE_URL` | `orchestrator.agents.base44` | Future server-side proxy target |
| `BASE44_API_TOKEN` | `orchestrator.agents.base44` | Future server-side proxy auth |

---

## Activation checklist (tomorrow morning)

In Vercel dashboard → Settings → Environment Variables, add:

```
# 1. Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role>

# 2. Inngest
INNGEST_EVENT_KEY=<event_key>
INNGEST_SIGNING_KEY=<signing_key>

# 3. Clerk
CLERK_SECRET_KEY=sk_live_...

# 4. Resend
RESEND_API_KEY=re_...
EMAIL_FROM=FlowAI <hello@veu.ai>

# 5. Voyage
VOYAGE_API_KEY=pa-...

# 6. Axiom
AXIOM_TOKEN=xat-...
AXIOM_DATASET=flowai-prod

# 7. Service-to-service (cron, Inngest)
FLOWAI_SERVICE_KEY=<32+ char random secret>
```

Then redeploy and curl `/api/orchestrator/health` — every agent should report `enabled:true, health.ok:true`.
