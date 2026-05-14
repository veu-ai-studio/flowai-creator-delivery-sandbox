// src/lib/orchestra/stubs.js
//
// Stub-only Orchestra members.  These satisfy the OrchestraMember
// interface so the dispatcher can list them, but invoke() returns
// `{ ok: false, deferred: true }`.  Callers MUST check `deferred`
// and route around (fall back to claudeCode) rather than treat a
// stub return as fatal.
//
// Wiring any of these in the future is purely additive: replace the
// stub module's `invoke()` with real adapter logic + flip `wired: true`.

import { notYetWired } from './member.js';

function makeStub(stubId, stubName, capList, note) {
  return {
    id: stubId,
    displayName: stubName,
    capabilities: Object.freeze(capList),
    wired: false,
    async invoke(action, _payload) {
      return notYetWired(stubId, action, note);
    },
  };
}

export const base44     = makeStub('base44',     'Base44 (project source export)', ['source-retrieval'], 'Base44 API surface not yet wired');
export const lovable    = makeStub('lovable',    'Lovable',                        ['generate-from-scratch'], 'Lovable adapter not yet wired');
export const v0         = makeStub('v0',         'v0.dev',                         ['generate-from-scratch', 'code-patch'], 'v0 adapter not yet wired');
export const cursor     = makeStub('cursor',     'Cursor (IDE)',                   ['code-patch'], 'Cursor adapter not yet wired');
export const replit     = makeStub('replit',     'Replit',                         ['source-retrieval', 'deploy'], 'Replit adapter not yet wired');
export const openrouter = makeStub('openrouter', 'OpenRouter (model gateway)',     ['code-patch', 'generate-from-scratch'], 'OpenRouter adapter not yet wired');
