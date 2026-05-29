function cleanGithubRepoUrl(repoUrl) {
  if (typeof repoUrl !== 'string' || !repoUrl.includes('github.com')) return null;
  return repoUrl.replace(/\.git$/i, '').replace(/\/+$/g, '');
}

function encodeBranchForGithubUrl(branchName) {
  return String(branchName ?? '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function latestBranchCreation(iterations = [], orchestrationLog = []) {
  const candidates = [];

  for (const iteration of Array.isArray(iterations) ? iterations : []) {
    if (typeof iteration?.branchName === 'string' && iteration.branchName) {
      candidates.push({
        branchName: iteration.branchName,
        filesCommitted: null,
        source: 'iteration',
      });
    }

    for (const step of Array.isArray(iteration?.steps) ? iteration.steps : []) {
      if (step?.step === 9 && step?.status === 'complete' && typeof step?.result?.branchName === 'string') {
        candidates.push({
          branchName: step.result.branchName,
          filesCommitted: step.result.filesCommitted ?? null,
          source: 'iteration_step',
        });
      }
    }
  }

  for (const log of Array.isArray(orchestrationLog) ? orchestrationLog : []) {
    if (log?.step === 9 && log?.status === 'complete' && typeof log?.result?.branchName === 'string') {
      candidates.push({
        branchName: log.result.branchName,
        filesCommitted: log.result.filesCommitted ?? null,
        source: 'orchestration_log',
      });
    }
  }

  return candidates.at(-1) ?? null;
}

function prApprovalGate(finalResult = {}) {
  const logs = Array.isArray(finalResult.orchestrationLog) ? finalResult.orchestrationLog : [];
  return logs.some((log) => (
    log?.step === 13
    && log?.result?.skipped === 'operator_approval_required'
  ));
}

export function extractBranchPrVisibility({ finalResult, repoConfig } = {}) {
  if (!finalResult || typeof finalResult !== 'object') return null;

  const repoUrl = cleanGithubRepoUrl(
    finalResult?.upgradeTargets?.upgradeRepo
    ?? finalResult?.product?.upgrade_repo
    ?? finalResult?.product?.upgradeRepo
    ?? finalResult?.product?.repo
    ?? finalResult?.product?.repoUrl
    ?? repoConfig?.upgrade_repo
    ?? repoConfig?.upgradeRepo
    ?? repoConfig?.repo
    ?? repoConfig?.repoUrl,
  );
  const baseBranch = finalResult?.upgradeTargets?.upgradeBranch
    ?? finalResult?.product?.upgrade_branch
    ?? finalResult?.product?.upgradeBranch
    ?? finalResult?.product?.branch
    ?? repoConfig?.upgrade_branch
    ?? repoConfig?.upgradeBranch
    ?? repoConfig?.branch
    ?? 'main';
  const branch = latestBranchCreation(finalResult.iterations, finalResult.orchestrationLog);

  if (!repoUrl || !branch?.branchName) return null;

  const encodedBranch = encodeBranchForGithubUrl(branch.branchName);
  const encodedBase = encodeURIComponent(baseBranch);
  const prUrl = typeof finalResult.prUrl === 'string' && finalResult.prUrl ? finalResult.prUrl : null;
  const approvalRequired = !prUrl && prApprovalGate(finalResult);

  return Object.freeze({
    branchName: branch.branchName,
    filesCommitted: branch.filesCommitted,
    branchUrl: `${repoUrl}/tree/${encodedBranch}`,
    compareUrl: `${repoUrl}/compare/${encodedBase}...${encodedBranch}?expand=1`,
    prUrl,
    approvalRequired,
    statusLabel: prUrl ? 'PR open' : approvalRequired ? 'Branch ready - approval required' : 'Branch ready',
  });
}

export const __internals = Object.freeze({
  cleanGithubRepoUrl,
  encodeBranchForGithubUrl,
  latestBranchCreation,
  prApprovalGate,
});
