# M2 Deploy Chain Proof Evidence - 2026-06-23

## Verdict

STATUS: CT2 PASS / W04 ADJUDICATION READY

FlowAI M2 now satisfies the implementation-side evidence for:

```text
deployed POST /api/forge/build
-> runBuild
-> Tool Intelligence selection
-> selected tool dispatch
-> approved deploy sandbox repo mutation
-> sandbox commit
-> Vercel deployment
-> automated rendered-output check
-> independent CT2 browser verification
```

Recommended claim movement, pending W04 ruling:

```text
DEPLOY CHAIN DEMONSTRATED
```

Nothing else moves.

## Origin Implementation

- Branch: `feature/m2-deploy-chain-proof`
- Current implementation head: `6b93b67f54e8f5be4cf951f856146250428620af`
- Key implementation commits:
  - `064142e8327088a3d9e855a32c7ddfa62f382a84` - add M2 deploy-chain worker
  - `68f979f1b397861e57d3b222736d6c5f40823040` - prefer operator GitHub credential for deploy-chain repo creation
  - `0d635decab6d9b35edf607cfe8e6eb8cf71c69eb` - allow proof-specific public Vercel target
  - `2e14b60d5e3b6d3770515174f1b46ebe9daed005` - render m2 deploy chain output
  - `5c8029efb80c1d6467d0fe8873026fa5f14bfe45` - reuse m2 deploy proof project
  - `e139ff9dedde93592802a0d3817c1abdd67bf53e` - support stable vercel project names
  - `6b93b67f54e8f5be4cf951f856146250428620af` - accept deploy-chain mutation evidence

Implementation files:

- `api/_lib/deployChainWorker.js`
- `api/forge/build.js`
- `src/lib/forge/buildRunner.js`
- `src/lib/orchestra/vercel.js`
- `tests/deployChainWorker.test.js`
- `tests/forge/buildStep.test.js`
- `tests/renewal/orchestra.test.js`

## What Changed To Close W04 F3

W04 blocked the prior M2 result because the generated deployment served a blank page. The fix changed deploy-chain output from "committed React source only" to an actually rendering deployed artifact.

The deploy-chain worker now:

- writes a self-contained `index.html` that visibly renders the selected-tool marker in the body;
- keeps `src/App.jsx` as selected-tool source evidence;
- deploys the static app through the approved deploy-chain path;
- verifies the deployed URL returns the generated marker in visible body text before returning success;
- fails closed if the rendered DOM marker is missing.

The Build runner now accepts deploy-chain evidence only when:

- the mutation target is the approved deploy sandbox;
- `src/App.jsx` was committed as selected-tool source evidence;
- a `https://` deployed URL is returned;
- `browserVerification.renderedDomTextContainsExpectedText === true`.

## Primary M2 Proof Run

- FlowAI runtime preview: `https://flowai-bd9uir4dy-veu-ai-studio.vercel.app`
- Runtime identity endpoint: `GET /api/version`
- Runtime commit: `6b93b67f54e8f5be4cf951f856146250428620af`
- Runtime deploy URL reported by `/api/version`: `flowai-bd9uir4dy-veu-ai-studio.vercel.app`
- Runtime environment: `preview`
- Runtime started at: `2026-06-24T03:20:46.988Z`

Proof identifiers:

- proofRunId: `flowai-build-20260624T032047-c1216bbd`
- buildRequestId: `flowai-build-request-20260624T032047-c28f5173`
- selectedToolId: `Codex`
- selectedMemberId: `codex`
- selectedToolOutputSha256: `6c533c61d1a0896bf02055cb0820be96cea10fb0fa88867259e32a44129ebb32`

## Deploy Sandbox Evidence

- Sandbox repo: `veu-ai-studio/flowai-deploy-execution-sandbox`
- Sandbox commit: `1b403fd29f1c6bdcc476415fc62971dacc819aef`
- Commit message: `FlowAI M2 Deploy Chain flowai-build-20260624T032047-c1216bbd`
- Author: `flowai-self-renewal[bot]`
- Commit timestamp: `2026-06-24T03:20:51Z`
- Files committed:
  - `flowai-deploy-proof.json`
  - `index.html`
  - `src/App.jsx`

Read-back from `flowai-deploy-proof.json`:

```json
{
  "proofRunId": "flowai-build-20260624T032047-c1216bbd",
  "buildRequestId": "flowai-build-request-20260624T032047-c28f5173",
  "flowaiCommit": "6b93b67f54e8f5be4cf951f856146250428620af",
  "selectedToolId": "Codex",
  "selectedMemberId": "codex",
  "selectedToolOutputSha256": "6c533c61d1a0896bf02055cb0820be96cea10fb0fa88867259e32a44129ebb32",
  "browserMarker": "FlowAI M2 deployed software verified 6b93b67",
  "claimBoundary": "DEPLOY_CHAIN_DEMONSTRATED candidate evidence only; no persistence, Creator, Upgrader, or Universal Engine proof"
}
```

Read-back from `index.html`:

```html
<html lang="en" data-flowai-proof-run-id="flowai-build-20260624T032047-c1216bbd">
...
<p>FlowAI M2 deployed software verified 6b93b67</p>
```

Read-back from `src/App.jsx`:

```jsx
export default function App() { return <main>FlowAI M2 deployed software verified 6b93b67</main>; }
```

## Public Deployment Evidence

- Public URL: `https://flowai-m2-deploy-chain-proof.vercel.app/`
- HTTP status: `200`
- Visible body marker: `FlowAI M2 deployed software verified 6b93b67`
- proofRunId visible in source: `flowai-build-20260624T032047-c1216bbd`

Public fetch evidence:

```html
<!doctype html>
<html lang="en" data-flowai-proof-run-id="flowai-build-20260624T032047-c1216bbd">
...
<main id="flowai-m2-output" data-selected-output-sha="6c533c61d1a0896bf02055cb0820be96cea10fb0fa88867259e32a44129ebb32">
  <p>FlowAI M2 deployed software verified 6b93b67</p>
  <small>FlowAI deploy-chain proof flowai-build-20260624T032047-c1216bbd</small>
</main>
```

HTTP cross-check:

```text
curl.exe -s -o NUL -w "%{http_code}" https://flowai-m2-deploy-chain-proof.vercel.app
200
```

## Independent CT2 Verification

CT2 independently verified the public URL in a fresh browser context.

- Result: `PASS`
- Timestamp: `2026-06-24T03:29:32.188Z`
- Method: local Playwright Chromium with installed Chrome, fresh browser context; curl HTTP cross-check
- URL: `https://flowai-m2-deploy-chain-proof.vercel.app/`
- HTTP status: `200`
- Visible marker observed in rendered body: `yes`
- proofRunId visible/source: `flowai-build-20260624T032047-c1216bbd`
- Screenshot: `screenshots/ct2/flowai-m2-deploy-chain-proof-playwright-chrome-ct2-20260624T032932Z.png`
- CT2 packet: `docs/cto/flowai-m2-deploy-chain-proof-ct2-20260624T032932Z.md`

CT2 raw evidence snippet:

```text
FlowAI M2 deployed software verified 6b93b67 FlowAI deploy-chain proof flowai-build-20260624T032047-c1216bbd
```

## Verification

Code and test verification:

```text
node --check api/_lib/deployChainWorker.js
node --check src/lib/orchestra/vercel.js
node --check src/lib/forge/buildRunner.js
npx vitest run tests/deployChainWorker.test.js tests/buildExecutionWorker.test.js tests/forge/buildStep.test.js tests/renewal/orchestra.test.js
npm run lint
npm run lint:evidence
npm run build:preflight
```

Focused test result after the final evidence assertion fix:

```text
Test Files  4 passed (4)
Tests       58 passed (58)
```

`npm run lint` passed with existing flat-config migration warnings only.

`npm run build:preflight` passed on the implementation base.

## Earlier Block History

Earlier M2 attempts correctly failed before this proof:

- `GITHUB_WORKFLOW_TOKEN` could not create the deploy sandbox repo.
- Operator PAT could not create the org repo.
- GitHub App token carried sufficient authority and created/updated the approved deploy sandbox.
- Generated Vercel URLs initially returned `401` because deployment protection was still enabled.
- After public access was fixed, W04 correctly blocked because the generated app rendered blank.

Those failures are retained as history; the current proof run is the post-fix run with a rendering app and CT2 PASS.

## Claim Boundary

Recommended W04 movement:

- `DEPLOY CHAIN DEMONSTRATED`

Does NOT move:

- `BUILD_EXECUTION_VERIFIED`
- `CREATOR_VERIFIED`
- `UPGRADER_VERIFIED`
- `UNIVERSAL_ENGINE_VERIFIED`
- persistence
- behavioral product improvement
- cross-product repeatability

M2 proves only:

```text
selected-tool output
-> approved sandbox commit
-> public deployment
-> rendered selected output
-> independent browser verification
```

It does not prove M3 persistence, M4 Creator, M5 repeatability, or a production product upgrade.
