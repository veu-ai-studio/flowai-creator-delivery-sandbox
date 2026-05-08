# 12 — Cross-Territory Boundary Check

**Generated:** 2026-05-07 · **Goal:** For each file in `src/lib/shared/`, verify it is imported by ≥ 2 workstreams. Files used by only one workstream should be flagged for relocation back to that workstream's territory.

## Methodology

For each file under `src/lib/shared/`:
1. Grep `from ['"].*lib/shared/<file>` and `from '@/lib/shared/<file>` across `src/` and `tests/`.
2. Tag each consumer with its owning workstream (W1 / W2 / W3 / W4 / tests).
3. Count distinct workstreams. ≥ 2 = legitimate shared. = 1 = relocation candidate.

(`tests/` does not count as a workstream consumer — tests can live anywhere; the question is whether *production* consumers span workstreams.)

## File: `src/lib/shared/CredentialAdapter.js`

### Production consumers (excluding tests/)

| Consumer | Workstream | Note |
| --- | --- | --- |
| `src/pages/BaseAgentTest.jsx:7` (`import { CredentialAdapter } from '@/lib/shared/CredentialAdapter';`) | W4 | Manual test/probe page in the FlowAI UI; constructs an adapter to demonstrate behavior. |

### Test consumers

| Consumer | Workstream the test belongs to |
| --- | --- |
| `tests/baseagent.test.js` | W2 (BaseAgent integration) |
| `tests/credentialadapter-edge.test.js` | W5 (this audit) |
| `tests/credentialadapter-integration.test.js` | W2/W5 boundary (BaseAgent + CredentialAdapter) |

### Specs / docs that name the file

`src/docs/w2/v3-defect-register.md` (entries D-007, X-006) — W2 owner, but the file is the W1/W5 boundary contract per Packet 1.5.

### Verdict

**Legitimate shared file.** Even though only ONE production import currently exists (`BaseAgentTest.jsx`), the file IS the W1↔W2 contract surface:

- **W1 territory:** vault / Doppler architecture (per defect register). The adapter exists *because* W1 wants this contract.
- **W2 territory:** every embedded agent (`#1, #2, #3, #6, #7, #9, #10, #13, #15, #17, #19, #20`) is supposed to consume credentials through this adapter — those consumers don't yet exist as code, but the contract is documented and ratified (Packet 1.5).
- **W4 territory:** `BaseAgentTest.jsx` is already wired in.

So the multi-workstream consumption is **structural** (architected) rather than **observed** (only one current import). The file is correctly placed in `shared/` because:
1. It is the W1 vault contract (W1 ↔ everyone).
2. W2's BaseAgent.run() is expected to receive an injected adapter when the embedded agents land.
3. W4 already imports it.

If a single workstream owned exclusive consumption, the relocation question would arise. That is not the case here.

### Risk: low import count today

The "≥ 2 workstream consumers" rule is satisfied by W4 (production) + W2 (tests-only), with the W1/W2 production consumers latent. Recommend revisiting this audit after Wave 2 lands to confirm the embedded agents actually consume the adapter through `getDefaultCredentialAdapter()` at runtime. If they don't (e.g. they bypass it for direct Doppler calls), the file becomes W4+test-only and the question reopens.

## Summary table

| File | Production consumers | Distinct workstreams | Verdict |
| --- | --- | ---: | --- |
| `CredentialAdapter.js` | `src/pages/BaseAgentTest.jsx` (W4); architected for W1+W2 future consumption | 1 today, 3 architected | KEEP in `shared/`. No relocation. Re-check after Wave 2. |

## Out of scope

- Files that ought to exist in `shared/` but don't yet (jobs 03, 04, 05, 06, 07, 08, 09 candidates). Those have no consumers yet by definition.
- Bidirectional consumption (does `shared/` import from W1/W2/W3/W4?) — `CredentialAdapter.js` has zero imports, so this is moot.
