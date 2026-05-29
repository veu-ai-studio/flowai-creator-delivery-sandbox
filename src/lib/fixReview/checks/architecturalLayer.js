// src/lib/fixReview/checks/architecturalLayer.js
//
// Q2: Is this the correct architectural layer? (maintainability)
//
// Signal: does a single fix span multiple architectural layers in a
// way that suggests the wrong place? E.g. a "fix" that edits BOTH a
// UI component AND a low-level library file in the same patch is
// frequently a sign that the real bug lives in the library and the
// UI edit is compensating around it.
//
// The check classifies each changed file into a layer bucket from its
// path prefix and flags when a single patch crosses more than two
// layers, or mixes UI + data-access.

'use strict';

const LAYER_RULES = Object.freeze([
  { layer: 'ui-page',        prefix: 'src/pages/' },
  { layer: 'ui-component',   prefix: 'src/components/' },
  { layer: 'ui-hook',        prefix: 'src/hooks/' },
  { layer: 'app-shell',      prefix: 'src/App.jsx' },
  { layer: 'app-shell',      prefix: 'src/main.jsx' },
  { layer: 'api-route',      prefix: 'api/' },
  { layer: 'api-route',      prefix: 'src/api/' },
  { layer: 'lib-orchestrator', prefix: 'src/lib/agents/renewal/' },
  { layer: 'lib-eval',       prefix: 'src/lib/evaluation/' },
  { layer: 'lib-remediation', prefix: 'src/lib/remediation/' },
  { layer: 'lib-verification', prefix: 'src/lib/verification/' },
  { layer: 'lib-construction', prefix: 'src/lib/construction/' },
  { layer: 'lib-scoring',    prefix: 'src/lib/scoring/' },
  { layer: 'lib-crawl',      prefix: 'src/lib/crawl/' },
  { layer: 'lib-auth',       prefix: 'src/lib/agents/auth/' },
  { layer: 'lib-shared',     prefix: 'src/lib/shared/' },
  { layer: 'lib',            prefix: 'src/lib/' },
  { layer: 'test',           prefix: 'tests/' },
  { layer: 'script',         prefix: 'scripts/' },
  { layer: 'config',         prefix: 'vercel.json' },
  { layer: 'config',         prefix: 'package.json' },
  { layer: 'config',         prefix: 'eslint.config' },
  { layer: 'docs',           prefix: 'docs/' },
]);

function classifyLayer(path) {
  if (typeof path !== 'string') return 'unknown';
  for (const rule of LAYER_RULES) {
    if (path.startsWith(rule.prefix)) return rule.layer;
  }
  return 'unknown';
}

const RISKY_PAIRS = Object.freeze([
  ['ui-page', 'lib-shared'],
  ['ui-component', 'lib-shared'],
  ['ui-page', 'api-route'],
  ['ui-component', 'api-route'],
]);

export function checkArchitecturalLayer({ diff }) {
  const files = Array.isArray(diff?.files) ? diff.files : [];
  if (files.length === 0) return { verdict: 'pass', evidence: ['no_files_changed'] };

  const layers = new Set();
  const perFile = files.map((f) => {
    const layer = classifyLayer(f.path);
    layers.add(layer);
    return { path: f.path, layer };
  });

  const distinctLayers = Array.from(layers).filter((l) => l !== 'test' && l !== 'docs' && l !== 'script');

  // Risky pair check — a fix that touches a UI page AND a deep lib is
  // a common false-fix shape (UI compensating for a library bug).
  for (const [a, b] of RISKY_PAIRS) {
    if (layers.has(a) && layers.has(b)) {
      return {
        verdict: 'warn',
        evidence: [
          `risky_layer_pair:${a}+${b}`,
          ...perFile.filter((p) => p.layer === a || p.layer === b).map((p) => `  ${p.layer}: ${p.path}`),
        ],
        suggestion: `A fix that edits ${a} and ${b} in the same patch often means the UI is compensating for a deeper bug. Confirm the lib change is the root cause; the UI edit may be unnecessary if the lib fix is correct.`,
      };
    }
  }

  if (distinctLayers.length >= 3) {
    return {
      verdict: 'warn',
      evidence: [`crosses_${distinctLayers.length}_architectural_layers: ${distinctLayers.sort().join(', ')}`],
      suggestion: 'Multi-layer patches are hard to review. Split into per-layer commits if feasible.',
    };
  }

  return {
    verdict: 'pass',
    evidence: [`layers_touched: ${distinctLayers.sort().join(', ') || 'none'}`],
  };
}

export const __internals = Object.freeze({ classifyLayer, LAYER_RULES, RISKY_PAIRS });
