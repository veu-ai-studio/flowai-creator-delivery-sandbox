# ProductSSOT — Engineering Specification

| Field | Value |
|---|---|
| **Status** | DRAFT for Panel ratification (W5c, 2026-05-16) |
| **Authors** | W5c (drafted), W2 + W5x (implementers — separate dispatch) |
| **Canonical anchors** | `docs/CANONICAL_REFERENCE.md` §7 item #5, §7.5, §11 Step 5, §13.1, §14.2, §14.3, §28 |
| **Backlog gap** | `docs/specs/FOUNDATION_AUDIT_BACKLOG.md` **P0-2** (ProductSSOT entity UNBUILT) + **P0-5** (atomic write UNBUILT) |
| **Panel mandate** | FA-Q4 UNANIMOUS P0 (commit `708e59d`) — build ProductSSOT before any agent wave begins |
| **Scope** | SPEC ONLY — no code in this dispatch. Implementation is a separate W2 + W5x engineering dispatch. |

> **Drafting note (W5c):** The dispatch listed an alternative flat-schema enumeration under its §2 (`productId`, `environment`, `runId`, `timestamp`, `pipelineVersion`, `scores`, `clearanceVerdict`, `findings`, `delta_log`, `governance_record_entries`, `metadata`). The canonical CANONICAL_REFERENCE §7.5 model is **six jsonb blocks** keyed by `(productId, environment)`, NOT a flat per-run row. This spec follows the canonical model verbatim because deviating would re-amend §7.5 by stealth. Where the dispatch's flat fields have a natural home inside the canonical blocks, the mapping is called out in §2 below. The dispatch's `runId` / `timestamp` / `clearanceVerdict` / `findings` etc. live inside `delta_log[]` and `governance_record[]` entries, not as top-level columns.

---

## §1 — WHAT PRODUCTSSOT IS

ProductSSOT is the **durable per-product per-environment living-document record** of every pipeline run and every governance event for a product. One row per `(productId, environment)` pair, where `environment ∈ {'dev', 'prd'}` per CANONICAL_REFERENCE §16.3 Dual Deployment.

A product registered in three states (dev + prd + staging) gets three ProductSSOT rows.

ProductSSOT is the canonical source of truth for:

- **Before/after delta scores** consumed by Self-Renewal (CANONICAL_REFERENCE §6 loop + `docs/specs/SELF_RENEWAL_AGENT_SPEC.md` §2.4).
- **Pre-run pipeline context** consumed by the Symbiotic Feed-Back Loop (CANONICAL_REFERENCE §28).
- **Historical governance trend** consumed by §11 Clearance Step 5's four-prerequisite gate.
- **Clearance history** consumed by `/clearance` wizard's per-step audit views.
- **Architecture-drift detection** (Agent #10) and its evidence trail.
- **GTM Readiness scoring** trajectory across runs per §7.6.
- **Customer-issue triage** trail per Agent #10's `agent10_customer_issue` trigger.

Today (as of this spec): **ZERO ProductSSOT code exists.** Every pipeline run silently completes without writing this. §7 Output Contract item #5's atomicity guarantee is therefore unenforced. §28 Symbiotic Loop has no input to consume. §11 Clearance Step 5's four-prerequisite gate cannot be evaluated. This spec is the prerequisite that unblocks all four.

---

## §2 — SCHEMA (six canonical blocks per §7.5)

### 2.1 Primary table — `product_ssot`

Supabase schema. Mirrors §7.5 verbatim. All blocks are `jsonb` so they remain Panel-amendable without further migrations.

```sql
create table product_ssot (
  -- Composite identity (NOT runId — one row per product+environment lifetime,
  -- accumulating across runs)
  product_id          uuid        not null references products(id) on delete cascade,
  environment         text        not null check (environment in ('dev', 'prd')),
  -- Six canonical blocks per §7.5
  identity_block          jsonb   not null default '{}'::jsonb,
  build_brief             jsonb   not null default '{}'::jsonb,
  architecture_snapshot   jsonb   not null default '{}'::jsonb,
  delta_log               jsonb   not null default '[]'::jsonb,     -- jsonb[] semantics; array of entries
  governance_record       jsonb   not null default '[]'::jsonb,     -- jsonb[]
  annotations             jsonb   not null default '[]'::jsonb,     -- jsonb[]
  overrides               jsonb   not null default '[]'::jsonb,     -- jsonb[]
  -- Tamper evidence + ordering
  version                     bigint        not null default 0,     -- monotonic per (product_id, environment); incremented on every write
  audit_hash_chain_pointer    text          not null,               -- sha256 anchor; links to GovernanceAuditLog hash chain per §14.2
  -- Provenance
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Composite primary key
  primary key (product_id, environment)
);

create index product_ssot_updated_at_idx on product_ssot(updated_at desc);
create index product_ssot_environment_idx on product_ssot(environment);
```

**Per-block shape (per §7.5 table verbatim, restated here so implementers don't have to cross-reference):**

| Block | Owner | Mutation rule | Entry shape (top-level keys) |
|---|---|---|---|
| `identity_block` | system + admin | auto-populated; admin can override the whole block | `{ productName, productUrl, ownerProviderOrgId, ownerOperatorIds[], createdAt, createdBy: {userId, displayName, role}, tags? }` |
| `build_brief` | system + admin | auto-populated from original creation input; admin can annotate | `{ originalInput: {mode: 'clone-improve'\|'describe-build'\|'paste-upload'\|'synthesize-build', sourceUrls?, description?, attachments?[]}, inputArtifactId, normalizedConcept, targetUsers, coreClaims[], detectedFeatures[], initialBuildCommit?, initialDeployUrl? }` |
| `architecture_snapshot` | system (Agent #10 drift detection) | auto on drift; admin can annotate but NOT mutate | `{ capturedAt, framework, dependencies[], envConfig[], pages[], apiEndpoints[], databaseSchema[], readinessScores[] }` — see §7.5 row 146 for inner shapes |
| `delta_log[]` | system (Agent #3 + Agent #10) | append-only; admin can annotate per entry; admin can override per entry | Each entry: `{ entryId, at, triggeredBy: 'agent3_self_renewal'\|'agent10_drift_detection'\|'agent10_customer_issue'\|'clearance_step'\|'manual', triggerSourceId, issue?, remediation?, before_after, humanGateDecision?, annotations[], overrides[] }` |
| `governance_record[]` | system (Clearance + Human Gates + 95/95 scorer) | append-only; admin annotates per entry; never overridden | Each entry: `{ entryId, at, kind: '95_95_score'\|'clearance_step'\|'human_gate'\|'panel_decision'\|'self_audit_dimension_score'\|'customer_signal'\|'gtm_readiness_score', payload, clearanceStepNumber?, clearanceStepLabel?, scoreBreakdown?, acceptedBy?, annotations[] }` |
| `annotations[]` + `overrides[]` | admin + operator (annotations); admin only (overrides) | append-only; never auto-written | Per §13.1 role gates |

**Mapping the dispatch's flat-schema enumeration into canonical blocks:**

| Dispatch field | Canonical home |
|---|---|
| `productId` | top-level column `product_id` |
| `environment` | top-level column `environment` |
| `runId` | `delta_log[].entryId` (per-run) AND/OR `governance_record[].payload.runId` |
| `timestamp` | `delta_log[].at` / `governance_record[].at` (per-entry) AND top-level `updated_at` (last write) |
| `pipelineVersion` | `delta_log[].remediation.pipelineVersion` (per run) AND `architecture_snapshot.metadata.pipelineVersion` (per snapshot) |
| `scores` | `governance_record[]` entries of `kind: '95_95_score'` and `kind: 'self_audit_dimension_score'`; `architecture_snapshot.readinessScores[]` for the per-environment latest snapshot |
| `clearanceVerdict` | `governance_record[]` entries of `kind: 'clearance_step'` |
| `findings` | `delta_log[].issue` (per finding within the run) + `governance_record[]` entry of `kind: 'gtm_readiness_score'` (count summaries) |
| `delta_log` | `delta_log` (same name; same intent) |
| `governance_record_entries` | `governance_record` (canonical name without the `_entries` suffix) |
| `metadata` | distributed: `identity_block.tags`, `build_brief.normalizedConcept`, `architecture_snapshot.dependencies[].license` etc. |

### 2.2 Audit table — `product_ssot_version`

Per §7.5 row 151 and §14.2. Append-only, hash-chained. One row per write to `product_ssot`.

```sql
create table product_ssot_version (
  id                  uuid        primary key default gen_random_uuid(),
  product_id          uuid        not null,
  environment         text        not null check (environment in ('dev', 'prd')),
  version             bigint      not null,                          -- mirrors product_ssot.version at the time of write
  written_at          timestamptz not null default now(),
  written_by          uuid        not null references users(id),     -- service-role or admin/operator user
  write_kind          text        not null,                          -- 'pipeline_run' | 'admin_annotation' | 'admin_override' | 'operator_annotation' | 'drift_snapshot' | 'clearance_step' | 'customer_signal'
  prev_hash           text        not null,                          -- sha256 of previous version's serialized blocks
  this_hash           text        not null,                          -- sha256 of this version's serialized blocks
  serialized_blocks   jsonb       not null,                          -- frozen snapshot of all 6 blocks + version + updated_at
  foreign key (product_id, environment) references product_ssot(product_id, environment) on delete cascade
);

create index product_ssot_version_lookup_idx on product_ssot_version(product_id, environment, version desc);
create index product_ssot_version_written_at_idx on product_ssot_version(written_at desc);
```

Hash chain semantics mirror GovernanceAuditLog §14.2: `this_hash = sha256(serialized_blocks || prev_hash)`. The very first version's `prev_hash` is the SHA-256 of the literal string `"PRODUCT_SSOT_GENESIS"`.

### 2.3 Indexes + constraints

- Unique constraint `(product_id, environment)` on `product_ssot` is enforced by the composite primary key.
- `version` monotonicity is enforced by the write contract (§3), not by SQL — DB-level enforcement is impractical with concurrent writers and we want the write contract to surface conflicts loudly rather than silently coerce.
- All `jsonb` blocks default to `{}` (object) or `[]` (array) so the row is always queryable even immediately after the bare insert in §3.1.

---

## §3 — WRITE CONTRACT (atomic per §7 item #5)

### 3.1 Atomic write protocol

Every pipeline run that produces an output (renewed URL, delta report, or any §6 terminal decision) MUST execute the following sequence inside a single Postgres transaction:

```
BEGIN;
  -- 1. Lock the ProductSSOT row for update.
  SELECT * FROM product_ssot
   WHERE product_id = $1 AND environment = $2
   FOR UPDATE;

  -- 1a. If absent (first run on this product+env), insert a bare row.
  INSERT INTO product_ssot (product_id, environment, audit_hash_chain_pointer)
       VALUES ($1, $2, sha256('PRODUCT_SSOT_GENESIS'))
       ON CONFLICT (product_id, environment) DO NOTHING;

  -- 2. Compute new serialized state with the new entries appended.
  -- 3. UPDATE product_ssot SET … version = version + 1, updated_at = now() …
  -- 4. INSERT product_ssot_version row capturing the post-state.
  -- 5. INSERT GovernanceAuditLog row with topic `ssot.write.v1` linking the runId.
COMMIT;
```

If ANY of steps 1–5 fails, the transaction rolls back and the entire pipeline run is marked INCOMPLETE per §7 item #5. The Self-Renewal Executor's existing rollback path (per CA-7 §15.5 + `docs/specs/SELF_RENEWAL_SPEC.md`) is the canonical handler — this spec does not introduce a parallel rollback mechanism.

Concretely: a run that successfully deploys a renewed URL but whose `product_ssot` UPDATE fails MUST:

1. Mark the GovernanceAuditLog `step_completed` topic with `outcome: 'rolled_back_ssot_write_failed'`.
2. Set the pipeline session's `clearance_verdict` to `ERROR`.
3. Surface the failure to AutoRunner step 8 (Monitor) with the explicit error code `SSOT_WRITE_FAILED`.
4. If a deployment artifact (Vercel URL) was produced, mark the deployment as `unverified` in the DeploymentScaffold per §16.2 — but do NOT auto-undeploy (out of scope for this spec; CEO disposition required if undeploy-on-rollback is desired).

### 3.2 "Atomic with the rest of the output contract"

§7 line 132 says the ProductSSOT write is atomic with the rest of the output contract (items 1–4). In practice, items 1–4 (live URL, delta report, source disclosure, LIMITATIONS section) are produced by code that runs BEFORE the database transaction commits. The atomic guarantee is:

- **Items 1–4 are computed** → if any computation fails, transaction never opens, no write occurs, no rollback needed.
- **Items 1–4 succeed AND transaction commits** → ProductSSOT write is durable, run is COMPLETE.
- **Items 1–4 succeed AND transaction fails** → run is rolled back to INCOMPLETE per §3.1 above; items 1–4 are discarded by the rollback handler (Vercel deploy is marked `unverified`; delta report is NOT emitted to the operator; LIMITATIONS is not surfaced).

The contract is **not** "items 1–4 and the ProductSSOT write share a Postgres transaction" — items 1–4 are external (Vercel API, file I/O, etc.) and cannot be wrapped in a Postgres transaction. The contract is instead "the run is only COMPLETE when both items 1–4 AND the ProductSSOT write succeed; either failure rolls back the whole run."

### 3.3 Write-once-per-run

A single pipeline run produces **exactly one** ProductSSOT write transaction. The transaction may append multiple entries (one `delta_log[]` entry, one or more `governance_record[]` entries depending on which steps reached terminal decisions). Multiple writes per run are an integrity violation flagged by the `version` monotonicity check.

### 3.4 RLS during writes

Writes happen via the Supabase service role (per §14.3 retention table semantics — "Service-role-only writes"). No operator or admin user has direct INSERT/UPDATE permission on `product_ssot`. The `/product-ssot/:productId` UI's annotation + override actions are routed through a server-side function (`api/product-ssot-annotate.js` — separate W2 dispatch) that performs the same atomic transaction on behalf of the authenticated user, with the user's identity captured in `product_ssot_version.written_by`.

---

## §4 — READ CONTRACT

### 4.1 `/product-ssot/:productId` UI surface (§13.1)

Renders the ProductSSOT in the structured view defined in §13.1: `identity_block` header (read-only) · `build_brief` (collapsible, annotatable) · `architecture_snapshot` (collapsible per sub-section, annotatable) · `delta_log` + `governance_record` (reverse-chronological tables; click row → expanded view with inline annotation editor for admin/operator) · `annotations` sidebar (filter by block / author / tag) · `overrides` admin-only tab.

API surface for the UI: `GET /api/product-ssot/:productId?environment=dev|prd` returns the full row (RLS-filtered) plus the last N=50 version-history entries from `product_ssot_version`.

### 4.2 Self-Renewal pre-run read

Self-Renewal Executor (per CA-7 §15.5) reads the most-recent `delta_log[]` entries for the target `(productId, environment)` at run start. Used for two things:

1. **Repeated-fix-loop detection per §28.1 row 3:** if the same `issue.category` appears `resolved` in ≥3 `delta_log[]` entries within the last 30 days, escalate to §10.2 Human Gate before applying the next fix.
2. **Delta-score computation:** the pre-run `governance_record[]` entries of `kind: '95_95_score'` provide the `before` snapshot for the run's `delta_log[].before_after.scores` computation.

### 4.3 §28 Symbiotic Loop pre-run reads

AutoRunner loads the entire `product_ssot` row for `(productId, environment)` at run start and threads blocks into per-step context per §28.1 table:

| Pipeline step | Blocks consumed |
|---|---|
| Step 1 Research (Agent #6, DORMANT) | `build_brief` + `architecture_snapshot` (skip re-discovery; narrow crawl scope per §6) |
| Step 4 Quality Audit (Agent #8, DORMANT) | Prior `governance_record[]` 95/95 scores (trend lines) |
| Step 6 Self-Renewal (Agent #3, SHIPPED-GREEN) | Prior `delta_log[]` entries (repeated-fix-loop detection) |
| Step 7 GTM (Agent #9, DORMANT) | `governance_record[]` entries of `kind: clearance_step` (uncleared-step gate) |

### 4.4 Admin overrides as CEO-equivalent directives

Per §28.3, admin annotations + overrides on the ProductSSOT (via §13.1 role gates) MUST be honoured by subsequent pipeline runs as CEO-equivalent directives. Read code in Self-Renewal, Quality Audit, and Agent #10 drift detection MUST consult `overrides[]` before computing severities and scores, and apply the override semantics defined in §28.3 + §28.4 (admin override always wins per CA-10-Q3=(a); new auto-gen entries are still created but flagged `overridden=true`).

### 4.5 Cross-references

- `GovernanceAuditLog` rows for any pipeline run carry the same `runId` as the `delta_log[].entryId` for that run, enabling cross-system joins. The audit-log row of topic `ssot.write.v1` carries `{product_id, environment, version, prev_hash, this_hash}` so any audit-log consumer can locate the ProductSSOT state at that exact moment.
- `DeploymentScaffold` (per §16.2) is per-deploy; ProductSSOT is across-deploys. `architecture_snapshot` may derive from the most recent DeploymentScaffold per §7.5 line 155.

### 4.6 RLS read policies

Per §13.1 role gate matrix, enforced via Supabase RLS on `product_ssot`:

```sql
-- admin: full read on rows whose owning provider org matches the JWT org_id
create policy "product_ssot_admin_read"
  on product_ssot for select
  to authenticated
  using (
    exists (
      select 1 from products p
       where p.id = product_ssot.product_id
         and p.org_id = (auth.jwt() ->> 'org_id')::uuid
    )
    and (auth.jwt() ->> 'role') = 'admin'
  );
-- operator: same as admin for read (CA-10-C role matrix line 402)
create policy "product_ssot_operator_read"
  on product_ssot for select
  to authenticated
  using (
    exists (
      select 1 from products p
       where p.id = product_ssot.product_id
         and p.org_id = (auth.jwt() ->> 'org_id')::uuid
    )
    and (auth.jwt() ->> 'role') in ('admin', 'operator', 'client')
  );
-- FlowAI-internal audit role: cross-org read (per §14.3 multi-tenant invariant)
create policy "product_ssot_flowai_audit_read"
  on product_ssot for select
  to authenticated
  using ((auth.jwt() ->> 'role') = 'flowai_audit');
-- service-role bypasses RLS (default Supabase behaviour); used by writes only
```

Operator-side annotation writes (`annotations[]` append) are gated by a `WITH CHECK` policy on a separate `product_ssot_annotate_for_operator` function — implementation detail of the server-side annotation endpoint, NOT a direct table UPDATE (per §3.4).

---

## §5 — MIGRATION PLAN

### 5.1 Net-new migration; no existing data

There is no prior `product_ssot` table or analog. The migration is additive only.

Filename per project convention: `supabase/migrations/00NN_product_ssot.sql` where `NN` is the next sequential number after the most recent migration. As of this spec's draft date, the next slot is `0013`.

> **Naming reconciliation note:** the dispatch's §5 references `migrations/YYYYMMDD_product_ssot.sql`. The repo's actual convention is sequential `00NN_<name>.sql` (see `supabase/migrations/0001_initial.sql` … `0012_test_tenant.sql`). This spec follows the repo convention. Implementers should NOT introduce a date-stamped variant.

### 5.2 Migration order

The migration MUST land in the following order within a single transaction:

1. `create table product_ssot (…)` per §2.1.
2. `create table product_ssot_version (…)` per §2.2.
3. `create index` statements for both tables per §2.1 + §2.2.
4. RLS policies per §4.6.
5. Helper function `product_ssot_write(...)` (used by the atomic write protocol in §3.1 — pure SQL function, no language-level handler).
6. Verification queries (commented trailing block per `0011_rls_policies.sql` convention).

### 5.3 Pre-conditions

- `users` table exists (migration `0001_initial.sql` provides it).
- `products` table exists (migration `0001_initial.sql` provides it).
- `pgcrypto` extension is loaded (used for `gen_random_uuid()`); already loaded by migration `0001_initial.sql` line 15.

### 5.4 Default state on apply

- Zero `product_ssot` rows. The first row for any `(product_id, environment)` pair is created lazily by the first pipeline run that targets that pair (via the `INSERT … ON CONFLICT DO NOTHING` step in §3.1).
- Zero `product_ssot_version` rows.
- RLS is enforced from the moment the table is created; no data exists pre-RLS, so there is no backfill concern.

### 5.5 Rollback

The migration is reversible by:

```sql
drop policy if exists "product_ssot_admin_read"        on product_ssot;
drop policy if exists "product_ssot_operator_read"     on product_ssot;
drop policy if exists "product_ssot_flowai_audit_read" on product_ssot;
drop function if exists product_ssot_write;
drop table if exists product_ssot_version;
drop table if exists product_ssot;
```

Because the table is net-new and lazily populated, a rollback is non-destructive to any other system — but it does break in-flight pipeline runs that have already started the atomic-write transaction. Schedule rollbacks during a pipeline-run-quiet window.

---

## §6 — INTEGRATION POINTS

| Caller | Direction | Block(s) read/written | Implementation file |
|---|---|---|---|
| `AutoRunner.jsx` step 8 (Monitor) | WRITE | `delta_log[]` append; `governance_record[]` append (95/95 score + clearance step); `architecture_snapshot` replace (if Agent #10 detected drift) | `src/pages/AutoRunner.jsx` line 8-handler; via `api/product-ssot-write.js` (new) |
| `AutoRunner.jsx` step 0 (Init) | READ | full row | `src/pages/AutoRunner.jsx` run-start; via `api/product-ssot-get.js` (new) |
| `Self-Renewal Executor` (per CA-7 §15.5) | READ before run; WRITE `delta_log[]` after | `delta_log[]`, `governance_record[]` (read); `delta_log[]` append (write) | `src/lib/agents/agents/Agent3SelfRenewalExecutor.js` |
| `Agent #10 Monitor` (per §15.1 row 10) | WRITE | `architecture_snapshot` replace (on drift); `governance_record[]` append (on customer signal) | `src/lib/agents/agents/Agent10Monitor.js` (UNBUILT — separate dispatch) |
| `Agent #21 Aggressive Crawl Conductor` (per §15.1 row 21) | WRITE | `governance_record[]` append (kind: `gtm_readiness_score`); `architecture_snapshot` patch (pages/apiEndpoints discovered) | `api/_lib/aggressiveCrawler.js` (Phase 2 wire-in per P0-4 backlog) |
| `§28 Symbiotic Loop` (Agent #6, DORMANT) | READ | `build_brief` + `architecture_snapshot` (crawl-scope narrowing) | `src/lib/agents/agents/Agent6Research.js` (DORMANT; wire-in per P1-5) |
| `/product-ssot/:productId` UI | READ + WRITE (annotations/overrides) | full row; `annotations[]` append (op + admin); `overrides[]` append (admin only) | `src/pages/ProductSSOT.jsx` (UNBUILT — separate dispatch) + `api/product-ssot-annotate.js` (UNBUILT) |
| `§11 Clearance Step 5` four-prerequisite gate | READ | `governance_record[]` of kind `gtm_readiness_score` (latest); `delta_log[]` (terminal-decision state) | `src/lib/clearance/step5Gate.js` (UNBUILT — separate dispatch per P1-3) |
| `GovernanceAuditLog` (§14) | CROSS-REFERENCE | every `ssot.write.v1` audit-log row links to `(product_id, environment, version)` | `src/lib/auditLogger.js` (existing) |
| `/architecture` UI per §16 | READ | `architecture_snapshot` for current environment | `src/pages/Architecture.jsx` (existing — separate dispatch wires in the ProductSSOT read) |

---

## §7 — HONEST CAPABILITY BOUNDARY

**To be built after this spec ratifies:**

| Item | Status today | Owner of build dispatch |
|---|---|---|
| Supabase migration `0013_product_ssot.sql` (table + indexes + RLS) | UNBUILT | W2 + W5x |
| `api/product-ssot-get.js` (READ endpoint) | UNBUILT | W2 |
| `api/product-ssot-write.js` (atomic write endpoint) | UNBUILT | W2 |
| `api/product-ssot-annotate.js` (annotation + override endpoint) | UNBUILT | W2 |
| AutoRunner.jsx step-0 read + step-8 atomic write wire-in | UNBUILT | W2 + W5x |
| `src/pages/ProductSSOT.jsx` UI | UNBUILT | W5x (front-end) |
| Self-Renewal Executor `delta_log[]` read/write wire-in | UNBUILT (executor exists; ProductSSOT plumbing absent) | W2 |
| §28 Symbiotic Loop read paths (Agent #6 narrowing, Agent #8 trend lines, Agent #9 clearance gate) | UNBUILT (depends on agent graduations P1-5, etc.) | W2 |
| `§11` Clearance Step 5 four-prerequisite gate referencing ProductSSOT | UNBUILT | W2 |
| `product_ssot_version` hash-chain verification job (nightly) | UNBUILT | W5x |

**Today (verbatim, no spin):** ZERO ProductSSOT code. Every pipeline run silently bypasses §7 Output Contract item #5. The §11 Clearance Step 5 four-prerequisite gate is unenforced. §28 Symbiotic Loop's pre-run reads have no data source. The dispatch's UNANIMOUS P0 ranking is correct: nothing else in the agent waves can land cleanly until this spec ratifies + a follow-on W2 build dispatch ships the code.

---

## §8 — ACCEPTANCE CRITERIA

W2-verifiable. Each is a single concrete test that either passes or fails — no judgment calls.

1. **Migration applies cleanly.** `supabase db reset && supabase db push` on a fresh local Supabase project results in `product_ssot` + `product_ssot_version` tables present with the exact column types per §2.1 + §2.2. Verified by `\d+ product_ssot` and `\d+ product_ssot_version` returning the expected schema.

2. **Atomic write rolls back on failure.** Integration test injects a deliberate failure into step 4 of the §3.1 transaction (e.g., violate a CHECK constraint on `audit_hash_chain_pointer`). Assert that (a) the entire transaction rolls back, (b) `product_ssot.version` is unchanged, (c) no `product_ssot_version` row was added, (d) the pipeline run is marked `clearance_verdict = 'ERROR'` with code `SSOT_WRITE_FAILED`, (e) no operator-visible delta report or LIMITATIONS section was emitted.

3. **Version monotonicity is enforced.** Integration test issues two concurrent writes to the same `(product_id, environment)` row. Assert that exactly one transaction commits with `version = N+1`; the other transaction either retries (winning `version = N+2`) or aborts with `40001 serialization_failure`. Assert no row exists where `version > previous_version + 1`.

4. **RLS denies cross-org reads.** Integration test creates two providers (A, B) each with one product (a1, b1) each in `(dev, prd)`. Assert that A's admin JWT can read `(a1, dev)` and `(a1, prd)` but receives zero rows for `(b1, *)`. Assert the same for B reading A's rows. Assert that the `flowai_audit` role reads all four rows.

5. **Annotation append-only for operators.** Integration test issues operator-role annotation appends to `annotations[]` via `api/product-ssot-annotate.js`. Assert the new annotation appears in the array. Assert any attempt to mutate an existing `annotations[]` entry (e.g., update an entry's `text`) returns HTTP 403. Assert any attempt to write to `overrides[]` as operator returns HTTP 403. Assert admin-role writes to both succeed.

6. **Hash chain is verifiable.** Nightly cron task (separate dispatch) reads every row of `product_ssot_version` in `(product_id, environment, version)` order and recomputes `this_hash = sha256(serialized_blocks || prev_hash)`. Assert every recomputed hash equals the stored `this_hash` across all rows. Any divergence is logged to GovernanceAuditLog with topic `ssot.hash_chain_divergence.v1`.

7. **`§28` pre-pipeline read produces the documented blocks.** Integration test seeds a `product_ssot` row with a `build_brief`, `architecture_snapshot`, and three prior `delta_log[]` entries. Trigger an AutoRunner step 0 init. Assert the per-step context object passed to Agent #6 (mocked) includes the literal `build_brief` + `architecture_snapshot.pages[]` and the per-step context for Agent #3 includes the three `delta_log[]` entries.

8. **GovernanceAuditLog cross-reference.** Every successful atomic write per §3.1 produces a matching GovernanceAuditLog row of topic `ssot.write.v1`. Integration test asserts: `select count(*) from product_ssot_version where (product_id, environment, version) = (X, Y, V)` equals `select count(*) from governance_audit_log where topic = 'ssot.write.v1' and payload->>'product_id' = X and payload->>'environment' = Y and (payload->>'version')::bigint = V`.

---

## §9 — PANEL QUESTIONS (adversarial format)

For W6 / Panel consultation. Each question presents the strawman ("Y" position) and the adversarial counter ("N" position). Adversarial split intent: Panel must decide which framing reflects canonical SSOT, not which framing the implementer prefers.

**Q1 — Schema design: six jsonb blocks vs flat per-run rows.**
- **Y (this spec's choice):** Six jsonb blocks per `(productId, environment)` pair, accumulating across runs. Faithful to §7.5. One row per product+environment lifetime; entries within `delta_log[]` / `governance_record[]` represent individual runs.
- **N (dispatch's strawman §2):** Flat per-run row schema with top-level columns `runId`, `timestamp`, `pipelineVersion`, `clearanceVerdict`, `findings`, etc. — one row per pipeline run.
- **Tension:** the flat shape would be friendlier to SQL analytics and would mirror how `workspace_runs` is modeled; the six-block shape preserves §7.5 verbatim and is what §28's pre-run-read code expects. Picking the flat shape requires re-amending §7.5 by stealth.

**Q2 — Atomicity: "atomic with the rest of the output contract" interpretation.**
- **Y (this spec, §3.2):** "Atomic" means the run is COMPLETE only when both items 1–4 (live URL, delta report, source disclosure, LIMITATIONS) AND the ProductSSOT write succeed. Items 1–4 cannot share a Postgres transaction with the SSOT write (Vercel API, file I/O are external). The atomic guarantee is at the run-completion-state level, not the DB-transaction level.
- **N (literal reading of §7 line 132):** "Atomic" means a single transaction encompassing items 1–5. The Vercel deploy, the delta report file write, etc. all happen inside the Postgres txn via 2-phase commit or compensating actions.
- **Tension:** the literal reading is unimplementable in practice (Vercel has no Postgres-XA hook). The spec's interpretation matches what §7 line 132's rollback semantics actually require ("considered INCOMPLETE and rolled back") — a state-level rollback, not a true 2PC. If Panel rules N, the spec needs a compensating-actions section (out of scope for this revision).

**Q3 — RLS policy for operator reads vs cross-tenant audit.**
- **Y (this spec, §4.6):** Operator reads are scoped to their own provider org (same as admin reads); the `flowai_audit` role reads across all orgs.
- **N (CA-10-C role matrix line 402 strict reading):** "client" role is listed alongside admin and operator as a reader role. The strict matrix has THREE org-scoped reader roles (admin, operator, client), not two. The spec's policy elides `client` from `admin` + `operator` even though the matrix lists it. (Looking at the policy block in §4.6, `client` IS listed in `operator_read`'s in-list — but the policy is named "operator_read", which is misleading.)
- **Tension:** the policy is functionally correct but the naming is sloppy. Panel should rule whether to (a) rename the policy `product_ssot_org_member_read` for accuracy or (b) split into three policies, one per role, for explicit alignment with §13.1.

**Q4 — Override semantics: append-only audit vs UPDATE-with-revision.**
- **Y (this spec, §3 + §13.1):** All mutations are append-only. An admin "revoke" of an override is implemented as a NEW override entry whose `replacementContent` restores the original. The full history is preserved.
- **N (UPDATE-with-revision alternative):** Each override is a top-level entry with a `revisions[]` sub-array; "revoking" updates the entry in place by appending to its `revisions[]`. The current state is the LAST revision; history is on the revisions array.
- **Tension:** Y is simpler to audit (every change is a new row in `product_ssot_version`) and matches §28.3's "audit trail preserved" requirement literally. N is friendlier for UI (single entry with revision history) but requires UPDATE on `overrides[]` jsonb arrays which complicates RLS WITH CHECK clauses. Panel ruling on Y or N affects the UI design + the policy implementation; this spec defers the decision and proceeds with Y per §13.1's "append-only" language.

**Q5 — Honesty / capability boundary completeness.**
- **Y (this spec, §7):** ZERO ProductSSOT code today; every pipeline run silently bypasses §7 item #5; build dispatch is separate. The capability boundary section lists 10 specific UNBUILT items by file path.
- **N (adversarial counter):** The capability boundary should also enumerate (a) which pipeline runs in production right now would NOT have been rolled back even with this spec implemented, since their failures occurred at items 1–4 (Vercel deploy failures) before any ProductSSOT-write attempt, (b) the cost-per-run delta from adding the atomic-write transaction (estimate: <50 ms per run on warm Supabase), (c) the operator-visible failure rate when SSOT_WRITE_FAILED begins firing on previously-silent failures.
- **Tension:** N is a fair critique — the spec is honest about what's UNBUILT but silent on what becomes newly visible after implementation. A Panel may rule that §7 needs a "post-implementation visibility shift" subsection. This spec defers that disclosure to the W2 build dispatch's pre-merge readiness report.

---

## §10 — Open items deferred to follow-on dispatches

1. **W2 build dispatch.** Implements §2–§6 as code. Scope: migration `0013_product_ssot.sql` + four `api/product-ssot-*.js` endpoints + AutoRunner read/write wire-in.
2. **W5x UI dispatch.** Implements `/product-ssot/:productId` per §13.1 + §4.1.
3. **W5x nightly hash-chain verifier.** Implements §8 acceptance criterion #6.
4. **W6 Panel consultation.** Reviews §9 Q1–Q5; ratifies schema + atomicity interpretation; produces a CA-n promotion if any §9 ruling materially diverges from canonical §7.5 / §7 / §13.1.
5. **W2 Agent #10 dispatch.** Implements `architecture_snapshot` drift writes per §6 integration row 5.
6. **W2 §11 Clearance Step 5 gate dispatch.** Wires the four-prerequisite gate to read from `governance_record[]` per §6 integration row 8.
