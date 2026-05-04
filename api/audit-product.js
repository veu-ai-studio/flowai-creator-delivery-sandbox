// POST /api/audit-product
// Body: { url: string, auditType?: 'demo'|'investor'|'launch'|'governance', pageContent?: string }
// Returns a four-dimension scored audit (Content, UX, Technical, Compliance) plus overall verdict.

import { setCorsHeaders, callClaude, fetchUrlAsText, extractTextFromHtml } from './_lib/claude.js';

const AUDIT_LENSES = {
  demo: 'Audit specifically for prospect demo readiness. Every finding must rate DEMO RISK as SAFE / CAUTION / BLOCKER.',
  investor: 'Audit specifically for investor review. Every finding must rate INVESTOR SIGNAL as POSITIVE / NEUTRAL / RED FLAG.',
  launch: 'Audit specifically for public launch readiness. Every finding must rate LAUNCH GATE as GO / HOLD / BLOCKER.',
  governance: 'Audit for full governance and clearance. Every finding must rate as COMPLIANT / NON-COMPLIANT / REQUIRES REVIEW.',
};

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { url, auditType = 'demo', pageContent: providedContent } = req.body || {};
  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Body must include "url" string.' });
  }

  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

  // Use caller-provided page content if available (avoid double fetch); else fetch.
  let pageContext = providedContent;
  let page = null;
  if (!pageContext) {
    const fetchResult = await fetchUrlAsText(target);
    if (!fetchResult.ok) {
      return res.status(200).json({
        ok: false,
        reachable: false,
        reason: fetchResult.reason,
        url: target,
      });
    }
    page = extractTextFromHtml(fetchResult.html, target);
    pageContext = `Title: ${page.title}\nMeta: ${page.metaDescription}\nHeadings: ${page.headings.map((h) => h.text).join(' | ')}\n\nBody:\n${page.bodyText.slice(0, 8000)}`;
  }

  const lens = AUDIT_LENSES[auditType] || AUDIT_LENSES.demo;

  const prompt = `You are FlowAI's quality audit engine. Score the product at ${target} across four dimensions.

${lens}

Page content:
${pageContext}

Score each dimension 0-25. Format the output exactly like this — plain text, no markdown bold:

CONTENT ACCURACY: X/25
- 2 bullets citing specific page content. End with the audit-type rating.

USER EXPERIENCE: X/25
- 2 bullets citing specific UX patterns. End with the audit-type rating.

TECHNICAL QUALITY: X/25
- 2 bullets citing technical signals. End with the audit-type rating.

COMPLIANCE: X/25
- 2 bullets covering privacy/legal/copyright signals. End with the audit-type rating.

TOTAL SCORE: X/100

TOP 3 ISSUES
1. [issue, severity CRITICAL/HIGH/MEDIUM, recommended fix]
2. ...
3. ...

VERDICT: One sentence specific to this product.`;

  try {
    const claude = await callClaude({
      prompt,
      maxTokens: 1000,
      complexity: 'routine',
    });

    return res.status(200).json({
      ok: true,
      reachable: true,
      url: target,
      auditType,
      analysis: claude.text,
      model: claude.model,
      usage: claude.usage,
      page: page
        ? {
            title: page.title,
            metaDescription: page.metaDescription,
            headings: page.headings.slice(0, 10),
          }
        : undefined,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: 'Claude call failed',
      details: e.message || String(e),
    });
  }
}
