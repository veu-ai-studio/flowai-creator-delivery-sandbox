# CTO Buy-In Review - Comprehensive Directive To Reach 95/100 SSOT

Date: 2026-06-14 UTC
Owner: CTO
Source directive: W04 / Victor Udo, FNSE, PhD - CEO, pasted 2026-06-13
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`

## Verdict

CTO accepts the directive as the controlling operating strategy with evidence-preserving revisions.

The mission, anti-drift rules, bench ownership model, milestone sequence, and success definition are directionally correct and consistent with the SSOT. The pasted draft included stale factual claims, so it must not be copied verbatim into `docs/cto/current-directive.md`.

## Required Evidence Corrections

- Active matrixArtifact status remains `VERIFIED=0`, `WIRED=0`, `CURRENT=2`, total entries `39`.
- Path 1 Migration has a CT2-confirmed public deployed URL, `https://saige-v2.vercel.app`, but no matrixArtifact VERIFIED movement has been applied.
- Milestone 1 axis wiring is no longer "in progress"; it is CT2-proven at the live-production evidence level and pending W04/CEO VERIFIED promotion clearance.
- Clerk auth is no longer simply "not enabled." Production health now reports `clerkReady:true`, `/sign-up` and `/sign-in` render real Clerk UI, and `/api/me` remains open in anonymous mode while `AUTH_REQUIRED=false`.
- Full authenticated Clerk session proof is still blocked. CT2 hit a Cloudflare human-verification challenge on public sign-up, and the backend-created user plus sign-in-token proof did not propagate a Clerk session to `/api/me`.
- Codex TIM Build rank/callability code is present on main, but live Step 3 Build evidence is still required before any verified behavior claim.
- Latest origin/main includes docs-only evidence commits after the runtime merge. Runtime proof must cite the exact production deployment/commit under test.

## Revisions Applied

- `docs/cto/current-directive.md` is refreshed as the single session-start operating directive.
- The directive keeps W04/CEO's milestone order but replaces stale baseline facts with current repo evidence.
- VERIFIED promotion is framed as a packet-and-clearance process only. The CTO may prepare packets; W04/CEO must authorize application.
- Clerk auth is reframed as a session-propagation blocker, not an env/key blocker.
- Flow Hub path naming is kept as the product UI axis: Production, Migration, Fresh Build. Canonical SSOT input modes remain distinct from the UI path labels.

## CTO Implementation Buy-In

The directive is accepted with one operational guardrail: do not run multiple runtime branches in parallel. Docs, review prompts, evidence packaging, and read-only diagnostics may proceed in parallel, but code-bearing runtime work stays one active branch at a time unless W04/CEO declares a hotfix or explicit exception.

## Next Technical Starting Point

The next implementation revision should map the Clerk session boundary before dispatching CB again:

1. Identify how Clerk frontend session state is expected to reach `/api/me`.
2. Confirm whether app API calls need a Clerk bearer token from Clerk React instead of relying on cookies alone.
3. Dispatch CB with the full session-propagation fix in one branch, including tests and CT2 proof instructions.
4. Do not move VERIFIED during this work.
