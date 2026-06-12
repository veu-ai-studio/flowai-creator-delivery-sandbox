# CR Review Prompt - TIM Codex Build Tool Step 5

FROM: CTO
TO: CR
ACTION: Step 5 adversarial review

Review branch:

- Branch: `origin/fix/tim-codex-build-tool`
- Head: `a6b82e5c893fac1491b2c25611a680bd1ca0bed8`
- Runtime base: `b4e02c566378e5f00b17252f9db176e20f9e7d42`
- Current `origin/main`: `2fa932d3d753ced3e1bb36b61b3a11f3cbd7da45` docs-only after the runtime base

Primary adversarial question:

Does this branch add Codex as rank-1 and callable without overclaiming what the adapter actually proves?

Please attack these risks specifically:

1. False Codex proof: selected Codex must not silently fall back to Claude Code, Cursor, or another member and still be counted as Codex.
2. Credential honesty: missing `OPENAI_API_KEY` must stop live Build dispatch clearly, not degrade into a fake success.
3. UI honesty: browser/static TIM UI must not report Codex as available if availability requires a server-side credential check.
4. Tool order: Build candidates must be exactly `Codex`, `Claude Code`, `Cursor`, `Bolt`, `Windsurf`, `Replit`, `Base44`.
5. Score integrity: Build order normalization must not erase observed score fields for matching stored DB rows.
6. Migration safety: rank 6 and 7 should be allowed for Build only; other steps should remain rank 1..5.
7. Secret safety: no secret value should be logged, exposed, or committed.
8. Governance boundary: no VERIFIED movement, no matrixArtifact movement, no canonical SSOT mutation.

Known verification:

- Focused TIM suite PASS: 8 files, 136 tests.
- Syntax checks PASS for `src/lib/orchestra/codex.js` and `src/lib/tools/buildToolRanking.js`.
- `git diff --check` PASS with Windows line-ending warnings only.
- `npm run build:preflight` PASS.

Return PASS or BLOCK with exact file/line evidence.
