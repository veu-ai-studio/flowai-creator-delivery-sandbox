// POST /api/runtime-dispatch-authority-proof
//
// Narrow proof endpoint for W04 Milestone 0: FlowAI Runtime Dispatch Authority.
// This is not BuildExecutionWorker, not product upgrade execution, and not a
// production autonomous-execution claim. It proves only that a committed
// FlowAI runtime path can dispatch the approved sandbox runner and ingest the
// matching result.

import { setCorsHeaders } from './_lib/claude.js';
import { requireOperatorAuth } from './_lib/auth.js';
import {
  RuntimeDispatchProofError,
  runRuntimeDispatchAuthorityProof,
  statusCodeForRuntimeDispatchResult,
} from './_lib/runtimeDispatchAuthorityProof.js';

function publicError(error) {
  return {
    ok: false,
    status: error?.code === 'SANDBOX_BOUNDARY_STOP' ? 'STOP' : 'BLOCK',
    error: error?.code || 'RUNTIME_DISPATCH_PROOF_FAILED',
    message: error?.message || 'Runtime dispatch authority proof failed.',
    details: error?.details || null,
    claimBoundary: {
      maximumClaim: 'No FlowAI runtime dispatch authority claim moves',
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
  };
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

  const ctx = await requireOperatorAuth(req, res);
  if (!ctx) return;

  try {
    const result = await runRuntimeDispatchAuthorityProof();
    return res.status(statusCodeForRuntimeDispatchResult(result)).json(result);
  } catch (error) {
    const response = publicError(error);
    const status = error instanceof RuntimeDispatchProofError ? error.status : 500;
    return res.status(status).json(response);
  }
}
