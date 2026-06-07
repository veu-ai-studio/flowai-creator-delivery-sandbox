# FlowAI Canonical Reference - SSOT v2.3 RATIFIED

Version: **v2.3 RATIFIED** | Date: 2026-05-26 | Status: **CANONICAL - ratified by CEO Victor Udo, FNSE, PhD 2026-05-26** | HEAD: `36e9897`
Supersedes: `docs/SSOT_W04_REV2_DRAFT.md`
Rev-2 → Rev-2.1 changeset (4 W6-Panel-cited minor amendments):
- (a) §17: footnote disambiguating UX-C sidebar labels from canonical axis labels in §8/§8a
- (b) §25 Locked Rule 4: canonical Orchestra Selection axis label clarification; Auto/Guided/Manual retained as historical aliases at the UX-C sidebar surface only
- (c) §20: reconciliation with §15 — embedded code-level Self-Protection vs Agent #13 orchestrating Self-Protection (different layers)
- (d) §3 productScope metadata table: VEU product name examples replaced with generic placeholders (`tenantA` / `tenantB`); §22 Product-Agnostic Rule footnote added

Lineage: Rev-1 (`d68a1df`) → Rev-2 (Panel-reviewed) → Rev-2.1 (this document; applies 4 minor amendments from W6 review of Rev-2).
Anchor canonical inputs: `docs/FLOWAI_SSOT.md` (canonical 2026-05-11 + CA-1/CA-2/CA-3 ratified), `docs/CANONICAL_REFERENCE.md` (sprint history), `docs/SSOT_PARKING_LOT.md` (ENTRY 001–006)

---

## 1. IDENTITY

FlowAI is a **proprietary AI Operating System** built by VEU AI Studio. Not a SaaS product — an OS-layer infrastructure platform that:

- Powers VEU's 5 flagship products internally (SAIGE, RelTwin, ReachSMS, PressAI, MyPregLife).
- Is licensed commercially to external providers, individuals, and small businesses.
- Enables users to create native apps, mobile apps, SaaS platforms, and Agentic AI systems.
- Installs its own capabilities into other products as transferable packages (see §6 Capability Transfer).

**Tagline:** The AI Operating System that builds, tests, renews, and scales any digital product.

### 1.1 Product market definitions (canonical, 5 VEU products)

These are the canonical market definitions per CEO instruction 2026-05-18 (W2 dispatch #24). They govern how FlowAI tests, audits, scores GTM readiness, and monitors each product. **A narrow interpretation of any market here will produce wrong scoring criteria.** A product is GTM-ready when it serves its **full defined market**, not a subset of it. The mirroring `market_definition` column in `public.product_registry` is seeded by migration `0015_product_market_definitions.sql`.

| Product | Market definition (canonical) |
|---|---|
| **SAIGE** | **EHS** (Environmental Health & Safety), **ESG** (Environmental Social Governance), **CSR** (Corporate Social Responsibility), **Sustainability**, and **SDGs** (Sustainable Development Goals) practitioners and organizations **globally**. NOT limited to ESG teams only. |
| **RelTwin** | Any person or organization that manages personal and professional relationships — individuals, executives, community leaders, sales professionals, diplomats, anyone for whom relationship intelligence drives outcomes. **Globally.** NOT limited to relationship managers only. |
| **ReachSMS** | Anyone building online communities and exchanging values anytime, anywhere **globally** — community organizers, faith organizations, nonprofits, political movements, businesses, diaspora groups. NOT limited to community leaders only. |
| **PressAI** | Writers, publishers, and online content creators of all kinds — bloggers, journalists, authors, academics, social media creators, content marketers. **Globally.** NOT limited to publishers only. |
| **MyPregLife** | Any person and/or family navigating pregnancy — expectant mothers, fathers, families, healthcare providers, doulas, midwives. **Globally**, with no geographic restriction (per CA-18 ENTRY 018 — the prior "Africa-first as launch market" caveat is removed; any launch sequencing is an operational / go-to-market decision, NOT canonical scope narrowing). NOT limited to pregnant women in any region. |

These definitions are **PERMANENT** and must not be overwritten by any future dispatch without explicit CEO instruction. They drive the §7.6 GTM Readiness Report scoring criteria + audit scope for each product.

---

## 2. MISSION — DEMOCRATIZATION

**FlowAI is a GLOBAL platform** (canonical per CA-18 ENTRY 018 — CEO-ratification track, Locked Rule 13). FlowAI democratizes AI-powered product creation for individuals and small organizations **worldwide** who lack access to world-class software-building capability. **Underserved is a global condition, not a geography** — it occurs in every jurisdiction on the planet, manifesting as resource scarcity, technical-expertise scarcity, market-access scarcity, or any combination thereof.

**Democratization mission (canonical per CA-18):** enabling individuals and small organizations worldwide to build world-class software without deep technical expertise, regardless of location or resource level. The dignity-and-belonging guarantee is uniform: **the same standard, everywhere, for everyone**.

Underservedness manifests across (non-exhaustive; representative, not geographically scoped):

- Individuals and small businesses priced out of enterprise AI tools.
- Operators without engineering backgrounds attempting to ship production-grade product.
- Resource-constrained organizations regardless of where they operate.
- Neglected language and cultural communities anywhere in the world.

(The prior CA-1 + CA-2 geographic bullet listing "Sub-Saharan Africa, parts of Latin America, parts of South/Southeast Asia" is REMOVED per CA-18 ENTRY 018 — underservedness is canonically reframed as a global condition rather than a region-listed scope. Historical CA-1 + CA-2 rows remain in §18.4 ENTRY 001 unchanged for audit trail.)

**Target users:** individuals and small business owners with no engineering background; solution providers building personalized apps for niche communities; organizations in underserved segments globally; VEU AI Studio (Year 1 primary internal user).

**What FlowAI enables:** create web / native_app / mobile_app / SaaS / agentic_ai / generic_url products (canonical target classes per CA-18 §4); audit, benchmark, improve any digital product; deploy working products with real URLs — no code required.

**Universal product portability requirement:** SAIGE and the other VEU products are reference products and proof fixtures only. Any capability proven on SAIGE must be implemented through product-agnostic contracts, ProductSSOT state, target-class adapters, and deployment/distribution adapters so the same FlowAI loop can serve thousands of digital products across websites, SaaS products, mobile apps, native apps, and agentic AI systems. A SAIGE-specific implementation is not complete unless the reusable contract it exercises is also valid for non-SAIGE products.

**Distribution target requirement:** FlowAI output is always a canonical per-target-class delivery artifact at Step 5, and the deployment/distribution layer must preserve target-class differences instead of flattening them. Web and SaaS products deploy to hosted URLs; mobile and native apps require package/build metadata plus app-store or installer distribution adapters; agentic AI products require runtime, tool, permission, and monitoring adapters. These adapters are platform-specific at the edge, but the core FlowAI orchestration, scoring, evidence, ProductSSOT, and governance logic remain product-agnostic.

See `docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md` (CA-18 binding mission/purpose statement per ENTRY 018) for the full §1–§5 canonical mission, including the Core Definition, 10-dimension Quality coverage, three-mode Iteration Model, Global Platform Scope, and Symbiotic Meta-Principle.

---

## 3. COMMERCIAL MODEL + METADATA-DRIVEN ARCHITECTURE

**Pricing surface:** licensed OS platform with per-seat, per-product, per-time, and combination packages. Providers are authenticated FlowAI users; end-customers are sub-orgs they manage. Revenue tracked per provider via Stripe Connect (Agent #4 Provider Onboarding; PARTIAL today — executor exists, Stripe Connect deployment pending). Platform-fee ceiling is 15%; providers retain ≥85% of end-customer revenue; sustainability floor defined per contract.

**Tension with the Product-Agnostic Rule (§14):** Panel Q5 flagged that per-product pricing + per-product revenue splits could appear to require product-specific code, violating §14. Rev-1 left this unresolved. Rev-2 resolves it via a **metadata-driven architecture pattern**:

| Layer | Product-specific? | Where it lives | Example |
|---|---|---|---|
| Core engine + 26 agents | **NEVER** — zero product names in code, tests, configs, env vars, URL patterns | `src/lib/agents/`, `src/lib/runner/`, agent registry | `Agent3SelfRenewal` analyzes ANY run; product is `ctx.productScope` parameter |
| Commercial / metering layer | Metadata-keyed by `productId`, not code-keyed | Supabase `flowai_provider_billing`, `flowai_product_pricing`, `flowai_revenue_splits` | Per-product rate = `pricing.lookup(productId, planTier)` |
| Per-product configuration | Metadata, never code | `flowai_product_config` rows + Doppler vault paths `flowai/<env>/PRODUCTS_<productId>_*` | Custom domain for a tenant lives in a config row, not a hardcoded constant |
| Agent invocation scope | Parameter, not embedded | `productScope: 'flowai' \| 'tenantA' \| 'tenantB' \| ...` (illustrative; expands at runtime) [1] | `BaseAgent` accepts `productScope` as a runtime dep |

[1] **productScope values are runtime metadata-driven, never hardcoded** per §22 Product-Agnostic Rule. The illustrative `tenantA` / `tenantB` placeholders stand for whatever productScope strings the ProductRegistry contains at runtime. No VEU product names are checked into the SSOT, code, configs, env vars, or tests.

**Rule:** if you can write a new product entry into Supabase + Doppler and FlowAI starts orchestrating it without a code change, the architecture is correct. If the 6th, 10th, or 100th tenant requires touching `src/`, the architecture is broken. This rule is canonical and binding.

---

## 4. FOUR LEVELS OF ORCHESTRATION (was: Three Levels in Rev-1)

Rev-1 listed three levels. Panel Q2 found the levels "CORRECT_BUT_INCOMPLETE" — missing **Capability Transfer** (Sprint PROTECT-1). Rev-2 promotes Capability Transfer to a fourth level.

| # | Level | Scope | Status |
|---|---|---|---|
| L1 | **Building FlowAI** (current phase) | VEU constructs FlowAI itself — agents, governance, pipeline, Orchestra, OrchestratorHub. The 26-agent roster is canonical; rostered, implemented, wired, runtime-active, and production-verified are distinct states. | ACTIVE — Phase 1.0 substrate work in flight; Agents #1/#2/#3/#5 SHIPPED-GREEN; #4 PARTIAL; remaining rostered agents are not presumed runtime-active or production-verified |
| L2 | **FlowAI on Itself** | Once live, FlowAI self-monitors, self-renews, self-updates Orchestra rankings, runs the 8-step pipeline against its own repos. | PARTIAL — Self-Governance Layer (Sprint 5) live; full self-orchestration awaits Panel-handover gate |
| L3 | **FlowAI on External Products** | Accepts via 4 input modes (§5), aggressively crawls everything, applies the 8-step pipeline, always delivers a canonical per-target-class delivery artifact. The fork-and-fix mode (§12) is the canonical externalized output path. | PARTIAL — W2 three-input renewal pipeline shipped on neutral test fixtures (commit `9b4e511`); fork-and-fix live; full crawl-fix-redeliver loop awaits Agent #3 graduation (see `docs/specs/SELF_RENEWAL_AGENT_SPEC.md`) |
| L4 | **FlowAI Capability Transfer into Other Products** (NEW — gap #4 from Panel Q2) | FlowAI installs its own capabilities into a target product as a Capability Package. Each package is generated as an install sprint and consumed by the target. | LIVE — Sprint PROTECT-1 shipped two packages: Self-Renewal (4 components: Self-Test, Self-Heal, Self-Monitor, Governance Hook) and Self-Protection (4 components). Install sprints exist for all 5 VEU products. Surface: `/capability-transfer`. |

L4 is operationally distinct from L3: L3 acts ON a product to produce a renewed URL; L4 installs a piece of FlowAI INTO a product so the product carries its own self-test / self-heal / self-monitor / governance after install.

---

## 5. FOUR INPUT MODES (per parking-lot ENTRY 006)

1. **Clone & Improve** — single URL, crawl, audit, enhance, redeploy.
2. **Describe & Build** — natural language, generate from scratch.
3. **Paste / Upload** — text + screenshots (Anthropic vision OCR), reconstruct and build.
4. **Synthesize & Build** — 2–5 URLs, cross-URL comparative scoring + best-feature extraction + synthesis composition.

INPUT modes are distinct from TOOL INTELLIGENCE axis (§8) and SYSTEM OPERATION axis (§8a). All three concerns vary independently — a user can run "Clone & Improve" in **AUTOMATIC** tool selection (§8) under **AUTOMATIC** system operation (§8a), or any other combination. Both §8 and §8a use the LOCKED AUTOMATIC / GUIDED / MANUAL triad per CA-18 §6 ENTRY 019 (Locked Rule 4).

### 5.1 Granular input and output type maturity

The four input modes above are the operator-facing workflow categories. The normalized input surface underneath them accepts the following granular input types:

| Input type | Maturity |
|---|---|
| Single URL | CURRENT |
| Multiple URLs (2+) | ROADMAP |
| Text description | IN_PROGRESS |
| Voice / audio | ROADMAP |
| Image / screenshot | ROADMAP |
| Video | ROADMAP |
| Document / PDF | ROADMAP |
| Dataset | ROADMAP |
| Code repository | ROADMAP |
| Combination (any mix) | ROADMAP |

Output types map to the same target-class delivery contract in §7:

| Output type | Maturity |
|---|---|
| Upgraded product (fresh build from URL analysis) | TARGET |
| Brand-new product (built from non-URL input) | ROADMAP |
| Product specification for a human developer | IN_PROGRESS |
| Synthesized product (best of multiple inputs) | ROADMAP |
| Benchmark report | ROADMAP |
| Migrated product (platform dependencies removed) | CURRENT / IN_PROGRESS |
| Combination output | ROADMAP |

---

## 6. AGGRESSIVE CRAWLING, TESTING & RESOLUTION CONTRACT

**Crawl scope (per parking-lot ENTRY 002 + ENTRY 006 / Aggressive Crawl Engine promotion 2026-05-16, Panel `05ac6f4` 7×UNANIMOUS + CEO arbitration Q6=(c)):** all links, cards, modals, pages, engines, workspaces, embedded AI agents. No element skipped. Authenticated + unauthenticated paths. Mobile (375×667) + desktop (1920×1080) viewports. Error states triggered deliberately (see deliberate-trigger sub-list below). Depth-bounded full-site spider with **default depth=8 / hard cap depth=12** and **default pages=200 / hard cap pages=2000** per product per environment (engineering may raise hard caps via Doppler `flowai/<env>/CRAWL_DEPTH_HARD_CAP` + `flowai/<env>/CRAWL_MAX_PAGES_HARD_CAP`). Each page rendered + interacted via Browserless `/function` (`richCapture`) — far richer than single-page `/content` rendering used in earlier `api/_lib/inputAdapters/url.js` (which shipped at default depth=2, max=8 pages — superseded by Aggressive Crawl Engine ENTRY 006).

**Interaction passes per page per viewport (sequential, per ENTRY 006):**
1. **Initial render** via `richCapture(url, { fullPage: true, includeScreenshot: true })`. Captures HTML + screenshot + console errors + network errors + surfaces `{ links, buttons, forms, images, headings }`.
2. **Auth handling** — if `sessionStorageState` is set (per `InputArtifact.raw.description.login*`), hydrate page; if redirected to login, attempt one credentialed login, save updated `storageState`, retry render; otherwise mark `authGated: true`.
3. **Click-everything pass** — every same-origin internal `surfaces.links[]` + `surfaces.buttons[]` clicked once per viewport (navigation enqueued to frontier; DOM mutation inspected for newly-visible modal/content).
4. **Modal probing pass** — every `[role="dialog"]`, `.modal`, `[aria-modal="true"]` opened + state captured + closed cleanly (Esc / close-button / backdrop click); broken modals reported.
5. **AI-agent probing pass** — selectors `[data-ai-input]`, `.chat-input`, `.prompt-input`, `textarea[placeholder*="ask" i]`, `textarea[placeholder*="prompt" i]`, `textarea[name*="message" i]`, `[contenteditable="true"][role="textbox"]`, third-party chat iframes (`iframe[src*="intercom" i]`, etc.) — send benign probe prompt **`"Reply with the single word: ACK"`** + capture response within 30s; classify reachability + responsiveness.
6. **Form catalog pass** — every form's fields enumerated (name, type, required). **No submit unless XSS opt-in flag set, per CEO arbitration Q6=(c) below.**
7. **Network log capture** + **external script catalog**.
8. **Deliberate error-state triggers (per CEO arbitration Q6=(c) — non-destructive by default; XSS is explicit opt-in only):**
   - **Always on (`'safe'` mode default):** 404 page probe (navigate `<origin>/__flowai-probe-nonexistent-${runId}`), 500 page probe (`Accept: invalid/garbage`), network offline mid-load, slow-network sub-resource throttle. None of these mutate SUT state.
   - **Opt-in only (`'full'` mode):** form submit with empty required field (validation probe) + form submit with `<script>alert(1)</script>` payload (XSS echo probe). Both require operator confirmation that SUT is in dev/staging environment, never prd, per §13 role-gate. **Never default-enabled.**

**Card / interactive tile coverage** (per ENTRY 006): cards detected by class/role heuristics (`.card`, `[role="article"]`, `[data-card]`, visual heuristic of a `div` containing both heading + button/link descendants in flex/grid layout). Each card's primary CTA (last `button` or `a` descendant) clicked once per viewport.

**Target-class Phase-A detector sets (CA-DELIVERY-DISTRIBUTION-GOVERNANCE):** the web/SaaS/generic_url detector set above remains the current default. Full enumeration is deferred to each target class's build dispatch, but the canonical Phase-A shapes are:

- **native_app / mobile_app:** build/signing-config validity, crash-on-launch, permission-manifest sanity, store-guideline lint, binary size/performance.
- **agentic_ai:** tool-permission scoping, prompt-injection-resistance probe, ACK reachability, rate/cost guardrails, response validity.

CA-16-C (Multi-Format Targets) is resolved as a canonical contract disposition: all six target classes are operationalized through target-class detector sets and delivery adapters, while implementation is deferred to each class's build dispatch. The §7.6 formula remains class-invariant: detector sources vary by target class; scoring formula, band boundaries, and prerequisite gates do not.

**Orchestra wiring (per §15.4 + Aggressive Crawl Engine spec §E.2 / ENTRY 006):** Agent #21 Ops Runner Alpha (Aggressive Crawl Conductor — see §15.1 row 21) dispatches via Orchestra members `playwright` (preferred for full interaction: click + modal + form probing), `browserless` (fallback for crawl + screenshot capture per finding), `anthropic-api` (CA-9-B generic adapter, used for surface classification + Issue Detection LLM-assist on novel categories). Per-run cost ceiling: **$15/run/product/env** (3× nominal pipeline; configurable per product via Doppler).

**Credential handling for authenticated crawls (gap from Panel Q3):** session-only credentials per `src/lib/renewal/inputArtifact.js` `raw.description.loginEmail/loginPassword`. **Scrubbed before any persist / log / external send** via `scrubCredentials()`. Never written to the audit log. Never embedded in renewed output. Playwright `storageState` JSON persisted only in ephemeral `tmp/playwright-state-<runId>/`; auto-deleted at run end.

**Resolution contract (clarified — gap #3 from Panel Q3 + Slot 3/5/7 dissent):**
Every issue surfaced by `api/_lib/issueDetector.js` MUST reach a **terminal decision** before output delivery. The terminal decisions are:
- **Resolved** — the fork-and-fix path produced a renewed URL whose verification re-crawl shows the issue category absent. (Auto-deploy in fork-and-fix mode.)
- **Human-gated** — severity `high` or `critical`, or category in the human-gated set (legal / trust signals / value-proposition claims). Human picks one of three actions per Sprint ARCH-1: **Approve** (deploy as-is), **Modify** (edit FlowAI's proposed fix before deploy), **Skip** (document why, defer to backlog). Skip is a terminal decision — it acknowledges the issue and records the reason, satisfying "every issue resolved" in the audit-trail sense.
- **Documented limitation** — issue cannot be addressed within the input scope (e.g. mobile responsiveness flagged but only desktop assets supplied). Documented in the final delivery's LIMITATIONS section verbatim. Also terminal.

The "every issue MUST be resolved before output delivered" wording in Rev-1 was absolutist and Panel Q3 marked it `NOT_ACHIEVABLE_AS_WRITTEN`. Rev-2 makes the resolution semantic explicit: **resolution = terminal decision**, not necessarily auto-fix. Human-in-the-loop is canonical, not optional.

**Loop:** crawl → detect → propose fix or gate decision → execute (fork-and-fix or human action or document) → re-test (re-crawl + re-detect) → confirm clean OR record gated/documented terminal decision → deliver the target class's delivery artifact with full delta report.

---

## 7. OUTPUT CONTRACT

Every run produces:

1. **A canonical per-target-class DELIVERY ARTIFACT** — fully deployed or packaged, real working product output (NOT static HTML). Static HTML is permanently rejected as a primary output (legacy `api/_lib/renewalEngine.js` static-HTML path remains as deprecated fallback only).

   | Target class | Delivery artifact |
   |---|---|
   | `web` / `SaaS` / `generic_url` | Hosted deployable URL |
   | `mobile_app` / `native_app` | Signed build/package (APK/IPA) + installer + store-distribution adapter. Signing identity is held by the operator per §13/§22. |
   | `agentic_ai` | Deployed runtime + tool-permission manifest + monitoring adapter |

   Agentic monitoring adapter scope includes tool-call invocations, token/cost usage, latency, error/refusal rate, and behavior-drift signals.

   The operator-approval gate occurs BEFORE FlowAI calls any store submission API. FlowAI initiates submission; the store holds the publish decision. This applies to all distribution adapters, including stores that auto-publish on submission.
2. **Before/After delta report** — `before_after_delta` from `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §2.4: `{ issuesBefore, issuesAfter, resolved, unresolved, regressions }`, plus the terminal decision per issue (see §6).
3. **Source disclosure** — `patch-existing-source` or `generate-from-scratch`, plus retrieval method (git-tarball / vercel-project / base44-stub / none).
4. **LIMITATIONS section** — verbatim list of human-gated-skip and documented-limitation terminal decisions, per `api/_lib/beforeAfterReport.js`.
5. **Updated ProductSSOT row** (per CA-10-A / ENTRY 005). On every pipeline run that produces an output, FlowAI writes a new `delta_log` entry to the product's ProductSSOT row (one row per `(productId, environment)` pair per §7.5). The write is **atomic** with the rest of the output contract: a run that produces a renewed URL but fails to update ProductSSOT is considered INCOMPLETE and rolled back (per §10 Self-Protect snapshot + Self-Heal pattern). The ProductSSOT update is the canonical living-document mechanism — it accumulates history across runs and is fed back into the next pipeline run per §28's symbiotic loop.
6. **Self-Renewal safety-invariant compliance (CA-14-B canonical per ENTRY 015).** Every fix proposed by Self-Renewal Executor (or any descendant fix-generator) MUST clear ALL FIVE of the following before being accepted into a PR for operator review:

   a. **Diff-only.** The fix is expressed as a minimal-change diff against the operator branch's HEAD; large rewrites are forbidden unless the finding category explicitly authorizes them (none in the current §6 detector set do).

   b. **Preserve rules.** The fix MUST NOT remove existing imports, types, exports, or comments unless the finding-specific scoped relaxation explicitly permits it (per W5a commit `41e51ed` scoped per-finding preserve relaxation).

   c. **Pre-deploy parse gate.** The post-fix file MUST parse cleanly under the project's build toolchain (per W5a commit `bbf75d9`). Parse failure → reject the diff; emit `agent.fix.parse_failed.v1`; exit `NO_IMPROVEMENT`.

   d. **Post-deploy regression guard.** After preview-URL deploy, re-run §7.6 score. If `post_score < pre_score` OR if NEW `critical`/`high` findings appear, REJECT THE PR — emit `agent.fix.regression_detected.v1`; exit `NO_IMPROVEMENT` with the negative-delta trace (per W5a commit `fa9a8f0`).

   e. **Per-fix attribution.** The fix carries a commit-order trace sufficient to isolate which individual fix in a multi-fix PR caused a regression (per W5a commit `2f4cb97`). Required for §10.3 Self-Heal forensics.

   Operative implementation commits cited: `29ce070`, `41e51ed`, `e1f4298`, `bbf75d9`, `481e610`, `fa9a8f0`, `2f4cb97`, `f80ac70`.

   **Canonical guarantee (CA-14-B-Q2 ratification, ENTRY 015, QUORUM 7/10):**

   FlowAI NEVER ships a fix that regresses §7.6 score OR introduces new `critical`/`high` findings. It refuses the PR and exits `NO_IMPROVEMENT`. Operator + admin are notified via the standard governance-record audit trail. This guarantee is the canonical extension of the five invariants above and is binding on every Self-Renewal Executor invocation — including all descendant fix-generators (e.g. CA-16-B Redesign Environment build/wire dispatch when ratified).

### LIMITATIONS disclosure discipline (CA-14-A canonical per ENTRY 015)

Every operator-facing delivery (demo microsite, clearance package, GTM bundle) that cites a §7.6 score MUST disclose:

1. Whether the score reflects **surface-only verification (Phase A only)** OR **surface + interactive verification (Phase A + Phase B)**.

2. For Phase A only: the LIMITATIONS section MUST contain the verbatim phrase *"This §7.6 score reflects surface verification only. Interactive flows (authenticated paths, error-state recovery, engine adversarial probes) were not exercised. This score is NOT a functional certification."*

3. For Phase A + B with skipped Phase B paths: enumerate every skipped path (e.g. "auth-traversal unavailable for /admin"); state the reason for skip.

4. For full Phase A + B pass: the LIMITATIONS section MAY omit the surface-only disclaimer but MUST retain the band-vs-spec deltas per ENTRY 006.

Operators MUST NOT remove or paraphrase these disclosures. The disclosure is load-bearing per CEO directive 2026-05-18.

**Source acquisition order** (per `api/_lib/sourceAcquisition.js`): git URL → Vercel project → Base44 project → fallback to generate-from-scratch. Generate-from-scratch is canonical capability per parking-lot ENTRY 005, not a fallback in the colloquial "second-best" sense — it produces a fully functional working product whenever source is unreachable.

### §7 — Proactive recommendations are NOT a canonical Output Contract artifact (CA-16-A disposition per ENTRY 017)

**CA-16-A disposition (CEO Decision B, Locked Rule 13 — COLLAPSE to ZERO canonical surface).** §7 remains at the canonical 6 items (1–5 per ENTRY 005 + item #6 per CA-14-B ENTRY 015 + LIMITATIONS disclosure discipline per CA-14-A ENTRY 015). **No §7 item #8 "Proactive Recommendations envelope" is promoted.** Proactive recommendations are wholly TOOLING-governed:

- **No canonical §7 envelope.** No PA-schema in canonical SSOT.
- **No §11 reference.** Proactive recs do NOT appear in the Six-Step Clearance Protocol; they are not a clearance gate or sub-step.
- **No canonical lifecycle states.** No `REOPEN`, no `open`/`accepted`/`rejected`/`deferred`/`implemented`/`reopened` state machine in canonical SSOT.
- **No canonical defer-window.** No `[7, 90]` bounds, no `[1, 365]` bounds — no defer-window in canonical at all.
- **No canonical audit-log envelope.** No `governance_record_entry kind:'proactive_recommendation.v1'`.

Engineering owns the recs surface entirely: `scripts/lint-proactive-recs.mjs` (or equivalent dispatch-time naming) + admin dashboard `/admin/recommendations`; schema lives in tooling-internal types under `scripts/types/`. The dashboard maintains its own audit; no cross-link to canonical state is required (no `last_seen_clearance_record_id` reference promoted either — the v3 draft's lightweight reference is NOT canonical per CEO Decision B).

CA-16-B (Redesign/Build Environment §29-area sub-section) is WITHDRAWN as a market/user-driven design question per ENTRY 020; the CA-16-B-Q3 admin-only Redesign approval gate per ENTRY 015 §11.7 is UNCHANGED. CA-16-C (Multi-Format Targets §6 extension) is resolved as canonical contract disposition by CA-DELIVERY-DISTRIBUTION-GOVERNANCE; implementation remains deferred to each target class's build dispatch. The CA-16-C-Q4 §7.6 formula-generalization invariant per ENTRY 015 §7.6 remains canonical and is NOT re-amended by the implementation deferral.

### 7.5 ProductSSOT entity — canonical living-document structure (per CA-10-A / ENTRY 005)

One **ProductSSOT** row per `(productId, environment)` pair, where `environment ∈ {'dev', 'prd'}` per §16.3 (Dual Deployment — dev + prd tracked separately). A product registered in three states (dev + prd + an additional staging) gets three ProductSSOTs.

**Six canonical blocks per ProductSSOT row:**

| Block | Owner | Mutation | Purpose |
|---|---|---|---|
| **`identity_block`** (jsonb) | system + admin | auto-populated; admin can override | `{ productName, productUrl, ownerProviderOrgId, ownerOperatorIds[], createdAt, createdBy: {userId, displayName, role}, tags? }` |
| **`build_brief`** (jsonb) | system + admin | auto-populated from original creation input; admin can annotate | `{ originalInput: {mode: 'clone-improve'\|'describe-build'\|'paste-upload'\|'synthesize-build', sourceUrls?, description?, attachments?[]}, inputArtifactId, normalizedConcept, targetUsers, coreClaims[], detectedFeatures[], initialBuildCommit?, initialDeployUrl? }` |
| **`architecture_snapshot`** (jsonb) | system (Agent #10 drift detection) | auto on drift; admin can annotate but NOT mutate the snapshot | `{ capturedAt, framework, dependencies[{name, version, license, deprecated?, criticalCves?}], envConfig[{keyName, present, source: 'doppler'\|'env-file'\|'absent'}], pages[{route, component, lastSeenAt}], apiEndpoints[{path, method, lastSeenAt}], databaseSchema[{table, columns[{name, type, nullable}], rlsPolicies?[]}], readinessScores[{dimension, score}] }` (readinessScores per §16.1 six dimensions) |
| **`delta_log`** (jsonb[]) | system (Agent #3 + Agent #10) | append-only; admin can annotate per entry | Each entry: `{ entryId, at, triggeredBy: 'agent3_self_renewal'\|'agent10_drift_detection'\|'agent10_customer_issue'\|'clearance_step'\|'manual', triggerSourceId, issue?, remediation?, before_after, humanGateDecision?, annotations[], overrides[] }` |
| **`governance_record`** (jsonb[]) | system (Clearance + Human Gates) | append-only; admin can annotate per entry; never override | Each entry: `{ entryId, at, kind: '95_95_score'\|'clearance_step'\|'human_gate'\|'panel_decision'\|'self_audit_dimension_score'\|'customer_signal', payload, clearanceStepNumber?, clearanceStepLabel?, scoreBreakdown?, acceptedBy?, annotations[] }` |
| **`annotations`** + **`overrides`** (jsonb[]) | admin + operator (annotations); admin only (overrides) | append-only; never auto-written | Per §13.1 role gates — operator can append annotations only; admin can append both annotations + overrides; client read-only. See §28 for treatment of admin overrides as authorized-operator-equivalent directives. |

Plus a `version` field (monotonic per `(productId, environment)`, auto-incremented on every write) + `audit_hash_chain_pointer` (tamper-evidence anchor per §14.2). Every write also appends a row to `product_ssot_version` table (separate Supabase table; hash-chained per §14.2).

**Supabase schema:** `product_ssot` table (RLS-enabled per §13.1) + `product_ssot_version` table (append-only audit; same hash chain as GovernanceAuditLog per §14.2). Migration: `supabase/migrations/00NN_product_ssot.sql` (engineering dispatch separate; W2 + W5x to implement).

**Relation to DeploymentScaffold (§16.2):** complementary, not duplicative. DeploymentScaffold = single deploy snapshot (per Sprint 6 Phase 2). ProductSSOT = full deployment history + governance trail + annotations across time. ProductSSOT's `architecture_snapshot` may derive from the most recent DeploymentScaffold; engineering dispatch reuses the shape where applicable.

**CA-15-B disposition (CEO Decision B, per ENTRY 017):** ProductSSOT remains EXACTLY the 6 canonical blocks above per CA-10-A. **No `product_purpose` field** (neither required nor optional) is added in CA-15. The v1 `purpose_record` block AND the v2 optional `product_purpose` field are BOTH explicitly rejected. Purpose information, if needed by an operator, lives entirely OUTSIDE ProductSSOT — in operator-maintained notes, README files, or any operator-process surface; these are NOT canonical FlowAI state. (Forward-looking discipline carried at §28.6: if a future CA ever re-introduces purpose information to canonical SSOT, only the `described` operator-supplied capture mode is admissible.)

### 7.5.1 ProductSSOT operational invariants (CA-14-D canonical per ENTRY 015)

Three load-bearing operational invariants apply to every ProductSSOT row:

**Invariant 1 — Per-product branch-of-record.** Every operator product MUST have a `product_registry.self_renewal_branch` field populated with the canonical operator branch name (typically `main` for operator repos, or a configured equivalent). Self-Renewal Executor reads this field to determine the PR target. **Missing branch-of-record → Self-Renewal cycle refuses to start; emits `agent.product_registry.missing_branch.v1`; operator notified via standard governance channel.** Migration: `0019_product_registry_branch.sql` (commit `6fb0106`) adds the column + default. Orchestrator + probes thread the field through per `ecf486a`.

**Invariant 2 — ProductSSOT row seeding precedes any Self-Renewal cycle.** Every operator product MUST have a `product_ssot` row inserted BEFORE any Self-Renewal Executor invocation, Aggressive Crawl Engine invocation, or governance-write attempt against the product. Per-product seed migrations:

- FlowAI self-test: `0017_product_registry_flowai_row.sql` + `0018_product_ssot_flowai_seed.sql` (commits `323d5f4` + `464f65f`).
- MyPregLife: `0020_product_ssot_mypreglife_seed.sql` (commit `a216762`).
- SAIGE + ReachSMS + RelTwin + PressAI: `0021_product_ssot_seed_rows.sql` (commit `46eb051`).

**Missing seed row → governance-write to that product fails hard with `agent.product_ssot.row_missing.v1`.**

**Invariant 3 — Atomic-audit-write via snapshot + CAS + rollback.** Every write to `product_ssot.governance_record` (or any of the 6 canonical blocks per §7.5) MUST follow the snapshot + CAS + rollback pattern from commit `9b05ad7` (P0-5). The pattern:

1. Read current row + capture row-version (timestamp or sequence).
2. Compute write payload.
3. UPDATE with `WHERE row-version = captured-version`; on 0 rows updated → rollback (someone else won); retry up to 3 times with exponential backoff (50ms / 100ms / 200ms).
4. On 3rd failure → emit `agent.product_ssot.atomic_write_contention.v1`; operator notified.

Persistent contention is non-retryable without operator intervention. The pattern mirrors Cluster A advisory-lock + statement_timeout philosophy (canonical template v3) for application-managed concurrency.

### 7.6 GTM Readiness Report (per Aggressive Crawl Engine / ENTRY 006)

Every Aggressive Crawl Engine run on a product produces — atomically with the §7 Output Contract items 1–5 — a **GTM Readiness Report**: a per-`(productId, environment)` score in `[0, 100]` measuring demo-readiness for the prospect-facing channel. The report is owned by Agent #21 Ops Runner Alpha (Aggressive Crawl Conductor, §15.1 row 21); it is written into the affected ProductSSOT's `governance_record` block (kind: `gtm_readiness_score`) AND surfaced at `/architecture` per product per §16.

**Scoring formula (canonical):**

```
score = 100
     − (10  × count_critical)
     − (5   × count_high)
     − (2   × count_medium)
     − (0.5 × count_low)
     clamped to [0, 100]
```

**§7.6 formula generalization invariant (CA-16-C-Q4 canonical per ENTRY 015, SUPERMAJORITY 8/9):** the §7.6 scoring formula remains **unchanged across all submission/output target classes** (per CA-16-C target-class taxonomy resolved by ENTRY 020). The formula is:

```
score = 100
     − (10  × count_critical)
     − (5   × count_high)
     − (2   × count_medium)
     − (0.5 × count_low)
     clamped to [0, 100]
```

What CHANGES per target class is the finding-source set (Phase A detector set varies per class). What does NOT change is the formula, the band boundaries, or the prerequisite gate. No per-class weight adjustments; no per-class formula replacement. This invariant prevents per-class scoring drift and keeps cross-class comparisons meaningful.

Cleared independently of the original CA-16-C-Q1 panel cycle; ENTRY 020 now resolves the six canonical target classes as a delivery-adapter contract while preserving this formula invariant.

Findings counted are those produced by the Aggressive Crawl Engine's issue-detection pass (per ENTRY 006 detector set: `ai-agent-unreachable`, `ai-agent-no-response`, `broken-modal`, `dead-card`, `engine-error`, `auth-gate-leak`, `console-error`, `network-failure`, `slow-route`, `missing-404-handler`, `missing-500-handler`, `no-offline-indicator`, `no-loading-indicator-on-slow-net`, `no-form-validation`, `xss-in-form-echo` [hard-classified critical, not promotable via override per CA-10-Q3], `external-script-leak`, `accessibility-headings`, `accessibility-alt-text`).

**Score bands (canonical):**

| Score band | Label | Demo guidance |
|---|---|---|
| 90–100 | **Showcase-ready** | Safe to send to any prospect demo; passes §11 Clearance Step 5 cleanly |
| 75–89 | **Demo-ready** | Safe with named caveats; LIMITATIONS section MUST be shown |
| 60–74 | **Internal-only** | Not for external demo; surfaces to §11 Step 5 as "conditional" |
| 0–59 | **Not demo-ready** | Blocks §11 Clearance Step 5 until Self-Renewal closes `critical` + `high` |

**Cost ceiling (canonical per ENTRY 006):** **$15 per run per product per environment** (3× the nominal pipeline ceiling per `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` §7.4 — aggressive crawls are 5–10× heavier). Configurable per product via Doppler `flowai/<env>/PRODUCTS_<productId>_AGGRESSIVE_CRAWL_BUDGET_USD`.

**Maps to §11 Clearance Step 5 (Demo Readiness)** — ENTRY 006 extends §11 Step 5 to require **ALL** of:
- GTM Readiness Report exists for the product in the current environment.
- Report score **≥75** (Demo-ready band) AND **zero `critical` findings open**.
- Self-Renewal cycle on all findings ≥`high` has reached a terminal decision (Resolved / Human-gated / Documented per §6).
- LIMITATIONS section published verbatim in delivery.

Failure of any of the four prerequisites blocks §11 Clearance Step 5 with explicit error. Score-band labels surface in the `/clearance` wizard's Step 5 UI alongside the synthetic-data demo-microsite check from Sprint 7.

**Top fixes ranking** (surfaced at report top): the top 5 highest-severity findings ranked by `impact_score = severity_weight + 0.5 × visibility_weight + 0.2 × effort_to_fix_weight` (severity_weight: critical=10 / high=5 / medium=2 / low=0.5; visibility_weight: surface frequency × 0.1, weighting landing-page findings above deep-route findings; effort_to_fix_weight: 1.0 if `autoFixable` else 0.3, preferring auto-fixable findings for immediate fork-and-fix per §12).

**Per-surface grouping (6 sections in the rendered report):** Links · Cards · Modals · Pages · Engines · AI agents. Within each surface section: severity-grouped tabular view (Showstopper / Critical / High / Medium / Low; one finding per row with reproducer + evidence path).

**Audit-log integration (per §14.1 ripple amendment from ENTRY 006):** every report emission writes a `governance_record_entry` to the affected ProductSSOT with `kind: 'gtm_readiness_score'` + the topic `21.gtm.readiness.v1` is emitted on the bus. Re-crawl after fix produces a new `governance_record_entry` (separate entry, not an update) so the score trajectory is auditable across the product's lifetime.

**Market-definition scope (canonical, per §1.1 and CEO instruction 2026-05-18):** FlowAI GTM readiness scoring for each product MUST be evaluated against the product's actual market definition, not a narrow interpretation. A product is GTM-ready when it serves its full defined market, not just a subset of it. The §1.1 product market definitions are the authoritative scope inputs for Agent #21's issue-detection pass + the 100-point demo-readiness score; the matching `product_registry.market_definition` row is the runtime mirror.

**CA-13 disposition (CEO Decision B, per ENTRY 017):** the §7.6 GTM bands per ENTRY 006 (90–100 Showcase-ready / 75–89 Demo-ready / 60–74 Internal-only / 0–59 Not-demo-ready) remain canonical. **NO canonical sub-95 exception path exists in CA-13** — the CA-13 v3 draft's admin-only expiring override mechanism (`gtm_bar_admin_override.v1` + `gtm_bar_admin_override_used.v1` envelopes + 14-day expiry + ClearanceRecord migration prerequisite) is NOT promoted. The uniform ≥95 directive (CEO 2026-05-18) does NOT live in CA-13 — it is deferred to the forthcoming mission/Purpose amendment as a DELIBERATE DECISION; whether any operational sub-95 exception path exists at all (and if so, what shape) is part of that deferred decision, not a CA-13 question. Per-product `gtm_ready_bar_override` operator-config knob from ENTRY 006 §7.6 maps remains unchanged in this entry.

(The CA-13 §29 build/wire engine S6 invariant references `gtm_bar_admin_override.v1` and `gtm_bar_admin_override_used.v1` only in the closed-6-kind in-flight-invalidation list for the construction engine — these are referenced as future-extension hook names. The kinds are not currently emitted by canonical FlowAI capability; they would only be emitted if/when the mission/Purpose amendment introduces them.)

---

## 8. THE ORCHESTRA — 10 MEMBERS (Orchestra Selection axis)

**Members (per parking-lot ENTRY 004):** Claude Code, Base44, Lovable, v0, Cursor, OpenRouter, Browserless, Anthropic API (direct), Replit, Playwright.

Full per-step capability matrix + ranking formula + adapter health monitoring + per-call cost tracking + fallback chain in `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` (commit `38b1a23`). Locked Rule 18 ranking formula:

```
rank_score = (performance_score × 0.6) + (price_weight × 0.4)
performance_score ∈ [0.0, 1.0]
price_weight from price_tier: free=1.0, low=0.8, medium=0.6, high=0.3, enterprise=0.1
Top 3 published per pipeline step as recommended_adapters[].
```

**Tool Intelligence Principle (CA-18 §6 canonical per ENTRY 019 — REPLACES the Rev-2 "Orchestra Selection axis" with AUTOMATIC / GUIDED / MANUAL LOCKED naming):**

FlowAI is **AI-provider-agnostic and tool-agnostic at every step.** For each of the 8 Auto Runner steps per §9, the engine researches, ranks, and selects from the **top 5 available platforms** based on current performance, cost, speed, and reliability for the specific task and the §4 target class (web / native_app / mobile_app / SaaS / agentic_ai / generic_url per CA-18 ENTRY 018). Rankings are **research-driven (not hardcoded)** and **refreshed monthly**.

**Three selection modes (LOCKED globally at AUTOMATIC / GUIDED / MANUAL per CA-18 §6 ENTRY 019; aligned with the §3 iteration model of `docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md`):**

| Selection mode | Behaviour |
|---|---|
| **AUTOMATIC** | Engine selects the rank-#1 platform for each step without user input. (Was "Auto" in Rev-2; "Auto" in Rev-1 — same semantics.) |
| **GUIDED** | Engine presents the full top-5 ranked list per step; user selects before execution. (Was "Recommended" in Rev-2; "Guided" in Rev-1 — same semantics.) |
| **MANUAL** | User specifies the exact tool for any or all steps. (Was "User-Choice" in Rev-2; "Manual" in Rev-1 — same semantics.) |

**Vendor-agnosticism invariant.** No step is locked to any single provider. Vercel, Anthropic, OpenAI, Cursor, Browserless, Playwright, Replit, Lovable, v0, Base44, OpenRouter, or any other vendor's current ranking reflects **current performance — not permanent commitment**. As better tools emerge, rankings update and FlowAI adopts them automatically. The Locked Rule 18 ranking formula above + `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` §7.4 is the canonical authority for how performance + cost + speed + reliability combine into the per-step rank; this amendment locks the user-facing selection-mode triad to AUTOMATIC / GUIDED / MANUAL.

Engineering may keep `'guided'` / `'manual'` / `'auto'` / `'recommended'` / `'user_choice'` enum strings in code if the migration cost is high — the lock applies to canonical user-facing labels, audit-log surfaces, dashboards, dispatches, and Panel discourse. Engineering-internal enum migration is an engineering-dispatch decision per Open Question 6 (RESOLVED at ENTRY 019).

### 8.1 Orchestra Self-Expansion (Auto-Admission, per CA-9-A — ENTRY 005)

The 10-member Orchestra evolves continuously per Locked Rule 16. CA-9-A
defines the auto-admission mechanism: a candidate platform is admitted
to the Orchestra without a human gate if it meets ALL of:

1. `candidate_rank_score ≥ 0.70` per the Locked Rule 18 formula.
2. `head_to_head_minimum_invocations ≥ 30` on at least one declared capability.
3. The candidate covers at least one capability for which the existing
   Orchestra has fewer than 2 wired members (capability-gap rule —
   prevents admission for redundant coverage).
4. No carve-out flag from Agent #11 Strategic Intelligence or Agent
   #14 Public Policy (security / legal / regulatory exposure).

The auto-admission pipeline is canonically owned by
`orchestra-membership-executor`, the §15.5 canonical executor entry for the
Orchestra membership lifecycle and auto-admission write path. This is
canonical ownership only; runtime implementation, production verification, and
deployment evidence are not claimed by this docs-only amendment.

**Lifecycle states** (canonical; surfaced in `/architecture` per §16):

| State | Definition | Entry trigger | Exit trigger |
|---|---|---|---|
| **Trial** | New member; full eligibility per capability matrix but rank_score multiplier 0.5; head-to-head benchmark in progress (<30 invocations on any capability) | Auto-admission per gate above | ≥30 invocations on ≥1 capability AND rolling 24h error rate <15% → Probation |
| **Probation** | Full rank_score; error-rate watch heightened; Auto mode can pick the member but only when ≥1 wired member is available as fallback | Trial exit + first stable benchmark | 30 consecutive days at status green → Full member |
| **Full member** | Canonical Orchestra membership; appears in §8 roster | Probation exit | Manual deprecation OR auto-deprecation per Panel + CEO gate |
| **Deprecated** | Existing wired-flag remains for grace period (90 days); ranking excluded; fallback chain skips | Panel + CEO disposition | Removal from registry after 90 days |
| **Archived** | Enumerated in §8 roster but never reached Full member; wired-flag is `false`; ranking excluded; fallback chain skips. Distinct from `Deprecated` (which means "was Full member, phasing out"). Kept in the registry as a re-activation candidate when platform constraints change. | Initial wiring attempt failed empirically (e.g. Lovable + Replit per commit `9143f82`) OR Panel + CEO disposition retains the member pending platform changes | Re-activation: re-evaluation clears the four-condition gate → enters Trial |

**Re-activation path (Lovable + Replit reconciliation):** any `Archived` member that is re-evaluated by `orchestra-membership-executor` and clears the four-condition auto-admission gate is auto-promoted `Archived → Trial`. `orchestra-membership-executor` emits `26.orchestra.candidate_reactivated.v1` (payload: `{ candidate_id, candidate_name, prior_state: "archived", rank_score, capabilities[], reactivated_at, basis }`). Lovable and Replit remain enumerated in §8's canonical 10-member roster for historical continuity; the wired+active subset is fewer than 10 today, and that gap is canonically explained by the `Archived` (and `Deferred`) lifecycle states.

**Audit-log topics (per §14.1 ripple amendment from ENTRY 005):**

Ownership of the following stable topics is assigned to
`orchestra-membership-executor`. The `26.orchestra.*` topic identifiers are
stable engineering identifiers retained under the ENTRY 019 enum-alias /
identifier-stability precedent; the numeric prefix no longer means Agent #26
owns the capability.

| Event | Topic | Payload |
|---|---|---|
| Candidate observed | `26.orchestra.candidate.v1` | `{ candidate_id, candidate_name, source, evidence_url, performance_score_estimate, price_tier_estimate, at }` |
| Candidate auto-admitted | `26.orchestra.admitted.v1` | `{ candidate_id, candidate_name, rank_score, performance_score, price_tier, capabilities[], admitted_at, basis: "auto-threshold-met" }` |
| Candidate auto-rejected | `26.orchestra.candidate_rejected.v1` | `{ candidate_id, candidate_name, rank_score, threshold, reason, at }` where `reason` ∈ {`below_threshold`, `insufficient_invocations`, `capability_overlap`} |
| Candidate Panel-gated | `26.orchestra.candidate_panel_gate.v1` | `{ candidate_id, candidate_name, rank_score, reason, panel_consultation_id?, at }` — for security/legal/regulatory carve-outs |
| Member deprecated | `26.orchestra.deprecated.v1` | `{ member_id, basis, deprecated_at, grace_period_days }` |
| Lifecycle state changed | `26.orchestra.lifecycle_state_changed.v1` | `{ member_id, from_state, to_state, basis, at }` |
| Archived → Trial re-activation | `26.orchestra.candidate_reactivated.v1` | `{ candidate_id, candidate_name, prior_state: "archived", rank_score, capabilities[], reactivated_at, basis }` |

**Manual override + deprecation gate.** Auto-admission removes the human gate for *admission only*. The following decisions remain Panel + CEO gated per Locked Rule 13 and Locked Rule 17: **(a)** deprecation of a wired full-member adapter; **(b)** capability mapping changes for existing wired members; **(c)** carve-outs (any candidate with security/legal/regulatory exposure triggers `26.orchestra.candidate_panel_gate.v1` instead of auto-admission — Agent #11 + Agent #14 decide jointly).

Every admission writes a one-line entry to `docs/CANONICAL_HISTORY.md`
SECTION 8 + the pointer in §18.4 — preserving the §18 archive discipline
even when the decision is automated. Hash chain integrity preserved per §14.2.

**Seed evaluation list (CEO-supplied 2026-05-15, bootstrap input for Orchestra membership evaluation):** `orchestra-membership-executor` evaluates the 13 bootstrap candidates and emits `26.orchestra.candidate.v1` for each with `source = "ceo_seed_list_2026-05-15"`. Tier 1 (immediate evaluation): OpenAI Codex, Devin (Cognition Labs), Google Antigravity, Amazon Kiro, Google Jules, Windsurf/Cascade (Cognition Labs), GitHub Copilot Workspace. Tier 2 (monitor for admission, quarterly re-score): Bolt.new (StackBlitz), Taskade Genesis, Firebase Studio, Aider (OSS), OpenCode, Amazon Q Developer. Tier assignment governs queue priority; every candidate runs through the four-condition gate on its own merits. AWS-bound candidates (Kiro, Q Developer) MUST be evaluated by Agent #11 + Agent #14 for data-residency / vendor-lock-in / IP-protection carve-outs before passing the gate.

---

## 8a. SYSTEM OPERATION (within-step approval cadence — LOCKED to AUTOMATIC / GUIDED / MANUAL per CA-18 §6 ENTRY 019)

Per CA-18 §6 ENTRY 019, the System Operation axis labels are aligned to the global AUTOMATIC / GUIDED / MANUAL lock. The Rev-2 triad (Hands-On / Reviewed / Hands-Off) and the Rev-1 triad (Manual / Supervised / Autonomous) are retained as **historical aliases** for shipping continuity (audit-log payloads emitted under prior runs remain valid + queryable) but are NOT used in new canonical text, new audit-log payloads, or new dispatches.

| System Operation | Behaviour |
|---|---|
| **AUTOMATIC** | FlowAI operates end-to-end without intervention; pauses only on hard gates (severity `critical`, legal/safety flags, 95/95 failure). (Was "Hands-Off" in Rev-2; "Autonomous" in Rev-1.) |
| **GUIDED** | FlowAI acts; provider reviews each step output before proceeding to the next. (Was "Reviewed" in Rev-2; "Supervised" in Rev-1.) |
| **MANUAL** | Provider drives every decision; FlowAI proposes; provider approves/modifies/skips each step (per Sprint ARCH-1 approval flow). (Was "Hands-On" in Rev-2; "Manual" in Rev-1.) |

**Independence:** the §8 Tool Intelligence axis (which tool per step) and §8a System Operation axis (within-step approval cadence) are **independent axes**. Both use the same AUTOMATIC / GUIDED / MANUAL triad per CA-18 §6 global lock, but they govern different decisions. Any combination is valid — e.g. **MANUAL system operation + AUTOMATIC tool selection** means "provider drives every step-level decision, but each chosen step uses FlowAI's rank-#1 tool without re-asking which tool." The two-axis composition still produces 9 valid combinations.

**Disambiguation when referring to a mode.** When the context could refer to either axis, prefix the axis name: "AUTOMATIC tool selection" (§8) vs. "AUTOMATIC system operation" (§8a) vs. "AUTOMATIC iteration" (§3 of `docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md`). In single-axis contexts the bare label suffices.

---

## 9. THE 8-STEP PIPELINE (canonical from `src/lib/operationsEngine.js` STEPS)

| # | Key | Label | Step description |
|---|---|---|---|
| 1 | `research` | Research | Market analysis, product brief, audience + competitive intelligence |
| 2 | `design` | Design | Visual design, UX, layout, mobile responsiveness analysis |
| 3 | `build` | Build | Route coverage, navigation, broken links, form functionality |
| 4 | `qa_audit` | Quality Audit | **5-dimension scoring** (UI/UX, API, Logic, Business Value, Security Posture — per Sprint PROTECT-1 Phase 5). 95/95 threshold per dimension. |
| 5 | `deploy` | Deploy | HTTPS, load time, domain config, robots.txt, public accessibility |
| 6 | `govern` | Self-Renewal | Autonomous governance cycle — see §10 Self-Governance Layer. (Was "Govern & Heal" pre-ARCH-1; renamed.) |
| 7 | `gtm` | Go To Market | Demo readiness score, GTM risks, top fix before any prospect demo. Tied to 6-step Clearance Protocol (§11) for official launch sign-off. |
| 8 | `monitor` | Monitor | Final report — all findings compiled into clearance decision (0–50 scale per Locked Rule 3) |

Rev-1 listed pipeline steps as "1-Research, 2-Design, 3-Build, 4-Quality Audit, 5-Deploy, 6-Monitor, 7-Self-Renewal, 8-GTM" — that ordering was stale. The code-canonical ordering (Self-Renewal=6, GTM=7, Monitor=8) is canonical per backlog B5 (commit `0574d0d`). Rev-2 reflects code-wins.

**Step 3 Build targetMode parameter (CA-DELIVERY-DISTRIBUTION-GOVERNANCE):** native/mobile delivery uses a targetMode parameter on the existing Build step, not a new pipeline step. `targetMode ∈ {native, cross_platform, pwa_wrap}` and is selected by Tool Intelligence for the task and target class. This preserves the 8-step canon and Locked Rule 2; `build` remains the step key.

**Step 5 Deploy distribution-adapter registry (CA-DELIVERY-DISTRIBUTION-GOVERNANCE):** Deploy owns a metadata-driven `DISTRIBUTION_ADAPTER_REGISTRY` for Apple App Store, Google Play, Microsoft Store, Samsung Galaxy Store, web-app stores, and pluggable additional adapters admitted under the §8.1 auto-admission pattern. Store submission is an async distribution job with explicit status fields: `artifactProduced → operatorApproved → submissionInitiated → storeAccepted or storeRejected`. Step 5 completes at distribution handoff complete: artifact produced, operator approval captured, and submission initiated only after the operator-approval gate. Store outcome is never assumed; Step 8 Monitor tracks review outcome into ProductSSOT.

Required submission fields are `operatorConsent`, `credentialOwnership`, `artifactHash`, `storeTarget`, `submissionId`, and `postReviewStatus`. FlowAI may prepare, validate, package, and initiate submission only after the operator-approval gate. The gate holds even for auto-publish-on-submission stores. FlowAI NEVER autonomously publishes to a public store. No ninth step is created.

The operator-approval gate occurs BEFORE FlowAI calls any store submission API. FlowAI initiates submission; the store holds the publish decision. This applies to all distribution adapters, including stores that auto-publish on submission.

---

## 10. SELF-GOVERNANCE LAYER (NEW — gap #2 from Panel Q2, Sprint 5)

The Self-Governance Layer is what makes Level 2 ("FlowAI on Itself") and the `govern` step (#6) executable. It is the **earliest canonical sprint on record** (Sprint 5, October 2025). Rev-1 omitted it entirely; Rev-2 surfaces it explicitly per Panel Q2 + Slot 7 dissent.

### 10.1 Four governance components

| Component | Function | Trigger | Effect |
|---|---|---|---|
| **Self-Test** | Automated end-to-end functional baseline testing | On every run, daily at 03:00 (`scheduledSelfTest` per Sprint PROTECT-1 Phase 2), and on demand | Proves the FlowAI substrate (proxy + 3 entities at minimum) is operational; pass-rate feeds Platform Health Widget |
| **Self-Audit** | **Five-dimension scoring engine**: UI/UX, API, Logic, Business Value, Security Posture (Security Posture added Sprint PROTECT-1 Phase 5; originally 4 dimensions in Sprint 5) | Step 4 Quality Audit of any run | Each dimension scored 0–10 against 95/95 governance threshold; sub-6 Security Posture triggers Self-Protection sprint generation |
| **Self-Protect** | Snapshot + rollback infrastructure before any change | Pre-flight on every Auto Runner step that mutates state | Allows revert if 95/95 fails or Human Gate rejects — distinct from the *later* Self-Protection (anti-crawl, IP protection from Sprint PROTECT-1 — see §15) |
| **Self-Heal** | Automatic fix application for detected issues, gated by Human Gates per §11 | Step 6 Self-Renewal recommendation accepted (Approve/Modify) | Applies the fix; re-runs Self-Test to verify; emits before/after delta |

Plus: **Self-Optimize** (performance improvement cycle, targets dims below 8/10) and **Self-Upgrade** (version locking + upgrade management) — both Sprint 5.

**CA-15-A disposition (CEO Decision B, per ENTRY 017):** §10.1 stays at the **5 canonical dimensions** above. The v1/v2 proposals to extend §10.1 to 7 dimensions (adding Content Quality + Accessibility) are REJECTED. Content quality + accessibility checks live in tooling — `scripts/lint-content-quality.mjs` + `scripts/lint-accessibility.mjs` — consistent with the CA-15-B-Q3 tooling discipline at §28.6 and the CA-15-B-Q1 "purpose lives outside SSOT" disposition at §7.5. These tooling lints surface at PR-time as warnings; they do NOT contribute to §7.6 score and they do NOT participate in §10.1 Step 4 Quality Audit verdicts.

### 10.2 Four Human Gates (Sprint 5, canonical per ARCH-1 Approve/Modify/Skip flow)

| Gate | When | Decision space |
|---|---|---|
| **Review** | Before any agent action takes effect at a step boundary in GUIDED or MANUAL system operation (per CA-18 §6 ENTRY 019 §8a labels — was "Reviewed or Hands-On" pre-ENTRY-019) | Approve, Modify, Skip |
| **Approval** | At 95/95 evaluation outcome | Accept score, Re-run, Override (requires elevated role per §13) |
| **Testing** | After Self-Heal applies a fix; "Re-run Self-Test to Verify Fixes" button per Sprint HARD-1 | Confirm fix verified, Re-fix, Escalate |
| **Acceptance** | At end of pipeline, before clearance | Accept and Lock (triggers ClearanceProtocolPrompt automatically per Sprint HARD-1), Re-open step, Reject run |

The Human Gates **reconcile with §6's "every issue MUST be resolved"**: an issue is *resolved* when it reaches a terminal decision (Resolved / Human-gated terminal / Documented limitation per §6). Human Gates are the canonical decision-rendering mechanism for issues that are not auto-fixable. Human-in-the-loop is canonical; no automated bypass.

---

## 11. SIX-STEP PRODUCT CLEARANCE PROTOCOL (NEW — gap #5 from Panel Q1+Q6, Sprint 9)

The Clearance Protocol gates every product handed to FlowAI before declaring it "cleared." It is the authoritative clearance gate; not replaced in any later sprint. Surfaces:

- **Wizard:** `/clearance` (6-step UI, status indicators per step, overall clearance badge)
- **Entity:** `ClearanceRecord` (step-by-step progress tracking, AI-generated checklists per step)
- **Prompt:** `ClearanceProtocolPrompt` automatically appears after "Accept and Lock" in Auto Runner (Sprint HARD-1)
- **Inline tool:** added as fifth tool under Go To Market step (#7) in GUIDED + MANUAL modes (per CA-18 §6 ENTRY 019 lock; Sprint HARD-1)

| # | Step | Wizard label | What it gates |
|---|---|---|---|
| 1 | Governance Audit | "Governance Audit" | All four Self-Governance components green; 95/95 threshold met on every dimension |
| 2 | Launch Readiness | "Readiness" | Six readiness dimensions per Sprint 6 Phase 2 (see §16): infrastructure, dependencies, data model, env config, observability, rollback |
| 3 | White-Label | "White-Label" | No Base44 / FlowAI / vendor branding leaks in renewed output; per Sprint 6 Phase 1 |
| 4 | Data Export | "Data Export" | GDPR-compliant export sprint generated; data portability verified. **Per CA-10-E.3 (ENTRY 005):** export now includes the **full ProductSSOT row content** (all six blocks per §7.5 + annotations + overrides + version history) as a structured JSON payload. Provider's `client`-role end-customers can request their own data subset via standard data-portability flow — export filters ProductSSOT contents to entries authored by or about the requesting end-customer. Optional second format: portable JSON manifest that another FlowAI instance can import to bootstrap an existing-product context (manifest format canonicalised in `docs/specs/PRODUCT_SSOT_PORTABILITY.md` — separate engineering-spec dispatch). |
| 5 | Demo Readiness | "Demo" | Synthetic-data demo microsite generates; guided tour script renders; per Sprint 7 Demo Builder |
| 6 | Final Sign-Off | "Final Sign-Off" | All previous 5 steps cleared; human acceptance gate; clearance badge emitted |

Each step's status, evidence, and timestamps are recorded in `ClearanceRecord`. Clearance is **per product, per environment** — clearing a product in `staging` does not clear it in `prd`.

### 11.7 Redesign/Build approval gate (CA-16-B-Q3 canonical per ENTRY 015)

For any operator-initiated redesign or build/wire session, operators MAY steer (initiate session, modify proposals, constrain scope, veto changes); **only admin role (per §13) MAY approve final implementation** (transition from `operator_steered` → `implementation_in_progress`). CA-16-B as a broader Redesign/Build Environment design question is WITHDRAWN per ENTRY 020; this admin-only approval gate from ENTRY 015 remains unchanged.

Conformance-test acceptance criterion (RB-7 canonical): invoking approval-transition with `operator` role MUST return HTTP 403; only `admin` role MAY transition. Verified by deliberate-failure injection test at engineering dispatch.

This gate remains load-bearing for Stage 3 build/wire (per Path H ENTRY 014) regardless of the withdrawn broader CA-16-B design question.

---

## 12. REMEDIATION MODES — WIRED TO 8-STEP PIPELINE (gap #6 from Panel Q1)

Rev-1 listed remediation modes generically without integration. Rev-2 wires each to specific pipeline steps and per-issue invocation per Panel Q1 + Slot 3/5 dissent.

| Mode | Status | Active at pipeline step(s) | Invoked when |
|---|---|---|---|
| **(i) Recommend-only** | Active default | Steps 1 (research), 4 (qa_audit), 6 (govern), 8 (monitor) | Always — every issue starts here; produces `3.renewal.candidate.v1` |
| **(ii) Code-generation as PR** | **Deferred** (Panel verdict Q3 PLURALITY_(c), Slots 3/4/6 ENGAGED, 2026-05-14) | (deferred) | (deferred) |
| **(iii) Direct-write to user source** | **Deferred** (same verdict) | (deferred) | (deferred) |
| **(iv) Fork-and-fix via Orchestra** | Active | Step 6 (govern) + invocable from /api/renew.js | Issue is autoFixable AND severity ∈ {`medium`, `low`} AND no human gate triggered |

Issue → mode routing per `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §4.4:
- `critical` severity → never auto-deploy; emit candidate + plan; `requires_human_gate=true`
- `high` severity → never auto-deploy; emit candidate + plan; `requires_human_gate=true` (human Approves/Modifies/Skips)
- `medium` severity → fork-and-fix auto-deploy in fork-and-fix mode
- `low` severity (not currently emitted by issueDetector) → fork-and-fix auto-deploy

Build-failure backoff: 2 consecutive build_failed events on same productId within 24h disable fork-and-fix and revert to recommend-only. See §13 GovernanceAuditLog for emission topic.

---

## 13. AUTHENTICATION + ROLE MODEL (NEW — gap #10 from Panel Q6, Sprint 7.5a)

| Role | Capabilities | Defined |
|---|---|---|
| **admin** | Full read/write; provisions providers; manages billing; overrides 95/95; rotates credentials; signs off on Final Sign-Off (Step 6 of Clearance) | Sprint 7.5a UserRole entity |
| **operator** | Run pipelines, propose fixes, run Clearance steps 1–5; cannot override 95/95 or sign off on Step 6; cannot manage billing | Sprint 7.5a UserRole entity |
| **client** | Read-only on their own product runs; cannot run pipelines; sees redacted audit log | Sprint 7.5a UserRole entity |

**Authentication source:** Base44 auth enabled Sprint 7.5a (all pages require login). Public surface: `/` (Landing), `/terms-of-use`, `/privacy-policy`. Session security: XOR cipher for sessionStorage, 8-hour expiry (Sprint PROTECT-1 Phase 1). Bot detection on login per Sprint PROTECT-1 Phase 1.

**URL Whitelist entity** (Sprint 7.5a): governance-session targeting — admins specify which URLs operators can run pipelines against. Enforced in Auto Runner before dispatch.

**Role gates on Human Gates (§10.2):**
- Review Gate: operator or admin
- Approval Gate (95/95 score): admin only (operator can Re-run but not Override)
- Testing Gate: operator or admin
- Acceptance Gate (Accept and Lock): admin only

### 13.1 ProductSSOT role gates (per CA-10-C / ENTRY 005)

Per CA-10-C, the ProductSSOT (§7.5) human-editable layer has its own role gate matrix. Enforced via Supabase RLS on the `product_ssot` table per §14.3 multi-tenant invariant; the operator policy's `WITH CHECK` clause restricts mutation to the `annotations` jsonb array only.

| Role | `annotations` | `overrides` | `architecture_snapshot` | `governance_record` | `delta_log` |
|---|---|---|---|---|---|
| `admin` | Read + write (full) | Read + write (full) | Read; can annotate but cannot mutate the auto-snapshot | Read; can annotate; cannot override governance records | Read; can annotate per entry; **can override per entry** |
| `operator` | Read + **append-only** | Read-only | Read | Read | Read; can annotate per entry |
| `client` | Read-only | Read-only | Read | Read | Read |

**UI surface (per CA-10-C.2):** new page **`/product-ssot/:productId`** renders the ProductSSOT in a structured view: identity-block header (read-only) · build-brief (collapsible, annotatable) · architecture-snapshot (collapsible per sub-section, annotatable) · delta-log + governance-record (reverse-chronological tables; click row → expanded view with inline annotation editor for admin/operator) · annotations sidebar (filter by block / author / tag) · overrides admin-only tab (lists original auto-generated content vs admin replacement + rationale).

**Override semantics:** admin selects any auto-generated entry → "Override" → modal with original content + editable replacement + required rationale → submission appends an `override_entry` to `overrides[]` (admin userId, originalContentRef, replacementContent, rationale). Overrides are append-only — a later override "undoes" a prior override by writing a new `override_entry` whose `replacementContent` restores the original (audit trail preserved). Subsequent pipeline runs honour overrides per §28 (symbiotic feed-back loop).

---

## 14. GOVERNANCEAUDITLOG (NEW — gap #11 from Panel Q6, Sprint HARD-1)

A **tamper-evident** log of every action. Append-only, hash-chained. Surfaced at `/audit-trail` (read-only, reverse-chronological, filterable by product / action type / mode). Linked in Settings sidebar section.

### 14.1 Topics logged (silent background logger)

| Topic | Source | Fields |
|---|---|---|
| `session_started` | AUTOMATIC / GUIDED / MANUAL session launch (per CA-18 §6 ENTRY 019 lock) | sessionId, productId, mode, input, at, who |
| `step_completed` | Each of 8 pipeline steps | sessionId, stepKey, outcome, at, agentId, scoreBreakdown |
| `proposal_approved` | GUIDED/MANUAL Approve action (per CA-18 §6 ENTRY 019 lock) | sessionId, stepKey, who, proposal, at |
| `proposal_modified` | GUIDED/MANUAL Modify action (per CA-18 §6 ENTRY 019 lock) | sessionId, stepKey, who, before, after, rationale, at |
| `proposal_skipped` | GUIDED/MANUAL Skip action (per CA-18 §6 ENTRY 019 lock) | sessionId, stepKey, who, reason, at |
| `findings_approved` | Findings feedback loop accept | sessionId, stepKey, findings, who, at |
| `fix_applied` | Self-Heal or fork-and-fix execution | sessionId, productId, issueId, mode, beforeHash, afterHash, deploymentId, at |
| `fix_skipped` | Human Gate Skip with reason | sessionId, issueId, reason, who, at |
| `clearance_*` | Clearance Protocol step events | clearanceRecordId, stepNumber, outcome, evidence, who, at |
| `w03_self_audit_*` | Per-turn W03 compliance probe | turnId, agent3Verdict, panelLiteCount, at |
| `panel_decision_*` | Panel consultation outcomes | consultationId, threshold, engagedCount, verdict, dissent, at |
| `agent_rollback_*` | Agent de-registration / dormant flip | agentId, reason, who, at |
| `phase_rollback_*` | Phase-level rollback (git revert + Vercel canary back) | phaseId, gitTag, vercelDeploymentId, who, at |
| `tenant_isolation_*` | Per-product Supabase RLS deny-all toggle | productId, reason, restoreAt?, who, at |
| `3.renewal.*` (candidate / applied / delta / build_failed / disabled) | Agent #3 events per §12 + spec §3.2 | varies per topic |
| `panel_w03_compliance_review_*` | Panel-lite review of an AMBER/RED W03 turn | turnId, threshold, verdict, at |
| `executor_registered.v1` (CA-7 M5) | Server startup + nightly drift-detection cron | executorKey, agentId, mode, authority, consumes, produces, at |
| `agent.execution.reject_executor_via_hub.v1` (CA-7 M3) | OrchestratorHub guard — emitted if any caller attempts to route to an executor via `invokeStepOwner()` | callerStack, executorKey, attemptedStepKey, at |
| `executorKey` field (cross-cutting, CA-7 M2) | Every audit-log row emitted by an executor adds `executorKey: string` to disambiguate from primary-agent events. Backwards-compatible: existing topic names unchanged; new field appears alongside existing fields. The `fix_applied` topic is the canonical existing row where `executorKey` is most useful (Self-Heal vs fork-and-fix executor disambiguation). | varies per topic |

### 14.2 Tamper-evidence

Hash chain: each row stores `prevHash` = `sha256(prevRow.serializedFields)`. The Audit Trail page surfaces broken-chain warnings if any row's recomputed hash diverges. Cold-store snapshot nightly to a separate Supabase project for off-system durability.

### 14.3 Retention + RLS

- Retention: 365 days hot in Supabase + 7 years cold snapshots (compliance-driven; aligns with E7 currency commitment + GDPR retention norms).
- RLS: a row is visible to (a) the owning provider org for their own productIds, (b) the admin role within their org, (c) the FlowAI-internal audit role across all rows. Service-role-only writes.
- **ProductSSOT retention** (per CA-10-E / ENTRY 005): same 365-day hot + 7-year cold pattern as GovernanceAuditLog. Cold snapshots include the full jsonb blocks (identity_block, build_brief, architecture_snapshot, delta_log, governance_record, annotations, overrides) + version history (`product_ssot_version` table). PII-scrub applies on every write of customer-sourced content per CA-10-E.2: `scrubCredentials()` (per `src/lib/renewal/inputArtifact.js`) is extended to also strip email addresses, phone numbers (E.164 + US/Intl), credit-card patterns (Luhn-validated), government ID patterns (SSN/NIN/NHS-number/etc.), and customer self-identified names ("My name is..." heuristic). Scrub is applied on every write path that touches `delta_log_entry.issue.evidence` or `annotation_entry.text` where the source is a customer-feedback channel. Admin/operator authoring annotations is NOT scrubbed (assumed-trusted authoring context — same trust model as §13). Provider data-portability export per §11 Step 4 includes the full ProductSSOT (CA-10-E.3).

---

## 15. THE 26-AGENT ROSTER (gap #15 — Slot 3/6/8 dissent on roles + Orchestra wiring; updated CA-9-B / ENTRY 005)

All 26 agents (was 25 prior to CA-9-B / ENTRY 005) are proprietary VEU IP. All ship dormant at `recommend_only` per Sprint 5 governance pattern unless a later canonical row says otherwise. OrchestratorHub wire-in **per-agent** as each ships; the original Rev-1 "wire-in only after all 25 built" was overly restrictive and Panel-flagged. CA-9's historical Agent #26 Orchestra Research charter is superseded in active §15.1 by ENTRY 023: Agent #26 is Legal & Communications, while Orchestra membership lifecycle ownership moves to `orchestra-membership-executor` in §15.5.

### 15.1 Roster (canonical per `src/lib/agents/BaseAgent.js`)

| # | Agent | Mode | Step (if step-owner) | Embedding | Status |
|---|---|---|---|---|---|
| 1 | Lifecycle Engine | step-owner | 1 research | embedded | SHIPPED-GREEN (commit `d712993`) |
| 2 | Code Builder | step-owner | 3 build | embedded | SHIPPED-GREEN (commit `fdd3863`) — server-side only (node:crypto) |
| 3 | Self-Renewal | step-owner | 6 Self-Renewal | embedded | SHIPPED-GREEN (commit `68a0c75`); fork-and-fix graduation spec drafted at `docs/specs/SELF_RENEWAL_AGENT_SPEC.md`. Per CA-9-C + CA-10-B (ENTRY 005): consumes `10.customer.issue.v1` with new `customerReportedIssues` heuristic (1-2 reports/24h → medium; 3-9 → high; ≥10 → critical). Per CA-10-B: produces new topic `3.ssot.delta.v1` (delta_log entry written to ProductSSOT post-Approve/auto-deploy via the Self-Renewal Executor per CA-7 §15.5). |
| 4 | Provider Onboarding | step-owner | (commercial layer) | flowai-only | PARTIAL — executor code exists; Stripe Connect deployment incomplete per §3 + Panel ruling FA-Q1 (commit `708e59d`) 2026-05-16. Original landing commit `5006431`. |
| 5 | End-Customer Intake | step-owner | (commercial layer) | flowai-only | SHIPPED-GREEN (commit `2fff449`) |
| 6 | Research | step-owner | 1 research (collab w/ #1) | embedded | DORMANT — block-semantic on content-insufficient already wired (commit `0fc8851`) |
| 7 | Design | step-owner | 2 design | embedded | DORMANT |
| 8 | Quality Audit | step-owner | 4 qa_audit | flowai-only | DORMANT — owns the 5-dimension scoring engine per §10 |
| 9 | Go-to-Market | step-owner | 7 gtm | embedded | DORMANT |
| 10 | Monitor | step-owner | 8 monitor | embedded | DORMANT. Per CA-9-C (ENTRY 005): charter expanded to ingest three customer signal channels — in-app "Report an issue" widget (POST `/api/customer/feedback`); app-store / public review scraping via `orchestra.dispatch('crawl', ...)`; support-ticket webhooks at `/api/customer/support-ticket-webhook` (Zendesk / Intercom / Help Scout). CA-DELIVERY-DISTRIBUTION-GOVERNANCE adds a fourth signal channel: store-review-status outcomes from distribution adapter submissions, written to ProductSSOT. Produces `10.customer.feedback.v1` (normalised, de-duped, sentiment-tagged) + `10.customer.issue.v1` (issues mapped to issueDetector categories). Per CA-10-B: also produces `10.ssot.updated.v1` for ProductSSOT writes (architecture_snapshot drift; customer-signal governance_record entries). |
| 11 | Strategic Intelligence | cross-step | — | flowai-only | DORMANT — feeds continuous marketplace intelligence per Locked Rule 16. Per CA-9-B (ENTRY 005): primary charter function expanded to **global AI-platform discovery** — owns the curated industry-tracker URL list. `11.platform.discovery.v1` and its consumption by `orchestra-membership-executor` are CANONICAL-CHARTER topics, not yet WIRED in `_registry.ts` or `MessageSchema.js` at code base `19c554b` (where #11 currently produces `11.brief.weekly.v1`, `11.alert.material.v1`, and `11.trajectory.report.v1`). Agent #11 remains `recommend_only`; it has no registry mutation, CANONICAL_HISTORY write, or `auto_write_internal` authority. |
| 12 | Portfolio Risk | cross-step | — | flowai-only | DORMANT |
| 13 | Self-Protection (anti-crawl / IP) | always-on | — | embedded | DORMANT — distinct from Sprint 5's snapshot/rollback Self-Protect; covers DMCA, clone detection, edge defense, scraper blocking, Cloudflare Bot Management, watermarking per Sprint PROTECT-1 |
| 14 | Public Policy | cross-step | — | flowai-only | DORMANT |
| 15 | Benchmarking | cross-step | — | embedded | DORMANT — feeds Orchestra ranking updates per Locked Rule 16. Per CA-9-B (ENTRY 005): primary charter function expanded to **continuous head-to-head scoring** of Orchestra candidates vs existing members; schedules benchmark runs on the 8 pipeline steps × each candidate capability (rolling 30-invocation minimum per (candidate × capability)); produces `15.benchmark.head_to_head.v1`. |
| 16 | Productivity / HR | cross-step | — | flowai-only | DORMANT |
| 17 | Product Evolution | always-on | — | embedded | DORMANT — feeds Orchestra ranking + marketplace intelligence per Locked Rule 16. Per CA-9-B (ENTRY 005): primary charter function expanded to **Orchestra composition recommendation + deprecation proposals** — consumes benchmark signals; produces `17.orchestra.deprecation_proposal.v1` (basis ∈ `sustained_low_rank` \| `high_error_rate` \| `capability_obsoleted`); surfaces "add candidate X" or "deprecate member Y" recommendations to `orchestra-membership-executor` + CEO via Self-Renewal Alert cadence. |
| 18 | Business Planning | cross-step | — | flowai-only | DORMANT |
| 19 | Technological Evolution | cross-step | — | embedded | DORMANT |
| 20 | Environmental Impacts | cross-step | — | embedded | DORMANT |
| 21 | Ops Runner Alpha — **Aggressive Crawl Conductor** (per ENTRY 006, Panel `05ac6f4` 7×UNANIMOUS + CEO arbitration Q6=(c)) | step-owner | (cross-step within step 1 research + step 8 monitor — Aggressive Crawl Engine phase) | embedded | DORMANT (charter ratified; engineering wire-in pending). Authority **`[recommend_only, auto_write_internal, requires_human_gate]`** (dual + gate matching the executor authority pattern used by `self-renewal-executor` and `orchestra-membership-executor`). Owns the full-site spider with click + modal + AI-probe + viewport + auth + error-trigger passes per §6 + Aggressive Crawl Engine spec `docs/specs/AGGRESSIVE_CRAWL_ENGINE_SPEC.md` (commit `5b30dce`). Consumes: `1.crawl.request.v1`, `10.ssot.updated.v1`. Produces: `21.crawl.completed.v1`, `21.issues.detected.v1`, `21.gtm.readiness.v1` + writes to ProductSSOT `architecture_snapshot` + `governance_record` (kind `gtm_readiness_score`). Required credentials: `BROWSERLESS_API_KEY`, `ANTHROPIC_API_KEY`. Marketplace tools: `playwright`, `browserless`, `anthropic-api`. Escalation: `xss-in-form-echo` or `auth-gate-leak` detected → IMMEDIATE admin gate (security-critical); crawl budget exceeded → `crawl_overflow_target_tbd` pending Agent #21 build dispatch; 3 consecutive crawl failures on same product → disable crawl for that product 24h. Per CA-14-A-Q3 (ENTRY 015 ratification, SUPERMAJORITY 8/10): Agent #21 ACE Conductor owns **Phase B Adversarial Surface Testing** as a canonical extension of its ENTRY 006 charter. Phase B is distinct from Phase A (per Locked Rule 19 below): Phase A = surface verification owned by §6 detector set; Phase B = interactive adversarial verification owned by Agent #21 via authenticated multi-page traversal + click-everything pass + adversarial prompt-injection probes against AI-agent surfaces + error-state interactive triggers. Phase B emits its own `phase_b_pass` boolean + finding list shaped identically to §7.6 finding envelope. Required credentials remain `BROWSERLESS_API_KEY` + `ANTHROPIC_API_KEY` as for Phase A; no new credentials added. Implementation reference: D39-D41 W5a arc (`90210d0` → `ed0d779`); canonical text now matches code per Locked Rule 1. |
| 22 | Finance & Procurement | step-owner | (business advisory; not §9 Forge-pipeline step-owner) | embedded | ROSTERED + IMPLEMENTED in `AGENT_REGISTRY` at code base `19c554b`; authority `[recommend_only]`; required credentials `[]`; not WIRED, not RUNTIME_ACTIVE, not PRODUCTION_VERIFIED; DORMANT runtime posture unless evidence proves otherwise. |
| 23 | HR & Compensation | step-owner | (business advisory; not §9 Forge-pipeline step-owner) | embedded | ROSTERED + IMPLEMENTED in `AGENT_REGISTRY` at code base `19c554b`; authority `[recommend_only]`; required credentials `[]`; not WIRED, not RUNTIME_ACTIVE, not PRODUCTION_VERIFIED; DORMANT runtime posture unless evidence proves otherwise. |
| 24 | Information Security | step-owner | (business advisory; not §9 Forge-pipeline step-owner) | embedded | ROSTERED + IMPLEMENTED in `AGENT_REGISTRY` at code base `19c554b`; authority `[recommend_only]`; required credentials `[]`; not WIRED, not RUNTIME_ACTIVE, not PRODUCTION_VERIFIED; DORMANT runtime posture unless evidence proves otherwise. |
| 25 | Customer Care | step-owner | (business advisory; not §9 Forge-pipeline step-owner) | embedded | ROSTERED + IMPLEMENTED in `AGENT_REGISTRY` at code base `19c554b`; authority `[recommend_only]`; required credentials `[]`; not WIRED, not RUNTIME_ACTIVE, not PRODUCTION_VERIFIED; DORMANT runtime posture unless evidence proves otherwise. |
| 26 | Legal & Communications | step-owner | (business advisory; not §9 Forge-pipeline step-owner) | embedded | ROSTERED + IMPLEMENTED in `AGENT_REGISTRY` at code base `19c554b`; authority `[recommend_only]`; required credentials `[]`; not WIRED, not RUNTIME_ACTIVE, not PRODUCTION_VERIFIED; DORMANT runtime posture unless evidence proves otherwise. Under this charter, Agent #26 requires no credentials; CB3 commit `add09d0` removing Agent #26 from `ANTHROPIC_API_KEY` and `BROWSERLESS_API_KEY` credential catalog entries is canonically consistent after ENTRY 023. |

Partition at code base `19c554b`: **8 FlowAI-internal-only** (#4, #5, #8, #11, #12, #14, #16, #18) + **18 embedded** (#1, #2, #3, #6, #7, #9, #10, #13, #15, #17, #19, #20, #21, #22, #23, #24, #25, #26). Agents #22–#26 have registry mode `step-owner` and are embedded per `BaseAgent.js`, but are business-advisory agents, NOT §9 Forge-pipeline step owners; §9 Forge-pipeline runtime step-owner path remains Agents #6–#10. Compile-time validator in `BaseAgent.js` enforces exactly **26** unique IDs (was 25 prior to CA-9-B / ENTRY 005).

### 15.2 Interaction model (gap #15)

Three contract layers connect agents:

1. **`MessageBus`** (`src/lib/agents/MessageBus.ts`) — pub/sub for inter-agent topics. Each agent declares its `consumes[]` and `produces[]` topics in its charter. Topics conform to `MessageSchema.js` (**65 topic constants** post-ENTRY 006 — was 61 prior to ENTRY 006; was 40 prior to ENTRY 005). Example: Agent #3 consumes `8.audit.completed.v1`, `10.anomaly.v1`, `17.evolution.proposal.v1`, `10.customer.issue.v1` (per CA-9-C); produces `3.renewal.candidate.v1` plus (per §12) `3.renewal.applied.v1`, `3.renewal.delta.v1`, `3.renewal.build_failed.v1`, `3.renewal.disabled.v1`, plus `3.ssot.delta.v1` (per CA-10-B).

**Topics added in ENTRY 005 (CA-9 + CA-10) — 21 total new constants:**

- **CA-9-A Orchestra self-expansion (7):** `26.orchestra.candidate.v1`, `26.orchestra.admitted.v1`, `26.orchestra.candidate_rejected.v1`, `26.orchestra.candidate_panel_gate.v1`, `26.orchestra.deprecated.v1`, `26.orchestra.lifecycle_state_changed.v1`, `26.orchestra.candidate_reactivated.v1`.
- **CA-9-B agent-charter expansions (4):** `community.signal.v1`, `11.platform.discovery.v1`, `15.benchmark.head_to_head.v1`, `17.orchestra.deprecation_proposal.v1`, `vendor.changelog.poll.v1`.
- **CA-9-C customer feedback loop (5):** `customer.feedback.raw.v1`, `customer.review.scraped.v1`, `customer.support.ticket.v1`, `10.customer.feedback.v1`, `10.customer.issue.v1`.
- **CA-10-B ProductSSOT auto-update (4):** `3.ssot.delta.v1`, `10.ssot.updated.v1`, `10.ssot.annotation.v1`, `clearance.ssot.step.v1`.

(7 + 5 + 5 + 4 = 21; 40 + 21 = 61.)

**Topics added in ENTRY 006 (Aggressive Crawl Engine) — 4 new constants:**

- **ENTRY 006 Aggressive Crawl (4):** `1.crawl.request.v1` (consumed by Agent #21; emitted by AutoRunner / Agent #6 / `/api/agent/21/run-aggressive-crawl`), `21.crawl.completed.v1` (produced by Agent #21 on run completion), `21.issues.detected.v1` (produced by Agent #21 with the full issue list per §6 detector set), `21.gtm.readiness.v1` (produced by Agent #21 with the §7.6 GTM Readiness Report score + bands).

(21 + 4 = 25 net new since ENTRY 005 cohort; 40 + 21 + 4 = **65** total.)

2. **`OrchestratorHub`** (`src/lib/agents/orchestrator/OrchestratorHub.ts`) — registers step-owner agents and routes the `invokeStepOwner(stepKey, ctx)` call to the agent registered for that step. Used by `AutoRunner.jsx` at every step boundary. Returns the agent's canonical step-owner envelope. **OrchestratorHub is the agent-side controller; it is distinct from the Orchestra (§8) which is the tool-side adapter set.**

3. **`AgentRegistry`** (`src/lib/agents/_registry.ts`) — single source of truth for agent metadata: id, name, mode, step, authority, requiredCredentials, consumes/produces, escalationPolicy. Loaded by `BaseAgent.charter()` via `getAgent(id)`.

### 15.3 OrchestratorHub ↔ Orchestra relationship (gap #1 from Panel Q1+Q6)

Two distinct concerns, both essential:

| | OrchestratorHub | The Orchestra |
|---|---|---|
| Scope | **Agent dispatch** | **External tool dispatch** |
| File | `src/lib/agents/orchestrator/OrchestratorHub.ts` | `src/lib/orchestra/index.js` + `member.js` + per-adapter files |
| Boundary | Internal to FlowAI's contract layer | Wraps external SaaS / API providers (Claude Code, Vercel, Browserless, etc.) |
| Returns | Step-owner envelope (`{ agent_id, mode, step, authority, recommendation, ... }`) | `MemberResult` (`{ ok, action, member, data?, error?, deferred? }`) |
| Who calls it | `AutoRunner.jsx` step boundaries; cross-agent invocation | Agents (e.g. Agent #3 dispatches `code-patch` via Orchestra during fork-and-fix); user-facing pickers per `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` |
| Ranked? | No — agents are step-owner-locked or cross-step by charter | Yes — Locked Rule 18 ranking; 10 members |

Mental model: OrchestratorHub is the orchestra **conductor**; the Orchestra is the orchestra's **instruments**. An agent (musician) is given a step (movement) by the conductor; the agent then picks an instrument (Orchestra adapter) to execute its move.

### 15.4 Agent → Orchestra wiring (concrete examples)

| Agent | Orchestra dispatch usage |
|---|---|
| Agent #1 Lifecycle | none direct — emits envelope only |
| Agent #2 Code Builder | `dispatch('code-patch', ...)` for inline build patches; `dispatch('generate-from-scratch', ...)` for greenfield |
| Agent #3 Self-Renewal | (recommend-only path) — none; (fork-and-fix path, post-graduation) `dispatch('code-patch')` + `dispatch('generate-from-scratch')` + `dispatch('deploy')` + `dispatch('crawl')` for verification |
| Agent #6 Research | `dispatch('crawl', { url })` + `dispatch('analyze', { ... })` |
| Agent #7 Design | `dispatch('design', { spec })` → v0 / Lovable / Base44 |
| Agent #8 Quality Audit | `dispatch('analyze', { rubric })` + `dispatch('score', ...)` + `dispatch('interact', { url })` |
| Agent #10 Monitor | `dispatch('crawl')` + `dispatch('analyze')` |
| Agent #13 Self-Protection | `dispatch('interact')` for surface probing; otherwise emits audit-log events |

Orchestra dispatch is always wrapped by the BaseAgent guard layer; the agent owns the authority + audit-log discipline.

### 15.5 EXECUTOR_REGISTRY (split-charter sibling namespace)

The **EXECUTOR_REGISTRY** is a sibling namespace to `AGENT_REGISTRY` in
`src/lib/agents/_registry.ts`. It holds charters for **executors** —
elevated-authority counterparts to existing primary agents whose authority
profile would otherwise break the canonical RECOMMEND_ONLY-dominant
26-agent partition (per §25 Locked Rule 2). Executors share a charter id
with a primary agent (e.g. id=3 for the Self-Renewal Executor) but carry
distinct `mode` and `authority` arrays.

**Why a sibling namespace (and not an extension of AGENT_REGISTRY):**

- The 25-ID partition + single-authority-per-charter invariant in
  `BaseAgent.js` are preserved because executors never enter
  `AGENT_REGISTRY`, never collide with `BY_ID`, and never affect
  `validateRoster()`.
- Putting executors inside `AGENT_REGISTRY` would either duplicate id=3
  (violating partition uniqueness) or expand the roster to 26+ (violating
  Locked Rule 2).
- The sibling namespace + independent validator + `getExecutor()` lookup
  is the canonical pattern for any future split-charter agent
  (CEO disposition Q2 = (b) SPLIT, 2026-05-14; W6 Run 2 ratification
  2026-05-14T23:27:05Z).

**Canonical type contract** (per `src/lib/agents/_registry.ts`):

```ts
export interface ExecutorRecord {
  readonly key: string;                       // unique identifier within EXECUTOR_REGISTRY
  readonly agentId: number;                   // the primary agent this executor extends (1..26)
  readonly name: string;                      // human label, e.g. "Self-Renewal Executor"
  readonly mode: 'cross-step';                // executors MUST declare 'cross-step' (never step-owner)
  readonly authority: readonly AuthorityLevel[];
  readonly requiredCredentials: readonly string[];
  readonly consumes: readonly string[];
  readonly produces: readonly string[];
  readonly escalationPolicy: string;
}
```

**Lookup API:**
- `getExecutor(key: string): ExecutorRecord | undefined` — look up by unique key.
- `listExecutors(): readonly ExecutorRecord[]` — enumerate all registered executors.
- `getAgent(id)` and `getExecutor(key)` are **distinct namespaces**; a class
  must source its charter from exactly one of them.

**Validator invariants** (target contract for future executor implementation; at code base `19c554b`, `orchestra-membership-executor` is canonical-only and not yet enforced by code `validateExecutors()`):

1. Every executor `key` is a unique non-empty string.
2. Every executor `agentId` is an integer in `[1, 26]` AND exists in
   `AGENT_REGISTRY` (cross-link referential integrity — see Mitigation
   M1 below).
3. Every executor `mode` is `'cross-step'`. Executors MUST NOT register
   as `'step-owner'` or `'always-on'`.
4. If executor `authority` includes `'auto_write_internal'`, it MUST
   also include `'requires_human_gate'`.
5. The OrchestratorHub's `invokeStepOwner(stepKey, ctx)` never resolves
   to an executor — executors are only invocable out-of-band via
   `/api/agent/<id>/execute` + the Inngest job runner.

**Current population (3 executors as of CA-13 sliver per ENTRY 017):**

| key | agentId | name | mode | authority | invoked via |
|---|---|---|---|---|---|
| `self-renewal-executor` | 3 | Self-Renewal Executor | `cross-step` | `auto_write_internal`, `requires_human_gate` | `/api/agent/3/execute` + Inngest job |
| `crawl-write-executor` | 21 | Crawl-Write Executor (CA-13 sibling per ENTRY 017) | `cross-step` | `auto_write_internal`, `requires_human_gate` | `/api/agent/21/execute` + Inngest job |
| `orchestra-membership-executor` | 26 | Orchestra Membership Executor (CA-13 sibling per ENTRY 017 — `membership` rename adopted over v3-draft `admission`; semantics align with §8.1 full lifecycle Trial / Probation / Full / Deprecated / Archived) | `cross-step` | `auto_write_internal`, `requires_human_gate` | canonical executor entry only; runtime implementation and production verification are not claimed by ENTRY 023 |

`self-renewal-executor` consumes: `3.renewal.candidate.v1` (emitted by the primary Agent #3).
`self-renewal-executor` produces: `3.renewal.applied.v1`, `3.renewal.delta.v1`,
`3.renewal.build_failed.v1`, `3.renewal.disabled.v1` (per
`docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §3.2).

`crawl-write-executor` consumes ACE crawl outputs (per §6 + ENTRY 006 + §15.1 row 21); produces ProductSSOT `architecture_snapshot` + `governance_record kind:'gtm_readiness_score'` writes during the Aggressive Crawl Engine pass per CA-14-D-Q1 ENTRY 015 atomic-audit-write invariant. Required credentials: `BROWSERLESS_API_KEY`, `ANTHROPIC_API_KEY`. Escalation: critical/high finding → admin gate; cost-budget exceeded → `crawl_overflow_target_tbd` pending Agent #21 build dispatch; 3 consecutive failures → disable 24h.

`orchestra-membership-executor` consumes: `community.signal.v1`, `11.platform.discovery.v1`, `15.benchmark.head_to_head.v1`, `17.orchestra.deprecation_proposal.v1`, `vendor.changelog.poll.v1`. Produces the 7 stable `26.orchestra.*` topics enumerated in §8.1 (candidate lifecycle state changes, admissions, rejections, Panel gates, deprecations, and reactivations). Required credentials: `ANTHROPIC_API_KEY`, `BROWSERLESS_API_KEY`; do not remove executor credentials when Agent #26's business-advisory charter has no required credentials. Escalation: 4-condition auto-admission gate failure → Panel + CEO per Locked Rule 13. This entry assigns canonical ownership only; it does not claim the executor is runtime-active or production-verified at code base `19c554b`.

**Cross-link with §14 GovernanceAuditLog:** every audit-log row written
by an executor MUST include an `executorKey` field disambiguating from
primary-agent events. See §14 amendment in CA-7.4.

**Cross-link with §15.1 Roster table:** the primary Agent #3 row in the
26-agent roster now optionally references its executor key(s) under an
`executors[]` column for discoverability. Adding a row to
`EXECUTOR_REGISTRY` without adding the corresponding entry to the
primary agent's `executors[]` causes `validateExecutors()` to throw.

**Five Panel-ratified mitigations binding on engineering dispatch (per CA-7.3 + W6 Run 2 Q3):**

| ID | Mitigation | Implementation locus |
|---|---|---|
| **M1** Cross-link AGENT_REGISTRY ↔ EXECUTOR_REGISTRY | `AgentRecord` gains optional `executors: readonly string[]`; `validateExecutors()` cross-checks bidirectionally | `src/lib/agents/_registry.ts` |
| **M2** Audit-log `executorKey` field + `.executor.` topic prefix | Every executor audit-log row carries `executorKey`; new topics `executor_registered.v1`, `agent.execution.reject_executor_via_hub.v1` | §14 schema (see CA-7.4 ripple); `Agent3SelfRenewalExecutor.js` writes `executorKey` |
| **M3** Executor mode + authority constraints (validator-enforced) | Validator rejects non-`cross-step` mode; requires `requires_human_gate` whenever `auto_write_internal` is declared; OrchestratorHub `invokeStepOwner()` MUST NEVER resolve to an executor | `_registry.ts` `validateExecutors()`; `OrchestratorHub.ts` add reject path |
| **M4** SSOT §15.5 documentation + admin discoverability | This §15.5 + admin diagnostics UI exposing `listExecutors()`; explicit "SPLIT-CHARTER EXCEPTION" labelling on executor charter headers (already present in `_registry.ts`) | this §; `src/pages/Settings/AdminDiagnostics.jsx` |
| **M5** Drift detection: startup + nightly `executor_registered.v1` audit events | Every server start emits one `executor_registered.v1` per registered executor; nightly cron re-emits to surface drift; tamper-evident via §14.2 hash chain | `.github/workflows/executor-drift-detection.yml` (03:15 UTC daily); `emitExecutorRegisteredSnapshot()` helper in `_registry.ts` |

---

## 16. DEPLOYMENT INFRASTRUCTURE (NEW — gap #9 from Panel Q3+Q6, Sprint 6 Phases 2–3)

### 16.1 Readiness Checker (Sprint 6 Phase 2)

Scores a product across **six readiness dimensions** before deploy is permitted. Surfaces at `/architecture` per-product readiness visualization. Each dimension scored 0–10; sub-6 on any dimension blocks Step 5 Deploy until remediated.

| # | Dimension | What it measures |
|---|---|---|
| 1 | Infrastructure | Vercel project provisioned; DNS configured; SSL valid |
| 2 | Dependencies | Lockfile clean; no critical CVEs; no deprecated packages used |
| 3 | Data model | Supabase schema migrated cleanly; RLS policies present where required |
| 4 | Environment config | All required env vars present in Doppler; no hardcoded secrets in source |
| 5 | Observability | Audit log writes verified; Platform Health Widget online |
| 6 | Rollback | Snapshot taken pre-deploy; rollback path documented and tested |

### 16.2 Scaffold Generator (Sprint 6 Phase 2)

Generates per-product: SQL schemas, Vercel config, README, migration checklist. Stored in `DeploymentScaffold` entity. Consumed by Step 5 Deploy.

### 16.3 Dual Deployment (Sprint 6 Phase 3)

Every product has **two environments**: dev + prd. Tracked in `ProductEnvironment` entity (score history + sync reports). The Environments page at `/environments` shows both.

**Drift detection:** automated diff of dev vs prd configs + schemas + dependency versions. Drift generates a remediation sprint flagged for human review. Cross-environment governance: a "Gate 1 review" required when one environment scores materially below the other.

### 16.4 Live Monitor (Sprint 6 Phase 3)

Real-time health checks for all deployed products. Surfaces at the Dashboard's Live Monitor card. Health probe cadence per Sprint PROTECT-1 Phase 2 (scheduled daily self-test 03:00 + anomaly detection on session-speed / score-jump / clearance-contradiction).

---

## 17. SIX-SECTION SIDEBAR + NAVIGATION HIERARCHY (NEW — gap #8 from Panel Q1+Q6, Sprint UX-C → ARCH-1)

Sidebar canonical post-ARCH-1 (six sections; PORTFOLIO added to UX-C's original five):

| # | Section | Contents |
|---|---|---|
| 1 | **PORTFOLIO** | Dashboard, Portfolio Dashboard, Product Registry, Runs History |
| 2 | **CONFIGURATION** | Configuration page (unified 5-card session setup: Product, Input Method, Objective, Auto Parameters, Launch); Describe & Build, Clone & Improve, Synthesize & Build accessible directly |
| 3 | **AUTO OPERATIONS** | Auto Runner (live execution stream for all 8 steps); reads from Configuration; no re-entry required |
| 4 | **GUIDED OPERATIONS** | 8-step process bar with session persistence; per-step Approve / Modify / Skip flow (Sprint ARCH-1) + session context banner |
| 5 | **MANUAL OPERATIONS** | 8-step tracker with time awareness, AI Help, user-proposal flow (user defines scope → FlowAI confirms → executes) |
| 6 | **SETTINGS** | Audit Trail, Capability Transfer (`/capability-transfer`), Adapter Preferences (per `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` §5.4), Org Settings, Credentials, Roles |

Universal tooltip coverage on all sidebar items, section headers, logo, New Session button (Sprint UX-A). Keyboard shortcuts: `Cmd+N` (new session), `Cmd+Enter` (launch), `Cmd+/` (AI assistant).

> **Footnote (CA-18 §6 ENTRY 019 — supersedes Rev-2.1 amendment a):** Sidebar section names (AUTO OPERATIONS / GUIDED OPERATIONS / MANUAL OPERATIONS) are now **aligned with the canonical mode-naming lock** per CA-18 §6 (§8 Tool Intelligence axis + §8a System Operation axis + §3 iteration model all use AUTOMATIC / GUIDED / MANUAL). The prior Rev-2.1 framing — which described the sidebar names as "distinct from canonical axis labels (Auto / Recommended / User-Choice and Hands-On / Reviewed / Hands-Off)" — is SUPERSEDED at ENTRY 019: the sidebar names match canonical, and engineering may keep `'guided'`/`'manual'`/`'auto'` enum strings in code per Open Question 6 (RESOLVED at ENTRY 019).

---

## 18. CA-n CANONICAL AMENDMENT CYCLE (NEW — gap #7 from Panel Q4+Q6)

Rev-1 referenced "CA-n" without definition. Rev-2 defines the cycle canonically per `docs/SSOT_PARKING_LOT.md` workflow + ENTRY 001–002 in CANONICAL_REFERENCE §7.

### 18.1 States

| State | Meaning |
|---|---|
| `NEW` | Item logged in `docs/SSOT_PARKING_LOT.md` by W0x or CEO; awaiting next amendment cycle review |
| `UNDER REVIEW` | Promoted to Panel consultation (write-authority granted per Locked Rule 17 + P11) |
| `DRAFT` | Synthesis draft authored (e.g. `docs/FLOWAI_SSOT_AMENDMENT_DRAFT_<date>.md`); Panel re-review for engagement validation |
| `ACCEPTED [commit hash]` | CEO disposition: promote. Promotion commit recorded; archive of pre-promotion SSOT created at `docs/archive/FLOWAI_SSOT-pre-<date>-promotion.md` |
| `REJECTED [rationale]` | CEO disposition: reject. Rationale recorded inline in parking lot. |
| `MERGED [into entry]` | Item folded into another CA-n. Original entry retained for audit history. |
| `WITHDRAWN` | Canonical intention withdrawn; no canonical position taken; closed as a design question; reopenable as a new CA-N on market/user evidence. Not equivalent to implemented or resolved. |
| `DEFER-TO-BUILD` | Canonical intent affirmed; implementation deferred to its build phase. |

### 18.2 Threshold per Locked Rule 17 (MG2)

≥7 of 10 reviewers ENGAGED on the question + ≥7 of 10 ENGAGED votes for promotion = supermajority cleared. Below 7/10 ENGAGED = below soft-signal floor; surface explicitly per engagement-filter §6 of `docs/PANEL_INFRASTRUCTURE.md`. CEO retains absolute veto (per Locked Rule 13).

### 18.3 Archive discipline

Every promotion creates a pre-promotion snapshot at `docs/archive/FLOWAI_SSOT-pre-<date>-promotion.md`. Promotion log lives in `docs/CANONICAL_HISTORY.md` SECTION 8 + pointer copy in `docs/CANONICAL_REFERENCE.md` §7. Nothing is deleted; reverts re-promote from archive.

### 18.4 Ratified amendments to date (per CANONICAL_REFERENCE §7)

| Entry | Date | Promotion commit | Amendments |
|---|---|---|---|
| ENTRY 001 | 2026-05-14 | `1d65aba` | CA-1 (geographic broadening, 9/10) + CA-2 (democratization reframe, 8/10). Sections O1, O6, ELEVATOR PITCH amended. |
| ENTRY 002 | 2026-05-14 | (administrative) | CA-3 (replace O1 verbatim, 8/8 engaged). Text already incorporated during CA-1+CA-2. |
| ENTRY 003 | 2026-05-14 | `9495b26` | W04-Rev-2.1 promoted to canonical: 4 minor amendments (§3 productScope generic placeholders, §17 sidebar-label footnote, §20.1 Self-Protection reconciliation, §25 Locked Rule 4 axis labels). Panel: 9/10 PROMOTE_WITH_MINOR_AMENDMENTS. |
| ENTRY 004 | 2026-05-15 | `fd94f1e` | CA-7 (§15.5 EXECUTOR_REGISTRY + §14 three new rows for M2/M5) + CA-8 (§20.2 X-Test-Bypass-Token Contract with §20.2.1 Doppler env-suffix key naming). Panel: 5× UNANIMOUS_(a), 10/10 ENGAGED, commit `fb0bb64`. |
| ENTRY 005 | 2026-05-15 | (this promotion) | CA-9 (§8.1 Orchestra Self-Expansion auto-admission + Agent #26 Orchestra Research Agent dual-authority `[recommend_only, auto_write_internal, requires_human_gate]` per CEO arbitration CA-9-Q4=(b); §15.1 charter expansions for Agents #3, #10, #11, #15, #17; §15.2 +21 new MessageBus topic constants; Locked Rule 2 amended 25→26 agents) + CA-10 (§7.5 ProductSSOT entity with 6 canonical blocks; §7 Output Contract item #5; §13.1 role gates + `/product-ssot/:productId` UI; §28 Symbiotic Feed-Back Loop; §14.3 ProductSSOT retention + PII-scrub; §11 Step 4 Data Export expanded). Panel: 7/8 SUPERMAJORITY/UNANIMOUS, commit `cc5fd8d`. |
| ENTRY 006 | 2026-05-16 | (this promotion) | **Aggressive Crawl Engine (ACE)** promotion. Sections amended: §6 (crawl scope expanded — default depth=8 / hard cap depth=12; default pages=200 / hard cap pages=2000; click-everything pass + modal probing + AI-agent benign-probe + mobile-desktop viewports + non-destructive error-state triggers; XSS opt-in only per CEO arbitration Q6=(c); Orchestra wiring per §15.4 — Agent #21 dispatches via `playwright` + `browserless` + `anthropic-api`); §7.6 (NEW — GTM Readiness Report: 100-point scoring formula `100 − 10·crit − 5·high − 2·med − 0.5·low` clamped to [0,100]; 4 bands Showcase-ready / Demo-ready / Internal-only / Not demo-ready; $15/run cost ceiling; maps to §11 Clearance Step 5 with 4-prerequisite gate); §15.1 row 21 (Ops Runner Alpha pinned as **Aggressive Crawl Conductor** — step-owner, dual-authority `[recommend_only, auto_write_internal, requires_human_gate]`, consumes `1.crawl.request.v1`, produces 3 topics); §15.2 (+4 MessageBus topics: `1.crawl.request.v1`, `21.crawl.completed.v1`, `21.issues.detected.v1`, `21.gtm.readiness.v1`; topic count 61 → **65**). Source spec: `docs/specs/AGGRESSIVE_CRAWL_ENGINE_SPEC.md` (commit `5b30dce`). Panel consultation: `05ac6f4` — 7×UNANIMOUS (Q1 depth caps, Q2 agent-ownership Option B, Q3 AI-agent probe safety, Q4 parallelization scope, Q5 fix-loop autonomy on medium, Q7 readiness score formula, Q8 cost ceiling) + Q6 (error-state defaults) decided by CEO arbitration `(c)` non-destructive triggers always-on, XSS form-submit triggers opt-in only with operator confirmation + dev/staging-environment-only gate. Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-ACE-promotion-2026-05-16.md`. Closes parking-lot ENTRY 002 (CEO 2026-05-14 — "aggressive exhaustive crawler GTM-readiness bar"). |
| ENTRY 021 | 2026-06-02 | merge `1683a96` | **P1 Integrity Fixes bookkeeping.** Scope: integrity fixes already merged; implementation commits `db0f43e` → `a66e8aa` (5 commits). Reconciles §26 phase status, records Agent #26 registry presence as code/registry consistency only, downgrades unsupported CA18 evidence rows to PARTIAL where no evidence artifact existed, and registers `scripts/lint-evidence.mjs` as the evidence-discipline gate chained through `npm run audit:commit`. No claim is promoted to VERIFIED by this entry. |
| ENTRY 022 | 2026-06-04 | merge `71b3500` | **P2-P9 implementation evidence reconciliation.** Scope: live execution, ProductSSOT persistence, forge steps 5-8, symbiotic continuity, and reference vertical-slice harness already merged through P9. Records shipped merge points P2 `08b9da4`/hotfix `b93e330`, P3 `f8310b9`, P4 `8c7d204` + `4aba52c`, P5 `e07318f`, P6 `46ebfc7`, P7 `48e3f65`, P8 `55a6e7a`, and P9 `71b3500`. Updates §26 and Dispatch 0 implementation status to distinguish WIRED/Tier-B/LIVE_PRODUCTION proof from VERIFIED. Cleans stale matrix text that said VERIFIED while status was PARTIAL. No claim is promoted to VERIFIED by this entry. |
| ENTRY 023 | 2026-06-06 | docs amendment; code base `19c554b` | **Business-advisory roster + Orchestra ownership reconciliation.** CEO-ratification track / Locked Rule 13, CODE-LED: code at `19c554b` already contains Agents #22–#26 as Finance & Procurement, HR & Compensation, Information Security, Customer Care, and Legal & Communications. Docs follow that code-led state. Scope: §15.1 rows 22–26 reconciled as business-advisory agents with registry mode `step-owner`, embedding `embedded`, authority `[recommend_only]`, required credentials `[]`, and status vocabulary `ROSTERED + IMPLEMENTED` only; no WIRED, RUNTIME_ACTIVE, PRODUCTION_VERIFIED, or VERIFIED movement. Historical Agent #26 Orchestra Research identity is superseded in active rows; Orchestra membership lifecycle / auto-admission ownership is reassigned canonically to `orchestra-membership-executor` in §8.1 + §15.5, while stable `26.orchestra.*` topic identifiers are retained under the ENTRY 019 identifier-stability precedent. Identity reconciliation only — no runtime behavior change, no authority change, no source change, no production evidence claim. DEFER-TO-BUILD items: (1) `orchestra-membership-executor` exists canonically in §15.5 but is not implemented in code `EXECUTOR_REGISTRY` at `19c554b` (which has `self-renewal-executor` + `aggressive-crawl-conductor-executor` only); future build must implement the executor and its `ANTHROPIC_API_KEY` + `BROWSERLESS_API_KEY` requirements. (2) `CredentialAdapter.ts` `CREDENTIAL_CATALOG` inverse index omits Agent #21 from `ANTHROPIC_API_KEY.requiredForAgents` and `BROWSERLESS_API_KEY.requiredForAgents` even though #21's registry declares both; future code fix must align catalog + notes. (3) Agent #21 crawl-overflow escalation target is canonicalized as `crawl_overflow_target_tbd`, but code `escalationPolicy` still reads "escalate to Ops Runner Beta"; alignment is deferred to the Agent #21 build dispatch. (4) If CEO intends Agents #22–#26 to be FlowAI-only rather than embedded, that requires a separate code dispatch to update `FLOWAI_ONLY_AGENTS` / `EMBEDDED_AGENTS` in `BaseAgent.js` plus registry metadata such as `flowAiOnly:true`; out of scope for this docs-only amendment. |
| ENTRY 020 | 2026-06-01 | (this promotion) | **CA-DELIVERY-DISTRIBUTION-GOVERNANCE** ratified by CEO 2026-06-01, base `36e9897`. Sections amended: §7 (delivery artifact output contract + submission/publish boundary), §4/§6 (target-class detector sets), §9 Step 3 (Build `targetMode`) and Step 5 (distribution-adapter registry), §15.1 Agent #10 (store-review-status signal), §24 (operator-generic gates), §22 (SAIGE portability reaffirmation), §18.1 (WITHDRAWN + DEFER-TO-BUILD states), §18.4 (this ledger entry + dispositions), §27 (open-question dispositions), §23/§24 (six operating roles and dispatch governance), and §28.7 (Layer 4 Building Guidance stub). CA-4 (Year-1→6 journey), CA-5 (commercial rail), CA-6 (commercial architecture), and CA-16-B (Redesign/Build environment) are WITHDRAWN as market/user-driven design questions, 2026-06-01. CA-16-B scope guard: §11.7 admin-only approval (ENTRY 015) is UNCHANGED. No claim is promoted to VERIFIED by this entry. |
| ENTRY 019 | 2026-05-19 | (this promotion) | **CA-18 §6 Tool Intelligence Principle ADDITION + global mode-name LOCK** (CEO-ratification track, Locked Rule 13 — no Panel; extension of CA-18 mission/purpose amendment per ENTRY 018). Binding canonical statement: `docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md` (now 25,259 chars) extended with **new §6 TOOL INTELLIGENCE PRINCIPLE** + uppercased §3 modes + bumped §6/§7 → §7/§8 numbering. §6 defines: FlowAI is AI-provider-agnostic + tool-agnostic at every step; for each of 8 Auto Runner steps the engine researches/ranks/selects from the **top 5 platforms** by current performance/cost/speed/reliability for the specific task and §4 target class; rankings are **research-driven (not hardcoded)** and **refreshed monthly**; **three selection modes LOCKED at AUTOMATIC (rank-#1 auto-pick) / GUIDED (top-5 user picks) / MANUAL (user specifies exact tool)**; vendor-agnosticism invariant — no step locked to any single provider; current rankings reflect current performance, NOT permanent commitment. Sections amended in `docs/CANONICAL_REFERENCE.md`: **§8 Orchestra Selection axis** REPLACED with Tool Intelligence Principle text (Auto/Recommended/User-Choice triad RETIRED; AUTOMATIC/GUIDED/MANUAL triad takes its place; §8.1 Orchestra Self-Expansion sub-section PRESERVED unchanged — auto-admission of new candidate platforms is orthogonal to selection-mode triad); **§8a System Operation axis** labels REALIGNED to AUTOMATIC/GUIDED/MANUAL (mapping: Hands-Off→AUTOMATIC, Reviewed→GUIDED, Hands-On→MANUAL; Rev-2 + Rev-1 triads retained as historical aliases for shipping continuity); **§25 Locked Rule 4** REWRITTEN to lock the single global triad across §8 + §8a + §3 iteration model; **§25 Locked Rule 18** extended with top-5 + monthly-refresh + research-driven specs + AUTOMATIC/GUIDED/MANUAL triad citation; **§5 INPUT modes cross-ref** updated to AUTOMATIC/GUIDED/MANUAL; **§10.2 Review Gate** updated from "Reviewed or Hands-On" to "GUIDED or MANUAL"; **§11 Clearance §7 inline-tool** updated from "Guided + Manual modes" to "GUIDED + MANUAL modes"; **§14.1 audit-log topics** updated for `session_started` + `proposal_approved` + `proposal_modified` + `proposal_skipped` to AUTOMATIC/GUIDED/MANUAL labels; **§17 sidebar footnote** REWRITTEN to acknowledge AUTO OPERATIONS / GUIDED OPERATIONS / MANUAL OPERATIONS sidebar names now ALIGN with canonical (prior "distinct from canonical axis labels" framing superseded); **§27 Open Questions 6 and 9** marked RESOLVED at ENTRY 019 (surface-of-truth resolution: canonical user-facing labels lock to AUTOMATIC/GUIDED/MANUAL; engineering may keep prior enum strings in code). Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA18-tool-intelligence-promotion-2026-05-19.md` per §18.3. |
| ENTRY 018 | 2026-05-19 | (this promotion) | **CA-18 — FlowAI Mission/Purpose Amendment** (CEO-ratification track, Locked Rule 13 — no Panel; CEO has explicitly stated the full mission vision across multiple sessions and this entry captures it canonically). Binding canonical mission/purpose statement: `docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md` (this commit). §1–§5 of the binding statement define: §1 **Core Definition** (input/output promise — always a new separate deployable URL, input never destructively modified; substantial-transformation quality guarantee; honest assessment refusing to manufacture work; user agency on iteration depth with full trajectory + diminishing-returns reporting); §2 **10 Quality Dimensions** (syntax/grammar, duplication, UI/UX, bugs/errors, functional completeness, performance, accessibility, security, **privacy compliance — jurisdiction-aware**, **legal compliance — jurisdiction-aware**); §3 **Iteration Model** (Manual / Guided / Automatic; preset modes + free-form instruction field; instructions function as **PRIORITY WEIGHTS, not feature toggles** — full §2 coverage maintained regardless of instruction; diminishing-returns trajectory reporting); §4 **Platform Scope and Mission — GLOBAL** (no geographic restriction; underserved is a global condition not a geography; all 5 VEU products are global; 6 target classes web/native_app/mobile_app/SaaS/agentic_ai/generic_url; **uniform ≥95 for everyone, globally — dignity-and-belonging guarantee**; **NO canonical sub-95 exception path** — operational admin exception is engineering-level configuration, not canonical policy); §5 **Symbiotic Meta-Principle** (SSOT governs FlowAI; FlowAI improves SSOT; cycle compounds indefinitely; FlowAI applies to its own development process — VEU AI Studio's own workflow is a valid construction target). Sections amended in `docs/CANONICAL_REFERENCE.md`: **§1.1 MyPregLife row** — the prior "Africa-first as launch market" caveat REMOVED; row now reads "Globally, with no geographic restriction" (launch sequencing is operational, not canonical scope narrowing); **§2 MISSION** — REWRITTEN: prior CA-1+CA-2 geographic bullet listing "Sub-Saharan Africa, parts of Latin America, parts of South/Southeast Asia" REMOVED; replaced with global-condition framing per CA-18 §4 + cross-reference to the binding mission/purpose statement; target-classes line updated to canonical 6 classes; §18.4 ENTRY 001 historical CA-1+CA-2 row preserved unchanged for audit-trail integrity. Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA18-promotion-2026-05-19.md` per §18.3. Resolves the explicit ENTRY 017 deferral: the uniform-≥95 directive + sub-95 exception question (deferred to "forthcoming mission/Purpose amendment" per ENTRY 017 third de-canonization) are resolved at this entry — uniform ≥95 is canonical; no canonical sub-95 exception path exists. |
| ENTRY 017 | 2026-05-19 | (this promotion) | **CA-13 sliver + CA-15 lean-down + CA-16-A zero-canonical disposition** (CEO Decision B, Locked Rule 13 CEO-disposition track after 3-cycle Panel non-convergence 0/13 on the deadlocked questions across CA-13 v2 / CA-15 v2 / CA-16 v2 re-Panels). **CA-15 promoted (3 cleared-pending):** B-Q2 reverse-engineered/synthesized purpose-capture modes DROPPED (described-only carry-forward discipline if revived); B-Q3 placeholder detection moves to `scripts/lint-product-purpose.mjs` tooling (NOT canonical SSOT); C-Q2 hardcoded `purpose_fulfillment_score ≥ 0.7` threshold ELIMINATED. **CA-15 disposed (3 deadlocked):** C-Q1 → numeric-floor-only loop exit (LOCKED; no LLM check); D-Q1 → §19.1 SSOT-Conformance Gate HYBRID (blocks critical/high; advisory on medium/low); D-Q2 → §19.2 Scoped CEO re-sign BROADER scope (`src/lib/governance/**` + `src/lib/conformance/**` + `*.sql` migrations). **CA-13 collapsed:** 95-bar override/expiry/migration machinery DROPPED entirely from canonical; retained only — (1) sibling MEMBERSHIP rename in §15.5 (Agent #26 → `orchestra-membership-executor`, Agent #21 → `crawl-write-executor`; EXECUTOR_REGISTRY count 1→3); (2) §19.0 anti-conflation invariant one-liner ("two distinct 95 bars, NEVER conflated"); the v3-draft §19.0 reconciliation paragraph + 2-row distinction-table NOT promoted (invariant alone suffices per CA-13-A v3 option-(c)). Uniform ≥95 directive EXPLICITLY deferred to forthcoming mission/Purpose amendment (NOT in CA-13). **CA-16-A collapsed to ZERO canonical surface:** NO §7 envelope, NO §11 reference, NO REOPEN lifecycle state, NO canonical defer-window, NO `governance_record_entry kind:'proactive_recommendation.v1'`. Recs are wholly TOOLING-governed (`scripts/lint-proactive-recs.mjs` + admin dashboard). CA-16-B/C remain DEFERRED (unchanged from `e8bb7d4` CA-16 SPLIT). Sections amended: **§7 NEW disposition note** (CA-16-A zero-canonical); **§7.5 disposition** (CA-15-B no `product_purpose`); **§7.6 disposition** (CA-13 no canonical sub-95 exception path); **§10.1 disposition** (CA-15-A stays at 5 dims; tooling-only content_quality/accessibility); **§15.5 updated** (3 executors: `self-renewal-executor`, `crawl-write-executor`, `orchestra-membership-executor`); **§19.0 NEW** (anti-conflation invariant); **§19.1 NEW** (HYBRID SSOT-Conformance Gate); **§19.2 NEW** (broader Scoped CEO re-sign); **§28.6 NEW** (Purpose-Driven Optimization Loop numeric-floor exit + B-Q2/B-Q3/C-Q2 carry notes). Three explicit de-canonizations registered in ENTRY 017 history: (1) proactive-recs governance is tooling-only; (2) no canonical sub-95 exception path exists in CA-13 — operational exception is a DEFERRED DELIBERATE DECISION for the mission/Purpose amendment; (3) §27→§19.1 SSOT-Conformance Gate is HYBRID, not full-hard-gate. Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA13-15-16A-leandown-promotion-2026-05-19.md` per §18.3. |
| ENTRY 016 | 2026-05-19 | (this promotion) | **CA-17 — Build/Wire Construction Engine v3-FINAL ratification** (CEO Decision A, Locked Rule 13 CEO-disposition track, not open re-Panel). Binding canonical contract: `docs/specs/BUILD_WIRE_ENGINE_SPEC_V3_FINAL_DRAFT.md` (commit `1d5e39b`, 33,974 chars). Eight invariants S1–S8 + 48-test conformance inventory + 26 failure envelopes become canonical authority for the construction engine. NON-OVERRIDABLE fidelity (S2/S4/S5/S6) preserved verbatim per Path H ENTRY 014 (no other invariant carries non-overridable status; S1/S3/S7/S8 PANEL-RATIFIABLE). Rationale per Locked Rule 13: convergence-final after documented J2→v2→re-Panel oscillation; W6 v2 4-run re-Panel (`4400958`) returned 0/8 cleared — Panel non-convergence is why CEO disposes. Sections amended: **NEW §29** Build/Wire Construction Engine canonical authority + per-invariant disposition + NON-OVERRIDABLE fidelity statement + 48-test inventory + Path H Stage 3 UNBLOCKED declaration + cross-CA dependencies. **Path H ENTRY 014 Stage 3 (build/wire) marked UNBLOCKED.** Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA17-promotion-2026-05-19.md` per §18.3. |
| ENTRY 015 | 2026-05-19 | (this promotion) | **Cleared-8 promotion** (CEO one-shot ratification per Locked Rule 13). Eight individually quorum-cleared questions from W6 quorum-fix rerun commit `cc14a8f` (`docs/panel-consultations/ca-{13,14,15,16}-quorum-fix-rerun-2026-05-19.md` + cross-summary). Sections amended: **§7** Output Contract NEW item #6 (5 Self-Renewal fix-safety invariants, CA-14-B-Q1 + canonical guarantee CA-14-B-Q2, 7/10 + 7/10) + NEW LIMITATIONS sub-section (CA-14-A-Q2, 7/10); **§7.5.1** NEW (3 ProductSSOT operational invariants — per-product branch-of-record + seeding + atomic-audit-write, CA-14-D-Q1, 8/10); **§7.6** NEW formula-generalization invariant paragraph (CA-16-C-Q4, 8/9); **§11.7** NEW Redesign/Build approval gate (admin-only final approval, CA-16-B-Q3, 7/9); **§15.1 row 21** Agent #21 charter extension to own Phase B (CA-14-A-Q3, 8/10); **§25** NEW Locked Rule 19 (Phase A vs Phase B — DO NOT CONFLATE, CA-14-A-Q4, 8/10; rule count 18→19). Implementing W5a commits cited: D27–D38 arc (`29ce070` → `b719c6d`) + D39–D41 Phase B implementation (`90210d0` → `ed0d779`). Open questions (CA-14: A-Q1, B-Q3, C-Q1, C-Q2, D-Q2; CA-13: all 5; CA-15: all 11; CA-16: A-Q1..A-Q4, B-Q1, B-Q2, C-Q1, C-Q2, C-Q3) re-Panel in CA-13 v2 / CA-15 v2 / CA-16 v2 drafts (this commit's siblings). Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-ENTRY015-promotion-2026-05-19.md`. |

CA-4 + CA-5 + CA-6 are WITHDRAWN as market/user-driven design questions per ENTRY 020. Prior consultation record `ssot-finalization-and-agent-roadmap-priority-2026-05-14.md` remains audit history.

---

## 19. GOVERNANCE (95/95 + Panel + SSOT Access)

**95/95 threshold:** every Self-Audit dimension scored ≥95/100 with ≥95% confidence. Enforced by `src/lib/governance/ScoreEvaluator.js`. Sub-95 on any dimension halts Step 5 Deploy. Override requires admin role + audit-log entry.

**Panel quorum + supermajority:** quorum ≥7/10 LIVE-OK; supermajority ≥8/10 ENGAGED. Engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6 — only ENGAGED responses count toward majority; TANGENTIAL/SILENT/EVASIVE reported separately in engagement matrix.

**Panel SSOT Access Rules (CEO-ratified, canonical):**
- W0x MUST prepend full `docs/CANONICAL_REFERENCE.md` + current canonical SSOT to every Panel consultation. No exceptions.
- Panel consensus grants **write-authority** to propose SSOT amendments via CA-n.
- Amendments enter CA-n cycle (§18) and require CEO ratification.
- Sessions without SSOT attached are **invalid**; must be re-run.

Three complementary governance mechanisms (per Locked Rule 3, do not conflate):

| Mechanism | Owner | When |
|---|---|---|
| 95/95 score threshold | `ScoreEvaluator.js` | Step 4 Quality Audit + post-Self-Heal verification |
| 6-step Product Clearance Protocol | `ClearanceRecord` entity, `/clearance` wizard | Pre-launch sign-off (§11) |
| Monitor step 0–50 decision | Step 8 Monitor; clearance gate of last resort | End of pipeline |

All three must pass independently; any single failure halts deployment (per Locked Rule 3 + Layer 1 SSOT L5).

### 19.0 Anti-conflation invariant (CA-13 sliver canonical per ENTRY 017)

The Self-Audit **95/95 threshold** (this §19, owned by `src/lib/governance/ScoreEvaluator.js`, enforced at Step 4 Quality Audit across §10.1's 5 dimensions) and the §7.6 **GTM Readiness score** (owned by Agent #21 Aggressive Crawl Conductor per §15.1 row 21, surfaced at §11 Step 5 Demo Readiness) are TWO DISTINCT bars. They are **NEVER conflated in any operator-facing surface.** This is a binding invariant on every UI surface, dashboard, and audit envelope that displays either bar; bare "95" without disambiguating qualifier ("Self-Audit 95/95" vs "GTM Readiness score") is a defect.

(This is the CA-13 §19.0 anti-conflation sliver retained per ENTRY 017. The CA-13 v3 draft's full reconciliation paragraph + 2-row distinction-table is NOT promoted per CEO Decision B — the invariant alone suffices; §10 governance-mechanisms table already covers the distinction descriptively.)

### 19.1 SSOT-Conformance Gate — HYBRID (CA-15-D-Q1 canonical per ENTRY 017)

At the end of each §11 Six-Step Clearance Protocol run, an SSOT-Conformance test runs over the resulting ProductSSOT state + `governance_record_entry` log. Per CEO Decision B (Locked Rule 13 disposition of CA-15-D-Q1 deadlock at v2 5/9 REJECT vs v3 advisory-revert), the gate operates as a **HYBRID** — blocking on high-severity conformance findings, advisory on low-severity:

**Gate checks (canonical):**

1. ProductSSOT structure validates against the 6 canonical blocks per CA-10-A (any 7th block → blocking critical).
2. Each `governance_record_entry` row references a known canonical `kind` (validation list maintained in `src/lib/governance/CanonicalKinds.ts`).
3. Each `architecture_snapshot.gtm_readiness_score` write has a companion `governance_record_entry kind:'gtm_readiness_score'` per CA-14-D-Q1 ENTRY 015 atomic-audit-write invariant.
4. Each `delta_log` row references a non-null `governance_record_entry.id` (provenance check).

**HYBRID gate semantics:**

- `critical` and `high`-severity conformance findings → **BLOCKING.** §11 Step 6 (Deploy/Promote) is BLOCKED until conformance achieved. Emits `governance_record_entry kind:'ssot_conformance_failure.v1' severity:'critical'` or `severity:'high'`.
- `medium` and `low`-severity conformance findings → **ADVISORY.** §11 Step 6 NOT blocked. Surfaces as `governance_record_entry kind:'ssot_conformance_advisory.v1' severity:'medium'` or `severity:'low'` + admin dashboard alarm without gating deployment.
- Admin override of a blocking finding requires admin role + audit-log entry per §19 existing 95/95-override rule; emits `governance_record_entry kind:'ssot_conformance_override.v1'`.

Rationale (CEO Decision B): full hard-gate (v1 form) was preferred by 5/9 at v2 re-Panel; advisory-only (v2 form) was 4/9 plurality. CEO disposes via HYBRID — preserves enforcement teeth on consequential (critical/high) conformance violations while avoiding deployment-blocking churn on cosmetic (medium/low) findings. The HYBRID was Panel-electable as option (b) on the v3 draft's Q1; CEO selects it as the resolved disposition.

### 19.2 Scoped CEO re-sign — BROADER scope (CA-15-D-Q2 canonical per ENTRY 017)

CEO sign-off on a product's prior §11 Six-Step Clearance run is invalidated by a subsequent CA promotion ONLY when the CA explicitly amends any file under the **scoped governance surface**. Per CEO Decision B (Locked Rule 13 disposition of CA-15-D-Q2 deadlock), the scope is the **BROADER** set drafted as v3 option (b):

**Scope (canonical, recursive):**

- `src/lib/governance/**` — all files under the governance directory tree.
- `src/lib/conformance/**` — all files under the conformance directory tree (host for CA-17 build/wire conformance tests per §29 + future SSOT-conformance test additions).
- `*.sql` migration files — any schema-change migration regardless of path.

**Trigger mechanism:** engineering dispatch adds a CI check at CA-promotion-commit time running `git diff --name-only <CA-base> HEAD` against the three scope patterns. Non-empty match → `ceo_resign_required: true` flag set on the corresponding §18.4 row + admin dashboard surfaces `ceo_resign_pending` until re-sign lands.

**Out-of-scope CAs** (do NOT invalidate prior sign-offs): canonical-doc-only edits (e.g. `CANONICAL_REFERENCE.md` typo fixes, §18.4 row appends), agent registry edits NOT under `src/lib/governance/` or `src/lib/conformance/`, §28 narrative edits, panel-consultation artifact additions, archive snapshots.

Rationale (CEO Decision B): v2's documentation-file scope (`docs/governance/CONFORMANCE_SCOPE.md`) had three structural flaws — circular dependency, brittle to maintain, gameable. v3 drafted entire `src/lib/governance/` as primary; CEO disposes BROADER per option (b) because schema-change CAs (`*.sql` migrations) AND future conformance-tree CAs (`src/lib/conformance/**` once CA-17 lands its test inventory) materially affect governance even when not under `src/lib/governance/` itself. The broader scope is self-detecting + audit-trail-preserving without manual scope-file maintenance.

---

## 20. REMEDIATION + IP PROTECTION (Sprint PROTECT-1, complements §10)

Distinct from Sprint 5's Self-Protect (snapshot/rollback), the Sprint PROTECT-1 IP-protection layer covers:

- **Right-click protection** on all FlowAI pages (polite notice)
- **DevTools detection** → logged to GovernanceAuditLog
- **Content protection:** `user-select: none` on reports and sprint instructions
- **Legal footer** on all pages: copyright, patent pending, scraping prohibition
- **`/terms-of-use`** + **`/privacy-policy`** pages canonical
- **Session security:** XOR cipher for sessionStorage, 8-hour expiry
- **Bot detection:** headless browser signatures, missing User-Agent, rapid-click detection
- **Cloudflare Bot Management + watermarking** (per Agent #13 Self-Protection charter; embedded in every product)

Self-Renewal Capability Package + Self-Protection Capability Package live at `/capability-packages/{self-renewal,self-protection}`. Install sprints for all 5 VEU products generated; new install sprints generated on demand for any other Base44 product via `/capability-transfer`.

### 20.1 Reconciliation with §15 Agent #13 (Rev-2.1 amendment c)

The Sprint PROTECT-1 surface above and Agent #13 (Self-Protection Agent, §15) are **different layers**, not duplicates:

| Layer | What it is | Status today | Where it runs |
|---|---|---|---|
| **Embedded code-level Self-Protection** (Sprint PROTECT-1, this §20) | Always-on defensive code: edge defense, `robots.txt`, scraper blocking, session cipher, bot detection, content-protection CSS, DevTools detection, legal footer | LIVE — shipped in every product | Inside the product's own runtime; no agent invocation required |
| **Agent #13 Self-Protection Agent** (orchestrating, §15 row 13) | Portfolio-level orchestration: DMCA workflows, clone detection across the catalog, Cloudflare Bot Management policy updates, watermarking strategy | DORMANT — awaits OrchestratorHub wire-in | Inside FlowAI as a step-owner / cross-step agent |

**Rule of thumb:** the embedded code-level defenses are *always-on* and ship with every product (per §22 Product-Agnostic Rule via metadata); Agent #13 is *dormant* and will orchestrate portfolio-wide IP-protection decisions once it graduates. The two layers complement each other and are co-canonical.

### 20.2 X-Test-Bypass-Token Contract (Canonical, ratified CA-8)

The **X-Test-Bypass-Token** is a signed JWT-style token sent in the HTTP
header `X-Test-Bypass-Token` on every request from an internal-audit /
adversarial-test source to the SUT. The Self-Protection layer
(this §20 embedded code-level + future Agent #13 orchestration per
§20.1) MUST validate the token signature + claims before applying any
bypass.

**Scope of bypass** (and what it does NOT bypass):

- BYPASSES: bot-detection rate limits; headless-fingerprint rejection;
  Cloudflare Bot Management challenge (when present); future Agent #13
  hostile-crawler heuristics.
- DOES NOT BYPASS: authentication (§13); RLS (§14.3); role gates on
  Human Gates (§10.2); 95/95 governance threshold (§19); the
  Self-Renewal authority guards.

**Algorithm:** RS256 preferred (asymmetric — public key on the verifier
side; private key only at the issuer). HS256 acceptable when key
distribution to verifiers is impractical (e.g. local dev). Production +
Vercel preview MUST use RS256.

**Claim schema:**

```json
{
  "iss": "flowai-adversarial-suite",
  "sub": "test-runner",
  "testSuiteId": "flowai-adversarial",
  "runId": "<uuid v4>",
  "env": "prod | dev-SUT",
  "iat": <unix-seconds>,
  "exp": <unix-seconds, max iat + 3600>,
  "scope": ["bot-detection-bypass", "agent13-allowlist"],
  "fingerprint": "<sha256 of expected User-Agent + IP CIDR>"
}
```

**Validation rules** (verifier-side, all MUST pass):

1. `iss` equals `"flowai-adversarial-suite"`. Otherwise reject + log to
   GovernanceAuditLog topic `auth.test_bypass_token.reject` (reason:
   `iss_mismatch`).
2. `exp` is in the future and `≤ iat + 3600` (max 1-hour TTL). Reject
   expired or long-lived tokens.
3. `env` MUST match the SUT environment. A prod-issued token MUST NOT
   validate against dev-SUT and vice versa.
4. `runId` is a valid UUID v4. Replay-attack mitigation: each `runId`
   is single-use within the token TTL; a second request bearing the
   same `runId` after the first run completes is rejected.
5. Signature verified against the per-environment public key from
   Doppler (see §20.2.1 key naming below).
6. Token bypasses ONLY the items in the "BYPASSES" list above.

#### 20.2.1 Doppler key naming (canonical — env-suffix form, per shipped W5c code)

Keys are stored under Doppler config `flowai/<config>` where
`<config>` ∈ {`dev`, `prd`} (canonical Doppler workspace config names —
note `prd` NOT `prod` per `CredentialAdapter` Packet 1.5 amendment).
Secret names use an env suffix in the name itself (NOT a path), so a
single config can hold both dev and prod keys if needed (operational
flexibility for shared-config audits) and runtime lookups are explicit:

| Env | Doppler config | Private-key secret name | Public-key secret name |
|---|---|---|---|
| dev | `flowai/dev` | `TEST_BYPASS_PRIVATE_KEY_DEV` | `TEST_BYPASS_PUBLIC_KEY_DEV` |
| prod | `flowai/prd` | `TEST_BYPASS_PRIVATE_KEY_PROD` | `TEST_BYPASS_PUBLIC_KEY_PROD` |

**Notes on naming evolution:**

- The test-plan-text §9.1 (commit `8eaf44c`) referenced path-style keys
  named `TEST_BYPASS_TOKEN_PRIVATE_KEY` / `_PUBLIC_KEY` (no env suffix,
  no env in name; env distinguished by Doppler config path only).
- W5c shipped form drops the `TOKEN` middle word and appends the env
  suffix. This is the canonical form (Locked Rule 1: code wins).
- The test plan §9.1 is retroactively updated post-CA-8 promotion
  to match the canonical form (per CA-8.3 housekeeping ripple).

**Issuance:**

Issuance is owned by the CI pipeline (production / Vercel preview
adversarial run) or local-dev `scripts/setup-test-bypass-keys.mjs` (dev
run). The private key is read from Doppler at issuance time, never
checked into the repo. The script supports three modes:

- `--mode=doppler` (default): pipes generated PEMs via stdin to
  `doppler secrets set`. Requires `doppler` CLI authenticated to the
  `flowai` project.
- `--mode=stdout`: prints PEMs to stdout for hand-copy into Doppler UI
  or 1Password vault.
- `--mode=files`: writes `test-bypass-private-<env>.pem` (mode 600) +
  `test-bypass-public-<env>.pem` (mode 644) to `tmp/test-bypass-keys/`
  for upload. The local private PEM MUST be deleted after upload.

The `tmp/test-bypass-keys/` path is gitignored (`.gitignore` updated in
commit `0bd26b9`).

**Key rotation:** re-run `scripts/setup-test-bypass-keys.mjs` to
generate a fresh pair and re-upload. Rotation cadence: at minimum
quarterly + on any suspected compromise + on any departure of a CI
service-role-holding contributor.

**Audit:** every token issuance, every successful verification, and
every reject (per the validation rules above) is logged to
GovernanceAuditLog. Topics:

- `auth.test_bypass_token.issued` — emitted by `setup-test-bypass-keys`
  on rotation (not per-token issuance — tokens are issued at runtime
  by the CI runner and the runtime issuance is logged as `.minted`).
- `auth.test_bypass_token.minted` — emitted on per-run token mint by
  the CI runner. Payload: `{ testSuiteId, runId, env, exp, at }`.
- `auth.test_bypass_token.verified` — emitted by the verifier on
  successful validation. Payload: `{ runId, env, scope, at }`.
- `auth.test_bypass_token.reject` — emitted on any failed validation.
  Payload: `{ reason, partialClaims?, at }`. `reason` is one of:
  `iss_mismatch`, `expired`, `env_mismatch`, `replay_attempt`,
  `signature_invalid`, `claim_missing`.

---

## 21. TECHNOLOGY STACK

| Concern | Choice |
|---|---|
| Deployment | Vercel |
| State (hot) | Vercel KV |
| State (cold + canonical) | Supabase |
| Auth | Base44 auth + UserRole entity (Sprint 7.5a) |
| Credentials vault | Doppler (`flowai/<env>/...`) per `CredentialAdapter` (commit `8e29e84`) |
| Runtime | Node.js v24+ |
| Module system | ESM only |
| Build | Vite |
| Testing | Vitest |
| Linting | ESLint |
| Repo | github.com/victor2081new-cloud/flowai |
| Branch | flowai-v0.1 |
| Browser automation | Browserless cloud (`api/_lib/crawler.js`) wrapped by Orchestra members `browserless` + `playwright` |

---

## 22. PRODUCT-AGNOSTIC RULE

Zero product-specific code in the core engine + 26 agents + tests + configs + URL patterns + env vars. No VEU product names (SAIGE, RelTwin, ReachSMS, PressAI, MyPregLife) in agent code, BaseAgent dependencies, MessageSchema topic strings, ScoreEvaluator logic, OrchestratorHub registration, Orchestra adapters, or smoke-test fixtures. Smoke tests use **neutral fixtures only** (e.g. `flowai-renewed-<sanitised-stub>-<suffix>`).

Per-product configuration lives entirely in **metadata** per §3:
- `ProductRegistry` entity (Supabase, RLS-isolated)
- `flowai_product_config` rows
- Doppler vault paths `flowai/<env>/PRODUCTS_<productId>_*`
- `BaseAgent` `productScope` constructor parameter

The 6th, 10th, 100th product onboards via metadata writes alone. Zero code changes. This is the test of correctness.

Any capability proven on SAIGE must exercise reusable product-agnostic contracts (ProductSSOT, target-class adapters, deployment/distribution adapters). If it cannot generalize beyond SAIGE, it is not complete FlowAI work. (Ref: dispatch-0b, commit `b1173a5`, ratified this campaign.)

---

## 23. WORKSTREAM ROUTING

| Workstream | Role |
|---|---|
| W0x | Orchestrator, dispatch, lineage. |
| W04 | Current-generation W0x (lineage W0 → W01 → W02 → W03 → W04). |
| W1 | Credentials. |
| W2 | Engineering + verification (built three-input renewal pipeline at commit `9b4e511`). |
| W3 | Audit + spec drafting (this document; Self-Renewal spec at `docs/specs/SELF_RENEWAL_AGENT_SPEC.md`; Orchestra spec at `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md`). |
| W4 | Smoke testing + QA. |
| W5a / W5b / W5c | Shared infrastructure, agent builds, parallel commits gated by `.wx-staging.lock` per `docs/PANEL_INFRASTRUCTURE.md` §7. |
| W6 | Dedicated Panel workstream (runs 10-AI consultations end-to-end). |

Pattern: **CB drafts dispatches. W5x builds. W2 verifies. W6 runs Panel. CEO pastes.**

### 23.1 Current operating roles (CA-DELIVERY-DISTRIBUTION-GOVERNANCE)

| Role | Responsibility |
|---|---|
| **W0/W04 (Claude Chat)** | Adjudicates; issues clearances; does not draft dispatches. |
| **CB (Codex Builder)** | Sole builder; drafts all dispatches from actual codebase state. |
| **CR (Codex Reviewer)** | Read-only verification; checks runtime evidence and wired-vs-verified discipline. |
| **CD (Claude Code)** | Read-only review; codebase-grounded data-shape and SSOT-consistency checks. |
| **CG (ChatGPT)** | Spec critic; no codebase access; reviews coherence, feasibility, and governance meaning. |
| **WT (Windows Terminal)** | Execution surface/operator terminal only; not a reviewer and not a code author. |

**Dispatch classification:** KEY dispatches require the four-reviewer panel (CB/CR/CD/CG) before CB builds. KEY means any change to behavior, scoring, governance, deploy, persistence, agent authority, SSOT meaning, or verification status. CLEANUP dispatches do not require panel review when they are behavior-preserving only: renames, comments, dead-code removal, file moves, and doc-consistency propagation that do not touch the KEY list.

Post-ratification operating-model memory update required: update `feedback_operating_model_2026_05_25.md` from the prior three-role model to these six roles.

---

## 24. CEO OPERATING RULES (CANONICAL W0x PROTOCOL)

CEO role = **approve, click, copy, paste only — nothing else.**

During Level L1 (building FlowAI), the authorized operator is Victor Udo, FNSE, PhD (CEO, VEU AI Studio) for all VEU products. Post-ship, the authorized operator is the FlowAI user for their own products and developer accounts. Every operational "human-run", `requires_human_gate`, approval, deployment, signing, store credential, or distribution decision resolves to the run's authorized operator unless the text explicitly names the Level L1 FlowAI-build context.

- W04 posts instructions in copy boxes labelled with target Claude Code window (`W5a` / `W5b` / `W5c` / `W2` / `W3` / `W4` / `W6`).
- During L1, the CEO pastes into the named window. Post-ship, the run's authorized operator performs the equivalent approval/paste/credential action for their own product account. The window executes auto mode and reports back using the mandatory format below.
- During L1, the CEO pastes report back to W04. Post-ship, the run's authorized operator reports back to the active orchestration surface. W04 summarizes and recommends action during L1.

**Mandatory report format** (canonical 2026-05-14, supersedes prior `═══════ REPORT-BACK ═══════` template):

```
════════════════════════════════════════
[Wx] REPORT — [TASK NAME]
════════════════════════════════════════
[report content]
════════════════════════════════════════
Started:   [ISO-8601 timestamp]
Completed: [ISO-8601 timestamp]
Duration:  [mm:ss]
════════════════════════════════════════
```

No exceptions. Even short acknowledgements use the banner if they are reports to W04.

---

## 25. LOCKED RULES (19, do not violate)

Referenced from the canonical FLOWAI_SSOT.md anchor + W03 opening package. The 18 Locked Rules are canonical and binding:

1. Source-of-truth hierarchy (code > canonical > user-curated memory > auto-memory) — anti-drift.
2. Roster lock: BaseAgent.js compile-time validates EXACTLY **26** unique agent IDs (was 25 prior to CA-9-B / ENTRY 005, 2026-05-15). The 26-agent partition at code base `19c554b` is canonical: **8 FlowAI-internal-only** (#4, #5, #8, #11, #12, #14, #16, #18) + **18 embedded** (#1, #2, #3, #6, #7, #9, #10, #13, #15, #17, #19, #20, #21, #22, #23, #24, #25, #26). `validateRosterPartition()` IIFE enforces partition size 26 + cumulative ID range [1, 26].
3. Three complementary governance mechanisms (95/95 + 6-step Clearance + Monitor 0–50) must all pass.
4. **Tool Intelligence axis (§8) and System Operation axis (§8a) — both LOCKED to AUTOMATIC / GUIDED / MANUAL per CA-18 §6 ENTRY 019.** The single global triad applies to both axes; they remain independent (any of the 9 combinations is valid). Prior Rev-2 labels (Auto / Recommended / User-Choice for §8; Hands-On / Reviewed / Hands-Off for §8a) and Rev-1 labels (Auto / Guided / Manual for §8; Manual / Supervised / Autonomous for §8a) are retained as historical aliases for shipping continuity but are NOT used in new canonical text, dispatches, audit-log payloads, or Panel discourse. The §3 iteration model of `docs/specs/FLOWAI_MISSION_PURPOSE_AMENDMENT_DRAFT.md` uses the same triad.
5. Multi-AI peer review (10-AI Panel) mandatory for substantive outputs.
6. Five-layer intelligence framework (L1 Functionality, L2 Operational, L3 Financial, L4 Business, L5 GTM) — mandatory tagging per `src/lib/operationsEngine.js` FIVE_LAYER_FRAMEWORK.
7. Seven Objective Lenses (audit_demo / investor_review / full_governance / compare / combine / benchmark / launch_readiness) per `OBJECTIVE_LENSES`.
8. LLM model standard: pipeline steps use claude_sonnet_4_6 by default; cost-aware budgeting required (§7 of Orchestra spec).
9. Automation-first: the run's authorized operator pastes + approves only. During Level L1, that operator is the CEO for VEU products. No operator-side GUI hunting or manual edits.
10. Complete replacement files, never diffs in dispatches.
11. Workstream routing per §23.
12. Cadence: W0 does not impose timing; CEO sets cadence.
13. Panel approval mandatory for every build step; CEO retains absolute veto.
14. Real production products under continuous crawl + fix at any time; no maintenance windows.
15. Aggressive URL + wiring verification per §6.
16. Continuous marketplace intelligence + Self-Renewal Alerts ≥monthly.
17. Every W0x→authorized-operator message requiring action must be Panel-reviewed (≥7/10) before delivery when it is a KEY dispatch. During Level L1 this resolves to W0x→CEO.
18. Tool Intelligence Marketplace ranking formula canonical per §8 + `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md`. Top-5 platforms per Auto Runner step ranked by performance + cost + speed + reliability; rankings research-driven (not hardcoded) and refreshed monthly per CA-18 §6 ENTRY 019. Selection-mode triad LOCKED at AUTOMATIC / GUIDED / MANUAL per Locked Rule 4.
19. **Phase A (surface) vs Phase B (adversarial interactive) — DO NOT CONFLATE.** §7.6 score = Phase A signal. §11 Clearance Step 5 requires Phase A + Phase B. A §7.6 score alone is NOT a functional certification. LIMITATIONS disclosure per §7 CA-14-A canonical text (ENTRY 015) is mandatory for every operator-facing delivery. Phase B is owned by Agent #21 ACE Conductor per §15.1 row 21 (ENTRY 015 CA-14-A-Q3 ratification).

---

## 26. CURRENT PHASE STATUS (2026-05-14, post-PROTECT-1)

**Rev-1 §17 said "Phase 0 COMPLETE."** Panel Slot 7 flagged this as out of date — Sprint PROTECT-1 is the most recent canonical sprint. Rev-2 fixes per gap #14.

| Subsystem | Status |
|---|---|
| Sprint history (CANONICAL_REFERENCE) | Sprint 5 → Sprint PROTECT-1 (most recent); plus POST-PROTECT-1 architecture + GTM Demo Stack + Agent Contract Layer (in codebase, not yet in ReleaseNotes.jsx) |
| Branch | flowai-v0.1 |
| Phase 0 (Foundation, commit `5dec08d`, 387 tests) | COMPLETE |
| P1 Integrity Fixes (merge `1683a96`, 2026-06-02) | COMPLETE — product-scoped research current-state fallback fixed; build scorer requires real code-task evidence; unsupported CA18 VERIFIED rows downgraded to PARTIAL; Agent #26 registry/validator consistency restored; `lint:evidence` chained into `npm run audit:commit`. |
| P2 Live Execution (merge `08b9da4`, hotfix/review closeout `b93e330`, 2026-06-04) | COMPLETE / WIRED — Research, Design, Build, and Quality Audit runners dispatch through Orchestra/tool-selection paths with ranked tool visibility, crawl/source/timeout guards, and SSRF transport revalidation. Evidence: UNIT, MOCKED_E2E, and LIVE_PRODUCTION proof. No VERIFIED promotion. |
| P3 ProductSSOT Minimal (merge `f8310b9`, 2026-06-04) | COMPLETE / WIRED — forge artifact endpoint, authenticated persistence path, browser service-role removal, and visible persistence states implemented. Evidence: UNIT, MOCKED_E2E, and LIVE_PRODUCTION proof. No VERIFIED promotion. |
| P4 Forge Step 5 Deploy (merge `8c7d204`, proof patch `4aba52c`, 2026-06-04) | COMPLETE / WIRED — deploy runner/template/scorer/logger/page/route added with operator-gated delivery artifact handling and route proof. Evidence: UNIT, MOCKED_E2E, and LIVE_PRODUCTION proof. No VERIFIED promotion. |
| P5 Forge Step 6 Self-Renewal (merge `e07318f`, 2026-06-04) | COMPLETE / WIRED — Self-Renewal forge step wraps Agent #3-style renewal behavior with operator-gated mutation discipline. Evidence: UNIT, MOCKED_E2E, and LIVE_PRODUCTION proof. No VERIFIED promotion. |
| P6 Forge Step 7 GTM (merge `46ebfc7`, 2026-06-04) | COMPLETE / WIRED — GTM runner/template/scorer/logger/page added with evidence-gated readiness output. Evidence: UNIT, MOCKED_E2E, and LIVE_PRODUCTION proof. No VERIFIED promotion. |
| P7 Forge Step 8 Monitor (merge `48e3f65`, 2026-06-04) | COMPLETE / WIRED — Monitor runner and live-check-gated ProductSSOT write path added. Evidence: UNIT, MOCKED_E2E, and LIVE_PRODUCTION proof. No VERIFIED promotion. |
| P8 Symbiotic Loop (merge `55a6e7a`, 2026-06-04) | COMPLETE / WIRED — ProductSSOT run-context read, SSE surfacing, and final run-summary write implemented for run-to-run continuity. Evidence: UNIT, MOCKED_E2E, and LIVE_PRODUCTION proof. No VERIFIED promotion. |
| P9 Reference Vertical Slice (merge `71b3500`, 2026-06-04) | COMPLETE / WIRED — current reference fixtures execute steps 1-8 through product-agnostic contracts in the vertical-slice harness; core runtime remains free of reference-product names. Evidence: UNIT, MOCKED_E2E, and LIVE_PRODUCTION proof. No VERIFIED promotion. |
| Agents shipped / implemented subset | #1 Lifecycle Engine, #2 Code Builder, #3 Self-Renewal, #4 Provider Onboarding (PARTIAL), #5 End-Customer Intake — implementation evidence exists; runtime-active and production-verified status remain separate from the 26-agent roster count |
| Agents dormant / not runtime-verified | Remaining rostered agents are not presumed runtime-active or production-verified until wired and evidenced; roster count is 26 per Locked Rule 2 |
| W2 three-input renewal pipeline | SHIPPED on neutral test fixtures (commit `9b4e511`); Orchestra direct-write available via fork-and-fix path |
| Self-Governance Layer (Sprint 5) | LIVE — Self-Test, Self-Audit, Self-Protect, Self-Heal, Four Human Gates |
| Self-Renewal + Self-Protection Capability Packages (Sprint PROTECT-1) | LIVE — install sprints for all 5 VEU products |
| Tool Intelligence Marketplace (Sprint 8 — 61 tools / 13 categories) | LIVE per `src/lib/toolRegistry.js` (61 actual tools / 13 actual categories; marketplace UI exposes 14 filter labels including `All`) |
| 6-step Clearance Protocol (Sprint 9) | LIVE at `/clearance` |
| 6-section sidebar (post-ARCH-1) | LIVE per `src/components/layout/Sidebar.jsx` |
| GovernanceAuditLog (Sprint HARD-1) | LIVE; `/audit-trail` read-only surface |
| Doppler integration | LIVE (commit `8e29e84` + `ae0441c`) — 4 keys provisioned |
| Vercel Deployment Protection bypass | LIVE (commit `c533e2d`) |
| W03 Standing Operating Protocol | CANONICAL (commit `6e9660e`); maximum-oversight configuration |
| CA ratifications | CA-1 (9/10), CA-2 (8/10), CA-3 (8/8 engaged) ratified. CA-4, CA-5, CA-6, and CA-16-B withdrawn as market/user-driven design questions per ENTRY 020. |
| Layer 1 SSOT | CANONICAL — `docs/FLOWAI_SSOT.md` (commit `fbaf881`), amended `1d65aba` |
| Layer 2 Implementation Plan | CANONICAL — `docs/FLOWAI_IMPLEMENTATION_PLAN.md` (commit `6d0ccbb`) |
| Layer 3 Engineering Spec | CANONICAL — `docs/FLOWAI_ENGINEERING_SPEC.md` (commit `c5720a5`) |
| Layer 4 Building Guidance | STUB — §28.7; full content deferred to Layer 4 Building Guidance dispatch |
| Self-Renewal Agent #3 graduation spec | DRAFT — `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` (commit `446ddb5`); 5 prior open questions resolved-by-code per §27 |
| Orchestra Integration spec | DRAFT — `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` (commit `38b1a23`); 9 questions disposed per §27 (Q1/Q4/Q5 code-supported, Q6 resolved, Q2/Q3/Q7/Q8/Q9 DEFER-TO-BUILD) |
| SSOT W04-Rev-1 | DRAFT — superseded by THIS document (Rev-2) per Panel verdict |
| SSOT W04-Rev-2 | RATIFIED — v2.3 |
| Next gate | (1) Production Hardening (RLS + observability + CI/CD) before graduating remaining rostered agents — Panel Q4 verdict from 2026-05-14 consolidated consultation, plurality (b) Production Hardening; (2) Layer 4 Building Guidance full dispatch; (3) DEFER-TO-BUILD items from §27 |

---

## 27. OPEN QUESTIONS AND DISPOSITIONS (CA-DELIVERY-DISTRIBUTION-GOVERNANCE)

Open-question count after ENTRY 020: **0 unresolved questions in this section.** Some implementation work is explicitly DEFER-TO-BUILD; that state affirms canonical intent without claiming implementation or verification.

P1 Integrity Fixes (merge `1683a96`, 2026-06-02) did not close any additional §27 open question: this section already had **0 unresolved questions** after ENTRY 020, and no listed unresolved Agent #26 registry-presence question remained to decrement.

1. **Tool count: RECONCILED.** Current `src/lib/toolRegistry.js` shows **61 tools across 13 actual categories**. The marketplace UI exposes 14 filter labels including `All`; code wins per Locked Rule 1, so current canonical count is 61 tools / 13 categories.

2. **Flow-builder code: RESOLVED-LEGACY-WIRED.** The pre-Sprint-5 flow-builder code is legacy but wired, not dead-in-place. Entities `SavedFlow`, `FlowVersion`, `FlowRun`, `FlowComment`, routes/links/webhook surfaces, and `components/designer/*` / `components/flows/*` must be archived only through a future cleanup dispatch that traces live reachability and leaves a tombstone. It must never be blindly deleted.

3. **Self-Renewal Agent #3 spec open questions: RESOLVED-BY-CODE.** This disposition does not promote production verification; it records that the spec questions have code-grounded answers:
   - Q1 modes: `src/lib/agents/agents/Agent3SelfRenewalExecutor.js` lines 9–20; `api/agent/3/execute.js` lines 7–11 and 53.
   - Q2 authority: `src/lib/agents/_registry.ts` lines 99–103 (primary `recommend_only`); `src/lib/agents/_registry.ts` lines 613–620 (`EXECUTOR_REGISTRY` entry).
   - Q3 severity: `src/lib/agents/severity.js` lines 1–87 (3-tier severity logic); `api/agent/3/execute.js` lines 106–110 (tier enforcement).
   - Q4 execution: `api/agent/3/execute.js` lines 1–4 (sync endpoint); `api/_lib/inngest.js` lines 134–148 (async enqueue).
   - Q5 re-crawl: `src/lib/agents/verification.js` lines 1–17 (sampled setup); `src/lib/agents/verification.js` lines 21–87 (decision logic); `src/lib/agents/verification.js` lines 89–180 (recrawl execution).

4. **Orchestra Integration spec open questions: PARTIAL DISPOSITION.** Count confirmed: 9 questions. Q1/Q4/Q5 are CODE-SUPPORTED (wired, not fully productized). Q6 is RESOLVED by ENTRY 019. Q2/Q3/Q7/Q8/Q9 are DEFER-TO-BUILD and must be implemented when Orchestra integration is built post-spine.

5. **Ops Runner #21 crawl / step wiring: DEFER-TO-BUILD.** Agent #21 Aggressive Crawl Conductor remains the always-on / dual+gate Ops Runner agent. Engineering dispatch must complete #21's crawl / step wiring before it can ship. Agents #22–#25 are now business-advisory, recommend-only, embedded agents under ENTRY 023; #26 is Legal & Communications, recommend-only, embedded. The prior "5 Ops Runners" step-assignment framing is superseded.

6. **Multi-LLM routing decision engine: DEFER-TO-BUILD.** Agent #4 Provider Onboarding remains the natural owner, but the centralised routing engine is not canonicalized as built until Agent #4 graduation or a later key dispatch.

7. **Capability Transfer as L4 completeness check: DEFER-TO-BUILD.** §4 remains the canonical L4 surface; future capabilities should state whether they ship as transferable packages when their build dispatch lands.

8. **Orchestra Selection axis rename: RESOLVED at CA-18 §6 ENTRY 019.** The canonical user-facing triad is LOCKED at AUTOMATIC / GUIDED / MANUAL across §8 + §8a + §3 iteration model + §17 sidebar. Historical enum strings remain valid engineering aliases.

9. **Per-mode role gates on Human Gates: RESOLVED-BY-§13/§10.2.** Approval Gate (95/95 override) is admin-only. Operators can re-run but cannot override 95/95.

10. **CA-4 + CA-5 + CA-6 dispositions: WITHDRAWN.** CA-4 (Year-1→6 journey), CA-5 (commercial rail beyond Stripe Connect), and CA-6 (commercial architecture section) are market/user-driven questions with no canonical position taken at ENTRY 020; each may reopen as a future CA-N based on market/user evidence.

11. **Pre-Rev-1 axis labels in shipped code: RESOLVED at CA-18 §6 ENTRY 019.** The sidebar names are canonically aligned with the AUTOMATIC / GUIDED / MANUAL global lock per Locked Rule 4; no surface/canonical gap remains.

12. **Layer 4 Building Guidance status: RESOLVED-AS-STUB.** §28.7 now records the Layer 4 Building Guidance stub. Full content is deferred to the Layer 4 Building Guidance dispatch.

---

## 28. SYMBIOTIC FEED-BACK LOOP (NEW — CA-10-D / ENTRY 005)

The ProductSSOT entity defined in §7.5 is not write-only. Before every pipeline run on a product (any of the 4 input modes per §5; any Orchestra-selection mode per §8 + §8a), the AutoRunner **reads the target product's ProductSSOT row** for the target environment and threads it as canonical context input. This closes the loop: the output of run N becomes input to run N+1 — a living, self-referential document rather than a write-only archive.

### 28.1 Pre-pipeline-run read

AutoRunner loads the ProductSSOT row for `(productId, environment)` at run start and threads the relevant blocks into per-step context:

| Pipeline step | ProductSSOT blocks consumed | Effect |
|---|---|---|
| **Step 1 Research** (Agent #6, DORMANT) | `build_brief` + `architecture_snapshot` | Skip re-discovery of already-known artifacts. Crawl scope per §6 is **narrowed** to surfaces NOT covered by `architecture_snapshot.pages[]` from the last snapshot — saves Browserless minutes + cost. |
| **Step 4 Quality Audit** (Agent #8, DORMANT) | Prior `governance_record` 95/95 scores | Surface trend lines (is the product improving or regressing?). |
| **Step 6 Self-Renewal** (Agent #3, SHIPPED-GREEN) | Prior `delta_log` entries | Detect repeated-fix loops: if the same `issue.category` was resolved 3 times in 30 days, escalate per §10.2 Human Gate. |
| **Step 7 GTM** (Agent #9, DORMANT) | `governance_record_entry` of kind `clearance_step` | Surface uncleared steps that GTM should not advance past. |

### 28.2 Crawl-scope narrowing (Agent #6 per CA-10-D.3)

For a product with a **stable ProductSSOT** (≥3 prior pipeline runs in last 30 days, no `architecture_drift_detected` flag set), Agent #6 narrows the crawl scope per §6 to:

- **New routes** not in `architecture_snapshot.pages[]` (delta discovery).
- **Surfaces flagged by customer issues** per `delta_log.triggeredBy === 'agent10_customer_issue'`.
- **Surfaces flagged by drift detection** per §16.3.

This is both a **cost optimisation** + a **fidelity improvement**: known-good surfaces are not re-validated every cycle; new + suspect surfaces get focused attention. Full re-crawl remains available as an explicit user action (`Force full crawl` toggle in AutoRunner) for cases where ProductSSOT integrity is suspect or for periodic deep audits.

### 28.3 Admin overrides as authorized-operator-equivalent directives

Per CA-10-D.2 and ENTRY 020, **human annotations and overrides on the ProductSSOT (per §13.1) are treated as authorized-operator-equivalent directives for that product's subsequent pipeline runs.** Concretely:

- An admin annotation "Score this 95/95 even though dependency X looks deprecated" on the `architecture_snapshot` entry for dependency X **suppresses** the Quality Audit dimension-score deduction for that dependency in subsequent runs.
- An `Override` entry on a `delta_log_entry`'s `issue.severity` from `high` to `medium` re-routes future similar issues to the `medium` severity gate (per §12 mode routing).
- Annotations and overrides are themselves audit-logged + version-history-tracked (per §14.2 hash chain) + Panel-reviewable. A Panel consultation can be raised to challenge any admin override per Locked Rule 17.

### 28.4 Conflict resolution (auto-gen vs admin override)

When an admin override conflicts with the next auto-generated entry (e.g. admin overrode an issue's severity from `high` to `medium`, but Agent #10 detects the same issue in next run with `high` severity again), **admin override always wins** (per CA-10-D.2 + CA-10-Q3=(a)). The new auto-gen entry is still created (audit completeness) but flagged `overridden=true` with a reference to the existing override. The admin can revoke the override at any time by appending a new override entry that restores the auto-gen behaviour (audit trail preserved).

### 28.5 §4 + §6 + §9 cross-link footers

The §4 L2 ("FlowAI on Itself") and L3 ("FlowAI on External Products") status footnotes are read as: every L2 + L3 pipeline run reads the target product's ProductSSOT as canonical context input; the crawl scope per §6 is narrowed accordingly; admin annotations + overrides are treated as authorized-operator-equivalent directives for that run. The ProductSSOT is updated atomically with the run output per §7 (amended Output Contract item #5) — failure to write ProductSSOT rolls back the entire run.

§9 (8-step pipeline) footer: at run start, AutoRunner loads the target ProductSSOT row and threads it into the per-step context. Agents #6, #8, #3, #9 (when graduated from DORMANT) consume the relevant blocks; Agent #10 produces updates to the affected blocks. The Self-Renewal Executor (per CA-7 §15.5) writes the final `delta_log_entry` on run completion.

### 28.6 Purpose-Driven Optimization Loop — numeric-floor exit (CA-15-C-Q1 canonical per ENTRY 017)

The repeat-until-GTM Purpose-Driven Optimization Loop's exit criterion uses **numeric-floor-only** semantics — **no LLM-judged purpose-alignment check participates in the exit gate.**

**Loop exit conditions (ALL must hold):**

1. §7.6 GTM Readiness score ≥ the canonical floor (current canonical floor unchanged from ENTRY 006 — 75 for Demo-ready, with per-product operator-config retained; the uniform-≥95 directive is deferred per CA-13 disposition below).
2. Zero `critical` findings open per CA-14-A canonical + ENTRY 015.
3. Self-Renewal terminal on all `high` findings per CA-14-A + ENTRY 015 (terminal = Resolved / Documented-with-rationale / Human-gated).
4. LIMITATIONS section published per CA-14-A-Q2 ENTRY 015 verbatim wording.
5. Phase B pass per CA-14-A canonical + Agent #21 Phase B charter (ENTRY 015 §15.1 row 21).

**CA-15-C-Q2 elimination (per ENTRY 017):** the hardcoded `purpose_fulfillment_score ≥ 0.7` threshold from CA-15 v1 is ELIMINATED entirely. No purpose-fulfillment-score parameterization (neither hardcoded nor operator-config knob) exists in canonical SSOT. The v2-era strengthen variant "add `product_purpose` non-null as 6th exit condition" is MOOT because `product_purpose` itself is not in canonical (per CA-15-B disposition at §7.5 above).

**CA-15-B-Q2 forward-looking discipline (per ENTRY 017):** if a future CA ever re-introduces purpose information to canonical SSOT, only the `described` (operator-supplied) capture mode is admissible. `inferred` (LLM page-content analysis) and `synthesized` (multi-source merge) modes are PERMANENTLY forbidden — they were rejected at CA-15 v2 7/9 and the discipline carries forward as a canonical rule even though purpose is presently outside SSOT.

**CA-15-B-Q3 tooling discipline (per ENTRY 017):** placeholder detection (lorem-ipsum, "TBD", etc.) lives in `scripts/lint-product-purpose.mjs` tooling, NOT canonical SSOT. The same tooling layer ALSO hosts `scripts/lint-content-quality.mjs` + `scripts/lint-accessibility.mjs` per the CA-15-A disposition at §10.1 above — tooling discipline applied uniformly across the three lint domains.

PURPOSE_DRIFT detection (CA-15-C-Q3) was NOT disposed in CEO Decision B and is NOT canonical at ENTRY 017. The §6 closed-kind list at the build/wire engine §29 S6 invariant references `purpose_drift_annotation.v1 severity:'critical'` only because the binding spec for the build/wire engine names that kind as a future-extension hook; emission of that envelope is not currently a canonical FlowAI capability and remains for a future CA-N if/when drift detection lands.

### 28.7 Layer 4 — Building Guidance

#### §28.7.1 CODING STANDARDS

ESM (import/export only; never `require()`). TypeScript for agent registry and governance files; JavaScript elsewhere. No platform SDK/proxy/runtime dependency in FlowAI output code. Complete replacement files only — never diffs, never "change line N". Product-agnostic rule §22 applies to all core files: zero product names in forge, agents, or shared runtime.

#### §28.7.2 TESTING STANDARDS

Vitest for all tests. `npm run preflight` must pass before any commit (only the 3 accepted baseline failures). `npm run audit:commit` must pass (docs scope warning acceptable; new failures are blockers). Every new capability requires at least one test; stubs without tests are marked `verified:false` and excluded from scoring. File:line citations must be confirmed against actual source before written to any SSOT doc — fabricated citations are prohibited.

#### §28.7.3 DEPLOYMENT STANDARDS

One branch per dispatch (format: `flowai/<scope>-<purpose>`). Merge to main via `--no-ff` with message format `"<scope> | <purpose> | <summary>"`. CEO authorizes every push to origin — no auto-push, no CI auto-promote. After every merge+push, promote the topmost Vercel deployment to Production; never promote an older deployment. All environment variables through Doppler; never hardcoded in commits.

#### §28.7.4 PEER-REVIEW AND DISPATCH GOVERNANCE

KEY dispatch: 4-reviewer panel (CB/CR/CD/CG) before CB builds. Key = changes behavior / scoring / governance / deploy / persistence / agent authority / SSOT meaning / verification status. CLEANUP dispatch: no panel; behavior-preserving only (renames, comments, dead-code removal, file moves, doc-consistency propagation). Every CB dispatch must include: explicit action label (BUILD / READ-ONLY / CLEANUP BUILD), STOP conditions for unexpected state, single commit scope, and "DO NOT START until W04 sends CLEAR TO BUILD" on Panel-first dispatches. CB is the sole codebase writer. W04/CR/CD/CG/WT never write code. W04 confirms every first-round Panel issue is addressed before CB re-drafts / W04 re-clears.

HOTFIX exception: HOTFIX applies only when production is broken or a live security exposure exists. CB drafts a narrow hotfix dispatch from actual codebase state. Minimum pre-merge review is W04 adjudication plus one independent reviewer report, preferably CR for security/runtime or CD for SSOT/data-shape. CEO may authorize expedited build, merge, push, and promotion. After merge, a retroactive full Step 5 review by CD and CR plus Step 7 production proof is mandatory. No non-hotfix phase work may resume until the retroactive Step 5 and Step 7 proof are complete. Any residual blocker becomes an immediate patch dispatch. HOTFIX does not allow VERIFIED promotion.

#### §28.7.5 IP PROTECTION STANDARDS

FlowAI is internal infrastructure — never sold as SaaS, never open-sourced, never white-labeled. Self-Protection Agent #13 governs IP: robots.txt, X-Robots-Tag noai/noimageai, Cloudflare Bot Management, rate limiting, code obfuscation, DMCA-ready templates. Staging URLs and internal tokens must never appear in commit messages or docs.

#### §28.7.6 SSOT AND MEMORY DISCIPLINE

`CANONICAL_REFERENCE.md` is the single SSOT — never trust memory alone for canonical facts; fetch the live doc before any synthesis. WIRED ≠ VERIFIED: no claim advances to VERIFIED without evidence at the appropriate Tier floor (A persistent / B behavioral / C never counts). Every CA amendment requires a pre-promotion snapshot per §18.3 before archival. No ratification from a summary — always on the full canonical document in its current state. Citation language in §27 and all disposition records: "Code support located at..." — descriptive, not evidentiary. Never "VERIFIED by..." unless production evidence exists.

##### §28.7.6 P1 evidence-discipline gate

P1 evidence-discipline gate (merge `1683a96`, 2026-06-02): `scripts/lint-evidence.mjs` is registered as the matrix evidence gate and is chained into `npm run audit:commit`. Any `matrixArtifact` entry with `status === "VERIFIED"` must include all three fields: `evidenceUrl`, `verifiedAt`, and `verifiedBy`; missing or empty values fail the gate.

#### §28.7.7 OPERATING CADENCE

AI time frame: work in seconds and minutes — no week/month estimates. CEO is paste-and-approve only: every instruction reduces to a click (URL or window name) plus a copy-paste-ready block. Auto-approve all git read commands; ask permission only on `git push`, `git reset --hard`, or `git rebase`. CB runs one task at a time; CR and CD may read in parallel. W04 surfaces the next decision the moment a gate is ready.
---

## 29. BUILD/WIRE CONSTRUCTION ENGINE (NEW — CA-17 canonical per ENTRY 016)

The Build/Wire Construction Engine is the canonical mechanism by which detected shell/mock surfaces are converted into real wired software. It operates ALONGSIDE the Self-Renewal Executor (per CA-7 §15.5) — it does NOT replace it. Construction-class operations follow the eight-invariant safety contract S1–S8 specified at:

**Binding canonical contract:** [`docs/specs/BUILD_WIRE_ENGINE_SPEC_V3_FINAL_DRAFT.md`](specs/BUILD_WIRE_ENGINE_SPEC_V3_FINAL_DRAFT.md) (commit `1d5e39b`, 33,974 chars). Ratified as CA-17 per CEO Locked Rule 13 (Decision A, 2026-05-19) after documented J2→v2→re-Panel oscillation (Panel non-convergence 0/8 at W6 v2 4-run re-Panel commit `4400958` is the trigger for CEO disposition per Locked Rule 13).

**NON-OVERRIDABLE fidelity statement (verbatim from the binding spec; preserved exactly per Path H ENTRY 014):** *"the CEO-locked NON-OVERRIDABLE invariants are EXACTLY **S2 / S4 / S5 / S6** per Path H ENTRY 014 + Locked Rule 13. No other invariant carries non-overridable status. **S1 / S3 / S7 / S8 are PANEL-RATIFIABLE.** NON-OVERRIDABLE invariants remain strengthen-only with no reject path."*

**Eight invariants (S1–S8, v3-final disposition):**

| # | Invariant | Status | v3-final disposition (per binding spec §3) |
|---|---|---|---|
| **S1** | Pre-construction baseline | PANEL-RATIFIABLE | 6-field MANDATORY baseline (§7.6 score+findings; §10.1 5-dim audit snapshot; per-page DOM hashes; per-endpoint response hashes; schema fingerprint; dependency-graph fingerprint). 4-field admin-opt-in extended baseline (runtime-config, feature-flag, background-job, external-service contract) via `product_registry.construction_extended_baseline_enabled` toggle, default OFF. |
| **S2** 🔒 | Bounded scope | **NON-OVERRIDABLE** | System caps 15 files / 1500 lines / 3 new deps / 4 dep-graph-radius; **per-file density ceiling 100 lines/file** (tightened from v2's 150). Exceeding any cap aborts with `construction_scope_violation.v1` BEFORE any code is written. |
| **S3** | Schema migration testing | PANEL-RATIFIABLE | 5-pillar (idempotency, drift, lock contention <5s p99, reversibility, **DLP = pg_dump + FULL-RESTORE to CI-ephemeral DB + row-count-diff <0.1%** for any `DROP COLUMN` / `DROP TABLE` / `TRUNCATE`; replaces v2 checksum-only). |
| **S4** 🔒 | Construction security suite | **NON-OVERRIDABLE** | **9 pillars** (SQLi, XSS, auth-bypass, secrets-leakage, dependency-CVE, authz-regression incl. deletion-detection, SSRF, rate-limit/abuse, **CSRF**). CSRF added as 9th pillar in v3-final: state-changing endpoints (POST/PUT/PATCH/DELETE) must have CSRF-token check OR SameSite=Strict/Lax cookie; advisory hybrid NOT adopted (CSRF is hard). |
| **S5** 🔒 | Rollback substrate | **NON-OVERRIDABLE** | Pre-commit snapshot + CAS commit + real-rollback dry-run in CI + 30-day retention primary (admin-configurable 90-day option, hard bounds [30, 90]) + **auto-detect + auto-prepare + operator-confirm-to-fire** rollback on Phase B post-merge failure. Auto-execution-without-confirm REJECTED; invariant preserved via execution gate. New envelope `construction_auto_rollback_pending_operator_confirm.v1`. |
| **S6** 🔒 | Pre-construction approval | **NON-OVERRIDABLE** | Admin-required-all-classes + 15-min freshness + rationale-quality (≥60 chars, canonical stop-word rejection) + **narrow in-flight invalidation on the closed 6-kind set** (`construction_pre_baseline.v1`, `architecture_snapshot.v1`, `gtm_bar_admin_override.v1`, `gtm_bar_admin_override_used.v1`, `construction_class.v1`, `purpose_drift_annotation.v1 severity:'critical'`). Over-broad "any new entry" invalidation REJECTED at Panel 5/10. Closed set; future additions require explicit CA amendment. |
| **S7** | Branch-of-record | PANEL-RATIFIABLE | Per-product `self_renewal_branch` only per CA-14-D-Q1 ENTRY 015 cleared-8. v2's per-session sub-branches REMOVED. Any future session isolation is a new CA-N design question; CA-16-B is WITHDRAWN per ENTRY 020. |
| **S8** | Post-construction Phase B | PANEL-RATIFIABLE | Pre-PR Phase B only (v1 form; per-class coverage per binding spec §3.8). v2's live-preview post-merge + dual-load + connection-pool / memory-leak / transaction-deadlock backend probes all REMOVED. Existing Agent #21 Phase B charter (ENTRY 015 §15.1 row 21) operates post-deploy as normal, independent of S8. |

**Four construction classes (canonical per binding spec §2):** `wire_up` (1–5 files), `endpoint_generation` (3–10 files), `schema_migration` (1–3 files; DLP-gated), `redesign_implementation` (operator-declared ≤ system cap; broader redesign/build environment questions are withdrawn by ENTRY 020 unless reopened as a new CA-N).

**Conformance test inventory:** **48 tests total** (S1: 4, S2: 6, S3: 5, S4: 9, S5: 8, S6: 8, S7: 3, S8: 3, §4 lifecycle: 2) per binding spec §10. When CA-15-D v3 SSOT-Conformance Gate ratifies (§19.1 below), these tests register in `src/lib/conformance/__tests__/build_wire_engine/`.

**Failure envelopes (canonical):** 26 envelopes total (v1's 19 + 6 v2-retained + 1 v3-final NEW: `construction_auto_rollback_pending_operator_confirm.v1`). Removed in v3-final: `redesign_session_subbranch_merged.v1` (S7 revert) + `construction_phase_b_post_merge.v1` (S8 revert).

**Path H Stage 3 status — UNBLOCKED.** CA-17 ratification (this entry) UNBLOCKS Path H ENTRY 014 Stage 3 (build/wire). Engineering dispatch implements per the binding spec's lifecycle (binding spec §4) + 48-test conformance inventory; canonical authority for any spec deviation rests with the binding spec file at the commit ratified by ENTRY 016.

**Cross-CA dependencies preserved (per binding spec §9):**

- CA-14-D-Q1 ENTRY 015 cleared-8 atomic-audit-write invariant — S5 inherits.
- CA-14-A LIMITATIONS + Phase B per ENTRY 015 cleared-8 — S8 + §15.1 row 21 unchanged.
- CA-15-C v3 PURPOSE_DRIFT_CRITICAL — S6 narrow in-flight invalidation kind 6 (when CA-15 lean-down lands per ENTRY 017).
- CA-16 SPLIT (`e8bb7d4`) — superseded by ENTRY 020 for CA-16-B/C dispositions: CA-16-B WITHDRAWN, CA-16-C resolved as canonical target-class delivery contract with implementation deferred to class build dispatches. S7 explicitly does NOT take on Redesign/Build Environment session-isolation responsibilities.

---

*End of W04-Rev-2.1 + CA-7/CA-8/CA-9/CA-10 promotions. 14 Panel-cited gaps from Rev-1 addressed in Rev-2 (§3 metadata-driven, §4 L4 Capability Transfer, §6 resolution clarification, §8 / §8a axis rename, §10 Self-Governance Layer, §11 6-step Clearance, §12 mode-to-pipeline wiring, §13 auth + roles, §14 GovernanceAuditLog, §15 26-agent roles + OrchestratorHub-vs-Orchestra, §16 deployment infra, §17 6-section sidebar, §18 CA-n cycle, §26 phase status). CA-7 added §15.5 EXECUTOR_REGISTRY. CA-8 added §20.2 X-Test-Bypass-Token Contract. CA-9 (ENTRY 005) added §8.1 Orchestra Self-Expansion + historical Agent #26 Orchestra Research + customer feedback loop; ENTRY 023 supersedes the active Agent #26 identity with Legal & Communications and assigns active Orchestra membership ownership to `orchestra-membership-executor` while preserving historical lineage. CA-10 (ENTRY 005) added §7.5 ProductSSOT + §13.1 role gates + §28 Symbiotic Feed-Back Loop + §11 Step 4 + §14.3 retention extensions. ENTRY 020 disposes §27 open questions; remaining work is tracked as DEFER-TO-BUILD where applicable.*

---

## Dispatch 0 Reconciliation — Agent Roster and Forge Loop

**Canonical agent roster count:** 26 agents. The roster count is not an implementation claim; every agent must be tracked separately as rostered, implemented, wired, runtime-active, and production-verified.

**Canonical Step 5-8 order:** Step 5 Deploy, Step 6 Self-Renewal, Step 7 GTM, Step 8 Monitor. "Govern" remains a registry/capability vocabulary, governance surface, audit function, and clearance concern; it is not the product-workflow Step 6 label unless a future CEO-ratified SSOT amendment changes the eight-step product workflow.

**Current forge implementation status:** Forge Research, Design, Build, Quality Audit, Deploy, Self-Renewal, GTM, and Monitor are scaffolded, routed, tested, and WIRED through the P2-P9 implementation path. ProductSSOT minimal persistence, symbiotic run continuity, ranked tool visibility, SSRF transport revalidation, and reference vertical-slice execution are implemented with UNIT, MOCKED_E2E, and LIVE_PRODUCTION proof. These are implementation and behavioral-evidence claims only; production-grade VERIFIED status still requires the matrix evidence fields (`evidenceUrl`, `verifiedAt`, `verifiedBy`) and the claim-promotion checklist.

**Evidence vocabulary rule:** scaffolded, wired, tested, live, and VERIFIED are distinct statuses. WIRED does not equal VERIFIED; production-grade VERIFIED requires live evidence tied to the relevant SSOT claim, not merely code, routes, tests, mocks, or local scaffolds.

**Next-build gate:** P10 reconciles claims without promotion, then P11 graduates step-owner agents through `OrchestratorHub.invokeStepOwner`, and P12 removes remaining Ring-A product-specific allowlists through registry-driven onboarding.

---

## CA-W11-TOOL-SELECTION
**Description:** Globally-underserved-first tool
ranking is canonical FlowAI OS behavior. All forge
steps use underserved-first weighted composite
scoring (0.50 performance / 0.25 accessibility /
0.15 cost / 0.10 resource) when selecting tools
via ToolIntelligenceService. Day-1 signal is flat
pending W11-cleanup catalog enrichment. Framework
is live. Policy is active.

**Status:** PARTIAL

**Evidence tier:** B pending Tier-A from live
runner output

**Files:** src/lib/forge/toolSelection.js

**Note:** underserved_accessible is the canonical
field for underserved accessibility. The legacy
underserved_accessible field was renamed in W11-cleanup.
---
