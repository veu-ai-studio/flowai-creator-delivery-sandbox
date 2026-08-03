import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const dashboardSource = read('src/pages/FlowAIDashboard.jsx');
const autoStartSource = read('src/lib/flowaiAutoStart.js');
const autoRunnerSource = read('src/pages/AutoRunner.jsx');
const runsHistorySource = read('src/pages/RunsHistory.jsx');
const appLayoutSource = read('src/components/layout/AppLayout.jsx');
const sidebarSource = read('src/components/layout/Sidebar.jsx');
const activeIndicatorSource = read('src/components/layout/ActiveRunIndicator.jsx');
const storeSource = read('src/lib/flowaiRunStore.js');
const executeSource = read('api/agent/3/execute.js');
const sessionContextSource = read('src/lib/SessionContext.jsx');
const orchestrationBarSource = read('src/components/layout/OrchestrationBar.jsx');

describe('FlowAI run persistence and active indicator', () => {
  it('auto-starts prefilled Fresh Build inputs once through the operational executor', () => {
    expect(dashboardSource).toContain('consumeFlowAIAutoStart');
    expect(dashboardSource).toContain('autoStartRef.current = true');
    expect(autoStartSource).toContain('storage.getItem(SESSION_CONFIG_KEY)');
    expect(autoStartSource).toContain('storage.removeItem(SESSION_CONFIG_KEY)');
    expect(dashboardSource).toContain("storedInput?.type === 'description'");
    expect(dashboardSource).toContain('launch(claimedLaunchNonce)');
    expect(dashboardSource).toContain('launchNonce || crypto.randomUUID()');
    expect(dashboardSource).toContain("fetch('/api/agent/3/execute'");
  });

  it('durably disposes aborted or stale legacy AutoRunner sessions', () => {
    expect(autoRunnerSource).toContain('await cancelLegacyAutoSession');
    expect(autoRunnerSource).toContain('the session remains active');
    expect(autoRunnerSource).toContain('Retry Start New Session');
    expect(autoRunnerSource).toContain('confirmed cancelled');
    expect(autoRunnerSource).toContain('onStartNew={handleDiscardResume}');
  });

  it('records dashboard run lifecycle events into persistent run history', () => {
    expect(dashboardSource).toContain('upsertFlowAIRun');
    expect(dashboardSource).toContain('replaceFlowAIRunId');
    expect(dashboardSource).toContain('updateFlowAIRun');
    expect(dashboardSource).toContain('runVerdictFromResult');
    expect(dashboardSource).toContain('START ANOTHER RUN');
    expect(dashboardSource).toContain('Running... ${liveMacroStepCount}/8 steps');
    expect(dashboardSource).not.toContain('if (isRunning) return;');
  });

  it('renders FlowAI runs on the /runs history page with required fields', () => {
    expect(runsHistorySource).toContain("fetch('/api/runs'");
    expect(runsHistorySource).toContain('listFlowAIRuns');
    expect(runsHistorySource).not.toContain('subscribeFlowAIRuns');
    expect(runsHistorySource).not.toContain('base44.entities');
    expect(runsHistorySource).toContain('History unavailable');
    expect(runsHistorySource).toContain('run_id');
    expect(runsHistorySource).toContain('ended_at');
    expect(runsHistorySource).toContain('branch_created');
    expect(runsHistorySource).toContain('scoreLabel');
    expect(runsHistorySource).toContain("body: JSON.stringify({ runId, command: 'stop' })");
    expect(runsHistorySource).toContain('Stop run');
    expect(runsHistorySource).toContain('session.error.code');
    expect(runsHistorySource).toContain('serverIds.has(run.id)');
    expect(runsHistorySource).toContain('stepResults: run.stepResults');
  });

  it('serializes live orchestration progress into the durable ledger', () => {
    expect(executeSource).toContain('let ledgerWrite = Promise.resolve()');
    expect(executeSource).toContain('queueLedgerPatch');
    expect(executeSource).toContain('stepResults: durableStepResults');
    expect(executeSource).toContain('await ledgerWrite');
  });

  it('does not present an empty stale governance record as an active pipeline session', () => {
    expect(sessionContextSource).toContain('isUsableGovernanceSession');
    expect(sessionContextSource).toContain('session.urls.length > 0');
    expect(sessionContextSource).toContain('session.selected_activities.length > 0');
    expect(orchestrationBarSource).toContain('Governance Session Active');
    expect(orchestrationBarSource).toContain('Pause governance');
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

  it('clears browser-local run metadata at the authentication boundary', async () => {
    installWindowStorage();
    const store = await import('../../src/lib/flowaiRunStore.js');
    store.upsertFlowAIRun({ id: 'run-private', product: 'Private product' });
    expect(store.listFlowAIRuns()).toHaveLength(1);
    store.clearFlowAIRuns();
    expect(store.listFlowAIRuns()).toHaveLength(0);
    const authSource = read('src/lib/AuthContext.jsx');
    expect(authSource).toContain('clearFlowAIRuns();');
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

  it('preserves evidence when multiple orchestrator steps map to one macro stage', async () => {
    installWindowStorage();
    const store = await import('../../src/lib/flowaiRunStore.js');
    store.upsertFlowAIRun({ id: 'run-evidence', status: 'running' });
    store.updateFlowAIRun('run-evidence', store.buildFlowAIStepPatchFromLog({ step: 4, stepName: 'Static audit', status: 'complete' }));
    store.updateFlowAIRun('run-evidence', store.buildFlowAIStepPatchFromLog({ step: 11, stepName: 'Preview audit', status: 'complete' }));
    const [run] = store.listFlowAIRuns();
    expect(run.stepResults.qa_audit.summary).toBe('Preview audit');
    expect(run.stepResults.qa_audit.history.map((entry) => entry.summary)).toEqual(['Static audit', 'Preview audit']);
  });

  it('backfills legacy runs that only persisted a numeric step count', async () => {
    installWindowStorage();
    const store = await import('../../src/lib/flowaiRunStore.js');
    store.upsertFlowAIRun({
      id: 'run-legacy',
      runId: 'run-legacy',
      product: 'SAIGE',
      status: 'completed',
      startTime: '2026-05-24T00:00:00.000Z',
      stepCount: 5,
    });

    const [run] = store.listFlowAIRuns();
    expect(run.stepCount).toBe(5);
    expect(Object.keys(run.stepResults)).toEqual([
      'research',
      'design',
      'build',
      'qa_audit',
      'deploy',
    ]);
    expect(run.stepResults.research.summary).toContain('Legacy run progress backfilled');
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
