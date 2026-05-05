// GET /api/marketplace/categories
//
// Lists every tool category in the marketplace taxonomy. Solution providers
// hit this when building their UI: "what slots can I fill?". Each category
// declares which of the 8 lifecycle steps it serves so the caller can group
// categories by step (or filter to just the ones relevant to their stage).
//
// Optional query params:
//   ?step=3          → only categories that serve lifecycle step 3
//   ?include_counts  → adds tool_count per category

import { setCorsHeaders } from '../_lib/claude.js';
import { withRequestLog } from '../_lib/requestLog.js';
import { TOOL_CATEGORIES, TOOLS_BY_CATEGORY } from '../_lib/marketplaceSeed.js';

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const { step, include_counts } = req.query || {};
  const stepNum = step ? Number(step) : null;
  const wantCounts = include_counts === 'true' || include_counts === '1';

  let cats = TOOL_CATEGORIES.slice().sort((a, b) => a.display_order - b.display_order);
  if (stepNum && Number.isFinite(stepNum)) {
    cats = cats.filter((c) => Array.isArray(c.step_numbers) && c.step_numbers.includes(stepNum));
  }

  const out = cats.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    step_numbers: c.step_numbers,
    display_order: c.display_order,
    ...(wantCounts ? { tool_count: (TOOLS_BY_CATEGORY[c.id] || []).length } : {}),
  }));

  return res.status(200).json({
    categories: out,
    total: out.length,
    filter: stepNum ? { step: stepNum } : null,
  });
}

export default withRequestLog(handler, { endpoint: '/api/marketplace/categories' });
