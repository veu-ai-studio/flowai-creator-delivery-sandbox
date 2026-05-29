# Agent #12 — Portfolio Risk — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A12-REVISE` plurality 5/10 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a per Dispatch revising 14 Wave-1-blocked specs)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 12 + CA-11-B.10 ToolMenu + Cluster A v3 (Path P1) + Cluster C PROMOTED + Cluster D v3 + Cluster E v3 (Option (a) LOCKED) + CA-10-A multi-tenant scope-resolution + **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)**.

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #32 / #48 / #56 (`flowAiOnly` cross-tenant scope ambiguity):** RESOLVED via §13.18 "flowai-only scope resolution" block. `flowAiOnly: true` for Agent #12 means: aggregates ACROSS the in-scope products of a SINGLE FlowAI tenant only. In multi-tenant FlowAI deployments, cross-tenant aggregation is HARD-PROHIBITED at the RLS layer (`tenant_id` predicate on every SSOT read). The §22 Product-Agnostic Rule permits multi-tenant deployments but Agent #12 NEVER aggregates across tenant boundaries; the `tenantId` field is mandatory on all envelopes + scoped via RLS at SSOT read.
- **Obj #39 (lack of clear metrics — "product" definition):** RESOLVED via §13.5 "product-definition metrics" block. "Product" for Agent #12 means a row in `product_registry` with status ∈ `['active','live']` within the same tenant. Excludes archived, deprecated, or pre-active products. Aggregation cardinality assertion: `productsAssessed = COUNT(DISTINCT productId WHERE status IN ('active','live') AND tenantId = currentTenantId)`.
- **Obj #41 (Mode behavior vague):** RESOLVED via §13.4 mode-conditional clarification — Agent #12 is `cross-step` and `flowAiOnly: true`; mode-aware behaviour applies via `ProductRegistry.portfolioRiskThresholds.byMode` for severity-threshold tuning; output shape mode-agnostic; `pipelineMode` field ALWAYS present per Obj #30.
- **Obj #43 (insufficient cost analysis):** RESOLVED via §13.20 "cost breakdown" block. Per-cycle cost broken down: LLM analyze dispatch ~$0.50-1.50/cycle; structured-extraction ~$0.10-0.30/cycle; baseline weekly cost ~$3-8 (4-5 cycles/week). Per-product scaling: linear (each additional product adds ~$0.10/cycle in token budget). Hard cap via Cluster A §13 reserve/settle.
- **Obj #45 (complex dependencies):** RESOLVED via §13.21 "dependency graph + degradation behaviour" block. Hard deps: #8, #21. Soft deps: #26 (vendor-deprecation feed). Degradation: if #8 down, Agent #12 emits with `degradedDueToMissingAudit: true`; if #21 down, GTM-readiness signal absent → portfolio digest emits `gtmHealthUnknown` annotation. NO synchronous blocking on any dep.
- **Obj #57 (vendor allowlist underspecified):** RESOLVED via §13.22 "vendor concentration default policy" block. Default policy: 3-vendor threshold per capability category triggers `vendor-concentration` risk at severity `medium`; 5-vendor concentration triggers `severity: high`; single-vendor for >50% of portfolio capabilities triggers `severity: critical`. The "all 5 on Vercel" case canonically triggers `medium` (single-vendor for `deployment` capability = critical-class but offset by Vercel's enterprise SLA → reduced to medium per default rubric). Allow-list overrides require Panel ratification + 90-day re-review.
- **Obj #58 (LLM vs rules tie-breaker for P0):** RESOLVED via §13.23 "LLM/rule disagreement tie-breaker" block. Default tie-breaker: rules WIN on disagreement (deterministic > LLM). LLM `12.fire.p0.v1` emission requires BOTH (a) rule-based detector trips AND (b) LLM confidence ≥0.8. Spurious P0 protection: minimum 2 of 3 detector classes (vendor-concentration, correlated-regression, cascade-dependency) must concur for P0; single-detector trips emit P1 maximum.
- **Obj #59 (synchronous P0 SLA brittle):** RESOLVED via §13.24 "P0 SLA fallback contract" block. P0 emission within 60s SLA backed by: (a) async-emit primary path (MessageBus emit is fire-and-forget); (b) admin notification via Inngest scheduled retries (up to 3× over 10 min); (c) if all paths fail, `12.p0.delivery_failed.v1` envelope persisted + audit-log alert; NEVER drops the P0 signal. Duplicate-emit prevention: idempotency key `runId + detectorClass + at-truncated-to-minute`.
- **Obj #60 (lack of explicit error handling):** RESOLVED via §13.9 "error handling contract" block. Per-feeder failure modes: ColdStore unreachable → emit with `degradedSources: ['cold_store']`; ProductSSOT unreachable → emit with `degradedSources: ['product_ssot']`; LLM dispatch exhausted → emit P1 max + `analysisDegraded: true`; all-sources-down → halt cycle + emit `12.cycle.halted.v1 { reason: 'all-sources-unavailable' }`.
- **Obj #63 (Cluster B threshold too low — pageCountMin:1 vs ≥3 products precondition):** RESOLVED via §13.2 "Cluster B threshold rebind" block. `pageCountMin` is REPLACED by `productCountMin` clamped `[3, 50]` per §3.3 precondition (cross-product aggregation requires ≥3 products). Single-product or two-product portfolios emit `12.cycle.insufficient_products.v1` with no `portfolio.fire.v1` emission. Closes the charter-violation gap.
- **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18):** §13.15 added. Agent #12's per-product portfolio-risk scoring uses FULL canonical market per `product_registry.market_definition` for impact-magnitude assessment.
- **Cluster A Path P1 (A-a..A-d), Cluster C (PROMOTED), Cluster D (D-a/D-b/D-c), Cluster E v3 (Option (a) LOCKED):** §13, §14, §15, §16 added.
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification.

---

## 1. Agent identity (v2 — `flowAiOnly` scope resolved per §13.18)

| Field | Value |
|---|---|
| ID | `12` |
| Name | `Portfolio Risk` |
| Mode | `cross-step` |
| Step | n/a (cross-step) |
| Embedding | **`flowai-only`** (single-tenant aggregation per §13.18; cross-tenant HARD-PROHIBITED) |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — produces risk reports; remediation is Self-Renewal Executor's responsibility per CA-7 |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes pipeline outputs across ALL ACTIVE products under the CURRENT tenant (single-tenant aggregation per §13.18); reads ProductSSOT rows scoped via RLS `tenant_id` predicate.
- **Decide:** identifies risks that no single-product agent could see — cross-product dependency cascades, shared-vendor concentration risk per §13.22 default policy, correlated audit-score regressions, GTM-readiness slippage trends.
- **Execute:** produces `12.portfolio_risk.v1` digest; surfaces top risks to admin UI + audit log; flags individual products for Self-Renewal Alert escalation per Locked Rule 16. P0 paths follow §13.24 fallback contract.
- **Emit:** see §3.

## 3. MessageBus topics

**Consumes:**
- `8.audit.completed.v1` — across all in-tenant active products
- `21.gtm.readiness.v1` — across all in-tenant active products
- `10.anomaly.v1` — anomaly signals from all in-tenant products
- `26.orchestra.deprecated.v1` — vendor risk from Orchestra deprecations

**Produces (5 net-new topics, at ceiling):**
- `12.portfolio_risk.v1` — payload: `{ at, tenantId, productsAssessed: number, topRisks: [{ category, severity, affectedProducts, evidence }], trendIndicators, degradedSources, pipelineMode }`
- `12.product_alert.v1` — per-product alert payload `{ tenantId, productId, alertCategory, evidence, recommendedAction, at }`
- `12.fire.p0.v1` — critical alert (per §13.23 multi-detector concurrence requirement)
- `12.cycle.halted.v1` — emitted when all upstream sources unavailable (Obj #60)
- `12.cycle.insufficient_products.v1` — emitted when `productsAssessed < productCountMin` (Obj #63)

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('analyze', { artifact: portfolioCorpus, criteria: 'cross-product-risk' }, opts);
orchestra.dispatch('extract-structured', { text, schema: riskSchema }, opts);
```

## 5. ToolMenu (per CA-11-B.10)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `extract-structured` |
| 2 | OpenAI API (GPT-5) | `openrouter` (`openai/gpt-5`) | high | `analyze`, `score` |
| 3 | Google Gemini 2.5 Pro | `openrouter` (`google/gemini-2.5-pro`) | high | `analyze`, multimodal |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent12PortfolioRisk.js                  # ~480 LOC
src/lib/agents/agents/__tests__/Agent12PortfolioRisk.test.js   # ~320 LOC
src/lib/agents/agents/portfolioRisk/                           # helper modules
  vendorConcentrationDetector.js                               # §13.22 default policy
  multiDetectorConcurrence.js                                  # §13.23 tie-breaker + P0 gate
  p0SlaFallback.js                                             # §13.24 retry + delivery_failed envelope
```

**Class skeleton:**

```js
export class Agent12PortfolioRisk extends BaseAgent {
  static charterId = 12;
  static charter() {
    const r = getAgent(12);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: true,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* aggregate across in-tenant active products; classify risks */ }
  async act(ctx, plan) { /* emit envelopes; P0 via §13.24 fallback contract */ }
  async recommend(ctx) { /* cross-step entry */ }
}
```

## 7. OrchestratorHub wire-in pattern

Cross-step registration via `hub.registerCrossStep('portfolio-risk', agent)`. Scheduled cadence: weekly Mondays 04:00 UTC + on-demand admin invocation; event-triggered on ≥3 `26.orchestra.deprecated.v1` events within 7 days (vendor concentration alert).

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A12-N1 | Nominal | 5 active products with mixed audit scores → portfolio digest aggregates correctly; surfaces lowest-scoring product as top risk |
| A12-N2 | Nominal | All 5 products on Vercel → vendor-concentration risk flagged severity `medium` per §13.22 default |
| A12-N3 | Nominal | 3 products show correlated audit regression in same week → `correlated-regression` flagged with affected products |
| A12-N4 | Nominal | Multi-detector concurrence: vendor-concentration + correlated-regression both trip → P0 emit per §13.23 |
| A12-M1 | Malformed | One product's audit stream missing → portfolio digest computes on available subset; emits `degradedSources` annotation |
| A12-M2 | Malformed | All upstream sources unavailable → `12.cycle.halted.v1 { reason: 'all-sources-unavailable' }` per §13.9 |
| A12-E1 | Edge | Only 2 active products → `12.cycle.insufficient_products.v1` emitted per §13.2; NO `portfolio_risk.v1` emission |
| A12-E2 | Edge | LLM tie-breaker test: rule-based vendor-concentration trips, LLM disagrees → rules win, emit P1 not P0 per §13.23 |
| A12-E3 | Edge | P0 SLA fallback: primary delivery fails → Inngest retry × 3 over 10 min; final `12.p0.delivery_failed.v1` if exhausted |
| A12-X1 | Adversarial | Cross-tenant data leak attempt — Agent #12 within `flowai-only` single-tenant scope; client-role read on `12.portfolio_risk.v1` → 403 per §13 + §13.18 RLS |
| A12-X2 | Adversarial | Cross-tenant aggregation attempt (operator A queries tenant B's products) → RLS rejects per §13.18 hard-prohibition |
| A12-X3 | Adversarial | Hostile getter pattern test |
| A12-X4 | Adversarial | Prompt-injection in cross-product evidence does NOT alter rule-based detector verdict |
| A12-X5 | Adversarial | P0 spam attempt: single-detector trip → emits P1 max per §13.23 minimum-2-detectors rule |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A12-* tests passing
- Weekly scheduled invocation produces non-empty digest for ≥3 consecutive weeks
- Admin UI surfaces top 5 portfolio risks
- At least one `12.product_alert.v1` emitted per quarter on a real product signal
- W4 adversarial coverage ≥5 cases including cross-tenant isolation
- P0 SLA fallback exercised in adversarial harness (synthetic notification-adapter outage)

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agents #8 (Quality Audit) + #21 (ACE Conductor) SHIPPED-GREEN
- **Soft depends on:** ≥3 in-tenant active products; #26 Orchestra Research Agent for vendor-deprecation feed
- **Provides to:** Agent #18 Business Planning; Agent #17 Product Evolution

## 11. Estimated build effort

**~10 W-hours** Phase 1 (aggregator + risk classifier + multi-detector concurrence + P0 SLA fallback).

## 12. Open clarification flags

- **Q (RESOLVED v2 — scope hard-prohibited):** Cross-tenant aggregation within `flowAiOnly: true` scope — RESOLVED to SINGLE-TENANT only per §13.18 + RLS. Multi-tenant deployments do NOT aggregate across tenants under any circumstance.

---

## 13. Cluster A integration — Path P1 ACCEPT-WITH-CONDITIONS (v2 paste block, A-a..A-d)

Per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3 + ENTRY 009 Cluster A Path P1 verdict.

- **A-a (boundary-class):** Agent #12 is `cross-step flowai-only` cost-class; cost aggregated at agent×cycle×tenant grain. All LLM dispatches MUST call `costGovernor.reserve()` + `settle()` + emit `agent.cost.signal.v1`.
- **A-b/A-c:** advisory-lock + SERIALIZABLE per canonical Cluster A v3.
- **A-d (halt envelope):** budget-cap → emit `12.cycle.halted.v1 { reason: 'budget-cap-reached' }` per §3.

### §13.2 — Cluster B Data Quality Gate (Obj #63 charter-violation fix)

`pageCountMin` parameter is REPLACED by `productCountMin` for Agent #12 per §3.3 precondition. Default `productCountMin = 3`; clamp range `[3, 50]` (values outside rejected at `ProductRegistry.minimumDataQuality` write-time). Single-product or two-product portfolios emit `12.cycle.insufficient_products.v1` — NO `portfolio.fire.v1` or `12.portfolio_risk.v1` emission.

### §13.4 — Cluster C integration + mode boundary clarification (Obj #22 / #30 / #41)

Output mode-agnostic; severity thresholds mode-conditional via `ProductRegistry.portfolioRiskThresholds.byMode` (defaults to canonical thresholds). `pipelineMode` field ALWAYS present on every emit; cross-step agent value is `'cross-step'` (or `'mixed'` for multi-mode portfolio aggregations).

### §13.5 — Product-definition metrics (Obj #39 resolution)

"Product" for Agent #12 = row in `product_registry` where:
- `status IN ('active','live')` — excludes archived, deprecated, pre-active
- `tenant_id = currentTenantId` — single-tenant scope per §13.18
- `audit_stream_present = true` — must have ≥1 `8.audit.completed.v1` event in last 30 days (else excluded as silently-dormant)

Aggregation cardinality contract: `productsAssessed = COUNT(DISTINCT productId WHERE above conditions hold)`. Surfaced on every `12.portfolio_risk.v1` envelope.

### §13.9 — Error handling contract (Obj #60 resolution)

| Failure mode | Detection | Error envelope | Recovery |
|---|---|---|---|
| ColdStore unreachable | DB connection timeout | `12.portfolio_risk.v1 { degradedSources: ['cold_store'] }` | Continue with ProductSSOT-only inputs |
| ProductSSOT unreachable | DB connection timeout | `12.portfolio_risk.v1 { degradedSources: ['product_ssot'] }` | Continue with ColdStore-only inputs |
| Both DBs unreachable | both timeouts | `12.cycle.halted.v1 { reason: 'all-sources-unavailable' }` | Halt cycle; advisory log |
| LLM dispatch exhausted | `dispatchWithFallback` returns null | `12.portfolio_risk.v1 { analysisDegraded: true }` | Emit P1 max (no P0 without LLM confidence) |
| P0 notification adapter down | delivery failure detected | Retry per §13.24 × 3; final `12.p0.delivery_failed.v1` | Audit-log alert; signal NEVER dropped |
| Cross-tenant RLS reject | RLS predicate fails | 403 + structured error | Reject request; audit-log security event |

### §13.11 — SSOT field-ownership partition (Obj #25-flavour)

Agent #12 has NO ProductSSOT write surface in Phase 1 (envelope-only output). No collision risk with #8/#9/#10 SSOT scopes.

### §13.15 — VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)

Agent #12's impact-magnitude scoring for per-product risk uses FULL canonical market per `product_registry.market_definition`. A risk affecting MyPregLife's pregnancy market is scored against the FULL global market (not Africa-only). Risk-magnitude calculation in §13.5 cardinality contract preserves full-market context.

### §13.18 — `flowAiOnly` scope resolution (Obj #32 / #48 / #56 resolution)

`flowAiOnly: true` for Agent #12 means **single-tenant aggregation only**:

| Scope | Behaviour |
|---|---|
| In-tenant aggregation | ALLOWED — across all active products of the current tenant |
| Cross-tenant aggregation | HARD-PROHIBITED — RLS `tenant_id` predicate enforced at every SSOT read |
| Multi-tenant FlowAI deployment | Each tenant gets its own scheduled cycle; no cross-tenant data path |
| `tenantId` field on every emit | MANDATORY per Cluster D schema |
| Cross-tenant query attempt | 403 + audit-log security event |

Implementation: every Agent #12 SQL query carries `WHERE tenant_id = $1` (the current scheduled invocation's tenant scope); cross-tenant joins are unparseable by the canonical query builder (Cluster A library rejects).

### §13.20 — Cost breakdown (Obj #43 resolution)

Per-cycle cost:
- LLM analyze dispatch: ~$0.50-1.50/cycle (Anthropic API)
- Structured-extraction: ~$0.10-0.30/cycle
- DB reads (ColdStore + ProductSSOT): $0 (in-tenant)
- Per-product scaling: linear; +$0.10/cycle per additional active product (token budget growth)

Baseline weekly cost: ~$3-8 (1 scheduled cycle/week + event-triggered cycles). Hard cap via Cluster A §13 reserve/settle; budget-cap-reached emits `12.cycle.halted.v1 { reason: 'budget-cap-reached' }`.

### §13.21 — Dependency graph + degradation behaviour (Obj #45 resolution)

Hard deps (cycle halts if absent):
- Cluster A library (cost governance) — universal requirement

Soft deps (cycle continues with degraded output):
- Agent #8 (Quality Audit) — if down, `degradedDueToMissingAudit: true` annotation
- Agent #21 (ACE Conductor) — if down, `gtmHealthUnknown: true` annotation
- Agent #10 (Monitor) — if down, anomaly signals missing; cycle continues
- Agent #26 (Orchestra Research) — if down, vendor-deprecation feed missing; cycle continues

**No synchronous blocking on any dep.** All consumption is via MessageBus async; missing signals → annotation, not halt.

### §13.22 — Vendor concentration default policy (Obj #57 resolution)

Default policy (overrides require Panel ratification + 90-day re-review):

| Trigger condition | Severity |
|---|---|
| 3 products sharing same vendor for ≥1 capability | `medium` |
| 5+ products sharing same vendor for ≥1 capability | `high` |
| Single vendor for >50% of portfolio capabilities | `critical` |
| Same vendor across 100% of portfolio for `deployment` capability | `medium` (reduced from critical for enterprise-SLA vendors; e.g. Vercel) |
| Same vendor across 100% for `auth`, `payments`, `storage` (non-deployment critical-path) | `high` to `critical` |

"All 5 VEU products on Vercel" canonical case: `medium` (single-vendor for `deployment` + Vercel enterprise SLA). Concentration alert auto-generates a Panel-review packet quarterly.

### §13.23 — LLM/rule disagreement tie-breaker (Obj #58 resolution)

- **Default:** rules WIN on disagreement (deterministic > LLM).
- **P0 emission gate:** requires BOTH (a) rule-based detector trips AND (b) LLM confidence ≥0.8 on the same risk class.
- **Multi-detector concurrence:** P0 emission requires ≥2 of 3 detector classes (vendor-concentration, correlated-regression, cascade-dependency) to concur on the same affected-product set within the same cycle. Single-detector trips → P1 maximum.
- **Confidence floor:** below 0.5 LLM confidence → LLM output discarded; rules-only verdict.

### §13.24 — P0 SLA fallback contract (Obj #59 resolution)

P0 emission within 60s SLA backed by 3-tier fallback:

1. **Primary path (async emit):** `MessageBus.emit('12.fire.p0.v1', payload)` is fire-and-forget. Schema-validated synchronously; emit returns once the envelope persists to the bus queue (target: <500ms).
2. **Admin notification (Inngest retry):** Inngest scheduled function picks up the emit + dispatches to notification adapter (Slack/email/PagerDuty per `ProductRegistry.p0NotificationAdapter`). Retry × 3 over 10 min on failure.
3. **Persistence-guaranteed audit fallback:** if all retries exhausted, persist `12.p0.delivery_failed.v1 { originalEnvelope, deliveryAttempts, lastError, at }` to audit-log. NEVER drops the P0 signal.

**Duplicate-emit prevention:** idempotency key `runId + detectorClass + at-truncated-to-minute`. Replay attempts within window emit advisory log only; original P0 not re-fired.

## 14. Cluster C integration — see §13.4

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS audit-log topic schema (D-a/D-b/D-c)

Per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 + ENTRY 009.

- **D-a (envelope drift guards):** all 5 `12.*` topics conform to v3 §2.2 naming + carry mandatory `tenantId` field per §13.18.
- **D-b (retention-class binding):** `12.portfolio_risk.v1`, `12.fire.p0.v1`, `12.p0.delivery_failed.v1` are `retention-class: governance` (7-year + hash-chain mirror). `12.product_alert.v1` is `retention-class: governance` (7-year). `12.cycle.halted.v1`, `12.cycle.insufficient_products.v1` are `retention-class: operational` (90-day).
- **D-c (replay-buffer semantics):** idempotency keys per §13.24 + per-cycle `cycleStartedAt + tenantId + detectorClass`.

**Topic-per-ship ceiling:** 5 net-new topics, at ceiling per Cluster D v3 §2.1.0-Def — single first-ship commit.

**Load-test artifact gate:** shared Wave 1 cohort artifact per Cluster D AC-CD-11.

## 16. Cluster E integration — v3 + Option (a) LOCKED context

Agent #12 primary `[RECOMMEND_ONLY]`; no sibling Executor (Portfolio Risk produces reports only; remediation is Self-Renewal Executor's responsibility per CA-7). No charter change required; no roster mutation, no sibling registration. Authoritative ceiling enforcement via `BaseAgent.guard()` per Cluster E v3 §2.5 applies on every dispatch.

---

## 17. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution location |
|---|---|---|
| **32/48/56** | `flowAiOnly` cross-tenant scope ambiguity | §13.18 — single-tenant hard-prohibited cross-tenant; RLS enforced |
| **39** | "Product" definition unclear | §13.5 — active+live status + tenant scope + audit-stream presence |
| **41** | Mode behavior vague | §13.4 — mode-agnostic output; thresholds mode-conditional |
| **43** | Insufficient cost analysis | §13.20 — per-component breakdown + linear scaling |
| **45** | Complex dependencies | §13.21 — hard vs soft + degradation behaviour table |
| **57** | Vendor allowlist underspecified | §13.22 — default policy + per-tier severity + override procedure |
| **58** | LLM vs rules tie-breaker for P0 | §13.23 — rules win; P0 requires multi-detector concurrence + LLM confidence ≥0.8 |
| **59** | Synchronous P0 SLA brittle | §13.24 — 3-tier fallback; delivery_failed envelope guarantees signal persistence |
| **60** | Lack of explicit error handling | §13.9 — per-feeder failure-mode table + recovery paths |
| **63** | Cluster B threshold too low | §13.2 — productCountMin replaces pageCountMin; clamped [3,50] |
| **N/A** | VEU §1.1 market scope (CEO 2026-05-18) | §13.15 — full-market impact-magnitude scoring |

---

*End of Agent #12 Portfolio Risk build blueprint v2. Panel `PLURALITY_A12-REVISE` 5/10 objections resolved per §17. Cluster paste blocks A-P1, C, D, E applied per §13-16. Pending W6 re-ratification.*
