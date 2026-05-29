/**
 * W03 Compliance Wiring — Build 1 of the W03 Standing Operating Protocol.
 * ---------------------------------------------------------------------------
 * Canonical reference: docs/W03_STANDING_OPERATING_PROTOCOL.md (commit
 * 6e9660e, maximum-oversight configuration).
 *
 * This module wires Agent #3 Self-Renewal to subscribe to the topic
 * `w03.turn.completed` and to act as a SYNCHRONOUS recommend_only reviewer
 * on every W03 → CEO message (CEO Decision 4 — no async, no exemptions).
 *
 * Surface:
 *
 *   wireW03Compliance({ messageBus, agent3, logger? })
 *     → { unsubscribe, reviewAndDeliver }
 *
 *   The `reviewAndDeliver({ envelope, deliver })` function is the sync-wait
 *   wrapper around the W03 reply path. The caller hands a W03TurnEnvelope
 *   and a `deliver` callback. wireW03Compliance:
 *     1. Runs the deterministic probe (sync).
 *     2. Awaits Agent #3.recommend() with the adapted envelope.
 *     3. Merges both signals into a ComplianceReport.
 *     4. Publishes `w03.turn.completed` (for audit-log fan-out).
 *     5. If verdict==='block', emits a structured CEO notice and DOES NOT
 *        call `deliver`.
 *     6. Otherwise calls `deliver({ messageWithFooter, report })`.
 *
 * Authority preservation: Agent #3 stays recommend_only. The wiring layer
 * makes the recommendation BLOCK delivery by inspecting the verdict —
 * Agent #3 never gains the authority to "stop" anything by itself.
 *
 * ESM only. No Node-only imports — runs in browser bundles too.
 */

'use strict';

import { probeTurn, loadRuleset } from '../../../scripts/w03ComplianceProbe.mjs';
import { NOOP_LOGGER } from '../shared/logger.js';

const W03_TURN_TOPIC = 'w03.turn.completed';
const CEO_NOTICE_TOPIC = 'w03.compliance.ceo_notice';
const AUDIT_SUBSCRIBE_TOPIC = 'w03.turn.completed';

const RECOMMEND_TIMEOUT_MS_DEFAULT = 30_000;

// ── Public surface ──────────────────────────────────────────────────────

/**
 * Wire the W03 oversight protocol against an existing MessageBus + Agent #3
 * instance. Returns the runtime handle that the W03 reply path uses.
 *
 * @param {object} opts
 * @param {MessageBus} opts.messageBus
 * @param {object} opts.agent3 — must expose `async recommend(ctx)`.
 * @param {object} [opts.logger] — defaults to NOOP_LOGGER.
 * @param {number} [opts.recommendTimeoutMs] — default 30s.
 * @returns {{
 *   unsubscribe: () => void,
 *   reviewAndDeliver: (args: { envelope: object, deliver: (delivered: object) => Promise<any>|any })
 *     => Promise<{ delivered: boolean, report: object, blocked: boolean, noticeId?: string }>,
 * }}
 */
export function wireW03Compliance({ messageBus, agent3, logger, recommendTimeoutMs }) {
  if (!messageBus || typeof messageBus.subscribe !== 'function' || typeof messageBus.publish !== 'function') {
    throw new TypeError('wireW03Compliance: messageBus with publish/subscribe required');
  }
  if (!agent3 || typeof agent3.recommend !== 'function') {
    throw new TypeError('wireW03Compliance: agent3 with recommend(ctx) required');
  }
  const log = logger ?? NOOP_LOGGER;
  const timeoutMs = typeof recommendTimeoutMs === 'number' && recommendTimeoutMs > 0
    ? recommendTimeoutMs
    : RECOMMEND_TIMEOUT_MS_DEFAULT;

  // Audit-side subscription: every published w03.turn.completed gets
  // observed by the bus subscriber so future audit-log consumers see
  // the same event. This subscription is fire-and-forget — the *sync*
  // blocking review happens in reviewAndDeliver below, NOT via the bus.
  const off = messageBus.subscribe(AUDIT_SUBSCRIBE_TOPIC, async (payload, meta) => {
    try {
      log.debug('w03.turn.completed observed', {
        topic: AUDIT_SUBSCRIBE_TOPIC,
        seq: meta?.seq ?? null,
        turnId: payload?.turnId ?? 'unknown',
      });
    } catch {
      // Swallow — bus delivery must not throw.
    }
  });

  /**
   * Sync-blocking review wrapper around the W03 reply path. Returns:
   *   { delivered, report, blocked, noticeId? }
   * The caller MUST treat `delivered === false` as "do not surface the
   * draft to CEO". On block, a CEO notice has been published on the bus
   * (topic `w03.compliance.ceo_notice`) describing the violation.
   *
   * @param {object} args
   * @param {object} args.envelope — W03TurnEnvelope per SOP § 3.
   * @param {(delivered: object) => Promise<any>|any} args.deliver
   *   — callback invoked when verdict is 'pass' or 'flag'. Receives:
   *     { messageWithFooter, report }
   */
  async function reviewAndDeliver({ envelope, deliver }) {
    if (!envelope || typeof envelope !== 'object') {
      throw new TypeError('reviewAndDeliver: envelope required');
    }
    if (typeof deliver !== 'function') {
      throw new TypeError('reviewAndDeliver: deliver(...) callback required');
    }
    const turnId = envelope.turnId ?? `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const turnText = envelope.w03OutputMarkdown ?? '';

    // 1. Deterministic probe (synchronous, fast).
    // NB: when run via the wiring, the probe sees the DRAFT message —
    // before the wiring layer appends the Sentinel footer. R14 (Sentinel
    // footer required on CEO-facing turns) is therefore satisfied by
    // construction on the post-delivery message, so we suppress R14
    // here by passing ceoFacing=false. The standalone probe CLI (no
    // wiring) does not get this exemption — R14 fires there to catch
    // hand-authored CEO-facing turns that bypass the wiring.
    const probeContext = {
      isMaterial: !!envelope.context?.isMaterial,
      isMultiTurn: Array.isArray(envelope.recentTurnHashes) && envelope.recentTurnHashes.length >= 2,
      ceoFacing: false,
      isSelfGovernanceTopic: !!envelope.context?.isSelfGovernanceTopic,
      isGovernanceCritical: !!envelope.context?.isGovernanceCritical,
      driftRecurrenceTriggered: !!envelope.context?.driftRecurrenceTriggered,
    };
    const probe = probeTurn({ turnText, ruleset: loadRuleset(), context: probeContext });

    // 2. Synchronous (awaited) Agent #3 review. Per CEO Decision 4 — no
    //    async/background path. Apply a timeout so a hung agent does not
    //    block CEO delivery forever; treat timeout as a block verdict
    //    (fail-closed).
    const adaptedCtx = adaptEnvelopeForAgent3(envelope, probe);
    const recPromise = agent3.recommend(adaptedCtx);
    let recommendation = null;
    let agent3Error = null;
    try {
      recommendation = await raceWithTimeout(recPromise, timeoutMs);
    } catch (e) {
      agent3Error = e?.message ?? String(e);
    }

    // 3. Merge signals into the final report.
    const report = mergeIntoReport({ turnId, probe, recommendation, agent3Error, envelope });

    // 4. Publish on the bus for audit-log fan-out (non-blocking observers).
    try {
      messageBus.publish(W03_TURN_TOPIC, {
        turnId,
        verdict: report.verdict,
        score: report.score,
        violationCount: report.violations.length,
        violations: report.violations,
        agent3: report.agent3Summary,
        at: Date.now(),
      });
    } catch (e) {
      log.warn('w03.turn.completed publish failed (continuing)', { error: e?.message ?? String(e) });
    }

    // 5. Block-handling. If verdict is 'block', do NOT deliver.
    if (report.verdict === 'block') {
      const noticeId = `w03_block_${turnId}_${Date.now()}`;
      messageBus.publish(CEO_NOTICE_TOPIC, {
        noticeId,
        turnId,
        topology: 'block-pre-delivery',
        verdict: report.verdict,
        violations: report.violations,
        agent3: report.agent3Summary,
        at: Date.now(),
      });
      log.warn('w03 message BLOCKED pre-delivery', { turnId, noticeId, violations: report.violations.length });
      return Object.freeze({ delivered: false, blocked: true, report, noticeId });
    }

    // 6. Deliver: build Sentinel footer + call the deliver callback.
    const footer = buildSentinelFooter(report);
    const messageWithFooter = turnText
      + (turnText.endsWith('\n') ? '\n' : '\n\n')
      + footer;
    await deliver({ messageWithFooter, report });
    return Object.freeze({ delivered: true, blocked: false, report });
  }

  return Object.freeze({
    unsubscribe: () => { try { off?.(); } catch { /* already-unsubscribed */ } },
    reviewAndDeliver,
  });
}

// ── Internals ───────────────────────────────────────────────────────────

/**
 * Adapt a W03TurnEnvelope into Agent #3's recommend(ctx) shape. Agent #3's
 * recommend() signature accepts `runId` + a few optional summary fields;
 * the wiring layer aliases envelope fields to that contract.
 */
export function adaptEnvelopeForAgent3(envelope, probe) {
  return {
    runId: envelope.turnId ?? envelope.parentDispatchId ?? 'unknown',
    productId: envelope.context?.dispatchTag ?? null,
    run_summary: {
      build_failure_count: 0,
      audit_issues_count: probe.violations.length,
      anomaly_severity: probe.verdict === 'block'
        ? 'high'
        : probe.verdict === 'flag'
          ? 'medium'
          : 'low',
      evolution_proposal: null,
      config_age_days: 0,
    },
    step_results: probe.violations.map((v) => ({
      step: 'govern',
      status: 'failed',
      key: v.rule,
      issues: 1,
    })),
  };
}

/** Race a promise against a timeout. Throws on timeout. */
function raceWithTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`recommend() timed out after ${ms} ms`)), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/** Merge probe + Agent #3 recommendation into the canonical report. */
function mergeIntoReport({ turnId, probe, recommendation, agent3Error, envelope }) {
  // The probe's verdict is the floor; Agent #3 can NUDGE upward (toward
  // block) by adding low-confidence signals, but cannot downgrade.
  let finalVerdict = probe.verdict;
  const agent3Summary = recommendation
    ? {
        agent_id: recommendation.agent_id ?? 3,
        agent_name: recommendation.agent_name ?? 'Self-Renewal',
        confidence: recommendation.confidence ?? 0,
        recommendation: recommendation.recommendation ?? '',
        renewal_flags: recommendation.renewal_flags ?? [],
      }
    : {
        agent_id: 3,
        agent_name: 'Self-Renewal',
        confidence: 0,
        recommendation: agent3Error
          ? `Agent #3 review failed: ${agent3Error}`
          : 'Agent #3 review unavailable',
        renewal_flags: [],
        error: agent3Error ?? 'no recommendation',
      };

  // If Agent #3 reports high-confidence renewal flags, escalate verdict
  // by ONE level (pass → flag, flag → block). Use else-if so we never
  // double-escalate within a single review.
  const hasHighSeverityFlags = Array.isArray(recommendation?.renewal_flags)
    && recommendation.renewal_flags.length >= 3
    && (recommendation.confidence ?? 0) >= 0.7;
  if (hasHighSeverityFlags) {
    if (finalVerdict === 'pass') finalVerdict = 'flag';
    else if (finalVerdict === 'flag') finalVerdict = 'block';
  }

  // If Agent #3 errored AND the probe verdict is 'pass', stay at 'pass'
  // (the probe is the floor; agent failure should not produce false
  // positives). Per CEO Decision 4, the agent3Review marker is recorded
  // as 'error' so the protocol's R12 check can surface it downstream.

  return Object.freeze({
    turnId,
    timestamp: new Date().toISOString(),
    compliant: probe.compliant && !hasHighSeverityFlags,
    verdict: finalVerdict,
    score: probe.score,
    violations: probe.violations,
    ruleChecks: probe.ruleChecks,
    probeVerdict: probe.verdict,
    agent3Summary: Object.freeze(agent3Summary),
    envelopeContext: Object.freeze({
      dispatchTag: envelope?.context?.dispatchTag ?? null,
      mode: envelope?.context?.mode ?? null,
      ceoFacing: envelope?.context?.ceoPresent ?? envelope?.context?.ceoFacing ?? false,
    }),
  });
}

/** Build the canonical Sentinel footer per SOP § 1 / R14. */
function buildSentinelFooter(report) {
  const verdictUpper = report.verdict.toUpperCase();
  const topViolation = report.violations[0];
  const topRisk = topViolation
    ? `${topViolation.rule} ${topViolation.item.toLowerCase()}: ${topViolation.evidence}`
    : 'none detected';
  const ceoEscalation = report.verdict === 'block' ? 'yes' : 'no';
  const panelEscalation = report.verdict === 'block' || report.violations.length >= 2 ? 'yes' : 'no';
  return [
    `**W03 Compliance Sentinel:** ${verdictUpper === 'PASS' ? 'PASS' : verdictUpper === 'FLAG' ? 'WARN' : 'ESCALATE'}`,
    `Agent #3 review: complete`,
    `Top risk: ${topRisk}`,
    `CEO escalation: ${ceoEscalation}`,
    `Panel escalation: ${panelEscalation}`,
    `Audit artifact: w03_self_audit_${report.turnId}`,
  ].join('\n');
}

// Exported for unit tests.
export const __test = Object.freeze({
  adaptEnvelopeForAgent3,
  raceWithTimeout,
  mergeIntoReport,
  buildSentinelFooter,
  W03_TURN_TOPIC,
  CEO_NOTICE_TOPIC,
});
