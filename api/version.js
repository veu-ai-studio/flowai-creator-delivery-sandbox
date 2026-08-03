// GET /api/version
//
// Returns commit SHA, deploy timestamp, environment, list of enabled feature
// flags, and SDK versions for every persisted dep. Designed to be the first
// thing a deploy verifier or operator checks.

import { setCorsHeaders } from './_lib/claude.js';
import { withRequestLog } from './_lib/requestLog.js';
import { selectedBackend } from './_lib/db.js';
import { isInngestEnabled } from './_lib/inngest.js';
import { isAuthRequired, isClerkConfigured, requireAuthHard } from './_lib/auth.js';
import { isEmailConfigured } from './_lib/email.js';
import { isEmbeddingsConfigured } from './_lib/embeddings.js';
import { isAxiomConfigured } from './_lib/logger.js';
import { isSupabaseConfigured } from './_lib/supabase.js';
import { resolveBuildIdentity } from '../src/lib/observability/buildIdentity.js';

// Read package.json at module load using fs. The `assert { type: 'json' }`
// syntax is unreliable across Node versions / bundlers; fs is portable.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

let pkg = { name: 'flowai-api', version: '0.0.0', dependencies: {} };
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // Try a few candidate paths (Vercel's bundle layout differs from local).
  for (const candidate of [
    join(__dirname, '..', 'package.json'),
    join(process.cwd(), 'package.json'),
  ]) {
    try {
      pkg = JSON.parse(readFileSync(candidate, 'utf8'));
      break;
    } catch {}
  }
} catch {}

// Module-level startup time approximates the deploy timestamp from the
// running function's perspective. (Vercel's function instances live for a
// while after deploy; first instantiation is close-enough to deploy time.)
const STARTED_AT = new Date().toISOString();

async function versionHandler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const ctx = await requireAuthHard(req, res);
  if (!ctx) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const buildIdentity = resolveBuildIdentity(process.env);
  const deployUrl = process.env.VERCEL_URL || null;

  return res.status(200).json({
    name: pkg.name,
    version: pkg.version,
    commit: buildIdentity.commit,
    commitFull: buildIdentity.commitFull,
    branch: buildIdentity.branch,
    buildIdentitySource: buildIdentity.source,
    buildIdentityGeneratedAt: buildIdentity.generatedAt,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    region: process.env.VERCEL_REGION || null,
    deployUrl,
    startedAt: STARTED_AT,
    nowAt: new Date().toISOString(),
    runtime: {
      node: process.versions?.node || null,
      v8: process.versions?.v8 || null,
      platform: process.platform,
      arch: process.arch,
    },
    sdks: {
      anthropic: 'rest@2023-06-01',
      '@supabase/supabase-js': pkg.dependencies?.['@supabase/supabase-js'] || null,
      'inngest': pkg.dependencies?.inngest || null,
      '@clerk/clerk-sdk-node': pkg.dependencies?.['@clerk/clerk-sdk-node'] || null,
      'resend': pkg.dependencies?.resend || null,
      'voyageai': pkg.dependencies?.voyageai || null,
      '@axiomhq/js': pkg.dependencies?.['@axiomhq/js'] || null,
    },
    featureFlags: {
      // Integration activation status
      anthropicReady: Boolean(process.env.ANTHROPIC_API_KEY),
      browserlessReady: Boolean(process.env.BROWSERLESS_API_KEY),
      githubAppReady: Boolean(
        process.env.GITHUB_APP_ID &&
        process.env.GITHUB_APP_PRIVATE_KEY &&
        (process.env.GITHUB_APP_INSTALLATION_ID || process.env.GITHUB_INSTALLATION_ID),
      ),
      supabaseReady: isSupabaseConfigured(),
      inngestReady: isInngestEnabled(),
      clerkReady: isClerkConfigured(),
      resendReady: isEmailConfigured(),
      voyageReady: isEmbeddingsConfigured(),
      axiomReady: isAxiomConfigured(),
      // Mode flags
      authRequired: isAuthRequired(),
      dbBackend: selectedBackend(),
      inngestBackend: process.env.INNGEST_BACKEND || 'auto',
      emailTestEnabled: process.env.EMAIL_TEST_ENABLED === 'true',
      emailDryRun: process.env.EMAIL_DRY_RUN === 'true',
      axiomDryRun: process.env.AXIOM_DRY_RUN === 'true',
      replitProxyDisabled: process.env.REPLIT_PROXY_DISABLED === 'true',
      logLevel: process.env.LOG_LEVEL || 'info',
    },
  });
}

export default withRequestLog(versionHandler, { endpoint: '/api/version' });
