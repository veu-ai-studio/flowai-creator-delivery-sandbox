'use strict';

export const LLM_FIX_CAPS = Object.freeze({
  maxFilesPerCall: 5,
  maxFindingsPerCall: 10,
  maxSourceCharsPerCall: 60_000,
  maxClaudeCallsPerIteration: 3,
  maxClaudeCallsPerRun: 10,
  minAutoApplyConfidence: 70,
});

export const LLM_FIX_FEATURE_DISABLED = 'LLM_FIX_FEATURE_DISABLED';
export const LLM_FIX_BUDGET_EXCEEDED = 'LLM_BUDGET_EXCEEDED';
export const LLM_LOW_CONFIDENCE = 'LOW_CONFIDENCE_REQUIRES_HUMAN_REVIEW';

const FORBIDDEN_PATH_PATTERNS = Object.freeze([
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)node_modules\//i,
  /(^|\/)(dist|build|coverage|\.next)\//i,
  /(^|\/)docs\/(audits|panel-consultations|peer-reviews)\//i,
  /(^|\/)src\/api\/base44Client\.js$/i,
  /base44.*(sdk|client|internal|config)/i,
  /(requiresAuth|auth(?:entication|orization)?[-_/]?(?:config|gate|guard|policy))/i,
  /\.(?:min|bundle)\.js$/i,
]);

const SECRET_PATTERNS = Object.freeze([
  /\bANTHROPIC_API_KEY\b/i,
  /\b(?:GITHUB|VERCEL|OPENAI|SUPABASE)_[A-Z0-9_]*TOKEN\b/i,
  /\bsk-ant-[A-Za-z0-9_-]{12,}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/-]{20,}/i,
  /-----BEGIN\s+(?:RSA|OPENSSH|PRIVATE|EC)\s+PRIVATE KEY-----/i,
  /\b(?:api[_-]?key|password|secret|token)\s*[:=]\s*['"][^'"]{8,}['"]/i,
]);

const DETERMINISTIC_FIRST_CATEGORIES = Object.freeze(new Set([
  'meta',
  'meta-description',
  'seo-meta',
  'alt-text',
  'image-alt',
  'missing-alt',
  'aria',
  'aria-label',
  'button-name',
  'link-name',
  'broken-link',
  'dead-link',
  'typo',
  'grammar',
  'css',
  'layout',
  'responsive-layout',
  'color-contrast',
  'contrast',
]));

function normalizePath(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/^\.\/+/, '');
}

export function llmFixesEnabled(env = process.env) {
  return env?.FLOWAI_ENABLE_LLM_FIXES === 'true';
}

export function isForbiddenLlmSourcePath(filePath) {
  const normalized = normalizePath(filePath);
  if (!normalized) return true;
  return FORBIDDEN_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function containsSecretLikeText(text) {
  if (typeof text !== 'string' || text.length === 0) return false;
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

export function shouldUseDeterministicRepairFirst(issue = {}) {
  const values = [
    issue.category,
    issue.type,
    issue.kind,
    issue.code,
    issue.title,
  ].filter(Boolean).map((value) => String(value).toLowerCase());
  return values.some((value) => {
    if (DETERMINISTIC_FIRST_CATEGORIES.has(value)) return true;
    return [...DETERMINISTIC_FIRST_CATEGORIES].some((category) => value.includes(category));
  });
}

export function enforceLlmFixBudget({
  files = [],
  findings = [],
  sourceChars = 0,
  iterationCalls = 0,
  runCalls = 0,
} = {}) {
  const fileCount = Array.isArray(files) ? files.length : Number(files) || 0;
  const findingCount = Array.isArray(findings) ? findings.length : Number(findings) || 0;
  const checks = [
    ['maxFilesPerCall', fileCount, LLM_FIX_CAPS.maxFilesPerCall],
    ['maxFindingsPerCall', findingCount, LLM_FIX_CAPS.maxFindingsPerCall],
    ['maxSourceCharsPerCall', sourceChars, LLM_FIX_CAPS.maxSourceCharsPerCall],
    ['maxClaudeCallsPerIteration', iterationCalls, LLM_FIX_CAPS.maxClaudeCallsPerIteration],
    ['maxClaudeCallsPerRun', runCalls, LLM_FIX_CAPS.maxClaudeCallsPerRun],
  ];
  const exceeded = checks.find(([, actual, cap]) => Number(actual) > cap);
  if (!exceeded) return Object.freeze({ ok: true, reason: null });
  const [capName, actual, cap] = exceeded;
  return Object.freeze({
    ok: false,
    reason: LLM_FIX_BUDGET_EXCEEDED,
    cap: capName,
    actual,
    limit: cap,
  });
}

function packageNameFromSpecifier(specifier) {
  if (typeof specifier !== 'string' || specifier.length === 0) return null;
  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:')) return null;
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split('/')[0];
}

export function extractBareImports(content) {
  if (typeof content !== 'string') return new Set();
  const imports = new Set();
  const patterns = [
    /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /export\s+[^'"]+\s+from\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content))) {
      const pkg = packageNameFromSpecifier(match[1]);
      if (pkg) imports.add(pkg);
    }
  }
  return imports;
}

export function validateLlmFixCandidate({
  candidate = {},
  filePath,
  allowedFiles = null,
  universalMode = false,
  existingPackageNames = null,
  originalContent = '',
  replacementContent = '',
} = {}) {
  const normalizedPath = normalizePath(filePath);
  const replacement = typeof replacementContent === 'string'
    ? replacementContent
    : (typeof candidate.fixedContent === 'string' ? candidate.fixedContent : '');

  if (universalMode) {
    return Object.freeze({ ok: false, reason: 'UNIVERSAL_MODE_SOURCE_PATCH_BLOCKED' });
  }
  if (Array.isArray(allowedFiles) && allowedFiles.length > 0) {
    const allowed = new Set(allowedFiles.map(normalizePath));
    if (!allowed.has(normalizedPath)) {
      return Object.freeze({ ok: false, reason: 'FILE_NOT_IN_ALLOWED_FILES' });
    }
  }
  if (isForbiddenLlmSourcePath(normalizedPath)) {
    return Object.freeze({
      ok: false,
      reason: 'PLATFORM_BOUNDARY_BLOCKED',
      classification: 'PLATFORM_BOUNDARY_BLOCKED',
    });
  }
  if (!replacement.trim()) {
    return Object.freeze({ ok: false, reason: 'EMPTY_REPLACEMENT' });
  }
  if (typeof candidate.rationale !== 'string' || candidate.rationale.trim().length === 0) {
    return Object.freeze({ ok: false, reason: 'MISSING_RATIONALE' });
  }
  if (Number.isFinite(candidate.confidence) && candidate.confidence < LLM_FIX_CAPS.minAutoApplyConfidence) {
    return Object.freeze({
      ok: false,
      reason: LLM_LOW_CONFIDENCE,
      requiresHumanReview: true,
    });
  }
  if (containsSecretLikeText(replacement)) {
    return Object.freeze({ ok: false, reason: 'SECRET_LIKE_CONTENT_REJECTED' });
  }

  const originalImports = extractBareImports(originalContent);
  const replacementImports = extractBareImports(replacement);
  const known = existingPackageNames instanceof Set
    ? existingPackageNames
    : new Set(Array.isArray(existingPackageNames) ? existingPackageNames : []);
  const newUnknownImports = [...replacementImports].filter((name) => (
    !originalImports.has(name) && !known.has(name)
  ));
  if (newUnknownImports.length > 0) {
    return Object.freeze({
      ok: false,
      reason: 'NEW_DEPENDENCY_REQUIRES_APPROVAL',
      dependencies: newUnknownImports,
    });
  }

  if (typeof originalContent === 'string' && originalContent.length > 500
      && replacement.length < originalContent.length * 0.5) {
    return Object.freeze({ ok: false, reason: 'UNRELATED_DELETION_RISK' });
  }

  return Object.freeze({ ok: true, reason: null });
}

export function summarizeLlmAttempt({
  model,
  findingsSentCount = 0,
  filesSentCount = 0,
  sourceCharsSent = 0,
  accepted = false,
  rejectionReason = null,
  filesChanged = [],
  validationResult = null,
  previewUrl = null,
  scoreDelta = null,
} = {}) {
  const estimatedTokens = Math.ceil(Math.max(0, Number(sourceCharsSent) || 0) / 4);
  return Object.freeze({
    model,
    findingsSentCount,
    filesSentCount,
    sourceCharsSent,
    estimatedTokens,
    accepted: !!accepted,
    rejectionReason,
    filesChanged: Array.isArray(filesChanged) ? filesChanged : [],
    validationResult,
    previewUrl,
    scoreDelta,
  });
}

export const __internals = Object.freeze({
  FORBIDDEN_PATH_PATTERNS,
  SECRET_PATTERNS,
  DETERMINISTIC_FIRST_CATEGORIES,
  normalizePath,
  packageNameFromSpecifier,
});
