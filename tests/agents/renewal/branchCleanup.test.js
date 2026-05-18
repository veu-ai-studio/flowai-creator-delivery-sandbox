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

// ─────────────────────────────────────────────────────────────────────
// Transient-gate (BC-X2): 3 consecutive transient failures escalate
// ─────────────────────────────────────────────────────────────────────

describe('branchCleanup — transient gate (spec §5)', () => {
  // Helper: build a setup with a 503 DELETE response and a shared gate.
  function setupTransient503({ gate }) {
    const sb = supabaseSpy();
    const fetchImpl = makeFetch([
      { match: (u) => u.includes('/branches?per_page'), response: { status: 200, body: [{ name: 'flowai/renewal-rTrans', commit: { sha: 'a' } }] } },
      { match: (u) => u.includes('/branches/flowai%2Frenewal-rTrans'), response: { status: 200, body: { commit: { commit: { committer: { date: daysAgoIso(10) } } } } } },
      { match: (u) => u.includes('/pulls?head='), response: { status: 200, body: [] } },
      { match: (u, i) => i?.method === 'DELETE', response: { status: 503, body: 'service down' } },
    ]);
    return { sb, fetchImpl, gate };
  }

  it('InMemoryTransientGate: record/reset/read primitives', async () => {
    const gate = new __internals.InMemoryTransientGate();
    expect(gate.backend).toBe('in-memory');
    expect(await gate.read('k')).toBe(0);
    expect(await gate.record('k')).toBe(1);
    expect(await gate.record('k')).toBe(2);
    expect(await gate.record('k')).toBe(3);
    expect(await gate.read('k')).toBe(3);
    await gate.reset('k');
    expect(await gate.read('k')).toBe(0);
  });

  it('buildTransientKey honours productId + branch; unknown when productId absent', () => {
    expect(__internals.buildTransientKey('mypreglife', 'flowai/renewal-r1'))
      .toBe('flowai:cleanup:transient:mypreglife:flowai/renewal-r1');
    expect(__internals.buildTransientKey(null, 'flowai/renewal-r1'))
      .toBe('flowai:cleanup:transient:unknown:flowai/renewal-r1');
    expect(__internals.buildTransientKey('', 'flowai/renewal-r1'))
      .toBe('flowai:cleanup:transient:unknown:flowai/renewal-r1');
  });

  it('BC-X1 reaffirmed: 1st transient failure → willRetry=true, consecutiveFailures=1, NOT escalated', async () => {
    const gate = new __internals.InMemoryTransientGate();
    const { sb, fetchImpl } = setupTransient503({ gate });
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      supabase: sb, productId: 'demo', transientGate: gate,
      fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.failed.length).toBe(1);
    expect(r.failed[0].reason).toBe('github_5xx');
    expect(r.failed[0].willRetry).toBe(true);
    expect(r.failed[0].consecutiveFailures).toBe(1);
    expect(r.failed[0].escalated).toBeUndefined();
    expect(sb.inserts.length).toBe(0);
    // Counter advanced.
    expect(await gate.read('flowai:cleanup:transient:demo:flowai/renewal-rTrans')).toBe(1);
  });

  it('BC-X2 — 3 consecutive 503 → 3rd run escalates, emits cleanup_failed.v1, resets counter', async () => {
    // Use a shared gate across three "runs" — simulates the multi-cron-tick
    // case where the same branch keeps timing out.
    const gate = new __internals.InMemoryTransientGate();
    const key = 'flowai:cleanup:transient:demo:flowai/renewal-rTrans';

    async function oneRun() {
      const { sb, fetchImpl } = setupTransient503({ gate });
      const r = await cleanupStaleBranches({
        owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
        supabase: sb, productId: 'demo', transientGate: gate,
        fetch: fetchImpl, now: () => NOW_MS,
      });
      return { r, sb };
    }

    // Run 1: counter 0 → 1. No escalation. No cleanup_failed entry.
    const { r: r1, sb: sb1 } = await oneRun();
    expect(r1.failed[0].consecutiveFailures).toBe(1);
    expect(r1.failed[0].escalated).toBeUndefined();
    expect(r1.failed[0].willRetry).toBe(true);
    expect(sb1.inserts.length).toBe(0);
    expect(await gate.read(key)).toBe(1);

    // Run 2: counter 1 → 2. Still no escalation.
    const { r: r2, sb: sb2 } = await oneRun();
    expect(r2.failed[0].consecutiveFailures).toBe(2);
    expect(r2.failed[0].escalated).toBeUndefined();
    expect(r2.failed[0].willRetry).toBe(true);
    expect(sb2.inserts.length).toBe(0);
    expect(await gate.read(key)).toBe(2);

    // Run 3: counter 2 → 3. ESCALATE.
    const { r: r3, sb: sb3 } = await oneRun();
    expect(r3.failed[0].consecutiveFailures).toBe(3);
    expect(r3.failed[0].escalated).toBe(true);
    expect(r3.failed[0].willRetry).toBe(false);
    expect(r3.failed[0].reason).toBe('github_5xx');
    expect(sb3.inserts.length).toBe(1);
    expect(sb3.inserts[0].kind).toBe('self_renewal.cleanup_failed.v1');
    expect(sb3.inserts[0].reason).toBe('github_5xx');
    expect(sb3.inserts[0].escalated).toBe(true);
    expect(sb3.inserts[0].consecutiveFailures).toBe(3);
    expect(sb3.inserts[0].willRetryNextRun).toBe(false);
    // Counter reset after escalation.
    expect(await gate.read(key)).toBe(0);
  });

  it('success resets counter (transient streak → success starts fresh)', async () => {
    const gate = new __internals.InMemoryTransientGate();
    const key = 'flowai:cleanup:transient:demo:flowai/renewal-rSuccess';
    // Seed the counter at 2 to mimic a prior transient streak.
    await gate.record(key);
    await gate.record(key);
    expect(await gate.read(key)).toBe(2);

    const sb = supabaseSpy();
    const fetchImpl = makeFetch([
      { match: (u) => u.includes('/branches?per_page'), response: { status: 200, body: [{ name: 'flowai/renewal-rSuccess', commit: { sha: 'a' } }] } },
      { match: (u) => u.includes('/branches/flowai%2Frenewal-rSuccess'), response: { status: 200, body: { commit: { commit: { committer: { date: daysAgoIso(10) } } } } } },
      { match: (u) => u.includes('/pulls?head='), response: { status: 200, body: [] } },
      { match: (u, i) => i?.method === 'DELETE', response: { status: 204, body: '' } },
    ]);
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      supabase: sb, productId: 'demo', transientGate: gate,
      fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.deleted.length).toBe(1);
    expect(await gate.read(key)).toBe(0);   // success resets the counter
  });

  it('persistent failure (401) resets counter (branch-lifecycle clean slate)', async () => {
    const gate = new __internals.InMemoryTransientGate();
    const key = 'flowai:cleanup:transient:demo:flowai/renewal-rPersistent';
    await gate.record(key);
    expect(await gate.read(key)).toBe(1);

    const sb = supabaseSpy();
    const fetchImpl = makeFetch([
      { match: (u) => u.includes('/branches?per_page'), response: { status: 200, body: [{ name: 'flowai/renewal-rPersistent', commit: { sha: 'a' } }] } },
      { match: (u) => u.includes('/branches/flowai%2Frenewal-rPersistent'), response: { status: 200, body: { commit: { commit: { committer: { date: daysAgoIso(10) } } } } } },
      { match: (u) => u.includes('/pulls?head='), response: { status: 200, body: [] } },
      { match: (u, i) => i?.method === 'DELETE', response: { status: 401, body: 'Bad credentials' } },
    ]);
    const r = await cleanupStaleBranches({
      owner: 'org', repo: 'repo', retentionDays: 7, token: TOKEN,
      supabase: sb, productId: 'demo', transientGate: gate,
      fetch: fetchImpl, now: () => NOW_MS,
    });
    expect(r.failed[0].reason).toBe('permission_denied');
    // Persistent failure → counter reset (no escalated flag because
    // first-touch persistent, not escalated transient).
    expect(r.failed[0].escalated).toBeUndefined();
    expect(await gate.read(key)).toBe(0);
  });

  it('KvBackedTransientGate: record/reset/read uses kv.incr / kv.del / kv.get + sets TTL', async () => {
    const log = [];
    const kvSpy = {
      incr: async (k) => { log.push(['incr', k]); return 1; },
      expire: async (k, ttl) => { log.push(['expire', k, ttl]); return 1; },
      get: async (k) => { log.push(['get', k]); return 5; },
      del: async (k) => { log.push(['del', k]); return 1; },
    };
    const gate = new __internals.KvBackedTransientGate(kvSpy);
    expect(gate.backend).toBe('vercel-kv');
    expect(await gate.record('k')).toBe(1);
    expect(log[0]).toEqual(['incr', 'k']);
    expect(log[1][0]).toBe('expire');
    expect(log[1][2]).toBe(__internals.TRANSIENT_TTL_SECONDS);
    expect(await gate.read('k')).toBe(5);
    await gate.reset('k');
    expect(log.find((l) => l[0] === 'del')).toEqual(['del', 'k']);
  });

  it('KvBackedTransientGate: KV failures degrade gracefully (record→1, read→0)', async () => {
    const kvErrors = {
      incr: async () => { throw new Error('KV down'); },
      expire: async () => { throw new Error('KV down'); },
      get: async () => { throw new Error('KV down'); },
      del: async () => { throw new Error('KV down'); },
    };
    const gate = new __internals.KvBackedTransientGate(kvErrors);
    expect(await gate.record('k')).toBe(1);   // degraded — treat as 1, no escalation
    expect(await gate.read('k')).toBe(0);
    await gate.reset('k');                    // does not throw
  });

  it('default gate: in-memory fallback when KV env vars absent', async () => {
    // Save + clear env vars so the singleton probes "not configured".
    const origKvUrl = process.env.KV_REST_API_URL;
    const origKvUrlAlt = process.env.KV_URL;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_URL;
    // Drop the cached singleton so the env probe runs fresh.
    const mod = await import('../../../src/lib/agents/renewal/branchCleanup.js');
    mod._resetDefaultTransientGate();
    const gate = await __internals.getDefaultTransientGate();
    expect(gate.backend).toBe('in-memory');
    // Restore env state.
    if (origKvUrl !== undefined) process.env.KV_REST_API_URL = origKvUrl;
    if (origKvUrlAlt !== undefined) process.env.KV_URL = origKvUrlAlt;
    mod._resetDefaultTransientGate();
  });
});
