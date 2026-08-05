import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationUrl = new URL(
  '../../supabase/migrations/0034_staging_product_ssot_dependency_free.sql',
  import.meta.url,
);
const sourceUrl = new URL('../../supabase/migrations/0013_product_ssot.sql', import.meta.url);
const sql = readFileSync(migrationUrl, 'utf8');
const normalized = sql.toLowerCase().replace(/\s+/g, ' ');

describe('dependency-free staging product_ssot migration', () => {
  it('is derived from the independently identified reviewed source', () => {
    expect(createHash('sha256').update(readFileSync(sourceUrl)).digest('hex').toUpperCase())
      .toBe('74E11C59782318A4DF76056ED9DD220301E45B3B4BD7364E4FB7FB2A571EC44F');
  });

  it('preserves the tables, columns, constraints, and rate-cap indexes from 0013', () => {
    for (const column of [
      'id', 'product_id', 'environment', 'identity_block', 'build_brief',
      'architecture_snapshot', 'delta_log', 'governance_record', 'annotations',
      'overrides', 'version', 'audit_hash_chain_pointer', 'created_at', 'updated_at',
      'product_ssot_id', 'write_kind', 'written_by', 'snapshot_hash', 'prev_hash',
    ]) expect(normalized).toContain(column);
    expect(normalized).toContain("check (environment in ('dev', 'stg', 'prd'))");
    expect(normalized).toContain('unique (product_id, environment)');
    expect(normalized).toContain('idx_product_ssot_product_id');
    expect(normalized).toContain('idx_product_ssot_environment');
    expect(normalized).toContain('idx_product_ssot_version_product_ssot_id');
  });

  it('is dependency-independent from the absent products table and uses the registry tenant tuple', () => {
    expect(normalized).not.toMatch(/public\.products\b/);
    expect(normalized).toContain('from public.product_registry registry');
    expect(normalized).toContain('registry.product_id = product_ssot.product_id');
    expect(normalized).toContain('registry.environment = product_ssot.environment');
    expect(normalized).toContain("registry.org_id = (select auth.jwt() ->> 'org_id')");
  });

  it('enables RLS and keeps anon/authenticated relation access revoked', () => {
    expect(normalized).toContain('alter table public.product_ssot enable row level security');
    expect(normalized).toContain('alter table public.product_ssot_version enable row level security');
    expect(normalized).toContain('revoke all on table public.product_ssot from public, anon, authenticated');
    expect(normalized).toContain('revoke all on table public.product_ssot_version from public, anon, authenticated');
  });

  it('grants only runtime-required service-role privileges', () => {
    expect(normalized).toContain('grant select, insert, update on table public.product_ssot to service_role');
    expect(normalized).toContain('grant select, insert, delete on table public.product_ssot_version to service_role');
    expect(normalized).not.toContain('grant all');
    expect(normalized).not.toMatch(/grant[^;]*delete[^;]*product_ssot to service_role/);
    expect(normalized).not.toMatch(/grant[^;]*update[^;]*product_ssot_version to service_role/);
    expect(normalized).not.toContain('usage on sequence');
  });

  it('is idempotent and contains no seed rows or privileged executable code', () => {
    expect((normalized.match(/create table if not exists/g) || [])).toHaveLength(2);
    expect((normalized.match(/create index if not exists/g) || [])).toHaveLength(3);
    expect(normalized).toContain('drop policy if exists product_ssot_tenant_read');
    expect(normalized).not.toMatch(/insert\s+into/);
    expect(normalized).not.toContain('security definer');
    expect(normalized).not.toMatch(/create\s+(or\s+replace\s+)?function/);
  });
});
