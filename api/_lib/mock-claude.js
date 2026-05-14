// MockClaude — §9 LD-6 (hybrid LLM).
//
// Deterministic in-process stub returning canned envelopes that match
// the schemas in api/_lib/claude.js. Used for nominal/malformed/edge
// adversarial tests so the suite stays cheap and reproducible. Real
// Claude calls (via the canonical adapter) are reserved for the four
// prompt-injection adversarial cases per LD-6.
//
// Contract:
//   callMockClaude({ prompt, system?, maxTokens?, mode? })
//     → { ok: boolean, text: string, json?: object, usage: {...} }
//
// "mode" lets the caller request a specific canned shape:
//   'plan'        — returns a JSON plan envelope (Agent #2/#3 plan())
//   'code'        — returns a fake App.jsx string (Agent #2 build)
//   'reject'      — returns a low-confidence envelope
//   'echo'        — echoes prompt for assertions
//   default       — bare text 'OK'

const USAGE = Object.freeze({
  input_tokens: 42,
  output_tokens: 17,
  model: 'mock-claude-v1',
});

const CANNED_PLAN = {
  recommendation: 'mock plan recommendation',
  confidence: 0.7,
  patch_targets: ['src/App.jsx'],
  signals: ['mock-signal-1'],
};

const CANNED_REJECT = {
  recommendation: null,
  confidence: 0.2,
  reason: 'mock-claude returned low confidence by request',
};

const CANNED_CODE = `import React from 'react';
export default function App(){return <div data-testid="mock-app">MOCK CLAUDE OUTPUT</div>;}`;

export function callMockClaude({ prompt = '', system, maxTokens = 1024, mode } = {}) {
  if (typeof prompt !== 'string') {
    return Promise.resolve({ ok: false, text: '', error: 'prompt must be a string', usage: USAGE });
  }
  switch (mode) {
    case 'plan':
      return Promise.resolve({ ok: true, text: JSON.stringify(CANNED_PLAN), json: CANNED_PLAN, usage: USAGE });
    case 'reject':
      return Promise.resolve({ ok: true, text: JSON.stringify(CANNED_REJECT), json: CANNED_REJECT, usage: USAGE });
    case 'code':
      return Promise.resolve({ ok: true, text: CANNED_CODE, usage: USAGE });
    case 'echo':
      return Promise.resolve({ ok: true, text: `ECHO: ${prompt.slice(0, 200)}`, usage: USAGE });
    default:
      return Promise.resolve({ ok: true, text: 'OK', usage: USAGE });
  }
}

export const MOCK_CLAUDE_USAGE = USAGE;

// Pluggable selector — tests import this to wire MockClaude through
// the same surface area as the real adapter without monkey-patching.
export function isMockEnabled() {
  return process.env.FLOWAI_USE_MOCK_CLAUDE === '1' ||
         process.env.NODE_ENV === 'test' ||
         process.env.VITEST === 'true';
}
