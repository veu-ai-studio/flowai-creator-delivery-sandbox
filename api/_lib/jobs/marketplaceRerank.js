// Weekly marketplace re-rank job. Walks every tool, recomputes outcome-
// adjusted rankings, and emits an audit-log entry per dimension change so
// providers see the dynamic ranking shift over time.
//
// Triggered weekly via Inngest cron (when INNGEST_EVENT_KEY is set).
// Fallback: callable manually via /api/marketplace/admin/rerank for ops.

import {
  TOOLS, computeBaselineRankings, applyOutcomeAdjustments, summariseOutcomes,
  DIMENSIONS,
} from '../marketplace.js';
import { appendAuditEntry } from '../db.js';
import { logger } from '../logger.js';

// In-memory snapshot of last week's rankings. When Supabase activates, this
// becomes a tool_rankings row history.
const RANK_HISTORY = new Map();        // tool_slug → { previous: {dim:score}, current: {dim:score}, computed_at }

export async function rerankAllTools({ trigger = 'cron' } = {}) {
  const t0 = Date.now();
  const changes = [];

  for (const tool of TOOLS) {
    const baseline = computeBaselineRankings(tool);
    const adjusted = applyOutcomeAdjustments(tool.slug, baseline);
    const evidenceCount = adjusted._evidence_count || 0;
    const summary = summariseOutcomes(tool.slug);

    const current = {};
    for (const d of DIMENSIONS) current[d] = adjusted[d];

    const prior = RANK_HISTORY.get(tool.slug)?.current;
    if (prior) {
      // Compare and record per-dimension changes >= 5 points
      for (const d of DIMENSIONS) {
        const delta = current[d] - prior[d];
        if (Math.abs(delta) >= 5) {
          changes.push({
            tool_slug: tool.slug,
            dimension: d,
            previous: prior[d],
            current: current[d],
            delta,
            evidence_count: evidenceCount,
          });
        }
      }
    }

    RANK_HISTORY.set(tool.slug, {
      previous: prior || null,
      current,
      evidence_count: evidenceCount,
      summary,
      computed_at: new Date().toISOString(),
    });
  }

  // Emit audit-log entries per significant change so providers can see
  // movement over time.
  for (const change of changes) {
    await appendAuditEntry({
      actionType: 'marketplace.ranking_changed',
      severity: change.delta < 0 ? 'warning' : 'info',
      orgId: null, productId: null,
      detail: change,
    }).catch(() => {});
  }

  logger.info('marketplace.rerank.completed', {
    trigger,
    tools_processed: TOOLS.length,
    changes: changes.length,
    durationMs: Date.now() - t0,
  });

  return {
    ok: true,
    trigger,
    tools_processed: TOOLS.length,
    changes_count: changes.length,
    changes,
    durationMs: Date.now() - t0,
  };
}

export function getRankingHistory(toolSlug) {
  return RANK_HISTORY.get(toolSlug) || null;
}
