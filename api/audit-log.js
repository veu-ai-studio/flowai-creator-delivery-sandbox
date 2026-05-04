// GET  /api/audit-log?since=&sessionId=&productId=&severity=&actionType=&limit=
// POST /api/audit-log    body: { actionType, severity, sessionId?, productId?, productUrl?, detail?, actor? }
//                        Also accepts { entries: [...] } from clients to merge in.

import { setCorsHeaders } from './_lib/claude.js';
import { append, readLog } from './_lib/auditlog.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const { since, sessionId, productId, severity, actionType, limit } = req.query || {};
    const entries = readLog({
      since: since ? Number(since) : undefined,
      sessionId, productId, severity, actionType,
      limit: limit ? parseInt(limit, 10) : 200,
    });
    return res.status(200).json({ entries });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    if (Array.isArray(body.entries)) {
      const added = body.entries.map((e) => append(e));
      return res.status(201).json({ ok: true, added });
    }
    if (!body.actionType) return res.status(400).json({ error: 'actionType required' });
    const entry = append(body);
    return res.status(201).json({ ok: true, entry });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
