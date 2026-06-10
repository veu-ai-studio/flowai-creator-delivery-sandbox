# CTO Current Directive

## Active Priority

Move FlowAI toward its first honest, fully functional end-to-end forge run with a deployed URL and ProductSSOT evidence.

## Current Technical Reality

- Forge steps are wired, but WIRED is not VERIFIED.
- The current background forge path is not truly resumable; Inngest delegates to one run-construction handler call.
- `runOrchestration` still carries execution-critical state in local closure variables and an in-process `OrchestrationState` instance.
- A durable `ForgeRunState` envelope is required before a true serialized phase split can be claimed.
- Timeout-relaxation work may improve immediate production completion, but it is not a substitute for durable phase state.

## Immediate Priorities

1. Complete the bounded timeout-relaxation/hot-path fix without claiming architecture completion.
2. Preserve evidence honesty: no VERIFIED movement without required proof fields and review.
3. Prepare the durable ForgeRunState refactor as the prerequisite for real multi-phase Inngest execution.
4. Keep CB, CB2, CT2, CD, and CR aligned from repo reality, not memory.

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

## Standing Rules For CR

- Review adversarially for evidence inflation, security regressions, deployment-proof gaps, governance bypass, and acceptance-criteria failures.
- Block only on demonstrated, evidence-tied failures.
- Cite code, command output, production/runtime proof, or canonical sections for every blocker.

## CTO Rule

The CTO layer may recommend architecture, dispatch sequencing, and technical acceptance criteria, but canonical authority remains the three governing documents. W04 retains clearance authority.
