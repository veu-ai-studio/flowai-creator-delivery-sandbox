# Gate 1 - GitHub Admin Grant Approval

Date: 2026-06-16 UTC
Owner: CTO
Gate: Gate 1 - GitHub Admin Grant
Runtime changes: none
VERIFIED movement: none

## Scope Confirmation

Confirmed at: `2026-06-16T19:51:51.305Z`

The required grant is:

- GitHub App: `flowai-self-renewal`
- App URL: `https://github.com/apps/flowai-self-renewal`
- App id: `3748219`
- App owner: `veu-ai-studio`
- Installed account: `veu-ai-studio`
- GitHub org id: `285341421`
- Installation id: `133220298`
- Installation target type: `Organization`
- Repository access: `All repositories`
- Required permission in GitHub UI: **Repository permissions -> Administration -> Read and write**

Important wording:

- GitHub labels `Administration: Read and write` as a **Repository permission**.
- The required operating scope is the **organization installation** for `veu-ai-studio` with `All repositories` selected.
- Do not approve a selected-repository-only installation.
- Do not approve an organization permission that leaves the installation token without `administration: write`.

Current token evidence:

```json
{
  "repository_selection": "all",
  "permissions": {
    "contents": "write",
    "metadata": "read",
    "pull_requests": "write",
    "workflows": "write"
  },
  "hasAdministrationWrite": false,
  "hasContentsWrite": true
}
```

GitHub REST create-organization-repository docs tie repo creation to `Administration` write permission. Reference:

`https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#create-an-organization-repository`

## Exact Approval Click Path For Victor

Use this path as `veu-ai-studio` org owner:

1. Open the installed-app settings page:

   `https://github.com/organizations/veu-ai-studio/settings/installations/133220298`

2. Confirm the page is for:

   - Organization: `veu-ai-studio`
   - App: `flowai-self-renewal`
   - Repository access: `All repositories`

3. If GitHub shows a pending permission request, click:

   `Review request` or `Accept new permissions`

4. On the permission review screen, confirm the added permission is exactly:

   - Repository permissions -> `Administration`: `Read and write`

5. Confirm these existing permissions remain:

   - `Contents`: `Read and write`
   - `Pull requests`: `Read and write`
   - `Workflows`: `Read and write`

6. Click the final consent button:

   `Accept new permissions`, `Approve`, or GitHub's equivalent final confirmation.

Stop condition:

- If the installed-app page does not show a pending permission request for `Administration: Read and write`, do not hunt through GitHub settings. Report that the app registration has not yet requested the permission.

Fallback direct page if GitHub redirects away from the installation id URL:

`https://github.com/organizations/veu-ai-studio/settings/installations`

Then click `Configure` next to `flowai-self-renewal` and follow the same confirmation checklist above.

## Post-Grant Verification

After Victor approves, CB/CTO must verify before running any full proof:

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

Required result:

```json
{
  "repository_selection": "all",
  "hasAdministrationWrite": true,
  "hasContentsWrite": true
}
```

## Repo-Creation Smoke Test After Approval

After `hasAdministrationWrite:true`, run a narrow smoke test before a full forge:

```powershell
doppler run --project flowai --config prd -- node --input-type=module -e @'
import { buildAppJwtClaims, signAppJwt } from './src/lib/agents/renewal/githubApp.js';
const appId = process.env.GITHUB_APP_ID;
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
const installationId = process.env.GITHUB_APP_INSTALLATION_ID || process.env.GITHUB_INSTALLATION_ID;
const owner = 'veu-ai-studio';
const repo = `flowai-admin-smoke-${Date.now()}`;
async function gh(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
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
const token = tokenResp.body?.token;
if (!token) throw new Error(`no installation token: ${tokenResp.status}`);
const created = await gh(`https://api.github.com/orgs/${owner}/repos`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}` },
  body: JSON.stringify({
    name: repo,
    private: true,
    auto_init: false,
    description: 'FlowAI admin-permission smoke test; safe to delete',
  }),
});
const htmlUrl = created.body?.html_url ?? null;
let deleteStatus = null;
if (created.status >= 200 && created.status < 300) {
  const deleted = await gh(`https://api.github.com/repos/${owner}/${repo}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  deleteStatus = deleted.status;
}
console.log(JSON.stringify({
  repo,
  createStatus: created.status,
  repoUrl: htmlUrl,
  deleteStatus,
  ok: created.status >= 200 && created.status < 300,
  cleanedUp: deleteStatus === 204,
  error: created.status >= 300 ? created.body?.message : null,
}, null, 2));
'@
```

Acceptance:

- `ok:true`
- `repoUrl` is non-empty
- `cleanedUp:true` preferred; if cleanup is denied, record the private smoke repo URL and delete manually later.

Only after this passes should CB/CTO resume the Type 2 Fresh Build proof.

