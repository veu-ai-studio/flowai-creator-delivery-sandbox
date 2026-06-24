# M4 Creator Type 2 Implementation Dispatch

From: CTO (Codex)
To: CB / CT2 / CR as assigned
Date: 2026-06-24
Status: Active implementation order

## Objective

Prove whether FlowAI's SSOT Creator path can take a description-only request and return a deployed working product.

Required chain:

```text
Description-only request
-> Existing SSOT Creator surface
-> FRESH_BUILD / codebaseGenerator
-> Selected build tool
-> Generated app
-> Deploy
-> Browser-verified user journey
```

This is not another dispatch or deploy-chain plumbing proof. The thing under test is the real Creator Type 2 path.

## Mandatory Path

M4 must run through the existing SSOT Creator surface: New Build / Type 2 / FRESH_BUILD through `codebaseGenerator`.

Do not create a new bespoke description route. Do not send a prompt through the M3 deploy-chain worker and call it Creator. Do not crawl a source URL. Do not read an existing source repo. Do not hand-build the product outside FlowAI.

If the existing SSOT Creator cannot perform the required work, stop and report the exact wall. That STOP is a valid and useful M4 outcome.

## Product Prompt

Use a description-only request for:

Community Resource Navigator

The generated product must help an underserved user describe a need, choose a resource category, receive a recommended next step, and save/retrieve at least one request if persistence is attempted.

No source URL is allowed.

## Primary Target: Option B, Persistence-Backed

Attempt Option B first.

Acceptance requires:

```text
Need A + category
-> Recommendation A

Need B + category
-> Recommendation B
```

The recommendations must be materially different. A single fixed response regardless of input fails.

The traceability marker `FlowAI M4 Creator Type 2 verified <commit>` is only traceability. Rendering the marker does not satisfy the user journey. A page that shows the marker but does not respond meaningfully to input fails.

## Persistence Acceptance For Option B

CT2 must verify, in this exact sequence:

1. Write: enter data in browser context 1 and submit it.
2. Persist: confirm the record is stored server-side, not only in page state or `localStorage`.
3. Cold reload: open the deployed URL in a separate fresh browser context with no shared cookies or session.
4. Retrieve: the data written in context 1 is visible in context 2.

In-page React state, query strings, IndexedDB, or `localStorage` do not satisfy persistence. Persistence means a backend stored it and a different session read it back.

If Option B fails because the SSOT Creator cannot provision persistence through `codebaseGenerator`, stop and report. That is a successful discovery of the real Creator wall, not a failed milestone.

Do not route around the codebaseGenerator backend limitation by building a separate persistence-capable path.

## Fallback Target: Option A, Static / Frontend-Only

If Option B honestly stops on persistence provisioning, CB may rerun as Option A only through the same SSOT Creator path.

Option A must still prove:

```text
Description-only request
-> Generated deployed app
-> Need A produces materially different output than Need B
-> CT2 verifies in browser
```

Claim if successful:

`CREATOR TYPE 2 DESCRIPTION-ONLY DEMONSTRATED (STATIC/FRONTEND-ONLY)`

Option A does not prove operational software, persistence, Upgrader, or Universal Engine.

## Claim If Option B Succeeds

`CREATOR TYPE 2 DESCRIPTION-ONLY DEMONSTRATED (PERSISTENCE-BACKED)`

Nothing else moves automatically.

No ProductSSOT VERIFIED movement.
No Universal Engine claim.
No Upgrader claim.
No general "Creator Verified" claim without independent adjudication.

## M3 Cleanup Conditions Running In Parallel

C1. Independent verifier read access:
CT2 / CR must be able to read the generated commit and deployed artifacts independently. If granting verifier read access requires credential authority CB does not hold, that is a BLOCK to surface to Victor. Do not self-grant as builder. Do not skip independent read-back.

C2. Security review:
Review the M3 operator-secret change. Confirm whether `FLOWAI_INTERNAL_SECRET` is an appropriate operator credential for `/api/forge/build`, whether it broadens auth too far, and whether rollback or narrower scoping is required. This review is separate from "the chain ran."

C3. Builder is not merger:
M4 evidence goes to origin for independent non-builder adjudication before any merge to `main`. Do not self-verify and merge M4 to `main`.

## Standing Infrastructure Note

The Git to Vercel deploy and build-identity path has been unreliable: manual CLI deploys and stale `/api/version` were required during M3. Record this as an operational gap. It does not block M4, but it blocks any later "operationally dependable" claim.

## Evidence Required

Commit to `docs/cto/`:

- M4 evidence packet.
- Raw request / response, with secrets redacted.
- Selected tool evidence.
- Generated commit SHA.
- Deployed URL.
- CT2 browser verification with screenshots or recording references.
- Two-input material-difference proof.
- Persistence proof or persistence STOP evidence.
- Security review result for C2.

## Stop Conditions

Stop and report if:

- The path does not enter the existing SSOT Creator / FRESH_BUILD / codebaseGenerator path.
- A source URL or source repo is required.
- The implementation would need a bespoke Creator route.
- `codebaseGenerator` cannot provision persistence.
- The generated app is static when Option B is being claimed.
- Independent verifier access cannot be established.
- The deployed app does not render.
- The user journey is cosmetic or fixed-response only.

## Success Criteria

M4 succeeds only if the deployed app is publicly reachable and CT2 independently confirms the claimed journey in a browser.

The next valuable artifact is evidence, not another dispatch.
