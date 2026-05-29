# SSOT Amendment Draft — CA-13 v3 (95-bar spine: option-(i) admin-only + expiring override + migration)

**Status:** DRAFT v3 — applies CEO Locked-Rule-13 decision on the 95-bar spine. Source-of-truth: `docs/panel-consultations/ca-13-v2-repanel-2026-05-19.md` (commit `db457a5`; 8/10 engaged; 34 distinct objections; 0/5 cleared at v2 re-Panel — all five questions split/plurality). Pending W6 v3 re-Panel.
**Author:** W3, 2026-05-19.
**Bundle target:** ≤32K chars (proven engagement recipe).

**Lineage:** CA-13 v1 (`81cf144` — 75→95 + CA-9-Q4 §15 wording) → joint Panel `8e185a6` engagement-gated → W6 quorum-fix rerun `cc14a8f` (0/5 cleared) → CA-13 v2 (`8b38156` — GTM bar DEFERRED via operator-config knob + Near-GTM ELIMINATED + capability-keyed sibling naming) → W6 v2 re-Panel (`db457a5` panel artifact; 0/5 cleared again — A-Q1 4/8 REJECT, A-Q2 3/3 SPLIT RATIFY/RESERVE, A-Q3 3/3 SPLIT RATIFY/REJECT, B-Q1 4/8 plurality-RATIFY below quorum, B-Q2 4/8 plurality-RATIFY below quorum) → **CEO Locked-Rule-13 decision (this dispatch):** 95-bar fork = option (i) admin-only + expiring override + ClearanceRecord migration path as implementation prerequisite. CA-13 v3 spine resolves coherently around (i).

**CEO decision citation (Locked Rule 13, this dispatch verbatim):** *"95-bar fork = OPTION (i) admin-only + expiring override, with ClearanceRecord migration path folded in as implementation prerequisite. CA-13 spine decided coherently around (i)."*

---

## §0 — v3 changelog (per-question what-changed-vs-v2 + CEO-decision citation)

| v2 Q | v2 re-Panel verdict | v3 change | Driving Panel slot(s) / CEO citation |
|---|---|---|---|
| **A-Q1** | `PLURALITY_REJECT` 4/8 (REJECT was top — but v2's "operator-configurable knob" framing was rejected, NOT the 95-bar itself) | **REWRITE per CEO Locked Rule 13 (option-i spine):** canonical §7.6 GTM bar = **≥95** (the directive becomes the standard). The sole sanctioned sub-95 exception = **ADMIN-ROLE-ONLY override**, **TIME-BOUNDED + EXPIRING**. Expiry: at the next pipeline run for the affected product OR a bounded N-day default (default 14 days; admin-reconfigurable within hard bounds [1, 30]), whichever comes first. Every grant + use of the override emits `governance_record_entry kind:'gtm_bar_admin_override.v1'` (operator-config knob is REPLACED by this expiring-override mechanism). **IMPLEMENTATION PREREQUISITE — ClearanceRecord migration path**: products with existing ClearanceRecord entities created under the prior 75-bar rule are flagged for re-evaluation (status:`migration_pending`); each must either (a) re-score under the new ≥95 bar OR (b) receive a one-time admin-issued expiring override OR (c) be re-categorized as "legacy / pre-CA-13 v3" with an admin annotation. **The migration path must land BEFORE the new ≥95 bar takes effect** — engineering dispatch supplies the migration script. | CEO Locked Rule 13 (dispatch); Slot 1 #1 (permanent loophole — eliminated by expiry + admin-only); Slot 6 #20 (admin-only safeguard); Slot 10 #32 (ClearanceRecord migration path explicit). Verdicts 4 REJECT + 1 ADMIN + 1 FLOOR80 + 2 RATIFY = no quorum on any option; CEO breaks the impasse with option-(i) per Locked Rule 13. |
| **A-Q2** | `SPLIT` 3/3 RATIFY vs RESERVE | **ELIMINATE the Near-GTM 90–94 conditional pass ENTIRELY** — the admin-only expiring override is the SINGLE controlled exception; a second conditional path would be a competing loophole. **No fallback clause retained.** v2's "fallback if Panel ever re-introduces conditional path" is REMOVED — the admin-only override IS the controlled exception, and the canonical text states this is exclusive. | Slot 3 + Slot 4 + Slot 8 (RATIFY 3/3); Slot 10 #33 (fallback weakens hard threshold). Coherence with A-Q1 option-(i): one controlled exception only. |
| **A-Q3** | `SPLIT` 3/3 RATIFY vs REJECT | **STRONGER:** append mandatory invariant **"These are NEVER conflated in any operator-facing surface"** to the §19.0 reconciliation paragraph. This is the option-(b) STRONGER variant from v2 (Slot 1 + Slot 2 + Slot 9 + Slot 7 votes; tangential Slot 9 written but UNMATCHED). The REJECT objection (Slot 5, Slot 6, Slot 10) cited redundancy with §10 — addressed by promoting the language to a binding invariant rather than a descriptive paragraph. | Slot 1 + Slot 2 + Slot 7 + Slot 9 STRONGER votes; Slot 6 #19 (redundancy concern — addressed by invariant framing); Slot 10 #19. |
| **B-Q1** | `PLURALITY_CA13BV2Q1-RATIFY` 4/8 (below quorum) | **CARRY drafted Option-(a) wording UNCHANGED** + **ADD an explicit cross-reference to the EXECUTOR_REGISTRY + BaseAgent.guard() enforcement spec** at `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §3.2 + `src/lib/agents/_registry.ts` (the EXECUTOR_REGISTRY array per CA-7 §15.5). Addresses Slot 1 DEFER objection ("ENTRY 009 mechanics not fully specified") + Slot 10 missing-details without bundling B-Q1 with §15.5 row-table populate (which stays an engineering dispatch). | Slot 1 (DEFER); Slot 10 #34 (BaseAgent.guard() + api/agent/21/execute.js wiring details). Cross-reference suffices to address the "isolated ratification premature" concern. |
| **B-Q2** | `PLURALITY_CA13BV2Q2-RATIFY` 4/8 (below quorum) | **CARRY capability-keyed naming as-drafted** (`crawl-write-executor`, `orchestra-admission-executor`) — plurality winner at v2. **NOTE Slot 2's `orchestra-membership-executor` rename** as a minor re-Panel alternative on the v3 option-set (option (b) on the v3 question). Slot 6 #20 + Slot 7 (TANGENTIAL) also flagged `membership` over `admission` for similar reason. | Slot 2 #20 (`orchestra-membership-executor` over `orchestra-admission-executor` because "admission" is narrower than the ongoing membership-management duties Agent #26 owns per §8.1). |

**Net v3 effect:**

| Surface | v2 design | v3 design (option-(i) spine) |
|---|---|---|
| Canonical §7.6 GTM bar | Bands UNCHANGED from ENTRY 006 (75–89 Demo-ready threshold); ≥95 op-in via operator-config knob | **§7.6 GTM bar = ≥95** (canonical). The CEO directive becomes the standard. Lower-than-95 deployment requires an admin-only expiring override. |
| Sub-95 exception path | `product_registry.gtm_ready_bar_override` knob (operator OR admin role; permanent until changed) | **Admin-only `gtm_bar_admin_override` envelope** — expiring (next pipeline run OR ≤14 days, hard bounds [1, 30]). Persistent operator-config knob ELIMINATED. |
| Override audit | Out-of-bounds clamp emits envelope only | Every grant + use emits `governance_record_entry kind:'gtm_bar_admin_override.v1'` (audit trail per Slot 9 #29). |
| Migration path | Unspecified | **CLEAR migration path** for ClearanceRecord entities pre-CA-13-v3 (Slot 1 #4 + Slot 4 #12 + Slot 10 #32). Engineering dispatch ships the migration script before the new bar takes effect. |
| Near-GTM 90–94 conditional band | Eliminated; fallback clause if Panel re-introduces | **Eliminated, no fallback clause.** Admin-only expiring override is the single controlled exception. |
| §19.0 reconciliation | Descriptive paragraph distinguishing Self-Audit 95/95 from GTM Readiness ≥95 | **§19.0 reconciliation + mandatory invariant: "These are NEVER conflated in any operator-facing surface."** |
| §15-intro + §15.1 rows 21/26 wording | Strikes legacy (b) dual-authority; Option-(a) sibling per ENTRY 009 LOCKED | **Same wording + explicit cross-reference to EXECUTOR_REGISTRY + BaseAgent.guard() enforcement spec.** |
| Sibling charter naming | `crawl-write-executor` + `orchestra-admission-executor` | **Same** (carry as v2 drafted; `orchestra-membership-executor` rename offered as Panel-electable alternative). |

---

## §1 — CA-13-A v3 — Spine option-(i): canonical ≥95 + admin-only expiring override + migration

### CA-13-A v3 Q1 — Canonical §7.6 GTM bar = ≥95 + admin-only expiring override + migration prerequisite (REWRITE)

**Rationale (CEO Locked Rule 13, this dispatch):** the v2 operator-config-knob framing was rejected at 4/8 PLURALITY_REJECT. The Panel's structural objection (Slot 1 #1 verbatim): "operator override creates a permanent escape hatch where operators can ship at 75 indefinitely, making the '≥95 after first product' promise unenforceable." CEO option-(i) resolves this by making ≥95 the canonical standard and confining sub-95 deployment to an admin-only expiring exception with full audit trail.

**Canonical text — §7.6 GTM Readiness Report (REVISED):**

```markdown
### §7.6 GTM Readiness Report — canonical bar (CA-13-A v3 per CEO Locked Rule 13 option-(i))

The canonical §7.6 GTM Readiness bar is **≥95** for all products. A
product reaches §11 Clearance Step 5 (Demo Readiness) ONLY when its §7.6
score is ≥95 AND it satisfies the existing four prerequisites per ENTRY
006 + ENTRY 015 (zero `critical`; Self-Renewal terminal on `high`;
LIMITATIONS published per CA-14-A canonical; Phase B pass per CA-14-A
canonical + Agent #21 charter per ENTRY 015 cleared-8).

Sub-95 deployment is permitted ONLY via the **admin-only expiring
override** mechanism below.

### §7.6.1 Admin-only expiring GTM-bar override (CA-13-A v3)

When an admin role determines that a product MUST proceed to §11 Step 6
with score in `[75, 94]`, the admin issues a one-time expiring override.

**Override envelope (canonical):**

```yaml
governance_record_entry:
  kind: gtm_bar_admin_override.v1
  granted_at: ISO8601
  granted_by:
    role: admin                              # admin role REQUIRED; operator role refused
    user_id: string
  product_id: string
  environment: dev | prd
  override_floor: integer                    # 75 ≤ override_floor ≤ 94 (clamped; out-of-bounds REJECTED, NOT clamped)
  expires_at: ISO8601                        # see expiry rules below
  rationale: string                          # ≥ 80 chars; cannot match canonical stop-words set
  affected_clearance_record_id: string       # links to the ClearanceRecord entity
```

**Expiry rules:**

- An override expires at the **earliest** of:
  1. The next §11 Six-Step pipeline run for the affected `(product_id, environment)` pair, OR
  2. The bounded N-day default — **14 days** from `granted_at` (hard bounds `[1, 30]`; admin may set
     a shorter window at grant time, but NEVER longer than 30 days).
- A grant that specifies `expires_at` > `granted_at + 30 days` is REJECTED at write-time with
  `gtm_bar_admin_override_invalid_expiry.v1`. No silent clamping in the governance path (Slot 8 #26
  verbatim — "silent coercion is dangerous").
- Out-of-bounds `override_floor` (e.g. `50` or `100`) is REJECTED, NOT clamped — `gtm_bar_admin_override_invalid_floor.v1`.

**Use rules:**

- Each USE of an override (i.e. a §11 Step 5 evaluation that consults the override) emits a separate
  audit envelope `governance_record_entry kind:'gtm_bar_admin_override_used.v1'` referencing the
  granting envelope's `governance_record_entry.id`.
- An override that has expired CANNOT be used — Step 5 evaluation falls back to the canonical ≥95
  bar; admin must re-issue if continued sub-95 deployment is required (with fresh rationale +
  fresh expiry).
- Operator role attempting to use an override → refused with `gtm_bar_admin_override_use_role_violation.v1`.

**Conformance-test acceptance criteria:**

- **CA13A-v3-CT-1.** Operator role attempting to write `gtm_bar_admin_override.v1` → refused with
  `construction_insufficient_role.v1`-equivalent envelope; only `admin` writes accepted.
- **CA13A-v3-CT-2.** Admin grants override with `expires_at = granted_at + 45 days` → REJECTED;
  override NOT written; admin notified.
- **CA13A-v3-CT-3.** Admin grants override with `override_floor: 50` → REJECTED (NOT clamped);
  admin notified.
- **CA13A-v3-CT-4.** Override expires 14 days after grant; Step 5 evaluation at day 15 falls back to
  canonical ≥95 bar; PRIOR uses of the override (between days 0–14) remain in audit log unchanged.
- **CA13A-v3-CT-5.** Each USE of an override emits a distinct `gtm_bar_admin_override_used.v1`
  envelope; the granting envelope's `id` is referenced. Multiple uses of the same override produce
  multiple use-envelopes (audit trail granular).

### §7.6.2 IMPLEMENTATION PREREQUISITE — ClearanceRecord migration path

The ≥95 canonical bar takes effect ONLY AFTER the ClearanceRecord
migration completes. Migration steps (engineering dispatch):

1. **Inventory pass.** Engineering scans all existing `ClearanceRecord` entities created BEFORE
   CA-13-v3-ratification-commit; tags each with `status: 'migration_pending'`.
2. **Per-product re-evaluation.** For each pending entity, one of three outcomes is recorded:
   - **(a) Re-score under new bar:** product re-crawls + re-scores; if new score ≥95, the
     ClearanceRecord is updated and status → `migrated_passing`; if new score <95, status →
     `migrated_failing` and the ClearanceRecord is FROZEN (no Step 5/6 progression until score ≥95
     OR admin issues an override).
   - **(b) One-time admin override:** admin issues a `gtm_bar_admin_override.v1` envelope for the
     migration window (expiry ≤30 days); status → `migrated_with_override`.
   - **(c) Legacy / pre-CA-13-v3 re-categorization:** admin annotates the ClearanceRecord as
     `legacy_pre_ca13v3`; the entity remains in the audit trail but does NOT count toward any new
     §7.6 metrics; status → `legacy_archived`.
3. **Cutover.** Once 100% of pending entities resolve to one of (a)/(b)/(c), the new ≥95 canonical
   bar activates — `governance_record_entry kind:'ca13v3_cutover_complete.v1'` is emitted; from
   that point forward, ALL §11 Step 5 evaluations use the new bar.

**Cutover gate:** the ≥95 bar does NOT take effect until the cutover envelope is recorded. This is
the implementation prerequisite per CEO Locked Rule 13.

**Conformance-test acceptance criteria:**

- **CA13A-v3-CT-6.** Migration script enumerates 5+ existing ClearanceRecord entities; each is
  tagged `migration_pending`; per-product (a)/(b)/(c) outcomes are recorded; cutover envelope
  emitted only after all are resolved.
- **CA13A-v3-CT-7.** Step 5 evaluation BEFORE the cutover envelope uses the OLD bar (75); AFTER
  cutover uses ≥95.
```

### CA-13-A v3 Q2 — Near-GTM conditional band ELIMINATED entirely (no fallback)

**Rationale:** the admin-only expiring override (Q1 above) is the single controlled sub-95 exception. A second conditional path (90–94 Near-GTM band) would be a competing loophole. v3 keeps Near-GTM elimination as drafted in v2 BUT REMOVES the v2 fallback clause ("if Panel ever re-introduces a conditional path, ALL `high` findings must be Resolved"). Slot 10 #33 verbatim: "fallback clause weakens hard threshold."

**Canonical text — Near-GTM elimination (no fallback):**

```markdown
### §7.6.3 Near-GTM 90–94 conditional band — ELIMINATED (CA-13-A v3)

The 90–94 Near-GTM conditional-clearance band proposed in CA-13 v1 is
ELIMINATED entirely. §11 Step 5 is HARD: score ≥95 OR fail (with the sole
exception of an unexpired admin-only override per §7.6.1).

**No fallback clause:** the v2 conditional reservation ("if Panel ever
re-introduces a conditional path, ALL `high` findings must be Resolved")
is REMOVED. The admin-only expiring override IS the controlled exception;
no second conditional path exists.

**Conformance-test acceptance criterion:**

- **CA13A-v3-CT-8.** No code path supports a "Near-GTM conditional clearance" or "Near-GTM
  signoff" for §11 Step 5. Implementation grep across `src/lib/governance/`, `src/components/clearance/`,
  `api/clearance/`: zero references to `near_gtm`, `conditional_clearance`, or any equivalent
  bypass keyword for the score threshold. The ONLY sub-95 path is via `gtm_bar_admin_override.v1`.
```

### CA-13-A v3 Q3 — §19.0 reconciliation STRONGER (mandatory anti-conflation invariant)

**Rationale:** v2 §19.0 reconciliation paragraph drew 3/8 RATIFY vs 3/8 REJECT (redundancy concern). v3 promotes the language to a binding invariant — addresses the redundancy concern by giving the paragraph teeth (it now imposes an obligation, not just describes a distinction).

**Canonical text — §19.0 reconciliation + STRONGER invariant:**

```markdown
### §19.0 — Two distinct "95" bars + mandatory anti-conflation invariant (CA-13-A v3)

The canonical SSOT carries TWO mechanisms that both use the number "95".
They are NOT the same mechanism; neither replaces the other; both must
pass independently per Locked Rule 3.

| Mechanism | Source | Owner | Scope | What "95" means |
|---|---|---|---|---|
| **Self-Audit 95/95 threshold** | §19 (canonical since Sprint 5) | `src/lib/governance/ScoreEvaluator.js` | Step 4 Quality Audit; 5 dimensions | Each dimension scored ≥95/100 AND ≥95% confidence |
| **GTM Readiness bar** | §7.6 + CA-13-A v3 | Agent #21 ACE Conductor | Aggressive Crawl Engine post-crawl report | Per-`(productId, environment)` score; canonical bar = ≥95 (CEO Locked Rule 13 option-(i) per CA-13-A v3); sub-95 deployment requires admin-only expiring override per §7.6.1 |

**Mandatory anti-conflation invariant (CA-13-A v3):**

> *These TWO "95" mechanisms are NEVER conflated in any operator-facing surface.*

Operator-facing surfaces include but are not limited to: `/clearance`
wizard, `/architecture` dashboard, GTM Readiness Reports, Self-Audit
report cards, audit-log UI, CSV/JSON export views, admin Slack/email
notifications, and any third-party integration surface. UI implementations
that display both bars MUST visually + textually distinguish them; UI
implementations that display only one MUST label the bar explicitly
(e.g. "Self-Audit 95/95 (Step 4 Quality Audit)" or "GTM Readiness bar
≥95 (Step 5 Demo Readiness)" — never a bare "95" without disambiguating
qualifier).

**Override semantics (preserved from v2):** Self-Audit 95/95 override
requires admin role + audit-log entry per §19 existing rule. GTM
Readiness override is admin-only via the §7.6.1 expiring-override
mechanism.

**Conformance-test acceptance criteria:**

- **CA13A-v3-CT-9.** UI surface audit: every operator-facing surface that displays a "95" bar
  carries the disambiguating qualifier; bare "95" without qualifier is a defect (flagged at
  PR-review-time + automated lint per `scripts/lint-95-bar-disambiguation.mjs` — engineering
  dispatch).
- **CA13A-v3-CT-10.** Audit-log query: any UI emission that simultaneously displays both bars
  records a `governance_record_entry kind:'95_bar_dual_display.v1'` with the surface name + the
  two bar values + confirmation of disambiguation labels. Missing labels in dual-display surfaces
  trigger a critical-severity finding at next §10.1 Self-Audit pass.
```

---

## §2 — CA-13-B v3 — §15-intro + §15.1 wording + capability-keyed sibling naming

### CA-13-B v3 Q1 — §15-intro + §15.1 rows 21/26 + EXECUTOR_REGISTRY cross-reference

**Rationale:** v2 §15-intro + rows 21/26 wording drew 4/8 RATIFY (below quorum). Slot 1 DEFER objection: "ENTRY 009 mechanics not fully specified." Slot 10 missing-details: "BaseAgent.guard() + api/agent/21/execute.js wiring already referenced in §15.1." v3 adds an explicit cross-reference to the enforcement spec so the wording change is not isolated.

**Canonical text — §15 intro + cross-reference:**

```markdown
All 26 agents are proprietary VEU IP. All ship dormant at
`recommend_only` per Sprint 5 governance pattern. OrchestratorHub
wire-in **per-agent** as each ships. CA-9-Q4 was re-disposed to
Option (a) per ENTRY 009 (2026-05-17, LOCKED): the `auto_write_internal`
capability surface for split-charter agents (#21 + #26) is provided
through the EXECUTOR_REGISTRY sibling pattern per CA-7 §15.5 — NOT
through dual-authority on the primary `BaseAgent` row.

**Enforcement spec cross-reference (CA-13-B v3 — addresses Slot 1
DEFER + Slot 10 BaseAgent.guard() objection):** the
EXECUTOR_REGISTRY + `BaseAgent.guard()` enforcement details live at:

- `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §3.2 (EXECUTOR_REGISTRY shape,
  authority membership rules, `guard()` invocation contract).
- `src/lib/agents/_registry.ts` (the EXECUTOR_REGISTRY array per CA-7
  §15.5; canonical home of executor records).
- `src/lib/agents/BaseAgent.js` `guard()` method (per-invocation
  `authorityNeeded` set membership check; rejects calls that lack
  required authority).

§15.5 sibling row-table populate (the engineering dispatch that actually
adds the row entries to `_registry.ts`) is separate from this wording
ratification — CA-13-B v3 ratifies the wording + cross-reference only;
the row-table populate lands at engineering dispatch time.

**§15.1 rows 21 + 26 wording (UNCHANGED from v2):**

Row 21 keeps the CA-9-Q4 Option-(a) sibling-pattern language ("Primary
authority: `[recommend_only]`; elevated-authority surface via
EXECUTOR_REGISTRY sibling per CA-7 §15.5; sibling charter
`crawl-write-executor` per CA-13-B-Q2 v3 below") + the ENTRY 015 CA-14-A-Q3
Phase B charter extension (Agent #21 owns Phase B Adversarial Surface
Testing) — both already canonical in ENTRY 015.

Row 26 keeps the CA-9-Q4 Option-(a) sibling-pattern language ("Primary
authority: `[recommend_only]`; elevated-authority surface via
EXECUTOR_REGISTRY sibling per CA-7 §15.5; sibling charter
`orchestra-admission-executor` per CA-13-B-Q2 v3 below") — same shape as
row 21.

**Conformance-test acceptance criterion:**

- **CA13B-v3-CT-1.** Wording-presence grep — §15-intro contains the
  ENTRY 009 LOCKED citation + the three-bullet enforcement-spec cross-
  reference list. Rows 21 + 26 reference the CA-13-B-Q2 sibling charter
  keys + reference to CA-7 §15.5 EXECUTOR_REGISTRY.
```

### CA-13-B v3 Q2 — Capability-keyed sibling naming + `membership` rename noted

**Rationale:** v2 capability-keyed naming drew 4/8 RATIFY (below quorum); Slot 2 + Slot 6 + Slot 7 raised `orchestra-membership-executor` as a stronger name (membership semantics broader than admission; aligns with §8.1 lifecycle). v3 carries v2's keys as primary AND offers the `membership` rename as a Panel-electable v3 option.

**Canonical text — capability-keyed naming:**

```markdown
**Sibling charter keys (CA-13-B v3):**

| Sibling | Canonical key (v3 primary) | Rationale |
|---|---|---|
| Agent #21 sibling | `crawl-write-executor` | Capability-keyed: what the sibling DOES (writes to ProductSSOT `architecture_snapshot` + `governance_record kind:'gtm_readiness_score'` during the Aggressive Crawl Engine pass). |
| Agent #26 sibling | `orchestra-admission-executor` | Capability-keyed: what the sibling DOES (writes admission decisions to the Orchestra-membership registry + emits `26.orchestra.admitted.v1`). **Panel-electable rename:** `orchestra-membership-executor` per Slot 2 #20 + Slot 6 #20 + Slot 7 — membership semantics broader than admission, aligning with §8.1 lifecycle states (Trial → Probation → Full member → Deprecated → Archived). If Panel elects `membership` at v3 re-Panel (option (b) on the v3 Q2 below), the canonical key is `orchestra-membership-executor` instead. |

**EXECUTOR_REGISTRY entries (target population at engineering dispatch time):**

```typescript
const EXECUTORS: ExecutorRecord[] = [
  // ... existing self-renewal-executor (per CA-7 §15.5) ...

  {
    key: 'crawl-write-executor',           // capability-keyed per CA-13-B v3
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
    key: 'orchestra-admission-executor',   // capability-keyed per CA-13-B v3
                                            //   (Panel-electable rename: 'orchestra-membership-executor')
    agentId: 26,
    name: 'Orchestra Admission Executor',
    mode: 'always-on',
    authority: ['auto_write_internal', 'requires_human_gate'],
    requiredCredentials: ['ANTHROPIC_API_KEY', 'BROWSERLESS_API_KEY'],
    consumes: ['community.signal.v1', '11.platform.discovery.v1', '15.benchmark.head_to_head.v1', '17.orchestra.deprecation_proposal.v1'],
    produces: ['26.orchestra.admitted.v1', '26.orchestra.candidate_rejected.v1', '26.orchestra.candidate_panel_gate.v1', /* ... */],
    escalationPolicy: '4-condition gate failure → Panel + CEO per Locked Rule 13',
  },
];
```

**Conformance-test acceptance criterion:**

- **CA13B-v3-CT-2.** `_registry.ts` `EXECUTOR_REGISTRY` contains exactly two entries with the v3
  capability-keyed keys (per primary OR per `membership` rename if Panel elects). Implementation
  grep returns zero references to v1 agent-short-name-keyed names (`aggressive-crawl-conductor-executor`
  + `orchestra-research-agent-executor`).
```

---

## §3 — v3 Panel Questions (5 — all re-Panel; none pre-cleared)

### CA-13-A v3 Q1 — §7.6 = ≥95 + admin-only expiring override + migration

Does Panel ratify the CA-13 v3 spine (per CEO Locked Rule 13 option-(i)): canonical §7.6 GTM bar = ≥95; sub-95 only via admin-only expiring override (14-day default, [1, 30] bounds, no silent clamping); ClearanceRecord migration path is implementation prerequisite for cutover?

- (a) **Ratify v3 as drafted** (≥95 canonical + admin-only expiring override + 14-day default, [1, 30] hard bounds + migration prerequisite per §7.6.2).
- (b) Strengthen — expiry default is 7 days (not 14), with hard bounds `[1, 14]` (tighter); rationale-quality validation requires ≥120 chars (not 80).
- (c) Strengthen — override expires at the next pipeline run ONLY (no N-day default; override expires the moment the next run executes regardless of timing); covers the "approval staleness" Slot 1 #4 concern even more strictly.
- (d) Reject the spine — return to v2 operator-config knob with bounds raised to [80, 100] (Slot 2's `FLOOR80` variant) instead of the admin-only expiring override approach.
- (e) INSUFFICIENT_INFORMATION.

### CA-13-A v3 Q2 — Near-GTM band eliminated (no fallback clause)

Does Panel ratify the elimination of the 90–94 Near-GTM conditional band with NO fallback clause? The admin-only expiring override (Q1) is the single controlled sub-95 exception.

- (a) **Ratify v3 as drafted** (Near-GTM band eliminated; no fallback clause).
- (b) Strengthen by codifying coherence — append a canonical statement: "Any future Panel proposal to re-introduce a sub-95 conditional path is a candidate for CEO-Locked-Rule-13 dispositional veto by default, given the existence of the admin-only expiring override per §7.6.1."
- (c) Strengthen toward audit — every §11 Step 5 evaluation that consults an override emits an additional `governance_record_entry kind:'step5_override_consulted.v1'` envelope alongside the existing `gtm_bar_admin_override_used.v1`, providing per-evaluation audit granularity.
- (d) Reject — restore the v2 fallback clause ("if Panel ever re-introduces a conditional path, ALL `high` findings must be Resolved") as a safety valve; v3 removal of fallback is too rigid.
- (e) INSUFFICIENT_INFORMATION.

### CA-13-A v3 Q3 — §19.0 STRONGER (mandatory anti-conflation invariant)

Does Panel ratify the §19.0 STRONGER variant: append mandatory invariant "These are NEVER conflated in any operator-facing surface" + UI surface enforcement?

- (a) **Ratify v3 as drafted** (mandatory anti-conflation invariant + per-surface labeling requirement + dual-display audit envelope).
- (b) Strengthen further — also require admin role for any UI surface that displays BOTH bars simultaneously (operator role cannot author dashboards mixing the two); rationale: operator-authored surfaces are the most-conflation-prone.
- (c) Ratify but with redundancy fix — keep the invariant but DELETE the §19.0 paragraph table (the invariant alone suffices; §10 governance-mechanisms table already covers the distinction per Slot 6 #19).
- (d) Reject — §19.0 paragraph + invariant is redundant with §10 governance-mechanisms table; remove §19.0 entirely.
- (e) INSUFFICIENT_INFORMATION.

### CA-13-B v3 Q1 — §15-intro + §15.1 rows 21/26 + EXECUTOR_REGISTRY cross-reference

Does Panel ratify the v3 §15-intro + §15.1 rows 21/26 wording (v2 wording carried) PLUS the explicit EXECUTOR_REGISTRY + BaseAgent.guard() enforcement-spec cross-reference (3-bullet list pointing to `SELF_RENEWAL_AGENT_SPEC.md` §3.2 + `_registry.ts` + `BaseAgent.js`)?

- (a) **Ratify v3 as drafted** (wording carried + 3-bullet enforcement-spec cross-reference).
- (b) Strengthen — also require an inline schema snippet of `BaseAgent.guard()` arguments (`authorityNeeded: Set<Authority>`, `caller: AgentRecord`) directly in the §15-intro text, not just a cross-reference.
- (c) Strengthen — bundle the §15.5 sibling row-table populate INTO the CA-13-B v3 ratification (not a separate engineering dispatch); v3 lands the EXECUTOR_REGISTRY array entries alongside the wording change.
- (d) Reject — wording remains too vague without the actual §15.5 sibling row-table populate; defer the entire CA-13-B until that engineering dispatch ships.
- (e) INSUFFICIENT_INFORMATION.

### CA-13-B v3 Q2 — Capability-keyed sibling naming + `membership` rename alternative

Does Panel ratify the v3 capability-keyed sibling charter naming (`crawl-write-executor` + `orchestra-admission-executor`)?

- (a) **Ratify v3 primary as drafted** (`crawl-write-executor` + `orchestra-admission-executor`).
- (b) Ratify with the `membership` rename — Agent #26 sibling key becomes `orchestra-membership-executor` (Slot 2 + Slot 6 + Slot 7); Agent #21 sibling key remains `crawl-write-executor`.
- (c) Adopt agentId-keyed instead — `agent-21-executor` + `agent-26-executor` (Slot 1's preferred variant; preserves agent traceability for incident debugging at the cost of capability-clarity).
- (d) Reject — restore v1 agent-short-name-keyed naming (`aggressive-crawl-conductor-executor` + `orchestra-research-agent-executor`).
- (e) INSUFFICIENT_INFORMATION.

---

## §4 — Acceptance criteria for CA-13 v3 ratification

- W6 v3 re-Panel ratification ≥7/engaged drafted-(a) on each of the 5 v3 questions.
- Engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6.
- CEO disposition per Locked Rule 13. The CEO has pre-decided the option-(i) spine for A-Q1; Panel feedback on the spine itself is advisory (the structural choice is made; the Panel ratifies the implementation details + the four other questions in the standard CA-n cycle).
- If all 5 ratify (a)-clean, CA-13 v3 promotes as a single CA cycle (next free CA number per §18.4).
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA13-v3-promotion-<date>.md` per §18.3.
- **Cutover dependency:** the ≥95 canonical bar does NOT take effect at promotion commit; it takes effect at the migration cutover envelope per §7.6.2. Engineering dispatch must ship the migration script + the cutover step BEFORE the bar is operational.
- Cross-CA dependencies:
  - CA-14-A LIMITATIONS + Phase B per ENTRY 015 already canonical (no dependency).
  - CA-15 v3 numeric-floor-only loop exit (this branch's sibling commit `c5b050f`) references the ≥95 bar via `gtm_ready_bar_override`; CA-15 v3's reference adjusts at CA-15 v3 promotion time to point to the CA-13-v3 admin-only-expiring-override mechanism instead.

---

*End of CA-13 v3 DRAFT. Pending W6 v3 re-Panel (5 questions) + CEO disposition per CA-n cycle (Rev-2.1 §18). Doc-only; canonical files NOT amended in this commit per CA-n cycle discipline. The CEO Locked Rule 13 option-(i) spine decision is recorded in this draft's lineage + §0 changelog and binds the v3 A-Q1 framing.*
