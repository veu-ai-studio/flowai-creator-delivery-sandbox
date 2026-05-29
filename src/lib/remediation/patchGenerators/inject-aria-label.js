// src/lib/remediation/patchGenerators/inject-aria-label.js — PHASE B2 STEP 4
//
// Inject placeholder aria-label="" on interactive elements that lack an
// accessible name (button, [role="button"], a, select, input). v1 inserts
// an EMPTY aria-label as a marker — the reviewer must fill the value
// before merge (documented in the changeDescription, surfaces in PR).
//
// We never overwrite an existing aria-label, aria-labelledby, or `name`
// attribute. We never touch elements that already carry visible text
// (heuristic: regex sees text between open and close tags).
//
// Confidence: 0.75 (correct shape; copy needs review).

'use strict';

import { makeProvenance, noPatch, CONFIDENCE_FLOOR } from './_shared.js';

const GENERATOR = 'inject-aria-label';

// Target opening tags. Captured groups: 1=tag, 2=attrs.
const TARGET_RE = /<(button|select|a|input)\b([^>]*?)>/gi;
const HAS_ARIA_LABEL = /\baria-label\s*=/i;
const HAS_ARIA_LABELLEDBY = /\baria-labelledby\s*=/i;
const HAS_NAME = /\bname\s*=/i;

const PLACEHOLDER = 'TODO(flowai-remediation): describe element';

export function injectAriaLabel({ finding, fileContent, filePath }) {
  if (typeof fileContent !== 'string' || fileContent.length === 0) {
    return noPatch({ generator: GENERATOR, reason: 'empty_file_content' });
  }
  let count = 0;
  const patched = fileContent.replace(TARGET_RE, (match, tag, attrs) => {
    if (HAS_ARIA_LABEL.test(attrs) || HAS_ARIA_LABELLEDBY.test(attrs)) return match;
    if (tag.toLowerCase() === 'input' && HAS_NAME.test(attrs)) return match;
    count += 1;
    const trailingSlash = /\/$/.test(attrs.trimEnd()) ? ' /' : '';
    const cleaned = attrs.replace(/\/$/, '').trimEnd();
    return `<${tag}${cleaned ? ' ' + cleaned.trimStart() : ''} aria-label="${PLACEHOLDER}"${trailingSlash}>`;
  });
  if (count === 0) {
    return noPatch({ generator: GENERATOR, reason: 'no_unlabelled_targets' });
  }
  const confidence = 0.75;
  if (confidence < CONFIDENCE_FLOOR) {
    return noPatch({ generator: GENERATOR, reason: 'confidence_below_floor' });
  }
  return Object.freeze({
    patched: true,
    patchedContent: patched,
    changeDescription:
      `Injected aria-label placeholder on ${count} element${count === 1 ? '' : 's'} in ${filePath}. ` +
      'Placeholder text starts with "TODO(flowai-remediation)" — reviewer MUST fill copy before merge.',
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

export default injectAriaLabel;
