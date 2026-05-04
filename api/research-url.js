// POST /api/research-url
// Body: { url: string, objective?: string }
// Fetches the page, hands it to Claude, returns structured findings.

import { setCorsHeaders, callClaude, fetchUrlAsText, extractTextFromHtml } from './_lib/claude.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { url, objective } = req.body || {};
  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Body must include "url" string.' });
  }

  // Normalise URL
  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

  const fetchResult = await fetchUrlAsText(target);
  if (!fetchResult.ok) {
    return res.status(200).json({
      ok: false,
      reachable: false,
      reason: fetchResult.reason,
      url: target,
    });
  }

  const page = extractTextFromHtml(fetchResult.html, target);

  const objectiveLine = objective
    ? `Session objective: ${objective}\n\n`
    : '';

  const prompt = `${objectiveLine}You are FlowAI's research engine. Produce a concise structured research brief for the product at the URL below, based ONLY on the fetched page content.

URL: ${page.url}
Title: ${page.title}
Meta description: ${page.metaDescription}
Headings: ${page.headings.map((h) => `${h.tag}: ${h.text}`).join(' | ')}

Page body (truncated):
${page.bodyText.slice(0, 8000)}

Produce the brief in this format (use plain text headers, no markdown bold):

PRODUCT OVERVIEW
- One sentence on what the product does (quote from the page).
- Core features (quote exact feature names).

TARGET AUDIENCE
- Primary persona, evidenced by language on the page.

VALUE PROPOSITION
- The exact value prop as stated on the page.

DEMO READINESS (0-10)
- One number with one-sentence justification.

TOP 3 STRENGTHS
- Bulleted list, each one quoted from page where possible.

TOP 3 RISKS
- Bulleted list, each tied to a specific gap.

NEXT ACTION
- One specific next step the operator should take.

If the page content is insufficient, say so explicitly and stop. Do not speculate beyond the page.`;

  try {
    const claude = await callClaude({
      prompt,
      maxTokens: 1000,
      complexity: 'routine',
    });

    return res.status(200).json({
      ok: true,
      reachable: true,
      url: page.url,
      page: {
        title: page.title,
        metaDescription: page.metaDescription,
        headings: page.headings.slice(0, 10),
        bodyTextSnippet: page.bodyText.slice(0, 1500),
      },
      analysis: claude.text,
      model: claude.model,
      usage: claude.usage,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      reachable: true,
      error: 'Claude call failed',
      details: e.message || String(e),
      page: {
        title: page.title,
        metaDescription: page.metaDescription,
      },
    });
  }
}
