# 05 — Clock / Time Interface Audit

**Generated:** 2026-05-07 · **Goal:** Catalog `Date.now()` / `new Date()` direct calls vs. injected-clock callers; recommend a shared clock interface.

## Catalog

### Files that accept `clock` as DI

| File | How | Default |
| --- | --- | --- |
| `src/lib/shared/CredentialAdapter.js:61` | `opts.clock` constructor param | `{ now: () => Date.now() }` |
| `src/lib/agents/BaseAgent.js:84` | `deps.clock` required | none — throws if missing |
| `src/lib/governance/ScoreEvaluator.js:157-159` | `deps.clock` required | none — throws if missing |

### Files that call `Date.now()` / `new Date()` directly

| File | Call sites | Notes |
| --- | --- | --- |
| `src/lib/auditLogger.js:8` | `new Date().toISOString()` | W4 — Base44 entity write |
| `src/lib/contentProtection.js:69, 80, 94, 107, 124` | `Date.now()` × 4, `new Date().toISOString()` × 1 | W4 — XOR session key + audit + 8h expiry |
| `src/lib/flowExecutor.js:71, 88, 192, 196, 215, 225` | `Date.now()` for run timing, `new Date().toLocaleTimeString()` for log labels | W4 |
| `src/lib/flowSimulator.js:43, 53, 97, 126, 150, 184, 203` | Same as flowExecutor | W4 |
| `src/lib/jobRunners.js:60, 81, 90, 172, 186` | `new Date().toISOString()` for `completedAt` | W4 |
| `src/lib/qaEngine.js:163` | `new Date().toISOString()` | W4 |
| `src/lib/JobContext.jsx:40, 48` | `Date.now()` in id, `new Date().toISOString()` for `startedAt` | W4 |
| `src/lib/SessionContext.jsx:23, 24, 56` | `new Date(...)`, `Date.now() - startedAt.getTime()` | W4 |

### Mixed

`CredentialAdapter.js:61` injects a clock but defaults to a real-time wrapper. The only file that actually uses an injected fake clock today is in `tests/baseagent.test.js:29` (`stubDeps.clock`).

## Findings

1. **Three clock contracts coexist.** CredentialAdapter has a default; BaseAgent and ScoreEvaluator have no default and throw. Either everyone defaults to a real-time clock or everyone forces explicit injection. The split is accidental.
2. **W4 has no clock injection at all.** Every wall-clock read is direct. Tests cannot freeze time without monkey-patching the global `Date`. This is the single largest barrier to deterministic tests for the flow executor / job runner.
3. **Clock surface is inconsistent.** Some callers want unix-ms (`clock.now()`), others want ISO strings (`new Date().toISOString()`), others want elapsed durations (`Date.now() - start`). A shared clock should provide all three so callers stop reaching for `Date` directly.
4. **No monotonic clock.** All `Date.now()` calls are wall-clock; they can move backwards (NTP step, system clock change). For duration measurement (`flowExecutor`, `flowSimulator`) this is a known correctness bug — use `performance.now()` for elapsed.

## Recommended shared interface — `src/lib/shared/clock.js`

```js
// Surface
export const SystemClock: Clock         // real wall + monotonic (browser + node)
export const FrozenClock: (atMs) => Clock   // for tests; .advance(deltaMs) mutator
export function assertClock(clockLike): void

// Clock surface
type Clock = {
  now():        number,         // unix ms, wall clock
  iso():        string,         // ISO-8601 string of now()
  monotonic():  number,         // monotonic ms since arbitrary epoch (use for durations)
  since(start): number,         // monotonic ms since a prior monotonic() reading
}
```

### Defaults policy

- Required-with-default. Constructors do `this.clock = opts.clock ?? SystemClock`. No more "throw if missing".
- `assertClock(x)` is the one place that validates `x.now`, `x.iso`, `x.monotonic`, `x.since` are functions. Callers can use it in their constructors.

### Migration

| File | Change |
| --- | --- |
| `CredentialAdapter.js:61` | Replace inline default with `import { SystemClock } from '../shared/clock.js'`. |
| `BaseAgent.js:84` | Drop `clock` from required list. Default `SystemClock`. Use `clock.iso()` if any audit entry needs ISO. |
| `ScoreEvaluator.js:157-159` | Same as BaseAgent. |
| `flowExecutor.js`, `flowSimulator.js` | Replace `Date.now() - start` with `clock.since(start)` using `clock.monotonic()` for `start`. Eliminates wall-clock-step bugs in duration math. |
| `jobRunners.js`, `qaEngine.js`, `auditLogger.js` | Replace `new Date().toISOString()` with `clock.iso()`. Accept `clock` via factory or context (W4 follow-up). |
| `contentProtection.js:107` | Replace `Date.now() - ts > 8h` with `clock.since(ts) > 8h` using monotonic. (Caveat: monotonic doesn't survive page reload — for cross-reload expiry, wall clock is correct here. Document both options on the helper.) |
| `JobContext.jsx`, `SessionContext.jsx` | Same as jobRunners. |

## Edge cases for `FrozenClock`

| Edge case | Required behavior |
| --- | --- |
| Test calls `now()` repeatedly | Returns same value until `.advance(n)` called |
| Test calls `iso()` | Returns ISO of frozen `now()` |
| Test calls `monotonic()` | Returns frozen value; advances with `.advance()` |
| Test calls `since(start)` where `start > monotonic()` | Returns negative number — does NOT clamp to 0 (caller's bug to surface). |
| Multiple consumers share one `FrozenClock` | Mutator `advance` is intentional; tests can step time globally. |

## Out of scope

- Time zones. `iso()` returns UTC. Callers that need local time keep `new Date().toLocaleTimeString()` for now (these are display labels, not data).
- Sub-millisecond precision. `performance.now()` provides it on browser; we round to ms in the surface. Documented.
- Distributed clock skew. Not addressed.
