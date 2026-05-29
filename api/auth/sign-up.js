// POST /api/auth/sign-up
// Body: { email, password, product_id, org_id?, metadata? }
//
// Generic, multi-tenant, product-scoped registration handler. PressAI's UI
// (when Base44 wires it) POSTs here from /sign-up to create a real user
// record. Same endpoint serves SAIGE, MyPregLife, RelTwin, ReachSMS — each
// keyed by (org_id, product_id, email).
//
// Closes the backend half of audit issue P0-001 ("/sign-up returns 404").
// Base44 still needs to ship the route + form; once shipped, point its
// onSubmit handler at this URL.

import { setCorsHeaders } from '../_lib/claude.js';
import { withRequestLog } from '../_lib/requestLog.js';
import { resolveOrgId } from '../_lib/tenant.js';
import {
  createUser, createSession, userToPublic, isValidEmail,
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
  if (!rateLimitOk({ ip, endpoint: 'sign-up', max: 5, windowMs: 60_000 })) {
    return res.status(429).json({ error: 'Too many sign-up attempts. Please retry in a minute.' });
  }

  const { email, password, product_id: productId, org_id: bodyOrgId, metadata } = req.body || {};
  const orgId = resolveOrgId(req) || bodyOrgId || DEFAULT_ORG;

  if (!productId) return res.status(400).json({ error: 'product_id required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' });
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const user = createUser({
      email, password, productId, orgId,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
    const session = createSession({ userId: user.id, productId, orgId });

    await appendAuditEntry({
      actionType: 'auth.sign_up',
      severity: 'info',
      orgId, productId,
      detail: { user_id: user.id, ip },
    }).catch(() => {});

    logger.info('auth.sign_up', { orgId, productId, userId: user.id, ip });

    return res.status(201).json({
      ok: true,
      user: userToPublic(user),
      session: { token: session.token, expires_at: new Date(session.expires_at).toISOString() },
    });
  } catch (e) {
    if (/already exists/i.test(e.message)) {
      return res.status(409).json({ error: 'A user with this email already exists for this product' });
    }
    if (/Password|email/i.test(e.message)) {
      return res.status(400).json({ error: e.message });
    }
    logger.error('auth.sign_up.failed', { error: e.message });
    return res.status(500).json({ error: 'Sign-up failed', details: e.message });
  }
}

export default withRequestLog(handler, { endpoint: '/api/auth/sign-up' });
