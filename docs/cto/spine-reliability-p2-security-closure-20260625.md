# Spine Reliability P2 Security Closure - 2026-06-25

## Status

Closure patch prepared for P2 Part C.

Non-builder review result:

`C BLOCK: OVER-BROAD`

Reason:

`FLOWAI_INTERNAL_SECRET` was accepted through `x-flowai-operator-secret`, granting operator-secret access to routes that should require the narrower `FLOWAI_OPERATOR_SECRET`.

## Closure Change

Changed:

- `api/_lib/auth.js`
- `src/api/run-construction.js`
- `tests/auth.test.js`

Operator-secret behavior after this patch:

- `x-flowai-operator-secret` matches `FLOWAI_OPERATOR_SECRET` only.
- `FLOWAI_INTERNAL_SECRET` no longer grants `authMode:"operator-secret"` through `requireOperatorAuth`.
- `FLOWAI_INTERNAL_SECRET` remains available for explicit internal bearer/cron/agent paths such as `x-flowai-internal` + `Authorization: Bearer ...`.
- Spine reliability proof requests now require `x-flowai-operator-secret` matching `FLOWAI_OPERATOR_SECRET`.

## Tests Added/Updated

`tests/auth.test.js`

- Positive test: `FLOWAI_OPERATOR_SECRET` via `x-flowai-operator-secret` is accepted for operator auth.
- Negative test: `FLOWAI_INTERNAL_SECRET` via `x-flowai-operator-secret` is rejected.

## Claim Discipline

This closure does not move the spine reliability claim.

It only addresses the P2 security gate so the branch can be re-reviewed before P3 merge/promotion.

## Required Next Review

Non-builder must re-check Part C after this patch:

1. `FLOWAI_INTERNAL_SECRET` is no longer accepted by `requireOperatorAuth`.
2. `FLOWAI_INTERNAL_SECRET` is no longer accepted by the run-construction spine proof operator-secret gate.
3. `FLOWAI_OPERATOR_SECRET` remains accepted for operator-secret routes.
4. Internal bearer/cron/agent usage of `FLOWAI_INTERNAL_SECRET` remains intact.

