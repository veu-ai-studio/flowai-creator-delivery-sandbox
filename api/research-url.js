// POST /api/research-url
// Body: { url: string, objective?: string, force?: 'browserless'|'playwright-endpoint'|'simple-fetch' }
// Crawls the page (JS-rendered when possible), then asks Claude for a research brief.

import { setCorsHeaders, callClaude } from './_lib/claude.js';
import { crawl, summarisePageForPrompt } from './_lib/crawler.js';
import { recordCost } from './_lib/cost.js';
import { requireAuthHard } from './_lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  // S-3 fix (W4 adversarial bd2f923): auth gate BEFORE body validation.
  if (!(await requireAuthHard(req, res))) return;

  const { url, objective, force, sessionId } = req.body || {};
  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Body must include "url" string.' });
  }

  const page = await crawl(url, { force });
  if (!page.ok) {
    // W2 Phase 1 (2026-05-14, dispatch 4-of-4) — Agent #6 Research is
    // the first agent to use the extended step-result contract.  When
    // crawl returns ok:false we cannot produce a meaningful brief; we
    // emit block:true so Auto Runner halts the pipeline rather than
    // running Steps 2..8 on null content.  See
    // src/lib/runner/blockGate.js for the contract.
    return res.status(200).json({
      ok: false,
      reachable: false,
      reason: page.reason,
      attempts: page.attempts,
      url: page.url,
      block: true,
      blockSeverity: 'critical',
      blockReason: `Page content insufficient — ${page.reason || 'crawl returned no usable body'}.`,
    });
  }

  const objectiveLine = objective ? `Session objective: ${objective}\n\n` : '';
  const pageBlock = summarisePageForPrompt(page);

  const prompt = `${objectiveLine}You are FlowAI's research engine. Produce a concise structured research brief for the product, based ONLY on the fetched page content below.

${pageBlock}

Produce the brief in this format (plain text headers, no markdown bold):

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
    const claude = await callClaude({ prompt, maxTokens: 1000, complexity: 'routine' });
    recordCost({ endpoint: '/api/research-url', sessionId, ...claude });
    return res.status(200).json({
      ok: true,
      reachable: true,
      url: page.url,
      method: page.method,
      jsRendered: page.jsRendered,
      warnings: page.warnings,
      page: {
        title: page.title,
        metaDescription: page.metaDescription,
        // Defect A 2026-05-16: caps raised so callers (UI display +
        // fetchPageContext baked into every step prompt) see the full
        // rendered DOM instead of a 1500-char prefix that was making the
        // pipeline score on partial content. Field still named
        // bodyTextSnippet for backwards compatibility with the UI/test
        // contract — the only change is the cap.
        headings: (page.headings || []).slice(0, 60),
        bodyTextSnippet: (page.bodyText || '').slice(0, 50000),
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
      page: { title: page.title, metaDescription: page.metaDescription },
    });
  }
}
