╔══════════════════════════════════════════════════════════════════════════════╗

║         FLOWAI — CANONICAL BUILD INVENTORY                                  ║

║         Generated: 2026-05-10  |  Source: Base44 live codebase              ║

║         Owner: VEU AI Studio LLC                                            ║

╚══════════════════════════════════════════════════════════════════════════════╝



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 1 — VERSION HISTORY \& SPRINT LOG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



SPRINT: UX-A — Core Product Pages (early build)

&#x20; ADDED:

&#x20;   - LandingPage (main workspace entry, public route "/")

&#x20;   - Configuration page (5-card session setup: Product, Input Method,

&#x20;     Objective, Auto Parameters, Launch)

&#x20;   - AutoRunner page (8-step live execution dashboard)

&#x20;   - GuidedStep page (wizard-style step-by-step with proposal → approve → execute)

&#x20;   - ManualStep page (user-defined scope, FlowAI executes)

&#x20; STATUS: Complete



SPRINT: UX-B — Readability \& Navigation

&#x20; ADDED:

&#x20;   - Six-section sidebar nav with collapsible sections and tooltips

&#x20;   - Section headers: PORTFOLIO, CONFIGURATION, AUTO OPERATIONS,

&#x20;     GUIDED OPERATIONS, MANUAL OPERATIONS, SETTINGS

&#x20;   - Keyboard shortcuts: Ctrl+N → Auto Runner, Ctrl+/ → Autonomous Engine

&#x20;   - Time tags on section headers (seconds–minutes / minutes–hours / hours–days)

&#x20;   - FlowAIHealthBadge component (live API health check every 30s)

&#x20;   - IPFooter (legal notice on all authenticated pages)

&#x20;   - Tooltip component (custom, auto-positioning, portal-based)

&#x20; STATUS: Complete



SPRINT: Portfolio System

&#x20; ADDED:

&#x20;   - PortfolioDashboard — hero stats, product grid, active runs/demo-ready counts

&#x20;   - ProductRegistry — sortable table, slug/org/status/score per product, archive action

&#x20;   - RunsHistory — all 8-step pipeline runs, expandable step results, status filters

&#x20;   - MainDashboard — single-product command center (health, sessions, gates,

&#x20;     quick actions, platform health widget)

&#x20; ENTITIES ADDED:

&#x20;   - ProductRegistry entity (label, url, last\_score, last\_run\_at)

&#x20;   - AutoSession entity (product\_name, product\_url, current\_step, step\_results,

&#x20;     overall\_status, started\_at)

&#x20;   - GuidedSession entity (similar to AutoSession, mode=guided)

&#x20;   - ManualSession entity (similar, mode=manual)

&#x20; STATUS: Complete



SPRINT: Clearance Protocol

&#x20; ADDED:

&#x20;   - Clearance page (6-step Product Clearance Protocol UI)

&#x20;   - ClearanceWizard component (step-by-step guided wizard)

&#x20;   - ClearanceProgressTimeline component (visual timeline per product)

&#x20;   - ClearanceStatusDashboard component (bulk view across all products)

&#x20; ENTITIES ADDED:

&#x20;   - ClearanceRecord (product\_name, step1–6 status, overall\_status, current\_step)

&#x20; NOTE: The 6-step clearance protocol was built as the governance gate before

&#x20;       custom domain go-live. It was NOT replaced — it remains the standard.

&#x20;       Steps: Governance Audit, Launch Readiness, White-Label, Data Export,

&#x20;       Demo Readiness, Final Sign-Off.

&#x20; STATUS: Complete



SPRINT: Governance Center

&#x20; ADDED:

&#x20;   - Governance page (multi-panel: sessions, health, self-renewal, settings,

&#x20;     pending jobs, tool performance)

&#x20;   - GovernanceSessionRunner component

&#x20;   - SelfTestRunner component

&#x20;   - MasterControlCard component

&#x20;   - SessionStatusBar component

&#x20;   - ProtectBadge, VersionIncrementBadge components

&#x20;   - Gate1–4 review components (manual approval flow for governance gates)

&#x20; ENTITIES ADDED:

&#x20;   - GovernanceSession entity

&#x20;   - GovernanceSettings entity

&#x20;   - GovernanceAuditLog entity

&#x20;   - TestReport entity (target\_url, test\_score\_percentage, findings)

&#x20; STATUS: Complete



SPRINT: Cost \& Usage Tracking

&#x20; ADDED:

&#x20;   - CostUsage page (stat cards, per-product bar chart, session log, budget alerts)

&#x20;   - CSV export of cost data

&#x20;   - Budget alert thresholds (stored in localStorage)

&#x20; ENTITIES ADDED:

&#x20;   - UsageRecord entity (user\_email, action, plan, count)

&#x20;   - TokenUsage entity

&#x20; STATUS: Complete



SPRINT: Org Settings

&#x20; ADDED:

&#x20;   - OrgSettings page (3-tab: Organization info, Members, Integrations status)

&#x20;   - Integration status derived from known env secrets (ANTHROPIC\_API\_KEY,

&#x20;     OPENAI\_API\_KEY, PLAYWRIGHT\_ENDPOINT, VERCEL\_TOKEN, REPLIT\_ENDPOINT)

&#x20;   - 11 integrations tracked: Supabase, Inngest, Clerk, Resend, Voyage AI,

&#x20;     Axiom, Anthropic, Browser API, OpenAI, Vercel, Replit

&#x20; STATUS: Complete



SPRINT: GTM Demo Stack — Tier 1–4 (all UI complete)

&#x20; ADDED:

&#x20;   - VEUaaSMarketing (Tier 1, route /veuaas, domain veaas.com)

&#x20;     · Hero, 3 interactive moments (ClearanceSimulator, CostChart,

&#x20;       OrchestratorDemo), value props, social proof, pricing tease

&#x20;   - DemoSandbox (Tier 2, route /demo, domain demo.veaas.com)

&#x20;     · Video placeholder, session save (email capture), 4 tabs:

&#x20;       Portfolio / Run History / Clearance / Cost Analysis — all mock data

&#x20;   - LiveDemo (Tier 3, route /live-demo, domain live.veaas.com)

&#x20;     · Real backend clone-and-improve run, 1-per-email-per-day cap,

&#x20;       public results showcase (seeded demo products)

&#x20;   - EnterpriseDemo (Tier 4, route /enterprise-demo, domain enterprise.veaas.com)

&#x20;     · Lead capture form (name/email/company/ai\_product\_count/use\_case),

&#x20;       7-step guided product tour, Calendly placeholder, tour state in localStorage

&#x20;   - Shared demo components:

&#x20;     · SandboxBanner (warning banner, color-coded by tier)

&#x20;     · DemoFooter (cross-tier links, "Built by VEU AI Studio")

&#x20;     · ClearanceSimulator (6-step animated clearance check)

&#x20;     · CostChart (recharts 30-day cost visualization)

&#x20;     · OrchestratorDemo (mode + product picker → plan output, LLM mock)

&#x20;   - Mock data files:

&#x20;     · src/data/demo/products.json (5 VEU products, scores, clearance status)

&#x20;     · src/data/demo/runs.json (10 pipeline runs with verdicts, timing)

&#x20;     · src/data/demo/costs.json (30-day cost data, daily breakdown)

&#x20; STATUS: UI complete. Backend endpoints pending (see Section 6).



SPRINT: Capability Packages

&#x20; ADDED:

&#x20;   - CapabilityTransfer page (install Self-Renewal or Self-Protection into

&#x20;     any Base44 product via sprint)

&#x20;   - CapabilityPackageSelfRenewal page (4 components: Self-Test, Self-Heal,

&#x20;     Self-Monitor, Governance Hook — each with copy-to-clipboard sprint)

&#x20;   - CapabilityPackageSelfProtection page (anti-crawl, content protection,

&#x20;     IP notices, demo disclaimers)

&#x20;   - CapabilityInstallSelfRenewal page (per-product install view for 5 products)

&#x20;   - CapabilityInstallSelfProtection page (per-product install view for 5 products)

&#x20;   - AppStoreDistribution page (Apple App Store + Google Play submission guide)

&#x20; STATUS: Complete



SPRINT: Platform Administration Stubs

&#x20; ADDED:

&#x20;   - AuditTrail page (tamper-evident read-only log of all FlowAI actions)

&#x20;   - UsersStub page (operator/client account management — stub)

&#x20;   - URLWhitelistStub page (approved URLs for governance sessions — stub)

&#x20;   - CostControlsStub page (token budgets, session limits — stub)

&#x20;   - Onboarding page (first-time setup guide)

&#x20;   - ReleaseNotes page (complete sprint history)

&#x20; STATUS: Stubs functional; full implementation pending



SPRINT: Architecture Documentation

&#x20; ADDED:

&#x20;   - docs/FLOWAI\_ARCHITECTURE.md (this inventory's primary source)

&#x20;   - docs/FLOWAI\_MIGRATION\_PLAN.md (hosting decisions, domain routing,

&#x20;     seed data strategy, lead flow)

&#x20;   - docs/FLOWAI\_API\_CONTRACT.md (full spec for all endpoints)

&#x20;   - docs/FLOWAI\_GTM\_DEMO.md (four-tier GTM demo architecture)

&#x20;   - docs/COMPONENT\_CONVENTIONS.md

&#x20;   - docs/FLOWAI\_BACKEND\_WIRING.md

&#x20;   - docs/FLOWAI\_DEPLOYMENT\_STATUS.md

&#x20;   - docs/w2/v3-defect-register.md (agent-side defect tracking)

&#x20; STATUS: Complete and living



SPRINT: Agent Contract Layer (BaseAgent + Packet 1.5)

&#x20; ADDED:

&#x20;   - lib/agents/BaseAgent.js — G2 RATIFIED contract

&#x20;     · AGENT\_IDS (1–20), FLOWAI\_ONLY\_AGENTS, EMBEDDED\_AGENTS

&#x20;     · AUTHORITY enum (5 levels)

&#x20;     · PRODUCT\_SCOPES (flowai, saige, reltwin, reachsms, pressai, mypreglife)

&#x20;     · ENVIRONMENTS (prod, staging, demo, live-demo, sales-demo)

&#x20;     · Roster partition validation (compile-time)

&#x20;     · run() lifecycle: preflight → plan → guard → act → postflight

&#x20;     · guard() authority enforcement (RECOMMEND\_ONLY + sideEffects check)

&#x20;     · emit() / subscribe() via MessageBus

&#x20;     · Full auditLog writes at every lifecycle phase

&#x20;   - lib/shared/CredentialAdapter.js — Doppler-backed, browser-safe

&#x20;     · get(), getProviderSecret(), getCustomerSecret(), getStripeConnect()

&#x20;     · probe() → status: 'present' | 'expected' | 'missing'

&#x20;     · getAll(), declareExpected()

&#x20;     · Singleton management: setDefaultCredentialAdapter,

&#x20;       getDefaultCredentialAdapter, \_resetDefaultCredentialAdapter

&#x20;   - lib/agents/MessageSchema.js (referenced, not read — message envelope schema)

&#x20;   - lib/governance/ScoreEvaluator.js (referenced, not read — 95/95 evaluator)

&#x20; PACKAGE STATUS: 133 passing tests (reported, not in Base44 codebase — in local Git)

&#x20; RATIFICATION: G2 ratified. Packet 1.5 amendment adds `environment` dep,

&#x20;               validates per productScope.

&#x20; STATUS: Complete in GitHub. Imported into Base44 via lib/ directory.



SPRINT: BaseAgent Smoke Test Harness (Packet 1.5)

&#x20; ADDED:

&#x20;   - pages/BaseAgentTest.jsx (route /base-agent-test — dev/internal only)

&#x20;     · TestAgent (concrete BaseAgent subclass for smoke tests)

&#x20;     · 8 tests covering: missing env throws, valid construction (flowai+prod,

&#x20;       flowai+staging), invalid env (flowai+demo), CredentialAdapter browser

&#x20;       construction, probe('SOME\_API\_KEY') → 'expected', probe('UNKNOWN\_KEY')

&#x20;       → 'missing', invalid project throws, slug-unsafe providerId throws

&#x20;   - Title: "BaseAgent + CredentialAdapter — Packet 1.5 Smoke Tests"

&#x20; STATUS: Complete. 8/8 passing (verified).



CURRENT VERSION: FlowAI Engine v0.1 (displayed in sidebar footer)



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 2 — FEATURES \& CAPABILITIES

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



OPERATING MODES — THREE MODES, ONE SHARED CONFIGURATION

&#x20; Config entry point: /configuration (Configuration page, 5-card setup)

&#x20; All three modes read the same session config (sessionStorage key:

&#x20; "flowai\_session\_config") set by the Configuration page.



&#x20; ┌─────────────────────────────────────────────────────────────────────┐

&#x20; │ AUTO OPERATIONS   (seconds to minutes)                              │

&#x20; │ Route: /auto-runner                                                 │

&#x20; │ File: pages/AutoRunner.jsx                                          │

&#x20; │                                                                     │

&#x20; │ Workflow: Configuration → Launch "Run Auto" → AutoRunner page       │

&#x20; │           executes all 8 steps sequentially without pausing         │

&#x20; │           User sees live step cards updating in real time           │

&#x20; │           Final report generated at completion                      │

&#x20; │ UI: Live step cards (status: waiting/running/complete/failed),      │

&#x20; │     progress bar, expandable step results, final report panel,      │

&#x20; │     clearance protocol prompt on completion                         │

&#x20; │ When to use: Full end-to-end automated pass, no human checkpoints   │

&#x20; └─────────────────────────────────────────────────────────────────────┘



&#x20; ┌─────────────────────────────────────────────────────────────────────┐

&#x20; │ GUIDED OPERATIONS   (minutes to hours)                              │

&#x20; │ Routes: /guided/:step (research/design/build/qa-audit/deploy/       │

&#x20; │         govern/gtm/monitor)                                         │

&#x20; │ File: pages/GuidedStep.jsx                                          │

&#x20; │                                                                     │

&#x20; │ Workflow: Configuration → Launch "Start Guided" → GuidedStep        │

&#x20; │           At each step: FlowAI generates a proposal                 │

&#x20; │           User sees proposal, can modify, approve, or skip          │

&#x20; │           Only after approval does FlowAI execute the step          │

&#x20; │           Results shown, user advances to next step manually        │

&#x20; │ UI: Proposal panel with modify/approve/skip controls,               │

&#x20; │     voice input support (SpeechRecognition API),                    │

&#x20; │     step result panel, session context banner                       │

&#x20; │ When to use: Reviewable, step-level human oversight                 │

&#x20; └─────────────────────────────────────────────────────────────────────┘



&#x20; ┌─────────────────────────────────────────────────────────────────────┐

&#x20; │ MANUAL OPERATIONS   (hours to days)                                 │

&#x20; │ Routes: /manual/:step (same step names as guided)                   │

&#x20; │ File: pages/ManualStep.jsx                                          │

&#x20; │                                                                     │

&#x20; │ Workflow: Configuration → Launch "Start Manual" → ManualStep        │

&#x20; │           User defines what needs to be done at each step           │

&#x20; │           FlowAI executes the user's specific instructions           │

&#x20; │           Notes, tool selection, step completion are manual         │

&#x20; │ UI: Manual tracker, tool selector per step, notes field,            │

&#x20; │     AI assistance panel (LLM call on demand), step status control   │

&#x20; │ When to use: Expert-directed execution, non-standard scope          │

&#x20; └─────────────────────────────────────────────────────────────────────┘



&#x20; MODE SWITCHING: User returns to /configuration, selects different

&#x20; launch button. Session config is preserved in sessionStorage.

&#x20; Sessions are persisted in AutoSession / GuidedSession / ManualSession

&#x20; entities and can be resumed from MainDashboard "Active Sessions" panel.



8-STEP AUTO RUNNER PIPELINE (LOCKED)

&#x20; Step 1: Research    — external data, market info, regulatory context

&#x20; Step 2: Design      — UX/UI/system architecture specifications

&#x20; Step 3: Build       — code generation, syntax/lint/test gates

&#x20; Step 4: Quality Audit — independent scoring, 95/95 threshold check

&#x20; Step 5: Deploy      — deployment checks and assessment

&#x20; Step 6: Self-Renewal — self-test, self-heal, optimize, upgrade cycle

&#x20; Step 7: Go To Market — GTM readiness, conversion funnel, launch assets

&#x20; Step 8: Monitor     — health checks, performance, anomaly detection

&#x20; NOTE: Code (src/lib/operationsEngine.js STEPS array) is canonical

&#x20;       truth per Locked Rule 1. Step order updated 2026-05-11 (B5 /

&#x20;       W5c) to match code. Prior versions of this doc listed

&#x20;       Monitor=6, Self-Renewal=7, GTM=8; that ordering was a

&#x20;       documentation drift, not a real architectural decision.



INPUT METHODS (3 — selectable in Configuration Card 2)

&#x20; 1. Describe \& Build  — natural language product description

&#x20; 2. Clone \& Improve   — provide existing product URL, FlowAI audits/improves

&#x20; 3. Synthesize \& Build — 2–5 competitor URLs, FlowAI extracts best elements



URL COMPARISON / SYNTHESIZE FEATURE

&#x20; Surface: Configuration page, Card 2 "Synthesize \& Build" mode

&#x20; How to invoke: Select "Synthesize \& Build" → enter 2–5 URLs

&#x20; What it does: FlowAI crawls each URL, extracts strengths per dimension,

&#x20;               synthesizes a unified specification combining best elements

&#x20; Output: Multi-source synthesis brief fed to Design and Build steps

&#x20; Benchmarking support: Each source URL is treated as a reference product;

&#x20;                       output includes gap analysis per dimension

&#x20; Related: Competitor benchmarking (Agent #15) can consume the same URLs



SOLUTION PROVIDER / PLATFORM RANKING

&#x20; NOTE: Full marketplace ranking UI is built. See Tool Intelligence Marketplace.

&#x20; The PlatformIntelligenceMarketplace page (route /marketplace/intelligence)

&#x20; provides searchable/filterable tool directory.

&#x20; Ranking criteria: performance scores, cost tier, regional availability,

&#x20;                   category (AI, Data, Jobs, Auth, Email, Infra, Logs)

&#x20; Stages/steps where ranking surfaces:

&#x20;   - ManualStep: tool selector per step (Research, Design, Build, etc.)

&#x20;   - Governance: tool performance metrics (ToolMetrics entity)

&#x20;   - Compare Tools page (/compare-tools): side-by-side comparison

&#x20;   - My Stack page (/my-stack): user's selected tools

&#x20; UI components: ToolCard, ToolDetailPanel, AIRecommendationPanel,

&#x20;                ToolRankingTable, CompetitionMap, DecisionPanel,

&#x20;                RecordMetricPanel, SeedMetricsButton



SELF-RENEWAL

&#x20; Mechanism: Proposal-only with human approval gate (locked decision #4)

&#x20;            Never live self-editing. FlowAI generates a renewal proposal;

&#x20;            human must approve before any change executes.

&#x20; Triggers: Performance degradation signals from Monitor (#10),

&#x20;           charter drift detection by Self-Renewal agent (#3),

&#x20;           scheduled self-test cycle (scheduledSelfTest backend function)

&#x20; Components: SelfRenewalEngine (operations/SelfRenewalEngine.jsx)

&#x20; Propagation into products: Via Capability Transfer system

&#x20;             (CapabilityTransfer page + InstallSelfRenewal page)

&#x20;             Four components shipped per product:

&#x20;             Self-Test, Self-Heal, Self-Monitor, Governance Hook

&#x20; Backend: scheduledSelfTest function (runs on schedule),

&#x20;          selfHealingEngine function, selfAudit function



SELF-PROTECTION

&#x20; Scope: FlowAI platform itself AND every processed product

&#x20; FlowAI-level:

&#x20;   - Right-click protection (lib/contentProtection.js)

&#x20;   - DevTools detection (lib/contentProtection.js)

&#x20;   - IP footer on all authenticated pages (IPFooter component)

&#x20; Product-level (via CapabilityInstallSelfProtection):

&#x20;   - Anti-crawl headers

&#x20;   - Content protection

&#x20;   - IP notices

&#x20;   - Demo disclaimers

&#x20; Backend: selfProtection function

&#x20; Agent: #13 Self-Protection (EMBEDDED — ships with every product)

&#x20; Extended scope (Agent #13 charter): Cloudflare Bot Management,

&#x20;   code obfuscation, watermarking, ToS enforcement, DMCA templates,

&#x20;   trademark monitoring (Markify), dark-web monitoring posture



SELF-GOVERNANCE / 95/95 THRESHOLD

&#x20; Threshold: Governance score ≥ 95 AND Readiness score ≥ 95

&#x20; Gate: No product or agent output clears without meeting both scores

&#x20; Evaluator: lib/governance/ScoreEvaluator.js

&#x20; Exception handling: T=5 → third audit run triggered automatically

&#x20;                     T2=10 → escalates to human gate

&#x20; Cannot self-audit: Agent #8 (Quality Audit) cannot audit its own outputs

&#x20; Surfaces: Clearance page (6-step protocol), Governance center,

&#x20;           GovernanceAuditLog entity (tamper-evident)



TOOL INTELLIGENCE MARKETPLACE

&#x20; Route: /marketplace/intelligence (PlatformIntelligenceMarketplace)

&#x20; Also: /marketplace (ModelMarketplace), /compare-tools, /my-stack

&#x20; Tool count: Referenced as "65 tools / 13 categories" in user context

&#x20;             (actual seeded data via seedToolMetrics backend function)

&#x20; Categories: AI, Data, Jobs, Auth, Email, Infra, Logs, Deployment,

&#x20;             Execution, Auditing, Crawling, Reasoning (from ToolMetrics entity)

&#x20; Recommendation logic: AIRecommendationPanel uses InvokeLLM integration

&#x20;                       to produce context-aware tool recommendations

&#x20; Filtering: by category, cost tier, region/availability

&#x20; Sorting: by performance score, alphabetical, regional support

&#x20; Entities: ToolMetrics (tool\_id, tool\_name, capability, success,

&#x20;           latency\_ms, cost\_usd, task\_type), ToolRecommendation, PlatformTool



6-STEP PRODUCT CLEARANCE PROTOCOL

&#x20; Status: ACTIVE — NOT replaced or deprecated

&#x20; Steps:

&#x20;   1. Governance Audit

&#x20;   2. Launch Readiness

&#x20;   3. White-Label

&#x20;   4. Data Export

&#x20;   5. Demo Readiness

&#x20;   6. Final Sign-Off

&#x20; Surface: Clearance page (/clearance), ClearanceWizard component,

&#x20;          ClearanceProgressTimeline, ClearanceStatusDashboard

&#x20; Products tracked: 5 VEU flagship products (SAIGE, PressAI, ReachSMS,

&#x20;                   RelTwin, MyPregLife) + any custom products added

&#x20; Entity: ClearanceRecord (step1–6 status, overall\_status, current\_step,

&#x20;         email notifications triggered)

&#x20; Bulk operations: multi-product clearance status at a glance

&#x20; Email notifications: triggered on status changes via backend



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 3 — FULL UI SURFACE INVENTORY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



SIDEBAR STRUCTURE (6 sections, collapsible)



&#x20; PORTFOLIO (Multi-Product OS)

&#x20;   - Portfolio Dashboard /portfolio

&#x20;   - Product Registry    /products

&#x20;   - Run History         /runs

&#x20;   - Dashboard           /dashboard



&#x20; CONFIGURATION (Session Setup)

&#x20;   - My Products          /my-products

&#x20;   - Describe \& Build     /configuration?mode=describe

&#x20;   - Clone \& Improve      /configuration?mode=clone

&#x20;   - Synthesize \& Build   /configuration?mode=synthesize

&#x20;   - Objective \& Settings /configuration



&#x20; AUTO OPERATIONS (seconds–minutes)

&#x20;   - Auto Runner /auto-runner



&#x20; GUIDED OPERATIONS (minutes–hours)

&#x20;   - Research      /guided/research

&#x20;   - Design        /guided/design

&#x20;   - Build         /guided/build

&#x20;   - Quality Audit /guided/qa-audit

&#x20;   - Deploy        /guided/deploy

&#x20;   - Self-Renewal  /guided/govern

&#x20;   - Go To Market  /guided/gtm

&#x20;   - App Store     /app-store-distribution

&#x20;   - Monitor       /guided/monitor



&#x20; MANUAL OPERATIONS (hours–days)

&#x20;   - Research      /manual/research

&#x20;   - Design        /manual/design

&#x20;   - Build         /manual/build

&#x20;   - Quality Audit /manual/qa-audit

&#x20;   - Deploy        /manual/deploy

&#x20;   - Self-Renewal  /manual/govern

&#x20;   - Go To Market  /manual/gtm

&#x20;   - Monitor       /manual/monitor



&#x20; SETTINGS (Platform Configuration)

&#x20;   - Onboarding           /onboarding

&#x20;   - Release Notes        /release-notes

&#x20;   - Users                /users

&#x20;   - URL Whitelist        /url-whitelist

&#x20;   - Cost \& Usage         /cost-usage

&#x20;   - Cost Controls        /cost-controls

&#x20;   - Governance Settings  /governance

&#x20;   - Audit Trail          /audit-trail

&#x20;   - Capability Transfer  /capability-transfer

&#x20;   - Org \& Settings       /settings



ALL ROUTES (App.jsx — complete)

&#x20; Authenticated (inside AppLayout):

&#x20;   /dashboard, /configuration, /portfolio, /products, /runs,

&#x20;   /auto-runner, /guided/:step, /manual/:step, /clearance,

&#x20;   /governance, /cost-usage, /settings, /my-products, /onboarding,

&#x20;   /release-notes, /users, /url-whitelist, /cost-controls,

&#x20;   /audit-trail, /app-store-distribution, /capability-transfer,

&#x20;   /capability-packages/self-renewal, /capability-packages/self-protection,

&#x20;   /capability-packages/self-renewal/install,

&#x20;   /capability-packages/self-protection/install,

&#x20;   /terms-of-use, /privacy-policy, /billing, /activity,

&#x20;   /ai-feedback, /marketplace, /intelligence, /self-upgrade,

&#x20;   /external-upgrade, /self-verification, /portfolio-engine,

&#x20;   /master-orchestrator, /product-generator, /gtm-engine,

&#x20;   /self-protection, /self-healing, /domain-manager, /brand-system,

&#x20;   /white-label, /data-export, /architecture, /environments,

&#x20;   /production-monitor, /demo-generator, /investor-studio,

&#x20;   /gtm-assets, /marketplace/intelligence, /compare-tools,

&#x20;   /my-stack, /creator-studio (→ /configuration redirect),

&#x20;   /my-creations, /runs, /realtime, /templates-library,

&#x20;   /qa-audit, /research, /design, /build, /pipeline, /gtm,

&#x20;   /analytics, /run-history, /templates, /variables,

&#x20;   /flows (→ /dashboard redirect), /old-dashboard (→ /dashboard)

&#x20; Public (outside AppLayout):

&#x20;   / (LandingPage), /landing (MarketingPage),

&#x20;   /veuaas (VEUaaSMarketing — Tier 1),

&#x20;   /demo (DemoSandbox — Tier 2),

&#x20;   /live-demo (LiveDemo — Tier 3),

&#x20;   /enterprise-demo (EnterpriseDemo — Tier 4),

&#x20;   /about (→ /landing redirect),

&#x20;   /base-agent-test (BaseAgentTest — dev/internal)



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 4 — AGENT ROSTER (COMPLETE — 20 AGENTS)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



ROSTER PARTITION (from BaseAgent.js — G2 RATIFIED)

&#x20; FLOWAI-ONLY (8):  IDs 4, 5, 8, 11, 12, 14, 16, 18

&#x20; EMBEDDED (12):    IDs 1, 2, 3, 6, 7, 9, 10, 13, 15, 17, 19, 20

&#x20; TOTAL: 20 (partition validated at compile-time — throws if not exactly 20)



&#x20; ID | NAME                  | SCOPE        | AUTH (Day 1)      | STATUS

&#x20; ───┼───────────────────────┼──────────────┼───────────────────┼──────────────

&#x20;  1 │ Lifecycle Engine      │ EMBEDDED     │ RECOMMEND\_ONLY    │ SHIPPED (v0.1)

&#x20;  2 │ Code Builder          │ EMBEDDED     │ RECOMMEND\_ONLY    │ SHIPPED (v0.1)

&#x20;  3 │ Self-Renewal          │ EMBEDDED     │ REQUIRES\_HUMAN\_GATE│ DORMANT

&#x20;  4 │ Provider Onboarding   │ FLOWAI-ONLY  │ RECOMMEND\_ONLY    │ DORMANT

&#x20;  5 │ End-Customer Intake   │ FLOWAI-ONLY  │ RECOMMEND\_ONLY    │ DORMANT

&#x20;  6 │ Research              │ EMBEDDED     │ RECOMMEND\_ONLY    │ DORMANT

&#x20;  7 │ Design                │ EMBEDDED     │ RECOMMEND\_ONLY    │ DORMANT

&#x20;  8 │ Quality Audit         │ FLOWAI-ONLY  │ RECOMMEND\_ONLY    │ DORMANT

&#x20;  9 │ Go-To-Market          │ EMBEDDED     │ RECOMMEND\_ONLY    │ DORMANT

&#x20; 10 │ Monitor               │ EMBEDDED     │ RECOMMEND\_ONLY    │ DORMANT

&#x20; 11 │ Strategic Intelligence│ FLOWAI-ONLY  │ RECOMMEND\_ONLY    │ DORMANT

&#x20; 12 │ Portfolio Risk        │ FLOWAI-ONLY  │ RECOMMEND\_ONLY    │ DORMANT

&#x20; 13 │ Self-Protection       │ EMBEDDED     │ RECOMMEND\_ONLY    │ DORMANT

&#x20; 14 │ Public Policy         │ FLOWAI-ONLY  │ RECOMMEND\_ONLY    │ DORMANT

&#x20; 15 │ Benchmarking          │ EMBEDDED     │ RECOMMEND\_ONLY    │ DORMANT

&#x20; 16 │ Productivity/HR       │ FLOWAI-ONLY  │ RECOMMEND\_ONLY    │ DORMANT

&#x20; 17 │ Product Evolution     │ EMBEDDED     │ RECOMMEND\_ONLY    │ DORMANT

&#x20; 18 │ Business Planning     │ FLOWAI-ONLY  │ RECOMMEND\_ONLY    │ DORMANT

&#x20; 19 │ Technological Evolution│ EMBEDDED    │ RECOMMEND\_ONLY    │ DORMANT

&#x20; 20 │ Environmental Impacts │ EMBEDDED     │ RECOMMEND\_ONLY    │ DORMANT



AUTHORITY LEVELS (5, from BaseAgent.js)

&#x20; RECOMMEND\_ONLY        — output only, no writes, no side effects

&#x20; DRAFT\_ONLY            — may draft documents, not publish

&#x20; AUTO\_CONTAIN\_KNOWN    — may auto-handle known threat patterns

&#x20; AUTO\_WRITE\_INTERNAL   — may write to internal systems

&#x20; REQUIRES\_HUMAN\_GATE   — any action requires explicit human approval



AGENT CONTRACT (BaseAgent lifecycle)

&#x20; preflight (optional) → plan() → guard() → act() → postflight (optional)

&#x20; Every phase writes to auditLog.

&#x20; guard() enforces authority: RECOMMEND\_ONLY agents cannot declare sideEffects.

&#x20; emit() publishes to MessageBus.

&#x20; subscribe() registers MessageBus handler.



RUN ID FORMAT: run\_{timestamp}\_{agentId}\_{random8chars}



COMMUNICATION PATTERNS

&#x20; Primary: MessageBus (publish/subscribe, topic-based)

&#x20; Message envelope (MessageSchema.js): topic, payload, from

&#x20;   (agentId, productScope, environment), runId, at

&#x20; Secondary: auditLog.write() at every lifecycle phase

&#x20; Tertiary: Direct entity reads/writes via Base44 SDK (UI layer only)



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 5 — INTEGRATIONS \& ORCHESTRATION

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



LLM PROVIDERS (active secrets)

&#x20; - Anthropic (ANTHROPIC\_API\_KEY) — Claude, primary reasoning

&#x20; - OpenAI (OPENAI\_API\_KEY)      — GPT models, fallback/secondary



INFRASTRUCTURE (active secrets)

&#x20; - Playwright (PLAYWRIGHT\_ENDPOINT) — headless browser / web crawling

&#x20; - Vercel (VERCEL\_TOKEN)            — deployment

&#x20; - Replit (REPLIT\_ENDPOINT)         — code execution environment



LLM ROUTING (InvokeLLM integration — Base44 Core)

&#x20; Default model: automatic (openai/gpt-4o-mini)

&#x20; Supported models: automatic, gpt\_5\_mini, gemini\_3\_flash, gpt\_5\_4,

&#x20;                   gpt\_5\_5, gemini\_3\_1\_pro, claude\_sonnet\_4\_6,

&#x20;                   claude\_opus\_4\_6, claude\_opus\_4\_7

&#x20; Web search: gemini\_3\_flash or gemini\_3\_1\_pro only

&#x20; Vision: all models support file\_urls

&#x20; Model selection: per-call basis, passed as model parameter

&#x20; Fallback: explicit in calling code (try/catch → alternate model)



CREDENTIAL MANAGEMENT

&#x20; Current: Base44 Secrets dashboard (5 secrets above)

&#x20; Target (designed, not yet integrated):

&#x20;   Doppler vault architecture

&#x20;   Path format:

&#x20;     Static (embedded):   <productScope>/<env>/<key>

&#x20;     Static (FlowAI):     flowai/<env>/<key>

&#x20;     Provider-scoped:     flowai/<env>/PROVIDERS\_<providerId>\_<subkey>

&#x20;     Customer-scoped:     flowai/<env>/CUSTOMERS\_<provId>\_<custId>\_<subkey>

&#x20;     Stripe Connect:      flowai/<env>/STRIPE\_CONNECT\_<providerId>

&#x20;   Restriction: provider\_id and customer\_id must be slug-safe (no underscores)



EXTERNAL DATA SOURCES (locked vendor picks, not yet integrated)

&#x20; Crunchbase Enterprise   — Strategic Intelligence (#11)

&#x20; Bloomberg Law Wave 1.5  — Public Policy (#14)

&#x20; Electricity Maps        — Environmental Impacts (#20)

&#x20; WattTime                — Environmental Impacts (#20)

&#x20; USPTO / EPO / WIPO      — Technological Evolution (#19)

&#x20; PostHog                 — Product Evolution (#17)

&#x20; Productboard            — Product Evolution (#17)

&#x20; GrowthBook              — Product Evolution (#17)

&#x20; Cube                    — Business Planning (#18)

&#x20; Cloudflare Bot Mgmt     — Self-Protection (#13)

&#x20; Markify                 — Self-Protection (#13)

&#x20; Stripe Connect (15% fee)— Provider Onboarding (#4)

&#x20; Twilio                  — ReachSMS product

&#x20; Paystack                — MyPregLife (Africa-first)



AUTHENTICATION / PROVIDER ONBOARDING

&#x20; Current: Base44 built-in auth (token issuance, sessions, email verification)

&#x20; Target: Clerk multi-tenant (Phase 6, not yet deployed)

&#x20; Provider onboarding flow: Agent #4 (DORMANT)

&#x20;   Steps: Identity verification, contract acceptance, Stripe Connect,

&#x20;          revenue split configuration, capability assignment



END-CUSTOMER / SUB-ORG ISOLATION

&#x20; Implemented at DB level (Supabase RLS):

&#x20;   org\_id = "prod-{id}"       → production tenant

&#x20;   org\_id = "demo-org-public" → Tier 3 live demo (read-only for public)

&#x20;   org\_id = "demo-org-enterprise-{emailhash}" → Tier 4 enterprise demo

&#x20; Rule: demo org\_id can never read prod schema — enforced at RLS, not API



REVENUE SPLIT TRACKING

&#x20; Agent #4 (Provider Onboarding) owns this — DORMANT

&#x20; Platform fee: 15% (Stripe Connect)

&#x20; Per-provider split stored at: flowai/<env>/STRIPE\_CONNECT\_<providerId>

&#x20; Tracking entity: not yet created (pending Provider Onboarding sprint)



BACKEND FUNCTIONS (51 active in Base44)

&#x20; Core orchestration: orchestrate, masterOrchestrator, multiAgent,

&#x20;                     autonomousEngine, decisionEngine, detectIntent

&#x20; Build/code: generateCode, generateProduct, generateFixes, applyImprovement,

&#x20;             buildImprovementPlan, fixAndRedeploy, generateTests

&#x20; Research/crawl: crawlPage, crawlMultiPage, claudeCrawl

&#x20; QA/audit: analyzeQA, automatedQA, auditAccessibility, auditDeployment,

&#x20;           behavioralValidation, prioritizeIssues

&#x20; Deploy: deployApp, deployExecutionEngine, runSingleApp, verifyDeployment,

&#x20;         runVerification, validateUpgrade

&#x20; Monitor/health: intelligentMonitor, systemHealth, scheduledSelfTest,

&#x20;                 selfHealingEngine, selfAudit, selfVerificationEngine,

&#x20;                 selfProtection

&#x20; GTM: gtmEngine

&#x20; Portfolio: portfolioEngine

&#x20; Notifications: sendAlertEmail, sendNotifications, slackNotify

&#x20; Integrations: syncGitHubIssues, webhookHandler, webhookTrigger

&#x20; Analytics: usageStats, recordToolMetric, seedToolMetrics

&#x20; Utility: jobStatus, userMemory, adminSetup, apiGateway, apiRun



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 6 — CONSUMERS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



VEU AI STUDIO — FIRST CONSUMER (INTERNAL)

&#x20; 5 flagship products:

&#x20;   SAIGE        saige.com / saigeplatform.com

&#x20;                ESG / sustainability / impact intelligence

&#x20;                Provisional patent filed

&#x20;   RelTwin      reltwin.com

&#x20;                Relationship intelligence for coaches and HR

&#x20;                Provisional patent filed. Beta-ready verdict.

&#x20;   ReachSMS     ourcommunitiesai.com

&#x20;                SMS community engagement for nonprofits

&#x20;                Twilio integration mostly done. Provisional patent filed.

&#x20;   PressAI      ourpublishingai.com

&#x20;                AI publishing for authors and publishers

&#x20;                Stripe live and active routes. Provisional patent filed.

&#x20;   MyPregLife  preglife.com

&#x20;                Maternal health platform for Africa

&#x20;                Offline pending rebrand. Paystack for Africa-first billing.

&#x20; 8 production domains live

&#x20; 5 product brands established

&#x20; All 5 products tracked in VEU\_PRODUCTS constant (lib/veuProducts.js,

&#x20; PortfolioDashboard, ProductRegistry)



PER-PRODUCT AGENT EMBEDDING MODEL

&#x20; 12 agents ship with every product (EMBEDDED set):

&#x20;   #1  Lifecycle Engine

&#x20;   #2  Code Builder

&#x20;   #3  Self-Renewal

&#x20;   #6  Research

&#x20;   #7  Design

&#x20;   #9  Go-To-Market

&#x20;   #10 Monitor

&#x20;   #13 Self-Protection

&#x20;   #15 Benchmarking

&#x20;   #17 Product Evolution

&#x20;   #19 Technological Evolution

&#x20;   #20 Environmental Impacts

&#x20; 8 agents are FlowAI-only (do NOT embed in products):

&#x20;   #4 Provider Onboarding, #5 End-Customer Intake,

&#x20;   #8 Quality Audit, #11 Strategic Intelligence,

&#x20;   #12 Portfolio Risk, #14 Public Policy,

&#x20;   #16 Productivity/HR, #18 Business Planning



ADDITIONAL CONSUMERS (VEUaaS — Phase 2+)

&#x20; Architecture: product-agnostic. FlowAI exposes standard integration contracts

&#x20;   (events, API hooks, components). FlowAI does not know its consumers.

&#x20; Onboarding path: Agent #4 (Provider Onboarding) — currently DORMANT

&#x20; Multi-tenancy: Supabase RLS org\_id scoping — supports any number of tenants

&#x20; Platform fee: 15% via Stripe Connect



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 7 — CURRENT STATE \& PENDING WORK

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



CURRENT VERSION: FlowAI Engine v0.1



KNOWN ISSUES / IN-FLIGHT

&#x20; - Git race condition: Multiple Claude Code sessions writing to single local

&#x20;   repo directory simultaneously — work is recoverable, workflow needs fix

&#x20; - Backend endpoints for Tier 3 / Tier 4 are UI-complete but backend-pending:

&#x20;     POST /api/leads                  → Resend + Supabase insert

&#x20;     GET  /api/admin/seed-demo        → daily seeder + synthetic runs

&#x20;     POST /api/configuration/clone    → real crawl + run cap enforcement

&#x20;     GET  /api/health                 → migrate from systemHealth function

&#x20;     GET  /api/cost-summary           → migrate from usageStats function

&#x20;     GET  /api/products               → product CRUD

&#x20;     POST /api/products               → product CRUD

&#x20; - Doppler vault: architecture designed, not yet integrated

&#x20; - Clerk multi-tenant auth: planned (Phase 6), not deployed

&#x20; - Base44 ↔ GitHub auto-mirror: planned, not yet activated

&#x20; - Vercel project + domain aliases: planned, not yet created

&#x20; - Agents #3–#20: contract layer built, agents themselves are DORMANT

&#x20;   (implementation pending wire-in phase)

&#x20; - Supabase: schema designed in docs, database not yet provisioned

&#x20; - CRM webhook from lead form: Phase 6

&#x20; - Calendly integration in EnterpriseDemo: placeholder only

&#x20; - Revenue split tracking: pending Agent #4 sprint

&#x20; - Provider/customer isolation: RLS rules designed, not deployed



COMPLETED AND STABLE

&#x20; - All UI pages and routes

&#x20; - All sidebar navigation with tooltips

&#x20; - Configuration page (5-card session setup)

&#x20; - Three operating modes (Auto, Guided, Manual)

&#x20; - 6-step clearance protocol

&#x20; - Portfolio system (dashboard, registry, run history)

&#x20; - GTM demo stack Tier 1–4 (UI complete with mock data)

&#x20; - Capability transfer system (self-renewal + self-protection packages)

&#x20; - BaseAgent contract layer (G2 ratified, 133 tests passing)

&#x20; - CredentialAdapter (browser-safe, Doppler-ready)

&#x20; - MessageSchema, ScoreEvaluator (in local Git)

&#x20; - Packet 1.5 smoke tests (8/8 passing)

&#x20; - 51 backend functions (Base44 Deno)

&#x20; - Architecture documentation (4 docs + defect register)

&#x20; - Design system (dark mode, Tailwind tokens, shadcn/ui)

&#x20; - Content protection + IP footer

&#x20; - All entities defined



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 8 — SSOT PROMOTION LOG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENTRY 001 — 2026-05-14 — CA-1 + CA-2 promotion to canonical SSOT

  Date:               2026-05-14
  Promoted by:        W5c
  Source commit:      437767a (panel+synthesis: SSOT amendment draft per
                      Panel re-eval (corrected framing 'underserved
                      globally') + re-clustered Q1-5 + candidate list +
                      unified draft [W5c])
  Source dispatch:    docs/panel-consultations/ssot-amendment-synthesis-
                      2026-05-14.md
  Amendment draft:    docs/FLOWAI_SSOT_AMENDMENT_DRAFT_2026-05-14.md
  CEO disposition:    CA-1 + CA-2 supermajority-cleared per MG2 (≥7/10).
                      CA-3 through CA-6 deferred for separate Panel
                      re-review dispatch; not promoted in this entry.
  Panel signal:
                      CA-1 (geographic broadening to "UNDERSERVED MARKET
                          SEGMENTS GLOBALLY"): 9/10 unique reviewers
                          (slots 1, 2, 3, 4, 5, 6, 7, 9, 10).
                      CA-2 (reframe FlowAI as URL-based AI democratization
                          platform): 8/10 unique reviewers (slots 1, 2,
                          3, 4, 5, 6, 9, 10).
  Sections updated in docs/FLOWAI_SSOT.md:
                      O1 — Primary identity of FlowAI (CA-1 + CA-2)
                      O6 — "First, not exclusive" — meaning (CA-1)
                      ELEVATOR PITCH — synthesized (CA-1 + CA-2)
  Sections NOT updated (out of scope for CA-1 + CA-2):
                      O4 — incidental "Africa availability" wording in
                          Marketplace tool-ranking criterion. Product-
                          tool scope, not platform-market scope.
                      MISSING QUESTIONS — incidental "MyPregLife
                          Africa-first" wording. Product-roadmap scope,
                          not platform-market scope.
                      E4 — no geographic-scope wording present;
                          CA-5 (E4 commercial generalization, 5/10
                          plurality) not promoted in this entry.
  Pre-promotion archive:
                      docs/archive/FLOWAI_SSOT-Layer1-pre-CA1-CA2-promotion-2026-05-14.md
                      (verbatim copy of canonical SSOT at commit fbaf881
                      before CA-1 + CA-2 edits applied).
                      [Pointer updated 2026-05-14 during W04-Rev-2.1
                      promotion: original filename `FLOWAI_SSOT-pre-
                      2026-05-14-promotion.md` was reused by the Rev-2.1
                      promotion archive at the dispatched path. The
                      Layer 1 pre-CA1+CA2 snapshot was renamed (git mv)
                      to disambiguate; content is byte-identical, only
                      the path moved.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENTRY 002 — 2026-05-14 — CA-3 promotion to canonical SSOT

  Date:               2026-05-14
  Promoted by:        W5c
  Source commits:     e2f094d (panel: re-review of CA-3/4/5/6 plus
                      parking-lot ENTRY 002 + ENTRY 003 against updated
                      canonical SSOT post-CA-1+CA-2 promotion [W5a])
                      d476555 (panel: consolidated consultation on MG2
                      interpretation + CA-3/4/5 promotion + 4-remediation-
                      modes canonical + agent roadmap priority [W5a])
  Source dispatch:    W04 → W5c CA-3 promotion dispatch (2026-05-14)
  Amendment draft:    docs/FLOWAI_SSOT_AMENDMENT_DRAFT_2026-05-14.md,
                      "Amendment 3 — Replace O1 verbatim text"
                      (lines 166–200).
  Panel signal:       CA-3 cleared 8 of 8 engaged reviewers
                      (supermajority confirmed on re-review).
  MG2 interpretation: (c) middle path — supermajority threshold = ≥7 of
                      10 engaged reviewers AND engagement floor of 9+
                      engaged on the question. CA-3 cleared both gates.
  CEO disposition:    ACCEPTED for promotion (D2 from Q2 dispositions).
                      CA-4 + CA-5 + CA-6 deferred per Panel split + the
                      engagement caveats surfaced during re-review;
                      not promoted in this entry.
  Sections affected in docs/FLOWAI_SSOT.md:
                      O1 — Primary identity of FlowAI.
                          The CA-3 verbatim replacement text was already
                          incorporated into the canonical O1 statement
                          during the CA-1 + CA-2 promotion at commit
                          1d65aba (ENTRY 001 above). The O1 text now
                          satisfies CA-3's specified replacement
                          (the "FlowAI is primarily a URL-based AI
                          democratization platform for underserved
                          market segments globally..." formulation).
                          No additional text edit to docs/FLOWAI_SSOT.md
                          is required to ratify CA-3; this entry records
                          the canonical ratification administratively.
  Sections NOT updated (out of scope for CA-3):
                      CA-4 (Year-1→Year-6 user journey to O6) — deferred.
                      CA-5 (E4 commercial rail generalization) — deferred.
                      CA-6 (new MG9 section) — deferred.
  Pre-promotion archive:
                      Not created for this entry. CA-3's specified
                      replacement text was already in place in
                      docs/FLOWAI_SSOT.md from the CA-1 + CA-2
                      promotion (commit 1d65aba). The canonical SSOT
                      state is byte-identical before and after this
                      ratification; the pre-CA-1+CA-2 archive at
                      docs/archive/FLOWAI_SSOT-Layer1-pre-CA1-CA2-
                      promotion-2026-05-14.md remains the authoritative
                      pre-amendment baseline.
                      [Pointer updated 2026-05-14 during W04-Rev-2.1
                      promotion — see ENTRY 001 note.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ENTRY 003 — 2026-05-14
- **Source commits:** Rev-2.1 draft at 46d94b1 (4 amendments) over Rev-2 at 10890b9
- **Panel signal:** SUPERMAJORITY_PROMOTE_WITH_MINOR_AMENDMENTS (9/10 PROMOTE, 1/10 PROMOTE_AS_CANONICAL, 0 REWORK, 0 REJECT) per W6 commit 9d7abd3
- **Panel composition note:** Initial Rev-2 verdict was produced by a Panel with 50% OpenAI dominance; CEO directed Panel composition rebalance shipped at commit 50a7928 (now 8 providers, ≤2 per provider, includes Asian + European + developer/builder AIs)
- **Amendments applied:** §17 sidebar-label footnote, §25.4 Locked Rule 4 canonical labels, §20.1 Self-Protection reconciliation, §3 productScope generic placeholders
- **CEO disposition:** Ratified for canonical promotion under MG2 (≥7/10 engaged) + Locked Rule 13 (CEO retains absolute veto)
- **Sections affected:** §3, §17, §20.1, §25.4
- **Lower-priority items deferred to CA-n cycle (§18):** OQ-3 (dead code archival), OQ-2 (Ops Runner #21-#25 step bindings), OQ-1 (tool count 65 vs 61), OQ-5 (Capability Transfer L4 completeness scope)
- **Ratified-at commit:** (this commit — see git log for hash)
- **Pre-promotion archive:** docs/archive/FLOWAI_SSOT-pre-2026-05-14-promotion.md (verbatim copy of canonical CANONICAL_REFERENCE.md immediately before the Rev-2.1 full-replacement + header-flip applied by this entry). The prior occupant of that filename — the CA-1+CA-2 pre-promotion snapshot of FLOWAI_SSOT.md (Layer 1 doc) referenced by ENTRY 001 and ENTRY 002 — was renamed via `git mv` to docs/archive/FLOWAI_SSOT-Layer1-pre-CA1-CA2-promotion-2026-05-14.md; ENTRY 001 + ENTRY 002 pointers updated accordingly. Both archives coexist; the secondary disambiguated archive at docs/archive/CANONICAL_REFERENCE-pre-2026-05-14-rev2.1-promotion.md (from the earlier W2 attempt at commit c2623c5) is retained as historical artifact.
- **Lineage:** Rev-1 (commit d68a1df) → Rev-2 (commit 10890b9, Panel-reviewed at commit 9d7abd3) → Rev-2.1 (commit 46d94b1, 4 amendments applied) → canonical (this entry)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ENTRY 004 — 2026-05-15
- **Promotion:** CA-7 + CA-8 combined SSOT amendment promoted to canonical
- **Promoted by:** W2
- **Source draft:** `docs/specs/SSOT_AMENDMENT_CA7_CA8_DRAFT.md` (W3, 2026-05-15)
- **Panel signal:** 5× UNANIMOUS_(a), 10/10 ENGAGED on every question, W6 panel commit `fb0bb64`
- **Panel questions covered:**
  - CA-7-Q1: Adopt §15.5 verbatim per draft §CA-7.2 → UNANIMOUS_(a)
  - CA-7-Q2: All 5 mitigations (M1 cross-link, M2 audit-log, M3 validator, M4 admin discoverability, M5 drift detection) binding → UNANIMOUS_(a)
  - CA-7-Q3: §14 ripple amendments per draft §CA-7.4 → UNANIMOUS_(a)
  - CA-8-Q1: Adopt §20.2 X-Test-Bypass-Token Contract verbatim per draft §CA-8.2 → UNANIMOUS_(a)
  - CA-8-Q2: Authorise retroactive §9.1 update per draft §CA-8.3 → UNANIMOUS_(a)
- **CEO disposition:** Ratified under MG2 (≥7/10 ENGAGED) + Locked Rule 13 (CEO retains absolute veto); no PLURALITY items required arbitration (all 5 questions cleared supermajority)
- **Sections affected in docs/CANONICAL_REFERENCE.md:**
  - §15.5 (NEW) — EXECUTOR_REGISTRY split-charter sibling namespace; canonical type contract, lookup API, validator invariants, current population (1 executor: `self-renewal-executor`), cross-links with §14 + §15.1, 5 binding mitigations (M1-M5)
  - §14.1 (3 rows added) — `executor_registered.v1` topic (CA-7 M5), `agent.execution.reject_executor_via_hub.v1` topic (CA-7 M3), `executorKey` cross-cutting field annotation (CA-7 M2)
  - §20.2 (NEW) — X-Test-Bypass-Token Contract; scope, RS256/HS256 algorithm, claim schema, 6 validation rules
  - §20.2.1 (NEW sub-sub-section) — Doppler env-suffix key naming canonical (`TEST_BYPASS_PRIVATE_KEY_DEV` / `_PROD`, `TEST_BYPASS_PUBLIC_KEY_DEV` / `_PROD`); supersedes path-style naming in test-plan-text §9.1 per Locked Rule 1 (code wins)
  - §18.4 — ENTRY 003 + ENTRY 004 rows added to ratified-amendments table
- **Ripple amendments applied in this commit:**
  - `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` §9.1 — path-style key names struck; replaced with pointer to canonical §20.2
  - `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §4.3 — Option B disposition resolved; cross-link to §15.5 EXECUTOR_REGISTRY + `executorKey` reference added
- **Pre-promotion archive:** `docs/archive/FLOWAI_SSOT-pre-CA7-CA8-promotion-2026-05-15.md` (verbatim copy of canonical CANONICAL_REFERENCE.md immediately before this CA-7+CA-8 insertion)
- **Lineage:** Rev-2.1 canonical (commit `9495b26`) → ENTRY 003 → CA-7+CA-8 draft `SSOT_AMENDMENT_CA7_CA8_DRAFT.md` → W6 panel `fb0bb64` (5× UNANIMOUS_(a)) → CEO ratification → this entry

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ENTRY 005 — 2026-05-15
- **Promotion:** CA-9 (Orchestra Self-Expansion + Customer Feedback Loop + Agent #26) + CA-10 (ProductSSOT + Symbiotic Feed-Back Loop) combined SSOT amendment promoted to canonical
- **Promoted by:** W2
- **Source drafts:** `docs/specs/SSOT_AMENDMENT_CA9_DRAFT.md` + `docs/specs/SSOT_AMENDMENT_CA10_DRAFT.md` (W3, 2026-05-15)
- **Panel signal:** 7/8 SUPERMAJORITY/UNANIMOUS on every question, W6 panel commit `cc5fd8d`
- **CEO arbitration:** **CA-9-Q4 = (b)** — Agent #26's `auto_write_internal` authority MUST be paired with `requires_human_gate` (dual-authority shape mirroring CA-7's Self-Renewal Executor; `BaseAgent.guard()` enforces via per-invocation `authorityNeeded` set membership). Other CEO dispositions: Q1 0.70 floor adopted; Q2 capability-gap rule adopted; Q3 25→26 Locked Rule 2 amendment approved; Q5–Q8 adopted as drafted; CA-10-Q1 ProductSSOT mandatory per product; CA-10-Q2 atomic Output Contract item #5; CA-10-Q3 admin override always wins; CA-10-Q7 all five A/B/C/D/E sub-amendments promoted together.
- **Sections affected in `docs/CANONICAL_REFERENCE.md`:**
  - **§7 Output Contract** — item #5 added (atomic ProductSSOT update; failure rolls back run per §10 Self-Protect snapshot pattern)
  - **§7.5 (NEW)** — ProductSSOT entity definition: 6 canonical blocks (identity_block, build_brief, architecture_snapshot, delta_log, governance_record, annotations + overrides), Supabase schema reference, DeploymentScaffold relationship
  - **§8.1 (NEW)** — Orchestra Self-Expansion / Auto-Admission: 4-condition gate (rank_score ≥ 0.70, ≥30 invocations, capability-gap, no carve-out flag), 5-state lifecycle (Trial / Probation / Full member / Deprecated / **Archived**) with Lovable + Replit reconciliation, 7 audit-log topics, manual override + deprecation gate retained, 13-candidate CEO seed evaluation list (Tier 1 + Tier 2)
  - **§11 Six-Step Clearance Protocol** — Step 4 Data Export expanded to include full ProductSSOT row content per CA-10-E.3 + optional portable JSON manifest
  - **§13.1 (NEW)** — ProductSSOT role gates: admin (full edit + override) / operator (annotations only, append-only) / client (read-only); new `/product-ssot/:productId` UI surface specified; override semantics + audit trail
  - **§14.1** — 3 new audit-log topics inherited from CA-7 (ENTRY 004); 21 new MessageBus topics for CA-9 + CA-10 added in §15.2 update
  - **§14.3 Retention + RLS** — ProductSSOT retention bullet added: 365-day hot + 7-year cold; PII-scrub extension (email + phone + CC + government ID + customer self-identified names); §11 Step 4 export cross-link
  - **§15** (header + intro) — "25-AGENT ROSTER" → "26-AGENT ROSTER"; intro paragraph updated with CEO arbitration CA-9-Q4=(b) dual-authority note
  - **§15.1 Roster table** — Agent #3 row expanded (consumes `10.customer.issue.v1`, customerReportedIssues heuristic, produces `3.ssot.delta.v1`); Agent #10 row expanded (3 customer signal channels + 2 produced topics + `10.ssot.updated.v1`); Agent #11 row expanded (global AI-platform discovery primary function + `11.platform.discovery.v1`); Agent #15 row expanded (continuous head-to-head scoring + `15.benchmark.head_to_head.v1`); Agent #17 row expanded (composition recommendation + `17.orchestra.deprecation_proposal.v1`); **Agent #26 NEW** (Orchestra Research Agent, always-on, embedded, dual-authority + human-gate per CA-9-Q4=(b)); partition footer rewritten ("13 embedded + 8 FlowAI-internal-only + 5 Ops Runners embedded = 26 unique IDs")
  - **§15.2 MessageBus** — topic count 40 → 61 (21 new constants: 7 CA-9-A Orchestra self-expansion, 5 CA-9-B agent-charter expansions [including `vendor.changelog.poll.v1`], 5 CA-9-C customer feedback loop, 4 CA-10-B ProductSSOT auto-update)
  - **§18.4 Ratified amendments** — ENTRY 005 row added; ENTRY 004 commit hash filled in as `fd94f1e`
  - **§25 Locked Rule 2** — "EXACTLY 25 unique agent IDs" → "EXACTLY 26 unique agent IDs"; partition rewritten with 13 embedded
  - **§28 (NEW)** — Symbiotic Feed-Back Loop: pre-pipeline-run read of ProductSSOT per environment; crawl-scope narrowing (Agent #6) for stable products (≥3 prior runs / 30d, no drift flag); admin overrides as CEO-equivalent directives; conflict resolution (admin override always wins per CA-10-Q3=(a)); §4 L2/L3 + §6 + §9 cross-link footers
- **Engineering impact (out of scope for this commit; landed in follow-up dispatches):**
  - `src/lib/agents/BaseAgent.js` — `AGENT_IDS.ORCHESTRA_RESEARCH = 26`; `EMBEDDED_AGENTS` set adds 26; `validateRosterPartition()` size 26 + range [1, 26]; `_validateCharter(c)` agentId range [1, 26]; `BaseAgent.guard()` extended for dual-authority per-invocation set membership
  - `src/lib/agents/_registry.ts` — `AGENT_REGISTRY` adds row #26 (Orchestra Research Agent charter; dual + human-gate authority)
  - `src/lib/agents/MessageSchema.js` — +21 topic constants (40 → 61)
  - `supabase/migrations/00NN_product_ssot.sql` — new tables `product_ssot` + `product_ssot_version`; RLS policies per §13.1 + §14.3
  - `src/lib/renewal/inputArtifact.js` `scrubCredentials()` — extended to scrub email + phone + CC + government IDs + customer self-identified names
  - `src/pages/ProductSSOT.jsx` (NEW UI) — `/product-ssot/:productId` per §13.1
  - `src/components/operations/CustomerFeedbackWidget.jsx` (NEW) — Self-Renewal Capability Package addition per CA-9-C.5
  - `api/customer/feedback.js` + `api/customer/support-ticket-webhook.js` (NEW) — Agent #10 ingestion endpoints
- **Pre-promotion archive:** `docs/archive/FLOWAI_SSOT-pre-CA9-CA10-promotion-2026-05-15.md` (verbatim copy of canonical CANONICAL_REFERENCE.md immediately before this CA-9+CA-10 insertion; 895 lines, 68,432 bytes)
- **Lineage:** Rev-2.1 canonical (commit `9495b26`) → ENTRY 003 → ENTRY 004 (CA-7+CA-8 promotion at commit `fd94f1e`) → CA-9 draft `SSOT_AMENDMENT_CA9_DRAFT.md` + CA-10 draft `SSOT_AMENDMENT_CA10_DRAFT.md` → W6 panel `cc5fd8d` (7/8 SUPERMAJORITY/UNANIMOUS) → CEO arbitration CA-9-Q4=(b) → CEO ratification → this entry

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ENTRY 006 — 2026-05-16
- **Promotion:** Aggressive Crawl Engine (ACE) promotion to canonical SSOT — closes parking-lot ENTRY 002 (CEO 2026-05-14, "aggressive exhaustive crawler GTM-readiness bar")
- **Promoted by:** W3
- **Source spec:** `docs/specs/AGGRESSIVE_CRAWL_ENGINE_SPEC.md` (commit `5b30dce`, drafted by W3 2026-05-15)
- **Panel signal:** **7× UNANIMOUS** on Q1, Q2, Q3, Q4, Q5, Q7, Q8 (W6 panel commit `05ac6f4`) + **CEO arbitration on Q6** (`(c)` non-destructive triggers always-on; XSS form-submit triggers opt-in only with operator confirmation + dev/staging-environment-only gate)
- **Panel questions covered (all 8 ACE Open Questions §G):**
  - **G-Q1** — Depth + page-count hard caps: **UNANIMOUS_(a)** default depth=8 / cap 12; default pages=200 / cap 2000
  - **G-Q2** — Agent ownership: **UNANIMOUS_(a)** Option B — Agent #21 Ops Runner Alpha pinned as Aggressive Crawl Conductor (resolves Rev-2.1 §27 OQ-2 partially)
  - **G-Q3** — AI-agent probe safety: **UNANIMOUS_(a)** benign probe `"Reply with the single word: ACK"` as proposed
  - **G-Q4** — Parallelization scope: **UNANIMOUS_(a)** 5 concurrent pages per product, 1 product at a time
  - **G-Q5** — Fix-loop autonomy on `medium`: **UNANIMOUS_(a)** auto-fix `low` + `medium`; `high` + `critical` human-gated
  - **G-Q6** — Error-state trigger defaults: **CEO arbitration `(c)`** — non-destructive triggers (404 probe, 500 probe, network offline, slow-network) always-on by default; form-submit triggers (empty-required + XSS echo) opt-in only requiring operator confirmation that SUT is in dev/staging environment, never prd; never default-enabled
  - **G-Q7** — GTM Readiness score formula: **UNANIMOUS_(a)** 10/5/2/0.5 deductions per crit/high/med/low; 4 bands as proposed
  - **G-Q8** — Per-run cost ceiling: **UNANIMOUS_(a)** $15/run/product/env (3× nominal pipeline) with per-product Doppler override
- **CEO disposition:** Ratified under MG2 (≥7/10 ENGAGED) + Locked Rule 13 (CEO retains absolute veto); 7 questions cleared supermajority unanimously; Q6 arbitrated to `(c)` (non-destructive default + XSS opt-in only)
- **Sections affected in `docs/CANONICAL_REFERENCE.md`:**
  - **§6 AGGRESSIVE CRAWLING, TESTING & RESOLUTION CONTRACT** — crawl scope substantively expanded:
    - Default depth 2 → 8; hard cap depth 3 → 12 (Doppler-overridable)
    - Default pages 8 → 200; hard cap pages 50 → 2000 (Doppler-overridable)
    - Per-page rendering: Browserless `/content` → Browserless `/function` (`richCapture`) for every page
    - 6-pass interaction model added (initial render, auth handling, click-everything, modal probing, AI-agent benign-probe, form catalog + network log + external script catalog)
    - Mobile (375×667) + desktop (1920×1080) viewports both crawled
    - Deliberate error-state triggers: 404 / 500 / offline / slow-network always-on; XSS form-submit opt-in only per CEO arbitration Q6=(c)
    - Card / interactive-tile coverage formalised
    - Orchestra wiring documented inline (Agent #21 dispatches `playwright` + `browserless` + `anthropic-api`; $15/run cost ceiling)
    - Credential handling: Playwright `storageState` ephemeral path `tmp/playwright-state-<runId>/` auto-deleted at run end
  - **§7.6 (NEW)** — GTM Readiness Report: per-product per-environment 100-point score (`100 − 10·crit − 5·high − 2·med − 0.5·low`, clamped [0, 100]); 4 score bands (Showcase-ready 90-100 / Demo-ready 75-89 / Internal-only 60-74 / Not demo-ready 0-59); maps to §11 Clearance Step 5 with 4-prerequisite gate (report exists + score ≥75 + zero critical + Self-Renewal terminal decisions on `high`+); 6-section per-surface grouping (Links / Cards / Modals / Pages / Engines / AI agents); top-5 ranked "Top fixes before any prospect demo"; ProductSSOT `governance_record` integration (kind `gtm_readiness_score`); audit-log topic `21.gtm.readiness.v1`
  - **§15.1 row 21 Ops Runner Alpha** — pinned as **Aggressive Crawl Conductor**: step-owner mode; cross-step within step 1 research + step 8 monitor; authority `[recommend_only, auto_write_internal, requires_human_gate]` (dual + gate mirroring Agent #26 per CA-9-Q4=(b)); consumes `1.crawl.request.v1`, `10.ssot.updated.v1`; produces `21.crawl.completed.v1`, `21.issues.detected.v1`, `21.gtm.readiness.v1`; writes to ProductSSOT `architecture_snapshot` + `governance_record`; required credentials `BROWSERLESS_API_KEY` + `ANTHROPIC_API_KEY`; marketplace tools `playwright` + `browserless` + `anthropic-api`; escalation: `xss-in-form-echo` or `auth-gate-leak` → IMMEDIATE admin gate; budget exceeded → escalate Ops Runner Beta; 3 consecutive failures on same product → 24h crawl disable
  - **§15.2 MessageBus** — topic count **61 → 65** (4 new constants: `1.crawl.request.v1`, `21.crawl.completed.v1`, `21.issues.detected.v1`, `21.gtm.readiness.v1`); ENTRY 005 cohort retained; running total 40 → 61 → 65 across ENTRY 005 + ENTRY 006 promotions
  - **§18.4 Ratified amendments** — ENTRY 006 row added with full provenance + CEO Q6 arbitration documented inline
- **Issue detection coverage (Aggressive Crawl Engine canonical detector set; informs §6 + §7.6 score computation):** 12 new categories + 2 tightenings on existing — `ai-agent-unreachable` (tighten to require benign probe), `ai-agent-no-response`, `broken-modal`, `dead-card`, `engine-error`, `auth-gate-leak`, `console-error`, `network-failure`, `slow-route`, `missing-404-handler`, `missing-500-handler`, `no-offline-indicator`, `no-loading-indicator-on-slow-net`, `no-form-validation`, `xss-in-form-echo` (hard-classified critical, not promotable via override per CA-10-Q3), `external-script-leak`, `accessibility-headings` (tighten), `accessibility-alt-text`. Engineering dispatch implements in `api/_lib/issueDetector.js` per spec §B.1.
- **Engineering impact (out of scope for this commit; landed in follow-up dispatches per spec §H — ~18 W-days):**
  - `api/_lib/aggressiveCrawlEngine.js` (NEW) — full-site spider with click + modal + AI-probe + viewport + auth + error-trigger passes (~5 W-days)
  - `api/_lib/inputAdapters/url.js` — graduation: replace current `aggressiveCrawl()` with engine call; preserve function signature for backwards compat (~1 W-day)
  - `api/_lib/issueDetector.js` — 12 new categories + 2 tightenings + severity routing per spec §B (~2 W-days)
  - `api/_lib/gtmReadinessReport.js` (NEW) — score computation + 6-section grouping + top-5 ranking + Markdown/JSON renderer + per-finding screenshot evidence (~2 W-days)
  - `api/agent/21/run-aggressive-crawl.js` (NEW endpoint, Inngest-backed long-running job per Orchestra spec §6.2 Path Y) — ~1 W-day
  - `src/lib/agents/_registry.ts` AGENT_REGISTRY row #21 — full charter wiring per §15.1 (assumes CA-9-B dual-authority `BaseAgent.guard()` amendment landed in ENTRY 005) — ~1 W-day
  - `src/lib/agents/MessageSchema.js` — +4 topic constants (61 → 65) + audit-log integration — ~0.5 W-day
  - ProductSSOT integration: writes to `architecture_snapshot` + `governance_record` (`kind='gtm_readiness_score'`) per spec §C.3 + CA-10-A.4 atomic-write — ~1 W-day
  - §11 Clearance Step 5 gating: 4-prerequisite check per §7.6 — ~0.5 W-day
  - Test plan execution against 5 VEU products (neutral fixtures per §22; productScope `tenant_*` strings in `ProductRegistry` only) — ~2 W-days
  - `MockBrowserless` + `MockPlaywright` fixtures for Vitest — ~1 W-day
  - Documentation: `/architecture` UI update per §16 + spec cross-links — ~1 W-day
  - Rollout to prd (canary 1 product → 3 products → all 5; per Rev-2.1 §16.3 dual-deployment) — ~1 W-day
- **Pre-promotion archive:** `docs/archive/FLOWAI_SSOT-pre-ACE-promotion-2026-05-16.md` (verbatim copy of canonical `docs/CANONICAL_REFERENCE.md` immediately before the §6 + §7.6 + §15.1 + §15.2 + §18.4 ACE edits applied; 1037 lines, 92,561 bytes)
- **Lineage:** Rev-2.1 canonical (commit `9495b26`) → ENTRY 003 (Rev-2.1 promotion) → ENTRY 004 (CA-7+CA-8 promotion, commit `fd94f1e`) → ENTRY 005 (CA-9+CA-10 promotion, commit `5dcd865`) → ACE spec draft `AGGRESSIVE_CRAWL_ENGINE_SPEC.md` (commit `5b30dce`) → W6 panel `05ac6f4` (7× UNANIMOUS + Q6 arbitration) → CEO ratification → this entry

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ENTRY 007 — 2026-05-16
- **Completion:** Phase 3 — Auth Traversal **COMPLETE** (all 5 chunks delivered)
- **Spec baseline:** `docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md` v3 (frozen at commit `be594e3` — "Option B screenshots deferred, memory-MUST, 9-lang i18n, 90d+1yr retention")
- **Commits (5 chunks, in order):**
  - **CHUNK 1** — `7727f8d` (W5a): AGENT_21 capability boundary blueprint
  - **CHUNK 2** — `fcb4de8` (W5a): Agent #21 Executor + 3 auth helpers + EXECUTOR_REGISTRY entry
  - **CHUNK 3** — `fdad6b7` (W5a): `scrubArtifacts.js` — DOM / network-log / delta scrubbers
  - **CHUNK 4** — landed inside `8daec3f` (commit message reads "W3: Agent #13 Self-Protection engineering spec"; auth-traversal code files bundled in via concurrent `git add -A` by another workstream — see § Note below)
  - **CHUNK 5** — landed inside `076a35b` (commit message reads "W6: 18-agent consolidated adversarial Panel"; auth-traversal code files bundled in similarly — see § Note below)
- **Status:** COMPLETE
  - 1656 / 1656 tests pass
  - All 10 invariants from AUTH_TRAVERSAL_SECURITY_SPEC v3 §1 tested (I1 credentials never logged; I2 storageState memory-only MUST; I3 MFA / CAPTCHA / 401 / 403 fail-loud; I4 cross-origin REFUSE; I5 strict same-origin; I6 scrubCredentials at every external-send boundary; I7 one-shot credentials per runId; I8 session-only credentials; I9 audit-log injection guards; I10 memory-resident credential lifetime)
  - All 9 i18n language families (en / es / fr / pt / de / zh-CN / ja / ko / ar) tested with localized login forms
  - No-screenshot regression guard active (Option B canonical per v3 §1)
- **Capability unlocked:** FlowAI can now perform authenticated multi-page crawls of operator-owned products using real credentials, with full credential scrubbing, MFA fail-loud, and audit-log retention per `auth_short` class (90 days hot + 1 year cold per v3 baseline).
- **§ Note on commit mis-attribution (CHUNK 4 + CHUNK 5):**
  - **What happened:** During the dispatch window 2026-05-16 21:00–21:30 ET, two W3 commits (`8daec3f` Agent #13 spec, `076a35b` 18-agent Panel artifacts) bundled additional `api/agent/21/execute.js` + `src/lib/agents/auth/*` files that belonged to W5a's Phase 3 chunks 4 + 5. Bundling occurred because a parallel workstream had staged Phase 3 chunk work via `git add -A` (or equivalent broad-staging operation) that landed in the index just before the W3 / W6 commits ran their `git add <specific-file>` + `git commit` pair, sweeping the staged Phase 3 files into the wrong commits.
  - **Code state:** **CORRECT.** All Phase 3 chunk files are present on `flowai-v0.1`, tests pass, no functional defects — only the commit-message attribution is misleading.
  - **Future fix (binding for all workstreams W0..W6):** ALWAYS use `git add <specific-file>` (or `git restore --staged . && git add <specific-file>`) before `git commit`; NEVER use `git add -A` / `git add .` / `git add -u` in any workstream commit path. W3 adopted the `git restore --staged . && git add <specific-file>` pattern at Agent #14 spec (commit `469e07c`) onwards in Dispatch #6; recommendation: codify as a Locked Rule at the next CANONICAL_REFERENCE.md amendment cycle.
- **Lineage:** AUTH_TRAVERSAL_SECURITY_SPEC v3 freeze (commit `be594e3`) → CHUNK 1 (`7727f8d`) → CHUNK 2 (`fcb4de8`) → CHUNK 3 (`fdad6b7`) → CHUNK 4 (in `8daec3f`) → CHUNK 5 (in `076a35b`) → 1656/1656 tests green → this entry

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ENTRY 008 — 2026-05-17
- **Session:** 2026-05-16 / 2026-05-17 overnight. Major canonical decisions, dispatched across W2, W3, W3a, W5a, W5c, W6, with CEO arbitrations.
- **Canonical product rename — MyBirthSafe → MyPregLife (commit `be4f991`):**
  - Applied 7 case patterns (PascalCase, lowercase, kebab-case, snake_case, UPPER, `.app` domain variants).
  - 318 textual replacements across 82 tracked files spanning `src/`, `api/`, `docs/`, `scripts/`, `tests/`, `specs/` (including historical archives and panel-consultation transcripts so all future searches find every reference).
  - Preserved per dispatch: `safe-path.base44.app` (the actual Base44-hosting dev URL) — verified intact at 9 surviving call sites.
  - Three product-validation scope arrays (`BaseAgent.PRODUCT_ORG`, `MessageSchema` topic-scope validator list, `CredentialAdapter` cross-product isolator) updated consistently; Locked Rule 7 invariant preserved.
  - 1656 / 1656 tests passed post-rename — textual swap only, zero logic / schema / field renames beyond the literal product-name string.
- **5 VEU products cloned to Vercel under `veu-ai-studio` GitHub org:** SAIGE, PressAI (OurPublishingAI), ReachSMS (OurCommunitiesAI), RelTwin, MyPregLife — now consolidated under one org for unified deployment, CI, and FlowAI assessment-target reachability. Per-product `.base44.app` and custom-domain mappings preserved.
- **Agent #4 Provider Onboarding reclassified SHIPPED-GREEN → PARTIAL (commit `88113f2`, Panel ruling FA-Q1 unanimous):**
  - §15.1 row 4 updated. Rationale: executor code exists in `src/lib/agents/agents/Agent4ProviderOnboarding.js` but Stripe Connect SDK wiring, webhook receiver, and Connect Express flow are not live in the deployed Vercel env — corroborated by §3 line 47 ("DORMANT today") and the 2026-05-13 agent-wiring panel ("deployed app shows onboarding is incomplete").
  - PARTIAL captures the truth: code shipped, deployment incomplete. Original landing commit reference `5006431` preserved for git provenance.
  - **Open consistency follow-up:** three other SSOT call sites still describe Agent #4 as SHIPPED-GREEN (§4 L1 line 70, §26 status line 1006) or DORMANT (§3 line 47). Whole-file reconciliation deferred to a follow-up dispatch; §15.1 row 4 is the canonical roster row and is correct.
- **MessageBus P0 wiring gap formally identified — 4 production stub sites:**
  - `api/research-url.js:30` (Agent #21 Conductor on the live AutoRunner research path)
  - `api/agent/21/execute.js:283` (Agent #21 Conductor Executor sync endpoint)
  - `api/agent/3/execute.js:189` (Agent #3 Self-Renewal Executor sync endpoint)
  - `api/_lib/inngest.js:207` (Inngest cron / async-event executor harness)
  - All four instantiate the agent with `{ publish: async () => {} }` — the canonical `src/lib/agents/MessageBus.ts` (real implementation, ~210 lines, topic validation) is bypassed entirely. Zero `21.crawl.completed.v1` / `21.issues.detected.v1` / `21.gtm.readiness.v1` / `3.ssot.delta.v1` topics fire in production. Inventory landed in `docs/specs/FOUNDATION_AUDIT_BACKLOG.md` (commit `b48c856`) as P1-4; recorded here for canonical visibility. Remediation plan: shared `api/_lib/messageBus.js` exporting `getServerMessageBus()` singleton, injected at all four sites; per-fix regression test asserting topic landed.
- **ProductSSOT P0 — entity unbuilt, every pipeline run silently bypasses §7 Output Contract item #5:**
  - `ls src/lib/productSSOT` / `ls src/pages/ProductSSOT*` / `ls api/product-ssot` → all return "no such directory". The `ProductSSOT` string appears in agent comments only.
  - §7 line 132 mandates atomic write-or-rollback with each output; today every run silently completes without the write. §11 Step 5 four-prerequisite gate is unenforceable. §28 (Agent #6 pre-run read, narrowing crawl scope) is blocked.
  - **CEO Q4 disposition (this session):** HYBRID approach locked — append-only DB rows for the canonical `delta_log` / `governance_record` blocks + UI-synthesis view that composes the current state from append-history. Per-block conflict resolution per §28.4. Resolves the spec's prior ambiguity between "rolling document" and "append-only ledger" by treating the ledger as canonical and the document as a synthesised view.
- **6 systemic cluster-fix canonical templates drafted then revised to v2:**
  - v1 drafts (commits `4b0bbc0`..`9859b98`): CLUSTER_A through CLUSTER_F. Each addresses a recurring failure mode the Panel surfaced across multiple agent specs.
    - CLUSTER_A — Boundary-class membership template (CredentialAdapter scope correctness)
    - CLUSTER_B — Test-bypass-token RS256 issuance + verification
    - CLUSTER_C — MessageBus topic registration + schema-validator
    - CLUSTER_D — Audit-log topic schema + envelope
    - CLUSTER_E — Authority-ceiling integration (recommend_only / auto_write_internal / requires_human_gate per CA-7 + CA-9-Q4=(b))
    - CLUSTER_F — Model-budget fallback (per-call retry-with-cheaper-model when budget pressure detected)
  - W6 adversarial Panel ratification (`10b13f9`) found 6 conditions across the cluster set; v2 revisions (commits `5c5d3d1`, `87b4659`, `4caaa29`, `8486be8`, `664942d`, `16bc262`) addressed each Panel condition surgically.
- **20 agent engineering specs drafted (commits `61b13c9`..`9ca0a2c`):** complete blueprint set for Agents #6 through #26 (excluding the 5 SHIPPED-GREEN). Each spec includes capability boundary, MessageBus topic contracts, authority shape, escalation rules, charter-stable invariants, test-plan. Per §15.1 + cluster-template alignment. Indexed at `docs/specs/agent-blueprints/00_BUILD_INDEX.md`. Enables P2 (agent wave engineering) without spec-stage rework.
- **CA-9-Q4=(b) re-disposition: dual-authority agents route through EXECUTOR_REGISTRY sibling, not primary layer:**
  - Agents #21 (Aggressive Crawl Conductor) and #26 (Orchestra Research Agent) carry the dual-authority `[recommend_only, auto_write_internal, requires_human_gate]` shape per CA-7 §15.5 and CEO arbitration CA-9-Q4=(b).
  - Re-disposition this session: the `auto_write_internal` capability surface is provided via the EXECUTOR_REGISTRY sibling-namespace pattern (CA-7 §15.5), NOT via the primary `BaseAgent` authority layer. This keeps the canonical `BaseAgent.guard()` strict (per-invocation `authorityNeeded` set membership) while permitting split-charter agents to invoke their internal-write capability through the registry adapter.
  - Reflected in the Agent #21 Executor sync endpoint (`api/agent/21/execute.js`) and Agent #3 Self-Renewal Executor (`api/agent/3/execute.js`) — both consume the EXECUTOR_REGISTRY shape.
- **Self-Renewal v4 in progress (v1–v3 NOT_RATIFIED across multiple Panel passes):**
  - v3 (commit `79e4499`) tightened scope: App-only, single-file delivery, 3-state enum. W6 v3 + ProductSSOT v2 ratification (`1abfa37`, basis `79e4499` + `c59326a`) found 8 remaining conditions across the two specs.
  - v4 (in-flight) addresses those 8 conditions and will land as a separate commit. Holds the canonical Self-Renewal contract until ratified; until then, the Self-Renewal Executor uses the live commit `68a0c75` implementation (SHIPPED-GREEN per §15.1 row 3, fork-and-fix loop still PARTIAL per §4 L3 status footnote).
- **Phase 3 auth-traversal COMPLETE (commits `7727f8d`..`5202ede`):**
  - 5 chunks delivered (CHUNK 1–5). 1656/1656 tests passing. All 10 invariants from `AUTH_TRAVERSAL_SECURITY_SPEC.md` v3 §1 tested green. All 9 i18n language families tested with localized login forms. No-screenshot regression guard active (Option B canonical per v3 §1).
  - **Capability unlocked:** FlowAI can now perform authenticated multi-page crawls of operator-owned products with real credentials, full credential scrubbing, MFA fail-loud, and audit-log retention per `auth_short` class (90 days hot + 1 year cold).
  - Detail per ENTRY 007 above (separate entry to preserve chunk-by-chunk + commit mis-attribution audit trail). ENTRY 008 records the milestone here for session-summary completeness.
- **W2 surgical fixes this session (Defect A/B/C plus rewiring, all commits ancestral to `be4f991`):** crawler body-truncation cap raised 1500→50000 (Defect A, `4b6293e`); Monitor verdict deterministic + 11 regression tests (Defect B, `1880333`); Monitor consolidates prior step findings (Defect C, `79b0053`); UI→crawler routed through `/api/research-url` (`c770c71`); CrawlerQualityDot crash fix (`9b96a4d`); env-gated auth bypass `FLOWAI_AUTH_BYPASS` (`bac8649`); vite alias absolute path (`86c161f`); Tooltip case-collision (`ef83dc3`, `2f438fc`); Foundation Audit Backlog doc (`b48c856`).
- **Lineage:** ENTRY 007 (Phase 3 COMPLETE, commits `7727f8d`..`076a35b`) → W2 Defects A/B/C + UI rewire (commits `c770c71`..`79b0053`) → Foundation Audit Backlog `b48c856` → Agent #4 reclassify `88113f2` → cluster-fix v1 cohort (`4b0bbc0`..`9859b98`) → W6 cluster ratification (`10b13f9`) → cluster v2 cohort (`5c5d3d1`..`16bc262`) → Self-Renewal/ProductSSOT v3/v2 cohort (`79e4499`, `c59326a`, `1abfa37`) → MyBirthSafe→MyPregLife rename (`be4f991`) → this entry.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ENTRY 009 — 2026-05-17
- **Session:** W05 closing decisions + handover prep. Captures the W6 Consolidated Panel ratification cohort, 17-agent-spec status, Self-Renewal Phase A dispatch, ProductSSOT substrate unblock, MessageBus P0 wiring close-out, and the open W05→W06 handover gate.
- **W6 Consolidated Panel ratification (commit `871a182`) — verdicts on the 6 cluster-fix templates:**
  - **Cluster C — PROMOTED** (the only template ratified for canonical adoption this round). Topic + schema-validator pattern is the canonical MessageBus-touching template all downstream agent specs build against.
  - **Cluster D — PROMOTE-WITH-CONDITIONS** (conditions `D-a`, `D-b`, `D-c`). Audit-log topic envelope canonicalised; three targeted refinements required pre-implementation (envelope drift guards, retention-class binding, replay-buffer semantics).
  - **Cluster E — SPLIT improving** — v4 still required. Authority-ceiling integration template has not yet converged across reviewers; v4 (separate dispatch) addresses the remaining `recommend_only` vs `auto_write_internal` vs `requires_human_gate` boundary cases.
  - **Cluster A — Path P1 ACCEPT-WITH-CONDITIONS** (`A-a`, `A-b`, `A-c`, `A-d`). The boundary-class membership template lands as-is plus four conditions — explicitly NOT rearchitected. P1 is the canonical path; Path P2 (rearchitect) is closed.
  - **Cluster F — REGRESSED.** Revert to v2 + adopt `F-a` operator opt-in alert ONLY. The v3 model-budget-fallback machinery from `9859b98` is rolled back; v2 remains canonical; the only addition is the F-a opt-in operator alert when model fallback fires.
- **17 agent specs (Wave 1 cohort) — Panel verdict:** 0 PROMOTE, 3 ACCEPT-WITH-CONDITIONS (Agents #7 Design, #15 Benchmarking, #19 Technological Evolution), 14 REVISE. **Wave 1 BLOCKED** — engineering wire-in for Wave 1 does not begin until the 14 REVISE specs ship v2 + re-ratify. The 3 conditional specs proceed in parallel as conditional drafts; their conditions block deploy, not draft progress.
- **Self-Renewal Phase A build DISPATCHED.** W05 explicit exit criterion: produce a working preview URL from a real product input (live SPA target). This is the canonical externalised-output proof per §4 L3 status footnote and §6 Resolution contract terminal-decision loop. Phase A is the minimal viable fork-and-fix cycle: ingest URL → ACE multi-page crawl (Agent #21 Conductor, ENTRY 007) → issueDetector → propose-fix → Self-Renewal Executor produces renewed preview URL → re-crawl verifies → terminal decision. Phase B / C extend coverage (auth-gated, multi-input synthesis, cross-product). Until Phase A ships green end-to-end on a real product, W05 cannot close.
- **ProductSSOT migration 0013 committed (`7edd58d`) — W2 build unblocked.** `supabase/migrations/0013_product_ssot.sql` lands the `product_ssot` + `product_ssot_version` substrate per PRODUCT_SSOT_SPEC v3 (commit `030149f`) §2 schema. 6 canonical jsonb blocks (identity_block / build_brief / architecture_snapshot / delta_log / governance_record / annotations + overrides). Append-only version log per CEO Q4 HYBRID disposition. 4 read-only RLS policies (admin / operator / client / flowai_audit). Application-layer atomic-write logic + UI surface land in a follow-up W2 + W5x dispatch. Closes FOUNDATION_AUDIT_BACKLOG **P0-2** (entity UNBUILT) and unblocks **P0-5** (atomic write — substrate now exists).
- **MessageBus P0 wiring COMPLETE (commits `c56743c`..`4b432f6`):**
  - 1656 / 1656 tests pass throughout. The four production stub sites identified in ENTRY 008 (api/research-url.js:30, api/agent/21/execute.js:283, api/agent/3/execute.js:189, api/_lib/inngest.js:207) are replaced with the canonical `getServerMessageBus()` singleton injection. Real MessageBus emits all declared topics — `1.crawl.request.v1`, `21.crawl.completed.v1`, `21.issues.detected.v1`, `21.gtm.readiness.v1`, `3.ssot.delta.v1` — fire in production.
  - Closes FOUNDATION_AUDIT_BACKLOG **P1-4**. Unblocks downstream agent topic-consumption work (Agent #10 customer-signal ingest, Agent #17 deprecation proposals, Agent #26 auto-admission gate observation).
- **Self-Renewal v4 RATIFIED (commit `ab01583` + C1 fix `cd07328`).** The 8 conditions raised on the v3 Panel pass (`1abfa37`) are all addressed in v4. C1 conditional fix at `cd07328` closes the last open item. Self-Renewal Executor + spec are now canonical; the Phase A build dispatched above implements against this v4 contract.
- **CA-9-Q4 Option (a) LOCKED — Agents #21 + #26 via EXECUTOR_REGISTRY sibling pattern.** Earlier session work referenced Option (b) `requires_human_gate` paired with `auto_write_internal` per the CEO's initial CA-9-Q4 arbitration. This session re-disposes to **Option (a) — EXECUTOR_REGISTRY sibling, per CA-7 §15.5**, which provides the `auto_write_internal` capability surface through the registry adapter rather than the primary `BaseAgent` authority layer. Keeps `BaseAgent.guard()` strict per-invocation `authorityNeeded` set membership; permits split-charter agents to invoke internal-write capability through the sibling namespace. Reflected in `api/agent/21/execute.js` and `api/agent/3/execute.js` executor wiring.
- **Agent #4 stale refs fixed (`8b2be5f`).** §3 line 47, §4 L1 line 70, §26 line 1006 reconciled from SHIPPED-GREEN / DORMANT to PARTIAL — matches the canonical §15.1 row 4 status from ENTRY 008's `88113f2` reclassification. SSOT is now internally consistent on Agent #4.
- **W05 → W06 handover PENDING.** Single gating criterion: Self-Renewal Phase A produces a working preview URL from a real product input. Until that lands green, W05 stays open. All other Wave 1 prerequisites (ProductSSOT substrate, MessageBus wiring, Self-Renewal v4 contract, cluster-fix Cluster C canonical template, Phase 3 auth-traversal) are CLOSED. Once Phase A passes, W05 emits the handover packet to W06 (architectural review + readiness sign-off).
- **Lineage:** ENTRY 008 (session 2026-05-16/17 major decisions) → MessageBus wiring cohort (`c56743c`..`4b432f6`) → Self-Renewal v4 ratification (`ab01583` + `cd07328`) → cluster-fix Panel ratification (`871a182`) → Agent #4 stale-refs reconciliation (`8b2be5f`) → ProductSSOT migration 0013 (`7edd58d`) → 17 agent-spec ratification verdict + Self-Renewal Phase A dispatch → this entry.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ENTRY 010 — 2026-05-18
- **Session:** W05 continued — FlowAI Phase A build and live verification. End-to-end Self-Renewal cycle reached production (real GitHub branch pushed + real Vercel preview URL deployed against a real VEU product).
- **GitHub App `flowai-self-renewal` provisioned + installed on `veu-ai-studio` org:**
  - App ID `3748219`, Installation ID `133220298`. Live credentials managed via Doppler. Replaces personal-access-token (PAT) flow with installation-token issuance per `SELF_RENEWAL_SPEC` v4 §6.1 credential-mode `'app'`.
- **All credentials staged in Doppler `prd` + `dev` configs:**
  - `GITHUB_APP_ID`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`.
  - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_*` (one per VEU product — 5 entries: SAIGE, PressAI, ReachSMS, RelTwin, MyPregLife).
- **Migrations 0013 + 0014 + 0015 APPLIED to live Supabase (`prd`):**
  - `0013_product_ssot.sql` → `product_ssot` + `product_ssot_version` tables + 4 read-only RLS policies (admin / operator / client / flowai_audit) + indexes. ENTRY 008 substrate now live. Closes FOUNDATION_AUDIT_BACKLOG P0-2.
  - `0014_product_registry.sql` → `product_registry` table + 13 `self_renewal_*` columns + `product_registry_negative_delta_cross_check` constraint + `product_registry_set_updated_at` trigger. 5 seed rows present (mypreglife / pressai / reachsms / reltwin / saige); `mypreglife.self_renewal_enabled = true` confirmed.
  - `0015_product_market_definitions.sql` → `market_definition` text column added; all 5 product rows seeded with the canonical §1.1 market definitions. Mirrors the SSOT §1.1 verbatim.
- **Self-Renewal Phase A — 10 modules built:**
  1. `githubApp` — GitHub App installation-token issuance, branch HEAD fetch, repo metadata.
  2. `branchWriter` — Git tree assembly + branch creation via Contents API.
  3. `prWriter` — Pull-Request open / metadata / status hooks.
  4. `fixGenerator` — issueDetector → patch proposal pipeline producing Conventional-Commits-style change sets.
  5. `vercelBranchDeploy` — REST `/v13/deployments` with `gitSource` ref pointing at the renewal branch; polls `readyState`.
  6. `preScoreAdapter` — pre-fix GTM Readiness baseline so deltas are measurable.
  7. `deltaPolicy` — Spec §6.4 R2 invariant enforcement: discard-on-negative vs always-open paths; minimum-delta threshold checks.
  8. `rateCap` — per-product max-per-day runaway protection + spec §6.5 cost ceiling.
  9. `optionCPipeline` — the canonical Option-C build per Spec §5: full crawl → detect → fix → branch → deploy → re-score → terminal decision.
  10. `orchestrator` — top-level controller orchestrating the 14-step repeat-until-GTM pipeline.
- **Orchestrator contract:** 14-step repeat-until-GTM pipeline with **auto / guided / manual** mode dispatch + **stop / resume / switchMode** controls (per SELF_RENEWAL_SPEC v4 + cluster-E authority-ceiling alignment). Branches pruned per `self_renewal_branch_retention_days` policy in `product_registry`.
- **Real scoring graduated (proof of measurement integrity):**
  - Title-only baseline: 18 / 100 (insufficient context — confirms the scorer rejects shallow input).
  - With GitHub-source enrichment (build_brief from README/code structure): 42 / 100. The 24-point delta is the proof FlowAI can drive substantive scoring with real DOM + source signals, not synthetic priors.
- **Product-agnostic PATH A/B URL handling:** the orchestrator's path resolver supports both PATH A (canonical custom domain — e.g. `preglife.com`) and PATH B (Base44 dev URL — e.g. `safe-path.base44.app`) inputs without per-product code branches. Resolution is registry-driven (`product_registry.github_repo_url` + `vercel_project_id`); no hard-coded product names in the resolver.
- **Crawl output wired to scorer:** Agent #21 Conductor's multi-page rich-capture output (post-ENTRY 007 Phase 3 + ENTRY 008 multi-page wiring) feeds the §7.6 GTM Readiness scoring pipeline. Replaces the prior single-page fallback path. Closes the Defect-A 50k-char body-truncation lineage.
- **Product market definitions PERMANENTLY captured (CEO instruction 2026-05-18 — see ENTRY 008 + 009 lineage):**
  - SSOT §1.1 (commit `c49f074`) — canonical table for all 5 products with the canonical full-market definitions + the "PERMANENT, must not be overwritten" rule.
  - Live DB mirror (commit `91f0c71`, migration 0015 applied) — `product_registry.market_definition` populated on all 5 rows.
  - These definitions are the authoritative scope inputs for Agent #21 issue-detection + §7.6 GTM Readiness scoring. **A narrow interpretation here produces wrong scoring criteria** — the SSOT §7.6 "Market-definition scope" clause enforces full-market evaluation.
- **First real Self-Renewal cycle executed end-to-end:**
  - Real branch pushed to GitHub: `flowai/renewal-b2ee1335-iter1` on `veu-ai-studio/my-preg-life`. Branch created via the installation-token flow; commit signed by the GitHub App.
  - Real Vercel preview URL produced: `mypreglife-platform-pjiyhvlyy-veu-ai-studio.vercel.app`. Deployment triggered via `gitSource` ref → the renewal branch; deploy reached `readyState: READY`. This is the first FlowAI fork-and-fix output that exists as a real working URL on a real VEU product. Closes §4 L3 status footnote's "full crawl-fix-redeliver loop awaits Agent #3 graduation."
- **Tests:** 2012+ passing, zero regressions across the 10-module Phase A build. No prior tests broken; every new module ships with its own regression suite + integration test against the orchestrator.
- **Remaining for full Phase A close:**
  - FlowAI Dashboard UI for live run observation (per `/architecture` + `/clearance` integration).
  - SSE streaming for run-progress telemetry from the orchestrator to the UI.
  - Crawl adapter polish — registry-driven crawl hints from `architecture_snapshot.pages[]` (per §28 narrow-the-scope optimisation).
  - Branch cleanup scheduler — cron-driven retention enforcement per `self_renewal_branch_retention_days`.
  - Full GTM-ready loop verified end-to-end (the current 42/100 is a single-pass demonstration; the canonical GTM-ready target is ≥75/100 sustained across the repeat-until-GTM loop until terminal decision).
- **Lineage:** ENTRY 008 (session 2026-05-16/17 — substrate, migrations, MessageBus wiring, foundation audit) → ENTRY 009 (W05 closing decisions — cluster ratifications, Self-Renewal v4, agent specs, ProductSSOT migration committed) → migration 0013 + 0014 + 0015 applied to live Supabase → GitHub App + Doppler credential rollout → 10-module Phase A build (`flowai/renewal-b2ee1335-iter1` evidence trail) → live `mypreglife-platform-pjiyhvlyy-veu-ai-studio.vercel.app` proof → SSOT §1.1 market-definition canon (commit `c49f074`) + DB mirror (commit `91f0c71`) → this entry.

### ENTRY 015 — 2026-05-19 — Cleared-8 promotion (W6 quorum-fix rerun)

- **Session:** W6 ran a quorum-fix rerun on the four parked/pending CA drafts (CA-13 + CA-14 + CA-15 + CA-16) using focused per-amendment runs with ≤~30K-char bundles to match the proven 27,778-char engagement recipe. Result: eight individually quorum-cleared questions across CA-14 + CA-16; zero cleared on CA-13 or CA-15. Per CEO Locked Rule 13 decision (this entry), the cleared-8 promote in a one-shot pass; the remaining 19 questions re-Panel via v2 drafts (CA-13 v2 / CA-15 v2 / CA-16 v2, this commit's siblings — commits `8b38156`, `746bb7e`, `d366acf`).

- **Panel evidence (commit `cc14a8f`):**
  - `docs/panel-consultations/ca-13-quorum-fix-rerun-2026-05-19.md` — 32412 chars, 8/10 engaged, 34 distinct objections, 0/5 cleared, alignment 32.5% ✅ PASS dissent floor.
  - `docs/panel-consultations/ca-14-quorum-fix-rerun-2026-05-19.md` — 34212 chars, 10/10 engaged, 36 distinct objections, **6/11 cleared**, alignment 64.5% ✅ PASS.
  - `docs/panel-consultations/ca-15-quorum-fix-rerun-2026-05-19.md` — 32370 chars, 8/10 engaged, 31 distinct objections, 0/11 cleared, alignment 17.0% ✅ PASS.
  - `docs/panel-consultations/ca-16-quorum-fix-rerun-2026-05-19.md` — 31224 chars, 9/10 engaged, 31 distinct objections, **2/11 cleared**, alignment 43.4% ✅ PASS.
  - Cross-summary at `ca13-14-15-16-quorum-fix-rerun-2026-05-19.md`.

- **Cleared-8 questions + verdicts (the 8 items ratified by ENTRY 015):**

  | # | Question | Verdict | Top / Engaged | Target |
  |---|---|---|---|---|
  | 1 | CA-14-A-Q2 | `QUORUM_PLURALITY_CA14AQ2-RATIFY` | 7/10 | §7 LIMITATIONS verbatim wording |
  | 2 | CA-14-A-Q3 | `SUPERMAJORITY_CA14AQ3-AGENT21` | 8/10 | Agent #21 owns Phase B (§15.1 row 21) |
  | 3 | CA-14-A-Q4 | `SUPERMAJORITY_CA14AQ4-RATIFY` | 8/10 | NEW Locked Rule 19 (Phase A vs B) |
  | 4 | CA-14-B-Q1 | `QUORUM_PLURALITY_CA14BQ1-RATIFY` | 7/10 | §7 NEW item #6 (5 fix-safety invariants) |
  | 5 | CA-14-B-Q2 | `QUORUM_PLURALITY_CA14BQ2-RATIFY` | 7/10 | "FlowAI NEVER ships a fix" guarantee |
  | 6 | CA-14-D-Q1 | `SUPERMAJORITY_CA14DQ1-RATIFY` | 8/10 | §7.5.1 NEW (3 operational invariants) |
  | 7 | CA-16-B-Q3 | `QUORUM_PLURALITY_CA16BQ3-RATIFY` | 7/9 | §11.7 Redesign/Build admin-gated approval |
  | 8 | CA-16-C-Q4 | `SUPERMAJORITY_CA16CQ4-RATIFY` | 8/9 | §7.6 formula-generalization invariant |

  All 8 cleared with drafted-(a) ≥7/engaged per Locked Rule 17. Four questions (CA-14-A-Q3 + CA-14-A-Q4 + CA-14-D-Q1 + CA-16-C-Q4) cleared at supermajority threshold (≥8/engaged).

- **Pre-promotion archive:** `docs/archive/FLOWAI_SSOT-pre-ENTRY015-promotion-2026-05-19.md` per §18.3. Captures canonical SSOT state at end-of-ENTRY-010 (no intervening §18.4 entries; ENTRY 011–014 are session-log drafts only, not yet in §18.4).

- **What's still parked / pending:**
  - **CA-13** (75→95 GTM bar + CA-9-Q4 §15 wording reconciliation): all 5 questions below quorum at quorum-fix rerun. CA-13 v2 draft (commit `8b38156`) applies REVISE directions per CEO dispatch — 95-bar DEFER, Near-GTM band ELIMINATE, capability-keyed sibling naming.
  - **CA-15** (Multi-Dim Quality Audit + Purpose Capture + Purpose-Driven Optimization + SSOT-Conformance Gate): 0/11 cleared; every question REVISE or REJECT at quorum-fix rerun. CA-15 v2 (commit `746bb7e`) is a STRUCTURAL REWRITE per CEO dispatch — MERGE Multi-Dim into existing §10 5-dimension engine; Multi-Dim becomes telemetry (not equal-footing); purpose_record OPTIONAL not required; advisory not hard-gate.
  - **CA-16** (remaining 9 questions): CA-16 v2 draft (commit `d366acf`) applies REVISE directions — recommendation-schema DEFER engineering; remove "Step 1.5" from clearance; ratify CA-16-C-Q4 via this ENTRY 015 (already done); strict precision-over-recall target detection; Agent #21 owns Multi-Format detection (consistent with CA-14-A-Q3).
  - **CA-11 + CA-12** carry-forward from prior sessions; unchanged in this entry.

- **Honest scope footer.** ENTRY 015 promotes ONLY the 8 individually quorum-cleared questions. It does NOT promote the broader CA-14 or CA-16 amendments wholesale — the parked questions require CA-14 v2 / CA-16 v2 + further Panel review. ENTRY 015 is the canonical first partial-promotion in the §18.4 history (prior entries promoted whole CA bundles); this sets the precedent for question-level granular ratification when bundle-level Panel verdicts split. Code state for the cleared 8 questions already matches canonical text after this promotion (per Locked Rule 1 — D27–D38 + D39–D41 W5a arcs ship the implementation; ENTRY 015 closes the canonical-text gap).

- **Lineage:** ENTRY 010 (Phase A live build) → ENTRY 011 draft (D27–D38 arc) → ENTRY 012 draft (D39–D41 arc) → ENTRY 013 draft (CA-16 net-new scope) → ENTRY 014 draft (Path H CEO decision) → CA-13 + CA-14 joint Panel parked (`8e185a6`) → W6 quorum-fix rerun (`cc14a8f`) → CEO Locked Rule 13 cleared-8 ratification → **this entry** → CA-13 v2 / CA-15 v2 / CA-16 v2 drafts (sibling commits `8b38156` / `746bb7e` / `d366acf` this dispatch).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ENTRY 016 — 2026-05-19 — CA-17 BUILD/WIRE v3-FINAL ratification (CEO Decision A; Locked Rule 13 CEO-disposition track, not open re-Panel)

- **Session:** CEO has ratified the Build/Wire Construction Engine v3-FINAL spec as **CA-17 — the BINDING canonical construction contract**. The disposition is under Locked Rule 13 (CEO absolute veto + CEO-disposition track when Panel non-convergence is documented). No further open re-Panel is scheduled. Path H ENTRY 014 Stage 3 (build/wire) is **UNBLOCKED** at this entry.

- **Rationale (CEO Decision A, Locked Rule 13):** the Build/Wire spec has oscillated through J2 v1 strengthen → v2 over-extension → W6 v2 4-run re-Panel (`4400958`) which returned **0/8 cleared** (S1 SIMPLIFY 4/7, S2 DENSITY 3/7, S3 FULLBACKUP 4/10, S4 CSRF 5/10, S5 REJECT 4/10, S6 REJECT 5/10, S7 REJECT 6/9, S8 SIMPLIFY 6/9). Panel non-convergence at the 4-run is the documented trigger; CEO disposes per Locked Rule 13. The v3-FINAL spec applies the Panel-endorsed directions verbatim — rollbacks (S1/S7/S8 to v1), strengthenings (S2 density 100, S3 full-restore + row-count-diff <0.1%, S4 +CSRF 9th pillar), and softenings (S5 operator-confirm-to-fire, S6 narrow in-flight invalidation closed-6-kind list) — and routes to CEO ratification rather than another open re-Panel.

- **Binding canonical contract:** `docs/specs/BUILD_WIRE_ENGINE_SPEC_V3_FINAL_DRAFT.md` at commit `1d5e39b` (33,974 chars, ≤34K cap). This file is the canonical authority for the construction engine going forward — engineering dispatches implement against it; any future deviation requires a new CA cycle. The "DRAFT" suffix in the filename is preserved for git-traceability to the CONVERGENCE PASS lineage; the contents are RATIFIED-CANONICAL at this entry.

- **NON-OVERRIDABLE fidelity preserved verbatim per Path H ENTRY 014:** the CEO-locked NON-OVERRIDABLE invariants are EXACTLY **S2 / S4 / S5 / S6** per Path H ENTRY 014 + Locked Rule 13. No other invariant carries non-overridable status. **S1 / S3 / S7 / S8 are PANEL-RATIFIABLE.** NON-OVERRIDABLE invariants remain strengthen-only with no reject path. v3-final's S5 + S6 softenings are framed as execution-gate / narrow-trigger refinements that preserve the underlying invariant (rollback safety net + drift detection) — the invariant itself is unchanged, only the execution trigger or trigger set is narrowed per Panel feedback.

- **Per-invariant v3-final disposition (summary; binding spec §3 is authoritative):**

  | # | Invariant | Status | v3-final disposition |
  |---|---|---|---|
  | S1 | Pre-construction baseline | PANEL-RATIFIABLE | 6-field MANDATORY + 4-field admin-opt-in extended via `construction_extended_baseline_enabled` toggle (default OFF). |
  | S2 🔒 | Bounded scope | NON-OVERRIDABLE | System caps 15/1500/3/4 unchanged; **density ceiling tightened 150→100 lines/file**. |
  | S3 | Schema migration testing | PANEL-RATIFIABLE | DLP STRENGTHENED: `pg_dump` + **full-restore to CI-ephemeral DB + row-count-diff <0.1%** for destructive statements (replaces v2 checksum-only). |
  | S4 🔒 | Construction security suite | NON-OVERRIDABLE | **9 pillars** (drafted 8 + CSRF); CSRF is hard pillar (advisory hybrid NOT adopted). |
  | S5 🔒 | Rollback substrate | NON-OVERRIDABLE | **Auto-detect + auto-prepare + operator-confirm-to-fire** on Phase B post-merge failure; 30-day primary + 90-day admin-config option (hard bounds [30, 90]); new envelope `construction_auto_rollback_pending_operator_confirm.v1`. |
  | S6 🔒 | Pre-construction approval | NON-OVERRIDABLE | **Narrow in-flight invalidation** — closed 6-kind list (`construction_pre_baseline.v1`, `architecture_snapshot.v1`, `gtm_bar_admin_override.v1`, `gtm_bar_admin_override_used.v1`, `construction_class.v1`, `purpose_drift_annotation.v1 severity:'critical'`); over-broad "any new entry" REJECTED. |
  | S7 | Branch-of-record | PANEL-RATIFIABLE | ROLLBACK to v1 per-product `self_renewal_branch` only; v2 per-session sub-branches REMOVED; future session isolation belongs to CA-16-B (deferred per `e8bb7d4` CA-16 SPLIT). |
  | S8 | Post-construction Phase B | PANEL-RATIFIABLE | ROLLBACK to v1 pre-PR Phase B only; v2 live-preview + dual-load + backend probes REMOVED; existing Agent #21 charter per ENTRY 015 §15.1 row 21 operates post-deploy as normal independently. |

- **Conformance test inventory:** **48 tests** total (v1 33 → v2 49 → v3-final 48 net −1). Distribution: S1 4 / S2 6 / S3 5 / S4 9 / S5 8 / S6 8 / S7 3 / S8 3 / §4 lifecycle 2. When CA-15-D v3 SSOT-Conformance Gate ratifies (ENTRY 017 sibling — TASK B in this dispatch), the 48 tests register in canonical conformance inventory at `src/lib/conformance/__tests__/build_wire_engine/`.

- **Failure envelopes:** 26 total (v1 19 + v2-retained 6 + v3-final NEW `construction_auto_rollback_pending_operator_confirm.v1`). v2's `redesign_session_subbranch_merged.v1` (S7 sub-branch revert) and `construction_phase_b_post_merge.v1` (S8 live-preview revert) REMOVED.

- **Sections amended in `docs/CANONICAL_REFERENCE.md`:**
  - **§29 NEW** — Build/Wire Construction Engine canonical authority: binding contract reference (`docs/specs/BUILD_WIRE_ENGINE_SPEC_V3_FINAL_DRAFT.md` @ `1d5e39b`); NON-OVERRIDABLE fidelity statement verbatim; per-invariant S1–S8 disposition table; 4-class construction taxonomy summary; 48-test conformance inventory pointer; 26-failure-envelope total; **Path H Stage 3 UNBLOCKED** declaration; cross-CA dependency preservation (CA-14-D, CA-14-A, CA-15-C, CA-16 SPLIT).
  - **§18.4** — ENTRY 016 row appended to ratified-amendments table.

- **Path H Stage 3 (build/wire) UNBLOCKED.** Per ENTRY 014's three-stage path: Stage 1 (Self-Renewal Executor + 5 fix-safety invariants) cleared at ENTRY 015 cleared-8; Stage 2 (Phase B Adversarial Surface Testing + Agent #21 ENTRY 015 §15.1 row 21 extension) cleared at ENTRY 015 cleared-8; **Stage 3 (Build/Wire Construction Engine — construction-class operations) UNBLOCKED at THIS ENTRY** by CA-17 ratification of the binding v3-FINAL spec. Engineering dispatch may now implement the construction engine against the binding spec without further Panel block; only Panel-ratifiable invariants (S1/S3/S7/S8) may be amended by future CA cycles, and any such amendment MUST preserve the NON-OVERRIDABLE fidelity (S2/S4/S5/S6 strengthen-only, no reject path).

- **Pre-promotion archive:** `docs/archive/FLOWAI_SSOT-pre-CA17-promotion-2026-05-19.md` per §18.3. Captures canonical SSOT state at end-of-ENTRY-015 (immediately before §29 + §18.4 append). 117,114 chars verbatim copy.

- **Integrity:** doc-only; no code touched; binding spec file unchanged in this commit (it was authored + committed at `1d5e39b` and is referenced here as a frozen-by-commit artifact). Diff scoped to two targets only: (1) `docs/CANONICAL_REFERENCE.md` (§29 NEW + §18.4 row) + (2) `docs/CANONICAL_HISTORY.md` (this entry). `git add` discipline: per-file explicit adds; no `-A` / `.` / `-u`.

- **Lineage:** Build/Wire v1 (`4e6260b`) → v2 (`d0691c5` — 8 strengthen directions) → S8 fidelity (`448932b`) → W6 v2 4-run re-Panel (`4400958` — 0/8 cleared; documented Panel non-convergence) → CEO convergence dispatch (W3) → v3-FINAL DRAFT (`1d5e39b` — CONVERGENCE PASS, CEO-disposition track) → **THIS ENTRY (CA-17 ratification + Path H Stage 3 UNBLOCKED).**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ENTRY 017 — 2026-05-19 — CA-13 sliver + CA-15 lean-down + CA-16-A zero-canonical disposition (CEO Decision B; Locked Rule 13 CEO-disposition track)

- **Session:** CEO has executed Decision B — a lean-down disposition across the three CA tracks that have failed Panel convergence across three cycles. The three tracks (CA-13 95-bar spine, CA-15 multi-dim/purpose/conformance, CA-16-A proactive recs) returned **0/13 cleared** at v3-era re-Panels combined (CA-13 v2 4-run `db457a5`: 0/5; CA-15 v2 `db457a5`: 3/11 cleared but 4 questions deadlocked; CA-16 v2 sub-batch-A `40926fa`: 0/4 at the proactive-recs surface). Per Locked Rule 13, the CEO disposes — promoting the three already-cleared questions, disposing three deadlocked questions, collapsing the remaining surface to zero canonical content where appropriate.

- **Rationale (CEO Decision B, Locked Rule 13):** 3-cycle Panel non-convergence on these surfaces (joint Panel `8e185a6` → quorum-fix rerun `cc14a8f` → v2 re-Panel `db457a5`) is the documented trigger for CEO disposition. The lean-down minimizes canonical governance surface: where Panel convergence stalled and the surface is properly tooling-governed (recs, lints, purpose-tracking), the disposition is to NOT promote canonical content; where Panel convergence stalled but the surface is load-bearing (conformance gate, scoped re-sign), CEO selects the Panel-electable middle option (HYBRID, BROADER) rather than forcing a primary vote that the Panel could not converge on.

- **CA-15 promoted (3 cleared-pending; ratified at THIS entry):**

  | # | Question | v2 verdict | v3 disposition |
  |---|---|---|---|
  | 1 | CA-15-B-Q2 | `QUORUM_PLURALITY` 7/9 ✅ | `inferred` + `synthesized` purpose-capture modes DROPPED. Only `described` (operator-supplied) mode admissible IF purpose ever returns to canonical SSOT (presently outside SSOT per CA-15-B-Q1 removal). |
  | 2 | CA-15-B-Q3 | `QUORUM_PLURALITY` 7/9 ✅ | Placeholder detection (lorem-ipsum, "TBD", etc.) lives in `scripts/lint-product-purpose.mjs` tooling, NOT canonical SSOT. v3 broadens scope: content_quality + accessibility checks ALSO live in tooling per CA-15-A-Q1 removal. |
  | 3 | CA-15-C-Q2 | `QUORUM_PLURALITY` 7/9 ✅ | Hardcoded `purpose_fulfillment_score ≥ 0.7` threshold from CA-15 v1 ELIMINATED entirely. No purpose-fulfillment-score parameterization (neither hardcoded nor operator-config knob) in canonical SSOT. |

- **CA-15 disposed (3 deadlocked; CEO-disposition per Locked Rule 13):**

  | # | Question | v2 verdict | CEO disposition |
  |---|---|---|---|
  | 4 | CA-15-C-Q1 | `PLURALITY` 6/9 (below quorum) | **Numeric-floor-only loop exit** (LOCKED; no LLM-judged purpose-alignment check participates). Canonical at §28.6 — 5 exit conditions: §7.6 score floor, zero critical, Self-Renewal terminal on high, LIMITATIONS published, Phase B pass. The v2 strengthen variant adding `product_purpose` non-null as 6th exit condition is MOOT (`product_purpose` itself is not in canonical per CA-15-B-Q1 removal). |
  | 5 | CA-15-D-Q1 | `PLURALITY_REJECT` 5/9 (advisory rejected; hard-gate-revert was v3 primary at 5/9) | **§19.1 SSOT-Conformance Gate HYBRID** (Panel-electable option (b) from v3 draft elected as the resolved disposition). Critical/high-severity conformance findings → BLOCKING (§11 Step 6 deploy blocked until conformance). Medium/low-severity → ADVISORY (admin dashboard alarm, no deploy block). Admin override on blocking finding requires admin role + audit-log entry per §19 95/95-override rule. |
  | 6 | CA-15-D-Q2 | `PLURALITY_RATIFY` 5/9 (below quorum; objections targeted v2 not-yet-written `CONFORMANCE_SCOPE.md`) | **§19.2 Scoped CEO re-sign BROADER scope** (Panel-electable option (b) from v3 draft elected). Scope = `src/lib/governance/**` AND `src/lib/conformance/**` AND any `*.sql` migration files. Concrete + existing-in-tree; CI-grep-based trigger at CA-promotion-commit time. Eliminates v2's circular-dependency + brittleness + gameable scope-file flaws. |

- **CA-13 collapsed (CEO Decision B — DROP 95-bar machinery; RETAIN only sibling MEMBERSHIP rename + §19.0 invariant):**
  - **DROPPED from canonical:** v3 draft's §7.6 ≥95 canonical bar + §7.6.1 admin-only expiring override envelope (`gtm_bar_admin_override.v1` + `gtm_bar_admin_override_used.v1` + 14-day expiry + ClearanceRecord migration prerequisite). Per CA-13 disposition at §7.6, **NO canonical sub-95 exception path exists in CA-13.** The uniform ≥95 directive (CEO 2026-05-18) is explicitly DEFERRED to the forthcoming mission/Purpose amendment as a DELIBERATE DECISION — not promoted in CA-13.
  - **RETAINED in canonical (CA-13 sliver):**
    - **Sibling MEMBERSHIP rename in §15.5:** EXECUTOR_REGISTRY population grows 1→3 with two new sibling executors: `crawl-write-executor` (Agent #21 sibling per CA-13-B-Q2 v3 primary; capability-keyed) and `orchestra-membership-executor` (Agent #26 sibling — `membership` rename adopted over the v3-draft `admission` per CA-13-B-Q2 v3 option (b); rename rationale: `membership` semantics broader than `admission`, aligning with the §8.1 full lifecycle Trial / Probation / Full member / Deprecated / Archived).
    - **§19.0 anti-conflation invariant one-liner:** "Self-Audit 95/95 (§19) and §7.6 GTM Readiness are TWO DISTINCT bars; they are NEVER conflated in any operator-facing surface." The v3-draft's full §19.0 reconciliation paragraph + 2-row distinction-table is NOT promoted (per CA-13-A v3 option-(c) — invariant alone suffices; §10 governance-mechanisms table already covers the descriptive distinction).
  - **NOT promoted (per Decision B):** CA-13-B-Q1 §15-intro + §15.1 rows 21/26 wording revision (the existing §15.1 row text per ENTRY 015 is already adequate; the v3 draft's enforcement-spec cross-reference is engineering-detail, not canonical-doc-detail); CA-13-A v3 Q2 explicit Near-GTM band elimination (moot — the bands per ENTRY 006 already do not include a 90–94 conditional band); CA-13-A v3 Q3 STRONGER §19.0 paragraph (collapsed to one-liner invariant per above).

- **CA-16-A collapsed to ZERO canonical surface (CEO Decision B):**
  - **NO canonical §7 envelope** for proactive recommendations. No PA-schema in canonical SSOT.
  - **NO §11 reference.** Proactive recs do NOT appear in the Six-Step Clearance Protocol; not a Step gate or sub-step.
  - **NO canonical lifecycle state machine.** No `open`/`accepted`/`rejected`/`deferred`/`implemented`/`REOPEN`.
  - **NO canonical defer-window.** No `[7, 90]` bounds; no `[1, 365]` bounds; no defer-window at all.
  - **NO canonical audit-log envelope.** No `governance_record_entry kind:'proactive_recommendation.v1'`.
  - **NO lightweight ClearanceRecord reference.** The v3-draft's `last_seen_clearance_record_id` field is NOT promoted.
  - Proactive recs are wholly TOOLING-governed: `scripts/lint-proactive-recs.mjs` (or equivalent dispatch-time naming) + admin dashboard `/admin/recommendations`; schema in tooling-internal types under `scripts/types/`. No cross-link to canonical state required.
  - **CA-16-B and CA-16-C remain DEFERRED** to future CA-N (unchanged from `e8bb7d4` CA-16 SPLIT disposition). The CA-16-B-Q3 admin-only Redesign approval gate per ENTRY 015 §11.7 + the CA-16-C-Q4 §7.6 formula-generalization invariant per ENTRY 015 §7.6 are already canonical and are NOT re-amended.

- **Three explicit de-canonizations registered (CEO Decision B — DELIBERATE non-promotions, recorded for audit-trail integrity):**

  1. **Proactive-recs governance is tooling-only.** No canonical FlowAI SSOT surface exists or will exist for proactive recommendations under CA-16-A. Any future need for canonical recs governance requires a fresh CA cycle (CA-N), not a CA-16-A revival.

  2. **No canonical sub-95 exception path exists in CA-13.** The CA-13 v3 draft's admin-only expiring override mechanism is explicitly NOT promoted. Whether ANY operational sub-95 exception path exists at all (and if so, what shape — admin-only / role-gated / time-bounded / per-product-knob / etc.) is a **DEFERRED DELIBERATE DECISION** belonging to the forthcoming mission/Purpose amendment, NOT to CA-13. The CA-13 §29 build/wire engine S6 invariant references the `gtm_bar_admin_override*` kind names only as future-extension hooks in the closed-6-kind invalidation list; the kinds are not currently emitted by canonical FlowAI capability.

  3. **§19.1 SSOT-Conformance Gate is HYBRID, not full-hard-gate.** Critical/high-severity conformance findings BLOCK §11 Step 6 deploy; medium/low-severity findings surface as advisory + admin dashboard alarm WITHOUT blocking. The CA-15-D-Q1 v3 PRIMARY position (full hard-blocking-gate per v1 form) is NOT promoted; the Panel-electable HYBRID is.

- **Sections amended in `docs/CANONICAL_REFERENCE.md`:**
  - **§7 NEW disposition note** — CA-16-A zero-canonical surface declaration (no §7 envelope; tooling-only; CA-16-B/C deferred-unchanged).
  - **§7.5 disposition note** — CA-15-B no `product_purpose` field; `described`-only forward-looking discipline carry-forward.
  - **§7.6 disposition note** — CA-13 no canonical sub-95 exception path; uniform ≥95 deferred to mission/Purpose amendment.
  - **§10.1 disposition note** — CA-15-A stays at 5 dimensions; content_quality + accessibility lints in tooling.
  - **§15.5 updated** — EXECUTOR_REGISTRY population grows 1→3 (`self-renewal-executor` + `crawl-write-executor` (Agent #21) + `orchestra-membership-executor` (Agent #26)).
  - **§19.0 NEW** — anti-conflation invariant one-liner (CA-13 sliver retention).
  - **§19.1 NEW** — SSOT-Conformance Gate HYBRID (CA-15-D-Q1 disposition).
  - **§19.2 NEW** — Scoped CEO re-sign BROADER scope (CA-15-D-Q2 disposition).
  - **§28.6 NEW** — Purpose-Driven Optimization Loop numeric-floor exit (CA-15-C-Q1 disposition + B-Q2 / B-Q3 / C-Q2 cleared-pending carry notes + CA-15-C-Q3 PURPOSE_DRIFT non-promotion note).
  - **§18.4** — ENTRY 017 row appended (above the ENTRY 016 row inserted earlier this dispatch).

- **What is NOT touched at ENTRY 017:**
  - Existing §10.1 5-dimension definition unchanged (CA-15-A disposition is a confirmation of unchanged state, not an amendment).
  - Existing §7 6-item Output Contract unchanged (CA-16-A is a confirmation of unchanged state).
  - Existing §7.5 6-block ProductSSOT structure unchanged (CA-15-B is a confirmation of unchanged state).
  - Existing §7.6 GTM bands per ENTRY 006 + per-product `gtm_ready_bar_override` knob unchanged.
  - §15.1 rows 21 + 26 charter text unchanged — the EXECUTOR_REGISTRY sibling addition is at §15.5 only.
  - §11.7 CA-16-B-Q3 Redesign approval gate (per ENTRY 015) unchanged.
  - §7.6 CA-16-C-Q4 formula-generalization invariant (per ENTRY 015) unchanged.
  - §29 Build/Wire Construction Engine (per ENTRY 016, this dispatch's TASK A) unchanged.

- **Pre-promotion archive:** `docs/archive/FLOWAI_SSOT-pre-CA13-15-16A-leandown-promotion-2026-05-19.md` per §18.3. Captures canonical SSOT state at end-of-ENTRY-016 (i.e. post-CA-17 promotion, immediately before the CA-13/15/16-A lean-down edits). 124,438 chars verbatim copy.

- **Integrity:** doc-only; no code touched; binding specs unchanged. Diff scoped to three targets only: (1) `docs/CANONICAL_REFERENCE.md` (8 targeted sub-section additions + §18.4 row) + (2) `docs/CANONICAL_HISTORY.md` (this entry) + (3) `docs/archive/FLOWAI_SSOT-pre-CA13-15-16A-leandown-promotion-2026-05-19.md` (snapshot). `git add` discipline: per-file explicit adds; no `-A` / `.` / `-u`.

- **Lineage:** CA-13 v1 (`81cf144`) + CA-15 v1 (`fae9ff3`) + CA-16 v1 (`908f340`) → joint Panel `8e185a6` engagement-gated → W6 quorum-fix rerun `cc14a8f` (CA-13 0/5, CA-15 0/11, CA-16 2/11) → ENTRY 015 cleared-8 promotion (CA-14-A/B/D + CA-16-B-Q3 + CA-16-C-Q4 — leaves CA-13 + CA-15 + CA-16-A open) → CA-13 v2 (`8b38156`) + CA-15 v2 (`746bb7e`) + CA-16 v2 (`d366acf`) → W6 v2 re-Panel (`db457a5`) → CA-13 v3 (`c5b050f` + `e8bb7d4`) + CA-15 v3 (`c5b050f`) + CA-16-A v3 (`e8bb7d4` CA-16 SPLIT) → W6 v3 convergence re-Panel `6e03d78` (`d396bd2` + `c5b050f` + `e8bb7d4`) → CEO Decision B dispatch (this entry) → **THIS ENTRY (CA-13 sliver + CA-15 lean-down + CA-16-A zero-canonical promotion + 3 explicit de-canonizations registered).**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ENTRY 018 — 2026-05-19 — CA-18 FlowAI Mission/Purpose Amendment (CEO-ratification track; Locked Rule 13 — no Panel)

- **Session:** CEO has ratified the FlowAI Mission/Purpose Amendment as **CA-18 — the binding canonical mission/purpose statement.** The disposition is under Locked Rule 13 (CEO absolute veto + CEO-disposition track). **No Panel was consulted.** The CEO has explicitly stated the full mission vision across multiple sessions (CEO instructions 2026-05-18 product market definitions; ENTRY 017 deferral of the uniform-≥95 + sub-95-exception question to "the forthcoming mission/Purpose amendment"; multi-session mission vision statement); this entry captures it canonically.

- **Rationale (CEO-ratification track, Locked Rule 13):** mission/purpose is a CEO-owned surface (per §24 CEO Operating Rules + Locked Rule 13 CEO absolute veto). Panel-convergence is not a precondition for mission/purpose decisions — the CEO has the explicit authority to state mission canonically. CA-18 is that statement. It also resolves the third explicit de-canonization registered at ENTRY 017: *"NO canonical sub-95 exception path exists in CA-13. Whether ANY operational sub-95 exception path exists at all is a DEFERRED DELIBERATE DECISION for the forthcoming mission/Purpose amendment, NOT CA-13."* — ENTRY 018 IS that forthcoming amendment, and §4 resolves the deferred question: uniform ≥95 is canonical; NO canonical sub-95 exception path exists; whether any operational admin exception is provided is an engineering-level configuration decision, NOT canonical policy.

- **Binding canonical contract:** `docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md` (20,348 chars) authored + committed at THIS ENTRY. The file is the canonical authority for FlowAI's mission and purpose. The "DRAFT" suffix in the filename is preserved for git-traceability to the CEO-ratification-track lineage; the contents are RATIFIED-CANONICAL at this entry.

- **§1–§5 canonical mission summary (binding statement is authoritative; this is a per-section summary for the entry record):**

  - **§1 Core Definition.** Input: any URL, spec, or pasting (existing site, natural-language description, document, code). Output: ALWAYS a NEW SEPARATE deployable URL — input never destructively modified; both preserved. Quality guarantee: each run produces substantial and perceptible transformation; marginal-improvement runs are QUALITY FAILURES, not successes. Honest assessment: FlowAI proactively reports when a product already meets/exceeds the bar — artificially manufacturing work is a violation of platform integrity. User agency: user controls iteration depth; FlowAI provides trajectory + diminishing-returns reporting after every run.

  - **§2 Quality Dimensions (10, closed at this entry; future amendments may extend but not narrow without CEO ratification).** (1) Syntax/grammar; (2) Duplication/repetition removal; (3) UI/UX effectiveness; (4) Bug + error resolution; (5) Functional completeness (no dead controls, no mock/stub in production); (6) Performance; (7) Accessibility; (8) Security; (9) **Privacy compliance — jurisdiction-aware** (assessed against the product's declared applicable jurisdiction(s)); (10) **Legal compliance — jurisdiction-aware** (same). Jurisdiction-awareness invariant: privacy/legal evaluated against product-declared jurisdiction(s); operator declares at product registration; undeclared product surfaces a finding rather than silently default. No silent omission of any dimension.

  - **§3 Iteration Model.** Three operating modes: **Manual** (user step-by-step); **Guided** (user-directed with AI assistance); **Automatic** (autonomous to ≥95 or diminishing-returns threshold). Orthogonal to §8 Orchestra Selection and §8a System Operation axes. User input surfaces: canonical preset modes (engineering-dispatch-canonicalized) + free-form natural-language instruction field. **Binding invariant — instructions function as PRIORITY WEIGHTS, not feature toggles.** Full §2 coverage maintained regardless of user instruction; weights direct improvement-energy focus, NOT silent dimension-skipping. Diminishing-returns reporting after every run: composite + per-dimension trajectory, explicit signal when curve flattens, honest recommendation (continue / consider stopping / stop now).

  - **§4 Platform Scope and Mission — GLOBAL.** **FlowAI is a GLOBAL platform.** No geographic restriction on FlowAI or on any VEU AI Studio product. **Underserved is a global condition, not a geography** — occurs in every jurisdiction. All 5 VEU products (SAIGE, RelTwin, ReachSMS, PressAI, MyPregLife) are global from day one (any launch sequencing is operational, NOT canonical scope narrowing). Democratization mission canonical: enable individuals + small organizations worldwide to build world-class software without deep technical expertise. **Target classes (6):** web / native_app / mobile_app / SaaS / agentic_ai / generic_url. **Quality standard — uniform ≥95 for everyone, globally — as a dignity-and-belonging guarantee.** Same standard everywhere, for everyone; mission is to LIFT every submission to ≥95, NOT to lower the bar for some. **Sub-95 exception: NO canonical exception path exists** (CA-13 machinery dropped per ENTRY 017; CA-18 confirms — operational admin exception is engineering-level configuration, NOT canonical policy; the two MUST NOT be conflated).

  - **§5 Symbiotic Meta-Principle.** FlowAI and its SSOT exist in a symbiotic relationship. The SSOT governs FlowAI; FlowAI's real-world operation continuously improves the SSOT through telemetry/findings/amendments (CA-N cycle + CEO-ratification track); an improved SSOT produces better FlowAI behavior; the cycle compounds indefinitely; **no version of either is ever final; both always improve.** **FlowAI applies to its own development process** — VEU AI Studio's own workflow (including the development of FlowAI itself) is a valid target for FlowAI's construction + improvement capabilities. §29 Build/Wire engine (CA-17), §10 Self-Audit, §11 Six-Step Clearance all apply self-referentially when FlowAI is treated as a target. The §2 quality coverage + §4 dignity guarantee apply to FlowAI's own surfaces, docs, and codebase.

- **Correction of all prior geographic-limitation framing in canonical (per TASK 2 of CEO dispatch):**

  | Surface | Before (pre-CA-18) | After (CA-18 canonical) |
  |---|---|---|
  | `docs/CANONICAL_REFERENCE.md` §1.1 MyPregLife row | "**Globally**, not Africa-limited. Africa-first as a launch market only. NOT limited to pregnant women in Africa." | "**Globally**, with no geographic restriction (per CA-18 ENTRY 018 — the prior 'Africa-first as launch market' caveat is removed; any launch sequencing is an operational / go-to-market decision, NOT canonical scope narrowing). NOT limited to pregnant women in any region." |
  | `docs/CANONICAL_REFERENCE.md` §2 MISSION lead | "FlowAI democratizes AI-powered product creation for **underserved market segments globally** (per CA-1 + CA-2, canonical 2026-05-14):" + 5-bullet list with "Underdeveloped economies (Sub-Saharan Africa, parts of Latin America, parts of South/Southeast Asia)" as bullet 1 + target-class line ending "create native apps / mobile apps / SaaS / Agentic AI" | "**FlowAI is a GLOBAL platform** (canonical per CA-18 ENTRY 018 — CEO-ratification track, Locked Rule 13). FlowAI democratizes … worldwide who lack access … **Underserved is a global condition, not a geography** — it occurs in every jurisdiction on the planet, manifesting as resource scarcity, technical-expertise scarcity, market-access scarcity, or any combination thereof." + dignity-and-belonging guarantee callout + 4 representative (non-exhaustive, non-geographic) bullets + meta-citation note that the prior geographic bullet is REMOVED per CA-18 ENTRY 018 + target-classes line updated to canonical 6 classes (web / native_app / mobile_app / SaaS / agentic_ai / generic_url) + cross-reference to the binding mission/purpose statement |
  | `docs/CANONICAL_REFERENCE.md` §18.4 ENTRY 001 row | "CA-1 (geographic broadening, 9/10) + CA-2 (democratization reframe, 8/10). Sections O1, O6, ELEVATOR PITCH amended." | **UNCHANGED.** Historical-record integrity preserved. The original CA-1 + CA-2 promotion happened on 2026-05-14 and that historical record stays; CA-18 supersedes CA-1's geographic-list framing in the live canonical text but does NOT rewrite history. |

  **Audit-trail integrity invariant.** Historical §18.4 rows are NEVER rewritten by superseding CAs — they record what was promoted when, by whom, with what Panel signal. CA-18 supersedes prior canonical text but preserves prior canonical history (per §18.3 Archive discipline + Locked Rule 13).

- **Sections amended in `docs/CANONICAL_REFERENCE.md`:**
  - **§1.1 MyPregLife row** — geographic restriction caveat REMOVED; "Africa-first as launch market" framing REMOVED; replaced with "Globally, with no geographic restriction" + meta-citation pointing to CA-18 ENTRY 018.
  - **§2 MISSION** — REWRITTEN: prior geographic-list bullet REMOVED; replaced with global-condition framing per CA-18 §4 + dignity-and-belonging guarantee callout + cross-reference to the binding mission/purpose statement at `docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md` + target-classes line updated to the canonical 6 classes (web / native_app / mobile_app / SaaS / agentic_ai / generic_url per CA-16-C-Q4 + CA-18 §4).
  - **§18.4** — ENTRY 018 row appended (above the ENTRY 017 row inserted in the prior dispatch's TASK B).

- **What is NOT touched at ENTRY 018:**
  - §18.4 ENTRY 001 historical row (CA-1 + CA-2 record) — preserved unchanged.
  - §1.1 SAIGE / RelTwin / ReachSMS / PressAI rows — already global per CEO instruction 2026-05-18; no edit required.
  - §7.6 GTM bands per ENTRY 006 (90+/75+/60+/<60) — unchanged; bands are operational scoring infrastructure independent of mission scope.
  - §19 Self-Audit 95/95 + §27 Open Questions + §29 Build/Wire Construction Engine (CA-17 per ENTRY 016) — unchanged.
  - All other §18.4 rows (ENTRY 002 through ENTRY 017) — unchanged.
  - `docs/FLOWAI_SSOT.md` (Layer 1 Philosophical Foundation) — out of scope per dispatch (TASK 0 audit was canonical-reference-scoped per dispatch instruction); any Layer 1 reconciliation is a future-CA decision if needed.

- **Pre-promotion archive:** `docs/archive/FLOWAI_SSOT-pre-CA18-promotion-2026-05-19.md` per §18.3. Captures canonical SSOT state at end-of-ENTRY-017 (i.e. post-CA-13/15/16-A lean-down, immediately before the CA-18 mission/purpose edits). 141,395 chars verbatim copy.

- **Integrity:** doc-only; no code touched; binding mission/purpose draft created at this commit as the binding canonical contract. Diff scoped to four targets only: (1) `docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md` (NEW); (2) `docs/CANONICAL_REFERENCE.md` (§1.1 MyPregLife row + §2 MISSION rewrite + §18.4 ENTRY 018 row); (3) `docs/CANONICAL_HISTORY.md` (this entry); (4) `docs/archive/FLOWAI_SSOT-pre-CA18-promotion-2026-05-19.md` (snapshot). `git add` discipline: per-file explicit adds; no `-A` / `.` / `-u`.

- **Lineage:** prior mission text per §2 of `docs/CANONICAL_REFERENCE.md` (CA-1 + CA-2 canonical per ENTRY 001 2026-05-14) → §1.1 product market definitions PERMANENT per CEO instruction 2026-05-18 → ENTRY 017 explicit deferral of the uniform-≥95 + sub-95-exception question to "the forthcoming mission/Purpose amendment" (CEO Decision B, sibling commit `6c3c1f4`) → CA-17 CA-binding contract per ENTRY 016 (CEO Decision A, sibling commit `ee7e85f`) → CEO mission-vision dispatch (this dispatch) → **THIS ENTRY (CA-18 mission/purpose ratification + geographic-limitation correction + ENTRY 017 deferral resolution).**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ENTRY 019 — 2026-05-19 — CA-18 §6 Tool Intelligence Principle ADDITION + global mode-name LOCK (CEO-ratification track; Locked Rule 13 — no Panel)

- **Session:** CEO has extended the CA-18 mission/purpose amendment (per ENTRY 018) with a new §6 Tool Intelligence Principle and has **locked the user-facing operating-mode triad globally** to **AUTOMATIC / GUIDED / MANUAL** across the §8 Tool Intelligence axis, the §8a System Operation axis, the §3 iteration model, and the §17 sidebar surface. This entry promotes the §6 addition + the global mode-name alignment + the associated canonical-reference edits in a single doc-only commit. No Panel was consulted — CEO-ratification track per Locked Rule 13.

- **Rationale (CEO-ratification track, Locked Rule 13):** mode-naming is an operator-facing UX surface that the CEO owns directly (per §24 CEO Operating Rules + Locked Rule 13). The prior three-axis triad-mismatch (§8 Auto/Recommended/User-Choice + §8a Hands-On/Reviewed/Hands-Off + §3 initial Manual/Guided/Automatic of ENTRY 018 + §17 sidebar AUTO/GUIDED/MANUAL OPERATIONS) was Panel-flagged at gap #12 (NAMING_AMBIGUITY) and surfaced two Rev-2.1 Open Questions (OQ-6 + OQ-9). The CEO disposes via a single global lock: AUTOMATIC / GUIDED / MANUAL. The triad applies uniformly across axes; axis-disambiguation when ambiguity arises is by prefix (e.g. "AUTOMATIC tool selection" vs "AUTOMATIC system operation" vs "AUTOMATIC iteration"). Code may retain prior enum strings per surface-of-truth resolution.

- **Binding canonical extension:** `docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md` extended from 20,348 chars (ENTRY 018 state) to 25,259 chars (ENTRY 019 state) with the following changes:
  - **§3 Iteration Model REWRITTEN** with uppercase locked labels: AUTOMATIC / GUIDED / MANUAL (was Manual / Guided / Automatic in ENTRY 018 draft). Order reversed (AUTOMATIC first, MANUAL last) to match the §6 tool-selection mode ordering.
  - **§6 TOOL INTELLIGENCE PRINCIPLE — NEW SECTION.** Defines provider-agnostic + tool-agnostic posture; per-step research-driven ranking; top-5 platform set per step; monthly refresh cadence; three selection modes (AUTOMATIC = engine picks rank #1; GUIDED = engine presents top-5, user picks; MANUAL = user specifies exact tool); vendor-agnosticism invariant (no step locked to any single provider — Vercel/Anthropic/OpenAI/Cursor/Browserless/Playwright/Replit/Lovable/v0/Base44/OpenRouter rankings reflect current performance, NOT permanent commitment); operationalization paragraph stating that the §8 Orchestra Selection axis in canonical reference is REPLACED by this §6 (and the §8a System Operation axis is ALIGNED to the same triad); mode-alignment table covering §3 + §8 + §8a + §17 sidebar + Locked Rule 4 alignment.
  - **§6 (Acceptance criteria for CA-18 ratification) renumbered to §7**; **§7 (Cross-CA reconciliation) renumbered to §8** to make room for the new §6 Tool Intelligence Principle.

- **Sections amended in `docs/CANONICAL_REFERENCE.md`:**
  - **§5 INPUT modes cross-ref** — updated mention of "Auto Orchestra selection under Hands-Off system operation" to AUTOMATIC tool selection (§8) under AUTOMATIC system operation (§8a) with explicit CA-18 §6 ENTRY 019 lock citation.
  - **§8 Tool Intelligence (was: Orchestra Selection axis)** — body REPLACED with the §6 Tool Intelligence Principle canonical text + AUTOMATIC/GUIDED/MANUAL selection-mode table + vendor-agnosticism invariant + cross-reference to Locked Rule 18 ranking formula + cross-reference to `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` §7.4. The prior triad (Auto/Recommended/User-Choice) is RETIRED from canonical text but retained as historical aliases inside the new table for traceability.
  - **§8.1 Orchestra Self-Expansion (Auto-Admission per CA-9-A — ENTRY 005)** — PRESERVED UNCHANGED. Auto-admission of new candidate platforms into the Orchestra registry is orthogonal to the user-facing selection-mode triad and is not affected by the mode-name lock.
  - **§8a SYSTEM OPERATION** — labels REALIGNED to AUTOMATIC / GUIDED / MANUAL with the mapping Hands-Off → AUTOMATIC, Reviewed → GUIDED, Hands-On → MANUAL. Rev-2 triad (Hands-On / Reviewed / Hands-Off) and Rev-1 triad (Manual / Supervised / Autonomous) retained as historical aliases for shipping continuity. Independence statement updated: §8 and §8a remain independent axes both using the same AUTOMATIC/GUIDED/MANUAL triad; 9-combination matrix preserved; disambiguation-by-prefix paragraph added for cases where axis context is ambiguous.
  - **§10.2 Review Gate** — "Reviewed or Hands-On system operation" updated to "GUIDED or MANUAL system operation (per CA-18 §6 ENTRY 019 §8a labels)".
  - **§11 Clearance §7 inline-tool** — "Guided + Manual modes" updated to "GUIDED + MANUAL modes (per CA-18 §6 ENTRY 019 lock)".
  - **§14.1 audit-log topics** — `session_started` description updated to "AUTOMATIC / GUIDED / MANUAL session launch"; `proposal_approved` / `proposal_modified` / `proposal_skipped` updated to "GUIDED/MANUAL <action> action" with ENTRY 019 citation. Payload schemas unchanged (engineering retains existing enum strings per surface-of-truth resolution); only the human-readable label-list updates.
  - **§17 sidebar footnote** — Rev-2.1 amendment a footnote REWRITTEN. Prior framing "sidebar section names (AUTO OPERATIONS / GUIDED OPERATIONS / MANUAL OPERATIONS) are DISTINCT from canonical axis labels" is SUPERSEDED at ENTRY 019: the sidebar names now MATCH canonical because canonical adopts AUTOMATIC/GUIDED/MANUAL. Engineering may keep prior enum strings in code per Open Question 6 (RESOLVED at ENTRY 019).
  - **§25 Locked Rule 4** — REWRITTEN: "Tool Intelligence axis (§8) and System Operation axis (§8a) — both LOCKED to AUTOMATIC / GUIDED / MANUAL per CA-18 §6 ENTRY 019. Single global triad; independent axes; 9-combination matrix valid. Prior Rev-2 + Rev-1 labels retained as historical aliases only — not used in new canonical text, dispatches, audit-log payloads, or Panel discourse. §3 iteration model uses the same triad."
  - **§25 Locked Rule 18** — extended: "Top-5 platforms per Auto Runner step ranked by performance + cost + speed + reliability; rankings research-driven (not hardcoded) and refreshed monthly per CA-18 §6 ENTRY 019. Selection-mode triad LOCKED at AUTOMATIC / GUIDED / MANUAL per Locked Rule 4."
  - **§27 Open Question 6** — marked RESOLVED at ENTRY 019 (surface-of-truth resolution: canonical labels lock to AUTOMATIC/GUIDED/MANUAL; engineering may keep prior enum strings).
  - **§27 Open Question 9** — marked RESOLVED at ENTRY 019 (sidebar names now align with canonical; no surface/canonical gap remains).
  - **§18.4** — ENTRY 019 row appended (above the ENTRY 018 row inserted in the prior dispatch).

- **Global mode-name lock — alignment table (binding at ENTRY 019):**

  | Context | Pre-ENTRY-019 triad | ENTRY 019 LOCKED triad |
  |---|---|---|
  | §3 Iteration Model (`FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md`) | Manual / Guided / Automatic (ENTRY 018 initial draft) | **AUTOMATIC / GUIDED / MANUAL** |
  | §8 Tool Intelligence axis (canonical reference; was "Orchestra Selection axis") | Auto / Recommended / User-Choice (Rev-2); Auto / Guided / Manual (Rev-1 alias) | **AUTOMATIC / GUIDED / MANUAL** |
  | §8a System Operation axis (canonical reference) | Hands-On / Reviewed / Hands-Off (Rev-2); Manual / Supervised / Autonomous (Rev-1 alias) | **AUTOMATIC / GUIDED / MANUAL** (Hands-Off→AUTOMATIC, Reviewed→GUIDED, Hands-On→MANUAL) |
  | §17 Sidebar section names (Sprint UX-C) | AUTO OPERATIONS / GUIDED OPERATIONS / MANUAL OPERATIONS | **UNCHANGED** — already aligned with the lock |
  | Locked Rule 4 | "Auto / Recommended / User-Choice (canonical)" | **"AUTOMATIC / GUIDED / MANUAL — single globally locked triad"** |

- **What is NOT touched at ENTRY 019:**
  - **§8.1 Orchestra Self-Expansion (Auto-Admission)** — PRESERVED unchanged. Auto-admission of new candidate platforms is orthogonal to user-facing selection-mode triad.
  - **§8 Locked Rule 18 ranking formula itself** — the `rank_score = (performance_score × 0.6) + (price_weight × 0.4)` formula is unchanged; only the user-facing selection-mode triad updates.
  - **§14.1 audit-log payload schemas** — engineering retains existing enum strings; only label citations in the topic description column update.
  - **§17 sidebar names** — already aligned; no rename needed.
  - **Rev-2.1 header changelog at line 7** — historical record of W04-Rev-2.1 amendments; not rewritten (audit-trail integrity).
  - **§18.4 ENTRY 003 historical row** (Rev-2.1 amendment a — sidebar-label footnote) — preserved unchanged for audit-trail integrity; the FOOTNOTE itself at §17 is updated, but the §18.4 row recording its addition is not rewritten.

- **Pre-promotion archive:** `docs/archive/FLOWAI_SSOT-pre-CA18-tool-intelligence-promotion-2026-05-19.md` per §18.3. Captures canonical SSOT state at end-of-ENTRY-018 (immediately before the CA-18 §6 Tool Intelligence edits). 145,959 chars verbatim copy.

- **Integrity:** doc-only; no code touched; engineering enum strings unchanged (surface-of-truth resolution). Diff scoped to four targets only: (1) `docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md` (§3 reworded + §6 NEW + §6/§7 renumbered to §7/§8); (2) `docs/CANONICAL_REFERENCE.md` (§5 INPUT cross-ref + §8 body REPLACED + §8a labels REALIGNED + §10.2 Review Gate + §11 Clearance inline-tool + §14.1 audit-log topics + §17 footnote REWRITTEN + §25 Locked Rule 4 REWRITTEN + §25 Locked Rule 18 extended + §27 OQ-6 + OQ-9 RESOLVED + §18.4 ENTRY 019 row); (3) `docs/CANONICAL_HISTORY.md` (this entry); (4) `docs/archive/FLOWAI_SSOT-pre-CA18-tool-intelligence-promotion-2026-05-19.md` (snapshot). `git add` discipline: per-file explicit adds; no `-A` / `.` / `-u`.

- **Lineage:** ENTRY 018 CA-18 mission/purpose amendment (CEO Decision A on mission, sibling commit `e017643`) → CEO mode-name lock dispatch (this dispatch) → **THIS ENTRY (CA-18 §6 Tool Intelligence Principle addition + global mode-name lock AUTOMATIC / GUIDED / MANUAL + Open Question 6 + 9 resolution).**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

END OF INVENTORY — FlowAI v0.1 — 2026-05-10 (SSOT promotion log extended 2026-05-19)

## 2026-05-26 - SSOT v2.3 RATIFIED

- **Authority:** CEO Victor Udo, FNSE, PhD.
- **Disposition:** SSOT v2.3 RATIFIED as canonical. Supersedes all prior SSOT versions and amendments CA-18 through CA-20D.
- **Build program:** Eight-phase FlowAI Master Build Dispatch authorized.
- **Head basis:** c718bf8 on branch flowai-v0.1.
- **Canonical files updated:** docs/specs/SSOT_TRACEABILITY_MATRIX.md, docs/specs/SSOT_TRACEABILITY_MATRIX.sidecar.json, docs/CANONICAL_REFERENCE.md, docs/CANONICAL_HISTORY.md.
- **Scope:** Document-only foundation commit; no production code changes.


## 2026-05-27 - Automated Operating Dispatch v1.2 prerequisite

- **Authority:** CEO direction to reduce drift and make Codex Window the primary build driver.
- **Operating principle:** Claude observes. Codex drives. Victor decides.
- **Artifacts added:** `docs/governance/AUTOMATED_OPERATING_DISPATCH.md`, `docs/specs/task-verification-manifest.json`, and `scripts/verify-task.mjs`.
- **Verification model:** `verify-task.mjs` reads the task manifest, checks commit file scope, protected files, required patterns, tests, build, lint, SSOT checker, and working tree state.
- **Adoption status:** Advisory for the first three task-driven cycles; PowerShell remains authoritative during the advisory window and for high-risk commits. The first adoption task is explicitly marked PowerShell-authoritative so the verifier can be committed without claiming authority over itself before the advisory cycle completes.
