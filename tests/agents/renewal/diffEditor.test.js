// tests/agents/renewal/diffEditor.test.js
//
// D32 T2 — diff-only fix engine tests.

import { describe, it, expect } from 'vitest';
import {
  parseUnifiedDiff,
  applyDiff,
  validateDiff,
  applyAndValidate,
  buildDiffPrompt,
  __internals,
} from '../../../src/lib/agents/renewal/diffEditor.js';

const SIMPLE_FILE = [
  'import React from "react";',
  '',
  'export default function Hero() {',
  '  return (',
  '    <div className="hero">',
  '      <h1>Welcome</h1>',
  '      <p>Old description.</p>',
  '    </div>',
  '  );',
  '}',
  '',
].join('\n');

describe('parseUnifiedDiff', () => {
  it('parses a simple single-hunk diff', () => {
    const diff = [
      '@@ -7,1 +7,1 @@',
      '-      <p>Old description.</p>',
      '+      <p>New description.</p>',
    ].join('\n');
    const r = parseUnifiedDiff(diff);
    expect(r.ok).toBe(true);
    expect(r.hunks).toHaveLength(1);
    expect(r.hunks[0].oldStart).toBe(7);
    expect(r.hunks[0].oldLines).toBe(1);
    expect(r.hunks[0].newStart).toBe(7);
    expect(r.hunks[0].newLines).toBe(1);
    expect(r.hunks[0].lines).toEqual([
      '-      <p>Old description.</p>',
      '+      <p>New description.</p>',
    ]);
  });

  it('parses diff with file headers (--- / +++)', () => {
    const diff = [
      '--- a/src/Hero.jsx',
      '+++ b/src/Hero.jsx',
      '@@ -7,1 +7,1 @@',
      '-      <p>Old description.</p>',
      '+      <p>New description.</p>',
    ].join('\n');
    const r = parseUnifiedDiff(diff);
    expect(r.ok).toBe(true);
    expect(r.hunks).toHaveLength(1);
  });

  it('parses multiple hunks in one diff', () => {
    const diff = [
      '@@ -1,2 +1,2 @@',
      '-old line 1',
      '+new line 1',
      ' context',
      '@@ -10,1 +10,1 @@',
      '-old at 10',
      '+new at 10',
    ].join('\n');
    const r = parseUnifiedDiff(diff);
    expect(r.ok).toBe(true);
    expect(r.hunks).toHaveLength(2);
  });

  it('rejects empty diff', () => {
    expect(parseUnifiedDiff('').ok).toBe(false);
    expect(parseUnifiedDiff('').reason).toBe('empty');
  });

  it('returns ok:false with reason:"no_hunks" when no @@ markers found', () => {
    const r = parseUnifiedDiff('this is just\nplain text\nno hunks here');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no_hunks');
  });

  it('rejects hunks larger than DEFAULT_MAX_HUNK_LINES', () => {
    const hunkLines = Array.from({ length: 250 }, (_, i) => `+line ${i}`);
    const diff = ['@@ -1,0 +1,250 @@', ...hunkLines].join('\n');
    const r = parseUnifiedDiff(diff);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^hunk_too_large:/);
  });
});

describe('applyDiff', () => {
  it('applies a clean single-line replacement', () => {
    const diff = parseUnifiedDiff([
      '@@ -7,1 +7,1 @@',
      '-      <p>Old description.</p>',
      '+      <p>New description.</p>',
    ].join('\n'));
    const r = applyDiff(SIMPLE_FILE, diff);
    expect(r.ok).toBe(true);
    expect(r.content).toContain('<p>New description.</p>');
    expect(r.content).not.toContain('<p>Old description.</p>');
    expect(r.stats.linesAdded).toBe(1);
    expect(r.stats.linesRemoved).toBe(1);
    expect(r.stats.hunks).toBe(1);
  });

  it('applies a multi-line replacement', () => {
    const diff = parseUnifiedDiff([
      '@@ -7,1 +7,3 @@',
      '-      <p>Old description.</p>',
      '+      <p>First line.</p>',
      '+      <p>Second line.</p>',
      '+      <p>Third line.</p>',
    ].join('\n'));
    const r = applyDiff(SIMPLE_FILE, diff);
    expect(r.ok).toBe(true);
    expect(r.content).toContain('First line');
    expect(r.content).toContain('Second line');
    expect(r.content).toContain('Third line');
    expect(r.stats.linesAdded).toBe(3);
    expect(r.stats.linesRemoved).toBe(1);
  });

  it('applies a pure addition (no removals, context-anchored)', () => {
    const diff = parseUnifiedDiff([
      '@@ -6,1 +6,2 @@',
      '      <h1>Welcome</h1>',
      '+      <h2>Subtitle</h2>',
    ].join('\n'));
    // Need a space prefix for the context line.
    // Rebuild with correct format:
    const diff2 = parseUnifiedDiff([
      '@@ -6,1 +6,2 @@',
      '       <h1>Welcome</h1>',  // 7 leading spaces (6 + the space prefix)
      '+      <h2>Subtitle</h2>',
    ].join('\n'));
    // Actually the diff prefix is one char only; everything after is body.
    // Let me re-construct: context line = ' ' + '      <h1>Welcome</h1>'
    const diffFinal = parseUnifiedDiff([
      '@@ -6,1 +6,2 @@',
      '      <h1>Welcome</h1>',                // space + 6-space-indented body (line 6 in file)
      '+      <h2>Subtitle</h2>',              // addition (becomes new line 7)
    ].join('\n'));
    // Build manually with correct prefix
    const space = ' ';
    const diffBuilt = parseUnifiedDiff([
      '@@ -6,1 +6,2 @@',
      space + '      <h1>Welcome</h1>',
      '+      <h2>Subtitle</h2>',
    ].join('\n'));
    const r = applyDiff(SIMPLE_FILE, diffBuilt);
    expect(r.ok).toBe(true);
    expect(r.content).toContain('<h2>Subtitle</h2>');
    // h1 still present
    expect(r.content).toContain('<h1>Welcome</h1>');
  });

  it('returns ok:false when context lines do not match (hunk_does_not_apply)', () => {
    const diff = parseUnifiedDiff([
      '@@ -7,1 +7,1 @@',
      '-      <p>NONEXISTENT.</p>',
      '+      <p>replacement.</p>',
    ].join('\n'));
    const r = applyDiff(SIMPLE_FILE, diff);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^hunk_does_not_apply/);
  });

  it('tolerates ±3 line drift in oldStart', () => {
    // The actual line is at 7; we pretend it's at 10. Drift tolerance
    // should locate it.
    const diff = parseUnifiedDiff([
      '@@ -10,1 +10,1 @@',
      '-      <p>Old description.</p>',
      '+      <p>Drifted match.</p>',
    ].join('\n'));
    const r = applyDiff(SIMPLE_FILE, diff);
    expect(r.ok).toBe(true);
    expect(r.content).toContain('<p>Drifted match.</p>');
  });

  it('computes changeRatio correctly', () => {
    const diff = parseUnifiedDiff([
      '@@ -7,1 +7,1 @@',
      '-      <p>Old description.</p>',
      '+      <p>New description.</p>',
    ].join('\n'));
    const r = applyDiff(SIMPLE_FILE, diff);
    expect(r.ok).toBe(true);
    // 1 removed + 1 added on a 12-line file (counting blank last) = 2/12 ≈ 0.167
    expect(r.stats.changeRatio).toBeGreaterThan(0.1);
    expect(r.stats.changeRatio).toBeLessThan(0.2);
  });

  it('preserves trailing newline absence', () => {
    const noTrailing = 'const a = 1;\nconst b = 2;';                    // no \n
    const diff = parseUnifiedDiff([
      '@@ -2,1 +2,1 @@',
      '-const b = 2;',
      '+const b = 3;',
    ].join('\n'));
    const r = applyDiff(noTrailing, diff);
    expect(r.ok).toBe(true);
    expect(r.content).toBe('const a = 1;\nconst b = 3;');
    expect(r.content.endsWith('\n')).toBe(false);
  });

  it('preserves trailing newline presence', () => {
    const withTrailing = 'const a = 1;\nconst b = 2;\n';
    const diff = parseUnifiedDiff([
      '@@ -2,1 +2,1 @@',
      '-const b = 2;',
      '+const b = 3;',
    ].join('\n'));
    const r = applyDiff(withTrailing, diff);
    expect(r.ok).toBe(true);
    expect(r.content).toBe('const a = 1;\nconst b = 3;\n');
  });
});

describe('validateDiff — preserve rules', () => {
  it('rejects diff that removes an import line', () => {
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,1 @@',
      '-import React from "react";',
      '+import React, { useState } from "react";',
    ].join('\n'));
    const r = validateDiff(parsed, { original: SIMPLE_FILE });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('preserve_violation');
    expect(r.category).toBe('import');
  });

  it('rejects diff that removes an export line', () => {
    const parsed = parseUnifiedDiff([
      '@@ -3,1 +3,1 @@',
      '-export default function Hero() {',
      '+export function Hero() {',
    ].join('\n'));
    const r = validateDiff(parsed, { original: SIMPLE_FILE });
    expect(r.ok).toBe(false);
    expect(r.category).toBe('import');                       // matched as export
  });

  it('rejects diff that removes a fetch() call', () => {
    const file = ['const a = 1;', 'fetch("/api/x");', 'export {};'].join('\n');
    const parsed = parseUnifiedDiff([
      '@@ -2,1 +2,1 @@',
      '-fetch("/api/x");',
      '+fetch("/api/y");',
    ].join('\n'));
    const r = validateDiff(parsed, { original: file });
    expect(r.ok).toBe(false);
    expect(r.category).toBe('fetch_call');
  });

  it('rejects diff that removes a URL literal', () => {
    const file = ['const URL = "https://api.example.com/v1";', 'export const x = 1;'].join('\n');
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,1 @@',
      '-const URL = "https://api.example.com/v1";',
      '+const URL = "https://api.evil.com/v1";',
    ].join('\n'));
    const r = validateDiff(parsed, { original: file });
    expect(r.ok).toBe(false);
    expect(r.category).toBe('url_literal');
  });

  it('rejects diff that removes a <Route ...> declaration', () => {
    const file = ['<Route path="/x" element={<X />} />'].join('\n');
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,1 @@',
      '-<Route path="/x" element={<X />} />',
      '+<Route path="/y" element={<Y />} />',
    ].join('\n'));
    const r = validateDiff(parsed, { original: file });
    expect(r.ok).toBe(false);
    expect(r.category).toBe('route_decl');
  });

  it('rejects diff that exceeds maxChangeRatio', () => {
    const file = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    const removals = Array.from({ length: 8 }, (_, i) => `-line ${i}`).join('\n');
    const additions = Array.from({ length: 8 }, (_, i) => `+new ${i}`).join('\n');
    const parsed = parseUnifiedDiff(`@@ -1,8 +1,8 @@\n${removals}\n${additions}`);
    const r = validateDiff(parsed, { original: file, maxChangeRatio: 0.25 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('change_ratio_exceeded');
    expect(r.ratio).toBeGreaterThan(0.25);
  });

  it('accepts a clean small diff that touches no preserve patterns', () => {
    const parsed = parseUnifiedDiff([
      '@@ -7,1 +7,1 @@',
      '-      <p>Old description.</p>',
      '+      <p>New description.</p>',
    ].join('\n'));
    const r = validateDiff(parsed, { original: SIMPLE_FILE });
    expect(r.ok).toBe(true);
  });

  it('accepts adding new lines without removing preserve patterns', () => {
    const parsed = parseUnifiedDiff([
      '@@ -7,1 +7,2 @@',
      '       <p>Old description.</p>',                     // context (note the space prefix)
      '+      <p>New paragraph added.</p>',
    ].join('\n'));
    const r = validateDiff(parsed, { original: SIMPLE_FILE });
    expect(r.ok).toBe(true);
  });
});

describe('applyAndValidate — end-to-end', () => {
  it('clean diff applies + passes validation', () => {
    const diffText = [
      '@@ -7,1 +7,1 @@',
      '-      <p>Old description.</p>',
      '+      <p>New description.</p>',
    ].join('\n');
    const r = applyAndValidate({ original: SIMPLE_FILE, diffText });
    expect(r.ok).toBe(true);
    expect(r.content).toContain('<p>New description.</p>');
    expect(r.stats.hunks).toBe(1);
  });

  it('non-applying diff is rejected with verbatim reason', () => {
    const diffText = [
      '@@ -7,1 +7,1 @@',
      '-      <p>NONEXISTENT line.</p>',
      '+      <p>replacement.</p>',
    ].join('\n');
    const r = applyAndValidate({ original: SIMPLE_FILE, diffText });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^hunk_does_not_apply/);
  });

  it('import-touching diff is rejected with category', () => {
    const diffText = [
      '@@ -1,1 +1,1 @@',
      '-import React from "react";',
      '+import * as React from "react";',
    ].join('\n');
    const r = applyAndValidate({ original: SIMPLE_FILE, diffText });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('preserve_violation');
    expect(r.category).toBe('import');
  });

  it('oversized diff is rejected', () => {
    const file = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    const removals = Array.from({ length: 10 }, (_, i) => `-line ${i}`).join('\n');
    const additions = Array.from({ length: 10 }, (_, i) => `+new ${i}`).join('\n');
    const diffText = `@@ -1,10 +1,10 @@\n${removals}\n${additions}`;
    const r = applyAndValidate({ original: file, diffText, opts: { maxChangeRatio: 0.25 } });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('change_ratio_exceeded');
  });

  it('garbage diff (no hunks) rejected with parse_failed', () => {
    const r = applyAndValidate({ original: SIMPLE_FILE, diffText: 'this is not a diff' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/^parse_failed:/);
  });
});

describe('buildDiffPrompt', () => {
  it('contains the strict diff requirements + file content', () => {
    const p = buildDiffPrompt({
      filePath: 'src/Hero.jsx',
      fileContent: SIMPLE_FILE,
      issue: 'replace placeholder copy',
      fix: 'change Old description to New description',
    });
    expect(p).toMatch(/Return ONLY a unified diff/);
    expect(p).toMatch(/DO NOT remove or modify any line that contains/);
    expect(p).toMatch(/import \/ export \/ require/);
    expect(p).toMatch(/fetch\(\)/);
    expect(p).toMatch(/<Route\b/);
    expect(p).toContain('src/Hero.jsx');
    expect(p).toContain('<p>Old description.</p>');
  });
});

// ── D37 — Added-import resolution ──────────────────────────────────────

import {
  validateAddedImports,
  resolveRelativeSpec,
} from '../../../src/lib/agents/renewal/diffEditor.js';

describe('resolveRelativeSpec', () => {
  it('resolves ./Foo from src/X/Y.jsx → src/X/Foo', () => {
    expect(resolveRelativeSpec('./Foo', 'src/X/Y.jsx')).toBe('src/X/Foo');
  });

  it('resolves ../Foo from src/X/Y/Z.jsx → src/X/Foo', () => {
    expect(resolveRelativeSpec('../Foo', 'src/X/Y/Z.jsx')).toBe('src/X/Foo');
  });

  it('resolves ../../shared from a/b/c/d.jsx → a/shared', () => {
    expect(resolveRelativeSpec('../../shared', 'a/b/c/d.jsx')).toBe('a/shared');
  });

  it('returns null for bare specs (not relative)', () => {
    expect(resolveRelativeSpec('react', 'src/X.jsx')).toBeNull();
    expect(resolveRelativeSpec('@scope/pkg', 'src/X.jsx')).toBeNull();
  });
});

describe('validateAddedImports — D37 symmetric import resolution', () => {
  it('accepts a +import that resolves in fileInventory (with .jsx extension probe)', () => {
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,2 @@',
      ' export default function X() {}',
      "+import Foo from './Foo';",
    ].join('\n'));
    const r = validateAddedImports(parsed, {
      importerFilePath: 'src/components/X.jsx',
      fileInventory: ['src/components/Foo.jsx', 'src/components/X.jsx'],
    });
    expect(r.ok).toBe(true);
  });

  it('rejects a +import to a non-existent relative file (the MyPregLife D36 case)', () => {
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,2 @@',
      ' export default function HomeScreen() {}',
      "+import OnboardingWizard from '../OnboardingWizard';",
    ].join('\n'));
    const r = validateAddedImports(parsed, {
      importerFilePath: 'src/components/birthsafe/screens/HomeScreen.jsx',
      fileInventory: ['src/components/birthsafe/screens/HomeScreen.jsx'],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('added_import_unresolved');
    expect(r.spec).toBe('../OnboardingWizard');
    expect(r.resolved).toBe('src/components/birthsafe/OnboardingWizard');
  });

  it('accepts +import for a bare spec that is in knownPackages (react)', () => {
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,2 @@',
      ' const x = 1;',
      "+import React from 'react';",
    ].join('\n'));
    const r = validateAddedImports(parsed, {
      knownPackages: ['react', 'react-dom'],
    });
    expect(r.ok).toBe(true);
  });

  it('accepts +import for a bare spec subpath (lodash/x)', () => {
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,2 @@',
      ' const x = 1;',
      "+import map from 'lodash/map';",
    ].join('\n'));
    const r = validateAddedImports(parsed, {
      knownPackages: ['lodash'],
    });
    expect(r.ok).toBe(true);
  });

  it('rejects +import for a bare spec NOT in knownPackages', () => {
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,2 @@',
      ' const x = 1;',
      "+import x from 'nonexistent-pkg';",
    ].join('\n'));
    const r = validateAddedImports(parsed, {
      knownPackages: ['react'],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('added_import_unknown_package');
    expect(r.pkgName).toBe('nonexistent-pkg');
  });

  it('accepts +import for scoped package present in knownPackages (@scope/pkg)', () => {
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,2 @@',
      ' const x = 1;',
      "+import x from '@supabase/supabase-js';",
    ].join('\n'));
    const r = validateAddedImports(parsed, {
      knownPackages: ['@supabase/supabase-js'],
    });
    expect(r.ok).toBe(true);
  });

  it('skips protocol imports (node:, http(s):, data:)', () => {
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,4 @@',
      ' const x = 1;',
      "+import crypto from 'node:crypto';",
      "+import 'data:text/plain,hi';",
      "+import 'http://example.com/script';",
    ].join('\n'));
    const r = validateAddedImports(parsed, {
      knownPackages: ['react'],
    });
    expect(r.ok).toBe(true);
  });

  it('handles side-effect imports (import "./styles.css")', () => {
    const parsedOk = parseUnifiedDiff([
      '@@ -1,1 +1,2 @@',
      ' const x = 1;',
      "+import './styles.css';",
    ].join('\n'));
    const ok = validateAddedImports(parsedOk, {
      importerFilePath: 'src/components/X.jsx',
      fileInventory: ['src/components/X.jsx', 'src/components/styles.css'],
    });
    expect(ok.ok).toBe(true);

    const parsedBad = parseUnifiedDiff([
      '@@ -1,1 +1,2 @@',
      ' const x = 1;',
      "+import './missing.css';",
    ].join('\n'));
    const bad = validateAddedImports(parsedBad, {
      importerFilePath: 'src/components/X.jsx',
      fileInventory: ['src/components/X.jsx'],
    });
    expect(bad.ok).toBe(false);
    expect(bad.spec).toBe('./missing.css');
  });

  it('handles require() spec resolution (CJS path)', () => {
    const parsedBad = parseUnifiedDiff([
      '@@ -1,1 +1,2 @@',
      ' const x = 1;',
      "+const Foo = require('./missing');",
    ].join('\n'));
    const bad = validateAddedImports(parsedBad, {
      importerFilePath: 'src/X.js',
      fileInventory: ['src/X.js'],
    });
    expect(bad.ok).toBe(false);
    expect(bad.spec).toBe('./missing');
  });

  it('back-compat: no inventory and no packages supplied → ok:true (no-op)', () => {
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,2 @@',
      ' const x = 1;',
      "+import x from 'literally-anything';",
    ].join('\n'));
    expect(validateAddedImports(parsed, {}).ok).toBe(true);
  });

  it('returns added_import_no_inventory when relative spec exists but inventory missing', () => {
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,2 @@',
      ' const x = 1;',
      "+import x from './missing';",
    ].join('\n'));
    const r = validateAddedImports(parsed, {
      importerFilePath: 'src/X.jsx',
      knownPackages: ['react'],   // packages supplied but inventory is not
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('added_import_no_inventory');
  });

  it('probes /index.{js,jsx,ts,tsx} for directory-style imports', () => {
    const parsed = parseUnifiedDiff([
      '@@ -1,1 +1,2 @@',
      ' const x = 1;',
      "+import Foo from './Foo';",
    ].join('\n'));
    const r = validateAddedImports(parsed, {
      importerFilePath: 'src/X.jsx',
      fileInventory: ['src/X.jsx', 'src/Foo/index.jsx'],
    });
    expect(r.ok).toBe(true);
  });
});

describe('validateDiff — D37 import-resolution wired through', () => {
  // Pad the file so the 1-line addition stays under the 25% ratio cap.
  const padding = Array.from({ length: 30 }, (_, i) => `// pad ${i}`).join('\n');

  it('rejects diff that introduces an unresolved relative import (full pipeline)', () => {
    const file = `${padding}\nexport default function X() { return null; }\n`;
    const parsed = parseUnifiedDiff([
      '@@ -31,1 +31,2 @@',
      "+import Missing from '../Missing';",
      ' export default function X() { return null; }',
    ].join('\n'));
    const r = validateDiff(parsed, {
      original: file,
      importerFilePath: 'src/components/X.jsx',
      fileInventory: ['src/components/X.jsx'],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('added_import_unresolved');
  });

  it('back-compat: validateDiff without fileInventory/knownPackages does NOT run the import check', () => {
    const file = `${padding}\nexport default function X() { return null; }\n`;
    const parsed = parseUnifiedDiff([
      '@@ -31,1 +31,2 @@',
      "+import Missing from '../Missing';",
      ' export default function X() { return null; }',
    ].join('\n'));
    // No inventory supplied → import check is skipped; only the
    // existing rules fire. The +import line doesn't trigger any
    // PRESERVE_PATTERNS removal (this is an ADDITION, not removal),
    // and the change ratio is small → ok:true.
    expect(validateDiff(parsed, { original: file }).ok).toBe(true);
  });
});

describe('applyAndValidate — D37 import-resolution surface', () => {
  it('returns the unresolved-import envelope verbatim through applyAndValidate', () => {
    const padding = Array.from({ length: 30 }, (_, i) => `// pad ${i}`).join('\n');
    const file = `${padding}\nexport default function X() { return null; }\n`;
    const diffText = [
      '@@ -31,1 +31,2 @@',
      "+import Missing from '../Missing';",
      ' export default function X() { return null; }',
    ].join('\n');
    const r = applyAndValidate({
      original: file, diffText,
      opts: {
        importerFilePath: 'src/components/X.jsx',
        fileInventory: ['src/components/X.jsx'],
      },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('added_import_unresolved');
    expect(r.spec).toBe('../Missing');
    expect(r.resolved).toBe('src/Missing');
  });
});
