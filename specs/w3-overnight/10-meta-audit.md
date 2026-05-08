# Job 10 — Audit-of-the-Auditor Architecture Audit

## File presence

- `src/lib/audits/auditOfAuditor.js` — ❌ DOES NOT EXIST.
- `src/lib/audits/` — ❌ DOES NOT EXIST.
- Any `auditOfAuditor*.js` anywhere in the repo — ❌ DOES NOT EXIST.

## What the W2 engine has prepared for it

`src/lib/governance/ScoreEvaluator.js` has the following auditor-of-auditor hooks pre-wired:

```js
// Line 147 (constructor option)
constructor({ rubric, criterionEvaluators, deps, auditOfAuditorMode = false }) { ... }

// Line 164 (evaluator-id toggle)
this.evaluatorId = auditOfAuditorMode ? 'auditor_of_auditor' : 'auditor';

// Lines 173–182 (Agent #8 self-audit guard)
if (
  target.type === TARGET_TYPES.AGENT &&
  String(target.id) === '8' &&
  !this.auditOfAuditorMode
) {
  throw new Error(
    'Agent #8 cannot be audited by the primary evaluator. ' +
    'Use the auditor-of-auditor instance (W3 territory).'
  );
}
```

So the engine **refuses** to evaluate Agent #8 (Quality Audit) in primary mode and **expects** a W3-supplied auditor-of-auditor instance to run with `auditOfAuditorMode: true`.

## Architecture compliance against the W0 ruling

| Required property (per audit prompt) | Status |
|---|---|
| **Independent code path from primary scoringEngine** | ❌ **Drift.** The current design re-uses the same `ScoreEvaluator` class with a flag toggle. There is no separate class, no separate file, no separate code path. The flag only changes the `evaluatorId` string and bypasses the Agent #8 guard. **W3 must either** (a) supply genuinely independent criterion evaluators in a separate `src/lib/audits/auditOfAuditor.js`, or (b) escalate to W2 to author a separate `MetaScoreEvaluator` class. The current shape relies on configuration, not architecture. |
| **Separate rubric loading from `rubrics/meta/` vs `rubrics/primary/`** | ❌ **Not implemented.** Neither `rubrics/`, `rubrics/meta/`, nor `rubrics/primary/` exists. The two rubrics live in `src/lib/governance/ScoreEvaluator.js` (see Job 9). The auditor-of-auditor would today receive whatever rubric the caller hands it — there is no enforcement that meta uses a different rubric. |
| **Disagreement protocol thresholds T = 5 (third run) and T2 = 10 (W0 escalation)** | ❌ **Missing entirely.** Searched the whole repo for `T = 5`, `T2 = 10`, `DISAGREEMENT_T`, `disagreement_delta`, `third.run`, `third_run` — no matches. The disagreement state machine and escalation protocol are unbuilt. |
| **Disagreement record persistence** | ❌ **Missing.** No `disagreement` table (planned for migration 0010 — see Job 7), no in-memory data structure. |

## Drift summary

| Drift | Severity |
|---|---|
| No separate code path (flag-toggle only) | High — risks shared bugs between primary and meta auditor. |
| Rubric storage not split into `rubrics/primary/` vs `rubrics/meta/` | High — meta auditor would today consume the primary rubric, which is exactly the failure mode the W0 ruling tries to prevent. |
| No disagreement-protocol implementation (T = 5, T2 = 10) | Critical — without this, two evaluators that disagree have no defined resolution path. |

## What W3 must build

1. `src/lib/audits/auditOfAuditor.js` — a new module that:
   - Loads its rubric from `src/lib/audits/rubrics/meta/` (e.g., `governance.meta.v1.js`, `readiness.meta.v1.js`).
   - Loads its criterion evaluators from `src/lib/audits/criteria/meta/`.
   - Constructs `new ScoreEvaluator({ ..., auditOfAuditorMode: true })` and runs it against Agent #8.
2. `src/lib/audits/disagreementProtocol.js` (new) — implements:
   - `DISAGREEMENT_T = 5` (delta in rounded score that triggers a third independent run).
   - `DISAGREEMENT_T2 = 10` (delta that escalates to W0).
   - `record({ targetType, targetId, t1Score, t2Score, t3Score? })` writes a row to the (yet-unbuilt) `disagreements` table.
3. Migration `0010_w3_audit_infra.sql` with the `disagreements` table (see Job 7 for collision warnings).

## Conclusion

The auditor-of-auditor is **wired into the engine but unbuilt as a deliverable.** Three drifts vs the W0 ruling: no separate code path (flag-toggle only), no rubric directory split, no disagreement-protocol implementation. All three need W3 work before Agent #8 can be cleared end-to-end.
