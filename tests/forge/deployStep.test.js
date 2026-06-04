import { describe, expect, it, vi } from 'vitest';

import { formatDeployEvidence } from '../../src/lib/forge/deployEvidenceLogger.js';
import { runDeploy } from '../../src/lib/forge/deployRunner.js';
import { DEPLOY_BLOCKED, DEPLOY_OPERATOR_GATE, DEPLOY_OUTPUT_REQUIRED, scoreDeployStep } from '../../src/lib/forge/deployStepScorer.js';
import { buildDeployTemplate } from '../../src/lib/forge/deployTemplate.js';

const blockedAudit = {
  productId: 'product-a',
  stepId: 'step-4-quality-audit',
  auditScore: 80,
  auditComplete: false,
  readyForDeploy: false,
};

const readyAudit = {
  ...blockedAudit,
  auditScore: 100,
  auditComplete: true,
  readyForDeploy: true,
};

describe('Forge Step 5 Deploy', () => {
  it('deploy template exposes the canonical Step 5 sections', () => {
    expect(buildDeployTemplate('product-a', readyAudit).sections.map(section => section.id)).toEqual([
      'deploy-audit-gate',
      'delivery-artifact',
      'distribution-adapter',
      'operator-approval',
      'browser-proof',
    ]);
  });

  it('blocks when Quality Audit has not cleared readyForDeploy', async () => {
    const output = await runDeploy('product-a', blockedAudit, {
      'operator-approval': 'approve',
    });
    expect(output.flag).toBe(DEPLOY_BLOCKED);
    expect(output.deployComplete).toBe(false);
    expect(output.outputUrl).toBeNull();
  });

  it('does not invoke deploy adapter before operator approval', async () => {
    const deployAdapter = vi.fn();
    const output = await runDeploy('product-a', readyAudit, {}, { deployAdapter });
    expect(output.flag).toBe(DEPLOY_OPERATOR_GATE);
    expect(deployAdapter).not.toHaveBeenCalled();
  });

  it('does not fabricate an outputUrl when no deploy adapter or evidence is configured', async () => {
    const output = await runDeploy('product-a', readyAudit, {
      'operator-approval': 'authorized operator approves deploy handoff',
    });
    expect(output.flag).toBe(DEPLOY_OUTPUT_REQUIRED);
    expect(output.outputUrl).toBeNull();
    expect(output.sections.find(section => section.id === 'delivery-artifact').input.reason)
      .toMatch(/no deploy adapter/i);
  });

  it('completes distribution handoff with a real adapter-produced URL', async () => {
    const output = await runDeploy('product-a', readyAudit, {
      'operator-approval': 'authorized operator approves deploy handoff',
      'browser-proof': 'Verified preview URL loads the intended commit.',
    }, {
      deployAdapter: vi.fn(async () => ({
        outputUrl: 'https://product-a-preview.example.com',
        deploymentId: 'dpl_test',
        commitSha: 'abc123',
        environment: 'preview',
      })),
    });

    expect(output.flag).toBeNull();
    expect(output.deployComplete).toBe(true);
    expect(output.readyForSelfRenewal).toBe(true);
    expect(output.outputUrl).toBe('https://product-a-preview.example.com');
    expect(output.distribution).toMatchObject({
      operatorApproved: true,
      submissionInitiated: true,
      postReviewStatus: 'tracked_by_monitor',
    });
  });

  it('scorer requires a real URL and distribution handoff', () => {
    const score = scoreDeployStep({
      sections: [
        { id: 'deploy-audit-gate', input: { readyForDeploy: true } },
        { id: 'delivery-artifact', input: { artifactProduced: true, outputUrl: '' } },
        { id: 'distribution-adapter', input: { submissionInitiated: true } },
        { id: 'operator-approval', input: { operatorApproved: true } },
        { id: 'browser-proof', input: { status: 'PASS' } },
      ],
    });
    expect(score.deployComplete).toBe(false);
    expect(score.flag).toBe(DEPLOY_OUTPUT_REQUIRED);
  });

  it('formats deploy evidence without inventing VERIFIED language', async () => {
    const output = await runDeploy('product-a', readyAudit, {
      'operator-approval': 'authorized operator approves deploy handoff',
    });
    const markdown = formatDeployEvidence(output);
    expect(markdown).toContain('OutputUrl: NONE');
    expect(markdown).not.toMatch(/VERIFIED/i);
  });
});
