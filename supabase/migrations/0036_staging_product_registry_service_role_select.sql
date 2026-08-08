-- Staging-only runtime ACL required by the existing rate-cap/runaway guard.
-- Target project: rsulqkfweaxrhuzjhjrs. No routing or data mutation.

revoke all privileges on table public.product_registry from service_role;
grant select on table public.product_registry to service_role;
