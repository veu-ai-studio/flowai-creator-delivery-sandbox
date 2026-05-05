// Vercel agent — exposes deployment metadata so health/diagnostics can show
// which build is running. Read-only; no provisioning calls.

import { successEnvelope } from '../contracts.js';

export const vercelAgent = {
  description: 'Vercel runtime metadata (deployment info, region)',
  isEnabled() { return true; }, // always — env vars are auto-injected by Vercel
  retry: { attempts: 1, backoffMs: 0 },
  async run() {
    return successEnvelope({
      agent: 'vercel',
      output: {
        env: process.env.VERCEL_ENV || null,
        url: process.env.VERCEL_URL || null,
        region: process.env.VERCEL_REGION || null,
        commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
        branch: process.env.VERCEL_GIT_COMMIT_REF || null,
      },
    });
  },
  async health() {
    return {
      ok: true,
      env: process.env.VERCEL_ENV || 'local',
      commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 8) || null,
    };
  },
};
