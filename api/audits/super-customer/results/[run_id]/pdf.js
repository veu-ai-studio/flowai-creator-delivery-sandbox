// GET /api/audits/super-customer/results/:run_id/pdf
//
// Returns an audit report. v1: rendered HTML (with print-friendly CSS — the
// browser's "Save as PDF" produces a polished branded artifact). v1.5: when
// a PDF library is wired (or Browserless's /pdf endpoint), this returns a
// real application/pdf payload.
//
// The HTML output is fully self-contained — inlined CSS, no external assets
// — so it renders identically whether viewed in a browser or printed/saved.
// This becomes the sellable VEUaaS audit artifact.

import { setCorsHeaders } from '../../../../_lib/claude.js';
import { getRun } from '../../../../_lib/configRegistry.js';
import { resolveOrgId } from '../../../../_lib/tenant.js';
import { withRequestLog } from '../../../../_lib/requestLog.js';

const DEFAULT_ORG = 'veu-ai-studio';

const HTML_SHELL = (title, body) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 24mm 18mm; size: A4; }
  * { box-sizing: border-box; }
  body { font: 11pt/1.55 -apple-system, "Segoe UI", system-ui, sans-serif; color: #111827; max-width: 800px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 24pt; margin: 0 0 4pt; color: #0e1521; }
  h2 { font-size: 14pt; margin: 24pt 0 8pt; padding-bottom: 4pt; border-bottom: 1px solid #d1d5db; color: #0e1521; page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 16pt 0 6pt; color: #1f2937; page-break-after: avoid; }
  .meta { font-size: 10pt; color: #6b7280; margin: 0 0 24pt; }
  .meta strong { color: #111827; }
  .score-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8pt; padding: 16pt; margin: 16pt 0; text-align: center; page-break-inside: avoid; }
  .score-card .score { font-size: 48pt; font-weight: 700; color: #0e1521; line-height: 1; }
  .score-card .score-label { font-size: 10pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4pt; }
  .score-card .score-justification { font-size: 10pt; color: #374151; margin-top: 12pt; max-width: 500px; margin-left: auto; margin-right: auto; }
  table { width: 100%; border-collapse: collapse; margin: 12pt 0; font-size: 10pt; }
  th, td { padding: 6pt 10pt; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-weight: 600; color: #4b5563; }
  .severity { display: inline-block; padding: 1pt 6pt; border-radius: 3pt; font-size: 8pt; font-weight: 700; letter-spacing: 0.04em; color: #fff; }
  .severity-P0 { background: #dc2626; }
  .severity-P1 { background: #ea580c; }
  .severity-P2 { background: #ca8a04; }
  .severity-P3 { background: #6b7280; }
  .issue { border-left: 3pt solid #e5e7eb; padding: 8pt 12pt; margin: 8pt 0; page-break-inside: avoid; background: #fafafa; }
  .issue.P0 { border-left-color: #dc2626; }
  .issue.P1 { border-left-color: #ea580c; }
  .issue.P2 { border-left-color: #ca8a04; }
  .issue-title { font-weight: 600; font-size: 11pt; }
  .issue-meta { font-size: 9pt; color: #6b7280; margin: 2pt 0 6pt; }
  .issue-fix { font-size: 10pt; color: #374151; margin-top: 4pt; }
  .surface-url { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 9pt; color: #6366f1; word-break: break-all; }
  .footer { margin-top: 48pt; padding-top: 16pt; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9pt; color: #6b7280; }
  .footer strong { color: #111827; }
  pre { white-space: pre-wrap; font: 9pt/1.5 "SF Mono", Menlo, Consolas, monospace; background: #f9fafb; padding: 8pt; border-radius: 4pt; border: 1px solid #e5e7eb; overflow-wrap: break-word; }
  ul { padding-left: 18pt; }
  li { margin: 3pt 0; }
  .page-break { page-break-after: always; }
  @media print { body { padding: 0; } }
</style>
</head><body>
${body}
<div class="footer">
  <strong>Audit by VEU AI Studio</strong> · FlowAI Super Customer Agent · veu.ai
</div>
</body></html>`;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderIssue(i) {
  return `<div class="issue ${escapeHtml(i.severity)}">
    <div><span class="severity severity-${escapeHtml(i.severity)}">${escapeHtml(i.severity)}</span> &nbsp; <span class="issue-title">${escapeHtml(i.title)}</span></div>
    <div class="issue-meta">${escapeHtml(i.category || 'general')} · effort: ${escapeHtml(i.estimated_effort || 'unknown')} · <span class="surface-url">${escapeHtml(i.surface_url || '')}</span></div>
    <div>${escapeHtml(i.description || '')}</div>
    <div class="issue-fix"><strong>Proposed fix:</strong> ${escapeHtml(i.proposed_solution || '(no solution recorded)')}</div>
  </div>`;
}

function renderSection(title, content) {
  return `<h2>${escapeHtml(title)}</h2>${content}`;
}

function buildHtml(audit) {
  const { target_url, started_at, completed_at, surfaces = [], issues = [], counts = {}, health_score, cost_usd, summary_text } = audit;
  const sevOrder = ['P0', 'P1', 'P2', 'P3'];
  const issuesBySev = {};
  for (const sev of sevOrder) issuesBySev[sev] = issues.filter((i) => i.severity === sev);

  const headerHtml = `
    <h1>Super Customer Audit</h1>
    <div class="meta">
      <div><strong>Target:</strong> <span class="surface-url">${escapeHtml(target_url)}</span></div>
      <div><strong>Run:</strong> ${escapeHtml(audit.id || audit.run_id || '')}</div>
      <div><strong>Started:</strong> ${escapeHtml(started_at)} · <strong>Completed:</strong> ${escapeHtml(completed_at || '(in progress)')}</div>
      <div><strong>Surfaces audited:</strong> ${surfaces.length} · <strong>Cost:</strong> $${(cost_usd || 0).toFixed(4)}</div>
    </div>
    <div class="score-card">
      <div class="score">${health_score == null ? '—' : escapeHtml(String(health_score))}</div>
      <div class="score-label">Overall Health Score / 100</div>
      <div class="score-justification">${escapeHtml((summary_text || '').split('\n').find((l) => l.trim().length > 60) || '(score justification not captured)')}</div>
    </div>`;

  const countsTable = `<table>
    <thead><tr><th>Severity</th><th>Count</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><span class="severity severity-P0">P0</span></td><td>${counts.P0 || 0}</td><td>Blocks core flow</td></tr>
      <tr><td><span class="severity severity-P1">P1</span></td><td>${counts.P1 || 0}</td><td>Blocks important secondary flow</td></tr>
      <tr><td><span class="severity severity-P2">P2</span></td><td>${counts.P2 || 0}</td><td>Degrades UX</td></tr>
      <tr><td><span class="severity severity-P3">P3</span></td><td>${counts.P3 || 0}</td><td>Cosmetic</td></tr>
      <tr><td><strong>Total</strong></td><td><strong>${counts.total || 0}</strong></td><td></td></tr>
    </tbody>
  </table>`;

  const summaryHtml = summary_text ? `<pre>${escapeHtml(summary_text)}</pre>` : '<p>(executive summary not generated)</p>';

  let issuesHtml = '';
  for (const sev of sevOrder) {
    const list = issuesBySev[sev];
    if (!list.length) continue;
    issuesHtml += `<h3>${sev} (${list.length})</h3>`;
    issuesHtml += list.map(renderIssue).join('\n');
  }

  const surfacesHtml = `<table>
    <thead><tr><th>#</th><th>URL</th><th>Status</th><th>Load (ms)</th><th>Issues</th><th>Score</th></tr></thead>
    <tbody>
      ${surfaces.map((s, i) => {
        const scnt = (issues.filter((iss) => iss.surface_id === s.id) || []).length;
        return `<tr>
          <td>${i + 1}</td>
          <td><span class="surface-url">${escapeHtml(s.url)}</span></td>
          <td>${escapeHtml(s.status ?? '—')}</td>
          <td>${escapeHtml(s.timing?.loadMs ?? '—')}</td>
          <td>${scnt}</td>
          <td>${escapeHtml(s.analysis?.health_score ?? '—')}</td>
        </tr>`;
      }).join('\n')}
    </tbody>
  </table>`;

  const methodologyHtml = `
    <p><strong>Method:</strong> Browserless full-render capture of each surface (HTML + DOM signals + console errors + network errors + perf timing) followed by Claude Sonnet 4.6 per-surface architecture + improvement plan analysis. Cross-surface aggregation via Claude Opus 4.7. All severity classifications follow the rubric below.</p>
    <h3>Severity rubric</h3>
    <ul>
      <li><strong>P0</strong> — Blocks core flow (page won't load, primary CTA broken, payment fails, auth missing on private content)</li>
      <li><strong>P1</strong> — Blocks important secondary flow (key feature unusable, conversion gap, missing trust signals)</li>
      <li><strong>P2</strong> — Degrades UX (slow load, accessibility violation, confusing copy, broken non-critical link)</li>
      <li><strong>P3</strong> — Cosmetic (typo, alignment, polish, missing alt-text on decorative image)</li>
    </ul>`;

  return HTML_SHELL(`Audit — ${target_url}`,
    headerHtml +
    renderSection('Issue counts', countsTable) +
    renderSection('Executive summary', summaryHtml) +
    `<div class="page-break"></div>` +
    renderSection('All findings', issuesHtml || '<p>No issues identified.</p>') +
    `<div class="page-break"></div>` +
    renderSection('Surface inventory', surfacesHtml) +
    renderSection('Methodology', methodologyHtml));
}

async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const runId = req.query?.run_id;
  if (!runId) return res.status(400).json({ error: 'Missing run_id' });

  const run = getRun(runId);
  if (!run) return res.status(404).json({ error: 'Not found', run_id: runId });

  const orgId = resolveOrgId(req) || DEFAULT_ORG;
  if (run.org_id && run.org_id !== orgId) return res.status(404).json({ error: 'Not found', run_id: runId });
  if (run.status !== 'completed' || !run.output) {
    return res.status(409).json({ error: `Run not completed`, status: run.status });
  }

  const html = buildHtml({ ...run.output, run_id: run.id });
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('content-disposition', `inline; filename="audit-${run.output?.product_id || 'unknown'}-${runId}.html"`);
  return res.status(200).send(html);
}

export default withRequestLog(handler, { endpoint: '/api/audits/super-customer/results/pdf' });
