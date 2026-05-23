function firstNonEmpty(...values) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0) ?? null;
}

export function resolveProductUpgradeTargets(product = {}) {
  const originalRepo = firstNonEmpty(
    product.original_repo,
    product.originalRepo,
    product.repo,
    product.github_repo_url,
    product.githubRepoUrl,
  );
  const upgradeRepo = firstNonEmpty(
    product.upgrade_repo,
    product.upgradeRepo,
    product.write_repo,
    product.writeRepo,
  ) ?? originalRepo;
  const originalUrl = firstNonEmpty(
    product.original_url,
    product.originalUrl,
    product.product_url,
    product.productUrl,
    product.live_url,
    product.liveUrl,
  );
  const upgradeUrl = firstNonEmpty(
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

  return Object.freeze({
    architecture: 'fork_based_upgrade',
    originalRepo,
    originalUrl,
    originalBranch,
    upgradeRepo,
    upgradeUrl,
    upgradeBranch,
    writesOriginalRepo: !!originalRepo && !!upgradeRepo && originalRepo === upgradeRepo,
    originalReadOnly: true,
    rollbackTarget: originalRepo,
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
    original_read_only: true,
    __upgradeTargets: targets,
  });
}
