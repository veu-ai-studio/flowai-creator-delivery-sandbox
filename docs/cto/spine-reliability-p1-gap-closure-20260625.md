# Spine Reliability P1 Gap Closure - 2026-06-25

## Status

P1 implementation complete on branch:

`feature/spine-reliability-failover`

Base evidence commit before this implementation:

`92597f2`

This packet records code/test evidence for the remaining failover gaps. It does not move a capability claim. Non-builder review, merge, production promotion, deploy identity confirmation, and production reruns remain required.

## Why This Change Exists

The preview proof showed the Research path can timeout and fail fast instead of hanging or returning a degraded 100. CB inventory then found additional dispatch seams that could still hang to the outer run limit:

- `src/lib/forge/auditRunner.js`: direct score dispatch had no ranked failover/per-call timeout.
- `src/lib/forge/designRunner.js`: direct design dispatch had no ranked failover/per-call timeout.
- `src/lib/forge/stepOwnerRecommendations.js`: step-owner recommendation call had no timeout guard.
- `src/lib/forge/buildRunner.js`: build seam required confirmation that selected-member readiness does not pre-empt failover.

## What Changed

### Audit Runner

`src/lib/forge/auditRunner.js`

- Wraps live `score` dispatches in `runRankedToolWithFailover`.
- Records per-candidate attempt history with `attachAttemptHistory`.
- Applies a per-call timeout before the outer run timeout can be reached.
- Preserves candidate selection evidence in the returned tool-selection record.
- Keeps all score dimensions on the real audit path; no proof route was added.

### Design Runner

`src/lib/forge/designRunner.js`

- Wraps live `design` dispatch in `runRankedToolWithFailover`.
- Records selected/unavailable/timeout/failover/succeeded attempt history.
- Removes the pre-dispatch Anthropic-only readiness gate from the live path so unavailable top-ranked candidates can fail over instead of hard-stopping before the loop.
- Reports the actual dispatched fallback candidate in the orchestrated-section evidence.

### Step Owner Recommendations

`src/lib/forge/stepOwnerRecommendations.js`

- Adds a bounded timeout around `invokeStepOwner`.
- Keeps the recommendation path non-blocking: a stalled owner returns `null` after timeout instead of hanging the run.

### Build Runner Seam

`src/lib/forge/buildRunner.js`

- No patch required in this pass.
- Existing branch code already routes live build through `runRankedToolWithFailover`.
- Existing tests confirm:
  - hanging selected build member times out and fails over;
  - missing credentials on the top-ranked build member fail over instead of hard-stopping.

## Verification

Syntax:

- `node --check src/lib/forge/designRunner.js` PASS
- `node --check src/lib/forge/auditRunner.js` PASS
- `node --check src/lib/forge/stepOwnerRecommendations.js` PASS

Focused tests:

`npx vitest run tests/forge/designStep.test.js tests/forge/auditStep.test.js tests/forge/buildStep.test.js tests/forge/stepOwnerGraduation.test.js tests/forge/rankedToolFailover.test.js`

Result:

- 5 test files PASS
- 86 tests PASS

## New Test Coverage

- Design: top-ranked unavailable candidate fails over to the next callable design tool.
- Design: hanging selected candidate times out and fails fast with attempt history.
- Audit: top-ranked unavailable score candidate fails over to the next callable audit tool.
- Audit: hanging selected score candidate times out and fails fast with attempt history.
- Step owner: stalled recommendation times out without hanging the forge.

## Claim Discipline

Current claim remains:

`SPINE RELIABILITY - PREVIEW-PROVEN, NOT YET IN PRODUCTION`

This P1 work is code/test evidence only. It does not prove production behavior and does not move Creator, Upgrader, Universal, or VERIFIED claims.

## Next Required Gate

P2 non-builder review must verify:

1. The preview proof from origin and raw SSE evidence.
2. The P1 gap fixes listed above.
3. The buildRunner seam remains failover-safe.
4. The owed security review for `FLOWAI_INTERNAL_SECRET` as an operator credential.

Only after P2 passes should the branch merge to `main`, promote to production, confirm `/api/version`, and rerun both production cases:

- `victorudo.com`
- `ourcommunitiesai.com`

