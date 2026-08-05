import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationUrl = new URL(
  '../../supabase/migrations/0035_staging_product_ssot_service_role_acl.sql',
  import.meta.url,
);
const baseMigrationUrl = new URL(
  '../../supabase/migrations/0034_staging_product_ssot_dependency_free.sql',
  import.meta.url,
);
const sql = readFileSync(migrationUrl, 'utf8').toLowerCase().replace(/\s+/g, ' ');
const baseSql = readFileSync(baseMigrationUrl, 'utf8').toLowerCase().replace(/\s+/g, ' ');
const allTablePrivileges = ['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger'];

function applyAclMigration(state) {
  const next = structuredClone(state);
  for (const table of ['product_ssot', 'product_ssot_version']) {
    const revoke = new RegExp(`revoke all privileges on table public\\.${table} from service_role`);
    expect(sql).toMatch(revoke);
    next[table] = [];
  }
  for (const match of sql.matchAll(/grant ([a-z, ]+) on table public\.(product_ssot(?:_version)?) to service_role/g)) {
    next[match[2]] = match[1].split(',').map((privilege) => privilege.trim()).sort();
  }
  return next;
}

describe('staging product_ssot service_role ACL reconciliation', () => {
  it('captures the observed before state across every table privilege', () => {
    const before = {
      product_ssot: ['select', 'insert', 'update', 'truncate', 'references', 'trigger'],
      product_ssot_version: ['select', 'insert', 'delete', 'truncate', 'references', 'trigger'],
    };
    for (const tablePrivileges of Object.values(before)) {
      for (const privilege of tablePrivileges) expect(allTablePrivileges).toContain(privilege);
    }
    expect(before.product_ssot).not.toContain('delete');
    expect(before.product_ssot_version).not.toContain('update');
  });

  it('produces exactly the approved after state and no implicit table privileges', () => {
    const after = applyAclMigration({
      product_ssot: [...allTablePrivileges],
      product_ssot_version: [...allTablePrivileges],
    });
    expect(after).toEqual({
      product_ssot: ['insert', 'select', 'update'],
      product_ssot_version: ['delete', 'insert', 'select'],
    });
  });

  it('is idempotent when the same SQL is evaluated twice', () => {
    const before = {
      product_ssot: ['insert', 'references', 'select', 'trigger', 'truncate', 'update'],
      product_ssot_version: ['delete', 'insert', 'references', 'select', 'trigger', 'truncate'],
    };
    const once = applyAclMigration(before);
    const twice = applyAclMigration(once);
    expect(twice).toEqual(once);
  });

  it('touches only the two approved relations and service_role', () => {
    expect(sql.match(/public\.[a-z_]+/g)?.sort()).toEqual([
      'public.product_ssot',
      'public.product_ssot',
      'public.product_ssot_version',
      'public.product_ssot_version',
    ]);
    expect(sql).not.toMatch(/\b(public|anon|authenticated)\b[^;]*(grant|revoke)/);
    expect(sql).not.toMatch(/alter default privileges|create|insert into|(?:^|;) update |delete from|function|policy|row level security/);
  });

  it('leaves the base migration client revocations, RLS, and tenant policy intact', () => {
    expect(baseSql).toContain('revoke all on table public.product_ssot from public, anon, authenticated');
    expect(baseSql).toContain('revoke all on table public.product_ssot_version from public, anon, authenticated');
    expect(baseSql).toContain('alter table public.product_ssot enable row level security');
    expect(baseSql).toContain('alter table public.product_ssot_version enable row level security');
    expect(baseSql).toContain('create policy product_ssot_tenant_read');
  });
});
