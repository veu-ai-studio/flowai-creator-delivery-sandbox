/**
 * GitHub PR writer — Self-Renewal §6.
 *
 * Opens a pull request on the operator's repo for a renewal branch.
 * The PR is opened in NON-DRAFT state per the dispatch (Phase A) so
 * human reviewers can act on it immediately. FlowAI NEVER merges
 * autonomously — this module deliberately has no code path that
 * references the merge endpoint.
 *
 * HARD INVARIANT (spec §2 + §6):
 *   This module MUST NEVER call PUT /repos/{owner}/{repo}/pulls/{N}/merge.
 *   The string "/merge" does not appear in any code path of this file.
 *   The test suite asserts this at static-grep + runtime levels.
 *
 * Error mapping:
 *   - 401 / 403         → GITHUB_AUTH_FAILED
 *   - 422 "already exists" → returns the existing PR (idempotent semantic)
 *   - 422 other / 404   → BRANCH_NOT_FOUND
 *   - Other failures    → GITHUB_API_ERROR + status
 *
 * Token never logged. Same posture as githubApp.js + githubBranchWriter.js.
 */

'use strict';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

function classifyStatus(status, fallback) {
  if (status === 401 || status === 403) return 'GITHUB_AUTH_FAILED';
  return fallback;
}

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

async function callGitHub(method, pathAndQuery, token, opts = {}) {
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw makeError('GITHUB_API_ERROR',
      'githubPrWriter: fetch is not available on globalThis and no opts.fetch was provided. Node 18+ required.');
  }
  const url = `${GITHUB_API_BASE}${pathAndQuery}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw makeError('GITHUB_API_ERROR',
      `githubPrWriter: network error on ${method} ${pathAndQuery} — ${e?.message ?? String(e)}`);
  }
  const raw = await response.text();
  let body = null;
  if (raw && raw.length > 0) {
    try { body = JSON.parse(raw); } catch { body = raw; }
  }
  return { status: response.status, statusText: response.statusText, body };
}

/**
 * Build a normalized return shape from a GitHub PR object.
 */
function shapePrReturn(pr) {
  if (!pr || typeof pr !== 'object') return null;
  if (typeof pr.number !== 'number') return null;
  return {
    prNumber: pr.number,
    prUrl: pr.url,          // API URL (https://api.github.com/repos/...)
    prHtmlUrl: pr.html_url, // human-readable (https://github.com/...)
  };
}

/**
 * Find an existing open PR for a given head branch. Used when the
 * initial create call returns 422 "already exists" — we GET the
 * existing PR so the caller can be idempotent (same input → same
 * observable output).
 *
 * GitHub's list-pulls endpoint accepts `head` in the form `owner:branch`.
 */
async function findExistingPr(owner, repo, branchName, token, opts) {
  const enc = (s) => encodeURIComponent(s);
  const head = `${owner}:${branchName}`;
  const res = await callGitHub(
    'GET',
    `/repos/${enc(owner)}/${enc(repo)}/pulls?head=${enc(head)}&state=open`,
    token,
    opts,
  );
  if (res.status === 200 && Array.isArray(res.body) && res.body.length > 0) {
    return shapePrReturn(res.body[0]);
  }
  // 200 with empty array, or non-200 — caller surfaces this as
  // BRANCH_NOT_FOUND or GITHUB_API_ERROR depending on context.
  return null;
}

/**
 * Open a pull request for a Self-Renewal branch.
 *
 * @param {object} args
 * @param {string} args.owner       — e.g. 'veu-ai-studio'
 * @param {string} args.repo        — e.g. 'my-preg-life'
 * @param {string} args.branchName  — 'flowai/renewal-<runId>'
 * @param {string} args.baseBranch  — 'main'
 * @param {string} args.title       — PR title
 * @param {string} args.body        — PR body (markdown)
 * @param {string} args.token       — installation access token
 * @param {object} [args.opts]      — { fetch? }
 *
 * @returns {Promise<{ prNumber: number, prUrl: string, prHtmlUrl: string, existing?: boolean }>}
 */
export async function createRenewalPr(args) {
  if (!args || typeof args !== 'object') {
    throw makeError('GITHUB_API_ERROR', 'createRenewalPr: args object required');
  }
  const required = ['owner', 'repo', 'branchName', 'baseBranch', 'title', 'body', 'token'];
  for (const k of required) {
    if (typeof args[k] !== 'string' || args[k].length === 0) {
      throw makeError('GITHUB_API_ERROR',
        `createRenewalPr: ${k} must be a non-empty string`);
    }
  }

  const { owner, repo, branchName, baseBranch, title, body, token } = args;
  const opts = args.opts ?? {};
  const enc = (s) => encodeURIComponent(s);

  const res = await callGitHub(
    'POST',
    `/repos/${enc(owner)}/${enc(repo)}/pulls`,
    token,
    {
      ...opts,
      body: {
        head: branchName,
        base: baseBranch,
        title,
        body,
        draft: false,
        // No `maintainer_can_modify` — leave to GitHub default (true for
        // App-created PRs in installation-token mode).
      },
    },
  );

  if (res.status === 201) {
    const shaped = shapePrReturn(res.body);
    if (!shaped) {
      throw makeError('GITHUB_API_ERROR',
        'createRenewalPr: GitHub returned 201 but body lacks pr number/url shape');
    }
    return { ...shaped, existing: false };
  }

  if (res.status === 422) {
    const msg = String(res.body?.errors?.[0]?.message ?? res.body?.message ?? '');
    if (/already exists/i.test(msg)) {
      // Idempotent path — fetch the existing PR and return it.
      const existing = await findExistingPr(owner, repo, branchName, token, opts);
      if (existing) return { ...existing, existing: true };
      // Edge case: 422 "already exists" but our follow-up GET returned
      // nothing. Surface a distinct error so the caller can investigate.
      throw makeError('GITHUB_API_ERROR',
        `createRenewalPr: 422 "already exists" but no open PR found for head=${owner}:${branchName} — possible closed-PR conflict`);
    }
    // 422 other (e.g. validation: head branch doesn't exist, base
    // branch doesn't exist, repository disabled).
    throw makeError('BRANCH_NOT_FOUND',
      `createRenewalPr: 422 validation — ${msg || 'unprocessable entity'}. Verify head="${branchName}" exists on ${owner}/${repo}.`,
      { status: 422 });
  }

  if (res.status === 404) {
    throw makeError('BRANCH_NOT_FOUND',
      `createRenewalPr: 404 — ${owner}/${repo} or branch "${branchName}" not found`);
  }

  throw makeError(
    classifyStatus(res.status, 'GITHUB_API_ERROR'),
    `createRenewalPr: POST pulls ${res.status} ${res.statusText} for ${owner}/${repo}`,
    { status: res.status },
  );
}

export const __internals = Object.freeze({
  GITHUB_API_BASE,
  GITHUB_API_VERSION,
  classifyStatus,
  makeError,
  callGitHub,
  shapePrReturn,
  findExistingPr,
});
