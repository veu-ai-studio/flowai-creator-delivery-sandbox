import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../supabase/migrations/0036_staging_product_registry_service_role_select.sql', import.meta.url), 'utf8').toLowerCase();

describe('staging product_registry runtime ACL', () => {
  it('grants service_role only the SELECT privilege required by rate-cap checks', () => {
    expect(sql).toContain('revoke all privileges on table public.product_registry from service_role');
    expect(sql).toContain('grant select on table public.product_registry to service_role');
    expect(sql).not.toMatch(/grant\s+(insert|update|delete|truncate|references|trigger)/);
  });

  it('contains no data mutation, production routing, or privilege bypass', () => {
    expect(sql).not.toMatch(/\b(insert into|update|delete from|security definer|bypassrls|alter default privileges)\b/);
    expect(sql).not.toContain('production');
  });
});
