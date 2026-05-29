# SSOT Amendment Draft — CA-15 v3 (convergent: deletions + §27 revert)

**Status:** DRAFT v3 — applies W6 v2 re-Panel verdicts verbatim per `docs/panel-consultations/ca-15-v2-repanel-2026-05-19.md` (commit `db457a5`, 9/10 engaged, 32,681 chars, 37 distinct objections, 3 cleared / 11). Pending W6 v3 re-Panel + CEO ratification.
**Author:** W3, 2026-05-19 (post-v2 re-Panel).
**Bundle target:** ≤32K chars (proven engagement recipe; v2 ran at 32,681 chars with 9/10 engagement).

**Lineage:** CA-15 v1 (`fae9ff3` — 7-axis Multi-Dim + purpose_record + Purpose-Driven Optimization + §27 SSOT-Conformance Gate) → joint Panel `8e185a6` engagement-gated → W6 quorum-fix rerun `cc14a8f` (0/11 cleared) → CA-15 v2 STRUCTURAL REWRITE (`746bb7e`) → W6 v2 re-Panel (`db457a5` panel artifact) → CEO dispatch convergent directions → **v3 (this draft)**.

---

## §0 — v3 changelog (per-question what-changed-vs-v2 + driving Panel slot)

| v2 Q | v2 re-Panel verdict | v3 action | Rationale / driving Panel slot(s) |
|---|---|---|---|
| **A-Q1** | `PLURALITY_REJECT` 6/9 | **REMOVE §10.1 dim-extension ENTIRELY.** content_quality + accessibility move to the tooling layer (consistent with B-Q3). NOT re-asked at v3. | Slot 1 #1 (shadow-metrics); Slot 2 #5 + #6; Slot 3 #10; Slot 4 #11; Slot 5 #15 + #16; Slot 6 #18 + #19; Slot 7 #23; Slot 8 #27 + #28; Slot 9 #32. Convergent objection: dim-extension creates split-brain audit + shadow metrics + dimensional overlap with §10.1 UI/UX. |
| **A-Q2** | `SPLIT` 4/4 tie | **MOOT — dropped.** §10.1 dim-extension is removed; there are no telemetry-feeding dims 6+7 to discuss. NOT re-asked at v3. | A-Q1 removal renders Q2 inapplicable. |
| **A-Q3** | `SPLIT` 4/4 tie | **MOOT — dropped.** No admin-opt-in to discuss because no extension exists. NOT re-asked at v3. | A-Q1 removal renders Q3 inapplicable. |
| **B-Q1** | `PLURALITY_REJECT` 5/9 | **REMOVE optional `product_purpose` field ENTIRELY.** No purpose information lives in ProductSSOT canonical — purpose lives in operator notes outside SSOT. ProductSSOT stays at the 6 canonical blocks per CA-10-A. NOT re-asked at v3. | Slot 1 #2 (atomicity gap); Slot 2 #7 (ambiguity); Slot 3 #8 (no validation); Slot 4 #13 (misuse); Slot 5 #17 (inconsistent); Slot 6 #20 (no structure); Slot 7 #24 (vulnerable to misuse); Slot 8 #29 (underspecified); Slot 9 #33 + #34. Convergent: optional unstructured field is worse than no field; better to keep purpose outside ProductSSOT entirely. |
| **B-Q2** | `QUORUM_PLURALITY_CA15BV2Q2-RATIFY` 7/9 ✅ | **CLEARED — RATIFIED-PENDING-CEO.** Restated below for completeness; NOT re-asked at v3. Canonical text: `inferred` + `synthesized` purpose-capture modes DROPPED; only `described` mode accepted (now moot in scope since `product_purpose` field itself is removed — but the discipline carries forward as a canonical rule: *if* purpose ever returns to canonical SSOT in a future CA, only `described` mode is admissible). | (cleared) |
| **B-Q3** | `QUORUM_PLURALITY_CA15BV2Q3-RATIFY` 7/9 ✅ | **CLEARED — RATIFIED-PENDING-CEO.** Restated below; NOT re-asked at v3. Canonical text: placeholder detection (lorem-ipsum, "TBD", etc.) lives in `scripts/lint-product-purpose.mjs` tooling, NOT canonical SSOT. v3 broadens: per the dispatch's removal of dim-extension (A-Q1) + `product_purpose` field (B-Q1), content_quality + accessibility checks ALSO live in tooling, consistent with B-Q3 tooling discipline. | (cleared) |
| **C-Q1** | `PLURALITY_CA15CV2Q1-RATIFY` 6/9 | **CARRY AS-DRAFTED for v3 re-Panel.** Numeric-floor-only loop exit (§7.6 score floor + zero critical + Self-Renewal terminal + LIMITATIONS + Phase B pass). NOTE: the v2 strengthen option (b) "add `product_purpose` non-null as 6th exit condition" is MOOT in v3 (purpose field removed) — dropped from option-set. | Slot 1 + Slot 4 + Slot 5 + Slot 6 + Slot 8 + Slot 9 6/9 RATIFY; Slot 4 #12 (LLM check absence acknowledged). |
| **C-Q2** | `QUORUM_PLURALITY_CA15CV2Q2-RATIFY` 7/9 ✅ | **CLEARED — RATIFIED-PENDING-CEO.** Restated below; NOT re-asked at v3. Canonical text: hardcoded `purpose_fulfillment_score ≥ 0.7` threshold from v1 ELIMINATED entirely. | (cleared) |
| **C-Q3** | `PLURALITY_CA15CV2Q3-RATIFY` 6/9 | **CARRY AS-DRAFTED for v3 re-Panel.** Tiered PURPOSE_DRIFT annotation (minor 20% / major 50% token-change; critical = purpose cleared OR >50% drift; loop never deadlocks). v3 includes the empirical-justification rationale per Slot 7 #25 + Slot 8 #30 objections (token-change thresholds are heuristic-bootstrap; CA-N future revision permitted as drift telemetry accumulates). | Slot 1 + Slot 4 + Slot 6 + Slot 8 + Slot 9 6/9 RATIFY. |
| **D-Q1** | `PLURALITY_REJECT` 5/9 (advisory rejected) | **REVERT §27 to HARD BLOCKING GATE** (v1 form) as v3 PRIMARY position. v2's advisory framing rejected; revert restores conformance-blocking semantics. NOTED ALTERNATIVE: a hybrid (advisory non-critical / blocking critical) is documented as a Panel-electable variant — if Panel prefers the hybrid at v3 re-Panel, it elects via option (b). | Slot 1 #4 + Slot 6 #22 + Slot 8 (REJECT 5/9). |
| **D-Q2** | `PLURALITY_CA15DV2Q2-RATIFY` 5/9 | **CARRY AS-REVISED for v3 re-Panel.** v3 sets scope to **ENTIRE `src/lib/governance/` directory** (concrete, exists now in the working tree; removes the circular-dependency on the not-yet-written `docs/governance/CONFORMANCE_SCOPE.md`). | Slot 1 #4 (CONFORMANCE_SCOPE.md circular dependency objection); Slot 7 #26 (file requires manual updates / brittle); Slot 8 #31 (gameable). The Slot-1 recommendation specifically suggested broader scope. |

**Net v3 effect:**

| Surface | v2 design | v3 design |
|---|---|---|
| §10.1 quality audit | Extended 5→≤7-dim (admin-opt-in dims 6+7) | **UNCHANGED at 5 dims** per ENTRY 015. No extension. content_quality + accessibility live in `scripts/` tooling per B-Q3 disposition. |
| ProductSSOT canonical blocks | 6 + optional free-form `product_purpose` field | **Strictly 6 canonical blocks per CA-10-A.** No `product_purpose` field. No purpose information in ProductSSOT. Purpose, if needed, lives entirely outside SSOT in operator notes. |
| Purpose capture modes | `described` only (inferred/synthesized dropped) | **`described` only — CLEARED via B-Q2.** Carries as a canonical discipline for any future re-introduction; presently moot since `product_purpose` itself is removed. |
| Placeholder detection | Tooling (`scripts/lint-product-purpose.mjs`) | **Tooling — CLEARED via B-Q3.** Same tooling layer also hosts content_quality + accessibility lints per A-Q1 removal. |
| Purpose-Driven Optimization loop exit | Numeric-floor-only (5 conditions) | **Same — numeric-floor-only** (re-Panel for ratification). |
| Hardcoded 0.7 threshold | Eliminated | **Eliminated — CLEARED via C-Q2.** |
| PURPOSE_DRIFT semantics | Tiered annotation (minor/major/critical); never deadlocks | **Same — re-Panel for ratification.** |
| §27 SSOT-Conformance Gate | Advisory only | **REVERTED — HARD BLOCKING GATE per v1 form.** Hybrid (advisory non-critical / blocking critical) noted as Panel-electable alternative. |
| CEO re-sign trigger | Scoped to `docs/governance/CONFORMANCE_SCOPE.md` (not yet written) | **Scoped to ENTIRE `src/lib/governance/` directory** (concrete, exists now). Removes circular dependency. |

---

## §1 — CA-15-A v3 — Multi-Dim NOT extended; tooling-only

### Rationale

W6 v2 re-Panel rejected the §10.1 dim-extension at 6/9 REJECT. Convergent objections (Slot 1 + Slot 2 + Slot 3 + Slot 4 + Slot 5 + Slot 6 + Slot 7 + Slot 8 + Slot 9 — nine of nine engaged slots filed an objection against the extension's structural shape):

- Slot 1 #1: telemetry creates shadow metrics with no canonical interpretation.
- Slot 7 #23: dim 6 Content Quality overlaps with §10.1 UI/UX → double-reporting risk.
- Slot 8 #27 + #28: telemetry-only weakens enforcement; admin-opt-in hides regressions in default-off state.

v3 resolution: **NO §10.1 extension.** §10.1 stays at the 5 canonical dimensions per ENTRY 015 (UI/UX, API, Logic, Business Value, Security Posture). Content quality + accessibility checks relocate to tooling per the B-Q3 discipline already CLEARED at v2 (7/9).

### Canonical text — §10.1 UNCHANGED

```markdown
### §10.1 — Self-Audit Quality Audit Engine (UNCHANGED at 5 canonical dimensions per ENTRY 015)

Canonical: 5 dimensions, each scored 0-100 with confidence 0-100%, ≥95/95
threshold per dimension required for Sprint 5 Step 4 Quality Audit per §19.

1. UI/UX (visual + interactive quality of the build)
2. API (correctness + contract conformance)
3. Logic (business logic correctness)
4. Business Value (does the build accomplish the product's stated goal)
5. Security Posture (OWASP top-10, secrets handling, auth correctness)

**CA-15-A v3 disposition:** the v1/v2 proposals to extend §10.1 to 7
dimensions (adding Content Quality + Accessibility) are REJECTED. §10.1
remains at 5 canonical dimensions per ENTRY 015. Content quality +
accessibility checks live in tooling — `scripts/lint-content-quality.mjs`
+ `scripts/lint-accessibility.mjs` — consistent with the CA-15-B-Q3
tooling discipline cleared at v2 (7/9). These tooling lints surface to
operators at PR-time as warnings; they do NOT contribute to §7.6 score
and they do NOT participate in §10.1 Step 4 Quality Audit verdicts.
```

### Canonical text — §7.6 formula UNCHANGED

```markdown
**§7.6 GTM Readiness score formula (UNCHANGED per ENTRY 015 + CA-16-C-Q4 cleared-8 generalization invariant):**

  score = 100 − (10·crit) − (5·high) − (2·med) − (0.5·low), clamped [0, 100]

content_quality and accessibility findings (from the v3 tooling lints) do
NOT contribute to crit/high/med/low counts. They emit as PR-warnings only.
```

A-Q1 / A-Q2 / A-Q3 are MOOT in v3 — they are not re-asked.

---

## §2 — CA-15-B v3 — No purpose information in ProductSSOT

### Rationale

W6 v2 re-Panel rejected the optional `product_purpose` field at 5/9 REJECT. Convergent objections (Slot 1 #2 atomicity, Slot 2 #7, Slot 3 #8, Slot 4 #13, Slot 5 #17, Slot 6 #20, Slot 7 #24, Slot 8 #29 underspecified, Slot 9 #33 + #34): optional + unstructured + no schema + no atomic-write rule = strictly worse than no field at all (operators have stronger alternatives in plain operator notes).

v3 resolution: **NO purpose information in ProductSSOT.** ProductSSOT stays at exactly 6 canonical blocks per CA-10-A. Purpose statements live entirely outside ProductSSOT — in operator-maintained notes, README files, or whatever operator-process surface the operator prefers. FlowAI does not impose a canonical purpose record.

### Canonical text — ProductSSOT structure UNCHANGED

```markdown
### §7.5 — ProductSSOT canonical blocks (UNCHANGED — 6 blocks per CA-10-A; CA-15-B v3 confirms NO purpose information)

ProductSSOT remains EXACTLY 6 canonical blocks per CA-10-A:

1. `product_registry`
2. `governance_record`
3. `architecture_snapshot`
4. `delta_log`
5. `governance_record_entry`
6. `score_history`

**CA-15-B v3 disposition:** the v1 `purpose_record` block AND the v2
optional `product_purpose` field are BOTH REJECTED. ProductSSOT does not
carry purpose information. Operators may maintain purpose statements in
external surfaces (operator notes, README, internal docs) — these are
NOT canonical FlowAI state.

**B-Q2 cleared-pending (v2 ratified 7/9):** if a future CA re-introduces
purpose information to canonical SSOT, only the `described`
(operator-supplied) mode is admissible. `inferred` (LLM page-content
analysis) and `synthesized` (multi-source merge) modes are PERMANENTLY
forbidden per CA-15-B-Q2 ENTRY-pending. This rule carries forward as a
canonical discipline even though purpose is presently outside SSOT.

**B-Q3 cleared-pending (v2 ratified 7/9):** placeholder detection
(lorem-ipsum, "TBD", etc.) lives in `scripts/lint-product-purpose.mjs`
tooling, NOT canonical SSOT. Per CA-15-A v3 above, this tooling layer
ALSO hosts content_quality + accessibility lints — same tooling
discipline applied across the three lint domains.
```

B-Q1 is MOOT in v3 — not re-asked.

---

## §3 — CA-15-C v3 — Numeric-floor exit + tiered drift + hardcoded-0.7 elimination

### CA-15-C-Q1 — Numeric-floor-only Purpose-Driven Optimization loop exit (carry as-drafted)

**Canonical text — §28-bis numeric-floor-only loop exit:**

```markdown
### §28-bis — Purpose-Driven Optimization Loop (CA-15-C v3 numeric-floor-only exit)

The repeat-until-GTM loop's exit criterion per CA-15-C v3 uses
**numeric-floor-only** semantics — no LLM-judged purpose-fulfillment
check participates in the exit gate.

**Loop exit conditions (ALL must hold):**

1. §7.6 GTM Readiness score ≥ `product_registry.gtm_ready_bar_override`
   (default 75 per CA-13-A v2 pending; ≥95 operator-opt-in).
2. Zero `critical` findings open per CA-14-A canonical + ENTRY 015.
3. Self-Renewal terminal on all `high` findings per CA-14-A + ENTRY 015
   (terminal = Resolved / Documented-with-rationale / Human-gated).
4. LIMITATIONS section published per CA-14-A-Q2 verbatim wording
   (ENTRY 015).
5. Phase B pass per CA-14-A canonical + Agent #21 Phase B charter
   (ENTRY 015).

No LLM-judged purpose-alignment check participates. The v1
`purpose_fulfillment_score ≥ 0.7` threshold is eliminated entirely
(B-Q2 / C-Q2 cleared at v2 — CA-15-C-Q2 ENTRY-pending). The v2 strengthen
variant "add `product_purpose` non-null as 6th exit condition" is MOOT
because `product_purpose` itself is removed at v3 (CA-15-B-Q1 v3).
```

### CA-15-C-Q2 cleared-pending (v2 ratified 7/9) — hardcoded 0.7 eliminated

```markdown
**CA-15-C-Q2 v2 cleared-pending — RATIFIED-PENDING-CEO:**

The hardcoded `purpose_fulfillment_score ≥ 0.7` threshold from CA-15 v1
is ELIMINATED entirely. No purpose-fulfillment-score parameterization
(neither hardcoded nor operator-config knob) exists in canonical SSOT.
```

### CA-15-C-Q3 — Tiered PURPOSE_DRIFT (carry as-drafted; loop never deadlocks)

**Canonical text — §28-bis.1 tiered drift annotation:**

```markdown
### §28-bis.1 — PURPOSE_DRIFT tiered annotation (CA-15-C v3; loop never deadlocks)

PURPOSE_DRIFT detection runs at every §11 Step 4 Quality Audit + every
loop iteration. Three tiers (token-change-delta heuristic):

| Tier | Detection rule | Action | Loop effect |
|---|---|---|---|
| `PURPOSE_DRIFT_MINOR` | ≤20% token-delta between current operator-notes purpose and prior | `governance_record_entry kind:'purpose_drift_annotation.v1' severity:'minor'`; admin dashboard surfaces | Loop CONTINUES; no action required |
| `PURPOSE_DRIFT_MAJOR` | 20–50% token-delta | Append entry severity:'major'; surface to operator at NEXT §11 Step (operator disposes: accept / reject / continue); admin alarm | Loop CONTINUES; operator disposition async |
| `PURPOSE_DRIFT_CRITICAL` | >50% token-delta OR operator-notes purpose cleared to empty after prior non-empty | Append entry severity:'critical'; FREEZE new Self-Renewal fixes; Panel notification per Locked Rule 17; operator+admin must jointly re-approve before fixes resume | Self-Renewal FROZEN for fix-generation; loop iteration CONTINUES (re-crawl, score tally, LIMITATIONS regen still proceed); loop MAY exit on numeric-floor exit conditions even with critical drift annotation open |

**Token-change-delta source:** operator-maintained purpose-notes file
(outside ProductSSOT per CA-15-B v3); diff computed via shingle-based
similarity on the operator-notes text. Thresholds (20% / 50%) are
heuristic-bootstrap per Slot 7 #25 + Slot 8 #30 objections; a future
CA-N may revise once drift-telemetry accumulates empirical evidence.

**Drift NEVER deadlocks the loop.** PURPOSE_DRIFT_CRITICAL freezes
Self-Renewal fix generation but does NOT block other loop activity. Loop
MAY exit on numeric-floor exit conditions (§28-bis above) regardless of
drift annotation state.
```

---

## §4 — CA-15-D v3 — §27 REVERT to HARD BLOCKING GATE + scoped CEO re-sign

### CA-15-D-Q1 — §27 REVERT to hard blocking gate (v1 form restored as v3 primary)

W6 v2 re-Panel rejected the advisory framing at 5/9 REJECT. Convergent objection (Slot 6 #22, Slot 8): advisory-only weakens enforcement; without hard blocking, operators may ignore conformance issues.

v3 PRIMARY position: §27 REVERTS to the v1 hard-blocking-gate form.

**Canonical text — §27 hard blocking gate:**

```markdown
### §27 — SSOT-Conformance Gate (CA-15-D v3 — HARD BLOCKING GATE per v1 form)

At the end of each §11 Six-Step Clearance Protocol run, an SSOT-
Conformance Test runs over the resulting ProductSSOT state +
`governance_record_entry` log. This is a **hard blocking gate** — failure
blocks §11 Step 6 (Deploy/Promote) until conformance is achieved.

**Gate checks (canonical):**

1. ProductSSOT structure validates against the 6 canonical blocks per
   CA-10-A (any 7th block → blocking critical).
2. Each `governance_record_entry` row references a known canonical
   `kind` (validation list maintained in
   `src/lib/governance/CanonicalKinds.ts`).
3. Each `architecture_snapshot.gtm_readiness_score` write has a
   companion `governance_record_entry kind:'gtm_readiness_score'` per
   CA-14-D-Q1 ENTRY 015 atomic-audit-write invariant.
4. Each `delta_log` row references a non-null
   `governance_record_entry.id` (provenance check).

**Gate failure semantics:**

- Any failing check produces a `governance_record_entry
  kind:'ssot_conformance_failure.v1'`.
- §11 Step 6 (Deploy/Promote) BLOCKED until ALL gate checks pass.
- Override requires admin role + audit-log entry per §19 existing
  95/95-override rule.

**NOTED ALTERNATIVE (Panel-electable at v3 re-Panel):** a hybrid form
where the gate is advisory for `medium` / `low`-severity conformance
findings and blocking only for `critical` / `high`-severity findings.
If Panel elects this hybrid at v3 re-Panel (option (b) below), the
canonical text reads:

> "§27 SSOT-Conformance Gate — HYBRID. `critical` / `high`-severity
> findings BLOCK §11 Step 6. `medium` / `low`-severity findings surface
> as advisory + admin dashboard alarm but do not block."

If Panel ratifies the primary hard-blocking form at v3, the hybrid
alternative text is NOT promoted; primary form lands as canonical.
```

### CA-15-D-Q2 — Scoped CEO re-sign (concrete scope: ENTIRE `src/lib/governance/`)

W6 v2 re-Panel verdict was 5/9 RATIFY but objections targeted the not-yet-written `CONFORMANCE_SCOPE.md` (Slot 1 #4 circular dependency, Slot 7 #26 brittle, Slot 8 #31 gameable). The Slot 1 #4 recommendation specifically: drop the documentation-file approach in favor of a concrete code-directory scope.

v3 resolution: scope concrete + existing-in-tree — the **entire `src/lib/governance/` directory**.

**Canonical text — §27.1 scoped CEO re-sign:**

```markdown
### §27.1 — Scoped CEO re-sign (CA-15-D-Q2 v3 — concrete scope `src/lib/governance/`)

CEO sign-off on a product's prior §11 Six-Step Clearance run is
invalidated by a subsequent CA promotion ONLY when the CA explicitly
amends any file under the `src/lib/governance/` directory (the
canonical scope).

**Scope semantics:**

- Scope = the entire `src/lib/governance/` directory tree (recursive).
- A CA that touches ANY file under `src/lib/governance/**` triggers
  `ceo_resign_required: true` in the §18.4 ratified-amendments entry.
- A CA that does NOT touch `src/lib/governance/**` does NOT invalidate
  prior sign-offs — out-of-scope CAs include: canonical-doc-only edits
  (e.g. CANONICAL_REFERENCE.md typo fixes, §18.4 row appends), agent
  registry edits NOT under `src/lib/governance/`, §28 narrative edits.
- The scope is CONCRETE and EXISTS NOW in the working tree (no
  documentation-file dependency; no circular-dependency risk).

**Trigger mechanism:**

- Engineering dispatch adds a CI check that runs at CA-promotion-commit
  time: `git diff --name-only <CA-base> HEAD | grep '^src/lib/governance/'`.
- Non-empty grep → `ceo_resign_required: true` in §18.4 + admin dashboard
  surfaces `ceo_resign_pending` until re-sign lands.
- Empty grep → out-of-scope; no re-sign needed.

**Scope evolution:** if a future CA extends the governance code to a
new directory (e.g. `src/lib/conformance/`), that CA itself amends
`src/lib/governance/` (the CA must touch governance to extend it),
triggering re-sign on the CA that establishes the new directory — and
subsequent CAs in the new directory inherit re-sign via a successor
CA-N that extends the scope rule. This makes scope evolution
self-detecting + audit-trail-preserving.

**Why this scope (not `docs/governance/CONFORMANCE_SCOPE.md` as v2
drafted):** the v2 documentation-file scope had three structural
flaws: (1) circular dependency — editing CONFORMANCE_SCOPE.md itself
might require re-sign (Slot 1 #4); (2) brittle to maintain — file
requires manual update for every CA (Slot 7 #26); (3) gameable — scope
file is editable documentation; consequential governance changes can
be made adjacent to but outside the tracked scope (Slot 8 #31). The v3
concrete-directory scope eliminates all three failure modes.
```

---

## §5 — Cleared-pending carryover (RATIFIED-PENDING-CEO; not re-asked at v3)

Three v2 questions cleared at re-Panel (≥7/9 drafted-(a)). They are documented here for traceability and CEO one-shot ratification at v3-promotion-commit time; they DO NOT re-Panel at v3.

- **CA-15-B-Q2 (7/9 ✅):** `inferred` + `synthesized` purpose-capture modes DROPPED; only `described` (operator-supplied) mode admissible if purpose ever returns to canonical SSOT (presently outside SSOT per v3 B-Q1 removal).
- **CA-15-B-Q3 (7/9 ✅):** placeholder detection moves to `scripts/lint-product-purpose.mjs` tooling, NOT canonical SSOT. v3 broadens scope: content_quality + accessibility checks ALSO live in tooling per CA-15-A v3 removal.
- **CA-15-C-Q2 (7/9 ✅):** hardcoded `purpose_fulfillment_score ≥ 0.7` threshold ELIMINATED entirely from canonical SSOT.

These three promote alongside the v3 ratified questions in a single CA-15 promotion commit (next free CA number per §18.4 — CA-17/CA-18 candidate range depending on intervening promotions).

---

## §6 — v3 Panel Questions (re-Panel; 4 questions only — convergent v3)

v3 question block is intentionally compact — only the questions that still need ratification at v3. The 3 cleared-pending (B-Q2 / B-Q3 / C-Q2) are NOT re-asked. The 2 removals (A-Q1 dim-extension; B-Q1 product_purpose field) are NOT re-asked — the removal is the disposition. A-Q2 + A-Q3 are MOOT (no extension exists to discuss).

### CA-15-C v3 Q1 — Numeric-floor-only loop exit (carry as-drafted)

Does Panel ratify that the Purpose-Driven Optimization loop exits on numeric §7.6 floor + zero critical + Self-Renewal terminal + LIMITATIONS + Phase B pass — NO LLM-judged purpose-alignment check?

- (a) **Ratify v3 as drafted** (5 numeric exit conditions; no LLM check).
- (b) Strengthen — re-introduce LLM-judged purpose-alignment check as a 6th OPTIONAL exit condition gated by an operator-config knob `product_registry.llm_purpose_check_enabled` (default `false` for the proof phase; admin-only opt-in).
- (c) Strengthen — make exit condition #1 stricter: §7.6 score floor moves from "≥`gtm_ready_bar_override`" to "≥`gtm_ready_bar_override` for THREE consecutive iterations" (proves sustained pass, not single-iteration).
- (d) Reject — LLM-judged purpose check is structurally required for a "Purpose-Driven" loop; without it the loop name is misleading. Rename §28-bis to "Numeric-Floor Optimization Loop" and remove "Purpose-Driven" framing entirely.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-C v3 Q3 — Tiered PURPOSE_DRIFT (carry as-drafted; never deadlocks)

Does Panel ratify drift as tiered annotation (minor 20% / major 50% / critical >50%-or-clear) that never deadlocks the loop?

- (a) **Ratify v3 as drafted** (tier thresholds 20% / 50% heuristic-bootstrap; loop never deadlocks; critical freezes Self-Renewal fix-generation only).
- (b) Strengthen empirically — defer concrete thresholds to a successor CA-N once 90 days of drift telemetry are accumulated; v3 ships with a single annotation kind (`purpose_drift_observed.v1`) and no tiering until empirical thresholds are derivable.
- (c) Strengthen tier rules — critical drift ALSO blocks loop exit (not just fix-generation); operator must explicitly re-approve before loop can exit even when numeric-floor conditions hold.
- (d) Reject — drift detection lives in operator-notes tooling outside FlowAI canonical (consistent with CA-15-B v3 removal of purpose from ProductSSOT); FlowAI does not detect drift on operator-external notes.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-D v3 Q1 — §27 REVERT to hard blocking gate (v1 form restored)

Does Panel ratify that §27 reverts to a HARD BLOCKING GATE (v1 form) as primary, with the hybrid (advisory non-critical / blocking critical) noted as alternative?

- (a) **Ratify v3 primary as drafted** (§27 hard blocking gate; failure blocks §11 Step 6 until conformance achieved; admin override per §19 existing 95/95-override rule).
- (b) Ratify the noted hybrid alternative — §27 blocks on `critical`/`high`-severity conformance findings; surfaces `medium`/`low` as advisory + admin dashboard alarm without blocking.
- (c) Strengthen further — §27 hard blocking AND no admin override path (remove the §19-equivalent override; conformance failure cannot be bypassed).
- (d) Reject the revert — preserve v2's advisory framing despite v2 verdict; rationale Panel may supply.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-D v3 Q2 — Scoped CEO re-sign to `src/lib/governance/` (concrete scope)

Does Panel ratify that CEO re-sign is triggered ONLY for CAs touching files under `src/lib/governance/**` (concrete directory; existing in tree; replaces v2 not-yet-written `docs/governance/CONFORMANCE_SCOPE.md`)?

- (a) **Ratify v3 as drafted** (entire `src/lib/governance/` directory is the scope; CI grep at promotion-commit time determines trigger).
- (b) Strengthen broader — scope = `src/lib/governance/**` AND `src/lib/conformance/**` AND any `*.sql` migration files (covers schema-change CAs that affect conformance even if not under governance/).
- (c) Strengthen narrower — scope = ONLY `src/lib/governance/ScoreEvaluator.js` + `src/lib/governance/ClearanceProtocol.ts` + `src/lib/governance/CanonicalKinds.ts` (the three canonical files; reduces over-triggering on cosmetic CAs).
- (d) Reject the v3 scope — restore v2's `docs/governance/CONFORMANCE_SCOPE.md` documentation-file scope despite v2 verdict; rationale Panel may supply.
- (e) INSUFFICIENT_INFORMATION.

---

## §7 — Acceptance criteria for CA-15 v3 ratification

- W6 v3 re-Panel ratification ≥7/engaged drafted-(a) on each of the 4 v3 re-Panel questions.
- Engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6.
- CEO disposition per Locked Rule 13.
- If all 4 v3 questions ratify (a)-clean AND the 3 cleared-pending (B-Q2 / B-Q3 / C-Q2) carry, CA-15 v3 promotes as a single CA cycle (next free CA number).
- The 2 v3 removals (A-Q1 dim-extension removed; B-Q1 product_purpose removed) require no further Panel action — removal is the disposition.
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA15-v3-promotion-<date>.md` per §18.3.
- Cross-CA dependency: v3 §28-bis numeric-floor exit assumes CA-13-A v2 `gtm_ready_bar_override` knob ratifies first (or CA-13-A v2 ratifies concurrently); CA-14-A LIMITATIONS + Phase B per ENTRY 015 already canonical.

---

*End of CA-15 v3 DRAFT. Pending W6 v3 re-Panel (4 questions only) + CEO disposition per CA-n cycle (Rev-2.1 §18). Doc-only; canonical files NOT amended in this commit per CA-n cycle discipline. ENTRY 015 cleared-8 promotion already landed at commit `38774b4`.*
