# 07 — Vendor procurement readiness

Date: 2026-05-07

## 1. Method

Aggregated every external vendor named in:
- The user's brief for this audit
- `specs/w3-overnight/03-vendor-locks.md` (W0-locked vendors)
- `docs/ENV_VARS.md`, `docs/ARCHITECTURE.md`, `docs/RUNBOOK.md`, `docs/MIGRATION_PLAYBOOK.md`
- `src/lib/toolRegistry.js` (61 catalog entries)
- `package.json` dependencies

For each vendor, classified by integration evidence:

- **READY TO PROCURE** — clear use case, env-var contract defined, downstream code scaffolded
- **PARTIAL INTEGRATION SCAFFOLDED** — package installed and/or env var read but not exercised in production code path
- **NO INTEGRATION EVIDENCE** — named in spec/W0 lock list with zero code-side scaffolding
- **NOT YET SPECCED** — referenced in user brief or audit but absent from W1 specs

## 2. W0-locked vendors (per `specs/w3-overnight/03-vendor-locks.md`)

| Vendor | W0-locked | Spec presence | env var? | Package? | Code use? | Status |
|---|---|---|---|---|---|---|
| Crunchbase Enterprise | YES | Named in W0 lock list only | NO | NO | NO | **NO INTEGRATION EVIDENCE** |
| Bloomberg Law | YES | Named in W0 lock list only | NO | NO | NO | **NO INTEGRATION EVIDENCE** |
| PostHog | YES | In `toolRegistry.js:77` (Monitoring) | NO | NO | NO | **NO INTEGRATION EVIDENCE** (catalog entry only) |
| Productboard | YES | Named in W0 lock list only | NO | NO | NO | **NO INTEGRATION EVIDENCE** |
| GrowthBook | YES | Named in W0 lock list only | NO | NO | NO | **NO INTEGRATION EVIDENCE** |
| Cube | YES | Named in W0 lock list only | NO | NO | NO | **NO INTEGRATION EVIDENCE** |
| Markify | YES | Named in W0 lock list only | NO | NO | NO | **NO INTEGRATION EVIDENCE** |
| Cloudflare Bot Management | YES | Named in W0 lock list only; mentioned in `selfProtection/entry.ts:64` LLM prompt | NO | NO | NO | **NO INTEGRATION EVIDENCE** |
| Electricity Maps | YES | Named in W0 lock list only | NO | NO | NO | **NO INTEGRATION EVIDENCE** |
| WattTime | YES | Named in W0 lock list only | NO | NO | NO | **NO INTEGRATION EVIDENCE** |
| USPTO direct feed | YES | Named in W0 lock list only | NO | NO | NO | **NO INTEGRATION EVIDENCE** |
| EPO direct feed | YES | Named in W0 lock list only | NO | NO | NO | **NO INTEGRATION EVIDENCE** |
| WIPO direct feed | YES | Named in W0 lock list only | NO | NO | NO | **NO INTEGRATION EVIDENCE** |

**12 / 13 W0-locked vendors are absent from `TOOL_REGISTRY` per `specs/w3-overnight/03-vendor-locks.md:32`. Only PostHog is present, and even it has no env var or runtime client.**

## 3. Live / scaffolded integrations (vendors actually wired)

| Vendor | Spec presence | env var? | Package? | Code use? | Status |
|---|---|---|---|---|---|
| Anthropic | `docs/ENV_VARS.md:19`, `docs/ARCHITECTURE.md:173` | `ANTHROPIC_API_KEY` | NO direct SDK; raw `fetch` to `api.anthropic.com` | `api/_lib/claude.js`, `api/_lib/superCustomerAgent.js`, `api/test-claude.js`, `api/_lib/orchestrator/agents/{claude,configuration}.js`, `api/diagnostic.js` | **READY (LIVE)** |
| Browserless | `docs/ENV_VARS.md:20`, `docs/ARCHITECTURE.md:174` | `BROWSERLESS_API_KEY` | NO direct SDK; raw `fetch` | `api/_lib/crawler.js`, `api/_lib/superCustomerAgent.js`, `api/_lib/orchestrator/agents/crawler.js` | **READY (LIVE)** |
| Vercel (deploy + functions) | implicit | `VERCEL_TOKEN` (16 sites); Vercel-injected metadata | NO | `src/api/*`, `src/REPLIT-ENGINE/*`, `base44/functions/*` | **READY (LIVE)** |
| OpenAI | NOT in `docs/ENV_VARS.md` | `OPENAI_API_KEY` (21 sites) | NO direct SDK; raw `fetch` to `api.openai.com/v1/chat/completions` | `src/api/{generate,fix}.js`, `src/REPLIT-ENGINE/index.js`, 13 `base44/functions/*/entry.ts` | **READY (LIVE) but uninventoried** |
| Base44 SDK (browser) | `docs/ENV_VARS.md:155–158` | `VITE_BASE44_APP_BASE_URL`, `VITE_BASE44_APP_ID`, `VITE_BASE44_FUNCTIONS_VERSION` | `@base44/sdk@^0.8.27`, `@base44/vite-plugin@^1.0.13` | `src/lib/app-params.js` and across UI | **READY (LIVE)** |
| Base44 server-side proxy | `docs/ENV_VARS.md:159–160` | `BASE44_API_BASE_URL`, `BASE44_API_TOKEN` | NO | `api/_lib/orchestrator/agents/base44.js:12, 19, 24` | **PARTIAL** — agent wired; vendor not yet active |
| Supabase | `docs/ENV_VARS.md:31, 32` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `@supabase/supabase-js@^2.105.3` | `api/_lib/supabase.js:19, 26, 27` | **READY TO PROCURE** — vars + package + client present, awaiting prod credentials |
| Inngest | `docs/ENV_VARS.md:50, 51` | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_BACKEND` | `inngest@^4.2.6` | `api/_lib/inngest.js`, `api/_lib/orchestrator/agents/inngest.js`, `api/inngest.js` | **READY TO PROCURE** |
| Clerk | `docs/ENV_VARS.md:69, 74` | `CLERK_SECRET_KEY`, `AUTH_REQUIRED` | `@clerk/clerk-sdk-node@^4.13.23` | `api/_lib/auth.js:39, 44, 59` | **READY TO PROCURE** |
| Resend | `docs/ENV_VARS.md:88, 96, 181` | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_DRY_RUN`, `EMAIL_TEST_ENABLED` | `resend@^6.12.2` | `api/_lib/email.js:22, 26, 36`, `api/email/test.js:23` | **READY TO PROCURE** |
| Voyage AI | `docs/ENV_VARS.md:109, 113, 185` | `VOYAGE_API_KEY`, `VOYAGE_MODEL` | `voyageai@^0.2.1` | `api/_lib/embeddings.js:26, 30, 40` | **READY TO PROCURE** |
| Axiom | `docs/ENV_VARS.md:126, 127, 188` | `AXIOM_TOKEN`, `AXIOM_DATASET`, `LOG_LEVEL`, `AXIOM_DRY_RUN` | `@axiomhq/js@^1.6.0` | `api/_lib/logger.js:31, 38, 109` | **READY TO PROCURE** |
| Playwright (self-hosted browser) | `docs/ENV_VARS.md:145` | `PLAYWRIGHT_ENDPOINT` | `playwright@^1.59.1` | `api/_lib/orchestrator/agents/playwright.js`, `api/_lib/crawler.js:366` | **READY (BROWSERLESS-FIRST FALLBACK)** — endpoint optional |
| GitHub | NOT in `docs/ENV_VARS.md` | `GITHUB_TOKEN` (Deno) | NO | `base44/functions/syncGitHubIssues/entry.ts:12` only | **PARTIAL — UNINVENTORIED** |
| Stripe (PressAI billing + Connect) | `docs/RUNBOOK.md:119`, `docs/ARCHITECTURE.md:181`; Doppler path scheme `STRIPE_CONNECT_<providerId>` in `CredentialAdapter.js:96–104` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (mentioned in docs only) | `@stripe/react-stripe-js@^3.0.0`, `@stripe/stripe-js@^5.2.0` (declared, **never imported**) | UI placeholder `alert()` in `src/pages/Billing.jsx:84-86`, `src/components/gtm/BillingPanel.jsx:66`. CredentialAdapter has `getStripeConnect()` accessor but no Stripe API call | **PARTIAL INTEGRATION SCAFFOLDED** — see `specs/w4-overnight/07-pressai-stripe.md` |
| Doppler (vault) | `src/lib/shared/CredentialAdapter.js:1–25` (docblock spec); `src/docs/w2/v3-defect-register.md:104` (referenced spec MISSING) | NONE — no `DOPPLER_*` env var read | NO `@dopplerhq/*` package | `CredentialAdapter` has injection point only; no concrete client | **NO INTEGRATION EVIDENCE** beyond the consumer-side adapter |

## 4. Vendors named in user brief — readiness map

The user's Job 7 brief listed these specifically. Mapping each:

| Vendor | Status | Notes |
|---|---|---|
| Bloomberg Law | NO INTEGRATION EVIDENCE | W0-locked, no spec, no code |
| Crunchbase | NO INTEGRATION EVIDENCE | W0-locked, no spec, no code |
| Doppler | PARTIAL (consumer-side only) | `CredentialAdapter` accepts a `dopplerClient` but no implementation exists; see `08-doppler-readiness.md` |
| Stripe | PARTIAL INTEGRATION SCAFFOLDED | Packages installed but never imported; `STRIPE_CONNECT_<providerId>` Doppler path defined; no webhook handler. See `10-stripe-integration-status.md` |
| Cloudflare | NO INTEGRATION EVIDENCE | See `04-cloudflare-checklist.md` for full gap analysis |
| Recorded Future | NOT YET SPECCED | Not in W0 lock list, not in `toolRegistry.js`, not in any doc |
| Flashpoint | NOT YET SPECCED | Same |
| ZeroFox | NOT YET SPECCED | Same |
| Markify | NO INTEGRATION EVIDENCE | W0-locked; needed by DMCA flow per `06-dmca-inventory.md` |
| PostHog | NO INTEGRATION EVIDENCE | W0-locked; in registry catalog only |
| Productboard | NO INTEGRATION EVIDENCE | W0-locked; not in catalog |
| GrowthBook | NO INTEGRATION EVIDENCE | W0-locked; not in catalog |
| Cube | NO INTEGRATION EVIDENCE | W0-locked; not in catalog |
| Electricity Maps | NO INTEGRATION EVIDENCE | W0-locked; not in catalog |
| WattTime | NO INTEGRATION EVIDENCE | W0-locked; not in catalog |

## 5. Categorical summary

| Category | Count |
|---|---|
| READY (LIVE in production) | 5 (Anthropic, Browserless, Vercel, OpenAI, Base44 SDK browser) |
| READY TO PROCURE (env var + package + client wired; awaiting credentials) | 6 (Supabase, Inngest, Clerk, Resend, Voyage, Axiom) |
| PARTIAL INTEGRATION SCAFFOLDED | 4 (Stripe, Base44 server-side proxy, Playwright endpoint, GitHub) |
| NO INTEGRATION EVIDENCE (W0-locked but absent from registry/code) | 12 (all W0 locks except PostHog: Crunchbase, Bloomberg, Productboard, GrowthBook, Cube, Markify, Cloudflare, Electricity Maps, WattTime, USPTO, EPO, WIPO; plus Doppler client itself) |
| NOT YET SPECCED (named only in user brief) | 3 (Recorded Future, Flashpoint, ZeroFox) |

## 6. Risk: package declared but never imported

`package.json` declares `@stripe/react-stripe-js@^3.0.0` and `@stripe/stripe-js@^5.2.0`. Grep for `@stripe/` import statements: **0 hits**. The packages add bundle size with no functional payoff. Recommend either:

1. Begin Stripe integration per `specs/w4-overnight/07-pressai-stripe.md` plan, or
2. Remove from `package.json` until billing surface is ready.

## 7. Verdict

**Procurement-ready (6 vendors)** — Supabase, Inngest, Clerk, Resend, Voyage AI, Axiom can be procured today; the contracts are wired in code and only need credentials.

**Procurement-blocked on integration work (4 vendors)** — Stripe, Base44 server-side proxy, Playwright endpoint, GitHub all need additional code work before procurement makes sense.

**Procurement-blocked on spec work (15+ vendors)** — All 12 missing W0-locked vendors plus Doppler, Recorded Future, Flashpoint, ZeroFox need spec authorship and registry entries before procurement can be sequenced.

The bottleneck is W1+W3 spec authorship, not procurement budget.
