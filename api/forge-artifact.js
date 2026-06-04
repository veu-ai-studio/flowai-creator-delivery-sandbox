// POST /api/forge-artifact
// Persists a forge step artifact to ProductSSOT. This endpoint is hard-auth
// gated: public forge runs may execute, but persistence requires an ambient
// operator session or the existing internal proof bypass.

import { setCorsHeaders } from './_lib/claude.js';
import { requireAuthHard } from './_lib/auth.js';
import { getSupabase } from './_lib/supabase.js';
import { persistForgeStepArtifact } from '../src/lib/forge/productSsotArtifactWriter.js';

function readBody(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

  const auth = await requireAuthHard(req, res);
  if (!auth) return;

  const body = readBody(req);
  const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
  const stepKey = typeof body.stepKey === 'string' ? body.stepKey.trim() : '';
  if (!productId || !stepKey) {
    return res.status(400).json({ ok: false, error: 'productId and stepKey are required' });
  }

  const supabase = getSupabase();
  const result = await persistForgeStepArtifact({
    productId,
    environment: body.environment || 'prd',
    runId: body.runId,
    stepKey,
    stepLabel: body.stepLabel,
    artifact: body.artifact || {},
    mode: body.mode || 'GUIDED',
    runtime: body.runtime || 'offline',
    evidenceTier: body.evidenceTier || 'B',
    proofLabel: body.proofLabel || 'UNIT',
    source: body.source || 'forge',
    writtenBy: auth.userId || auth.authMode || 'operator',
    supabase,
  });

  if (!result.ok) {
    return res.status(200).json({
      ok: false,
      persisted: false,
      state: result.state || 'failed',
      reason: result.reason || 'persist_failed',
    });
  }

  return res.status(200).json({
    ok: true,
    persisted: true,
    state: result.state,
    version: result.version,
    versionId: result.versionId,
    snapshotHash: result.snapshotHash,
    prevHash: result.prevHash,
  });
}
