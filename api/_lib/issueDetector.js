// api/_lib/issueDetector.js
//
// Issue detector for the FlowAI renewal pipeline.  Accepts a populated
// InputArtifact (plus the adapter's `evidence` side-channel) and emits
// a deterministic IssueList.
//
// ─── DETECTOR SET (locked to dispatch scope) ──────────────────────────
//
// Common detectors (all three input types):
//   missing-value-proposition
//   unclear-target-users
//   missing-cta
//   missing-trust-signals
//   missing-legal
//
// URL-only detectors:
//   broken-link, missing-h1, seo-gap, ai-agent-unreachable,
//   no-content-on-page, auth-gate
//
// Description-only detectors:
//   vague-feature-list, missing-pricing-model, missing-success-metric
//
// Content-only detectors:
//   poor-readability, missing-headline-hierarchy, copy-too-long-for-format
//
// ─── ISSUE SHAPE ──────────────────────────────────────────────────────
// {
//   id:           "ISSUE-001"           // monotonic per detection run
//   severity:     "critical"|"high"|"medium"
//   category:     <one of the names above>
//   location:     <input-type-specific descriptor>
//   evidence:     <verbatim snippet from the artifact>
//   autoFixable:  boolean
//   fixSpec:      <optional renewal hint, present iff autoFixable>
// }

const CTA_VERBS = /\b(sign up|signup|get started|start free|book a demo|contact sales|buy now|subscribe|try free|join now|download|request access|create account)\b/i;
const TRUST_KEYWORDS = /\b(testimonial|review|case study|trusted by|customers say|featured in|certified|iso 27001|soc 2|gdpr|hipaa|partners?)\b/i;
const LEGAL_KEYWORDS = /\b(privacy policy|terms of (service|use)|cookie policy|legal|imprint|disclaimer|gdpr)\b/i;
const PRICING_KEYWORDS = /\$\d|\bfree\b|\bpricing\b|\bcost\b|\bsubscription\b|\bper month\b|\bper user\b|\btier\b/i;
const VAGUE_FEATURE = /\b(amazing|best in class|world.?class|cutting edge|next gen|revolutionary|streamlined|seamless|powerful|innovative)\b/i;
const SUCCESS_METRIC = /\b(\d+%|\d+x|increase|reduce|save \$|save hours|productivity|conversion|engagement|retention)\b/i;
// Words longer than 6 chars are crudely correlated with reading difficulty.
const LONG_WORD = /\b\w{7,}\b/g;

let _nextId = 1;
function resetIssueIds() { _nextId = 1; }
function mintIssueId() {
  const padded = String(_nextId++).padStart(3, '0');
  return `ISSUE-${padded}`;
}

function makeIssue({ severity, category, location, evidence, autoFixable, fixSpec }) {
  const issue = { id: mintIssueId(), severity, category, location, evidence, autoFixable: !!autoFixable };
  if (autoFixable && fixSpec) issue.fixSpec = fixSpec;
  return issue;
}

// ─── Common detectors (all input types) ───────────────────────────────

function detectCommon(artifact, _evidence) {
  const issues = [];
  const n = artifact.normalized || {};
  if (!n.productConcept || n.productConcept.length < 12) {
    issues.push(makeIssue({
      severity: 'critical',
      category: 'missing-value-proposition',
      location: 'normalized.productConcept',
      evidence: n.productConcept || '(empty)',
      autoFixable: true,
      fixSpec: { kind: 'insert', target: 'value-proposition', placement: 'hero' },
    }));
  }
  if (!n.targetUsers || n.targetUsers.length < 8) {
    issues.push(makeIssue({
      severity: 'high',
      category: 'unclear-target-users',
      location: 'normalized.targetUsers',
      evidence: n.targetUsers || '(empty)',
      autoFixable: true,
      fixSpec: { kind: 'insert', target: 'target-users-line', placement: 'hero' },
    }));
  }
  return issues;
}

function detectMissingCtaTrustLegal(artifact, evidence, inputType) {
  const issues = [];
  let corpus = '';
  if (inputType === 'url' && evidence?.pages) {
    corpus = evidence.pages.filter((p) => p.ok).map((p) => (p.bodyText || '') + ' ' + (p.headings || []).map((h) => h.text).join(' ')).join(' ').toLowerCase();
  } else if (inputType === 'description') {
    const d = artifact.raw?.description || {};
    corpus = [d.productName, d.whatItDoes, d.targetAudience, d.keyFeatures, d.currentIssues, d.voiceNote].filter(Boolean).join(' ').toLowerCase();
  } else if (inputType === 'content') {
    const c = artifact.raw?.content || {};
    corpus = [c.text, ...(c.attachments || []).map((a) => `${a.extractedText || ''} ${a.extractedVisionAnalysis || ''}`)].join(' ').toLowerCase();
  }
  if (!CTA_VERBS.test(corpus)) {
    issues.push(makeIssue({
      severity: 'high',
      category: 'missing-cta',
      location: inputType === 'url' ? 'page body' : `${inputType} corpus`,
      evidence: '(no call-to-action verb found in supplied evidence)',
      autoFixable: true,
      fixSpec: { kind: 'insert', target: 'cta-button', placement: 'hero' },
    }));
  }
  if (!TRUST_KEYWORDS.test(corpus)) {
    issues.push(makeIssue({
      severity: 'medium',
      category: 'missing-trust-signals',
      location: inputType === 'url' ? 'page body' : `${inputType} corpus`,
      evidence: '(no testimonial / certification / customer logo signal in supplied evidence)',
      autoFixable: true,
      fixSpec: { kind: 'insert', target: 'trust-row', placement: 'after-hero' },
    }));
  }
  if (!LEGAL_KEYWORDS.test(corpus)) {
    issues.push(makeIssue({
      severity: 'medium',
      category: 'missing-legal',
      location: inputType === 'url' ? 'site footer' : `${inputType} corpus`,
      evidence: '(no privacy / terms / cookie reference in supplied evidence)',
      autoFixable: true,
      fixSpec: { kind: 'insert', target: 'legal-footer', placement: 'footer' },
    }));
  }
  return issues;
}

// ─── URL-only detectors ───────────────────────────────────────────────

function detectUrlOnly(artifact, evidence) {
  const issues = [];
  const pages = (evidence?.pages || []);
  const reachable = pages.filter((p) => p.ok);
  if (reachable.length === 0) {
    issues.push(makeIssue({
      severity: 'critical',
      category: 'no-content-on-page',
      location: 'root URL',
      evidence: pages[0]?.reason || 'No pages reachable',
      autoFixable: false,
    }));
    return issues;
  }
  // broken-link: any same-origin link discovered then crawled with ok=false.
  for (const p of pages) {
    if (!p.ok) {
      issues.push(makeIssue({
        severity: 'high',
        category: 'broken-link',
        location: p.url,
        evidence: p.reason || 'unreachable',
        autoFixable: false,
      }));
    }
  }
  // missing-h1: any reachable page lacks an h1.
  for (const p of reachable) {
    const hasH1 = (p.headings || []).some((h) => h.tag === 'h1' && h.text && h.text.trim().length > 0);
    if (!hasH1) {
      issues.push(makeIssue({
        severity: 'high',
        category: 'missing-h1',
        location: p.url,
        evidence: 'No <h1> heading found on this page',
        autoFixable: true,
        fixSpec: { kind: 'insert', target: 'h1', placement: 'top-of-main', value: p.title || 'Welcome' },
      }));
    }
  }
  // seo-gap: missing meta description on the root.
  if (reachable[0] && !reachable[0].metaDescription) {
    issues.push(makeIssue({
      severity: 'medium',
      category: 'seo-gap',
      location: reachable[0].url,
      evidence: 'No <meta name="description"> tag',
      autoFixable: true,
      fixSpec: { kind: 'insert', target: 'meta-description', placement: 'head' },
    }));
  }
  // auth-gate: a reachable page whose bodyText is shorter than 200 chars and whose title hints at login.
  for (const p of reachable) {
    const t = `${p.title || ''} ${p.metaDescription || ''}`.toLowerCase();
    if ((p.bodyText || '').length < 200 && /(sign in|log in|login|access|members only)/i.test(t)) {
      issues.push(makeIssue({
        severity: 'medium',
        category: 'auth-gate',
        location: p.url,
        evidence: `Body length ${(p.bodyText || '').length} + title suggests authentication`,
        autoFixable: false,
      }));
    }
  }
  // ai-agent-unreachable: heuristic — if any heading mentions "agent" / "AI" but no body discusses it.
  const headingsBlob = reachable.flatMap((p) => (p.headings || []).map((h) => h.text)).join(' ').toLowerCase();
  const bodyBlob = reachable.map((p) => p.bodyText || '').join(' ').toLowerCase();
  if (/\b(ai agent|chat agent|copilot|assistant)\b/.test(headingsBlob) && !/\b(ai agent|chat agent|copilot|assistant)\b/.test(bodyBlob)) {
    issues.push(makeIssue({
      severity: 'medium',
      category: 'ai-agent-unreachable',
      location: 'page headings vs body',
      evidence: 'AI agent / copilot referenced in headings but absent from page body',
      autoFixable: false,
    }));
  }
  return issues;
}

// ─── Description-only detectors ───────────────────────────────────────

function detectDescriptionOnly(artifact, _evidence) {
  const issues = [];
  const d = artifact.raw?.description || {};
  if (d.keyFeatures && VAGUE_FEATURE.test(d.keyFeatures)) {
    issues.push(makeIssue({
      severity: 'medium',
      category: 'vague-feature-list',
      location: 'description.keyFeatures',
      evidence: d.keyFeatures.slice(0, 240),
      autoFixable: true,
      fixSpec: { kind: 'rewrite', target: 'feature-list', tone: 'specific-concrete' },
    }));
  }
  const corpus = [d.whatItDoes, d.keyFeatures, d.voiceNote].filter(Boolean).join(' ');
  if (!PRICING_KEYWORDS.test(corpus)) {
    issues.push(makeIssue({
      severity: 'high',
      category: 'missing-pricing-model',
      location: 'description corpus',
      evidence: '(no pricing keyword found — $, "free", "pricing", "per month", "tier")',
      autoFixable: true,
      fixSpec: { kind: 'insert', target: 'pricing-section', placement: 'after-features' },
    }));
  }
  if (!SUCCESS_METRIC.test(corpus)) {
    issues.push(makeIssue({
      severity: 'medium',
      category: 'missing-success-metric',
      location: 'description corpus',
      evidence: '(no measurable success metric found — %, x, increase/reduce, save, hours)',
      autoFixable: true,
      fixSpec: { kind: 'insert', target: 'success-metric-line', placement: 'hero' },
    }));
  }
  return issues;
}

// ─── Content-only detectors ───────────────────────────────────────────

function detectContentOnly(artifact, _evidence) {
  const issues = [];
  const c = artifact.raw?.content || {};
  const text = c.text || '';
  if (text) {
    // Simplified Flesch-Reading-Ease — proxy: average word length > 6 → < 50 score.
    const words = text.match(/\w+/g) || [];
    const longWords = text.match(LONG_WORD) || [];
    const longRatio = words.length ? longWords.length / words.length : 0;
    if (words.length > 80 && longRatio > 0.4) {
      issues.push(makeIssue({
        severity: 'medium',
        category: 'poor-readability',
        location: 'content.text',
        evidence: `Long-word ratio ${(longRatio * 100).toFixed(0)}% across ${words.length} words — proxy for Flesch < 50`,
        autoFixable: true,
        fixSpec: { kind: 'rewrite', target: 'body-copy', tone: 'plain-language' },
      }));
    }
    // missing-headline-hierarchy: no line that is short + leading + ends without punctuation.
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const headlineLike = lines.find((l) => l.length < 80 && !/[.?!]$/.test(l) && /^[A-Z]/.test(l));
    if (!headlineLike) {
      issues.push(makeIssue({
        severity: 'medium',
        category: 'missing-headline-hierarchy',
        location: 'content.text',
        evidence: '(no leading short headline-like line found)',
        autoFixable: true,
        fixSpec: { kind: 'insert', target: 'headline', placement: 'top' },
      }));
    }
    // copy-too-long-for-format: heuristic 1500-char ceiling for "marketing copy".
    if (text.length > 1500) {
      issues.push(makeIssue({
        severity: 'medium',
        category: 'copy-too-long-for-format',
        location: 'content.text',
        evidence: `${text.length} chars supplied — typical marketing-copy ceiling is ~1500`,
        autoFixable: true,
        fixSpec: { kind: 'shorten', target: 'body-copy', limitChars: 1500 },
      }));
    }
  }
  return issues;
}

/**
 * Run the full detector chain for the given artifact.
 *
 * @param {{ inputType: 'url'|'description'|'content', raw: object, normalized: object }} artifact
 * @param {object} [evidence] adapter side-channel
 * @returns {{ issues: Array }}
 */
export function detectIssues(artifact, evidence) {
  resetIssueIds();
  const issues = [];
  issues.push(...detectCommon(artifact, evidence));
  issues.push(...detectMissingCtaTrustLegal(artifact, evidence, artifact.inputType));
  if (artifact.inputType === 'url') issues.push(...detectUrlOnly(artifact, evidence));
  if (artifact.inputType === 'description') issues.push(...detectDescriptionOnly(artifact, evidence));
  if (artifact.inputType === 'content') issues.push(...detectContentOnly(artifact, evidence));
  return { issues };
}

/**
 * Score the artifact's issue list onto a 0-50 scale.  Used by the
 * before/after report.  Critical issues weigh 5 points, high 3, medium 1.
 * The score is 50 - sum(weights) clamped at 0.
 *
 * @param {{ issues: Array<{severity:string}> }} issueList
 * @returns {number}
 */
export function scoreFromIssues(issueList) {
  const weights = { critical: 5, high: 3, medium: 1 };
  let penalty = 0;
  for (const i of (issueList?.issues || [])) {
    penalty += weights[i.severity] || 0;
  }
  return Math.max(0, 50 - penalty);
}

export const __internals = Object.freeze({
  resetIssueIds,
  CTA_VERBS, TRUST_KEYWORDS, LEGAL_KEYWORDS, PRICING_KEYWORDS, VAGUE_FEATURE, SUCCESS_METRIC,
});
