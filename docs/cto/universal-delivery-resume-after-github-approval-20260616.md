# Universal Delivery Resume Runbook After GitHub Approval

Date: 2026-06-16 UTC
Owner: CTO
Purpose: resume the Type 2 description-only Fresh Build proof immediately after Victor/W04 approves GitHub App `Administration: Read and write`.

Canonical authority remains `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, and `docs/IMPLEMENTATION_PLAN.md`.

## Current Stop State

- Runtime branch: `main`
- Runtime commit deployed to production: `8b88d1b1410a8eb5f8cd452ffd2860007edf33a0`
- Coordination commit on `main`: `224d892d3c5e6108ad9475645ae26b0c9cb3b51f`
- Last Type 2 proof run: `cto-type2-description-only-20260615-2324`
- Last terminal code: `ACCESS_BLOCKED`
- Last terminal message: `Resource not accessible by personal access token`
- Root cause: GitHub App installation lacks `administration: write`

Do not rerun the proof until the permission check below returns `hasAdministrationWrite:true`.

## Permission Check

Run from repo root:

```powershell
doppler run --project flowai --config prd -- node --input-type=module -e @'
import { buildAppJwtClaims, signAppJwt } from './src/lib/agents/renewal/githubApp.js';
const appId = process.env.GITHUB_APP_ID;
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
const installationId = process.env.GITHUB_APP_INSTALLATION_ID || process.env.GITHUB_INSTALLATION_ID;
async function gh(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  return { status: res.status, body };
}
const jwt = signAppJwt(buildAppJwtClaims(appId, Date.now()), privateKey);
const tokenResp = await gh(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
  method: 'POST',
  headers: { authorization: `Bearer ${jwt}` },
  body: JSON.stringify({}),
});
const permissions = tokenResp.body?.permissions ?? {};
console.log(JSON.stringify({
  status: tokenResp.status,
  repository_selection: tokenResp.body?.repository_selection ?? null,
  permissions,
  hasAdministrationWrite: permissions.administration === 'write',
  hasContentsWrite: permissions.contents === 'write',
}, null, 2));
'@
```

Expected before continuing:

```json
{
  "repository_selection": "all",
  "hasAdministrationWrite": true,
  "hasContentsWrite": true
}
```

## Restore Intended Delivery Namespace

The temporary user-owned fallback was diagnostic only. Universal Delivery should use the FlowAI-owned organization namespace.

```powershell
doppler secrets set FLOWAI_DELIVERY_GITHUB_OWNER=veu-ai-studio --project flowai --config prd
doppler secrets set FLOWAI_DELIVERY_GITHUB_OWNER_TYPE=org --project flowai --config prd

$token = doppler secrets get VERCEL_TOKEN --project flowai --config prd --plain
vercel env rm FLOWAI_DELIVERY_GITHUB_OWNER production --yes --token $token --scope veu-ai-studio
'veu-ai-studio' | vercel env add FLOWAI_DELIVERY_GITHUB_OWNER production --token $token --scope veu-ai-studio
vercel env rm FLOWAI_DELIVERY_GITHUB_OWNER_TYPE production --yes --token $token --scope veu-ai-studio
'org' | vercel env add FLOWAI_DELIVERY_GITHUB_OWNER_TYPE production --token $token --scope veu-ai-studio
```

## Redeploy Production

```powershell
$token = doppler secrets get VERCEL_TOKEN --project flowai --config prd --plain
vercel deploy --prod --token $token --scope veu-ai-studio
```

Then confirm:

```powershell
Invoke-RestMethod -Uri 'https://flowai-dun.vercel.app/api/health' -TimeoutSec 30 |
  Select-Object ok,status,commit,@{n='commitFull';e={$_.checks.build.commitFull}},@{n='deploymentUrl';e={$_.checks.build.deploymentUrl}} |
  ConvertTo-Json -Depth 6
```

## Rerun Type 2 Description-Only Proof

Use a fresh run ID:

```powershell
$runId = 'cto-type2-description-only-' + (Get-Date -Format 'yyyyMMdd-HHmm')
$dir = Join-Path $env:TEMP $runId
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$requestPath = Join-Path $dir 'request.json'
$responsePath = Join-Path $dir 'response.sse'
$stderrPath = Join-Path $dir 'curl.stderr.txt'

$body = @{
  mode = 'FRESH_BUILD'
  flowHubPath = 'fresh_build'
  structuralLayer = 'controlled'
  operationalMode = 'auto'
  analysisDepth = 'quick'
  maxIterations = 1
  runId = $runId
  description = 'Build a platform-free Community Resource Navigator web app for a small nonprofit. It should let visitors browse local support resources by category, urgency, eligibility, and location; save a short action checklist; and show clear next steps without requiring sign-in. Use accessible responsive UI, honest placeholder data, and no external vendor lock-in.'
} | ConvertTo-Json -Depth 8

[System.IO.File]::WriteAllText($requestPath, $body, [System.Text.UTF8Encoding]::new($false))

curl.exe -N -sS `
  -H 'Content-Type: application/json' `
  -H 'Accept: text/event-stream' `
  --data-binary "@$requestPath" `
  'https://flowai-dun.vercel.app/api/run-construction' `
  1> $responsePath 2> $stderrPath

Select-String -Path $responsePath -Pattern 'previewUrl|deploymentUrl|ACCESS_BLOCKED|GITHUB|VERCEL|final' -Context 0,2 |
  Select-Object -First 120 |
  ForEach-Object { $_.Line; $_.Context.PostContext }
```

## Success Criteria

Proceed to CT2 only if the proof returns a real URL:

- `previewUrl` or `deploymentUrl` is non-empty
- The run does not end with `ACCESS_BLOCKED`
- The returned URL is public or preview-access evidence is explicit

## CT2 Dispatch Condition

Dispatch CT2 only after a returned URL exists. CT2 must open the returned URL in a browser and confirm:

- URL loads
- Page is not an auth wall, Vercel error page, or blank shell
- Generated app content is visible
- Evidence screenshot or browser artifact is committed under `docs/cto/`

No `matrixArtifact` VERIFIED movement is allowed from this proof unless W04/CEO separately authorizes the exact row mapping and required fields.
