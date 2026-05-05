// GET /api/orchestrator/status/:run_id  →  307 redirect to
// /api/orchestrator/run?run_id=<id>
//
// The canonical status endpoint is now co-located with /api/orchestrator/run
// so polls hit the same function instance pool as the POST that created the
// run. (Across Vercel functions in-memory state isn't shared; this restores
// at-warmth-affinity reliability without yet needing Supabase.)
//
// This shim stays so the spec'd path /api/orchestrator/status/:run_id still
// works for existing clients.

import { setCorsHeaders } from '../../_lib/claude.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const runId = req.query?.run_id;
  if (!runId) return res.status(400).json({ error: 'Missing run_id in path' });

  // Internal forward — fetch directly so we return JSON in the same response,
  // not a 307 redirect (avoids polling clients having to follow redirects).
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const target = `${proto}://${host}/api/orchestrator/run?run_id=${encodeURIComponent(runId)}`;
  try {
    const r = await fetch(target, { headers: { 'x-flowai-internal': '1' } });
    const text = await r.text();
    res.status(r.status);
    res.setHeader('content-type', r.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ error: 'status forward failed', details: e.message });
  }
}
