import { requireOperatorAuth } from '../_lib/auth.js';
import { setMigrationModeFlag } from '../../src/lib/runtimeFeatureFlags.js';
import { withRequestLog } from '../_lib/requestLog.js';
import { setCorsHeaders } from '../_lib/claude.js';
import { clientIp, rateLimitOk } from '../_lib/authBackend.js';
import { requireSameSiteForStateChange } from '../_lib/csrf.js';

async function handler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

  if (!rateLimitOk({ ip: clientIp(req), endpoint: 'operator-enable-migration', max: 5, windowMs: 60_000 })) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ ok: false, error: 'Rate limit exceeded' });
  }

  const auth = await requireOperatorAuth(req, res);
  if (!auth) return;
  if (!requireSameSiteForStateChange(req, res)) return;

  const result = await setMigrationModeFlag(true);
  return res.status(200).json({ ok: true, enabled: true, transport: result.transport });
}

export default withRequestLog(handler, { endpoint: '/api/operator/enable-migration-mode' });
