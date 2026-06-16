import { normalizeUpgradeTargetState } from '../products/upgradeTargetState.js';
import { getInstallationToken } from '../agents/renewal/githubApp.js';

const GITHUB_API = 'https://api.github.com';
const VERCEL_API = 'https://api.vercel.com';
const DEFAULT_REPO_VISIBILITY_PRIVATE = true;

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function tokenError(kind) {
  return Object.freeze({
    ok: false,
    status: 'access_blocked',
    code: 'ACCESS_BLOCKED',
    kind,
    detail: `${kind} token missing or lacks required permission`,
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function vercelHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function safeSlug(value, fallback = 'product') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 52);
  return slug || fallback;
}

function shortRunId(runId) {
  return safeSlug(runId, 'run').slice(0, 18) || 'run';
}

function repoNameForProduct(product = {}) {
  const source = product.product_id ?? product.slug ?? product.name ?? 'product';
  return `${safeSlug(source)}-v2`;
}

function repoNameForWorkspace({ productName, runId } = {}) {
  return `flowai-${safeSlug(productName, 'delivery')}-${shortRunId(runId)}`.slice(0, 96).replace(/-+$/g, '');
}

function githubRepoUrl(owner, repo) {
  return `https://github.com/${owner}/${repo}`;
}

function configuredGithubOwner(env = {}) {
  return nonEmptyString(
    env.FLOWAI_DELIVERY_GITHUB_OWNER
      || env.FLOWAI_OWNED_GITHUB_ORG
      || env.FLOWAI_GITHUB_OWNER,
  );
}

function configuredGithubOwnerType(env = {}) {
  const value = String(env.FLOWAI_DELIVERY_GITHUB_OWNER_TYPE || env.FLOWAI_GITHUB_OWNER_TYPE || 'org')
    .trim()
    .toLowerCase();
  return value === 'user' ? 'user' : 'org';
}

function credentialSourceLabel(source) {
  if (source === 'github_app') return 'github_app';
  if (source === 'pat' || source === 'GITHUB_OPERATOR_TOKEN' || source === 'GITHUB_PAT') return 'operator_token';
  return source || 'unknown';
}

function truthyEnv(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function operatorGithubCredential(env = {}, permissionEvidence = null, reason = 'github_app_token_unavailable') {
  const fallback = nonEmptyString(env.GITHUB_OPERATOR_TOKEN || env.GITHUB_PAT);
  if (!fallback) return null;
  return {
    ok: true,
    token: fallback,
    source: 'operator_token',
    permissionEvidence: {
      fallback: true,
      reason,
      appPermissionEvidence: permissionEvidence || null,
    },
  };
}

function permissionValue(permissions, key) {
  if (!permissions || typeof permissions !== 'object') return null;
  return permissions[key] ?? permissions[String(key).toLowerCase()] ?? null;
}

function validateGithubAppPermissions(tokenInfo = {}) {
  const permissions = tokenInfo.permissions || {};
  const administration = permissionValue(permissions, 'administration');
  const contents = permissionValue(permissions, 'contents');
  const repositorySelection = tokenInfo.repositorySelection ?? tokenInfo.repository_selection ?? null;
  const missing = [];
  if (administration !== 'write') missing.push('Administration: write');
  if (contents !== 'write') missing.push('Contents: write');
  if (repositorySelection !== 'all') missing.push('all-repository access');
  return {
    ok: missing.length === 0,
    missing,
    permissions: {
      administration,
      contents,
    },
    repositorySelection,
  };
}

async function resolveGithubWorkspaceCredential({ env = {}, opts = {} } = {}) {
  if (opts.githubCredential?.token) {
    return {
      ok: true,
      token: opts.githubCredential.token,
      source: credentialSourceLabel(opts.githubCredential.source),
      permissionEvidence: opts.githubCredential.permissionEvidence || null,
    };
  }

  try {
    const tokenInfo = await (opts.getInstallationToken || getInstallationToken)({
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY,
      installationId: env.GITHUB_APP_INSTALLATION_ID || env.GITHUB_INSTALLATION_ID,
      pat: null,
      fetch: opts.fetch,
    });
    const evidence = validateGithubAppPermissions(tokenInfo);
    if (!evidence.ok) {
      if (truthyEnv(env.FLOWAI_ALLOW_GITHUB_OPERATOR_FALLBACK_FOR_DELIVERY)) {
        const fallback = operatorGithubCredential(env, evidence, 'github_app_permission_insufficient');
        if (fallback) return fallback;
      }
      return {
        ok: false,
        status: 'blocked',
        code: 'GITHUB_APP_PERMISSION_REQUIRED',
        detail: `GitHub App is missing ${evidence.missing.join(', ')}`,
        credentialSource: 'github_app',
        permissionEvidence: evidence,
      };
    }
    return {
      ok: true,
      token: tokenInfo.token,
      source: 'github_app',
      expiresAt: tokenInfo.expiresAt || null,
      permissionEvidence: evidence,
    };
  } catch (error) {
    const fallback = operatorGithubCredential(env, null, error?.code || 'github_app_token_unavailable');
    if (!fallback) {
      return {
        ok: false,
        status: 'blocked',
        code: error?.code || 'GITHUB_APP_TOKEN_UNAVAILABLE',
        detail: String(error?.message ?? error).slice(0, 300),
        credentialSource: 'github_app',
      };
    }
    return fallback;
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 500) }; }
}

async function githubFetch(path, token, opts = {}) {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('fetch unavailable');
  const response = await fetchImpl(`${GITHUB_API}${path}`, {
    method: opts.method ?? 'GET',
    headers: { ...authHeaders(token), ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { response, body: await readJson(response) };
}

async function vercelFetch(path, token, opts = {}) {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('fetch unavailable');
  const response = await fetchImpl(`${VERCEL_API}${path}`, {
    method: opts.method ?? 'GET',
    headers: vercelHeaders(token),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { response, body: await readJson(response) };
}

export async function ensureUpgradeRepo({
  product,
  org,
  repoName,
  ownerType = 'org',
  token,
  opts = {},
} = {}) {
  if (!token) return tokenError('github');
  const repo = nonEmptyString(repoName) || repoNameForProduct(product);
  const owner = org ?? product?.org_id ?? 'veu-ai-studio';
  try {
    const existing = await githubFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token, opts);
    if (existing.response.status === 200) {
      return Object.freeze({
        ok: true,
        status: 'provisioned',
        repo,
        owner,
        upgrade_repo_url: existing.body?.html_url ?? githubRepoUrl(owner, repo),
        created: false,
      });
    }
    if (existing.response.status !== 404) {
      return Object.freeze({
        ok: false,
        status: existing.response.status === 401 || existing.response.status === 403 ? 'access_blocked' : 'failed',
        code: existing.response.status === 401 || existing.response.status === 403 ? 'ACCESS_BLOCKED' : 'GITHUB_REPO_CHECK_FAILED',
        detail: existing.body?.message ?? `GitHub repo check returned ${existing.response.status}`,
      });
    }

    const createPath = ownerType === 'user'
      ? '/user/repos'
      : `/orgs/${encodeURIComponent(owner)}/repos`;
    const created = await githubFetch(createPath, token, {
      ...opts,
      method: 'POST',
      body: {
        name: repo,
        private: opts.privateRepo !== false ? DEFAULT_REPO_VISIBILITY_PRIVATE : false,
        description: 'FlowAI upgrade target',
        auto_init: false,
      },
    });
    if (created.response.status < 200 || created.response.status >= 300) {
      return Object.freeze({
        ok: false,
        status: created.response.status === 401 || created.response.status === 403 ? 'access_blocked' : 'failed',
        code: created.response.status === 401 || created.response.status === 403 ? 'ACCESS_BLOCKED' : 'GITHUB_REPO_CREATE_FAILED',
        detail: created.body?.message ?? `GitHub repo create returned ${created.response.status}`,
      });
    }
    return Object.freeze({
      ok: true,
      status: 'provisioned',
      repo,
      owner,
      ownerType,
      upgrade_repo_url: created.body?.html_url ?? githubRepoUrl(owner, repo),
      created: true,
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: 'failed',
      code: 'GITHUB_PROVISION_FAILED',
      detail: error?.message ?? String(error),
    });
  }
}

export async function copyGithubDefaultBranch({
  sourceOwner,
  sourceRepo,
  targetOwner,
  targetRepo,
  token,
  opts = {},
} = {}) {
  if (!token) return tokenError('github');
  const maxFiles = Number.isFinite(opts.maxFiles) ? opts.maxFiles : 500;
  try {
    const source = await githubFetch(`/repos/${encodeURIComponent(sourceOwner)}/${encodeURIComponent(sourceRepo)}`, token, opts);
    if (source.response.status !== 200) {
      return Object.freeze({
        ok: false,
        status: source.response.status === 401 || source.response.status === 403 ? 'access_blocked' : 'failed',
        code: source.response.status === 401 || source.response.status === 403 ? 'ACCESS_BLOCKED' : 'SOURCE_REPO_UNAVAILABLE',
        detail: source.body?.message ?? `Source repo returned ${source.response.status}`,
      });
    }
    const defaultBranch = source.body?.default_branch ?? 'main';
    const ref = await githubFetch(`/repos/${encodeURIComponent(sourceOwner)}/${encodeURIComponent(sourceRepo)}/git/ref/heads/${encodeURIComponent(defaultBranch)}`, token, opts);
    const sha = ref.body?.object?.sha;
    if (ref.response.status !== 200 || !sha) {
      return Object.freeze({ ok: false, status: 'failed', code: 'SOURCE_REF_UNAVAILABLE', detail: 'source default branch ref missing' });
    }
    const tree = await githubFetch(`/repos/${encodeURIComponent(sourceOwner)}/${encodeURIComponent(sourceRepo)}/git/trees/${encodeURIComponent(sha)}?recursive=1`, token, opts);
    const sourceFiles = Array.isArray(tree.body?.tree)
      ? tree.body.tree.filter((entry) => entry?.type === 'blob' && typeof entry.path === 'string')
      : [];
    if (tree.response.status !== 200 || sourceFiles.length === 0) {
      return Object.freeze({ ok: false, status: 'failed', code: 'SOURCE_TREE_UNAVAILABLE', detail: 'source tree missing or empty' });
    }
    if (tree.body?.truncated || sourceFiles.length > maxFiles) {
      return Object.freeze({
        ok: false,
        status: 'failed',
        code: 'SOURCE_COPY_TOO_LARGE',
        detail: `source tree has ${sourceFiles.length} files; serverless API copy limit is ${maxFiles}`,
      });
    }
    const targetTree = [];
    for (const entry of sourceFiles) {
      const blob = await githubFetch(`/repos/${encodeURIComponent(sourceOwner)}/${encodeURIComponent(sourceRepo)}/git/blobs/${encodeURIComponent(entry.sha)}`, token, opts);
      if (blob.response.status !== 200 || typeof blob.body?.content !== 'string') {
        return Object.freeze({ ok: false, status: 'failed', code: 'SOURCE_BLOB_UNAVAILABLE', detail: `unable to read ${entry.path}` });
      }
      const targetBlob = await githubFetch(`/repos/${encodeURIComponent(targetOwner)}/${encodeURIComponent(targetRepo)}/git/blobs`, token, {
        ...opts,
        method: 'POST',
        body: {
          content: blob.body.content,
          encoding: blob.body.encoding === 'base64' ? 'base64' : 'utf-8',
        },
      });
      if (targetBlob.response.status < 200 || targetBlob.response.status >= 300 || !targetBlob.body?.sha) {
        return Object.freeze({ ok: false, status: 'failed', code: 'TARGET_BLOB_CREATE_FAILED', detail: `unable to write ${entry.path}` });
      }
      targetTree.push({ path: entry.path, mode: entry.mode ?? '100644', type: 'blob', sha: targetBlob.body.sha });
    }
    const newTree = await githubFetch(`/repos/${encodeURIComponent(targetOwner)}/${encodeURIComponent(targetRepo)}/git/trees`, token, {
      ...opts,
      method: 'POST',
      body: { tree: targetTree },
    });
    if (newTree.response.status < 200 || newTree.response.status >= 300 || !newTree.body?.sha) {
      return Object.freeze({ ok: false, status: 'failed', code: 'TARGET_TREE_CREATE_FAILED', detail: 'unable to create target tree' });
    }
    const commit = await githubFetch(`/repos/${encodeURIComponent(targetOwner)}/${encodeURIComponent(targetRepo)}/git/commits`, token, {
      ...opts,
      method: 'POST',
      body: { message: 'Initialize FlowAI upgrade target from original repo', tree: newTree.body.sha },
    });
    if (commit.response.status < 200 || commit.response.status >= 300 || !commit.body?.sha) {
      return Object.freeze({ ok: false, status: 'failed', code: 'TARGET_COMMIT_CREATE_FAILED', detail: 'unable to create target commit' });
    }
    const targetRef = await githubFetch(`/repos/${encodeURIComponent(targetOwner)}/${encodeURIComponent(targetRepo)}/git/refs`, token, {
      ...opts,
      method: 'POST',
      body: { ref: 'refs/heads/main', sha: commit.body.sha },
    });
    if (targetRef.response.status >= 200 && targetRef.response.status < 300) {
      return Object.freeze({ ok: true, status: 'provisioned', copied: true, defaultBranch: 'main', sourceSha: sha, targetSha: commit.body.sha });
    }
    return Object.freeze({
      ok: false,
      status: targetRef.response.status === 401 || targetRef.response.status === 403 ? 'access_blocked' : 'failed',
      code: targetRef.response.status === 401 || targetRef.response.status === 403 ? 'ACCESS_BLOCKED' : 'TARGET_REF_CREATE_FAILED',
      detail: targetRef.body?.message ?? `Target ref create returned ${targetRef.response.status}`,
    });
  } catch (error) {
    return Object.freeze({ ok: false, status: 'failed', code: 'SOURCE_COPY_FAILED', detail: error?.message ?? String(error) });
  }
}

export async function ensureVercelProject({
  product,
  owner,
  repo,
  projectName: explicitProjectName,
  token,
  teamId,
  opts = {},
} = {}) {
  if (!token) return tokenError('vercel');
  const projectName = nonEmptyString(explicitProjectName) || repo || repoNameForProduct(product);
  const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  try {
    const existing = await vercelFetch(`/v9/projects/${encodeURIComponent(projectName)}${teamQuery}`, token, opts);
    if (existing.response.status === 200) {
      return Object.freeze({
        ok: true,
        status: 'deployed',
        projectId: existing.body?.id ?? projectName,
        projectName,
        created: false,
      });
    }
    if (existing.response.status !== 404) {
      return Object.freeze({
        ok: false,
        status: existing.response.status === 401 || existing.response.status === 403 ? 'access_blocked' : 'failed',
        code: existing.response.status === 401 || existing.response.status === 403 ? 'ACCESS_BLOCKED' : 'VERCEL_PROJECT_CHECK_FAILED',
        detail: existing.body?.error?.message ?? existing.body?.message ?? `Vercel project check returned ${existing.response.status}`,
      });
    }
    const created = await vercelFetch(`/v11/projects${teamQuery}`, token, {
      ...opts,
      method: 'POST',
      body: {
        name: projectName,
        framework: 'vite',
        gitRepository: owner && repo ? { type: 'github', repo: `${owner}/${repo}` } : undefined,
      },
    });
    if (created.response.status < 200 || created.response.status >= 300) {
      return Object.freeze({
        ok: false,
        status: created.response.status === 401 || created.response.status === 403 ? 'access_blocked' : 'failed',
        code: created.response.status === 401 || created.response.status === 403 ? 'ACCESS_BLOCKED' : 'VERCEL_PROJECT_CREATE_FAILED',
        detail: created.body?.error?.message ?? created.body?.message ?? `Vercel project create returned ${created.response.status}`,
      });
    }
    return Object.freeze({
      ok: true,
      status: 'deployed',
      projectId: created.body?.id ?? projectName,
      projectName,
      created: true,
    });
  } catch (error) {
    return Object.freeze({ ok: false, status: 'failed', code: 'VERCEL_PROVISION_FAILED', detail: error?.message ?? String(error) });
  }
}

export async function provisionDeliveryWorkspace({
  runId,
  productName,
  product = {},
  env = globalThis.process?.env ?? {},
  opts = {},
} = {}) {
  const owner = configuredGithubOwner(env);
  const ownerType = configuredGithubOwnerType(env);
  if (!owner) {
    return Object.freeze({
      ok: false,
      status: 'blocked',
      code: 'FLOWAI_DELIVERY_GITHUB_OWNER_REQUIRED',
      detail: 'FlowAI-owned GitHub organization is not configured',
    });
  }

  const requestedOwner = nonEmptyString(opts.owner || product.github_owner || product.owner);
  if (requestedOwner && requestedOwner.toLowerCase() !== owner.toLowerCase()) {
    return Object.freeze({
      ok: false,
      status: 'blocked',
      code: 'DELIVERY_OWNER_OUTSIDE_FLOWAI_ORG',
      detail: 'Delivery workspaces may only be created under the configured FlowAI-owned GitHub organization',
      requestedOwner,
      allowedOwner: owner,
    });
  }

  const repo = nonEmptyString(opts.repoName) || repoNameForWorkspace({
    productName: productName || product.name || product.product_name || product.product_id,
    runId,
  });
  const vercelToken = nonEmptyString(env.VERCEL_OPERATOR_TOKEN || env.VERCEL_TOKEN);
  const vercelOrgId = nonEmptyString(env.FLOWAI_DELIVERY_VERCEL_ORG_ID || env.VERCEL_ORG_ID || env.VERCEL_TEAM_ID);
  if (!vercelToken || !vercelOrgId) {
    return Object.freeze({
      ok: false,
      status: 'blocked',
      code: 'VERCEL_WORKSPACE_CREDENTIALS_REQUIRED',
      detail: 'FlowAI-owned Vercel team and operator token are required to create a delivery workspace',
      credentialSource: vercelToken ? 'operator_token' : null,
    });
  }

  const githubCredential = await resolveGithubWorkspaceCredential({ env, opts });
  if (!githubCredential.ok) {
    return Object.freeze(githubCredential);
  }

  const repoResult = await ensureUpgradeRepo({
    product,
    org: owner,
    repoName: repo,
    ownerType,
    token: githubCredential.token,
    opts,
  });
  if (!repoResult.ok) return Object.freeze({ ...repoResult, credentialSource: githubCredential.source });

  const projectResult = await ensureVercelProject({
    product,
    owner,
    repo,
    projectName: repo,
    token: vercelToken,
    teamId: vercelOrgId,
    opts,
  });
  if (!projectResult.ok) return Object.freeze({ ...projectResult, credentialSource: 'operator_token' });

  const workspace = {
    ok: true,
    status: 'ready',
    workspaceId: `dw_${shortRunId(runId)}_${repo}`.slice(0, 120),
    runId: nonEmptyString(runId) || null,
    inputMode: product.inputMode || null,
    github: {
      owner,
      ownerType,
      repo,
      repoUrl: repoResult.upgrade_repo_url || githubRepoUrl(owner, repo),
      created: repoResult.created === true,
      private: true,
      credentialSource: githubCredential.source,
      permissionEvidence: githubCredential.permissionEvidence || null,
    },
    vercel: {
      orgId: vercelOrgId,
      projectId: projectResult.projectId,
      projectName: projectResult.projectName,
      created: projectResult.created === true,
      credentialSource: 'operator_token',
    },
  };
  Object.defineProperty(workspace, 'credentials', {
    enumerable: false,
    configurable: false,
    value: {
      githubToken: githubCredential.token,
      vercelToken,
    },
  });
  return Object.freeze(workspace);
}

export async function provisionUpgradeTarget({ product, mode = 'auto', env = globalThis.process?.env ?? {}, opts = {} } = {}) {
  const state = normalizeUpgradeTargetState(product);
  if (mode === 'manual') {
    return Object.freeze({ ok: true, manual: true, state, steps: [], recommendation: 'operator_provisions_upgrade_target' });
  }
  return Object.freeze({
    ok: true,
    state,
    steps: [],
    recommendation: state.upgrade_repo_status === 'missing' || state.deployment_status === 'missing'
      ? 'provisioning_required'
      : 'already_provisioned',
    tokenAvailability: {
      github: Boolean(env.GITHUB_OPERATOR_TOKEN || env.GITHUB_PAT),
      vercel: Boolean(env.VERCEL_OPERATOR_TOKEN || env.VERCEL_TOKEN),
    },
  });
}

export const __internals = Object.freeze({
  repoNameForProduct,
  repoNameForWorkspace,
  githubRepoUrl,
  githubFetch,
  vercelFetch,
  validateGithubAppPermissions,
  configuredGithubOwner,
});
