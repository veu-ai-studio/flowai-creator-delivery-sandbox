import { randomUUID } from 'node:crypto';

export const RUNTIME_DISPATCH_ENTRY_POINT = '/api/runtime-dispatch-authority-proof';
export const RUNTIME_DISPATCH_MODULE = 'api/_lib/runtimeDispatchAuthorityProof.js';
export const APPROVED_SANDBOX_OWNER = 'veu-ai-studio';
export const APPROVED_SANDBOX_REPO = 'flowai-build-execution-sandbox';
export const WORKFLOW_FILE_NAME = 'flowai-runtime-dispatch-proof.yml';
export const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE_NAME}`;
export const WORKFLOW_IDENTIFIER = WORKFLOW_FILE_NAME;

const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_POLL_INTERVAL_MS = 4_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 45;

export class RuntimeDispatchProofError extends Error {
  constructor(message, { status = 500, code = 'RUNTIME_DISPATCH_PROOF_ERROR', details = null } = {}) {
    super(message);
    this.name = 'RuntimeDispatchProofError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function createProofRunId(now = new Date(), idFactory = randomUUID) {
  const stamp = now.toISOString().replace(/[-:.]/g, '').slice(0, 15);
  return `flowai-runtime-${stamp}-${idFactory().slice(0, 8)}`;
}

export function resolveFlowAiRuntimeCommit(env = process.env) {
  return (
    env.VERCEL_GIT_COMMIT_SHA
    || env.FLOWAI_EXPECTED_HEAD
    || env.GIT_COMMIT
    || env.GIT_BRANCH
    || 'unknown'
  );
}

export function resolveSandboxConfig(env = process.env) {
  const owner = (env.FLOWAI_RUNTIME_DISPATCH_SANDBOX_OWNER || APPROVED_SANDBOX_OWNER).trim();
  const repo = (env.FLOWAI_RUNTIME_DISPATCH_SANDBOX_REPO || APPROVED_SANDBOX_REPO).trim();
  const fullName = `${owner}/${repo}`;
  return {
    owner,
    repo,
    fullName,
    approved: owner === APPROVED_SANDBOX_OWNER && repo === APPROVED_SANDBOX_REPO,
  };
}

export function assertApprovedSandbox(config) {
  if (!config?.approved) {
    throw new RuntimeDispatchProofError('Sandbox target is not approved for runtime dispatch authority proof.', {
      status: 409,
      code: 'SANDBOX_BOUNDARY_STOP',
      details: {
        requestedSandbox: config?.fullName || null,
        approvedSandbox: `${APPROVED_SANDBOX_OWNER}/${APPROVED_SANDBOX_REPO}`,
      },
    });
  }
}

export function buildSandboxWorkflowContent() {
  return [
    'name: FlowAI Runtime Dispatch Proof',
    '',
    'run-name: FlowAI runtime dispatch proof ${{ inputs.proofRunId }}',
    '',
    'on:',
    '  workflow_dispatch:',
    '    inputs:',
    '      proofRunId:',
    '        description: FlowAI runtime-generated proof nonce',
    '        required: true',
    '        type: string',
    '      dispatchSource:',
    '        description: Dispatch source recorded by FlowAI runtime',
    '        required: true',
    '        type: string',
    '      runtimeEntryPoint:',
    '        description: FlowAI runtime entry point',
    '        required: true',
    '        type: string',
    '      flowaiCommit:',
    '        description: FlowAI runtime commit identity',
    '        required: true',
    '        type: string',
    '',
    'permissions:',
    '  contents: read',
    '',
    'jobs:',
    '  prove-runtime-dispatch:',
    '    name: Echo FlowAI runtime dispatch proof',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: Generate proof result',
    '        shell: bash',
    '        run: |',
    '          set -euo pipefail',
    '          mkdir -p proof',
    '          cat > proof/result.json <<EOF',
    '          {"proofRunId":"${{ inputs.proofRunId }}","dispatchSource":"${{ inputs.dispatchSource }}","runtimeEntryPoint":"${{ inputs.runtimeEntryPoint }}","flowaiCommit":"${{ inputs.flowaiCommit }}","sandbox":"veu-ai-studio/flowai-build-execution-sandbox","runner":"github-actions","result":"ok"}',
    '          EOF',
    '          cat proof/result.json',
    '      - name: Upload proof result',
    '        uses: actions/upload-artifact@v4',
    '        with:',
    '          name: flowai-runtime-dispatch-proof-${{ inputs.proofRunId }}',
    '          path: proof/result.json',
    '          if-no-files-found: error',
    '          retention-days: 1',
    '',
  ].join('\n');
}

function encodeRepoPath(path) {
  return path.split('/').map((part) => encodeURIComponent(part)).join('/');
}

function asBase64(text) {
  return Buffer.from(text, 'utf8').toString('base64');
}

function fromBase64(text = '') {
  return Buffer.from(String(text).replace(/\n/g, ''), 'base64').toString('utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeGitHubErrorPayload(data) {
  if (!data || typeof data !== 'object') return null;
  return {
    message: typeof data.message === 'string' ? data.message : undefined,
    documentation_url: typeof data.documentation_url === 'string' ? data.documentation_url : undefined,
    status: typeof data.status === 'string' ? data.status : undefined,
  };
}

async function githubRequest(path, {
  method = 'GET',
  body = undefined,
  token,
  fetchImpl,
}) {
  const res = await fetchImpl(`${GITHUB_API_BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'flowai-runtime-dispatch-authority-proof',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 500) };
    }
  }
  if (!res.ok) {
    throw new RuntimeDispatchProofError(`GitHub API request failed: ${method} ${path}`, {
      status: res.status,
      code: 'GITHUB_API_FAILED',
      details: {
        status: res.status,
        path,
        method,
        response: sanitizeGitHubErrorPayload(data),
      },
    });
  }
  return { status: res.status, data, headers: res.headers };
}

async function ensureSandboxWorkflow({
  token,
  fetchImpl,
  sandbox,
  workflowContent,
}) {
  const repoPath = `/repos/${sandbox.owner}/${sandbox.repo}`;
  const repo = await githubRequest(repoPath, { token, fetchImpl });
  const repoData = repo.data || {};
  const defaultBranch = repoData.default_branch || 'main';
  const permissions = repoData.permissions || {};
  if (repoData.full_name !== sandbox.fullName) {
    throw new RuntimeDispatchProofError('GitHub repository identity did not match approved sandbox.', {
      status: 409,
      code: 'SANDBOX_IDENTITY_MISMATCH',
      details: { expected: sandbox.fullName, observed: repoData.full_name || null },
    });
  }

  let existing = null;
  let existingSha = null;
  const contentPath = `/repos/${sandbox.owner}/${sandbox.repo}/contents/${encodeRepoPath(WORKFLOW_PATH)}?ref=${encodeURIComponent(defaultBranch)}`;
  try {
    const current = await githubRequest(contentPath, { token, fetchImpl });
    existing = fromBase64(current.data?.content || '');
    existingSha = current.data?.sha || null;
  } catch (error) {
    if (!(error instanceof RuntimeDispatchProofError) || error.status !== 404) throw error;
  }

  if (existing === workflowContent) {
    return {
      status: 'UNCHANGED',
      defaultBranch,
      commitSha: null,
      permissions: {
        admin: permissions.admin === true,
        push: permissions.push === true,
      },
    };
  }

  const writeBody = {
    message: 'chore: add FlowAI runtime dispatch proof workflow',
    content: asBase64(workflowContent),
    branch: defaultBranch,
  };
  if (existingSha) writeBody.sha = existingSha;

  const written = await githubRequest(`/repos/${sandbox.owner}/${sandbox.repo}/contents/${encodeRepoPath(WORKFLOW_PATH)}`, {
    method: 'PUT',
    body: writeBody,
    token,
    fetchImpl,
  });

  return {
    status: existingSha ? 'UPDATED' : 'CREATED',
    defaultBranch,
    commitSha: written.data?.commit?.sha || null,
    permissions: {
      admin: permissions.admin === true,
      push: permissions.push === true,
    },
  };
}

async function waitForWorkflow({
  token,
  fetchImpl,
  sandbox,
  sleepImpl,
  pollIntervalMs,
  maxAttempts,
}) {
  let lastError = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const workflow = await githubRequest(`/repos/${sandbox.owner}/${sandbox.repo}/actions/workflows/${encodeURIComponent(WORKFLOW_IDENTIFIER)}`, {
        token,
        fetchImpl,
      });
      return {
        id: workflow.data?.id || null,
        name: workflow.data?.name || null,
        path: workflow.data?.path || WORKFLOW_PATH,
        state: workflow.data?.state || null,
      };
    } catch (error) {
      lastError = error;
      if (!(error instanceof RuntimeDispatchProofError) || error.status !== 404) throw error;
      await sleepImpl(pollIntervalMs);
    }
  }
  throw new RuntimeDispatchProofError('Sandbox workflow was not discoverable after creation.', {
    status: 409,
    code: 'WORKFLOW_DISCOVERY_BLOCK',
    details: lastError?.details || null,
  });
}

function runMatchesProofId(run, proofRunId, dispatchedAtMs) {
  const displayTitle = run?.display_title || '';
  const name = run?.name || '';
  const createdAtMs = Date.parse(run?.created_at || '');
  return (
    Number.isFinite(createdAtMs)
    && createdAtMs >= dispatchedAtMs - 30_000
    && (displayTitle.includes(proofRunId) || name.includes(proofRunId))
  );
}

async function waitForRun({
  token,
  fetchImpl,
  sandbox,
  proofRunId,
  dispatchedAtMs,
  sleepImpl,
  pollIntervalMs,
  maxAttempts,
}) {
  let matched = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const runs = await githubRequest(
      `/repos/${sandbox.owner}/${sandbox.repo}/actions/workflows/${encodeURIComponent(WORKFLOW_IDENTIFIER)}/runs?event=workflow_dispatch&per_page=20`,
      { token, fetchImpl },
    );
    matched = (runs.data?.workflow_runs || []).find((run) => runMatchesProofId(run, proofRunId, dispatchedAtMs)) || matched;
    if (matched?.id && matched.status === 'completed') return matched;
    await sleepImpl(pollIntervalMs);
  }
  if (matched?.id) return matched;
  throw new RuntimeDispatchProofError('No sandbox workflow run matched the runtime proofRunId.', {
    status: 409,
    code: 'RUN_DISCOVERY_BLOCK',
    details: { proofRunId },
  });
}

async function listRunArtifacts({ token, fetchImpl, sandbox, runId }) {
  const artifacts = await githubRequest(`/repos/${sandbox.owner}/${sandbox.repo}/actions/runs/${runId}/artifacts?per_page=30`, {
    token,
    fetchImpl,
  });
  return artifacts.data?.artifacts || [];
}

export async function runRuntimeDispatchAuthorityProof({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  idFactory = randomUUID,
  sleepImpl = sleep,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new RuntimeDispatchProofError('fetch implementation is unavailable.', {
      status: 500,
      code: 'FETCH_UNAVAILABLE',
    });
  }

  const token = env.GITHUB_WORKFLOW_TOKEN || env.GITHUB_OPERATOR_TOKEN || env.GITHUB_PAT;
  if (!token) {
    throw new RuntimeDispatchProofError('Workflow dispatch credential is not configured.', {
      status: 503,
      code: 'WORKFLOW_CREDENTIAL_MISSING',
    });
  }

  const sandbox = resolveSandboxConfig(env);
  assertApprovedSandbox(sandbox);

  const flowaiCommit = resolveFlowAiRuntimeCommit(env);
  const proofRunId = createProofRunId(now(), idFactory);
  const workflowContent = buildSandboxWorkflowContent();
  const workflowWrite = await ensureSandboxWorkflow({
    token,
    fetchImpl,
    sandbox,
    workflowContent,
  });
  const workflow = await waitForWorkflow({
    token,
    fetchImpl,
    sandbox,
    sleepImpl,
    pollIntervalMs,
    maxAttempts: 6,
  });

  const dispatchedAt = now();
  const dispatchedAtMs = dispatchedAt.getTime();
  const dispatchInputs = {
    proofRunId,
    dispatchSource: 'FlowAI Runtime',
    runtimeEntryPoint: RUNTIME_DISPATCH_ENTRY_POINT,
    flowaiCommit,
  };

  await githubRequest(`/repos/${sandbox.owner}/${sandbox.repo}/actions/workflows/${encodeURIComponent(WORKFLOW_IDENTIFIER)}/dispatches`, {
    method: 'POST',
    body: {
      ref: workflowWrite.defaultBranch,
      inputs: dispatchInputs,
    },
    token,
    fetchImpl,
  });

  const run = await waitForRun({
    token,
    fetchImpl,
    sandbox,
    proofRunId,
    dispatchedAtMs,
    sleepImpl,
    pollIntervalMs,
    maxAttempts: maxPollAttempts,
  });
  const artifacts = run?.id
    ? await listRunArtifacts({ token, fetchImpl, sandbox, runId: run.id })
    : [];
  const expectedArtifactName = `flowai-runtime-dispatch-proof-${proofRunId}`;
  const artifact = artifacts.find((item) => item.name === expectedArtifactName) || null;
  const proofRunIdReturned = Boolean(
    (run.display_title || '').includes(proofRunId)
    && artifact?.name === expectedArtifactName,
  );
  const succeeded = run.status === 'completed'
    && run.conclusion === 'success'
    && proofRunIdReturned;

  return {
    ok: succeeded,
    status: succeeded ? 'SUCCESS' : 'BLOCK',
    dispatchSource: 'FlowAI Runtime',
    runtimeEntryPoint: RUNTIME_DISPATCH_ENTRY_POINT,
    dispatchModule: RUNTIME_DISPATCH_MODULE,
    flowaiCommit,
    proofRunId,
    proofRunIdContinuity: {
      generatedByRuntime: true,
      dispatchedToWorkflow: dispatchInputs.proofRunId === proofRunId,
      observedInRunTitle: (run.display_title || '').includes(proofRunId),
      observedInArtifactName: artifact?.name === expectedArtifactName,
      returnedToRuntime: proofRunIdReturned,
    },
    sandbox: {
      owner: sandbox.owner,
      repo: sandbox.repo,
      fullName: sandbox.fullName,
      approved: sandbox.approved,
      permissions: workflowWrite.permissions,
      contained: sandbox.approved,
      boundary: 'approved sandbox repository only',
    },
    workflow: {
      identifier: WORKFLOW_IDENTIFIER,
      file: WORKFLOW_FILE_NAME,
      path: WORKFLOW_PATH,
      state: workflow.state,
      id: workflow.id,
      writeStatus: workflowWrite.status,
      workflowCommitSha: workflowWrite.commitSha,
      defaultBranch: workflowWrite.defaultBranch,
    },
    run: run?.id ? {
      id: run.id,
      url: run.url,
      htmlUrl: run.html_url,
      event: run.event,
      actor: run.actor?.login || null,
      status: run.status,
      conclusion: run.conclusion,
      displayTitle: run.display_title || null,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
    } : null,
    result: {
      ingested: proofRunIdReturned,
      conclusion: run?.conclusion || null,
      artifactName: artifact?.name || null,
      artifactId: artifact?.id || null,
      expectedArtifactName,
    },
    containment: {
      productionDeployTouched: false,
      productionRepoMutated: false,
      customerRepoMutated: false,
      flowaiProductRepoMutated: false,
      sandboxOnly: sandbox.approved,
      workflowPermissions: 'contents: read',
    },
    claimBoundary: {
      maximumClaim: succeeded
        ? 'FlowAI Runtime Dispatch Authority Demonstrated (sandbox-scoped)'
        : 'No FlowAI runtime dispatch authority claim moves',
      excludedClaims: [
        'BuildExecutionWorker exists',
        'BuildExecutionWorker production-ready',
        'BUILD_EXECUTION_VERIFIED',
        'CREATOR_VERIFIED',
        'UPGRADER_VERIFIED',
        'UNIVERSAL_ENGINE_VERIFIED',
        'Production autonomous execution',
      ],
    },
    timestamps: {
      dispatchedAt: dispatchedAt.toISOString(),
      completedAt: run?.updated_at || null,
    },
  };
}

export function statusCodeForRuntimeDispatchResult(result) {
  if (result?.ok) return 200;
  if (result?.status === 'STOP') return 409;
  return 502;
}
