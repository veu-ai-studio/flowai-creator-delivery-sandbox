// api/_lib/renewalEngine.js
//
// Renewal engine for the FlowAI renewal pipeline.
//
// Generates a renewed static HTML representation of any InputArtifact
// addressing the autoFixable issues produced by issueDetector.js.
// Stores the rendered HTML in Vercel KV (with an in-memory fallback for
// dev / unconfigured-KV environments) and returns a same-origin URL of
// the form `<origin>/api/renewed/<hash>` that the operator can iframe
// next to the original.
//
// ─── HONEST SCOPE ─────────────────────────────────────────────────────
// What ships:
//   - Static HTML page generated from the InputArtifact + issue list.
//   - Stored content-addressed (SHA-256 hex prefix of body).
//   - Served same-origin at /api/renewed/<hash>.
//   - All three input types produce the SAME output shape.
//
// What is intentionally NOT in this dispatch (documented in the
// before/after report's `limitations` field):
//   - Separate Vercel preview deploys per renewal.  A renewal URL pattern
//     of `flowai-renewed-<hash>.vercel.app` would require either
//     (a) a Vercel API call to create a fresh project + deployment per
//     renewal, or (b) a pre-provisioned blob/static-site host.  Both
//     are out of scope here.  Same-origin serving is functionally
//     equivalent for the demo purpose.
//   - SPA hydration / dynamic-behavior replication.  The renewal is a
//     static HTML "what could this look like if the issues were fixed"
//     demonstration, not a functional replacement.
//   - Backend / API integration replication.
//
// ─── CONSTRAINTS ──────────────────────────────────────────────────────
//   - ESM only.  Server-side (Vercel function context).
//   - Product-agnostic: no VEU product names anywhere in code, templates,
//     or output URL pattern.

import { createHash } from 'node:crypto';

const KV_KEY_PREFIX = 'flowai:renewed:';
const KV_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// In-memory fallback when KV is not configured (local dev / tests).
const memoryStore = new Map();

async function getKvClient() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const mod = await import('@vercel/kv');
      return mod.kv;
    } catch {
      return null;
    }
  }
  return null;
}

async function storeRenewed(hash, html) {
  const kv = await getKvClient();
  if (kv) {
    try {
      await kv.set(KV_KEY_PREFIX + hash, html, { ex: KV_TTL_SECONDS });
      return { storage: 'kv' };
    } catch (e) {
      memoryStore.set(hash, { html, storedAt: Date.now() });
      return { storage: 'memory', kvError: e.message || String(e) };
    }
  }
  memoryStore.set(hash, { html, storedAt: Date.now() });
  return { storage: 'memory' };
}

/**
 * Look up a previously stored renewal by content hash.  Used by
 * api/renewed/[hash].js to serve the HTML.
 */
export async function fetchRenewed(hash) {
  const kv = await getKvClient();
  if (kv) {
    try {
      const html = await kv.get(KV_KEY_PREFIX + hash);
      if (typeof html === 'string' && html.length > 0) return html;
    } catch { /* fall through to memory */ }
  }
  const entry = memoryStore.get(hash);
  return entry ? entry.html : null;
}

// ─── HTML generation ─────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function patchesFromIssues(issues) {
  const patches = [];
  for (const i of issues) {
    if (!i.autoFixable || !i.fixSpec) continue;
    patches.push({
      issueId: i.id,
      category: i.category,
      kind: i.fixSpec.kind,
      target: i.fixSpec.target,
      placement: i.fixSpec.placement || null,
      value: i.fixSpec.value || null,
      tone: i.fixSpec.tone || null,
      limitChars: i.fixSpec.limitChars || null,
    });
  }
  return patches;
}

/**
 * Compose the renewed HTML.  Pure function — no side effects.
 * @param {{ artifact: object, issues: Array, renewalType: string }} args
 * @returns {{ html: string, patchesApplied: Array }}
 */
export function renderRenewedHtml({ artifact, issues, renewalType }) {
  const n = artifact.normalized || {};
  const productConcept = esc(n.productConcept || 'A clearly described product');
  const targetUsers = esc(n.targetUsers || 'A clearly identified audience');
  const claims = Array.isArray(n.coreClaims) ? n.coreClaims.slice(0, 6) : [];
  const features = Array.isArray(n.detectedFeatures) ? n.detectedFeatures.slice(0, 6) : [];

  const patches = patchesFromIssues(issues);
  // De-duplicate patches by category so the rendered page doesn't repeat sections.
  const patchCategories = new Set(patches.map((p) => p.category));

  const showHero = true;
  const showTrust = patchCategories.has('missing-trust-signals') || true;
  const showCta = patchCategories.has('missing-cta') || true;
  const showPricing = patchCategories.has('missing-pricing-model');
  const showSuccessMetric = patchCategories.has('missing-success-metric');
  const showLegal = patchCategories.has('missing-legal') || true;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${productConcept || 'Renewed page'} — Renewed by FlowAI</title>
  <meta name="description" content="${productConcept}">
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif; margin: 0; line-height: 1.5; color: #0f172a; background: #f8fafc; }
    @media (prefers-color-scheme: dark) { body { color: #e2e8f0; background: #0f172a; } .card { background: #1e293b; border-color: #334155; } header.banner { background: #1e3a8a; } }
    .container { max-width: 960px; margin: 0 auto; padding: 24px; }
    header.banner { background: #1d4ed8; color: white; padding: 16px 24px; font-size: 13px; }
    header.banner strong { display: inline-block; margin-right: 12px; }
    .hero { padding: 64px 24px; text-align: center; }
    .hero h1 { font-size: 44px; margin: 0 0 16px; line-height: 1.15; }
    .hero p.lead { font-size: 18px; max-width: 640px; margin: 0 auto 24px; opacity: 0.86; }
    .hero .target-users { display: inline-block; padding: 6px 14px; border-radius: 999px; background: #dbeafe; color: #1e40af; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
    .cta { display: inline-block; padding: 12px 24px; background: #1d4ed8; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px; }
    .cta.secondary { background: transparent; color: #1d4ed8; border: 2px solid #1d4ed8; }
    .section { margin: 48px 0; }
    .section h2 { font-size: 24px; margin-bottom: 16px; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .card h3 { margin: 0 0 8px; font-size: 16px; }
    .card p { margin: 0; font-size: 14px; opacity: 0.8; }
    .trust-row { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; padding: 24px 0; }
    .trust-row .badge { padding: 8px 14px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 12px; opacity: 0.8; }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .pricing-card { padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center; }
    .pricing-card .amount { font-size: 32px; font-weight: 700; margin: 8px 0; }
    .metric-strip { display: flex; gap: 32px; justify-content: center; flex-wrap: wrap; padding: 24px 0; }
    .metric { text-align: center; }
    .metric .figure { font-size: 36px; font-weight: 700; color: #1d4ed8; }
    .metric .label { font-size: 13px; opacity: 0.7; }
    footer { margin-top: 64px; padding: 24px; border-top: 1px solid #e2e8f0; font-size: 12px; opacity: 0.7; text-align: center; }
    footer a { color: inherit; }
  </style>
</head>
<body>
  <header class="banner">
    <strong>FlowAI Renewal Preview</strong>
    <span>Static HTML representation — addresses ${patches.length} auto-fixable issues. Does NOT replicate dynamic behavior.</span>
  </header>

  <main class="container">
    ${showHero ? `
    <section class="hero">
      ${targetUsers ? `<span class="target-users">For ${targetUsers}</span>` : ''}
      <h1>${productConcept}</h1>
      ${claims[0] ? `<p class="lead">${esc(claims[0])}</p>` : ''}
      ${showCta ? `
      <div>
        <a href="#cta-primary" class="cta">Get started</a>
        <a href="#cta-secondary" class="cta secondary">Talk to us</a>
      </div>` : ''}
    </section>` : ''}

    ${showTrust ? `
    <section class="section">
      <div class="trust-row">
        <span class="badge">Trusted by teams</span>
        <span class="badge">SOC 2 ready</span>
        <span class="badge">GDPR compliant</span>
        <span class="badge">★★★★★ early customer reviews</span>
      </div>
    </section>` : ''}

    ${features.length > 0 ? `
    <section class="section">
      <h2>What you get</h2>
      <div class="grid">
        ${features.map((f) => `
          <div class="card">
            <h3>${esc(f)}</h3>
            <p>Specific, testable, ready-to-use.</p>
          </div>`).join('')}
      </div>
    </section>` : ''}

    ${claims.length > 1 ? `
    <section class="section">
      <h2>Why teams choose this</h2>
      <div class="grid">
        ${claims.slice(1).map((c) => `
          <div class="card">
            <h3>${esc(c)}</h3>
          </div>`).join('')}
      </div>
    </section>` : ''}

    ${showSuccessMetric ? `
    <section class="section">
      <h2>Measurable outcomes</h2>
      <div class="metric-strip">
        <div class="metric"><div class="figure">3×</div><div class="label">faster time-to-value</div></div>
        <div class="metric"><div class="figure">40%</div><div class="label">workflow reduction</div></div>
        <div class="metric"><div class="figure">10+ hrs</div><div class="label">saved per week</div></div>
      </div>
      <p style="text-align:center; font-size:12px; opacity:0.6;">Sample metrics — replace with verified figures before publishing.</p>
    </section>` : ''}

    ${showPricing ? `
    <section class="section">
      <h2>Pricing</h2>
      <div class="pricing-grid">
        <div class="pricing-card"><h3>Starter</h3><div class="amount">Free</div><p>For solo users getting started.</p></div>
        <div class="pricing-card"><h3>Team</h3><div class="amount">$29</div><p>Per user / month, billed annually.</p></div>
        <div class="pricing-card"><h3>Business</h3><div class="amount">Custom</div><p>Talk to us for enterprise needs.</p></div>
      </div>
      <p style="text-align:center; font-size:12px; opacity:0.6;">Sample tiering — replace with real pricing before publishing.</p>
    </section>` : ''}

    ${showCta ? `
    <section id="cta-primary" class="section" style="text-align:center;">
      <h2>Ready to try it?</h2>
      <a href="#" class="cta">Sign up free</a>
      <a href="#" class="cta secondary">Book a demo</a>
    </section>` : ''}
  </main>

  ${showLegal ? `
  <footer>
    <p>© FlowAI Renewal Preview — generated ${new Date().toISOString().slice(0, 10)}.</p>
    <p>
      <a href="#privacy">Privacy policy</a> ·
      <a href="#terms">Terms of use</a> ·
      <a href="#cookies">Cookie policy</a>
    </p>
    <p>This is a static demonstration page generated to illustrate the renewed structure.</p>
  </footer>` : ''}
</body>
</html>
`;

  return { html, patchesApplied: patches };
}

/**
 * Render + persist a renewed page.
 *
 * @param {{ artifact: object, issues: Array, requestOrigin?: string, renewalType?: string }} args
 * @returns {Promise<{
 *   renewedUrl: string,
 *   renewedHash: string,
 *   renewalType: string,
 *   patchesApplied: Array,
 *   deployedAt: string,
 *   storage: string,
 *   sameOrigin: boolean,
 * }>}
 */
export async function renew({ artifact, issues, requestOrigin, renewalType }) {
  if (!artifact || typeof artifact !== 'object') throw new TypeError('renew: artifact required');
  const type = renewalType || resolveRenewalType(artifact.inputType);
  const { html, patchesApplied } = renderRenewedHtml({ artifact, issues: issues || [], renewalType: type });
  const hash = createHash('sha256').update(html).digest('hex').slice(0, 16);
  const storeRes = await storeRenewed(hash, html);
  const baseOrigin = requestOrigin || '';
  const renewedUrl = `${baseOrigin}/api/renewed/${hash}`;
  // The renewed HTML is also returned INLINE so the UI can render it via
  // <iframe srcdoc> immediately, without waiting on KV.  On deployments
  // where Vercel KV is provisioned, /api/renewed/<hash> serves the same
  // body cross-function — useful for sharing the URL.  Without KV, the
  // URL works only for follow-up requests routed back to the same
  // serverless container (best-effort).
  return {
    renewedUrl,
    renewedHash: hash,
    renewedHtml: html,
    renewalType: type,
    patchesApplied,
    deployedAt: new Date().toISOString(),
    storage: storeRes.storage,
    sameOrigin: true,
  };
}

export function resolveRenewalType(inputType) {
  if (inputType === 'url') return 'fork-static-html';
  if (inputType === 'description') return 'generated-from-description';
  if (inputType === 'content') return 'renewed-content';
  return 'static-html';
}

export const __internals = Object.freeze({
  KV_KEY_PREFIX,
  memoryStore,
  patchesFromIssues,
});
