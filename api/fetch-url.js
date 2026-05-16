// POST /api/fetch-url
// Body: { url: string, force?: 'browserless'|'playwright-endpoint'|'simple-fetch' }
// Server-side fetch + extraction. Picks the best available crawler automatically.

import { setCorsHeaders } from './_lib/claude.js';
import { crawl } from './_lib/crawler.js';
import { requireAuthHard } from './_lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  // S-3 fix (W4 adversarial bd2f923): auth gate BEFORE body validation.
  if (!(await requireAuthHard(req, res))) return;

  const { url, force } = req.body || {};
  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Body must include "url" string.' });
  }

  const page = await crawl(url, { force });
  if (!page.ok) {
    return res.status(200).json({ ok: false, reason: page.reason, attempts: page.attempts });
  }

  return res.status(200).json({
    ok: true,
    method: page.method,
    jsRendered: page.jsRendered,
    warnings: page.warnings,
    url: page.url,
    title: page.title,
    metaDescription: page.metaDescription,
    headings: page.headings,
    bodyText: page.bodyText,
  });
}
