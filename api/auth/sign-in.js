// POST /api/auth/sign-in
// Body: { email, password, product_id, org_id? }
//
// Generic, multi-tenant, product-scoped login handler. Returns a session
// token + the user object on success; returns 401 with { ok: false,
// reason: 'invalid_credentials' } on bad password or unknown email.
//
// Closes the backend half of audit issue P0-002 ("/sign-in renders the
// marketing landing page instead of a login form"). Base44 needs to ship
// the route + form; once shipped, point its onSubmit handler at this URL.

import { setCorsHeaders } from '../_lib/claude.js';
import { withRequestLog } from '../_lib/requestLog.js';
import { resolveOrgId } from '../_lib/tenant.js';
import {
  authenticateUser, createSession, userToPublic, isValidEmail,
  rateLimitOk, clientIp,
} from '../_lib/authBackend.js';
import { appendAuditEntry } from '../_lib/db.js';
import { logger } from '../_lib/logger.js';

const DEFAULT_ORG = 'veu-ai-studio';

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const ip = clientIp(req);
  // Stricter limit on sign-in vs sign-up — credential stuffing target.
  if (!rateLimitOk({ ip, endpoint: 'sign-in', max: 10, windowMs: 60_000 })) {
    return res.status(429).json({ error: 'Too many sign-in attempts. Please retry in a minute.' });
  }

  const { email, password, product_id: productId, org_id: bodyOrgId } = req.body || {};
  const orgId = resolveOrgId(req) || bodyOrgId || DEFAULT_ORG;

  if (!productId) return res.status(400).json({ error: 'product_id required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' });
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const result = authenticateUser({ email, password, productId, orgId });
  if (!result.ok) {
    await appendAuditEntry({
      actionType: 'auth.sign_in.failed',
      severity: 'warning',
      orgId, productId,
      detail: { email: email.toLowerCase(), ip, reason: result.reason },
    }).catch(() => {});
    // Always return the same shape on auth failure — don't disclose whether
    // the email exists vs the password is wrong (timing-safe by design in
    // verifyPassword + uniform reason 'invalid_credentials').
    return res.status(401).json({ ok: false, reason: 'invalid_credentials' });
  }

  const session = createSession({ userId: result.user.id, productId, orgId });

  await appendAuditEntry({
    actionType: 'auth.sign_in',
    severity: 'info',
    orgId, productId,
    detail: { user_id: result.user.id, ip },
  }).catch(() => {});

  logger.info('auth.sign_in', { orgId, productId, userId: result.user.id, ip });

  return res.status(200).json({
    ok: true,
    user: userToPublic(result.user),
    session: { token: session.token, expires_at: new Date(session.expires_at).toISOString() },
  });
}

export default withRequestLog(handler, { endpoint: '/api/auth/sign-in' });
