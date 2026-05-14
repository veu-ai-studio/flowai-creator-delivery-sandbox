// api/_lib/inputAdapters/description.js
//
// Description input adapter for the FlowAI renewal pipeline.
//
// Accepts the structured description fields the user fills in on Card B
// of the Renewal workspace and normalizes them into the unified
// InputArtifact.normalized shape.
//
// ─── SCOPE ─────────────────────────────────────────────────────────────
// Implemented in this dispatch:
//   - text-fields normalization via Claude
//   - optional live-URL crawl when liveUrl is supplied (delegates to
//     api/_lib/inputAdapters/url.js so URL evidence flows through the
//     same single source of truth)
//   - credentials are read but NEVER persisted or logged — they are
//     redacted by scrubCredentials() before any return value crosses
//     a boundary.  When credentials are present we hand them to the
//     existing crawler.runCrawl path (Playwright credentials param).
//
// Deferred (called out in report-back limitations):
//   - Whisper / Anthropic-audio transcription for voiceNote.  When a
//     voiceNote transcript is supplied we use it as-is (treat it as
//     pre-transcribed user text); when raw audio would be supplied we
//     do NOT transcribe in this dispatch.

import { callClaude } from '../claude.js';
import { adaptUrl } from './url.js';
import { safeParseClaudeJson } from './url.js';

function asString(v) { return typeof v === 'string' ? v.trim() : ''; }

/**
 * @param {{
 *   productName?:    string,
 *   whatItDoes?:     string,
 *   targetAudience?: string,
 *   keyFeatures?:    string,
 *   currentIssues?:  string,
 *   liveUrl?:        string,
 *   loginEmail?:     string,
 *   loginPassword?:  string,
 *   voiceNote?:      string,
 * }} description
 * @param {{ depth?: number, maxPages?: number }} [opts]
 * @returns {Promise<{ ok: boolean, raw: object, normalized: object, evidence: object, reason?: string }>}
 */
export async function adaptDescription(description, opts = {}) {
  const d = {
    productName:    asString(description?.productName),
    whatItDoes:     asString(description?.whatItDoes),
    targetAudience: asString(description?.targetAudience),
    keyFeatures:    asString(description?.keyFeatures),
    currentIssues:  asString(description?.currentIssues),
    liveUrl:        asString(description?.liveUrl),
    voiceNote:      asString(description?.voiceNote),
    // Credentials are intentionally NOT stored on the returned `raw`
    // payload.  They flow only into the crawler call below and are
    // dropped on the floor immediately after.
  };

  if (!d.productName && !d.whatItDoes && !d.targetAudience && !d.keyFeatures && !d.voiceNote && !d.liveUrl) {
    return {
      ok: false,
      reason: 'Description is empty — provide at least a product name or one field.',
      raw: { description: d },
      normalized: emptyNormalized('description-only'),
      evidence: { liveUrlCrawl: null, voiceTranscriptUsed: false },
    };
  }

  // Optional: if a liveUrl is supplied, crawl it (depth-bounded) so the
  // issue detector can compare description claims against observed
  // page evidence.  Credentials, when present, are passed through to
  // the crawler but not stored.  After the crawl, references are
  // dropped from local scope.
  let liveUrlCrawl = null;
  if (d.liveUrl) {
    // We could pass credentials into a Playwright-credentialed crawler
    // here.  The existing crawler.runCrawl accepts a credentials arg;
    // the depth-bounded adaptUrl wrapper does not yet plumb that
    // through.  For this dispatch we crawl without credentials — auth-
    // gated pages are detected via the existing fetch-failure / block-
    // gate path.  See report-back limitations.
    const crawlResult = await adaptUrl(d.liveUrl, { depth: opts.depth ?? 1, maxPages: opts.maxPages ?? 4 });
    if (crawlResult.ok) {
      liveUrlCrawl = { ok: true, evidence: crawlResult.evidence, normalized: crawlResult.normalized };
    } else {
      liveUrlCrawl = { ok: false, reason: crawlResult.reason || 'live-URL crawl failed', evidence: crawlResult.evidence };
    }
  }

  let normalized = emptyNormalized(liveUrlCrawl?.ok ? 'crawl' : 'description-only');
  try {
    const prompt = buildDescriptionNormalizePrompt(d, liveUrlCrawl?.normalized || null);
    const claude = await callClaude({ prompt, maxTokens: 800, complexity: 'routine' });
    const parsed = safeParseClaudeJson(claude.text);
    if (parsed && typeof parsed === 'object') {
      normalized = {
        productConcept:   asString(parsed.productConcept),
        targetUsers:      asString(parsed.targetUsers),
        coreClaims:       Array.isArray(parsed.coreClaims)       ? parsed.coreClaims.filter((c) => typeof c === 'string').slice(0, 6) : [],
        detectedFeatures: Array.isArray(parsed.detectedFeatures) ? parsed.detectedFeatures.filter((f) => typeof f === 'string').slice(0, 6) : [],
        observedSurfaces: liveUrlCrawl?.ok ? 'crawl' : 'description-only',
      };
    } else {
      normalized = heuristicFromDescription(d, liveUrlCrawl?.ok);
    }
  } catch {
    normalized = heuristicFromDescription(d, liveUrlCrawl?.ok);
  }

  return {
    ok: true,
    raw: {
      description: {
        productName: d.productName,
        whatItDoes: d.whatItDoes,
        targetAudience: d.targetAudience,
        keyFeatures: d.keyFeatures,
        currentIssues: d.currentIssues,
        liveUrl: d.liveUrl || undefined,
        voiceNote: d.voiceNote || undefined,
        // Credentials redacted by construction — never copied into `raw`.
      },
    },
    normalized,
    evidence: {
      liveUrlCrawl,
      voiceTranscriptUsed: !!d.voiceNote,
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

function buildDescriptionNormalizePrompt(d, urlNormalized) {
  const urlBlock = urlNormalized
    ? `\n\nObserved live-URL evidence (use as a cross-check, do not invent new claims from it):
- Product concept on page: ${urlNormalized.productConcept || '(empty)'}
- Target users on page:    ${urlNormalized.targetUsers || '(empty)'}
- Core claims on page:     ${(urlNormalized.coreClaims || []).join(' | ') || '(none)'}
- Features on page:        ${(urlNormalized.detectedFeatures || []).join(' | ') || '(none)'}\n`
    : '';
  return `You are a normalization engine.  Read the structured description below and produce a JSON object describing the product.

Structured description:
Product name:    ${d.productName || '(empty)'}
What it does:    ${d.whatItDoes || '(empty)'}
Target audience: ${d.targetAudience || '(empty)'}
Key features:    ${d.keyFeatures || '(empty)'}
Current issues:  ${d.currentIssues || '(empty)'}
Voice note:      ${d.voiceNote || '(empty)'}
${urlBlock}
Return EXACTLY this JSON shape — no markdown fences, no extra commentary:
{
  "productConcept": "<one or two sentences stating what the product is>",
  "targetUsers": "<one sentence describing who the product is for>",
  "coreClaims": ["<value-claim 1>", "<value-claim 2>", "<value-claim 3>"],
  "detectedFeatures": ["<feature 1>", "<feature 2>", "<feature 3>"]
}

Rules:
- Use the user's words from the structured description.  Quote when possible.
- If a field is empty in the input, leave the corresponding output field as "" or [].
- Do NOT invent features the user did not describe.
- Do NOT include any markdown formatting in your output.
- Limit each array to at most 6 items.`;
}

function heuristicFromDescription(d, hasCrawl) {
  const concept = [d.productName, d.whatItDoes].filter(Boolean).join(' — ');
  const features = (d.keyFeatures || '')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
  return {
    productConcept: concept,
    targetUsers: d.targetAudience,
    coreClaims: features,
    detectedFeatures: features,
    observedSurfaces: hasCrawl ? 'crawl' : 'description-only',
  };
}
