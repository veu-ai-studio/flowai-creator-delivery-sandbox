export const UPGRADE_REPO_STATUSES = Object.freeze([
  'missing',
  'provisioning',
  'provisioned',
  'access_blocked',
  'failed',
]);

export const DEPLOYMENT_STATUSES = Object.freeze([
  'missing',
  'provisioning',
  'deployed',
  'access_blocked',
  'failed',
]);

function validOrDefault(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === 'string' && value.trim()) ?? null;
}

export function normalizeUpgradeTargetState(product = {}) {
  const upgradeRepoUrl = firstNonEmpty(product.upgrade_repo_url, product.upgrade_repo, product.upgradeRepo, product.write_repo);
  const deploymentUrl = firstNonEmpty(product.deployment_url, product.deploymentUrl, product.upgrade_url, product.upgradeUrl);
  const originalUrl = firstNonEmpty(product.original_url, product.originalUrl, product.product_url, product.url, product.live_url);
  return Object.freeze({
    original_repo_url: firstNonEmpty(product.original_repo_url, product.original_repo, product.originalRepo, product.repo, product.github_repo_url),
    original_url: originalUrl,
    upgrade_repo_url: upgradeRepoUrl,
    upgrade_url: firstNonEmpty(product.upgrade_url, product.upgradeUrl),
    deployment_url: deploymentUrl,
    canonical_url: firstNonEmpty(product.canonical_url, product.canonicalUrl, product.upgrade_url, product.upgradeUrl, originalUrl),
    upgrade_repo_status: validOrDefault(
      product.upgrade_repo_status ?? product.upgrade_status,
      UPGRADE_REPO_STATUSES,
      upgradeRepoUrl ? 'provisioned' : 'missing',
    ),
    deployment_status: validOrDefault(
      product.deployment_status,
      DEPLOYMENT_STATUSES,
      deploymentUrl ? 'deployed' : 'missing',
    ),
    last_provisioning_error: product.last_provisioning_error ?? null,
    last_provisioned_at: product.last_provisioned_at ?? null,
    user_description: product.user_description ?? null,
    user_objectives_met: Array.isArray(product.user_objectives_met) ? product.user_objectives_met : [],
    user_objectives_pending: Array.isArray(product.user_objectives_pending) ? product.user_objectives_pending : [],
  });
}

export function isUpgradeReady(product = {}) {
  const state = normalizeUpgradeTargetState(product);
  return state.upgrade_repo_status === 'provisioned' && state.deployment_status === 'deployed';
}
