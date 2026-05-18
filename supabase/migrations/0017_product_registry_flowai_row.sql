-- ════════════════════════════════════════════════════════════════════
-- Migration 0017 — product_registry row for FlowAI itself (D32 T1)
-- ════════════════════════════════════════════════════════════════════
--
-- FlowAI must be runnable through its OWN Self-Renewal pipeline as the
-- §19 self-test before declaring readiness on the 5 VEU products. D31
-- proved the loop reaches STEP 11 but failed because PATH B routes to
-- a fresh per-run Vercel sub-project whose automation-bypass secret is
-- unknown to our env. PATH A routes commits to the existing FlowAI
-- repo + deploys to the existing `flowai` Vercel project whose bypass
-- secret IS in Doppler (VERCEL_AUTOMATION_BYPASS_SECRET, which the D31
-- T2 fallback in resolveVercelBypassSecret() reads).
--
-- Idempotent: ON CONFLICT (product_id) DO NOTHING so re-applying the
-- migration is safe; operator edits via admin UI are preserved.

insert into public.product_registry (
  product_id, org_id, github_repo_url, environment,
  self_renewal_enabled, market_definition
) values
  (
    'flowai',
    'veu-ai-studio',
    'https://github.com/victor2081new-cloud/flowai',
    'prd',
    true,
    'VEU operators and FlowAI itself — the internal AI Operating System running the 5 VEU products + §19 self-test. NOT a public SaaS per CANONICAL_REFERENCE.md §1.'
  )
on conflict (product_id) do nothing;

comment on column public.product_registry.product_id is
  'Stable per-product identifier. ''flowai'' (added by 0017) is the engine itself; the other 5 are VEU products. ''flowai'' enables §19 self-test routing through PATH A using the existing FlowAI Vercel project + repo.';
