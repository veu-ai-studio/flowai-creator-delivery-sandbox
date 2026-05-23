import { describe, expect, it, vi } from 'vitest';
import { verifyProductionDeployment } from '../../src/lib/verification/productionVerifier.js';

describe('productionVerifier (U7)', () => {
  it('verifies findings that are absent from post-deploy analysis and proposes SSOT content', async () => {
    const result = await verifyProductionDeployment({
      preMergeRunId: 'run-pre-1',
      postDeployUrl: 'https://saigeplatform.com',
      findingIds: ['console-error', 'broken-modal'],
      currentSsotContent: '# SSOT Traceability\n',
      preMergeResult: { gtmScore: 64 },
      postDeployResult: {
        gtmScore: 78,
        findings: [{ findingId: 'dead-card', category: 'dead-card' }],
      },
      timestamp: '2026-05-22T20:00:00.000Z',
    });

    expect(result.verified.map((item) => item.findingId)).toEqual(['console-error', 'broken-modal']);
    expect(result.unresolved).toEqual([]);
    expect(result.scoreDelta).toMatchObject({
      before: 64,
      after: 78,
      delta: 14,
      direction: 'improved',
    });
    expect(result.ssotUpdated).toBe(true);
    expect(result.updatedSsotContent).toContain('### U7 Production Verification Update');
    expect(result.updatedSsotContent).toContain('- VERIFIED: console-error');
    expect(result.verificationReport).toMatchObject({
      kind: 'u7_production_verification',
      status: 'verified',
      ssotUpdateMode: 'return_content_for_engineering_commit',
    });
  });

  it('marks findings unresolved when they remain present after deployment', async () => {
    const result = await verifyProductionDeployment({
      preMergeRunId: 'run-pre-2',
      postDeployUrl: 'https://saigeplatform.com',
      findingIds: ['network.http_401', 'dead-card'],
      currentSsotContent: '# SSOT Traceability\n',
      preMergeResult: { score: 78 },
      postDeployResult: {
        score: 66,
        findings: [
          { id: 'network.http_401', severity: 'high' },
          { category: 'dead-card', severity: 'medium' },
        ],
      },
      timestamp: '2026-05-22T20:05:00.000Z',
    });

    expect(result.verified).toEqual([]);
    expect(result.unresolved.map((item) => item.findingId)).toEqual(['network.http_401', 'dead-card']);
    expect(result.scoreDelta).toMatchObject({
      before: 78,
      after: 66,
      delta: -12,
      direction: 'regressed',
    });
    expect(result.verificationReport.status).toBe('partial');
    expect(result.updatedSsotContent).toContain('- UNRESOLVED: network.http_401');
  });

  it('degrades without fabricating verification when no analysis evidence is available', async () => {
    const result = await verifyProductionDeployment({
      preMergeRunId: 'run-pre-3',
      postDeployUrl: 'https://saigeplatform.com',
      findingIds: ['console-error'],
      currentSsotContent: '# SSOT Traceability\n',
    });

    expect(result.verified).toEqual([]);
    expect(result.unresolved).toEqual([
      { findingId: 'console-error', status: 'unresolved', reason: 'production_analysis_unavailable' },
    ]);
    expect(result.scoreDelta.reason).toBe('production_analysis_unavailable');
    expect(result.ssotUpdated).toBe(false);
    expect(result.updatedSsotContent).toBe('# SSOT Traceability\n');
    expect(result.verificationReport.status).toBe('unverified');
  });

  it('calls an injected production analyzer and never mutates SSOT directly', async () => {
    const runProductionAnalysis = vi.fn(async () => ({
      trustScore: 90,
      findings: [],
    }));

    const result = await verifyProductionDeployment({
      preMergeRunId: 'run-pre-4',
      postDeployUrl: 'https://product.example',
      findingIds: ['broken-modal'],
      currentSsotContent: '# SSOT Traceability\n',
      preMergeResult: { trustScore: 88 },
      runProductionAnalysis,
      timestamp: '2026-05-22T20:10:00.000Z',
    });

    expect(runProductionAnalysis).toHaveBeenCalledWith({
      preMergeRunId: 'run-pre-4',
      postDeployUrl: 'https://product.example',
      findingIds: ['broken-modal'],
    });
    expect(result.verified).toEqual([
      { findingId: 'broken-modal', status: 'verified', reason: 'finding_absent_from_post_deploy_analysis' },
    ]);
    expect(result.scoreDelta.delta).toBe(2);
    expect(result.verificationReport.ssotUpdateMode).toBe('return_content_for_engineering_commit');
  });
});
