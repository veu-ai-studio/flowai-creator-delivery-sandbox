-- ════════════════════════════════════════════════════════════════════
-- Migration 0015 — product_registry.market_definition column + seed
-- ════════════════════════════════════════════════════════════════════
--
-- CEO instruction 2026-05-18 (W2 dispatch #24): the 5 VEU product market
-- definitions are the canonical scope FlowAI uses for GTM readiness
-- scoring, audit criteria, adversarial testing, and monitoring
-- thresholds. Narrow interpretations of these markets would produce
-- artificially-high GTM scores against a sub-segment instead of the
-- full defined market.
--
-- Adds a `market_definition` TEXT column to `product_registry` and
-- seeds the 5 canonical values. Idempotent: ADD COLUMN IF NOT EXISTS
-- + UPDATE ... WHERE product_id = '<slug>'.

alter table public.product_registry
  add column if not exists market_definition text;

update public.product_registry
  set market_definition = 'EHS, ESG, CSR, Sustainability and SDGs practitioners and organizations globally'
  where product_id = 'saige';

update public.product_registry
  set market_definition = 'Any person or organization managing personal and professional relationships globally'
  where product_id = 'reltwin';

update public.product_registry
  set market_definition = 'Anyone building online communities and exchanging values anytime, anywhere globally'
  where product_id = 'reachsms';

update public.product_registry
  set market_definition = 'Writers, publishers and online content creators globally'
  where product_id = 'pressai';

update public.product_registry
  set market_definition = 'Any person and/or family navigating pregnancy — global'
  where product_id = 'mypreglife';
