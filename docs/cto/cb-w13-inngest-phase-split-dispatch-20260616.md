# CB Dispatch - W13 Inngest Phase Split

Date: 2026-06-16 UTC
From: CTO
To: CB
Action label: T4 KEY BUILD
Branch: `feature/w13-inngest-phase-split`
Base: current `main`

## Governing Docs

Read first:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/w13-inngest-phase-split-spec-20260616.md`
- `docs/cto/forge-run-state-architecture.md`

## Objective

Build the W13 Inngest phase split so background forge execution no longer relies on one long `runOrchestration` call. The production background path must serialize and persist `ForgeRunState` between five Inngest phases while preserving the foreground SSE API.

## Required Delivery

Deliver complete replacement files, never partial diffs.

Implement:

1. `ForgeRunState` schema helpers and tests.
2. `forge_run_state` persistence adapter with CAS/version behavior.
3. Five phase functions:
   - `bootstrap`
   - `evaluate`
   - `build`
   - `deploy_score`
   - `finalize`
4. Inngest phase event routing.
5. Foreground inline phase runner preserving current SSE behavior.
6. Background phase runner persisting state and enqueueing next phase.
7. Status bus compatibility.
8. Tests covering serialization, retry/idempotency, foreground compatibility, and background phase routing.

## Acceptance Criteria

- No raw tokens persisted.
- `originalContentByPath` serializes as pairs and round-trips.
- Foreground `/api/run-construction` response shape is unchanged.
- Background forge uses serializable phase state, not closure state.
- Every phase has a timeout budget under 300s.
- Duplicate phase retry does not clobber newer state.
- Full `npm run preflight` passes.
- Live forge on `https://flowai-dun.vercel.app` clears the former step 5 -> 6 stall and reaches Step 8.
- Step 8 writes a ProductSSOT artifact with a real, evidenced score.
- No VERIFIED movement.

## Stop Conditions

Stop and report if:

- A required cross-phase variable is not serializable and not represented in the spec.
- The build would change foreground SSE externally.
- The build would store hot execution state in ProductSSOT.
- The build would log or persist raw tokens.
- The live proof would require Base44 as target.
- Full preflight cannot be run.

## Review Route

After CB build:

1. Commit and push branch.
2. Write CB evidence to `docs/cto/cb-w13-inngest-phase-split-result-20260616.md`.
3. Route to CD and CR independently.
4. CD and CR must each state PASS/BLOCK with evidence.
5. If they agree PASS, CTO proceeds to merge/promotion/live proof.
6. If they disagree or block, W04 investigates and dispatches patch.

