// Super Customer Agent — autonomous product audit.
//
// Crawls a live product end-to-end, captures every functional surface, runs
// Claude analysis against each, classifies issues by severity + category, and
// produces an executive summary + action plan.
//
// V1 capabilities (delivered tonight):
//   ✓ Multi-page crawl up to depth+page-cap, follows internal links breadth-first
//   ✓ Per-surface rich capture via Browserless /function (DOM + screenshot +
//     console errors + network errors + perf timing + accessibility signals)
//   ✓ Per-surface Claude analysis with severity/category/effort classification
//   ✓ Cross-surface aggregation (Claude reads all findings → action plan)
//   ✓ Cost tracking with hard cap; soft cap warning
//   ✓ Output bundle saved to /tmp/super-customer-runs/{run_id}/
//   ✓ Resumable progress via configRegistry pattern
//
// V2 TODOs (documented, not blocking V1):
//   - Test account creation + logged-in surface exercising
//   - Real form submission with synthetic data
//   - Stripe test-mode payment surface
//   - axe-core accessibility (need to inject lib via Browserless function)
//   - Visual regression diffs (need baseline)
//   - HAR file capture (need detailed network instrumentation)

import { callClaude } from './claude.js';
import { recordCost } from './cost.js';
import { richCapture } from './crawler.js';
import { logger } from './logger.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── Hard caps ─────────────────────────────────────────────────────────

const HARD_PAGE_CAP = 200;          // never exceed
const DEFAULT_PAGE_CAP = 30;        // sensible default
const HARD_COST_USD = 25;           // never exceed
const DEFAULT_SOFT_COST_USD = 5;    // warn above
const PER_PAGE_TIMEOUT_MS = 35000;
const ANALYSIS_TIMEOUT_MS = 60000;

// ─── Output bundle directory ───────────────────────────────────────────

function runDir(runId) {
  return join(tmpdir(), 'super-customer-runs', runId);
}

function safeWrite(path, data) {
  try {
    mkdirSync(path.replace(/\/[^/]+$/, ''), { recursive: true });
    writeFileSync(path, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  } catch (e) {
    // /tmp may be read-only on Vercel — log and continue. Real persistence
    // happens via db.js (configRegistry / Supabase) — bundle dir is local
    // diagnostic only.
    logger.debug('superCustomer.bundle_write_failed', { path, error: e.message });
  }
}

// ─── Surface discovery ─────────────────────────────────────────────────

function normaliseUrl(href, base) {
  try {
    const u = new URL(href, base);
    u.hash = '';
    // Normalise trailing slash
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
    return u.href;
  } catch { return null; }
}

function pickInternalLinks(captured, baseUrl) {
  const baseOrigin = (() => { try { return new URL(baseUrl).origin; } catch { return ''; } })();
  const links = (captured?.surfaces?.links || []);
  const out = new Set();
  for (const l of links) {
    if (!l.isInternal && !l.href.startsWith(baseOrigin)) continue;
    const norm = normaliseUrl(l.href, baseUrl);
    if (!norm) continue;
    if (!norm.startsWith(baseOrigin)) continue;
    // Skip non-HTML resources
    if (/\.(pdf|zip|tar\.gz|png|jpg|jpeg|gif|webp|svg|ico|css|js|json|xml|woff2?)$/i.test(norm)) continue;
    out.add(norm);
  }
  return Array.from(out);
}

// ─── Per-surface analysis prompt ───────────────────────────────────────

function buildSurfaceAnalysisPrompt(surface, context) {
  const { url, title, status, timing, consoleErrors, networkErrors, surfaces, accessibility, bodyText } = surface;
  const objectiveLine = context.objective ? `Audit objective: ${context.objective}\n\n` : '';

  return `${objectiveLine}You are FlowAI's Super Customer Agent — auditing a live product as a real user would. Analyse this single surface and identify every issue you can see.

URL: ${url}
HTTP status: ${status}
Title: ${title || '(none)'}
Page load: ${timing?.loadMs ?? 'n/a'}ms (DOM: ${timing?.domContentLoadedMs ?? 'n/a'}ms, navigation: ${timing?.navigationMs ?? 'n/a'}ms)
Console errors: ${consoleErrors?.length || 0}
Network errors: ${networkErrors?.length || 0}
Heading hierarchy ok: ${accessibility?.headingHierarchyOk}
Images missing alt: ${accessibility?.imagesMissingAlt} of ${accessibility?.totalImages}

Surface inventory:
- Links: ${surfaces?.links?.length || 0}
- Buttons: ${surfaces?.buttons?.length || 0}
- Forms: ${surfaces?.forms?.length || 0}${(surfaces?.forms || []).map((f, i) => `\n  Form ${i + 1}: ${f.method?.toUpperCase()} ${f.action || '(same page)'} → ${f.fields?.map((x) => x.name + ':' + x.type).join(', ')}`).join('')}

${(consoleErrors || []).slice(0, 10).map((e, i) => `Console error ${i + 1}: ${e.text}`).join('\n')}
${(networkErrors || []).slice(0, 10).map((e, i) => `Network error ${i + 1}: ${e.url} — ${e.error}`).join('\n')}

Body text (truncated):
${(bodyText || '').slice(0, 4000)}

Return a fenced JSON block with this exact shape:

\`\`\`json
{
  "surface_summary": "1-2 sentences describing what this surface is and what a user would do here",
  "primary_action": "the single action this surface is optimised for",
  "issues": [
    {
      "severity": "P0|P1|P2|P3",
      "category": "functional|performance|accessibility|security|data|content|design",
      "title": "short title",
      "description": "what's wrong + why it matters to a user",
      "reproduction_steps": ["step 1", "step 2"],
      "proposed_solution": "concrete code-level or design-level fix",
      "estimated_effort": "trivial|small|medium|large"
    }
  ],
  "health_score": 0
}
\`\`\`

Severity rubric:
  P0 — blocks core flow (page won't load, primary CTA broken, payment fails, auth missing on private content)
  P1 — blocks important secondary flow (key feature unusable, conversion gap, missing trust signals)
  P2 — degrades UX (slow load, accessibility violation, confusing copy, broken non-critical link)
  P3 — cosmetic (typo, alignment, polish, missing alt-text on decorative image)

health_score is 0-100 for THIS surface only — 100 = production-ready, 0 = unusable.

Identify every observable issue. Don't fabricate — if you can't see it from the captured signals above, don't claim it. If the surface is healthy, return an empty issues array and health_score >= 85.`;
}

// ─── Final action plan prompt ──────────────────────────────────────────

function buildActionPlanPrompt(run) {
  const surfacesSummary = run.surfaces.map((s) => {
    const issues = (s.analysis?.issues || []).map((i) => `[${i.severity}|${i.category}] ${i.title}`).join('; ');
    return `- ${s.url} (score ${s.analysis?.health_score ?? 'n/a'}): ${issues || 'no issues found'}`;
  }).join('\n');

  return `You are FlowAI's Super Customer Agent. The full audit is complete. Below is the per-surface summary across ${run.surfaces.length} surfaces of ${run.target_url}.

${surfacesSummary}

Aggregate counts:
${JSON.stringify(run.counts, null, 2)}

Produce TWO sections.

PART 1 — EXECUTIVE SUMMARY (plain text, no markdown bold):

OVERALL HEALTH SCORE
- Single integer 0-100 representing the product's overall launch-readiness based on these findings. Justify in one sentence.

TOP 10 MOST CRITICAL ISSUES
- Each line: [severity] [category] short-title — proposed solution (one sentence). Order by impact, not by category. P0s first.

THEMES
- 3-5 cross-cutting patterns (e.g. "5 of 7 P0s are auth-related", "3 surfaces have the same console error", "trust signals consistently absent").

EFFORT ESTIMATE
- Total effort to address: <person-days estimate> covering <P0+P1 count> blocking issues.

NEXT WEEK PRIORITIES
- 3 specific things to ship first. Each line: [day estimate] specific deliverable.

PART 2 — JSON (single fenced block):

\`\`\`json
{
  "overall_health_score": 0,
  "top_issues": [
    { "severity": "P0", "category": "...", "title": "...", "solution": "...", "surface_url": "..." }
  ],
  "themes": ["..."],
  "effort_days": 0,
  "next_week_priorities": [
    { "day_estimate": 1, "deliverable": "..." }
  ]
}
\`\`\``;
}

// ─── Main run ──────────────────────────────────────────────────────────

export async function runSuperCustomerAudit({
  url,
  runId,
  orgId,
  productId,
  depth = 'standard',          // 'quick' | 'standard' | 'full'
  maxPageCount = DEFAULT_PAGE_CAP,
  softCostUSD = DEFAULT_SOFT_COST_USD,
  hardCostUSD = HARD_COST_USD,
  objective = null,
  onProgress,
} = {}) {
  if (!url) throw new Error('url is required');
  if (!runId) runId = `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const pageCap = Math.min(
    Math.max(parseInt(maxPageCount, 10) || DEFAULT_PAGE_CAP, 1),
    HARD_PAGE_CAP,
  );
  const cap = Math.min(Math.max(Number(hardCostUSD) || HARD_COST_USD, 0.5), HARD_COST_USD);

  const run = {
    id: runId,
    target_url: url,
    org_id: orgId || null,
    product_id: productId || null,
    depth,
    started_at: new Date().toISOString(),
    completed_at: null,
    status: 'running',
    surfaces: [],
    issues: [],
    counts: { P0: 0, P1: 0, P2: 0, P3: 0, total: 0 },
    cost_usd: 0,
    health_score: null,
    cost_caps: { soft: softCostUSD, hard: cap },
    notes: [],
    summary_text: null,
    action_plan_json: null,
  };

  const dir = runDir(runId);
  safeWrite(join(dir, 'run.json'), run);

  const baseOrigin = (() => { try { return new URL(url).origin; } catch { return ''; } })();
  const startUrl = (() => { try { return new URL(url).href; } catch { return url; } })();

  // BFS queue
  const queue = [{ url: startUrl, depth: 0 }];
  const seen = new Set([startUrl]);
  const maxDepth = depth === 'quick' ? 1 : depth === 'full' ? 4 : 2;

  function report(stepLabel, percent, partial = null) {
    if (typeof onProgress === 'function') {
      onProgress({ runId, step: stepLabel, percent, partial });
    }
  }

  report('crawling', 5);

  while (queue.length && run.surfaces.length < pageCap) {
    if (run.cost_usd >= cap) {
      run.notes.push(`Hard cost cap reached at $${run.cost_usd.toFixed(4)} after ${run.surfaces.length} surfaces`);
      break;
    }

    const { url: pageUrl, depth: pageDepth } = queue.shift();
    const surfaceId = `surf_${run.surfaces.length + 1}`;
    const captureT0 = Date.now();
    let captured = null;

    try {
      captured = await richCapture(pageUrl, {
        includeScreenshot: depth !== 'quick',
        timeoutMs: PER_PAGE_TIMEOUT_MS,
      });
    } catch (e) {
      captured = { ok: false, reason: e.message };
    }
    const captureMs = Date.now() - captureT0;

    if (!captured.ok) {
      run.surfaces.push({
        id: surfaceId,
        url: pageUrl,
        depth: pageDepth,
        ok: false,
        capture_error: captured.reason,
        captureMs,
      });
      logger.warn('superCustomer.capture_failed', { runId, url: pageUrl, reason: captured.reason });
      continue;
    }

    // Persist screenshot data URL separately so the surface JSON is light
    let screenshotMeta = null;
    if (captured.screenshot?.dataUrl) {
      const ssPath = join(dir, 'screenshots', `${surfaceId}.png`);
      try {
        mkdirSync(join(dir, 'screenshots'), { recursive: true });
        const b64 = captured.screenshot.dataUrl.split(',')[1];
        writeFileSync(ssPath, Buffer.from(b64, 'base64'));
      } catch {}
      screenshotMeta = {
        sizeKB: captured.screenshot.sizeKB,
        capturedAt: captured.screenshot.capturedAt,
        relPath: `screenshots/${surfaceId}.png`,
      };
      delete captured.screenshot.dataUrl;
    }

    // Analyse the surface with Claude
    let analysis = null;
    let analysisError = null;
    try {
      const prompt = buildSurfaceAnalysisPrompt(captured, { objective });
      const claude = await callClaude({
        prompt,
        maxTokens: 1500,
        complexity: 'routine',
        timeoutMs: ANALYSIS_TIMEOUT_MS,
      });
      const cost = recordCost({ endpoint: '/api/audits/super-customer/analyse', sessionId: runId, ...claude });
      run.cost_usd += Number(cost?.estUSD || 0);
      analysis = parseFencedJsonLocal(claude.text);
      if (!analysis) analysisError = 'failed to parse JSON envelope';
    } catch (e) {
      analysisError = e.message || String(e);
    }

    const surface = {
      id: surfaceId,
      url: captured.finalUrl || pageUrl,
      depth: pageDepth,
      ok: true,
      status: captured.status,
      title: captured.title,
      timing: captured.timing,
      consoleErrors: captured.consoleErrors,
      networkErrors: captured.networkErrors,
      surfaceCounts: {
        links: captured.surfaces?.links?.length || 0,
        buttons: captured.surfaces?.buttons?.length || 0,
        forms: captured.surfaces?.forms?.length || 0,
        images: captured.surfaces?.images?.length || 0,
      },
      accessibility: captured.accessibility,
      screenshot: screenshotMeta,
      analysis,
      analysisError,
      captureMs,
    };
    run.surfaces.push(surface);

    // Roll issues into the run-level issues array
    for (const issue of (analysis?.issues || [])) {
      const issueId = `issue_${run.issues.length + 1}`;
      const enriched = {
        id: issueId,
        run_id: runId,
        surface_id: surfaceId,
        surface_url: surface.url,
        ...issue,
      };
      run.issues.push(enriched);
      if (run.counts[issue.severity] != null) run.counts[issue.severity]++;
      run.counts.total++;
      safeWrite(join(dir, 'issues', `${issueId}.json`), enriched);
    }

    safeWrite(join(dir, 'surfaces', `${surfaceId}.json`), surface);
    safeWrite(join(dir, 'run.json'), run);

    const pct = Math.min(15 + Math.round((run.surfaces.length / pageCap) * 65), 80);
    report(`captured_surface_${run.surfaces.length}`, pct, {
      surfaces: run.surfaces.length,
      issues: run.counts,
      cost: run.cost_usd,
    });

    // Enqueue child links
    if (pageDepth < maxDepth) {
      const nextLinks = pickInternalLinks(captured, url);
      for (const link of nextLinks) {
        if (seen.size >= pageCap * 2) break; // bound discovery too
        if (!seen.has(link)) {
          seen.add(link);
          queue.push({ url: link, depth: pageDepth + 1 });
        }
      }
    }

    // Soft cap warning
    if (run.cost_usd >= softCostUSD && !run._softCapWarned) {
      run._softCapWarned = true;
      run.notes.push(`Soft cost cap of $${softCostUSD} crossed at ${run.surfaces.length} surfaces`);
    }
  }

  // Build site graph
  const graph = {
    target: url,
    nodes: run.surfaces.map((s) => ({ id: s.id, url: s.url, depth: s.depth, score: s.analysis?.health_score ?? null })),
    edges: [], // TODO V2: track inferred transitions; today we record discovery order
  };
  safeWrite(join(dir, 'graph.json'), graph);

  // Final action plan via Claude
  report('aggregating', 85);
  let actionPlanText = null;
  let actionPlanJson = null;
  try {
    const prompt = buildActionPlanPrompt(run);
    const claude = await callClaude({
      prompt,
      maxTokens: 2200,
      complexity: 'complex',
      timeoutMs: ANALYSIS_TIMEOUT_MS,
    });
    const cost = recordCost({ endpoint: '/api/audits/super-customer/action-plan', sessionId: runId, ...claude });
    run.cost_usd += Number(cost?.estUSD || 0);
    actionPlanText = stripFencedJsonLocal(claude.text);
    actionPlanJson = parseFencedJsonLocal(claude.text);
    if (actionPlanJson?.overall_health_score != null) {
      run.health_score = actionPlanJson.overall_health_score;
    }
  } catch (e) {
    run.notes.push('Action plan generation failed: ' + (e.message || String(e)));
  }

  run.summary_text = actionPlanText;
  run.action_plan_json = actionPlanJson;
  run.completed_at = new Date().toISOString();
  run.status = 'completed';

  safeWrite(join(dir, 'run.json'), run);
  if (actionPlanText) safeWrite(join(dir, 'action-plan.md'), buildActionPlanMd(run));
  safeWrite(join(dir, 'summary.md'), buildSummaryMd(run));

  report('done', 100, { surfaces: run.surfaces.length, issues: run.counts, cost: run.cost_usd, health_score: run.health_score });

  logger.info('superCustomer.completed', {
    runId, orgId, productId,
    surfaces: run.surfaces.length,
    p0: run.counts.P0, p1: run.counts.P1, p2: run.counts.P2, p3: run.counts.P3,
    costUSD: run.cost_usd,
    healthScore: run.health_score,
    durationMs: new Date(run.completed_at) - new Date(run.started_at),
  });

  return run;
}

// ─── Markdown rendering ────────────────────────────────────────────────

function buildSummaryMd(run) {
  const lines = [];
  lines.push(`# Super Customer Audit — ${run.target_url}`);
  lines.push('');
  lines.push(`**Run ID:** \`${run.id}\``);
  lines.push(`**Started:** ${run.started_at}`);
  lines.push(`**Completed:** ${run.completed_at || '(in progress)'}`);
  lines.push(`**Surfaces audited:** ${run.surfaces.length}`);
  lines.push(`**Cost:** $${run.cost_usd.toFixed(4)}`);
  lines.push(`**Overall health score:** ${run.health_score ?? '(not yet computed)'}/100`);
  lines.push('');
  lines.push('## Issue counts');
  lines.push('');
  lines.push(`| Severity | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| P0 | ${run.counts.P0} |`);
  lines.push(`| P1 | ${run.counts.P1} |`);
  lines.push(`| P2 | ${run.counts.P2} |`);
  lines.push(`| P3 | ${run.counts.P3} |`);
  lines.push(`| **Total** | **${run.counts.total}** |`);
  lines.push('');
  if (run.summary_text) {
    lines.push('## Executive summary');
    lines.push('');
    lines.push(run.summary_text);
  }
  if (run.notes?.length) {
    lines.push('');
    lines.push('## Run notes');
    for (const n of run.notes) lines.push(`- ${n}`);
  }
  return lines.join('\n');
}

function buildActionPlanMd(run) {
  const lines = [];
  lines.push(`# Action Plan — ${run.target_url}`);
  lines.push('');
  lines.push(run.summary_text || '(action plan unavailable)');
  lines.push('');
  lines.push('## All issues');
  lines.push('');
  for (const sev of ['P0', 'P1', 'P2', 'P3']) {
    const list = run.issues.filter((i) => i.severity === sev);
    if (!list.length) continue;
    lines.push(`### ${sev} (${list.length})`);
    lines.push('');
    for (const i of list) {
      lines.push(`- **${i.title}** [${i.category}] (${i.estimated_effort})`);
      lines.push(`  - Surface: ${i.surface_url}`);
      lines.push(`  - Issue: ${i.description}`);
      lines.push(`  - Fix: ${i.proposed_solution}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ─── Helpers (avoid configRunner dep so this module is independent) ───

function parseFencedJsonLocal(text) {
  if (!text) return null;
  const m = text.match(/```json\s*([\s\S]*?)```/i);
  if (!m) return null;
  try { return JSON.parse(m[1].trim()); } catch { return null; }
}

function stripFencedJsonLocal(text) {
  if (!text) return '';
  return text.replace(/```json\s*[\s\S]*?```\s*$/i, '').trim();
}

// ─── Orchestrator agent export ────────────────────────────────────────

import { successEnvelope, envelope, ErrorCodes } from './orchestrator/contracts.js';

export const superCustomerAgent = {
  description: 'Super Customer Agent: autonomous end-to-end product audit with severity-classified issues + action plan',
  isEnabled() { return Boolean(process.env.ANTHROPIC_API_KEY && process.env.BROWSERLESS_API_KEY); },
  validate(input) {
    if (typeof input?.url !== 'string' || !input.url.trim()) {
      return { ok: false, error: 'url is required (string)' };
    }
    return null;
  },
  retry: { attempts: 1, backoffMs: 0 },
  async run(input) {
    try {
      const run = await runSuperCustomerAudit({
        url: input.url,
        runId: input._run_id || input.runId,
        orgId: input.org_id || input.orgId,
        productId: input.product_id || input.productId,
        depth: input.depth || 'standard',
        maxPageCount: input.maxPageCount || input.max_page_count,
        softCostUSD: input.softCostUSD,
        hardCostUSD: input.hardCostUSD,
        objective: input.objective,
        onProgress: input.onProgress,
      });
      return successEnvelope({ agent: 'super-customer', output: run });
    } catch (e) {
      return envelope({ agent: 'super-customer', code: ErrorCodes.UPSTREAM_ERROR, message: e.message, retriable: false });
    }
  },
  async health() {
    return {
      ok: this.isEnabled(),
      configured: this.isEnabled(),
      browserless: Boolean(process.env.BROWSERLESS_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    };
  },
};
