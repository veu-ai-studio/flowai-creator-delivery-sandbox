// src/lib/remediation/patchGenerators/repair-asset-path.js — PHASE B2 STEP 4
//
// Repair a runtime-detected 404 by replacing the broken asset URL with a
// SAFE FALLBACK. v1 does NOT guess the "correct" URL — that requires
// crawl-graph reconciliation we don't yet have. Instead, when the finding
// carries a specific failing asset URL in the description / detail, the
// generator:
//
//   (a) For .js / .css references: comment out the <script>/<link> tag so
//       the page no longer 404s on it (assumes the asset is non-essential —
//       reviewer must confirm).
//   (b) For <img> references: replace the src= with a 1x1 transparent
//       data: URI placeholder so the broken-image icon disappears.
//
// These transforms are NEVER applied when the failing path is the page's
// own document or contains 'index.html' (likely critical).
//
// Confidence: 0.7 (low end — the auto action removes a symptom, not the
// root cause; the PR description marks it for reviewer follow-up).

'use strict';

import { makeProvenance, noPatch, CONFIDENCE_FLOOR } from './_shared.js';

const GENERATOR = 'repair-asset-path';

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/** Extract the failing URL from a runtime-diagnostics finding. */
function extractFailingUrl(finding) {
  const detail = finding?.detail;
  if (detail && typeof detail.url === 'string' && detail.url.length > 0) return detail.url;
  // Fall back to parsing the description's "Failed GET <url> (...)" pattern.
  const desc = String(finding?.description ?? '');
  const m = desc.match(/Failed\s+\w+\s+(https?:\S+)\s/i)
        ?? desc.match(/HTTP\s+\d+\s+on\s+(https?:\S+)/i);
  return m ? m[1] : null;
}

function isCritical(path) {
  if (typeof path !== 'string') return true;
  const p = path.toLowerCase();
  return p.endsWith('/') || p.endsWith('index.html') || p.endsWith('.html');
}

export function repairAssetPath({ finding, fileContent, filePath }) {
  if (typeof fileContent !== 'string' || fileContent.length === 0) {
    return noPatch({ generator: GENERATOR, reason: 'empty_file_content' });
  }
  const failingUrl = extractFailingUrl(finding);
  if (!failingUrl) {
    return noPatch({ generator: GENERATOR, reason: 'no_failing_url_in_finding' });
  }
  if (isCritical(failingUrl)) {
    return noPatch({ generator: GENERATOR, reason: 'failing_url_is_critical' });
  }
  // Bare path form: strip origin so we can locate the reference in source.
  let needle;
  try { needle = new URL(failingUrl).pathname; } catch { needle = failingUrl; }
  if (typeof needle !== 'string' || needle.length < 2) {
    return noPatch({ generator: GENERATOR, reason: 'needle_too_short' });
  }
  // Only operate on HTML for v1 — JS bundle rewrites are out of scope.
  if (!/\.html?$/i.test(filePath ?? '')) {
    return noPatch({ generator: GENERATOR, reason: 'not_an_html_file' });
  }
  if (!fileContent.includes(needle)) {
    return noPatch({ generator: GENERATOR, reason: 'needle_not_in_file' });
  }

  // Decide the transform based on extension.
  let patched = fileContent;
  let action = null;
  const isJs  = /\.m?js(\?|$)/i.test(needle);
  const isCss = /\.css(\?|$)/i.test(needle);
  const isImg = /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(needle);

  if (isJs) {
    // Comment out the matching <script src="...needle...">
    const re = new RegExp(`<script\\b[^>]*src=["'][^"']*${escapeRegex(needle)}[^"']*["'][^>]*>\\s*</script>`, 'gi');
    if (re.test(fileContent)) {
      patched = fileContent.replace(re, (m) => `<!-- flowai:remediation removed (404): ${m.replace(/-->/g, '--&gt;')} -->`);
      action = 'commented-out-script';
    }
  } else if (isCss) {
    const re = new RegExp(`<link\\b[^>]*href=["'][^"']*${escapeRegex(needle)}[^"']*["'][^>]*>`, 'gi');
    if (re.test(fileContent)) {
      patched = fileContent.replace(re, (m) => `<!-- flowai:remediation removed (404): ${m.replace(/-->/g, '--&gt;')} -->`);
      action = 'commented-out-link';
    }
  } else if (isImg) {
    const re = new RegExp(`(<img\\b[^>]*src=["'])([^"']*${escapeRegex(needle)}[^"']*)(["'])`, 'gi');
    if (re.test(fileContent)) {
      patched = fileContent.replace(re, (m, pre, _src, post) => `${pre}${TRANSPARENT_PIXEL}${post}`);
      action = 'replaced-img-with-transparent-pixel';
    }
  }
  if (action === null || patched === fileContent) {
    return noPatch({ generator: GENERATOR, reason: 'no_known_transform_for_extension' });
  }
  const confidence = 0.7;
  if (confidence < CONFIDENCE_FLOOR) {
    return noPatch({ generator: GENERATOR, reason: 'confidence_below_floor' });
  }
  return Object.freeze({
    patched: true,
    patchedContent: patched,
    changeDescription:
      `Repaired 404 reference to ${needle} in ${filePath}: ${action}. ` +
      'Reviewer should restore the asset or replace the placeholder before merge.',
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

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default repairAssetPath;
