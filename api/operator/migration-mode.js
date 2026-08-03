import { getMigrationModeFlag } from '../../src/lib/runtimeFeatureFlags.js';
import { withRequestLog } from '../_lib/requestLog.js';
import { setCorsHeaders } from '../_lib/claude.js';
import { requireOperatorAuth } from '../_lib/auth.js';

async function handler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Use GET' });
  const auth = await requireOperatorAuth(req, res);
  if (!auth) return;

  const flag = await getMigrationModeFlag();
  return res.status(200).json({ ok: true, enabled: flag.enabled, source: flag.source });
}

export default withRequestLog(handler, { endpoint: '/api/operator/migration-mode' });
