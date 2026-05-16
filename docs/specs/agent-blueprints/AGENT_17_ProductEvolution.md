# Agent #17 — Product Evolution — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1 + CA-9-B charter expansion — Orchestra composition recommendation + deprecation proposals). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 17 + Locked Rule 16 (Self-Renewal Alerts ≥monthly) + §8.1 deprecation gate + CA-11-B.10 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `17` |
| Name | `Product Evolution` |
| Mode | `always-on` |
| Step | n/a (always-on — runs continuously) |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — produces proposals; deprecation + composition changes are Panel + CEO gated per §8.1 + Locked Rule 13 |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes `15.benchmark.head_to_head.v1` (per CA-9-B expansion); consumes `26.orchestra.admitted.v1` + `26.orchestra.deprecated.v1` for portfolio composition state; consumes `8.audit.completed.v1` across products for product-level evolution signals; consumes ProductSSOT `delta_log` history for per-product trend signals.
- **Decide:** identifies products NOT keeping up with marketplace evolution (>30 days behind per Locked Rule 16 currency commitment); recommends "add candidate X" or "deprecate member Y" per CA-9-B; produces per-product Self-Renewal Alerts framing each opportunity in Auto/Guided/Manual execution paths.
- **Execute:** emits proposals + alerts; admin/CEO triages.
- **Emit:** `17.orchestra.deprecation_proposal.v1` + `17.evolution.proposal.v1` + `17.self_renewal_alert.v1` (per-product).

## 3. MessageBus topics

**Consumes:**
- `15.benchmark.head_to_head.v1` (per CA-9-B)
- `26.orchestra.admitted.v1`, `26.orchestra.deprecated.v1`
- `8.audit.completed.v1` across products
- `21.gtm.readiness.v1` (per ENTRY 006 — readiness-trend signals)

**Produces:**
- `17.orchestra.deprecation_proposal.v1` — payload: `{ member_id, basis: 'sustained_low_rank'|'high_error_rate'|'capability_obsoleted', evidence_window_days, recommended_action, at }` (per CA-9-B)
- `17.evolution.proposal.v1` — payload: `{ productId, proposalCategory: 'capability-add'|'capability-remove'|'workflow-refinement'|'integration-add', evidence, impact_score, mode_paths: { auto, guided, manual }, at }`
- `17.self_renewal_alert.v1` — monthly per-product alert per Locked Rule 16 currency commitment

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('analyze', { artifact: { benchmarks, auditHistory, ssotDeltaLog }, criteria: 'evolution-recommendations' }, opts);
orchestra.dispatch('extract-structured', { text, schema: proposalSchema }, opts);
```

## 5. ToolMenu (per CA-11-B.10)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research` |
| 2 | Anthropic API direct | `anthropic-api` | high | `analyze`, `extract-structured` |
| 3 | OpenRouter (frontier models) | `openrouter` | high | `analyze`, `summarize` |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent17ProductEvolution.js                   # ~520 LOC
src/lib/agents/agents/__tests__/Agent17ProductEvolution.test.js    # ~340 LOC
```

**Class skeleton:** mirrors Agent #3 always-on pattern (`mode: 'always-on'`, `embedded`, `[RECOMMEND_ONLY]`).

## 7. OrchestratorHub wire-in pattern

`always-on` registration via `hub.registerAlwaysOn('product-evolution', agent)`. Inngest scheduled job:
- Daily 06:00 UTC for benchmark + composition consumption
- Monthly first-of-month 12:00 UTC for Self-Renewal Alert per product per Locked Rule 16

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A17-N1 | Nominal | Benchmark stream shows candidate X exceeds wired member Y on capability Z → `17.orchestra.deprecation_proposal.v1` emitted with basis `sustained_low_rank` |
| A17-N2 | Nominal | Product audit-history shows 30+ days behind marketplace → `17.self_renewal_alert.v1` emitted |
| A17-N3 | Nominal | Self-Renewal Alert framed in 3 mode paths (Auto / Guided / Manual per Locked Rule 16) |
| A17-M1 | Malformed | Benchmark stream empty → no proposals; emits trace-level "insufficient signal" log |
| A17-E1 | Edge | Candidate JUST cleared Probation → not yet recommend deprecation of any existing member |
| A17-X1 | Adversarial | Hostile getter pattern test |
| A17-X2 | Adversarial | Cross-tenant alert blocked — agents in `embedded` scope see only own product data |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A17-* tests passing
- Daily + monthly schedules wired in Inngest; ≥30 consecutive days produce envelopes
- At least one `17.evolution.proposal.v1` accepted + acted upon per quarter
- Self-Renewal Alert delivered monthly for each of the 5 VEU products with no false-positive escalations
- W4 adversarial coverage ≥5 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agent #15 Benchmarking + Agent #26 Orchestra Research SHIPPED-GREEN
- **Soft depends on:** Agent #8 Quality Audit SHIPPED-GREEN (for richer audit-history input); ProductSSOT canonical (already LIVE per ENTRY 005)
- **Provides to:** Agent #26 (auto-admission gate informed by deprecation proposals) + admin/CEO dashboard

## 11. Estimated build effort

**~12 W-hours** Phase 1.

## 12. Open clarification flags

None blocking. Charter is unambiguous; CA-9-B expansion canonical post-ENTRY 005.
