# Agent #7 — Design — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 7 + §9 step 2 design + CA-11-B.3 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `7` |
| Name | `Design` |
| Mode | `step-owner` |
| Step | **2 — `design`** |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | `design-executor` — needed when Design dispatches `dispatch('design', ...)` to v0/Lovable and writes generated assets to ProductSSOT `architecture_snapshot.pages[]`; pattern mirrors Self-Renewal Executor (CA-7 §15.5) with authority `[auto_write_internal, requires_human_gate]` |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes `6.research.findings.v1` from upstream Research; consumes ProductSSOT `architecture_snapshot.pages[]` for existing-page context (per CA-10-D symbiotic loop).
- **Decide:** produces design spec — visual design choices (color, typography, layout), UX flows, mobile responsiveness requirements per §6 mobile+desktop coverage.
- **Execute (Phase 1 recommend_only):** persists draft design spec to HotStore + ColdStore lineage; emits `7.design.spec.v1` for Agent #2 Code Builder consumption.
- **Execute (Phase 2 via Executor):** dispatches `design` action to v0/Lovable/Base44 to actually generate UI files; writes generated files to ProductSSOT and renewedUrl deploy queue.
- **Emit:** `7.design.spec.v1` consumed by Agent #2 Code Builder + Agent #8 Quality Audit (for design-dimension scoring).

## 3. MessageBus topics

**Consumes:**
- `6.research.findings.v1` — upstream research context
- `1.product.lifecycle_event.v1` — stage transitions from Agent #1
- (Phase 2) `10.ssot.updated.v1` — for symbiotic-loop input

**Produces:**
- `7.design.spec.v1` — payload: `{ runId, productId, spec: { productName, productConcept, targetUsers, coreClaims, detectedFeatures, designSystem: { palette, typography, layout }, responsiveBreakpoints }, confidence, at }`
- (Phase 2 via Executor) `7.design.generated.v1` — payload includes `files[]` from v0/Lovable dispatch + deploymentId

## 4. Orchestra dispatch usage (per §15.4)

```js
// Phase 1: pure analysis path
orchestra.dispatch('analyze', { artifact: researchFindings, criteria: 'design-spec' }, opts);

// Phase 2 (Executor): generate actual UI
orchestra.dispatch('design', { spec, framework: 'vite-react' }, opts);
// OR for code-patch on an existing UI:
orchestra.dispatch('code-patch', { filePath, sourceContent, issueSpec }, opts);
```

## 5. ToolMenu (per CA-11-B.3)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | v0 (Vercel) | `v0` | medium | `design`, `generate-from-scratch`, `code-patch` |
| 2 | Lovable | `lovable` (archived per §8.1; reactivation pending) | medium | `design`, `generate-from-scratch` |
| 3 | Bolt.new | `bolt-new` (Orchestra candidate, Tier 2) | medium | `design`, `generate-from-scratch`, `build`, `deploy` |
| 4 | Firebase Studio | `firebase-studio` (Orchestra candidate, Tier 2) | medium | `design`, `generate-from-scratch`, `build`, `deploy` |
| 5 | Base44 | `base44` (deferred per §8.1) | medium | `design`, `source-retrieval`, `build` |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent7Design.js                   # ~480 LOC
src/lib/agents/agents/__tests__/Agent7Design.test.js    # ~340 LOC
```

Phase 2 (executor; deferred until v0 reaches Probation status per §8.1):
```
src/lib/agents/agents/Agent7DesignExecutor.js           # ~440 LOC mirroring Agent3SelfRenewalExecutor
# Plus EXECUTOR_REGISTRY entry per CA-7 §15.5 pattern
```

**Class skeleton (Phase 1):**

```js
export class Agent7Design extends BaseAgent {
  static charterId = 7;
  static charter() {
    const r = getAgent(7);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: false,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* produce design spec from research findings */ }
  async act(ctx, plan) { /* persist draft + emit 7.design.spec.v1 */ }
  async recommend(ctx) { /* PA #2.7-analogous entry */ }
}
```

## 7. OrchestratorHub wire-in pattern

Standard step-owner registration at step `design`. AutoRunner step 2 invokes via `hub.invokeStepOwner('design', ctx)`.

## 8. Test plan (matching Agent #3 rigor)

| ID | Category | Test |
|---|---|---|
| A7-N1 | Nominal | plan() over research findings produces design spec with palette + typography + layout populated |
| A7-N2 | Nominal | design spec respects research's mobile responsiveness flags (i.e. responsive design produced when research flagged it) |
| A7-M1 | Malformed | empty research findings → low-confidence envelope + recommendation explaining the gap |
| A7-M2 | Malformed | research findings with corrupted `layers` field → schema error caught at plan() |
| A7-E1 | Edge | extremely short concept (10 chars) still produces best-effort design spec |
| A7-E2 | Edge | research findings flagged `partial-content` → spec marks itself `low_confidence=true` |
| A7-X1 | Adversarial | prompt injection in `productName` field NOT echoed verbatim into design palette choices |
| A7-X2 | Adversarial | hostile getter pattern test (matches Agent #3 X1) |
| A7-X3 | Adversarial | (Phase 2) v0 returns `429` → fallback to Lovable per ToolMenu, then to Bolt.new per CA-11-A.4 |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A7-* tests passing
- AutoRunner step 2 invokes Agent #7 instead of placeholder LLM call
- ≥5 neutral-fixture runs end-to-end produce valid `7.design.spec.v1` payloads consumable by Agent #2
- W4 adversarial coverage ≥7 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agent #6 Research SHIPPED-GREEN (consumes `6.research.findings.v1`); ToolMenu CA-11-C
- **Phase 2 depends on:** v0 adapter wired (currently deferred per Orchestra spec §2.1); Self-Renewal Executor pattern proven (CA-7); ProductSSOT integration (CA-10-A)
- **Blocks downstream:** Agent #2 Code Builder (currently SHIPPED-GREEN but consumes `7.design.spec.v1` when Agent #7 is live)

## 11. Estimated build effort

**~10 W-hours** for Phase 1 (recommend_only design-spec emitter). Phase 2 Executor (real v0 dispatch + deploy) adds **~12 W-hours** after v0 reaches Probation lifecycle state per §8.1.

## 12. Open clarification flags

- **Q:** Phase 2 Executor's deploy path — does it write to a separate fork-and-fix preview URL like Self-Renewal does, or replace the in-flight build's design directly? Today's Agent #2 Code Builder is independent of Phase 2 Design Executor; sequencing not yet defined. **NEEDS CEO/PANEL CLARIFICATION** before Phase 2 dispatch.
