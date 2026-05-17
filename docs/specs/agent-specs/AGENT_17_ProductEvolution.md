# Agent #17 — Product Evolution — Engineering Spec

**Status:** DRAFT — pending W6 Panel ratification.
**Author:** W3, 2026-05-16.
**Reverse-engineered blueprint:** `docs/specs/agent-blueprints/AGENT_17_ProductEvolution.md`.
**Anchor canonical:** Rev-2.1 §15.1 row 17, Locked Rule 16 (Self-Renewal Alerts ≥monthly), §8.1 deprecation gate, CA-9-B charter expansion, CA-11-B.10 ToolMenu.
**Charter source of truth:** `src/lib/agents/_registry.ts` AGENT id=17 (lines 272–281).

---

## §1 — Agent Identity

| Field | Value |
|---|---|
| Agent number | `17` |
| Name | `Product Evolution` |
| Mode | `cross-step` (`_registry.ts` declares — blueprint says always-on; see G17-Q1 reconciliation) |
| Pipeline step owned | n/a |
| Build-authority | **recommend_only** in all phases. Produces proposals; deprecation + composition changes are Panel + CEO gated per §8.1 + Locked Rule 13. |
| Operational-authority | **autonomous** for benchmark + audit stream consumption within budget. |
| Current status | **DORMANT** — charter ratified. |
| Depends on | Agent #15 Benchmarking + Agent #26 Orchestra Research SHIPPED-GREEN; Agent #8 Quality Audit SHIPPED-GREEN (richer audit-history input); ProductSSOT (LIVE). |

---

## §2 — What This Agent Does

Product Evolution watches the marketplace and FlowAI's portfolio to identify products that are NOT keeping up. It consumes benchmark head-to-head streams (Agent #15), Orchestra composition state (Agent #26), and per-product audit history (Agent #8), and produces three flavors of envelope:

1. **`17.orchestra.deprecation_proposal.v1`** — when a wired Orchestra member is consistently underperforming, propose deprecation per §8.1.
2. **`17.evolution.proposal.v1`** — per-product recommendations: add a capability, remove a capability, refine workflow, add integration.
3. **`17.self_renewal_alert.v1`** — monthly per-product alert per Locked Rule 16 currency commitment, framing each opportunity in 3 mode paths (Auto / Guided / Manual).

The operator sees: a portfolio-evolution dashboard with proposals ranked by impact, monthly Self-Renewal Alerts per product, and Orchestra deprecation proposals for admin review.

---

## §3 — Input Contract

### §3.1 Consumes (from `_registry.ts` line 278)

```
consumes: ['8.audit.completed.v1', '15.benchmark.report.v1']
```

Plus by convention (CA-9-B expansion):

- `15.benchmark.head_to_head.v1`
- `26.orchestra.admitted.v1`, `26.orchestra.deprecated.v1`
- `21.gtm.readiness.v1` per ENTRY 006

### §3.2 Input shape

```ts
{
  invocationKind: 'scheduled-daily' | 'scheduled-monthly' | 'event-triggered',
  scheduledAt: ISO8601,
  benchmarkCorpus: Array<HeadToHeadResult>,
  auditHistory: Record<productId, AuditHistory30d>,
  orchestraComposition: { admitted, deprecated, probation },
}
```

### §3.3 Preconditions

- Benchmark stream available (≥30 days history for stable signal).
- ProductSSOT readable per product.

---

## §4 — Output Contract

### §4.1 Produces (from `_registry.ts` line 279)

```
produces: ['17.evolution.proposal.v1']
```

Implementation additionally emits (charter expansion per CA-9-B):

- `17.orchestra.deprecation_proposal.v1`
- `17.self_renewal_alert.v1`

### §4.2 Output shape — `17.evolution.proposal.v1`

```ts
{
  productId,
  proposalCategory: 'capability-add' | 'capability-remove' | 'workflow-refinement' | 'integration-add',
  evidence: string,
  impact_score: number,                         // ranked
  mode_paths: {
    auto: { description, riskBand, requiresHumanGate: false | true },
    guided: { description, riskBand, requiresHumanGate: true },
    manual: { description, riskBand, requiresHumanGate: true },
  },
  at: ISO8601,
}
```

### §4.3 Postconditions

- ColdStore lineage row.
- Daily benchmark consumption emits proposals as warranted.
- Monthly Self-Renewal Alert per product per Locked Rule 16.
- Deprecation proposals fed into Agent #26's auto-admission gate decisions.

---

## §5 — Pipeline Integration

### §5.1 Step owned

None. `hub.registerCrossStep('product-evolution', agent)` (or always-on per blueprint — see §1 conflict). Daily 06:00 UTC + monthly 1st 12:00 UTC.

### §5.2 Upstream feeders

- Agent #15 Benchmarking.
- Agent #26 Orchestra Research Agent.
- Agent #8 Quality Audit.
- Agent #21 ACE Conductor.

### §5.3 Downstream consumers

- **Agent #26** — auto-admission gate informed by deprecation proposals.
- **Agent #3 Self-Renewal** — consumes `17.evolution.proposal.v1` per `_registry.ts` line 105–107.
- **Admin/CEO dashboard.**

### §5.4 Mode behavior

Mode-agnostic for proposal generation; mode-aware for downstream action (Self-Renewal Executor consumes proposals only in Mode 2/3 with operator authority ceiling permitting).

---

## §6 — Implementation Plan

### §6.1 Files to create (new)

- `src/lib/agents/agents/Agent17ProductEvolution.js` — ~520 LOC.
- `src/lib/agents/agents/__tests__/Agent17ProductEvolution.test.js` — ~340 LOC.
- `src/lib/agents/agents/scorers/evolutionImpactScore.js` — ranking formula.
- `src/lib/agents/agents/prompts/selfRenewalAlertPrompt.js` — Auto/Guided/Manual frame template.

### §6.2 Files to modify (existing)

- Scheduler — daily 06:00 UTC + monthly 1st 12:00 UTC registration.

### §6.3 Estimated effort

**~12 W-hours** Phase 1.

### §6.4 Key engineering risks

1. **Mode classification (cross-step vs always-on)** — `_registry.ts` says cross-step; blueprint says always-on. Resolve at engineering dispatch (G17-Q1).
2. **3-mode-path framing requirement** — Locked Rule 16 requires Auto/Guided/Manual framing per alert. Mitigation: prompt template enforces 3-section output; validation rejects malformed.
3. **Deprecation false-positives** — recommending deprecation of a healthy member trains operators to ignore. Mitigation: require ≥60 days sustained low-rank evidence before proposal.
4. **Self-Renewal Alert cadence drift** — monthly cadence per Locked Rule 16; missed monthly = invariant violation. Mitigation: Inngest scheduled job + retry budget.

---

## §7 — Security Controls

### §7.1 Credential handling

From `_registry.ts` line 277:

```
requiredCredentials: ['ANTHROPIC_API_KEY']
```

Plus per ToolMenu: optional `OPENROUTER_API_KEY`. Memory-only, scrubbed.

### §7.2 Data exfiltration controls

- Portfolio corpus sent to Anthropic / OpenRouter (LLM) only.
- Per-product alerts include only the product's own benchmark + audit data.

### §7.3 Scope limiting

- Per-product alerts scoped to that product's own data.
- Deprecation proposals scoped to wired Orchestra members.

### §7.4 Escalation policy (from `_registry.ts` line 280)

```
escalationPolicy: 'Proposals are advisory; #3 owns whether to enact them.'
```

Concrete enforcement:

- All proposals carry `advisory: true` flag.
- Self-Renewal Executor (Agent #3) is canonical actor; Agent #17 never auto-acts.

---

## §8 — Honest Capability Boundary

### §8.1 Phase 1 capabilities

- Daily benchmark + audit consumption
- 3 proposal categories
- Monthly Self-Renewal Alerts per product (3 mode paths per Locked Rule 16)
- Deprecation proposals for Agent #26 gate

### §8.2 Deferred to Phase 2+

- ML-driven trend prediction (Phase 1 is rule-based + LLM analysis)
- Per-operator-vertical evolution baselines
- Cross-portfolio deprecation cascade detection

### §8.3 What this agent CANNOT do — ever

- **Never auto-enacts proposals.** Agent #3 owns enactment.
- **Never deprecates Orchestra members without 60-day sustained evidence.**
- **Never proposes against operator-attested invariants.**

---

## §9 — Acceptance Criteria

1. **AC-17.1** — Benchmark stream shows candidate X exceeds member Y → `17.orchestra.deprecation_proposal.v1` with `basis: sustained_low_rank`. A17-N1.
2. **AC-17.2** — Product 30+ days behind marketplace → `17.self_renewal_alert.v1` emitted. A17-N2.
3. **AC-17.3** — Self-Renewal Alert framed in 3 mode paths (Auto/Guided/Manual). A17-N3.
4. **AC-17.4** — Benchmark stream empty → no proposals; "insufficient signal" log. A17-M1.
5. **AC-17.5** — Candidate just cleared Probation → does NOT yet recommend deprecation. A17-E1.
6. **AC-17.6** — Cross-tenant alert blocked. A17-X2.
7. **AC-17.7** — `ANTHROPIC_API_KEY` never persisted (canary).

---

## §10 — Panel Questions

### G17-Q1 — Mode classification reconciliation

`_registry.ts` declares `mode: 'cross-step'`. Blueprint says `always-on`. Resolution?

- (a) Update `_registry.ts` to `always-on` to match blueprint (matches Locked Rule 16 continuous cadence).
- (b) Keep `cross-step` — Locked Rule 16 monthly cadence is "scheduled cross-step" not "always-on".
- (c) Reclassify in Rev-2.1 §15.1 with explicit always-on rationale.
- (d) Defer — operational behavior is identical either way; mode label is cosmetic.
- (e) INSUFFICIENT_INFORMATION.

### G17-Q2 — Deprecation evidence window

§6.4 risk #3 specifies ≥60 days sustained low-rank. Right window?

- (a) 60 days — current plan; conservative.
- (b) 30 days — faster deprecation; higher false-positive risk.
- (c) 90 days — most conservative; slower marketplace responsiveness.
- (d) Adaptive — shorter window for high-confidence underperformance, longer for marginal.
- (e) INSUFFICIENT_INFORMATION.

### G17-Q3 — Self-Renewal Alert 3-mode-path enforcement

Locked Rule 16 mandates Auto/Guided/Manual framing. How enforced?

- (a) Prompt template enforces 3-section output + validation rejects malformed.
- (b) Schema validation on envelope — `mode_paths` MUST have all 3 keys non-null.
- (c) Both (defense in depth).
- (d) Operator-configurable — some operators may prefer 2-path framing.
- (e) INSUFFICIENT_INFORMATION.

### G17-Q4 — Alert delivery channel

Where do monthly Self-Renewal Alerts surface?

- (a) Admin dashboard + email per product owner.
- (b) Admin dashboard only.
- (c) Email + Slack DM.
- (d) Operator-configurable per-product alert channel.
- (e) INSUFFICIENT_INFORMATION.

### G17-Q5 — Proposal acceptance feedback loop

When operator accepts a proposal, should Agent #17 track outcome to refine future proposals?

- (a) Track outcomes; ML-feedback Phase 2.
- (b) Track but don't auto-refine — log only.
- (c) No tracking — every proposal is a fresh recommendation.
- (d) Operator-configurable opt-in tracking.
- (e) INSUFFICIENT_INFORMATION.

---

*End of Agent #17 Product Evolution engineering spec.*
