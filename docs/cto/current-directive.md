# CTO Current Directive

Last updated: 2026-06-11

## Active Priority

Move FlowAI from a proven constrained SAIGE runtime proof to reviewed SSOT claim impact without inflating evidence. The next objective is not automatic VERIFIED movement; it is CD/CR/W04 adjudication of what the proof actually supports.

## Current Technical Reality

- `origin/main` is at `46506969a5884562715ba9106beabab5aff22c86`.
- Main includes the runtime-config 800s merge commit: `64b60a4 Merge runtime config 800s patch`.
- Main includes the SAIGE SSE proof runner merge: `d59630d docs/cto | add SAIGE SSE proof runner`.
- Main now includes proof-runner evidence hardening:
  - `5d91354 tools/cto | harden SAIGE proof delivery URL evidence`
  - `3292ba2 tools/cto | enforce source URL in proof reparse`
- Main now also includes AOL product guidance:
  - `4650696 Merge remote-tracking branch 'origin/main' into docs/aol-five-layer-user-architecture`
  - `docs/aol/FIVE_LAYER_USER_ARCHITECTURE.md`
  - Boundary: AOL product guidance only; not a FlowAI canonical amendment unless separately ratified.
- The proof runner now treats the source URL as context, not delivery evidence. Offline transcript parsing accepts a source URL via `--url`, and the SAIGE default source is `https://saigeplatform.com`.
- A constrained SAIGE live proof was run after production picked up a runtime-config-capable commit.
- Production identity before the proof reported `/api/health` commit `0c8ee3759fd2`, full `0c8ee3759fd26320b1f095b1b4da227f4c2f2c46`, which is later than required runtime merge `64b60a4`.
- `/api/operator-readiness` reported `ok=true` with 7/7 required operator credentials present.
- Live proof run ID: `cto-saige-sse-proof-20260611185806`.
- Corrected proof-runner summary:
  - Verdict: `END_TO_END_COMPLETE`
  - Terminal: `final` + `[DONE]`
  - Events: `89`
  - Branch observed: `flowai/renewal-cto-saige-sse-proof-20260611185806-iter1`
  - Delivery URL observed: `https://saige-v2.vercel.app`
  - Final score: `73`
  - Exit reason: `MAX_ITERATIONS`
  - ProductSSOT persisted: `true`
- Final-payload extraction narrowed the proof boundary:
  - Fresh Vercel preview deploy did not complete; deploy step degraded with `VERCEL_PREVIEW_DEPLOY_TIMEOUT`.
  - Forge Deploy user step degraded with `NO_DEPLOYED_ARTIFACT` and `previewUrl=null`.
  - Post-fix snapshot was skipped because no post-fix preview existed.
  - Post-fix score reused the pre-fix score.
  - `rawScore=73`, `effectiveTrustScore=36.5`, `finalScore=73`.
  - Coverage was `5/10` dimensions, below the GTM minimum of `7`.
  - `totalDelta=0`, `fiveLayerDelta=0`.
  - PR creation was skipped with `OPERATOR_APPROVAL_REQUIRED`.
  - Governance/audit write completed with `written=true`.
- Evidence files are under `C:\Users\victo\Documents\Codex\flowai-verification\evidence`.
- Runtime acceptance packet on main: `docs/cto/saige-proof-20260611-runtime-config-acceptance.md`.
- No VERIFIED movement is justified from the proof summary alone.
- The final-payload extraction branch is a review artifact only and does not itself justify SSOT movement.
- `CA18-URL-ANY` and `CA18-UNIVERSAL-LIMIT` are not supported by this proof because the run was registered-product SAIGE, not arbitrary unregistered URL / universal diagnosis-only mode.
- The durable `ForgeRunState` phase-split architecture remains the long-term solution. The 800s window is an immediate production-window repair, not a replacement for stateful phase execution.

## Active Branches And Gates

1. Proof-runner evidence hardening
   - Branch merged: `fix/cto-proof-runner-delivery-url-evidence`.
   - Merge advanced `origin/main` to `3292ba292ccaa7b27c282ce9a3735de9087d6a64`; `origin/main` later advanced to `46506969a5884562715ba9106beabab5aff22c86`.
   - Status: merged, pushed, and locally verified.
   - Verification: `node --check scripts/cto/saige-sse-proof.mjs` PASS; `npx vitest run tests/tools/saigeSseProof.test.js` PASS, 6 tests; `node scripts/check-ssot-traceability.mjs` PASS with standing warnings only; `git diff --check` PASS.
   - Claim boundary: no VERIFIED movement.

2. SAIGE proof claim-impact packet
   - Branch: `docs/cto-saige-proof-claim-impact`.
   - Head: `2e292b7f1d7dbd79018732633ce61191ca2b4fb3`.
   - File: `docs/cto/saige-proof-20260611-claim-impact.md`.
   - Review prompts: `docs/cto/cd-review-saige-proof-claim-impact-prompt.md`, `docs/cto/cr-review-saige-proof-claim-impact-prompt.md`.
   - Status: review material only; not merged unless W04 clears.
   - Purpose: map which CA18 claims the proof may support and which it does not support.
   - Boundary: no claim promotion without the Claim Promotion Checklist and CD/CR/W04 review.

3. SAIGE final-payload extraction
   - Branch: `docs/cto-saige-proof-final-payload-extract`.
   - Head: `2bf0a3b5c1eada9f6643dd181eba25ca754b8e69`.
   - Files: `docs/cto/saige-proof-20260611-final-payload-extract.json`, `docs/cto/saige-proof-20260611-final-payload-extract.md`.
   - Status: review artifact only; not merged unless W04 clears.
   - Purpose: give CD/CR/W04 direct repo evidence for the final-payload boundary without manual SSE transcript interpretation.
   - Boundary: supports terminal/provenance field review; does not support fresh preview deploy success, PR creation, positive delta, `CA18-URL-ANY`, or `CA18-UNIVERSAL-LIMIT`.

4. AOL five-layer user architecture
   - Branch: `docs/aol-five-layer-user-architecture`.
   - Head merged: `46506969a5884562715ba9106beabab5aff22c86`.
   - File: `docs/aol/FIVE_LAYER_USER_ARCHITECTURE.md`.
   - Status: merged to `main` after W04 CLEAR.
   - Boundary: AOL product guidance only; not a FlowAI canonical amendment unless separately ratified.

5. CTO directive refresh
   - Branch: `docs/cto-proof-runner-hardening-merged`.
   - Scope: docs only.
   - Gate: W04 CLEAR required before merging this docs-only branch to main.

## Immediate Priority Queue

1. CD/CR/W04 review the claim-impact packet with the final-payload extraction attached as evidence.
2. Decide whether any exact CA18 claim has enough evidence to enter the Claim Promotion Checklist. Do not move any claim by summary alone.
3. Keep `CA18-URL-ANY`, `CA18-UNIVERSAL-LIMIT`, fresh preview deploy success, PR creation, and positive delta out of scope for the SAIGE registered-product proof.
4. Prepare the next live evidence run only when the exact claim target is named and the acceptance criteria are written in advance.
5. Resume the `ForgeRunState` phase-split or Migration Mode path when W04/CEO select the next implementation track.

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
- For SAIGE runtime-config acceptance, focus on production identity, Vercel behavior, terminal proof evidence, and whether claim impact is scoped honestly.

## Standing Rules For CR

- Review adversarially for evidence inflation, security regressions, deployment-proof gaps, governance bypass, and acceptance-criteria failures.
- Block only on demonstrated, evidence-tied failures.
- Cite code, command output, production/runtime proof, or canonical sections for every blocker.
- For SAIGE runtime-config acceptance, confirm source/fallback URLs are never relabeled as observed delivery evidence and do not move VERIFIED by themselves.

## CTO Rule

The CTO layer may recommend architecture, dispatch sequencing, and technical acceptance criteria, but canonical authority remains the three governing documents. W04 retains clearance authority.

Victor's job remains CEO approval and final guided browser test only. Machines must prepare the evidence, branches, commands, and packets.
