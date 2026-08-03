// GET  /api/audit-log?since=&sessionId=&productId=&severity=&actionType=&limit=
// POST /api/audit-log    body: { actionType, severity, sessionId?, productId?, productUrl?, detail?, actor?, orgId? }
//                        Or batch: { entries: [...] }
//
// Routes through db.js so the same endpoint works on memory or Supabase.

import { setCorsHeaders } from './_lib/claude.js';
import { appendAuditEntry, listAuditEntries } from './_lib/db.js';
import { resolveProductId } from './_lib/tenant.js';
import { requireAuthHard } from './_lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const ctx = await requireAuthHard(req, res);
  if (!ctx) return;

  const orgId = ctx.orgId;

  try {
    if (req.method === 'GET') {
      const { since, sessionId, productId, severity, actionType, limit } = req.query || {};
      const entries = await listAuditEntries({
        orgId,
        since: since ? Number(since) : undefined,
        sessionId, productId, severity, actionType,
        limit: limit ? parseInt(limit, 10) : 200,
      });
      return res.status(200).json({ entries });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (Array.isArray(body.entries)) {
        const added = [];
        for (const e of body.entries) {
          added.push(await appendAuditEntry({ orgId: orgId || e.orgId, ...e }));
        }
        return res.status(201).json({ ok: true, added });
      }
      if (!body.actionType) return res.status(400).json({ error: 'actionType required' });
      const entry = await appendAuditEntry({
        orgId: orgId || body.orgId,
        productId: body.productId || resolveProductId(req),
        ...body,
      });
      return res.status(201).json({ ok: true, entry });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
