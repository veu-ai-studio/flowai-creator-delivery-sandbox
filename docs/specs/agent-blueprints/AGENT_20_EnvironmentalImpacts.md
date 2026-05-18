# Agent #20 — Environmental Impacts — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A20-REVISE` plurality 6/10 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a per Dispatch revising 14 Wave-1-blocked specs)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 20 + CA-11-B.10 ToolMenu + Cluster A v3 (Path P1) + Cluster C PROMOTED + Cluster D v3 + Cluster E v3 (Option (a) LOCKED) + **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)**.

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #68 / #80 / #89 (environmental carbon factors undefined — data source gap; no fallback):** RESOLVED via §13.32 "carbon-emission factor data source policy" block. PRIMARY data source: Cloud Carbon Footprint static lookup tables (open-source; bundled with the agent at build time — no runtime API dependency). SECONDARY (refresh): quarterly refresh against the Cloud Carbon Footprint GitHub release; refresh failure does NOT break the agent (cycle continues with previous quarter's table). TERTIARY (per-provider direct): Anthropic API direct + OpenAI direct + Google Cloud Carbon Footprint API (when available) for higher-precision per-token estimates; falls back to the static table when direct APIs unavailable. Carbon-factor `data_source` field on every `20.sustainability_report.v1` envelope indicates which source was used per category (LLM tokens, crawl minutes, deployment energy).
- **Obj #74 (overreliance on external services — Anthropic + OpenRouter):** RESOLVED via §13.28 "external-service fallback contract" block. Same pattern as Agent #17 v2 §13.28 — 3-tier LLM fallback (Anthropic → OpenRouter → Perplexity); all-providers-exhausted emits `20.cycle.degraded.v1`; rule-based carbon computation (purely deterministic given carbon-factor table) CONTINUES — Agent #20's primary value (carbon estimation) is preserved even when ALL LLM providers are down.
- **Obj #16 / #38 (over-reliance on LLMs):** RESOLVED via §13.13 "LLM-grounding hardening" block. Carbon-impact estimation is HYBRID — (a) rule-based primary (deterministic: tokens × CO₂e-per-token from §13.32 table; crawl minutes × CO₂e-per-minute; deployment energy × CO₂e-per-kWh by region), (b) LLM secondary for narrative summary + recommendation framing only. Canonical `totalCo2eKg` is rule-based; LLM provides advisory narrative.
- **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18):** §13.15 added. Agent #20's per-product environmental footprint analysis uses FULL canonical market context (e.g. MyPregLife's footprint analysis applies to its global user base, not Africa-only).
- **Cluster A Path P1 (A-a..A-d), Cluster C (PROMOTED), Cluster D (D-a/D-b/D-c), Cluster E v3 (Option (a) LOCKED):** §13, §14, §15, §16 added.
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification.

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

- **Perceive:** consumes Orchestra cost-ledger telemetry (`flowai_adapter_cost` per Orchestra spec §7.1) to compute LLM token usage; aggregates Browserless minute usage; reads Vercel deployment energy estimates (when available); reads CVE-feed cross-cutting environmental risk signals (e.g. data-center water-stress alerts).
- **Decide:** hybrid carbon estimation per §13.13 — rule-based primary (deterministic table lookup from §13.32) + LLM narrative advisory. Identifies sustainability-improvement opportunities (model-selection swap to lower-tier where quality permits, regional re-routing to greener data centers).
- **Execute:** emits monthly sustainability digest + recommendation envelopes; degradation per §13.28 when external LLM providers exhaust.
- **Emit:** see §3.

## 3. MessageBus topics

**Consumes:**
- Orchestra cost-ledger (own dispatch)
- `19.cve_alert.v1` filtered to environmental risk categories

**Produces (3 net-new topics within ceiling):**
- `20.sustainability_report.v1` — payload: `{ at, tenantId, periodDays, productsAssessed, totalCo2eKg, topContributors, trendIndicators, data_source: { llm_tokens, crawl_minutes, deployment_energy }, modelVersion?, promptHash?, outputHash?, pipelineMode }`
- `20.green_recommendation.v1` — payload: `{ productId, tenantId, category: 'model-tier-swap'|'region-route'|'cache-reuse'|'token-budget-tightening', estimatedSavingKgCo2e, evidence, at }`
- `20.cycle.degraded.v1` — emitted when external LLM providers exhaust (§13.28); rule-based carbon computation continues

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('analyze', { artifact: costLedgerDigest, criteria: 'carbon-narrative' }, opts);  // LLM advisory only
orchestra.dispatch('extract-structured', { text, schema: sustainabilitySchema }, opts);
```

## 5. ToolMenu (per CA-11-B.10)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze` (narrative only) |
| 2 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research` (carbon-factor table refresh research) |
| 3 | Google Gemini 2.5 Pro | `openrouter` (`google/gemini-2.5-pro`) | high | `analyze`, multimodal (geographic data-center mapping) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent20EnvironmentalImpacts.js                   # ~400 LOC
src/lib/agents/agents/__tests__/Agent20EnvironmentalImpacts.test.js    # ~260 LOC
src/lib/agents/agents/environmentalImpacts/                            # helper modules
  carbonFactorsTable.js                                                # §13.32 static Cloud Carbon Footprint lookup (bundled)
  carbonFactorsRefresher.js                                            # quarterly refresh job (non-blocking)
  ruleBasedCarbonComputer.js                                           # deterministic CO₂e computation
```

**Class skeleton:** mirrors Agent #17 v2 cross-step pattern (`embedded`, `[RECOMMEND_ONLY]`).

```js
export class Agent20EnvironmentalImpacts extends BaseAgent {
  static charterId = 20;
  static charter() {
    const r = getAgent(20);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: false,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* rule-based CO₂e computation from table + LLM narrative */ }
  async act(ctx, plan) { /* emit sustainability_report + green_recommendation */ }
  async recommend(ctx) { /* cross-step entry */ }
}
```

## 7. OrchestratorHub wire-in pattern

Cross-step registration via `hub.registerCrossStep('environmental-impacts', agent)`. Cadence: monthly (10th of month 14:00 UTC). Carbon-factor table refresh: quarterly (1st of Jan/Apr/Jul/Oct 02:00 UTC); refresh failure does NOT block monthly cycles.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A20-N1 | Nominal | Monthly invocation produces report with `totalCo2eKg` + top-3 contributors + per-category `data_source` annotation |
| A20-N2 | Nominal | Model-tier-swap recommendation when high-tier usage exceeds low-tier-permissible threshold |
| A20-N3 | Nominal | Rule-based carbon computation runs without LLM dispatch when narrative-budget exhausted |
| A20-N4 | Nominal | Carbon-factor table fresh (within quarter) → `data_source.llm_tokens: 'cloud_carbon_footprint_v2024-Q3'` annotation |
| A20-N5 | Nominal | All LLM providers exhaust → `20.cycle.degraded.v1` emitted; carbon report still emits with rule-based numbers |
| A20-M1 | Malformed | Cost-ledger empty → emits report with `insufficient-signal` flag |
| A20-M2 | Malformed | Quarterly refresh fails (GitHub release unreachable) → continues with previous quarter's table; logs `refresh-skipped` |
| A20-E1 | Edge | All-low-tier portfolio → emits zero-recommendation report with positive-trend annotation |
| A20-E2 | Edge | Per-provider direct API available (Google Cloud Carbon Footprint) → uses higher-precision per-token figure; `data_source` reflects |
| A20-X1 | Adversarial | Hostile getter pattern test |
| A20-X2 | Adversarial | Prompt-injection in cost-ledger evidence does NOT alter rule-based CO₂e computation |
| A20-X3 | Adversarial | Cross-tenant carbon-data tampering — `tenantId` field mismatch rejected at schema validator |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A20-* tests passing
- Monthly invocation runs ≥3 consecutive months
- Quarterly carbon-factor refresh runs successfully ≥1 full quarter
- W4 adversarial coverage ≥3 cases passing
- Rule-based carbon computation validated against ≥3 independent reference implementations (per §13.32 spec-validation gate)

## 10. Dependencies + sequencing notes

- **Hard depends on:** Orchestra cost-ledger LIVE (per Orchestra spec §7.1 — assumed shipped post-CA-7+CA-8+CA-9+CA-10 promotions); Cloud Carbon Footprint v2024-Q3 static table bundled at build time per §13.32
- **Soft depends on:** per-provider direct carbon-footprint APIs (when available; ships without)
- **Provides to:** Agent #18 Business Planning (sustainability inputs); Agent #14 Public Policy (ESG / regulatory reporting inputs)

## 11. Estimated build effort

**~7 W-hours** Phase 1 (small-scope analyser + carbon-factor table loader + quarterly refresh job + rule-based + LLM-narrative).

## 12. Open clarification flags

- **Q (RESOLVED v2 — canonical):** Carbon-emission factors data source — RESOLVED per §13.32 — primary is Cloud Carbon Footprint static table (bundled); quarterly refresh; per-provider direct APIs when available; refresh failure non-blocking.
- **Q (RESOLVED v2 — implementation):** ESG-reporting integration with Agent #14 Public Policy — Agent #20 emits `20.sustainability_report.v1` consumed by Agent #14 for ESG-disclosure preparation (per-product cycle).

---

## 13. Cluster A integration — Path P1 ACCEPT-WITH-CONDITIONS (v2 paste block, A-a..A-d)

Per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3 + ENTRY 009 Cluster A Path P1 verdict.

- **A-a (boundary-class):** Agent #20 is `cross-step cross-tenant` cost-class (reads global cost-ledger across products); cost aggregated at agent×cycle grain. All LLM dispatches MUST call `costGovernor.reserve()` + `settle()` + emit `agent.cost.signal.v1`. NOTE: Agent #20's own carbon-impact emission for its OWN LLM dispatches feeds back into its next monthly cycle — handled via boundary class `'environmental-impacts'` excluded from anomaly detectors per Cluster A v3 §3.1 (similar to Agent #18 v2 §13.31 + Agent #23's `'cost-governor-self'` exclusion).
- **A-b/A-c:** advisory-lock + SERIALIZABLE per canonical Cluster A v3.
- **A-d (halt envelope):** budget-cap-reached → emit `20.cycle.degraded.v1 { reason: 'budget-cap-reached' }`; rule-based carbon computation may still continue without LLM narrative.

### §13.4 — Cluster C integration + mode boundary clarification (Obj #22 / #30)

Output mode-agnostic; `pipelineMode` field ALWAYS present per Obj #30; cross-step value is `'cross-step'`.

### §13.10 — Security controls extension

LLM-generated sustainability narratives carry audit trail (`modelVersion`, `promptHash`, `outputHash`) on every emit. Cross-tenant: `tenantId` field MANDATORY on every emit; RLS enforced on cost-ledger reads (per-tenant scope).

### §13.11 — SSOT field-ownership partition

Agent #20 has NO ProductSSOT write surface in Phase 1. No collision with other agents' SSOT scopes.

### §13.13 — LLM-grounding hardening (Obj #16 / #38 resolution)

Carbon-impact estimation HYBRID:
- **Rule-based primary (deterministic):** `totalCo2eKg = SUM(tokens × CO₂e-per-token-per-model + crawl_minutes × CO₂e-per-minute + deployment_energy_kWh × regional_grid_CO₂e_factor)` using the §13.32 carbon-factor table. Outputs `{ totalCo2eKg, topContributors, confidence: 1.0 (deterministic) }`.
- **LLM secondary (advisory):** narrative summary + recommendation framing. Canonical `totalCo2eKg` REMAINS the rule-based output; LLM provides `narrativeSummary` advisory.

### §13.15 — VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)

Agent #20's per-product environmental footprint analysis uses FULL canonical market per `product_registry.market_definition`:
- **SAIGE**: footprint analysis covers global user base; carbon-impact-per-user metrics scale to full market.
- **RelTwin / ReachSMS / PressAI**: same — global market footprint analysis.
- **MyPregLife**: footprint covers global pregnancy user base (Africa-first launch context acknowledged but footprint analysis applies to full market scope).

Per-product carbon scaling: `co2e_per_user × estimated_user_count_full_market` for projected-scale impact assessments. Narrowing to sub-segment REJECTED.

### §13.28 — External-service fallback contract (Obj #74 resolution)

Same 3-tier pattern as Agent #17 v2 §13.28:

| Step | LLM provider | Failure mode | Recovery |
|---|---|---|---|
| 1 | Anthropic API direct | timeout / 5xx / rate-limit | Fallback to OpenRouter |
| 2 | OpenRouter (Gemini) | timeout / 5xx | Fallback to Perplexity |
| 3 | Perplexity | timeout / 5xx | All providers exhausted → emit `20.cycle.degraded.v1` |
| 4 | (degraded path) | n/a | Rule-based carbon computation CONTINUES — `totalCo2eKg` still emitted; narrative skipped |

**Never silently fail:** every external-service failure causes either a fallback OR an explicit degraded-cycle envelope. Agent #20's primary value (carbon estimation) is preserved.

### §13.32 — Carbon-emission factor data source policy (Obj #68 / #80 / #89 resolution)

**Tier 1 (PRIMARY — always available):** Cloud Carbon Footprint static lookup tables, bundled with the agent at build time. Versioned per quarterly release (e.g. `v2024-Q3`, `v2024-Q4`).
- LLM token CO₂e factors per model
- Crawl minute CO₂e factors per browser-engine
- Deployment energy CO₂e per kWh by region (AWS / GCP / Azure / Vercel data-center map)
- **No runtime API dependency.** Agent #20 always has a usable table.

**Tier 2 (SECONDARY — quarterly refresh):** Cloud Carbon Footprint GitHub release polled quarterly (`carbonFactorsRefresher.js`).
- Refresh runs at 1st of Jan/Apr/Jul/Oct 02:00 UTC.
- Refresh failure does NOT break the agent — logs `refresh-skipped` and continues with previous quarter's table.
- Successful refresh updates bundled table + emits `20.factor_refresh.v1` (advisory).

**Tier 3 (TERTIARY — per-provider direct APIs):** Anthropic API direct + OpenAI direct + Google Cloud Carbon Footprint API (when wired).
- Higher-precision per-token estimates available from per-provider APIs.
- Per-API outages do NOT break Agent #20 (falls back to Tier 1 static table).

**`data_source` annotation:** every `20.sustainability_report.v1` carries a `data_source` field per category indicating which tier was used:
```js
data_source: {
  llm_tokens: 'cloud_carbon_footprint_v2024-Q3' | 'anthropic_api_direct' | 'openai_api_direct',
  crawl_minutes: 'cloud_carbon_footprint_v2024-Q3',
  deployment_energy: 'cloud_carbon_footprint_v2024-Q3' | 'google_carbon_footprint_api'
}
```

Per-tier data-source switching is transparent; downstream consumers (Agent #18 Business Planning, Agent #14 Public Policy) can filter or weight reports by source tier.

**Spec-validation gate (per §9 graduation criteria):** rule-based carbon computation validated against ≥3 independent reference implementations (e.g. Google's Cloud Carbon Footprint reference, Microsoft's Sustainability Calculator, Hugging Face's CodeCarbon) before first-ship.

## 14. Cluster C integration — see §13.4

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS audit-log topic schema (D-a/D-b/D-c)

Per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 + ENTRY 009.

- **D-a (envelope drift guards):** all 3 `20.*` topics conform to v3 §2.2 naming.
- **D-b (retention-class binding):** `20.sustainability_report.v1`, `20.green_recommendation.v1` are `retention-class: governance` (7-year + hash-chain mirror; ESG-disclosure auditability). `20.cycle.degraded.v1` is `retention-class: operational` (90-day).
- **D-c (replay-buffer semantics):** idempotency key `tenantId + periodDays + cycleStartedAt`.

**Topic-per-ship ceiling:** 3 net-new topics within single first-ship commit.

**Load-test artifact gate:** shared Wave 1 cohort artifact per Cluster D AC-CD-11.

## 16. Cluster E integration — v3 + Option (a) LOCKED context

Agent #20 primary `[RECOMMEND_ONLY]`; no sibling Executor (sustainability reports are advisory; carbon-offset purchases or similar require human admin approval — not autonomous). No charter change required; no roster mutation. Authoritative ceiling enforcement via `BaseAgent.guard()` per Cluster E v3 §2.5 applies on every dispatch.

---

## 17. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution location |
|---|---|---|
| **68/80/89** | Carbon factors undefined / data source gap | §13.32 — 3-tier source policy + static table primary + quarterly refresh + per-provider tertiary |
| **74** | Overreliance on external services | §13.28 — 3-tier LLM fallback; rule-based carbon path preserved |
| **16/38** | Over-reliance on LLMs | §13.13 — rule-based primary (deterministic table); LLM narrative advisory |
| **N/A** | VEU §1.1 market scope (CEO 2026-05-18) | §13.15 — full-market footprint scope per product |

---

*End of Agent #20 Environmental Impacts build blueprint v2. Panel `PLURALITY_A20-REVISE` 6/10 objections resolved per §17. Cluster paste blocks A-P1, C, D, E applied per §13-16. Pending W6 re-ratification.*
