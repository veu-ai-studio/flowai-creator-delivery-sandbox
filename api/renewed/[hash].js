// GET /api/renewed/<hash>
//
// Serves the renewed HTML body stored by api/_lib/renewalEngine.js#renew().
// Hash is the SHA-256 prefix returned in the before/after report's
// renewedHash field.

import { fetchRenewed } from '../_lib/renewalEngine.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Use GET' });
  }
  const { hash } = req.query || {};
  if (typeof hash !== 'string' || !/^[a-f0-9]{8,64}$/i.test(hash)) {
    return res.status(400).json({ error: 'Invalid renewal hash' });
  }
  const html = await fetchRenewed(hash);
  if (!html) {
    return res.status(404).send(
      '<!doctype html><html><head><meta charset="utf-8"><title>Renewal not found</title></head>' +
      '<body style="font-family:system-ui;padding:40px;max-width:560px;margin:auto;">' +
      '<h1>Renewal not found</h1>' +
      '<p>This renewal hash is not in storage. Renewals expire after 7 days. ' +
      'Re-submit the input on the Renewal workspace to generate a fresh preview.</p>' +
      '</body></html>'
    );
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Allow the parent FlowAI page to iframe the renewed HTML same-origin.
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(html);
}
