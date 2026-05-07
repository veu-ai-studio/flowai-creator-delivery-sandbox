# 12 — Missing inventory expansion

Date: 2026-05-07

## 1. The problem

Part 1 § Job 3 found 9 environment variables actively read by code that have **no entry** in the canonical inventory at `docs/ENV_VARS.md`. This report names each, attaches concrete file:line evidence, and proposes the section + entry shape they should each take in the canonical inventory.

## 2. The 9 entries (priority-ordered by blast radius)

### 2.1 `OPENAI_API_KEY` — **CRITICAL**

**Read sites (21 lines):**
- `src/api/index.js:19, 20, 28`
- `src/api/health.js:19, 20, 26`
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

**Proposed section:** New Section 0 in `docs/ENV_VARS.md`, "Already set in production — additional", or merged into the existing "Already set in production" list at L17–22.

**Proposed entry:**

```markdown
| `OPENAI_API_KEY` | `src/api/{generate,fix}.js`, `src/REPLIT-ENGINE/index.js`, 13 Base44 functions, orchestration UI | Calls to GPT-4o for code generation, deployment fix flow, multi-agent planning, automated QA, self-audit | Every code-generation, fix, and orchestration path returns 500 with "OPENAI_API_KEY not configured"; UI shows ✗ status |
```

**Category:** Already set in production (live).

### 2.2 `VERCEL_TOKEN` — **CRITICAL**

**Read sites (16 lines):**
- `src/api/index.js:20, 29`
- `src/api/health.js:20, 27`
- `src/REPLIT-ENGINE/index.js:26, 106`
- `src/components/pipeline/OrchestrationConfig.jsx:10` (UI placeholder)
- `src/pages/OrgSettings.jsx:25, 30` (UI placeholder)
- `src/vercel.json:7` (`@vercel_token`)
- `base44/functions/orchestrate/entry.ts:5, 132, 168, 189`
- `base44/functions/multiAgent/entry.ts:9`
- `base44/functions/masterOrchestrator/entry.ts:176, 289`
- `base44/functions/runSingleApp/entry.ts:274`
- `base44/functions/runVerification/entry.ts:472`
- `base44/functions/fixAndRedeploy/entry.ts:101, 210, 219`
- `base44/functions/deployExecutionEngine/entry.ts:227`
- `base44/functions/deployApp/entry.ts:391, 423, 448`

**Proposed section:** "Already set in production" (Section adjacent to OpenAI).

**Proposed entry:**

```markdown
| `VERCEL_TOKEN` | `src/api/*`, `src/REPLIT-ENGINE/index.js`, 7 Base44 functions | Authenticates Vercel deployment API calls (deploy, list, poll) | Every deploy / fix-and-redeploy / deployExecutionEngine flow returns 500 |
```

### 2.3 `ADMIN_SEED_KEY` — **HIGH**

**Read sites (7 lines):**
- `api/admin/seed.js:145, 148`
- `api/marketplace/tool-history/[slug].js:41`
- `api/marketplace/admin/rerank.js:17`
- `api/leads/capture.js:85`
- `api/compliance/rights-request.js:127`
- `tests/leads.test.js:214–229` (test setup/teardown only)

**Proposed section:** New "9. Admin / internal access".

**Proposed entry:**

```markdown
## 9. Admin / internal access

| Var | Required for activation | Purpose | Get it from |
|---|---|---|---|
| `ADMIN_SEED_KEY` | yes | Header gate (`x-flowai-admin-key`) for admin-only endpoints: `POST /api/admin/seed`, `GET /api/leads/capture`, `GET /api/marketplace/tool-history/[slug]`, `POST /api/marketplace/admin/rerank`, `POST /api/compliance/rights-request` | Generate a 32+ char random secret yourself |

**What breaks if missing:** all admin endpoints reject every request with 401 (the gate falls through to "no auth set").
```

### 2.4 `WEBHOOK_SECRET` — **HIGH** (also subject of `11-plaintext-remediation.md`)

**Read sites (2 lines):**
- `base44/functions/webhookHandler/entry.ts:8, 22` (`Deno.env.get('WEBHOOK_SECRET') || 'flowai-webhook-secret'`)
- `src/components/pipeline/WebhookPanel.jsx:8` (literal default — to be removed per Job 11)

**Proposed section:** New "10. External webhook integration".

**Proposed entry:**

```markdown
## 10. External webhook integration

| Var | Required for activation | Purpose | Get it from |
|---|---|---|---|
| `WEBHOOK_SECRET` | yes (no fallback after Job 11 remediation) | Validates `x-webhook-secret` header on inbound webhook requests at `/webhookHandler` (GitHub, Vercel, custom) | Generate via `openssl rand -base64 32`; store in Base44 → Code → Functions → webhookHandler → Environment Variables |

**What breaks if missing:** webhook handler responds 503 "not configured" (after remediation per `11-plaintext-remediation.md`); previously, fell through to a hardcoded literal — that backdoor is closed by Job 11.
```

### 2.5 `GITHUB_TOKEN` — **MEDIUM**

**Read sites (4 lines):** `base44/functions/syncGitHubIssues/entry.ts:12, 13, 14, 43`.

**Proposed section:** "8. Base44 (UI integration boundary)" subsection — but this is a server-side Deno function token, so a new "11. GitHub integration" subsection is cleaner.

**Proposed entry:**

```markdown
## 11. GitHub integration

| Var | Required for activation | Purpose | Get it from |
|---|---|---|---|
| `GITHUB_TOKEN` | yes | Used by `syncGitHubIssues` Base44 function to read issues from VEU repos. Recommended: fine-grained PAT scoped to `repo:read` only | https://github.com/settings/tokens?type=beta |

**What breaks if missing:** `syncGitHubIssues` returns 400 "GITHUB_TOKEN not configured"; no other code path is affected.
```

### 2.6 `REPLIT_ENDPOINT` — **MEDIUM**

**Read sites (4 lines):**
- `base44/functions/orchestrate/entry.ts:6`
- `base44/functions/multiAgent/entry.ts:10`
- `base44/functions/masterOrchestrator/entry.ts:290`
- `src/pages/OrgSettings.jsx:30` (`KNOWN_CONNECTED` listing)

**Proposed section:** "7. Crawler / Browser — extra options" already exists with `PLAYWRIGHT_ENDPOINT` and `REPLIT_PROXY_DISABLED` — add `REPLIT_ENDPOINT` here.

**Proposed entry (insert into existing Section 7 table):**

```markdown
| `REPLIT_ENDPOINT` | optional | URL of self-hosted Replit proxy (`POST /run` returning `{html, output}`); when unset, the relevant Base44 functions skip Replit-side execution |
```

### 2.7 `BASE44_LEGACY_SDK_IMPORTS` — **LOW**

**Read sites (1 line):** `vite.config.js:12`.

**Proposed section:** New "12. Build-time flags".

**Proposed entry:**

```markdown
## 12. Build-time flags

| Var | Required for activation | Purpose |
|---|---|---|
| `BASE44_LEGACY_SDK_IMPORTS` | optional | Set `true` during local dev to enable Base44's legacy-SDK import paths in the Vite plugin. Default: `false`. |
```

### 2.8 `FLOWAI_BASE_URL` — **LOW (test-only)**

**Read sites (2 lines):**
- `tests/smoke/orchestrator.test.js:9`
- `tests/smoke/api-health.test.js:11`

**Proposed section:** "12. Build-time flags" or new "13. Test-time configuration".

**Proposed entry:**

```markdown
## 13. Test-time configuration

| Var | Required for activation | Purpose |
|---|---|---|
| `FLOWAI_BASE_URL` | optional | Override the smoke-test target URL. Default: `https://flowai-dun.vercel.app`. Used by `tests/smoke/orchestrator.test.js` and `tests/smoke/api-health.test.js`. |
```

### 2.9 `VITE_USE_API_BACKEND` — **LOW (future flag)**

**Read sites:** `src/docs/FLOWAI_BACKEND_WIRING.md:137` only — not yet read by code.

**Proposed section:** "8. Base44 (UI integration boundary)" — extend the existing Vite-prefixed table.

**Proposed entry (insert into existing Section 8 table):**

```markdown
| `VITE_USE_API_BACKEND` | optional / future | When the backend sprint delivers `POST /api/configuration/{clone,describe,synthesize}`, the planned `lib/configurationClient.js` will read this flag to decide whether to use the live API or fall back to demo mode. Default: `true`. |
```

## 3. Aspirational entries to clean up (inventoried but unused)

Part 1 §3.4 also flagged 3 entries that are inventoried but never read. Recommend:

| Entry | Action |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Annotate inline in `docs/ENV_VARS.md:74` as "Owned externally by Base44; not consumed in this repo" |
| `STRIPE_SECRET_KEY` | Add to a new "14. Billing (when activated)" section once `10-stripe-status.md` plan is implemented; reference Job 10 by file |
| `STRIPE_WEBHOOK_SECRET` | Same |

## 4. Proposed `docs/ENV_VARS.md` table-of-contents after expansion

Current sections (per existing file):
1. Supabase — persistence
2. Inngest — background jobs
3. Clerk — multi-tenant auth
4. Resend — transactional email
5. Voyage AI — embeddings
6. Axiom — logging + observability
7. Crawler / Browser — extra options
8. Base44 (UI integration boundary)

After Job 12 expansion:
1. Supabase — persistence
2. Inngest — background jobs
3. Clerk — multi-tenant auth
4. Resend — transactional email
5. Voyage AI — embeddings
6. Axiom — logging + observability
7. Crawler / Browser — extra options (extended with `REPLIT_ENDPOINT`)
8. Base44 (UI integration boundary) (extended with `VITE_USE_API_BACKEND`)
9. **Admin / internal access** (NEW — `ADMIN_SEED_KEY`)
10. **External webhook integration** (NEW — `WEBHOOK_SECRET`)
11. **GitHub integration** (NEW — `GITHUB_TOKEN`)
12. **Build-time flags** (NEW — `BASE44_LEGACY_SDK_IMPORTS`)
13. **Test-time configuration** (NEW — `FLOWAI_BASE_URL`)
14. **Billing (when activated)** (NEW — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)

Also: the existing "Already set in production" header (above Section 1, lines 15–22) gains `OPENAI_API_KEY` and `VERCEL_TOKEN` rows.

## 5. Activation checklist update

The current "Activation checklist (tomorrow morning)" block at `docs/ENV_VARS.md:164–193` should grow with:

```
# 7. Service-to-service (cron, Inngest)
FLOWAI_SERVICE_KEY=<32+ char random secret>          # already in checklist
ADMIN_SEED_KEY=<32+ char random secret>              # NEW

# 8. External webhooks (after Job 11 remediation)
WEBHOOK_SECRET=<openssl rand -base64 32>             # NEW

# 9. GitHub integration (only if syncGitHubIssues is needed)
GITHUB_TOKEN=<fine-grained PAT, repo:read scope>     # NEW
```

`OPENAI_API_KEY` and `VERCEL_TOKEN` are already provisioned in production per the live-status row, so they don't appear in the activation checklist (which is for new activations).

## 6. Verdict

| Status | Count |
|---|---|
| Env vars active in code without inventory entry | 9 |
| Critical (production-blocking if rotated) | 4 (`OPENAI_API_KEY`, `VERCEL_TOKEN`, `ADMIN_SEED_KEY`, `WEBHOOK_SECRET`) |
| Medium | 2 (`GITHUB_TOKEN`, `REPLIT_ENDPOINT`) |
| Low | 3 (`BASE44_LEGACY_SDK_IMPORTS`, `FLOWAI_BASE_URL`, `VITE_USE_API_BACKEND`) |
| New `docs/ENV_VARS.md` sections proposed | 6 (sections 9–14) |
| Aspirational entries to annotate as out-of-scope or future | 3 (`VITE_CLERK_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) |
| Net inventory completeness after Part 2 expansion | 30 + 9 + 3 = **42 entries** total |

**Effort estimate:** 30–60 minutes of single-PR documentation work — purely additive markdown to `docs/ENV_VARS.md`. No code changes required for inventory expansion; the code changes are gated by `11-plaintext-remediation.md` and `09-rotation-completeness.md`.
