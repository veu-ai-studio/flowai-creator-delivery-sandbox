// POST /api/marketplace/feedback
// Body: {
//   tool_slug, lifecycle_run_id, recommendation_id, product_id,
//   rating (1-5), comment, tags ([string]), would_recommend (bool)
// }
//
// Provider's qualitative rating of a tool after using it. Distinct from
// /outcomes (observable metrics): this is "did this feel good to work
// with". Feedback shadow-writes a satisfaction-only outcome so the
// dynamic ranker picks it up alongside lifecycle-emitted outcomes.
//
// GET /api/marketplace/feedback?tool_slug=&lifecycle_run_id=
// Lists feedback for a tool (org-scoped) plus a summary.

import { setCorsHeaders } from '../_lib/claude.js';
import { withRequestLog } from '../_lib/requestLog.js';
import { resolveOrgId } from '../_lib/tenant.js';
import { logger } from '../_lib/logger.js';
import {
  recordFeedback, listFeedback, summariseFeedback, getTool, getRecommendation,
} from '../_lib/marketplace.js';
import { appendAuditEntry } from '../_lib/db.js';

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const orgId = resolveOrgId(req) || 'veu-ai-studio';

  if (req.method === 'POST') {
    const {
      tool_slug, lifecycle_run_id, recommendation_id, product_id: productId,
      rating, comment, tags, would_recommend,
    } = req.body || {};

    if (!tool_slug) return res.status(400).json({ error: 'tool_slug required' });
    if (!getTool(tool_slug)) return res.status(400).json({ error: `Unknown tool slug: ${tool_slug}` });
    if (rating == null) return res.status(400).json({ error: 'rating (1-5) required' });

    if (recommendation_id && !getRecommendation(recommendation_id)) {
      return res.status(400).json({ error: `Unknown recommendation_id: ${recommendation_id}` });
    }

    try {
      const entry = recordFeedback({
        tool_slug, org_id: orgId, product_id: productId,
        lifecycle_run_id, recommendation_id,
        rating, comment, tags, would_recommend,
      });

      await appendAuditEntry({
        actionType: 'marketplace.feedback.recorded',
        severity: 'info',
        orgId, productId,
        sessionId: lifecycle_run_id,
        detail: {
          tool_slug, rating: entry.rating, would_recommend: entry.would_recommend,
          recommendation_id: entry.recommendation_id,
        },
      }).catch(() => {});

      logger.info('marketplace.feedback.recorded', {
        orgId, productId, runId: lifecycle_run_id,
        toolSlug: tool_slug, rating: entry.rating,
      });

      return res.status(201).json({ ok: true, feedback: entry });
    } catch (e) {
      return res.status(400).json({ error: e.message || String(e) });
    }
  }

  if (req.method === 'GET') {
    const { tool_slug, lifecycle_run_id } = req.query || {};
    const arr = listFeedback({ tool_slug, org_id: orgId, lifecycle_run_id });
    const summary = tool_slug ? summariseFeedback(tool_slug) : null;
    return res.status(200).json({ feedback: arr, total: arr.length, summary });
  }

  return res.status(405).json({ error: 'Use POST or GET' });
}

export default withRequestLog(handler, { endpoint: '/api/marketplace/feedback' });
