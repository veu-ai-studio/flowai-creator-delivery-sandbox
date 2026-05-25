import { setCorsHeaders } from './_lib/claude.js';
import { withRequestLog } from './_lib/requestLog.js';
import {
  buildDeployTruthArtifact,
  fetchProductionVersion,
  summarizeDeployTruth,
} from '../src/lib/governance/deployTruth.js';
import { appendGovernanceEntryLight } from '../src/lib/governance/appendGovernanceEntry.light.js';

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
    || process.env.VERCEL_GIT_COMMIT_SHA
    || null;
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
  branch = process.env.VERCEL_GIT_COMMIT_REF || 'flowai-v0.1',
  fetchImpl = fetch,
  persist = appendGovernanceEntryLight,
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
  const persistence = await persist({ entry: artifact });
  return summarizeDeployTruth({ artifact, persistence });
}

async function deployTruthCheckHandler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const productionUrl = requestBaseUrl(req);
  const summary = await runDeployTruthCheck({ productionUrl });
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
