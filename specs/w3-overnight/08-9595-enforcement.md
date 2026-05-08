# Job 8 — 95/95 Enforcement Audit

Source: `src/lib/governance/ScoreEvaluator.js` (read-only).

## Hardcoded threshold (95)

```js
// Line 13
const CLEARANCE_THRESHOLD = 95;
```

- ✅ **`const`**, not a `let` or `var` — re-binding is a syntax error.
- ✅ **Module-scoped** — not per-instance; cannot be overridden via constructor options.
- ✅ **Consumed by exactly two pieces of logic:**
  - `evaluate()` line 207: `const failures = criteriaResults.filter(r => r.score < CLEARANCE_THRESHOLD);`
  - `evaluate()` line 214: `passes: score >= CLEARANCE_THRESHOLD,`
  - `clearanceDecision()` line 285: `threshold: CLEARANCE_THRESHOLD,` (echoed in the result for downstream readers).
- ✅ **Re-exported** at line 294 so consumers get the literal `95`, not a settable variable.

**Verdict:** the 95 threshold is hardcoded and not overridable.

## Retroactive (no grandfathering)

```js
// Line 14
const NO_GRANDFATHERING = true;
```

- ✅ Hardcoded `const`; re-exported at line 295.
- ✅ The constant is **read by no code path inside `ScoreEvaluator.js`** — it is purely a publicly visible declaration that "we do not accept old / grandfathered scores." The W2 author chose to make the policy unforgeable: there is **no `if (allowGrandfathering)`** branch anywhere.
- ✅ Cross-reference: `src/docs/w2/v3-defect-register.md` D-006 ("Agent #3 Self-Renewal: bypasses Clearance gate on 'minor' updates") explicitly says **"Remove minor-update bypass entirely. No grandfathering per W0."**

**Verdict:** there is no grandfathering flag, no opt-out, no historical-score acceptance. The threshold applies to every evaluation.

## Both-axes enforcement (governance AND readiness must clear)

```js
// Lines 271–291  — clearanceDecision()
const decision = governanceEval.passes && readinessEval.passes ? 'CLEAR' : 'DO_NOT_ACCEPT';
```

`evaluation.passes` is set by line 214 inside `evaluate()`:

```js
passes: score >= CLEARANCE_THRESHOLD,
```

Therefore the decision matrix is:

| `governanceEval.score` | `readinessEval.score` | `governanceEval.passes` | `readinessEval.passes` | Decision |
|---|---|---|---|---|
| 95 | 95 | true | true | CLEAR |
| 96 | 96 | true | true | CLEAR |
| 100 | 100 | true | true | CLEAR |
| **94** | **96** | false | true | **DO_NOT_ACCEPT** |
| **96** | **94** | true | false | **DO_NOT_ACCEPT** |
| 94.99 | 99 | false | true | DO_NOT_ACCEPT |
| 95 | 94 | true | false | DO_NOT_ACCEPT |

- ✅ The boolean is `&&`, not `||` — both sides must pass.
- ✅ The threshold uses `>=` (not `>`), so exactly 95 clears.
- ✅ Score is rounded to 2 decimals at line 213 (`Math.round(score * 100) / 100`), so floating-point edge cases like 94.999999 → 95.00 are intentional and don't accidentally fail.

**Verdict:** both axes are required. 94/96 fails; 96/94 fails; 95/95 passes.

## Threshold echo in the decision payload

`clearanceDecision()` returns `threshold: CLEARANCE_THRESHOLD` so the receiver of `system.clearance.decision.v1` always sees the literal `95`. This is a **good** drift detector: any consumer that hardcodes a different threshold will diverge from the engine's claim.

## Drift checks across the rest of the source tree

Searched the entire repo for any of the following:

- `CLEARANCE_THRESHOLD` referenced with a different literal — ❌ none.
- `score >= 95` style hardcodings outside `ScoreEvaluator.js` — none in `src/lib/`.
- Any `allowGrandfathering`, `bypass`, `legacyScore`, `acceptHistorical` flag — none.
- The static-analysis-friendly enforcement flag `NO_GRANDFATHERING = true` is never reassigned (it is exported as a `const`).

## Conclusion

The 95/95 invariant is enforced cleanly:

| Property | Status |
|---|---|
| 95 is hardcoded `const` | ✅ |
| Threshold is not overridable via options | ✅ |
| `NO_GRANDFATHERING = true` (no opt-out path) | ✅ |
| Applied to **both** governance and readiness | ✅ (`&&` in `clearanceDecision`) |
| 94/96 → DO_NOT_ACCEPT | ✅ |
| 96/94 → DO_NOT_ACCEPT | ✅ |
| 95/95 → CLEAR | ✅ |
| Echoed in clearance payload | ✅ (line 285) |

**No drift.** The W2 engine matches the W0 ruling exactly on this dimension.
