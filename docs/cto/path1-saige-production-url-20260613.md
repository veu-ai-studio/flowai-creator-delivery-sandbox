# Path 1 SAIGE Production URL Evidence

Date: 2026-06-13
Owner: CTO
Path: Migration - SAIGE
Status: CT2-ACCEPTED PRODUCTION URL; VERIFIED PROMOTION NOT APPLIED

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
- CT2 browser acceptance: PASS.
- CT2 observed browser-rendered app shell with top navigation, Home selected, Ask SAIGE, Welcome Local hero, agent counts, filters, and agent cards.
- No Vercel Deployment Protection/auth wall observed on the public alias.

FAIL / pending:

- `npm run typecheck`: FAIL, 279 generated-JS typing errors remain after central migration repairs.
- No matrixArtifact VERIFIED promotion has been applied.

## CT2 Evidence

- Result file: `docs/cto/ct2-saige-production-acceptance-2026-06-13.md`
- Screenshot: `docs/cto/ct2-saige-production-2026-06-13.png`

## Honesty Boundary

This evidence proves a browser-rendered deployed URL for Path 1. It supports a separate claim-promotion packet, but CTO did not edit `matrixArtifact.json` because standing repo rules require explicit clearance for the full VERIFIED promotion process.

## Victor-Facing URL

- `https://saige-v2.vercel.app`