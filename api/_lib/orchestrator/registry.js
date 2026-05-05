// Agent registry — central plug-in point for every external provider.
//
// Each agent is an object:
//   {
//     name: string,
//     description: string,
//     isEnabled(): boolean,        // checks env vars / feature flags
//     validate(input): null | err, // contract from contracts.js
//     run(input): Promise<envelope>,
//     health(): Promise<{ ok, details? }>,
//     retry: { attempts: number, backoffMs: number },
//   }
//
// Registration:
//   import { agents } from './registry.js';
//   agents.register('claude', claudeAgent);
//
// Invocation (from anywhere):
//   const result = await agents.run('claude', { ctx, prompt: '...' });

import { envelope, successEnvelope, ErrorCodes } from './contracts.js';
import { logger } from '../logger.js';

const _agents = new Map();

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function runWithRetry(agent, input) {
  const { attempts = 1, backoffMs = 0 } = agent.retry || {};
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await agent.run(input);
      if (result?.ok) return result;
      lastError = result;
      if (!result?.retriable) return result;
    } catch (e) {
      lastError = envelope({ agent: agent.name, code: ErrorCodes.UNKNOWN, message: e.message || String(e), retriable: true });
    }
    if (i < attempts - 1 && backoffMs > 0) await delay(backoffMs * Math.pow(2, i));
  }
  return lastError || envelope({ agent: agent.name, code: ErrorCodes.UNKNOWN, message: 'unknown failure' });
}

export const agents = {
  register(name, agent) {
    if (!agent || typeof agent.run !== 'function') {
      throw new Error(`Agent ${name} must define run()`);
    }
    _agents.set(name, { ...agent, name });
  },

  get(name) { return _agents.get(name) || null; },

  list() { return Array.from(_agents.values()); },

  async run(name, input = {}) {
    const agent = _agents.get(name);
    if (!agent) {
      return envelope({ agent: name, code: ErrorCodes.UNKNOWN, message: `Agent "${name}" not registered`, retriable: false });
    }
    if (typeof agent.isEnabled === 'function' && !agent.isEnabled()) {
      return envelope({ agent: name, code: ErrorCodes.AGENT_DISABLED, message: `Agent "${name}" disabled — env vars unset`, retriable: false });
    }
    if (typeof agent.validate === 'function') {
      const v = agent.validate(input);
      if (v && v.ok === false) {
        return envelope({ agent: name, code: ErrorCodes.INVALID_INPUT, message: v.error, retriable: false });
      }
    }
    const t0 = Date.now();
    const result = await runWithRetry(agent, input);
    logger.debug(`agent.${name}.${result.ok ? 'ok' : 'fail'}`, {
      agent: name,
      durationMs: Date.now() - t0,
      orgId: input?.ctx?.orgId,
      runId: input?.ctx?.runId,
      code: result.ok ? null : result.code,
    });
    return result;
  },

  async health() {
    const out = {};
    await Promise.all(_agents.entries().map ? [] : []); // unused, keep map iteration simple below
    for (const [name, agent] of _agents.entries()) {
      const enabled = typeof agent.isEnabled === 'function' ? !!agent.isEnabled() : true;
      let detail = null;
      if (enabled && typeof agent.health === 'function') {
        try { detail = await agent.health(); }
        catch (e) { detail = { ok: false, error: e.message || String(e) }; }
      }
      out[name] = {
        registered: true,
        enabled,
        description: agent.description || '',
        retry: agent.retry || { attempts: 1, backoffMs: 0 },
        health: detail,
      };
    }
    return out;
  },
};

export { envelope, successEnvelope, ErrorCodes };
