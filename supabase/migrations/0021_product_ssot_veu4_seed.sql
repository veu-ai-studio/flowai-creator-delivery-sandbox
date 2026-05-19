-- ════════════════════════════════════════════════════════════════════
-- Migration 0021 — product_ssot rows for the 4 remaining VEU products
-- ════════════════════════════════════════════════════════════════════
--
-- Seeds saige, reltwin, reachsms, pressai (prd) in product_ssot so the
-- §19 self-test atomic audit-write (D28 T2 withAtomicSsotWrite +
-- appendGovernanceEntry) succeeds for every VEU product, not just
-- mypreglife (D36 T1, migration 0020) and flowai (D33 T3, migration 0018).
--
-- Per ENTRY 010 §1.1 + commit `c49f074` PERMANENT market definitions —
-- normalizedConcept text mirrors each product's full canonical market.
-- productUrl points at the canonical Vercel preview deployment for the
-- per-product Self-Renewal substrate (matches Doppler `VERCEL_PROJECT_ID_*`
-- aliases per ENTRY 010 §2).
--
-- Identical jsonb shape to 0018 + 0020 — fields verified against the
-- atomic-audit query path in src/lib/agents/renewal/optionCPipeline.js
-- (.from('product_ssot').select(...).eq('product_id', productId)
-- .eq('environment', environment).maybeSingle()). Composite
-- (product_id, environment) unique-constrained by 0013.
--
-- Idempotent: ON CONFLICT (product_id, environment) DO NOTHING per row.
-- Safe to re-apply.

-- ── SAIGE ───────────────────────────────────────────────────────────
insert into public.product_ssot (
  product_id, environment, identity_block, build_brief, architecture_snapshot
) values (
  'saige',
  'prd',
  jsonb_build_object(
    'productName', 'SAIGE',
    'productUrl', 'https://saigeplatform.com',
    'ownerProviderOrgId', 'veu-ai-studio',
    'ownerOperatorIds', jsonb_build_array(),
    'createdAt', now()::text,
    'createdBy', jsonb_build_object(
      'userId', 'system',
      'displayName', 'D-veu4 seed',
      'role', 'admin'
    )
  ),
  jsonb_build_object(
    'originalInput', jsonb_build_object('mode', 'self-renewal-phase-a'),
    'normalizedConcept',
      'SAIGE — EHS, ESG, CSR, Sustainability and SDGs practitioners and organizations globally (full market per §1.1)'
  ),
  jsonb_build_object(
    'capturedAt', now()::text,
    'framework', 'vite+react'
  )
)
on conflict (product_id, environment) do nothing;

-- ── RELTWIN ─────────────────────────────────────────────────────────
insert into public.product_ssot (
  product_id, environment, identity_block, build_brief, architecture_snapshot
) values (
  'reltwin',
  'prd',
  jsonb_build_object(
    'productName', 'RelTwin',
    'productUrl', 'https://reltwin.com',
    'ownerProviderOrgId', 'veu-ai-studio',
    'ownerOperatorIds', jsonb_build_array(),
    'createdAt', now()::text,
    'createdBy', jsonb_build_object(
      'userId', 'system',
      'displayName', 'D-veu4 seed',
      'role', 'admin'
    )
  ),
  jsonb_build_object(
    'originalInput', jsonb_build_object('mode', 'self-renewal-phase-a'),
    'normalizedConcept',
      'RelTwin — Any person or organization managing personal and professional relationships globally (full market per §1.1)'
  ),
  jsonb_build_object(
    'capturedAt', now()::text,
    'framework', 'vite+react'
  )
)
on conflict (product_id, environment) do nothing;

-- ── REACHSMS ────────────────────────────────────────────────────────
insert into public.product_ssot (
  product_id, environment, identity_block, build_brief, architecture_snapshot
) values (
  'reachsms',
  'prd',
  jsonb_build_object(
    'productName', 'ReachSMS',
    'productUrl', 'https://ourcommunitiesai.com',
    'ownerProviderOrgId', 'veu-ai-studio',
    'ownerOperatorIds', jsonb_build_array(),
    'createdAt', now()::text,
    'createdBy', jsonb_build_object(
      'userId', 'system',
      'displayName', 'D-veu4 seed',
      'role', 'admin'
    )
  ),
  jsonb_build_object(
    'originalInput', jsonb_build_object('mode', 'self-renewal-phase-a'),
    'normalizedConcept',
      'ReachSMS — Anyone building online communities and exchanging values anytime, anywhere globally (full market per §1.1)'
  ),
  jsonb_build_object(
    'capturedAt', now()::text,
    'framework', 'vite+react'
  )
)
on conflict (product_id, environment) do nothing;

-- ── PRESSAI ─────────────────────────────────────────────────────────
insert into public.product_ssot (
  product_id, environment, identity_block, build_brief, architecture_snapshot
) values (
  'pressai',
  'prd',
  jsonb_build_object(
    'productName', 'PressAI',
    'productUrl', 'https://ourpublishingai.com',
    'ownerProviderOrgId', 'veu-ai-studio',
    'ownerOperatorIds', jsonb_build_array(),
    'createdAt', now()::text,
    'createdBy', jsonb_build_object(
      'userId', 'system',
      'displayName', 'D-veu4 seed',
      'role', 'admin'
    )
  ),
  jsonb_build_object(
    'originalInput', jsonb_build_object('mode', 'self-renewal-phase-a'),
    'normalizedConcept',
      'PressAI — Writers, publishers and online content creators globally (full market per §1.1)'
  ),
  jsonb_build_object(
    'capturedAt', now()::text,
    'framework', 'vite+react'
  )
)
on conflict (product_id, environment) do nothing;

comment on table public.product_ssot is
  'Per-product STATE / governance audit trail per §7.5. Seeded by 0013 (substrate) + 0018 (flowai) + 0020 (mypreglife) + 0021 (saige/reltwin/reachsms/pressai). All 5 VEU products + flowai now have prd rows enabling atomic-audit writes per §7 Output Contract item #5.';
