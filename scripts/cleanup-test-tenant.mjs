// scripts/cleanup-test-tenant.mjs
//
// Deletes all rows owned by the system `_test` tenant
// (clerk_org_id = '_test', provisioned by migration 0012) across
// every tenant-scoped table. Required by the FlowAI self-adversarial
// test plan §11.8 — W4 invokes this between test runs so the suite
// is hermetic against accumulated state.
//
// Properties:
//   - Idempotent / safe to run repeatedly. If the `_test` org row
//     does not exist (migration 0012 not yet applied), the helper
//     logs that and returns counts of 0 — it does not throw.
//   - Production-tenant rows are NEVER touched. The helper resolves
//     `_test` to its uuid via `clerk_org_id = '_test'`; every DELETE
//     is constrained to that single uuid. Any tenant whose
//     `clerk_org_id !== '_test'` is invisible to this helper.
//   - The `_test` organizations row itself is preserved. The helper
//     only removes tenant-scoped child rows; the parent row stays so
//     the next test run does not require a migration re-apply.
//
// Usage (as a library):
//   import { cleanupTestTenant } from './scripts/cleanup-test-tenant.mjs';
//   const counts = await cleanupTestTenant({ client });  // returns
//                                                       // { table: count, ... }
//
// Usage (as a CLI):
//   node scripts/cleanup-test-tenant.mjs
//   (uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from env)
//
// The list of tenant-scoped tables mirrors the org_id columns
// declared across supabase/migrations/0001–0010. New tables that
// add an org_id column should be added to TENANT_SCOPED_TABLES.

const TEST_CLERK_ORG_ID = '_test';

// Tables that hold per-tenant rows. Order matters when foreign-key
// cascades would otherwise be triggered — children first, parents
// last. The `organizations` row itself is intentionally NOT in this
// list; we keep the parent row so the next run is hermetic without
// re-running migration 0012.
const TENANT_SCOPED_TABLES = Object.freeze([
  // Phase 1.0 audit + run tables (heaviest child rows).
  'audit_issues',
  'audit_surfaces',
  'audit_runs',
  // Pipeline runs.
  'run_steps',
  'workspace_runs',
  // Cost + clearance + sessions + audit_log.
  'cost_events',
  'clearance_checks',
  'user_sessions',
  'audit_log',
  // Tool marketplace per-tenant data.
  'tool_outcomes',
  'tool_recommendations',
  'marketplace_provider_preferences',
  // Workspaces + products.
  'workspaces',
  'products',
  // Membership last so users/orgs survive.
  'organization_members',
]);

/**
 * Resolve the `_test` tenant's uuid by looking up clerk_org_id.
 * Returns null if migration 0012 hasn't been applied yet.
 */
async function resolveTestTenantOrgId(client) {
  const { data, error } = await client
    .from('organizations')
    .select('id')
    .eq('clerk_org_id', TEST_CLERK_ORG_ID)
    .limit(1);
  if (error) throw new Error(`cleanup-test-tenant: lookup failed — ${error.message}`);
  if (!data || data.length === 0) return null;
  return data[0].id;
}

/**
 * Delete all rows in `tableName` where `org_id = testOrgId`.
 * Returns the number of rows deleted.
 */
async function deleteTenantRows(client, tableName, testOrgId) {
  const { error, count } = await client
    .from(tableName)
    .delete({ count: 'exact' })
    .eq('org_id', testOrgId);
  if (error) {
    // Some tables may not exist in older environments; log and continue.
    if (/relation .* does not exist/i.test(error.message)) {
      return { table: tableName, count: 0, skipped: 'table_missing' };
    }
    // Column-missing or RLS-blocked rows are also non-fatal; report.
    if (/column .* does not exist/i.test(error.message)) {
      return { table: tableName, count: 0, skipped: 'org_id_column_missing' };
    }
    throw new Error(`cleanup-test-tenant: delete on ${tableName} failed — ${error.message}`);
  }
  return { table: tableName, count: count ?? 0 };
}

/**
 * Public entry point. Pass a Supabase client (service-role recommended).
 *
 * @param {object} opts
 * @param {object} opts.client     A configured @supabase/supabase-js client.
 * @param {function} [opts.log]    Optional log sink (defaults to console.log).
 * @returns {Promise<{ org_id: string|null, perTable: object[], total: number }>}
 */
export async function cleanupTestTenant({ client, log = (m) => process.stdout.write(`${m}\n`) }) {
  if (!client || typeof client.from !== 'function') {
    throw new TypeError('cleanupTestTenant: { client } is required (Supabase client)');
  }

  const testOrgId = await resolveTestTenantOrgId(client);
  if (testOrgId === null) {
    log('cleanup-test-tenant: _test organization not found (migration 0012 not yet applied). No-op.');
    return { org_id: null, perTable: [], total: 0 };
  }

  log(`cleanup-test-tenant: resolved _test → org_id=${testOrgId}; cleaning ${TENANT_SCOPED_TABLES.length} tables...`);

  const perTable = [];
  let total = 0;
  for (const table of TENANT_SCOPED_TABLES) {
    const result = await deleteTenantRows(client, table, testOrgId);
    perTable.push(result);
    total += result.count;
    log(`  ${table.padEnd(40, ' ')} deleted=${result.count}${result.skipped ? ` (skipped: ${result.skipped})` : ''}`);
  }

  log(`cleanup-test-tenant: done. total_rows_deleted=${total}; _test organization row preserved.`);
  return { org_id: testOrgId, perTable, total };
}

/**
 * The fixed list of tenant-scoped tables — exported so tests can
 * assert against it without re-deriving the list.
 */
export { TENANT_SCOPED_TABLES, TEST_CLERK_ORG_ID };

// ─────────────────────────────────────────────────────────────────────
// CLI entry point.
// ─────────────────────────────────────────────────────────────────────
//
// Invoked as `node scripts/cleanup-test-tenant.mjs`. Uses
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the environment.
// Library callers (W4 test harness) should import { cleanupTestTenant }
// and pass their own client.

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    process.stderr.write(
      'cleanup-test-tenant: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars required for CLI mode.\n',
    );
    process.exit(2);
  }
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const summary = await cleanupTestTenant({ client });
    process.stdout.write(`\nsummary: ${JSON.stringify(summary, null, 2)}\n`);
    process.exit(0);
  } catch (e) {
    process.stderr.write(`cleanup-test-tenant: CRASH — ${e?.stack ?? e}\n`);
    process.exit(1);
  }
}
