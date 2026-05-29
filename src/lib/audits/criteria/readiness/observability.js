/**
 * rdy.observability — DEFERRED per CEO Flag 9 disposition (allowlist entry).
 *
 * Blocked by: Agent #10 Monitor (no metric coverage map / span / log freshness).
 * Allowlist entry: w3/deferred-evaluators.json
 */

'use strict';

import { deferredResult } from '../_helpers.js';

const ID = 'rdy.observability';

export default async function evaluate(/* target, ctx */) {
  return deferredResult({
    id: ID,
    blockedBy: 'Agent #10 Monitor',
    reason: 'deferred-pending-agent-10-monitor',
    since: '2026-05-13',
    nextReview: 'when-agent-10-monitor-ships',
    notes: 'No metric coverage map / span / log freshness data. Evaluator returns null per Flag 9 allowlist; aggregator must NOT impute 100.',
  });
}

export { ID };
