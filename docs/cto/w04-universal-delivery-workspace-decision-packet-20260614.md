# W04 Decision Packet - Universal Delivery Workspace

FROM: CTO
TO: W04 / Victor Udo, FNSE, PhD - CEO
DATE: 2026-06-14 UTC
Branch: `docs/cto-auto-repo-provisioning-plan`
Status: ready for W04 decision
Runtime work: not dispatched
VERIFIED movement: no
Canonical docs: not edited

## Decision Needed

Clear or revise the Universal Delivery Workspace direction.

This is the architecture decision created by the combined universal-input audit and auto-repo infrastructure audit. The question is not whether FlowAI eventually needs this capability. The audits show it does. The question is whether CB is now cleared to turn it into the next runtime build target.

## Evidence Basis

Read these files for the full record:

1. `docs/cto/universal-input-journey-audit-20260614.md`
2. `docs/cto/auto-repo-provisioning-infrastructure-audit-20260614.md`
3. `docs/cto/w04-universal-delivery-workspace-clearance-request-20260614.md`
4. `docs/cto/cb-universal-delivery-workspace-dispatch-draft-20260614.md`

## CTO Recommendation

Choose **Option A**.

### Option A - Clear Universal Delivery Workspace Now

Approve the direction that every non-preconfigured user run must get a FlowAI-owned delivery workspace:

- FlowAI-owned GitHub repo
- code written by FlowAI
- FlowAI-owned Vercel project/deployment
- returned public URL
- ProductSSOT/evidence binding

After this approval, CTO issues a `CLEAR TO EXECUTE` CB dispatch from the existing draft. CB first commits a diagnosis artifact, then implements the smallest runtime substrate needed for one proof.

Recommended first proof after merge: Type 2 description-only Fresh Build, because it avoids source-repo ambiguity and proves repo/project creation from nothing.

### Option B - Revise Scope Before Build

W04 revises one or more of these boundaries before CB starts:

- persistence backend,
- GitHub org/repo visibility,
- Vercel project strategy,
- first proof target,
- token fallback policy,
- SSOT amendment timing.

CTO then updates the CB draft and session brief before any runtime work begins.

### Option C - Pause Universal Delivery, Continue Product-Specific Proofs

Continue Path 2/RelTwin or other preconfigured-product proofs first.

CTO does not recommend this because it risks proving a narrow internal product path while the newly identified real-user architecture gap remains open.

## Recommended W04 Clearance Text

```text
FROM: W04
TO: CTO

CLEAR ARCHITECTURE DIRECTION - Universal Delivery Workspace.

Proceed with Option A.

FlowAI must own delivery infrastructure for non-preconfigured user runs:
- auto-create/resolve a FlowAI-owned GitHub repo
- write code to that repo
- auto-create/resolve a FlowAI-owned Vercel project
- deploy from the repo/branch
- return a public URL
- persist workspace metadata and ProductSSOT evidence

Use docs/cto/cb-universal-delivery-workspace-dispatch-draft-20260614.md as the basis for CB dispatch.

Constraints:
- no canonical doc edits without W04/CEO clearance
- no VERIFIED movement
- no user GitHub/Vercel requirement
- no token persistence
- no writes to protected original repos
- CB must commit the required diagnosis artifact before runtime patching
- CD and CR review required before merge
- CT2 proof required after production deploy

First proof target after merge: Type 2 description-only Fresh Build unless diagnosis shows a safer faster target.

Report progress through docs/cto/.
```

## If W04 Chooses Option A

CTO next action:

1. Create `docs/cto/cb-universal-delivery-workspace-dispatch-20260614.md` from the draft.
2. Mark it `CLEAR TO EXECUTE`.
3. Push the dispatch to origin.
4. Signal CB to begin diagnosis-first runtime work.
5. Prepare CD/CR review prompts once CB posts evidence.

Victor action required: none, unless GitHub/Vercel dashboard authorization proves impossible to automate safely.

## If W04 Chooses Option B

CTO next action:

1. Apply W04 revisions to the draft dispatch.
2. Update `docs/cto/session-brief.md`.
3. Push revised docs.
4. Wait for W04 final clearance before runtime dispatch.

Victor action required: only the specific CEO decision W04 identifies.

## If W04 Chooses Option C

CTO next action:

1. Keep Universal Delivery Workspace documented as an acknowledged architecture gap.
2. Resume the Path 2 review/merge/proof chain under explicit W04 exception.
3. Label any resulting proof as product-specific, not universal.

Victor action required: none unless W04 also authorizes VERIFIED movement or Path 4 execution.

## CTO Position

Option A is the right move. It aligns the implementation with the actual user promise:

User submits an input. FlowAI returns a deployed URL. The user never touches GitHub, Vercel, repos, projects, branches, tokens, or deployment configuration.
