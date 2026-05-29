# Agent #8 — Quality Audit — Build Blueprint (v2)

**Status:** DORMANT — v2 draft, pending W6 re-ratification after Wave 1 cohort `A8-REVISE` `QUORUM_PLURALITY_A8-REVISE` 7/9 (commit `871a182`, 2026-05-17).
**Version history:** v1 (initial blueprint, 2026-05-16) → **v2 (this revision, 2026-05-18 — W3a)**.
**Author:** W3 (v1), W3a (v2).
**Template:** mirrors Agent #3 Self-Renewal pattern.
**Anchor canonical:** Rev-2.1 §15.1 row 8 + §9 step 4 qa_audit + §10.1 five-dimension scoring engine + CA-11-B.4 ToolMenu + Cluster A v3 (Path P1) + Cluster C PROMOTED + Cluster D v3 + Cluster E v3 (Option (a) LOCKED).

**v2 change log (Panel objections resolved + cluster-fix paste blocks applied):**
- **Obj #03 / #19 (rubric files not yet written; unvalidated rubric content):** §13.5 documents the rubric-ratification gate. Five rubric files (`uiUxRubric.js`, `apiRubric.js`, `logicRubric.js`, `businessValueRubric.js`, `securityPostureRubric.js`) MUST be drafted by W3 + Panel-ratified ≥7/10 ≥7-of-9 BEFORE the Agent #8 first-ship commit lands. Rubric drafts ship as separate PRs ahead of Agent #8 implementation. Until rubrics ratify, Agent #8 is BLOCKED at the dispatch boundary (not partial-ship).
- **Obj #07 (insufficient error handling during audit):** §13.9 error handling contract — every audit dimension has explicit failure mode + recovery path. Per-dimension parallel scoring isolates failures (one dim failing does not block others).
- **Obj #10 (incomplete security controls — credential handling):** §13.10 security controls extension — `scrubCredentials()` applied at audit-input boundary; LLM prompts for scoring never include credentials in source content; rubric files never reference credentials.
- **Obj #22 (mode logic conflicts):** §13.4 mode-conditional clarification — Agent #8 OUTPUT shape mode-agnostic; THRESHOLDS mode-conditional via Cluster B per-mode floors.
- **Obj #24 (data-quality gate deadlock — Research+Audit dependency):** §13.2 Cluster B threshold semantics + recovery hint. Agent #8 carries a `recoveryHint.requiresUpstream: 'agent_6_research_findings'` field when Cluster B halts at step 4 due to upstream Research insufficiency.
- **Obj #25 (Audit/SSOT write scope too broad — overlap with Agent #9 + #10):** §13.11 SSOT field-ownership partition table — Agent #8 owns `audit.scores[]`, `audit.evidence[]`, `audit.recommendations[]`; Agent #9 owns `gtm.assessment[]`, `gtm.demo_readiness[]`; Agent #10 owns `monitor.health[]`, `architecture_snapshot`, `delta_log`. Explicit partition prevents semantic collision per Obj #25.
- **Obj #30 (Cluster C `pipelineMode` field inconsistency — Agent #8 mandates field, #6/#7 omit):** §13.4 reconciliation — `pipelineMode` field is REQUIRED on every Cluster D audit-log row regardless of agent's mode classification (per Cluster D v3 + ENTRY 009 PROMOTED clarification). The v1 Agent #6/#7 "omit for P1 agents" pattern was incorrect; v2 reconciles to "always present, value reflects invocation context".
- **Cluster A Path P1 (A-a..A-d), Cluster C (PROMOTED), Cluster D (D-a/D-b/D-c), Cluster E v3 (Option (a) LOCKED):** §13, §14, §15, §16 added.
- **No code changes.** Spec-only revision; engineering dispatch follows v2 re-ratification AND rubric ratification.

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

- **Q (RESOLVED v2 — gated):** Rubric content for each of the 5 dimensions. RESOLVED at the workflow level — rubric files ratify in a separate Panel pass BEFORE Agent #8 first-ship commit lands; Agent #8 is BLOCKED at dispatch until ratified. See §13.5.
- **Q:** Trend-vs-snapshot surfacing — Agent #8 consumes prior `8.audit.completed.v1` events from `governance_record` over the past 30 days; trend deltas surface in `audit.recommendations[].trendContext` field. **CLARIFICATION ACCEPTED — implementation-level decision.**

---

## 13. Cluster A integration — Path P1 ACCEPT-WITH-CONDITIONS (v2 paste block)

Per `CLUSTER_A_COST_GOVERNOR_INTEGRATION.md` v3.

- **A-a:** `step-owner` cost-class; aggregated at run grain. 5-dimension parallel scoring = 5 LLM dispatches per audit. Each calls `costGovernor.reserve()` BEFORE + `settle()` after + emits `agent.cost.signal.v1`.
- **A-b/A-c:** advisory-lock + SERIALIZABLE per canonical Cluster A v3.
- **A-d:** budget-cap-reached at step 4 emits `agent.data_quality.insufficient.v1 { reason: 'budget-cap-reached' }`; pipeline halts.

### §13.2 — Cluster B Data Quality Gate (Obj #24 recovery hint)

Cluster B halt from step 4 carries `recoveryHint.requiresUpstream: 'agent_6_research_findings'` field when failing due to step-1 insufficiency. Operator may override via `ProductRegistry.allowPartialContentInResearch` (cascades to step 4 — step-4 will still attempt audit on partial step-1 output but mark `qualityScorecard.upstreamDegraded: true`).

### §13.3 — Cluster F (REVERTED v2 + F-a per ENTRY 009)

Standard application per Cluster F v2.

### §13.4 — Cluster C integration + mode boundary clarification (Obj #22 / #30)

- **Output shape mode-agnostic; thresholds mode-conditional.** Same boundary as Agent #6 v2 §13.4.
- **`pipelineMode` field ALWAYS present on every audit-log envelope** (Obj #30 reconciliation). v1's "P1 omit pattern" was wrong; v2 mandates inclusion. The field reflects invocation context; cross-mode aggregation envelopes use `'mixed'`.

### §13.5 — Rubric ratification gate (Obj #03 + #19 resolution)

The 5 rubric files MUST be Panel-ratified before Agent #8 first-ship:
| Rubric file | Dimension | Scoring criteria pattern |
|---|---|---|
| `uiUxRubric.js` | UI/UX | 5-point Likert per criterion across ~8 criteria (information density, hierarchy clarity, error-recovery UX, etc.) |
| `apiRubric.js` | API | 5-point Likert across ~6 criteria (REST adherence, error code coverage, idempotency, etc.) |
| `logicRubric.js` | Business Logic | 5-point Likert across ~7 criteria (validation completeness, edge-case coverage, etc.) |
| `businessValueRubric.js` | Business Value | 5-point Likert across ~5 criteria (Five-Layer alignment, value-prop clarity, etc.) |
| `securityPostureRubric.js` | Security | 5-point Likert across ~8 criteria (OWASP-Top-10 coverage, credential handling, etc.) |

Rubric drafts ship as separate PRs ahead of Agent #8 implementation; ratification is a hard precondition for the §14.1 micro-amendment that registers Agent #8's topics.

### §13.9 — Error handling contract (Obj #07 resolution)

Per-dimension parallel scoring isolates failures. Per-dimension failure paths:
- LLM dispatch exhausted on dim N → emit `8.audit.dimension_failed.v1 { dimension: N }`; other 4 dims continue; composite score uses 4 instead of 5; `qualityScorecard.dimensionsAttempted: 5, dimensionsCompleted: 4` carries.
- Schema validation failure on emit → `PAYLOAD_SCHEMA_FAILURE`; halt step 4 only if ≥3 of 5 dims failed (else degrade gracefully).
- Rubric file not found at runtime → P0 ship-blocker (the rubric ratification gate should prevent this); emit `8.audit.rubric_missing.v1` + halt.

### §13.10 — Security controls extension (Obj #10 resolution)

- `scrubCredentials()` applied at audit-input boundary (Agent #6 research findings consumed as inputs).
- LLM prompts for scoring never include credentials in source content — credential-bearing fields are redacted before prompt assembly.
- Rubric files (`uiUxRubric.js` etc.) never reference credentials, secrets, or per-product configuration — they are pure scoring logic.
- Audit findings never carry credentials through `8.audit.completed.v1` (Cluster D §8.3 PR-body-style scrubbing + length-cap applies).

### §13.11 — SSOT field-ownership partition (Obj #25 resolution)

| SSOT field family | Owner agent | Other agents' access |
|---|---|---|
| `audit.scores[]`, `audit.evidence[]`, `audit.recommendations[]` | **Agent #8** | read-only |
| `gtm.assessment[]`, `gtm.demo_readiness[]` | Agent #9 | read-only |
| `monitor.health[]`, `architecture_snapshot`, `delta_log` | Agent #10 | read-only |
| `governance_record[]` (delta-score, self-renewal entries) | Agent #3 (Self-Renewal Executor) | read-only |

Per CA-10-A schema, atomic writes per agent prevent cross-agent collisions. Schema-validator (Cluster C) rejects writes to fields outside an agent's declared ownership column-set.

## 14. Cluster C — see §13.4 above.

## 15. Cluster D integration — PROMOTE-WITH-CONDITIONS (D-a/D-b/D-c)

Topics: `8.audit.requested.v1`, `8.audit.completed.v1`, `8.audit.block.v1`, `8.audit.dimension_failed.v1`, `8.audit.rubric_missing.v1` — 5 net-new topics, at the ship ceiling. Single first-ship commit.
- **D-a:** standard naming + harness.
- **D-b:** all 5 `retention-class: governance` (7-year + hash-chain mirror).
- **D-c:** idempotency key `runId + auditDimension + at-truncated-to-second`.

## 16. Cluster E integration — Option (a) LOCKED context

Primary `[RECOMMEND_ONLY]`; no sibling Executor (audit is read-only by design). Same pattern as Agent #6 v2 §16.

---

## 17. v2 Panel objection resolution summary

| Obj # | Description | v2 resolution location |
|---|---|---|
| **03/19** | Rubric files not written / unvalidated | §13.5 — rubric ratification gate; 5 PRs ship before Agent #8 first-ship |
| **07** | Insufficient error handling during audit | §13.9 — per-dim isolation + dimension_failed envelope |
| **10** | Incomplete security controls (credentials) | §13.10 — scrub at boundary; rubrics credential-free |
| **22** | Mode logic conflicts | §13.4 — output mode-agnostic, thresholds mode-conditional |
| **24** | Cluster B deadlock | §13.2 — recoveryHint.requiresUpstream field |
| **25** | SSOT write scope too broad | §13.11 — field-ownership partition table |
| **30** | Cluster C `pipelineMode` inconsistency | §13.4 — field ALWAYS present; v1 omit-pattern reconciled |

---

*End of Agent #8 Quality Audit blueprint v2. Panel `QUORUM_PLURALITY_A8-REVISE` 7/9 objections resolved per §17. Pending W6 re-ratification AND rubric-files Panel ratification.*
