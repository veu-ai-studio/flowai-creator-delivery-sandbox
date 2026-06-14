# VERIFIED Promotion Row Mapping Proposal - Acceleration Batch

FROM: CTO
TO: W04 / Victor Udo, FNSE, PhD - CEO
DATE: 2026-06-14 UTC
STATUS: SUBMITTED FOR ROW-MAPPING AUTHORIZATION
VERIFIED movement applied: no
matrixArtifact edited: no
canonical docs edited: no

## Purpose

`docs/cto/verified-promotion-packet-acceleration-20260614.md` lists CT2-confirmed evidence. This document maps each candidate claim to the active `src/lib/orchestratorFramework/matrixArtifact.json` rows and flags where an existing row is too broad for the observed proof.

The CTO recommendation is to avoid broad-row overclaiming. If a current row does not exactly match the evidence, W04/CEO should either authorize a new exact matrix row or defer promotion for that candidate.

## Current Matrix Snapshot

- `VERIFIED`: 0
- `WIRED`: 0
- Highest active status: `CURRENT`
- Current `CURRENT` rows: `workflow-1-sub-1a-analysis-scoring`, `workflow-4-migration`
- Total rows: 39

No `matrixArtifact` edit has been made in this packet.

## Candidate Mapping

| Packet candidate | Evidence status | Existing row fit | CTO recommendation |
| --- | --- | --- | --- |
| Migration Path produced public URL | CT2 confirmed public URL `https://saige-v2.vercel.app` | `workflow-4-migration` exists but is broader than "one public URL" | Promote only if W04/CEO accepts this row as URL-level Workflow 4 evidence; otherwise add exact row `flow-hub-migration-public-url` |
| Structural Layer axis | CT2 confirmed visible/selectable/payload/log propagation | No exact row; `end-to-end-op-system-operation-level` is too broad | Add exact row `axis-structural-layer-live-propagation`; do not promote broad row |
| Operational Mode axis | CT2 confirmed visible/selectable/payload/log propagation | No exact row; `end-to-end-op-system-operation-level` is too broad | Add exact row `axis-operational-mode-live-propagation`; do not promote broad row |
| Analysis Depth axis | CT2 confirmed visible/selectable/payload/log propagation | No exact row; `workflow-1-sub-1a-analysis-scoring` is broader and crawl-budget delta is unproven | Add exact row `axis-analysis-depth-live-propagation`; defer measured crawl-depth claim |
| Flow Hub Path axis | CT2 confirmed visible/selectable/route/payload behavior | No exact row; path rows are workflow rows, not UI axis propagation rows | Add exact row `axis-flow-hub-path-live-propagation`; do not promote broad workflow rows for UI-only proof |
| TIM Build Codex ranked first | CT2/CB2 confirmed live visibility | `orchestra-automatic-selection` is broader and implies more than ranking | Add exact row `tim-build-codex-ranked-first-live`; defer live Codex invocation |
| Clerk ticket redirect and app-origin session | CT2 confirmed signed-in app session and authenticated `/api/me` | `domain-tier-access-model` is too broad | Add exact row `clerk-ticket-app-origin-session-live`; defer `AUTH_REQUIRED=true` and organization enforcement |
| Fresh Build produced public URL | Runtime and CT2 confirmed generated public URL | `fresh-build-deployment-adapter`, `fresh-build-vercel-config-resolution`, and `fresh-codebase-generation` partially fit | Safest existing-row promotions are `fresh-build-deployment-adapter` and `fresh-build-vercel-config-resolution`; add exact row `fresh-build-public-url-live` for the deployed URL claim |

## Recommended Authorization Set

Best SSOT-safe path:

1. Authorize creation of exact evidence rows for:
   - `flow-hub-migration-public-url`
   - `axis-structural-layer-live-propagation`
   - `axis-operational-mode-live-propagation`
   - `axis-analysis-depth-live-propagation`
   - `axis-flow-hub-path-live-propagation`
   - `tim-build-codex-ranked-first-live`
   - `clerk-ticket-app-origin-session-live`
   - `fresh-build-public-url-live`
2. Authorize existing-row VERIFIED movement only where the row scope is exactly satisfied:
   - `fresh-build-deployment-adapter`
   - `fresh-build-vercel-config-resolution`
3. Keep these rows unpromoted for now:
   - `orchestra-automatic-selection`: Codex ranking is visible, but live automatic invocation is unproven.
   - `domain-tier-access-model`: Clerk ticket/session works, but access model enforcement is broader.
   - `workflow-1-sub-1a-analysis-scoring`: Analysis Depth propagation is proven, but scoring/crawl-depth behavior is broader.
   - `end-to-end-op-system-operation-level`: axis proof is narrower than end-to-end operation level.
   - `fresh-build-feature-extractor`, `fresh-build-design-synthesizer`, `fresh-build-codebase-generator`, `fresh-build-orchestrator`, `fresh-build-crawler-handoff`, `fresh-build-sse-evidence`: touched by the successful Fresh Build run, but each should be promoted only after W04/CEO accepts the runtime proof as sufficient for that exact internal surface.

## Proposed Fields For Exact Rows

Use this shape for each authorized exact row:

```json
{
  "layer": 2,
  "surfaceId": "<exact-surface-id>",
  "name": "<human-readable exact claim>",
  "description": "VERIFIED - CT2-confirmed live production evidence; scope limited to the claim named in this row.",
  "status": "VERIFIED",
  "tier": "B",
  "ratificationState": "CANONICAL",
  "evidenceUrl": "<public URL or repo evidence URL>",
  "verifiedAt": "2026-06-14",
  "verifiedBy": "CT2 browser acceptance"
}
```

For public deployed URL rows, use the deployed URL as `evidenceUrl` and include repo evidence in a `note`.

For repo-durable evidence rows, use the GitHub blob URL for the CT2 result file after this proposal is pushed to origin.

## Canonical Impact

No change to `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, or `docs/IMPLEMENTATION_PLAN.md` is required to preserve the evidence packet.

If W04/CEO treats `matrixArtifact` surface creation as a canonical surface-list change, then the minimum canonical action is a small amendment authorizing exact evidence rows for narrow CT2-confirmed claims. If W04/CEO treats `matrixArtifact` as the active evidence ledger, then only the matrix rows need to be updated after authorization.

## CTO Call

Do not promote broad rows merely to reach a count. The fastest honest route to 95 VERIFIED is to add exact rows for exact evidence and keep broad platform claims pending until the proof actually covers them.
