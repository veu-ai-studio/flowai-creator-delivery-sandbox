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

const PROXY = 'https://attached-assets-victor2081new.replit.app';

// Try the Replit proxy first (richer extraction when it's up); on any failure,
// fall back to our own /api/fetch-url. This keeps the app working even when
// the Replit instance is sleeping or down.
async function tryProxyFetch(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const response = await fetch(`${PROXY}/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: ctrl.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.title && !data.bodyText) return null;
    return {
      content: `Title: ${data.title}\nMeta: ${data.metaDescription}\nHeadings: ${data.headings?.map(h => h.text).join(' | ')}\nBody: ${data.bodyText}`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function tryVercelFetch(url) {
  try {
    const r = await fetch('/api/fetch-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await r.json();
    if (!data.ok) return { fetchFailed: true, reason: data.reason || 'Fetch failed' };
    return {
      content: `Title: ${data.title}\nMeta: ${data.metaDescription}\nHeadings: ${(data.headings || []).map(h => h.text).join(' | ')}\nBody: ${data.bodyText}`,
    };
  } catch (err) {
    return { fetchFailed: true, reason: err.message || 'Fetch failed' };
  }
}

// eslint-disable-next-line no-unused-vars
export async function fetchPageContext(input, base44) {
  if (input.type !== 'url' || !input.value?.trim()) return null;
  const url = input.value.trim();
  // 1) Replit proxy (best-effort)
  const viaProxy = await tryProxyFetch(url);
  if (viaProxy) return viaProxy;
  // 2) Our own Vercel endpoint
  return await tryVercelFetch(url);
}

// ─── PLAYWRIGHT CRAWL ─────────────────────────────────────────────────────────

export async function runCrawl(url, options = {}) {
  const isSelf = url && url.includes('truthful-flow-logic-lab.base44.app');
  try {
    const response = await fetch(`${PROXY}/crawl`, {
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
    const response = await fetch(`${PROXY}/test`, {
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

// ─── STEP PROMPT BUILDER ──────────────────────────────────────────────────────

export function buildStepPrompt(stepKey, input, multiMode = null, allInputs = null, pageContext = null, objective = null, crawlContext = null) {
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

Compile a comprehensive final assessment for this specific product across all five intelligence layers:

1. EXECUTIVE SUMMARY — 3-4 sentences about THIS product's state, referencing specific findings

2. FIVE-LAYER SCORES SUMMARY:
   [L1] Functionality Score: X/10
   [L2] Operational Score: X/10
   [L3] Financial Score: X/10
   [L4] Business Score: X/10
   [L5] GTM Score: X/10
   TOTAL: X/50

3. PRE-RENEWAL vs POST-RENEWAL COMPARISON (if renewal data available):
   Show delta per layer — what improved after Self-Renewal fixes were applied.

4. CRITICAL ISSUES — All CRITICAL severity issues with exact locations and fixes specific to this product

5. HIGH PRIORITY ISSUES — All HIGH severity issues

6. DEMO READINESS SCORE — Final score out of 50

7. CLEARANCE DECISION — CLEARED (45-50) / CONDITIONAL (30-44) / NOT CLEARED (below 30)

8. CONDITIONS (if CONDITIONAL or NOT CLEARED) — Exact list of what must be fixed, specific to this product

9. RECOMMENDED NEXT ACTIONS — Top 5 ordered actions specific to this product, one per intelligence layer

Display the CLEARANCE DECISION prominently at the top and bottom of the report.`,
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