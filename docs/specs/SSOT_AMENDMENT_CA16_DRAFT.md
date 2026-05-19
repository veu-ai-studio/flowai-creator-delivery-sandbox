# SSOT Amendment Draft — CA-16 (Proactive Improvement Recommendations + Redesign/Build Environment + Multi-Format Targets)

**Status:** DRAFT — pending W6 Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18).
**Author:** W3, 2026-05-18 (late session, post-CA-15 commit `b953388`).
**Anchor canonical SSOT:** `docs/CANONICAL_REFERENCE.md` (Rev-2.1 + ENTRY 003–010 cumulative; §18.4 ratified-amendments table ends at ENTRY 006).

**Why CA-16 (true next free number, evidence chain):**
- CA-11 — draft only, Panel-reviewed but NOT ratified, NOT in §18.4.
- CA-12 — draft only, 3× NOT_RATIFIED, NOT in §18.4.
- CA-13 — draft `81cf144`; joint Panel `8e185a6` engagement-gated; PARKED; NOT in §18.4.
- CA-14 — draft `fae9ff3`; joint Panel `8e185a6` engagement-gated; PARKED; NOT in §18.4.
- CA-15 — draft `b953388` (this session AM/PM, Multi-Dim Quality Audit + Purpose Capture + Purpose-Driven Optimization + SSOT-Conformance Gate); awaiting W6 Panel.
- CA-16 — NO file exists in `docs/specs/SSOT_AMENDMENT_CA*` as of `acb902c` HEAD (verified via `ls`). Next free number.
- §18.4 ratified-amendments table still ends at ENTRY 006 (ACE); no CA-11..CA-16 entries.

**Independence from CA-13 / CA-14 / CA-15 (explicitly required by dispatch):**
- CA-13 amends: §7.6 score bands (75→95); §15 / §15.1 rows 21+26 (CA-9-Q4 wording).
- CA-14 amends: §6 (Phase A vs B), §7.6 (Phase B prerequisite), §11 Step 5 (Phase B gate), §7 item #6 (safety invariants), §10.4 NEW (fix-safety), §12 (mode iv), §7.5.1 NEW (operational invariants), §25 Rule 19 NEW.
- CA-15 amends: §10.1.1 NEW (7-axis Multi-Dim audit), §7.5 7th block `purpose_record` NEW, §11 Step 1 + Step 5 (purpose-record + purpose-fulfillment), §7 item #7 (purpose-driven north-star), §27 NEW (SSOT-Conformance Gate).
- CA-16 amends: §6 (Multi-Format detection + crawl generalization), §7.6 (Multi-Format score-formula extension), §11 NEW Step 1.5 (proactive recommendation surfacing), §7 NEW item #8 (proactive recommendation contract), §15.1 NEW row 27 OR Agent #21 expansion (Multi-Format owner; pending Q-disposition), §17 NEW (Redesign/Build Environment), §28 NEW (extends ENTRY 005 Symbiotic Feed-Back Loop with multi-format envelopes).
- **Zero substantive overlap** with CA-13 / CA-14 / CA-15. CA-16 cross-references CA-15 outputs (`purpose_record` per CA-15-B; `purpose_fulfillment_score` per CA-15-C) but ratifies INDEPENDENTLY — if CA-15 doesn't ratify, CA-16's references resolve to "the canonical purpose-record block when ratified".

**Lineage:** Rev-2.1 (`9495b26`) → ENTRY 003 → ENTRY 004 (CA-7+CA-8) → ENTRY 005 (CA-9+CA-10) → ENTRY 006 (ACE) → ENTRY 007 (auth-traversal) → ENTRY 008 (MessageBus P0) → ENTRY 009 (CA-9-Q4 Option (a) LOCKED) → ENTRY 010 (Phase A live) → ENTRY 011 draft (`def560d`, D27–D38) → CA-13 draft (`81cf144`) → CA-14 draft (`fae9ff3`) → joint Panel parked (`8e185a6`) → Wave-1 v2 re-ratification (`9b67ac0`) → migrations 0021+0022 (`46eb051`+`7235016`) → D39–D41 Phase B implementation arc (`90210d0`→`ed0d779`) → CA-15 draft (`b953388`) → ENTRY 012 draft (`acb902c`) → W6 capability roadmap consultation (`8be2524`) → CEO directive 2026-05-18 (proactive recommendations + redesign environment + multi-format targets) → this CA-16 draft.

**Three bundled amendments (NET-NEW scope, distinct from CA-13/14/15):**
- **CA-16-A** — Proactive Improvement Recommendations: FlowAI surfaces high-value improvements the user did NOT request or anticipate (beyond defect remediation), ranked, with rationale tied to `purpose_record`.
- **CA-16-B** — Redesign/Build Environment: a user-facing environment to redesign/rebuild a submitted product, operator-steerable.
- **CA-16-C** — Multi-Format Targets: websites, native apps, mobile apps, SaaS, agentic AIs, +generic URLs as first-class submission/output targets. Detection / crawl / Phase B / build generalization per target class.

All three written in **conformance-testable terms** per CEO instruction — the SSOT IS the acceptance specification (per CA-15-D §27 NEW SSOT-Conformance Gate, cross-referenced).

---

## CA-16-A — Proactive Improvement Recommendations

### Rationale

Existing canonical surfaces produce DEFECT REMEDIATION: §6 detector findings → §7.6 score → Self-Renewal Executor fixes (per CA-14-B safety invariants when ratified). This is reactive — every finding starts as a problem the crawler identified.

CEO directive 2026-05-18: FlowAI should ALSO surface high-value improvements the user did NOT request or anticipate (beyond defect remediation). Example: the operator submits a chatbot product whose `purpose_record` says "drive prospect-to-demo conversion". FlowAI may detect: (i) no demo CTA on the chatbot's response when intent matches "evaluating"; (ii) no calendar embed for self-serve booking; (iii) no follow-up email opt-in. None of these are DEFECTS (no detector triggered); they are PROACTIVE IMPROVEMENTS aligned with purpose-fulfillment per CA-15-C `purpose_fulfillment_score`.

This amendment introduces the canonical proactive-recommendation surface alongside the existing defect-remediation flow.

### §7 — Output Contract (amendment — add item #8)

```markdown
8. **Proactive Improvement Recommendations (CA-16-A canonical).** In
   addition to the §6 / §7.6 defect-driven findings + §10.1.1 Multi-Dim
   Quality Audit findings (per CA-15-A), every pipeline run produces a
   canonical PROACTIVE RECOMMENDATIONS envelope:

   - **Topic:** `agent.proactive_recommendation.v1` (added to Cluster D
     Deferred set per CA-16-A; emits once per run after §7.6 score
     computed; consumed by `/architecture` + operator UI).
   - **Payload schema:**
     ```json
     {
       "kind": "agent.proactive_recommendation.v1",
       "runId": string,
       "productId": string,
       "at": ISO8601,
       "purpose_alignment": {
         "purpose_record_ref": string,    // pointer to current purpose_record (per CA-15-B)
         "alignment_summary": string      // 1-2 sentence LLM summary
       },
       "recommendations": [
         {
           "id": string,                  // ULID, stable across runs
           "title": string,               // ≤80 chars
           "category": "purpose_fulfillment_gap"
                     | "market_definition_gap"
                     | "competitive_signal"
                     | "compound_opportunity"
                     | "format_extension"
                     | "other",
           "severity": "high" | "medium" | "low",
           "rank": integer,               // 1 = highest-value; ranked across all categories
           "rationale": {
             "purpose_record_link": string,    // explicit cite to purpose_record clause
             "market_definition_link": string, // explicit cite to §1.1 market def
             "evidence": [                     // 1-3 evidence items
               {
                 "kind": "crawl_observation" | "panel_signal" | "ssot_gap" | "comparable_product",
                 "summary": string,
                 "reference_path": string      // e.g. crawl page URL, panel-consultation file, comparable product id
               }
             ]
           },
           "expected_impact": {
             "purpose_fulfillment_delta": number,    // estimated delta to purpose_fulfillment_score per CA-15-C; in [-1.0, 1.0]
             "score_delta_7_6_estimate": number,    // estimated delta to §7.6 if implemented; integer points
             "confidence": number                   // [0.0, 1.0]
           },
           "implementation_hint": {
             "kind": "redesign" | "build" | "configure" | "content" | "integration",
             "effort_band": "S" | "M" | "L" | "XL",
             "redesign_environment_ref": string | null   // pointer into CA-16-B environment (CA-16-B-Q1 disposition)
           },
           "operator_disposition": "pending" | "accepted" | "deferred" | "rejected",
           "operator_disposition_at": ISO8601 | null,
           "operator_disposition_rationale": string | null
         }
       ],
       "total_ranked": integer,
       "withheld_count": integer       // recommendations that exist but ranked below the operator's surfacing threshold
     }
     ```

   **CONFORMANCE-TEST ACCEPTANCE CRITERIA (CA-16-A canonical):**

   PA-1. **Purpose-alignment mandatory.** Every recommendation MUST cite
      a non-null `rationale.purpose_record_link` AND `rationale.market_definition_link`.
      Test: stub a recommendation with both null; assert the envelope
      validation rejects with `proactive_recommendation_unanchored.v1`
      (added to Cluster D Deferred set per CA-16-A). No unanchored
      recommendations may emit.

   PA-2. **Ranked ordering.** The `recommendations[]` array MUST be
      sorted by `rank` ascending (rank 1 first). Test: emit recommendations
      with shuffled ranks; assert validation rejects or canonicalizes
      to sorted order.

   PA-3. **Distinct from defect findings.** Recommendations MUST NOT
      duplicate a finding already in §7.6 / §10.1.1. Test: synthesize
      a defect finding (e.g. "broken modal at /pricing") and a recommendation
      with title "broken modal at /pricing"; assert the recommendation
      is rejected (or rewritten to acknowledge the defect path) by
      a deduplication invariant.

   PA-4. **Operator disposition lifecycle.** Every emitted recommendation
      gets an `id` (ULID) that persists across runs. Subsequent runs
      MUST honor operator dispositions: `rejected` → not re-surfaced;
      `deferred` → re-surfaced after operator-configurable delay
      (default 30 days; `product_registry.proactive_recommendation_defer_days`,
      bounds [7, 180]); `accepted` → tracked through implementation +
      verification cycle; `pending` → re-surfaced until operator acts.
      Test: post a `rejected` disposition; re-run pipeline; assert
      the recommendation is NOT re-surfaced.

   PA-5. **Surfacing threshold operator-configurable.** Operator sets
      `product_registry.proactive_recommendation_min_rank` (integer,
      default null = surface all; bounds [1, 50]). Recommendations
      with rank > threshold are recorded in `governance_record_entry`
      but NOT surfaced to operator UI. `withheld_count` reports how
      many were filtered. Test: set threshold = 5; emit 10
      recommendations; assert 5 surfaced + `withheld_count: 5`.

   PA-6. **Purpose-fulfillment-gap recommendations REQUIRED when
      `purpose_fulfillment_score < 1.0`.** When CA-15-C
      `purpose_fulfillment_score` is below 1.0, the envelope MUST
      contain at least 1 recommendation in category
      `purpose_fulfillment_gap` UNLESS the gap is structurally
      unaddressable (LLM analysis explicitly flags
      `unaddressable_within_current_purpose`). Test: stub
      `purpose_fulfillment_score: 0.6`, no `purpose_fulfillment_gap`
      recommendations, no `unaddressable_within_current_purpose` flag;
      assert validation rejects.
```

### §11 — NEW Step 1.5 in Six-Step Clearance Protocol (Proactive Recommendation Surfacing)

The §11 protocol currently has 6 sequential steps (Governance Audit / Launch Readiness / White-Label / Data Export / Demo Readiness / Final Sign-Off). CA-16-A inserts a NEW Step 1.5 between Step 1 and Step 2 — operator reviews proactive recommendations BEFORE Launch Readiness:

```markdown
### 11.5 Step 1.5 — Proactive Recommendation Review (CA-16-A canonical)

After Step 1 Governance Audit clears AND `purpose_record` is present per
CA-15-B, the operator is presented with the canonical proactive
recommendations envelope (per §7 item #8). The operator disposes of
each recommendation (accept / defer / reject) BEFORE Step 2 Launch
Readiness proceeds.

Step 1.5 is **non-blocking**: operator may defer all recommendations
and proceed to Step 2. But the recommendations + dispositions are
recorded in `governance_record_entry` and re-surfaced at subsequent
runs per PA-4.

The Step 1.5 UI lives at `/clearance/proactive` (new route per CA-16-A
follow-up engineering dispatch). The /architecture surface (§16) also
shows the current run's proactive recommendations alongside §7.6 score
+ findings.

**CONFORMANCE-TEST ACCEPTANCE CRITERIA:**

PR-1. **Step 1.5 follows Step 1 + purpose_record.** Pipeline cannot
   reach Step 1.5 if Step 1 fails OR `purpose_record` missing. Test:
   stub Step 1 failure; assert Step 1.5 not reached.

PR-2. **Step 1.5 non-blocking on defer.** Operator defers all
   recommendations; assert Step 2 Launch Readiness proceeds.

PR-3. **Disposition persistence.** Operator dispositions recorded in
   `governance_record_entry` with kind `proactive_recommendation_disposition.v1`
   and re-surfaced per PA-4.
```

---

## CA-16-B — Redesign/Build Environment

### Rationale

Self-Renewal Executor (per ENTRY 010 + CA-14 parked) produces small-step fixes against an EXISTING product. CA-16-A surfaces proactive recommendations that often suggest LARGER-step changes — e.g. "add a redesigned pricing page", "rebuild the chatbot onboarding flow". The current FlowAI surface has no canonical environment for the operator to STEER a redesign or rebuild from a recommendation through to implementation.

CEO directive 2026-05-18: introduce a user-facing environment to redesign/rebuild a submitted product, operator-steerable.

### §17 — NEW Section (Redesign / Build Environment)

`docs/CANONICAL_REFERENCE.md` currently ends at §28 (Symbiotic Feed-Back Loop per CA-10-D). CA-16-B inserts a new section. Numbering note: §17 in current SSOT was Self-Renewal Alerts UX-C sidebar footnote (per Locked Rule 4 axis labels per ENTRY 003). To avoid renumbering existing sections, CA-16-B adds the NEW Redesign/Build Environment as **§29** (after §28 Symbiotic Feed-Back Loop). Section numbering preference is Q-disposed per CA-16-B-Q1.

```markdown
## 29. REDESIGN / BUILD ENVIRONMENT (CA-16-B canonical)

The Redesign/Build Environment is a canonical operator-facing surface that
lets the operator steer FlowAI through a redesign or rebuild cycle. Distinct
from the Self-Renewal Executor's small-step fix-and-PR loop (which produces
incremental fixes against the existing product), the Redesign Environment
handles LARGER-step changes: page redesigns, flow rebuilds, format
extensions (per CA-16-C), and proactive-recommendation implementations
(per CA-16-A).

### 29.1 Canonical surfaces

- **UI route:** `/redesign/<productId>` (new route per CA-16-B follow-up
  engineering dispatch).
- **Per-product entity:** `RedesignSession` (new table per CA-16-B
  schema migration; columns enumerated in §29.4).
- **Operator role gate:** admin OR operator may initiate; only admin may
  approve final implementation per §13 + §10.2 Approval Gate analog.
- **MessageBus topics (added to Cluster D Deferred set per CA-16-B):**
  `redesign.session_started.v1`,
  `redesign.proposal_emitted.v1`,
  `redesign.operator_steered.v1`,
  `redesign.implementation_committed.v1`,
  `redesign.session_completed.v1`,
  `redesign.session_aborted.v1`.

### 29.2 Session lifecycle

A `RedesignSession` has 5 canonical states:

| State | Transition trigger | What's recorded |
|---|---|---|
| `initiated` | Operator clicks "Redesign" on a recommendation OR submits a freeform redesign brief | Session id, productId, source (recommendation_id OR freeform_brief), initiator role + identity, started_at |
| `proposal_drafted` | FlowAI produces a redesign proposal (LLM + multi-AI Panel synthesis); operator reviews | Proposal envelope, alternative options (≥2 per CA-16-B-Q2), evidence trail, expected purpose-fulfillment delta |
| `operator_steered` | Operator modifies the proposal (accept option X / merge options Y+Z / request revision) | Operator's modifications + rationale; FlowAI re-drafts; loop back to `proposal_drafted` until accepted |
| `implementation_in_progress` | Operator approves final proposal; FlowAI dispatches Self-Renewal Executor to implement | Implementation runId, branch (per CA-14-D `self_renewal_branch`), PR url, deploy preview url |
| `completed` OR `aborted` | Implementation merges (completed) OR operator aborts (aborted) | Final disposition, post-implementation §7.6 score, post-implementation `purpose_fulfillment_score`, audit trail |

### 29.3 Operator steering primitives

The operator's steering surface MUST support at minimum:

- **Accept option X.** Operator picks one alternative.
- **Merge options Y+Z.** Operator requests synthesis of two alternatives.
- **Request revision with note.** Operator provides natural-language guidance; FlowAI re-drafts.
- **Constrain scope.** Operator narrows the redesign (e.g. "only the pricing page", "preserve the existing color palette"). Constraints persist for the session.
- **Veto change.** Operator marks a proposed change as off-limits; FlowAI drops that thread.
- **Abort session.** Operator ends the session without implementation; session marked `aborted` with rationale.

### 29.4 RedesignSession schema (canonical)

```sql
CREATE TABLE redesign_session (
  id                          uuid PRIMARY KEY,
  product_id                  text NOT NULL REFERENCES product_registry(product_id),
  state                       text NOT NULL CHECK (state IN ('initiated','proposal_drafted','operator_steered','implementation_in_progress','completed','aborted')),
  source                      jsonb NOT NULL,  -- {kind: 'recommendation' | 'freeform_brief', value: ...}
  initiator                   jsonb NOT NULL,  -- {role: 'admin'|'operator', identity: text}
  current_proposal            jsonb,           -- current redesign-proposal envelope
  proposal_history            jsonb[],         -- append-only history of proposals + operator-steering events
  pre_score_7_6               integer,
  pre_purpose_fulfillment     numeric(3,2),
  post_score_7_6              integer,
  post_purpose_fulfillment    numeric(3,2),
  implementation_run_id       text,
  implementation_branch       text,
  implementation_pr_url       text,
  preview_url                 text,
  completed_at                timestamptz,
  aborted_at                  timestamptz,
  abort_rationale             text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
```

### 29.5 Conformance-test acceptance criteria

RB-1. **Operator-steerability mandatory.** Every redesign proposal MUST
   support at minimum the 6 steering primitives in §29.3. Test: invoke
   the surface; assert all 6 primitives are exposed as operator actions
   in the UI + API.

RB-2. **Multi-option proposals.** Every `proposal_drafted` state MUST
   include at least 2 alternative options. Test: stub a single-option
   proposal; assert validation rejects with
   `redesign_proposal_insufficient_alternatives.v1`.

RB-3. **Purpose-alignment per proposal.** Every redesign proposal MUST
   cite the `purpose_record` clause it addresses + the expected
   `purpose_fulfillment_score` delta. Test: stub a proposal with no
   purpose alignment; assert validation rejects.

RB-4. **Session history immutable + auditable.** `proposal_history`
   appends per operator-steering event; never overwrites prior entries.
   Test: invoke 5 steering events; assert `proposal_history` has 5
   entries in chronological order.

RB-5. **Implementation through Self-Renewal Executor.** When session
   transitions to `implementation_in_progress`, FlowAI dispatches via
   Self-Renewal Executor — the SAME path as recommend-only fixes
   (per CA-14-B safety invariants when ratified). Test: assert the
   dispatch path matches Self-Renewal Executor's canonical entry; no
   bespoke implementation pathway exists.

RB-6. **Post-implementation verification.** After `completed`, the
   session row MUST have both `post_score_7_6` AND `post_purpose_fulfillment`
   populated. Test: stub a completed session with null post-scores;
   assert validation rejects.

RB-7. **Admin-gated approval.** Operator may steer but only admin may
   approve final implementation (transition from `operator_steered` →
   `implementation_in_progress`). Test: invoke approval as operator role;
   assert 403.
```

---

## CA-16-C — Multi-Format Targets

### Rationale

FlowAI's current SSOT assumes web targets — §6 Aggressive Crawl Engine, §7.6 GTM Readiness, Phase B adversarial testing (per CA-14-A parked, but D39–D41 implementation shipped) all assume a browseable URL. The 5 VEU products are all web/SPA, so this assumption has held.

CEO directive 2026-05-18: FlowAI must handle websites, native apps, mobile apps, SaaS, agentic AIs, AND URLs of any kind as first-class submission/output targets — not web-only. Each target class needs canonical generalization of detection, crawl, Phase B, and build.

### §6 — NEW §6.11 Multi-Format Target Classes

```markdown
### 6.11 Multi-Format Target Classes (CA-16-C canonical)

FlowAI handles SIX canonical target classes as first-class submission/output
targets. Each class declares its detection method, crawl/discovery method,
Phase B adversarial method (CA-14-A reference; parked but implementation
shipped per D39–D41), and build/redesign method.

The target class for a submission is captured in
`product_registry.target_class` (NEW column per CA-16-C; one of the 6
canonical values below; default `web`).

#### 6.11.1 Six canonical target classes

| Class | Submission inputs accepted | Detection | Crawl/discovery | Phase B adversarial | Build/redesign |
|---|---|---|---|---|---|
| **`web`** | URL (http/https) | URL scheme http/https + DNS resolves + HTML response | ACE Phase A spider per ENTRY 006 §6 (full multi-page crawl) | Browser-driven interactive probes per CA-14-A / D39–D41 (probeAllPages, modals, forms, AI-agent probes) | Self-Renewal Executor (web codebase fork-and-fix per ENTRY 010) |
| **`mobile_app`** | App Store URL OR Play Store URL OR raw IPA/APK OR app id (e.g. `com.example.app`) | Store URL pattern match OR file mime-type OR app-id schema | Store-listing crawl + screenshot OCR + app-store metadata API + (when feasible) emulator-driven launch + capability survey | Emulator-driven interactive flows (Appium/Detox/equivalent) — same conceptual passes as web Phase B but against emulator runtime | Native rebuild via codebase-fork (if operator-owned source) OR app-store-listing-redesign (when source unavailable) |
| **`native_app`** | macOS/Windows/Linux app binary URL OR downloadable installer OR app id | OS-platform schema + downloadable executable + signature check | Static analysis of binary + (when feasible) sandboxed launch + capability survey + UI screenshot capture | Sandbox-driven interactive flows (UI automation per platform — Accessibility API on macOS; UI Automation on Windows; AT-SPI on Linux) — same conceptual passes as web Phase B against sandbox runtime | Source-code rebuild (if operator-owned) OR static-asset redesign (icons, marketing) when source unavailable |
| **`saas`** | SaaS console URL (typically a web URL but with multi-tenant auth gate) + admin credentials OR API key | URL pattern OR explicit operator declaration (`product_registry.target_class = 'saas'`) | Authenticated tenant-scoped crawl (per AUTH_TRAVERSAL_SECURITY_SPEC v3) + API endpoint discovery + admin-console schema introspection | Authenticated Phase B (tenant-scoped adversarial probes; per-feature flag probes; multi-tenant isolation tests) | Configuration changes via admin API + (when codebase available) source-level rebuild via Self-Renewal Executor |
| **`agentic_ai`** | Chat URL OR API endpoint OR text-input/text-output interface declaration | API spec OR conversational UI markers OR explicit operator declaration | Conversational probe sequence — structured input set (test corpus per agentic-AI behavior dimensions) + adversarial prompt set | Adversarial prompt-injection probes + jailbreak tests + persona-consistency tests + refusal-mode verification + tool-call schema validation | Prompt-engineering changes (system prompt, few-shot examples) + (when operator-owned) model-fine-tune dispatch via the orchestration platform |
| **`generic_url`** | Any URL not matching the above 5 classes (e.g. file download, RSS feed, RESTful API, custom protocol) | Catch-all: URL scheme + content-type sniff + manual operator override | Best-effort fetch + content classification + LLM characterization of content | Phase B applies only when interactivity meaningful (e.g. API endpoints get adversarial-input probes); otherwise N/A — recorded as `phase_b_pass: not_applicable` in the conformance envelope | Format-specific: API endpoint → schema redesign; static content → content rewrite; etc. |

#### 6.11.2 Detection contract

The submission-onboarding path MUST detect target class deterministically:

```pseudocode
async function detectTargetClass(submission) {
  if (submission.url) {
    if (matchesAppStorePattern(submission.url)) return 'mobile_app';
    if (matchesPlayStorePattern(submission.url)) return 'mobile_app';
    if (await fetchOk(submission.url) && contentType.startsWith('text/html')) {
      if (await detectMultiTenantAuthGate(submission.url)) return 'saas';
      if (await detectChatUI(submission.url)) return 'agentic_ai';
      return 'web';
    }
    if (await fetchOk(submission.url) && contentType.startsWith('application/json')) {
      return 'agentic_ai';   // likely API endpoint
    }
    return 'generic_url';
  }
  if (submission.binary) {
    if (isAndroidPackage(submission.binary)) return 'mobile_app';
    if (isAppleIPA(submission.binary)) return 'mobile_app';
    if (isWindowsExecutable(submission.binary) || isMacOsApp(submission.binary) || isLinuxBinary(submission.binary)) return 'native_app';
    return 'generic_url';
  }
  if (submission.app_id) {
    if (matchesAndroidAppId(submission.app_id)) return 'mobile_app';
    if (matchesAppleAppId(submission.app_id)) return 'mobile_app';
    return 'native_app';
  }
  // Operator manual declaration
  if (submission.target_class_declared) return submission.target_class_declared;
  throw new Error('CA-16-C: target class undetectable; operator must declare via product_registry.target_class');
}
```

#### 6.11.3 §7.6 score-formula generalization

The §7.6 formula (per ENTRY 006: `score = 100 − 10·crit − 5·high − 2·med − 0.5·low`) generalizes to all 6 target classes UNCHANGED. What changes is the **finding source set** per class:

- `web` — §6 detector set per ENTRY 006 + CA-15-A multi-dim axes.
- `mobile_app` — store-listing detector set (broken screenshots, missing descriptions, accessibility metadata gaps) + emulator-driven Phase B findings + CA-15-A multi-dim axes applied to operator-facing strings.
- `native_app` — binary-analysis detector set (signature issues, capability over-claims, missing accessibility) + sandbox Phase B findings + CA-15-A.
- `saas` — web detector set + multi-tenant isolation findings + admin-console-schema findings + CA-15-A.
- `agentic_ai` — conversational behavior findings (refusal-mode failures, persona drift, prompt-injection vulnerabilities, off-purpose responses) + CA-15-A applied to agent's emitted text.
- `generic_url` — content-classification-specific findings (e.g. API endpoint → schema-quality findings; static content → CA-15-A multi-dim axes).

#### 6.11.4 Conformance-test acceptance criteria (CA-16-C canonical)

MF-1. **Target class persisted.** `product_registry.target_class` populated
   on every product row; default `web`; one of the 6 canonical values.
   Test: insert a product with `target_class: 'invalid'`; assert
   constraint-check rejects.

MF-2. **Detection deterministic.** `detectTargetClass()` returns the same
   class for the same input (no LLM-non-determinism in the detection
   path). Test: invoke 100 times against same input; assert single
   class returned every time.

MF-3. **Per-class crawl invariants.** Each class's crawl/discovery
   method produces findings in the canonical §7.6 finding schema (per
   ENTRY 006 line 186 detector envelope shape). Test: invoke crawl
   for each of 6 classes against a test corpus; assert all 6 emit
   findings in the same envelope shape.

MF-4. **Per-class Phase B invariants.** Each class's Phase B method
   produces a `phase_b_pass` boolean + finding list (per CA-14-A
   reference, even when CA-14-A is parked). For `generic_url` content
   without interactivity: `phase_b_pass: not_applicable` is valid.
   Test: invoke Phase B for each class; assert envelope conforms.

MF-5. **Per-class build/redesign path.** Each class's build path
   integrates with Self-Renewal Executor OR the CA-16-B Redesign
   Environment, NOT a bespoke-per-class pathway. Test: assert each
   target class's build dispatch routes through one of those two
   canonical entry points.

MF-6. **Multi-format envelopes carry `target_class`.** Every envelope
   produced by Multi-Format pipeline (§6 / §7.6 / proactive
   recommendations / redesign sessions) carries `target_class` field
   with one of the 6 canonical values. Test: emit each envelope kind
   for each class; assert field is present + valid.

MF-7. **Operator target-class override.** Operator (admin role) may
   explicitly set `target_class` in `product_registry`; this overrides
   `detectTargetClass()`. Test: operator sets `target_class: 'agentic_ai'`;
   detection function would have returned `web`; assert override wins.
```

### §15.1 — Multi-Format Ownership Disposition (Q-disposed)

CA-16-C-Q3 disposes the ownership question. Option (a) — Agent #21 ACE Conductor expands charter to own all 6 target classes (currently owns `web`). Option (b) — NEW per-target-class agents added to §15.1 (Agent #27 Multi-Format Conductor + per-class sub-agents). Option (c) — Hybrid (#21 owns `web` + `saas`; new Agent #27 owns `mobile_app` + `native_app` + `agentic_ai` + `generic_url`). Option (d) — defer ownership; engineering dispatch picks at first multi-format implementation.

Pending Panel disposition, the canonical text uses placeholder language: "Multi-Format Target ownership per CA-16-C-Q3 disposition (TBD)."

### §28 — Extension (Symbiotic Feed-Back Loop carries `target_class`)

ENTRY 005 CA-10-D §28 Symbiotic Feed-Back Loop carries data flow envelopes. CA-16-C extends: every envelope in the loop carries `target_class`. **No new section; clarification only.**

---

## §CA-16-D — Independence + cross-references

### Independence from CA-13 / CA-14 / CA-15

CA-16 amends DIFFERENT sub-sections than CA-13 / CA-14 / CA-15:

| Section | CA-13 | CA-14 | CA-15 | CA-16 |
|---|---|---|---|---|
| §6 detector scope | — | §6.10 Phase A vs B | — | §6.11 NEW Multi-Format classes |
| §7.6 score | bands 75→95 | Phase B prerequisite | (folds Multi-Dim findings) | (§7.6 formula UNCHANGED; generalizes finding-source per target class) |
| §7 Output Contract | — | NEW item #6 (safety invariants) | NEW item #7 (purpose north-star) | NEW item #8 (proactive recommendations) |
| §10 Self-Governance | — | NEW §10.4 (fix-safety) | NEW §10.1.1 (Multi-Dim audit) | — |
| §7.5 ProductSSOT | — | NEW §7.5.1 (operational invariants) | NEW 7th block `purpose_record` | (target_class lives in `product_registry`, not ProductSSOT) |
| §11 Clearance | Step 5 score threshold | Step 5 Phase B prereq | Step 1 + Step 5 purpose | NEW Step 1.5 (Proactive Recommendation Review) |
| §12 Remediation | — | mode (iv) safety reference | — | — |
| §15 / §15.1 | rows 21+26 wording | — | row 8 charter expansion | Multi-Format ownership (Q-disposed; row 21 OR new row 27) |
| §17 / §29 | — | — | — | NEW §29 (Redesign/Build Environment) |
| §25 Locked Rules | — | NEW Rule 19 | — | (no new Locked Rule) |
| §27 / §28 | — | — | NEW §27 (SSOT-Conformance Gate) | §28 clarification (target_class in envelopes) |

**Zero substantive overlap.** Each CA-N can ratify independently.

### Cross-references (do NOT resolve)

- **CA-15-B `purpose_record` (parked):** CA-16-A's PA-1 requires every recommendation to cite `purpose_record_link`. If CA-15-B is rejected, CA-16-A's reference resolves to "the canonical purpose-record block when ratified"; conformance test PA-1 deferred.
- **CA-15-C `purpose_fulfillment_score` (parked):** CA-16-A's `expected_impact.purpose_fulfillment_delta` cites this. Same resolution: defer if CA-15-C rejected.
- **CA-14-A Phase B (parked):** CA-16-C MF-4 references `phase_b_pass`. If CA-14-A rejected, Phase B implementation already exists in code (D39–D41 arc); MF-4 still applies but anchored to code rather than canonical text.
- **CA-13-A 95-bar (parked):** CA-16 does not reference. Independent.

---

## Panel Questions for W6 (Locked Rule 17 — mandatory pre-CEO Panel review)

**Eleven Panel questions total: 4 for CA-16-A, 3 for CA-16-B, 4 for CA-16-C.** All questions use the 4-options + INSUFFICIENT pattern per prior CA drafts.

### CA-16-A Panel Questions (4)

**CA-16-A-Q1 — `agent.proactive_recommendation.v1` envelope schema ratification.**
Should the envelope schema be ratified as drafted (purpose_alignment + ranked recommendations[] with rationale + expected_impact + implementation_hint + operator_disposition lifecycle)?

- (a) Ratify schema as drafted.
- (b) Ratify with simplification — drop `withheld_count` + `total_ranked`; drop the `confidence` field; drop the `unaddressable_within_current_purpose` flag.
- (c) Ratify with expansion — add `panel_signal_ref` per recommendation (Panel-attestation footprint).
- (d) Reject schema — proactive recommendations belong in operator UI metadata only, not in canonical envelope schema.
- (e) INSUFFICIENT_INFORMATION.

**CA-16-A-Q2 — Step 1.5 placement.**
Should §11.5 NEW Step 1.5 be inserted between Step 1 (Governance Audit) and Step 2 (Launch Readiness)?

- (a) Ratify §11.5 placement as drafted (between Step 1 + Step 2).
- (b) Place Step 1.5 AFTER Step 5 (Demo Readiness) — recommendations are post-clearance.
- (c) Place Step 1.5 BEFORE Step 1 — operator sees proactive recs before any clearance.
- (d) Reject Step 1.5 — recommendations surface continuously via /architecture, not as a Clearance step.
- (e) INSUFFICIENT_INFORMATION.

**CA-16-A-Q3 — Categories enum + extensibility.**
The recommendation `category` field has 6 enum values (purpose_fulfillment_gap / market_definition_gap / competitive_signal / compound_opportunity / format_extension / other). Right scope?

- (a) Ratify 6 categories as drafted.
- (b) Reduce to 3 (purpose_fulfillment_gap / market_definition_gap / other) — narrower scope, quarterly Panel review to promote frequent "other" subcategories.
- (c) Expand — add `accessibility_opportunity`, `i18n_opportunity`, `compliance_opportunity` as explicit categories.
- (d) Reject enum — recommendation categories are free-form strings, validated via LLM classification post-hoc.
- (e) INSUFFICIENT_INFORMATION.

**CA-16-A-Q4 — Defer-window default.**
`product_registry.proactive_recommendation_defer_days` default 30, bounds [7, 180]. Right cadence?

- (a) Ratify 30-day default, [7, 180] bounds as drafted.
- (b) Ratify with stricter bounds [14, 90].
- (c) Per-category defer windows — high severity 7 days, medium 30 days, low 90 days.
- (d) Reject configurable defer — fixed 30-day re-surfacing for all categories.
- (e) INSUFFICIENT_INFORMATION.

### CA-16-B Panel Questions (3)

**CA-16-B-Q1 — §29 section numbering.**
CA-16-B adds Redesign/Build Environment as NEW §29 (after §28). Right placement?

- (a) Ratify as §29.
- (b) Place inside §17 (Self-Renewal Alerts UX-C) since it's a UX surface.
- (c) Place inside §12 (Remediation Modes) since it's a remediation path.
- (d) NEW top-level section but at §17 (after §16 Architecture), renumbering existing §17+.
- (e) INSUFFICIENT_INFORMATION.

**CA-16-B-Q2 — Multi-option proposal floor.**
Every `proposal_drafted` MUST include at least 2 alternative options (per RB-2). Right floor?

- (a) Ratify ≥2 alternatives.
- (b) Ratify ≥3 alternatives — meaningful steering requires more options.
- (c) Per-effort-band floor — S/M can have 1+, L/XL must have ≥3.
- (d) Reject alternative-floor — single-option proposals are valid when LLM confidence is high.
- (e) INSUFFICIENT_INFORMATION.

**CA-16-B-Q3 — Admin-gated approval scope.**
Per RB-7, only admin may approve final implementation. Right scope?

- (a) Ratify admin-only approval.
- (b) Operator approval permitted for S effort-band; admin required for M/L/XL.
- (c) Operator approval permitted with audit-log review by admin within 7 days.
- (d) Reject admin-gating — operator may approve any redesign; admin retains override authority.
- (e) INSUFFICIENT_INFORMATION.

### CA-16-C Panel Questions (4)

**CA-16-C-Q1 — 6 canonical target classes.**
Should the 6 canonical target classes (web / mobile_app / native_app / saas / agentic_ai / generic_url) be ratified as drafted?

- (a) Ratify 6 classes as drafted.
- (b) Collapse — merge mobile_app + native_app into single `app` class.
- (c) Expand — add `embedded_iot`, `voice_interface`, `desktop_extension` (browser extension).
- (d) Reduce to 3 — `web`, `app` (any platform), `generic` — let detection internally distinguish sub-flavors.
- (e) INSUFFICIENT_INFORMATION.

**CA-16-C-Q2 — Detection determinism.**
Per MF-2, `detectTargetClass()` MUST be deterministic (no LLM non-determinism). Right invariant?

- (a) Ratify deterministic detection as drafted.
- (b) Allow LLM-fallback for ambiguous inputs (e.g. URL that returns ambiguous content-type), recorded with confidence score.
- (c) Operator-attestation always wins; detection is advisory.
- (d) Reject invariant — detection is best-effort; non-determinism is acceptable when recorded in audit log.
- (e) INSUFFICIENT_INFORMATION.

**CA-16-C-Q3 — Multi-Format ownership.**
Which agent owns Multi-Format targets across the 6 canonical classes?

- (a) Agent #21 ACE Conductor expands charter to own all 6 classes.
- (b) NEW Agent #27 Multi-Format Conductor + per-class sub-agents added to §15.1 (Locked Rule 2 26→27 amendment).
- (c) Hybrid — #21 owns web + saas; NEW Agent #27 owns mobile_app + native_app + agentic_ai + generic_url.
- (d) Defer ownership — CA-16-C canonizes the 6 classes; engineering dispatch picks the owner at first multi-format implementation.
- (e) INSUFFICIENT_INFORMATION.

**CA-16-C-Q4 — §7.6 score-formula generalization invariant.**
CA-16-C keeps the §7.6 formula UNCHANGED across all 6 target classes; only the finding-source set changes. Right approach?

- (a) Ratify unchanged formula across all 6 classes.
- (b) Per-class formula tuning — agentic_ai weights `critical` differently (e.g. 15× instead of 10×) because conversational failures are higher-stakes.
- (c) Per-class formula REPLACEMENT — each class declares its own scoring function.
- (d) Reject formula generalization — only `web` uses §7.6; other classes use separate scoring envelopes.
- (e) INSUFFICIENT_INFORMATION.

---

## Acceptance criteria for CA-16 ratification

- W6 ratification ≥7/10 ENGAGED on each of the 11 Panel questions above.
- Engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6.
- CEO disposition per Locked Rule 13.
- If all 11 ratify (a)-clean, CA-16 promotes as a single CA cycle covering all 3 sub-amendments.
- Per §CA-16-D independence rules, CA-16 can ratify EVEN IF CA-13 / CA-14 / CA-15 remain parked.
- If Panel splits per sub-amendment, ratified halves promote independently per §18.4 entry rules.
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA16-promotion-<date>.md` per §18.3.

---

*End of CA-16 draft. Pending W6 Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18). Doc-only; canonical files NOT amended in this commit per CA-n cycle discipline.*
