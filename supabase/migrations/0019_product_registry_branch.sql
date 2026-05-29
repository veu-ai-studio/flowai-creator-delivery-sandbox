-- ════════════════════════════════════════════════════════════════════
-- Migration 0019 — product_registry.self_renewal_branch column (D34 T1)
-- ════════════════════════════════════════════════════════════════════
--
-- Adds the per-product branch-of-record for Self-Renewal Trees API +
-- fetchFileContent calls. D33 pinpointed the convergence blocker:
-- orchestrator was hardcoding ref='main' for both _fetchRepoFileList
-- (Trees API recursive) and _fetchFileContent (Contents API), but
-- FlowAI's working branch is flowai-v0.1. The Trees API returned 0
-- files → the prioritizer guessed blind → all 5 file fetches 404'd →
-- NO_FIXES_GENERATED. Per-product branch resolution fixes that
-- structurally.
--
-- Default 'main' matches the 5 VEU products' actual default branches
-- (verified D34 via GitHub App REST `GET /repos/{owner}/{repo}`):
--   mypreglife | default_branch=main
--   pressai    | default_branch=main
--   reachsms   | default_branch=main
--   reltwin    | default_branch=main
--   saige      | default_branch=main
--
-- victor2081new-cloud/flowai returned HTTP 404 to the App in D34
-- probe — the App is installed on veu-ai-studio only. The 'flowai'
-- row's self_renewal_branch='flowai-v0.1' is correct per the spec
-- (the orchestrator should target the actual working branch), but
-- the convergence proof remains blocked on a SEPARATE issue: GitHub
-- App needs to be installed on victor2081new-cloud OR the FlowAI
-- repo needs to move into veu-ai-studio. Documented as a residual.
--
-- Idempotent: ALTER TABLE ADD COLUMN IF NOT EXISTS + UPDATE WHERE
-- branch IS NULL.

alter table public.product_registry
  add column if not exists self_renewal_branch text;

-- Backfill: set default 'main' for any existing row missing the value.
-- This is safe because the GitHub-App probe in D34 confirmed all 5 VEU
-- products use default_branch='main'. flowai gets its branch-of-record
-- set explicitly below.
update public.product_registry
  set self_renewal_branch = 'main'
  where self_renewal_branch is null;

-- Now make it NOT NULL with a default for future inserts.
alter table public.product_registry
  alter column self_renewal_branch set default 'main';

alter table public.product_registry
  alter column self_renewal_branch set not null;

-- Per-row corrections (only flowai differs from the 'main' default).
update public.product_registry
  set self_renewal_branch = 'flowai-v0.1'
  where product_id = 'flowai';

comment on column public.product_registry.self_renewal_branch is
  'Per-product branch-of-record for Self-Renewal Trees API + file-fetch + commit operations. Default ''main''. D34 T1: ''flowai'' uses ''flowai-v0.1'' (working branch); the 5 VEU products use ''main'' (verified by GitHub App default_branch probe).';
