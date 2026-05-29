import fs from 'node:fs/promises';
import path from 'node:path';

const PLATFORM_PATTERNS = [
  { platform: 'base44', pattern: /base44Client|@base44\/sdk|app\.base44\.com|VITE_BASE44_APP_ID|VITE_BASE44_APP_BASE_URL/g },
  { platform: 'wix', pattern: /wix-fetch|wix-data|wix-location|wix\.com\/corvid/g },
  { platform: 'webflow', pattern: /webflow\.com\/api|@webflow\/|Webflow\.push/g },
  { platform: 'bubble', pattern: /bubble\.io\/api|API Workflow|bubble-element/g },
  { platform: 'wordpress', pattern: /wp-json|wp_ajax|add_action|add_filter/g },
];

const STANDARD_THIRD_PARTY_PATTERNS = [
  /SENTRY/i,
  /sentry/i,
  /STRIPE/i,
  /stripe/i,
  /SUPABASE/i,
  /supabase/i,
  /CLERK/i,
  /clerk/i,
  /ANALYTICS/i,
  /analytics/i,
];

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.vercel']);
const SCANNABLE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.env', '.css', '.html']);
const LOCKFILE_NAMES = new Set(['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml']);

function normalizeSlash(value) {
  return String(value || '').replace(/\\/g, '/');
}

function isDatabaseSchemaFile(file) {
  const normalized = normalizeSlash(file).toLowerCase();
  return (
    normalized.includes('/prisma/') ||
    normalized.includes('/drizzle/') ||
    normalized.includes('/migrations/') ||
    normalized.endsWith('schema.prisma') ||
    normalized.endsWith('schema.sql') ||
    normalized.endsWith('database.schema.js') ||
    normalized.endsWith('database.schema.ts')
  );
}

function isGeneratedLockfile(file) {
  const normalized = normalizeSlash(file).toLowerCase();
  const fileName = normalized.split('/').pop();
  return LOCKFILE_NAMES.has(fileName);
}

function inferTypeFromMatch(match) {
  if (/requiresAuth|authGate|auth_gate|authorization|authenticate|authenticated/i.test(match)) {
    return 'AUTH_GATE';
  }
  if (/\b(VITE_|NEXT_PUBLIC_|REACT_APP_)[A-Z0-9_]+\b/.test(match)) {
    return 'ENV_VAR';
  }
  if (/import\s|from\s+['"]|require\(|@base44\/sdk|wix-(fetch|data|location)|@webflow\//.test(match)) {
    return 'SDK_IMPORT';
  }
  if (/https?:\/\/|\/api\b|wp-json|wp_ajax|API Workflow/i.test(match)) {
    return 'API_CALL';
  }
  return 'CONFIG_REF';
}

function getLineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function getMatchedLine(content, index) {
  const start = content.lastIndexOf('\n', index) + 1;
  const end = content.indexOf('\n', index);
  return content.slice(start, end === -1 ? content.length : end).trim();
}

function knownPlatformForMatch(match) {
  for (const { platform, pattern } of PLATFORM_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(match)) {
      return platform;
    }
  }
  return 'unknown';
}

function hasOnlyStandardThirdPartySignals(content) {
  return STANDARD_THIRD_PARTY_PATTERNS.some((pattern) => pattern.test(content));
}

function collectKnownFindings({ file, content }) {
  const findings = [];
  const seen = new Set();
  for (const { platform, pattern } of PLATFORM_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const text = getMatchedLine(content, match.index) || match[0];
      const key = `${platform}:${getLineNumber(content, match.index)}:${text}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const type = classifyDependency(text);
      findings.push(createFinding({
        file,
        line: getLineNumber(content, match.index),
        match: text,
        type,
        platform,
        confidence: type === 'AUTH_GATE' ? 0.95 : 0.92,
      }));
    }
  }

  if (findings.length > 0) {
    const platform = findings[0].platform;
    const authPattern = /requiresAuth\s*[:=]\s*true|authGate|platformAuth|authorization\s*[:=]/gi;
    let authMatch;
    while ((authMatch = authPattern.exec(content)) !== null) {
      findings.push(createFinding({
        file,
        line: getLineNumber(content, authMatch.index),
        match: authMatch[0],
        type: 'AUTH_GATE',
        platform,
        confidence: 0.95,
      }));
    }
  }

  return findings;
}

function collectUnknownFindings({ file, content }) {
  if (hasOnlyStandardThirdPartySignals(content)) {
    return [];
  }

  const sdkMatch = content.match(/\b(createClient|create[A-Z][A-Za-z]*Client|new\s+[A-Z][A-Za-z]*SDK)\s*\(/);
  const envMatch = content.match(/\b(VITE_[A-Z0-9]+_APP_ID|VITE_[A-Z0-9]+_BASE_URL|NEXT_PUBLIC_[A-Z0-9]+_APP_ID)\b/);
  const apiMatch = content.match(/https?:\/\/(?!api\.stripe\.com|.*supabase\.co|.*sentry\.io|.*clerk\.com)[A-Za-z0-9.-]+\/(?:api|v\d|graphql)\b/);

  if (!sdkMatch || !envMatch || !apiMatch) {
    return [];
  }

  return [sdkMatch, envMatch, apiMatch].map((match) => createFinding({
    file,
    line: getLineNumber(content, match.index),
    match: match[0],
    type: classifyDependency(match[0]),
    platform: 'unknown',
    confidence: 0.72,
  }));
}

function createFinding({ file, line, match, type, platform, confidence }) {
  const replacement_strategy = mapReplacementStrategy(type, platform);
  return {
    file: normalizeSlash(file),
    line,
    match,
    type,
    platform,
    replacement_strategy,
    confidence,
    autoReplaceable: confidence >= 0.8 && type !== 'AUTH_GATE',
  };
}

async function listRepoFiles(repoPath) {
  const results = [];

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          await walk(path.join(currentPath, entry.name));
        }
        continue;
      }
      const fullPath = path.join(currentPath, entry.name);
      const ext = path.extname(entry.name);
      if (SCANNABLE_EXTENSIONS.has(ext) || entry.name.startsWith('.env')) {
        results.push({
          file: normalizeSlash(path.relative(repoPath, fullPath)),
          absolutePath: fullPath,
        });
      }
    }
  }

  await walk(repoPath);
  return results;
}

function normalizeFileInput(fileEntry) {
  if (typeof fileEntry === 'string') {
    return { file: fileEntry, absolutePath: fileEntry };
  }
  return {
    file: fileEntry.file || fileEntry.path || fileEntry.relativePath || fileEntry.absolutePath,
    absolutePath: fileEntry.absolutePath || fileEntry.path || fileEntry.file,
    content: fileEntry.content,
  };
}

export function detectPlatform(fileContent = '') {
  for (const { platform, pattern } of PLATFORM_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(fileContent)) {
      return platform;
    }
  }

  return 'unknown';
}

export function classifyDependency(match = '') {
  return inferTypeFromMatch(match);
}

export function mapReplacementStrategy(type) {
  if (type === 'SDK_IMPORT' || type === 'API_CALL') return 'REST_API';
  if (type === 'ENV_VAR' || type === 'CONFIG_REF') return 'ENV_STANDARD';
  return 'AUTH_STANDARD';
}

export async function scanPlatformDependencies({ repoPath, files, readFile = fs.readFile } = {}) {
  const fileInputs = files
    ? files.map(normalizeFileInput)
    : await listRepoFiles(repoPath);

  const manifest = [];
  for (const fileInput of fileInputs) {
    const relativeFile = normalizeSlash(repoPath && fileInput.absolutePath
      ? path.relative(repoPath, fileInput.absolutePath)
      : fileInput.file);

    if (!relativeFile || isDatabaseSchemaFile(relativeFile) || isGeneratedLockfile(relativeFile)) {
      continue;
    }

    const content = fileInput.content ?? await readFile(fileInput.absolutePath || fileInput.file, 'utf8');
    manifest.push(
      ...collectKnownFindings({ file: relativeFile, content }),
      ...collectUnknownFindings({ file: relativeFile, content }),
    );
  }

  return manifest;
}

export const __platformDependencyMapperInternals = {
  isDatabaseSchemaFile,
  isGeneratedLockfile,
};
