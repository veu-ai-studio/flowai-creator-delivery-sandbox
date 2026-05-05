// Clerk agent — verify session.

import { verifySession, isClerkConfigured, isAuthRequired } from '../../auth.js';
import { successEnvelope, envelope, ErrorCodes, validateAuthInput } from '../contracts.js';

export const clerkAgent = {
  description: 'Clerk authentication / org_id resolution',
  isEnabled() { return true; }, // always enabled — falls through to anonymous when no key
  validate: validateAuthInput,
  retry: { attempts: 1, backoffMs: 0 },
  async run({ req }) {
    try {
      const session = await verifySession(req);
      return successEnvelope({
        agent: 'clerk',
        output: {
          authenticated: Boolean(session),
          session,
          configured: isClerkConfigured(),
        },
      });
    } catch (e) {
      return envelope({ agent: 'clerk', code: ErrorCodes.UPSTREAM_ERROR, message: e.message, retriable: false });
    }
  },
  async health() {
    return {
      ok: true,
      clerkConfigured: isClerkConfigured(),
      authRequired: isAuthRequired(),
    };
  },
};
