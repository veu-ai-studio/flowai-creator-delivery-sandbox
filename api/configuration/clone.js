// POST /api/configuration/clone
// Body: {
//   url: string,
//   org_id?: string,
//   product_id?: string,                       // optional; if omitted we still record a product-less run
//   options?: {
//     captureScreenshot?: boolean,             // default false (Browserless screenshot endpoint)
//     architectureAnalysis?: boolean,          // default true
//     improvementPlan?: boolean,               // default true
//     async?: boolean,                         // default false; when true + Inngest is enabled, dispatch async
//   }
// }
//
// Returns:
//   {
//     ok, run_id, snapshot_id?,
//     snapshot: { url, title, metaDescription, headings, bodyTextSnippet, jsRendered, method },
//     architecture: { text, json },            // Claude's reading of the page
//     improvement_plan: { text, json },        // Prioritized improvements
//     quality_score, cost_usd, model, ...
//   }

import { setCorsHeaders } from '../_lib/claude.js';
import { resolveOrgId } from '../_lib/tenant.js';
import { crawl, summarisePageForPrompt, captureScreenshot } from '../_lib/crawler.js';
import { saveSnapshot, listObjectives } from '../_lib/configRegistry.js';
import { runStart, runClaude, runComplete, runFail, setProgress, parseFencedJson, stripFencedJson, extractQualityScore } from '../_lib/configRunner.js';
import { isInngestEnabled, sendEvent } from '../_lib/inngest.js';

const DEFAULT_ORG = 'veu-ai-studio';

export async function execute(input = {}) {
  const {
    url, product_id: productId, org_id: orgIdInput, options = {},
    _run_id: existingRunId,
  } = input;

  if (typeof url !== 'string' || !url.trim()) {
    return { ok: false, error: 'url is required (string)' };
  }

  const orgId = orgIdInput || DEFAULT_ORG;
  const opts = {
    captureScreenshot: !!options.captureScreenshot,
    architectureAnalysis: options.architectureAnalysis !== false,
    improvementPlan: options.improvementPlan !== false,
    async: !!options.async,
  };

  // Async dispatch path (when Inngest is enabled and caller opts in).
  if (opts.async && isInngestEnabled()) {
    const evt = await sendEvent('flowai/configuration.clone.requested', {
      url, orgId, productId, options: opts,
    });
    return { ok: true, async: true, ids: evt.ids,
      message: 'Clone job dispatched to Inngest. Poll /api/orchestrator/run?run_id=... for status.' };
  }

  const ctx = await runStart({
    mode: 'clone',
    orgId, productId,
    input: { url: url.trim(), options: opts },
    existingRunId,
  });

  try {
    // ─── Step 1: capture (Browserless via crawler chain) ────────────────
    setProgress(ctx, { step: 'capture', percent: 10, etaSec: 60 });
    const page = await crawl(url.trim());
    if (!page.ok) {
      throw new Error(`Capture failed: ${page.reason}`);
    }

    const snapshot = {
      url: page.url,
      title: page.title,
      metaDescription: page.metaDescription,
      headings: page.headings,
      bodyText: page.bodyText,           // full body in snapshot
      jsRendered: page.jsRendered,
      method: page.method,
      warnings: page.warnings || [],
      capturedAt: new Date().toISOString(),
    };
    // Optional screenshot pass via Browserless. Doesn't persist binary in v1
    // (no object storage yet) — records capture metadata so the report can
    // reference it.
    let screenshotMeta = null;
    if (opts.captureScreenshot) {
      setProgress(ctx, { step: 'capture_screenshot', percent: 20, etaSec: 50 });
      screenshotMeta = await captureScreenshot(url.trim(), { fullPage: true });
      snapshot.screenshot = screenshotMeta;
    }

    saveSnapshot(ctx.run.id, snapshot);
    setProgress(ctx, {
      step: 'capture_complete',
      percent: 30,
      etaSec: 35,
      partial: { snapshot: { url: snapshot.url, title: snapshot.title, jsRendered: snapshot.jsRendered, method: snapshot.method, screenshot: screenshotMeta } },
    });

    // ─── Step 2: architecture analysis ──────────────────────────────────
    const productObjectives = productId ? listObjectives({ orgId, productId }) : [];
    const objectiveLines = productObjectives.length
      ? `\nProduct-level objectives:\n${productObjectives.map((o) => `- [${o.type}] ${o.value} (weight=${o.weight})`).join('\n')}\n`
      : '';

    const pageBlock = summarisePageForPrompt(page);
    let architecture = null;
    if (opts.architectureAnalysis) {
      const archPrompt = `You are FlowAI's architecture analyst. Read the captured page below and produce a structured architecture summary.

${objectiveLines}${pageBlock}

Return TWO sections.

PART 1 — ARCHITECTURE SUMMARY (plain text, no markdown bold):

PRODUCT IDENTITY
- Quote the headline / one-line pitch from the page.

PRIMARY OBJECTIVE
- What the page is trying to get the visitor to do (sign up, buy, learn, etc.).

INFORMATION ARCHITECTURE
- 5-bullet hierarchy of the page's main sections in order.

CONTENT INVENTORY
- Visible CTAs (each as a quoted button/link label).
- Visible forms or input affordances.
- Trust signals (logos, testimonials, stats).

TECH SIGNALS
- Frontend stack hints, hosting hints, performance hints.

ACCESSIBILITY SIGNALS
- Heading hierarchy, alt-text presence, contrast indicators.

QUALITY SCORE: X/100
- A single integer 0-100. End with one-sentence justification covering completeness, clarity, and credibility.

PART 2 — MACHINE-READABLE (single fenced JSON block):

\`\`\`json
{
  "identity": { "headline": "string", "pitch": "string" },
  "primary_objective": "string",
  "ia": ["section name", "..."],
  "ctas": ["string", "..."],
  "forms": [{ "label": "string", "fields": ["string"] }],
  "trust_signals": ["string", "..."],
  "tech_signals": ["string", "..."],
  "a11y_signals": ["string", "..."],
  "quality_score": 0
}
\`\`\``;

      setProgress(ctx, { step: 'architecture_analysis', percent: 40, etaSec: 25 });
      const archClaude = await runClaude(ctx, {
        prompt: archPrompt,
        maxTokens: 1500,
        complexity: 'routine',
        callLabel: 'architecture',
      });
      architecture = {
        text: stripFencedJson(archClaude.text),
        json: parseFencedJson(archClaude.text),
        model: archClaude.model,
      };
      setProgress(ctx, {
        step: 'architecture_complete',
        percent: 60,
        etaSec: 18,
        partial: { architecture },
      });
    }

    // ─── Step 3: improvement plan ───────────────────────────────────────
    let improvementPlan = null;
    if (opts.improvementPlan) {
      const planPrompt = `You are FlowAI's product improvement engine. Given the captured page below and (if present) the architecture summary, produce a prioritized improvement plan.

${objectiveLines}${pageBlock}

${architecture?.text ? `Architecture summary from prior step:\n${architecture.text}\n\n` : ''}Return TWO sections.

PART 1 — IMPROVEMENT PLAN (plain text, no markdown bold):

EXECUTIVE SUMMARY
- 2-3 sentences covering the single biggest opportunity and the single biggest risk.

PRIORITIZED IMPROVEMENTS (max 7)
- Each line: [priority P0|P1|P2] [theme: copy|design|technical|conversion|trust|compliance] short-title — one-sentence rationale + concrete suggested change.

QUICK WINS (max 3)
- Improvements that take under 1 hour to ship.

STRUCTURAL CHANGES (max 3)
- Improvements that need design or engineering work.

QUALITY SCORE: X/100
- 0-100 integer estimating the credibility of THIS plan given the input.

PART 2 — MACHINE-READABLE (single fenced JSON block):

\`\`\`json
{
  "summary": "string",
  "improvements": [
    { "priority": "P0|P1|P2", "theme": "string", "title": "string", "rationale": "string", "change": "string" }
  ],
  "quick_wins": ["string", "..."],
  "structural": ["string", "..."],
  "quality_score": 0
}
\`\`\``;

      setProgress(ctx, { step: 'improvement_plan', percent: 70, etaSec: 12 });
      const planClaude = await runClaude(ctx, {
        prompt: planPrompt,
        maxTokens: 1800,
        complexity: 'routine',
        callLabel: 'improvement_plan',
      });
      improvementPlan = {
        text: stripFencedJson(planClaude.text),
        json: parseFencedJson(planClaude.text),
        model: planClaude.model,
      };
      setProgress(ctx, { step: 'improvement_plan_complete', percent: 90, etaSec: 3 });
    }

    // Quality score: prefer plan score, then architecture score, then extract.
    const qualityScore = improvementPlan?.json?.quality_score
      ?? architecture?.json?.quality_score
      ?? extractQualityScore(architecture?.text || improvementPlan?.text || '');

    const output = {
      url: page.url,
      snapshot: {
        ...snapshot,
        bodyText: undefined, // strip heavy field from the response shape
        bodyTextSnippet: (snapshot.bodyText || '').slice(0, 1500),
        screenshot: screenshotMeta,
      },
      architecture,
      improvement_plan: improvementPlan,
      quality_score: qualityScore,
    };

    await runComplete(ctx, { output, qualityScore });

    return {
      ok: true,
      run_id: ctx.run.id,
      mode: 'clone',
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
      error: 'clone failed',
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
  if (!result.ok && result.error === 'url is required (string)') return res.status(400).json(result);
  if (!result.ok) return res.status(500).json(result);
  return res.status(200).json(result);
}

export const config = { maxDuration: 90 };
