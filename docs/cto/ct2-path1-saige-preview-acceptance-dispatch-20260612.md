# CT2 Dispatch - Path 1 SAIGE Preview Acceptance

Date: 2026-06-12
From: CTO
To: CT2
Priority: immediate
Branch to read: `docs/cto-four-path-evidence-20260612`

## Objective

Perform acceptance testing for the Path 1 SAIGE migration preview and report whether the deployed URL is usable evidence for the four-path strategy.

## Required Reading

Read these files first:

1. `docs/CANONICAL_REFERENCE.md`
2. `docs/BUILD_PROTOCOL.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/cto/standing-goal-ct2.md`
5. `docs/cto/path1-saige-migration-phase3-dod-20260612.md`

## Target

- Product: SAIGE
- Vercel project: `veu-ai-studio/saige-v2`
- Branch: `flowai/migration-saige-1781139104798-ctosaige`
- Commit: `08f997a21a6d21fa9543a41c44d9b53f20609430`
- Deployment id: `dpl_H2ge2jn5QpRftkUeCFMmvSGsEDJ2`
- Preview URL: `https://saige-v2-ektts5xxf-veu-ai-studio.vercel.app`

## Known Caveat

Anonymous direct access currently returns Vercel Deployment Protection (`401 Unauthorized`). This is not an app-shell failure. Use authenticated Vercel access where needed.

Suggested command pattern:

```powershell
$doppler = 'C:\Users\victo\doppler-cli\doppler.exe'
$token = & $doppler secrets get VERCEL_TOKEN --project flowai --config prd --plain
if (-not $token) { $token = & $doppler secrets get VERCEL_OPERATOR_TOKEN --project flowai --config prd --plain }
npx vercel curl / --deployment https://saige-v2-ektts5xxf-veu-ai-studio.vercel.app --token $token --scope veu-ai-studio -- --silent --show-error --location
```

Do not print tokens.

## Acceptance Checks

Check and report:

1. Does Vercel still report the deployment as `READY` for commit `08f997a21a6d21fa9543a41c44d9b53f20609430`?
2. Does authenticated Vercel access return the SAIGE app shell rather than the protection page?
3. Does the app shell include a SAIGE title, JS asset, CSS asset, and matching deployment id?
4. What happens in a normal browser session without Vercel auth?
5. Can this preview be treated as a real deployed URL for Path 1 evidence, with a protection caveat?
6. Is there any basis for VERIFIED movement? Expected answer: no.

## Output

Commit the result to:

`docs/cto/ct2-path1-saige-preview-acceptance-result-20260612.md`

Report PASS, PARTIAL, or BLOCK:

- PASS: deployment is ready, authenticated app shell is served, protection caveat is documented, no VERIFIED movement.
- PARTIAL: deployment is ready but browser usability is limited by Vercel protection.
- BLOCK: deployment is not ready, wrong commit, app shell not served, or evidence is insufficient.

You do not need Victor or W04 for routine commands. CTO is your supervisor for this task.
