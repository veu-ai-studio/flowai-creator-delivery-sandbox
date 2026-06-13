# Path 1 SAIGE Production URL Evidence

Date: 2026-06-13
Owner: CTO
Path: Migration - SAIGE
Status: HTTP-CONFIRMED PRODUCTION URL; CT2 BROWSER ACCEPTANCE PENDING

## Result

A public production alias now serves the migrated SAIGE app shell:

- Public URL: `https://saige-v2.vercel.app`
- Production deployment id: `dpl_GKebj1Kq1sG4CZh8Mf3ouD5etdj8`
- Deployment URL: `https://saige-v2-abo35l72p-veu-ai-studio.vercel.app`
- SAIGE commit: `4cc85e216b0ab505973397a2ebc8dee63e8b5e5e`
- Branch: `flowai/migration-saige-1781139104798-ctosaige`

## Verification

PASS:

- Scoped Base44 reference scan: no matches.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- Vercel deploy: READY, target production.
- `curl -I https://saige-v2.vercel.app`: `200 OK`.
- `curl -L https://saige-v2.vercel.app`: serves `title=SAIGE`, `/assets/index-D5JW4xEN.js`, `/assets/index-CA9S5vrn.css`, and root node.
- `curl -I https://saige-v2.vercel.app/manifest.json`: `200 OK`.

FAIL / pending:

- `npm run typecheck`: FAIL, 279 generated-JS typing errors remain after central migration repairs.
- CTO in-app browser check: unavailable; browser bridge failed during setup.
- CT2 independent browser acceptance: dispatched and pending.

## Honesty Boundary

This evidence proves that the production alias is public and serving the SAIGE app shell by HTTP. It does not justify VERIFIED movement yet because the standing rule requires CT2 or `/api/health` confirmation before claiming a deployed URL as verified. SAIGE is a static app and has no `/api/health`, so CT2 browser confirmation is the remaining acceptance gate.

## Notes

The immutable deployment hostname returned Vercel Deployment Protection, while the production alias returned public `200 OK`. The Victor-facing URL should therefore be the alias:

- `https://saige-v2.vercel.app`