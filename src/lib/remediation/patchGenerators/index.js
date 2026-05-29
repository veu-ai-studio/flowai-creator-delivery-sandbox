// src/lib/remediation/patchGenerators/index.js — PHASE B2 STEP 4
//
// Generator registry: maps a strategy id → generator function. Adding a
// new low-risk generator means writing the module file + adding a line
// here. The classifier vocabulary (remediationRegistry.STRATEGY) is the
// single source of truth for strategy ids.

'use strict';

import { injectAltAttribute } from './inject-alt-attribute.js';
import { cssContrastAdjust } from './css-contrast-adjust.js';
import { injectMetadata } from './inject-metadata.js';
import { injectAriaLabel } from './inject-aria-label.js';
import { repairAssetPath } from './repair-asset-path.js';
import { STRATEGY } from '../remediationRegistry.js';

export const GENERATORS = Object.freeze({
  [STRATEGY.INJECT_ALT_ATTRIBUTE]: injectAltAttribute,
  [STRATEGY.CSS_CONTRAST_ADJUST]:  cssContrastAdjust,
  [STRATEGY.INJECT_METADATA]:      injectMetadata,
  [STRATEGY.INJECT_VIEWPORT]:      injectMetadata,   // shares generator (head-meta injector)
  [STRATEGY.INJECT_ARIA_LABEL]:    injectAriaLabel,
  [STRATEGY.REPAIR_ASSET_PATH]:    repairAssetPath,
  [STRATEGY.REPAIR_BROKEN_LINK]:   repairAssetPath,  // same transform family
});

/** Returns the generator function for a strategy, or null if unsupported in v1. */
export function getGenerator(strategy) {
  return GENERATORS[strategy] ?? null;
}

export {
  injectAltAttribute, cssContrastAdjust, injectMetadata,
  injectAriaLabel, repairAssetPath,
};
