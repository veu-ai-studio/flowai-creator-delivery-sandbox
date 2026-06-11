# CTO Current Directive

Last updated: 2026-06-11

## Active Priority

Move FlowAI from a proven constrained SAIGE runtime proof to reviewed SSOT claim impact without inflating evidence. The next objective is not automatic VERIFIED movement; it is CD/CR/W04 adjudication of what the proof actually supports.

## Current Technical Reality

- `origin/main` is at `3292ba292ccaa7b27c282ce9a3735de9087d6a64`.
- Main includes the runtime-config 800s merge commit: `64b60a4 Merge runtime config 800s patch`.
- Main includes the SAIGE SSE proof runner merge: `d59630d docs/cto | add SAIGE SSE proof runner`.
- Main now includes proof-runner evidence hardening:
  - `5d91354 tools/cto | harden SAIGE proof delivery URL evidence`
  - `3292ba2 tools/cto | enforce source URL in proof reparse`
- The proof runner now treats the source URL as context, not delivery evidence. Offline transcript parsing accepts a source URL via `--url`, and the SAIGE default source is `https://saigeplatform.com`.
- A constrained SAIGE live proof was run after production picked up a runtime-config-capable commit.
- Production identity before the proof reported `/api/health` commit `0c8ee3759fd2`, full `0c8ee3759fd26320b1f095b1b4da227f4c2f2c46`, which is later than required runtime merge `64b60a4`.
- `/api/operator-readiness` reported `ok=true` with 7/7 required operator credentials present.
- Live proof run ID: `cto-saige-sse-proof-20260611185806`.
- Corrected proof summary:
  - Verdict: `END_TO_END_COMPLETE`
  - Terminal: `final` + `[DONE]`
  - Events: `89`
  - Branch observed: `flowai/renewal-cto-saige-sse-proof-20260611185806-iter1`
  - Delivery URL observed: `https://saige-v2.vercel.app`
  - Final score: `73`
  - Exit reason: `MAX_ITERATIONS`
  - ProductSSOT persisted: `true`
- Evidence files are under `C:\Users\victo\Documents\Codex\flowai-verification\evidence`.
- Runtime acceptance packet on main: `docs/cto/saige-proof-20260611-runtime-config-acceptance.md`.
- No VERIFIED movement is justified from the proof summary alone.
- `CA18-URL-ANY` and `CA18-UNIVERSAL-LIMIT` are not supported by this proof because the run was registered-product SAIGE, not arbitrary unregistered URL / universal diagnosis-only mode.
- The durable `ForgeRunState` phase-split architecture remains the long-term solution. The 800s window is an immediate production-window repair, not a replacement for stateful phase execution.

## Active Branches And Gates

1. Proof-runner evidence hardening
   - Branch merged: `fix/cto-proof-runner-delivery-url-evidence`.
   - New `origin/main`: `3292ba292ccaa7b27c282ce9a3735de9087d6a64`.
   - Status: merged, pushed, and locally verified.
   - Verification: `node --check scripts/cto/saige-sse-proof.mjs` PASS; `npx vitest run tests/tools/saigeSseProof.test.js` PASS, 6 tests; `node scripts/check-ssot-traceability.mjs` PASS with standing warnings only; `git diff --check` PASS.
   - Claim boundary: no VERIFIED movement.

2. SAIGE proof claim-impact packet
   - Branch: `docs/cto-saige-proof-claim-impact`.
   - Head: `a0cc192db38cf617f1caf1ec8f5b12f8dec15b43`.
   - File: `docs/cto/saige-proof-20260611-claim-impact.md`.
   - Status: review material only; not merged unless W04 clears.
   - Purpose: map which CA18 claims the proof may support and which it does not support.
   - Boundary: no claim promotion without the Claim Promotion Checklist and CD/CR/W04 review.

3. AOL five-layer user architecture
   - Branch: `docs/aol-five-layer-user-architecture`.
   - Head: `76498d40c12a9a567954f36306dd6b0ae7d2b5e1`.
   - File: `docs/aol/FIVE_LAYER_USER_ARCHITECTURE.md`.
   - Status: separate product-guidance branch; not merged unless cleared.
   - Boundary: AOL product guidance only; not a FlowAI canonical amendment unless separately ratified.

4. CTO directive refresh
   - Branch: `docs/cto-proof-runner-hardening-merged`.
   - Scope: docs only.
   - Gate: W04 CLEAR required before merging this docs-only branch to main.

## Immediate Priority Queue

1. CD/CR/W04 review the proof-runner hardening now on main and the separate claim-impact packet.
2. Decide whether any CA18 claim has enough evidence to enter the Claim Promotion Checklist. Do not move any claim by summary alone.
3. Keep `CA18-URL-ANY` and `CA18-UNIVERSAL-LIMIT` out of scope for the SAIGE registered-product proof.
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
