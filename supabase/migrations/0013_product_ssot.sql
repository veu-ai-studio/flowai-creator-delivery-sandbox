-- 0013_product_ssot.sql
-- ProductSSOT entity per CANONICAL_REFERENCE §7.5 + PRODUCT_SSOT_SPEC v3
-- (commit `030149f`), §2 schema. Builds the durable per-product per-
-- environment living-document record that every pipeline run must
-- atomically write per §7 Output Contract item #5.
--
-- Closes FOUNDATION_AUDIT_BACKLOG P0-2 (entity UNBUILT) and unblocks
-- P0-5 (atomic write — the application-level write logic lands in a
-- separate W2 + W5x dispatch; this migration is the substrate only).
--
-- Two tables:
--   product_ssot         — one row per (product_id, environment) pair,
--                          with the 6 canonical jsonb blocks per §7.5.
--   product_ssot_version — append-only version log per CEO Q4 HYBRID
--                          disposition (append-only DB + UI-synthesis
--                          view). Hash-chain pointer mirrors the §14.2
--                          tamper-evidence pattern.
--
-- RLS: 4 read-only policies on product_ssot, one per role. Writes are
-- gated at the application layer (Agent #21 + Agent #3 executors via
-- the EXECUTOR_REGISTRY sibling per CA-7 §15.5).
--
-- DROP-IF-EXISTS is used on every policy so the migration is idempotent.

-- ════════════════════════════════════════════════════════════════════
-- 1. product_ssot table
-- ════════════════════════════════════════════════════════════════════

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

-- ════════════════════════════════════════════════════════════════════
-- 2. product_ssot_version table (append-only version log per CEO Q4)
-- ════════════════════════════════════════════════════════════════════

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

-- ════════════════════════════════════════════════════════════════════
-- 3. Row-Level Security — enable on both tables
-- ════════════════════════════════════════════════════════════════════

alter table public.product_ssot         enable row level security;
alter table public.product_ssot_version enable row level security;

-- ════════════════════════════════════════════════════════════════════
-- 4. Policies on product_ssot (read-only, 4 roles)
-- ════════════════════════════════════════════════════════════════════

drop policy if exists product_ssot_admin_read on public.product_ssot;
create policy product_ssot_admin_read
  on public.product_ssot
  for select
  using (
    auth.jwt() ->> 'role' = 'admin'
  );

drop policy if exists product_ssot_operator_read on public.product_ssot;
create policy product_ssot_operator_read
  on public.product_ssot
  for select
  using (
    auth.jwt() ->> 'role' = 'operator'
    and exists (
      select 1 from public.products p
      where p.id = product_ssot.product_id
      and p.org_id = auth.jwt() ->> 'org_id'
    )
  );

drop policy if exists product_ssot_client_read on public.product_ssot;
create policy product_ssot_client_read
  on public.product_ssot
  for select
  using (
    auth.jwt() ->> 'role' = 'client'
    and exists (
      select 1 from public.products p
      where p.id = product_ssot.product_id
      and p.org_id = auth.jwt() ->> 'org_id'
    )
  );

drop policy if exists product_ssot_flowai_audit_read on public.product_ssot;
create policy product_ssot_flowai_audit_read
  on public.product_ssot
  for select
  using (
    auth.jwt() ->> 'role' = 'flowai_audit'
  );
