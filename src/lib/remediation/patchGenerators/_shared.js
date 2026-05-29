// src/lib/remediation/patchGenerators/_shared.js — PHASE B2 STEP 4
//
// Shared utilities for patch generators. All generators emit the same
// provenance shape so the orchestrator + governance write can treat
// them uniformly.

'use strict';

import { createHash, randomUUID } from 'node:crypto';

export const CONFIDENCE_FLOOR = 0.7;

export function sha256(input) {
  return createHash('sha256').update(typeof input === 'string' ? input : String(input)).digest('hex');
}

/**
 * Build the standardized provenance envelope for a patch.
 *
 * @param {object} args
 * @param {string} args.generator     — generator id (file basename)
 * @param {string} args.strategyVersion
 * @param {string} args.beforeContent — original file content (for hash)
 * @param {string} args.afterContent  — patched content (for hash)
 * @returns {object} provenance object
 */
export function makeProvenance({ generator, strategyVersion = '1.0', beforeContent, afterContent }) {
  return Object.freeze({
    strategyVersion,
    generator,
    generatedBy: 'flowai-remediation-engine',
    rollbackId: randomUUID(),
    patchHash: sha256(`${beforeContent ?? ''}::${afterContent ?? ''}`),
    beforeHash: sha256(beforeContent ?? ''),
    afterHash: sha256(afterContent ?? ''),
    capturedAt: new Date().toISOString(),
  });
}

/** A "no-op" patch result — generator decided not to modify the file. */
export function noPatch({ generator, reason }) {
  return Object.freeze({
    patched: false,
    patchedContent: null,
    changeDescription: null,
    confidence: 0,
    provenance: Object.freeze({
      strategyVersion: '1.0',
      generator,
      generatedBy: 'flowai-remediation-engine',
      rollbackId: null,
      patchHash: null,
      reason: reason ?? 'no_match',
    }),
  });
}
