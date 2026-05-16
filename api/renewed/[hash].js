// GET /api/renewed/<hash>
//
// **DEPRECATED endpoint** — returns 410 Gone.
//
// This route used to serve static-HTML renewals stored in Vercel KV by the
// pre-Orchestra version of `api/_lib/renewalEngine.js#renew()`. The
// Orchestra refactor (commit `1408ee7`) replaced that storage layer with
// real Vercel preview deployments — the renewal pipeline now returns a
// `renewedUrl` pointing at a freshly-built preview deployment rather than
// an HTML blob keyed by hash.
//
// S-2 fix (W4 adversarial bd2f923): the prior code path imported
// `fetchRenewed` from `../_lib/renewalEngine.js`, but that symbol no
// longer exists (refactor regression). Calling `await fetchRenewed(hash)`
// threw `TypeError: fetchRenewed is not a function` → 500. Replacing with
// a honest 410 + pointer to the current flow eliminates the 500 and tells
// the caller what to do instead.

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Use GET' });
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).send(
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<title>Renewal endpoint deprecated</title>' +
      '</head><body style="font-family:system-ui;padding:40px;max-width:640px;margin:auto;line-height:1.5;">' +
      '<h1>This endpoint is deprecated</h1>' +
      '<p><code>/api/renewed/&lt;hash&gt;</code> served static-HTML renewals before the Orchestra refactor ' +
      '(commit <code>1408ee7</code>). Renewals now deploy as real Vercel preview URLs returned in the ' +
      'BeforeAfterReport.<code>renewedUrl</code> field. Re-submit the input on the Renewal workspace ' +
      '(<code>/renewal</code>) to generate a fresh preview.</p>' +
      '</body></html>'
  );
}
