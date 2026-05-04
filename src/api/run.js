/* eslint-env node */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { apps } = req.body;

    if (!apps || !Array.isArray(apps)) {
      return res.status(400).json({ error: 'apps array is required' });
    }

    const results = {
      timestamp: new Date().toISOString(),
      apps: [],
      summary: { total: apps.length, passed: 0, failed: 0 },
    };

    for (const app of apps) {
      const appResult = {
        appName: app.name,
        passed: true,
        finalUrl: `https://${app.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.vercel.app`,
        iteration: 1,
      };

      results.apps.push(appResult);
      if (appResult.passed) results.summary.passed++;
      else results.summary.failed++;
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('[/api/run] Error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      step: 'run',
    });
  }
}