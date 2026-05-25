function normalizePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function basename(filePath) {
  const normalized = normalizePath(filePath);
  return normalized.split('/').pop() || '';
}

function pathSegments(filePath) {
  return normalizePath(filePath).split('/').filter(Boolean);
}

function hasSegment(filePath, pattern) {
  return pathSegments(filePath).some((segment) => pattern.test(segment));
}

function isConfigFile(filePath) {
  const name = basename(filePath);
  return (
    name.startsWith('.env') ||
    /\.config\./i.test(name) ||
    /(^|[.-])config\.(js|jsx|ts|tsx|mjs|cjs|json)$/i.test(name) ||
    hasSegment(filePath, /^config$/i)
  );
}

function isPackageOrLockfile(filePath) {
  const name = basename(filePath);
  return /^(package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|bun\.lock)$/i.test(name);
}

function isGeneratedFile(filePath) {
  const normalized = normalizePath(filePath);
  const name = basename(normalized);
  return (
    /\.(generated|gen)\./i.test(name) ||
    hasSegment(normalized, /^(__generated__|generated|gen|dist|build|coverage)$/i)
  );
}

function isAuthSessionProviderFile(filePath) {
  const normalized = normalizePath(filePath);
  const name = basename(normalized).replace(/\.[^.]+$/, '');
  return (
    hasSegment(normalized, /^(auth|authentication|session|sessions|provider|providers)$/i) ||
    /(auth|session|provider)/i.test(name)
  );
}

function isFrameworkBoundaryFile(filePath) {
  const normalized = normalizePath(filePath);
  const name = basename(normalized);
  return (
    /^(vite|next|nuxt|astro|svelte|remix|webpack|rollup|eslint|tailwind|postcss|babel|tsconfig|jsconfig)\.config\./i.test(name) ||
    /^src\/(main|App|Root|router|routes)\.(js|jsx|ts|tsx)$/i.test(normalized) ||
    /^src\/app\/(layout|template|loading|error|not-found|global-error)\.(js|jsx|ts|tsx)$/i.test(normalized)
  );
}

function isEntryPointFile(filePath) {
  const name = basename(filePath);
  return /^(entry\.(js|ts)|index\.(js|jsx|ts|tsx))$/i.test(name);
}

function isAllowedAppLayerPath(filePath) {
  const normalized = normalizePath(filePath);
  return (
    normalized.startsWith('src/components/') ||
    normalized.startsWith('src/pages/') ||
    normalized.startsWith('src/app/') ||
    normalized.startsWith('src/styles/') ||
    normalized.startsWith('src/utils/') ||
    normalized.startsWith('src/hooks/')
  );
}

export function classifyMigrationWriteTarget(filePath) {
  const file = normalizePath(filePath);

  if (!file || file.includes('../') || file.startsWith('..')) {
    return { file, allowed: false, reason: 'UNSAFE_PATH' };
  }
  if (file === 'base44' || file.startsWith('base44/') || file.includes('/base44/')) {
    return { file, allowed: false, reason: 'BASE44_DIRECTORY' };
  }
  if (isAuthSessionProviderFile(file)) {
    return { file, allowed: false, reason: 'AUTH_SESSION_PROVIDER_FILE' };
  }
  if (isConfigFile(file)) {
    return { file, allowed: false, reason: 'CONFIG_FILE' };
  }
  if (isPackageOrLockfile(file)) {
    return { file, allowed: false, reason: 'PACKAGE_OR_LOCKFILE' };
  }
  if (isFrameworkBoundaryFile(file)) {
    return { file, allowed: false, reason: 'FRAMEWORK_BOUNDARY_FILE' };
  }
  if (isGeneratedFile(file)) {
    return { file, allowed: false, reason: 'GENERATED_FILE' };
  }
  if (/\.d\.ts$/i.test(file)) {
    return { file, allowed: false, reason: 'TYPESCRIPT_DECLARATION_FILE' };
  }
  if (isEntryPointFile(file)) {
    return { file, allowed: false, reason: 'ENTRY_POINT_FILE' };
  }
  if (!isAllowedAppLayerPath(file)) {
    return { file, allowed: false, reason: 'NOT_IN_MIGRATION_WRITE_ALLOWLIST' };
  }

  return { file, allowed: true, reason: 'ALLOWED_APP_LAYER_FILE' };
}

export function isMigrationAutoWriteAllowed(filePath) {
  return classifyMigrationWriteTarget(filePath).allowed;
}
