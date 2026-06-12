# CT2 Result - Path 1 SAIGE Preview Acceptance

Date: 2026-06-12
Tester: CT2
Supervisor: CTO
Verdict: PASS
VERIFIED movement: no

## Target

- Product: SAIGE
- Vercel project: `veu-ai-studio/saige-v2`
- Branch: `flowai/migration-saige-1781139104798-ctosaige`
- Expected commit: `08f997a21a6d21fa9543a41c44d9b53f20609430`
- Deployment id: `dpl_H2ge2jn5QpRftkUeCFMmvSGsEDJ2`
- Preview URL: `https://saige-v2-ektts5xxf-veu-ai-studio.vercel.app`

## Repo/Branch Note

The requested branch `docs/cto-four-path-evidence-20260612` was already checked out in linked worktree:

`C:\Users\victo\Documents\Codex\flowai-cto-docs-20260612`

Git refused to check out the same branch in `C:\Users\victo\Downloads\truthful-flow-logic-lab` because the branch was already attached to that linked worktree. CT2 verified the linked worktree belongs to the same repo, pulled it, and it was already up to date.

## Required Reading

Read at session start:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/standing-goal-ct2.md`
- `docs/cto/ct2-path1-saige-preview-acceptance-dispatch-20260612.md`
- `docs/cto/path1-saige-migration-phase3-dod-20260612.md`

## Checks Performed

### 1. Vercel deployment identity

Command family used:

- `git fetch origin`
- `git pull --ff-only origin docs/cto-four-path-evidence-20260612`
- `npx vercel inspect dpl_H2ge2jn5QpRftkUeCFMmvSGsEDJ2 --token <DOPPLER_TOKEN> --scope veu-ai-studio`
- Vercel deployment API check using the Doppler-managed Vercel token

Token handling: token was retrieved from Doppler (`VERCEL_TOKEN`, fallback `VERCEL_OPERATOR_TOKEN`) and was not printed.

Observed Vercel metadata:

```json
{
  "id": "dpl_H2ge2jn5QpRftkUeCFMmvSGsEDJ2",
  "name": "saige-v2",
  "url": "saige-v2-ektts5xxf-veu-ai-studio.vercel.app",
  "readyState": "READY",
  "source": "git",
  "githubCommitSha": "08f997a21a6d21fa9543a41c44d9b53f20609430",
  "githubCommitRef": "flowai/migration-saige-1781139104798-ctosaige",
  "githubCommitMessage": "Remove Base44 platform dependencies for SAIGE preview",
  "githubOrg": "veu-ai-studio",
  "githubRepo": "saige-v2"
}
```

Result: PASS. Vercel still reports the deployment as `READY` and tied to the expected commit.

### 2. Authenticated Vercel app-shell access

Command family used:

```powershell
npx vercel curl / --cwd <TEMP_VERCEL_CONTEXT> --deployment https://saige-v2-ektts5xxf-veu-ai-studio.vercel.app --token <DOPPLER_TOKEN> --scope veu-ai-studio -- --silent --show-error --location
```

Because the docs worktree is not linked to the Vercel project, CT2 created a temporary `.vercel/project.json` outside the repo at:

`C:\Users\victo\AppData\Local\Temp\flowai-ct2-vercel-curl-saige-v2`

Observed authenticated shell markers:

```json
{
  "bodyLength": 603,
  "hasProtectionPageText": false,
  "title": "<title>SAIGE</title>",
  "jsAsset": "<script type=\"module\" crossorigin src=\"/assets/index-CfzsrFst.js\"></script>",
  "cssAsset": "<link rel=\"stylesheet\" crossorigin href=\"/assets/index-CA9S5vrn.css\">",
  "deploymentIdMarker": "data-deployment-id=\"dpl_H2ge2jn5QpRftkUeCFMmvSGsEDJ2\"",
  "hasRootMount": true
}
```

Result: PASS. Authenticated Vercel access returns the SAIGE app shell, not the protection page.

### 3. Anonymous browser/direct access

Command family used:

```powershell
curl.exe --silent --show-error --location --output <TEMP_BODY> --write-out "%{http_code}" https://saige-v2-ektts5xxf-veu-ai-studio.vercel.app/
```

Raw anonymous HTML body cached outside repo at:

`C:\Users\victo\AppData\Local\Temp\flowai-ct2-saige-v2-anon-body.html`

Observed anonymous access result:

```json
{
  "status": "401",
  "bodyLength": 15088,
  "title": "<title>Authentication Required</title>",
  "hasAuthenticationRequiredText": true,
  "hasSaigeAppShell": false
}
```

Result: EXPECTED CAVEAT. A normal unauthenticated browser/direct session receives Vercel Deployment Protection / authentication-required behavior. This is not an app-shell failure because authenticated Vercel access returns the SAIGE shell.

Viewport note: no viewport-dependent browser rendering was reached anonymously because Vercel protection stops the request before the app shell is served.

## Acceptance Answers

1. Does Vercel still report the deployment as `READY` for commit `08f997a21a6d21fa9543a41c44d9b53f20609430`?
   - Yes. Deployment `dpl_H2ge2jn5QpRftkUeCFMmvSGsEDJ2` is `READY` and the Vercel API reports the expected Git commit SHA.

2. Does authenticated Vercel access return the SAIGE app shell rather than the protection page?
   - Yes. `vercel curl` with Doppler-managed Vercel auth returned the SAIGE shell.

3. Does the app shell include a SAIGE title, JS asset, CSS asset, and matching deployment id?
   - Yes. Observed `<title>SAIGE</title>`, `/assets/index-CfzsrFst.js`, `/assets/index-CA9S5vrn.css`, and `data-deployment-id="dpl_H2ge2jn5QpRftkUeCFMmvSGsEDJ2"`.

4. What happens in a normal browser session without Vercel auth?
   - It receives HTTP `401` with `<title>Authentication Required</title>`. The SAIGE app shell is not served anonymously.

5. Can this preview be treated as a real deployed URL for Path 1 evidence, with a protection caveat?
   - Yes. The preview is a real Vercel deployed URL for the target commit, with the caveat that anonymous access is blocked by Vercel Deployment Protection.

6. Is there any basis for VERIFIED movement?
   - No. This is preview/deployment acceptance evidence only and does not justify VERIFIED movement.

## Final Verdict

PASS.

The Path 1 SAIGE preview is a real deployed Vercel preview URL for the expected commit. Authenticated Vercel access returns the SAIGE app shell with the expected title, assets, root mount, and deployment id. Anonymous access is blocked by Vercel Deployment Protection and should be documented as a caveat, not as an application-shell failure.

Claim impact: no movement.
VERIFIED movement: no.
Runtime code changed: no.
