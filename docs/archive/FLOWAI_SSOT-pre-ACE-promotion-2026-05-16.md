# FlowAI SSOT — W04-Rev-2.1 (DRAFT — applies 4 W6-Panel-cited minor amendments to Rev-2)

Version: **W04-Rev-2.1** | Date: 2026-05-14 | Status: **CANONICAL — ratified by CEO 2026-05-14**
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

---

## 2. MISSION — DEMOCRATIZATION

FlowAI democratizes AI-powered product creation for **underserved market segments globally** (per CA-1 + CA-2, canonical 2026-05-14):

- Underdeveloped economies (Sub-Saharan Africa, parts of Latin America, parts of South/Southeast Asia).
- Rural communities in developed countries.
- Low-income urban populations anywhere.
- Neglected language / cultural groups.
- Small businesses and individuals priced out of enterprise AI tools regardless of geography.

**Target users:** individuals and small business owners with no engineering background; solution providers building personalized apps for niche communities; organizations in underserved segments; VEU AI Studio (Year 1 primary internal user).

**What FlowAI enables:** create native apps / mobile apps / SaaS / Agentic AI; audit, benchmark, improve any digital product; deploy working products with real URLs — no code required.

---

## 3. COMMERCIAL MODEL + METADATA-DRIVEN ARCHITECTURE

**Pricing surface:** licensed OS platform with per-seat, per-product, per-time, and combination packages. Providers are authenticated FlowAI users; end-customers are sub-orgs they manage. Revenue tracked per provider via Stripe Connect (Agent #4 Provider Onboarding; DORMANT today). Platform-fee ceiling is 15%; providers retain ≥85% of end-customer revenue; sustainability floor defined per contract.

**Tension with the Product-Agnostic Rule (§14):** Panel Q5 flagged that per-product pricing + per-product revenue splits could appear to require product-specific code, violating §14. Rev-1 left this unresolved. Rev-2 resolves it via a **metadata-driven architecture pattern**:

| Layer | Product-specific? | Where it lives | Example |
|---|---|---|---|
| Core engine + 25 agents | **NEVER** — zero product names in code, tests, configs, env vars, URL patterns | `src/lib/agents/`, `src/lib/runner/`, agent registry | `Agent3SelfRenewal` analyzes ANY run; product is `ctx.productScope` parameter |
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
| L1 | **Building FlowAI** (current phase) | VEU constructs FlowAI itself — agents, governance, pipeline, Orchestra, OrchestratorHub. All 25 agents ship dormant at `recommend_only` before wire-in. | ACTIVE — Phase 1.0 substrate work in flight; Agents #1/#2/#3/#4/#5 SHIPPED-GREEN; 20 still DORMANT |
| L2 | **FlowAI on Itself** | Once live, FlowAI self-monitors, self-renews, self-updates Orchestra rankings, runs the 8-step pipeline against its own repos. | PARTIAL — Self-Governance Layer (Sprint 5) live; full self-orchestration awaits Panel-handover gate |
| L3 | **FlowAI on External Products** | Accepts via 4 input modes (§5), aggressively crawls everything, applies the 8-step pipeline, always delivers a new live URL. The fork-and-fix mode (§12) is the canonical externalized output path. | PARTIAL — W2 three-input renewal pipeline shipped on neutral test fixtures (commit `9b4e511`); fork-and-fix live; full crawl-fix-redeliver loop awaits Agent #3 graduation (see `docs/specs/SELF_RENEWAL_AGENT_SPEC.md`) |
| L4 | **FlowAI Capability Transfer into Other Products** (NEW — gap #4 from Panel Q2) | FlowAI installs its own capabilities into a target product as a Capability Package. Each package is generated as an install sprint and consumed by the target. | LIVE — Sprint PROTECT-1 shipped two packages: Self-Renewal (4 components: Self-Test, Self-Heal, Self-Monitor, Governance Hook) and Self-Protection (4 components). Install sprints exist for all 5 VEU products. Surface: `/capability-transfer`. |

L4 is operationally distinct from L3: L3 acts ON a product to produce a renewed URL; L4 installs a piece of FlowAI INTO a product so the product carries its own self-test / self-heal / self-monitor / governance after install.

---

## 5. FOUR INPUT MODES (per parking-lot ENTRY 006)

1. **Clone & Improve** — single URL, crawl, audit, enhance, redeploy.
2. **Describe & Build** — natural language, generate from scratch.
3. **Paste / Upload** — text + screenshots (Anthropic vision OCR), reconstruct and build.
4. **Synthesize & Build** — 2–5 URLs, cross-URL comparative scoring + best-feature extraction + synthesis composition.

INPUT modes are distinct from EXECUTION modes (§8) and SYSTEM OPERATION axes (§8a). All three axes can vary independently — a user can run "Clone & Improve" in "Auto" Orchestra selection under "Hands-Off" system operation, or any other combination.

---

## 6. AGGRESSIVE CRAWLING, TESTING & RESOLUTION CONTRACT

**Crawl scope (per parking-lot ENTRY 002):** all links, cards, modals, pages, engines, workspaces, embedded AI agents. No element skipped. Authenticated + unauthenticated paths. Mobile + desktop. Error states triggered. Depth-bounded multi-page traversal (default depth=2, max=8 pages per URL — implemented in `api/_lib/inputAdapters/url.js`).

**Credential handling for authenticated crawls (gap from Panel Q3):** session-only credentials per `src/lib/renewal/inputArtifact.js` `raw.description.loginEmail/loginPassword`. **Scrubbed before any persist / log / external send** via `scrubCredentials()`. Never written to the audit log. Never embedded in renewed output.

**Resolution contract (clarified — gap #3 from Panel Q3 + Slot 3/5/7 dissent):**
Every issue surfaced by `api/_lib/issueDetector.js` MUST reach a **terminal decision** before output delivery. The terminal decisions are:
- **Resolved** — the fork-and-fix path produced a renewed URL whose verification re-crawl shows the issue category absent. (Auto-deploy in fork-and-fix mode.)
- **Human-gated** — severity `high` or `critical`, or category in the human-gated set (legal / trust signals / value-proposition claims). Human picks one of three actions per Sprint ARCH-1: **Approve** (deploy as-is), **Modify** (edit FlowAI's proposed fix before deploy), **Skip** (document why, defer to backlog). Skip is a terminal decision — it acknowledges the issue and records the reason, satisfying "every issue resolved" in the audit-trail sense.
- **Documented limitation** — issue cannot be addressed within the input scope (e.g. mobile responsiveness flagged but only desktop assets supplied). Documented in the final delivery's LIMITATIONS section verbatim. Also terminal.

The "every issue MUST be resolved before output delivered" wording in Rev-1 was absolutist and Panel Q3 marked it `NOT_ACHIEVABLE_AS_WRITTEN`. Rev-2 makes the resolution semantic explicit: **resolution = terminal decision**, not necessarily auto-fix. Human-in-the-loop is canonical, not optional.

**Loop:** crawl → detect → propose fix or gate decision → execute (fork-and-fix or human action or document) → re-test (re-crawl + re-detect) → confirm clean OR record gated/documented terminal decision → deliver new live URL with full delta report.

---

## 7. OUTPUT CONTRACT

Every run produces:

1. **A new live URL** — fully deployed, real working product (NOT static HTML). Static HTML is permanently rejected as a primary output (legacy `api/_lib/renewalEngine.js` static-HTML path remains as deprecated fallback only).
2. **Before/After delta report** — `before_after_delta` from `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §2.4: `{ issuesBefore, issuesAfter, resolved, unresolved, regressions }`, plus the terminal decision per issue (see §6).
3. **Source disclosure** — `patch-existing-source` or `generate-from-scratch`, plus retrieval method (git-tarball / vercel-project / base44-stub / none).
4. **LIMITATIONS section** — verbatim list of human-gated-skip and documented-limitation terminal decisions, per `api/_lib/beforeAfterReport.js`.
5. **Updated ProductSSOT row** (per CA-10-A / ENTRY 005). On every pipeline run that produces an output, FlowAI writes a new `delta_log` entry to the product's ProductSSOT row (one row per `(productId, environment)` pair per §7.5). The write is **atomic** with the rest of the output contract: a run that produces a renewed URL but fails to update ProductSSOT is considered INCOMPLETE and rolled back (per §10 Self-Protect snapshot + Self-Heal pattern). The ProductSSOT update is the canonical living-document mechanism — it accumulates history across runs and is fed back into the next pipeline run per §28's symbiotic loop.

**Source acquisition order** (per `api/_lib/sourceAcquisition.js`): git URL → Vercel project → Base44 project → fallback to generate-from-scratch. Generate-from-scratch is canonical capability per parking-lot ENTRY 005, not a fallback in the colloquial "second-best" sense — it produces a fully functional working product whenever source is unreachable.

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
| **`annotations`** + **`overrides`** (jsonb[]) | admin + operator (annotations); admin only (overrides) | append-only; never auto-written | Per §13.1 role gates — operator can append annotations only; admin can append both annotations + overrides; client read-only. See §28 for treatment of admin overrides as CEO-equivalent directives. |

Plus a `version` field (monotonic per `(productId, environment)`, auto-incremented on every write) + `audit_hash_chain_pointer` (tamper-evidence anchor per §14.2). Every write also appends a row to `product_ssot_version` table (separate Supabase table; hash-chained per §14.2).

**Supabase schema:** `product_ssot` table (RLS-enabled per §13.1) + `product_ssot_version` table (append-only audit; same hash chain as GovernanceAuditLog per §14.2). Migration: `supabase/migrations/00NN_product_ssot.sql` (engineering dispatch separate; W2 + W5x to implement).

**Relation to DeploymentScaffold (§16.2):** complementary, not duplicative. DeploymentScaffold = single deploy snapshot (per Sprint 6 Phase 2). ProductSSOT = full deployment history + governance trail + annotations across time. ProductSSOT's `architecture_snapshot` may derive from the most recent DeploymentScaffold; engineering dispatch reuses the shape where applicable.

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

**Orchestra Selection axis** (renamed in Rev-2 — gap #12, Panel Q4 NAMING_AMBIGUITY):

| Selection mode | Behaviour |
|---|---|
| **Auto** | FlowAI selects the #1-ranked adapter per step automatically |
| **Recommended** (was "Guided" in Rev-1) | User sees ranked list with #1 highlighted; can accept or override |
| **User-Choice** (was "Manual" in Rev-1) | User sees full eligible list; must pick before run |

The rename removes the "Manual" collision with §8a (which kept the term for the orthogonal System Operation axis). Engineering may keep `'guided'`/`'manual'` enum strings in code if the migration cost is high, but the canonical user-facing labels are Auto / Recommended / User-Choice.

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

The auto-admission pipeline is owned by Agent #26 (Orchestra Research
Agent — per CA-9-B; §15.1 row 26).

**Lifecycle states** (canonical; surfaced in `/architecture` per §16):

| State | Definition | Entry trigger | Exit trigger |
|---|---|---|---|
| **Trial** | New member; full eligibility per capability matrix but rank_score multiplier 0.5; head-to-head benchmark in progress (<30 invocations on any capability) | Auto-admission per gate above | ≥30 invocations on ≥1 capability AND rolling 24h error rate <15% → Probation |
| **Probation** | Full rank_score; error-rate watch heightened; Auto mode can pick the member but only when ≥1 wired member is available as fallback | Trial exit + first stable benchmark | 30 consecutive days at status green → Full member |
| **Full member** | Canonical Orchestra membership; appears in §8 roster | Probation exit | Manual deprecation OR auto-deprecation per Panel + CEO gate |
| **Deprecated** | Existing wired-flag remains for grace period (90 days); ranking excluded; fallback chain skips | Panel + CEO disposition | Removal from registry after 90 days |
| **Archived** | Enumerated in §8 roster but never reached Full member; wired-flag is `false`; ranking excluded; fallback chain skips. Distinct from `Deprecated` (which means "was Full member, phasing out"). Kept in the registry as a re-activation candidate when platform constraints change. | Initial wiring attempt failed empirically (e.g. Lovable + Replit per commit `9143f82`) OR Panel + CEO disposition retains the member pending platform changes | Re-activation: re-evaluation clears the four-condition gate → enters Trial |

**Re-activation path (Lovable + Replit reconciliation):** any `Archived` member that is re-evaluated by Agent #26 and clears the four-condition auto-admission gate is auto-promoted `Archived → Trial`. Agent #26 emits `26.orchestra.candidate_reactivated.v1` (payload: `{ candidate_id, candidate_name, prior_state: "archived", rank_score, capabilities[], reactivated_at, basis }`). Lovable and Replit remain enumerated in §8's canonical 10-member roster for historical continuity; the wired+active subset is fewer than 10 today, and that gap is canonically explained by the `Archived` (and `Deferred`) lifecycle states.

**Audit-log topics (per §14.1 ripple amendment from ENTRY 005):**

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

**Seed evaluation list (CEO-supplied 2026-05-15, bootstrap input for Agent #26):** Agent #26's first observation cycle enumerates 13 candidates and emits `26.orchestra.candidate.v1` for each with `source = "ceo_seed_list_2026-05-15"`. Tier 1 (immediate evaluation): OpenAI Codex, Devin (Cognition Labs), Google Antigravity, Amazon Kiro, Google Jules, Windsurf/Cascade (Cognition Labs), GitHub Copilot Workspace. Tier 2 (monitor for admission, quarterly re-score): Bolt.new (StackBlitz), Taskade Genesis, Firebase Studio, Aider (OSS), OpenCode, Amazon Q Developer. Tier assignment governs queue priority; every candidate runs through the four-condition gate on its own merits. AWS-bound candidates (Kiro, Q Developer) MUST be evaluated by Agent #11 + Agent #14 for data-residency / vendor-lock-in / IP-protection carve-outs before passing the gate.

---

## 8a. SYSTEM OPERATION (was: System Operation Levels — separate axis from Orchestra Selection)

Renamed per gap #12 to eliminate "Manual" collision with the Orchestra axis.

| System Operation | Behaviour |
|---|---|
| **Hands-On** (was "Manual" in Rev-1 §8a) | Provider drives every decision; FlowAI proposes; provider approves/modifies/skips each step (per Sprint ARCH-1 Guided Operations approval flow) |
| **Reviewed** (was "Supervised" in Rev-1) | FlowAI acts; provider reviews each step output before proceeding to the next |
| **Hands-Off** (was "Autonomous" in Rev-1) | FlowAI operates end-to-end without intervention; pauses only on hard gates (severity `critical`, legal/safety flags, 95/95 failure) |

**Independence:** Orchestra Selection and System Operation are independent axes. Any combination is valid — e.g. Hands-On system operation + Auto Orchestra selection means "provider drives every decision but each chosen step uses FlowAI's top-ranked adapter without re-asking."

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

### 10.2 Four Human Gates (Sprint 5, canonical per ARCH-1 Approve/Modify/Skip flow)

| Gate | When | Decision space |
|---|---|---|
| **Review** | Before any agent action takes effect at a step boundary in Reviewed or Hands-On system operation | Approve, Modify, Skip |
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
- **Inline tool:** added as fifth tool under Go To Market step (#7) in Guided + Manual modes (Sprint HARD-1)

| # | Step | Wizard label | What it gates |
|---|---|---|---|
| 1 | Governance Audit | "Governance Audit" | All four Self-Governance components green; 95/95 threshold met on every dimension |
| 2 | Launch Readiness | "Readiness" | Six readiness dimensions per Sprint 6 Phase 2 (see §16): infrastructure, dependencies, data model, env config, observability, rollback |
| 3 | White-Label | "White-Label" | No Base44 / FlowAI / vendor branding leaks in renewed output; per Sprint 6 Phase 1 |
| 4 | Data Export | "Data Export" | GDPR-compliant export sprint generated; data portability verified. **Per CA-10-E.3 (ENTRY 005):** export now includes the **full ProductSSOT row content** (all six blocks per §7.5 + annotations + overrides + version history) as a structured JSON payload. Provider's `client`-role end-customers can request their own data subset via standard data-portability flow — export filters ProductSSOT contents to entries authored by or about the requesting end-customer. Optional second format: portable JSON manifest that another FlowAI instance can import to bootstrap an existing-product context (manifest format canonicalised in `docs/specs/PRODUCT_SSOT_PORTABILITY.md` — separate engineering-spec dispatch). |
| 5 | Demo Readiness | "Demo" | Synthetic-data demo microsite generates; guided tour script renders; per Sprint 7 Demo Builder |
| 6 | Final Sign-Off | "Final Sign-Off" | All previous 5 steps cleared; human acceptance gate; clearance badge emitted |

Each step's status, evidence, and timestamps are recorded in `ClearanceRecord`. Clearance is **per product, per environment** — clearing a product in `staging` does not clear it in `prd`.

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
| `session_started` | Auto / Guided / Manual session launch | sessionId, productId, mode, input, at, who |
| `step_completed` | Each of 8 pipeline steps | sessionId, stepKey, outcome, at, agentId, scoreBreakdown |
| `proposal_approved` | Guided/Manual Approve action | sessionId, stepKey, who, proposal, at |
| `proposal_modified` | Guided/Manual Modify action | sessionId, stepKey, who, before, after, rationale, at |
| `proposal_skipped` | Guided/Manual Skip action | sessionId, stepKey, who, reason, at |
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

All 26 agents (was 25 prior to CA-9-B / ENTRY 005) are proprietary VEU IP. All ship dormant at `recommend_only` per Sprint 5 governance pattern. OrchestratorHub wire-in **per-agent** as each ships; the original Rev-1 "wire-in only after all 25 built" was overly restrictive and Panel-flagged. Agent #26 was added per CA-9-B; CEO arbitration CA-9-Q4=(b) requires its `auto_write_internal` authority to be paired with `requires_human_gate` (BaseAgent.guard() enforces dual-authority via per-invocation `authorityNeeded` set membership; same shape as the Self-Renewal Executor per CA-7 §15.5).

### 15.1 Roster (canonical per `src/lib/agents/BaseAgent.js`)

| # | Agent | Mode | Step (if step-owner) | Embedding | Status |
|---|---|---|---|---|---|
| 1 | Lifecycle Engine | step-owner | 1 research | embedded | SHIPPED-GREEN (commit `d712993`) |
| 2 | Code Builder | step-owner | 3 build | embedded | SHIPPED-GREEN (commit `fdd3863`) — server-side only (node:crypto) |
| 3 | Self-Renewal | step-owner | 6 govern | embedded | SHIPPED-GREEN (commit `68a0c75`); fork-and-fix graduation spec drafted at `docs/specs/SELF_RENEWAL_AGENT_SPEC.md`. Per CA-9-C + CA-10-B (ENTRY 005): consumes `10.customer.issue.v1` with new `customerReportedIssues` heuristic (1-2 reports/24h → medium; 3-9 → high; ≥10 → critical). Per CA-10-B: produces new topic `3.ssot.delta.v1` (delta_log entry written to ProductSSOT post-Approve/auto-deploy via the Self-Renewal Executor per CA-7 §15.5). |
| 4 | Provider Onboarding | step-owner | (commercial layer) | flowai-only | SHIPPED-GREEN (commit `5006431`); wires Stripe Connect |
| 5 | End-Customer Intake | step-owner | (commercial layer) | flowai-only | SHIPPED-GREEN (commit `2fff449`) |
| 6 | Research | step-owner | 1 research (collab w/ #1) | embedded | DORMANT — block-semantic on content-insufficient already wired (commit `0fc8851`) |
| 7 | Design | step-owner | 2 design | embedded | DORMANT |
| 8 | Quality Audit | step-owner | 4 qa_audit | flowai-only | DORMANT — owns the 5-dimension scoring engine per §10 |
| 9 | Go-to-Market | step-owner | 7 gtm | embedded | DORMANT |
| 10 | Monitor | step-owner | 8 monitor | embedded | DORMANT. Per CA-9-C (ENTRY 005): charter expanded to ingest three customer signal channels — in-app "Report an issue" widget (POST `/api/customer/feedback`); app-store / public review scraping via `orchestra.dispatch('crawl', ...)`; support-ticket webhooks at `/api/customer/support-ticket-webhook` (Zendesk / Intercom / Help Scout). Produces `10.customer.feedback.v1` (normalised, de-duped, sentiment-tagged) + `10.customer.issue.v1` (issues mapped to issueDetector categories). Per CA-10-B: also produces `10.ssot.updated.v1` for ProductSSOT writes (architecture_snapshot drift; customer-signal governance_record entries). |
| 11 | Strategic Intelligence | cross-step | — | flowai-only | DORMANT — feeds continuous marketplace intelligence per Locked Rule 16. Per CA-9-B (ENTRY 005): primary charter function expanded to **global AI-platform discovery** — owns the curated industry-tracker URL list; produces `11.platform.discovery.v1` candidate signals consumed by Agent #26 Orchestra Research Agent. |
| 12 | Portfolio Risk | cross-step | — | flowai-only | DORMANT |
| 13 | Self-Protection (anti-crawl / IP) | always-on | — | embedded | DORMANT — distinct from Sprint 5's snapshot/rollback Self-Protect; covers DMCA, clone detection, edge defense, scraper blocking, Cloudflare Bot Management, watermarking per Sprint PROTECT-1 |
| 14 | Public Policy | cross-step | — | flowai-only | DORMANT |
| 15 | Benchmarking | cross-step | — | embedded | DORMANT — feeds Orchestra ranking updates per Locked Rule 16. Per CA-9-B (ENTRY 005): primary charter function expanded to **continuous head-to-head scoring** of Orchestra candidates vs existing members; schedules benchmark runs on the 8 pipeline steps × each candidate capability (rolling 30-invocation minimum per (candidate × capability)); produces `15.benchmark.head_to_head.v1`. |
| 16 | Productivity / HR | cross-step | — | flowai-only | DORMANT |
| 17 | Product Evolution | always-on | — | embedded | DORMANT — feeds Orchestra ranking + marketplace intelligence per Locked Rule 16. Per CA-9-B (ENTRY 005): primary charter function expanded to **Orchestra composition recommendation + deprecation proposals** — consumes benchmark signals; produces `17.orchestra.deprecation_proposal.v1` (basis ∈ `sustained_low_rank` \| `high_error_rate` \| `capability_obsoleted`); surfaces "add candidate X" or "deprecate member Y" recommendations to Agent #26 + CEO via Self-Renewal Alert cadence. |
| 18 | Business Planning | cross-step | — | flowai-only | DORMANT |
| 19 | Technological Evolution | cross-step | — | embedded | DORMANT |
| 20 | Environmental Impacts | cross-step | — | embedded | DORMANT |
| 21 | Ops Runner Alpha | step-owner (proposed) | (TBD) | embedded | DORMANT — G3-ratified charter; validator updated 20→25 commit `d2bcbbd` |
| 22 | Ops Runner Beta | step-owner (proposed) | (TBD) | embedded | DORMANT |
| 23 | Ops Runner Gamma | step-owner (proposed) | (TBD — possibly Cost Governor per Layer 2 plan PG1) | embedded | DORMANT |
| 24 | Ops Runner Delta | step-owner (proposed) | (TBD) | embedded | DORMANT |
| 25 | Ops Runner Epsilon | step-owner (proposed) | (TBD) | embedded | DORMANT |
| 26 | Orchestra Research Agent (NEW per CA-9-B + CA-9-Q4=(b)) | always-on | — | embedded | DORMANT — owns the auto-admission pipeline per §8.1. Authority **`[recommend_only, auto_write_internal, requires_human_gate]`** (dual + gate per CEO arbitration CA-9-Q4=(b); the `requires_human_gate` is required whenever `auto_write_internal` is declared, mirroring the Self-Renewal Executor charter shape per CA-7 §15.5). Consumes: `community.signal.v1`, `11.platform.discovery.v1`, `15.benchmark.head_to_head.v1`, `17.orchestra.deprecation_proposal.v1`, `vendor.changelog.poll.v1`. Produces the 7 `26.orchestra.*` topics enumerated in §8.1. Required credentials: `ANTHROPIC_API_KEY`, `BROWSERLESS_API_KEY`. Marketplace tools: `anthropic-api`, `browserless`, `playwright`. |

Partition: **13 embedded** in every product (#1, #2, #3, #6, #7, #9, #10, #13, #15, #17, #19, #20, **#26**) + **8 FlowAI-internal-only** (#4, #5, #8, #11, #12, #14, #16, #18) + **5 Ops Runners embedded** (#21–#25). Compile-time validator in `BaseAgent.js` enforces exactly **26** unique IDs (was 25 prior to CA-9-B / ENTRY 005).

### 15.2 Interaction model (gap #15)

Three contract layers connect agents:

1. **`MessageBus`** (`src/lib/agents/MessageBus.ts`) — pub/sub for inter-agent topics. Each agent declares its `consumes[]` and `produces[]` topics in its charter. Topics conform to `MessageSchema.js` (**61 topic constants** post-CA-9 + CA-10; was 40 prior to ENTRY 005). Example: Agent #3 consumes `8.audit.completed.v1`, `10.anomaly.v1`, `17.evolution.proposal.v1`, `10.customer.issue.v1` (per CA-9-C); produces `3.renewal.candidate.v1` plus (per §12) `3.renewal.applied.v1`, `3.renewal.delta.v1`, `3.renewal.build_failed.v1`, `3.renewal.disabled.v1`, plus `3.ssot.delta.v1` (per CA-10-B).

**Topics added in ENTRY 005 (CA-9 + CA-10) — 21 total new constants:**

- **CA-9-A Orchestra self-expansion (7):** `26.orchestra.candidate.v1`, `26.orchestra.admitted.v1`, `26.orchestra.candidate_rejected.v1`, `26.orchestra.candidate_panel_gate.v1`, `26.orchestra.deprecated.v1`, `26.orchestra.lifecycle_state_changed.v1`, `26.orchestra.candidate_reactivated.v1`.
- **CA-9-B agent-charter expansions (4):** `community.signal.v1`, `11.platform.discovery.v1`, `15.benchmark.head_to_head.v1`, `17.orchestra.deprecation_proposal.v1`, `vendor.changelog.poll.v1`.
- **CA-9-C customer feedback loop (5):** `customer.feedback.raw.v1`, `customer.review.scraped.v1`, `customer.support.ticket.v1`, `10.customer.feedback.v1`, `10.customer.issue.v1`.
- **CA-10-B ProductSSOT auto-update (4):** `3.ssot.delta.v1`, `10.ssot.updated.v1`, `10.ssot.annotation.v1`, `clearance.ssot.step.v1`.

(7 + 5 + 5 + 4 = 21; 40 + 21 = 61.)

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
25-agent partition (per §25 Locked Rule 2). Executors share a charter id
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
  readonly agentId: number;                   // the primary agent this executor extends (1..25)
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

**Validator invariants** (compile-time, enforced by `validateExecutors()` at module load):

1. Every executor `key` is a unique non-empty string.
2. Every executor `agentId` is an integer in `[1, 25]` AND exists in
   `AGENT_REGISTRY` (cross-link referential integrity — see Mitigation
   M1 below).
3. Every executor `mode` is `'cross-step'`. Executors MUST NOT register
   as `'step-owner'` or `'always-on'`.
4. If executor `authority` includes `'auto_write_internal'`, it MUST
   also include `'requires_human_gate'`.
5. The OrchestratorHub's `invokeStepOwner(stepKey, ctx)` never resolves
   to an executor — executors are only invocable out-of-band via
   `/api/agent/<id>/execute` + the Inngest job runner.

**Current population (1 executor as of Rev-2.1 + CA-7):**

| key | agentId | name | mode | authority | invoked via |
|---|---|---|---|---|---|
| `self-renewal-executor` | 3 | Self-Renewal Executor | `cross-step` | `auto_write_internal`, `requires_human_gate` | `/api/agent/3/execute` + Inngest job |

`consumes`: `3.renewal.candidate.v1` (emitted by the primary Agent #3).
`produces`: `3.renewal.applied.v1`, `3.renewal.delta.v1`,
`3.renewal.build_failed.v1`, `3.renewal.disabled.v1` (per
`docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §3.2).

**Cross-link with §14 GovernanceAuditLog:** every audit-log row written
by an executor MUST include an `executorKey` field disambiguating from
primary-agent events. See §14 amendment in CA-7.4.

**Cross-link with §15.1 Roster table:** the primary Agent #3 row in the
25-agent roster now optionally references its executor key(s) under an
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

> **Footnote (Rev-2.1 amendment a):** Sidebar section names (Guided Operations / Manual Operations) are UX-C historical labels and remain unchanged. They are DISTINCT from the canonical Orchestra Selection axis labels (Auto / Recommended / User-Choice) and System Operation axis labels (Hands-On / Reviewed / Hands-Off) defined in §8 / §8a. The sidebar surface preserves the UX-C names for shipping continuity; the canonical axis labels govern API contracts, documentation, and Panel discourse.

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

CA-4 + CA-5 + CA-6 deferred per Panel consultation `ssot-finalization-and-agent-roadmap-priority-2026-05-14.md`.

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

Zero product-specific code in the core engine + 25 agents + tests + configs + URL patterns + env vars. No VEU product names (SAIGE, RelTwin, ReachSMS, PressAI, MyPregLife) in agent code, BaseAgent dependencies, MessageSchema topic strings, ScoreEvaluator logic, OrchestratorHub registration, Orchestra adapters, or smoke-test fixtures. Smoke tests use **neutral fixtures only** (e.g. `flowai-renewed-<sanitised-stub>-<suffix>`).

Per-product configuration lives entirely in **metadata** per §3:
- `ProductRegistry` entity (Supabase, RLS-isolated)
- `flowai_product_config` rows
- Doppler vault paths `flowai/<env>/PRODUCTS_<productId>_*`
- `BaseAgent` `productScope` constructor parameter

The 6th, 10th, 100th product onboards via metadata writes alone. Zero code changes. This is the test of correctness.

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

Pattern: **W5x builds. W2 verifies. W6 runs Panel. W0x dispatches. CEO pastes.**

---

## 24. CEO OPERATING RULES (CANONICAL W0x PROTOCOL)

CEO role = **approve, click, copy, paste only — nothing else.**

- W04 posts instructions in copy boxes labelled with target Claude Code window (`W5a` / `W5b` / `W5c` / `W2` / `W3` / `W4` / `W6`).
- CEO pastes into named window. Window executes auto mode and reports back using the mandatory format below.
- CEO pastes report back to W04. W04 summarizes and recommends action.

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

## 25. LOCKED RULES (18, do not violate)

Referenced from the canonical FLOWAI_SSOT.md anchor + W03 opening package. The 18 Locked Rules are canonical and binding:

1. Source-of-truth hierarchy (code > canonical > user-curated memory > auto-memory) — anti-drift.
2. Roster lock: BaseAgent.js compile-time validates EXACTLY **26** unique agent IDs (was 25 prior to CA-9-B / ENTRY 005, 2026-05-15). The 26-agent partition is canonical: **13 embedded** (#1, #2, #3, #6, #7, #9, #10, #13, #15, #17, #19, #20, #26) + **8 FlowAI-internal-only** (#4, #5, #8, #11, #12, #14, #16, #18) + **5 Ops Runners embedded** (#21–#25). `validateRosterPartition()` IIFE enforces partition size 26 + cumulative ID range [1, 26].
3. Three complementary governance mechanisms (95/95 + 6-step Clearance + Monitor 0–50) must all pass.
4. **Orchestra Selection axis: Auto / Recommended / User-Choice (canonical).** Auto / Guided / Manual remain as historical aliases at the UX-C sidebar surface only (see §17 footnote + §8). System Operation axis labels are Hands-On / Reviewed / Hands-Off (§8a). The two axes are independent.
5. Multi-AI peer review (10-AI Panel) mandatory for substantive outputs.
6. Five-layer intelligence framework (L1 Functionality, L2 Operational, L3 Financial, L4 Business, L5 GTM) — mandatory tagging per `src/lib/operationsEngine.js` FIVE_LAYER_FRAMEWORK.
7. Seven Objective Lenses (audit_demo / investor_review / full_governance / compare / combine / benchmark / launch_readiness) per `OBJECTIVE_LENSES`.
8. LLM model standard: pipeline steps use claude_sonnet_4_6 by default; cost-aware budgeting required (§7 of Orchestra spec).
9. Automation-first: CEO paste + approve only. No CEO-side GUI hunting or manual edits.
10. Complete replacement files, never diffs in dispatches.
11. Workstream routing per §23.
12. Cadence: W0 does not impose timing; CEO sets cadence.
13. Panel approval mandatory for every build step; CEO retains absolute veto.
14. Real production products under continuous crawl + fix at any time; no maintenance windows.
15. Aggressive URL + wiring verification per §6.
16. Continuous marketplace intelligence + Self-Renewal Alerts ≥monthly.
17. Every W0x→CEO message requiring CEO action must be Panel-reviewed (≥7/10) before delivery.
18. Tool Intelligence Marketplace ranking formula canonical per §8 + `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md`.

---

## 26. CURRENT PHASE STATUS (2026-05-14, post-PROTECT-1)

**Rev-1 §17 said "Phase 0 COMPLETE."** Panel Slot 7 flagged this as out of date — Sprint PROTECT-1 is the most recent canonical sprint. Rev-2 fixes per gap #14.

| Subsystem | Status |
|---|---|
| Sprint history (CANONICAL_REFERENCE) | Sprint 5 → Sprint PROTECT-1 (most recent); plus POST-PROTECT-1 architecture + GTM Demo Stack + Agent Contract Layer (in codebase, not yet in ReleaseNotes.jsx) |
| Branch | flowai-v0.1 |
| Phase 0 (Foundation, commit `5dec08d`, 387 tests) | COMPLETE |
| Agents shipped (G3-ratified roster of 25, 5 live) | #1 Lifecycle Engine, #2 Code Builder, #3 Self-Renewal, #4 Provider Onboarding, #5 End-Customer Intake — all SHIPPED-GREEN |
| Agents dormant | 20 of 25 (per Layer 1 SSOT doability assessment) |
| W2 three-input renewal pipeline | SHIPPED on neutral test fixtures (commit `9b4e511`); Orchestra direct-write available via fork-and-fix path |
| Self-Governance Layer (Sprint 5) | LIVE — Self-Test, Self-Audit, Self-Protect, Self-Heal, Four Human Gates |
| Self-Renewal + Self-Protection Capability Packages (Sprint PROTECT-1) | LIVE — install sprints for all 5 VEU products |
| Tool Intelligence Marketplace (Sprint 8 — 65 tools / 12+1 categories) | LIVE per `src/lib/toolRegistry.js` (61 actual tools / 14 actual categories — see Open Questions §27) |
| 6-step Clearance Protocol (Sprint 9) | LIVE at `/clearance` |
| 6-section sidebar (post-ARCH-1) | LIVE per `src/components/layout/Sidebar.jsx` |
| GovernanceAuditLog (Sprint HARD-1) | LIVE; `/audit-trail` read-only surface |
| Doppler integration | LIVE (commit `8e29e84` + `ae0441c`) — 4 keys provisioned |
| Vercel Deployment Protection bypass | LIVE (commit `c533e2d`) |
| W03 Standing Operating Protocol | CANONICAL (commit `6e9660e`); maximum-oversight configuration |
| CA ratifications | CA-1 (9/10), CA-2 (8/10), CA-3 (8/8 engaged) ratified. CA-4 split 4/4 — CEO disposition pending. CA-5 below engagement floor — needs re-Panel. CA-6 SPLIT — REVISE AND RE-REVIEW. |
| Layer 1 SSOT | CANONICAL — `docs/FLOWAI_SSOT.md` (commit `fbaf881`), amended `1d65aba` |
| Layer 2 Implementation Plan | CANONICAL — `docs/FLOWAI_IMPLEMENTATION_PLAN.md` (commit `6d0ccbb`) |
| Layer 3 Engineering Spec | CANONICAL — `docs/FLOWAI_ENGINEERING_SPEC.md` (commit `c5720a5`) |
| Layer 4 Building Guidance | NOT YET BUILT |
| Self-Renewal Agent #3 graduation spec | DRAFT — `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` (commit `446ddb5`); 5 open questions for CEO disposition |
| Orchestra Integration spec | DRAFT — `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` (commit `38b1a23`); 8 open questions for CEO disposition |
| SSOT W04-Rev-1 | DRAFT — superseded by THIS document (Rev-2) per Panel verdict |
| SSOT W04-Rev-2 | DRAFT (THIS document) — awaiting W6 re-Panel |
| Next gate | (1) W6 re-Panel of Rev-2; (2) CEO dispositions on §27 Open Questions; (3) Production Hardening (RLS + observability + CI/CD) before remaining 20 agents — Panel Q4 verdict from 2026-05-14 consolidated consultation, plurality (b) Production Hardening; (4) Layer 4 Building Guidance |

---

## 27. OPEN QUESTIONS (areas where existing canonical sources are unclear)

Items where canonical evidence is incomplete or contradictory — flagged for CEO disposition or W6 re-Panel rather than silently resolved.

1. **Tool count: 65 vs 61.** CANONICAL_REFERENCE Sprint 8 says "65 tools pre-loaded across 12 categories"; current `src/lib/toolRegistry.js` shows **61 tools across 14 categories**. Either 4 tools were removed without a release note OR the Sprint 8 number was aspirational. Code wins per Locked Rule 1; Rev-2 reflects 61/14, but canonical history should reconcile.

2. **Ops Runner #21–#25 step assignments.** BaseAgent.js declares the 5 Ops Runners as embedded step-owners but does not pin which step each owns. Layer 2 plan PG1 hints #23 = Cost Governor; others unspecified. Engineering dispatch needs to fix the step bindings before any Ops Runner can ship.

3. **Pre-Sprint-5 era ("flow builder paradigm") archival status.** CANONICAL_REFERENCE §3 confirms the era existed (legacy routes redirected in Sprint HARD-1; entities SavedFlow / FlowVersion / FlowRun / FlowComment still defined; `components/designer/*` and `components/flows/*` still in tree as dead code). No record of when superseded. Rev-2 SSOT does not include the flow-builder paradigm because it is dead code in-place. Open: should the dead code be formally archived (deleted with a tombstone commit) or left as historical evidence? Panel Slot 5 raised "acknowledgement of the pre-Sprint 5 visual flow builder paradigm and its supersession" as a missing item — Rev-2 acknowledges via this Open Question rather than dedicating a canonical section.

4. **Multi-LLM routing decision engine.** CANONICAL_REFERENCE Section 2 declares "NO RECORD FOUND" for centralised routing logic. Agent #4 Provider Onboarding charter references it but agent is DORMANT and Rev-2 does not include a canonical "multi-LLM routing engine" section. Open: build per Agent #4 graduation, or defer per Panel Q4 Production-Hardening-first verdict.

5. **Capability Transfer as L4 — completeness check.** §4 elevates Capability Transfer to Level 4. Sprint PROTECT-1 shipped Self-Renewal + Self-Protection packages, but only 2 of an unbounded set. Open: is Capability Transfer canonically the L4 surface for ALL future capabilities (i.e. every new agent / governance feature ships as a transferable package), or is it specific to those two packages? Affects Agent #13 architecture + future Ops Runner shipping.

6. **Orchestra Selection axis rename — code migration cost.** §8 renames "Guided" → "Recommended" and "Manual" → "User-Choice" for the Orchestra Selection axis. Code currently uses `'guided'` and `'manual'` enum strings. Rev-2 says engineering may retain enum strings if migration cost is high. Open: should the rename be source-of-truth (rename enums) or surface-of-truth (rename only labels)? Affects `AgenticModeContext.jsx` + `OrchestrationContext.jsx` + many components.

7. **Per-mode role gates on Human Gates.** §13 + §10.2 assert that the Approval Gate (95/95 override) is admin-only. Sprint 7.5a UserRole entity defined admin / operator / client but didn't pin role-to-gate mapping explicitly. Open: confirm role-gate mapping is canonical as specified, or is operator allowed to Override 95/95?

8. **CA-4 + CA-5 + CA-6 dispositions.** Deferred from `ssot-finalization-and-agent-roadmap-priority-2026-05-14.md` consultation. CA-4 = Year-1 → Year-6 user journey for O6; CA-5 = generalise E4 commercial rail beyond Stripe Connect; CA-6 = new MG9 commercial-architecture section. Open: dispose per `docs/FLOWAI_SSOT_AMENDMENT_DRAFT_2026-05-14.md`.

9. **Pre-Rev-1 axis labels in shipped code.** UI shipped UX-C as "Auto Operations / Guided Operations / Manual Operations" (sidebar sections, page titles). Rev-2 renames to Orchestra-Selection-axis labels. Open: should shipped sidebar labels also rename to "Auto Ops / Recommended Ops / User-Choice Ops", or do the sidebar sections stay as Sprint UX-C named them (Auto / Guided / Manual) while only the Orchestra picker uses the new labels? This is the gap between "what axes exist" (Rev-2 canonical) and "what users see in the sidebar" (UX-C canonical).

10. **Layer 4 Building Guidance status.** Layer 1, 2, 3 SSOT all canonical. Layer 4 (`docs/FLOWAI_BUILDING_GUIDANCE.md`) was never built. Rev-2 references the 4-layer SSOT plan but does not author Layer 4 contents. Open: when is Layer 4 produced + Panel-reviewed?

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

### 28.3 Admin overrides as CEO-equivalent directives

Per CA-10-D.2, **human annotations and overrides on the ProductSSOT (per §13.1) are treated as CEO-equivalent directives for that product's subsequent pipeline runs.** Concretely:

- An admin annotation "Score this 95/95 even though dependency X looks deprecated" on the `architecture_snapshot` entry for dependency X **suppresses** the Quality Audit dimension-score deduction for that dependency in subsequent runs.
- An `Override` entry on a `delta_log_entry`'s `issue.severity` from `high` to `medium` re-routes future similar issues to the `medium` severity gate (per §12 mode routing).
- Annotations and overrides are themselves audit-logged + version-history-tracked (per §14.2 hash chain) + Panel-reviewable. A Panel consultation can be raised to challenge any admin override per Locked Rule 17.

### 28.4 Conflict resolution (auto-gen vs admin override)

When an admin override conflicts with the next auto-generated entry (e.g. admin overrode an issue's severity from `high` to `medium`, but Agent #10 detects the same issue in next run with `high` severity again), **admin override always wins** (per CA-10-D.2 + CA-10-Q3=(a)). The new auto-gen entry is still created (audit completeness) but flagged `overridden=true` with a reference to the existing override. The admin can revoke the override at any time by appending a new override entry that restores the auto-gen behaviour (audit trail preserved).

### 28.5 §4 + §6 + §9 cross-link footers

The §4 L2 ("FlowAI on Itself") and L3 ("FlowAI on External Products") status footnotes are read as: every L2 + L3 pipeline run reads the target product's ProductSSOT as canonical context input; the crawl scope per §6 is narrowed accordingly; admin annotations + overrides are treated as CEO-equivalent directives for that run. The ProductSSOT is updated atomically with the run output per §7 (amended Output Contract item #5) — failure to write ProductSSOT rolls back the entire run.

§9 (8-step pipeline) footer: at run start, AutoRunner loads the target ProductSSOT row and threads it into the per-step context. Agents #6, #8, #3, #9 (when graduated from DORMANT) consume the relevant blocks; Agent #10 produces updates to the affected blocks. The Self-Renewal Executor (per CA-7 §15.5) writes the final `delta_log_entry` on run completion.

---

*End of W04-Rev-2.1 + CA-7/CA-8/CA-9/CA-10 promotions. 14 Panel-cited gaps from Rev-1 addressed in Rev-2 (§3 metadata-driven, §4 L4 Capability Transfer, §6 resolution clarification, §8 / §8a axis rename, §10 Self-Governance Layer, §11 6-step Clearance, §12 mode-to-pipeline wiring, §13 auth + roles, §14 GovernanceAuditLog, §15 26-agent roles + OrchestratorHub-vs-Orchestra, §16 deployment infra, §17 6-section sidebar, §18 CA-n cycle, §26 phase status). CA-7 added §15.5 EXECUTOR_REGISTRY. CA-8 added §20.2 X-Test-Bypass-Token Contract. CA-9 (ENTRY 005) added §8.1 Orchestra Self-Expansion + Agent #26 + customer feedback loop. CA-10 (ENTRY 005) added §7.5 ProductSSOT + §13.1 role gates + §28 Symbiotic Feed-Back Loop + §11 Step 4 + §14.3 retention extensions. 10 Open Questions remaining for CEO disposition or W6 re-Panel.*
