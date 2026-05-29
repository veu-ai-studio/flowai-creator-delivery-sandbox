-- ════════════════════════════════════════════════════════════════════
-- Migration 0018 — product_ssot row for FlowAI (D33 T3)
-- ════════════════════════════════════════════════════════════════════
--
-- Resolves the contradiction reported in D32 (claimed PATH-A row
-- inserted into product_ssot; actual prd state showed empty table +
-- atomic-audit returning no_product_ssot_row). D32's insert went to
-- product_registry, NOT product_ssot. These are different tables per
-- CANONICAL_REFERENCE §7.5:
--
--   product_registry — per-product Self-Renewal CONFIG (renewal flags,
--                      thresholds, github + Vercel routing). Migration
--                      0014 + 0017 (flowai). Source of truth for routing.
--
--   product_ssot     — per-product STATE / governance audit trail. The
--                      durable living-document substrate where every
--                      pipeline run atomically writes per §7 Output
--                      Contract item #5. Six canonical jsonb blocks
--                      (identity / build_brief / architecture_snapshot /
--                      delta_log / governance_record / annotations +
--                      overrides). Migration 0013 created the table;
--                      seeding the per-product rows was deferred.
--
-- This migration seeds the FlowAI row so the §19 self-test's atomic
-- audit write can succeed (currently fails with no_product_ssot_row).
-- The 5 VEU product rows are W2's territory per the dispatch note.
--
-- Key the atomic-audit queries against (verified via D28 T2's
-- withAtomicSsotWrite() in optionCPipeline.js):
--   .eq('product_id', productId).eq('environment', environment)
--   → composite key is (product_id, environment); the unique
--     constraint in 0013 enforces single-row-per-pair.
--
-- Idempotent: ON CONFLICT (product_id, environment) DO NOTHING so
-- re-running this migration is safe.

insert into public.product_ssot (
  product_id, environment, identity_block, build_brief, architecture_snapshot
) values (
  'flowai',
  'prd',
  jsonb_build_object(
    'productName', 'FlowAI',
    'productUrl', 'https://flowai-dun.vercel.app',
    'ownerProviderOrgId', 'veu-ai-studio',
    'ownerOperatorIds', jsonb_build_array(),
    'createdAt', now()::text,
    'createdBy', jsonb_build_object(
      'userId', 'system',
      'displayName', 'D33 seed',
      'role', 'admin'
    )
  ),
  jsonb_build_object(
    'originalInput', jsonb_build_object('mode', 'self-test'),
    'normalizedConcept', 'FlowAI engine self-test substrate'
  ),
  jsonb_build_object(
    'capturedAt', now()::text,
    'framework', 'vite+react'
  )
)
on conflict (product_id, environment) do nothing;

comment on table public.product_ssot is
  'Per-product STATE / governance audit trail per §7.5. ''flowai'' row added by 0018 enables the §19 self-test atomic audit write. The 5 VEU product rows are seeded by a W2 dispatch (tracked, not in D33 scope).';
