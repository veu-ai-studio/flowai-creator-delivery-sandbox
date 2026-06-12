// src/lib/sourceMapping/registeredRepoSourceMapper.js
//
// U4 — Registered repo source analysis.
// Maps evaluator/remediation findings to concrete repo files using only
// the real GitHub Trees API inventory. No invented paths.

'use strict';

import {
  OBSERVED_URL_FIELDS,
  hostnamesFromOptions,
  matchesActiveHost,
  observedLocationEvidenceForFinding,
  observedLocationForFinding,
  urlFieldIsObserved,
} from './observedUrlEvidence.js';

const SOURCE_EXT_RE = /\.(?:tsx|jsx|ts|js|css|scss|html)$/i;
const STYLE_EXT_RE = /\.(?:css|scss)$/i;
const ROUTE_SOURCE_RE = /\.(?:tsx|jsx|ts|js)$/i;

const ROOT_FALLBACKS = Object.freeze([
  'src/App.jsx',
  'src/App.tsx',
  'src/main.jsx',
  'src/main.tsx',
  'src/Layout.jsx',
  'src/Layout.tsx',
  'index.html',
]);

const CATEGORY_HINTS = Object.freeze({
  'axe:color-contrast': 'style',
  'lighthouse:color-contrast': 'style',
  'color-contrast-violation': 'style',
  'axe:meta-viewport': 'html',
  'lighthouse:viewport': 'html',
  'missing-viewport-meta': 'html',
  'lighthouse:meta-description': 'html',
  'missing-meta-description': 'html',
  'lighthouse:html-has-lang': 'html',
  'missing-lang-attribute': 'html',
  'axe:image-alt': 'route',
  'image-missing-alt': 'route',
  'axe:button-name': 'route',
  'axe:link-name': 'route',
  'missing-aria-label': 'route',
  'network:http_404': 'route',
  'console-error-404': 'route',
  'network-failure': 'route',
});

function cleanToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function lastPathToken(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  const first = trimmed.split(/\s+/)[0];
  try {
    const u = new URL(first);
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts.pop();
    return last ? cleanToken(last.replace(/\.[a-z0-9]+$/i, '')) : null;
  } catch {
    const parts = trimmed.split(/[/?#:\s]+/).filter(Boolean);
    const last = parts.pop();
    return last ? cleanToken(last.replace(/\.[a-z0-9]+$/i, '')) : null;
  }
}

function addRouteTokenFromValue(out, value, activeHosts) {
  if (typeof value !== 'string' || !value.trim()) return;
  if (!matchesActiveHost(value, activeHosts)) return;
  const token = lastPathToken(value);
  if (token && token !== 'http' && token !== 'https') out.add(token);
}

function routeTokensFromFinding(finding, options = {}) {
  const out = new Set();
  const activeHosts = hostnamesFromOptions(options);
  for (const field of [...OBSERVED_URL_FIELDS, 'url']) {
    if (urlFieldIsObserved(finding, field)) {
      addRouteTokenFromValue(out, finding?.[field], activeHosts);
    }
  }
  for (const field of ['target', 'selector', 'route']) {
    addRouteTokenFromValue(out, finding?.[field], activeHosts);
  }
  for (const field of ['message', 'description', 'evidence']) {
    const text = typeof finding?.[field] === 'string' ? finding[field] : '';
    for (const m of text.matchAll(/https?:\/\/[^\s"')]+|\/[a-z0-9][a-z0-9._/-]{1,80}(?:[/?#\s"')]|$)/gi)) {
      const raw = m[0].trim().replace(/[.,;]+$/, '');
      if (!matchesActiveHost(raw, activeHosts)) continue;
      const token = lastPathToken(raw);
      if (token && token !== 'http' && token !== 'https') out.add(token);
    }
  }
  return [...out].filter((t) => t.length >= 2);
}

function basenameToken(filePath) {
  const base = String(filePath).split('/').pop() ?? '';
  return cleanToken(base.replace(/\.[^.]+$/, ''));
}

function addCandidate(candidates, filePath, score, reason, signals = []) {
  if (!filePath || score <= 0) return;
  const prev = candidates.get(filePath);
  if (!prev || score > prev.score) {
    candidates.set(filePath, { filePath, score, reason, signals });
  }
}

export function mapFindingToSource({ finding, repoFileList, activeTargetUrl, observedHostnames } = {}) {
  const files = Array.isArray(repoFileList)
    ? repoFileList.filter((p) => typeof p === 'string' && SOURCE_EXT_RE.test(p))
    : [];
  const category = String(finding?.category ?? '').toLowerCase();
  const strategy = String(finding?.remediationStrategy ?? '').toLowerCase();
  const candidates = new Map();

  if (files.length === 0) {
    return Object.freeze({
      mapped: false,
      selectedFilePath: null,
      confidence: 0,
      reason: 'repo_file_inventory_unavailable',
      candidates: [],
      findingId: finding?.id ?? null,
      category: finding?.category ?? null,
      severity: finding?.severity ?? null,
      mappingStrategyVersion: 'u4.1',
    });
  }

  const explicitPath = finding?.filePath ?? finding?.file_path ?? finding?.path;
  if (typeof explicitPath === 'string' && files.includes(explicitPath)) {
    addCandidate(candidates, explicitPath, 0.98, 'finding_declared_existing_file_path', ['explicit_file_path']);
  }

  const hint = CATEGORY_HINTS[category]
    ?? (strategy === 'css-contrast-adjust' ? 'style'
      : strategy.startsWith('inject-') ? 'html'
        : 'route');

  if (hint === 'style') {
    for (const f of files.filter((p) => STYLE_EXT_RE.test(p)).slice(0, 5)) {
      addCandidate(candidates, f, 0.72, 'category_prefers_stylesheet', ['category_style_hint']);
    }
  }

  if (hint === 'html') {
    for (const p of ['index.html', 'src/index.html']) {
      if (files.includes(p)) addCandidate(candidates, p, 0.8, 'category_prefers_html_document_root', ['category_html_hint']);
    }
  }

  if (hint === 'route') {
    const tokens = routeTokensFromFinding(finding, { activeTargetUrl, observedHostnames });
    for (const token of tokens) {
      for (const f of files.filter((p) => ROUTE_SOURCE_RE.test(p))) {
        const lower = f.toLowerCase();
        const base = basenameToken(f);
        if (base === token) {
          addCandidate(candidates, f, 0.88, `route_token_exact_basename:${token}`, ['route_token', token]);
        } else if (base.includes(token)) {
          addCandidate(candidates, f, 0.76, `route_token_basename_contains:${token}`, ['route_token', token]);
        } else if (lower.includes(`/${token}/`) || lower.includes(`/${token}.`)) {
          addCandidate(candidates, f, 0.66, `route_token_path_contains:${token}`, ['route_token', token]);
        }
      }
    }
  }

  if (candidates.size === 0) {
    for (const p of ROOT_FALLBACKS) {
      if (files.includes(p)) {
        addCandidate(candidates, p, 0.52, 'root_surface_fallback_low_confidence', ['root_fallback']);
        break;
      }
    }
  }

  const ranked = [...candidates.values()]
    .sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath))
    .slice(0, 5)
    .map((c) => Object.freeze({
      filePath: c.filePath,
      confidence: Math.round(c.score * 100) / 100,
      reason: c.reason,
      signals: c.signals,
    }));

  const selected = ranked[0] ?? null;
  return Object.freeze({
    mapped: !!selected,
    selectedFilePath: selected?.filePath ?? null,
    confidence: selected?.confidence ?? 0,
    reason: selected?.reason ?? 'no_candidate_matched',
    candidates: ranked,
    findingId: finding?.id ?? null,
    category: finding?.category ?? null,
    severity: finding?.severity ?? null,
    location: observedLocationForFinding(finding, { activeTargetUrl, observedHostnames }),
    mappingStrategyVersion: 'u4.1',
  });
}

export function mapFindingsToSource({
  findings,
  repoFileList,
  maxFindings = 50,
  activeTargetUrl,
  observedHostnames,
} = {}) {
  const list = Array.isArray(findings) ? findings.slice(0, maxFindings) : [];
  const mappings = list.map((finding) => mapFindingToSource({
    finding,
    repoFileList,
    activeTargetUrl,
    observedHostnames,
  }));
  const mapped = mappings.filter((m) => m.mapped);
  const highConfidence = mapped.filter((m) => m.confidence >= 0.7);
  return Object.freeze({
    kind: 'registered_repo_source_mapping',
    mappingStrategyVersion: 'u4.1',
    totalFindings: list.length,
    mapped: mapped.length,
    unmapped: mappings.length - mapped.length,
    highConfidence: highConfidence.length,
    repoFilesConsidered: Array.isArray(repoFileList) ? repoFileList.length : 0,
    mappings,
  });
}

export function sourcePathForFinding({
  finding,
  sourceMappings,
  minimumConfidence = 0.7,
  activeTargetUrl,
  observedHostnames,
} = {}) {
  if (!finding || !Array.isArray(sourceMappings)) return null;
  const id = finding.id ?? null;
  const category = finding.category ?? null;
  const evidence = observedLocationEvidenceForFinding(finding, { activeTargetUrl, observedHostnames });
  const location = evidence.location;
  const match = sourceMappings.find((m) => {
    if (location && m.category === category && (m.location ?? null) === location) return true;
    if (!id || m.findingId !== id) return false;
    if (!evidence.hasActiveHostScope) return true;
    return false;
  });
  if (!match || !match.mapped || match.confidence < minimumConfidence) return null;
  return match.selectedFilePath;
}

export const __internals = Object.freeze({
  cleanToken,
  lastPathToken,
  routeTokensFromFinding,
  observedLocationForFinding,
  urlFieldIsObserved,
  hostnamesFromOptions,
  basenameToken,
  CATEGORY_HINTS,
  ROOT_FALLBACKS,
});
