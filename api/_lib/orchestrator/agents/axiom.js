// Axiom agent — structured logging.

import { logger, isAxiomConfigured } from '../../logger.js';
import { successEnvelope, envelope, ErrorCodes, validateLoggerInput } from '../contracts.js';

export const axiomAgent = {
  description: 'Axiom structured logging (console fallback when token unset)',
  isEnabled() { return true; },
  validate: validateLoggerInput,
  retry: { attempts: 1, backoffMs: 0 },
  async run({ level = 'info', msg, fields = {} }) {
    try {
      const fn = logger[level] || logger.info;
      fn(msg, fields);
      return successEnvelope({ agent: 'axiom', output: { transmitted: isAxiomConfigured() } });
    } catch (e) {
      return envelope({ agent: 'axiom', code: ErrorCodes.UNKNOWN, message: e.message, retriable: false });
    }
  },
  async health() {
    return { ok: true, configured: isAxiomConfigured() };
  },
};
