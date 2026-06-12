-- Migration 0032 - Tool Intelligence Build ranking: Codex-first seven-tool list
--
-- The original Tool Intelligence seed limited every step to rank 1..5.
-- Step 3 Build now has a canonical seven-tool order:
-- Codex, Claude Code, Cursor, Bolt, Windsurf, Replit, Base44.
-- Existing Build score history is matched by platform_name and preserved
-- across the rank reorder.
--
-- Idempotent: safe to re-apply.

alter table public.step_tool_rankings
  drop constraint if exists step_tool_rankings_rank_check;

alter table public.step_tool_rankings
  add constraint step_tool_rankings_rank_check
  check (
    (step_name = 'build' and rank between 1 and 7)
    or
    (step_name <> 'build' and rank between 1 and 5)
  );

with existing_build_rows as (
  select distinct on (lower(trim(platform_name)))
    lower(trim(platform_name)) as platform_key,
    performance_score,
    cost_score,
    speed_score,
    reliability_score,
    last_updated
  from public.step_tool_rankings
  where step_name = 'build'
  order by lower(trim(platform_name)), last_updated desc
),
deleted_build_rows as (
  delete from public.step_tool_rankings
  where step_name = 'build'
  returning 1
),
deleted_count as (
  select count(*) as value from deleted_build_rows
),
canonical_build_rows(
  step_name, rank, platform_name, platform_type,
  performance_score, cost_score, speed_score, reliability_score,
  target_classes, notes
) as (
  values
    ('build', 1, 'Codex',       'code',         10.0, 7.0, 9.5, 9.5, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}'::text[], 'OpenAI-backed code patch and generate-from-scratch adapter; callable only with OPENAI_API_KEY.'),
    ('build', 2, 'Claude Code', 'code',          9.8, 7.0, 9.0, 9.0, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}'::text[], 'Anthropic-backed code patch and generation adapter; callable only with ANTHROPIC_API_KEY.'),
    ('build', 3, 'Cursor',      'code',          9.0, 8.0, 9.0, 9.0, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}'::text[], 'Ranked marketplace tool; adapter remains stubbed until a real callable API is admitted.'),
    ('build', 4, 'Bolt',        'ai_fullstack',  8.7, 8.0, 9.0, 8.0, '{web,SaaS,generic_url}'::text[], 'Ranked marketplace tool; adapter remains unavailable for direct dispatch.'),
    ('build', 5, 'Windsurf',    'code',          8.5, 8.0, 8.0, 8.0, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}'::text[], 'Ranked marketplace tool; adapter remains stubbed until a real callable API is admitted.'),
    ('build', 6, 'Replit',      'cloud_ide',     8.2, 9.0, 7.0, 8.0, '{web,SaaS,generic_url}'::text[], 'Ranked marketplace tool; execution/deploy surfaces are not the Step 3 code-generation adapter.'),
    ('build', 7, 'Base44',      'source',        7.0, 8.0, 7.0, 7.0, '{web,SaaS,generic_url}'::text[], 'Ranked legacy substrate; project source export is not executable today.')
)
insert into public.step_tool_rankings
  (step_name, rank, platform_name, platform_type, performance_score, cost_score, speed_score, reliability_score, target_classes, notes, last_updated)
select
  c.step_name,
  c.rank,
  c.platform_name,
  c.platform_type,
  coalesce(e.performance_score, c.performance_score),
  coalesce(e.cost_score, c.cost_score),
  coalesce(e.speed_score, c.speed_score),
  coalesce(e.reliability_score, c.reliability_score),
  c.target_classes,
  c.notes,
  coalesce(e.last_updated, now())
from canonical_build_rows c
left join existing_build_rows e
  on e.platform_key = lower(trim(c.platform_name))
cross join deleted_count;
