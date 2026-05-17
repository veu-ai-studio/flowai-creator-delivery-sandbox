# Agent #20 — Environmental Impacts — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_20_EnvironmentalImpacts.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 20, Orchestra cost-ledger §7.1, CA-11-B.10 ToolMenu.
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=20 (lines 303–312).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `20` |
| Name | `Environmental Impacts` |
| Mode | `cross-step` |
| Pipeline step owned | n/a |
| Build-authority | **recommend_only** in all phases. Produces sustainability reports; never executes carbon-offset purchases autonomously. |
| Operational-authority | **autonomous** for cost-ledger consumption + carbon-factor lookup within budget. |
| Current status | **DORMANT** — charter ratified. |
| Depends on | Orchestra cost-ledger LIVE per §7.1 (assumed shipped post-CA-7+CA-8+CA-9+CA-10 promotions). |

---

## §2 — What This Agent Does

Environmental Impacts computes per-product + per-portfolio carbon footprint (CO₂e estimates per LLM token, per crawl-minute, per deployment). It consumes the Orchestra cost-ledger (`flowai_adapter_cost` per §7.1), aggregates Browserless minute usage and Vercel deployment energy estimates, and identifies sustainability-improvement opportunities (model-tier swap to lower tier where quality permits, regional re-routing to greener data centers).

Per escalation policy: "Assessment-only — escalates to #14 if regulatory thresholds approached." When carbon footprint approaches ESG-disclosure thresholds, Agent #20 alerts Agent #14 Public Policy for jurisdictional reporting obligations.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 309)

```
consumes: []
```

By convention:

- Orchestra cost-ledger (own dispatch) — `flowai_adapter_cost`.
- `19.cve_alert.v1` filtered to environmental risk (e.g. data-center water-stress).

### §3.2 Input shape

```ts
{
  invocationKind: 'scheduled-monthly',
  scheduledAt: ISO8601,
  productScope: { ... },
  costLedgerDigest: Array<CostEntry>,
  carbonFactors: Record<vendor, { co2ePerToken, co2ePerCrawlMinute, co2ePerDeployment }>,
  geoRoutingMap: Record<vendor, DataCenterGeoMap>,
}
```

### §3.3 Preconditions

- Orchestra cost-ledger reachable + populated.
- Carbon-emission factors data source resolved (see G20-Q1).

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 310)

```
produces: ['20.impact.assessment.v1']
```

Implementation additionally emits (charter expansion):

- `20.sustainability_report.v1` — periodic digest.
- `20.green_recommendation.v1` — per-recommendation envelope.

### §4.2 Output shape — `20.sustainability_report.v1`

```ts
{
  at, periodDays,
  productsAssessed: number,
  totalCo2eKg: number,
  topContributors: Array<{ productId, co2eKg, percentage }>,
  trendIndicators: { co2e30dDelta, modelTierMix, regionMix },
  esgThresholdProximity: Record<jurisdiction, percentageOfThreshold>,
}
```

### §4.3 Postconditions

- ColdStore lineage row per report.
- ESG threshold proximity ≥80% → emit `14.policy_assessment.v1` request to Agent #14.
- Monthly digest written to admin dashboard.

---

## §5 — Pipeline Integration

### §5.1 Step owned

None. `hub.registerCrossStep('environmental-impacts', agent)` + monthly 10th 14:00 UTC.

### §5.2 Upstream feeders

- Orchestra cost-ledger.
- Agent #19 Technological Evolution (environmental risk CVEs).

### §5.3 Downstream consumers

- **Agent #18 Business Planning** — sustainability inputs.
- **Agent #14 Public Policy** — ESG / regulatory reporting inputs.

### §5.4 Mode behavior

Mode-agnostic — runs monthly regardless of operator mode.

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent20EnvironmentalImpacts.js` — ~400 LOC.
- `src/lib/agents/agents/__tests__/Agent20EnvironmentalImpacts.test.js` — ~260 LOC.
- `src/lib/agents/agents/factors/carbonEmissionFactors.js` — emission-factor lookup (data source TBD per G20-Q1).
- `src/lib/agents/agents/aggregators/costLedgerAggregator.js` — cost → carbon conversion.

### §6.2 Files to modify (existing)

- Scheduler — monthly cadence registration.

### §6.3 Estimated effort

**~7 W-hours** Phase 1 (smallest-scope analyser in the dormant set).

### §6.4 Key engineering risks

1. **Carbon-emission factor data source** — third-party API (Cloud Carbon Footprint, Electricity Maps) vs static lookup tables. See G20-Q1.
2. **ESG disclosure threshold accuracy** — jurisdictional ESG thresholds vary; mis-classification creates liability. Mitigation: defer to Agent #14 for jurisdictional definitions.
3. **Topic naming** — `_registry.ts` produces `20.impact.assessment.v1`; implementation emits 2. Reconcile.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 308:

```
requiredCredentials: []
```

Optional Anthropic / OpenRouter for analysis. Memory-only, scrubbed.

### §7.2 Data exfiltration controls

- Cost-ledger content sent to Anthropic for analysis only.
- Carbon-factor API queries use vendor-agnostic geo identifiers (no operator-product PII).

### §7.3 Scope limiting

- Per Agent #12 G12-Q1 cross-tenant disposition.
- Aggregations bounded by `flowai-only` interpretation.

### §7.4 Escalation policy (from `_registry.ts` line 311)

```
escalationPolicy: 'Assessment-only — escalates to #14 if regulatory thresholds approached.'
```

Concrete enforcement:

- ESG threshold ≥80% → emit `14.policy_assessment.v1` request to Agent #14 synchronously.

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Monthly sustainability digest
- Per-product carbon footprint
- 4 green-recommendation categories (model-tier-swap, region-route, cache-reuse, token-budget-tightening)
- ESG threshold proximity tracking
- Hand-off to Agent #14 when thresholds approached

### §8.2 Deferred to Phase 2+

- Real-time carbon tracking (Phase 1 is monthly batch)
- Auto-implementation of green recommendations (Phase 1 surfaces; operator implements via Self-Renewal or manually)
- Carbon offset purchasing (never auto-purchases per escalation policy)

### §8.3 What this agent CANNOT do — ever

- **Never auto-purchases carbon offsets.** Recommend-only.
- **Never executes model-tier swaps.** Surfaces recommendation; Self-Renewal Executor + operator decide.
- **Never substitutes for ESG legal disclosure.** Output is operational; Agent #14 + legal counsel own disclosure.

---

## §9 — Acceptance Criteria

1. **AC-20.1** — Monthly invocation produces report with `totalCo2eKg` + top-3 contributors. A20-N1.
2. **AC-20.2** — High-tier model usage exceeds threshold → `model-tier-swap` recommendation emitted. A20-N2.
3. **AC-20.3** — Cost-ledger empty → `insufficient-signal` flag. A20-M1.
4. **AC-20.4** — ESG threshold ≥80% → Agent #14 notified via `14.policy_assessment.v1` request. SLA test.
5. **AC-20.5** — All-low-tier portfolio → zero-recommendation report. A20-E1.

---

## §10 — Panel Questions

### G20-Q1 — Carbon-emission factors data source

Third-party API or static lookup?

- (a) Static lookup tables (Cloud Carbon Footprint published factors); refreshed annually.
- (b) Third-party API (Electricity Maps real-time grid mix); higher fidelity, requires API key + cost.
- (c) Hybrid — static fallback + API when available.
- (d) Defer Phase 1 carbon-factor sourcing; ship with stub factors + warning until source resolved.
- (e) INSUFFICIENT_INFORMATION.

### G20-Q2 — Monthly cadence

10th of month 14:00 UTC. Right?

- (a) Monthly 10th — current.
- (b) Bi-weekly.
- (c) Quarterly — matches ESG reporting cycles.
- (d) Daily — track trends; higher cost.
- (e) INSUFFICIENT_INFORMATION.

### G20-Q3 — ESG threshold definition ownership

Who defines jurisdictional ESG thresholds?

- (a) Agent #14 Public Policy owns; #20 consumes Agent #14's threshold table.
- (b) Legal counsel defines; both #14 + #20 consume.
- (c) Hardcoded thresholds for major jurisdictions (EU CSRD, US SEC climate disclosure); updated annually.
- (d) Operator-configurable per-product per-jurisdiction.
- (e) INSUFFICIENT_INFORMATION.

### G20-Q4 — Topic naming reconciliation

`_registry.ts` produces `20.impact.assessment.v1`. Implementation emits 2 topics. Resolution?

- (a) Update `_registry.ts` to include both.
- (b) Collapse to single topic.
- (c) Keep separate (`20.sustainability_report.v1` for digest, `20.green_recommendation.v1` for action).
- (d) Rename for consistency.
- (e) INSUFFICIENT_INFORMATION.

### G20-Q5 — Cross-tenant aggregation interpretation

Per Agent #12 G12-Q1 — single-tenant or multi-tenant aggregation?

- (a) Single-tenant only.
- (b) Multi-tenant within FlowAI deployment.
- (c) Multi-tenant with anonymization.
- (d) Operator-configurable.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #20 Environmental Impacts engineering spec.*
