# Cluster D — Audit-Log Topic Schema Extension (Canonical Template, v3)

**Status:** DRAFT v3 — Panel v2 conditions applied; pending W6 re-ratification.
**Version history:** v1 (commit `cc6fb70`, 2026-05-16) → v2 (commit applied 2026-05-17 — Panel `PLURALITY_CLD-REVISE` 5/9 conditions R1–R4) → **v3 (this commit, 2026-05-17 — Panel v2 conditions D1–D3 applied per W3a Dispatch #4)**.
**Author:** W3 (v1, v2), W3a (v3).
**Anchor canonical:** Rev-2.1 §14.1 GovernanceAuditLog canonical topic catalogue (65 topics as of ENTRY 006); §14.3 GovernanceAuditLog retention + RLS; §15.2 MessageBus (61 → 65 expansion at ENTRY 006); CA-9-B charter expansion (additional topics not yet propagated to §14.1).
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` Batch 1 objection #02 + Batch 2 objections #21, #27 + Batch 3 objections #23, #28. **v2 conditions:** `docs/panel-consultations/cluster-templates-ratification-2026-05-17.md` `PLURALITY_CLD-REVISE` 5/9. **v3 conditions:** `docs/panel-consultations/cluster-templates-v2-ratification-2026-05-17.md` D1–D3.

**v3 revisions applied (per W3a Dispatch #4):**
- **D1** — Hash-chain mirroring requirement added. Every nightly cold-store snapshot MUST post a tamper-evidence digest (snapshot timestamp, row count, hash of last 10 entries) to a durable external channel (dedicated Slack webhook OR append-only log outside Supabase). Provides continuous tamper-evidence beyond the cold-store snapshot alone. §2.7 added; AC-CD-9 added.
- **D2** — Hard ceiling on topics-per-staged-ship defined: **maximum 5 new topics per agent ship commit**. Agents requiring more than 5 new topics MUST split into multiple ship commits. Bounds coordination overhead and migration burden. §2.1.0-Def updated; AC-CD-10 added.
- **D3** — Load-test artifact added to acceptance criteria. Before the full 95+ topic catalogue is active in production, a load-test artifact MUST prove: 500-TPS audit-log ingestion with all registered topics active, p99 latency ≤ 50ms, zero `UNKNOWN_TOPIC` errors. Required merge gate for the §14.1 P0 patch. §2.8 added; AC-CD-11 added.

**v2 revisions applied (per W3 Dispatch #10):**
- **R1** — staged topic additions: **P0 set** (~10 topics required for Agent #23 Cost Governor + Cluster B halt envelopes) ships in a single §14.1 patch commit ASAP; **Deferred set** (~20+ per-agent topics) ships incrementally alongside each agent's first shipping commit (not pre-declared en masse). §2.1 reorganised into §2.1.0 P0 / §2.1.0-Def Deferred subsections.
- **R2** — MessageSchema.js migration test harness **MUST exist + pass** before any topic addition lands. The harness exercises: (a) duplicate-shape rejection, (b) unknown-topic rejection, (c) dual-emit window correctness, (d) RLS allow-list enforcement. §2.3.1 added.
- **R3** — §14.3 RLS fix: replace provider-org wildcard with **productId allow-list per provider**. Topics carrying tenant data require explicit `{providerId, productId}` tuple in the allow-list, not blanket `providerId === xxx → all productIds in that provider's org`. §2.6 added.
- **R4** — explicit dual-emit window contract for renames + aliases: emitters publish both OLD + NEW for the migration window; consumers see both for the window; deprecation removal requires zero observed emissions of OLD for `windowEndOffsetDays` consecutive days. §2.4 rewritten with precise contract.

---

## §1 — Problem Statement

The 18-agent consolidated Panel identified **audit-log topic schema sprawl** as a systemic issue across multiple agent specs. Roughly 40 new topics were proposed across the 18 agent specs in Dispatch #6 that are NOT in the current §14.1 65-topic canonical catalogue.

### Verbatim Panel quotes

**Batch 1 objection #02 (Slot 1):**
> Multiple agents show topic naming conflicts between _registry.ts and spec definitions (Agent #9 §6.5, Agent #11 §10). The 65-topic MessageSchema.js lacks a validation layer to prevent runtime topic mismatches when agents ship incrementally.

**Batch 2 objection #21 (Slot 7):**
> G12-Q5's proposed 7 topics conflict with MessageSchema.js's 65-topic limit. Uncontrolled topic proliferation risks message bus congestion and violates §15.2's 'curated industry-tracker' design principle.

**Batch 2 objection #27 (Slot 8):**
> §10 G12-Q5 acknowledges a mismatch between `_registry.ts` topics and the blueprint's `12.portfolio_risk.v1` / `12.product_alert.v1`, yet none of the listed options addresses namespace collision risk or backward compatibility for consumers. Adding topics ad hoc without a migration plan could strand downstream listeners or produce duplicate alerts.

**Batch 3 objection #23 (Slot 7):**
> §G18-Q1's multiple topic options violate MessageSchema cardinality principles from §15.2. Adding three distinct topics for Agent #18 without payload consolidation risks message bus congestion and consumer agent complexity spikes, contradicting the product-agnostic rule's simplicity mandate.

**Batch 3 objection #28 (Slot 10):**
> G18-Q1, G20-Q4 and §15.2 show _registry.ts emitting only 18.plan.update.v1 / 20.impact.assessment.v1 while blueprints add extra topics, expanding the 65-topic set without any reconciliation or schema-migration mechanism in MessageBus or MessageSchema.js.

### Affected scope

Every new topic introduced in the 18 agent specs that is not in §14.1's current 65-topic catalogue. Topic-emit calls without a corresponding §14.1 registration would fail at runtime per MessageSchema validation.

### Why this blocks engineering dispatch

Without canonical §14.1 extension: `MessageSchema.js` validation rejects emit attempts on unregistered topics → 19 agents cannot ship without runtime topic-validation failures. Additionally, downstream consumers cannot subscribe to topics that don't exist in the canonical catalogue.

---

## §2 — Canonical Resolution (v2 — staged additions)

**Extend §14.1 in TWO stages per v2 R1:**

- **§14.1 P0 PATCH (ships immediately after Cluster D ratification):** the ~10 P0 topics required to unblock Agent #23 Cost Governor + Cluster B halt envelopes + Cluster B v2 R1/R4 envelopes + Cluster E + Cluster F cross-cluster topics. Single SSOT amendment landed as one commit + ENTRY 008.
- **§14.1 DEFERRED ADDITIONS (incremental):** the ~20+ per-agent topics land **alongside each agent's first shipping commit** (not pre-declared en masse). Each per-agent ship dispatch issues its own micro-amendment to §14.1 adding only its agent's emit topics. This avoids the "30 topics declared before any agent is built" anti-pattern Panel objection #21 raised.

Both stages share the §2.2 naming convention + §2.3 schema-validation contract + §2.3.1 migration-harness requirement.

### §2.1 — New topic catalogue (staged: P0 vs Deferred)

#### §2.1.0 — P0 SET (ships in §14.1 patch commit immediately after Cluster D v2 ratification)

These topics are required by canonical templates A, B, E, F + Agent #23 Cost Governor. They are NOT per-agent emit topics; they are cross-cutting infrastructure that EVERY agent uses.

| # | Topic | Emitted by | Consumed by | Cluster source |
|---:|---|---|---|---|
| P0-1 | `agent.cost.signal.v1` | Every cost-incurring agent | Agent #23 Cost Governor + admin cost dashboard | A |
| P0-2 | `agent.data_quality.insufficient.v1` | Every agent halting on insufficient input | AutoRunner step-block + admin notification | B |
| P0-3 | `agent.data_quality.cascade.v1` (v2 R4) | Every downstream agent applying upstream-halt tolerance | Observability + admin | B v2 R4 |
| P0-4 | `agent.data_quality.override_clamped.v1` (v2 R2) | Validation layer on `ProductRegistry.minimumDataQuality` write | Admin notification | B v2 R2 |
| P0-5 | `agent.model.fallback.v1` | Every agent that experienced LLM fallback | Cost dashboard + observability | F |
| P0-6 | `agent.ceiling.violation.v1` | Every Executor / dual-authority primary that rejected on ceiling | Admin dashboard + GovernanceAuditLog | E |
| P0-7 | `23.cost_anomaly.v1` | Agent #23 Cost Governor | Admin dashboard, #3 Self-Renewal | Agent #23 spec |
| P0-8 | `23.budget_halt.v1` (Phase 2 Executor) | Agent #23 Executor | AutoRunner halt path | Agent #23 Phase 2 |
| P0-9 | `runner.budget.exceeded.v1` (per Orchestra §8.4) | Agent #23 Executor | AutoRunner | Orchestra §8.4 |
| P0-10 | `23.cost_digest.v1` (monthly) | Agent #23 Cost Governor | Admin dashboard | Agent #23 spec |

**P0 commit:** `CANONICAL_REFERENCE.md` §14.1 patch + `CANONICAL_HISTORY.md` ENTRY 008. Single commit, ships pre-Agent-#23-build.

#### §2.1.0-Def — DEFERRED SET (ships incrementally with each agent's first ship commit)

Per-agent emit topics ship in the same commit as the agent's runtime implementation. This couples spec declaration to working code — preventing the "topic declared but no emitter exists" gap Panel objection #21 raised.

The deferred topics list below is reference-only; each agent's actual deferred-set commit lands per-agent at engineering dispatch time. The list is the same per-agent topic catalogue documented in v1 §2.1.2 (rows 5–61) but each is gated on the agent's first ship commit landing.

**v3 D2 — Hard ceiling: maximum 5 new topics per agent ship commit.**

An agent ship commit (the commit that lands the agent's first runtime implementation + its §14.1 micro-amendment) MUST introduce **at most 5 new topics** in its §14.1 patch. Agents whose Cluster D inventory (per §2.1.2) requires more than 5 new topics MUST split their ship into multiple commits, each adding ≤5 new topics. Rationale: bounds the per-commit coordination overhead, keeps migration-harness runs reviewable, and prevents a single misnamed or mis-RLS-configured ship from invalidating a large topic batch.

**Enforcement:**
- The CI gate that protects §14.1 modifications (per AC-CD-3) additionally counts net-new topic rows added in the same patch. A patch adding ≥6 new topics is rejected with `TOPIC_CEILING_EXCEEDED { ceiling: 5, attempted: <N>, suggestion: 'split into N/5 (rounded up) ship commits, each ≤5 topics' }`.
- "New topics" is defined as topics not present in the §14.1 catalogue prior to this patch. Renames (per §2.4 dual-emit migration) count as 1 net-new topic per rename (the NEW name); the OLD name continues to exist during the window and does not count as net-new.
- The ceiling applies to the AGENT'S ship commit, not the Cluster D P0 patch. The P0 patch (§2.5 — 10 topics) is exempted because it is a coordinated infrastructure ship covering cross-cluster envelopes (A/B/E/F), not a single-agent's deferred-set ship.
- Where an agent legitimately needs >5 topics (e.g. Agent #11 SI carries 6 across CA-9-B expansion), the operator/W3 splits the ship across two commits: commit 1 lands the agent skeleton + 5 topics; commit 2 lands the remaining ≤5 topics + the consuming code paths.

**Why 5 and not a larger number:** the migration harness (per §2.3.1) reviewer load grows roughly linearly with new topic count; 5 has been chosen so a single PR-review session can validate naming + payload shape + RLS allow-list + dual-emit configuration for every topic in the patch. Larger batches push toward shallow review; smaller batches frustrate agent-by-agent ship cadence. The ceiling is per-commit, not per-week — an agent that legitimately ships 10 topics within a week does so across two commits, not one.

#### §2.1.1 — Cross-cluster topics (from Clusters A, B, C) — moved to P0 set above

| # | Topic | Emitted by | Consumed by | Payload reference | Cluster source |
|---:|---|---|---|---|---|
| 1 | `agent.cost.signal.v1` | Every cost-incurring agent | Agent #23 Cost Governor + admin cost dashboard | `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` §2.2 | A |
| 2 | `agent.data_quality.insufficient.v1` | Every agent halting on insufficient input | AutoRunner step-block mechanism + admin notification | `CLUSTER_B_DATA_QUALITY_GATE.md` §2.2 | B |
| 3 | `agent.model.fallback.v1` | Every agent that experienced LLM fallback | Cost dashboard + observability | `CLUSTER_F_MODEL_BUDGET_FALLBACK.md` §2.4 | F |
| 4 | `agent.ceiling.violation.v1` | Every Executor that rejected a request on ceiling | Admin dashboard + GovernanceAuditLog | `CLUSTER_E_AUTHORITY_CEILING_INTEGRATION.md` §2.5 | E |

#### §2.1.2 — Per-agent new topics (from 18 agent specs)

| # | Topic | Emitting agent | Consuming agents |
|---:|---|---|---|
| 5  | `6.research.brief.v1` | #6 Research | #2 Code Builder, #7 Design, #8 Quality Audit, #11 SI |
| 6  | `7.design.spec.v1` (already in §14.1; reconcile shape) | #7 Design | #2 Code Builder, #8 Quality Audit, #15 Benchmarking |
| 7  | `7.design.generated.v1` (Phase 2 Executor) | #7 Design Executor | ProductSSOT writer |
| 8  | `8.audit.requested.v1` (already in §14.1) | #8 Quality Audit | observability |
| 9  | `8.audit.completed.v1` (already in §14.1; reconcile shape) | #8 Quality Audit | #3 Self-Renewal, #9 GTM, #17 Product Evolution |
| 10 | `8.audit.block.v1` (NEW twin emission) | #8 Quality Audit | AutoRunner step-5 gate |
| 11 | `9.gtm.assessment.v1` (rename of `9.gtm.asset.v1` per G9-Q3 disposition (a)) | #9 GTM | #10 Monitor, Clearance Step 5 |
| 12 | `9.gtm.demo_assets.v1` (Phase 2) | #9 GTM | Demo Builder integration |
| 13 | `10.customer.feedback.v1` (already in §14.1) | #10 Monitor | observability |
| 14 | `10.customer.issue.v1` (already in §14.1) | #10 Monitor | #3 Self-Renewal |
| 15 | `10.ssot.updated.v1` (already in §14.1 per CA-10-B) | #10 Monitor | #19 TechEvolution, #6 Research |
| 16 | `11.platform.discovery.v1` (CA-9-B expansion; not yet in §14.1) | #11 SI | #26 Orchestra Research |
| 17 | `11.carveout_flag.v1` (CA-9-B expansion; not yet in §14.1) | #11 SI | #26, #14 Public Policy |
| 18 | `11.marketplace_intelligence_report.v1` (charter expansion) | #11 SI | Admin dashboard |
| 19 | `12.product_alert.v1` (per-product surfacing) | #12 Portfolio Risk | Operator UI |
| 20 | `12.portfolio_risk.v1` (alias of `portfolio.fire.v1`; reconcile per G12-Q5) | #12 Portfolio Risk | #18 BP, #17 PE |
| 21 | `13.bot_policy_update.v1` (Phase 2) | #13 Self-Protection Executor | Cloudflare adapter |
| 22 | `13.watermark_rotation.v1` (Phase 2) | #13 Self-Protection Executor | per-product deploy |
| 23 | `14.policy_assessment.v1` (charter expansion) | #14 Public Policy | #26 Orchestra Research, admin |
| 24 | `14.carveout_flag.v1` (CA-9-B expansion) | #14 Public Policy | #26, #11 SI |
| 25 | `15.benchmark.head_to_head.v1` (CA-9-B; already in §14.1 partially) | #15 Benchmarking | #26, #17 Product Evolution |
| 26 | `15.benchmark.cycle_completed.v1` | #15 Benchmarking | Admin dashboard |
| 27 | `16.productivity.report.v1` (already in §14.1) | #16 Productivity / HR | Admin dashboard |
| 28 | `16.workflow_bottleneck.v1` (NEW) | #16 Productivity / HR | Admin dashboard |
| 29 | `17.evolution.proposal.v1` (already in §14.1) | #17 Product Evolution | #3 Self-Renewal |
| 30 | `17.orchestra.deprecation_proposal.v1` (CA-9-B) | #17 Product Evolution | #26 Orchestra Research |
| 31 | `17.self_renewal_alert.v1` (Locked Rule 16 monthly) | #17 Product Evolution | Admin dashboard, per-product owner |
| 32 | `18.business_plan.v1` (NEW; supersedes `18.plan.update.v1`) | #18 Business Planning | CEO dashboard |
| 33 | `18.strategic_recommendation.v1` (NEW) | #18 Business Planning | CEO dashboard |
| 34 | `19.cve_alert.v1` (NEW) | #19 Tech Evolution | #3 Self-Renewal, admin |
| 35 | `19.tech_upgrade_proposal.v1` (NEW) | #19 Tech Evolution | #17 Product Evolution |
| 36 | `20.sustainability_report.v1` (NEW; supersedes `20.impact.assessment.v1`) | #20 Environmental | #18 BP, #14 Public Policy |
| 37 | `20.green_recommendation.v1` (NEW) | #20 Environmental | Operator UI |
| 38 | `23.cost_anomaly.v1` (NEW; Cost Governor) | #23 | Admin dashboard, #3 SR |
| 39 | `23.budget_halt.v1` (Phase 2 Executor) | #23 Executor | AutoRunner halt path |
| 40 | `23.cost_digest.v1` (monthly) | #23 | Admin dashboard |
| 41 | `runner.budget.exceeded.v1` (Phase 2; per Orchestra §8.4) | #23 Executor | AutoRunner |
| 42 | `26.orchestra.candidate.v1` (already in §14.1 per ENTRY 005) | #26 OR | observability |
| 43 | `26.orchestra.admitted.v1` (already in §14.1 per ENTRY 005) | #26 OR | All other agents |
| 44 | `26.orchestra.candidate_rejected.v1` (per ENTRY 005) | #26 OR | observability |
| 45 | `26.orchestra.candidate_panel_gate.v1` (per ENTRY 005) | #26 OR | Panel + admin |
| 46 | `26.orchestra.deprecated.v1` (per ENTRY 005) | #26 OR | #3 SR, #12 PR |
| 47 | `26.orchestra.lifecycle_state_changed.v1` (per ENTRY 005) | #26 OR | observability |
| 48 | `26.orchestra.candidate_reactivated.v1` (per ENTRY 005) | #26 OR | observability |
| 49 | `customer.feedback.raw.v1` (CA-9-C; already in §14.1) | `/api/customer/feedback` | #10 Monitor |
| 50 | `customer.review.scraped.v1` (CA-9-C) | #10 Monitor own dispatch | observability |
| 51 | `customer.support.ticket.v1` (CA-9-C) | webhook receivers | #10 Monitor |
| 52 | `community.signal.v1` (curated webhook) | external webhook | #11 SI, #26 OR |
| 53 | `vendor.changelog.poll.v1` (self-dispatched) | #11 SI, #26 OR | observability |
| 54 | `executor_registered.v1` (already in §14.1 per ENTRY 004) | EXECUTOR_REGISTRY init | observability |
| 55 | `agent.execution.reject_executor_via_hub.v1` (per ENTRY 004) | OrchestratorHub | observability |
| 56 | `21.crawl.completed.v1` (already in §14.1 per ENTRY 006) | #21 ACE | #6, #8, #9, #10 |
| 57 | `21.issues.detected.v1` (per ENTRY 006) | #21 ACE | #8 QA |
| 58 | `21.gtm.readiness.v1` (per ENTRY 006) | #21 ACE | #8, #9 |
| 59 | `21.credentialed.crawl.started.v1` (Phase 3 ACE Executor) | #21 Executor | observability |
| 60 | `21.credentialed.crawl.completed.v1` (Phase 3) | #21 Executor | #6, #8 |
| 61 | `21.credentialed.crawl.failed.v1` (Phase 3) | #21 Executor | admin, AutoRunner |

**Net new topics not in current §14.1 65-topic catalogue:** ~30 (precise count after `MessageSchema.js` audit at engineering dispatch).

### §2.2 — Topic-naming conventions (canonical, mandatory)

To prevent ad-hoc proliferation per Batch 2 #21 + Batch 3 #23 objections, every new topic MUST follow:

1. **Prefix:** `<agentId>.<area>.<action>.v<schemaVersion>` for per-agent topics; `<scope>.<action>.v<schemaVersion>` for cross-cutting (e.g. `agent.cost.signal.v1`, `customer.feedback.raw.v1`).
2. **Version suffix:** every topic ends in `.v<N>` (single integer); breaking changes bump N + register both old + new for transition.
3. **Naming pattern:** snake_case_with_dots; never camelCase or kebab-case in topic names.
4. **Reserved prefixes:** `agent.*`, `customer.*`, `community.*`, `vendor.*`, `executor*.*`, `runner.*`, `portfolio.*`, `system.*` — reserved for cross-cutting use; per-agent topics use the numeric `<agentId>.*` prefix.

### §2.3 — Schema validation extension

`MessageSchema.js` (or equivalent canonical validator) MUST:
1. Maintain the union of §14.1-registered topic names + per-topic payload schema.
2. Reject emit attempts on unregistered topics at runtime with `UNKNOWN_TOPIC[<topicName>]`.
3. Reject emit attempts with payload that fails schema validation per topic with `PAYLOAD_SCHEMA_FAILURE[<topicName>]`.
4. Reject duplicate-topic registrations (same name, different shape) at validator init.

### §2.3.1 — MessageSchema.js migration test harness (v2 R2)

**Before any topic addition lands in §14.1 (P0 OR Deferred), a migration test harness MUST exist + pass.** The harness lives at `src/lib/messages/__tests__/MessageSchemaMigration.test.js` (or equivalent) and exercises four canonical invariants:

1. **Duplicate-shape rejection:** registering the same topic name with two different payload shapes at validator init throws `DUPLICATE_TOPIC_SHAPE[<topicName>]`. Test asserts a contrived duplicate triggers the error.
2. **Unknown-topic rejection:** emit attempt with a topic name not in the registry throws `UNKNOWN_TOPIC[<topicName>]` and does NOT write to ColdStore / MessageBus. Test asserts both behaviors via spy.
3. **Dual-emit window correctness:** during a rename's migration window (per §2.4 v2 R4), BOTH old + new topics validate; emitter publishing OLD-only OR NEW-only does not break consumers. Test asserts subscriber receives both shapes during window + only NEW after window closes.
4. **RLS allow-list enforcement:** topic carrying tenant data + emit context outside the topic's `{providerId, productId}` allow-list throws `RLS_VIOLATION[<topicName>, <providerId>, <productId>]`. Test asserts both directions (allowed emit succeeds, disallowed emit throws).

**This harness is a HARD PRECONDITION for any topic add.** PR-merge CI gate rejects §14.1 modifications that don't have a corresponding green run of `MessageSchemaMigration.test.js`. Operator override is admin-only and audit-logged.

### §2.4 — Dual-emit migration contract (v2 R4 — precise window semantics)

For renames + aliases (e.g. `9.gtm.asset.v1` → `9.gtm.assessment.v1`, `18.plan.update.v1` → `18.business_plan.v1`, `20.impact.assessment.v1` → `20.sustainability_report.v1`):

**Phase 1 (Window open — duration `windowDurationDays`, default 30 days):**
- Both OLD + NEW topics registered in §14.1; both pass schema validation.
- **Emitters publish to BOTH OLD + NEW simultaneously** for the full window (the v1 spec said NEW-only; v2 R4 changes to dual-emit so consumers reading legacy code paths don't lose events).
- Consumers subscribe to BOTH OLD + NEW; dedup on `runId + invocationId + topicName` (same logical event published under both topic names).
- ColdStore retains both emissions (audit trail of migration).

**Phase 2 (Window closes — automatic transition when criteria met):**
- All of the following MUST be true for the closure:
  - `windowEndOffsetDays`: minimum days since Phase 1 started (default 30; configurable per-migration).
  - `consecutiveZeroOldEmissionDays`: at least 7 consecutive days with ZERO emissions of OLD topic detected via `MessageSchema.js` audit hook.
  - Admin manual ratification (admin-only UI button confirming consumer migration is complete).
- On closure: emitters publish to NEW only; consumers may unsubscribe OLD; OLD topic deregistered from §14.1 (next CANONICAL_HISTORY entry records).

**Phase 3 (OLD topic deletion — admin-initiated, audit-logged):**
- After 90 days from Phase 2 closure with zero stragglers: OLD topic permanently deleted from registry.
- Any subsequent emit attempt with OLD name throws `UNKNOWN_TOPIC[<old-name>]`.
- ColdStore archival retains historical OLD emissions per §14.3 retention.

**No emitter is left "stranded" mid-migration; no consumer misses events.** The dual-emit window (v2 R4 change from NEW-only) is the migration safety net.

### §2.5 — §14.1 patch commit (v2 — staged)

After Cluster D v2 ratification, W3 issues:
- **P0 patch (immediate):** `docs/CANONICAL_REFERENCE.md` §14.1 update adding the 10 P0 topics from §2.1.0 + `docs/CANONICAL_HISTORY.md` ENTRY 008 recording the P0 extension. Single commit; one push.
- **Deferred patches (per-agent):** each agent's first ship commit additionally amends §14.1 with that agent's emit topics (per-agent micro-amendment); no batched pre-declaration.

### §2.6 — §14.3 RLS — productId allow-list per provider (v2 R3)

**v1 weakness:** §14.3 v1 RLS used `providerId === xxx → all topics carrying providerId tenant data accessible`. This allowed cross-product read within a provider's org (e.g. provider Acme reading product A's `agent.cost.signal.v1` from their dashboard could also see product B's signal if both are in Acme's org).

**v2 fix:** topic-level allow-list per `{providerId, productId}` tuple. The §14.1 catalogue entry for every tenant-data-carrying topic declares:

```json
{
  "topic": "agent.cost.signal.v1",
  "rls": {
    "allowList": [
      // populated per-product by admin; not a wildcard
      { "providerId": "acme", "productId": "tenant_acme_001" },
      { "providerId": "acme", "productId": "tenant_acme_002" },
      // no automatic inclusion of other tenant_acme_* productIds
    ],
    "wildcardAllowed": false   // per v2 R3 — wildcard explicitly forbidden
  }
}
```

**RLS enforcement at MessageBus + ColdStore boundary:**
1. Emit attempt: `MessageSchema.js` checks that `payload.productId ∈ allowList` for the calling context's `providerId`. Mismatch → throw `RLS_VIOLATION[<topicName>, <providerId>, <productId>]`.
2. Read attempt: ColdStore RLS policy reads `allowList` from topic registry; only allows reads where calling `(providerId, productId)` tuple is in the allow-list.

**Admin workflow:** when a new product is provisioned, admin explicitly adds the `{providerId, productId}` tuple to the topic's allow-list (per `/products/<productId>` UI). No automatic promotion of new products into existing providers' allow-lists.

**Topics that DO NOT carry tenant data** (e.g. `system.startup.v1`, `executor_registered.v1`): `rls: { allowList: '*', wildcardAllowed: true }` is acceptable; documented per-topic in §14.1.

Per CA-12 v3 §A.2.4 + Cluster E §2.6 compatibility: `authorityCeilings` per-product also keys on `{productId}` — the same canonical productId identifier RLS uses.

### §2.7 — Hash-chain mirroring (v3 D1)

The §14 GovernanceAuditLog hash-chain is already canonically maintained in Supabase (per Rev-2.1 §14 + §14.2). v3 D1 adds a **continuous external tamper-evidence mirror** beyond the cold-store snapshot alone: every nightly cold-store snapshot MUST also post a tamper-evidence digest to a durable external channel.

**Mirror requirement (MUST):**

Every nightly cold-store snapshot job (the job that writes the per-night cold-store archive of the rolling audit log) MUST, AFTER successfully completing the cold-store write, post a tamper-evidence digest to BOTH of the following targets:

1. **Dedicated Slack webhook** — `flowai/<env>/AUDIT_HASH_MIRROR_SLACK_WEBHOOK` Doppler key, pointing at a Slack channel restricted to the security audit team. The webhook receives a JSON payload (see digest shape below); Slack's append-only message log provides off-Supabase tamper evidence.
2. **Append-only external log** — either an S3 bucket with object-lock + retention configured to "compliance mode" + write-once retention (canonical option), OR an equivalent append-only log that exists outside the Supabase tenant. Bucket name + path stored in `flowai/<env>/AUDIT_HASH_MIRROR_S3_BUCKET` + `flowai/<env>/AUDIT_HASH_MIRROR_S3_PREFIX` Doppler keys.

Both targets receive the same digest; the dual-target mirror means a compromise of either Slack or S3 alone cannot silently erase tamper evidence.

**Digest shape:**

```json
{
  "kind": "flowai.audit.hash_mirror.v1",
  "snapshotTimestamp": "<ISO8601>",
  "snapshotWindowStart": "<ISO8601>",
  "snapshotWindowEnd": "<ISO8601>",
  "rowCount": <integer — total rows in the snapshot>,
  "lastTenHashes": [
    // SHA-256 hex digests of the LAST 10 hash-chain entries in this snapshot,
    // in chronological order (oldest first → newest last)
    "<64-char hex>",
    "<64-char hex>",
    ...
  ],
  "rootHash": "<64-char hex — SHA-256 of the concatenated lastTenHashes>",
  "coldStoreLocation": {
    "bucket": "<canonical-cold-store-bucket>",
    "key": "<path/to/snapshot-yyyy-mm-dd.jsonl.gz>"
  },
  "snapshotJobRunId": "<UUID v4>",
  "schemaVersion": "v1"
}
```

The `lastTenHashes` array is the load-bearing tamper-evidence — any later attempt to backdate / mutate / delete any of the last 10 entries of the snapshot's hash-chain will produce a digest mismatch when re-validated against the externally-stored copies in Slack + S3. `rootHash` is included for fast diff detection without re-hashing the 10 entries.

**Operational behaviour:**
- The mirror posts MUST succeed before the snapshot job is reported as `completed`. A snapshot whose cold-store write succeeded but mirror posts failed is reported as `mirror_failed` and re-tried on the next nightly run. Persistent failures (≥3 consecutive nights) page the security team.
- The digest is post-only — there is no canonical read API for the mirrored digests; they exist for forensic re-validation when tamper is suspected.
- Replay-attack defence: each digest carries a `snapshotJobRunId` (UUID v4) — duplicate digests with the same `snapshotJobRunId` are treated as a replay attempt and flagged in the security channel.
- Storage retention: Slack channel retention is unlimited (Slack Enterprise Grid retention policy); S3 object-lock retention is set to **7 years** to match GovernanceAuditLog retention per §14.3.

This mechanism is orthogonal to (and additive on top of) the existing in-Supabase hash-chain. The hash-chain inside Supabase remains the canonical audit ordering; the mirror is the external tamper-evidence stream.

### §2.8 — Load-test artifact required before §14.1 P0 patch merges (v3 D3)

Before the §14.1 P0 patch (per §2.5) merges to `main`, an automated load-test MUST run and produce a passing artifact. The artifact is a required merge gate for any commit that ships the P0 10-topic set, AND for any subsequent micro-amendment that pushes the catalogue beyond ~70 topics.

**Load-test requirements (all 3 MUST pass):**

1. **Sustained 500-TPS audit-log ingestion.** A load-generation harness writes 500 audit-log entries per second for ≥10 consecutive minutes, distributed across all registered topics (each topic receives at least one emission during the run). Ingestion includes the full canonical path: `MessageBus.emit()` → schema validation → RLS check → Supabase write → hash-chain append.
2. **p99 ingestion latency ≤ 50 ms.** The 99th-percentile end-to-end latency from `emit()` call site to "row persisted in `governance_audit_log` table with hash-chain entry committed" MUST be ≤ 50 ms across the 10-minute window. Higher percentiles (p99.9, max) are recorded but not gated; only p99 is the hard ceiling.
3. **Zero `UNKNOWN_TOPIC` errors during the load run.** All emit attempts must reference topics registered in the catalogue under test. The harness pre-loads the full registered topic set; any `UNKNOWN_TOPIC` error during the run indicates a registration-vs-runtime drift and fails the load test.

**Load-test artifact format:**

```json
{
  "kind": "flowai.audit.load_test.v1",
  "artifactRunId": "<UUID v4>",
  "ranAt": "<ISO8601>",
  "durationSeconds": 600,
  "topicCatalogueSnapshot": {
    "totalTopics": <integer>,
    "topicNames": ["<topic1>", "<topic2>", ...]
  },
  "results": {
    "totalEmissions": <integer>,
    "achievedTps": <number — emissions ÷ durationSeconds>,
    "p50LatencyMs": <number>,
    "p95LatencyMs": <number>,
    "p99LatencyMs": <number — MUST be ≤ 50>,
    "p999LatencyMs": <number>,
    "maxLatencyMs": <number>,
    "unknownTopicErrors": <integer — MUST be 0>,
    "rlsViolationErrors": <integer>,
    "payloadSchemaErrors": <integer>
  },
  "passed": <boolean — true iff achievedTps >= 500 AND p99LatencyMs <= 50 AND unknownTopicErrors == 0>,
  "schemaVersion": "v1"
}
```

The artifact is committed to `artifacts/load-tests/cluster-d-p0-patch/<artifactRunId>.json` in the FlowAI repo and referenced from the P0-patch PR description. CI gate rejects the P0-patch merge if no artifact file exists OR `passed` is `false`.

**Re-run trigger:** the load test is re-run before merging any subsequent §14.1 amendment that pushes the catalogue beyond the 70-topic mark (current 65 + 10 P0 - any deprecations). At each re-run threshold, a fresh `flowai.audit.load_test.v1` artifact is produced and gated on the same three thresholds. Re-runs that fail block the amendment merge until the underlying performance regression is fixed.

This gate intentionally precedes any per-agent deferred-set ship: agents whose deferred topics would push the catalogue beyond 70 cannot ship until the load-test re-run has been produced and is `passed: true`.

---

## §3 — Agent Spec Integration Instructions

### §3.1 — Block to paste into §4 Output Contract of each affected agent spec

````markdown
### §4.X — Topic-schema compliance (canonical per Cluster D)

All topics this agent emits are registered in §14.1 canonical catalogue
per Cluster D extension. Topic names follow Cluster D §2.2 naming conventions:
`<agentId>.<area>.<action>.v<schemaVersion>` for per-agent topics;
`<scope>.<action>.v<schemaVersion>` for cross-cutting topics.

This agent emits:
| Topic | Payload schema | Consumer agents |
|---|---|---|
| `<topic-1>` | §4.2 | <list> |
| `<topic-2>` | §4.3 | <list> |
| `<cross-cutting-cluster-A/B/C/E/F topic>` | per cluster template | per cluster |

Schema validation (`MessageSchema.js`) enforces topic registration +
payload shape per Cluster D §2.3. Emit attempts on unregistered topics
fail with `UNKNOWN_TOPIC[<topicName>]`.

For any topic rename, migration follows Cluster D §2.4 (parallel
register + emit-NEW-only + 30-day deprecation window).
````

### §3.2 — Topic-rename reconciliations applied per agent spec

Specs with topic-rename per G9-Q3 / G18-Q1 / G20-Q4 / G11-Q4 / G12-Q5 / G16-Q5 / G17 / G15 must update:

- Agent #9: rename `9.gtm.asset.v1` → `9.gtm.assessment.v1`; reserve `9.gtm.asset.v1` for Phase 2 demo assets distinct envelope.
- Agent #11: add 5 new topics per CA-9-B expansion (`11.platform.discovery.v1`, `11.carveout_flag.v1`, `11.marketplace_intelligence_report.v1`); keep existing 3 (`11.brief.weekly.v1`, `11.alert.material.v1`, `11.trajectory.report.v1`).
- Agent #12: keep `portfolio.fire.v1` canonical; add `12.product_alert.v1` for per-product surfacing.
- Agent #15: add `15.benchmark.head_to_head.v1` + `15.benchmark.cycle_completed.v1` (CA-9-B).
- Agent #16: add `16.workflow_bottleneck.v1`.
- Agent #17: add `17.orchestra.deprecation_proposal.v1` + `17.self_renewal_alert.v1`.
- Agent #18: rename `18.plan.update.v1` → `18.business_plan.v1`; add `18.strategic_recommendation.v1`.
- Agent #20: rename `20.impact.assessment.v1` → `20.sustainability_report.v1`; add `20.green_recommendation.v1`.
- Agent #23: add 4 topics (cost anomaly, digest, halt, runner exceeded).

---

## §4 — Acceptance Criteria (v3)

1. **AC-CD-1 (v2 R1 — P0 patch committed first):** `docs/CANONICAL_REFERENCE.md` §14.1 contains the 10 P0 topics from §2.1.0; `docs/CANONICAL_HISTORY.md` ENTRY 008 records the P0 extension. Deferred per-agent topics NOT pre-declared.

2. **AC-CD-2 (Naming convention compliance):** Every new topic name matches Cluster D §2.2 regex (`^(\d+|agent|customer|community|vendor|executor|runner|portfolio|system)\.[a-z_]+(\.[a-z_]+)*\.v\d+$`). Spec-level grep verifies.

3. **AC-CD-3 (v2 R2 — Migration harness gates topic adds):** `src/lib/messages/__tests__/MessageSchemaMigration.test.js` exists, exercises all 4 invariants per §2.3.1, AND passes green in CI BEFORE any §14.1 modification PR can merge. CI gate is mandatory; admin override audit-logged.

4. **AC-CD-4 (Duplicate registration prevention):** `MessageSchema.js` init throws on duplicate-shape topic registrations. Harness invariant #1.

5. **AC-CD-5 (v2 R4 — Dual-emit window correctness):** For each rename, both OLD + NEW topics validated AND emitted simultaneously for `windowDurationDays` (default 30). Closure requires: ≥30 days since window start AND ≥7 consecutive days of zero OLD emissions AND admin manual ratification. Harness invariant #3.

6. **AC-CD-6 (No topic-emit code paths reference unregistered topics):** Grep across agent code paths confirms every emit call site references a §14.1-registered topic name. CI guard.

7. **AC-CD-7 (v2 R3 — RLS productId allow-list enforced):** Tenant-data-carrying topics declare per-`{providerId, productId}` allow-list with `wildcardAllowed: false` per §2.6; emit OR read attempts outside the allow-list throw `RLS_VIOLATION[<topicName>, <providerId>, <productId>]`. Harness invariant #4. Cross-product read attempt within same provider's org (without explicit allow-list entry) MUST be rejected.

8. **AC-CD-8 (v2 R4 — Phase 3 OLD topic deletion):** After 90 days from Phase 2 closure + zero stragglers, OLD topic is removable from registry via admin-initiated + audit-logged deletion. Subsequent emit attempts with OLD name throw `UNKNOWN_TOPIC`.

9. **AC-CD-9 (v3 D1 — Hash-chain mirroring):** Every nightly cold-store snapshot job posts a `flowai.audit.hash_mirror.v1` digest (per §2.7) to BOTH the dedicated Slack webhook (`AUDIT_HASH_MIRROR_SLACK_WEBHOOK`) AND the append-only S3 object-lock bucket (`AUDIT_HASH_MIRROR_S3_BUCKET`/`_S3_PREFIX`). Digest includes `snapshotTimestamp`, `rowCount`, `lastTenHashes` (10 SHA-256 hex digests in chronological order), `rootHash`, `coldStoreLocation`, and `snapshotJobRunId`. Snapshot job is reported `completed` only when BOTH mirror posts succeed; `mirror_failed` triggers retry on next nightly run; ≥3 consecutive nights of mirror failure pages the security team.

10. **AC-CD-10 (v3 D2 — Per-ship topic ceiling):** Any §14.1 patch commit that introduces ≥6 net-new topics is rejected by the CI gate with `TOPIC_CEILING_EXCEEDED { ceiling: 5, attempted: <N>, suggestion: 'split into N/5 (rounded up) ship commits, each ≤5 topics' }`. The P0 patch from §2.5 is exempted from this ceiling (it ships ~10 cross-cluster infrastructure topics as a single coordinated commit). Renames during the dual-emit window count as 1 net-new topic per rename (the NEW name only).

11. **AC-CD-11 (v3 D3 — Load-test artifact gate):** The §14.1 P0 patch PR cannot merge unless `artifacts/load-tests/cluster-d-p0-patch/<artifactRunId>.json` exists, is referenced in the PR description, and contains `passed: true` per §2.8. Pass criteria: achieved TPS ≥ 500 across ≥10 consecutive minutes, p99 end-to-end ingestion latency ≤ 50ms, AND zero `UNKNOWN_TOPIC` errors during the run. The same artifact gate re-runs before any subsequent §14.1 amendment that would push the registered-topic count beyond 70.

---

## §5 — Affected Agents

Every agent that emits ANY MessageBus topic is affected by Cluster D — that is all 18 dormant agents + the 5 SHIPPED-GREEN + the EXECUTOR_REGISTRY siblings.

| Agent | Topics affected | Revision required |
|---:|---|---|
| #6 Research | 1 (brief) | minor — §4 block |
| #7 Design | 2 (spec, generated) | minor |
| #8 Quality Audit | 3 (requested, completed, block) | minor |
| #9 Go-to-Market | 2 (assessment, demo_assets) + rename | YES + rename per §3.2 |
| #10 Monitor | 5 (anomaly, customer.feedback, customer.issue, ssot.updated, metric/health) | minor |
| #11 Strategic Intelligence | 6 (3 original + 3 new) | YES + add per §3.2 |
| #12 Portfolio Risk | 6 (5 fires + product_alert + portfolio_risk alias) | YES + reconcile per §3.2 |
| #13 Self-Protection | 5 (threat, signature, dmca, bot_policy, watermark) | minor |
| #14 Public Policy | 3 (regulation new/update + brief) + 2 new (policy_assessment, carveout_flag) | YES + add |
| #15 Benchmarking | 3 (report + head_to_head + cycle_completed) | YES + add |
| #16 Productivity / HR | 2 (report + bottleneck) | YES + add |
| #17 Product Evolution | 3 (evolution.proposal + orchestra.deprecation + self_renewal_alert) | YES + add |
| #18 Business Planning | 2 + rename | YES + rename per §3.2 |
| #19 Technological Evolution | 3 (tech.signal + cve_alert + tech_upgrade) | YES + add |
| #20 Environmental Impacts | 2 + rename | YES + rename per §3.2 |
| #22/#24/#25 Ops Runners | TBD per role | once role disposed |
| #23 Cost Governor | 4 (anomaly + digest + halt + runner_exceeded) | YES + add |
| #26 Orchestra Research | 7 (all per ENTRY 005) | minor — verify §14.1 contains all 7 |

**Total agents affected: 20.** All require either the §3.1 §4.X block paste OR additional topic-rename per §3.2.

---

## §6 — Cross-cluster integration notes

- **Cluster A**: `agent.cost.signal.v1` added to §14.1 per this Cluster D.
- **Cluster B**: `agent.data_quality.insufficient.v1` added per this Cluster D.
- **Cluster C**: `pipelineMode` cross-cutting field added to canonical envelope-field catalogue per this Cluster D (Cluster D registers the field; Cluster C requires its presence).
- **Cluster E**: `agent.ceiling.violation.v1` added per this Cluster D.
- **Cluster F**: `agent.model.fallback.v1` added per this Cluster D.

---

*End of CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md canonical template v3. v2 Panel conditions R1–R4 + v3 Panel v2 conditions D1–D3 applied. Pending W6 re-ratification. Following ratification, W3 issues §14.1 P0 patch + ENTRY 008 commit (gated on §2.8 load-test artifact per AC-CD-11); deferred per-agent topic additions ship incrementally with each agent's first ship commit (per AC-CD-10 ≤5 topics per commit); nightly cold-store snapshots mirror tamper-evidence digests per §2.7.*
