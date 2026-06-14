# CT2 Path 2 Post-Merge Production Proof Result - RelTwin

Date: 2026-06-14

CT2 lane: Path 2 post-merge production proof

Production target: `https://flowai-dun.vercel.app`

Dispatch product target: `https://reltwin.com`

Product scope: `reltwin`

Requested run ID: `ct2-path2-reltwin-postmerge-20260614`

Actual run ID: `ct2-path2-reltwin-postmerge-20260614`

Tested production SHA: `d6b92d54e1693fd18f37b5549df9d68285204449`

Branch: `main`

Runtime deployment observed by `/api/health`: `https://flowai-22fb3bmld-veu-ai-studio.vercel.app`

Verdict: PASS, with one caution. Production avoided the prior GitHub App PEM signing hard failure, used explicit redacted fallback to `GITHUB_OPERATOR_TOKEN`, detected the unsafe same-repo upgrade target before any branch or PR creation, produced no preview/deployed URL, and terminated cleanly. Caution: the final terminal reason was `NO_FIXES_GENERATED`; the unsafe same-repo guard appeared as a clear step-level `UPGRADE_TARGET_UNSAFE` result rather than the final terminal exit reason.

## Evidence Packet

Redacted evidence is stored in:

- `docs/cto/ct2-path2-postmerge-production-proof-20260614/request-response.md`
- `docs/cto/ct2-path2-postmerge-production-proof-20260614/polling-transcript.md`
- `docs/cto/ct2-path2-postmerge-production-proof-20260614/final-summary.json`
- `docs/cto/ct2-path2-postmerge-production-proof-20260614/guard-auth-transcript.json`

No browser UI screenshot was captured because the proof was run through production API/status endpoints only.

## Dispatch Acceptance Questions

1. Does `/api/health` report the expected commit?

Answer: PASS. `/api/health` reported `commitFull: d6b92d54e1693fd18f37b5549df9d68285204449`, `branch: main`, `githubAppReady: true`, and `inngestReady: true`.

2. Does the run pass pre-fix scoring again?

Answer: PASS. The run reached `Five-Layer Scoring (Pre-Fix)` successfully. Final summary reported `finalScore: 56`, `rawScore: 56`, `effectiveTrustScore: 33.6`, `gtmReady: false`, and 8 findings.

3. Does GitHub auth now avoid the PEM signing hard failure through explicit safe fallback, or does it still fail?

Answer: PASS. The transcript contained no PEM/private-key signing failure. `/api/health` reported GitHub App configured with PAT fallback, and the run recorded `fallbackFrom: github_app_installation`, `fallbackReason: GITHUB_AUTH_FAILED`, `credentialSource: GITHUB_OPERATOR_TOKEN`, and `tokenRedacted: true`.

4. Does the unsafe same-repo upgrade-target guard block before branch creation?

Answer: PASS with caution. `upgradeTargetResolver.js` detected `writeSafety.ok: false`, `code: UPGRADE_TARGET_UNSAFE`, and `reason: upgrade_repo_matches_original_repo` while both original and upgrade repo were `https://github.com/veu-ai-studio/rel-twin`. No branch, PR, commit, or preview was produced. Caution: the run continued to recommend-only/fix-generation steps and ultimately ended as `NO_FIXES_GENERATED`, so the unsafe target was a clear pre-branch guard finding rather than the final exit reason.

5. If blocked, is the blocker plain and honest rather than generic `STEP_FAILED`?

Answer: PASS. The guard evidence was plain: `UPGRADE_TARGET_UNSAFE` / `upgrade_repo_matches_original_repo`. The final exit reason was `NO_FIXES_GENERATED`, not generic `STEP_FAILED`.

6. If a safe target is somehow available, does branch creation occur?

Answer: NOT APPLICABLE / PASS. No safe target was available; the active original and upgrade repositories matched. No branch creation occurred.

7. Is any preview/deployed URL produced?

Answer: PASS. No new preview/deployed URL was produced. Final summary had `previewUrl: null`, `prUrl: null`, `deployUrl: null`, `deployedUrl: null`, and `branch: null`. The status payload echoed `https://reltwin.com` as canonical/original context only; CT2 did not count that as a new observed deployment.

8. Does the UI ever overclaim a deployed URL or VERIFIED movement?

Answer: PASS. No UI was used in this proof. API/status evidence did not produce a preview/deployed URL, PR URL, branch, or VERIFIED movement.

9. Does the run terminate cleanly, not hang?

Answer: PASS. The run queued at `2026-06-14T20:53:27.832Z`, started at `2026-06-14T20:53:28.866Z`, and completed at `2026-06-14T20:56:06.787Z` with `status: completed`, `final: true`, and 53 events. Runtime was about 158 seconds, under the 12-minute cap.

## Final Notes

- No production-changing commands were run by CT2.
- No code, canonical docs, or VERIFIED state were changed.
- Existing unrelated working-tree changes were left untouched.
- Evidence files intentionally omit token values, private keys, Authorization headers, cookies, and secret environment values.

