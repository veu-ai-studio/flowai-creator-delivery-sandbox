export const MONITOR_TEMPLATE_VERSION = '1.0';
export const MONITOR_STEP_ID = 'step-8-monitor';

export function buildMonitorTemplate(productId, context = {}) {
  return Object.freeze({
    version: MONITOR_TEMPLATE_VERSION,
    stepId: MONITOR_STEP_ID,
    productId,
    context,
    sections: Object.freeze([
      Object.freeze({ id: 'monitor-target', source: 'auto', label: 'Monitor target', prompt: 'Resolve deployed URL and store-review signal targets.' }),
      Object.freeze({ id: 'monitor-live-check', source: 'auto', label: 'Live check', prompt: 'Record live check result; never mark healthy without a real check.' }),
      Object.freeze({ id: 'monitor-regression-signal', source: 'auto', label: 'Regression signal', prompt: 'Detect regressions or drift from monitored evidence.' }),
      Object.freeze({ id: 'monitor-store-review-status', source: 'auto', label: 'Store-review status', prompt: 'Track async distribution outcomes from Step 5 adapters.' }),
      Object.freeze({ id: 'monitor-renewal-trigger', source: 'auto', label: 'Self-Renewal trigger', prompt: 'Recommend Self-Renewal when monitor signals require it.' }),
    ]),
  });
}
