# CT2 Proof Draft - Universal Delivery Workspace

FROM: CTO
TO: CT2
ACTION: DRAFT BROWSER ACCEPTANCE - do not run until CTO finalizes with production commit and run target
DATE: 2026-06-14 UTC
STATUS: PENDING W04 CLEARANCE, CB PATCH, CD/CR REVIEW, MERGE, AND PRODUCTION DEPLOY

## Clearance Boundary

This is a draft CT2 prompt. Do not execute until CTO posts a final non-draft CT2 dispatch with:

- production URL,
- `/api/health` commit identity,
- run ID,
- returned deployment URL,
- workspace evidence pointer.

## Purpose

Confirm that Universal Delivery Workspace produces a real user-facing deployed URL without relying on user GitHub/Vercel configuration.

Recommended first proof target:

- Type 2 description-only Fresh Build, unless CB diagnosis shows a safer faster target.

## Required Reading

- `docs/BUILD_PROTOCOL.md`
- `docs/CANONICAL_REFERENCE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/universal-delivery-workspace-postclearance-runbook-20260614.md`
- Runtime proof evidence from CB/CTO: `TBD`

## Inputs To Be Filled By CTO

- FlowAI production URL: `TBD`
- Production commit from `/api/health`: `TBD`
- Run ID: `TBD`
- Input type: `description_only`
- Submitted description: `TBD`
- Workspace ID: `TBD`
- GitHub repo URL: `TBD`
- Branch: `TBD`
- Commit SHA: `TBD`
- Vercel project ID/name: `TBD`
- Deployment ID: `TBD`
- Returned public URL: `TBD`

## Browser Acceptance Checks

Use a fresh anonymous browser context:

- no cookies,
- no app session,
- no Vercel bypass header,
- no local operator secrets,
- no manual dashboard intervention.

Check the returned public URL:

1. URL responds with HTTP `200`.
2. Final browser URL is the returned URL or expected Vercel alias.
3. Page is not Vercel protection/login.
4. Page is not the FlowAI operator shell.
5. Page is not a blank Vite shell.
6. Page contains generated product-specific content from the submitted description.
7. Page loads without console fatal errors.
8. At least one visible interaction or navigation element works without crashing, if present.

## Delivery Evidence Checks

Confirm from repo/API/evidence where available:

1. GitHub repo exists under the FlowAI-owned org only.
2. Branch exists.
3. Commit SHA exists and matches evidence.
4. Generated file tree is present.
5. Vercel deployment exists and is Ready.
6. Vercel project belongs to configured FlowAI/Vercel team.
7. Workspace metadata references repo, branch, commit, project, deployment, and returned URL.
8. ProductSSOT/evidence reference exists if the build claims persistence.
9. No VERIFIED movement was made.

## Output Required

Return:

- `PASS`
- `PASS-WITH-FINDINGS`
- `BLOCK`

Include:

- final browser URL,
- HTTP status,
- page title,
- visible content signals,
- screenshot path,
- raw browser evidence path,
- GitHub evidence observed,
- Vercel evidence observed,
- workspace/ProductSSOT evidence observed,
- any mismatch between returned URL and observed URL.

## Block Conditions

Block if:

- returned URL is not publicly accessible,
- Vercel protection blocks anonymous access,
- page is FlowAI operator shell instead of generated product,
- page is blank or build-crashed,
- repo/project evidence points outside the FlowAI-owned org/team,
- workspace metadata is missing or inconsistent,
- any VERIFIED movement is observed without W04/CEO authorization,
- any evidence URL is fallback/context relabeled as observed proof.
