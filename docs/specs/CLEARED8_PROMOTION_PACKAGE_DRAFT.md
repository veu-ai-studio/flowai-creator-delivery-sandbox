# CLEARED-8 PROMOTION PACKAGE — DRAFT (CA-14 + CA-16 quorum-cleared questions)

**Status:** DRAFT — pending CEO one-shot ratification per Locked Rule 13. Doc-only. Applied only on CEO sign-off.
**Author:** W3, 2026-05-19.
**Panel evidence:** W6 quorum-fix rerun commit `cc14a8f` per the four panel-consultation files:
- `docs/panel-consultations/ca-13-quorum-fix-rerun-2026-05-19.md` (0/5 cleared)
- `docs/panel-consultations/ca-14-quorum-fix-rerun-2026-05-19.md` (6/11 cleared)
- `docs/panel-consultations/ca-15-quorum-fix-rerun-2026-05-19.md` (0/11 cleared)
- `docs/panel-consultations/ca-16-quorum-fix-rerun-2026-05-19.md` (2/11 cleared)
- Cross-amendment summary: `docs/panel-consultations/ca13-14-15-16-quorum-fix-rerun-2026-05-19.md`

**Cleared-8 set:** 8 questions cleared ≥7/engaged drafted-(a). Each row below = the exact canonical text that lands on CEO ratification.

| # | Question | Verdict | Top / Engaged | Target |
|---|---|---|---|---|
| 1 | CA-14-A-Q2 | `QUORUM_PLURALITY_CA14AQ2-RATIFY` | 7/10 | LIMITATIONS disclosure verbatim wording |
| 2 | CA-14-A-Q3 | `SUPERMAJORITY_CA14AQ3-AGENT21` | 8/10 | Phase B owner = Agent #21 ACE Conductor |
| 3 | CA-14-A-Q4 | `SUPERMAJORITY_CA14AQ4-RATIFY` | 8/10 | NEW Locked Rule 19 |
| 4 | CA-14-B-Q1 | `QUORUM_PLURALITY_CA14BQ1-RATIFY` | 7/10 | 5 fix-safety invariants (§7 item #6) |
| 5 | CA-14-B-Q2 | `QUORUM_PLURALITY_CA14BQ2-RATIFY` | 7/10 | "FlowAI NEVER ships a fix" guarantee |
| 6 | CA-14-D-Q1 | `SUPERMAJORITY_CA14DQ1-RATIFY` | 8/10 | 3 operational invariants (§7.5.1) |
| 7 | CA-16-B-Q3 | `QUORUM_PLURALITY_CA16BQ3-RATIFY` | 7/9 | Admin-gated approval (CA-16-B §29 RB-7) |
| 8 | CA-16-C-Q4 | `SUPERMAJORITY_CA16CQ4-RATIFY` | 8/9 | §7.6 formula generalization invariant |

---

## §1 — Final canonical text per cleared question

### (1) CA-14-A-Q2 — LIMITATIONS disclosure wording (target: NEW §7 LIMITATIONS sub-section)

**Final canonical text to add to §7 Output Contract:**

```markdown
### LIMITATIONS disclosure discipline (CA-14-A canonical per ENTRY 015)

Every operator-facing delivery (demo microsite, clearance package, GTM bundle)
that cites a §7.6 score MUST disclose:

1. Whether the score reflects **surface-only verification (Phase A only)** OR
   **surface + interactive verification (Phase A + Phase B)**.

2. For Phase A only: the LIMITATIONS section MUST contain the verbatim phrase
   *"This §7.6 score reflects surface verification only. Interactive flows
   (authenticated paths, error-state recovery, engine adversarial probes) were
   not exercised. This score is NOT a functional certification."*

3. For Phase A + B with skipped Phase B paths: enumerate every skipped path
   (e.g. "auth-traversal unavailable for /admin"); state the reason for skip.

4. For full Phase A + B pass: the LIMITATIONS section MAY omit the surface-
   only disclaimer but MUST retain the band-vs-spec deltas per ENTRY 006.

Operators MUST NOT remove or paraphrase these disclosures. The disclosure is
load-bearing per CEO directive 2026-05-18.
```

### (2) CA-14-A-Q3 — Phase B owner = Agent #21 ACE Conductor (target: §15.1 row 21 charter extension)

**Final canonical text** — append to existing §15.1 row 21 status cell, immediately after the existing ENTRY 006 charter clause:

```markdown
Per CA-14-A-Q3 (ENTRY 015 ratification, SUPERMAJORITY 8/10): Agent #21
ACE Conductor owns **Phase B Adversarial Surface Testing** as a canonical
extension of its ENTRY 006 charter. Phase B is distinct from Phase A
(per Locked Rule 19 below): Phase A = surface verification owned by §6
detector set; Phase B = interactive adversarial verification owned by
Agent #21 via authenticated multi-page traversal + click-everything pass
+ adversarial prompt-injection probes against AI-agent surfaces + error-
state interactive triggers. Phase B emits its own `phase_b_pass` boolean
+ finding list shaped identically to §7.6 finding envelope. Required
credentials remain `BROWSERLESS_API_KEY` + `ANTHROPIC_API_KEY` as for
Phase A; no new credentials added. Implementation reference: D39-D41
W5a arc (`90210d0` → `ed0d779`); canonical text now matches code per
Locked Rule 1.
```

### (3) CA-14-A-Q4 — NEW Locked Rule 19 (target: §25 LOCKED RULES — bumps count 18 → 19)

**Final canonical text** — append to §25 immediately after Rule 18, bumping the canonical count to 19:

```markdown
19. **Phase A (surface) vs Phase B (adversarial interactive) — DO NOT CONFLATE.**
    §7.6 score = Phase A signal. §11 Clearance Step 5 requires Phase A + Phase
    B. A §7.6 score alone is NOT a functional certification. LIMITATIONS
    disclosure per §7 CA-14-A canonical text (ENTRY 015) is mandatory for
    every operator-facing delivery. Phase B is owned by Agent #21 ACE
    Conductor per §15.1 row 21 (ENTRY 015 CA-14-A-Q3 ratification).
```

**Concurrent §25 header update:** "## 25. LOCKED RULES (18, do not violate)" → "## 25. LOCKED RULES (19, do not violate)".

### (4) CA-14-B-Q1 — 5 fix-safety invariants (target: NEW §7 Output Contract item #6)

**Final canonical text** — append to §7 Output Contract as item #6 (the contract currently lists items #1–#5 per ENTRY 005 CA-10-Q2):

```markdown
6. **Self-Renewal safety-invariant compliance (CA-14-B canonical per ENTRY
   015).** Every fix proposed by Self-Renewal Executor (or any descendant
   fix-generator) MUST clear ALL FIVE of the following before being
   accepted into a PR for operator review:

   a. **Diff-only.** The fix is expressed as a minimal-change diff against
      the operator branch's HEAD; large rewrites are forbidden unless the
      finding category explicitly authorizes them (none in the current §6
      detector set do).

   b. **Preserve rules.** The fix MUST NOT remove existing imports, types,
      exports, or comments unless the finding-specific scoped relaxation
      explicitly permits it (per W5a commit `41e51ed` scoped per-finding
      preserve relaxation).

   c. **Pre-deploy parse gate.** The post-fix file MUST parse cleanly under
      the project's build toolchain (per W5a commit `bbf75d9`). Parse
      failure → reject the diff; emit `agent.fix.parse_failed.v1`; exit
      `NO_IMPROVEMENT`.

   d. **Post-deploy regression guard.** After preview-URL deploy, re-run
      §7.6 score. If `post_score < pre_score` OR if NEW `critical`/`high`
      findings appear, REJECT THE PR — emit
      `agent.fix.regression_detected.v1`; exit `NO_IMPROVEMENT` with the
      negative-delta trace (per W5a commit `fa9a8f0`).

   e. **Per-fix attribution.** The fix carries a commit-order trace
      sufficient to isolate which individual fix in a multi-fix PR caused
      a regression (per W5a commit `2f4cb97`). Required for §10.3 Self-
      Heal forensics.

   Operative implementation commits cited: `29ce070`, `41e51ed`, `e1f4298`,
   `bbf75d9`, `481e610`, `fa9a8f0`, `2f4cb97`, `f80ac70`.
```

### (5) CA-14-B-Q2 — Canonical guarantee wording (target: §7 item #6 trailing canonical statement + Locked Rule extension)

**Final canonical text** — append directly under §7 item #6 (the five invariants from #4 above):

```markdown
   **Canonical guarantee (CA-14-B-Q2 ratification, ENTRY 015, QUORUM 7/10):**

   FlowAI NEVER ships a fix that regresses §7.6 score OR introduces new
   `critical`/`high` findings. It refuses the PR and exits `NO_IMPROVEMENT`.
   Operator + admin are notified via the standard governance-record audit
   trail. This guarantee is the canonical extension of the five invariants
   above and is binding on every Self-Renewal Executor invocation —
   including all descendant fix-generators (e.g. CA-16-B Redesign Environment
   build/wire dispatch when ratified).
```

### (6) CA-14-D-Q1 — 3 operational invariants (target: NEW §7.5.1 sub-section)

**Final canonical text** — append to §7.5 ProductSSOT entity as new sub-section §7.5.1:

```markdown
### 7.5.1 ProductSSOT operational invariants (CA-14-D canonical per ENTRY 015)

Three load-bearing operational invariants apply to every ProductSSOT row:

**Invariant 1 — Per-product branch-of-record.** Every operator product MUST
have a `product_registry.self_renewal_branch` field populated with the
canonical operator branch name (typically `main` for operator repos, or a
configured equivalent). Self-Renewal Executor reads this field to determine
the PR target. **Missing branch-of-record → Self-Renewal cycle refuses to
start; emits `agent.product_registry.missing_branch.v1`; operator notified
via standard governance channel.** Migration: `0019_product_registry_branch.sql`
(commit `6fb0106`) adds the column + default. Orchestrator + probes thread
the field through per `ecf486a`.

**Invariant 2 — ProductSSOT row seeding precedes any Self-Renewal cycle.**
Every operator product MUST have a `product_ssot` row inserted BEFORE any
Self-Renewal Executor invocation, Aggressive Crawl Engine invocation, or
governance-write attempt against the product. Per-product seed migrations:

- FlowAI self-test: `0017_product_registry_flowai_row.sql` +
  `0018_product_ssot_flowai_seed.sql` (commits `323d5f4` + `464f65f`).
- MyPregLife: `0020_product_ssot_mypreglife_seed.sql` (commit `a216762`).
- SAIGE + ReachSMS + RelTwin + PressAI: `0021_product_ssot_seed_rows.sql`
  (commit `46eb051`).

**Missing seed row → governance-write to that product fails hard with
`agent.product_ssot.row_missing.v1`.**

**Invariant 3 — Atomic-audit-write via snapshot + CAS + rollback.** Every
write to `product_ssot.governance_record` (or any of the 6 canonical
blocks per §7.5) MUST follow the snapshot + CAS + rollback pattern from
commit `9b05ad7` (P0-5). The pattern:

1. Read current row + capture row-version (timestamp or sequence).
2. Compute write payload.
3. UPDATE with `WHERE row-version = captured-version`; on 0 rows updated →
   rollback (someone else won); retry up to 3 times with exponential
   backoff (50ms / 100ms / 200ms).
4. On 3rd failure → emit
   `agent.product_ssot.atomic_write_contention.v1`; operator notified.

Persistent contention is non-retryable without operator intervention. The
pattern mirrors Cluster A advisory-lock + statement_timeout philosophy
(canonical template v3) for application-managed concurrency.
```

### (7) CA-16-B-Q3 — Admin-gated approval scope for Redesign/Build Environment (target: CA-16-B §29 RB-7 canonical statement)

**Final canonical text** — apply within the broader CA-16-B Redesign/Build Environment promotion (CA-16-B §29 currently DRAFT; only this single Q is cleared from CA-16). The cleared text lands as a stand-alone statement in §11 (Six-Step Clearance Protocol) until the broader §29 promotes:

```markdown
### 11.7 Redesign/Build approval gate (CA-16-B-Q3 canonical per ENTRY 015)

For any operator-initiated redesign or build/wire session (CA-16-B
Redesign/Build Environment, full §29 sub-section pending broader CA-16
ratification): operators MAY steer (initiate session, modify proposals,
constrain scope, veto changes); **only admin role (per §13) MAY approve
final implementation** (transition from `operator_steered` →
`implementation_in_progress`).

Conformance-test acceptance criterion (RB-7 canonical): invoking
approval-transition with `operator` role MUST return HTTP 403; only
`admin` role MAY transition. Verified by deliberate-failure injection
test at engineering dispatch.

This Q is ratified ahead of the broader CA-16-B §29 because the admin-
gating discipline is the load-bearing safety property — Stage 3 build/
wire (per Path H ENTRY 014) cannot proceed without it, regardless of the
remaining CA-16-B §29 sub-questions' Panel disposition.
```

### (8) CA-16-C-Q4 — §7.6 formula generalization invariant (target: §7.6 canonical clarification paragraph)

**Final canonical text** — append to §7.6 GTM Readiness Report section, immediately after the existing scoring-formula block:

```markdown
**§7.6 formula generalization invariant (CA-16-C-Q4 canonical per ENTRY
015, SUPERMAJORITY 8/9):** the §7.6 scoring formula remains **unchanged
across all submission/output target classes** (per CA-16-C target-class
taxonomy when broader CA-16-C ratification clears, OR per existing web-
default scope today). The formula is:

```
score = 100
     − (10  × count_critical)
     − (5   × count_high)
     − (2   × count_medium)
     − (0.5 × count_low)
     clamped to [0, 100]
```

What CHANGES per target class is the finding-source set (Phase A detector
set varies per class). What does NOT change is the formula, the band
boundaries, or the prerequisite gate. No per-class weight adjustments;
no per-class formula replacement. This invariant prevents per-class scoring
drift and keeps cross-class comparisons meaningful.

Cleared independently of CA-16-C-Q1 (6 canonical target classes —
pluraled below quorum, re-Panel in CA-16 v2) — the formula invariant
holds whether 6 classes ratify or fewer.
```

---

## §2 — §18.4 Ratified Amendments table — rows to append

`docs/CANONICAL_REFERENCE.md` §18.4 currently ends at ENTRY 006 (ACE promotion). The cleared-8 promotion adds **ENTRY 015** as the next row:

```markdown
| ENTRY 015 | 2026-05-19 | (this promotion) | **Cleared-8 promotion** (CEO one-shot ratification per Locked Rule 13). Eight individually quorum-cleared questions from W6 quorum-fix rerun commit `cc14a8f` (`docs/panel-consultations/ca-{13,14,15,16}-quorum-fix-rerun-2026-05-19.md` + cross-summary). Sections amended: **§7** Output Contract NEW item #6 (5 Self-Renewal fix-safety invariants, CA-14-B-Q1 + canonical guarantee CA-14-B-Q2, 7/10 + 7/10) + NEW LIMITATIONS sub-section (CA-14-A-Q2, 7/10); **§7.5.1** NEW (3 ProductSSOT operational invariants — per-product branch-of-record + seeding + atomic-audit-write, CA-14-D-Q1, 8/10); **§7.6** NEW formula-generalization invariant paragraph (CA-16-C-Q4, 8/9); **§11.7** NEW Redesign/Build approval gate (admin-only final approval, CA-16-B-Q3, 7/9); **§15.1 row 21** Agent #21 charter extension to own Phase B (CA-14-A-Q3, 8/10); **§25** NEW Locked Rule 19 (Phase A vs Phase B — DO NOT CONFLATE, CA-14-A-Q4, 8/10; rule count 18→19). Implementing W5a commits cited: D27–D38 arc (`29ce070` → `b719c6d`) + D39–D41 Phase B implementation (`90210d0` → `ed0d779`). Open questions (CA-14: A-Q1, B-Q3, C-Q1, C-Q2, D-Q2; CA-13: all 5; CA-15: all 11; CA-16: A-Q1..A-Q4, B-Q1, B-Q2, C-Q1, C-Q2, C-Q3) re-Panel in CA-13 v2 / CA-15 v2 / CA-16 v2 drafts (this commit's siblings). Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-ENTRY015-promotion-2026-05-19.md`. |
```

---

## §3 — CANONICAL_HISTORY ENTRY 015 DRAFT (promotes alongside §18.4 row append on CEO ratification)

```markdown
### ENTRY 015 — 2026-05-19 — Cleared-8 promotion (W6 quorum-fix rerun)

- **Session:** W6 ran a quorum-fix rerun on the four parked/pending CA
  drafts (CA-13 + CA-14 + CA-15 + CA-16) using focused per-amendment runs
  with ≤~30K-char bundles to match the proven 27,778-char engagement
  recipe. Result: eight individually quorum-cleared questions across
  CA-14 + CA-16; zero cleared on CA-13 or CA-15. Per CEO Locked Rule 13
  decision (this entry), the cleared-8 promote in a one-shot pass; the
  remaining 19 questions re-Panel via v2 drafts (CA-13 v2 / CA-15 v2 /
  CA-16 v2, this commit's siblings).

- **Panel evidence (commit `cc14a8f`):**
  - `docs/panel-consultations/ca-13-quorum-fix-rerun-2026-05-19.md` —
    32412 chars, 8/10 engaged, 34 distinct objections, 0/5 cleared, alignment 32.5% ✅ PASS dissent floor.
  - `docs/panel-consultations/ca-14-quorum-fix-rerun-2026-05-19.md` —
    34212 chars, 10/10 engaged, 36 distinct objections, **6/11 cleared**, alignment 64.5% ✅ PASS.
  - `docs/panel-consultations/ca-15-quorum-fix-rerun-2026-05-19.md` —
    32370 chars, 8/10 engaged, 31 distinct objections, 0/11 cleared, alignment 17.0% ✅ PASS.
  - `docs/panel-consultations/ca-16-quorum-fix-rerun-2026-05-19.md` —
    31224 chars, 9/10 engaged, 31 distinct objections, **2/11 cleared**, alignment 43.4% ✅ PASS.
  - Cross-summary at `ca13-14-15-16-quorum-fix-rerun-2026-05-19.md`.

- **Cleared-8 questions + verdicts (the 8 items ratified by ENTRY 015):**

  | # | Question | Verdict | Top / Engaged | Target |
  |---|---|---|---|---|
  | 1 | CA-14-A-Q2 | `QUORUM_PLURALITY_CA14AQ2-RATIFY` | 7/10 | §7 LIMITATIONS verbatim wording |
  | 2 | CA-14-A-Q3 | `SUPERMAJORITY_CA14AQ3-AGENT21` | 8/10 | Agent #21 owns Phase B (§15.1 row 21) |
  | 3 | CA-14-A-Q4 | `SUPERMAJORITY_CA14AQ4-RATIFY` | 8/10 | NEW Locked Rule 19 (Phase A vs B) |
  | 4 | CA-14-B-Q1 | `QUORUM_PLURALITY_CA14BQ1-RATIFY` | 7/10 | §7 NEW item #6 (5 fix-safety invariants) |
  | 5 | CA-14-B-Q2 | `QUORUM_PLURALITY_CA14BQ2-RATIFY` | 7/10 | "FlowAI NEVER ships a fix" guarantee |
  | 6 | CA-14-D-Q1 | `SUPERMAJORITY_CA14DQ1-RATIFY` | 8/10 | §7.5.1 NEW (3 operational invariants) |
  | 7 | CA-16-B-Q3 | `QUORUM_PLURALITY_CA16BQ3-RATIFY` | 7/9 | §11.7 Redesign/Build admin-gated approval |
  | 8 | CA-16-C-Q4 | `SUPERMAJORITY_CA16CQ4-RATIFY` | 8/9 | §7.6 formula-generalization invariant |

  All 8 cleared with drafted-(a) ≥7/engaged per Locked Rule 17. Two
  questions (CA-14-A-Q3 + CA-14-A-Q4 + CA-14-D-Q1 + CA-16-C-Q4) cleared
  at supermajority threshold (≥8/engaged).

- **Pre-promotion archive:** `docs/archive/FLOWAI_SSOT-pre-ENTRY015-promotion-2026-05-19.md`
  per §18.3. Captures canonical SSOT state at end-of-ENTRY-010 (no
  intervening §18.4 entries; ENTRY 011–014 are session-log drafts only,
  not yet in §18.4).

- **What's still parked / pending:**
  - **CA-13** (75→95 GTM bar + CA-9-Q4 §15 wording reconciliation):
    all 5 questions below quorum at quorum-fix rerun. CA-13 v2 draft
    applies REVISE directions per CEO dispatch — 95-bar DEFER, Near-GTM
    band ELIMINATE, capability-keyed sibling naming.
  - **CA-15** (Multi-Dim Quality Audit + Purpose Capture + Purpose-Driven
    Optimization + SSOT-Conformance Gate): 0/11 cleared; every question
    REVISE or REJECT at quorum-fix rerun. CA-15 v2 is a STRUCTURAL
    REWRITE per CEO dispatch — MERGE Multi-Dim into existing §10
    5-dimension engine; Multi-Dim becomes telemetry (not equal-footing);
    purpose_record OPTIONAL not required; advisory not hard-gate.
  - **CA-16** (remaining 9 questions): CA-16 v2 draft applies REVISE
    directions — recommendation-schema DEFER engineering; remove
    "Step 1.5" from clearance; ratify CA-16-C-Q4 via this ENTRY 015
    (already done); strict precision-over-recall target detection;
    Agent #21 owns Multi-Format detection (consistent with CA-14-A-Q3).
  - **CA-11 + CA-12** carry-forward from prior sessions; unchanged in
    this entry.

- **Honest scope footer.** ENTRY 015 promotes ONLY the 8 individually
  quorum-cleared questions. It does NOT promote the broader CA-14 or
  CA-16 amendments wholesale — the parked questions require CA-14 v2 /
  CA-16 v2 + further Panel review. ENTRY 015 is the canonical first
  partial-promotion in the §18.4 history (prior entries promoted whole
  CA bundles); this sets the precedent for question-level granular
  ratification when bundle-level Panel verdicts split. Code state for
  the cleared 8 questions already matches canonical text after this
  promotion (per Locked Rule 1 — D27–D38 + D39–D41 W5a arcs ship the
  implementation; ENTRY 015 closes the canonical-text gap).

- **Lineage:** ENTRY 010 (Phase A live build) → ENTRY 011 draft (D27–D38
  arc) → ENTRY 012 draft (D39–D41 arc) → ENTRY 013 draft (CA-16 net-new
  scope) → ENTRY 014 draft (Path H CEO decision) → CA-13 + CA-14 joint
  Panel parked (`8e185a6`) → W6 quorum-fix rerun (`cc14a8f`) → CEO
  Locked Rule 13 cleared-8 ratification → **this entry** → CA-13 v2 /
  CA-15 v2 / CA-16 v2 drafts (sibling commits this dispatch).
```

---

## §4 — Promotion-commit operations (executed at CEO ratification time, NOT in this dispatch)

When CEO ratifies ENTRY 015 in a single one-shot dispatch:

1. Apply the 8 final canonical texts from §1 above to `docs/CANONICAL_REFERENCE.md` in target locations.
2. Append the §18.4 row from §2 above.
3. Append the ENTRY 015 entry from §3 above to `docs/CANONICAL_HISTORY.md` SECTION 8.
4. Create the pre-promotion archive at `docs/archive/FLOWAI_SSOT-pre-ENTRY015-promotion-2026-05-19.md`.
5. Single commit message: `W5x: ENTRY 015 — cleared-8 promotion (CA-14 + CA-16 partial; W6 cc14a8f)`.

Operations 1–4 are W5x territory; this CLEARED8 package documents WHAT lands but does NOT itself amend canonical files (per CA-n cycle §18 discipline).

---

*End of CLEARED-8 PROMOTION PACKAGE DRAFT. Pending CEO one-shot ratification per Locked Rule 13. Applied at W5x promotion-commit time.*
