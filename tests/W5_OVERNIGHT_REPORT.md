# W5 Overnight Report — Consolidated

**Generated:** 2026-05-07
**Repo HEAD at run:** `main` @ `3b6a0f5`
**Scope:** W5 territory (`src/lib/shared/`) + cross-workstream (W1/W2/W3/W4) audit and design.
**Constraints honored:** no `src/` modifications; new files only in `tests/` and `specs/w5-design/`; no commits; no pushes.

This report consolidates 13 jobs. Each job's full detail lives in its own file under `specs/w5-design/`. Below is the index, the headline finding for each, and a final readiness summary.

---

## Index

| Job | Output file | Status |
| --- | --- | --- |
| 1 | `specs/w5-design/01-shared-inventory.md` | ✅ |
| 2 | `specs/w5-design/02-duplication-scan.md` | ✅ |
| 3 | `specs/w5-design/03-prevhash-helper-spec.md` | ✅ |
| 4 | `specs/w5-design/04-logging-convention.md` | ✅ |
| 5 | `specs/w5-design/05-clock-interface.md` | ✅ |
| 6 | `specs/w5-design/06-id-generation.md` | ✅ |
| 7 | `specs/w5-design/07-hashing-spec.md` | ✅ |
| 8 | `specs/w5-design/08-error-hierarchy.md` | ✅ |
| 9 | `specs/w5-design/09-validation-utilities.md` | ✅ |
| 10 | `tests/credentialadapter-edge.test.js` (31 passing) | ✅ |
| 11 | 7 × `tests/shared-*.test.js` (127 failing-by-design) | ✅ |
| 12 | `specs/w5-design/12-boundary-check.md` | ✅ |
| 13 | this file | ✅ |

---

## Job 1 — Shared inventory

`src/lib/shared/` contains exactly **one** file: `CredentialAdapter.js` (7,302 bytes; zero imports; four named exports — `CredentialAdapter`, `getDefaultCredentialAdapter`, `setDefaultCredentialAdapter`, `_resetDefaultCredentialAdapter`). Already covered by 5 cases in `tests/baseagent.test.js`.

Full detail: `specs/w5-design/01-shared-inventory.md`.

## Job 2 — Cross-workstream duplication scan

W3 has zero source files (`src/lib/audits/` and `src/lib/marketplace/` do not exist), so any pair involving W3 is empty by construction. The interesting pairs are **W1+W2** (strong duplication of env/scope sets and clock-injection contract) and **W2+W4** (two parallel audit-log dialects, plus the random-suffix ID minting pattern reimplemented five times).

**Promotion shortlist for `src/lib/shared/`:**
1. `scopes.js` — env/scope validators (replaces 3 redundant declarations across BaseAgent, MessageSchema, CredentialAdapter)
2. `auditChain.js` — X-005 (NEW; nothing exists)
3. `mintId.js` — replaces 5 hand-rolled `Math.random().toString(36).slice(...)` sites
4. `validators.js` — replaces ~15 hand-rolled `typeof x !== 'string' || x.length === 0` sites
5. `defaultClock.js` / `clock.js` — unifies the three different clock-injection contracts
6. `errors.js` — replace plain `Error` with typed subclasses
7. `hashing.js` — required by `auditChain.js` and by D-003 build-artifact pinning

Full detail: `specs/w5-design/02-duplication-scan.md`.

## Job 3 — `prevHash` audit-chain helper (X-005)

Designed only — interface, edge cases, integration sketch with `BaseAgent.run()`'s 7 audit-write call sites. Module surface: `appendChained`, `verifyChain`, `newChain`, `GENESIS_PREV_HASH`. 16 enumerated edge cases. **Nothing exists toward implementation today.** Critical defect (D-014, weight 15 in `gov.audit_completeness` rubric).

Full detail: `specs/w5-design/03-prevhash-helper-spec.md`.

## Job 4 — Logging convention

Catalog: BaseAgent and ScoreEvaluator *require* `deps.logger` but never invoke it (latent dependency); CredentialAdapter is the only file in W2/W5 that actually emits a log call (single `warn` site, optional-chained); W4 uses `console.error` directly or silently swallows. **No level discipline, no correlation IDs woven in, no PII redaction anywhere.** Recommended single shared `src/lib/shared/logger.js` with `makeLogger`, `NOOP_LOGGER`, `bindLogger`, default redaction list, and child-logger field merging.

Full detail: `specs/w5-design/04-logging-convention.md`.

## Job 5 — Clock interface

Three coexisting clock contracts: CredentialAdapter (DI with default), BaseAgent / ScoreEvaluator (DI required, no default), W4 (no DI — direct `Date.now()` × 25+ call sites). W4's flow timers (`flowExecutor`, `flowSimulator`) measure durations with wall clock — vulnerable to NTP step. Recommended `src/lib/shared/clock.js` with `SystemClock`, `FrozenClock(ms)` (with `.advance()`), and `assertClock`. Surface: `now()`, `iso()`, `monotonic()`, `since(start)`.

Full detail: `specs/w5-design/05-clock-interface.md`.

## Job 6 — ID generation

Five distinct patterns observed: `Math.random().toString(36).slice(2, N)` + clock prefix (5 sites, the dominant convention), `crypto.randomUUID()` (1 site), counter-based (~5 sites in W4), `Date.now()`-only (2 sites — bug surface; same-ms collisions break React keys), and structural (`edge_${a}_${b}`, deterministic). Recommended `src/lib/shared/mintId.js` with `mintId(prefix, opts)`, `mintRunId`, `mintMessageId`, `mintTraceId`, `mintUuid` (RFC4122 with fallback). Suffix length and clock both injectable for tests.

Full detail: `specs/w5-design/06-id-generation.md`.

## Job 7 — Hashing utility

Browser-safe SHA-256 module needed for X-005 (audit chain) and D-003 (build-artifact pinning). Recommended `src/lib/shared/hashing.js` exposing `sha256Hex(string|Uint8Array)`, `sha256OfJson(value)` with deterministic key-sorted canonicalization, `canonicalJson(value)`, plus constants/regex. Async surface (because `crypto.subtle` is async). 15 enumerated edge cases including cyclic objects, BigInt/Date rejection, surrogate pair handling, lowercase-hex requirement.

Full detail: `specs/w5-design/07-hashing-spec.md`.

## Job 8 — Error hierarchy

Catalog of 56+ `throw new Error(...)` sites across BaseAgent (17), MessageSchema (13), ScoreEvaluator (13), CredentialAdapter (13). **Zero subclasses anywhere in `src/`.** Catchers can only string-match messages — brittle. Recommended hierarchy under `src/lib/shared/errors.js`:

```
Error
└── FlowAiError                # carries { code, details, cause }
    ├── ConfigError
    ├── ValidationError
    │   ├── PayloadError
    │   └── CharterError
    ├── AuthorityError
    ├── DependencyError
    ├── NotImplementedError
    ├── ChainError
    └── EvaluatorError
```

Each carries a stable `code` (`CFG_*`, `VAL_*`, `MSG_*`, `AUTH_*`, etc.) for machine-checkable branching. Migration is mechanical.

Full detail: `specs/w5-design/08-error-hierarchy.md`.

## Job 9 — Validation utilities

Same idiom (`typeof x !== 'string' || x.length === 0`) recurs ~15+ times. Score-range `[0,100]` check is duplicated. Slug-safe regex exists only in CredentialAdapter, but BaseAgent's charter validator should use the same regex for `provider_id`/`customer_id`. Recommended `src/lib/shared/validators.js` exporting `assertNonEmptyString`, `assertNonEmptyArray`, `assertObject`, `requireFields`, `assertSlugSafe`, `assertSubkeySafe`, `assertFiniteNumber`, `assertNumberInRange`, `assertIntegerInRange`, `assertEnumMember`, plus `SLUG_RE` and `SUBKEY_RE` constants. Each `assert*` returns the value on success and throws a typed `ValidationError` (job 08) on failure. No coercion.

Full detail: `specs/w5-design/09-validation-utilities.md`.

## Job 10 — CredentialAdapter edge tests

`tests/credentialadapter-edge.test.js` authored. 31 cases across six describe blocks: empty subkey, very long IDs (2048-char providerId, 3000-char subkey, 1000-key expectedKeys), Unicode (latin extended, emoji, CJK, combining diacritic, zero-width space), multi-project switching via `setDefaultCredentialAdapter` (50-iteration loop + reset), `getAll` empty/invalid input, `declareExpected` empty/duplicates, `envFallback` source/precedence.

```
Test Files  1 passed (1)
     Tests  31 passed (31)
  Duration  505 ms
```

**No iterations needed — all 31 passed on first run.**

## Job 11 — TDD scaffolds for jobs 3, 4, 5, 6, 7, 8, 9

7 new test files authored, one per recommended W5 utility. Each uses dynamic `import()` so each missing symbol fails per-test rather than crashing the whole file.

| Scaffold file | Targets module | Cases |
| --- | --- | ---: |
| `tests/shared-auditChain.test.js` | `src/lib/shared/auditChain.js` | 18 |
| `tests/shared-clock.test.js` | `src/lib/shared/clock.js` | 17 |
| `tests/shared-errors.test.js` | `src/lib/shared/errors.js` | 16 |
| `tests/shared-hashing.test.js` | `src/lib/shared/hashing.js` | 21 |
| `tests/shared-logger.test.js` | `src/lib/shared/logger.js` | 11 |
| `tests/shared-mintId.test.js` | `src/lib/shared/mintId.js` | 13 |
| `tests/shared-validators.test.js` | `src/lib/shared/validators.js` | 31 |

Run result:

```
Test Files  7 failed (7)
     Tests  127 failed (127)
  Duration  1.94 s
```

Every failure is `Error: Cannot find module '/src/lib/shared/<X>.js'` — i.e., the failure is structural and confirms each utility is unimplemented. When implemented, these tests should pass without modification.

**Unimplemented W5 utilities (7):** `auditChain`, `clock`, `errors`, `hashing`, `logger`, `mintId`, `validators`.

## Job 12 — Cross-territory boundary check

`CredentialAdapter.js` is the only file in `src/lib/shared/`. Production import count today is **one** (`src/pages/BaseAgentTest.jsx`, W4). Two W2 test files also consume it. The file is architected as the W1↔W2 contract per Packet 1.5; W2 production consumers (the embedded agents) don't yet exist as code but are expected. **Verdict: KEEP in `shared/`.** Re-check after Wave 2 lands; if W2 embedded agents bypass `getDefaultCredentialAdapter()`, reopen the question.

Full detail: `specs/w5-design/12-boundary-check.md`.

---

## W5 readiness summary

| Surface | State | Blocking? |
| --- | --- | --- |
| `src/lib/shared/CredentialAdapter.js` | Placed, ratified (Packet 1.5), tested (5 + 31 cases) | No |
| `src/lib/shared/auditChain.js` (X-005, D-014) | **Not started.** Spec + 18 failing tests in place. | **Yes — Critical.** Blocks `gov.audit_completeness` (15% rubric weight) for every agent. |
| `src/lib/shared/hashing.js` | **Not started.** Spec + 21 failing tests in place. | Yes — required by `auditChain.js`, also unblocks D-003 build pinning. |
| `src/lib/shared/scopes.js` | **Not started.** Same Set declared 3× across BaseAgent / MessageSchema / CredentialAdapter. | No — duplication, not bug. |
| `src/lib/shared/mintId.js` | **Not started.** 5 call sites. | No — code smell, correctness OK. |
| `src/lib/shared/validators.js` | **Not started.** 31 failing tests. | No — refactor, not feature. |
| `src/lib/shared/errors.js` | **Not started.** Catchers must string-match today. | No — refactor. |
| `src/lib/shared/clock.js` | **Not started.** | No — but blocks deterministic tests for W4 flow execution. |
| `src/lib/shared/logger.js` | **Not started.** Phantom dependency on BaseAgent / ScoreEvaluator. | No. |

### Recommended build order

1. **`hashing.js`** (no dependencies) → unblocks (2) and (D-003).
2. **`auditChain.js`** (depends on hashing) → unblocks D-014 / X-005.
3. **`scopes.js`** (no deps) → highest-blast-radius cleanup; touches all 3 files already in W2/W5.
4. **`errors.js`** (no deps) → enables typed catches; precondition for nicer test assertions.
5. **`validators.js`** (depends on `errors.js`) → reduces ~15 hand-rolled checks.
6. **`clock.js`** (no deps) → unifies DI contract; precondition for `mintId.js` testing.
7. **`mintId.js`** (depends on `clock.js`) → final dedup.
8. **`logger.js`** (no deps; can interleave) → resolves phantom dependencies in BaseAgent / ScoreEvaluator.

### Test posture

```
tests/baseagent.test.js              — 11 passing  (W2/W5 — preexisting)
tests/credentialadapter-edge.test.js — 31 passing  (W5 — Job 10)
tests/shared-auditChain.test.js      — 18 failing  (TDD scaffold)
tests/shared-clock.test.js           — 17 failing  (TDD scaffold)
tests/shared-errors.test.js          — 16 failing  (TDD scaffold)
tests/shared-hashing.test.js         — 21 failing  (TDD scaffold)
tests/shared-logger.test.js          — 11 failing  (TDD scaffold)
tests/shared-mintId.test.js          — 13 failing  (TDD scaffold)
tests/shared-validators.test.js      — 31 failing  (TDD scaffold)
                                     ----
                                     42 passing W5-relevant + 127 failing-by-design
```

Other test files in `tests/` (W1/W2/W3/W4 territories — `auth.test.js`, `authority-guard.test.js`, `messageschema.test.js`, `scoreevaluator.test.js`, `audit-*.test.js`, `marketplace_inventory.test.js`, `leads.test.js`, `credentialadapter-integration.test.js`) were **not run** in this session and are unaffected by this work. No `src/` file was modified.

### Process hygiene

- Files modified: 0 in `src/`; 9 created in `specs/w5-design/`; 8 created in `tests/` (1 actual edge-case suite + 7 TDD scaffolds); 1 rewritten in `tests/` (this report).
- Not committed. Not pushed.
- All `src/lib/shared/` recommendations are **interface-only**. No production code written for any of the 7 unimplemented utilities.

Stopping here.
