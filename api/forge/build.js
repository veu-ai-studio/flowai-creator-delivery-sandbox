// POST /api/forge/build
//
// BuildExecutionWorker M1 entrypoint. This is the committed server-side Build
// request path that keeps credentials out of the browser while still entering
// the real forge runBuild -> Tool Intelligence -> selected tool dispatch path.

import { setCorsHeaders } from '../_lib/claude.js';
import { requireOperatorAuth } from '../_lib/auth.js';
import { getSupabase } from '../_lib/supabase.js';
import {
  BuildExecutionWorkerError,
  createBuildProofRunId,
  createBuildRequestId,
  runBuildExecutionWorkerMutation,
  statusCodeForBuildExecutionWorkerResult,
} from '../_lib/buildExecutionWorker.js';
import { runDeployChainWorkerMutation } from '../_lib/deployChainWorker.js';
import { runBuild } from '../../src/lib/forge/buildRunner.js';
import { dispatch as orchestraDispatch } from '../../src/lib/orchestra/index.js';
import { createToolIntelligenceService, MODES } from '../../src/lib/tools/ToolIntelligenceService.js';
import { redactSecrets } from '../../src/lib/tools/toolDispatchContract.js';

const APPROVED_DEPLOY_CHAIN_PROJECTS = new Set([
  'flowai-m2-deploy-chain-proof',
  'flowai-m3-upgrader-proof',
  'flowai-build-failover-proof',
]);

const MIN_PROOF_TIMEOUT_MS = 1_000;
const MAX_PROOF_TIMEOUT_MS = 60_000;

function block(message, code, status = 503, details = null) {
  throw new BuildExecutionWorkerError(message, { status, code, details });
}

function createServerToolService() {
  const client = getSupabase();
  if (!client) {
    block('Tool Intelligence client is not configured; cannot prove selected-tool dispatch.', 'TOOL_INTELLIGENCE_CLIENT_MISSING');
  }
  return createToolIntelligenceService({ client });
}

function requiredString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    block(`${name} is required for BuildExecutionWorker M1.`, `${name.toUpperCase()}_MISSING`, 400);
  }
  return value;
}

function publicError(error) {
  const status = error?.code === 'SANDBOX_BOUNDARY_STOP' ? 'STOP' : 'BLOCK';
  return {
    ok: false,
    status,
    error: error?.code || 'BUILD_EXECUTION_WORKER_FAILED',
    message: error?.message || 'BuildExecutionWorker M1 failed.',
    details: redactSecrets(error?.details || null),
    claimBoundary: {
      maximumClaim: 'No BuildExecutionWorker claim moves',
      excludedClaims: [
        'BUILD_EXECUTION_VERIFIED',
        'CREATOR_VERIFIED',
        'UPGRADER_VERIFIED',
        'UNIVERSAL_ENGINE_VERIFIED',
        'Production autonomous execution',
        'Deploy proven',
        'Persistence proven',
        'Behavioral verification proven',
      ],
    },
  };
}

function resolveMutationExecutor(body) {
  if (body.deliveryMode === 'deploy-chain-sandbox') {
    if (body.deployTarget && body.deployTarget !== 'flowai-deploy-execution-sandbox') {
      block('Deploy Chain target is not the approved deployable sandbox.', 'DEPLOY_CHAIN_SANDBOX_BOUNDARY_STOP', 409, {
        requestedTarget: body.deployTarget,
        approvedTarget: 'flowai-deploy-execution-sandbox',
      });
    }
    return {
      executor: runDeployChainWorkerMutation,
      label: 'DEPLOY_CHAIN_SANDBOX',
    };
  }
  return {
    executor: runBuildExecutionWorkerMutation,
    label: 'BUILD_EXECUTION_WORKER_STAGE1',
  };
}

function resolveDeploymentProjectName(body) {
  if (body.deliveryMode !== 'deploy-chain-sandbox') return null;
  const value = typeof body.deploymentProjectName === 'string' ? body.deploymentProjectName.trim() : '';
  if (!value) return null;
  if (!APPROVED_DEPLOY_CHAIN_PROJECTS.has(value)) {
    block('Deploy Chain Vercel project is not approved for proof execution.', 'DEPLOY_CHAIN_PROJECT_BOUNDARY_STOP', 409, {
      requestedProjectName: value,
      approvedProjectNames: Array.from(APPROVED_DEPLOY_CHAIN_PROJECTS),
    });
  }
  return value;
}

function resolveToolDispatchTimeoutMs(body) {
  if (body.toolDispatchTimeoutMs == null) return undefined;
  const value = Number(body.toolDispatchTimeoutMs);
  if (!Number.isFinite(value) || value < MIN_PROOF_TIMEOUT_MS || value > MAX_PROOF_TIMEOUT_MS) {
    block('toolDispatchTimeoutMs must be between 1000 and 60000 milliseconds.', 'TOOL_DISPATCH_TIMEOUT_OUT_OF_RANGE', 400, {
      min: MIN_PROOF_TIMEOUT_MS,
      max: MAX_PROOF_TIMEOUT_MS,
    });
  }
  return Math.round(value);
}

function resolveBuildProofControls(body) {
  const controls = body.buildProofControls;
  if (!controls || typeof controls !== 'object') {
    return Object.freeze({
      enabled: false,
      forceHangOnce: null,
    });
  }

  const forceHangOnce = controls.forceHangOnce;
  if (!forceHangOnce) {
    return Object.freeze({
      enabled: false,
      forceHangOnce: null,
    });
  }
  const action = forceHangOnce.action || 'code-patch';
  const memberId = forceHangOnce.memberId;
  if (action !== 'code-patch') {
    block('Build proof forced hangs are limited to code-patch dispatch.', 'BUILD_PROOF_FORCE_HANG_ACTION_BLOCKED', 400, {
      action,
    });
  }
  if (typeof memberId !== 'string' || memberId.trim().length === 0) {
    block('buildProofControls.forceHangOnce.memberId is required.', 'BUILD_PROOF_FORCE_HANG_MEMBER_MISSING', 400);
  }
  return Object.freeze({
    enabled: true,
    forceHangOnce: Object.freeze({
      action,
      memberId: memberId.trim(),
      reason: typeof forceHangOnce.reason === 'string' ? forceHangOnce.reason.slice(0, 240) : 'forced proof hang',
    }),
  });
}

function createBuildProofDispatch(proofControls, baseDispatch = orchestraDispatch) {
  const forced = proofControls?.forceHangOnce;
  if (!forced) return baseDispatch;
  let consumed = false;
  return async function dispatchWithForcedHang(action, payload, opts = {}) {
    if (!consumed && action === forced.action && opts?.memberId === forced.memberId) {
      consumed = true;
      return new Promise(() => {});
    }
    return baseDispatch(action, payload, opts);
  };
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

  const ctx = await requireOperatorAuth(req, res);
  if (!ctx) return;

  const body = req.body || {};
  const now = new Date();
  const buildRequestId = body.buildRequestId || createBuildRequestId(now);
  const proofRunId = body.proofRunId || createBuildProofRunId(now);

  try {
    const productId = requiredString(body.productId || ctx.productId || 'build-execution-worker-m1', 'productId');
    const sourceContent = requiredString(body.sourceContent, 'sourceContent');
    const targetFilePath = body.targetFilePath || 'src/App.jsx';
    const designOutput = body.designOutput && typeof body.designOutput === 'object'
      ? body.designOutput
      : block('designOutput is required for the real Build path.', 'DESIGN_OUTPUT_MISSING', 400);
    const manualInputs = body.manualInputs && typeof body.manualInputs === 'object' ? body.manualInputs : {};
    const toolService = createServerToolService();
    const mutationMode = resolveMutationExecutor(body);
    const deploymentProjectName = resolveDeploymentProjectName(body);
    const buildProofControls = resolveBuildProofControls(body);
    const toolDispatchTimeoutMs = resolveToolDispatchTimeoutMs(body);

    const output = await runBuild(productId, designOutput, manualInputs, {
      productId,
      buildRequestId,
      proofRunId,
      runId: proofRunId,
      toolService,
      toolIntelligenceMode: MODES.AUTOMATIC,
      sourceContent,
      targetFilePath,
      framework: body.framework || 'vite-react',
      env: process.env,
      dispatch: createBuildProofDispatch(buildProofControls),
      toolDispatchTimeoutMs,
      mutationExecutor: mutationMode.executor,
      deploymentProjectName,
    });
    const deployChainCandidate = Boolean(output.evidenceSummary?.deployChainUrl);

    const response = {
      ok: true,
      status: 'SUCCESS',
      buildRequestId,
      proofRunId,
      productId,
      deliveryMode: mutationMode.label,
      buildProofControls: buildProofControls.enabled ? buildProofControls : null,
      buildOutput: output,
      claimBoundary: {
        maximumClaim: deployChainCandidate
          ? 'DEPLOY CHAIN DEMONSTRATED candidate evidence; runnable selected-tool output reached a public URL'
          : output.evidenceSummary?.sandboxMutations > 0
          ? 'BUILD-PATH DISPATCH DEMONSTRATED; BuildExecutionWorker Stage 1 Complete'
          : 'Selected tool dispatched; no sandbox mutation claim moves',
        excludedClaims: deployChainCandidate ? [
          'BUILD_EXECUTION_VERIFIED',
          'CREATOR_VERIFIED',
          'UPGRADER_VERIFIED',
          'UNIVERSAL_ENGINE_VERIFIED',
          'Production autonomous execution',
          'Persistence proven',
          'Behavioral product improvement proven',
        ] : [
          'BUILD_EXECUTION_VERIFIED',
          'CREATOR_VERIFIED',
          'UPGRADER_VERIFIED',
          'UNIVERSAL_ENGINE_VERIFIED',
          'Production autonomous execution',
          'Deploy proven',
          'Persistence proven',
          'Behavioral verification proven',
        ],
      },
    };
    const status = output.evidenceSummary?.sandboxMutations > 0
      ? 200
      : statusCodeForBuildExecutionWorkerResult({ ok: false, status: 'BLOCK' });
    return res.status(status).json(redactSecrets(response));
  } catch (error) {
    const response = publicError(error);
    const status = error instanceof BuildExecutionWorkerError ? error.status : 500;
    return res.status(status).json(response);
  }
}

export const __test = Object.freeze({
  createBuildProofDispatch,
  resolveBuildProofControls,
  resolveToolDispatchTimeoutMs,
});
