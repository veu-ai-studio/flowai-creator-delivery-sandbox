-- 0001_initial.sql
-- FlowAI / VEUaaS multi-tenant baseline schema.
--
-- Conventions:
--   * Every domain row carries org_id from day one.
--   * Cross-cutting tables (cost_events, audit_log, run_steps) carry org_id
--     AND product_id AND run_id so all rollups are scope-able without joins.
--   * UUIDs everywhere — id columns default to gen_random_uuid().
--   * created_at / updated_at standard.
--   * Vector columns use pgvector (Supabase has it built in). Embeddings
--     dimension is 1024 (Voyage's voyage-3-lite default). Adjust if a
--     different model is selected later.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ─── Organizations (tenants) ────────────────────────────────────────────
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text unique,
  name text not null,
  slug text unique,
  plan text not null default 'free',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_org_clerk on organizations(clerk_org_id);
create index if not exists idx_org_slug on organizations(slug);

-- ─── Users (mirrors Clerk users for FK purposes) ────────────────────────
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  email text,
  full_name text,
  default_org_id uuid references organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_clerk on users(clerk_user_id);

-- ─── Membership (org ↔ user) ────────────────────────────────────────────
create table if not exists organization_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ─── Products ───────────────────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  url text default '',
  description text default '',
  type text default 'web',
  status text default 'draft',     -- draft | active | audited | archived
  tags text[] default '{}',
  last_audit_at timestamptz,
  last_audit_score numeric,
  cost_to_date_usd numeric not null default 0,
  embedding vector(1024),          -- Voyage embeddings, populated on update
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_org on products(org_id);
create index if not exists idx_products_status on products(org_id, status);
create index if not exists idx_products_updated on products(org_id, updated_at desc);
create index if not exists idx_products_url on products(url);
-- Trigram name search; fast for "name like '%xxx%'" lookups
create extension if not exists "pg_trgm";
create index if not exists idx_products_name_trgm on products using gin (name gin_trgm_ops);
-- Vector similarity index (ivfflat — cheap to maintain, good enough at this scale)
create index if not exists idx_products_embedding on products using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ─── Workspaces (saved configs reusable across runs) ────────────────────
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_workspaces_org on workspaces(org_id);
create index if not exists idx_workspaces_product on workspaces(product_id);

-- ─── Workspace runs (Auto Runner / Guided / Manual sessions) ────────────
create table if not exists workspace_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  workspace_id uuid references workspaces(id) on delete set null,
  mode text not null default 'auto',      -- auto | guided | manual
  status text not null default 'running', -- running | paused | completed | failed
  inputs jsonb not null default '[]'::jsonb,
  objective text,
  auto_params jsonb,
  multi_mode text,
  current_step int not null default 0,
  total_cost_usd numeric not null default 0,
  started_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_runs_org on workspace_runs(org_id);
create index if not exists idx_runs_product on workspace_runs(product_id);
create index if not exists idx_runs_status on workspace_runs(org_id, status);
create index if not exists idx_runs_created on workspace_runs(org_id, created_at desc);

-- ─── Run steps (per-step results for each run) ──────────────────────────
create table if not exists run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workspace_runs(id) on delete cascade,
  org_id uuid not null,
  product_id uuid,
  step_key text not null,                 -- research|design|build|qa_audit|deploy|govern|gtm|monitor
  step_number int,
  score numeric,
  verdict text,
  output_text text,                       -- truncated to 32k for storage hygiene
  output_json jsonb,
  est_usd numeric not null default 0,
  embedding vector(1024),                 -- semantic search across step outputs
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists idx_run_steps_run on run_steps(run_id);
create index if not exists idx_run_steps_org on run_steps(org_id);
create index if not exists idx_run_steps_product on run_steps(product_id);
create index if not exists idx_run_steps_step on run_steps(run_id, step_key);
create index if not exists idx_run_steps_embedding on run_steps using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ─── Cost events (every Claude call) ────────────────────────────────────
create table if not exists cost_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  product_id uuid,
  run_id uuid,
  endpoint text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_creation_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  est_usd numeric not null default 0,
  stop_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_cost_org on cost_events(org_id, created_at desc);
create index if not exists idx_cost_run on cost_events(run_id);
create index if not exists idx_cost_endpoint on cost_events(endpoint, created_at desc);

-- ─── Clearance checks ───────────────────────────────────────────────────
create table if not exists clearance_checks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  product_id uuid,
  run_id uuid,
  decision text not null,                 -- CLEARED | CONDITIONAL | NOT CLEARED | UNKNOWN
  score numeric,
  conditions jsonb default '[]'::jsonb,
  output_text text,
  embedding vector(1024),
  created_at timestamptz not null default now()
);

create index if not exists idx_clearance_org on clearance_checks(org_id, created_at desc);
create index if not exists idx_clearance_product on clearance_checks(product_id);
create index if not exists idx_clearance_decision on clearance_checks(org_id, decision);

-- ─── User sessions (browser → server attribution; fed by Clerk middleware) ──
create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  user_id uuid,
  clerk_session_id text,
  ip_addr inet,
  user_agent text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists idx_user_sessions_org on user_sessions(org_id, started_at desc);
create index if not exists idx_user_sessions_user on user_sessions(user_id);

-- ─── Audit log (governance trail) ───────────────────────────────────────
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  product_id uuid,
  run_id uuid,
  actor text not null default 'flowai-engine',
  action_type text not null,              -- step_completed | clearance_run | self_renewal_check | ...
  severity text not null default 'info',  -- info | warning | critical
  product_url text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_org on audit_log(org_id, created_at desc);
create index if not exists idx_audit_product on audit_log(product_id);
create index if not exists idx_audit_run on audit_log(run_id);
create index if not exists idx_audit_action on audit_log(action_type, created_at desc);

-- ─── RPC helpers ────────────────────────────────────────────────────────
create or replace function increment_product_cost(p_id uuid, p_amount numeric)
returns numeric language plpgsql as $$
declare new_total numeric;
begin
  update products
    set cost_to_date_usd = cost_to_date_usd + p_amount,
        updated_at = now()
    where id = p_id
    returning cost_to_date_usd into new_total;
  return new_total;
end;
$$;

-- ─── Auto-update updated_at ─────────────────────────────────────────────
create or replace function _touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin
  perform 1 from pg_trigger where tgname = 'organizations_touch';
  if not found then
    create trigger organizations_touch before update on organizations for each row execute function _touch_updated_at();
  end if;
  perform 1 from pg_trigger where tgname = 'products_touch';
  if not found then
    create trigger products_touch before update on products for each row execute function _touch_updated_at();
  end if;
  perform 1 from pg_trigger where tgname = 'workspaces_touch';
  if not found then
    create trigger workspaces_touch before update on workspaces for each row execute function _touch_updated_at();
  end if;
  perform 1 from pg_trigger where tgname = 'runs_touch';
  if not found then
    create trigger runs_touch before update on workspace_runs for each row execute function _touch_updated_at();
  end if;
end $$;

-- ─── RLS scaffolding (off by default; activate per-table tomorrow) ─────
-- All tables enable RLS; policies are added when Clerk JWT verification lands.
alter table organizations enable row level security;
alter table users enable row level security;
alter table organization_members enable row level security;
alter table products enable row level security;
alter table workspaces enable row level security;
alter table workspace_runs enable row level security;
alter table run_steps enable row level security;
alter table cost_events enable row level security;
alter table clearance_checks enable row level security;
alter table user_sessions enable row level security;
alter table audit_log enable row level security;

-- TODO(tomorrow): add policies that filter by org_id from auth.jwt() ->> 'org_id'.
-- Service-role key (used by the API server) bypasses RLS, so the API works today.

comment on schema public is 'FlowAI / VEUaaS — multi-tenant baseline schema (0001_initial)';
