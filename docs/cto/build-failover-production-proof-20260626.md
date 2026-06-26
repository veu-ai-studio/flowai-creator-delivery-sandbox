# Build Failover Production Proof - 2026-06-26

## Result

PASS candidate for W04 adjudication: Build failover ran in production, recovered from a forced Codex hang, delivered output into the pre-created delivery repository, and returned a public deployed URL.

## Runtime

- FlowAI production URL: https://flowai-dun.vercel.app
- Runtime commit: `679064eaf61d0aaa6c90e9c4e871dc69d4d33c6b`
- Runtime version evidence: https://flowai-dun.vercel.app/api/version
- Watch panel: https://flowai-dun.vercel.app/flow-hub/production?buildFailoverProof=1&v=679064e

## Proof

- proofRunId: `flowai-build-failover-20260626T123405-679064e`
- buildRequestId: `flowai-build-request-20260626T123405-679064e`
- Delivery sandbox: `veu-ai-studio/flowai-creator-delivery-sandbox`
- Delivery credential source: `GITHUB_DELIVERY_TOKEN`
- Delivery commit: `5e9ab574a5123a7c0544835bc2643e7babd8fd6b`
- Delivery commit URL: https://github.com/veu-ai-studio/flowai-creator-delivery-sandbox/commit/5e9ab574a5123a7c0544835bc2643e7babd8fd6b
- Deployed URL: https://flowai-build-failover-proof-ir8bd2275-veu-ai-studio.vercel.app
- Deployment ID: `dpl_2c5P6eUD6oAHfUYWSBmmew3wFAs3`

## Observed Sequence

1. Codex selected as rank 1 Build tool.
2. Codex forced hang timed out after 5000ms.
3. Claude Code selected as rank 2 Build tool.
4. Claude Code recovered with generated `src/App.jsx`.
5. FlowAI committed selected-tool output to `flowai-creator-delivery-sandbox`.
6. FlowAI deployed the output to Vercel.
7. Public fetch confirmed visible rendered text:
   - `FlowAI Build Failover recovered by Claude Code`
   - `flowai-build-failover-20260626T123405-679064e`

## Claim Boundary

Earned candidate claim:

- `BUILD FAILOVER - IN PRODUCTION (codex -> claudeCode, forced hang -> timeout -> recover -> commit -> deploy)`

Not earned by this proof:

- Creator verified
- Upgrader verified
- Universal engine verified
- Persistence proven
- Autonomous org repo creation

## Notes

The previous org repo-creation wall was avoided honestly by using the pre-created delivery repository authorized for this proof. Autonomous org repo creation remains a standing GitHub App authority item.
