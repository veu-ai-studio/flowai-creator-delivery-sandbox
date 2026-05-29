# SSOT Amendment Draft — CA-16 v2 (Proactive Recs scoped + §29 numbering deferred + Multi-Format detection tightened)

**Status:** DRAFT v2 — applies W6 quorum-fix REVISE directions verbatim (`docs/panel-consultations/ca-16-quorum-fix-rerun-2026-05-19.md`, 2/11 cleared, 9/10 engaged, 31 distinct objections). Pending W6 re-Panel.
**Author:** W3, 2026-05-19.
**Lineage:** CA-16 v1 (`908f340` Proactive Recommendations + Redesign/Build Environment §29 + Multi-Format Targets §17) → joint Panel `8e185a6` engagement-gated → W6 quorum-fix rerun `cc14a8f` (2/11 cleared) → CEO REVISE directions (this dispatch) → v2 draft.

**v2 size discipline:** ≤35K chars per proven engagement recipe. Current file ~26K chars; question block kept inline.

**Cleared-8 ENTRY 015 carryover:** CA-16-B-Q3 (RB-7 admin-only final approval) + CA-16-C-Q4 (§7.6 score formula generalization invariant) cleared at rerun (7/9 + 8/9). These are documented as **RATIFIED-PENDING-CEO in `CLEARED8_PROMOTION_PACKAGE_DRAFT.md`**; per CEO dispatch they DO NOT re-open at v2 re-Panel — they are restated below for traceability only, NOT re-questioned.

---

## v2 changelog (per-Q REVISE vs v1)

| Q | v1 verdict (rerun) | v2 change applied | Driving Panel slot(s) |
|---|---|---|---|
| **A-Q1** | `PLURALITY_CA16AQ1-DEFER` 3/9 | **DEFER rec-schema + ADD fields.** Full canonical rec-schema (PA-1..PA-6 invariants) DEFERRED to engineering dispatch. v2 specifies only the MINIMAL canonical envelope (kind, purpose-link OPTIONAL not mandatory, cost field added, rollback field added) + 2 NEW fields per cost/rollback Panel concerns. Detailed schema lives in engineering spec, not §7. | Slot 1 (#1 unbounded gen + #2 circular dep + #3 no rollback), Slot 6 (#14 cost), Slot 9 (#26 rollback) |
| **A-Q2** | `SPLIT CA16AQ2-LATER` 4/9 | **REMOVE recommendations from §11 Clearance entirely.** v1's §11.5 Step 1.5 (Proactive Rec Review) is ELIMINATED. Recommendations remain a side-channel surface; they DO NOT participate in §11 Six-Step Clearance flow. | Slot 6 (#15 Step 1.5 timing unclear), Slot 10 (#30 non-blocking overhead) |
| **A-Q3** | `PLURALITY_CA16AQ3-RATIFY` 6/9 (below quorum) | Retain v1 disposition lifecycle wording (accepted/rejected/deferred); re-Panel at v2. | (no REVISE direction) |
| **A-Q4** | `PLURALITY_CA16AQ4-CONFIG` 5/9 | **PER-PRODUCT defer-window**. Defer-window for `deferred` recommendations becomes a per-product operator-config knob `product_registry.recommendation_defer_window_days` (default 14; bounds [1, 365]; admin-configurable). v1's fixed 14-day window across all products dropped. | Slot 5 (#13 unclear criteria), Slot 8 (#23 disposition suppression irreversible) |
| **B-Q1** | `PLURALITY_CA16BQ1-DEFER` 4/9 | **§29 NUMBERING DEFERRED.** Redesign/Build Environment placement (§29 vs §30 vs another section) deferred to engineering dispatch. v2 canonical text refers to the surface as "Redesign/Build Environment" without committing to a specific section number; the section number is a §18.4 entry-time decision, not a v2 canonical commitment. | Slot 9 (#26 rollback), Slot 7 (#20 scope creep), Slot 8 (#24 underspecified) |
| **B-Q2** | `PLURALITY_CA16BQ2-RATIFY` 6/9 (below quorum) | Retain v1 "operator-steerable rebuild" wording; re-Panel at v2. | (no REVISE direction) |
| **B-Q3** | `QUORUM_PLURALITY_CA16BQ3-RATIFY` 7/9 ✅ | **CLEARED at rerun. Mark RATIFIED-PENDING-CEO; DOES NOT re-open at v2 re-Panel.** Final wording per CLEARED8_PROMOTION_PACKAGE_DRAFT.md (§11.7 admin-only Redesign/Build final approval gate; RB-7 conformance). Re-stated below for traceability only. | (cleared) |
| **C-Q1** | `PLURALITY_CA16CQ1-RATIFY` 6/9 (below quorum) | Retain v1 §6 "Multi-Format Targets" 6-class taxonomy (web / mobile_app / native_app / saas / agentic_ai / generic_url); re-Panel at v2. | (no REVISE direction) |
| **C-Q2** | `PLURALITY_CA16CQ2-STRICTER` 5/9 | **STRICTER detection.** Detection rules MUST emit `target_class_ambiguous` finding at severity `high` whenever the deterministic classifier returns confidence <0.85 (vs the v1 silent fallback to `generic_url`). Hybrid formats (PWA, SaaS-with-mobile-shell, etc.) trigger explicit operator dispute resolution. | Slot 1 (#4 emerging formats), Slot 6 (#17 fragility), Slot 7 (#21 detection gaps), Slot 8 (#25 overfit), Slot 9 (#28 insufficient testing) |
| **C-Q3** | `PLURALITY_CA16CQ3-AGENT21` 6/9 (below quorum) | **Agent #21 owns** Multi-Format target detection + classification (per CA-14-A-Q3 ENTRY 015 already-cleared Agent #21 Phase B ownership scope; this is a coherent extension). Retain wording; re-Panel at v2. | (no REVISE direction; carry-forward) |
| **C-Q4** | `SUPERMAJORITY_CA16CQ4-RATIFY` 8/9 ✅ | **CLEARED at rerun. Mark RATIFIED-PENDING-CEO; DOES NOT re-open at v2 re-Panel.** Final wording per CLEARED8_PROMOTION_PACKAGE_DRAFT.md (§7.6 score formula generalization invariant — unchanged formula across all target classes). Re-stated below for traceability only. | (cleared) |

**Net v2 effect:**
- §7 Proactive Recommendations envelope: MINIMAL canonical + 2 NEW fields (cost + rollback) + detailed schema DEFERRED to engineering dispatch.
- §11.5 Step 1.5: ELIMINATED — recommendations live outside §11 Clearance.
- §29 Redesign/Build Environment: section number DEFERRED to engineering dispatch; wording refers to the surface by name not number.
- §6 Multi-Format Targets: STRICTER classifier (≥0.85 confidence floor; ambiguity emits `high` severity).
- 2 cleared questions (B-Q3 + C-Q4) NOT re-opened; promoted under ENTRY 015 cleared-8.

---

## CA-16-A v2 — Proactive Recommendations envelope (MINIMAL canonical + 2 NEW fields)

### Rationale

v1's PA-1..PA-6 invariants drew 6 distinct slot objections (#1 unbounded, #2 circular dep, #3 no rollback, #14 cost, #18 mandatory link overconstrains, #19 forced recs, #22 mixing, #23 suppression irreversible, #29 citation enforcement, #30 non-blocking overhead). The Panel's structural objection is: **don't fix the full schema in canonical SSOT yet — defer the detail to engineering, but DO add cost + rollback fields**.

v2 publishes the minimal envelope + 2 new fields (cost, rollback) in §7; full schema (PA-1..PA-N invariants, validation, defer-window logic) moves to engineering dispatch.

### Canonical text — §7 Proactive Recommendations (MINIMAL envelope)

```markdown
### §7 item #8 — Proactive Recommendations envelope (CA-16-A v2 MINIMAL canonical)

FlowAI surfaces **proactive recommendations** to operators as a
side-channel to §7.6 GTM Readiness findings + §10.1 Self-Audit findings.
Recommendations are NOT defects (defects live in §7.6 reports);
recommendations are improvements the system suggests beyond
defect-remediation.

**Minimal canonical envelope (CA-16-A v2):**

```yaml
proactive_recommendation:               # surface kind
  id: string                            # globally unique; persists across runs
  product_id: string                    # FK to product_registry
  category: enum                        # canonical category (engineering dispatch enumerates)
  title: string                         # one-line summary
  rationale: string                     # multi-line explanation
  purpose_record_link: string?          # OPTIONAL per CA-16-A v2 (NOT mandatory)
  market_definition_link: string?       # OPTIONAL per CA-16-A v2 (NOT mandatory)
  cost: object                          # NEW per CA-16-A v2 (slot #14 objection)
    effort_hours_estimate: number?      # optional engineering-time estimate
    risk_tier: enum                     # 'low' | 'medium' | 'high'
    blast_radius: enum                  # 'isolated' | 'product-scope' | 'cross-product'
  rollback: object                      # NEW per CA-16-A v2 (slots #1/#3/#9/#26 objections)
    revertable: bool                    # is this recommendation safely revertable post-acceptance
    revert_procedure: string?           # optional human-readable revert steps
  expected_impact: object               # OPTIONAL benefit estimate
    purpose_fulfillment_delta: number?
    gtm_readiness_score_delta: number?
  disposition:                          # operator-decided lifecycle state
    state: enum                         # 'open' | 'accepted' | 'rejected' | 'deferred' | 'implemented'
    deferred_until: date?               # per CA-16-A-Q4 v2 per-product defer-window
    decided_at: datetime?
    decided_by: string?                 # operator/admin id
    decision_rationale: string?
  source: object                        # which agent + which run produced this rec
    agent_id: number
    run_id: string
    emitted_at: datetime
```

**Per CA-16-A v2 dispatch — full schema invariants (PA-1..PA-N) DEFERRED
to engineering dispatch.** This canonical envelope is the MINIMAL contract
the SSOT commits to. Engineering MAY add additional fields + validation
rules without further CA cycle so long as no existing field semantics
change.

**CRITICAL CHANGES vs v1:**
1. `purpose_record_link` is now OPTIONAL (was mandatory in v1 PA-1).
   Rationale: v1's PA-1 mandatory citation was over-constraining (Slot 7
   #18 "could prevent novel improvements like accessibility enhancements
   not covered in initial purpose definitions") and PURPOSE_RECORD itself
   was REMOVED at CA-15-B v2 — so a mandatory link to a non-existent
   canonical block is impossible.
2. NEW `cost` object: effort_hours_estimate + risk_tier + blast_radius
   (slot #14 objection: "expected_impact only considers positive impact,
   not cost or effort").
3. NEW `rollback` object: revertable bool + optional revert_procedure
   (slot #3 + slot #26 objections: "no rollback for accepted
   recommendations").

**Conformance-test acceptance criteria:**

- **CA16A-v2-CT-1.** A `proactive_recommendation` row with
  `purpose_record_link: null` AND `market_definition_link: null`
  validates successfully (both fields optional).
- **CA16A-v2-CT-2.** A row missing `cost.risk_tier` fails validation
  (cost.risk_tier is required when cost object present).
- **CA16A-v2-CT-3.** A row with `rollback.revertable: false` AND
  `disposition.state: 'accepted'` triggers admin warning at acceptance
  time (non-revertable accepted recs are flagged but not blocked).

### §7 item #8 + §11 — Proactive Recs OUTSIDE §11 Clearance (CA-16-A-Q2 v2)

Per CA-16-A-Q2 v2 dispatch, proactive recommendations DO NOT
participate in the §11 Six-Step Clearance flow. The v1 proposal of a
§11.5 NEW Step 1.5 "Proactive Recommendation Review" is ELIMINATED.

Recommendations remain a side-channel admin/operator surface (admin
dashboard tab; `governance_record_entry kind:'proactive_recommendation.v1'`
log entries). They do not gate Step 1 / Step 2 / ... / Step 6
transitions. Operators dispose recommendations asynchronously to the
Clearance pipeline.

**Conformance-test acceptance criterion:**

- **CA16A-v2-CT-4.** No code path in `src/lib/governance/Clearance*.ts`
  reads from or blocks on `proactive_recommendation` rows. Grep:
  zero references to `proactive_recommendation` from Clearance step
  evaluators.

### §7 item #8 + §3 admin config — Per-product defer-window (CA-16-A-Q4 v2)

Per CA-16-A-Q4 v2, the defer-window for `deferred` recommendations is
per-product operator-config:

```yaml
# product_registry row (additive optional field per CA-16-A-Q4 v2)
- product_id: string
  recommendation_defer_window_days: integer  # default 14; bounds [1, 365]
```

When operator disposes a recommendation `deferred`, the system computes
`deferred_until = decided_at + recommendation_defer_window_days` for
that product specifically. After `deferred_until`, the recommendation
re-surfaces in the admin dashboard automatically.

**Conformance-test acceptance criteria:**

- **CA16A-v2-CT-5.** Operator sets
  `recommendation_defer_window_days: 30` on product X; defers a rec at
  `2026-06-01`; `deferred_until` computes to `2026-07-01`; rec
  re-surfaces on or after that date.
- **CA16A-v2-CT-6.** Out-of-bounds value (0 or 400) clamped to bounds;
  admin notified via `agent.product_registry.defer_window_clamped.v1`.
```

---

## CA-16-B v2 — §29 numbering DEFERRED; B-Q3 cleared (re-stated only)

### CA-16-B-Q1 v2 — Section number DEFERRED

The Redesign/Build Environment was tentatively numbered §29 in v1. Multiple slot objections (#9 "redesign environment overhead", #16 "scope creep", #20 "scope creep", #24 "build environment approval underspecified", #26 "lack of rollback mechanism") signaled the surface is **not ready for a fixed canonical section number**.

v2 defers the section number to engineering dispatch. Canonical text refers to the surface as the **"Redesign/Build Environment"** (RB-Env) without committing to a section number; the section number is a §18.4 entry-time decision per the engineering dispatch that wires this surface in.

### Canonical text — RB-Env scope statement (no section number committed)

```markdown
### Redesign/Build Environment (RB-Env) — section number DEFERRED per CA-16-B-Q1 v2

The Redesign/Build Environment is an admin-gated surface that enables
operator-steerable rebuild of a ProductSSOT-tracked product through
FlowAI's existing build pipeline. Section number for the canonical RB-Env
specification is DEFERRED to engineering dispatch (placement may land at
§29, §30, or §29-bis depending on the broader §28+ layout that
engineering decides).

**Scope (canonical, section-number-independent):**

- RB-Env is admin-gated entry only (per CA-16-B-Q3 cleared @ rerun;
  ENTRY 015 cleared-8 final approval RB-7 invariant).
- RB-Env operates on a `product_id`-scoped branch-of-record per
  CA-14-D-Q1 ENTRY 015 atomic-audit-write invariant.
- RB-Env writes to ProductSSOT only via the atomic-audit-write protocol
  per CA-14-D-Q1 invariant.
- RB-Env runs MUST emit `governance_record_entry kind:'rebuild_run.v1'`
  with start/end timestamps + admin actor + outcome.
- Cross-reference to CA-14 fix-safety invariants (CA-14-B-Q1 ENTRY 015
  cleared-8: diff-only / preserve / parse / regression-guard /
  attribution) is MANDATORY — RB-Env rebuilds MUST honor the same 5
  fix-safety invariants as Self-Renewal fixes per Slot 10 #31 objection.

**Conformance-test acceptance criterion:**

- **CA16B-v2-CT-1.** Engineering dispatch picks a section number; the
  CA-16-B-Q1 v2 entry in §18.4 ratified-amendments records the chosen
  number; the canonical RB-Env spec lives at that section.

### CA-16-B-Q2 v2 — Operator-steerable rebuild wording (carry-forward)

v1 wording on "operator-steerable rebuild" preserved verbatim. Re-Panels
at v2.

### CA-16-B-Q3 v2 — CLEARED at rerun (RATIFIED-PENDING-CEO; not re-questioned at v2 re-Panel)

Per ENTRY 015 cleared-8, CA-16-B-Q3 cleared at 7/9 with the following
canonical text (carried forward from CLEARED8_PROMOTION_PACKAGE_DRAFT.md;
re-stated here for completeness; DOES NOT re-open at v2 re-Panel per CEO
dispatch):

> **§11.7 NEW — Redesign/Build approval gate (RB-7 conformance):** A
> Redesign/Build Environment run terminates with `governance_record_entry
> kind:'rebuild_completed.v1'`. The resulting product version cannot
> ship to §11 Step 6 (Deploy/Promote) until an admin role provides
> explicit final approval recorded as
> `governance_record_entry kind:'rebuild_admin_final_approval.v1'`.
> Operators (non-admin role) MAY initiate a rebuild but MAY NOT
> approve their own rebuild for Step 6 promotion. This is the RB-7
> conformance invariant.

(Re-stated only — not re-questioned at v2 re-Panel.)
```

---

## CA-16-C v2 — Multi-Format Targets (STRICTER detection + Agent #21 owns)

### Rationale

5 distinct slot objections on detection fragility: #4 emerging formats, #17 detection rule fragility, #21 detection gaps, #25 overfit hybrids, #28 insufficient testing. The Panel's signal: **detection MUST fail loud, not silent**. v1 silently fell back to `generic_url` when classifier confidence was low — v2 fails loud (`high`-severity ambiguity finding requiring operator dispute resolution).

### Canonical text — §6 Multi-Format target classifier (STRICTER per CA-16-C-Q2 v2)

```markdown
### §6 — Multi-Format Target classification (CA-16-C v2 STRICTER detection)

Every ProductSSOT-tracked product carries a canonical `target_class` per
§6 with these 6 valid values (CA-16-C-Q1 v2 wording, re-Panels at v2):

| `target_class` | Description |
|---|---|
| `web` | Standard website (HTML/CSS/JS in a browser context) |
| `mobile_app` | Mobile web app, PWA, or responsive web in mobile viewport |
| `native_app` | iOS / Android / desktop binary; not browser-accessible |
| `saas` | Authenticated SaaS surface; primarily B2B operator-facing |
| `agentic_ai` | AI agent endpoint (chat/API surface; primarily NLU-driven) |
| `generic_url` | Catch-all when none of the above apply with sufficient confidence |

**Classifier confidence floor (CA-16-C-Q2 v2 STRICTER):** Agent #21 (per
CA-16-C-Q3 ownership) runs deterministic + LLM-augmented classification
producing a confidence score 0.0..1.0 per candidate `target_class`. If the
top-confidence class is <0.85, the classifier MUST emit a
`target_class_ambiguous.v1` finding at severity `high` (per CA-14-A
canonical severity ladder + ENTRY 015 wording). Operator MUST dispose
the ambiguity (choose one of the 6 classes + record rationale) before
§11 Step 1 (Discovery) proceeds for that product.

v1's silent fallback to `generic_url` when confidence was low is
ELIMINATED. Silent fallback was the root cause Slot 1 #4, Slot 6 #17,
Slot 7 #21, Slot 8 #25, and Slot 9 #28 cited.

### CA-16-C-Q3 v2 — Agent #21 owns Multi-Format detection

Per CA-16-C-Q3 v2 (carry-forward from v1 wording; re-Panels at v2),
Agent #21 ACE Conductor owns Multi-Format target detection +
classification. This is consistent with CA-14-A-Q3 ENTRY 015 cleared-8
Agent #21 Phase B ownership — Agent #21 already owns the per-product
adversarial probe surface, so classification of the target itself is a
coherent extension of that charter.

§15.1 row 21 (Agent #21 ACE Conductor) extends to include:

> **Per CA-16-C-Q3 v2 (re-Panel pending):** Agent #21 owns Multi-Format
> target classification. Classifier emits canonical `target_class` per
> §6 with confidence floor ≥0.85 (CA-16-C-Q2 v2); ambiguities below the
> floor produce `target_class_ambiguous.v1` findings at severity `high`.

### CA-16-C-Q4 v2 — CLEARED at rerun (RATIFIED-PENDING-CEO; not re-questioned at v2 re-Panel)

Per ENTRY 015 cleared-8, CA-16-C-Q4 cleared at 8/9 with the following
canonical text (carried forward from CLEARED8_PROMOTION_PACKAGE_DRAFT.md;
re-stated here for completeness; DOES NOT re-open at v2 re-Panel per CEO
dispatch):

> **§7.6 score formula generalization invariant (CA-16-C-Q4 cleared-8):**
> The §7.6 GTM Readiness score formula `100 − 10·crit − 5·high − 2·med
> − 0.5·low` is UNCHANGED across all 6 target classes. `web`,
> `mobile_app`, `native_app`, `saas`, `agentic_ai`, and `generic_url`
> products are all scored by the same formula. Class-specific findings
> (e.g., `accessibility_finding` for `web` vs `api_contract_finding`
> for `saas`) feed into `crit/high/med/low` counts identically across
> classes. The formula is product-class-agnostic.

(Re-stated only — not re-questioned at v2 re-Panel.)

**Conformance-test acceptance criteria for CA-16-C v2:**

- **CA16C-v2-CT-1.** Classifier with top-class confidence 0.92:
  product's `target_class` set; no ambiguity finding emitted.
- **CA16C-v2-CT-2.** Classifier with top-class confidence 0.83:
  `target_class_ambiguous.v1` finding emitted at severity `high`;
  product's `target_class` left null; §11 Step 1 blocked for that
  product until operator disposes.
- **CA16C-v2-CT-3.** Implementation grep across `src/lib/multiformat/`:
  zero silent fallbacks to `generic_url` — only operator-disposed
  `generic_url` assignments allowed.
- **CA16C-v2-CT-4.** §7.6 score formula identical across 6 test
  products (one per target_class); same findings → same score per
  class.
```

---

## v2 Panel Questions (re-Panel — 9 questions; B-Q3 + C-Q4 cleared and NOT re-questioned per CEO dispatch)

### CA-16-A v2 Q1 — Minimal envelope + 2 new fields; full schema DEFERRED

Does Panel ratify the minimal §7 item #8 envelope (purpose-link optional, new cost object, new rollback object) with full schema deferred to engineering dispatch?

- (a) Ratify v2 as drafted.
- (b) Ratify but require purpose_record_link mandatory IF a `product_purpose` field is non-null on the product (conditional mandatory).
- (c) Ratify with broader scope — full schema invariants (PA-1..PA-N) should be drafted in v2 itself, not deferred to engineering.
- (d) Reject — proactive recs envelope should be canonical complete OR not canonical at all; deferred schema is a half-measure.
- (e) INSUFFICIENT_INFORMATION.

### CA-16-A v2 Q2 — Remove recs from §11 Clearance (no Step 1.5)

Does Panel ratify that proactive recommendations DO NOT participate in §11 Six-Step Clearance (Step 1.5 eliminated)?

- (a) Ratify v2 as drafted.
- (b) Ratify but with a Step 6.5 instead — recs surface AFTER Step 6 (Deploy/Promote) as post-deploy improvement candidates.
- (c) Ratify with admin-dashboard-only requirement — recs live ONLY on dashboard; no §11 surface at all, even side-channel.
- (d) Reject — restore §11.5 Step 1.5 per v1; recs should participate in Clearance.
- (e) INSUFFICIENT_INFORMATION.

### CA-16-A v2 Q3 — Disposition lifecycle wording (carry-forward from v1)

Does Panel ratify the disposition lifecycle (open / accepted / rejected / deferred / implemented)?

- (a) Ratify v2 as drafted (same lifecycle as v1).
- (b) Ratify with reopen state added — `rejected` recs may be reopened by admin with rationale (addresses Slot 8 #23 "disposition suppression irreversible").
- (c) Reject — lifecycle should be simpler: open / decided (no sub-states).
- (d) Defer entirely — lifecycle state machine belongs in engineering dispatch.
- (e) INSUFFICIENT_INFORMATION.

### CA-16-A v2 Q4 — Per-product defer-window

Does Panel ratify the per-product defer-window config (default 14 days; bounds [1, 365]; admin-configurable)?

- (a) Ratify v2 as drafted.
- (b) Ratify with stricter bounds — bounds [7, 90] instead of [1, 365].
- (c) Ratify with admin role required for any value > 30 days; operator may set up to 30.
- (d) Reject — global fixed 14-day window is simpler and sufficient.
- (e) INSUFFICIENT_INFORMATION.

### CA-16-B v2 Q1 — §29 numbering DEFERRED

Does Panel ratify deferring the Redesign/Build Environment section number to engineering dispatch?

- (a) Ratify v2 as drafted (section number = engineering decision; canonical refers to RB-Env by name).
- (b) Ratify with placeholder section number §29-DRAFT in v2 + engineering finalizes the real number at promotion.
- (c) Reject — commit to §29 in v2; renumbering later is a cosmetic non-issue.
- (d) Reject — RB-Env should not be canonical at all yet; defer the whole surface to a later CA-N.
- (e) INSUFFICIENT_INFORMATION.

### CA-16-B v2 Q2 — Operator-steerable rebuild wording (carry-forward)

Does Panel ratify the v2 "operator-steerable rebuild" wording (same as v1)?

- (a) Ratify v2 as drafted (carry-forward).
- (b) Ratify with stronger admin-gating wording — "operator initiates; admin approves" emphasized.
- (c) Reject — wording is too vague; needs concrete operator workflow spec in canonical.
- (d) Defer to engineering dispatch entirely.
- (e) INSUFFICIENT_INFORMATION.

### CA-16-C v2 Q1 — 6-class taxonomy (carry-forward)

Does Panel ratify the 6-class Multi-Format taxonomy (web / mobile_app / native_app / saas / agentic_ai / generic_url)?

- (a) Ratify v2 as drafted.
- (b) Ratify with one merge — `web` + `mobile_app` merge into `web_or_pwa` (5-class).
- (c) Ratify with one split — `agentic_ai` splits into `agentic_ai_chat` + `agentic_ai_api` (7-class).
- (d) Reject — defer the canonical taxonomy until ≥1 product per class is in ProductSSOT.
- (e) INSUFFICIENT_INFORMATION.

### CA-16-C v2 Q2 — STRICTER detection (≥0.85 confidence; ambiguity emits `high`)

Does Panel ratify the stricter classifier (confidence floor 0.85; sub-floor ambiguity emits `target_class_ambiguous.v1` at `high`)?

- (a) Ratify v2 as drafted.
- (b) Ratify with stricter floor — confidence floor 0.90 (not 0.85).
- (c) Ratify with looser floor — confidence floor 0.75; ambiguity emits at `medium` (not `high`).
- (d) Reject — restore v1 silent fallback to `generic_url`.
- (e) INSUFFICIENT_INFORMATION.

### CA-16-C v2 Q3 — Agent #21 owns Multi-Format detection

Does Panel ratify Agent #21 ACE Conductor as owner of Multi-Format target classification?

- (a) Ratify v2 as drafted.
- (b) Ratify with co-ownership — Agent #21 + Agent #26 jointly own (since Agent #26 owns Orchestra admission, which sees diverse target types).
- (c) Reject — a separate new Agent #27 should own classification (split from Agent #21's Phase B ownership).
- (d) Defer — ownership belongs in agent registry, not canonical SSOT spec.
- (e) INSUFFICIENT_INFORMATION.

---

## Cleared-8 carryover (re-stated, NOT re-questioned at v2 re-Panel)

The following 2 CA-16 questions cleared at rerun (`ca-16-quorum-fix-rerun-2026-05-19.md`) and are documented in `docs/specs/CLEARED8_PROMOTION_PACKAGE_DRAFT.md` for CEO one-shot ratification under ENTRY 015. They are RESTATED here in this v2 draft for traceability ONLY; they do NOT re-open at the v2 re-Panel.

- **CA-16-B-Q3 (7/9 ✅):** §11.7 NEW Redesign/Build admin-only final approval gate (RB-7 conformance invariant). Full canonical text in `CLEARED8_PROMOTION_PACKAGE_DRAFT.md`.
- **CA-16-C-Q4 (8/9 ✅):** §7.6 score formula generalization invariant (same formula across all 6 target classes; class-agnostic). Full canonical text in `CLEARED8_PROMOTION_PACKAGE_DRAFT.md`.

---

## Acceptance criteria for CA-16 v2 ratification

- W6 re-Panel ratification ≥7/engaged drafted-(a) on each of the 9 RE-PANELED questions (B-Q3 + C-Q4 do NOT re-Panel).
- Engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6.
- CEO disposition per Locked Rule 13.
- If all 9 ratify (a)-clean, CA-16 v2 (re-Paneled questions) promotes; B-Q3 + C-Q4 promote separately under ENTRY 015 cleared-8 package.
- If Panel splits per question, ratified halves promote independently per ENTRY 015 cleared-N partial-promotion precedent.
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA16-v2-promotion-<date>.md` per §18.3.
- Cross-CA dependency: CA-16-B-Q1 §29 numbering decision lives downstream of engineering dispatch; CA-16-C-Q3 Agent #21 Multi-Format ownership cross-references CA-14-A-Q3 ENTRY 015 cleared-8 Agent #21 Phase B ownership.

---

*End of CA-16 v2 draft. Pending W6 re-Panel + CEO disposition per CA-n cycle (Rev-2.1 §18). Doc-only; canonical files NOT amended in this commit. ENTRY 015 cleared-8 promotion (including CA-16-B-Q3 + CA-16-C-Q4) lands separately per `CLEARED8_PROMOTION_PACKAGE_DRAFT.md`.*
