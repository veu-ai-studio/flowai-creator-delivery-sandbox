export const FLOW_HUB_AXIS_STORAGE_KEY = 'flowai.flowHubAxes.v1';

export const STRUCTURAL_LAYER_OPTIONS = Object.freeze([
  Object.freeze({
    value: 'autonomous',
    label: 'Autonomous',
    shortLabel: 'Autonomous',
    description: 'Runs without an added checkpoint ceiling.',
  }),
  Object.freeze({
    value: 'supervised',
    label: 'Supervised',
    shortLabel: 'Supervised',
    description: 'Keeps guided checkpoints active even when Auto is selected.',
  }),
  Object.freeze({
    value: 'controlled',
    label: 'Controlled',
    shortLabel: 'Controlled',
    description: 'Uses manual checkpoints before execution continues.',
  }),
]);

export const OPERATIONAL_MODE_OPTIONS = Object.freeze([
  Object.freeze({
    value: 'auto',
    label: 'Auto',
    description: 'Launch the forge with automatic step progression.',
  }),
  Object.freeze({
    value: 'guided',
    label: 'Guided',
    description: 'Require approval checkpoints during the run.',
  }),
  Object.freeze({
    value: 'manual',
    label: 'Manual',
    description: 'Hold the run for operator-directed execution.',
  }),
]);

export const ANALYSIS_DEPTH_OPTIONS = Object.freeze([
  Object.freeze({
    value: 'quick',
    label: 'Quick',
    description: 'Lower crawl/page budget for a fast signal.',
  }),
  Object.freeze({
    value: 'standard',
    label: 'Standard',
    description: 'Default crawl and scoring depth.',
  }),
  Object.freeze({
    value: 'deep',
    label: 'Deep',
    description: 'Higher crawl/page budget for broader evidence.',
  }),
]);

export const FLOW_HUB_PATH_OPTIONS = Object.freeze([
  Object.freeze({
    value: 'production',
    label: 'Production',
    path: '/flow-hub/production',
    description: 'Upgrade an existing product URL in its owned delivery path.',
  }),
  Object.freeze({
    value: 'migration',
    label: 'Migration',
    path: '/flow-hub/migration',
    description: 'Move a platform-bound product into a standalone v2 codebase.',
  }),
  Object.freeze({
    value: 'fresh_build',
    label: 'Fresh Build',
    path: '/flow-hub/fresh-build',
    description: 'Generate a new platform-free codebase from product description.',
  }),
]);

const DEFAULT_AXES = Object.freeze({
  structuralLayer: 'autonomous',
  operationalMode: 'auto',
  analysisDepth: 'standard',
  flowHubPath: 'production',
});

function optionValue(value, options, fallback) {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/-/g, '_');
  return options.some((option) => option.value === normalized) ? normalized : fallback;
}

export function analysisDepthValue(value) {
  return optionValue(value, ANALYSIS_DEPTH_OPTIONS, DEFAULT_AXES.analysisDepth);
}

export function analysisDepthLabel(value) {
  const normalized = analysisDepthValue(value);
  return ANALYSIS_DEPTH_OPTIONS.find((option) => option.value === normalized)?.label ?? 'Standard';
}

export function flowHubPathFromPathname(pathname = '') {
  const path = String(pathname || '').toLowerCase();
  if (path === '/flow-hub/migration' || path.startsWith('/flow-hub/migration/')) return 'migration';
  if (path === '/flow-hub/fresh-build' || path.startsWith('/flow-hub/fresh-build/')) return 'fresh_build';
  return 'production';
}

export function flowHubPathOption(value) {
  const normalized = optionValue(value, FLOW_HUB_PATH_OPTIONS, DEFAULT_AXES.flowHubPath);
  return FLOW_HUB_PATH_OPTIONS.find((option) => option.value === normalized) ?? FLOW_HUB_PATH_OPTIONS[0];
}

export function normalizeFlowHubAxes(input = {}) {
  const rawMode = String(input.mode ?? '').trim().toLowerCase();
  const flowHubPath = optionValue(
    input.flowHubPath ?? (rawMode === 'migration' || rawMode === 'fresh_build' ? rawMode : undefined),
    FLOW_HUB_PATH_OPTIONS,
    DEFAULT_AXES.flowHubPath,
  );
  const operationalMode = optionValue(
    input.operationalMode ?? (['auto', 'guided', 'manual'].includes(rawMode) ? rawMode : undefined),
    OPERATIONAL_MODE_OPTIONS,
    DEFAULT_AXES.operationalMode,
  );
  return Object.freeze({
    structuralLayer: optionValue(input.structuralLayer ?? input.systemOperationLevel, STRUCTURAL_LAYER_OPTIONS, DEFAULT_AXES.structuralLayer),
    operationalMode,
    analysisDepth: analysisDepthValue(input.analysisDepth ?? input.depth),
    flowHubPath,
  });
}

export function axesFromSearchParams(searchParams, pathname = '') {
  const params = searchParams instanceof URLSearchParams
    ? searchParams
    : new URLSearchParams(searchParams || '');
  return normalizeFlowHubAxes({
    structuralLayer: params.get('structuralLayer'),
    operationalMode: params.get('operationalMode') ?? params.get('mode'),
    analysisDepth: params.get('analysisDepth') ?? params.get('depth'),
    flowHubPath: params.get('flowHubPath') ?? params.get('path') ?? params.get('mode') ?? flowHubPathFromPathname(pathname),
  });
}

export function readStoredFlowHubAxes() {
  if (typeof window === 'undefined' || !window.localStorage) return normalizeFlowHubAxes(DEFAULT_AXES);
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FLOW_HUB_AXIS_STORAGE_KEY) || '{}');
    return normalizeFlowHubAxes(parsed);
  } catch {
    return normalizeFlowHubAxes(DEFAULT_AXES);
  }
}

export function writeStoredFlowHubAxes(axes) {
  const normalized = normalizeFlowHubAxes(axes);
  if (typeof window !== 'undefined') {
    if (window.localStorage) {
      try { window.localStorage.setItem(FLOW_HUB_AXIS_STORAGE_KEY, JSON.stringify(normalized)); } catch { /* best effort */ }
    }
    try {
      window.dispatchEvent(new CustomEvent('flowai:flow-hub-axes-change', { detail: normalized }));
    } catch { /* best effort */ }
  }
  return normalized;
}

export function axesToSearchParams(axes, existingSearch = '') {
  const normalized = normalizeFlowHubAxes(axes);
  const params = existingSearch instanceof URLSearchParams
    ? new URLSearchParams(existingSearch)
    : new URLSearchParams(String(existingSearch || '').replace(/^\?/, ''));
  params.set('structuralLayer', normalized.structuralLayer);
  params.set('operationalMode', normalized.operationalMode);
  params.set('analysisDepth', normalized.analysisDepth);
  params.set('flowHubPath', normalized.flowHubPath);
  params.delete('mode');
  params.delete('depth');
  params.delete('path');
  return params;
}

export function runConstructionModeForAxes({ structuralLayer, operationalMode, flowHubPath, inngestReady = false } = {}) {
  const axes = normalizeFlowHubAxes({ structuralLayer, operationalMode, flowHubPath });
  if (axes.flowHubPath === 'migration') return 'MIGRATION';
  if (axes.flowHubPath === 'fresh_build') return 'FRESH_BUILD';
  if (axes.structuralLayer === 'controlled' || axes.operationalMode === 'manual') return 'MANUAL';
  if (axes.structuralLayer === 'supervised' || axes.operationalMode === 'guided') return 'GUIDED';
  if (axes.operationalMode === 'auto' && inngestReady === true) return 'BACKGROUND';
  return 'FOREGROUND';
}

export function orchestratorModeForAxes({ transportMode, structuralLayer, operationalMode, flowHubPath } = {}) {
  const axes = normalizeFlowHubAxes({ structuralLayer, operationalMode, flowHubPath, mode: transportMode });
  const mode = String(transportMode ?? '').toUpperCase();
  if (mode === 'MIGRATION' || axes.flowHubPath === 'migration') return 'migration';
  if (mode === 'MANUAL' || axes.structuralLayer === 'controlled' || axes.operationalMode === 'manual') return 'manual';
  if (mode === 'GUIDED' || axes.structuralLayer === 'supervised' || axes.operationalMode === 'guided') return 'guided';
  return 'auto';
}

export function effortOverridesForAnalysisDepth(value) {
  const depth = analysisDepthValue(value);
  if (depth === 'quick') {
    return Object.freeze({
      crawlMaxPages: 10,
      crawlMaxDepth: 2,
      structuredCrawlMaxPages: 10,
      structuredCrawlDepth: 2,
      phaseBMaxPages: 5,
      phaseBMaxInteractives: 5,
      postFixReprobe: false,
    });
  }
  if (depth === 'deep') {
    return Object.freeze({
      crawlMaxPages: 80,
      crawlMaxDepth: 6,
      structuredCrawlMaxPages: 80,
      structuredCrawlDepth: 6,
      phaseBMaxPages: 40,
      phaseBMaxInteractives: 30,
      postFixReprobe: true,
    });
  }
  return Object.freeze({});
}
