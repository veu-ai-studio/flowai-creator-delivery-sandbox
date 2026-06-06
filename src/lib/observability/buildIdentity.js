import { BUILD_INFO } from './buildInfo.generated.js';

const COMMIT_KEYS = Object.freeze([
  'VERCEL_GIT_COMMIT_SHA',
  'VITE_VERCEL_GIT_COMMIT_SHA',
  'VITE_GIT_COMMIT_SHA',
  'GIT_COMMIT_SHA',
  'COMMIT_SHA',
]);

const EXPECTED_COMMIT_KEYS = Object.freeze([
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

export function resolveBuildIdentity(env = process.env, buildInfo = BUILD_INFO) {
  const commitEnv = firstNonEmpty(env, COMMIT_KEYS);
  const expectedCommitEnv = firstNonEmpty(env, EXPECTED_COMMIT_KEYS);
  const branchEnv = firstNonEmpty(env, BRANCH_KEYS);
  const generatedCommit = typeof buildInfo.commitFull === 'string' && buildInfo.commitFull.trim()
    ? buildInfo.commitFull.trim()
    : null;
  const generatedBranch = typeof buildInfo.branch === 'string' && buildInfo.branch.trim()
    ? buildInfo.branch.trim()
    : null;
  const commitFull = commitEnv.value || generatedCommit || expectedCommitEnv.value;
  const branch = branchEnv.value || generatedBranch;
  const source = commitEnv.value
    ? `env:${commitEnv.key}`
    : generatedCommit
      ? `generated:${buildInfo.source || 'git'}`
      : expectedCommitEnv.value
        ? `env:${expectedCommitEnv.key}`
      : 'unavailable';

  return {
    commit: commitFull ? commitFull.slice(0, 12) : null,
    commitFull,
    branch,
    source,
    generatedAt: buildInfo.generatedAt || null,
  };
}

export const __buildIdentityInternals = Object.freeze({
  COMMIT_KEYS,
  EXPECTED_COMMIT_KEYS,
  BRANCH_KEYS,
});
