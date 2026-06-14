import { validateGeneratedCodebase } from './codebaseGenerator.js';
import { deployBranchPreview } from '../agents/renewal/vercelBranchDeploy.js';

const GITHUB_API_BASE = 'https://api.github.com';
const MAIN_BRANCHES = new Set(['main', 'master']);
export const PREVIEW_ACCESS_STATUS = Object.freeze({
  BROWSER_CLEAR: 'PREVIEW_BROWSER_CLEAR',
  AUTH_REQUIRED: 'PREVIEW_AUTH_REQUIRED',
  NOT_BROWSER_CLEAR: 'PREVIEW_NOT_BROWSER_CLEAR',
  UNKNOWN: 'PREVIEW_ACCESS_UNKNOWN',
});

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = nonEmptyString(value);
    if (text) return text;
  }
  return '';
}

function safeSlug(value, fallback = 'fresh-build') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || fallback;
}

function envSuffix(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function productEnvSuffixes(...values) {
  const suffixes = [];
  const add = (value) => {
    const suffix = envSuffix(value);
    if (suffix && !suffixes.includes(suffix)) suffixes.push(suffix);
    const withoutVersion = suffix.replace(/_V\d+$/i, '');
    if (withoutVersion && withoutVersion !== suffix && !suffixes.includes(withoutVersion)) {
      suffixes.push(withoutVersion);
    }
  };
  values.forEach(add);
  return suffixes;
}

function firstProductEnv(env, prefix, suffixes) {
  for (const suffix of suffixes) {
    const value = firstNonEmpty(env?.[`${prefix}${suffix}`]);
    if (value) return value;
  }
  return '';
}

export function resolveGitHubWriteTokenCandidates(env = {}) {
  const candidates = [
    { source: 'GITHUB_OPERATOR_TOKEN', token: env?.GITHUB_OPERATOR_TOKEN },
    { source: 'GITHUB_PAT', token: env?.GITHUB_PAT },
    { source: 'GITHUB_TOKEN', token: env?.GITHUB_TOKEN },
  ];
  const seen = new Set();
  return candidates
    .map((candidate) => ({
      source: candidate.source,
      token: firstNonEmpty(candidate.token),
    }))
    .filter((candidate) => {
      if (!candidate.token || seen.has(candidate.token)) return false;
      seen.add(candidate.token);
      return true;
    });
}

function githubWriteFailureResult(error, credentialSource = null) {
  const code = error?.code || 'GITHUB_WRITE_FAILED';
  const githubDetail = firstNonEmpty(error?.githubError);
  const message = `${String(error?.message || 'Fresh Build GitHub write failed')}${githubDetail ? `: ${githubDetail}` : ''}`.slice(0, 400);
  return {
    ok: false,
    status: 'WRITE_FAILED',
    reason: code,
    message,
    previewUrl: null,
    filesWritten: 0,
    failureStage: 'deployment_adapter',
    credentialSource,
    failure: {
      stage: 'deployment_adapter',
      code,
      message,
      githubStatus: Number.isFinite(error?.status) ? error.status : null,
      githubError: githubDetail || null,
      credentialSource,
      deploymentId: null,
      readyState: null,
      attempts: null,
    },
  };
}

export function parseGitHubRepoUrl(value) {
  const text = nonEmptyString(value).replace(/\.git$/i, '');
  if (!text) return null;

  const sshMatch = text.match(/^git@github\.com:([^/]+)\/(.+)$/i);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

  const shorthandMatch = text.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shorthandMatch && !text.includes('://')) {
    return { owner: shorthandMatch[1], repo: shorthandMatch[2] };
  }

  try {
    const url = new URL(text);
    if (url.hostname.toLowerCase() !== 'github.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

function sameRepo(left, right) {
  const a = parseGitHubRepoUrl(left);
  const b = parseGitHubRepoUrl(right);
  if (!a || !b) return false;
  return a.owner.toLowerCase() === b.owner.toLowerCase()
    && a.repo.toLowerCase() === b.repo.toLowerCase();
}

function makeBranchName({ branchName, productName, runId, now }) {
  const explicit = nonEmptyString(branchName);
  if (explicit) return explicit;
  const stamp = now ? new Date(now).getTime() : Date.now();
  const suffix = runId ? safeSlug(runId, String(stamp)) : String(stamp);
  return `flowai/fresh-build-${safeSlug(productName)}-${suffix}`;
}

function buildBlockedResult(code, message, extra = {}) {
  return {
    ok: false,
    status: 'BLOCKED',
    reason: code,
    message,
    previewUrl: null,
    filesWritten: 0,
    ...extra,
  };
}

function githubHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 300) };
  }
}

function makeGitHubError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function normalizePreviewUrl(value) {
  const text = nonEmptyString(value);
  if (!text) return '';
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

function isVercelDeploymentUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return false;
  try {
    return /\.vercel\.app$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function resolveVercelBypassSecret(productId, env = globalThis.process?.env || {}) {
  for (const suffix of productEnvSuffixes(productId)) {
    const scoped = firstNonEmpty(env?.[`VERCEL_BYPASS_SECRET_${suffix}`]);
    if (scoped) {
      return {
        secret: scoped,
        source: `VERCEL_BYPASS_SECRET_${suffix}`,
      };
    }
  }
  const automation = firstNonEmpty(env?.VERCEL_AUTOMATION_BYPASS_SECRET);
  if (automation) {
    return {
      secret: automation,
      source: 'VERCEL_AUTOMATION_BYPASS_SECRET',
    };
  }
  return {
    secret: '',
    source: null,
  };
}

function previewProbeHeaders({ previewUrl, productId, env } = {}) {
  const headers = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'User-Agent': 'FlowAI-FreshBuild-PreviewProbe/1.0',
  };
  if (!isVercelDeploymentUrl(previewUrl)) {
    return { headers, bypassAttempted: false, bypassSource: null };
  }
  const bypass = resolveVercelBypassSecret(productId, env);
  if (!bypass.secret) {
    return { headers, bypassAttempted: false, bypassSource: null };
  }
  headers['x-vercel-protection-bypass'] = bypass.secret;
  return { headers, bypassAttempted: true, bypassSource: bypass.source };
}

function classifyPreviewResponse(response) {
  const status = Number(response?.status);
  const location = typeof response?.headers?.get === 'function'
    ? response.headers.get('location')
    : null;
  const wwwAuthenticate = typeof response?.headers?.get === 'function'
    ? response.headers.get('www-authenticate')
    : null;
  const setCookie = typeof response?.headers?.get === 'function'
    ? response.headers.get('set-cookie')
    : null;
  const server = typeof response?.headers?.get === 'function'
    ? response.headers.get('server')
    : null;
  const authSignal = [location, wwwAuthenticate, setCookie]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (status === 401 || status === 403 || authSignal.includes('vercel_sso') || authSignal.includes('/login')) {
    return PREVIEW_ACCESS_STATUS.AUTH_REQUIRED;
  }
  if (status >= 200 && status < 400) return PREVIEW_ACCESS_STATUS.BROWSER_CLEAR;
  if (status > 0) return PREVIEW_ACCESS_STATUS.NOT_BROWSER_CLEAR;
  return server ? PREVIEW_ACCESS_STATUS.NOT_BROWSER_CLEAR : PREVIEW_ACCESS_STATUS.UNKNOWN;
}

export async function probePreviewAccess({
  previewUrl,
  deploymentId = null,
  fetchImpl = globalThis.fetch,
  productId = null,
  env = globalThis.process?.env || {},
} = {}) {
  const normalizedUrl = normalizePreviewUrl(previewUrl);
  if (!normalizedUrl) {
    return {
      previewUrl: null,
      deploymentId,
      previewAccessStatus: PREVIEW_ACCESS_STATUS.NOT_BROWSER_CLEAR,
      httpStatus: null,
      reason: 'PREVIEW_URL_MISSING',
      bypassAttempted: false,
      bypassSource: null,
    };
  }
  if (typeof fetchImpl !== 'function') {
    return {
      previewUrl: normalizedUrl,
      deploymentId,
      previewAccessStatus: PREVIEW_ACCESS_STATUS.UNKNOWN,
      httpStatus: null,
      reason: 'FETCH_UNAVAILABLE',
      bypassAttempted: false,
      bypassSource: null,
    };
  }

  const probeHeaders = previewProbeHeaders({
    previewUrl: normalizedUrl,
    productId,
    env,
  });
  let response;
  try {
    response = await fetchImpl(normalizedUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: probeHeaders.headers,
    });
  } catch (error) {
    return {
      previewUrl: normalizedUrl,
      deploymentId,
      previewAccessStatus: PREVIEW_ACCESS_STATUS.NOT_BROWSER_CLEAR,
      httpStatus: null,
      reason: 'PREVIEW_PROBE_FAILED',
      message: String(error?.message ?? error).slice(0, 200),
      bypassAttempted: probeHeaders.bypassAttempted,
      bypassSource: probeHeaders.bypassSource,
    };
  }

  const previewAccessStatus = classifyPreviewResponse(response);
  return {
    previewUrl: normalizedUrl,
    deploymentId,
    previewAccessStatus,
    httpStatus: Number.isFinite(response.status) ? response.status : null,
    reason: previewAccessStatus === PREVIEW_ACCESS_STATUS.AUTH_REQUIRED
      ? 'VERCEL_AUTH_REQUIRED'
      : previewAccessStatus === PREVIEW_ACCESS_STATUS.BROWSER_CLEAR
        ? null
        : 'PREVIEW_NOT_BROWSER_CLEAR',
    bypassAttempted: probeHeaders.bypassAttempted,
    bypassSource: probeHeaders.bypassSource,
  };
}

async function githubRequest({ fetchImpl, token, method, path, body }) {
  const response = await fetchImpl(`${GITHUB_API_BASE}${path}`, {
    method,
    headers: {
      ...githubHeaders(token),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const parsed = await parseJsonResponse(response);
  if (response.status < 200 || response.status >= 300) {
    throw makeGitHubError(
      response.status === 401 || response.status === 403 ? 'GITHUB_AUTH_FAILED' : 'GITHUB_WRITE_FAILED',
      `GitHub ${method} ${path} failed with ${response.status}`,
      { status: response.status, githubError: parsed?.message || parsed?.raw || null },
    );
  }
  return parsed;
}

export function createGitHubTreeCommitClient({ token, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw makeGitHubError('GITHUB_WRITE_FAILED', 'Fresh Build deployment adapter requires fetch');
  }
  if (!nonEmptyString(token)) {
    throw makeGitHubError('GITHUB_TOKEN_REQUIRED', 'GitHub token required for Fresh Build upgrade repo write');
  }

  return {
    async createCommit({ owner, repo, baseBranch, branchName, files, message, cleanTree = false }) {
      const baseRef = await githubRequest({
        fetchImpl,
        token,
        method: 'GET',
        path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
      });
      const baseCommitSha = baseRef?.object?.sha;
      if (!baseCommitSha) throw makeGitHubError('GITHUB_WRITE_FAILED', 'Base branch ref did not include a commit sha');

      let baseTreeSha = null;
      if (!cleanTree) {
        const baseCommit = await githubRequest({
          fetchImpl,
          token,
          method: 'GET',
          path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${encodeURIComponent(baseCommitSha)}`,
        });
        baseTreeSha = baseCommit?.tree?.sha;
        if (!baseTreeSha) throw makeGitHubError('GITHUB_WRITE_FAILED', 'Base commit did not include a tree sha');
      }

      const tree = await githubRequest({
        fetchImpl,
        token,
        method: 'POST',
        path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`,
        body: {
          ...(baseTreeSha ? { base_tree: baseTreeSha } : {}),
          tree: files.map((file) => ({
            path: file.path,
            mode: '100644',
            type: 'blob',
            content: file.content,
          })),
        },
      });

      const commit = await githubRequest({
        fetchImpl,
        token,
        method: 'POST',
        path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
        body: {
          message,
          tree: tree.sha,
          parents: [baseCommitSha],
        },
      });

      await githubRequest({
        fetchImpl,
        token,
        method: 'POST',
        path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
        body: {
          ref: `refs/heads/${branchName}`,
          sha: commit.sha,
        },
      });

      return {
        commitSha: commit.sha,
        filesWritten: files.length,
        branchUrl: `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branchName)}`,
      };
    },
  };
}

function resolveVercelArgs({ productConfig, env, owner, repo, branchName, productName }) {
  const suffixes = productEnvSuffixes(productName, productConfig?.name, repo);
  return {
    projectId: firstNonEmpty(
      productConfig?.vercel_project_id,
      productConfig?.vercelProjectId,
      env?.FLOWAI_FRESH_BUILD_VERCEL_PROJECT_ID,
      firstProductEnv(env, 'VERCEL_PROJECT_ID_', suffixes),
      env?.VERCEL_PROJECT_ID,
    ),
    orgId: firstNonEmpty(
      productConfig?.vercel_org_id,
      productConfig?.vercelOrgId,
      env?.FLOWAI_FRESH_BUILD_VERCEL_ORG_ID,
      env?.VERCEL_ORG_ID,
      env?.VERCEL_TEAM_ID,
    ),
    token: firstNonEmpty(
      productConfig?.vercel_token,
      productConfig?.vercelToken,
      env?.FLOWAI_FRESH_BUILD_VERCEL_TOKEN,
      env?.VERCEL_OPERATOR_TOKEN,
      env?.VERCEL_TOKEN,
    ),
    owner,
    repo,
    branchName,
  };
}

export async function writeGeneratedCodebaseToUpgradeRepo({
  generatedCodebase,
  productConfig = {},
  productName = '',
  runId = '',
  branchName,
  env = globalThis.process?.env || {},
  now,
  githubClient,
  deployPreviewImpl = deployBranchPreview,
  probePreviewAccessImpl = probePreviewAccess,
  allowMainBranch = false,
} = {}) {
  const validation = validateGeneratedCodebase(generatedCodebase);
  if (!validation.ok) {
    return buildBlockedResult('GENERATED_CODEBASE_INVALID', 'GeneratedCodebase failed validation', {
      validationErrors: validation.errors,
    });
  }

  const upgradeRepoUrl = firstNonEmpty(
    productConfig?.upgrade_repo,
    productConfig?.upgradeRepo,
    productConfig?.github_repo_url,
  );
  if (!upgradeRepoUrl) {
    return buildBlockedResult('UPGRADE_REPO_REQUIRED', 'Fresh Build writes require an authorized upgrade_repo');
  }

  const originalRepoUrl = firstNonEmpty(productConfig?.original_repo, productConfig?.source_repo);
  if (originalRepoUrl && sameRepo(upgradeRepoUrl, originalRepoUrl)) {
    return buildBlockedResult('ORIGINAL_REPO_WRITE_BLOCKED', 'Fresh Build cannot write to the original repo');
  }

  const repoTarget = parseGitHubRepoUrl(upgradeRepoUrl);
  if (!repoTarget) {
    return buildBlockedResult('INVALID_UPGRADE_REPO', 'upgrade_repo must be a GitHub repo URL or owner/repo');
  }

  const targetBranch = makeBranchName({
    branchName,
    productName: productName || productConfig?.name || repoTarget.repo,
    runId,
    now,
  });
  if (MAIN_BRANCHES.has(targetBranch.toLowerCase()) && !allowMainBranch) {
    return buildBlockedResult('MAIN_BRANCH_WRITE_BLOCKED', 'Fresh Build cannot write to main/master without Victor approval', {
      owner: repoTarget.owner,
      repo: repoTarget.repo,
      branchName: targetBranch,
    });
  }

  const baseBranch = firstNonEmpty(productConfig?.upgrade_base_branch, productConfig?.base_branch, productConfig?.branch, 'main');
  const tokenCandidates = githubClient ? [] : resolveGitHubWriteTokenCandidates(env);
  if (!githubClient && tokenCandidates.length === 0) {
    return githubWriteFailureResult(
      makeGitHubError('GITHUB_TOKEN_REQUIRED', 'GitHub token required for Fresh Build upgrade repo write'),
      null,
    );
  }

  const clients = githubClient
    ? [{ client: githubClient, source: 'injected_github_client' }]
    : tokenCandidates.map((candidate) => ({
      client: createGitHubTreeCommitClient({ token: candidate.token }),
      source: candidate.source,
    }));
  let commitResult = null;
  let credentialSource = null;
  let lastGitHubError = null;
  for (const [index, candidate] of clients.entries()) {
    try {
      commitResult = await candidate.client.createCommit({
        owner: repoTarget.owner,
        repo: repoTarget.repo,
        baseBranch,
        branchName: targetBranch,
        files: generatedCodebase.files,
        message: `FlowAI Fresh Build output${runId ? ` (${runId})` : ''}`,
        cleanTree: true,
      });
      credentialSource = candidate.source;
      break;
    } catch (error) {
      lastGitHubError = error;
      if (error?.code === 'GITHUB_AUTH_FAILED' && index < clients.length - 1) {
        continue;
      }
      return githubWriteFailureResult(error, candidate.source);
    }
  }
  if (!commitResult) {
    return githubWriteFailureResult(lastGitHubError, credentialSource);
  }

  const vercelArgs = resolveVercelArgs({
    productConfig,
    env,
    owner: repoTarget.owner,
    repo: repoTarget.repo,
    branchName: targetBranch,
    productName: productName || productConfig?.name || repoTarget.repo,
  });
  if (!vercelArgs.projectId || !vercelArgs.orgId || !vercelArgs.token) {
    return {
      ok: false,
      status: 'WRITTEN_DEPLOY_CONFIGURATION_REQUIRED',
      reason: 'VERCEL_CONFIGURATION_REQUIRED',
      message: 'Generated codebase was written to upgrade repo branch, but Vercel preview configuration is incomplete',
      owner: repoTarget.owner,
      repo: repoTarget.repo,
      branchName: targetBranch,
      baseBranch,
      filesWritten: commitResult.filesWritten,
      commitSha: commitResult.commitSha,
      branchUrl: commitResult.branchUrl,
      previewUrl: null,
      credentialSource,
    };
  }

  let deployment;
  let previewAccess = null;
  try {
    deployment = await deployPreviewImpl(vercelArgs);
    previewAccess = await probePreviewAccessImpl({
      previewUrl: deployment?.previewUrl || null,
      deploymentId: deployment?.deploymentId || null,
      fetchImpl: globalThis.fetch,
      productId: firstNonEmpty(productConfig?.product_id, productConfig?.productId, productName, repoTarget.repo),
      env,
    });
  } catch (error) {
    return {
      ok: false,
      status: 'WRITTEN_DEPLOY_FAILED',
      reason: error?.code || 'DEPLOY_ERROR',
      message: error?.message || 'Generated codebase was written to upgrade repo branch, but Vercel deployment failed',
      owner: repoTarget.owner,
      repo: repoTarget.repo,
      branchName: targetBranch,
      baseBranch,
      filesWritten: commitResult.filesWritten,
      commitSha: commitResult.commitSha,
      branchUrl: commitResult.branchUrl,
      previewUrl: null,
      deploymentId: error?.deploymentId || null,
      previewAccessStatus: error?.previewAccessStatus || null,
      previewAccess: error?.previewAccess || null,
      credentialSource,
      failureStage: 'vercel_deploy',
      failure: {
        stage: 'vercel_deploy',
        code: error?.code || 'DEPLOY_ERROR',
        message: error?.message || 'Generated codebase was written to upgrade repo branch, but Vercel deployment failed',
        deploymentId: error?.deploymentId || null,
        readyState: error?.readyState || null,
        attempts: Number.isFinite(error?.attempts) ? error.attempts : null,
        credentialSource,
      },
    };
  }
  return {
    ok: previewAccess?.previewAccessStatus === PREVIEW_ACCESS_STATUS.BROWSER_CLEAR,
    status: previewAccess?.previewAccessStatus === PREVIEW_ACCESS_STATUS.BROWSER_CLEAR
      ? 'WRITTEN_AND_DEPLOYED'
      : 'WRITTEN_PREVIEW_NOT_BROWSER_CLEAR',
    reason: previewAccess?.previewAccessStatus === PREVIEW_ACCESS_STATUS.BROWSER_CLEAR
      ? null
      : previewAccess?.previewAccessStatus || PREVIEW_ACCESS_STATUS.UNKNOWN,
    owner: repoTarget.owner,
    repo: repoTarget.repo,
    branchName: targetBranch,
    baseBranch,
    filesWritten: commitResult.filesWritten,
    commitSha: commitResult.commitSha,
    branchUrl: commitResult.branchUrl,
    deploymentId: deployment?.deploymentId || null,
    previewUrl: deployment?.previewUrl || null,
    inspectorUrl: deployment?.inspectorUrl || null,
    previewAccessStatus: previewAccess?.previewAccessStatus || PREVIEW_ACCESS_STATUS.UNKNOWN,
    previewAccess,
    credentialSource,
  };
}

export const __test = Object.freeze({
  MAIN_BRANCHES,
  firstNonEmpty,
  sameRepo,
  makeBranchName,
  productEnvSuffixes,
  resolveVercelArgs,
  resolveGitHubWriteTokenCandidates,
  normalizePreviewUrl,
  classifyPreviewResponse,
  isVercelDeploymentUrl,
});
