import { describe, expect, it } from 'vitest';
import { generatePrWorkflow } from '../../src/lib/sourceMapping/prWorkflowGenerator.js';

const RECOMMENDATION = Object.freeze({
  findingId: 'console-error',
  category: 'network.http_401',
  severity: 'high',
  filePath: 'src/lib/api/client.js',
  lineNumber: 42,
  proposedFix: 'Add token refresh handling before resource fetch.',
  confidence: 'MEDIUM',
  authority: 'recommend_only',
});

const REPO_CONFIG = Object.freeze({
  repo: 'https://github.com/veu-ai-studio/saige',
  branch: 'main',
  testCommand: 'npm run test',
});

describe('prWorkflowGenerator (U6)', () => {
  it('blocks PR creation until the operator explicitly approves', () => {
    const workflow = generatePrWorkflow({
      recommendation: RECOMMENDATION,
      repoConfig: REPO_CONFIG,
      operatorApproval: { approved: false },
    });

    expect(workflow).toMatchObject({
      kind: 'u6_pr_test_rollback_workflow',
      authority: 'operator_approval_required',
      prUrl: null,
      autoMerge: false,
      productAgnostic: true,
      blocked: true,
      blockedReason: 'operator_approval_required',
    });
    expect(workflow.branchName).toMatch(/^flowai\/u6-console-error-client-js-/);
    expect(workflow.testStatus).toMatchObject({
      status: 'not_started',
      required: true,
      command: 'npm run test',
      reason: 'operator_approval_required',
    });
    expect(workflow.rollbackRef).toMatchObject({
      kind: 'rollback_ref',
      strategy: 'restore_base_branch',
      baseBranch: 'main',
      findingId: 'console-error',
    });
  });

  it('emits an approved workflow envelope without ever allowing auto-merge', () => {
    const workflow = generatePrWorkflow({
      recommendation: RECOMMENDATION,
      repoConfig: REPO_CONFIG,
      operatorApproval: {
        approved: true,
        approvedBy: 'victor',
        approvedAt: '2026-05-22T15:00:00.000Z',
        reason: 'operator accepted recommendation',
      },
    });

    expect(workflow.authority).toBe('operator_approved');
    expect(workflow.blocked).toBe(false);
    expect(workflow.prUrl).toContain('https://github.com/veu-ai-studio/saige/compare/');
    expect(workflow.prUrl).toContain('?expand=1');
    expect(workflow.testStatus).toMatchObject({
      status: 'pending',
      required: true,
      command: 'npm run test',
      reason: 'ready_to_run_after_pr_branch_creation',
    });
    expect(workflow.autoMerge).toBe(false);
    expect(workflow.workflow.find((step) => step.step === 'open_pr')).toMatchObject({
      status: 'ready',
      autoMerge: false,
    });
    expect(workflow.workflow.find((step) => step.step === 'rollback_on_failure')).toMatchObject({
      status: 'ready',
    });
  });

  it('surfaces GitHub-connected token mode without leaking the token', () => {
    const workflow = generatePrWorkflow({
      recommendation: RECOMMENDATION,
      repoConfig: REPO_CONFIG,
      operatorApproval: { approved: true, approvedBy: 'victor' },
      githubOperatorToken: 'gho_secret_operator_token',
    });

    expect(workflow.operatorMode).toBe('github_connected');
    expect(workflow.credential).toEqual({
      tokenEnvVar: 'GITHUB_OPERATOR_TOKEN',
      tokenPresent: true,
      tokenRedacted: true,
    });
    expect(JSON.stringify(workflow)).not.toContain('gho_secret_operator_token');
    expect(workflow.workflow.find((step) => step.step === 'create_branch')).toMatchObject({
      usesToken: true,
      tokenEnvVar: 'GITHUB_OPERATOR_TOKEN',
    });
    expect(workflow.workflow.find((step) => step.step === 'open_pr')).toMatchObject({
      usesToken: true,
      tokenEnvVar: 'GITHUB_OPERATOR_TOKEN',
    });
    expect(workflow.rollbackRef.requiresTokenEnvVar).toBe('GITHUB_OPERATOR_TOKEN');
  });

  it('keeps PR creation blocked in connected mode until operator approval is explicit', () => {
    const workflow = generatePrWorkflow({
      recommendation: RECOMMENDATION,
      repoConfig: REPO_CONFIG,
      operatorApproval: { approved: false },
      operatorTokenPresent: true,
    });

    expect(workflow.operatorMode).toBe('github_connected');
    expect(workflow.authority).toBe('operator_approval_required');
    expect(workflow.prUrl).toBeNull();
    expect(workflow.workflow.find((step) => step.step === 'open_pr')).toMatchObject({
      status: 'blocked',
      usesToken: true,
    });
  });

  it('stays blocked and omits PR URLs when required inputs are missing', () => {
    const workflow = generatePrWorkflow({
      recommendation: null,
      repoConfig: REPO_CONFIG,
      operatorApproval: { approved: true },
    });

    expect(workflow.blocked).toBe(true);
    expect(workflow.blockedReason).toBe('missing_recommendation');
    expect(workflow.prUrl).toBeNull();
    expect(workflow.testStatus.reason).toBe('missing_recommendation');
  });

  it('is deterministic for identical recommendations and repo configs', () => {
    const first = generatePrWorkflow({
      recommendation: RECOMMENDATION,
      repoConfig: REPO_CONFIG,
      operatorApproval: { approved: true },
    });
    const second = generatePrWorkflow({
      recommendation: RECOMMENDATION,
      repoConfig: REPO_CONFIG,
      operatorApproval: { approved: true },
    });

    expect(second.branchName).toBe(first.branchName);
    expect(second.rollbackRef).toEqual(first.rollbackRef);
    expect(second.workflow).toEqual(first.workflow);
  });
});
