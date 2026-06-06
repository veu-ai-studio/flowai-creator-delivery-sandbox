import { describe, expect, it } from 'vitest';
import { resolveBuildIdentity } from '../../src/lib/observability/buildIdentity.js';
import { BUILD_INFO } from '../../src/lib/observability/buildInfo.generated.js';

describe('resolveBuildIdentity', () => {
  it('prefers Vercel runtime commit metadata when present', () => {
    const identity = resolveBuildIdentity({
      VERCEL_GIT_COMMIT_SHA: 'abc123456789deadbeef',
      VERCEL_GIT_COMMIT_REF: 'main',
      VITE_GIT_COMMIT_SHA: 'fallback',
    });

    expect(identity).toMatchObject({
      commit: 'abc123456789',
      commitFull: 'abc123456789deadbeef',
      branch: 'main',
      source: 'env:VERCEL_GIT_COMMIT_SHA',
    });
  });

  it('accepts Vite/git-style commit metadata when Vercel git env is absent', () => {
    const identity = resolveBuildIdentity({
      VITE_GIT_COMMIT_SHA: 'def456789abc000',
      VITE_GIT_BRANCH: 'feature/build-id',
    });

    expect(identity).toMatchObject({
      commit: 'def456789abc',
      commitFull: 'def456789abc000',
      branch: 'feature/build-id',
      source: 'env:VITE_GIT_COMMIT_SHA',
    });
  });

  it('falls back to generated build info for local-source Vercel CLI deployments', () => {
    const identity = resolveBuildIdentity({});

    expect(identity.commitFull).toBe(BUILD_INFO.commitFull);
    expect(identity.branch).toBe(BUILD_INFO.branch);
    expect(identity.source).toBe(
      BUILD_INFO.commitFull ? `generated:${BUILD_INFO.source || 'git'}` : 'unavailable',
    );
  });

  it('prefers generated build info over stale expected-head env', () => {
    const identity = resolveBuildIdentity({
      FLOWAI_EXPECTED_HEAD: 'stale-production-alias-sha',
      EXPECTED_HEAD: 'also-stale',
    }, {
      commitFull: 'generated123456789',
      branch: 'main',
      source: 'git',
      generatedAt: '2026-06-05T00:00:00.000Z',
    });

    expect(identity.commitFull).toBe('generated123456789');
    expect(identity.source).toBe('generated:git');
    expect(identity.branch).toBe('main');
  });

  it('uses expected-head env only when no generated build info is available', () => {
    const identity = resolveBuildIdentity({
      FLOWAI_EXPECTED_HEAD: 'expected123456789',
    }, {
      commitFull: null,
      branch: null,
      source: null,
      generatedAt: null,
    });

    expect(identity).toMatchObject({
      commit: 'expected1234',
      commitFull: 'expected123456789',
      source: 'env:FLOWAI_EXPECTED_HEAD',
    });
  });
});
