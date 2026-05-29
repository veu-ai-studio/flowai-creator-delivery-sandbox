import { classifyMigrationWriteTarget } from '../migration/migrationWriteAllowlist.js';
import { SOURCE_MAPPING_STATUSES } from './sourceMappingConstants.js';

function normalizePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function basename(filePath) {
  return normalizePath(filePath).split('/').pop() || '';
}

function topLevelImportsPlatformSdk(sourceText) {
  if (typeof sourceText !== 'string' || !sourceText.trim()) return false;
  return sourceText
    .split(/\r?\n/)
    .slice(0, 40)
    .some((line) => /^\s*import\b/.test(line) && /@base44|base44|platform-sdk|sdk-client/i.test(line));
}

function isPlatformBoundaryPath(filePath) {
  const file = normalizePath(filePath);
  const name = basename(file);
  return (
    /^src\/api\/base44Client\.(js|jsx|ts|tsx)$/i.test(file) ||
    /base44/i.test(file) ||
    /platform-sdk/i.test(file) ||
    /sdk-client/i.test(file) ||
    /base44/i.test(name) ||
    /platform-sdk/i.test(name) ||
    /sdk-client/i.test(name)
  );
}

function humanReviewReason(allowlistReason) {
  switch (allowlistReason) {
    case 'AUTH_SESSION_PROVIDER_FILE':
      return 'AUTH_SESSION_PROVIDER_FILE';
    case 'CONFIG_FILE':
      return 'CONFIG_FILE';
    case 'PACKAGE_OR_LOCKFILE':
      return 'PACKAGE_OR_LOCKFILE';
    case 'FRAMEWORK_BOUNDARY_FILE':
      return 'FRAMEWORK_BOUNDARY_FILE';
    case 'GENERATED_FILE':
      return 'PLATFORM_GENERATED_FILE';
    default:
      return allowlistReason || 'HUMAN_REVIEW_REQUIRED';
  }
}

export function classifyFileBoundary(filePath, { sourceText } = {}) {
  const file = normalizePath(filePath);

  if (!file) {
    return Object.freeze({
      file,
      status: SOURCE_MAPPING_STATUSES.SOURCE_MAP_INCOMPLETE,
      allowed: false,
      reason: 'MISSING_SELECTED_FILE_PATH',
    });
  }

  if (isPlatformBoundaryPath(file) || topLevelImportsPlatformSdk(sourceText)) {
    return Object.freeze({
      file,
      status: SOURCE_MAPPING_STATUSES.PLATFORM_BOUNDARY_BLOCKED,
      allowed: false,
      reason: isPlatformBoundaryPath(file) ? 'PLATFORM_BOUNDARY_FILE' : 'PLATFORM_SDK_IMPORT',
    });
  }

  const allowlist = classifyMigrationWriteTarget(file);
  if (!allowlist.allowed) {
    return Object.freeze({
      file,
      status: SOURCE_MAPPING_STATUSES.HUMAN_REVIEW_REQUIRED,
      allowed: false,
      reason: humanReviewReason(allowlist.reason),
      allowlistReason: allowlist.reason,
    });
  }

  return Object.freeze({
    file,
    status: SOURCE_MAPPING_STATUSES.ACTIONABLE,
    allowed: true,
    reason: allowlist.reason,
  });
}

export const __internals = Object.freeze({
  normalizePath,
  isPlatformBoundaryPath,
  topLevelImportsPlatformSdk,
});
