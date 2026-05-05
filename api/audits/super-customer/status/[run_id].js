// GET /api/audits/super-customer/status/:run_id
// Path alias for the colocated GET on /api/audits/super-customer/run.
// Forwards internally so polls land on the same function instance pool as
// the original POST dispatch (in-memory affinity).

import { setCorsHeaders } from '../../../_lib/claude.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const runId = req.query?.run_id;
  if (!runId) return res.status(400).json({ error: 'Missing run_id in path' });

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const target = `${proto}://${host}/api/audits/super-customer/run?run_id=${encodeURIComponent(runId)}`;
  try {
    const headers = { 'x-flowai-internal': '1' };
    if (req.headers['x-flowai-org-id']) headers['x-flowai-org-id'] = req.headers['x-flowai-org-id'];
    const r = await fetch(target, { headers });
    const text = await r.text();
    res.status(r.status);
    res.setHeader('content-type', r.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ error: 'status forward failed', details: e.message });
  }
}
