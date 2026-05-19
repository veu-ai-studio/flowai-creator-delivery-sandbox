-- ════════════════════════════════════════════════════════════════════
-- Migration 0023 — Tool Intelligence: step_tool_rankings + product_registry mode
-- ════════════════════════════════════════════════════════════════════
--
-- Spec: W5b Tool Intelligence Service dispatch (2026-05-19).
--       Mission/Purpose amendment draft §3 (operating modes:
--       Manual/Guided/Automatic) + §8 Orchestra Selection axis.
--
-- WHY a new table name (`step_tool_rankings`) rather than the literal
-- `tool_rankings` named in the dispatch:
--   Migration 0004_tool_marketplace.sql already defines a different
--   `tool_rankings` table — a per-dimension score-history record
--   (tool_id, dimension, score, evidence_count, computed_at). That
--   table is consumed by api/_lib/jobs/marketplaceRerank.js and the
--   marketplace API surface; renaming or repurposing it would be a
--   destructive change to live infrastructure.
--   The Tool Intelligence Service introduced by W5b operates at a
--   different abstraction layer: per-step top-5 platform rankings
--   for the 8 FlowAI pipeline steps. The two coexist; this table is
--   named `step_tool_rankings` to make the disambiguation explicit.
--
-- Idempotent: every CREATE uses IF NOT EXISTS; ALTER uses IF NOT EXISTS
-- where supported; seed uses ON CONFLICT. Safe to re-apply.

-- ════════════════════════════════════════════════════════════════════
-- 1. step_tool_rankings table
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.step_tool_rankings (
  id                  uuid primary key default gen_random_uuid(),
  step_name           text not null
    check (step_name in (
      'research', 'design', 'build', 'qa_audit',
      'deploy', 'monitor', 'govern', 'gtm'
    )),
  rank                integer not null check (rank between 1 and 5),
  platform_name       text not null,
  platform_type       text not null,
  performance_score   numeric(4, 2) not null check (performance_score between 0 and 10),
  cost_score          numeric(4, 2) not null check (cost_score between 0 and 10),
  speed_score         numeric(4, 2) not null check (speed_score between 0 and 10),
  reliability_score   numeric(4, 2) not null check (reliability_score between 0 and 10),
  target_classes      text[] not null default '{}',
  last_updated        timestamptz not null default now(),
  notes               text,

  constraint step_tool_rankings_step_rank_unique unique (step_name, rank)
);

create index if not exists idx_step_tool_rankings_step
  on public.step_tool_rankings (step_name, rank);

create index if not exists idx_step_tool_rankings_target_classes
  on public.step_tool_rankings using gin (target_classes);

-- ════════════════════════════════════════════════════════════════════
-- 2. product_registry.tool_intelligence_mode column
-- ════════════════════════════════════════════════════════════════════
--
-- Mode comes from the product_registry row per the dispatch:
--   AUTOMATIC → service returns the rank-1 platform per step (default).
--   GUIDED    → service returns the top-5 list for human selection.
--   MANUAL    → service returns null (operator chooses outside the loop).

alter table public.product_registry
  add column if not exists tool_intelligence_mode text
    not null
    default 'AUTOMATIC'
    check (tool_intelligence_mode in ('AUTOMATIC', 'GUIDED', 'MANUAL'));

-- ════════════════════════════════════════════════════════════════════
-- 3. RLS
-- ════════════════════════════════════════════════════════════════════
-- Rankings are global (every tenant sees the same top-5 per step).
-- service_role writes via refreshRankings(); operators read.

alter table public.step_tool_rankings enable row level security;

drop policy if exists step_tool_rankings_service_role_all on public.step_tool_rankings;
create policy step_tool_rankings_service_role_all
  on public.step_tool_rankings
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists step_tool_rankings_global_read on public.step_tool_rankings;
create policy step_tool_rankings_global_read
  on public.step_tool_rankings
  for select
  using (true);

-- ════════════════════════════════════════════════════════════════════
-- 4. Initial seed — 5 platforms × 8 steps = 40 rows
-- ════════════════════════════════════════════════════════════════════
--
-- Scores reflect current market knowledge (2026-05-19) and the
-- existing TOOL_REGISTRY in src/lib/toolRegistry.js. They are starting
-- points for the symbiotic refreshRankings() loop, NOT final
-- assertions. recordUsage() feeds outcome data back; refreshRankings()
-- re-derives scores from accumulated outcomes + research signals.

insert into public.step_tool_rankings
  (step_name, rank, platform_name, platform_type, performance_score, cost_score, speed_score, reliability_score, target_classes, notes)
values
  -- ─── RESEARCH ───────────────────────────────────────────────────
  ('research', 1, 'Perplexity AI',  'ai_research',    9.0, 7.0, 9.0, 9.0, '{web,SaaS,agentic_ai,generic_url}', 'Cited answers + real-time web. Strong default.'),
  ('research', 2, 'Tavily',         'search_api',     8.0, 7.0, 9.0, 8.0, '{web,SaaS,agentic_ai,generic_url}', 'Purpose-built for agents.'),
  ('research', 3, 'Exa',            'search_api',     8.0, 8.0, 8.0, 8.0, '{web,SaaS,agentic_ai,generic_url}', 'Neural semantic search.'),
  ('research', 4, 'SerpAPI',        'search_api',     7.0, 6.0, 8.0, 8.0, '{web,SaaS,generic_url}', 'Google SERP fidelity.'),
  ('research', 5, 'You.com',        'search_api',     7.0, 8.0, 7.0, 7.0, '{web,SaaS,agentic_ai,generic_url}', 'AI search with customizable APIs.'),

  -- ─── DESIGN ─────────────────────────────────────────────────────
  ('design',   1, 'v0 by Vercel',   'ai_ui_gen',      9.0, 8.0, 9.0, 9.0, '{web,SaaS,generic_url}', 'Production-ready React output.'),
  ('design',   2, 'Figma',          'design_tool',    10.0, 7.0, 7.0, 10.0, '{web,SaaS,native_app,mobile_app,generic_url}', 'Industry standard collaborative design.'),
  ('design',   3, 'Framer',         'visual_builder', 9.0, 7.0, 8.0, 9.0, '{web,SaaS,generic_url}', 'Visual builder + CMS.'),
  ('design',   4, 'Lovable',        'ai_app_gen',     8.0, 8.0, 9.0, 7.0, '{web,SaaS,generic_url}', 'AI-powered full-stack from prompts.'),
  ('design',   5, 'Canva',          'visual_assets',  8.0, 8.0, 8.0, 9.0, '{web,SaaS,generic_url}', 'Marketing + brand asset surface.'),

  -- ─── BUILD ──────────────────────────────────────────────────────
  ('build',    1, 'Cursor',         'ai_ide',         9.0, 8.0, 9.0, 9.0, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}', 'Strong codebase context, fast iteration.'),
  ('build',    2, 'Base44',         'ai_fullstack',   9.0, 8.0, 8.0, 8.0, '{web,SaaS,generic_url}', 'Native FlowAI legacy substrate.'),
  ('build',    3, 'Bolt',           'ai_fullstack',   8.0, 8.0, 9.0, 7.0, '{web,SaaS,generic_url}', 'AI full-stack web builder.'),
  ('build',    4, 'Windsurf',       'ai_ide',         8.0, 8.0, 8.0, 8.0, '{web,SaaS,native_app,agentic_ai,generic_url}', 'Agentic coding environment.'),
  ('build',    5, 'Replit',         'cloud_ide',      8.0, 9.0, 7.0, 8.0, '{web,SaaS,generic_url}', 'Browser IDE + instant deploy.'),

  -- ─── QA_AUDIT (Quality Audit / Testing) ────────────────────────
  ('qa_audit', 1, 'Playwright',     'e2e_testing',    10.0, 10.0, 8.0, 10.0, '{web,SaaS,generic_url}', 'E2E browser testing, free + open source.'),
  ('qa_audit', 2, 'Vitest',         'unit_testing',   9.0, 10.0, 10.0, 9.0, '{web,SaaS,agentic_ai,generic_url}', 'Fast unit testing, Jest-compatible.'),
  ('qa_audit', 3, 'Cypress',        'e2e_testing',    9.0, 7.0, 8.0, 9.0, '{web,SaaS,generic_url}', 'Time-travel debugging.'),
  ('qa_audit', 4, 'Jest',           'unit_testing',   8.0, 10.0, 8.0, 8.0, '{web,SaaS,agentic_ai,generic_url}', 'JavaScript unit + snapshot.'),
  ('qa_audit', 5, 'Postman',        'api_testing',    9.0, 8.0, 8.0, 9.0, '{web,SaaS,agentic_ai,generic_url}', 'API testing + documentation.'),

  -- ─── DEPLOY ─────────────────────────────────────────────────────
  ('deploy',   1, 'Vercel',         'edge_hosting',   10.0, 8.0, 10.0, 10.0, '{web,SaaS,generic_url}', 'Edge network + serverless; FlowAI canonical deploy target.'),
  ('deploy',   2, 'Railway',        'fullstack_host', 9.0, 8.0, 9.0, 8.0, '{web,SaaS,generic_url}', 'Docker + DBs in one platform.'),
  ('deploy',   3, 'Fly.io',         'global_host',    9.0, 8.0, 9.0, 8.0, '{web,SaaS,generic_url}', 'Global edge deployment.'),
  ('deploy',   4, 'Netlify',        'frontend_host',  8.0, 8.0, 9.0, 8.0, '{web,SaaS,generic_url}', 'Frontend + edge functions.'),
  ('deploy',   5, 'Render',         'cloud_host',     8.0, 9.0, 7.0, 8.0, '{web,SaaS,generic_url}', 'Git-triggered cloud hosting.'),

  -- ─── MONITOR ────────────────────────────────────────────────────
  ('monitor',  1, 'Sentry',         'error_tracking', 10.0, 8.0, 9.0, 10.0, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}', 'Errors + perf monitoring; FlowAI canonical.'),
  ('monitor',  2, 'PostHog',        'product_analytics', 9.0, 9.0, 9.0, 9.0, '{web,SaaS,mobile_app,generic_url}', 'Analytics + session replay + flags.'),
  ('monitor',  3, 'Datadog',        'apm_full_stack', 9.0, 6.0, 9.0, 10.0, '{web,SaaS,native_app,generic_url}', 'Enterprise-grade APM + logs.'),
  ('monitor',  4, 'LogRocket',      'session_replay', 9.0, 7.0, 9.0, 8.0, '{web,SaaS,mobile_app,generic_url}', 'Session replay + frontend debug.'),
  ('monitor',  5, 'Uptime Robot',   'uptime_checks',  8.0, 9.0, 8.0, 8.0, '{web,SaaS,generic_url}', 'Uptime + alerts + status pages.'),

  -- ─── GOVERN (Self-Renewal) ─────────────────────────────────────
  -- Self-Renewal step orchestrates the FlowAI internal feedback loop;
  -- platforms here are the surfaces the self-renewal cycle invokes.
  ('govern',   1, 'FlowAI',         'self_governance', 10.0, 10.0, 9.0, 10.0, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}', 'Native self-governance substrate (proprietary).'),
  ('govern',   2, 'GitHub',         'pr_workflow',    9.0, 9.0, 9.0, 9.0, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}', 'PR + branch + audit chain for renewal cycles.'),
  ('govern',   3, 'Vercel',         'preview_deploy', 9.0, 8.0, 10.0, 10.0, '{web,SaaS,generic_url}', 'Preview deploys for renewal verification.'),
  ('govern',   4, 'Sentry',         'error_tracking', 9.0, 8.0, 9.0, 10.0, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}', 'Catches regressions in renewal cycles.'),
  ('govern',   5, 'PostHog',        'product_analytics', 8.0, 9.0, 9.0, 9.0, '{web,SaaS,mobile_app,generic_url}', 'Analytics signal for renewal outcome scoring.'),

  -- ─── GTM ────────────────────────────────────────────────────────
  ('gtm',      1, 'PostHog',        'product_analytics', 9.0, 9.0, 9.0, 9.0, '{web,SaaS,mobile_app,generic_url}', 'Product-led GTM analytics + flags.'),
  ('gtm',      2, 'Stripe',         'payments',       10.0, 7.0, 9.0, 10.0, '{web,SaaS,native_app,mobile_app,generic_url}', 'Revenue + subscription rails.'),
  ('gtm',      3, 'SendGrid',       'email',          9.0, 8.0, 9.0, 9.0, '{web,SaaS,generic_url}', 'Transactional + marketing email.'),
  ('gtm',      4, 'Mailchimp',      'email_marketing', 8.0, 7.0, 8.0, 9.0, '{web,SaaS,generic_url}', 'Email automation + segmentation.'),
  ('gtm',      5, 'Brevo',          'multichannel',   8.0, 8.0, 8.0, 8.0, '{web,SaaS,generic_url}', 'Email + SMS + CRM unified.')
on conflict (step_name, rank) do nothing;

-- ════════════════════════════════════════════════════════════════════
-- 5. Documentation
-- ════════════════════════════════════════════════════════════════════

comment on table public.step_tool_rankings is
  'Tool Intelligence Service — per-step top-5 platform rankings for the 8 FlowAI pipeline steps. Distinct from 0004_tool_marketplace.sql tool_rankings (which is per-dimension score history per tool). Updated by ToolIntelligenceService.refreshRankings(); read by orchestrator before each step executes.';

comment on column public.product_registry.tool_intelligence_mode is
  'Tool Intelligence mode per product: AUTOMATIC (rank-1 auto-pick), GUIDED (operator picks from top-5), MANUAL (no recommendation). Read by orchestrator before each step.';
