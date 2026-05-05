-- 0002_super_customer.sql
-- Super Customer Agent persistence — audit_runs, audit_issues, audit_surfaces.
--
-- Multi-tenant: every row carries org_id from row 1. product_id is the
-- canonical join into the products table. run_id is the FK from issues +
-- surfaces back to runs.
--
-- Indexes are tuned for the four primary query patterns:
--   1. List runs for an org/product (Portfolio Dashboard "audits per product")
--   2. List issues for a run (Audit Detail page)
--   3. List issues by severity (open P0s widget)
--   4. List surfaces for a run (drill-down view)

-- ─── audit_runs ────────────────────────────────────────────────────────
create table if not exists audit_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,                                 -- references organizations(id) — added as FK below
  product_id uuid,                                       -- references products(id)
  target_url text not null,
  depth text not null default 'standard',               -- 'quick' | 'standard' | 'full'
  status text not null default 'queued',                -- 'queued' | 'running' | 'completed' | 'failed'
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms int,                                       -- denormalised for fast list views
  surfaces_count int not null default 0,
  total_issues int not null default 0,
  p0_count int not null default 0,
  p1_count int not null default 0,
  p2_count int not null default 0,
  p3_count int not null default 0,
  health_score int,                                      -- 0-100; null while running
  cost_usd numeric not null default 0,
  cost_caps jsonb,                                       -- { soft, hard }
  notes text[],                                          -- run-level operator notes
  summary_text text,                                     -- the executive summary markdown
  action_plan jsonb,                                     -- the structured plan json
  run_payload jsonb,                                     -- denormalised full run shape (mirrors what's in /api/audits/super-customer/results)
  embedding vector(1024),                                -- semantic search across audits
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_audit_runs_org on audit_runs(org_id, started_at desc);
create index if not exists idx_audit_runs_product on audit_runs(product_id, started_at desc);
create index if not exists idx_audit_runs_status on audit_runs(org_id, status);
create index if not exists idx_audit_runs_score on audit_runs(org_id, health_score)
  where health_score is not null;
create index if not exists idx_audit_runs_target on audit_runs(target_url);
create index if not exists idx_audit_runs_embedding on audit_runs using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- ─── audit_surfaces ─────────────────────────────────────────────────────
create table if not exists audit_surfaces (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references audit_runs(id) on delete cascade,
  org_id uuid not null,                                 -- denormalised for fast scoping (avoid join)
  product_id uuid,
  surface_index int,                                     -- 0-based ordinal within the run
  surface_type text default 'page',                      -- 'page' | 'modal' | 'flow' | 'engine'
  url text not null,
  final_url text,                                        -- after redirects
  http_status int,
  load_time_ms int,
  dom_content_loaded_ms int,
  navigation_ms int,
  title text,
  meta_description text,
  capture_method text,                                   -- 'browserless' | 'simple-fetch'
  js_rendered boolean,
  capture_error text,                                    -- non-null when capture failed
  console_errors jsonb default '[]'::jsonb,
  network_errors jsonb default '[]'::jsonb,
  network_calls jsonb,                                   -- HAR-style; populated by V2 instrumentation
  accessibility_violations jsonb default '[]'::jsonb,    -- axe-core output (V2)
  accessibility_summary jsonb,                           -- v1: { headingHierarchyOk, totalImages, imagesMissingAlt }
  surface_counts jsonb,                                  -- { links, buttons, forms, images }
  screenshot_url text,                                   -- once Vercel Blob / Supabase Storage activates
  screenshot_size_kb int,
  analysis_text text,                                    -- Claude per-surface analysis (markdown)
  analysis_json jsonb,                                   -- structured { summary, primary_action, issues[], health_score }
  analysis_error text,
  surface_health_score int,                              -- 0-100 per surface
  embedding vector(1024),
  captured_at timestamptz not null default now()
);

create index if not exists idx_audit_surfaces_run on audit_surfaces(run_id);
create index if not exists idx_audit_surfaces_org on audit_surfaces(org_id, captured_at desc);
create index if not exists idx_audit_surfaces_product on audit_surfaces(product_id);
create index if not exists idx_audit_surfaces_url on audit_surfaces(url);
create index if not exists idx_audit_surfaces_score on audit_surfaces(run_id, surface_health_score);
create index if not exists idx_audit_surfaces_embedding on audit_surfaces using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- ─── audit_issues ──────────────────────────────────────────────────────
create table if not exists audit_issues (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references audit_runs(id) on delete cascade,
  surface_id uuid references audit_surfaces(id) on delete set null,
  org_id uuid not null,
  product_id uuid,
  severity text not null,                                -- 'P0' | 'P1' | 'P2' | 'P3'
  category text not null,                                -- 'functional' | 'performance' | 'accessibility' | 'security' | 'data' | 'content' | 'design' | 'trust' | 'conversion' | 'compliance'
  title text not null,
  description text,
  reproduction_steps jsonb default '[]'::jsonb,          -- string[]
  proposed_solution text,
  estimated_effort text,                                 -- 'trivial' | 'small' | 'medium' | 'large'
  surface_url text,
  screenshot_url text,                                   -- specific screenshot for this issue
  status text not null default 'open',                   -- 'open' | 'in_progress' | 'fixed' | 'wontfix' | 'duplicate'
  assigned_to uuid,                                      -- references users(id)
  resolved_at timestamptz,
  resolved_by uuid,
  external_ticket_id text,                               -- linked Linear/Jira/etc id
  embedding vector(1024),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_audit_issues_run on audit_issues(run_id, severity);
create index if not exists idx_audit_issues_org on audit_issues(org_id, created_at desc);
create index if not exists idx_audit_issues_product on audit_issues(product_id, severity);
create index if not exists idx_audit_issues_severity on audit_issues(org_id, severity, status);
create index if not exists idx_audit_issues_status on audit_issues(org_id, status);
create index if not exists idx_audit_issues_category on audit_issues(org_id, category);
create index if not exists idx_audit_issues_assigned on audit_issues(assigned_to)
  where assigned_to is not null;
create index if not exists idx_audit_issues_embedding on audit_issues using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Composite for the "open P0s by product" widget
create index if not exists idx_audit_issues_p0_open on audit_issues(product_id, severity, status)
  where severity = 'P0' and status = 'open';

-- ─── FKs to existing tables (deferred so the migration doesn't fail
--     when applied to a fresh DB without organizations/products yet) ─────
do $$ begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'audit_runs_org_id_fkey') then
    alter table audit_runs
      add constraint audit_runs_org_id_fkey
      foreign key (org_id) references organizations(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'audit_runs_product_id_fkey') then
    alter table audit_runs
      add constraint audit_runs_product_id_fkey
      foreign key (product_id) references products(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'audit_surfaces_org_id_fkey') then
    alter table audit_surfaces
      add constraint audit_surfaces_org_id_fkey
      foreign key (org_id) references organizations(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'audit_surfaces_product_id_fkey') then
    alter table audit_surfaces
      add constraint audit_surfaces_product_id_fkey
      foreign key (product_id) references products(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'audit_issues_org_id_fkey') then
    alter table audit_issues
      add constraint audit_issues_org_id_fkey
      foreign key (org_id) references organizations(id) on delete cascade;
  end if;
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'audit_issues_product_id_fkey') then
    alter table audit_issues
      add constraint audit_issues_product_id_fkey
      foreign key (product_id) references products(id) on delete set null;
  end if;
end $$;

-- ─── Auto-update updated_at ────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'audit_runs_touch') then
    create trigger audit_runs_touch before update on audit_runs for each row execute function _touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'audit_issues_touch') then
    create trigger audit_issues_touch before update on audit_issues for each row execute function _touch_updated_at();
  end if;
end $$;

-- ─── RLS scaffolding (off by default; activate when Clerk JWT lands) ─
alter table audit_runs enable row level security;
alter table audit_surfaces enable row level security;
alter table audit_issues enable row level security;

-- TODO(tomorrow): policies that filter by org_id from auth.jwt() ->> 'org_id'.
-- Service role (used by the API server) bypasses RLS, so /api/audits/* works today.

-- ─── Convenience view for the FlowAI UI ────────────────────────────────
create or replace view audit_runs_with_open_issues as
  select
    r.*,
    (select count(*) from audit_issues i where i.run_id = r.id and i.severity = 'P0' and i.status = 'open') as open_p0,
    (select count(*) from audit_issues i where i.run_id = r.id and i.severity = 'P1' and i.status = 'open') as open_p1,
    (select count(*) from audit_issues i where i.run_id = r.id and i.severity in ('P0','P1') and i.status = 'fixed') as fixed_high
  from audit_runs r;

comment on table audit_runs is 'Super Customer Agent run records. One row per audit invocation.';
comment on table audit_surfaces is 'Per-surface capture + analysis. ~5-30 rows per audit run.';
comment on table audit_issues is 'Severity-classified issues. Multiple per surface.';
