// POST /api/fetch-url
// Body: { url: string }
// Server-side fetch + HTML extraction. Returns { title, metaDescription, headings, bodyText }.
// Used as a fallback / replacement for the Replit proxy.

import { setCorsHeaders, fetchUrlAsText, extractTextFromHtml } from './_lib/claude.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { url } = req.body || {};
  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Body must include "url" string.' });
  }

  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

  const r = await fetchUrlAsText(target);
  if (!r.ok) {
    return res.status(200).json({ ok: false, reason: r.reason, status: r.status });
  }

  const page = extractTextFromHtml(r.html, target);
  return res.status(200).json({
    ok: true,
    url: target,
    title: page.title,
    metaDescription: page.metaDescription,
    headings: page.headings,
    bodyText: page.bodyText,
  });
}
