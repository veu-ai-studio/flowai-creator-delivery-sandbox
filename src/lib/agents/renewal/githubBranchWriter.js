/**
 * GitHub branch writer — Self-Renewal §4.3.
 *
 * Creates a new branch on the operator's GitHub repo and commits a
 * single-file change to it using the GitHub Contents API. Uses the
 * installation access token minted by `githubApp.js` (Self-Renewal §3.2).
 *
 * Phase A scope: ONE file change per call (`MAX_FILES = 1` per spec
 * §4.3). Multi-file commits via the Git Data API tree/blob/commit chain
 * are deferred to Phase B.
 *
 * Sequence (4 GitHub API calls):
 *   1. GET  /repos/{owner}/{repo}/git/ref/heads/{baseBranch}
 *      → resolve base branch SHA
 *   2. POST /repos/{owner}/{repo}/git/refs
 *      → create the new branch pointing at the base SHA
 *   3. GET  /repos/{owner}/{repo}/contents/{filePath}?ref={branchName}
 *      → fetch current file SHA (required for PUT update)
 *   4. PUT  /repos/{owner}/{repo}/contents/{filePath}
 *      → commit the new content on the new branch
 *
 * Error mapping:
 *   - Branch already exists → throws Error with code 'BRANCH_EXISTS'
 *   - File not found on base → throws Error with code 'FILE_NOT_FOUND'
 *   - 401 or 403 on any call → throws Error with code 'GITHUB_AUTH_FAILED'
 *   - Other failures → throws Error with code 'GITHUB_API_ERROR' + status
 *
 * The installation token is NEVER logged. All error messages exclude it.
 */

'use strict';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';
const FLOWAI_COMMITTER = Object.freeze({
  name: 'FlowAI Self-Renewal',
  email: 'self-renewal@flowai.local',
});

/**
 * Translate an HTTP status code into a sentinel error code. Per spec
 * §2's enforcement column, 401/403 always map to GITHUB_AUTH_FAILED so
 * the caller doesn't have to disambiguate.
 *
 * @param {number} status
 * @param {string} fallback
 * @returns {string}
 */
function classifyStatus(status, fallback) {
  if (status === 401 || status === 403) return 'GITHUB_AUTH_FAILED';
  return fallback;
}

/**
 * Build a code-tagged Error.
 *
 * @param {string} code
 * @param {string} message
 * @param {object} [extra]
 * @returns {Error}
 */
function makeError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  for (const [k, v] of Object.entries(extra)) {
    if (k !== 'token' && k !== 'authorization') {
      err[k] = v;
    }
  }
  return err;
}

function sanitizedGithubDetails(response = {}) {
  const body = response.body;
  const githubMessage = typeof body?.message === 'string' ? body.message : null;
  const githubErrors = Array.isArray(body?.errors) ? body.errors : null;
  return {
    status: response.status,
    statusText: response.statusText,
    ...(githubMessage ? { githubMessage } : {}),
    ...(githubErrors ? { githubErrors } : {}),
  };
}

/**
 * Call the GitHub API with the installation token. Centralised so the
 * Authorization header is built in exactly one place and the token can
 * never leak into URL strings, error metadata, or logs.
 *
 * @param {string} method
 * @param {string} pathAndQuery
 * @param {string} token
 * @param {object} [opts]
 * @returns {Promise<{ status: number, statusText: string, body: any, raw: string }>}
 */
async function callGitHub(method, pathAndQuery, token, opts = {}) {
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw makeError('GITHUB_API_ERROR',
      'githubBranchWriter: fetch is not available on globalThis and no opts.fetch was provided. Node 18+ required.');
  }
  const url = `${GITHUB_API_BASE}${pathAndQuery}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  };
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw makeError('GITHUB_API_ERROR',
      `githubBranchWriter: network error on ${method} ${pathAndQuery} — ${e?.message ?? String(e)}`);
  }
  const raw = await response.text();
  let body = null;
  if (raw && raw.length > 0) {
    try { body = JSON.parse(raw); } catch { body = raw; }
  }
  return { status: response.status, statusText: response.statusText, body, raw };
}

/**
 * Resolve the SHA of a branch's HEAD.
 */
async function getBranchSha(owner, repo, branch, token, opts) {
  const enc = (s) => encodeURIComponent(s);
  const res = await callGitHub(
    'GET',
    `/repos/${enc(owner)}/${enc(repo)}/git/ref/heads/${enc(branch)}`,
    token,
    opts,
  );
  if (res.status === 200) {
    const sha = res.body?.object?.sha;
    if (typeof sha !== 'string' || !sha) {
      throw makeError('GITHUB_API_ERROR',
        `githubBranchWriter: GET ref returned 200 but body lacks object.sha — branch="${branch}"`);
    }
    return sha;
  }
  if (res.status === 404) {
    throw makeError('FILE_NOT_FOUND',
      `githubBranchWriter: base branch "${branch}" not found in ${owner}/${repo}`);
  }
  throw makeError(
    classifyStatus(res.status, 'GITHUB_API_ERROR'),
    `githubBranchWriter: GET ref ${res.status} ${res.statusText} for ${owner}/${repo}@${branch}`,
    sanitizedGithubDetails(res),
  );
}

/**
 * Create a branch pointing at a given commit SHA.
 */
async function createBranch(owner, repo, branchName, sha, token, opts) {
  const enc = (s) => encodeURIComponent(s);
  const res = await callGitHub(
    'POST',
    `/repos/${enc(owner)}/${enc(repo)}/git/refs`,
    token,
    { ...opts, body: { ref: `refs/heads/${branchName}`, sha } },
  );
  if (res.status === 201) return true;
  if (res.status === 422) {
    // GitHub returns 422 with message "Reference already exists" when
    // the branch ref is duplicated. The message is the only reliable
    // signal — the status alone (422) is shared with other validation
    // failures.
    const msg = res.body?.message ?? '';
    if (/already exists/i.test(msg)) {
      throw makeError('BRANCH_EXISTS',
        `githubBranchWriter: branch "${branchName}" already exists on ${owner}/${repo}`);
    }
    throw makeError('GITHUB_API_ERROR',
      `githubBranchWriter: POST git/refs 422 — ${msg || 'unprocessable entity'}`,
      sanitizedGithubDetails(res));
  }
  throw makeError(
    classifyStatus(res.status, 'GITHUB_API_ERROR'),
    `githubBranchWriter: POST git/refs ${res.status} ${res.statusText} for ${owner}/${repo} branch="${branchName}"`,
    sanitizedGithubDetails(res),
  );
}

/**
 * Fetch the file SHA at a given path on a given ref. Required for the
 * subsequent PUT (Contents API updates require the prior SHA so it can
 * detect concurrent edits).
 */
async function getFileSha(owner, repo, filePath, ref, token, opts) {
  const enc = (s) => encodeURIComponent(s);
  // Path components within filePath must be encoded individually so '/'
  // separators survive — encodeURI does that correctly.
  const encodedPath = filePath.split('/').map(enc).join('/');
  const res = await callGitHub(
    'GET',
    `/repos/${enc(owner)}/${enc(repo)}/contents/${encodedPath}?ref=${enc(ref)}`,
    token,
    opts,
  );
  if (res.status === 200) {
    // The response can be a single object (file) or an array (directory).
    if (Array.isArray(res.body)) {
      throw makeError('FILE_NOT_FOUND',
        `githubBranchWriter: path "${filePath}" is a directory, not a file, on ${owner}/${repo}@${ref}`);
    }
    const sha = res.body?.sha;
    if (typeof sha !== 'string' || !sha) {
      throw makeError('GITHUB_API_ERROR',
        `githubBranchWriter: GET contents returned 200 but body lacks sha for "${filePath}"`);
    }
    return sha;
  }
  if (res.status === 404) {
    throw makeError('FILE_NOT_FOUND',
      `githubBranchWriter: file "${filePath}" not found on ${owner}/${repo}@${ref}`);
  }
  throw makeError(
    classifyStatus(res.status, 'GITHUB_API_ERROR'),
    `githubBranchWriter: GET contents ${res.status} ${res.statusText} for "${filePath}"`,
    sanitizedGithubDetails(res),
  );
}

/**
 * Commit new file content on the given branch via the Contents API.
 */
async function putFileContent(owner, repo, filePath, branch, content, sha, message, token, opts) {
  const enc = (s) => encodeURIComponent(s);
  const encodedPath = filePath.split('/').map(enc).join('/');
  const contentB64 = Buffer.from(content, 'utf8').toString('base64');
  const res = await callGitHub(
    'PUT',
    `/repos/${enc(owner)}/${enc(repo)}/contents/${encodedPath}`,
    token,
    {
      ...opts,
      body: {
        message,
        content: contentB64,
        sha,
        branch,
        committer: FLOWAI_COMMITTER,
        author: FLOWAI_COMMITTER,
      },
    },
  );
  if (res.status === 200 || res.status === 201) {
    const commitSha = res.body?.commit?.sha;
    if (typeof commitSha !== 'string' || !commitSha) {
      throw makeError('GITHUB_API_ERROR',
        `githubBranchWriter: PUT contents returned ${res.status} but body lacks commit.sha`);
    }
    return commitSha;
  }
  if (res.status === 409) {
    // Sha mismatch — someone (or something) committed to the branch
    // between our GET sha and our PUT. Surface as a distinct error so
    // the caller can retry the whole sequence if it wants to.
    throw makeError('FILE_SHA_CONFLICT',
      `githubBranchWriter: PUT contents 409 — file SHA changed between read and write on "${filePath}"`);
  }
  throw makeError(
    classifyStatus(res.status, 'GITHUB_API_ERROR'),
    `githubBranchWriter: PUT contents ${res.status} ${res.statusText} for "${filePath}"`,
    sanitizedGithubDetails(res),
  );
}

/**
 * Create a renewal branch on the operator's GitHub repo and commit a
 * single-file change.
 *
 * @param {object} args
 * @param {string} args.owner          — e.g. 'veu-ai-studio'
 * @param {string} args.repo           — e.g. 'my-preg-life'
 * @param {string} args.baseBranch     — e.g. 'main'
 * @param {string} args.branchName     — e.g. 'flowai/renewal-<runId>'
 * @param {string} args.filePath       — e.g. 'src/components/Home.jsx'
 * @param {string} args.fileContent    — new file content (UTF-8)
 * @param {string} args.commitMessage
 * @param {string} args.token          — installation access token from githubApp.js
 * @param {object} [args.opts]         — { fetch? } overridable for tests
 *
 * @returns {Promise<{ branchName: string, commitSha: string, branchUrl: string }>}
 */
export async function createRenewalBranch(args) {
  if (!args || typeof args !== 'object') {
    throw makeError('GITHUB_API_ERROR', 'createRenewalBranch: args object required');
  }
  const required = ['owner', 'repo', 'baseBranch', 'branchName', 'filePath', 'fileContent', 'commitMessage', 'token'];
  for (const k of required) {
    if (typeof args[k] !== 'string' || args[k].length === 0) {
      throw makeError('GITHUB_API_ERROR',
        `createRenewalBranch: ${k} must be a non-empty string`);
    }
  }
  // Reject obviously malformed branch names early.
  if (!/^[A-Za-z0-9/_.-]+$/.test(args.branchName)) {
    throw makeError('GITHUB_API_ERROR',
      `createRenewalBranch: branchName "${args.branchName}" contains characters outside [A-Za-z0-9/_.-]`);
  }

  const { owner, repo, baseBranch, branchName, filePath, fileContent, commitMessage, token } = args;
  const opts = args.opts ?? {};

  // 1. Resolve base SHA.
  const baseSha = await getBranchSha(owner, repo, baseBranch, token, opts);

  // 2. Create the new branch from the base SHA.
  await createBranch(owner, repo, branchName, baseSha, token, opts);

  // 3. Fetch the file's current SHA on the new branch (which is a
  //    snapshot of base at this moment).
  const fileSha = await getFileSha(owner, repo, filePath, branchName, token, opts);

  // 4. Commit the new content on the branch.
  const commitSha = await putFileContent(
    owner, repo, filePath, branchName, fileContent, fileSha, commitMessage, token, opts,
  );

  return {
    branchName,
    commitSha,
    branchUrl: `https://github.com/${owner}/${repo}/tree/${branchName}`,
  };
}

/**
 * Commit a single file to an EXISTING branch. Used by the orchestrator's
 * multi-file commit path: `createRenewalBranch` creates the branch + commits
 * the first file; `commitFileToBranch` commits each subsequent file to the
 * same branch.
 *
 * Sequence (2 GitHub API calls):
 *   1. GET  /repos/{owner}/{repo}/contents/{filePath}?ref={branchName}
 *      → fetch current file SHA on the existing branch
 *   2. PUT  /repos/{owner}/{repo}/contents/{filePath}
 *      → commit the new content with `branch: branchName`
 *
 * Error mapping mirrors createRenewalBranch:
 *   - 404 from GET contents → FILE_NOT_FOUND
 *   - 401 / 403 anywhere → GITHUB_AUTH_FAILED
 *   - 409 from PUT contents → FILE_SHA_CONFLICT (concurrent edit)
 *   - Other failures → GITHUB_API_ERROR + status
 *
 * @param {object} args
 * @param {string} args.owner
 * @param {string} args.repo
 * @param {string} args.branchName     — must already exist
 * @param {string} args.filePath
 * @param {string} args.fileContent    — new UTF-8 content
 * @param {string} args.commitMessage
 * @param {string} args.token          — installation access token
 * @param {object} [args.opts]         — { fetch? }
 *
 * @returns {Promise<{ branchName: string, commitSha: string, filePath: string }>}
 */
export async function commitFileToBranch(args) {
  if (!args || typeof args !== 'object') {
    throw makeError('GITHUB_API_ERROR', 'commitFileToBranch: args object required');
  }
  const required = ['owner', 'repo', 'branchName', 'filePath', 'fileContent', 'commitMessage', 'token'];
  for (const k of required) {
    if (typeof args[k] !== 'string' || args[k].length === 0) {
      throw makeError('GITHUB_API_ERROR',
        `commitFileToBranch: ${k} must be a non-empty string`);
    }
  }

  const { owner, repo, branchName, filePath, fileContent, commitMessage, token } = args;
  const opts = args.opts ?? {};

  // 1. Fetch the file's current SHA on the existing branch.
  const fileSha = await getFileSha(owner, repo, filePath, branchName, token, opts);

  // 2. Commit the new content on the same branch.
  const commitSha = await putFileContent(
    owner, repo, filePath, branchName, fileContent, fileSha, commitMessage, token, opts,
  );

  return { branchName, commitSha, filePath };
}

export const __internals = Object.freeze({
  GITHUB_API_BASE,
  GITHUB_API_VERSION,
  FLOWAI_COMMITTER,
  classifyStatus,
  makeError,
  sanitizedGithubDetails,
  callGitHub,
  getBranchSha,
  createBranch,
  getFileSha,
  putFileContent,
});
