-- Migration 0026 - register VEU product portfolio source repositories
--
-- Registry-only. Agent-layer behavior remains product-agnostic.
-- Source health is intentionally discovered dynamically by U4/U5.

insert into public.product_registry (
  product_id,
  org_id,
  github_repo_url,
  product_url,
  environment,
  self_renewal_enabled,
  self_renewal_branch
) values
  (
    'reltwin',
    'veu-ai-studio',
    'https://github.com/veu-ai-studio/rel-twin',
    'https://reltwin.com',
    'prd',
    true,
    'main'
  ),
  (
    'reachsms',
    'veu-ai-studio',
    'https://github.com/veu-ai-studio/reachsms',
    'https://ourcommunitiesai.com',
    'prd',
    true,
    'main'
  ),
  (
    'pressai',
    'veu-ai-studio',
    'https://github.com/veu-ai-studio/press-ai',
    'https://ourpublishingai.com',
    'prd',
    true,
    'main'
  ),
  (
    'mypreglife',
    'veu-ai-studio',
    'https://github.com/veu-ai-studio/my-preg-life',
    'https://preglife.com',
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
