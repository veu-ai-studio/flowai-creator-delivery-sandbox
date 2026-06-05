import { persistForgeStepArtifact } from './productSsotArtifactWriter.js';

const DEFAULT_ENVIRONMENT = 'prd';
const SYMBIOTIC_CONTEXT_KIND = 'product_ssot.symbiotic_context.v1';
const SYMBIOTIC_RUN_KIND = 'product_ssot.symbiotic_run.v1';
const FORGE_ARTIFACT_KIND = 'forge.step_artifact.v1';

function cleanString(value, fallback = null) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function normalizeRecordList(value) {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object') : [];
}

function latestArtifactsByStep(records) {
  const byStep = {};
  for (const entry of records) {
    if (entry.kind !== FORGE_ARTIFACT_KIND || !cleanString(entry.stepKey)) continue;
    byStep[entry.stepKey] = {
      stepKey: entry.stepKey,
      stepLabel: entry.stepLabel ?? entry.stepKey,
      runId: entry.runId ?? null,
      recordedAt: entry.recordedAt ?? null,
      mode: entry.mode ?? null,
      runtime: entry.runtime ?? null,
      proofLabel: entry.proofLabel ?? null,
      evidenceTier: entry.evidenceTier ?? null,
      artifact: entry.artifact && typeof entry.artifact === 'object' ? entry.artifact : {},
    };
  }
  return byStep;
}

function uniqueRecentRunIds(records, limit = 5) {
  const seen = new Set();
  const out = [];
  for (let i = records.length - 1; i >= 0 && out.length < limit; i -= 1) {
    const runId = cleanString(records[i]?.runId);
    if (!runId || seen.has(runId)) continue;
    seen.add(runId);
    out.push(runId);
  }
  return out;
}

function latestByKind(records, kind) {
  for (let i = records.length - 1; i >= 0; i -= 1) {
    if (records[i]?.kind === kind) return records[i];
  }
  return null;
}

export function buildProductSsotRunContext({
  productId,
  environment = DEFAULT_ENVIRONMENT,
  row,
  now = () => new Date().toISOString(),
} = {}) {
  const records = normalizeRecordList(row?.governance_record);
  const artifactsByStep = latestArtifactsByStep(records);
  const priorRunIds = uniqueRecentRunIds(records);
  const deployArtifact = artifactsByStep.deploy?.artifact ?? null;
  const monitorArtifact = artifactsByStep.monitor?.artifact ?? null;
  const latestSymbioticRun = latestByKind(records, SYMBIOTIC_RUN_KIND);

  return {
    kind: SYMBIOTIC_CONTEXT_KIND,
    productId: cleanString(productId),
    environment,
    hasPriorRun: records.length > 0,
    priorRunCount: priorRunIds.length,
    priorRunIds,
    sourceVersion: Number.isInteger(row?.version) ? row.version : null,
    sourceHash: row?.audit_hash_chain_pointer ?? null,
    updatedAt: row?.updated_at ?? null,
    latestArtifactsByStep: artifactsByStep,
    latestDeliveryArtifactUrl: deployArtifact?.outputUrl ?? deployArtifact?.deliveryArtifact?.outputUrl ?? null,
    latestMonitorStatus: monitorArtifact?.monitorStatus ?? monitorArtifact?.healthStatus ?? null,
    latestSymbioticRunId: latestSymbioticRun?.runId ?? null,
    loadedAt: now(),
  };
}

export async function readProductSsotRunContext({
  productId,
  environment = DEFAULT_ENVIRONMENT,
  supabase,
  now,
} = {}) {
  if (!supabase || typeof supabase.from !== 'function') {
    return { ok: false, reason: 'supabase_unavailable', context: null };
  }
  if (!cleanString(productId)) {
    return { ok: false, reason: 'productId_required', context: null };
  }

  const { data: row, error } = await supabase
    .from('product_ssot')
    .select('id, version, audit_hash_chain_pointer, governance_record, updated_at')
    .eq('product_id', productId)
    .eq('environment', environment)
    .maybeSingle();

  if (error) return { ok: false, reason: `product_ssot_select_failed:${error.message}`, context: null };
  if (!row) return { ok: false, reason: 'no_product_ssot_row', context: null };

  return {
    ok: true,
    reason: null,
    productSsotId: row.id ?? null,
    context: buildProductSsotRunContext({ productId, environment, row, now }),
  };
}

export function buildSymbioticRunSummary({
  productId,
  environment = DEFAULT_ENVIRONMENT,
  runId,
  url,
  priorContext,
  result,
  now = () => new Date().toISOString(),
} = {}) {
  return {
    kind: SYMBIOTIC_RUN_KIND,
    productId: cleanString(productId),
    environment,
    runId: cleanString(runId, 'unknown-run'),
    inputUrl: cleanString(url),
    priorContextLoaded: priorContext?.hasPriorRun === true,
    priorRunCount: Number.isFinite(priorContext?.priorRunCount) ? priorContext.priorRunCount : 0,
    priorSourceVersion: priorContext?.sourceVersion ?? null,
    priorSourceHash: priorContext?.sourceHash ?? null,
    latestDeliveryArtifactUrl: priorContext?.latestDeliveryArtifactUrl ?? null,
    exitReason: result?.exitReason ?? null,
    finalScore: typeof result?.finalScore === 'number' ? result.finalScore : null,
    gtmReady: result?.gtmReady === true,
    iterationsCompleted: Number.isFinite(result?.iterationsCompleted) ? result.iterationsCompleted : 0,
    recordedAt: now(),
  };
}

export async function persistSymbioticRunSummary({
  productId,
  environment = DEFAULT_ENVIRONMENT,
  runId,
  url,
  priorContext,
  result,
  supabase,
  writtenBy = 'run-construction',
  proofLabel = 'LIVE_PREVIEW',
  now,
} = {}) {
  const artifact = buildSymbioticRunSummary({
    productId,
    environment,
    runId,
    url,
    priorContext,
    result,
    now,
  });

  return persistForgeStepArtifact({
    productId,
    environment,
    runId,
    stepKey: 'symbiotic_loop',
    stepLabel: 'Symbiotic Loop',
    artifact,
    supabase,
    writtenBy,
    writeKind: SYMBIOTIC_RUN_KIND,
    mode: 'AUTOMATIC',
    runtime: 'live',
    evidenceTier: 'B',
    proofLabel,
    source: 'run-construction',
    now,
  });
}

export const __internals = Object.freeze({
  DEFAULT_ENVIRONMENT,
  SYMBIOTIC_CONTEXT_KIND,
  SYMBIOTIC_RUN_KIND,
  FORGE_ARTIFACT_KIND,
  latestArtifactsByStep,
  uniqueRecentRunIds,
});
