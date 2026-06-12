import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardSrc = readFileSync(resolve(__dirname, '../../src/pages/FlowAIDashboard.jsx'), 'utf8');

describe('FlowAI result card objectives', () => {
  it('shows user request, objective tracking, attachment processing, and platform blocks', () => {
    expect(dashboardSrc).toContain('User requested');
    expect(dashboardSrc).toContain('8-step progress');
    expect(dashboardSrc).toContain('Attachments processed');
    expect(dashboardSrc).toContain('Objectives');
    expect(dashboardSrc).toContain('Platform blocked');
    expect(dashboardSrc).toContain('PLATFORM_BOUNDARY_BLOCKED');
  });

  it('counts completed macro steps from orchestration logs instead of matrix presence', () => {
    expect(dashboardSrc).toContain('buildFlowAIStepPatchFromLog(log)');
    expect(dashboardSrc).toContain('FLOWAI_MACRO_STEPS.filter((key) => keys.has(key)).length');
    expect(dashboardSrc).not.toContain('Object.values(matrix).filter');
  });

  it('keeps registry upgrade targets contextual when no current-run preview exists', () => {
    expect(dashboardSrc).toContain("finalResult.previewUrl && finalResult.upgradeDeployed === true");
    expect(dashboardSrc).toContain('Current-run Upgraded Version');
    expect(dashboardSrc).toContain('Registered upgrade target');
    expect(dashboardSrc).toContain('Context only; no current-run preview was produced.');
    expect(dashboardSrc).toContain('const upgradedUrl = currentRunDeployed');
    expect(dashboardSrc).toContain("payload.result?.upgradeDeployed === true");
    expect(dashboardSrc).not.toContain('?? finalDelivery.upgradedUrl');
  });
});
