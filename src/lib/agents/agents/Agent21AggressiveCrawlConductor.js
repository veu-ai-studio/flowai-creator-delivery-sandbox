/**
 * Agent #21 — Ops Runner Alpha — Aggressive Crawl Conductor
 * ---------------------------------------------------------------------------
 * Owner:        /src/lib/agents/agents/Agent21AggressiveCrawlConductor.js
 * Mode:         step-owner (cross-step within step 1 research + step 8 monitor)
 * Authority:    [RECOMMEND_ONLY, AUTO_WRITE_INTERNAL, REQUIRES_HUMAN_GATE]
 *               — Phase 1 graduation exercises ONLY recommend_only.
 *               The elevated authorities sit in the charter as the canonical
 *               surface for Phase 2-3 (auth-traversal + ProductSSOT writes).
 * Embedding:    Embedded (id 21 is in EMBEDDED_AGENTS per BaseAgent partition)
 * Lineage:      CANONICAL_REFERENCE §6 (Aggressive Crawling Contract),
 *               §15.1 row 21 (Aggressive Crawl Conductor charter),
 *               docs/specs/AGGRESSIVE_CRAWL_ENGINE_SPEC.md,
 *               Panel ruling 30e5edb (7/8 STAGED phased build).
 *
 * Phase 1 responsibility (this dispatch):
 *   - Take a URL + options and route through aggressiveCrawl() from
 *     api/_lib/crawler.js to obtain a multi-page CrawlReport at the
 *     canonical §6 caps (depth=8 / pages=200 default; depth=12 / pages=2000
 *     hard cap; overridable via Doppler CRAWL_DEPTH_HARD_CAP +
 *     CRAWL_MAX_PAGES_HARD_CAP).
 *   - Normalise the multi-page CrawlReport into a step-1-research-
 *     compatible page shape (preserving the API contract the existing
 *     api/research-url.js handler exposes to the UI + downstream prompt).
 *   - Auth-gated pages: mark `authGated: true` and CONTINUE the crawl —
 *     do NOT attempt login (Phase 2 spec; Phase 3 implementation).
 *   - Document single-page crawl() fallback when aggressiveCrawl returns
 *     zero pages (e.g. when BROWSERLESS_API_KEY is unset and the simple-
 *     fetch fallback fails too).
 *   - Emit 21.crawl.completed.v1 with the crawl summary (no-side-effect
 *     pub/sub signal; recommend_only conformant).
 *
 * Phase 1 NOT-YET-IMPLEMENTED (per Panel ruling 30e5edb — gated):
 *   - Auth-traversal (Phase 2 spec + Phase 3 implementation)
 *   - Click-everything pass / modal probing / AI-agent probing /
 *     error-state triggers — these are the §6 pass-2..pass-9 expansions
 *     of the spec; Phase 1 ships the BFS spider only via aggressiveCrawl
 *   - ProductSSOT writes via auto_write_internal authority
 *   - GTM Readiness Report emission (21.gtm.readiness.v1)
 *   - Cross-step Monitor integration (§8 monitor consumes 21.* topics)
 *
 * Mirroring Agent #3 Self-Renewal primary pattern: charter sourced from
 * registry via getAgent(21); constructor validates deps; recommend_only
 * plan/act emits pub/sub signal without writes. The Phase 2-3 elevation
 * (auto_write_internal + requires_human_gate) would mirror the Agent #3
 * Executor split via EXECUTOR_REGISTRY at that time.
 * ---------------------------------------------------------------------------
 */

'use strict';

import { BaseAgent, AUTHORITY } from '../BaseAgent.js';
import { getAgent } from '../_registry.js';
import { aggressiveCrawl, crawl } from '../../../../api/_lib/crawler.js';
import { conductWithAuthFlow } from '../auth/authenticatedTraversal.js';

const TOPICS = Object.freeze({
  crawlRequest: '1.crawl.request.v1',
  crawlCompleted: '21.crawl.completed.v1',
});

// Heuristic: mark a PageRecord as authGated when its bodyText is very short
// AND its title or body content suggests a login wall. Phase 1 only marks —
// does NOT attempt login. Phase 2 spec will formalize this contract.
const AUTH_WALL_RE = /\b(sign in|log in|login|signin|sign-in|log-in|please log in|authentication required|access denied)\b/i;

function isAuthGated(pageRecord) {
  if (!pageRecord || typeof pageRecord !== 'object') return false;
  const body = pageRecord.bodyText ?? '';
  const title = pageRecord.title ?? '';
  // Very short body + login keyword in title/body is the heuristic.
  if (body.length < 500 && AUTH_WALL_RE.test(`${title} ${body}`)) return true;
  return false;
}

// ── Class ────────────────────────────────────────────────────────────────────

export class Agent21AggressiveCrawlConductor extends BaseAgent {
  /** @type {21} */
  static charterId = 21;

  /**
   * BaseAgent.charter() — sourced from `_registry.ts` row 21. Phase 1
   * exercises only the recommend_only authority; the registry holds
   * the full [recommend_only, auto_write_internal, requires_human_gate]
   * triple per SSOT §15.1 row 21.
   */
  static charter() {
    const r = getAgent(21);
    if (!r) {
      throw new Error('Agent21AggressiveCrawlConductor: registry entry for id=21 missing');
    }
    return {
      id: r.id,
      name: r.name,
      flowAiOnly: false, // #21 is in EMBEDDED_AGENTS per BaseAgent.js
      authority: [...r.authority],
      requiredCredentials: [...r.requiredCredentials],
      marketplaceTools: ['playwright', 'browserless', 'anthropic-api'],
      consumes: [...r.consumes],
      produces: [...r.produces],
      escalationPolicy: r.escalationPolicy,
    };
  }

  /**
   * @param {object} deps
   * @param {object} deps.logger
   * @param {object} deps.messageBus
   * @param {object} deps.auditLog
   * @param {{ now: () => number }} deps.clock
   * @param {string} deps.productScope
   * @param {string} deps.environment
   * @param {object} [deps.hot]
   * @param {object} [deps.cold]
   */
  constructor(deps) {
    super(deps);
    if (!deps.messageBus) throw new Error('Agent21AggressiveCrawlConductor: messageBus required');
    this.bus = deps.messageBus;
    this.hot = deps.hot ?? null;
    this.cold = deps.cold ?? null;
  }

  // ── BaseAgent overrides ────────────────────────────────────────────────────

  /**
   * Plan a crawl. Phase 1 input:
   *   { kind: 'crawl.request', url, depth?, maxPages?, force? }
   *
   * Returns a recommend_only plan: `authorityNeeded: []` (Phase 1 baseline;
   * Phase 2-3 elevation would request AUTO_WRITE_INTERNAL for ProductSSOT
   * writes). sideEffects always [] in Phase 1.
   */
  async plan(ctx) {
    const input = ctx?.input;
    if (!input || input.kind !== 'crawl.request') {
      throw new Error("Agent21AggressiveCrawlConductor.plan: input.kind must be 'crawl.request'");
    }
    if (typeof input.url !== 'string' || !input.url.trim()) {
      throw new Error('Agent21AggressiveCrawlConductor.plan: input.url required');
    }
    return Object.freeze({
      summary: `aggressive crawl planned for ${input.url}`,
      authorityNeeded: [],
      sideEffects: [],
      outcome: 'crawl_planned',
      url: input.url,
      depth: input.depth ?? null,
      maxPages: input.maxPages ?? null,
      force: input.force ?? null,
    });
  }

  /**
   * Execute the crawl. Phase 1: routes through aggressiveCrawl, normalises
   * the multi-page CrawlReport, emits 21.crawl.completed.v1 (pub/sub
   * signal). No HotStore writes (Phase 2-3). No ProductSSOT writes
   * (Phase 2-3).
   */
  async act(ctx, plan) {
    if ((plan.sideEffects ?? []).length !== 0) {
      throw new Error('Agent21AggressiveCrawlConductor.act: Phase 1 recommend_only forbids sideEffects');
    }
    const url = plan.url;
    const opts = {};
    if (typeof plan.depth === 'number') opts.depth = plan.depth;
    if (typeof plan.maxPages === 'number') opts.maxPages = plan.maxPages;
    if (typeof plan.force === 'string') opts.force = plan.force;

    const report = await this.conductCrawl(url, opts);

    // Pub/sub signal — recommend_only conformant (no side effects).
    try {
      await this.bus.publish?.({
        topic: TOPICS.crawlCompleted,
        payload: {
          url,
          ok: report.ok,
          pagesCrawled: report.pagesCrawled,
          depth: report.depth,
          pageCap: report.pageCap,
          authGatedCount: report.authGatedCount ?? 0,
          fallbackUsed: report.fallbackUsed ?? false,
          durationMs: report.durationMs,
        },
        from: {
          agentId: 21,
          productScope: this.deps.productScope,
          environment: this.deps.environment,
        },
        at: this.deps.clock.now(),
      });
    } catch (e) {
      this.deps.logger?.warn?.('Agent21AggressiveCrawlConductor: bus publish failed', {
        topic: TOPICS.crawlCompleted, error: e?.message ?? String(e),
      });
    }

    return Object.freeze({
      outcome: report.ok ? 'crawl_completed' : 'crawl_failed',
      sideEffects: [],
      report,
    });
  }

  // ── Public surface ─────────────────────────────────────────────────────────

  /**
   * Conduct an aggressive crawl. Public entry point exposed for server-side
   * callers (e.g. api/research-url.js) that need the multi-page CrawlReport
   * without running through the full plan/act/audit-log cycle.
   *
   * Phase 1 behavior:
   *   1. Call aggressiveCrawl(url, opts) from crawler.js.
   *   2. If aggressiveCrawl returns ok:true AND pagesCrawled > 0, mark
   *      auth-gated pages without attempting login; return the report.
   *   3. If aggressiveCrawl returns 0 rendered pages (no Browserless,
   *      simple-fetch fallback failed, etc.), fall back to single-page
   *      crawl() so the caller still gets SOMETHING analysable.
   *   4. NEVER attempt login. Auth-traversal is Phase 2-3.
   *
   * @param {string} url
   * @param {object} [opts]
   * @returns {Promise<object>} CrawlReport-shaped envelope
   */
  async conductCrawl(url, opts = {}) {
    if (typeof url !== 'string' || !url.trim()) {
      return {
        ok: false,
        startUrl: url ?? '',
        origin: '',
        depth: 0,
        pageCap: 0,
        pagesCrawled: 0,
        pages: [],
        errors: [{ phase: 'input', url: url ?? '', reason: 'url_required' }],
        warnings: [],
        durationMs: 0,
        authGatedCount: 0,
        fallbackUsed: false,
      };
    }

    const report = await aggressiveCrawl(url, opts);

    // Phase 1: mark auth-gated pages WITHOUT attempting login.
    let authGatedCount = 0;
    if (Array.isArray(report.pages)) {
      for (const p of report.pages) {
        if (isAuthGated(p)) {
          authGatedCount += 1;
          // Mutate in place — PageRecord is not frozen at this point.
          p.authGated = true;
        }
      }
    }

    // If aggressiveCrawl produced zero rendered pages, fall back to the
    // single-page crawl() so the caller has something to work with. This
    // is documented as a Phase 1 fallback only; the production path
    // should always have Browserless configured for full §6 coverage.
    if (report.ok && report.pagesCrawled === 0) {
      try {
        const single = await crawl(url, opts.force ? { force: opts.force } : undefined);
        if (single.ok) {
          const fallbackPage = {
            url: single.url ?? url,
            normalisedUrl: single.url ?? url,
            depth: 0,
            parent: null,
            title: single.title ?? '',
            metaDescription: single.metaDescription ?? '',
            bodyText: single.bodyText ?? '',
            headings: single.headings ?? [],
            surfaces: { links: single.links ?? [], buttons: [], forms: [], images: [] },
            accessibility: {},
            timing: {},
            consoleErrors: [],
            networkErrors: [],
            method: single.method ?? 'simple-fetch',
            jsRendered: !!single.jsRendered,
            ok: true,
            warnings: single.warnings ?? [],
            authGated: isAuthGated({ title: single.title ?? '', bodyText: single.bodyText ?? '' }),
          };
          return {
            ...report,
            pages: [fallbackPage],
            pagesCrawled: 1,
            authGatedCount: fallbackPage.authGated ? 1 : 0,
            fallbackUsed: true,
            warnings: [
              ...(report.warnings ?? []),
              'aggressiveCrawl returned 0 pages; degraded to single-page crawl() fallback',
            ],
          };
        }
      } catch (e) {
        // Single-page fallback itself failed — let the original report bubble.
        report.warnings = [
          ...(report.warnings ?? []),
          `single-page fallback also failed: ${e?.message ?? String(e)}`,
        ];
      }
    }

    return {
      ...report,
      authGatedCount,
      fallbackUsed: false,
    };
  }

  /**
   * DISPATCH 28 P0-1 — auth-traversal wire-in.
   *
   * Run an unauth-first crawl, and if credentials are supplied + auth-
   * gated pages are detected, invoke the Phase 3 Executor's
   * `conductCredentialedCrawl` per gated URL to obtain post-login page
   * records. The auth flow itself (BrowserContext, login form fill,
   * MFA fail-loud, storageState in-memory, scrubArtifacts) is fully
   * delegated to the Executor per ENTRY 007 / AUTH_TRAVERSAL_SECURITY_SPEC v3.
   *
   * `opts.credentialedCrawlFn` is the wiring point — callers (typically
   * `api/agent/21/execute.js` or the Self-Renewal orchestrator) bind
   * `Executor.conductCredentialedCrawl.bind(executor)` here. Tests
   * inject a stub.
   *
   * When `opts.credentials` is absent OR `opts.credentialedCrawlFn` is
   * absent, the method falls through to plain `conductCrawl()` plus
   * an `authPass` flag describing why the auth pass was skipped — so
   * downstream observers can see the gap explicitly instead of
   * silently scoring with a partial crawl.
   *
   * @param {string} url
   * @param {object} [opts]
   * @param {object} [opts.credentials]              — { email, password } or null
   * @param {function} [opts.credentialedCrawlFn]    — Executor.conductCredentialedCrawl
   * @param {string}   [opts.runId]
   * @param {number}   [opts.depth]
   * @param {number}   [opts.maxPages]
   * @param {string}   [opts.force]
   * @returns {Promise<object>} CrawlReport-shaped envelope augmented with `authPass`
   */
  async conductCrawlWithAuth(url, opts = {}) {
    const passthroughOpts = {};
    if (typeof opts.depth === 'number') passthroughOpts.depth = opts.depth;
    if (typeof opts.maxPages === 'number') passthroughOpts.maxPages = opts.maxPages;
    if (typeof opts.force === 'string') passthroughOpts.force = opts.force;
    return conductWithAuthFlow({
      unauthCrawl: (u, o) => this.conductCrawl(u, o),
      credentialedCrawlFn: opts.credentialedCrawlFn ?? null,
      url,
      credentials: opts.credentials ?? null,
      runId: opts.runId,
      opts: passthroughOpts,
    });
  }

  /**
   * Aggregate a multi-page CrawlReport into a single-page-equivalent shape
   * that the api/research-url.js handler can pass to summarisePageForPrompt()
   * + the existing UI/test contract that expects { title, metaDescription,
   * headings, bodyText, links, warnings, method, jsRendered }.
   *
   * The root URL's PageRecord is used as the primary page. Discovered
   * internal pages are surfaced as a `discoveredPages` sidecar so the
   * caller can include their titles in the Claude prompt without breaking
   * the existing `page.*` shape.
   *
   * @param {object} report — CrawlReport from conductCrawl()
   * @returns {object} { ok, primary: <single-page shape>, discoveredPages, authGatedCount }
   */
  static normaliseToResearchShape(report) {
    if (!report || report.ok !== true || !Array.isArray(report.pages) || report.pages.length === 0) {
      return {
        ok: false,
        primary: null,
        discoveredPages: [],
        authGatedCount: 0,
        warnings: report?.warnings ?? [],
        errors: report?.errors ?? [],
      };
    }
    const primary = report.pages.find((p) => p.depth === 0 && p.ok) ?? report.pages[0];
    const discoveredPages = report.pages
      .filter((p) => p !== primary && p.ok)
      .map((p) => ({
        url: p.url,
        title: p.title,
        metaDescription: p.metaDescription,
        depth: p.depth,
        authGated: p.authGated === true,
        bodyTextSnippet: (p.bodyText ?? '').slice(0, 1500),
      }));
    return {
      ok: true,
      primary: {
        url: primary.url,
        title: primary.title,
        metaDescription: primary.metaDescription,
        headings: primary.headings ?? [],
        bodyText: primary.bodyText ?? '',
        links: primary.surfaces?.links ?? [],
        method: primary.method,
        jsRendered: !!primary.jsRendered,
        warnings: primary.warnings ?? [],
        authGated: primary.authGated === true,
      },
      discoveredPages,
      authGatedCount: report.authGatedCount ?? 0,
      fallbackUsed: report.fallbackUsed ?? false,
      pagesCrawled: report.pagesCrawled,
      depth: report.depth,
      pageCap: report.pageCap,
      durationMs: report.durationMs,
      warnings: report.warnings ?? [],
      errors: report.errors ?? [],
    };
  }
}

// Exported for tests.
export const __internals = Object.freeze({
  TOPICS,
  isAuthGated,
  AUTH_WALL_RE,
});
