import { normalizeUpgradeTargetState } from './upgradeTargetState.js';

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0) ?? null;
}

export function resolveProductUpgradeTargets(product = {}) {
  if (product.__upgradeTargets && typeof product.__upgradeTargets === 'object') {
    return product.__upgradeTargets;
  }
  const state = normalizeUpgradeTargetState(product);
  const originalRepo = firstNonEmpty(
    state.original_repo_url,
    product.original_repo,
    product.originalRepo,
    product.repo,
    product.github_repo_url,
    product.githubRepoUrl,
  );
  const explicitUpgradeRepo = firstNonEmpty(
    state.upgrade_repo_url,
    product.upgrade_repo,
    product.upgradeRepo,
    product.write_repo,
    product.writeRepo,
  );
  const upgradeRepo = explicitUpgradeRepo ?? originalRepo;
  const originalUrl = firstNonEmpty(
    state.original_url,
    product.original_url,
    product.originalUrl,
    product.product_url,
    product.productUrl,
    product.live_url,
    product.liveUrl,
  );
  const upgradeUrl = firstNonEmpty(
    state.deployment_url,
    product.upgrade_url,
    product.upgradeUrl,
    product.deploy_target_url,
    product.deployTargetUrl,
  ) ?? originalUrl;
  const originalBranch = firstNonEmpty(
    product.original_branch,
    product.originalBranch,
    product.branch,
    product.self_renewal_branch,
  ) ?? 'main';
  const upgradeBranch = firstNonEmpty(
    product.upgrade_branch,
    product.upgradeBranch,
    product.self_renewal_branch,
    product.branch,
  ) ?? 'main';
  const explicitReadOnlyOriginal = product.original_read_only === true
    || product.original_status === 'read_only_baseline'
    || product.originalStatus === 'read_only_baseline';
  const explicitForkArchitecture = product.upgrade_architecture === 'fork_based_upgrade'
    || product.upgradeArchitecture === 'fork_based_upgrade';
  const upgradeRepoRequired = explicitReadOnlyOriginal
    || explicitForkArchitecture
    || !!firstNonEmpty(product.original_repo, product.originalRepo, product.original_repo_url)
    || !!explicitUpgradeRepo;
  const writesOriginalRepo = !!originalRepo && !!upgradeRepo && originalRepo === upgradeRepo;
  const authorizedIsolatedSameRepo = writesOriginalRepo
    && product.repository_owned_and_allowlisted === true
    && product.branch_policy === 'isolated_nonproduction'
    && product.productionPromotionAuthorized === false;
  const writeSafetyCode = !upgradeRepoRequired
    ? null
    : !explicitUpgradeRepo
      ? 'UPGRADE_REPO_REQUIRED'
      : writesOriginalRepo && !authorizedIsolatedSameRepo
        ? 'UPGRADE_TARGET_UNSAFE'
        : null;

  return Object.freeze({
    architecture: 'fork_based_upgrade',
    originalRepo,
    originalUrl,
    originalBranch,
    upgradeRepo,
    upgradeUrl,
    upgradeBranch,
    state,
    upgradeRepoExplicit: !!explicitUpgradeRepo,
    upgradeRepoRequired,
    writesOriginalRepo,
    authorizedIsolatedSameRepo,
    originalReadOnly: true,
    rollbackTarget: originalRepo,
    writeSafety: Object.freeze({
      ok: !writeSafetyCode,
      code: writeSafetyCode,
      reason: writeSafetyCode === 'UPGRADE_REPO_REQUIRED'
        ? 'missing_explicit_upgrade_repo'
        : writeSafetyCode === 'UPGRADE_TARGET_UNSAFE'
          ? 'upgrade_repo_matches_original_repo'
          : null,
    }),
  });
}

export function applyUpgradeTargetsToProduct(product = {}) {
  const targets = resolveProductUpgradeTargets(product);
  return Object.freeze({
    ...product,
    github_repo_url: targets.upgradeRepo,
    self_renewal_branch: targets.upgradeBranch,
    original_repo: targets.originalRepo,
    original_url: targets.originalUrl,
    upgrade_repo: targets.upgradeRepo,
    upgrade_url: targets.upgradeUrl,
    upgrade_branch: targets.upgradeBranch,
    rollback_repo: targets.rollbackTarget,
    upgrade_architecture: targets.architecture,
    upgrade_target_state: targets.state,
    upgrade_repo_status: targets.state.upgrade_repo_status,
    deployment_status: targets.state.deployment_status,
    deployment_url: targets.state.deployment_url,
    canonical_url: targets.state.canonical_url,
    original_read_only: true,
    __upgradeTargets: targets,
  });
}
