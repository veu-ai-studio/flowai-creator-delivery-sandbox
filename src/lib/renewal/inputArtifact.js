// src/lib/renewal/inputArtifact.js
//
// Unified InputArtifact contract for the FlowAI renewal pipeline.
// All three input adapters (URL / Description / Content-or-Upload)
// produce one of these.  The downstream issue detector, renewal engine,
// and before/after report consume this shape exclusively.
//
// ─── SHAPE ────────────────────────────────────────────────────────────
//
// {
//   id:           <string>  RFC-4122 UUID (v4)
//   inputType:    'url' | 'description' | 'content' | 'multi-url-synthesis'
//   submittedAt:  <string>  ISO-8601 timestamp
//
//   raw: {                            // verbatim what the user supplied
//     url?: <string>,
//     description?: {
//       productName?:    <string>,
//       whatItDoes?:     <string>,
//       targetAudience?: <string>,
//       keyFeatures?:    <string>,
//       currentIssues?:  <string>,
//       liveUrl?:        <string>,
//       loginEmail?:     <string>,   // session-only; never persisted
//       loginPassword?:  <string>,   // session-only; never persisted
//       voiceNote?:      <string>,   // transcript only; audio not stored
//     },
//     content?: {
//       text?: <string>,
//       attachments?: [{
//         filename:     <string>,
//         mimeType:     <string>,    // image/png | image/jpeg | application/pdf
//         size:         <number>,
//         storedPath?:  <string>,    // ephemeral; deleted after processing
//         extractedText?:           <string>,
//         extractedVisionAnalysis?: <string>,
//       }]
//     }
//   },
//
//   normalized: {                    // derived; consumed by issue detector
//     productConcept:   <string>,    // 1-2 sentence statement of what it is
//     targetUsers:      <string>,    // who it's for
//     coreClaims:       [<string>],  // bullet list of value claims
//     observedSurfaces: 'crawl' | 'ocr' | 'vision' | 'description-only' | null,
//     detectedFeatures: [<string>],
//   }
// }
//
// ─── CONSTRAINTS ─────────────────────────────────────────────────────
//   - ESM only.  Browser-safe (no node:* imports).
//   - Pure module: no I/O, no logging.
//   - Credentials carried in raw.description.loginEmail/loginPassword are
//     session-only.  This module does NOT persist anywhere; the renewal
//     orchestrator (api/renew.js) MUST scrub them before any persist /
//     log / external send.  See scrubCredentials() helper.
//   - Voice audio files are NOT stored.  Only the transcript ends up on
//     raw.description.voiceNote.

/**
 * @typedef {'url'|'description'|'content'|'multi-url-synthesis'} InputType
 */

/**
 * @typedef {Object} InputArtifact
 * @property {string} id
 * @property {InputType} inputType
 * @property {string} submittedAt
 * @property {{ url?: string, description?: object, content?: object }} raw
 * @property {{
 *   productConcept: string,
 *   targetUsers: string,
 *   coreClaims: string[],
 *   observedSurfaces: 'crawl'|'ocr'|'vision'|'description-only'|null,
 *   detectedFeatures: string[]
 * }} normalized
 */

const VALID_INPUT_TYPES = new Set(['url', 'description', 'content', 'multi-url-synthesis']);
const VALID_SURFACES = new Set(['crawl', 'ocr', 'vision', 'description-only', null]);

/**
 * Generate an RFC-4122 v4 UUID using crypto.randomUUID when available,
 * with a fallback for older runtimes / SSR where crypto is unavailable.
 * @returns {string}
 */
export function newArtifactId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // RFC 4122 v4 fallback — sufficient for IDs that don't need cryptographic strength.
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) { out += '-'; continue; }
    if (i === 14) { out += '4'; continue; }
    if (i === 19) { out += hex[(Math.random() * 4) | 0 | 8]; continue; }
    out += hex[(Math.random() * 16) | 0];
  }
  return out;
}

/**
 * Build a fresh InputArtifact.  Caller supplies the raw payload + the
 * normalized fields produced by the input adapter.  Throws on missing
 * or invalid fields — fail loudly at the boundary.
 *
 * @param {{ inputType: InputType, raw: object, normalized: object, id?: string, submittedAt?: string }} args
 * @returns {InputArtifact}
 */
export function buildInputArtifact({ inputType, raw, normalized, id, submittedAt }) {
  if (!VALID_INPUT_TYPES.has(inputType)) {
    throw new TypeError(`buildInputArtifact: inputType must be one of ${[...VALID_INPUT_TYPES].join(', ')} — got "${inputType}"`);
  }
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('buildInputArtifact: raw must be an object');
  }
  if (!normalized || typeof normalized !== 'object') {
    throw new TypeError('buildInputArtifact: normalized must be an object');
  }
  const norm = {
    productConcept: typeof normalized.productConcept === 'string' ? normalized.productConcept : '',
    targetUsers: typeof normalized.targetUsers === 'string' ? normalized.targetUsers : '',
    coreClaims: Array.isArray(normalized.coreClaims) ? normalized.coreClaims.filter(c => typeof c === 'string') : [],
    observedSurfaces: VALID_SURFACES.has(normalized.observedSurfaces) ? normalized.observedSurfaces : null,
    detectedFeatures: Array.isArray(normalized.detectedFeatures) ? normalized.detectedFeatures.filter(f => typeof f === 'string') : [],
  };
  return {
    id: id || newArtifactId(),
    inputType,
    submittedAt: submittedAt || new Date().toISOString(),
    raw,
    normalized: norm,
  };
}

/**
 * Strip session-only credentials before persisting / logging.  Returns a
 * deep-cloned copy of the artifact with loginEmail/loginPassword and any
 * attachment.storedPath redacted.  The redacted strings are replaced
 * with the literal '[REDACTED]' marker.
 *
 * @param {InputArtifact} artifact
 * @returns {InputArtifact}
 */
export function scrubCredentials(artifact) {
  // Shallow clone is fine — we only mutate the credential-bearing paths.
  const clone = { ...artifact, raw: { ...artifact.raw } };
  if (clone.raw.description) {
    const d = { ...clone.raw.description };
    if (d.loginEmail) d.loginEmail = '[REDACTED]';
    if (d.loginPassword) d.loginPassword = '[REDACTED]';
    clone.raw.description = d;
  }
  if (clone.raw.content && Array.isArray(clone.raw.content.attachments)) {
    clone.raw.content = {
      ...clone.raw.content,
      attachments: clone.raw.content.attachments.map((a) => {
        const copy = { ...a };
        if (copy.storedPath) copy.storedPath = '[EPHEMERAL — deleted after processing]';
        return copy;
      }),
    };
  }
  return clone;
}

/**
 * Best-effort validator.  Returns { ok: boolean, reasons: string[] }.
 * Useful in test assertions and at API boundaries.
 *
 * @param {unknown} a
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function validateInputArtifact(a) {
  const reasons = [];
  if (!a || typeof a !== 'object') return { ok: false, reasons: ['artifact is not an object'] };
  if (typeof a.id !== 'string' || !a.id) reasons.push('id missing');
  if (!VALID_INPUT_TYPES.has(a.inputType)) reasons.push(`inputType invalid: ${a.inputType}`);
  if (typeof a.submittedAt !== 'string') reasons.push('submittedAt missing');
  if (!a.raw || typeof a.raw !== 'object') reasons.push('raw missing');
  if (!a.normalized || typeof a.normalized !== 'object') reasons.push('normalized missing');
  if (a.normalized) {
    if (typeof a.normalized.productConcept !== 'string') reasons.push('normalized.productConcept must be string');
    if (typeof a.normalized.targetUsers !== 'string') reasons.push('normalized.targetUsers must be string');
    if (!Array.isArray(a.normalized.coreClaims)) reasons.push('normalized.coreClaims must be array');
    if (!Array.isArray(a.normalized.detectedFeatures)) reasons.push('normalized.detectedFeatures must be array');
    if (!VALID_SURFACES.has(a.normalized.observedSurfaces)) reasons.push(`normalized.observedSurfaces invalid: ${a.normalized.observedSurfaces}`);
  }
  return { ok: reasons.length === 0, reasons };
}

export const __internals = Object.freeze({
  VALID_INPUT_TYPES,
  VALID_SURFACES,
});
