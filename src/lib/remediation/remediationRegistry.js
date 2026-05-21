// src/lib/remediation/remediationRegistry.js — PHASE B2 STEP 1
//
// Maps a NORMALIZED strategy key to its remediation profile. The
// classifier translates raw evaluator categories (e.g. `axe:image-alt`,
// `lighthouse:meta-description`, `network:request_failed`) into one of
// these strategy keys before lookup, so the registry stays evaluator-
// agnostic.
//
// Risk + complexity gating (PHASE B2 v1):
//   - autoRemediable === true  AND  risk === 'low'   → ELIGIBLE
//   - risk === 'medium'                              → ELIGIBLE within budget
//   - risk === 'high'                                → ESCALATE
//   - strategy === 'flag-for-human-review'           → ESCALATE
//   - no matching strategy                           → INELIGIBLE (KNOWN_GAP)

'use strict';

export const STRATEGY = Object.freeze({
  INJECT_ALT_ATTRIBUTE:   'inject-alt-attribute',
  CSS_CONTRAST_ADJUST:    'css-contrast-adjust',
  INJECT_METADATA:        'inject-metadata',
  INJECT_HTML_LANG:       'inject-html-lang',
  DEFER_SCRIPT_LOAD:      'defer-script-load',
  INJECT_ARIA_LABEL:      'inject-aria-label',
  REPAIR_ASSET_PATH:      'repair-asset-path',
  INJECT_VIEWPORT:        'inject-viewport',
  CSS_SIZE_ADJUSTMENT:    'css-size-adjustment',
  REPAIR_BROKEN_LINK:     'repair-broken-link',
  FLAG_FOR_HUMAN_REVIEW:  'flag-for-human-review',
});

/** Strategy profiles. Keyed by strategy id. */
export const REMEDIATION_REGISTRY = Object.freeze({
  [STRATEGY.INJECT_ALT_ATTRIBUTE]: Object.freeze({
    strategy: STRATEGY.INJECT_ALT_ATTRIBUTE,
    category: 'image-missing-alt',
    complexity: 'low',
    risk: 'low',
    autoRemediable: true,
    dimension: 'accessibility',
  }),
  [STRATEGY.CSS_CONTRAST_ADJUST]: Object.freeze({
    strategy: STRATEGY.CSS_CONTRAST_ADJUST,
    category: 'color-contrast-violation',
    complexity: 'low',
    risk: 'low',
    autoRemediable: true,
    dimension: 'accessibility',
  }),
  [STRATEGY.INJECT_METADATA]: Object.freeze({
    strategy: STRATEGY.INJECT_METADATA,
    category: 'missing-meta-description',
    complexity: 'low',
    risk: 'low',
    autoRemediable: true,
    dimension: 'ui_ux',
  }),
  [STRATEGY.INJECT_HTML_LANG]: Object.freeze({
    strategy: STRATEGY.INJECT_HTML_LANG,
    category: 'missing-lang-attribute',
    complexity: 'low',
    risk: 'low',
    autoRemediable: true,
    dimension: 'accessibility',
  }),
  [STRATEGY.DEFER_SCRIPT_LOAD]: Object.freeze({
    strategy: STRATEGY.DEFER_SCRIPT_LOAD,
    category: 'render-blocking-resource',
    complexity: 'medium',
    risk: 'medium',
    autoRemediable: true,
    dimension: 'performance',
  }),
  [STRATEGY.INJECT_ARIA_LABEL]: Object.freeze({
    strategy: STRATEGY.INJECT_ARIA_LABEL,
    category: 'missing-aria-label',
    complexity: 'low',
    risk: 'low',
    autoRemediable: true,
    dimension: 'accessibility',
  }),
  [STRATEGY.REPAIR_ASSET_PATH]: Object.freeze({
    strategy: STRATEGY.REPAIR_ASSET_PATH,
    category: 'console-error-404',
    complexity: 'medium',
    risk: 'medium',
    autoRemediable: true,
    dimension: 'bugs_errors_detector',
  }),
  [STRATEGY.INJECT_VIEWPORT]: Object.freeze({
    strategy: STRATEGY.INJECT_VIEWPORT,
    category: 'missing-viewport-meta',
    complexity: 'low',
    risk: 'low',
    autoRemediable: true,
    dimension: 'ui_ux',
  }),
  [STRATEGY.CSS_SIZE_ADJUSTMENT]: Object.freeze({
    strategy: STRATEGY.CSS_SIZE_ADJUSTMENT,
    category: 'tap-target-too-small',
    complexity: 'low',
    risk: 'low',
    autoRemediable: true,
    dimension: 'accessibility',
  }),
  [STRATEGY.REPAIR_BROKEN_LINK]: Object.freeze({
    strategy: STRATEGY.REPAIR_BROKEN_LINK,
    category: 'network-failure',
    complexity: 'medium',
    risk: 'medium',
    autoRemediable: true,
    dimension: 'functional_completeness',
  }),
  // High-risk: never auto-fixed; classifier forces ESCALATE.
  ['unused-javascript']: Object.freeze({
    strategy: STRATEGY.FLAG_FOR_HUMAN_REVIEW,
    category: 'unused-javascript',
    complexity: 'high',
    risk: 'high',
    autoRemediable: false,
    dimension: 'performance',
  }),
  ['hydration-error']: Object.freeze({
    strategy: STRATEGY.FLAG_FOR_HUMAN_REVIEW,
    category: 'hydration-error',
    complexity: 'high',
    risk: 'high',
    autoRemediable: false,
    dimension: 'bugs_errors_detector',
  }),
});

/**
 * Translate a raw evaluator category string into a registry strategy key.
 * Returns null when no mapping exists — the classifier marks those
 * findings INELIGIBLE.
 *
 * Mapping table is intentionally conservative; new categories must be
 * ADDED explicitly rather than coerced via fuzzy matching.
 */
export function categoryToStrategy(rawCategory) {
  if (typeof rawCategory !== 'string' || rawCategory.length === 0) return null;
  const c = rawCategory.toLowerCase();

  // axe-core rules
  if (c === 'axe:image-alt' || c === 'axe:input-image-alt' || c === 'axe:area-alt' || c === 'axe:object-alt') {
    return STRATEGY.INJECT_ALT_ATTRIBUTE;
  }
  if (c === 'axe:color-contrast' || c === 'axe:color-contrast-enhanced') {
    return STRATEGY.CSS_CONTRAST_ADJUST;
  }
  if (c === 'axe:html-has-lang' || c === 'axe:html-lang-valid' || c === 'axe:valid-lang') {
    return STRATEGY.INJECT_HTML_LANG;
  }
  if (c.startsWith('axe:aria-') || c === 'axe:button-name' || c === 'axe:link-name'
      || c === 'axe:input-button-name' || c === 'axe:label' || c === 'axe:select-name') {
    return STRATEGY.INJECT_ARIA_LABEL;
  }
  if (c === 'axe:meta-viewport') {
    return STRATEGY.INJECT_VIEWPORT;
  }
  if (c === 'axe:target-size') {
    return STRATEGY.CSS_SIZE_ADJUSTMENT;
  }

  // Lighthouse audits (id-based)
  if (c === 'lighthouse:image-alt' || c === 'lighthouse:input-image-alt') {
    return STRATEGY.INJECT_ALT_ATTRIBUTE;
  }
  if (c === 'lighthouse:color-contrast') {
    return STRATEGY.CSS_CONTRAST_ADJUST;
  }
  if (c === 'lighthouse:meta-description' || c === 'lighthouse:document-title' || c === 'lighthouse:hreflang' || c === 'lighthouse:canonical') {
    return STRATEGY.INJECT_METADATA;
  }
  if (c === 'lighthouse:html-has-lang' || c === 'lighthouse:html-lang-valid') {
    return STRATEGY.INJECT_HTML_LANG;
  }
  if (c === 'lighthouse:render-blocking-resources' || c === 'lighthouse:render-blocking-insight') {
    return STRATEGY.DEFER_SCRIPT_LOAD;
  }
  if (c === 'lighthouse:button-name' || c === 'lighthouse:link-name' || c === 'lighthouse:aria-allowed-attr' || c === 'lighthouse:aria-required-attr') {
    return STRATEGY.INJECT_ARIA_LABEL;
  }
  if (c === 'lighthouse:viewport') {
    return STRATEGY.INJECT_VIEWPORT;
  }
  if (c === 'lighthouse:tap-targets') {
    return STRATEGY.CSS_SIZE_ADJUSTMENT;
  }
  if (c === 'lighthouse:unused-javascript' || c === 'lighthouse:unused-css-rules') {
    return 'unused-javascript';  // routes to flag-for-human-review
  }
  if (c === 'lighthouse:errors-in-console' || c === 'lighthouse:no-document-write') {
    return STRATEGY.REPAIR_ASSET_PATH;
  }
  if (c === 'lighthouse:is-on-https' || c === 'lighthouse:redirects-http') {
    // Security-flavored — escalate, never auto-fix.
    return 'hydration-error';  // routes to flag-for-human-review (high risk)
  }

  // Runtime diagnostics
  if (c === 'console:error' || c === 'pageerror:uncaught_exception') {
    return STRATEGY.REPAIR_ASSET_PATH;
  }
  if (c.startsWith('network:http_4') || c === 'network:http_404') {
    return STRATEGY.REPAIR_ASSET_PATH;
  }
  if (c === 'network:request_failed' || c.startsWith('network:http_5')) {
    return STRATEGY.REPAIR_BROKEN_LINK;
  }

  return null;
}

export const __internals = Object.freeze({ STRATEGY });
