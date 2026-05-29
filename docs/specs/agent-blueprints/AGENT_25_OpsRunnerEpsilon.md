# Agent #25 — Ops Runner Epsilon — Build Blueprint

**Status:** DORMANT. Step binding **NOT YET CANONICAL** per Rev-2.1 §27 OQ-2.

**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 25 + §27 OQ-2.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `25` |
| Name | `Ops Runner Epsilon` |
| Mode | `step-owner` (proposed) |
| Step | **TBD — NEEDS CEO/PANEL CLARIFICATION** (see §12 below) |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |

## 2. Perceive → Decide → Execute → Emit cycle

**Pending step binding.** Drafted as a placeholder pattern.

Plausible roles surfaced by W3 analysis:
- **Plausible Role A — Capability Transfer Conductor:** owns the L4 Capability Transfer surface (§4 + §20.1) — packaging FlowAI capabilities (Self-Renewal, Self-Protection) into install sprints for target products. Today the page exists at `/capability-transfer` but is operator-driven; #25 could automate the L4 workflow.
- **Plausible Role B — Panel Operations Conductor:** owns the 10-AI Panel scheduling, slot health, engagement monitoring, panel-composition rebalancing per `docs/panel-consultations/PANEL_COMPOSITION_REBALANCE_2026-05-14.md`. Today this is W6-orchestrated; #25 could automate the slot-health checks.
- **Plausible Role C — Onboarding / Provisioning Conductor:** owns new-product onboarding workflow end-to-end (registers product in `ProductRegistry`, provisions ProductSSOT row, allocates Doppler vault paths per §22, runs first-time Aggressive Crawl per ENTRY 006, generates Capability Transfer install sprint).

## 3. MessageBus topics (placeholder)

**Consumes / Produces:** TBD pending step disposition.

If Plausible Role A → consumes `capability_transfer.request.v1`; produces `25.capability_package.generated.v1`, `25.capability_install.scheduled.v1`.
If Plausible Role B → consumes `panel_decision_*` topics + slot-health pings; produces `25.panel.composition_proposal.v1`, `25.panel.slot_health_alert.v1`.
If Plausible Role C → consumes `provider.onboarding.request.v1`; produces `25.product.provisioned.v1`.

## 4. Orchestra dispatch usage (placeholder)

```js
orchestra.dispatch('generate-from-scratch', { spec, framework }, opts);  // if Role A package generation
orchestra.dispatch('analyze', { artifact, criteria: '<role-specific>' }, opts);
```

## 5. ToolMenu (per CA-11-B.10 placeholder)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `generate-from-scratch` |
| 2 | Claude Code | `claude-code` | high | `code-patch`, `generate-from-scratch` (if Role A install-sprint generation) |
| 3 | Vercel | `vercel` | free | `deploy` (if Role C provisioning) |

Placeholder; refines on role disposition.

## 6. Implementation file structure (placeholder)

```
src/lib/agents/agents/Agent25OpsRunnerEpsilon.js                   # ~440 LOC
src/lib/agents/agents/__tests__/Agent25OpsRunnerEpsilon.test.js    # ~280 LOC
```

## 7. OrchestratorHub wire-in pattern

Pending step + mode disposition.

## 8. Test plan (placeholder)

Test set sized after role disposition. Minimum coverage mirrors Agent #3 9-test pattern.

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- Step + role canonical (resolves §27 OQ-2 for this slot)
- Test suite passing
- End-to-end workflow per chosen role demonstrated

## 10. Dependencies + sequencing notes

- **HARD BLOCKED on:** §27 OQ-2 disposition
- **Recommendation:** Panel consultation alongside #22 + #24 + #23 disposition. The remaining three Ops Runners (#22, #24, #25) should be dispositioned together since the role pool — Workflow Orchestration / Audit Integrity / Multi-tenant Isolation / Backup-DR / Capability Transfer / Panel Operations / Onboarding-Provisioning — is shared across the three slots.

## 11. Estimated build effort

**~12–18 W-hours** Phase 1 (refines on role; Plausible Role A — Capability Transfer — is heaviest given L4 surface coverage).

## 12. Open clarification flags

- **Q (BLOCKING):** Step binding + role definition for Agent #25 Ops Runner Epsilon. **NEEDS CEO/PANEL CLARIFICATION**. W3 surfaces Plausible Roles A/B/C for Panel consideration; recommends joint disposition with #22 + #24 + #23 to allocate the 4 remaining Ops Runner slots coherently.
