import { describe, expect, it } from 'vitest';
import { __test } from '../../api/agent/3/execute.js';
import { FLOWAI_MACRO_STEPS, buildFlowAIStepPatchFromLog } from '../../src/lib/flowaiRunStore.js';

describe('Agent 3 Fresh Build operational ledger mapping', () => {
  it('maps successful Fresh Build evidence across all eight public stages', () => {
    const events = [
      { stage: 'feature_extractor', status: 'completed' },
      { stage: 'design_synthesizer', status: 'completed' },
      { stage: 'codebase_generator', status: 'completed', files: 12, platformDependencies: 0 },
      { stage: 'upgrade_repo_write', status: 'completed', previewUrl: 'https://preview.example.com' },
      { stage: 'score_capture', status: 'completed', finalScore: 96 },
    ];
    const logs = events.flatMap(__test.freshBuildEventToMacroLogs);

    const durableKeys = logs.flatMap((log) => Object.keys(buildFlowAIStepPatchFromLog(log).stepResults || {}));
    expect(durableKeys).toEqual(FLOWAI_MACRO_STEPS);
    expect(logs.find((log) => log.step === 10)?.result.previewUrl).toBe('https://preview.example.com');
    expect(logs.find((log) => log.step === 14)?.result.finalScore).toBe(96);
  });

  it('keeps blocked deployment and monitoring stages visibly blocked', () => {
    const deploy = __test.freshBuildEventToMacroLogs({
      stage: 'upgrade_repo_write',
      status: 'skipped',
      reason: 'DEPLOYMENT_ADAPTER_NOT_CONFIGURED',
    });
    expect(deploy.map((log) => log.step)).toEqual([10, 8]);
    expect(deploy.every((log) => log.status === 'skipped')).toBe(true);
    expect(deploy[0].result.reason).toBe('DEPLOYMENT_ADAPTER_NOT_CONFIGURED');
  });

  it('reuses a registered FlowAI target and falls back to the authorized delivery repo', () => {
    expect(__test.freshBuildProductConfig('https://flowai.flowaiplatform.com/landing', {}, {})).toMatchObject({
      name: 'FlowAI',
      upgrade_repo: 'https://github.com/victor2081new-cloud/flowai',
    });
    expect(__test.freshBuildProductConfig('https://example.com', { productName: 'Pilot' }, {
      FLOWAI_FRESH_BUILD_DELIVERY_REPO: 'https://github.com/veu-ai-studio/delivery',
      FLOWAI_FRESH_BUILD_DELIVERY_VERCEL_PROJECT_ID: 'prj_delivery',
      FLOWAI_FRESH_BUILD_DELIVERY_VERCEL_ORG_ID: 'team_flowai',
    })).toMatchObject({
      name: 'Pilot',
      upgrade_repo: 'https://github.com/veu-ai-studio/delivery',
      vercel_project_id: 'prj_delivery',
      vercel_org_id: 'team_flowai',
    });
  });
});
