-- ════════════════════════════════════════════════════════════════════
-- Migration 0024 — product_registry construction-engine eligibility
-- ════════════════════════════════════════════════════════════════════
--
-- Adds two columns that gate the CA-17 Build/Wire ConstructionEngine
-- per its DI hook in src/lib/agents/renewal/orchestrator.js:
--
--   construction_eligible (bool, default FALSE)
--     — when TRUE, the renewal orchestrator invokes deps.runConstruction
--       on every iteration whose Phase B findings include wire_up
--       candidates. Default FALSE so existing products are unaffected.
--
--   construction_s6_auto_approve_in_test_mode (bool, default FALSE)
--     — Phase 1 proof-of-concept bypass for the S6 admin-approval gate
--       (per CA-17 §3.6 v3-final). When TRUE, the engine auto-synthesises
--       an admin approval envelope with full audit trail. Production
--       path is human-gated; this bypass is intended only for the
--       proof-of-concept window. Bounded reversal: setting back to FALSE
--       returns the gate to its production posture immediately.
--
-- Reltwin row backfill: enables both flags so the engine fires on the
-- first live credentialed run (per W5a dispatch). Other products remain
-- ineligible until their operators flip the toggle.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + UPDATE WHERE-clause-bound.

alter table public.product_registry
  add column if not exists construction_eligible boolean not null default false;

alter table public.product_registry
  add column if not exists construction_s6_auto_approve_in_test_mode boolean not null default false;

update public.product_registry
  set construction_eligible = true,
      construction_s6_auto_approve_in_test_mode = true
  where product_id = 'reltwin';

comment on column public.product_registry.construction_eligible is
  'CA-17 Build/Wire ConstructionEngine eligibility flag. When TRUE the renewal orchestrator invokes deps.runConstruction on iterations whose Phase B findings include wire_up candidates. Default FALSE.';

comment on column public.product_registry.construction_s6_auto_approve_in_test_mode is
  'CA-17 §3.6 Phase 1 proof-of-concept bypass for the S6 admin-approval gate. When TRUE engine auto-synthesises an admin approval envelope with full audit trail. Reversible — production posture restored by setting FALSE. Default FALSE.';
