// POST /api/propose-step
// Used by Guided mode — Claude proposes what it WILL do for a step before executing.
// The user can approve, modify, or skip.
//
// Body: {
//   step: 'research'|...,
//   input: { type, value, name? },
//   objective?: string,
//   pageContent?: string,
//   userModification?: string,   // optional refinement from a previous proposal
//   sessionId?: string
// }

import { setCorsHeaders, callClaude } from './_lib/claude.js';
import { recordCost } from './_lib/cost.js';
import { STEP_KEYS, STEP_LABELS } from './_lib/stepPrompts.js';
import { requireAuthHard } from './_lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  // S-3 fix (W4 adversarial bd2f923): auth gate BEFORE body validation.
  if (!(await requireAuthHard(req, res))) return;

  const { step, input = {}, objective, pageContent, userModification, sessionId } = req.body || {};

  if (!STEP_KEYS.includes(step)) {
    return res.status(400).json({ error: `Unknown step "${step}". Use one of: ${STEP_KEYS.join(', ')}.` });
  }
  if (!input?.value?.trim?.()) {
    return res.status(400).json({ error: 'Body must include input { type, value }.' });
  }

  const inputDesc = input.type === 'url'
    ? `URL: ${input.value}${pageContent ? `\n\nPage content (truncated):\n${(pageContent || '').slice(0, 1500)}` : ''}`
    : `Product description (truncated):\n${input.value.slice(0, 1500)}`;

  const objectiveLine = objective ? `Session objective: ${objective}` : '';
  const modNote = userModification
    ? `\n\nThe user requested this modification to the previous proposal:\n"${userModification}"\nIncorporate it.`
    : '';

  const prompt = `You are FlowAI in Guided Mode. You are about to run Step "${STEP_LABELS[step]}" (${step}).

${inputDesc}
${objectiveLine}${modNote}

Produce a proposal in this EXACT format:

TOPIC:
[One sentence describing the specific focus for this step given the input and objective]

QUESTIONS I WILL INVESTIGATE:
1. [Question covering [L1] Functionality]
2. [Question covering [L2] Operational]
3. [Question covering [L3] Financial]
4. [Question covering [L4] Business]
5. [Question covering [L5] GTM]

APPROACH:
[2-3 sentences describing analysis approach and frameworks]

OUTPUT FORMAT:
[One sentence describing the deliverable]

CRITICAL RULES:
- Reference the actual input — not generic templates
- Do not produce findings yet — only propose
- Keep the entire proposal under 350 words`;

  try {
    const claude = await callClaude({ prompt, maxTokens: 600, complexity: 'routine' });
    recordCost({ endpoint: '/api/propose-step', sessionId, ...claude });
    return res.status(200).json({
      ok: true,
      step,
      stepLabel: STEP_LABELS[step],
      proposal: claude.text,
      model: claude.model,
      usage: claude.usage,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Claude call failed', details: e.message || String(e) });
  }
}
