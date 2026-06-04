const DEFAULT_ENDPOINT = '/api/forge-artifact';

export function normalizePersistenceResult(result) {
  if (!result || typeof result !== 'object') {
    return { ok: false, persisted: false, state: 'failed', reason: 'empty_response' };
  }
  if (result.persisted === true || result.state === 'persisted') {
    return {
      ok: true,
      persisted: true,
      state: 'persisted',
      version: result.version ?? null,
      versionId: result.versionId ?? null,
      snapshotHash: result.snapshotHash ?? null,
      prevHash: result.prevHash ?? null,
    };
  }
  return {
    ok: false,
    persisted: false,
    state: result.state || 'failed',
    reason: result.reason || result.error || 'persist_failed',
  };
}

export function persistenceDisplayText(state) {
  if (!state) return 'persisted: pending';
  if (state.state === 'persisted') return `persisted: saved${state.version ? ` v${state.version}` : ''}`;
  if (state.state === 'skipped_auth_required') return 'persisted: skipped_auth_required';
  if (state.state === 'skipped_no_product') return 'persisted: skipped_no_product';
  if (state.state === 'skipped_supabase_unavailable') return 'persisted: skipped_supabase_unavailable';
  return 'persisted: failed';
}

export async function persistForgeStepArtifactClient({
  productId,
  environment = 'prd',
  runId,
  stepKey,
  stepLabel,
  artifact,
  mode = 'GUIDED',
  runtime = 'offline',
  evidenceTier = 'B',
  proofLabel = 'UNIT',
  source = 'forge-ui',
  endpoint = DEFAULT_ENDPOINT,
  fetchImpl = globalThis.fetch,
}) {
  if (!productId) {
    return { ok: false, persisted: false, state: 'skipped_no_product', reason: 'productId_required' };
  }
  if (typeof fetchImpl !== 'function') {
    return { ok: false, persisted: false, state: 'failed', reason: 'fetch_unavailable' };
  }

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
        source,
      }),
    });
    if (response.status === 401) {
      return { ok: false, persisted: false, state: 'skipped_auth_required', reason: 'auth_required' };
    }
    const payload = await response.json().catch(() => ({}));
    return normalizePersistenceResult(payload);
  } catch (error) {
    return {
      ok: false,
      persisted: false,
      state: 'failed',
      reason: error?.message || 'persist_request_failed',
    };
  }
}
