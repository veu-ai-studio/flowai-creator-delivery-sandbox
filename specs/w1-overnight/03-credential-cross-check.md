# 03 — Credential inventory cross-check

Date: 2026-05-07

## 1. Inventory source

| Source | Status |
|---|---|
| `specs/w1-credentials/credential-inventory.md` | **MISSING** — directory does not exist |
| `specs/w1-credentials/*` (any file) | **MISSING** |
| `docs/w1-credentials*` | **MISSING** |
| Reference to `/specs/w1-credentials/credential-inventory.md` | Present in `src/docs/w2/v3-defect-register.md:104` |
| De facto inventory in repo | `docs/ENV_VARS.md` (196 lines, 30 entries grouped by integration) |

This report uses `docs/ENV_VARS.md` as the inventory of record because the canonical W1 spec is absent. References in §3 and §4 are based on `docs/ENV_VARS.md`.

## 2. Methodology

For every entry in `docs/ENV_VARS.md`, search the repo for `process.env.<NAME>`, `Deno.env.get('<NAME>')`, `import.meta.env.<NAME>`, and bare-name string occurrences. Conversely, for every credential-shaped name found in the Job 1 inventory, check whether `docs/ENV_VARS.md` lists it.

## 3. Inventoried credentials — referenced or not?

29 of 30 inventory entries have at least one code reference. The single un-referenced entry is owned externally per the doc.

| Inventory entry (`docs/ENV_VARS.md`) | Referenced in code? | Representative location |
|---|---|---|
| `ANTHROPIC_API_KEY` | YES | `api/_lib/claude.js:32`, `api/_lib/superCustomerAgent.js:534`, `api/_lib/orchestrator/agents/{claude,configuration}.js`, `api/test-claude.js:48`, `api/diagnostic.js:32`, `base44/functions/orchestrate/entry.ts:3` |
| `BROWSERLESS_API_KEY` | YES | `api/_lib/crawler.js:83, 269, 365`, `api/_lib/superCustomerAgent.js:534`, `api/_lib/orchestrator/agents/crawler.js:17`, `api/diagnostic.js:61` |
| `VITE_BASE44_APP_BASE_URL` | YES | `src/lib/app-params.js:47`, `.env:1` |
| `SUPABASE_URL` | YES | `api/_lib/supabase.js:19, 26` |
| `SUPABASE_SERVICE_ROLE_KEY` | YES | `api/_lib/supabase.js:19, 27` |
| `DB_BACKEND` | YES | `api/_lib/db.js:23`, `api/diagnostic.js:202` |
| `INNGEST_EVENT_KEY` | YES | `api/_lib/inngest.js:33, 42`, `api/_lib/orchestrator/agents/inngest.js:22`, `api/diagnostic.js:96` |
| `INNGEST_SIGNING_KEY` | YES | `api/_lib/inngest.js:33, 152`, `api/_lib/orchestrator/agents/inngest.js:23`, `api/diagnostic.js:97` |
| `INNGEST_BACKEND` | YES | `api/_lib/inngest.js:32`, `api/_lib/orchestrator/agents/inngest.js:24`, `api/diagnostic.js:98, 201`, `api/version.js:92` |
| `CLERK_SECRET_KEY` | YES | `api/_lib/auth.js:39, 44, 59`, `api/diagnostic.js:107` |
| `AUTH_REQUIRED` | YES | `api/_lib/auth.js:55`, `api/diagnostic.js:200` |
| `FLOWAI_SERVICE_KEY` | YES | `api/_lib/auth.js:92`, `api/diagnostic.js:109` |
| `RESEND_API_KEY` | YES | `api/_lib/email.js:22, 26, 36`, `api/diagnostic.js:119` |
| `EMAIL_FROM` | YES | `api/_lib/email.js:143`, `api/diagnostic.js:120` |
| `EMAIL_REPLY_TO` | YES | `api/_lib/email.js:148` |
| `EMAIL_DRY_RUN` | YES | `api/_lib/email.js:134`, `api/diagnostic.js:122, 204`, `api/version.js:94` |
| `EMAIL_TEST_ENABLED` | YES | `api/email/test.js:23`, `api/diagnostic.js:121, 203`, `api/version.js:93` |
| `VOYAGE_API_KEY` | YES | `api/_lib/embeddings.js:26, 30, 40`, `api/diagnostic.js:132` |
| `VOYAGE_MODEL` | YES | `api/_lib/embeddings.js:46, 61, 80`, `api/diagnostic.js:133` |
| `AXIOM_TOKEN` | YES | `api/_lib/logger.js:31, 38, 109`, `api/diagnostic.js:144` |
| `AXIOM_DATASET` | YES | `api/_lib/logger.js:31, 86, 109`, `api/diagnostic.js:145` |
| `LOG_LEVEL` | YES | `api/_lib/logger.js:47`, `api/diagnostic.js:147`, `api/version.js:97` |
| `AXIOM_DRY_RUN` | YES | `api/_lib/logger.js:82`, `api/diagnostic.js:146, 205`, `api/version.js:95` |
| `PLAYWRIGHT_ENDPOINT` | YES | `api/_lib/orchestrator/agents/playwright.js:9, 14`, `api/_lib/orchestrator/agents/crawler.js:18`, `api/_lib/crawler.js:366`, `base44/functions/orchestrate/entry.ts:7` |
| `REPLIT_PROXY_DISABLED` | YES | `api/_lib/orchestrator/agents/replit.js:11, 31`, `api/diagnostic.js:206`, `api/version.js:96` |
| `VITE_BASE44_APP_ID` | YES | `src/lib/app-params.js:43` |
| `VITE_BASE44_FUNCTIONS_VERSION` | YES | `src/lib/app-params.js:46` |
| `BASE44_API_BASE_URL` | YES | `api/_lib/orchestrator/agents/base44.js:12, 19` |
| `BASE44_API_TOKEN` | YES | `api/_lib/orchestrator/agents/base44.js:12, 24` |
| `VITE_CLERK_PUBLISHABLE_KEY` | **NO** | Mentioned only in `docs/ENV_VARS.md:74`. Doc itself notes "owned by Base44 (UI side)". Not read in this repo. |

**Coverage:** 29 / 30 = 96.7% of inventory entries are referenced in code. The single un-referenced entry is intentional (out-of-scope).

## 4. Referenced in code but NOT inventoried

These are gaps — environment variables actively used by code with no entry in `docs/ENV_VARS.md`. Sorted by severity (production blast radius).

| Env var | Severity | Reason missing matters | Touch sites |
|---|---|---|---|
| `OPENAI_API_KEY` | **CRITICAL** | Read by 21 code sites including production endpoints (`src/api/{generate,fix}.js`, `src/REPLIT-ENGINE/index.js`, 13 Base44 functions). If W1 vault rolls without it, every code-generation and orchestration path 500s. | See Job 1 §3 `OPENAI_API_KEY` block |
| `VERCEL_TOKEN` | **CRITICAL** | Required for every deploy. 16 code sites. | See Job 1 §3 `VERCEL_TOKEN` block |
| `ADMIN_SEED_KEY` | **HIGH** | Admin gate for `api/admin/seed.js`, `api/marketplace/{tool-history,admin/rerank}`, `api/leads/capture.js`, `api/compliance/rights-request.js`. Without it the gate code falls through to "no auth set" path and rejects every admin request. | `api/admin/seed.js:145, 148`; `api/marketplace/tool-history/[slug].js:41`; `api/marketplace/admin/rerank.js:17`; `api/leads/capture.js:85`; `api/compliance/rights-request.js:127` |
| `WEBHOOK_SECRET` | **HIGH** | Has hard-coded plaintext fallback `'flowai-webhook-secret'` committed in `src/components/pipeline/WebhookPanel.jsx:8` and as Deno default in `base44/functions/webhookHandler/entry.ts:8`. Until inventoried + provisioned, any external webhook posting will succeed against the literal default. | `base44/functions/webhookHandler/entry.ts:8, 22` |
| `GITHUB_TOKEN` | **MEDIUM** | Required by `base44/functions/syncGitHubIssues/entry.ts:12` — the only consumer. Used only for issue sync. | `base44/functions/syncGitHubIssues/entry.ts:12, 13, 14, 43` |
| `REPLIT_ENDPOINT` | **MEDIUM** | URL (not strictly secret) referenced by `base44/functions/{orchestrate,multiAgent,masterOrchestrator}/entry.ts` and listed in `src/pages/OrgSettings.jsx:30` `KNOWN_CONNECTED`. | See Job 1 §3 `REPLIT_ENDPOINT` block |
| `BASE44_LEGACY_SDK_IMPORTS` | **LOW** | Build-time flag in `vite.config.js:12`. Default false; unlikely to need vault entry, but should be in any "all env vars" inventory. | `vite.config.js:12` |
| `FLOWAI_BASE_URL` | **LOW** | Test-only with default URL fallback. | `tests/smoke/orchestrator.test.js:9`, `tests/smoke/api-health.test.js:11` |
| `VITE_USE_API_BACKEND` | **LOW** | Future flag mentioned only in `src/docs/FLOWAI_BACKEND_WIRING.md:137`. Not yet read by code. Inventory should list it as future. | `src/docs/FLOWAI_BACKEND_WIRING.md:137` |
| Vercel-injected (`VERCEL_ENV`, `VERCEL_REGION`, `VERCEL_URL`, `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_REF`) | **NONE** | Auto-set by Vercel; not user-managed; doesn't belong in inventory. Listing here for completeness only. | `api/diagnostic.js:190–194`, `api/version.js:49–60`, `api/_lib/orchestrator/agents/vercel.js:14–26`, `api/_lib/logger.js:60, 61` |
| `NODE_ENV`, `PORT` | **NONE** | Standard Node env; doesn't belong in inventory. | various |

**Total uninventoried but actively referenced: 9 entries** (excluding Vercel-injected and Node-standard).

## 5. Inventoried but never used

These appear in `docs/ENV_VARS.md` (or other docs treated as inventory) but are never read by code in this repo.

| Env var | Inventory source | Notes |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `docs/ENV_VARS.md:74` | Doc explicitly states "owned by Base44 (UI side)". Either remove from local inventory or annotate "owned externally — not consumed in this repo". |
| `STRIPE_SECRET_KEY` | `docs/RUNBOOK.md:119`, `docs/ARCHITECTURE.md:181` | `docs/ARCHITECTURE.md:181` says "NOT YET WIRED — flagged in `RUNBOOK.md` Step 7". Aspirational entry. |
| `STRIPE_WEBHOOK_SECRET` | `docs/RUNBOOK.md:119`, `docs/ARCHITECTURE.md:181` | Same — aspirational. |

## 6. Cross-check verdict

| Metric | Value |
|---|---|
| Inventory entries (`docs/ENV_VARS.md`) | 30 |
| Inventory entries referenced in code | 29 (96.7%) |
| Inventory entries never referenced | 1 + 2 aspirational Stripe entries from other docs = 3 total dead-inventory items |
| Env vars referenced in code with no inventory entry | 9 (excluding Vercel-injected and Node-standard) |
| Critical / high gaps | 4 — `OPENAI_API_KEY`, `VERCEL_TOKEN`, `ADMIN_SEED_KEY`, `WEBHOOK_SECRET` |
| Inventory completeness for Doppler rollover | **NOT READY** until the 9 uninventoried entries are added or annotated |

**Bottom line:** `docs/ENV_VARS.md` is broadly accurate for what it lists, but it is missing four production-critical secrets (`OPENAI_API_KEY`, `VERCEL_TOKEN`, `ADMIN_SEED_KEY`, `WEBHOOK_SECRET`) that any vault provisioning must include before W1 can flip the production cutover.
