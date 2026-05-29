/**
 * Integration Contracts — shared agent type vocabulary
 * ---------------------------------------------------------------------------
 * Owner:    /src/lib/agents/types/integration-contracts.js  (W5 territory)
 *
 * This file is extended by each embedded agent build. Do not duplicate types
 * across agents — when a new agent surfaces a config or contract type, add it
 * HERE so future agents can reuse it without divergence.
 *
 * All declarations are JSDoc @typedef — this is a `.js` ESM module by design.
 * Consumers reference these via `@type {import(...).TypeName}` in their own
 * JSDoc annotations.
 *
 * Naming convention:
 *   - Public types: PascalCase
 *   - Object-shape "spec" types end in `Spec`
 *   - Result types end in `Result`
 *   - Hook signatures end in `Hook`
 *
 * Sections (add ↓ as more agents land — keep alphabetical inside each):
 *   1. Build (Agent #2)
 *   2. (reserved for #3 onward — add when each lands)
 * ---------------------------------------------------------------------------
 */

// ─── 1. Build (Agent #2 — Code Builder) ──────────────────────────────────────

/**
 * BuildTargetSpec
 *
 * Declares one kind of artifact the consumer wants Agent #2 to produce. A
 * single build invocation can declare multiple targets; the agent walks them
 * sequentially and emits one `2.build.completed.v1` envelope per success.
 *
 * @typedef {Object} BuildTargetSpec
 * @property {string} name        — slug-safe identifier (^[a-zA-Z0-9_-]+$)
 * @property {string} kind        — short label, e.g. "bundle", "lambda", "asset"
 * @property {string} [version]   — optional semver-ish string
 * @property {Record<string, unknown>} [params] — opaque per-target parameters
 *                                  passed through to the build callback
 */

/**
 * SpecValidationResult
 *
 * Returned by the `beforeBuild` plugin hook (and by the agent's internal
 * precheck). When `ok: false`, the agent halts and emits a
 * `2.build.failed.v1` envelope with `phase = 'precheck'`.
 *
 * @typedef {Object} SpecValidationResult
 * @property {boolean} ok
 * @property {string}  [reason]   — human-readable diagnostic when !ok
 * @property {string}  [field]    — dotted path to the offending field
 * @property {('precheck'|'integrity'|'execute')} [phase]
 *                                — which phase the failure belongs to
 *                                  (defaults to 'precheck' when omitted)
 */

/**
 * BuildExecutionResult
 *
 * The shape Agent #2 expects from the consumer-injected `executeBuild`
 * callback. The agent NEVER shells out itself — recommend_only forbids it.
 * The consumer's callback runs the build (in a sandbox of its choosing) and
 * returns this descriptor.
 *
 * On success: `{ ok: true, artifact, ... }` — `artifact` may be a string,
 * Uint8Array, Buffer, or plain JSON-canonicalizable object. The agent hashes
 * it into a SHA-256 hex digest for `2.build.completed.v1`.
 *
 * On failure: `{ ok: false, exitCode, stderr, retryable }` — the agent
 * forwards these into the `2.build.failed.v1` envelope.
 *
 * @typedef {Object} BuildExecutionResult
 * @property {boolean} ok
 * @property {(string|Uint8Array|Record<string, unknown>)} [artifact]
 *                                — present iff ok === true
 * @property {string}  [artifactRef]
 *                                — opaque locator (e.g. content-addressed
 *                                  path) the consumer can later resolve
 * @property {number}  [exitCode] — present iff ok === false
 * @property {string}  [stderr]   — present iff ok === false
 * @property {boolean} [retryable]— present iff ok === false; default true
 */

/**
 * BuildPluginHooks
 *
 * Optional consumer-supplied plugin hooks. All are async-safe (sync OK too).
 *
 * @typedef {Object} BuildPluginHooks
 * @property {(spec: object) => (SpecValidationResult|Promise<SpecValidationResult>)} [beforeBuild]
 * @property {(artifact: unknown, hash: string) => (void|Promise<void>)} [afterBuild]
 */

// ─── 2. (reserved — append next agent's IC types here) ───────────────────────

export {}; // marker — file is intentionally side-effect-free
