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
    const { app_name, html } = req.body;

    if (!app_name || !html) {
      return res.status(400).json({ error: 'app_name and html are required' });
    }

    // Mock deployment URL
    const deploymentUrl = `https://${app_name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.vercel.app`;

    return res.status(200).json({
      status: 'success',
      app_name,
      deployment_url: deploymentUrl,
      url: deploymentUrl,
      html_size: html.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[/api/deploy] Error:', error.message);
    return res.status(500).json({
      status: 'error',
      step: 'deploy',
      message: error.message,
    });
  }
}