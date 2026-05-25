const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';
const FLOWAI_COMMITTER = Object.freeze({
  name: 'FlowAI Migration Mode',
  email: 'migration@flowai.local',
});

function makeError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  for (const [key, value] of Object.entries(extra)) {
    if (!/token|authorization|secret/i.test(key)) {
      error[key] = value;
    }
  }
  return error;
}

function sanitizedGithubErrorDetails(response) {
  return {
    status: response.status,
    statusText: response.statusText || '',
    githubMessage: typeof response.body?.message === 'string' ? response.body.message : null,
    githubErrors: Array.isArray(response.body?.errors) ? response.body.errors : null,
  };
}

function encodePath(filePath) {
  return String(filePath || '').split('/').map((part) => encodeURIComponent(part)).join('/');
}

function parseGithubRepoUrl(repoUrl) {
  if (typeof repoUrl !== 'string' || !repoUrl.trim()) return null;
  const match = repoUrl.match(/github\.com[:/]+([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function normalizeProductSlug(value) {
  return String(value || 'product')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

function createBranchName({ productName, runId, now = Date.now() } = {}) {
  const shortRunId = String(runId || Math.random().toString(36).slice(2))
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8) || 'run';
  return `flowai/migration-${normalizeProductSlug(productName)}-${now}-${shortRunId}`;
}

function validateRepoRelativePath(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized !== filePath.replace(/\\/g, '/')) {
    throw makeError('MIGRATION_PATH_REJECTED', 'Migration file path must be repo-relative');
  }
  if (/^[A-Za-z]:\//.test(normalized)) {
    throw makeError('MIGRATION_PATH_REJECTED', 'Migration file path must be repo-relative');
  }
  if (normalized.startsWith('../') || normalized.includes('/../') || normalized === '..') {
    throw makeError('MIGRATION_PATH_REJECTED', 'Migration file path cannot traverse outside the repo');
  }
  const lower = normalized.toLowerCase();
  if (lower === '.git' || lower.startsWith('.git/') || lower.includes('/.git/')) {
    throw makeError('MIGRATION_PATH_REJECTED', 'Migration file path cannot target .git');
  }
  if (lower === 'node_modules' || lower.startsWith('node_modules/') || lower.includes('/node_modules/')) {
    throw makeError('MIGRATION_PATH_REJECTED', 'Migration file path cannot target node_modules');
  }
  return normalized;
}

async function callGitHub({ method, pathAndQuery, token, body, fetchImpl = globalThis.fetch }) {
  if (typeof fetchImpl !== 'function') {
    throw makeError('GITHUB_API_ERROR', 'GitHub API fetch is unavailable');
  }
  const response = await fetchImpl(`${GITHUB_API_BASE}${pathAndQuery}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let parsed = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }
  if (response.status === 401 || response.status === 403) {
    throw makeError('GITHUB_AUTH_REQUIRED', `GitHub API authorization failed (${response.status})`, { status: response.status });
  }
  return { status: response.status, statusText: response.statusText, body: parsed };
}

async function getDefaultBranch({ owner, repo, token, fetchImpl }) {
  const response = await callGitHub({
    method: 'GET',
    pathAndQuery: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    token,
    fetchImpl,
  });
  if (response.status !== 200) {
    throw makeError('GITHUB_API_ERROR', `Unable to read repo metadata for ${owner}/${repo}`, { status: response.status });
  }
  return response.body?.default_branch || 'main';
}

async function getBranchSha({ owner, repo, branch, token, fetchImpl }) {
  const response = await callGitHub({
    method: 'GET',
    pathAndQuery: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`,
    token,
    fetchImpl,
  });
  if (response.status !== 200 || !response.body?.object?.sha) {
    throw makeError('GITHUB_API_ERROR', `Unable to read branch ${owner}/${repo}@${branch}`, { status: response.status });
  }
  return response.body.object.sha;
}

async function createMigrationBranch({ owner, repo, baseBranch, branchName, token, fetchImpl }) {
  const sha = await getBranchSha({ owner, repo, branch: baseBranch, token, fetchImpl });
  const response = await callGitHub({
    method: 'POST',
    pathAndQuery: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
    token,
    fetchImpl,
    body: { ref: `refs/heads/${branchName}`, sha },
  });
  if (response.status === 201) return { branchName, baseSha: sha };
  if (response.status === 422 && /already exists/i.test(String(response.body?.message || ''))) {
    return { branchName, baseSha: sha, alreadyExists: true };
  }
  throw makeError('GITHUB_API_ERROR', `Unable to create migration branch ${owner}/${repo}@${branchName}`, {
    status: response.status,
  });
}

async function listTreeFiles({ owner, repo, ref, token, fetchImpl }) {
  const response = await callGitHub({
    method: 'GET',
    pathAndQuery: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    token,
    fetchImpl,
  });
  if (response.status !== 200 || !Array.isArray(response.body?.tree)) {
    throw makeError('GITHUB_API_ERROR', `Unable to list tree for ${owner}/${repo}@${ref}`, { status: response.status });
  }
  const files = [];
  for (const entry of response.body.tree) {
    if (entry?.type !== 'blob' || typeof entry.path !== 'string') continue;
    try {
      files.push({ file: validateRepoRelativePath(entry.path) });
    } catch {
      // Trees API can include generated/vendor paths. They are not valid
      // migration write targets, so omit them from the migration scan.
    }
  }
  return files;
}

async function readContentFile({ owner, repo, filePath, ref, token, fetchImpl }) {
  const safePath = validateRepoRelativePath(filePath);
  const response = await callGitHub({
    method: 'GET',
    pathAndQuery: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(safePath)}?ref=${encodeURIComponent(ref)}`,
    token,
    fetchImpl,
  });
  if (response.status !== 200 || Array.isArray(response.body) || typeof response.body?.content !== 'string') {
    throw makeError('GITHUB_API_ERROR', `Unable to read ${safePath} from ${owner}/${repo}@${ref}`, { status: response.status });
  }
  return {
    content: Buffer.from(response.body.content, 'base64').toString('utf8'),
    sha: response.body.sha,
  };
}

async function writeContentFile({ owner, repo, filePath, branchName, content, token, fetchImpl, message, sha }) {
  const safePath = validateRepoRelativePath(filePath);
  const currentSha = sha || (await readContentFile({
    owner, repo, filePath: safePath, ref: branchName, token, fetchImpl,
  })).sha;
  const response = await callGitHub({
    method: 'PUT',
    pathAndQuery: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(safePath)}`,
    token,
    fetchImpl,
    body: {
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      sha: currentSha,
      branch: branchName,
      committer: FLOWAI_COMMITTER,
      author: FLOWAI_COMMITTER,
    },
  });
  if (response.status !== 200 && response.status !== 201) {
    throw makeError('GITHUB_API_ERROR', `Unable to write ${safePath} to ${owner}/${repo}@${branchName}`, {
      ...sanitizedGithubErrorDetails(response),
    });
  }
  return response.body?.commit?.sha || null;
}

function blockedVerification(reason) {
  return async () => ({
    ok: false,
    output: reason,
    reason,
    degraded: true,
  });
}

export async function createGithubMigrationHooks({
  sourceRepoUrl,
  targetRepoUrl,
  productName,
  runId,
  token,
  fetchImpl = globalThis.fetch,
  now = Date.now,
} = {}) {
  if (!token) {
    return {
      ok: false,
      message: 'GITHUB_AUTH_REQUIRED',
      blockers: [{
        field: 'github',
        reason: 'GITHUB_AUTH_REQUIRED',
        message: 'GITHUB_OPERATOR_TOKEN is required for GitHub-backed Migration Mode',
      }],
    };
  }

  const sourceRepo = parseGithubRepoUrl(sourceRepoUrl);
  const targetRepo = parseGithubRepoUrl(targetRepoUrl);
  if (!sourceRepo || !targetRepo) {
    return {
      ok: false,
      message: 'MIGRATION_CONFIGURATION_REQUIRED',
      blockers: [{
        field: !sourceRepo ? 'sourceRepoPath' : 'targetRepoPath',
        reason: 'BAD_REPO_URL',
        message: 'Migration Mode requires GitHub source and target repo URLs',
      }],
    };
  }

  const baseBranch = await getDefaultBranch({ ...targetRepo, token, fetchImpl });
  const branchName = createBranchName({ productName, runId, now: now() });
  await createMigrationBranch({ ...targetRepo, baseBranch, branchName, token, fetchImpl });
  const snapshots = new Map();

  const deps = {
    sourceRepoPath: `github://${sourceRepo.owner}/${sourceRepo.repo}`,
    targetRepoPath: `github://${targetRepo.owner}/${targetRepo.repo}/${branchName}`,
    sourceRepoUrl,
    targetRepoUrl,
    sourceRepo,
    targetRepo,
    migrationBranch: branchName,
    targetRepoFullName: `${targetRepo.owner}/${targetRepo.repo}`,
    branchUrl: `https://github.com/${targetRepo.owner}/${targetRepo.repo}/tree/${branchName}`,
    scanFiles: () => listTreeFiles({ ...targetRepo, ref: branchName, token, fetchImpl }),
    readFile: async (filePath) => (await readContentFile({
      ...targetRepo,
      filePath,
      ref: branchName,
      token,
      fetchImpl,
    })).content,
    writeFile: async (filePath, content) => {
      const safePath = validateRepoRelativePath(filePath);
      let snapshot = snapshots.get(safePath);
      if (!snapshots.has(safePath)) {
        snapshot = await readContentFile({
          ...targetRepo,
          filePath: safePath,
          ref: branchName,
          token,
          fetchImpl,
        });
        snapshots.set(safePath, snapshot);
      }
      return writeContentFile({
        ...targetRepo,
        filePath: safePath,
        branchName,
        content,
        token,
        fetchImpl,
        message: `FlowAI Migration update: ${safePath}`,
        sha: snapshot.sha,
      });
    },
    restoreFile: async (filePath) => {
      const safePath = validateRepoRelativePath(filePath);
      const snapshot = snapshots.get(safePath);
      if (!snapshot) {
        throw makeError('MIGRATION_RESTORE_UNAVAILABLE', `No migration snapshot captured for ${safePath}`);
      }
      return writeContentFile({
        ...targetRepo,
        filePath: safePath,
        branchName,
        content: snapshot.content,
        sha: (await readContentFile({ ...targetRepo, filePath: safePath, ref: branchName, token, fetchImpl })).sha,
        token,
        fetchImpl,
        message: `FlowAI Migration restore: ${safePath}`,
      });
    },
    verifyBuild: blockedVerification('GITHUB_ACTIONS_CHECK_NOT_WIRED'),
    verifyLint: blockedVerification('GITHUB_ACTIONS_CHECK_NOT_WIRED'),
    runFocusedTests: async () => ({
      ok: false,
      passed: 0,
      output: 'GITHUB_ACTIONS_CHECK_NOT_WIRED',
      reason: 'GITHUB_ACTIONS_CHECK_NOT_WIRED',
      degraded: true,
    }),
  };

  return { ok: true, deps };
}

export const __githubMigrationHooksInternals = Object.freeze({
  parseGithubRepoUrl,
  createBranchName,
  validateRepoRelativePath,
  callGitHub,
  getDefaultBranch,
  getBranchSha,
  createMigrationBranch,
  listTreeFiles,
  readContentFile,
  writeContentFile,
  sanitizedGithubErrorDetails,
});
