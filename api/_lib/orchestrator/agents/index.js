// Agent manifest — single source of truth for which agents exist.
//
// Adding a new provider:
//   1. Create /api/_lib/orchestrator/agents/<name>.js implementing the
//      { isEnabled, validate, run, retry, health, description } contract
//      (use `successEnvelope` / `envelope` from contracts.js).
//   2. Import it below and add a single entry to the AGENTS array.
//   3. /api/orchestrator/health and /api/orchestrator/run pick it up
//      automatically. No edits to orchestrator.js, run.js, health.js.
//
// Order in the array determines health-page order; otherwise irrelevant.

import { claudeAgent } from './claude.js';
import { browserlessAgent } from './crawler.js';
import { supabaseAgent } from './supabase.js';
import { inngestAgent } from './inngest.js';
import { clerkAgent } from './clerk.js';
import { resendAgent } from './resend.js';
import { voyageAgent } from './voyage.js';
import { axiomAgent } from './axiom.js';
import { base44Agent } from './base44.js';
import { replitAgent } from './replit.js';
import { vercelAgent } from './vercel.js';
import { playwrightAgent } from './playwright.js';
import { cloneAgent, synthesizeAgent, describeAgent } from './configuration.js';
import { superCustomerAgent } from '../../superCustomerAgent.js';

// Each entry: [registry-name, agent module export].
// The configuration agents are tagged with `category: 'mode'` for UI grouping.
export const AGENTS = [
  // Platform agents
  ['claude',       claudeAgent],
  ['browserless',  browserlessAgent],
  ['supabase',     supabaseAgent],
  ['inngest',      inngestAgent],
  ['clerk',        clerkAgent],
  ['resend',       resendAgent],
  ['voyage',       voyageAgent],
  ['axiom',        axiomAgent],
  ['base44',       base44Agent],
  ['replit',       replitAgent],
  ['vercel',       vercelAgent],
  ['playwright',   playwrightAgent],
  // Configuration mode agents — invokable via /api/orchestrator/run
  ['clone',        cloneAgent],
  ['synthesize',   synthesizeAgent],
  ['describe',     describeAgent],
  // Audit mode agents — long-running product audits
  ['super-customer', superCustomerAgent],
];

// Convenience set for callers that need to differentiate long-running modes
// (need async + poll + progress) from short-call platform agents.
export const CONFIGURATION_MODE_NAMES = new Set(['clone', 'synthesize', 'describe', 'super-customer']);

export function isConfigurationMode(name) {
  return CONFIGURATION_MODE_NAMES.has(name);
}
