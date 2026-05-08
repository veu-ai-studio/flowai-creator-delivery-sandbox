# Job 4 — Audit Infrastructure Spec Compliance

## Spec source

The user prompt names five W3 audit-infrastructure modules: **scoringEngine**, **rubricRunner**, **defectDatabase**, **reportGenerator**, **auditOfAuditor**.

**No `specs/w3-*` files exist in the repo prior to this audit.** No on-disk W3 spec was authored before this run. The closest spec-shaped artifact is `src/docs/w2/v3-defect-register.md`, which is W2-owned but enumerates the W3 hand-off in section "CROSS-WORKSTREAM DEFECTS" (X-001 through X-006) and confirms `auditOfAuditor` lives in W3 territory.

The interface contract for each W3 module is therefore **inferred** from the consumer (`src/lib/governance/ScoreEvaluator.js`) and the W2 hand-off notes.

## Per-module compliance

### 1. `scoringEngine`

**Inferred interface:** instantiates `ScoreEvaluator(rubric, criterionEvaluators, deps, auditOfAuditorMode)`, runs `evaluator.evaluate(target, ctx)`, returns the frozen evaluation object.

| Item | Status |
|---|---|
| Exists at `src/lib/audits/scoringEngine.js`? | ❌ No (`src/lib/audits/` does not exist). |
| Required interface implemented? | ❌ No file. |
| Missing | Whole module: a thin driver that composes rubric + evaluators + deps and calls `evaluate()`. |

### 2. `rubricRunner`

**Inferred interface:** loads a rubric (governance.v1 or readiness.v1) plus its criterion evaluators, runs each evaluator against a target, and returns per-criterion `{ id, score, evidence, notes }` rows shaped for the `ScoreEvaluator._validateCriterionResult` static check.

| Item | Status |
|---|---|
| Exists? | ❌ No. |
| Required interface | A loader: `loadRubric(version)` → rubric; `loadEvaluators(version)` → `criterionEvaluators` map. |
| Missing | All of it. The 13 criterion evaluators (7 governance + 6 readiness) are unbuilt. |

### 3. `defectDatabase`

**Inferred interface:** consumer of `ScoreEvaluator.toDefectRegister(evaluation)`. Persists per-failure rows keyed by `defectId = ${targetType}_${targetId}_${criterionId}_${evaluatedAt}`.

| Item | Status |
|---|---|
| Exists at `src/lib/audits/defectDatabase.js`? | ❌ No. |
| Migration `0010_w3_audit_infra.sql` (defect / audit_run / disagreement tables)? | ❌ Not in `supabase/migrations/`. See Job 7. |
| Missing | Storage layer + write API. `ScoreEvaluator.toDefectRegister()` is the producer; nothing consumes it today. |
| Note | Migration `0002_super_customer.sql` already defines `audit_runs` and `audit_issues` for the **Super Customer Agent**. These are **not** the W3 governance/readiness defect tables. They share a name (`audit_runs`) — a collision risk if the W3 0010 migration also picks `audit_runs`. |

### 4. `reportGenerator`

**Inferred interface:** consumes a clearance decision (governance + readiness evaluation pair) and produces a human-readable report; emits `system.clearance.decision.v1` envelope.

| Item | Status |
|---|---|
| Exists? | ❌ No. |
| MessageSchema topic `system.clearance.decision.v1`? | ✅ Declared in `MessageSchema.js:103` with payload validator at `MessageSchema.js:138–143`. |
| `clearanceDecision()` helper? | ✅ Exported from `ScoreEvaluator.js:271–291`. |
| Missing | The driver: nobody calls `clearanceDecision()` and nobody publishes to `system.clearance.decision.v1`. |

### 5. `auditOfAuditor`

**Inferred interface (per W0 ruling and X-002 in v3-defect-register):** an independent ScoreEvaluator instance constructed with `auditOfAuditorMode: true`, scoring Agent #8 against meta-rubrics, with disagreement protocol thresholds T = 5 (third run) and T2 = 10 (W0 escalation).

| Item | Status |
|---|---|
| Exists at `src/lib/audits/auditOfAuditor.js`? | ❌ No. |
| `auditOfAuditorMode` flag in the engine? | ✅ Wired into `ScoreEvaluator` constructor (line 147) and used to bypass the Agent #8 self-audit guard (lines 173–182). |
| Independent code path? | ⚠️ Same `ScoreEvaluator` class — only the `evaluatorId` toggles to `'auditor_of_auditor'` (line 164). True independence (separate code path / separate criterion evaluator set) is **not** enforced by the engine; W3 must supply distinct evaluators. |
| Disagreement-protocol thresholds (T = 5, T2 = 10)? | ❌ Not implemented anywhere. No `DISAGREEMENT_T` / `DISAGREEMENT_T2` constants exist. |
| Missing | Whole module + threshold constants + protocol state machine. |

## Built vs. missing — module summary

| W3 module | Code present | Interface complete | Missing |
|---|---|---|---|
| scoringEngine | ❌ | ❌ | Whole driver |
| rubricRunner | ❌ | ❌ | Loader + 13 criterion evaluators |
| defectDatabase | ❌ | ❌ | Storage + write API + migration 0010 |
| reportGenerator | ❌ | ❌ | Clearance-publisher driver |
| auditOfAuditor | ❌ (flag wired in W2 engine) | ❌ | Whole module + disagreement state machine |

**Conclusion:** none of the five W3 modules exist. The W2 engine (`ScoreEvaluator`) and message-schema topics (`system.governance.score.v1`, `system.readiness.score.v1`, `system.clearance.decision.v1`) are pre-wired to receive them. The W3 territory remains entirely unbuilt.
