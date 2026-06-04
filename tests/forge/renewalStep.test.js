import { describe, expect, it, vi } from 'vitest';

import { formatRenewalEvidence } from '../../src/lib/forge/renewalEvidenceLogger.js';
import { runRenewal } from '../../src/lib/forge/renewalRunner.js';
import { RENEWAL_BLOCKED, RENEWAL_ESCALATED, RENEWAL_OPERATOR_GATE, scoreRenewalStep } from '../../src/lib/forge/renewalStepScorer.js';
import { buildRenewalTemplate } from '../../src/lib/forge/renewalTemplate.js';

const deployOutput = {
  productId: 'product-a',
  outputUrl: 'https://product-a.example.com',
  deploymentId: 'dpl_test',
  readyForSelfRenewal: true,
};

describe('Forge Step 6 Self-Renewal', () => {
  it('renewal template exposes canonical Step 6 sections', () => {
    expect(buildRenewalTemplate('product-a', deployOutput).sections.map(section => section.id)).toEqual([
      'renewal-deploy-gate',
      'renewal-agent-recommendation',
      'renewal-proposed-delta',
      'renewal-operator-approval',
      'renewal-application',
      'renewal-verification',
    ]);
  });

  it('blocks when no deploy artifact exists', async () => {
    const output = await runRenewal('product-a', {}, {}, {});
    expect(output.flag).toBe(RENEWAL_BLOCKED);
    expect(output.renewalComplete).toBe(false);
  });

  it('wraps Agent #3 recommendation without mutating when operator approval is absent', async () => {
    const output = await runRenewal('product-a', deployOutput, { auditIssuesCount: 2 }, {});
    expect(output.recommendation.agent_id).toBe(3);
    expect(output.recommendation.authority).toBe('recommend_only');
    expect(output.flag).toBe(RENEWAL_OPERATOR_GATE);
    expect(output.application.outcome).toBe('awaiting_operator');
  });

  it('does not apply a fix without explicit approval', async () => {
    const renewalAdapter = vi.fn();
    await runRenewal('product-a', deployOutput, { auditIssuesCount: 2 }, { renewalAdapter });
    expect(renewalAdapter).not.toHaveBeenCalled();
  });

  it('emits guidance instead of fake success when no safe adapter exists', async () => {
    const output = await runRenewal('product-a', deployOutput, {
      auditIssuesCount: 2,
      'renewal-operator-approval': 'authorized operator approves renewal attempt',
    }, {});
    expect(output.application.outcome).toBe('unavailable');
    expect(output.application.guidance).toMatch(/approved renewal branch/i);
    expect(output.renewalComplete).toBe(true);
  });

  it('escalates repeated renewal failures to human gate', async () => {
    const output = await runRenewal('product-a', deployOutput, {
      auditIssuesCount: 2,
      'renewal-operator-approval': 'authorized operator approves renewal attempt',
    }, { priorRenewalFailures: 3 });
    expect(output.flag).toBe(RENEWAL_ESCALATED);
    expect(output.application.requiresHumanGate).toBe(true);
  });

  it('applies only through an approved adapter and records before/after evidence', async () => {
    const output = await runRenewal('product-a', deployOutput, {
      auditIssuesCount: 2,
      'renewal-operator-approval': 'authorized operator approves renewal attempt',
      'renewal-verification': 'browser proof confirms the fix',
    }, {
      renewalAdapter: vi.fn(async () => ({
        ok: true,
        appliedFix: 'patched failing route',
        before: 'route failed',
        after: 'route passes',
        testResult: 'pass',
      })),
    });
    expect(output.application.outcome).toBe('applied');
    expect(output.application.before).toBe('route failed');
    expect(output.application.after).toBe('route passes');
    expect(output.renewalComplete).toBe(true);
    expect(output.readyForGtm).toBe(true);
  });

  it('scorer rejects silent mutation without approval', () => {
    const score = scoreRenewalStep({
      sections: [
        { id: 'renewal-deploy-gate', input: { readyForRenewal: true } },
        { id: 'renewal-agent-recommendation', input: { recommendation: 'renewal recommended' } },
        { id: 'renewal-proposed-delta', input: { proposedFix: 'patch' } },
        { id: 'renewal-operator-approval', input: { operatorApproved: false } },
        { id: 'renewal-application', input: { outcome: 'awaiting_operator' } },
        { id: 'renewal-verification', input: { status: 'MISSING' } },
      ],
    });
    expect(score.renewalComplete).toBe(false);
    expect(score.flag).toBe(RENEWAL_OPERATOR_GATE);
  });

  it('formats renewal evidence without inventing VERIFIED language', async () => {
    const output = await runRenewal('product-a', deployOutput, {}, {});
    const markdown = formatRenewalEvidence(output);
    expect(markdown).toContain('Authority: recommend_only');
    expect(markdown).not.toMatch(/VERIFIED/i);
  });
});
