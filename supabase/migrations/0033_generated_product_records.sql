-- 0033_generated_product_records.sql
-- Durable backend substrate for FlowAI-generated products.
-- Generated apps write through their own serverless API routes; the browser
-- never receives the Supabase service key.

create table if not exists generated_product_records (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  record_type text not null,
  payload jsonb not null default '{}'::jsonb,
  source text not null default 'flowai-generated-product',
  created_at timestamptz not null default now()
);

create index if not exists idx_generated_product_records_project
  on generated_product_records(project_id, record_type, created_at desc);

alter table generated_product_records enable row level security;

comment on table generated_product_records is
  'Server-side persistence substrate for FlowAI-generated products. Access is through generated serverless APIs using service-role credentials only.';
