# ProductSSOT — Engineering Specification

| Field | Value |
|---|---|
| **Status** | RATIFIED v3 (W5c, 2026-05-17) — Q4 hybrid + cross-cutting R1/R2/R3 per `docs/panel-consultations/product-ssot-v2-q4-ratification-2026-05-17.md`. All 5 §9 questions now ratified; no open Panel items. |
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

**Rationale: six-block schema vs flat per-run rows (Panel-ratified, Q1).** ProductSSOT models a product's *lifetime* across runs, not individual runs. A flat per-run row schema (one row per pipeline run, with top-level columns like `runId` / `timestamp` / `pipelineVersion` / `clearanceVerdict`) would mirror `workspace_runs` and be friendlier to ad-hoc SQL analytics — but it would require a five-way join to reconstruct the per-product `(identity_block, build_brief, architecture_snapshot, delta_log, governance_record, annotations+overrides)` state that §28's Symbiotic Loop and §13.1's `/product-ssot/:productId` UI both treat as a single coherent object. The six-block model keeps the canonical living-document semantics (§7.5 lines 136–156) addressable as one row per `(productId, environment)`, append-only inside the `jsonb[]` blocks. Run-level analytics remain trivial via `jsonb_array_elements(delta_log)` and `jsonb_array_elements(governance_record)`; lifetime queries (per-product trend, override audit, drift history) get the canonical one-row read that §28 expects without any join. Picking flat-row would have required a stealth re-amendment of §7.5; Panel ratified the canonical six-block model on 2026-05-16 (Q1=Y).

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

### 2.4 Retention + archival policy (R2 — ratified 2026-05-17)

**`delta_log[]` and `governance_record[]` entries older than 365 days are archived to cold storage (Supabase cold tier or equivalent) and removed from the hot `jsonb` columns.** Archival runs nightly via a scheduled job. Queries against archived data route to the cold store via a read-through API.

Implementation contract:

- **Hot retention window:** 365 days. An entry's age is `now() - (entry.at)` where `entry.at` is the per-entry timestamp.
- **Archival target:** a separate Supabase project (the same `flowai-cold` project used by GovernanceAuditLog cold snapshots per §14.3) so the cold-tier hash chain remains compatible with the hot-tier chain. Per-entry archive rows mirror the `product_ssot_version` shape with one additional field: `archived_from = sha256(<original entry json>)`.
- **Nightly job:** `scripts/archive-product-ssot.mjs` (separate W5x dispatch; outside this spec). Each run reads every `product_ssot` row, identifies `delta_log[]` and `governance_record[]` entries with `at < now() - interval '365 days'`, copies them into the cold-store table, then UPDATEs the hot row to remove the archived entries from the arrays. The whole archival cycle for a single row is itself a Postgres transaction; failure aborts the cycle without partial removal.
- **Read-through API:** `api/product-ssot-get.js` accepts an optional `?include_archived=true` query parameter. When true, the endpoint merges the hot row's `delta_log[]` / `governance_record[]` with the cold-store rows for the same `(product_id, environment)` and returns a single chronologically-sorted view. The hot-row `updated_at` and `version` fields are NOT affected by archival — those continue to advance on live writes only.
- **What is NOT archived:** `identity_block`, `build_brief`, `architecture_snapshot`, `annotations[]`, `overrides[]`, and the top-level `version` / `audit_hash_chain_pointer` / `created_at` / `updated_at` fields all stay in the hot row indefinitely. Only the append-only event streams (`delta_log[]` + `governance_record[]`) participate in archival.
- **PII-scrub at archival:** the same `scrubCredentials()` extension per §14.3 applies on the archival read path. Hot rows already carry scrubbed content (scrub happens at write time); the archival job re-applies the scrub as a defense-in-depth check and writes a `governance_record` entry of kind `customer_signal` if any unscrubbed PII is detected (indicates a regression in the write-time scrub).

This policy aligns ProductSSOT retention with the §14.3 retention extension (365-day hot + 7-year cold) and prevents `delta_log[]` / `governance_record[]` from growing unboundedly on long-lived products.

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

**Concurrent-write retry (R3 — ratified 2026-05-17).** If the Postgres transaction fails with `serialization_failure` (SQLSTATE `40001` — the canonical Postgres signal that the row was modified by a concurrent writer between the `SELECT … FOR UPDATE` and the `UPDATE`), Self-Renewal retries the entire §3.1 transaction up to **3 times with exponential backoff (100 ms, 200 ms, 400 ms)**. Each retry re-reads the row state under a fresh `FOR UPDATE` lock and re-computes the serialized post-state, so the retry composes correctly with whatever the concurrent writer committed. If all 3 retries fail, the run transitions to INCOMPLETE per §7 item #5 and the rollback sequence in the numbered list below fires. The retry budget applies ONLY to `serialization_failure`; other Postgres errors (constraint violations, RLS rejections, etc.) abort immediately without retry. GovernanceAuditLog topic `ssot.write.retry.v1` is emitted once per retry attempt with `{attempt: 1|2|3, prev_error, backoff_ms}` so retry behaviour is observable.

Concretely: a run that successfully deploys a renewed URL but whose `product_ssot` UPDATE fails MUST:

1. Mark the GovernanceAuditLog `step_completed` topic with `outcome: 'rolled_back_ssot_write_failed'`.
2. Set the pipeline session's `clearance_verdict` to `ERROR`.
3. Surface the failure to AutoRunner step 8 (Monitor) with the explicit error code `SSOT_WRITE_FAILED`.
4. If a deployment artifact (Vercel URL) was produced, mark the deployment as `unverified` in the DeploymentScaffold per §16.2 — but do NOT auto-undeploy (out of scope for this spec; CEO disposition required if undeploy-on-rollback is desired).

### 3.2 "Atomic with the rest of the output contract" — saga pattern, not 2-phase commit

**Panel-ratified definition (Q2=Y, 2026-05-16):** the §7 line 132 atomicity guarantee is **run-completion-state atomicity — not a single database transaction**. Items 1–4 of the §7 Output Contract (live URL, before/after delta report, source disclosure, LIMITATIONS section) are external to Postgres — the Vercel deploy uses the Vercel API, the delta report is a file write, and so on. None of these can be enrolled in a Postgres transaction.

The atomic guarantee is instead:

> **Either all six ProductSSOT blocks are written (transaction committed) AND items 1–4 succeeded, OR the run transitions to INCOMPLETE.**
>
> **This is a saga pattern, not 2-phase commit.**

Concretely, the saga has three commit points and per-step compensating actions:

| Stage | Action | If it fails, compensating action |
|---|---|---|
| **A.** Items 1–4 computed (Vercel deploy, delta report, source disclosure, LIMITATIONS) | external work | no Postgres txn was ever opened; no compensating action needed; run is INCOMPLETE |
| **B.** Postgres transaction §3.1 steps 1–5 (lock row → lazy-insert → UPDATE all 6 blocks → INSERT version-history → INSERT GovernanceAuditLog) | atomic via `BEGIN`/`COMMIT` | transaction rolls back automatically; compensating action marks Vercel deploy `unverified` per §16.2 and the run transitions to INCOMPLETE per §3.1 list above |
| **C.** Post-commit side effects (operator-visible delta report emission, LIMITATIONS surfacing in UI) | external work | if any side effect fails, log to GovernanceAuditLog with topic `ssot.post_commit_partial.v1` but do NOT roll back the committed transaction — the canonical record is durable and the side-effect failure is operator-visible, not data-integrity-relevant |

This saga interpretation preserves §7 line 132's contract literally ("a run that produces a renewed URL but fails to update ProductSSOT is considered INCOMPLETE and rolled back") while remaining implementable with the actual technology stack (Vercel, Postgres, no XA coordinator). The literal-2PC reading is unimplementable: Vercel has no Postgres-XA hook and no compensating-deploy API.

**Stage C edge case — Vercel succeeds, Postgres commits, post-commit side effects fail (R1 — ratified 2026-05-17).** If Stage C post-commit side effects fail after Stage B Postgres transaction commits, the system logs `ssot.post_commit_partial.v1` and marks the deployment as **`unverified`** in the operator dashboard. The operator is notified with a reconciliation prompt (offering "mark verified" / "re-emit side effects" / "tear down deployment" actions, with the latter two routed through the existing Self-Renewal Executor surface). **The ProductSSOT write is NOT rolled back — the Postgres commit is authoritative.** Rationale: the canonical living-document state has been durably committed under the audit-hash chain; reversing it would create a divergence between the hash-chain anchor and the operator-visible state, which a future audit pass would correctly flag as tamper. The honest answer is "the data is durable; the side effects partially fired; here is the unfinished work" rather than "we silently rolled back data the audit chain already records as committed." This is the standard saga forward-recovery (vs. backward-recovery) choice for Stage C — chosen because Stage C side effects are operator-visible niceties (UI surfacing, notification dispatch), not data-integrity-relevant operations.

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

Per §13.1 role gate matrix, enforced via Supabase RLS on `product_ssot`. **Panel CEO disposition 2026-05-16 (Q3=split)** ruled to split the prior single combined policy into three explicit per-role policies for direct alignment with §13.1's three-row reader matrix (admin / operator / client). Each policy carries the exact `role` literal it gates so policy purpose is obvious from the policy name alone. A fourth policy covers the cross-org `flowai_audit` read per §14.3.

```sql
-- ─── admin reads: org-scoped (CA-10-C role matrix row 1) ─────────────
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

-- ─── operator reads: org-scoped (CA-10-C role matrix row 2) ──────────
create policy "product_ssot_operator_read"
  on product_ssot for select
  to authenticated
  using (
    exists (
      select 1 from products p
       where p.id = product_ssot.product_id
         and p.org_id = (auth.jwt() ->> 'org_id')::uuid
    )
    and (auth.jwt() ->> 'role') = 'operator'
  );

-- ─── client reads: org-scoped (CA-10-C role matrix row 3) ────────────
create policy "product_ssot_client_read"
  on product_ssot for select
  to authenticated
  using (
    exists (
      select 1 from products p
       where p.id = product_ssot.product_id
         and p.org_id = (auth.jwt() ->> 'org_id')::uuid
    )
    and (auth.jwt() ->> 'role') = 'client'
  );

-- ─── FlowAI-internal audit role: cross-org read (per §14.3) ──────────
create policy "product_ssot_flowai_audit_read"
  on product_ssot for select
  to authenticated
  using ((auth.jwt() ->> 'role') = 'flowai_audit');

-- service-role bypasses RLS (default Supabase behaviour); used by writes only
```

The three org-scoped policies share an identical `using` shape modulo the `role` literal. PostgreSQL OR-combines policies of the same `command` on the same table, so the effective read predicate for any authenticated user is "row's product is in my org AND my JWT role is one of admin/operator/client" — identical to the prior single combined policy semantically but transparent on inspection. A user with no matching role gets the empty set; service-role bypasses RLS for writes per §3.4.

Operator-side annotation writes (`annotations[]` append) are gated by a `WITH CHECK` policy on a separate `product_ssot_annotate_for_operator` function — implementation detail of the server-side annotation endpoint, NOT a direct table UPDATE (per §3.4).

### 4.7 UI-synthesis contract (Q4 hybrid; canonical at CANONICAL_REFERENCE §13.1)

**Panel CEO disposition 2026-05-17 (Q4=hybrid):** the database write semantics remain append-only per §3 (unchanged); the UI surface is permitted to synthesize an UPDATE-with-revision view from the underlying append-only data.

Verbatim contract addition to CANONICAL_REFERENCE §13.1:

> **`/product-ssot/:productId` MAY synthesize an UPDATE-with-revision view by grouping append-only override entries by `replacementTarget`, displaying the latest as current and prior entries as revision history. The DB write semantics remain append-only and the audit trail is the authoritative truth.**

**UI synthesis rules:**

1. **Grouping key:** override entries in `overrides[]` are grouped by `replacementTarget` (the deterministic anchor that identifies which auto-generated entry the override replaces — e.g., the `delta_log[].entryId` whose severity is being overridden, or the `architecture_snapshot.dependencies[].name` whose deprecation warning is being suppressed). The same `replacementTarget` appearing in multiple override entries forms one "logical override chain" in the UI.
2. **Current state:** within a chain, the latest entry by `at` timestamp is the **current** state surfaced as the live override on the `/product-ssot/:productId` view.
3. **Revision history:** prior entries in the chain are surfaced under a "Revision history" disclosure inside the same UI row, in reverse-chronological order. Each prior revision is read-only and tagged with its author + timestamp + rationale (per the existing override entry shape).
4. **Revocation chains — termination semantics (Q4 hybrid addendum):** a "revoke" override is an entry whose `replacementContent` is the restoration target (typically the original auto-generated content). When a chain contains a revoke that points at the entry immediately preceding it, the UI collapses both entries into a single row labelled **`restored`**. A revoke-of-revoke (chain pattern: original → override-A → revoke-of-A → revoke-of-revoke-A) **collapses to a no-op in the UI view**, shown as `restored` with the full collapsed chain visible under the Revision history disclosure. The DB still carries every entry as a distinct append-only row; only the rendered UI collapses them.
5. **Authoritative truth:** when the UI's synthesized view disagrees with the DB-resident order of `overrides[]` entries (e.g., a UI bug groups two unrelated entries because their `replacementTarget` clashes due to a stale cache), the DB's append-only order + `product_ssot_version` hash chain are the canonical record. The UI surfaces a `data-rendering-divergence` warning if its synthesis pass produces a chain that fails the termination semantics in (4) above.
6. **No DB UPDATE.** Critically, this contract does NOT introduce any UPDATE-with-revision semantics at the DB layer. `overrides[]` remains append-only per §3 (write contract unchanged), `product_ssot_version` remains the per-write audit log, and `audit_hash_chain_pointer` continues to anchor every append. Q4 hybrid is **purely a UI-layer affordance** — implementers in `src/pages/ProductSSOT.jsx` derive the rendered view from the append-only DB rows at render time.

This hybrid resolves the Q4 tension: operators get the friendlier UI experience (single entry with revision history) without sacrificing the audit-chain simplicity, RLS-WITH-CHECK simplicity, or §28.3's "audit trail preserved" requirement. The §28.3 conflict-resolution rule ("admin override always wins; new auto-gen entries are flagged `overridden=true`") is unchanged.

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
drop policy if exists "product_ssot_client_read"       on product_ssot;
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

### 7.1 Cost-per-run delta (post-implementation)

Implementing this spec adds measurable cost to every Self-Renewal cycle, because §28 closes the loop with a re-assessment pass that did not previously exist. Estimated per-cycle cost delta:

| Cost component | Per Self-Renewal cycle | Notes |
|---|---|---|
| Postgres atomic write (§3.1 transaction) | ~$0.0001 | warm Supabase; <50 ms wall-clock |
| `product_ssot_version` row + hash chain compute | ~$0.0001 | one INSERT + SHA-256 |
| GovernanceAuditLog `ssot.write.v1` emit | ~$0.0001 | one INSERT |
| **Re-assessment crawl** (Aggressive Crawl Engine pass to verify §28 deltas) | **~$0.30 – $2.00** | dominated by Browserless minutes + Anthropic tokens for issue-detection; bounded by §7.6 per-run ceiling ($15/run/product/env) |
| **Total per Self-Renewal cycle** | **~$0.30 – $2.00** | re-assessment crawl is the operative cost driver; the Postgres / hash / audit-log layer is in the noise |

This cost is consumed PER product+environment PER Self-Renewal cycle. For VEU's 5 flagship products across `dev`+`prd` (10 product+env pairs) at the spec's design cadence (one Self-Renewal cycle per product per 24h), the steady-state annualised cost is ~$1,100 – $7,300 — well within the §7.6 budget envelope. CEO direction (CA-10-D) explicitly accepted this cost as the price of closing the §6 crawl→detect→fix→re-test loop.

### 7.2 Post-implementation visibility shift

**Once ProductSSOT is built, previously silent `SSOT_WRITE_FAILED` errors become visible to operators. Operator-facing failure rate will appear to increase (it was always failing silently).**

Today, every pipeline run "succeeds" from the operator's perspective because there is no ProductSSOT write to fail. Once the spec is implemented, the §3.1 atomic-write transaction can fail (Postgres connectivity blip, RLS misconfiguration, hash-chain divergence, etc.) and those failures will surface as operator-visible `SSOT_WRITE_FAILED` errors with `clearance_verdict = ERROR`.

This is not a regression — it is the spec doing exactly what §7 line 132 requires (treating SSOT-write failure as a run-incomplete signal). But the operator-perceived failure rate WILL go up in the week following the W2 build dispatch. Communications expectations:

- **Pre-merge readiness report** (owned by the W2 build dispatch) must include a 7-day error-rate baseline against a shadow-mode rollout (writes attempted but failures don't surface to operators), so the post-merge operator-visible delta is bounded and explainable.
- **Operator-facing release notes** must explicitly call out the visibility shift so newly-surfaced failures aren't misread as a regression introduced by the build.
- **The W2 dispatch's merge gate** should require the shadow-mode SSOT_WRITE_FAILED rate to be < 0.5 % of pipeline runs over 7 days — anything higher indicates a real-world reliability issue that must be addressed BEFORE flipping to live mode.

Production pipeline runs that fail TODAY at items 1–4 of §7 (Vercel deploy errors, delta report generator crashes, etc.) would NOT have been rolled back by this spec even after implementation — those failures already short-circuit before the §3.1 transaction opens. The visibility shift is purely additive: pre-existing item-1-through-4 failures remain operator-visible exactly as today; net-new item-5 failures become operator-visible for the first time.

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

## §9 — PANEL QUESTIONS — RULINGS (v2 update)

The §9 questions from v1 (commit `4b8a3c3`) were Panel-reviewed in `docs/panel-consultations/product-ssot-spec-ratification-2026-05-16.md`. CEO disposition 2026-05-16 ruled Q1, Q2, Q3, and Q5; Q4 remains the sole open question deferred to a follow-on Panel cycle.

### Q1 — Schema design: six jsonb blocks vs flat per-run rows — **RATIFIED Y (six-block)**
Panel ratified the six-block model per §7.5 canonical. Flat per-run rows would have required a stealth amendment of §7.5 and broken §28's one-row-per-product-lifetime read pattern. Rationale paragraph inlined into §2.1 of this v2.

### Q2 — Atomicity interpretation — **RATIFIED Y (saga pattern)**
Panel ratified the run-completion-state atomicity reading. §3.2 v2 now declares the saga pattern explicitly with a three-stage table (items 1–4 external work → §3.1 Postgres txn → post-commit side effects) and explicit compensating-action semantics. Literal 2PC is unimplementable on the actual Vercel-plus-Postgres stack.

### Q3 — RLS policy naming + structure — **RATIFIED: split into 3 explicit per-role policies**
CEO disposition 2026-05-16 ruled to split the prior single combined operator-read policy into three explicit per-role policies (`product_ssot_admin_read`, `product_ssot_operator_read`, `product_ssot_client_read`), each gating exactly one `role` literal. The cross-org `product_ssot_flowai_audit_read` policy is retained as the fourth. §4.6 v2 now carries the four-policy block; §5.5 v2 rollback drops all four. PostgreSQL OR-combination semantics keep the effective predicate identical to the prior single-policy form, but every policy's name now matches exactly what it does.

### Q4 — Override semantics: append-only vs UPDATE-with-revision — **RATIFIED HYBRID (2026-05-17)**
CEO disposition 2026-05-17 ruled the **hybrid** path: DB stays append-only per §3 (option Y unchanged at the storage layer); the UI synthesizes an UPDATE-with-revision view from the append-only data at render time (option N affordance at the UI layer). §4.7 v3 inlines the verbatim UI synthesis contract: grouping by `replacementTarget`, latest-by-timestamp as current, prior entries as revision history, with explicit termination semantics for revocation chains (`revoke-of-revoke` collapses to a no-op UI view labelled `restored`, with the full chain still durable in the DB). The W2 build dispatch is now unblocked on override-revoke UI semantics (§4.7 is the contract). The §13.1 canonical text receives a one-paragraph addition mirroring §4.7's verbatim contract block — that promotion lives in a follow-on CA-n dispatch to CANONICAL_REFERENCE.md (out of scope for this spec, listed in §10).

### Q5 — Honesty / capability boundary completeness — **RATIFIED: expand §7**
CEO disposition 2026-05-16 ruled to expand §7 with cost-per-run delta and post-implementation visibility-shift disclosure. §7.1 v2 now lists the ~$0.30 – $2.00 per Self-Renewal cycle cost (dominated by the re-assessment crawl, NOT the Postgres write); §7.2 v2 carries the visibility-shift paragraph verbatim per CEO wording ("Once ProductSSOT is built, previously silent `SSOT_WRITE_FAILED` errors become visible to operators…"). The W2 build dispatch's pre-merge readiness report must include a 7-day shadow-mode error-rate baseline so the visibility shift is bounded and explainable.

---

## §10 — Open items deferred to follow-on dispatches

1. **W2 build dispatch.** Implements §2–§6 as code. Scope: migration `0013_product_ssot.sql` + four `api/product-ssot-*.js` endpoints + AutoRunner read/write wire-in.
2. **W5x UI dispatch.** Implements `/product-ssot/:productId` per §13.1 + §4.1.
3. **W5x nightly hash-chain verifier.** Implements §8 acceptance criterion #6.
4. **CA-n promotion to CANONICAL_REFERENCE.md §13.1.** All five §9 questions (Q1, Q2, Q3, Q4 hybrid, Q5) ratified by CEO on 2026-05-16 + 2026-05-17 — no remaining open Panel items. A follow-on CA-n promotion adds the §4.7 UI-synthesis contract verbatim into CANONICAL_REFERENCE.md §13.1 so the canonical doc carries the hybrid contract directly rather than only by reference to this spec. Separate dispatch (W2 or W5x); spec-only.
5. **W5x retention/archival nightly job (R2).** Implements `scripts/archive-product-ssot.mjs` per §2.4: nightly archival of `delta_log[]` + `governance_record[]` entries older than 365 days to the `flowai-cold` Supabase project; defense-in-depth `scrubCredentials()` re-pass; read-through merge in `api/product-ssot-get.js?include_archived=true`.
5. **W2 Agent #10 dispatch.** Implements `architecture_snapshot` drift writes per §6 integration row 5.
6. **W2 §11 Clearance Step 5 gate dispatch.** Wires the four-prerequisite gate to read from `governance_record[]` per §6 integration row 8.
