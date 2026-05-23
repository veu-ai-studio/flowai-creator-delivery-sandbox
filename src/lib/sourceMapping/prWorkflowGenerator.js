// U6 - operator-gated PR + test + rollback workflow generator.
//
// This module is intentionally pure: it does not fetch GitHub, create
// branches, open PRs, run tests, or merge anything. It emits a deterministic
// workflow envelope that an operator-approved executor can perform later.

'use strict';

const APPROVED_AUTHORITY = 'operator_approved';
const BLOCKED_AUTHORITY = 'operator_approval_required';
const DEFAULT_TEST_COMMAND = 'npm test';

function stableId(input) {
  const s = JSON.stringify(input ?? {});
  let hash = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, '0').slice(0, 7);
}

function slug(input, fallback = 'flowai-fix') {
  const value = String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return value || fallback;
}

function normalizeRepoConfig(repoConfig = {}) {
  const repoUrl = typeof repoConfig.repo === 'string' ? repoConfig.repo
    : typeof repoConfig.repoUrl === 'string' ? repoConfig.repoUrl
      : typeof repoConfig.githubRepoUrl === 'string' ? repoConfig.githubRepoUrl
        : null;
  const branch = typeof repoConfig.branch === 'string' && repoConfig.branch
    ? repoConfig.branch
    : 'main';
  const testCommand = typeof repoConfig.testCommand === 'string' && repoConfig.testCommand
    ? repoConfig.testCommand
    : DEFAULT_TEST_COMMAND;
  return {
    repoUrl,
    branch,
    testCommand,
    owner: repoConfig.owner ?? null,
    name: repoConfig.name ?? repoConfig.repoName ?? null,
  };
}

function recommendationLabel(recommendation = {}) {
  return recommendation?.findingId
    ?? recommendation?.id
    ?? recommendation?.category
    ?? recommendation?.filePath
    ?? 'recommendation';
}

function makeBranchName({ recommendation, repoConfig }) {
  const label = recommendationLabel(recommendation);
  const filePart = recommendation?.filePath ? slug(recommendation.filePath.split(/[\\/]/).pop(), 'source') : 'source';
  return `flowai/u6-${slug(label)}-${filePart}-${stableId({ recommendation, repoConfig })}`;
}

function makeRollbackRef({ branchName, repoConfig, recommendation }) {
  return Object.freeze({
    kind: 'rollback_ref',
    strategy: 'restore_base_branch',
    baseBranch: repoConfig.branch,
    branchName,
    findingId: recommendation?.findingId ?? recommendation?.id ?? null,
    command: `git push origin ${repoConfig.branch}:${branchName} --force-with-lease`,
    oneClickLabel: 'Rollback PR branch to base',
  });
}

function prUrlPlaceholder(repoUrl, branchName) {
  if (typeof repoUrl !== 'string' || !repoUrl.includes('github.com')) return null;
  const clean = repoUrl.replace(/\.git$/i, '').replace(/\/+$/g, '');
  return `${clean}/compare/${encodeURIComponent(branchName)}?expand=1`;
}

export function generatePrWorkflow({
  recommendation,
  repoConfig,
  operatorApproval,
} = {}) {
  const normalizedRepo = normalizeRepoConfig(repoConfig);
  const approved = operatorApproval?.approved === true;
  const branchName = makeBranchName({ recommendation, repoConfig: normalizedRepo });
  const rollbackRef = makeRollbackRef({ branchName, repoConfig: normalizedRepo, recommendation });
  const missing = [];
  if (!recommendation || typeof recommendation !== 'object') missing.push('recommendation');
  if (!normalizedRepo.repoUrl) missing.push('repoConfig.repo');

  const blocked = !approved || missing.length > 0;
  const prUrl = blocked ? null : prUrlPlaceholder(normalizedRepo.repoUrl, branchName);
  const testStatus = Object.freeze({
    status: blocked ? 'not_started' : 'pending',
    required: true,
    command: normalizedRepo.testCommand,
    reason: !approved ? 'operator_approval_required'
      : missing.length > 0 ? `missing_${missing.join('_')}`
        : 'ready_to_run_after_pr_branch_creation',
  });

  return Object.freeze({
    kind: 'u6_pr_test_rollback_workflow',
    authority: approved ? APPROVED_AUTHORITY : BLOCKED_AUTHORITY,
    approval: Object.freeze({
      approved,
      approvedBy: operatorApproval?.approvedBy ?? null,
      approvedAt: operatorApproval?.approvedAt ?? null,
      reason: operatorApproval?.reason ?? null,
    }),
    prUrl,
    branchName,
    testStatus,
    rollbackRef,
    autoMerge: false,
    productAgnostic: true,
    blocked,
    blockedReason: blocked
      ? (!approved ? 'operator_approval_required' : `missing_${missing.join('_')}`)
      : null,
    workflow: Object.freeze([
      Object.freeze({
        step: 'create_branch',
        status: blocked ? 'blocked' : 'ready',
        branchName,
        baseBranch: normalizedRepo.branch,
      }),
      Object.freeze({
        step: 'apply_recommendation',
        status: blocked ? 'blocked' : 'ready',
        filePath: recommendation?.filePath ?? null,
        authority: approved ? APPROVED_AUTHORITY : BLOCKED_AUTHORITY,
      }),
      Object.freeze({
        step: 'open_pr',
        status: blocked ? 'blocked' : 'ready',
        prUrl,
        autoMerge: false,
      }),
      Object.freeze({
        step: 'run_tests',
        status: testStatus.status,
        command: testStatus.command,
      }),
      Object.freeze({
        step: 'rollback_on_failure',
        status: 'ready',
        rollbackRef,
      }),
    ]),
  });
}

export const __internals = Object.freeze({
  APPROVED_AUTHORITY,
  BLOCKED_AUTHORITY,
  DEFAULT_TEST_COMMAND,
  stableId,
  slug,
  normalizeRepoConfig,
  makeBranchName,
  makeRollbackRef,
});
