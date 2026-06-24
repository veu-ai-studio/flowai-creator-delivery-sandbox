# FlowAI Implementation Program

Date: 2026-06-23

Owner: CTO (Codex)

Status: revised execution ledger and milestone program

## Current Ledger

Earned:

- `FLOWAI_RUNTIME_DISPATCH_AUTHORITY_DEMONSTRATED`, sandbox-scoped.
- `BUILD-PATH_DISPATCH_DEMONSTRATED`, harness variant.
- `BuildExecutionWorker Stage 1`, deployed runtime evidence submitted on origin.

M1B deployed-entrypoint evidence:

- Branch: `fix/build-execution-worker-m1-deployed-entrypoint`
- Evidence commit: `8a252bea802d494fff0a87f4a9a9f84e9268b520`
- Implementation commit: `9ea00cb82e28acf9670ab0399eaf306b54077c66`
- Deployed endpoint: `POST /api/forge/build`
- Deployed proofRunId: `flowai-build-20260623T181720-a3e71edb`
- Sandbox commit: `4f258d0be36c212add8606962dfff9c4c2b9d77b`
- Evidence packet: `docs/cto/build-execution-worker-m1-deployed-entrypoint-evidence-20260623.md`

M1B adjudication status:

- CTO recommendation: `DEPLOYED_ENTRYPOINT_POST_BLOCK closed`.
- W04 final ruling: pending unless issued separately.

Not earned:

- `BUILD_EXECUTION_VERIFIED`
- `CREATOR_VERIFIED`
- `UPGRADER_VERIFIED`
- `UNIVERSAL_ENGINE_VERIFIED`
- `PRODUCTION_AUTONOMOUS_EXECUTION`
- deploy chain proof
- persistence provisioning proof
- product improvement proof
- repeatability proof

## Operating Rule

Execute one milestone at a time.

The next milestone does not inherit the prior claim. Every claim must be earned by behavior, evidence, independent verification, and W04 adjudication.

No future milestone may cite M1/M1B as proof that FlowAI can deploy, persist, upgrade, create, or operate universally. M1/M1B prove selected-tool dispatch and sandbox mutation only.

## Active Transition

M1B is evidence-complete from the CTO side.

The next engineering milestone is M2, but M2 runtime implementation begins only after:

1. W04 closes M1B, or Victor explicitly authorizes proceeding while carrying M1B as evidence-complete.
2. The M2 deploy-chain plan is origin-backed and accepted.

## M2 Goal

Move FlowAI from:

```text
selected-tool dispatch
-> sandbox evidence commit
```

to:

```text
selected-tool dispatch
-> runnable app code commit
-> deployed public URL
-> browser-verified served output
```

M2 must not deploy proof JSON. M2 must deploy runnable software.

## Milestone Ladder

M2: Deploy Chain Proof

- Claim if successful: `DEPLOY_CHAIN_DEMONSTRATED`
- Meaning: selected-tool output becomes runnable app code and appears at a public deployed URL.
- Does not prove persistence, Upgrader, Creator, or Universal Engine.

M3: Persistence Provisioning Proof

- Claim if successful: `PERSISTENCE_PROVISIONING_DEMONSTRATED`
- Meaning: FlowAI provisions or wires persistence and verifies write, durable persist, cold retrieve.
- Does not prove Upgrader, Creator, or Universal Engine.

M4: Controlled Upgrader Proof

- Claim if successful: `UPGRADER_DEMONSTRATED`
- Meaning: a named workflow fails before, FlowAI fixes it, deploys it, and the same workflow passes after.
- Score improvement alone does not count.

M5: Creator Proof

- Claim if successful: `CREATOR_DEMONSTRATED`
- Meaning: description-only input produces a deployed product where an independent user completes the intended workflow.

M6: Repeatability Proof

- Claim if successful: `CROSS_PRODUCT_REPEATABILITY_DEMONSTRATED`
- Meaning: same machinery succeeds on a materially different non-VEU, non-Base44 product without product-specific code changes.

M7: Universal Engine Candidate

- Claim if successful: `UNIVERSAL_ENGINE_CANDIDATE`
- Meaning: multiple successful product proofs across different stacks/domains using the same orchestration path; still not `VERIFIED`.

## Evidence Format

Every milestone packet must include:

- branch
- implementation SHA
- proofRunId
- source input
- selected tool
- selected tool output
- code commit SHA
- deployed URL when applicable
- browser verification when applicable
- independent read-back
- claim earned
- claims not earned
- STOP/BLOCK evidence if unsuccessful

Evidence must be origin-backed and independently verifiable.
