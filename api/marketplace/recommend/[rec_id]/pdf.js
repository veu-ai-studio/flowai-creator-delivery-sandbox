// GET /api/marketplace/recommend/:rec_id/pdf
//
// Buyer-grade brief for a single marketplace recommendation. Renders the
// recommendation record (top pick + alternatives, weights applied,
// rationale, score breakdown, evidence count) as a print-friendly HTML
// artifact. The browser's "Save as PDF" produces a polished branded
// document that providers can hand to clients to justify a tool choice.
//
// Same pattern as /api/audits/super-customer/results/[run_id]/pdf — v1
// returns inline HTML; v1.5 will swap to Browserless /pdf for a real
// application/pdf payload.

import { setCorsHeaders } from '../../../_lib/claude.js';
import { withRequestLog } from '../../../_lib/requestLog.js';
import { resolveOrgId } from '../../../_lib/tenant.js';
import {
  getRecommendation, getTool, summariseOutcomes, DIMENSIONS,
} from '../../../_lib/marketplace.js';

const DEFAULT_ORG = 'veu-ai-studio';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const HTML_SHELL = (title, body) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 24mm 18mm; size: A4; }
  * { box-sizing: border-box; }
  body { font: 11pt/1.55 -apple-system, "Segoe UI", system-ui, sans-serif; color: #111827; max-width: 820px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 24pt; margin: 0 0 4pt; color: #0e1521; }
  h2 { font-size: 14pt; margin: 24pt 0 8pt; padding-bottom: 4pt; border-bottom: 1px solid #d1d5db; color: #0e1521; page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 16pt 0 6pt; color: #1f2937; page-break-after: avoid; }
  .meta { font-size: 10pt; color: #6b7280; margin: 0 0 24pt; }
  .meta strong { color: #111827; }
  .pick-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8pt; padding: 20pt; margin: 16pt 0; page-break-inside: avoid; }
  .pick-card .pick-label { font-size: 9pt; color: #0369a1; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
  .pick-card .pick-name { font-size: 22pt; font-weight: 700; color: #0e1521; margin-top: 4pt; }
  .pick-card .pick-vendor { font-size: 11pt; color: #6b7280; margin-top: 2pt; }
  .pick-card .pick-score { float: right; font-size: 36pt; font-weight: 700; color: #0369a1; line-height: 1; }
  .pick-card .pick-score-label { font-size: 9pt; color: #6b7280; text-align: right; }
  .pick-rationale { margin-top: 14pt; font-size: 11pt; color: #1f2937; line-height: 1.65; clear: both; }
  .tradeoffs { margin-top: 10pt; font-size: 10pt; color: #6b7280; padding: 8pt 12pt; background: #fef3c7; border-radius: 4pt; border-left: 3pt solid #f59e0b; }
  .tradeoffs strong { color: #78350f; }
  table { width: 100%; border-collapse: collapse; margin: 12pt 0; font-size: 10pt; }
  th, td { padding: 7pt 10pt; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-weight: 600; color: #4b5563; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .score-bar { display: inline-block; height: 8pt; background: #e5e7eb; border-radius: 4pt; vertical-align: middle; width: 80pt; position: relative; overflow: hidden; }
  .score-bar > span { display: block; height: 100%; background: linear-gradient(90deg, #0369a1, #0ea5e9); }
  .alt-card { border: 1px solid #e5e7eb; border-radius: 6pt; padding: 12pt; margin: 8pt 0; page-break-inside: avoid; }
  .alt-card .alt-name { font-weight: 600; font-size: 12pt; color: #1f2937; }
  .alt-card .alt-meta { font-size: 9pt; color: #6b7280; margin-top: 2pt; }
  .alt-card .alt-rationale { font-size: 10pt; color: #374151; margin-top: 6pt; }
  .weight-pill { display: inline-block; padding: 2pt 8pt; background: #ede9fe; color: #5b21b6; border-radius: 12pt; font-size: 9pt; font-weight: 600; margin: 2pt 4pt 2pt 0; }
  .evidence-pill { display: inline-block; padding: 1pt 6pt; background: #ecfdf5; color: #065f46; border-radius: 3pt; font-size: 9pt; font-weight: 600; }
  .evidence-pill.empty { background: #f3f4f6; color: #6b7280; }
  .footer { margin-top: 48pt; padding-top: 16pt; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9pt; color: #6b7280; }
  .footer strong { color: #111827; }
  .page-break { page-break-after: always; }
  @media print { body { padding: 0; } }
</style>
</head><body>
${body}
<div class="footer">
  <strong>Tool Intelligence Marketplace</strong> · FlowAI · veu.ai
</div>
</body></html>`;

function renderScoreRow(label, score) {
  const v = Math.max(0, Math.min(100, Number(score) || 0));
  return `<tr>
    <td>${escapeHtml(label)}</td>
    <td class="num">${v}</td>
    <td><span class="score-bar"><span style="width:${v}%"></span></span></td>
  </tr>`;
}

function renderTopPick(rec) {
  const top = (rec.recommendations || [])[0];
  if (!top) return '<p>(no recommendation recorded)</p>';

  const tool = getTool(top.tool.slug);
  const scores = top.score_breakdown || {};
  const evidenceLabel = top.evidence_count >= 3
    ? `${top.evidence_count} prior runs`
    : top.evidence_count > 0
      ? `${top.evidence_count} prior run(s) — limited evidence`
      : 'No prior runs (baseline-only)';
  const evidenceClass = top.evidence_count >= 3 ? '' : ' empty';

  const scoreRows = DIMENSIONS.map((d) => renderScoreRow(d.replace(/_/g, ' '), scores[d])).join('\n');

  const pricing = tool ? `${tool.pricing_model || 'unknown'} · ${tool.has_free_tier ? 'free tier available' : 'paid only'}${tool.starting_paid_tier_usd != null ? ` · from $${tool.starting_paid_tier_usd}/mo` : ''}` : '';

  return `
    <div class="pick-card">
      <div style="float:right;text-align:right">
        <div class="pick-score">${top.score}</div>
        <div class="pick-score-label">overall / 100</div>
      </div>
      <div class="pick-label">Top Pick</div>
      <div class="pick-name">${escapeHtml(top.tool.name)}</div>
      <div class="pick-vendor">${escapeHtml(top.tool.vendor || '')} · <span class="evidence-pill${evidenceClass}">${escapeHtml(evidenceLabel)}</span></div>
      <div class="pick-rationale">${escapeHtml(top.rationale || rec.rationale_summary || '(no rationale captured)')}</div>
      ${top.tradeoffs ? `<div class="tradeoffs"><strong>Tradeoffs:</strong> ${escapeHtml(top.tradeoffs)}</div>` : ''}
    </div>
    <h3>Score breakdown</h3>
    <table>
      <thead><tr><th>Dimension</th><th class="num" style="width:80pt">Score</th><th style="width:120pt">Visual</th></tr></thead>
      <tbody>${scoreRows}</tbody>
    </table>
    ${tool ? `<h3>Tool facts</h3>
    <table>
      <tbody>
        <tr><th style="width:40%">Pricing</th><td>${escapeHtml(pricing)}</td></tr>
        <tr><th>Integration complexity</th><td>${escapeHtml(String(tool.integration_complexity || '—'))} / 5${tool.setup_time_estimate_minutes ? ` (~${tool.setup_time_estimate_minutes} min setup)` : ''}</td></tr>
        <tr><th>Compliance</th><td>${(tool.compliance_certs || []).map(escapeHtml).join(', ') || '—'}</td></tr>
        <tr><th>Data residency</th><td>${(tool.data_residency_options || []).map(escapeHtml).join(', ') || '—'}</td></tr>
        <tr><th>Self-hostable</th><td>${tool.self_hostable ? 'Yes' : 'No'}${tool.open_source ? ' (open source)' : ''}</td></tr>
        <tr><th>Data export</th><td>${escapeHtml(tool.data_export_ease || '—')}</td></tr>
        <tr><th>Vendor health</th><td>${escapeHtml(tool.last_funding_round || '—')} · incident frequency: ${escapeHtml(tool.public_incident_frequency || '—')}</td></tr>
      </tbody>
    </table>` : ''}`;
}

function renderAlternatives(rec) {
  const alts = (rec.recommendations || []).slice(1);
  if (!alts.length) return '<p>(no alternatives captured)</p>';
  return alts.map((a) => `
    <div class="alt-card">
      <div style="float:right;font-size:18pt;font-weight:700;color:#6b7280">${a.score}</div>
      <div class="alt-name">#${a.rank} · ${escapeHtml(a.tool.name)}</div>
      <div class="alt-meta">${escapeHtml(a.tool.vendor || '')}${a.evidence_count ? ` · ${a.evidence_count} prior runs` : ''}</div>
      ${a.rationale ? `<div class="alt-rationale">${escapeHtml(a.rationale)}</div>` : ''}
      ${a.tradeoffs ? `<div class="alt-rationale" style="color:#92400e"><strong>Tradeoffs:</strong> ${escapeHtml(a.tradeoffs)}</div>` : ''}
    </div>`).join('\n');
}

function renderWeights(rec) {
  const w = rec.weights_applied || {};
  return Object.entries(w)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<span class="weight-pill">${escapeHtml(k.replace(/_/g, ' '))}: ${(Number(v) * 100).toFixed(0)}%</span>`)
    .join(' ');
}

function renderContext(rec) {
  const ctx = rec.context || {};
  const items = [];
  if (ctx.region) items.push(`<tr><th>Region</th><td>${escapeHtml(ctx.region)}</td></tr>`);
  if (ctx.scale) items.push(`<tr><th>Scale</th><td>${escapeHtml(ctx.scale)}</td></tr>`);
  if (ctx.sensitivity || ctx.sensitivity_level) items.push(`<tr><th>Sensitivity</th><td>${escapeHtml(ctx.sensitivity || ctx.sensitivity_level)}</td></tr>`);
  if (ctx.expected_scale) items.push(`<tr><th>Expected scale</th><td>${escapeHtml(ctx.expected_scale)}</td></tr>`);
  if (ctx.end_customer_size) items.push(`<tr><th>End customer size</th><td>${escapeHtml(ctx.end_customer_size)}</td></tr>`);
  if (ctx.source) items.push(`<tr><th>Source</th><td>${escapeHtml(ctx.source)}</td></tr>`);
  if (!items.length) return '<p>(no context captured)</p>';
  return `<table><tbody>${items.join('\n')}</tbody></table>`;
}

function buildHtml(rec) {
  const top = (rec.recommendations || [])[0];
  const title = top ? `Recommendation — ${top.tool.name}` : `Recommendation ${rec.id}`;

  const headerHtml = `
    <h1>Tool Recommendation Brief</h1>
    <div class="meta">
      <div><strong>Recommendation ID:</strong> ${escapeHtml(rec.id)}</div>
      <div><strong>Step:</strong> ${escapeHtml(String(rec.step_number || '—'))} · <strong>Category:</strong> ${escapeHtml(rec.category || '—')}</div>
      <div><strong>Generated:</strong> ${escapeHtml(rec.created_at || '—')}</div>
      ${rec.lifecycle_run_id ? `<div><strong>Lifecycle run:</strong> ${escapeHtml(rec.lifecycle_run_id)}</div>` : ''}
    </div>`;

  const weightsHtml = `<p>${renderWeights(rec)}</p>
    <p style="font-size:10pt;color:#6b7280;margin-top:6pt">
      Weights are derived from the request context (region, sensitivity, scale, end-customer size)
      and any provider-specific overrides. Higher weight = stronger influence on the overall score.
    </p>`;

  const methodologyHtml = `
    <p><strong>Method:</strong> Each candidate tool is scored across 7 dimensions
      (cost, quality, latency, integration complexity, data residency, vendor health,
      lock-in risk) using a blend of static facts (vendor pricing, compliance certs,
      region availability) and observed outcomes from prior runs (success rate, p95
      latency, provider satisfaction). Scores are weighted using the request context,
      and Claude generates a contextual rationale + tradeoffs for the top picks.</p>
    <p><strong>Evidence threshold:</strong> When ≥3 prior runs exist for a tool, observed
      outcomes blend with the static baseline. Below that threshold, baseline-only
      scoring is used and flagged as "limited evidence".</p>`;

  return HTML_SHELL(title,
    headerHtml +
    renderTopPick(rec) +
    `<h2>Decision context</h2>` + renderContext(rec) +
    `<h2>Weights applied</h2>` + weightsHtml +
    `<div class="page-break"></div>` +
    `<h2>Alternatives considered</h2>` + renderAlternatives(rec) +
    `<h2>Methodology</h2>` + methodologyHtml);
}

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const recId = req.query?.rec_id || (req.url.match(/recommend\/([^/]+)\/pdf/)?.[1]);
  if (!recId) return res.status(400).json({ error: 'Missing rec_id' });

  const rec = getRecommendation(recId);
  if (!rec) return res.status(404).json({ error: 'Recommendation not found', rec_id: recId });

  const orgId = resolveOrgId(req) || DEFAULT_ORG;
  if (rec.org_id && rec.org_id !== orgId) {
    return res.status(404).json({ error: 'Recommendation not found', rec_id: recId });
  }

  // Hydrate fresh outcome summaries for the top pick + alternatives so the
  // brief reflects current evidence, not just what was captured at creation.
  for (const r of (rec.recommendations || [])) {
    const summary = summariseOutcomes(r.tool.slug);
    if (summary) r.evidence_count = summary.runs;
  }

  const html = buildHtml(rec);
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('content-disposition', `inline; filename="recommendation-${recId}.html"`);
  return res.status(200).send(html);
}

export default withRequestLog(handler, { endpoint: '/api/marketplace/recommend/pdf' });
