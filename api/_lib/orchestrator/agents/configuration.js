// Configuration mode agents (clone, synthesize, describe).
//
// Each mode is exposed as an orchestrator agent so it's invokable from
// /api/orchestrator/run with a uniform { agent, payload } shape, regardless
// of whether the call originates from FlowAI itself, SAIGE, PressAI, etc.
//
// Implementation detail: the agents call the configuration handlers' pure
// `execute()` exports directly. No HTTP-shim faux req/res, no dynamic import
// path resolution at runtime — both of those caused silent failures inside
// Vercel's bundle. Direct imports are bundled by Vercel as part of the
// orchestrator function's dependency tree, so they always resolve.

import { successEnvelope, envelope, ErrorCodes } from '../contracts.js';
import { execute as executeClone } from '../../../configuration/clone.js';
import { execute as executeSynthesize } from '../../../configuration/synthesize.js';
import { execute as executeDescribe } from '../../../configuration/describe.js';

function makeAgent({ name, description, executeFn, validate }) {
  return {
    description,
    isEnabled() { return Boolean(process.env.ANTHROPIC_API_KEY); },
    validate,
    retry: { attempts: 1, backoffMs: 0 },
    async run(input) {
      try {
        const result = await executeFn(input || {});
        if (!result || result.ok === false) {
          return envelope({
            agent: name,
            code: result?.error?.includes?.('required') ? ErrorCodes.INVALID_INPUT : ErrorCodes.UPSTREAM_ERROR,
            message: result?.error || 'unknown error',
            retriable: false,
            details: result,
          });
        }
        return successEnvelope({ agent: name, output: result });
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
  executeFn: executeClone,
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
  executeFn: executeSynthesize,
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
  executeFn: executeDescribe,
  validate(input) {
    if (typeof input?.description !== 'string' || !input.description.trim()) {
      return { ok: false, error: 'description is required (string)' };
    }
    return null;
  },
});
