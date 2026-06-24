import { createHash, sign } from 'node:crypto';
import { invoke as vercelInvoke } from '../../src/lib/orchestra/vercel.js';
import {
  BuildExecutionWorkerError,
  resolveFlowAiBuildCommit,
} from './buildExecutionWorker.js';

export const DEPLOY_CHAIN_KIND = 'DEPLOY_CHAIN';
export const APPROVED_DEPLOY_SANDBOX_OWNER = 'veu-ai-studio';
export const APPROVED_DEPLOY_SANDBOX_REPO = 'flowai-deploy-execution-sandbox';
export const APPROVED_DEPLOY_SANDBOX_FULL_NAME = `${APPROVED_DEPLOY_SANDBOX_OWNER}/${APPROVED_DEPLOY_SANDBOX_REPO}`;
export const APPROVED_DEPLOY_PROJECT_NAMES = Object.freeze([
  'flowai-m2-deploy-chain-proof',
  'flowai-m3-upgrader-proof',
]);
export const DEPLOY_CHAIN_APP_FILE = 'src/App.jsx';
export const DEPLOY_CHAIN_HTML_FILE = 'index.html';
export const DEPLOY_CHAIN_PROOF_FILE = 'flowai-deploy-proof.json';

const GITHUB_API_BASE = 'https://api.github.com';
const SAFE_PROOF_ID = /^[a-zA-Z0-9._-]+$/;
const DEFAULT_BRANCH = 'main';
const DEFAULT_POLL_INTERVAL_MS = 4_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 45;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function asBase64(text) {
  return Buffer.from(text, 'utf8').toString('base64');
}

function fromBase64(text = '') {
  return Buffer.from(String(text).replace(/\n/g, ''), 'base64').toString('utf8');
}

function sha256(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex');
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function normalizePrivateKey(value = '') {
  return String(value || '').replace(/\\n/g, '\n');
}

async function createGitHubAppInstallationToken(env, fetchImpl = fetch) {
  const appId = env.GITHUB_APP_ID;
  const installationId = env.GITHUB_APP_INSTALLATION_ID || env.GITHUB_INSTALLATION_ID;
  const privateKey = normalizePrivateKey(env.GITHUB_APP_PRIVATE_KEY);
  if (!appId || !installationId || !privateKey) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' });
  const payload = base64UrlJson({ iat: now - 60, exp: now + 540, iss: appId });
  const input = `${header}.${payload}`;
  const signature = sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url');
  const response = await fetchImpl(`${GITHUB_API_BASE}/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input}.${signature}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'flowai-deploy-chain-worker',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 500) }; }
  if (!response.ok || !data?.token) {
    throw new BuildExecutionWorkerError('GitHub App installation token request failed.', {
      status: response.status,
      code: 'GITHUB_APP_TOKEN_FAILED',
      details: {
        status: response.status,
        response: sanitizeGitHubErrorPayload(data),
      },
    });
  }
  return { token: data.token, source: 'GITHUB_APP_INSTALLATION_TOKEN' };
}

function assertSafeProofRunId(proofRunId) {
  if (typeof proofRunId !== 'string' || !SAFE_PROOF_ID.test(proofRunId)) {
    throw new BuildExecutionWorkerError('Invalid proofRunId for deploy-chain path.', {
      status: 400,
      code: 'INVALID_PROOF_RUN_ID',
      details: { proofRunId: typeof proofRunId === 'string' ? proofRunId.slice(0, 80) : null },
    });
  }
}

function encodeRepoPath(path) {
  return path.split('/').map(part => encodeURIComponent(part)).join('/');
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
      'User-Agent': 'flowai-deploy-chain-worker',
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
    throw new BuildExecutionWorkerError(`GitHub API request failed: ${method} ${path}`, {
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

function normalizeRepoName(value) {
  return String(value || '').trim();
}

export function resolveDeployChainSandbox(env = process.env) {
  const owner = normalizeRepoName(env.FLOWAI_DEPLOY_CHAIN_SANDBOX_OWNER || APPROVED_DEPLOY_SANDBOX_OWNER);
  const repo = normalizeRepoName(env.FLOWAI_DEPLOY_CHAIN_SANDBOX_REPO || APPROVED_DEPLOY_SANDBOX_REPO);
  return Object.freeze({
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    approved: owner === APPROVED_DEPLOY_SANDBOX_OWNER && repo === APPROVED_DEPLOY_SANDBOX_REPO,
  });
}

export function assertApprovedDeployChainSandbox(sandbox) {
  if (!sandbox?.approved || sandbox.fullName !== APPROVED_DEPLOY_SANDBOX_FULL_NAME) {
    throw new BuildExecutionWorkerError('DeployChain target is not the approved deployable sandbox repository.', {
      status: 409,
      code: 'DEPLOY_CHAIN_SANDBOX_BOUNDARY_STOP',
      details: {
        requestedSandbox: sandbox?.fullName || null,
        approvedSandbox: APPROVED_DEPLOY_SANDBOX_FULL_NAME,
      },
    });
  }
}

function hasPlaceholderLanguage(text) {
  return /\b(simulated|demo|mock|placeholder)\b/i.test(String(text || ''));
}

async function resolveGitHubDeployCredential(env, fetchImpl = fetch) {
  if (env.GITHUB_OPERATOR_TOKEN) {
    return { token: env.GITHUB_OPERATOR_TOKEN, source: 'GITHUB_OPERATOR_TOKEN' };
  }
  const appToken = await createGitHubAppInstallationToken(env, fetchImpl);
  if (appToken) return appToken;
  if (env.GITHUB_PAT) {
    return { token: env.GITHUB_PAT, source: 'GITHUB_PAT' };
  }
  if (env.GITHUB_WORKFLOW_TOKEN) {
    return { token: env.GITHUB_WORKFLOW_TOKEN, source: 'GITHUB_WORKFLOW_TOKEN' };
  }
  return { token: null, source: null };
}

function resolveVercelDeployTarget(env) {
  return env.FLOWAI_M2_DEPLOY_TARGET === 'production' ? 'production' : 'preview';
}

function assertApprovedDeployProjectName(projectName) {
  if (!APPROVED_DEPLOY_PROJECT_NAMES.includes(projectName)) {
    throw new BuildExecutionWorkerError('DeployChain target is not an approved Vercel proof project.', {
      status: 409,
      code: 'DEPLOY_CHAIN_PROJECT_BOUNDARY_STOP',
      details: {
        requestedProjectName: projectName,
        approvedProjectNames: APPROVED_DEPLOY_PROJECT_NAMES,
      },
    });
  }
}

function resolveVercelProjectName(env, proofRunId, deploymentProjectName = null) {
  const requested = String(deploymentProjectName || '').trim();
  if (requested) {
    assertApprovedDeployProjectName(requested);
    return requested;
  }
  const configured = String(env.FLOWAI_M2_PROJECT_NAME || '').trim();
  if (configured) {
    assertApprovedDeployProjectName(configured);
    return configured;
  }
  return `flowai-m2-${proofRunId}`;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function extractVisibleBodyText(html) {
  const source = String(html || '');
  const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : source;
  return decodeHtmlEntities(body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function normalizeVisibleText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function htmlHasVisibleBodyText(html, expectedText) {
  return normalizeVisibleText(extractVisibleBodyText(html)).includes(normalizeVisibleText(expectedText));
}

function extractMainInnerMarkup(appCode) {
  const main = String(appCode || '').match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return main ? main[1].trim() : '';
}

function sanitizeDeployableMarkup(markup) {
  return String(markup || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|{[^}]*}|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '')
    .replace(/\bclassName=/g, 'class=')
    .trim();
}

export function normalizeRunnableAppOutput(selectedToolOutput) {
  let code = typeof selectedToolOutput === 'string'
    ? selectedToolOutput.trim()
    : JSON.stringify(selectedToolOutput ?? null, null, 2);
  const fenced = code.match(/^```(?:jsx?|tsx?|javascript|react)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) code = fenced[1].trim();
  if (hasPlaceholderLanguage(code)) {
    throw new BuildExecutionWorkerError('Selected tool output contains placeholder-family language and cannot be deployed for M2.', {
      status: 409,
      code: 'DEPLOY_CHAIN_PLACEHOLDER_OUTPUT_STOP',
    });
  }
  if (!/\bexport\s+default\b/.test(code) || !/<[A-Za-z][\s\S]*>/.test(code)) {
    throw new BuildExecutionWorkerError('Selected tool output is not a runnable React component.', {
      status: 409,
      code: 'DEPLOY_CHAIN_OUTPUT_NOT_RUNNABLE',
    });
  }
  return code;
}

export function buildDeployableAppFiles({
  proofRunId,
  buildRequestId,
  selectedToolOutput,
  selectedTool,
  selectedMemberId,
  flowaiCommit,
}) {
  assertSafeProofRunId(proofRunId);
  const appCode = normalizeRunnableAppOutput(selectedToolOutput);
  const browserMarker = markerFromOutput(appCode);
  if (!browserMarker) {
    throw new BuildExecutionWorkerError('DeployChain could not derive a browser-verifiable marker from selected output.', {
      status: 409,
      code: 'DEPLOY_CHAIN_MARKER_MISSING',
    });
  }
  const proof = {
    proofRunId,
    buildRequestId,
    flowaiCommit,
    selectedToolId: selectedTool?.platform_name || selectedTool?.toolName || selectedTool?.name || selectedTool?.id || null,
    selectedMemberId,
    selectedToolOutputSha256: sha256(appCode),
    browserMarker,
    createdAt: new Date().toISOString(),
    claimBoundary: 'DEPLOY_CHAIN_DEMONSTRATED candidate evidence only; no persistence, Creator, Upgrader, or Universal Engine proof',
  };
  const safeMainMarkup = sanitizeDeployableMarkup(extractMainInnerMarkup(appCode));
  const renderedMainContent = safeMainMarkup || `<p>${escapeHtml(browserMarker)}</p>`;
  const renderedHtml = `<!doctype html>
<html lang="en" data-flowai-proof-run-id="${escapeHtml(proofRunId)}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FlowAI M2 Deploy Chain Proof</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f7faf8;
        color: #17211b;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
      }
      main {
        width: min(720px, calc(100vw - 32px));
        border: 1px solid #cbd8d0;
        border-radius: 8px;
        background: #ffffff;
        padding: 32px;
        box-shadow: 0 16px 40px rgba(23, 33, 27, 0.08);
      }
      p {
        margin: 0;
        font-size: 24px;
        line-height: 1.35;
        font-weight: 700;
      }
      small {
        display: block;
        margin-top: 16px;
        color: #506057;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <main id="flowai-m2-output" data-selected-output-sha="${proof.selectedToolOutputSha256}">
      ${renderedMainContent}
      <small>FlowAI deploy-chain proof ${escapeHtml(proofRunId)}</small>
    </main>
  </body>
</html>
`;
  return Object.freeze([
    Object.freeze({
      path: DEPLOY_CHAIN_HTML_FILE,
      content: renderedHtml,
    }),
    Object.freeze({
      path: DEPLOY_CHAIN_APP_FILE,
      content: appCode.endsWith('\n') ? appCode : `${appCode}\n`,
    }),
    Object.freeze({
      path: DEPLOY_CHAIN_PROOF_FILE,
      content: JSON.stringify(proof, null, 2) + '\n',
    }),
  ]);
}

async function ensureDeploySandboxRepo({ token, fetchImpl, sandbox }) {
  try {
    const repo = await githubRequest(`/repos/${sandbox.owner}/${sandbox.repo}`, { token, fetchImpl });
    return {
      status: 'EXISTS',
      repo: repo.data,
      defaultBranch: repo.data?.default_branch || DEFAULT_BRANCH,
      creationEvidence: null,
    };
  } catch (error) {
    if (!(error instanceof BuildExecutionWorkerError) || error.status !== 404) throw error;
  }

  const created = await githubRequest(`/orgs/${sandbox.owner}/repos`, {
    method: 'POST',
    token,
    fetchImpl,
    body: {
      name: sandbox.repo,
      private: true,
      auto_init: true,
      description: 'FlowAI deploy-chain proof sandbox. Runnable selected-tool output only.',
    },
  });
  return {
    status: 'CREATED',
    repo: created.data,
    defaultBranch: created.data?.default_branch || DEFAULT_BRANCH,
    creationEvidence: {
      repositoryId: created.data?.id || null,
      htmlUrl: created.data?.html_url || null,
      fullName: created.data?.full_name || sandbox.fullName,
    },
  };
}

async function getBranchHead({ token, fetchImpl, sandbox, branch }) {
  const ref = await githubRequest(`/repos/${sandbox.owner}/${sandbox.repo}/git/ref/heads/${encodeURIComponent(branch)}`, {
    token,
    fetchImpl,
  });
  const commitSha = ref.data?.object?.sha;
  if (!commitSha) {
    throw new BuildExecutionWorkerError('DeployChain sandbox branch head is unavailable.', {
      status: 409,
      code: 'DEPLOY_CHAIN_BRANCH_HEAD_MISSING',
      details: { branch },
    });
  }
  const commit = await githubRequest(`/repos/${sandbox.owner}/${sandbox.repo}/git/commits/${encodeURIComponent(commitSha)}`, {
    token,
    fetchImpl,
  });
  return {
    branch,
    commitSha,
    treeSha: commit.data?.tree?.sha || null,
  };
}

async function createTreeCommit({ token, fetchImpl, sandbox, branch, files, proofRunId }) {
  const head = await getBranchHead({ token, fetchImpl, sandbox, branch });
  if (!head.treeSha) {
    throw new BuildExecutionWorkerError('DeployChain sandbox base tree is unavailable.', {
      status: 409,
      code: 'DEPLOY_CHAIN_BASE_TREE_MISSING',
    });
  }

  const tree = await githubRequest(`/repos/${sandbox.owner}/${sandbox.repo}/git/trees`, {
    method: 'POST',
    token,
    fetchImpl,
    body: {
      base_tree: head.treeSha,
      tree: files.map(file => ({
        path: file.path,
        mode: '100644',
        type: 'blob',
        content: file.content,
      })),
    },
  });
  const commit = await githubRequest(`/repos/${sandbox.owner}/${sandbox.repo}/git/commits`, {
    method: 'POST',
    token,
    fetchImpl,
    body: {
      message: `FlowAI M2 Deploy Chain ${proofRunId}`,
      tree: tree.data?.sha,
      parents: [head.commitSha],
    },
  });
  const commitSha = commit.data?.sha;
  if (!commitSha) {
    throw new BuildExecutionWorkerError('DeployChain sandbox commit did not return a SHA.', {
      status: 409,
      code: 'DEPLOY_CHAIN_COMMIT_SHA_MISSING',
    });
  }
  await githubRequest(`/repos/${sandbox.owner}/${sandbox.repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    token,
    fetchImpl,
    body: { sha: commitSha, force: false },
  });
  return {
    branch,
    commitSha,
    commitHtmlUrl: `https://github.com/${sandbox.fullName}/commit/${commitSha}`,
    filesWritten: files.length,
    appFilePath: DEPLOY_CHAIN_APP_FILE,
  };
}

async function readCommittedApp({ token, fetchImpl, sandbox, commitSha }) {
  const content = await githubRequest(
    `/repos/${sandbox.owner}/${sandbox.repo}/contents/${encodeRepoPath(DEPLOY_CHAIN_APP_FILE)}?ref=${encodeURIComponent(commitSha)}`,
    { token, fetchImpl },
  );
  return {
    contentSha: content.data?.sha || null,
    appCode: fromBase64(content.data?.content || ''),
  };
}

async function verifyDeployedUrl({ url, expectedText, fetchImpl, sleepImpl, pollIntervalMs, maxAttempts }) {
  let last = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'text/html,application/xhtml+xml' },
      });
      const text = await response.text();
      const renderedText = extractVisibleBodyText(text);
      const containsExpectedText = normalizeVisibleText(renderedText).includes(normalizeVisibleText(expectedText));
      last = {
        status: response.status,
        containsExpectedTextInVisibleBody: containsExpectedText,
        visibleBodyTextSample: renderedText.slice(0, 240),
      };
      if (response.ok && last.containsExpectedTextInVisibleBody) {
        return {
          status: 'RUNTIME_URL_RENDER_CHECK_PASS',
          httpStatus: response.status,
          renderedDomTextContainsExpectedText: true,
          visibleBodyTextSample: renderedText.slice(0, 240),
        };
      }
    } catch (error) {
      last = { error: error?.message || String(error) };
    }
    await sleepImpl(pollIntervalMs);
  }
  throw new BuildExecutionWorkerError('Deployed URL did not serve the generated component text.', {
    status: 409,
    code: 'DEPLOY_CHAIN_BROWSER_CHECK_FAILED',
    details: { url, last },
  });
}

function markerFromOutput(appCode) {
  const main = appCode.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (main) return normalizeVisibleText(main[1].replace(/<[^>]+>/g, ' '));
  const quoted = appCode.match(/FlowAI\s+M\d[^'"<]+/);
  return quoted ? normalizeVisibleText(quoted[0]) : '';
}

export async function runDeployChainWorkerMutation({
  proofRunId,
  buildRequestId,
  productId = null,
  runId = null,
  targetFilePath,
  deploymentProjectName = null,
  selectedTool,
  selectedMemberId,
  selectedToolOutput,
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  sleepImpl = sleep,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new BuildExecutionWorkerError('fetch implementation is unavailable.', {
      status: 500,
      code: 'FETCH_UNAVAILABLE',
    });
  }
  assertSafeProofRunId(proofRunId);
  if (typeof buildRequestId !== 'string' || buildRequestId.trim().length === 0) {
    throw new BuildExecutionWorkerError('buildRequestId is required for DeployChain mutation.', {
      status: 400,
      code: 'BUILD_REQUEST_ID_MISSING',
    });
  }
  if (typeof selectedMemberId !== 'string' || selectedMemberId.trim().length === 0) {
    throw new BuildExecutionWorkerError('selectedMemberId is required for DeployChain mutation.', {
      status: 400,
      code: 'SELECTED_MEMBER_ID_MISSING',
    });
  }

  const githubCredential = await resolveGitHubDeployCredential(env, fetchImpl);
  if (!githubCredential.token) {
    throw new BuildExecutionWorkerError('GitHub workflow credential is not configured for DeployChain.', {
      status: 503,
      code: 'DEPLOY_CHAIN_GITHUB_CREDENTIAL_MISSING',
    });
  }
  if (!(env.VERCEL_OPERATOR_TOKEN || env.VERCEL_TOKEN)) {
    throw new BuildExecutionWorkerError('Vercel operator credential is not configured for DeployChain.', {
      status: 503,
      code: 'DEPLOY_CHAIN_VERCEL_CREDENTIAL_MISSING',
    });
  }

  const sandbox = resolveDeployChainSandbox(env);
  assertApprovedDeployChainSandbox(sandbox);
  const startedAt = now();
  const flowaiCommit = resolveFlowAiBuildCommit(env);
  const files = buildDeployableAppFiles({
    proofRunId,
    buildRequestId,
    selectedToolOutput,
    selectedTool,
    selectedMemberId,
    flowaiCommit,
  });
  const appFile = files.find(file => file.path === DEPLOY_CHAIN_APP_FILE);
  const expectedText = markerFromOutput(appFile?.content || '');
  if (!expectedText) {
    throw new BuildExecutionWorkerError('DeployChain could not derive a browser-verifiable marker from selected output.', {
      status: 409,
      code: 'DEPLOY_CHAIN_MARKER_MISSING',
    });
  }

  const repo = await ensureDeploySandboxRepo({ token: githubCredential.token, fetchImpl, sandbox });
  const commit = await createTreeCommit({
    token: githubCredential.token,
    fetchImpl,
    sandbox,
    branch: repo.defaultBranch,
    files,
    proofRunId,
  });
  const readBack = await readCommittedApp({
    token: githubCredential.token,
    fetchImpl,
    sandbox,
    commitSha: commit.commitSha,
  });
  if (readBack.appCode !== appFile.content) {
    throw new BuildExecutionWorkerError('DeployChain committed app read-back does not match selected-tool output.', {
      status: 409,
      code: 'DEPLOY_CHAIN_APP_READBACK_MISMATCH',
    });
  }

  const vercelTarget = resolveVercelDeployTarget(env);
  const projectName = resolveVercelProjectName(env, proofRunId, deploymentProjectName);
  const deploy = await vercelInvoke('deploy', {
    files,
    projectName,
    stableProjectName: Boolean(deploymentProjectName || env.FLOWAI_M2_PROJECT_NAME),
    target: vercelTarget,
    framework: null,
    teamId: env.VERCEL_ORG_ID || env.VERCEL_TEAM || null,
  });
  if (!deploy?.ok) {
    throw new BuildExecutionWorkerError('DeployChain Vercel deployment failed.', {
      status: 502,
      code: 'DEPLOY_CHAIN_VERCEL_DEPLOY_FAILED',
      details: deploy?.error || deploy || null,
    });
  }
  const deployedUrl = deploy.data?.url || null;
  if (!deployedUrl) {
    throw new BuildExecutionWorkerError('DeployChain Vercel deployment did not return a URL.', {
      status: 409,
      code: 'DEPLOY_CHAIN_URL_MISSING',
      details: { deploymentId: deploy.data?.deploymentId || null },
    });
  }
  const runtimeCheck = await verifyDeployedUrl({
    url: deployedUrl,
    expectedText,
    fetchImpl,
    sleepImpl,
    pollIntervalMs,
    maxAttempts: maxPollAttempts,
  });

  return {
    ok: true,
    kind: DEPLOY_CHAIN_KIND,
    proofRunId,
    buildRequestId,
    productId,
    runId,
    targetFilePath,
    selectedToolId: selectedTool?.platform_name || selectedTool?.toolName || selectedTool?.name || selectedTool?.id || null,
    selectedMemberId,
    selectedToolOutputSha256: sha256(appFile.content),
    commitSha: commit.commitSha,
    commitUrl: commit.commitHtmlUrl,
    mutatedFilePath: DEPLOY_CHAIN_APP_FILE,
    filesWritten: commit.filesWritten,
    appContentSha: readBack.contentSha,
    deployedUrl,
    deploymentId: deploy.data?.deploymentId || null,
    deploymentProjectName: deploy.data?.projectName || projectName,
    deploymentReadyState: deploy.data?.readyState || null,
    deploymentTarget: deploy.data?.target || vercelTarget,
    browserVerification: runtimeCheck,
    expectedText,
    sandbox: {
      owner: sandbox.owner,
      repo: sandbox.repo,
      fullName: sandbox.fullName,
      approved: sandbox.approved,
    },
    githubCredentialSource: githubCredential.source,
    deployableSandboxCreation: repo.creationEvidence,
    flowaiCommit,
    createdAt: startedAt.toISOString(),
    claimBoundary: 'DEPLOY_CHAIN_DEMONSTRATED candidate evidence only; no persistence, Creator, Upgrader, or Universal Engine proof',
  };
}

export const __test = Object.freeze({
  createGitHubAppInstallationToken,
  resolveGitHubDeployCredential,
});
