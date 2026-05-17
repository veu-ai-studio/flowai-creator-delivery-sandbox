# Agent #18 — Business Planning & Performance — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_18_BusinessPlanning.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 18, §2 democratization mission, §3 commercial model, CA-11-B.7 ToolMenu.
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=18 (lines 282–292).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `18` |
| Name | `Business Planning & Performance` |
| Mode | `cross-step` |
| Pipeline step owned | n/a |
| Build-authority | **recommend_only** in all phases. Produces strategic planning; never executes business decisions. |
| Operational-authority | **autonomous** for portfolio corpus assembly within `flowAiOnly: true` scope. |
| Current status | **DORMANT** — charter ratified. |
| Depends on | Agents #11, #12, #17 SHIPPED-GREEN. |

---

## §2 — What This Agent Does

Business Planning aggregates Portfolio Risk (Agent #12), Product Evolution (Agent #17), Strategic Intelligence (Agent #11), and per-product GTM assessments into strategic planning recommendations. It produces monthly business plans + quarterly aggregate digests covering: product investments, deprecations, pricing changes, vendor renegotiations, and expansion-vs-consolidation decisions.

Per escalation policy: "Plan deviations exceeding ±15% from prior baseline alert W0 within 24h." Material plan drift triggers admin alerts.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 288)

```
consumes: ['10.health.v1', 'portfolio.health.v1']
```

Plus by convention:

- `12.portfolio_risk.v1`, `portfolio.fire.v1`
- `17.evolution.proposal.v1`, `17.self_renewal_alert.v1`
- `11.marketplace_intelligence_report.v1`
- `9.gtm.assessment.v1` cross-product

### §3.2 Input shape

```ts
{
  invocationKind: 'scheduled-monthly' | 'scheduled-quarterly' | 'on-demand',
  scheduledAt: ISO8601,
  planningHorizon: 'monthly' | 'quarterly' | 'annual',
  portfolioCorpus: {
    portfolioRisk, productEvolution, strategicIntel, gtmAssessmentsCrossProduct,
    historicalPlans: Array<BusinessPlan>,
  },
  productScope: 'flowai-only',
}
```

### §3.3 Preconditions

- Upstream agents (#11, #12, #17) producing envelopes.
- ProductSSOT readable cross-product within `flowai-only`.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 289)

```
produces: ['18.plan.update.v1']
```

Implementation additionally emits:

- `18.business_plan.v1` — periodic planning envelope.
- `18.strategic_recommendation.v1` — per-recommendation envelope.

### §4.2 Output shape — `18.business_plan.v1`

```ts
{
  at, planningHorizon: 'monthly' | 'quarterly' | 'annual',
  recommendations: Array<{
    category: 'investment' | 'deprecation' | 'pricing' | 'vendor' | 'allocation',
    action: string,
    productId?: string,
    evidence: string[],
    expectedImpact: { revenue, cost, risk },
    confidence: 0-1,
  }>,
  productAllocations: Record<productId, AllocationDecision>,
  driftFromPriorBaseline: number,                 // signed percentage
  driftAlertTriggered: boolean,                   // true ⇔ |drift| > 15%
}
```

### §4.3 Postconditions

- ColdStore lineage row per plan.
- Quarterly aggregate digest written.
- Plan deviations ±15%+ → admin alert within 24h.

---

## §5 — Pipeline Integration

### §5.1 Step owned

None. `hub.registerCrossStep('business-planning', agent)` + monthly 1st 13:00 UTC + quarterly aggregate.

### §5.2 Upstream feeders

- Agents #11, #12, #17 (hard).
- Agent #9 (GTM cross-product).
- Agent #10 (health stream).

### §5.3 Downstream consumers

- **CEO dashboard.**
- **Admin strategic-planning UI.**
- **Agent #20 Environmental Impacts** (sustainability inputs).

### §5.4 Mode behavior

Mode-agnostic — `flowai-only` scope; planning is internal regardless of operator product mode.

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent18BusinessPlanning.js` — ~440 LOC.
- `src/lib/agents/agents/__tests__/Agent18BusinessPlanning.test.js` — ~280 LOC.
- `src/lib/agents/agents/aggregators/portfolioCorpusBuilder.js` — cross-agent input merge.
- `src/lib/agents/agents/prompts/businessPlanPrompt.js` — deterministic template.

### §6.2 Files to modify (existing)

- Scheduler — monthly + quarterly cadence registration.

### §6.3 Estimated effort

**~8 W-hours** Phase 1.

### §6.4 Key engineering risks

1. **±15% drift threshold subjectivity** — depends on baseline accuracy. Mitigation: rolling 3-month baseline; explicit `baselineConfidence` flag.
2. **Cross-product allocation decisions sensitive** — affects operator workstreams. Mitigation: `advisory: true` flag on all envelopes; CEO arbitration explicit.
3. **Cost** — monthly cross-product LLM analysis = ~$2–$5/month.
4. **Topic naming** — `_registry.ts` produces `18.plan.update.v1` only; implementation emits 3 topics. Reconcile at engineering dispatch.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 287:

```
requiredCredentials: ['ANTHROPIC_API_KEY']
```

Plus per ToolMenu: optional `OPENROUTER_API_KEY`. Memory-only, scrubbed.

### §7.2 Data exfiltration controls

- Portfolio corpus sent to Anthropic / OpenRouter (LLM) only.
- Recommendations contain `productId` references but no operator-product user PII.

### §7.3 Scope limiting

- `flowAiOnly: true` enforced.
- Cross-tenant aggregation per Agent #12 G12-Q1 disposition.

### §7.4 Escalation policy (from `_registry.ts` lines 290–291)

```
escalationPolicy:
  'FlowAI-only. Plan deviations exceeding ±15% from prior baseline alert W0 within 24h.'
```

Concrete enforcement:

- Drift computation per plan; |drift| > 15% → emit `18.business_plan.v1` with `driftAlertTriggered: true` + invoke admin notification within 24h.

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Monthly + quarterly business plan generation
- 5 recommendation categories
- Per-product allocation decisions
- ±15% drift alerting

### §8.2 Deferred to Phase 2+

- Real-time plan-drift detection (Phase 1 is monthly batch)
- Operator-configurable planning horizons
- ML-driven recommendation refinement

### §8.3 What this agent CANNOT do — ever

- **Never executes business decisions.** Advisory only.
- **Never crosses tenant boundary.**
- **Never names individual humans in recommendations.** Per Agent #16 person-data invariant analog.

---

## §9 — Acceptance Criteria

1. **AC-18.1** — Monthly invocation produces plan with ≥3 recommendations. A18-N1.
2. **AC-18.2** — Strong portfolio-risk signal → explicit allocation-shift recommendation. A18-N2.
3. **AC-18.3** — Missing upstream signals → empty plan with `insufficient-signal` flag. A18-M1.
4. **AC-18.4** — All metrics flat 90d → stability-confirmation envelope. A18-E1.
5. **AC-18.5** — Plan drift >15% → `driftAlertTriggered: true` + admin notified within 24h. SLA test.
6. **AC-18.6** — Prompt-injection in upstream reports does NOT alter recommendations. A18-X1.
7. **AC-18.7** — `ANTHROPIC_API_KEY` never persisted (canary).

---

## §10 — Panel Questions

### G18-Q1 — Topic naming reconciliation

`_registry.ts` produces `18.plan.update.v1` only. Blueprint adds `18.business_plan.v1` + `18.strategic_recommendation.v1`. Resolution?

- (a) Update `_registry.ts` to include all 3.
- (b) Collapse to `18.plan.update.v1` single topic with composite payload.
- (c) Keep 3 distinct topics — separation of concerns.
- (d) Rename for consistency: `18.business_plan.v1`, `18.recommendation.v1`, `18.allocation.v1`.
- (e) INSUFFICIENT_INFORMATION.

### G18-Q2 — ±15% drift threshold

Right threshold?

- (a) ±15% — current per escalation policy.
- (b) ±10% — more sensitive; more alerts.
- (c) ±20% — less sensitive; fewer alerts.
- (d) Per-category tuned (allocation 10%, pricing 20%, etc.).
- (e) INSUFFICIENT_INFORMATION.

### G18-Q3 — Planning horizon defaults

Monthly + quarterly canonical. Add annual?

- (a) Monthly + quarterly only.
- (b) Add annual aggregate (Jan 1st).
- (c) Operator-configurable per-deployment.
- (d) Monthly only — quarterly + annual deferred.
- (e) INSUFFICIENT_INFORMATION.

### G18-Q4 — Quarterly digest format

Per LD-8 reporting — Markdown + CSV + JSON?

- (a) All three (Markdown + CSV + JSON).
- (b) Markdown + JSON (skip CSV).
- (c) Markdown only.
- (d) Operator-configurable.
- (e) INSUFFICIENT_INFORMATION.

### G18-Q5 — CEO arbitration explicit

Are recommendations CEO-gated or admin-gated?

- (a) CEO-only (deferred to W0 for high-impact recommendations).
- (b) Admin-gated (admin acts; CEO informed via dashboard).
- (c) Severity-tiered — low/medium admin; high CEO.
- (d) Operator-configurable per-recommendation-category.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #18 Business Planning engineering spec.*
