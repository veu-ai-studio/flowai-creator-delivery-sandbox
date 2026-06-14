# CD Review Prompt Draft - Universal Delivery Workspace

FROM: CTO
TO: CD
ACTION: DRAFT STEP 5 REVIEW - do not run until CTO finalizes with branch/commit
DATE: 2026-06-14 UTC
STATUS: PENDING W04 CLEARANCE AND CB PATCH

## Clearance Boundary

This is a draft review prompt. Do not begin review from this file until CTO posts a final non-draft prompt with the actual runtime branch, commit, and evidence files.

## Read First

- `docs/BUILD_PROTOCOL.md`
- `docs/CANONICAL_REFERENCE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/universal-input-journey-audit-20260614.md`
- `docs/cto/auto-repo-provisioning-infrastructure-audit-20260614.md`
- `docs/cto/universal-delivery-workspace-postclearance-runbook-20260614.md`
- CB evidence file: `TBD`

## Branch Under Review

- Branch: `TBD`
- Runtime code commit: `TBD`
- Review HEAD: `TBD`
- Base: `origin/main` at `TBD`

Files changed by runtime patch: `TBD by CB evidence`.

## Review Focus

Please review for architecture and implementation integrity:

1. Does the patch establish a real `DeliveryWorkspace` or equivalent durable state, not just log-only metadata?
2. Does repo creation happen only under the configured FlowAI-owned GitHub owner/org?
3. Is repo naming collision-safe and not hard-coded to a proof target?
4. Does the GitHub write path support an initial codebase commit for a new repo?
5. Are GitHub App permissions checked or failures surfaced honestly?
6. Is operator-token fallback explicit, auditable, and secret-safe if used?
7. Are token values excluded from state, logs, status bus, errors, and ProductSSOT?
8. Does Vercel project create/resolve use the current documented API shape and team/scope?
9. Is a deployment URL returned only after Vercel reports READY or equivalent public proof?
10. Are protected original repo write guards preserved?
11. Do existing preconfigured product paths keep working?
12. Does the implementation avoid canonical doc, matrixArtifact, and VERIFIED movement changes?
13. Is Type 2 description-only support honestly represented, with no fake crawl/scoring evidence?
14. Are failure states explicit enough for W04/CTO to diagnose without Victor doing dashboard work?

## Required Verification To Check

CB should provide:

- focused tests for touched modules,
- `npm run build:preflight`,
- no-secret evidence checks,
- branch/file list for runtime changes,
- diagnosis artifact committed before runtime patch.

Treat missing verification as a finding. Block only on concrete architecture, implementation, test, evidence, or protocol failure.

## Required Output

Return one of:

- `PASS`
- `PASS-WITH-FINDINGS`
- `BLOCK`

Include concise findings with file/line references where possible.
