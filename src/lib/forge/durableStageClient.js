export async function loadDurableStageArtifacts({ getBearerToken, productId }) {
  const token = await getBearerToken();
  const response = await fetch('/api/runs', {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const payload = await response.json();
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
  }
  const artifacts = {};
  for (const run of payload.runs || []) {
    if (run.product !== productId) continue;
    for (const [stage, result] of Object.entries(run.stepResults || {})) {
      const artifact = Array.isArray(result?.artifacts) ? result.artifacts[0] : null;
      if (artifact && !artifacts[stage]) artifacts[stage] = artifact;
    }
  }
  return artifacts;
}

export async function executeDurableStage({
  getBearerToken,
  stage,
  productId,
  productContext,
  prerequisiteArtifacts = [],
  manualInputs = {},
  ...request
}) {
  const token = await getBearerToken();
  const response = await fetch('/api/forge/stage', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': `${stage}-${productId}-${Date.now()}`,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      ...request,
      stage,
      productId,
      productContext,
      prerequisiteArtifacts,
      manualInputs,
      environment: 'staging',
      productionPromotionAuthorized: false,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
  }
  return payload;
}
