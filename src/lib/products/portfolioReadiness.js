import { REGISTERED_PRODUCT_CONFIG } from './registeredProductConfig.js';
import { isUpgradeReady, normalizeUpgradeTargetState } from './upgradeTargetState.js';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hostOf(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    return new URL(value.startsWith('http') ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function withHttps(value) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const trimmed = value.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
}

export function registeredConfigForProduct(product = {}, configs = REGISTERED_PRODUCT_CONFIG) {
  const productName = normalizeText(product.name ?? product.product_name ?? product.label);
  const productSlug = normalizeText(product.slug);
  const productHost = hostOf(product.live_url ?? product.url ?? product.original_url ?? product.domain);

  return configs.find((config) => {
    const configName = normalizeText(config.name);
    const configSlug = normalizeText(config.slug);
    const configDomain = normalizeText(config.domain);
    return (productName && configName === productName)
      || (productSlug && configSlug === productSlug)
      || (productHost && configDomain && (productHost === configDomain || productHost.endsWith(`.${configDomain}`)));
  }) ?? null;
}

export function mergeProductUpgradeSources(product = {}, registryRow = {}) {
  const registered = registeredConfigForProduct(product) ?? {};
  const upgradeRepoDisplayUrl =
    registryRow.upgrade_repo_url ?? registryRow.upgrade_repo ?? product.upgrade_repo_url ?? product.upgrade_repo ?? registered.upgrade_repo ?? registered.repo;
  const deploymentDisplayUrl =
    registryRow.deployment_url ?? registryRow.upgrade_url ?? product.deployment_url ?? product.upgrade_url ?? registered.upgrade_url ?? withHttps(registered.domain);
  const explicitUpgradeRepoEvidence =
    registryRow.upgrade_repo_url ?? registryRow.upgrade_repo ?? product.upgrade_repo_url ?? product.upgrade_repo ?? registered.upgrade_repo;
  const explicitDeploymentEvidence =
    registryRow.deployment_url ?? registryRow.upgrade_url ?? product.deployment_url ?? product.upgrade_url ?? registered.deployment_url ?? registered.upgrade_url;
  return {
    ...registered,
    ...product,
    ...registryRow,
    original_url: product.original_url ?? product.live_url ?? product.url ?? registered.original_url ?? registered.domain,
    upgrade_repo_url: upgradeRepoDisplayUrl,
    deployment_url: deploymentDisplayUrl,
    upgrade_repo_status:
      registryRow.upgrade_repo_status ?? product.upgrade_repo_status ?? registered.upgrade_repo_status ?? (explicitUpgradeRepoEvidence ? undefined : 'missing'),
    deployment_status:
      registryRow.deployment_status ?? product.deployment_status ?? registered.deployment_status ?? (explicitDeploymentEvidence ? undefined : 'missing'),
  };
}

function labelFor(status) {
  return String(status ?? 'missing').replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}

export function productUpgradeReadiness(product = {}, registryRow = {}) {
  const merged = mergeProductUpgradeSources(product, registryRow);
  const state = normalizeUpgradeTargetState(merged);
  const ready = isUpgradeReady(state);
  return Object.freeze({
    state,
    ready,
    readyLabel: ready ? 'YES' : 'NO',
    upgradeRepoLabel: labelFor(state.upgrade_repo_status),
    deploymentLabel: labelFor(state.deployment_status),
    upgradeRepoUrl: state.upgrade_repo_url,
    deploymentUrl: state.deployment_url,
  });
}

export function summarizePortfolioUpgradeReadiness(products = [], registryRowsByName = {}) {
  const rows = (Array.isArray(products) ? products : []).map((product) => {
    const registryRow = registryRowsByName[product.name] ?? registryRowsByName[product.product_name] ?? {};
    return {
      product,
      readiness: productUpgradeReadiness(product, registryRow),
    };
  });
  return Object.freeze({
    rows,
    readyCount: rows.filter((row) => row.readiness.ready).length,
    totalCount: rows.length,
  });
}
