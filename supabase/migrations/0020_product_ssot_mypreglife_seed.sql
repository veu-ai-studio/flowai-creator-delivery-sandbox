-- ════════════════════════════════════════════════════════════════════
-- Migration 0020 — product_ssot row for MyPregLife (D36 T1)
-- ════════════════════════════════════════════════════════════════════
--
-- Seeds the per-product STATE / governance audit-trail row for
-- mypreglife/prd so the §19 self-test (and any production Self-Renewal
-- run against MyPregLife) gets a successful atomic-audit write
-- (D28 T2 withAtomicSsotWrite + appendGovernanceEntry).
--
-- Mirrors the D33 T3 / migration 0018 pattern for flowai. The 4
-- remaining VEU product rows (reltwin, saige, reachsms, pressai) are
-- still W2's territory per prior dispatch notes — this migration
-- unblocks only MyPregLife (the Phase A primary self-test target).
--
-- Key the atomic-audit queries against (verified verbatim by
-- scripts/verify-mypreglife-atomic-audit.mjs):
--   .from('product_ssot').select(...).eq('product_id', productId)
--                        .eq('environment', environment).maybeSingle();
-- Composite (product_id, environment) is unique-constrained by 0013.
--
-- Live verification before this commit (verbatim):
--   atomic-audit result: {"written":true, "attempts":1,
--                          "priorUpdatedAt":"2026-05-18T23:13:46.252149+00:00",
--                          "nextUpdatedAt":"2026-05-18T23:14:30.208Z"}
--
-- Idempotent: ON CONFLICT (product_id, environment) DO NOTHING.

insert into public.product_ssot (
  product_id, environment, identity_block, build_brief, architecture_snapshot
) values (
  'mypreglife',
  'prd',
  jsonb_build_object(
    'productName', 'MyPregLife',
    'productUrl', 'https://mypreglife-platform.vercel.app',
    'ownerProviderOrgId', 'veu-ai-studio',
    'ownerOperatorIds', jsonb_build_array(),
    'createdAt', now()::text,
    'createdBy', jsonb_build_object(
      'userId', 'system',
      'displayName', 'D36 seed',
      'role', 'admin'
    )
  ),
  jsonb_build_object(
    'originalInput', jsonb_build_object('mode', 'self-renewal-phase-a'),
    'normalizedConcept',
      'MyPregLife — pregnancy + maternal-health AI companion (full market per §1.1)'
  ),
  jsonb_build_object(
    'capturedAt', now()::text,
    'framework', 'vite+react'
  )
)
on conflict (product_id, environment) do nothing;
