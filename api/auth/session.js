// GET    /api/auth/session — verify a session token, return the active user
// DELETE /api/auth/session — revoke the session (sign-out)
//
// Token passed via:
//   Authorization: Bearer <token>
//   OR ?token=<token> in the query string (less safe; only use server-to-server)
//
// Used by Base44's UI after sign-in to validate session state on subsequent
// requests, and by /api/auth/sign-out to revoke.

import { setCorsHeaders } from '../_lib/claude.js';
import { withRequestLog } from '../_lib/requestLog.js';
import { getSession, revokeSession } from '../_lib/authBackend.js';

function extractToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return req.query?.token || null;
}

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = extractToken(req);
  if (!token) return res.status(401).json({ ok: false, reason: 'no_token' });

  if (req.method === 'GET') {
    const session = getSession(token);
    if (!session) return res.status(401).json({ ok: false, reason: 'invalid_or_expired' });
    return res.status(200).json({
      ok: true,
      session: {
        user_id: session.user_id,
        product_id: session.product_id,
        org_id: session.org_id,
        issued_at: new Date(session.issued_at).toISOString(),
        expires_at: new Date(session.expires_at).toISOString(),
      },
    });
  }

  if (req.method === 'DELETE') {
    const ok = revokeSession(token);
    return res.status(200).json({ ok });
  }

  return res.status(405).json({ error: 'Use GET or DELETE' });
}

export default withRequestLog(handler, { endpoint: '/api/auth/session' });
