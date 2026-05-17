# Agent #12 — Portfolio Risk & Fire Detection — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_12_PortfolioRisk.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 12, §13 RLS, §22 Product-Agnostic Rule, CA-11-B.10 ToolMenu.
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=12 (lines 203–219).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `12` |
| Name | `Portfolio Risk & Fire Detection` |
| Mode | `cross-step` |
| Pipeline step owned | n/a |
| Build-authority | **recommend_only** in all phases. Produces risk reports + fire alerts; never executes mitigation (Self-Renewal Executor handles fixes per CA-7). |
| Operational-authority | **autonomous** for cross-product aggregation within `flowai-only` scope. |
| Current status | **DORMANT** — charter ratified; weekly scheduled job not wired. |
| Depends on | Agent #8 (Quality Audit) + Agent #21 (ACE Conductor) SHIPPED-GREEN; Agent #10 Monitor (`10.anomaly.v1`); Agent #13 Self-Protection (`13.threat.detected.v1` per `_registry.ts` line 209); ≥3 products registered for portfolio-level signals to be meaningful. |

---

## §2 — What This Agent Does

Portfolio Risk is FlowAI's cross-product "fire detection" agent. It sees the whole portfolio — every product, every audit score, every anomaly, every ACE crawl — and identifies risks that no single-product agent could see: cross-product dependency cascades, shared-vendor concentration risk (e.g. all 5 operator products on Vercel — single-vendor outage risk), correlated audit-score regressions across products, GTM-readiness slippage trends.

It emits two flavors of envelope:
- **`12.fire.p0/p1/p2.v1`** — portfolio-level fire alerts at three severity tiers (P0 immediate, P1 minutes, P2 weekly digest per escalation policy).
- **`12.health.daily.v1`** + **`portfolio.fire.v1`** — daily portfolio health digest + canonical portfolio-fire envelope.

The operator sees: a portfolio dashboard with the top portfolio-level risks ranked by severity, a daily portfolio-health digest, and immediate P0 fire alerts when something is on fire across multiple products.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 209)

```
consumes: ['10.anomaly.v1', '13.threat.detected.v1']
```

Plus by convention:

- `8.audit.completed.v1` across all products (cross-tenant aggregator within `flowai-only`).
- `21.gtm.readiness.v1` across all products.
- `26.orchestra.deprecated.v1` (vendor risk from Orchestra deprecations).

### §3.2 Input shape

```ts
{
  invocationKind: 'scheduled' | 'event-triggered' | 'admin-on-demand',
  scheduledAt: ISO8601,
  triggerEvent?: { topic, payload },
  productScope: 'flowai-only',
  portfolioCorpus: {
    products: Array<{ productId, latestAudit, latestAceReadiness, latestAnomalies }>,
    vendorMap: Record<vendor, productId[]>,
    orchestraDeprecations: Array<{ adapterId, deprecatedAt }>,
  },
}
```

### §3.3 Preconditions

- `productScope === 'flowai-only'` (cross-tenant aggregation restricted).
- ≥1 product registered (digest still emits for 1; portfolio-level signals require ≥3).
- ProductSSOT rows readable for all in-scope products.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` lines 210–216)

```
produces: [
  '12.fire.p0.v1', '12.fire.p1.v1', '12.fire.p2.v1',
  '12.health.daily.v1', 'portfolio.fire.v1'
]
```

Implementation also emits (reconcile at engineering dispatch):

- `12.product_alert.v1` — per-product surfacing when portfolio-level signal points at a specific product.

### §4.2 Output shape — `portfolio.fire.v1`

```ts
{
  at, productsAssessed: number,
  topRisks: Array<{
    category: 'vendor-concentration' | 'correlated-regression' | 'cascade-dependency',
    severity: 'p0' | 'p1' | 'p2',
    affectedProducts: string[],
    evidence: string,
  }>,
  trendIndicators: { audit30dDelta, gtm30dDelta, anomaly7dDelta },
}
```

### §4.3 Postconditions

- ColdStore lineage row written per invocation.
- P0 fires emit synchronously + invoke admin notification within 60s (escalation SLA).
- Daily digest written to admin dashboard.
- Per-product alerts emitted when portfolio signal narrows to a specific product.

---

## §5 — Pipeline Integration

### §5.1 Step owned

None. Registered via `hub.registerCrossStep('portfolio-risk', agent)`.

### §5.2 Upstream feeders

- All step agents across all in-scope products (audit, ACE, anomaly, GTM streams).
- Agent #13 Self-Protection (threat detected).
- Agent #26 Orchestra Research Agent (deprecation signals).

### §5.3 Downstream consumers

- **Agent #18 Business Planning** — consumes portfolio risk for strategic planning.
- **Agent #17 Product Evolution** — consumes for portfolio-wide composition decisions.
- **CEO dashboard** — top portfolio risks rendering.

### §5.4 Mode behavior

Mode-agnostic — Portfolio Risk is `flowai-only` scope; per-product mode doesn't affect aggregation. Mitigation actions downstream may be Mode-aware (Self-Renewal Executor in Mode 2/3 acts on fire alerts; Mode 1 only surfaces).

---

### §5.5 — Cluster Template Integration Blocks (v2 — per W3 Dispatch #11)

**Cluster A — Cost signaling** (per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v2):
Emits `agent.cost.signal.v1` before each LLM call (weekly cross-product risk
analysis). Agent #23 is the sole canonical enforcement owner. Call order per
Cluster A §2.6 v2 R4 applies per dispatch.

**Cluster B — Data quality gate** (per `CLUSTER_B_DATA_QUALITY_GATE.md` v2):
Effective threshold = `ProductRegistry.minimumDataQuality.agent_12_portfolio_risk.pageCountMin`
OR per-agent default: `pageCountMin: 1` (clamped to [1, 50]; portfolio-level
signals require ≥3 products declared in spec).
- Mode 1 + Mode 2 SUB-2A: below threshold → emit
  `agent.data_quality.insufficient.v1` and halt with `insufficient-signal`
  reason.
- Mode 3A (per Cluster B §2.7 v2 R1): if `dataQualityScore ≥ 0.3`, may
  emit `portfolio.fire.v1` with `outputQuality: 'degraded'`.
Upstream-halt tolerance per Cluster B §2.8 v2 R4: `degrade-on-any` (per-
product signal partial → digest aggregates available subset).

**Cluster C — Mode behavior:** agent output is identical across all pipeline
modes (Pattern P1 per Cluster C §2.3). `pipelineMode` field omitted from
emitted envelopes per Cluster C §2.4 v2 R2. Default Mode 1.

**Cluster D — MessageBus topics** (per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md`
v2): This agent emits per §4 — `12.fire.p0.v1`, `12.fire.p1.v1`,
`12.fire.p2.v1`, `12.health.daily.v1`, `portfolio.fire.v1` plus
`12.product_alert.v1` charter expansion. G12-Q5 from the original spec is
resolved by Cluster D — update `_registry.ts` at engineering dispatch.

**Cluster F — Model selection** (per `CLUSTER_F_MODEL_BUDGET_FALLBACK.md`
v2): Default tier `medium`; tier-policy `budget-flex` per Cluster F §2.1.2.
Selection:
1. `ProductRegistry.modelSelectionOverride[productId].medium`.
2. `FLOWAI_MODEL_TIER_MEDIUM` from Doppler.
3. `FLOWAI_MODEL_TIER_MEDIUM_FALLBACK_CHAIN` from Doppler.
4. `CLUSTER_F_DEFAULTS.medium` → `claude-sonnet-4-6`.
Selection re-read per dispatch. Tier-downgrade per Cluster F §2.5 v2 R2.

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent12PortfolioRisk.js` — ~480 LOC.
- `src/lib/agents/agents/__tests__/Agent12PortfolioRisk.test.js` — ~320 LOC.
- `src/lib/agents/agents/aggregators/portfolioAggregator.js` — cross-product corpus builder.
- `src/lib/agents/agents/classifiers/riskClassifier.js` — category + severity assignment.
- `src/components/admin/PortfolioFireDashboard.jsx` — admin UI surface.

### §6.2 Files to modify (existing)

- Scheduler / Inngest entry — weekly Mondays 04:00 UTC cadence + event-trigger on ≥3 `26.orchestra.deprecated.v1` within 7 days.

### §6.3 Estimated effort

**~10 W-hours** Phase 1.

### §6.4 Key engineering risks

1. **Cross-tenant scope ambiguity** — `flowai-only` is canonical, but multi-tenant FlowAI deployments are §22-permitted. Mitigation: §10 G12-Q5 disposition.
2. **False fire alerts** — P0 alerts that aren't real fires train operators to ignore. Mitigation: strict P0 criteria (e.g. ≥3 products affected, severity high+) and Panel-ratified thresholds.
3. **Vendor concentration false positives** — "all 5 on Vercel" is risk-flagged, but Vercel IS the canonical hosting choice. Mitigation: per-vendor allowlist (`portfolioRisk.vendorAllowlist`) ratified by Panel.
4. **P0 SLA enforcement** — 60s escalation requires synchronous emit + notification.
5. **Cost** — weekly classification across all products via Claude = ~$1–$3/week baseline; scales with portfolio size.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 208:

```
requiredCredentials: []
```

Optional via ToolMenu: `ANTHROPIC_API_KEY` for risk classification; `OPENROUTER_API_KEY` for fallback. Memory-only, scrubbed.

### §7.2 Data exfiltration controls

- Portfolio corpus assembled from internal sources only (ColdStore, ProductSSOT, MessageBus).
- Sent to Anthropic for analysis; scrubbed before emission.
- Per-product alerts include only the product's own data — no cross-product PII leakage.

### §7.3 Scope limiting

- `flowAiOnly: true` enforced at agent boundary; throws on cross-tenant read attempts.
- `client` role reads on `12.portfolio_risk.v1` rejected per §13 RLS (admin only).

### §7.4 Escalation policy (from `_registry.ts` lines 217–218)

```
escalationPolicy:
  'FlowAI-only. P0 fires escalate immediately to W0; P1 within minutes; P2 weekly digest.'
```

Concrete enforcement:

- P0 → synchronous notification adapter (admin email / Slack DM / PagerDuty) within 60s.
- P1 → batched notification within 5 minutes.
- P2 → weekly digest only.

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Cross-product corpus aggregation within `flowai-only` scope
- 3 risk categories (vendor-concentration, correlated-regression, cascade-dependency)
- 3 severity tiers (P0/P1/P2)
- Daily portfolio health digest
- Per-product alerts when signal narrows
- 60s P0 SLA

### §8.2 Deferred to Phase 2+

- ML-driven trend prediction (Phase 1 is rule-based + LLM classification)
- Auto-remediation hand-off to Self-Renewal Executor (Phase 1 surfaces; operator decides)
- Multi-tenant aggregation (Phase 1 is `flowai-only`)

### §8.3 What this agent CANNOT do — ever

- **Never executes mitigation directly.** Recommend-only; Self-Renewal Executor owns fixes.
- **Never crosses tenant boundary.** RLS enforced.
- **Never sends portfolio data to external services beyond Anthropic** (canonical LLM).

---

## §9 — Acceptance Criteria

1. **AC-12.1** — 5 products, mixed audit scores → digest aggregates correctly; lowest-scoring product surfaced as top risk. A12-N1.
2. **AC-12.2** — All 5 products on Vercel (not allowlisted) → vendor-concentration risk flagged severity `medium`. A12-N2.
3. **AC-12.3** — 3 products correlated audit regression same week → `correlated-regression` flagged with affected products. A12-N3.
4. **AC-12.4** — Client-role attempts read on `portfolio.fire.v1` → 403 per §13 RLS. A12-X1.
5. **AC-12.5** — Single-product portfolio → digest emits `productsAssessed: 1` with no portfolio-level signals. A12-E1.
6. **AC-12.6** — P0 fire emitted → admin notification fires within 60s. SLA test.
7. **AC-12.7** — Cross-tenant read attempt throws `SCOPE_VIOLATION`. A12-X1.

---

## §10 — Panel Questions

### G12-Q1 — Cross-tenant aggregation scope clarification

`flowAiOnly: true` — but §22 implies multi-tenant generality. Scope clarification:

- (a) Single-tenant only — Portfolio Risk sees only the FlowAI-operator's own portfolio (current `flowai-only` interpretation).
- (b) Multi-tenant aggregation within FlowAI deployment, but tenant-isolated reports (admin sees own tenant; never cross-tenant).
- (c) Multi-tenant aggregation with cross-tenant anonymization (admin can see "5 tenants in your industry experienced X" trends).
- (d) Operator-configurable per-deployment (`portfolioRisk.crossTenantMode`).
- (e) INSUFFICIENT_INFORMATION.

### G12-Q2 — Vendor concentration allowlist

If all 5 operator products are on Vercel (canonical), is that risk or normal?

- (a) Allowlist Vercel + canonical vendors (per Locked Rule 8); flag only non-canonical concentrations.
- (b) Always flag concentration regardless; let operator dismiss.
- (c) Concentration threshold (≥3 products on same vendor → flag; <3 OK).
- (d) Per-vendor risk-tier (cloud providers OK at 100%; LLM providers flagged at >60%).
- (e) INSUFFICIENT_INFORMATION.

### G12-Q3 — P0/P1/P2 thresholds

What defines P0 vs P1 vs P2?

- (a) P0 = ≥3 products affected + severity high+; P1 = ≥2 products OR severity critical single-product; P2 = trends.
- (b) P0 = customer-visible impact; P1 = operator-visible impact; P2 = internal-only.
- (c) Time-based — P0 = needs response in 1 hour; P1 = within 24 hours; P2 = within 7 days.
- (d) Per-product severity overrides — operator configures thresholds per product.
- (e) INSUFFICIENT_INFORMATION.

### G12-Q4 — Auto-remediation hand-off

When Portfolio Risk detects a P0 fire that Self-Renewal Executor could potentially fix, should there be an auto-handoff?

- (a) Never auto-handoff — Portfolio Risk emits; operator decides whether to dispatch Self-Renewal.
- (b) Auto-handoff for P0 only with operator opt-in per-product.
- (c) Auto-handoff with Build-authority Supervised gate (Self-Renewal opens PR + preview; operator merges).
- (d) Phase-deferred — Phase 1 surfaces only; Phase 2 adds optional auto-handoff.
- (e) INSUFFICIENT_INFORMATION.

### G12-Q5 — Topic name reconciliation

`_registry.ts` produces 5 topics; blueprint adds `12.product_alert.v1` + `12.portfolio_risk.v1`. Resolution?

- (a) Add the 2 new topics to `_registry.ts` at engineering dispatch.
- (b) Map blueprint's `12.portfolio_risk.v1` → existing `portfolio.fire.v1`.
- (c) Keep all 7 with distinct purposes.
- (d) Collapse to 3 canonical topics: P0/P1/P2 fires + daily health digest.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #12 Portfolio Risk engineering spec.*
