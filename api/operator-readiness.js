// GET /api/operator-readiness
//
// Redacted production readiness probe for operator credentials. The response
// exposes only PRESENT/MISSING status per credential and never returns values.

import { getOperatorCredentialReadiness } from '../src/lib/operatorCredentialReadiness.js';
import { withRequestLog } from './_lib/requestLog.js';
import { setCorsHeaders } from './_lib/claude.js';

async function operatorReadinessHandler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Use GET' });

  return res.status(200).json(getOperatorCredentialReadiness());
}

export default withRequestLog(operatorReadinessHandler, { endpoint: '/api/operator-readiness' });
