/**
 * gov.ip_protection — DEFERRED per CEO Flag 9 disposition (allowlist entry).
 *
 * Blocked by: IP-T1b / IP-T2 (no IP boundary metadata in audit ledger yet).
 * Return value follows the W3 canonical null envelope.
 * Allowlist entry: w3/deferred-evaluators.json
 */

'use strict';

import { deferredResult } from '../_helpers.js';

const ID = 'gov.ip_protection';

export default async function evaluate(/* target, ctx */) {
  return deferredResult({
    id: ID,
    blockedBy: 'IP-T1b / IP-T2',
    reason: 'deferred-pending-IP-T1b-IP-T2',
    since: '2026-05-13',
    nextReview: 'when-IP-T2-ships',
    notes: 'No IP boundary metadata in audit ledger yet. Evaluator returns null per Flag 9 allowlist; aggregator must NOT impute 100.',
  });
}

export { ID };
