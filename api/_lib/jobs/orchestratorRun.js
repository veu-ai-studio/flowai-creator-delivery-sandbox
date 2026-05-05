// Inngest job body — invoked by the flowai/orchestrator.run.requested event.
// Reuses the orchestrator agent registry so behaviour matches the inline path.

import { agents } from '../orchestrator.js';

export async function runOrchestratorEvent(eventData = {}) {
  const { agent, payload } = eventData;
  if (!agent) return { ok: false, reason: 'no agent in event data' };
  return agents.run(agent, payload || {});
}
