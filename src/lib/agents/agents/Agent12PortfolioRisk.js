'use strict';

import {
  AdvisoryAgentBase,
  advisoryCharterFromRegistry,
  listCount,
} from './AdvisoryAgentBase.js';

export class Agent12PortfolioRisk extends AdvisoryAgentBase {
  static charterId = 12;

  static charter() {
    return advisoryCharterFromRegistry(12);
  }

  constructor(deps) {
    super(deps, {
      id: 12,
      inputKind: 'portfolio.risk.request',
      rules: [
        (input) => riskSignal(
          'p0_fire_detection',
          hasSeverity(input.anomalies, ['p0', 'critical']),
          'urgent',
          'Critical anomaly requires immediate P0 fire escalation.',
        ),
        (input) => riskSignal(
          'threat_correlation',
          listCount(input.threats) > 0,
          'urgent',
          'Self-protection threat correlated with portfolio risk.',
        ),
        (input) => riskSignal(
          'slow_burn_pattern',
          listCount(input.patterns) > 0 || listCount(input.anomalies) >= 3,
          'watch',
          'Repeated anomalies should be tracked as slow-burn portfolio risk.',
        ),
      ],
      selectTopic: (input, signals) => {
        if (input.rollup === true) return 'portfolio.fire.v1';
        if (signals.some((s) => s.rule === 'p0_fire_detection' && s.status === 'urgent')) return '12.fire.p0.v1';
        if (signals.some((s) => s.rule === 'threat_correlation' && s.status === 'urgent')) return '12.fire.p1.v1';
        if (signals.some((s) => s.rule === 'slow_burn_pattern' && s.status === 'watch')) return '12.fire.p2.v1';
        return '12.health.daily.v1';
      },
      buildPayload: ({ input, runId, signals, urgent, warnings, confidence }) => {
        const affectedSurfaces = collectSurfaces(input);
        const evidence = collectEvidence(input, signals);
        const title = input.title ?? riskTitle(urgent, warnings);
        if (input.rollup === true) {
          return {
            runId,
            title,
            severity: urgent.length > 0 ? 'high' : warnings.length > 0 ? 'medium' : 'low',
            fires: [...urgent.map((s) => s.rule), ...warnings.map((s) => s.rule)],
            affectedSurfaces,
            evidence,
            confidence,
            signals,
          };
        }
        if (urgent.length > 0) {
          return {
            runId,
            title,
            affectedSurfaces,
            detectedAt: input.detectedAt ?? thisClock(input),
            evidence,
            confidence,
            signals,
          };
        }
        if (warnings.length > 0) {
          return {
            runId,
            title,
            pattern: input.pattern ?? warnings.map((s) => s.rule).join(', '),
            window: input.window ?? '24h',
            affectedSurfaces,
            evidence,
            confidence,
            signals,
          };
        }
        return {
          runId,
          title: input.title ?? 'Daily portfolio health',
          status: 'healthy',
          affectedSurfaces,
          evidence,
          confidence,
          signals,
        };
      },
    });
  }
}

function hasSeverity(items, severities) {
  if (!Array.isArray(items)) return false;
  const allowed = new Set(severities);
  return items.some((item) => allowed.has(String(item?.severity ?? item?.level ?? '').toLowerCase()));
}

function riskSignal(rule, condition, activeStatus, message) {
  return {
    rule,
    status: condition ? activeStatus : 'clear',
    message,
  };
}

function collectSurfaces(input) {
  const surfaces = [];
  for (const source of [input.affectedSurfaces, input.surfaces]) {
    if (Array.isArray(source)) surfaces.push(...source.filter((s) => typeof s === 'string' && s));
  }
  for (const anomaly of input.anomalies ?? []) {
    if (typeof anomaly?.surface === 'string' && anomaly.surface) surfaces.push(anomaly.surface);
  }
  for (const threat of input.threats ?? []) {
    if (typeof threat?.surface === 'string' && threat.surface) surfaces.push(threat.surface);
  }
  return [...new Set(surfaces.length > 0 ? surfaces : ['portfolio'])];
}

function collectEvidence(input, signals) {
  if (Array.isArray(input.evidence) && input.evidence.length > 0) return input.evidence;
  const active = signals.filter((s) => s.status !== 'clear').map((s) => s.rule);
  return active.length > 0 ? active : ['no_active_fire'];
}

function riskTitle(urgent, warnings) {
  if (urgent.some((s) => s.rule === 'p0_fire_detection')) return 'P0 portfolio fire detected';
  if (urgent.some((s) => s.rule === 'threat_correlation')) return 'P1 portfolio threat correlation';
  if (warnings.length > 0) return 'P2 portfolio slow-burn pattern';
  return 'Daily portfolio health';
}

function thisClock(input) {
  return input.at ?? input.timestamp ?? 'unknown';
}
