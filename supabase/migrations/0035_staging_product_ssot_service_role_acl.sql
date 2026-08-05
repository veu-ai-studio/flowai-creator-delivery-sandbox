-- Staging-only least-privilege reconciliation for product_ssot tables.
-- Prepared for independent review; do not apply outside rsulqkfweaxrhuzjhjrs.

revoke all privileges on table public.product_ssot from service_role;
revoke all privileges on table public.product_ssot_version from service_role;

grant select, insert, update on table public.product_ssot to service_role;
grant select, insert, delete on table public.product_ssot_version to service_role;
