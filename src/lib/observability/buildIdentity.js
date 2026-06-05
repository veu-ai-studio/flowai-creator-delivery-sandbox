import { BUILD_INFO } from './buildInfo.generated.js';

const COMMIT_KEYS = Object.freeze([
  'VERCEL_GIT_COMMIT_SHA',
  'VITE_VERCEL_GIT_COMMIT_SHA',
  'VITE_GIT_COMMIT_SHA',
  'GIT_COMMIT_SHA',
  'COMMIT_SHA',
  'FLOWAI_EXPECTED_HEAD',
  'EXPECTED_HEAD',
]);

const BRANCH_KEYS = Object.freeze([
  'VERCEL_GIT_COMMIT_REF',
  'VERCEL_GIT_COMMIT_BRANCH',
  'VITE_VERCEL_GIT_COMMIT_REF',
  'VITE_GIT_BRANCH',
  'GIT_BRANCH',
  'BRANCH',
]);

function firstNonEmpty(env, keys) {
  for (const key of keys) {
    const value = env?.[key];
    if (typeof value === 'string' && value.trim()) {
      return { value: value.trim(), key };
    }
  }
  return { value: null, key: null };
}

export function resolveBuildIdentity(env = process.env) {
  const commitEnv = firstNonEmpty(env, COMMIT_KEYS);
  const branchEnv = firstNonEmpty(env, BRANCH_KEYS);
  const generatedCommit = typeof BUILD_INFO.commitFull === 'string' && BUILD_INFO.commitFull.trim()
    ? BUILD_INFO.commitFull.trim()
    : null;
  const generatedBranch = typeof BUILD_INFO.branch === 'string' && BUILD_INFO.branch.trim()
    ? BUILD_INFO.branch.trim()
    : null;
  const commitFull = commitEnv.value || generatedCommit;
  const branch = branchEnv.value || generatedBranch;
  const source = commitEnv.value
    ? `env:${commitEnv.key}`
    : generatedCommit
      ? `generated:${BUILD_INFO.source || 'git'}`
      : 'unavailable';

  return {
    commit: commitFull ? commitFull.slice(0, 12) : null,
    commitFull,
    branch,
    source,
    generatedAt: BUILD_INFO.generatedAt || null,
  };
}

export const __buildIdentityInternals = Object.freeze({
  COMMIT_KEYS,
  BRANCH_KEYS,
});

