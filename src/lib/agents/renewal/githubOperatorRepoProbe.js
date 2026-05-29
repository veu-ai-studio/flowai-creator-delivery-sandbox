/**
 * GitHub operator repo probe.
 *
 * Verifies that GITHUB_OPERATOR_TOKEN can see a registered repository and
 * appears to have write capability, without mutating the repo and without
 * returning or logging the token.
 */

'use strict';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

function makeProbeResult(fields) {
  return Object.freeze({
    kind: 'github_operator_repo_probe',
    ok: false,
    canRead: false,
    canWrite: false,
    tokenPresent: false,
    tokenRedacted: true,
    owner: null,
    repo: null,
    branch: null,
    defaultBranch: null,
    permissions: Object.freeze({ admin: false, maintain: false, push: false, pull: false }),
    reason: null,
    status: null,
    checkedAt: new Date().toISOString(),
    ...fields,
  });
}

function shapePermissions(raw = {}) {
  return Object.freeze({
    admin: raw.admin === true,
    maintain: raw.maintain === true,
    push: raw.push === true,
    pull: raw.pull === true,
  });
}

async function readJson(response) {
  const raw = await response.text();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function callGitHub(pathAndQuery, token, opts = {}) {
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return { ok: false, status: 0, body: null, reason: 'fetch_unavailable' };
  }
  try {
    const response = await fetchImpl(`${GITHUB_API_BASE}${pathAndQuery}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await readJson(response),
      reason: response.ok ? null : `github_${response.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      body: null,
      reason: `network:${(e?.message ?? String(e)).slice(0, 120)}`,
    };
  }
}

export async function probeGithubOperatorRepoAccess({
  owner,
  repo,
  branch = 'main',
  token,
  opts = {},
} = {}) {
  if (typeof owner !== 'string' || !owner || typeof repo !== 'string' || !repo) {
    return makeProbeResult({ reason: 'bad_repo_args', owner: owner ?? null, repo: repo ?? null, branch });
  }
  if (typeof token !== 'string' || !token) {
    return makeProbeResult({ reason: 'missing_token', owner, repo, branch });
  }

  const enc = (s) => encodeURIComponent(s);
  const repoResult = await callGitHub(`/repos/${enc(owner)}/${enc(repo)}`, token, opts);
  if (!repoResult.ok) {
    return makeProbeResult({
      owner,
      repo,
      branch,
      tokenPresent: true,
      reason: repoResult.reason,
      status: repoResult.status,
    });
  }

  const permissions = shapePermissions(repoResult.body?.permissions ?? {});
  const defaultBranch = typeof repoResult.body?.default_branch === 'string'
    ? repoResult.body.default_branch
    : null;
  const selectedBranch = branch || defaultBranch || 'main';
  const branchResult = await callGitHub(
    `/repos/${enc(owner)}/${enc(repo)}/git/ref/heads/${enc(selectedBranch)}`,
    token,
    opts,
  );
  const canRead = branchResult.ok;
  const canWrite = permissions.push || permissions.maintain || permissions.admin;

  return makeProbeResult({
    ok: canRead && canWrite,
    canRead,
    canWrite,
    tokenPresent: true,
    owner,
    repo,
    branch: selectedBranch,
    defaultBranch,
    permissions,
    reason: canRead
      ? (canWrite ? 'read_write_confirmed' : 'read_only_or_permissions_not_reported')
      : branchResult.reason,
    status: branchResult.ok ? repoResult.status : branchResult.status,
  });
}

export const __internals = Object.freeze({
  GITHUB_API_BASE,
  GITHUB_API_VERSION,
  shapePermissions,
  makeProbeResult,
  callGitHub,
});
