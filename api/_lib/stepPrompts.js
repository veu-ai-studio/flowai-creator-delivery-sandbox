// Step prompt builders for the 8 Auto Runner / Guided / Manual steps.
// Each step returns plain-text output AND a JSON envelope so the UI can render
// either form, and so future Postgres storage gets structured data.

export const STEP_KEYS = [
  'research', 'design', 'build', 'qa_audit',
  'deploy', 'govern', 'gtm', 'monitor',
];

export const STEP_LABELS = {
  research:  'Research',
  design:    'Design',
  build:     'Build',
  qa_audit:  'Quality Audit',
  deploy:    'Deploy',
  govern:    'Self-Renewal',
  gtm:       'Go To Market',
  monitor:   'Monitor (Final Report)',
};

// Token budget per step. Lower = cheaper, higher = richer output.
export const STEP_TOKENS = {
  research: 1500,
  design:   1200,
  build:    1500,
  qa_audit: 1500,
  deploy:   1200,
  govern:   1500,
  gtm:      1500,
  monitor:  1800, // final report is the longest
};

// Steps that benefit from Opus reasoning. Default is Sonnet.
export const STEP_COMPLEXITY = {
  research: 'routine',
  design:   'routine',
  build:    'routine',
  qa_audit: 'routine',
  deploy:   'routine',
  govern:   'routine',
  gtm:      'routine',
  monitor:  'complex', // synthesis across all prior steps
};

const FIVE_LAYER = `Every finding must be tagged with its intelligence layer:
[L1] Functionality, [L2] Operational, [L3] Financial, [L4] Business, [L5] GTM.`;

const OBJECTIVE_LENS = (objective) => objective
  ? `Session objective: "${objective}". Tailor every finding to this objective and end each section with a one-line "Relevance to objective:" note.\n`
  : '';

// `pageBlock` is a string already produced by summarisePageForPrompt (or
// caller-supplied page content). `priorResults` is a map { stepKey: text } of
// results from earlier steps in the session — used by monitor.
export function buildStepPrompt(step, { input, pageBlock, objective, priorResults }) {
  const lens = OBJECTIVE_LENS(objective);
  const pageBody = pageBlock || `(no page content; description-only input)\n\n${input?.value || ''}`;
  const inputType = input?.type === 'description' ? 'DESCRIPTION' : 'URL';

  const base = `You are FlowAI's ${STEP_LABELS[step].toLowerCase()} engine. ${FIVE_LAYER}\n\n${lens}Input type: ${inputType}\n${pageBody}\n\n`;

  switch (step) {
    case 'research':
      return base + `Produce a structured research brief in this exact format (plain text):

PRODUCT OVERVIEW
- One sentence on what the product does (quote from page).
- Top 3 features (quote names from page).

TARGET AUDIENCE
- Primary persona, evidence quoted.

VALUE PROPOSITION
- Exact value prop as stated.

MARKET OPPORTUNITY
- Size estimate, growth signal.

COMPETITIVE LANDSCAPE
- Top 3 competitors and one specific gap each.

OPPORTUNITIES
- 3 concrete opportunities tagged [L3] or [L4] or [L5].

RISKS
- Top 3 risks each tagged with the layer they belong to.

NEXT ACTION
- One specific next step the operator should take.`;

    case 'design':
      return base + `Produce a design analysis. Format:

VISUAL DESIGN [L1]
- 2 bullets citing actual page elements.

UX QUALITY [L1][L5]
- 2 bullets on navigation, CTAs, friction.

LAYOUT [L1]
- 2 bullets.

MOBILE READINESS [L1][L2]
- 2 bullets.

CONVERSION DESIGN [L3][L5]
- 2 bullets — pricing visibility, CTA clarity.

DESIGN SCORE: X/25

TOP 3 DESIGN ISSUES
1. [issue, severity CRITICAL/HIGH/MEDIUM, fix]
2. ...
3. ...`;

    case 'build':
      return base + `Produce a build audit. Format:

ROUTE COVERAGE [L1]
- Routes that should exist; flag any likely missing.

NAVIGATION [L1]
- Quality based on links visible in headings/body.

FORMS & INTERACTIONS [L1]
- What forms/inputs are visible. Flag missing validation.

API & DATA [L2]
- Loading-state and error-state signals.

INFRASTRUCTURE SIGNALS [L2]
- CDN, framework, performance hints.

MONETIZATION IMPLEMENTATION [L3]
- Payment / subscription infra visible?

BUILD SCORE: X/25

TOP 3 BUILD ISSUES
1. [issue, severity, fix]
2. ...
3. ...`;

    case 'qa_audit':
      return base + `Score across four dimensions, plus security posture. Format:

CONTENT ACCURACY: X/25 [L1][L4]
- 2 bullets quoting page content; flag any [object Object], placeholders, broken claims.

TECHNICAL QUALITY: X/25 [L1][L2]
- 2 bullets on performance signals, error handling.

USER EXPERIENCE: X/25 [L1][L5]
- 2 bullets on usability/clarity.

COMPLIANCE: X/25 [L1][L3][L4]
- privacy policy, ToS, copyright, refund/subscription terms.

SECURITY POSTURE: X/10 [L1][L2][L4]
- robots.txt? rate-limiting signals? copyright? demo disclaimer? exposed APIs?
- Each YES = ~1.7 pts.

TOTAL: X/110

TOP 3 ISSUES
1. [issue, severity, fix]
2. ...
3. ...

VERDICT: One sentence specific to this product.`;

    case 'deploy':
      return base + `Assess deployment readiness. Format:

HTTPS & SECURITY [L1][L2]
- Cert, security headers, mixed content.

PERFORMANCE [L1][L2]
- Load signals, asset optimization.

DOMAIN CONFIGURATION [L2]
- Canonical URLs, redirects.

CRAWLABILITY [L2][L4]
- robots.txt, sitemap, SEO signals.

PUBLIC ACCESSIBILITY [L1][L5]
- Auth gates, landing quality.

FINANCIAL INFRA [L3]
- Payment gateway / subscription mgmt visible?

MONITORING [L2]
- Error tracking / uptime signals.

DEPLOY SCORE: X/50 (sum of dimensions, each 0-10 except FINANCIAL 0-5 and MONITORING 0-5)

BLOCKING ISSUES
- Specific items that must be fixed before going live.`;

    case 'govern':
      return base + `Run a Self-Renewal cycle. Format:

SELF-TEST RESULTS [L1]
- 3 simulated tests with predicted PASS/FAIL/UNKNOWN and evidence.

ISSUES DETECTED & AUTO-HEALED [L1][L2]
- 3 items with severity, heal action, outcome.

SELF-OPTIMIZE [L1][L3][L5]
- 3 specific optimizations with expected impact.

SELF-UPGRADE CANDIDATES [L4][L5]
- 2 upgrades, each with required human approval and competitive rationale.

IP & LEGAL [L3][L4]
- copyright, ToS, privacy, pricing terms — present/absent.

GOVERNANCE SCORE: X/50

HUMAN GATES REQUIRED
- Decisions needing approval before Go To Market.`;

    case 'gtm':
      return base + `Assess go-to-market readiness. Format:

DEMO READINESS SCORE: X/50 [L1][L5]

IDEAL CUSTOMER PROFILE [L5]
- Persona + sales motion (self-serve / inside / enterprise).

VALUE PROPOSITION CLARITY [L4][L5]
- Quote the value prop. Is it clear in 10 seconds?

FIRST IMPRESSION [L1][L5]
- What a prospect actually sees first 10s. Quote headlines/CTAs.

COMPETITIVE POSITIONING [L4]
- Top 3 competitors + defensible moat.

FINANCIAL SIGNALS [L3]
- Pricing clarity, business model.

CHANNELS [L5]
- Acquisition channels active or missing.

TOP 3 GTM RISKS
1. ...
2. ...
3. ...

PROSPECT OBJECTIONS
- Top 3 objections + suggested responses.

SINGLE MOST IMPORTANT FIX
- One specific thing before any prospect demo.`;

    case 'monitor': {
      const prior = priorResults && Object.keys(priorResults).length
        ? `\nPRIOR STEP OUTPUTS (truncated):\n${Object.entries(priorResults).map(([k, v]) => `--- ${k.toUpperCase()} ---\n${(v || '').slice(0, 1500)}`).join('\n\n')}\n`
        : '';
      return base + prior + `Compile the final report. Format:

EXECUTIVE SUMMARY
- 3-4 sentences referencing specific findings above.

FIVE-LAYER SCORES
[L1] X/10
[L2] X/10
[L3] X/10
[L4] X/10
[L5] X/10
TOTAL: X/50

CRITICAL ISSUES
- All CRITICAL items with locations and fixes.

HIGH PRIORITY ISSUES
- All HIGH items.

DEMO READINESS SCORE: X/50

CLEARANCE DECISION
- CLEARED (45-50) / CONDITIONAL (30-44) / NOT CLEARED (<30).
- If not CLEARED, list exact conditions to clear.

RECOMMENDED NEXT ACTIONS
- Top 5 ordered actions, one per intelligence layer where possible.`;
    }

    default:
      return base + `Produce findings relevant to step "${step}" with section headers.`;
  }
}

// Asks the model to ALSO emit a JSON envelope summarising the result.
export function buildJsonEnvelopePrompt(step, textPrompt) {
  return `${textPrompt}\n\nAFTER the plain-text section above, emit a fenced JSON block with this exact shape:

\`\`\`json
{
  "step": "${step}",
  "score": <number 0-100, or null>,
  "verdict": "<one short sentence>",
  "topIssues": [{ "title": "...", "severity": "CRITICAL|HIGH|MEDIUM|LOW", "fix": "..." }],
  "tags": ["L1","L2",...]
}
\`\`\`

The JSON block must be valid JSON. Do not add commentary after it.`;
}

// Extract the trailing JSON block (if present). Returns null if missing/invalid.
export function parseJsonEnvelope(text) {
  if (!text) return null;
  const match = text.match(/```json\s*([\s\S]*?)```/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

// Strips the JSON block from the human-readable text.
export function stripJsonEnvelope(text) {
  if (!text) return '';
  return text.replace(/```json\s*[\s\S]*?```\s*$/i, '').trim();
}
