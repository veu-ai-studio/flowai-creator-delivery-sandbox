import { describe, expect, it } from 'vitest';
import { __test, STATUSES } from '../src/lib/observability/health.js';

function passingChecks() {
  return {
    build: { status: STATUSES.PASS },
    supabase: { status: STATUSES.PASS },
    vercelKv: { status: STATUSES.PASS },
    observability: { status: STATUSES.PASS },
    githubApp: { status: STATUSES.PASS },
    auth: { status: STATUSES.PASS },
    orchestra: { summary: { live: 11, degraded: 0, notWired: 0 } },
  };
}

describe('health aggregate truth', () => {
  it('reports PASS only when every detailed readiness check passes', () => {
    expect(__test.aggregateStatus(passingChecks())).toBe(STATUSES.PASS);
  });

  it.each([
    ['observability not wired', 'observability', STATUSES.NOT_WIRED],
    ['auth degraded', 'auth', STATUSES.DEGRADED],
    ['KV failed', 'vercelKv', STATUSES.FAIL],
  ])('reports DEGRADED when %s', (_label, key, status) => {
    const checks = passingChecks();
    checks[key].status = status;
    expect(__test.aggregateStatus(checks)).toBe(STATUSES.DEGRADED);
  });

  it('reports DEGRADED when Orchestra details include degraded or unwired members', () => {
    const degraded = passingChecks();
    degraded.orchestra.summary.degraded = 1;
    expect(__test.aggregateStatus(degraded)).toBe(STATUSES.DEGRADED);

    const notWired = passingChecks();
    notWired.orchestra.summary.notWired = 1;
    expect(__test.aggregateStatus(notWired)).toBe(STATUSES.DEGRADED);
  });
});
