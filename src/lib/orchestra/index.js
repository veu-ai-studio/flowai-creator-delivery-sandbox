// src/lib/orchestra/index.js
//
// Orchestra registry + dispatcher.  Each member exposes a uniform
// interface (see ./member.js).  Callers ask the dispatcher to invoke a
// capability — the dispatcher picks the first wired member that
// declares the requested capability, falls back to the canonical
// claudeCode member when the preferred member is a stub.

import * as codex      from './codex.js';
import * as claudeCode from './claudeCode.js';
import * as vercel     from './vercel.js';
import * as browserless from './browserless.js';
import * as playwright from './playwright.js';
import * as perplexity from './perplexity.js';
import * as stubs       from './stubs.js';

const MEMBERS = [
  codex,
  claudeCode,
  vercel,
  browserless,
  playwright,
  perplexity,
  stubs.base44,
  stubs.lovable,
  stubs.v0,
  stubs.cursor,
  stubs.replit,
  stubs.openrouter,
];

export function listMembers() {
  return MEMBERS.map((m) => ({
    id: m.id,
    displayName: m.displayName,
    capabilities: [...m.capabilities],
    wired: !!m.wired,
  }));
}

export function getMember(id) {
  return MEMBERS.find((m) => m.id === id) || null;
}

/**
 * Invoke a capability.  Picks the canonical claude-code adapter for
 * code-patch / generate-from-scratch unless an explicit memberId is
 * supplied.  Returns the member's MemberResult.
 *
 * @param {string} action
 * @param {object} payload
 * @param {{ memberId?: string }} [opts]
 */
export async function dispatch(action, payload, opts = {}) {
  const explicit = opts.memberId ? getMember(opts.memberId) : null;
  if (explicit) return explicit.invoke(action, payload);

  // Canonical routing.  Code generation / patches → claudeCode.
  // Deploys → vercel.  Crawl/screenshot → browserless.  Interact → playwright.
  // Source retrieval — try the URL-specific hints first; fall back to vercel.
  const preferred = {
    'analyze': claudeCode,
    'design': claudeCode,
    'score': claudeCode,
    'code-patch': codex,
    'generate-from-scratch': codex,
    'deploy': vercel,
    'crawl': browserless,
    'screenshot': browserless,
    'interact': playwright,
    'source-retrieval': vercel,
  }[action];
  if (preferred) return preferred.invoke(action, payload);

  // Last resort: scan members for one that declares the capability.
  for (const m of MEMBERS) {
    if (m.wired && m.capabilities.includes(action)) {
      return m.invoke(action, payload);
    }
  }
  return { ok: false, action, member: 'orchestra', error: `no member supports action "${action}"` };
}
