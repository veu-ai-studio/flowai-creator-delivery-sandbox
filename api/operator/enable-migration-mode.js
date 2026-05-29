import { requireOperatorAuth } from '../_lib/auth.js';
import { setMigrationModeFlag } from '../../src/lib/runtimeFeatureFlags.js';
import { withRequestLog } from '../_lib/requestLog.js';
import { setCorsHeaders } from '../_lib/claude.js';

async function handler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

  const auth = await requireOperatorAuth(req, res);
  if (!auth) return;

  const result = await setMigrationModeFlag(true);
  return res.status(200).json({ ok: true, enabled: true, transport: result.transport });
}

export default withRequestLog(handler, { endpoint: '/api/operator/enable-migration-mode' });
