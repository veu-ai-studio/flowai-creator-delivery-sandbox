// src/lib/agents/renewal/diffEditor.js
//
// Diff-only fix engine (D32 T2 — convergence enabler).
//
// Replaces full-file regeneration with a surgical-edit contract. The
// model returns a minimal unified-diff that:
//   (a) parses correctly
//   (b) applies cleanly to the original content (context lines match)
//   (c) does NOT remove or modify any existing import / export / fetch
//       / route / URL line outside the targeted change region
//   (d) changes ≤ MAX_CHANGE_RATIO of the file's total lines (default 25%)
//
// Diffs that violate any rule are REJECTED with an explicit reason so
// the orchestrator skips the fix and continues the loop.
//
// Why this exists: D29/30 proved that prompt-level "preserve all
// imports/fetches/routes BYTE-FOR-BYTE" guardrails are not enforceable
// by the model (MyPregLife 88→83 regression, MyPregLife iter1 +2 high
// findings). Diff-only converts the architectural invariant from a
// prompt promise into a system contract: the orchestrator never sees
// a fix that touched a forbidden line.

'use strict';

// ── Constants ──────────────────────────────────────────────────────────

const DEFAULT_MAX_CHANGE_RATIO = 0.25;   // 25% of total file lines
const DEFAULT_MAX_HUNK_LINES = 200;       // single-hunk hard cap

// Lines that the diff is NOT allowed to remove or modify (unless they
// are explicitly named in the fix instruction — caller can pass a
// whitelist via opts.preserveExceptions).
const PRESERVE_PATTERNS = Object.freeze({
  // ES module imports + exports.
  import: /^\s*(?:import\s+|export\s+\{?\s*\w|export\s+default\s+|export\s+const\s+|export\s+function\s+|export\s+class\s+|export\s+type\s+|export\s+interface\s+|export\s+enum\s+)/,
  // CommonJS require / module.exports.
  require: /\brequire\s*\(\s*['"][^'"]+['"]\s*\)/,
  module_exports: /^\s*module\.exports\s*=/,
  // fetch / axios / api calls.
  fetch_call: /\bfetch\s*\(/,
  axios_call: /\baxios\.\w+\s*\(/,
  // Route declarations (React Router, Express, Next.js).
  route_decl: /<Route\s|router\.(get|post|put|patch|delete|use)\s*\(|app\.(get|post|put|patch|delete|use)\s*\(/,
  // URL literals (https/http strings with at least one path segment).
  url_literal: /['"`](?:https?:\/\/|wss?:\/\/)[^'"`\s]+['"`]/,
});

// ── Parser ─────────────────────────────────────────────────────────────

/**
 * Parse a unified-diff text into hunks. Accepts the standard format:
 *
 *   --- a/path           (optional file headers)
 *   +++ b/path
 *   @@ -oldStart,oldLines +newStart,newLines @@ optional-section
 *    context line
 *   -removed line
 *   +added line
 *    context line
 *
 * Also accepts a "hunks-only" form where the model omits the file
 * headers and just emits @@ ... @@ blocks. The orchestrator already
 * knows the target file path.
 *
 * Returns { ok, hunks?, reason? }.
 */
export function parseUnifiedDiff(diffText) {
  if (typeof diffText !== 'string' || diffText.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  const text = diffText.replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const hunks = [];
  let i = 0;
  // Skip file headers if present.
  while (i < lines.length && /^(---|\+\+\+|diff --git|index )/.test(lines[i])) i += 1;
  while (i < lines.length) {
    const header = lines[i];
    if (!header) { i += 1; continue; }
    const m = header.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/);
    if (!m) {
      // Lines outside a hunk header are noise; skip until next @@.
      i += 1;
      continue;
    }
    const oldStart = parseInt(m[1], 10);
    const oldLines = m[2] !== undefined ? parseInt(m[2], 10) : 1;
    const newStart = parseInt(m[3], 10);
    const newLines = m[4] !== undefined ? parseInt(m[4], 10) : 1;
    const section = (m[5] ?? '').trim();
    i += 1;
    const hunkLines = [];
    while (i < lines.length && !/^@@\s+-\d+/.test(lines[i])) {
      const ln = lines[i];
      // End of diff (no more hunk content). Tolerate trailing blank lines.
      if (ln === undefined) break;
      if (ln === '' && hunkLines.length === 0) { i += 1; continue; }
      if (/^[ +\-\\]/.test(ln) === false && ln !== '') {
        // A line that's not a context (' '), addition ('+'), removal
        // ('-'), or no-newline marker ('\') is a malformed hunk line.
        // Stop the hunk; next iter will retry from this line.
        break;
      }
      hunkLines.push(ln);
      i += 1;
    }
    if (hunkLines.length === 0) {
      return { ok: false, reason: `empty_hunk_at_old_start_${oldStart}` };
    }
    if (hunkLines.length > DEFAULT_MAX_HUNK_LINES) {
      return { ok: false, reason: `hunk_too_large:${hunkLines.length}>${DEFAULT_MAX_HUNK_LINES}` };
    }
    hunks.push({ oldStart, oldLines, newStart, newLines, section, lines: hunkLines });
  }
  if (hunks.length === 0) {
    return { ok: false, reason: 'no_hunks' };
  }
  return { ok: true, hunks };
}

// ── Applier ────────────────────────────────────────────────────────────

/**
 * Apply a parsed diff to the original text. Validates that every
 * context (' ') and removal ('-') line in the diff exactly matches
 * the corresponding line in the original (or its nearby neighbors —
 * we tolerate ±2 line drift so a slightly-stale oldStart still
 * applies).
 *
 * Returns { ok, content?, stats?, reason? } where stats has
 * { hunks, linesAdded, linesRemoved, changeRatio, totalLines }.
 */
export function applyDiff(originalText, parsed) {
  if (typeof originalText !== 'string') {
    return { ok: false, reason: 'original_not_string' };
  }
  if (!parsed || !Array.isArray(parsed.hunks)) {
    return { ok: false, reason: 'no_hunks_parsed' };
  }
  const origLines = originalText.split('\n');
  // Some files don't end with a newline; track that so we don't add one.
  const trailingNewline = originalText.endsWith('\n');

  // Build the output by walking through the original and applying each
  // hunk in order. Hunks are 1-indexed by oldStart; we track current
  // position so multiple hunks in one file apply correctly.
  let cursor = 0; // 0-based index into origLines
  const out = [];
  let totalAdded = 0;
  let totalRemoved = 0;

  for (const hunk of parsed.hunks) {
    // Locate the hunk in the original. Start at hunk.oldStart - 1 and
    // verify context lines match; if not, try ±2 line drift.
    const expectedStart = Math.max(0, hunk.oldStart - 1);
    const expectedLines = [];
    for (const l of hunk.lines) {
      const op = l[0];
      const body = l.slice(1);
      if (op === ' ' || op === '-') expectedLines.push(body);
    }
    // Find best match position (drift tolerance ±3 lines).
    let bestStart = -1;
    for (let d = 0; d <= 3 && bestStart < 0; d += 1) {
      for (const delta of (d === 0 ? [0] : [-d, d])) {
        const tryStart = expectedStart + delta;
        if (tryStart < cursor) continue;
        if (tryStart + expectedLines.length > origLines.length) continue;
        let match = true;
        for (let j = 0; j < expectedLines.length; j += 1) {
          if (origLines[tryStart + j] !== expectedLines[j]) { match = false; break; }
        }
        if (match) { bestStart = tryStart; break; }
      }
    }
    if (bestStart < 0) {
      return { ok: false, reason: `hunk_does_not_apply:oldStart=${hunk.oldStart}` };
    }
    // Copy everything between cursor and bestStart verbatim.
    for (let k = cursor; k < bestStart; k += 1) out.push(origLines[k]);
    cursor = bestStart;
    // Walk the hunk lines: ' ' copies, '-' removes (advances cursor in
    // original), '+' adds.
    let originalIndex = bestStart;
    for (const l of hunk.lines) {
      const op = l[0];
      const body = l.slice(1);
      if (op === ' ') {
        out.push(body);
        originalIndex += 1;
      } else if (op === '-') {
        originalIndex += 1;
        totalRemoved += 1;
      } else if (op === '+') {
        out.push(body);
        totalAdded += 1;
      } else if (op === '\\') {
        // "\ No newline at end of file" marker — handled by trailing-
        // newline preservation at the end.
      } else if (op === undefined) {
        // empty line in raw text (rare) — treat as context.
        out.push('');
        originalIndex += 1;
      }
    }
    cursor = originalIndex;
  }
  // Trailing unchanged region.
  for (let k = cursor; k < origLines.length; k += 1) out.push(origLines[k]);

  let content = out.join('\n');
  if (trailingNewline && !content.endsWith('\n')) content += '\n';
  else if (!trailingNewline && content.endsWith('\n')) content = content.replace(/\n$/, '');

  return {
    ok: true,
    content,
    stats: {
      hunks: parsed.hunks.length,
      linesAdded: totalAdded,
      linesRemoved: totalRemoved,
      totalLines: origLines.length,
      changeRatio: origLines.length > 0
        ? (totalAdded + totalRemoved) / origLines.length
        : (totalAdded + totalRemoved > 0 ? 1 : 0),
    },
  };
}

// ── Validator ──────────────────────────────────────────────────────────

/**
 * Verify a parsed diff against the preserve rules:
 *   - No removed line matches any PRESERVE_PATTERNS regex.
 *   - Total change ratio <= maxChangeRatio.
 *
 * D33 T2 — scoped per-finding relaxation via `preserveExceptions`:
 *   When the caller passes preserveExceptions = { <category>: [<substring>, ...] },
 *   a removed line that matches PRESERVE_PATTERNS[category] is STILL
 *   allowed IF the line ALSO contains at least one of the listed
 *   substrings. The substring set is finding-derived (location/evidence
 *   URL parts), so only the exact offending construct can be modified.
 *   Other lines that match the same category but DON'T carry the
 *   substring are still rejected.
 *
 * @param {object} parsed   — result of parseUnifiedDiff()
 * @param {object} opts
 * @param {string} opts.original   — original file content
 * @param {number} [opts.maxChangeRatio=DEFAULT_MAX_CHANGE_RATIO]
 * @param {object<string,string[]>} [opts.preserveExceptions]
 *        — per-category list of substrings that authorize removal of an
 *          otherwise-preserved line. See deriveScopedRelaxation in
 *          orchestrator.js for the canonical derivation.
 * @returns {{ ok: boolean, reason?: string, violatingLine?: string, category?: string }}
 */
export function validateDiff(parsed, opts = {}) {
  if (!parsed || !Array.isArray(parsed.hunks)) {
    return { ok: false, reason: 'no_hunks_parsed' };
  }
  const maxRatio = Number.isFinite(opts.maxChangeRatio) ? opts.maxChangeRatio : DEFAULT_MAX_CHANGE_RATIO;
  const exceptions = (opts.preserveExceptions && typeof opts.preserveExceptions === 'object')
    ? opts.preserveExceptions : null;
  let totalAdded = 0;
  let totalRemoved = 0;
  for (const h of parsed.hunks) {
    for (const l of h.lines) {
      const op = l[0];
      const body = l.slice(1);
      if (op === '+') totalAdded += 1;
      if (op === '-') {
        totalRemoved += 1;
        for (const [cat, re] of Object.entries(PRESERVE_PATTERNS)) {
          if (re.test(body)) {
            // D33 T2: check scoped relaxation. If this category has an
            // exception list AND the line contains any of the listed
            // substrings, the removal is allowed.
            if (exceptions && Array.isArray(exceptions[cat]) && exceptions[cat].length > 0) {
              const matched = exceptions[cat].some((sub) =>
                typeof sub === 'string' && sub.length > 0 && body.includes(sub),
              );
              if (matched) continue;   // scoped relaxation authorizes this removal
            }
            return {
              ok: false,
              reason: 'preserve_violation',
              category: cat,
              violatingLine: body.length > 200 ? body.slice(0, 200) + '…' : body,
            };
          }
        }
      }
    }
  }
  if (typeof opts.original === 'string') {
    const totalLines = opts.original.split('\n').length;
    const changed = totalAdded + totalRemoved;
    if (totalLines > 0) {
      const ratio = changed / totalLines;
      if (ratio > maxRatio) {
        return {
          ok: false,
          reason: 'change_ratio_exceeded',
          ratio,
          maxRatio,
        };
      }
    }
  }
  return { ok: true };
}

// ── Prompt builder ─────────────────────────────────────────────────────

/**
 * Build the Claude prompt that asks for a unified-diff edit. The
 * model is instructed to return ONLY the diff (no preamble, no
 * markdown fences), with strict format rules.
 */
export function buildDiffPrompt({ filePath, fileContent, issue, fix }) {
  return [
    'You are a surgical code-edit assistant. Return ONLY a unified diff that makes the minimal targeted change to fix the specific finding.',
    '',
    'The issue being fixed:',
    issue,
    '',
    'The precise change instruction:',
    fix,
    '',
    `File path: ${filePath}`,
    'Current file content (use these line numbers as the basis for @@ headers):',
    '',
    '────────── BEGIN FILE ──────────',
    fileContent,
    '────────── END FILE ──────────',
    '',
    'STRICT DIFF REQUIREMENTS:',
    '- Return ONLY a unified diff. No preamble, no explanation, no markdown code fences.',
    '- Format: zero or more `@@ -oldStart,oldLines +newStart,newLines @@` hunks.',
    '- Use ` ` (space) prefix for context lines, `-` for removed lines, `+` for added lines.',
    '- Include 2-3 context lines of unchanged code around each change so the hunk locates correctly.',
    '- Make the SMALLEST possible diff that fixes the finding. A diff that touches 1-5 lines is normal.',
    '- DO NOT remove or modify any line that contains:',
    '  - An import / export / require / module.exports statement (unless the finding explicitly targets one).',
    '  - A fetch() / axios.* / API call (unless the finding explicitly targets one).',
    '  - A <Route ...>, router.get/post/..., or URL string literal (unless the finding explicitly targets one).',
    '- DO NOT change more than ~25% of the file. Diffs that exceed this will be rejected.',
    '- If the requested fix would require violating any of the rules above, return an EMPTY diff (no @@ headers) — the orchestrator will skip the file cleanly.',
    '',
    'Output the unified diff now. No other text.',
  ].join('\n');
}

// ── Convenience ────────────────────────────────────────────────────────

/**
 * One-shot: parse diff text, validate against the preserve rules, and
 * apply to original. Returns the fixed content + stats, or a failure
 * envelope.
 */
export function applyAndValidate({ original, diffText, opts = {} }) {
  const parsed = parseUnifiedDiff(diffText);
  if (!parsed.ok) return { ok: false, reason: `parse_failed:${parsed.reason}` };
  const v = validateDiff(parsed, {
    original,
    maxChangeRatio: opts.maxChangeRatio,
    preserveExceptions: opts.preserveExceptions,
  });
  if (!v.ok) return { ok: false, reason: v.reason, category: v.category, violatingLine: v.violatingLine, ratio: v.ratio };
  const applied = applyDiff(original, parsed);
  if (!applied.ok) return { ok: false, reason: applied.reason };
  return { ok: true, content: applied.content, stats: applied.stats };
}

export const __internals = Object.freeze({
  PRESERVE_PATTERNS,
  DEFAULT_MAX_CHANGE_RATIO,
  DEFAULT_MAX_HUNK_LINES,
});
