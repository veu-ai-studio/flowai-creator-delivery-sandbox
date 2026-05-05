// POST /api/email/test
// Body: { template: 'welcome'|'runComplete'|'clearanceFailed', to: string, ...templateContext }
//
// Gated by EMAIL_TEST_ENABLED=true so it doesn't accidentally send real mail
// from production. Tomorrow's verification: set EMAIL_TEST_ENABLED=true and
// curl this endpoint with each template.

import { setCorsHeaders } from '../_lib/claude.js';
import { welcomeEmail, runCompleteEmail, clearanceFailedEmail, sendEmail, isEmailConfigured } from '../_lib/email.js';
import { requireAuth } from '../_lib/auth.js';

const TEMPLATES = {
  welcome: welcomeEmail,
  runComplete: runCompleteEmail,
  clearanceFailed: clearanceFailedEmail,
};

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  if (process.env.EMAIL_TEST_ENABLED !== 'true') {
    return res.status(403).json({ error: 'Email test endpoint disabled. Set EMAIL_TEST_ENABLED=true to enable.' });
  }

  const ctx = await requireAuth(req, res);
  if (!ctx) return;

  const { template, to, ...rest } = req.body || {};
  if (!TEMPLATES[template]) {
    return res.status(400).json({ error: `Unknown template "${template}". Use one of: ${Object.keys(TEMPLATES).join(', ')}.` });
  }
  if (!to) return res.status(400).json({ error: 'Missing "to" address.' });

  const built = TEMPLATES[template](rest);
  const sent = await sendEmail({ to, ...built, tags: [{ name: 'flowai_test', value: template }] });

  return res.status(sent.ok ? 200 : 500).json({
    ...sent,
    template,
    subject: built.subject,
    configured: isEmailConfigured(),
  });
}
