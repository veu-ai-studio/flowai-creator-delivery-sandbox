# Job 9 — Rubric Storage Location Verification

## W0 ruling (per audit prompt)

Rubrics live at `src/lib/audits/rubrics/`.

## Verification

- `Glob src/lib/audits/**/*` → no matches.
- `Glob src/lib/audits/rubrics/**/*` → no matches.
- Directory listing of `src/lib/` does not contain `audits/`.

**Status:** ❌ DIRECTORY DOES NOT EXIST. Therefore no rubric files exist at the W0-ruled location.

## Where rubrics actually live today

Both rubrics are inlined in `src/lib/governance/ScoreEvaluator.js`:

| Rubric | File | Location |
|---|---|---|
| `GOVERNANCE_RUBRIC_V1` | `src/lib/governance/ScoreEvaluator.js` | Lines 22–82 |
| `READINESS_RUBRIC_V1` | `src/lib/governance/ScoreEvaluator.js` | Lines 84–137 |

**This is W2 territory, not W3.** Per W0 ruling, rubrics must move out of `src/lib/governance/` into `src/lib/audits/rubrics/`. The current placement is a **drift from W0 ruling**.

## Ownership concerns

| Concern | Status |
|---|---|
| Rubrics owned by W3? | ❌ Currently owned by W2 (in `src/lib/governance/`). |
| Duplication into W2 territory? | ⚠️ The rubrics live **only** in W2 territory today. They are not duplicated; they are mis-located. |
| If W3 moves them, what does W2 keep? | The validation harness `validateRubricWeights()` (lines 139–144) and the `ScoreEvaluator` class can stay in `src/lib/governance/`. Only the two `*_RUBRIC_V1` constants need to relocate. |

## Recommended W3 action

1. Create `src/lib/audits/rubrics/` directory.
2. Move `GOVERNANCE_RUBRIC_V1` → `src/lib/audits/rubrics/governance.v1.js`.
3. Move `READINESS_RUBRIC_V1` → `src/lib/audits/rubrics/readiness.v1.js`.
4. Re-export from `ScoreEvaluator.js` for backwards compatibility, or have callers import from the new path. (Note: per X-005 / general "no grandfathering" stance, prefer the clean cut.)
5. Add a `rubrics/meta/` subdirectory for the auditor-of-auditor meta-rubrics (see Job 10).
6. The weight-sum validation logic at lines 139–144 of `ScoreEvaluator.js` should move adjacent to the rubric files, so each rubric self-validates at module load.

## Conclusion

- Specified location (`src/lib/audits/rubrics/`): **does not exist**.
- Actual location: inlined in `src/lib/governance/ScoreEvaluator.js`.
- Drift from W0 ruling: **yes**, but it's a placement drift only — the rubric **content** is correct (weights sum to 100 on both, validated at module load).
