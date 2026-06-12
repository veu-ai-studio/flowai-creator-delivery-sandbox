# Path 1 Evidence - SAIGE Migration Phase 3

Date: 2026-06-12
Owner: CTO
Path: Migration - SAIGE
Evidence tier: LOCAL_BUILD plus VERCEL_PREVIEW_METADATA
VERIFIED movement: none

## Summary

CB completed a surgical SAIGE migration cleanup on `veu-ai-studio/saige-v2`, removing Base44 platform dependencies and producing a Vercel preview deployment from the migrated branch. The migration branch is materially improved and deploys, but the full Path 1 target is not fully complete because `npm run typecheck` still fails on broad legacy JSX/typing debt.

This is a real deployed URL, but it is Vercel preview protected for anonymous access.

## Repository Evidence

- Repository: `https://github.com/veu-ai-studio/saige-v2.git`
- Local worktree: `C:\Users\victo\Documents\Codex\saige-v2-migration-inspect`
- Branch: `flowai/migration-saige-1781139104798-ctosaige`
- Commit: `08f997a21a6d21fa9543a41c44d9b53f20609430`
- Commit subject: `Remove Base44 platform dependencies for SAIGE preview`
- Local status after CTO verification: clean
- Remote verification: `git ls-remote` returned the same commit for the migration branch

Commit scope:

- 511 files changed
- 1,474 insertions
- 9,877 deletions
- Removed `@base44/sdk` and `@base44/vite-plugin`
- Removed Base44 Vite plugin usage
- Removed Base44 function/entity trees
- Added local `src/api/saigeClient.js`
- Updated runtime/import references away from Base44

## Base44 Removal Check

Command:

```powershell
rg -n "base44|Base44|@base44|base44\." -S src base44 vite.config.js package.json README.md index.html
```

Result:

- Exit code: 1
- Output: none
- Interpretation: no matching Base44 references remain in the scoped acceptance scan.

## Local Verification

Commands run from `C:\Users\victo\Documents\Codex\saige-v2-migration-inspect`:

```powershell
npm run lint
npm run build
npm run typecheck
```

Results:

- `npm run lint`: PASS
- `npm run build`: PASS
- `npm run typecheck`: FAIL

Typecheck failure pattern:

- `src/components/ai/AIDisclaimer.jsx(7,6): error TS2322`
- `src/components/ai/InlineAIAssistant.jsx(6,43): error TS2339`
- Many subsequent JSX component typing errors, especially `children` props on inferred `RefAttributes<any>` component types.

CTO interpretation:

- The migration branch is buildable and lint-clean.
- The branch is not type-clean.
- The typecheck failure appears broad and legacy/systemic rather than a narrow Base44-removal regression, but it still prevents claiming a fully clean migrated codebase.

## Vercel Deployment Evidence

Vercel project: `veu-ai-studio/saige-v2`

Deployment:

- Deployment id: `dpl_H2ge2jn5QpRftkUeCFMmvSGsEDJ2`
- URL: `https://saige-v2-ektts5xxf-veu-ai-studio.vercel.app`
- Ready state: `READY`
- Commit SHA: `08f997a21a6d21fa9543a41c44d9b53f20609430`
- Commit ref: `flowai/migration-saige-1781139104798-ctosaige`
- Commit message: `Remove Base44 platform dependencies for SAIGE preview`

Authenticated Vercel access returned the deployed app shell:

```html
<title>SAIGE</title>
<script type="module" crossorigin src="/assets/index-CfzsrFst.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-CA9S5vrn.css">
<script async data-explicit-opt-in="true" data-deployment-id="dpl_H2ge2jn5QpRftkUeCFMmvSGsEDJ2" ...></script>
```

Anonymous direct access returned `401 Unauthorized` with Vercel Deployment Protection. This is not an application failure, but it means public/anonymous browser acceptance is blocked unless Victor is signed in to Vercel or a protection bypass is used.

## Path 1 Status

Status: PARTIAL PASS

Passes:

- Branch created and pushed.
- Base44 references removed in scoped acceptance scan.
- Lint passes.
- Build passes.
- Vercel preview deployment exists and is READY.
- Authenticated Vercel access confirms the SAIGE app shell is served.

Remaining gaps:

- Typecheck fails.
- Anonymous preview access is deployment-protected.
- CT2 has not yet completed browser acceptance on the protected preview.
- No VERIFIED movement is justified.

## Next Action

Dispatch CT2 to verify the Path 1 preview using the Vercel-authenticated route and to record whether Victor can open the URL directly as a Vercel team member. If CT2 confirms preview usability, Path 1 becomes the first deployed-URL outcome of the four-path strategy, with typecheck debt still tracked separately.
