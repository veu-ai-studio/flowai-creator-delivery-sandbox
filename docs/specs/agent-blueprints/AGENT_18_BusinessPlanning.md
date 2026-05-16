# Agent #18 — Business Planning — Build Blueprint

**Status:** DORMANT. Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 18 + CA-11-B.7 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `18` |
| Name | `Business Planning` |
| Mode | `cross-step` |
| Step | n/a (cross-step) |
| Embedding | **`flowai-only`** |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — produces strategic planning recommendations; never executes business decisions |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes Agent #12 Portfolio Risk + Agent #17 Product Evolution + Agent #11 Strategic Intelligence outputs; reads ProductSSOT `governance_record` history aggregated across products; ingests external business intelligence (commercial-rail performance metrics, conversion funnels per CA-9-C customer feedback).
- **Decide:** produces strategic planning recommendations on portfolio-level moves — product investments, deprecations, pricing changes, vendor renegotiations, expansion-vs-consolidation decisions per §2 democratization mission + §3 commercial model.
- **Execute:** emits planning envelope; CEO/admin acts.
- **Emit:** `18.business_plan.v1` + `18.strategic_recommendation.v1`.

## 3. MessageBus topics

**Consumes:**
- `12.portfolio_risk.v1`
- `17.evolution.proposal.v1`, `17.self_renewal_alert.v1`
- `11.marketplace_intelligence_report.v1`
- `9.gtm.assessment.v1` cross-product

**Produces:**
- `18.business_plan.v1` — payload: `{ at, planningHorizon: 'monthly'|'quarterly'|'annual', recommendations: [], productAllocations, evidenceLinks }`
- `18.strategic_recommendation.v1` — payload: `{ category, action, productId?, evidence, expectedImpact, at }`

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('analyze', { artifact: portfolioCorpus, criteria: 'strategic-planning' }, opts);
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
```

**Class skeleton:** mirrors Agent #12 cross-step pattern (`flowAiOnly: true`, `[RECOMMEND_ONLY]`).

## 7. OrchestratorHub wire-in pattern

Cross-step registration via `hub.registerCrossStep('business-planning', agent)`. Cadence: monthly (1st of month 13:00 UTC) + quarterly aggregate digest.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A18-N1 | Nominal | Monthly invocation produces business plan with ≥3 recommendations |
| A18-N2 | Nominal | Strong portfolio-risk signal triggers explicit allocation-shift recommendation |
| A18-M1 | Malformed | Missing upstream signals → emits empty plan with `insufficient-signal` flag |
| A18-E1 | Edge | All metrics flat for 90 days → plan emits stability-confirmation envelope |
| A18-X1 | Adversarial | Prompt-injection in upstream report does NOT alter recommendation framing |
| A18-X2 | Adversarial | Hostile getter pattern test |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A18-* tests passing
- Monthly invocation runs ≥3 consecutive months
- At least one strategic recommendation accepted + acted on per quarter
- W4 adversarial coverage ≥4 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agents #11, #12, #17 SHIPPED-GREEN
- **Provides to:** CEO dashboard + admin strategic-planning UI

## 11. Estimated build effort

**~8 W-hours** Phase 1.

## 12. Open clarification flags

- **Q:** Quarterly aggregate digest format — same Markdown+CSV+JSON triple per LD-8 reporting? **CLARIFICATION RECOMMENDED.**
