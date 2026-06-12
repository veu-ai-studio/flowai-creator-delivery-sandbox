# Platform Boundary Delivery Honesty Step 5 Review Result

From: CTO
To: W04
Date: 2026-06-11

## Review Target

- Build branch: `fix/platform-boundary-delivery-honesty`
- Patched HEAD: `70afdffc24c6f668bd41628a6fd9f49b0c2ecb65`
- Base: `origin/main` at `e8aef065533bd273fbd86b55d90c5ea35aea91c5`
- Step 5 packet branch: `docs/cto-platform-boundary-delivery-step5`

## Combined Result

PASS for Step 5 code review.

- CD: `PASS-WITH-FINDINGS`
- CR: `PASS`

The CT2 evidence-inflation path is resolved in code review: blocked/no-mutation runs no longer present source or registry URLs as current-run preview/deployment proof.

## What Was Fixed

- `previewUrl` is current-run preview/deployment only.
- `finalPreviewUrl` is no longer initialized to the source/evaluated URL.
- `upgradedUrl` comes only from current-run iteration preview output.
- Registry fallback URLs are emitted as contextual `registryUpgrade*` fields.
- `PLATFORM_BOUNDARY_BLOCKED` no-deploy runs return `previewUrl:null`, `upgradedUrl:null`, `upgradeDeployed:false`, `upgradeDeployStatus:'blocked'`, and `upgradeDeployReason:'PLATFORM_BOUNDARY_BLOCKED'`.
- UI gates Compare/Open Preview/current-run upgraded link on `upgradeDeployed === true`.
- Registry upgrade target is labeled context-only.
- Proof parser ignores `upgradedUrl` delivery evidence when `upgradeDeployed === false`.

## CD Result

CD verdict: `PASS-WITH-FINDINGS`.

CD confirmed:

- `previewUrl` is current-run delivery only.
- Registry URL stays contextual.
- Founder UI is honest for `PLATFORM_BOUNDARY_BLOCKED`.
- Happy-path current-run deploy remains intact.
- No canonical, SSOT, matrix, or VERIFIED movement occurred.

CD non-blocking findings:

1. Migration-mode preview under-claim: migration mode can return `previewUrl: migration.upgradeUrl` without setting `upgradeDeployed`, so the new UI gates may hide a genuine migration artifact. CD judged this under-claiming, not evidence inflation. Follow-up recommended.
2. Proof parser guard asymmetry: `observedDeliveryUrl` checks `upgradeDeployed === false` on final payloads, while per-step scans rely on upstream step payloads not carrying false preview data. Current code is safe because blocked/no-deploy step previews are null. Follow-up defense-in-depth optional.

## CR Result

CR verdict: `PASS`.

CR confirmed:

- Source URL is no longer initialized as preview evidence.
- `upgradedUrl` comes only from current-run iteration preview output.
- Registry URLs are separate context fields.
- Blocked/no-deploy runs produce `upgradeDeployed:false`, `blocked`, and `PLATFORM_BOUNDARY_BLOCKED`.
- Current-run preview is assigned only after actual deploy success.
- Final payload emits honest `previewUrl` plus delivery envelope.
- UI gates Compare/Open Preview on `upgradeDeployed === true`.
- Registry upgrade target is rendered only as context.
- Proof parser ignores delivery evidence when `upgradeDeployed === false`.
- Tests cover the exact CT2 blocked scenario and proof parser regression.
- No SSOT/VERIFIED movement found.

## Verification

CB reported:

- `npx vitest run tests/agents/renewal/upgradeDeliveryEnvelope.test.js tests/agents/renewal/orchestrator.test.js tests/ui/resultCardObjectives.test.js tests/tools/saigeSseProof.test.js` PASS, 145 tests.
- `node --check src\lib\agents\renewal\orchestrator.js` PASS.
- `node --check src\pages\FlowAIDashboard.jsx` not feasible because Node rejects `.jsx` with `ERR_UNKNOWN_FILE_EXTENSION`; covered by Vitest/build.
- `node --check scripts\cto\saige-sse-proof.mjs` PASS.
- `node scripts/check-ssot-traceability.mjs` PASS.
- `git diff --check` PASS.
- `npm run preflight` PASS, 231 files / 3664 passed / 3 skipped.

CTO spot verification:

- `node scripts/check-ssot-traceability.mjs` PASS with standing PARTIAL warnings only.
- `node --check src\lib\agents\renewal\orchestrator.js` PASS.
- `node --check scripts\cto\saige-sse-proof.mjs` PASS.
- `npx vitest run tests/agents/renewal/upgradeDeliveryEnvelope.test.js tests/tools/saigeSseProof.test.js tests/ui/resultCardObjectives.test.js` PASS, 14 tests.
- `npx vitest run tests/agents/renewal/orchestrator.test.js` PASS, 131 tests.
- `git diff --check origin/main..HEAD` PASS.

CR verification:

- Read-only review; no files edited.

## Evidence Boundary

- Mocked tests used: yes.
- Unmocked live proof: not performed in this build step.
- Production URL serving patched HEAD: not verified.
- Evidence tier: B.
- Claim impact: no movement.
- SSOT movement: none.
- Matrix artifact movement: none.
- VERIFIED movement: none.

## CTO Recommendation

W04 may consider merge clearance for `fix/platform-boundary-delivery-honesty` at `70afdff`.

Because the original blocker was found by CT2 on production UI, CTO recommends a follow-up CT2 browser acceptance run after the patch is deployed to a preview or production target before claiming the browser-visible issue closed. That follow-up should verify:

- `PLATFORM_BOUNDARY_BLOCKED` still appears honestly.
- No `Live upgraded deployment is ready` message appears.
- No `Open preview URL` appears without current-run deployment.
- Any SAIGE upgrade URL is labeled registered/context only.
- No SSOT or VERIFIED movement.

Recommended merge note:

`Step 5 PASS: CD PASS-WITH-FINDINGS, CR PASS. Fixes CT2 delivery evidence inflation: source/registry URLs no longer appear as current-run preview/deploy proof on PLATFORM_BOUNDARY_BLOCKED runs. No SSOT or VERIFIED movement. Live browser retest required before closing CT2 production issue.`
