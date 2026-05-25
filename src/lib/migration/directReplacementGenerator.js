const DEFAULT_CONFIDENCE_THRESHOLD = 0.8;

function normalizeSlash(value) {
  return String(value || '').replace(/\\/g, '/');
}

function isForbiddenPath(file) {
  const normalized = normalizeSlash(file).toLowerCase();
  return (
    normalized.includes('/prisma/') ||
    normalized.includes('/drizzle/') ||
    normalized.includes('/migrations/') ||
    normalized.includes('/auth/') ||
    normalized.includes('/authorization/') ||
    normalized.endsWith('schema.prisma') ||
    normalized.endsWith('schema.sql') ||
    normalized.endsWith('database.schema.js') ||
    normalized.endsWith('database.schema.ts')
  );
}

function normalizeFiles(files = []) {
  const entries = files instanceof Map
    ? Array.from(files.entries()).map(([file, content]) => ({ file, content }))
    : files;

  return new Map(entries.map((entry) => {
    if (typeof entry === 'string') {
      return [normalizeSlash(entry), ''];
    }
    return [normalizeSlash(entry.file || entry.path), entry.content || ''];
  }));
}

function groupFindingsByFile(manifest = []) {
  const grouped = new Map();
  for (const finding of manifest) {
    const file = normalizeSlash(finding.file);
    const existing = grouped.get(file) || [];
    existing.push(finding);
    grouped.set(file, existing);
  }
  return grouped;
}

function standardEnvName(match, platform) {
  const upperPlatform = String(platform || 'PLATFORM').toUpperCase();
  return match
    .replace(new RegExp(`VITE_${upperPlatform}_`, 'gi'), 'VITE_STANDALONE_')
    .replace(new RegExp(`NEXT_PUBLIC_${upperPlatform}_`, 'gi'), 'NEXT_PUBLIC_STANDALONE_')
    .replace(/VITE_BASE44_/g, 'VITE_STANDALONE_')
    .replace(/NEXT_PUBLIC_BASE44_/g, 'NEXT_PUBLIC_STANDALONE_');
}

function removeSdkImportLine(content, finding) {
  const escapedMatch = finding.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const linePattern = new RegExp(`^.*${escapedMatch}.*(?:\\r?\\n|$)`, 'm');
  const replacement = [
    'const createStandalonePlatformClient = ({ baseUrl, headers = {} } = {}) => ({',
    '  async request(path, options = {}) {',
    '    const response = await fetch(`${baseUrl || ""}${path}`, {',
    '      ...options,',
    '      headers: { ...headers, ...(options.headers || {}) },',
    '    });',
    '    if (!response.ok) throw new Error(`Standalone API request failed: ${response.status}`);',
    '    return response.json();',
    '  },',
    '});',
    '',
  ].join('\n');
  return content.replace(linePattern, replacement);
}

function replaceApiCall(content, finding) {
  return content.replace(
    finding.match,
    "import.meta.env.VITE_STANDALONE_API_BASE_URL",
  );
}

function replaceEnvVar(content, finding) {
  return content.replaceAll(finding.match, standardEnvName(finding.match, finding.platform));
}

function replaceConfigRef(content, finding) {
  if (/base44Client/i.test(finding.match)) {
    return content.replaceAll('base44Client', 'standalonePlatformClient');
  }
  return content;
}

function applyFinding(content, finding) {
  if (finding.type === 'SDK_IMPORT') return removeSdkImportLine(content, finding);
  if (finding.type === 'API_CALL') return replaceApiCall(content, finding);
  if (finding.type === 'ENV_VAR') return replaceEnvVar(content, finding);
  if (finding.type === 'CONFIG_REF') return replaceConfigRef(content, finding);
  return content;
}

function buildReviewResult({ file, originalContent, findings, reason }) {
  const maxConfidence = findings.reduce((max, finding) => Math.max(max, finding.confidence || 0), 0);
  return {
    file,
    originalContent,
    replacementContent: null,
    confidence: maxConfidence,
    replacementStrategy: findings[0]?.replacement_strategy || 'AUTH_STANDARD',
    requiresHumanReview: true,
    reason,
  };
}

export function generateDirectReplacements({
  manifest = [],
  files = [],
  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
} = {}) {
  const filesByName = normalizeFiles(files);
  const grouped = groupFindingsByFile(manifest);
  const results = [];

  for (const [file, findings] of grouped.entries()) {
    const originalContent = filesByName.get(file) || '';
    if (isForbiddenPath(file)) {
      results.push(buildReviewResult({ file, originalContent, findings, reason: 'FORBIDDEN_PATH' }));
      continue;
    }

    if (findings.some((finding) => finding.type === 'AUTH_GATE')) {
      results.push(buildReviewResult({ file, originalContent, findings, reason: 'AUTH_GATE_REQUIRES_HUMAN_REVIEW' }));
      continue;
    }

    if (findings.some((finding) => (finding.confidence || 0) < confidenceThreshold)) {
      results.push(buildReviewResult({ file, originalContent, findings, reason: 'CONFIDENCE_BELOW_THRESHOLD' }));
      continue;
    }

    const replacementContent = findings.reduce(
      (content, finding) => applyFinding(content, finding),
      originalContent,
    );

    results.push({
      file,
      originalContent,
      replacementContent,
      confidence: Math.min(...findings.map((finding) => finding.confidence || 0)),
      replacementStrategy: findings[0]?.replacement_strategy || 'REST_API',
      requiresHumanReview: false,
    });
  }

  return results;
}

export const __directReplacementGeneratorInternals = {
  isForbiddenPath,
};
