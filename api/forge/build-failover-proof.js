// POST /api/forge/build-failover-proof
//
// Watchable production proof for Reliability Result 1. This endpoint keeps
// proof credentials server-side, enters the real forge runBuild path, forces
// the selected Codex dispatch to hang once, streams attempt history, and deploys
// the Claude Code recovery output to the approved deploy-chain sandbox.

import { setCorsHeaders } from '../_lib/claude.js';
import { requireOperatorAuth } from '../_lib/auth.js';
import { getSupabase } from '../_lib/supabase.js';
import { runDeployChainWorkerMutation } from '../_lib/deployChainWorker.js';
import { createBuildProofRunId, createBuildRequestId } from '../_lib/buildExecutionWorker.js';
import { runBuild } from '../../src/lib/forge/buildRunner.js';
import { dispatch as orchestraDispatch } from '../../src/lib/orchestra/index.js';
import { createToolIntelligenceService, MODES } from '../../src/lib/tools/ToolIntelligenceService.js';
import { redactSecrets } from '../../src/lib/tools/toolDispatchContract.js';

const PROOF_PRODUCT_ID = 'build-failover-production-proof';
const PROOF_DEPLOYMENT_PROJECT = 'flowai-build-failover-proof';
const PROOF_DELIVERY_OWNER = 'veu-ai-studio';
const PROOF_DELIVERY_REPO = 'flowai-creator-delivery-sandbox';
const PROOF_TIMEOUT_MS = 5_000;

function runtimeCommit() {
  return String(
    process.env.FLOWAI_EXPECTED_HEAD ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    'unknown',
  );
}

function createProofDispatch(baseDispatch = orchestraDispatch) {
  let consumed = false;
  return async function dispatchWithForcedCodexHang(action, payload, opts = {}) {
    if (!consumed && action === 'code-patch' && opts?.memberId === 'codex') {
      consumed = true;
      return new Promise(() => {});
    }
    return baseDispatch(action, payload, opts);
  };
}

function createServerToolService() {
  const client = getSupabase();
  if (!client) {
    throw new Error('Tool Intelligence client is not configured; cannot run Build failover proof.');
  }
  return createToolIntelligenceService({ client });
}

function runPrecreatedDeliverySandboxMutation(args) {
  return runDeployChainWorkerMutation({
    ...args,
    env: {
      ...process.env,
      FLOWAI_DEPLOY_CHAIN_SANDBOX_OWNER: PROOF_DELIVERY_OWNER,
      FLOWAI_DEPLOY_CHAIN_SANDBOX_REPO: PROOF_DELIVERY_REPO,
    },
  });
}

function proofStamp(now = new Date()) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function createBuildFailoverProofRequest(now = new Date()) {
  const commit = runtimeCommit();
  const shortCommit = commit.slice(0, 7) || 'unknown';
  const proofRunId = createBuildProofRunId(now).replace('flowai-build-', 'flowai-build-failover-').replace(/-[a-z0-9]{8}$/i, `-${shortCommit}`);
  const fallbackProofRunId = `flowai-build-failover-${proofStamp(now)}-${shortCommit}`;
  const safeProofRunId = /^[a-zA-Z0-9._-]+$/.test(proofRunId) ? proofRunId : fallbackProofRunId;
  const buildRequestId = createBuildRequestId(now).replace('request-flowai-build-', 'request-flowai-build-failover-').replace(/-[a-z0-9]{8}$/i, `-${shortCommit}`);

  return Object.freeze({
    proofRunId: safeProofRunId,
    buildRequestId,
    productId: PROOF_PRODUCT_ID,
    deliveryMode: 'deploy-chain-sandbox',
    deploymentProjectName: PROOF_DEPLOYMENT_PROJECT,
    deliverySandboxFullName: `${PROOF_DELIVERY_OWNER}/${PROOF_DELIVERY_REPO}`,
    deliveryCredentialSource: 'GITHUB_DELIVERY_TOKEN',
    toolDispatchTimeoutMs: PROOF_TIMEOUT_MS,
    targetFilePath: 'src/App.jsx',
    sourceContent: 'export default function App() { return <main><h1>Build failover proof input</h1><p>Before failover.</p><button>Before action</button></main>; }',
    manualInputs: Object.freeze({
      'build-decision-log': 'Reliability Result 1 proof: force Codex hang, require ranked failover to Claude Code.',
    }),
    designOutput: Object.freeze({
      readyForBuild: false,
      stepId: 'step-2-design',
      productId: PROOF_PRODUCT_ID,
      matrixArtifactVersion: 'reliability-result-1',
      sections: Object.freeze([
        Object.freeze({
          id: 'design-gaps',
          label: 'Design Gaps',
          source: 'derived',
          input: Object.freeze([
            Object.freeze({
              sectionId: 'reliability-gap',
              downstreamRisk: 'Build selected tool can hang unless failover recovers.',
            }),
          ]),
        }),
        Object.freeze({
          id: 'design-decision-log',
          label: 'Design Decision Log',
          source: 'manual',
          input: Object.freeze([
            `MINIMUM BUILD DIRECTIVE: produce a runnable Vite React App component for proofRunId ${safeProofRunId}. The visible page must include the exact text FlowAI Build Failover recovered by Claude Code and the proofRunId. Keep it simple and usable.`,
          ]),
        }),
      ]),
    }),
    buildProofControls: Object.freeze({
      forceHangOnce: Object.freeze({
        action: 'code-patch',
        memberId: 'codex',
        reason: 'Reliability Result 1 forced Build hang proof',
      }),
    }),
    runtimeCommit: commit,
  });
}

function writeEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(redactSecrets(data ?? null))}\n\n`);
  res.flush?.();
}

function attemptMessage(attempt = {}) {
  const tool = attempt.tool || attempt.memberId || 'tool';
  if (attempt.state === 'selected') return `${tool} selected`;
  if (attempt.state === 'timeout') return `${tool} timeout`;
  if (attempt.state === 'unavailable') return `${tool} unavailable`;
  if (attempt.state === 'failed') return `${tool} failed`;
  if (attempt.state === 'succeeded') return `${tool} recovered`;
  if (attempt.state === 'final_failed') return 'Build failover exhausted all candidates';
  return `${tool} ${attempt.state || 'attempt'}`;
}

function finalSummary({ output, proofRequest, startedAt }) {
  const attemptHistory = output?.toolSelection?.attemptHistory ?? [];
  return Object.freeze({
    ok: true,
    status: 'SUCCESS',
    startedAt,
    completedAt: new Date().toISOString(),
    proofRunId: proofRequest.proofRunId,
    buildRequestId: proofRequest.buildRequestId,
    runtimeCommit: proofRequest.runtimeCommit,
    deliveryMode: 'DEPLOY_CHAIN_SANDBOX',
    deploymentProjectName: PROOF_DEPLOYMENT_PROJECT,
    deliverySandboxFullName: `${PROOF_DELIVERY_OWNER}/${PROOF_DELIVERY_REPO}`,
    toolDispatchTimeoutMs: PROOF_TIMEOUT_MS,
    attemptHistory,
    evidenceSummary: output?.evidenceSummary ?? null,
    deployedUrl: output?.evidenceSummary?.deployChainUrl ?? null,
    sandboxCommitSha: output?.evidenceSummary?.sandboxCommitSha ?? null,
    claimBoundary: {
      maximumClaim: 'BUILD FAILOVER watch proof candidate; production claim requires non-builder adjudication',
      excludedClaims: [
        'CREATOR_VERIFIED',
        'UPGRADER_VERIFIED',
        'UNIVERSAL_ENGINE_VERIFIED',
        'Persistence proven',
      ],
    },
  });
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

  const ctx = await requireOperatorAuth(req, res);
  if (!ctx) return;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Connection', 'keep-alive');

  const startedAt = new Date().toISOString();
  const proofRequest = createBuildFailoverProofRequest(new Date());
  const attempts = [];

  try {
    writeEvent(res, 'start', {
      proofRunId: proofRequest.proofRunId,
      buildRequestId: proofRequest.buildRequestId,
      runtimeCommit: proofRequest.runtimeCommit,
      message: 'Build failover proof started',
    });

    const output = await runBuild(PROOF_PRODUCT_ID, proofRequest.designOutput, proofRequest.manualInputs, {
      productId: PROOF_PRODUCT_ID,
      buildRequestId: proofRequest.buildRequestId,
      proofRunId: proofRequest.proofRunId,
      runId: proofRequest.proofRunId,
      toolService: createServerToolService(),
      toolIntelligenceMode: MODES.AUTOMATIC,
      sourceContent: proofRequest.sourceContent,
      targetFilePath: proofRequest.targetFilePath,
      framework: 'vite-react',
      env: process.env,
      dispatch: createProofDispatch(),
      toolDispatchTimeoutMs: proofRequest.toolDispatchTimeoutMs,
      mutationExecutor: runPrecreatedDeliverySandboxMutation,
      deploymentProjectName: proofRequest.deploymentProjectName,
      onToolAttempt: (attempt) => {
        attempts.push(attempt);
        writeEvent(res, 'attempt', {
          proofRunId: proofRequest.proofRunId,
          message: attemptMessage(attempt),
          attempt,
        });
      },
    });

    writeEvent(res, 'final', finalSummary({ output, proofRequest, startedAt }));
    writeEvent(res, 'done', { proofRunId: proofRequest.proofRunId });
    return res.end();
  } catch (error) {
    writeEvent(res, 'error', {
      ok: false,
      status: 'BLOCK',
      proofRunId: proofRequest.proofRunId,
      message: error?.message || 'Build failover proof failed.',
      error: error?.name || 'BuildFailoverProofError',
      attempts,
      details: error?.details ?? null,
    });
    writeEvent(res, 'done', { proofRunId: proofRequest.proofRunId, failed: true });
    return res.end();
  }
}

export const __test = Object.freeze({
  attemptMessage,
  createBuildFailoverProofRequest,
});
