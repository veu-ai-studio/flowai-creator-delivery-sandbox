╔══════════════════════════════════════════════════════════════════════════════╗

║   FLOWAI — FULL VERSION HISTORY \& REMOVED FEATURES INVENTORY               ║

║   Generated: 2026-05-10  |  Source: ReleaseNotes.jsx, all docs, codebase   ║

║   IMPORTANT: This document distinguishes RECORDED FACT from                ║

║   NO RECORD FOUND. Nothing is reconstructed without evidence.              ║

╚══════════════════════════════════════════════════════════════════════════════╝



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 1 — CHRONOLOGICAL SPRINT LOG (oldest to newest)

Source of truth: pages/ReleaseNotes.jsx RELEASES array (canonical, in-app)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



──────────────────────────────────────────────────────────────────────────────

SPRINT 5 — "Self-Governance Layer"

Date: October 2025

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Self-Test: automated end-to-end functional baseline testing

&#x20; - Self-Audit: four-dimension scoring engine

&#x20;   Dimensions: UI/UX, API, Logic, Business Value

&#x20; - Self-Protect: snapshot + rollback infrastructure before any changes

&#x20; - Self-Heal: automatic fix application for detected issues

&#x20; - Self-Optimize: performance improvement cycle (targets dims below 8/10)

&#x20; - Self-Upgrade: version locking and upgrade management

&#x20; - Four Human Gates: review, approval, testing, acceptance at each

&#x20;   governance cycle

&#x20; - Governance Center: centralized dashboard with timeline and history

&#x20; - Master Control Card: session config with URL targeting, activity

&#x20;   selection, mode settings

REMOVED: No record found

MODIFIED: No record found

NOTES:

&#x20; - This is the EARLIEST SPRINT with a record in the system.

&#x20;   Any features predating Sprint 5 have NO recorded history in-app.

&#x20; - "Self-Protect" here = snapshot/rollback. This is DIFFERENT from

&#x20;   the later "Self-Protection" (anti-crawl, IP protection) added in

&#x20;   Sprint PROTECT-1. Same name family, distinct features.

&#x20; - "Self-Audit" 4-dimension scoring is the precursor to the 95/95

&#x20;   governance threshold formalized later.



──────────────────────────────────────────────────────────────────────────────

SPRINT 6 PHASE 1 — "Production Credibility"

Date: November 2025

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Domain Manager: AI-generated domain recommendations, DNS records,

&#x20;   professional email setup

&#x20; - Brand Identity: VEU AI Studio unified brand system, CSS variables,

&#x20;   component standards

&#x20; - White-Label: automated sprint generation to remove Base44 branding

&#x20;   from any product

&#x20; - Data Portability: GDPR-compliant export sprint generation per product

&#x20; - Entities added: BrandSystem, DomainStrategy

REMOVED: No record found

MODIFIED: No record found



──────────────────────────────────────────────────────────────────────────────

SPRINT 6 PHASE 2 — "Deployment Scaffold"

Date: November 2025

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Readiness Checker: score products across six readiness dimensions

&#x20; - Scaffold Generator: SQL schemas, Vercel config, README, migration

&#x20;   checklist

&#x20; - Architecture page: product-by-product readiness visualization

&#x20; - Entity added: DeploymentScaffold

REMOVED: No record found

MODIFIED: No record found



──────────────────────────────────────────────────────────────────────────────

SPRINT 6 PHASE 3 — "Dual Deployment"

Date: December 2025

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Environments page: track and synchronize dev and production environments

&#x20; - Drift detection: compare dev vs prod, generate remediation sprints

&#x20; - Live Monitor: real-time health checks for all deployed products

&#x20; - Cross-environment governance: Gate 1 review for low-scoring environments

&#x20; - Entity added: ProductEnvironment (score history, sync reports)

REMOVED: No record found

MODIFIED: No record found



──────────────────────────────────────────────────────────────────────────────

SPRINT 7 — "Demo and GTM"

Date: January 2026

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Demo Builder: three-step synthetic data generation, microsite HTML,

&#x20;   guided tour script

&#x20; - Investor Hub: 12-slide pitch deck generation, portfolio page assembly

&#x20; - Launch Assets: email sequences, LinkedIn posts, executive summaries,

&#x20;   pilot proposals

&#x20; - Custom product support in Demo Builder

&#x20; - Tour step editor, data sources, version history panels

&#x20; - Entities added: DemoEnvironment, GTMAsset, InvestorAsset

REMOVED: No record found

MODIFIED: No record found

NOTES:

&#x20; - Demo Builder (Sprint 7) is DISTINCT from the 4-tier GTM Demo Stack

&#x20;   (added much later, in the post-UX-C architecture sprint). Demo Builder

&#x20;   generates synthetic microsites for products. The GTM Demo Stack is the

&#x20;   FlowAI commercial demo experience (veaas.com etc.).



──────────────────────────────────────────────────────────────────────────────

SPRINT 7.5a — "Basic Security"

Date: January 2026

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Base44 authentication enabled: all pages require login

&#x20; - Landing page: public-facing FlowAI description and contact

&#x20; - UserRole entity: admin / operator / client roles

&#x20; - URL Whitelist entity: governance session targeting

&#x20; - Admin setup flow with secure key management

REMOVED: No record found

MODIFIED:

&#x20; - All pages shifted from unauthenticated to authenticated

&#x20;   (pre-7.5a, no auth was required — no record of what was accessible)



──────────────────────────────────────────────────────────────────────────────

SPRINT 8 — "Tool Intelligence Marketplace"

Date: February 2026

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Platform Intelligence page: AI-ranked tool recommendations

&#x20;   Ranking criteria: performance, cost, Africa availability

&#x20; - Compare Tools page: side-by-side comparison of up to 4 tools

&#x20;   with AI analysis

&#x20; - My Tech Stack page: per-product technology stack management

&#x20;   with Africa readiness indicator

&#x20; - 65 tools pre-loaded across 12 categories

&#x20;   (NOTE: current docs reference 13 categories — one added post-Sprint 8)

&#x20; - AI recommendation panel: use-case-specific suggestions

&#x20; - Stack export as Markdown

&#x20; - Setup guide generation per product

REMOVED: No record found

MODIFIED: No record found

NOTES:

&#x20; - This is the FIRST recorded presence of:

&#x20;   · Solution provider ranking by performance + price  ✓ CONFIRMED

&#x20;   · Platform ranking by performance + price           ✓ CONFIRMED

&#x20; - Ranking was BUILT in Sprint 8 and remains active today.

&#x20; - "Africa availability" is a distinct ranking dimension not present

&#x20;   in any other tool intelligence system — specific to VEU's market scope.



──────────────────────────────────────────────────────────────────────────────

SPRINT 9 — "Product Clearance Protocol"

Date: February 2026

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Six-step clearance wizard:

&#x20;   Step 1: Governance Audit

&#x20;   Step 2: Launch Readiness (called "Readiness" in wizard)

&#x20;   Step 3: White-Label

&#x20;   Step 4: Data Export

&#x20;   Step 5: Demo Readiness (called "Demo" in wizard)

&#x20;   Step 6: Final Sign-Off

&#x20; - ClearanceRecord entity: step-by-step progress tracking

&#x20; - All five VEU AI Studio products pre-loaded

&#x20; - Step indicators with emoji status, overall clearance badges

&#x20; - AI-generated checklists per step

&#x20; - Custom product support: add any product

REMOVED: No record found

MODIFIED: No record found

NOTES:

&#x20; - The 6-step clearance protocol was NOT REPLACED in any later sprint.

&#x20;   It remains active and is the authoritative clearance gate.

&#x20; - This sprint established the clearance infrastructure that

&#x20;   Sprint HARD-1 later extended with a ClearanceProtocolPrompt

&#x20;   (automatic prompt to begin clearance after Auto Runner completes).



──────────────────────────────────────────────────────────────────────────────

SPRINT 10 — "My Workspace"

Date: March 2026

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Describe \& Build mode: natural language product creation

&#x20; - Clone \& Improve mode: audit any existing product URL,

&#x20;   generate improved version

&#x20; - Synthesize \& Build mode: compare 2–5 reference products,

&#x20;   synthesize the best

&#x20; - My Products page: strategy, architecture, and build sprint viewing

&#x20; - Register Product flow: connects to Portfolio and Clearance

&#x20; - Entity added: CreatedProduct (full three-output persistence)

REMOVED: No record found

MODIFIED: No record found

NOTES:

&#x20; - This is the FIRST recorded presence of:

&#x20;   · URL comparison / multi-URL synthesis feature  ✓ CONFIRMED

&#x20;   · Synthesize \& Build (comparing multiple URLs)  ✓ CONFIRMED

&#x20; - These features were ADDED in Sprint 10 and remain active today.

&#x20;   They were NOT removed or superseded. They were later moved from

&#x20;   "My Workspace" to the Configuration page (Card 2) in Sprint ARCH-1.

&#x20; - Three-output persistence in CreatedProduct (strategy, architecture,

&#x20;   build sprint) is the earliest structured product output model.



──────────────────────────────────────────────────────────────────────────────

SPRINT UX-A — "Zero-Typing and Tooltips"

Date: April 2026

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Portfolio Quick Select: select target URLs without typing

&#x20; - Smart session defaults: Manual iteration, Per-URL gate timing

&#x20;   pre-selected

&#x20; - Keyboard shortcuts: Cmd+N (new session), Cmd+Enter (launch),

&#x20;   Cmd+/ (AI assistant)

&#x20; - Universal tooltip system: 500ms delay, auto-flip, Escape dismissal

&#x20; - Tooltips on all 35 sidebar items, 10 section headers, logo,

&#x20;   New Session button

&#x20; - Tooltips on Clearance and Demo Builder action buttons

REMOVED: No record found

MODIFIED: No record found

NOTES:

&#x20; - "35 sidebar items" and "10 section headers" implies a sidebar

&#x20;   structure that existed BEFORE Sprint UX-C's rebuild. The exact

&#x20;   structure of the pre-UX-C sidebar has NO detailed record beyond

&#x20;   this count. It is inferred to have existed (not documented here).



──────────────────────────────────────────────────────────────────────────────

SPRINT UX-B — "Readability and Navigation"

Date: April 2026

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Typography standards: heading hierarchy, 13px body text,

&#x20;   WCAG AA contrast ratios

&#x20; - Information density rules: card padding, table row heights,

&#x20;   truncation standards

&#x20; - Breadcrumb trails on all pages

&#x20; - Context-aware back button logic

&#x20; - Loading, success, error, and empty state standardization

&#x20; - Mobile and tablet responsive breakpoints

&#x20; - Standards embedded as Transferable Capability in governance engine

REMOVED: No record found

MODIFIED:

&#x20; - All pages updated to conform to new typography/density standards

&#x20;   (scope: entire product)



──────────────────────────────────────────────────────────────────────────────

SPRINT UX-C — "Five-Section Sidebar"

Date: May 2026

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Five-section sidebar:

&#x20;   Dashboard, Auto Operations, Guided Operations,

&#x20;   Manual Operations, Settings

&#x20; - Auto Runner: live execution stream for all 8 process steps

&#x20; - Guided Operations: 8-step process bar with session persistence

&#x20; - Manual Operations: 8-step tracker with time awareness, AI Help

&#x20; - Dashboard rebuilt with 6 panels:

&#x20;   Product Health, Active Sessions, Pending Gates,

&#x20;   Recent Activity, Quick Actions, Usage

&#x20; - Onboarding page: 5-step guided setup with mode recommendation logic

&#x20; - Release Notes page with full sprint history

&#x20; - Entities added: AutoSession, GuidedSession, ManualSession

&#x20; - Tooltip coverage extended to all 5 sections and all sidebar items

REMOVED / DEPRECATED:

&#x20; ⚠️  CRITICAL — 14 labels renamed (release note says "14 other labels

&#x20;     updated" but does NOT list which ones beyond the two named below)

&#x20; ⚠️  Creator Studio → renamed to My Workspace

&#x20; ⚠️  My Creations → renamed to My Products

&#x20; ⚠️  The previous sidebar structure (with its unrecorded pre-UX-C

&#x20;     section layout) was REPLACED by the five-section structure.

&#x20;     No record of what the old sidebar sections were named or contained

&#x20;     beyond the UX-A count of "35 items, 10 section headers."

NOTES:

&#x20; - UX-C introduced the Auto Runner as the "single canonical

&#x20;   auto-execution interface." The previous autonomous engine

&#x20;   (/autonomous-engine) was superseded (redirected in Sprint HARD-1).

&#x20; - The 5-section sidebar of UX-C was FURTHER MODIFIED in Sprint ARCH-1

&#x20;   (became 6 sections with PORTFOLIO added).



──────────────────────────────────────────────────────────────────────────────

SPRINT ARCH-1 — "Architecture, Configuration \& Self-Renewal"

Date: May 2026

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Six-section sidebar (added PORTFOLIO section to UX-C's five)

&#x20;   Sections: Dashboard, Configuration, Auto Operations,

&#x20;             Guided Operations, Manual Operations, Settings

&#x20; - Configuration page at /configuration: unified 5-card session setup

&#x20;   (Product selection, Input Method, Objective, Auto Parameters, Launch)

&#x20; - Session context banner: on every Guided and Manual step

&#x20;   (shows product, objective, mode, step number)

&#x20; - Guided Operations approval flow fully implemented:

&#x20;   FlowAI proposes before every step → Approve / Modify / Skip →

&#x20;   findings feedback loop

&#x20; - Manual Operations user-proposal flow:

&#x20;   User defines scope → FlowAI confirms → executes

&#x20; - Auto Operations reads from Configuration: no re-entry required

&#x20; - Describe \& Build, Clone \& Improve, Synthesize \& Build now accessible

&#x20;   directly from Configuration sidebar section

REMOVED / DEPRECATED:

&#x20; ⚠️  "Govern \& Heal" step name → REPLACED by "Self-Renewal"

&#x20;     across ALL operation modes:

&#x20;     - Sidebar labels

&#x20;     - Progress bars

&#x20;     - Step headers

&#x20;     - AutoRunner step cards

&#x20; ⚠️  Old route: /guided/govern-and-heal (inferred) →

&#x20;     NOW: /guided/govern

&#x20; ⚠️  Old route: /manual/govern-and-heal (inferred) →

&#x20;     NOW: /manual/govern

&#x20;     (NOTE: exact old route name not recorded — "govern" is current)

MODIFIED:

&#x20; - Sidebar: 5 sections → 6 sections (PORTFOLIO added)

&#x20; - Input methods (Describe \& Build, Clone \& Improve, Synthesize \& Build)

&#x20;   MOVED from My Workspace page to Configuration page (Card 2)

&#x20;   (Sprint 10 had them as standalone modes; ARCH-1 unified them into

&#x20;   the Configuration card system)



──────────────────────────────────────────────────────────────────────────────

SPRINT HARD-1 — "Hardening, Audit Trail, and Legacy Cleanup"

Date: May 2026

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; - Session persistence: AutoSession, GuidedSession, ManualSession

&#x20;   results written to DB on every step completion

&#x20; - Resume Session prompt: returning users see unfinished sessions

&#x20;   with last step name, steps completed, and two-button choice

&#x20; - GovernanceAuditLog entity: tamper-evident log of every action

&#x20; - Silent background audit logger: session\_started, step\_completed,

&#x20;   proposal\_approved/modified/skipped, findings\_approved,

&#x20;   fix\_applied/skipped, clearance events

&#x20; - Audit Trail page at /audit-trail: reverse-chronological, filters

&#x20;   for product / action type / mode — read only

&#x20; - Audit Trail linked in Settings sidebar section

&#x20; - Clearance Protocol Prompt: after "Accept and Lock" in Auto Runner,

&#x20;   prompt to Start Clearance Protocol appears automatically

&#x20; - ClearanceProtocolPrompt component: stores session context for

&#x20;   pre-population of the Clearance wizard

&#x20; - Self-Renewal Phase 6 addition: "Re-run Self-Test to Verify Fixes"

&#x20;   button after Human Gate review completes

&#x20; - Score improvement delta display: "Functionality: 5 → 8 (+3) ✅"

&#x20;   per dimension when Phase 1 re-runs

&#x20; - Clearance Protocol added as fifth tool under Go To Market step

&#x20;   in both Guided and Manual modes

REMOVED / DEPRECATED:

&#x20; ⚠️  /flows → REDIRECT to /dashboard (legacy route retired)

&#x20; ⚠️  /flow-designer → REDIRECT to /dashboard (legacy route retired)

&#x20; ⚠️  /run-flow → REDIRECT to /dashboard (legacy route retired)

&#x20; ⚠️  /run-history → REDIRECT to /dashboard (legacy route retired)

&#x20; ⚠️  /variables → REDIRECT to /dashboard (legacy route retired)

&#x20; ⚠️  /old-dashboard → REDIRECT to /dashboard (legacy route retired)

&#x20; ⚠️  /autonomous-engine → REDIRECT to /auto-runner

&#x20;     (Autonomous Engine as a standalone page SUPERSEDED by Auto Runner.

&#x20;     Auto Runner is now the single canonical auto-execution interface.)

MODIFIED:

&#x20; - Auto Runner: "Accept and Lock" action now triggers

&#x20;   ClearanceProtocolPrompt automatically (new post-run flow)

NOTES:

&#x20; - The legacy routes being retired (/flows, /flow-designer, /run-flow,

&#x20;   /run-history, /variables) are the STRONGEST EVIDENCE that FlowAI

&#x20;   had a prior era with a flow-builder paradigm (visual flow designer,

&#x20;   flow runner, flow variables). That era predates Sprint 5 and has NO

&#x20;   detailed record in-app. See Section 3 below.



──────────────────────────────────────────────────────────────────────────────

SPRINT PROTECT-1 — "Anti-Crawling, IP Protection, Self-Renewal,

&#x20;                   and Self-Protection Architecture"

Date: May 2026 (most recent sprint on record)

──────────────────────────────────────────────────────────────────────────────

ADDED:

&#x20; Phase 1:

&#x20;   - Right-click protection on all FlowAI pages (polite notice)

&#x20;   - DevTools detection → logged to GovernanceAuditLog

&#x20;   - Content protection: user-select:none on reports and sprint instructions

&#x20;   - IP and legal footer on all pages: copyright, patent pending,

&#x20;     scraping prohibition

&#x20;   - Terms of Use page at /terms-of-use

&#x20;   - Privacy Policy page at /privacy-policy

&#x20;   - Session security: XOR cipher for sessionStorage, 8-hour expiry

&#x20;   - Bot detection utility: headless browser signatures, missing

&#x20;     User-Agent, rapid-click detection

&#x20; Phase 2:

&#x20;   - Platform Health Widget on Dashboard: status, last self-test,

&#x20;     active threats, proxy status

&#x20;   - Automated daily self-test (scheduledSelfTest function):

&#x20;     runs at 3am, tests proxy + 3 entities

&#x20;   - Anomaly detection utilities: session speed, score jump,

&#x20;     clearance contradiction

&#x20; Phase 3:

&#x20;   - Self-Renewal Capability Package at

&#x20;     /capability-packages/self-renewal — 4 components:

&#x20;     Self-Test, Self-Heal, Self-Monitor, Governance Hook

&#x20;   - Self-Renewal install sprints for all 5 VEU products at

&#x20;     /capability-packages/self-renewal/install

&#x20; Phase 4:

&#x20;   - Self-Protection Capability Package at

&#x20;     /capability-packages/self-protection — 4 components

&#x20;   - Self-Protection install sprints for all 5 VEU products

&#x20;   - Capability Transfer page at /capability-transfer:

&#x20;     consolidated sprint generator for any Base44 product

&#x20; Phase 5:

&#x20;   - Security Posture dimension added to Step 4 Quality Audit

&#x20;     (scored 0–10, triggers Self-Protection sprint if < 6)

&#x20;   - Self-Renewal Phase 2: generates Self-Protection installation

&#x20;     sprint when Security Posture < 6

&#x20;   - Capability Transfer added to Settings sidebar section

REMOVED / DEPRECATED: No record found

MODIFIED:

&#x20; - Step 4 (Quality Audit): scoring dimensions EXPANDED from 4

&#x20;   (UI/UX, API, Logic, Business Value from Sprint 5)

&#x20;   to 5 (+ Security Posture added in Phase 5)

&#x20; - Self-Renewal: Phase 2 behavior extended to auto-generate

&#x20;   Self-Protection sprint when Security Posture < 6



──────────────────────────────────────────────────────────────────────────────

POST-PROTECT-1 (undated — most recent state, not in ReleaseNotes yet):

Architecture + GTM Demo Stack + Agent Contract Layer

──────────────────────────────────────────────────────────────────────────────

ADDED (not yet in ReleaseNotes — in codebase only):

&#x20; - GTM Demo Stack: 4-tier commercial demo architecture

&#x20;   Tier 1: /veuaas (VEUaaSMarketing — marketing site)

&#x20;   Tier 2: /demo (DemoSandbox — self-serve sandbox)

&#x20;   Tier 3: /live-demo (LiveDemo — public demo with real backend)

&#x20;   Tier 4: /enterprise-demo (EnterpriseDemo — sales-led guided tour)

&#x20; - Portfolio system: PortfolioDashboard, ProductRegistry, RunsHistory

&#x20; - Sidebar: PORTFOLIO section added (6th section, from ARCH-1)

&#x20; - Architecture documentation (4 docs + defect register)

&#x20; - Agent contract layer:

&#x20;   · lib/agents/BaseAgent.js (G2 ratified)

&#x20;   · lib/agents/MessageSchema.js (40 topic constants)

&#x20;   · lib/governance/ScoreEvaluator.js (95/95 threshold)

&#x20;   · lib/shared/CredentialAdapter.js (Doppler-ready, browser-safe)

&#x20; - BaseAgentTest page at /base-agent-test (Packet 1.5 smoke tests)

&#x20; - Mock data files: src/data/demo/\*.json (3 files)

&#x20; - Component conventions document

&#x20; - Backend wiring status document

&#x20; - API contract document

REMOVED / DEPRECATED: No record found

NOTES:

&#x20; - Sidebar was described as "six-section" in ARCH-1 but current sidebar

&#x20;   code shows 6 sections. ARCH-1 note says "Dashboard, Configuration,

&#x20;   Auto Operations, Guided Operations, Manual Operations, Settings."

&#x20;   The PORTFOLIO section was added to bring it to the current 6-section

&#x20;   structure (PORTFOLIO, CONFIGURATION, AUTO OPS, GUIDED OPS,

&#x20;   MANUAL OPS, SETTINGS). Dashboard was merged into PORTFOLIO section.



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 2 — SPECIFIC FEATURE TRACES

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



FEATURE: URL COMPARISON / MULTI-URL SYNTHESIS / SYNTHESIZE \& BUILD

&#x20; First appearance: Sprint 10 — "My Workspace" (March 2026)

&#x20; Mechanism: Compare 2–5 reference product URLs, synthesize the best

&#x20;            elements into a unified product specification

&#x20; Last seen: ACTIVE — present in Configuration page Card 2,

&#x20;            sidebar items (Synthesize \& Build → /configuration?mode=synthesize)

&#x20; Renamed: No — always called "Synthesize \& Build"

&#x20; Moved: Sprint 10 → My Workspace page (standalone)

&#x20;        Sprint ARCH-1 → Configuration page Card 2 (unified with other

&#x20;        input methods: Describe \& Build, Clone \& Improve)

&#x20; Status: ACTIVE — NOT removed, NOT deprecated



FEATURE: SOLUTION PROVIDER RANKING BY PERFORMANCE + PRICE

&#x20; First appearance: Sprint 8 — "Tool Intelligence Marketplace"

&#x20;                  (February 2026)

&#x20; Mechanism: AI-ranked recommendations by performance, cost (price),

&#x20;            and Africa availability. 65 tools / 12 categories.

&#x20;            Compare Tools: side-by-side comparison of up to 4 tools.

&#x20; Last seen: ACTIVE — PlatformIntelligenceMarketplace page

&#x20;            (/marketplace/intelligence), CompareTools (/compare-tools),

&#x20;            MyStack (/my-stack)

&#x20; Status: ACTIVE — NOT removed, NOT deprecated

&#x20; NOTE: "Africa availability" is a unique third ranking dimension not

&#x20;       found in standard tool comparison systems. Specific to VEU scope.



FEATURE: PLATFORM RANKING BY PERFORMANCE + PRICE

&#x20; Same as above — "solution provider ranking" and "platform ranking"

&#x20; refer to the same Sprint 8 feature.

&#x20; Status: ACTIVE — NOT removed, NOT deprecated



FEATURE: MULTI-LLM ORCHESTRATION WITH PROVIDER ROUTING LOGIC

&#x20; First appearance: NO RECORD FOUND in sprint history

&#x20; Current state: InvokeLLM integration (Base44 Core) supports

&#x20;   multiple models: automatic, gpt\_5\_mini, gemini\_3\_flash, gpt\_5\_4,

&#x20;   gpt\_5\_5, gemini\_3\_1\_pro, claude\_sonnet\_4\_6, claude\_opus\_4\_6,

&#x20;   claude\_opus\_4\_7

&#x20; Routing as built: per-call model parameter — no centralized routing

&#x20;   decision engine recorded in sprint history

&#x20; CredentialAdapter supports multi-provider secrets via Doppler path:

&#x20;   flowai/<env>/PROVIDERS\_<providerId>\_<subkey>

&#x20; A dedicated "multi-LLM routing controller" or "provider routing

&#x20;   decision engine" is referenced in the Agent #4 (Provider Onboarding)

&#x20;   charter but that agent is DORMANT — NOT BUILT YET

&#x20; VERDICT: Multi-model support EXISTS (per-call). Centralized routing

&#x20;   logic does NOT YET EXIST as a built feature.

&#x20; Status of routing engine: NO RECORD of it being built OR removed



FEATURE: MULTI-AI COORDINATION BEYOND PEER REVIEW

&#x20; First appearance: NO RECORD FOUND

&#x20; The multiAgent backend function exists (function named "multiAgent")

&#x20; but its internal implementation has NOT been reviewed in this session.

&#x20; The masterOrchestrator function also exists.

&#x20; Neither is documented in sprint history as a user-facing feature.

&#x20; Status: NO RECORD of what "multiAgent" delivers as a feature.

&#x20;         Function exists; sprint record for it does not.



FEATURE: ANY OTHER RANKING / COMPARISON FEATURES

&#x20; Compare Tools page (/compare-tools): side-by-side comparison

&#x20;   of up to 4 tools — BUILT Sprint 8, ACTIVE

&#x20; Competitor Benchmarking: planned as Agent #15 (Benchmarking) —

&#x20;   DORMANT, not built as a user feature yet

&#x20; Benchmarking dimension in scoring: referenced in Configuration

&#x20;   Card 4 ("Include Competitor Benchmarking" toggle) — wired

&#x20;   to settings.benchmark flag in API contract, but the backend

&#x20;   execution of benchmarking is NOT live

&#x20; Status: Tool comparison ACTIVE. Product/competitor benchmarking

&#x20;   UI toggle exists but backend execution DORMANT.



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 3 — EARLIEST VERSION: FEATURES THAT PREDATE SPRINT 5

(The "Pre-History" Era — NO DETAILED IN-APP RECORD)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



EVIDENCE FOR A PRIOR ERA ("Flow Builder" paradigm):

Sprint HARD-1 retired these legacy routes with redirects to /dashboard:

&#x20; - /flows

&#x20; - /flow-designer

&#x20; - /run-flow

&#x20; - /run-history

&#x20; - /variables

&#x20; - /old-dashboard

&#x20; - /autonomous-engine → /auto-runner



These routes imply that FlowAI PREVIOUSLY had:

&#x20; - A visual flow designer (flow-designer)

&#x20; - A flow runner (run-flow)

&#x20; - Flow run history (run-history)

&#x20; - Flow variables management (variables)

&#x20; - A flows list/library (flows)

&#x20; - A separate Autonomous Engine page (/autonomous-engine)

&#x20; - An "old dashboard" (before the rebuilt Dashboard)



ENTITIES FROM THIS ERA (still defined, no longer primary):

&#x20; - SavedFlow (name, nodes, edges, description, last\_run)

&#x20; - FlowVersion (flow\_id, flow\_name, version\_number, nodes, edges,

&#x20;   variables, label)

&#x20; - FlowRun (flow\_id, flow\_name, status, duration\_ms, node\_count,

&#x20;   error\_message, input\_preview, output\_preview)

&#x20; - FlowComment (flow\_id, author\_name, author\_email, message, node\_id,

&#x20;   reply\_to\_id, reply\_to\_preview, reactions)



These entities confirm a full node-based flow builder era with:

&#x20; - Visual nodes and edges (canvas-based)

&#x20; - Flow versioning

&#x20; - Run history with duration and error tracking

&#x20; - Collaborative comments per flow, per node, with replies and reactions

&#x20; - Variables management system



COMPONENTS FROM THIS ERA (still exist in codebase as files):

&#x20; components/designer/ — full visual flow designer component set:

&#x20;   AINodeAssistant, BlockLibrary, BlockSettings, Canvas, CanvasNode,

&#x20;   CanvasPreview, EdgeLayer, NodeTester, ScheduledTriggerPanel,

&#x20;   TemplateLibraryModal, ValidationBar, VariableAutocompleteTextarea,

&#x20;   VariableManager, VersionHistoryPanel, WebhookPanel,

&#x20;   settings/\* (AISchemaSettings, AISettings, ActionSettings,

&#x20;              ConditionSettings, InputSettings, OutputSettings)

&#x20; components/flows/ — flow management components:

&#x20;   FlowBatchExport, FlowClone, FlowExecutionLogs, FlowKanban,

&#x20;   FlowPerformanceChart, FlowPerformanceExport, FlowScheduler,

&#x20;   FlowVersionHistory



CONCLUSION FOR PRE-SPRINT-5 ERA:

&#x20; FlowAI began as a VISUAL FLOW BUILDER with:

&#x20; - Node-based canvas designer

&#x20; - Saved flows with versioning

&#x20; - Scheduled flow triggers (webhooks + cron)

&#x20; - Flow analytics and performance charts

&#x20; - Flow comments and collaboration

&#x20; - Kanban view of flows

&#x20; - Batch export, clone, run history

&#x20; This entire paradigm was SUPERSEDED by the process-driven

&#x20; 8-step pipeline architecture. The canvas/flow paradigm components

&#x20; remain in the codebase as files but are NOT ROUTED or accessible.

&#x20; WHEN this transition happened: NO RECORD. It predates Sprint 5.

&#x20; All flow-builder entities (SavedFlow, FlowVersion, FlowRun, FlowComment)

&#x20; are still defined and may contain historical data.



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 4 — DELETED / ARCHIVED COMPONENTS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



ROUTES RETIRED (redirects added, pages still exist as files):

&#x20; /flows            → /dashboard  (FlowDesigner era legacy)

&#x20; /flow-designer    → /dashboard  (FlowDesigner era legacy)

&#x20; /run-flow         → /dashboard  (FlowDesigner era legacy)

&#x20; /run-history      → /dashboard  (FlowDesigner era legacy)

&#x20; /variables        → /dashboard  (FlowDesigner era legacy)

&#x20; /old-dashboard    → /dashboard  (pre-UX-C Dashboard)

&#x20; /autonomous-engine → /auto-runner (superseded by Auto Runner)

&#x20; /creator-studio   → /configuration (renamed My Workspace → Config)

&#x20; /workspace        → /configuration



PAGES THAT STILL EXIST AS FILES BUT ARE EFFECTIVELY DEPRECATED

(routes exist in App.jsx but pages serve legacy/redirect purposes):

&#x20; Dashboard.jsx       — /old-dashboard redirect destination

&#x20;                       Original dashboard, superseded by MainDashboard

&#x20; FlowDesigner.jsx    — still imported, route /flow-designer exists BUT

&#x20;                       redirects to /dashboard

&#x20; RunFlow.jsx         — still imported, redirects to /dashboard

&#x20; Flows.jsx           — still imported, two routes both redirect /dashboard

&#x20; RunHistory.jsx      — still imported, route redirects to /dashboard

&#x20; Variables.jsx       — still imported, route redirects to /dashboard

&#x20; AutonomousEngine.jsx — still imported, redirects to /auto-runner

&#x20; CreatorStudio.jsx   — still imported, redirects to /configuration



DELETED PAGES (not in App.jsx, not referenced — NO RECORD of deletion):

&#x20; NO RECORD FOUND — no git history available to confirm deletions



ARCHIVED BRANCHES: NO RECORD FOUND (no git access in this session)



COMPONENTS THAT EXIST AS FILES BUT ARE UNREACHABLE:

&#x20; All components/designer/\* (18 files) — unrouted

&#x20; All components/flows/\* (8 files) — unrouted

&#x20; These are NOT deleted but are dead code.



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 5 — NAMING CHANGES (recorded + inferred from evidence)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



CONFIRMED RENAMES (source: ReleaseNotes.jsx):

&#x20; Creator Studio          → My Workspace    (Sprint UX-C)

&#x20; My Creations            → My Products     (Sprint UX-C)

&#x20; Govern \& Heal (step)    → Self-Renewal    (Sprint ARCH-1)

&#x20; \[14 other labels]       → \[NOT RECORDED] (Sprint UX-C note only says "14 other labels updated")

&#x20; Dashboard               → MainDashboard   (internal, new page added;

&#x20;                           old Dashboard became legacy /old-dashboard)

&#x20; Autonomous Engine page  → Auto Runner     (Sprint HARD-1 redirect)

&#x20; My Workspace (section)  → Configuration  (Sprint ARCH-1)



INFERRED RENAMES (evidence-based, not explicitly recorded):

&#x20; Flow Builder paradigm   → Process Pipeline paradigm

&#x20;                           (entire product renamed conceptually —

&#x20;                           not a page rename, a paradigm shift)

&#x20; Govern \& Heal route     → /guided/govern, /manual/govern

&#x20;                           (old route name not recorded)



UNRECORDED: The 14 other label changes from Sprint UX-C are LOST —

&#x20; the release note acknowledges them but does not list them.



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 6 — ITERATION SOURCES

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



SOURCE ATTRIBUTION AS RECORDED IN CODEBASE / DOCS:



From docs/FLOWAI\_BACKEND\_WIRING.md (Section 5):

&#x20; "Three foundational W2 files are now committed to /src/lib/..."

&#x20; Workstream model is used:

&#x20;   W0 — ratification authority (reviews and ratifies G2-level decisions)

&#x20;   W1 — Doppler vault architecture (credential system design)

&#x20;   W2 — Agent contract layer (BaseAgent.js, MessageSchema.js,

&#x20;         ScoreEvaluator.js authored by W2, ratified by W0, placed by W5)

&#x20;   W5 — placement / integration authority

&#x20; This is an internal multi-workstream model. No external AI

&#x20; assistant attribution is recorded in any document.



From prior consultation context (user-provided, not in codebase):

&#x20; "The prior consultation included you \[Base44 AI], ChatGPT, Gemini,

&#x20;  Perplexity, Base44, GitHub Copilot, and Vercel v0."

&#x20; 10 locked architectural decisions came from that multi-AI consensus.

&#x20; NO specific decisions are attributed to a specific AI in the codebase.



WHAT IS RECORDED vs WHAT IS NOT:

&#x20; ✓ Recorded: W0/W1/W2/W5 workstream model for agent contract work

&#x20; ✓ Recorded: "G2 RATIFIED" status on BaseAgent.js (governance gate 2)

&#x20; ✓ Recorded: "Packet 1.5 amendment" label on BaseAgent.js changes

&#x20; ✗ Not recorded: Which AI or person authored any specific sprint

&#x20; ✗ Not recorded: Whether any sprint was directed externally vs

&#x20;   internally

&#x20; ✗ Not recorded: Claude Code vs Base44 AI vs GPT attribution per sprint



RISK FLAG:

&#x20; The largest unknown is the pre-Sprint-5 era (flow builder paradigm).

&#x20; No sprint record exists for when it was built or when it was

&#x20; superseded. If any external AI assistant directed that transition,

&#x20; it is not documented. This gap is the most significant risk for

&#x20; the "nothing is being lost in migration" goal — the flow builder

&#x20; components (designer, flows) are dead code in-place but are not

&#x20; formally deprecated or archived.



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY: EXPLICIT "NO RECORD FOUND" DECLARATIONS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━



The following were specifically requested but have NO record found

in any in-app source (ReleaseNotes, docs, codebase):



&#x20; - Any sprint before Sprint 5 (October 2025)

&#x20; - When the flow-builder paradigm was built (pre-Sprint 5)

&#x20; - When the flow-builder paradigm was superseded (pre-Sprint 5)

&#x20; - The 14 unnamed label changes in Sprint UX-C

&#x20; - The exact old sidebar section names before UX-C

&#x20; - The old "Govern \& Heal" route path (before /guided/govern)

&#x20; - A centralized multi-LLM routing decision engine (never built)

&#x20; - "Multi-AI coordination beyond peer review" as a named feature

&#x20; - Per-sprint AI/human attribution for any sprint

&#x20; - Git deletion history for any files

&#x20; - Git branch archive history



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

END — FlowAI Historical Inventory — 2026-05-10

