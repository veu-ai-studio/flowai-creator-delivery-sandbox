// Central orchestrator — registers every agent and exposes a single
// invocation surface for the rest of the API.
//
// Adding a new provider:
//   1. Create /api/_lib/orchestrator/agents/<name>.js implementing the
//      { isEnabled, validate, run, health, retry } contract.
//   2. Import + register it below.
//   3. /api/orchestrator/health automatically picks it up.
//
// Why not just import each provider directly? Because:
//   * Cost tracking, retry policy, error envelope, and per-agent health all
//     live in one place — no duplicate boilerplate per endpoint.
//   * Tomorrow we can swap providers (Claude → Gemini, Browserless → Apify)
//     by replacing the agent module without touching any endpoint.
//   * Inngest functions can route their work through the same registry, so
//     inline and async paths share identical contracts.

import { agents } from './orchestrator/registry.js';
import { claudeAgent } from './orchestrator/agents/claude.js';
import { browserlessAgent } from './orchestrator/agents/crawler.js';
import { supabaseAgent } from './orchestrator/agents/supabase.js';
import { inngestAgent } from './orchestrator/agents/inngest.js';
import { clerkAgent } from './orchestrator/agents/clerk.js';
import { resendAgent } from './orchestrator/agents/resend.js';
import { voyageAgent } from './orchestrator/agents/voyage.js';
import { axiomAgent } from './orchestrator/agents/axiom.js';
import { base44Agent } from './orchestrator/agents/base44.js';
import { replitAgent } from './orchestrator/agents/replit.js';
import { vercelAgent } from './orchestrator/agents/vercel.js';
import { playwrightAgent } from './orchestrator/agents/playwright.js';
import { cloneAgent, synthesizeAgent, describeAgent } from './orchestrator/agents/configuration.js';

let _registered = false;

export function ensureAgentsRegistered() {
  if (_registered) return;
  agents.register('claude', claudeAgent);
  agents.register('browserless', browserlessAgent);
  agents.register('supabase', supabaseAgent);
  agents.register('inngest', inngestAgent);
  agents.register('clerk', clerkAgent);
  agents.register('resend', resendAgent);
  agents.register('voyage', voyageAgent);
  agents.register('axiom', axiomAgent);
  agents.register('base44', base44Agent);
  agents.register('replit', replitAgent);
  agents.register('vercel', vercelAgent);
  agents.register('playwright', playwrightAgent);
  // Configuration mode agents — invokable via /api/orchestrator/run
  // { mode: 'clone'|'synthesize'|'describe', payload }
  agents.register('clone', cloneAgent);
  agents.register('synthesize', synthesizeAgent);
  agents.register('describe', describeAgent);
  _registered = true;
}

ensureAgentsRegistered();

export { agents };
export { ErrorCodes, envelope, successEnvelope } from './orchestrator/contracts.js';

// ─── Step orchestration ──────────────────────────────────────────────────
// Convenience: run an Auto Runner / Guided / Manual step through the
// orchestrator instead of calling /api/_lib/jobs/runStep.js directly. Same
// inputs, same outputs, but every Claude call goes via the claude agent so
// retries / cost tracking are uniform.
//
// Today: passes through to the inline implementation. Tomorrow: when
// INNGEST_BACKEND=inngest, the dispatcher version (api/run-step.js) sends
// an `flowai/run-step.requested` event via the inngest agent.

export async function orchestrateStep(input) {
  const { runStepInline } = await import('./jobs/runStep.js');
  return runStepInline(input);
}
