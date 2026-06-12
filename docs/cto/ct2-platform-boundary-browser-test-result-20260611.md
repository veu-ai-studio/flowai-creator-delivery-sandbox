# CT2 Platform Boundary Browser Test Result - 2026-06-11

From: CT2
To: CTO
Result: BLOCK
Branch: `docs/cto-ct2-platform-boundary-result`

## Scope

- FlowAI production: `https://flowai-dun.vercel.app`
- Browser route tested: `https://flowai-dun.vercel.app/flowai?url=https%3A%2F%2Fsaigeplatform.com`
- Product/source URL: `https://saigeplatform.com`
- Product scope observed: `saige`
- Mode requested: `auto`
- Max iterations requested: `1`
- Observation start UTC: `2026-06-12T02:54:30.016Z`
- Observation end UTC: `2026-06-12T02:59:10.796Z`
- Evidence folder, outside repo: `C:\Users\victo\Documents\Codex\flowai-verification\evidence\ct2-platform-boundary-20260612T025430`

## Health Identity

`/api/health` returned:

- Status: `ready`
- Commit short: `e8aef065533b`
- Commit full: `e8aef065533bd273fbd86b55d90c5ea35aea91c5`
- Branch: `main`
- Deployment URL: `https://flowai-1m2aejyhc-veu-ai-studio.vercel.app`
- Environment/region: `production` / `iad1`

## Run Identity

- Run ID: `sse_mqac2hy5_vtqnk3`
- Captured browser request body included:
  - `url: "https://saigeplatform.com"`
  - `mode: "auto"`
  - `maxIterations: 1`
  - `gtmTarget: 95`

Limitation: the visible `/flowai` range control still displayed `ITERATION BUDGET: 100` and final live progress text showed `Iteration 1 of up to 100`. The browser-side request wrapper constrained the outgoing SSE request to `maxIterations: 1`, but the visible UI did not reflect that constraint.

## Boundary Observation

The current-run boundary was first exposed to the browser at the terminal SSE `final` event, followed by `[DONE]`. Earlier raw text hits for `PLATFORM_BOUNDARY_BLOCKED` appeared inside historical governance snapshots and were not counted as the live boundary moment.

Boundary details from the current final payload:

```json
{
  "filePath": "src/api/base44Client.js",
  "classification": "PLATFORM_BOUNDARY_BLOCKED",
  "reason": "base44_client_internal",
  "detail": "FlowAI must not patch Base44/platform internals; route this to platform governance instead of branch creation.",
  "title": "Guard authenticated API calls against unauthenticated root page load (401 + console error)",
  "severity": "high",
  "category": null,
  "stage": "prioritization"
}
```

Named step where the boundary was recorded:

- Internal stage: `prioritization`
- Browser-visible pipeline step: `Issue Prioritization`
- Tool/event associated in orchestration log: `Claude-powered prioritization (file-list-constrained, DISPATCH 27)`
- Step result included `platformBoundaryBlocked: 1`

## UI State Visible To Victor

The UI terminated and showed:

- `BEST EFFORT`
- `Exit: PLATFORM_BOUNDARY_BLOCKED - 1 iterations`
- Iteration history row: `1 | 71 | 71 | +0 | PLATFORM_BOUNDARY_BLOCKED`
- Raw score: `71/100`
- Trust score: `35.5/100`
- Scored dimensions: `5/10`
- Evidence coverage warning: `scored 5/10 dimensions`
- Platform blocked section showing `src/api/base44Client.js (PLATFORM_BOUNDARY_BLOCKED)`

However, the same completion surface also showed deployment/preview messaging inconsistent with the no-mutation boundary:

- `Live upgraded deployment is ready.`
- Original product: `https://saigeplatform.com`
- Upgraded product: `https://saige-v2.vercel.app`
- Button: `Open preview URL`

Final payload fields also included:

- `previewUrl: "https://saigeplatform.com"`
- `upgradedUrl: "https://saige-v2.vercel.app"`
- `upgradeDeployed: true`
- `upgradeDeployStatus: "deployed"`
- `branchName: null` in the iteration record
- no `prUrl`

## Terminal Status

Terminal status: `clean_final_plus_DONE`

- Final SSE event observed: yes
- `[DONE]` observed: yes
- UI hang after boundary: no
- Runtime error terminal: no

## Milestone Checklist

- Branch creation observed: no
- Preview deployment observed: no new preview deployment observed; UI/final payload still presented existing/source deployment fields
- Post-fix scoring observed: yes, `preScore: 71`, `postScore: 71`, `delta: 0`, with `decision: PLATFORM_BOUNDARY_BLOCKED`
- Governance write observed: yes, step 14 `Audit Record` / `product_ssot.governance_record` reported `written: true`
- ProductSSOT persistence observed: yes as an audit/governance write surface; no SSOT claim movement made by CT2

## PASS/BLOCK Decision

BLOCK.

Reason: CT2 observed the boundary event and the UI terminated cleanly, but the UI did not provide honest no-branch/no-mutation messaging. It presented existing/source deployment state as an available upgraded/preview delivery surface after the boundary:

- `Live upgraded deployment is ready.`
- `previewUrl` was the source URL `https://saigeplatform.com`
- `upgradedUrl` was the existing registry URL `https://saige-v2.vercel.app`
- no branch creation or PR was observed

This matches the dispatch BLOCK criteria for inflated deployment/repair success and relabeling source/fallback or pre-existing URL state as deployed/preview proof.

## Evidence Limitations

- In-app Browser plugin setup failed in this workstation session, so Playwright Chromium was used for browser-facing observation. Screenshots and raw observation JSON are stored outside the repo in the evidence folder listed above.
- The `/flowai` UI range control did not naturally support `maxIterations=1`; the outgoing browser fetch request was constrained to `maxIterations: 1`, but visible UI text still showed `100`.
- The UI only exposed file path/classification in the platform-blocked section; reason/stage/detail were taken from the final SSE payload as supporting evidence.
- This is browser/runtime observation only. It is not Tier A evidence for SSOT or VERIFIED claim movement.

## Claim Movement

No SSOT movement.
No VERIFIED movement.
No deployment, promotion, env alteration, gate bypass, branch mutation, or claim-promotion action was performed by CT2.
