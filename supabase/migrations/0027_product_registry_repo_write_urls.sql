-- Migration 0027 - confirm registered product repo write URLs
--
-- Registry-only update. Agent behavior remains product-agnostic; U4/U5/U6
-- discover and act from registry metadata plus operator approval.

update public.product_registry
set github_repo_url = case product_id
    when 'saige' then 'https://github.com/veu-ai-studio/saige'
    when 'reltwin' then 'https://github.com/veu-ai-studio/rel-twin'
    when 'reachsms' then 'https://github.com/veu-ai-studio/reachsms'
    when 'pressai' then 'https://github.com/veu-ai-studio/press-ai'
    when 'mypreglife' then 'https://github.com/veu-ai-studio/my-preg-life'
    else github_repo_url
  end,
  self_renewal_branch = 'main',
  updated_at = now()
where product_id in ('saige', 'reltwin', 'reachsms', 'pressai', 'mypreglife');
