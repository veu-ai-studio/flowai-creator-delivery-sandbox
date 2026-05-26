import { FRESH_BUILD_VERSION } from './constants.js';
import { AUTH_REQUIRED, UNKNOWN, validateFeatureInventory } from './types/featureInventory.js';

/**
 * Build a scaffold FeatureInventory for a submitted URL.
 *
 * This contract-first implementation intentionally does not crawl live URLs,
 * launch browsers, call external browser automation, or infer unavailable
 * product details. Live extraction will be wired in a later task. Until then,
 * unknown values are explicit UNKNOWN placeholders and auth-gated examples
 * are explicit AUTH_REQUIRED placeholders.
 *
 * @param {string} url - Public product URL submitted for future extraction.
 * @param {Object} [options]
 * @param {Date|string} [options.now] - Timestamp override for deterministic tests.
 * @returns {import('./types/featureInventory.js').FeatureInventory}
 */
export function extractFeatures(url, options = {}) {
  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new TypeError('extractFeatures requires a non-empty url string');
  }

  const normalizedUrl = url.trim();
  const crawlTimestamp = options.now
    ? new Date(options.now).toISOString()
    : new Date().toISOString();

  const inventory = {
    url: normalizedUrl,
    pages: [
      {
        url: normalizedUrl,
        title: UNKNOWN,
        purpose: UNKNOWN,
        primaryContent: UNKNOWN,
        navigation: [],
        hierarchy: { parent: UNKNOWN, children: [], confidence: 0 },
        access: UNKNOWN,
        confidence: 0,
      },
      {
        url: UNKNOWN,
        title: UNKNOWN,
        purpose: AUTH_REQUIRED,
        primaryContent: AUTH_REQUIRED,
        navigation: [],
        hierarchy: { parent: normalizedUrl, children: [], confidence: 0 },
        access: AUTH_REQUIRED,
        confidence: 0,
      },
    ],
    components: [],
    userFlows: [],
    content: {
      textByPage: {},
      imageReferences: [],
      ctas: [],
      toneAndStyle: { summary: UNKNOWN, confidence: 0 },
      confidence: 0,
    },
    businessRules: {
      accessControl: { summary: UNKNOWN, confidence: 0 },
      pricing: { summary: UNKNOWN, confidence: 0 },
      validationRules: [],
      apiEndpoints: [],
      dataEntities: [],
      confidence: 0,
    },
    metadata: {
      url: normalizedUrl,
      totalPagesDiscovered: 0,
      totalComponentsIdentified: 0,
      totalUserFlowsMapped: 0,
      crawlTimestamp,
      version: FRESH_BUILD_VERSION,
      confidence: 0,
    },
  };

  const validation = validateFeatureInventory(inventory);
  if (!validation.ok) {
    throw new Error(`FeatureInventory scaffold failed validation: ${validation.errors.join('; ')}`);
  }

  return inventory;
}
