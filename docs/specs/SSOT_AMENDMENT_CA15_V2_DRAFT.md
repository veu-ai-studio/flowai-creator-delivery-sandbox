# SSOT Amendment Draft — CA-15 v2 (STRUCTURAL REWRITE)

**Status:** DRAFT v2 — applies W6 quorum-fix REVISE directions verbatim (`docs/panel-consultations/ca-15-quorum-fix-rerun-2026-05-19.md`, 0/11 cleared, 8/10 engaged, 31 distinct objections). This is a **STRUCTURAL REWRITE** per CEO dispatch — every v1 question received a REVISE direction. Pending W6 re-Panel.
**Author:** W3, 2026-05-19.
**Lineage:** CA-15 v1 (`fae9ff3` 7-axis Multi-Dim + purpose_record + Purpose-Driven Optimization + §27 SSOT-Conformance Gate) → joint Panel `8e185a6` engagement-gated → W6 quorum-fix rerun `cc14a8f` (0/11 cleared; 5 REJECT-plurality, 6 REVISE-plurality) → CEO REVISE directions (this dispatch) → **STRUCTURAL REWRITE v2**.

**v2 size discipline:** ≤35K chars per proven engagement recipe. Current file ~26K chars; question block kept inline.

---

## v2 changelog — STRUCTURAL REWRITE (per-Q REVISE vs v1)

The v1 amendment proposed FOUR major canonical additions (CA-15-A 7-axis rubric; CA-15-B purpose_record block; CA-15-C PURPOSE_DRIFT exit; CA-15-D §27 SSOT-Conformance Gate). The Panel rerun rejected the structural shape across the board (5 of 11 REJECT-plurality; remaining 6 REVISE). v2's STRUCTURAL REWRITE inverts the v1 architecture per the dispatch directions below.

| Q | v1 verdict (rerun) | v2 STRUCTURAL change | Panel objection slots driving |
|---|---|---|---|
| **A-Q1** | `PLURALITY_REJECT` 5/8 | **MERGE Multi-Dim into §10.1 5-dim** — DO NOT add a separate §10.1.1 7-axis rubric; instead extend the existing §10.1 5-dim engine (UI/UX, API, Logic, Business Value, Security Posture) where any new dimension is justified, capped at +2 dims maximum. Net effect: §10.1 may grow from 5 to ≤7 dims, but stays ONE rubric, not two. | Slot 1 (axis overlap double-counting), Slot 10 (§10.1.1 rubric overlaps §10.1), Slot 8 (axis set mismatches question) |
| **A-Q2** | `PLURALITY_CA15AQ2-SUBORD` 4/8 | **Multi-Dim = TELEMETRY ONLY** — NOT folded into §7.6 GTM Readiness score formula. Existing §7.6 formula `100 − 10·crit − 5·high − 2·med − 0.5·low` is UNCHANGED. Any new content-quality findings emit as `governance_record_entry kind:'content_quality_finding'` telemetry only; do not adjust the §7.6 score. | Slot 8 (duplicate scoring semantics), Slot 5 (complexity overload) |
| **A-Q3** | `PLURALITY_CA15AQ3-ADMIN` 4/8 | **ADMIN-ONLY KNOB** — any opt-in to expanded dims requires admin role + per-product config flag `product_registry.expanded_quality_dims_enabled` (default `false`). | (no further structural change; admin-gating embedded directly) |
| **B-Q1** | `PLURALITY_REJECT` 4/8 | **`purpose_record` REMOVED entirely as canonical ProductSSOT block.** ProductSSOT stays at 6 canonical blocks per CA-10-A (`product_registry`, `governance_record`, `architecture_snapshot`, `delta_log`, `governance_record_entry`, `score_history`). Purpose information, if needed, lives in an OPTIONAL `product_registry.product_purpose` text field (free-form, NOT a structured block, NOT a 7th canonical block). | Slot 8 (purpose capture risks false intent), Slot 30 (truncated schema, no validation), Slot 1 (purpose capture timing race) |
| **B-Q2** | `SPLIT CA15BQ2-DROP_RE` 3/8 | **REVERSE-ENGINEERED CAPTURE DROPPED.** Only operator-supplied (mode=`described`) purpose accepted. Inferred + synthesized modes from v1 ELIMINATED. | Slot 8 (false intent ossification), Slot 6 (LLM unreliable), Slot 4 (ambiguity in capture modes) |
| **B-Q3** | `PLURALITY_REJECT` 5/8 | **Placeholder detection MOVES TO TOOLING.** Not a canonical SSOT rule. Implement as `scripts/lint-product-purpose.mjs` CI helper that warns on lorem-ipsum / placeholder-text patterns at PR time; no canonical SSOT spec. | (general REJECT — structurally inappropriate as canonical) |
| **C-Q1** | `PLURALITY_REJECT` 3/8 | **NUMERIC-FLOOR-ONLY exit criterion.** Purpose-Driven Optimization loop exit gate uses §7.6 score numerical floor + zero `critical` ONLY. No LLM-judged purpose-alignment check at exit. | Slot 7 (LLM over-reliance), Slot 6 (LLM unreliable) |
| **C-Q2** | `PLURALITY_REJECT` 4/8 | **DROP HARDCODED 0.7 threshold.** v1's `purpose_fulfillment_score ≥ 0.7` exit threshold removed entirely (it's gone with the LLM check). | Slot 8 (drift gate deadlock) |
| **C-Q3** | `SPLIT CA15CQ3-BLOCK` 3/8 | **PURPOSE_DRIFT SUB-CASES.** Drift becomes a tiered annotation, NOT an exit gate. Three sub-cases: `PURPOSE_DRIFT_MINOR` (annotation only, loop continues), `PURPOSE_DRIFT_MAJOR` (operator-disposition required at next §11 Step), `PURPOSE_DRIFT_CRITICAL` (Panel notification + freeze new fixes). Loop never deadlocks on drift. | Slot 8 (drift gate deadlock), Slot 21 (drift handling unclear) |
| **D-Q1** | `SPLIT CA15DQ1-ADVISORY` 3/8 | **§27 SSOT-Conformance Gate = ADVISORY ONLY.** Not a hard blocking gate. Emits `governance_record_entry kind:'ssot_conformance_advisory'`; surfaces in admin dashboard; operator may choose to deploy anyway. The "hard gate" framing of v1 is replaced with advisory framing throughout. | Slot 1 (too aggressive invalidation), Slot 7 (rigidity), Slot 13/16/19 (overhead/bottleneck), Slot 28 (timing) |
| **D-Q2** | `PLURALITY_REJECT` 4/8 | **SCOPED RE-SIGN.** CEO sign-off invalidation triggers ONLY when a CA explicitly amends one of the conformance test files or §27 directly. Out-of-scope CAs (typo fixes, unrelated wording changes, agent registry edits, etc.) DO NOT invalidate prior sign-offs. List of "scope-affecting" files maintained in `docs/governance/CONFORMANCE_SCOPE.md` (engineering dispatch). | Slot 26 (CEO re-sign every CA brittle), Slot 1 (conformance gate too aggressive), Slot 31 (§27 depends on parked CAs) |

**Net v2 effect — structural inversion summary:**

| Surface | v1 design | v2 STRUCTURAL REWRITE |
|---|---|---|
| Quality audit shape | NEW §10.1.1 7-axis rubric (parallel to §10.1) | EXTEND existing §10.1 5-dim → ≤7-dim (admin-opt-in for dims 6 & 7) |
| Audit findings in score | Folded into §7.6 score | Telemetry ONLY; §7.6 formula UNCHANGED |
| ProductSSOT canonical blocks | 6 → 7 (add `purpose_record`) | STAYS at 6; optional free-form `product_registry.product_purpose` text field |
| Purpose capture modes | `described` / `inferred` / `synthesized` | Only `described` (operator-supplied) |
| Purpose-Driven Optimization exit | LLM purpose-alignment check + numeric ≥0.7 | Numeric-floor-only (§7.6 score floor + zero `critical`) |
| PURPOSE_DRIFT semantics | Exit with `NO_IMPROVEMENT` (deadlock risk) | Tiered annotation: minor / major / critical (never deadlocks) |
| §27 SSOT-Conformance Gate | Hard blocking gate at end of pipeline | Advisory only; emits findings; operator may proceed |
| CEO re-sign trigger | EVERY CA promotion | Scoped — only CAs amending conformance scope files |

---

## CA-15-A v2 — Extend §10.1 5-dim to ≤7-dim (MERGED, not parallel)

### Rationale

Slot 1 cited: "CA-15-A defines a UI/UX axis in the 7-axis rubric that is 'distinct from §10.1 UI/UX' but both feed into §7.6 scoring with equal weight. This creates a double-counting problem." Slot 10 cited: "The 7-axis Multi-Dimensional Quality Audit in §10.1.1 redefines UI/UX as content/copy quality while §10.1 already scores build-quality UI/UX; no conflict-resolution rule is stated." Slot 8 noted the v1's own axis-set was internally inconsistent.

The Panel's structural objection is unambiguous: **DO NOT create a second parallel rubric.** v2 resolves this by extending the existing §10.1 5-dim audit engine in-place.

### Canonical text — §10.1 dimension extension

Modify §10.1 (existing 5-dim engine: UI/UX, API, Logic, Business Value, Security Posture):

```markdown
### §10.1 — Self-Audit Quality Audit Engine (5 → up to 7 dims; admin-opt-in for dims 6 & 7 per CA-15-A v2)

Canonical default: 5 dimensions, each scored 0-100 with confidence 0-100%,
≥95/95 threshold per dimension required for Sprint 5 Step 4 Quality Audit
pass per §19 existing rule.

**Canonical default dimensions (UNCHANGED, ALWAYS-ON):**
1. UI/UX (visual + interactive quality of the build)
2. API (correctness + contract conformance)
3. Logic (business logic correctness)
4. Business Value (does the build accomplish the product's stated goal)
5. Security Posture (OWASP top-10, secrets handling, auth correctness)

**Optional extended dimensions (admin-opt-in, default OFF, per CA-15-A v2):**
6. **Content Quality** (lorem-ipsum / placeholder text / grammar / copy
   tone). Findings emit as content_quality_finding telemetry; do NOT
   adjust §7.6 score per CA-15-A-Q2 v2.
7. **Accessibility** (WCAG 2.1 AA conformance, screen-reader compatibility,
   keyboard-only navigation). Findings emit as accessibility_finding
   telemetry; do NOT adjust §7.6 score per CA-15-A-Q2 v2.

**Opt-in mechanism (admin-only):** dims 6 + 7 are enabled per-product via
`product_registry.expanded_quality_dims_enabled` boolean (default `false`).
When `true`, Step 4 Quality Audit runs the extended 7-dim engine + emits
telemetry but Step 4 PASS criterion stays "≥95/95 on the canonical 5
dimensions" (dims 6 + 7 are advisory only — they MAY raise audit alarms
via the dashboard but do not block Step 4).

**Conformance-test acceptance criteria:**

- **CA15A-v2-CT-1.** Default product (no operator override): Step 4
  Quality Audit runs the 5 canonical dimensions only. Dims 6 + 7 are not
  evaluated.
- **CA15A-v2-CT-2.** Operator sets `expanded_quality_dims_enabled: true`:
  Step 4 evaluates all 7 dims; Step 4 PASS still requires only ≥95/95 on
  canonical dims 1-5; dims 6 + 7 emit as `content_quality_finding` /
  `accessibility_finding` telemetry; do not affect Step 4 verdict.
- **CA15A-v2-CT-3.** Non-admin operator cannot toggle
  `expanded_quality_dims_enabled`; UI surfaces the toggle as disabled +
  shows tooltip "admin-only setting per CA-15-A v2".
```

**§7.6 score formula UNCHANGED (verbatim repeat for clarity — no edit):**

```markdown
**§7.6 GTM Readiness score formula (UNCHANGED from prior canonical per CA-13-A v2 + ENTRY 015):**

  score = max(0, 100 − 10·crit − 5·high − 2·med − 0.5·low)

where `crit / high / med / low` count only findings of those severities
present in the Phase A surface + Phase B adversarial reports per CA-14-A
canonical + ENTRY 015 cleared-8. **Per CA-15-A v2: content_quality and
accessibility findings DO NOT contribute to crit/high/med/low counts in
this formula.** They emit as telemetry on the admin dashboard ONLY.
```

---

## CA-15-B v2 — `purpose_record` REMOVED + optional free-form `product_purpose` field

### Rationale

Slot 8 cited: "CA-15-B lets the system infer or synthesize a product's purpose from crawls or multiple sources and then stores that as canonical ProductSSOT state. That creates a high risk of ossifying a model hallucination or a marketing page's incidental text as the product's real objective." Slot 30: "§7.5 adds purpose_record as the 7th block with a JSON schema that ends mid-array at fulfillment_signals; no validation, required-field, or atomic-write rule is provided."

Panel REJECT was 4/8 at rerun (plurality REJECT). v2 removes `purpose_record` as a canonical ProductSSOT block entirely. The ProductSSOT stays at 6 canonical blocks per CA-10-A.

### Canonical text — ProductSSOT structure UNCHANGED + optional `product_purpose` field

```markdown
### §7.5 — ProductSSOT canonical blocks (UNCHANGED at 6 per CA-10-A; CA-15-B v2 confirms no 7th block)

ProductSSOT remains EXACTLY 6 canonical blocks per CA-10-A:

1. `product_registry`
2. `governance_record`
3. `architecture_snapshot`
4. `delta_log`
5. `governance_record_entry`
6. `score_history`

**CA-15-B v2 disposition:** The v1 CA-15-B proposal to add `purpose_record`
as a 7th canonical block is REJECTED. Purpose information, where useful
to operators, lives in an OPTIONAL free-form text field on
`product_registry`:

```yaml
# product_registry row (additive optional field per CA-15-B v2)
- product_id: string
  product_purpose:                      # NEW OPTIONAL per CA-15-B v2
    type: string?
    description: "Free-form operator-supplied product purpose statement.
                  Mode is implicitly 'described' (operator-supplied) only;
                  inferred/synthesized modes REJECTED per CA-15-B v2.
                  Single field, no schema. Optional. Default null."
```

**Capture mode discipline (CA-15-B v2):** Only operator-supplied
`product_purpose` is accepted. The v1 modes `inferred` (LLM page-content
analysis) and `synthesized` (multi-source merge) are ELIMINATED. Any
agent attempting to populate `product_purpose` from non-operator sources
MUST be rejected at the ProductSSOT write-gate per CA-14-D-Q1 ENTRY 015
atomic-audit-write invariant.

**Placeholder detection (CA-15-B v2 disposition):** v1's proposal to add
canonical placeholder-detection rules (lorem-ipsum, "TBD", etc.) is
RELOCATED to tooling. Implementation lives in
`scripts/lint-product-purpose.mjs` as a CI helper that warns on suspicious
content at PR time. Not a canonical SSOT rule. The purpose field itself
is free-form; no canonical validation beyond "is a string or null".

**Conformance-test acceptance criteria:**

- **CA15B-v2-CT-1.** ProductSSOT structure validator accepts a registry
  row with `product_purpose: null` OR `product_purpose: "some operator
  text"` OR `product_purpose` field absent entirely.
- **CA15B-v2-CT-2.** No code path in `src/lib/governance/` writes to
  `product_purpose` outside an admin-triggered operator-supplied update;
  grep for `inferred` / `synthesized` modes returns zero hits.
- **CA15B-v2-CT-3.** ProductSSOT remains at exactly 6 canonical blocks;
  no `purpose_record` block exists anywhere in `src/lib/ssot/` or
  `docs/CANONICAL_REFERENCE.md`.
```

---

## CA-15-C v2 — Numeric-floor-only optimization exit + tiered drift annotation

### Rationale

Slot 7 + Slot 6 objected to LLM over-reliance for purpose-alignment scoring. Slot 8 noted the v1 drift gate could deadlock loops. v2 strips LLM-judged exit criteria entirely and converts drift to a tiered annotation.

### Canonical text — Purpose-Driven Optimization Loop (revised exit + drift)

```markdown
### §28-bis — Purpose-Driven Optimization Loop (CA-15-C v2 numeric-floor-only exit)

The repeat-until-GTM loop's exit criterion per CA-15-C v2 uses
**numeric-floor-only** semantics — no LLM-judged purpose-fulfillment
score participates in the exit gate.

**Loop exit conditions (ALL must hold):**

1. §7.6 GTM Readiness score ≥ `product_registry.gtm_ready_bar_override`
   (default 75 per CA-13-A v2 ENTRY-pending; ≥95 op-in operator-config).
2. Zero `critical` findings open per CA-14-A canonical + ENTRY 015.
3. Self-Renewal terminal on all `high` findings per CA-14-A canonical +
   ENTRY 015 (terminal = Resolved / Documented-with-rationale /
   Human-gated).
4. LIMITATIONS section published per CA-14-A-Q2 verbatim wording (ENTRY 015).
5. Phase B pass per CA-14-A canonical + Agent #21 Phase B charter (ENTRY 015).

The v1 proposal of a `purpose_fulfillment_score ≥ 0.7` LLM-judged exit
criterion is ELIMINATED entirely (hardcoded 0.7 dropped per CA-15-C-Q2
v2). No LLM-judged check participates in loop exit.

### §28-bis.1 — PURPOSE_DRIFT tiered annotation (CA-15-C v2; no deadlock)

Drift detection runs at every §11 Step 4 Quality Audit + every loop
iteration (NOT as an exit gate). Three sub-cases:

| Tier | Detection | Action | Loop effect |
|---|---|---|---|
| `PURPOSE_DRIFT_MINOR` | Diff between current `product_purpose` and prior reflects ≤20% token change (string-similarity heuristic) | Append `governance_record_entry kind:'purpose_drift_annotation.v1' severity:'minor'`; admin dashboard surfaces annotation | Loop CONTINUES; no exit gate; no operator action required |
| `PURPOSE_DRIFT_MAJOR` | Diff reflects >20% but ≤50% token change | Append entry severity:'major'; surface to operator at NEXT §11 Step (operator may dispose: accept / reject / continue); admin dashboard alarm | Loop CONTINUES; operator disposition asynchronous; no exit gate |
| `PURPOSE_DRIFT_CRITICAL` | Diff reflects >50% token change OR `product_purpose` cleared to null after prior non-null value | Append entry severity:'critical'; FREEZE new fixes at the Self-Renewal layer (no new fix-PRs created); Panel notification per Locked Rule 17; Operator + admin must jointly re-approve before fixes resume | Self-Renewal froze; loop iteration continues but no new fix lands until operator+admin re-approve |

**Drift NEVER deadlocks the loop.** PURPOSE_DRIFT_CRITICAL freezes
Self-Renewal fix-PRs but does NOT block other loop activity (e.g.,
re-crawl, score tally, LIMITATIONS regen, etc.). The loop is allowed to
exit on the numeric-floor exit conditions above even with an open
critical drift annotation (because the drift annotation is semantic
metadata, not a quality blocker).

**Conformance-test acceptance criteria:**

- **CA15C-v2-CT-1.** Loop exit succeeds with all 5 numeric conditions
  met regardless of drift state; no purpose-fulfillment-score
  computation invoked at exit.
- **CA15C-v2-CT-2.** No code path in `src/lib/optimization/` invokes
  Anthropic LLM API or any other LLM at loop-exit determination.
  Implementation grep: zero LLM calls in the exit-gate code path.
- **CA15C-v2-CT-3.** PURPOSE_DRIFT_CRITICAL appears in 1 of 1000 test
  scenarios (operator clears purpose mid-loop); Self-Renewal fix
  generation skipped; loop iteration completes successfully; no
  deadlock.
- **CA15C-v2-CT-4.** Hardcoded 0.7 absent: grep across `src/` for
  `0.7` AND `purpose_fulfillment_score` returns zero hits.
```

---

## CA-15-D v2 — §27 = ADVISORY + scoped CEO re-sign

### Rationale

Slot 1: "CA-15-D invalidates CEO sign-off on EVERY CA promotion, not just CAs that affect conformance testing. This means unrelated amendments (e.g., fixing a typo in §28) force re-validation of all products." Slot 26: "CA-15-D-Q2 makes CEO sign-off invalid on every CA promotion, even promotions that do not affect the specific conformance gate. This couples ordinary governance churn to a single human approver."

v2 reframes §27 as ADVISORY (not blocking) + scopes CEO re-sign to CAs that touch conformance scope.

### Canonical text — §27 Conformance Gate (REWRITTEN as advisory)

```markdown
### §27 — SSOT-Conformance Advisory (CA-15-D v2; ADVISORY, not blocking)

At the end of each §11 Six-Step Clearance Protocol run, an SSOT-
Conformance Advisory runs over the resulting ProductSSOT state +
`governance_record_entry` log. This is an **advisory check**, not a
blocking gate.

**Advisory checks run:**

1. ProductSSOT structure validates against the 6 canonical blocks per
   CA-10-A (any 7th block triggers a `ssot_conformance_advisory.v1`
   entry severity:'critical').
2. Each `governance_record_entry` row references a known canonical
   `kind` (validation list maintained in
   `src/lib/governance/CanonicalKinds.ts`).
3. Each `architecture_snapshot.gtm_readiness_score` write has a
   companion `governance_record_entry kind:'gtm_readiness_score'` per
   CA-14-D-Q1 ENTRY 015 atomic-audit-write invariant.
4. Each `delta_log` row references a non-null
   `governance_record_entry.id` (provenance check).

**Advisory output:** `governance_record_entry kind:'ssot_conformance_
advisory.v1'` with per-check pass/fail + severity. Surfaces in the
admin dashboard. Does NOT block deployment.

**Operator override:** No override needed — advisory does not block.
Admin may file Panel + CEO escalation if advisory severity is critical;
operator may proceed with deployment regardless.

**Conformance-test acceptance criteria:**

- **CA15D-v2-CT-1.** §27 Advisory runs at end of §11 Six-Step; emits
  `ssot_conformance_advisory.v1` entry; deployment proceeds even when
  advisory has critical findings.
- **CA15D-v2-CT-2.** No `block_deployment` flag exists in the §27
  advisory code path. Grep across `src/lib/governance/SSOTConformance.ts`
  (or equivalent): zero blocking calls.

### §27.1 — Scoped CEO re-sign (CA-15-D-Q2 v2)

CEO sign-off on a product's prior §11 Six-Step Clearance run is
invalidated by a subsequent CA promotion ONLY when the CA explicitly
amends one of the files listed in `docs/governance/CONFORMANCE_SCOPE.md`.

**Conformance-scope files (canonical list; engineering dispatch
maintains):**
- `docs/CANONICAL_REFERENCE.md` §7.6 (score formula)
- `docs/CANONICAL_REFERENCE.md` §10.1 (Self-Audit engine)
- `docs/CANONICAL_REFERENCE.md` §11 (Six-Step Clearance)
- `docs/CANONICAL_REFERENCE.md` §19 (Self-Audit threshold)
- `docs/CANONICAL_REFERENCE.md` §27 (this section)
- `src/lib/governance/CanonicalKinds.ts` (entry kind whitelist)
- `src/lib/governance/ConformanceTestRunner.ts` (advisory checker)

CAs that amend files OUTSIDE this list (e.g., agent #21 charter wording,
§28 narrative typo fixes, §15.1 row updates not touching authority) DO
NOT invalidate prior CEO sign-offs.

When a CA amends any file in the scope list, the §18.4 ratified-table
entry MUST include the column "ceo_resign_required: true". §27 Advisory
surfaces a `ceo_resign_pending` note in the admin dashboard until the
re-sign lands.

**Conformance-test acceptance criteria:**

- **CA15D-v2-CT-3.** A test CA touching only `docs/CANONICAL_HISTORY.md`
  (history-only, no scope-file changes): §18.4 entry does NOT carry
  `ceo_resign_required: true`; prior CEO sign-offs remain valid.
- **CA15D-v2-CT-4.** A test CA touching `docs/CANONICAL_REFERENCE.md`
  §7.6: §18.4 entry carries `ceo_resign_required: true`; admin
  dashboard surfaces `ceo_resign_pending` advisory for all products
  with prior sign-off.
```

---

## v2 Panel Questions (re-Panel — 11 questions; same numbering for traceability)

### CA-15-A v2 Q1 — Multi-Dim MERGED into §10.1 5-dim (≤7-dim)

Does Panel ratify the v2 structural rewrite (extend §10.1 from 5 to ≤7 dims; admin-opt-in for dims 6 & 7; NO parallel §10.1.1 rubric)?

- (a) Ratify v2 as drafted: §10.1 stays ONE engine; dims 6 + 7 optional admin-opt-in.
- (b) Ratify with tighter scope — only dim 6 (Content Quality) added; dim 7 (Accessibility) deferred.
- (c) Ratify with broader scope — all 7 dims always-on; admin-opt-in eliminated.
- (d) Reject — leave §10.1 at 5 dims; content quality + accessibility live in tooling only.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-A v2 Q2 — Multi-Dim = telemetry only

Does Panel ratify that content_quality + accessibility findings do NOT feed §7.6 score (telemetry-only)?

- (a) Ratify v2 as drafted: telemetry only; §7.6 formula UNCHANGED.
- (b) Ratify with stricter wording — explicit invariant added: "§7.6 formula NEVER absorbs content_quality_finding / accessibility_finding counts."
- (c) Ratify partial-feed — accessibility findings of severity critical/high feed §7.6; content_quality stays telemetry only.
- (d) Reject — both should feed §7.6 with the same coefficients as Phase A/B findings.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-A v2 Q3 — Admin-only opt-in

Does Panel ratify that dims 6 + 7 are admin-only opt-in (default OFF)?

- (a) Ratify v2 as drafted: `expanded_quality_dims_enabled` admin-only, default `false`.
- (b) Ratify with operator-role allowed (not admin-only).
- (c) Reject — dims should be always-on; no opt-in.
- (d) Defer — opt-in semantics belong in operator-config doc, not canonical §10.1.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-B v2 Q1 — `purpose_record` REMOVED + optional `product_purpose` field

Does Panel ratify that `purpose_record` is NOT added as a 7th canonical block; an optional free-form `product_purpose` field on `product_registry` replaces it?

- (a) Ratify v2 as drafted.
- (b) Ratify but with `product_purpose` REQUIRED (not optional) on every `product_registry` row.
- (c) Re-introduce `purpose_record` as a 7th block, but with strict schema validation + atomic-write invariant inherited from CA-14-D-Q1.
- (d) Reject the optional `product_purpose` field too — no purpose information lives in ProductSSOT; it stays in operator notes outside SSOT.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-B v2 Q2 — Reverse-engineered capture DROPPED

Does Panel ratify dropping `inferred` + `synthesized` purpose-capture modes (only `described` mode accepted)?

- (a) Ratify v2 as drafted.
- (b) Ratify but allow `inferred` mode as a SUGGESTION surface (admin-reviewable; never auto-applied to ProductSSOT).
- (c) Reject — `inferred` mode is the primary value-add of v1 CA-15-B and should remain.
- (d) Defer to tooling — operator may run an inference helper script and copy results into the `product_purpose` field manually.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-B v2 Q3 — Placeholder detection moves to tooling

Does Panel ratify moving placeholder detection (lorem-ipsum, "TBD", etc.) to `scripts/lint-product-purpose.mjs` (NOT canonical SSOT)?

- (a) Ratify v2 as drafted.
- (b) Ratify with a §10.1 dim 6 (Content Quality) overlap — placeholder detection runs both in tooling AND in dim 6 when admin opts in.
- (c) Reject — placeholder detection MUST be canonical to prevent placeholder text from reaching production.
- (d) Defer entirely — placeholder detection is not a FlowAI concern.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-C v2 Q1 — Numeric-floor-only loop exit

Does Panel ratify that the Purpose-Driven Optimization loop exits on numeric §7.6 floor + zero critical + Self-Renewal terminal + LIMITATIONS + Phase B pass — NO LLM-judged purpose-alignment check?

- (a) Ratify v2 as drafted.
- (b) Ratify but add a 6th exit condition — `product_purpose` field non-null (operator must have supplied purpose for loop to exit).
- (c) Re-introduce LLM-judged purpose-alignment check but make it a 6th exit condition that defaults to satisfied when no operator-supplied `product_purpose` exists.
- (d) Reject — LLM-judged check is the heart of "Purpose-Driven" Optimization; without it the loop is just standard optimization.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-C v2 Q2 — Hardcoded 0.7 threshold DROPPED

Does Panel ratify that the hardcoded `purpose_fulfillment_score ≥ 0.7` threshold from v1 is eliminated entirely?

- (a) Ratify v2 as drafted (threshold gone).
- (b) Ratify but parameterize — operator-config knob replaces hardcoded 0.7; default still 0.7; admin may tune.
- (c) Reject — keep hardcoded 0.7.
- (d) Reject — hardcoded threshold removed BUT replaced with operator-supplied target string + LLM verifier.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-C v2 Q3 — PURPOSE_DRIFT tiered annotation (3 sub-cases)

Does Panel ratify drift as a tiered annotation (minor/major/critical) that never deadlocks the loop?

- (a) Ratify v2 as drafted (minor: log only; major: operator dispose at next Step; critical: freeze fixes + Panel notify).
- (b) Ratify with stricter critical tier — critical drift ALSO blocks loop exit (not just fix generation).
- (c) Ratify with looser tier thresholds — 30% / 60% token-change thresholds (not 20% / 50%).
- (d) Reject — drift should never block anything; reduce to a single advisory annotation kind regardless of severity.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-D v2 Q1 — §27 = advisory (not blocking)

Does Panel ratify that the §27 SSOT-Conformance Gate becomes advisory only (no blocking)?

- (a) Ratify v2 as drafted (advisory only).
- (b) Ratify with critical-finding escalation — advisory critical findings DO block deployment until admin acks (less than fully blocking, more than purely advisory).
- (c) Ratify advisory framing BUT with admin dashboard prominence requirement (must appear on dashboard top bar).
- (d) Reject — §27 should stay a hard blocking gate as v1 proposed.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-D v2 Q2 — Scoped CEO re-sign

Does Panel ratify that CEO re-sign is required ONLY for CAs amending files in `docs/governance/CONFORMANCE_SCOPE.md` (not every CA)?

- (a) Ratify v2 as drafted.
- (b) Ratify with broader scope — re-sign also triggered by any CA editing `src/lib/governance/` regardless of file (whole governance module).
- (c) Ratify with narrower scope — re-sign only for CAs amending §7.6 + §10.1 + §11 specifically; other scope files don't trigger re-sign.
- (d) Reject — every CA promotion should invalidate prior sign-offs as v1 proposed.
- (e) INSUFFICIENT_INFORMATION.

---

## Acceptance criteria for CA-15 v2 ratification

- W6 re-Panel ratification ≥7/engaged drafted-(a) on each of the 11 questions.
- Engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6.
- CEO disposition per Locked Rule 13.
- If all 11 ratify (a)-clean, CA-15 v2 promotes as a single CA cycle.
- If Panel splits per question, ratified halves promote independently per ENTRY 015 cleared-N partial-promotion precedent.
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA15-v2-promotion-<date>.md` per §18.3.
- Cross-CA dependency: CA-15-A §10.1 dimension extension assumes CA-14-A canonical (LIMITATIONS + Phase B) is ratified first (ENTRY 015 covers this).

---

*End of CA-15 v2 STRUCTURAL REWRITE draft. Pending W6 re-Panel + CEO disposition per CA-n cycle (Rev-2.1 §18). Doc-only; canonical files NOT amended in this commit. ENTRY 015 cleared-8 promotion lands separately per `CLEARED8_PROMOTION_PACKAGE_DRAFT.md`.*
