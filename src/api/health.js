/* eslint-env node */
/* global process */

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const missingEnvVars = [];
  if (!process.env.OPENAI_API_KEY) missingEnvVars.push('OPENAI_API_KEY');
  if (!process.env.VERCEL_TOKEN) missingEnvVars.push('VERCEL_TOKEN');

  return res.status(200).json({
    status: missingEnvVars.length === 0 ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: {
      openai_key: process.env.OPENAI_API_KEY ? '✓' : '✗',
      vercel_token: process.env.VERCEL_TOKEN ? '✓' : '✗',
    },
    missing_env_vars: missingEnvVars,
  });
}