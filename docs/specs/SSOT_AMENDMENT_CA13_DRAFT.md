# SSOT Amendment Draft — CA-13 (GTM Bar 75→95 + CA-9-Q4 Reconciliation)

**Status:** DRAFT — pending W6 Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18).
**Author:** W3, 2026-05-18.
**Anchor canonical SSOT:** `docs/CANONICAL_REFERENCE.md` (Rev-2.1 + ENTRY 003–010 cumulative).
**Target sections amended:**
- **§7.6** — GTM Readiness Report (score bands + Clearance Step 5 prerequisite).
- **§11** — Six-Step Product Clearance Protocol (Step 5 "Demo Readiness" — what `≥75` prereq becomes).
- **§15** — 26-AGENT ROSTER intro paragraph (CA-9-Q4 phrasing).
- **§15.1** — Roster row 21 (Agent #21 ACE Conductor) authority field; row 26 (Agent #26 Orchestra Research) authority field.
- **§19** — Governance (95/95 + Panel + SSOT Access) — explicit reconciliation that the **GTM-ready bar (`≥95`)** and the **Self-Audit 95/95 threshold** are DISTINCT mechanisms; neither replaces the other; both must pass independently.
- **§25 Locked Rule 2** — partition wording check (no authority claims; just confirms the wording does not assert dual-authority on primary).
- **`docs/CANONICAL_HISTORY.md` ENTRY 010** — footnote correction ("≥75 sustained" → "≥95 sustained per CA-13-A").
- **NEW pre-promotion archive:** `docs/archive/FLOWAI_SSOT-pre-CA13-promotion-2026-05-18.md` (verbatim copy of canonical `docs/CANONICAL_REFERENCE.md` immediately before this CA-13 edit applies; per §18.3 archive discipline).

**Lineage:** Rev-2.1 canonical (commit `9495b26`) → ENTRY 003 (Rev-2.1 promotion) → ENTRY 004 (CA-7+CA-8 promotion, `fd94f1e`) → ENTRY 005 (CA-9+CA-10 promotion, `5dcd865`) → ENTRY 006 (ACE promotion, `66149da`) → ENTRY 007 (auth-traversal Phase 3 complete, `fd8319d`) → ENTRY 008 (MessageBus P0 wiring + foundation audit) → ENTRY 009 (W05 closing decisions — **CA-9-Q4 Option (a) LOCKED**, Self-Renewal v4 ratified, cluster-template ratifications) → ENTRY 010 (Phase A live build + GTM bar 95 CEO directive surfaced) → this CA-13 draft.

**Two amendments bundled:**
- **CA-13-A:** GTM-ready bar 75 → 95 (CEO directive, ENTRY 010 evidence trail). Amends §7.6 score bands + §11 Step 5 prerequisite + §19 reconciliation paragraph + ENTRY 010 footnote correction.
- **CA-13-B:** CA-9-Q4 reconciliation — strike v2 "(b) dual-authority" phrasing from §15 intro + §15.1 rows 21/26; canonize Option (a) **EXECUTOR_REGISTRY sibling pattern per CA-7 §15.5** as the locked disposition per ENTRY 009.

Both sub-amendments are Locked-Rule-1 anti-drift fixes: code + ENTRY 009/010 already reflect the new state; canonical text (CANONICAL_REFERENCE) currently contradicts. CA-13 closes the divergence.

---

## CA-13-A — §7.6 GTM Readiness bar 75 → 95

### Rationale

ENTRY 010 records the CEO directive that the canonical GTM-ready threshold is **95** (not 75). The CEO directive originates from the §1.1 market-definition discipline (commits `c49f074` / `91f0c71` / migration `0015_product_market_definitions.sql`) — a product is GTM-ready when it serves its FULL DEFINED MARKET, not a subset; a 75/100 score on a product that misses 25% of its market capability is not "demo-ready" by the operator-product GTM bar, regardless of band-label history. The ratified §7.6 (per ENTRY 006) sets `Demo-ready` at 75–89 and `Showcase-ready` at 90–100; ENTRY 010 line 1790 explicitly footnotes "the canonical GTM-ready target is ≥75/100 sustained across the repeat-until-GTM loop" — which now diverges from the CEO directive of ≥95.

Per Locked Rule 1 (source-of-truth hierarchy: code > canonical > user-curated memory > auto-memory), the canonical text must follow the code-level evidence. ENTRY 010's 42/100 demonstration was a single-pass proof; the repeat-until-GTM loop targets ≥95 sustained per the CEO directive, not 75.

This amendment does NOT change the scoring formula (per §7.6 verbatim: `score = 100 − (10 × count_critical) − (5 × count_high) − (2 × count_medium) − (0.5 × count_low)`). It changes the band labels and the §11 Step 5 prerequisite. The four-prerequisite gate at §7.6 line 199–203 is tightened (`≥75` → `≥95`).

### §7.6 — Score bands (before / after)

**BEFORE (canonical as of ENTRY 006 / 2026-05-16; lines 188–195):**

```markdown
**Score bands (canonical):**

| Score band | Label | Demo guidance |
|---|---|---|
| 90–100 | **Showcase-ready** | Safe to send to any prospect demo; passes §11 Clearance Step 5 cleanly |
| 75–89 | **Demo-ready** | Safe with named caveats; LIMITATIONS section MUST be shown |
| 60–74 | **Internal-only** | Not for external demo; surfaces to §11 Step 5 as "conditional" |
| 0–59 | **Not demo-ready** | Blocks §11 Clearance Step 5 until Self-Renewal closes `critical` + `high` |
```

**AFTER (CA-13-A canonical; replaces verbatim):**

```markdown
**Score bands (canonical per CA-13-A; supersedes ENTRY 006 bands):**

| Score band | Label | Demo guidance |
|---|---|---|
| 95–100 | **GTM-ready** | Safe to send to any prospect demo; passes §11 Clearance Step 5 cleanly. **Canonical GTM bar — CEO directive 2026-05-18 (CA-13-A).** Product serves its full §1.1 market definition. |
| 90–94 | **Near-GTM** | Substantively complete; LIMITATIONS section MUST be shown; surfaces to §11 Step 5 as "conditional" (clearance achievable with explicit limitations enumerated). |
| 75–89 | **Internal-only** | Safe for internal review only; demos to external prospects BLOCKED. Self-Renewal targets remaining gaps. |
| 60–74 | **Pre-internal** | Material work remaining; not safe even for internal stakeholders without supervision. |
| 0–59 | **Not demo-ready** | Blocks §11 Clearance Step 5 until Self-Renewal closes `critical` + `high`. |
```

### §7.6 — Clearance Step 5 prerequisite (before / after)

**BEFORE (canonical as of ENTRY 006, line 199–203):**

```markdown
**Maps to §11 Clearance Step 5 (Demo Readiness)** — ENTRY 006 extends §11 Step 5 to require **ALL** of:
- GTM Readiness Report exists for the product in the current environment.
- Report score **≥75** (Demo-ready band) AND **zero `critical` findings open**.
- Self-Renewal cycle on all findings ≥`high` has reached a terminal decision (Resolved / Human-gated / Documented per §6).
- LIMITATIONS section published verbatim in delivery.
```

**AFTER (CA-13-A canonical):**

```markdown
**Maps to §11 Clearance Step 5 (Demo Readiness)** — CA-13-A tightens the §11 Step 5 prerequisite to require **ALL** of:
- GTM Readiness Report exists for the product in the current environment.
- Report score **≥95** (GTM-ready band per CA-13-A; supersedes ENTRY 006's ≥75 prereq) AND **zero `critical` findings open**.
- Self-Renewal cycle on all findings ≥`high` has reached a terminal decision (Resolved / Human-gated / Documented per §6).
- LIMITATIONS section published verbatim in delivery (still required even at 95+; LIMITATIONS captures known band-vs-spec deltas that don't show as findings).
- Conditional path: a Near-GTM score (90–94) with all `critical` + `high` findings terminally decided + LIMITATIONS published MAY pass Step 5 as "conditional clearance" (admin-only signoff per §13 Approval Gate role discipline; recorded as conditional in `ClearanceRecord`).
```

### §19 reconciliation — GTM bar 95 vs Self-Audit 95/95 are DISTINCT

This is the load-bearing clarity edit. §19 line 742 currently says:

> **95/95 threshold:** every Self-Audit dimension scored ≥95/100 with ≥95% confidence. Enforced by `src/lib/governance/ScoreEvaluator.js`. Sub-95 on any dimension halts Step 5 Deploy. Override requires admin role + audit-log entry.

The number "95" appears in TWO distinct contexts after CA-13-A. They MUST NOT be conflated:

**§19 paragraph addition (BEFORE the current §19 line 742; new sub-section §19.0):**

```markdown
### §19.0 — Two distinct "95" bars (CA-13-A clarification)

After CA-13-A, the canonical SSOT carries TWO independent mechanisms that
both use the number "95". They are NOT the same mechanism; neither replaces
the other; both must pass independently per Locked Rule 3 (three governance
mechanisms must all pass).

| Mechanism | Source | Owner | Scope | What "95" means |
|---|---|---|---|---|
| **Self-Audit 95/95 threshold** | §19 (canonical since Sprint 5) | `src/lib/governance/ScoreEvaluator.js` | Step 4 Quality Audit; 5 dimensions (UI/UX, API, Logic, Business Value, Security Posture) | Each dimension scored ≥95/100 AND ≥95% confidence. Per-dimension boolean (all 5 must pass). |
| **GTM Readiness ≥95 bar** | §7.6 + CA-13-A | Agent #21 ACE Conductor (`21.gtm.readiness.v1`) | Aggressive Crawl Engine post-crawl report | Single per-`(productId, environment)` score derived from §7.6 formula; ≥95 = GTM-ready band. |

**Why both exist:** Self-Audit 95/95 measures whether the BUILD passes
quality gates (does the code compile, are the APIs sound, is the security
posture acceptable). GTM Readiness ≥95 measures whether the RUNNING PRODUCT
serves its full §1.1 market definition (do the AI agents respond, are
the demo flows complete, do error states surface gracefully). A product
can pass Self-Audit 95/95 (clean build) but fail GTM-ready ≥95 (build is
correct but the deployed product still has dead modals or unreachable AI
agents). Both gates exist for distinct purposes; failing either blocks
§11 Clearance Step 5.

**Override semantics:** Self-Audit 95/95 override requires admin role +
audit-log entry per §19 existing rule. GTM Readiness ≥95 override is
**not permitted** — the Near-GTM (90–94) "conditional clearance" path
per CA-13-A §7.6 is the canonical handle; admin cannot manually override
a Pre-internal or Not-demo-ready score to "GTM-ready" without re-running
Self-Renewal to actually close the underlying findings.
```

### ENTRY 010 footnote correction

ENTRY 010 line 1790 currently reads:

> Full GTM-ready loop verified end-to-end (the current 42/100 is a single-pass demonstration; the canonical GTM-ready target is **≥75/100** sustained across the repeat-until-GTM loop until terminal decision).

**Correction per CA-13-A:**

> Full GTM-ready loop verified end-to-end (the current 42/100 is a single-pass demonstration; the canonical GTM-ready target is **≥95/100 sustained per CA-13-A (CEO directive 2026-05-18; bands ratified post-Panel at CA-13 promotion)** across the repeat-until-GTM loop until terminal decision. The ENTRY 010 reference to "≥75 sustained" reflected the pre-CA-13-A ENTRY 006 band threshold; updated here for SSOT consistency per Locked Rule 1.)

(The correction is applied to CANONICAL_HISTORY.md ENTRY 010 verbatim at the same commit that promotes CA-13, not in a separate edit cycle. ENTRY 010 is historical; the correction is an inline footnote noting CA-13-A supersession, NOT a rewrite of the original entry.)

---

## CA-13-B — CA-9-Q4 Option (a) EXECUTOR_REGISTRY sibling reconciliation

### Rationale

ENTRY 009 line 1742 records the locked decision verbatim:

> **CA-9-Q4 Option (a) LOCKED — Agents #21 + #26 via EXECUTOR_REGISTRY sibling pattern.** Earlier session work referenced Option (b) `requires_human_gate` paired with `auto_write_internal` per the CEO's initial CA-9-Q4 arbitration. This session re-disposes to **Option (a) — EXECUTOR_REGISTRY sibling, per CA-7 §15.5**, which provides the `auto_write_internal` capability surface through the registry adapter rather than the primary `BaseAgent` authority layer. Keeps `BaseAgent.guard()` strict per-invocation `authorityNeeded` set membership; permits split-charter agents to invoke internal-write capability through the sibling namespace. Reflected in `api/agent/21/execute.js` and `api/agent/3/execute.js` executor wiring.

ENTRY 009 is the load-bearing canonical record. The wiring already lives in code (`api/agent/21/execute.js`, `api/agent/3/execute.js`). But `CANONICAL_REFERENCE.md` line 469 (§15 intro), line 495 (§15.1 row 21), and line 500 (§15.1 row 26) still carry the old "CA-9-Q4=(b)" / "dual-authority" / "requires_human_gate paired with auto_write_internal" phrasing. Per Locked Rule 1, the canonical text must match the code-level decision in ENTRY 009.

This amendment strikes the stale (b) phrasing and replaces it with Option (a) sibling-pattern language, citing ENTRY 009 as the canonical disposition record.

### §15 intro — before / after

**BEFORE (line 469 verbatim):**

```markdown
All 26 agents (was 25 prior to CA-9-B / ENTRY 005) are proprietary VEU IP. All ship dormant at `recommend_only` per Sprint 5 governance pattern. OrchestratorHub wire-in **per-agent** as each ships; the original Rev-1 "wire-in only after all 25 built" was overly restrictive and Panel-flagged. Agent #26 was added per CA-9-B; CEO arbitration CA-9-Q4=(b) requires its `auto_write_internal` authority to be paired with `requires_human_gate` (BaseAgent.guard() enforces dual-authority via per-invocation `authorityNeeded` set membership; same shape as the Self-Renewal Executor per CA-7 §15.5).
```

**AFTER (CA-13-B canonical):**

```markdown
All 26 agents (was 25 prior to CA-9-B / ENTRY 005) are proprietary VEU IP. All ship dormant at `recommend_only` per Sprint 5 governance pattern. OrchestratorHub wire-in **per-agent** as each ships; the original Rev-1 "wire-in only after all 25 built" was overly restrictive and Panel-flagged. Agent #26 was added per CA-9-B. **CA-9-Q4 was re-disposed to Option (a) per ENTRY 009 (2026-05-17, LOCKED): the `auto_write_internal` capability surface for split-charter agents (#21 + #26) is provided through the EXECUTOR_REGISTRY sibling pattern per CA-7 §15.5 — NOT through dual-authority on the primary `BaseAgent` row.** Primary agent charters retain `recommend_only`; elevated-authority counterparts live in the sibling registry. `BaseAgent.guard()` remains strict per-invocation `authorityNeeded` set membership. The earlier CA-9-Q4=(b) phrasing (dual-authority on primary) is SUPERSEDED by CA-13-B citing ENTRY 009.
```

### §15.1 row 21 — before / after

**BEFORE (line 495 verbatim, condensed):**

```markdown
| 21 | Ops Runner Alpha — **Aggressive Crawl Conductor** ... | step-owner | (cross-step within step 1 research + step 8 monitor — Aggressive Crawl Engine phase) | embedded | DORMANT (charter ratified; engineering wire-in pending). Authority **`[recommend_only, auto_write_internal, requires_human_gate]`** (dual + gate mirroring Agent #26 per CA-9-Q4=(b)). ... |
```

**AFTER (CA-13-B canonical):**

```markdown
| 21 | Ops Runner Alpha — **Aggressive Crawl Conductor** ... | step-owner | (cross-step within step 1 research + step 8 monitor — Aggressive Crawl Engine phase) | embedded | DORMANT (charter ratified; engineering wire-in pending). **Primary authority: `[recommend_only]`** (per ENTRY 009 CA-9-Q4 Option (a) LOCKED). Elevated-authority surface (`auto_write_internal`, `requires_human_gate`) provided via EXECUTOR_REGISTRY sibling per CA-7 §15.5 — sibling charter `aggressive-crawl-conductor-executor` (agentId=21, mode=`cross-step`). Sibling executor wired via `api/agent/21/execute.js`. ... |
```

(Remainder of the row 21 cell — consumes / produces / credentials / marketplace tools / escalation — unchanged.)

### §15.1 row 26 — before / after

**BEFORE (line 500 verbatim, condensed):**

```markdown
| 26 | Orchestra Research Agent (NEW per CA-9-B + CA-9-Q4=(b)) | always-on | — | embedded | DORMANT — owns the auto-admission pipeline per §8.1. Authority **`[recommend_only, auto_write_internal, requires_human_gate]`** (dual + gate per CEO arbitration CA-9-Q4=(b); the `requires_human_gate` is required whenever `auto_write_internal` is declared, mirroring the Self-Renewal Executor charter shape per CA-7 §15.5). ... |
```

**AFTER (CA-13-B canonical):**

```markdown
| 26 | Orchestra Research Agent (NEW per CA-9-B; CA-9-Q4 re-disposed Option (a) per ENTRY 009) | always-on | — | embedded | DORMANT — owns the auto-admission pipeline per §8.1. **Primary authority: `[recommend_only]`** (per ENTRY 009 CA-9-Q4 Option (a) LOCKED). Elevated-authority surface (`auto_write_internal`, `requires_human_gate`) provided via EXECUTOR_REGISTRY sibling per CA-7 §15.5 — sibling charter `orchestra-research-agent-executor` (agentId=26, mode=`always-on`-sibling). Sibling executor wired via `api/agent/3/execute.js` analog (admission-write path; not the Agent #3 file literally — clarified at engineering dispatch). ... |
```

(Remainder of the row 26 cell — consumes / produces / credentials / marketplace tools — unchanged.)

### §25 Locked Rule 2 — partition wording check

§25 Locked Rule 2 (line 993) reads:

> Roster lock: BaseAgent.js compile-time validates EXACTLY **26** unique agent IDs (was 25 prior to CA-9-B / ENTRY 005, 2026-05-15). The 26-agent partition is canonical: **13 embedded** (#1, #2, #3, #6, #7, #9, #10, #13, #15, #17, #19, #20, #26) + **8 FlowAI-internal-only** (#4, #5, #8, #11, #12, #14, #16, #18) + **5 Ops Runners embedded** (#21–#25). `validateRosterPartition()` IIFE enforces partition size 26 + cumulative ID range [1, 26].

This wording does not claim dual-authority on primary — it speaks only to ID partition + count + embedding. **No edit required.** CA-13-B confirms §25 Locked Rule 2 wording is internally consistent with Option (a); the partition + count facts remain unchanged.

### §15.5 — no edit required (already canonical)

§15.5 EXECUTOR_REGISTRY section already documents the sibling pattern that CA-13-B canonizes for #21 + #26. The new sibling charters `aggressive-crawl-conductor-executor` and `orchestra-research-agent-executor` need to be added to the §15.5 row table at engineering dispatch time (separate W5x amendment commit; CA-13-B canonizes the DECISION, not the row-table populate).

---

## Pre-promotion archive (per §18.3)

**Archive path:** `docs/archive/FLOWAI_SSOT-pre-CA13-promotion-2026-05-18.md`

**Archive content:** verbatim copy of `docs/CANONICAL_REFERENCE.md` immediately BEFORE the CA-13 edits apply (per §18.3 + line 723 archive convention). The archive captures the canonical SSOT state at end-of-ENTRY-010 (current state including unresolved CA-9-Q4 wording + 75-bar GTM).

Archive creation is performed at CA-13 promotion-commit time (W5x territory), not at draft commit time. This draft file documents the path; the actual archive lands when CEO ratifies + W5x promotes.

---

## Panel Questions for W6

Per Locked Rule 17 (every W0x→CEO message requiring CEO action must be Panel-reviewed ≥7/10 ENGAGED before delivery), CA-13 enters the Panel cycle prior to CEO ratification. Five questions for W6:

### CA-13-A Panel Questions (3)

**CA-13-A-Q1 — GTM bar 95 ratification.**
Should §7.6 GTM Readiness Report adopt the CEO directive of `≥95` as the GTM-ready band (per CA-13-A), superseding the ENTRY 006 `≥75` Demo-ready band?

- (a) **Ratify** — adopt CA-13-A §7.6 bands verbatim. GTM-ready = 95–100; Near-GTM (conditional clearance) = 90–94; Internal-only = 75–89; Pre-internal = 60–74; Not-demo-ready = 0–59.
- (b) **Ratify with revision** — adopt the bar change but adjust band labels or thresholds (specify).
- (c) **Reject** — keep ENTRY 006's `≥75` Demo-ready bar; surface the CEO directive as an operator-product GTM bar (per-product target) rather than the §7.6 canonical band threshold.
- (d) **Defer** — surface the CEO directive but do not amend §7.6 until at least one VEU product demonstrates `≥95` sustained end-to-end per ENTRY 010 repeat-until-GTM loop.
- (e) INSUFFICIENT_INFORMATION.

**CA-13-A-Q2 — Near-GTM "conditional clearance" path.**
The CA-13-A draft introduces a Near-GTM band (90–94) that MAY pass §11 Step 5 as "conditional clearance" (admin signoff per §13 Approval Gate). Right balance, or should the 95-bar be hard with no conditional path?

- (a) Adopt conditional path as drafted — Near-GTM passes Step 5 with admin signoff + LIMITATIONS published verbatim.
- (b) Eliminate conditional path — `≥95` is hard; below 95 → blocked; admin cannot signoff a Near-GTM as cleared.
- (c) Tighten conditional path — Near-GTM passes Step 5 only when ALL `high` findings are Resolved (not just terminally decided; documented + human-gated insufficient).
- (d) Loosen conditional path — Near-GTM passes Step 5 with operator signoff (not just admin); admin retains override authority.
- (e) INSUFFICIENT_INFORMATION.

**CA-13-A-Q3 — §19 reconciliation paragraph.**
Should the canonical §19 carry an explicit "two-distinct-95 bars" reconciliation paragraph (CA-13-A §19.0) to prevent future conflation between Self-Audit 95/95 and GTM Readiness ≥95?

- (a) **Ratify** — adopt §19.0 verbatim. The reconciliation paragraph is load-bearing per Locked Rule 3 (three independent governance mechanisms must all pass).
- (b) **Ratify with revision** — keep the reconciliation principle but adjust the §19.0 wording (specify).
- (c) **Reject** — the table at §10 already lists the three mechanisms; an additional §19.0 paragraph is redundant.
- (d) Move the reconciliation to §10 (Self-Governance Layer) instead of §19 (Governance / Panel / SSOT Access) — better topical fit.
- (e) INSUFFICIENT_INFORMATION.

### CA-13-B Panel Questions (2)

**CA-13-B-Q1 — CA-9-Q4 Option (a) ratification.**
ENTRY 009 records the CEO re-disposition of CA-9-Q4 to Option (a) — EXECUTOR_REGISTRY sibling pattern — but `CANONICAL_REFERENCE.md` §15 intro + §15.1 rows 21/26 still carry the old (b) phrasing. Should the canonical text be amended to match ENTRY 009?

- (a) **Ratify** — adopt CA-13-B verbatim. Strike "(b) dual-authority" phrasing from §15 intro + §15.1 rows 21/26; replace with Option (a) sibling-pattern language citing ENTRY 009.
- (b) **Ratify with revision** — adopt the strike but adjust the replacement wording (specify; e.g. shorter citation, different phrasing of "primary authority retained at recommend_only").
- (c) **Reject** — leave the canonical text at (b) phrasing; treat ENTRY 009's "Option (a) LOCKED" as a code-level decision that doesn't propagate to §15 wording (Panel argues §15 wording is descriptive of the agent's TOTAL authority surface including sibling).
- (d) **Defer** — wait for engineering dispatch to actually populate the §15.5 sibling-row table with `aggressive-crawl-conductor-executor` + `orchestra-research-agent-executor` rows; amend §15 intro + §15.1 at that same commit (joint disposition).
- (e) INSUFFICIENT_INFORMATION.

**CA-13-B-Q2 — Sibling charter naming canonical.**
CA-13-B uses `aggressive-crawl-conductor-executor` (Agent #21 sibling) and `orchestra-research-agent-executor` (Agent #26 sibling) as the sibling charter keys. Right naming or should the keys follow a different convention?

- (a) Adopt as drafted — `<agent-short-name>-executor` pattern (consistent with existing `self-renewal-executor` per CA-7 §15.5 row).
- (b) Adopt agentId-keyed naming instead — e.g. `agent-21-executor`, `agent-26-executor` (consistent with `_registry.ts` agentId column).
- (c) Adopt capability-keyed naming — e.g. `crawl-write-executor`, `orchestra-admission-executor` (consistent with what the sibling DOES rather than which primary it siblings).
- (d) Defer naming to engineering dispatch — CA-13-B canonizes the DECISION; W5x picks the keys at population time.
- (e) INSUFFICIENT_INFORMATION.

---

## Acceptance criteria for CA-13 ratification

W6 ratification ≥7/10 ENGAGED on each of the 5 Panel questions above, plus the Panel-attached engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6, plus CEO disposition. If all 5 ratify (a)-clean, CA-13 promotes as a single CA cycle covering both A and B sub-amendments.

If Panel ratifies CA-13-A but not CA-13-B (or vice versa), the ratified half promotes alone and the unratified half re-enters a CA-14 revision draft.

If CEO arbitration is required on any question, CA-13 is re-routed per Locked Rule 13 (CEO retains absolute veto) — arbitration recorded at promotion-commit time in CANONICAL_HISTORY's CA-13 entry.

---

## Surfaces affected at engineering dispatch (post-ratification)

CA-13 is a canonical-text amendment; the code-level state already reflects the intent (per ENTRY 009/010 and `api/agent/21/execute.js` + `api/agent/3/execute.js` wiring). At promotion time, the only file changes required are:

1. `docs/CANONICAL_REFERENCE.md` — §7.6 score bands + Step 5 prereq, §15 intro paragraph, §15.1 rows 21+26 authority cells, NEW §19.0 reconciliation paragraph.
2. `docs/CANONICAL_HISTORY.md` — ENTRY 010 footnote correction at line 1790 (`≥75` → `≥95`); NEW ENTRY 011 recording CA-13 promotion.
3. `docs/archive/FLOWAI_SSOT-pre-CA13-promotion-2026-05-18.md` — pre-promotion snapshot (per §18.3).
4. (Out of scope for CA-13 promotion commit; separate W5x dispatch) Populate §15.5 row table with `aggressive-crawl-conductor-executor` + `orchestra-research-agent-executor` sibling charters.

No `src/` or `api/` changes accompany CA-13 — the code reflects the decision already; CA-13 makes the canonical TEXT match.

---

*End of CA-13 draft. Pending W6 Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18).*
