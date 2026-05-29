# SSOT Amendment Draft — CA-16-A v3 (split enacted; proactive recs in tooling/dashboard)

**Status:** DRAFT v3 — CA-16 SPLIT per CEO Locked Rule 13. This draft = CA-16-A ONLY (proactive recommendations + clearance interaction). CA-16-B (Redesign/Build Environment §29) + CA-16-C (Multi-Format Targets §6) DEFERRED entirely to a future CA-N. Pending W6 v3 re-Panel.
**Author:** W3, 2026-05-19.
**Bundle target:** ≤28K chars.

**Lineage:** CA-16 v1 (`908f340` — proactive recs + RB-Env + Multi-Format) → joint Panel `8e185a6` engagement-gated → W6 quorum-fix rerun `cc14a8f` (2/11 cleared: B-Q3 + C-Q4) → CA-16 v2 (`d366acf` — minimal envelope + §11.5 elimination + §29 numbering deferred + STRICTER Multi-Format) → W6 v2 sub-batch-1 re-Panel A-only (`40926fa` panel artifact; 0/4 cleared at A; A-Q1 5/9 REJECT, A-Q2 4/9 plurality below quorum, A-Q3 5/9 plurality below quorum, A-Q4 4/9 TIGHTER below quorum) → **CEO Locked Rule 13 split-decision (this dispatch):** CA-16 splits; CA-16-A converges via deletion + lightweight integration; CA-16-B/C defer to future CA-N.

**CEO split-decision citation (Locked Rule 13, this dispatch verbatim):** *"CA-16 is SPLIT. This draft = CA-16-A ONLY (proactive recs + clearance). CA-16-B/C (RB-Env + Multi-Format Targets) DEFERRED entirely to a future CA-N — out of scope here."*

---

## §0 — Scope statement (CA-16 SPLIT)

**This amendment is CA-16-A ONLY.** Per CEO Locked Rule 13 (this dispatch), CA-16 splits into three independent decision tracks:

| Track | Status (post-split) | Rationale |
|---|---|---|
| **CA-16-A** (proactive recommendations + clearance interaction) | **In scope — this v3 draft.** | Convergent via deletion: canonical envelope dropped; recs surface via tooling/dashboard with lightweight ClearanceRecord reference; lifecycle gets REOPEN; defer-window tightened. |
| **CA-16-B** (Redesign/Build Environment §29) | **CA-16-B/C-DEFERRED** — out of scope. Future CA-N. | Panel 3× said premature for canonical (joint Panel `8e185a6` + quorum-fix rerun `cc14a8f` + v2 re-Panel pattern). §29 numbering itself was DEFERRED at v2; section number remains an engineering-dispatch decision when the surface is mature enough to canonicalize. The CA-16-B-Q3 admin-only Redesign approval gate cleared at quorum-fix rerun and already LIVE per ENTRY 015 §11.7 (no further amendment needed). |
| **CA-16-C** (Multi-Format Targets §6) | **CA-16-B/C-DEFERRED** — out of scope. Future CA-N. | Panel 3× said premature for canonical. The CA-16-C-Q4 §7.6 formula-generalization invariant cleared at quorum-fix rerun and already LIVE per ENTRY 015 §7.6. Remaining CA-16-C questions (taxonomy, STRICTER detection, Agent #21 ownership) await a future CA-N when ≥1 product per non-`web` target class exists in ProductSSOT (no current evidence to canonicalize the 6-class taxonomy).

**The CA-16-A v3 amendment below references the cleared ENTRY 015 cleared-8 items (CA-16-B-Q3 §11.7 + CA-16-C-Q4 §7.6 generalization) as already-canonical lineage, but does NOT re-amend them.** Future CA-N for CA-16-B/C may build on the cleared-8 foundation when conditions are ripe.

---

## §1 — v3 changelog (per-question what-changed-vs-v2 + driving Panel slot)

| v2 Q | v2 re-Panel verdict | v3 change | Driving Panel slot(s) / CEO citation |
|---|---|---|---|
| **A-Q1** | `PLURALITY_REJECT` 5/9 | **DROP the canonical envelope ENTIRELY.** Proactive recommendations surface ONLY via tooling/dashboard, NOT in canonical §7. No PA-schema in canonical SSOT. Consistent with CA-15 v3's "purpose information lives outside SSOT" + B-Q3 tooling-not-canonical discipline. Reduces governance surface. | CEO Locked Rule 13 split-decision; Slot 1 + Slot 4 + Slot 5 + Slot 6 + Slot 8 + Slot 10 REJECT (5/9). Slot 8 verbatim: "commits the canonical SSOT to a partially specified data model while explicitly moving the hard parts out of scope." Slot 10 verbatim: "minimal envelope still lacks any tie to existing §7.6 or Self-Renewal invariants." Resolution: don't promote a partial canonical model — keep recs in tooling. |
| **A-Q2** | `PLURALITY_CA16AV2Q2-RATIFY` 4/9 (below quorum); STEP65 competing 2/9; DASHONLY 1/9 | Recs live **OUTSIDE §11 Clearance** (RATIFY direction preserved), surfaced via **dashboard post-Step-6**, with a **LIGHTWEIGHT ClearanceRecord *reference*** (not a gate) to address Slot 8 + Slot 10 "untracked" concern. Recs NEVER block clearance. | Slot 8 (#24 + clearance bypass weakens governance); Slot 10 (#29 ClearanceRecord ignores recs entirely). Lightweight reference = each recommendation entry records `last_seen_clearance_record_id` (FK to the most recent `ClearanceRecord` for the affected product, populated at rec-surface time). Provides traceability without becoming a Step gate. |
| **A-Q3** | `PLURALITY_CA16AV2Q3-RATIFY` 5/9 (below quorum); REOPEN competing 3/9 | **ADOPT REOPEN lifecycle state** — admin-gated, requires rationale. Small accretive change to the drafted lifecycle (open / accepted / rejected / deferred / implemented / **reopened**). | Slot 1 + Slot 4 + Slot 9 REOPEN votes (3/9); Slot 1 verbatim: "Rejected recommendations may become relevant as products evolve; allowing admin-gated reopening with rationale provides flexibility without cluttering the active queue." Convergent with the dispatch direction. |
| **A-Q4** | `PLURALITY_CA16AV2Q4-TIGHTER` 4/9 (below quorum); ADMIN30 2/9; RATIFY 2/9 | **Defer-window bounds `[7, 90]`** (was `[1, 365]` in v2; Slot 7 + Slot 8 + Slot 10 verbatim cited 365-day extreme as governance-breaking). Note ADMIN30 hybrid (operator role ≤30 days; admin may extend to 90) as Panel-electable option (b) on the v3 Q4. | Slot 3 + Slot 7 + Slot 8 + Slot 9 TIGHTER votes (4/9); Slot 1 + Slot 4 ADMIN30 votes (2/9); Slot 10 #30 verbatim: "365-day value on a high-velocity product violates the §28 symbiotic loop feedback assumption". |

**Net CA-16-A v3 effect:**

| Surface | v2 design | v3 design (split + deletion + lightweight integration) |
|---|---|---|
| §7 canonical envelope for proactive recs | Minimal envelope (kind + cost + rollback + lifecycle) | **No canonical envelope.** Recs live in tooling/dashboard. No §7 item #8 amendment. |
| Recommendation schema | Deferred to engineering dispatch | **Engineering-owned entirely.** Tooling at `scripts/lint-proactive-recs.mjs` (or equivalent dispatch-time naming) + dashboard surface; schema lives in tooling-internal types. |
| §11 Clearance interaction | Recs OUTSIDE §11; no Step references | Recs OUTSIDE §11 (same intent) + **lightweight `last_seen_clearance_record_id` reference** populated post-Step-6 surface; non-blocking. |
| Lifecycle states | open / accepted / rejected / deferred / implemented (5 states) | open / accepted / rejected / deferred / implemented / **reopened** (6 states; reopened is admin-gated + rationale-required). |
| Defer-window bounds | `[1, 365]` | **`[7, 90]`** primary; `ADMIN30 hybrid` (operator ≤30, admin up to 90) as Panel-electable option. |
| Audit trail | `proactive_recommendation.v1` envelope | **No canonical audit-log envelope** (since recs are tooling-side). Dashboard maintains its own audit; ClearanceRecord reference provides cross-link to canonical state. |

---

## §2 — CA-16-A v3 — Proactive recommendations OUTSIDE canonical (tooling/dashboard)

### Rationale

v2 re-Panel returned 5/9 REJECT on A-Q1 (canonical envelope). The Panel's structural objection (Slot 8 verbatim): "commits the canonical SSOT to a partially specified data model while explicitly moving the hard parts out of scope. That creates a durable mismatch between what the spec promises and what engineering can safely enforce."

Two coherent resolutions exist: (1) commit to a complete canonical schema (Panel option `FULLSCHEMA` got 0 votes — not viable now), or (2) drop the canonical envelope entirely. CEO Locked Rule 13 selected option (2): proactive recommendations live in tooling, not canonical SSOT. This mirrors the CA-15 v3 "purpose information lives outside SSOT" disposition + CA-15-B-Q3 "placeholder detection lives in tooling" already cleared at ENTRY 015.

### Canonical text — §7 UNCHANGED (no item #8 added)

```markdown
### §7 — Output Contract (UNCHANGED at the 6 items per ENTRY 015 cleared-8)

§7 remains at the canonical 6 items per ENTRY 015 (items 1–5 per ENTRY 005
+ item #6 Self-Renewal safety-invariant compliance per CA-14-B ENTRY 015
cleared-8 + the LIMITATIONS disclosure discipline sub-section per CA-14-A
ENTRY 015 cleared-8).

**CA-16-A v3 disposition:** the v1/v2 proposals to add §7 item #8
"Proactive Recommendations envelope" are REJECTED. Proactive
recommendations are NOT a canonical Output Contract artifact. They live
in tooling + admin dashboard outside canonical SSOT.

This is consistent with:
- CA-15-B v3 (sibling commit `c5b050f`): purpose information lives
  outside canonical SSOT.
- CA-15-B-Q3 ENTRY 015 cleared-pending: placeholder detection lives in
  `scripts/lint-product-purpose.mjs` tooling, NOT canonical SSOT.
- CA-15-A v3: content_quality + accessibility live in
  `scripts/lint-*` tooling, NOT canonical §10.1 dim-extension.

Engineering dispatch hosts the proactive-recommendations surface at:
- `scripts/lint-proactive-recs.mjs` (or equivalent dispatch-time
  naming) — surfaces recommendations to operators at PR-time + via
  admin dashboard polling.
- Admin dashboard `/admin/recommendations` (route exists in dashboard
  surface; not canonical).
- Tooling-internal schema lives in `scripts/types/proactive-recs.d.ts`
  (engineering-owned; not promoted to canonical SSOT).

No `governance_record_entry kind:'proactive_recommendation.v1'` is
required (per CA-16-A v3, no canonical audit-log envelope for recs).
The dashboard maintains its own audit trail; cross-linkage to canonical
state is via the lightweight `last_seen_clearance_record_id` reference
per §3 below.
```

---

## §3 — CA-16-A v3 — Recs OUTSIDE §11 + lightweight ClearanceRecord reference

### Rationale

v2 A-Q2 verdict was 4/9 PLURALITY-RATIFY ("recs outside §11") with 2/9 STEP65 competing. The Slot 8 + Slot 10 "untracked" concern (Slot 10 #29 verbatim: "ClearanceRecord entity records only the six enumerated steps; the side-channel governance_record_entry for proactive_recommendation.v1 has no timestamp linkage to any ClearanceRecord step, so deferred recs can silently expire without updating the atomic ProductSSOT delta_log") is addressed via a lightweight reference field — NOT a gate.

### Canonical text — recommendation surface integration (lightweight, non-blocking)

```markdown
### §11.X — Proactive recommendation surface integration (CA-16-A v3; lightweight reference, NOT a gate)

Per CA-16-A v3, proactive recommendations live OUTSIDE the §11 Six-Step
Clearance Protocol. The v1 proposal of a §11.5 NEW Step 1.5 "Proactive
Recommendation Review" is ELIMINATED (carried forward from v2). The v2
STEP65 alternative (Step 6.5 post-Deploy) is NOT adopted.

**Lightweight ClearanceRecord reference (CA-16-A v3 NEW; addresses
Slot 8 + Slot 10 "untracked" concern):**

When a proactive recommendation surfaces to the admin dashboard for a
product, the tooling stamps the most recent `ClearanceRecord.id` for
that product onto the recommendation as `last_seen_clearance_record_id`.

- This is a one-way reference: the recommendation entry references the
  ClearanceRecord; the ClearanceRecord does NOT reference the
  recommendation.
- The reference is informational, not gating. §11 Step 5 / Step 6 do
  NOT check the recommendation queue at any point.
- The reference enables admin-dashboard sorting/filtering ("show recs
  surfaced since the last clearance"), supports forensic queries
  ("which recommendations existed at the time of clearance X"), and
  provides cross-link visibility WITHOUT coupling recommendations to
  the canonical clearance flow.
- The reference is updated on every rec-surface event; if the
  ClearanceRecord for the product is updated (e.g. a new Step 6
  completion), subsequent rec-surfaces use the new ID.

**Recommendations NEVER block clearance.** The CA-16-A v3 design intent
is that operators can ship without dispositioning recs; recs are pure
improvement suggestions, not blockers. The lightweight reference
provides traceability without governance coupling.

**Conformance-test acceptance criteria:**

- **CA16A-v3-CT-1.** Tooling surfaces a recommendation for product X;
  the recommendation entry persists `last_seen_clearance_record_id`
  matching the most recent `ClearanceRecord.id` for product X.
- **CA16A-v3-CT-2.** §11 Step 5 + Step 6 evaluation code paths perform
  NO read of the recommendation queue; grep across `src/lib/governance/`
  + `src/components/clearance/` + `api/clearance/`: zero reads of any
  `proactive_recommendation*` table OR tooling-side queue.
- **CA16A-v3-CT-3.** A product with 100+ open recommendations passes
  §11 Step 5 + Step 6 unconditionally on score-and-finding criteria;
  recs do not affect clearance verdict.
```

---

## §4 — CA-16-A v3 — Lifecycle: ADD REOPEN state

### Rationale

v2 A-Q3 verdict: 5/9 RATIFY (5-state lifecycle) + 3/9 REOPEN (add reopen state). Slot 1 + Slot 4 + Slot 9 cited the same rationale (Slot 1 verbatim): "Rejected recommendations may become relevant as products evolve; allowing admin-gated reopening with rationale provides flexibility without cluttering the active queue."

The dispatch direction: ADOPT REOPEN as a small accretive change.

### Canonical text — disposition lifecycle (6 states)

```markdown
### §11.X.1 — Proactive recommendation lifecycle (CA-16-A v3; 6 states)

A proactive recommendation traverses one of the following lifecycle
states (recorded in tooling-internal state, NOT canonical SSOT):

| State | Description | Transitions out |
|---|---|---|
| `open` | New recommendation surfaced to admin dashboard; awaiting operator/admin disposition | → `accepted` (operator/admin accepts; tooling enqueues for implementation) → `rejected` (admin rejects with rationale) → `deferred` (operator/admin defers with `defer_until` per §5 defer-window) |
| `accepted` | Recommendation accepted; tooling tracks implementation | → `implemented` (tooling marks complete after observed implementation lands) |
| `rejected` | Admin rejected with rationale | → `reopened` (NEW v3; admin re-evaluates; see below) |
| `deferred` | Deferred until `defer_until` date | → `open` (auto-resurfaces at `defer_until`) → `rejected` (operator/admin rejects before resurface) |
| `implemented` | Implementation observed via §7.6 score delta OR tooling-side marker | (terminal; recommendation closes) |
| **`reopened` (NEW v3)** | Previously `rejected` recommendation re-evaluated by admin | → `open` (returns to active queue) |

**REOPEN transition rules (CA-16-A v3):**

- ONLY `rejected` recommendations may transition to `reopened`. `open`,
  `accepted`, `deferred`, `implemented` cannot reopen (use `open` for
  new evaluations).
- REOPEN requires the **admin role** (operator role refused).
- REOPEN requires a `reopen_rationale` field ≥80 chars + must NOT match
  the canonical stop-words set (consistent with the rationale-quality
  discipline used in Build/Wire S6 v2).
- REOPEN emits a tooling-internal audit entry; if cross-linkage to
  canonical state is desirable, the entry's `last_seen_clearance_record_id`
  reference per §3 persists.
- A reopened recommendation immediately transitions to `open` and
  re-enters the active queue; it may be re-rejected by the same or a
  different admin via the standard rejection flow.

**Conformance-test acceptance criteria:**

- **CA16A-v3-CT-4.** Rejected recommendation reopens with admin role +
  ≥80-char rationale: transitions to `open` successfully; tooling
  audit-trail entry persists with the rationale.
- **CA16A-v3-CT-5.** Reopen attempt with operator role refused;
  refusal emits tooling-side denial entry.
- **CA16A-v3-CT-6.** Reopen attempt with `rationale: "approved"` (stop-
  word) refused; refusal cites rationale-quality validation.
- **CA16A-v3-CT-7.** Reopen attempt on a `deferred` recommendation
  refused; only `rejected` is reopenable.
```

---

## §5 — CA-16-A v3 — Defer-window bounds `[7, 90]` + ADMIN30 hybrid (Panel-electable)

### Rationale

v2 A-Q4 verdict: 4/9 TIGHTER (`[7, 90]`) + 2/9 ADMIN30 hybrid + 2/9 RATIFY + 1 REJECT. Panel convergence on tighter bounds; the v2 `[1, 365]` extremes were uniformly criticized (Slot 7 + Slot 8 + Slot 10 verbatim cited 365-day suppression risk + §28 symbiotic-loop incompatibility).

### Canonical text — defer-window config (tooling-side; not canonical SSOT but documented here for v3 Panel review)

```markdown
### §5 (CA-16-A v3 tooling spec, NOT canonical SSOT amendment) — Defer-window bounds

Note: per CA-16-A v3's A-Q1 disposition (proactive recs OUTSIDE
canonical SSOT), the defer-window config lives in tooling-internal
state (e.g. `scripts/types/proactive-recs.d.ts` + admin dashboard
config). This section documents the v3 bounds for Panel review; the
canonical §7 / §11 / §3 do NOT carry this config field.

**Defer-window bounds (CA-16-A v3 primary):**

- Range: `[7, 90]` days. Default: 14 days.
- Tooling-side config field: `recommendation_defer_window_days`
  (default 14; bounds clamped to [7, 90]).
- Out-of-bounds values REJECTED at write-time (not clamped) —
  consistent with the CA-13-A v3 admin-only-expiring-override
  out-of-bounds reject pattern + the Slot 8 #26 "silent coercion is
  dangerous" principle.
- Per-recommendation override permitted: operator/admin may set
  `defer_until` to any date within [7, 90] days from disposition time.

**ADMIN30 hybrid (Panel-electable v3 option (b)):**

If Panel elects the ADMIN30 hybrid at v3 re-Panel:
- Operator role may set defer-window OR `defer_until` up to **30 days**.
- Admin role may extend up to **90 days** with rationale ≥80 chars.
- 31-90-day deferrals by operator role REJECTED with
  `defer_window_role_violation.v1` tooling-side denial.

The ADMIN30 hybrid balances operator autonomy (30-day reasonable
window) with admin oversight (longer suppression requires elevated
role).

**Conformance-test acceptance criteria:**

- **CA16A-v3-CT-8.** Operator sets defer_until = today + 95 days
  (primary [7, 90]): REJECTED; refusal emits tooling-side denial.
- **CA16A-v3-CT-9.** Operator sets defer_until = today + 0 days OR
  today + 5 days (below 7-day floor): REJECTED.
- **CA16A-v3-CT-10.** [If ADMIN30 hybrid elected] Operator sets
  defer_until = today + 45 days: REJECTED (operator capped at 30);
  admin sets same: ACCEPTED.
```

---

## §6 — v3 Panel Questions (4 — all re-Panel; none pre-cleared)

### CA-16-A v3 Q1 — DROP canonical envelope; recs in tooling/dashboard only

Does Panel ratify CA-16-A v3's decision to DROP the canonical §7 item #8 proactive_recommendation envelope entirely? Recommendations surface ONLY via tooling/dashboard (consistent with CA-15-B-Q3 / CA-15-B v3 tooling-not-canonical discipline). No PA-schema in canonical SSOT.

- (a) **Ratify v3 as drafted** (canonical envelope DROPPED; recs live in tooling + admin dashboard; engineering owns the schema in `scripts/types/proactive-recs.d.ts`).
- (b) Ratify with stricter tooling discipline — the tooling MUST emit a `governance_record_entry kind:'proactive_rec_summary.v1'` ONCE PER DAY summarizing the recommendation queue state (count by lifecycle state + count of high-risk-tier recs); summary entry IS canonical-audit-trail-accessible even though individual recommendations are not.
- (c) Ratify the drop BUT promote the lightweight ClearanceRecord reference (§3 below) into canonical: any tooling that surfaces recs MUST populate `last_seen_clearance_record_id`; canonical SSOT enforces the linkage via §7.5 ProductSSOT operational invariants extension.
- (d) Reject the v3 drop — return to v2's minimal-envelope canonical position; defer engineering schema details to a successor CA-N as v2 originally proposed.
- (e) INSUFFICIENT_INFORMATION.

### CA-16-A v3 Q2 — Recs OUTSIDE §11 + lightweight ClearanceRecord reference

Does Panel ratify recs living OUTSIDE §11 Clearance with the lightweight `last_seen_clearance_record_id` reference (non-gating; informational only)?

- (a) **Ratify v3 as drafted** (recs OUTSIDE §11; lightweight ClearanceRecord reference per §3; recs never block clearance).
- (b) Strengthen — adopt Step 6.5 post-Deploy surface as the canonical home for recs (Slot 1's STEP65 variant); reference becomes a Step 6.5 attribute rather than a tooling-side stamp.
- (c) Ratify drop the reference — recs live ENTIRELY outside any canonical linkage; no `last_seen_clearance_record_id` field; pure side-channel (Slot 4 + Slot 6 DASHONLY direction).
- (d) Reject — restore §11.5 Step 1.5 Proactive Recommendation Review per v1 (Panel's REJECT direction at A-Q2 was 0/9 at v2 re-Panel; this option exists only for completeness).
- (e) INSUFFICIENT_INFORMATION.

### CA-16-A v3 Q3 — ADD REOPEN lifecycle state

Does Panel ratify the addition of a `reopened` lifecycle state (admin-gated; rationale ≥80 chars; ONLY transitions from `rejected`)?

- (a) **Ratify v3 as drafted** (6-state lifecycle including REOPEN; admin-only; ≥80-char rationale; rejected → reopened → open transition path).
- (b) Strengthen — REOPEN requires TWO admin sign-offs (different admins; second admin confirms within 24 hours); prevents single-admin "reopen-spam" failure mode.
- (c) Ratify but broaden eligibility — `deferred` recommendations also reopenable (currently restricted to `rejected`-only); allows admin to manually resurface a deferred rec before its `defer_until` if circumstances change.
- (d) Reject the REOPEN state — 5-state lifecycle is sufficient; rejected recs that become relevant later should resurface via a new `open` entry with a fresh `id` rather than reopen-by-state-transition.
- (e) INSUFFICIENT_INFORMATION.

### CA-16-A v3 Q4 — Defer-window bounds `[7, 90]` + ADMIN30 hybrid alternative

Does Panel ratify the defer-window bounds `[7, 90]` (primary; default 14) with out-of-bounds REJECTED not clamped?

- (a) **Ratify v3 primary as drafted** ([7, 90] bounds; default 14; out-of-bounds rejected).
- (b) Ratify the ADMIN30 hybrid alternative — operator role may set up to 30 days; admin role may extend to 90 days with rationale ≥80 chars. Balances operator autonomy with admin oversight of long suppressions.
- (c) Tighter — bounds `[7, 60]` (instead of [7, 90]); 90 days approaches one sprint cycle and may suppress recs across §28 symbiotic-loop iterations.
- (d) Reject — restore v2's `[1, 365]` bounds despite Panel verdict; rationale Panel may supply.
- (e) INSUFFICIENT_INFORMATION.

---

## §7 — Acceptance criteria for CA-16-A v3 ratification

- W6 v3 re-Panel ratification ≥7/engaged drafted-(a) on each of the 4 v3 questions.
- Engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6.
- CEO disposition per Locked Rule 13. The CEO has pre-decided the SPLIT (CA-16-A in scope, CA-16-B/C deferred); Panel feedback on the split-decision itself is advisory.
- If all 4 ratify (a)-clean, CA-16-A v3 promotes as a single CA cycle (next free CA number per §18.4).
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA16A-v3-promotion-<date>.md` per §18.3.
- The cleared-pending CA-16-B-Q3 + CA-16-C-Q4 from the original CA-16 (already LIVE in canonical per ENTRY 015 cleared-8) remain unchanged. CA-16-A v3 does NOT re-amend §11.7 or §7.6.
- Cross-CA dependencies:
  - CA-15 v3 (sibling `c5b050f`): the "purpose lives outside canonical SSOT" disposition mirrors CA-16-A v3's "proactive recs live outside canonical SSOT" disposition — coherent governance posture.
  - CA-13 v3 (sibling `d396bd2`): out-of-bounds-reject pattern (Slot 8 #26) reused for CA-16-A v3 defer-window out-of-bounds handling.

---

## §8 — CA-16-B/C-DEFERRED — future CA-N

**CA-16-B (Redesign/Build Environment §29) + CA-16-C (Multi-Format Targets §6) are DEFERRED to a future CA-N** per CEO Locked Rule 13 split-decision (this dispatch). Rationale:

> *Panel said premature for canonical 3×* (joint Panel `8e185a6`, quorum-fix rerun `cc14a8f`, v2 re-Panel pattern across non-cleared questions).

The cleared-pending ENTRY 015 cleared-8 items already LIVE in canonical (§11.7 admin-only Redesign approval gate; §7.6 formula-generalization invariant) remain unchanged. The future CA-N for CA-16-B/C may build on this foundation when conditions are ripe — for CA-16-B, when the Redesign/Build Environment surface has shipped at least one operator-completed redesign cycle in tooling-only form; for CA-16-C, when ≥1 product per non-`web` target class exists in ProductSSOT.

CA-16-A v3 (this draft) does NOT depend on the future CA-N; the two tracks are now independent.

---

*End of CA-16-A v3 DRAFT (CA-16 SPLIT enacted). Pending W6 v3 re-Panel (4 questions) + CEO disposition per CA-n cycle. Doc-only; canonical files NOT amended in this commit. CA-16-B/C deferred to future CA-N per CEO Locked Rule 13.*
