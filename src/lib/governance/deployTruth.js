const DEPLOY_TRUTH_KIND = 'deploy_truth.drift_check.v1';
const DEFAULT_PRODUCT_ID = 'flowai';
const DEFAULT_ENVIRONMENT = 'prd';

function normalizeCommit(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function shortCommit(value) {
  return normalizeCommit(value)?.slice(0, 12) || null;
}

function commitsMatch(productionCommit, localHeadCommit) {
  const prod = normalizeCommit(productionCommit);
  const local = normalizeCommit(localHeadCommit);
  if (!prod || !local) return false;
  return prod === local || prod.startsWith(local) || local.startsWith(prod);
}

export function buildDeployTruthArtifact({
  checkedAt = new Date().toISOString(),
  productionVersion,
  localHeadCommit,
  branch,
  driftDetails = [],
  blockedReason,
} = {}) {
  const productionCommit = normalizeCommit(productionVersion?.commitFull)
    || normalizeCommit(productionVersion?.commit);
  const normalizedLocalHead = normalizeCommit(localHeadCommit);
  const normalizedBranch = normalizeCommit(branch)
    || normalizeCommit(productionVersion?.branch)
    || null;
  const blockers = [];

  if (!productionCommit) blockers.push('production_commit_missing');
  if (!normalizedLocalHead) blockers.push('local_head_commit_missing');
  if (blockedReason) blockers.push(String(blockedReason));

  const status = blockers.length > 0
    ? 'BLOCKED'
    : commitsMatch(productionCommit, normalizedLocalHead) ? 'MATCH' : 'DRIFT';

  const artifact = {
    kind: DEPLOY_TRUTH_KIND,
    checkedAt,
    productionCommit,
    localHeadCommit: normalizedLocalHead,
    branch: normalizedBranch,
    status,
  };

  if (status === 'DRIFT') {
    artifact.driftDetails = Array.isArray(driftDetails) ? driftDetails : [];
  }
  if (status === 'BLOCKED') {
    artifact.blockers = blockers;
  }
  if (productionVersion?.deployUrl) {
    artifact.productionDeployment = productionVersion.deployUrl;
  }
  if (productionVersion?.env) {
    artifact.productionEnvironment = productionVersion.env;
  }

  return artifact;
}

export async function fetchProductionVersion({ productionUrl, fetchImpl = fetch } = {}) {
  if (!productionUrl) {
    return { ok: false, reason: 'production_url_missing', version: null };
  }
  const base = String(productionUrl).replace(/\/+$/, '');
  try {
    const response = await fetchImpl(`${base}/api/version`, {
      headers: { Accept: 'application/json' },
    });
    if (!response?.ok) {
      return {
        ok: false,
        reason: `version_endpoint_http_${response?.status || 'unknown'}`,
        version: null,
      };
    }
    return { ok: true, version: await response.json() };
  } catch (error) {
    return { ok: false, reason: error?.message || 'version_endpoint_failed', version: null };
  }
}

export async function persistDeployTruthArtifact({
  artifact,
  supabase,
  kv,
  appendGovernanceEntry,
  productId = DEFAULT_PRODUCT_ID,
  environment = DEFAULT_ENVIRONMENT,
} = {}) {
  if (!artifact || artifact.kind !== DEPLOY_TRUTH_KIND) {
    return { written: false, transport: null, reason: 'invalid_deploy_truth_artifact' };
  }

  if (supabase && typeof appendGovernanceEntry === 'function') {
    const result = await appendGovernanceEntry({
      productId,
      environment,
      entry: artifact,
      supabase,
    });
    if (result?.written) {
      return { written: true, transport: 'supabase', result };
    }
    return {
      written: false,
      transport: 'supabase',
      reason: result?.reason || 'supabase_write_failed',
      result,
    };
  }

  if (kv && typeof kv.set === 'function') {
    const key = `flowai:governance:deploy-truth:${artifact.checkedAt}`;
    await kv.set(key, artifact);
    return { written: true, transport: 'kv', key };
  }

  return { written: false, transport: null, reason: 'governance_store_unavailable' };
}

export function summarizeDeployTruth({ artifact, persistence } = {}) {
  return {
    ok: artifact?.status === 'MATCH' && persistence?.written === true,
    artifact,
    persistence: persistence || { written: false, reason: 'not_attempted' },
    productionCommitShort: shortCommit(artifact?.productionCommit),
    localHeadCommitShort: shortCommit(artifact?.localHeadCommit),
  };
}

export const DEPLOY_TRUTH = Object.freeze({
  KIND: DEPLOY_TRUTH_KIND,
  DEFAULT_PRODUCT_ID,
  DEFAULT_ENVIRONMENT,
});

export const __deployTruthInternals = Object.freeze({
  commitsMatch,
  normalizeCommit,
  shortCommit,
});
