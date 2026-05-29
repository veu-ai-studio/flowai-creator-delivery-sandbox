# Agent #22 — Ops Runner Beta — Build Blueprint

**Status:** DORMANT. Step binding **NOT YET CANONICAL** per Rev-2.1 §27 OQ-2 ("Ops Runner #21–#25 step assignments not pinned in BaseAgent.js"). #21 was pinned as **Aggressive Crawl Conductor** per ENTRY 006; #22's step binding remains an Open Question awaiting CEO/Panel disposition.

**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 22 + §27 OQ-2 (unresolved step binding) + CA-11-B.10 ToolMenu (placeholder pending step disposition).

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `22` |
| Name | `Ops Runner Beta` |
| Mode | `step-owner` (proposed per Rev-2.1 §15.1 row 22) |
| Step | **TBD — NEEDS CEO/PANEL CLARIFICATION** (see §12 below) |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | dependent on step disposition; if assigned to a side-effect-bearing step, executor pattern per CA-7 §15.5 applies |

## 2. Perceive → Decide → Execute → Emit cycle

**Pending step binding.** Drafted as a placeholder pattern; refines once §27 OQ-2 disposition arrives.

Plausible roles surfaced by W3 analysis of remaining gaps in Rev-2.1 §15.1 + post-ENTRY 006 ToolMenu coverage:
- **Plausible Role A — Workflow Orchestration Conductor:** owns cross-step orchestration logic (e.g. when Agent #6 emits `block` and Agent #3 needs to re-route, #22 mediates).
- **Plausible Role B — External Integration Conductor:** owns 3rd-party integration management (Stripe Connect lifecycle, Zendesk webhook health, etc.) beyond Agent #4 Provider Onboarding's scope.
- **Plausible Role C — Renewal Verification Conductor:** owns the `re-crawl after fix → confirm clean` verification loop per §6 (currently handled inline by Self-Renewal Executor per CA-7).

## 3. MessageBus topics (placeholder)

**Consumes / Produces:** TBD pending step disposition.

If Plausible Role A → consumes step-completion + block topics from #6/#8/#3; produces `22.workflow.routing_decision.v1`.
If Plausible Role B → consumes `4.provider.onboarded.v1`; produces `22.integration.health.v1`.
If Plausible Role C → consumes `3.renewal.applied.v1`; produces `22.renewal.verified.v1` + `22.renewal.regression_detected.v1`.

## 4. Orchestra dispatch usage (placeholder)

```js
// Pending role disposition
orchestra.dispatch('analyze', { artifact, criteria: '<role-specific>' }, opts);
orchestra.dispatch('interact', { url }, opts);  // if verification role
```

## 5. ToolMenu (per CA-11-B.10 placeholder)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Playwright | `playwright` | low | `interact`, `crawl` |
| 2 | Browserless | `browserless` | low | `crawl`, `screenshot` |
| 3 | Anthropic API direct | `anthropic-api` | high | `analyze`, `summarize` |

Placeholder; refines on step disposition.

## 6. Implementation file structure (placeholder)

```
src/lib/agents/agents/Agent22OpsRunnerBeta.js                   # ~400 LOC (sized after role disposition)
src/lib/agents/agents/__tests__/Agent22OpsRunnerBeta.test.js    # ~260 LOC
```

## 7. OrchestratorHub wire-in pattern

Standard step-owner registration once step binding disposed. Until then, agent remains DORMANT in `_registry.ts` per existing `(TBD)` step annotation.

## 8. Test plan (placeholder)

Test set sized after role disposition. Minimum coverage mirrors Agent #3 9-test pattern (3 nominal + 3 malformed/edge + 3 adversarial).

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- Step binding canonical (resolves §27 OQ-2)
- Role + topics defined in this blueprint refined to canonical
- Test suite passing
- 7 consecutive clean Auto Runner runs (if step-owner) OR scheduled-cadence invocations (if cross-step)

## 10. Dependencies + sequencing notes

- **HARD BLOCKED on:** §27 OQ-2 disposition — until step + role canonical, this agent cannot ship.
- **Recommendation:** Panel consultation on Ops Runner #22/#24/#25 step bindings collectively (similar to ENTRY 006's pinning of #21 + the Layer 2 plan PG1 hint of #23 = Cost Governor).

## 11. Estimated build effort

**~10–14 W-hours** Phase 1 (sized to mid-range; refines on role disposition — Plausible Role A is lighter, Plausible Role C is heavier).

## 12. Open clarification flags

- **Q (BLOCKING):** Step binding + role definition for Agent #22 Ops Runner Beta — Rev-2.1 §27 OQ-2 remains unresolved. **NEEDS CEO/PANEL CLARIFICATION** before engineering dispatch. W3 surfaces Plausible Roles A/B/C above for Panel consideration.
