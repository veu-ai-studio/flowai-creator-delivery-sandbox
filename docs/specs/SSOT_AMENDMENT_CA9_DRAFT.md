# SSOT Amendment Draft — CA-9 (Orchestra Self-Expansion + Customer Feedback Loop)

**Status:** DRAFT — pending W6 Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18).
**Author:** W3, 2026-05-15.
**Anchor canonical SSOT:** `docs/CANONICAL_REFERENCE.md` Rev-2.1 (commit `9495b26`).
**Target sections amended:** §8 (CA-9-A); §15.1 + §15.2 (CA-9-B); §15.1 rows #3 + #10 + §15.2 + §16 (CA-9-C); §25 Locked Rule 2 (CA-9-B prerequisite); §25 Locked Rule 18 (CA-9-A clarification).
**Coupled with:** CA-7 (EXECUTOR_REGISTRY sibling namespace; Self-Renewal Executor split-charter — already drafted at `docs/specs/SSOT_AMENDMENT_CA7_CA8_DRAFT.md`, commit `ce96055`). CA-9-C's Agent #3 expansion routes through the Self-Renewal Executor charter once CA-7 promotes; both CA-7 and CA-9 should pass through Panel in the same cycle to avoid drift.

**Lineage:** CEO-locked feature spec 2026-05-15 (W3 dispatch). Three sub-amendments bundled:
- **CA-9-A:** Orchestra Self-Expansion Mechanism — global research → ranking-threshold → auto-admission, with audit-log integration.
- **CA-9-B:** Agent charter expansions for #11, #15, #17 + add new Agent #26 (Orchestra Research Agent). Requires Locked Rule 2 amendment 25 → 26.
- **CA-9-C:** Customer Feedback Loop — Agent #10 + Agent #3 charter expansions + new MessageBus topics + new UI surface.

---

## CA-9-A — Orchestra Self-Expansion Mechanism (§8 + Locked Rule 18 amendment)

### CA-9-A.1 Background + Locked Rule 16 thread

Rev-2.1 §8 enumerates the canonical 10-member Orchestra (Claude Code, Base44, Lovable, v0, Cursor, OpenRouter, Browserless, Anthropic API direct, Replit, Playwright) per parking-lot ENTRY 004. Locked Rule 16 mandates "Continuous marketplace intelligence + Self-Renewal Alerts ≥monthly" — implying that the Orchestra composition is not frozen but should evolve. Today the evolution mechanism is **manual**: Panel + CEO ratify any change to the 10-member roster (the Slot 6+7+8+9 reassignments in commit `9143f82` were W5b-driven + Panel-validated). CA-9-A replaces the manual cycle with a **deterministic auto-admission pipeline** for candidates that meet a canonical scoring threshold.

CEO disposition Q1 (2026-05-15): "Auto-add new platforms to Orchestra when they score above Locked Rule 18 ranking threshold (no human gate)." This delegates the admission decision to the ranking math; human gate is removed for *admission only* (deprecation + manual override remain human-gated per CA-9-A.5).

### CA-9-A.2 Global research loop

A continuous discovery loop, owned by the new Agent #26 (CA-9-B), produces a stream of `26.orchestra.candidate.v1` events. Sources:

| Source | Mechanism | Cadence |
|---|---|---|
| **Web research** | Agent #26 dispatches `orchestra.dispatch('crawl', { url })` against curated industry-tracker URLs (e.g. Hacker News "AI" tag, Product Hunt AI category, OpenRouter `/v1/models` endpoint, Browserless `/marketplace`, v0 `/changelog`). | Daily 03:00 UTC (aligns with Sprint PROTECT-1 Phase 2 scheduled-self-test). |
| **Benchmarking signals** | Agent #15 Benchmarking (per CA-9-B) emits `15.benchmark.head_to_head.v1` after each rank-cycle; Agent #26 ingests. | Per Locked Rule 16 monthly minimum + event-triggered on Slot reassignment. |
| **Community signals** | Slack / Discord webhooks subscribed via the Orchestra `community.signal.v1` topic (NEW); ingestion gated by URL whitelist per §13. | Continuous (push). |
| **Vendor changelog poll** | Agent #26 polls vendor changelog feeds (RSS / GitHub Releases / `/changelog` endpoints) for material updates. | Daily 04:00 UTC. |

Every candidate observation produces an audit-log entry under topic `26.orchestra.candidate.v1` with payload `{ candidate_id, candidate_name, source, evidence_url, performance_score_estimate, price_tier_estimate, at }`. Hash-chained per §14.2.

### CA-9-A.2.1 Seed evaluation list (CEO-supplied 2026-05-15)

To bootstrap the global research loop, Agent #26's first observation cycle MUST enumerate the following 13 candidates and emit `26.orchestra.candidate.v1` for each, with `source = "ceo_seed_list_2026-05-15"` and `evidence_url` populated from each candidate's official site. Tier assignment governs queue priority, not threshold — every candidate clears the §CA-9-A.4 gate on its own merits.

**Tier 1 — Immediate evaluation (high relevance, priority queue head):**

| Candidate | Vendor / surface | Capability hints |
|---|---|---|
| **OpenAI Codex** | OpenAI cloud agent | `code-patch`, `generate-from-scratch`, `deploy` (cloud sandbox + PR automation) |
| **Devin** | Cognition Labs | `generate-from-scratch`, `code-patch`, `build`, `deploy` (fully autonomous cloud sandbox) |
| **Google Antigravity** | Google | `code-patch`, `design`, `generate-from-scratch` (multi-agent IDE, Gemini-native) |
| **Amazon Kiro** | AWS | `generate-from-scratch`, `build`, `deploy` (spec-driven, AWS-native) |
| **Google Jules** | Google | `code-patch`, `generate-from-scratch` (autonomous cloud coding, Gemini-integrated) |
| **Windsurf (Cascade)** | Cognition Labs (post-acquisition) | `code-patch`, `interact` (agentic IDE) |
| **GitHub Copilot Workspace** | GitHub / Microsoft | `code-patch`, `generate-from-scratch`, `build` (agent mode, 15M+ developers) |

**Tier 2 — Monitor for admission (quarterly score-refresh until graduated to Tier 1 or skipped):**

| Candidate | Vendor / surface | Capability hints |
|---|---|---|
| **Bolt.new** | StackBlitz | `generate-from-scratch`, `build`, `deploy` (full-stack app builder, non-technical users) |
| **Taskade Genesis** | Taskade | `generate-from-scratch`, `design` (living apps from prompt; 150K+ apps built) |
| **Firebase Studio** | Google | `generate-from-scratch`, `build`, `deploy` (Google full-stack builder) |
| **Aider** | OSS | `code-patch` (open-source git-native CLI agent) |
| **OpenCode** | OSS / GitHub partnership | `code-patch`, `generate-from-scratch` (6.5M monthly devs) |
| **Amazon Q Developer** | AWS | `code-patch`, `generate-from-scratch` (AWS-native agentic coding) |

**Scoring rule (verbatim per Locked Rule 18):**

Each seed candidate is scored via the canonical formula `rank_score = (performance_score × 0.6) + (price_weight × 0.4)` BEFORE the §CA-9-A.4 auto-admission gate is evaluated. The seed-list assignment does NOT bypass the gate — Tier 1 candidates that fail any of the four gate conditions (rank_score, head_to_head invocations, capability-gap, no carve-out flag) are routed to `26.orchestra.candidate_rejected.v1` or `26.orchestra.candidate_panel_gate.v1` exactly as any other discovered candidate.

**Carve-out anticipation (per §CA-9-A.6):** Agent #11 Strategic Intelligence + Agent #14 Public Policy MUST evaluate AWS-bound seed candidates (Amazon Kiro, Amazon Q Developer) for data-residency / vendor-lock-in / IP-protection carve-outs before they pass the gate. Carve-outs flagged from these two agents route through `26.orchestra.candidate_panel_gate.v1` regardless of rank score.

**Initial cycle cadence:** Agent #26's first execution cycle (on first deploy post-CA-9-B + CA-9-A promotion) processes all 13 seed candidates as a single batch; subsequent cycles fold seed candidates into the daily 03:00 UTC research loop. The seed list is treated as an additional input source row in §CA-9-A.2 alongside web research / benchmarking signals / community signals / vendor changelog poll.

### CA-9-A.3 Scoring pipeline + Locked Rule 18 invocation

Every candidate runs through the canonical Locked Rule 18 ranking formula BEFORE the auto-admission gate is evaluated:

```
candidate_rank_score = (performance_score × 0.6) + (price_weight × 0.4)
```

Performance score sourcing (per CA-9-B Agent #15 expansion):
- **Head-to-head benchmark** against the existing 10 Orchestra members on at least 3 of the 8 pipeline steps for the candidate's declared capabilities. Minimum 30 invocations per (member × capability) pair to produce a stable score.
- **Bootstrap baseline** if head-to-head not yet complete: candidate scores 0.0 until ≥30 invocations land.
- **Marketplace delta** from Agent #11 Strategic Intelligence per Locked Rule 16: ±0.1 adjustment based on external benchmarks (HumanEval, SWE-Bench, MTEB, etc. depending on capability).

Price tier sourcing (per CA-9-B Agent #11 expansion):
- Agent #11 surfaces published pricing pages + free-tier signals.
- Manual override possible via Doppler env `flowai/<env>/ORCHESTRA_CANDIDATE_<id>_PRICE_TIER` if vendor pricing is opaque.

### CA-9-A.4 Auto-admission gate (threshold definition)

**Threshold:** a candidate is auto-admitted to the Orchestra if `candidate_rank_score ≥ 0.70` AND `head_to_head_minimum_invocations ≥ 30` AND the candidate covers at least one capability the existing Orchestra has fewer than 2 wired members for. The 0.70 floor matches the bootstrap baselines in `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` §4.3 — that's the rank-score range of the median wired adapter (claude-code at 0.85, v0 at 0.85, browserless at 0.85, the rest in the 0.65–0.92 spread).

**Audit-log entries (mandatory):**
| Event | Topic | Payload |
|---|---|---|
| Candidate observed | `26.orchestra.candidate.v1` | `{ candidate_id, candidate_name, source, evidence_url, performance_score_estimate, price_tier_estimate, at }` |
| Candidate auto-admitted | `26.orchestra.admitted.v1` | `{ candidate_id, candidate_name, rank_score, performance_score, price_tier, capabilities[], admitted_at, basis: "auto-threshold-met" }` |
| Candidate auto-rejected | `26.orchestra.candidate_rejected.v1` | `{ candidate_id, candidate_name, rank_score, threshold, reason, at }` where `reason` ∈ {`below_threshold`, `insufficient_invocations`, `capability_overlap`} |
| Candidate Panel-gated | `26.orchestra.candidate_panel_gate.v1` | `{ candidate_id, candidate_name, rank_score, reason, panel_consultation_id?, at }` — for the carve-outs in §CA-9-A.6 |

Every admission writes a one-line entry to `docs/CANONICAL_HISTORY.md` SECTION 8 + the pointer copy in §7 of CANONICAL_REFERENCE — preserving the §18 archive discipline even when the decision is automated.

### CA-9-A.5 Orchestra member lifecycle states

CA-9-A formalises the lifecycle of an Orchestra member:

| State | Definition | Entry trigger | Exit trigger |
|---|---|---|---|
| **Trial** | New member, full eligibility per capability matrix but rank_score multiplier 0.5 applied; head-to-head benchmark in progress (<30 invocations on any capability) | Auto-admission per §CA-9-A.4 | ≥30 invocations on ≥1 capability AND rolling 24h error rate <15% → `probation` |
| **Probation** | Full rank_score (no multiplier); error-rate watch heightened; Auto mode CAN pick the member but only when ≥1 wired member is available as fallback | Trial exit + first stable benchmark | 30 consecutive days at status `green` (per Orchestra spec §6.2) → `full member` |
| **Full member** | Canonical Orchestra membership; appears in §8 roster | Probation exit | Manual deprecation OR auto-deprecation per §CA-9-A.6 |
| **Deprecated** | Existing wired-flag remains for grace period (90 days); ranking excluded; fallback chain skips; audit-log entry `26.orchestra.deprecated.v1` | Auto-deprecation criteria met OR Panel + CEO manual deprecation | Removal from registry after 90 days (next CA-n cycle) |
| **Archived** (NEW per §CA-9-A.5.1) | Member is enumerated in §8's canonical 10-member roster but has never reached `Full member` status. Wired-flag is `false`; ranking excluded; fallback chain skips. **Distinct from `Deprecated`** (which means "was Full member, being phased out"). Kept in the registry as a re-activation candidate when its platform constraints change. | Initial wiring attempt failed empirically (e.g. Lovable + Replit per commit `9143f82`) OR Panel + CEO disposition retains the member with archived status pending platform changes. | Re-activation per §CA-9-A.5.1 below — passes auto-admission gate → enters `Trial`. |

### CA-9-A.5.1 Re-activation path for archived members (Lovable + Replit reconciliation)

**Background:** Rev-2.1 §8 enumerates the canonical 10-member Orchestra — Claude Code, Base44, Lovable, v0, Cursor, OpenRouter, Browserless, Anthropic API direct, Replit, Playwright — per parking-lot ENTRY 004. `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` §2.1 marks **Lovable** and **Replit** as DEFERRED (Lovable surface mismatch — no free-text-chat surface on the probed account tier; Replit Cloudflare WAF — rejects headless Chromium fingerprint; both empirically failed 2026-05-13 per commit `9143f82` body). CEO refers to this state colloquially as "archived". CA-9-A.5.1 reconciles the terminology by introducing the `Archived` lifecycle state (added to the §CA-9-A.5 table above) and specifying the re-activation path.

**Why a distinct `Archived` state (vs. existing `Deprecated`):**
- `Deprecated` means "was Full member, now phasing out" → 90-day grace period, fallback skip, removal from registry after grace.
- `Archived` means "is enumerated in §8 but never reached Full member status" → no grace period needed (was never relied on); kept in registry as a re-activation candidate; fallback chain skips it identically to a deferred stub.

**Re-activation criteria:** any `Archived` member that is re-evaluated by Agent #26 and clears the §CA-9-A.4 four-condition auto-admission gate (`rank_score ≥ 0.70` + `head_to_head_minimum_invocations ≥ 30` + capability-gap + no carve-out flag) is auto-promoted `Archived → Trial`. On promotion, Agent #26 emits a new audit-log topic **`26.orchestra.candidate_reactivated.v1`** (payload: `{ candidate_id, candidate_name, prior_state: "archived", rank_score, capabilities[], reactivated_at, basis }`). This topic is added to the CA-9-B §15.2 MessageBus topic list (revised count: §CA-9-B post-promotion **52 topic constants**; §CA-9-C post-promotion **57 topic constants** — see CA-9-B.8 + CA-9-C.4 amended counts below).

**Specifically for the two currently-archived members:**

| Member | Empirical failure (2026-05-13, commit `9143f82`) | Re-activation precondition | Re-evaluation cadence |
|---|---|---|---|
| **Lovable** | Post-login surface is Build-mode chat with no free-chat tier on the probed account; `[class*="prose"]` selector matched echoed user message rather than assistant reply. Outcome B (false-positive ok). | Lovable ships either (a) a documented public chat-API (not currently published) OR (b) a paid tier that exposes the free-chat surface their headless probe couldn't reach. | Quarterly re-evaluation by Agent #26; event-trigger on Lovable changelog / pricing-page change per `vendor.changelog.poll.v1`. |
| **Replit** | Cloudflare WAF returned "Sorry, you have been blocked" on all three probe URLs (`/agent`, `/~`, `/`). Replit's WAF rejects headless Chromium fingerprint regardless of valid `storageState` cookies. Outcome C. | Replit's **External Access Tokens** (announced 2025) reach GA + provide a programmatic agent-invocation pathway that bypasses the Cloudflare WAF block. | Quarterly re-evaluation by Agent #26; event-trigger on `discourse.replit.com` API-status thread updates ingested via `community.signal.v1`. |

**Implementation locus:** Lovable and Replit's existing entries in `src/lib/orchestra/stubs.js` gain a new `lifecycleState: 'archived'` field (alongside `wired: false`). The new ranking lookup `getRankedAdapters()` (per `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` §5.2) honours the field — `lifecycleState === 'archived'` excludes the adapter from ranking exactly as `wired === false` does today, but the field provides an additional discriminator so the UI can distinguish "stub not yet wired" (e.g. Cursor) from "wired attempt failed; awaiting platform change" (Lovable + Replit) from "previously full member; phasing out" (any future Deprecated member).

**Continuity:** Lovable + Replit remain enumerated in Rev-2.1 §8's canonical 10-member roster for historical continuity and traceability. The §8 roster lists 10 members; the wired+active subset is fewer than 10 today, and that gap is canonically explained by the `Archived` (and `Deferred`) lifecycle states.

**No-op on `validateRosterPartition()`:** this lifecycle classification operates entirely within the Orchestra registry (`src/lib/orchestra/`), not the agent registry (`src/lib/agents/`). `BaseAgent.js`'s 25-agent (post-CA-9-B: 26-agent) compile-time validator is unaffected.

### CA-9-A.6 Manual override + deprecation gate

Auto-admission removes the human gate for *admission only*. The following decisions remain Panel + CEO gated per Locked Rule 13 and Locked Rule 17:

- **Deprecation of a wired full-member adapter** (operational risk to in-flight pipeline runs).
- **Capability mapping changes** for existing wired members (e.g. promoting v0 from `design` to also cover `code-patch` requires Panel review per CA-9-A 0.70 floor implicit assumption).
- **Carve-outs:** any candidate with security/legal/regulatory exposure (e.g. data-residency concerns, vendor-export-restriction flags, IP-protection concerns per Locked Rule 14) triggers `26.orchestra.candidate_panel_gate.v1` instead of auto-admission. Agent #11 Strategic Intelligence + Agent #14 Public Policy decide jointly when to flag a candidate as carve-out.

### CA-9-A.7 Proposed amendment to §8 (verbatim insertion)

Insert the following new sub-section **§8.1 Orchestra Self-Expansion (Auto-Admission)** after the existing §8 ranking-formula block:

```md
### 8.1 Orchestra Self-Expansion (Auto-Admission, per CA-9-A)

The 10-member Orchestra evolves continuously per Locked Rule 16. CA-9-A
defines the auto-admission mechanism: a candidate platform is admitted
to the Orchestra without a human gate if it meets ALL of:

1. `candidate_rank_score ≥ 0.70` per the Locked Rule 18 formula.
2. `head_to_head_minimum_invocations ≥ 30` on at least one declared
   capability.
3. The candidate covers at least one capability for which the existing
   Orchestra has fewer than 2 wired members (capability-gap rule —
   prevents admission for redundant coverage).
4. No carve-out flag from Agent #11 Strategic Intelligence or Agent
   #14 Public Policy (security / legal / regulatory exposure).

The auto-admission pipeline is owned by Agent #26 (Orchestra Research
Agent — per CA-9-B). Lifecycle states (Trial / Probation / Full member
/ Deprecated) are defined in `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md`
§3 (extended per CA-9-A.5) and surfaced in `/architecture` per §16.

**Deprecation, capability remapping, and carve-out decisions remain
Panel + CEO gated** per Locked Rule 13 + Locked Rule 17. Auto-admission
applies to admission only.

Every admission writes a one-line entry to `docs/CANONICAL_HISTORY.md`
SECTION 8 + the pointer in §7. Every rejection + carve-out emits an
audit-log topic per §14.1 (new rows added in CA-9-A.4 ripple
amendment). Hash chain integrity preserved.
```

(End of §8.1 insertion.)

### CA-9-A.8 Ripple amendment to Locked Rule 18 (§25 clarification)

Amend Locked Rule 18 to add the auto-admission cross-reference:

```md
18. Tool Intelligence Marketplace ranking formula canonical per §8 +
    `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md`. **Orchestra
    self-expansion (auto-admission) per §8.1 + CA-9-A — admission gate
    is deterministic threshold; deprecation + capability remapping +
    carve-out remain Panel-gated per Locked Rule 13.**
```

---

## CA-9-B — Agent Charter Expansions (§15.1 + §15.2 + Locked Rule 2)

### CA-9-B.1 Locked Rule 2 prerequisite amendment (25 → 26)

CA-9-B adds **Agent #26 (Orchestra Research Agent)** as a new primary agent. This REQUIRES amending Locked Rule 2 (Roster lock: BaseAgent.js compile-time validates EXACTLY 25 unique agent IDs). Proposed amended text:

```md
2. Roster lock: BaseAgent.js compile-time validates EXACTLY **26**
   unique agent IDs (was 25 prior to CA-9-B). The 26-agent partition
   is canonical: 13 embedded (#1, #2, #3, #6, #7, #9, #10, #13, #15,
   #17, #19, #20, #26) + 8 FlowAI-internal-only (#4, #5, #8, #11,
   #12, #14, #16, #18) + 5 Ops Runners embedded (#21–#25). Compile-time
   validator in `BaseAgent.js` enforces exactly 26 unique IDs.
```

Implementation impact on `src/lib/agents/BaseAgent.js`:
- `AGENT_IDS` constant adds `ORCHESTRA_RESEARCH: 26`.
- `EMBEDDED_AGENTS` set includes `26`.
- `validateRosterPartition()` IIFE updated: expected size becomes 26; loop bound becomes `i <= 26`.
- `_validateCharter(c)` agentId range updated to `[1, 26]`.

This is a substantive Locked-Rule amendment; it surfaces as CA-9-B-Q1 in §CA-9-Q below.

### CA-9-B.2 Agent #11 Strategic Intelligence — charter expansion

**Today (Rev-2.1 §15.1):** cross-step · flowai-only · DORMANT · feeds continuous marketplace intelligence per Locked Rule 16.

**Proposed CA-9-B expansion:**
- **Primary charter function (new):** global AI-platform discovery — own the curated industry-tracker URL list; produce candidate signals consumable by Agent #26.
- **Consumes:** existing topics + new `community.signal.v1` (curated Slack/Discord webhook ingestion).
- **Produces:** existing + new `11.platform.discovery.v1` (payload: `{ candidate_id, candidate_name, source, evidence_url, observed_capabilities[], at }`).
- **Authority:** unchanged (`recommend_only`).
- **Status:** stays DORMANT until graduated via standard Panel + CEO disposition. CA-9-B canonicalises the expanded charter without flipping the dormant flag.

### CA-9-B.3 Agent #15 Benchmarking — charter expansion

**Today (Rev-2.1 §15.1):** cross-step · embedded · DORMANT · feeds Orchestra ranking updates per Locked Rule 16.

**Proposed CA-9-B expansion:**
- **Primary charter function (new):** continuous head-to-head scoring of Orchestra candidates vs existing members. Schedules benchmark runs on the 8 pipeline steps × each candidate capability; rolling 30-invocation minimum per (candidate × capability).
- **Consumes:** existing + new `26.orchestra.candidate.v1`, `11.platform.discovery.v1`.
- **Produces:** existing + new `15.benchmark.head_to_head.v1` (payload: `{ candidate_id, member_id, capability, candidate_score, member_score, sample_size, p50_latency_candidate_ms, p50_latency_member_ms, at }`).
- **Authority:** unchanged (`recommend_only`).
- **Status:** stays DORMANT.

### CA-9-B.4 Agent #17 Product Evolution — charter expansion

**Today (Rev-2.1 §15.1):** always-on · embedded · DORMANT · feeds Orchestra ranking + marketplace intelligence per Locked Rule 16.

**Proposed CA-9-B expansion:**
- **Primary charter function (new):** Orchestra composition recommendation + deprecation proposals. Consumes benchmark signals, surfaces "add candidate X" or "deprecate member Y" recommendations to Agent #26 and to the CEO via the Self-Renewal Alert cadence (Locked Rule 16).
- **Consumes:** existing + new `15.benchmark.head_to_head.v1`, `26.orchestra.admitted.v1`.
- **Produces:** existing + new `17.orchestra.deprecation_proposal.v1` (payload: `{ member_id, basis: 'sustained_low_rank' | 'high_error_rate' | 'capability_obsoleted', evidence_window_days, recommended_action, at }`).
- **Authority:** unchanged (`recommend_only`).
- **Status:** stays DORMANT.

### CA-9-B.5 Agent #26 (NEW) — Orchestra Research Agent

**Charter (proposed canonical):**

| Field | Value |
|---|---|
| `id` | `26` |
| `name` | `Orchestra Research Agent` |
| `mode` | `always-on` |
| `flowAiOnly` | `false` (embedded in every product) |
| `authority` | `[recommend_only, auto_write_internal]` — recommend_only for default operation; `auto_write_internal` invoked **only** for auto-admission writes to the Orchestra registry per §CA-9-A.4 (the threshold-met case). Requires `BaseAgent.guard()` extension per §CA-9-B.6 below to safely permit dual-authority. |
| `requiredCredentials` | `['ANTHROPIC_API_KEY', 'BROWSERLESS_API_KEY']` (analyze + crawl) |
| `marketplaceTools` | `['anthropic-api', 'browserless', 'playwright']` |
| `consumes` | `community.signal.v1`, `11.platform.discovery.v1`, `15.benchmark.head_to_head.v1`, `17.orchestra.deprecation_proposal.v1`, `vendor.changelog.poll.v1` (new) |
| `produces` | `26.orchestra.candidate.v1`, `26.orchestra.admitted.v1`, `26.orchestra.candidate_rejected.v1`, `26.orchestra.candidate_panel_gate.v1`, `26.orchestra.deprecated.v1`, `26.orchestra.lifecycle_state_changed.v1` |
| `escalationPolicy` | `severity-high-or-critical → emit candidate + analysis, hold for human gate. carve-out flag from #11 or #14 → emit candidate_panel_gate, do NOT auto-admit. auto-admission write failure → escalate to Ops Runner Alpha #21.` |

**Sibling-namespace consideration:** unlike the Self-Renewal Executor (CA-7's EXECUTOR_REGISTRY pattern), Agent #26 is a **primary agent** that needs its own ID slot in the 25-agent roster (now 26). It does NOT use EXECUTOR_REGISTRY because (a) its `auto_write_internal` authority is narrowly-scoped to the Orchestra registry (not arbitrary source-code writes), and (b) it must appear in the canonical agent roster for discoverability + audit-log routing. CA-7 + CA-9-B are therefore complementary, not duplicative.

### CA-9-B.6 BaseAgent.guard() amendment — dual-authority support

Agent #26's dual authority `[recommend_only, auto_write_internal]` is the same shape proposed in `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §4.2 Option A. CA-9-B inherits that guard amendment (per §4.2 of the Self-Renewal spec) — request-time authority selection: the plan declares `authorityNeeded: [<one of the declared authorities>]`, and `BaseAgent.guard()` checks set membership rather than the prior single-authority-hard-wall. Implementation reference: `BaseAgent.js` L221-227 today; amended form in Self-Renewal spec §4.2.

If CA-7 promotes first and `BaseAgent.guard()` is already amended, CA-9-B inherits the amendment with no further work. If CA-9-B promotes first, the guard amendment ships as part of CA-9-B's engineering dispatch and CA-7's Self-Renewal Executor inherits.

### CA-9-B.7 Proposed amendment to §15.1 — roster table

Insert a new row #26 at the bottom of the §15.1 roster table:

```md
| 26 | Orchestra Research Agent | always-on | — | embedded | DORMANT — owns auto-admission pipeline per CA-9-A; produces 6 new topics per §15.2 amendment |
```

Update the partition footer line:

```md
Partition: **13 embedded** in every product (#1, #2, #3, #6, #7, #9,
#10, #13, #15, #17, #19, #20, **#26**) + **8 FlowAI-internal-only**
(#4, #5, #8, #11, #12, #14, #16, #18) + **5 Ops Runners embedded**
(#21–#25). Compile-time validator in `BaseAgent.js` enforces exactly
26 unique IDs.
```

### CA-9-B.8 Proposed amendment to §15.2 — MessageBus topics

The MessageSchema.js topic registry (referenced in §15.2 first sub-bullet) gains the following new topics:

- `community.signal.v1` (consumed by #11, #26)
- `11.platform.discovery.v1` (produced by #11, consumed by #26)
- `15.benchmark.head_to_head.v1` (produced by #15, consumed by #26, #17)
- `17.orchestra.deprecation_proposal.v1` (produced by #17, consumed by #26)
- `26.orchestra.candidate.v1` (produced by #26)
- `26.orchestra.admitted.v1` (produced by #26)
- `26.orchestra.candidate_rejected.v1` (produced by #26)
- `26.orchestra.candidate_panel_gate.v1` (produced by #26)
- `26.orchestra.deprecated.v1` (produced by #26)
- `26.orchestra.lifecycle_state_changed.v1` (produced by #26)
- `vendor.changelog.poll.v1` (produced by #26 internally, consumed by #26 dispatch)

§15.2 first sub-bullet currently says "Topics conform to `MessageSchema.js` (40 topic constants today)." CA-9-B updates the count: **52 topic constants** after CA-9-B promotion (includes the `26.orchestra.candidate_reactivated.v1` topic introduced in §CA-9-A.5.1).

---

## CA-9-C — Customer Feedback Loop (§15.1 rows #3 + #10, §15.2, §16)

### CA-9-C.1 Background

Today's Self-Renewal cycle (Rev-2.1 §10 Self-Governance Layer + §12 Remediation Modes) triggers on:
- Agent #8 Quality Audit completion (`8.audit.completed.v1`).
- Agent #10 Monitor anomaly (`10.anomaly.v1`).
- Agent #17 Product Evolution proposal (`17.evolution.proposal.v1`).

There is **no canonical path from customer-reported issues into Self-Renewal**. CA-9-C closes that gap by expanding Agent #10 Monitor to ingest three external customer signal channels and emitting normalised customer-issue events that Agent #3 Self-Renewal (and its Executor per CA-7) consumes.

### CA-9-C.2 Agent #10 Monitor — charter expansion

**Today (Rev-2.1 §15.1):** step-owner step 8 monitor · embedded · DORMANT.

**Proposed CA-9-C expansion:**
- **Primary charter function expansion:** in addition to existing pipeline-monitor responsibilities, ingest three customer signal channels:
  - **In-app reporting:** a "Report an issue" widget surfaced per product (new UI per §CA-9-C.5); payload posted to `POST /api/customer/feedback`; Agent #10 polls or subscribes via Inngest job per `api/_lib/inngest.js`.
  - **App store / public review scraping:** Agent #10 dispatches `orchestra.dispatch('crawl', { url: <app-store-review-page> })` daily for each product with a registered app-store URL.
  - **Support ticket ingestion:** webhook receiver at `/api/customer/support-ticket-webhook` accepts payloads from Zendesk, Intercom, Help Scout, or other support platforms (vendor-specific adapters; multi-tenant per §13 RLS).
- **Consumes:** existing + new `customer.feedback.raw.v1`, `customer.review.scraped.v1`, `customer.support.ticket.v1`.
- **Produces:** existing + new `10.customer.feedback.v1` (normalised, de-duped, sentiment-tagged) and `10.customer.issue.v1` (issues that map to known `issueDetector` categories or new customer-driven categories).
- **Authority:** unchanged (`recommend_only`).
- **Status:** stays DORMANT.

### CA-9-C.3 Agent #3 Self-Renewal — trigger expansion

**Today (Rev-2.1 §15.1 + Self-Renewal spec `446ddb5`):** consumes `8.audit.completed.v1`, `10.anomaly.v1`, `17.evolution.proposal.v1`; emits `3.renewal.candidate.v1`.

**Proposed CA-9-C expansion:**
- **Consumes:** existing + new `10.customer.issue.v1` (output of Agent #10 customer-feedback normalisation). Agent #3 treats a customer-issue event identically to an audit finding for purposes of `analyzeRun()`, with one additional heuristic added to the existing 5-heuristic set: `customerReportedIssues` (severity `medium` if 1-2 reports on the same issue category in 24h; `high` if 3-9; `critical` if ≥10 — auto-deploys fork-and-fix block per existing severity gate in §12).
- **Produces:** unchanged (existing `3.renewal.candidate.v1` and CA-7-exec-ratified `3.renewal.applied.v1` / `.delta.v1` / `.build_failed.v1` / `.disabled.v1`).
- **Authority:** unchanged.

**Interaction with CA-7 EXECUTOR_REGISTRY (important):** the customer-issue-triggered renewal still goes through the Self-Renewal Executor (the auto_write_internal split-charter sibling per CA-7) when fork-and-fix mode is requested. Agent #3 itself remains `recommend_only`; the executor handles the side-effecting path. Customer feedback does not bypass the Human Gate for severity `high` or `critical` (per Rev-2.1 §10.2 + Self-Renewal spec §4.4).

### CA-9-C.4 New MessageBus topics

Add to MessageSchema.js (combined with CA-9-B count: **52 + 5 = 57 topic constants** after CA-9-B + CA-9-C, where the 52 already includes `26.orchestra.candidate_reactivated.v1` from §CA-9-A.5.1):

- `customer.feedback.raw.v1` (consumed by #10) — raw payload from any of the three channels before normalisation.
- `customer.review.scraped.v1` (consumed by #10) — review-scrape output from Orchestra `dispatch('crawl', ...)`.
- `customer.support.ticket.v1` (consumed by #10) — webhook-delivered support ticket payload.
- `10.customer.feedback.v1` (produced by #10) — normalised customer feedback (de-duped, sentiment-tagged).
- `10.customer.issue.v1` (produced by #10, consumed by #3) — normalised customer-reported issue mapped to `issueDetector` category set (or a customer-driven new category).

### CA-9-C.5 New UI surface — Customer feedback widget

A per-product widget rendered on every customer-facing surface of every product under FlowAI's management. Properties:

- **Placement:** floating button bottom-right; widget opens to a modal with three fields (issue category dropdown · description text · optional screenshot upload).
- **Data path:** `POST /api/customer/feedback` (new endpoint) → writes to `flowai_customer_feedback` Supabase table (new) → Agent #10 polls or Inngest-triggers.
- **RLS:** rows visible only to the owning provider org per Rev-2.1 §14.3 multi-tenant invariant.
- **Implementation locus:** part of the Self-Renewal Capability Package per Rev-2.1 §20 (so customer-feedback widget ships with the Self-Renewal package installation, propagating to all products that have Self-Renewal installed — currently all 5 VEU products).

### CA-9-C.6 Proposed amendment to §16 — Deployment infrastructure

The Customer Feedback widget addition ripples into §16 Live Monitor (Sprint 6 Phase 3). Insert one new bullet at the end of §16.4:

```md
- **Customer signal stream (per CA-9-C):** Live Monitor surface
  augmented with rolling 24h count of `10.customer.feedback.v1` +
  `10.customer.issue.v1` per product. Threshold-driven anomaly
  detection: ≥3 customer reports on the same issue category within
  24h surfaces as a `10.anomaly.v1` event for Agent #3 Self-Renewal
  consumption. Customer signal cadence is **near-real-time** (poll
  cadence ≤60s); ad-hoc support-ticket webhooks are processed
  inline.
```

### CA-9-C.7 Cost + privacy implications

- **Cost:** in-app widget is asynchronous (no LLM call on submission); Agent #10 normalisation uses MockClaude for nominal cases per the adversarial test plan's LD-6 hybrid pattern (no LLM cost for the 90% of events). Real-Claude is invoked only when sentiment classification requires it. Estimated cost: ≤$0.10 per product per day at expected volume.
- **Privacy:** customer-reported text MUST be scrubbed of PII before Agent #3 consumption. `scrubCredentials()` helper (per `src/lib/renewal/inputArtifact.js`) extended to scrub email, phone, name, credit-card patterns. GDPR-compliant retention per Rev-2.1 §14.3 + §11 Step 4 Data Export.
- **RLS:** customer-feedback rows are operator-readable + admin-readable within the same provider org; not surfaced to other tenants per Rev-2.1 §13. Customers themselves see their own feedback in the widget after submission ("Your report #N — status: triaged").

---

## Combined CA-9 Disposition Request

### Routing

- **W6 Panel review.** This CA-n proposes substantive amendments to canonical sections §8 + §15.1 + §15.2 + §16 + §25 (Locked Rules 2 and 18). Per Locked Rule 17 + P11 + §19, a Panel consultation MUST run before promotion. Threshold per §18.2: ≥7/10 ENGAGED supermajority per question.
- **Co-sequencing with CA-7 + CA-8.** CA-7 (EXECUTOR_REGISTRY) + CA-8 (X-Test-Bypass-Token) + CA-9 (this amendment) should pass through Panel in the same cycle. CA-9-B's BaseAgent.guard() amendment is inherited from CA-7's Self-Renewal Executor work — if both promote in the same cycle, the guard amendment ships once.
- **CEO ratification.** CEO disposes:
  - CA-9-A — confirm 0.70 auto-admission threshold + capability-gap rule + carve-out triggers.
  - CA-9-B — confirm 25 → 26 Locked Rule 2 amendment + Agent #26 charter as drafted.
  - CA-9-C — confirm Agent #10 + Agent #3 charter expansions + Customer Feedback widget UI surface.

### Open coupling (intentional)

CA-9-A + CA-9-B + CA-9-C are bundled because they form a single coherent capability — autonomous Orchestra evolution + customer-driven Self-Renewal — and partially share the BaseAgent.guard() dependency from CA-7. Splitting them risks landing one of the three without its enablers. Panel + CEO may dispose them as a unit or separately at their discretion.

---

## CA-9-Q — Panel Questions (5–8 questions, standard 4-option + INSUFFICIENT_INFORMATION frame)

W3 prepared the following Panel-consultation questions. Each accepts options (a)–(d) plus `INSUFFICIENT_INFORMATION` valid abstention. Supermajority threshold ≥8/10 ENGAGED per §18.2; quorum ≥7/10 ENGAGED below which the question requires re-Panel.

### CA-9-Q1 — Auto-admission threshold (0.70 rank_score floor)

The CA-9-A spec proposes `candidate_rank_score ≥ 0.70` as the auto-admission threshold. Is this the right floor?

- (a) Adopt 0.70 as proposed (matches median wired-adapter rank score).
- (b) Raise the floor to 0.80 (stricter; only top-tier candidates auto-admit; protects rank quality).
- (c) Lower the floor to 0.60 (more aggressive admission; broader experimentation; relies on Probation lifecycle state to filter underperformers).
- (d) Different threshold — specify in rationale.

### CA-9-Q2 — Capability-gap rule (auto-admission gated by coverage gap)

CA-9-A.4 rule 3 says a candidate is auto-admitted only if the existing Orchestra has fewer than 2 wired members covering at least one of the candidate's declared capabilities. Is this rule appropriate?

- (a) Adopt as proposed (prevents redundant coverage; Orchestra stays lean).
- (b) Remove the rule entirely (allow auto-admission regardless of existing coverage; redundancy provides resilience).
- (c) Tighten to "fewer than 3 wired members" (forces stricter coverage gap; lower admission rate).
- (d) Different rule — specify in rationale.

### CA-9-Q3 — Locked Rule 2 amendment 25 → 26 (Agent #26 addition)

CA-9-B requires amending Locked Rule 2's roster cap from 25 to 26 unique agents. Is this acceptable?

- (a) Approve 25 → 26 amendment (Agent #26 enters as a new primary agent in EMBEDDED_AGENTS).
- (b) Reject — reshape Agent #26 as an executor in EXECUTOR_REGISTRY per CA-7 instead (keeps 25-agent cap).
- (c) Approve but raise cap to a "soft" cap (e.g., "25 primary + N research/auxiliary") — change Locked Rule 2 semantics.
- (d) Defer Agent #26 until a different scheme is proposed (block CA-9-B).

### CA-9-Q4 — Agent #26 dual-authority charter `[recommend_only, auto_write_internal]`

Agent #26 needs to write to the Orchestra registry on auto-admission. CA-9-B.5 + CA-9-B.6 propose dual-authority via the same `BaseAgent.guard()` amendment from Self-Renewal Executor spec §4.2 (CA-7-inheriting). Is this safe?

- (a) Approve dual-authority charter (per CA-9-B.5); the per-invocation `authorityNeeded` gate is sufficient.
- (b) Approve but require `requires_human_gate` to also be declared (matching CA-7's Self-Renewal Executor pattern) — narrower scope of auto-write.
- (c) Reject — Agent #26 remains `recommend_only` and a separate "Orchestra Admission Executor" (sibling-namespace per CA-7 EXECUTOR_REGISTRY) does the writes.
- (d) Different scheme — specify in rationale.

### CA-9-Q5 — Customer feedback widget placement + scope

CA-9-C.5 proposes a per-product floating-button widget rendered on every customer-facing surface. Is this the right surface choice?

- (a) Adopt as proposed (floating widget per product, ships with Self-Renewal Capability Package).
- (b) Make the widget opt-in per product (provider chooses to enable; default off).
- (c) Surface customer feedback via existing in-product mechanisms only (support emails, app store reviews) — no new widget.
- (d) Different placement — specify in rationale.

### CA-9-Q6 — Customer issue → Self-Renewal severity mapping

CA-9-C.3 proposes: 1-2 customer reports on the same issue category in 24h = `medium`; 3-9 = `high`; ≥10 = `critical` (auto-deploys fork-and-fix block). Are these the right thresholds?

- (a) Adopt as proposed.
- (b) Lower thresholds (more aggressive: 1 report = `medium`; 2 = `high`; 3 = `critical`).
- (c) Raise thresholds (more conservative: 5 = `medium`; 15 = `high`; 30 = `critical`).
- (d) Different mapping — specify in rationale.

### CA-9-Q7 — Live deprecation gate (Locked Rule 13 + 17 retention)

CA-9-A.6 retains Panel + CEO gates on **deprecation, capability remapping, and carve-outs**. Is this carve-out set sufficient?

- (a) Adopt as proposed (admission auto, the three listed remain Panel-gated).
- (b) Also add **first-30-days post-admission** to the gated set (any decisions about a Trial-state member also Panel-gated until Probation).
- (c) Reduce gates further (auto-deprecation also allowed if rolling 30-day rank_score < 0.50 for ≥ 7 consecutive days).
- (d) Different gate set — specify in rationale.

### CA-9-Q8 — Combined CA-9 disposition

Should CA-9-A + CA-9-B + CA-9-C be promoted as a single unit, or split?

- (a) Promote all three together (recommended — they form one coherent capability).
- (b) Promote CA-9-A and CA-9-B only; defer CA-9-C until customer-feedback infrastructure is built.
- (c) Promote CA-9-C only; defer CA-9-A + CA-9-B until Agent #26 charter is rewritten without Locked Rule 2 amendment.
- (d) Defer all three (re-Panel after addressing dissent).

---

## Provenance

| Source | Used for |
|---|---|
| CEO-locked feature spec 2026-05-15 | CA-9-A / CA-9-B / CA-9-C scope + Q1/Q2/Q3 directives |
| Rev-2.1 §8 (Orchestra) | CA-9-A §8.1 insertion point |
| Rev-2.1 §15.1 (25-agent roster) | CA-9-B row insertion + partition update |
| Rev-2.1 §15.2 (MessageBus topics + OrchestratorHub + AgentRegistry) | CA-9-B + CA-9-C topic additions |
| Rev-2.1 §16 (Deployment infrastructure / Live Monitor) | CA-9-C §16.4 ripple |
| Rev-2.1 §18 CA-n cycle | Routing + promotion workflow |
| Rev-2.1 §25 Locked Rules 2 / 16 / 17 / 18 | Locked Rule 2 amendment + Rule 18 clarification |
| `docs/specs/ORCHESTRA_INTEGRATION_SPEC.md` §4.3 bootstrap baselines | 0.70 threshold rationale |
| `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §4.2 Option A + §4.4 severity routing | BaseAgent.guard amendment inheritance + customer-issue severity mapping |
| `docs/specs/SSOT_AMENDMENT_CA7_CA8_DRAFT.md` (CA-7 EXECUTOR_REGISTRY) | Sibling-namespace cross-reference + co-sequencing rationale |
| `docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md` LD-6 | Hybrid MockClaude/real-Claude pattern for cost-effective sentiment classification |
| Sprint PROTECT-1 Phase 2 scheduled-self-test cadence | 03:00 UTC daily research-loop cadence alignment |

---

## Versioning

CA-9 is a single combined amendment with three sub-amendments (A/B/C). Numbering continues from the existing CA-1 / CA-2 / CA-3 ratified sequence (§18.4) plus the in-flight CA-7 + CA-8 drafts (commit `ce96055`). CA-4 / CA-5 / CA-6 remain deferred per their respective Panel consultations.

This draft does NOT promote unilaterally; it is the Panel-input document for the next W6 consultation cycle (recommended co-cycled with CA-7 + CA-8).

*End of CA-9 draft. Pending Panel review per §19 + CEO ratification per §18.*
