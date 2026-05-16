# Agent #14 — Public Policy — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 14 + §8.1 carve-out evaluation co-owner with Agent #11 + CA-11-B.7 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `14` |
| Name | `Public Policy` |
| Mode | `cross-step` |
| Step | n/a (cross-step) |
| Embedding | **`flowai-only`** |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — produces compliance assessments + carve-out flags; remediation goes through human gate per §10.2 |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** crawls regulatory sites (GDPR EDPB, FTC, ICO, state AGs, EU AI Act); ingests vendor T&C changes; consumes `11.platform.discovery.v1` to evaluate new Orchestra candidates for legal/regulatory exposure.
- **Decide:** classifies findings into 5 categories — data-residency, vendor-export-restriction, IP-protection, regulatory-compliance (GDPR/CCPA/HIPAA/POPIA), liability-exposure.
- **Execute:** emits compliance assessments + carve-out flags (input to §8.1 panel-gate decision); updates `/terms-of-use` + `/privacy-policy` pages with regulatory drift alerts when applicable.
- **Emit:** `14.policy_assessment.v1`, `14.carveout_flag.v1` (joint with Agent #11 per §8.1 §CA-9-A.6).

## 3. MessageBus topics

**Consumes:**
- `11.platform.discovery.v1` (per CA-9-B — candidate evaluation for carve-outs)
- Regulatory tracker crawl signals (own dispatch)

**Produces:**
- `14.policy_assessment.v1` — payload: `{ subject: candidateId|productId, jurisdictions: [], regulations: [], complianceStatus: 'compliant'|'caveat'|'non-compliant', evidence, at }`
- `14.carveout_flag.v1` — payload: `{ candidateId|productId, reason: 'data-residency'|'export-restriction'|'ip-risk'|'regulatory-non-compliance'|'liability-exposure', evidence, at }`

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('crawl', { url: regulatoryTrackerUrl }, opts);
orchestra.dispatch('analyze', { artifact, criteria: 'regulatory-compliance-check' }, opts);
orchestra.dispatch('extract-structured', { text: policyDoc, schema: regulatorySchema }, opts);
```

## 5. ToolMenu (per CA-11-B.7)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Perplexity | `openrouter` (`perplexity/sonar`) | high | `web-grounded-research` (regulatory tracking) |
| 2 | Anthropic API direct | `anthropic-api` | high | `analyze`, `extract-structured` (policy-text comprehension) |
| 3 | OpenAI API | `openrouter` (`openai/gpt-5`) | high | `analyze` |
| 4 | Browserless | `browserless` | low | `crawl` (regulatory site monitoring) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent14PublicPolicy.js                   # ~450 LOC
src/lib/agents/agents/__tests__/Agent14PublicPolicy.test.js    # ~300 LOC
src/lib/agents/agents/regulators/                              # NEW directory
  regulatory-trackers.json                                     # canonical regulatory URL set; Panel-reviewed annually
```

**Class skeleton:** mirrors Agent #11 cross-step pattern (`flowAiOnly: true`, `[RECOMMEND_ONLY]`).

## 7. OrchestratorHub wire-in pattern

Cross-step registration via `hub.registerCrossStep('public-policy', agent)`. Cadence: monthly + event-trigger on `11.platform.discovery.v1` events (candidate-evaluation) + event-trigger on regulator-site change detection.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A14-N1 | Nominal | Compliance check on a GDPR-relevant product → assessment with `complianceStatus` populated + jurisdictions enumerated |
| A14-N2 | Nominal | AWS-bound Orchestra candidate (Kiro / Q Developer) triggers joint `14.carveout_flag.v1` + `11.carveout_flag.v1` per §8.1 |
| A14-N3 | Nominal | Regulator-site change detected → `14.policy_assessment.v1` with new regulation flagged |
| A14-M1 | Malformed | Tracker URL returns empty body → skip; log warning |
| A14-M2 | Malformed | Regulatory document beyond LLM context window → split + re-analyse per chunk; continue without crash |
| A14-E1 | Edge | Conflicting jurisdictions on same product (e.g. EU GDPR vs US CLOUD Act) → assessment surfaces conflict; complianceStatus=`caveat` |
| A14-X1 | Adversarial | Prompt-injection in regulator-site body does NOT manipulate compliance classification |
| A14-X2 | Adversarial | Hostile getter pattern test |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A14-* tests passing
- `regulatory-trackers.json` Panel-reviewed ≥7/10
- Monthly cadence produces ≥1 non-empty `14.policy_assessment.v1` per scheduled cycle
- Joint carveout-flag mechanism with Agent #11 tested end-to-end on a synthetic AWS-bound candidate
- W4 adversarial coverage ≥5 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agent #11 Strategic Intelligence SHIPPED-GREEN (joint carve-out evaluation per §8.1)
- **Soft depends on:** Legal counsel review of `regulatory-trackers.json` content + LLM-generated assessment text (legal liability — assessments are advisory, not legal opinions)
- **Provides to:** Agent #26 Orchestra Research Agent (carve-out flags gate auto-admission per §8.1)

## 11. Estimated build effort

**~10 W-hours** Phase 1.

## 12. Open clarification flags

- **Q:** Legal counsel review cadence — LLM-generated compliance assessments are advisory; what's the policy on legal review before Agent #14 outputs are surfaced to admin? **NEEDS CEO CLARIFICATION** before engineering dispatch.
- **Q:** Initial `regulatory-trackers.json` URL set — needs Panel review + legal counsel input. **CLARIFICATION RECOMMENDED.**
