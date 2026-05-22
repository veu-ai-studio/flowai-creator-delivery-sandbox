// U5 - source-mapped recommendation generator.
//
// Recommendation-only: never edits files, never fetches GitHub content, and
// never upgrades authority beyond recommend_only.

'use strict';

const AUTHORITY = 'recommend_only';
const LOW_DEGRADED_REASON = 'source_map_incomplete';
const LOW_DEGRADED_FIX = 'inspect registered repo/source map before patching';

function findingKey(finding) {
  return finding?.id ?? finding?.findingId ?? null;
}

function findingLocation(finding) {
  return finding?.location ?? finding?.url ?? finding?.pageUrl ?? null;
}

function getMappings(sourceMapping) {
  if (Array.isArray(sourceMapping)) return sourceMapping;
  if (Array.isArray(sourceMapping?.mappings)) return sourceMapping.mappings;
  return [];
}

function findMappingForFinding(finding, sourceMapping) {
  const mappings = getMappings(sourceMapping);
  const id = findingKey(finding);
  const category = finding?.category ?? null;
  const location = findingLocation(finding);
  return mappings.find((m) =>
    (id && m.findingId === id)
    || (m.category === category && (m.location ?? null) === location)
    || (m.category === category && !location));
}

function degradedProposal(finding, reason = LOW_DEGRADED_REASON) {
  return Object.freeze({
    findingId: findingKey(finding),
    category: finding?.category ?? null,
    severity: finding?.severity ?? null,
    filePath: null,
    lineNumber: null,
    currentSnippet: null,
    proposedFix: LOW_DEGRADED_FIX,
    confidence: 'LOW',
    authority: AUTHORITY,
    reason,
    sourceMapComplete: false,
  });
}

async function readFileContent(fileContentProvider, filePath, finding, mapping) {
  if (!fileContentProvider || !filePath) return null;
  try {
    if (typeof fileContentProvider === 'function') {
      return await fileContentProvider(filePath, { finding, mapping });
    }
    if (typeof fileContentProvider.getFileContent === 'function') {
      return await fileContentProvider.getFileContent(filePath, { finding, mapping });
    }
    if (typeof fileContentProvider.read === 'function') {
      return await fileContentProvider.read(filePath, { finding, mapping });
    }
  } catch {
    return null;
  }
  return null;
}

function clampLineNumber(value, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), Math.max(1, max));
}

function snippetAtLine(content, lineNumber, radius = 2) {
  if (typeof content !== 'string' || !content.length) return null;
  const lines = content.split(/\r?\n/);
  const line = clampLineNumber(lineNumber, lines.length);
  const start = Math.max(1, line - radius);
  const end = Math.min(lines.length, line + radius);
  return {
    lineNumber: line,
    snippet: lines.slice(start - 1, end)
      .map((text, idx) => `${String(start + idx).padStart(4, ' ')} | ${text}`)
      .join('\n'),
  };
}

function confidenceFromMapping(mapping) {
  const c = Number(mapping?.confidence ?? 0);
  if (c >= 0.85) return 'HIGH';
  if (c >= 0.7) return 'MEDIUM';
  return 'LOW';
}

function fixTextForFinding(finding, filePath) {
  const category = String(finding?.category ?? '').toLowerCase();
  const location = findingLocation(finding);
  if (category.includes('color-contrast')) {
    return `Review ${filePath} for the affected selector and adjust foreground/background tokens to meet WCAG AA contrast.`;
  }
  if (category.includes('image') || category.includes('alt')) {
    return `Add meaningful alt text to the image rendered at ${location || 'the mapped route'}.`;
  }
  if (category.includes('aria') || category.includes('button-name') || category.includes('link-name')) {
    return `Add an accessible name with visible text, aria-label, or aria-labelledby for the mapped interactive element.`;
  }
  if (category.includes('meta-description')) {
    return 'Add a page-specific meta description in the document head.';
  }
  if (category.includes('viewport')) {
    return 'Add or correct the viewport meta tag in the document head.';
  }
  if (category.includes('network') || category.includes('404') || category.includes('asset')) {
    return `Inspect references in ${filePath} and repair the broken route or asset path reported at ${location || 'runtime'}.`;
  }
  return `Inspect ${filePath} near the mapped source location and implement the smallest source-level correction for this finding.`;
}

export async function generateSourceMappedFixProposals({
  findings,
  sourceMapping,
  fileContentProvider,
} = {}) {
  const list = Array.isArray(findings) ? findings : [];
  const out = [];

  for (const finding of list) {
    const mapping = findMappingForFinding(finding, sourceMapping);
    const filePath = mapping?.selectedFilePath ?? mapping?.filePath ?? null;
    const mapped = mapping?.mapped === true && typeof filePath === 'string' && filePath.length > 0;
    if (!mapped) {
      out.push(degradedProposal(finding));
      continue;
    }

    const mappedSnippet = typeof mapping?.currentSnippet === 'string' && mapping.currentSnippet.length > 0
      ? mapping.currentSnippet
      : null;
    const mappedLine = mapping?.lineNumber ?? finding?.lineNumber ?? finding?.line;
    let snippet = mappedSnippet;
    let lineNumber = Number.isFinite(Number(mappedLine)) ? Number(mappedLine) : null;

    if (!snippet) {
      const content = await readFileContent(fileContentProvider, filePath, finding, mapping);
      if (typeof content !== 'string' || !content.length) {
        out.push(degradedProposal(finding));
        continue;
      }
      const located = snippetAtLine(content, lineNumber ?? 1);
      snippet = located?.snippet ?? null;
      lineNumber = located?.lineNumber ?? null;
    }

    if (!snippet || !lineNumber) {
      out.push(degradedProposal(finding));
      continue;
    }

    out.push(Object.freeze({
      findingId: findingKey(finding),
      category: finding?.category ?? null,
      severity: finding?.severity ?? null,
      filePath,
      lineNumber,
      currentSnippet: snippet,
      proposedFix: typeof mapping?.proposedFix === 'string' && mapping.proposedFix
        ? mapping.proposedFix
        : fixTextForFinding(finding, filePath),
      confidence: confidenceFromMapping(mapping),
      authority: AUTHORITY,
      reason: mapping?.reason ?? 'source_mapped_recommendation',
      sourceMapComplete: true,
    }));
  }

  return Object.freeze(out);
}

export const __internals = Object.freeze({
  AUTHORITY,
  LOW_DEGRADED_REASON,
  LOW_DEGRADED_FIX,
  findMappingForFinding,
  snippetAtLine,
  confidenceFromMapping,
  degradedProposal,
});
