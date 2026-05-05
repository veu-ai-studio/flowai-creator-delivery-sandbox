// POST /api/marketplace/admin/rerank
// Headers: x-flowai-admin-key: <ADMIN_SEED_KEY>
//
// Manually triggers a marketplace re-rank pass. Mirrors what the weekly
// Inngest cron does. Useful for ops + tests.

import { setCorsHeaders } from '../../_lib/claude.js';
import { withRequestLog } from '../../_lib/requestLog.js';
import { rerankAllTools } from '../../_lib/jobs/marketplaceRerank.js';

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const adminKey = req.headers['x-flowai-admin-key'];
  if (!process.env.ADMIN_SEED_KEY || adminKey !== process.env.ADMIN_SEED_KEY) {
    return res.status(401).json({ error: 'Admin key required' });
  }

  const result = await rerankAllTools({ trigger: 'manual-admin' });
  return res.status(200).json(result);
}

export default withRequestLog(handler, { endpoint: '/api/marketplace/admin/rerank' });
