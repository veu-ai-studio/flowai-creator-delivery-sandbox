# FlowAI Runbook — Morning Activation Checklist

This runbook is the step-by-step sequence for tomorrow's first credential-activation session and ongoing operator review. Follow in order. Each step has a verification command — don't move to the next until the current one passes.

---

## 0. Sanity check (do this first, every morning)

```bash
# Confirm latest commit is live
curl -s https://flowai-dun.vercel.app/api/version | jq '{ commit, env, featureFlags }'

# Probe every provider in parallel
curl -s https://flowai-dun.vercel.app/api/diagnostic | jq '{ ok, summary, providers }'
```

Expected before any keys land today:
```
ok: true
summary: { activeCount: 2, failingCount: 0, inactiveCount: 6 }
providers.anthropic.ok: true
providers.browserless.ok: true
(everything else: configured: false)
```

If `ok: false`, something that was working broke. Stop and triage before activating new providers.

---

## 1. Order of operations for credential activation

Activate in this order. Each activation is verifiable independently — don't bundle.

### Step 1 — Supabase (persistence layer)

**Why first:** every other integration writes data through `db.js`. With Supabase off, runs reset on cold start. Once on, products / runs / cost_events / audit_log / clearance_checks all become durable across instances and deploys.

| Step | Action |
|---|---|
| 1.1 | Create Supabase project at https://supabase.com → Dashboard → New Project. Use a name like `flowai-veu-prod`. |
| 1.2 | Apply schema: copy `supabase/migrations/0001_initial.sql` into Supabase SQL Editor → Run. |
| 1.3 | Copy values from Project Settings → API: `Project URL` and `service_role` key (under "Project API keys" → click "Reveal"). |
| 1.4 | In Vercel → Settings → Environment Variables (Production AND Preview), add: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. |
| 1.5 | Optional: also add `DB_BACKEND=supabase` to force the backend (default is auto-detect, so this is belt-and-suspenders). |
| 1.6 | Redeploy Vercel (push an empty commit OR trigger via dashboard). Env vars only apply to deploys built after they're set. |
| 1.7 | **Verify:** `curl /api/diagnostic | jq .providers.supabase` → `{ ok: true, configured: true, backend: "supabase" }`. |
| 1.8 | **Verify backend flipped:** `curl /api/version | jq .featureFlags.dbBackend` → `"supabase"`. |
| 1.9 | Set `ADMIN_SEED_KEY` env var (any random 32-char string), then seed: `curl -X POST https://flowai-dun.vercel.app/api/admin/seed -H "x-flowai-admin-key: $ADMIN_SEED_KEY"`. Expect 5 products created. |

### Step 2 — Inngest (background jobs)

**Why second:** with Supabase on, queued runs are durable. Inngest replaces the pull-resume mitigation with proper async dispatch.

| Step | Action |
|---|---|
| 2.1 | Sign up at https://inngest.com if needed. Create app named `flowai`. |
| 2.2 | Apps → flowai → Endpoints → add `https://flowai-dun.vercel.app/api/inngest` and sync. |
| 2.3 | Apps → flowai → Event Keys → copy the production key. |
| 2.4 | Apps → flowai → Settings → copy the Signing Key. |
| 2.5 | In Vercel env, add: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`. |
| 2.6 | Redeploy. |
| 2.7 | **Verify:** `curl /api/diagnostic | jq .providers.inngest` → `{ ok: true, configured: true, backend: "auto" }`. |
| 2.8 | **Verify dispatch:** POST to `/api/orchestrator/run` with `{ agent: "describe", payload: { description: "test" } }`. Response should include `backend: "inngest"`. Inngest dashboard should show the event. |

### Step 3 — Clerk (multi-tenant auth)

**Why third:** until Clerk is on, every request is anonymous + scoped by `x-flowai-org-id` header. Once Clerk is on, the UI side gets real session-based org scoping. Backend supports both modes.

| Step | Action |
|---|---|
| 3.1 | Sign up at https://clerk.com. Create application `FlowAI`. Enable Organisations feature. |
| 3.2 | API Keys → copy the `Secret Key` (sk_live_...). |
| 3.3 | In Vercel env, add: `CLERK_SECRET_KEY`. |
| 3.4 | Generate a random 32+ char string for `FLOWAI_SERVICE_KEY` — used for service-to-service calls (Inngest cron, etc.). |
| 3.5 | **Don't yet set `AUTH_REQUIRED=true`** until the UI side has Clerk's frontend wired. Backend stays in passthrough mode meanwhile. |
| 3.6 | Redeploy. |
| 3.7 | **Verify:** `curl /api/me` → `{ authenticated: false, authMode: "anonymous", config: { clerkConfigured: true } }`. |
| 3.8 | When ready: flip `AUTH_REQUIRED=true`. Anonymous calls now return 401 unless they pass `x-flowai-service-key`. |

### Step 4 — Resend (transactional email)

| Step | Action |
|---|---|
| 4.1 | Sign up at https://resend.com. Add and verify a sending domain (e.g. `veu.ai`). DNS records propagate ~10-60 min. |
| 4.2 | API Keys → create `flowai-prod` key. |
| 4.3 | In Vercel env, add: `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `FlowAI <hello@veu.ai>`). |
| 4.4 | Redeploy. |
| 4.5 | **Verify:** `curl /api/diagnostic | jq .providers.resend` → `{ ok: true, configured: true }`. |
| 4.6 | Set `EMAIL_TEST_ENABLED=true` temporarily, then test each template: `curl -X POST /api/email/test -H "x-flowai-admin-key: ..." -d '{"template":"welcome","to":"<your email>","user":{"full_name":"Test","email":"<your email>"}}'`. Confirm receipt. Repeat for `runComplete` and `clearanceFailed`. |
| 4.7 | Unset `EMAIL_TEST_ENABLED` (or leave for ongoing verification). |

### Step 5 — Voyage AI (embeddings)

| Step | Action |
|---|---|
| 5.1 | Sign up at https://www.voyageai.com. API Keys → create `flowai-prod`. |
| 5.2 | In Vercel env, add: `VOYAGE_API_KEY`. Optional `VOYAGE_MODEL` override (default `voyage-3-lite`, 1024 dims). |
| 5.3 | Redeploy. |
| 5.4 | **Verify:** `curl /api/diagnostic | jq .providers.voyage` → `{ ok: true, configured: true, embeddingDim: 1024 }`. |
| 5.5 | Run a test synthesis: it should now use embeddings for dedup. Look at the `embeddings` field in the `/api/configuration/synthesize` response. |

### Step 6 — Axiom (logging)

| Step | Action |
|---|---|
| 6.1 | Sign up at https://axiom.co. Create dataset `flowai-prod` (and `flowai-preview` if you want separate logs for previews). |
| 6.2 | Settings → API Tokens → create `flowai-ingest` with `Ingest` permission only. |
| 6.3 | In Vercel env, add: `AXIOM_TOKEN`, `AXIOM_DATASET=flowai-prod`. Optional `LOG_LEVEL=info`. |
| 6.4 | Redeploy. |
| 6.5 | **Verify:** `curl /api/diagnostic | jq .providers.axiom` → `{ ok: true, configured: true }`. |
| 6.6 | Hit any /api endpoint, then go to Axiom Console → Streams → flowai-prod. Should see structured log lines with `orgId`, `productId`, `runId`, `endpoint`, `durationMs`, `costUSD`. |

### Step 7 — Stripe (PressAI billing — optional this week)

PressAI's pricing tiers (Creator $29/mo, Professional $99/mo, Enterprise) need real billing eventually. Backend doesn't yet have Stripe wiring — flag this for whichever week monetisation activates. Order:

1. Stripe → Products → create the three tiers with annual + monthly variants.
2. Webhook → point at `/api/billing/stripe-webhook` (TBD endpoint — implement when needed).
3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel.

Until then, the existing PressAI UI's "Start Creator" / "Start Professional" CTAs route to a sign-up flow that captures intent without taking payment.

---

## 2. Top 5 likely failure modes and fixes

### Failure 1 — `FUNCTION_INVOCATION_FAILED` on a specific endpoint

**Symptom:** Single endpoint returns 500 with `FUNCTION_INVOCATION_FAILED`. Other endpoints fine.
**Likely cause:** Module-level code is throwing on cold start. Common culprits: import path wrong, JSON import assertion syntax, top-level await against an unconfigured service.
**Fix:** Vercel dashboard → Deployments → latest → Functions → click the failing function → Runtime Logs. Look for stack trace at instance startup. Pattern: lazy-load any external SDK that uses module-init constructors (we did this for Inngest, Voyage, Resend, Axiom — see `_lib/inngest.js`, `_lib/embeddings.js`, `_lib/email.js`, `_lib/logger.js`).

### Failure 2 — `503 Service Unavailable` on `/api/diagnostic`

**Symptom:** Diagnostic returns `ok: false, summary.failingCount > 0`.
**Likely cause:** A configured provider has a bad key, expired key, or reachability issue.
**Fix:** Read `providers.<name>.reason` for the specific failure. Common cases:
- **Anthropic** — check ANTHROPIC_API_KEY rotation in Anthropic Console; key may be revoked.
- **Browserless** — likely out of session minutes; check usage at chrome.browserless.io/account.
- **Supabase** — RLS policy may be blocking the service role somehow; verify via SQL editor that `select count(*) from organizations` works for service role.

### Failure 3 — Run stays at `status: queued` indefinitely

**Symptom:** `POST /api/orchestrator/run` returns 202 + run_id. `GET /api/orchestrator/run?run_id=<id>` returns `status: queued` forever.
**Likely cause (if Inngest off):** The poll is hitting a different Vercel function instance than the one that holds the run record (in-memory storage limitation). Pull-resume should kick in on the first poll that DOES hit the right instance.
**Fix:** Activate Supabase (Step 1) — runs become durable across instances. Until then, retry the same `run_id` poll a few times; Vercel's instance affinity is decent for repeated calls.
**Likely cause (if Inngest on):** Inngest event didn't publish or signing key mismatch. Check Inngest dashboard → Events for receipt. Run logs in Inngest dashboard → Functions → orchestrator-run-executor.

### Failure 4 — Browserless captures fail with `ERR_NAME_NOT_RESOLVED`

**Symptom:** `/api/configuration/clone` returns `Capture failed: All crawl methods failed` → `Browserless 500: ERR_NAME_NOT_RESOLVED`.
**Likely cause:** Domain doesn't resolve in DNS (registry has stale URL), OR target site is blocking Browserless's IP range.
**Fix:**
1. Confirm the URL resolves: `dig <domain>`.
2. If yes, target may have UA-based bot blocking. Try setting a custom UA in `crawler.js` viaBrowserless options.
3. If no, update the product's `live_url` in the registry.

### Failure 5 — Cost is higher than expected

**Symptom:** `/api/cost-summary` shows $X but you're seeing 5X on Anthropic Console.
**Likely cause:** Cache reads/writes have different pricing (cache writes +25%, reads -90%) — `cost.js` accounts for this but only when usage breakdown is in the response. Some providers may not return cache breakdown.
**Fix:** Use Anthropic Console → Usage → Logs as source of truth. Our cost is an estimate; Anthropic's billing is canonical.

---

## 3. "If X is broken, check Y" troubleshooting tree

```
flowai-dun.vercel.app returns 500 on every endpoint
├─ Vercel Deployments tab — is latest deploy in `Ready` state?
│  ├─ No → Build failed. Check build logs.
│  └─ Yes → Check Functions → Runtime Logs for module-init errors.
└─ Try /api/test-claude (oldest, simplest endpoint). If that fails too,
   it's infrastructure, not code.

flowai-dun.vercel.app SPA loads but routes 404
├─ vercel.json rewrites missing — check `git show HEAD:vercel.json`
└─ Missing the SPA fallback rule: `{"source":"/((?!api/).*)","destination":"/index.html"}`

/api/configuration/clone returns "All crawl methods failed"
├─ /api/diagnostic | jq .providers.browserless → ok?
│  ├─ No → see Failure 2 / 5 above.
│  └─ Yes → Domain DNS issue. Try a different URL.

/api/orchestrator/run returns 200 but no work happens
├─ /api/orchestrator/health | jq .agents.<name>.enabled
│  ├─ false → AGENT_DISABLED. Provider env var missing.
│  └─ true → Pull-resume isn't triggering. POST another GET poll on the run_id;
│             the GET drives the work synchronously when Inngest is off.

UI shows products but they're not the seeded VEU 5
├─ /api/configuration/products?format=array | length == 5?
│  ├─ No → Run /api/admin/seed.
│  └─ Yes but UI shows different → UI may be calling /api/products (legacy)
│     instead of /api/configuration/products. Check Base44 mirror status.

Cost climbing fast / unexpected charges
├─ /api/cost-summary | jq .summary
│  ├─ Look at perEndpoint — which endpoint is dominant?
│  └─ Look at perModel — is opus-4-7 being used unintentionally?
└─ Anthropic Console → Usage → match against /api/cost-summary by hour.

Tests failing (npm run test:smoke)
├─ Are smoke tests hitting prod? FLOWAI_BASE_URL env var.
├─ Is the latest deploy live? /api/version | jq .commit must match HEAD.
└─ Cold start flake — re-run; vitest config uses pool=forks for serial runs.
```

---

## 4. End-of-day operator checklist

```bash
# 1. What ran today, by org
curl -s "https://flowai-dun.vercel.app/api/audit-log?orgId=veu-ai-studio&limit=200" | jq '.entries | length'

# 2. Total spend today
curl -s "https://flowai-dun.vercel.app/api/cost-summary?orgId=veu-ai-studio" | jq '.summary'

# 3. Any clearance failures today?
curl -s "https://flowai-dun.vercel.app/api/governance/dashboard?orgId=veu-ai-studio" | jq '.clearance'

# 4. Health check
curl -s https://flowai-dun.vercel.app/api/diagnostic | jq '.summary'
```

If `failingCount > 0` at end of day, page on-call — auto-paging via Resend
becomes possible once Resend is activated and the Self-Renewal cron is wired.
