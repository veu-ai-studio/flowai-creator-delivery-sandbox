'use strict';

import {
  AdvisoryAgentBase,
  advisoryCharterFromRegistry,
  hasText,
  listCount,
} from './AdvisoryAgentBase.js';

export class Agent11StrategicIntelligence extends AdvisoryAgentBase {
  static charterId = 11;

  static charter() {
    return advisoryCharterFromRegistry(11, { marketplaceTools: ['anthropic-api'] });
  }

  constructor(deps) {
    super(deps, {
      id: 11,
      inputKind: 'strategic.intelligence.request',
      rules: [
        (input) => signal(
          'material_event_scan',
          hasMaterialEvent(input.healthSignals),
          'urgent',
          'Material health or market event requires same-session alert.',
        ),
        (input) => signal(
          'trajectory_context',
          listCount(input.benchmarkReports) > 0 || hasText(input.trajectoryNarrative),
          'watch',
          'Trajectory report needs benchmark evidence or a narrative basis.',
        ),
        (input) => signal(
          'platform_discovery_context',
          listCount(input.platformSignals) > 0 || listCount(input.regulations) > 0,
          'watch',
          'Strategic intelligence should include platform or regulatory signals.',
        ),
      ],
      selectTopic: (input, signals) => {
        if (input.reportType === 'trajectory') return '11.trajectory.report.v1';
        if (signals.some((s) => s.rule === 'material_event_scan' && s.status === 'urgent')) {
          return '11.alert.material.v1';
        }
        return '11.brief.weekly.v1';
      },
      buildPayload: ({ input, runId, signals, urgent, warnings, confidence }) => ({
        runId,
        reportType: input.reportType ?? 'weekly',
        title: input.title ?? 'Strategic intelligence brief',
        summary: input.summary ?? summarizeSignals(signals),
        material: urgent.length > 0,
        trajectoryNarrative: input.trajectoryNarrative ?? null,
        signalCounts: {
          health: listCount(input.healthSignals),
          benchmark: listCount(input.benchmarkReports),
          regulation: listCount(input.regulations),
          platform: listCount(input.platformSignals),
        },
        urgentRules: urgent.map((s) => s.rule),
        watchRules: warnings.map((s) => s.rule),
        confidence,
        signals,
      }),
    });
  }
}

function hasMaterialEvent(healthSignals) {
  if (!Array.isArray(healthSignals)) return false;
  return healthSignals.some((signal) => {
    const severity = String(signal?.severity ?? signal?.level ?? '').toLowerCase();
    return severity === 'material' || severity === 'critical' || severity === 'high';
  });
}

function signal(rule, condition, fallbackStatus, message) {
  return {
    rule,
    status: condition ? fallbackStatus : 'clear',
    message,
  };
}

function summarizeSignals(signals) {
  const active = signals.filter((s) => s.status !== 'clear').map((s) => s.rule);
  return active.length > 0
    ? `Active strategic signals: ${active.join(', ')}`
    : 'No material strategic signal detected.';
}
