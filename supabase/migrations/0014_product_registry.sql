-- ════════════════════════════════════════════════════════════════════
-- Migration 0014 — product_registry table + Self-Renewal columns
-- ════════════════════════════════════════════════════════════════════
--
-- Spec: docs/specs/SELF_RENEWAL_SPEC.md v4 (frozen at cd07328).
-- Adds the operator-facing `product_registry` table that the spec
-- references throughout for per-product Self-Renewal configuration.
-- All 13 `self_renewal_*` columns + `github_repo_url` +
-- `vercel_project_id` land here.
--
-- Idempotent: every CREATE uses IF NOT EXISTS; every DROP POLICY uses
-- IF EXISTS. Safe to re-apply.

-- ════════════════════════════════════════════════════════════════════
-- 1. Table
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.product_registry (
  id                                       uuid primary key default gen_random_uuid(),
  product_id                               text not null unique,
  org_id                                   text not null,
  github_repo_url                          text,
  vercel_project_id                        text,
  environment                              text not null default 'dev'
    check (environment in ('dev', 'stg', 'prd')),

  -- Self-Renewal feature surface — all defaults are SAFE-OFF except
  -- where the spec explicitly requires a different default.
  self_renewal_enabled                     boolean        default false,
  self_renewal_credential_mode             text           default 'app'
    check (self_renewal_credential_mode in ('app', 'pat_fallback')),
  self_renewal_negative_delta_policy       text           default 'ALWAYS_OPEN'
    check (self_renewal_negative_delta_policy in ('ALWAYS_OPEN', 'DISCARD_ON_NEGATIVE')),
  self_renewal_minimum_delta               integer        default 0,
  self_renewal_substantial_threshold       integer        default 5,
  self_renewal_max_per_day                 integer        default 1,
  self_renewal_runaway_threshold           integer        default 3,
  self_renewal_branch_retention_days       integer        default 7,
  self_renewal_smoke_selectors             jsonb          default '[]'::jsonb,
  self_renewal_scope_rollback              boolean        default false,
  self_renewal_severity_floor              text           default 'medium'
    check (self_renewal_severity_floor in ('low', 'medium', 'high', 'critical')),
  self_renewal_disabled                    boolean        default false,
  self_renewal_max_cost_usd                numeric(10, 4) default 10.0,

  created_at                               timestamptz not null default now(),
  updated_at                               timestamptz not null default now(),

  -- Spec §6.4 R2 cross-field validation: writes with
  -- DISCARD_ON_NEGATIVE AND minimum_delta < 0 must be rejected.
  constraint product_registry_negative_delta_cross_check check (
    not (
      self_renewal_negative_delta_policy = 'DISCARD_ON_NEGATIVE'
      and self_renewal_minimum_delta < 0
    )
  )
);

create index if not exists idx_product_registry_org_id
  on public.product_registry (org_id);

create index if not exists idx_product_registry_environment
  on public.product_registry (environment);

create index if not exists idx_product_registry_self_renewal_enabled
  on public.product_registry (self_renewal_enabled)
  where self_renewal_enabled = true;

-- ════════════════════════════════════════════════════════════════════
-- 2. updated_at trigger
-- ════════════════════════════════════════════════════════════════════

create or replace function public.product_registry_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists product_registry_set_updated_at on public.product_registry;
create trigger product_registry_set_updated_at
  before update on public.product_registry
  for each row
  execute function public.product_registry_set_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- 3. RLS
-- ════════════════════════════════════════════════════════════════════

alter table public.product_registry enable row level security;

-- Service role: full read/write. Postgrest's service_role JWT bypasses
-- RLS at the role level by default, but adding an explicit policy makes
-- the intent visible to operators reading the schema.
drop policy if exists product_registry_service_role_all on public.product_registry;
create policy product_registry_service_role_all
  on public.product_registry
  for all
  using (
    auth.jwt() ->> 'role' = 'service_role'
  )
  with check (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Admin read.
drop policy if exists product_registry_admin_read on public.product_registry;
create policy product_registry_admin_read
  on public.product_registry
  for select
  using (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Admin write — admins manage product_registry rows via the admin UI.
drop policy if exists product_registry_admin_write on public.product_registry;
create policy product_registry_admin_write
  on public.product_registry
  for all
  using (
    auth.jwt() ->> 'role' = 'admin'
  )
  with check (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Operator read — scoped to their own org.
drop policy if exists product_registry_operator_read on public.product_registry;
create policy product_registry_operator_read
  on public.product_registry
  for select
  using (
    auth.jwt() ->> 'role' = 'operator'
    and org_id = auth.jwt() ->> 'org_id'
  );

-- ════════════════════════════════════════════════════════════════════
-- 4. Seed the 5 VEU products
-- ════════════════════════════════════════════════════════════════════
--
-- ON CONFLICT (product_id) DO NOTHING so re-running this migration in
-- an environment with existing data is safe. Operators can update via
-- the admin UI after the initial seed; subsequent migration re-runs
-- do not clobber operator edits.

insert into public.product_registry (
  product_id, org_id, github_repo_url, environment, self_renewal_enabled
) values
  ('saige',      'veu-ai-studio', 'https://github.com/veu-ai-studio/saige',        'prd', false),
  ('reltwin',    'veu-ai-studio', 'https://github.com/veu-ai-studio/rel-twin',     'prd', false),
  ('reachsms',   'veu-ai-studio', 'https://github.com/veu-ai-studio/reachsms',     'prd', false),
  ('pressai',    'veu-ai-studio', 'https://github.com/veu-ai-studio/press-ai',     'prd', false),
  -- mypreglife is the first Phase A test target — self_renewal_enabled is true.
  ('mypreglife', 'veu-ai-studio', 'https://github.com/veu-ai-studio/my-preg-life', 'prd', true)
on conflict (product_id) do nothing;

-- ════════════════════════════════════════════════════════════════════
-- 5. Documentation comments
-- ════════════════════════════════════════════════════════════════════

comment on table public.product_registry is
  'Per-product Self-Renewal configuration + GitHub/Vercel routing. Spec: SELF_RENEWAL_SPEC.md v4 (frozen cd07328). One row per (product_id, environment) intended; UNIQUE constraint enforced on product_id alone for Phase A — multi-environment per product deferred to a later migration if needed.';

comment on column public.product_registry.self_renewal_credential_mode is
  'Spec §3.2 R3: "app" (default GitHub App primary path) or "pat_fallback" (branch-scoped fine-grained PAT — per-product opt-in only).';

comment on column public.product_registry.self_renewal_negative_delta_policy is
  'Spec §6.4 R2: "ALWAYS_OPEN" (open PR regardless of delta sign) or "DISCARD_ON_NEGATIVE" (silent-close when delta < 0).';

comment on column public.product_registry.self_renewal_minimum_delta is
  'Spec §6.4 R2: integer threshold; opening a PR requires delta_total >= this value. Default 0. Cannot be negative when policy = DISCARD_ON_NEGATIVE (cross-field constraint enforced above).';

comment on column public.product_registry.self_renewal_substantial_threshold is
  'Spec §6.4 R1: integer threshold for the "substantial improvement" label/gate. Default +5.';

comment on column public.product_registry.self_renewal_max_per_day is
  'Spec §4.7 R5: hard rate cap — renewal cycles per rolling 24-hour window. Default 1.';

comment on column public.product_registry.self_renewal_runaway_threshold is
  'Spec §4.7 R5: N consecutive runs failing the same gate auto-disables Self-Renewal for the product. Default 3.';

comment on column public.product_registry.self_renewal_branch_retention_days is
  'Spec §5.7 R6: flowai/renewal-* branches older than this many days WITHOUT an open PR are deleted by the nightly cleanup job. Default 7.';

comment on column public.product_registry.self_renewal_smoke_selectors is
  'Spec §4.4 R7: array of CSS selectors validated at registry-write time (must parse via document.querySelector without throwing). Gate-evaluation is a pure read.';
