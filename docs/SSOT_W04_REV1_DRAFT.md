# FlowAI SSOT — W04-Rev-1 (DRAFT — Pending W6 Panel Review)
Version: W04-Rev-1 | Date: 2026-05-14 | Status: DRAFT

## 1. IDENTITY
FlowAI is a proprietary AI Operating System built by VEU AI Studio. Not a SaaS product — an OS-layer infrastructure platform that powers VEU products internally, is licensed commercially to external providers, individuals, and small businesses, and enables users to create native apps, mobile apps, SaaS platforms, and Agentic AI systems.
Tagline: The AI Operating System that builds, tests, renews, and scales any digital product.

## 2. MISSION — DEMOCRATIZATION
FlowAI democratizes AI-powered product creation for underserved people globally. Target users: individuals and small business owners with no engineering background; solution providers building personalized apps for niche communities; organizations in emerging markets (Africa-first, global scale); VEU AI Studio (primary internal user). Enables any user to create native apps, mobile apps, SaaS, Agentic AI; audit, benchmark, improve any digital product; deploy working products with real URLs — no code required.

## 3. COMMERCIAL MODEL
Licensed OS platform. Pricing: per seat, per product, per time, combination packages. Providers are authenticated FlowAI users. End-customers are sub-orgs they manage. Revenue splits tracked per provider.

## 4. THREE LEVELS OF ORCHESTRATION
Level 1 — Building FlowAI (current phase): VEU constructs FlowAI itself (agents, governance, pipeline, Orchestra, OrchestratorHub). All 25 agents ship dormant at recommend_only before wire-in.
Level 2 — FlowAI on Itself: once live, FlowAI self-monitors, self-renews, self-updates Orchestra rankings, runs 8-step pipeline against own repos.
Level 3 — FlowAI on External Products: accepts via 4 input modes, aggressively crawls everything, applies 8-step pipeline, always delivers new live URL.

## 5. FOUR INPUT MODES
1. Clone & Improve — single URL, crawl, audit, enhance
2. Describe & Build — natural language, generate from scratch
3. Paste / Upload — text + screenshots, reconstruct and build
4. Synthesize & Build — 2–5 URLs, synthesize into new product
INPUT modes are distinct from EXECUTION modes.

## 6. AGGRESSIVE CRAWLING, TESTING & RESOLUTION CONTRACT
Crawl scope: all links, cards, modals, pages, engines, workspaces, embedded AI agents.
Standard: no element skipped; authenticated + unauthenticated; mobile + desktop; error states triggered.
Resolution contract: every issue found MUST be resolved before output delivered. FlowAI accesses full Orchestra for resolution. No issue out of scope. Automated fix → re-test cycle until zero issues. Final clean crawl confirms before URL delivered.

## 7. OUTPUT CONTRACT
Every run produces a new live URL — fully resolved, zero known issues. Real deployed working product only — never static HTML. Source acquisition order: retrieve source → patch + deploy / if unreachable, generate from scratch → deploy. Static HTML permanently rejected. FlowAI does not deliver until find → fix → re-test → confirm clean cycle complete.

## 8. THE ORCHESTRA — 10 MEMBERS
Claude Code, Base44, Lovable, v0, Cursor, OpenRouter, Browserless, Anthropic API (direct), Replit, Playwright.
Ranked UI: user sees ranked list by performance + cost at each pipeline stage.
Orchestra Execution Modes: Auto / Guided / Manual.

## 8a. SYSTEM OPERATION LEVELS (separate axis from Orchestra Execution Modes)
Manual — provider drives every decision
Supervised — FlowAI acts, provider reviews before proceeding
Autonomous — FlowAI operates end-to-end without intervention
Independent axes — any combination valid.

## 9. THE 8-STEP PIPELINE
1-Research, 2-Design, 3-Build, 4-Quality Audit, 5-Deploy, 6-Monitor, 7-Self-Renewal, 8-GTM

## 10. THE 25-AGENT ROSTER
All proprietary VEU IP. Ship dormant at recommend_only. OrchestratorHub wire-in only after all 25 built.
12 embedded in every product: #1,2,3,6,7,9,10,13,15,17,19,20
8 FlowAI-internal-only: #4,5,8,11,12,14,16,18
5 remaining: slots #21–#25, CEO G3-ratified, validator update queued W5a Phase 1.0.
Self-Protection Agent #13: DMCA, clone detection, edge defense, scraper blocking, Cloudflare Bot Management, watermarking.

## 11. GOVERNANCE
95/95 threshold. Panel quorum ≥7/10. Supermajority 8/8.
Panel SSOT Access Rules (CEO-ratified):
- W0x must prepend full CANONICAL_REFERENCE.md to every Panel consultation — no exceptions
- Panel consensus grants write-authority to propose SSOT amendments
- Amendments enter CA-n cycle, require CEO ratification
- Sessions without SSOT attached are invalid; must be re-run

## 12. REMEDIATION MODES
Active: (i) Recommend-only / (iv) Fork-and-fix
Incremental: (ii) Code-gen / (iii) Direct-write

## 13. TECHNOLOGY STACK
Deployment: Vercel. State: Vercel KV + Supabase. Runtime: Node.js v24+. Testing: Vitest. Linting: ESLint. Build: Vite. Module system: ESM. Repo: github.com/victor2081new-cloud/flowai.git. Branch: flowai-v0.1.

## 14. PRODUCT-AGNOSTIC RULE
Zero product-specific code. No VEU product names (SAIGE, RelTwin, ReachSMS, PressAI, MyPregLife) in agent code, tests, configs, URL patterns, or env vars. Smoke tests use neutral fixtures only. Must support 6th, 10th, 100th product without code changes.

## 15. WORKSTREAM ROUTING
W0x: orchestrator, dispatch, lineage. W1: credentials. W2: engineering + verification. W3: audit + spec drafting. W4: smoke testing + QA. W5a/W5b/W5c: shared infrastructure, agent builds. W6: dedicated Panel workstream.
W5x builds. W2 verifies. W6 runs Panel. W0x dispatches. CEO pastes.

## 16. CEO OPERATING RULES (CANONICAL W0x PROTOCOL)
CEO role = approve, click, copy, paste only — nothing else.
W04 posts instructions in copy boxes labeled with target Claude Code window.
CEO pastes into named window. Window executes auto mode and reports back using mandatory format.
CEO pastes report back to W04. W04 summarizes and recommends action.
Mandatory report format:
════════════════════════════════════════
[Wx] REPORT — [TASK NAME]
════════════════════════════════════════
[content]
════════════════════════════════════════
Started: [ts] | Completed: [ts] | Duration: [mm:ss]
════════════════════════════════════════

## 17. CURRENT PHASE STATUS (2026-05-14)
Phase 0 COMPLETE (commit 5dec08d, 895 passing tests, Agents #1/#2/#3 SHIPPED-GREEN). Active branch: flowai-v0.1. Next gate: Production Hardening (RLS + observability + CI/CD) before remaining 22 agents. CA-1, CA-2 ratified. CA-3 promotion in flight. CA-4 split 4/4 — CEO disposition pending. CA-5 needs re-Panel.
