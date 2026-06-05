import { setCorsHeaders } from './_lib/claude.js';
import { withRequestLog } from './_lib/requestLog.js';
import {
  buildDeployTruthArtifact,
  fetchProductionVersion,
  summarizeDeployTruth,
} from '../src/lib/governance/deployTruth.js';
import { appendGovernanceEntryLight } from '../src/lib/governance/appendGovernanceEntry.light.js';
import { resolveBuildIdentity } from '../src/lib/observability/buildIdentity.js';

function requestBaseUrl(req) {
  const envUrl = process.env.FLOWAI_PRODUCTION_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  if (host) {
    const proto = req?.headers?.['x-forwarded-proto'] || 'https';
    return `${proto}://${host}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return null;
}

function expectedHead() {
  return process.env.EXPECTED_HEAD
    || process.env.FLOWAI_EXPECTED_HEAD
    || resolveBuildIdentity(process.env).commitFull
    || null;
}

function expectedBranch() {
  return process.env.EXPECTED_BRANCH
    || process.env.FLOWAI_EXPECTED_BRANCH
    || resolveBuildIdentity(process.env).branch
    || 'main';
}

function driftDetails({ productionCommit, expectedCommit }) {
  if (!productionCommit || !expectedCommit || productionCommit === expectedCommit) return [];
  return [
    `production=${productionCommit}`,
    `expected=${expectedCommit}`,
  ];
}

export async function runDeployTruthCheck({
  productionUrl,
  expectedCommit = expectedHead(),
  branch = expectedBranch(),
  fetchImpl = fetch,
  persist = null,
  requirePersistenceForOk = Boolean(persist),
} = {}) {
  const versionResult = await fetchProductionVersion({ productionUrl, fetchImpl });
  const productionCommit = versionResult.version?.commitFull || versionResult.version?.commit || null;
  const artifact = buildDeployTruthArtifact({
    productionVersion: versionResult.version,
    localHeadCommit: expectedCommit,
    branch,
    driftDetails: driftDetails({ productionCommit, expectedCommit }),
    blockedReason: versionResult.ok ? null : versionResult.reason,
  });
  const persistence = typeof persist === 'function'
    ? await persist({ entry: artifact })
    : { written: false, transport: null, reason: 'read_only_check' };
  const summary = summarizeDeployTruth({ artifact, persistence });
  return {
    ...summary,
    ok: requirePersistenceForOk
      ? summary.ok
      : artifact.status === 'MATCH',
  };
}

async function deployTruthCheckHandler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Use GET or POST' });
  }

  const productionUrl = requestBaseUrl(req);
  const persist = req.method === 'POST' ? appendGovernanceEntryLight : null;
  const summary = await runDeployTruthCheck({
    productionUrl,
    persist,
    requirePersistenceForOk: req.method === 'POST',
  });
  return res.status(200).json({
    ok: summary.ok,
    status: summary.artifact?.status || 'BLOCKED',
    artifact: summary.artifact,
    persistence: summary.persistence,
    productionCommitShort: summary.productionCommitShort,
    localHeadCommitShort: summary.localHeadCommitShort,
  });
}

export default withRequestLog(deployTruthCheckHandler, { endpoint: '/api/deploy-truth-check' });

export const __deployTruthCheckInternals = Object.freeze({
  requestBaseUrl,
  expectedHead,
  driftDetails,
});
