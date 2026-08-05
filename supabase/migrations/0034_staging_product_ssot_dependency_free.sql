-- Dependency-free staging derivative of 0013_product_ssot.sql.
-- Intended only for staging project rsulqkfweaxrhuzjhjrs after independent review.

create table if not exists public.product_ssot (
  id                        uuid primary key default gen_random_uuid(),
  product_id                text not null,
  environment               text not null check (environment in ('dev', 'stg', 'prd')),
  identity_block            jsonb       not null default '{}'::jsonb,
  build_brief               jsonb       not null default '{}'::jsonb,
  architecture_snapshot     jsonb       not null default '{}'::jsonb,
  delta_log                 jsonb[]     not null default '{}'::jsonb[],
  governance_record         jsonb[]     not null default '{}'::jsonb[],
  annotations               jsonb[]     not null default '{}'::jsonb[],
  overrides                 jsonb[]     not null default '{}'::jsonb[],
  version                   integer     not null default 1,
  audit_hash_chain_pointer  text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (product_id, environment)
);

create index if not exists idx_product_ssot_product_id
  on public.product_ssot (product_id);

create index if not exists idx_product_ssot_environment
  on public.product_ssot (environment);

create table if not exists public.product_ssot_version (
  id               uuid primary key default gen_random_uuid(),
  product_ssot_id  uuid not null references public.product_ssot(id),
  version          integer not null,
  write_kind       text not null,
  written_by       text not null,
  snapshot_hash    text not null,
  prev_hash        text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_product_ssot_version_product_ssot_id
  on public.product_ssot_version (product_ssot_id);

alter table public.product_ssot enable row level security;
alter table public.product_ssot_version enable row level security;

-- Defense-in-depth tenant predicate. Client roles have no relation privileges;
-- if privileges are ever separately reviewed, rows remain bound to the existing
-- authoritative registry tuple and the caller's immutable JWT org claim.
drop policy if exists product_ssot_tenant_read on public.product_ssot;
create policy product_ssot_tenant_read
  on public.product_ssot
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.product_registry registry
      where registry.product_id = product_ssot.product_id
        and registry.environment = product_ssot.environment
        and registry.org_id = (select auth.jwt() ->> 'org_id')
    )
  );

revoke all on table public.product_ssot from public, anon, authenticated;
revoke all on table public.product_ssot_version from public, anon, authenticated;

grant select, insert, update on table public.product_ssot to service_role;
grant select, insert, delete on table public.product_ssot_version to service_role;
