import { syncInngestRegistration } from '../_lib/inngest.js';

function authOk(req) {
  // Either:
  //   (a) Vercel Cron header + matching internal secret
  //   (b) Manual call with internal secret header pair
  const isCron = req.headers?.['x-vercel-cron'] === '1' || req.headers?.['x-vercel-cron'] === 'true';
  const isInternal = req.headers?.['x-flowai-internal'] === 'true' || req.headers?.['x-flowai-internal'] === '1';
  if (!isCron && !isInternal) return false;
  const expected = process.env.FLOWAI_INTERNAL_SECRET ?? '';
  const presented = (req.headers?.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!expected) return false;
  return presented === expected;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  if (!authOk(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized', hint: 'requires x-flowai-internal + bearer + matching FLOWAI_INTERNAL_SECRET (or Vercel-Cron-originated invocation with same secret)' });
  }

  const result = await syncInngestRegistration({ force: true });
  return res.status(200).json({
    ok: result.ok,
    inngestReady: result.enabled === true,
    status: result.status ?? null,
    method: result.method ?? null,
    modified: result.body?.modified ?? null,
    reason: result.reason ?? null,
    atRisk: result.ok !== true,
  });
}
