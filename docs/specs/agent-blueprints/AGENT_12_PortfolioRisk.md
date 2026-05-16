# Agent #12 — Portfolio Risk — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 12 + CA-11-B.10 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `12` |
| Name | `Portfolio Risk` |
| Mode | `cross-step` |
| Step | n/a (cross-step) |
| Embedding | **`flowai-only`** |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — produces risk reports, never executes mitigation directly (Self-Renewal Executor handles fixes per CA-7) |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes pipeline outputs across ALL products under FlowAI's management (cross-tenant aggregator within FlowAI-internal scope per `flowAiOnly: true`); reads ProductSSOT rows across products to detect portfolio-level patterns.
- **Decide:** identifies risks that no single-product agent could see — cross-product dependency cascades, shared-vendor concentration risk (e.g. all 5 VEU products on Vercel — single-vendor outage risk), correlated audit-score regressions, GTM-readiness slippage trends.
- **Execute:** produces `12.portfolio_risk.v1` digest; surfaces top risks to admin UI + audit log; flags individual products for Self-Renewal Alert escalation per Locked Rule 16.
- **Emit:** `12.portfolio_risk.v1` consumed by Agent #18 Business Planning + Agent #17 Product Evolution + CEO dashboard.

## 3. MessageBus topics

**Consumes:**
- `8.audit.completed.v1` — across all products (cross-tenant aggregator)
- `21.gtm.readiness.v1` — across all products
- `10.anomaly.v1` — anomaly signals from all products
- `26.orchestra.deprecated.v1` — vendor risk from Orchestra deprecations

**Produces:**
- `12.portfolio_risk.v1` — payload: `{ at, productsAssessed: number, topRisks: [{ category: 'vendor-concentration'|'correlated-regression'|'cascade-dependency', severity, affectedProducts, evidence }], trendIndicators }`
- `12.product_alert.v1` — payload: `{ productId, alertCategory, evidence, recommendedAction, at }` (per-product surfacing when portfolio-level signal points at a specific product)

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
  async plan(ctx) { /* aggregate across products; detect patterns; classify risks */ }
  async act(ctx, plan) { /* emit 12.portfolio_risk.v1 + per-product alerts */ }
  async recommend(ctx) { /* cross-step entry */ }
}
```

## 7. OrchestratorHub wire-in pattern

Cross-step registration via `hub.registerCrossStep('portfolio-risk', agent)`. Scheduled cadence: weekly (Mondays 04:00 UTC) + on-demand admin invocation; event-triggered on ≥3 `26.orchestra.deprecated.v1` events within 7 days (vendor concentration alert).

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A12-N1 | Nominal | 5 products with mixed audit scores → portfolio digest aggregates correctly; surfaces lowest-scoring product as top risk |
| A12-N2 | Nominal | All 5 products on Vercel → vendor-concentration risk flagged with severity `medium` |
| A12-N3 | Nominal | 3 products show correlated audit regression in same week → `correlated-regression` risk flagged with affected products listed |
| A12-M1 | Malformed | One product's audit stream missing → portfolio digest computes on available subset; logs gap |
| A12-E1 | Edge | Only 1 product registered → no portfolio-level signals possible; emits empty digest with `productsAssessed: 1` |
| A12-X1 | Adversarial | Cross-tenant data leak attempt — Agent #12 within `flowai-only` scope; client-role read on `12.portfolio_risk.v1` → 403 per §13 |
| A12-X2 | Adversarial | Hostile getter pattern test |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A12-* tests passing
- Weekly scheduled invocation produces non-empty digest for ≥3 consecutive weeks
- Admin UI surfaces top 5 portfolio risks
- At least one `12.product_alert.v1` emitted per quarter on a real product signal
- W4 adversarial coverage ≥5 cases including cross-tenant isolation

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agents #8 (Quality Audit) + #21 (ACE Conductor) SHIPPED-GREEN — Portfolio Risk consumes their outputs
- **Soft depends on:** ≥3 products registered + active for portfolio-level signals to be meaningful
- **Provides to:** Agent #18 Business Planning (consumes for strategic planning) + Agent #17 Product Evolution (consumes for portfolio-wide composition decisions)

## 11. Estimated build effort

**~10 W-hours** Phase 1 (cross-product aggregator + risk classifier).

## 12. Open clarification flags

- **Q:** Cross-tenant aggregation within `flowAiOnly: true` scope — does Agent #12 see other providers' tenants in a multi-tenant FlowAI-as-platform deployment, or only VEU's 5 products? §22 Product-Agnostic Rule implies multi-tenant generality, but cross-tenant aggregation must be carefully gated. **NEEDS CEO/PANEL CLARIFICATION** for multi-tenant deployment scope.
