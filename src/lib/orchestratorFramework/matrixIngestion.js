import { createOrchestratorLogger } from './logger.js';

const VALID_TIERS = new Set(['A', 'B', 'C']);
const VALID_LAYERS = new Set([1, 2]);

const PERSISTENCE_TERMS = /\b(entity|entities|store|stored|persist|persisted|record|records|database|db|supabase|vercel kv|kv|storage)\b/i;

function errorResult(reason) {
  return Object.freeze({ error: true, reason });
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function defaultTierForEntry(entry) {
  const text = `${entry.name ?? ''} ${entry.description ?? ''} ${entry.status ?? ''}`;
  return PERSISTENCE_TERMS.test(text) ? 'A' : 'B';
}

function normalizeEntry(entry, logger) {
  if (!isPlainObject(entry)) return null;
  const layer = Number(entry.layer);
  const surfaceId = String(entry.surfaceId ?? entry.id ?? '').trim();
  const status = String(entry.status ?? '').trim();

  if (!VALID_LAYERS.has(layer) || !surfaceId || !status) return null;

  let tier = typeof entry.tier === 'string' ? entry.tier.toUpperCase() : '';
  if (!VALID_TIERS.has(tier)) {
    tier = defaultTierForEntry(entry);
    logger.warn('matrix.default_tier_applied', {
      surfaceId,
      layer,
      tier,
      reason: 'missing_or_invalid_tier',
    });
  }

  return Object.freeze({
    layer,
    surfaceId,
    status,
    tier,
    name: entry.name ? String(entry.name) : surfaceId,
    description: entry.description ? String(entry.description) : '',
    ratificationState: entry.ratificationState || 'CANONICAL',
  });
}

function parseJsonArtifact(content) {
  if (typeof content === 'string') return JSON.parse(content);
  if (isPlainObject(content)) return content;
  throw new Error('matrix artifact content must be a JSON string or object');
}

export function parseMatrix(artifactContent, opts = {}) {
  const logger = opts.logger ?? createOrchestratorLogger('matrixIngestion');

  try {
    if (
      artifactContent === null ||
      artifactContent === undefined ||
      (typeof artifactContent === 'string' && artifactContent.trim() === '')
    ) {
      logger.error('matrix.parse_failed', { reason: 'empty_or_missing_content' });
      return errorResult('empty_or_missing_content');
    }

    const artifact = parseJsonArtifact(artifactContent);
    if (!Array.isArray(artifact.layer1) || !Array.isArray(artifact.layer2)) {
      logger.error('matrix.parse_failed', { reason: 'missing_layer_arrays' });
      return errorResult('missing_layer_arrays');
    }

    const layer1 = artifact.layer1
      .map(entry => normalizeEntry({ ...entry, layer: 1 }, logger))
      .filter(Boolean);
    const layer2 = artifact.layer2
      .map(entry => normalizeEntry({ ...entry, layer: 2 }, logger))
      .filter(Boolean);

    if (layer1.length === 0 && layer2.length === 0) {
      logger.error('matrix.parse_failed', { reason: 'no_valid_matrix_entries' });
      return errorResult('no_valid_matrix_entries');
    }

    const surfaceTierMap = {};
    for (const entry of [...layer1, ...layer2]) {
      surfaceTierMap[entry.surfaceId] = entry.tier;
    }

    return Object.freeze({
      layer1: Object.freeze(layer1),
      layer2: Object.freeze(layer2),
      surfaceTierMap: Object.freeze(surfaceTierMap),
      matrixArtifactVersion: String(artifact.version ?? 'unknown'),
    });
  } catch (error) {
    logger.error('matrix.parse_failed', { reason: error?.message ?? String(error) });
    return errorResult(`malformed_matrix_artifact:${error?.message ?? String(error)}`);
  }
}

export const __test = Object.freeze({
  defaultTierForEntry,
});
