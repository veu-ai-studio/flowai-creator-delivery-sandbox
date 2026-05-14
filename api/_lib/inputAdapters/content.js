// api/_lib/inputAdapters/content.js
//
// Content / upload input adapter for the FlowAI renewal pipeline.
//
// Accepts pasted text plus optional uploaded attachments (PNG/JPG; PDF
// support is deferred — see report-back).  For images, the adapter
// hands the bytes to Anthropic's vision API to extract both OCR text
// and a brief semantic description; the result is folded back into the
// normalized InputArtifact alongside any pasted text.
//
// ─── INPUT SHAPE ──────────────────────────────────────────────────────
// content: {
//   text?: string,
//   attachments?: [{
//     filename:  string,
//     mimeType:  string,           // image/png | image/jpeg | (others deferred)
//     size:      number,
//     base64:    string,           // raw bytes already base64-encoded by the
//                                    UI; the adapter does NOT touch the
//                                    filesystem.  When the orchestrator
//                                    persists the artifact, base64 bodies
//                                    are dropped on the floor.
//   }]
// }
//
// ─── DEFERRALS (called out in report-back) ────────────────────────────
//   - PDF parsing (pdf-parse / pdf.js) — not bundled in this dispatch.
//     If a PDF attachment arrives, the adapter records the filename and
//     marks extractedText as '(PDF parsing not yet implemented).'
//   - Tesseract.js client-side OCR — not bundled.  All image OCR runs
//     through Anthropic vision on the server side.

import { callClaude } from '../claude.js';
import { safeParseClaudeJson } from './url.js';

const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/**
 * @param {{ text?: string, attachments?: Array<{filename:string,mimeType:string,size:number,base64?:string}> }} content
 * @returns {Promise<{ ok: boolean, raw: object, normalized: object, evidence: object, reason?: string }>}
 */
export async function adaptContent(content, _opts = {}) {
  const text = typeof content?.text === 'string' ? content.text.trim() : '';
  const rawAttachments = Array.isArray(content?.attachments) ? content.attachments : [];

  if (!text && rawAttachments.length === 0) {
    return {
      ok: false,
      reason: 'No content supplied — pass text and/or attachments.',
      raw: { content: { text: '', attachments: [] } },
      normalized: emptyNormalized(null),
      evidence: { attachments: [] },
    };
  }

  // Per-attachment processing.  Images go through Anthropic vision;
  // PDFs are recorded but not parsed in this dispatch.
  const processed = [];
  for (const att of rawAttachments) {
    if (!att || typeof att !== 'object') continue;
    const mime = typeof att.mimeType === 'string' ? att.mimeType.toLowerCase() : '';
    const filename = typeof att.filename === 'string' ? att.filename : 'attachment';
    const size = Number.isFinite(att.size) ? att.size : 0;
    if (IMAGE_MIMES.has(mime) && typeof att.base64 === 'string' && att.base64.length > 0) {
      const vision = await callClaudeVision({
        mimeType: mime,
        base64: att.base64,
        prompt: 'You are an OCR + interpretation engine.  Read the image and return JSON: ' +
          '{"extractedText":"<verbatim text visible on the image>","semanticAnalysis":"<two-sentence description of what the image depicts and what product / interface it appears to show>"}.  ' +
          'No markdown fences, no extra commentary.',
      }).catch(() => null);
      const parsed = vision ? safeParseClaudeJson(vision.text) : null;
      processed.push({
        filename,
        mimeType: mime,
        size,
        extractedText: parsed && typeof parsed.extractedText === 'string' ? parsed.extractedText : '',
        extractedVisionAnalysis: parsed && typeof parsed.semanticAnalysis === 'string' ? parsed.semanticAnalysis : '',
      });
    } else if (mime === 'application/pdf') {
      processed.push({
        filename, mimeType: mime, size,
        extractedText: '(PDF parsing not yet implemented in this dispatch; supply text via the text field for now.)',
        extractedVisionAnalysis: '',
      });
    } else {
      processed.push({
        filename, mimeType: mime, size,
        extractedText: '',
        extractedVisionAnalysis: `(Unsupported mime type ${mime || 'unknown'} — only image/png, image/jpeg, image/webp, image/gif are processed in this dispatch.)`,
      });
    }
  }

  // Build the combined corpus the normalizer sees.
  const corpus = [
    text ? `User-supplied text:\n${text}` : '',
    ...processed.map((p, i) => {
      const sections = [];
      if (p.extractedText) sections.push(`Extracted text:\n${p.extractedText}`);
      if (p.extractedVisionAnalysis) sections.push(`Vision analysis:\n${p.extractedVisionAnalysis}`);
      return sections.length ? `Attachment ${i + 1} (${p.filename}):\n${sections.join('\n\n')}` : '';
    }),
  ].filter(Boolean).join('\n\n---\n\n');

  let normalized = emptyNormalized(processed.length > 0 ? 'vision' : (text ? 'description-only' : null));
  if (corpus.length > 0) {
    try {
      const prompt = buildContentNormalizePrompt(corpus);
      const claude = await callClaude({ prompt, maxTokens: 800, complexity: 'routine' });
      const parsed = safeParseClaudeJson(claude.text);
      if (parsed && typeof parsed === 'object') {
        normalized = {
          productConcept:   typeof parsed.productConcept === 'string' ? parsed.productConcept : '',
          targetUsers:      typeof parsed.targetUsers === 'string'    ? parsed.targetUsers    : '',
          coreClaims:       Array.isArray(parsed.coreClaims)          ? parsed.coreClaims.filter((c) => typeof c === 'string').slice(0, 6) : [],
          detectedFeatures: Array.isArray(parsed.detectedFeatures)    ? parsed.detectedFeatures.filter((f) => typeof f === 'string').slice(0, 6) : [],
          observedSurfaces: processed.length > 0 ? 'vision' : 'description-only',
        };
      } else {
        normalized = heuristicFromContent(text, processed);
      }
    } catch {
      normalized = heuristicFromContent(text, processed);
    }
  }

  return {
    ok: true,
    raw: {
      content: {
        text: text || undefined,
        // Drop base64 bodies — only metadata + extracted text is retained.
        attachments: processed.map((p) => ({
          filename: p.filename,
          mimeType: p.mimeType,
          size: p.size,
          extractedText: p.extractedText,
          extractedVisionAnalysis: p.extractedVisionAnalysis,
        })),
      },
    },
    normalized,
    evidence: {
      textLength: text.length,
      attachments: processed,
      attachmentsCount: processed.length,
    },
  };
}

function emptyNormalized(surface) {
  return {
    productConcept: '',
    targetUsers: '',
    coreClaims: [],
    detectedFeatures: [],
    observedSurfaces: surface,
  };
}

function buildContentNormalizePrompt(corpus) {
  return `You are a normalization engine.  Read the content below and produce a JSON object describing the product or content it represents.

Content corpus:
${corpus}

Return EXACTLY this JSON shape — no markdown fences, no extra commentary:
{
  "productConcept": "<one or two sentences stating what this content is about / what product it represents>",
  "targetUsers": "<one sentence describing who the content is aimed at>",
  "coreClaims": ["<claim 1>", "<claim 2>", "<claim 3>"],
  "detectedFeatures": ["<feature 1>", "<feature 2>", "<feature 3>"]
}

Rules:
- Quote directly from the supplied text or extracted OCR text where possible.
- If a field cannot be derived, set it to "" or [].
- Do NOT speculate beyond the supplied content.
- Limit each array to at most 6 items.`;
}

function heuristicFromContent(text, processed) {
  const firstLine = (text || processed[0]?.extractedText || '').split('\n').find((l) => l.trim().length > 0) || '';
  return {
    productConcept: firstLine.slice(0, 240),
    targetUsers: '',
    coreClaims: [],
    detectedFeatures: [],
    observedSurfaces: processed.length > 0 ? 'vision' : (text ? 'description-only' : null),
  };
}

/**
 * Call Anthropic's vision-enabled Messages API.  Mirrors callClaude()
 * but adds an image block to the user message.
 */
async function callClaudeVision({ mimeType, base64, prompt, maxTokens = 800 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
        { type: 'text', text: prompt },
      ],
    }],
  };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const details = await r.text().catch(() => '');
    throw new Error(`Anthropic vision ${r.status}: ${details.slice(0, 200)}`);
  }
  const data = await r.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { text, model: body.model, usage: data.usage };
}
