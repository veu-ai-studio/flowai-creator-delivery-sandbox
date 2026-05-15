# SSOT Amendment Draft — CA-10 (Product SSOT — Symbiotic Living Document per Product)

**Status:** DRAFT — pending W6 Panel review + CEO disposition per CA-n cycle (Rev-2.1 §18).
**Author:** W3, 2026-05-15.
**Anchor canonical SSOT:** `docs/CANONICAL_REFERENCE.md` Rev-2.1 (commit `9495b26`).
**Target sections amended:**
- §7 Output Contract (CA-10-A — expand output to include updated ProductSSOT).
- §15.1 rows #3 + #10 + §15.2 (CA-10-B — auto-update triggers + new MessageBus topics).
- §11 Six-Step Product Clearance Protocol (CA-10-B — Clearance entries write to ProductSSOT).
- §13 Authentication + Role Model + §14.3 RLS (CA-10-C — human-editable layer role gating + retention).
- §4 L2/L3 Orchestration + §6 Crawl Contract + §9 Pipeline Steps (CA-10-D — symbiotic feedback loop).
- §14.3 retention semantics (CA-10-E — ProductSSOT retention).
- New entity: `ProductSSOT` in Supabase schema (CA-10-A).

**Coupled with:** CA-7 + CA-8 (`ce96055`) and CA-9 (`5c06893` + `af82178` + `3d17096`). CA-10's writes-to-ProductSSOT from Agent #3 Self-Renewal cycles route through the Self-Renewal Executor charter once CA-7 promotes. CA-10's customer-feedback-driven SSOT updates intersect with CA-9-C; the customer-issue topic `10.customer.issue.v1` (CA-9-C) becomes an additional trigger for `10.ssot.updated.v1` (CA-10-B).

**Lineage:** CEO-locked feature spec 2026-05-15 (W3 dispatch). Five sub-amendments bundled:
- **CA-10-A:** Product SSOT entity definition + Supabase schema + §7 Output Contract expansion.
- **CA-10-B:** Auto-update triggers + new MessageBus topics + Agent #3 / #10 / Clearance charter expansions.
- **CA-10-C:** Human-editable annotation layer + role gates + version history + override mechanism.
- **CA-10-D:** Symbiotic feed-back loop (ProductSSOT becomes pipeline-run input alongside live URL).
- **CA-10-E:** GDPR + PII-scrub + retention + portability (export tied to Clearance §11 Step 4).

---

## CA-10-A — Product SSOT Entity (§7 Output Contract amendment + new Supabase table)

### CA-10-A.1 Background

Rev-2.1 §7 Output Contract defines the per-run output as: (1) new live URL, (2) before/after delta report, (3) source disclosure, (4) LIMITATIONS section. There is **no canonical living document** per product that accumulates history across runs. Provider-side documentation is manual today (CANONICAL_REFERENCE notes in §16.2 mention `DeploymentScaffold` entity emitting "SQL schemas, Vercel config, README, migration checklist" but these are static + per-deploy, not living).

CEO-locked feature spec 2026-05-15: every product FlowAI builds, renews, or monitors gets its own **living SSOT** — auto-generated + auto-updated by FlowAI, with a human-editable layer on top. Replaces manual documentation entirely per product. CA-10 canonicalises this as the **ProductSSOT** entity.

### CA-10-A.2 ProductSSOT entity structure

One ProductSSOT row per `(productId, environment)` pair, where `environment ∈ { 'dev', 'prd' }` per Rev-2.1 §16.3 (Dual Deployment — dev + prd tracked separately). A product in three states (dev + prd + an additional staging) gets three ProductSSOTs.

**Top-level fields (canonical):**

| Field | Type | Owner | Mutation |
|---|---|---|---|
| `productId` | string (foreign key → `ProductRegistry.id`) | system | immutable |
| `environment` | enum (`'dev' \| 'prd'`; extensible per §16.3) | system | immutable |
| `version` | int (monotonic per (productId, environment)) | system | auto-incremented on every write |
| `created_at` | timestamptz | system | immutable |
| `updated_at` | timestamptz | system | auto on every write |
| **`identity_block`** | jsonb | system + admin | auto-populated; admin can override |
| **`build_brief`** | jsonb | system + admin | auto-populated from original creation input; admin can annotate |
| **`architecture_snapshot`** | jsonb | system (Agent #10 drift detection) | auto on drift; admin can annotate but NOT override the snapshot |
| **`delta_log`** | jsonb[] (append-only) | system (Agent #3 + Agent #10) | append-only; admin can annotate per entry |
| **`governance_record`** | jsonb[] (append-only) | system (Clearance + Human Gates) | append-only; admin can annotate per entry; never override |
| **`annotations`** | jsonb[] (append-only) | admin + operator | append-only; never auto-written; admin/operator add |
| **`overrides`** | jsonb[] (append-only) | admin only | append-only; flags auto-generated entries as overridden + supplies replacement text |
| `audit_hash_chain_pointer` | string | system | tamper-evidence anchor per §14.2 |

**Sub-structure of each block (verbatim):**

```js
identity_block = {
  productName: string,
  productUrl: string,
  ownerProviderOrgId: string,
  ownerOperatorIds: string[],
  createdAt: ISO-8601,
  createdBy: { userId, displayName, role },
  tags?: string[],
}

build_brief = {
  originalInput: { mode: 'clone-improve'|'describe-build'|'paste-upload'|'synthesize-build',
                   sourceUrls?: string[], description?: string, attachments?: [...] },
  inputArtifactId: string,    // FK to W2 inputArtifact (renewal/inputArtifact.js)
  normalizedConcept: string,
  targetUsers: string,
  coreClaims: string[],
  detectedFeatures: string[],
  initialBuildCommit?: string,
  initialDeployUrl?: string,
}

architecture_snapshot = {
  capturedAt: ISO-8601,
  framework: 'vite-react'|'next'|'unknown',
  dependencies: { name, version, license, deprecated?, criticalCves? }[],
  envConfig: { keyName, present: true|false, source: 'doppler'|'env-file'|'absent' }[],
  pages: { route, component, lastSeenAt }[],
  apiEndpoints: { path, method, lastSeenAt }[],
  databaseSchema: { table, columns: {name, type, nullable}[], rlsPolicies?: string[] }[],
  readinessScores: { dimension, score }[],   // per §16.1 6 readiness dimensions
}

delta_log_entry = {
  entryId: string,           // monotonic per ProductSSOT
  at: ISO-8601,
  triggeredBy: 'agent3_self_renewal' | 'agent10_drift_detection' | 'agent10_customer_issue' | 'clearance_step' | 'manual',
  triggerSourceId: string,   // runId / clearanceRecordId / customer-issue-id
  issue?: { id, category, severity, evidence },
  remediation?: { path: 'patch-existing-source'|'generate-from-scratch'|'recommend-only',
                  member: string, renewedUrl?: string, deploymentId?: string },
  before_after: { issuesBefore: [...], issuesAfter: [...], resolved: [...], unresolved: [...], regressions: [...] },
  humanGateDecision?: { gate: 'review'|'approval'|'testing'|'acceptance',
                        decision: 'approve'|'modify'|'skip', who, rationale, at },
  annotations: jsonb[],      // admin/operator annotations attached to this entry
  overrides: jsonb[],        // admin overrides attached to this entry
}

governance_record_entry = {
  entryId: string,
  at: ISO-8601,
  kind: '95_95_score' | 'clearance_step' | 'human_gate' | 'panel_decision' | 'self_audit_dimension_score',
  payload: jsonb,             // varies per kind
  clearanceStepNumber?: 1|2|3|4|5|6,
  clearanceStepLabel?: string,
  scoreBreakdown?: { dimension, score }[],
  acceptedBy?: { userId, role, at },
  annotations: jsonb[],
}

annotation_entry = {
  entryId: string,
  at: ISO-8601,
  attachedToBlock: 'identity' | 'build_brief' | 'architecture_snapshot' |
                   'delta_log' | 'governance_record',
  attachedToEntryId?: string,  // when annotation references a specific delta_log / governance_record entry
  authorUserId: string,
  authorRole: 'admin'|'operator',
  text: string,                 // markdown allowed
  tags?: string[],
}

override_entry = {
  entryId: string,
  at: ISO-8601,
  attachedToBlock: ...,
  attachedToEntryId?: string,
  authorUserId: string,         // admin only
  authorRole: 'admin',
  originalContentRef: string,
  replacementContent: jsonb,
  rationale: string,
}
```

### CA-10-A.3 Supabase schema

```sql
CREATE TABLE product_ssot (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                  text NOT NULL REFERENCES product_registry(id) ON DELETE CASCADE,
  environment                 text NOT NULL CHECK (environment IN ('dev','prd')),
  version                     integer NOT NULL DEFAULT 1,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  identity_block              jsonb NOT NULL,
  build_brief                 jsonb NOT NULL,
  architecture_snapshot       jsonb NOT NULL DEFAULT '{}'::jsonb,
  delta_log                   jsonb NOT NULL DEFAULT '[]'::jsonb,
  governance_record           jsonb NOT NULL DEFAULT '[]'::jsonb,
  annotations                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  overrides                   jsonb NOT NULL DEFAULT '[]'::jsonb,
  audit_hash_chain_pointer    text,
  UNIQUE (product_id, environment)
);

CREATE INDEX product_ssot_product_env ON product_ssot(product_id, environment);
CREATE INDEX product_ssot_updated     ON product_ssot(updated_at DESC);

-- RLS per §13 + §14.3
ALTER TABLE product_ssot ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_ssot_owner_read ON product_ssot FOR SELECT
  USING ( /* row's provider org matches caller's provider org */ );
CREATE POLICY product_ssot_admin_write ON product_ssot FOR ALL
  USING ( /* admin within owning provider org OR service_role */ );
CREATE POLICY product_ssot_operator_annotate ON product_ssot FOR UPDATE
  USING ( /* operator within owning provider org;
            WITH CHECK clause restricts mutation to annotations[] only */ );
```

Operator UPDATE permission is narrowed by a column-list WITH CHECK clause that allows mutating only the `annotations` jsonb array — admin can mutate everything; operator can append annotations only; client is read-only.

### CA-10-A.4 §7 Output Contract — proposed amendment

Insert into Rev-2.1 §7 (after the existing 4-item list):

```md
5. **Updated ProductSSOT row** (per CA-10-A). On every pipeline run
   that produces an output, FlowAI writes a new delta_log entry to the
   product's ProductSSOT row (one row per (productId, environment) pair
   per CA-10-A.2). The write is atomic with the rest of the output
   contract: a run that produces a renewed URL but fails to update
   ProductSSOT is considered INCOMPLETE and rolled back (per §10 Self-
   Protect snapshot + Self-Heal pattern). The ProductSSOT update is
   the canonical living-document mechanism — it accumulates history
   across runs and is fed back into the next pipeline run per
   CA-10-D's symbiotic loop.
```

### CA-10-A.5 Relation to CANONICAL_REFERENCE §16.2 DeploymentScaffold

`DeploymentScaffold` (Sprint 6 Phase 2) generates **static per-deploy** artifacts: SQL schemas, Vercel config, README, migration checklist. ProductSSOT is **dynamic across-time** living state. The two are complementary, not duplicative:

- DeploymentScaffold = single deploy snapshot.
- ProductSSOT = full deployment history + governance trail + annotations.

ProductSSOT's `architecture_snapshot.pages[]` / `.apiEndpoints[]` / `.databaseSchema[]` may be **derived** from the most recent DeploymentScaffold of the product; CA-10 does not specify the implementation but the engineering dispatch should reuse `DeploymentScaffold` shape where applicable to avoid duplication.

---

## CA-10-B — Auto-Update Triggers (§15.1 rows #3 + #10 + §15.2 + §11 amendments)

### CA-10-B.1 Agent #3 Self-Renewal — charter expansion

**Today (Rev-2.1 §15.1 + CA-9-C expansion):** consumes audit + anomaly + customer-issue topics; emits renewal-candidate + applied + delta topics.

**Proposed CA-10-B expansion:**
- **Produces:** existing + new **`3.ssot.delta.v1`** (payload: `{ productId, environment, runId, deltaEntry, at }`). Emitted after every successful renewal cycle (recommend-only emit + executor-applied emit).
- The Self-Renewal Executor (per CA-7) writes the delta entry to ProductSSOT via `service_role` after auto-deploy or human-Approve.

### CA-10-B.2 Agent #10 Monitor — charter expansion

**Today (Rev-2.1 §15.1 + CA-9-C expansion):** consumes pipeline + customer signal; emits anomaly + customer-feedback topics.

**Proposed CA-10-B expansion:**
- **Produces:** existing + new **`10.ssot.updated.v1`** (payload: `{ productId, environment, blockUpdated: 'architecture_snapshot'|'delta_log'|'governance_record', updateSummary, at }`).
- Architecture drift detection (Rev-2.1 §16.3 — diff of dev vs prd) writes a new `architecture_snapshot` to the affected environment's ProductSSOT.
- Customer-issue events from CA-9-C (`10.customer.issue.v1`) write to the delta_log if they trigger a Self-Renewal cycle, OR to a new `governance_record_entry` with `kind: 'customer_signal'` if they remain as observations without renewal.

### CA-10-B.3 Clearance Protocol — §11 amendment

Per Rev-2.1 §11, the six clearance steps each produce a `ClearanceRecord` row. CA-10-B says the Clearance UI also emits **`clearance.ssot.step.v1`** per step (payload: `{ productId, environment, clearanceRecordId, stepNumber, stepLabel, outcome, evidence, who, at }`) and writes the corresponding `governance_record_entry` to ProductSSOT.

§11 amendment text:

```md
**Cross-link with ProductSSOT (per CA-10-B):** every Clearance step
completion writes a `governance_record_entry` to the product's
ProductSSOT row (one entry per step per clearance attempt). Entries are
append-only; admins can annotate but cannot override governance
records.
```

### CA-10-B.4 Human Gates — §10.2 amendment

Per Rev-2.1 §10.2, four Human Gates exist (Review / Approval / Testing / Acceptance). CA-10-B requires that every Human Gate decision also writes a `delta_log_entry.humanGateDecision` block on the affected ProductSSOT, AND a `governance_record_entry` with `kind: 'human_gate'`.

### CA-10-B.5 New MessageBus topics

Add to MessageSchema.js (combined count after CA-9 + CA-10-B):

- `3.ssot.delta.v1` (produced by Agent #3 Self-Renewal Executor; consumed by Agent #10 for cross-referencing)
- `10.ssot.updated.v1` (produced by Agent #10; consumed by ProductSSOT writer + admin UI notifications)
- `10.ssot.annotation.v1` (produced by admin UI when an operator/admin attaches an annotation; consumed by Agent #10 for indexing)
- `clearance.ssot.step.v1` (produced by Clearance UI on each step completion; consumed by ProductSSOT writer)

CA-10-B adds **4** new topics. Running total after CA-7 + CA-8 + CA-9 + CA-10-B: **57 (post-CA-9) + 4 = 61 topic constants**.

---

## CA-10-C — Human-Editable Layer (Role gates + version history + override mechanism)

### CA-10-C.1 Role gates (per Rev-2.1 §13)

| Role | Annotations | Overrides | Architecture snapshot | Governance record | Delta log |
|---|---|---|---|---|---|
| `admin` | Read + write (full) | Read + write (full) | Read; can annotate but cannot mutate the auto-snapshot | Read; can annotate; cannot override | Read; can annotate per entry; can override per entry |
| `operator` | Read + append-only | Read-only | Read | Read | Read; can annotate per entry |
| `client` | Read-only | Read-only | Read | Read | Read |

Enforcement: Supabase RLS (admin = service-role-elevated within owning provider org; operator = standard auth within owning provider org; client = read-only RLS policy). Additionally, the `WITH CHECK` clause on `product_ssot_operator_annotate` policy restricts mutation to `annotations` only.

### CA-10-C.2 UI surface — `/product-ssot/:productId`

New page that renders the ProductSSOT in a structured view:

- **Identity block** — read-only header (productName, URL, owner, created).
- **Build brief** — collapsible; admin/operator can attach annotations inline.
- **Architecture snapshot** — collapsible per sub-section (dependencies, env config, pages, apiEndpoints, databaseSchema, readinessScores); admin/operator can annotate.
- **Delta log** — reverse-chronological table; click row → expanded view; inline annotation editor for admin/operator.
- **Governance record** — reverse-chronological table; same UX as delta log.
- **Annotations layer (sidebar)** — all annotations across blocks shown in a sidebar with filter by block + author + tag.
- **Overrides layer (admin-only)** — separate tab; admin sees the list of override entries with the original auto-generated content versus the admin replacement.

### CA-10-C.3 Version history

Every WRITE to ProductSSOT increments the row's `version` field (monotonic per (productId, environment)) and appends a `product_ssot_version` row (separate table):

```sql
CREATE TABLE product_ssot_version (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_ssot_id     uuid NOT NULL REFERENCES product_ssot(id) ON DELETE CASCADE,
  version             integer NOT NULL,
  written_at          timestamptz NOT NULL DEFAULT now(),
  written_by          jsonb NOT NULL,   -- { userId, role, kind: 'agent'|'human', agentId?, executorKey? }
  delta_summary       jsonb NOT NULL,   -- which blocks changed; brief
  prev_hash           text,             -- §14.2 tamper-evidence chain
  this_hash           text              -- sha256 of serialised row content + prev_hash
);

CREATE INDEX product_ssot_version_lookup ON product_ssot_version(product_ssot_id, version DESC);
```

Tamper-evident via the same §14.2 hash chain as GovernanceAuditLog. The Audit Trail UI at `/audit-trail` (per Rev-2.1 §14) gains a filter for "ProductSSOT versions" so any human edit + every auto-write surfaces in the canonical audit log.

### CA-10-C.4 Override mechanism (admin-only)

Override semantics:
- Admin selects any auto-generated entry (delta_log entry, governance_record entry, architecture_snapshot field).
- Admin clicks "Override" → modal opens showing the original content + an editable replacement text field + a required rationale field.
- Submission appends an `override_entry` to ProductSSOT's `overrides` array, recording the original-content-ref, the replacement, the rationale, and the admin's userId.
- The Symbiotic Feed-Back Loop (CA-10-D) **respects overrides** in subsequent pipeline runs: when FlowAI reads ProductSSOT as context input, any entry with an override applied uses the override's replacement content instead of the auto-generated content.
- Overrides themselves are append-only — a later override "undoes" a prior override by writing a new override_entry whose replacementContent restores the original (audit trail preserved).

### CA-10-C.5 New MessageBus topic

`10.ssot.annotation.v1` (already enumerated in CA-10-B.5) — produced by the UI's annotation/override submit handlers; consumed by Agent #10 for indexing + downstream consumers (e.g. a future "annotations digest" weekly email to admins).

---

## CA-10-D — Symbiotic Feed-Back Loop (§4 + §6 + §9 amendment)

### CA-10-D.1 Pre-pipeline-run read of ProductSSOT

Before every pipeline run on a product (any of the 4 input modes per Rev-2.1 §5; any of the Auto / Recommended / User-Choice Orchestra-selection modes per §8), the AutoRunner reads the product's ProductSSOT row for the target environment and threads it as context into:

- **Step 1 Research:** Agent #6 Research (DORMANT today; CA-10-D anticipates its graduation) consumes the ProductSSOT `build_brief` + `architecture_snapshot` to skip re-discovery of already-known artifacts. The crawl scope per §6 is **narrowed** to surfaces NOT covered by `architecture_snapshot.pages[]` from the last snapshot (saving Browserless minutes + cost).
- **Step 4 Quality Audit:** Agent #8 (DORMANT today) consumes prior `governance_record` 95/95 scores to surface trend lines (is the product improving or regressing?).
- **Step 6 Self-Renewal:** Agent #3 consumes prior `delta_log` entries to detect repeated-fix loops (if the same `issue.category` was resolved 3 times in 30 days, escalate per §10.2 Human Gate).
- **Step 7 GTM:** Agent #9 (DORMANT) consumes `governance_record_entry` of kind `clearance_step` to surface uncleared steps that GTM should not advance past.

### CA-10-D.2 Annotations + overrides as CEO-equivalent directives

Per the dispatch directive: **human annotations and overrides are treated as CEO-equivalent directives for that product's pipeline run.** Concretely:

- A `Score this 95/95 even though dependency X looks deprecated` admin annotation on the architecture_snapshot entry for dependency X **suppresses** the Quality Audit dimension-score deduction for that dependency in subsequent runs.
- An `Override` entry on a delta_log entry's `issue.severity` from `high` to `medium` re-routes future similar issues to the `medium` severity gate (per §12 mode routing).
- Annotations and overrides are themselves audit-logged + version-history-tracked + Panel-reviewable. A Panel consultation can be raised to challenge any admin override per Locked Rule 17.

### CA-10-D.3 Replaces re-crawl-from-scratch

For a product with a stable ProductSSOT (≥3 prior pipeline runs in last 30 days, no `architecture_drift_detected` flag set), the crawl scope is reduced to:
- New routes not in `architecture_snapshot.pages[]` (delta discovery).
- Surfaces flagged by customer issues per `delta_log.triggeredBy === 'agent10_customer_issue'`.
- Surfaces flagged by drift detection per Rev-2.1 §16.3.

This is a **cost optimisation** + **fidelity improvement**: known-good surfaces are not re-validated every cycle; new + suspect surfaces get focused attention. Full re-crawl remains available as an explicit user action (`Force full crawl` toggle in AutoRunner) for cases where ProductSSOT integrity is suspect or for periodic deep audits.

### CA-10-D.4 §4 L2/L3 Orchestration amendment

Insert into §4 L2 ("FlowAI on Itself") and L3 ("FlowAI on External Products") status footnotes:

```md
**ProductSSOT cross-link (per CA-10-D):** every L2 + L3 pipeline run
reads the target product's ProductSSOT as canonical context input; the
crawl scope per §6 is narrowed accordingly; admin annotations +
overrides are treated as CEO-equivalent directives for that run. The
ProductSSOT is updated atomically with the run output per §7
(amended Output Contract).
```

### CA-10-D.5 §9 Pipeline Steps amendment

Insert a footer note on §9:

```md
**ProductSSOT context (per CA-10-D):** at run start, the AutoRunner
loads the target ProductSSOT row and threads it into the per-step
context. Agents #6, #8, #3, #9 (when graduated from DORMANT) consume
the relevant blocks; Agent #10 produces updates to the affected
blocks. The Self-Renewal Executor (per CA-7) writes the final
`delta_log_entry` on run completion.
```

---

## CA-10-E — GDPR + PII-Scrub + Retention + Portability

### CA-10-E.1 Retention (per Rev-2.1 §14.3)

ProductSSOT follows the same retention policy as GovernanceAuditLog: **365 days hot** in Supabase + **7 years cold** snapshots. Cold snapshots written nightly to a separate Supabase project for off-system durability per §14.2.

### CA-10-E.2 PII scrub on customer signals (per §6 credential handling)

Customer-feedback events flowing into ProductSSOT via CA-9-C's `10.customer.issue.v1` MUST be PII-scrubbed before write. The `scrubCredentials()` helper (per `src/lib/renewal/inputArtifact.js`) is extended to also strip:

- Email addresses (`[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}`)
- Phone numbers (E.164 + US/Intl conventional formats)
- Credit-card patterns (Luhn-validated 13–19 digit sequences)
- Government ID patterns (SSN, NIN, NHS-number, etc.)
- Names where the customer self-identified (heuristic: surface "My name is ..." captures)

Scrub is applied on every write path that touches `delta_log_entry.issue.evidence` or `annotation_entry.text` where the source is a customer-feedback channel. Admin/operator authoring annotations is NOT scrubbed (assumed-trusted authoring context — same trust model as Rev-2.1 §13 admin/operator roles).

### CA-10-E.3 Portability — provider export tied to §11 Step 4

Rev-2.1 §11 Clearance Step 4 "Data Export" generates a GDPR-compliant export sprint per product. CA-10-E expands the Step 4 contract:

- The export now includes the **full ProductSSOT row content** (all 5 blocks + annotations + overrides + version history) as a structured JSON payload.
- A second optional format: **portable JSON manifest** that another FlowAI instance can import to bootstrap an existing-product context. The manifest format is canonicalised in `docs/specs/PRODUCT_SSOT_PORTABILITY.md` (separate engineering-spec dispatch, not in this CA).
- Provider's `client`-role end-customers can request their own data subset via the standard data-portability flow; the export filters ProductSSOT contents to entries authored by or about the requesting end-customer.

### CA-10-E.4 §14.3 retention amendment

Insert into §14.3 (after the existing retention bullet):

```md
- **ProductSSOT retention** (per CA-10-E): same 365-day hot + 7-year
  cold pattern as GovernanceAuditLog. Cold snapshots include the full
  jsonb blocks + version history + annotations + overrides. PII-scrub
  applies on every write of customer-sourced content (per CA-10-E.2).
  Provider data-portability export per §11 Step 4 includes the full
  ProductSSOT (CA-10-E.3).
```

---

## CA-10-Q — Panel Questions (5–8, standard 4-option + INSUFFICIENT_INFORMATION frame)

### CA-10-Q1 — ProductSSOT as mandatory vs optional per product

Should every product under FlowAI's management have a ProductSSOT, or should it be opt-in?

- (a) **Mandatory** — every product gets a ProductSSOT on first registration; no opt-out. Auto-created at `ProductRegistry` insertion time. (W3 recommendation.)
- (b) Opt-in per product — provider decides at registration time whether to enable.
- (c) Opt-in per pipeline run — provider can run pipelines without writing to a ProductSSOT.
- (d) Tier-based — Tier 1/Tier 2/Tier 3 products (per a future product-tiering scheme, not in scope here) get ProductSSOT mandatorily; others optional.

### CA-10-Q2 — ProductSSOT inclusion in Output Contract (§7)

Per CA-10-A.4, the Output Contract is amended to include the ProductSSOT update as item #5 — making a run that fails to update ProductSSOT considered INCOMPLETE and rolled back. Is this the right strictness?

- (a) Adopt as proposed (atomic; failure rolls back the whole run). Strongest data integrity. (W3 recommendation.)
- (b) ProductSSOT update is best-effort — a run that produces a renewed URL but fails to write ProductSSOT is still considered SUCCESS; ProductSSOT write retried async.
- (c) ProductSSOT update is OPTIONAL output (per CA-10-Q1 (b) or (c) opt-in semantics).
- (d) Different — specify in rationale.

### CA-10-Q3 — Auto-generated vs human-override conflict resolution

When an admin override conflicts with the next auto-generated entry (e.g. admin overrode an issue severity from `high` to `medium`, but Agent #10 detects the SAME issue in next run with `high` severity again), which wins?

- (a) Admin override always wins (W3 recommendation per CA-10-D.2 "annotations + overrides as CEO-equivalent directives"). Auto-gen entry created but flagged `overridden=true` referencing the existing override.
- (b) Last-write wins — auto-gen creates a fresh entry which the admin must re-override if they still want to.
- (c) Auto-gen always wins for issue.severity (which is a system-level safety signal); human override permitted only on lower-fidelity fields.
- (d) Different — specify in rationale.

### CA-10-Q4 — ProductSSOT portability (export + import)

Per CA-10-E.3, the §11 Step 4 export now includes the full ProductSSOT. Should FlowAI also support **import** of a ProductSSOT from another FlowAI instance?

- (a) Export only — no import path (simpler; one-way data portability). (W3 recommendation pending PRODUCT_SSOT_PORTABILITY.md engineering spec.)
- (b) Export + import via the portable JSON manifest (CA-10-E.3 second format); import requires admin role + same provider org boundary.
- (c) Export + import + cross-instance handshake (FlowAI A directly federates with FlowAI B; not in CA-10 scope but flagged as future work).
- (d) Export only NOW; revisit import in a follow-up CA-n once portability spec lands.

### CA-10-Q5 — Crawl-scope narrowing trigger thresholds (CA-10-D.3)

Per CA-10-D.3, crawl scope narrows for products with "≥3 prior pipeline runs in last 30 days, no `architecture_drift_detected` flag." Are these the right thresholds?

- (a) Adopt as proposed.
- (b) Tighten to ≥5 runs in 30 days (more conservative; longer stability requirement before narrowing).
- (c) Loosen to ≥1 run in 30 days (more aggressive narrowing; rely on `drift_detected` flag alone).
- (d) Different threshold — specify in rationale.

### CA-10-Q6 — Operator annotation scope (CA-10-C.1)

Per CA-10-C.1, `operator` role can append annotations but cannot override and cannot mutate the auto-snapshot. Is this the right operator scope?

- (a) Adopt as proposed.
- (b) Extend operator to also annotate the architecture_snapshot block (currently admin-only; rest of operator policy unchanged).
- (c) Restrict further — operator can read but not annotate (annotations admin-only).
- (d) Different scope — specify in rationale.

### CA-10-Q7 — Combined CA-10 disposition

Should CA-10-A + B + C + D + E be promoted as a single unit, or split?

- (a) Promote all five together (recommended — they form one coherent capability).
- (b) Promote A + B + C (entity + auto-update + human layer) NOW; defer D (symbiotic loop) + E (portability/retention) to a follow-up CA-n once the foundational layer ships.
- (c) Promote A only — establish the entity now; build B + C + D + E incrementally.
- (d) Defer all five (re-Panel after addressing dissent).

---

## Combined CA-10 Disposition Request + Co-Sequencing

### Routing

- **W6 Panel review.** Per Locked Rule 17 + P11 + §19, Panel consultation MUST run before promotion. Threshold per §18.2: ≥7/10 ENGAGED supermajority per question.
- **Co-sequencing with CA-7 / CA-8 / CA-9.** CA-10-B's writes-to-ProductSSOT from Agent #3 graduate through the Self-Renewal Executor charter introduced by CA-7. CA-10-B's customer-issue intersection with CA-9-C requires both to pass through Panel + CEO before either ships, OR a sequencing decision to land CA-9 first and have CA-10 inherit. **Recommend: all four (CA-7, CA-8, CA-9, CA-10) pass through Panel in the same cycle to avoid drift.**
- **CEO ratification.** CEO disposes per CA-10-Q1 through CA-10-Q7.

### Open coupling (intentional)

CA-10-A + CA-10-B + CA-10-C + CA-10-D + CA-10-E form one coherent capability: a living document per product, auto-maintained + human-augmentable + symbiotically fed back into the pipeline. Partial promotion is operationally clean (per CA-10-Q7 option (b)/(c)) but the system value scales superlinearly with completeness — overrides without a feed-back loop are documentation; the feed-back loop without overrides is automation without checks.

### Engineering impact summary

| Surface | Change |
|---|---|
| `supabase/migrations/00NN_product_ssot.sql` | New tables: `product_ssot`, `product_ssot_version`; RLS policies |
| `src/lib/agents/MessageSchema.js` | +4 topic constants (CA-10-B.5); running total **61** post-CA-10-B (from 57 post-CA-9) |
| `src/lib/agents/agents/Agent3SelfRenewal.js` + `Agent3SelfRenewalExecutor.js` (CA-7) | Add `3.ssot.delta.v1` emission; Executor writes delta_log entry to ProductSSOT post-Approve/auto-deploy |
| `src/lib/agents/agents/Agent10Monitor.js` (DORMANT) | Charter expansion to emit `10.ssot.updated.v1`; drift-detection writes architecture_snapshot |
| `src/pages/Clearance.jsx` + `api/clearance/run.js` | Emit `clearance.ssot.step.v1`; write governance_record_entry per step |
| `src/pages/ProductSSOT.jsx` (NEW) | UI surface per CA-10-C.2 |
| `src/components/operations/HumanGate*.jsx` | Write delta_log_entry.humanGateDecision + governance_record_entry on each gate |
| `src/lib/renewal/inputArtifact.js` `scrubCredentials()` | Extend to scrub email + phone + CC + government IDs (CA-10-E.2) |
| `api/clearance/run.js` Step 4 Data Export | Include ProductSSOT in export payload (CA-10-E.3) |
| `src/pages/AutoRunner.jsx` | Pre-run read of ProductSSOT (CA-10-D.1); thread context into step prompts |

Estimated engineering effort: ~10-14 days for the foundational entity + Agent #3/#10 wiring + UI + RLS + GDPR scrubbing. Symbiotic feed-back loop (CA-10-D) integration adds ~5 days. Total: ~15-19 days across W2 + W5x.

---

## Provenance

| Source | Used for |
|---|---|
| CEO-locked feature spec 2026-05-15 | CA-10-A / B / C / D / E scope + disposition framing |
| Rev-2.1 §7 (Output Contract) | CA-10-A §7 amendment insertion point |
| Rev-2.1 §11 (Six-Step Clearance Protocol) | CA-10-B Clearance amendment + CA-10-E.3 Step 4 export expansion |
| Rev-2.1 §13 (Auth + Role Model) | CA-10-C role-gate matrix |
| Rev-2.1 §14 (GovernanceAuditLog) + §14.2 hash chain + §14.3 retention | CA-10-C.3 version history tamper-evidence + CA-10-E retention |
| Rev-2.1 §15.1/§15.2 (Agent roster + MessageBus) | CA-10-B charter expansions + new topics |
| Rev-2.1 §16 (Deployment Infrastructure) | CA-10-A.5 DeploymentScaffold complementary relationship + CA-10-B architecture_snapshot drift trigger |
| Rev-2.1 §18 (CA-n cycle) | Routing + promotion workflow |
| Rev-2.1 §4 (Four Levels of Orchestration) + §6 (Crawl Contract) + §9 (Pipeline Steps) | CA-10-D symbiotic-loop amendments |
| CA-7 (`ce96055`) — Self-Renewal Executor | CA-10-B Agent #3 → Executor write-path inheritance |
| CA-9 (`5c06893` + `af82178` + `3d17096`) — customer feedback loop | CA-10-B customer-issue → ProductSSOT trigger intersection |
| `src/lib/renewal/inputArtifact.js` `scrubCredentials()` | CA-10-E.2 PII-scrub extension |

---

## Versioning

CA-10 is a single combined amendment with five sub-amendments (A/B/C/D/E). Continues the existing CA-1 / CA-2 / CA-3 ratified sequence (§18.4) plus in-flight CA-7 + CA-8 + CA-9 drafts. CA-4 / CA-5 / CA-6 remain deferred per their respective Panel consultations.

This draft does NOT promote unilaterally; it is the Panel-input document for the next W6 consultation cycle (recommended co-cycled with CA-7 + CA-8 + CA-9).

*End of CA-10 draft. Pending Panel review per §19 + CEO ratification per §18.*
