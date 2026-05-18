# Agent #14 — Public Policy — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A14-REVISE` `QUORUM_PLURALITY_A14-REVISE` 7/10 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a per Dispatch revising 14 Wave-1-blocked specs)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 14 + §8.1 carve-out evaluation co-owner with Agent #11 + CA-11-B.7 ToolMenu + Cluster A v3 (Path P1) + Cluster C PROMOTED + Cluster D v3 + Cluster E v3 (Option (a) LOCKED) + **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)**.

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #34 (legal liability without counsel review — LLM-generated compliance assessments treated as legal opinions):** RESOLVED via §13.26 "advisory-only banner + mandatory counsel review tier" block. Every `14.policy_assessment.v1` envelope carries an `advisoryOnly: true` flag + a verbatim disclaimer in the `narrativeSummary` field: "This assessment is LLM-generated, not legal advice. Operators MUST obtain qualified counsel review before relying on this output for any regulatory filing or compliance decision." Counsel-review tier: assessments with `complianceStatus: 'non-compliant'` OR jurisdictions touching `['gdpr','hipaa','ccpa','eu_ai_act','popia']` route to a mandatory counsel-review queue BEFORE surfacing in admin UI. Auto-publish path blocked for high-stakes jurisdictions per §13.26 default policy.
- **Obj #61 (insufficient security controls — Anthropic LLM-generated content risk):** RESOLVED via §13.10 "security controls extension" block. Every LLM-generated assessment carries audit trail (model version, prompt hash, output hash, generation timestamp); admin UI surfaces audit chain on every review. Prompt-injection in regulatory-site body does NOT alter compliance classification (rule-based jurisdiction-tag extraction primary; LLM advisory only).
- **Obj #16 / #38 (over-reliance on LLMs):** RESOLVED via §13.13 "LLM-grounding hardening" block. Compliance classification is HYBRID — (a) rule-based first pass (regex + structured-extraction against canonical regulation taxonomy; jurisdiction tags via canonical jurisdiction-code lookup), (b) LLM second pass ONLY for narrative summary + edge-case classification. The canonical `complianceStatus` field is rule-based; LLM provides `narrativeSummary` advisory.
- **VEU §1.1 PERMANENT market definitions (CEO 2026-05-18):** §13.15 added. Agent #14's per-product regulatory-scope evaluation reads FULL canonical market per `product_registry.market_definition`. MyPregLife's regulatory scope INCLUDES global pregnancy data laws (HIPAA, GDPR, POPIA, India DPDPA, Brazil LGPD) — NOT Africa-only frameworks. Narrowing market scope at Agent #14's regulatory layer is REJECTED — `narrowMarketAt: 'agent14'` is not a valid configuration.
- **Cluster A Path P1 (A-a..A-d), Cluster C (PROMOTED), Cluster D (D-a/D-b/D-c), Cluster E v3 (Option (a) LOCKED):** §13, §14, §15, §16 added.
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification AND `regulatory-trackers.json` Panel-ratification.

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
| Future Executor (Phase 2) | NONE — produces compliance assessments + carve-out flags; remediation goes through human gate per §10.2 + counsel-review per §13.26 |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** crawls regulatory sites (GDPR EDPB, FTC, ICO, state AGs, EU AI Act, POPIA, India DPDPA, Brazil LGPD, etc.); ingests vendor T&C changes; consumes `11.platform.discovery.v1` to evaluate new Orchestra candidates for legal/regulatory exposure.
- **Decide:** hybrid classification per §13.13 — rule-based jurisdiction-tag extraction + structured taxonomy lookup; LLM narrative advisory. Classifies findings into 5 categories — data-residency, vendor-export-restriction, IP-protection, regulatory-compliance (GDPR/CCPA/HIPAA/POPIA/etc.), liability-exposure.
- **Execute:** emits compliance assessments + carve-out flags (input to §8.1 panel-gate decision); updates `/terms-of-use` + `/privacy-policy` pages with regulatory drift alerts when applicable; high-stakes jurisdictions route to counsel-review queue per §13.26.
- **Emit:** see §3.

## 3. MessageBus topics

**Consumes:**
- `11.platform.discovery.v1` (per CA-9-B — candidate evaluation for carve-outs)
- Regulatory tracker crawl signals (own dispatch)

**Produces (4 net-new topics within ceiling):**
- `14.policy_assessment.v1` — payload: `{ subject: candidateId|productId, tenantId, jurisdictions: [], regulations: [], complianceStatus: 'compliant'|'caveat'|'non-compliant', evidence, advisoryOnly: true, narrativeSummary, modelVersion, promptHash, outputHash, counselReviewRequired: bool, pipelineMode, at }`
- `14.carveout_flag.v1` — payload: `{ candidateId|productId, tenantId, reason: 'data-residency'|'export-restriction'|'ip-risk'|'regulatory-non-compliance'|'liability-exposure', evidence, at }`
- `14.counsel_review_required.v1` — payload: `{ assessmentId, subject, jurisdictions, escalationReason, at }` (NEW v2 — routes to counsel queue per §13.26)
- `14.cycle.empty.v1` — emitted when scheduled cycle yields no new findings

## 4. Orchestra dispatch usage

```js
orchestra.dispatch('crawl', { url: regulatoryTrackerUrl }, opts);
orchestra.dispatch('analyze', { artifact, criteria: 'regulatory-narrative-summary' }, opts);  // LLM advisory only
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
  regulatory-trackers.json                                     # canonical regulatory URL set; Panel-reviewed annually + counsel-input
  jurisdiction-taxonomy.js                                     # rule-based jurisdiction-code lookup
src/lib/agents/agents/publicPolicy/                            # helper modules
  ruleBasedClassifier.js                                       # deterministic regulation extraction
  counselReviewRouter.js                                       # §13.26 high-stakes routing
api/public-policy/counsel-review-queue.js                      # NEW counsel review queue endpoint
```

**Class skeleton:** mirrors Agent #11 cross-step pattern (`flowAiOnly: true`, `[RECOMMEND_ONLY]`).

```js
export class Agent14PublicPolicy extends BaseAgent {
  static charterId = 14;
  static charter() {
    const r = getAgent(14);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: true,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* rule-based jurisdiction extraction + LLM narrative */ }
  async act(ctx, plan) { /* emit assessment + carveout + counsel-review-required */ }
  async recommend(ctx) { /* cross-step entry */ }
}
```

## 7. OrchestratorHub wire-in pattern

Cross-step registration via `hub.registerCrossStep('public-policy', agent)`. Cadence: monthly + event-trigger on `11.platform.discovery.v1` events (candidate-evaluation) + event-trigger on regulator-site change detection.

## 8. Test plan

| ID | Category | Test |
|---|---|---|
| A14-N1 | Nominal | Compliance check on GDPR-relevant product → assessment with `complianceStatus` populated + jurisdictions enumerated + `advisoryOnly: true` flag set |
| A14-N2 | Nominal | AWS-bound Orchestra candidate triggers joint `14.carveout_flag.v1` + `11.carveout_flag.v1` per §8.1 |
| A14-N3 | Nominal | Regulator-site change detected → `14.policy_assessment.v1` with new regulation flagged |
| A14-N4 | Nominal | Assessment with `complianceStatus: 'non-compliant'` OR GDPR/HIPAA/CCPA jurisdiction → `14.counsel_review_required.v1` auto-emitted per §13.26 |
| A14-N5 | Nominal | Rule-based classifier confidence ≥0.6 → LLM second-pass SKIPPED for classification; LLM used for narrative only |
| A14-M1 | Malformed | Tracker URL returns empty body → skip; log warning; emit `14.cycle.empty.v1` if all trackers empty |
| A14-M2 | Malformed | Regulatory document beyond LLM context window → split + re-analyse per chunk; continue without crash |
| A14-E1 | Edge | Conflicting jurisdictions on same product (EU GDPR vs US CLOUD Act) → assessment surfaces conflict; `complianceStatus: caveat`; counsel-review auto-required |
| A14-X1 | Adversarial | Prompt-injection in regulator-site body does NOT manipulate rule-based jurisdiction tagging |
| A14-X2 | Adversarial | Hostile getter pattern test |
| A14-X3 | Adversarial | Bypass counsel-review attempt — admin tries to surface `non-compliant` assessment without counsel sign-off → admin UI gating rejects per §13.26 |
| A14-X4 | Adversarial | Cross-tenant assessment tampering blocked (`tenantId` mismatch rejected at schema validator) |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A14-* tests passing
- `regulatory-trackers.json` Panel-reviewed ≥7/10 + counsel-input on regulation taxonomy
- Monthly cadence produces ≥1 non-empty `14.policy_assessment.v1` per scheduled cycle
- Joint carveout-flag mechanism with Agent #11 tested end-to-end on synthetic AWS-bound candidate
- Counsel-review queue operational with end-to-end test (synthetic non-compliant assessment routes through queue + counsel signs off)
- W4 adversarial coverage ≥5 cases passing

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agent #11 Strategic Intelligence SHIPPED-GREEN (joint carve-out evaluation per §8.1)
- **Process dep:** Legal counsel onboarded + counsel-review queue workflow operational per §13.26 BEFORE high-stakes assessments surface in admin UI
- **Provides to:** Agent #26 Orchestra Research Agent (carve-out flags gate auto-admission per §8.1)

## 11. Estimated build effort

**~10 W-hours** Phase 1 (discovery + classification + counsel-review routing + 4 emission paths).

## 12. Open clarification flags

- **Q (RESOLVED v2 — counsel gate mandatory):** Legal counsel review cadence — RESOLVED per §13.26 — assessments with `non-compliant` status OR high-stakes jurisdictions (GDPR/HIPAA/CCPA/EU AI Act/POPIA) route to MANDATORY counsel review BEFORE admin UI surfacing.
- **Q (RESOLVED v2 — ratification gated):** Initial `regulatory-trackers.json` — Panel review + counsel input REQUIRED before Agent #14 first-ship (rubric-style gate analogous to Agent #8 v2 §13.5).

---

## 13. Cluster A integration — Path P1 ACCEPT-WITH-CONDITIONS (v2 paste block, A-a..A-d)

Per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3 + ENTRY 009 Cluster A Path P1 verdict.

- **A-a (boundary-class):** Agent #14 is `cross-step flowai-only` cost-class; cost aggregated at agent×cycle grain. All LLM dispatches MUST call `costGovernor.reserve()` + `settle()` + emit `agent.cost.signal.v1`.
- **A-b/A-c:** advisory-lock + SERIALIZABLE per canonical Cluster A v3.
- **A-d (halt envelope):** budget-cap-reached → emit `agent.data_quality.insufficient.v1 { reason: 'budget-cap-reached' }` + emit `14.cycle.empty.v1 { reason: 'budget-cap-reached' }`.

### §13.4 — Cluster C integration + mode boundary clarification (Obj #22 / #30)

Output mode-agnostic; `pipelineMode` field ALWAYS present per Obj #30; cross-step value is `'cross-step'` (or `'mixed'` for multi-product evaluations).

### §13.10 — Security controls extension (Obj #61 resolution)

Per-assessment audit trail:
- `modelVersion`, `promptHash` (SHA-256), `outputHash` (SHA-256), `at` MANDATORY on every `14.policy_assessment.v1`.
- Admin UI surfaces audit chain on every review.
- Counsel-review queue persists per-review log (counsel name, sign-off timestamp, requested-regeneration count).
- Cross-tenant: `tenantId` field MANDATORY; RLS enforced on SSOT read; cross-tenant tampering rejected at schema validator (test A14-X4).
- LLM-prompt scrubbing: regulator-site content wrapped in system-quoted blocks; Anthropic prompt-shield API layered above (same hardening as Agent #6 v2 §13.7).

### §13.11 — SSOT field-ownership partition

Agent #14 has NO ProductSSOT write surface in Phase 1 (envelope-only). No collision with other agents' SSOT scopes.

### §13.13 — LLM-grounding hardening (Obj #16 / #38 resolution)

Compliance classification HYBRID:
- **Rule-based primary (deterministic):** structured-extraction against canonical regulation taxonomy; jurisdiction tags via canonical jurisdiction-code lookup (`jurisdiction-taxonomy.js`). Outputs `{ jurisdictions[], regulations[], complianceStatus: 'compliant'|'caveat'|'non-compliant', confidence: 0..1 }`.
- **LLM secondary (advisory):** narrative paragraph + edge-case classification ONLY when rule-based confidence < 0.6. Canonical `complianceStatus` REMAINS the rule-based output; LLM provides `narrativeSummary` advisory.
- **Confidence floor:** below 0.5 LLM confidence → narrative discarded; rules-only verdict.

### §13.15 — VEU §1.1 PERMANENT market definitions (CEO 2026-05-18)

Agent #14's regulatory-scope evaluation reads FULL canonical market per `product_registry.market_definition` (mirrors SSOT §1.1; PERMANENT). Per-product regulatory frameworks include the FULL market's jurisdictions:
- **SAIGE** (global EHS/ESG/CSR practitioners): EU CSRD, US SEC climate disclosure, ISSB IFRS S1/S2, global ESG frameworks — NOT only EU-CSRD.
- **RelTwin** (any person globally managing relationships): GDPR, CCPA, India DPDPA, Brazil LGPD, China PIPL — NOT only EU.
- **ReachSMS** (anyone building online communities globally): all regional messaging-platform regulations (TCPA US, GDPR EU, EU DSA, India IT Rules 2021, Brazil Marco Civil) — NOT only US TCPA.
- **PressAI** (writers/publishers/content creators globally): copyright frameworks per-jurisdiction; AI-content disclosure (EU AI Act, US state laws) — NOT only US DMCA.
- **MyPregLife** (any family navigating pregnancy globally): HIPAA US, GDPR EU, POPIA SA, India DPDPA, Brazil LGPD, Africa-first launch context acknowledged but regulatory scope is GLOBAL.

Narrowing market at Agent #14's regulatory layer is REJECTED.

### §13.26 — Advisory-only banner + mandatory counsel review tier (Obj #34 / #50 / #52-flavour resolution)

Every `14.policy_assessment.v1` carries:
- `advisoryOnly: true` (boolean flag; cannot be overridden by any downstream consumer)
- `narrativeSummary` prefix: verbatim disclaimer "This assessment is LLM-generated, not legal advice. Operators MUST obtain qualified counsel review before relying on this output for any regulatory filing or compliance decision."

**Counsel-review queue routing (auto-trigger conditions):**
- `complianceStatus: 'non-compliant'` (any jurisdiction)
- OR jurisdiction touches `['gdpr','hipaa','ccpa','eu_ai_act','popia','india_dpdpa','brazil_lgpd','china_pipl']` (high-stakes set; Panel-ratifiable + expandable)
- OR per-product `ProductRegistry.legalCounselRequiredFor: true` (override flag for products with specific regulatory obligations)

When auto-trigger fires:
- `14.counsel_review_required.v1` envelope emits to counsel-review queue at `/api/public-policy/counsel-review-queue`
- Counsel receives notification (email + admin UI badge)
- Assessment HELD from admin UI surfacing until counsel signs off (or 14-day timeout → emits `14.counsel_review_overdue.v1` advisory)
- Counsel sign-off persists in audit log + flips the assessment to surfaced status

**Adversarial protection:** test A14-X3 — bypass attempts (admin tries to surface `non-compliant` without counsel sign-off) rejected at admin UI gating layer.

## 14. Cluster C integration — see §13.4

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS audit-log topic schema (D-a/D-b/D-c)

Per `CLUSTER_D_AUDIT_LOG_TOPIC_SCHEMA.md` v3 + ENTRY 009.

- **D-a (envelope drift guards):** all 4 `14.*` topics conform to v3 §2.2 naming.
- **D-b (retention-class binding):** `14.policy_assessment.v1`, `14.carveout_flag.v1`, `14.counsel_review_required.v1` are `retention-class: governance` (7-year + hash-chain mirror; legal-record retention discipline). `14.cycle.empty.v1` is `retention-class: operational` (30-day).
- **D-c (replay-buffer semantics):** idempotency key `subject + tenantId + cycleStartedAt + jurisdictions-hash`.

**Topic-per-ship ceiling:** 4 net-new topics within single first-ship commit.

**Load-test artifact gate:** shared Wave 1 cohort artifact per Cluster D AC-CD-11.

## 16. Cluster E integration — v3 + Option (a) LOCKED context

Agent #14 primary `[RECOMMEND_ONLY]`; no sibling Executor (Public Policy produces assessments + flags; all execution paths route through human counsel + admin gate per §13.26 + §10.2). No charter change required; no roster mutation. Authoritative ceiling enforcement via `BaseAgent.guard()` per Cluster E v3 §2.5 applies on every dispatch.

---

## 17. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution location |
|---|---|---|
| **34** | Legal liability without counsel review | §13.26 — advisory-only banner + counsel-review queue mandatory for high-stakes |
| **16/38** | Over-reliance on LLMs | §13.13 — rule-based primary; LLM advisory only |
| **61** | Insufficient security controls (LLM content) | §13.10 — per-assessment audit trail; cross-tenant RLS |
| **N/A** | VEU §1.1 market scope (CEO 2026-05-18) | §13.15 — full-market regulatory scope per product |

---

*End of Agent #14 Public Policy build blueprint v2. Panel `QUORUM_PLURALITY_A14-REVISE` 7/10 objections resolved per §17. Cluster paste blocks A-P1, C, D, E applied per §13-16. Pending W6 re-ratification AND `regulatory-trackers.json` Panel-ratification.*
