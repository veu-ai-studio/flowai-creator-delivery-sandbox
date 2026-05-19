# SSOT Amendment Draft — CA-15 (Multi-Dimensional Quality Audit + Purpose Capture + Purpose-Driven Optimization + SSOT-Conformance Gate)

**Status:** DRAFT — pending W6 Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18).
**Author:** W3, 2026-05-18 (late session, post-CA-14 parked).
**Anchor canonical SSOT:** `docs/CANONICAL_REFERENCE.md` (Rev-2.1 + ENTRY 003–010 cumulative; §18.4 ratified-amendments table ends at ENTRY 006).

**Why CA-15 (true next free number, evidence chain):**
- CA-11 — draft only, Panel-reviewed but NOT ratified, NOT in §18.4.
- CA-12 — draft only, 3× NOT_RATIFIED (v1 `5c2324f`, v2 `01bed9d`, v3 `dedd075`), NOT in §18.4.
- CA-13 — draft `81cf144` (75→95 GTM bar + CA-9-Q4 wording reconciliation), Panel-reviewed jointly with CA-14 at `8e185a6` (`docs/panel-consultations/ca13-ca14-joint-ratification-2026-05-18.md` — engagement matrix shows 5 ENGAGED, 4 TANGENTIAL across 10 slots, below the ≥7/10 quorum per §19 + `docs/PANEL_INFRASTRUCTURE.md` §6). PARKED. NOT in §18.4.
- CA-14 — draft `fae9ff3` (Phase B HARD gate + safety invariants + findings-driven prioritization + per-product branch-of-record + atomic-audit-write + CA-13 reconciliation). Joint Panel ratification at `8e185a6` engagement-gated → PARKED. NOT in §18.4.
- CA-15 — NO file exists in `docs/specs/SSOT_AMENDMENT_CA*` as of `def560d` HEAD. Next free number.

**Independence from CA-14 (explicitly required by dispatch):**
- CA-14 amends: §6 (Phase A vs B distinction), §7.6 (Phase B prerequisite gate), §11 Step 5 (Phase B as 5th prerequisite), §7 Output Contract item #6 (5 fix-safety invariants), §10.4 NEW (fix-safety sub-section), §12 mode (iv) (Fork-and-fix safety reference), §7.5.1 NEW (ProductSSOT operational invariants — per-product branch-of-record + seeding + atomic-write), §25 NEW Locked Rule 19 (Phase A vs B don't conflate).
- CA-15 amends: §10 Self-Audit + Agent #8 rubric files (NEW canonical axes), §7.5 ProductSSOT NEW `purpose_record` block, §11 Clearance optimization north-star, §27 NEW SSOT-Conformance Gate sub-section.
- **Zero substantive overlap.** CA-15 ratifies independently per §CA-15-E.

**Lineage:** Rev-2.1 (`9495b26`) → ENTRY 003 → ENTRY 004 (CA-7+CA-8) → ENTRY 005 (CA-9+CA-10) → ENTRY 006 (ACE) → ENTRY 007 → ENTRY 008 → ENTRY 009 (CA-9-Q4 Option (a) LOCKED) → ENTRY 010 (Phase A live) → ENTRY 011 draft (D27–D38 arc, `def560d`) → CA-13 draft (`81cf144`) → CA-14 draft (`fae9ff3`) → CA-13+CA-14 joint Panel parked (`8e185a6`) → D39–D41 Phase B implementation arc (`90210d0` → `ed0d779`) → CEO directive 2026-05-18 (purpose capture + multi-dim audit + SSOT-conformance gate) → this CA-15 draft.

**Four bundled amendments (NET-NEW scope, distinct from CA-14):**
- **CA-15-A** — Multi-Dimensional Quality Audit: 7-axis canonical Quality Audit rubric (redundancy, grammar, syntax, UI/UX, legal, privacy, +extensible "other"). Findings fold into §7.6 alongside Phase A surface + Phase B adversarial. Maps to §10.1 Self-Audit 5-dim engine + Agent #8 (the missing rubric files ARE these 7 axes).
- **CA-15-B** — Purpose capture: every submission's purpose MUST be captured into ProductSSOT `purpose_record` (NEW canonical block). 3 capture modes (described / inferred / synthesized). Placeholder `"<productId> — auto-onboarded by engine"` is explicitly insufficient.
- **CA-15-C** — Purpose-driven optimization: optimization north-star is purpose-fulfillment, NOT a numeric threshold. Cross-references (does NOT resolve) the parked CA-13-A 95-bar.
- **CA-15-D** — End-stage SSOT-conformance gate: FlowAI must be tested against this SSOT (as acceptance spec) before any "complete" claim. NEW canonical §27 sub-section.
- **§CA-15-E** — Independence + cross-references to CA-13/CA-14 (do NOT block this CA on those).

All four amendments below are written in **conformance-testable terms**: every clause has a clear, checkable acceptance criterion. This is deliberate per CEO instruction — the SSOT IS the acceptance spec for the end-stage FlowAI-vs-SSOT conformance test (CA-15-D below).

---

## CA-15-A — Multi-Dimensional Quality Audit (7-axis canonical rubric)

### Rationale

The §10.1 Self-Audit 5-dimension scoring engine (UI/UX, API, Logic, Business Value, Security Posture per Sprint PROTECT-1 Phase 5) currently scores BUILD quality. ENTRY 006's §7.6 GTM Readiness Report scores SURFACE quality (Phase A) via Agent #21 ACE. CA-14-A (parked) extends to interactive ADVERSARIAL quality (Phase B). All three are necessary; none of them captures **content-quality dimensions** that a CEO submitting a URL/product expects FlowAI to review.

A CEO submitting a URL expects FlowAI to flag: text redundancy, grammar errors, syntax issues, UI/UX problems, legal exposure, privacy gaps, plus any other surface-detectable issue the multi-AI panel can identify. These are quality axes that don't fit cleanly into UI/UX (too narrow), API (orthogonal), Logic (orthogonal), Business Value (different meta-axis), or Security Posture (different meta-axis). They also don't fit Phase A surface signals (rendering-correctness, not content-correctness) or Phase B adversarial signals (interactive failure, not content quality).

The Agent #8 charter (§15.1 row 8) says "DORMANT — owns the 5-dimension scoring engine per §10". The "rubric files" that Agent #8 needs (per Wave-1 spec v2 cohort discussions) ARE the canonical multi-dim audit axes. CA-15-A defines them as a 7-axis canonical rubric.

### §10.1 — Self-Audit (amendment — add §10.1.1)

**Add new sub-section §10.1.1 after the existing §10.1 5-dim Self-Audit definition:**

```markdown
### 10.1.1 Multi-Dimensional Quality Audit (CA-15-A canonical)

In addition to the §10.1 5-dim Self-Audit engine (build-quality), every
submitted product/URL/description undergoes a 7-axis Multi-Dimensional
Quality Audit owned by Agent #8 (§15.1 row 8). The 7 canonical axes:

| # | Axis | Purpose | Conformance-test acceptance criterion |
|---:|---|---|---|
| 1 | **Redundancy** | Detect duplicated text blocks, repeated value propositions, restated CTAs, near-duplicate sections. | A test corpus of 10 known-redundant pages yields ≥1 `redundancy.*` finding each; 10 known-clean pages yield 0 redundancy findings (precision ≥95%; recall ≥90%). |
| 2 | **Grammar** | Detect grammatical errors in operator-facing copy (subject-verb agreement, tense consistency, article use, etc.). | Same precision/recall thresholds against a labeled grammar-error corpus. |
| 3 | **Syntax** | Detect surface-text syntax issues (run-on sentences, fragments, malformed punctuation, broken Markdown rendering). | Same. |
| 4 | **UI/UX** | Detect interaction defects beyond the §10.1 build-quality UI/UX dimension — copy clarity, CTA hierarchy, form-field labels, error-message tone, accessibility text content (alt text, aria-labels). | Same. **Distinct from §10.1 UI/UX which scores build-quality** (component correctness, responsive design, etc.); §10.1.1 UI/UX scores content/copy quality. |
| 5 | **Legal** | Detect legal exposure: missing disclaimers, missing terms-of-use/privacy-policy references, unsubstantiated claims, regulatory-exposure phrases (e.g. medical claims without "consult a doctor", financial claims without risk disclosure, employment claims without EEOC compliance text). | Test corpus of 10 known-exposed pages yields ≥1 `legal.*` finding each; same precision/recall thresholds. **Findings are advisory; not legal opinions** per Agent #14 Public Policy escalation policy (§15.1 row 14). |
| 6 | **Privacy** | Detect privacy gaps: PII collection without consent language, third-party tracking without disclosure, cookie banners missing, data-retention statements missing, GDPR/CCPA/POPIA references missing where jurisdiction implied. | Same precision/recall thresholds; jurisdictional inference per §1.1 product market definitions. |
| 7 | **Other** (extensible) | Catch-all axis for issues that don't fit the above 6 but the multi-AI panel flags consistently across runs. Examples: brand-voice inconsistency, dated references (year-stamped content past renewal), broken cross-references between pages, factual contradictions across surfaces. | At least 1 canonical example per category logged in `governance_record_entry` `kind: 'multi_dim_audit_other_example'` per quarter; Panel reviews quarterly to promote frequent "other" categories to numbered axes 8/9/etc. (extensibility mechanism). |

**Findings format:** every Multi-Dim audit finding is shaped identically to
existing §6 / §7.6 findings (per ENTRY 006 detector set line 186), with
additional fields:

- `axis: 'redundancy' | 'grammar' | 'syntax' | 'uiux' | 'legal' | 'privacy' | 'other'`
- `axis_subcategory: string` — free-form, e.g. `'missing-gdpr-cookie-banner'`,
  `'subject-verb-agreement'`, `'unsubstantiated-medical-claim'`.
- `severity: 'critical' | 'high' | 'medium' | 'low'` — same severity scale as
  §6 detectors.
- `evidence`, `reproducer_path`, `recommended_fix` — same payload shape as §6.
- `agent_id: 8` — emitting agent canonical.

**Folding into §7.6:** every Multi-Dim Quality Audit finding is counted by
the §7.6 GTM Readiness scoring formula on EQUAL footing with §6 detectors
and (post-CA-14-A) Phase B findings. Same formula:
`score = 100 − (10·critical) − (5·high) − (2·medium) − (0.5·low)`. No axis
weights; no per-axis adjustments. **Conformance-test acceptance criterion:**
given a product with N Multi-Dim audit findings of mixed severity, the
§7.6 score MUST equal the formula applied to (Phase A findings ∪ Phase B
findings ∪ Multi-Dim findings) — unioned, not segregated.

**Per-axis disable/enable knob (operator-configurable):** `product_registry`
NEW column `multi_dim_audit_axes_enabled` (jsonb default
`{"redundancy":true, "grammar":true, "syntax":true, "uiux":true,
"legal":true, "privacy":true, "other":true}`). Operator may disable
axes per-product (admin role per §13). **Conformance test:** disabling
axis X means findings on axis X are produced + recorded in
`governance_record_entry` for audit, but do NOT count toward §7.6
score. The audit trail captures both the finding AND the
disabled-axis status; operator override is auditable.
```

### §15.1 row 8 — Agent #8 Quality Audit (amendment)

**Modify the §15.1 row 8 status cell to reference CA-15-A:**

```markdown
| 8 | Quality Audit | step-owner | 4 qa_audit | flowai-only | DORMANT — owns the 5-dimension scoring engine per §10.1 (UI/UX, API, Logic, Business Value, Security Posture). **PLUS per CA-15-A: owns the 7-axis Multi-Dimensional Quality Audit (§10.1.1 — redundancy, grammar, syntax, UI/UX-content, legal, privacy, +extensible "other").** The Multi-Dim audit "rubric files" referenced in Wave-1 spec v2 cohort discussions ARE these 7 axes. Charter expansion canonical post-CA-15-A ratification. |
```

### §9 — Pipeline Step 4 (qa_audit) — clarification

**Add a clarifying note to §9 Step 4 row:**

```markdown
| 4 | qa_audit | Quality Audit | **5-dimension scoring** (UI/UX, API, Logic, Business Value, Security Posture per §10.1). 95/95 threshold per dimension. **PLUS post-CA-15-A: 7-axis Multi-Dimensional Quality Audit (§10.1.1) — findings folded into §7.6 GTM Readiness scoring.** |
```

---

## CA-15-B — Purpose Capture (canonical ProductSSOT `purpose_record` block)

### Rationale

Self-Renewal Executor optimizes toward a §7.6 score. But §7.6 measures surface/adversarial/content quality of the CURRENT product — it does NOT measure how well the current product fulfills the operator's INTENT. A product can score 95+ on §7.6 while failing to do the thing the operator built it for; the score measures rendering correctness, not purpose fulfillment.

CEO directive (2026-05-18): every submission MUST capture purpose into ProductSSOT before any optimization cycle runs. The placeholder text `"<productId> — auto-onboarded by engine"` currently used by the generic engine onboarding path (commit `c430f0a` D40 — registry-driven onboarding + single generic runner) is explicitly insufficient — it's a slot-holder, not a purpose statement.

Three canonical capture modes — based on how the product entered FlowAI:

1. **Described** (Describe&Build path) — operator submits a product description in natural language. Purpose captured directly from the operator's text.
2. **Inferred** (Clone&Improve path) — operator submits a URL of an existing product. Purpose captured by ACE Phase A crawl + LLM inference from page content + market-definition cross-reference per §1.1.
3. **Synthesized** (Multi-URL / multi-source path) — operator submits 2+ URLs or 1 URL + description. Purpose captured by LLM synthesis across all inputs.

### §7.5 — ProductSSOT entity (amendment — add 7th canonical block `purpose_record`)

**Modify §7.5 to expand the 6 canonical blocks to 7 by adding `purpose_record`:**

```markdown
### 7.5 ProductSSOT entity (amended per CA-15-B — 7 canonical blocks)

The ProductSSOT row has SEVEN canonical jsonb blocks (was 6 prior to CA-15-B):
identity_block, build_brief, architecture_snapshot, delta_log,
governance_record, annotations + overrides, **purpose_record (NEW per
CA-15-B)**.

#### purpose_record canonical schema (CA-15-B):

```json
{
  "purpose_record": {
    "purpose_text": string,             // canonical operator-facing purpose statement
    "purpose_normalized": string,       // LLM-normalized canonical form (deterministic against re-runs)
    "capture_mode": "described" | "inferred" | "synthesized",
    "capture_inputs": [
      {
        "kind": "operator_description" | "url_crawl" | "multi_source",
        "value": string,                // operator-supplied text, OR crawled URL, OR concatenated inputs
        "captured_at": ISO8601,
        "captured_from": string          // commit hash | crawl runId | dispatch id
      }
    ],
    "market_definition_link": {
      "product_id": string,
      "ssot_section": "§1.1",
      "verified_at": ISO8601           // last time purpose was cross-checked against §1.1 market definition
    },
    "fulfillment_signals": [             // populated by Self-Renewal Executor over time; what evidence supports purpose-fulfillment
      {
        "signal_kind": "crawl_finding_resolved" | "phase_b_pass" | "audit_finding_resolved" | "operator_acceptance",
        "signal_runId": string,
        "signal_at": ISO8601,
        "fulfillment_delta": number    // -1.0 to 1.0; positive = closer to purpose; negative = drift
      }
    ],
    "version": integer,                  // monotonically increases; CAS-protected via §7.5.1 atomic-write per CA-14-D
    "last_verified_by_operator_at": ISO8601 | null
  }
}
```

**CONFORMANCE-TEST ACCEPTANCE CRITERIA (CA-15-B canonical):**

CB-1. **Purpose-record presence on cycle start.** Self-Renewal Executor
   MUST refuse to start any optimization cycle against a product whose
   `purpose_record.purpose_text` is missing OR matches the forbidden
   placeholder pattern `"^<.+> — auto-onboarded by engine$"`. Test:
   pre-seed a product with the placeholder; invoke the orchestrator;
   assert the cycle aborts with error
   `agent.product_ssot.purpose_record_insufficient.v1` (added to
   Cluster D Deferred set per CA-15-B); operator notified.

CB-2. **Capture-mode validity.** `purpose_record.capture_mode` MUST be
   exactly one of the 3 enum values. Test: writing a 4th value rejected
   at schema-validation boundary.

CB-3. **Capture-inputs non-empty.** `purpose_record.capture_inputs[]`
   MUST have ≥1 entry. Test: empty array rejected at schema-validation.

CB-4. **Market-definition link mandatory.** `purpose_record.market_definition_link`
   MUST resolve to a §1.1 product row in `product_registry.market_definition`.
   Test: missing or stale market-definition link blocks cycle start with
   `agent.product_ssot.market_link_missing.v1`.

CB-5. **Version monotonicity.** Every write to `purpose_record` MUST
   increment `version` per the §7.5.1 atomic-write pattern (CAS).
   Test: concurrent purpose updates produce a strictly increasing
   version sequence; no two writes share a version number.

CB-6. **Placeholder rejection at engine onboarding.** The generic engine
   onboarding path (per `c430f0a` D40) MUST NOT emit the
   `"<productId> — auto-onboarded by engine"` placeholder as
   `purpose_text`. Test: invoke the onboarding path against a fresh
   productId; assert `purpose_text` is either the operator's description
   (described mode), the LLM-inferred purpose (inferred mode), or the
   synthesized purpose (synthesized mode) — never the placeholder.
```

### §11 Step 1 — Provider Onboarding (clarification)

**Modify §11 Step 1 row to reference purpose capture:**

```markdown
| 1 | Governance Audit | "Governance Audit" | All four Self-Governance components green; 95/95 threshold met on every dimension. **PLUS per CA-15-B: ProductSSOT `purpose_record` block present, populated per §7.5 schema, conformance-tests CB-1 through CB-6 passing.** Cycle refuses to start if purpose_record is missing or placeholder. |
```

---

## CA-15-C — Purpose-Driven Optimization (north-star = purpose-fulfillment, not numeric threshold)

### Rationale

The Self-Renewal Executor's repeat-until-GTM loop currently targets the §7.6 score band threshold (per CA-13-A: ≥95; per ENTRY 006: ≥75 — see CA-13-A parking status). This is a NECESSARY but NOT SUFFICIENT optimization target. A product can hit ≥95 §7.6 while still failing to fulfill its captured purpose (e.g. a chatbot that renders perfectly but answers off-topic; an e-commerce flow that loads without errors but doesn't actually complete a purchase).

CEO directive (2026-05-18): the engine's optimization north-star is **purpose-fulfillment** as captured in ProductSSOT `purpose_record` (per CA-15-B). The §7.6 score is a **floor**, not a ceiling; once §7.6 clears its threshold, the orchestrator's "definition of done" pivots from numeric-threshold satisfaction to purpose-fulfillment evidence.

This amendment does NOT resolve the parked CA-13-A 95-bar question. It cross-references it: regardless of where the §7.6 floor lands (ENTRY 006's ≥75 or CA-13-A's ≥95 or some other Panel-ratified value), the post-floor optimization is purpose-driven. CA-15-C and CA-13-A are independent; both can ratify; both can fail to ratify; this CA does not bind the parked Panel session.

### §7 — Output Contract (amendment — add item #7)

**Add NEW §7 Output Contract item #7 after CA-14-B's proposed item #6 (or after the current §7 item #5 if CA-14 remains parked):**

```markdown
7. **Purpose-fulfillment optimization north-star (CA-15-C canonical).**
   The orchestrator's repeat-until-GTM loop has TWO completion criteria,
   evaluated in order:

   a. **Floor — §7.6 score threshold.** The §7.6 score MUST clear the
      canonical band threshold (per ENTRY 006: ≥75; per pending CA-13-A:
      ≥95 — CA-15-C cross-references CA-13-A but does NOT resolve it).
      Cycle does not exit on §7.6 alone.

   b. **North-star — purpose-fulfillment evidence.** AFTER the §7.6
      floor clears, the orchestrator MUST verify purpose-fulfillment
      against ProductSSOT `purpose_record` (per CA-15-B) before exiting.
      Verification produces a `purpose_fulfillment_score` in [0.0, 1.0]:

      ```
      purpose_fulfillment_score = sum(positive fulfillment_deltas in last N cycles)
                                / max(1, count(non-zero fulfillment_deltas))
      ```

      Where N is the number of cycles since `purpose_record` was last
      verified by operator. Threshold: `purpose_fulfillment_score ≥ 0.7`
      (operator-configurable per `product_registry.purpose_fulfillment_threshold`
      jsonb column, bounds `[0.5, 1.0]`).

   c. **Exit conditions:**
      - Floor cleared + north-star cleared → exit `PURPOSE_FULFILLED`.
        Operator-facing report cites both the §7.6 score AND the
        purpose-fulfillment evidence trail.
      - Floor cleared + north-star failed after M iterations (default 10;
        operator-configurable) → exit `PURPOSE_DRIFT`. Operator-facing
        report cites the §7.6 score AS WELL AS the purpose-drift evidence;
        operator decides whether to (i) lower fulfillment threshold,
        (ii) revise `purpose_record`, or (iii) accept drift with explicit
        sign-off.
      - Floor not cleared → exit per existing rules (`NO_IMPROVEMENT` per
        CA-14-B canonical guarantee, OR `GTM_NOT_ACHIEVED` per ENTRY 010
        repeat-until-GTM semantics).

   **Conformance-test acceptance criteria:**

   CC-1. **Floor-first ordering.** Mock a product with §7.6 score 100 and
      `purpose_fulfillment_score` 0.0; assert orchestrator does NOT exit
      `PURPOSE_FULFILLED` — north-star evaluation must produce evidence.
   CC-2. **North-star evaluation requires fulfillment-signals.** Mock a
      product with §7.6 = 100 and empty `purpose_record.fulfillment_signals`;
      assert orchestrator runs at least one Self-Renewal cycle to produce
      fulfillment evidence before considering exit.
   CC-3. **Operator threshold override.** Operator sets
      `product_registry.purpose_fulfillment_threshold = 0.5`; orchestrator
      uses 0.5 (not 0.7 default); out-of-bounds value 0.4 clamped to 0.5
      with admin notification.
   CC-4. **PURPOSE_DRIFT exit honored.** Mock a product hitting §7.6
      threshold but failing north-star for M=10 cycles; assert
      orchestrator exits `PURPOSE_DRIFT` (not `PURPOSE_FULFILLED`) with
      drift evidence in the operator-facing report.
```

### §11 Step 5 — Clearance (clarification)

**Add a clarifying note to §11 Step 5 row (alongside or after any CA-14-A amendment):**

```markdown
| 5 | Demo Readiness | "Demo" | ... existing prerequisites + (per CA-14-A: Phase B pass; per CA-15-C: `purpose_fulfillment_score ≥ purpose_fulfillment_threshold`; per CA-15-B: `purpose_record` present + valid). **`PURPOSE_DRIFT` exit blocks Step 5 unless operator explicitly signs off on drift with audit-logged rationale.** |
```

### Locked Rule 3 (clarification — no edit)

**§25 Locked Rule 3 currently:** "Three complementary governance mechanisms (95/95 + 6-step Clearance + Monitor 0–50) must all pass."

**No edit required.** CA-15-C ADDS a fourth axis (purpose-fulfillment) within the existing §11 Clearance step machinery; it does not violate Locked Rule 3. Locked Rule 3 says "must all pass"; CA-15-C tightens what "pass" means at Step 5.

---

## CA-15-D — End-Stage SSOT-Conformance Gate

### Rationale

The SSOT (`docs/CANONICAL_REFERENCE.md` Rev-2.1 + cumulative ENTRY 003+ amendments) IS the canonical acceptance specification for FlowAI itself. As capabilities (Phase B, Multi-Dim audit, purpose-driven optimization, Self-Renewal safety invariants) accumulate, the gap between "FlowAI is shipped" and "FlowAI conforms to its own SSOT" widens. The SSOT specifies behavior; the implementation may match it, partially match it, or diverge silently (Locked Rule 1 anti-drift hazard).

CEO directive (2026-05-18): FlowAI MUST be tested against the SSOT before any "complete" claim. This is a NEW canonical sub-section §27 (the canonical text currently ends at §26 CURRENT PHASE STATUS).

### §27 — NEW SSOT-Conformance Gate

**Add NEW §27 sub-section to `docs/CANONICAL_REFERENCE.md`:**

```markdown
## 27. SSOT-CONFORMANCE GATE (CA-15-D canonical)

The SSOT is FlowAI's acceptance specification. Every canonical requirement
in this document is a conformance assertion that the running FlowAI build
MUST satisfy. CA-15-D establishes the conformance gate as a canonical
discipline rather than an aspirational goal.

### 27.1 What "complete" means (definition)

FlowAI is **complete** when:

a. Every conformance-test acceptance criterion in this SSOT has a
   corresponding automated test in `src/lib/conformance/__tests__/` (or
   equivalent canonical test root).
b. All conformance tests pass green against the running build.
c. The conformance report (per §27.3) is published in the operator-facing
   `/architecture` surface AND the canonical `governance_record_entry`
   with `kind: 'ssot_conformance_report.v1'`.
d. The CEO sign-off envelope (per §27.4) is countersigned.

Until all four conditions are met, FlowAI is **provisional**, not complete.
Operator-facing claims of completeness in violation of §27.1 are SSOT
non-conformant.

### 27.2 Conformance-test inventory

The conformance-test inventory is canonical and maintained alongside this
SSOT. Each conformance test is identified by:

- **Source SSOT section** — e.g. "§7.6 conformance test 4" or "CA-15-A CB-3".
- **Test identifier** — e.g. `conformance.ssot_7_6_4` / `conformance.ca15a_cb3`.
- **Test location** — `src/lib/conformance/__tests__/<id>.test.js` or equivalent.
- **Pass/fail status** — last-run timestamp + result.

CA-15-D inaugurates the inventory with the conformance tests already
embedded throughout this SSOT (per ENTRY 005 / ENTRY 006 / CA-13 / CA-14
/ CA-15 acceptance criteria sub-sections). Engineering dispatch
populates the test files; this CA canonizes the REQUIREMENT that they
exist.

### 27.3 Conformance report (canonical envelope)

The conformance report is a structured artifact published at each
`/architecture` refresh + every CEO sign-off cycle:

```json
{
  "kind": "ssot_conformance_report.v1",
  "ssot_revision": string,          // e.g. "Rev-2.1 + ENTRY 010 + CA-15-D pending"
  "ssot_commit_hash": string,       // hash of CANONICAL_REFERENCE.md at report time
  "report_at": ISO8601,
  "build_under_test": {
    "branch": string,
    "commit": string,
    "test_run_at": ISO8601
  },
  "conformance_summary": {
    "total_assertions": integer,
    "passing": integer,
    "failing": integer,
    "untested": integer            // assertions with no automated test yet
  },
  "failing_assertions": [
    {
      "source_section": string,    // e.g. "CA-15-A axis-3 syntax precision threshold"
      "test_id": string,
      "failure_reason": string,
      "evidence_path": string      // link to test output / log / governance entry
    }
  ],
  "untested_assertions": [
    {
      "source_section": string,
      "reason_no_test": string     // e.g. "needs operator-attested fixture set"
    }
  ],
  "operator_complete_claim_eligibility": boolean,   // true iff all 4 §27.1 conditions met
  "drift_warnings": [              // canonical-vs-code drift surfaced per Locked Rule 1
    {
      "section": string,
      "drift_kind": "ssot_says_more_than_code" | "code_says_more_than_ssot",
      "detail": string
    }
  ]
}
```

### 27.4 CEO sign-off envelope (canonical)

CEO sign-off on `operator_complete_claim_eligibility: true` is recorded
as `governance_record_entry` with:

```json
{
  "kind": "ssot_complete_signoff.v1",
  "signed_at": ISO8601,
  "signed_by": "ceo",
  "report_ref": string,            // ssot_conformance_report.v1 entry ref
  "rationale": string,             // free-form CEO statement
  "next_review_at": ISO8601        // canonical next conformance-cycle date
}
```

CEO sign-off does NOT permanently certify FlowAI as complete. Every
canonical SSOT amendment (CA-N promotion) invalidates the prior sign-off
until the next conformance report passes; this is the canonical drift-
prevention mechanism. Sign-off cycles repeat on every CA promotion + at
least monthly per Locked Rule 16 (continuous marketplace intelligence
cadence applies analogously to SSOT-conformance cadence).

### 27.5 Conformance-test acceptance criteria (CA-15-D itself)

CD-1. **Conformance directory exists.** `src/lib/conformance/__tests__/`
   (or canonical equivalent declared in engineering dispatch) MUST exist
   with at least one test file by §27.1 conditions evaluation time.
CD-2. **Report envelope canonical.** Every emitted `ssot_conformance_report.v1`
   payload MUST validate against the §27.3 schema; schema validation
   rejects malformed reports.
CD-3. **Drift surfaced.** When canonical text references a code element
   that does not exist OR code references a canonical section that does
   not exist, the report MUST list it in `drift_warnings[]`. Test: stub
   a deliberate canonical-vs-code mismatch; assert the conformance report
   emits the matching `drift_warnings` entry.
CD-4. **CEO sign-off invalidation on CA promotion.** Promoting a CA-N
   amendment MUST invalidate prior `ssot_complete_signoff.v1` records
   (next conformance cycle required). Test: insert a sign-off; promote
   a synthetic CA; assert sign-off marked invalidated in the next
   conformance report.
CD-5. **Operator-facing surface.** The conformance report is rendered
   at `/architecture` (per §16) — operator sees current pass/fail/
   untested counts + failing-assertion list + CEO sign-off status.
```

---

## §CA-15-E — Independence + cross-references

### Independence from CA-14

CA-15 amends DIFFERENT sub-sections than CA-14:

| Cluster | CA-14 amends | CA-15 amends |
|---|---|---|
| §6 / §7.6 detector scope | Phase A vs B distinction (§6.10); Phase B prerequisite at §7.6 → Step 5 gate | (no edit — folds CA-15-A findings into existing §7.6 formula on equal footing) |
| §7 Output Contract | NEW item #6 (5 safety invariants) | NEW item #7 (purpose-fulfillment north-star) |
| §10 Self-Governance | NEW §10.4 (fix-safety sub-section) | NEW §10.1.1 (7-axis Multi-Dim Quality Audit) |
| §7.5 ProductSSOT | NEW §7.5.1 (operational invariants — branch + seed + atomic-write) | NEW 7th canonical block `purpose_record` |
| §11 Clearance | Step 5 prerequisite extension (Phase B = 5th prereq) | Step 5 prerequisite extension (purpose-fulfillment); Step 1 prerequisite (purpose_record present) |
| §12 Remediation | mode (iv) Fork-and-fix safety reference | (no edit) |
| §15.1 | (no edit) | row 8 Agent #8 charter expansion (Multi-Dim audit owner) |
| §25 Locked Rules | NEW Rule 19 (Phase A vs B) | (no new Locked Rule; CA-15-D introduces §27 instead) |
| §27 NEW | (no edit) | NEW §27 SSOT-Conformance Gate |

**Zero substantive overlap.** CA-15 can ratify independently of CA-14's
parked status. If CA-14 ratifies later, the two compose cleanly (Step 5
gate accumulates Phase B prerequisite + purpose-fulfillment prerequisite
+ Multi-Dim findings folded into §7.6).

### Cross-references to CA-13 (do NOT resolve)

- CA-15-C explicitly notes the parked CA-13-A 95-bar question and STATES that CA-15-C does not resolve it. Whatever Panel ratifies as the §7.6 floor (ENTRY 006's ≥75 or CA-13-A's ≥95 or other), CA-15-C's purpose-driven optimization applies post-floor.
- CA-15-B cross-references §1.1 PERMANENT market definitions (commit `c49f074`, migration `0015_product_market_definitions.sql`) but does NOT touch them.
- CA-15-D references the §27 SSOT-Conformance Gate as the canonical end-stage discipline; this is NEW scope, not a CA-13 or CA-14 reconciliation.

### Joint W6 Panel session — RECOMMENDED but NOT REQUIRED

W6 may ratify CA-15 in a STANDALONE Panel session (no need to wait for CA-13 / CA-14 to clear the parked status). If Panel chooses to run a joint session covering CA-13 + CA-14 + CA-15, sub-amendments ratify independently per §18.4 entry rules.

---

## Panel Questions for W6 (Locked Rule 17 — mandatory pre-CEO Panel review)

**Eleven Panel questions total: 3 for CA-15-A, 3 for CA-15-B, 3 for CA-15-C, 2 for CA-15-D.** All questions use the 4-options + INSUFFICIENT pattern per prior CA drafts.

### CA-15-A Panel Questions (3)

**CA-15-A-Q1 — 7-axis canonical rubric ratification.**
Should §10.1.1 Multi-Dimensional Quality Audit adopt exactly the 7 axes drafted (redundancy, grammar, syntax, UI/UX-content, legal, privacy, +extensible "other")?

- (a) Ratify all 7 axes as drafted.
- (b) Ratify 6 axes; drop the extensible "other" — require all axes to be numbered/named explicitly to prevent scope creep.
- (c) Ratify with expansion — add additional axes (e.g. brand-voice, accessibility-deep, performance-content-weight) before promotion.
- (d) Ratify with contraction — drop one of legal/privacy (specify) — Agent #14 Public Policy already covers regulatory; redundant.
- (e) INSUFFICIENT_INFORMATION.

**CA-15-A-Q2 — Folding into §7.6 (equal footing).**
CA-15-A folds Multi-Dim findings into §7.6 on EQUAL footing with §6 detectors + Phase B findings — same formula, no axis weights. Right approach?

- (a) Ratify equal-footing fold as drafted — single unified §7.6 score regardless of finding source.
- (b) Ratify with per-axis weights — Multi-Dim axes get configurable weights in the §7.6 formula (admin-only per-product).
- (c) Reject equal-footing — Multi-Dim findings produce a SEPARATE score (e.g. §7.7 Multi-Dim Quality Score) alongside §7.6; both must pass at Step 5.
- (d) Hybrid — high-severity Multi-Dim findings fold into §7.6; low/medium produce a separate axis-summary report without affecting §7.6 score.
- (e) INSUFFICIENT_INFORMATION.

**CA-15-A-Q3 — Per-axis disable/enable knob.**
CA-15-A specifies operator-configurable per-axis disable via `product_registry.multi_dim_audit_axes_enabled`. Right scope?

- (a) Ratify as drafted — operator (admin role) may disable any axis per product.
- (b) Ratify with bounded scope — operator may disable only `redundancy` / `grammar` / `syntax` / `other`; legal + privacy + UI/UX-content are MANDATORY.
- (c) Reject disable mechanism — all 7 axes are always-on; operator may not opt out.
- (d) Require Panel sign-off per disable — admin disables surface to W6 quarterly for review.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-B Panel Questions (3)

**CA-15-B-Q1 — `purpose_record` as a 7th canonical block.**
Should §7.5 ProductSSOT be expanded to 7 canonical blocks (adding `purpose_record`)?

- (a) Ratify as drafted — 7 canonical blocks.
- (b) Ratify with placement — put `purpose_record` inside `identity_block` rather than as a new top-level block.
- (c) Ratify with naming — use `intent_record` or `mission_record` rather than `purpose_record` (specify preferred name).
- (d) Reject — purpose belongs in `build_brief`, not a new block.
- (e) INSUFFICIENT_INFORMATION.

**CA-15-B-Q2 — 3 canonical capture modes.**
CA-15-B specifies 3 capture modes (described / inferred / synthesized). Right enumeration?

- (a) Ratify all 3 as drafted.
- (b) Ratify 4 modes — add `imported` mode for explicit JSON manifest import per CA-10-E.3 portability.
- (c) Ratify 2 modes — collapse `inferred` and `synthesized` into a single `derived` mode.
- (d) Reject mode enumeration — `capture_mode` should be free-form to accommodate future onboarding paths.
- (e) INSUFFICIENT_INFORMATION.

**CA-15-B-Q3 — Placeholder rejection regex.**
CA-15-B rejects `"^<.+> — auto-onboarded by engine$"` as insufficient. Right regex / approach?

- (a) Ratify regex as drafted — exact pattern match.
- (b) Ratify with expanded regex covering common placeholders (e.g. "TODO", "lorem ipsum", "untitled product").
- (c) Reject regex approach — use LLM-classification ("does this look like a placeholder?") rather than regex.
- (d) Reject placeholder check entirely — operator's submitted text is canonical regardless of content; Engine should never reject.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-C Panel Questions (3)

**CA-15-C-Q1 — Floor + north-star two-step exit ratification.**
Should the orchestrator have TWO completion criteria (floor first, then purpose-fulfillment north-star)?

- (a) Ratify two-step as drafted.
- (b) Reject — single criterion (§7.6 floor only); CA-13-A handles the threshold question.
- (c) Reverse order — purpose-fulfillment first, §7.6 as secondary verification.
- (d) Three-step — add a third criterion (e.g. §10.1 5-dim Self-Audit independently must clear before purpose evaluation).
- (e) INSUFFICIENT_INFORMATION.

**CA-15-C-Q2 — `purpose_fulfillment_score` default threshold 0.7.**
Right default + bounds?

- (a) Ratify 0.7 default with [0.5, 1.0] bounds as drafted.
- (b) Ratify with stricter default 0.85 — fulfillment is the north-star; bar should be high.
- (c) Ratify with looser default 0.6 — early-stage products need room.
- (d) Per-product market-definition-derived default — high-stakes markets get 0.85 default; consumer get 0.6.
- (e) INSUFFICIENT_INFORMATION.

**CA-15-C-Q3 — `PURPOSE_DRIFT` exit semantics.**
After M=10 iterations without north-star clearance, orchestrator exits `PURPOSE_DRIFT`. Right escape valve?

- (a) Ratify M=10 as drafted with operator-override options drafted.
- (b) Ratify with stricter M=5 — fail fast on drift.
- (c) Ratify with looser M=20 — allow more remediation cycles before drift declared.
- (d) Reject fixed M — orchestrator continues indefinitely until operator manually stops OR purpose-fulfillment clears.
- (e) INSUFFICIENT_INFORMATION.

### CA-15-D Panel Questions (2)

**CA-15-D-Q1 — §27 SSOT-Conformance Gate ratification.**
Should the SSOT formally specify itself as the acceptance spec via NEW §27 (the conformance gate with 4 completion conditions + report envelope + CEO sign-off invalidation on CA promotion)?

- (a) Ratify §27 as drafted in full.
- (b) Ratify with simplification — keep §27.1 (definition) + §27.5 (conformance criteria); drop §27.2 (test inventory) + §27.4 (CEO sign-off) as engineering-dispatch territory.
- (c) Ratify with deferral — §27 lands but `operator_complete_claim_eligibility` evaluation deferred until N% of conformance tests exist.
- (d) Reject — SSOT-conformance is engineering responsibility; canonical SSOT should describe behavior not test it.
- (e) INSUFFICIENT_INFORMATION.

**CA-15-D-Q2 — CEO sign-off invalidation on every CA promotion.**
Every CA-N promotion invalidates prior `ssot_complete_signoff.v1`. Right cadence?

- (a) Ratify as drafted — every CA promotion invalidates.
- (b) Ratify with severity-tiering — only substantive CA amendments (those amending behavior-modifying sections) invalidate; cosmetic/text-only CAs don't.
- (c) Ratify with monthly fallback only — CA promotion does NOT auto-invalidate; sign-off is valid for the canonical 30-day cycle regardless.
- (d) Reject auto-invalidation — sign-off is permanent; explicit CEO revocation required.
- (e) INSUFFICIENT_INFORMATION.

---

## Acceptance criteria for CA-15 ratification

- W6 ratification ≥7/10 ENGAGED on each of the 11 Panel questions above.
- Engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6.
- CEO disposition per Locked Rule 13.
- If all 11 ratify (a)-clean, CA-15 promotes as a single CA cycle covering all 4 sub-amendments.
- Per §CA-15-E independence rules, CA-15 can ratify EVEN IF CA-13 + CA-14 remain parked.
- If Panel splits per sub-amendment, ratified halves promote independently per §18.4 entry rules.
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA15-promotion-<date>.md` per §18.3.

---

*End of CA-15 draft. Pending W6 Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18). Doc-only; canonical files NOT amended in this commit per CA-n cycle discipline.*
