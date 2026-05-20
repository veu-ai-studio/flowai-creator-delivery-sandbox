// src/lib/construction/resolvers/originPageResolver.js
//
// Default originPageResolver factory per W5a dispatch.
//
// Maps a Phase B finding (which carries a `location` like a URL path or
// a component identifier) back to the repo-relative file path of the
// originating page + its current source content. The resolver is the
// load-bearing dep for runWireUpConstruction's GENERATE step: without
// it, every wire_up candidate aborts at NO_ORIGIN_PAGE_RESOLVER.
//
// Strategy:
//   1. Extract a path token from candidate.location (last meaningful
//      URL segment OR the selector portion after the colon).
//   2. Score repo files by whether their path contains the token
//      (case-insensitive). Restrict to .js/.jsx/.ts/.tsx so we
//      target source files, not assets or configs.
//   3. Highest-scoring file is selected; its content is fetched via
//      the supplied fetchFileContent closure.
//
// Caller-supplied closures (repoFileList + fetchFileContent) bind the
// orchestrator's per-iteration credentials (GitHub token + owner/repo
// + ref) so this module is itself product-agnostic and credentials-
// agnostic — consistent with the zero-per-product-code-path discipline.

'use strict';

/**
 * Extract a path token from a Phase B finding's location string.
 * Examples:
 *   "https://reltwin.com/settings:transfer-button" → "settings"
 *   "https://reltwin.com/pages/profile"           → "profile"
 *   "Settings:transfer-button"                    → "settings"
 *   "/api/wire/transfer"                          → "transfer"
 *   ""                                            → ""
 *
 * The token is what we'll match against repo file paths.
 *
 * @param {string} locationStr
 * @returns {string}                lowercased token, possibly empty
 */
// W5a — extractToken handles three location shapes:
//   1. Full URL with path        — "https://x.com/settings" → "settings"
//   2. Full URL (no path) + CSS selector — "https://x.com button#submit-btn" → "button" (or "submit-btn" via id fallback)
//   3. Bare/empty/unparseable    — "layout" (root-page fallback marker)
// The 'layout' return signals the caller to fall back to a canonical
// root-page lookup (src/Layout.jsx, src/App.jsx, etc.).
const SELECTOR_TAG_SKIP = Object.freeze(['div', 'span', 'section', 'main', 'nav', 'header', 'footer']);

export function extractToken(locationStr) {
  if (typeof locationStr !== 'string') return 'layout';
  const trimmed = locationStr.trim();
  if (!trimmed) return 'layout';
  const spaceIdx = trimmed.indexOf(' ');
  const urlPart = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
  const selectorPart = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();
  // Try URL pathname first.
  try {
    const url = new URL(urlPart);
    const pathToken = url.pathname.split('/').filter(Boolean).pop()
      ?.split('.')[0]?.toLowerCase();
    if (pathToken) return pathToken;
  } catch { /* not a URL — fall through to selector branch */ }
  // Fall back to CSS selector tag name (then id).
  if (selectorPart) {
    const tag = selectorPart.split('>').pop()?.trim().split(/[#.\s:[]/)[0]?.toLowerCase();
    if (tag && !SELECTOR_TAG_SKIP.includes(tag)) return tag;
    const idMatch = selectorPart.match(/#([\w-]+)/);
    if (idMatch) return idMatch[1].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 20);
  }
  return 'layout';
}

/**
 * Score a repo file path against a token. 1 for substring match, 0 otherwise.
 * Extended scoring: exact basename match scores higher.
 */
export function scoreFileAgainstToken(filePath, token) {
  if (typeof filePath !== 'string' || typeof token !== 'string' || token.length === 0) return 0;
  const lower = filePath.toLowerCase();
  if (!lower.includes(token)) return 0;
  // Boost when the basename (file before extension) equals the token exactly.
  const basename = (filePath.split('/').pop() ?? '').split('.')[0].toLowerCase();
  if (basename === token) return 3;
  if (basename.includes(token)) return 2;
  return 1;
}

const SOURCE_EXT_RE = /\.(?:tsx|jsx|ts|js)$/i;

// W5a — root-page fallback chain. Used when extractToken returns the
// 'layout' sentinel (no path / no selector tag we can score) OR when
// the scored-file search returns zero hits. Paths checked in order;
// first one found in repoFileList wins.
export const ROOT_PAGE_FALLBACK_PATHS = Object.freeze([
  'src/Layout.jsx',
  'src/App.jsx',
  'src/pages/index.tsx',
  'src/pages/index.jsx',
]);

/**
 * Create the default originPageResolver for the ConstructionEngine.
 *
 * @param {object} deps
 * @param {function} deps.repoFileList     — async () => string[]   (repo-relative paths)
 * @param {function} deps.fetchFileContent — async (path) => string  (file content)
 * @returns {function}                     — async ({ candidate }) → { repoRelativePath, currentContent }
 *                                           also returns { path, content } aliases for back-compat
 *                                           with the engine's older field names.
 */
export function createOriginPageResolver({ repoFileList, fetchFileContent }) {
  if (typeof repoFileList !== 'function') {
    throw new Error('createOriginPageResolver: repoFileList dep must be a function');
  }
  if (typeof fetchFileContent !== 'function') {
    throw new Error('createOriginPageResolver: fetchFileContent dep must be a function');
  }
  return async function originPageResolver(args) {
    // Accept BOTH { candidate } (dispatch shape) and a bare candidate
    // (engine's pre-existing call site). Defensive — engine call site
    // is being updated in the same dispatch but supporting both shapes
    // avoids a coupling bug if either side drifts.
    const candidate = args?.candidate ?? args;
    if (!candidate || typeof candidate !== 'object') {
      throw new Error('originPageResolver: candidate object required');
    }
    const locationStr = candidate.location || candidate.selector || candidate.id || '';
    const token = extractToken(locationStr);
    const files = await repoFileList();
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('originPageResolver: repoFileList returned empty');
    }
    const fileSet = new Set(files);

    // W5a — root-page fallback resolver (only consults the in-memory
    // file list; no fetch). Returns null when none of the canonical
    // root paths exist in the repo.
    function pickRootFallback() {
      for (const p of ROOT_PAGE_FALLBACK_PATHS) {
        if (fileSet.has(p)) return p;
      }
      return null;
    }

    let repoRelativePath = null;
    let matchScore = 0;
    let usedFallback = false;

    if (token === 'layout') {
      repoRelativePath = pickRootFallback();
      usedFallback = true;
    } else {
      const scored = files
        .filter((f) => typeof f === 'string' && SOURCE_EXT_RE.test(f))
        .map((f) => ({ path: f, score: scoreFileAgainstToken(f, token) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);
      if (scored.length > 0) {
        repoRelativePath = scored[0].path;
        matchScore = scored[0].score;
      } else {
        repoRelativePath = pickRootFallback();
        usedFallback = true;
      }
    }

    if (!repoRelativePath) {
      throw new Error(`originPageResolver: no source file matched token "${token}" from location "${locationStr}" and no root-page fallback present in repoFileList`);
    }
    const currentContent = await fetchFileContent(repoRelativePath);
    if (typeof currentContent !== 'string') {
      throw new Error(`originPageResolver: fetchFileContent for ${repoRelativePath} returned non-string`);
    }
    return {
      // Dispatch-spec field names:
      repoRelativePath,
      currentContent,
      // Back-compat aliases the engine reads:
      path: repoRelativePath,
      content: currentContent,
      // Debugging aid:
      matchScore,
      matchToken: token,
      usedFallback,
    };
  };
}
