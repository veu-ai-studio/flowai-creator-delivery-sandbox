// src/lib/orchestra/member.js
//
// Shared OrchestraMember interface contract used by every adapter in
// src/lib/orchestra/.
//
// ─── INTERFACE ──────────────────────────────────────────────────────
// Each member module exports:
//   - id:           string  (kebab-case, unique)
//   - displayName:  string
//   - capabilities: string[]
//   - wired:        boolean  (true iff invoke() actually does work)
//   - invoke(action: string, payload: object): Promise<MemberResult>
//
// MemberResult shape:
//   { ok: boolean, action: string, member: string,
//     data?: any,             // present on ok:true
//     error?: string,         // present on ok:false
//     deferred?: boolean }    // true for stub-only members so callers
//                              // can route around them without failing.
//
// Members that are not yet wired return MemberResult with
// `ok: false, deferred: true, error: "not yet wired"`.  Callers MUST
// check `deferred` and fall back to the canonical claudeCode adapter
// rather than treating the deferral as a fatal failure.
//
// Known capability strings (extend as adapters land):
//   - "code-patch"           — apply a textual patch to a source file
//   - "generate-from-scratch"— produce a full Vite-React project tree
//   - "source-retrieval"     — fetch source from a remote
//   - "deploy"               — deploy a file tree to a hosting target
//   - "crawl"                — extract content from a URL
//   - "interact"             — drive a browser through actions on a URL

/**
 * @typedef {Object} MemberResult
 * @property {boolean} ok
 * @property {string}  action
 * @property {string}  member
 * @property {any}     [data]
 * @property {string}  [error]
 * @property {boolean} [deferred]
 */

/**
 * Build a "not yet wired" MemberResult.  Used by stub adapters so the
 * dispatcher can list them but invocations don't throw.
 *
 * @param {string} member
 * @param {string} action
 * @param {string} [note]
 * @returns {MemberResult}
 */
export function notYetWired(member, action, note) {
  return {
    ok: false,
    action,
    member,
    deferred: true,
    error: note ? `not yet wired: ${note}` : 'not yet wired',
  };
}

/**
 * Helpers for member modules that need to compose result objects.
 */
export function memberOk(member, action, data) {
  return { ok: true, action, member, data };
}

export function memberError(member, action, error, extras = {}) {
  return { ok: false, action, member, error, ...extras };
}

/**
 * Returns true iff the result indicates the member is wired and
 * succeeded.  Convenience for callers.
 */
export function isWiredOk(result) {
  return !!(result && result.ok === true && !result.deferred);
}
