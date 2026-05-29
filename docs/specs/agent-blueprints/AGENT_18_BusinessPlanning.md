# Agent #18 — Business Planning — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A18-REVISE` `QUORUM_PLURALITY_A18-REVISE` 7/10 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a per Dispatch revising 14 Wave-1-blocked specs)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 18 + CA-11-B.7 ToolMenu + Cluster A v3 (Path P1) + Cluster C PROMOTED + Cluster D v3 + Cluster E v3 (Option (a) LOCKED) + **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)**.

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #69 / #84 / #88 / #92 (drift baseline missing + threshold subjectivity + operational brittleness):** RESOLVED via §13.29 "drift baseline + category-specific thresholds + black-swan handling" block. Baseline canonicalised as `rolling 3-month median + interquartile range`, computed per category (pricing, allocation, headcount, model-budget, vendor-spend). Each category has its own threshold tuned for its volatility profile: pricing ±10% (low volatility); allocation ±15% (medium); headcount ±5% (low); model-budget ±25% (high — model markets shift rapidly); vendor-spend ±15% (medium). `baselineConfidence` flag attached to every drift detection; below 0.6 confidence routes to advisory-only (no alert). Black-swan handling: when ≥3 categories trip simultaneously OR a single category exceeds 2× normal threshold, the alert escalates to `18.plan_disruption.v1` (CEO-route, bypasses normal drift-alert flow).
- **Obj #70 / #73 (lack of clear metrics for impact of recommendations):** RESOLVED via §13.5 "recommendation impact metrics" block. Each `18.strategic_recommendation.v1` carries `expectedImpact: { metric, baseline, projected, confidenceInterval, evidenceLinks[] }` — concrete measurable impact with confidence interval. Post-implementation actuals tracked in `governance_record.recommendation_outcomes[]` (90-day lookback for accepted recommendations).
- **Obj #75 / #84 (unclear escalation policy — what constitutes "material plan drift"):** RESOLVED via §13.29 — "material plan drift" is now operationalised per category threshold; ambiguity removed.
- **Obj #76 (potential data leakage via productId references):** RESOLVED via §13.10 "security controls extension" block. `productId` references in recommendations are scoped to in-tenant only; cross-tenant productId leakage rejected at schema validator. Per-recommendation sensitive-data scrubbing: financial figures rounded to 1-significant-digit in narrative summaries; raw figures persisted to audit log only.
- **Obj #77 (inadequate cost control — $2-5/month estimate without enforcement):** RESOLVED via §13.20 "cost breakdown + enforcement" block. Per-cycle cost breakdown: LLM analyze ~$0.30-1.00/cycle (cross-product aggregation); structured-extraction ~$0.10-0.20/cycle. Monthly baseline ~$2-5 (monthly + quarterly cycles). Hard cap via Cluster A §13 reserve/settle; budget-cap-reached emits `18.cycle.halted.v1 { reason: 'budget-cap-reached' }`.
- **Obj #78 (incomplete Cluster A integration):** RESOLVED via §13 — full Cluster A Path P1 paste block applied (A-a..A-d standard application). Closes the v1 integration gap.
- **Obj #90 / #95 / #98 (topic/schema split unresolved + inconsistent naming):** RESOLVED via §13.12 "topic name canonicalisation + migration plan" block. Canonical produces set (post-migration): `['18.business_plan.v1', '18.strategic_recommendation.v1', '18.plan_disruption.v1', '18.cycle.halted.v1', '18.cycle.empty.v1']` — 5 topics at ceiling. The legacy `18.plan.update.v1` is REMOVED (was a `_registry.ts` placeholder; never live in production; no dual-emit window needed). `_registry.ts` row 18 migrates at first-ship.
- **Obj #91 (cross-cluster inputs underdefined):** RESOLVED via §13.21 "dependency graph + authoritative-source contract" block. Authoritative sources documented per category — portfolio risk from #12; evolution proposals from #17; intelligence from #11; GTM assessments from #9 cross-product; partial-corpus acceptable when any single source missing (annotated `degradedSources` field on emit); biasing-when-partial documented inline (e.g. missing #11 → marketplace-intelligence weight zeroed; recommendation set may underweight emerging-trend factors).
- **Obj #93 (authority model unclear):** RESOLVED via §13.30 "authority model clarification" block. Build-authority = `[RECOMMEND_ONLY]` (no executor path); operational-authority = read-only across portfolio inputs; CEO + admin can override via Panel-route per Locked Rule 13; "advisory only" is ENFORCED by the absence of any side-effect emission topic in Agent #18's `produces` set (Cluster D `UNKNOWN_TOPIC` boundary rejects emit attempts on non-declared topics).
- **Obj #94 (cost-governor self-referential):** RESOLVED via §13.31 "Cost-governor + LLM model selection precedence" block. Agent #18 declares precedence: Cluster A cost-signal (reserve/settle) ALWAYS WINS over Cluster F model-tier selection. If cost budget denies the requested model tier, model-fallback cascades to the next tier in ToolMenu per CA-11-A.4; feedback loop is broken by the boundary class `'business-planning'` being excluded from anomaly detectors per Cluster A v3 §3.1 (similar mechanism to Agent #23's `'cost-governor-self'` exclusion).
- **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18):** §13.15 added. Agent #18's strategic recommendations reference FULL canonical market per `product_registry.market_definition`. Recommendations narrowing market scope are REJECTED at the proposal-validation gate.
- **Cluster A Path P1 (A-a..A-d), Cluster C (PROMOTED), Cluster D (D-a/D-b/D-c), Cluster E v3 (Option (a) LOCKED):** §13, §14, §15, §16 added.
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `18` |
| Name | `Business Planning` |
| Mode | `cross-step` |
| Step | n/a (cross-step) |
| Embedding | **`flowai-only`** |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` (per §13.30 — advisory only; no executor path) |
| Future Executor (Phase 2) | NONE — produces strategic planning recommendations; never executes business decisions |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes Agent #12 Portfolio Risk + Agent #17 Product Evolution + Agent #11 Strategic Intelligence outputs; reads ProductSSOT `governance_record` history aggregated across in-tenant products; ingests external business intelligence (commercial-rail performance metrics, conversion funnels per CA-9-C customer feedback).
- **Decide:** drift detection per §13.29 category-specific thresholds; produces strategic planning recommendations on portfolio-level moves with concrete `expectedImpact` per §13.5; partial-corpus acceptable with annotations per §13.21.
- **Execute:** emits planning envelopes; CEO/admin acts. Cost-precedence per §13.31.
- **Emit:** see §3.

## 3. MessageBus topics

**Consumes:**
- `12.portfolio_risk.v1` (authoritative source for portfolio-risk category)
- `17.evolution.proposal.v1`, `17.self_renewal_alert.v1` (authoritative for evolution category)
- `11.marketplace_intelligence_report.v1` (authoritative for intelligence category)
- `9.gtm.assessment.v1` cross-product (authoritative for GTM category)

**Produces (5 net-new topics, at ceiling per Cluster D v3 §2.1.0-Def):**
- `18.business_plan.v1` — payload: `{ at, tenantId, planningHorizon: 'monthly'|'quarterly'|'annual', recommendations: [], productAllocations, evidenceLinks, degradedSources, baselineConfidence, pipelineMode }`
- `18.strategic_recommendation.v1` — payload: `{ category, action, productId?, tenantId, evidence, expectedImpact: { metric, baseline, projected, confidenceInterval, evidenceLinks }, at }`
- `18.plan_disruption.v1` — black-swan escalation payload per §13.29: `{ tenantId, triggerCategory, magnitude, affectedCategories: [], evidence, escalationRoute: 'ceo_direct', at }`
- `18.cycle.halted.v1` — emitted on budget-cap-reached or all-sources-unavailable per §13.9
- `18.cycle.empty.v1` — emitted when scheduled cycle yields no actionable recommendations

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('analyze', { artifact: portfolioCorpus, criteria: 'strategic-narrative' }, opts);  // LLM advisory only
orchestra.dispatch('summarize', { text, maxTokens: 3000 }, opts);
```

## 5. ToolMenu (per CA-11-B.7)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `summarize` |
| 2 | OpenAI API (GPT-5) | `openrouter` (`openai/gpt-5`) | high | `analyze` |
| 3 | Google Gemini 2.5 Pro | `openrouter` (`google/gemini-2.5-pro`) | high | `analyze`, multimodal |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent18BusinessPlanning.js                   # ~440 LOC
src/lib/agents/agents/__tests__/Agent18BusinessPlanning.test.js    # ~280 LOC
src/lib/agents/agents/businessPlanning/                            # helper modules
  driftBaselineComputer.js                                         # §13.29 rolling 3-month median + IQR per category
  categoryThresholds.js                                            # §13.29 per-category threshold table
  blackSwanEscalator.js                                            # §13.29 multi-category-trip detector
  impactMetricsScorer.js                                           # §13.5 expectedImpact computation
```

**Class skeleton:** mirrors Agent #12 v2 cross-step pattern (`flowAiOnly: true`, `[RECOMMEND_ONLY]`).

```js
export class Agent18BusinessPlanning extends BaseAgent {
  static charterId = 18;
  static charter() {
    const r = getAgent(18);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: true,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* category drift detection + recommendation impact scoring */ }
  async act(ctx, plan) { /* emit business_plan + recommendations + plan_disruption if black-swan */ }
  async recommend(ctx) { /* cross-step entry */ }
}
```

## 7. OrchestratorHub wire-in pattern

Cross-step registration via `hub.registerCrossStep('business-planning', agent)`. Cadence: monthly (1st of month 13:00 UTC) + quarterly aggregate digest.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A18-N1 | Nominal | Monthly invocation produces business plan with ≥3 recommendations + `expectedImpact` per recommendation |
| A18-N2 | Nominal | Strong portfolio-risk signal triggers explicit allocation-shift recommendation with confidence interval |
| A18-N3 | Nominal | Category drift (pricing +12%) trips threshold (±10%) → drift alert emits; `baselineConfidence ≥ 0.6` |
| A18-N4 | Nominal | Multi-category trip (≥3 categories) → `18.plan_disruption.v1` emitted with `escalationRoute: 'ceo_direct'` per §13.29 |
| A18-N5 | Nominal | Cost-precedence: budget denies requested model tier → falls through to next tier per §13.31; no anomaly self-trigger |
| A18-M1 | Malformed | Missing upstream signals (e.g. #12 down) → emits with `degradedSources: ['portfolio_risk']` annotation per §13.21 |
| A18-M2 | Malformed | All upstream signals missing → `18.cycle.halted.v1 { reason: 'all-sources-unavailable' }` |
| A18-E1 | Edge | All metrics flat for 90 days → plan emits stability-confirmation envelope; no drift alerts |
| A18-E2 | Edge | Single-category 2× threshold trip (e.g. model-budget +60%) → black-swan escalation per §13.29 |
| A18-X1 | Adversarial | Prompt-injection in upstream report does NOT alter recommendation framing |
| A18-X2 | Adversarial | Hostile getter pattern test |
| A18-X3 | Adversarial | Cross-tenant productId leakage attempt — recommendation references productId outside current tenant → schema validator rejects per §13.10 |
| A18-X4 | Adversarial | Market-narrowing recommendation attempt — rejected per §13.15 VEU §1.1 |
| A18-X5 | Adversarial | Side-effect emission attempt — emit on undeclared topic (e.g. `18.plan.execute.v1`) → Cluster D `UNKNOWN_TOPIC` rejects per §13.30 advisory-only enforcement |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A18-* tests passing
- Monthly invocation runs ≥3 consecutive months
- At least one strategic recommendation accepted + acted on per quarter (tracked in `governance_record.recommendation_outcomes[]`)
- W4 adversarial coverage ≥4 cases passing
- Drift baseline computer runs against historical SSOT data; per-category thresholds calibrated

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agents #11, #12, #17 SHIPPED-GREEN (authoritative sources per §13.21)
- **Soft depends on:** Agent #9 cross-product GTM data (acceptable to ship without; recommendation set will underweight GTM category)
- **Provides to:** CEO dashboard + admin strategic-planning UI

## 11. Estimated build effort

**~8 W-hours** Phase 1 (drift baseline + threshold table + black-swan detector + impact-metrics scorer + advisory-only enforcement).

## 12. Open clarification flags

- **Q (RESOLVED v2 — implementation):** Quarterly aggregate digest format — Markdown + JSON triple per LD-8 reporting, matches Agent #11 monthly digest.

---

## 13. Cluster A integration — Path P1 ACCEPT-WITH-CONDITIONS (v2 paste block, A-a..A-d)

Per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3 + ENTRY 009 Cluster A Path P1 verdict. Closes Obj #78 (v1 incomplete integration).

- **A-a (boundary-class):** Agent #18 is `cross-step flowai-only` cost-class — but per §13.31 declared in canonical Cluster A v3 §3.1 with `boundary class: 'business-planning'` (excluded from cost-governor anomaly detectors to prevent self-trigger loops when Agent #18's own recommendations touch cost categories).
- **A-b (advisory-lock + lease-token):** PostgreSQL advisory-lock + 60s lease TTL per Cluster A v3 §2.5.
- **A-c (SERIALIZABLE isolation):** mutations through canonical Cluster A library only.
- **A-d (halt envelope):** budget-cap-reached → emit `18.cycle.halted.v1 { reason: 'budget-cap-reached' }`.

### §13.4 — Cluster C integration + mode boundary clarification (Obj #22 / #30)

Output mode-agnostic; `pipelineMode` field ALWAYS present per Obj #30; cross-step value is `'cross-step'` (or `'mixed'` for multi-mode portfolio plans).

### §13.5 — Recommendation impact metrics (Obj #70 / #73 resolution)

Every `18.strategic_recommendation.v1` carries `expectedImpact`:

```js
expectedImpact: {
  metric: 'monthly_arr_usd' | 'monthly_active_users' | 'gross_margin_pct' | 'audit_score' | 'gtm_readiness_score' | ...,
  baseline: <current_value>,
  projected: <expected_value_post_implementation>,
  confidenceInterval: [<lower>, <upper>],  // 95% CI
  evidenceLinks: [<governance_record_id>, <metric_dashboard_url>, ...]
}
```

Post-implementation actuals tracked in `governance_record.recommendation_outcomes[]`:
- `recommendationId` (links to original `18.strategic_recommendation.v1`)
- `acceptedAt`, `implementedAt`
- `actualImpact` (measured 90 days post-implementation against the baseline)
- `accuracyVsProjected` (delta between projected and actual)

Used by next planning cycle to calibrate `confidenceInterval` width (Bayesian update on Agent #18's projection accuracy).

### §13.9 — Error handling contract (Obj #91-related)

| Failure mode | Detection | Error envelope | Recovery |
|---|---|---|---|
| Source #12 unreachable | DB / bus consumption timeout | `18.business_plan.v1 { degradedSources: ['portfolio_risk'] }` | Continue with available sources |
| Source #17 unreachable | timeout | `degradedSources: ['evolution_proposals']` | Continue |
| Source #11 unreachable | timeout | `degradedSources: ['marketplace_intelligence']` | Continue |
| Source #9 unreachable | timeout | `degradedSources: ['gtm_assessments']` | Continue |
| ALL sources unavailable | all timeouts | `18.cycle.halted.v1 { reason: 'all-sources-unavailable' }` | Halt cycle |
| Budget cap reached | `costGovernor.reserve()` denies | `18.cycle.halted.v1 { reason: 'budget-cap-reached' }` | Halt cycle |
| LLM dispatch exhausted | `dispatchWithFallback` returns null | `18.business_plan.v1 { analysisDegraded: true }` | Emit rule-based-only plan |

### §13.10 — Security controls extension (Obj #76 resolution)

`productId` scoping:
- `productId` references in recommendations scoped to in-tenant only (RLS enforced).
- Cross-tenant `productId` references rejected at schema validator (test A18-X3).

Sensitive-data scrubbing:
- Financial figures in narrative summaries rounded to 1-significant-digit (e.g. "$1.3M ARR" → "$1M ARR range").
- Raw figures persisted to audit log only (governance-class retention).
- Per-recommendation evidence links use opaque IDs (no PII / raw figures in URLs).

### §13.11 — SSOT field-ownership partition

Agent #18 reads cross-product governance records (read-only); NO ProductSSOT write surface in Phase 1. Per-recommendation outcomes written to `governance_record.recommendation_outcomes[]` (a per-tenant aggregate column owned by #18 specifically). No collision with other agents' SSOT scopes.

### §13.12 — Topic name canonicalisation (Obj #90 / #95 / #98 resolution)

Canonical produces set (5 topics at ceiling per Cluster D v3 §2.1.0-Def):
- `18.business_plan.v1` (canonical primary emission)
- `18.strategic_recommendation.v1` (canonical per-recommendation emission)
- `18.plan_disruption.v1` (NEW v2 — black-swan escalation)
- `18.cycle.halted.v1` (failure-handling)
- `18.cycle.empty.v1` (no-actionable-recommendations advisory)

**Migration:** legacy `18.plan.update.v1` (v1 `_registry.ts` placeholder) is REMOVED. No dual-emit window required (was never live in production). `_registry.ts` row 18 `produces` field migrates to the 5-topic set at first-ship.

### §13.15 — VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)

Agent #18's strategic recommendations reference FULL canonical market per `product_registry.market_definition` (mirrors SSOT §1.1; PERMANENT). Recommendations that narrow a product's market scope (e.g. "deprecate MyPregLife's global expansion in favour of Africa-only focus") are REJECTED at the proposal-validation gate per `narrowMarketAt: 'agent18'` not being a valid `ProductRegistry` configuration.

### §13.20 — Cost breakdown + enforcement (Obj #77 resolution)

Per-cycle cost:
- LLM analyze dispatch: ~$0.30-1.00/cycle
- Structured-extraction: ~$0.10-0.20/cycle
- DB reads: $0 (in-tenant)
- Total per cycle: ~$0.40-1.20

Monthly baseline: ~$2-5 (monthly cycle + quarterly aggregate digest cycle). Hard cap via Cluster A §13 reserve/settle; budget-cap-reached emits `18.cycle.halted.v1 { reason: 'budget-cap-reached' }`. Per-tenant budget config: `ProductRegistry.businessPlanningBudgetUsdMonthly` (default $10/tenant; admin-tunable).

### §13.21 — Dependency graph + authoritative-source contract (Obj #91 resolution)

| Category | Authoritative source | Partial-corpus behaviour when missing |
|---|---|---|
| Portfolio risk | Agent #12 `12.portfolio_risk.v1` | `degradedSources: ['portfolio_risk']`; recommendation set may miss portfolio-cascade signals |
| Evolution proposals | Agent #17 `17.evolution.proposal.v1` | `degradedSources: ['evolution_proposals']`; recommendation set will underweight composition-change opportunities |
| Marketplace intelligence | Agent #11 `11.marketplace_intelligence_report.v1` | `degradedSources: ['marketplace_intelligence']`; recommendation set will underweight emerging-trend factors |
| GTM assessments | Agent #9 `9.gtm.assessment.v1` cross-product | `degradedSources: ['gtm_assessments']`; recommendation set may miss GTM-readiness-tied recommendations |

**Biasing-when-partial transparency:** every `degradedSources` annotation triggers a `biasNote` field in the narrative summary describing which recommendation categories are likely under-represented.

### §13.29 — Drift baseline + category-specific thresholds + black-swan handling (Obj #69 / #75 / #84 / #88 / #92 resolution)

**Baseline computation:** rolling 3-month median + interquartile range (IQR), computed per category per tenant. Stored in `governance_record.drift_baselines[]` (per-category snapshots).

**Per-category thresholds:**

| Category | Threshold | Rationale |
|---|---|---|
| Pricing | ±10% | Low volatility; small swings are meaningful |
| Allocation | ±15% | Medium volatility; matches v1 default but now per-category specific |
| Headcount | ±5% | Low volatility; small swings indicate restructuring |
| Model-budget | ±25% | High volatility; model market shifts rapidly |
| Vendor-spend | ±15% | Medium volatility |
| (other categories) | ±20% default | Conservative default for unmodelled categories |

**`baselineConfidence` flag:** computed per drift detection. Confidence factors: (a) baseline window completeness (3 months of clean data → 1.0; gaps reduce), (b) IQR width relative to median (tighter IQR → higher confidence). Below 0.6 confidence → advisory-only (no alert; logged for next-cycle calibration).

**Black-swan handling:**
- Trigger A: ≥3 categories trip thresholds simultaneously in the same cycle.
- Trigger B: single category exceeds 2× normal threshold (e.g. model-budget +60% when normal is ±25%).
- Action: emit `18.plan_disruption.v1 { escalationRoute: 'ceo_direct' }` — bypasses normal drift-alert flow; CEO + admin notified directly per Locked Rule 13.

### §13.30 — Authority model clarification (Obj #93 resolution)

- **Build-authority:** `[RECOMMEND_ONLY]` — no executor path; no sibling Executor; no Phase 2 path.
- **Operational-authority:** read-only across all consumed topics + in-tenant SSOT reads.
- **Mode-agnosticism:** internal planning is mode-agnostic (single cross-tenant view of in-tenant portfolio); downstream consumers (CEO dashboard, admin UI) determine surfacing rules per their own mode.
- **Override path:** CEO + admin can override any recommendation via Panel-route per Locked Rule 13.
- **"Advisory only" enforcement:** ENFORCED by the absence of any side-effect emission topic in Agent #18's `produces` set. Test A18-X5 — attempts to emit on undeclared topic (e.g. `18.plan.execute.v1`) rejected at Cluster D `UNKNOWN_TOPIC` boundary.

### §13.31 — Cost-governor + LLM model selection precedence (Obj #94 resolution)

**Precedence:** Cluster A cost-signal (reserve/settle) ALWAYS WINS over Cluster F model-tier selection.

| Scenario | Behaviour |
|---|---|
| Cost budget allows requested tier | Use Cluster F selected tier; emit `agent.cost.signal.v1` |
| Cost budget denies requested tier | Cluster F cascades to next tier in ToolMenu per CA-11-A.4; retry reserve at lower tier |
| All tiers denied | `dispatchWithFallback` exhausts → emit `18.cycle.halted.v1 { reason: 'budget-cap-reached' }` |

**Feedback loop break:** Agent #18's own cost emissions carry `boundary class: 'business-planning'` per Cluster A v3 §3.1; this boundary class is EXCLUDED from `single-run-runaway` + `pattern-runaway` anomaly detectors (similar mechanism to Agent #23's `'cost-governor-self'` exclusion). Agent #18 will never self-trigger an anomaly via its own LLM dispatches.

## 14. Cluster C integration — see §13.4

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS audit-log topic schema (D-a/D-b/D-c)

Per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 + ENTRY 009.

- **D-a (envelope drift guards):** all 5 `18.*` topics conform to v3 §2.2 naming; legacy `18.plan.update.v1` removed; migration harness covers the 5 new topics.
- **D-b (retention-class binding):** `18.business_plan.v1`, `18.strategic_recommendation.v1`, `18.plan_disruption.v1` are `retention-class: governance` (7-year + hash-chain mirror; CEO-decision auditability). `18.cycle.halted.v1`, `18.cycle.empty.v1` are `retention-class: operational` (90-day).
- **D-c (replay-buffer semantics):** idempotency key `tenantId + planningHorizon + cycleStartedAt`.

**Topic-per-ship ceiling:** 5 net-new topics at ceiling — single first-ship commit.

**Load-test artifact gate:** shared Wave 1 cohort artifact per Cluster D AC-CD-11.

## 16. Cluster E integration — v3 + Option (a) LOCKED context

Agent #18 primary `[RECOMMEND_ONLY]`; no sibling Executor per §13.30. No charter change required; no roster mutation. Authoritative ceiling enforcement via `BaseAgent.guard()` per Cluster E v3 §2.5 applies on every dispatch.

---

## 17. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution location |
|---|---|---|
| **69/84/88/92** | Drift baseline + threshold subjectivity + brittleness | §13.29 — per-category thresholds + baselineConfidence + black-swan handling |
| **70/73** | Lack of clear metrics for recommendation impact | §13.5 — `expectedImpact` with confidence interval + actuals tracked |
| **75/84** | Unclear escalation policy / material drift definition | §13.29 — operationalised per category |
| **76** | Potential data leakage (productId) | §13.10 — in-tenant scope + sensitive-data scrubbing |
| **77** | Inadequate cost control | §13.20 — per-component breakdown + Cluster A hard cap |
| **78** | Incomplete Cluster A integration | §13 — full Path P1 paste block |
| **90/95/98** | Topic/schema split + naming inconsistency | §13.12 — 5 canonical topics; `18.plan.update.v1` removed |
| **91** | Cross-cluster inputs underdefined | §13.21 — authoritative-source contract + partial-corpus biasing transparency |
| **93** | Authority model unclear | §13.30 — `[RECOMMEND_ONLY]` enforced by absent emission topics |
| **94** | Cost-governor self-referential | §13.31 — Cluster A precedence + `business-planning` boundary class exclusion |
| **N/A** | VEU §1.1 market scope (CEO 2026-05-18) | §13.15 — full-market scope; narrowing recommendations rejected |

---

*End of Agent #18 Business Planning build blueprint v2. Panel `QUORUM_PLURALITY_A18-REVISE` 7/10 objections resolved per §17. Cluster paste blocks A-P1, C, D, E applied per §13-16. Pending W6 re-ratification.*
