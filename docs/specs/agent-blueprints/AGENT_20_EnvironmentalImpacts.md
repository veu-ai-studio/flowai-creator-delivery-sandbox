# Agent #20 — Environmental Impacts — Build Blueprint

**Status:** DORMANT. Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 20 + CA-11-B.10 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `20` |
| Name | `Environmental Impacts` |
| Mode | `cross-step` |
| Step | n/a (cross-step) |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — produces sustainability reports; never executes carbon-offset purchases or similar autonomously |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes Orchestra cost-ledger telemetry (`flowai_adapter_cost` per Orchestra spec §7.1) to compute LLM token usage; aggregates Browserless minute usage; reads Vercel deployment energy estimates (when available) via Vercel adapter telemetry; reads CVE-feed cross-cutting environmental risk signals (e.g. data-center water-stress alerts).
- **Decide:** computes per-product + per-portfolio environmental footprint (CO₂e estimates per token, per crawl-minute, per deployment); identifies sustainability-improvement opportunities (model-selection swap to lower-tier where quality permits, regional re-routing to greener data centers).
- **Execute:** emits monthly sustainability digest + recommendation envelopes.
- **Emit:** `20.sustainability_report.v1`, `20.green_recommendation.v1`.

## 3. MessageBus topics

**Consumes:**
- Orchestra cost-ledger (own dispatch)
- `19.cve_alert.v1` filtered to environmental risk categories

**Produces:**
- `20.sustainability_report.v1` — payload: `{ at, periodDays, productsAssessed, totalCo2eKg, topContributors, trendIndicators }`
- `20.green_recommendation.v1` — payload: `{ productId, category: 'model-tier-swap'|'region-route'|'cache-reuse'|'token-budget-tightening', estimatedSavingKgCo2e, evidence, at }`

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('analyze', { artifact: costLedgerDigest, criteria: 'carbon-impact-estimation' }, opts);
orchestra.dispatch('extract-structured', { text, schema: sustainabilitySchema }, opts);
```

## 5. ToolMenu (per CA-11-B.10)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze` |
| 2 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research` (carbon-emission factor tracking) |
| 3 | Google Gemini 2.5 Pro | `openrouter` (`google/gemini-2.5-pro`) | high | `analyze`, multimodal (geographic data-center mapping) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent20EnvironmentalImpacts.js                   # ~400 LOC
src/lib/agents/agents/__tests__/Agent20EnvironmentalImpacts.test.js    # ~260 LOC
```

**Class skeleton:** mirrors Agent #17 cross-step pattern (`embedded`, `[RECOMMEND_ONLY]`).

## 7. OrchestratorHub wire-in pattern

Cross-step registration via `hub.registerCrossStep('environmental-impacts', agent)`. Cadence: monthly (10th of month 14:00 UTC).

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A20-N1 | Nominal | Monthly invocation produces report with totalCo2eKg + top-3 contributors |
| A20-N2 | Nominal | Model-tier-swap recommendation when high-tier usage exceeds low-tier-permissible threshold |
| A20-M1 | Malformed | Cost-ledger empty → emits report with `insufficient-signal` flag |
| A20-E1 | Edge | All-low-tier portfolio → emits zero-recommendation report with positive-trend annotation |
| A20-X1 | Adversarial | Hostile getter pattern test |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A20-* tests passing
- Monthly invocation runs ≥3 consecutive months
- W4 adversarial coverage ≥3 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** Orchestra cost-ledger LIVE (per Orchestra spec §7.1 — assumed shipped post-CA-7+CA-8+CA-9+CA-10 promotions; if not, this is a soft-dependency blocker)
- **Provides to:** Agent #18 Business Planning (sustainability inputs); Agent #14 Public Policy (ESG / regulatory reporting inputs)

## 11. Estimated build effort

**~7 W-hours** Phase 1 (small-scope analyser).

## 12. Open clarification flags

- **Q:** Carbon-emission factors data source — third-party API (e.g. Cloud Carbon Footprint) vs static lookup tables? Periodic refresh cadence. **CLARIFICATION RECOMMENDED.**
- **Q:** ESG-reporting integration with Agent #14 Public Policy — for products with formal sustainability disclosure obligations. **CLARIFICATION RECOMMENDED.**
