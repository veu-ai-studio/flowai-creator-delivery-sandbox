# ForgeRunState Architecture

## CTO Finding

The 5-phase Inngest split is valid only after `runOrchestration` stops relying on in-process closure state. Current Inngest delegates the forge through one background handler call, and `checkpointStep` only wraps status-event appends. That is not resumable execution.

## Variable Map

| Variable | Set At | Type | Consumed By | Serialization |
|---|---:|---|---|---|
| `product`, `pathB`, `productId` | `orchestrator.js:1333`, `1401`, `1479` | object/bool/string | all later phases | JSON product snapshot; strip functions |
| `upgradeTargets`, `githubRepoUrl`, `productBranch`, `initialUrl` | `1479-1495` | objects/strings | repo, deploy, audit | JSON |
| `state` | `1009` plus many mutations | `OrchestrationState` instance | all phases | replace with `runtimeState` JSON; never persist `_resumeResolver` |
| `orchestrationLog`, `iterations` | `1028-1029` | arrays | SSE/status/final audit | JSON arrays, capped/append-only |
| `iterationNumber`, `currentUrl` | `1901-1902`, updated `5178-5179` | number/string | loop phases | JSON |
| `originalScore`, `lastPostScore`, `originalGtmScore`, `lastPostGtm` | `1903-1909`, updated in scoring | number/object | decisions/audit | JSON |
| `preScoreEvidenceDegraded`, `postScoreEvidenceDegraded` | `1910-1911` | boolean | audit | JSON |
| `finalPreviewUrl`, `pr`, `exitReason`, `noImprovementStreak` | `1921-1924` | string/object/string/number | deploy, PR, audit | JSON |
| `token` | `1925`, `2712-2740`, `3223-3249` | secret string | file fetch, branch, PR | do not persist raw token; persist `credentialRef`, source, expiry; re-mint per phase |
| `crawlOutput` | `2028-2106` | object | scoring, Phase B, build | JSON, possibly large; allow artifact ref |
| `preScoreEnvelope`, `iterLog` | `2116`, `2026` | object | build/decision | JSON |
| `phaseBFindings`, `phaseBSummary`, pages/urls | `2327-2469` | arrays/object/numbers | scoring/build/audit | JSON |
| `pipelineOutput`, `pipelineFindings`, `pipelineStats`, `pipelineErrors`, `fixProposals` | `2488-2577` | object/arrays | source mapping, build, audit | JSON/artifact ref if large |
| `repoFileList`, `treesOutcome`, `knownPackages` | `2703-2803` | array/object/Set | prioritizer/fix validation | `knownPackages` becomes string array |
| `sourceMapping`, `sourceMappings`, `sourceMappedFixProposals` | `2860-2960` | object/arrays | build/audit | JSON |
| `prioritizedIssues` | `2996-3101` | array | build/deploy | JSON |
| `owner`, `repo`, `branchName` | `3114-3116` | strings | branch, deploy, PR | JSON |
| `fileChanges` | `3117` | array of `{filePath,fileContent}` | branch/deploy/delta | JSON or artifact ref; include content hash |
| `originalContentByPath` | `3118` | `Map` | safety/regression gates | serialize as `originalContentPairs: [[path, content]]` |
| `fixOutcomes`, `remediationOutput`, `remediationSummary` | build section | arrays/objects | repair gates/audit | JSON |
| `previewUrl`, `deployDegraded` | `4233-4234` | string/bool | post-fix score/decision | JSON |
| `postFixEvaluationOutput`, `postFixSnapshot`, `postScoreEnvelope` | `4503+`, `4595+` | objects | delta/audit | JSON/artifact ref |
| `iterExit`, `delta`, `weighted` | `5035-5172` | strings/objects | loop/final audit | JSON |
| `auditWrite`, `toolSelectionsResult`, `upgradeDelivery` | `5341-5584` | objects | final result | JSON |

## Proposed ForgeRunState Schema

```json
{
  "runId": "uuid",
  "productId": "text",
  "environment": "prd",
  "status": "queued|running|blocked|failed|completed",
  "currentPhase": "bootstrap|evaluate|build|deploy_score|finalize",
  "completedSteps": [],
  "iteration": { "number": 1, "max": 1000, "currentUrl": "", "noImprovementStreak": 0 },
  "phaseInputs": {},
  "phaseOutputs": {},
  "productContext": { "product": {}, "pathB": false, "runMode": "", "initialUrl": "", "githubRepoUrl": "", "productBranch": "", "upgradeTargets": {} },
  "runtimeState": { "mode": "auto", "gtmTarget": 95, "operatorMode": "", "operatorContext": {}, "skippedSteps": [], "pipelineErrors": {} },
  "scores": { "originalScore": null, "lastPostScore": null, "originalGtmScore": null, "lastPostGtm": null, "preScoreEvidenceDegraded": false, "postScoreEvidenceDegraded": false },
  "repoState": { "owner": null, "repo": null, "branchName": null, "credentialRef": null, "tokenExpiresAt": null, "repoFileList": null, "knownPackages": [], "treesOutcome": null },
  "buildState": { "prioritizedIssues": [], "fileChanges": [], "originalContentPairs": [], "fixOutcomes": [], "remediationSummary": null },
  "deployState": { "previewUrl": null, "finalPreviewUrl": null, "deployDegraded": false },
  "artifactRefs": {},
  "statusBus": { "lastEventId": null, "eventsWritten": 0 },
  "errors": [],
  "resumeToken": { "phase": "", "attempt": 0, "idempotencyKey": "" },
  "timestamps": { "createdAt": "", "updatedAt": "", "phaseStartedAt": "", "completedAt": null }
}
```

## Phase Boundaries

1. `bootstrap`: `orchestrator.js:876-2022`
   - Inputs: args, deps/env rehydrated, runId.
   - Outputs: product context, policy, operator context, ProductSSOT row readiness, initial crawl summary.

2. `evaluate`: `orchestrator.js:2023-3101`
   - Inputs: product context, iteration, currentUrl.
   - Outputs: crawl output, early/enriched scores, Phase B/B1 findings, source mappings, repo file list, prioritized issues, refreshed credential ref.

3. `build`: `orchestrator.js:3103-4218`
   - Inputs: prioritized issues, repo context, credential ref.
   - Outputs: branchName, fileChanges, originalContentPairs, fix outcomes, remediation state, branch commit result.

4. `deploy_score`: `orchestrator.js:4219-5179`
   - Inputs: branch/build state or PATH B remediation state.
   - Outputs: previewUrl/finalPreviewUrl, post-fix scores, transformation delta, completed `iterLog`, exit/continue decision, next `currentUrl`.

5. `finalize`: `orchestrator.js:5186-5658`
   - Inputs: terminal iteration state.
   - Outputs: PR result or skip reason, tool-selection governance write, ProductSSOT audit write, final response envelope.

## Persistence Strategy

Recommend a new Supabase table: `forge_run_state`.

Do not use `forgeRunStatusBus` as the source of truth. It is KV/memory status transport with capped events.

Do not use `product_ssot` for hot execution internals. ProductSSOT should receive canonical completed governance facts, not partial tokens, file contents, and retry state.

Suggested columns:

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

Use compare-and-swap updates on `(run_id, version)` so duplicate Inngest retries cannot clobber newer phase state.

## Migration Path

1. Add `ForgeRunState` serializers/deserializers and unit tests, no behavior change.
2. Mirror current monolithic checkpoints into `forge_run_state` while still running the monolith.
3. Extract phase functions behind the same `runOrchestration` API; foreground SSE still calls phases inline in-process.
4. Switch background Inngest to `phase-1 -> persist -> enqueue phase-2` while foreground remains inline.
5. Add resume/idempotency tests per phase, including `originalContentByPath` Map round trip.
6. Only after live preview proof, retire the single-call background handler path.

## SSOT Impact

Yes, minimal amendment required. Update canonical sections covering Section 9 8-step pipeline execution, Section 14 governance/audit persistence, Section 28 symbiotic loop, and Section 28.7 build standards to distinguish transient `ForgeRunState` from canonical ProductSSOT.

Minimum amendment text:

> ProductSSOT remains canonical product memory. `forge_run_state` is operational execution state for resumable forge phases and cannot be used for VERIFIED claim promotion by itself.
