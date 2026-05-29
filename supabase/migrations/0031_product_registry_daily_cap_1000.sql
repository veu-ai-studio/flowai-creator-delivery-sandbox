-- Migration 0031 - development/testing registered-product cap
--
-- Registered products with operator tokens are active FlowAI build targets.
-- Keep explicitly higher caps intact, but lift lower caps out of the way.

alter table public.product_registry
  alter column self_renewal_max_per_day set default 1000;

update public.product_registry
set self_renewal_max_per_day = 1000,
    updated_at = now()
where self_renewal_max_per_day < 1000;

comment on column public.product_registry.self_renewal_max_per_day is
  'Hard rate cap - renewal cycles per rolling 24-hour window. Default 1000 for registered products during active development/testing.';
