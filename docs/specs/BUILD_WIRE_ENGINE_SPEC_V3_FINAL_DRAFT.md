# Build/Wire Engine Spec V3-FINAL — CONVERGENCE PASS (CEO-disposition track, not open re-Panel)

**Status:** CONVERGENCE-FINAL — CEO-disposition track per Locked Rule 13. The spec has oscillated (J2 v1 strengthen → v2 over-extended → v2 4-run re-Panel rolled back). This v3-final pass applies Panel-endorsed convergence directions verbatim from the CEO dispatch. **No further open re-Panel.** Pending CEO ratification only.
**Author:** W3, 2026-05-19.
**Bundle target:** ≤34K chars.

**Lineage:** v1 `4e6260b` → v2 `d0691c5` (8 strengthen directions) → S8 fidelity `448932b` → W6 4×2-Q re-Panel `4400958` (verdicts: S1 SIMPLIFY 4/7, S2 DENSITY 3/7, S3 FULLBACKUP 4/10, S4 CSRF 5/10, S5 REJECT 4/10, S6 REJECT 5/10, S7 REJECT 6/9, S8 SIMPLIFY 6/9; 0/8 cleared) → **CEO convergence dispatch (this draft):** CONVERGENCE-FINAL.

**NON-OVERRIDABLE inventory — fidelity statement:** the CEO-locked NON-OVERRIDABLE invariants are EXACTLY **S2 / S4 / S5 / S6** per Path H ENTRY 014 + Locked Rule 13. No other invariant carries non-overridable status. **S1 / S3 / S7 / S8 are PANEL-RATIFIABLE.** v3-final preserves the non-overridable set unchanged from Path H; NON-OVERRIDABLE invariants here remain strengthen-only with no reject path.

---

## §0 — v3-final changelog (per-invariant v2→v3-final + driving Panel slot/verdict)

| Inv | v2 verdict | **v3-final disposition** |
|---|---|---|
| **S1** | `S1V2-SIMPLIFY` 4/7 | **ROLLBACK to v1 6-field MANDATORY baseline.** The 4 v2 hidden-state fields (runtime-config, feature-flag, background-job, external-contract) become **"extended baseline" admin-opt-in**, default OFF, via toggle `product_registry.construction_extended_baseline_enabled`. |
| **S2** 🔒 | `S2V2-DENSITY` 3/7 (SPLIT) | **STRENGTHEN: density ceiling 100 lines/file** (was 150). System caps 15/1500/3/4 unchanged. Redesign_implementation operator-declared clamp at system cap unchanged. |
| **S3** | `S3V2-FULLBACKUP` 4/10 (SPLIT) | **STRENGTHEN: DLP verification = FULL-RESTORE + row-count-diff < 0.1%** before destructive migrations (replaces v2 checksum-only). Checksum still computed for tamper-evidence; full-restore is load-bearing. |
| **S4** 🔒 | `S4V2-CSRF` 5/10 | **STRENGTHEN: ADD 9TH PILLAR — CSRF probes** for state-changing endpoints (POST/PUT/PATCH/DELETE) lacking CSRF-token check OR SameSite enforcement. S4 now 9 pillars. |
| **S5** 🔒 | `REJECT` 4/10 | **SOFTEN: keep auto-rollback invariant; ADD operator-confirm gating before execution.** Engine auto-detects + auto-prepares (snapshot loaded, rollback path validated, queued); execution requires operator confirm-to-fire. 90-day retention documented as operator-config option (default 30; bounds [30, 90]). Auto-fire-without-confirm REJECTED per Panel; invariant preserved by gating execution. |
| **S6** 🔒 | `REJECT` 5/10 | **SOFTEN: REWRITE in-flight context-change invalidation** — invalidate ONLY on `governance_record_entry` kinds that materially change inputs, NOT every delta_log / ProductSSOT write. Canonical closed-set "materially-changing kinds": `construction_pre_baseline.v1`, `architecture_snapshot.v1`, `gtm_bar_admin_override.v1`, `gtm_bar_admin_override_used.v1`, `construction_class.v1`, `purpose_drift_annotation.v1 severity:'critical'`. All other kinds (score_history, delta_log, advisory entries, etc.) do NOT invalidate. |
| **S7** | `REJECT` 6/9 | **ROLLBACK to v1.** Per-session sub-branches REMOVED entirely. Every construction commits directly to per-product `self_renewal_branch` per CA-14-D-Q1 ENTRY 015 cleared-8. If CA-16-B (deferred to future CA-N per `e8bb7d4` CA-16 SPLIT) needs session isolation, CA-16-B owns that — NOT S7. |
| **S8** | `S8V2-SIMPLIFY` 6/9 | **ROLLBACK to v1.** Live-preview post-merge REMOVED. Dual-load REMOVED. Backend probes (connection-pool / memory-leak / transaction-deadlock) REMOVED. S8 = pre-PR Phase B only (v1 per-class coverage shape). |

**Net v3-final structural changes:**

| Surface | v2 | v3-final |
|---|---|---|
| S1 baseline fields | 10 mandatory | 6 mandatory + 4 admin-opt-in extended |
| S2 density ceiling | 150 lines/file | **100 lines/file** (system caps unchanged at 15/1500/3/4) |
| S3 DLP verification | Checksum-only | **Full-restore + row-count-diff <0.1%** |
| S4 pillars | 8 | **9** (drafted 8 + CSRF) |
| S5 auto-rollback trigger | Auto-fires without operator | **Auto-detect + auto-prepare + operator-confirm-to-fire** |
| S6 in-flight invalidation | ANY new `governance_record_entry` | **Materially-changing kinds only** (closed set of 6 canonical kinds) |
| S7 branch model | Per-session sub-branches for CA-16-B | **v1: per-product branch only** (sub-branch responsibility moves to future CA-16-B) |
| S8 Phase B | Pre-PR + live-preview + dual-load + backend probes | **v1: pre-PR only** |

**Conformance inventory:** 33 (v1) → 49 (v2 added 16) → **48 (v3-final)**. Net v3-final change: −1 (S1-CT-4 retained but reframed as opt-in validation; S3-CT-5 retained but reframed as full-restore verification; S4 +1 for CSRF (S4-CT-9); S5 retained 3 v2 tests; S6 retained 4 v2 tests; S7 −1 (sub-branch test removed); S8 −3 (live-preview + dual-load + backend probes removed)). See §10 for the full v3-final inventory.

**Failure envelopes:** v2 had 28; v3-final has **26** (v1 19 + v2-retained 6 + v3-final NEW 1 — `construction_auto_rollback_pending_operator_confirm.v1`; v2's `redesign_session_subbranch_merged.v1` + `construction_phase_b_post_merge.v1` REMOVED with S7 + S8 revert).

---

## §1 — Purpose + Scope (unchanged from v1)

Per v1 §1.1–§1.3 — the build/wire engine converts detected shell/mock surfaces into real wired software, operates ALONGSIDE the existing Self-Renewal Executor (does NOT replace it). Path H ENTRY 014 boundary remains in force (Stage 3 BLOCKED until ratified).

---

## §2 — Construction Classes (canonical taxonomy)

Four construction classes; each declares its class before construction begins (`governance_record_entry kind:'construction_class.v1'`).

| Class | Description | v3-final scope |
|---|---|---|
| **wire_up** | Connect existing dead controls to handlers (no schema; no deps) | 1–5 files, **≤100 lines/file**, ≤200 lines total, 0 new deps |
| **endpoint_generation** | Generate new backend endpoints | 3–10 files, **≤100 lines/file**, ≤500 lines total, 0–2 new deps |
| **schema_migration** | Create tables / columns / indexes / RLS policies | 1–3 migration files, **≤100 lines/file**, ≤200 lines total, 0 new deps; **DROP COLUMN / DROP TABLE / TRUNCATE require S3 DLP full-restore verification** |
| **redesign_implementation** | Operator-steered redesign per CA-16-B (currently DEFERRED future CA-N per CA-16 SPLIT) | Operator-declared ≤ system cap 15/1500/3/4 (clamp; out-of-bounds REJECTED) |

---

## §3 — Eight Safety Invariants (S1–S8) — v3-FINAL

### §3.1 S1 — Pre-construction baseline (PANEL-RATIFIABLE; v3-final ROLLBACK to v1 + optional extended baseline)

**v3-final Invariant:** Before any construction-class operation begins, the engine MUST capture a **6-field MANDATORY baseline**:

1. §7.6 score + finding inventory (per ENTRY 006 + ENTRY 015 cleared-8).
2. §10.1 5-dim audit snapshot (UI/UX, API, Logic, Business Value, Security Posture; UNCHANGED per CA-15-A v3 — no dim-extension).
3. Per-page DOM hashes.
4. Per-endpoint response hashes.
5. Schema fingerprint.
6. Dependency-graph fingerprint.

Baseline persists in `governance_record_entry kind:'construction_pre_baseline.v1'`.

**OPTIONAL extended baseline (v3-final NEW — admin-opt-in, default OFF):** when `product_registry.construction_extended_baseline_enabled = true` (admin-only toggle), the engine ALSO captures:

7. Runtime-config fingerprint
8. Feature-flag state
9. Background-job inventory
10. External service contract checksums

Extended baseline persists in the same envelope with an additional `extended: true` flag + the 4 hidden-state fields populated. Default product configuration (extended OFF) writes only fields 1–6; field validation accepts both 6-field and 10-field shapes.

**Conformance tests (v3-final):**

- **S1-CT-1:** stub a construction without baseline → engine refuses with `construction_pre_baseline_missing.v1`.
- **S1-CT-2:** successful baseline with extended OFF persists with exactly fields 1–6; schema validation accepts.
- **S1-CT-3:** baseline immutability — once written, the row cannot be updated; only appended-to via `construction_post_verification.v1` linkage.
- **S1-CT-4 (v3-final reframed):** when `construction_extended_baseline_enabled = true`, baseline persists with all 10 fields + `extended: true` flag; schema validation accepts extended shape. When `false`, attempting to populate fields 7–10 emits `construction_pre_baseline_extended_disabled.v1` (informational; baseline still succeeds with only 1–6).

### §3.2 S2 — Bounded scope (NON-OVERRIDABLE; v3-final STRENGTHENED density) 🔒

**v3-final Invariant:** every construction declares hard caps before generation. v3-final system caps + density ceiling:

| Cap | **v3-final value** |
|---|---|
| `file_count_cap` (system max) | **15** |
| `line_count_cap` (system max) | **1500** |
| `new_dependency_cap` (system max) | **3** |
| `dependency_graph_radius` (system max) | **4** |
| **`per_file_density_ceiling`** | **100 lines/file (v3-final TIGHTENED from v2's 150)** |

Per-class defaults unchanged from v2 (wire_up=5/200/0/3; endpoint_generation=10/500/2/3; schema_migration=3/200/0/3; redesign_implementation operator-declared up to system cap). Caps enforced at the fix-generator boundary; exceeding any cap aborts with `construction_scope_violation.v1` BEFORE any code is written.

**Why NON-OVERRIDABLE:** unbounded construction defeats the safety-net intent. v3-final STRENGTHENS density only; no reject path.

**Conformance tests (v3-final):**

- **S2-CT-1:** per-class file_count violation aborts.
- **S2-CT-2:** line_count violation aborts.
- **S2-CT-3:** operator override above system cap **clamped to 15** with `system_cap_clamp.v1`.
- **S2-CT-4:** all caps surface in S6 approval envelope including density ceiling 100.
- **S2-CT-5:** 2-file construction with 105 lines in one file (under aggregate line_count_cap 200) aborts with `cap_violated: 'file_density_ceiling'`. (Density ceiling tightened from 150 to 100.)
- **S2-CT-6:** `redesign_implementation` operator-declared `file_count_cap: 20` clamped to v3-final system cap 15.

### §3.3 S3 — Schema migration testing (PANEL-RATIFIABLE; v3-final STRENGTHENED DLP)

**v3-final Invariant:** every `schema_migration` MUST pass 5 pillars BEFORE PR. 5th-pillar DLP verification **replaces v2 checksum-only with full-restore + row-count-diff < 0.1%**:

1. Idempotency (unchanged).
2. Drift detection (unchanged).
3. Lock contention <5s p99 (unchanged).
4. Reversibility — explicit DOWN path (unchanged).
5. **Data-Loss Prevention (v3-final STRENGTHENED):** `DROP COLUMN` / `DROP TABLE` / `TRUNCATE` requires ALL of:
   - Explicit S6 rationale citation of the destructive statement.
   - **pg_dump backup persisted + FULL-RESTORE to a CI-spawned ephemeral DB + ROW-COUNT-DIFF < 0.1%** between source and restored copy (was checksum-only in v2). Backup checksum still computed for tamper-evidence, but the restore-and-row-count test is the load-bearing verification.
   - Operator role = `admin` (S6 v3-final admin-required-all-classes).

Any failure → abort with `schema_migration_data_loss_blocked.v1`. The DLP pillar is NEVER overridable.

**Conformance tests (v3-final):**

- **S3-CT-1..S3-CT-4:** unchanged from v1.
- **S3-CT-5 (v3-final STRENGTHENED):** stub a migration with `DROP COLUMN users.email`. Verify FIVE distinct abort paths: (1) S6 rationale missing the DROP COLUMN citation → abort; (2) S6 rationale cites it but no backup taken → abort; (3) backup taken but **full-restore fails** (e.g. corrupted dump) → abort; (4) full-restore succeeds but **row-count-diff ≥ 0.1%** between source and restored copy → abort; (5) all of (1)–(4) pass but operator role = `operator` (not admin) → abort with `construction_insufficient_role.v1`. Only when all five pass does the migration proceed.

### §3.4 S4 — Construction security suite (NON-OVERRIDABLE; v3-final ADDS CSRF as 9TH PILLAR) 🔒

**v3-final Invariant:** every construction passes a **9-pillar** security suite BEFORE PR:

1. SQLi probes (v1).
2. XSS probes (v1).
3. Auth-bypass probes (v1).
4. Secrets-leakage scan (v1).
5. Dependency-CVE scan (v1).
6. Authorization regression — pre/post-construction snapshot + DELETION-detection (v2 extended).
7. SSRF probes (v2 NEW): AWS metadata, GCP metadata, internal loopback, file://, DNS rebinding.
8. Rate-limit / abuse probes (v2 NEW): 10× declared rate; assert HTTP 429 + Retry-After.
9. **CSRF probes (v3-final NEW — 9TH pillar):** for every state-changing endpoint (POST / PUT / PATCH / DELETE) generated or modified by the construction, verify ONE of:
   - A CSRF-token check is present (e.g. `csurf` middleware, custom CSRF header verification, double-submit cookie pattern), OR
   - SameSite cookie enforcement is present (`SameSite=Strict` OR `SameSite=Lax` on the session cookie; mere `SameSite=None` does NOT satisfy).

   If neither is present, the construction fails S4 with `construction_security_failure.v1` `failure_class: 'csrf'`. The Panel-electable hybrid (CSRF probe runs but is advisory) is NOT adopted in v3-final — CSRF is a hard pillar.

**Why NON-OVERRIDABLE:** construction-introduced vulnerabilities = blast-radius scaling. v3-final STRENGTHENS to 9 pillars; no reject path.

**Conformance tests (v3-final):**

- **S4-CT-1..S4-CT-8:** unchanged from v2.
- **S4-CT-9 (v3-final NEW):** stub a generated `POST /api/transfer` endpoint with no CSRF-token check + no SameSite cookie enforcement; assert S4 aborts with `failure_class: 'csrf'`. Variants: endpoint with CSRF-token check → passes; endpoint with SameSite=Strict cookie → passes; endpoint with SameSite=None (or absent) AND no CSRF-token check → FAILS.

### §3.5 S5 — Rollback substrate (NON-OVERRIDABLE; v3-final SOFTENED with operator-confirm gating) 🔒

**v3-final Invariant:** Construction commits MUST be atomically reversible via: pre-commit snapshot + CAS commit + real-rollback dry-run in CI + 30-day retention + **auto-detect + auto-prepare + operator-confirm-to-fire automatic rollback on Phase B post-merge failure**.

**v3-final specifics:**

- **Pre-commit snapshot + CAS + real-rollback dry-run in CI** (unchanged from v2): before PR opens, engine spawns CI-ephemeral copy + executes actual rollback path against it; rollback success = ephemeral copy reverts to Phase A baseline.
- **30-day retention** (unchanged from v2; primary) with **90-day retention documented as an operator-config option** (`product_registry.construction_snapshot_retention_days`, default 30; admin-only toggle; bounds [30, 90]). 90-day retention serves operators needing longer forensic windows.
- **Auto-rollback on Phase B post-merge failure — SOFTENED to require operator confirm (v3-final):** if Phase B post-merge fails within 1 hour of PR merge (note: S8 v3-final reverts to pre-PR-only Phase B, but operator-invoked post-merge Phase B remains available via the existing Agent #21 charter per ENTRY 015), the engine:
  1. AUTO-DETECTS the failure (Phase B output observed by the engine).
  2. AUTO-PREPARES the rollback: loads the pre-commit snapshot, validates the rollback path is executable against current production state, queues a one-button operator action.
  3. Emits `construction_auto_rollback_pending_operator_confirm.v1` envelope. Operator + admin notified (dashboard + Slack/email integration).
  4. Rollback EXECUTION fires ONLY on explicit operator confirm. No auto-execution. Operator may also choose to defer the rollback (engine queues for retry) or cancel (operator accepts the failed state with rationale, emits `construction_auto_rollback_cancelled.v1`).

The Panel rejected the v2 auto-fire-without-confirm framing (4/10 REJECT). v3-final preserves the auto-rollback safety net (auto-detect + auto-prepare) but gates execution behind the operator — addresses the Panel's "automated destructive action without human-in-the-loop" objection without weakening the rollback invariant itself.

**Why NON-OVERRIDABLE:** rollback is the recovery mechanism for construction blast-radius. v3-final STRENGTHENS the trigger pipeline (auto-detect + auto-prepare) but interposes operator confirmation per Panel feedback. NON-OVERRIDABLE preserves strengthen-only — the rollback invariant itself is unchanged, only the execution trigger gains an operator gate.

**Conformance tests (v3-final):**

- **S5-CT-1..S5-CT-5:** unchanged from v2.
- **S5-CT-6 (v3-final reframed):** simulate Phase B post-merge failure 45 minutes after PR merge → engine auto-detects + auto-prepares rollback + emits `construction_auto_rollback_pending_operator_confirm.v1`. Rollback does NOT execute without operator confirm. Operator confirms → rollback executes + emits `construction_auto_rollback.v1` `trigger: 'phase_b_post_merge_failure'` `operator_confirmed_by: <id>`. Operator cancels → emits `construction_auto_rollback_cancelled.v1` + rollback is NOT performed.
- **S5-CT-7 (v3-final):** 30-day retention enforced (primary); admin sets `construction_snapshot_retention_days = 90` → snapshot persists for 90 days; out-of-bounds values (e.g. 200) REJECTED not clamped.
- **S5-CT-8 (v3-final):** real-rollback-in-CI catches script-broken-but-syntactically-valid rollback (e.g. DOWN migration references a non-existent column); v1 simulation would pass syntax check; v3-final's real-execution FAILS at the missing-column error → abort PR with `construction_rollback_dry_run_failed.v1` `failure_mode: 'execution_failure'`.

### §3.6 S6 — Pre-construction approval (NON-OVERRIDABLE; v3-final SOFTENED narrow in-flight invalidation) 🔒

**v3-final Invariant:** every construction MUST have explicit admin-role approval BEFORE fix-generator runs. Per-construction; 15-minute fresh; rationale ≥60 chars + not stop-words; **in-flight invalidation on materially-changing `governance_record_entry` kinds ONLY** (v3-final narrow scope; was over-broad in v2).

**v3-final in-flight invalidation — narrow scope:**

Between approval-write-time and fix-generator-start-time, the engine watches the target product's `governance_record_entry` log. The approval is INVALIDATED ONLY if a new entry lands of one of the following **canonical materially-changing kinds**:

1. `construction_pre_baseline.v1` — a new baseline replaces the inputs the approval was granted for.
2. `architecture_snapshot.v1` — schema/dependency change invalidates the fix surface.
3. `gtm_bar_admin_override.v1` — changes Step 5 eligibility per CA-13-A v3.
4. `gtm_bar_admin_override_used.v1` — same.
5. `construction_class.v1` — a different construction class starts for the same product.
6. `purpose_drift_annotation.v1` `severity:'critical'` — per CA-15-C v3, critical drift freezes Self-Renewal fix-generation; new approval required if construction is to proceed under the drift-frozen state.

**Everything else does NOT invalidate** — `delta_log` entries from prior runs, `score_history` rows, `proactive_recommendation_disposition.v1` (if revived in a future CA), routine governance audit entries, `ssot_conformance_advisory.v1`, etc. The v2 framing ("ANY new `governance_record_entry`") was over-broad and Panel-rejected at 5/10 REJECT.

The Panel rejected the v2 over-broad invalidation; v3-final preserves the in-flight-invalidation invariant (S6 still gates against drift) while narrowing the trigger set to materially-changing kinds. The v3-final list is a CLOSED SET — any future CA that introduces a new materially-changing kind MUST explicitly add it to this list via a CA-n amendment (the list is canonical, not extensible without Panel review).

**Why NON-OVERRIDABLE:** automated construction without admin-in-the-loop + drift detection = blast-radius scaling failure. v3-final preserves both invariants (admin role + in-flight invalidation) and narrows the over-broad trigger. NON-OVERRIDABLE preserves strengthen-only.

**Other S6 v2 features unchanged:**
- Admin-required for ALL 4 construction classes (v2; unchanged).
- 15-minute freshness (v2; unchanged).
- Rationale ≥60 chars + canonical stop-words set rejection (v2; unchanged).
- Approval envelope includes `phase_a_baseline_hash` field (v2; unchanged — used as the canonical anchor for in-flight detection).

**Conformance tests (v3-final):**

- **S6-CT-1..S6-CT-7:** unchanged from v2.
- **S6-CT-8 (v3-final reframed):** approval at T=0; a `score_history.v1` row lands at T=5min (NOT a materially-changing kind); fix-generator scheduled at T=10min — assert engine does NOT invalidate the approval; fix-generator proceeds. Conversely: approval at T=0; an `architecture_snapshot.v1` row lands at T=5min (IS a materially-changing kind); fix-generator scheduled at T=10min — assert engine invalidates the approval + refuses fix-generator-start + emits `construction_approval_invalidated_by_context_change.v1` with `invalidating_kind: 'architecture_snapshot.v1'`; operator must re-approve.

### §3.7 S7 — Branch-of-record (PANEL-RATIFIABLE; v3-final ROLLBACK to v1)

**v3-final Invariant:** every construction commit MUST land on the per-product `self_renewal_branch` per CA-14-D-Q1 ENTRY 015 cleared-8. **v3-final reverts v2's per-session sub-branches entirely** — every construction (single or multi-step) commits directly to the per-product branch.

**Note on CA-16-B (deferred to future CA-N per `e8bb7d4` CA-16 SPLIT):** if/when the Redesign/Build Environment surface canonicalizes in a future CA-N, that CA-N may introduce its own session-isolation mechanism (sub-branches, separate worktrees, ephemeral environments, etc.). That responsibility belongs to the RB-Env spec, NOT to S7. S7's scope is bounded: per-product `self_renewal_branch` only.

**Conformance tests (v3-final):**

- **S7-CT-1:** construction targeting `main` refused with `construction_branch_violation.v1`.
- **S7-CT-2:** multi-construction sequence on same per-product branch — each construction independently clears S1–S8.
- **S7-CT-3:** per-product branch isolation (product A's commits do not appear on product B's branch).
- (S7-CT-4 from v2 — sub-branch + squash-merge — REMOVED.)

### §3.8 S8 — Post-construction Phase B (PANEL-RATIFIABLE; v3-final ROLLBACK to v1)

**v3-final Invariant:** after construction code is written, the engine MUST run Phase B Adversarial Surface Testing (per CA-14-A canonical + ENTRY 015 cleared-8) against the construction artifacts BEFORE PR opens. PR does NOT open if pre-PR Phase B fails.

**v3-final reverts v2's additions entirely:** no live-preview post-PR-merge Phase B; no dual-load profile testing; no connection-pool / memory-leak / transaction-deadlock backend probes. These were over-extension for the proof phase per Panel 6/9 SIMPLIFY verdict.

**v3-final class-specific coverage (v1 form):**

- **wire_up:** Phase B exercises newly-wired controls (click + verify behavior + adversarial-input).
- **endpoint_generation:** standard interactive probes + existing latency-p99 / error-shape backend tests (the v1 form; no dual-load or connection-pool probes).
- **schema_migration:** Phase B includes S3 5-pillar results + representative query workload (the v1 form).
- **redesign_implementation:** Phase B covers operator-steered scope (the v1 form; deferred to future CA-N per CA-16 SPLIT).

**Note:** the existing Agent #21 Phase B charter (per ENTRY 015 cleared-8) operates post-deploy as normal — independent of S8. S8 governs the pre-PR Phase B specific to construction artifacts; post-deploy Phase B per Agent #21 continues to apply unchanged.

**Conformance tests (v3-final):**

- **S8-CT-1:** pre-PR Phase B failure aborts PR.
- **S8-CT-2:** endpoint_generation backend-specific tests (v1 latency-p99 + error-shape) run.
- **S8-CT-3:** S8 results recorded in `governance_record_entry kind:'construction_phase_b.v1'`.
- (S8-CT-4, S8-CT-5, S8-CT-6 from v2 — live-preview, dual-load, backend probes — REMOVED.)

---

## §4 — Canonical Construction Lifecycle (S1–S8 ordered; v3-final simplified)

```
[Operator initiates construction OR §7.6 finding triggers construction-class fix path]
              │
              ▼
  1. S1 Pre-construction baseline (6 mandatory + optional 4 extended if admin-enabled) → construction_pre_baseline.v1
              │
              ▼
  2. S2 Scope caps declared + validated (v3-final 15/1500/3/4 + density 100) → construction_scope_caps.v1
              │
              ▼
  3. S6 Operator approval (admin-required-all + 15min fresh + rationale + narrow in-flight invalidation) → construction_pre_approval.v1
              │ (admin approval granted; narrow-trigger watch active)
              ▼
  4. Construction code generation (within S2 caps; files written to working tree)
              │
              ▼
  5. S3 Schema migration testing (5-pillar, DLP full-restore + row-count-diff if applicable) → construction_schema_migration_test.v1
              │
              ▼
  6. S4 Construction security suite (9-pillar incl SSRF + rate-limit + CSRF + authz-removal) → construction_security_suite.v1
              │
              ▼
  7. S8 Pre-PR Phase B (v1 form; class-specific coverage) → construction_phase_b.v1
              │
              ▼
  8. S5 Real-rollback dry-run in CI (actual execution against ephemeral copy) → construction_rollback.v1 (dry-run result)
              │
              ▼
  9. S7 CAS-protected commit on per-product self_renewal_branch → construction_commit.v1
              │
              ▼
[PR opens → PR review → operator/admin merge]
              │
              ▼
 10. Existing Agent #21 Phase B operates post-deploy as normal (per ENTRY 015 charter); NOT a construction-specific gate
              │
              ├─[Phase B fails within 1h of merge]─▶ S5 v3-final auto-detect + auto-prepare + operator-confirm-to-fire rollback
              │                                              │
              │                                              ├─[operator confirm]─▶ construction_auto_rollback.v1 emitted; rollback executes
              │                                              └─[operator cancel]─▶ construction_auto_rollback_cancelled.v1 emitted; rollback skipped
```

**§4 conformance tests:** §4-CT-1 (success emits all envelopes in order), §4-CT-2 (mid-flow abort produces abort-specific envelope, downstream envelopes do NOT emit).

---

## §5 — Failure Envelopes (canonical; v3-final)

| # | Envelope | v1/v2/v3-final | Phase |
|---:|---|---|---|
| 1–19 | (v1 envelopes 1–19 unchanged per v1 §5) | v1 | (per v1 §5) |
| 20 | `construction_pre_baseline_incomplete.v1` | v2 retained | S1 schema-rejection |
| 21 | `schema_migration_data_loss_blocked.v1` | v2 retained | S3 DLP abort |
| 22 | `schema_migration_backup.v1` | v2 retained | S3 DLP backup success (now full-restore success per v3-final) |
| 23 | `construction_auto_rollback.v1` | v2 retained | S5 rollback executed (after operator confirm in v3-final) |
| 24 | **`construction_auto_rollback_pending_operator_confirm.v1`** | **v3-final NEW** | S5 auto-detect + auto-prepare pending operator confirm |
| 25 | `construction_auto_rollback_cancelled.v1` | v3-final NEW (implicit per S5-CT-6) | S5 operator cancels |
| 26 | `construction_snapshot_retention_expired.v1` | v2 retained | S5 cleanup |
| 27 | `construction_rationale_quality_failure.v1` | v2 retained | S6 stop-word abort |
| 28 | `construction_approval_invalidated_by_context_change.v1` | v2 retained (narrow scope per v3-final) | S6 narrow-trigger invalidation |

**REMOVED in v3-final** (relative to v2 spec):
- `redesign_session_subbranch_merged.v1` (S7 sub-branch revert).
- `construction_phase_b_post_merge.v1` (S8 live-preview revert).

**Total: 26 envelopes** (v3-final). Down from v2's 28; up from v1's 19.

---

## §6 — Operator-Facing Surfaces (unchanged from v1/v2)

- `/redesign/<productId>` — CA-16-B Redesign Environment (currently DEFERRED to future CA-N per CA-16 SPLIT; admin-only final approval per CA-16-B-Q3 ENTRY 015 §11.7 cleared-8).
- `/architecture` — per §16; construction commits surface alongside §7.6 score history.
- `/clearance` — per §11; construction artifacts surface at Clearance Step 5 if relevant.

---

## §7 — CONVERGENCE-FINAL disposition

**This v3-final pass is the CONVERGENCE-FINAL CEO-disposition track per Locked Rule 13. NO open re-Panel is scheduled.**

The directions folded above are Panel-endorsed convergence per the v2 4-run re-Panel:
- S1 SIMPLIFY (4/7) → drove S1 rollback to 6-field mandatory + extended opt-in.
- S2 DENSITY (3/7) → drove S2 density tightening to 100.
- S3 FULLBACKUP (4/10) → drove S3 DLP full-restore strengthening.
- S4 CSRF (5/10) → drove S4 9th-pillar addition.
- S5 REJECT (4/10) → drove S5 operator-confirm gating before rollback executes.
- S6 REJECT (5/10) → drove S6 narrow in-flight invalidation rewrite.
- S7 REJECT (6/9) → drove S7 rollback to v1 (no sub-branches).
- S8 SIMPLIFY (6/9) → drove S8 rollback to v1 (no live-preview + dual-load + backend probes).

All eight directions are Panel-endorsed. v3-final does not introduce new design surface — it converges to the Panel-endorsed shape and routes to CEO ratification.

---

## §8 — CEO ratification checklist (per invariant)

CEO ratifies v3-final by signing off on each item. Locked-Rule-13 CEO-disposition; no re-Panel.

- **S1:** confirm 6-field MANDATORY baseline + 4-field admin-opt-in extended baseline via `construction_extended_baseline_enabled` toggle.
- **S2 🔒:** confirm system caps 15/1500/3/4 + density ceiling **100 lines/file** + redesign_implementation clamp at system cap; out-of-bounds REJECTED (not clamped).
- **S3:** confirm 5-pillar; DLP now = full-restore + row-count-diff <0.1% (replaces v2 checksum-only); five abort paths per S3-CT-5.
- **S4 🔒:** confirm 9-pillar (v1 6 + SSRF + rate-limit + **CSRF**); CSRF is hard (advisory hybrid NOT adopted).
- **S5 🔒:** confirm pre-commit snapshot + CAS + real-rollback dry-run in CI + 30-day retention (primary; 90-day operator-config option) + **auto-detect + auto-prepare + operator-confirm-to-fire**. Auto-execution-without-confirm REJECTED; invariant preserved via execution gate.
- **S6 🔒:** confirm admin-required-all-classes + 15-min freshness + rationale-quality + **narrow in-flight invalidation** on the closed 6-kind list. Over-broad "any new entry" REJECTED.
- **S7:** confirm rollback to v1: per-product `self_renewal_branch` only; no sub-branches. CA-16-B (deferred) owns any future session isolation.
- **S8:** confirm rollback to v1: pre-PR Phase B only; no live-preview / dual-load / backend probes. Agent #21 post-deploy Phase B (ENTRY 015 charter) operates as normal, independent.

---

## §9 — Acceptance criteria for v3-final promotion

- CEO ratification per §8 checklist above (Locked Rule 13 CEO-disposition track).
- No open W6 re-Panel (CONVERGENCE-FINAL).
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-buildwire-v3final-promotion-<date>.md` per §18.3.
- Once promoted, Path H ENTRY 014 Stage 3 (build/wire) becomes UNBLOCKED.
- Engineering dispatch implements per v3-final lifecycle + §10 conformance test inventory.
- Cross-CA dependencies preserved:
  - CA-14-D-Q1 ENTRY 015 cleared-8 atomic-audit-write invariant (S5 inherits).
  - CA-13-A v3 admin-only-expiring-override out-of-bounds-reject pattern (S5 + S6 reuse).
  - CA-15-C v3 PURPOSE_DRIFT_CRITICAL (S6 narrow in-flight invalidation kind 6).
  - CA-16 SPLIT (CA-16-B deferred — S7 explicitly does NOT take on RB-Env responsibilities).

---

## §10 — Conformance Test Inventory (v3-final)

48 total tests (v1: 33; v2 added 16; v3-final net change −1).

- **S1** (4): S1-CT-1, S1-CT-2, S1-CT-3, **S1-CT-4 (v3-final reframed — extended baseline opt-in validation).**
- **S2** (6): S2-CT-1, S2-CT-2, S2-CT-3, S2-CT-4, **S2-CT-5 (v3-final tightened — density 100)**, S2-CT-6.
- **S3** (5): S3-CT-1, S3-CT-2, S3-CT-3, S3-CT-4, **S3-CT-5 (v3-final STRENGTHENED — DLP full-restore + row-count-diff <0.1%).**
- **S4** (9): S4-CT-1, S4-CT-2, S4-CT-3, S4-CT-4 (v2 extended), S4-CT-5, S4-CT-6 (SSRF v2), S4-CT-7 (rate-limit v2), S4-CT-8 (authz-removal v2), **S4-CT-9 (v3-final NEW — CSRF).**
- **S5** (8): S5-CT-1, S5-CT-2, S5-CT-3, S5-CT-4, S5-CT-5, **S5-CT-6 (v3-final reframed — operator-confirm-to-fire)**, **S5-CT-7 (v3-final — 30-day primary + 90-day option)**, S5-CT-8 (real-rollback v2).
- **S6** (8): S6-CT-1, S6-CT-2, S6-CT-3, S6-CT-4, S6-CT-5 (admin-all v2), S6-CT-6 (15-min v2), S6-CT-7 (rationale-quality v2), **S6-CT-8 (v3-final reframed — narrow in-flight invalidation; closed 6-kind list).**
- **S7** (3): S7-CT-1, S7-CT-2, S7-CT-3. (S7-CT-4 sub-branch REMOVED v3-final.)
- **S8** (3): S8-CT-1, S8-CT-2, S8-CT-3. (S8-CT-4/-5/-6 REMOVED v3-final.)
- **§4 lifecycle** (2): §4-CT-1, §4-CT-2.

**Total: 48 conformance tests** (v3-final).

When CA-15-D v3 ratifies (§27 SSOT-Conformance Gate hard blocking), v3-final tests register in canonical conformance-test inventory at `src/lib/conformance/__tests__/build_wire_engine/`.

---

*End of Build/Wire Engine Spec V3-FINAL — CONVERGENCE PASS. CEO-disposition track per Locked Rule 13. No open W6 re-Panel scheduled. Doc-only; canonical files NOT amended in this commit per CA-n cycle discipline. NON-OVERRIDABLE discipline preserved exactly at S2/S4/S5/S6 per Path H ENTRY 014. S1/S3/S7/S8 panel-ratifiable but converged via v2 4-run re-Panel verdicts; no further open question block. Path H Stage 3 (build/wire) remains BLOCKED until CEO ratifies this v3-final per §8 checklist.*
