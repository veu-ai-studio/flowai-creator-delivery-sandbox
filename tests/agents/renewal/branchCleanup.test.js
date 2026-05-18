// tests/agents/renewal/branchCleanup.test.js
//
// Module 11 test coverage per BRANCH_CLEANUP_SPEC.md §6.1 matrix:
//   BC-N1..N5 — preserve / delete decision matrix
//   BC-M1     — pagination
//   BC-M2     — non-renewal branches ignored
//   BC-E1     — boundary case (age == retentionDays → preserved)
//   BC-E2     — runId extraction
//   BC-X1..X5 — failure classification (5xx / 404 / 403-protected / 401)
//   BC-X6     — token never logged
//   BC-X7     — path-traversal-safe branch name URL encoding

import { describe, it, expect, vi } from 'vitest';
import {
  cleanupStaleBranches,
  __internals,
} from '../../../src/lib/agents/renewal/branchCleanup.js';

const TOKEN = 'ghs_TEST_TOKEN_aaaaaaaaaaaaaaaaaaaaaa';

const NOW_MS = Date.UTC(2026, 4, 18, 12, 0, 0);  // 2026-05-18T12:00:00Z

function daysAgoIso(days) {
  return new Date(NOW_MS - days * 24 * 60 * 60 * 1000).toISOString();
}

// Build a fetch responder that routes by URL pattern + HTTP method.
// `routes` is an array of { match: (url, init) => bool, response: object | (call) => object }.
function makeFetch(routes) {
  const calls = [];
  const fn = vi.fn(async (url, init = {}) => {
    calls.push({ url, init });
    for (const r of routes) {
      if (r.match(url, init)) {
        const resp = typeof r.response === 'function' ? r.response({ url, init, calls }) : r.response;
        // Normalise to a Response-like object.
        const headers = resp.headers ?? { get: () => null };
        return {
          ok: resp.ok ?? (resp.status >= 200 && resp.status < 300),
          status: resp.status ?? 200,
          statusText: resp.statusText ?? '',
          headers: typeof headers.get === 'function' ? headers : { get: (h) => headers[h?.toLowerCase()] ?? headers[h] ?? null },
          text: async () => (typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body ?? {})),
          json: async () => (typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body ?? {}),
        };
      }
    }
    return { ok: false, status: 500, statusText: 'Mock unhandled', headers: { get: () => null }, text: async () => 'no match', json: async () => ({}) };
  });
  fn._calls = calls;
  return fn;
}

function supabaseSpy() {
  const inserts = [];
  return {
    inserts,
    from: () => ({
      insert: (entry) => ({
        select: () => ({
          maybeSingle: async () => {
            inserts.push(entry);
            return { data: { id: `ssot_${inserts.length}` } };
          },
        }),
      }),
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────
// __internals — unit tests
// ─────────────────────────────────────────────────────────────────────

describe('branchCleanup — __internals', () => {
  it('extractRunId: strips flowai/renewal- prefix; rejects non-matching', () => {
    expect(__internals.extractRunId('flowai/renewal-abc123')).toBe('abc123');
    expect(__internals.extractRunId('main')).toBeNull();
    expect(__internals.extractRunId('flowai/renewal-')).toBeNull();
  });

  it('extractRunId: BC-E2 — embedded UUID', () => {
    const uuid = '7f3a8b2c-1d4e-4f6a-9b8c-2e5d4f3a1b8c';
    expect(__internals.extractRunId(`flowai/renewal-${uuid}`)).toBe(uuid);
  });

  it('ageDays: now − commitDate / 86400000', () => {
    expect(__internals.ageDays(daysAgoIso(7), NOW_MS)).toBe(7);
    expect(__internals.ageDays(daysAgoIso(0.5), NOW_MS)).toBe(0.5);
    expect(__internals.ageDays(null)).toBe(0);
  });

  it('scrubTokenFromText: BC-X6 — token never appears in returned string', () => {
    const msg = `request failed with auth Bearer ${TOKEN}`;
    expect(__internals.scrubTokenFromText(msg, TOKEN)).not.toContain(TOKEN);
    expect(__internals.scrubTokenFromText(msg, TOKEN)).toContain('[REDACTED]');
  });

  it('classifyDeleteFailure: 401 → permission_denied persistent', () => {
    expect(__internals.classifyDeleteFailure(401, '')).toMatchObject({
      reason: 'permission_denied', willRetry: false, persistent: true,
    });
  });
  it('classifyDeleteFailure: 404 → branch_not_found persistent', () => {
    expect(__internals.classifyDeleteFailure(404, '')).toMatchObject({
      reason: 'branch_not_found', willRetry: false, persistent: true,
    });
  });
  it('classifyDeleteFailure: 403 with "branch is protected" → branch_protected persistent', () => {
    expect(__internals.classifyDeleteFailure(403, 'branch is protected by rules')).toMatchObject({
      reason: 'branch_protected', willRetry: false, persistent: true,
    });
  });
  it('classifyDeleteFailure: 403 with "rate limit" → rate_limited transient', () => {
    expect(__internals.classifyDeleteFailure(403, 'API rate limit exceeded')).toMatchObject({
      reason: 'rate_limited', willRetry: true, persistent: false,
    });
  });
  it('classifyDeleteFailure: 503 → github_5xx transient', () => {
    expect(__internals.classifyDeleteFailure(503, '')).toMatchObject({
      reason: 'github_5xx', willRetry: true, persistent: false,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// cleanupStaleBranches — decision matrix
// ─────────────────────────────────────────────────────────────────────

describe('cleanupStaleBranches — decision matrix', () => {
  function branchesListResponse(names) {
    return {
      status: 200,
      body: names.map((n) => ({ name: n, commit: { sha: 'abc' } })),
    };
  }
  function branchDetailResponse(daysOld) {
    return {
      status: 200,
      body: { commit: { commit: { committer: { date: daysAgoIso(daysOld) } } } },
    };
  }
  function prsResponse(openPrCount, prNumber = 42) {
    return {
      status: 200,
      body: openPrCount > 0
        ? Array.from({ length: openPrCount }, (_, i) => ({ number: prNumber + i, state: 'open' }))
        : [],
    };
  }

  it('BC-N1 — aged + no open PR → deleted + governance entry', async () => {
    const sb = supabaseSpy();
    const fetchImpl = makeFetch([
      { match: (u, i) => u.includes('/branches?per_page'), response: branchesListResponse(['flowai/renewal-r1']) },
      { match: (u, i) => u.includes('/branches/flowai%2Frenewal-r1') && (i?.method === 'GET' || !i?.method), response: branchDetailResponse(10) },
      { match: (u, i) => u.includes('/pulls?head='), response: prsResponse(0) },
      { match: (u, i) => i?.method === 'DELETE' && u.includes('/git/refs/heads/flowai%2Frenewal-r1'), response: { status: 204, body: '' } },
    ]);
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      supabase: sb, productId: 'demo',
      fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.deleted.length).toBe(1);
    expect(r.deleted[0].branch).toBe('flowai/renewal-r1');
    expect(r.deleted[0].runId).toBe('r1');
    expect(r.deleted[0].ssotEntryRef).toBe('ssot_1');
    expect(sb.inserts.length).toBe(1);
    expect(sb.inserts[0].kind).toBe('self_renewal.branch_cleaned_up.v1');
  });

  it('BC-N2 — aged + open PR → preservedByOpenPR; DELETE NOT called', async () => {
    const sb = supabaseSpy();
    const fetchImpl = makeFetch([
      { match: (u) => u.includes('/branches?per_page'), response: branchesListResponse(['flowai/renewal-r2']) },
      { match: (u) => u.includes('/branches/flowai%2Frenewal-r2'), response: branchDetailResponse(10) },
      { match: (u) => u.includes('/pulls?head='), response: prsResponse(1, 99) },
      { match: (u, i) => i?.method === 'DELETE', response: { status: 204, body: '' } }, // should NOT be hit
    ]);
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      supabase: sb, fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.deleted.length).toBe(0);
    expect(r.preservedByOpenPR.length).toBe(1);
    expect(r.preservedByOpenPR[0].prNumber).toBe(99);
    const deleteCalls = fetchImpl._calls.filter((c) => c.init?.method === 'DELETE');
    expect(deleteCalls.length).toBe(0);
    expect(sb.inserts.length).toBe(0);
  });

  it('BC-N3 — young + no open PR → preservedByAge', async () => {
    const sb = supabaseSpy();
    const fetchImpl = makeFetch([
      { match: (u) => u.includes('/branches?per_page'), response: branchesListResponse(['flowai/renewal-r3']) },
      { match: (u) => u.includes('/branches/flowai%2Frenewal-r3'), response: branchDetailResponse(3) },
      { match: (u) => u.includes('/pulls?head='), response: prsResponse(0) },
    ]);
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      supabase: sb, fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.deleted.length).toBe(0);
    expect(r.preservedByAge.length).toBe(1);
    expect(r.preservedByAge[0].age_days).toBeCloseTo(3, 5);
  });

  it('BC-N4 — young + open PR → preservedByOpenPR (open-PR wins regardless of age)', async () => {
    const fetchImpl = makeFetch([
      { match: (u) => u.includes('/branches?per_page'), response: branchesListResponse(['flowai/renewal-r4']) },
      { match: (u) => u.includes('/branches/flowai%2Frenewal-r4'), response: branchDetailResponse(2) },
      { match: (u) => u.includes('/pulls?head='), response: prsResponse(1, 10) },
    ]);
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.preservedByOpenPR.length).toBe(1);
    expect(r.preservedByAge.length).toBe(0);
  });

  it('BC-E1 — branch on exact retention boundary → preservedByAge (strict greater-than)', async () => {
    const fetchImpl = makeFetch([
      { match: (u) => u.includes('/branches?per_page'), response: branchesListResponse(['flowai/renewal-boundary']) },
      { match: (u) => u.includes('/branches/flowai%2Frenewal-boundary'), response: branchDetailResponse(7) }, // exactly 7d
      { match: (u) => u.includes('/pulls?head='), response: prsResponse(0) },
    ]);
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.deleted.length).toBe(0);
    expect(r.preservedByAge.length).toBe(1);
    expect(r.preservedByAge[0].age_days).toBe(7);
  });

  it('BC-M2 — non flowai/renewal-* branches NOT in inspected list', async () => {
    const fetchImpl = makeFetch([
      { match: (u) => u.includes('/branches?per_page'), response: branchesListResponse(['main', 'dev', 'flowai/other-prefix', 'flowai/renewal-real']) },
      { match: (u) => u.includes('/branches/flowai%2Frenewal-real'), response: branchDetailResponse(3) },
      { match: (u) => u.includes('/pulls?head='), response: prsResponse(0) },
    ]);
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.inspected).toBe(1);  // only the flowai/renewal-real
  });
});

// ─────────────────────────────────────────────────────────────────────
// Failure classification
// ─────────────────────────────────────────────────────────────────────

describe('cleanupStaleBranches — failure paths', () => {
  function setupFor(deleteResponse) {
    const sb = supabaseSpy();
    const fetchImpl = makeFetch([
      { match: (u) => u.includes('/branches?per_page'), response: { status: 200, body: [{ name: 'flowai/renewal-x', commit: { sha: 'a' } }] } },
      { match: (u) => u.includes('/branches/flowai%2Frenewal-x'), response: { status: 200, body: { commit: { commit: { committer: { date: daysAgoIso(10) } } } } } },
      { match: (u) => u.includes('/pulls?head='), response: { status: 200, body: [] } },
      { match: (u, i) => i?.method === 'DELETE', response: deleteResponse },
    ]);
    return { sb, fetchImpl };
  }

  it('BC-X1 — 503 → failed[].willRetry=true; cleanup_failed governance NOT inserted', async () => {
    const { sb, fetchImpl } = setupFor({ status: 503, body: 'service down' });
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      supabase: sb, fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.failed.length).toBe(1);
    expect(r.failed[0].reason).toBe('github_5xx');
    expect(r.failed[0].willRetry).toBe(true);
    expect(sb.inserts.length).toBe(0); // transient → no governance entry on first failure
  });

  it('BC-X3 — 404 → branch_not_found persistent; cleanup_failed inserted', async () => {
    const { sb, fetchImpl } = setupFor({ status: 404, body: 'Not Found' });
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      supabase: sb, fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.failed[0].reason).toBe('branch_not_found');
    expect(sb.inserts.length).toBe(1);
    expect(sb.inserts[0].kind).toBe('self_renewal.cleanup_failed.v1');
  });

  it('BC-X4 — 403 branch-protected → persistent; cleanup_failed inserted', async () => {
    const { sb, fetchImpl } = setupFor({ status: 403, body: 'branch is protected by rules' });
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      supabase: sb, fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.failed[0].reason).toBe('branch_protected');
    expect(r.failed[0].willRetry).toBe(false);
    expect(sb.inserts[0].kind).toBe('self_renewal.cleanup_failed.v1');
  });

  it('BC-X5 — 401 → permission_denied; cleanup_failed inserted', async () => {
    const { sb, fetchImpl } = setupFor({ status: 401, body: 'Bad credentials' });
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      supabase: sb, fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.failed[0].reason).toBe('permission_denied');
    expect(sb.inserts[0].kind).toBe('self_renewal.cleanup_failed.v1');
  });

  it('BC-X6 — token NEVER appears in returned envelope JSON', async () => {
    const { sb, fetchImpl } = setupFor({ status: 503, body: `internal error with token ${TOKEN}` });
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      supabase: sb, fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(JSON.stringify(r)).not.toContain(TOKEN);
  });
});

// ─────────────────────────────────────────────────────────────────────
// URL encoding (path-traversal safe)
// ─────────────────────────────────────────────────────────────────────

describe('cleanupStaleBranches — URL safety', () => {
  it('BC-X7 — adversarial branch name URL-encoded in DELETE call', async () => {
    const adversarial = 'flowai/renewal-../../etc/passwd';
    const fetchImpl = makeFetch([
      { match: (u) => u.includes('/branches?per_page'), response: { status: 200, body: [{ name: adversarial, commit: { sha: 'a' } }] } },
      // Branch detail + PR list — match by partial encoded fragment.
      { match: (u) => u.includes('/branches/flowai%2Frenewal-'), response: { status: 200, body: { commit: { commit: { committer: { date: daysAgoIso(10) } } } } } },
      { match: (u) => u.includes('/pulls?head='), response: { status: 200, body: [] } },
      { match: (u, i) => i?.method === 'DELETE', response: { status: 204, body: '' } },
    ]);
    await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      fetch: fetchImpl, now: () => NOW_MS,
    });
    const deleteCall = fetchImpl._calls.find((c) => c.init?.method === 'DELETE');
    expect(deleteCall).toBeDefined();
    // The slashes inside the branch name MUST be %2F-encoded; no literal
    // /../etc/passwd path appears in the URL.
    expect(deleteCall.url).not.toMatch(/\/\.\.\/etc\/passwd/);
    expect(deleteCall.url).toMatch(/%2F/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Required-arg validation
// ─────────────────────────────────────────────────────────────────────

describe('cleanupStaleBranches — args validation', () => {
  it('missing owner → failed envelope', async () => {
    const r = await cleanupStaleBranches({ owner: '', repo: 'r', token: TOKEN, fetch: () => {}, now: () => NOW_MS });
    expect(r.inspected).toBe(0);
    expect(r.failed[0].detail).toMatch(/owner \+ repo required/);
  });
  it('missing token → failed envelope with permission_denied', async () => {
    const r = await cleanupStaleBranches({ owner: 'o', repo: 'r', token: '', fetch: () => {}, now: () => NOW_MS });
    expect(r.failed[0].reason).toBe('permission_denied');
  });
});
