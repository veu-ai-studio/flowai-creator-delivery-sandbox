# TIM Amendment Plan - Codex as Step 3 Build Tool

Date: 2026-06-12
From: CTO
To: W04 / CB / CD / CR
Scope: Tool Intelligence Marketplace, Step 3 Build
Runtime repo: `C:\Users\victo\Downloads\truthful-flow-logic-lab`
Canonical authority: `docs/CANONICAL_REFERENCE.md`, `docs/BUILD_PROTOCOL.md`, `docs/IMPLEMENTATION_PLAN.md`
VERIFIED movement: no

## Executive Decision

Codex must be represented in the Tool Intelligence Marketplace as the rank-1 Build candidate for Step 3.

Target Step 3 Build ranking:

1. Codex
2. Claude Code
3. Cursor
4. Bolt
5. Windsurf
6. Replit
7. Base44

This is a correction to FlowAI's live operating reality. Codex is already the proven build lane for FlowAI: it reads the repo, edits multi-file code, runs tests, pushes branches, records evidence, and supports CR review. The Build step cannot honestly omit Codex while claiming an autonomous product upgrade engine.

## Governing References

Read before this plan:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`

Relevant constraints:

- FlowAI output must be a real delivery artifact, not a claim-only report.
- Input mode, Tool Intelligence mode, and System Operation mode vary independently.
- Build/wire construction must preserve safety gates, parse gates, regression guards, governance, and no-VERIFIED-without-evidence discipline.
- Any dispatch touching tool selection, Forge runners, orchestration, deploy, persistence, or ProductSSOT requires a live forge health check at the highest applicable proof level.

## Current Code Reality

### UI / Step Card Visibility

`src/lib/tools/stepToolVisibility.js` currently exposes Build candidates as:

- Claude Code: `pending_operator_gate`
- Cursor: `stub_unavailable`
- Base44: `stub_unavailable`

Codex is missing from the Build candidates entirely.

### Marketplace Registry

`src/lib/toolRegistry.js` currently has Build entries for:

- Base44
- Replit
- Bolt
- Cursor
- Windsurf

Codex is missing from the Build category, and VEU stack defaults still list `Base44` as the Build tool.

### Dispatch Contract

`src/lib/tools/toolDispatchContract.js` has aliases and credential checks for `claude-code`, `vercel`, `browserless`, `playwright`, `base44`, `lovable`, `v0`, `cursor`, `replit`, `openrouter`, and `perplexity`.

Codex has no alias, no credential contract, and no dispatch eligibility path.

### Orchestra Members

`src/lib/orchestra/index.js` currently routes `code-patch` and `generate-from-scratch` to `claudeCode` unless a member is explicitly selected.

There is no `src/lib/orchestra/codex.js` member.

The existing `claudeCode` member is an Anthropic API prompt adapter. It produces patched content or generated project files; it does not itself run git, npm, tests, or Vercel. Downstream engines perform write/deploy work.

### Forge Build Runner

`src/lib/forge/buildRunner.js` selects the first pipeline tool from Tool Intelligence and, in AUTOMATIC mode, dispatches `code-patch` through the orchestra.

It currently asserts `ANTHROPIC_API_KEY` before live dispatch. That is correct for Claude Code but wrong once Codex is the preferred build member.

## Architecture Requirement

There are two separate requirements, and both must be true:

1. Codex must be visible and ranked #1 in the Step 3 Build TIM candidate list.
2. Codex must be honestly callable before the UI or SSE says `CALLABLE`.

An honest `CALLABLE` Codex state requires a real adapter path. It must not merely rename Claude Code or a prompt-only stub.

Minimum callable contract:

- member id: `codex`
- display name: `Codex`
- capabilities: `code-patch`, `generate-from-scratch`
- dispatch alias support: `Codex`, `OpenAI Codex`, `codex`
- credential status: real server-side credential check, not hardcoded success
- result shape: standard Orchestra `MemberResult`
- safety: no secret leakage, no unchecked shell execution, no direct main-branch write

## Recommended Implementation Shape

### Phase 1 - Registry and Visibility

Add Codex to:

- `src/lib/toolRegistry.js` Build category with rank-driving metadata high enough to win Step 3 Build ranking.
- `src/lib/tools/stepToolVisibility.js` Build list as rank 1.
- VEU stack defaults where Build currently points only to Base44.

Expected UI text:

- `Codex`
- state must be `callable` only when adapter and credentials are real; otherwise use an honest state such as `missing_credentials` or `stub_unavailable`.

### Phase 2 - Dispatch Contract

Add Codex to:

- `TOOL_MEMBER_ALIASES`
- `CREDENTIAL_REQUIREMENTS`
- dispatch eligibility tests

Credential choice must match the actual adapter. If the first adapter uses OpenAI API, the requirement is `OPENAI_API_KEY`. If it uses a separate operator token or worker endpoint, use the specific required secret name.

### Phase 3 - Orchestra Member

Add a real `src/lib/orchestra/codex.js` member and include it before `claudeCode` in `src/lib/orchestra/index.js` for Build/code actions.

Minimum first implementation may mirror the existing prompt-adapter shape if backed by a real OpenAI/Codex-capable API call and validated output. It must be labeled as the actual capability it provides:

- If it returns patched file content, claim `code-patch`.
- If it produces a complete file tree, claim `generate-from-scratch`.
- Do not claim it runs tests or pushes branches unless the adapter actually does those operations.

Full autonomous repo-agent behavior can be a subsequent capability such as `repo-build-fixes`, but the Step 3 Build proof must not overclaim it until implemented.

### Phase 4 - Build Runner Selection

Update `src/lib/forge/buildRunner.js` so live dispatch readiness follows the selected member, not a hardcoded Anthropic credential.

Required behavior:

- If Codex is selected and eligible, Build dispatches to Codex.
- If Codex is selected but not eligible, Build records the honest reason and must not silently relabel Claude Code as Codex.
- If fallback is allowed, fallback must be explicitly labeled as fallback and not counted as Codex proof.

## Four-Path Proof Strategy Impact

The four-path proof strategy now has a cross-cutting Tool Intelligence gate:

- Every path that reaches Step 3 Build must record the Step 3 TIM candidate list.
- Codex must appear as rank 1 for Build.
- If Step 3 executes a build action, evidence must state whether Codex actually produced the build output or whether another tool/fallback did.
- No path can claim "Codex-built" unless the Codex adapter/member is the selected dispatched member and produced the accepted output.

Path-specific impact:

- Path 1 Migration: no retroactive Codex claim; migration evidence remains CB-operated until FlowAI itself invokes Codex.
- Path 2 Production against `saige-v2`: after Path 2 boundary repair merges, the next live proof should capture Step 3 TIM output and selected Build member.
- Path 3 Describe & Build / Fresh Build: code-generation recovery should prefer Codex once callable, because this path depends directly on generating a clean codebase.
- Path 4 Synthesize & Build: multi-URL synthesis remains blocked by multi-URL construction input wiring, but once it reaches Build, Codex must be the preferred generator.

## Acceptance Criteria For CB

CB must produce:

- Codex visible as rank-1 Build candidate in Step 3 UI/SSE helper output.
- Codex present in `TOOL_REGISTRY` Build category.
- Codex registered as an Orchestra member or honestly marked unavailable with a concrete missing adapter reason.
- Dispatch contract resolves `Codex` / `OpenAI Codex` / `codex` to member id `codex`.
- Build runner no longer hardcodes Anthropic readiness when a non-Claude member is selected.
- Unit tests for ranking, dispatch eligibility, member listing, and Build runner selection.
- Browser or runtime proof showing the Step 3 Build card lists Codex rank 1.
- No VERIFIED movement.

## Stop Conditions

Stop and report if:

- Codex cannot be made honestly callable in the current Vercel runtime without an external worker or API surface.
- The only available patch path is a relabeled Claude Code adapter.
- Credential requirements are unknown or cannot be verified without exposing secrets.
- The implementation would bypass parse, diff-preserve, platform boundary, route rewrite, auth gate, secret, package, branch, deploy, governance, or regression gates.

## CTO Position

I agree with W04's direction: Codex belongs at the top of Step 3 Build.

The implementation must be honest. Ranking Codex first is immediate. Calling Codex from FlowAI requires a real adapter path, and the system must clearly distinguish:

- `ranked`: Codex is the preferred Build tool
- `callable`: FlowAI can invoke Codex through a real adapter with required credentials
- `dispatched`: Codex actually generated the accepted build output for this run
- `verified`: live evidence supports the claim

No stronger claim is allowed until the corresponding evidence exists.
