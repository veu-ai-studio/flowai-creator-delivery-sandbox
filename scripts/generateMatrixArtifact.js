#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SSOT_MATRIX_PATH } from '../src/lib/config.js';
import { createOrchestratorLogger } from '../src/lib/orchestratorFramework/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'src/lib/orchestratorFramework/matrixArtifact.json');
const logger = createOrchestratorLogger('generateMatrixArtifact');

const SECTION_PATTERNS = Object.freeze({
  layer1: /^###\s+12\.1\s+/i,
  layer2: /^###\s+12\.2\s+/i,
  nextSection: /^###\s+12\.[3-9]\s+/i,
});

const DASH_SPLIT_RE = new RegExp('\\s*(?:\\u2014| - )\\s*');
const CODED_ROW_RE = new RegExp('^`([^`]+)`\\s*(?:\\u2014|-)\\s*(.+)$');
const STATUS_RE = /\b(VERIFIED|PARTIAL|STUBBED|SIMULATED|NOT_IMPLEMENTED|DEFERRED|CURRENT|IN_PROGRESS|TARGET|ROADMAP|EXPERIMENTAL|DESIGN_ONLY|PROPOSED-DEFERRED|PENDING-RATIFICATION)\b/i;
const TIER_RE = /\bTier\s*[:=-]?\s*([ABC])\b|\bTIER-([ABC])\b|\b\(([ABC])\)\b/i;
const PERSISTENCE_TERMS_RE = /\b(entity|entities|store|stored|persist|persisted|record|records|database|db|supabase|vercel kv|kv|storage)\b/i;

function normalizeMojibake(value) {
  return String(value ?? '')
    .replaceAll(String.fromCharCode(0xe2, 0x20ac, 0x201d), String.fromCharCode(0x2014))
    .replaceAll(String.fromCharCode(0xe2, 0x20ac, 0x201c), String.fromCharCode(0x2013))
    .replaceAll(String.fromCharCode(0xe2, 0x20ac, 0x2122), "'");
}

function slugify(value) {
  return normalizeMojibake(value)
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function statusFromText(value) {
  const match = normalizeMojibake(value).match(STATUS_RE);
  return match ? match[1].toUpperCase() : 'PARTIAL';
}

function tierFromText(value) {
  const match = normalizeMojibake(value).match(TIER_RE);
  return match ? (match[1] ?? match[2] ?? match[3]).toUpperCase() : null;
}

function defaultTierFromDescription(description) {
  return PERSISTENCE_TERMS_RE.test(normalizeMojibake(description)) ? 'A' : 'B';
}

function warnDefaultTier(entry) {
  logger.warn('matrix.default_tier_applied', {
    surfaceId: entry.surfaceId,
    layer: entry.layer,
    tier: entry.tier,
    reason: 'SSOT row has no Tier column; default-tier rule applied during artifact generation',
  });
}

function splitNameAndDescription(rawBody) {
  const body = normalizeMojibake(rawBody).trim();
  const pieces = body.split(DASH_SPLIT_RE).map(piece => piece.trim()).filter(Boolean);
  if (pieces.length >= 2) {
    return {
      name: pieces[0],
      description: pieces.slice(1).join(' - '),
    };
  }

  const colonIndex = body.indexOf(':');
  if (colonIndex > 0) {
    return {
      name: body.slice(0, colonIndex).trim(),
      description: body.slice(colonIndex + 1).trim(),
    };
  }

  return { name: body, description: body };
}

function parseBullet(line, layer) {
  const normalizedLine = normalizeMojibake(line);
  const rawBody = normalizedLine.replace(/^[-*]\s+/, '').trim();
  if (!rawBody) return null;

  const codeMatch = rawBody.match(CODED_ROW_RE);
  const body = codeMatch ? codeMatch[2].trim() : rawBody;
  const parsed = splitNameAndDescription(body);
  const name = parsed.name;
  const description = codeMatch ? body : parsed.description;
  const surfaceId = slugify(codeMatch ? codeMatch[1] : name);
  if (!surfaceId) return null;

  const declaredTier = tierFromText(rawBody);
  const tier = declaredTier ?? defaultTierFromDescription(`${name} ${description}`);
  const entry = {
    layer,
    surfaceId,
    name,
    description,
    status: statusFromText(rawBody),
    tier,
  };

  if (/\bPENDING-RATIFICATION\b/i.test(rawBody)) {
    entry.ratificationState = 'PENDING-RATIFICATION';
  } else if (/\bPROPOSED-DEFERRED\b/i.test(rawBody)) {
    entry.ratificationState = 'PROPOSED-DEFERRED';
  } else {
    entry.ratificationState = 'CANONICAL';
  }

  if (!declaredTier) warnDefaultTier(entry);
  return entry;
}

export function parseSsotMarkdown(markdown) {
  const normalizedMarkdown = normalizeMojibake(markdown);
  const layer1 = [];
  const layer2 = [];
  let activeLayer = null;

  for (const line of normalizedMarkdown.split(/\r?\n/)) {
    if (SECTION_PATTERNS.layer1.test(line)) {
      activeLayer = 1;
      continue;
    }
    if (SECTION_PATTERNS.layer2.test(line)) {
      activeLayer = 2;
      continue;
    }
    if (SECTION_PATTERNS.nextSection.test(line)) {
      activeLayer = null;
      continue;
    }
    if (!activeLayer || !/^[-*]\s+/.test(line.trim())) continue;

    const entry = parseBullet(line.trim(), activeLayer);
    if (!entry) continue;
    if (activeLayer === 1) layer1.push(entry);
    if (activeLayer === 2) layer2.push(entry);
  }

  const surfaceTierMap = {};
  for (const entry of [...layer1, ...layer2]) {
    if (entry.tier) surfaceTierMap[entry.surfaceId] = entry.tier;
  }

  return { layer1, layer2, surfaceTierMap };
}

function ssotVersion() {
  try {
    return execFileSync('git', ['log', '-n', '1', '--pretty=format:%h', '--', SSOT_MATRIX_PATH], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export function buildMatrixArtifact(markdown) {
  return {
    version: ssotVersion(),
    generatedAt: new Date().toISOString(),
    ...parseSsotMarkdown(markdown),
  };
}

function main() {
  const ssotPath = path.join(repoRoot, SSOT_MATRIX_PATH);
  const markdown = readFileSync(ssotPath, { encoding: 'utf8' });
  const artifact = buildMatrixArtifact(markdown);

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: 'utf8' });
  logger.info('matrix.artifact_generated', {
    outputPath: path.relative(repoRoot, outputPath),
    version: artifact.version,
    layer1: artifact.layer1.length,
    layer2: artifact.layer2.length,
    surfaceTierCount: Object.keys(artifact.surfaceTierMap).length,
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
