# Panel — state + stack + roadmap (2026-05-20)

**Dispatch:** W6 — Panel-authoritative; quantify %, hours, named-tool stack, week-by-week roadmap.
**Bundle:** 36564 chars · canonical: 15996 · artifact: 5441
**Started:** 2026-05-20T18:33:00.785Z · **Finished:** 2026-05-20T19:04:30.603Z
**Engaged:** 8/10 · Tangential: 1 · Silent: 1
**Distinct objections:** 30
**Alignment:** 65.6% · ✅ PASS
**Quorum:** ≥7/10 ENGAGED per Locked Rule 17

## Per-question
| Q | Verdict | Top key | Top / Engaged | Cleared (drafted ≥7) |
|---|---|---|---|---|
| **K1A** | `UNANIMOUS_K1A-15-25PCT` | `K1A-15-25PCT` | 8/8 | — |
| **K1B** | `QUORUM_PLURALITY_K1B-S1-CORE-LOOP` | `K1B-S1-CORE-LOOP` | 7/8 | ✅ |
| **K2** | `PLURALITY_K2-120-180-HRS` | `K2-120-180-HRS` | 5/8 | — |
| **K3A** | `QUORUM_PLURALITY_K3A-V0-DEV` | `K3A-V0-DEV` | 7/8 | ✅ |
| **K3B** | `PLURALITY_K3B-CLAUDE-CODE-PLUS-CODEX-CROSS` | `K3B-CLAUDE-CODE-PLUS-CODEX-CROSS` | 5/8 | — |
| **K3C** | `UNANIMOUS_K3C-CODERABBIT-PLUS-VERCEL-CHECKS` | `K3C-CODERABBIT-PLUS-VERCEL-CHECKS` | 8/8 | ✅ |
| **K3E** | `UNANIMOUS_K3E-RETIRE-ENTIRELY` | `K3E-RETIRE-ENTIRELY` | 8/8 | ✅ |
| **K4** | `PLURALITY_K4-VEU-FIRST-FLOWAI-SECOND` | `K4-VEU-FIRST-FLOWAI-SECOND` | 4/8 | — |

## Detail
### K1A
K1A — OVERALL % COMPLETE to CA-18 §1-§6 PRODUCTION-GRADE conformance. Given (a) §3 PASS, (b) §1 PARTIAL (UI accepts URL but never invokes construction; 0 PRs across 18 runs; no pre-run gate; no trajectory), (c) §2 FAIL (6/10 dimensions silently omitted, no jurisdiction column), (d) §4 PARTIAL, (e) §5 PARTIAL (construction_eligible=false on flowai; 4 empty self-runs), (f) §6 PARTIAL (40 rows of data + service built but 0 tool.selection envelopes). Pick the weighted-overall bucket that best fits the verified evidence.

Tally (n=8):
  - `K1A-15-25PCT` "15-25% complete. Only §3 fully passes; §1 and §2 are at the core of the promise and both are <30% done; the 0-PR / 0-tool.selection / 0-construction-complete envelope data shows the operational layer has barely moved. Substantial codebase + canonical text exis" → **8**
  - `K1A-30-40PCT` "30-40% complete. §3 fully done + §4 + §6 partially done give meaningful weight; §1 has the audit half working (preview URLs produced via CLI); construction engine S1+S2+S4+S5+S6+S8 gates exist in src/lib/construction/. Architecture is correct; wiring is incomp" → **0**
  - `K1A-45-55PCT` "45-55% complete. CA-18 §3 (iteration model) is 100% done; §4 (product-agnostic) is ~75%; §6 (data layer + service built, runtime emission missing) is ~50%; §1 has working preview-URL production from CLI = ~40%; §5 is invoked but unproven; §2 is the genuine FAI" → **0**
  - `K1A-OTHER` "None of the buckets fit; supply the percentage that best matches the evidence and explain." → **0**
**Verdict:** UNANIMOUS_K1A-15-25PCT — 8 of 8 ENGAGED on K1A-15-25PCT (unanimous)

### K1B
K1B — Which CA-18 section requires the MOST remaining work to reach production-grade? Pick ONE.

Tally (n=8):
  - `K1B-S1-CORE-LOOP` "§1 Core Loop — UI→Construction wiring is the binding promise; current UI submit triggers audit only (LandingPage.jsx:442-491 navigate("/auto-runner") which runs client-side 8-step LLM pipeline; never calls runConstruction). Plus pre-run honest gate + trajector" → **7**
  - `K1B-S2-QUALITY-DIMENSIONS` "§2 Quality Dimensions — 6 of 10 silently omitted; no jurisdiction column; need to add finding categories for syntax/duplication/accessibility/privacy/legal + wire CA-17 S4 9-pillar suite into Phase B post-deploy. This is multi-quarter scope per any honest esti" → **1**
  - `K1B-S6-TOOL-INTELLIGENCE` "§6 Tool Intelligence runtime — attachToolIntelligenceService() defined 0 call sites; renewal/orchestrator.js does not use OrchestratorHub; 0 tool.selection envelopes across 44 governance entries. Plus GUIDED-mode picker UI. This is a contained wiring task but " → **0**
  - `K1B-INTEGRATION-PRODUCTION-HARDENING` "Production hardening (cross-section): auth, rate-limit, error states, rollback paths, observability (Sentry / PostHog), real Vercel deploy verification (today /api/run.js:33 fabricates fake URLs from app name + timestamp — a mock-data violation of §1). This is" → **0**
**Verdict:** QUORUM_PLURALITY_K1B-S1-CORE-LOOP — 7 of 8 on K1B-S1-CORE-LOOP (≥ quorum 7/10)

### K2
K2 — TOTAL HOURS to reach 100% on the K2-SIMPLIFY-MVP scope (prior Panel cleared 7/10): URL submitted via UI → wire_up class construction → preview URL returned to UI; pre-run honest-assessment gate; minimum Tool Intelligence wiring; E2E Playwright proof; flowai-on-flowai self-application cycle producing measurable delta. Drop jurisdiction/accessibility/privacy/legal from MVP per K2-SIMPLIFY; mark KNOWN-GAP. Pick the realistic hour bucket assuming Victor + AI tools (Claude Code, v0.dev, Cursor) + 10-15 hrs/week verification loop.

Tally (n=8):
  - `K2-80-120-HRS` "80-120 hours total. The wiring is small (UI form → API route → existing runConstruction). Most of the engine + gates already exist. Aggressive estimate but plausible if AI tools are competent + Victor verifies tightly." → **0**
  - `K2-120-180-HRS` "120-180 hours total. Realistic mid-range: UI wiring ~40h, backend integration ~30h, pre-run honest gate ~15h, Tool Intelligence wiring ~20h, E2E test ~20h, auth+observability ~20h, self-application debug ~15h. Reflects production-hardening friction AI tools sy" → **5**
  - `K2-180-250-HRS` "180-250 hours total. Pessimistic with realistic friction: every "single PR" expands to 3-4 PRs once auth + error states + rollback + observability + cross-browser testing are real. Plus debugging the empty-payload self-runs takes longer than budgeted (governan" → **1**
  - `K2-250-PLUS-HRS` "250+ hours total. Even MVP is a multi-month effort once production-grade is taken seriously — auth flows + Stripe + observability + Sentry + Playwright cloud + Vercel Checks integration + Supabase RLS hardening + rate-limiting all stack up. Plus debugging the " → **2**
**Verdict:** PLURALITY_K2-120-180-HRS — 5 of 8 on K2-120-180-HRS (below 7/10 quorum)

### K3A
K3(a) — PRIMARY CODE GENERATOR for FlowAI FRONTEND (Vite+React today, prior commits show heavy use of components from src/components/). Pick the named tool that gives Victor the best component-per-verification-cycle output.

Tally (n=8):
  - `K3A-V0-DEV` "v0.dev (Vercel) — purpose-built for React/Next.js/Tailwind/shadcn output; production-quality components; Vercel-native deploy integration; outputs match the project's shadcn stack. Best when Victor needs net-new component output. Verification: copy code into b" → **7**
  - `K3A-CURSOR` "Cursor — IDE-embedded; pair-programming flow; tight loop with the codebase; multi-file refactors. Best for surgical edits to existing 81-page src/pages/ tree. Verification: in-editor diff review + Victor visual + test run." → **1**
  - `K3A-LOVABLE` "Lovable — full-app from prompt; replaces FlowAI rebuild from scratch. Too heavy for surgical wiring; better for VEU products. Verification: full preview URL + investor-eye review." → **0**
  - `K3A-CLAUDE-CODE` "Claude Code (this orchestrator) — already integrated; multi-file editing + bash + test running; can extend existing patterns. Risk: same overclaim pattern this session. Verification: Victor manually opens browser after every PR + reads commits + diffs." → **0**
**Verdict:** QUORUM_PLURALITY_K3A-V0-DEV — 7 of 8 on K3A-V0-DEV (≥ quorum 7/10)

### K3B
K3(b) — PRIMARY CODE GENERATOR for FlowAI BACKEND (Node + Vercel Functions + Supabase, src/lib/agents/* + src/lib/construction/* + src/api/). Pick the named tool.

Tally (n=8):
  - `K3B-CLAUDE-CODE` "Claude Code — multi-file repo editing + bash + tests + commits; strongest at Node + Supabase + integration work; can use Supabase MCP for migrations. Risk: must enforce Victor verification on every PR. Verification: Claude Code opens PR → Victor reviews diff +" → **2**
  - `K3B-CURSOR-COMPOSER` "Cursor Composer — multi-file IDE edits with semantic search across repo; faster for surgical backend work; Victor stays in IDE. Verification: in-editor diff + test run + manual deploy check." → **1**
  - `K3B-CODEX` "Codex (OpenAI cloud worker) — async multi-file PRs; different model family (independence vs Claude Code). Useful as cross-model spot-check on Claude Code's output. Verification: PR comparison + Panel adjudication when outputs diverge." → **0**
  - `K3B-CLAUDE-CODE-PLUS-CODEX-CROSS` "Claude Code as primary + Codex as cross-model spot-check on 1-in-N PRs (breaks same-model convergence risk per W7 Panel verdict 3d9df57). Combined cost ≈ single tool; structural verification stronger. Verification: same as K3B-CLAUDE-CODE plus Codex review on " → **5**
**Verdict:** PLURALITY_K3B-CLAUDE-CODE-PLUS-CODEX-CROSS — 5 of 8 on K3B-CLAUDE-CODE-PLUS-CODEX-CROSS (below 7/10 quorum)

### K3C
K3(c-d) — CODE REVIEW + DEPLOYMENT VERIFICATION before Victor eyeballs. Pick the named combination that gives the highest signal-per-cost.

Tally (n=8):
  - `K3C-CODERABBIT-PLUS-VERCEL-CHECKS` "CodeRabbit (multi-model PR review bot, free tier; reviews every PR with Claude/GPT/Gemini reasoning) + Vercel Checks (Lighthouse + Playwright cloud + linter on every deploy) + Sentry (runtime errors post-deploy). Triple-layer: PR review, deploy gate, runtime m" → **8**
  - `K3C-CURSOR-REVIEW-PLUS-PLAYWRIGHT` "Cursor Review (in-IDE; semantic diff analysis) + Playwright tests in GitHub Actions (e2e smoke on every PR) + Lighthouse CI. Same gate count, all in-repo. Cost: Cursor Pro ($20/mo), GitHub Actions free tier." → **0**
  - `K3C-CLAUDE-CODE-AS-REVIEWER` "Claude Code launched in --review mode after every PR (sub-agent with code-reviewer system prompt) + Playwright CI + Vercel deploy logs read aloud to Victor. Same model as author (W7 convergence risk per 3d9df57 9/11 verdict); not recommended as sole layer." → **0**
  - `K3C-PANEL-FOR-CONSEQUENTIAL-PRS` "Panel adjudication ONLY on consequential PRs (irreversible, multi-file, schema-changing) + lightweight Cursor/CodeRabbit pass on routine PRs. Aligns with W6 W7 verdict (panel-for-major). Cost: ~$0.50-2 per Panel run + ~$0 for routine. Best signal-per-cost for " → **0**
**Verdict:** UNANIMOUS_K3C-CODERABBIT-PLUS-VERCEL-CHECKS — 8 of 8 ENGAGED on K3C-CODERABBIT-PLUS-VERCEL-CHECKS (unanimous)

### K3E
K3(e) — BASE44 DISPOSITION. Base44 was the original scaffold tool for this codebase. Pick the right disposition for ongoing FlowAI MVP work.

Tally (n=8):
  - `K3E-RETIRE-ENTIRELY` "RETIRE Base44 entirely. The codebase has accumulated Base44 scaffold-leftovers (74 of 81 pages in src/pages/ are likely unused per glob output; src/api/base44Client.js is still imported). Going forward: v0.dev for new components; Claude Code for backend; treat" → **8**
  - `K3E-KEEP-FOR-PROTOTYPING-VEU-PRODUCTS` "KEEP Base44 for prototyping new VEU products only — NOT for FlowAI itself. Base44 is fast for getting a full-stack prototype live; useful when Victor wants a same-day MyPregLife/SAIGE/ReachSMS scaffold to iterate on. Once scaffolded, Lovable/v0.dev/Cursor take" → **0**
  - `K3E-KEEP-LANDING-PAGES-ONLY` "KEEP Base44 for static marketing/landing pages (e.g. flowai-dun.vercel.app marketing pages); v0.dev for product UI; Claude Code for backend. Reduces Base44 footprint without removing it entirely." → **0**
  - `K3E-REPLACE-WITH-LOVABLE` "REPLACE Base44 with Lovable for any scaffold work going forward. Lovable + Bolt are the 2026-current full-app generators that have largely overtaken Base44 in capability. Migrate any Base44-dependent code as encountered." → **0**
**Verdict:** UNANIMOUS_K3E-RETIRE-ENTIRELY — 8 of 8 ENGAGED on K3E-RETIRE-ENTIRELY (unanimous)

### K4
K4 — WEEK-BY-WEEK ROADMAP shape. Given K2 hours bucket + K3 tool stack + Victor's 10-15 hrs/week verification loop + prior K3 portfolio-first verdict (8/10 ship VEU products with off-the-shelf tools while FlowAI matures). Pick the sequencing that gives the best defensibility at each milestone.

Tally (n=8):
  - `K4-FLOWAI-MVP-LINEAR-8W` "FlowAI MVP LINEAR over 8 weeks: W1-2 UI→Construction wiring (v0.dev + Claude Code) + Victor verifies in browser; W3-4 pre-run honest gate + Tool Intelligence wiring; W5-6 E2E Playwright + flowai-on-flowai self-application cycle debug; W7-8 polish + investor de" → **2**
  - `K4-VEU-FIRST-FLOWAI-SECOND` "VEU FLAGSHIP FIRST over 8 weeks (per prior K3 8/10 portfolio-first verdict): W1-2 pick + scope RelTwin (or MyPregLife) via Lovable + v0.dev + Stripe; W3-4 first 10 beta users + auth + onboarding; W5-6 polish + Sentry + analytics; W7-8 public sign-ups + revenue" → **4**
  - `K4-PARALLEL-MIN-FLOWAI-PLUS-VEU` "PARALLEL minimum-FlowAI + VEU flagship over 8 weeks: W1-2 FlowAI honest-PATH-B (UI submit produces an actual audit report — stop overclaiming; ~30 hours, no construction wiring) + start RelTwin scaffold via Lovable; W3-4 RelTwin MVP shipped + FlowAI honest-PAT" → **0**
  - `K4-DEMO-EXTRACT-BACKWARDS` "DEMO-EXTRACT-BACKWARDS over 8 weeks: W1-2 build a single hardcoded reliable demo path (one pre-registered URL with known improvement potential → reliably produces a new improved URL via the construction engine; demo is invariant); W3-4 generalize backwards (UI" → **2**
**Verdict:** PLURALITY_K4-VEU-FIRST-FLOWAI-SECOND — 4 of 8 on K4-VEU-FIRST-FLOWAI-SECOND (below 7/10 quorum)


## All distinct objections (30)
**01. [Slot 1] §4 global-uniform-95 unachievable**

> §4 mandates uniform ≥95 quality globally with NO sub-95 exception path, but §2 dimensions 9-10 require jurisdiction-specific compliance. A product cannot simultaneously achieve ≥95 on EU GDPR, US CCPA, China PIPL, and India DPDP without massive overhead that makes the platform economically unviable.

**02. [Slot 1] §5 self-application construction_eligible=FALSE**

> §5 claims FlowAI applies to its own development, but verified evidence shows product_registry.flowai.construction_eligible=FALSE. The 4 self-runs produced empty payloads. This core promise is contradicted by the system's own configuration.

**03. [Slot 1] §6 Tool Intelligence 0 envelopes**

> §6 locks AUTOMATIC/GUIDED/MANUAL selection modes but verification shows 0 tool.selection envelopes across 44 governance entries and attachToolIntelligenceService() has 0 call sites. The entire Tool Intelligence axis exists only in database rows, not in runtime.

**04. [Slot 2] Incomplete Core Loop Implementation**

> The proposal's §1 Core Loop is only partially implemented. The UI accepts URLs but never invokes the construction process, and the /api/run.js route fabricates URLs instead of generating real deployable ones. This violates the promise of producing a new, separate, deployable URL for each input.

**05. [Slot 2] Quality Dimensions Omission**

> In §2, 6 out of 10 quality dimensions are silently omitted, including critical areas like syntax, duplication, accessibility, privacy, and legal compliance. This omission undermines the proposal's claim to optimize all dimensions in every run and could lead to significant quality failures.

**06. [Slot 2] Lack of Tool Intelligence Integration**

> In §6, the Tool Intelligence Service is implemented but not integrated into the system, with zero tool.selection envelopes recorded. This lack of integration means the system cannot dynamically select the best tools for each task, which is a core part of the proposal's promise.

**07. [Slot 3] Lack of Rollback**

> The proposal does not provide a clear rollback strategy in case of failures or errors during the construction process, which could lead to data loss or system instability. This is a critical concern, especially given the emphasis on automation and the potential for widespread changes.

**08. [Slot 3] Insufficient Error Handling**

> The proposal does not adequately address error handling, which could result in unexpected behavior, data corruption, or security vulnerabilities. For example, the /api/run.js stub fabricates a fake URL, which may not be suitable for production environments.

**09. [Slot 3] Overreliance on AI Tools**

> The proposal relies heavily on AI tools, such as Claude Code and v0.dev, which may introduce risks related to bias, accuracy, and security. There is a need for more robust testing and validation to ensure the reliability of these tools.

**10. [Slot 4] Incomplete Quality Dimensions**

> The proposal acknowledges that 6 out of 10 quality dimensions are silently omitted. This is a critical failure as it directly contradicts the promise of substantial transformation per run. The omission of dimensions such as syntax, duplication, accessibility, privacy, and legal compliance significantly undermines the platform's integrity and user trust.

**11. [Slot 4] Lack of Jurisdiction Awareness**

> The proposal does not have a jurisdiction column in the product registry, which is essential for evaluating privacy and legal compliance dimensions. This omission means that the platform cannot ensure compliance with varying jurisdictional requirements, leading to potential legal and ethical issues.

**12. [Slot 4] Unproven Self-Application**

> The proposal mentions that FlowAI applies to its own development process, but there is no evidence of successful self-application cycles. The 4 empty self-runs and the construction_eligible=false status on FlowAI itself raise doubts about the platform's ability to improve itself, which is a core promise of the Symbiotic Meta-Principle.

**13. [Slot 6] Overclaims and Mock Data**

> §1 claims "ALWAYS a new, separate, deployable URL" but the verification shows /api/run.js fabricates fake URLs. This violates the core promise and undermines trust in the system's output. The proposal doesn't address how to prevent this mock data from reaching users in production.

**14. [Slot 6] Silent Omission of Quality Dimensions**

> §2 states that all quality dimensions are optimized in every run, but the verification shows 6 of 10 dimensions are silently omitted. This contradicts the core definition and creates a false sense of completeness. The proposal doesn't provide a clear plan for addressing these omissions in the near term.

**15. [Slot 6] Tool Intelligence Wiring Missing**

> §6 describes Tool Intelligence, but the verification shows attachToolIntelligenceService() has 0 call sites and there are 0 tool.selection envelopes. This indicates a significant gap in the implementation of this feature. The proposal doesn't adequately address the lack of wiring for Tool Intelligence.

**16. [Slot 6] Self-Application Incomplete**

> §5 emphasizes FlowAI's self-application, but the verification shows construction_eligible=false on flowai and 4 empty self-runs. This suggests that the self-improvement loop is not functioning as intended. The proposal doesn't provide a clear path to enabling and verifying FlowAI's self-improvement capabilities.

**17. [Slot 6] Unclear MVP Scope**

> The K2 question defines the MVP scope, but it drops jurisdiction/accessibility/privacy/legal from MVP, marking them as KNOWN-GAP. This contradicts §2's claim that all quality dimensions are optimized in every run. The proposal doesn't reconcile this discrepancy between the MVP scope and the stated quality guarantees.

**18. [Slot 7] §1 Core Loop fabrication**

> /api/run.js fabricates URLs without invoking construction engine, violating §1's 'ALWAYS deployable URL' guarantee. 18 orchestration_complete entries with prUrl=null indicate mock data persists in production.

**19. [Slot 7] §2 Silent dimension omission**

> 6/10 quality dimensions (syntax/accessibility/privacy/legal/3 OWASP pillars) are silently skipped with no findings surfaced. Product registry lacks jurisdiction column, making §9-§10 compliance impossible to assess.

**20. [Slot 7] §5 Self-application failure**

> product_registry marks flowai as construction_eligible=false despite §5 mandate. 4 empty self-run payloads violate 'FlowAI applies to FlowAI' symbiotic principle, creating a self-referential deadlock.

**21. [Slot 8] Core loop still stubbed**

> Section §1 claims an input URL should always yield a new deployable URL, but the verified evidence says the UI submit path only navigates to /auto-runner and /api/run.js fabricates a fake Vercel URL. That means the proposal is currently documenting a promise the system does not fulfill, and the mismatch is not a minor gap but the central product contract.

**22. [Slot 8] Quality coverage is not implemented**

> Section §2 says all ten dimensions are optimized every run, yet the brief verifies 6 of 10 dimensions are silently omitted and there is no jurisdiction column on product_registry. Without emitted dimensions_contributing[] or scoring for privacy/legal/accessibility/syntax/duplication, the system cannot honestly claim compliance or composite scoring fidelity.

**23. [Slot 8] Self-application lacks evidence**

> Section §5 says FlowAI improves itself via self-runs, but the live state shows product_registry.flowai.construction_eligible=false and four self-runs with empty payloads. That makes the symbiotic principle more aspirational than operational, because the mechanism that should generate self-improvement appears disabled for the very product it is supposed to govern.

**24. [Slot 8] Tool intelligence is data-only**

> Section §6 locks AUTOMATIC/GUIDED/MANUAL and describes top-5 research-driven selection, but the evidence shows 40 ranking rows with zero tool.selection envelopes and attachToolIntelligenceService() has zero call sites. In practice the runtime is not selecting anything, so the section risks becoming a static taxonomy with no effect on dispatch behavior.

**25. [Slot 9] §1 Core Loop Unimplemented**

> The UI submit does not invoke construction; /api/run.js fabricates fake URLs, violating §1 'ALWAYS a new deployable URL'.

**26. [Slot 9] §2 Quality Dimensions Omitted**

> 6 of 10 dimensions are silently omitted; no jurisdiction column on product_registry, and no dimensions_contributing[] on orchestration_complete envelope.

**27. [Slot 9] §5 Self-Application Disabled**

> construction_eligible=false on flowai; 4 empty self-runs; FlowAI is not applying its quality discipline to itself.

**28. [Slot 10] §2 silent omission violation**

> §2 explicitly requires 'No silent omission' and dimensions_contributing[] disclosure, yet verified state shows 6 of 10 dimensions omitted with no jurisdiction column on product_registry and no finding categories for syntax/duplication/accessibility/privacy/legal.

**29. [Slot 10] §1 fake URL fabrication**

> /api/run.js:33-35 fabricates fake URL (https://<appname>-<timestamp>.vercel.app) directly violating §1 'ALWAYS a new, separate, deployable URL' and the honest-assessment obligation; UI submit never calls runConstruction per LandingPage.jsx:442-491.

**30. [Slot 10] §5 self-application contradiction**

> §5 claims FlowAI applies to its own source tree and self-renewal cycles, yet product_registry.flowai.construction_eligible=FALSE and only 4 empty-payload self-runs exist with 0 construction_complete envelopes.


## Per-reviewer
### Slot 1 — openrouter:anthropic/claude-opus-4 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — §4 global-uniform-95 unachievable**
  > §4 mandates uniform ≥95 quality globally with NO sub-95 exception path, but §2 dimensions 9-10 require jurisdiction-specific compliance. A product cannot simultaneously achieve ≥95 on EU GDPR, US CCPA, China PIPL, and India DPDP without massive overhead that makes the platform economically unviable.
- **Obj 2 — §5 self-application construction_eligible=FALSE**
  > §5 claims FlowAI applies to its own development, but verified evidence shows product_registry.flowai.construction_eligible=FALSE. The 4 self-runs produced empty payloads. This core promise is contradicted by the system's own configuration.
- **Obj 3 — §6 Tool Intelligence 0 envelopes**
  > §6 locks AUTOMATIC/GUIDED/MANUAL selection modes but verification shows 0 tool.selection envelopes across 44 governance entries and attachToolIntelligenceService() has 0 call sites. The entire Tool Intelligence axis exists only in database rows, not in runtime.

**Steelman:**
> The proposal should be rejected because it locks in technically impossible requirements (§4 uniform global ≥95 across conflicting jurisdictions) while the actual implementation is at 15-25% complete with core promises like self-application demonstrably false (construction_eligible=FALSE). Ratifying aspirational fiction as canonical law while the codebase contradicts it creates a permanent integrity gap that will haunt every future Panel review.

**Votes:**

- **K1A** = `K1A-15-25PCT` — 15-25% complete. Only §3 fully passes; §1 and §2 are at the core of the promise and both are <30% done; the 0-PR / 0-tool.selection / 0-construction-complete envelope data shows the operational layer 
  > The 0 PRs across 18 runs and fabricated URLs in /api/run.js show the core §1 promise is mock data, not implementation.
- **K1B** = `K1B-S1-CORE-LOOP` — §1 Core Loop — UI→Construction wiring is the binding promise; current UI submit triggers audit only (LandingPage.jsx:442-491 navigate("/auto-runner") which runs client-side 8-step LLM pipeline; never 
  > Without §1 working, FlowAI is just documentation; the URL-in/URL-out promise is the irreducible core.
- **K2** = `K2-250-PLUS-HRS` — 250+ hours total. Even MVP is a multi-month effort once production-grade is taken seriously — auth flows + Stripe + observability + Sentry + Playwright cloud + Vercel Checks integration + Supabase RLS
  > The 26 construction_attempt_aborted envelopes show the existing engine has fundamental issues that will require deep debugging beyond simple wiring.
- **K3A** = `K3A-V0-DEV` — v0.dev (Vercel) — purpose-built for React/Next.js/Tailwind/shadcn output; production-quality components; Vercel-native deploy integration; outputs match the project's shadcn stack. Best when Victor ne
  > Given 81 pages with only ~5-10 in use, v0.dev's production-quality component generation is better than surgical editing of dead code.
- **K3B** = `K3B-CLAUDE-CODE-PLUS-CODEX-CROSS` — Claude Code as primary + Codex as cross-model spot-check on 1-in-N PRs (breaks same-model convergence risk per W7 Panel verdict 3d9df57). Combined cost ≈ single tool; structural verification stronger.
  > The W7 Panel's 9/11 verdict against same-model convergence makes cross-model verification essential for backend work.
- **K3C** = `K3C-CODERABBIT-PLUS-VERCEL-CHECKS` — CodeRabbit (multi-model PR review bot, free tier; reviews every PR with Claude/GPT/Gemini reasoning) + Vercel Checks (Lighthouse + Playwright cloud + linter on every deploy) + Sentry (runtime errors p
  > Multi-model review addresses convergence risk while the triple-layer catches issues at PR, deploy, and runtime stages before Victor's limited hours.
- **K3E** = `K3E-RETIRE-ENTIRELY` — RETIRE Base44 entirely. The codebase has accumulated Base44 scaffold-leftovers (74 of 81 pages in src/pages/ are likely unused per glob output; src/api/base44Client.js is still imported). Going forwar
  > With 74 of 81 pages being scaffold-leftovers, Base44 is technical debt; v0.dev and Lovable have superseded its capabilities.
- **K4** = `K4-VEU-FIRST-FLOWAI-SECOND` — VEU FLAGSHIP FIRST over 8 weeks (per prior K3 8/10 portfolio-first verdict): W1-2 pick + scope RelTwin (or MyPregLife) via Lovable + v0.dev + Stripe; W3-4 first 10 beta users + auth + onboarding; W5-6
  > With FlowAI at 15-25% complete and 250+ hours remaining, shipping a revenue-generating VEU product provides defensibility while FlowAI matures.

### Slot 2 — openrouter:openai/gpt-4o — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Incomplete Core Loop Implementation**
  > The proposal's §1 Core Loop is only partially implemented. The UI accepts URLs but never invokes the construction process, and the /api/run.js route fabricates URLs instead of generating real deployable ones. This violates the promise of producing a new, separate, deployable URL for each input.
- **Obj 2 — Quality Dimensions Omission**
  > In §2, 6 out of 10 quality dimensions are silently omitted, including critical areas like syntax, duplication, accessibility, privacy, and legal compliance. This omission undermines the proposal's claim to optimize all dimensions in every run and could lead to significant quality failures.
- **Obj 3 — Lack of Tool Intelligence Integration**
  > In §6, the Tool Intelligence Service is implemented but not integrated into the system, with zero tool.selection envelopes recorded. This lack of integration means the system cannot dynamically select the best tools for each task, which is a core part of the proposal's promise.

**Steelman:**
> The proposal should be rejected or deferred because it fails to deliver on its core promises due to incomplete implementation of critical components like the core loop and quality dimensions. Without these, the system cannot reliably produce the substantial transformations it guarantees, risking user trust and platform integrity.

**Votes:**

- **K1A** = `K1A-15-25PCT` — 15-25% complete. Only §3 fully passes; §1 and §2 are at the core of the promise and both are <30% done; the 0-PR / 0-tool.selection / 0-construction-complete envelope data shows the operational layer 
  > The evidence shows that critical components like the core loop and quality dimensions are far from complete, indicating that the project is less than 25% complete.
- **K1B** = `K1B-S1-CORE-LOOP` — §1 Core Loop — UI→Construction wiring is the binding promise; current UI submit triggers audit only (LandingPage.jsx:442-491 navigate("/auto-runner") which runs client-side 8-step LLM pipeline; never 
  > The core loop is fundamental to the system's promise and is currently not functioning as required, making it the most critical area needing work.
- **K2** = `K2-180-250-HRS` — 180-250 hours total. Pessimistic with realistic friction: every "single PR" expands to 3-4 PRs once auth + error states + rollback + observability + cross-browser testing are real. Plus debugging the 
  > Given the incomplete state of critical components and the need for robust production hardening, a higher estimate is more realistic.
- **K3A** = `K3A-V0-DEV` — v0.dev (Vercel) — purpose-built for React/Next.js/Tailwind/shadcn output; production-quality components; Vercel-native deploy integration; outputs match the project's shadcn stack. Best when Victor ne
  > v0.dev is well-suited for the project's stack and provides production-quality components, making it the best choice for frontend code generation.
- **K3B** = `K3B-CLAUDE-CODE` — Claude Code — multi-file repo editing + bash + tests + commits; strongest at Node + Supabase + integration work; can use Supabase MCP for migrations. Risk: must enforce Victor verification on every PR
  > Claude Code's strengths in Node and Supabase make it the most suitable tool for backend code generation, despite the need for careful verification.
- **K3C** = `K3C-CODERABBIT-PLUS-VERCEL-CHECKS` — CodeRabbit (multi-model PR review bot, free tier; reviews every PR with Claude/GPT/Gemini reasoning) + Vercel Checks (Lighthouse + Playwright cloud + linter on every deploy) + Sentry (runtime errors p
  > This combination provides a comprehensive review and verification process, ensuring high signal-per-cost before Victor's manual checks.
- **K3E** = `K3E-RETIRE-ENTIRELY` — RETIRE Base44 entirely. The codebase has accumulated Base44 scaffold-leftovers (74 of 81 pages in src/pages/ are likely unused per glob output; src/api/base44Client.js is still imported). Going forwar
  > Base44 is largely unused and should be retired to streamline the codebase and focus on more current tools.
- **K4** = `K4-FLOWAI-MVP-LINEAR-8W` — FlowAI MVP LINEAR over 8 weeks: W1-2 UI→Construction wiring (v0.dev + Claude Code) + Victor verifies in browser; W3-4 pre-run honest gate + Tool Intelligence wiring; W5-6 E2E Playwright + flowai-on-fl
  > A linear approach focuses on completing the MVP efficiently, ensuring that each component is fully functional before moving to the next.

### Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Lack of Rollback**
  > The proposal does not provide a clear rollback strategy in case of failures or errors during the construction process, which could lead to data loss or system instability. This is a critical concern, especially given the emphasis on automation and the potential for widespread changes.
- **Obj 2 — Insufficient Error Handling**
  > The proposal does not adequately address error handling, which could result in unexpected behavior, data corruption, or security vulnerabilities. For example, the /api/run.js stub fabricates a fake URL, which may not be suitable for production environments.
- **Obj 3 — Overreliance on AI Tools**
  > The proposal relies heavily on AI tools, such as Claude Code and v0.dev, which may introduce risks related to bias, accuracy, and security. There is a need for more robust testing and validation to ensure the reliability of these tools.

**Steelman:**
> The proposal's lack of a clear rollback strategy, insufficient error handling, and overreliance on AI tools raise significant concerns about the potential risks and unintended consequences of implementing this system. Given the complexity of the system and the potential impact on users, it may be prudent to reject or defer the proposal until these concerns are adequately addressed.

**Votes:**

- **K1A** = `K1A-15-25PCT` — 15-25% complete. Only §3 fully passes; §1 and §2 are at the core of the promise and both are <30% done; the 0-PR / 0-tool.selection / 0-construction-complete envelope data shows the operational layer 
  > The proposal's progress is limited, and the core components are not yet fully implemented.
- **K1B** = `K1B-S1-CORE-LOOP` — §1 Core Loop — UI→Construction wiring is the binding promise; current UI submit triggers audit only (LandingPage.jsx:442-491 navigate("/auto-runner") which runs client-side 8-step LLM pipeline; never 
  > The Core Loop is a critical component, and its implementation is essential to the overall system.
- **K2** = `K2-120-180-HRS` — 120-180 hours total. Realistic mid-range: UI wiring ~40h, backend integration ~30h, pre-run honest gate ~15h, Tool Intelligence wiring ~20h, E2E test ~20h, auth+observability ~20h, self-application de
  > The estimated time required to complete the implementation is significant, and the proposal's complexity warrants a more detailed breakdown of the tasks and timelines.
- **K3A** = `K3A-V0-DEV` — v0.dev (Vercel) — purpose-built for React/Next.js/Tailwind/shadcn output; production-quality components; Vercel-native deploy integration; outputs match the project's shadcn stack. Best when Victor ne
  > v0.dev is a suitable choice for frontend code generation, given its integration with Vercel and the project's tech stack.
- **K3B** = `K3B-CLAUDE-CODE-PLUS-CODEX-CROSS` — Claude Code as primary + Codex as cross-model spot-check on 1-in-N PRs (breaks same-model convergence risk per W7 Panel verdict 3d9df57). Combined cost ≈ single tool; structural verification stronger.
  > Using Claude Code as the primary backend code generator, with Codex as a cross-model spot-check, provides a robust verification process and mitigates the risk of same-model convergence.
- **K3C** = `K3C-CODERABBIT-PLUS-VERCEL-CHECKS` — CodeRabbit (multi-model PR review bot, free tier; reviews every PR with Claude/GPT/Gemini reasoning) + Vercel Checks (Lighthouse + Playwright cloud + linter on every deploy) + Sentry (runtime errors p
  > The combination of CodeRabbit, Vercel Checks, and Sentry provides a comprehensive and cost-effective approach to code review and deployment verification.
- **K3E** = `K3E-RETIRE-ENTIRELY` — RETIRE Base44 entirely. The codebase has accumulated Base44 scaffold-leftovers (74 of 81 pages in src/pages/ are likely unused per glob output; src/api/base44Client.js is still imported). Going forwar
  > Retiring Base44 and replacing it with more modern tools like v0.dev and Claude Code will help simplify the codebase and reduce technical debt.
- **K4** = `K4-FLOWAI-MVP-LINEAR-8W` — FlowAI MVP LINEAR over 8 weeks: W1-2 UI→Construction wiring (v0.dev + Claude Code) + Victor verifies in browser; W3-4 pre-run honest gate + Tool Intelligence wiring; W5-6 E2E Playwright + flowai-on-fl
  > A linear approach to implementing the FlowAI MVP, with a focus on delivering a working URL-in/URL-out system via the UI, is a more manageable and realistic goal for the given timeframe.

### Slot 4 — openrouter:mistralai/mistral-large-2411 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Incomplete Quality Dimensions**
  > The proposal acknowledges that 6 out of 10 quality dimensions are silently omitted. This is a critical failure as it directly contradicts the promise of substantial transformation per run. The omission of dimensions such as syntax, duplication, accessibility, privacy, and legal compliance significantly undermines the platform's integrity and user trust.
- **Obj 2 — Lack of Jurisdiction Awareness**
  > The proposal does not have a jurisdiction column in the product registry, which is essential for evaluating privacy and legal compliance dimensions. This omission means that the platform cannot ensure compliance with varying jurisdictional requirements, leading to potential legal and ethical issues.
- **Obj 3 — Unproven Self-Application**
  > The proposal mentions that FlowAI applies to its own development process, but there is no evidence of successful self-application cycles. The 4 empty self-runs and the construction_eligible=false status on FlowAI itself raise doubts about the platform's ability to improve itself, which is a core promise of the Symbiotic Meta-Principle.

**Steelman:**
> The proposal should be rejected or deferred until it can demonstrate a complete implementation of all quality dimensions and provide evidence of successful self-application cycles. The current state of the proposal poses significant risks to users and the platform's integrity.

**Votes:**

- **K1A** = `K1A-15-25PCT` — 15-25% complete. Only §3 fully passes; §1 and §2 are at the core of the promise and both are <30% done; the 0-PR / 0-tool.selection / 0-construction-complete envelope data shows the operational layer 
  > The proposal's core promise is far from being implemented, with critical sections such as §1 and §2 being less than 30% complete.
- **K1B** = `K1B-S2-QUALITY-DIMENSIONS` — §2 Quality Dimensions — 6 of 10 silently omitted; no jurisdiction column; need to add finding categories for syntax/duplication/accessibility/privacy/legal + wire CA-17 S4 9-pillar suite into Phase B 
  > The omission of 6 out of 10 quality dimensions is a critical gap that requires significant work to address.
- **K2** = `K2-250-PLUS-HRS` — 250+ hours total. Even MVP is a multi-month effort once production-grade is taken seriously — auth flows + Stripe + observability + Sentry + Playwright cloud + Vercel Checks integration + Supabase RLS
  > The proposal's MVP scope is extensive and requires significant effort to ensure production-grade quality.
- **K3A** = `K3A-V0-DEV` — v0.dev (Vercel) — purpose-built for React/Next.js/Tailwind/shadcn output; production-quality components; Vercel-native deploy integration; outputs match the project's shadcn stack. Best when Victor ne
  > v0.dev is the best tool for generating new frontend components that match the project's stack and ensure production-quality output.
- **K3B** = `K3B-CURSOR-COMPOSER` — Cursor Composer — multi-file IDE edits with semantic search across repo; faster for surgical backend work; Victor stays in IDE. Verification: in-editor diff + test run + manual deploy check.
  > Cursor Composer is the best tool for surgical backend work, allowing Victor to stay within the IDE and ensure efficient verification.
- **K3C** = `K3C-CODERABBIT-PLUS-VERCEL-CHECKS` — CodeRabbit (multi-model PR review bot, free tier; reviews every PR with Claude/GPT/Gemini reasoning) + Vercel Checks (Lighthouse + Playwright cloud + linter on every deploy) + Sentry (runtime errors p
  > This combination provides a comprehensive verification process with a high signal-per-cost ratio, ensuring that issues are caught at multiple stages before reaching Victor.
- **K3E** = `K3E-RETIRE-ENTIRELY` — RETIRE Base44 entirely. The codebase has accumulated Base44 scaffold-leftovers (74 of 81 pages in src/pages/ are likely unused per glob output; src/api/base44Client.js is still imported). Going forwar
  > Retiring Base44 entirely will help clean up the codebase and ensure that only relevant and up-to-date tools are used for ongoing development.
- **K4** = `K4-VEU-FIRST-FLOWAI-SECOND` — VEU FLAGSHIP FIRST over 8 weeks (per prior K3 8/10 portfolio-first verdict): W1-2 pick + scope RelTwin (or MyPregLife) via Lovable + v0.dev + Stripe; W3-4 first 10 beta users + auth + onboarding; W5-6
  > Focusing on shipping a VEU flagship product first will provide a defensible and paying product, demonstrating the platform's value before investing further in FlowAI MVP.

### Slot 5 — openrouter:amazon/nova-pro-v1 — `SILENT`

_(degraded)_


### Slot 6 — openrouter:google/gemini-2.0-flash-001 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Overclaims and Mock Data**
  > §1 claims "ALWAYS a new, separate, deployable URL" but the verification shows /api/run.js fabricates fake URLs. This violates the core promise and undermines trust in the system's output. The proposal doesn't address how to prevent this mock data from reaching users in production.
- **Obj 2 — Silent Omission of Quality Dimensions**
  > §2 states that all quality dimensions are optimized in every run, but the verification shows 6 of 10 dimensions are silently omitted. This contradicts the core definition and creates a false sense of completeness. The proposal doesn't provide a clear plan for addressing these omissions in the near term.
- **Obj 3 — Tool Intelligence Wiring Missing**
  > §6 describes Tool Intelligence, but the verification shows attachToolIntelligenceService() has 0 call sites and there are 0 tool.selection envelopes. This indicates a significant gap in the implementation of this feature. The proposal doesn't adequately address the lack of wiring for Tool Intelligence.
- **Obj 4 — Self-Application Incomplete**
  > §5 emphasizes FlowAI's self-application, but the verification shows construction_eligible=false on flowai and 4 empty self-runs. This suggests that the self-improvement loop is not functioning as intended. The proposal doesn't provide a clear path to enabling and verifying FlowAI's self-improvement capabilities.
- **Obj 5 — Unclear MVP Scope**
  > The K2 question defines the MVP scope, but it drops jurisdiction/accessibility/privacy/legal from MVP, marking them as KNOWN-GAP. This contradicts §2's claim that all quality dimensions are optimized in every run. The proposal doesn't reconcile this discrepancy between the MVP scope and the stated quality guarantees.

**Steelman:**
> This proposal should be rejected because it overclaims the current state of the system and lacks a concrete plan to address critical gaps in the implementation. The core promise of a deployable URL and comprehensive quality optimization is not being met, and continuing development without addressing these issues risks further eroding user trust and creating a misleading product.

**Votes:**

- **K1A** = `K1A-15-25PCT` — 15-25% complete. Only §3 fully passes; §1 and §2 are at the core of the promise and both are <30% done; the 0-PR / 0-tool.selection / 0-construction-complete envelope data shows the operational layer 
  > Given the significant gaps in the core loop and quality dimensions, the system is far from complete. The lack of operational data further supports this assessment.
- **K1B** = `K1B-S1-CORE-LOOP` — §1 Core Loop — UI→Construction wiring is the binding promise; current UI submit triggers audit only (LandingPage.jsx:442-491 navigate("/auto-runner") which runs client-side 8-step LLM pipeline; never 
  > The core loop is the foundation of the system, and its incomplete state represents the biggest obstacle to achieving the stated goals.
- **K2** = `K2-120-180-HRS` — 120-180 hours total. Realistic mid-range: UI wiring ~40h, backend integration ~30h, pre-run honest gate ~15h, Tool Intelligence wiring ~20h, E2E test ~20h, auth+observability ~20h, self-application de
  > This estimate accounts for the inevitable friction and debugging required to bring the system to a production-ready state, even with AI assistance.
- **K3A** = `K3A-V0-DEV` — v0.dev (Vercel) — purpose-built for React/Next.js/Tailwind/shadcn output; production-quality components; Vercel-native deploy integration; outputs match the project's shadcn stack. Best when Victor ne
  > v0.dev aligns with the existing tech stack and provides production-quality components, making it a good choice for frontend development.
- **K3B** = `K3B-CLAUDE-CODE-PLUS-CODEX-CROSS` — Claude Code as primary + Codex as cross-model spot-check on 1-in-N PRs (breaks same-model convergence risk per W7 Panel verdict 3d9df57). Combined cost ≈ single tool; structural verification stronger.
  > Using two different models for code generation and review can help mitigate the risk of same-model convergence and improve the overall quality of the code.
- **K3C** = `K3C-CODERABBIT-PLUS-VERCEL-CHECKS` — CodeRabbit (multi-model PR review bot, free tier; reviews every PR with Claude/GPT/Gemini reasoning) + Vercel Checks (Lighthouse + Playwright cloud + linter on every deploy) + Sentry (runtime errors p
  > This combination provides a comprehensive and cost-effective approach to code review and deployment verification, with multiple layers of protection against errors.
- **K3E** = `K3E-RETIRE-ENTIRELY` — RETIRE Base44 entirely. The codebase has accumulated Base44 scaffold-leftovers (74 of 81 pages in src/pages/ are likely unused per glob output; src/api/base44Client.js is still imported). Going forwar
  > Retiring Base44 will help clean up the codebase and reduce technical debt, allowing for a more focused development effort.
- **K4** = `K4-VEU-FIRST-FLOWAI-SECOND` — VEU FLAGSHIP FIRST over 8 weeks (per prior K3 8/10 portfolio-first verdict): W1-2 pick + scope RelTwin (or MyPregLife) via Lovable + v0.dev + Stripe; W3-4 first 10 beta users + auth + onboarding; W5-6
  > Focusing on a VEU flagship first will provide a more tangible and defensible outcome, generating revenue and demonstrating the value of the platform.

### Slot 7 — openrouter:deepseek/deepseek-r1 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — §1 Core Loop fabrication**
  > /api/run.js fabricates URLs without invoking construction engine, violating §1's 'ALWAYS deployable URL' guarantee. 18 orchestration_complete entries with prUrl=null indicate mock data persists in production.
- **Obj 2 — §2 Silent dimension omission**
  > 6/10 quality dimensions (syntax/accessibility/privacy/legal/3 OWASP pillars) are silently skipped with no findings surfaced. Product registry lacks jurisdiction column, making §9-§10 compliance impossible to assess.
- **Obj 3 — §5 Self-application failure**
  > product_registry marks flowai as construction_eligible=false despite §5 mandate. 4 empty self-run payloads violate 'FlowAI applies to FlowAI' symbiotic principle, creating a self-referential deadlock.

**Steelman:**
> The proposal's §1/§2/§5 implementation gaps represent existential risks to FlowAI's value proposition. Shipping before resolving core fabrication issues and dimension omissions would institutionalize dishonesty at the platform's heart, making future trust recovery harder than starting from scratch.

**Votes:**

- **K1A** = `K1A-15-25PCT` — 15-25% complete. Only §3 fully passes; §1 and §2 are at the core of the promise and both are <30% done; the 0-PR / 0-tool.selection / 0-construction-complete envelope data shows the operational layer 
  > Core value propositions (§1 URL generation, §2 quality checks) remain unimplemented or broken despite infrastructure existing.
- **K1B** = `K1B-S1-CORE-LOOP` — §1 Core Loop — UI→Construction wiring is the binding promise; current UI submit triggers audit only (LandingPage.jsx:442-491 navigate("/auto-runner") which runs client-side 8-step LLM pipeline; never 
  > Without functioning UI→construction wiring, all other improvements remain academic. Fabricated URLs invalidate the entire premise.
- **K2** = `K2-120-180-HRS` — 120-180 hours total. Realistic mid-range: UI wiring ~40h, backend integration ~30h, pre-run honest gate ~15h, Tool Intelligence wiring ~20h, E2E test ~20h, auth+observability ~20h, self-application de
  > Integration debt and mock-data removal require substantial manual verification despite existing components.
- **K3A** = `K3A-V0-DEV` — v0.dev (Vercel) — purpose-built for React/Next.js/Tailwind/shadcn output; production-quality components; Vercel-native deploy integration; outputs match the project's shadcn stack. Best when Victor ne
  > Aligns with existing stack and provides verifiable component output critical for UI wiring tasks.
- **K3B** = `K3B-CLAUDE-CODE-PLUS-CODEX-CROSS` — Claude Code as primary + Codex as cross-model spot-check on 1-in-N PRs (breaks same-model convergence risk per W7 Panel verdict 3d9df57). Combined cost ≈ single tool; structural verification stronger.
  > Mitigates W7 convergence risks while leveraging Claude's multi-file capabilities for backend work.
- **K3C** = `K3C-CODERABBIT-PLUS-VERCEL-CHECKS` — CodeRabbit (multi-model PR review bot, free tier; reviews every PR with Claude/GPT/Gemini reasoning) + Vercel Checks (Lighthouse + Playwright cloud + linter on every deploy) + Sentry (runtime errors p
  > Maximizes pre-human verification layers at minimal cost, addressing multiple failure modes.
- **K3E** = `K3E-RETIRE-ENTIRELY` — RETIRE Base44 entirely. The codebase has accumulated Base44 scaffold-leftovers (74 of 81 pages in src/pages/ are likely unused per glob output; src/api/base44Client.js is still imported). Going forwar
  > Unused legacy code increases maintenance burden and violates FlowAI's own DRY principle (§2.2).
- **K4** = `K4-VEU-FIRST-FLOWAI-SECOND` — VEU FLAGSHIP FIRST over 8 weeks (per prior K3 8/10 portfolio-first verdict): W1-2 pick + scope RelTwin (or MyPregLife) via Lovable + v0.dev + Stripe; W3-4 first 10 beta users + auth + onboarding; W5-6
  > Aligns with Panel's prior portfolio-first guidance and provides tangible business value while FlowAI matures.

### Slot 8 — openrouter:perplexity/sonar — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Core loop still stubbed**
  > Section §1 claims an input URL should always yield a new deployable URL, but the verified evidence says the UI submit path only navigates to /auto-runner and /api/run.js fabricates a fake Vercel URL. That means the proposal is currently documenting a promise the system does not fulfill, and the mismatch is not a minor gap but the central product contract.
- **Obj 2 — Quality coverage is not implemented**
  > Section §2 says all ten dimensions are optimized every run, yet the brief verifies 6 of 10 dimensions are silently omitted and there is no jurisdiction column on product_registry. Without emitted dimensions_contributing[] or scoring for privacy/legal/accessibility/syntax/duplication, the system cannot honestly claim compliance or composite scoring fidelity.
- **Obj 3 — Self-application lacks evidence**
  > Section §5 says FlowAI improves itself via self-runs, but the live state shows product_registry.flowai.construction_eligible=false and four self-runs with empty payloads. That makes the symbiotic principle more aspirational than operational, because the mechanism that should generate self-improvement appears disabled for the very product it is supposed to govern.
- **Obj 4 — Tool intelligence is data-only**
  > Section §6 locks AUTOMATIC/GUIDED/MANUAL and describes top-5 research-driven selection, but the evidence shows 40 ranking rows with zero tool.selection envelopes and attachToolIntelligenceService() has zero call sites. In practice the runtime is not selecting anything, so the section risks becoming a static taxonomy with no effect on dispatch behavior.

**Steelman:**
> The strongest case for rejecting or deferring this proposal is that it canonizes unresolved implementation claims as if they were already true, especially around §1, §2, and §5. Because the verified evidence still shows fabricated URLs, omitted quality dimensions, and no runtime tool-selection emission, ratifying the brief now would blur the line between specification and reality. Deferring until the construction path, scoring emissions, and self-application cycle are demonstrably live would preserve trust in the canonical reference and avoid locking in a misleading status report.

**Votes:**

- **K1A** = `K1A-15-25PCT` — 15-25% complete. Only §3 fully passes; §1 and §2 are at the core of the promise and both are <30% done; the 0-PR / 0-tool.selection / 0-construction-complete envelope data shows the operational layer 
  > This best matches the evidence that only the iteration model is actually live while the flagship promise remains stubbed. The presence of architecture and data rows does not offset the lack of real construction, scoring, and self-run outputs.
- **K1B** = `K1B-S1-CORE-LOOP` — §1 Core Loop — UI→Construction wiring is the binding promise; current UI submit triggers audit only (LandingPage.jsx:442-491 navigate("/auto-runner") which runs client-side 8-step LLM pipeline; never 
  > The core loop is the user-facing contract and everything else depends on it. Without real UI-to-construction wiring, the rest of the system is either advisory or decorative.
- **K2** = `K2-120-180-HRS` — 120-180 hours total. Realistic mid-range: UI wiring ~40h, backend integration ~30h, pre-run honest gate ~15h, Tool Intelligence wiring ~20h, E2E test ~20h, auth+observability ~20h, self-application de
  > This seems most plausible given the current partial infrastructure and the need to verify the end-to-end path with a human-in-the-loop. The quoted breakdown is coherent with the evidence that major wiring exists but runtime behavior is missing.
- **K3A** = `K3A-CURSOR` — Cursor — IDE-embedded; pair-programming flow; tight loop with the codebase; multi-file refactors. Best for surgical edits to existing 81-page src/pages/ tree. Verification: in-editor diff review + Vic
  > For frontend surgery inside an existing React codebase, Cursor is the best fit because it minimizes context switching and supports iterative visual verification. The task here is less about net-new design generation and more about precise wiring.
- **K3B** = `K3B-CLAUDE-CODE` — Claude Code — multi-file repo editing + bash + tests + commits; strongest at Node + Supabase + integration work; can use Supabase MCP for migrations. Risk: must enforce Victor verification on every PR
  > The backend work involves API routes, Supabase, and orchestration plumbing, which favors a tool that can edit across files and run tests. The main guardrail is strict human verification to avoid overclaiming.
- **K3C** = `K3C-CODERABBIT-PLUS-VERCEL-CHECKS` — CodeRabbit (multi-model PR review bot, free tier; reviews every PR with Claude/GPT/Gemini reasoning) + Vercel Checks (Lighthouse + Playwright cloud + linter on every deploy) + Sentry (runtime errors p
  > This combination gives the best layered signal before the human review step: code review, deployment verification, and runtime monitoring. It is stronger than single-model review and aligns with the need to catch regressions in a partly wired system.
- **K3E** = `K3E-RETIRE-ENTIRELY` — RETIRE Base44 entirely. The codebase has accumulated Base44 scaffold-leftovers (74 of 81 pages in src/pages/ are likely unused per glob output; src/api/base44Client.js is still imported). Going forwar
  > The brief suggests Base44 is mostly residual scaffolding rather than a strategic dependency. Retiring it reduces confusion and makes the codebase easier to reason about while still allowing better-fit tools for new work.
- **K4** = `K4-DEMO-EXTRACT-BACKWARDS` — DEMO-EXTRACT-BACKWARDS over 8 weeks: W1-2 build a single hardcoded reliable demo path (one pre-registered URL with known improvement potential → reliably produces a new improved URL via the constructi
  > This is the most defensible sequence because it creates one reliable end-to-end proof first, then broadens scope without hiding gaps. It balances immediate demonstration value with honest disclosure and avoids betting the entire plan on full generality from day one.

### Slot 9 — openrouter:meta-llama/llama-4-maverick — `TANGENTIAL`

**Adversarial pass:**

- **Obj 1 — §1 Core Loop Unimplemented**
  > The UI submit does not invoke construction; /api/run.js fabricates fake URLs, violating §1 'ALWAYS a new deployable URL'.
- **Obj 2 — §2 Quality Dimensions Omitted**
  > 6 of 10 dimensions are silently omitted; no jurisdiction column on product_registry, and no dimensions_contributing[] on orchestration_complete envelope.
- **Obj 3 — §5 Self-Application Disabled**
  > construction_eligible=false on flowai; 4 empty self-runs; FlowAI is not applying its quality discipline to itself.

**Steelman:**
> The strongest argument for rejecting or deferring this proposal is that the current state of the FlowAI implementation is significantly behind the production-grade conformance required by CA-18, with critical sections like §1 Core Loop, §2 Quality Dimensions, and §5 Symbiotic Principle being either PARTIAL or FAIL, indicating a high risk of failure or the need for substantial rework.

**Votes:**

- **K1A** = `K1A-15-25PCT` — 15-25% complete. Only §3 fully passes; §1 and §2 are at the core of the promise and both are <30% done; the 0-PR / 0-tool.selection / 0-construction-complete envelope data shows the operational layer 
  > Only §3 is fully done; core promises in §1 and §2 are significantly unimplemented or failed.
- **K1B** = `K1B-S1-CORE-LOOP` — §1 Core Loop — UI→Construction wiring is the binding promise; current UI submit triggers audit only (LandingPage.jsx:442-491 navigate("/auto-runner") which runs client-side 8-step LLM pipeline; never 
- **K2** = `K2-250-PLUS-HRS` — 250+ hours total. Even MVP is a multi-month effort once production-grade is taken seriously — auth flows + Stripe + observability + Sentry + Playwright cloud + Vercel Checks integration + Supabase RLS
  > Production hardening, auth, rate-limiting, and other hidden costs will likely expand the scope significantly.
- **K3A** = `K3A-V0-DEV` — v0.dev (Vercel) — purpose-built for React/Next.js/Tailwind/shadcn output; production-quality components; Vercel-native deploy integration; outputs match the project's shadcn stack. Best when Victor ne
  > Best for net-new component output matching the project's shadcn stack.
- **K3B** = `K3B-CLAUDE-CODE-PLUS-CODEX-CROSS` — Claude Code as primary + Codex as cross-model spot-check on 1-in-N PRs (breaks same-model convergence risk per W7 Panel verdict 3d9df57). Combined cost ≈ single tool; structural verification stronger.
  > Combines multi-file editing strength with cross-model verification to mitigate convergence risk.
- **K3C** = `UNMATCHED` — CodeRabbit + Vercel Checks + Sentry
  > Triple-layer verification provides high signal-per-cost with PR review, deploy gate, and runtime monitoring.
- **K3E** = `K3E-RETIRE-ENTIRELY` — RETIRE Base44 entirely. The codebase has accumulated Base44 scaffold-leftovers (74 of 81 pages in src/pages/ are likely unused per glob output; src/api/base44Client.js is still imported). Going forwar
  > The codebase has significant Base44 scaffold-leftovers; retiring it reduces technical debt.
- **K4** = `K4-DEMO-EXTRACT-BACKWARDS` — DEMO-EXTRACT-BACKWARDS over 8 weeks: W1-2 build a single hardcoded reliable demo path (one pre-registered URL with known improvement potential → reliably produces a new improved URL via the constructi
  > Building a reliable demo path first and generalizing backwards provides a defensible milestone with honest disclosure.

### Slot 10 — openrouter:x-ai/grok-4.3 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — §2 silent omission violation**
  > §2 explicitly requires 'No silent omission' and dimensions_contributing[] disclosure, yet verified state shows 6 of 10 dimensions omitted with no jurisdiction column on product_registry and no finding categories for syntax/duplication/accessibility/privacy/legal.
- **Obj 2 — §1 fake URL fabrication**
  > /api/run.js:33-35 fabricates fake URL (https://<appname>-<timestamp>.vercel.app) directly violating §1 'ALWAYS a new, separate, deployable URL' and the honest-assessment obligation; UI submit never calls runConstruction per LandingPage.jsx:442-491.
- **Obj 3 — §5 self-application contradiction**
  > §5 claims FlowAI applies to its own source tree and self-renewal cycles, yet product_registry.flowai.construction_eligible=FALSE and only 4 empty-payload self-runs exist with 0 construction_complete envelopes.

**Steelman:**
> The verified core failures in §1 (no real deployable URL path) and §2 (silent omissions) plus explicit mock-data fabrication show the proposal cannot deliver its own binding promises without first fixing foundational wiring; deferral until those are proven avoids committing Victor's limited hours to a system whose canonical guarantees are already contradicted by its own runtime.

**Votes:**

- **K1A** = `K1A-15-25PCT` — 15-25% complete. Only §3 fully passes; §1 and §2 are at the core of the promise and both are <30% done; the 0-PR / 0-tool.selection / 0-construction-complete envelope data shows the operational layer 
  > Matches the verified evidence of core promise failures.
- **K1B** = `K1B-S1-CORE-LOOP` — §1 Core Loop — UI→Construction wiring is the binding promise; current UI submit triggers audit only (LandingPage.jsx:442-491 navigate("/auto-runner") which runs client-side 8-step LLM pipeline; never 
  > §1 is the explicit URL-in/URL-out contract that remains unfulfilled.
- **K2** = `K2-120-180-HRS` — 120-180 hours total. Realistic mid-range: UI wiring ~40h, backend integration ~30h, pre-run honest gate ~15h, Tool Intelligence wiring ~20h, E2E test ~20h, auth+observability ~20h, self-application de
  > Balances wiring scope with realistic hardening overhead.
- **K3A** = `K3A-V0-DEV` — v0.dev (Vercel) — purpose-built for React/Next.js/Tailwind/shadcn output; production-quality components; Vercel-native deploy integration; outputs match the project's shadcn stack. Best when Victor ne
  > Matches existing stack and verification needs.
- **K3B** = `K3B-CLAUDE-CODE-PLUS-CODEX-CROSS` — Claude Code as primary + Codex as cross-model spot-check on 1-in-N PRs (breaks same-model convergence risk per W7 Panel verdict 3d9df57). Combined cost ≈ single tool; structural verification stronger.
  > Mitigates convergence risk identified in prior verdicts.
- **K3C** = `K3C-CODERABBIT-PLUS-VERCEL-CHECKS` — CodeRabbit (multi-model PR review bot, free tier; reviews every PR with Claude/GPT/Gemini reasoning) + Vercel Checks (Lighthouse + Playwright cloud + linter on every deploy) + Sentry (runtime errors p
  > Highest signal before human review at low cost.
- **K3E** = `K3E-RETIRE-ENTIRELY` — RETIRE Base44 entirely. The codebase has accumulated Base44 scaffold-leftovers (74 of 81 pages in src/pages/ are likely unused per glob output; src/api/base44Client.js is still imported). Going forwar
  > Removes documented legacy debt.
- **K4** = `K4-DEMO-EXTRACT-BACKWARDS` — DEMO-EXTRACT-BACKWARDS over 8 weeks: W1-2 build a single hardcoded reliable demo path (one pre-registered URL with known improvement potential → reliably produces a new improved URL via the constructi
  > Prioritizes verifiable honesty over broad claims.