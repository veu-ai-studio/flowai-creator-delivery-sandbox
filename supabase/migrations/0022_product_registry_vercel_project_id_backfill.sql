-- 0022_product_registry_vercel_project_id_backfill.sql
-- Backfills product_registry.vercel_project_id for the 5 product rows
-- plus the FlowAI infra row, from the canonical Vercel project IDs
-- stored in Doppler VERCEL_PROJECT_ID_* env vars.
--
-- These are public Vercel project identifiers (visible in dashboard
-- URLs, deployment metadata, and API responses) — not credentials.
-- Safe to commit in plaintext.
--
-- Idempotent: the WHERE clause restricts to the 6 known product_ids,
-- and re-running re-applies the same values.

update public.product_registry
   set vercel_project_id = case product_id
     when 'flowai'     then 'prj_qtqajKmblq1cZILD66jVbTVC4Uo5'
     when 'mypreglife' then 'prj_P46D1HB1DmjY48PS4kgTYxzsKqhb'
     when 'pressai'    then 'prj_RhCu7cW7Q0SQ6D7rtPrXLyWqud9W'
     when 'reachsms'   then 'prj_Amp5H4f2isCvERzFrxMLIVrlHARI'
     when 'reltwin'    then 'prj_ymNpPi2X6kjiA5uyRRgmfI1sa2JL'
     when 'saige'      then 'prj_wlxXwuG6WqUkdrB4ASUUT9pb9tsF'
   end
 where product_id in ('flowai','mypreglife','pressai','reachsms','reltwin','saige');
