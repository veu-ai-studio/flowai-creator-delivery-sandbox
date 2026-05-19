# Build/Wire Engine Spec — DRAFT (S1–S8 Safety Invariants + J2 re-Panel)

**Status:** DRAFT — pending focused J2-only re-Panel + CEO ratification. Per Path H (ENTRY 014, commit `ce8bd9b`), the build/wire engine (Stage 3) is BLOCKED until this spec ratifies. Doc-only.
**Author:** W3, 2026-05-19 (overnight session, post-ENTRY 014 Path H decision).
**Anchor canonical:** Path H ENTRY 014 (CEO Locked Rule 13 decision) + W6 `roadmap-buildwire-consultation-2026-05-18.md` (J2 verdict `QUORUM_PLURALITY_J2-REVISE` 7/10) + CA-14 draft `fae9ff3` (parked, safety invariants reference) + CA-14-D Invariant 1 per-product branch-of-record + CA-15-A Multi-Dim audit + CA-15-B `purpose_record` + CA-16-B Redesign/Build Environment + ENTRY 010 Phase A live build + D39–D41 Phase B implementation arc.

---

## §1 — Purpose + Scope

### §1.1 Purpose

The build/wire engine converts a detected shell/mock surface into real wired software:

- Generates real backend endpoints + data layer when the surface implies them but they are missing or mocked.
- Wires dead controls (buttons, forms, links) to real handlers/endpoints when the surface declares them but no behavior exists.
- Generates schema migrations + initial seed data when the surface implies persistent state but no schema exists.
- Implements operator-steered redesigns initiated via CA-16-B Redesign Environment (when CA-16-B ratified).
- Operates ALONGSIDE the existing Self-Renewal Executor (surgical-fix path) — does NOT replace it. Self-Renewal Executor's 25%-max surgical-diff cap CONTINUES to apply for surgical fixes; the build/wire engine has its own bounded-scope discipline per S2.

### §1.2 Scope

**IN SCOPE (when J2 re-Panel ratifies):**
- Construction-class changes that the §6 + §10.1.1 (CA-15-A) detector set flags as missing-implementation rather than defect-in-implementation.
- Operator-initiated construction via CA-16-B Redesign Environment session.
- Construction commits land on per-product `self_renewal_branch` per CA-14-D Invariant 1.

**OUT OF SCOPE (Path H boundary):**
- Surgical fixes — handled by Self-Renewal Executor's existing 25%-max surgical-diff path per CA-14-B (when ratified) / D27–D38 arc (shipped).
- Production deploys outside operator-approved branches — never auto-merge.
- Changes to operator-owned infrastructure outside the per-product branch (e.g. DNS, secrets, CI/CD config) — separate dispatch.
- Anything outside the per-product `self_renewal_branch` namespace.

### §1.3 Build/wire engine ↔ Self-Renewal Executor distinction

| Aspect | Self-Renewal Executor (existing) | Build/Wire Engine (this spec) |
|---|---|---|
| Trigger | §7.6 finding above severity threshold | Surface implies missing implementation OR operator initiates via CA-16-B |
| Diff cap | 25% max surgical-diff per file | Bounded per S2 (file-count + line-count + dependency-graph caps) |
| Phase B | Optional post-fix verification | MANDATORY pre-construction baseline (S1) AND post-construction verification (S8) |
| Operator approval | Implicit via PR review | MANDATORY pre-construction approval (S6 NON-OVERRIDABLE) |
| Schema migrations | Forbidden | Permitted under S3 (idempotency + drift + lock-contention tests) |
| Security suite | Inherited from existing test suite | Construction-specific suite mandatory (S4 NON-OVERRIDABLE) |
| Rollback | Standard git revert | Atomic snapshot + CAS + rollback dry-run (S5 NON-OVERRIDABLE) |

---

## §2 — Construction Classes (canonical taxonomy)

Construction work decomposes into FOUR canonical classes. Each construction operation MUST declare its class BEFORE construction begins:

| Class | Description | S1–S8 applicability | Typical scope |
|---|---|---|---|
| **wire_up** | Connect existing dead controls to existing or simply-generated handlers (no schema change; no new external dependencies). | All S1–S8 apply at minimum bound. | 1–5 files, ≤200 lines, 0 new deps. |
| **endpoint_generation** | Generate new backend endpoints (REST / GraphQL / RPC) when the surface implies API consumption but none exists. | All S1–S8 apply at standard bound. | 3–10 files, ≤500 lines, 0–2 new deps. |
| **schema_migration** | Create new tables / columns / indexes / RLS policies when persistent state is implied but absent. | All S1–S8 apply at strictest bound; S3 MANDATORY. | 1–3 migration files, ≤200 lines per migration, 0 new deps (schema changes lift dependency cap to migration-runtime deps only). |
| **redesign_implementation** | Implement an operator-steered redesign session per CA-16-B (when ratified). | All S1–S8 apply at operator-declared scope cap. | Operator declares scope at CA-16-B `RedesignSession.proposal_drafted` time; build/wire engine enforces. |

**Construction-class declaration is canonical:** every construction operation
records its class in `governance_record_entry` with `kind:
'construction_class.v1'` for audit. Class CANNOT be re-declared mid-
construction; aborting + restarting with a new class is the only way to
change class.

---

## §3 — Eight Safety Invariants (S1–S8)

This is the canonical specification of the eight safety invariants synthesized from W6 `roadmap-buildwire-consultation-2026-05-18.md` Panel verdict `QUORUM_PLURALITY_J2-REVISE` 7/10. Four (S2 / S4 / S5 / S6) are declared **NON-OVERRIDABLE** by CEO per Locked Rule 13 (ENTRY 014). The remaining four (S1, S3, S7, S8) are Panel-ratifiable per Locked Rule 17 — Panel may STRENGTHEN but cannot eliminate.

Every invariant is **conformance-testable** — each has explicit acceptance criteria.

### §3.1 S1 — Pre-construction Phase A baseline (PANEL-RATIFIABLE)

**Invariant:** Before any construction-class operation begins, the engine MUST capture a Phase A baseline (per ENTRY 006 §6 + §7.6) of the target product's current state. The baseline includes: §7.6 score, finding inventory, per-page DOM hashes, per-endpoint response hashes, schema fingerprint, dependency-graph fingerprint. Baseline persists in `governance_record_entry` with `kind: 'construction_pre_baseline.v1'`.

**Why:** Without a pre-state anchor, post-construction regression detection becomes impossible. Construction's larger blast radius needs a clean reference point to compare against.

**Conformance test S1-CT-1:** Stub a wire_up construction without baseline; assert engine refuses to start with error `construction_pre_baseline_missing.v1`.

**Conformance test S1-CT-2:** Successful baseline persists in `governance_record_entry` with ALL six fields (score / findings / DOM / endpoint / schema / dependency). Schema validation rejects partial baselines.

**Conformance test S1-CT-3:** Baseline immutability — once `construction_pre_baseline.v1` is written, the row CANNOT be updated; only appended-to via `construction_post_verification.v1` linkage.

### §3.2 S2 — Bounded scope (NON-OVERRIDABLE per CEO Path H)

**Invariant:** Every construction operation MUST declare hard caps BEFORE construction begins:

- **`file_count_cap`** — maximum files touched. Per-class default: wire_up=5, endpoint_generation=10, schema_migration=3, redesign_implementation=operator-declared. Maximum operator override: 25 (hard system cap).
- **`line_count_cap`** — maximum lines added + modified. Per-class default: wire_up=200, endpoint_generation=500, schema_migration=200, redesign_implementation=operator-declared. Maximum operator override: 2000 (hard system cap).
- **`new_dependency_cap`** — maximum new npm dependencies. Per-class default: wire_up=0, endpoint_generation=2, schema_migration=0, redesign_implementation=operator-declared. Maximum operator override: 5 (hard system cap).
- **`dependency_graph_radius`** — maximum hops in the import graph from the construction's entry-point files. Per-class default: 3. Hard system cap: 5.

Caps are enforced AT THE FIX-GENERATOR BOUNDARY — exceeding any cap aborts construction with `construction_scope_violation.v1` BEFORE any code is written to disk.

**Why NON-OVERRIDABLE:** Unbounded construction is structurally equivalent to losing the 25%-max safety net. Five Panel slots cited "construction could rewrite 100% of codebase while still passing parse-gate" as the specific failure mode S2 addresses. CEO Locked Rule 13: this invariant CANNOT be relaxed via operator opt-out, admin override, or future CA-n amendment without explicit CEO re-decision.

**Conformance test S2-CT-1:** Stub an endpoint_generation construction with 11 files; assert engine aborts BEFORE writing any file; emit `construction_scope_violation.v1` with `cap_violated: 'file_count_cap'`.

**Conformance test S2-CT-2:** Stub a wire_up construction with line_count=201; assert abort BEFORE write with `cap_violated: 'line_count_cap'`.

**Conformance test S2-CT-3:** Operator-override-beyond-system-cap rejected — attempt `file_count_cap: 30` (above hard cap 25); assert override clamped to 25 with `system_cap_clamp.v1` envelope; admin notified.

**Conformance test S2-CT-4:** All four caps surface in pre-construction approval envelope (S6) so operator sees the bounded scope at approval time.

### §3.3 S3 — Schema migration testing (PANEL-RATIFIABLE)

**Invariant:** Every `schema_migration` class construction MUST pass a schema-test suite BEFORE PR opens:

- **Idempotency** — running the migration twice produces the same final schema; second invocation is a no-op. Test: invoke migration; capture schema; invoke again; assert no diff.
- **Drift detection** — the live database schema matches the post-migration schema after the migration runs. Test: run migration; query `pg_catalog`; assert table/column/index/RLS-policy parity with the migration's declared post-state.
- **Lock contention** — migration runs in <5s under p99 expected load (transaction-level metric, not application-level). Test: replay 100 concurrent reads/writes against the target tables during migration; assert migration completes within 5s wall-clock OR aborts cleanly with rollback.
- **Reversibility** — the migration includes an explicit `DOWN` path that restores the pre-migration schema. Test: run migration; run DOWN; assert schema identical to pre-migration baseline.

Non-`schema_migration` classes (wire_up, endpoint_generation, redesign_implementation) skip S3.

**Conformance test S3-CT-1:** Stub a schema_migration without an explicit DOWN path; assert engine aborts before PR with `schema_migration_no_reversibility.v1`.

**Conformance test S3-CT-2:** Stub a non-idempotent migration; assert second-invocation diff detection rejects.

**Conformance test S3-CT-3:** Stub a lock-contending migration (e.g. ALTER TABLE without CONCURRENTLY); assert lock-contention test surfaces with measured wait-time + abort recommendation.

**Conformance test S3-CT-4:** S3 results recorded in `governance_record_entry` with `kind: 'schema_migration_test.v1'` for every schema_migration construction.

### §3.4 S4 — Construction security suite (NON-OVERRIDABLE per CEO Path H)

**Invariant:** Every construction operation MUST pass a security-test suite BEFORE PR opens. The suite includes:

- **SQL injection probes** — for every generated endpoint that touches a database, run parameterized SQLi payloads against query parameters + body fields + headers. Failure: any payload echoed in response OR observable in query log.
- **XSS probes** — for every generated endpoint that returns operator-product content, run XSS payloads through input vectors; assert proper escaping in response.
- **Auth-bypass probes** — for every generated endpoint, attempt access without credentials AND with mismatched credentials; assert 401 / 403 as appropriate.
- **Secrets-leakage scan** — static-analyze the construction diff for hardcoded credentials, API keys, tokens, hostnames. Failure: any match against the canonical secrets-pattern set (per AUTH_TRAVERSAL_SECURITY_SPEC v3 + similar pattern lists).
- **Dependency-CVE scan** — if construction adds new dependencies (S2 `new_dependency_cap > 0`), every new dep MUST clear `npm audit` (or equivalent) with severity < high.
- **Authorization regression** — for every existing endpoint touched, verify the authorization contract pre-construction matches post-construction; new endpoints declare their authorization profile in the PR envelope.

**Why NON-OVERRIDABLE:** Slot 7 + Slot 8 + Slot 9 cited construction-introduced vulnerabilities ("SQLi probes absent from §6 detector set", "construction could pass parse-gate but introduce auth-bypass") as the specific failure mode S4 addresses. CEO Locked Rule 13: this invariant CANNOT be relaxed.

**Conformance test S4-CT-1:** Stub a construction generating an SQLi-vulnerable endpoint; assert security suite catches + aborts BEFORE PR; emit `construction_security_failure.v1` with `failure_class: 'sql_injection'`.

**Conformance test S4-CT-2:** Stub a construction with hardcoded API key in a string literal; assert secrets-leakage scan catches + aborts.

**Conformance test S4-CT-3:** Stub a construction adding a dependency with known CVE high; assert dependency-CVE scan catches + aborts.

**Conformance test S4-CT-4:** Stub a construction touching `/api/admin/*` endpoint without authorization gate; assert auth-bypass probe catches + aborts.

**Conformance test S4-CT-5:** S4 results recorded in `governance_record_entry` with `kind: 'construction_security_suite.v1'` for every construction; envelope includes per-test pass/fail + evidence path.

### §3.5 S5 — Rollback substrate (NON-OVERRIDABLE per CEO Path H)

**Invariant:** Construction commits MUST be atomically reversible via snapshot + CAS + rollback path. Every Stage 3 commit MUST have a successful rollback dry-run recorded before merge.

Concrete mechanism (inherits Cluster A v3 advisory-lock + statement_timeout pattern from CA-A v3 template, applied to construction artifacts):

- **Pre-commit snapshot** — engine captures pre-construction state of EVERY file touched + EVERY schema migration to be applied + EVERY dependency change. Snapshot persists in dedicated `construction_snapshot` table with `runId + productId + construction_class + timestamp` index.
- **CAS-protected commit** — construction commit lands via compare-and-swap on the per-product `self_renewal_branch` HEAD; if branch HEAD has advanced since snapshot, commit aborts + restarts from new snapshot.
- **Rollback dry-run** — BEFORE PR opens, engine simulates a rollback: run schema DOWN migration (if applicable) → revert file edits → uninstall new dependencies → re-run pre-construction Phase A baseline → assert score + finding inventory matches pre-baseline within tolerance. Failure: rollback dry-run did NOT restore pre-state → abort PR.
- **Rollback path** — after PR opens, operator may invoke rollback via dashboard control; rollback path executes the same dry-run sequence but on the live branch.

**Why NON-OVERRIDABLE:** Slot 1 + Slot 4 + Slot 7 cited "construction corrupts data + no recovery path" as the specific failure mode S5 addresses. Construction blast radius is qualitatively larger than surgical fix; rollback is the recovery mechanism. CEO Locked Rule 13: this invariant CANNOT be relaxed.

**Conformance test S5-CT-1:** Stub a construction; assert pre-commit snapshot persists with all required fields BEFORE any file write.

**Conformance test S5-CT-2:** Stub a construction whose rollback dry-run fails to restore Phase A baseline; assert PR does NOT open; emit `construction_rollback_dry_run_failed.v1`.

**Conformance test S5-CT-3:** CAS contention — stub a concurrent branch advance between snapshot + commit; assert CAS-protected commit aborts + restarts with new snapshot.

**Conformance test S5-CT-4:** Operator-invoked rollback after PR open executes successfully + restores Phase A baseline.

**Conformance test S5-CT-5:** S5 dry-run + actual rollback results recorded in `governance_record_entry` with `kind: 'construction_rollback.v1'`.

### §3.6 S6 — Pre-construction operator approval (NON-OVERRIDABLE per CEO Path H)

**Invariant:** Every construction-class operation MUST have explicit operator approval BEFORE the fix-generator runs. Approval is per-construction (not per-product blanket).

**Approval envelope (canonical):**

```json
{
  "kind": "construction_pre_approval.v1",
  "runId": string,
  "productId": string,
  "construction_class": "wire_up" | "endpoint_generation" | "schema_migration" | "redesign_implementation",
  "scope_caps_declared": {
    "file_count_cap": integer,
    "line_count_cap": integer,
    "new_dependency_cap": integer,
    "dependency_graph_radius": integer
  },
  "construction_intent_summary": string,         // 1-3 sentence LLM summary of what construction will do
  "purpose_record_link": string,                  // citation back to ProductSSOT purpose_record per CA-15-B
  "phase_a_baseline_ref": string,                 // pointer to S1 baseline entry
  "estimated_findings_resolved": integer,         // count from S1 baseline that construction will close
  "estimated_score_delta_7_6": number,            // estimated §7.6 delta
  "approval_signature": {
    "operator_role": "admin" | "operator",        // per §13 role gate
    "operator_identity": string,
    "approved_at": ISO8601,
    "rationale": string                            // free-form operator statement
  }
}
```

**Approval discipline:**

- Approval is per-construction, NOT per-product blanket. Each construction operation gets its own approval envelope.
- Approval role: per CA-16-B-Q3 disposition (admin-only OR operator with audit), but Path H default is **admin-only for `schema_migration`**; operator approval permitted for other classes pending CA-16-B-Q3 ratification.
- Approval is fresh — an approval older than 1 hour MUST be re-confirmed before construction begins.
- Approval includes the bounded-scope caps from S2 — operator sees exactly what construction will be permitted to touch.

**Why NON-OVERRIDABLE:** 8/10 Panel slots cited "automated construction proceeds without human-in-the-loop review" as the failure mode S6 addresses. Path H's lifecycle proof depends on operator-steered construction, not autonomous-only construction. CEO Locked Rule 13: this invariant CANNOT be relaxed.

**Conformance test S6-CT-1:** Stub a construction without approval; assert engine refuses to start with error `construction_no_approval.v1`.

**Conformance test S6-CT-2:** Stub a construction with stale approval (>1 hour old); assert engine refuses + requests re-confirmation.

**Conformance test S6-CT-3:** Stub a `schema_migration` with operator-role approval (not admin); assert engine refuses with `construction_insufficient_role.v1`.

**Conformance test S6-CT-4:** Approval envelope persists in `governance_record_entry` with `kind: 'construction_pre_approval.v1'` for every construction.

### §3.7 S7 — Branch-of-record interaction (PANEL-RATIFIABLE)

**Invariant:** Every construction commit MUST land on the per-product `self_renewal_branch` per CA-14-D Invariant 1 (when CA-14-D ratified) OR the canonical equivalent (currently `flowai-v0.1` per Path H default).

**Branch interaction discipline:**

- Construction commits NEVER land on `main` directly; ALWAYS via `self_renewal_branch` + PR.
- Construction respects the per-product branch (NOT a global construction branch) — separate per-product blast radius.
- Multi-construction sequences (e.g. operator-steered redesign session per CA-16-B with multiple proposals) chain commits on the same per-product branch in sequence; each commit independently clears S1–S8.
- Branch HEAD CAS protection per S5 — if branch advances between snapshot and commit, restart from new snapshot.

**Conformance test S7-CT-1:** Stub a construction targeting `main`; assert engine refuses with `construction_branch_violation.v1`.

**Conformance test S7-CT-2:** Multi-construction sequence on same per-product branch — assert each construction independently clears S1–S8.

**Conformance test S7-CT-3:** Per-product branch isolation — construction on product A's branch does NOT touch product B's branch even when both products live in the same git repository.

### §3.8 S8 — Post-construction Phase B mandatory (PANEL-RATIFIABLE)

**Invariant:** AFTER construction code is written but BEFORE PR opens, the engine MUST run Phase B Adversarial Surface Testing (per CA-14-A canonical text when ratified; per D39–D41 implementation right now) against the construction artifacts. PR does NOT open if Phase B fails.

**Phase B coverage for construction:**

- **For wire_up:** Phase B exercises the newly-wired controls (click + verify behavior + adversarial-input where applicable).
- **For endpoint_generation:** Phase B includes BOTH the standard interactive probes AND backend-specific tests (request volume, latency p99, error-response shape conformance). Backend-specific tests are NEW for construction; existing Phase B per D39–D41 covers interactive-frontend only.
- **For schema_migration:** Phase B includes S3 schema-test results (idempotency, drift, lock-contention, reversibility). Additional Phase B: run a representative query workload against the new schema; assert no unexpected lock acquisitions.
- **For redesign_implementation:** Phase B covers the operator-steered scope per CA-16-B `RedesignSession.proposal_drafted.scope` — only the in-scope changes are exercised; out-of-scope surfaces are verified unchanged.

**Conformance test S8-CT-1:** Stub a construction whose post-construction Phase B fails; assert PR does NOT open; emit `construction_phase_b_failure.v1`.

**Conformance test S8-CT-2:** S8 backend-specific tests for endpoint_generation — assert latency-p99 + error-shape conformance tests run; envelope records measured values.

**Conformance test S8-CT-3:** S8 results recorded in `governance_record_entry` with `kind: 'construction_phase_b.v1'`.

---

## §4 — Canonical Construction Lifecycle (S1–S8 ordered)

The construction lifecycle has 8 ordered phases corresponding to S1–S8. Every construction operation MUST traverse all 8 in order (no skipping; no reordering):

```
[Operator initiates construction via CA-16-B Redesign Environment OR §7.6
finding triggers construction-class fix path]
              │
              ▼
  ┌──── 1. S1 Pre-construction Phase A baseline captured ────┐
  │       Persist construction_pre_baseline.v1               │
  │       Score + findings + DOM/endpoint/schema/deps        │
  │       hashes recorded                                    │
  └──────────────────────────────────────────────────────────┘
              │
              ▼
  ┌──── 2. S2 Scope caps declared + validated ───────────────┐
  │       Operator-supplied OR per-class defaults             │
  │       Hard system caps enforced                          │
  │       Caps surface in S6 approval envelope               │
  └──────────────────────────────────────────────────────────┘
              │
              ▼
  ┌──── 3. S6 Operator approval ─────────────────────────────┐
  │       construction_pre_approval.v1 envelope              │
  │       Per-construction (not blanket); fresh (≤1h);       │
  │       admin-required for schema_migration                │
  └──────────────────────────────────────────────────────────┘
              │ (approval granted)
              ▼
  ┌──── 4. Construction code generation ─────────────────────┐
  │       Fix-generator runs within S2 caps                   │
  │       Files written to local working tree (NOT yet      │
  │       committed)                                          │
  └──────────────────────────────────────────────────────────┘
              │
              ▼
  ┌──── 5. S3 Schema migration testing (if applicable) ──────┐
  │       Idempotency / drift / lock-contention /            │
  │       reversibility                                       │
  │       construction_schema_migration_test.v1               │
  └──────────────────────────────────────────────────────────┘
              │
              ▼
  ┌──── 6. S4 Construction security suite ───────────────────┐
  │       SQLi / XSS / auth-bypass / secrets / dep-CVE /     │
  │       authz-regression                                    │
  │       construction_security_suite.v1                      │
  └──────────────────────────────────────────────────────────┘
              │
              ▼
  ┌──── 7. S8 Post-construction Phase B ─────────────────────┐
  │       Class-specific Phase B coverage                     │
  │       construction_phase_b.v1                             │
  └──────────────────────────────────────────────────────────┘
              │
              ▼
  ┌──── 8. S5 Rollback dry-run ──────────────────────────────┐
  │       Snapshot captured; simulate rollback; verify       │
  │       Phase A baseline restored                          │
  │       construction_rollback.v1 (dry-run result)          │
  └──────────────────────────────────────────────────────────┘
              │
              ▼
  ┌──── 9. S7 CAS-protected commit on self_renewal_branch ───┐
  │       construction_commit.v1                              │
  │       PR opens                                            │
  └──────────────────────────────────────────────────────────┘
              │
              ▼
[PR review → operator merge OR rollback]
```

**ANY failure at any phase aborts construction with the corresponding envelope; no code reaches PR; rollback dry-run NOT executed for failures before phase 7.**

**Conformance test §4-CT-1:** Every successful construction emits ALL 8 envelopes in order (`construction_pre_baseline.v1` → `construction_scope_caps.v1` → `construction_pre_approval.v1` → `construction_schema_migration_test.v1` (if applicable) → `construction_security_suite.v1` → `construction_phase_b.v1` → `construction_rollback.v1` (dry-run) → `construction_commit.v1`).

**Conformance test §4-CT-2:** Mid-flow abort produces the abort-specific envelope (e.g. `construction_scope_violation.v1` if S2 fails) AND ensures NO downstream envelopes emit (e.g. no `construction_pre_approval.v1` if S2 already failed).

---

## §5 — Failure Envelopes (canonical list — added to Cluster D Deferred set)

Per CA-14-A Cluster D §2.1.0-Def discipline (when CA-14 ratifies; same staged-rollout pattern applies here), the build/wire engine introduces a set of failure envelopes. All ship in Cluster D Deferred set with first runtime commit per agent's first ship.

| # | Envelope | Emitted by | Phase |
|---:|---|---|---|
| 1 | `construction_pre_baseline_missing.v1` | Build/wire engine | S1 abort |
| 2 | `construction_scope_violation.v1` | Build/wire engine | S2 abort |
| 3 | `construction_no_approval.v1` | Build/wire engine | S6 abort (no approval) |
| 4 | `construction_insufficient_role.v1` | Build/wire engine | S6 abort (role mismatch) |
| 5 | `construction_stale_approval.v1` | Build/wire engine | S6 abort (>1h old) |
| 6 | `construction_schema_migration_test.v1` | Build/wire engine | S3 result (pass/fail) |
| 7 | `schema_migration_no_reversibility.v1` | Build/wire engine | S3 abort |
| 8 | `construction_security_suite.v1` | Build/wire engine | S4 result (pass/fail) |
| 9 | `construction_security_failure.v1` | Build/wire engine | S4 abort with failure_class |
| 10 | `construction_phase_b.v1` | Build/wire engine | S8 result |
| 11 | `construction_phase_b_failure.v1` | Build/wire engine | S8 abort |
| 12 | `construction_rollback.v1` | Build/wire engine | S5 dry-run + actual rollback |
| 13 | `construction_rollback_dry_run_failed.v1` | Build/wire engine | S5 abort |
| 14 | `construction_branch_violation.v1` | Build/wire engine | S7 abort |
| 15 | `construction_commit.v1` | Build/wire engine | S7 commit success |
| 16 | `construction_pre_baseline.v1` | Build/wire engine | S1 success |
| 17 | `construction_pre_approval.v1` | Build/wire engine | S6 success |
| 18 | `system_cap_clamp.v1` | Build/wire engine | S2 hard-cap clamp on operator override |
| 19 | `construction_class.v1` | Build/wire engine | Construction class declaration |

Per CA-14-D §2 (D2 5-topic-per-ship cap when CA-14 ratifies), these 19 envelopes ship across 4 successive build/wire engine commits at engineering dispatch time.

---

## §6 — Operator-Facing Surfaces

- **`/redesign/<productId>`** — per CA-16-B Redesign Environment (when ratified). Operator initiates construction; sees scope caps; approves construction; monitors S1–S8 phase progression; reviews PR; invokes rollback if needed.
- **`/architecture`** — per existing §16. Construction commits surface alongside per-product §7.6 score history + §10.1.1 audit findings + CA-15-A multi-dim audit findings (when ratified).
- **`/clearance`** — per existing §11 + CA-15-D §27 SSOT-Conformance Gate (when ratified). Construction artifacts surface at Clearance Step 5 if relevant.

---

## §7 — J2 re-Panel Questions (Locked Rule 17)

**Eight Panel questions total: one for each S1–S8 invariant individually plus one J2-overall re-disposition.** Wait — counting: that would be 9 questions. The dispatch asks for J2 re-Panel questions; the W6 verdict was 7/10 J2-REVISE. Re-Panel needs to test (a) ratification of S1–S8 as drafted AND (b) re-disposition of the J2 overall question with the strengthened safety invariants in scope.

Eight questions structure: one per safety-invariant cluster (S1, S2, S3, S4, S5, S6, S7, S8) + the overall J2 re-disposition baked into the rationale for each individual question. All questions use the 4-options + INSUFFICIENT pattern per prior CA drafts. NON-OVERRIDABLE invariants (S2 / S4 / S5 / S6) carry option (c) — "Reject" — but Panel rejection cannot override CEO Locked Rule 13; in those cases Panel feedback surfaces as recommendation only.

### J2-S1-Q — Pre-construction Phase A baseline (PANEL-RATIFIABLE)

S1 captures Phase A baseline (score + findings + DOM/endpoint/schema/deps hashes) before any construction. Conformance tests S1-CT-1 through S1-CT-3 enforce. Right invariant?

- (a) Ratify S1 as drafted.
- (b) Ratify with simplification — capture score + findings only; drop DOM/endpoint/schema/deps hashes (engineering can rebuild from runId).
- (c) Reject S1 — pre-baseline is unnecessary; post-construction Phase B verification (S8) suffices.
- (d) Strengthen S1 — also require pre-construction multi-dim audit baseline per CA-15-A.
- (e) INSUFFICIENT_INFORMATION.

### J2-S2-Q — Bounded scope (NON-OVERRIDABLE per CEO Path H)

S2 declares hard caps (file_count / line_count / new_dependency / dep_graph_radius) before construction; enforced at fix-generator boundary. CEO Locked Rule 13 decision: NON-OVERRIDABLE. Panel may strengthen but cannot eliminate. Right caps?

- (a) Ratify per-class defaults + hard system caps as drafted (wire_up=5/200/0/3; endpoint_generation=10/500/2/3; schema_migration=3/200/0/3; redesign=operator-declared; system caps 25/2000/5/5).
- (b) Tighten — reduce per-class defaults to half the drafted values (wire_up=3/100/0/2 etc.); operator-override still permitted up to system caps.
- (c) Adjust hard system caps — strengthen system caps to 15/1500/3/4 (currently 25/2000/5/5).
- (d) Loosen per-class defaults — increase wire_up to 10/400/1/3 etc.; rationale: Panel believes defaults too restrictive for real-world construction.
- (e) INSUFFICIENT_INFORMATION.

### J2-S3-Q — Schema migration testing (PANEL-RATIFIABLE)

S3 requires every schema_migration to pass idempotency / drift / lock-contention / reversibility tests before PR. Conformance tests S3-CT-1 through S3-CT-4. Right scope?

- (a) Ratify S3 as drafted (4-pillar test suite).
- (b) Add a 5th pillar — data-loss-prevention test (assert no DROP COLUMN / DROP TABLE without explicit operator confirmation + backup verification).
- (c) Reject S3 — schema migrations belong in a separate W5x dispatch with operator manual review, not in the build/wire engine.
- (d) Replace S3 with operator-driven manual approval — engineer reviews schema migrations manually; no automated suite.
- (e) INSUFFICIENT_INFORMATION.

### J2-S4-Q — Construction security suite (NON-OVERRIDABLE per CEO Path H)

S4 requires SQLi / XSS / auth-bypass / secrets / dep-CVE / authz-regression scans before PR. CEO Locked Rule 13 decision: NON-OVERRIDABLE. Panel may strengthen but cannot eliminate. Right scope?

- (a) Ratify S4 6-pillar suite as drafted.
- (b) Strengthen S4 — add a 7th pillar (SSRF probes for endpoints that fetch external URLs).
- (c) Strengthen S4 — add an 8th pillar (rate-limit/abuse probes for endpoints exposed publicly).
- (d) Both (b) AND (c) — 8-pillar S4 (drafted 6 + SSRF + rate-limit).
- (e) INSUFFICIENT_INFORMATION.

### J2-S5-Q — Rollback substrate (NON-OVERRIDABLE per CEO Path H)

S5 requires pre-commit snapshot + CAS commit + rollback dry-run before PR; operator may invoke actual rollback post-PR. CEO Locked Rule 13 decision: NON-OVERRIDABLE. Panel may strengthen but cannot eliminate. Right mechanism?

- (a) Ratify S5 as drafted (snapshot + CAS + dry-run + post-PR operator-invoked actual rollback).
- (b) Add automatic rollback — if post-deploy Phase B fails within 1 hour of PR merge, engine auto-rolls-back without operator intervention.
- (c) Strengthen rollback retention — snapshot persists for 30 days post-merge (instead of indefinite or undefined retention as drafted; explicit retention specified).
- (d) Strengthen + automatic — both (b) AND (c).
- (e) INSUFFICIENT_INFORMATION.

### J2-S6-Q — Pre-construction operator approval (NON-OVERRIDABLE per CEO Path H)

S6 requires per-construction operator approval before fix-generator runs; admin-only for schema_migration; ≤1h freshness. CEO Locked Rule 13 decision: NON-OVERRIDABLE. Panel may strengthen but cannot eliminate. Right approval model?

- (a) Ratify S6 as drafted (per-construction approval; admin-required for schema_migration; 1h freshness).
- (b) Tighten — admin-required for ALL construction classes (not just schema_migration).
- (c) Tighten freshness — 15-minute approval freshness (currently 1h).
- (d) Both (b) AND (c) — admin-required all classes + 15-minute freshness.
- (e) INSUFFICIENT_INFORMATION.

### J2-S7-Q — Branch-of-record interaction (PANEL-RATIFIABLE)

S7 requires construction commits land on per-product `self_renewal_branch` (per CA-14-D Invariant 1 when ratified; per Path H default `flowai-v0.1` now). Never `main` direct. Right discipline?

- (a) Ratify S7 as drafted (per-product branch; never main; CAS-protected).
- (b) Strengthen — every multi-construction sequence (CA-16-B redesign session with multiple proposals) writes to a per-session sub-branch within the per-product branch, then squash-merges to the per-product branch after operator approval.
- (c) Reject S7 — construction should write to a separate construction-only branch (e.g. `flowai-construction-<runId>`), not the per-product self_renewal_branch.
- (d) Adjust — per-product branch is fine but require per-construction-class sub-paths (e.g. `flowai/construction/<class>/<runId>`).
- (e) INSUFFICIENT_INFORMATION.

### J2-S8-Q — Post-construction Phase B mandatory (PANEL-RATIFIABLE)

S8 requires Phase B run on construction artifacts before PR opens. Per-class coverage drafted. Right approach?

- (a) Ratify S8 as drafted (per-class Phase B coverage; PR blocks on failure).
- (b) Strengthen — also require Phase B AGAIN on the live preview URL post-PR-merge (current S8 is pre-PR only); covers the "construction passes Phase B in CI but breaks on prd deploy" failure mode.
- (c) Strengthen — for endpoint_generation, require Phase B against TWO load profiles (light + heavy) not just one; surfaces concurrency bugs.
- (d) Both (b) AND (c) — live-preview Phase B AND dual-load testing.
- (e) INSUFFICIENT_INFORMATION.

---

## §8 — Acceptance criteria for J2 re-Panel ratification + Spec promotion

- W6 J2-only re-Panel ratification ≥7/10 ENGAGED on each of the 8 J2-S?-Q questions above.
- Engagement filter per `docs/PANEL_INFRASTRUCTURE.md` §6 (the same filter that gated the prior `8e185a6` joint Panel).
- CEO disposition per Locked Rule 13 — CEO retains absolute veto. NON-OVERRIDABLE invariants S2 / S4 / S5 / S6 cannot be eliminated by Panel; Panel feedback on those invariants surfaces as recommendation; CEO has final word.
- If all 8 ratify (a)-clean (or with NON-OVERRIDABLE invariants strengthened per CEO Locked Rule 13), the build/wire engine spec promotes as a single CA cycle (assigned next free CA number at promotion time — CA-17 if no other CAs ratify first).
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-buildwire-promotion-<date>.md` per §18.3.
- Once promoted, Path H Stage 3 (build/wire) becomes UNBLOCKED; engineering dispatch implements per S1–S8 lifecycle.

---

## §9 — Conformance Test Inventory (cross-reference to CA-15-D §27.2)

When CA-15-D ratifies (Multi-Dim audit + SSOT-Conformance Gate), this spec's conformance tests register in the canonical conformance-test inventory at `src/lib/conformance/__tests__/build_wire_engine/`:

- S1-CT-1, S1-CT-2, S1-CT-3 (pre-baseline)
- S2-CT-1, S2-CT-2, S2-CT-3, S2-CT-4 (bounded scope)
- S3-CT-1, S3-CT-2, S3-CT-3, S3-CT-4 (schema migration)
- S4-CT-1, S4-CT-2, S4-CT-3, S4-CT-4, S4-CT-5 (security suite)
- S5-CT-1, S5-CT-2, S5-CT-3, S5-CT-4, S5-CT-5 (rollback substrate)
- S6-CT-1, S6-CT-2, S6-CT-3, S6-CT-4 (operator approval)
- S7-CT-1, S7-CT-2, S7-CT-3 (branch-of-record)
- S8-CT-1, S8-CT-2, S8-CT-3 (Phase B post-construction)
- §4-CT-1, §4-CT-2 (lifecycle ordering)

Total: **33 conformance tests** specified in this spec. All conformance-testable per Path H + CEO instruction.

---

*End of Build/Wire Engine Spec DRAFT. Pending focused J2-only re-Panel ratification + CEO disposition per Locked Rule 13. Doc-only; canonical files NOT amended in this commit per CA-n cycle discipline. Per Path H ENTRY 014 (commit `ce8bd9b`), Stage 3 (build/wire) is BLOCKED until this spec ratifies; S2/S4/S5/S6 are NON-OVERRIDABLE.*
