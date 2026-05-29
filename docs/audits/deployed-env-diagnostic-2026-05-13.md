# Deployed FlowAI Vercel Env — Config Diagnostic Audit

**Lineage:** W03 → W5b dispatch executed 2026-05-13. Driven by Panel consultation `addbec3` (6/9 supermajority diagnosis: bottleneck is **deployed-env config gaps**, not missing agent code).

**Author:** W5b (Code window)
**Scope:** Read-only. No production code, Doppler, or Vercel env changes were made.
**Audited commit (local HEAD):** `addbec3` (panel consultation)
**Deployed commit (Vercel prod):** unknown from local repo state alone. The Vercel CLI `vercel inspect <deployment-url>` against the production URL would confirm; CEO can also confirm from the Vercel dashboard. Skip-gap recorded per dispatch.

---

## TL;DR — top findings (ranked, highest leverage first)

1. **ROOT CAUSE OF STEP 1 RESEARCH FAILURE: `ANTHROPIC_API_KEY` is not set in the Vercel production environment.** `vercel env ls production` returned 8 vars (`VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_TOKEN`, `VERCEL_V0_TOKEN`, `OPENROUTER_API_KEY`, `GITHUB_MODELS_PAT`, `DOPPLER_PROJECT`, `DOPPLER_ENVIRONMENT`, `DOPPLER_CONFIG`) — Anthropic is absent. `api/_lib/claude.js:32-35` throws **`'ANTHROPIC_API_KEY is not configured on the server.'`** the moment `callClaude()` is invoked. Every Auto Run / Guided / Manual call to `/api/research-url` therefore returns 500 in ~1 second. This single missing credential blocks **6 of the deployed serverless functions** (`research-url`, `audit-product`, `propose-step`, `run-step`, `llm-step`, `test-claude`, plus `_lib/superCustomerAgent` and `_lib/orchestrator/agents/configuration|claude`).

2. **ROOT CAUSE OF "No products registered yet" / "Complete Setup →": Vite-time `VITE_BASE44_*` env vars are not set in the Vercel build.** `MainDashboard.jsx:55` calls `base44.entities.ProductRegistry.list()`. `src/api/base44Client.js` builds the client from `appParams` which reads `import.meta.env.VITE_BASE44_APP_ID` / `VITE_BASE44_TOKEN` / `VITE_BASE44_FUNCTIONS_VERSION` / `VITE_BASE44_APP_BASE_URL` at build time (`src/lib/app-params.js:43-47`). None of these are in Vercel's env list, so the production bundle ships with `appId=undefined`. The Base44 SDK then has no backend to query → `list()` either errors (caught into `[]` via `.catch(() => [])` at `MainDashboard.jsx:55`) or returns empty. The dashboard renders "No products registered yet" permanently.

3. **LIKELY ROOT CAUSE OF "Guided Run on ourpublishingai.com hangs indefinitely": legacy Replit crawler proxy `https://attached-assets-victor2081new.replit.app` is unreachable from Vercel.** `src/lib/operationsEngine.js:100` defaults `CRAWLER_BASE_URL` to this proxy when no `VITE_CRAWLER_BASE_URL` override exists. `fetchPageContext` and `runCrawl` POST to `${CRAWLER_BASE_URL}/fetch` and `/crawl`. Earlier in this session (Slot 9 dispatch) we confirmed Replit's Cloudflare WAF blocks headless / automation clients. A serverless-function origin lookup from Vercel's edge to a dormant Replit proxy will either ECONNRESET or hang on TLS handshake until the function's wall-clock timeout (~30 s default, longer if Vercel Pro). Pair this with the missing `BROWSERLESS_API_KEY` (no JS-render fallback) and a Guided run sits indefinitely waiting on a dead proxy.

4. **SUBSTRATE GAP: `ToolGateway` is documented in Layer 3 Engineering Spec (L3-1) but has NO IMPLEMENTATION FILE.** `grep -r "class ToolGateway"` across `src/`, `api/`, `scripts/` returns nothing. The spec at `docs/FLOWAI_ENGINEERING_SPEC.md:41-43` declares ToolGateway the single capability-token / single-choke-point audit authority; the `docs/engineering-review/layer3-eng-panel-review-2026-05-11.md:262-263` review confirms "Agents receive no ambient credentials; tools are invoked only through `ToolGateway.execute(toolCall, authorityGrant)`". The class doesn't exist. **Mitigated for now** because all 5 shipped agents are RECOMMEND_ONLY (return envelopes, never mutate), so no agent currently needs ToolGateway to enforce anything. But this means there is **no path today** from a shipped agent's recommendation to an actual side effect — even if the credentials existed, the recommendation→execution wire is missing.

5. **STRUCTURAL FINDING: the 5 shipped agents are NOT WIRED into the Auto Runner / Guided / Manual flows.** Auto Runner's `getOrchestratorBundle()` at `src/pages/AutoRunner.jsx:42-52` explicitly comments "No client-side step-owner registration. Hub.invokeStepOwner('build', ...) will return null until the server-side agent endpoint is wired in." The Build step's `runBuildStepRecommendation` returns null on every Auto Run today. None of `/api/research-url`, `/api/audit-product`, `/api/propose-step`, `/api/run-step` calls into Agent #1-#5. The Panel's Q2 supermajority diagnosis ("deployed-env config gaps") is correct AND incomplete: even after the env vars are set, **shipping agents do not currently fire on real product URLs** because nothing invokes them.

No security exposures (credentials in client bundles, RLS cross-tenant reads, etc.) were observed during this audit — but RLS itself remains UNPROVISIONED per SSOT refresh (zero `CREATE POLICY` statements on the 24 provisioned tables). Listed here for completeness but **not** the binding constraint on the three observed failures.

---

## Deployment surface

| Field | Value |
|---|---|
| Vercel project name | `truthful-flow-logic-lab` |
| Vercel project ID | `prj_5ekolTZZmKCyorR8mOIVL6qtduji` |
| Org ID | `team_5ETNaLpTdaXrNj3bRhOJG3Jt` (`veu-ai-studio`) |
| Production URL (CEO-walked) | `https://truthful-flow-logic-hohkw7vdm-veu-ai-studio.vercel.app` |
| Git branch driving prod | `flowai-v0.1` (local HEAD) — confirm in Vercel dashboard |
| Deployed commit hash on prod | **unknown from local state** — `vercel inspect <url>` or Vercel dashboard required |
| `vercel.json` config | SPA + `/api/*` passthrough (rewrites only — no env overrides, no headers, no build hooks) |
| Build command | `vite build` (per `package.json` line 8) |
| Framework | Vite + React (no Next.js, no SSR — pure SPA + serverless API at `/api/*`) |
| Doppler project / config | `flowai` / `prd` (per `vercel env ls` showing `DOPPLER_PROJECT/ENVIRONMENT/CONFIG` set as production env vars; `8e20eff..addbec3` history confirms `w1-bypass-doppler-sync.mjs` is the sync script.) |

---

## Environment variable inventory

### Vercel production env (authoritative — from `vercel env ls production`)

8 entries, all `Encrypted`:

| Name | Created | Purpose |
|---|---|---|
| `VERCEL_AUTOMATION_BYPASS_SECRET` | 23 h ago | Bypass deployment protection (W1) |
| `VERCEL_TOKEN` | 1 d ago | Vercel API automation |
| `VERCEL_V0_TOKEN` | 2 d ago | v0 Slot 5 panel reviewer |
| `OPENROUTER_API_KEY` | 2 d ago | OpenRouter Panel reviewers (slots 1-4, 6-10) |
| `GITHUB_MODELS_PAT` | 2 d ago | retained for archived Slot 6/7 fallback (currently unused) |
| `DOPPLER_PROJECT` | 2 d ago | Doppler metadata |
| `DOPPLER_ENVIRONMENT` | 2 d ago | Doppler metadata |
| `DOPPLER_CONFIG` | 2 d ago | Doppler metadata |

Doppler `flowai/prd` was probed in parallel (`doppler secrets --project flowai --config prd --only-names --json`) — list matches exactly. **Vercel = mirror of Doppler. There is no Vercel-only secret.**

### Required-but-missing (HIGH PRIORITY)

Derived from `grep -nE 'process\.env\.[A-Z][A-Z0-9_]+'` across `api/`, `src/`, plus `import.meta.env.VITE_*` for client-bundle build-time vars. Excludes Vercel-auto-populated runtime vars (`VERCEL_ENV`, `VERCEL_URL`, `VERCEL_REGION`, `VERCEL_GIT_COMMIT_*`).

| Env var | Used by | Failure mode if missing |
|---|---|---|
| `ANTHROPIC_API_KEY` | `api/_lib/claude.js:32` (used by `research-url`, `audit-product`, `propose-step`, `run-step`, `llm-step`, `test-claude`, `_lib/superCustomerAgent`, `_lib/orchestrator/agents/{claude,configuration}`) | **Step 1 Research dies in 1 s.** Every endpoint that calls `callClaude()` throws. |
| `BROWSERLESS_API_KEY` | `api/_lib/crawler.js:83`, `api/_lib/superCustomerAgent.js:534`, `api/_lib/orchestrator/agents/crawler.js:17`, `api/_lib/crawler.js:richCapture` | Crawler falls back to simple-fetch — works for static pages, fails on JS-SPA shells. `richCapture` returns `{ok:false, reason:'BROWSERLESS_API_KEY not set'}`. |
| `PLAYWRIGHT_ENDPOINT` | `api/_lib/crawler.js:366`, `api/_lib/orchestrator/agents/playwright.js:9` | Alt JS-render path disabled. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `api/_lib/supabase.js:19,26-27`, `src/lib/agents/orchestrator/adapters/supabaseColdStore.ts:72,75` | All Supabase-backed persistence disabled. ColdStore audit lineage cannot be written. |
| `CLERK_SECRET_KEY` | `api/_lib/auth.js:39-44,59` | Auth disabled. Endpoints expecting `getCurrentUser` fall to anonymous. |
| `FLOWAI_SERVICE_KEY` | `api/_lib/auth.js:92` | Service-to-service auth disabled. |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | `api/_lib/inngest.js:32-33,42,152` | Background-job scheduling disabled. |
| `RESEND_API_KEY` | `api/_lib/email.js:22,26,36` | Transactional email disabled. |
| `VOYAGE_API_KEY` | `api/_lib/embeddings.js:26,30,40` | Embedding generation disabled. |
| `AXIOM_TOKEN`, `AXIOM_DATASET` | `api/_lib/logger.js:31,38,109` | Logging falls to stdout only — no Axiom datapane. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | spec'd in `specs/w1-overnight/10-stripe-status.md` + `specs/w4-overnight/07-pressai-stripe.md` (no `src/` SDK code yet per SSOT refresh "credential path only") | Stripe billing webhook not yet implemented; not blocking today. |
| `BASE44_API_BASE_URL`, `BASE44_API_TOKEN` | `api/_lib/orchestrator/agents/base44.js:12,19,24` | Server-side Base44 proxy disabled. |
| `ADMIN_SEED_KEY` | `api/admin/seed.js:145-148`, `api/compliance/rights-request.js:127`, `api/marketplace/admin/rerank.js:17`, `api/marketplace/tool-history/[slug].js:41`, `api/leads/capture.js:85` | Admin endpoints reject all requests. |
| `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_TEST_ENABLED`, `EMAIL_DRY_RUN` | `api/_lib/email.js`, `api/email/test.js`, `api/diagnostic.js` | Email config defaults to in-code constants. |
| `INNGEST_BACKEND`, `DB_BACKEND`, `AUTH_REQUIRED`, `LOG_LEVEL`, `REPLIT_PROXY_DISABLED`, `CRAWLER_BASE_URL` | various — runtime toggles | Defaults apply. `CRAWLER_BASE_URL` defaults to a dead Replit proxy (see TL;DR #3). |
| **Build-time (VITE_*)** | | |
| `VITE_BASE44_APP_ID`, `VITE_BASE44_TOKEN`, `VITE_BASE44_FUNCTIONS_VERSION`, `VITE_BASE44_APP_BASE_URL` | `src/lib/app-params.js:43-47` → `src/api/base44Client.js:4-14` | base44 SDK client bakes `undefined` into bundle. All `base44.entities.*` calls return empty / error. **Root cause of "No products registered yet"** (TL;DR #2). |
| `VITE_CRAWLER_BASE_URL` | `src/lib/operationsEngine.js:93` | Client-side crawl falls back to dead Replit proxy. |
| `VITE_FLOWAI_FETCH_PROXY_URL` | `src/lib/platform-health/proxy-url.js:24` | Platform health widget can't reach fetch proxy. |
| `VITE_VERCEL_ENV` | `src/lib/security/anti-tamper-gate.ts:75,99,109-111` | Anti-tamper gate falls back to other signals (mitigated by `vite.config.js:11-17` baking `process.env.VERCEL_ENV` into the bundle). |

Quick count: **~30 env vars expected by the codebase**, **5 actual secrets in Vercel** (the other 3 are Doppler metadata). Coverage ratio: ~17%.

### Required-and-present

Of the 5 actual secrets in Vercel/Doppler, the codebase consumes exactly 4:

| Env var | Used by | Note |
|---|---|---|
| `OPENROUTER_API_KEY` | `scripts/lib/peer-review.mjs:readKey()` (PANEL only — not at runtime in the deployed app) | Panel reviewers; not consumed by `/api/*`. |
| `VERCEL_TOKEN` | `scripts/w1-vercel-bypass-setup.mjs`, `src/REPLIT-ENGINE/index.js:25` | Build-time / dev-only. Not consumed by `/api/*`. |
| `VERCEL_V0_TOKEN` | `scripts/lib/peer-review.mjs:callVercelV0Adapter` (PANEL Slot 5) | Panel only. |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | `scripts/w1-bypass-diag-and-verify.mjs` | Build-time / verify-only. Not consumed by `/api/*`. |

**Of the 5 production secrets, ZERO are consumed at deployed runtime by `/api/*` serverless functions.** Everything in Vercel/Doppler today is Panel-reviewer / Vercel-automation / build-time. Nothing the deployed app needs to handle a customer click is present.

### Present-but-unused

`GITHUB_MODELS_PAT` is retained in both Doppler and Vercel but the Panel no longer uses GitHub Models (Slot 6/7 swapped to OpenRouter `mistralai/mistral-large-2411` + `deepseek/deepseek-r1` at commit `32cd109`, archived stub in `scripts/lib/peer-review.mjs:callGithubModelsAdapter`). The dispatch that did the swap explicitly preserved the credential "in case we want to revisit Slot 6/7 later" — intentional, not a defect.

---

## Per-agent external-service map (#1–#5)

| Agent | Owner file | Authority | Calls external services? | Credentials needed | Uses `ToolGateway`? |
|---|---|---|---|---|---|
| #1 Lifecycle Engine | `src/lib/agents/agents/Agent1LifecycleEngine.ts` | `recommend_only` | **No** — pure function over hot/cold/bus stores | none directly | n/a (no impl exists) |
| #2 Code Builder | `src/lib/agents/agents/Agent2CodeBuilder.js` | `recommend_only` | **No** — delegates to consumer-injected `executeBuild` callback; never shells | none directly | n/a |
| #3 Self-Renewal | `src/lib/agents/agents/Agent3SelfRenewal.js` | `recommend_only` | **No** | none directly | n/a |
| #4 Provider Onboarding | `src/lib/agents/agents/Agent4ProviderOnboarding.js` | `recommend_only` | **Indirectly** — queries injected `CredentialAdapter.probe(key)` (which reads Doppler env) | depends on which provider — agent itself just asks `probe()` returns `present`/`expected`/`missing` | n/a |
| #5 End-Customer Intake | `src/lib/agents/agents/Agent5EndCustomerIntake.js` | `recommend_only` | **No** — pure-ish over hot/cold/bus + suspended cache | none directly | n/a |

**All 5 shipped agents are RECOMMEND_ONLY pure functions.** They never call Anthropic, Browserless, Stripe, Supabase, or anything else. They take inputs and return `{recommendation, blockers, confidence, metadata}` envelopes. **Credentials are not the failure point at the agent layer.**

**The failure is upstream**: nothing in the deployed `/api/*` surface or the client AutoRunner flow calls `agent.recommend()` for any of #1-#5. They are present in the bundle but never invoked.

---

## Step 1 Research failure diagnosis

**Chain (client → server → external):**

1. `src/pages/AutoRunner.jsx` clicks "Auto Run"
2. → `runStepKey('research', ...)` inside `operationsEngine.js`
3. → `researchViaApi(url, objective, sessionId)` at `src/lib/operationsEngine.js:183-201`
4. → `POST /api/research-url` (Vercel serverless function at `api/research-url.js`)
5. → `crawl(url, { force })` at `api/research-url.js:19` — tries Browserless (`BROWSERLESS_API_KEY` missing) → Playwright endpoint (`PLAYWRIGHT_ENDPOINT` missing) → simple HTTP fetch (works, returns minimal page text)
6. → `callClaude({ prompt, maxTokens: 1000, complexity: 'routine' })` at `api/research-url.js:64`
7. → `api/_lib/claude.js:32-35`: `const apiKey = process.env.ANTHROPIC_API_KEY; if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured on the server.');`
8. → Throw propagates to `api/research-url.js:84-91` catch block → returns `500 { ok: false, error: 'Claude call failed', details: 'ANTHROPIC_API_KEY is not configured on the server.' }`
9. → `researchViaApi` at `src/lib/operationsEngine.js:195-196` sees `!response.ok` → returns `null`
10. → AutoRunner falls through to `base44.functions.invokeLLM(...)` which is unreachable in deployed env (VITE_BASE44_* not set) → also fails fast
11. → Step 1 reports failure to the UI in ~1 s wall clock

**Direct cause:** `ANTHROPIC_API_KEY` is not in Vercel production env.

**Agent #6 Research (DORMANT) is not on this path.** The deployed Research step does not look for `Agent6Research`. It calls the Vercel serverless function `research-url` directly. So "Agent #6 DORMANT" is true but is **not the root cause of the failure**. Even if Agent #6 were implemented, the failure would still occur — Auto Runner doesn't call agents.

---

## Product registration onboarding diagnosis

**Chain:**

1. `src/pages/MainDashboard.jsx:30-72` on mount, `Promise.all([base44.entities.ProductRegistry.list(...), ...]).catch(() => [])`
2. → `base44Client` at `src/api/base44Client.js:7-14`: `createClient({ appId, token, functionsVersion, serverUrl: '', requiresAuth: false, appBaseUrl })`
3. → `appParams` at `src/lib/app-params.js:42-49` reads `import.meta.env.VITE_BASE44_APP_ID` etc. at **build time**. If not set, `defaultValue` is `undefined`.
4. Vercel build does not have `VITE_BASE44_APP_ID` / `VITE_BASE44_TOKEN` / `VITE_BASE44_FUNCTIONS_VERSION` / `VITE_BASE44_APP_BASE_URL` in its env.
5. → Vite bakes `undefined` into the production bundle at the `import.meta.env.*` expression sites.
6. → `base44Client` instantiates with `appId=undefined` → SDK has no backend to call.
7. → `base44.entities.ProductRegistry.list(...)` throws or returns empty.
8. → `.catch(() => [])` swallows the error to `[]`.
9. → `setPortfolio([])` → UI renders the "No products registered yet" placeholder.

**Direct cause:** `VITE_BASE44_*` env vars are not set in the Vercel build environment.

**"Complete Setup →" target:** Tracing through the project, `localStorage.getItem('flowai_onboarding_complete')` at `MainDashboard.jsx:40` gates the onboarding banner. Click handler navigates to `/onboarding` (see `src/pages/Onboarding.jsx`). That page expects to interact with `base44.entities.*` and `base44.functions.*` — which have the same broken-client problem as the dashboard, so the onboarding flow can't complete either.

**Note:** Agent #5 End-Customer Intake's `recommend()` method handles intake REASONING, not the actual database mutation. Even if it were wired, there's no `ToolGateway` to convert its `recommendation` into a Supabase INSERT.

---

## ToolGateway state

| Tool | Documented in | Implementation file | Credentials needed | Credentials in Vercel/Doppler |
|---|---|---|---|---|
| `ToolGateway` | `docs/FLOWAI_ENGINEERING_SPEC.md:41-43` (L3-1, RESOLVED) | **NONE — class does not exist in `src/`, `api/`, or `scripts/`** | n/a | n/a |
| URL fetcher / crawler | `api/_lib/crawler.js` | exists, but invoked directly (no Gateway wrap) | `BROWSERLESS_API_KEY`, `PLAYWRIGHT_ENDPOINT` | **NEITHER PRESENT** |
| LLM router (Claude) | `api/_lib/claude.js` | exists, invoked directly | `ANTHROPIC_API_KEY` | **NOT PRESENT** |
| OpenRouter LLM router | `scripts/lib/peer-review.mjs` | exists — but used by Panel scripts only, not by deployed `/api/*` runtime | `OPENROUTER_API_KEY` | PRESENT |
| Stripe adapter | spec'd in `specs/w*-overnight/*-stripe*.md` | **NONE — no `src/` SDK code per SSOT refresh** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | NEITHER PRESENT |
| Supabase adapter | `api/_lib/supabase.js`, `src/lib/agents/orchestrator/adapters/supabaseColdStore.ts` | exists, invoked directly | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | **NEITHER PRESENT** |
| Clerk auth | `api/_lib/auth.js` | exists, invoked directly | `CLERK_SECRET_KEY` | **NOT PRESENT** |
| Inngest jobs | `api/_lib/inngest.js` | exists, invoked directly | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | **NEITHER PRESENT** |
| Resend email | `api/_lib/email.js` | exists, invoked directly | `RESEND_API_KEY` | **NOT PRESENT** |
| Voyage embeddings | `api/_lib/embeddings.js` | exists, invoked directly | `VOYAGE_API_KEY` | **NOT PRESENT** |
| Axiom logger | `api/_lib/logger.js` | exists, invoked directly | `AXIOM_TOKEN`, `AXIOM_DATASET` | **NEITHER PRESENT** |
| Base44 SDK (client-side) | `src/api/base44Client.js` | exists, invoked directly | `VITE_BASE44_*` (build-time) | **NONE PRESENT** |
| Base44 SDK (server-side) | `api/_lib/orchestrator/agents/base44.js` | exists, invoked directly | `BASE44_API_BASE_URL`, `BASE44_API_TOKEN` | **NEITHER PRESENT** |

**Tools registered: 13** (counting each external service as one tool).
**Tools with credentials present: 1** (OpenRouter — used by Panel scripts only, not by `/api/*` runtime).
**Tools with credentials present AND consumed by deployed `/api/*` runtime: 0.**

ToolGateway itself, the documented L3-1 audit choke point, **does not exist as code**. The Layer 3 review at `docs/engineering-review/layer3-eng-panel-review-2026-05-11.md:262-263` describes its expected contract; no module satisfies it.

---

## Vercel build config sanity

| Check | Result |
|---|---|
| `vercel.json` framework | none specified (Vercel auto-detects Vite + React) — OK |
| `vercel.json` rewrites | `/api/(.*) → /api/$1` (passthrough) and `/((?!api/).*)→/index.html` (SPA) — OK |
| `vercel.json` headers / functions overrides | none — OK |
| `package.json` build script | `vite build` — OK |
| `package.json` `type: module` | yes — OK for `/api/*.js` ESM serverless |
| Playwright in `dependencies` (not devDependencies) | yes (`^1.59.1` at `package.json:71`) — **bloats serverless bundle, never used at runtime**. Worth moving to devDependencies in a future cleanup. |
| `@base44/sdk` in `dependencies` | yes (`^0.8.27`) — required client-side |
| `@base44/vite-plugin` in `dependencies` | yes (`^1.0.13`) — build-time only; **could move to devDependencies** |
| Doppler-to-Vercel sync script | `scripts/w1-bypass-doppler-sync.mjs` (untracked from git status; W1 dispatch flow). Sync state today: only the 5 secrets + 3 Doppler metadata variables transferred. |
| Anti-tamper gate behavior in deployed env | `vite.config.js:11-17` bakes `process.env.VERCEL_ENV` into the bundle as a string literal at build time. In Vercel prod, this is `'production'`. The gate at `src/lib/security/anti-tamper-gate.ts:69` reads it correctly. — OK |
| Build expected to succeed? | **YES** — no env var is referenced in a way that fails the build. Every consumer of a missing var either throws at runtime (server) or silently bakes `undefined` (client). |

**Build sanity:** PASS for the build itself. **FAIL for runtime usefulness:** the build ships a bundle that can render UI but cannot complete any operation requiring a service credential.

---

## Recommended next remediation dispatches

(One-line briefs. Order = highest leverage first. **None of these are committed.**)

1. **Provision `ANTHROPIC_API_KEY` in Doppler `flowai/prd` and re-run `scripts/w1-bypass-doppler-sync.mjs` so it lands in Vercel.** Single-credential fix that unblocks Step 1 Research, plus `/api/audit-product`, `/api/propose-step`, `/api/run-step`, `/api/llm-step`, `/api/diagnostic`, `/api/version`, and `_lib/superCustomerAgent`. Highest-leverage single change in the audit.

2. **Provision `VITE_BASE44_APP_ID`, `VITE_BASE44_TOKEN`, `VITE_BASE44_FUNCTIONS_VERSION`, `VITE_BASE44_APP_BASE_URL` in Vercel (production env, scoped to `Production`).** These are build-time vars — Vite bakes them into the bundle. Once set, redeploy and base44 SDK can reach the BaaS, fixing "No products registered yet" and unblocking the onboarding flow.

3. **Replace `CRAWLER_BASE_URL` default in `src/lib/operationsEngine.js` with either a working Vercel-hosted crawler endpoint or remove the default entirely (require explicit `VITE_CRAWLER_BASE_URL`).** The current `https://attached-assets-victor2081new.replit.app` default is the likely cause of Guided Run hangs. Provisioning `BROWSERLESS_API_KEY` alongside this is the cleanest fix (server-side crawler works without needing the Replit proxy).

4. **Wire Agent #1 Lifecycle Engine into `/api/run-step` so each Auto Run step transition is validated against charter.** Currently the orchestrator hub is bundled into the browser (`AutoRunner.jsx:42-52`) but `invokeStepOwner` returns null because no step-owner is registered. A small server-side `/api/agent/lifecycle-validate` endpoint that invokes Agent #1's `recommend()` and gates the step would convert the recommend_only envelopes into actual runtime behavior. **Note**: this is a different problem from credentials — solving #1-#3 fixes credentials; this fixes the agent-to-pipeline wiring gap.

5. **Implement `ToolGateway` as a minimal pass-through enforcer in `src/lib/gateway/ToolGateway.js` and route `api/_lib/{claude,crawler,supabase}.js` calls through it.** Even a v0 implementation that just records lineage and enforces `recommend_only ≠ side-effect` invariants closes the L3-1 substrate gap. Without it, there's no canonical home for adding new tools or upgrading authority checks later.

6. **Audit the `api/_lib/*` modules' "missing env var" behaviors for consistency.** Some throw (`claude.js`), some return `null` (`auth.js`), some return `{ok:false}` envelopes (`crawler.js richCapture`). The mixed strategy makes "1-second failure vs hang vs empty result" hard to triage. Establish a single failure-mode contract per the Engineering Spec.

---

## Audit completeness

| Section | Populated | Evidence quality |
|---|---|---|
| TL;DR | Y | High — direct evidence from grep + Vercel CLI + code reads |
| Deployment surface | Y (with one documented gap — deployed commit hash) | High except deployed-commit (requires Vercel dashboard) |
| Env var inventory | Y | High — `vercel env ls` direct + grep across all src/api |
| Per-agent external-service map | Y | High — each agent file read |
| Step 1 Research diagnosis | Y | Very high — full call chain traced through 11 hops |
| Product registration diagnosis | Y | High — VITE_* baked-at-build mechanism confirmed at `src/lib/app-params.js` |
| ToolGateway state | Y | Very high — repository grep confirmed no implementation |
| Vercel build config sanity | Y | High |
| Recommended next remediation dispatches | Y | Recommendations only; W03 to disposition |

No code, env, or canonical-doc changes were made on the basis of this audit.

---

## Open items (forwarded to W03)

- **Disposition #1**: confirm Doppler `flowai/prd` is the canonical secrets store and that `w1-bypass-doppler-sync.mjs` is the sync mechanism. If yes, remediation #1 and #2 land as Doppler writes followed by sync; if no, dispatch a parallel "settle the secrets store of record" decision.
- **Disposition #2**: choose between provisioning credentials for the LEGACY API surface (`/api/research-url` etc.) vs writing the AGENT WIRING (recommendation #4) that obsoletes the legacy surface. Both work; the legacy path is faster to unblock today, the agent wiring is what the v3 trajectory actually requires.
- **Disposition #3**: deployed commit hash on the production URL needs Vercel dashboard confirmation. If the deployed commit predates the Slot 6/7 swap (`32cd109`), some Panel scripts in `/scripts/` may not be on prod — though this is moot because `/scripts/` isn't part of the Vercel build.
- **Security note**: RLS still has zero `CREATE POLICY` statements per SSOT refresh. **Not the binding constraint on the three observed failures**, but remains the top RR1 risk per Layer 2 plan. Any remediation that writes to Supabase before RLS lands risks cross-tenant leakage.
