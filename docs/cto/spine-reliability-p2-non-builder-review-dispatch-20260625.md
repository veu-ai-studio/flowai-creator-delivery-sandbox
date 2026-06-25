# Spine Reliability P2 Non-Builder Review Dispatch - 2026-06-25

FROM: CTO

TO: Non-builder reviewer

RE: P2 review gate for `feature/spine-reliability-failover`

## Status

P2 is required before any P3 merge, promotion, or production rerun.

The branch author does not self-certify this merge. Review must be completed by a non-builder reviewer who did not author commit `d26ad6e`.

Branch:

`feature/spine-reliability-failover`

Implementation commit to review:

`d26ad6e`

Output review artifact:

`docs/cto/spine-reliability-p2-non-builder-review-20260625.md`

## Part A - Live Proof From Origin

Read from origin, not from a summary:

- `docs/cto/spine-reliability-live-victorudo-evidence-20260625.md`
- `docs/cto/spine-reliability-live-victorudo-20260625T054658Z.sse`

Confirm whether the raw SSE evidence shows the real sequence:

`selected -> timeout -> next candidate/failover -> exhausted -> fail-fast`

This must be sequence evidence, not isolated keywords or the evidence packet's conclusion.

Helpful read-only checks:

```powershell
git fetch --all --quiet
git show origin/feature/spine-reliability-failover:docs/cto/spine-reliability-live-victorudo-evidence-20260625.md | Select-String -Pattern 'RESEARCH_EVIDENCE_UNAVAILABLE|failover|next candidate|timeout|5000|1b81c9c|showcase|ALREADY_AT_TARGET'
git show origin/feature/spine-reliability-failover:docs/cto/spine-reliability-live-victorudo-20260625T054658Z.sse | Select-String -Pattern 'selected|timeout|failover|next|unavailable|fail.fast' -Context 2,2
```

Verdict required:

`A PASS` or `A BLOCK`

## Part B - P1 Gap Fixes

Read the diff from origin, not the implementation summary.

Confirm:

1. `src/lib/forge/auditRunner.js` routes score dispatch through a failover/timeout primitive.
2. `src/lib/forge/designRunner.js` routes design dispatch through a failover/timeout primitive.
3. `src/lib/forge/stepOwnerRecommendations.js` guards step-owner calls with a timeout.
4. `src/lib/forge/buildRunner.js` still keeps `assertSelectedBuildMemberReady` from pre-empting the failover loop.

Helpful read-only checks:

```powershell
git show origin/feature/spine-reliability-failover --stat
git show origin/feature/spine-reliability-failover -- src/lib/forge/auditRunner.js src/lib/forge/designRunner.js src/lib/forge/stepOwnerRecommendations.js tests/forge/auditStep.test.js tests/forge/designStep.test.js tests/forge/stepOwnerGraduation.test.js
git grep -n "assertSelectedBuildMemberReady\\|runRankedToolWithFailover" origin/feature/spine-reliability-failover -- src/lib/forge/buildRunner.js tests/forge/buildStep.test.js
```

Verdict required:

`B PASS` or `B BLOCK`

## Part C - Owed Security Review

This is a separate gate, not part of "the chain works."

Inspect where `FLOWAI_INTERNAL_SECRET` is accepted as an operator/internal credential and what code paths it authorizes.

Answer explicitly:

1. What does accepting `FLOWAI_INTERNAL_SECRET` authorize? What can a caller holding it do?
2. Is that scope appropriate for an internal/operator credential, or does it over-broaden auth?
3. Verdict: `APPROPRIATE` or `OVER-BROAD`.

If `OVER-BROAD`, P3 is blocked until the credential surface is narrowed or rolled back.

Helpful read-only checks:

```powershell
git grep -n "FLOWAI_INTERNAL_SECRET\\|operator secret\\|internal secret\\|isOperator\\|operator" origin/feature/spine-reliability-failover -- api src
```

Verdict required:

`C APPROPRIATE` or `C OVER-BROAD`

## Required Output

Write the review to origin as:

`docs/cto/spine-reliability-p2-non-builder-review-20260625.md`

The review must include:

- reviewer identity;
- reviewed branch and commit;
- A/B/C verdicts;
- files/functions inspected;
- raw origin evidence excerpts sufficient to support the verdicts;
- explicit security conclusion for `FLOWAI_INTERNAL_SECRET`;
- final decision: `P2 PASS` or `P2 BLOCK`.

P3 merge remains blocked until A, B, and C pass.

