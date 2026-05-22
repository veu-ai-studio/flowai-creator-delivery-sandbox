-- Migration 0025 - register SAIGE source repository
--
-- Registry entry only. Agent-layer behavior remains product-agnostic.
-- The SAIGE repo currently contains saige-github-upload.zip only, so U4/U5
-- source mapping remains limited until the codebase is extracted to repo root.

insert into public.product_registry (
  product_id,
  org_id,
  github_repo_url,
  product_url,
  environment,
  self_renewal_enabled,
  self_renewal_branch
) values (
  'saige',
  'veu-ai-studio',
  'https://github.com/victor2081new-cloud/saige',
  'https://saigeplatform.com',
  'prd',
  true,
  'main'
)
on conflict (product_id) do update
set github_repo_url = excluded.github_repo_url,
    product_url = excluded.product_url,
    environment = excluded.environment,
    self_renewal_enabled = excluded.self_renewal_enabled,
    self_renewal_branch = excluded.self_renewal_branch,
    updated_at = now();
