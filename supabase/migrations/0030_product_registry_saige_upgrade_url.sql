alter table public.product_registry
  add column if not exists deployment_url text,
  add column if not exists deployment_status text,
  add column if not exists upgrade_repo_status text;

update public.product_registry
set
  upgrade_url = 'https://saige-v2.vercel.app',
  deployment_url = 'https://saige-v2.vercel.app',
  deployment_status = 'deployed',
  upgrade_repo_status = 'provisioned',
  updated_at = now()
where product_id = 'saige';
