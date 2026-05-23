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
    expect(storeSource).toContain('window.localStorage');
    expect(storeSource).toContain('window.dispatchEvent');
  });
});
