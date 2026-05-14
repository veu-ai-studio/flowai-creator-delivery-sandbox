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

&#x20;     · PRODUCT\_SCOPES (flowai, saige, reltwin, reachsms, pressai, mybirthsafe)

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

&#x20;                   RelTwin, MyBirthSafe) + any custom products added

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

&#x20; Paystack                — MyBirthSafe (Africa-first)



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

&#x20;   MyBirthSafe  preglife.com

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
                      MISSING QUESTIONS — incidental "MyBirthSafe
                          Africa-first" wording. Product-roadmap scope,
                          not platform-market scope.
                      E4 — no geographic-scope wording present;
                          CA-5 (E4 commercial generalization, 5/10
                          plurality) not promoted in this entry.
  Pre-promotion archive:
                      docs/archive/FLOWAI_SSOT-pre-2026-05-14-promotion.md
                      (verbatim copy of canonical SSOT at commit fbaf881
                      before CA-1 + CA-2 edits applied).

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
                      docs/archive/FLOWAI_SSOT-pre-2026-05-14-
                      promotion.md remains the authoritative
                      pre-amendment baseline.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

END OF INVENTORY — FlowAI v0.1 — 2026-05-10 (SSOT promotion log extended 2026-05-14)



