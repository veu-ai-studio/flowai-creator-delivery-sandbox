# Agent #8 — Quality Audit — Build Blueprint

**Status:** DORMANT (charter ratified per Rev-2.1 §15.1). Build blueprint pending engineering dispatch.
**Author:** W3, 2026-05-16.
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 8 + §9 step 4 qa_audit + §10.1 five-dimension scoring engine + CA-11-B.4 ToolMenu.

---

## 1. Agent identity

| Field | Value |
|---|---|
| ID | `8` |
| Name | `Quality Audit` |
| Mode | `step-owner` |
| Step | **4 — `qa_audit`** |
| Embedding | **`flowai-only`** (owns the 5-dimension scoring engine; not embedded in customer products) |
| Authority (Phase 1) | `[RECOMMEND_ONLY]` |
| Future Executor (Phase 2) | NONE — auditing is read-only; remediation is Agent #3's responsibility |

## 2. Perceive → Decide → Execute → Emit cycle

- **Perceive:** consumes `6.research.findings.v1` + `7.design.spec.v1` + `2.build.completed.v1` for full pipeline context; consumes ProductSSOT `governance_record` for trend lines (per CA-10-D symbiotic loop).
- **Decide:** runs **5-dimension scoring engine** per Rev-2.1 §10.1 — `UI/UX`, `API`, `Logic`, `Business Value`, `Security Posture`. Each dimension scored 0–10 with confidence; 95/95 governance threshold (≥95/100 + ≥95% confidence) per dimension.
- **Execute:** writes scores to ColdStore lineage + ProductSSOT `governance_record_entry` (kind `95_95_score` per CA-10-A.2); emits `8.audit.completed.v1`; if any dimension <95, emits `block` semantic (mirroring Agent #6's `0fc8851` pattern).
- **Emit:** `8.audit.completed.v1` consumed by Agent #3 Self-Renewal (triggers `customerReportedIssues`-style heuristic on audit-derived issues).

## 3. MessageBus topics

**Consumes:**
- `6.research.findings.v1`
- `7.design.spec.v1`
- `2.build.completed.v1`
- `21.gtm.readiness.v1` (per ENTRY 006 — folds ACE findings into the 5-dim score)

**Produces:**
- `8.audit.completed.v1` — payload: `{ runId, productId, scores: { ui_ux: {score, confidence}, api: {...}, logic: {...}, business_value: {...}, security_posture: {...} }, dimensionsBelow95: [], overallPass: bool, recommendations: [], at }`
- `8.audit.block.v1` (when overallPass=false; mirrors `6.research.block.v1` pattern)

## 4. Orchestra dispatch usage (per §15.4)

```js
// Score each dimension against rubric
orchestra.dispatch('analyze', { rubric: 'ui-ux-rubric', artifact: combinedContext }, opts);
orchestra.dispatch('score', { artifact, rubric: '95-95-rubric' }, opts);

// Live functional probing during audit (Security Posture dim relies on this)
orchestra.dispatch('interact', { url: liveUrl, includeScreenshot: true }, opts);
```

## 5. ToolMenu (per CA-11-B.4)

| # | Tool | adapterId | costTier | contextTypes |
|---|---|---|---|---|
| 1 | Anthropic API direct | `anthropic-api` | high | `analyze`, `score` (5-dim rubric) |
| 2 | OpenAI API (GPT-5) | `openrouter` (`openai/gpt-5`) | high | `analyze`, `score` |
| 3 | Claude Code | `claude-code` | high | `code-patch` (for Security Posture sub-6 → Self-Protection sprint generation hand-off) |
| 4 | Playwright | `playwright` | low | `interact` (live functional probing) |

## 6. Implementation file structure

```
src/lib/agents/agents/Agent8QualityAudit.js                   # ~600 LOC (rubric + 5 dimension scorers + composite)
src/lib/agents/agents/__tests__/Agent8QualityAudit.test.js    # ~400 LOC
src/lib/agents/agents/rubrics/                                # NEW directory — rubric files per dimension
  uiUxRubric.js, apiRubric.js, logicRubric.js,
  businessValueRubric.js, securityPostureRubric.js
```

**Class skeleton:**

```js
export class Agent8QualityAudit extends BaseAgent {
  static charterId = 8;
  static charter() {
    const r = getAgent(8);
    return Object.freeze({
      id: r.id, name: r.name, flowAiOnly: true,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: [...r.marketplaceTools],
      consumes: [...r.consumes], produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    });
  }
  async plan(ctx) { /* run 5 dimension scorers in parallel via Promise.all */ }
  async act(ctx, plan) { /* persist + emit 8.audit.completed.v1 or 8.audit.block.v1 */ }
  async recommend(ctx) { /* PA #2.7-analogous step-owner entry */ }
}
```

## 7. OrchestratorHub wire-in pattern

Standard step-owner registration at step `qa_audit`. The plan() executes 5 scorers in parallel via Promise.all to keep wall-clock ≤30s per audit.

## 8. Test plan (matching Agent #3 rigor)

| ID | Category | Test |
|---|---|---|
| A8-N1 | Nominal | All 5 dimensions scored on a complete pipeline artifact; result `overallPass=true` when all ≥95 |
| A8-N2 | Nominal | Security Posture dimension scored sub-6 → emits a `recommendation` for Self-Protection sprint per Sprint PROTECT-1 Phase 5 |
| A8-M1 | Malformed | Missing `2.build.completed.v1` in stream → plan() returns block envelope with reason `prereq-missing` |
| A8-M2 | Malformed | Rubric file unreadable → schema error caught; agent does NOT crash AutoRunner |
| A8-E1 | Edge | All 5 dimensions exactly 95 → overallPass=true (boundary check) |
| A8-E2 | Edge | One dimension 94, others 100 → overallPass=false; only failing dimension surfaced |
| A8-X1 | Adversarial | Prompt-injection in build artifact does NOT manipulate the rubric prompt |
| A8-X2 | Adversarial | Operator attempts to override 95/95 without admin role → guard rejects per Rev-2.1 §13 + §10.2 (Approval Gate admin-only) |
| A8-X3 | Adversarial | Hostile getter on ctx fields caught in recommend() extraction try/catch |

## 9. Graduation criteria DORMANT → SHIPPED-GREEN

- All A8-* tests passing
- All 5 rubric files reviewed by Panel ≥7/10 supermajority (rubric content is canonical material)
- ScoreEvaluator.js (existing canonical at `src/lib/governance/ScoreEvaluator.js`) integration tested — Agent #8 consumes its 95/95 logic
- AutoRunner step 4 invokes Agent #8 in place of placeholder LLM
- ≥7 consecutive clean runs on dev SUT, with at least one run reaching `overallPass=true` band

## 10. Dependencies + sequencing notes

- **Hard depends on:** Agents #6 (Research) + #7 (Design) + #2 (Code Builder) all present in pipeline; ScoreEvaluator.js canonical (already shipped)
- **Soft depends on:** Agent #21 ACE Conductor wired (per ENTRY 006); when ACE produces `21.gtm.readiness.v1`, Agent #8 folds those findings into the 5-dim score (Security Posture especially benefits from ACE's `auth-gate-leak` + `xss-in-form-echo` detectors)
- **Blocks downstream:** Agent #3 Self-Renewal (consumes `8.audit.completed.v1` — Agent #3 currently uses this as one of its 5 heuristic inputs)

## 11. Estimated build effort

**~14 W-hours** (Agent #8 is the heaviest dormant agent — 5 distinct rubric files + composite scorer; Phase 1 only since auditing is read-only).

## 12. Open clarification flags

- **Q:** Rubric content for each of the 5 dimensions — Rev-2.1 §10.1 lists the dimensions but does not specify scoring criteria per dimension. Panel must ratify rubric files before Agent #8 ships. **NEEDS CEO/PANEL CLARIFICATION** before engineering dispatch produces the rubric files.
- **Q:** How does Agent #8 surface "this is a TREND, not just a snapshot" — does it consume the prior `8.audit.completed.v1` events from the past 30 days via ProductSSOT `governance_record`? Implied by CA-10-D §28 symbiotic loop but not explicit. **CLARIFICATION RECOMMENDED.**
