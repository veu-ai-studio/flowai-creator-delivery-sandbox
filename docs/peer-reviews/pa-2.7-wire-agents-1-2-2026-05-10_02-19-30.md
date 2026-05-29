# PA #2.7 — Wire Agents #1 + #2 — Peer Review

**Reviewer:** `openai/gpt-5` via OpenRouter
**Degraded:** no
**Latency:** 566 ms
**Agreement with Claude:** 90%
**Approve to commit:** YES_WITH_MINOR_TWEAKS

## Findings

```json
{
  "agreement_pct": 90,
  "correctness_concerns": [
    "Active registry does not enforce uniqueness of step numbers across different step-owner agents; getActiveStepOwner(step) will return the first match based on Map iteration, making ownership ambiguous if two agents claim the same step.",
    "registerAgent does not validate that a step-owner’s step is within the canonical step space (e.g., 1..8, excluding deploy) or aligned to known step keys; any positive integer is accepted.",
    "getActiveStepOwner iterates ACTIVE.values() and returns the first record with a matching step; iteration order depends on insertion, not step semantics, leading to nondeterminism if multiple candidates exist.",
    "routeJob continues to use static STEP_OWNERS rather than the active registry; this can create divergence between declared runtime wiring and routing decisions (additive now, but a potential source of confusion)."
  ],
  "recommend_only_concerns": [
    "OrchestratorHub.invokeStepOwner throws TypeError on missing ctx.runId; while agent errors are correctly wrapped, this hub-level validation can still propagate exceptions to callers, which could violate a strictly non-blocking recommendation flow if upstream doesn’t guard inputs."
  ],
  "broadcast_safety_concerns": [
    "MessageBus delivers the same payload object by reference to all handlers; a misbehaving handler can mutate payload and affect others. No freezing or cloning is applied to payloads.",
    "Test suite does not exercise async rejection propagation for broadcast handlers (i.e., a broadcast handler returning a rejected promise that is not internally caught), leaving the .catch-wrapping path unverified."
  ],
  "regression_concerns": [
    "None observed — executeStep and routeJob semantics appear unchanged and additive wiring does not alter prior behavior."
  ],
  "test_coverage_gaps": [
    "No test for multiple step-owner registrations claiming the same step number and the resulting ambiguity in getActiveStepOwner.",
    "No test that verifies MessageBus broadcast async handler rejections are caught and warned (broadcast_error_async path).",
    "No test for isolation among multiple broadcast handlers where one throws (only single broadcast handler attached in tests).",
    "No test path for OrchestratorHub.invokeStepOwner receiving a malformed envelope (non-throw) and wrapping it into a low-confidence envelope."
  ],
  "dispatch_alignment_gaps": [
    "Always-on supervisor phase mapping records many lifecycle events as 'route.decision' rather than distinguishing 'step.start' or other nuanced phases; the dispatch narrative mentions run.start/step.transition/run.complete/run.error, but AuditPhase types do not include run.* and current inference only maps completed/failed to step.success/step.failure.",
    "Active runtime registry is not referenced by OrchestratorHub routing; alignment between dynamic registration and routing remains manual via STEP_OWNERS and hub.registerStepOwnerAgent."
  ],
  "must_fix_before_commit": [
    "1. Enforce uniqueness of step ownership in the active registry (or at least in getActiveStepOwner) so that only one step-owner can claim a given step number; otherwise lookups are ambiguous and order-dependent.",
    "2. Protect broadcast payload integrity in MessageBus.publish by freezing or cloning the payload before fan-out to prevent one handler from mutating inputs observed by others."
  ],
  "nice_to_have_tweaks": [
    "1. In registerAgent, validate that step-owner 'step' is within the canonical allowed set (e.g., 1..8 with deploy excluded) or align the numeric step with known step keys to prevent invalid registrations.",
    "2. Have OrchestratorHub.invokeStepOwner return a low-confidence envelope on missing ctx.runId instead of throwing, keeping the recommend_only non-blocking property end-to-end.",
    "3. Add tests for: (a) async rejection in a broadcast handler (exercises messagebus.broadcast_error_async), (b) multiple broadcast handlers where one throws (assert others still run), and (c) malformed recommendation envelope returned by a step-owner (hub wraps to low-confidence).",
    "4. Consider optionally surfacing more precise phases in Agent #1’s broadcast lineage (e.g., inspect payload.event to tag 'step.start' where applicable) while staying within the current AuditPhase type set.",
    "5. Optionally integrate active registry awareness into routing (or assert consistency between STEP_OWNERS and active registrations) to avoid configuration drift."
  ],
  "approve": "YES_WITH_MINOR_TWEAKS"
}
```

Raw JSON: pa-2.7-wire-agents-1-2-2026-05-10_02-19-30.json