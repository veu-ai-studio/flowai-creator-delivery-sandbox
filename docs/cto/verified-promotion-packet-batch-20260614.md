# Batch VERIFIED Promotion Packet

Date: 2026-06-14
Prepared by: CTO
Status: SUBMITTED FOR W04/CEO AUTHORIZATION
VERIFIED movement applied: no
matrixArtifact edited: no

## Executive Summary

This is the single batch VERIFIED promotion packet requested by W04/Victor. It includes only evidence that meets all three eligibility criteria:

- an `evidenceUrl` exists and is publicly accessible;
- CT2 independently confirmed the evidence in a browser;
- `verifiedAt` and `verifiedBy` can be populated honestly.

This packet requests authorization only. It does not edit `src/lib/orchestratorFramework/matrixArtifact.json`, canonical SSOT docs, or any sidecar status.

## Candidate 1 - Path 1 Migration Deployed URL

Claim scope:

FlowAI Migration Path has produced one CT2-confirmed public deployed URL for a real product target.

Evidence:

- Public evidence URL: `https://saige-v2.vercel.app`
- Repo evidence URL: `https://github.com/victor2081new-cloud/flowai/blob/804610c557df4bb0150e7b77801f3e0738440215/docs/cto/ct2-saige-production-acceptance-2026-06-13.md`
- Supporting summary: `https://github.com/victor2081new-cloud/flowai/blob/804610c557df4bb0150e7b77801f3e0738440215/docs/cto/path1-saige-production-url-20260613.md`
- CT2 result: PASS
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance`

Observed by CT2:

- `https://saige-v2.vercel.app` opened publicly without Vercel Deployment Protection.
- Browser-rendered SAIGE app shell loaded.
- Top navigation, Home selected state, Ask SAIGE, Welcome Local hero, agent counts, filters, and agent cards were visible.

Recommended matrix treatment:

- Promote only a row whose claim is scoped to "Migration path produced a deployed URL."
- Do not promote any row that implies complete SAIGE typecheck cleanup or full migration quality closure.

Honesty boundary:

This proves a deployed public URL. It does not prove `npm run typecheck` is clean; typecheck debt remains separately tracked.

## Candidate 2 - Structural Layer Axis

Claim scope:

Structural Layer is visible, independently selectable, and reaches the backend/run log in production.

Evidence:

- Evidence URL: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- Raw browser evidence: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-browser-evidence-20260613.json`
- CT2 result: PASS
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance + live /api/run-construction payload + run log`

Observed by CT2:

- Sidebar showed `STRUCTURAL LAYER`: Autonomous / Supervised / Controlled.
- CT2 selected Controlled.
- Live request payload included `structuralLayer: "controlled"`.
- Live run log included the Flow Hub axis envelope.

Recommended matrix treatment:

- Prefer exact row `flowhub-axis-structural-layer`.
- If W04/CD/CR map to an existing broader row, the verified claim must remain limited to visibility, independent selection, payload propagation, and run-log evidence.

## Candidate 3 - Operational Mode Axis

Claim scope:

Operational Mode is visible, independently selectable, and reaches the backend/run log in production.

Evidence:

- Evidence URL: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- Raw browser evidence: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-browser-evidence-20260613.json`
- CT2 result: PASS
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance + live /api/run-construction payload + run log`

Observed by CT2:

- Sidebar showed `OPERATIONAL MODE`: Auto / Guided / Manual.
- CT2 selected Manual.
- Live request payload included `operationalMode: "manual"` and transport `mode: "MANUAL"`.
- Run mode evidence reported `MANUAL-ORCHESTRA`.

Recommended matrix treatment:

- Prefer exact row `flowhub-axis-operational-mode`.
- Do not use this to claim full 8-step forge completion.

## Candidate 4 - Analysis Depth Axis

Claim scope:

Analysis Depth is visible, independently selectable, and reaches the backend/run log in production.

Evidence:

- Evidence URL: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- Raw browser evidence: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-browser-evidence-20260613.json`
- CT2 result: PASS
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance + live /api/run-construction payload + run log`

Observed by CT2:

- Sidebar showed `ANALYSIS DEPTH`: Quick / Standard / Deep.
- CT2 selected Quick.
- Live request payload included `analysisDepth: "quick"`.
- Run log stated that analysis depth sets crawl/scoring effort.

Recommended matrix treatment:

- Prefer exact row `flowhub-axis-analysis-depth`.
- Do not claim measured crawl budget deltas across Quick/Standard/Deep until a focused proof compares all three depths.

## Candidate 5 - Flow Hub Path Axis

Claim scope:

Flow Hub Path is visible, independently selectable, preserves route state, and reaches the backend payload.

Evidence:

- Evidence URL: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- Raw browser evidence: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-browser-evidence-20260613.json`
- CT2 result: PASS
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance + route switching proof + live /api/run-construction payload`

Observed by CT2:

- Sidebar showed `FLOW HUB PATH`: Production / Migration / Fresh Build.
- CT2 confirmed `/flow-hub/production`, `/flow-hub/migration`, and `/flow-hub/fresh-build` returned HTTP 200.
- Selected axis state persisted when switching Migration and Fresh Build routes.
- Live request payload included `flowHubPath: "production"`.

Recommended matrix treatment:

- Prefer exact row `flowhub-axis-path-selection`.
- Do not use this to claim each path has produced a deployed URL.

## Candidate 6 - TIM Build Step Codex Visibility and Ranking

Claim scope:

The Tool Intelligence Marketplace Build step visibly ranks Codex first in the live forge UI.

Evidence:

- Evidence URL: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- Raw browser evidence: `https://github.com/victor2081new-cloud/flowai/blob/7fd1c26e7c2858661da61c5464c33ed6bac130df/docs/cto/ct2-priority2-axis-live-proof-rerun-browser-evidence-20260613.json`
- CT2 result: PASS for observed UI/run-log visibility
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance + live run panel`

Observed by CT2:

- Live run panel showed Build step candidates.
- Build candidate order showed Codex ranked first, followed by Claude Code, Cursor, Bolt, Windsurf, Replit, and Base44.
- Codex status was visible as `AUTO SERVER CHECK PENDING` in the captured UI.

Recommended matrix treatment:

- Promote only an exact visibility/ranking row if one exists or is authorized.
- Do not promote "Codex callable Build execution" until a live Step 3 Build run proves Codex was selected and invoked.

## Not Included In This Batch

Clerk ticket sign-in:

- CT2 proved session establishment and app-origin `/api/me` authentication on 2026-06-14, but the full proof verdict was BLOCK because final redirect to `/flow-hub/production` failed before the patch.
- Do not promote until CT2 reruns against the merged redirect fix and returns PASS.

Fresh Build:

- Production server/UI flags have been enabled on 2026-06-14, but no new Fresh Build deployed URL has been produced yet.
- Do not promote Fresh Build URL production.

Path 2 Production:

- Prior Path 2 proof reached branch/deploy mechanics but preview access/post-fix scoring remained blocked by Vercel protection.
- Do not promote Path 2 deployed URL.

Full 8-step forge completion:

- No proof yet shows a complete 8-step forge run with branch creation, deployed preview URL, post-fix scoring, governance write, and ProductSSOT persistence.
- Do not promote full end-to-end forge completion.

## CTO Recommendation

Authorize a follow-up matrix edit branch only after W04/CEO approves exact row mapping.

Recommended safe batch:

- 1 deployed-URL promotion for Path 1 Migration.
- 4 Flow Hub axis behavior promotions.
- optional 1 TIM Build Codex visibility/ranking promotion if mapped to a narrow exact row.

Required implementation guardrails:

- each promoted row must include `evidenceUrl`, `verifiedAt`, and `verifiedBy`;
- CD and CR must review the exact matrix diff;
- no canonical SSOT document change without Victor approval;
- no VERIFIED claim may imply more than the evidence actually proves.
