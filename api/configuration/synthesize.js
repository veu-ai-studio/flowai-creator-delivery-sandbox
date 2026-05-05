// POST /api/configuration/synthesize
// Body: {
//   inputs: [
//     { type: 'url'|'text'|'file', value: string, weight?: number, label?: string }
//   ],                                          // 2 or more inputs required
//   objective?: string,
//   org_id?: string,
//   product_id?: string,
//   options?: { useEmbeddings?: boolean }       // default true (no-op when Voyage unavailable)
// }
//
// Returns:
//   {
//     ok, run_id,
//     unified_spec: { ... },
//     attribution_map: { feature -> source label },
//     improvement_plan: { ... },
//     quality_score, cost_usd, model
//   }

import { setCorsHeaders } from '../_lib/claude.js';
import { resolveOrgId } from '../_lib/tenant.js';
import { crawl, summarisePageForPrompt } from '../_lib/crawler.js';
import { embedBatch, isEmbeddingsConfigured } from '../_lib/embeddings.js';
import { listObjectives } from '../_lib/configRegistry.js';
import { runStart, runClaude, runComplete, runFail, setProgress, parseFencedJson, stripFencedJson, extractQualityScore } from '../_lib/configRunner.js';

const DEFAULT_ORG = 'veu-ai-studio';

export async function execute(input = {}) {
  const {
    inputs, objective, product_id: productId, org_id: orgIdInput, options = {},
    _run_id: existingRunId,
  } = input;

  if (!Array.isArray(inputs) || inputs.length < 2) {
    return { ok: false, error: 'inputs[] required (>=2 items)' };
  }
  for (const inp of inputs) {
    if (!inp || typeof inp !== 'object') return { ok: false, error: 'each input must be an object' };
    if (!['url', 'text', 'file'].includes(inp.type)) return { ok: false, error: `bad input type "${inp.type}"` };
    if (typeof inp.value !== 'string' || !inp.value.trim()) return { ok: false, error: 'each input must have non-empty value' };
  }

  const orgId = orgIdInput || DEFAULT_ORG;
  const useEmbeddings = options.useEmbeddings !== false;

  const ctx = await runStart({
    mode: 'synthesize',
    orgId, productId,
    input: { inputs: inputs.map((i) => ({ type: i.type, valueLength: i.value.length, label: i.label, weight: i.weight })), objective },
    existingRunId,
  });

  try {
    // ─── Step 1: capture all inputs ─────────────────────────────────────
    setProgress(ctx, { step: 'capturing_inputs', percent: 10, etaSec: inputs.length * 12 });
    const captured = await Promise.all(inputs.map(async (inp, idx) => {
      const label = inp.label || `Input ${String.fromCharCode(65 + idx)}`;
      const weight = typeof inp.weight === 'number' ? inp.weight : 1;
      if (inp.type === 'url') {
        const page = await crawl(inp.value);
        return {
          idx, label, type: 'url', weight, ok: page.ok,
          url: page.url || inp.value,
          page,
          summary: page.ok ? summarisePageForPrompt(page) : `Capture failed for ${inp.value}: ${page.reason}`,
        };
      }
      if (inp.type === 'text') {
        return {
          idx, label, type: 'text', weight, ok: true,
          text: inp.value,
          summary: `Free-form text input "${label}" (${inp.value.length} chars):\n${inp.value.slice(0, 4000)}`,
        };
      }
      // file: client provides the extracted text alongside; we treat as text
      return {
        idx, label, type: 'file', weight, ok: true,
        text: inp.value,
        summary: `Uploaded-file content "${label}" (${inp.value.length} chars):\n${inp.value.slice(0, 4000)}`,
      };
    }));

    const failedCaptures = captured.filter((c) => !c.ok);
    setProgress(ctx, { step: 'inputs_captured', percent: 30, etaSec: 35, partial: { captured: captured.length, failed: failedCaptures.length } });

    // ─── Step 2: optional embedding pass for dedup / weighting ──────────
    let embeddingsReport = null;
    if (useEmbeddings && isEmbeddingsConfigured()) {
      setProgress(ctx, { step: 'embeddings', percent: 40, etaSec: 30 });
      const texts = captured.map((c) => (c.summary || '').slice(0, 4000));
      const vectors = await embedBatch(texts, { inputType: 'document' });
      // Pairwise cosine to surface near-duplicate inputs.
      const pairs = [];
      for (let i = 0; i < vectors.length; i++) {
        for (let j = i + 1; j < vectors.length; j++) {
          const sim = cosine(vectors[i], vectors[j]);
          if (sim != null && sim > 0.85) {
            pairs.push({ a: captured[i].label, b: captured[j].label, similarity: Number(sim.toFixed(3)) });
          }
        }
      }
      embeddingsReport = {
        embedded: vectors.filter(Boolean).length,
        possibleDuplicates: pairs,
      };
    }

    // ─── Step 3: synthesis prompt ───────────────────────────────────────
    const productObjectives = productId ? listObjectives({ orgId, productId }) : [];
    const objectiveLines = productObjectives.length
      ? `\nProduct-level objectives:\n${productObjectives.map((o) => `- [${o.type}] ${o.value} (weight=${o.weight})`).join('\n')}\n`
      : '';

    const inputsBlock = captured.map((c) => {
      const w = c.weight !== 1 ? ` weight=${c.weight}` : '';
      return `══════ ${c.label} (${c.type}${w}) ══════\n${c.summary}`;
    }).join('\n\n');

    const dupeNote = embeddingsReport?.possibleDuplicates?.length
      ? `\n\nEmbedding analysis flagged near-duplicate input pairs (cosine > 0.85): ${embeddingsReport.possibleDuplicates.map((p) => `${p.a} ↔ ${p.b} (${p.similarity})`).join('; ')}. Treat each duplicate as one source and credit both labels in attribution.\n`
      : '';

    const synthesisPrompt = `You are FlowAI's synthesis engine. Combine the inputs below into a single unified product specification.

${objective ? `Session objective: ${objective}\n` : ''}${objectiveLines}${dupeNote}
Inputs:
${inputsBlock}

Heavier-weighted inputs (weight > 1) should influence the synthesis more; weight=0 inputs should be excluded entirely.

Return TWO sections.

PART 1 — UNIFIED SPECIFICATION (plain text, no markdown bold):

PRODUCT NAME
- One line synthesizing all sources.

ONE-LINE PITCH
- Single tight sentence drawing from the strongest pitches across inputs.

TARGET AUDIENCE
- Primary persona, evidence-cited from at least one input by label.

CORE FEATURES (max 8)
- Each line: feature name — sourced from [label1, label2 if combined].

VALUE PROPOSITION
- 1-2 sentences synthesizing the strongest themes.

ATTRIBUTION MAP
- For each major decision in this synthesis, list which input it came from:
  - identity → label
  - features → label(s)
  - value prop → label
  - audience → label

QUALITY SCORE: X/100
- 0-100 integer assessing how well the inputs combined into a coherent unified spec.

PART 2 — MACHINE-READABLE (single fenced JSON block):

\`\`\`json
{
  "name": "string",
  "pitch": "string",
  "audience": { "primary": "string", "evidence_label": "string" },
  "features": [{ "name": "string", "sources": ["label", "..."] }],
  "value_proposition": { "text": "string", "source_label": "string" },
  "attribution": { "identity": "label", "features": ["label"], "value_prop": "label", "audience": "label" },
  "quality_score": 0
}
\`\`\``;

    setProgress(ctx, { step: 'synthesis', percent: 55, etaSec: 25 });
    const synthClaude = await runClaude(ctx, {
      prompt: synthesisPrompt,
      maxTokens: 2000,
      complexity: 'routine',
      callLabel: 'synthesis',
    });

    const synthJson = parseFencedJson(synthClaude.text);
    const synthText = stripFencedJson(synthClaude.text);
    setProgress(ctx, { step: 'synthesis_complete', percent: 75, etaSec: 12, partial: { unified_spec: { text: synthText.slice(0, 800), json: synthJson } } });

    // ─── Step 4: improvement plan over the unified spec ─────────────────
    const planPrompt = `You are FlowAI's product improvement engine. Given the synthesized spec below, produce a prioritized improvement plan to take it from spec to launch.

Synthesized spec:
${synthText}

Return TWO sections.

PART 1 — IMPROVEMENT PLAN (plain text):

EXECUTIVE SUMMARY
- 2-3 sentences on the biggest opportunity and biggest risk.

PRIORITIZED IMPROVEMENTS (max 7)
- Each line: [P0|P1|P2] [theme] short-title — rationale + concrete change.

DEPENDENCIES
- Improvements that block other improvements.

FIRST-WEEK MILESTONES (max 3)
- Specific deliverables you'd ship this week.

QUALITY SCORE: X/100

PART 2 — JSON:

\`\`\`json
{
  "summary": "string",
  "improvements": [
    { "priority": "P0|P1|P2", "theme": "string", "title": "string", "rationale": "string", "change": "string" }
  ],
  "dependencies": ["string"],
  "first_week": ["string"],
  "quality_score": 0
}
\`\`\``;

    setProgress(ctx, { step: 'improvement_plan', percent: 80, etaSec: 10 });
    const planClaude = await runClaude(ctx, {
      prompt: planPrompt,
      maxTokens: 1800,
      complexity: 'routine',
      callLabel: 'improvement_plan',
    });

    const planJson = parseFencedJson(planClaude.text);
    const planText = stripFencedJson(planClaude.text);
    setProgress(ctx, { step: 'finalising', percent: 95, etaSec: 2 });

    const qualityScore = synthJson?.quality_score
      ?? planJson?.quality_score
      ?? extractQualityScore(synthText)
      ?? extractQualityScore(planText);

    const output = {
      unified_spec: { text: synthText, json: synthJson },
      improvement_plan: { text: planText, json: planJson },
      attribution_map: synthJson?.attribution || null,
      quality_score: qualityScore,
      embeddings: embeddingsReport,
      input_summary: captured.map((c) => ({ idx: c.idx, label: c.label, type: c.type, weight: c.weight, ok: c.ok })),
      failed_captures: failedCaptures.map((c) => ({ label: c.label, url: c.url, reason: c.page?.reason })),
    };

    await runComplete(ctx, { output, qualityScore });

    return {
      ok: true,
      run_id: ctx.run.id,
      mode: 'synthesize',
      org_id: orgId,
      product_id: productId || null,
      ...output,
      cost_usd: ctx.totalCostUSD,
      durationMs: Date.now() - ctx.t0,
    };
  } catch (e) {
    await runFail(ctx, e);
    return {
      ok: false,
      run_id: ctx.run?.id,
      error: 'synthesize failed',
      details: e.message || String(e),
    };
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const orgId = resolveOrgId(req) || DEFAULT_ORG;
  const result = await execute({ ...(req.body || {}), org_id: orgId });
  if (!result.ok && /required|each input/.test(result.error || '')) return res.status(400).json(result);
  if (!result.ok) return res.status(500).json(result);
  return res.status(200).json(result);
}

export const config = { maxDuration: 90 };

function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return null;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
