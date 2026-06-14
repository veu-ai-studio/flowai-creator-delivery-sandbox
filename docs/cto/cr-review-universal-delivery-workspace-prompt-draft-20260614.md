# CR Review Prompt Draft - Universal Delivery Workspace

FROM: CTO
TO: CR
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

Please review in a strict evidence and regression posture:

1. Does any code path persist or print GitHub/Vercel tokens or derived secrets?
2. Can a user-controlled input influence GitHub owner/org, repo visibility, branch name, project name, or deployment target unsafely?
3. Does the patch accidentally allow writes to original/protected repos?
4. Does the patch relabel fallback/context URLs as observed deployment evidence?
5. Does the patch claim deployment success before public readiness is independently established?
6. Are error codes honest and specific enough, or do they collapse into misleading generic `STEP_FAILED` states?
7. Does the workspace record become a new source of SSOT drift against ProductSSOT?
8. Are Type 1, Type 2, and Type 3 states labeled honestly, without implying unsupported paths are done?
9. Does the implementation preserve platform-boundary, parse, auth, secret, package, deploy, governance, and SSOT gates?
10. Does the patch introduce product-specific hard-coding for SAIGE, RelTwin, VEU, Victor, or the proof target?
11. Do tests cover negative cases: missing permissions, wrong owner, deploy not READY, token fallback absent, and unsafe original repo?
12. Does the diagnosis artifact precede the runtime patch and match the actual implementation choices?

## Required Verification To Check

CB should provide:

- focused tests for touched modules,
- `npm run build:preflight`,
- no-secret evidence checks,
- branch/file list for runtime changes,
- diagnosis artifact committed before runtime patch.

Treat missing verification as a finding. Block on any secret leak, fabricated evidence, unsafe write path, SSOT drift, or unreviewed canonical/matrixArtifact change.

## Required Output

Return one of:

- `PASS`
- `PASS-WITH-FINDINGS`
- `BLOCK`

Lead with findings ordered by severity and include file/line references where possible.
