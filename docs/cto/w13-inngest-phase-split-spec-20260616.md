# W13 Inngest Phase Split Spec

Date: 2026-06-16 UTC
Owner: W04 spec / CTO route
Gate: Gate 2 - W13 Inngest phase split
Dispatch class: T4 KEY
Runtime changes in this spec: none
VERIFIED movement: none

## Objective

Refactor the forge background execution path so a production forge run is split into five serializable Inngest phases, each inside the 300s execution window, without breaking the foreground SSE path.

The fix must address the 5 -> 6 stall honestly: long-running work cannot rely on one in-process `runOrchestration` closure and one Inngest handler call.

## Current Evidence

Current runtime shape:

- `api/_lib/inngest.js` registers `forge-run-construction-executor` and delegates one event to `runConstructionToStatus`.
- `src/api/run-construction.js` `runConstructionToStatus` calls `runConstructionHandler(fakeReq, fakeRes, { internalBackgroundJob: true })` once.
- `src/api/run-construction.js` `checkpointStep` only wraps status-event appends.
- `src/lib/agents/renewal/orchestrator.js` exports one large `runOrchestration(args)` body starting at current line `893`.
- Critical cross-boundary locals include `token`, `branchName`, `fileChanges`, and `originalContentByPath`.

Prior architecture source:

- `docs/cto/forge-run-state-architecture.md`

## Required Architecture

Add a JSON-serializable `ForgeRunState` envelope and five phase functions:

1. `bootstrap`
2. `evaluate`
3. `build`
4. `deploy_score`
5. `finalize`

Foreground SSE path:

- Must keep the same public request/response shape.
- May execute the same phase functions inline in-process.
- Must not require Inngest for local/foreground operation.

Background Inngest path:

- Must persist `ForgeRunState` after each phase.
- Must enqueue the next phase after successful persistence.
- Must not pass live closure state between phases.
- Must rehydrate credentials per phase.
- Must never persist raw GitHub/Vercel/LLM tokens.

## ForgeRunState Minimum Schema

```json
{
  "runId": "string",
  "productId": "string|null",
  "environment": "prd|preview|dev",
  "status": "queued|running|blocked|failed|completed",
  "currentPhase": "bootstrap|evaluate|build|deploy_score|finalize",
  "completedSteps": [],
  "phaseInputs": {},
  "phaseOutputs": {},
  "productContext": {
    "product": {},
    "pathB": false,
    "runMode": "",
    "initialUrl": "",
    "githubRepoUrl": "",
    "productBranch": "",
    "upgradeTargets": {}
  },
  "runtimeState": {
    "mode": "auto",
    "gtmTarget": 95,
    "operatorMode": "",
    "operatorContext": {},
    "skippedSteps": [],
    "pipelineErrors": {}
  },
  "iteration": {
    "number": 1,
    "max": 1,
    "currentUrl": "",
    "noImprovementStreak": 0
  },
  "scores": {
    "originalScore": null,
    "lastPostScore": null,
    "originalGtmScore": null,
    "lastPostGtm": null,
    "preScoreEvidenceDegraded": false,
    "postScoreEvidenceDegraded": false
  },
  "repoState": {
    "owner": null,
    "repo": null,
    "branchName": null,
    "credentialRef": null,
    "tokenExpiresAt": null,
    "repoFileList": null,
    "knownPackages": [],
    "treesOutcome": null
  },
  "buildState": {
    "prioritizedIssues": [],
    "fileChanges": [],
    "originalContentPairs": [],
    "fixOutcomes": [],
    "remediationSummary": null,
    "remediationPatches": [],
    "remediationConflicts": [],
    "remediationDeferred": [],
    "remediationEscalated": []
  },
  "deployState": {
    "previewUrl": null,
    "finalPreviewUrl": null,
    "deployDegraded": false,
    "deploymentId": null
  },
  "artifactRefs": {},
  "statusBus": {
    "lastEventId": null,
    "eventsWritten": 0
  },
  "errors": [],
  "resumeToken": {
    "phase": "",
    "attempt": 0,
    "idempotencyKey": ""
  },
  "timestamps": {
    "createdAt": "",
    "updatedAt": "",
    "phaseStartedAt": "",
    "completedAt": null
  },
  "version": 1
}
```

## Serialization Requirements

- `originalContentByPath` must serialize as `originalContentPairs: [[path, content]]`.
- `knownPackages` must serialize as an array of strings.
- `Map`, `Set`, functions, class instances, Response objects, Error objects, and tokens must not be persisted directly.
- Large file contents and crawl/evaluation payloads may move to `artifactRefs`, but references must be resolvable by later phases.
- Token state must be stored as credential source metadata only; each phase re-mints/reloads short-lived credentials.

## Phase Boundaries

Line references are from current `main` at `bac4ac9` source state.

### Phase 1 - `bootstrap`

Boundary:

- `src/lib/agents/renewal/orchestrator.js:893` through approximately `2011`

Responsibilities:

- Normalize args and mode.
- Resolve product, product id, path type, upgrade target state, operator context.
- Load ProductSSOT historical context as context only.
- Resolve rate limits and readiness gates that do not require long crawl/build work.
- Initialize `ForgeRunState` and persist version `1`.

Outputs:

- `productContext`
- `runtimeState`
- initial `iteration`
- credential readiness metadata, not tokens

### Phase 2 - `evaluate`

Boundary:

- `src/lib/agents/renewal/orchestrator.js:2012` through approximately `3153`

Responsibilities:

- Structured crawl and deep crawl.
- Pre-fix monitor text and compute score.
- Phase B probe / adversarial probe.
- Evaluation pipeline.
- Source-mapped enrichment.
- Repo file list / package list / source mapping where required.
- Issue prioritization and platform-boundary filtering.

Outputs:

- `crawlOutput` or artifact ref
- `preScoreEnvelope`
- `phaseBFindings`, `phaseBSummary`, page counts
- `pipelineOutput`, `pipelineFindings`, `pipelineStats`, `pipelineErrors`
- `sourceMappings`, `sourceMappedFixProposals`
- `prioritizedIssues`
- refreshed credential metadata

### Phase 3 - `build`

Boundary:

- `src/lib/agents/renewal/orchestrator.js:3154` through approximately `4403`

Responsibilities:

- Enforce platform/auth/secret/package/route/diff gates.
- Fetch source files and preserve baselines.
- Generate safe fixes.
- Run construction and remediation engines.
- Serialize `originalContentByPath` as pairs.
- Create branch and commit files where allowed.
- Produce no-fix or blocked states honestly.

Outputs:

- `repoState.owner`
- `repoState.repo`
- `repoState.branchName`
- `buildState.fileChanges`
- `buildState.originalContentPairs`
- `buildState.fixOutcomes`
- remediation summary/conflicts/deferred/escalated
- branch/commit result or explicit skip/block reason

### Phase 4 - `deploy_score`

Boundary:

- `src/lib/agents/renewal/orchestrator.js:4404` through approximately `5179`

Responsibilities:

- Deploy branch preview or invoke remediation-engine deployment path.
- Capture post-fix evaluation snapshot.
- Run post-fix monitor text and score.
- Run post-fix crawl and Phase B re-probe if applicable.
- Compute transformation delta and regression gate.
- Decide continue/stop for the current iteration.

Outputs:

- `deployState.previewUrl`
- `deployState.finalPreviewUrl`
- deployment id / degraded reason
- `postScoreEnvelope`
- transformation delta / regression gate result
- terminal iteration log
- next `currentUrl` or terminal exit reason

### Phase 5 - `finalize`

Boundary:

- `src/lib/agents/renewal/orchestrator.js:5180` through final return

Responsibilities:

- PR write or explicit PR skip reason.
- Tool-selection governance write.
- ProductSSOT governance record write.
- Final response envelope.
- Mark `ForgeRunState` completed/failed/blocked.

Outputs:

- final SSE/status envelope
- ProductSSOT persistence result
- governance record id
- final score fields with evidence caveats
- final `ForgeRunState.status`

## Persistence Strategy

Add a new Supabase table: `forge_run_state`.

Rationale:

- `forgeRunStatusBus` is transport/status, not authoritative resume state.
- `product_ssot` is canonical product memory, not hot execution state.
- A dedicated table allows CAS/versioned phase updates and retry safety.

Minimum columns:

- `run_id text primary key`
- `product_id text`
- `environment text`
- `status text`
- `current_phase text`
- `state jsonb not null`
- `version integer not null default 1`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `completed_at timestamptz`

Required behavior:

- Compare-and-swap update on `(run_id, version)`.
- Duplicate Inngest retries must not overwrite newer phase state.
- Persist before enqueueing next phase.

## Inngest Event Model

Keep the existing `flowai/forge.run.requested` entry event, but change it to start phase 1.

Add internal phase events:

- `flowai/forge.phase.bootstrap`
- `flowai/forge.phase.evaluate`
- `flowai/forge.phase.build`
- `flowai/forge.phase.deploy_score`
- `flowai/forge.phase.finalize`

Each event payload:

```json
{
  "runId": "string",
  "phase": "evaluate",
  "expectedVersion": 2,
  "idempotencyKey": "runId:phase:attempt"
}
```

## Definition Of Done

CB must deliver complete replacement files, not partial diffs.

Implementation DoD:

- `ForgeRunState` serializer/deserializer implemented and unit-tested.
- `originalContentByPath` Map round trip tested as `originalContentPairs`.
- No raw token is persisted in `forge_run_state`, `forgeRunStatusBus`, ProductSSOT, logs, or docs.
- Foreground SSE path still works with the same external API response shape.
- Background Inngest path runs through five phase events and persists state between phases.
- Each phase is idempotent under duplicate Inngest retry.
- Phase timeout budget is under 300s per phase.
- The existing 800s best-effort window can remain but is not relied on for successful background completion.
- Status bus events still reach the UI/status API.
- ProductSSOT is updated only with canonical governance facts, not hot execution internals.
- Existing Universal Delivery behavior is preserved.
- Existing Fresh Build behavior is preserved.

Test DoD:

- Focused `ForgeRunState` tests pass.
- Focused run-construction/Inngest tests pass.
- Orchestrator tests pass.
- Full `npm run preflight` passes.
- CD and CR independently verify after CB build.

Live Proof DoD:

- CB runs a LIVE forge on `https://flowai-dun.vercel.app`.
- Target must be FlowAI itself or another non-Base44-owned FlowAI-deployed target; do not use Base44 as the proof target.
- Proof must show phase events clearing through the former 5 -> 6 stall.
- Proof must reach Step 8.
- Proof must write a ProductSSOT artifact.
- Proof must include a real score with durable evidence fields:
  - `evidenceUrl`
  - `verifiedAt`
  - `verifiedBy`
- No `matrixArtifact` VERIFIED movement unless W04/CEO separately authorizes exact row mapping.

Stop Conditions:

- CB stops if a phase needs a non-serializable closure variable that is not in the schema.
- CB stops if foreground SSE would change externally.
- CB stops if ProductSSOT would be used as hot execution-state storage.
- CB stops if any token would be persisted.
- CB stops if live proof cannot be run without Base44.

## SSOT Impact

This requires a minimal canonical amendment before claiming the architecture as canonical, because `forge_run_state` introduces a new distinction between operational execution state and ProductSSOT canonical memory.

Minimum amendment text:

> ProductSSOT remains canonical product memory. `forge_run_state` is operational execution state for resumable forge phases and cannot be used for VERIFIED claim promotion by itself.

