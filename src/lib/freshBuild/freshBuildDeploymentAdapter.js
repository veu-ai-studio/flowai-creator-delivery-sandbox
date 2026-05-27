import { validateGeneratedCodebase } from './codebaseGenerator.js';
import { deployBranchPreview } from '../agents/renewal/vercelBranchDeploy.js';

const GITHUB_API_BASE = 'https://api.github.com';
const MAIN_BRANCHES = new Set(['main', 'master']);

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
    async createCommit({ owner, repo, baseBranch, branchName, files, message }) {
      const baseRef = await githubRequest({
        fetchImpl,
        token,
        method: 'GET',
        path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
      });
      const baseSha = baseRef?.object?.sha;
      if (!baseSha) throw makeGitHubError('GITHUB_WRITE_FAILED', 'Base branch ref did not include a commit sha');

      const blobs = [];
      for (const file of files) {
        const blob = await githubRequest({
          fetchImpl,
          token,
          method: 'POST',
          path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,
          body: {
            content: file.content,
            encoding: 'utf-8',
          },
        });
        blobs.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blob.sha,
        });
      }

      const tree = await githubRequest({
        fetchImpl,
        token,
        method: 'POST',
        path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`,
        body: {
          base_tree: baseSha,
          tree: blobs,
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
          parents: [baseSha],
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
  allowMainBranch = false,
} = {}) {
  const validation = validateGeneratedCodebase(generatedCodebase);
  if (!validation.ok) {
    return buildBlockedResult('GENERATED_CODEBASE_INVALID', 'GeneratedCodebase failed validation', {
      validationErrors: validation.errors,
    });
  }

  const upgradeRepoUrl = firstNonEmpty(productConfig?.upgrade_repo, productConfig?.upgradeRepo);
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
  const client = githubClient || createGitHubTreeCommitClient({
    token: firstNonEmpty(env?.GITHUB_OPERATOR_TOKEN, env?.GITHUB_TOKEN, env?.GITHUB_PAT),
  });
  const commitResult = await client.createCommit({
    owner: repoTarget.owner,
    repo: repoTarget.repo,
    baseBranch,
    branchName: targetBranch,
    files: generatedCodebase.files,
    message: `FlowAI Fresh Build output${runId ? ` (${runId})` : ''}`,
  });

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
    };
  }

  const deployment = await deployPreviewImpl(vercelArgs);
  return {
    ok: true,
    status: 'WRITTEN_AND_DEPLOYED',
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
  };
}

export const __test = Object.freeze({
  MAIN_BRANCHES,
  firstNonEmpty,
  sameRepo,
  makeBranchName,
  productEnvSuffixes,
  resolveVercelArgs,
});
