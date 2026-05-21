// src/lib/remediation/verificationRegistry.js — PHASE B2 STEP 1
//
// Maps each remediation strategy → its post-fix verification method.
// Verification runs AFTER the patch is committed + deployed (i.e. once
// the preview URL is live). Phase B2 v1 records the verification METHOD
// in the governance envelope; the actual re-run is wired by the
// orchestrator's STEP 11 (post-fix scoring) which can target a specific
// evaluator.
//
// Methods:
//   dom-check        — fetch deployed HTML, assert selector/attribute present
//   axe-rerun        — re-run @axe-core/playwright; assert rule no longer fires
//   lighthouse-rerun — re-run programmatic Lighthouse; assert audit passes
//                      or numeric threshold met (e.g. contrast ≥ 4.5:1)
//   runtime-check    — replay runtime diagnostics; assert specific 4xx gone
//   manual           — human review (high-risk strategies)

'use strict';

import { STRATEGY } from './remediationRegistry.js';

export const VERIFICATION_METHOD = Object.freeze({
  DOM_CHECK:        'dom-check',
  AXE_RERUN:        'axe-rerun',
  LIGHTHOUSE_RERUN: 'lighthouse-rerun',
  RUNTIME_CHECK:    'runtime-check',
  MANUAL:           'manual',
});

export const VERIFICATION_REGISTRY = Object.freeze({
  [STRATEGY.INJECT_ALT_ATTRIBUTE]: Object.freeze({
    method: VERIFICATION_METHOD.DOM_CHECK,
    assertion: 'alt attribute present on every <img>',
    successCriterion: 'no axe:image-alt violation after re-run',
  }),
  [STRATEGY.CSS_CONTRAST_ADJUST]: Object.freeze({
    method: VERIFICATION_METHOD.LIGHTHOUSE_RERUN,
    assertion: 'contrast ratio >= 4.5:1 for normal text, >= 3:1 for large',
    successCriterion: 'lighthouse:color-contrast audit passes',
  }),
  [STRATEGY.INJECT_METADATA]: Object.freeze({
    method: VERIFICATION_METHOD.DOM_CHECK,
    assertion: '<meta name="description"> present and non-empty',
    successCriterion: 'lighthouse:meta-description audit passes',
  }),
  [STRATEGY.INJECT_HTML_LANG]: Object.freeze({
    method: VERIFICATION_METHOD.DOM_CHECK,
    assertion: '<html lang="..."> set to a valid BCP-47 tag',
    successCriterion: 'no axe:html-has-lang violation after re-run',
  }),
  [STRATEGY.DEFER_SCRIPT_LOAD]: Object.freeze({
    method: VERIFICATION_METHOD.LIGHTHOUSE_RERUN,
    assertion: 'render-blocking resources reduced',
    successCriterion: 'lighthouse:render-blocking-resources score >= 0.9',
  }),
  [STRATEGY.INJECT_ARIA_LABEL]: Object.freeze({
    method: VERIFICATION_METHOD.AXE_RERUN,
    assertion: 'aria-label / accessible-name present on flagged elements',
    successCriterion: 'no axe aria/button/link/select-name violation after re-run',
  }),
  [STRATEGY.REPAIR_ASSET_PATH]: Object.freeze({
    method: VERIFICATION_METHOD.RUNTIME_CHECK,
    assertion: 'flagged asset returns 200, not 404',
    successCriterion: 'no console.error or network:http_404 for asset after re-run',
  }),
  [STRATEGY.INJECT_VIEWPORT]: Object.freeze({
    method: VERIFICATION_METHOD.DOM_CHECK,
    assertion: '<meta name="viewport" content="width=device-width, initial-scale=1"> present',
    successCriterion: 'lighthouse:viewport audit passes',
  }),
  [STRATEGY.CSS_SIZE_ADJUSTMENT]: Object.freeze({
    method: VERIFICATION_METHOD.LIGHTHOUSE_RERUN,
    assertion: 'tap targets >= 48x48px (mobile)',
    successCriterion: 'lighthouse:tap-targets audit passes',
  }),
  [STRATEGY.REPAIR_BROKEN_LINK]: Object.freeze({
    method: VERIFICATION_METHOD.RUNTIME_CHECK,
    assertion: 'flagged link returns 2xx, not 4xx/5xx',
    successCriterion: 'no network:request_failed for link after re-run',
  }),
  [STRATEGY.FLAG_FOR_HUMAN_REVIEW]: Object.freeze({
    method: VERIFICATION_METHOD.MANUAL,
    assertion: 'human approval required',
    successCriterion: 'reviewer marks approved in PR',
  }),
});

/**
 * Lookup verification config for a strategy. Returns the FLAG_FOR_HUMAN_REVIEW
 * config when the strategy is unrecognized (defensive default — never null).
 */
export function lookupVerification(strategy) {
  return VERIFICATION_REGISTRY[strategy] ?? VERIFICATION_REGISTRY[STRATEGY.FLAG_FOR_HUMAN_REVIEW];
}
