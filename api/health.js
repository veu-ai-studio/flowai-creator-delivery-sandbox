// GET /api/health — lightweight readiness probe.
//
// Polled every 30s by FlowAIHealthBadge in the top bar. Must return 200 OK
// with a small JSON body so the badge resolves to "All Systems Operational".
//
// PA #2.5b: this endpoint did not exist before — the badge was 404'ing on
// every poll, which the FlowAIHealthBadge component renders as "Service
// Error". This handler unblocks the badge.
//
// The body intentionally exposes which Vercel env we're in so the dashboard
// can display deployment context. Sensitive secrets are NOT echoed.

const APP_VERSION = '1.0.0';

export default function handler(req, res) {
  // CORS — match the rest of /api/* (echo Origin, allow GET + OPTIONS).
  const origin = req.headers?.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Use GET' });
  }

  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';
  const region = process.env.VERCEL_REGION || null;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || null;

  return res.status(200).json({
    ok: true,
    status: 'ready',
    service: 'flowai',
    version: APP_VERSION,
    env,
    region,
    commit,
    timestamp: new Date().toISOString(),
  });
}
