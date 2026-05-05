-- 0004_tool_marketplace.sql
-- Tool Intelligence Marketplace — taxonomy, capability fingerprint,
-- ranking history, and outcome ledger.
--
-- Multi-tenant note: tool ranking is global by design (every VEUaaS tenant
-- benefits from the shared corpus of outcome data). Per-org override
-- preferences live separately in `marketplace_provider_preferences`.

-- ─── Categories ────────────────────────────────────────────────────────
create table if not exists tool_categories (
  id text primary key,                                 -- slug e.g. 'hosting'
  name text not null,
  description text not null,
  step_numbers int[] not null default '{}',           -- which lifecycle steps (1-8) this category serves
  display_order int not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists idx_tool_categories_step on tool_categories using gin (step_numbers);

-- ─── Tools (the canonical record per tool) ─────────────────────────────
create table if not exists tools (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                          -- e.g. 'vercel'
  category_id text not null references tool_categories(id) on delete cascade,
  name text not null,
  vendor text not null,
  description text not null,
  homepage_url text,
  pricing_url text,
  docs_url text,
  status_page_url text,

  -- Static facts (vendor-claimed)
  pricing_model text,                                  -- 'free_tier+usage' | 'subscription' | 'usage_only' | 'enterprise_quote' | 'open_source_self_host'
  has_free_tier boolean not null default false,
  free_tier_summary text,                              -- one-liner
  starting_paid_tier_usd numeric,                      -- cheapest paid plan / month
  pricing_unit text,                                   -- e.g. 'per request', 'per seat', 'per GB'
  pricing_notes text,                                  -- caveats

  -- Geographic + compliance posture
  region_strengths jsonb not null default '{}'::jsonb, -- { africa: 0-100, europe: 0-100, us: 0-100, asia: 0-100, latam: 0-100 }
  data_residency_options jsonb not null default '[]'::jsonb,  -- string[] e.g. ['us-east','eu-west','ap-south']
  compliance_certs text[] not null default '{}',       -- ['SOC2','ISO27001','HIPAA','GDPR','PCI']

  -- Integration posture
  integration_complexity int not null default 3 check (integration_complexity between 1 and 5),
                                                       -- 1 = trivial (drop-in SDK), 5 = expert-only
  setup_time_estimate_minutes int,                     -- typical first-success time
  primary_languages text[] not null default '{}',      -- ['javascript','python','go','rust']

  -- Vendor health signals
  last_funding_round text,                             -- 'pre-seed' | 'seed' | 'series-a' | ... | 'public' | 'profitable_bootstrapped' | 'unknown'
  last_funding_year int,
  public_incident_frequency text,                      -- 'low' | 'medium' | 'high' | 'unknown'

  -- Lock-in signals
  open_source boolean not null default false,
  self_hostable boolean not null default false,
  data_export_ease text,                               -- 'trivial' | 'moderate' | 'difficult' | 'impossible'

  -- Lifecycle posture
  status text not null default 'active',               -- 'active' | 'deprecated' | 'evaluation' | 'archived'
  needs_verification text[] not null default '{}',     -- field names where the seed value is uncertain
  metadata jsonb not null default '{}'::jsonb,

  embedding vector(1024),                              -- semantic search across tool descriptions

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tools_category on tools(category_id, status);
create index if not exists idx_tools_status on tools(status);
create index if not exists idx_tools_pricing on tools(has_free_tier, starting_paid_tier_usd);
create extension if not exists "pg_trgm";
create index if not exists idx_tools_name_trgm on tools using gin (name gin_trgm_ops);
create index if not exists idx_tools_embedding on tools using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- ─── Tool capabilities (key/value pairs per tool, free-form) ──────────
create table if not exists tool_capabilities (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references tools(id) on delete cascade,
  capability_name text not null,                       -- e.g. 'edge_runtime', 'auto_scaling', 'webhooks'
  capability_value text not null,                      -- e.g. 'yes', 'limited', '<details>'
  notes text,
  created_at timestamptz not null default now(),
  unique (tool_id, capability_name)
);

create index if not exists idx_tool_capabilities_tool on tool_capabilities(tool_id);
create index if not exists idx_tool_capabilities_name on tool_capabilities(capability_name);

-- ─── Tool rankings (per-dimension scores, snapshotted over time) ──────
create table if not exists tool_rankings (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references tools(id) on delete cascade,
  dimension text not null check (dimension in (
    'cost', 'quality', 'latency', 'integration_complexity',
    'data_residency', 'vendor_health', 'lock_in_risk'
  )),
  score numeric not null check (score between 0 and 100),
  evidence_count int not null default 0,               -- how many outcomes underpin this score
  evidence_source text not null default 'baseline',    -- 'baseline' (vendor-claimed) | 'observed' (from outcomes)
  notes text,
  computed_at timestamptz not null default now()
);

create index if not exists idx_tool_rankings_tool on tool_rankings(tool_id, dimension, computed_at desc);
create index if not exists idx_tool_rankings_dim on tool_rankings(dimension, score desc);

-- ─── Tool outcomes (one row per use of a tool in a lifecycle run) ────
create table if not exists tool_outcomes (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references tools(id) on delete cascade,
  org_id uuid,                                         -- which tenant ran this
  product_id uuid,                                     -- which product was being built
  lifecycle_run_id uuid,                               -- references workspace_runs(id)
  step_number int check (step_number between 1 and 8),
  step_key text,                                       -- 'research' | 'design' | ... | 'monitor'
  success boolean,                                     -- did this step succeed?
  cost_usd numeric not null default 0,
  latency_ms int,
  quality_score numeric check (quality_score between 0 and 100),
  provider_satisfaction int check (provider_satisfaction between 1 and 5),
  error_type text,                                     -- when success=false
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_tool_outcomes_tool on tool_outcomes(tool_id, recorded_at desc);
create index if not exists idx_tool_outcomes_run on tool_outcomes(lifecycle_run_id);
create index if not exists idx_tool_outcomes_org on tool_outcomes(org_id, recorded_at desc);
create index if not exists idx_tool_outcomes_step on tool_outcomes(step_number, success);

-- ─── Recommendations (audit trail of every recommend() call) ──────────
create table if not exists tool_recommendations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  product_id uuid,
  lifecycle_run_id uuid,
  step_number int check (step_number between 1 and 8),
  category_id text references tool_categories(id),
  context jsonb not null,                              -- the full input context
  recommendations jsonb not null,                      -- the full output (top N)
  picked_tool_id uuid references tools(id),            -- nullable until provider chooses
  picked_at timestamptz,
  override_tool_id uuid references tools(id),          -- if provider picked something other than rank 1
  rationale_summary text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tool_recommendations_org on tool_recommendations(org_id, created_at desc);
create index if not exists idx_tool_recommendations_run on tool_recommendations(lifecycle_run_id);
create index if not exists idx_tool_recommendations_picked on tool_recommendations(picked_tool_id)
  where picked_tool_id is not null;

-- ─── Provider preferences (per-org weight overrides) ──────────────────
create table if not exists marketplace_provider_preferences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique,
  weight_overrides jsonb not null default '{}'::jsonb, -- { cost: 0.3, quality: 0.2, ... }
  preferred_tool_ids uuid[] not null default '{}',     -- explicit favourites
  blocked_tool_ids uuid[] not null default '{}',       -- explicit excludes
  data_sovereignty_required text[] not null default '{}', -- ['eu','africa']
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_provider_preferences_org on marketplace_provider_preferences(org_id);

-- ─── RLS scaffolding ──────────────────────────────────────────────────
alter table tool_categories enable row level security;
alter table tools enable row level security;
alter table tool_capabilities enable row level security;
alter table tool_rankings enable row level security;
alter table tool_outcomes enable row level security;
alter table tool_recommendations enable row level security;
alter table marketplace_provider_preferences enable row level security;

-- TODO(tomorrow): RLS policies — global read on tool_categories / tools /
-- tool_capabilities / tool_rankings (everyone benefits from shared data);
-- per-org write on tool_outcomes / tool_recommendations; per-org read+write
-- on marketplace_provider_preferences.

-- ─── Touch trigger ────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'tools_touch') then
    create trigger tools_touch before update on tools for each row execute function _touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'marketplace_provider_preferences_touch') then
    create trigger marketplace_provider_preferences_touch before update on marketplace_provider_preferences for each row execute function _touch_updated_at();
  end if;
end $$;

comment on table tools is 'Canonical tool record. Updated via /api/marketplace/admin/tools.';
comment on table tool_outcomes is 'One row per tool usage in a lifecycle run. Drives the dynamic ranking layer.';
comment on table tool_rankings is 'Snapshotted per-dimension scores. Latest row per (tool_id, dimension) is the active ranking.';
