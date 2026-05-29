#!/usr/bin/env node
// scripts/check-ssot-traceability.mjs
//
// SSOT claim-to-runtime traceability checker.
// Reads docs/specs/SSOT_TRACEABILITY_MATRIX.sidecar.json and validates:
//   1. Schema shape: every claim has the required fields.
//   2. Evidence appropriate to verificationType for any VERIFIED claim.
//   3. runtimeArtifactRequired=true VERIFIED claims have runtimeEvidence.
// Negative controls (isNegativeControl:true) are exempt from FAIL checks.
// Warnings (non-fatal): stale evidence, non-empty contradictions,
// CRITICAL severity non-VERIFIED claims (excluding negative controls).
// Exit 0 on no FAIL, exit 1 otherwise.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const SIDECAR_PATH = path.join(repoRoot, 'docs', 'specs', 'SSOT_TRACEABILITY_MATRIX.sidecar.json');

const VALID_STATUS = new Set([
  'VERIFIED', 'PARTIAL', 'STUBBED', 'SIMULATED', 'NOT_IMPLEMENTED', 'DEFERRED', 'UNKNOWN',
]);
const VALID_CONFIDENCE = new Set(['HIGH', 'MEDIUM', 'LOW']);
const VALID_SCOPE = new Set(['BRANCH_ONLY', 'PRODUCTION', 'GOVERNANCE', 'EXPERIMENTAL']);
const VALID_VERIFICATION_TYPE = new Set([
  'UNIT_TEST', 'INTEGRATION_TEST', 'LIVE_RUNTIME', 'GOVERNANCE_RECORD',
  'MANUAL_INSPECTION', 'DEPLOYMENT_EVIDENCE',
]);
const VALID_SEVERITY = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const VALID_FRESHNESS = new Set(['CURRENT', 'RECENT', 'STALE', 'UNKNOWN']);

const REQUIRED_FIELDS = [
  'claimId', 'status', 'verificationType', 'isNegativeControl',
  'operationalSeverity', 'implementationFiles', 'testFiles',
  'runtimeEvidence', 'governanceEvidence',
];

const fails = [];
const warns = [];

function fail(claimId, message) { fails.push({ claimId, message }); }
function warn(claimId, message) { warns.push({ claimId, message }); }

function isArray(v) { return Array.isArray(v); }

function validateShape(claim) {
  const id = claim.claimId || '(missing claimId)';
  for (const field of REQUIRED_FIELDS) {
    if (!(field in claim)) {
      fail(id, `missing required field: ${field}`);
    }
  }
  if (claim.status && !VALID_STATUS.has(claim.status)) {
    fail(id, `invalid status: ${claim.status}`);
  }
  if (claim.confidence && !VALID_CONFIDENCE.has(claim.confidence)) {
    fail(id, `invalid confidence: ${claim.confidence}`);
  }
  if (claim.scope && !VALID_SCOPE.has(claim.scope)) {
    fail(id, `invalid scope: ${claim.scope}`);
  }
  if (claim.verificationType && !VALID_VERIFICATION_TYPE.has(claim.verificationType)) {
    fail(id, `invalid verificationType: ${claim.verificationType}`);
  }
  if (claim.operationalSeverity && !VALID_SEVERITY.has(claim.operationalSeverity)) {
    fail(id, `invalid operationalSeverity: ${claim.operationalSeverity}`);
  }
  if (claim.evidenceFreshness && !VALID_FRESHNESS.has(claim.evidenceFreshness)) {
    fail(id, `invalid evidenceFreshness: ${claim.evidenceFreshness}`);
  }
  if (typeof claim.isNegativeControl !== 'boolean') {
    fail(id, `isNegativeControl must be boolean, got ${typeof claim.isNegativeControl}`);
  }
  if (typeof claim.runtimeArtifactRequired !== 'boolean') {
    fail(id, `runtimeArtifactRequired must be boolean, got ${typeof claim.runtimeArtifactRequired}`);
  }
  for (const arr of ['implementationFiles', 'testFiles', 'runtimeEvidence', 'governanceEvidence']) {
    if (arr in claim && !isArray(claim[arr])) {
      fail(id, `${arr} must be an array, got ${typeof claim[arr]}`);
    }
  }
  if ('contradictions' in claim && !isArray(claim.contradictions)) {
    fail(id, `contradictions must be an array, got ${typeof claim.contradictions}`);
  }
  if ('gaps' in claim && !isArray(claim.gaps)) {
    fail(id, `gaps must be an array, got ${typeof claim.gaps}`);
  }
}

function validateEvidenceRules(claim) {
  const id = claim.claimId;
  if (claim.isNegativeControl === true) return;
  if (claim.status === 'UNKNOWN') {
    fail(id, 'release-critical claim has status UNKNOWN after evidence search');
    return;
  }
  if (claim.status !== 'VERIFIED') return;
  switch (claim.verificationType) {
    case 'LIVE_RUNTIME':
    case 'DEPLOYMENT_EVIDENCE':
      if (!isArray(claim.runtimeEvidence) || claim.runtimeEvidence.length === 0) {
        fail(id, `VERIFIED with verificationType=${claim.verificationType} requires non-empty runtimeEvidence`);
      }
      break;
    case 'UNIT_TEST':
    case 'INTEGRATION_TEST':
      if (!isArray(claim.testFiles) || claim.testFiles.length === 0) {
        fail(id, `VERIFIED with verificationType=${claim.verificationType} requires non-empty testFiles`);
      }
      if (!isArray(claim.implementationFiles) || claim.implementationFiles.length === 0) {
        fail(id, `VERIFIED with verificationType=${claim.verificationType} requires non-empty implementationFiles`);
      }
      break;
    case 'GOVERNANCE_RECORD':
      if (!isArray(claim.governanceEvidence) || claim.governanceEvidence.length === 0) {
        fail(id, 'VERIFIED with verificationType=GOVERNANCE_RECORD requires non-empty governanceEvidence');
      }
      break;
    case 'MANUAL_INSPECTION':
      if (!claim.lastVerifiedAt || !claim.verifiedAgainstCommit) {
        fail(id, 'VERIFIED with verificationType=MANUAL_INSPECTION requires lastVerifiedAt + verifiedAgainstCommit (inspector identity + timestamp)');
      }
      break;
    default:
      break;
  }
  if (claim.runtimeArtifactRequired === true && (!isArray(claim.runtimeEvidence) || claim.runtimeEvidence.length === 0)) {
    fail(id, 'VERIFIED with runtimeArtifactRequired=true requires non-empty runtimeEvidence');
  }
}

function collectWarnings(claim) {
  const id = claim.claimId;
  if (claim.evidenceFreshness === 'STALE' && claim.status === 'VERIFIED') {
    warn(id, `VERIFIED claim has STALE evidence (verifiedAgainstCommit=${claim.verifiedAgainstCommit ?? 'unknown'})`);
  }
  if (isArray(claim.contradictions) && claim.contradictions.length > 0) {
    warn(id, `non-empty contradictions[] (${claim.contradictions.length} entries)`);
  }
  if (claim.operationalSeverity === 'CRITICAL' && claim.status !== 'VERIFIED' && claim.isNegativeControl !== true) {
    warn(id, `CRITICAL severity but status=${claim.status} (not VERIFIED)`);
  }
}

async function main() {
  const raw = await readFile(SIDECAR_PATH, 'utf8');
  const sidecar = JSON.parse(raw);
  if (!isArray(sidecar.claims)) {
    process.stderr.write(`FAIL: sidecar.claims is not an array\n`);
    process.exit(1);
  }
  const counts = {
    VERIFIED: 0, PARTIAL: 0, STUBBED: 0, SIMULATED: 0,
    NOT_IMPLEMENTED: 0, DEFERRED: 0, UNKNOWN: 0,
  };
  let negativeControls = 0;
  let contradictionsCount = 0;
  let staleCount = 0;
  let criticalNonVerified = 0;
  let anyNonVerified = false;

  for (const claim of sidecar.claims) {
    validateShape(claim);
    validateEvidenceRules(claim);
    collectWarnings(claim);
    if (claim.status && claim.status in counts) counts[claim.status] += 1;
    if (claim.isNegativeControl === true) negativeControls += 1;
    if (isArray(claim.contradictions) && claim.contradictions.length > 0) contradictionsCount += 1;
    if (claim.evidenceFreshness === 'STALE') staleCount += 1;
    if (claim.operationalSeverity === 'CRITICAL' && claim.status !== 'VERIFIED' && claim.isNegativeControl !== true) {
      criticalNonVerified += 1;
    }
    if (claim.status !== 'VERIFIED' && claim.isNegativeControl !== true) anyNonVerified = true;
  }

  if (!anyNonVerified && sidecar.claims.length > 0) {
    fail('(matrix-level)', 'at least one real claim must have status != VERIFIED (negative control alone does not satisfy this rule)');
  }

  process.stdout.write(`SSOT traceability check — sidecar: ${SIDECAR_PATH}\n`);
  process.stdout.write(`Head commit: ${sidecar.headCommit ?? '(unset)'}\n`);
  process.stdout.write(`Production commit: ${sidecar.productionCommit ?? 'UNKNOWN'}\n`);
  process.stdout.write(`Governance status: ${sidecar.governanceStatus ?? '(unset)'}\n`);
  process.stdout.write(`Panel artifact: ${sidecar.panelArtifact ?? '(unset)'}\n`);
  process.stdout.write(`Claims mapped: ${sidecar.claims.length}\n`);
  process.stdout.write(`\nStatus tally:\n`);
  for (const k of Object.keys(counts)) process.stdout.write(`  ${k}: ${counts[k]}\n`);
  process.stdout.write(`\nNEGATIVE CONTROLS: ${negativeControls}\n`);
  process.stdout.write(`CONTRADICTIONS: ${contradictionsCount}\n`);
  process.stdout.write(`STALE EVIDENCE: ${staleCount}\n`);
  process.stdout.write(`CRITICAL NON-VERIFIED (excl. negative controls): ${criticalNonVerified}\n`);

  if (warns.length > 0) {
    process.stdout.write(`\nWARNINGS (${warns.length}):\n`);
    for (const w of warns) process.stdout.write(`  [${w.claimId}] ${w.message}\n`);
  }
  if (fails.length > 0) {
    process.stderr.write(`\nFAILURES (${fails.length}):\n`);
    for (const f of fails) process.stderr.write(`  [${f.claimId}] ${f.message}\n`);
    process.stderr.write(`\nResult: FAIL\n`);
    process.exit(1);
  }
  process.stdout.write(`\nResult: PASS\n`);
  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`check-ssot-traceability CRASH: ${e?.stack ?? e}\n`);
  process.exit(2);
});
