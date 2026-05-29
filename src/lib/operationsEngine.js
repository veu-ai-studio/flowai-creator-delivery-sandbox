// Shared step definitions, prompts, and multi-input logic for all three operation modes

export const STEPS = [
  { key: 'research',  label: 'Research',        estimate: '~15s',  desc: 'Market analysis, product brief, audience and competitive intelligence' },
  { key: 'design',    label: 'Design',          estimate: '~20s',  desc: 'Visual design, UX, layout, mobile responsiveness analysis' },
  { key: 'build',     label: 'Build',           estimate: '~25s',  desc: 'Route coverage, navigation, broken links, form functionality' },
  { key: 'qa_audit',  label: 'Quality Audit',   estimate: '~30s',  desc: 'Four-dimension quality scoring — content, technical, UX, compliance' },
  { key: 'deploy',    label: 'Deploy',          estimate: '~20s',  desc: 'HTTPS, load time, domain config, robots.txt, public accessibility' },
  { key: 'govern',    label: 'Self-Renewal',    estimate: '~25s',  desc: 'Autonomous governance cycle — FlowAI self-tests, self-heals, self-optimizes, and self-upgrades. Human gates applied at critical decisions.' },
  { key: 'gtm',       label: 'Go To Market',    estimate: '~20s',  desc: 'Demo readiness score, GTM risks, top fix before any prospect demo. Complete with Clearance Protocol at /clearance for official launch sign-off.' },
  { key: 'monitor',   label: 'Monitor',         estimate: '~15s',  desc: 'Final report — all findings compiled into clearance decision' },
];

// ─── FIVE-LAYER INTELLIGENCE FRAMEWORK ───────────────────────────────────────
// Injected into EVERY step prompt to ensure all five layers are covered.

const FIVE_LAYER_FRAMEWORK = `
━━━ FIVE-LAYER INTELLIGENCE REQUIREMENT ━━━
Every finding section MUST cover all five intelligence layers:

LAYER 1 — FUNCTIONALITY: Does it work? What breaks? What interactions fail? What is missing?
LAYER 2 — OPERATIONAL: Infrastructure risks, reliability signals, monitoring presence, uptime indicators.
LAYER 3 — FINANCIAL: Monetization model, pricing clarity, payment processing, revenue potential, unit economics signals.
LAYER 4 — BUSINESS: Competitive positioning, top 3 competitors, defensible moat, key business risks, partnerships/integrations.
LAYER 5 — GTM: Ideal customer profile, sales motion (self-serve/inside sales/enterprise), CAC signals, active/missing channels, demo readiness score for this step.

Label each insight with [L1], [L2], [L3], [L4], or [L5] so findings are clearly layered.
━━━ END FIVE-LAYER REQUIREMENT ━━━
`;

// ─── OBJECTIVE LENSES ────────────────────────────────────────────────────────

const OBJECTIVE_LENSES = {
  audit_demo: `
OBJECTIVE LENS — PROSPECT DEMO READINESS:
You are auditing this product specifically to answer: "Is this safe to send to a potential customer right now?"
At every finding, ask: Would a prospect notice this? Would this concern a CFO in a first demo? Would this cause a prospect to disengage?
Emphasise: first impressions, value proposition clarity, embarrassing bugs, trust signals, and anything that would hurt a sales conversation.
Flag anything that would make a prospect say "this doesn't look finished" or "I'm not sure I trust this."
Every section must end with a DEMO RISK rating: SAFE / CAUTION / BLOCKER.`,

  investor_review: `
OBJECTIVE LENS — INVESTOR REVIEW PREPARATION:
You are auditing this product specifically for an investor presentation or due diligence.
At every finding, ask: What would an investor want to know? What signals traction, credibility, and market opportunity?
Emphasise: market size evidence, traction indicators, founder/team credibility signals, product defensibility, competitive moat, revenue model clarity, and any red flags that would concern a VC.
Every section must end with an INVESTOR SIGNAL rating: POSITIVE / NEUTRAL / RED FLAG.`,

  full_governance: `
OBJECTIVE LENS — FULL GOVERNANCE AND CLEARANCE CYCLE:
You are running a complete formal governance assessment. This is not a quick check — this is a clearance protocol.
At every step, apply the full governance checklist: legal compliance, security posture, data privacy, accessibility, performance SLAs, brand consistency, and operational readiness.
Every finding must be categorised: COMPLIANT / NON-COMPLIANT / REQUIRES REVIEW.
Step 8 must produce a formal CLEARANCE DECISION: CLEARED / CONDITIONAL / NOT CLEARED.`,

  compare: `
OBJECTIVE LENS — COMPARATIVE ANALYSIS:
You are analyzing this input as part of a multi-product comparison session.
At every step, produce findings that are directly comparable across inputs. Use consistent scoring scales.
Highlight differentiators — what makes this input unique vs the others. Be specific about relative strengths and weaknesses.
Every section must include a COMPARATIVE POSITION: LEADS / PARITY / LAGS (relative to the other inputs in this session).`,

  combine: `
OBJECTIVE LENS — SYNTHESIS AND COMBINATION:
You are analyzing this input to identify its best elements for combination into a unified specification.
At every step, identify: What does this input do better than typical alternatives? What specific features, copy, UX patterns, or architectural decisions should be retained in the synthesized output?
Tag each finding: INCLUDE IN SYNTHESIS / IMPROVE BEFORE INCLUDING / EXCLUDE.`,

  benchmark: `
OBJECTIVE LENS — COMPETITIVE BENCHMARKING:
You are analyzing this input against competitive benchmarks.
At every step, explicitly compare this product's quality against industry standards and best-in-class competitors.
Score relative to benchmark: ABOVE BENCHMARK / AT BENCHMARK / BELOW BENCHMARK.
Be specific about what the benchmark standard is and exactly how this product measures up.`,

  launch_readiness: `
OBJECTIVE LENS — LAUNCH READINESS CHECK:
You are auditing this product specifically to answer: "Is this ready to launch publicly right now?"
At every finding, ask: Would this cause a launch failure? Is this a legal risk? Is this a performance risk at scale?
Emphasise: production infrastructure readiness, legal compliance (privacy policy, terms, GDPR), performance under load, brand consistency, SEO readiness, and operational monitoring.
Every section must end with a LAUNCH GATE: GO / HOLD / BLOCKER.`,
};

// ─── PAGE FETCH & CRAWL ───────────────────────────────────────────────────────

// Playwright crawler proxy base URL.
// LEGACY: used to point at https://attached-assets-victor2081new.replit.app
// (a static-HTML fetcher that could not render JavaScript SPAs — returned
// null `bodyText` for any client-rendered app including FlowAI itself). It
// remains the default for runCrawl / runInteractiveTests below, which are
// not on the AutoRunner research path and can be migrated separately. For
// fetchPageContext (which IS on the research path), the implementation now
// calls FlowAI's own /api/research-url endpoint — see below.
// Override via env (Vite browser: VITE_CRAWLER_BASE_URL; Node/vitest:
// CRAWLER_BASE_URL).  See docs/ENV_VARS.md § 7.
const CRAWLER_BASE_URL = (() => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
      const v = import.meta.env.VITE_CRAWLER_BASE_URL;
      if (typeof v === 'string' && v.length > 0) return v;
    }
  } catch { /* import.meta unavailable in this runtime */ }
  if (typeof process !== 'undefined' && process.env && process.env.CRAWLER_BASE_URL) {
    return process.env.CRAWLER_BASE_URL;
  }
  return 'https://attached-assets-victor2081new.replit.app';
})();

// fetchPageContext now routes through FlowAI's own /api/research-url which
// is backed by Browserless (full JS rendering). The legacy Replit proxy
// returned null `bodyText` for any SPA (because it could only fetch raw
// HTML, not execute the client-side render that produces the visible page
// content). That null then propagated into every step prompt as the
// literal string "Body: null" and the AutoRunner pipeline showed empty
// step bodies even though all 8 steps "completed".
//
// Return contract is unchanged: { content } on success, { fetchFailed,
// reason } on failure, { authWall } when applicable. Callers in
// buildStepPrompt + buildProposalPrompt continue to work without changes.
export async function fetchPageContext(input, _base44) {
  if (input.type !== 'url' || !input.value?.trim()) return null;

  const url = input.value.trim();

  try {
    const response = await fetch('/api/research-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) {
      return { fetchFailed: true, reason: `Research API returned HTTP ${response.status}` };
    }
    const data = await response.json().catch(() => null);
    if (!data) {
      return { fetchFailed: true, reason: 'Research API returned non-JSON body' };
    }
    if (data.ok !== true) {
      // /api/research-url returns ok:false with reason on crawl failure.
      // It also surfaces block:true for content-insufficient (W2 Phase 1).
      return {
        fetchFailed: true,
        reason: typeof data.reason === 'string' ? data.reason : 'Research API returned ok:false',
        ...(data.block === true
          ? { block: true, blockReason: data.blockReason, blockSeverity: data.blockSeverity }
          : {}),
      };
    }
    const page = data.page || {};
    const title = typeof page.title === 'string' ? page.title : '';
    const meta = typeof page.metaDescription === 'string' ? page.metaDescription : '';
    const headings = Array.isArray(page.headings)
      ? page.headings.map((h) => (typeof h === 'string' ? h : (h?.text || ''))).filter(Boolean).join(' | ')
      : '';
    const body = typeof page.bodyTextSnippet === 'string' ? page.bodyTextSnippet : '';
    if (!title && !body) {
      return { fetchFailed: true, reason: 'Research API returned empty page content' };
    }
    return {
      content: `Title: ${title}\nMeta: ${meta}\nHeadings: ${headings}\nBody: ${body}`,
      ...(typeof data.analysis === 'string' && data.analysis.length > 0
        ? { analysis: data.analysis }
        : {}),
    };
  } catch (err) {
    return { fetchFailed: true, reason: err.message || 'Research API call failed' };
  }
}

// ─── PLAYWRIGHT CRAWL ─────────────────────────────────────────────────────────

export async function runCrawl(url, options = {}) {
  const isSelf = url && url.includes('truthful-flow-logic-lab.base44.app');
  try {
    const response = await fetch(`${CRAWLER_BASE_URL}/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        credentials: options.credentials || null,
        capture_screenshots: options.capture_screenshots !== false,
        find_issues: isSelf ? true : (options.find_issues !== false),
        max_pages: options.max_pages || 20,
        actions: options.actions || [],
      }),
    });
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, reason: err.message || 'Crawl failed' };
  }
}

// ─── INTERACTIVE TESTING VIA PLAYWRIGHT ──────────────────────────────────────

export async function runInteractiveTests(url, actions = []) {
  try {
    const response = await fetch(`${CRAWLER_BASE_URL}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, actions }),
    });
    if (!response.ok) throw new Error(`Test endpoint returned ${response.status}`);
    return await response.json();
  } catch (err) {
    return { error: err.message, results: [] };
  }
}

// ─── RESEARCH VIA /api/research-url (Vercel-side Browserless + Claude) ───────
// Used by AutoRunner / GuidedStep / ManualStep for the Research step on
// deployments where Base44's `Core.InvokeLLM` is not reachable (Vercel).
//
// The Vercel handler at api/research-url.js returns:
//   success: 200 { ok: true,  reachable: true,  analysis: <string>, page: {...}, ... }
//   page-fail: 200 { ok: false, reachable: false, reason, attempts, url }
//   llm-fail: 500 { ok: false, reachable: true, error, details }
//
// This helper returns:
//   { analysis: <string>, page: {...} }   — on usable success
//   { block: true, blockReason, blockSeverity }
//                                         — on page-fail when the API
//                                           returned block:true (W2 Phase 1
//                                           dispatch 4-of-4, 2026-05-14).
//                                           Caller MUST NOT fall through to
//                                           InvokeLLM in this case — the
//                                           gate halts the pipeline.
//   null                                  — on any other non-success (caller
//                                           falls through to base44 InvokeLLM)
//
// Returning null on non-block failures keeps Base44 deployments untouched:
// the helper fails fast, the caller falls through to the existing InvokeLLM
// path that already works on Base44.  The new block path is additive — only
// triggered when the API explicitly returns block:true.
export async function researchViaApi(url, objective, sessionId) {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const response = await fetch('/api/research-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url.trim(),
        objective: objective || undefined,
        sessionId: sessionId || undefined,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    if (!data) return null;
    // W2 Phase 1 — surface block:true even on ok:false so the AutoRunner
    // gate can halt the pipeline.  This bypasses the InvokeLLM fallback.
    if (data.ok !== true) {
      if (data.block === true) {
        return {
          block: true,
          blockReason: typeof data.blockReason === 'string' && data.blockReason.length > 0
            ? data.blockReason
            : (typeof data.reason === 'string' ? `Page content insufficient — ${data.reason}.` : 'Page content insufficient.'),
          blockSeverity: data.blockSeverity === 'high' ? 'high' : 'critical',
          reason: data.reason || null,
          attempts: Array.isArray(data.attempts) ? data.attempts : [],
          url: typeof data.url === 'string' ? data.url : null,
        };
      }
      return null;
    }
    if (typeof data.analysis !== 'string' || data.analysis.length === 0) return null;
    return {
      analysis: data.analysis,
      page: data.page || null,
      method: data.method || null,
      jsRendered: !!data.jsRendered,
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
      usage: data.usage || null,
      model: data.model || null,
    };
  } catch {
    return null;
  }
}

// ─── LLM INVOKE VIA /api/llm-step (Vercel-side Claude passthrough) ───────────
// Generic counterpart to researchViaApi. Used by AutoRunner / GuidedStep /
// ManualStep to execute step prompts on deployments where Base44's
// `Core.InvokeLLM` is not reachable (Vercel).
//
// /api/llm-step accepts { prompt, complexity?, maxTokens?, sessionId?, endpoint? }
// and returns { text, model, usage, stop_reason, cost } on success or
// { error, details } on failure (HTTP 5xx).
//
// This helper returns the `text` field on success, null on any non-success
// (HTTP fail, missing/empty text, JSON parse error, network error). The
// caller can then fall through to the existing `Core.InvokeLLM` path so
// Base44 deployments keep working unchanged.
//
// Note: server caps maxTokens at 2000. Pass `complexity: 'complex'` to route
// to Opus instead of Sonnet for the (rare) prompts that need it.
export async function invokeLlmViaApi(prompt, opts = {}) {
  if (typeof prompt !== 'string' || !prompt.trim()) return null;
  const {
    complexity = 'routine',
    maxTokens = 2000,
    sessionId,
    endpoint = '/api/llm-step',
  } = opts;
  try {
    const response = await fetch('/api/llm-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        complexity,
        maxTokens,
        sessionId: sessionId || undefined,
        endpoint,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    if (!data || typeof data.text !== 'string' || data.text.length === 0) return null;
    return data.text;
  } catch {
    return null;
  }
}

// ─── STEP PROMPT BUILDER ──────────────────────────────────────────────────────

export function buildStepPrompt(stepKey, input, multiMode = null, allInputs = null, pageContext = null, objective = null, crawlContext = null, priorStepResults = null) {
  const { name, value, type } = input;

  // ── Input context block ──
  let inputContext;
  if (type === 'url') {
    if (pageContext?.authWall) {
      inputContext = `URL: ${value}
PAGE FETCH RESULT: AUTHENTICATION WALL — This page requires a login to view its content. The actual page content could not be retrieved. Analysis below will be limited to publicly visible signals only (domain, URL structure, any cached/indexed content). This is a degraded analysis — the user should switch to Description input for accurate results.`;
    } else if (pageContext?.fetchFailed) {
      inputContext = `URL: ${value}
PAGE FETCH RESULT: FETCH FAILED — ${pageContext.reason}. The actual page content could not be retrieved. This analysis cannot proceed accurately without real page content.`;
    } else if (pageContext?.content) {
      inputContext = `URL: ${value}

━━━ ACTUAL PAGE CONTENT (fetched live from the real page) ━━━
${pageContext.content}
━━━ END OF FETCHED CONTENT ━━━

CRITICAL INSTRUCTION: Base EVERY finding exclusively on the fetched page content above.
- Quote specific headlines, feature names, and copy from the page
- Do NOT infer product purpose from the URL string
- Do NOT supplement with assumptions about what this type of product "usually" does
- If something is not in the fetched content, say "not found on page" — do not guess`;
    } else {
      inputContext = `URL to analyze: ${value}
NOTE: Page content could not be fetched. Findings will be limited and should be treated as preliminary only.`;
    }
  } else {
    inputContext = `PRODUCT DESCRIPTION (user-provided):\n${value}`;
  }

  // ── Multi-input context ──
  const multiContext = multiMode && allInputs
    ? `\n\nMULTI-INPUT SESSION: Mode = ${multiMode.toUpperCase()}. This is Input "${name}". All inputs: ${allInputs.map(i => `"${i.name}" (${i.type}: ${i.value})`).join(' | ')}.`
    : '';

  // ── Objective lens ──
  let objectiveLens = '';
  if (objective) {
    const matchedKey = Object.keys(OBJECTIVE_LENSES).find(k =>
      OBJECTIVE_LENSES[k] && (
        objective.toLowerCase().includes(k.replace('_', ' ')) ||
        objective.toLowerCase().includes(k)
      )
    );
    if (matchedKey) {
      objectiveLens = `\n\n${OBJECTIVE_LENSES[matchedKey]}`;
    } else {
      objectiveLens = `\n\nSESSION OBJECTIVE (user-defined): "${objective}"
Tailor ALL findings to this specific objective. At each finding, explicitly assess its relevance to this objective.
Every section should answer: "What does this mean for the stated objective?"`;
    }
  }

  // ── Per-step prompts with five-layer intelligence ──
  const basePrompts = {
    research: `You are FlowAI's research engine. Produce a comprehensive five-layer intelligence research brief.

${inputContext}${multiContext}${objectiveLens}

${FIVE_LAYER_FRAMEWORK}

Produce a structured research brief. EVERY finding must reference specific content from the page above and be tagged with its intelligence layer [L1]-[L5]:

1. PRODUCT OVERVIEW — Exact product name, core purpose (quote from page), key features (quote exact feature names)
   [L1] Functionality signals — what works, what's missing
   [L2] Operational signals — infrastructure, tech stack signals
   [L3] Financial signals — pricing model, monetization approach
   [L4] Business signals — market positioning, moat indicators
   [L5] GTM signals — ICP clarity, sales motion signals

2. TARGET AUDIENCE — Primary persona as evidenced by specific language on the page
   Quote examples from page. Assess ICP definition quality [L5].

3. VALUE PROPOSITION — The exact value prop as stated. Is it clear? Differentiated?
   [L3] Revenue potential estimate based on market and pricing
   [L4] Competitive positioning assessment

4. MARKET OPPORTUNITY — Size estimate, growth rate, trends. Top 3 competitors with strengths and gaps [L4].

5. COMPETITIVE LANDSCAPE [L4] — Top 3 direct competitors, their key strengths, and gaps this product can exploit.

6. FINANCIAL OPPORTUNITY [L3] — Estimated revenue potential, pricing tier analysis, unit economics signals.

7. GTM READINESS [L5] — Sales motion assessment, channel analysis, CAC signals, demo readiness score (0-10).

8. KEY OPPORTUNITIES — 3 specific opportunities based on actual page content and market position.

9. RISK FACTORS — Top 3 risks with mitigation suggestions across all five layers.

Format with clear section headers. Quote actual page content throughout. Be specific to THIS product.`,

    design: `You are FlowAI's design analysis engine. Analyze design and UX quality across all five intelligence layers.

${inputContext}${multiContext}${objectiveLens}

${FIVE_LAYER_FRAMEWORK}

Produce a design analysis referencing actual page content:

1. VISUAL DESIGN [L1] — Color system, typography, visual hierarchy (reference actual elements from the page)
2. UX QUALITY [L1] — Navigation clarity, CTA placement, user flow (reference actual buttons and flows)
3. LAYOUT [L1] — Information architecture, content density, whitespace
4. MOBILE RESPONSIVENESS [L1][L2] — Responsive design indicators based on page structure
5. OPERATIONAL DESIGN [L2] — Loading states, error states, performance impact of design choices
6. CONVERSION DESIGN [L3][L5] — Are CTAs optimized for revenue? Is pricing visible? Conversion funnel analysis.
7. BRAND CONSISTENCY [L4] — Brand positioning clarity, competitive visual differentiation
8. DESIGN SCORE — 0-25 with brief justification referencing specific page elements
9. TOP 3 DESIGN ISSUES — Exact issues with severity (CRITICAL/HIGH/MEDIUM) and recommended fix

Format with severity labels. Reference specific page elements by name.`,

    build: `You are FlowAI's build audit engine. Check technical implementation quality across all five intelligence layers.

${inputContext}${multiContext}${objectiveLens}
${crawlContext ? `\n${crawlContext}` : ''}
${FIVE_LAYER_FRAMEWORK}

Produce a build audit referencing actual page content:

1. ROUTE COVERAGE [L1] — Routes/pages that should exist for this specific product, flag any likely missing
2. NAVIGATION [L1] — Navigation structure quality based on actual menu/links visible on the page
3. FORM FUNCTIONALITY [L1] — Forms, inputs, validation found on the page
4. INTERACTIVE TEST RESULTS [L1] — For each key link, button, form, modal, and card found:
   - Element name/description
   - Expected behavior
   - Status: LIKELY WORKING / NEEDS VERIFICATION / LIKELY BROKEN
   - Evidence from page content
5. API & DATA [L2] — Data fetching patterns, loading states, error states visible
6. INFRASTRUCTURE SIGNALS [L2] — Tech stack indicators, CDN, hosting, performance infrastructure
7. MONETIZATION IMPLEMENTATION [L3] — Is payment/subscription infrastructure visible and functional?
8. COMPETITIVE TECH POSITIONING [L4] — How does the tech stack compare to competitors?
9. BUILD SCORE — 0-25 with justification
10. TOP 3 BUILD ISSUES — Exact issues with severity and recommended fix

Reference specific features and functionality found on the actual page.`,

    qa_audit: `You are FlowAI's QA engine. Score this product across FIVE dimensions with full five-layer analysis.

${inputContext}${multiContext}${objectiveLens}
${crawlContext ? `\n${crawlContext}` : ''}
${FIVE_LAYER_FRAMEWORK}

Score each dimension based on evidence from the actual page content and crawl data above:

1. CONTENT ACCURACY (0-25) [L1][L4] — Is content accurate, current, credible? Cite specific claims from the page.
   - Data integrity check: any [object Object] renders, placeholder text, hardcoded values?
   - Feature completeness: every feature described on the page — is it testable?

2. TECHNICAL QUALITY (0-25) [L1][L2] — Performance signals, reliability indicators, error handling.
   - Agent and engine tests: if the product has AI agents or engines, assess if they would respond correctly
   - Reference actual technical characteristics found on the page

3. USER EXPERIENCE (0-25) [L1][L5] — Usability, clarity, friction. Reference specific UX patterns from the page.
   - Demo readiness assessment: is UX polished enough for a live prospect demo?

4. COMPLIANCE READINESS (0-25) [L1][L3][L4] — Privacy policy, legal pages, GDPR. Report exact presence/absence.
   - Financial compliance: pricing transparency, refund policy, subscription terms
   - Competitive compliance: any IP or trademark issues visible?

5. SECURITY POSTURE (0-10) [L1][L2][L4] — Anti-crawling, IP protection, and content security assessment:
   - robots.txt presence: does the product have a robots.txt with appropriate Disallow directives? YES/NO
   - Rate limiting signals: are there any rate-limiting indicators in the response headers or page? YES/NO
   - Copyright notice: is there a clear copyright notice and IP protection language in the footer? YES/NO — quote exact text if present
   - Demo disclaimer: if the product appears to be a demo, is there a professional disclaimer? YES/NO — quote text if present
   - Scraping vulnerabilities: are there obvious unprotected API endpoints or exposed data structures? YES/NO
   - Headless browser blocking: any signals that bot/crawler traffic is being detected or blocked? YES/NO
   SECURITY POSTURE SCORE: X/10 (each YES = ~1.7 points)
   If score < 6: "⚠ SELF-PROTECTION INSTALLATION RECOMMENDED — See Self-Renewal Phase 2 for auto-generated fix sprint"

6. TOTAL SCORE: X/110
7. TOP 3 ISSUES: exact issue, severity (CRITICAL/HIGH/MEDIUM), recommended fix
8. SECURITY RECOMMENDATION: If Security Posture < 6, include a Self-Protection sprint flag: "Install Self-Protection Package from /capability-packages/self-protection"
9. OVERALL VERDICT: one clear sentence specific to this product`,

    deploy: `You are FlowAI's deployment readiness engine. Check production-readiness across all five intelligence layers.

${inputContext}${multiContext}${objectiveLens}

${FIVE_LAYER_FRAMEWORK}

Assess deployment readiness based on actual page signals:

1. HTTPS & SECURITY [L1][L2] — SSL, security headers, mixed content
2. PERFORMANCE [L1][L2] — Load time indicators, asset optimization, CDN signals
3. DOMAIN CONFIGURATION [L2] — Domain setup quality, canonical URLs
4. CRAWLABILITY [L2][L4] — robots.txt indicators, sitemap, SEO indexability, competitive discoverability
5. PUBLIC ACCESSIBILITY [L1][L5] — Auth gates, public landing page quality, accessibility signals
6. FINANCIAL INFRASTRUCTURE [L3] — Payment gateway signals, subscription management infrastructure
7. OPERATIONAL MONITORING [L2] — Error tracking, uptime monitoring, logging signals
8. DEPLOY READINESS SCORE — Each dimension 0-10, total 0-50
9. BLOCKING ISSUES — Specific issues that must be fixed before going live

Reference actual page characteristics throughout.`,

    govern: `You are FlowAI's self-governance engine. Run a full Self-Renewal cycle across all five intelligence layers.

${inputContext}${multiContext}${objectiveLens}

${FIVE_LAYER_FRAMEWORK}

Execute and report on the full Self-Renewal cycle for this specific product:

1. SELF-TEST RESULTS [L1] — Simulate automated tests on this product's actual features. For each major feature:
   - Test case (specific to this product)
   - Predicted outcome: PASS / FAIL / UNKNOWN
   - Evidence from page

2. ISSUES DETECTED & AUTO-HEALED [L1][L2] — Issues found that can be auto-remediated. For each:
   - Issue (specific to this product's actual content)
   - Severity
   - Heal action
   - Outcome
   IMPORTANT: If Security Posture scored below 6 in Step 4, generate the Self-Protection installation sprint here as one of the fix instructions:
   fix_type: base44_sprint, title: "Install Self-Protection Package", instruction: "Visit /capability-packages/self-protection/install and copy the sprint for [this product]. Paste into the product's Base44 project. Installs: anti-crawling bot detection, content protection CSS, IP notice footer, demo environment disclaimer."

3. SELF-OPTIMIZE [L1][L3][L5] — Optimization recommendations specific to this product's actual implementation.
   Each with: expected improvement, revenue/GTM impact

4. SELF-UPGRADE CANDIDATES [L4][L5] — Feature upgrades specific to this product. Each requires human approval.
   Include competitive context: why this upgrade closes a gap vs competitors.

5. IP & LEGAL [L3][L4] — Copyright notices, ToS, privacy policy, pricing terms — report exact presence/absence.

6. GOVERNANCE SCORE — Each dimension 0-10, total 0-50

7. HUMAN GATES REQUIRED — Decisions requiring human approval before Go To Market

All findings must be specific to this product's actual content — not generic governance boilerplate.`,

    gtm: `You are FlowAI's GTM readiness engine. Evaluate go-to-market readiness across all five intelligence layers.

${inputContext}${multiContext}${objectiveLens}

${FIVE_LAYER_FRAMEWORK}

Produce a GTM readiness assessment referencing actual page content:

1. DEMO READINESS SCORE [L1][L5] — 0-50 with exact justification per dimension, referencing specific page elements

2. IDEAL CUSTOMER PROFILE [L5] — Who is the ICP? Evidence from page copy. Sales motion: self-serve / inside sales / enterprise?

3. VALUE PROPOSITION CLARITY [L4][L5] — Is the core value prop (quote it from the page) immediately clear to a cold prospect?

4. FIRST IMPRESSION [L1][L5] — What does a prospect actually see in the first 10 seconds? Quote exact headlines and CTAs.

5. COMPETITIVE POSITIONING [L4] — Top 3 competitors and how this product is differentiated. What is the defensible moat?

6. FINANCIAL SIGNALS [L3] — Is pricing clear? Is the business model obvious? Revenue potential assessment.

7. CHANNEL ANALYSIS [L5] — What acquisition channels are active or missing? CAC signals visible on the page.

8. TOP 3 GTM RISKS — Exact risks citing specific weaknesses found on the page

9. PROSPECT OBJECTIONS — Top 3 objections based on what's missing or unclear, with suggested responses

10. DEMO PACKAGE READINESS — Can a sales rep demo this product today? What needs to be set up first?

11. SINGLE MOST IMPORTANT FIX — The one specific thing that must be fixed before any prospect demo

Every finding must reference specific content from the actual page.`,

    monitor: `You are FlowAI's final reporting engine. Compile all findings into a complete five-layer intelligence final report.

${inputContext}${multiContext}${objectiveLens}

${FIVE_LAYER_FRAMEWORK}

${(() => {
  // Defect C 2026-05-16: thread prior step findings into the Monitor
  // prompt so it CONSOLIDATES instead of RE-DERIVING. Previously each of
  // the 8 step prompts only saw the page content + the FIVE_LAYER
  // framework; Monitor had no access to the outputs of Research, Design,
  // Build, QA, Deploy, Govern, GTM and could only produce a fresh
  // analysis from page content (hence "MONITOR ≈ verbatim final report;
  // steps echo not work" on the FlowAI-on-FlowAI run). With the prior
  // results threaded in, the Monitor step is forced to summarise what
  // the pipeline actually produced rather than re-doing it.
  if (!priorStepResults || typeof priorStepResults !== 'object') return '';
  const PRIOR_STEP_ORDER = ['research', 'design', 'build', 'qa_audit', 'deploy', 'govern', 'gtm'];
  const labels = { research: 'Step 1 Research', design: 'Step 2 Design', build: 'Step 3 Build', qa_audit: 'Step 4 Quality Audit', deploy: 'Step 5 Deploy', govern: 'Step 6 Self-Renewal', gtm: 'Step 7 GTM' };
  const blocks = PRIOR_STEP_ORDER
    .map((key, idx) => {
      const r = priorStepResults[idx] || priorStepResults[key];
      const text = typeof r?.full_output === 'string' ? r.full_output : '';
      if (!text) return null;
      return `━━━ ${labels[key]} OUTPUT ━━━\n${text.slice(0, 4000)}`;
    })
    .filter(Boolean);
  if (blocks.length === 0) return '';
  return `\n━━━ PRIOR STEP FINDINGS (these are the actual outputs from this pipeline run; consolidate them — do not re-derive) ━━━\n\n${blocks.join('\n\n')}\n\n━━━ END OF PRIOR STEP FINDINGS ━━━\n`;
})()}

Compile a comprehensive final assessment for this specific product across all five intelligence layers. Where PRIOR STEP FINDINGS are provided above, SUMMARISE and CONSOLIDATE them — do not run a fresh analysis that ignores or duplicates prior step work:

1. EXECUTIVE SUMMARY — 3-4 sentences about THIS product's state, referencing specific findings

2. FIVE-LAYER SCORES SUMMARY (output EXACTLY this block, one score per line, integers only):
   [L1] Functionality Score: X/10
   [L2] Operational Score: X/10
   [L3] Financial Score: X/10
   [L4] Business Score: X/10
   [L5] GTM Score: X/10

3. PRE-RENEWAL vs POST-RENEWAL COMPARISON (if renewal data available):
   Show delta per layer — what improved after Self-Renewal fixes were applied.

4. CRITICAL ISSUES — All CRITICAL severity issues with exact locations and fixes specific to this product

5. HIGH PRIORITY ISSUES — All HIGH severity issues

6. RECOMMENDED NEXT ACTIONS — Top 5 ordered actions specific to this product, one per intelligence layer

STRICT OUTPUT RULES — these are not suggestions:
- Do NOT output a "TOTAL" line. Code sums the per-layer scores deterministically.
- Do NOT output a "DEMO READINESS SCORE" or any aggregate /50 number. Code computes it.
- Do NOT output a "CLEARANCE DECISION" or verdict (CLEARED/CONDITIONAL/NOT CLEARED). Code computes it from the sum.
- Do NOT output a "scoring note" or any text that reconciles, adjusts, or grants discretionary aggregate credit on top of the per-layer scores.
- Do NOT include band/threshold text (e.g. "45-50", "above 30"). You are evaluating, not adjudicating.
- The per-layer scores you output are the ONLY scoring authority. Code will sum and decide. Your aggregate opinion is not part of the report.`,
  };

  return basePrompts[stepKey] || basePrompts.research;
}

// ─── PROPOSAL PROMPT BUILDER ─────────────────────────────────────────────────

export function buildProposalPrompt(stepKey, input, pageContext = null, objective = null, userModification = null) {
  const stepDescriptions = {
    research:  'Step 1 Research — market, audience, competitive landscape',
    design:    'Step 2 Design — visual design, UX, layout, and responsiveness',
    build:     'Step 3 Build — routes, navigation, forms, and technical implementation',
    qa_audit:  'Step 4 Quality Audit — four-dimension quality scoring',
    deploy:    'Step 5 Deploy — production readiness, HTTPS, performance, domain',
    govern:    'Step 6 Self-Renewal — self-test, self-heal, optimize, and upgrade cycle',
    gtm:       'Step 7 Go To Market — demo readiness, GTM risks, prospect-facing quality',
    monitor:   'Step 8 Monitor — final report and clearance decision',
  };

  const inputDesc = input.type === 'url'
    ? `URL: ${input.value}${pageContext?.content ? `\n\nPage content summary:\n${pageContext.content.slice(0, 800)}` : ''}`
    : `Product description: ${input.value}`;

  const objectiveDesc = objective ? `Session objective: ${objective}` : '';
  const modNote = userModification
    ? `\n\nThe user has requested the following modification to the previous proposal:\n"${userModification}"\nIncorporate this modification into your updated proposal.`
    : '';

  return `You are FlowAI operating in Guided Mode. You are about to run ${stepDescriptions[stepKey] || stepKey}.

Before executing, you must produce a clear PROPOSAL explaining exactly what you intend to do and investigate.

${inputDesc}
${objectiveDesc}${modNote}

Produce a proposal in this EXACT format:

TOPIC:
[One sentence describing the specific focus for this step given the URL/product and objective]

QUESTIONS I WILL INVESTIGATE:
1. [Specific question 1 — directly tied to this product and objective, covering L1 Functionality]
2. [Specific question 2 — covering L2 Operational]
3. [Specific question 3 — covering L3 Financial]
4. [Specific question 4 — covering L4 Business]
5. [Specific question 5 — covering L5 GTM]

APPROACH:
[2-3 sentences describing how you will analyze this — what criteria, standards, or frameworks you will apply, and why they are appropriate for this objective. Mention the five intelligence layers.]

OUTPUT FORMAT:
[One sentence describing what the findings will look like — e.g. scored sections, a prioritized issue list, a clearance decision, etc.]

CRITICAL RULES:
- Reference the actual product/URL — not generic templates
- Questions must be specific to this product and objective
- Do not execute or produce any findings in this proposal — only propose what you will do
- Keep the entire proposal under 400 words`;
}

// ─── DETERMINISTIC CLEARANCE COMPUTATION (Defect B 2026-05-16) ───────────────
// FINAL TOTAL is summed in CODE. VERDICT is a pure function of that sum
// against SSOT-aligned bands (CANONICAL_REFERENCE §7.6 GTM Readiness:
// 90-100 Showcase-ready / 75-89 Demo-ready / 60-74 Internal-only / 0-59
// Not demo-ready, mapped onto our /50 Monitor scale by doubling).
//
// LLM authority is restricted to the per-layer scores it outputs. Any
// "scoring note", aggregate adjustment, or verbal verdict in the LLM
// output is ignored — only the parsed per-layer integers count. This
// closes the self-inflation path observed on the FlowAI-on-FlowAI run
// where the LLM table summed to 25/50 (NOT CLEARED) but a "scoring
// note" raised it to 31/50 (CONDITIONAL) to cross threshold.
//
// Bands (canonical, code-enforced):
//   CLEARED       sum 45-50 (/100: 90-100 Showcase-ready)
//   CONDITIONAL   sum 30-44 (/100: 60-89 Demo-ready or Internal-only)
//   NOT_CLEARED   sum  0-29 (/100: 0-59  Not demo-ready)
//
// Returns { layers: { L1..L5 }, sum, sumOutOf100, band, verdict, notes }
// or { error: <string> } when the LLM output is unparseable.
const LAYER_KEYS = ['L1', 'L2', 'L3', 'L4', 'L5'];

export function computeMonitorClearance(monitorText) {
  if (typeof monitorText !== 'string' || !monitorText.trim()) {
    return { error: 'empty monitor output' };
  }
  const layers = {};
  const missing = [];
  for (const key of LAYER_KEYS) {
    // Tolerate spaces, label variations ("Functionality Score" / "Score"),
    // and decimal points. Capture only the score part of "X/10".
    const re = new RegExp(`\\[${key}\\][^\\n]*?(\\d+(?:\\.\\d+)?)\\s*\\/\\s*10`, 'i');
    const m = monitorText.match(re);
    if (m) {
      const v = Math.max(0, Math.min(10, parseFloat(m[1])));
      layers[key] = Number.isFinite(v) ? v : null;
    } else {
      layers[key] = null;
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    return {
      error: `missing layer scores: ${missing.join(', ')}`,
      layers,
      sum: null,
      sumOutOf100: null,
      band: null,
      verdict: 'NOT CLEARED',
      reason: 'incomplete scoring data — defaults to NOT CLEARED per SSOT §11 Step 5 (blocks on incomplete report)',
    };
  }
  // Deterministic sum — no LLM input beyond the 5 parsed integers.
  const sum = LAYER_KEYS.reduce((acc, k) => acc + (layers[k] || 0), 0);
  const sumOutOf100 = Math.round(sum * 2);
  let band, verdict;
  if (sum >= 45) { band = 'showcase-ready';   verdict = 'CLEARED';     }
  else if (sum >= 30) { band = sum >= 38 ? 'demo-ready' : 'internal-only'; verdict = 'CONDITIONAL'; }
  else                { band = 'not-demo-ready'; verdict = 'NOT CLEARED'; }
  return { layers, sum, sumOutOf100, band, verdict };
}

// Format the deterministic clearance result as an appendable footer block
// that the AutoRunner adds to the LLM's monitor output. This is the
// AUTHORITATIVE verdict displayed to the user — replaces any verdict the
// LLM may have tried to slip in despite the strict output rules.
export function formatMonitorClearanceFooter(result) {
  if (!result || result.error) {
    return [
      '',
      '━━━ CLEARANCE DECISION (code-computed) ━━━',
      `VERDICT: NOT CLEARED`,
      `REASON: ${result?.error || 'no monitor output to score'} — defaults to NOT CLEARED per SSOT §11 Step 5.`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');
  }
  const { layers, sum, sumOutOf100, band, verdict } = result;
  const layerLine = LAYER_KEYS.map((k) => `${k}=${layers[k]}`).join(' · ');
  return [
    '',
    '━━━ CLEARANCE DECISION (code-computed, deterministic) ━━━',
    `LAYERS:  ${layerLine}`,
    `SUM:     ${sum} / 50   (= ${sumOutOf100} / 100)`,
    `BAND:    ${band}   (SSOT §7.6 GTM Readiness)`,
    `VERDICT: ${verdict}`,
    'Authority: per-layer scores from the LLM; sum + verdict from code.',
    'Any "scoring note", aggregate adjustment, or LLM-issued verdict elsewhere in this report is non-authoritative and ignored.',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');
}

// ─── MULTI-INPUT FINAL REPORT ─────────────────────────────────────────────────

export function buildFinalReportPrompt(multiMode, inputs, allStepResults) {
  const inputSummaries = inputs.map((inp, idx) => {
    const results = allStepResults[idx];
    const summary = Object.entries(results || {}).map(([step, r]) =>
      `  ${step.toUpperCase()}: ${(r?.full_output || '').slice(0, 400)}`
    ).join('\n');
    return `INPUT "${inp.name}" (${inp.type}: ${inp.value}):\n${summary}`;
  }).join('\n\n---\n\n');

  if (multiMode === 'compare') {
    return `You are FlowAI's comparative analysis engine. Produce a head-to-head scorecard across all five intelligence layers.

All input analysis results:
${inputSummaries}

Produce a COMPARISON REPORT:
1. HEAD-TO-HEAD SCORECARD — For each of the 8 steps, declare a winner per dimension with exact scores
2. FIVE-LAYER COMPARISON — Score each input across L1-L5 layers and declare winner per layer
3. OVERALL WINNER — Which input is stronger overall, with justification
4. TOP 3 DIFFERENTIATORS — The 3 most important differences between the inputs
5. EACH INPUT'S STRONGEST POINT — One sentence per input on their single best quality
6. EACH INPUT'S CRITICAL WEAKNESS — One sentence per input on their most critical gap
7. RECOMMENDATION — Which input to prioritize and why

Format as a clean scorecard with clear winner declarations.`;
  }

  if (multiMode === 'combine') {
    return `You are FlowAI's synthesis engine. Produce a unified specification from all inputs.

All input analysis results:
${inputSummaries}

Produce a COMBINATION REPORT — a unified specification:
1. UNIFIED PRODUCT BRIEF — A single coherent product description synthesizing the best of all inputs
2. FEATURE SYNTHESIS — For each major feature area, which input's approach was selected and why
3. ARCHITECTURE SYNTHESIS — Unified recommended architecture drawing from all inputs
4. BRAND & POSITIONING SYNTHESIS — Unified positioning statement
5. COMPLETE UNIFIED SPECIFICATION — A copy-paste ready brief for building the synthesized product
6. ATTRIBUTION MAP — Table showing which input contributed what element and why

Format as a complete unified brief ready to hand to a developer.`;
  }

  if (multiMode === 'benchmark') {
    return `You are FlowAI's competitive benchmarking engine. Score the primary product against benchmarks.

All input analysis results (first input is PRIMARY, others are BENCHMARKS):
${inputSummaries}

Produce a BENCHMARK REPORT:
1. PRIMARY PRODUCT SCORECARD — Scores across all 8 step dimensions and all 5 intelligence layers
2. BENCHMARK COMPARISON TABLE — For each dimension, primary vs each benchmark with delta
3. WHERE PRIMARY LEADS — Dimensions where primary outperforms all benchmarks
4. WHERE PRIMARY LAGS — Dimensions where primary is behind any benchmark
5. CRITICAL GAPS — Top 5 gaps that must close for primary to lead in every dimension
6. COMPETITIVE POSITIONING STATEMENT — One paragraph positioning the primary product
7. PRIORITY IMPROVEMENT ROADMAP — Ordered list of improvements to close benchmark gaps

Format as a professional competitive analysis report.`;
  }

  return '';
}