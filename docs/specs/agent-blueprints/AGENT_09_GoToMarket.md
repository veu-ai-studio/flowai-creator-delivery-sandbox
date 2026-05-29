# Agent #9 — Go-to-Market — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A9-REVISE` `PLURALITY_A9-REVISE` 5/9 (commit `871a182`, 2026-05-17).
**Version history:** v1 (2026-05-16) → **v2 (2026-05-18 — W3a)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 9 + §9 step 7 gtm + §11 Six-Step Clearance Protocol + CA-11-B.7 ToolMenu + Cluster A v3 (Path P1) + Cluster C PROMOTED + Cluster D v3 + Cluster E v3 (Option (a) LOCKED) + **VEU §1.1 market definitions (PERMANENT — narrowing scope is wrong scoring criteria per CEO 2026-05-18)**.

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #01 / #15 / #23 / #31 (topic naming `9.gtm.asset.v1` vs `9.gtm.assessment.v1` unresolved):** RESOLVED via §13.12 — canonical topic name is **`9.gtm.assessment.v1`** (Phase 1 GTM readiness assessment). The legacy `9.gtm.asset.v1` name is RESERVED for Phase 2 demo-asset emission (different envelope, different consumers). Dual-emit window NOT required because the legacy name was never emitted in production. `_registry.ts` row 9 produces field migrates to `['9.gtm.assessment.v1']` at first-ship.
- **Obj #08 (overreliance on LLMs for GTM readiness analysis):** §13.13 LLM-grounding hardening — GTM readiness is computed as a HYBRID of (a) deterministic rule-based gates (Clearance Protocol §11 steps 1-5 are deterministic), (b) LLM analysis ONLY for the qualitative narrative summary. The composite GTM-ready/not-ready verdict is rule-based; LLM is advisory.
- **Obj #17 (Phase 2 deferral complexity):** §13.14 Phase 2 boundary clarification — Phase 2 demo-asset generation is fully optional; Phase 1 GTM readiness assessment ships independent of Phase 2. Phase 2 routes through a separate `agent9-demo-builder-executor` sibling (per Cluster E v3 sibling pattern).
- **Obj #22 (mode logic conflicts):** §13.4 mode-conditional clarification (same shape as Agent #6 v2).
- **Obj #25 (SSOT write scope — overlap with Agent #8):** §13.11 SSOT field-ownership partition — Agent #9 owns `gtm.assessment[]`, `gtm.demo_readiness[]`, `gtm.demo_assets[]` (Phase 2). No overlap with Agent #8's `audit.*` family.
- **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18):** §13.15 added. Agent #9's market-context analysis MUST use the canonical full-market definitions from SSOT §1.1 (live mirror in `product_registry.market_definition`). Narrowing the market scope at Agent #9's analysis layer is INCORRECT scoring per CEO 2026-05-18 instruction; the GTM readiness scorer evaluates against the full market, not a narrowed subset.
- **Cluster A/C/D/E paste blocks:** §13, §14, §15, §16 added.
- **No code changes.** Spec-only revision.

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

---

## 13. v2 cluster paste blocks + per-objection resolutions

### §13 — Cluster A Path P1 (A-a..A-d)
Standard application per Cluster A v3. Agent #9 is `step-owner` (step 7); LLM dispatches for narrative summary use `costGovernor.reserve/settle`; budget-cap halts emit `agent.data_quality.insufficient.v1`.

### §13.4 — Cluster C mode boundary
Output mode-agnostic; thresholds (Clearance Protocol Step 5 gate threshold) mode-conditional per `ProductRegistry.gtmReadinessThreshold.byMode`. `pipelineMode` field always present per Obj #30 reconciliation (see Agent #8 v2 §13.4).

### §13.11 — SSOT field-ownership partition (Obj #25)
Agent #9 owns: `gtm.assessment[]`, `gtm.demo_readiness[]`, `gtm.demo_assets[]` (Phase 2). Read-only to other agents.

### §13.12 — Topic name canonicalisation (Obj #01/#15/#23/#31)
- **Phase 1 emit:** `9.gtm.assessment.v1` (GTM readiness assessment envelope; replaces legacy `9.gtm.asset.v1` placeholder).
- **Phase 2 emit (reserved):** `9.gtm.demo_assets.v1` for actual demo-asset content (microsite URL, tour script, etc.).
- `_registry.ts` row 9 `produces` field migrates to `['9.gtm.assessment.v1']` at first-ship; Phase 2 emit name added at Phase 2 dispatch.
- Dual-emit window NOT required (legacy name never emitted in production); standard `_registry.ts` mutation only.

### §13.13 — LLM-grounding hardening (Obj #08)
GTM readiness verdict is HYBRID:
- **Rule-based (deterministic):** Clearance Protocol §11 Steps 1-5 each emit a boolean PASS/FAIL — `auth_present`, `monitoring_present`, `cost_governance_present`, `compliance_present`, `demo_ready`. All 5 PASS = GTM-ready candidate; <5 PASS = not-ready.
- **LLM-advisory (qualitative):** narrative summary explaining the verdict, citing evidence from Agent #6 Research + Agent #8 Quality Audit findings. NEVER overrides the rule-based verdict.
- **Composite envelope:** `9.gtm.assessment.v1 { ruleVerdict: 'ready' | 'not_ready', ruleEvidence: { authPresent, monitoringPresent, ... }, llmSummary: <text>, finalVerdict: ruleVerdict (always equals ruleVerdict) }`.

### §13.14 — Phase 2 boundary clarification (Obj #17)
- **Phase 1:** GTM readiness assessment only (rule-based + LLM summary). Ships in Wave 1.
- **Phase 2:** demo-asset generation (microsite via v0 / Lovable; tour script via Anthropic). NEW sibling Executor `agent9-demo-builder-executor` in EXECUTOR_REGISTRY per CA-7 §15.5; primary stays `[RECOMMEND_ONLY]`. Phase 2 dispatch separate; Phase 1 ships independent.

### §13.15 — VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)
Agent #9's market-context analysis reads `product_registry.market_definition` (mirrors SSOT §1.1; PERMANENT per CEO instruction). The GTM readiness scorer uses the **FULL** market definition for evaluation; narrowing the market at Agent #9's analysis layer is REJECTED — `narrowMarketAt: 'agent9'` is not a valid `ProductRegistry` configuration. Per ENTRY 010 §28 narrow-the-scope clarification: SSOT §7.6 "Market-definition scope" clause enforces full-market evaluation.

### §14 — Cluster C
See §13.4.

### §15 — Cluster D
Topics emitted (3 net-new in Phase 1; 1 net-new in Phase 2): `9.gtm.assessment.v1`, `9.gtm.block.v1`, `9.gtm.dimension_failed.v1` (Phase 1); `9.gtm.demo_assets.v1` (Phase 2). Within 5-topic-per-ship ceiling. Standard D-a/D-b/D-c application. `gtm.assessment` is `retention-class: governance`.

### §16 — Cluster E
Phase 1 primary `[RECOMMEND_ONLY]`; no sibling. Phase 2 adds `agent9-demo-builder-executor` sibling with `[AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]` per CA-7 §15.5.

---

## 17. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution |
|---|---|---|
| **01/15/23/31** | Topic naming unresolved | §13.12 — canonical `9.gtm.assessment.v1`; legacy reserved for Phase 2 |
| **08** | LLM overreliance for GTM readiness | §13.13 — rule-based verdict + LLM-advisory summary; rules dominate |
| **17** | Phase 2 deferral complexity | §13.14 — Phase 1 independent; Phase 2 via sibling Executor |
| **22** | Mode logic conflicts | §13.4 — same boundary as Agent #6 v2 |
| **25** | SSOT write scope overlap with #8 | §13.11 — partition table |
| **N/A** | VEU §1.1 market scope (CEO 2026-05-18) | §13.15 — full-market evaluation; narrowing rejected |

---

*End of Agent #9 GTM blueprint v2. Panel `PLURALITY_A9-REVISE` 5/9 objections resolved. Pending W6 re-ratification.*
