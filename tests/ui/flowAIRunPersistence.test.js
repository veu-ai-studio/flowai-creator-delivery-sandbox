import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const dashboardSource = read('src/pages/FlowAIDashboard.jsx');
const runsHistorySource = read('src/pages/RunsHistory.jsx');
const appLayoutSource = read('src/components/layout/AppLayout.jsx');
const sidebarSource = read('src/components/layout/Sidebar.jsx');
const activeIndicatorSource = read('src/components/layout/ActiveRunIndicator.jsx');
const storeSource = read('src/lib/flowaiRunStore.js');

describe('FlowAI run persistence and active indicator', () => {
  it('records dashboard run lifecycle events into persistent run history', () => {
    expect(dashboardSource).toContain('upsertFlowAIRun');
    expect(dashboardSource).toContain('replaceFlowAIRunId');
    expect(dashboardSource).toContain('updateFlowAIRun');
    expect(dashboardSource).toContain('runVerdictFromResult');
    expect(dashboardSource).toContain('START ANOTHER RUN');
    expect(dashboardSource).not.toContain('if (isRunning) return;');
  });

  it('renders FlowAI runs on the /runs history page with required fields', () => {
    expect(runsHistorySource).toContain('listFlowAIRuns');
    expect(runsHistorySource).toContain('subscribeFlowAIRuns');
    expect(runsHistorySource).toContain('run_id');
    expect(runsHistorySource).toContain('ended_at');
    expect(runsHistorySource).toContain('branch_created');
    expect(runsHistorySource).toContain('scoreLabel');
  });

  it('exposes active runs globally from the shared layout and sidebar', () => {
    expect(appLayoutSource).toContain('ActiveRunIndicator');
    expect(activeIndicatorSource).toContain('listActiveFlowAIRuns');
    expect(activeIndicatorSource).toContain('🟢');
    expect(sidebarSource).toContain('listActiveFlowAIRuns');
    expect(sidebarSource).toContain('/runs');
  });

  it('uses a browser-local FlowAI run store with cross-page change events', () => {
    expect(storeSource).toContain('flowai.pipelineRuns.v1');
    expect(storeSource).toContain('FLOWAI_RUNS_CHANGED');
    expect(storeSource).toContain('listActiveFlowAIRuns');
    expect(storeSource).toContain('FLOWAI_MACRO_STEPS');
    expect(storeSource).toContain('buildFlowAIStepPatchFromLog');
    expect(storeSource).toContain('window.localStorage');
    expect(storeSource).toContain('window.dispatchEvent');
  });

  it('maps orchestrator step logs into the 8 macro pipeline steps', async () => {
    installWindowStorage();
    const store = await import('../../src/lib/flowaiRunStore.js');
    store.upsertFlowAIRun({
      id: 'run-macro',
      runId: 'run-macro',
      product: 'SAIGE',
      status: 'running',
      startTime: '2026-05-24T00:00:00.000Z',
    });

    for (const log of [
      { step: 1, stepName: 'Product Discovery', status: 'complete' },
      { step: 6, stepName: 'Issue Prioritization', status: 'complete' },
      { step: 7, stepName: 'Multi-File Fix Generation', status: 'complete' },
      { step: 10, stepName: 'Vercel Preview Deploy', status: 'complete' },
      { step: 12, stepName: 'GTM Readiness Decision', status: 'complete' },
      { step: 14, stepName: 'Audit Record', status: 'complete' },
    ]) {
      store.updateFlowAIRun('run-macro', store.buildFlowAIStepPatchFromLog(log));
    }

    const [run] = store.listFlowAIRuns();
    expect(run.stepCount).toBe(6);
    expect(Object.keys(run.stepResults)).toEqual([
      'research',
      'design',
      'build',
      'deploy',
      'gtm',
      'monitor',
    ]);
  });

  it('reconciles stale running runs into timed_out so they do not stay active forever', async () => {
    installWindowStorage();
    const store = await import('../../src/lib/flowaiRunStore.js');
    store.upsertFlowAIRun({
      id: 'run-stale',
      runId: 'run-stale',
      product: 'SAIGE',
      status: 'running',
      startTime: '2026-05-24T00:00:00.000Z',
      lastHeartbeatAt: '2000-01-01T00:00:00.000Z',
    });

    const [run] = store.listFlowAIRuns();
    expect(run.status).toBe('timed_out');
    expect(run.verdict).toBe('SSE_HEARTBEAT_TIMEOUT');
    expect(store.listActiveFlowAIRuns()).toHaveLength(0);
  });
});

function installWindowStorage() {
  const storage = new Map();
  global.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  global.CustomEvent = global.CustomEvent || class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
}
