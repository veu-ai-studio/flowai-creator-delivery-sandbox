# M2 Deploy Chain Proof Plan

Date: 2026-06-23

Owner: CTO (Codex)

Status: plan for W04 adjudication before runtime implementation

## Objective

Prove FlowAI can turn selected-tool output into runnable deployed software.

M2 extends the M1B chain:

```text
Build Request
-> runBuild
-> Tool Intelligence
-> selected tool
-> live dispatch
-> selected-tool output
-> deployable sandbox code commit
-> Vercel deploy
-> public URL
-> browser verification
```

## Non-Goal

M2 does not prove:

- persistence
- Creator
- Upgrader
- Universal Engine
- production autonomous execution
- product-agnostic repeatability
- behavioral correctness beyond serving the selected output

## Key Correction From M1

M1 committed selected-tool output into a proof JSON file.

M2 must commit selected-tool output as runnable application code. Deploying `proof/build-execution/*.json` does not count.

## Approved Sandbox Target

Primary deployable sandbox:

```text
veu-ai-studio/flowai-deploy-execution-sandbox
```

If the repo does not exist, M2 implementation must STOP or create it under approved FlowAI-owned authority and record the creation evidence. No customer repo, FlowAI production repo, or VEU product repo may be used for M2.

Required initial repo shape:

```text
package.json
index.html
src/App.jsx
src/main.jsx
vite.config.js
```

The app should be a minimal Vite React app. The selected-tool output will replace `src/App.jsx` or a similarly explicit app entry file.

## Runtime Entry

Use the deployed Build path, not a direct worker call.

Preferred M2 entry:

```text
POST /api/forge/build
```

with an explicit deploy-chain request mode, for example:

```json
{
  "deliveryMode": "deploy-chain-sandbox",
  "deployTarget": "flowai-deploy-execution-sandbox"
}
```

The request must still enter:

```text
api/forge/build.js
-> runBuild
-> Tool Intelligence selection
-> selected tool dispatch
```

The deploy-chain executor may only run after selected-tool output passes the existing live-output guards.

## Proposed Implementation Shape

Add a deploy-chain executor beside, not instead of, the Stage 1 mutation executor:

```text
api/_lib/deployChainWorker.js
```

Responsibilities:

1. Validate the deploy target is the approved deployable sandbox.
2. Convert selected-tool output into a runnable app file.
3. Commit app code to the deployable sandbox repo with proofRunId in the commit message.
4. Trigger Vercel deployment for the deployable sandbox.
5. Poll deployment until ready or STOP/BLOCK.
6. Return deployed URL plus commit/deployment evidence.

`api/forge/build.js` chooses the executor based on the explicit M2 request mode:

```text
deliveryMode = deploy-chain-sandbox
-> mutationExecutor = runDeployChainWorker
```

Default behavior remains M1-compatible.

## Required Continuity

The same proofRunId must appear in:

- build request
- `runBuild` config
- Tool Intelligence selection evidence
- selected-tool dispatch payload or metadata
- deployable sandbox file content or adjacent metadata
- commit message
- deployment metadata where available
- evidence packet

The code commit SHA must appear in:

- deploy-chain worker response
- evidence packet
- independent repo read-back
- deployment source evidence where available

## Vercel Deployment Strategy

Preferred path:

```text
Vercel Deployments API
```

Use FlowAI-owned Vercel operator authority to deploy the sandbox repo or deploy a generated file payload from the sandbox commit.

Acceptable alternatives:

- Git-backed Vercel preview deployment if the deployable sandbox repo is linked to a Vercel project and the commit triggers a preview.
- `vercel deploy` through a machine-triggered runner, if the dispatch source and proofRunId are preserved.

Not acceptable:

- Human clicking Deploy.
- Local-only `vercel deploy` that cannot be traced to the FlowAI Build request.
- Deploying the FlowAI app itself as a substitute for deploying selected-tool output.
- Deploying proof JSON.

## First Proof Input

Use a minimal selected output that can be browser-verified without persistence:

```jsx
export default function App() {
  return <main>FlowAI M2 deployed software verified</main>;
}
```

The source input must be a Build request that asks the selected tool to produce that runnable component, not a hand-written post-processing substitution.

## Acceptance Bar

M2 passes only if all are true:

1. Deployed `POST /api/forge/build` returns success for M2 mode.
2. Tool Intelligence selection is recorded.
3. The selected tool is actually dispatched.
4. Selected-tool output becomes runnable app code in the deployable sandbox repo.
5. The deployable sandbox commit exists and includes the proofRunId.
6. Vercel returns a public deployed URL.
7. Independent browser verification confirms the URL serves the selected output.
8. Evidence packet is committed to origin.

## STOP / BLOCK Conditions

STOP if:

- target repo is not the approved deployable sandbox
- selected-tool output is empty, placeholder-like, or not runnable app code
- implementation would require product-specific special-casing
- the deploy proof would rely on human-triggered deployment

BLOCK if:

- GitHub token cannot create/read/write the deployable sandbox repo
- Vercel operator token cannot create or inspect deployments
- the sandbox repo cannot be linked or deployed by machine
- browser verification cannot access the deployed URL

DISPROOF if:

- FlowAI can select and dispatch but cannot turn selected output into a deployed URL through machine execution under current architecture.

## Required Evidence Packet

Create:

```text
docs/cto/m2-deploy-chain-proof-evidence-20260623.md
```

Required fields:

- branch
- implementation SHA
- proofRunId
- buildRequestId
- source input
- selected tool and score
- selected-tool output SHA
- deployable sandbox repo
- app code file path
- code commit SHA
- deployment provider and deployment id
- public URL
- browser verification result
- independent repo read-back
- independent URL read/browser read-back
- claim earned
- claims not earned
- any STOP/BLOCK details

## Recommended Claim If Successful

```text
DEPLOY_CHAIN_DEMONSTRATED
```

Meaning:

```text
FlowAI selected a build tool, dispatched it, committed its runnable output to an approved sandbox, deployed it, and served it at a public URL.
```

No higher claim moves.

## Next Action After W04 Adjudicates This Plan

If W04 returns PASS or PASS-WITH-FINDINGS:

1. Create implementation branch:

```text
feature/m2-deploy-chain-proof
```

2. Implement the deploy-chain worker.
3. Run targeted tests.
4. Deploy preview.
5. Run one M2 proof.
6. Commit evidence to origin.
7. Route independent verification through CTO.

If W04 returns BLOCK:

Revise only the blocked portions and do not begin runtime implementation.
