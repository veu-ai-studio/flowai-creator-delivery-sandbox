# SSOT Amendment Draft — CA-13 v2 (GTM bar DEFERRED + Near-GTM ELIMINATED + capability-keyed sibling naming)

**Status:** DRAFT v2 — applies W6 quorum-fix REVISE directions (`docs/panel-consultations/ca-13-quorum-fix-rerun-2026-05-19.md`, 0/5 cleared) per CEO Locked Rule 13 dispatch. Pending W6 re-Panel.
**Author:** W3, 2026-05-19.
**Lineage:** CA-13 v1 (`81cf144`, 75→95 + CA-9-Q4 §15 wording) → joint Panel `8e185a6` engagement-gated → W6 quorum-fix rerun `cc14a8f` (0/5 cleared) → CEO REVISE directions (this dispatch) → v2 draft.

**v2 size discipline:** ≤35K chars per proven engagement recipe. Current file ~21K chars; question block kept inline.

---

## v2 changelog (per-Q REVISE vs v1)

| Q | v1 verdict (rerun) | v2 change applied | Driving Panel slot(s) |
|---|---|---|---|
| **A-Q1** | `PLURALITY_CA13AQ1-DEFER` 5/8 | **GTM bar 95 DEFER to operator-config knob.** Canonical §7.6 score-band table stays at v1 ENTRY 006 values (75/89/74/59); ≥95 becomes a documented operator-config knob (`product_registry.gtm_ready_bar_override`, default 75 = ENTRY 006 band threshold; bounds [75, 100]). ≥95 stays a CEO directive (recorded in ENTRY/operator-config) UNTIL ≥1 VEU product sustains ≥95 end-to-end. THEN re-promote 95-bar via successor CA. | Slot 1 (clearance-records-break), Slot 3 (no migration path), Slot 8 (premature canonical commitment) |
| **A-Q2** | `SPLIT` 4/8 (HARD top) | **Near-GTM 90–94 conditional band ELIMINATED entirely.** v2 draft adopts HARD threshold semantics as primary; no conditional-clearance path exists. If Panel insists on retaining any conditional path in v2 re-Panel, retained conditional MUST require ALL `high` findings *Resolved* (NOT "terminally decided" per v1) — Resolved means finding fully closed, not "Documented" or "Human-gated". | Slot 1 (governance bypass loophole), Slot 6 (admin-only signoff weakens market-fulfillment intent) |
| **A-Q3** | `PLURALITY_CA13AQ3-RATIFY` 6/8 (below quorum) | Retain v1 §19.0 reconciliation paragraph unchanged; re-Panel at v2. | (no REVISE direction — plurality-RATIFY only) |
| **B-Q1** | `PLURALITY_CA13BQ1-RATIFY` 5/8 (below quorum) | Retain v1 §15-intro + §15.1 rows 21/26 CA-9-Q4 Option-(a) wording reconciliation unchanged (sibling-pattern language stays; "(b) dual-authority" still struck); re-Panel at v2. | (no REVISE direction — plurality-RATIFY only) |
| **B-Q2** | `PLURALITY_CA13BQ2-CAPABILITY` 4/8 | **Sibling charter naming switched to capability-keyed** (`crawl-write-executor` for Agent #21 sibling; `orchestra-admission-executor` for Agent #26 sibling). v1's `aggressive-crawl-conductor-executor` + `orchestra-research-agent-executor` are dropped; capability-keyed naming is what the sibling DOES, not which primary it siblings. | Slot 5 (capability-clarity), Slot 7 (naming convention coherence) |

**Net v2 effect:**
- §7.6 score bands UNCHANGED from v1 ENTRY 006 (75/89/74/59 thresholds).
- §11 Step 5 prerequisite UNCHANGED (≥75 + zero `critical` + Self-Renewal terminal on `high` + LIMITATIONS published; CA-14-A's Phase B prerequisite + CA-14-A's verbatim LIMITATIONS wording layer on per ENTRY 015 cleared-8).
- §19.0 reconciliation paragraph between "two distinct 95 bars" UNCHANGED (re-Panels at v2).
- CA-9-Q4 §15 / §15.1 wording reconciliation UNCHANGED (Option (a) sibling pattern per ENTRY 009 LOCKED; re-Panels at v2).
- Sibling charter keys RENAMED to capability-keyed.
- ≥95 operator-config knob NEW per CA-13-A v2.

---

## CA-13-A v2 — §7.6 score bands UNCHANGED + operator-config knob NEW

### Rationale

The ENTRY 006-canonical band table is:

```
| 90–100 | Showcase-ready | Safe for any prospect demo; passes §11 Step 5 cleanly |
| 75–89  | Demo-ready     | Safe with named caveats; LIMITATIONS section MUST show |
| 60–74  | Internal-only  | Not for external demo; surfaces to Step 5 as "conditional" |
| 0–59   | Not demo-ready | Blocks §11 Step 5 until Self-Renewal closes crit + high |
```

v1's proposal to rewrite these bands (95-bar = GTM-ready; 90–94 = Near-GTM conditional; etc.) was opposed at v1 ratification (`8e185a6` engagement-gated) AND at quorum-fix rerun (`cc14a8f` — 5/8 DEFER, 4/8 SPLIT). The Panel's specific objections (clearance-records-break per Slot 1, no migration path per Slot 3, premature commitment per Slot 8) all point to ONE structural issue: **canonical §7.6 bands cannot be promoted ahead of demonstrated production evidence**.

v2 resolution: ≥95 GTM-bar becomes a **CEO directive captured in operator-config**, NOT a canonical §7.6 band table change.

### §7.6 score bands — NO CHANGE in v2

§7.6 score-band table per ENTRY 006 stays canonical verbatim.

### NEW canonical text: §7.6 operator-config knob (CA-13-A v2)

Append to §7.6 after the existing band table:

```markdown
**Operator-configurable GTM bar (CA-13-A v2 canonical):** every product
MAY declare a tighter §11 Clearance Step 5 score prerequisite via
`product_registry.gtm_ready_bar_override` (integer; default `75` =
canonical Demo-ready band threshold per ENTRY 006; bounds `[75, 100]`).

When `gtm_ready_bar_override > 75`, §11 Step 5 score prerequisite becomes
"score ≥ `gtm_ready_bar_override`" for that product. All other Step 5
prerequisites unchanged (zero `critical`; Self-Renewal terminal on `high`;
LIMITATIONS published per CA-14-A canonical; Phase B pass per CA-14-A
canonical + Agent #21 charter per ENTRY 015).

Out-of-bounds operator override (e.g. 50 or 105) is silently clamped to
`[75, 100]`; admin notified via `agent.product_registry.gtm_bar_clamped.v1`
(added to Cluster D Deferred set with the engineering dispatch that
implements the knob).

**CEO directive 2026-05-18 status:** ≥95 sustained end-to-end remains a
CEO directive captured at the ENTRY-log + operator-config layer, NOT
canonical §7.6 band-table change. Once ≥1 VEU product demonstrates ≥95
sustained across the repeat-until-GTM loop, a successor CA-N may promote
≥95 as a canonical band threshold; until then, ≥75 stays the canonical
default + ≥95 is operator-opt-in via the override.

**Conformance-test acceptance criteria:**

- **CA13A-v2-CT-1.** Operator sets `gtm_ready_bar_override: 95` for
  product X; assert §11 Step 5 score prerequisite for X becomes ≥95;
  other products unaffected.
- **CA13A-v2-CT-2.** Operator sets `gtm_ready_bar_override: 50`; assert
  override clamped to 75; `agent.product_registry.gtm_bar_clamped.v1`
  emitted; admin notified.
- **CA13A-v2-CT-3.** Default behavior with no operator override: §11 Step
  5 score prerequisite is ≥75 (canonical Demo-ready band).
```

### NEW canonical text: §11 Step 5 score-prerequisite clarification

Modify §11 Step 5 row to reference both the canonical default + the override:

```markdown
| 5 | Demo Readiness | "Demo" | (existing per ENTRY 006 + ENTRY 015 cleared-8): GTM Readiness Report exists; **score ≥ `product_registry.gtm_ready_bar_override` (default 75 per ENTRY 006; bounds [75, 100] per CA-13-A v2)**; zero `critical` findings open; Self-Renewal cycle terminal on `high`; LIMITATIONS published per CA-14-A canonical (ENTRY 015); Phase B pass per CA-14-A canonical (ENTRY 015) + Agent #21 charter. |
```

---

## CA-13-A v2 — Near-GTM 90–94 conditional band ELIMINATED

### Rationale

Slot 1 cited: "§7.6 Near-GTM band (90-94) allows admin-only signoff to pass Step 5 as 'conditional clearance'. This creates a loophole where products missing up to 10% of their market definition can still go to market, undermining the CEO directive's intent that products must serve their FULL §1.1 market definition." 4/8 Panel slots voted CA13AQ2-HARD (eliminate the conditional path).

v2 resolution: eliminate the 90–94 Near-GTM conditional band entirely from CA-13-A. §11 Step 5 is HARD: score ≥ canonical threshold OR fail; no conditional-clearance admin-override path exists.

### NO new canonical text required

The v1 CA-13-A draft proposed a Near-GTM conditional band; v2 eliminates that proposal. There is nothing to write into §7.6 or §11 — the bands stay at ENTRY 006 verbatim (per the §7.6 unchanged-bands section above), and no conditional path is introduced.

### Conformance-test acceptance criterion

```markdown
**CA13A-v2-CT-4 (Near-GTM eliminated).** No code path supports a "conditional clearance" admin-override for §11 Step 5 score prerequisite. Implementation grep across `src/lib/governance/`, `src/components/clearance/`, `api/clearance/`: zero references to `conditional_clearance`, `near_gtm`, or `admin_override` of the score threshold. Verified at engineering dispatch + CI gate.
```

### Fallback clause (only applies if v2 re-Panel insists on retaining a conditional path)

```markdown
**CA-13-A v2 fallback clause (applies ONLY if v2 re-Panel ratifies a conditional path despite v2's HARD-as-primary intent):** any retained conditional path MUST require ALL `high` findings *Resolved* (NOT "terminally decided"). "Resolved" means: finding is closed via Self-Renewal fix that landed AND post-fix §7.6 score reflects the close. "Terminally decided" (the v1 CA-13-A language) is INSUFFICIENT — Documented findings + Human-gated findings DO NOT satisfy this clause. This fallback exists to ensure that if Panel re-introduces a conditional path against v2's intent, the conditional bar is at least as strict as the canonical hard bar in `high`-finding terms.
```

---

## CA-13-A v2 — §19.0 reconciliation paragraph UNCHANGED

The v1 CA-13-A §19.0 reconciliation paragraph (distinguishing Self-Audit 95/95 from §7.6 ≥95 bars) stays verbatim from v1. CA-13-A-Q3 was 6/8 at rerun (plurality-RATIFY below quorum), so v2 retains the v1 text and re-Panels.

```markdown
### §19.0 — Two distinct "95" bars (CA-13-A clarification, re-Panel in v2)

After CA-13-A, the canonical SSOT carries TWO mechanisms that both use
the number "95". They are NOT the same mechanism; neither replaces the
other; both must pass independently per Locked Rule 3.

| Mechanism | Source | Owner | Scope | What "95" means |
|---|---|---|---|---|
| **Self-Audit 95/95 threshold** | §19 (canonical since Sprint 5) | `src/lib/governance/ScoreEvaluator.js` | Step 4 Quality Audit; 5 dimensions | Each dimension scored ≥95/100 AND ≥95% confidence |
| **GTM Readiness bar** | §7.6 + CA-13-A v2 | Agent #21 ACE Conductor | Aggressive Crawl Engine post-crawl report | Per-`(productId, environment)` score; ≥`product_registry.gtm_ready_bar_override` (default 75 per ENTRY 006; ≥95 is operator-opt-in) |

**Why both exist:** Self-Audit 95/95 measures whether the BUILD passes
quality gates. GTM Readiness measures whether the RUNNING PRODUCT serves
its full §1.1 market definition. A product can pass Self-Audit 95/95
(clean build) but fail GTM Readiness (deployed product still has dead
modals or unreachable AI agents). Both gates exist for distinct purposes;
failing either blocks §11 Clearance Step 5.

**Override semantics:** Self-Audit 95/95 override requires admin role +
audit-log entry per §19 existing rule. GTM Readiness threshold override
is operator-config per `product_registry.gtm_ready_bar_override` per
CA-13-A v2 with bounds `[75, 100]`; admin role required to set, admin-
configurable per-product; no admin "skip" / "override" of the threshold
itself once configured.
```

---

## CA-13-B v2 — §15 intro + §15.1 rows 21+26 UNCHANGED + sibling key naming SWITCHED

### CA-13-B-Q1 (§15 wording reconciliation) — UNCHANGED at v2

v1 §15-intro + §15.1 rows 21/26 Option-(a) sibling-pattern language stays verbatim. CA-13-B-Q1 was 5/8 at rerun (plurality-RATIFY below quorum), so v2 retains v1 text and re-Panels.

**§15 intro (unchanged from v1):**

```markdown
All 26 agents (was 25 prior to CA-9-B / ENTRY 005) are proprietary VEU IP.
All ship dormant at `recommend_only` per Sprint 5 governance pattern.
OrchestratorHub wire-in **per-agent** as each ships; the original Rev-1
"wire-in only after all 25 built" was overly restrictive and Panel-
flagged. Agent #26 was added per CA-9-B. **CA-9-Q4 was re-disposed to
Option (a) per ENTRY 009 (2026-05-17, LOCKED): the `auto_write_internal`
capability surface for split-charter agents (#21 + #26) is provided
through the EXECUTOR_REGISTRY sibling pattern per CA-7 §15.5 — NOT
through dual-authority on the primary `BaseAgent` row.** Primary agent
charters retain `recommend_only`; elevated-authority counterparts live
in the sibling registry. `BaseAgent.guard()` remains strict per-
invocation `authorityNeeded` set membership. The earlier CA-9-Q4=(b)
phrasing (dual-authority on primary) is SUPERSEDED by CA-13-B citing
ENTRY 009.
```

**§15.1 row 21 (unchanged from v1 except for sibling charter key — see CA-13-B-Q2 below):**

```markdown
| 21 | Ops Runner Alpha — Aggressive Crawl Conductor ... | step-owner | (cross-step within step 1 + step 8) | embedded | DORMANT (charter ratified; engineering wire-in pending). **Primary authority: `[recommend_only]`** (per ENTRY 009 CA-9-Q4 Option (a) LOCKED). Elevated-authority surface (`auto_write_internal`, `requires_human_gate`) provided via EXECUTOR_REGISTRY sibling per CA-7 §15.5 — sibling charter `crawl-write-executor` (agentId=21, mode=`cross-step`; capability-keyed naming per CA-13-B v2). Sibling executor wired via `api/agent/21/execute.js`. Plus per ENTRY 015 CA-14-A-Q3 cleared-8: Agent #21 owns **Phase B Adversarial Surface Testing** per the canonical §15.1 row 21 charter extension. |
```

**§15.1 row 26 (unchanged from v1 except for sibling charter key):**

```markdown
| 26 | Orchestra Research Agent ... | always-on | — | embedded | DORMANT — owns the auto-admission pipeline per §8.1. **Primary authority: `[recommend_only]`** (per ENTRY 009 CA-9-Q4 Option (a) LOCKED). Elevated-authority surface (`auto_write_internal`, `requires_human_gate`) provided via EXECUTOR_REGISTRY sibling per CA-7 §15.5 — sibling charter `orchestra-admission-executor` (agentId=26, mode=`always-on`-sibling; capability-keyed naming per CA-13-B v2). Sibling executor wired via the admission-write path. |
```

### CA-13-B-Q2 v2 — sibling charter naming SWITCHED to capability-keyed

The v1 draft used `aggressive-crawl-conductor-executor` + `orchestra-research-agent-executor` (agent-short-name-keyed). The rerun verdict (`CA13BQ2-CAPABILITY` 4/8) signaled Panel preference for capability-keyed names. v2 switches:

| Sibling | v1 key (dropped) | v2 key (canonical) | Rationale |
|---|---|---|---|
| Agent #21 sibling | `aggressive-crawl-conductor-executor` | **`crawl-write-executor`** | Capability-keyed: what the sibling DOES (writes to ProductSSOT `architecture_snapshot` + `governance_record` during crawl), not which primary it siblings. |
| Agent #26 sibling | `orchestra-research-agent-executor` | **`orchestra-admission-executor`** | Capability-keyed: what the sibling DOES (writes admission decisions to the Orchestra-membership registry + `26.orchestra.admitted.v1`), not which primary it siblings. |

**EXECUTOR_REGISTRY entries (target population at engineering dispatch time, NOT at this CA's ratification commit; mirrors CA-7 §15.5 existing self-renewal-executor row format):**

```typescript
const EXECUTORS: ExecutorRecord[] = [
  // ... existing self-renewal-executor (per CA-7 §15.5) ...

  {
    key: 'crawl-write-executor',     // capability-keyed per CA-13-B v2
    agentId: 21,
    name: 'Crawl-Write Executor',
    mode: 'cross-step',
    authority: ['auto_write_internal', 'requires_human_gate'],
    requiredCredentials: ['BROWSERLESS_API_KEY', 'ANTHROPIC_API_KEY'],
    consumes: [/* ACE crawl outputs */],
    produces: [/* ProductSSOT architecture_snapshot + governance_record kind:'gtm_readiness_score' writes */],
    escalationPolicy: 'critical/high finding → admin gate; cost-budget exceeded → escalate; 3 consecutive failures → 24h disable',
  },

  {
    key: 'orchestra-admission-executor',  // capability-keyed per CA-13-B v2
    agentId: 26,
    name: 'Orchestra Admission Executor',
    mode: 'always-on',
    authority: ['auto_write_internal', 'requires_human_gate'],
    requiredCredentials: ['ANTHROPIC_API_KEY', 'BROWSERLESS_API_KEY'],
    consumes: ['community.signal.v1', '11.platform.discovery.v1', '15.benchmark.head_to_head.v1', '17.orchestra.deprecation_proposal.v1'],
    produces: ['26.orchestra.admitted.v1', '26.orchestra.candidate_rejected.v1', '26.orchestra.candidate_panel_gate.v1', ...],
    escalationPolicy: '4-condition gate failure → Panel + CEO per Locked Rule 13',
  },
];
```

**Conformance-test acceptance criterion:**

```markdown
**CA13B-v2-CT-1 (capability-keyed naming).** `_registry.ts` `EXECUTOR_REGISTRY` array contains exactly two entries with the capability-keyed keys above. Implementation grep: zero references to `aggressive-crawl-conductor-executor` OR `orchestra-research-agent-executor` (v1 names) anywhere in `src/` or `api/`. Existing `self-renewal-executor` key per CA-7 §15.5 is unchanged.
```

---

## v2 Panel Questions (re-Panel — 5 questions; same numbering as v1 for traceability)

### CA-13-A v2 Q1 — GTM bar deferral + operator-config knob

Does Panel ratify the v2 approach (≥95 as a CEO directive captured at operator-config layer; canonical §7.6 bands UNCHANGED from ENTRY 006)?

- (a) Ratify v2 as drafted: §7.6 bands UNCHANGED; `product_registry.gtm_ready_bar_override` knob added, default 75, bounds [75, 100]; ≥95 re-promotes via successor CA after ≥1 VEU product sustains ≥95 end-to-end.
- (b) Ratify with tighter knob — operator override only available to admin role (not operator role); admin-only edits to `gtm_ready_bar_override`.
- (c) Ratify with stricter bound — knob bounds `[80, 100]` (not `[75, 100]`); the floor moves up alongside operator opt-in.
- (d) Reject v2 — canonical §7.6 bands SHOULD update to ≥95 immediately per the CEO directive, regardless of single-product-evidence prerequisite.
- (e) INSUFFICIENT_INFORMATION.

### CA-13-A v2 Q2 — Near-GTM elimination

Does Panel ratify the v2 elimination of the 90–94 Near-GTM conditional-clearance band?

- (a) Ratify v2 as drafted: 90–94 Near-GTM band ELIMINATED; §11 Step 5 is HARD (score ≥ canonical threshold or fail).
- (b) Ratify with reservation: HARD-as-primary; the v2 fallback clause (any conditional path requires ALL `high` findings *Resolved*) becomes mandatory wording if Panel ever re-introduces a conditional path.
- (c) Re-introduce a conditional path — restore 90–94 Near-GTM band but only for products with `gtm_ready_bar_override ≥ 90` (op-in operators have a conditional path; default-config operators do not).
- (d) Reject v2 elimination — v1 Near-GTM conditional path is correct; restore as-was in v1 with admin-only signoff.
- (e) INSUFFICIENT_INFORMATION.

### CA-13-A v2 Q3 — §19.0 reconciliation paragraph (carry-forward from v1, no change)

Does Panel ratify the §19.0 reconciliation paragraph distinguishing Self-Audit 95/95 from GTM Readiness bar?

- (a) Ratify v2 §19.0 as drafted (same text as v1; clarifies that the two "95" bars are distinct mechanisms; both must pass independently per Locked Rule 3).
- (b) Ratify with stronger language — append "These are NEVER conflated in any operator-facing surface" mandatory invariant.
- (c) Reject §19.0 paragraph — the §10 governance-mechanisms table already lists the distinction; an additional §19.0 paragraph is redundant.
- (d) Move §19.0 to §10 (Self-Governance Layer) instead of §19 (Governance / Panel / SSOT Access).
- (e) INSUFFICIENT_INFORMATION.

### CA-13-B v2 Q1 — CA-9-Q4 Option-(a) wording (carry-forward from v1)

Does Panel ratify the v2 §15-intro + §15.1 rows 21/26 wording that strikes the legacy (b) dual-authority phrasing in favor of Option-(a) sibling-pattern language per ENTRY 009 LOCKED?

- (a) Ratify v2 as drafted (same text as v1; (b) wording struck; (a) sibling-pattern canonical).
- (b) Ratify with revised phrasing — keep the strike but shorten ENTRY 009 citation (engineering dispatch picks the exact rendering).
- (c) Reject v2 wording reconciliation — leave §15 / §15.1 at v1 (b) phrasing; ENTRY 009 LOCKED is a code-level decision that doesn't propagate to §15 wording.
- (d) Defer to joint disposition with broader §15.5 sibling row-table populate (engineering dispatch).
- (e) INSUFFICIENT_INFORMATION.

### CA-13-B v2 Q2 — Capability-keyed sibling naming

Does Panel ratify the v2 switch to capability-keyed sibling charter naming (`crawl-write-executor` for Agent #21 sibling; `orchestra-admission-executor` for Agent #26 sibling)?

- (a) Ratify v2 capability-keyed naming as drafted.
- (b) Ratify capability-keyed BUT with renamed keys — `crawl-write-executor` is fine; `orchestra-admission-executor` should be `orchestra-membership-executor` (broader semantics).
- (c) Reject v2 — restore v1 agent-short-name-keyed naming (`aggressive-crawl-conductor-executor` + `orchestra-research-agent-executor`).
- (d) Adopt agentId-keyed naming instead (`agent-21-executor`, `agent-26-executor`); maximally consistent with `_registry.ts` agentId column.
- (e) INSUFFICIENT_INFORMATION.

---

## Acceptance criteria for CA-13 v2 ratification

- W6 re-Panel ratification ≥7/engaged drafted-(a) on each of the 5 questions.
- Engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6.
- CEO disposition per Locked Rule 13.
- If all 5 ratify (a)-clean, CA-13 v2 promotes as a single CA cycle; §18.4 ratified-amendments table appends the v2 entry.
- If Panel splits per question, ratified halves promote independently per §18.4 entry rules + ENTRY 015 cleared-8 partial-promotion precedent.
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA13-v2-promotion-<date>.md` per §18.3.

---

*End of CA-13 v2 draft. Pending W6 re-Panel + CEO disposition per CA-n cycle (Rev-2.1 §18). Doc-only; canonical files NOT amended in this commit per CA-n cycle discipline. ENTRY 015 cleared-8 promotion (CA-14-A-Q2 / Q3 / Q4 + CA-14-B-Q1 / Q2 + CA-14-D-Q1 + CA-16-B-Q3 + CA-16-C-Q4) lands separately per `CLEARED8_PROMOTION_PACKAGE_DRAFT.md`.*
