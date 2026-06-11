# CTO Current Directive

Last updated: 2026-06-11

## Active Priority

Move FlowAI toward its first honest, fully functional end-to-end forge run with a deployed URL, post-fix scoring, final governance evidence, and ProductSSOT persistence.

## Current Technical Reality

- Main is at `06829983b50f16613c548f77708e96b905a8fbb9` with PR #11 merged.
- PR #11 was merged with a documented W04/CEO waiver of the unmocked live proof for the URL context labeling fix.
- Production was later deployed to main and confirmed by `/api/health`, with `/api/operator-readiness` showing 7/7 required operator credentials present.
- The deferred constrained SAIGE proof on production reached credential readiness, Product Discovery, repo probe, and 11-page crawl completion, but the Agent 3 SSE stream ended without `[DONE]`, `final`, `timeout`, or `error`.
- The failed proof did not reach branch creation, preview deploy, post-fix scoring, final governance write, or ProductSSOT persistence.
- No VERIFIED movement is justified by the deferred proof.
- Root `vercel.json` already intended 800s windows, but source-level runtime config was ambiguous/drifted. Runtime-config alignment is now isolated on `fix/forge-runtime-config-800`.
- The durable `ForgeRunState` phase-split architecture remains the true long-term solution; the runtime-config fix is an immediate production-window repair, not a replacement for stateful phase execution.

## Active Branches And Gates

1. Runtime-config fix
   - Branch: `fix/forge-runtime-config-800`
   - Current head: `303885b4294a890fb4cac1b7c9ebaf40b5b02cfc`
   - Technical code delta: `61d3f2cc3d55c38c1faacb39542be225c2e1c32a`; latest commit is docs-only review-packet correction.
   - Purpose: align `api/agent/3/execute.js` and `api/inngest.js` with explicit 800s source-level runtime config.
   - Verification reported: `node --check` PASS, focused timeout test PASS, full preflight PASS with 230 files / 3655 tests / 3 skipped.
   - Gate: CD and CR must review updated head and return PASS/BLOCK before merge.
   - Merge/PR packet: `docs/cto/runtime-config-800-pr-merge-packet.md` on that branch.

2. SAIGE proof runner
   - Branch: `docs/cto-saige-proof-runner`
   - Current head: `dd32b3dbb7d643cae79089d81e609fd2dc8e914a`
   - Purpose: provide a safe parser and explicit live-run command for post-merge SAIGE SSE proof evidence.
   - Verification reported: `node --check` PASS, focused proof-runner tests PASS, old failed transcript parsed as `INCOMPLETE_STREAM`, full preflight PASS with 231 files / 3657 tests / 3 skipped.
   - Gate: merge only after W04 decides whether this proof tooling should land before or alongside runtime-config acceptance.

3. Current directive update
   - Branch: `docs/cto-current-directive-runtime-gate`
   - Purpose: keep incoming windows aligned on the current runtime gate and proof sequence.
   - Scope: docs only; no claim movement.

## Immediate Priority Queue

1. Get CD and CR PASS/BLOCK on `fix/forge-runtime-config-800` head `303885b`.
2. After review clearance, create/open PR from:
   `https://github.com/victor2081new-cloud/flowai/compare/main...fix/forge-runtime-config-800?quick_pull=1`
3. Merge only after W04 issues CLEAR TO MERGE.
4. Victor deploys production from the merged Git-backed main when W04 clears deploy.
5. CTO verifies:
   - `/api/health` reports the merged production commit.
   - `/api/operator-readiness` remains `ok=true` with 7/7 credentials present.
6. Run constrained SAIGE proof using the proof-runner command:
   - `POST /api/agent/3/execute`
   - `Accept: text/event-stream`
   - `x-product-scope: saige`
   - `url=https://saigeplatform.com`
   - `maxIterations=1`
   - `mode=auto`
   - `gtmTarget=95`
7. Accept runtime-config fix only if the stream produces terminal `final` + `[DONE]` or honest terminal `timeout` + `[DONE]`.
8. Claim first end-to-end forge completion only if live evidence also shows branch creation, preview deployment, post-fix scoring, final governance write, and ProductSSOT persistence.

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
- For `fix/forge-runtime-config-800`, focus on runtime config correctness, Vercel behavior risk, and absence of scoring/governance drift.

## Standing Rules For CR

- Review adversarially for evidence inflation, security regressions, deployment-proof gaps, governance bypass, and acceptance-criteria failures.
- Block only on demonstrated, evidence-tied failures.
- Cite code, command output, production/runtime proof, or canonical sections for every blocker.
- For `fix/forge-runtime-config-800`, confirm the branch does not relabel partial setup/crawl evidence as end-to-end forge success and does not move VERIFIED.

## CTO Rule

The CTO layer may recommend architecture, dispatch sequencing, and technical acceptance criteria, but canonical authority remains the three governing documents. W04 retains clearance authority.

Victor's job remains CEO approval and final guided browser test only. Machines must prepare the evidence, branches, commands, and packets.
