# Stage 3.5 — Construction Rollback Substrate (engineering-ready spec)

**Status:** DRAFT — engineering-ready; CEO-ratification-pending. Doc-only.
**Author:** W3, 2026-05-19.
**Authority:** CA-17 §3.5 S5 (Rollback substrate — NON-OVERRIDABLE 🔒) per the binding `docs/specs/BUILD_WIRE_ENGINE_SPEC_V3_FINAL_DRAFT.md` at commit `1d5e39b` (ENTRY 016 ratification). This spec implements the contract that §3.5 specifies.
**Implementation context:** complements the Stage 3 Phase 1 construction engine landed at commit `cd2608d` (`src/lib/construction/`), the runner activation at `d394739`, and the env-gated proof-phase bypass at `4689f53`.
**Bundle target:** ≤30K chars (engineering-ready prose + tables + envelope schemas).

---

## §1 — Purpose

Provide **atomic recovery for multi-file construction failures** — including post-merge regressions, post-deploy security findings, operator rejections, and manual rollback invocations. This spec **complements** the S5 gate already wired into the construction engine (commit `cd2608d`); it does NOT replace the S5 gate, it implements the substrate that S5 invokes.

Scope of "construction failure" handled by this substrate:

- A construction commit (or sequence of commits) landed on the per-product `self_renewal_branch` per CA-17 §3.7 S7 + ENTRY 015 cleared-8, and one of the §2 trigger conditions fires.
- The substrate restores the per-product branch + ProductSSOT row + Vercel deployment to the snapshot captured at S1 baseline time (per CA-17 §3.1 S1).

Scope **out of band** for this substrate (handled elsewhere):

- Pre-commit failures (S1–S6 abort before any commit lands) — no rollback needed; the construction simply aborts via the existing engine path.
- Self-Renewal Executor failures that are not construction-class (handled by `src/lib/agents/renewal/` per the Self-Renewal Executor charter).
- Disaster recovery beyond the 30-day (or admin-config 90-day) retention window — handled by the standard Supabase backup retention path, not this substrate.

---

## §2 — Trigger conditions (when rollback fires)

The substrate exposes a single rollback-initiation API (`S5Rollback.initiateRollback(args)`) invoked by FOUR trigger surfaces:

| # | Trigger | Source | Severity | Notes |
|---|---|---|---|---|
| **T1** | **S8 Phase B fails post-PR-merge within the 1h window** | Agent #21 ACE Conductor (per ENTRY 015 §15.1 row 21 — Phase B charter) post-deploy probe observed by the engine via `21.issues.detected.v1` topic | `critical` if any `critical` finding; `high` otherwise | Primary CA-17 §3.5 v3-final trigger. Per CA-17 §3.8 S8 v3-final, S8 itself is pre-PR-only; the post-merge Phase B is owned by Agent #21's existing post-deploy charter per ENTRY 015, NOT by S8. |
| **T2** | **Operator explicitly rejects the construction result** | Operator dashboard action — operator reviews construction artifacts (PR diff + Phase A re-score + Phase B output) and clicks "Reject + Roll Back" | `high` (operator's explicit business decision) | Operator MAY provide rationale (≥60 chars, same canonical stop-word rejection as S6 rationale per CA-17 §3.6). |
| **T3** | **S4 security gate detects a post-deploy vulnerability** | The 9-pillar S4 security suite per CA-17 §3.4 re-runs post-deploy under the existing Agent #21 charter and detects a NEW `critical`/`high` finding (`failure_class` per CA-17 §3.4 — SQLi / XSS / auth-bypass / secrets-leakage / dependency-CVE / authz-regression / SSRF / rate-limit / **CSRF**) that did not exist in the S1 baseline | `critical` if `failure_class` in {`secrets-leakage`, `auth-bypass`, `authz-regression`, `sqli`, `csrf`}; `high` otherwise | Post-deploy S4 re-run is part of the Agent #21 ACE Conductor charter; this substrate provides the rollback path for findings the post-deploy run surfaces. |
| **T4** | **Operator invokes manual rollback** | Operator dashboard action (separate from T2 — T2 rejects an in-review construction; T4 rolls back a fully-deployed construction the operator now wants to undo) | `medium` by default; operator may escalate via rationale | Operator MUST provide rationale (≥60 chars, S6-style validation). T4 has no time-window limit (subject to §8 retention). |

**Trigger composition:** if multiple triggers fire on the same construction within the same window, the substrate de-duplicates to a single rollback initiation (CAS-protected per §4). The first trigger wins; subsequent triggers attach to the existing initiation as observation rows, not as fresh initiations.

---

## §3 — Snapshot contract (what gets snapshotted, when, where)

The **construction snapshot** is captured at S1-baseline completion (CA-17 §3.1) BEFORE any construction commits land. Snapshots are immutable once written.

### 3.1 — What is snapshotted

| Surface | Captured value | Source |
|---|---|---|
| **Git state** | Branch HEAD SHA on the per-product `self_renewal_branch` BEFORE any construction commits land | `git rev-parse <self_renewal_branch>` via GitHub App REST API (`GET /repos/{owner}/{repo}/git/refs/heads/{branch}`) using `product_registry.github_repo_url` |
| **ProductSSOT state** | Full `product_ssot` row (all 6 canonical blocks per CA-10-A §7.5) + the `delta_log` entries at S1-baseline timestamp | Supabase `public.product_ssot` row + filtered `delta_log` jsonb array (entries `at ≤ s1_baseline_at`) |
| **Vercel deployment** | Prior live deployment ID + URL pointing at production | Vercel REST API (`GET /v6/deployments?projectId={vercel_project_id}&target=production&limit=1`) using `product_registry.vercel_project_id` |
| **Construction context** | `session_id` (FlowAI run identifier), `product_id`, `construction_class`, `s1_baseline_at`, `operator_role`, `approval_envelope_id` (per CA-17 §3.6 S6 admin approval) | In-memory engine state at S1 completion |

### 3.2 — Where snapshots are stored

A new Supabase table **`public.construction_snapshot`**:

```sql
create table if not exists public.construction_snapshot (
  id                        uuid primary key default gen_random_uuid(),
  product_id                text not null references public.product_registry (product_id) on delete restrict,
  session_id                text not null,                          -- FlowAI run/session identifier
  construction_class        text not null
                              check (construction_class in ('wire_up','endpoint_generation','schema_migration','redesign_implementation')),
  git_branch                text not null,                          -- per-product self_renewal_branch
  git_sha                   text not null,                          -- branch HEAD SHA before construction commits
  product_ssot_snapshot     jsonb not null,                         -- full 6-block ProductSSOT row at S1 baseline
  delta_log_snapshot        jsonb not null,                         -- delta_log entries at S1 baseline timestamp
  vercel_deployment_id      text not null,                          -- prior live deployment ID
  vercel_deployment_url     text not null,                          -- prior live URL
  operator_role             text not null,
  approval_envelope_id      uuid,                                   -- references the S6 approval governance_record_entry
  status                    text not null default 'active'
                              check (status in ('active','consumed','expired','dry_run_failed')),
  retention_days            integer not null default 30,
  created_at                timestamptz not null default now(),
  expires_at                timestamptz not null
                              generated always as (created_at + (retention_days * interval '1 day')) stored,
  consumed_at               timestamptz,                            -- when rollback executed against this snapshot
  consumed_by               text,                                   -- operator user_id who confirmed
  constraint construction_snapshot_retention_bounds check (retention_days between 30 and 90)
);

create unique index if not exists construction_snapshot_session_uniq
  on public.construction_snapshot (session_id, product_id)
  where status = 'active';

create index if not exists construction_snapshot_product_active
  on public.construction_snapshot (product_id, expires_at)
  where status = 'active';

comment on table public.construction_snapshot is
  'CA-17 §3.5 S5 rollback substrate. One row per construction session. ' ||
  'Snapshot captured at S1 baseline completion; consumed by rollback execution; ' ||
  'expires per retention_days (default 30, admin bounds [30, 90] per CA-17 §3.5).';
```

RLS: service-role full read/write; admin read; operator read scoped by `org_id` JOIN against `product_registry`. Mirrors the `product_registry` RLS posture per migration 0014.

---

## §4 — CAS (compare-and-swap) mechanism

Before rollback **executes** (after operator confirm per §7), the substrate verifies the snapshot is still consistent with current branch state. CAS prevents concurrent-construction corruption (e.g. a second construction session landed commits between the snapshot capture and the rollback fire).

**CAS check (executed inside the §6 rollback transaction):**

```
captured_sha    = construction_snapshot.git_sha
current_sha     = GitHub App REST: GET /repos/{owner}/{repo}/git/refs/heads/{branch}
expected_head   = the construction commit SHA(s) that landed AFTER the snapshot
                  (read from the engine's commit-trace audit log)

CAS condition (ALL must hold):
  current_sha == expected_head   ← branch HEAD is the construction commit, NOT a concurrent commit
  captured_sha != current_sha    ← something landed since snapshot (otherwise nothing to roll back)
  construction_snapshot.status == 'active'
  construction_snapshot.expires_at > now()
```

**CAS failure modes:**

| Mode | Cause | Action |
|---|---|---|
| `cas_concurrent_commit` | `current_sha` is neither `captured_sha` nor `expected_head` — a third party committed between the construction commit and the rollback attempt | Abort rollback; emit `construction_rollback_cas_failure.v1` with `cas_mode:'concurrent_commit'`; page operator |
| `cas_snapshot_consumed` | `status = 'consumed'` — another rollback already executed against this snapshot | Abort rollback; emit `construction_rollback_cas_failure.v1` with `cas_mode:'already_consumed'` |
| `cas_snapshot_expired` | `expires_at <= now()` | Abort rollback; emit `construction_rollback_expired_snapshot.v1` (per §11) |
| `cas_nothing_to_rollback` | `captured_sha == current_sha` — construction commit was never landed (e.g. PR closed without merge) | Mark snapshot `status='consumed'` (no-op); emit `construction_rollback_complete.v1` `trigger:'cas_nothing_to_rollback'` |

CAS executes WITHIN the §6 Step 1 transaction so the SHA observation + rollback git revert + snapshot status update are atomic from the substrate's perspective.

---

## §5 — Dry-run (pre-construction structural validation)

Before construction commits land (i.e. after S1 baseline captures the snapshot per §3 and BEFORE the construction generates code per the engine's lifecycle in `cd2608d`), the substrate runs a **dry-run** verifying rollback is structurally possible. **Dry-run failure aborts the construction.**

### 5.1 — Dry-run checks

| # | Check | Pass criterion |
|---|---|---|
| **D1** | Snapshot persisted | `construction_snapshot` row exists with `status='active'`, `git_sha` matches `git rev-parse <branch>` at S1 baseline time |
| **D2** | Git revert structurally clean | Engine simulates `git revert <construction_commit_sha>` in a CI-ephemeral clone (per CA-17 §3.5 "real-rollback dry-run in CI" specifics line 171); revert produces no merge conflicts; the resulting tree state equals the snapshot tree state byte-for-byte |
| **D3** | ProductSSOT restorable | Engine simulates the Supabase transaction (per §6 Step 2) in a CI-ephemeral DB copy seeded from the snapshot; restoration produces the snapshot's ProductSSOT row + delta_log exactly |
| **D4** | Vercel rollback API confirms prior deployment available | Vercel REST API (`GET /v6/deployments/{vercel_deployment_id}`) returns the prior deployment with `state IN ('READY','BUILDING_COMPLETE')` AND `target='production'` AND `aliasAssigned=true` AND the prior deployment is NOT marked `deleted` |

### 5.2 — Dry-run failure handling

If ANY of D1–D4 fails, the substrate:

1. Emits `construction_rollback_dry_run_failed.v1` (per CA-17 §3.5 S5-CT-8) with `failure_mode` ∈ {`snapshot_missing`, `git_revert_conflict`, `ssot_restore_failed`, `vercel_deployment_unavailable`}.
2. Aborts the construction (engine does NOT proceed to code generation). The engine emits the standard `construction_aborted.v1` envelope with `abort_reason:'rollback_dry_run_failed'`.
3. Operator + admin notified via the standard governance channel.

This satisfies **CA-17 S5-CT-1**: snapshot captured before construction begins (D1) AND dry-run aborts construction if rollback not possible (D2–D4).

---

## §6 — Rollback procedure (atomic, 3 steps must all succeed or none)

Once §7 operator-confirm fires and §4 CAS passes, the substrate executes the **atomic 3-step rollback**. The three steps execute SERIALLY (Step 1 → Step 2 → Step 3); if any step fails, the substrate emits `construction_rollback_partial_failure.v1` (per §11) and pages the operator. **Never leave the system in partial state silently.**

### 6.1 — Step 1: Git revert on the per-product branch

```
1.1 GitHub App REST: GET /repos/{owner}/{repo}/git/refs/heads/{branch}    → re-confirm CAS sha
1.2 GitHub App REST: POST /repos/{owner}/{repo}/git/commits               → create revert commit
    (parents: [current_sha], tree: captured_sha's tree, message: 'CA-17 S5 rollback: revert construction <session_id>')
1.3 GitHub App REST: PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}   → fast-forward branch ref
    (force: false — fails if branch was advanced concurrently)
1.4 Audit: governance_record_entry kind:'construction_rollback_step1_complete.v1'
```

If Step 1 fails: emit `construction_rollback_partial_failure.v1` with `failed_step:1`, `failure_class` ∈ {`github_app_unauthorized`, `branch_advanced_concurrently`, `revert_commit_creation_failed`}, page operator. Steps 2 + 3 do NOT execute.

### 6.2 — Step 2: Supabase transaction restoring ProductSSOT + delta_log

```sql
begin;

  -- 2.1 CAS check the construction_snapshot row hasn't been consumed by a parallel rollback
  update public.construction_snapshot
     set status = 'consumed',
         consumed_at = now(),
         consumed_by = $operator_user_id
   where id = $snapshot_id
     and status = 'active'
     and expires_at > now()
  returning id;
  -- 0 rows returned → CAS already lost (parallel rollback won); abort transaction.

  -- 2.2 Restore product_ssot row to snapshot state
  update public.product_ssot
     set product_registry      = ($product_ssot_snapshot ->> 'product_registry')::jsonb,
         governance_record     = ($product_ssot_snapshot ->> 'governance_record')::jsonb,
         architecture_snapshot = ($product_ssot_snapshot ->> 'architecture_snapshot')::jsonb,
         delta_log             = $delta_log_snapshot::jsonb,         -- truncates entries added since snapshot
         governance_record_entry = ($product_ssot_snapshot ->> 'governance_record_entry')::jsonb,
         score_history         = ($product_ssot_snapshot ->> 'score_history')::jsonb,
         updated_at            = now()
   where product_id = $product_id;

  -- 2.3 Append a governance_record_entry recording the rollback (atomic-audit-write per CA-14-D-Q1 ENTRY 015)
  insert into public.governance_record_entry (
    product_id, kind, payload, at
  ) values (
    $product_id, 'construction_rollback_complete.v1',
    jsonb_build_object(
      'session_id',    $session_id,
      'snapshot_id',   $snapshot_id,
      'trigger',       $trigger,                                     -- T1..T4 per §2
      'operator_id',   $operator_user_id,
      'rolled_back_commits', $construction_commit_shas               -- array of SHAs reverted
    ),
    now()
  );

commit;
```

If Step 2 fails: the transaction rolls back automatically (SQL ROLLBACK). The git revert from Step 1 is still in place — this is a partial-failure state (git reverted but DB not restored). Substrate emits `construction_rollback_partial_failure.v1` with `failed_step:2`, `failure_class` ∈ {`cas_already_consumed`, `ssot_update_constraint_violation`, `db_connection_failure`}, page operator. Step 3 does NOT execute. The git revert in Step 1 is intentionally NOT auto-undone — git history is append-only by design; an additional commit can re-land the construction if the operator chooses.

### 6.3 — Step 3: Vercel redeploy of prior deployment ID

```
3.1 Vercel REST API: POST /v13/deployments
    (gitSource: { ref: $captured_sha, repoId: $vercel_project_id },
     target: 'production', forceNew: true)
3.2 Poll: GET /v13/deployments/{new_deployment_id}
    until state = 'READY' OR timeout (10 min default)
3.3 Vercel REST API: POST /v9/projects/{vercel_project_id}/domains/{domain}
    → re-alias production domain to the new deployment
3.4 Audit: governance_record_entry kind:'construction_rollback_step3_complete.v1'
```

If Step 3 fails: emit `construction_rollback_partial_failure.v1` with `failed_step:3`, `failure_class` ∈ {`vercel_unauthorized`, `redeploy_timeout`, `domain_alias_failure`}, page operator. Steps 1 + 2 are already committed; the system is in git+DB-consistent but Vercel-stale state. Operator + admin must manually re-trigger the Vercel redeploy via the Vercel dashboard, OR the substrate's retry job (cron-scheduled, max 3 retries on transient failures) re-attempts Step 3 only.

### 6.4 — All-three-succeed completion

```
governance_record_entry kind:'construction_rollback_complete.v1' (per §11) with
  trigger, snapshot_id, session_id, operator_id, all 3 step-complete timestamps
```

---

## §7 — Operator-confirm gate (auto-detect + auto-prepare + operator-confirm-to-fire)

Per CA-17 §3.5 v3-final, the substrate **auto-detects** trigger conditions (§2) + **auto-prepares** rollback (snapshot loaded, §5 dry-run passed, §4 CAS pre-flight verified) + **fires only on operator confirm**.

### 7.1 — Auto-detect phase

The substrate subscribes to:

- `21.issues.detected.v1` topic (Agent #21 ACE Conductor post-deploy probe output) → T1, T3 triggers
- `construction.operator.reject.v1` topic (operator dashboard action) → T2 trigger
- `construction.operator.manual_rollback.v1` topic (operator dashboard action) → T4 trigger

On any subscribed event matching a §2 trigger, the substrate transitions to **auto-prepare**.

### 7.2 — Auto-prepare phase

```
1. Load construction_snapshot row for the affected session_id
2. Re-run §5 dry-run (D1–D4 must pass against CURRENT branch + DB + Vercel state)
3. CAS pre-flight per §4 (sanity-check; full CAS executes inside the §6 Step 1 transaction)
4. Queue a one-button operator action surfaced at:
   - Admin dashboard `/admin/construction-rollbacks/<rollback_id>`
   - Operator dashboard `/operator/construction-rollbacks/<rollback_id>`
   - Slack/email notification per the standard governance notification channel
5. Emit `construction_auto_rollback_pending_operator_confirm.v1` (per CA-17 §3.5 v3-final +
   §11 of this spec) with full context (trigger, severity, dry-run result, CAS pre-flight result,
   snapshot summary, construction commit SHAs to be reverted)
```

If auto-prepare fails (Step 2 dry-run fails OR Step 3 CAS pre-flight fails), the substrate emits `construction_auto_rollback_prepare_failed.v1` (a sub-case of `construction_rollback_dry_run_failed.v1` with `failure_phase:'auto_prepare'`); operator notified for manual investigation.

### 7.3 — Operator-confirm-to-fire phase

Three operator actions are available per CA-17 §3.5 v3-final:

| Action | Effect | Envelope emitted |
|---|---|---|
| **CONFIRM** | Substrate executes §6 atomic rollback within 30s | `construction_rollback_initiated.v1` immediately; then `construction_rollback_complete.v1` (success) OR `construction_rollback_partial_failure.v1` (any §6 step failed) |
| **DEFER** | Substrate keeps the prepared rollback queued; operator can revisit in the dashboard. Re-runs dry-run (D2–D4) before each subsequent confirm attempt (snapshot freshness check). | `construction_rollback_deferred.v1` (single envelope per defer action) |
| **CANCEL** | Substrate marks the snapshot `status='consumed'` with `consumed_by='cancel:<operator_id>'`; rollback is NOT performed; operator MUST provide cancel rationale (≥60 chars, S6-style validation) | `construction_auto_rollback_cancelled.v1` (per CA-17 §3.5) |

### 7.4 — Critical-failure timeout-auto-fire (EXTENSION beyond CA-17 §3.5 — REQUIRES CEO RATIFICATION)

**⚠️ COMPLIANCE NOTE (load-bearing): this §7.4 sub-section EXTENDS CA-17 §3.5 beyond its v3-final disposition. CA-17 §3.5 v3-final explicitly states "Rollback EXECUTION fires ONLY on explicit operator confirm. No auto-execution." The §7.4 timeout-auto-fire path for critical-severity triggers is NEW behavior NOT in CA-17 §3.5 and contradicts §3.5's strict operator-confirm-to-fire invariant. Because S5 is NON-OVERRIDABLE (strengthen-only; no reject path), this extension requires explicit CEO ratification — either (a) an amendment to CA-17 §3.5 expanding the auto-fire carve-out for `critical` security/safety findings, or (b) a sibling CA cycle that promotes §7.4 as a NEW NON-OVERRIDABLE invariant strengthening S5. Without CEO ratification, engineering MUST implement §7.1–§7.3 only; §7.4 stays as a documented future-extension hook gated by a feature flag `construction_rollback_timeout_auto_fire_enabled` (default `false`).**

Per the W3 dispatch's expressed need (§7 "timeout 1h, then auto-fire if no response on critical failures"), the following BEHAVIOR is specified for the future-ratified state:

- For triggers with severity = `critical` per §2 (T1 if `critical` Phase B finding; T3 if `failure_class` in {`secrets-leakage`,`auth-bypass`,`authz-regression`,`sqli`,`csrf`}), the substrate starts a 1-hour countdown at `construction_auto_rollback_pending_operator_confirm.v1` emission time.
- If operator has not chosen CONFIRM / DEFER / CANCEL within 1 hour, the substrate auto-fires the rollback (proceeds as if CONFIRM landed) AND emits `construction_rollback_timeout_auto_fired.v1` with `severity:'critical'`, `timeout_seconds:3600`, `operator_notified_timestamps:[...]`.
- For non-critical triggers (T2 operator-reject, T4 operator-manual, T1/T3 high/medium), NO timeout-auto-fire — the rollback waits indefinitely for explicit operator action (subject to snapshot expiry per §8).

Engineering should ship §7.1–§7.3 as the production-ready path; §7.4 ships behind the feature flag and stays OFF until CEO ratifies.

---

## §8 — Retention

`construction_snapshot.retention_days` defaults to **30** (per CA-17 §3.5 v3-final primary); admin may set up to **90** per the `construction_snapshot_retention_days` product-registry knob (admin-only toggle; hard bounds [30, 90]; out-of-bounds values REJECTED, not clamped — per CA-17 §3.5 S5-CT-7 + the §3.2 table constraint above).

A nightly cleanup job (`construction_snapshot_cleanup`, cron 03:30 UTC) transitions any `status='active'` snapshot with `expires_at <= now()` to `status='expired'` and emits `construction_snapshot_retention_expired.v1` (per CA-17 §3.5 envelope 26). Expired snapshots remain in the table for audit-trail integrity but are NOT usable for rollback — any rollback attempt against an expired snapshot returns `cas_snapshot_expired` per §4 and emits `construction_rollback_expired_snapshot.v1` (per §11).

A separate admin-only "purge" action (rarely used; audit-logged) hard-deletes expired snapshots from the table when needed for storage management. Hard-deletion respects the §14 governance-audit-log hash-chain integrity (per CA-14-D-Q1 ENTRY 015) — the deletion is itself a `governance_record_entry`.

---

## §9 — Integration points with Stage 3 Phase 1 (commit `cd2608d`)

The substrate exposes a JS/TS module `src/lib/construction/S5Rollback.js` (sibling to the existing `src/lib/construction/gates/S5Rollback.js` if present, OR an extension thereof). Public API:

| API | Called by | When | Returns |
|---|---|---|---|
| `S5Rollback.captureSnapshot({ productId, sessionId, ... })` | `src/lib/construction/ConstructionEngine.js` after S1Baseline gate passes | S1 baseline complete, BEFORE construction generates code | `{ snapshotId, expiresAt }` |
| `S5Rollback.dryRun({ snapshotId })` | `ConstructionEngine.js` after `captureSnapshot` | Pre-construction dry-run gate per §5 | `{ ok: boolean, failureMode?: string }` — if `ok === false`, construction aborts with `construction_rollback_dry_run_failed.v1` |
| `S5Rollback.executeRollback({ snapshotId, trigger, operatorId, rationale? })` | (a) `src/lib/agents/agent21/postDeployHook.js` on T1 / T3 trigger; (b) operator dashboard API on T2 / T4 trigger | After operator-confirm per §7.3 | `{ ok: boolean, partialFailure?: { failedStep, failureClass } }` |
| `S5Rollback.deferRollback({ rollbackId, operatorId })` | Operator dashboard API on DEFER action | Per §7.3 | `{ ok: true, deferredAt }` |
| `S5Rollback.cancelRollback({ rollbackId, operatorId, rationale })` | Operator dashboard API on CANCEL action | Per §7.3 | `{ ok: true, cancelledAt }` |

The existing `ConstructionEngine.js` lifecycle (S1 → S2 → S6 → GENERATE → S4 → S5 → COMMIT per CA-17 §4) gains TWO new substrate calls:

1. After **S1Baseline** completes successfully: `await S5Rollback.captureSnapshot({...})` — REQUIRED. Failure to capture aborts construction.
2. After **captureSnapshot** completes: `await S5Rollback.dryRun({...})` — REQUIRED. Failure aborts construction per CA-17 S5-CT-1.

The existing `S5Rollback` gate (already in `cd2608d`) becomes a thin wrapper that delegates to this substrate's `captureSnapshot` + `dryRun`. No engine refactor beyond inserting the two `await` calls.

Post-deploy hook on Agent #21:

- `src/lib/agents/agent21/postDeployHook.js` (NEW or extension): listens to `21.issues.detected.v1` post-deploy events; on T1 / T3 match, invokes `S5Rollback.initiateRollback({ trigger, snapshotId, severity, ... })` which runs §7 auto-detect → auto-prepare → queue-operator-action.

Operator dashboard surfaces:

- `/operator/construction-rollbacks/<rollback_id>` — CONFIRM / DEFER / CANCEL actions per §7.3.
- `/admin/construction-rollbacks/<rollback_id>` — admin can view all in-flight rollbacks across the org; admin actions mirror operator actions but with elevated audit-log payload.

---

## §10 — Conformance tests (maps to CA-17 S5-CT-6/7/8 + new CTs)

| # | Test | Maps to | Pass criterion |
|---|---|---|---|
| **CT-1** | Snapshot captured before construction begins | CA-17 S5-CT-1 + §5 D1 | `construction_snapshot` row with `status='active'` exists with `git_sha = git rev-parse <branch>` BEFORE first construction commit. Construction abort if `captureSnapshot` fails. |
| **CT-2** | Dry-run aborts construction if rollback not possible | CA-17 S5-CT-8 + §5 D2/D3/D4 | Inject a corrupted snapshot (e.g. invalid Vercel deployment ID); dry-run D4 fails; engine emits `construction_rollback_dry_run_failed.v1` `failure_mode:'vercel_deployment_unavailable'`; construction aborts BEFORE code generation. |
| **CT-3** | CAS check prevents stale-snapshot rollback | §4 | Land a construction commit `C1` with snapshot `S1`. Manually land a third-party commit `C2` on the branch (simulating concurrent work). Initiate rollback against `S1`; CAS observes `current_sha=C2 != expected_head=C1`; emit `construction_rollback_cas_failure.v1` `cas_mode:'concurrent_commit'`; rollback NOT executed. |
| **CT-4** | Atomic 3-step rollback: all succeed or none | §6 | Trigger T1 with a passing rollback path; verify §6.1 + §6.2 + §6.3 + §6.4 all emit and `construction_rollback_complete.v1` fires. Separately, inject Step-2 SQL failure; verify Step 1 git revert is preserved (append-only), Step 2 transaction rolls back, Step 3 does NOT execute, `construction_rollback_partial_failure.v1` `failed_step:2` emits. |
| **CT-5** | Operator-confirm gate: auto-fires on timeout for critical failures (§7.4 — gated behind feature flag pending CEO ratification) | §7.4 | With `construction_rollback_timeout_auto_fire_enabled=true`, simulate T3 critical SQLi finding; auto-detect + auto-prepare + emit `construction_auto_rollback_pending_operator_confirm.v1`; operator does not respond for 1h; substrate auto-fires + emits `construction_rollback_timeout_auto_fired.v1`. With the feature flag `false` (production default until CEO ratifies), substrate waits indefinitely (subject to §8 retention). |
| **CT-6** | 30-day retention enforced; expired snapshots rejected | CA-17 S5-CT-7 + §8 | Insert a `construction_snapshot` with `created_at = now() - 31 days`; nightly cleanup transitions to `status='expired'` + emits `construction_snapshot_retention_expired.v1`. Subsequent rollback attempt against the expired snapshot returns `cas_snapshot_expired` per §4 + emits `construction_rollback_expired_snapshot.v1`. Admin-config to `retention_days=90` (within bounds) persists 90 days; admin-config to `retention_days=200` (out-of-bounds) REJECTED at write-time per the table constraint. |
| **CT-7** | Partial failure surfaces envelope and pages operator | §6 + §11 | Inject Step-3 Vercel API failure; verify `construction_rollback_partial_failure.v1` `failed_step:3` `failure_class:'vercel_unauthorized'` emits + operator notification fires via the standard governance channel. Manual retry-only path verified (substrate does not auto-undo Steps 1+2). |
| **CT-8** | Rollback log entry in governance_record_entry (atomic-audit-write per CA-14-D-Q1 ENTRY 015) | §6.2 + CA-14-D-Q1 | Every rollback (success or partial failure) writes a `governance_record_entry` row atomically with the Step-2 transaction. Verify the row exists for both success (`kind:'construction_rollback_complete.v1'`) and partial-failure (`kind:'construction_rollback_partial_failure.v1'`) paths. CAS-protected per CA-14-D-Q1 ENTRY 015 atomic-audit-write invariant (snapshot + CAS + retry up to 3 times). |

**Conformance count:** 8 tests (CT-1..CT-8). Maps cleanly to CA-17 §3.5 conformance inventory (S5-CT-1, S5-CT-6, S5-CT-7, S5-CT-8 reframed/extended; new CT-3, CT-4, CT-7, CT-8 for the substrate-specific concerns). Engineering registers these in `src/lib/conformance/__tests__/build_wire_engine/s5_rollback_substrate/` per CA-15-D-Q1 §19.1 SSOT-Conformance Gate HYBRID integration (ENTRY 017).

---

## §11 — New failure envelopes (additions to CA-17 §5)

The following envelopes EXTEND the CA-17 §5 failure-envelope inventory (currently 26 per CA-17 v3-final). Adding 4 new envelopes → **CA-17 §5 envelope count grows from 26 → 30 when this spec ratifies.** The CA-17 §29 canonical reference entry should be updated at ratification time (or via a sibling CA cycle) to reflect the 30-envelope inventory.

| # | Envelope | Phase | Trigger | Payload schema |
|---|---|---|---|---|
| 27 | `construction_rollback_initiated.v1` | §7.3 CONFIRM action | Operator confirms rollback; substrate begins §6 execution | `{ rollback_id, snapshot_id, session_id, product_id, trigger, severity, operator_id, initiated_at }` |
| 28 | `construction_rollback_complete.v1` | §6.4 all-three-succeed | All three §6 steps succeed | `{ rollback_id, snapshot_id, session_id, trigger, operator_id, step1_commit_sha, step2_db_at, step3_vercel_deployment_id, completed_at }` |
| 29 | `construction_rollback_partial_failure.v1` | §6 any-step-fails | One of §6.1 / §6.2 / §6.3 fails | `{ rollback_id, snapshot_id, session_id, failed_step (1\|2\|3), failure_class, completed_steps (array), system_state (jsonb summary of what's consistent + what's not), at }` |
| 30 | `construction_rollback_expired_snapshot.v1` | §4 CAS / §8 retention | Rollback attempted against `expires_at <= now()` snapshot | `{ snapshot_id, session_id, product_id, attempted_at, snapshot_expired_at }` |

Companion envelopes already specified in CA-17 §3.5 v3-final + retained (no change to CA-17 inventory beyond the +4 above):

- `construction_auto_rollback_pending_operator_confirm.v1` (CA-17 envelope 24)
- `construction_auto_rollback_cancelled.v1` (CA-17 envelope 25, per §7.3 CANCEL action)
- `construction_snapshot_retention_expired.v1` (CA-17 envelope 26, per §8 nightly cleanup)
- `construction_rollback_dry_run_failed.v1` (per CA-17 §3.5 S5-CT-8, per §5.2 of this spec)

Additionally, the **§4 `cas_*` mode flags** carry inside `construction_rollback_cas_failure.v1` — this is a sub-case envelope NOT counted separately (it routes via `construction_rollback_partial_failure.v1` with `failed_step:0` `failure_class:cas_*`).

Additionally, the **§7.4 timeout-auto-fire path** (when CEO ratifies) emits `construction_rollback_timeout_auto_fired.v1` — listed as a future-ratified envelope NOT in the count above pending CEO ratification.

---

## §12 — CEO ratification checklist (one line per §)

CEO ratifies this Stage 3.5 spec by signing off on each item below. Doc-only at this draft; engineering implementation follows ratification.

- **§1 Purpose:** confirm the substrate's scope (atomic recovery for multi-file construction failures; complements `cd2608d` S5 gate; out-of-scope items listed).
- **§2 Trigger conditions:** confirm the 4 triggers (T1 S8/Agent #21 post-merge Phase B fail; T2 operator reject; T3 S4 security post-deploy; T4 operator manual) + severity assignments + de-duplication rule.
- **§3 Snapshot contract:** confirm the `construction_snapshot` table schema + S1-baseline-time capture + 4-surface snapshot scope (git / ProductSSOT / delta_log / Vercel) + RLS posture.
- **§4 CAS mechanism:** confirm the 4-condition CAS check (current_sha, captured_sha, status, expires_at) + 4 CAS failure modes + transactional execution within §6 Step 1.
- **§5 Dry-run:** confirm D1–D4 checks + dry-run failure aborts construction (CA-17 S5-CT-1) + 4 `failure_mode` enum values.
- **§6 Rollback procedure:** confirm atomic 3-step (git revert / Supabase transaction / Vercel redeploy) + partial-failure semantics (never silently leave partial state; git revert is append-only and intentionally preserved on Step 2/3 failure).
- **§7 Operator-confirm gate:** confirm auto-detect / auto-prepare / operator-confirm-to-fire (§7.1–§7.3) per CA-17 §3.5 v3-final. **§7.4 timeout-auto-fire on critical EXTENDS CA-17 §3.5 — CEO must EITHER ratify the extension (amend CA-17 §3.5 or sibling CA cycle) OR direct engineering to ship the feature flag OFF and §7.4 as documented future-extension only.**
- **§8 Retention:** confirm 30-day primary + admin-config 90-day (bounds [30, 90]; out-of-bounds REJECTED not clamped per CA-17 §3.5 S5-CT-7) + nightly cleanup job + audit-trail-preserving hard-delete path.
- **§9 Integration points:** confirm the 5 public API surfaces (`captureSnapshot`, `dryRun`, `executeRollback`, `deferRollback`, `cancelRollback`) + integration with `ConstructionEngine.js` lifecycle (two `await` calls post-S1) + Agent #21 post-deploy hook.
- **§10 Conformance tests:** confirm 8 CTs map cleanly to CA-17 S5-CT-1/6/7/8 + new substrate-specific CTs; engineering registers under `src/lib/conformance/__tests__/build_wire_engine/s5_rollback_substrate/`.
- **§11 New failure envelopes:** confirm +4 envelopes (27 `construction_rollback_initiated.v1`, 28 `construction_rollback_complete.v1`, 29 `construction_rollback_partial_failure.v1`, 30 `construction_rollback_expired_snapshot.v1`) extending CA-17 §5 inventory 26→30; CA-17 §29 canonical reference entry updates at ratification time.
- **§12 Ratification:** confirm doc-only at this draft; engineering implementation follows; if §7.4 timeout-auto-fire is rejected, the spec's §7.4 stays as documented future-extension behind feature flag `construction_rollback_timeout_auto_fire_enabled=false`.

---

## §13 — Cross-CA dependencies + lineage

- **CA-17 §3.5 S5 (binding)** — the spec this substrate implements. NON-OVERRIDABLE 🔒; strengthen-only. §7.4 extension flagged for CEO ratification.
- **CA-17 §3.1 S1** — snapshot is captured at S1 baseline completion; S1's 6-field mandatory baseline (+ optional 4-field extended) provides the ProductSSOT row snapshotted in §3.
- **CA-17 §3.8 S8** — Phase B post-merge is owned by the existing Agent #21 charter per ENTRY 015 §15.1 row 21 (NOT by S8 v3-final which is pre-PR-only); §2 T1 trigger sources from Agent #21.
- **CA-14-D-Q1 ENTRY 015 cleared-8** — atomic-audit-write invariant: §6 Step 2's `governance_record_entry` write is CAS-protected per the canonical invariant.
- **CA-15-D-Q1 §19.1 SSOT-Conformance Gate HYBRID (ENTRY 017)** — §10 CTs register in `src/lib/conformance/**`; conformance findings of `critical`/`high` severity BLOCK §11 Step 6.
- **CA-15-D-Q2 §19.2 Scoped CEO re-sign BROADER (ENTRY 017)** — this substrate's implementation lands code under `src/lib/construction/**` (NOT under `src/lib/governance/**` or `src/lib/conformance/**`); the substrate itself does NOT trigger `ceo_resign_required` per §19.2, but the §11 envelope additions to CA-17 §29 WOULD trigger if implemented as canonical-doc edits to `docs/CANONICAL_REFERENCE.md` §29.
- **CA-18 §6 ENTRY 019 global mode-name lock** — operator dashboard surfaces in §7 use AUTOMATIC / GUIDED / MANUAL terminology where applicable (e.g., operator dashboard's rollback-mode label if applicable).
- **CA-14-A-Q3 ENTRY 015 cleared-8 (Agent #21 Phase B charter extension)** — the §2 T1 trigger relies on Agent #21's post-deploy Phase B charter being in canonical force.

---

*End of STAGE35_ROLLBACK_SUBSTRATE_SPEC. Engineering-ready post-CEO-ratification. §7.4 timeout-auto-fire flagged as load-bearing CEO-disposition item — extends CA-17 §3.5 NON-OVERRIDABLE invariant and requires explicit ratification before engineering ships it OFF the feature flag.*
