# 06 — UUID / ID Generation Audit

**Generated:** 2026-05-07 · **Goal:** Catalog ID-minting patterns across `src/`; recommend a shared utility.

## Inventory

### Pattern A — `Math.random().toString(36).slice(2, N)` + clock prefix
| Site | Format | Suffix len |
| --- | --- | --- |
| `src/lib/agents/BaseAgent.js:217-221` (`_mintRunId`) | `run_${unixMs}_${agentId}_${rand}` | 8 |
| `src/lib/agents/MessageSchema.js:190` (`makeEnvelope`, messageId) | `msg_${unixMs}_${rand}` | 10 |
| `src/lib/agents/MessageSchema.js:195` (`makeEnvelope`, traceId default) | `trace_${unixMs}_${rand}` | 8 |
| `src/lib/JobContext.jsx:40` | `job_${Date.now()}_${rand}` | 5 |
| `src/lib/contentProtection.js:80` | `${rand}${Date.now().toString(36)}` (XOR session key) | full slice (no slice end) |

### Pattern B — `crypto.randomUUID()`
| Site | Format |
| --- | --- |
| `src/components/designer/ScheduledTriggerPanel.jsx:49` | RFC4122 v4 UUID |

### Pattern C — Counter / structural
| Site | Format |
| --- | --- |
| `src/lib/flowStore.jsx:66` | `node_${counter++}` |
| `src/lib/flowStore.jsx:102` | `edge_${fromId}_${toId}` (deterministic) |
| `src/components/upgrade/OriginalProductPanel.jsx:53` | `${layer}-${i}` |
| `src/components/demo/TourStepEditor.jsx:20` | `step-${prev.length + 1}` |
| `src/components/operations/SelfRenewalEngine.jsx:407, 492` | `fix-${i}`, `opt-${i}` |
| `src/components/dashboard/MonitoringAlerts.jsx:34` | `consec-fail-${flowName}` |
| `src/pages/Configuration.jsx:144` | numeric `i + 1` |

### Pattern D — `Date.now()` alone (collision-prone)
| Site | Format |
| --- | --- |
| `src/components/shared/StatusAlertSystem.jsx:33` | `Date.now() + 1` (toast id) |
| `src/components/operations/SessionInputPanel.jsx:79` | `Date.now()` (input id) |

## Findings

1. **Three philosophies coexist:** opaque-prefix-with-random (A), RFC4122 (B), structural/deterministic (C), and unsafe `Date.now()` alone (D).
2. **Pattern A is the dominant agent/run/message convention** (5 call sites in `src/lib/`). It's home-grown — `Math.random()` is not cryptographically strong, but for trace IDs that's acceptable.
3. **Pattern B (crypto.randomUUID) is used in exactly one place.** Not enough to be a convention, but `crypto.randomUUID()` IS the right primitive for cases where a globally-unique opaque ID is desired and clock-collision is unacceptable.
4. **Pattern D is a real bug surface.** Two toasts created in the same millisecond will collide; React's reconciler keys break.
5. **No central minter.** Every call site reimplements the prefix and slice length.

## Recommended shared utility — `src/lib/shared/mintId.js`

```js
// Surface
export function mintId(prefix: string, opts?: MintOpts): string
export function mintRunId(agentId: number, opts?: MintOpts): string   // convenience: prefix='run', includes agentId
export function mintMessageId(opts?: MintOpts): string                // convenience: prefix='msg'
export function mintTraceId(opts?: MintOpts): string                  // convenience: prefix='trace'
export function mintUuid(): string                                    // crypto.randomUUID() with fallback

type MintOpts = {
  clock?:  Clock,           // shared/clock.js Clock
  random?: () => number,    // for deterministic tests; defaults to Math.random
  suffixLen?: number,       // default 10
}
```

### Format

`<prefix>_<unixMs36>_<rand>` where `unixMs36 = clock.now().toString(36)` and `rand = randomBase36(suffixLen)`.

Reasons for this shape:
- **Sortable** — base-36-encoded ms is monotonically increasing per session and keeps logs roughly time-ordered when sorted lex.
- **Inspectable** — `prefix` tells you what class of thing this is at a glance.
- **Test-deterministic** — when `clock` and `random` are injected, the same inputs produce the same IDs.
- **Compact** — typical length is `<6 prefix> + 1 + <8 ms> + 1 + <10 rand>` ≈ 26 chars vs UUID's 36.

### Edge cases

| # | Edge case | Behavior |
| --- | --- | --- |
| 1 | `prefix` empty / non-string | Throw `ValidationError('prefix required')`. |
| 2 | `prefix` contains `_` (would confuse the splitter) | Allow it — splitter is right-biased; prefix may include `_`. Document it. |
| 3 | `suffixLen <= 0` | Throw `ValidationError('suffixLen must be >= 4')`. Lower bound prevents accidental collision. |
| 4 | `Math.random` mocked to constant 0.0 in tests | Returns deterministic `'0'.repeat(suffixLen)` suffix — collision probability across calls is *certain*. Document that tests using a constant random must vary the clock. |
| 5 | Multiple calls within same `clock.now()` ms | Collision probability is `36^-suffixLen`. Default 10 → ~10^-15 per pair. Acceptable for trace IDs; not acceptable for primary keys. Document the tradeoff. |
| 6 | Browser without `crypto.randomUUID` (older Safari) | `mintUuid()` falls back to `mintId('uuid', { suffixLen: 22 })` which gives ~120 bits of randomness. Document divergence from RFC4122. |
| 7 | Node.js environments | `crypto.randomUUID` exists in Node 19+. Fallback path is identical. |

## Migration

| Site | Replacement |
| --- | --- |
| `BaseAgent.js:217-221` | `mintRunId(this.charter.id, { clock: this.deps.clock })` |
| `MessageSchema.js:190, 195` | `mintMessageId({ clock })`, `mintTraceId({ clock })` — but `MessageSchema` is currently clock-less, so this depends on the W2 follow-up to inject a clock. |
| `JobContext.jsx:40` | `mintId('job', { suffixLen: 7 })` |
| `contentProtection.js:80` | Out of scope (XOR key, not an entity ID). |
| Pattern D sites (`StatusAlertSystem.jsx`, `SessionInputPanel.jsx`) | `mintId('toast')` / `mintId('input')`. Eliminates same-ms collision. |
| `ScheduledTriggerPanel.jsx:49` | Keep `crypto.randomUUID()` OR migrate to `mintUuid()` for the fallback. |

## Out of scope

- Cryptographically strong identifiers for security tokens / session keys / nonces. Those should use `crypto.getRandomValues` directly. The helper here is for trace / correlation / display IDs.
- Sortable global IDs (ULID, Snowflake). `mintId` is sortable per-process but not across machines.
