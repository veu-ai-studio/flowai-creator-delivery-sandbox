import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  research: vi.fn(), design: vi.fn(), build: vi.fn(), audit: vi.fn(), deploy: vi.fn(), renewal: vi.fn(), gtm: vi.fn(), monitor: vi.fn(),
}));
vi.mock('../../src/lib/forge/researchRunner.js', () => ({ runResearch: mocks.research }));
vi.mock('../../src/lib/forge/designRunner.js', () => ({ runDesign: mocks.design }));
vi.mock('../../src/lib/forge/buildRunner.js', () => ({ runBuild: mocks.build }));
vi.mock('../../src/lib/forge/auditRunner.js', () => ({ runAudit: mocks.audit }));
vi.mock('../../src/lib/forge/deployRunner.js', () => ({ runDeploy: mocks.deploy }));
vi.mock('../../src/lib/forge/renewalRunner.js', () => ({ runRenewal: mocks.renewal }));
vi.mock('../../src/lib/forge/gtmRunner.js', () => ({ runGtm: mocks.gtm }));
vi.mock('../../src/lib/forge/monitorRunner.js', () => ({ runMonitor: mocks.monitor }));

import { INDEPENDENT_STAGE_ORDER, runIndependentStage } from '../../src/lib/forge/independentStageRunner.js';

const ready = {
  research: { readyForDesign: true }, design: { readyForBuild: true }, build: { readyForQualityAudit: true },
  qa_audit: { readyForDeploy: true }, deploy: { readyForSelfRenewal: true }, self_renewal: { readyForGtm: true },
  gtm: { readyForMonitor: true }, monitor: { loopClosed: true },
};

describe('Founder/Operator independent stage runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.research.mockResolvedValue(ready.research); mocks.design.mockResolvedValue(ready.design);
    mocks.build.mockResolvedValue(ready.build); mocks.audit.mockResolvedValue(ready.qa_audit);
    mocks.deploy.mockResolvedValue(ready.deploy); mocks.renewal.mockResolvedValue(ready.self_renewal);
    mocks.gtm.mockResolvedValue(ready.gtm); mocks.monitor.mockResolvedValue(ready.monitor);
  });

  it('runs all eight stages separately through the existing stage executors with durable provenance', async () => {
    const artifacts = [];
    for (const stage of INDEPENDENT_STAGE_ORDER) {
      const result = await runIndependentStage({
        stage, productId: 'flowai', tenantId: 'veu-ai-studio', actorId: 'founder-1', runId: `run-${stage}`,
        environment: 'staging', productionPromotionAuthorized: false,
        prerequisiteArtifacts: artifacts.slice(-1),
        existingDeployment: stage === 'deploy' ? { outputUrl: 'https://sandbox.example', environment: 'preview' } : undefined,
      });
      artifacts.push(result.artifact);
      expect(result.artifact.id).toMatch(new RegExp(`^flowai-independent-${stage}-`));
      expect(result.artifact.fingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(result.artifact.provenance).toMatchObject({ requestedStage: stage, tenantId: 'veu-ai-studio', actorId: 'founder-1', environment: 'staging', productionPromotionAuthorized: false });
      expect(result.clearanceAllowed).toBe(false);
    }
    expect([mocks.research, mocks.design, mocks.build, mocks.audit, mocks.deploy, mocks.renewal, mocks.gtm, mocks.monitor].map(fn => fn.mock.calls.length)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('fails closed for missing, malformed, or uncleared prerequisites', async () => {
    await expect(runIndependentStage({ stage: 'build', productId: 'flowai', tenantId: 't', actorId: 'a', environment: 'staging', prerequisiteArtifacts: [] })).rejects.toMatchObject({ code: 'PREREQUISITE_MISSING' });
    await expect(runIndependentStage({ stage: 'build', productId: 'flowai', tenantId: 't', actorId: 'a', environment: 'staging', prerequisiteArtifacts: [{ stage: 'design', id: 'x', fingerprint: 'bad', output: ready.design }] })).rejects.toMatchObject({ code: 'PREREQUISITE_MISSING' });
    await expect(runIndependentStage({ stage: 'build', productId: 'flowai', tenantId: 't', actorId: 'a', environment: 'staging', prerequisiteArtifacts: [{ stage: 'design', id: 'design-1', fingerprint: 'a'.repeat(64), output: { readyForBuild: false } }] })).rejects.toMatchObject({ code: 'PREREQUISITE_NOT_READY' });
    expect(mocks.build).not.toHaveBeenCalled();
  });

  it('fails closed outside staging and never accepts production promotion', async () => {
    await expect(runIndependentStage({ stage: 'research', productId: 'flowai', tenantId: 't', actorId: 'a', environment: 'production' })).rejects.toMatchObject({ code: 'NONPRODUCTION_BOUNDARY_REQUIRED' });
    await expect(runIndependentStage({ stage: 'research', productId: 'flowai', tenantId: 't', actorId: 'a', environment: 'staging', productionPromotionAuthorized: true })).rejects.toMatchObject({ code: 'NONPRODUCTION_BOUNDARY_REQUIRED' });
  });
});
