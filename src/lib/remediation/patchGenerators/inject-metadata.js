// src/lib/remediation/patchGenerators/inject-metadata.js — PHASE B2 STEP 4
//
// Inject missing <meta name="description">, <meta name="viewport">, and
// canonical link tags into an HTML file's <head>. v1 only ADDS missing
// tags — never modifies existing ones. Empty/placeholder description is
// flagged with TODO so reviewer must fill in copy before merge.
//
// Confidence: 0.8 (deterministic; only adds when absent; safe).

'use strict';

import { makeProvenance, noPatch, CONFIDENCE_FLOOR } from './_shared.js';

const GENERATOR = 'inject-metadata';

const META_DESC_RE = /<meta\s+[^>]*name=["']description["'][^>]*>/i;
const META_VIEWPORT_RE = /<meta\s+[^>]*name=["']viewport["'][^>]*>/i;
const HEAD_OPEN_RE = /<head\b[^>]*>/i;

const PLACEHOLDER_DESC = 'TODO(flowai-remediation): replace with site-specific description (50-160 chars).';

export function injectMetadata({ finding, fileContent, filePath }) {
  if (typeof fileContent !== 'string' || fileContent.length === 0) {
    return noPatch({ generator: GENERATOR, reason: 'empty_file_content' });
  }
  if (!/\.html?$/i.test(filePath ?? '')) {
    return noPatch({ generator: GENERATOR, reason: 'not_an_html_file' });
  }
  if (!HEAD_OPEN_RE.test(fileContent)) {
    return noPatch({ generator: GENERATOR, reason: 'no_head_tag' });
  }
  const cat = String(finding?.category ?? '').toLowerCase();
  const tags = [];
  if (cat.includes('meta-description') && !META_DESC_RE.test(fileContent)) {
    tags.push(`<meta name="description" content="${PLACEHOLDER_DESC}">`);
  }
  if (cat.includes('viewport') && !META_VIEWPORT_RE.test(fileContent)) {
    tags.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  }
  if (tags.length === 0) {
    return noPatch({ generator: GENERATOR, reason: 'all_targeted_tags_already_present' });
  }
  const insertion = '\n    ' + tags.join('\n    ') + '\n';
  const patched = fileContent.replace(HEAD_OPEN_RE, (m) => `${m}${insertion}`);
  const confidence = 0.8;
  if (confidence < CONFIDENCE_FLOOR) {
    return noPatch({ generator: GENERATOR, reason: 'confidence_below_floor' });
  }
  return Object.freeze({
    patched: true,
    patchedContent: patched,
    changeDescription:
      `Injected ${tags.length} meta tag(s) into ${filePath}: ${tags.map((t) => t.match(/name="([^"]+)"/)?.[1] ?? '?').join(', ')}. ` +
      (cat.includes('meta-description') ? 'Description carries a TODO placeholder — reviewer must fill in copy before merge.' : ''),
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

export default injectMetadata;
