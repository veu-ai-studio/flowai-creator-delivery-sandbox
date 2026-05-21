// src/lib/remediation/patchGenerators/inject-alt-attribute.js — PHASE B2 STEP 4
//
// Inject an `alt=""` attribute on every <img> tag that lacks one. Conservative
// in v1: ALL injected alt attributes are empty strings ("decorative image"
// per WAI). A human reviewer can then refine wording in the PR. Empty alt
// is correct for icons / decorative graphics; for content images the
// reviewer must update it before merge — this is documented in the patch
// changeDescription and surfaces as a PR comment downstream.
//
// Confidence: 0.85 when the file contains 1+ unalted <img>; 0 otherwise.
//
// Safe-by-default: NEVER touches <img alt=...> that already has the
// attribute (even if alt is empty). NEVER inserts alt on <img> inside
// quoted JSX strings (rough heuristic).

'use strict';

import { makeProvenance, noPatch, CONFIDENCE_FLOOR } from './_shared.js';

const GENERATOR = 'inject-alt-attribute';

// Match <img ...> where the attribute list does NOT contain `alt=`. Uses
// negative-lookahead and a non-greedy attr scan. Stops at the first `>`
// (no closing slash check — both `<img />` and `<img>` covered).
const IMG_RE = /<img\b([^>]*?)>/gi;
const HAS_ALT_RE = /\balt\s*=/i;

export function injectAltAttribute({ finding, fileContent, filePath }) {
  if (typeof fileContent !== 'string' || fileContent.length === 0) {
    return noPatch({ generator: GENERATOR, reason: 'empty_file_content' });
  }
  let count = 0;
  const patched = fileContent.replace(IMG_RE, (match, attrs) => {
    if (HAS_ALT_RE.test(attrs)) return match;
    count += 1;
    // Preserve the trailing `/` for JSX self-closing if present.
    const trailingSlash = /\/$/.test(attrs.trimEnd()) ? ' /' : '';
    const cleaned = attrs.replace(/\/$/, '').trimEnd();
    return `<img${cleaned ? ' ' + cleaned.trimStart() : ''} alt=""${trailingSlash}>`;
  });
  if (count === 0) {
    return noPatch({ generator: GENERATOR, reason: 'no_unalted_img_tags' });
  }
  const confidence = 0.85;
  if (confidence < CONFIDENCE_FLOOR) {
    return noPatch({ generator: GENERATOR, reason: 'confidence_below_floor' });
  }
  return Object.freeze({
    patched: true,
    patchedContent: patched,
    changeDescription:
      `Injected alt="" on ${count} <img> element${count === 1 ? '' : 's'} in ${filePath}. ` +
      'EMPTY alt = decorative per WAI; content-image alts must be refined by reviewer before merge.',
    confidence,
    provenance: makeProvenance({
      generator: GENERATOR,
      beforeContent: fileContent,
      afterContent: patched,
    }),
    findingId: finding?.id ?? null,
    strategy: GENERATOR,
    filePath,
  });
}

export default injectAltAttribute;
