// POST /api/configuration/describe
// Body:
//   { description: string, productName?: string, audience?: string,
//     features?: string, objective?: string, org_id?: string,
//     product_id?: string, save?: boolean }
//
// Produces a structured product spec (name, pitch, audience, features,
// value_prop, competitors, demo readiness, suggested next steps, open
// questions) plus a quality score. Persisted as a configuration run; cost,
// audit-log, and clearance-check entries written.

import { setCorsHeaders } from '../_lib/claude.js';
import { resolveOrgId } from '../_lib/tenant.js';
import { runStart, runClaude, runComplete, runFail, setProgress, parseFencedJson, stripFencedJson, extractQualityScore } from '../_lib/configRunner.js';
import { listObjectives, getProduct } from '../_lib/configRegistry.js';

const DEFAULT_ORG = 'veu-ai-studio';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const {
    description, productName, audience, features,
    objective, product_id: productId, save = true,
    _run_id: existingRunId,
  } = req.body || {};

  if (typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Body must include "description" string.' });
  }

  const orgId = resolveOrgId(req) || DEFAULT_ORG;

  // Pull product-level objectives if a product is referenced.
  let productObjectives = [];
  if (productId) {
    productObjectives = listObjectives({ orgId, productId });
  }

  const ctx = await runStart({
    mode: 'describe',
    orgId, productId,
    input: { description: description.slice(0, 500), productName, audience, features, objective },
    existingRunId,
  });

  try {
    setProgress(ctx, { step: 'preparing_prompt', percent: 15, etaSec: 25 });
    const objectiveLines = productObjectives.length
      ? `\nProduct-level objectives bound to this product:\n${productObjectives.map((o) => `- [${o.type}] ${o.value} (weight=${o.weight})`).join('\n')}\n`
      : '';

    const fields = [
      productName ? `Product name: ${productName}` : null,
      audience ? `Target audience: ${audience}` : null,
      features ? `Key features: ${features}` : null,
      objective ? `Session objective: ${objective}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `You are FlowAI's product spec engine. Convert the description below into a structured, machine-readable product specification.

${fields ? fields + '\n\n' : ''}${objectiveLines}Description:
${description.trim().slice(0, 4000)}

Return TWO sections in this exact order:

PART 1 — HUMAN-READABLE BRIEF (plain text, no markdown bold):

PRODUCT NAME
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
- Up to 3 questions the operator should answer to improve the brief.

QUALITY SCORE: X/100
- A single integer 0-100 indicating how complete and credible this spec is given the input. End with one sentence justification.

PART 2 — MACHINE-READABLE SPEC (a single fenced JSON block):

\`\`\`json
{
  "name": "string",
  "pitch": "string",
  "audience": { "primary": "string", "secondary": "string|null" },
  "features": ["string", "..."],
  "value_proposition": "string",
  "competitors": [{ "name": "string", "gap": "string" }],
  "demo_readiness": 0,
  "next_steps": ["string", "..."],
  "open_questions": ["string", "..."],
  "quality_score": 0
}
\`\`\`

Both parts are required. Do not add commentary after the JSON block.`;

    setProgress(ctx, { step: 'calling_claude', percent: 40, etaSec: 18 });

    const claude = await runClaude(ctx, {
      prompt,
      maxTokens: 1500,
      complexity: 'routine',
      callLabel: 'describe',
    });

    setProgress(ctx, { step: 'parsing_output', percent: 85, etaSec: 3 });

    const json = parseFencedJson(claude.text);
    const display = stripFencedJson(claude.text);
    const qualityScore = json?.quality_score ?? extractQualityScore(display);

    const output = {
      brief: display,
      spec: json,
      quality_score: qualityScore,
      model: claude.model,
    };

    await runComplete(ctx, { output, qualityScore });

    return res.status(200).json({
      ok: true,
      run_id: ctx.run.id,
      mode: 'describe',
      org_id: orgId,
      product_id: productId || null,
      brief: display,
      spec: json,
      quality_score: qualityScore,
      model: claude.model,
      usage: claude.usage,
      cost_usd: ctx.totalCostUSD,
      saved: save,
    });
  } catch (e) {
    await runFail(ctx, e);
    return res.status(500).json({
      ok: false,
      run_id: ctx.run?.id,
      error: 'describe failed',
      details: e.message || String(e),
    });
  }
}

export const config = { maxDuration: 60 };
