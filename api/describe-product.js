// POST /api/describe-product
// Body: { description: string, productName?: string, audience?: string, features?: string }
// Takes a product description form and returns enrichment + suggestions.

import { setCorsHeaders, callClaude } from './_lib/claude.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { description, productName, audience, features } = req.body || {};
  if (typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Body must include non-empty "description" string.' });
  }

  const fields = [
    productName ? `Product name: ${productName}` : null,
    audience ? `Target audience: ${audience}` : null,
    features ? `Key features: ${features}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are FlowAI's product enrichment engine. The operator gave you the description below — produce structured enrichment so it's ready to feed into a full audit pipeline.

${fields ? fields + '\n\n' : ''}Description:
${description.trim().slice(0, 4000)}

Return plain text, no markdown bold, in this exact format:

PRODUCT NAME (inferred if missing)
- One line.

ONE-LINE PITCH
- Single tight sentence.

TARGET AUDIENCE
- Primary persona (1 sentence). Secondary persona if obvious.

CORE FEATURES (max 5)
- Each on its own line. Be specific.

VALUE PROPOSITION
- Why someone would pay or switch. 1-2 sentences.

LIKELY COMPETITORS (max 3)
- Each with a one-line gap or differentiator.

DEMO READINESS (0-10)
- One number. One-sentence justification.

SUGGESTED NEXT STEPS (max 3)
- Each starts with an imperative verb. Specific to this description.

OPEN QUESTIONS
- Up to 3 questions the operator should answer to improve the brief.`;

  try {
    const claude = await callClaude({
      prompt,
      maxTokens: 1000,
      complexity: 'routine',
    });

    return res.status(200).json({
      ok: true,
      analysis: claude.text,
      model: claude.model,
      usage: claude.usage,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: 'Claude call failed',
      details: e.message || String(e),
    });
  }
}
