# CTO Current Directive

Last updated: 2026-06-11

## Active Priority

Move FlowAI toward its first honest, fully functional end-to-end forge run with a deployed URL, post-fix scoring, final governance evidence, and ProductSSOT persistence.

## Current Technical Reality

- `origin/main` is at `64b60a419bb99ba34793ffad1acbd97623cb8a04`.
- Main now includes the runtime-config 800s merge commit: `64b60a4 Merge runtime config 800s patch`.
- The merge aligns source-level Vercel function config and named `maxDuration` exports for Agent 3 SSE and Inngest.
- The merge commit explicitly states that live proof remains required after production deploy and that no VERIFIED movement occurred.
- CD and CR both returned PASS for the runtime-config Step 5 review.
- Post-merge local verification passed:
  - `node --check api/agent/3/execute.js`
  - `node --check api/inngest.js`
  - `npx vitest run tests/api/agent3ExecuteTimeout.test.js`
  - `node scripts/check-ssot-traceability.mjs`
- Production has not yet picked up `64b60a4`. Latest non-mutating production check still reports:
  - `/api/health` commit: `06829983b50f`
  - commitFull: `06829983b50f16613c548f77708e96b905a8fbb9`
  - checked at: 2026-06-11T15:18:54Z
- `/api/operator-readiness` remains `ok=true` with 7/7 required operator credentials present.
- No constrained SAIGE proof has been run against `64b60a4`.
- No branch creation, preview deploy, post-fix scoring, final governance write, or ProductSSOT persistence has been observed after the runtime-config merge.
- No VERIFIED movement is justified.
- The durable `ForgeRunState` phase-split architecture remains the true long-term solution; the runtime-config fix is an immediate production-window repair, not a replacement for stateful phase execution.

## Active Branches And Gates

1. Production deploy gate
   - Required production commit: `64b60a419bb99ba34793ffad1acbd97623cb8a04`.
   - Current production commit: `06829983b50f16613c548f77708e96b905a8fbb9`.
   - Gate: production must deploy or otherwise pick up current `main`.
   - Do not run the constrained SAIGE proof until `/api/health` reports `64b60a4`.

2. Runtime-config merge
   - Branch merged: `fix/forge-runtime-config-800`.
   - Merge commit on main: `64b60a419bb99ba34793ffad1acbd97623cb8a04`.
   - Status: merged and locally verified.
   - Claim boundary: no live proof yet, no success claim, no VERIFIED movement.

3. SAIGE proof runner
   - Branch: `docs/cto-saige-proof-runner`.
   - Current head: `dd32b3dbb7d643cae79089d81e609fd2dc8e914a`.
   - Purpose: provide a safe parser and explicit live-run command for post-merge SAIGE SSE proof evidence.
   - Verification reported: `node --check` PASS, focused proof-runner tests PASS, old failed transcript parsed as `INCOMPLETE_STREAM`, full preflight PASS with 231 files / 3657 tests / 3 skipped.
   - Gate: W04 decides whether to merge this proof tooling before the runtime-config acceptance run or use an equivalent SSE capture without merging it.

4. Current directive refresh
   - Branch: `docs/cto-runtime-merged-deploy-gate`.
   - File: `docs/cto/current-directive.md`.
   - Scope: docs only; updates the repo communication layer to match the current deployment/proof gate.
   - Gate: W04 CLEAR required before merging this docs-only branch to main.

## Immediate Priority Queue

1. Victor deploys production from current Git-backed `main`, or production otherwise picks up `64b60a4`.
2. CTO verifies:
   - `/api/health` reports commit `64b60a4`.
   - `/api/operator-readiness` remains `ok=true` with 7/7 credentials present.
3. Run constrained SAIGE proof only after production identity matches `64b60a4`:
   - `POST /api/agent/3/execute`
   - `Accept: text/event-stream`
   - `x-product-scope: saige`
   - `url=https://saigeplatform.com`
   - `maxIterations=1`
   - `mode=auto`
   - `gtmTarget=95`
4. Accept runtime-config fix only if the stream produces terminal `final` + `[DONE]` or honest terminal `timeout` + `[DONE]`.
5. Count branch creation, preview deployment, post-fix scoring, governance write, and ProductSSOT persistence only if independently observed in the live proof.
6. If the proof still ends without a terminal SSE event, route the result as BLOCK and resume the `ForgeRunState` phase-split architecture path.

## Standing Rules For CB

- Read `docs/BUILD_PROTOCOL.md`, `docs/CANONICAL_REFERENCE.md`, and `docs/IMPLEMENTATION_PLAN.md` before dispatch work.
- Do not start non-hotfix builds until W04 sends CLEAR TO BUILD.
- Keep each dispatch scope narrow.
- Produce complete DoD fields, including mocked/unmocked proof labels, evidence tier, claim impact, and browser test instructions.
- Never advance a claim to VERIFIED without the Claim Promotion Checklist.

## Standing Rules For CD

- Review SSOT consistency, implementation correctness, data shape, evidence tiering, and claim impact.
- Treat mocked proof, route existence, and code wiring as insufficient for production VERIFIED claims.
- Block on canonical drift, missing evidence, unsupported claim movement, or incomplete DoD proof fields.
- For post-merge runtime-config acceptance, focus on production identity, Vercel behavior, and whether proof evidence is honestly terminal.

## Standing Rules For CR

- Review adversarially for evidence inflation, security regressions, deployment-proof gaps, governance bypass, and acceptance-criteria failures.
- Block only on demonstrated, evidence-tied failures.
- Cite code, command output, production/runtime proof, or canonical sections for every blocker.
- For post-merge runtime-config acceptance, confirm partial setup/crawl evidence is not relabeled as end-to-end forge success and does not move VERIFIED.

## CTO Rule

The CTO layer may recommend architecture, dispatch sequencing, and technical acceptance criteria, but canonical authority remains the three governing documents. W04 retains clearance authority.

Victor's job remains CEO approval and final guided browser test only. Machines must prepare the evidence, branches, commands, and packets.
