// Configuration mode agents (clone, synthesize, describe).
//
// Each mode is exposed as an orchestrator agent so it's invokable from
// /api/orchestrator/run with a uniform { mode, payload } shape, regardless
// of whether the call originates from FlowAI itself, SAIGE, PressAI, etc.

import { successEnvelope, envelope, ErrorCodes } from '../contracts.js';

// Lazy import the mode handlers so the orchestrator/health endpoint doesn't
// pay for them at module load (each handler imports the crawler + Claude
// chains transitively).

async function invokeHandler(modulePath, body, req, res) {
  // Synthesize a minimal req/res so the handler can reuse its existing
  // logic. The handler writes JSON to res; we capture it.
  return new Promise(async (resolve, reject) => {
    let captured = null;
    let statusCode = 200;
    const fauxRes = {
      setHeader() {},
      status(code) { statusCode = code; return this; },
      end() { resolve({ statusCode, body: null }); },
      json(obj) { captured = obj; resolve({ statusCode, body: obj }); },
    };
    const fauxReq = {
      method: 'POST',
      headers: req?.headers || {},
      query: {},
      body,
    };
    try {
      const mod = await import(modulePath);
      const handler = mod.default || mod;
      await handler(fauxReq, fauxRes);
      if (captured == null) resolve({ statusCode, body: null });
    } catch (e) {
      reject(e);
    }
  });
}

function makeAgent({ name, description, modulePath, validate }) {
  return {
    description,
    isEnabled() { return Boolean(process.env.ANTHROPIC_API_KEY); },
    validate,
    retry: { attempts: 1, backoffMs: 0 },
    async run(input) {
      try {
        const { statusCode, body } = await invokeHandler(modulePath, input, input?._req, input?._res);
        if (statusCode >= 400) {
          return envelope({
            agent: name,
            code: statusCode === 400 ? ErrorCodes.INVALID_INPUT : ErrorCodes.UPSTREAM_ERROR,
            message: body?.error || body?.details || `${name} returned ${statusCode}`,
            retriable: statusCode >= 500,
            details: body,
          });
        }
        return successEnvelope({ agent: name, output: body, meta: { statusCode } });
      } catch (e) {
        return envelope({ agent: name, code: ErrorCodes.UNKNOWN, message: e.message, retriable: false });
      }
    },
    async health() {
      return { ok: true, configured: Boolean(process.env.ANTHROPIC_API_KEY) };
    },
  };
}

export const cloneAgent = makeAgent({
  name: 'clone',
  description: 'Configuration mode: capture URL → architecture analysis + improvement plan',
  modulePath: '../../../configuration/clone.js',
  validate(input) {
    if (typeof input?.url !== 'string' || !input.url.trim()) {
      return { ok: false, error: 'url is required (string)' };
    }
    return null;
  },
});

export const synthesizeAgent = makeAgent({
  name: 'synthesize',
  description: 'Configuration mode: combine 2+ inputs (URL/text/file) → unified spec + improvement plan',
  modulePath: '../../../configuration/synthesize.js',
  validate(input) {
    if (!Array.isArray(input?.inputs) || input.inputs.length < 2) {
      return { ok: false, error: 'inputs[] required (>=2 items)' };
    }
    return null;
  },
});

export const describeAgent = makeAgent({
  name: 'describe',
  description: 'Configuration mode: free-form description → structured product spec',
  modulePath: '../../../configuration/describe.js',
  validate(input) {
    if (typeof input?.description !== 'string' || !input.description.trim()) {
      return { ok: false, error: 'description is required (string)' };
    }
    return null;
  },
});
