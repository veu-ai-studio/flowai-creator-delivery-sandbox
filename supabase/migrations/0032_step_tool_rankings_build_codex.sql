-- Migration 0032 - Tool Intelligence Build ranking: Codex-first seven-tool list
--
-- The original Tool Intelligence seed limited every step to rank 1..5.
-- Step 3 Build now has a canonical seven-tool order:
-- Codex, Claude Code, Cursor, Bolt, Windsurf, Replit, Base44.
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

insert into public.step_tool_rankings
  (step_name, rank, platform_name, platform_type, performance_score, cost_score, speed_score, reliability_score, target_classes, notes)
values
  ('build', 1, 'Codex',       'code',         10.0, 7.0, 9.5, 9.5, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}', 'OpenAI-backed code patch and generate-from-scratch adapter; callable only with OPENAI_API_KEY.'),
  ('build', 2, 'Claude Code', 'code',          9.8, 7.0, 9.0, 9.0, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}', 'Anthropic-backed code patch and generation adapter; callable only with ANTHROPIC_API_KEY.'),
  ('build', 3, 'Cursor',      'code',          9.0, 8.0, 9.0, 9.0, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}', 'Ranked marketplace tool; adapter remains stubbed until a real callable API is admitted.'),
  ('build', 4, 'Bolt',        'ai_fullstack',  8.7, 8.0, 9.0, 8.0, '{web,SaaS,generic_url}', 'Ranked marketplace tool; adapter remains unavailable for direct dispatch.'),
  ('build', 5, 'Windsurf',    'code',          8.5, 8.0, 8.0, 8.0, '{web,SaaS,native_app,mobile_app,agentic_ai,generic_url}', 'Ranked marketplace tool; adapter remains stubbed until a real callable API is admitted.'),
  ('build', 6, 'Replit',      'cloud_ide',     8.2, 9.0, 7.0, 8.0, '{web,SaaS,generic_url}', 'Ranked marketplace tool; execution/deploy surfaces are not the Step 3 code-generation adapter.'),
  ('build', 7, 'Base44',      'source',        7.0, 8.0, 7.0, 7.0, '{web,SaaS,generic_url}', 'Ranked legacy substrate; project source export is not executable today.')
on conflict (step_name, rank) do update set
  platform_name = excluded.platform_name,
  platform_type = excluded.platform_type,
  performance_score = excluded.performance_score,
  cost_score = excluded.cost_score,
  speed_score = excluded.speed_score,
  reliability_score = excluded.reliability_score,
  target_classes = excluded.target_classes,
  notes = excluded.notes,
  last_updated = now();
