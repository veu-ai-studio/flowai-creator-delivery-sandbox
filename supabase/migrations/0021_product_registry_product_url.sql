-- ════════════════════════════════════════════════════════════════════
-- Migration 0021 — product_registry.product_url (D40 generic engine)
-- ════════════════════════════════════════════════════════════════════
--
-- Adds the per-product live URL to product_registry so resolveLiveUrl
-- can stop carrying a hardcoded MAP of the 5 VEU products + flowai.
-- A registry row + URL is now the SOLE onboarding artifact required to
-- run any product through FlowAI's Self-Renewal + Phase B pipelines.
--
-- Backfills the 6 existing rows with the URLs previously hardcoded in
-- src/lib/agents/renewal/orchestrator.js resolveLiveUrl. After this
-- migration, that map is replaced by a registry lookup with the
-- hardcoded MAP retained ONLY as a back-compat fallback for tests +
-- environments missing the column.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + UPDATE WHERE NULL.

alter table public.product_registry
  add column if not exists product_url text;

update public.product_registry set product_url = 'https://mypreglife-platform.vercel.app' where product_id = 'mypreglife' and product_url is null;
update public.product_registry set product_url = 'https://reltwin-platform.vercel.app'    where product_id = 'reltwin'    and product_url is null;
update public.product_registry set product_url = 'https://saige-platform.vercel.app'      where product_id = 'saige'      and product_url is null;
update public.product_registry set product_url = 'https://reachsms-platform.vercel.app'   where product_id = 'reachsms'   and product_url is null;
update public.product_registry set product_url = 'https://pressai-platform.vercel.app'    where product_id = 'pressai'    and product_url is null;
update public.product_registry set product_url = 'https://flowai-dun.vercel.app'          where product_id = 'flowai'     and product_url is null;

comment on column public.product_registry.product_url is
  'Per-product live URL — sole onboarding artifact (alongside the registry row itself) required to run a product through the engine. Replaces the hardcoded resolveLiveUrl map. D40 generic-engine refactor.';
