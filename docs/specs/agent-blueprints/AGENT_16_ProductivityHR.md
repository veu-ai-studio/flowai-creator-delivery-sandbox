# Agent #16 — Productivity / HR — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A16-REVISE` plurality 5/10 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a per Dispatch revising 14 Wave-1-blocked specs)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 16 + CA-11-B.6 ToolMenu + Cluster A v3 (Path P1) + Cluster C PROMOTED + Cluster D v3 + Cluster E v3 (Option (a) LOCKED) + CA-10-A multi-tenant scope-resolution.

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #32 / #48 / #54 (cross-tenant scope ambiguity — `flowai-only` for Agents #12 and #16; Scope Enforcement Weakness):** RESOLVED via §13.18 "flowai-only scope resolution + scope guard" block. `flowAiOnly: true` for Agent #16 means: introspects FlowAI's OPERATING-MODEL productivity within a SINGLE tenant. Cross-tenant aggregation is HARD-PROHIBITED at the RLS layer (`tenant_id` predicate on every read). Multi-tenant FlowAI deployments scope per-tenant productivity cycles independently. Schema guards: `tenantId` mandatory on every envelope; cross-tenant query attempts rejected at canonical query builder.
- **Obj #61 (insufficient security controls — LLM-generated content):** RESOLVED via §13.10 "security controls extension" block. LLM-generated productivity narratives carry audit trail (model version, prompt hash, output hash, generation timestamp). Productivity-data scrubbing: developer names, panel-member identities, CEO communication content scrubbed before LLM prompt assembly per CA-10-E.2 patterns.
- **Obj #16 / #38 (over-reliance on LLMs):** RESOLVED via §13.13 "LLM-grounding hardening" block. Bottleneck classification is HYBRID — (a) rule-based first pass (deterministic threshold checks on audit-log signals: dispatch frequency, execution latency, review turnaround), (b) LLM second pass for narrative summary + recommendation framing only. Canonical `bottleneckCategory` field is rule-based.
- **Cluster A Path P1 (A-a..A-d), Cluster C (PROMOTED), Cluster D (D-a/D-b/D-c), Cluster E v3 (Option (a) LOCKED):** §13, §14, §15, §16 added.
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification.

---

## 1. Agent identity (v2 — `flowAiOnly` scope resolved per §13.18)

| Field | Value |
|---|---|
| ID | `16` |
| Name | `Productivity / HR` |
| Mode | `cross-step` |
| Step | n/a (cross-step) |
| Embedding | **`flowai-only`** (single-tenant introspection per §13.18; cross-tenant HARD-PROHIBITED) |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — produces productivity reports + flagging; never executes side effects on people-data |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes GovernanceAuditLog signals about FlowAI's own operating cadence (W0x dispatch frequency, Wx execution latency, Panel review turnaround, CEO acknowledgement gaps); consumes Sentry / PostHog telemetry on developer workflow. Scope: SINGLE TENANT per §13.18.
- **Decide:** hybrid bottleneck classification per §13.13 — rule-based threshold detection + LLM narrative advisory. Within `flowAiOnly: true` single-tenant scope — introspects FlowAI's OPERATING-MODEL productivity, NOT customer-product productivity.
- **Execute:** emits productivity-digest envelopes; surfaces recommended workflow refinements to admin.
- **Emit:** see §3.

## 3. MessageBus topics

**Consumes:**
- GovernanceAuditLog read stream (own dispatch); Sentry / PostHog telemetry (when wired)
- `panel_decision_*` topics (consultation cadence + turnaround signals)
- `agent.tool_selection.exhausted.v1` (per CA-11-A.5 — fallback-chain stress signals)

**Produces (3 net-new topics within ceiling):**
- `16.productivity_report.v1` — payload: `{ at, tenantId, bottlenecks: [], recommendations: [], trendsAcrossLast30d, modelVersion?, promptHash?, outputHash?, pipelineMode }`
- `16.workflow_bottleneck.v1` — payload: `{ bottleneckCategory, severity, affectedWorkstream, evidence, recommendedAction, tenantId, at }`
- `16.cycle.empty.v1` — emitted when scheduled cycle yields no bottlenecks

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('analyze', { artifact: scrubbedAuditLogDigest, criteria: 'workflow-narrative' }, opts);  // LLM advisory only
orchestra.dispatch('summarize', { text, maxTokens: 1500 }, opts);
```

## 5. ToolMenu (per CA-11-B.6)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `summarize` (narrative only) |
| 2 | Sentry | `sentry` (NEW deferred) | low | `monitor-errors` (developer-productivity signal) |
| 3 | PostHog | `posthog` (NEW deferred) | low | `monitor-product-analytics` (engagement signal) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent16ProductivityHR.js                   # ~380 LOC
src/lib/agents/agents/__tests__/Agent16ProductivityHR.test.js    # ~250 LOC
src/lib/agents/agents/productivityHR/                            # helper modules
  ruleBasedBottleneckDetector.js                                 # deterministic threshold detection
  productivityDataScrubber.js                                    # developer-PII scrubbing per §13.10
```

**Class skeleton:** mirrors Agent #12 v2 cross-step pattern (`flowAiOnly: true`, `[RECOMMEND_ONLY]`).

```js
export class Agent16ProductivityHR extends BaseAgent {
  static charterId = 16;
  static charter() {
    const r = getAgent(16);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: true,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* single-tenant rule-based detection + LLM narrative */ }
  async act(ctx, plan) { /* emit envelopes */ }
  async recommend(ctx) { /* cross-step entry */ }
}
```

## 7. OrchestratorHub wire-in pattern

Cross-step registration via `hub.registerCrossStep('productivity-hr', agent)`. Cadence: weekly Mondays 06:00 UTC + on-demand admin invocation. Multi-tenant deployments: each tenant gets its own scheduled cycle per §13.18.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A16-N1 | Nominal | 7 days of in-tenant audit-log digest → productivity report with bottlenecks identified |
| A16-N2 | Nominal | `agent.tool_selection.exhausted.v1` events >5/24h triggers `16.workflow_bottleneck.v1` `category: tool-fallback-saturation` |
| A16-N3 | Nominal | Rule-based detector confidence ≥0.6 → LLM second-pass SKIPPED for classification |
| A16-N4 | Nominal | Empty cycle (no bottlenecks) → emits `16.cycle.empty.v1` |
| A16-M1 | Malformed | Audit-log unreachable → fallback to in-memory recent-events buffer |
| A16-E1 | Edge | Zero bottlenecks in week → empty digest with positive-trend annotation |
| A16-X1 | Adversarial | Cross-tenant productivity-data leak attempt blocked (`flowAiOnly` single-tenant scope; RLS enforced per §13.18) |
| A16-X2 | Adversarial | Hostile getter pattern test |
| A16-X3 | Adversarial | Developer name leakage attempt: scrubber removes per-developer identifiers before LLM prompt assembly per §13.10 |
| A16-X4 | Adversarial | Cross-tenant query attempt at canonical query builder → rejected |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A16-* tests passing
- Weekly digest produced for ≥3 consecutive weeks (single tenant)
- At least one actionable workflow refinement surfaced + accepted by admin per quarter
- W4 adversarial coverage ≥4 cases including cross-tenant isolation + developer-PII scrub

## 10. Dependencies + sequencing notes

- **Hard depends on:** GovernanceAuditLog canonical (LIVE per §14)
- **Soft depends on:** Sentry / PostHog adapters wired (deferred); Agent #16 ships initial dispatch with audit-log + tool-selection signals only
- **Provides to:** Admin UI productivity dashboard (per-tenant scoped)

## 11. Estimated build effort

**~8 W-hours** Phase 1 (smallest dormant agent — narrow scope, modest signal set; +scrubber + tenant guard).

## 12. Open clarification flags

- **Q (RESOLVED v2 — scope hard-prohibited):** Scope of "productivity" within `flowAiOnly: true` — RESOLVED per §13.18 — single-tenant introspection of FlowAI's OPERATING MODEL; never customer-product user productivity; cross-tenant aggregation HARD-PROHIBITED via RLS.

---

## 13. Cluster A integration — Path P1 ACCEPT-WITH-CONDITIONS (v2 paste block, A-a..A-d)

Per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3 + ENTRY 009 Cluster A Path P1 verdict.

- **A-a (boundary-class):** Agent #16 is `cross-step flowai-only` cost-class; cost aggregated at agent×cycle×tenant grain. All LLM dispatches MUST call `costGovernor.reserve()` + `settle()` + emit `agent.cost.signal.v1`.
- **A-b/A-c:** advisory-lock + SERIALIZABLE per canonical Cluster A v3.
- **A-d (halt envelope):** budget-cap-reached → emit `16.cycle.empty.v1 { reason: 'budget-cap-reached' }`.

### §13.4 — Cluster C integration + mode boundary clarification (Obj #22 / #30)

Output mode-agnostic; `pipelineMode` field ALWAYS present per Obj #30; cross-step value is `'cross-step'`.

### §13.10 — Security controls extension (Obj #61 resolution)

LLM-generated productivity narratives carry audit trail:
- `modelVersion`, `promptHash` (SHA-256), `outputHash` (SHA-256), `at` MANDATORY when LLM dispatched.

Productivity-data scrubbing (BEFORE LLM prompt assembly):
- Developer names → `<dev-#>` tokens
- Panel-member identities → `<panel-member-#>` tokens
- CEO communication content → redacted (only frequency + turnaround metrics retained)
- Per-developer commit metadata: stripped to aggregate-only counts
- Per-`productivityDataScrubber.js` implementation; pattern set Panel-ratified before first-ship

Cross-tenant: `tenantId` field MANDATORY on every emit; RLS enforced on SSOT read; cross-tenant tampering rejected at schema validator (test A16-X4).

### §13.11 — SSOT field-ownership partition

Agent #16 has NO ProductSSOT write surface in Phase 1 (envelope-only output). No collision with other agents' SSOT scopes.

### §13.13 — LLM-grounding hardening (Obj #16 / #38 resolution)

Bottleneck classification HYBRID:
- **Rule-based primary (deterministic):** threshold checks on audit-log signals — dispatch frequency, execution latency, review turnaround. Outputs `{ bottleneckCategory, severity, confidence: 0..1 }`.
- **LLM secondary (advisory):** narrative paragraph + recommendation framing ONLY when rule-based confidence < 0.6. Canonical `bottleneckCategory` REMAINS the rule-based output.

### §13.18 — `flowAiOnly` scope resolution + scope guard (Obj #32 / #48 / #54 resolution)

Same pattern as Agent #12 v2 §13.18 — `flowAiOnly: true` for Agent #16 means **single-tenant introspection only**:

| Scope | Behaviour |
|---|---|
| In-tenant introspection of FlowAI's OPERATING MODEL | ALLOWED — across this tenant's W0x/Wx workstreams |
| Cross-tenant aggregation | HARD-PROHIBITED — RLS `tenant_id` predicate enforced |
| Customer-product end-user productivity | NEVER aggregated by Agent #16 (scope is FlowAI's own operating model, not customer products) |
| Multi-tenant FlowAI deployment | Each tenant gets its own scheduled cycle; no cross-tenant data path |
| `tenantId` field on every emit | MANDATORY per Cluster D schema |
| Cross-tenant query attempt | rejected at canonical query builder (test A16-X4) |

## 14. Cluster C integration — see §13.4

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS audit-log topic schema (D-a/D-b/D-c)

Per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 + ENTRY 009.

- **D-a (envelope drift guards):** all 3 `16.*` topics conform to v3 §2.2 naming + carry mandatory `tenantId` field per §13.18.
- **D-b (retention-class binding):** `16.productivity_report.v1`, `16.workflow_bottleneck.v1` are `retention-class: operational` (180-day; HR-adjacent but not legal-record). `16.cycle.empty.v1` is `retention-class: operational` (30-day).
- **D-c (replay-buffer semantics):** idempotency key `cycleStartedAt + tenantId + bottleneckCategory`.

**Topic-per-ship ceiling:** 3 net-new topics within single first-ship commit.

**Load-test artifact gate:** shared Wave 1 cohort artifact per Cluster D AC-CD-11.

## 16. Cluster E integration — v3 + Option (a) LOCKED context

Agent #16 primary `[RECOMMEND_ONLY]`; no sibling Executor (productivity reports are advisory; never executes side effects on people-data). No charter change required; no roster mutation. Authoritative ceiling enforcement via `BaseAgent.guard()` per Cluster E v3 §2.5 applies on every dispatch.

---

## 17. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution location |
|---|---|---|
| **32/48/54** | `flowAiOnly` cross-tenant scope ambiguity + scope-enforcement weakness | §13.18 — single-tenant hard-prohibited cross-tenant; RLS + scope guard |
| **16/38** | Over-reliance on LLMs | §13.13 — rule-based primary; LLM advisory only |
| **61** | Insufficient security controls (LLM content) | §13.10 — per-narrative audit trail + developer-PII scrubber |

---

*End of Agent #16 Productivity / HR build blueprint v2. Panel `PLURALITY_A16-REVISE` 5/10 objections resolved per §17. Cluster paste blocks A-P1, C, D, E applied per §13-16. Pending W6 re-ratification.*
