export const PLATFORM_CATEGORIES = Object.freeze({
  MODEL_PROVIDER: 'model-provider',
  BUILDER_RUNTIME: 'builder-runtime',
  INFRASTRUCTURE: 'infrastructure',
  BACKEND: 'backend',
});

export const STATUS_LADDER = Object.freeze({
  ENVISIONED: 'ENVISIONED',
  BUILT: 'BUILT',
  TESTED: 'TESTED',
  VERIFIED: 'VERIFIED',
});

export const ACCESS_MODES = Object.freeze({
  API: 'api',
  GITHUB: 'github',
  BROWSER: 'browser',
  HUMAN_RELAYED: 'human-relayed',
});

export const FLOWAI_STEPS = Object.freeze([
  'Research',
  'Design',
  'Build',
  'QualityAudit',
  'Deploy',
  'SelfRenewal',
  'GoToMarket',
  'Monitor',
]);

export const PLATFORM_REGISTRY = Object.freeze([
  {
    id: 'claude-anthropic',
    label: 'Claude / Anthropic',
    category: PLATFORM_CATEGORIES.MODEL_PROVIDER,
    accessMode: ACCESS_MODES.API,
    status: STATUS_LADDER.BUILT,
    capabilities: Object.freeze(['research', 'reasoning', 'product-review', 'strategic-audit']),
    stepsServed: Object.freeze(['Research', 'Design', 'QualityAudit', 'SelfRenewal', 'GoToMarket', 'Monitor']),
    costRank: Object.freeze({ value: 3, certainty: 'known' }),
    performanceRank: Object.freeze({ value: 1, certainty: 'known' }),
    liveEnabled: false,
    credentialRef: 'ANTHROPIC_API_KEY',
    evidence: Object.freeze(['Registry selection skeleton built; live API integration remains disabled.']),
  },
  {
    id: 'openai-codex',
    label: 'OpenAI / Codex',
    category: PLATFORM_CATEGORIES.MODEL_PROVIDER,
    accessMode: ACCESS_MODES.GITHUB,
    status: STATUS_LADDER.BUILT,
    capabilities: Object.freeze(['code-generation', 'repo-inspection', 'tests', 'implementation']),
    stepsServed: Object.freeze(['Research', 'Design', 'Build', 'QualityAudit', 'SelfRenewal', 'Monitor']),
    costRank: Object.freeze({ value: 2, certainty: 'known' }),
    performanceRank: Object.freeze({ value: 1, certainty: 'known' }),
    liveEnabled: false,
    credentialRef: 'OPENAI_API_KEY',
    evidence: Object.freeze(['Codex is represented in routing; live API calls are stubbed.']),
  },
  {
    id: 'google-gemini',
    label: 'Google Gemini',
    category: PLATFORM_CATEGORIES.MODEL_PROVIDER,
    accessMode: ACCESS_MODES.API,
    status: STATUS_LADDER.BUILT,
    capabilities: Object.freeze(['research', 'large-context-review', 'multimodal-analysis']),
    stepsServed: Object.freeze(['Research', 'Design', 'QualityAudit', 'GoToMarket', 'Monitor']),
    costRank: Object.freeze({ value: 1, certainty: 'known' }),
    performanceRank: Object.freeze({ value: 3, certainty: 'known' }),
    liveEnabled: false,
    credentialRef: 'GEMINI_API_KEY',
    evidence: Object.freeze(['Registry selection skeleton built; live API integration remains disabled.']),
  },
  {
    id: 'base44',
    label: 'Base44',
    category: PLATFORM_CATEGORIES.BUILDER_RUNTIME,
    accessMode: ACCESS_MODES.HUMAN_RELAYED,
    status: STATUS_LADDER.ENVISIONED,
    capabilities: Object.freeze(['native-app-builder', 'entities', 'auth-runtime', 'functions', 'automations']),
    stepsServed: Object.freeze(['Design', 'Build', 'QualityAudit', 'SelfRenewal', 'GoToMarket', 'Monitor']),
    costRank: Object.freeze({ value: 2, certainty: 'known' }),
    performanceRank: Object.freeze({ value: 1, certainty: 'known' }),
    liveEnabled: false,
    credentialRef: 'BASE44_OPERATOR_TOKEN',
    evidence: Object.freeze([
      'Base44 is included as a native builder-runtime.',
      'Auto selection for Base44 remains ENVISIONED because current operation is human-relayed.',
    ]),
  },
  {
    id: 'replit',
    label: 'Replit',
    category: PLATFORM_CATEGORIES.BUILDER_RUNTIME,
    accessMode: ACCESS_MODES.API,
    status: STATUS_LADDER.BUILT,
    capabilities: Object.freeze(['sandbox-build', 'runtime-preview', 'code-execution']),
    stepsServed: Object.freeze(['Build', 'QualityAudit', 'Monitor']),
    costRank: Object.freeze({ value: 2, certainty: 'known' }),
    performanceRank: Object.freeze({ value: 3, certainty: 'known' }),
    liveEnabled: false,
    credentialRef: 'REPLIT_API_TOKEN',
    evidence: Object.freeze(['Registry selection skeleton built; live API integration remains disabled.']),
  },
  {
    id: 'vercel',
    label: 'Vercel',
    category: PLATFORM_CATEGORIES.INFRASTRUCTURE,
    accessMode: ACCESS_MODES.API,
    status: STATUS_LADDER.BUILT,
    capabilities: Object.freeze(['preview-deploy', 'production-deploy', 'edge-runtime', 'monitoring']),
    stepsServed: Object.freeze(['Deploy', 'GoToMarket', 'Monitor']),
    costRank: Object.freeze({ value: 2, certainty: 'known' }),
    performanceRank: Object.freeze({ value: 1, certainty: 'known' }),
    liveEnabled: false,
    credentialRef: 'VERCEL_TOKEN',
    evidence: Object.freeze(['Registry selection skeleton built; live API integration remains disabled.']),
  },
  {
    id: 'supabase',
    label: 'Supabase',
    category: PLATFORM_CATEGORIES.BACKEND,
    accessMode: ACCESS_MODES.API,
    status: STATUS_LADDER.BUILT,
    capabilities: Object.freeze(['database', 'auth', 'storage', 'edge-functions']),
    stepsServed: Object.freeze(['Build', 'QualityAudit', 'Deploy', 'Monitor']),
    costRank: Object.freeze({ value: 1, certainty: 'known' }),
    performanceRank: Object.freeze({ value: 2, certainty: 'known' }),
    liveEnabled: false,
    credentialRef: 'SUPABASE_SERVICE_ROLE_KEY',
    evidence: Object.freeze(['Registry selection skeleton built; live API integration remains disabled.']),
  },
]);

export function cloneRegistry(registry = PLATFORM_REGISTRY) {
  return registry.map(platform => ({
    ...platform,
    capabilities: [...platform.capabilities],
    stepsServed: [...platform.stepsServed],
    evidence: [...platform.evidence],
  }));
}

export function normalizeRank(rank) {
  if (typeof rank === 'number' && Number.isFinite(rank)) return Object.freeze({ value: rank, certainty: 'known' });
  if (rank && typeof rank === 'object') {
    const certainty = rank.certainty === 'unknown' ? 'unknown' : 'known';
    const value = typeof rank.value === 'number' && Number.isFinite(rank.value) ? rank.value : null;
    return Object.freeze({ value, certainty });
  }
  return Object.freeze({ value: null, certainty: 'unknown' });
}

export function validatePlatform(platform) {
  const errors = [];
  if (!platform || typeof platform !== 'object') errors.push('platform must be an object');
  if (!platform?.id) errors.push('id required');
  if (!Object.values(PLATFORM_CATEGORIES).includes(platform?.category)) errors.push('valid category required');
  if (!Object.values(ACCESS_MODES).includes(platform?.accessMode)) errors.push('valid accessMode required');
  if (!Object.values(STATUS_LADDER).includes(platform?.status)) errors.push('valid status required');
  if (!Array.isArray(platform?.capabilities)) errors.push('capabilities must be an array');
  if (!Array.isArray(platform?.stepsServed)) errors.push('stepsServed must be an array');
  if (!['known', 'unknown'].includes(normalizeRank(platform?.costRank).certainty)) errors.push('costRank certainty required');
  if (!['known', 'unknown'].includes(normalizeRank(platform?.performanceRank).certainty)) errors.push('performanceRank certainty required');
  if (!Array.isArray(platform?.evidence)) errors.push('evidence must be an array');
  if (typeof platform?.liveEnabled !== 'boolean') errors.push('liveEnabled must be boolean');
  if (platform?.credentialRef && typeof platform.credentialRef !== 'string') errors.push('credentialRef must be a name string');
  if (platform?.credentialRef && /sk-|secret|token-value/i.test(platform.credentialRef)) {
    errors.push('credentialRef must not contain a secret value');
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

export function applyRegistryUpdate(registry, update) {
  const next = cloneRegistry(registry);
  const updates = Array.isArray(update?.platforms) ? update.platforms : [];

  for (const platformPatch of updates) {
    const merged = {
      liveEnabled: false,
      accessMode: ACCESS_MODES.API,
      status: STATUS_LADDER.ENVISIONED,
      evidence: [],
      ...platformPatch,
      costRank: normalizeRank(platformPatch.costRank),
      performanceRank: normalizeRank(platformPatch.performanceRank),
    };
    const validation = validatePlatform(merged);
    if (!validation.ok) {
      throw new Error(`Invalid platform update "${platformPatch?.id ?? 'unknown'}": ${validation.errors.join(', ')}`);
    }
    const existingIndex = next.findIndex(platform => platform.id === merged.id);
    if (existingIndex >= 0) next[existingIndex] = { ...next[existingIndex], ...merged };
    else next.push(merged);
  }

  return Object.freeze(next.map(platform => Object.freeze({
    ...platform,
    costRank: Object.freeze(normalizeRank(platform.costRank)),
    performanceRank: Object.freeze(normalizeRank(platform.performanceRank)),
    capabilities: Object.freeze([...platform.capabilities]),
    stepsServed: Object.freeze([...platform.stepsServed]),
    evidence: Object.freeze([...platform.evidence]),
  })));
}
