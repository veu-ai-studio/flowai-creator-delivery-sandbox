'use strict';

import { StepOwnerAgentBase, charterFromRegistry, hasValue, countItems } from './StepOwnerAgentBase.js';

export class Agent10Monitor extends StepOwnerAgentBase {
  static charterId = 10;

  static charter() {
    return charterFromRegistry(10);
  }

  constructor(deps) {
    super(deps, {
      id: 10,
      stepKey: 'monitor',
      inputKind: 'monitor.request',
      summaryVerb: 'health',
      rules: [
        (input) => rule('surface_present', hasValue(input.surface ?? input.url ?? input.stepInputs?.surface), 'blocker', 'Monitor requires a surface or URL.'),
        (input) => rule('metric_unit_present', !hasValue(input.metric) || hasValue(input.unit), 'warning', 'Metric samples must include a unit.'),
        (input) => rule('renewal_trigger_checked', countItems(input.driftSignals ?? input.stepInputs?.driftSignals) === 0, 'warning', 'Drift signals should trigger renewal review.'),
      ],
      selectTopic: (input, signals) => {
        if (signals.some((s) => s.rule === 'renewal_trigger_checked' && s.status !== 'pass')) return '10.anomaly.v1';
        if (hasValue(input.metric)) return '10.metric.v1';
        return '10.health.v1';
      },
      buildPayload: ({ input, runId, productId, ok, confidence, signals, warnings }) => {
        const surface = input.surface ?? input.url ?? input.stepInputs?.surface ?? 'unknown';
        if (hasValue(input.metric)) {
          return {
            runId,
            productId,
            surface,
            metric: input.metric,
            value: typeof input.value === 'number' && Number.isFinite(input.value) ? input.value : 0,
            unit: input.unit ?? 'unknown',
            confidence,
            signals,
          };
        }
        if (warnings.some((w) => w.rule === 'renewal_trigger_checked')) {
          return {
            runId,
            productId,
            surface,
            metric: 'drift',
            observed: countItems(input.driftSignals ?? input.stepInputs?.driftSignals),
            expected: 0,
            severity: 'medium',
            confidence,
            signals,
          };
        }
        return {
          runId,
          productId,
          surface,
          status: ok ? 'healthy' : 'blocked',
          confidence,
          signals,
        };
      },
    });
  }
}

function rule(name, passed, severity, message) {
  return { rule: name, status: passed ? 'pass' : severity, message };
}
