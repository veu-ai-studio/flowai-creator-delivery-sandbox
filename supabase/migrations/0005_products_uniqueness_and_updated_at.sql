-- 0005_products_uniqueness_and_updated_at.sql
--
-- UX-2 Phase B follow-ups (per peer review S3 + S8):
--
--   S3 — No uniqueness constraint per org (org_id, url) allows duplicate
--        product cards. Add a partial unique index that ignores empty URLs
--        (since `url` defaults to '' in 0001_initial.sql and the schema
--        permits products without a live URL during draft).
--
--   S8 — `updated_at` defaults to now() on insert, but never auto-updates
--        on UPDATE. Recency sorting (the dashboard's default sort) drifts
--        as a result. Add a BEFORE UPDATE trigger to set updated_at = now()
--        on every modification.
--
-- Idempotent: every change uses `if not exists` / `or replace` so this
-- migration is safe to re-apply.

-- ── Reusable helper: set_updated_at() trigger function ──────────────────
-- Other tables in 0001_initial.sql could reuse this (workspace_runs,
-- run_steps, organizations, etc.) — landed here as `if not exists` so
-- earlier migrations aren't disturbed.

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── products(updated_at) auto-update trigger ────────────────────────────

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row
  execute procedure set_updated_at();

-- ── products(org_id, url) uniqueness ────────────────────────────────────
-- Partial: only enforced when url <> ''. A draft product without a live URL
-- is not a duplicate of another draft without a live URL — they're both
-- placeholders.

create unique index if not exists idx_products_org_url_unique
  on products(org_id, url)
  where url <> '';

-- ── products(org_id, lower(name)) uniqueness ────────────────────────────
-- Case-insensitive name uniqueness per tenant. Prevents 'SAIGE' and
-- 'saige' from both registering. Same tenant cannot have two cards with
-- the same display name.

create unique index if not exists idx_products_org_name_lower_unique
  on products(org_id, lower(name));

comment on index idx_products_org_url_unique is
  'UX-2 Phase B (peer S3): one product per (org_id, url) when url is set.';
comment on index idx_products_org_name_lower_unique is
  'UX-2 Phase B (peer S3): one product per (org_id, case-insensitive name).';
comment on function set_updated_at() is
  'UX-2 Phase B (peer S8): bump updated_at on every row UPDATE. Reusable.';
