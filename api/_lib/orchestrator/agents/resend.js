// Resend agent — transactional email.

import { sendEmail, isEmailConfigured } from '../../email.js';
import { successEnvelope, envelope, ErrorCodes, validateEmailInput } from '../contracts.js';

export const resendAgent = {
  description: 'Resend transactional email',
  isEnabled: isEmailConfigured,
  validate: validateEmailInput,
  retry: { attempts: 2, backoffMs: 1000 },
  async run({ to, subject, html, text, from, replyTo, tags }) {
    const r = await sendEmail({ to, subject, html, text, from, replyTo, tags });
    if (r.ok) return successEnvelope({ agent: 'resend', output: r });
    return envelope({ agent: 'resend', code: r.reason?.includes('not configured') ? ErrorCodes.AGENT_DISABLED : ErrorCodes.UPSTREAM_ERROR, message: r.reason, retriable: true });
  },
  async health() {
    return { ok: isEmailConfigured(), configured: isEmailConfigured() };
  },
};
