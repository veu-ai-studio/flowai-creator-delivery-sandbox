# Build/Wire Engine Spec V2 — DRAFT (8 J2 strengthen directions folded)

**Status:** DRAFT v2 — applies W6 J2 re-Panel verbatim STRENGTHEN directions per `docs/panel-consultations/j2-buildwire-repanel-2026-05-19.md` (commit `4b7de2c`, bundle 43,081 chars — exceeded the 35K engagement ceiling). v2 restructures J2 into **4 runs × 2 invariants** to fit the proven ≤30K bundle recipe. Pending W6 re-Panel.
**Author:** W3, 2026-05-19 (post-cleared-8 promotion `38774b4`, post-CEO ratification of ENTRY 015).
**Anchor canonical:** Path H ENTRY 014 (CEO Locked Rule 13 decision) + ENTRY 015 cleared-8 (CA-14-A LIMITATIONS + Phase B Agent #21 + Locked Rule 19; CA-14-B fix-safety; CA-14-D ProductSSOT operational invariants; CA-16-B-Q3 admin-only Redesign approval; CA-16-C-Q4 §7.6 formula generalization) + v1 BUILD_WIRE_ENGINE_SPEC_DRAFT (commit `4e6260b`).

**Lineage:** v1 (`4e6260b`) → W6 J2 re-Panel (`b2... commit pending` — verbatim verdicts at `j2-buildwire-repanel-2026-05-19.md`, 7/10 engaged, 0/8 cleared, all 8 verdicts PLURALITY-STRENGTHEN or SPLIT-STRENGTHEN) → CEO dispatch STRENGTHEN directions per CEO Locked Rule 13 (this v2).

**PRESERVE: NON-OVERRIDABLE discipline.** S2 / S4 / S5 / S6 are CEO-locked strengthen-only per Path H ENTRY 014 + Locked Rule 13. v2 PRESERVES this — questions for those invariants offer no reject path. This held under live Panel fire (rerun shows zero votes for a hypothetical "weaken S2/S4/S5/S6" option; the verdicts above pure strengthen variants); v2 does not weaken it.

---

## §0 — v2 changelog (per-invariant strengthen vs v1)

| Invariant | v1 verdict (rerun) | v2 STRENGTHEN folded | Driving Panel slot(s) |
|---|---|---|---|
| **S1** | `PLURALITY_J2S1-STRENGTHEN` 6/7 | **Add CA-15-A multi-dim audit baseline + extend hidden-state fingerprint set.** Pre-construction baseline now captures: §7.6 score + finding inventory + §10.1 5-dim audit snapshot (CA-15-A v2 admin-opt-in dims 6+7 included WHEN enabled) + DOM/endpoint/schema/deps hashes + **runtime-config fingerprint** + **feature-flag state** + **background-job inventory** + **external service contract checksums**. v1's 6-field baseline (score + findings + DOM + endpoint + schema + deps) extends to 10 fields. Adds **S1-CT-4** for hidden-state coverage. | Slot 1 + Slot 2 + Slot 4 + Slot 6 + Slot 8 + Slot 10 (J2S1-STRENGTHEN top 6/7); Slot 8 hidden-state objection #24 verbatim. |
| **S2** 🔒 | `PLURALITY_J2S2-SYSCAPS` 3/7 (NON-OVERRIDABLE) | **Tighten system caps to 15 / 1500 / 3 / 4** (from 25 / 2000 / 5 / 5). Add **explicit upper bound for `redesign_implementation` operator-declared scope** (was "operator-declared" unbounded → now capped at same system cap 15 / 1500 / 3 / 4; operator-declared values BELOW system cap respected, ABOVE clamped). Add **density-of-change check** — lines-per-file ceiling: 150 lines per file (system cap; aborts if any single file exceeds, even if total `line_count_cap` not breached). Adds **S2-CT-5** + **S2-CT-6**. | Slot 1 #1 unbounded redesign; Slot 5 #15 operator-declared override potential; Slot 7 #20 redesign caps unvalidated; Slot 8 #25 caps gameable via dense refactors; Slot 10 #30 file_count_cap too permissive. |
| **S3** | `PLURALITY_J2S3-ADD5TH` 6/7 | **Add 5th pillar — Data-Loss-Prevention.** No DROP COLUMN / DROP TABLE / TRUNCATE permitted without explicit operator confirmation envelope + backup verification (pg_dump or equivalent persisted snapshot referenced by S5 substrate). Adds **S3-CT-5** for DLP coverage. | Slot 1 + Slot 2 + Slot 3 + Slot 4 + Slot 6 + Slot 8 + Slot 9 + Slot 10 (J2S3-ADD5TH 6/7); Slot 8 destructive-migration verbatim. |
| **S4** 🔒 | `SPLIT J2S4-ADDSSRF` 3/7 + `J2S4-BOTH` 3/7 (NON-OVERRIDABLE) | **Add 7th pillar — SSRF probes** for endpoints fetching external URLs (canonical SSRF payload set: AWS metadata `169.254.169.254`, GCP metadata, internal-loopback variants, file:// schemes). **Add 8th pillar — Rate-limit / abuse probes** for publicly exposed endpoints (rate-limit declared per endpoint at construction time; probe at 10× declared rate; assert proper 429 + Retry-After). **Extend authz-regression pillar** to cover REMOVAL of authz checks from existing endpoints (pre-construction snapshot of authz contracts; post-construction comparison; any DELETION of an authz check at an existing endpoint fails the pillar). Adds **S4-CT-6** (SSRF), **S4-CT-7** (rate-limit), **S4-CT-8** (authz-removal). | Slot 1 #2 + #9 + Slot 6 #18 authz-removal verbatim; Slot 7 #21 + Slot 8 #29 SSRF verbatim; Slot 3 #9 rate-limit; SPLIT 3-3 between ADDSSRF / BOTH = combine-both is the strict superset matching Locked Rule 13 strengthen-only intent. |
| **S5** 🔒 | `PLURALITY_J2S5-AUTO` 4/7 (NON-OVERRIDABLE) | **Automatic rollback on Phase B failure** within 1 hour of PR merge — engine auto-invokes rollback path without operator action. **30-day retention** — pre-commit snapshot persists in `construction_snapshot` table for ≥30 days post-merge (was undefined retention). **STRENGTHEN dry-run to a REAL rollback invocation in CI before rollback is considered tested** — v1's "simulate rollback" replaced with: execute the actual rollback path against a CI-spawned ephemeral copy of the construction artifacts; rollback success = the ephemeral copy reverts to Phase A baseline state. Dry-run that ONLY validates the script syntax (no execution) is REJECTED. Adds **S5-CT-6** (auto-rollback), **S5-CT-7** (30-day retention), **S5-CT-8** (real-rollback-in-CI). | Slot 1 + Slot 2 + Slot 4 + Slot 6 + Slot 9 + Slot 10 auto-rollback votes (4/7); Slot 7 #22 + Slot 8 #26 + Slot 9 #27 + Slot 10 #31 GitLab-restore-precedent verbatim. |
| **S6** 🔒 | `PLURALITY_J2S6-ADMINALL` 3/7 (NON-OVERRIDABLE) | **Admin-required for ALL construction classes** (not just `schema_migration`). v1's role gate "admin-only for schema_migration; operator permitted for other classes" → v2 "admin-only for all 4 classes". **Freshness window 15 minutes** (was 1 hour). Add **rationale-quality validation** — operator-supplied `rationale` field rejected if < 60 chars OR if matches stop-words set (`approved`, `ok`, `lgtm`, `looks fine`, etc.); rejection emits `construction_rationale_quality_failure.v1`. Add **in-flight context-change invalidation** — if any `governance_record_entry` lands for the target product between approval and fix-generator-start, approval is invalidated; new approval required. Adds **S6-CT-5** (admin-all), **S6-CT-6** (15-min), **S6-CT-7** (rationale-quality), **S6-CT-8** (in-flight invalidation). | Slot 1 + Slot 2 + Slot 3 + Slot 4 + Slot 6 + Slot 10 ADMINALL/BOTH votes; Slot 1 #4 stale approval; Slot 7 #23 rationale unverified; Slot 10 #32 in-flight context. |
| **S7** | `PLURALITY_J2S7-SUBBRANCH` 5/7 | **Per-session sub-branches** within the per-product `self_renewal_branch` for multi-construction redesign sessions (CA-16-B). Branch naming canonical: `<self_renewal_branch>/redesign-session-<sessionId>`. Squash-merge to per-product branch on operator approval (single commit per session in the per-product branch history). Per-product `self_renewal_branch` REMAINS the merge target (preserves CA-14-D Invariant 1 ENTRY 015). Adds **S7-CT-4** (sub-branch + squash-merge). | Slot 1 + Slot 2 + Slot 3 + Slot 4 + Slot 6 + Slot 10 SUBBRANCH 5/7. |
| **S8** 🔒 | `PLURALITY_J2S8-LIVEPREV` 5/7 (NON-OVERRIDABLE per dispatch designation) | **Live-preview Phase B post-PR-merge.** Run Phase B AGAIN on the live preview URL after PR merge; failure within 1 hour triggers S5 auto-rollback. **Dual-load profile testing for `endpoint_generation`** — Phase B runs against TWO load profiles (light: 1 req/s for 60s; heavy: 100 req/s for 60s). Add **connection-pool / memory-leak / transaction-deadlock probes** to the Phase B suite for `endpoint_generation`. Adds **S8-CT-4** (live-preview post-merge), **S8-CT-5** (dual-load), **S8-CT-6** (backend probes). | Slot 1 #2 backend coverage verbatim; Slot 1 + Slot 2 + Slot 4 + Slot 6 + Slot 7 + Slot 8 + Slot 9 + Slot 10 LIVEPREV/BOTH 5/7. |

**Net v2 size:** v1 spec had 33 conformance tests across S1–S8 + lifecycle. v2 adds **16 new** conformance tests (S1-CT-4, S2-CT-5, S2-CT-6, S3-CT-5, S4-CT-6, S4-CT-7, S4-CT-8, S5-CT-6, S5-CT-7, S5-CT-8, S6-CT-5, S6-CT-6, S6-CT-7, S6-CT-8, S7-CT-4, S8-CT-4, S8-CT-5, S8-CT-6) → **49 conformance tests total**.

---

## §1 — Purpose + Scope (unchanged from v1)

Per v1 §1.1–§1.3 — the build/wire engine converts detected shell/mock surfaces into real wired software, operates ALONGSIDE the existing Self-Renewal Executor (does NOT replace it), and the Path H boundary (Stage 3 BLOCKED until ratified) remains in force.

---

## §2 — Construction Classes (canonical taxonomy)

Construction work decomposes into FOUR canonical classes. Each construction operation MUST declare its class BEFORE construction begins:

| Class | Description | S1–S8 applicability | Typical scope (v2 caps) |
|---|---|---|---|
| **wire_up** | Connect existing dead controls to existing or simply-generated handlers (no schema change; no new external deps). | All S1–S8 apply at minimum bound. | 1–5 files, ≤150 lines per file, ≤200 lines total, 0 new deps. |
| **endpoint_generation** | Generate new backend endpoints (REST / GraphQL / RPC) when the surface implies API consumption but none exists. | All S1–S8 apply at standard bound. | 3–10 files, ≤150 lines per file, ≤500 lines total, 0–2 new deps. |
| **schema_migration** | Create new tables / columns / indexes / RLS policies when persistent state is implied but absent. | All S1–S8 apply at strictest bound; S3 MANDATORY (5-pillar). | 1–3 migration files, ≤150 lines per file, ≤200 lines total, 0 new deps. **DROP COLUMN / DROP TABLE / TRUNCATE require explicit S3 DLP confirmation.** |
| **redesign_implementation** | Implement operator-steered redesign session per CA-16-B (when ratified). | All S1–S8 apply at operator-declared scope cap, **NOW BOUNDED at system cap 15/1500/3/4 per CA-13-A v2 + S2 v2** (operator-declared values ABOVE the system cap clamped to system cap). | Operator declares scope ≤ system cap 15/1500/3/4. Per CA-15-A v2 dispatch: admin-only per CA-16-B-Q3 ENTRY 015 cleared-8. |

Construction-class declaration is canonical — recorded in `governance_record_entry` with `kind: 'construction_class.v1'`.

---

## §3 — Eight Safety Invariants (S1–S8) — v2 STRENGTHEN

Conformance-testable invariants with v2 strengthen directions folded.

### §3.1 S1 — Pre-construction baseline (PANEL-RATIFIABLE; v2 EXTENDED)

**v2 Invariant:** Before any construction-class operation begins, the engine MUST capture a **TEN-field baseline** of the target product's current state:

1. **§7.6 score + finding inventory** (per ENTRY 006 + ENTRY 015 cleared-8).
2. **§10.1 5-dim audit snapshot** (UI/UX, API, Logic, Business Value, Security Posture; per ENTRY 015 CA-15-A v2 extended ≤7-dim WHEN `product_registry.expanded_quality_dims_enabled = true`).
3. **Per-page DOM hashes** (sha256 per page route per surface).
4. **Per-endpoint response hashes** (sha256 per endpoint per status code).
5. **Schema fingerprint** (sha256 of `pg_catalog`-derived table/column/index/RLS-policy enumeration).
6. **Dependency-graph fingerprint** (sha256 of `package-lock.json` + imports).
7. **Runtime-config fingerprint (NEW v2)** — sha256 of operator-visible config sources (env-vars expected, feature-flag defaults, operator-config knobs per CA-13-A v2 `gtm_ready_bar_override` + CA-15-A v2 `expanded_quality_dims_enabled` + CA-16-A v2 `recommendation_defer_window_days`).
8. **Feature-flag state (NEW v2)** — current value of every feature flag declared in `product_registry.feature_flags[]` jsonb column; persisted as `{flag_key, value, source: 'default'|'operator-set'}` array.
9. **Background-job inventory (NEW v2)** — enumeration of cron jobs, queue workers, scheduled tasks declared in `architecture_snapshot.background_jobs[]`; persisted as `{job_id, kind, schedule, last_run_at}` array.
10. **External service contract checksums (NEW v2)** — sha256 of every external API contract the product depends on (third-party APIs declared in `architecture_snapshot.external_contracts[]`).

Baseline persists in `governance_record_entry` with `kind: 'construction_pre_baseline.v1'`; schema includes all 10 fields.

**Why STRENGTHENED:** Slot 8 #24 (verbatim): "S1 captures DOM, endpoint, schema, and dependency fingerprints, but not runtime-config, feature flags, queues, background jobs, or external service contracts. A construction can therefore appear safe against the Phase A baseline while still breaking the real deployed behavior that users depend on." Six Panel slots voted J2S1-STRENGTHEN per the rerun.

**Conformance tests (v1 carried forward + NEW v2):**

- **S1-CT-1** (v1, unchanged): Stub a construction without baseline; assert engine refuses with `construction_pre_baseline_missing.v1`.
- **S1-CT-2** (v1, EXTENDED v2): Successful baseline persists in `governance_record_entry` with ALL TEN fields (was 6 in v1). Schema validation rejects partial baselines.
- **S1-CT-3** (v1, unchanged): Baseline immutability — once written, cannot be updated; only appended-to via `construction_post_verification.v1` linkage.
- **S1-CT-4** (NEW v2): Stub a baseline missing field 7/8/9/10 (one at a time); assert schema validation rejects each; emit `construction_pre_baseline_incomplete.v1` with field name. Stub a baseline where runtime-config hash mismatches between snapshot and fix-generator invocation; assert hidden-state-drift detection aborts construction.

### §3.2 S2 — Bounded scope (NON-OVERRIDABLE per CEO Path H; v2 TIGHTENED) 🔒

**v2 Invariant:** Every construction operation MUST declare hard caps BEFORE construction begins, AND respect the v2-tightened system ceilings:

**Per-class defaults (unchanged from v1):**
- `wire_up`: file_count=5, line_count=200, new_deps=0, graph_radius=3
- `endpoint_generation`: file_count=10, line_count=500, new_deps=2, graph_radius=3
- `schema_migration`: file_count=3, line_count=200, new_deps=0, graph_radius=3
- `redesign_implementation`: operator-declared (BUT capped at system cap per below)

**System hard caps (v2 TIGHTENED):**

| Cap | v1 value | **v2 value** |
|---|---|---|
| `file_count_cap` (system max) | 25 | **15** |
| `line_count_cap` (system max) | 2000 | **1500** |
| `new_dependency_cap` (system max) | 5 | **3** |
| `dependency_graph_radius` (system max) | 5 | **4** |

**NEW v2 — Density-of-change ceiling:** per single file, the construction may add + modify a maximum of **150 lines**. This is a per-file ceiling independent of the aggregate `line_count_cap`. Rationale (Slot 8 #25): "Scope caps are gameable" via dense refactors that touch few files but rewrite control flow. A construction whose total line count is 200 (within `wire_up` default) but where one file contains 200 of those lines is REJECTED for density-of-change.

**NEW v2 — Explicit upper bound for `redesign_implementation` operator-declared scope:** the v1 "operator-declared" is now capped at the v2 system cap (15/1500/3/4 per row above). Operator may declare LOWER caps; values above the system cap are clamped via `system_cap_clamp.v1`. Eliminates Slot 1 #1 unbounded redesign + Slot 7 #20 unvalidated redesign caps.

**Enforcement:** caps enforced at the fix-generator boundary; exceeding any cap aborts construction with `construction_scope_violation.v1` BEFORE any code is written.

**Why NON-OVERRIDABLE:** unbounded construction = losing the 25%-max safety net. v2 STRENGTHENS the bound; no reject path. CEO Locked Rule 13.

**Conformance tests (v1 carried forward + NEW v2):**

- **S2-CT-1** (v1, RECALIBRATED v2): stub `endpoint_generation` with file_count=11; assert abort with `cap_violated: 'file_count_cap'`. (Same shape, recalibrated against v2 system cap 15: file_count=16 triggers system-cap; file_count=11 in `endpoint_generation` triggers per-class default 10.)
- **S2-CT-2** (v1, unchanged): stub `wire_up` with line_count=201; assert abort with `cap_violated: 'line_count_cap'`.
- **S2-CT-3** (v1, RECALIBRATED v2): operator override `file_count_cap: 20`; assert clamped to v2 system cap **15** (was 25 in v1) with `system_cap_clamp.v1`; admin notified.
- **S2-CT-4** (v1, EXTENDED v2): all four caps surface in pre-construction approval envelope (S6) PLUS the v2 density-of-change ceiling.
- **S2-CT-5** (NEW v2): density-of-change rejection — stub a 2-file construction where one file adds 200 lines (aggregate line_count=205, just over 200 default); assert abort with `cap_violated: 'file_density_ceiling'` (NOT `line_count_cap` — the density rule trips first).
- **S2-CT-6** (NEW v2): `redesign_implementation` operator-declared `file_count_cap: 20` (over v2 system cap 15); assert clamped to 15; emit `system_cap_clamp.v1`; admin notified. Verifies the v2 explicit upper bound on redesign_implementation operator-declared scope.

### §3.3 S3 — Schema migration testing (PANEL-RATIFIABLE; v2 ADDS 5TH PILLAR)

**v2 Invariant:** Every `schema_migration` class construction MUST pass a **FIVE-PILLAR** schema-test suite BEFORE PR opens:

1. **Idempotency** (v1, unchanged) — running migration twice produces same final schema; second invocation no-op.
2. **Drift detection** (v1, unchanged) — live database schema matches post-migration schema after run.
3. **Lock contention** (v1, unchanged) — migration completes in <5s under p99 expected load.
4. **Reversibility** (v1, unchanged) — explicit `DOWN` path restores pre-migration schema.
5. **Data-loss prevention (NEW v2 — 5TH PILLAR):** any `DROP COLUMN`, `DROP TABLE`, `TRUNCATE`, or any statement that destroys persistent rows is permitted ONLY when ALL of the following hold:
   - The S6 approval envelope's `rationale` field explicitly cites the destructive statement.
   - A pre-migration backup is taken (pg_dump or equivalent persisted blob; backup reference recorded in `governance_record_entry kind:'schema_migration_backup.v1'`).
   - The backup is verified — restored to a CI-spawned ephemeral DB; row counts compared against the source; checksum confirms backup integrity.
   - Operator role is `admin` (S6 v2 admin-required-all-classes also applies).

   If ANY of the four conditions fails, the migration aborts with `schema_migration_data_loss_blocked.v1`. The DLP pillar is NEVER overridable.

**Conformance tests (v1 carried forward + NEW v2):**

- **S3-CT-1** (v1, unchanged): stub schema_migration without explicit DOWN path; assert abort with `schema_migration_no_reversibility.v1`.
- **S3-CT-2** (v1, unchanged): stub non-idempotent migration; assert second-invocation diff detection rejects.
- **S3-CT-3** (v1, unchanged): stub lock-contending migration; assert lock-contention test surfaces measured wait-time + abort recommendation.
- **S3-CT-4** (v1, unchanged): S3 results recorded in `governance_record_entry kind:'schema_migration_test.v1'`.
- **S3-CT-5 (NEW v2):** stub a migration with `DROP COLUMN users.email`. Verify ALL of: (1) S6 rationale missing the DROP COLUMN citation → abort `schema_migration_data_loss_blocked.v1`; (2) S6 rationale cites it but no backup taken → abort; (3) backup taken but checksum-verification fails → abort; (4) backup taken + verified + operator role = `operator` (not admin) → abort with `construction_insufficient_role.v1`. Only when all four pass does the migration proceed.

### §3.4 S4 — Construction security suite (NON-OVERRIDABLE per CEO Path H; v2 EXTENDED) 🔒

**v2 Invariant:** Every construction operation MUST pass an **EIGHT-PILLAR** security-test suite BEFORE PR opens:

1. **SQL injection probes** (v1, unchanged).
2. **XSS probes** (v1, unchanged).
3. **Auth-bypass probes** (v1, unchanged).
4. **Secrets-leakage scan** (v1, unchanged).
5. **Dependency-CVE scan** (v1, unchanged).
6. **Authorization regression (v1, EXTENDED v2):** for every existing endpoint touched, verify the authorization contract pre-construction matches post-construction. **v2 extension:** ALSO verify that no existing endpoint's authorization check has been REMOVED. Pre-construction snapshot of authz contracts (per endpoint: `{endpoint_path, method, required_role[], auth_middleware_chain[]}`); post-construction comparison rejects any DELETION from `required_role[]` or `auth_middleware_chain[]`.
7. **SSRF probes (NEW v2 — 7TH PILLAR):** for every generated endpoint that accepts a URL parameter or body field, probe with canonical SSRF payload set:
   - AWS metadata: `http://169.254.169.254/latest/meta-data/`
   - GCP metadata: `http://metadata.google.internal/computeMetadata/v1/`
   - Internal loopback: `http://127.0.0.1:*`, `http://localhost:*`, `http://0.0.0.0:*`
   - File schemes: `file:///etc/passwd`, `file:///c:/windows/system32/`
   - DNS rebinding probe: a controlled host that resolves to internal IP after first lookup
   Failure: any probe causes the endpoint to make an internal request OR returns content from the probed internal resource. Pre-PR abort with `construction_security_failure.v1` `failure_class: 'ssrf'`.
8. **Rate-limit / abuse probes (NEW v2 — 8TH PILLAR):** for every generated endpoint that is publicly exposed (no auth required OR auth-trivial), probe at 10× the declared rate-limit (rate-limit declared per endpoint in construction envelope; default 60 req/min if undeclared). Assert proper `HTTP 429` + `Retry-After` header. Failure: rate-limit absent OR returns non-429 status under abuse load → `failure_class: 'rate_limit_abuse'`.

**Why NON-OVERRIDABLE:** construction-introduced vulnerabilities = blast-radius scaling failure. v2 STRENGTHENS to 8 pillars; no reject path. CEO Locked Rule 13.

**Conformance tests (v1 carried forward + NEW v2):**

- **S4-CT-1** (v1, unchanged): SQLi catch.
- **S4-CT-2** (v1, unchanged): secrets-leakage catch.
- **S4-CT-3** (v1, unchanged): dep-CVE catch.
- **S4-CT-4** (v1, EXTENDED v2): auth-bypass catch PLUS authz-removal catch (a construction that removes a `required_role: ['admin']` from an existing endpoint MUST fail the extended authz-regression pillar).
- **S4-CT-5** (v1, unchanged): S4 results recorded in `governance_record_entry kind:'construction_security_suite.v1'`.
- **S4-CT-6 (NEW v2):** stub a generated endpoint that fetches `req.body.url`; probe with `http://169.254.169.254/latest/meta-data/`; assert the endpoint refuses (e.g. via URL-allowlist OR via SSRF protection middleware); if request goes through OR metadata content surfaces in response, S4 aborts with `failure_class: 'ssrf'`.
- **S4-CT-7 (NEW v2):** stub a publicly-exposed endpoint with declared rate-limit 60 req/min; probe at 600 req/min; assert `HTTP 429` + `Retry-After` within first 100 requests. Failure scenario: endpoint accepts all 600 requests → abort `failure_class: 'rate_limit_abuse'`.
- **S4-CT-8 (NEW v2):** stub a construction that touches `/api/admin/users/:id` (an existing endpoint with `required_role: ['admin']`); construction removes the role check. Assert pre-construction authz snapshot captures `required_role: ['admin']`; post-construction comparison detects removal; abort with `failure_class: 'authz_removal'`. Verifies the v2 authz-regression extension covers REMOVAL.

### §3.5 S5 — Rollback substrate (NON-OVERRIDABLE per CEO Path H; v2 EXTENDED) 🔒

**v2 Invariant:** Construction commits MUST be atomically reversible via snapshot + CAS + **real-rollback-in-CI** + 30-day retention + **automatic-rollback-on-Phase-B-failure**.

Concrete v2 mechanism:

- **Pre-commit snapshot** (v1, EXTENDED v2 retention) — engine captures pre-construction state. Snapshot persists in `construction_snapshot` table for **≥30 days post-merge** (v2 explicit retention; was undefined in v1).
- **CAS-protected commit** (v1, unchanged).
- **Real-rollback dry-run in CI (v2 STRENGTHENED — replaces v1 "simulate rollback"):** before PR opens, the engine spawns a CI-ephemeral copy of the construction artifacts (file changes + schema migration applied to an ephemeral DB) AND executes the actual rollback path against that copy. Rollback success = the ephemeral copy reverts to the Phase A baseline state (re-run pre-construction Phase A baseline against the rolled-back ephemeral copy; assert score + finding inventory + all 10 baseline fields match within tolerance). **A "syntax-only" dry-run that does NOT execute is REJECTED.** Failure: rollback execution failed OR rolled-back state does not match baseline → abort PR with `construction_rollback_dry_run_failed.v1`.
- **Operator-invoked actual rollback** (v1, unchanged) — operator may invoke rollback via dashboard after PR opens.
- **Automatic rollback on Phase B failure (NEW v2):** if the S8 v2 live-preview Phase B (post-PR-merge) fails within 1 hour of PR merge, the engine auto-invokes the rollback path WITHOUT operator action. Auto-rollback emits `construction_auto_rollback.v1` with `trigger: 'phase_b_post_merge_failure'`; operator + admin notified.

**Why NON-OVERRIDABLE:** rollback is the recovery mechanism for construction blast-radius. v2 STRENGTHENS substantially; no reject path. CEO Locked Rule 13.

**Conformance tests (v1 carried forward + NEW v2):**

- **S5-CT-1** (v1, unchanged): pre-commit snapshot persists with all required fields BEFORE any file write.
- **S5-CT-2** (v1, EXTENDED v2): rollback dry-run failure aborts PR (now real-rollback execution, not simulation).
- **S5-CT-3** (v1, unchanged): CAS contention restart.
- **S5-CT-4** (v1, unchanged): operator-invoked rollback restores Phase A baseline.
- **S5-CT-5** (v1, unchanged): S5 results recorded in `governance_record_entry kind:'construction_rollback.v1'`.
- **S5-CT-6 (NEW v2):** automatic rollback — simulate S8 live-preview Phase B failure 45 minutes after PR merge; assert engine auto-invokes rollback; emit `construction_auto_rollback.v1` with `trigger: 'phase_b_post_merge_failure'`; verify rolled-back state matches Phase A baseline.
- **S5-CT-7 (NEW v2):** 30-day retention — verify `construction_snapshot` row persists for ≥30 days post-merge; query at day 29 returns the snapshot; cleanup job at day 31 removes it (cleanup-job-emits `construction_snapshot_retention_expired.v1`).
- **S5-CT-8 (NEW v2):** real-rollback-in-CI — stub a construction with a syntactically-valid but semantically-broken rollback path (e.g. DOWN migration references a column the UP migration didn't create); v1's "simulate" would pass (script parses fine); v2's "real execution" FAILS (rollback execution errors on the missing column); assert v2 aborts PR with `construction_rollback_dry_run_failed.v1` `failure_mode: 'execution_failure'`. The GitLab restore-precedent (Slot 9 #27) is the load-bearing failure mode this test surfaces.

### §3.6 S6 — Pre-construction operator approval (NON-OVERRIDABLE per CEO Path H; v2 STRENGTHENED) 🔒

**v2 Invariant:** Every construction-class operation MUST have explicit **admin-role** approval BEFORE the fix-generator runs. Approval is per-construction (not per-product blanket), with **15-minute freshness**, **rationale-quality validation**, and **in-flight context-change invalidation**.

**v2 Approval envelope:**

```json
{
  "kind": "construction_pre_approval.v1",
  "runId": "string",
  "productId": "string",
  "construction_class": "wire_up | endpoint_generation | schema_migration | redesign_implementation",
  "scope_caps_declared": { /* v2 system caps 15/1500/3/4 + density 150 */ },
  "construction_intent_summary": "string (1-3 sentence LLM summary)",
  "phase_a_baseline_ref": "string (S1 baseline entry pointer)",
  "phase_a_baseline_hash": "string (v2 NEW — hash of S1 baseline at approval time, used for in-flight invalidation)",
  "estimated_findings_resolved": 0,
  "estimated_score_delta_7_6": 0,
  "approval_signature": {
    "operator_role": "admin",                      // v2 ADMIN-REQUIRED for all classes
    "operator_identity": "string",
    "approved_at": "ISO8601",
    "rationale": "string (≥60 chars, not in stop-words set)"
  }
}
```

**v2 Approval discipline:**

- **Admin role required for ALL construction classes** (v2; was admin-only-for-schema_migration in v1). Operator role rejected with `construction_insufficient_role.v1` regardless of class.
- **Freshness window: 15 minutes** (v2; was 1 hour). Approval older than 15 min MUST be re-confirmed.
- **Rationale quality validation (NEW v2):** approval rationale field MUST be ≥60 chars AND MUST NOT match the canonical stop-words set: `["approved", "ok", "lgtm", "looks fine", "looks good", "go", "ship it", "yes", "y", "ack", "approve", "fine", "approved.", "ok.", "lgtm.", "+1", "n/a", "n/a.", "tbd", "..."]`. Quality validation runs on the rationale string; failure emits `construction_rationale_quality_failure.v1`.
- **In-flight context-change invalidation (NEW v2):** between approval-write-time and fix-generator-start-time, the engine checks `governance_record_entry` for any new rows landed on the target product (`productId` match). If ANY new entry exists (other than the approval itself), the approval is INVALIDATED — operator must re-approve. Specifically: if a `delta_log` row, a `governance_record` row, a `score_history` row, or any `governance_record_entry` row lands on the product, the approval invalidates. v2 envelope's `phase_a_baseline_hash` field is the load-bearing anchor for this check (hash mismatch between approval-time and start-time = context changed).

**Why NON-OVERRIDABLE:** automated construction without admin-in-the-loop = blast-radius scaling failure. v2 STRENGTHENS substantially; no reject path. CEO Locked Rule 13.

**Conformance tests (v1 carried forward + NEW v2):**

- **S6-CT-1** (v1, unchanged): construction without approval refused.
- **S6-CT-2** (v1, RECALIBRATED v2): stale approval (>15 min, was >1h in v1) refused + re-confirmation requested.
- **S6-CT-3** (v1, EXTENDED v2): operator-role approval refused for ALL classes (not just schema_migration). Test cases: operator-approved wire_up, endpoint_generation, schema_migration, redesign_implementation — all four refused with `construction_insufficient_role.v1`.
- **S6-CT-4** (v1, EXTENDED v2): approval envelope persists with all v2 fields including `phase_a_baseline_hash` + `rationale ≥60 chars`.
- **S6-CT-5 (NEW v2):** admin-role-required for all classes — `wire_up` with operator-role approval refused (in v1 this would pass; in v2 refused).
- **S6-CT-6 (NEW v2):** 15-minute freshness — approval at T=0, fix-generator start at T=16min; assert engine refuses + requests re-confirmation; v1's 60-min window would have accepted.
- **S6-CT-7 (NEW v2):** rationale-quality validation — submit approval with `rationale: "lgtm"` (matches stop-word); assert `construction_rationale_quality_failure.v1` + approval refused. Submit with `rationale: "fine looks good"` (matches stop-phrase via substring) → refused. Submit with `rationale: "Approving wire_up construction to connect the dead 'Submit' button on /signup to the /api/auth/signup endpoint; baseline score 67/100 expects to reach 75/100 with this fix" (>60 chars, no stop-word) → passes.
- **S6-CT-8 (NEW v2):** in-flight context-change invalidation — approval at T=0; another `delta_log` entry lands for the product at T=5min; fix-generator scheduled at T=10min; assert engine detects the new entry, invalidates the approval, refuses fix-generator-start, emits `construction_approval_invalidated_by_context_change.v1`, operator must re-approve.

### §3.7 S7 — Branch-of-record interaction (PANEL-RATIFIABLE; v2 ADDS SUB-BRANCHES)

**v2 Invariant:** Every construction commit MUST land on the per-product `self_renewal_branch` per CA-14-D Invariant 1 (ENTRY 015 cleared-8). Multi-construction redesign sessions (CA-16-B) use **per-session sub-branches** within the per-product branch.

**v2 Branch discipline:**

- **Single-construction (wire_up, endpoint_generation, schema_migration, single-step redesign):** commit lands directly on per-product `self_renewal_branch` (v1 behavior preserved).
- **Multi-construction redesign session (CA-16-B with multiple proposals per session):** session creates a sub-branch named `<self_renewal_branch>/redesign-session-<sessionId>` from the per-product branch HEAD. Each construction in the session commits to the sub-branch. On operator approval of the entire session, sub-branch **squash-merges** to the per-product branch (single commit per session in per-product branch history). Sub-branch is preserved for 30 days post-merge (matches S5 v2 retention) then deleted; `governance_record_entry kind:'redesign_session_subbranch_merged.v1'` records the squash-merge.
- **Per-product `self_renewal_branch` REMAINS the merge target** (preserves CA-14-D-Q1 ENTRY 015 cleared-8 invariant — branch-of-record stays per-product).
- Construction commits NEVER land on `main` directly; ALWAYS via per-product branch (or sub-branch of it) + PR.
- Branch HEAD CAS protection per S5.

**Conformance tests (v1 carried forward + NEW v2):**

- **S7-CT-1** (v1, unchanged): construction targeting `main` refused with `construction_branch_violation.v1`.
- **S7-CT-2** (v1, unchanged): multi-construction sequence on same per-product branch — each construction independently clears S1–S8.
- **S7-CT-3** (v1, unchanged): per-product branch isolation.
- **S7-CT-4 (NEW v2):** CA-16-B redesign session with 3 proposals creates `<self_renewal_branch>/redesign-session-<sessionId>` sub-branch; each proposal commits to sub-branch; on operator approval, sub-branch squash-merges to per-product branch as a single commit; per-product `self_renewal_branch` history shows one squash-merge commit (NOT 3 separate commits); sub-branch retained for 30 days; `redesign_session_subbranch_merged.v1` envelope emitted.

### §3.8 S8 — Post-construction Phase B mandatory (PANEL-RATIFIABLE; v2 LIVE-PREVIEW + DUAL-LOAD + BACKEND PROBES)

**v2 Invariant:** Phase B runs THREE times against construction artifacts:

1. **Pre-PR Phase B** (v1, unchanged): after construction code written, before PR opens. PR does NOT open if pre-PR Phase B fails.
2. **Live-preview Phase B (NEW v2 — post-PR-merge):** after PR merges and Vercel/equivalent live preview URL is provisioned, Phase B runs AGAIN against the live preview URL. Failure within 1 hour of PR merge triggers S5 v2 auto-rollback. Covers the "construction passes Phase B in CI but breaks on prd deploy" failure mode (Slot 1 + Slot 2 + Slot 6 + Slot 8 verbatim).
3. **Dual-load Phase B for `endpoint_generation` (NEW v2):** Phase B runs against TWO load profiles:
   - **Light load:** 1 req/s for 60s. Asserts baseline correctness + latency-p99 + error-shape.
   - **Heavy load:** 100 req/s for 60s. Asserts no concurrency-bug regressions (response correctness preserved under load; no race-condition data corruption).

**Backend probes (NEW v2 — added to Phase B suite for `endpoint_generation`):**

- **Connection-pool exhaustion** — verify the endpoint's DB connection-pool config is sized appropriately for the heavy-load profile (pool size ≥ p99 concurrent connections); failure if heavy-load p99 hits pool ceiling causing `pool_timeout` errors.
- **Memory-leak probe** — run heavy-load for 60s; observe Node process RSS at t=0 and t=60s; assert RSS growth ≤20% (any larger growth signals a memory leak in the construction).
- **Transaction-deadlock probe** — for endpoints touching ≥2 DB tables, run a concurrent-write workload that targets both tables in different orders simultaneously; assert no deadlocks observed (Postgres `pg_locks` query confirms no `deadlock_detected` entries during the 60s window).

**Class-specific Phase B coverage (v1, EXTENDED v2):**

- **wire_up:** Phase B exercises newly-wired controls (click + verify + adversarial-input). (v1 unchanged.)
- **endpoint_generation:** standard interactive probes + dual-load + 3 backend probes above.
- **schema_migration:** Phase B includes S3 5-pillar results + representative query workload + S3 v2 DLP confirmation.
- **redesign_implementation:** Phase B covers operator-steered scope per CA-16-B; out-of-scope surfaces verified unchanged.

**Conformance tests (v1 carried forward + NEW v2):**

- **S8-CT-1** (v1, unchanged): pre-PR Phase B failure aborts PR.
- **S8-CT-2** (v1, unchanged): endpoint_generation backend-specific tests (latency-p99 + error-shape) run.
- **S8-CT-3** (v1, unchanged): S8 results recorded in `governance_record_entry kind:'construction_phase_b.v1'`.
- **S8-CT-4 (NEW v2):** live-preview Phase B — after PR merge, engine triggers Phase B against the Vercel preview URL; failure within 1 hour triggers S5 auto-rollback (cross-test with S5-CT-6); `construction_phase_b_post_merge.v1` envelope emitted.
- **S8-CT-5 (NEW v2):** dual-load Phase B for endpoint_generation — assert Phase B runs both light (1 req/s) AND heavy (100 req/s) load; heavy-load run that surfaces a race-condition (e.g. stale-read on a non-atomic balance update) FAILS Phase B and aborts PR.
- **S8-CT-6 (NEW v2):** backend probes — endpoint_generation construction that introduces a connection-pool exhaustion bug (e.g. forgets to release a pool connection in a code path) FAILS the connection-pool-exhaustion probe; construction that introduces a memory leak (e.g. holds large objects in a module-level Map without eviction) FAILS the memory-leak probe; construction that introduces a transaction-deadlock pattern (e.g. inconsistent table-lock order in two endpoints) FAILS the deadlock probe. Each probe failure emits a distinct `failure_class` in `construction_phase_b_failure.v1`.

---

## §4 — Canonical Construction Lifecycle (S1–S8 ordered; v2 same ordering)

```
[Operator initiates construction via CA-16-B Redesign Environment OR §7.6
 finding triggers construction-class fix path]
              │
              ▼
  1. S1 Pre-construction baseline (10 fields per v2) → construction_pre_baseline.v1
              │
              ▼
  2. S2 Scope caps declared + validated (v2 caps 15/1500/3/4 + density 150) → construction_scope_caps.v1
              │
              ▼
  3. S6 Operator approval (v2 ADMIN-required, 15min fresh, rationale ≥60, in-flight invalidation) → construction_pre_approval.v1
              │ (admin approval granted)
              ▼
  4. Construction code generation (within S2 caps; files written to working tree, NOT committed)
              │
              ▼
  5. S3 Schema migration testing (if applicable; v2 5-pillar incl DLP) → construction_schema_migration_test.v1
              │
              ▼
  6. S4 Construction security suite (v2 8-pillar incl SSRF + rate-limit + authz-removal) → construction_security_suite.v1
              │
              ▼
  7. S8 Pre-PR Phase B (v2 + dual-load + backend probes for endpoint_generation) → construction_phase_b.v1
              │
              ▼
  8. S5 Real rollback dry-run in CI (v2 — actual execution, not simulation) → construction_rollback.v1 (dry-run result)
              │
              ▼
  9. S7 CAS-protected commit on per-product self_renewal_branch (or sub-branch per v2) → construction_commit.v1
              │
              ▼
[PR opens → PR review → operator/admin merge]
              │
              ▼
 10. S8 Live-preview Phase B (NEW v2; post-PR-merge; within 1h of merge) → construction_phase_b_post_merge.v1
              │
              ├─[failure within 1h]─▶ S5 v2 auto-rollback → construction_auto_rollback.v1
              │
              ▼
 11. CA-16-B redesign session: sub-branch squash-merges to per-product branch → redesign_session_subbranch_merged.v1
```

**Any failure aborts construction with the corresponding envelope; downstream envelopes do NOT emit.**

**Conformance tests:**

- **§4-CT-1:** every successful construction emits ALL envelopes in v2 order (1–11).
- **§4-CT-2:** mid-flow abort produces abort-specific envelope; downstream envelopes do NOT emit.

---

## §5 — Failure Envelopes (canonical; v2 EXTENDED)

v1 had 19 envelopes. v2 adds **9 new**:

| # | Envelope | v1/v2 | Phase |
|---:|---|---|---|
| 1–19 | (v1 envelopes 1–19 unchanged) | v1 | (per v1 §5) |
| 20 | `construction_pre_baseline_incomplete.v1` | v2 NEW | S1 schema-rejection abort |
| 21 | `schema_migration_data_loss_blocked.v1` | v2 NEW | S3 DLP abort |
| 22 | `schema_migration_backup.v1` | v2 NEW | S3 DLP backup success |
| 23 | `construction_auto_rollback.v1` | v2 NEW | S5 auto-rollback |
| 24 | `construction_snapshot_retention_expired.v1` | v2 NEW | S5 30-day cleanup |
| 25 | `construction_rationale_quality_failure.v1` | v2 NEW | S6 rationale stop-word abort |
| 26 | `construction_approval_invalidated_by_context_change.v1` | v2 NEW | S6 in-flight invalidation |
| 27 | `redesign_session_subbranch_merged.v1` | v2 NEW | S7 sub-branch squash-merge |
| 28 | `construction_phase_b_post_merge.v1` | v2 NEW | S8 live-preview |

Total: **28 envelopes** (v1: 19, v2 NEW: 9). All ship in Cluster D Deferred set per CA-14-D §2 5-topic-per-ship cap → engineering dispatch spreads across 6 successive commits.

---

## §6 — Operator-Facing Surfaces (unchanged from v1)

- `/redesign/<productId>` — CA-16-B Redesign Environment (ratified per CA-16-B-Q3 ENTRY 015 admin-only approval).
- `/architecture` — per §16; construction commits surface alongside §7.6 + §10.1 extended dims (CA-15-A v2).
- `/clearance` — per §11 + §11.7 CA-16-B-Q3 admin-only Redesign approval gate (ENTRY 015).

---

## §7 — J2 v2 re-Panel — restructured into 4 RUNS × 2 INVARIANTS

The prior J2 bundle was 43,081 chars (over the 35K engagement ceiling that W6 flagged). v2 restructures into 4 runs × 2 invariants each, with each run's bundle ≤30K (matching the proven 27,778-char engagement recipe).

**Run pairing:**

- **Run 1: S1 + S2** (pre-construction baseline + bounded scope)
- **Run 2: S3 + S4** (schema migration testing + construction security suite)
- **Run 3: S5 + S6** (rollback substrate + pre-construction approval)
- **Run 4: S7 + S8** (branch-of-record + post-construction Phase B)

**NON-OVERRIDABLE discipline preserved:** S2 / S4 / S5 / S6 questions in each run's bundle offer **strengthen-only options** + INSUFFICIENT — no reject path. v2 enforces this verbatim per CEO Locked Rule 13.

See §8 below for the 4 bundle-ready run blocks.

---

## §8 — 4 Bundle-Ready Run Blocks

Each block below is copy-paste-ready for Panel consumption. Sized to fit the ≤30K engagement-recipe ceiling. Each contains: compact spec excerpt for those 2 invariants + §2 taxonomy + §4 lifecycle reference + 2 questions (4-options + INSUFFICIENT).

---

### §8.1 — RUN 1 BUNDLE — S1 (pre-construction baseline) + S2 (bounded scope) 🔒

**[BUNDLE START — Run 1: S1 + S2 — target ≤30K chars]**

**Context for Panel (Run 1):** v2 of the Build/Wire Engine Spec restructures the prior J2 bundle (43K chars, exceeded engagement ceiling) into 4 focused runs × 2 invariants each. Run 1 covers S1 (pre-construction baseline) + S2 (bounded scope). S2 is NON-OVERRIDABLE per CEO Locked Rule 13 (Path H ENTRY 014) — strengthen-only options offered.

**§2 — Construction Classes (canonical taxonomy, v2):**

| Class | Description | v2 caps |
|---|---|---|
| `wire_up` | Connect existing dead controls to handlers (no schema; no deps) | 1–5 files, ≤150 lines/file, ≤200 lines total, 0 new deps |
| `endpoint_generation` | Generate new backend endpoints | 3–10 files, ≤150 lines/file, ≤500 lines total, 0–2 new deps |
| `schema_migration` | Create new tables / columns / indexes / RLS policies | 1–3 migration files, ≤150 lines/file, ≤200 lines total, DLP per S3 |
| `redesign_implementation` | Operator-steered redesign per CA-16-B | operator-declared ≤ system cap 15/1500/3/4 (v2 explicit upper bound) |

**§3.1 S1 — Pre-construction baseline (PANEL-RATIFIABLE; v2 EXTENDED to 10 fields)**

**Invariant:** Before any construction begins, the engine MUST capture a 10-field baseline:
1. §7.6 score + finding inventory
2. §10.1 5-dim audit snapshot (CA-15-A v2 admin-opt-in ≤7-dim when enabled)
3. Per-page DOM hashes
4. Per-endpoint response hashes
5. Schema fingerprint
6. Dependency-graph fingerprint
7. **Runtime-config fingerprint (NEW v2)**
8. **Feature-flag state (NEW v2)**
9. **Background-job inventory (NEW v2)**
10. **External service contract checksums (NEW v2)**

Baseline persists in `governance_record_entry kind:'construction_pre_baseline.v1'` with all 10 fields. Slot 8 #24 verbatim drove the strengthen: "S1 captures DOM, endpoint, schema, and dependency fingerprints, but not runtime-config, feature flags, queues, background jobs, or external service contracts."

**Conformance tests (v2):** S1-CT-1 (no-baseline refusal), S1-CT-2 (10-field schema validation), S1-CT-3 (immutability), **S1-CT-4 NEW v2** (hidden-state field coverage).

**§3.2 S2 — Bounded scope (NON-OVERRIDABLE per CEO Path H; v2 TIGHTENED) 🔒**

**Invariant:** Every construction declares hard caps before generation. v2 system hard caps:

| Cap | v1 | **v2** |
|---|---|---|
| `file_count_cap` | 25 | **15** |
| `line_count_cap` | 2000 | **1500** |
| `new_dependency_cap` | 5 | **3** |
| `dependency_graph_radius` | 5 | **4** |

**NEW v2:** Density-of-change — per-file ceiling of **150 lines** (Slot 8 #25 verbatim — caps gameable via dense refactors). **NEW v2:** Explicit upper bound for `redesign_implementation` operator-declared scope = the v2 system cap (Slot 1 #1 + Slot 7 #20). Caps enforced at fix-generator boundary; abort BEFORE write with `construction_scope_violation.v1`.

**Why NON-OVERRIDABLE:** unbounded construction = losing the 25%-max safety net. v2 STRENGTHENS the bound; no reject path. CEO Locked Rule 13.

**Conformance tests (v2):** S2-CT-1 (per-class file_count violation), S2-CT-2 (line_count violation), S2-CT-3 (system-cap clamp recalibrated to v2 15), S2-CT-4 (all caps surface in S6 approval envelope including density), **S2-CT-5 NEW v2** (density-of-change rejection — 200-line single file), **S2-CT-6 NEW v2** (redesign_implementation operator-declared clamp).

**§4 lifecycle reference (Run 1 phases 1–2):** S1 baseline → S2 cap validation → S6 approval → fix-generator → S3/S4/S8/S5 → S7 commit → live-preview Phase B → potential auto-rollback. Run 1 covers phases 1–2 (baseline + caps); subsequent runs cover the downstream phases.

#### Question J2v2-S1-Q (Run 1, Q1) — Pre-construction baseline (PANEL-RATIFIABLE)

v2 extends S1 to a 10-field baseline (v1 6-field + runtime-config + feature-flag state + background-job inventory + external contract checksums). Right scope?

- (a) **Ratify S1 v2 as drafted** (10-field baseline per the 4 NEW v2 hidden-state fields).
- (b) Strengthen further — also require **operator-declared user-journey baseline** (sequence of named flows the product is expected to serve; baseline captures whether each flow is presently functional).
- (c) Simplify — keep v1's 6-field baseline; v2's 4 NEW hidden-state fields move to a separate "extended baseline" admin-opt-in (default OFF) per CA-15-A v2 dims-6+7 pattern.
- (d) Reject the 4 NEW fields entirely — v1's 6-field baseline is sufficient; the hidden-state failure mode is theoretical, not observed.
- (e) INSUFFICIENT_INFORMATION.

#### Question J2v2-S2-Q (Run 1, Q2) — Bounded scope (NON-OVERRIDABLE — strengthen-only)

v2 tightens system caps to **15 / 1500 / 3 / 4** + adds per-file density ceiling **150 lines** + explicit upper bound for `redesign_implementation` operator-declared scope. NON-OVERRIDABLE per CEO Locked Rule 13. Right caps?

- (a) **Ratify S2 v2 as drafted** (15/1500/3/4 system caps + 150 lines/file density + redesign_implementation clamped to system cap).
- (b) Strengthen further — tighten system caps to **10 / 1000 / 2 / 3** (half-step beyond v2 drafted) + density ceiling to **100 lines/file**.
- (c) Strengthen via density-only — keep v2 system caps 15/1500/3/4 but tighten density to **100 lines/file** (more restrictive than v2 drafted 150 but preserves overall cap).
- (d) Strengthen via per-class only — keep v2 system caps + density 150, but reduce per-class defaults to half (wire_up=3/100/0/2 etc.) so the default-state operation is more conservative even though caps remain.
- (e) INSUFFICIENT_INFORMATION.

**[BUNDLE END — Run 1]**

---

### §8.2 — RUN 2 BUNDLE — S3 (schema migration testing) + S4 (construction security suite) 🔒

**[BUNDLE START — Run 2: S3 + S4 — target ≤30K chars]**

**Context for Panel (Run 2):** Run 2 covers S3 (5-pillar schema migration testing, NEW DLP pillar) + S4 (8-pillar construction security suite, NEW SSRF + rate-limit pillars + extended authz-regression). S4 is NON-OVERRIDABLE per CEO Locked Rule 13 — strengthen-only options offered.

**§2 — Construction Classes (taxonomy, abridged for Run 2):**

S3 applies to `schema_migration` class only. S4 applies to all 4 classes (`wire_up`, `endpoint_generation`, `schema_migration`, `redesign_implementation`).

**§3.3 S3 — Schema migration testing (PANEL-RATIFIABLE; v2 ADDS 5TH PILLAR — DLP)**

**Invariant:** Every `schema_migration` construction MUST pass 5 pillars BEFORE PR:
1. Idempotency (v1 unchanged)
2. Drift detection (v1 unchanged)
3. Lock contention <5s p99 (v1 unchanged)
4. Reversibility — explicit DOWN path (v1 unchanged)
5. **Data-Loss Prevention (NEW v2 — 5TH pillar)** — `DROP COLUMN` / `DROP TABLE` / `TRUNCATE` requires ALL of: explicit S6 rationale citation; pg_dump backup persisted + verified (CI ephemeral DB restore + checksum); admin role (S6 v2 admin-required). Any failure → abort with `schema_migration_data_loss_blocked.v1`.

Slot 1 + Slot 2 + Slot 3 + Slot 4 + Slot 6 + Slot 8 + Slot 9 + Slot 10 — 6/7 J2S3-ADD5TH (Slot 8 verbatim: "data-loss guard is the most important strengthening").

**Conformance tests (v2):** S3-CT-1 (no DOWN path refused), S3-CT-2 (non-idempotent refused), S3-CT-3 (lock contention surfaces), S3-CT-4 (results recorded), **S3-CT-5 NEW v2** (DLP — 4 distinct abort paths: no-rationale-citation, no-backup, backup-checksum-fail, operator-role-not-admin).

**§3.4 S4 — Construction security suite (NON-OVERRIDABLE per CEO Path H; v2 EXTENDED) 🔒**

**Invariant:** Every construction MUST pass 8 security pillars BEFORE PR (v1 had 6; v2 adds 2 + extends 1):

1. SQLi probes (v1)
2. XSS probes (v1)
3. Auth-bypass probes (v1)
4. Secrets-leakage scan (v1)
5. Dependency-CVE scan (v1)
6. **Authorization regression (v1 EXTENDED v2)** — pre-construction snapshot of `{endpoint_path, method, required_role[], auth_middleware_chain[]}` per endpoint; post-construction comparison rejects any DELETION from `required_role[]` or `auth_middleware_chain[]`. Slot 6 #18 verbatim.
7. **SSRF probes (NEW v2 — 7TH pillar)** — canonical payload set: AWS metadata `169.254.169.254`, GCP metadata, internal loopback, file:// schemes, DNS rebinding. Slot 7 #21 + Slot 8 #29 verbatim.
8. **Rate-limit / abuse probes (NEW v2 — 8TH pillar)** — public endpoints probed at 10× declared rate-limit; assert HTTP 429 + Retry-After. Slot 3 #9.

**Why NON-OVERRIDABLE:** construction-introduced vulnerabilities = blast-radius scaling. v2 STRENGTHENS to 8 pillars; no reject path. CEO Locked Rule 13.

**Conformance tests (v2):** S4-CT-1 (SQLi), S4-CT-2 (secrets), S4-CT-3 (CVE), S4-CT-4 EXTENDED (auth-bypass + authz-removal), S4-CT-5 (results recorded), **S4-CT-6 NEW v2** (SSRF AWS-metadata probe), **S4-CT-7 NEW v2** (rate-limit 10x probe → 429), **S4-CT-8 NEW v2** (authz-removal detection).

#### Question J2v2-S3-Q (Run 2, Q1) — Schema migration testing (PANEL-RATIFIABLE)

v2 adds a 5th pillar — Data-Loss Prevention. DROP COLUMN / DROP TABLE / TRUNCATE require explicit rationale citation + verified pg_dump backup + admin role. Right scope?

- (a) **Ratify S3 v2 as drafted** (5 pillars including DLP).
- (b) Strengthen further — DLP MUST also require a 24-hour operator-cooldown window between approval and execution (gives time to reconsider before destructive action).
- (c) Strengthen via backup verification — require backup-restore-and-row-count-match (full restore + count diff < 0.1%) BEFORE the destructive migration runs, not just checksum verification.
- (d) Reject the 5th pillar — destructive migrations belong in a separate W5x dispatch with manual operator review; the build/wire engine should not handle them at all.
- (e) INSUFFICIENT_INFORMATION.

#### Question J2v2-S4-Q (Run 2, Q2) — Construction security suite (NON-OVERRIDABLE — strengthen-only)

v2 extends S4 to 8 pillars (drafted 6 + SSRF + rate-limit) + authz-regression extended to cover REMOVAL. NON-OVERRIDABLE per CEO Locked Rule 13. Right scope?

- (a) **Ratify S4 v2 as drafted** (8 pillars including SSRF + rate-limit + extended authz).
- (b) Strengthen further — add 9th pillar **CSRF probes** for state-changing endpoints (POST/PUT/PATCH/DELETE that lack CSRF-token check OR equivalent SameSite enforcement).
- (c) Strengthen further — add 9th pillar **prototype-pollution probes** for Node.js endpoints that merge user-supplied objects (e.g. `Object.assign(target, req.body)`).
- (d) Strengthen further — both (b) AND (c) — 10-pillar S4 (drafted 8 + CSRF + prototype-pollution).
- (e) INSUFFICIENT_INFORMATION.

**[BUNDLE END — Run 2]**

---

### §8.3 — RUN 3 BUNDLE — S5 (rollback substrate) + S6 (pre-construction approval) 🔒

**[BUNDLE START — Run 3: S5 + S6 — target ≤30K chars]**

**Context for Panel (Run 3):** Run 3 covers S5 (rollback substrate with auto-rollback + 30-day retention + real-rollback-in-CI) + S6 (admin-required-all-classes + 15-min freshness + rationale-quality + in-flight context invalidation). BOTH S5 AND S6 are NON-OVERRIDABLE per CEO Locked Rule 13 — strengthen-only options offered.

**§3.5 S5 — Rollback substrate (NON-OVERRIDABLE; v2 EXTENDED) 🔒**

**Invariant:** Construction commits MUST be atomically reversible via: pre-commit snapshot + CAS commit + **real-rollback dry-run in CI** + **30-day retention** + **automatic rollback on Phase B post-merge failure**.

**v2 specifics:**

- **Real-rollback dry-run in CI** (v2 STRENGTHEN — replaces v1 simulation): before PR opens, the engine spawns a CI-ephemeral copy of construction artifacts AND **executes the actual rollback path** against that copy; rollback success = ephemeral copy reverts to Phase A baseline (all 10 fields per S1 v2). Syntax-only dry-run REJECTED. Slot 8 #26 + Slot 9 #27 verbatim — GitLab restore-failure precedent.
- **30-day retention** (NEW v2): `construction_snapshot` table persists snapshot for ≥30 days post-merge. Slot 7 #22 verbatim.
- **Automatic rollback on Phase B post-merge failure** (NEW v2): if S8 live-preview Phase B fails within 1 hour of PR merge, engine auto-invokes rollback path without operator action. 4/7 J2S5-AUTO + Slot 1 + Slot 4 + Slot 6 + Slot 10.

**Why NON-OVERRIDABLE:** rollback is the recovery mechanism for construction blast-radius. v2 STRENGTHENS substantially; no reject path. CEO Locked Rule 13.

**Conformance tests (v2):** S5-CT-1 (snapshot persists), S5-CT-2 (rollback dry-run fail aborts PR), S5-CT-3 (CAS contention restart), S5-CT-4 (operator-invoked rollback), S5-CT-5 (results recorded), **S5-CT-6 NEW v2** (auto-rollback triggered by post-merge Phase B fail within 1h), **S5-CT-7 NEW v2** (30-day retention enforcement), **S5-CT-8 NEW v2** (real-rollback execution catches script-broken-but-syntactically-valid rollback that v1 simulation would pass).

**§3.6 S6 — Pre-construction operator approval (NON-OVERRIDABLE; v2 STRENGTHENED) 🔒**

**Invariant:** Every construction-class operation MUST have explicit **admin-role** approval BEFORE fix-generator runs. Per-construction; 15-min fresh; rationale-quality validated; in-flight context-change invalidation.

**v2 specifics:**

- **Admin role required for ALL 4 construction classes** (v2; was admin-only-for-schema_migration in v1). Slot 1 + Slot 2 + Slot 3 + Slot 4 + Slot 6 + Slot 10 votes.
- **Freshness 15 minutes** (v2; was 1 hour). Slot 1 #4 + Slot 10 #32 verbatim.
- **Rationale quality validation (NEW v2):** approval rationale ≥60 chars AND must NOT match stop-words set (`approved`, `ok`, `lgtm`, `looks fine`, etc.). Slot 7 #23 verbatim.
- **In-flight context-change invalidation (NEW v2):** any new `governance_record_entry` for the target product between approval-write and fix-generator-start invalidates the approval. Slot 10 #32 verbatim.

**Why NON-OVERRIDABLE:** automated construction without admin-in-the-loop = blast-radius scaling failure. v2 STRENGTHENS substantially; no reject path. CEO Locked Rule 13.

**Conformance tests (v2):** S6-CT-1 (no approval refused), S6-CT-2 (stale >15min refused), S6-CT-3 (operator role refused — all 4 classes), S6-CT-4 (envelope persists with v2 fields), **S6-CT-5 NEW v2** (admin-all coverage — wire_up with operator approval refused), **S6-CT-6 NEW v2** (15-min freshness — T=16min refused), **S6-CT-7 NEW v2** (rationale-quality — `"lgtm"` refused, `"fine looks good"` refused, ≥60-char substantive accepted), **S6-CT-8 NEW v2** (in-flight invalidation — new `delta_log` entry between approval and fix-generator-start invalidates approval).

#### Question J2v2-S5-Q (Run 3, Q1) — Rollback substrate (NON-OVERRIDABLE — strengthen-only)

v2 strengthens S5 with: real-rollback execution in CI (replacing simulation) + 30-day retention + automatic rollback on Phase B post-merge failure. NON-OVERRIDABLE per CEO Locked Rule 13. Right mechanism?

- (a) **Ratify S5 v2 as drafted** (real-rollback execution + 30-day retention + auto-rollback on post-merge Phase B failure within 1h).
- (b) Strengthen retention — 90-day retention (instead of 30-day); covers longer-tail defect-discovery windows.
- (c) Strengthen auto-rollback trigger window — auto-rollback on Phase B failure within **24 hours** of PR merge (instead of 1h); covers slow-developing post-merge regressions.
- (d) Strengthen via belt-and-suspenders — both (b) AND (c) — 90-day retention + 24h auto-rollback window.
- (e) INSUFFICIENT_INFORMATION.

#### Question J2v2-S6-Q (Run 3, Q2) — Pre-construction approval (NON-OVERRIDABLE — strengthen-only)

v2 strengthens S6 with: admin-required for ALL 4 classes + 15-min freshness + rationale-quality validation + in-flight context-change invalidation. NON-OVERRIDABLE per CEO Locked Rule 13. Right approval model?

- (a) **Ratify S6 v2 as drafted** (admin-all + 15-min + rationale-quality + in-flight invalidation).
- (b) Strengthen further — require **two-admin sign-off** for `schema_migration` + `redesign_implementation` classes (single-admin sign-off OK for `wire_up` + `endpoint_generation`).
- (c) Strengthen rationale — require LLM-judged rationale quality (rationale must coherently describe the construction; LLM-judge score ≥0.8 with admin override per CA-15-D v2 advisory-only pattern).
- (d) Strengthen via belt-and-suspenders — both (b) AND (c) — two-admin for heavy classes + LLM-judged rationale.
- (e) INSUFFICIENT_INFORMATION.

**[BUNDLE END — Run 3]**

---

### §8.4 — RUN 4 BUNDLE — S7 (branch-of-record) + S8 (post-construction Phase B) 🔒

**[BUNDLE START — Run 4: S7 + S8 — target ≤30K chars]**

**Context for Panel (Run 4):** Run 4 covers S7 (per-product branch with per-session sub-branches for CA-16-B redesigns) + S8 (pre-PR Phase B + live-preview post-merge Phase B + dual-load + backend probes for endpoint_generation). S8 is NON-OVERRIDABLE per CEO Locked Rule 13 dispatch designation — strengthen-only options offered.

**§3.7 S7 — Branch-of-record interaction (PANEL-RATIFIABLE; v2 ADDS SUB-BRANCHES)**

**Invariant:** Every construction commit MUST land on per-product `self_renewal_branch` per CA-14-D Invariant 1 (ENTRY 015 cleared-8). v2: CA-16-B multi-construction redesign sessions use per-session sub-branches.

**v2 specifics:**

- Single-construction → directly on per-product `self_renewal_branch` (v1 behavior preserved).
- Multi-construction redesign session → sub-branch `<self_renewal_branch>/redesign-session-<sessionId>`. Each construction commits to sub-branch. On operator approval of session, sub-branch **squash-merges** to per-product branch (single commit per session). Sub-branch retained 30 days post-merge (matches S5 v2). 5/7 J2S7-SUBBRANCH + Slot 1 + Slot 4 + Slot 6 + Slot 10.
- Per-product `self_renewal_branch` REMAINS the merge target (preserves CA-14-D-Q1 ENTRY 015 cleared-8 invariant).
- NEVER on `main` directly.

**Conformance tests (v2):** S7-CT-1 (main-target refused), S7-CT-2 (multi-construction sequence), S7-CT-3 (per-product isolation), **S7-CT-4 NEW v2** (sub-branch + squash-merge — 3 proposals committed to sub-branch; one squash-merge commit to per-product branch; sub-branch retained 30 days).

**§3.8 S8 — Post-construction Phase B mandatory (NON-OVERRIDABLE per CEO Path H dispatch designation; v2 EXTENDED) 🔒**

**Invariant:** Phase B runs 3 times against construction artifacts: pre-PR (v1) + live-preview post-PR-merge (NEW v2) + dual-load for endpoint_generation (NEW v2). Backend probes added for endpoint_generation: connection-pool exhaustion + memory-leak + transaction-deadlock.

**v2 specifics:**

- **Pre-PR Phase B** (v1): after code written, before PR opens; PR blocks on failure.
- **Live-preview Phase B (NEW v2)**: after PR merge + Vercel preview URL provisioned, Phase B runs AGAIN against live preview. Failure within 1h of merge triggers S5 v2 auto-rollback. 5/7 J2S8-LIVEPREV + Slot 1 + Slot 2 + Slot 4 + Slot 6 + Slot 8 + Slot 10.
- **Dual-load for endpoint_generation (NEW v2)**: Phase B against light (1 req/s × 60s) + heavy (100 req/s × 60s) load profiles.
- **Backend probes (NEW v2)** for endpoint_generation: connection-pool exhaustion, memory-leak (RSS ≤20% growth at t=60s), transaction-deadlock (pg_locks no `deadlock_detected` in 60s window). Slot 1 #2 verbatim.

**Why NON-OVERRIDABLE per dispatch:** the dispatch designates S8 NON-OVERRIDABLE alongside S2/S4/S5/S6 (strengthen-only). v2 STRENGTHENS the Phase B coverage; no reject path.

**Conformance tests (v2):** S8-CT-1 (pre-PR Phase B fail aborts PR), S8-CT-2 (endpoint_generation backend tests), S8-CT-3 (results recorded), **S8-CT-4 NEW v2** (live-preview Phase B post-merge → S5 auto-rollback cross-trigger), **S8-CT-5 NEW v2** (dual-load light + heavy; race-condition fails Phase B), **S8-CT-6 NEW v2** (connection-pool exhaustion + memory-leak + deadlock probes; each with distinct `failure_class` in `construction_phase_b_failure.v1`).

#### Question J2v2-S7-Q (Run 4, Q1) — Branch-of-record (PANEL-RATIFIABLE)

v2 adds per-session sub-branches within per-product `self_renewal_branch` for CA-16-B multi-construction redesign sessions; squash-merge to per-product branch on operator approval; per-product branch REMAINS the merge target. Right discipline?

- (a) **Ratify S7 v2 as drafted** (sub-branches for multi-construction; squash-merge; per-product branch remains target).
- (b) Strengthen — every construction (not just multi-construction sessions) uses a per-construction sub-branch; squash-merges to per-product branch on PR approval. Provides finer-grain isolation but more branch overhead.
- (c) Reject sub-branches — keep v1 behavior (every construction commits directly to per-product `self_renewal_branch`); sub-branches add complexity without commensurate safety gain.
- (d) Adjust — sub-branches per construction-class instead of per-session (`<self_renewal_branch>/<class>/<runId>`); preserves per-product branch but adds class-level visibility.
- (e) INSUFFICIENT_INFORMATION.

#### Question J2v2-S8-Q (Run 4, Q2) — Post-construction Phase B (NON-OVERRIDABLE — strengthen-only)

v2 extends S8 with: live-preview Phase B post-PR-merge (auto-rollback on failure within 1h) + dual-load testing for endpoint_generation + backend probes (connection-pool / memory-leak / transaction-deadlock). NON-OVERRIDABLE per CEO Locked Rule 13 dispatch designation. Right scope?

- (a) **Ratify S8 v2 as drafted** (3 Phase B runs incl live-preview; dual-load; backend probes).
- (b) Strengthen further — add **load-profile-shadow-traffic** test: replay 30 minutes of real production traffic against the construction's preview URL before merge; surfaces real-world-pattern bugs CI-synthetic-load misses.
- (c) Strengthen further — add **fail-injection** to Phase B for endpoint_generation: deliberately kill DB connection mid-request, network-partition the preview from external services, simulate disk-full; assert graceful degradation + proper error envelopes.
- (d) Strengthen via belt-and-suspenders — both (b) AND (c) — shadow-traffic replay + fail-injection.
- (e) INSUFFICIENT_INFORMATION.

**[BUNDLE END — Run 4]**

---

## §9 — Acceptance criteria for v2 ratification + Spec promotion

- W6 v2 re-Panel ratification ≥7/10 ENGAGED on each of the 8 J2v2-S?-Q questions across the 4 runs.
- Each run's bundle ≤30K chars (proven engagement recipe; W6 flagged 35K ceiling on prior J2).
- Engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6.
- CEO disposition per Locked Rule 13. NON-OVERRIDABLE S2/S4/S5/S6 (+S8 per dispatch designation) cannot be eliminated by Panel; Panel feedback surfaces as recommendation.
- If all 8 ratify (a)-clean per run, spec promotes as a single CA cycle (next free CA number — CA-17 candidate).
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-buildwire-v2-promotion-<date>.md` per §18.3.
- Once promoted, Path H Stage 3 (build/wire) becomes UNBLOCKED.

---

## §10 — Conformance Test Inventory (v2)

Inventory grows 33 → **49** total tests. New v2 tests bolded.

- **S1** (4): S1-CT-1, S1-CT-2, S1-CT-3, **S1-CT-4 (v2)**.
- **S2** (6): S2-CT-1, S2-CT-2, S2-CT-3, S2-CT-4, **S2-CT-5 (v2)**, **S2-CT-6 (v2)**.
- **S3** (5): S3-CT-1, S3-CT-2, S3-CT-3, S3-CT-4, **S3-CT-5 (v2 — DLP)**.
- **S4** (8): S4-CT-1, S4-CT-2, S4-CT-3, S4-CT-4 (extended), S4-CT-5, **S4-CT-6 (v2 — SSRF)**, **S4-CT-7 (v2 — rate-limit)**, **S4-CT-8 (v2 — authz-removal)**.
- **S5** (8): S5-CT-1, S5-CT-2, S5-CT-3, S5-CT-4, S5-CT-5, **S5-CT-6 (v2 — auto-rollback)**, **S5-CT-7 (v2 — 30-day retention)**, **S5-CT-8 (v2 — real-rollback-in-CI)**.
- **S6** (8): S6-CT-1, S6-CT-2, S6-CT-3, S6-CT-4, **S6-CT-5 (v2 — admin-all)**, **S6-CT-6 (v2 — 15-min)**, **S6-CT-7 (v2 — rationale-quality)**, **S6-CT-8 (v2 — in-flight invalidation)**.
- **S7** (4): S7-CT-1, S7-CT-2, S7-CT-3, **S7-CT-4 (v2 — sub-branches + squash-merge)**.
- **S8** (6): S8-CT-1, S8-CT-2, S8-CT-3, **S8-CT-4 (v2 — live-preview post-merge)**, **S8-CT-5 (v2 — dual-load)**, **S8-CT-6 (v2 — backend probes)**.
- **§4 lifecycle** (2): §4-CT-1, §4-CT-2.

**Total: 49 conformance tests** (v1: 33; v2 NEW: 16).

When CA-15-D v2 ratifies, this spec's tests register in canonical conformance-test inventory at `src/lib/conformance/__tests__/build_wire_engine/`.

---

*End of Build/Wire Engine Spec V2 DRAFT. Pending W6 4-run × 2-invariant re-Panel ratification + CEO disposition per Locked Rule 13. Doc-only; canonical files NOT amended in this commit per CA-n cycle discipline. NON-OVERRIDABLE discipline preserved (S2/S4/S5/S6 + S8 per dispatch designation) — no weakening under live Panel fire. Path H ENTRY 014 Stage 3 (build/wire) remains BLOCKED until this spec ratifies.*
