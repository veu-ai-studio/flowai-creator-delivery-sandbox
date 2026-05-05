// Central orchestrator — registers every agent and exposes a single
// invocation surface for the rest of the API.
//
// Adding a new provider:
//   1. Create /api/_lib/orchestrator/agents/<name>.js implementing the
//      { isEnabled, validate, run, retry, health, description } contract.
//      Use `successEnvelope` / `envelope` / `ErrorCodes` from contracts.js.
//   2. Import it in /api/_lib/orchestrator/agents/index.js and add one entry
//      to the AGENTS array.
//   3. Done. /api/orchestrator/health and /api/orchestrator/run automatically
//      pick it up. No edits required to this file, run.js, or health.js.
//
// Why centralised:
//   * Cost tracking, retry policy, error envelope, and per-agent health all
//     live in one place — no duplicate boilerplate per endpoint.
//   * Tomorrow we can swap providers (Claude → Gemini, Browserless → Apify)
//     by replacing the agent module without touching any endpoint.
//   * Inngest functions can route their work through the same registry, so
//     inline and async paths share identical contracts.

import { agents } from './orchestrator/registry.js';
import { AGENTS, isConfigurationMode } from './orchestrator/agents/index.js';

let _registered = false;

export function ensureAgentsRegistered() {
  if (_registered) return;
  for (const [name, agent] of AGENTS) {
    agents.register(name, agent);
  }
  _registered = true;
}

ensureAgentsRegistered();

export { agents, isConfigurationMode };
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
