# Cluster D — Audit-Log Topic Schema Extension (Canonical Template)

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Anchor canonical:** Rev-2.1 §14.1 GovernanceAuditLog canonical topic catalogue (65 topics as of ENTRY 006); §15.2 MessageBus (61 → 65 expansion at ENTRY 006); CA-9-B charter expansion (additional topics not yet propagated to §14.1).
**Panel source:** `docs/panel-consultations/18-agent-consolidated-panel-2026-05-16.md` Batch 1 objection #02 + Batch 2 objections #21, #27 + Batch 3 objections #23, #28.

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

## §2 — Canonical Resolution

**Extend §14.1 canonical catalogue with all new topics introduced by the 18 agent specs + the 3 cross-cluster topics from this Cluster D + Clusters A, B, C, F.**

After Cluster D ratification, W3 issues a targeted `CANONICAL_REFERENCE.md` §14.1 update commit adding all topics below. This is a single SSOT amendment landed as one commit; downstream `MessageSchema.js` migration follows in engineering dispatch.

### §2.1 — New topic catalogue (full list)

#### §2.1.1 — Cross-cluster topics (from Clusters A, B, C)

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

### §2.4 — Migration mechanism (per Batch 2 #27)

For renames (e.g. `9.gtm.asset.v1` → `9.gtm.assessment.v1`, `18.plan.update.v1` → `18.business_plan.v1`, `20.impact.assessment.v1` → `20.sustainability_report.v1`):

- **Phase 1**: register both old + new topics in §14.1; emitters publish to NEW only; consumers subscribe to BOTH old + new for one minor-version cycle.
- **Phase 2** (after 30 days of zero old-topic emissions): deregister old topics in §14.1; consumers stop subscribing to old.

No emitter is left "stranded" mid-migration; no consumer misses events.

### §2.5 — §14.1 patch commit

After Cluster D ratification, W3 issues:
- `docs/CANONICAL_REFERENCE.md` §14.1 update adding ~30 net new topics with payload references.
- `docs/CANONICAL_HISTORY.md` ENTRY 008 recording the §14.1 extension promotion.
- One commit; one push; one canonical event.

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

## §4 — Acceptance Criteria

1. **AC-CD-1 (Canonical catalogue extension committed):** `docs/CANONICAL_REFERENCE.md` §14.1 contains ALL ~30 net new topics with payload references; `docs/CANONICAL_HISTORY.md` ENTRY 008 records the extension.

2. **AC-CD-2 (Naming convention compliance):** Every new topic name matches Cluster D §2.2 regex (`^(\d+|agent|customer|community|vendor|executor|runner|portfolio|system)\.[a-z_]+(\.[a-z_]+)*\.v\d+$`). Spec-level grep verifies.

3. **AC-CD-3 (Schema validation runtime):** `MessageSchema.js` rejects emit attempts on unregistered topics; rejection error code is `UNKNOWN_TOPIC[<topicName>]`. Implementation test (deferred).

4. **AC-CD-4 (Duplicate registration prevention):** `MessageSchema.js` init throws on duplicate-shape topic registrations.

5. **AC-CD-5 (Migration parallel-register works):** For each rename, both old + new topics are registered for ≥30 days; emitters publish NEW only; consumers can subscribe to BOTH.

6. **AC-CD-6 (No topic-emit code paths reference unregistered topics):** Grep across agent code paths confirms every emit call site references a §14.1-registered topic name. CI guard.

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

*End of CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md canonical template. Pending W6 Panel ratification. Following ratification, W3 issues §14.1 patch + ENTRY 008 commit.*
