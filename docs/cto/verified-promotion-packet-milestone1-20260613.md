# VERIFIED Promotion Packet - Milestone 1 Axis Proof

Date: 2026-06-13
Prepared by: CTO
Status: W04/CEO clearance required before any matrixArtifact edit
VERIFIED movement applied: no

## Executive Summary

Milestone 1 live proof is now complete at the evidence level.

CT2 confirmed patched production commit `65f46a0c96930a207e7cd0c0160cf51317c89822` meets the Priority 2 axis acceptance criteria:

- all four axes are visible and unambiguous in the sidebar;
- each axis is independently selectable;
- Production, Migration, and Fresh Build routes are reachable and preserve axis state;
- `/api/run-construction` receives the selected axis envelope;
- the live run log includes the Flow Hub axis envelope;
- no false deployed URL, branch, preview URL, or VERIFIED claim was observed.

This packet prepares candidate VERIFIED promotions only. It does not apply them.

## Evidence Sources

Primary CT2 PASS evidence:

- Repo path: `docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- GitHub evidence URL: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- Evidence tier: `LIVE_PRODUCTION`
- verifiedAt candidate: `2026-06-13`
- verifiedBy candidate: `CT2 browser acceptance + production run log`

Supporting browser/network evidence:

- `docs/cto/ct2-priority2-axis-live-proof-rerun-browser-evidence-20260613.json`
- `docs/cto/ct2-priority2-axis-live-proof-rerun-screenshots-20260613/`

Production identity:

- Production URL: `https://flowai-dun.vercel.app`
- Health endpoint: `https://flowai-dun.vercel.app/api/health`
- Runtime commit proven by CT2: `65f46a0c96930a207e7cd0c0160cf51317c89822`
- Deployment URL: `https://flowai-7d6rqcts8-veu-ai-studio.vercel.app`

Path 1 Migration URL evidence:

- Public URL: `https://saige-v2.vercel.app`
- CT2 result path: `docs/cto/ct2-saige-production-acceptance-2026-06-13.md`
- Evidence tier: `LIVE_PRODUCTION`
- Boundary: proves public deployed URL and nonblank browser shell only; does not prove SAIGE typecheck debt is fully cleared.

## Candidate Promotions

These are candidates for W04/CEO clearance. The CTO recommends CD/CR review of the exact matrix row mapping before any edit.

### Candidate 1 - Path 1 Migration Deployed URL

Proposed evidence claim:

- FlowAI Migration path has produced one CT2-confirmed deployed URL on a real product target.

Possible matrix target:

- `workflow-4-migration` if W04/CD/CR agree that this row can represent the deployed-URL milestone rather than full migration completion.

Required fields if approved:

- `status`: `VERIFIED`
- `evidenceUrl`: `https://saige-v2.vercel.app`
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance; see docs/cto/ct2-saige-production-acceptance-2026-06-13.md`

CTO caution:

- Do not promote `workflow-4-migration` if its intended claim includes clean typecheck or full Phase 3 debt closure. The current evidence proves a deployed URL, not complete SAIGE migration quality.

### Candidate 2 - Structural Layer Axis

Proposed evidence claim:

- Structural Layer is visible, independently selectable, and reaches the backend/run log.

Evidence:

- CT2 observed `STRUCTURAL LAYER`: `Autonomous`, `Supervised`, `Controlled`.
- CT2 selected `Controlled`.
- Live request payload included `structuralLayer: "controlled"`.
- Run log included Flow Hub axis envelope.

Possible matrix target:

- Existing row `end-to-end-op-system-operation-level`, or a new exact row such as `flowhub-axis-structural-layer`.

Required fields if approved:

- `status`: `VERIFIED`
- `evidenceUrl`: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance + live /api/run-construction payload + run log`

### Candidate 3 - Operational Mode Axis

Proposed evidence claim:

- Operational Mode is visible, independently selectable, and reaches the backend/run log.

Evidence:

- CT2 observed `OPERATIONAL MODE`: `Auto`, `Guided`, `Manual`.
- CT2 selected `Manual`.
- Live request payload included `operationalMode: "manual"` and transport `mode: "MANUAL"`.
- Run mode evidence reported `MANUAL-ORCHESTRA`.

Possible matrix target:

- Existing row `end-to-end-op-system-operation-level`, or a new exact row such as `flowhub-axis-operational-mode`.

Required fields if approved:

- `status`: `VERIFIED`
- `evidenceUrl`: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance + live /api/run-construction payload + run log`

### Candidate 4 - Analysis Depth Axis

Proposed evidence claim:

- Analysis Depth is visible, independently selectable, and reaches the backend/run log.

Evidence:

- CT2 observed `ANALYSIS DEPTH`: `Quick`, `Standard`, `Deep`.
- CT2 selected `Quick`.
- Live request payload included `analysisDepth: "quick"`.
- Run log stated that analysis depth sets crawl/scoring effort.

Possible matrix target:

- Existing row `workflow-1-sub-1a-analysis-scoring` if W04/CD/CR agree the claim scope is axis propagation, or a new exact row such as `flowhub-axis-analysis-depth`.

Required fields if approved:

- `status`: `VERIFIED`
- `evidenceUrl`: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance + live /api/run-construction payload + run log`

CTO caution:

- This proof confirms selected depth propagation and run-log envelope. It does not independently measure crawl-page count deltas across Quick/Standard/Deep. If the intended claim is actual crawl budget behavior, require an additional focused proof before promotion.

### Candidate 5 - Flow Hub Path Axis

Proposed evidence claim:

- Flow Hub Path is visible, independently selectable, and controls route/path state.

Evidence:

- CT2 observed `FLOW HUB PATH`: `Production`, `Migration`, `Fresh Build`.
- CT2 confirmed route reachability for all three paths.
- CT2 confirmed selected axis state persisted when switching Migration and Fresh Build routes.
- Live request payload for the constrained run included `flowHubPath: "production"`.

Possible matrix target:

- No exact existing matrix row found. Recommended new exact row: `flowhub-axis-path-selection`.

Required fields if approved:

- `status`: `VERIFIED`
- `evidenceUrl`: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance + route switching proof + live /api/run-construction payload`

CTO caution:

- This proof confirms path selection, route reachability, and backend payload propagation. It does not prove each path has produced a deployed URL. Path URL production remains Milestone 4.

## Not Recommended For This Batch

Codex TIM Build rank/callability:

- `/api/health` shows Codex orchestra member `PASS` with credentials present.
- Existing code and tests cover rank/callability.
- However, this CT2 run did not prove Step 3 Build selected Codex in a live forge run.
- Recommendation: do not promote Codex TIM Build to VERIFIED from this packet. Wait for a live Step 3 Build proof.

Full 8-step forge completion:

- The CT2 run observed the run at `Design` during the capture window.
- It did not prove complete 8-step execution.
- Recommendation: no 8-step completion promotion.

Fresh Build URL production:

- CT2 proved Fresh Build route selection and visibility.
- It did not prove a new Fresh Build deployed URL.
- Recommendation: no Fresh Build path URL promotion.

## CTO Recommendation

Authorize a narrow claim-promotion cleanup dispatch only after W04/CEO approve the exact mapping strategy:

1. Promote Path 1 deployed URL only if the target row is scoped to deployed-url evidence.
2. Prefer creating exact axis rows for the four Flow Hub axes rather than overloading broad existing rows.
3. Require CD + CR review of the matrix edit before merge.
4. Do not move Codex TIM Build, Fresh Build URL, Path 2 URL, or 8-step completion in this batch.

Expected safe target after clearance:

- 1 deployed-url promotion for Path 1.
- 4 axis-behavior promotions, ideally as exact axis rows.

Expected unsafe overclaim to avoid:

- claiming all three paths produce URLs;
- claiming the forge completes all 8 steps;
- claiming Codex was live-selected in Step 3 Build;
- claiming SAIGE migration is typecheck-clean;
- claiming any VERIFIED row without `evidenceUrl`, `verifiedAt`, and `verifiedBy`.
