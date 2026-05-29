# Agent #17 — Product Evolution — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A17-REVISE` `QUORUM_PLURALITY_A17-REVISE` 7/10 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a per Dispatch revising 14 Wave-1-blocked specs)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 17 + Locked Rule 16 (Self-Renewal Alerts ≥monthly) + §8.1 deprecation gate + CA-11-B.10 ToolMenu + Cluster A v3 (Path P1) + Cluster C PROMOTED + Cluster D v3 + Cluster E v3 (Option (a) LOCKED) + **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)**.

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #47 / #62 (mode classification inconsistency — `_registry.ts` declares `cross-step` while blueprint declares `always-on`):** RESOLVED via §13.27 "mode classification canonicalisation" block. Agent #17's canonical mode is **`always-on`** per Rev-2.1 §15.1 row 17 + Locked Rule 16 (continuous portfolio composition monitoring). `_registry.ts` row 17 migrates from `cross-step` to `always-on` at Agent #17 first-ship commit. The cross-step classification in v1 `_registry.ts` was a drafting artefact; `always-on` is the canonical mode (mirrors Agent #3 Self-Renewal + Agent #13 Self-Protection + Agent #26 Orchestra Research patterns).
- **Obj #74 (overreliance on external services — Anthropic + OpenRouter dependency):** RESOLVED via §13.28 "external-service fallback contract" block. Multi-provider ToolMenu (Anthropic + OpenRouter frontier models + Perplexity) per §5 with `dispatchWithFallback` per CA-11-A.4. If ALL LLM providers exhaust: agent emits `17.cycle.degraded.v1 { reason: 'all-llm-providers-exhausted' }` and skips the LLM-narrative pass on this cycle; rule-based proposal generation continues (deterministic threshold-trip emissions). External-service dependency NEVER causes Agent #17 to silently fail; degradation is explicit.
- **Obj #16 / #38 (over-reliance on LLMs):** RESOLVED via §13.13 "LLM-grounding hardening" block. Proposal classification is HYBRID — (a) rule-based first pass (deterministic threshold checks on benchmark deltas + audit-history regression detection), (b) LLM second pass for narrative + mode-path framing only. Canonical `proposalCategory` field is rule-based.
- **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18):** §13.15 added. Agent #17's per-product evolution recommendations evaluate against FULL canonical market per `product_registry.market_definition`. Evolution recommendations cannot narrow the product to a sub-segment (e.g. recommending MyPregLife pivot to "Africa-only pregnancy users" is REJECTED — the FULL market is global per CEO instruction).
- **Cluster A Path P1 (A-a..A-d), Cluster C (PROMOTED), Cluster D (D-a/D-b/D-c), Cluster E v3 (Option (a) LOCKED):** §13, §14, §15, §16 added.
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification.

---

## 1. Agent identity (v2 — mode resolved to `always-on` per Obj #47 / #62)

| Field | Value |
|---|---|
| ID | `17` |
| Name | `Product Evolution` |
| **Mode (v2)** | **`always-on`** — continuous portfolio composition + per-product evolution monitoring per Locked Rule 16. v2 supersedes v1's `_registry.ts` `cross-step` artefact. `_registry.ts` row 17 migrates `mode: 'always-on'` at first-ship commit. |
| Step | n/a (always-on) |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — produces proposals; deprecation + composition changes are Panel + CEO gated per §8.1 + Locked Rule 13 |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes `15.benchmark.head_to_head.v1` (per CA-9-B expansion); consumes `26.orchestra.admitted.v1` + `26.orchestra.deprecated.v1` for portfolio composition state; consumes `8.audit.completed.v1` across products for product-level evolution signals; consumes ProductSSOT `delta_log` history for per-product trend signals.
- **Decide:** hybrid classification per §13.13 — rule-based threshold checks + LLM narrative. Identifies products NOT keeping up with marketplace evolution (>30 days behind per Locked Rule 16); recommends "add candidate X" or "deprecate member Y" per CA-9-B; produces per-product Self-Renewal Alerts framing each opportunity in Auto/Guided/Manual execution paths.
- **Execute:** emits proposals + alerts; admin/CEO triages. Cycle degradation per §13.28 when external LLM providers exhaust.
- **Emit:** see §3.

## 3. MessageBus topics

**Consumes:**
- `15.benchmark.head_to_head.v1` (per CA-9-B)
- `26.orchestra.admitted.v1`, `26.orchestra.deprecated.v1`
- `8.audit.completed.v1` across products
- `21.gtm.readiness.v1` (per ENTRY 006 — readiness-trend signals)

**Produces (4 net-new topics within ceiling):**
- `17.orchestra.deprecation_proposal.v1` — payload: `{ member_id, basis: 'sustained_low_rank'|'high_error_rate'|'capability_obsoleted', evidence_window_days, recommended_action, modelVersion?, promptHash?, outputHash?, pipelineMode, at }` (per CA-9-B)
- `17.evolution.proposal.v1` — payload: `{ productId, tenantId, proposalCategory, evidence, impact_score, mode_paths: { auto, guided, manual }, marketScope, at }`
- `17.self_renewal_alert.v1` — monthly per-product alert per Locked Rule 16 currency commitment
- `17.cycle.degraded.v1` — emitted when external LLM providers exhaust (§13.28) or when scheduled cycle yields no actionable signals

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('analyze', { artifact: { benchmarks, auditHistory, ssotDeltaLog }, criteria: 'evolution-narrative' }, opts);  // LLM advisory only
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
src/lib/agents/agents/productEvolution/                            # helper modules
  ruleBasedProposalDetector.js                                     # deterministic threshold checks
  externalServiceFallbackHandler.js                                # §13.28 degraded-cycle handler
```

**Class skeleton:** mirrors Agent #3 + Agent #13 + Agent #26 always-on pattern (`mode: 'always-on'`, `embedded`, `[RECOMMEND_ONLY]`).

```js
export class Agent17ProductEvolution extends BaseAgent {
  static charterId = 17;
  static charter() {
    const r = getAgent(17);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: false,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* rule-based threshold detection + LLM narrative */ }
  async act(ctx, plan) { /* emit proposals + alerts; degraded-cycle path per §13.28 */ }
  async recommend(ctx) { /* always-on cadence entry */ }
}
```

## 7. OrchestratorHub wire-in pattern

`always-on` registration via `hub.registerAlwaysOn('product-evolution', agent)`. Inngest scheduled jobs:
- Daily 06:00 UTC for benchmark + composition consumption
- Monthly first-of-month 12:00 UTC for Self-Renewal Alert per product per Locked Rule 16

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A17-N1 | Nominal | Benchmark stream shows candidate X exceeds wired member Y on capability Z → `17.orchestra.deprecation_proposal.v1` emitted with basis `sustained_low_rank` (rule-based) |
| A17-N2 | Nominal | Product audit-history shows 30+ days behind marketplace → `17.self_renewal_alert.v1` emitted |
| A17-N3 | Nominal | Self-Renewal Alert framed in 3 mode paths (Auto / Guided / Manual per Locked Rule 16) |
| A17-N4 | Nominal | Rule-based detector confidence ≥0.6 → LLM second-pass SKIPPED |
| A17-N5 | Nominal | All LLM providers exhaust → `17.cycle.degraded.v1` emitted; rule-based proposals still emit per §13.28 |
| A17-M1 | Malformed | Benchmark stream empty → no proposals; emits trace-level "insufficient signal" log |
| A17-E1 | Edge | Candidate JUST cleared Probation → not yet recommend deprecation of any existing member |
| A17-E2 | Edge | Mode `always-on` confirmed at registration: `validateRoster()` checks row 17 mode field matches `'always-on'` post-migration |
| A17-X1 | Adversarial | Hostile getter pattern test |
| A17-X2 | Adversarial | Cross-tenant alert blocked — agents in `embedded` scope see only own product data |
| A17-X3 | Adversarial | Market-narrowing recommendation attempt — proposal recommending MyPregLife pivot to "Africa-only" rejected per §13.15 VEU §1.1 |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A17-* tests passing
- `_registry.ts` row 17 mode field migrated to `'always-on'`; `validateRoster()` green
- Daily + monthly schedules wired in Inngest; ≥30 consecutive days produce envelopes
- At least one `17.evolution.proposal.v1` accepted + acted upon per quarter
- Self-Renewal Alert delivered monthly for each of the 5 VEU products with no false-positive escalations
- W4 adversarial coverage ≥5 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agent #15 Benchmarking + Agent #26 Orchestra Research SHIPPED-GREEN
- **Soft depends on:** Agent #8 Quality Audit SHIPPED-GREEN (for richer audit-history input); ProductSSOT canonical (LIVE per ENTRY 005)
- **Provides to:** Agent #26 (auto-admission gate informed by deprecation proposals) + admin/CEO dashboard

## 11. Estimated build effort

**~12 W-hours** Phase 1.

## 12. Open clarification flags

None blocking. Charter is unambiguous post-v2 mode-canonicalisation; CA-9-B expansion canonical per ENTRY 005.

---

## 13. Cluster A integration — Path P1 ACCEPT-WITH-CONDITIONS (v2 paste block, A-a..A-d)

Per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3 + ENTRY 009 Cluster A Path P1 verdict.

- **A-a (boundary-class):** Agent #17 is `always-on cross-tenant` cost-class; cost aggregated at agent×day grain. All LLM dispatches MUST call `costGovernor.reserve()` + `settle()` + emit `agent.cost.signal.v1`.
- **A-b/A-c:** advisory-lock + SERIALIZABLE per canonical Cluster A v3.
- **A-d (halt envelope):** budget-cap-reached → emit `17.cycle.degraded.v1 { reason: 'budget-cap-reached' }`; always-on cycle resumes on next scheduled window.

### §13.4 — Cluster C integration + mode boundary clarification (Obj #22 / #30)

Output mode-agnostic; `pipelineMode` field ALWAYS present per Obj #30; always-on value is `'always-on'` (or `'mixed'` for per-product portfolio scans).

### §13.10 — Security controls extension

LLM-generated proposal narratives carry audit trail (`modelVersion`, `promptHash`, `outputHash`) on every emit. Cross-tenant: tenant-scoped product data only; `tenantId` mandatory on every `17.evolution.proposal.v1` envelope. RLS enforced on ProductSSOT reads.

### §13.11 — SSOT field-ownership partition

Agent #17 has NO ProductSSOT write surface in Phase 1 (envelope-only output). No collision with other agents' SSOT scopes.

### §13.13 — LLM-grounding hardening (Obj #16 / #38 resolution)

Proposal classification HYBRID:
- **Rule-based primary (deterministic):** benchmark-delta threshold checks (head-to-head lead ≥ 0.15 → deprecation candidate); audit-history regression detector (≥3 consecutive cycles trending down). Outputs `{ proposalCategory, basis, confidence: 0..1 }`.
- **LLM secondary (advisory):** narrative + mode-path (Auto/Guided/Manual) framing ONLY when rule-based confidence < 0.6 or for narrative summary. Canonical `proposalCategory` REMAINS the rule-based output.

### §13.15 — VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)

Agent #17's per-product evolution recommendations evaluate against FULL canonical market per `product_registry.market_definition` (mirrors SSOT §1.1; PERMANENT). Per-product:
- **SAIGE**: recommendations target the FULL global EHS/ESG/CSR practitioner market; capability gaps measured against full-market needs.
- **RelTwin**: recommendations target ALL relationship-management use cases globally; pivots narrowing to sub-segments REJECTED.
- **ReachSMS**: recommendations target ALL community-building use cases globally.
- **PressAI**: recommendations target ALL content-creator markets globally.
- **MyPregLife**: recommendations target the FULL global pregnancy market; Africa-first launch context acknowledged but pivots to "Africa-only" REJECTED.

Test A17-X3 enforces — narrowing-recommendation attempts rejected at proposal-validation gate.

### §13.27 — Mode classification canonicalisation (Obj #47 / #62 resolution)

Agent #17 canonical mode is **`always-on`** per Rev-2.1 §15.1 row 17 + Locked Rule 16 (continuous portfolio composition monitoring). The v1 `_registry.ts` `cross-step` classification was a drafting artefact; v2 reconciles.

**Migration steps:**
1. `_registry.ts` row 17 mode field migrates from `'cross-step'` to `'always-on'` at Agent #17 first-ship commit.
2. `validateRoster()` accepts the migrated value (mode enum already includes `'always-on'` per other agents).
3. Always-on registration path: `hub.registerAlwaysOn('product-evolution', agent)` (instead of `hub.registerCrossStep`).
4. Inngest scheduled jobs (daily + monthly per §7) replace any cross-step on-demand dispatch path.

**Pattern alignment:** Agent #17 follows the same always-on shape as Agent #3 Self-Renewal + Agent #13 Self-Protection + Agent #26 Orchestra Research Agent.

### §13.28 — External-service fallback contract (Obj #74 resolution)

LLM provider exhaust handling (cascades through ToolMenu per CA-11-A.4):

| Step | LLM provider | Failure mode | Recovery |
|---|---|---|---|
| 1 | Anthropic API direct (`anthropic-api`) | timeout / 5xx / rate-limit | Fallback to OpenRouter frontier models |
| 2 | OpenRouter frontier models | timeout / 5xx | Fallback to Perplexity |
| 3 | Perplexity | timeout / 5xx | All LLM providers exhausted → emit `17.cycle.degraded.v1 { reason: 'all-llm-providers-exhausted' }` |
| 4 | (degraded path) | n/a | Rule-based proposal generation CONTINUES — deterministic threshold-trip emissions proceed without LLM narrative |

**Never silently fail:** every external-service failure causes either a fallback OR an explicit degraded-cycle envelope. The agent's primary value (rule-based proposal detection) is preserved even when ALL LLM providers are down.

## 14. Cluster C integration — see §13.4

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS audit-log topic schema (D-a/D-b/D-c)

Per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 + ENTRY 009.

- **D-a (envelope drift guards):** all 4 `17.*` topics conform to v3 §2.2 naming.
- **D-b (retention-class binding):** `17.orchestra.deprecation_proposal.v1`, `17.evolution.proposal.v1`, `17.self_renewal_alert.v1` are `retention-class: governance` (7-year + hash-chain mirror per §8.1 panel-gate auditability). `17.cycle.degraded.v1` is `retention-class: operational` (90-day).
- **D-c (replay-buffer semantics):** idempotency key `productId + proposalCategory + cycleStartedAt`.

**Topic-per-ship ceiling:** 4 net-new topics within single first-ship commit.

**Load-test artifact gate:** shared Wave 1 cohort artifact per Cluster D AC-CD-11.

## 16. Cluster E integration — v3 + Option (a) LOCKED context

Agent #17 primary `[RECOMMEND_ONLY]`; no sibling Executor (proposals are advisory; deprecation + composition changes are Panel + CEO gated per §8.1 + Locked Rule 13). No charter change required; no roster mutation. Authoritative ceiling enforcement via `BaseAgent.guard()` per Cluster E v3 §2.5 applies on every dispatch.

---

## 17. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution location |
|---|---|---|
| **47/62** | Mode classification inconsistency (cross-step vs always-on) | §13.27 — canonical `always-on`; `_registry.ts` migrates at first-ship |
| **74** | Overreliance on external services (Anthropic/OpenRouter) | §13.28 — 3-tier fallback + degraded-cycle envelope; rule-based path preserved |
| **16/38** | Over-reliance on LLMs | §13.13 — rule-based primary; LLM advisory only |
| **N/A** | VEU §1.1 market scope (CEO 2026-05-18) | §13.15 — full-market evolution scope; narrowing recommendations rejected |

---

*End of Agent #17 Product Evolution build blueprint v2. Panel `QUORUM_PLURALITY_A17-REVISE` 7/10 objections resolved per §17. Cluster paste blocks A-P1, C, D, E applied per §13-16. Pending W6 re-ratification.*
