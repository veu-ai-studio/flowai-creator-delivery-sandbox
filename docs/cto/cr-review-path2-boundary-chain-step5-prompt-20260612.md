# CR Review Prompt - Path 2 Boundary Chain Step 5

From: CTO
To: CR
Date: 2026-06-12

## Assignment

Review runtime branch `fix/path2-platform-boundary-chain` at commit `4290b39312e69087be8cd3a09bb3a68efef4802a`.

Use the packet:

`docs/cto/path2-boundary-chain-step5-review-packet-20260612.md`

## CR Focus

Take a code-review stance. Lead with bugs, regressions, missing tests, or unsafe behavior.

Check:

- Whether `observed` URL field logic is correct and cannot promote fallback context.
- Whether active-target host filtering can accidentally drop valid observed findings.
- Whether `filePath: null` behavior in prioritization causes hidden behavior regressions.
- Whether branch creation is reachable only for safe app-layer mapped findings.
- Whether platform/Base44/auth files remain blocked.
- Whether tests actually cover the prior Path 2 failure and the safe-app-layer branch path.
- Whether `npm run preflight` and focused tests are enough for merge before live proof.

Files to review:

- `src/lib/agents/renewal/orchestrator.js`
- `src/lib/sourceMapping/registeredRepoSourceMapper.js`
- `src/lib/sourceMapping/sourceMappedFixGenerator.js`
- `tests/agents/renewal/orchestrator.test.js`
- `tests/sourceMapping/registeredRepoSourceMapper.test.js`

## Required Verdict

Return one of:

- PASS
- PASS-WITH-FINDINGS
- BLOCK

If BLOCK, state the exact required patch before merge.

No VERIFIED movement is authorized.
