import { createHash } from 'node:crypto';

import { appendGovernanceEntry } from '../agents/renewal/optionCPipeline.js';

const DEFAULT_ENVIRONMENT = 'prd';
const DEFAULT_WRITE_KIND = 'forge.step_artifact.v1';
const DEFAULT_EVIDENCE_TIER = 'B';
const DEFAULT_PROOF_LABEL = 'UNIT';

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortValue(value[key])]),
  );
}

export function canonicalJson(value) {
  return JSON.stringify(sortValue(value));
}

export function sha256Hex(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function cleanString(value, fallback = null) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function sameArtifactWrite(existing, entry, writeKind) {
  if (!existing || typeof existing !== 'object') return false;
  if (existing.kind !== entry.kind) return false;
  if (existing.productId !== entry.productId) return false;
  if (existing.environment !== entry.environment) return false;
  if (existing.runId !== entry.runId) return false;
  if (existing.stepKey !== entry.stepKey) return false;
  const existingArtifactKind = existing.artifact && typeof existing.artifact === 'object'
    ? existing.artifact.kind
    : null;
  const nextArtifactKind = entry.artifact && typeof entry.artifact === 'object'
    ? entry.artifact.kind
    : null;
  return (existingArtifactKind ?? writeKind) === (nextArtifactKind ?? writeKind);
}

function findExistingArtifactWrite(governanceRecord, entry, writeKind) {
  if (!Array.isArray(governanceRecord)) return null;
  for (let i = governanceRecord.length - 1; i >= 0; i -= 1) {
    if (sameArtifactWrite(governanceRecord[i], entry, writeKind)) {
      return governanceRecord[i];
    }
  }
  return null;
}

export function buildForgeStepArtifactEntry({
  productId,
  environment = DEFAULT_ENVIRONMENT,
  runId,
  stepKey,
  stepLabel,
  artifact,
  mode = 'GUIDED',
  runtime = 'offline',
  evidenceTier = DEFAULT_EVIDENCE_TIER,
  proofLabel = DEFAULT_PROOF_LABEL,
  persistedState = 'pending',
  source = 'forge',
  now = () => new Date().toISOString(),
}) {
  const normalizedArtifact = artifact && typeof artifact === 'object' ? artifact : {};
  return {
    kind: DEFAULT_WRITE_KIND,
    productId,
    environment,
    runId: cleanString(runId, 'unknown-run'),
    stepKey,
    stepLabel: cleanString(stepLabel, stepKey),
    artifact: normalizedArtifact,
    mode,
    runtime,
    evidenceTier,
    proofLabel,
    persistedState,
    source,
    recordedAt: now(),
  };
}

async function readVersionContext({ productId, environment, supabase }) {
  const { data: row, error } = await supabase
    .from('product_ssot')
    .select('id, version, audit_hash_chain_pointer, governance_record')
    .eq('product_id', productId)
    .eq('environment', environment)
    .maybeSingle();
  if (error) {
    return { ok: false, reason: `version_context_select_failed:${error.message}` };
  }
  if (!row) return { ok: false, reason: 'no_product_ssot_row' };
  return { ok: true, row };
}

async function insertVersionRow({
  supabase,
  productSsotId,
  version,
  writeKind,
  writtenBy,
  snapshotHash,
  prevHash,
}) {
  const { data, error } = await supabase
    .from('product_ssot_version')
    .insert({
      product_ssot_id: productSsotId,
      version,
      write_kind: writeKind,
      written_by: writtenBy,
      snapshot_hash: snapshotHash,
      prev_hash: prevHash,
    })
    .select('id')
    .single();
  if (error) return { ok: false, reason: `version_insert_failed:${error.message}` };
  return { ok: true, id: data?.id ?? null };
}

async function updateHashPointer({ supabase, productSsotId, version, snapshotHash }) {
  const { error } = await supabase
    .from('product_ssot')
    .update({
      version,
      audit_hash_chain_pointer: snapshotHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productSsotId)
    .select('id');
  if (error) return { ok: false, reason: `hash_pointer_update_failed:${error.message}` };
  return { ok: true };
}

async function deleteVersionRow({ supabase, versionId }) {
  if (!versionId) return { ok: false, reason: 'version_id_missing' };
  const { error } = await supabase
    .from('product_ssot_version')
    .delete()
    .eq('id', versionId);
  if (error) return { ok: false, reason: `version_delete_failed:${error.message}` };
  return { ok: true };
}

export async function persistForgeStepArtifact({
  productId,
  environment = DEFAULT_ENVIRONMENT,
  runId,
  stepKey,
  stepLabel,
  artifact,
  supabase,
  writtenBy = 'unknown-operator',
  writeKind = DEFAULT_WRITE_KIND,
  mode = 'GUIDED',
  runtime = 'offline',
  evidenceTier = DEFAULT_EVIDENCE_TIER,
  proofLabel = DEFAULT_PROOF_LABEL,
  source = 'forge',
  now,
}) {
  if (!supabase || typeof supabase.from !== 'function') {
    return { ok: false, persisted: false, state: 'skipped_supabase_unavailable', reason: 'supabase_unavailable' };
  }
  if (!cleanString(productId)) {
    return { ok: false, persisted: false, state: 'failed', reason: 'productId_required' };
  }
  if (!cleanString(stepKey)) {
    return { ok: false, persisted: false, state: 'failed', reason: 'stepKey_required' };
  }

  const entry = buildForgeStepArtifactEntry({
    productId,
    environment,
    runId,
    stepKey,
    stepLabel,
    artifact,
    mode,
    runtime,
    evidenceTier,
    proofLabel,
    persistedState: 'persisted',
    source,
    now,
  });

  const priorVersionContext = await readVersionContext({ productId, environment, supabase });
  if (priorVersionContext.ok) {
    const existingEntry = findExistingArtifactWrite(
      priorVersionContext.row.governance_record,
      entry,
      writeKind,
    );
    if (existingEntry) {
      return {
        ok: true,
        persisted: true,
        state: 'already_persisted',
        reason: null,
        idempotent: true,
        entry: existingEntry,
        version: Number.isInteger(priorVersionContext.row.version) ? priorVersionContext.row.version : null,
        versionId: null,
        snapshotHash: priorVersionContext.row.audit_hash_chain_pointer ?? null,
        prevHash: priorVersionContext.row.audit_hash_chain_pointer ?? null,
      };
    }
  }

  const governanceWrite = await appendGovernanceEntry({
    productId,
    environment,
    entry,
    supabase,
  });
  if (!governanceWrite?.written) {
    return {
      ok: false,
      persisted: false,
      state: 'failed',
      reason: governanceWrite?.reason ?? 'governance_write_failed',
      entry,
      rollback: governanceWrite?.rollback ?? null,
    };
  }

  const versionContext = await readVersionContext({ productId, environment, supabase });
  if (!versionContext.ok) {
    const rollback = await governanceWrite.rollback?.();
    return {
      ok: false,
      persisted: false,
      state: 'failed',
      reason: versionContext.reason,
      entry,
      rollback,
    };
  }

  const currentVersion = Number.isInteger(versionContext.row.version) ? versionContext.row.version : 1;
  const nextVersion = currentVersion + 1;
  const prevHash = versionContext.row.audit_hash_chain_pointer ?? null;
  const snapshotHash = sha256Hex({
    productId,
    environment,
    version: nextVersion,
    writeKind,
    governance_record: versionContext.row.governance_record ?? [],
  });

  const versionWrite = await insertVersionRow({
    supabase,
    productSsotId: versionContext.row.id,
    version: nextVersion,
    writeKind,
    writtenBy,
    snapshotHash,
    prevHash,
  });
  if (!versionWrite.ok) {
    const rollback = await governanceWrite.rollback?.();
    return {
      ok: false,
      persisted: false,
      state: 'failed',
      reason: versionWrite.reason,
      entry,
      rollback,
    };
  }

  const pointerWrite = await updateHashPointer({
    supabase,
    productSsotId: versionContext.row.id,
    version: nextVersion,
    snapshotHash,
  });
  if (!pointerWrite.ok) {
    const rollback = await governanceWrite.rollback?.();
    const versionRollback = await deleteVersionRow({ supabase, versionId: versionWrite.id });
    return {
      ok: false,
      persisted: false,
      state: 'failed',
      reason: pointerWrite.reason,
      entry,
      version: nextVersion,
      versionId: versionWrite.id,
      snapshotHash,
      prevHash,
      rollback,
      versionRollback,
    };
  }

  return {
    ok: true,
    persisted: true,
    state: 'persisted',
    entry,
    version: nextVersion,
    versionId: versionWrite.id,
    snapshotHash,
    prevHash,
  };
}

export const __internals = Object.freeze({
  DEFAULT_ENVIRONMENT,
  DEFAULT_WRITE_KIND,
  DEFAULT_EVIDENCE_TIER,
  DEFAULT_PROOF_LABEL,
  readVersionContext,
  insertVersionRow,
  updateHashPointer,
  deleteVersionRow,
});
