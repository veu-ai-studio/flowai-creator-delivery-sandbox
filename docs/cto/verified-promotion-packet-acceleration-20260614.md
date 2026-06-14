# VERIFIED Promotion Packet - Acceleration Batch

FROM: CTO
TO: W04 / Victor Udo, FNSE, PhD - CEO
DATE: 2026-06-14 UTC
STATUS: AUTHORIZED BY W04/CEO FINAL DIRECTIVE AND APPLIED
VERIFIED movement applied: yes
matrixArtifact edited: yes
canonical docs edited: no

## Eligibility Rule

This packet includes only claims meeting all three W04 criteria:

- `evidenceUrl` exists and is publicly accessible or repo-durable;
- CT2 independently confirmed the behavior in a browser;
- `verifiedAt` and `verifiedBy` can be populated honestly.

This packet was originally submitted for authorization. W04/CEO final directive on 2026-06-14 authorized applying it, and CTO applied the narrow exact-row set recorded in `docs/cto/verified-promotion-applied-20260614.md`. Canonical docs and ProductSSOT were not edited.

## Candidate 1 - Migration Path Produced A Public URL

Claim scope:

FlowAI Migration path produced one CT2-confirmed public deployed URL for a real product target.

Evidence:

- Evidence URL: `https://saige-v2.vercel.app`
- Repo evidence: `docs/cto/ct2-saige-production-acceptance-2026-06-13.md`
- Supporting summary: `docs/cto/path1-saige-production-url-20260613.md`
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance`
- Evidence label: `LIVE_PRODUCTION`

Boundary:

This proves a public deployed URL. It does not prove SAIGE typecheck debt or full migration cleanup is complete.

## Candidate 2 - Structural Layer Axis

Claim scope:

Structural Layer is visible, independently selectable, and reaches live production run payload/log evidence.

Evidence:

- Primary current rerun: `docs/cto/ct2-live-proof-sweep-acceleration-result-20260614.md`
- Earlier full axis proof: `docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- `verifiedAt`: `2026-06-14`
- `verifiedBy`: `CT2 browser acceptance + live /api/run-construction payload + run log`
- Evidence label: `LIVE_PRODUCTION`

Observed:

- Sidebar exposed `STRUCTURAL LAYER`.
- CT2 selected `Controlled`.
- Live request payload included `structuralLayer:"controlled"`.
- Run log included Flow Hub axis envelope.

## Candidate 3 - Operational Mode Axis

Claim scope:

Operational Mode is visible, independently selectable, and reaches live production run payload/log evidence.

Evidence:

- Primary current rerun: `docs/cto/ct2-live-proof-sweep-acceleration-result-20260614.md`
- Earlier full axis proof: `docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- `verifiedAt`: `2026-06-14`
- `verifiedBy`: `CT2 browser acceptance + live /api/run-construction payload + run log`
- Evidence label: `LIVE_PRODUCTION`

Observed:

- Sidebar exposed `OPERATIONAL MODE`.
- CT2 selected `Manual`.
- Live request payload included `operationalMode:"manual"` and transport `mode:"MANUAL"`.

## Candidate 4 - Analysis Depth Axis

Claim scope:

Analysis Depth is visible, independently selectable, and reaches live production run payload/log evidence.

Evidence:

- Primary current rerun: `docs/cto/ct2-live-proof-sweep-acceleration-result-20260614.md`
- Earlier full axis proof: `docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- `verifiedAt`: `2026-06-14`
- `verifiedBy`: `CT2 browser acceptance + live /api/run-construction payload + run log`
- Evidence label: `LIVE_PRODUCTION`

Observed:

- Sidebar exposed `ANALYSIS DEPTH`.
- CT2 selected `Quick`.
- Live request payload included `analysisDepth:"quick"`.

Boundary:

This confirms selection and propagation. It does not yet prove measured crawl-budget delta across Quick/Standard/Deep.

## Candidate 5 - Flow Hub Path Axis

Claim scope:

Flow Hub Path is visible, independently selectable, preserves route/path state, and reaches live production payload evidence.

Evidence:

- Primary current rerun: `docs/cto/ct2-live-proof-sweep-acceleration-result-20260614.md`
- Earlier full axis proof: `docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- `verifiedAt`: `2026-06-14`
- `verifiedBy`: `CT2 browser acceptance + route switching proof + live /api/run-construction payload`
- Evidence label: `LIVE_PRODUCTION`

Observed:

- Sidebar exposed `FLOW HUB PATH`.
- Production/Migration/Fresh Build routes were reachable in prior CT2 proof.
- Current CT2 selected Production and launched a constrained run with `flowHubPath:"production"`.

Boundary:

This does not prove all three paths have produced deployed URLs.

## Candidate 6 - TIM Build Step Codex Ranking Visibility

Claim scope:

TIM Build step visibly ranks Codex first in the live forge UI.

Evidence:

- Earlier CT2 proof: `docs/cto/ct2-priority2-axis-live-proof-rerun-result-20260613.md`
- Current CB2 regression audit support: `docs/cto/cb2-production-regression-audit-acceleration-result-20260614.md`
- `verifiedAt`: `2026-06-13`
- `verifiedBy`: `CT2 browser acceptance + live run panel`
- Evidence label: `LIVE_PRODUCTION`

Observed:

- Build candidate order showed Codex ranked first.
- Current CB2 audit also observed Build step `1. Codex` on production.

Boundary:

Do not promote "Codex callable Build execution" until a live Step 3 Build proof shows Codex was selected and invoked.

## Candidate 7 - Clerk Ticket Redirect And App-Origin Session

Claim scope:

FlowAI-owned Clerk ticket route consumes a one-time Clerk ticket without exposing it, lands on Flow Hub Production, establishes a signed-in Clerk app session, and allows app-origin `/api/me` to return authenticated Clerk state while no-session `/api/me` remains anonymous under `AUTH_REQUIRED=false`.

Evidence:

- Primary current rerun: `docs/cto/ct2-live-proof-sweep-acceleration-result-20260614.md`
- Earlier passing rerun: `docs/cto/ct2-clerk-ticket-redirect-live-rerun-result-20260614.md`
- `verifiedAt`: `2026-06-14`
- `verifiedBy`: `CT2 live production browser acceptance`
- Evidence label: `LIVE_PRODUCTION`

Observed:

- FlowAI-owned `/sign-in-token?ticket=<redacted>&redirect_url=/flow-hub/production` was used.
- CT2 did not open the Clerk hosted token URL.
- Final browser route landed on `/flow-hub/production`.
- Ticket was scrubbed from the URL and was not visible in text.
- Clerk frontend state was signed in with session/token present.
- App-origin `/api/me` returned `authenticated:true`, `authMode:"clerk"`.
- Fresh no-session `/api/me` remained anonymous/open.
- Disposable Clerk user cleanup succeeded.

Boundary:

This does not prove production paid-user onboarding, organization membership enforcement, or `AUTH_REQUIRED=true` gating.

## Candidate 8 - Fresh Build Path Produced A Public URL

Claim scope:

FlowAI Fresh Build path produced a CT2-confirmed public deployed URL for a generated, platform-free VEU AI Studio website from a real Fresh Build run.

Evidence:

- Public evidence URL: `https://flowai-fresh-public-veusite.vercel.app`
- CTO run result: `docs/cto/path3-fresh-build-veusite-publictarget-result-20260614.md`
- Raw run SSE: `docs/cto/path3-fresh-build-veusite-publictarget-proof-20260614/cto-path3-veusite-publictarget-20260614-1253.sse`
- CT2 browser acceptance: `docs/cto/ct2-path3-publictarget-acceptance-result-20260614.md`
- `verifiedAt`: `2026-06-14`
- `verifiedBy`: `CT2 browser acceptance + FlowAI runtime proof`
- Evidence label: `LIVE_PRODUCTION`

Observed:

- FlowAI runtime commit `eb290b490093c199596ec7b0a178aac0dd73c1fe` ran Path 3 Fresh Build.
- Runtime returned public URL `https://flowai-fresh-public-veusite.vercel.app`.
- Runtime preview probe reported HTTP `200`, `PREVIEW_BROWSER_CLEAR`, and `bypassAttempted:false`.
- Generated branch `flowai/fresh-build-url-416b941ffbc3b7d5-cto-path3-veusite-publictarget-20260614-1253` has `342` files.
- Forbidden retained FlowAI platform prefixes were absent.
- CT2 opened the public URL in a fresh anonymous browser with no bypass header.
- CT2 observed generated Victor Udo / VEU AI Studio / FlowAI-positioning content.
- CT2 observed no Vercel protection page and no FlowAI operator shell.

Boundary:

This proves Fresh Build can produce one public generated URL. It does not prove all Fresh Build submissions work, Path 2 Production URL generation, or full 8-step forge completion. CT2 noted sampled nav links left the generated public target domain for `victorudo.com`, so same-origin generated-route handling remains a separate polish/follow-up claim.

## Explicitly Excluded

Path 2 Production URL:

- No current CT2-confirmed deployed URL from Path 2 is included.

Full 8-step forge completion:

- No proof yet shows complete 8-step forge execution across Research, Design, Build, Quality Audit, Deploy, Self-Renewal, GTM, and Monitor.

## CTO Recommendation

W04/CEO final directive authorized matrix movement for the batch packet. CTO applied only the narrow exact-row set.

Safe authorization set:

- 1 deployed-URL claim for Migration Path.
- 4 Flow Hub axis propagation claims.
- Optional 1 narrow TIM Build Codex visibility/ranking claim.
- Optional 1 narrow Clerk ticket/session claim.
- Optional 1 narrow Fresh Build public URL claim.

Still not authorized / not promoted:

- Path 2 URL production.
- full 8-step forge completion.
- Codex live Build invocation.
- SAIGE typecheck-clean migration completion.
