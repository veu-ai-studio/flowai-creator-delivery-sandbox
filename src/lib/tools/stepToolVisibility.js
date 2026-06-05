const STEP_TOOLS = Object.freeze({
  research: [
    { platform_name: 'Browserless', platform_type: 'crawl', dispatchState: 'callable', note: 'server-side credential checked at dispatch' },
    { platform_name: 'Anthropic Claude', platform_type: 'analysis', dispatchState: 'callable', note: 'server-side credential checked at dispatch' },
    { platform_name: 'Perplexity AI', platform_type: 'research', dispatchState: 'unavailable', note: 'ranked marketplace tool, not executable until admitted and credentialed' },
  ],
  design: [
    { platform_name: 'Anthropic Claude', platform_type: 'design', dispatchState: 'callable', note: 'server-side credential checked at dispatch' },
    { platform_name: 'v0 by Vercel', platform_type: 'design', dispatchState: 'stub_unavailable', note: 'requires real callable API before execution' },
    { platform_name: 'Lovable', platform_type: 'design', dispatchState: 'stub_unavailable', note: 'requires real callable API before execution' },
  ],
  build: [
    { platform_name: 'Claude Code', platform_type: 'code', dispatchState: 'pending_operator_gate', note: 'mutations deferred in P13-A' },
    { platform_name: 'Cursor', platform_type: 'code', dispatchState: 'stub_unavailable', note: 'requires real callable API before execution' },
    { platform_name: 'Base44', platform_type: 'source', dispatchState: 'stub_unavailable', note: 'ranked but non-executable today' },
  ],
  qa_audit: [
    { platform_name: 'Playwright', platform_type: 'browser', dispatchState: 'callable', note: 'read-only browser interaction path' },
    { platform_name: 'Browserless', platform_type: 'capture', dispatchState: 'callable', note: 'server-side credential checked at dispatch' },
    { platform_name: 'Anthropic Claude', platform_type: 'score', dispatchState: 'callable', note: 'server-side credential checked at dispatch' },
  ],
  deploy: [
    { platform_name: 'Vercel', platform_type: 'deployment', dispatchState: 'mutation_deferred_until_P13C', note: 'target deploy is deferred in P13-A' },
    { platform_name: 'Replit', platform_type: 'deployment', dispatchState: 'stub_unavailable', note: 'ranked but non-executable today' },
  ],
  govern: [
    { platform_name: 'Claude Code', platform_type: 'renewal', dispatchState: 'pending_operator_gate', note: 'fix application deferred in P13-A' },
    { platform_name: 'Playwright', platform_type: 'verification', dispatchState: 'callable', note: 'read-only verification only' },
  ],
  gtm: [
    { platform_name: 'Anthropic Claude', platform_type: 'analysis', dispatchState: 'callable', note: 'server-side credential checked at dispatch' },
    { platform_name: 'Perplexity AI', platform_type: 'research', dispatchState: 'unavailable', note: 'ranked marketplace tool, not executable until admitted and credentialed' },
  ],
  monitor: [
    { platform_name: 'Browserless', platform_type: 'monitoring capture', dispatchState: 'callable', note: 'server-side credential checked at dispatch' },
    { platform_name: 'Playwright', platform_type: 'runtime check', dispatchState: 'callable', note: 'read-only browser interaction path' },
    { platform_name: 'Anthropic Claude', platform_type: 'summary', dispatchState: 'callable', note: 'server-side credential checked at dispatch' },
  ],
});

export function rankedToolsForStepCard(stepKey, override = null) {
  const candidates = Array.isArray(override?.candidates) && override.candidates.length > 0
    ? override.candidates
    : STEP_TOOLS[stepKey] ?? [];
  return candidates.map((tool, index) => Object.freeze({
    rank: tool.rank ?? index + 1,
    platform_name: tool.platform_name ?? tool.name ?? 'Unknown tool',
    platform_type: tool.platform_type ?? tool.type ?? 'tool',
    dispatchState: tool.dispatchState ?? tool.eligibilityState ?? 'unavailable',
    note: tool.note ?? tool.dispatchReason ?? '',
    compositeScore: tool.compositeScore,
  }));
}

export const __test = Object.freeze({ STEP_TOOLS });
