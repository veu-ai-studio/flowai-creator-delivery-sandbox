-- Migration 0029 - raise registered product daily run cap
--
-- Active development/testing needs more than the old 10/day operator cap.
-- Keep explicitly higher caps intact, but lift all lower registered-product
-- caps to 50 renewal cycles per rolling 24-hour window.

alter table public.product_registry
  alter column self_renewal_max_per_day set default 50;

update public.product_registry
set self_renewal_max_per_day = 50,
    updated_at = now()
where self_renewal_max_per_day < 50;

comment on column public.product_registry.self_renewal_max_per_day is
  'Hard rate cap - renewal cycles per rolling 24-hour window. Default 50 for registered products.';
