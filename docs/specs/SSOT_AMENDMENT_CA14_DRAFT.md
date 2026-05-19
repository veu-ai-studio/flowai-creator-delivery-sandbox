# SSOT Amendment Draft — CA-14 (Phase B Adversarial Gate + Safety Invariants + Findings-Driven + Per-Product Branch-of-Record)

**Status:** DRAFT — pending W6 Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18).
**Author:** W3, 2026-05-18 (evening session).
**Anchor canonical SSOT:** `docs/CANONICAL_REFERENCE.md` (Rev-2.1 + ENTRY 003–010 cumulative).
**Why CA-14 (true next free number):** CA-11 (draft, Panel-reviewed but NOT ratified), CA-12 (draft, three NOT_RATIFIED rounds: v1 `5c2324f`, v2 `01bed9d`, v3 `dedd075`), CA-13 (draft `81cf144`, NOT yet Panel-reviewed) — all three drafts exist but none promoted; `docs/CANONICAL_REFERENCE.md` §18.4 ratified-amendments table stops at ENTRY 006 (CA-1/2/3/7/8/9/10 + ACE). CA-14 is the next CA cycle for new substantive amendments.

**Lineage:** Rev-2.1 canonical (`9495b26`) → ENTRY 003 → ENTRY 004 (CA-7+CA-8 `fd94f1e`) → ENTRY 005 (CA-9+CA-10 `5dcd865`) → ENTRY 006 (ACE `66149da`) → ENTRY 007 → ENTRY 008 → ENTRY 009 (CA-9-Q4 Option (a) LOCKED) → ENTRY 010 (Phase A live build) → D27–D38 W5a engineering arc (this draft codifies the SSOT consequences of that arc).

**Four bundled amendments (all from D27–D38 shipped-but-undocumented capability):**
- **CA-14-A:** Phase B Adversarial Surface Testing as HARD GTM-clearance prerequisite (CEO directive 2026-05-18). Amends §6, §7.6, §11 Step 5, §7 LIMITATIONS. Adds Locked Rule 19.
- **CA-14-B:** Self-Renewal safety invariants — diff-only fix engine, preserve rules, scoped per-finding relaxation, pre-deploy parse gate, post-deploy regression guard. Amends §7 Output Contract + §10 Self-Governance Layer + §12 Remediation Modes.
- **CA-14-C:** Findings-driven prioritization — §7.6 canonical findings are the source of truth for remediation; Five-Layer Intelligence Framework is internal telemetry only (not a remediation prioritizer). Amends §6 + §7.6 + pipeline step 6 (govern).
- **CA-14-D:** Per-product branch-of-record + ProductSSOT row seeding + atomic-audit-write requirement. Amends §7.5 (ProductSSOT) + appendix schema notes.

**CA-13 reconciliation (Task 3):** CA-13 (75→95 GTM bar + CA-9-Q4 Option (a) §15 wording) remains draft, not Panel-reviewed. CA-14 cross-references CA-13 and BUNDLES it for joint W6 Panel ratification: CA-13-A's GTM-bar-95 directly couples to CA-14-A's Phase B prerequisite (both gate §11 Clearance Step 5 the same way); CA-13-B's CA-9-Q4 wording fix is independent but topically close. The W6 Panel SHOULD ratify both CA-13 and CA-14 in the same session; if Panel splits, ratified halves promote independently per Locked Rule 13. See §CA-14-E below.

---

## CA-14-A — Phase B Adversarial Surface Testing as HARD GTM-clearance prerequisite

### Rationale (CEO directive 2026-05-18; not in any committed file as of this drafting)

The §7.6 GTM Readiness Report score is currently produced by surface crawl + issue-detector (Agent #21 Aggressive Crawl Engine, ENTRY 006). A passing §7.6 score (90+ Showcase-ready band; ≥75 Demo-ready band per ENTRY 006) means: "the surface looks correct on a non-interactive crawl." It does NOT mean: "the surface holds up under adversarial probing of authenticated flows, error states, and engine interactions."

The D27–D38 engineering arc demonstrated that §7.6 scoring on its own can produce confident high scores against surfaces that immediately break under interaction (broken modals not exercised by crawl click-pass; AI agents unreachable under real workflows; auth-gated paths never traversed; form-submit XSS triggers opt-in only per ENTRY 006 §6 Q6=(c)).

**CEO directive (2026-05-18):** §7.6 score WITHOUT Phase B is **explicitly NOT a functional certification**. A product cannot pass §11 Clearance Step 5 with surface-only verification. Phase B Adversarial Surface Testing — a distinct, mandatory verification phase that EXERCISES the live system end-to-end across authenticated flows, intentional error states, and engine interactions — is the hard gate.

### §6 — Aggressive Crawling, Testing & Resolution Contract (amendment)

**Add new sub-section §6.10 after the existing §6 detector set:**

```markdown
### 6.10 Phase A (surface) vs Phase B (adversarial interactive) — CANONICAL DISTINCTION

The §6 Aggressive Crawl Engine covers **Phase A — surface verification**: full-site
spider, click-pass, modal probing, AI-agent benign-probe, mobile + desktop viewports,
non-destructive error-state triggers per ENTRY 006 §6 + Q6=(c).

**Phase B — Adversarial Surface Testing — is a SEPARATE, MANDATORY phase** required
for any product seeking §11 Clearance Step 5 Demo Readiness:

- Authenticated multi-page traversal (per AUTH_TRAVERSAL_SECURITY_SPEC v3 + ENTRY 007).
- Live interaction with engines (chatbots, AI agents, recommenders) — adversarial
  prompt-injection probes; refusal-mode verification; graceful-degradation checks
  under hostile input.
- Error-state interactive verification — broken-modal click-through; form submission
  with adversarial payloads (XSS triggers opt-in per ENTRY 006 Q6=(c) — Phase B
  EXPANDS the opt-in surface for dev/staging env).
- Cross-feature dependency probing — e.g. signup→login→protected-flow→logout chain;
  verifies stateful surface coherence not just static page renders.

Phase A produces a §7.6 score; Phase B produces a separate "adversarial-pass"
boolean + finding list. **A §7.6 score WITHOUT Phase B is NOT a functional
certification** — see §7.6 Phase B prerequisite + §11 Step 5 four-prerequisite
gate (extended from ENTRY 006's gate; see CA-14-A §11 amendment below).
```

### §7.6 — GTM Readiness Report (amendment — Phase B prerequisite added)

**Modify the existing §7.6 "Maps to §11 Clearance Step 5" four-prerequisite gate (ENTRY 006). Add a fifth prerequisite, making it a five-prerequisite gate:**

```markdown
**Maps to §11 Clearance Step 5 (Demo Readiness)** — CA-14-A extends the
ENTRY 006 prerequisite list to require **ALL FIVE** of:

- GTM Readiness Report exists for the product in the current environment.
- Report score per the canonical band threshold (per ENTRY 006: ≥75; per
  pending CA-13-A: ≥95 — see CA-13 reconciliation §CA-14-E).
- Zero `critical` findings open per the report.
- Self-Renewal cycle on all findings ≥`high` has reached a terminal decision
  (Resolved / Human-gated / Documented per §6).
- **NEW (CA-14-A):** Phase B Adversarial Surface Testing pass — `phase_b_pass`
  field on the same `governance_record_entry` is `true`; Phase B finding list
  has zero `critical` and the same Self-Renewal terminal-decision discipline
  for `high` findings as Phase A. **A §7.6 score WITHOUT Phase B is NOT a
  functional certification.**
- LIMITATIONS section published verbatim in delivery — and now MUST disclose:
  - Whether Phase B was run, or only Phase A.
  - For surfaces marked "verified" in delivery, explicitly state whether the
    verification is surface-only (Phase A) or interactive-verified (Phase A + B).
  - If any Phase B path was skipped (e.g. auth-traversal unavailable for that
    surface), the skipped paths MUST be enumerated.

Failure of any of the FIVE prerequisites blocks §11 Clearance Step 5 with explicit
error code. Score-band labels surface in `/clearance` Step 5 UI alongside the new
`phase_b_pass` indicator + skipped-paths enumeration.
```

### §11 — Six-Step Product Clearance Protocol (Step 5 amendment)

**Modify §11 Step 5 row to reference the new five-prerequisite gate:**

```markdown
| 5 | Demo Readiness | "Demo" | Synthetic-data demo microsite generates; guided tour script renders; per Sprint 7 Demo Builder. **PLUS** CA-14-A five-prerequisite gate per §7.6 — including Phase B Adversarial Surface Testing pass. Failure of ANY of the five (GTM Readiness Report exists; score ≥ canonical band; zero `critical`; Self-Renewal terminal on `high`; **Phase B pass**) blocks Step 5 sign-off. LIMITATIONS section disclosure of surface-only-vs-interactive-verified is mandatory. |
```

### §7 LIMITATIONS — surface-vs-interactive disclosure

**Add explicit canonical text to the §7 Output Contract LIMITATIONS sub-section (or create if absent — verify at promotion-commit time):**

```markdown
**LIMITATIONS disclosure discipline (CA-14-A canonical):**

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

### New Locked Rule 19 (extension of §25)

**Add to §25 LOCKED RULES (currently 18) — bumps the count to 19:**

```markdown
19. **Phase A (surface) vs Phase B (adversarial interactive) — DO NOT CONFLATE.**
    §7.6 score = Phase A signal. §11 Clearance Step 5 requires Phase A + Phase B.
    A §7.6 score alone is NOT a functional certification. LIMITATIONS disclosure
    per §7 CA-14-A canonical text is mandatory for every operator delivery.
```

---

## CA-14-B — Self-Renewal safety invariants

### Rationale (D27–D38 W5a arc; multiple implementing commits)

The D27–D38 W5a engineering arc shipped a suite of safety invariants in the Self-Renewal Executor to prevent the "fix-introduces-regression" class of defects. The canonical guarantee that emerged: **FlowAI never ships a fix that regresses §7.6 or introduces new `critical` / `high` findings; it refuses the PR and exits with `NO_IMPROVEMENT` outcome.**

**Implementing commits (cited verbatim from git log):**

- `29ce070` W5a: diff-only fix engine — architectural minimal-change invariant (D32 T2)
- `41e51ed` W5a: visible diff-rejections + scoped per-finding preserve relaxation (D33 T1+T2)
- `e1f4298` W5a: fixGenerator minimal-change guardrails — stop regressions like 88→83
- `bbf75d9` W5a: orchestrator pre-deploy parse gate + STEP 10 Vercel failure non-fatal
- `481e610` W5a: build-safe fixGenerator — fix root cause of Vercel deploy failures
- `fa9a8f0` W5a: post-deploy regression guard — never accept a regressing fix into PR
- `2f4cb97` W5a: per-fix attribution — surface commit-order trace for regression isolation
- `f80ac70` W5a: fixGenerator — precise fix instructions + syntax validation + retry-once

### §7 — Output Contract (amendment — add item #6)

**The §7 Output Contract currently lists items #1–#5 (per ENTRY 005 CA-10-Q2 atomic ProductSSOT update was item #5). Add item #6:**

```markdown
6. **Self-Renewal safety-invariant compliance (CA-14-B canonical).** Every
   fix proposed by Self-Renewal Executor (or any descendant fix-generator)
   MUST clear ALL of the following before being accepted into a PR for
   operator review:

   a. **Diff-only.** The fix is expressed as a minimal-change diff against
      the operator branch's HEAD; large rewrites are forbidden unless the
      finding category explicitly authorizes them (none in the current
      §6 detector set do).

   b. **Preserve rules.** The fix MUST NOT remove existing imports, types,
      exports, or comments unless the finding-specific scoped relaxation
      explicitly permits it (per `41e51ed` scoped per-finding preserve
      relaxation).

   c. **Pre-deploy parse gate.** The post-fix file MUST parse cleanly under
      the project's build toolchain (per `bbf75d9`). Parse failure → reject
      the diff; emit `agent.fix.parse_failed.v1` (added to Cluster D Deferred
      set per CA-14-B); exit NO_IMPROVEMENT.

   d. **Post-deploy regression guard.** After preview-URL deploy, re-run
      §7.6 score. If `post_score < pre_score` OR if NEW `critical`/`high`
      findings appear, REJECT THE PR — emit `agent.fix.regression_detected.v1`
      (added to Cluster D Deferred set per CA-14-B); exit NO_IMPROVEMENT
      with the negative-delta trace (per `fa9a8f0`).

   e. **Per-fix attribution.** The fix carries a commit-order trace
      sufficient to isolate which individual fix in a multi-fix PR caused
      a regression (per `2f4cb97`). Required for §10.3 Self-Heal forensics.

   **Canonical guarantee (Locked Rule extension):** FlowAI NEVER ships a
   fix that regresses §7.6 score OR introduces new `critical`/`high`
   findings. It refuses the PR and exits `NO_IMPROVEMENT`. Operator + admin
   notified via the standard governance-record audit trail.
```

### §10 — Self-Governance Layer (amendment — add §10.4)

**Add a new §10.4 sub-section after the existing §10.1/§10.2/§10.3:**

```markdown
### 10.4 Fix-Safety invariants (CA-14-B canonical)

The Self-Renewal Executor's fix generator operates under the §7 item #6
five-invariant contract: diff-only / preserve rules / pre-deploy parse gate
/ post-deploy regression guard / per-fix attribution. These are enforced at
the fix-generator boundary (commits `29ce070`, `41e51ed`, `e1f4298`, `bbf75d9`,
`fa9a8f0`, `2f4cb97`, `f80ac70`). Violation of any invariant aborts the fix
pipeline with `NO_IMPROVEMENT` outcome; no PR is opened.

The five invariants compose into the canonical guarantee: **a Self-Renewal
fix EITHER improves the §7.6 score (no new `critical`/`high` findings) OR
the fix is silently rejected with a governance-record audit trail. No fix
ever ships that makes the product measurably worse.**
```

### §12 — Remediation Modes (amendment — update mode (iv) Fork-and-fix)

**Modify §12 mode (iv) row to reference the safety invariants:**

```markdown
| **(iv) Fork-and-fix via Orchestra** | Active | Step 6 (govern) + invocable from /api/renew.js | Issue is autoFixable AND severity ∈ {`medium`, `low`} AND no human gate triggered. **CA-14-B: fix pipeline enforces 5 safety invariants (diff-only / preserve / parse / regression-guard / attribution) per §7 item #6; rejected fixes exit `NO_IMPROVEMENT` with no PR opened.** |
```

---

## CA-14-C — Findings-driven prioritization (Five-Layer is internal telemetry only)

### Rationale (D38 commit `b719c6d` + the broader prioritization shift)

The D38 commit (`b719c6d` W5a: feed canonical §7.6 findings to the prioritizer) cemented an architectural shift that had been accumulating across the D27–D38 arc: **§7.6 canonical findings are the source of truth for remediation prioritization, NOT the Five-Layer Intelligence Framework.**

The Five-Layer Intelligence Framework (L1 Functionality, L2 Operational, L3 Financial, L4 Business, L5 GTM — per §25 Locked Rule 6) remains canonical for **internal classification telemetry**: tagging research outputs, audit findings, and pipeline artifacts so analytical tools can stratify by layer. The Five-Layer Framework is NOT a remediation prioritizer; the §7.6 detector set + finding severity (critical / high / medium / low) IS.

Before this shift, the pipeline's remediation Step 6 (govern) implicitly used Five-Layer tags to decide which findings to fix first. This created ordering ambiguity: a `medium` finding tagged L3 Financial could either jump or trail a `high` finding tagged L1 Functionality depending on per-product weighting heuristics — which weren't canonical. D38's prioritizer rewire (`b719c6d`) routes remediation strictly by `severity × visibility × effort` per ENTRY 006 §7.6 impact-score formula.

### §6 — Aggressive Crawling (clarification)

**Add explicit clarifying paragraph at end of §6.10 (added by CA-14-A above):**

```markdown
**CA-14-C canonical: §7.6 findings are the remediation source of truth.** The
§6 issue-detector set (per ENTRY 006 lines 186) + the §7.6 impact-score formula
(`severity × visibility × effort` per ENTRY 006 line 207) are the canonical
inputs to Self-Renewal Executor's remediation pipeline. The Five-Layer
Intelligence Framework (§25 Locked Rule 6) remains canonical for **internal
classification telemetry** but is NOT a remediation prioritizer.
```

### §7.6 — GTM Readiness Report (add prioritization-canonical-source paragraph)

**Add an explicit paragraph after the §7.6 "Top fixes ranking" paragraph (ENTRY 006 line 207):**

```markdown
**Prioritization source of truth (CA-14-C canonical):** the top-fixes ranking
above is the **canonical remediation queue** for Self-Renewal Executor. The
queue is sorted by impact-score (severity × visibility × effort); Five-Layer
tags appear on findings for telemetry/classification only and DO NOT influence
the remediation order. Per D38 commit `b719c6d` (W5a: feed canonical §7.6
findings to the prioritizer) — the pipeline now consumes §7.6 findings
directly, NOT a Five-Layer-derived intermediate.
```

### §25 Locked Rule 6 — clarification (no edit; just confirm scope)

**Locked Rule 6 currently reads:**
> 6. Five-layer intelligence framework (L1 Functionality, L2 Operational, L3 Financial, L4 Business, L5 GTM) — mandatory tagging per `src/lib/operationsEngine.js` FIVE_LAYER_FRAMEWORK.

**No edit required.** The rule is already correctly scoped to "tagging" (telemetry/classification). CA-14-C clarifies the negative space: tagging does NOT equal prioritization. The §6.10 + §7.6 amendments above pin that clarification canonically.

---

## CA-14-D — Per-product branch-of-record + ProductSSOT seeding + atomic-audit-write

### Rationale (multiple D32–D36 commits — schema + governance substrate)

The D27–D38 arc shipped four substrate pieces that need canonical §7.5 + appendix coverage:

- `323d5f4` W5a: 0017_product_registry_flowai_row — enable PATH-A FlowAI self-test (D32 T1)
- `464f65f` W5a: 0018_product_ssot_flowai_seed — resolve D32 product_ssot contradiction (D33 T3)
- `6fb0106` W5a: 0019_product_registry_branch — per-product branch-of-record (D34 T1)
- `ecf486a` W5a: thread per-product branch through orchestrator + probes (D34 T2)
- `a216762` W5a: 0020_product_ssot_mypreglife_seed — unblock MyPregLife §19 governance (D36 T1)
- `9b05ad7` W5a: atomic ProductSSOT write — snapshot + CAS + rollback (P0-5)

The current §7.5 (per ENTRY 005 CA-10-A) defines ProductSSOT entity with 6 canonical blocks but does NOT define:

1. **Per-product branch-of-record requirement** — every operator product MUST have a `product_registry.self_renewal_branch` value (default `flowai-v0.1` or similar canonical branch name); Self-Renewal Executor reads this when computing PR target.
2. **ProductSSOT seed requirement** — every operator product MUST have a `product_ssot` row seeded BEFORE any Self-Renewal cycle runs against it (governance entries write to the row; if no row exists, write fails or silently writes to nowhere).
3. **Atomic-audit-write requirement** — every Self-Renewal cycle that touches `product_ssot.governance_record` MUST use the atomic snapshot + CAS + rollback pattern from `9b05ad7` (P0-5).

### §7.5 — ProductSSOT entity (amendment — add §7.5.1)

**Add new sub-section §7.5.1 after the existing §7.5 6-blocks definition:**

```markdown
### 7.5.1 ProductSSOT operational invariants (CA-14-D canonical)

Three load-bearing operational invariants apply to every ProductSSOT row:

**Invariant 1 — Per-product branch-of-record.** Every operator product MUST
have a `product_registry.self_renewal_branch` field populated with the
canonical operator branch name (typically `main` for operator repos, or a
configured equivalent). Self-Renewal Executor reads this field to determine
the PR target. **Missing branch-of-record → Self-Renewal cycle refuses to
start; emits `agent.product_registry.missing_branch.v1` (added to Cluster D
Deferred set per CA-14-D); operator notified via standard governance
channel.** Migration: `0019_product_registry_branch.sql` (commit `6fb0106`)
adds the column + default. Orchestrator + probes thread the field through
per `ecf486a`.

**Invariant 2 — ProductSSOT row seeding precedes any Self-Renewal cycle.**
Every operator product MUST have a `product_ssot` row inserted BEFORE any
Self-Renewal Executor invocation, Aggressive Crawl Engine invocation, or
governance-write attempt against the product. Per-product seed migrations:

- FlowAI self-test: `0017_product_registry_flowai_row.sql` + `0018_product_ssot_flowai_seed.sql` (D32 T1 + D33 T3 commits `323d5f4` + `464f65f`).
- MyPregLife: `0020_product_ssot_mypreglife_seed.sql` (D36 T1 commit `a216762`).
- Remaining 4 VEU products (SAIGE, ReachSMS, RelTwin, PressAI): per-product
  seed migrations pending (target: D-next dispatch).

**Missing seed row → governance-write to that product silently no-ops OR fails
hard depending on §10.4 fix-pipeline invariant compliance.** Either failure
mode is unacceptable; the seed-row requirement is the canonical fix.

**Invariant 3 — Atomic-audit-write via snapshot + CAS + rollback.** Every
write to `product_ssot.governance_record` (or any of the 6 canonical
blocks per §7.5) MUST follow the snapshot + CAS + rollback pattern from
commit `9b05ad7` (P0-5). The pattern:

1. Read current row + capture row-version (timestamp or sequence).
2. Compute write payload (e.g. new governance entry).
3. UPDATE with WHERE row-version = captured-version; on 0 rows updated →
   rollback (someone else won); retry up to 3 times with exponential
   backoff (50ms / 100ms / 200ms).
4. On 3rd failure → emit `agent.product_ssot.atomic_write_contention.v1`
   (added to Cluster D Deferred set per CA-14-D); operator notified.

**Persistent contention is non-retryable without operator intervention.** The
pattern matches Cluster A's advisory-lock + statement_timeout philosophy
(CA-A v3) for application-managed concurrency.
```

### §7.5 appendix — schema notes (descriptive)

**Add a brief appendix paragraph cross-referencing the migration files:**

```markdown
**Schema migrations supporting §7.5.1 invariants:**

| Migration | Commit | Purpose |
|---|---|---|
| `0017_product_registry_flowai_row.sql` | `323d5f4` | PATH-A FlowAI self-test row in product_registry |
| `0018_product_ssot_flowai_seed.sql` | `464f65f` | FlowAI ProductSSOT seed row |
| `0019_product_registry_branch.sql` | `6fb0106` | self_renewal_branch column + default |
| `0020_product_ssot_mypreglife_seed.sql` | `a216762` | MyPregLife ProductSSOT seed row |

Migrations 0017–0020 are the substrate for CA-14-D Invariant 1 + Invariant 2.
Atomic-audit-write code (CA-14-D Invariant 3) lives in the orchestrator path
per commit `9b05ad7` — no separate migration.
```

---

## CA-14-E — CA-13 reconciliation (Task 3 explicit fold)

**CA-13 status at time of CA-14 drafting (per CA-14 Task 0 evidence):** draft `81cf144`, not yet Panel-reviewed, not in §18.4 ratified-amendments table.

**CA-13 content summary (for reviewer convenience):**
- **CA-13-A** — §7.6 GTM-ready bar 75→95 (CEO directive 2026-05-18). Score band table rewritten; §11 Step 5 threshold tightened.
- **CA-13-B** — CA-9-Q4 phrasing reconciliation (Option (a) EXECUTOR_REGISTRY sibling per ENTRY 009 LOCKED, supersedes legacy "(b) dual-authority" wording in §15 intro + §15.1 rows 21+26).

**CA-14 ↔ CA-13 coupling:**

- **CA-13-A ↔ CA-14-A** — both modify §11 Clearance Step 5 prerequisite. CA-13-A raises the score bar; CA-14-A adds Phase B as a separate prerequisite. The two are independent gates; both must pass. If both ratify, §11 Step 5 becomes a FIVE-prerequisite gate (CA-14-A's count) with the ≥95 score threshold (CA-13-A) — the natural composition is consistent.
- **CA-13-A ↔ CA-14-C** — both touch §7.6. CA-13-A modifies the score-band labels; CA-14-C clarifies that §7.6 findings are the canonical remediation source. No conflict; they edit different paragraphs.
- **CA-13-B ↔ CA-14** — CA-13-B is independent (§15 wording only); no overlap with CA-14 substantive amendments.

**Joint W6 Panel recommendation:** ratify CA-13 + CA-14 in the same Panel session. If Panel splits, each ratified amendment promotes per its own §18.4 entry. CA-13's reconciliation lineage cites this CA-14 cross-reference at promotion-commit time.

**If Panel REJECTS CA-13-A** (keeps the ENTRY 006 ≥75 bar): CA-14-A still ratifies cleanly — Phase B prerequisite becomes the fifth gate while the score threshold stays at the existing ≥75 band. No CA-14 text changes needed.

**If Panel RATIFIES CA-13-A** (adopts ≥95 bar): CA-14-A's reference to "the canonical band threshold (per ENTRY 006: ≥75; per pending CA-13-A: ≥95)" resolves to ≥95 at promotion-commit; CA-14 text is updated inline at that time.

---

## Panel Questions for W6 (Locked Rule 17 — mandatory pre-CEO Panel review)

**Eleven questions total: 4 for CA-14-A, 3 for CA-14-B, 2 for CA-14-C, 2 for CA-14-D.**

### CA-14-A Panel Questions (4)

**CA-14-A-Q1 — Phase B prerequisite ratification.**
Should §11 Clearance Step 5 require Phase B Adversarial Surface Testing as a hard prerequisite (per CEO directive 2026-05-18)?

- (a) Ratify as drafted — Phase B is a hard gate; failure blocks Step 5.
- (b) Ratify with reduced scope — Phase B is mandatory only for products in `prd` environment; `staging` + `dev` may pass with Phase A only.
- (c) Ratify with operator opt-in — Phase B defaults to mandatory but operator (admin role) may explicitly opt out per product with audit-logged justification.
- (d) Reject — Phase A is sufficient; the four-prerequisite gate from ENTRY 006 stays; Phase B may surface as advisory signal without blocking.
- (e) INSUFFICIENT_INFORMATION.

**CA-14-A-Q2 — LIMITATIONS disclosure verbatim phrase.**
CA-14-A specifies a verbatim disclosure for Phase-A-only deliveries: *"This §7.6 score reflects surface verification only. Interactive flows (authenticated paths, error-state recovery, engine adversarial probes) were not exercised. This score is NOT a functional certification."* Right wording?

- (a) Ratify as drafted.
- (b) Ratify with operator-paraphrase permission — same intent, operator may rewrite (subject to admin review).
- (c) Adopt a shorter form — e.g. *"§7.6 score reflects surface verification only; NOT a functional certification."*
- (d) Adopt no verbatim wording — require disclosure but let operator phrase.
- (e) INSUFFICIENT_INFORMATION.

**CA-14-A-Q3 — Phase B implementation owner.**
CA-14-A specifies Phase B as a prerequisite but does not assign an implementation owner. Should:

- (a) Agent #21 ACE Conductor expand to own Phase B (extends ENTRY 006 charter).
- (b) NEW Agent #8 Quality Audit owns Phase B (Phase B is interactive-verification, conceptually closer to QA).
- (c) NEW Ops Runner role (one of #22/#24/#25 pending §27 OQ-2) owns Phase B as its canonical charter.
- (d) Defer ownership — CA-14-A canonizes the requirement; engineering dispatch picks the owner in a follow-up.
- (e) INSUFFICIENT_INFORMATION.

**CA-14-A-Q4 — Locked Rule 19 addition.**
Should CA-14-A add Locked Rule 19 ("Phase A vs Phase B — DO NOT CONFLATE") to §25?

- (a) Ratify Locked Rule 19 as drafted.
- (b) Ratify but defer Rule 19 numbering — CA-14 has multiple Locked-Rule candidates; consolidate at end of CA cycle.
- (c) Reject Locked Rule 19 — the §6.10 + §7.6 + §7 LIMITATIONS amendments are sufficient; no new Locked Rule needed.
- (d) Modify Rule 19 wording (specify).
- (e) INSUFFICIENT_INFORMATION.

### CA-14-B Panel Questions (3)

**CA-14-B-Q1 — Five-invariant fix-safety contract ratification.**
Should §7 Output Contract item #6 (the five invariants: diff-only / preserve / parse / regression-guard / attribution) be ratified as drafted?

- (a) Ratify all 5 invariants as drafted.
- (b) Ratify 4 invariants; drop one (specify which).
- (c) Ratify with expansion — add a 6th invariant (e.g. test-suite gate before PR).
- (d) Reject — the invariants belong in `SELF_RENEWAL_SPEC.md` not in canonical SSOT.
- (e) INSUFFICIENT_INFORMATION.

**CA-14-B-Q2 — Canonical guarantee wording.**
The canonical guarantee reads: *"FlowAI NEVER ships a fix that regresses §7.6 score OR introduces new `critical`/`high` findings. It refuses the PR and exits `NO_IMPROVEMENT`."* Right wording?

- (a) Ratify as drafted.
- (b) Soften to "rarely ships" — acknowledges edge cases.
- (c) Strengthen with operator-override clause — "...UNLESS operator (admin role) explicitly overrides with audit-logged justification."
- (d) Modify (specify).
- (e) INSUFFICIENT_INFORMATION.

**CA-14-B-Q3 — §10 placement of §10.4.**
CA-14-B adds §10.4 "Fix-Safety invariants". Right placement in §10 Self-Governance Layer, or should it live elsewhere?

- (a) Ratify §10.4 placement.
- (b) Move to §12 Remediation Modes (more directly about the fix path).
- (c) Move to §19 Governance (alongside 95/95 + Panel + SSOT Access).
- (d) Cross-list (live in §10.4 AND cross-referenced from §12 + §19).
- (e) INSUFFICIENT_INFORMATION.

### CA-14-C Panel Questions (2)

**CA-14-C-Q1 — Five-Layer-is-telemetry-only ratification.**
Should the canonical text explicitly state that the Five-Layer Intelligence Framework is **telemetry only**, not a remediation prioritizer?

- (a) Ratify as drafted — §6.10 + §7.6 paragraphs canonical.
- (b) Ratify with stronger language — "Five-Layer tags MUST NOT influence remediation ordering" (explicit prohibition vs. "DO NOT influence").
- (c) Reject — the Five-Layer framework's role is already implicit in Locked Rule 6 ("tagging"); the clarification is redundant.
- (d) Modify (specify).
- (e) INSUFFICIENT_INFORMATION.

**CA-14-C-Q2 — Pipeline Step 6 (govern) wording.**
The pipeline (§9) Step 6 doesn't currently specify the prioritization source. Should CA-14-C add an explicit Step 6 row note?

- (a) Add a Step 6 note in §9 referencing §7.6 findings as the prioritization source.
- (b) Add the note only if the §9 step-row table format permits.
- (c) Don't touch §9 — the §6.10 + §7.6 amendments are sufficient.
- (d) Modify (specify).
- (e) INSUFFICIENT_INFORMATION.

### CA-14-D Panel Questions (2)

**CA-14-D-Q1 — Three operational invariants ratification.**
Should §7.5.1 (branch-of-record + ProductSSOT seeding + atomic-audit-write) be ratified as drafted?

- (a) Ratify all 3 invariants as drafted.
- (b) Ratify 2; drop one (specify).
- (c) Ratify with expansion — e.g. add a 4th invariant on per-product `selfRenewalCredentialMode` enumeration.
- (d) Reject — §7.5 already covers ProductSSOT; the operational invariants belong in engineering spec not canonical.
- (e) INSUFFICIENT_INFORMATION.

**CA-14-D-Q2 — Per-product seed migration completion.**
CA-14-D Invariant 2 lists FlowAI + MyPregLife as seeded; remaining 4 VEU products (SAIGE, ReachSMS, RelTwin, PressAI) pending. Should:

- (a) Block CA-14 ratification until all 5 VEU products are seeded.
- (b) Ratify CA-14 with explicit acceptance criterion: remaining 4 products seeded within N days post-ratification.
- (c) Ratify CA-14 immediately; remaining 4 products seeded per operator-driven dispatch order.
- (d) Modify (specify).
- (e) INSUFFICIENT_INFORMATION.

---

## Acceptance criteria for CA-14 ratification

- W6 ratification ≥7/10 ENGAGED on each of the 11 Panel questions above.
- Engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6.
- CEO disposition per Locked Rule 13 (CEO retains absolute veto).
- If all 11 ratify (a)-clean, CA-14 promotes as a single CA cycle covering all 4 sub-amendments.
- Joint W6 session with CA-13 recommended per §CA-14-E.
- If Panel splits per sub-amendment, ratified halves promote independently per §18.4 entry rules.
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA14-promotion-<date>.md` per §18.3.

---

*End of CA-14 draft. Pending W6 Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18). Doc-only; canonical files NOT amended in this commit per CA-n cycle discipline.*
