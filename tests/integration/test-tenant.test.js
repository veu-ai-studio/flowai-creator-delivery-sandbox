// tests/integration/test-tenant.test.js
//
// Verifies the `_test` system tenant provisioning required by the
// FlowAI self-adversarial test plan §11.8. Coverage:
//   - `_test` is recognized as a valid productScope by both
//     authoritative whitelists (BaseAgent PRODUCT_SCOPES,
//     MessageSchema VALID_PRODUCT_SCOPES via validateEnvelope).
//   - cleanupTestTenant() works in the three meaningful states:
//       (a) migration 0012 not yet applied → no-op + null org_id.
//       (b) tenant row exists, child rows exist → child rows deleted,
//           organizations row preserved.
//       (c) production-tenant rows are NEVER touched — every delete
//           is constrained to the resolved `_test` uuid.

import { describe, it, expect, vi } from 'vitest';
import { PRODUCT_SCOPES } from '../../src/lib/agents/BaseAgent.js';
import { validateEnvelope } from '../../src/lib/agents/MessageSchema.js';
import {
  cleanupTestTenant,
  TENANT_SCOPED_TABLES,
  TEST_CLERK_ORG_ID,
} from '../../scripts/cleanup-test-tenant.mjs';

// ─────────────────────────────────────────────────────────────────────
// Whitelist coverage
// ─────────────────────────────────────────────────────────────────────

describe('_test productScope — whitelist coverage', () => {
  it('PRODUCT_SCOPES.TEST equals "_test"', () => {
    expect(PRODUCT_SCOPES.TEST).toBe('_test');
  });

  it('PRODUCT_SCOPES preserves the 6 production scopes alongside _test', () => {
    expect(PRODUCT_SCOPES.FLOWAI).toBe('flowai');
    expect(PRODUCT_SCOPES.SAIGE).toBe('saige');
    expect(PRODUCT_SCOPES.RELTWIN).toBe('reltwin');
    expect(PRODUCT_SCOPES.REACHSMS).toBe('reachsms');
    expect(PRODUCT_SCOPES.PRESSAI).toBe('pressai');
    expect(PRODUCT_SCOPES.MYBIRTHSAFE).toBe('mybirthsafe');
  });

  it('MessageSchema validateEnvelope accepts productScope="_test"', () => {
    const env = makeMinimalEnv({ productScope: '_test' });
    expect(() => validateEnvelope(env)).not.toThrow();
  });

  it('MessageSchema validateEnvelope still accepts production scopes', () => {
    for (const scope of ['flowai', 'saige', 'reltwin', 'reachsms', 'pressai', 'mybirthsafe']) {
      const env = makeMinimalEnv({ productScope: scope });
      expect(() => validateEnvelope(env), `scope=${scope}`).not.toThrow();
    }
  });

  it('MessageSchema validateEnvelope rejects unknown productScope (sanity)', () => {
    const env = makeMinimalEnv({ productScope: 'definitely-not-a-real-scope' });
    expect(() => validateEnvelope(env)).toThrow(/productScope invalid/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// cleanupTestTenant — behavior with mock Supabase client
// ─────────────────────────────────────────────────────────────────────

describe('cleanupTestTenant — migration 0012 not yet applied', () => {
  it('returns { org_id: null, total: 0 } and does not call delete on any table', async () => {
    const calls = { from: [], select: [], delete: [], eq: [] };
    const client = makeMockClient({ orgLookupReturns: [], calls });

    const log = vi.fn();
    const result = await cleanupTestTenant({ client, log });

    expect(result.org_id).toBeNull();
    expect(result.total).toBe(0);
    expect(result.perTable).toEqual([]);
    expect(calls.delete.length).toBe(0);
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/_test organization not found/),
    );
  });
});

describe('cleanupTestTenant — happy path (tenant exists)', () => {
  it('issues one delete per tenant-scoped table, all constrained to the resolved _test uuid', async () => {
    const fakeTestUuid = '00000000-0000-4000-8000-deadbeefcafe';
    const calls = { from: [], select: [], delete: [], eq: [] };
    const client = makeMockClient({
      orgLookupReturns: [{ id: fakeTestUuid }],
      deleteCountPerTable: 2,
      calls,
    });

    const result = await cleanupTestTenant({ client, log: () => {} });

    expect(result.org_id).toBe(fakeTestUuid);
    expect(result.perTable.length).toBe(TENANT_SCOPED_TABLES.length);
    expect(result.total).toBe(2 * TENANT_SCOPED_TABLES.length);

    // Every delete call was constrained to org_id = fakeTestUuid.
    expect(calls.eq.length).toBeGreaterThan(0);
    for (const eqCall of calls.eq) {
      // The lookup call uses ('clerk_org_id', '_test'); every other
      // .eq() call MUST be ('org_id', fakeTestUuid). No exceptions —
      // this is the production-safety invariant.
      const isLookup = eqCall.column === 'clerk_org_id' && eqCall.value === TEST_CLERK_ORG_ID;
      const isCleanup = eqCall.column === 'org_id' && eqCall.value === fakeTestUuid;
      expect(isLookup || isCleanup, `unexpected .eq(${eqCall.column}, ${eqCall.value})`).toBe(true);
    }
  });

  it('never includes the `organizations` table in the cleanup list (parent row preserved)', () => {
    expect(TENANT_SCOPED_TABLES).not.toContain('organizations');
    expect(TENANT_SCOPED_TABLES).not.toContain('users');
    // organizations + users are parent-of-tenant tables — preserving
    // them across runs keeps the next run hermetic without a
    // migration re-apply.
  });

  it('uses TEST_CLERK_ORG_ID = "_test" as the durable handle', () => {
    expect(TEST_CLERK_ORG_ID).toBe('_test');
  });
});

describe('cleanupTestTenant — production-tenant safety', () => {
  it('refuses to delete rows tied to any tenant whose uuid != the _test uuid', async () => {
    const fakeTestUuid = '00000000-0000-4000-8000-aaaaaaaaaaaa';
    const productionTenantUuid = '11111111-1111-4111-8111-bbbbbbbbbbbb';
    const calls = { from: [], select: [], delete: [], eq: [] };
    const client = makeMockClient({
      orgLookupReturns: [{ id: fakeTestUuid }],
      deleteCountPerTable: 0,
      calls,
    });

    await cleanupTestTenant({ client, log: () => {} });

    // No .eq() call may carry the production tenant uuid.
    const seenProductionUuid = calls.eq.some((c) => c.value === productionTenantUuid);
    expect(seenProductionUuid).toBe(false);

    // Every .eq('org_id', X) carried fakeTestUuid as X.
    const orgIdCalls = calls.eq.filter((c) => c.column === 'org_id');
    expect(orgIdCalls.length).toBe(TENANT_SCOPED_TABLES.length);
    for (const c of orgIdCalls) expect(c.value).toBe(fakeTestUuid);
  });

  it('treats "table_missing" / "org_id_column_missing" PostgREST errors as non-fatal', async () => {
    const fakeTestUuid = '00000000-0000-4000-8000-cccccccccccc';
    const client = makeMockClient({
      orgLookupReturns: [{ id: fakeTestUuid }],
      deleteErrorMessage: 'relation "audit_issues" does not exist',
      calls: { from: [], select: [], delete: [], eq: [] },
    });

    const result = await cleanupTestTenant({ client, log: () => {} });
    // Helper continues across tables; total is 0 because every
    // delete was skipped, not thrown.
    expect(result.total).toBe(0);
    expect(result.perTable.every((r) => r.count === 0)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────

function makeMinimalEnv({ productScope }) {
  return {
    messageId: 'msg_test_0001',
    topic: '1.product.lifecycle_event.v1',
    payload: {},
    from: { agentId: 1, productScope },
    runId: null,
    traceId: 'trace_test_0001',
    at: Date.now(),
    schemaVersion: '1.0.0',
  };
}

// Builds a chainable mock client matching the .from().select().eq() and
// .from().delete().eq() shapes that cleanupTestTenant uses.
// Records every .from / .select / .delete / .eq call for assertion.
function makeMockClient({
  orgLookupReturns = [],
  deleteCountPerTable = 0,
  deleteErrorMessage = null,
  calls,
}) {
  return {
    from(table) {
      calls.from.push(table);
      const ctx = { table, mode: null, isLookup: false };
      return {
        select(_cols) {
          calls.select.push(_cols);
          ctx.mode = 'select';
          ctx.isLookup = true;
          return this;
        },
        delete(_opts) {
          calls.delete.push({ table, opts: _opts });
          ctx.mode = 'delete';
          return this;
        },
        eq(column, value) {
          calls.eq.push({ table, column, value });
          if (ctx.mode === 'select' && ctx.isLookup) {
            // organizations lookup — return the configured payload.
            return {
              limit: async (_n) => ({ data: orgLookupReturns, error: null }),
            };
          }
          // delete — return either the configured count or an error.
          if (deleteErrorMessage) {
            return Promise.resolve({ error: { message: deleteErrorMessage }, count: null });
          }
          return Promise.resolve({ error: null, count: deleteCountPerTable });
        },
      };
    },
  };
}
