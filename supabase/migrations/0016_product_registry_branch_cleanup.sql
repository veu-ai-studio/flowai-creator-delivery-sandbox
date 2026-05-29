-- 0016_product_registry_branch_cleanup.sql
-- Adds two columns to product_registry to drive the W5c branch-cleanup
-- cron: how long preview/per-pipeline-run branches are retained before
-- automated deletion, and whether cleanup is enabled per product.
--
-- Both columns are NOT NULL with safe defaults so the 5 existing rows
-- pick up production-sane behavior without an explicit backfill step.
--
-- Defaults:
--   branch_retention_days  = 7      (one-week preview retention)
--   branch_cleanup_enabled = true   (cleanup ON for all products by default)
--
-- IF NOT EXISTS keeps the migration idempotent — re-running on a DB
-- where the columns already exist is a no-op.

alter table public.product_registry
  add column if not exists branch_retention_days  integer not null default 7,
  add column if not exists branch_cleanup_enabled boolean not null default true;
