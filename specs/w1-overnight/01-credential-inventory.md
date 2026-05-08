# 01 — Credential reference inventory

Date: 2026-05-07
Search scope: entire repo, excluding `node_modules/`, `dist/`, `.git/`, `build/` (default Grep behavior + manual exclusion).
Patterns: `process\.env\.<UPPER>`, `import\.meta\.env\.<UPPER>`, `Deno\.env\.get('<UPPER>')`, identifiers ending in `_API_KEY|_SECRET|_TOKEN|_PASSWORD|WEBHOOK_SECRET|CLIENT_ID|CLIENT_SECRET`, plus `getEnv|requireEnv|envOrDefault`.

## 1. Aggregate counts

| Pattern | Files | Hits |
|---|---|---|
| `process.env.<UPPER>` | 43 | 152 |
| `import.meta.env.<UPPER>` | 2 | 4 |
| `Deno.env.get('<UPPER>')` (Base44 functions) | 16 | 28 |
| `_API_KEY` / `_SECRET` / `_TOKEN` / `_PASSWORD` / `WEBHOOK_SECRET` suffix in any context | 54 | 228 |
| `CLIENT_ID` / `CLIENT_SECRET` (anywhere) | 0 | 0 |
| `getEnv()` / `requireEnv()` / `envOrDefault()` helpers | 0 | 0 |
| Doppler-style path literals (`flowai/<env>/<key>`) anywhere as a string | 0 | 0 (paths are constructed in `CredentialAdapter._resolve`, never literal strings) |

Notable absences:
- **No central env-access helper.** Every consumer reads `process.env.<NAME>` (Node side) or `Deno.env.get('<NAME>')` (Base44 side) directly at the use-site. There is no `getEnv()`, `requireEnv()`, or `envOrDefault()` wrapper anywhere in the repo. This makes a search for env vars equivalent to a search for `process.env.*` / `Deno.env.get(*)`.
- **No OAuth flows.** `CLIENT_ID` and `CLIENT_SECRET` return zero matches across the repo. Every external integration uses bearer-style API keys.

## 2. Unique credential / env-var names

### 2.1 Live secrets (in use today, per `docs/ENV_VARS.md`)
- `ANTHROPIC_API_KEY`
- `BROWSERLESS_API_KEY`
- `VITE_BASE44_APP_BASE_URL`

### 2.2 Inventoried but pending activation (per `docs/ENV_VARS.md`)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- `CLERK_SECRET_KEY`, `FLOWAI_SERVICE_KEY`
- `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`
- `VOYAGE_API_KEY`
- `AXIOM_TOKEN`, `AXIOM_DATASET`
- `BASE44_API_BASE_URL`, `BASE44_API_TOKEN`
- `PLAYWRIGHT_ENDPOINT`
- `VITE_BASE44_APP_ID`, `VITE_BASE44_FUNCTIONS_VERSION`

### 2.3 Referenced in code but NOT inventoried in `docs/ENV_VARS.md`
- `OPENAI_API_KEY` — used across `src/api/*`, `src/REPLIT-ENGINE/*`, `base44/functions/*` (13 entry files) and the orchestration UI
- `VERCEL_TOKEN` — same surface
- `ADMIN_SEED_KEY` — admin-gate for `api/admin/seed.js`, marketplace admin, leads, compliance
- `WEBHOOK_SECRET` — `base44/functions/webhookHandler/entry.ts:8` (with hard-coded plaintext default `'flowai-webhook-secret'`)
- `GITHUB_TOKEN` — `base44/functions/syncGitHubIssues/entry.ts:12`
- `REPLIT_ENDPOINT` — base44 orchestration entries, `src/pages/OrgSettings.jsx:30`
- `FLOWAI_BASE_URL` — `tests/smoke/{orchestrator,api-health}.test.js`
- `VITE_USE_API_BACKEND` — referenced only in `src/docs/FLOWAI_BACKEND_WIRING.md:137`

### 2.4 Behaviour flags / config (not secrets)
- Boolean flags: `AUTH_REQUIRED`, `EMAIL_TEST_ENABLED`, `EMAIL_DRY_RUN`, `AXIOM_DRY_RUN`, `REPLIT_PROXY_DISABLED`, `BASE44_LEGACY_SDK_IMPORTS`
- Mode selectors: `DB_BACKEND`, `INNGEST_BACKEND`
- Single-value config: `LOG_LEVEL`, `VOYAGE_MODEL`, `NODE_ENV`, `PORT`

### 2.5 Vercel-injected metadata (read-only, set by Vercel itself)
- `VERCEL_ENV`, `VERCEL_REGION`, `VERCEL_URL`, `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_REF`

### 2.6 Test-fixture / placeholder names (not real credentials)
- `SOME_API_KEY` — fixture in `tests/baseagent.test.js`, `tests/credentialadapter-integration.test.js`, `src/pages/BaseAgentTest.jsx`
- `FALLBACK_KEY`, `LATE_KEY`, `EXPECT`, `HAS`, `GONE` — fixtures in `tests/credentialadapter-integration.test.js`
- `WEBHOOK_SECRET = 'flowai-webhook-secret'` — committed plaintext **default** in `src/components/pipeline/WebhookPanel.jsx:8` and `base44/functions/webhookHandler/entry.ts:8`

## 3. Per-credential evidence (file:line)

### `OPENAI_API_KEY`
- `src/api/index.js:19, 20, 28, 29`
- `src/api/health.js:19, 20, 26, 27`
- `src/api/generate.js:26, 54`
- `src/api/fix.js:26, 49`
- `src/REPLIT-ENGINE/index.js:25, 43, 72, 174, 197`
- `src/components/pipeline/OrchestrationConfig.jsx:8` (UI placeholder)
- `src/pages/OrgSettings.jsx:24, 30` (UI placeholder)
- `src/vercel.json:6` (`@openai_api_key` Vercel secret reference)
- `base44/functions/orchestrate/entry.ts:4`
- `base44/functions/multiAgent/entry.ts:8`
- `base44/functions/masterOrchestrator/entry.ts:288`
- `base44/functions/runSingleApp/entry.ts:273`
- `base44/functions/runVerification/entry.ts:471`
- `base44/functions/portfolioEngine/entry.ts:140`
- `base44/functions/generateCode/entry.ts:396`
- `base44/functions/fixAndRedeploy/entry.ts:100`
- `base44/functions/detectIntent/entry.ts:3`
- `base44/functions/automatedQA/entry.ts:8`
- `base44/functions/selfAudit/entry.ts:156`
- `base44/functions/autonomousEngine/entry.ts:527`
- `base44/functions/deployExecutionEngine/entry.ts:238`

### `VERCEL_TOKEN`
- `src/api/index.js:20, 29`
- `src/api/health.js:20, 27`
- `src/REPLIT-ENGINE/index.js:26, 106`
- `src/components/pipeline/OrchestrationConfig.jsx:10`
- `src/pages/OrgSettings.jsx:25, 30`
- `src/vercel.json:7` (`@vercel_token`)
- `base44/functions/orchestrate/entry.ts:5, 132, 168, 189`
- `base44/functions/multiAgent/entry.ts:9`
- `base44/functions/masterOrchestrator/entry.ts:176, 289`
- `base44/functions/runSingleApp/entry.ts:274`
- `base44/functions/runVerification/entry.ts:472`
- `base44/functions/fixAndRedeploy/entry.ts:101, 210, 219`
- `base44/functions/deployExecutionEngine/entry.ts:227`
- `base44/functions/deployApp/entry.ts:391, 423, 448`

### `ANTHROPIC_API_KEY`
- `api/diagnostic.js:32, 40`
- `api/version.js:81`
- `api/test-claude.js:48`
- `api/_lib/claude.js:32`
- `api/_lib/superCustomerAgent.js:534, 566`
- `api/_lib/orchestrator/agents/configuration.js:21, 42`
- `api/_lib/orchestrator/agents/claude.js:10`
- `base44/functions/orchestrate/entry.ts:3`
- `src/pages/OrgSettings.jsx:22, 30`

### `BROWSERLESS_API_KEY`
- `api/diagnostic.js:61, 66`
- `api/version.js:82`
- `api/_lib/superCustomerAgent.js:534, 565`
- `api/_lib/crawler.js:83, 269, 365`
- `api/_lib/orchestrator/agents/crawler.js:17`

### `CLERK_SECRET_KEY`
- `api/diagnostic.js:107`
- `api/_lib/auth.js:39, 44, 59`

### `FLOWAI_SERVICE_KEY`
- `api/diagnostic.js:109`
- `api/_lib/auth.js:92`

### `RESEND_API_KEY`
- `api/diagnostic.js:119`
- `api/_lib/email.js:22, 26, 36`

### `VOYAGE_API_KEY`
- `api/diagnostic.js:132`
- `api/_lib/embeddings.js:26, 30, 40`

### `AXIOM_TOKEN`
- `api/diagnostic.js:144`
- `api/_lib/logger.js:31, 38, 109`

### `AXIOM_DATASET`
- `api/diagnostic.js:145`
- `api/_lib/logger.js:31, 86, 109`

### `INNGEST_EVENT_KEY`
- `api/diagnostic.js:96`
- `api/_lib/inngest.js:33, 42`
- `api/_lib/orchestrator/agents/inngest.js:22`

### `INNGEST_SIGNING_KEY`
- `api/diagnostic.js:97`
- `api/_lib/inngest.js:33, 152`
- `api/_lib/orchestrator/agents/inngest.js:23`

### `SUPABASE_URL`
- `api/_lib/supabase.js:19, 26`

### `SUPABASE_SERVICE_ROLE_KEY`
- `api/_lib/supabase.js:19, 27`

### `BASE44_API_BASE_URL`
- `api/_lib/orchestrator/agents/base44.js:12, 19`

### `BASE44_API_TOKEN`
- `api/_lib/orchestrator/agents/base44.js:12, 24`

### `PLAYWRIGHT_ENDPOINT`
- `api/_lib/orchestrator/agents/playwright.js:9, 14`
- `api/_lib/orchestrator/agents/crawler.js:18`
- `api/_lib/crawler.js:366`
- `base44/functions/orchestrate/entry.ts:7`
- `src/pages/OrgSettings.jsx:30`

### `ADMIN_SEED_KEY`
- `api/admin/seed.js:145, 148`
- `api/marketplace/tool-history/[slug].js:41`
- `api/marketplace/admin/rerank.js:17`
- `api/leads/capture.js:85`
- `api/compliance/rights-request.js:127`
- `tests/leads.test.js:214–229` (test setup/teardown only)

### `WEBHOOK_SECRET` (NOT inventoried; weak default committed)
- `base44/functions/webhookHandler/entry.ts:8, 22` — `Deno.env.get('WEBHOOK_SECRET') || 'flowai-webhook-secret'`
- `src/components/pipeline/WebhookPanel.jsx:8` — hard-coded plaintext `'flowai-webhook-secret'`, never read from env

### `GITHUB_TOKEN`
- `base44/functions/syncGitHubIssues/entry.ts:12, 13, 14, 43`

### `REPLIT_ENDPOINT`
- `base44/functions/orchestrate/entry.ts:6`
- `base44/functions/multiAgent/entry.ts:10`
- `base44/functions/masterOrchestrator/entry.ts:290`
- `src/pages/OrgSettings.jsx:30` (`KNOWN_CONNECTED` list)

### `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_DRY_RUN`, `EMAIL_TEST_ENABLED`
- `api/_lib/email.js:134, 143, 148`
- `api/email/test.js:23`
- `api/diagnostic.js:120, 121, 122, 203, 204`
- `api/version.js:93, 94`

### `LOG_LEVEL`, `VOYAGE_MODEL`, `INNGEST_BACKEND`, `DB_BACKEND`, `AUTH_REQUIRED`, `REPLIT_PROXY_DISABLED`, `AXIOM_DRY_RUN`, `BASE44_LEGACY_SDK_IMPORTS`
- See aggregated count in §1; representative reads in `api/diagnostic.js`, `api/version.js`, `api/_lib/{auth,db,inngest,email,logger,embeddings,orchestrator/agents/replit}.js`, `vite.config.js:12`

### `VITE_BASE44_APP_BASE_URL` / `VITE_BASE44_APP_ID` / `VITE_BASE44_FUNCTIONS_VERSION`
- `src/lib/app-params.js:43, 46, 47`
- `.env:1` (only `VITE_BASE44_APP_BASE_URL` is committed to local env)

### `VITE_USE_API_BACKEND`
- `src/docs/FLOWAI_BACKEND_WIRING.md:137` (planned flag, not yet read by code)

### `FLOWAI_BASE_URL`
- `tests/smoke/orchestrator.test.js:9`
- `tests/smoke/api-health.test.js:11`

### Vercel-injected (`VERCEL_ENV`, `VERCEL_REGION`, `VERCEL_URL`, `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_REF`)
- `api/diagnostic.js:190–194`
- `api/version.js:49–60`
- `api/_lib/orchestrator/agents/vercel.js:14–26`
- `api/_lib/logger.js:60, 61`

### `PORT` (Node)
- `src/REPLIT-ENGINE/index.js:8`
- `src/deployables/api-server.js:64`
- `base44/functions/{generateCode,deployApp,fixAndRedeploy,runVerification,runSingleApp}/entry.ts` (multiple)

## 4. Patterns and observations

1. **Two distinct credential-consumption shells** — Node-side (`api/_lib/*`, `api/*`, `src/api/*`, `src/REPLIT-ENGINE/*`) reads `process.env.*` directly; Base44 Deno-side (`base44/functions/*/entry.ts`) reads `Deno.env.get('NAME')`. No shared abstraction.
2. **`CredentialAdapter` is structurally complete but unconnected** — `src/lib/shared/CredentialAdapter.js` exists and is exercised by `tests/credentialadapter-integration.test.js` (DI-style with a `StubDoppler`). Zero production endpoints route through it.
3. **No literal Doppler paths in code** — paths like `flowai/prod/PROVIDERS_acme_API_KEY` exist only as test fixtures (`tests/credentialadapter-integration.test.js`), never as string constants in production code.
4. **Hard-coded webhook secret committed** — `'flowai-webhook-secret'` is committed in `src/components/pipeline/WebhookPanel.jsx:8` (UI display) and as a Deno fallback default in `base44/functions/webhookHandler/entry.ts:8`. This is a known-weak credential and must be replaced before any external webhook surface is exposed.
5. **No OAuth surface** — zero `CLIENT_ID` / `CLIENT_SECRET` references; every integration is API-key based.
6. **Vercel `env` block split between root and `src/`** — root `vercel.json` declares **no** env wiring (rewrites + schema only). `src/vercel.json:5–8` declares `OPENAI_API_KEY=@openai_api_key` and `VERCEL_TOKEN=@vercel_token`. Whichever Vercel discovers first determines what is actually wired in production.

## 5. Source-of-truth files

- `docs/ENV_VARS.md` — current "manual paste" inventory (30 entries, ~196 lines)
- `src/lib/shared/CredentialAdapter.js` — Doppler-style adapter and embedded path-spec docblock
- `vercel.json` (root, 7 lines) — rewrites only, no env block
- `src/vercel.json` (68 lines) — declares `OPENAI_API_KEY` and `VERCEL_TOKEN` as `@`-prefixed Vercel secrets
- `.env` (root, 1 line) — local Vite env (`VITE_BASE44_APP_BASE_URL` only); `.env*` is gitignored
