// Inngest agent — event dispatch.

import { sendEvent, isInngestEnabled } from '../../inngest.js';
// NOTE: this agent only uses sendEvent + isInngestEnabled, both of which are
// now lazy in the lib (no top-level Inngest constructor calls), so importing
// this module is safe even when env vars are absent.
import { successEnvelope, envelope, ErrorCodes, validateInngestInput } from '../contracts.js';

export const inngestAgent = {
  description: 'Inngest background-job dispatch',
  isEnabled: isInngestEnabled,
  validate: validateInngestInput,
  retry: { attempts: 2, backoffMs: 500 },
  async run({ ctx, eventName, data }) {
    const result = await sendEvent(eventName, data || {}, { user: ctx?.userId ? { id: ctx.userId, orgId: ctx.orgId } : undefined });
    if (result.ok) return successEnvelope({ agent: 'inngest', output: result });
    return envelope({ agent: 'inngest', code: result.enabled ? ErrorCodes.UPSTREAM_ERROR : ErrorCodes.AGENT_DISABLED, message: result.reason, retriable: result.enabled });
  },
  async health() {
    return {
      ok: isInngestEnabled(),
      eventKeyPresent: Boolean(process.env.INNGEST_EVENT_KEY),
      signingKeyPresent: Boolean(process.env.INNGEST_SIGNING_KEY),
      backend: process.env.INNGEST_BACKEND || 'auto',
    };
  },
};
