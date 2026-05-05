// GET /api/me
// Returns the authenticated user + organization context, or anonymous shape
// when AUTH_REQUIRED is false and no Clerk session is present.

import { setCorsHeaders } from './_lib/claude.js';
import { withRequestLog } from './_lib/requestLog.js';
import { getRequestContext, isAuthRequired, isClerkConfigured } from './_lib/auth.js';

async function meHandler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const ctx = await getRequestContext(req);

  return res.status(200).json({
    authenticated: ctx.authenticated,
    authMode: ctx.authMode,
    userId: ctx.userId,
    orgId: ctx.orgId,
    productId: ctx.productId,
    config: {
      authRequired: isAuthRequired(),
      clerkConfigured: isClerkConfigured(),
    },
  });
}

export default withRequestLog(meHandler, { endpoint: '/api/me' });
