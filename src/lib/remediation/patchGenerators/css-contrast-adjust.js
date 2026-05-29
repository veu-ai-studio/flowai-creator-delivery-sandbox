// src/lib/remediation/patchGenerators/css-contrast-adjust.js — PHASE B2 STEP 4
//
// Append a minimal contrast-rescue stylesheet block to the target CSS file
// (or `<style>` block) so the WCAG AA contrast floor (4.5:1 for normal,
// 3:1 for large) is reached on the failing selectors. v1 is the safest
// possible change: append a small rules block at the END of the file
// that forces color: #111 on body text + button labels + links when no
// other rule wins specificity. We do NOT mutate existing rules — only
// APPEND — so the patch is trivially reversible and never breaks an
// existing palette.
//
// Confidence: 0.7 (LOW end of the auto-fix range — palette decisions
// often require designer review; v1 only rescues egregious failures).
//
// A future v2 will parse the failing computed style + the cascade and
// adjust the OFFENDING rule; v1 is intentionally conservative.

'use strict';

import { makeProvenance, noPatch, CONFIDENCE_FLOOR } from './_shared.js';

const GENERATOR = 'css-contrast-adjust';

const RESCUE_BLOCK = [
  '',
  '/* flowai:contrast-rescue v1 — WCAG AA floor, appended by flowai-remediation-engine. */',
  '/* SAFE: only applies when no rule of equal/higher specificity already wins. */',
  ':where(body, p, li, span, a, button, label) { color: #111; }',
  ':where(a:not([class])) { color: #1a4fb5; }',
  ':where(button, [role="button"]) { background-color: #f5f5f5; color: #111; }',
  '/* /flowai:contrast-rescue */',
  '',
].join('\n');

const MARKER = '/* flowai:contrast-rescue v1';

export function cssContrastAdjust({ finding, fileContent, filePath }) {
  if (typeof fileContent !== 'string') {
    return noPatch({ generator: GENERATOR, reason: 'non_string_content' });
  }
  if (fileContent.includes(MARKER)) {
    return noPatch({ generator: GENERATOR, reason: 'already_patched' });
  }
  // We only operate on CSS-ish files; if the file is HTML, look for a
  // <style>...</style> block to inject into. Otherwise abort.
  const isCss = /\.(css|scss|sass|less)$/i.test(filePath ?? '');
  const isHtml = /\.html?$/i.test(filePath ?? '');
  if (!isCss && !isHtml) {
    return noPatch({ generator: GENERATOR, reason: 'not_a_css_or_html_target' });
  }
  let patched;
  if (isCss) {
    patched = fileContent.trimEnd() + '\n' + RESCUE_BLOCK;
  } else {
    // HTML: prefer to inject into an existing <style> block; else append a
    // new <style> just before </head>.
    if (/<\/style>/i.test(fileContent)) {
      patched = fileContent.replace(/<\/style>/i, RESCUE_BLOCK + '</style>');
    } else if (/<\/head>/i.test(fileContent)) {
      patched = fileContent.replace(
        /<\/head>/i,
        `<style>${RESCUE_BLOCK}</style>\n</head>`,
      );
    } else {
      return noPatch({ generator: GENERATOR, reason: 'html_has_no_head_or_style' });
    }
  }
  const confidence = 0.7;
  if (confidence < CONFIDENCE_FLOOR) {
    return noPatch({ generator: GENERATOR, reason: 'confidence_below_floor' });
  }
  return Object.freeze({
    patched: true,
    patchedContent: patched,
    changeDescription:
      `Appended contrast-rescue rules to ${filePath} (WCAG AA floor). ` +
      'Conservative: APPEND-only, scoped via :where() so existing rules win.',
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

export default cssContrastAdjust;
