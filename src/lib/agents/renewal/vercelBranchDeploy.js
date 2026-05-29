/**
 * Vercel branch deploy — Self-Renewal Module 6.
 *
 * Triggers a Vercel preview deployment of a GitHub branch on an existing
 * Vercel project, then polls until the deployment reaches READY (or fails
 * with ERROR / CANCELED / timeout). Used by the renewal pipeline to
 * publish a preview URL for a branch created by `githubBranchWriter.js`
 * (Self-Renewal §4.3 / §4.4) so a human reviewer can click through the
 * change before promote.
 *
 * Vercel API:
 *   - POST  /v13/deployments?teamId={orgId}
 *           body: { name, project, gitSource: {type, org, repo, ref}, target }
 *   - GET   /v13/deployments/{deploymentId}?teamId={orgId}
 *
 * Poll cadence: every 5 s, max 60 polls (≤ 300 s total wait). The
 * 5 s × 60 = 300 s budget matches the dispatch spec and is well below
 * Vercel's typical preview-deploy turnaround (~30-120 s for a small React/
 * Vite project). The teamId query parameter is required for team-scoped
 * projects — Vercel responds 403 / 404 without it.
 *
 * Error mapping (dispatch spec):
 *   - Deploy POST fails non-2xx and not 401/403 → DEPLOY_FAILED
 *   - 401 or 403 on any call → VERCEL_AUTH_FAILED
 *   - Timeout (> 300 s waiting) → DEPLOY_TIMEOUT
 *   - readyState === 'ERROR' or 'CANCELED' → DEPLOY_ERROR (carries readyState)
 *
 * The VERCEL_TOKEN is NEVER logged. The Authorization header is built in
 * exactly one place (`callVercel`) and no error message / URL string /
 * extra-metadata bag is allowed to carry the token (mirrors the
 * githubBranchWriter `makeError` pattern).
 *
 * ESM only. Node 18+ (uses global fetch).
 */

'use strict';

const VERCEL_API_BASE = 'https://api.vercel.com';
const DEPLOY_POLL_INTERVAL_MS = 5_000;
const DEPLOY_POLL_MAX_ATTEMPTS = 60;          // 60 × 5 s = 300 s budget
const DEPLOY_POLL_TIMEOUT_MS =
  DEPLOY_POLL_INTERVAL_MS * DEPLOY_POLL_MAX_ATTEMPTS;

/**
 * Translate an HTTP status into a sentinel error code. 401 and 403 map
 * to VERCEL_AUTH_FAILED regardless of which endpoint hit them so the
 * caller doesn't have to disambiguate auth from other failure modes.
 *
 * @param {number} status
 * @param {string} fallback
 * @returns {string}
 */
function classifyStatus(status, fallback) {
  if (status === 401 || status === 403) return 'VERCEL_AUTH_FAILED';
  return fallback;
}

/**
 * Build a code-tagged Error. Token + Authorization fields are stripped
 * from `extra` before being attached so a careless caller can't leak the
 * token into error metadata.
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
    if (k === 'token' || k === 'authorization') continue;
    err[k] = v;
  }
  return err;
}

/**
 * Call the Vercel API with the bearer token. Centralised so the
 * Authorization header is built in exactly one place.
 *
 * @param {string} method
 * @param {string} pathAndQuery — must start with '/'
 * @param {string} token
 * @param {object} [opts] — { fetch?, body? }
 * @returns {Promise<{ status: number, statusText: string, body: any, raw: string }>}
 */
async function callVercel(method, pathAndQuery, token, opts = {}) {
  const fetchImpl = typeof opts.fetch === 'function' ? opts.fetch : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw makeError(
      'DEPLOY_FAILED',
      'vercelBranchDeploy: fetch is not available on globalThis and no opts.fetch was provided. Node 18+ required.',
    );
  }
  const url = `${VERCEL_API_BASE}${pathAndQuery}`;
  const headers = { Authorization: `Bearer ${token}` };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw makeError(
      'DEPLOY_FAILED',
      `vercelBranchDeploy: network error on ${method} ${pathAndQuery} — ${e?.message ?? String(e)}`,
    );
  }
  const raw = await response.text();
  let body = null;
  if (raw && raw.length > 0) {
    try { body = JSON.parse(raw); } catch { body = raw; }
  }
  return { status: response.status, statusText: response.statusText, body, raw };
}

/**
 * POST the new deployment. Returns the deployment object on 2xx.
 */
async function createDeployment({ projectId, orgId, owner, repo, branchName, token, opts }) {
  const query = orgId ? `?teamId=${encodeURIComponent(orgId)}` : '';
  // NOTE: do NOT send `target: 'preview'` — Vercel /v13/deployments only
  // accepts `target` values of 'production', 'staging', or a custom env
  // identifier; passing 'preview' returns 400 with
  //   "Invalid request: `target` should be 'production', 'staging', or
  //    a custom environment identifier."
  // OMITTING the field entirely is the documented way to request a
  // preview deployment (Vercel infers preview from absence of target).
  // Fixed 2026-05-18 (W5b dispatch #12) after live 400 reproduction.
  const res = await callVercel('POST', `/v13/deployments${query}`, token, {
    ...opts,
    body: {
      name: repo,
      project: projectId,
      gitSource: { type: 'github', org: owner, repo, ref: branchName },
    },
  });
  if (res.status >= 200 && res.status < 300) {
    const deploymentId = res.body?.id;
    if (typeof deploymentId !== 'string' || !deploymentId) {
      throw makeError(
        'DEPLOY_FAILED',
        `vercelBranchDeploy: POST /v13/deployments returned ${res.status} but body lacks deployment id`,
      );
    }
    return res.body;
  }
  // Surface the Vercel error body so 4xx debugging doesn't require a
  // separate curl round-trip (previously the raw response text was
  // dropped on the floor; this preserves it for the orchestrator log).
  const vercelMsg =
    res.body && typeof res.body === 'object'
      ? res.body.error?.message ?? JSON.stringify(res.body).slice(0, 300)
      : (typeof res.body === 'string' ? res.body.slice(0, 300) : '');
  throw makeError(
    classifyStatus(res.status, 'DEPLOY_FAILED'),
    `vercelBranchDeploy: POST /v13/deployments ${res.status} ${res.statusText} for ${owner}/${repo}@${branchName}` +
      (vercelMsg ? ` — ${vercelMsg}` : ''),
    { status: res.status, vercelError: vercelMsg || null },
  );
}

/**
 * GET deployment state for polling.
 */
async function getDeployment({ deploymentId, orgId, token, opts }) {
  const query = orgId ? `?teamId=${encodeURIComponent(orgId)}` : '';
  const res = await callVercel(
    'GET',
    `/v13/deployments/${encodeURIComponent(deploymentId)}${query}`,
    token,
    opts,
  );
  if (res.status >= 200 && res.status < 300) return res.body;
  throw makeError(
    classifyStatus(res.status, 'DEPLOY_FAILED'),
    `vercelBranchDeploy: GET /v13/deployments/${deploymentId} ${res.status} ${res.statusText}`,
    { status: res.status },
  );
}

/**
 * Sleep for `ms`. Overridable via `opts.sleep` so tests can short-circuit
 * the 5 s × 60-poll budget without taking 5 minutes.
 */
async function sleep(ms, opts = {}) {
  const impl = typeof opts.sleep === 'function' ? opts.sleep : null;
  if (impl) return impl(ms);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Trigger a Vercel preview deployment of a GitHub branch and wait for it
 * to reach READY.
 *
 * @param {object} args
 * @param {string} args.projectId   — Vercel project ID
 * @param {string} args.orgId       — Vercel org / team ID
 * @param {string} args.owner       — GitHub owner / org (e.g. 'veu-ai-studio')
 * @param {string} args.repo        — GitHub repo name (e.g. 'my-preg-life')
 * @param {string} args.branchName  — branch ref (e.g. 'flowai/renewal-<runId>')
 * @param {string} args.token       — VERCEL_TOKEN
 * @param {object} [args.opts]      — { fetch?, sleep? } overridable for tests
 * @returns {Promise<{ deploymentId: string, previewUrl: string, inspectorUrl: string }>}
 */
export async function deployBranchPreview(args) {
  if (!args || typeof args !== 'object') {
    throw makeError('DEPLOY_FAILED', 'deployBranchPreview: args object required');
  }
  const required = ['projectId', 'orgId', 'owner', 'repo', 'branchName', 'token'];
  for (const k of required) {
    if (typeof args[k] !== 'string' || args[k].length === 0) {
      throw makeError('DEPLOY_FAILED', `deployBranchPreview: ${k} must be a non-empty string`);
    }
  }

  const { projectId, orgId, owner, repo, branchName, token } = args;
  const opts = args.opts ?? {};

  // 1. Create the deployment.
  const created = await createDeployment({ projectId, orgId, owner, repo, branchName, token, opts });
  const deploymentId = created.id;

  // 2. If the deployment is already READY synchronously, return immediately.
  if (created.readyState === 'READY') {
    return {
      deploymentId,
      previewUrl: created.url ?? '',
      inspectorUrl: created.inspectorUrl ?? '',
    };
  }
  if (created.readyState === 'ERROR' || created.readyState === 'CANCELED') {
    throw makeError(
      'DEPLOY_ERROR',
      `vercelBranchDeploy: deployment ${deploymentId} returned readyState=${created.readyState} on creation`,
      { readyState: created.readyState, deploymentId },
    );
  }

  // 3. Poll until READY / ERROR / CANCELED / timeout.
  let last = created;
  for (let attempt = 1; attempt <= DEPLOY_POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(DEPLOY_POLL_INTERVAL_MS, opts);
    last = await getDeployment({ deploymentId, orgId, token, opts });
    const state = last?.readyState ?? last?.state ?? null;
    if (state === 'READY') {
      return {
        deploymentId,
        previewUrl: last.url ?? '',
        inspectorUrl: last.inspectorUrl ?? '',
      };
    }
    if (state === 'ERROR' || state === 'CANCELED') {
      throw makeError(
        'DEPLOY_ERROR',
        `vercelBranchDeploy: deployment ${deploymentId} entered readyState=${state} after ${attempt} poll(s)`,
        { readyState: state, deploymentId, attempts: attempt },
      );
    }
  }

  // 4. Exhausted the 60-poll / 300 s budget without reaching READY.
  throw makeError(
    'DEPLOY_TIMEOUT',
    `vercelBranchDeploy: deployment ${deploymentId} did not reach READY within ${DEPLOY_POLL_TIMEOUT_MS} ms ` +
      `(last readyState=${last?.readyState ?? 'unknown'}, ${DEPLOY_POLL_MAX_ATTEMPTS} polls exhausted)`,
    {
      deploymentId,
      lastReadyState: last?.readyState ?? null,
      attempts: DEPLOY_POLL_MAX_ATTEMPTS,
    },
  );
}

export const __internals = Object.freeze({
  VERCEL_API_BASE,
  DEPLOY_POLL_INTERVAL_MS,
  DEPLOY_POLL_MAX_ATTEMPTS,
  DEPLOY_POLL_TIMEOUT_MS,
  classifyStatus,
  makeError,
  callVercel,
  createDeployment,
  getDeployment,
  sleep,
});
