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
});
