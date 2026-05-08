# 01 — API + pages inventory

**Generated:** 2026-05-07. **Repo:** `truthful-flow-logic-lab` (branch `main`).

Routes are inferred from filesystem (Vercel auto-mounts every `api/**.js`).
Methods come from each handler's `req.method` switch. Sizes in bytes.

---

## `api/` — top-level handlers

| File | Bytes | Methods | Route | Imports |
|---|---|---|---|---|
| `audit-log.js` | 1915 | GET, POST | `/api/audit-log` | `_lib/claude` (CORS), `_lib/db`, `_lib/tenant` |
| `audit-product.js` | 3426 | POST | `/api/audit-product` | `_lib/claude` (`callClaude`), `_lib/crawler`, `_lib/cost` |
| `cost-summary.js` | 2020 | GET, POST | `/api/cost-summary` | `_lib/claude`, `_lib/db`, `_lib/cost`, `_lib/tenant` |
| `describe-product.js` | 2399 | POST | `/api/describe-product` | `_lib/claude`, `_lib/cost` |
| `diagnostic.js` | 8362 | GET | `/api/diagnostic` | `_lib/claude`, `_lib/db`, `_lib/inngest`, `_lib/auth`, `_lib/email`, `_lib/embeddings`, `_lib/logger`, `_lib/supabase`, `_lib/requestLog` |
| `fetch-url.js` | 1127 | POST | `/api/fetch-url` | `_lib/claude`, `_lib/crawler` |
| `inngest.js` | 772 | (Inngest serve) | `/api/inngest` | `_lib/inngest` (lazy serve, body 4mb, maxDuration 60) |
| `llm-step.js` | 1497 | POST | `/api/llm-step` | `_lib/claude`, `_lib/cost` |
| `me.js` | 956 | GET | `/api/me` | `_lib/claude`, `_lib/requestLog`, `_lib/auth` |
| `products.js` | 2118 | GET, POST (`?bulk=1`) | `/api/products` | `_lib/claude`, `_lib/db` |
| `propose-step.js` | 2931 | POST | `/api/propose-step` | `_lib/claude`, `_lib/stepPrompts`, `_lib/cost` |
| `research-url.js` | 2982 | POST | `/api/research-url` | `_lib/claude`, `_lib/crawler`, `_lib/cost` |
| `run-step.js` | 2447 | POST | `/api/run-step` | `_lib/claude`, `_lib/db`, `_lib/inngest` |
| `test-claude.js` | 3641 | POST | `/api/test-claude` | `_lib/claude` |
| `version.js` | 4080 | GET | `/api/version` | `_lib/claude`, `_lib/db`, `_lib/inngest`, `_lib/auth`, `_lib/email`, `_lib/embeddings`, `_lib/logger`, `_lib/supabase`, `_lib/requestLog` |

## `api/auth/` — auth flows

| File | Bytes | Methods | Route | Notes |
|---|---|---|---|---|
| `sign-in.js` | 3083 | POST | `/api/auth/sign-in` | Body `{email,password,product_id,org_id?}`. RL 10/min/IP. Uniform 401 `{ok:false,reason:'invalid_credentials'}`. |
| `sign-up.js` | 3044 | POST | `/api/auth/sign-up` | Body `{email,password,product_id,org_id?,metadata?}`. Min pwd 8. RL 5/min. 409 on dup `(org_id,product_id,email)`. |
| `session.js` | 1773 | GET, DELETE | `/api/auth/session` | Bearer or `?token=`. GET verifies, DELETE revokes. |

## `api/leads/`

| File | Bytes | Methods | Route | Notes |
|---|---|---|---|---|
| `capture.js` | 3919 | POST, GET | `/api/leads/capture` | POST body `{email, product_id, source_page?, org_id?, metadata?}`. RL 8/min. In-memory `LEADS` Map cap 10000. GET admin-gated by `x-flowai-admin-key === ADMIN_SEED_KEY`. **Note:** UI POSTs to `/api/leads` (not `/capture`) → 404. |

## `api/admin/`, `api/clearance/`, `api/compliance/`, `api/email/`, `api/governance/`, `api/products/`, `api/self-renewal/`

| File | Bytes | Methods | Route |
|---|---|---|---|
| `admin/seed.js` | 6968 | POST | `/api/admin/seed` (admin-key-gated) |
| `clearance/run.js` | 3808 | POST | `/api/clearance/run` |
| `compliance/rights-request.js` | 6296 | POST, GET | `/api/compliance/rights-request` |
| `email/test.js` | 1706 | POST | `/api/email/test` |
| `governance/dashboard.js` | 1709 | GET, POST | `/api/governance/dashboard` |
| `products/[id].js` | 1814 | GET, PATCH, DELETE, POST (`?action=audit`) | `/api/products/:id` |
| `self-renewal/check.js` | 2977 | POST | `/api/self-renewal/check` |

## `api/audits/super-customer/`

| File | Bytes | Methods | Route |
|---|---|---|---|
| `run.js` | 6221 | POST + GET (`?run_id=`) | `/api/audits/super-customer/run` |
| `runs.js` | 1789 | GET | `/api/audits/super-customer/runs` |
| `status/[run_id].js` | 1334 | GET | `/api/audits/super-customer/status/:run_id` |
| `results/[run_id].js` | 3378 | GET | `/api/audits/super-customer/results/:run_id` |
| `results/[run_id]/pdf.js` | 10282 | GET | `/api/audits/super-customer/results/:run_id/pdf` |

## `api/configuration/`

| File | Bytes | Methods | Route |
|---|---|---|---|
| `clone.js` | 10311 | POST | `/api/configuration/clone` |
| `describe.js` | 6004 | POST | `/api/configuration/describe` |
| `objectives.js` | 2671 | GET, POST, PATCH, DELETE | `/api/configuration/objectives` |
| `products.js` | 2815 | GET, POST (`?bulk=1`) | `/api/configuration/products` |
| `products/[idOrSlug].js` | 2943 | GET, PUT, PATCH, DELETE, POST (`?action=audit`) | `/api/configuration/products/:idOrSlug` |
| `runs.js` | 1454 | GET | `/api/configuration/runs` |
| `synthesize.js` | 11379 | POST | `/api/configuration/synthesize` |

## `api/marketplace/`

| File | Bytes | Methods | Route |
|---|---|---|---|
| `categories.js` | 1779 | GET | `/api/marketplace/categories` |
| `feedback.js` | 3161 | GET, POST | `/api/marketplace/feedback` |
| `outcomes.js` | 2963 | GET, POST | `/api/marketplace/outcomes` |
| `recommend.js` | 13173 | POST | `/api/marketplace/recommend` |
| `tools.js` | 4030 | GET | `/api/marketplace/tools` |
| `admin/rerank.js` | 1005 | POST | `/api/marketplace/admin/rerank` |
| `recommend/[rec_id]/pdf.js` | 12926 | GET | `/api/marketplace/recommend/:rec_id/pdf` |
| `tool-history/[slug].js` | 4004 | GET | `/api/marketplace/tool-history/:slug` |

## `api/orchestrator/`

| File | Bytes | Methods | Route |
|---|---|---|---|
| `health.js` | 1136 | GET | `/api/orchestrator/health` |
| `run.js` | 9238 | POST + GET (`?run_id=`) | `/api/orchestrator/run` |
| `status/[run_id].js` | 1622 | GET | `/api/orchestrator/status/:run_id` (307 redirect) |

## `api/_lib/` — helpers (not routed)

`auditlog.js` 1092, `auth.js` 5577 (Clerk + service-key), `authBackend.js` 6550
(scrypt, sessions, RL), `claude.js` 4755, `configRegistry.js` 10267,
`configRunner.js` 8210, `cost.js` 2728, `crawler.js` 16345, `db.js` 13914
(memory|supabase backend), `email.js` 8311, `embeddings.js` 4879,
`inngest.js` 5239, `lifecycleToolSlots.js` 5110, `logger.js` 3936 (Axiom +
console fallback), `marketplace.js` 15238, `marketplaceSeed.js` 70309,
`orchestrator.js` 2366, `productDomains.js` 7369 (5-product domain registry),
`products.js` 3907, `requestLog.js` 4667, `stepPrompts.js` 8701,
`supabase.js` 1237, `superCustomerAgent.js` 21440, `tenant.js` 837.

`api/_lib/jobs/`: `costRollup.js` 1300, `marketplaceRerank.js` 2717,
`orchestratorRun.js` 423, `runStep.js` 3038, `scheduledClearance.js` 2204.

`api/_lib/orchestrator/`: `contracts.js` 4556, `registry.js` 3808.
`api/_lib/orchestrator/agents/`: `axiom.js` 857, `base44.js` 1909, `claude.js`
1504, `clerk.js` 1030, `configuration.js` 3083, `crawler.js` 1201, `index.js`
2475, `inngest.js` 1287, `playwright.js` 1464, `replit.js` 1692, `resend.js`
878, `supabase.js` 2912, `vercel.js` 964, `voyage.js` 1537.

---

## `src/pages/` — React UI pages

79 files. Auto-memory note: repo was scaffolded by Base44; most pages import
`@/api/base44Client`. Only the demo/marketing surfaces call `/api/*` directly.

| File | Bytes | Hits a backend? | Notes |
|---|---|---|---|
| `AIFeedbackLoop.jsx` | 11656 | base44 SDK | |
| `ActivityLog.jsx` | 8506 | base44 SDK | |
| `Analytics.jsx` | 19027 | base44 SDK | |
| `AppStoreDistribution.jsx` | 21413 | base44 SDK | |
| `Architecture.jsx` | 31201 | base44 SDK | |
| `AuditTrail.jsx` | 6547 | base44 SDK | |
| `AutoRunner.jsx` | 26272 | base44 SDK | |
| `AutonomousEngine.jsx` | 23857 | base44 SDK | |
| `BaseAgentTest.jsx` | 5631 | local | imports `src/lib/agents/BaseAgent.js` |
| `Billing.jsx` | 10315 | base44 SDK | placeholder Stripe alert |
| `BrandSystem.jsx` | 17000 | base44 SDK | |
| `Build.jsx` | 28018 | base44 SDK | |
| `CapabilityInstallSelfProtection.jsx` | 8970 | base44 SDK | |
| `CapabilityInstallSelfRenewal.jsx` | 10147 | base44 SDK | |
| `CapabilityPackageSelfProtection.jsx` | 11773 | base44 SDK | |
| `CapabilityPackageSelfRenewal.jsx` | 12454 | base44 SDK | |
| `CapabilityTransfer.jsx` | 10315 | base44 SDK | |
| `Clearance.jsx` | 19895 | base44 SDK | |
| `CompareTools.jsx` | 11587 | base44 SDK | |
| `Configuration.jsx` | 23276 | base44 SDK | |
| `CostControlsStub.jsx` | 499 | stub | |
| `CostUsage.jsx` | 13366 | base44 SDK | |
| `CreatorStudio.jsx` | 35403 | base44 SDK | |
| `Dashboard.jsx` | 3957 | base44 SDK | |
| `DataExport.jsx` | 8980 | base44 SDK | |
| `DemoGenerator.jsx` | 28878 | base44 SDK | |
| **`DemoSandbox.jsx`** | 11843 | `POST /api/leads` | Demo Tier 2. Body `{email,source:'sandbox',tier:2}`. Path 404s today. |
| `Design.jsx` | 11827 | base44 SDK | |
| `DomainManager.jsx` | 19337 | base44 SDK | |
| **`EnterpriseDemo.jsx`** | 18136 | `POST /api/leads` | Demo Tier 4. Body `{...form,source:'enterprise_demo',tier:4}`. Path 404s today. |
| `Environments.jsx` | 14414 | base44 SDK | |
| `ExternalUpgrade.jsx` | 17083 | base44 SDK | |
| `FlowDesigner.jsx` | 7937 | base44 SDK | |
| `Flows.jsx` | 15459 | base44 SDK | |
| `GTMAssets.jsx` | 18305 | base44 SDK | references `demo_org` literals in prompts |
| `GTMEngine.jsx` | 11054 | base44 SDK | |
| `GTMPlatform.jsx` | 6581 | base44 SDK | |
| `Governance.jsx` | 28659 | base44 SDK | |
| `GuidedStep.jsx` | 38523 | base44 SDK | |
| `InvestorStudio.jsx` | 26838 | base44 SDK | constructs `demo_org: '${customName} Demo Client'` |
| `LandingPage.jsx` | 35719 | base44 SDK | |
| **`LiveDemo.jsx`** | 7950 | `POST /api/configuration/clone` | Public sandbox. Hard-coded `org_id:'demo-org-public'`. |
| `MainDashboard.jsx` | 18355 | base44 SDK | |
| `ManualStep.jsx` | 14969 | base44 SDK | |
| `MarketingPage.jsx` | 10038 | (none) | |
| `MasterOrchestrator.jsx` | 8597 | base44 SDK | |
| `ModelMarketplace.jsx` | 14990 | (none) | |
| `MyCreations.jsx` | 7774 | base44 SDK | |
| `MyStack.jsx` | 16542 | base44 SDK | |
| `Onboarding.jsx` | 14845 | base44 SDK | |
| `OrgSettings.jsx` | 8878 | base44 SDK | |
| `Pipeline.jsx` | 11458 | base44 SDK | |
| `PlatformIntelligence.jsx` | 7179 | base44 SDK | |
| `PlatformIntelligenceMarketplace.jsx` | 6902 | base44 SDK | |
| `PortfolioDashboard.jsx` | 14681 | base44 SDK | |
| `PortfolioEngine.jsx` | 7708 | base44 SDK | |
| `PrivacyPolicy.jsx` | 2276 | static | |
| `ProductGenerator.jsx` | 11109 | base44 SDK | |
| `ProductRegistry.jsx` | 14605 | base44 SDK | |
| `ProductionMonitor.jsx` | 16605 | base44 SDK | |
| `ProjectTemplates.jsx` | 11231 | base44 SDK | |
| `QAAudit.jsx` | 31420 | base44 SDK | |
| `RealtimeDashboard.jsx` | 11660 | base44 SDK | |
| `ReleaseNotes.jsx` | 14404 | (none) | |
| `Research.jsx` | 14295 | base44 SDK | |
| `RunFlow.jsx` | 14246 | base44 SDK | |
| `RunHistory.jsx` | 13185 | base44 SDK | |
| `RunsHistory.jsx` | 11209 | base44 SDK | |
| `SelfHealing.jsx` | 10121 | base44 SDK | |
| `SelfProtection.jsx` | 10861 | base44 SDK | |
| `SelfUpgrade.jsx` | 10622 | base44 SDK | |
| `SelfVerification.jsx` | 20591 | base44 SDK | |
| `Templates.jsx` | 5087 | (none) | |
| `TermsOfUse.jsx` | 2470 | static | |
| `URLWhitelistStub.jsx` | 504 | stub | |
| `UsersStub.jsx` | 482 | stub | |
| `VEUaaSMarketing.jsx` | 12310 | (none) | VEU GTM page |
| `Variables.jsx` | 15365 | base44 SDK | |
| `WhiteLabel.jsx` | 9341 | base44 SDK | |
