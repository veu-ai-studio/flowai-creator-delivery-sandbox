-- Migration 0028 - fork-based upgrade targets
--
-- FlowAI never writes to the canonical/original product repo. The original
-- remains the read-only baseline and rollback target; all generated fixes land
-- in the active upgrade repo.

alter table public.product_registry
  add column if not exists original_repo text,
  add column if not exists original_url text,
  add column if not exists original_status text,
  add column if not exists upgrade_repo text,
  add column if not exists upgrade_url text,
  add column if not exists upgrade_status text,
  add column if not exists upgrade_architecture text;

update public.product_registry
set original_repo = 'https://github.com/veu-ai-studio/saige',
    original_url = 'https://saige-platform.vercel.app',
    original_status = 'frozen_read_only',
    upgrade_repo = 'https://github.com/veu-ai-studio/saige-v2',
    upgrade_url = 'https://saigeplatform.com',
    upgrade_status = 'active_upgrade_target',
    upgrade_architecture = 'fork_based_upgrade',
    github_repo_url = 'https://github.com/veu-ai-studio/saige-v2',
    product_url = 'https://saigeplatform.com',
    self_renewal_branch = 'main',
    updated_at = now()
where product_id = 'saige';
