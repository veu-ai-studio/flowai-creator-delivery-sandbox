// POST /api/research-url
// Body: { url: string, objective?: string, force?: 'browserless'|'playwright-endpoint'|'simple-fetch' }
//
// Phase 1 Master Phased Build (SSOT §6, Panel ruling 30e5edb):
// Routes through Agent #21 Aggressive Crawl Conductor → aggressiveCrawl()
// (multi-page, §6 depth=8/cap12 + pages=200/cap2000). The pre-Phase-1
// implementation called single-page crawl() directly. Phase 1 keeps
// single-page crawl() as a documented fallback only (via the Conductor's
// own internal fallback when aggressiveCrawl returns zero rendered pages).
//
// The response shape is unchanged for backwards compatibility with the UI
// + existing tests. New fields (`discoveredPages`, `authGatedCount`,
// `pagesCrawled`, etc.) are ADDITIVE.
//
// Phase 1 does NOT include auth-traversal — auth-gated pages are marked
// `authGated: true` but no login is attempted. Phase 2-3 (gated) will add
// authenticated traversal per AUTH_TRAVERSAL_SECURITY_SPEC.md.

import { setCorsHeaders, callClaude } from './_lib/claude.js';
import { crawl, summarisePageForPrompt } from './_lib/crawler.js';
import { recordCost } from './_lib/cost.js';
import { requireAuthHard } from './_lib/auth.js';
import { Agent21AggressiveCrawlConductor } from '../src/lib/agents/agents/Agent21AggressiveCrawlConductor.js';
import { getServerMessageBus } from './_lib/messageBus.js';

// Build a minimal Agent #21 Conductor instance for the handler. Memory-
// only stores are sufficient — Phase 1 emits a pub/sub signal but does
// NOT persist crawl state (Phase 2-3 will when ProductSSOT writes graduate).
function buildAgent21Conductor() {
  const clock = { now: () => Date.now() };
  const messageBus = getServerMessageBus();
  const auditLog = { write: async () => {} };
  const logger = {
    info: (...a) => console.log('[agent21-conductor]', ...a),
    warn: (...a) => console.warn('[agent21-conductor]', ...a),
    error: (...a) => console.error('[agent21-conductor]', ...a),
  };
  return new Agent21AggressiveCrawlConductor({
    logger, messageBus, auditLog, clock,
    productScope: 'flowai',
    environment: process.env.NODE_ENV === 'production' ? 'prd' : 'staging',
  });
}

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

  // Phase 1: route through Agent #21 → aggressiveCrawl. The Conductor's
  // conductCrawl() falls back to single-page crawl() internally when
  // aggressiveCrawl returns 0 pages, so the response always has SOMETHING
  // to analyse (or surfaces the failure honestly via block:true).
  const conductor = buildAgent21Conductor();
  const report = await conductor.conductCrawl(url, force ? { force } : {});
  const normalised = Agent21AggressiveCrawlConductor.normaliseToResearchShape(report);
  // Map back to the original `page` shape so the rest of the handler
  // logic + summarisePageForPrompt + UI/test contracts are unchanged.
  const page = normalised.ok && normalised.primary
    ? {
        ok: true,
        url: normalised.primary.url,
        method: normalised.primary.method,
        jsRendered: normalised.primary.jsRendered,
        title: normalised.primary.title,
        metaDescription: normalised.primary.metaDescription,
        headings: normalised.primary.headings,
        bodyText: normalised.primary.bodyText,
        links: normalised.primary.links,
        warnings: normalised.primary.warnings ?? [],
      }
    : {
        ok: false,
        url,
        reason:
          (normalised.errors && normalised.errors[0]
            ? `${normalised.errors[0].phase}: ${normalised.errors[0].reason}`
            : null) ||
          (normalised.warnings && normalised.warnings[0]) ||
          'aggressiveCrawl returned no rendered pages and single-page fallback also failed',
        attempts: normalised.errors ?? [],
      };

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
        // Defect A 2026-05-16 (W2 territory — NOT modified by Phase 1):
        // caps raised so callers (UI display + fetchPageContext baked
        // into every step prompt) see the full rendered DOM instead of
        // a 1500-char prefix that was making the pipeline score on
        // partial content. Field still named bodyTextSnippet for
        // backwards compatibility with the UI/test contract — the
        // only change is the cap. Phase 1 preserves this exactly.
        headings: (page.headings || []).slice(0, 60),
        bodyTextSnippet: (page.bodyText || '').slice(0, 50000),
      },
      // Phase 1 ADDITIVE FIELDS — multi-page crawl summary surfaced for
      // downstream Auto Runner consumers. UI + existing tests reading
      // only `page.*` are unaffected.
      crawlSummary: {
        pagesCrawled: normalised.pagesCrawled ?? 1,
        depth: normalised.depth ?? 0,
        pageCap: normalised.pageCap ?? null,
        authGatedCount: normalised.authGatedCount ?? 0,
        fallbackUsed: normalised.fallbackUsed ?? false,
        durationMs: normalised.durationMs ?? 0,
        discoveredPages: normalised.discoveredPages ?? [],
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
