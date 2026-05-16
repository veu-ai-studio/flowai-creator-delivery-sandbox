# Agent #16 — Productivity / HR — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 16 + CA-11-B.6 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `16` |
| Name | `Productivity / HR` |
| Mode | `cross-step` |
| Step | n/a (cross-step) |
| Embedding | **`flowai-only`** |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — produces productivity reports + flagging; never executes side effects on people-data |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes GovernanceAuditLog signals about FlowAI's own operating cadence (W0x dispatch frequency, Wx execution latency, Panel review turnaround, CEO acknowledgement gaps); consumes Sentry / PostHog telemetry on developer workflow.
- **Decide:** identifies productivity bottlenecks in the FlowAI development cycle itself (e.g. W5x parallel-commit-protocol contention, Panel review fan-out exceeding 24h, CEO inbox-zero drift). Within `flowAiOnly: true` scope — Agent #16 introspects FlowAI's OPERATING-MODEL productivity, not customer-product productivity.
- **Execute:** emits productivity-digest envelopes; surfaces recommended workflow refinements to admin.
- **Emit:** `16.productivity_report.v1`, `16.workflow_bottleneck.v1`.

## 3. MessageBus topics

**Consumes:**
- GovernanceAuditLog read stream (own dispatch); Sentry / PostHog telemetry (when wired)
- `panel_decision_*` topics (consultation cadence + turnaround signals)
- `agent.tool_selection.exhausted.v1` (per CA-11-A.5 — fallback-chain stress signals)

**Produces:**
- `16.productivity_report.v1` — payload: `{ at, bottlenecks: [], recommendations: [], trendsAcrossLast30d }`
- `16.workflow_bottleneck.v1` — payload: `{ bottleneckCategory, severity, affectedWorkstream, evidence, recommendedAction, at }`

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('analyze', { artifact: auditLogDigest, criteria: 'workflow-productivity' }, opts);
orchestra.dispatch('summarize', { text, maxTokens: 1500 }, opts);
```

## 5. ToolMenu (per CA-11-B.6)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `summarize` |
| 2 | Sentry | `sentry` (NEW deferred) | low | `monitor-errors` (developer-productivity signal) |
| 3 | PostHog | `posthog` (NEW deferred) | low | `monitor-product-analytics` (engagement signal) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent16ProductivityHR.js                   # ~380 LOC
src/lib/agents/agents/__tests__/Agent16ProductivityHR.test.js    # ~250 LOC
```

**Class skeleton:** mirrors Agent #12 cross-step pattern (`flowAiOnly: true`, `[RECOMMEND_ONLY]`).

## 7. OrchestratorHub wire-in pattern

Cross-step registration via `hub.registerCrossStep('productivity-hr', agent)`. Cadence: weekly Mondays 06:00 UTC + on-demand admin invocation.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A16-N1 | Nominal | 7 days of audit-log digest → productivity report with bottlenecks identified |
| A16-N2 | Nominal | `agent.tool_selection.exhausted.v1` events >5/24h triggers `16.workflow_bottleneck.v1` `category: tool-fallback-saturation` |
| A16-M1 | Malformed | Audit-log unreachable → fallback to in-memory recent-events buffer |
| A16-E1 | Edge | Zero bottlenecks in week → empty digest with positive-trend annotation |
| A16-X1 | Adversarial | Cross-tenant productivity-data leak attempt blocked (`flowAiOnly` scope enforced) |
| A16-X2 | Adversarial | Hostile getter pattern test |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A16-* tests passing
- Weekly digest produced for ≥3 consecutive weeks
- At least one actionable workflow refinement surfaced + accepted by admin per quarter
- W4 adversarial coverage ≥4 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** GovernanceAuditLog canonical (already LIVE per §14)
- **Soft depends on:** Sentry / PostHog adapters wired (deferred); Agent #16 ships initial dispatch with audit-log + tool-selection signals only
- **Provides to:** Admin UI productivity dashboard

## 11. Estimated build effort

**~8 W-hours** Phase 1 (smallest dormant agent — narrow scope, modest signal set).

## 12. Open clarification flags

- **Q:** Scope of "productivity" within `flowAiOnly: true` — confirms agent introspects FlowAI's operating model, not customer-product end-user productivity. **CLARIFICATION RECOMMENDED** to canonicalise the scope distinction.
