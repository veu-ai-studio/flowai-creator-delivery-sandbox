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
    expect(buildFlowAIStepPatchFromLog(logs.find((log) => log.step === 14)).stepResults.monitor.score).toBe(96);
  });

  it('maps description-driven Fresh Build design evidence across all eight public stages', () => {
    const events = [
      { stage: 'description_build_brief', status: 'completed' },
      { stage: 'design_synthesizer', status: 'completed' },
      { stage: 'codebase_generator', status: 'completed' },
      { stage: 'upgrade_repo_write', status: 'completed', previewUrl: 'https://preview.example.com' },
      { stage: 'score_capture', status: 'completed', finalScore: 96 },
    ];
    const logs = events.flatMap(__test.freshBuildEventToMacroLogs);
    const durableKeys = logs.flatMap((log) => Object.keys(buildFlowAIStepPatchFromLog(log).stepResults || {}));
    expect(durableKeys).toEqual(FLOWAI_MACRO_STEPS);
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

  it('reconciles terminal orchestration evidence and rejects a false 7/8 completion', () => {
    const existing = FLOWAI_MACRO_STEPS
      .filter((key) => key !== 'deploy')
      .reduce((acc, key) => ({ ...acc, [key]: { status: 'complete' } }), {});
    const terminal = {
      ok: true,
      orchestrationLog: [{
        step: 10.5,
        stepName: 'Deploy',
        status: 'degraded',
        result: { kind: 'forge.user_step.v1', userStep: 5, key: 'deploy' },
      }],
    };

    const reconciled = __test.reconcileTerminalStepResults(existing, terminal);
    expect(new Set(Object.keys(reconciled))).toEqual(new Set(FLOWAI_MACRO_STEPS));
    expect(reconciled.deploy.status).toBe('degraded');
    expect(__test.terminalLifecycleError(terminal, 7)).toMatchObject({
      code: 'INCOMPLETE_LIFECYCLE_EVIDENCE',
    });
    expect(__test.terminalLifecycleError(terminal, 8)).toMatchObject({
      code: 'NO_DEPLOYED_ARTIFACT',
    });
  });

  it('retries a rejected durable evidence write and derives completion from persisted evidence', async () => {
    const calls = [];
    const sevenSteps = FLOWAI_MACRO_STEPS
      .filter((key) => key !== 'deploy')
      .reduce((acc, key) => ({ ...acc, [key]: { status: 'complete' } }), {});
    const eightSteps = { ...sevenSteps, deploy: { status: 'degraded' } };
    const updateFn = async (_runId, _auth, patch) => {
      calls.push(patch);
      if (calls.length === 1) return { status: 'running', stepResults: sevenSteps, transitionRejected: true };
      return { status: 'running', stepResults: patch.stepResults, stepCount: patch.stepCount };
    };

    const persisted = await __test.persistOperationalPatchWithRetry({
      runId: 'run-cas',
      auth: { orgId: 'org', userId: 'user' },
      patch: { stepResults: eightSteps, stepCount: 8 },
      updateFn,
      getFn: async () => null,
    });

    expect(calls).toHaveLength(2);
    expect(Object.keys(persisted.stepResults)).toHaveLength(8);
    expect(__test.terminalLifecycleError({ ok: true, previewUrl: 'https://preview.example.com' }, Object.keys(persisted.stepResults).length)).toBeNull();
  });

  it('never treats an unpersisted 7/8 row as completed', async () => {
    const sevenSteps = FLOWAI_MACRO_STEPS
      .filter((key) => key !== 'deploy')
      .reduce((acc, key) => ({ ...acc, [key]: { status: 'complete' } }), {});
    const rejected = { status: 'running', stepResults: sevenSteps, transitionRejected: true };
    const persisted = await __test.persistOperationalPatchWithRetry({
      runId: 'run-cas-failed',
      auth: { orgId: 'org', userId: 'user' },
      patch: { stepResults: { ...sevenSteps, deploy: { status: 'degraded' } }, stepCount: 8 },
      updateFn: async () => rejected,
      getFn: async () => rejected,
    });

    const persistedCount = Object.keys(persisted.stepResults).length;
    expect(persistedCount).toBe(7);
    expect(__test.terminalLifecycleError({ ok: true }, persistedCount)).toMatchObject({
      code: 'INCOMPLETE_LIFECYCLE_EVIDENCE',
    });
  });

  it('never treats eight stage labels without a deployed artifact as completed', () => {
    expect(__test.terminalLifecycleError({ ok: true, previewUrl: null }, 8)).toEqual({
      code: 'NO_DEPLOYED_ARTIFACT',
      message: 'Run ended without a durable deployed preview artifact.',
    });
    expect(__test.terminalLifecycleError({ ok: true, previewUrl: 'preview.example.com' }, 8)).toMatchObject({
      code: 'NO_DEPLOYED_ARTIFACT',
    });
  });

  it('preserves a safe Fresh Build failure reason in the terminal ledger', () => {
    expect(__test.terminalLifecycleError({ ok: false, reason: 'GITHUB_TOKEN_REQUIRED' }, 8)).toMatchObject({
      code: 'GITHUB_TOKEN_REQUIRED',
    });
  });

  it('persists terminal score, branch, and preview evidence atomically', () => {
    const evidence = __test.terminalEvidencePatch({
      finalScore: 97,
      scoreStatus: 'SCORE_CAPTURED',
      gtmReady: true,
      previewUrl: 'https://preview.example.com',
      writeResult: {
        branchName: 'flowai/run-123',
        branchUrl: 'https://github.com/example/repo/tree/flowai/run-123',
        commitSha: 'abc123',
      },
    });
    expect(evidence).toMatchObject({
      score: 97,
      verdict: 'CLEARED',
      branchCreated: 'flowai/run-123',
      commitSha: 'abc123',
      previewUrl: 'https://preview.example.com',
      upgradedUrl: 'https://preview.example.com',
    });
  });

  it('fails closed when a captured Fresh Build score does not clear its target', () => {
    expect(__test.terminalLifecycleError({
      ok: true,
      previewUrl: 'https://preview.example.com',
      scoreStatus: 'SCORE_CAPTURED',
      finalScore: 91,
      gtmReady: false,
    }, 8)).toMatchObject({ code: 'GTM_SCORE_NOT_CLEARED' });
  });

  it('uses the isolated delivery repo before a registered reference URL', () => {
    expect(__test.freshBuildProductConfig('https://flowai.flowaiplatform.com/landing', {}, {})).toMatchObject({
      name: 'FlowAI',
      upgrade_repo: 'https://github.com/victor2081new-cloud/flowai',
    });
    expect(__test.freshBuildProductConfig('https://flowai.flowaiplatform.com/landing', { productName: 'Pilot' }, {
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
