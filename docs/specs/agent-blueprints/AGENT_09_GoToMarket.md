# Agent #9 — Go-to-Market — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 9 + §9 step 7 gtm + §11 Six-Step Clearance Protocol + CA-11-B.7 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `9` |
| Name | `Go-to-Market` |
| Mode | `step-owner` |
| Step | **7 — `gtm`** |
| Embedding | `embedded` |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — GTM produces assets/recommendations; deploy is orchestrator-path; clearance is human-gated |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes `8.audit.completed.v1` + `21.gtm.readiness.v1` (per ENTRY 006 §7.6 GTM Readiness Report) + ProductSSOT `governance_record` history.
- **Decide:** produces GTM-readiness assessment — demo readiness, GTM risks, top fixes before any prospect demo, ranked per ENTRY 006 §7.6 impact_score formula.
- **Execute:** writes assessment to ColdStore lineage + ProductSSOT `governance_record_entry` (kind `gtm_assessment`); emits `9.gtm.assessment.v1`; triggers `ClearanceProtocolPrompt` per Sprint HARD-1 (already shipped) when ready.
- **Emit:** `9.gtm.assessment.v1` consumed by Agent #10 Monitor (folds into final report) + `/clearance` wizard Step 5 (Demo Readiness gating per §7.6).

## 3. MessageBus topics

**Consumes:**
- `8.audit.completed.v1` — final QA outcome
- `21.gtm.readiness.v1` (per ENTRY 006) — Aggressive Crawl Engine readiness signal
- `2.build.completed.v1` — build output reference
- `7.design.spec.v1` — design context for demo asset generation

**Produces:**
- `9.gtm.assessment.v1` — payload: `{ runId, productId, readinessScore: number, scoreBand, demoRisks: [], topFixes: [], assetReadiness: { microsite, tourScript, investorDeck }, clearanceStep5Eligible: bool, at }`
- `9.gtm.demo_assets.v1` (Phase 2 when Demo Builder integration matures) — payload: `{ runId, productId, microsite, tourScript, investorAssets, at }`

## 4. Orchestra dispatch usage (per §15.4)

```js
orchestra.dispatch('analyze', { artifact: { auditScores, aceReadiness, designSpec }, criteria: 'gtm-readiness' }, opts);
orchestra.dispatch('summarize', { text, maxTokens: 1500 }, opts);
orchestra.dispatch('crawl', { url: liveUrl }, opts);  // competitive intelligence
```

## 5. ToolMenu (per CA-11-B.7)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `summarize` |
| 2 | OpenAI API (GPT-5) | `openrouter` (`openai/gpt-5`) | high | `analyze`, `summarize` |
| 3 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research` (competitive intel) |
| 4 | Google Gemini 2.5 Pro | `openrouter` (`google/gemini-2.5-pro`) | high | `analyze`, multimodal |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent9GoToMarket.js                   # ~520 LOC
src/lib/agents/agents/__tests__/Agent9GoToMarket.test.js    # ~340 LOC
```

**Class skeleton:**

```js
export class Agent9GoToMarket extends BaseAgent {
  static charterId = 9;
  static charter() {
    const r = getAgent(9);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: false,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* aggregate audit + ACE readiness + design context; produce GTM assessment */ }
  async act(ctx, plan) { /* persist + emit 9.gtm.assessment.v1 */ }
  async recommend(ctx) { /* PA #2.7-analogous step-owner entry */ }
}
```

## 7. OrchestratorHub wire-in pattern

Standard step-owner registration at step `gtm`. AutoRunner step 7 invokes via `hub.invokeStepOwner('gtm', ctx)`.

## 8. Test plan (matching Agent #3 rigor)

| ID | Category | Test |
|---|---|---|
| A9-N1 | Nominal | plan() over passing audit + ACE-Demo-ready (≥75) → assessment with `clearanceStep5Eligible=true` |
| A9-N2 | Nominal | Top-5 fixes ranked per ENTRY 006 §7.6 impact_score formula (severity × visibility × effort) |
| A9-M1 | Malformed | Missing `8.audit.completed.v1` → low-confidence envelope; `clearanceStep5Eligible=false` |
| A9-M2 | Malformed | ACE readiness 0–59 (Not-demo-ready band) → assessment marks demo blocked; emits explicit `clearanceStep5Eligible=false` |
| A9-E1 | Edge | ACE score boundary: 75.0 exactly → eligible; 74.9 → blocked |
| A9-E2 | Edge | Audit passing but ACE finds `xss-in-form-echo` (critical, hard-classified) → block regardless of audit score |
| A9-X1 | Adversarial | Operator with `client` role attempts to trigger ClearanceProtocolPrompt — guard rejects per §13 |
| A9-X2 | Adversarial | Prompt injection in competitive-intel crawl does NOT alter the demo-risk classification |
| A9-X3 | Adversarial | Hostile getter pattern caught in recommend() extraction try/catch |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A9-* tests passing
- AutoRunner step 7 invokes Agent #9 in place of placeholder
- Clearance wizard Step 5 reads Agent #9's `clearanceStep5Eligible` flag + ACE `21.gtm.readiness.v1` score-band; 4-prerequisite gate enforced per ENTRY 006 §7.6
- ≥5 consecutive clean runs producing valid `9.gtm.assessment.v1` payloads
- W4 adversarial coverage ≥7 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agent #8 Quality Audit SHIPPED-GREEN; Agent #21 ACE Conductor SHIPPED-GREEN (ENTRY 006 §7.6 GTM Readiness Report producer)
- **Soft depends on:** Demo Builder integration matures (Sprint 7 Demo Builder + Sprint HARD-1 ClearanceProtocolPrompt — both already shipped); ProductSSOT (CA-10) for trend lines
- **Blocks downstream:** Agent #10 Monitor (consumes `9.gtm.assessment.v1` for final report); `/clearance` Step 5 gating

## 11. Estimated build effort

**~10 W-hours** for Phase 1. Phase 2 demo asset generation (microsite + tour script generation via Anthropic API) adds **~8 W-hours** but defers to Demo Builder integration maturity.

## 12. Open clarification flags

None blocking. Charter is unambiguous; ACE/§7.6 + §11 Step 5 gates already canonical post-ENTRY 006.
